const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

const app = express();
const PROXY_PORT = parseInt(process.env.PROXY_PORT || '5000', 10);
const TARGET_URL = process.env.TARGET_URL || 'http://app:5000';
const PROJECT_PATH = '/project';

let isMaintenance = false;
let updateLog = [];

function log(message) {
  const timestamp = new Date().toISOString();
  const logLine = `[${timestamp}] ${message}`;
  console.log(logLine);
  updateLog.push(logLine);
  if (updateLog.length > 100) {
    updateLog.shift();
  }
}

function execPromise(command, options = {}) {
  return new Promise((resolve, reject) => {
    log(`Executing: ${command}`);
    exec(command, { ...options, maxBuffer: 1024 * 1024 * 10 }, (error, stdout, stderr) => {
      if (stdout) log(`stdout: ${stdout}`);
      if (stderr) log(`stderr: ${stderr}`);
      if (error) {
        log(`Error: ${error.message}`);
        reject(error);
      } else {
        resolve({ stdout, stderr });
      }
    });
  });
}

async function waitForAppHealth(maxAttempts = 60, intervalMs = 2000) {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const response = await fetch(`${TARGET_URL}/api/health`);
      if (response.ok) {
        log('App is healthy!');
        return true;
      }
    } catch (e) {
      log(`Health check attempt ${i + 1}/${maxAttempts} failed: ${e.message}`);
    }
    await new Promise(r => setTimeout(r, intervalMs));
  }
  log('App health check timed out');
  return false;
}

async function performUpdate() {
  try {
    log('Starting update process...');
    
    log('Pulling latest app image...');
    await execPromise('docker compose pull app', { cwd: PROJECT_PATH });
    
    log('Recreating app container...');
    await execPromise('docker compose up -d --force-recreate app', { cwd: PROJECT_PATH });
    
    log('Waiting for app to become healthy...');
    const healthy = await waitForAppHealth();
    
    if (healthy) {
      log('Update completed successfully!');
    } else {
      log('Update completed but app health check failed');
    }
    
    isMaintenance = false;
    log('Maintenance mode disabled');
  } catch (error) {
    log(`Update failed: ${error.message}`);
    isMaintenance = false;
  }
}

app.use(express.json());

app.get('/api/updater/health', (req, res) => {
  res.send('OK');
});

app.get('/api/updater/status', (req, res) => {
  res.json({
    isMaintenance,
    updateLog: updateLog.slice(-20)
  });
});

app.post('/api/system/start-update', (req, res) => {
  if (isMaintenance) {
    return res.status(409).json({ message: 'Update already in progress' });
  }
  
  log('Update requested via API');
  isMaintenance = true;
  updateLog = [];
  
  res.json({ message: 'Update started' });
  
  setImmediate(() => {
    performUpdate();
  });
});

app.use((req, res, next) => {
  if (isMaintenance) {
    const acceptHeader = req.headers.accept || '';
    
    if (acceptHeader.includes('text/html')) {
      const maintenancePath = path.join(__dirname, 'maintenance.html');
      return res.status(503).sendFile(maintenancePath);
    }
    
    if (req.path.startsWith('/api/')) {
      return res.status(503).json({ 
        message: 'System is being updated. Please wait.',
        maintenance: true
      });
    }
  }
  next();
});

const proxy = createProxyMiddleware({
  target: TARGET_URL,
  changeOrigin: true,
  ws: true,
  onError: (err, req, res) => {
    log(`Proxy error: ${err.message}`);
    if (res.writeHead) {
      res.writeHead(502, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ message: 'Backend unavailable' }));
    }
  }
});

app.use('/', proxy);

app.listen(PROXY_PORT, '0.0.0.0', () => {
  log(`Updater proxy listening on port ${PROXY_PORT}`);
  log(`Proxying requests to ${TARGET_URL}`);
});
