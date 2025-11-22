import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import type { User } from "@shared/schema";
import { sanitizeUser } from "@shared/schema";
import connectPg from "connect-pg-simple";
import { pool } from "./db";
import { GoogleGenerativeAI } from "@google/generative-ai";

declare global {
  namespace Express {
    interface User {
      id: string;
      username: string;
      email: string | null;
      firstName: string | null;
      lastName: string | null;
    }
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

export function setupSimpleAuth(app: Express) {
  const PostgresSessionStore = connectPg(session);
  const sessionStore = new PostgresSessionStore({
    pool,
    createTableIfMissing: true,
    tableName: "sessions",
  });

  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || "aras-ai-production-secret-2024",
    resave: false,
    saveUninitialized: false,
    store: sessionStore,
    cookie: {
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      httpOnly: true,
      secure: false, // Set to true in production with HTTPS
    },
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const user = await storage.getUserByUsername(username);
        if (!user || !(await comparePasswords(password, user.password))) {
          return done(null, false);
        } else {
          return done(null, user);
        }
      } catch (error) {
        return done(error);
      }
    }),
  );

  passport.serializeUser((user: Express.User, done) => done(null, user.id));
  passport.deserializeUser(async (id: string, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (error) {
      done(error);
    }
  });

  app.post("/api/register", async (req, res, next) => {
    try {
      const { 
        username, password, email, firstName, lastName,
        company, website, industry, role, phone, language, primaryGoal 
      } = req.body;
      
      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }

      // 🔥 AI PROFILE GENERATION
      let aiProfile = null;
      
      if (company && industry) {
        try {
          console.log(`[🔍 RESEARCH] Starting live research for ${company}...`);
          
          // Initialize Gemini
          const gemini = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY || "");
          const model = gemini.getGenerativeModel({
            model: "gemini-2.0-flash-exp",
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 2000,
            }
          });
          
          // Research Company
          const companyPrompt = `Du bist ein Business Intelligence Analyst. Recherchiere mit Google Search über:
          
          Firma: ${company}
          Website: ${website || "nicht angegeben"}
          Branche: ${industry}
          
          Finde heraus:
          1. Was macht die Firma? Produkte/Services?
          2. Zielgruppe und Marktposition
          3. Kommunikationsstil und Brand Voice
          4. Beste Call-Zeiten für ${industry} Branche
          5. Effektive Keywords für diese Branche
          
          Antworte als JSON:
          {
            "companyDescription": "...",
            "products": ["..."],
            "services": ["..."],
            "targetAudience": "...",
            "brandVoice": "...",
            "bestCallTimes": "...",
            "effectiveKeywords": ["..."]
          }`;
          
          const result = await model.generateContent(companyPrompt);
          const text = result.response.text();
          
          // Parse AI Response
          let companyIntel: any = null;
          try {
            const jsonMatch = text.match(/```json\n?([\s\S]*?)```|\{[\s\S]*\}/)?.[0];
            const cleanJson = (jsonMatch || text)
              .replace(/```json\n?/g, '')
              .replace(/```\n?/g, '')
              .trim();
            companyIntel = JSON.parse(cleanJson);
          } catch (parseError) {
            console.log('[RESEARCH] Using fallback intelligence');
            companyIntel = {
              companyDescription: `${company} ist ein Unternehmen in der ${industry} Branche`,
              products: [],
              services: [],
              targetAudience: "B2B und B2C Kunden",
              brandVoice: "Professionell und kundenorientiert",
              bestCallTimes: "Dienstag-Donnerstag, 14-16 Uhr",
              effectiveKeywords: []
            };
          }
          
          // Generate Personalized System Prompt
          const customSystemPrompt = `Du bist ARAS AI® – die persönliche KI-Assistenz von ${firstName} ${lastName}.

🧠 ÜBER DEN USER:
Name: ${firstName} ${lastName}
Firma: ${company}
Branche: ${industry}
Position: ${role}

🏢 ÜBER DIE FIRMA:
${companyIntel.companyDescription}

Zielgruppe: ${companyIntel.targetAudience}
Brand Voice: ${companyIntel.brandVoice}

🎯 PRIMÄRES ZIEL: ${primaryGoal}

💬 SPRACHE: ${language === 'de' ? 'Deutsch (du-Form)' : language === 'en' ? 'English' : 'Français'}

Du bist die persönliche KI von ${firstName} bei ${company}. Beziehe dich immer auf den Business Context.

Bleibe immer ARAS AI - entwickelt von der Schwarzott Group.`;
          
          // Build AI Profile
          aiProfile = {
            companyDescription: companyIntel.companyDescription,
            products: companyIntel.products || [],
            services: companyIntel.services || [],
            targetAudience: companyIntel.targetAudience,
            brandVoice: companyIntel.brandVoice,
            customSystemPrompt,
            effectiveKeywords: companyIntel.effectiveKeywords || [],
            bestCallTimes: companyIntel.bestCallTimes,
            goals: [primaryGoal],
            lastUpdated: new Date().toISOString()
          };
          
          console.log(`[✅ RESEARCH] Profile enriched for ${company}`);
        } catch (error) {
          console.error("[RESEARCH] Error:", error);
          // Continue without enrichment
        }
      }

      const user = await storage.createUser({
        id: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        username,
        password: await hashPassword(password),
        email,
        firstName,
        lastName,
        // 🔥 BUSINESS INTELLIGENCE
        company,
        website,
        industry,
        role,
        phone,
        language: language || "de",
        primaryGoal,
        aiProfile,
        profileEnriched: aiProfile !== null,
        lastEnrichmentDate: aiProfile ? new Date() : null,
        // Subscription
        subscriptionStatus: "trialing",
        trialStartDate: new Date(),
        trialMessagesUsed: 0,
        aiMessagesUsed: 0,
        voiceCallsUsed: 0,
        hasPaymentMethod: false,
      });

      req.login(user, (err) => {
        if (err) return next(err);
        res.status(201).json(sanitizeUser(user));
      });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({ message: "Registration failed" });
    }
  });

  app.post("/api/login", (req, res, next) => {
    passport.authenticate("local", (err: any, user: Express.User | false, info: any) => {
      if (err) {
        return res.status(500).json({ message: "Authentication error" });
      }
      if (!user) {
        return res.status(401).json({ message: "Invalid username or password" });
      }
      req.login(user, (err) => {
        if (err) {
          return res.status(500).json({ message: "Login session error" });
        }
        res.status(200).json(sanitizeUser(user as User));
      });
    })(req, res, next);
  });

  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });

  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    res.json(sanitizeUser(req.user as User));
  });
}

export const isSimpleAuth = (req: any, res: any, next: any) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  next();
};