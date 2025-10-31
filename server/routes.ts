import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { logger } from "./logger";
import { PerformanceMonitor, performanceMiddleware } from "./performance-monitor";
import { insertLeadSchema, insertCampaignSchema, insertChatMessageSchema, sanitizeUser } from "@shared/schema";
import { z } from "zod";
import Stripe from "stripe";
import OpenAI from "openai";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import multer from "multer";
import twilio from "twilio";
import chatRouter from "./chat";

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
  console.log('[PASSWORD-DEBUG] Comparing passwords');
  console.log('[PASSWORD-DEBUG] Supplied password:', `'${supplied}'`);
  console.log('[PASSWORD-DEBUG] Stored password format:', stored.substring(0, 10) + '...');
  console.log('[PASSWORD-DEBUG] Full stored password:', stored);
  
  // Handle bcrypt passwords (start with $2a$ or $2b$)
  if (stored.startsWith('$2a$') || stored.startsWith('$2b$')) {
    console.log('[PASSWORD-DEBUG] Using bcrypt comparison');
    const bcrypt = await import('bcryptjs');
    const result = await bcrypt.compare(supplied, stored);
    console.log('[PASSWORD-DEBUG] Bcrypt result:', result);
    return result;
  }
  
  // Handle scrypt passwords (legacy format)
  console.log('[PASSWORD-DEBUG] Using scrypt comparison');
  const [hashed, salt] = stored.split(".");
  console.log('[PASSWORD-DEBUG] Split result - hashed length:', hashed?.length, 'salt length:', salt?.length);
  console.log('[PASSWORD-DEBUG] Extracted salt:', salt);
  
  if (!hashed || !salt) {
    console.log('[PASSWORD-DEBUG] Invalid password format - missing hash or salt');
    return false;
  }
  
  // TEST: Hash the same password with the same salt to verify
  console.log('[PASSWORD-DEBUG] Testing: re-hashing supplied password with extracted salt...');
  const testBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  const testHex = testBuf.toString('hex');
  console.log('[PASSWORD-DEBUG] Test hash result:', testHex.substring(0, 20) + '...');
  console.log('[PASSWORD-DEBUG] Should match stored:', hashed.substring(0, 20) + '...');
  console.log('[PASSWORD-DEBUG] Exact match?', testHex === hashed);
  
  return testHex === hashed;
}

// Simple authentication middleware
function requireAuth(req: any, res: any, next: any) {
  if (!req.session?.userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  next();
}

// Configure multer for handling audio file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 25 * 1024 * 1024, // 25MB limit for audio files
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('audio/') || file.fieldname === 'audio') {
      cb(null, true);
    } else {
      cb(new Error('Only audio files are allowed'));
    }
  }
});

// Initialize Stripe - will work with real API key when provided
const stripe = process.env.STRIPE_SECRET_KEY ? 
  new Stripe(process.env.STRIPE_SECRET_KEY) : 
  null;

