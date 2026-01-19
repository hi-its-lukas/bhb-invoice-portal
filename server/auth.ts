import { Express, Request, Response, NextFunction } from "express";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { Pool } from "pg";
import { storage } from "./storage";
import { loginSchema, registerSchema } from "@shared/schema";

const PgSession = connectPgSimple(session);

// SECURITY: Simple in-memory rate limiter for login attempts
interface RateLimitEntry {
  attempts: number;
  firstAttempt: number;
  blockedUntil: number;
}

const loginRateLimits = new Map<string, RateLimitEntry>();
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const MAX_ATTEMPTS = 5;
const BLOCK_DURATION_MS = 15 * 60 * 1000; // 15 minutes block

function getClientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  return req.ip || req.socket.remoteAddress || 'unknown';
}

function checkRateLimit(ip: string): { allowed: boolean; retryAfter?: number } {
  const now = Date.now();
  const entry = loginRateLimits.get(ip);
  
  if (!entry) {
    return { allowed: true };
  }
  
  // Check if blocked
  if (entry.blockedUntil > now) {
    return { allowed: false, retryAfter: Math.ceil((entry.blockedUntil - now) / 1000) };
  }
  
  // Reset if window expired
  if (now - entry.firstAttempt > RATE_LIMIT_WINDOW_MS) {
    loginRateLimits.delete(ip);
    return { allowed: true };
  }
  
  if (entry.attempts >= MAX_ATTEMPTS) {
    entry.blockedUntil = now + BLOCK_DURATION_MS;
    return { allowed: false, retryAfter: Math.ceil(BLOCK_DURATION_MS / 1000) };
  }
  
  return { allowed: true };
}

function recordLoginAttempt(ip: string, success: boolean): void {
  const now = Date.now();
  
  if (success) {
    // Clear rate limit on successful login
    loginRateLimits.delete(ip);
    return;
  }
  
  const entry = loginRateLimits.get(ip);
  if (!entry || now - entry.firstAttempt > RATE_LIMIT_WINDOW_MS) {
    loginRateLimits.set(ip, { attempts: 1, firstAttempt: now, blockedUntil: 0 });
  } else {
    entry.attempts++;
  }
}

// Cleanup old entries every 30 minutes
setInterval(() => {
  const now = Date.now();
  const entries = Array.from(loginRateLimits.entries());
  for (const [ip, entry] of entries) {
    if (now - entry.firstAttempt > RATE_LIMIT_WINDOW_MS && entry.blockedUntil < now) {
      loginRateLimits.delete(ip);
    }
  }
}, 30 * 60 * 1000);

declare module "express-session" {
  interface SessionData {
    userId: string;
    username: string;
    displayName: string;
    role: string;
  }
}

