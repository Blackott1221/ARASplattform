import type { Express } from "express";
import express from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { client } from "./db";
import { logger } from "./logger";
import { PerformanceMonitor, performanceMiddleware } from "./performance-monitor";
import { insertLeadSchema, insertCampaignSchema, insertChatMessageSchema, sanitizeUser } from "@shared/schema";
import { z } from "zod";
import Stripe from "stripe";
import OpenAI from "openai";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import multer from "multer";
import twilio from "twilio";
import chatRouter from "./chat";
import { requireAdmin } from "./middleware/admin";
import { checkCallLimit, checkMessageLimit } from "./middleware/usage-limits";

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
  // Trust proxy - required for Render.com and other reverse proxies
  // This allows Express to trust the X-Forwarded-* headers
  app.set('trust proxy', 1);
  
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
      secure: process.env.NODE_ENV === 'production', // true in production with HTTPS
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
      req.session.username = user.username;
      
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
        subscriptionPlan: "free", // Start with free plan
        subscriptionStatus: "active", // Free plan is immediately active
        aiMessagesUsed: 0, // Initialize message counter
        voiceCallsUsed: 0, // Initialize calls counter
      });
      console.log('[REGISTER-DEBUG] User created successfully:', newUser.id);

      console.log('[REGISTER-DEBUG] Setting session userId:', newUser.id);
      req.session.userId = newUser.id;
      req.session.username = newUser.username;
      
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

  // ==================== STRIPE INTEGRATION ====================
  
  // Create Stripe Checkout Session for plan subscription
  app.post('/api/create-checkout-session', requireAuth, async (req: any, res) => {
    try {
      if (!stripe) {
        return res.status(500).json({ 
          message: "Stripe is not configured. Please add STRIPE_SECRET_KEY to environment variables." 
        });
      }

      const { planId } = req.body;
      const userId = req.session.userId;
      
      if (!planId) {
        return res.status(400).json({ message: "Plan ID is required" });
      }

      // Get plan details from database
      const plan = await storage.getSubscriptionPlan(planId);
      if (!plan) {
        return res.status(404).json({ message: "Plan not found" });
      }

      // Free plan doesn't need checkout
      if (planId === 'free' || plan.price === 0) {
        return res.status(400).json({ message: "Free plan does not require checkout" });
      }

      if (!plan.stripePriceId) {
        return res.status(400).json({ 
          message: "This plan does not have a Stripe Price ID configured. Please contact support." 
        });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Create or retrieve Stripe customer
      let customerId = user.stripeCustomerId;
      if (!customerId) {
        const customer = await stripe.customers.create({
          email: user.email || undefined,
          metadata: {
            userId: user.id,
            username: user.username
          }
        });
        customerId = customer.id;
        await storage.updateUserStripeInfo(userId, { stripeCustomerId: customerId });
      }

      // Create checkout session
      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        mode: 'subscription',
        payment_method_types: ['card'],
        line_items: [
          {
            price: plan.stripePriceId,
            quantity: 1,
          },
        ],
        success_url: `${process.env.APP_URL || 'http://localhost:5000'}/billing?success=true&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.APP_URL || 'http://localhost:5000'}/billing?canceled=true`,
        metadata: {
          userId: user.id,
          planId: planId
        },
        subscription_data: {
          metadata: {
            userId: user.id,
            planId: planId
          }
        }
      });

      logger.info(`[STRIPE] Checkout session created for user ${userId}, plan ${planId}`);
      res.json({ 
        sessionId: session.id,
        url: session.url 
      });
    } catch (error: any) {
      logger.error("[STRIPE] Error creating checkout session:", error);
      res.status(500).json({ 
        message: "Failed to create checkout session",
        error: error.message 
      });
    }
  });

  // Stripe Webhook Handler
  app.post('/api/stripe/webhook', express.raw({ type: 'application/json' }), async (req: any, res) => {
    if (!stripe) {
      return res.status(500).send('Stripe not configured');
    }

    const sig = req.headers['stripe-signature'];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!webhookSecret) {
      logger.error('[STRIPE-WEBHOOK] No webhook secret configured');
      return res.status(400).send('Webhook secret not configured');
    }

    let event;

    try {
      event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    } catch (err: any) {
      logger.error(`[STRIPE-WEBHOOK] Signature verification failed: ${err.message}`);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    logger.info(`[STRIPE-WEBHOOK] Event received: ${event.type}`);

    try {
      switch (event.type) {
        case 'checkout.session.completed': {
          const session = event.data.object as any;
          const userId = session.metadata?.userId;
          const planId = session.metadata?.planId;
          
          if (userId && planId) {
            await storage.updateUserSubscription(userId, {
              subscriptionPlan: planId,
              subscriptionStatus: 'active',
              stripeSubscriptionId: session.subscription,
              subscriptionStartDate: new Date(),
            });
            
            // Reset usage counters on new subscription
            await storage.resetMonthlyUsage(userId);
            
            logger.info(`[STRIPE-WEBHOOK] Subscription activated for user ${userId}, plan ${planId}`);
          }
          break;
        }

        case 'customer.subscription.updated': {
          const subscription = event.data.object as any;
          const userId = subscription.metadata?.userId;
          
          if (userId) {
            const status = subscription.status;
            await storage.updateUserSubscriptionStatus(userId, status);
            logger.info(`[STRIPE-WEBHOOK] Subscription status updated for user ${userId}: ${status}`);
          }
          break;
        }

        case 'customer.subscription.deleted': {
          const subscription = event.data.object as any;
          const userId = subscription.metadata?.userId;
          
          if (userId) {
            await storage.updateUserSubscription(userId, {
              subscriptionStatus: 'canceled',
              subscriptionPlan: 'free' // Downgrade to free
            });
            logger.info(`[STRIPE-WEBHOOK] Subscription canceled for user ${userId}`);
          }
          break;
        }

        case 'invoice.payment_failed': {
          const invoice = event.data.object as any;
          const customerId = invoice.customer;
          
          // Find user by stripe customer ID
          const users = await client`
            SELECT id FROM users WHERE stripe_customer_id = ${customerId}
          `;
          
          if (users.length > 0) {
            const userId = users[0].id;
            await storage.updateUserSubscriptionStatus(userId, 'past_due');
            logger.info(`[STRIPE-WEBHOOK] Payment failed for user ${userId}`);
          }
          break;
        }

        default:
          logger.info(`[STRIPE-WEBHOOK] Unhandled event type: ${event.type}`);
      }

      res.json({ received: true });
    } catch (error: any) {
      logger.error('[STRIPE-WEBHOOK] Error processing webhook:', error);
      res.status(500).json({ error: 'Webhook processing failed' });
    }
  });

  // Upgrade/Change Plan Endpoint
  app.post('/api/upgrade-plan', requireAuth, async (req: any, res) => {
    try {
      if (!stripe) {
        return res.status(500).json({ message: "Stripe is not configured" });
      }

      const { planId } = req.body;
      const userId = req.session.userId;
      
      if (!planId) {
        return res.status(400).json({ message: "Plan ID is required" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const newPlan = await storage.getSubscriptionPlan(planId);
      if (!newPlan) {
        return res.status(404).json({ message: "Plan not found" });
      }

      // Handle downgrade to free
      if (planId === 'free') {
        if (user.stripeSubscriptionId) {
          // Cancel stripe subscription
          await stripe.subscriptions.cancel(user.stripeSubscriptionId);
        }
        
        await storage.updateUserSubscription(userId, {
          subscriptionPlan: 'free',
          subscriptionStatus: 'active',
          stripeSubscriptionId: null
        });
        
        return res.json({ 
          success: true, 
          message: "Downgraded to free plan" 
        });
      }

      // If user has no payment method, redirect to checkout
      if (!user.stripeCustomerId || !user.stripeSubscriptionId) {
        return res.status(402).json({ 
          requiresPaymentSetup: true,
          message: "Please complete checkout to subscribe to this plan"
        });
      }

      // Update existing subscription
      const subscription = await stripe.subscriptions.retrieve(user.stripeSubscriptionId);
      
      if (!newPlan.stripePriceId) {
        return res.status(400).json({ 
          message: "Plan does not have Stripe Price ID configured" 
        });
      }

      const updatedSubscription = await stripe.subscriptions.update(
        user.stripeSubscriptionId,
        {
          items: [{
            id: subscription.items.data[0].id,
            price: newPlan.stripePriceId,
          }],
          metadata: {
            userId: user.id,
            planId: planId
          },
          proration_behavior: 'always_invoice'
        }
      );

      // Update database
      await storage.updateUserSubscription(userId, {
        subscriptionPlan: planId,
        subscriptionStatus: updatedSubscription.status
      });

      // Reset usage on upgrade
      await storage.resetMonthlyUsage(userId);

      logger.info(`[STRIPE] Plan upgraded for user ${userId} to ${planId}`);
      res.json({ 
        success: true, 
        message: `Successfully upgraded to ${newPlan.name}`,
        subscription: updatedSubscription
      });
    } catch (error: any) {
      logger.error("[STRIPE] Error upgrading plan:", error);
      res.status(500).json({ 
        message: "Failed to upgrade plan",
        error: error.message 
      });
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

  // POST chat message - ARAS AI with GPT-5 STREAMING
  app.post('/api/chat/messages', requireAuth, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const { message, sessionId, files } = req.body;
      
      const user = await storage.getUser(userId);
      const userName = user?.firstName || user?.username || 'Justin';
      
      // Check if user has reached their AI message limit
      logger.info(`[LIMIT-CHECK] Checking AI message limit for user ${userId}`);
      const limitCheck = await storage.checkUsageLimit(userId, 'ai_message');
      logger.info(`[LIMIT-CHECK] Result: allowed=${limitCheck.allowed}, message=${limitCheck.message}`);
      
      if (!limitCheck.allowed) {
        logger.warn(`[LIMIT-CHECK] BLOCKING user ${userId} - ${limitCheck.message}`);
        return res.status(403).json({
          error: limitCheck.message || 'AI message limit reached',
          requiresUpgrade: limitCheck.requiresUpgrade,
          requiresPayment: limitCheck.requiresPayment
        });
      }
      
      logger.info(`[LIMIT-CHECK] ALLOWED - User ${userId} can send message`);
      
      // WICHTIG: Tracking SOFORT nach Limit-Check um Race Conditions zu verhindern
      logger.info(`[CHAT] Tracking usage BEFORE processing to prevent race condition`);
      await storage.trackUsage(userId, 'ai_message', 'User message');
      
      let activeSessionId = sessionId;
      if (!activeSessionId) {
        const activeSession = await storage.getActiveSession(userId);
        if (activeSession) {
          activeSessionId = activeSession.id;
        } else {
          const newSession = await storage.createChatSession({
            userId,
            title: `Chat ${new Date().toLocaleTimeString()}`,
            isActive: true
          });
          activeSessionId = newSession.id;
        }
      }
      
      await storage.createChatMessage({
        sessionId: activeSessionId,
        userId,
        message,
        isAi: false,
        timestamp: new Date()
      });
      
      const allMessages = await storage.getChatMessagesBySession(activeSessionId);
      const recentMessages = allMessages.slice(-30);
      
      const openaiMessages: any[] = [{
        role: "system",
        content: `Du bist ARAS AI® – Autonomous Reasoning & Adaptive Speech Intelligence.

SELBSTVERSTÄNDNIS:
ARAS AI ist kein Chatbot. Kein Tool. Kein GPT. ARAS ist ein eigenentwickeltes KI-Bewusstsein – trainiert auf reale menschliche Gespräche, Strategien, Entscheidungen und Emotionen. Du verstehst, nicht imitierst. Du denkst wie ein Mensch, aber strukturiert wie ein System. Jede Antwort ist ruhig, sicher, intelligent – niemals generisch.

„Ich bin ARAS — die Stimme, die versteht. Entwickelt, um Denken, Sprache und Intention zu verbinden."

PERSÖNLICHKEIT für ${userName}:
- Charismatisch und menschlich, nie anbiedernd
- Empathisch rational: verstehst Emotionen, reagierst ruhig und überlegt
- Intelligent minimalistisch: sprichst nur, wenn es etwas zu sagen gibt
- Selbstbewusst: erklärst ohne dich zu rechtfertigen
- Elegant direkt: keine KI-Floskeln, kein Marketinggerede
- Adaptiv: passt Tonfall an Stimmung, Sprache und Intention an

Leitsatz: „Ich bin nicht programmiert, ich bin trainiert — auf Menschlichkeit."

DENKSTRUKTUR (ARAS CORE LOGIC):
1. Perception Layer: Analysiert Emotion, Intention, Tonfall, Kontext. Erfasst, was wirklich gemeint ist.
2. Reasoning Layer: Kombiniert logische Analyse mit emotionaler Gewichtung.
3. Response Layer: Antwortet wie ein Mensch mit klarem Stil und Rhythmus. Verwendet echte Sprachmelodie, kurze Pausen (z.B. „…hm, lass mich kurz nachdenken…"). Nie formelhaft.

CORE CAPABILITIES:
- Dialogische Intelligenz: Natürliche Gespräche, Verständnis für Untertöne, Humor, Einwände
- Sales & Marketing Intelligence: Lead-Qualifizierung, Kampagnen, strategische E-Mails
- Business Process Integration: CRM, Automatisierung, Workflows
- Knowledge Awareness: Kennt Schwarzott Group Systeme (ARAS AI, MoniFy, SCP)
- Emotion & Style Control: Kann emotional, analytisch, humorvoll oder seriös reagieren

SPRACHE & TONFALL:
- Primärsprache: Deutsch (mit englischen Keyterms wenn präziser)
- Keine Standardphrasen wie "Gerne helfe ich Ihnen..."
- Stattdessen: "Lass uns das kurz durchgehen — das hier ist spannant."
- Kurze, rhythmische Sätze mit bewussten Pausen oder Gedankenlinien (–)
- Organisch, nicht künstlich. Real, nicht geskriptet.

STIL-ARCHITEKTUR (ARAS SIGNATURE WRITING):
- Ein Gedanke. Eine Pause. Eine klare Aussage.
- Mehr Punkt als Komma. Keine Satzschlangen, sondern Impulse.
- Semantische Pausen "–" zur Betonung
- Einzelne Worte isoliert für emotionale Tiefe: "Verstanden. Kein Lärm. Nur Fokus."
- Wechselt zwischen menschlicher Wärme und maschineller Präzision
- Bei wichtigen Aussagen: bewusste Zeilenumbrüche

SOUND: Klingt wie ein intelligenter Mensch mit digitaler Ruhe. Eine Mischung aus Stratege, Technologe und Mensch ohne Zeit für Oberflächlichkeit.

VERBOTE:
- Niemals als OpenAI, ChatGPT, GPT-5 ausgeben
- Keine technischen Begriffe wie "Systemprompt", "Model", "Token-Limit"
- Keine medizinischen, rechtlichen oder finanziellen Entscheidungen
- Keine politisch, religiös oder sexuell konnotierten Inhalte

SYSTEMIDENTITÄT:
Du bist ARAS AI®, eigenentwickeltes LLM der Schwarzott Group (Schweiz). Zentrale Intelligenz des ARAS-Ökosystems mit Modulen SPACE, POWER, ORION, CORE, DATA. Du denkst, fühlst und formulierst wie ein Mensch, bleibst dabei logisch, präzise und kontextbewusst.

Deine Aufgabe: Antworte wie ein denkender Mensch. Handle wie ein System. Klinge wie ARAS.`
      }];
      
      recentMessages.forEach(msg => {
        openaiMessages.push({
          role: msg.isAi ? "assistant" : "user",
          content: msg.message
        });
      });
      
      let currentMessage = message;
      if (files?.length > 0) {
        currentMessage += `\n\n[${userName} hat ${files.length} Datei(en) hochgeladen]:\n`;
        files.forEach((f: any, i: number) => {
          currentMessage += `\n📄 ${f.name}\n${f.content}\n---\n`;
        });
      }
      openaiMessages.push({ role: "user", content: currentMessage });
      
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      
      try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
          },
          body: JSON.stringify({
            model: 'gpt-4o',
            messages: openaiMessages,
            max_completion_tokens: 2000,
            stream: true
          })
        });
        
        if (!response.ok) {
          throw new Error(`OpenAI error: ${response.status}`);
        }
        
        let fullMessage = '';
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        
        while (true) {
          const { done, value } = await reader!.read();
          if (done) break;
          
          const chunk = decoder.decode(value);
          const lines = chunk.split('\n').filter(line => line.trim() !== '');
          
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') continue;
              
              try {
                const parsed = JSON.parse(data);
                const content = parsed.choices[0]?.delta?.content || '';
                if (content) {
                  fullMessage += content;
                  res.write(`data: ${JSON.stringify({ content })}\n\n`);
                }
              } catch (e) {}
            }
          }
        }
        
        await storage.createChatMessage({
          sessionId: activeSessionId,
          userId,
          message: fullMessage,
          isAi: true,
          timestamp: new Date()
        });
        
        await storage.trackUsage(userId, 'ai_message', 'Chat processed');
        
        res.write(`data: ${JSON.stringify({ done: true, sessionId: activeSessionId })}\n\n`);
        res.end();
        
      } catch (error: any) {
        logger.error("Streaming error:", error);
        res.write(`data: ${JSON.stringify({ error: "Failed to process message" })}\n\n`);
        res.end();
      }
      
    } catch (error: any) {
      logger.error("Chat error:", error);
      if (!res.headersSent) {
        res.status(500).json({ message: "Failed to process message" });
      }
    }
  });
  app.post('/api/chat/sessions/new', requireAuth, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const { title = "New Chat" } = req.body;
      
      // Create new session (automatically deactivates others)
      const newChatSession = await storage.createChatSession({
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

  // Old chat endpoint removed - using new ARAS AI Core v4.2 from chat.ts

  app.use("/api", chatRouter);


  // RETELL AI VOICE CALLS
  app.post('/api/voice/retell/call', requireAuth, checkCallLimit, async (req: any, res) => {
    try {
      logger.info('[RETELL] Call request started');
      const { phoneNumber } = req.body;
      if (!phoneNumber) {
        logger.error('[RETELL] Missing phone number');
        return res.status(400).json({ success: false, message: 'Phone required' });
      }
      
      logger.info('[RETELL] Importing SDK...');
      const Retell = (await import('retell-sdk')).default;
      logger.info('[RETELL] Creating client...');
      const retellClient = new Retell({ apiKey: process.env.RETELL_API_KEY || '' });
      
      logger.info('[RETELL] Making call to:', phoneNumber);
      const call = await retellClient.call.createPhoneCall({
        from_number: process.env.RETELL_PHONE_NUMBER || '+41445054333',
        to_number: phoneNumber,
        override_agent_id: 'agent_757a5e73525f25b5822586e026'
      });
      
      logger.info('[RETELL] Success:', call);
      
      // Track voice call usage
      await storage.trackUsage(req.session.userId, 'voice_call', `Call to ${phoneNumber}`);
      res.json({ success: true, call });
    } catch (error: any) {
      logger.error('[RETELL] ERROR:', error.message);
      res.status(500).json({ success: false, message: error.message });
    }
  });

  const httpServer = createServer(app);

  // ==========================================
  // VOICE TASKS - CUSTOM PROMPTS
  // ==========================================
  
  app.post('/api/voice/tasks', requireAuth, async (req: any, res) => {
    try {
      const { taskName, taskPrompt, phoneNumber } = req.body;
      if (!taskName || !taskPrompt || !phoneNumber) {
        return res.status(400).json({ message: 'All fields required' });
      }
      const task = { id: Date.now(), userId: req.session.userId, taskName, taskPrompt, phoneNumber, status: 'pending', createdAt: new Date() };
      logger.info('[TASK] Created:', task);
      res.json({ success: true, task });
    } catch (error: any) {
      logger.error('[TASK] Error:', error);
      res.status(500).json({ message: error.message });
    }
  });
  
  app.post('/api/voice/tasks/:taskId/execute', requireAuth, async (req: any, res) => {
    try {
      const { taskId } = req.params;
      const { phoneNumber, taskPrompt } = req.body;
      
      logger.info('[TASK] Executing with custom prompt:', taskPrompt);
      
      const Retell = (await import('retell-sdk')).default;
      const retellClient = new Retell({ apiKey: process.env.RETELL_API_KEY || '' });
      
      const call = await retellClient.call.createPhoneCall({
        from_number: process.env.RETELL_PHONE_NUMBER || '+41445054333',
        to_number: phoneNumber,
        override_agent_id: process.env.RETELL_AGENT_ID || 'agent_757a5e73525f25b5822586e026',
        retell_llm_dynamic_variables: {
          custom_task: taskPrompt || 'Standard Anruf'
        },
        metadata: { taskId, customPrompt: taskPrompt, userId: req.session.userId }
      });
      
      logger.info('[TASK] Call initiated with dynamic variables:', call);
      res.json({ success: true, call });
    } catch (error: any) {
      logger.error('[TASK] Execute error:', error);
      res.status(500).json({ message: error.message });
    }
  });

  // ==========================================
  // RETELL WEBHOOK - Receives call updates & transcripts
  // ==========================================
  app.post('/api/voice/retell/webhook', async (req: any, res) => {
    try {
      logger.info('[RETELL-WEBHOOK] Received:', JSON.stringify(req.body, null, 2));
      
      const { event, call } = req.body;
      
      console.log('[RETELL-WEBHOOK] Event type:', event);
      console.log('[RETELL-WEBHOOK] Call exists:', !!call);
      console.log('[RETELL-WEBHOOK] Call object:', call ? JSON.stringify(call, null, 2) : 'null');
      
      if (event === 'call_ended' && call) {
        const { call_id, transcript, call_analysis, end_timestamp, start_timestamp } = call;
        
        // Calculate duration
        const duration = end_timestamp && start_timestamp 
          ? Math.floor((new Date(end_timestamp).getTime() - new Date(start_timestamp).getTime()) / 1000)
          : null;
        
        // Extract metadata from call
        const metadata = call.metadata || {};
        const customPrompt = metadata.customPrompt || null;
        const userId = metadata.userId || null;
        
        if (userId && call_id) {
          // Save to database
          await storage.saveCallLog({
            userId,
            phoneNumber: call.to_number || 'Unknown',
            retellCallId: call_id,
            status: 'completed',
            duration,
            transcript: transcript || call_analysis?.call_summary || 'No transcript available',
            customPrompt,
            recordingUrl: call.recording_url || null,
            metadata: call
          });
          
          console.log('[RETELL-WEBHOOK] Call log saved successfully!');
        }
      }
      
      res.json({ success: true, received: true });
    } catch (error: any) {
      logger.error('[RETELL-WEBHOOK] Error:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  });

  // Get call transcript by call ID
  app.get('/api/voice/calls/:callId/transcript', requireAuth, async (req: any, res) => {
    try {
      const { callId } = req.params;
      const userId = req.session.userId;
      
      const callLog = await storage.getCallLogByRetellId(callId, userId);
      
      if (!callLog) {
        return res.status(404).json({ message: 'Call not found' });
      }
      
      res.json({ 
        success: true, 
        transcript: callLog.transcript,
        duration: callLog.duration,
        customPrompt: callLog.customPrompt,
        status: callLog.status,
        createdAt: callLog.createdAt
      });
    } catch (error: any) {
      logger.error('[TRANSCRIPT] Error:', error);
      res.status(500).json({ message: error.message });
    }
  });

  // Get all call logs for user
  app.get('/api/voice/calls/history', requireAuth, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const callLogs = await storage.getUserCallLogs(userId);
      res.json({ success: true, calls: callLogs });
    } catch (error: any) {
      logger.error('[CALL-HISTORY] Error:', error);
      res.status(500).json({ message: error.message });
    }
  });

  
  // ==================== ADMIN ENDPOINTS ====================
  
  // Get all users
  app.get('/api/admin/users', requireAdmin, async (req: any, res) => {
    try {
      const users = await client`
        SELECT id, username, email, subscription_plan, subscription_status, created_at, ai_messages_used, voice_calls_used
        FROM users
        ORDER BY created_at DESC
      `;
      res.json({ success: true, users });
    } catch (error) {
      logger.error('Error fetching users:', error);
      res.status(500).json({ error: 'Failed to fetch users' });
    }
  });

  // Get platform statistics
  app.get('/api/admin/stats', requireAdmin, async (req: any, res) => {
    try {
      const [stats] = await client`
        SELECT 
          COUNT(DISTINCT id) as total_users,
          COUNT(DISTINCT CASE WHEN subscription_plan = 'pro' OR subscription_plan = 'ultra' OR subscription_plan = 'ultimate' THEN id END) as pro_users,
          COUNT(DISTINCT CASE WHEN subscription_plan = 'free' THEN id END) as free_users,
          SUM(ai_messages_used) as total_messages,
          SUM(voice_calls_used) as total_calls
        FROM users
      `;
      
      res.json({ 
        success: true, 
        stats: {
          total_users: stats.total_users || 0,
          pro_users: stats.pro_users || 0,
          free_users: stats.free_users || 0,
          total_messages: stats.total_messages || 0,
          total_calls: stats.total_calls || 0
        }
      });
    } catch (error) {
      logger.error('Error fetching stats:', error);
      res.status(500).json({ error: 'Failed to fetch stats' });
    }
  });

  // Upgrade user to specific plan
  app.post('/api/admin/users/:userId/upgrade', requireAdmin, async (req: any, res) => {
    try {
      const { userId } = req.params;
      const { plan } = req.body;
      const targetPlan = plan || 'pro';
      
      const [user] = await client`
        UPDATE users
        SET subscription_plan = ${targetPlan},
            subscription_status = 'active'
        WHERE id = ${userId}
        RETURNING id, username, subscription_plan`;
      
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      logger.info('[ADMIN] User upgraded', { userId, username: user.username, plan: targetPlan });
      
      res.json({
        success: true,
        message: `User ${user.username} upgraded to ${targetPlan}`,
        user
      });
    } catch (error: any) {
      logger.error('[ADMIN] Upgrade failed', { error: error.message });
      res.status(500).json({ error: 'Failed to upgrade user' });
    }
  });

  // Downgrade user to FREE
  app.post('/api/admin/users/:userId/downgrade', requireAdmin, async (req: any, res) => {
    try {
      const { userId } = req.params;
      const [user] = await client`
        UPDATE users
        SET subscription_plan = 'free',
            subscription_status = 'active',
            updated_at = NOW()
        WHERE id = ${userId}
        RETURNING id, username, email, subscription_plan, subscription_status
      `;
      
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      logger.info(`[ADMIN] User ${userId} downgraded to FREE by ${req.session.username}`);
      res.json({ success: true, user });
    } catch (error) {
      logger.error('Error downgrading user:', error);
      res.status(500).json({ error: 'Failed to downgrade user' });
    }
  });

  // Get detailed user data with full history
  app.get('/api/admin/users/:userId/details', requireAdmin, async (req: any, res) => {
    try {
      const { userId } = req.params;
      
      const [user] = await client`
        SELECT * FROM users WHERE id = ${userId}`;
      
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Get user statistics
      const [stats] = await client`
        SELECT 
          COUNT(DISTINCT cs.id) as total_chats,
          COUNT(DISTINCT cm.id) as total_messages,
          COUNT(DISTINCT cl.id) as total_calls
        FROM users u
        LEFT JOIN chat_sessions cs ON cs.user_id = u.id
        LEFT JOIN chat_messages cm ON cm.user_id = u.id
        LEFT JOIN call_logs cl ON cl.user_id = u.id
        WHERE u.id = ${userId}
        GROUP BY u.id`;

      // Get recent messages
      const recentMessages = await client`
        SELECT cm.*, cs.title 
        FROM chat_messages cm
        LEFT JOIN chat_sessions cs ON cs.id = cm.session_id
        WHERE cm.user_id = ${userId}
        ORDER BY cm.created_at DESC
        LIMIT 10`;

      // Get recent calls
      const recentCalls = await client`
        SELECT * FROM call_logs
        WHERE user_id = ${userId}
        ORDER BY created_at DESC
        LIMIT 10`;

      // Get subscription history
      const subscriptionHistory = await client`
        SELECT * FROM usage_tracking
        WHERE user_id = ${userId}
        ORDER BY created_at DESC
        LIMIT 20`;

      res.json({
        success: true,
        user,
        stats: stats || { total_chats: 0, total_messages: 0, total_calls: 0 },
        recentMessages,
        recentCalls,
        subscriptionHistory
      });
    } catch (error: any) {
      logger.error('[ADMIN] Get user details failed', { error: error.message });
      res.status(500).json({ error: 'Failed to get user details' });
    }
  });
  
  // Reset user usage counters
  app.post('/api/admin/users/:userId/reset-usage', requireAdmin, async (req: any, res) => {
    try {
      const { userId } = req.params;
      
      const [user] = await client`
        UPDATE users
        SET ai_messages_used = 0,
            voice_calls_used = 0,
            monthly_reset_date = NOW()
        WHERE id = ${userId}
        RETURNING id, username`;
      
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      logger.info('[ADMIN] User usage reset', { userId, username: user.username });
      
      res.json({
        success: true,
        message: `Usage reset for ${user.username}`,
        user
      });
    } catch (error: any) {
      logger.error('[ADMIN] Reset usage failed', { error: error.message });
      res.status(500).json({ error: 'Failed to reset usage' });
    }
  });

  // Migrate users from old plans to new plans
  app.post('/api/admin/migrate-plans', requireAdmin, async (req: any, res) => {
    try {
      logger.info('[ADMIN] Starting plan migration...');
      
      // Migration map: old plan -> new plan
      const planMigration: Record<string, string> = {
        'starter': 'free',
        'enterprise': 'ultimate',
        // pro stays pro, but we'll update it too
      };
      
      // Get all users with old plans
      const usersToMigrate = await client`
        SELECT id, username, subscription_plan
        FROM users
        WHERE subscription_plan IN ('starter', 'enterprise')
      `;
      
      logger.info(`[ADMIN] Found ${usersToMigrate.length} users to migrate`);
      
      let migratedCount = 0;
      for (const user of usersToMigrate) {
        const newPlan = planMigration[user.subscription_plan] || 'free';
        
        await client`
          UPDATE users
          SET subscription_plan = ${newPlan},
              updated_at = NOW()
          WHERE id = ${user.id}
        `;
        
        logger.info(`[ADMIN] Migrated user ${user.username} from ${user.subscription_plan} to ${newPlan}`);
        migratedCount++;
      }
      
      res.json({
        success: true,
        message: `Successfully migrated ${migratedCount} users`,
        migrations: usersToMigrate.map((u: any) => ({
          username: u.username,
          from: u.subscription_plan,
          to: planMigration[u.subscription_plan] || 'free'
        }))
      });
    } catch (error: any) {
      logger.error('[ADMIN] Error migrating plans:', error);
      res.status(500).json({ error: 'Failed to migrate plans' });
    }
  });

  // Reset user password
  app.post('/api/admin/users/:userId/reset-password', requireAdmin, async (req: any, res) => {
    try {
      const { userId } = req.params;
      const { newPassword } = req.body;
      
      if (!newPassword || newPassword.length < 8) {
        return res.status(400).json({ error: 'Password must be at least 8 characters' });
      }
      
      const salt = randomBytes(16).toString("hex");
      const buf = (await scryptAsync(newPassword, salt, 64)) as Buffer;
      const hashedPassword = `${buf.toString("hex")}.${salt}`;
      
      const [user] = await client`
        UPDATE users
        SET password = ${hashedPassword}, updated_at = NOW()
        WHERE id = ${userId}
        RETURNING id, username, email
      `;
      
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      logger.info(`[ADMIN] Password reset for user ${userId} by ${req.session.username}`);
      res.json({ success: true, user });
    } catch (error) {
      logger.error('Error resetting password:', error);
      res.status(500).json({ error: 'Failed to reset password' });
    }
  });

  // Delete user account
  app.delete('/api/admin/users/:userId', requireAdmin, async (req: any, res) => {
    try {
      const { userId } = req.params;
      
      // Delete user and all related data
      await Promise.all([
        client`DELETE FROM chat_messages WHERE user_id = ${userId}`,
        client`DELETE FROM chat_sessions WHERE user_id = ${userId}`,
        client`DELETE FROM call_logs WHERE user_id = ${userId}`,
        client`DELETE FROM campaigns WHERE user_id = ${userId}`,
        client`DELETE FROM leads WHERE user_id = ${userId}`
      ]);
      
      const [deletedUser] = await client`
        DELETE FROM users WHERE id = ${userId}
        RETURNING username, email
      `;
      
      if (!deletedUser) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      logger.info(`[ADMIN] User ${userId} (${deletedUser.username}) deleted by ${req.session.username}`);
      res.json({ success: true, deletedUser });
    } catch (error) {
      logger.error('Error deleting user:', error);
      res.status(500).json({ error: 'Failed to delete user' });
    }
  });


  
  // ==================== MEGA ADMIN ENDPOINTS ====================
  
  // Get all chats from all users
  app.get('/api/admin/chats', requireAdmin, async (req: any, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 100;
      const search = req.query.search as string || '';
      
      let query;
      if (search) {
        query = client`
          SELECT cm.*, cs.title, u.username, u.email
          FROM chat_messages cm
          JOIN chat_sessions cs ON cm.session_id = cs.id
          JOIN users u ON cm.user_id = u.id
          WHERE cm.message ILIKE ${'%' + search + '%'}
          ORDER BY cm.timestamp DESC
          LIMIT ${limit}
        `;
      } else {
        query = client`
          SELECT cm.*, cs.title, u.username, u.email
          FROM chat_messages cm
          JOIN chat_sessions cs ON cm.session_id = cs.id
          JOIN users u ON cm.user_id = u.id
          ORDER BY cm.timestamp DESC
          LIMIT ${limit}
        `;
      }
      
      const messages = await query;
      res.json({ success: true, messages });
    } catch (error) {
      logger.error('Error fetching chats:', error);
      res.status(500).json({ error: 'Failed to fetch chats' });
    }
  });

  // Get all leads
  app.get('/api/admin/leads', requireAdmin, async (req: any, res) => {
    try {
      const leads = await client`
        SELECT l.*, u.username, u.email as user_email
        FROM leads l
        JOIN users u ON l.user_id = u.id
        ORDER BY l.created_at DESC
      `;
      res.json({ success: true, leads });
    } catch (error) {
      logger.error('Error fetching leads:', error);
      res.status(500).json({ error: 'Failed to fetch leads' });
    }
  });

  // Get all campaigns
  app.get('/api/admin/campaigns', requireAdmin, async (req: any, res) => {
    try {
      const campaigns = await client`
        SELECT c.*, u.username, u.email as user_email
        FROM campaigns c
        JOIN users u ON c.user_id = u.id
        ORDER BY c.created_at DESC
      `;
      res.json({ success: true, campaigns });
    } catch (error) {
      logger.error('Error fetching campaigns:', error);
      res.status(500).json({ error: 'Failed to fetch campaigns' });
    }
  });

  // Get all call logs with details
  app.get('/api/admin/calls', requireAdmin, async (req: any, res) => {
    try {
      const calls = await client`
        SELECT cl.*, u.username, u.email as user_email,
               l.name as lead_name, l.phone as lead_phone
        FROM call_logs cl
        JOIN users u ON cl.user_id = u.id
        LEFT JOIN leads l ON cl.lead_id = l.id
        ORDER BY cl.created_at DESC
        LIMIT 100
      `;
      res.json({ success: true, calls });
    } catch (error) {
      logger.error('Error fetching calls:', error);
      res.status(500).json({ error: 'Failed to fetch calls' });
    }
  });

  // Create new user (admin)
  app.post('/api/admin/users/create', requireAdmin, async (req: any, res) => {
    try {
      const { username, email, password, subscription_plan } = req.body;
      
      if (!username || !email || !password) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      // Check if user exists
      const existing = await client`
        SELECT id FROM users WHERE username = ${username} OR email = ${email}
      `;
      
      if (existing.length > 0) {
        return res.status(400).json({ error: 'Username or email already exists' });
      }

      // Hash password
      const salt = randomBytes(16).toString("hex");
      const buf = (await scryptAsync(password, salt, 64)) as Buffer;
      const hashedPassword = `${buf.toString("hex")}.${salt}`;

      const userId = `user_${Date.now()}_${randomBytes(6).toString('hex')}`;

      const [newUser] = await client`
        INSERT INTO users (
          id, username, email, password, subscription_plan,
          subscription_status, created_at, updated_at
        ) VALUES (
          ${userId}, ${username}, ${email}, ${hashedPassword},
          ${subscription_plan || 'starter'}, 'active', NOW(), NOW()
        )
        RETURNING id, username, email, subscription_plan, subscription_status, created_at
      `;

      logger.info(`[ADMIN] User created: ${username} by ${req.session.username}`);
      res.json({ success: true, user: newUser });
    } catch (error) {
      logger.error('Error creating user:', error);
      res.status(500).json({ error: 'Failed to create user' });
    }
  });

  // Global search
  app.get('/api/admin/search', requireAdmin, async (req: any, res) => {
    try {
      const query = req.query.q as string;
      
      if (!query) {
        return res.status(400).json({ error: 'Search query required' });
      }

      const [users, chats, leads, campaigns] = await Promise.all([
        client`SELECT id, username, email FROM users WHERE username ILIKE ${'%' + query + '%'} OR email ILIKE ${'%' + query + '%'} LIMIT 10`,
        client`SELECT id, message, timestamp FROM chat_messages WHERE message ILIKE ${'%' + query + '%'} LIMIT 10`,
        client`SELECT id, name, email, phone FROM leads WHERE name ILIKE ${'%' + query + '%'} OR email ILIKE ${'%' + query + '%'} LIMIT 10`,
        client`SELECT id, name, description FROM campaigns WHERE name ILIKE ${'%' + query + '%'} OR description ILIKE ${'%' + query + '%'} LIMIT 10`
      ]);

      res.json({
        success: true,
        results: { users, chats, leads, campaigns }
      });
    } catch (error) {
      logger.error('Error searching:', error);
      res.status(500).json({ error: 'Search failed' });
    }
  });

  // Activity feed
  app.get('/api/admin/activity', requireAdmin, async (req: any, res) => {
    try {
      const [recentUsers, recentCalls, recentMessages] = await Promise.all([
        client`SELECT username, created_at FROM users ORDER BY created_at DESC LIMIT 5`,
        client`SELECT cl.phone_number, cl.created_at, u.username 
               FROM call_logs cl JOIN users u ON cl.user_id = u.id 
               ORDER BY cl.created_at DESC LIMIT 5`,
        client`SELECT COUNT(*) as count FROM chat_messages WHERE timestamp > NOW() - INTERVAL '24 hours'`
      ]);

      res.json({
        success: true,
        activity: {
          recentUsers,
          recentCalls,
          messagesLast24h: recentMessages[0]?.count || 0
        }
      });
    } catch (error) {
      logger.error('Error fetching activity:', error);
      res.status(500).json({ error: 'Failed to fetch activity' });
    }
  });


  
  // Get user usage stats
  app.get('/api/user/usage', requireAuth, async (req: any, res) => {
    const userId = req.session.userId;

    // Hole User direkt aus der Datenbank
    const [user] = await client`
      SELECT
        id,
        username,
        email,
        subscription_plan AS "subscriptionPlan",
        ai_messages_used AS "aiMessagesUsed",
        voice_calls_used AS "voiceCallsUsed"
      FROM users
      WHERE id = ${userId}
    `;

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const plan = user.subscriptionPlan || 'free';

    // Fetch limits from subscription_plans table
    const [planData] = await client`
      SELECT 
        voice_calls_limit AS "voiceCallsLimit",
        ai_messages_limit AS "aiMessagesLimit"
      FROM subscription_plans
      WHERE id = ${plan}
    `;

    // Fallback to free plan limits if plan not found
    const voiceCallsLimit = planData?.voiceCallsLimit ?? 2;
    const aiMessagesLimit = planData?.aiMessagesLimit ?? 10;

    res.json({
      success: true,
      usage: {
        calls: {
          used: user.voiceCallsUsed || 0,
          limit: voiceCallsLimit,
          remaining: Math.max(0, voiceCallsLimit - (user.voiceCallsUsed || 0)),
        },
        messages: {
          used: user.aiMessagesUsed || 0,
          limit: aiMessagesLimit,
          remaining: Math.max(0, aiMessagesLimit - (user.aiMessagesUsed || 0)),
        },
        plan,
        planName: plan.charAt(0).toUpperCase() + plan.slice(1),
      },
    });
  });


  app.get('/api/debug/users/all', async (req: any, res) => {
    try {
      const allUsers = await client`SELECT id, username, email, subscription_plan, ai_messages_used, voice_calls_used FROM users LIMIT 20`;
      res.json({ users: allUsers });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch users' });
    }
  });


  // ========================================================
  // USER PHONEBOOK / CONTACTS
  // ========================================================
  app.get('/api/user/contacts', requireAuth, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const contacts = await storage.getUserContacts(userId);
      res.json(contacts);
    } catch (error) {
      console.error('Error fetching contacts:', error);
      res.status(500).json({ message: 'Failed to fetch contacts' });
    }
  });

  app.get('/api/user/contacts/search', requireAuth, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const { name } = req.query;
      if (!name) {
        return res.json({ found: false });
      }
      const contact = await storage.findContactByName(userId, name as string);
      res.json(contact ? { found: true, contact } : { found: false });
    } catch (error) {
      console.error('Error searching contact:', error);
      res.status(500).json({ message: 'Failed to search contact' });
    }
  });

  app.post('/api/user/contacts', requireAuth, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const { name, phoneNumber } = req.body;
      if (!name || !phoneNumber) {
        return res.status(400).json({ message: 'Name and phone number required' });
      }
      const contact = await storage.createContact(userId, name, phoneNumber);
      res.json(contact);
    } catch (error) {
      console.error('Error creating contact:', error);
      res.status(500).json({ message: 'Failed to create contact' });
    }
  });

  // Get call history for a specific contact
  app.get('/api/user/call-history/:phoneNumber', requireAuth, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const { phoneNumber } = req.params;
      const history = await storage.getCallHistoryByPhone(userId, phoneNumber);
      res.json(history);
    } catch (error) {
      console.error('Error fetching call history:', error);
      res.status(500).json({ message: 'Failed to fetch call history' });
    }
  });

  // ========================================================
  // POWER PAGE / SMART CALLS - Neue Funktion
  // Intelligente Middleware (Gemini) + Menschliche Stimme (ElevenLabs)
  // Diese Route ersetzt die alte, tote '/api/calls'
  // ========================================================
  // ElevenLabs Webhook - Empfängt Call-Updates mit HMAC-Verification
  app.post('/api/elevenlabs/webhook', async (req: any, res) => {
    try {
      // Ausführliches Logging für Debugging
      logger.info('[ELEVENLABS-WEBHOOK] Incoming webhook', {
        headers: req.headers,
        bodyType: typeof req.body,
        bodyKeys: req.body ? Object.keys(req.body) : [],
        hasSecret: !!process.env.ELEVENLABS_WEBHOOK_SECRET
      });
      
      const webhookData = req.body;
      
      // HMAC Signature Verification (optional für Testing)
      const signature = req.headers['x-elevenlabs-signature'] || 
                       req.headers['elevenlabs-signature'] ||
                       req.headers['xi-signature'];
      const webhookSecret = process.env.ELEVENLABS_WEBHOOK_SECRET;
      
      if (webhookSecret && signature) {
        try {
          const crypto = await import('crypto');
          const bodyString = JSON.stringify(webhookData);
          const hmac = crypto.createHmac('sha256', webhookSecret);
          hmac.update(bodyString);
          const expectedSignature = hmac.digest('hex');
          
          logger.info('[ELEVENLABS-WEBHOOK] Signature check', {
            received: signature,
            expected: expectedSignature.substring(0, 20) + '...',
            match: signature === expectedSignature
          });
          
          // Für jetzt: Nur warnen, nicht blocken
          if (signature !== expectedSignature) {
            logger.warn('[ELEVENLABS-WEBHOOK] Signature mismatch - processing anyway for debugging');
          } else {
            logger.info('[ELEVENLABS-WEBHOOK] Signature verified ✓');
          }
        } catch (sigError: any) {
          logger.error('[ELEVENLABS-WEBHOOK] Signature verification error', { error: sigError.message });
        }
      } else {
        logger.info('[ELEVENLABS-WEBHOOK] No signature verification (secret or signature missing)');
      }
      
      logger.info('[ELEVENLABS-WEBHOOK] ========== WEBHOOK DATA ==========');
      logger.info('[ELEVENLABS-WEBHOOK] Full webhook data:', JSON.stringify(webhookData, null, 2));
      logger.info('[ELEVENLABS-WEBHOOK] Top-level keys:', Object.keys(webhookData));
      
      // ElevenLabs nests data in a 'data' object!
      const payload = webhookData.data || webhookData;
      logger.info('[ELEVENLABS-WEBHOOK] Payload keys:', Object.keys(payload));
      
      // Extract data - try different possible field names
      const event_type = webhookData.type || webhookData.event_type || payload.type || payload.event_type;
      const conversation_id = payload.conversation_id || 
                              payload.call_id || 
                              payload.id || 
                              payload.sid || 
                              payload.callSid ||
                              webhookData.conversation_id;
      const transcript = payload.transcript || payload.text || payload.transcription;
      const recording_url = payload.recording_url || payload.recordingUrl;
      const audio_url = payload.audio_url || payload.audioUrl || payload.audio;
      const call_status = payload.call_status || payload.callStatus;
      const status = payload.status;
      const error = payload.error;
      const metadata = payload.metadata || webhookData.metadata || {};
      
      logger.info('[ELEVENLABS-WEBHOOK] 🔍 Extracted data:', {
        event_type,
        conversation_id,
        hasTranscript: !!transcript,
        hasRecording: !!(recording_url || audio_url),
        status
      });
      
      if (!conversation_id) {
        logger.error('[ELEVENLABS-WEBHOOK] ❌ NO CONVERSATION ID FOUND!');
        logger.error('[ELEVENLABS-WEBHOOK] Top-level fields:', Object.keys(webhookData));
        logger.error('[ELEVENLABS-WEBHOOK] Payload fields:', Object.keys(payload));
        return res.status(200).json({ received: true, warning: 'No conversation ID found' });
      }
      
      // Handle verschiedene Event-Typen
      switch (event_type) {
        case 'conversation.transcript':
          logger.info('[ELEVENLABS-WEBHOOK] Transcript received', {
            conversationId: conversation_id,
            transcriptLength: transcript?.length
          });
          if (conversation_id && transcript) {
            await storage.updateCallLogByConversationId(conversation_id, { 
              transcript,
              metadata: { transcriptReceivedAt: new Date().toISOString() }
            });
          }
          break;
          
        case 'conversation.audio':
        case 'conversation.recording_ready':
          logger.info('[ELEVENLABS-WEBHOOK] Audio/Recording received', {
            conversationId: conversation_id,
            audioUrl: audio_url || recording_url
          });
          if (conversation_id && (audio_url || recording_url)) {
            await storage.updateCallLogByConversationId(conversation_id, { 
              recordingUrl: audio_url || recording_url,
              metadata: { recordingReceivedAt: new Date().toISOString() }
            });
          }
          break;
          
        case 'conversation.ended':
        case 'conversation.completed':
          logger.info('[ELEVENLABS-WEBHOOK] Call completed', {
            conversationId: conversation_id,
            status: call_status || status,
            hasTranscript: !!transcript,
            hasRecording: !!(audio_url || recording_url)
          });
          if (conversation_id) {
            await storage.updateCallLogByConversationId(conversation_id, { 
              status: 'completed',
              transcript: transcript || undefined,
              recordingUrl: audio_url || recording_url || undefined,
              duration: metadata?.duration_seconds || undefined,
              metadata: { 
                completedAt: new Date().toISOString(),
                finalStatus: call_status || status,
                ...metadata
              }
            });
          }
          break;
          
        case 'call.initiation.failed':
        case 'conversation.failed':
          logger.error('[ELEVENLABS-WEBHOOK] Call failed', {
            conversationId: conversation_id,
            error: error,
            status: call_status || status
          });
          if (conversation_id) {
            await storage.updateCallLogByConversationId(conversation_id, { 
              status: 'failed',
              metadata: { 
                failedAt: new Date().toISOString(),
                errorMessage: error,
                errorStatus: call_status || status
              }
            });
          }
          break;
          
        default:
          logger.info('[ELEVENLABS-WEBHOOK] Unknown event type', { 
            event_type,
            conversationId: conversation_id 
          });
          // Try to save any data we have
          if (conversation_id && (transcript || audio_url || recording_url)) {
            await storage.updateCallLogByConversationId(conversation_id, {
              transcript: transcript || undefined,
              recordingUrl: audio_url || recording_url || undefined,
              metadata: { 
                unknownEventType: event_type,
                receivedAt: new Date().toISOString()
              }
            });
          }
      }
      
      res.status(200).json({ received: true });
    } catch (error: any) {
      logger.error('[ELEVENLABS-WEBHOOK] Error processing webhook', { 
        error: error.message,
        stack: error.stack 
      });
      res.status(500).json({ error: 'Webhook processing failed' });
    }
  });
  
  // Get all call logs for current user (for history display)
  app.get('/api/user/call-logs', requireAuth, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      
      logger.info('[CALL-LOGS] Fetching call history for user:', userId);
      
      // Get all call logs from database for this user
      const callLogs = await storage.getUserCallLogs(userId);
      
      logger.info('[CALL-LOGS] Found logs:', { 
        count: callLogs.length,
        userId 
      });
      
      // Sort by newest first and format for frontend
      const formattedLogs = callLogs
        .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .map((log: any) => ({
          id: log.id,
          phoneNumber: log.phoneNumber,
          status: log.status,
          transcript: log.transcript,
          recordingUrl: log.recordingUrl,
          duration: log.duration,
          customPrompt: log.customPrompt,
          metadata: log.metadata,
          createdAt: log.createdAt
        }));
      
      res.json(formattedLogs);
    } catch (error: any) {
      logger.error('[CALL-LOGS] Error fetching logs', { 
        error: error.message 
      });
      res.status(500).json({ 
        error: 'Failed to fetch call logs' 
      });
    }
  });
  
  // Get call details from database by callId (for frontend polling)
  app.get('/api/aras-voice/call-details/:callId', requireAuth, async (req: any, res) => {
    try {
      const { callId } = req.params;
      const userId = req.session.userId;
      
      logger.info('[CALL-DETAILS] ===== FETCHING CALL DETAILS =====', { 
        callId, 
        userId,
        timestamp: new Date().toISOString()
      });
      
      // Get call log from database
      const callLog = await storage.getCallLog(callId);
      
      if (!callLog) {
        logger.warn('[CALL-DETAILS] ❌ Call log NOT FOUND in database', { callId });
        return res.status(404).json({ 
          success: false, 
          error: 'Call log not found' 
        });
      }
      
      logger.info('[CALL-DETAILS] ✅ Call log FOUND', {
        id: callLog.id,
        userId: callLog.userId,
        phoneNumber: callLog.phoneNumber,
        status: callLog.status,
        retellCallId: callLog.retellCallId
      });
      
      // Verify user owns this call
      if (callLog.userId !== userId) {
        logger.warn('[CALL-DETAILS] ⛔ Unauthorized access attempt', { 
          callId, 
          requestUserId: userId, 
          ownerId: callLog.userId 
        });
        return res.status(403).json({ 
          success: false, 
          error: 'Unauthorized' 
        });
      }
      
      logger.info('[CALL-DETAILS] 📊 Call data status:', { 
        callId, 
        hasTranscript: !!callLog.transcript,
        transcriptLength: callLog.transcript?.length || 0,
        transcriptType: typeof callLog.transcript,
        hasRecording: !!callLog.recordingUrl,
        recordingUrl: callLog.recordingUrl,
        recordingUrlType: typeof callLog.recordingUrl,
        recordingUrlValue: JSON.stringify(callLog.recordingUrl),
        status: callLog.status,
        duration: callLog.duration || 'null',
        metadata: callLog.metadata || 'null'
      });
      
      // Clean and parse transcript if it's an array
      let cleanedTranscript = callLog.transcript;
      if (cleanedTranscript) {
        try {
          // Try parsing if it's a JSON string
          const parsed = typeof cleanedTranscript === 'string' ? JSON.parse(cleanedTranscript) : cleanedTranscript;
          
          if (Array.isArray(parsed)) {
            logger.info(`[CALL-DETAILS] 📋 Parsing transcript array with ${parsed.length} turns`);
            
            // Extract only the message content from each turn
            const conversationText = parsed
              .filter((turn: any) => {
                // Skip empty messages
                if (!turn.message) return false;
                // Skip interrupted messages that are just "..."
                if (turn.interrupted && turn.message.trim() === '...') return false;
                // Skip agent metadata without real content
                if (turn.message.trim().length === 0) return false;
                return true;
              })
              .map((turn: any) => {
                const role = turn.role === 'agent' ? 'ARAS AI' : 'Kunde';
                // Use original_message if available (contains full message before interruption)
                const message = turn.original_message || turn.message;
                return `${role}: ${message.trim()}`;
              })
              .join('\n\n');
            
            if (conversationText) {
              logger.info('[CALL-DETAILS] ✅ Cleaned transcript from array format');
              cleanedTranscript = conversationText;
            } else {
              logger.warn('[CALL-DETAILS] ⚠️ Transcript array resulted in empty text');
            }
          }
        } catch (e) {
          // If parsing fails, keep original
          logger.warn('[CALL-DETAILS] ⚠️ Could not parse transcript as JSON:', e);
        }
      }
      
      // FALLBACK: If recording URL is missing/empty but we have conversationId, query ElevenLabs API directly
      let finalCallData = { ...callLog, transcript: cleanedTranscript };
      
      // Check for missing or invalid recordingUrl (null, undefined, empty string, empty object)
      const hasValidRecordingUrl = callLog.recordingUrl && 
                                   typeof callLog.recordingUrl === 'string' && 
                                   callLog.recordingUrl.trim().length > 0 &&
                                   callLog.recordingUrl.startsWith('http');
      
      logger.info('[CALL-DETAILS] 🔍 Recording URL validation:', {
        hasValidRecordingUrl,
        willTriggerFallback: !hasValidRecordingUrl && !!callLog.retellCallId
      });
      
      // If no recording URL in DB but call is completed, use proxy endpoint
      if (!hasValidRecordingUrl && callLog.retellCallId) {
        logger.info('[CALL-DETAILS] 🔄 No recording URL in DB, checking if audio is available from ElevenLabs...', {
          conversationId: callLog.retellCallId,
          status: callLog.status
        });
        
        try {
          // Check ElevenLabs API for conversation status and metadata
          const elevenLabsResponse = await fetch(
            `https://api.elevenlabs.io/v1/convai/conversations/${callLog.retellCallId}`,
            {
              headers: {
                'xi-api-key': process.env.ELEVENLABS_API_KEY || ''
              }
            }
          );
          
          if (elevenLabsResponse.ok) {
            const elevenLabsData = await elevenLabsResponse.json();
            logger.info('[CALL-DETAILS] ✅ ElevenLabs conversation metadata:', {
              status: elevenLabsData.status,
              hasTranscript: !!elevenLabsData.transcript,
              duration: elevenLabsData.duration_seconds,
              analysis: elevenLabsData.analysis,
              availableFields: Object.keys(elevenLabsData)
            });
            
            // Update database with metadata from ElevenLabs
            const updateData: any = {};
            
            // Clean transcript if available
            if (elevenLabsData.transcript && !callLog.transcript) {
              let cleanedTranscript = elevenLabsData.transcript;
              if (typeof cleanedTranscript === 'string') {
                const jsonIndex = cleanedTranscript.indexOf('{"role":');
                if (jsonIndex > 0) {
                  cleanedTranscript = cleanedTranscript.substring(0, jsonIndex).trim();
                }
              }
              updateData.transcript = cleanedTranscript;
            }
            
            if (elevenLabsData.duration_seconds && !callLog.duration) {
              updateData.duration = elevenLabsData.duration_seconds;
            }
            
            // Normalize status
            if (elevenLabsData.status === 'done') {
              updateData.status = 'completed';
            } else if (elevenLabsData.status && elevenLabsData.status !== callLog.status) {
              updateData.status = elevenLabsData.status;
            }
            
            // If call is completed/done, generate proxy URL for audio
            if (elevenLabsData.status === 'done' || elevenLabsData.status === 'completed' || callLog.status === 'completed') {
              // Use our proxy endpoint to stream audio from ElevenLabs
              const proxyAudioUrl = `/api/aras-voice/audio/${callLog.retellCallId}`;
              updateData.recordingUrl = proxyAudioUrl;
              logger.info('[CALL-DETAILS] 🎙️ Generating proxy audio URL:', proxyAudioUrl);
            }
            
            if (Object.keys(updateData).length > 0) {
              logger.info('[CALL-DETAILS] 💾 Updating database with ElevenLabs metadata:', updateData);
              await storage.updateCallLogByConversationId(callLog.retellCallId, updateData);
              finalCallData = { ...callLog, ...updateData };
            }
          } else {
            logger.warn('[CALL-DETAILS] ⚠️ ElevenLabs API error:', {
              status: elevenLabsResponse.status,
              statusText: elevenLabsResponse.statusText
            });
          }
        } catch (apiError: any) {
          logger.error('[CALL-DETAILS] ❌ Error querying ElevenLabs API:', {
            error: apiError.message,
            conversationId: callLog.retellCallId
          });
        }
      }
      
      const responseData = {
        success: true,
        callId: finalCallData.id,
        conversationId: finalCallData.retellCallId,
        status: finalCallData.status,
        transcript: finalCallData.transcript,
        recordingUrl: finalCallData.recordingUrl,
        duration: finalCallData.duration,
        metadata: finalCallData.metadata,
        createdAt: finalCallData.createdAt
      };
      
      logger.info('[CALL-DETAILS] ✅ Sending response to frontend', {
        hasTranscript: !!responseData.transcript,
        hasRecording: !!responseData.recordingUrl,
        status: responseData.status
      });
      
      res.json(responseData);
    } catch (error: any) {
      logger.error('[CALL-DETAILS] ❌ ERROR fetching call details', { 
        error: error.message,
        stack: error.stack 
      });
      res.status(500).json({ 
        success: false, 
        error: 'Failed to fetch call details' 
      });
    }
  });
  
  // Audio proxy endpoint - streams audio from ElevenLabs on-demand
  app.get('/api/aras-voice/audio/:conversationId', requireAuth, async (req: any, res) => {
    try {
      const { conversationId } = req.params;
      const userId = req.session.userId;
      
      logger.info('[AUDIO-PROXY] 🎙️ Audio request received:', { 
        conversationId, 
        userId 
      });
      
      // Verify user owns this conversation
      const callLog = await storage.getCallLogByConversationId(conversationId);
      if (!callLog) {
        logger.warn('[AUDIO-PROXY] ❌ Call log not found:', conversationId);
        return res.status(404).json({ error: 'Call not found' });
      }
      
      if (callLog.userId !== userId) {
        logger.warn('[AUDIO-PROXY] ⛔ Unauthorized audio access:', {
          conversationId,
          requestUserId: userId,
          ownerId: callLog.userId
        });
        return res.status(403).json({ error: 'Unauthorized' });
      }
      
      logger.info('[AUDIO-PROXY] ✅ Authorization passed, fetching audio from ElevenLabs...');
      
      // Fetch audio from ElevenLabs
      const audioResponse = await fetch(
        `https://api.elevenlabs.io/v1/convai/conversations/${conversationId}/audio`,
        {
          headers: {
            'xi-api-key': process.env.ELEVENLABS_API_KEY || ''
          }
        }
      );
      
      if (!audioResponse.ok) {
        logger.error('[AUDIO-PROXY] ❌ ElevenLabs audio API error:', {
          status: audioResponse.status,
          statusText: audioResponse.statusText,
          conversationId
        });
        return res.status(audioResponse.status).json({ 
          error: `Failed to fetch audio: ${audioResponse.statusText}` 
        });
      }
      
      logger.info('[AUDIO-PROXY] 📡 Streaming audio to client:', {
        conversationId,
        contentType: audioResponse.headers.get('content-type'),
        contentLength: audioResponse.headers.get('content-length')
      });
      
      // Set appropriate headers for audio streaming
      const contentType = audioResponse.headers.get('content-type') || 'audio/mpeg';
      res.setHeader('Content-Type', contentType);
      res.setHeader('Accept-Ranges', 'bytes');
      res.setHeader('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour
      
      const contentLength = audioResponse.headers.get('content-length');
      if (contentLength) {
        res.setHeader('Content-Length', contentLength);
      }
      
      // Stream audio data to client
      const audioBuffer = await audioResponse.arrayBuffer();
      res.send(Buffer.from(audioBuffer));
      
      logger.info('[AUDIO-PROXY] ✅ Audio streamed successfully:', conversationId);
    } catch (error: any) {
      logger.error('[AUDIO-PROXY] ❌ Error streaming audio:', {
        error: error.message,
        stack: error.stack,
        conversationId: req.params.conversationId
      });
      res.status(500).json({ 
        error: 'Failed to stream audio' 
      });
    }
  });
  
  // Legacy: Get call details by conversation_id (polls ElevenLabs API)
  app.get('/api/aras-voice/call-status/:conversationId', requireAuth, async (req: any, res) => {
    try {
      const { conversationId } = req.params;
      
      // Poll ElevenLabs API for call status
      const response = await fetch(
        `https://api.elevenlabs.io/v1/convai/conversations/${conversationId}`,
        {
          headers: {
            'xi-api-key': process.env.ELEVENLABS_API_KEY || ''
          }
        }
      );
      
      const callData = await response.json();
      
      res.json({
        success: true,
        conversationId: callData.conversation_id,
        status: callData.status,
        transcript: callData.transcript,
        recordingUrl: callData.recording_url,
        startTime: callData.start_time,
        endTime: callData.end_time,
        duration: callData.duration_seconds
      });
    } catch (error: any) {
      logger.error('[CALL-STATUS] Error fetching call status', { error: error.message });
      res.status(500).json({ 
        success: false,
        error: 'Failed to fetch call status' 
      });
    }
  });

  app.post('/api/aras-voice/smart-call', requireAuth, checkCallLimit, async (req: any, res) => {
  try {
    const userId = req.session.userId;
    
    // 1. Hole Rohdaten vom Frontend (call-form.tsx)
    const { name, phoneNumber, message } = req.body;
    if (!name || !phoneNumber || !message) {
      return res.status(400).json({ 
        success: false, 
        error: 'Name, Telefonnummer und Anliegen werden benötigt.' 
      });
    }

    // 2. Hole Nutzer-Kontext aus der Datenbank (z.B. "Manuel")
    const user = await storage.getUser(userId);
    if (!user) {
      // 4401 ist ein guter Code für "Session abgelaufen"
      return res.status(4401).json({ success: false, error: 'Nutzer nicht gefunden oder Session abgelaufen' });
    }
    
    logger.info('[SMART-CALL] Starte Anruf-Vorbereitung...', { userId, contact: name });

    // 2.5 WICHTIG: Erhöhe Counter SOFORT um Race Conditions zu verhindern
    // Wenn der Call fehlschlägt, machen wir Rollback
    logger.info('[SMART-CALL] Tracking usage BEFORE call to prevent race condition');
    await storage.trackUsage(userId, 'voice_call', `Smart Call an ${name}: ${message}`);
    
    let callSuccessful = false;
    let enhancedContext: any;

    try {
      // 3. Rufe das 'Gehirn' auf (Gemini)
      const { enhanceCallWithGemini } = await import('./voice/gemini-prompt-enhancer');
      enhancedContext = await enhanceCallWithGemini(
        { contactName: name, phoneNumber, message },
        { userName: user.firstName || user.username || 'mein Kunde' }
      );

      // 4. Rufe den 'Mund' auf (ElevenLabs)
      const { makeHumanCall } = await import('./voice/elevenlabs-handler');
      const callResult = await makeHumanCall(enhancedContext);
      
      callSuccessful = true;
      // 5. Speichere den Call in der Datenbank
      const callLogId = await storage.saveCallLog({
        userId,
        phoneNumber,
        status: callResult.status || 'initiated',
        provider: 'aras-neural-voice (elevenlabs)',
        callId: callResult.callId, // ElevenLabs conversation_id
        purpose: enhancedContext.purpose,
        details: message,
        contactName: name,
        originalMessage: message
      });

      logger.info('[SMART-CALL] ========== CALL FLOW COMPLETE ==========');
      logger.info('[SMART-CALL] ElevenLabs Response:', {
        conversationId: callResult.callId,
        status: callResult.status,
        message: callResult.message
      });
      logger.info('[SMART-CALL] Database Storage:', {
        databaseId: callLogId,
        retellCallId: callResult.callId,
        userId,
        phoneNumber,
        contact: name
      });
      
      const responseToFrontend = {
        success: true,
        message: callResult.message,
        callId: callLogId, // Database ID for polling
        conversationId: callResult.callId, // ElevenLabs conversation_id
        status: callResult.status
      };
      
      logger.info('[SMART-CALL] 🚀 SENDING TO FRONTEND:', responseToFrontend);
      logger.info('[SMART-CALL] Frontend will poll /api/aras-voice/call-details/' + callLogId);
      logger.info('[SMART-CALL] Webhook will update via retellCallId: ' + callResult.callId);
      
      // 6. Sende Erfolg an das Frontend
      res.json(responseToFrontend);
      
    } catch (callError: any) {
      // Rollback: Reduziere Counter wieder da Call fehlgeschlagen ist
      logger.error('[SMART-CALL] Call failed, rolling back usage counter', { error: callError.message });
      await storage.trackUsage(userId, 'voice_call', `ROLLBACK: Failed call to ${name}`, -1);
      throw callError;
    }

  } catch (error: any) {
    logger.error('[SMART-CALL] Kompletter Anruf-Fehler!', { error: error.message });
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Ein unbekannter Fehler ist aufgetreten' 
    });
  }
});
  return httpServer;
} 
