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
      
      // 🔥 DEBUG: Log ALL received fields
      console.log('[REGISTER-DEBUG] Received registration data:', {
        username, email, firstName, lastName,
        company, website, industry, role, phone, language, primaryGoal
      });
      
      // Check email FIRST (more common duplicate)
      if (email) {
        const existingEmail = await storage.getUserByEmail(email);
        if (existingEmail) {
          console.log('[REGISTER-DEBUG] Email already exists:', email);
          return res.status(400).json({ message: "Diese E-Mail-Adresse ist bereits registriert" });
        }
      }
      
      // Then check username
      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        console.log('[REGISTER-DEBUG] Username already exists:', username);
        return res.status(400).json({ message: "Dieser Benutzername ist bereits vergeben" });
      }

      // 🔥 AI PROFILE GENERATION
      let aiProfile = null;
      
      if (company && industry) {
        try {
          console.log(`[🔍 RESEARCH] Starting live research for ${company}...`);
          
          const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY || "");
          const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });
          
          // 🔥 PROMPT 1: Company Deep Dive
          const companyDeepDive = `
[🤖 ULTRA-DEEP RESEARCH MODE ACTIVATED]

Unternehmen: ${company}
Website: ${website || 'Nicht angegeben'}
Branche: ${industry}

Du bist ein Elite-Business-Intelligence-Agent. Recherchiere ALLES über dieses Unternehmen:

🏢 UNTERNEHMENS-DNA:
- Gründungsjahr und Geschichte
- CEO/Gründer (Name, Background, Social Media)
- Unternehmensstruktur und Mitarbeiterzahl
- Standorte und Niederlassungen
- Umsatz und Finanzinformationen
- Investoren und Funding-Runden

💼 BUSINESS INTELLIGENCE:
- Exakte Produkte und Services (mit Preisen wenn verfügbar)
- Unique Selling Propositions (USPs)
- Marktposition und Marktanteil
- Hauptwettbewerber und Differenzierung
- Aktuelle Projekte und Initiativen
- Technologie-Stack und Tools

🎯 TARGET & STRATEGY:
- Detaillierte Zielgruppenprofile
- Customer Personas mit Demographics
- Vertriebskanäle und Verkaufsprozess
- Marketing-Strategie und Kampagnen
- Content-Strategie und Social Media Präsenz
- Brand Voice und Tonality

📡 ONLINE PRESENCE:
- Website-Traffic und SEO-Rankings
- Social Media Follower und Engagement
- Online-Reputation und Reviews
- Presse-Erwähnungen und News
- Awards und Zertifizierungen

💡 INSIDER INTELLIGENCE:
- Unternehmenskultur und Werte
- Mitarbeiter-Reviews (Glassdoor, Kununu)
- Aktuelle Herausforderungen und Pain Points
- Expansion Plans und Zukunftsstrategien
- Skandale oder Kontroversen (falls vorhanden)

📈 MARKET INTELLIGENCE:
- Branchentrends und Marktentwicklung
- Regulatorisches Umfeld
- Saisonale Muster und Zyklen
- Key Performance Indicators der Branche

Gib mir eine ULTRA-DETAILLIERTE Analyse als JSON:
{
  "companyDescription": "Ultra-detaillierte Beschreibung mit allen gefundenen Informationen",
  "foundedYear": "Jahr oder 'Unbekannt'",
  "ceoName": "Name des CEOs/Gründers",
  "employeeCount": "Anzahl oder Schätzung",
  "revenue": "Umsatz oder Schätzung",
  "fundingInfo": "Funding-Details",
  "products": ["Detaillierte Produktliste"],
  "services": ["Detaillierte Serviceliste"],
  "targetAudience": "Sehr detaillierte Zielgruppenbeschreibung",
  "competitors": ["Hauptwettbewerber"],
  "uniqueSellingPoints": ["USPs"],
  "brandVoice": "Detaillierte Brand Voice Analyse",
  "onlinePresence": "Website, Social Media Details",
  "currentChallenges": ["Aktuelle Herausforderungen"],
  "opportunities": ["Chancen und Potenziale"],
  "bestCallTimes": "Optimale Kontaktzeiten mit Begründung",
  "effectiveKeywords": ["Top 20+ relevante Keywords"],
  "insiderInfo": "Insider-Informationen und Gerüchte",
  "recentNews": ["Aktuelle News und Entwicklungen"],
  "decisionMakers": ["Key Decision Makers mit Positionen"],
  "psychologicalProfile": "Psychologisches Unternehmensprofil",
  "salesTriggers": ["Verkaufsauslöser und Buying Signals"],
  "communicationPreferences": "Bevorzugte Kommunikationskanäle",
  "budgetCycles": "Budget-Zyklen und Kaufentscheidungszeiträume"
}

Sei EXTREM gründlich. Wenn das Unternehmen existiert, finde ECHTE Daten.
Wenn es neu/unbekannt ist, erstelle ULTRA-REALISTISCHE Projektionen basierend auf der Branche.
Denke wie ein Top-Tier Business Intelligence Analyst bei McKinsey.
`;

          const result = await model.generateContent(companyDeepDive);
          const response = result.response.text();
          
          // Extract JSON from response
          let companyIntel: any;
          try {
            const jsonMatch = response.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              companyIntel = JSON.parse(jsonMatch[0]);
              console.log('[RESEARCH] ✅ Successfully parsed company intelligence');
            } else {
              throw new Error('No JSON found in response');
            }
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

      // ✅ CREATE WELCOME SESSION & PERSONALIZED MESSAGE
      try {
        console.log(`[WELCOME] Creating personalized welcome message for ${firstName}...`);
        
        // Create first chat session
        const welcomeSession = await storage.createChatSession({
          userId: user.id,
          title: "Willkommen bei ARAS AI",
          isActive: true
        });
        
        // Build personalized welcome message
        const welcomeText = aiProfile 
          ? `Hallo ${firstName}! 👋\n\nIch bin ARAS AI – deine persönliche KI-Assistenz für ${company}.\n\n🏢 **Was ich über dein Unternehmen weiß:**\n${aiProfile.companyDescription}\n\n🎯 **Dein Hauptziel:** ${primaryGoal === 'lead_generation' ? 'Lead-Generierung' : primaryGoal === 'customer_support' ? 'Kundensupport' : primaryGoal === 'appointment_booking' ? 'Terminbuchung' : 'Sales & Vertrieb'}\n\n💬 Ich spreche ${language === 'de' ? 'Deutsch' : language === 'en' ? 'Englisch' : 'deine Sprache'} und kenne deine Branche (${industry}).\n\n**Womit kann ich dir heute helfen?**`
          : `Hallo ${firstName}! 👋\n\nIch bin ARAS AI – deine persönliche KI-Assistenz.\n\nIch lerne gerade mehr über ${company}, um dich bestmöglich zu unterstützen.\n\n**Womit kann ich dir heute helfen?**`;
        
        // Create welcome message
        await storage.createChatMessage({
          sessionId: welcomeSession.id,
          userId: user.id,
          message: welcomeText,  // FIX: 'content' -> 'message'
          isAi: true,
          timestamp: new Date()
        });
        
        console.log(`[WELCOME] ✅ Personalized message created for session ${welcomeSession.id}`);
      } catch (welcomeError) {
        console.error(`[WELCOME] Error creating welcome message:`, welcomeError);
        // Don't fail registration if welcome message fails
      }

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

  app.get("/api/auth/user", (req, res) => {
    console.log('[AUTH-DEBUG] GET /api/auth/user called');
    console.log('[AUTH-DEBUG] Session exists:', !!req.session);
    console.log('[AUTH-DEBUG] Authenticated:', req.isAuthenticated());
    console.log('[AUTH-DEBUG] User:', req.user ? 'exists' : 'null');
    
    if (!req.isAuthenticated()) {
      console.log('[AUTH-DEBUG] User not authenticated - returning 401');
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    console.log('[AUTH-DEBUG] Returning user data');
    res.json(sanitizeUser(req.user as User));
  });
}

export const isSimpleAuth = (req: any, res: any, next: any) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  next();
};