export function setupAuth(app: Express) {
  // SECURITY: Fail fast if SESSION_SECRET is not set in production
  const isProduction = process.env.NODE_ENV === "production";
  const sessionSecret = process.env.SESSION_SECRET;
  
  if (isProduction && !sessionSecret) {
    throw new Error("FATAL: SESSION_SECRET environment variable must be set in production");
  }
  
  if (!sessionSecret) {
    console.warn("[SECURITY WARNING] SESSION_SECRET not set - using development fallback. NEVER use this in production!");
  }

  // Trust proxy for HTTPS behind Cloudflare/reverse proxy
  if (process.env.TRUST_PROXY === "true" || isProduction) {
    app.set("trust proxy", 1);
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  app.use(
    session({
      store: new PgSession({
        pool,
        tableName: "sessions",
        createTableIfMissing: false,
      }),
      secret: sessionSecret || "development-secret-do-not-use-in-production",
      resave: false,
      saveUninitialized: false,
      cookie: {
        // Force secure cookies in production
        secure: isProduction || process.env.COOKIE_SECURE === "true",
        httpOnly: true,
        maxAge: 7 * 24 * 60 * 60 * 1000,
        // SECURITY: Use strict sameSite to prevent CSRF attacks
        sameSite: "strict",
      },
    })
  );
}

export function isAuthenticated(req: Request, res: Response, next: NextFunction) {
  if (req.session?.userId) {
    return next();
  }
  res.status(401).json({ message: "Nicht authentifiziert" });
}

export function isAdmin(req: Request, res: Response, next: NextFunction) {
  if (req.session?.role === "admin") {
    return next();
  }
  res.status(403).json({ message: "Keine Berechtigung" });
}

export function isInternal(req: Request, res: Response, next: NextFunction) {
  const role = req.session?.role;
  if (role === "admin" || role === "user" || role === "viewer") {
    return next();
  }
  res.status(403).json({ message: "Keine Berechtigung - nur für interne Benutzer" });
}

export function canEditDebtors(req: Request, res: Response, next: NextFunction) {
  const role = req.session?.role;
  if (role === "admin" || role === "user") {
    return next();
  }
  res.status(403).json({ message: "Keine Berechtigung zum Bearbeiten von Debitoren" });
}

export function registerAuthRoutes(app: Express) {
  // Check if registration is available (no admin exists yet)
  // Note: This is informational only - actual registration uses atomic method
  app.get("/api/auth/registration-available", async (req, res) => {
    try {
      // Use countAdmins() for consistent check
      const adminCount = await storage.countAdmins();
      res.json({ available: adminCount === 0 });
    } catch (error: any) {
      console.error("Registration check error:", error);
      res.status(500).json({ available: false });
    }
  });

  app.post("/api/auth/register", async (req, res) => {
    try {
      const parsed = registerSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ 
          message: parsed.error.errors.map(e => e.message).join(", ") 
        });
      }

      const { username, password, displayName } = parsed.data;
      
      // Check if username already exists
      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        return res.status(400).json({ message: "Benutzername bereits vergeben" });
      }

      // SECURITY: Use atomic method to prevent race condition
      // This checks for existing admins and creates one atomically using DB locking
      const user = await storage.createFirstAdminAtomic(username, password, displayName);
      
      if (!user) {
        // Admin already exists - registration is closed
        return res.status(403).json({ 
          message: "Registrierung nicht mehr verfügbar. Bitte kontaktieren Sie einen Administrator." 
        });
      }

      req.session.userId = user.id;
      req.session.username = user.username;
      req.session.displayName = user.displayName || user.username;
      req.session.role = user.role;

      res.status(201).json({
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        role: user.role,
      });
    } catch (error: any) {
      console.error("Registration error:", error);
      res.status(500).json({ message: "Registrierung fehlgeschlagen" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const clientIp = getClientIp(req);
      
      // SECURITY: Check rate limit before processing login
      const rateCheck = checkRateLimit(clientIp);
      if (!rateCheck.allowed) {
        console.warn(`[SECURITY] Rate limit exceeded for IP: ${clientIp}`);
        res.setHeader('Retry-After', String(rateCheck.retryAfter || 900));
        return res.status(429).json({ 
          message: `Zu viele Anmeldeversuche. Bitte warten Sie ${Math.ceil((rateCheck.retryAfter || 900) / 60)} Minuten.` 
        });
      }

      const parsed = loginSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ 
          message: parsed.error.errors.map(e => e.message).join(", ") 
        });
      }

      const { username, password } = parsed.data;
      const user = await storage.validateUserPassword(username, password);

      if (!user) {
        // Record failed attempt
        recordLoginAttempt(clientIp, false);
        return res.status(401).json({ message: "Ungültiger Benutzername oder Passwort" });
      }

      // Clear rate limit on successful login
      recordLoginAttempt(clientIp, true);

      req.session.userId = user.id;
      req.session.username = user.username;
      req.session.displayName = user.displayName || user.username;
      req.session.role = user.role;

      res.json({
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        role: user.role,
      });
    } catch (error: any) {
      console.error("Login error:", error);
      res.status(500).json({ message: "Anmeldung fehlgeschlagen" });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        console.error("Logout error:", err);
        return res.status(500).json({ message: "Abmeldung fehlgeschlagen" });
      }
      res.clearCookie("connect.sid");
      res.json({ message: "Erfolgreich abgemeldet" });
    });
  });

  app.get("/api/auth/me", (req, res) => {
    if (!req.session?.userId) {
      return res.json(null);
    }

    res.json({
      id: req.session.userId,
      username: req.session.username,
      displayName: req.session.displayName,
      role: req.session.role,
    });
  });

  app.get("/api/auth/users", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users.map(u => ({
        id: u.id,
        username: u.username,
        displayName: u.displayName,
        role: u.role,
        createdAt: u.createdAt,
      })));
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Fehler beim Laden der Benutzer" });
    }
  });
}
