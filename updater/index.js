const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

// Public proxy app - handles external traffic
const app = express();
// Internal admin app - only accessible within Docker network
const adminApp = express();

const PROXY_PORT = parseInt(process.env.PROXY_PORT || '5000', 10);
const ADMIN_PORT = parseInt(process.env.ADMIN_PORT || '5001', 10);
const TARGET_URL = process.env.TARGET_URL || 'http://app:5000';
const PROJECT_PATH = '/project';
const UPDATE_SECRET = process.env.UPDATE_SECRET;

// Startup validation - fail fast if UPDATE_SECRET is not set
if (!UPDATE_SECRET) {
  console.warn('[WARN] UPDATE_SECRET not set - Self-update functionality will be disabled');
  console.warn('[WARN] Set UPDATE_SECRET in .env to enable the update feature');
}

// Configure trust proxy for accurate IP detection behind Docker networking
app.set('trust proxy', ['loopback', 'linklocal', 'uniquelocal']);
adminApp.set('trust proxy', ['loopback', 'linklocal', 'uniquelocal']);

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

async function performUpdate(targetVersion = null) {
  try {
    log('Starting update process...');
    
    // Check if production compose file exists (uses pre-built images from registry)
    const prodComposeFile = path.join(PROJECT_PATH, 'docker-compose.prod.yml');
    const useProdCompose = fs.existsSync(prodComposeFile);
    const composeCmd = useProdCompose 
      ? 'docker compose -f docker-compose.prod.yml' 
      : 'docker compose';
    
    log(`Using compose file: ${useProdCompose ? 'docker-compose.prod.yml' : 'docker-compose.yml'}`);
    
    // If a specific version is provided, pull that tag directly
    if (targetVersion) {
      // GitHub Actions creates tags WITHOUT 'v' prefix (e.g., 1.0.3 not v1.0.3)
      const versionTag = targetVersion.replace(/^v/, '');
      const imageBase = process.env.GITHUB_REPOSITORY 
        ? `ghcr.io/${process.env.GITHUB_REPOSITORY.toLowerCase()}`
        : 'ghcr.io/hi-its-lukas/bhb-invoice-portal';
      
      log(`Pulling specific version: ${versionTag}`);
      await execPromise(`docker pull ${imageBase}:${versionTag}`, { cwd: PROJECT_PATH });
      
      // Tag it as latest so docker-compose uses it
      log(`Tagging ${versionTag} as latest...`);
      await execPromise(`docker tag ${imageBase}:${versionTag} ${imageBase}:latest`, { cwd: PROJECT_PATH });
    } else {
      log('Pulling latest images...');
      await execPromise(`${composeCmd} pull app`, { cwd: PROJECT_PATH });
    }
    
    log('Recreating app container...');
    await execPromise(`${composeCmd} up -d --force-recreate app`, { cwd: PROJECT_PATH });
    
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

// === PUBLIC PROXY APP ROUTES ===
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

// Block direct access to internal endpoint on public port
// Note: /api/system/start-update is forwarded to the backend app which handles authentication
app.post('/api/internal/start-update', (req, res) => {
  log('SECURITY: Direct access to internal endpoint blocked on public port');
  return res.status(403).json({ message: 'Forbidden - use internal admin port' });
});

// === INTERNAL ADMIN APP ROUTES (separate port, not publicly exposed) ===
adminApp.use(express.json());

adminApp.get('/health', (req, res) => {
  res.send('OK');
});

adminApp.post('/api/internal/start-update', (req, res) => {
  // First check: UPDATE_SECRET must be configured
  if (!UPDATE_SECRET) {
    log('ERROR: UPDATE_SECRET environment variable is required but not set');
    return res.status(503).json({ message: 'Self-update not available - UPDATE_SECRET not configured' });
  }
  
  // Second check: Validate the dedicated secret token
  const providedSecret = req.headers['x-update-secret'];
  
  if (!providedSecret || providedSecret !== UPDATE_SECRET) {
    log('SECURITY: Invalid or missing update secret');
    return res.status(403).json({ message: 'Unauthorized' });
  }
  
  if (isMaintenance) {
    return res.status(409).json({ message: 'Update already in progress' });
  }
  
  // Get target version from request body
  const targetVersion = req.body?.targetVersion || null;
  
  log(`Update requested via authenticated internal admin API${targetVersion ? ` to version ${targetVersion}` : ''}`);
  isMaintenance = true;
  updateLog = [];
  
  res.json({ message: 'Update started', targetVersion });
  
  setImmediate(() => {
    performUpdate(targetVersion);
  });
});

app.use((req, res, next) => {
  if (isMaintenance) {
    // Allow health check through during maintenance so maintenance page can detect when app is back
    if (req.path === '/api/health') {
      return next();
    }
    
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

// Start public proxy on 0.0.0.0 (accessible externally)
app.listen(PROXY_PORT, '0.0.0.0', () => {
  log(`Updater proxy listening on port ${PROXY_PORT}`);
  log(`Proxying requests to ${TARGET_URL}`);
});

// Start internal admin server on 0.0.0.0 but only exposed within Docker network
// This port is NOT mapped in docker-compose.yml, so it's only accessible internally
adminApp.listen(ADMIN_PORT, '0.0.0.0', () => {
  log(`Internal admin API listening on port ${ADMIN_PORT} (Docker internal only)`);
});
