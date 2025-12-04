import {
  pgTable,
  text,
  varchar,
  timestamp,
  jsonb,
  index,
  integer,
  boolean,
  serial,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table for authentication system
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table with simple auth
export const users = pgTable("users", {
  id: varchar("id").primaryKey().notNull(),
  username: varchar("username").unique().notNull(),
  password: varchar("password").notNull(),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  stripeCustomerId: varchar("stripe_customer_id"),
  stripeSubscriptionId: varchar("stripe_subscription_id"),
  subscriptionPlan: varchar("subscription_plan").default("starter"), // starter, professional, enterprise
  subscriptionStatus: varchar("subscription_status").default("trial_pending"), // trial_pending, trialing, active, canceled, past_due, requires_payment
  subscriptionStartDate: timestamp("subscription_start_date").defaultNow(),
  subscriptionEndDate: timestamp("subscription_end_date"),
  trialStartDate: timestamp("trial_start_date"),
  trialEndDate: timestamp("trial_end_date"),
  trialMessagesUsed: integer("trial_messages_used").default(0),
  hasPaymentMethod: boolean("has_payment_method").default(false),
  stripePaymentMethodId: varchar("stripe_payment_method_id"),
  aiMessagesUsed: integer("ai_messages_used").default(0),
  voiceCallsUsed: integer("voice_calls_used").default(0),
  monthlyResetDate: timestamp("monthly_reset_date").defaultNow(),
  threadId: varchar("thread_id"), // OpenAI Assistant thread ID
  assistantId: varchar("assistant_id"), // OpenAI Assistant ID
  
  // 🔥 BUSINESS INTELLIGENCE FIELDS
  company: varchar("company"),
  website: varchar("website"),
  industry: varchar("industry"),
  role: varchar("role"),
  phone: varchar("phone"),
  language: varchar("language").default("de"),
  primaryGoal: varchar("primary_goal"),
  
  // 🔥 AI PROFILE - ULTRA-DEEP Intelligence & Personalization
  aiProfile: jsonb("ai_profile").$type<{
    // Core Company Intelligence
    companyDescription?: string;
    products?: string[];
    services?: string[];
    targetAudience?: string;
    competitors?: string[];
    brandVoice?: string;
    valueProp?: string;
    
    // 🔥 ULTRA-DEEP Company Intelligence (Pro Research™)
    uniqueSellingPoints?: string[];
    foundedYear?: string | number | null;
    ceoName?: string | null;
    employeeCount?: string | number | null;
    revenue?: string | null;
    fundingInfo?: string | null;
    onlinePresence?: string | null;
    currentChallenges?: string[];
    opportunities?: string[];
    recentNews?: string[];
    decisionMakers?: string[];
    psychologicalProfile?: string | null;
    salesTriggers?: string[];
    communicationPreferences?: string | null;
    budgetCycles?: string | null;
    insiderInfo?: string | null;
    
    // User Intelligence
    communicationStyle?: string;
    expertise?: string[];
    goals?: string[];
    
    // AI Optimization
    customSystemPrompt?: string;
    effectiveKeywords?: string[];
    bestCallTimes?: string;
    industryInsights?: any;
    
    // Learning & Analytics
    conversationInsights?: any;
    learnedKeywords?: string[];
    preferredStyle?: string;
    lastUpdated?: string;
    
    // 🧠 DEEP PERSONAL INTELLIGENCE (from SPACE chats)
    personalityType?: string;  // e.g. "Analytical, Direct, Results-Driven"
    communicationTone?: string;  // e.g. "Professional but casual"
    decisionMakingStyle?: string;  // e.g. "Data-driven, Fast-paced"
    emotionalTriggers?: string[];  // What motivates/frustrates them
    workingHours?: string;  // Observed active times
    responsePatterns?: string;  // How they typically respond
    interests?: string[];  // Topics they discuss
    painPoints?: string[];  // Problems they mention
    aspirations?: string[];  // Goals they express
    vocabulary?: string[];  // Common words/phrases they use
    urgencyLevel?: string;  // How urgent their needs are
    trustLevel?: string;  // How much they trust AI/automation
    technicalLevel?: string;  // Tech-savvy rating
    collaborationStyle?: string;  // How they work with others
    priorityFocus?: string[];  // What they care about most
    stressIndicators?: string[];  // Signs of stress/pressure
    successMetrics?: string[];  // How they measure success
    learningStyle?: string;  // How they prefer to learn
    feedbackStyle?: string;  // How they give/receive feedback
    chatInsightsSummary?: string;  // Gemini-generated summary of all chats
    lastChatAnalysis?: string;  // Timestamp of last analysis
  }>(),
  
  profileEnriched: boolean("profile_enriched").default(false),
  lastEnrichmentDate: timestamp("last_enrichment_date"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Leads table
export const leads = pgTable("leads", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  name: varchar("name").notNull(),
  email: varchar("email"),
  phone: varchar("phone"),
  company: varchar("company"),
  status: varchar("status").default("cold"), // cold, warm, hot, contacted, converted
  lastContact: timestamp("last_contact"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Contacts table for user's business contacts
export const calendarEvents = pgTable("calendar_events", {
  id: varchar("id").primaryKey().notNull(),
  userId: varchar("user_id").notNull().references(() => users.id),
  title: varchar("title").notNull(),
  description: text("description"),
  date: varchar("date").notNull(), // Store as YYYY-MM-DD string
  time: varchar("time").notNull(),
  duration: integer("duration").notNull().default(60), // in minutes
  location: varchar("location"),
  attendees: text("attendees"),
  type: varchar("type", { enum: ["call", "meeting", "reminder", "other"] }).notNull().default("meeting"),
  status: varchar("status", { enum: ["scheduled", "completed", "cancelled"] }).notNull().default("scheduled"),
  callId: varchar("call_id"), // Reference to call if created from call
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const contacts = pgTable("contacts", {
  id: varchar("id").primaryKey().notNull(),
  userId: varchar("user_id").notNull().references(() => users.id),
  company: varchar("company").notNull(), // Required field
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  phone: varchar("phone"),
  email: varchar("email"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Campaigns table
export const campaigns = pgTable("campaigns", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  name: varchar("name").notNull(),
  description: text("description"),
  status: varchar("status").default("draft"), // draft, active, paused, completed
  totalLeads: integer("total_leads").default(0),
  contacted: integer("contacted").default(0),
  converted: integer("converted").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Chat sessions table
export const chatSessions = pgTable("chat_sessions", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  title: varchar("title").default("New Chat"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Chat messages table
export const chatMessages = pgTable("chat_messages", {
  id: serial("id").primaryKey(),
  sessionId: integer("session_id").references(() => chatSessions.id),
  userId: varchar("user_id").notNull().references(() => users.id),
  message: text("message").notNull(),
  isAi: boolean("is_ai").default(false),
  timestamp: timestamp("timestamp").defaultNow(),
});

// Voice agents table - Enhanced for customization
export const voiceAgents = pgTable("voice_agents", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id), // null for system agents, user_id for custom agents
  name: varchar("name").notNull(),
  description: text("description"),
  voice: varchar("voice").notNull(), // professional, friendly, authoritative, custom
  personality: text("personality"), // Detailed personality description
  customScript: text("custom_script"), // Custom greeting/introduction script
  ttsVoice: varchar("tts_voice").default("nova"), // OpenAI TTS voice: alloy, echo, fable, nova, onyx, shimmer
  language: varchar("language").default("en"), // Language code
  industry: varchar("industry"), // Industry specialization (real_estate, finance, healthcare, etc.)
  isSystemAgent: boolean("is_system_agent").default(false), // System vs user-created
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Call logs table - UPDATED for Retell integration
export const callLogs = pgTable("call_logs", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  leadId: integer("lead_id").references(() => leads.id),
  voiceAgentId: integer("voice_agent_id").references(() => voiceAgents.id),
  phoneNumber: varchar("phone_number").notNull(),
  contactName: varchar("contact_name"), // Name of contact for AI processing
  retellCallId: varchar("retell_call_id").unique(),
  status: varchar("status").default("initiated"),
  duration: integer("duration"),
  transcript: text("transcript"),
  customPrompt: text("custom_prompt"),
  recordingUrl: varchar("recording_url"),
  metadata: jsonb("metadata"),
  processedForCalendar: boolean("processed_for_calendar").default(false), // AI calendar processing flag
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Subscription plans table
export const subscriptionPlans = pgTable("subscription_plans", {
  id: varchar("id").primaryKey(), // free, pro, ultra, ultimate
  name: varchar("name").notNull(),
  price: integer("price").notNull(), // in cents
  aiMessagesLimit: integer("ai_messages_limit"), // null = unlimited
  voiceCallsLimit: integer("voice_calls_limit"), // null = unlimited
  leadsLimit: integer("leads_limit"), // null = unlimited
  campaignsLimit: integer("campaigns_limit"), // null = unlimited
  features: text("features").array(), // array of feature names
  stripePriceId: varchar("stripe_price_id"), // Stripe Price ID for subscription
  stripeProductId: varchar("stripe_product_id"), // Stripe Product ID
  isActive: boolean("is_active").default(true),
});

// Usage tracking table
export const usageTracking = pgTable("usage_tracking", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  type: varchar("type").notNull(), // ai_message, voice_call, lead_created, campaign_created
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Schema exports
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

export type ChatSession = typeof chatSessions.$inferSelect;
export type InsertChatSession = typeof chatSessions.$inferInsert;

// Twilio settings schema
export const twilioSettings = pgTable("twilio_settings", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  accountSid: varchar("account_sid"),
  authToken: varchar("auth_token"),
  phoneNumber: varchar("phone_number"),
  configured: boolean("configured").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type TwilioSettings = typeof twilioSettings.$inferSelect;
export type InsertTwilioSettings = typeof twilioSettings.$inferInsert;

export const voiceTasks = pgTable("voice_tasks", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id", { length: 255 }).notNull(),
  taskName: varchar("task_name", { length: 255 }).notNull(),
  taskPrompt: text("task_prompt").notNull(),
  phoneNumber: varchar("phone_number", { length: 50 }).notNull(),
  status: varchar("status", { length: 50 }).notNull().default("pending"),
  callId: varchar("call_id", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at"),
  executedAt: timestamp("executed_at"),
});

export type VoiceTask = typeof voiceTasks.$inferSelect;
export type InsertVoiceTask = typeof voiceTasks.$inferInsert;

// Subscription response types
export type SubscriptionResponse = {
  plan: string;
  status: string;
  aiMessagesUsed: number;
  voiceCallsUsed: number;
  aiMessagesLimit: number | null;
  voiceCallsLimit: number | null;
  renewalDate: string | null;
  trialMessagesUsed?: number;
  trialEndDate?: string | null;
  hasPaymentMethod: boolean;
  requiresPaymentSetup: boolean;
  isTrialActive: boolean;
  canUpgrade: boolean;
};

// Plan configuration types
export type PlanConfig = {
  id: string;
  name: string;
  price: number;
  trialMessages: number;
  aiMessagesLimit: number | null;
  voiceCallsLimit: number | null;
  features: string[];
  stripePriceId?: string;
  popular?: boolean;
};

// Payment setup requirements
export type PaymentSetupResponse = {
  clientSecret: string;
  setupIntentId: string;
  needsCardSetup: boolean;
};

export type InsertLead = typeof leads.$inferInsert;
export type CalendarEvent = typeof calendarEvents.$inferSelect;
export type InsertCalendarEvent = typeof calendarEvents.$inferInsert;

export type Contact = typeof contacts.$inferSelect;
export type InsertContact = typeof contacts.$inferInsert;
export type InsertCampaign = typeof campaigns.$inferInsert;
export type Campaign = typeof campaigns.$inferSelect;
export type ChatMessage = typeof chatMessages.$inferSelect;
export type InsertChatMessage = typeof chatMessages.$inferInsert;
export type VoiceAgent = typeof voiceAgents.$inferSelect;
export type CallLog = typeof callLogs.$inferSelect;
export type SubscriptionPlan = typeof subscriptionPlans.$inferSelect;
export type UsageTracking = typeof usageTracking.$inferSelect;

// Insert schemas
export const insertLeadSchema = createInsertSchema(leads).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertContactSchema = createInsertSchema(contacts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCampaignSchema = createInsertSchema(campaigns).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertChatSessionSchema = createInsertSchema(chatSessions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertChatMessageSchema = createInsertSchema(chatMessages).omit({
  id: true,
  timestamp: true,
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Login schema
export const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

export type LoginData = z.infer<typeof loginSchema>;

// Sanitized user type that excludes sensitive fields
export type SafeUser = Omit<User, 'password'>;

// Function to sanitize user data for API responses
export function sanitizeUser(user: User): SafeUser {
  const { password, ...safeUser } = user;
  return safeUser;
}

export const insertCallLogSchema = createInsertSchema(callLogs).omit({
  id: true,
  createdAt: true,
});

// Voice agent insert schema
export const insertVoiceAgentSchema = createInsertSchema(voiceAgents).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertVoiceAgent = z.infer<typeof insertVoiceAgentSchema>;
