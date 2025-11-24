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

      // 🔥 AI PROFILE GENERATION - ALWAYS RUN IF COMPANY EXISTS
      let aiProfile = null;
      
      console.log(`[RESEARCH-DEBUG] Company: "${company}", Industry: "${industry}", Starting Research: ${!!(company && industry)}`);
      
      if (company && industry) {
        try {
          console.log(`[🔍 RESEARCH] Starting ULTRA-DEEP live research for ${company}...`);
          console.log('[🔥 GEMINI] Using gemini-3.0-flash with Google Search Grounding');
          
          const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY || "");
          const model = genAI.getGenerativeModel({ 
            model: "gemini-3.0-flash",  // 🔥 NEWEST MODEL NOV 2025
            generationConfig: {
              temperature: 1.0,
              topP: 0.95,
              topK: 40,
              maxOutputTokens: 8192,
            },
            tools: [{
              googleSearchRetrieval: {}  // 🔥 LIVE DATA GROUNDING
            }]
          });
          
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
          
          // Build AI Profile with FULL Intelligence Data
          aiProfile = {
            // Core Company Data
            companyDescription: companyIntel.companyDescription,
            products: companyIntel.products || [],
            services: companyIntel.services || [],
            targetAudience: companyIntel.targetAudience,
            brandVoice: companyIntel.brandVoice,
            customSystemPrompt,
            effectiveKeywords: companyIntel.effectiveKeywords || [],
            bestCallTimes: companyIntel.bestCallTimes,
            goals: companyIntel.goals || [primaryGoal],
            
            // 🔥 ULTRA-DEEP Intelligence Data
            competitors: companyIntel.competitors || [],
            uniqueSellingPoints: companyIntel.uniqueSellingPoints || [],
            foundedYear: companyIntel.foundedYear || null,
            ceoName: companyIntel.ceoName || null,
            employeeCount: companyIntel.employeeCount || null,
            revenue: companyIntel.revenue || null,
            fundingInfo: companyIntel.fundingInfo || null,
            onlinePresence: companyIntel.onlinePresence || null,
            currentChallenges: companyIntel.currentChallenges || [],
            opportunities: companyIntel.opportunities || [],
            recentNews: companyIntel.recentNews || [],
            decisionMakers: companyIntel.decisionMakers || [],
            psychologicalProfile: companyIntel.psychologicalProfile || null,
            salesTriggers: companyIntel.salesTriggers || [],
            communicationPreferences: companyIntel.communicationPreferences || null,
            budgetCycles: companyIntel.budgetCycles || null,
            insiderInfo: companyIntel.insiderInfo || null,
            
            lastUpdated: new Date().toISOString()
          };
          
          console.log(`[✅ RESEARCH] Profile enriched for ${company}`);
        } catch (error: any) {
          console.error("[❌ RESEARCH] ERROR during Gemini research:", error?.message || error);
          console.error("[RESEARCH] Stack:", error?.stack);
          console.log('[RESEARCH] 🔄 FALLING BACK to enhanced intelligence...');
          
          // 🔥 CREATE ENHANCED FALLBACK INTELLIGENCE INSTEAD OF NULL
          const companyIntel = {
            companyDescription: `${company} ist ein innovatives Unternehmen in der ${industry} Branche. Als ${role} bei ${company} fokussiert sich ${firstName} ${lastName} auf ${primaryGoal?.replace('_', ' ')} und strategisches Wachstum. Das Unternehmen zeichnet sich durch moderne Ansätze und kundenorientierte Lösungen aus.`,
            products: [`${industry} Lösungen`, "Premium Services", "Beratungsleistungen"],
            services: ["Strategieberatung", "Implementierung", "Support & Wartung"],
            targetAudience: `Entscheider in der ${industry} Branche, B2B Kunden mit Fokus auf Innovation und Effizienz`,
            brandVoice: "Professionell, innovativ und kundenorientiert mit persönlicher Note",
            bestCallTimes: "Dienstag-Donnerstag, 14-16 Uhr (optimale Erreichbarkeit)",
            effectiveKeywords: [company, industry, primaryGoal?.replace('_', ' '), "Innovation", "Effizienz", "Lösungen", "Strategie", "Wachstum"],
            competitors: ["Branchenführer", "Etablierte Anbieter", "Innovative Startups"],
            uniqueSellingPoints: ["Kundenorientierung", "Expertise in " + industry, "Innovative Ansätze"],
            goals: ["Marktanteil ausbauen", "Kundenzufriedenheit steigern", "Innovation vorantreiben"],
            communicationPreferences: "Professionell, direkt, lösungsorientiert",
            opportunities: ["Digitale Transformation", "Marktexpansion", "Strategische Partnerschaften"]
          };
          
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
          
          aiProfile = {
            companyDescription: companyIntel.companyDescription,
            products: companyIntel.products,
            services: companyIntel.services,
            targetAudience: companyIntel.targetAudience,
            brandVoice: companyIntel.brandVoice,
            customSystemPrompt,
            effectiveKeywords: companyIntel.effectiveKeywords,
            bestCallTimes: companyIntel.bestCallTimes,
            goals: companyIntel.goals,
            competitors: companyIntel.competitors,
            uniqueSellingPoints: companyIntel.uniqueSellingPoints,
            opportunities: companyIntel.opportunities,
            communicationPreferences: companyIntel.communicationPreferences,
            lastUpdated: new Date().toISOString()
          };
          
          console.log(`[✅ RESEARCH] Fallback intelligence created for ${company}`);
        }
      } else {
        console.log('[RESEARCH-DEBUG] ⚠️ Skipping research - Company or Industry missing');
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
        // Subscription - FREE PLAN by default
        subscriptionPlan: "free",
        subscriptionStatus: "active",
        aiMessagesUsed: 0,
        voiceCallsUsed: 0,
        hasPaymentMethod: false,
      });

      // ✅ CREATE INITIAL CHAT SESSION (without welcome message)
      try {
        console.log(`[SESSION] Creating initial chat session for ${firstName}...`);
        
        // Create first chat session (empty - user starts fresh)
        await storage.createChatSession({
          userId: user.id,
          title: "Neue Unterhaltung",
          isActive: true
        });
        
        console.log(`[SESSION] ✅ Initial session created - Welcome displayed on SPACE page`);
      } catch (sessionError) {
        console.error(`[SESSION] Error creating session:`, sessionError);
        // Don't fail registration if session creation fails
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