export async function registerRoutes(app: Express): Promise<Server> {
  // Add performance monitoring middleware
  app.use(performanceMiddleware());
  
  // Simple in-memory session setup
  const session = await import('express-session');
  const MemoryStore = await import('memorystore');
  
  const sessionStore = MemoryStore.default(session.default);

  app.use(session.default({
    secret: process.env.SESSION_SECRET || "aras-ai-production-secret-2024",
    resave: false,
    saveUninitialized: false,
    store: new sessionStore({
      checkPeriod: 86400000, // prune expired entries every 24h
    }),
    cookie: {
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      httpOnly: true,
      secure: false, // Set to true in production with HTTPS
      sameSite: 'lax' // Add sameSite for better compatibility
    },
  }));

  // Debug route to check auth status
  app.get('/api/auth/status', (req: any, res) => {
    res.json({
      isAuthenticated: !!req.session?.userId,
      userId: req.session?.userId || null,
      session: req.session ? 'exists' : 'missing',
    });
  });

  // Auth routes
  app.get('/api/auth/user', async (req: any, res) => {
    try {
      console.log('[AUTH-DEBUG] GET /api/auth/user called');
      console.log('[AUTH-DEBUG] Session exists:', !!req.session);
      console.log('[AUTH-DEBUG] Session ID:', req.session?.id);
      console.log('[AUTH-DEBUG] User ID in session:', req.session?.userId);
      
      // Simple session check
      if (!req.session?.userId) {
        console.log('[AUTH-DEBUG] No userId in session - returning 401');
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const userId = req.session.userId;
      console.log('[AUTH-DEBUG] Fetching user from DB:', userId);
      const user = await storage.getUser(userId);
      
      if (!user) {
        console.log('[AUTH-DEBUG] User not found in database:', userId);
        return res.status(404).json({ message: "User not found" });
      }
      
      console.log('[AUTH-DEBUG] User found successfully:', user.username);
      res.json(sanitizeUser(user));
    } catch (error) {
      logger.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Login route
  app.post('/api/login', async (req: any, res) => {
    try {
      const { username, password } = req.body;
      console.log('[LOGIN-DEBUG] Login attempt for:', username);
      console.log('[LOGIN-DEBUG] Password provided:', !!password);
      
      if (!username || !password) {
        console.log('[LOGIN-DEBUG] Missing credentials');
        return res.status(400).send("Username and password required");
      }

      console.log('[LOGIN-DEBUG] Looking up user in database...');
      const user = await storage.getUserByUsername(username);
      if (!user) {
        console.log('[LOGIN-DEBUG] User not found in database:', username);
        return res.status(400).send("Invalid credentials");
      }
      console.log('[LOGIN-DEBUG] User found:', user.username, 'ID:', user.id);

      console.log('[LOGIN-DEBUG] Comparing passwords...');
      const isValid = await comparePasswords(password, user.password);
      if (!isValid) {
        console.log('[LOGIN-DEBUG] Password comparison failed');
        return res.status(400).send("Invalid credentials");
      }
      console.log('[LOGIN-DEBUG] Password verified successfully');

      console.log('[LOGIN-DEBUG] Setting session userId:', user.id);
      req.session.userId = user.id;
      
      // Explicitly save the session to ensure it persists
      req.session.save((err: any) => {
        if (err) {
          console.log('[LOGIN-DEBUG] Session save error:', err);
          logger.error("Session save error:", err);
          return res.status(500).send("Login failed - session save error");
        }
        console.log('[LOGIN-DEBUG] Session saved successfully. User logged in:', user.username);
        logger.info("User logged in successfully", { userId: user.id, username: user.username });
        res.json(sanitizeUser(user));
      });
    } catch (error) {
      logger.error("Login error:", error);
      res.status(500).send("Login failed");
    }
  });

  // Register route
  app.post('/api/register', async (req: any, res) => {
    try {
      const { username, password, email, firstName, lastName } = req.body;
      console.log('[REGISTER-DEBUG] Registration attempt for:', username);
      console.log('[REGISTER-DEBUG] Email:', email);
      
      if (!username || !password) {
        console.log('[REGISTER-DEBUG] Missing username or password');
        return res.status(400).send("Username and password required");
      }

      console.log('[REGISTER-DEBUG] Checking if username exists...');
      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        console.log('[REGISTER-DEBUG] Username already exists:', username);
        return res.status(400).send("Username already exists");
      }
      console.log('[REGISTER-DEBUG] Username available, creating user...');

      const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      console.log('[REGISTER-DEBUG] Generated user ID:', userId);
      const hashedPassword = await hashPassword(password);
      console.log('[REGISTER-DEBUG] Password hashed, creating user in database...');
      
      const newUser = await storage.createUser({
        id: userId,
        username,
        password: hashedPassword,
        email,
        firstName,
        lastName,
        subscriptionPlan: "starter",
        subscriptionStatus: "trial", // Start with trial status - 10 free AI messages
        aiMessagesUsed: 0, // Initialize message counter
      });
      console.log('[REGISTER-DEBUG] User created successfully:', newUser.id);

      console.log('[REGISTER-DEBUG] Setting session userId:', newUser.id);
      req.session.userId = newUser.id;
      
      // Explicitly save the session to ensure it persists
      req.session.save((err: any) => {
        if (err) {
          console.log('[REGISTER-DEBUG] Session save error:', err);
          logger.error("Session save error:", err);
          return res.status(500).send("Registration failed - session save error");
        }
        console.log('[REGISTER-DEBUG] Session saved. Registration complete for:', newUser.username);
        res.status(201).json(sanitizeUser(newUser));
      });
    } catch (error) {
      logger.error("Registration error:", error);
      res.status(500).send("Registration failed");
    }
  });

  // Logout route
  app.post('/api/logout', (req: any, res) => {
    req.session.destroy((err: any) => {
      if (err) {
        return res.status(500).send("Logout failed");
      }
      res.sendStatus(200);
    });
  });

  // Subscription status route - Enhanced with trial information per Stripe best practices
  app.get('/api/user/subscription', requireAuth, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const user = await storage.getUser(userId);
      const subscription = await storage.getSubscriptionStatus(userId);
      const plan = await storage.getSubscriptionPlan(subscription.subscriptionPlan);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Enhanced trial status calculation based on Stripe documentation
      const now = new Date();
      const isTrialActive = user.trialEndDate && new Date(user.trialEndDate) > now;
      const requiresPaymentSetup = !user.hasPaymentMethod;
      
      // Calculate trial messages remaining for proper UI display
      const trialMessagesRemaining = subscription.subscriptionStatus === 'trial' ? 
        Math.max(0, 10 - subscription.aiMessagesUsed) : 0;
      
      res.json({
        plan: subscription.subscriptionPlan,
        status: subscription.subscriptionStatus,
        aiMessagesUsed: subscription.aiMessagesUsed,
        voiceCallsUsed: subscription.voiceCallsUsed,
        aiMessagesLimit: plan?.aiMessagesLimit || null,
        voiceCallsLimit: plan?.voiceCallsLimit || null,
        renewalDate: subscription.subscriptionEndDate,
        // Trial-specific information for frontend
        trialMessagesUsed: subscription.aiMessagesUsed,
        trialMessagesRemaining,
        trialEndDate: user.trialEndDate,
        hasPaymentMethod: user.hasPaymentMethod || false,
        requiresPaymentSetup,
        isTrialActive: subscription.subscriptionStatus === 'trial' || isTrialActive,
        canUpgrade: true,
        // Display status for UI components
        displayStatus: subscription.subscriptionStatus === 'trial' ? 'Free Trial' : 
                      subscription.subscriptionStatus === 'active' ? 'Active' : 
                      subscription.subscriptionStatus
      });
    } catch (error) {
      logger.error("Error fetching subscription status:", error);
      res.status(500).json({ message: "Failed to fetch subscription status" });
    }
  });

  // Leads routes
  app.get('/api/leads', requireAuth, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const leads = await storage.getLeads(userId);
      res.json(leads);
    } catch (error) {
      logger.error("Error fetching leads:", error);
      res.status(500).json({ message: "Failed to fetch leads" });
    }
  });

  app.post('/api/leads', requireAuth, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const leadData = { ...req.body, userId };
      const lead = await storage.createLead(leadData);
      res.json(lead);
    } catch (error) {
      logger.error("Error creating lead:", error);
      res.status(500).json({ message: "Failed to create lead" });
    }
  });

  // Call logs routes
  app.get('/api/call-logs', requireAuth, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const callLogs = await storage.getCallLogs(userId);
      res.json(callLogs);
    } catch (error) {
      logger.error("Error fetching call logs:", error);
      res.status(500).json({ message: "Failed to fetch call logs" });
    }
  });

  // Campaigns routes
  app.get('/api/campaigns', requireAuth, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const campaigns = await storage.getCampaigns(userId);
      res.json(campaigns);
    } catch (error) {
      logger.error("Error fetching campaigns:", error);
      res.status(500).json({ message: "Failed to fetch campaigns" });
    }
  });

  // Get subscription plans
  app.get('/api/subscription-plans', async (req: any, res) => {
    try {
      const plans = await storage.getAllSubscriptionPlans();
      res.json(plans);
    } catch (error) {
      logger.error("Error fetching subscription plans:", error);
      res.status(500).json({ message: "Failed to fetch subscription plans" });
    }
  });

  // Lead routes
  app.get('/api/leads', requireAuth, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const leads = await storage.getLeads(userId);
      res.json(leads);
    } catch (error) {
      logger.error("Error fetching leads:", error);
      res.status(500).json({ message: "Failed to fetch leads" });
    }
  });

  app.post('/api/leads', requireAuth, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const leadData = insertLeadSchema.parse({ ...req.body, userId });
      const lead = await storage.createLead(leadData);
      res.json(lead);
    } catch (error) {
      logger.error("Error creating lead:", error);
      res.status(500).json({ message: "Failed to create lead" });
    }
  });

  app.put('/api/leads/:id', requireAuth, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const updates = req.body;
      const lead = await storage.updateLead(id, updates);
      res.json(lead);
    } catch (error) {
      logger.error("Error updating lead:", error);
      res.status(500).json({ message: "Failed to update lead" });
    }
  });

  app.delete('/api/leads/:id', requireAuth, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteLead(id, req.session.userId);
      res.json({ message: "Lead deleted successfully" });
    } catch (error) {
      logger.error("Error deleting lead:", error);
      res.status(500).json({ message: "Failed to delete lead" });
    }
  });

  // Campaign routes
  app.get('/api/campaigns', requireAuth, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const campaigns = await storage.getCampaigns(userId);
      res.json(campaigns);
    } catch (error) {
      logger.error("Error fetching campaigns:", error);
      res.status(500).json({ message: "Failed to fetch campaigns" });
    }
  });

  app.post('/api/campaigns', requireAuth, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const campaignData = insertCampaignSchema.parse({ ...req.body, userId });
      const campaign = await storage.createCampaign(campaignData);
      res.json(campaign);
    } catch (error) {
      logger.error("Error creating campaign:", error);
      res.status(500).json({ message: "Failed to create campaign" });
    }
  });

  // Chat routes
  app.get('/api/chat/messages', requireAuth, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      let sessionId = req.query.sessionId ? parseInt(req.query.sessionId) : undefined;
      
      // If no sessionId provided, get messages for the active session
      if (!sessionId) {
        const activeSession = await storage.getActiveSession(userId);
        if (activeSession) {
          sessionId = activeSession.id;
        }
      }
      
      const messages = await storage.getChatMessages(userId, sessionId);
      res.json(messages);
    } catch (error) {
      logger.error("Error fetching chat messages:", error);
      res.status(500).json({ message: "Failed to fetch chat messages" });
    }
  });

  // Chat session management routes
  app.get('/api/chat/sessions', requireAuth, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const sessions = await storage.getChatSessions(userId);
      res.json(sessions);
    } catch (error) {
      logger.error("Error fetching chat sessions:", error);
      res.status(500).json({ message: "Failed to fetch chat sessions" });
    }
  });

  app.post('/api/chat/sessions/new', requireAuth, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const { title = "New Chat" } = req.body;
      
      // Create new session (automatically deactivates others)
      const session = await storage.createChatSession({
        userId,
        title,
        isActive: true
      });
      
      res.json({
        message: 'New chat session started',
        session,
        success: true 
      });
    } catch (error) {
      logger.error('Error starting new chat session:', error);
      res.status(500).json({ message: 'Failed to start new chat session' });
    }
  });

  app.post('/api/chat/sessions/:id/activate', requireAuth, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const sessionId = parseInt(req.params.id);
      
      // Activate the session
      await storage.setActiveSession(userId, sessionId);
      
      // Get messages for this session to confirm it loaded
      const messages = await storage.getChatMessagesBySession(sessionId);
      
      res.json({
        message: 'Chat session activated',
        sessionId,
        messageCount: messages.length,
        success: true
      });
    } catch (error) {
      logger.error('Error activating chat session:', error);
      res.status(500).json({ message: 'Failed to activate chat session' });
    }
  });

  app.get('/api/chat/sessions/:id/messages', requireAuth, async (req: any, res) => {
    try {
      const sessionId = parseInt(req.params.id);
      const messages = await storage.getChatMessagesBySession(sessionId);
      res.json(messages);
    } catch (error) {
      logger.error("Error fetching session messages:", error);
      res.status(500).json({ message: "Failed to fetch session messages" });
    }
  });

  // Export chat history endpoint
  app.post('/api/chat/export', requireAuth, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const { format = 'pdf' } = req.body;
      
      const messages = await storage.getChatMessages(userId);
      const user = await storage.getUser(userId);
      
      // Create text content
      let content = `ARAS AI Chat Export\nUser: ${user?.username || 'Unknown'}\nDate: ${new Date().toLocaleString()}\n\n`;
      
      messages.forEach((msg, index) => {
        const sender = msg.isAi ? 'ARAS AI' : (user?.firstName || user?.username || 'User');
        const timestamp = new Date(msg.timestamp || new Date()).toLocaleString();
        content += `[${timestamp}] ${sender}:\n${msg.message}\n\n`;
      });
      
      if (format === 'pdf') {
        // For now, return as text file since we don't have PDF library
        res.setHeader('Content-Type', 'text/plain');
        res.setHeader('Content-Disposition', `attachment; filename="chat-export-${new Date().toISOString().split('T')[0]}.txt"`);
        res.send(content);
      } else {
        res.json({ content, messageCount: messages.length });
      }
    } catch (error) {
      logger.error('Error exporting chat:', error);
      res.status(500).json({ message: 'Failed to export chat' });
    }
  });

  // Search chat messages endpoint
  app.get('/api/chat/search', requireAuth, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const { q: query } = req.query;
      
      if (!query) {
        return res.status(400).json({ message: 'Search query required' });
      }
      
      const messages = await storage.searchChatMessages(userId, query);
      res.json(messages);
    } catch (error) {
      logger.error('Error searching chat messages:', error);
      res.status(500).json({ message: 'Failed to search messages' });
    }
  });

  app.post('/api/chat/messages', requireAuth, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const { 
        message, 
        personality = 'professional', 
        responseLength = 'detailed', 
        context = 'sales_automation',
        language = 'en',
        assistantId = null
      } = req.body;
      
      logger.debug('Received chat request', { language, messagePreview: message.substring(0, 50) });
      
      // Check subscription usage limits
      const usageCheck = await storage.checkUsageLimit(userId, 'ai_message');
      if (!usageCheck.allowed) {
        return res.status(400).json({ 
          message: usageCheck.message,
          requiresPayment: usageCheck.requiresPayment,
          requiresUpgrade: usageCheck.requiresUpgrade
        });
      }
      
      // Ensure user has an active session
      let activeSession = await storage.getActiveSession(userId);
      if (!activeSession) {
        activeSession = await storage.createChatSession({
          userId,
          title: "New Chat",
          isActive: true
        });
      }

      // Save user message
      const userMessage = await storage.createChatMessage({
        sessionId: activeSession.id,
        userId,
        message,
        isAi: false
      });
      
      // Generate AI response using OpenAI
      const openai = new OpenAI({ 
        apiKey: process.env.OPENAI_API_KEY 
      });

      let aiResponse = "";
      
      // Temporarily disabled Assistant API due to type conflicts
      // Will use standard chat completions for now
      if (assistantId && assistantId.startsWith('asst_')) {
        logger.info('Assistant ID provided but using fallback chat completion for stability');
      }
      
      // Fallback to regular chat completions if no assistant or assistant failed
      if (!aiResponse || aiResponse.includes("Falling back") || aiResponse.includes("encountered")) {
        // Get recent chat history for context
        const recentMessages = await storage.getChatMessages(userId);
        const conversationHistory = recentMessages.slice(-6).map(msg => ({
          role: msg.isAi ? "assistant" as const : "user" as const,
          content: msg.message
        }));

        // Build personality-specific system prompt
        let systemPrompt = "CRITICAL RULE: NEVER use **, *, __, _, or any markdown formatting. NEVER use asterisks anywhere in your response. Write only in plain text. You are ARAS AI, an advanced sales automation assistant. ";
        
        switch (personality) {
          case 'casual':
            systemPrompt += "Be friendly, conversational, and approachable. Use a warm tone while maintaining professionalism.";
            break;
          case 'technical':
            systemPrompt += "Be detailed, technical, and precise. Focus on data-driven insights and specific methodologies.";
            break;
          default: // professional
            systemPrompt += "Be professional, authoritative, and business-focused. Provide clear, actionable advice.";
        }

        // Add response style guidance
        switch (responseLength) {
          case 'brief':
            systemPrompt += " Keep responses concise and to the point, under 100 words.";
            break;
          case 'bullet':
            systemPrompt += " Format responses as plain text with dashes for bullet points, no asterisks.";
            break;
          default: // detailed
            systemPrompt += " Provide comprehensive, detailed explanations with examples.";
        }

        systemPrompt += " Specialize in: lead qualification, email campaigns, call scripts, sales strategies, CRM optimization, and pipeline analysis. Always use plain text formatting only.";
        
        // Add language instruction - this is critical for immediate response
        const languageNames = {
          'en': 'English',
          'es': 'Spanish', 
          'fr': 'French',
          'de': 'German',
          'pt': 'Portuguese',
          'it': 'Italian',
          'ru': 'Russian',
          'zh': 'Chinese',
          'ja': 'Japanese',
          'ar': 'Arabic'
        };
        
        if (language && language !== 'en' && languageNames[language as keyof typeof languageNames]) {
          const languageName = languageNames[language as keyof typeof languageNames];
          logger.debug('Language detected', { language, languageName });
          // Override system prompt entirely for language
          systemPrompt = `CRITICAL: You must respond ONLY in ${languageName}. ABSOLUTELY FORBIDDEN: Do not use **, *, __, _, or any markdown formatting. Write only in plain text. Never use asterisks anywhere in your response. You are ARAS AI, a sales automation assistant. Be ${personality === 'casual' ? 'friendly and conversational' : personality === 'technical' ? 'detailed and technical' : 'professional'}. ${responseLength === 'brief' ? 'Keep responses under 100 words.' : responseLength === 'bullet' ? 'Use plain text bullet points with dashes only' : 'Provide detailed explanations in plain text.'} Focus on lead qualification, email campaigns, call scripts, sales strategies, CRM optimization, and pipeline analysis. Write your entire response in ${languageName} language using only plain text format. NO ASTERISKS ALLOWED.`;
        }
        
        // Add language enforcement and example responses
        let userMessage = message;
        let languageExamples: Array<{role: "assistant", content: string}> = [];
        
        if (language && language !== 'en' && languageNames[language as keyof typeof languageNames]) {
          const languageName = languageNames[language as keyof typeof languageNames];
          userMessage = `${message} (Respond in ${languageName} only)`;
          logger.debug('User message modified', { languageName, messagePreview: userMessage.substring(0, 100) });
          
          // Add example assistant responses in the target language
          const examples = {
            'es': { role: "assistant" as const, content: "Hola, soy ARAS AI y te ayudo con automatización de ventas. ¿En qué puedo asistirte hoy?" },
            'fr': { role: "assistant" as const, content: "Bonjour, je suis ARAS AI et je vous aide avec l'automatisation des ventes. Comment puis-je vous aider aujourd'hui ?" },
            'de': { role: "assistant" as const, content: "Hallo, ich bin ARAS AI und helfe Ihnen bei der Vertriebsautomatisierung. Wie kann ich Ihnen heute helfen?" },
            'pt': { role: "assistant" as const, content: "Olá, sou ARAS AI e ajudo com automação de vendas. Como posso ajudá-lo hoje?" },
            'it': { role: "assistant" as const, content: "Ciao, sono ARAS AI e ti aiuto con l'automazione delle vendite. Come posso aiutarti oggi?" },
            'ru': { role: "assistant" as const, content: "Привет, я ARAS AI и помогаю с автоматизацией продаж. Чем могу помочь вам сегодня?" },
            'zh': { role: "assistant" as const, content: "你好，我是ARAS AI，专门帮助销售自动化。今天我能为您做些什么？" },
            'ja': { role: "assistant" as const, content: "こんにちは、私はARAS AIで、営業自動化をお手伝いします。今日はどのようなことでお手伝いできますか？" },
            'ar': { role: "assistant" as const, content: "مرحباً، أنا ARAS AI وأساعد في أتمتة المبيعات. كيف يمكنني مساعدتك اليوم؟" }
          };
          
          const example = examples[language as keyof typeof examples];
          if (example) {
            languageExamples = [example];
          }
        }

        const completion = await openai.chat.completions.create({
          model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
          messages: [
            { role: "system", content: systemPrompt },
            ...languageExamples,
            ...conversationHistory,
            { role: "user", content: userMessage }
          ],
          max_tokens: responseLength === 'brief' ? 150 : 800,
          temperature: personality === 'casual' ? 0.8 : 0.7
        });
        
        logger.debug('OpenAI request sent', { language, systemPromptPreview: systemPrompt.substring(0, 100) });
        
        aiResponse = completion.choices[0]?.message?.content || "I'm sorry, I couldn't generate a response.";
        
        // AGGRESSIVE markdown removal - 5 passes with comprehensive cleaning
        let cleanResponse = aiResponse;
        for (let i = 0; i < 5; i++) {
          cleanResponse = cleanResponse
            .replace(/\*\*(.*?)\*\*/g, '$1')  // Remove **bold**
            .replace(/\*(.*?)\*/g, '$1')      // Remove *italic*
            .replace(/__(.*?)__/g, '$1')      // Remove __underline__
            .replace(/_(.*?)_/g, '$1')        // Remove _underline_
            .replace(/`(.*?)`/g, '$1')        // Remove `code`
            .replace(/~~(.*?)~~/g, '$1')      // Remove ~~strikethrough~~
            .replace(/\*\*/g, '')             // Remove any remaining **
            .replace(/\*/g, '')               // Remove any remaining *
            .replace(/^\s*[\*\-\+]\s*/gm, '- ') // Convert bullet points to dashes
            .replace(/^\s*\d+\.\s*/gm, '')    // Remove numbered lists
            .replace(/\*\*([^*]*?)\*\*/g, '$1') // Additional pass for nested **
            .replace(/\*([^*]*?)\*/g, '$1');    // Additional pass for nested *
        }
        
        // Final cleanup - remove any remaining asterisks
        cleanResponse = cleanResponse
          .replace(/\*/g, '')              // Remove ALL asterisks
          .replace(/\*\*/g, '')            // Remove ALL double asterisks
          .replace(/^\*\s*/gm, '- ')       // Convert any remaining bullet asterisks to dashes
          .replace(/\s\*\s/g, ' ')         // Remove asterisks between spaces
          .replace(/\*:/g, ':')            // Remove asterisks before colons
          .replace(/:\*/g, ':');           // Remove asterisks after colons
          
        aiResponse = cleanResponse;
        
        logger.debug('After markdown removal', { responsePreview: aiResponse.substring(0, 200) });
      }
      
      // Save AI response
      const aiMessage = await storage.createChatMessage({
        sessionId: activeSession.id,
        userId,
        message: aiResponse,
        isAi: true
      });
      
      // Track AI message usage
      await storage.trackUsage(userId, 'ai_message', 
        assistantId ? `AI Assistant message (${assistantId.slice(-8)})` : `AI chat message (${personality}, ${responseLength})`
      );
      
      res.json({
        userMessage,
        aiMessage,
        usageTracked: true,
        confidence: 0.95, // AI confidence score
        personality,
        responseLength,
        assistantUsed: !!assistantId
      });
    } catch (error) {
      logger.error("Error in AI chat:", error);
      res.status(500).json({ message: "Failed to process chat message" });
    }
  });

  // Assistant configuration endpoint
  app.post('/api/assistant/configure', requireAuth, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const { assistantId } = req.body;
      
      if (!assistantId || !assistantId.startsWith('asst_')) {
        return res.status(400).json({ message: "Valid OpenAI Assistant ID required (starts with 'asst_')" });
      }
      
      // Validate the assistant exists by testing it
      try {
        const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
        await openai.beta.assistants.retrieve(assistantId);
      } catch (error) {
        return res.status(400).json({ message: "Invalid Assistant ID or assistant not found" });
      }
      
      // Store assistant ID in user profile
      await storage.updateUserProfile(userId, { assistantId });
      
      res.json({ 
        message: "Assistant configured successfully",
        assistantId 
      });
    } catch (error) {
      logger.error("Error configuring assistant:", error);
      res.status(500).json({ message: "Failed to configure assistant" });
    }
  });

  // Get user's assistant configuration
  app.get('/api/assistant/config', requireAuth, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const user = await storage.getUser(userId);
      
      res.json({
        assistantId: (user as any)?.assistantId || null,
        threadId: user?.threadId || null
      });
    } catch (error) {
      logger.error("Error getting assistant config:", error);
      res.status(500).json({ message: "Failed to get assistant configuration" });
    }
  });

  // Speech-to-Text endpoint using OpenAI Whisper
  app.post("/api/speech/transcribe", requireAuth, upload.single('audio'), async (req: any, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No audio file provided" });
      }

      if (!process.env.OPENAI_API_KEY) {
        return res.status(500).json({ message: "OpenAI API key not configured" });
      }

      const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });

      // Check file size for quality
      if (req.file.buffer.length < 1000) {
        return res.status(400).json({ message: "Audio file too small or corrupted" });
      }

      // Convert buffer to File-like object for OpenAI
      const audioFile = new File([req.file.buffer], 'recording.webm', {
        type: req.file.mimetype,
      });

      console.log('Audio file details:', {
        size: req.file.buffer.length,
        mimetype: req.file.mimetype,
        filename: req.file.originalname
      });

      const transcription = await openai.audio.transcriptions.create({
        file: audioFile,
        model: "whisper-1",
        language: "en", // Specify English for better accuracy
        response_format: "verbose_json", // Get more detailed response
        temperature: 0.2, // Slightly higher for better recognition
        prompt: "This is a clear speech recording from a user speaking to an AI assistant about sales automation, business, or general conversation.", // Context helps accuracy
      });

      console.log('Whisper response:', JSON.stringify(transcription, null, 2));

      // Clean and validate the transcription
      let cleanedText = transcription.text?.trim() || "";
      
      // Remove common transcription artifacts
      cleanedText = cleanedText.replace(/^(um|uh|hmm|well|so|like)\s+/i, '');
      cleanedText = cleanedText.replace(/\s+(um|uh|hmm|well|so|like)\s+/gi, ' ');
      cleanedText = cleanedText.replace(/\s+/g, ' ');
      
      // Capitalize first letter
      if (cleanedText.length > 0) {
        cleanedText = cleanedText.charAt(0).toUpperCase() + cleanedText.slice(1);
      }

      res.json({ 
        text: cleanedText,
        duration: transcription.duration || null,
        confidence: transcription.segments?.[0]?.avg_logprob || null
      });

    } catch (error: any) {
      logger.error('Speech transcription error:', error);
      res.status(500).json({ 
        message: "Failed to transcribe audio",
        error: error.message 
      });
    }
  });

  // Text-to-Speech endpoint using OpenAI TTS
  app.post("/api/speech/synthesize", requireAuth, async (req: any, res) => {
    try {
      const { text, voice = "nova", speed = 1.0 } = req.body;

      if (!text || typeof text !== 'string') {
        return res.status(400).json({ message: "Text is required" });
      }

      if (text.length > 4096) {
        return res.status(400).json({ message: "Text too long. Maximum 4096 characters." });
      }

      if (!process.env.OPENAI_API_KEY) {
        return res.status(500).json({ message: "OpenAI API key not configured" });
      }

      const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });

      const mp3 = await openai.audio.speech.create({
        model: "tts-1",
        voice: voice as "alloy" | "echo" | "fable" | "nova" | "onyx" | "shimmer",
        input: text,
        speed: Math.max(0.25, Math.min(4.0, speed)), // Clamp speed between 0.25 and 4.0
        response_format: "mp3"
      });

      const buffer = Buffer.from(await mp3.arrayBuffer());

      res.set({
        'Content-Type': 'audio/mpeg',
        'Content-Length': buffer.length.toString(),
      });

      res.send(buffer);

    } catch (error: any) {
      logger.error('Text-to-speech error:', error);
      res.status(500).json({ 
        message: "Failed to synthesize speech",
        error: error.message 
      });
    }
  });

  // Voice agent routes
  // Voice agents routes
  app.get('/api/voice-agents', requireAuth, async (req: any, res) => {
    try {
      const voiceAgents = await storage.getVoiceAgents();
      res.json(voiceAgents);
    } catch (error) {
      logger.error("Error fetching voice agents:", error);
      res.status(500).json({ message: "Failed to fetch voice agents" });
    }
  });

  app.post('/api/voice-agents', requireAuth, async (req: any, res) => {
    try {
      const agentData = req.body;
      
      // Validate required fields
      if (!agentData.name || !agentData.voice) {
        return res.status(400).json({ message: "Name and voice type are required" });
      }

      // Add user ID to agent data
      agentData.userId = req.session.userId;
      
      const newAgent = await storage.createVoiceAgent(agentData);
      res.json(newAgent);
    } catch (error) {
      logger.error("Error creating voice agent:", error);
      res.status(500).json({ message: "Failed to create voice agent" });
    }
  });

  app.put('/api/voice-agents/:id', requireAuth, async (req: any, res) => {
    try {
      const agentId = parseInt(req.params.id);
      const updateData = req.body;
      
      // Verify agent exists and belongs to user (or is system agent)
      const existingAgent = await storage.getVoiceAgentById(agentId);
      if (!existingAgent) {
        return res.status(404).json({ message: "Voice agent not found" });
      }
      
      if (existingAgent.userId && existingAgent.userId !== req.session.userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      // Don't allow editing system agents
      if (existingAgent.isSystemAgent) {
        return res.status(403).json({ message: "Cannot edit system agents" });
      }
      
      const updatedAgent = await storage.updateVoiceAgent(agentId, updateData);
      res.json(updatedAgent);
    } catch (error) {
      logger.error("Error updating voice agent:", error);
      res.status(500).json({ message: "Failed to update voice agent" });
    }
  });

  app.delete('/api/voice-agents/:id', requireAuth, async (req: any, res) => {
    try {
      const agentId = parseInt(req.params.id);
      
      // Verify agent exists and belongs to user
      const existingAgent = await storage.getVoiceAgentById(agentId);
      if (!existingAgent) {
        return res.status(404).json({ message: "Voice agent not found" });
      }
      
      if (existingAgent.userId && existingAgent.userId !== req.session.userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      // Don't allow deleting system agents
      if (existingAgent.isSystemAgent) {
        return res.status(403).json({ message: "Cannot delete system agents" });
      }
      
      await storage.deleteVoiceAgent(agentId);
      res.json({ message: "Voice agent deleted successfully" });
    } catch (error) {
      logger.error("Error deleting voice agent:", error);
      res.status(500).json({ message: "Failed to delete voice agent" });
    }
  });

  // Real Twilio voice calling with AI integration
  app.post('/api/calls', requireAuth, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const { phoneNumber, leadId, voiceAgentId, message, leadName } = req.body;
      
      // Get user's Twilio settings
      const twilioSettings = await storage.getTwilioSettings(userId);
      if (!twilioSettings.configured) {
        return res.status(400).json({ 
          message: "Twilio not configured. Please configure your Twilio settings first.",
          requiresConfiguration: true
        });
      }
      
      // Get voice agent details
      const voiceAgents = await storage.getVoiceAgents();
      const selectedAgent = voiceAgents.find(agent => agent.id === voiceAgentId);
      
      if (!selectedAgent) {
        return res.status(400).json({ message: "Invalid voice agent selected" });
      }
      
      // Check subscription usage limits  
      const usageCheck = await storage.checkUsageLimit(userId, 'voice_call');
      if (!usageCheck.allowed) {
        return res.status(400).json({ 
          message: usageCheck.message,
          requiresPayment: usageCheck.requiresPayment,
          requiresUpgrade: usageCheck.requiresUpgrade
        });
      }
      
      // Get full Twilio settings from database for API calls
      const twilioSettingsRaw = await storage.getTwilioSettingsRaw(userId);
      if (!twilioSettingsRaw) {
        return res.status(400).json({ message: "Twilio configuration not found" });
      }
      
      // Initialize Twilio client with user's credentials
      const twilioClient = twilio(twilioSettingsRaw.accountSid, twilioSettingsRaw.authToken);
      
      // Create call log first
      const callLog = await storage.createCallLog({
        userId,
        phoneNumber,
        leadId,
        voiceAgentId,
        status: 'initiating',
      });
      
      // Generate dynamic TwiML for voice message
      const voiceMessage = message || `Hello ${leadName || 'there'}, this is ${selectedAgent.name}. I'm calling to follow up on your interest in our services. Press 1 to speak with a representative or hang up to end this call.`;
      
      // Create TwiML response URL (we'll create this endpoint next)
      const twimlUrl = `${req.protocol}://${req.get('host')}/api/calls/twiml/${callLog.id}`;
      
      try {
        // Make actual Twilio API call
        const call = await twilioClient.calls.create({
          to: phoneNumber,
          from: twilioSettingsRaw.phoneNumber,
          url: twimlUrl,
          method: 'POST',
          statusCallback: `${req.protocol}://${req.get('host')}/api/calls/status/${callLog.id}`,
          statusCallbackMethod: 'POST',
          statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
        });
        
        // Update call log with Twilio call SID
        await storage.updateCallLog(callLog.id, {
          status: 'initiated',
          twilioCallSid: call.sid,
          duration: 0,
        });
        
        // Track voice call usage
        await storage.trackUsage(userId, 'voice_call', `Manual call to ${phoneNumber}`);
        
        // Store voice message for TwiML endpoint
        await storage.storeCallMessage(callLog.id, {
          message: voiceMessage,
          voiceAgent: selectedAgent,
        });
        
        res.json({
          ...callLog,
          twilioCallSid: call.sid,
          voiceAgent: selectedAgent,
          message: "Real call initiated successfully via Twilio",
          status: 'initiated',
          callUrl: call.uri,
        });
        
      } catch (twilioError: any) {
        logger.error("Twilio API error:", twilioError);
        
        // Update call log with error
        await storage.updateCallLog(callLog.id, {
          status: 'failed',
          error: twilioError.message,
        });
        
        res.status(500).json({ 
          message: "Failed to initiate Twilio call",
          error: twilioError.message,
          code: twilioError.code || 'UNKNOWN'
        });
      }
      
    } catch (error) {
      logger.error("Error initiating call:", error);
      res.status(500).json({ message: "Failed to initiate call" });
    }
  });

  // TwiML endpoint for voice calls
  app.post('/api/calls/twiml/:callId', async (req: any, res) => {
    try {
      const { callId } = req.params;
      const callMessage = await storage.getCallMessage(callId);
      
      if (!callMessage) {
        res.type('text/xml').send(`
          <?xml version="1.0" encoding="UTF-8"?>
          <Response>
            <Say voice="alice">Hello, this is an automated call from ARAS AI. Thank you for your time.</Say>
          </Response>
        `);
        return;
      }
      
      const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">${callMessage.message}</Say>
  <Gather input="dtmf" numDigits="1" timeout="10" action="/api/calls/gather/${callId}" method="POST">
    <Say voice="alice">Press 1 to speak with a representative, or stay on the line.</Say>
  </Gather>
  <Say voice="alice">Thank you for your time. Goodbye.</Say>
</Response>`;
      
      res.type('text/xml').send(twiml);
    } catch (error) {
      logger.error("TwiML generation error:", error);
      res.type('text/xml').send(`
        <?xml version="1.0" encoding="UTF-8"?>
        <Response>
          <Say voice="alice">We're sorry, there was an error. Please try again later.</Say>
        </Response>
      `);
    }
  });

  // Handle user input during call
  app.post('/api/calls/gather/:callId', async (req: any, res) => {
    try {
      const { callId } = req.params;
      const { Digits } = req.body;
      
      if (Digits === '1') {
        res.type('text/xml').send(`
          <?xml version="1.0" encoding="UTF-8"?>
          <Response>
            <Say voice="alice">Please hold while we connect you to a representative.</Say>
            <Play>http://com.twilio.music.classical.s3.amazonaws.com/BusyStrings.wav</Play>
          </Response>
        `);
      } else {
        res.type('text/xml').send(`
          <?xml version="1.0" encoding="UTF-8"?>
          <Response>
            <Say voice="alice">Thank you for your interest. We'll follow up soon. Goodbye.</Say>
          </Response>
        `);
      }
      
      // Log the interaction
      await storage.logCallInteraction(callId, { 
        userInput: Digits, 
        response: Digits === '1' ? 'transfer_requested' : 'call_completed'
      });
      
    } catch (error) {
      logger.error("Call gather error:", error);
      res.type('text/xml').send(`
        <?xml version="1.0" encoding="UTF-8"?>
        <Response>
          <Say voice="alice">Thank you for calling. Goodbye.</Say>
        </Response>
      `);
    }
  });

  // Twilio status callback endpoint
  app.post('/api/calls/status/:callId', async (req: any, res) => {
    try {
      const { callId } = req.params;
      const { CallSid, CallStatus, CallDuration } = req.body;
      
      // Update call log with status from Twilio
      await storage.updateCallLog(parseInt(callId), {
        status: CallStatus.toLowerCase(),
        duration: parseInt(CallDuration) || 0,
      });
      
      logger.info('Call status updated', { callSid: CallSid, status: CallStatus, callId });
      res.sendStatus(200);
      
    } catch (error) {
      logger.error("Status callback error:", error);
      res.sendStatus(200); // Always respond 200 to Twilio
    }
  });

  // Legacy token routes removed - now using subscription system

  // Legacy subscription route (redirects to new Stripe endpoint)
  app.post('/api/create-subscription', requireAuth, async (req: any, res) => {
    try {
      const { planId } = req.body;
      
      if (!stripe) {
        return res.status(400).json({ message: "Stripe not configured" });
      }

      const userId = req.session.userId;
      const user = await storage.getUser(userId);

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Allow upgrade without payment method - they can add payment later if needed

      // Plan price mapping (in cents)
      const planPrices: { [key: string]: number } = {
        starter: 2900, // $29
        pro: 9900,     // $99
        enterprise: 29900 // $299
      };

      const price = planPrices[planId];
      if (!price) {
        return res.status(400).json({ message: "Invalid plan selected" });
      }

      // Create subscription
      const subscription = await stripe.subscriptions.create({
        customer: user.stripeCustomerId!,
        items: [{
          price_data: {
            currency: 'usd',
            product_data: {
              name: `ARAS AI ${planId.charAt(0).toUpperCase() + planId.slice(1)} Plan`
            },
            unit_amount: price,
            recurring: { interval: 'month' }
          } as any
        }],
        default_payment_method: user.stripePaymentMethodId || undefined,
        expand: ['latest_invoice.payment_intent'],
        metadata: { userId, planId }
      });

      // Update user subscription status
      const subscriptionEndDate = new Date();
      subscriptionEndDate.setMonth(subscriptionEndDate.getMonth() + 1);

      await storage.updateUserSubscription(userId, {
        plan: planId,
        status: 'active',
        stripeSubscriptionId: subscription.id,
        subscriptionEndDate: subscriptionEndDate.toISOString()
      });

      res.json({
        success: true,
        subscriptionId: subscription.id,
        plan: planId,
        status: subscription.status
      });

    } catch (error: any) {
      logger.error("Legacy subscription creation error:", error);
      res.status(500).json({ 
        message: "Failed to create subscription",
        error: error.message 
      });
    }
  });

  // Plan upgrade with payment method validation
  app.post('/api/upgrade-plan', requireAuth, async (req: any, res) => {
    try {
      const { planId } = req.body;
      const userId = req.session.userId;

      // Validate planId against allowed plans
      const allowedPlans = ['starter', 'pro', 'enterprise'];
      if (!planId || typeof planId !== 'string' || !allowedPlans.includes(planId)) {
        return res.status(400).json({ message: "Invalid plan selected" });
      }

      // Get user to check payment method status
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Get current subscription status  
      const currentSubscription = await storage.getSubscriptionStatus(userId);
      
      // If user is already active on the same plan, prevent "upgrade"
      if (currentSubscription.plan === planId && currentSubscription.status === 'active') {
        return res.status(400).json({ 
          message: `You're already subscribed to the ${planId} plan`,
          currentPlan: planId
        });
      }

      // For ALL paid plans (starter/pro/enterprise), require payment method
      if (!user.hasPaymentMethod || !user.stripePaymentMethodId) {
        return res.status(402).json({ 
          message: "Payment method required for paid plans",
          requiresPaymentSetup: true,
          redirectUrl: "/billing/payment-setup"
        });
      }

      // If we reach here, user has payment method and can upgrade to paid plan using Stripe
      if (!stripe) {
        return res.status(400).json({ message: "Stripe not configured" });
      }

      // Plan price mapping (in cents) - following Stripe documentation
      const planPrices = {
        starter: 2900, // $29
        pro: 9900,     // $99  
        enterprise: 29900 // $299
      };

      const price = planPrices[planId as keyof typeof planPrices];
      if (!price) {
        return res.status(400).json({ message: "Invalid plan configuration" });
      }

      // Create real Stripe subscription for trial conversion
      const subscription = await stripe.subscriptions.create({
        customer: user.stripeCustomerId!,
        items: [{
          price_data: {
            currency: 'usd',
            product_data: {
              name: `ARAS AI ${planId.charAt(0).toUpperCase() + planId.slice(1)} Plan`,
              description: `Monthly subscription to ARAS AI ${planId} plan`
            },
            unit_amount: price,
            recurring: { interval: 'month' }
          } as any
        }],
        default_payment_method: user.stripePaymentMethodId,
        expand: ['latest_invoice.payment_intent'],
        metadata: { userId, planId, source: 'trial_conversion' }
      });

      // SECURITY: Verify payment completion before activating subscription
      const latestInvoice = subscription.latest_invoice as any;
      const paymentIntent = latestInvoice?.payment_intent;
      
      // Check if payment requires additional action (3D Secure, etc.)
      if (paymentIntent && (paymentIntent.status === 'requires_action' || paymentIntent.status === 'requires_payment_method')) {
        logger.warn(`Payment requires action for user ${userId}`, {
          subscriptionId: subscription.id,
          paymentIntentStatus: paymentIntent.status
        });
        
        return res.status(402).json({
          success: false,
          requiresAction: true,
          clientSecret: paymentIntent.client_secret,
          subscriptionId: subscription.id,
          message: "Payment requires additional authentication"
        });
      }

      // Only activate if subscription is active and payment succeeded
      if (subscription.status !== 'active' && subscription.status !== 'trialing') {
        logger.error(`Subscription not active for user ${userId}`, {
          subscriptionId: subscription.id,
          subscriptionStatus: subscription.status,
          paymentIntentStatus: paymentIntent?.status
        });
        
        return res.status(402).json({
          success: false,
          message: "Payment failed. Please check your payment method.",
          subscriptionStatus: subscription.status
        });
      }

      // Use real Stripe billing period instead of manual calculation
      const subscriptionEndDate = new Date((subscription as any).current_period_end * 1000);

      await storage.updateUserSubscription(userId, {
        plan: planId,
        status: 'active',
        stripeSubscriptionId: subscription.id, // Real Stripe subscription ID
        subscriptionEndDate: subscriptionEndDate.toISOString()
      });

      // Reset trial usage for users converting from trial
      if (currentSubscription.subscriptionStatus === 'trial') {
        await storage.updateUserSubscriptionStatus(userId, 'active');
        logger.info(`User ${userId} converted from trial to paid ${planId} plan`, {
          subscriptionId: subscription.id,
          paymentStatus: 'succeeded'
        });
      }

      res.json({
        success: true,
        subscriptionId: subscription.id, // Real Stripe subscription ID
        plan: planId,
        status: subscription.status,
        currentPeriodEnd: subscriptionEndDate.toISOString(),
        message: `Successfully upgraded to ${planId} plan`
      });

    } catch (error: any) {
      logger.error("Plan upgrade error:", error);
      res.status(500).json({ 
        message: "Failed to upgrade plan",
        error: error.message 
      });
    }
  });

  // Token purchase route (temporarily disabled)
  app.post('/api/purchase-tokens', requireAuth, async (req: any, res) => {
    // TODO: Re-enable when Stripe keys are available
    res.status(501).json({ 
      message: "Payment system temporarily unavailable",
      clientSecret: "demo_client_secret"
    });
  });

  // Additional CRUD operations for leads
  app.put('/api/leads/:id', requireAuth, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const leadId = parseInt(req.params.id);
      const leadData = { ...req.body, userId };
      const lead = await storage.updateLead(leadId, leadData);
      res.json(lead);
    } catch (error) {
      logger.error("Error updating lead:", error);
      res.status(500).json({ message: "Failed to update lead" });
    }
  });

  app.delete('/api/leads/:id', requireAuth, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const leadId = parseInt(req.params.id);
      await storage.deleteLead(leadId, userId);
      res.json({ message: "Lead deleted successfully" });
    } catch (error) {
      logger.error("Error deleting lead:", error);
      res.status(500).json({ message: "Failed to delete lead" });
    }
  });

  // Campaign CRUD operations
  app.post('/api/campaigns', requireAuth, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const campaignData = { ...req.body, userId };
      const campaign = await storage.createCampaign(campaignData);
      res.json(campaign);
    } catch (error) {
      logger.error("Error creating campaign:", error);
      res.status(500).json({ message: "Failed to create campaign" });
    }
  });

  app.put('/api/campaigns/:id', requireAuth, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const campaignId = parseInt(req.params.id);
      const campaignData = { ...req.body, userId };
      const campaign = await storage.updateCampaign(campaignId, campaignData);
      res.json(campaign);
    } catch (error) {
      logger.error("Error updating campaign:", error);
      res.status(500).json({ message: "Failed to update campaign" });
    }
  });

  app.delete('/api/campaigns/:id', requireAuth, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const campaignId = parseInt(req.params.id);
      await storage.deleteCampaign(campaignId, userId);
      res.json({ message: "Campaign deleted successfully" });
    } catch (error) {
      logger.error("Error deleting campaign:", error);
      res.status(500).json({ message: "Failed to delete campaign" });
    }
  });

  // Analytics and reporting endpoints
  app.get('/api/analytics/dashboard', requireAuth, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const analytics = await storage.getDashboardAnalytics(userId);
      res.json(analytics);
    } catch (error) {
      logger.error("Error fetching analytics:", error);
      res.status(500).json({ message: "Failed to fetch analytics" });
    }
  });

  app.get('/api/analytics/performance', requireAuth, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const { period = '30d' } = req.query;
      const performance = await storage.getPerformanceAnalytics(userId, period as string);
      res.json(performance);
    } catch (error) {
      logger.error("Error fetching performance analytics:", error);
      res.status(500).json({ message: "Failed to fetch performance analytics" });
    }
  });

  // Token management endpoints
  app.get('/api/tokens/transactions', requireAuth, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const transactions = await storage.getUsageHistory(userId);
      res.json(transactions);
    } catch (error) {
      logger.error("Error fetching token transactions:", error);
      res.status(500).json({ message: "Failed to fetch token transactions" });
    }
  });

  app.post('/api/subscription/change-plan', requireAuth, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const { planId } = req.body;
      
      // TODO: Integrate with Stripe subscription management
      res.status(200).json({ 
        message: "Plan change coming soon. Please contact support.",
        planId 
      });
    } catch (error) {
      logger.error("Error changing subscription plan:", error);
      res.status(500).json({ message: "Failed to change plan" });
    }
  });

  // Bulk CSV upload for campaigns with AI voice preparation
  app.post('/api/campaigns/bulk-upload', requireAuth, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const { campaignName, voiceAgentId } = req.body;
      
      // Get voice agent for campaign
      const voiceAgents = await storage.getVoiceAgents();
      const selectedAgent = voiceAgents.find(agent => agent.id === parseInt(voiceAgentId));
      
      if (!selectedAgent) {
        return res.status(400).json({ message: "Invalid voice agent selected" });
      }
      
      // Create campaign
      const campaign = await storage.createCampaign({
        userId,
        name: campaignName,
        status: 'active',
      });
      
      // Pre-generate AI voice template for the campaign
      let campaignVoiceTemplate = null;
      if (process.env.OPENAI_API_KEY) {
        const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
        try {
          const templateMessage = `Hello, this is ${selectedAgent.name}. I'm calling from our sales team to discuss an exciting opportunity that might interest you.`;
          
          const speech = await openai.audio.speech.create({
            model: "tts-1",
            voice: selectedAgent.voice === 'professional' ? 'alloy' : 
                   selectedAgent.voice === 'friendly' ? 'nova' : 'echo',
            input: templateMessage,
          });
          
          const buffer = Buffer.from(await speech.arrayBuffer());
          campaignVoiceTemplate = buffer.toString('base64');
        } catch (aiError) {
          logger.error("AI voice template generation failed:", aiError);
        }
      }
      
      res.json({ 
        campaignId: campaign.id,
        campaignName: campaign.name,
        voiceAgent: selectedAgent,
        voiceTemplate: campaignVoiceTemplate,
        message: "Campaign created successfully with AI voice preparation" 
      });
    } catch (error) {
      logger.error("Error creating bulk campaign:", error);
      res.status(500).json({ message: "Failed to create campaign" });
    }
  });

  // Bulk operations for campaigns
  app.post('/api/campaigns/:id/bulk-call', requireAuth, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const campaignId = parseInt(req.params.id);
      const { leadIds, voiceAgentId, message } = req.body;
      
      // Process bulk calls
      const results = [];
      for (const leadId of leadIds) {
        const callLog = await storage.createCallLog({
          userId,
          leadId,
          voiceAgentId,
          status: 'queued',
        });
        results.push(callLog);
      }
      
      res.json({ message: "Bulk call initiated", results });
    } catch (error) {
      logger.error("Error initiating bulk call:", error);
      res.status(500).json({ message: "Failed to initiate bulk call" });
    }
  });

  // User profile management
  app.put('/api/user/profile', requireAuth, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const profileData = req.body;
      const user = await storage.updateUserProfile(userId, profileData);
      res.json(sanitizeUser(user));
    } catch (error) {
      logger.error("Error updating profile:", error);
      res.status(500).json({ message: "Failed to update profile" });
    }
  });

  // Settings management
  app.get('/api/user/settings', requireAuth, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const settings = await storage.getUserSettings(userId);
      res.json(settings);
    } catch (error) {
      logger.error("Error fetching settings:", error);
      res.status(500).json({ message: "Failed to fetch settings" });
    }
  });

  app.put('/api/user/settings', requireAuth, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const settings = req.body;
      const updatedSettings = await storage.updateUserSettings(userId, settings);
      res.json(updatedSettings);
    } catch (error) {
      logger.error("Error updating settings:", error);
      res.status(500).json({ message: "Failed to update settings" });
    }
  });

  // Lead import/export
  app.post('/api/leads/import', requireAuth, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const { csvData } = req.body;
      const importedLeads = await storage.importLeads(userId, csvData);
      res.json({ message: "Leads imported successfully", count: importedLeads.length });
    } catch (error) {
      logger.error("Error importing leads:", error);
      res.status(500).json({ message: "Failed to import leads" });
    }
  });

  app.get('/api/leads/export', requireAuth, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const leads = await storage.getLeads(userId);
      // Convert to CSV format
      const csv = await storage.exportLeadsToCSV(leads);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=leads.csv');
      res.send(csv);
    } catch (error) {
      logger.error("Error exporting leads:", error);
      res.status(500).json({ message: "Failed to export leads" });
    }
  });

  // Webhook for successful payments
  app.post('/api/webhook/payment-success', async (req, res) => {
    const { userId, tokenCount } = req.body;
    
    // Subscription-based system no longer uses token purchases
    if (userId) {
      logger.info("Token purchase webhook ignored - now using subscription model", { userId });
    }
    
    res.json({ received: true });
  });

  // Profile management endpoints
  app.put("/api/user/profile", requireAuth, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const { username, email, firstName, lastName } = req.body;
      const updatedUser = await storage.updateUserProfile(userId, { 
        username, 
        email, 
        firstName, 
        lastName 
      });
      res.json(updatedUser);
    } catch (error) {
      logger.error("Error updating profile:", error);
      res.status(500).json({ message: "Failed to update profile" });
    }
  });

  // Application settings endpoints
  app.put("/api/user/settings", requireAuth, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const settings = req.body;
      await storage.updateUserSettings(userId, settings);
      res.json({ success: true });
    } catch (error) {
      logger.error("Error updating settings:", error);
      res.status(500).json({ message: "Failed to update settings" });
    }
  });

  app.get("/api/user/settings", requireAuth, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const settings = await storage.getUserSettings(userId);
      res.json(settings);
    } catch (error) {
      logger.error("Error fetching settings:", error);
      res.status(500).json({ message: "Failed to fetch settings" });
    }
  });

  // Settings routes
  app.get("/api/settings/twilio", async (req: any, res) => {
    try {
      if (!req.session?.userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const settings = await storage.getTwilioSettings(req.session.userId);
      
      if (settings) {
        // Don't expose sensitive data
        res.json({
          configured: settings.configured,
          accountSid: settings.accountSid ? `${settings.accountSid.substring(0, 8)}...` : undefined,
          phoneNumber: settings.phoneNumber,
        });
      } else {
        res.json({ configured: false });
      }
    } catch (error) {
      logger.error("Error fetching Twilio settings:", error);
      res.status(500).json({ message: "Failed to fetch Twilio settings" });
    }
  });

  app.post("/api/settings/twilio", async (req: any, res) => {
    try {
      if (!req.session?.userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const { accountSid, authToken, phoneNumber } = req.body;

      if (!accountSid || !authToken || !phoneNumber) {
        return res.status(400).json({ message: "Missing required Twilio credentials" });
      }

      // Validate Twilio credentials format
      if (!accountSid.startsWith('AC') || accountSid.length !== 34) {
        return res.status(400).json({ message: "Invalid Account SID format. Must start with 'AC' and be 34 characters long." });
      }

      if (authToken.length !== 32) {
        return res.status(400).json({ message: "Invalid Auth Token format. Must be 32 characters long." });
      }

      // Validate phone number format (E.164)
      const phoneRegex = /^\+[1-9]\d{1,14}$/;
      if (!phoneRegex.test(phoneNumber)) {
        return res.status(400).json({ message: "Invalid phone number format. Must be in E.164 format (e.g., +1234567890)." });
      }

      // Test Twilio credentials by attempting to initialize client
      try {
        const twilioClient = twilio(accountSid, authToken);
        
        // Verify credentials by fetching account info
        const account = await twilioClient.api.accounts(accountSid).fetch();
        
        if (account.status !== 'active') {
          return res.status(400).json({ message: "Twilio account is not active. Please check your account status." });
        }

        // Verify the phone number belongs to this account
        try {
          const incomingPhoneNumber = await twilioClient.incomingPhoneNumbers.list({
            phoneNumber: phoneNumber,
            limit: 1
          });
          
          if (incomingPhoneNumber.length === 0) {
            return res.status(400).json({ message: "Phone number not found in your Twilio account. Please verify the number." });
          }
        } catch (phoneError) {
          return res.status(400).json({ message: "Unable to verify phone number. Please check if it belongs to your Twilio account." });
        }

      } catch (twilioError: any) {
        logger.error("Twilio credential validation failed:", twilioError);
        return res.status(400).json({ 
          message: "Invalid Twilio credentials. Please check your Account SID and Auth Token.",
          details: twilioError.message || "Authentication failed"
        });
      }

      // Save validated credentials
      await storage.saveTwilioSettings(req.session.userId, {
        accountSid,
        authToken,
        phoneNumber,
      });

      res.json({ 
        success: true,
        message: "Twilio credentials validated and saved successfully" 
      });
      
    } catch (error) {
      logger.error("Error saving Twilio settings:", error);
      res.status(500).json({ message: "Failed to save Twilio settings" });
    }
  });

  app.delete("/api/settings/twilio", async (req: any, res) => {
    try {
      if (!req.session?.userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      await storage.deleteTwilioSettings(req.session.userId);
      res.json({ success: true, message: "Twilio configuration removed successfully" });
    } catch (error) {
      logger.error("Error deleting Twilio settings:", error);
      res.status(500).json({ message: "Failed to delete Twilio settings" });
    }
  });

  // Translation endpoint for existing messages
  app.post('/api/chat/translate', requireAuth, async (req: any, res) => {
    try {
      const { messages, targetLanguage } = req.body;
      
      if (!messages || !Array.isArray(messages) || !targetLanguage) {
        return res.status(400).json({ message: "Messages array and target language required" });
      }

      const languageNames = {
        'en': 'English',
        'es': 'Spanish', 
        'fr': 'French',
        'de': 'German',
        'pt': 'Portuguese',
        'it': 'Italian',
        'ru': 'Russian',
        'zh': 'Chinese',
        'ja': 'Japanese',
        'ar': 'Arabic'
      };

      const targetLanguageName = languageNames[targetLanguage as keyof typeof languageNames];
      
      if (!targetLanguageName) {
        return res.status(400).json({ message: "Unsupported language" });
      }

      const openai = new OpenAI({ 
        apiKey: process.env.OPENAI_API_KEY 
      });

      // Translate messages in batch for efficiency
      const messagesToTranslate = messages.map((msg: any) => 
        `${msg.isAi ? 'AI' : 'User'}: ${msg.message}`
      ).join('\n\n');

      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { 
            role: "system", 
            content: `Translate the following chat conversation to ${targetLanguageName}. Maintain the format "AI: message" and "User: message" for each line. Keep the meaning and tone exactly the same. Do not add explanations or extra text.`
          },
          { role: "user", content: messagesToTranslate }
        ],
        max_tokens: 4000,
        temperature: 0.3
      });

      const translatedText = completion.choices[0]?.message?.content || "";
      
      // Parse the translated text back into individual messages
      const translatedLines = translatedText.split('\n\n');
      const translatedMessages = messages.map((originalMsg: any, index: number) => {
        const translatedLine = translatedLines[index] || `${originalMsg.isAi ? 'AI' : 'User'}: ${originalMsg.message}`;
        const translatedContent = translatedLine.replace(/^(AI|User): /, '');
        
        return {
          ...originalMsg,
          message: translatedContent || originalMsg.message
        };
      });

      res.json({ translatedMessages });
    } catch (error) {
      logger.error('Translation error:', error);
      res.status(500).json({ message: 'Translation failed' });
    }
  });

  // Enhanced Stripe routes for subscription management with trial

  // Payment setup intent for card collection before trial
  app.post('/api/stripe/setup-payment-method', requireAuth, async (req: any, res) => {
    try {
      if (!stripe) {
        return res.status(400).json({ message: "Stripe not configured" });
      }

      const userId = req.session.userId;
      const user = await storage.getUser(userId);

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Create or get Stripe customer
      let customerId = user.stripeCustomerId;
      if (!customerId) {
        const customer = await stripe.customers.create({
          email: user.email || undefined,
          metadata: { userId }
        });
        customerId = customer.id;
        await storage.updateUserStripeInfo(userId, { customerId, subscriptionId: '' });
      }

      // Create setup intent for card collection
      const setupIntent = await stripe.setupIntents.create({
        customer: customerId,
        payment_method_types: ['card'],
        usage: 'off_session'
      });

      res.json({
        clientSecret: setupIntent.client_secret,
        setupIntentId: setupIntent.id,
        needsCardSetup: true
      });

    } catch (error: any) {
      logger.error("Error creating setup intent:", error);
      res.status(500).json({ 
        message: "Failed to create payment setup",
        error: error.message 
      });
    }
  });


  // Start trial with payment method verification
  app.post('/api/stripe/start-trial', requireAuth, async (req: any, res) => {
    try {
      if (!stripe) {
        return res.status(400).json({ message: "Stripe not configured" });
      }

      const { setupIntentId } = req.body;
      const userId = req.session.userId;

      // Verify setup intent was successful
      const setupIntent = await stripe.setupIntents.retrieve(setupIntentId);
      
      if (setupIntent.status !== 'succeeded') {
        return res.status(400).json({ message: "Payment method setup not completed" });
      }

      // Verify setup intent belongs to user's customer
      const user = await storage.getUser(userId);
      if (!user?.stripeCustomerId || setupIntent.customer !== user.stripeCustomerId) {
        return res.status(400).json({ message: "Invalid payment setup" });
      }

      // Attach payment method to customer as default
      if (setupIntent.payment_method) {
        await stripe.paymentMethods.attach(setupIntent.payment_method as string, {
          customer: user.stripeCustomerId,
        });
        await stripe.customers.update(user.stripeCustomerId, {
          invoice_settings: {
            default_payment_method: setupIntent.payment_method as string,
          },
        });
      }

      // Store payment method and start trial
      const trialEndDate = new Date();
      trialEndDate.setDate(trialEndDate.getDate() + 7); // 7-day trial

      await storage.startUserTrial(userId, {
        paymentMethodId: setupIntent.payment_method as string,
        trialEndDate: trialEndDate.toISOString(),
        hasPaymentMethod: true
      });

      // Update subscription status to trialing
      await storage.updateUserSubscriptionStatus(userId, 'trialing');

      res.json({
        success: true,
        trialEndDate: trialEndDate.toISOString(),
        message: "Trial started successfully"
      });

    } catch (error: any) {
      logger.error("Error starting trial:", error);
      res.status(500).json({ 
        message: "Failed to start trial",
        error: error.message 
      });
    }
  });

  // Enhanced subscription status with trial information
  app.get('/api/subscription/status', requireAuth, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const subscription = await storage.getSubscriptionStatus(userId);
      const plan = await storage.getSubscriptionPlan(subscription.subscriptionPlan);

      // Check trial status
      const now = new Date();
      const isTrialActive = user.trialEndDate && new Date(user.trialEndDate) > now;
      const requiresPaymentSetup = !user.hasPaymentMethod;

      res.json({
        plan: subscription.subscriptionPlan,
        status: subscription.subscriptionStatus,
        aiMessagesUsed: subscription.aiMessagesUsed,
        voiceCallsUsed: subscription.voiceCallsUsed,
        aiMessagesLimit: plan?.aiMessagesLimit || null,
        voiceCallsLimit: plan?.voiceCallsLimit || null,
        renewalDate: subscription.subscriptionEndDate,
        trialMessagesUsed: user.trialMessagesUsed || 0,
        trialEndDate: user.trialEndDate,
        hasPaymentMethod: user.hasPaymentMethod || false,
        requiresPaymentSetup,
        isTrialActive: isTrialActive || false,
        canUpgrade: true
      });

    } catch (error: any) {
      logger.error("Error fetching subscription status:", error);
      res.status(500).json({ message: "Failed to fetch subscription status" });
    }
  });

  // Create subscription for plan upgrade
  app.post('/api/stripe/create-subscription', requireAuth, async (req: any, res) => {
    try {
      if (!stripe) {
        return res.status(400).json({ message: "Stripe not configured" });
      }

      const { planId } = req.body;
      const userId = req.session.userId;
      const user = await storage.getUser(userId);

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      if (!user.hasPaymentMethod) {
        return res.status(400).json({ message: "Payment method required before upgrade" });
      }

      // Plan price mapping (in cents)
      const planPrices = {
        starter: 2900, // $29
        pro: 9900,     // $99
        enterprise: 29900 // $299
      };

      const price = planPrices[planId as keyof typeof planPrices];
      if (!price) {
        return res.status(400).json({ message: "Invalid plan selected" });
      }

      // Create subscription
      const subscription = await stripe.subscriptions.create({
        customer: user.stripeCustomerId!,
        items: [{
          price_data: {
            currency: 'usd',
            product_data: {
              name: `ARAS AI ${planId.charAt(0).toUpperCase() + planId.slice(1)} Plan`
            },
            unit_amount: price,
            recurring: { interval: 'month' }
          } as any
        }],
        default_payment_method: user.stripePaymentMethodId || undefined,
        expand: ['latest_invoice.payment_intent'],
        metadata: { userId, planId }
      });

      // Update user subscription status
      const subscriptionEndDate = new Date();
      subscriptionEndDate.setMonth(subscriptionEndDate.getMonth() + 1);

      await storage.updateUserSubscription(userId, {
        plan: planId,
        status: 'active',
        stripeSubscriptionId: subscription.id,
        subscriptionEndDate: subscriptionEndDate.toISOString()
      });

      res.json({
        success: true,
        subscriptionId: subscription.id,
        plan: planId,
        status: subscription.status
      });

    } catch (error: any) {
      logger.error("Error creating subscription:", error);
      res.status(500).json({ 
        message: "Failed to create subscription",
        error: error.message 
      });
    }
  });

  // Stripe checkout session creation
  app.post('/api/stripe/create-checkout-session', requireAuth, async (req: any, res) => {
    try {
      if (!stripe) {
        return res.status(400).json({ 
          message: "Payment processing is currently unavailable. Please contact support to enable Stripe integration." 
        });
      }

      const userId = req.session.userId;
      const { planId } = req.body;

      // Get plan details
      const planPrices = {
        starter: { amount: 2900, name: 'Starter Plan' }, // $29.00
        professional: { amount: 9900, name: 'Professional Plan' }, // $99.00  
        enterprise: { amount: 29900, name: 'Enterprise Plan' } // $299.00
      };

      const planConfig = planPrices[planId as keyof typeof planPrices];
      if (!planConfig) {
        return res.status(400).json({ message: "Invalid plan selected" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Create Stripe customer if not exists
      let customerId = user.stripeCustomerId;
      if (!customerId) {
        const customer = await stripe.customers.create({
          email: user.email || `${user.username}@aras.ai`,
          name: user.username,
          metadata: {
            userId: user.id
          }
        });
        customerId = customer.id;
        
        // Update user with Stripe customer ID
        await storage.updateUserStripeInfo(user.id, { customerId, subscriptionId: '' });
      }

      // Create checkout session
      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        payment_method_types: ['card'],
        line_items: [{
          price_data: {
            currency: 'usd',
            product_data: {
              name: planConfig.name,
              description: `ARAS AI ${planConfig.name} - Monthly Subscription`,
            },
            unit_amount: planConfig.amount,
            recurring: {
              interval: 'month',
            },
          },
          quantity: 1,
        }],
        mode: 'subscription',
        success_url: `${req.headers.origin}/checkout-success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${req.headers.origin}/billing?canceled=true`,
        metadata: {
          userId: user.id,
          planId: planId,
        },
      });

      res.json({ 
        checkoutUrl: session.url,
        sessionId: session.id 
      });
      
    } catch (error: any) {
      logger.error("Error creating checkout session:", error);
      res.status(500).json({ 
        message: "Failed to create checkout session",
        error: error.message 
      });
    }
  });

  // Verify Stripe checkout session
  app.post('/api/stripe/verify-session', requireAuth, async (req: any, res) => {
    try {
      if (!stripe) {
        return res.status(400).json({ message: "Stripe not configured" });
      }

      const { sessionId } = req.body;
      
      const session = await stripe.checkout.sessions.retrieve(sessionId, {
        expand: ['subscription']
      });

      if (session.payment_status === 'paid' && session.subscription) {
        const subscription = session.subscription as any;
        const userId = session.metadata?.userId;
        const planId = session.metadata?.planId;

        if (userId && planId) {
          // Update user subscription in storage
          await storage.updateUserSubscription(userId, {
            plan: planId,
            status: 'active',
            stripeCustomerId: session.customer as string,
            stripeSubscriptionId: subscription.id,
            currentPeriodEnd: subscription.current_period_end
          });

          res.json({ 
            success: true,
            subscription: {
              id: subscription.id,
              status: subscription.status,
              plan: planId
            }
          });
        } else {
          res.status(400).json({ message: "Missing session metadata" });
        }
      } else {
        res.status(400).json({ message: "Payment not completed" });
      }
      
    } catch (error: any) {
      logger.error("Error verifying checkout session:", error);
      res.status(500).json({ 
        message: "Failed to verify session",
        error: error.message 
      });
    }
  });

  // Stripe webhook endpoint for subscription updates
  app.post('/api/stripe/webhook', async (req, res) => {
    try {
      if (!stripe) {
        return res.status(400).json({ message: "Stripe not configured" });
      }

      const sig = req.headers['stripe-signature'];
      const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

      let event;
      
      if (webhookSecret) {
        try {
          event = stripe.webhooks.constructEvent(req.body, sig as string, webhookSecret);
        } catch (err: any) {
          logger.error('Webhook signature verification failed:', err.message);
          return res.status(400).send(`Webhook Error: ${err.message}`);
        }
      } else {
        event = req.body;
      }

      // Handle the event
      switch (event.type) {
        case 'customer.subscription.updated':
        case 'customer.subscription.deleted':
          const subscription = event.data.object;
          const customerId = subscription.customer;
          
          // Find user by Stripe customer ID
          const users = await storage.getAllSubscriptionPlans(); // This needs to be implemented to find user
          // For now, log the event
          logger.info(`Subscription ${event.type}:`, { 
            subscriptionId: subscription.id,
            customerId: customerId,
            status: subscription.status 
          });
          break;
          
        case 'invoice.payment_succeeded':
          const invoice = event.data.object;
          logger.info('Payment succeeded:', { 
            invoiceId: invoice.id,
            customerId: invoice.customer 
          });
          break;
          
        case 'invoice.payment_failed':
          const failedInvoice = event.data.object;
          logger.error('Payment failed:', { 
            invoiceId: failedInvoice.id,
            customerId: failedInvoice.customer 
          });
          break;
          
        default:
          logger.info(`Unhandled event type ${event.type}`);
      }

      res.json({ received: true });
      
    } catch (error: any) {
      logger.error("Webhook error:", error);
      res.status(500).json({ message: "Webhook processing failed" });
    }
  });


  // Performance monitoring endpoints
  app.get('/api/admin/performance', requireAuth, async (req: any, res) => {
    try {
      const monitor = PerformanceMonitor.getInstance();
      const stats = monitor.getStats();
      const memoryUsage = monitor.getMemoryUsage();
      const dbHealth = await monitor.checkDatabaseHealth();
      
      res.json({
        performance: stats,
        memory: memoryUsage,
        database: dbHealth,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Error fetching performance stats:', error);
      res.status(500).json({ message: 'Failed to fetch performance data' });
    }
  });

  // Setup ARAS AI chat route - Mount after all session routes to avoid conflicts
  app.use("/api", chatRouter);

  const httpServer = createServer(app);
  return httpServer;
}
