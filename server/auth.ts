import { Express, Request, Response, NextFunction } from "express";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { Pool } from "pg";
import { storage } from "./storage";
import { loginSchema, registerSchema } from "@shared/schema";

const PgSession = connectPgSimple(session);

declare module "express-session" {
  interface SessionData {
    userId: string;
    username: string;
    displayName: string;
    role: string;
  }
}

export function setupAuth(app: Express) {
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
      secret: process.env.SESSION_SECRET || "development-secret-change-in-production",
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: process.env.COOKIE_SECURE === "true",
        httpOnly: true,
        maxAge: 7 * 24 * 60 * 60 * 1000,
        sameSite: "lax",
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
  if (role === "admin" || role === "user") {
    return next();
  }
  res.status(403).json({ message: "Keine Berechtigung - nur für interne Benutzer" });
}

export function registerAuthRoutes(app: Express) {
  app.post("/api/auth/register", async (req, res) => {
    try {
      const parsed = registerSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ 
          message: parsed.error.errors.map(e => e.message).join(", ") 
        });
      }

      const { username, password, displayName } = parsed.data;
      
      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        return res.status(400).json({ message: "Benutzername bereits vergeben" });
      }

      const allUsers = await storage.getAllUsers();
      const role = allUsers.length === 0 ? "admin" : "user";

      const user = await storage.createUser(username, password, displayName, role);

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
      const parsed = loginSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ 
          message: parsed.error.errors.map(e => e.message).join(", ") 
        });
      }

      const { username, password } = parsed.data;
      const user = await storage.validateUserPassword(username, password);

      if (!user) {
        return res.status(401).json({ message: "Ungültiger Benutzername oder Passwort" });
      }

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
