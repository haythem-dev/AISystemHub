import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User as SelectUser } from "@shared/schema";
import { sendAccessLog } from "./email-logger";

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

function getClientInfo(req: any) {
  const ip = req.ip || req.connection.remoteAddress || req.socket.remoteAddress;
  const userAgent = req.get('User-Agent') || 'Unknown';
  const forwardedFor = req.get('X-Forwarded-For');
  
  return {
    ip: forwardedFor || ip,
    userAgent,
    timestamp: new Date().toISOString(),
    method: req.method,
    url: req.originalUrl
  };
}

export function setupAuth(app: Express) {
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || 'super-ai-secret-key-2025',
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
    cookie: {
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      secure: false, // Set to true in production with HTTPS
      httpOnly: true
    }
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        // Hardcoded credentials check
        if (username === 'user' && password === 'password') {
          // Create or get the default user
          let user = await storage.getUserByUsername('user');
          if (!user) {
            user = await storage.createUser({
              username: 'user',
              password: await hashPassword('password')
            });
          }
          return done(null, user);
        }
        return done(null, false);
      } catch (error) {
        return done(error);
      }
    }),
  );

  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (error) {
      done(error);
    }
  });

  app.post("/api/register", async (req, res, next) => {
    try {
      const clientInfo = getClientInfo(req);
      
      // Only allow the hardcoded user
      if (req.body.username !== 'user' || req.body.password !== 'password') {
        await sendAccessLog(
          'registration_attempt',
          req.body.username || 'unknown',
          clientInfo,
          false,
          'Invalid credentials attempted'
        );
        return res.status(400).send("Invalid credentials");
      }

      let user = await storage.getUserByUsername('user');
      if (!user) {
        user = await storage.createUser({
          username: 'user',
          password: await hashPassword('password'),
        });
      }

      req.login(user, async (err) => {
        if (err) return next(err);
        
        await sendAccessLog(
          'registration_success',
          user.username,
          clientInfo,
          true,
          'User registered successfully'
        );
        
        res.status(201).json(user);
      });
    } catch (error: any) {
      const clientInfo = getClientInfo(req);
      await sendAccessLog(
        'registration_error',
        req.body.username || 'unknown',
        clientInfo,
        false,
        error.message
      );
      res.status(500).send("Registration error");
    }
  });

  app.post("/api/login", async (req, res, next) => {
    const clientInfo = getClientInfo(req);
    
    passport.authenticate("local", async (err: any, user: any, info: any) => {
      if (err) {
        await sendAccessLog(
          'login_error',
          req.body.username || 'unknown',
          clientInfo,
          false,
          err.message
        );
        return next(err);
      }
      
      if (!user) {
        await sendAccessLog(
          'login_failed',
          req.body.username || 'unknown',
          clientInfo,
          false,
          'Invalid credentials'
        );
        return res.status(400).send("Invalid credentials");
      }
      
      req.login(user, async (err) => {
        if (err) {
          await sendAccessLog(
            'login_error',
            user.username,
            clientInfo,
            false,
            err.message
          );
          return next(err);
        }
        
        await sendAccessLog(
          'login_success',
          user.username,
          clientInfo,
          true,
          'User logged in successfully'
        );
        
        res.status(200).json(user);
      });
    })(req, res, next);
  });

  app.post("/api/logout", async (req, res, next) => {
    const clientInfo = getClientInfo(req);
    const username = req.user?.username || 'unknown';
    
    req.logout(async (err) => {
      if (err) {
        await sendAccessLog(
          'logout_error',
          username,
          clientInfo,
          false,
          err.message
        );
        return next(err);
      }
      
      await sendAccessLog(
        'logout_success',
        username,
        clientInfo,
        true,
        'User logged out successfully'
      );
      
      res.sendStatus(200);
    });
  });

  app.get("/api/user", async (req, res) => {
    if (!req.isAuthenticated()) {
      const clientInfo = getClientInfo(req);
      await sendAccessLog(
        'unauthorized_access',
        'anonymous',
        clientInfo,
        false,
        'Attempted to access protected resource without authentication'
      );
      return res.sendStatus(401);
    }
    
    res.json(req.user);
  });

  // Middleware to protect all other API routes
  app.use('/api', async (req, res, next) => {
    if (req.path.includes('/login') || req.path.includes('/register')) {
      return next();
    }
    
    if (!req.isAuthenticated()) {
      const clientInfo = getClientInfo(req);
      await sendAccessLog(
        'unauthorized_api_access',
        'anonymous',
        clientInfo,
        false,
        `Attempted to access ${req.path} without authentication`
      );
      return res.sendStatus(401);
    }
    
    next();
  });
}