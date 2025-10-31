import {
  users,
  leads,
  campaigns,
  chatMessages,
  chatSessions,
  voiceAgents,
  callLogs,
  subscriptionPlans,
  usageTracking,
  twilioSettings,
  type User,
  type UpsertUser,
  type Lead,
  type InsertLead,
  type Campaign,
  type InsertCampaign,
  type ChatMessage,
  type InsertChatMessage,
  type ChatSession,
  type InsertChatSession,
  type VoiceAgent,
  type CallLog,
  type SubscriptionPlan,
  type UsageTracking,
  type TwilioSettings,
  type InsertTwilioSettings,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, sql } from "drizzle-orm";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: UpsertUser): Promise<User>;
  upsertUser(user: UpsertUser): Promise<User>;
  updateUserStripeInfo(userId: string, stripeInfo: { stripeCustomerId?: string; customerId?: string; subscriptionId?: string; paymentMethodId?: string; hasPaymentMethod?: boolean }): Promise<User>;
  startUserTrial(userId: string, trialData: { paymentMethodId: string; trialEndDate: string; hasPaymentMethod: boolean }): Promise<User>;
  updateUserProfile(userId: string, profileData: any): Promise<User>;
  updateUserThread(userId: string, threadId: string): Promise<User>;
  
  // Subscription operations
  getSubscriptionStatus(userId: string): Promise<any>;
  getSubscriptionPlan(planId: string): Promise<any>;
  getAllSubscriptionPlans(): Promise<any[]>;
  updateUserSubscription(userId: string, subscriptionData: any): Promise<void>;
  updateUserSubscriptionStatus(userId: string, status: string): Promise<void>;
  trackUsage(userId: string, type: string, description?: string): Promise<void>;
  checkUsageLimit(userId: string, type: string): Promise<{ allowed: boolean; message?: string; requiresPayment?: boolean; requiresUpgrade?: boolean }>;
  resetMonthlyUsage(userId: string): Promise<void>;
  getUsageHistory(userId: string): Promise<any[]>;
  
  // Lead operations
  getLeads(userId: string): Promise<Lead[]>;
  createLead(lead: InsertLead): Promise<Lead>;
  updateLead(id: number, updates: Partial<InsertLead>): Promise<Lead>;
  deleteLead(id: number, userId: string): Promise<void>;
  importLeads(userId: string, csvData: any[]): Promise<Lead[]>;
  exportLeadsToCSV(leads: Lead[]): Promise<string>;
  
  // Campaign operations
  getCampaigns(userId: string): Promise<Campaign[]>;
  createCampaign(campaign: InsertCampaign): Promise<Campaign>;
  updateCampaign(id: number, updates: Partial<InsertCampaign>): Promise<Campaign>;
  deleteCampaign(campaignId: number, userId: string): Promise<void>;
  
  // Chat session operations
  getChatSessions(userId: string): Promise<ChatSession[]>;
  createChatSession(session: InsertChatSession): Promise<ChatSession>;
  getActiveSession(userId: string): Promise<ChatSession | undefined>;
  setActiveSession(userId: string, sessionId: number): Promise<void>;
  archiveSession(sessionId: number): Promise<void>;
  
  // Chat message operations
  getChatMessages(userId: string, sessionId?: number): Promise<ChatMessage[]>;
  getChatMessagesBySession(sessionId: number): Promise<ChatMessage[]>;
  createChatMessage(message: InsertChatMessage): Promise<ChatMessage>;
  updateChatMessage(messageId: number, updates: Partial<InsertChatMessage>): Promise<ChatMessage>;
  clearChatMessages(userId: string): Promise<void>;
  searchChatMessages(userId: string, query: string): Promise<ChatMessage[]>;
  
  // Voice agent operations
  getVoiceAgents(): Promise<VoiceAgent[]>;
  createVoiceAgent(agentData: any): Promise<VoiceAgent>;
  getVoiceAgentById(id: number): Promise<VoiceAgent | null>;
  updateVoiceAgent(id: number, updates: any): Promise<VoiceAgent>;
  deleteVoiceAgent(id: number): Promise<void>;
  
  // Call log operations
  getCallLogs(userId: string): Promise<CallLog[]>;
  createCallLog(callLog: any): Promise<CallLog>;
  
  // Token operations (deprecated - using subscription system)
  getTokenBalance(userId: string): Promise<number>;
  createTokenTransaction(transaction: any): Promise<any>;
  getTokenTransactions(userId: string): Promise<any[]>;
  updateTokenBalance(userId: string, amount: number): Promise<void>;
  addTokens(userId: string, amount: number): Promise<void>;
  
  // Analytics operations
  getDashboardAnalytics(userId: string): Promise<any>;
  getPerformanceAnalytics(userId: string, period: string): Promise<any>;
  
  // User settings operations
  getUserSettings(userId: string): Promise<any>;
  updateUserSettings(userId: string, settings: any): Promise<void>;
  
  // Twilio settings operations
  getTwilioSettings(userId: string): Promise<{ configured: boolean; accountSid?: string; phoneNumber?: string }>;
  getTwilioSettingsRaw(userId: string): Promise<{ accountSid: string; authToken: string; phoneNumber: string } | null>;
  saveTwilioSettings(userId: string, settings: { accountSid: string; authToken: string; phoneNumber: string }): Promise<void>;
  deleteTwilioSettings(userId: string): Promise<void>;
  
  // Call management operations
  updateCallLog(callId: number, updates: any): Promise<void>;
  storeCallMessage(callId: number, messageData: any): Promise<void>;
  getCallMessage(callId: string): Promise<any>;
  logCallInteraction(callId: string, interaction: any): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    console.log('[DB-DEBUG] Looking up user by ID:', id);
    try {
      const [user] = await db.select().from(users).where(eq(users.id, id));
      console.log('[DB-DEBUG] User lookup result:', user ? `Found: ${user.username}` : 'Not found');
      return user;
    } catch (error) {
      console.log('[DB-DEBUG] Database error in getUser:', error);
      throw error;
    }
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    console.log('[DB-DEBUG] Looking up user by username:', username);
    try {
      const [user] = await db.select().from(users).where(eq(users.username, username));
      console.log('[DB-DEBUG] Username lookup result:', user ? `Found: ${user.id}` : 'Not found');
      return user;
    } catch (error) {
      console.log('[DB-DEBUG] Database error in getUserByUsername:', error);
      throw error;
    }
  }

  async createUser(userData: UpsertUser): Promise<User> {
    console.log('[DB-DEBUG] Creating new user:', userData.username, 'ID:', userData.id);
    console.log('[DB-DEBUG] Full user data:', JSON.stringify(userData, null, 2));
    try {
      console.log('[DB-DEBUG] About to insert into database...');
      const [user] = await db
        .insert(users)
        .values(userData)
        .returning();
      console.log('[DB-DEBUG] User created successfully:', user.id);
      console.log('[DB-DEBUG] Returned user data:', JSON.stringify(user, null, 2));
      return user;
    } catch (error) {
      console.log('[DB-DEBUG] Database error in createUser:', error);
      console.log('[DB-DEBUG] Error details:', error instanceof Error ? error.message : String(error));
      throw error;
    }
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async updateUserStripeInfo(userId: string, stripeInfo: { stripeCustomerId?: string; customerId?: string; subscriptionId?: string; paymentMethodId?: string; hasPaymentMethod?: boolean }): Promise<User> {
    const updateData: any = {
      updatedAt: new Date(),
    };

    if (stripeInfo.stripeCustomerId || stripeInfo.customerId) {
      updateData.stripeCustomerId = stripeInfo.stripeCustomerId || stripeInfo.customerId;
    }
    if (stripeInfo.subscriptionId !== undefined) {
      updateData.stripeSubscriptionId = stripeInfo.subscriptionId;
    }
    if (stripeInfo.paymentMethodId !== undefined) {
      updateData.stripePaymentMethodId = stripeInfo.paymentMethodId;
    }
    if (stripeInfo.hasPaymentMethod !== undefined) {
      updateData.hasPaymentMethod = stripeInfo.hasPaymentMethod;
    }

    const [user] = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async startUserTrial(userId: string, trialData: { paymentMethodId: string; trialEndDate: string; hasPaymentMethod: boolean }): Promise<User> {
    const [user] = await db
      .update(users)
      .set({
        stripePaymentMethodId: trialData.paymentMethodId,
        trialStartDate: new Date(),
        trialEndDate: new Date(trialData.trialEndDate),
        hasPaymentMethod: trialData.hasPaymentMethod,
        subscriptionStatus: 'trialing',
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async updateUserPlan(userId: string, plan: string): Promise<User> {
    const [user] = await db
      .update(users)
      .set({
        subscriptionPlan: plan,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  // Lead operations
  async getLeads(userId: string): Promise<Lead[]> {
    return await db
      .select()
      .from(leads)
      .where(eq(leads.userId, userId))
      .orderBy(desc(leads.createdAt));
  }

  async createLead(lead: InsertLead): Promise<Lead> {
    const [newLead] = await db.insert(leads).values(lead).returning();
    return newLead;
  }

  async updateLead(id: number, updates: Partial<InsertLead>): Promise<Lead> {
    const [updatedLead] = await db
      .update(leads)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(leads.id, id))
      .returning();
    return updatedLead;
  }



  // Campaign operations
  async getCampaigns(userId: string): Promise<Campaign[]> {
    return await db
      .select()
      .from(campaigns)
      .where(eq(campaigns.userId, userId))
      .orderBy(desc(campaigns.createdAt));
  }

  async createCampaign(campaign: InsertCampaign): Promise<Campaign> {
    const [newCampaign] = await db.insert(campaigns).values(campaign).returning();
    return newCampaign;
  }

  async updateCampaign(id: number, updates: Partial<InsertCampaign>): Promise<Campaign> {
    const [updatedCampaign] = await db
      .update(campaigns)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(campaigns.id, id))
      .returning();
    return updatedCampaign;
  }

  // Chat session operations
  async getChatSessions(userId: string): Promise<ChatSession[]> {
    return await db
      .select()
      .from(chatSessions)
      .where(eq(chatSessions.userId, userId))
      .orderBy(desc(chatSessions.updatedAt));
  }

  async createChatSession(session: InsertChatSession): Promise<ChatSession> {
    // First deactivate all other sessions for this user
    await db
      .update(chatSessions)
      .set({ isActive: false })
      .where(eq(chatSessions.userId, session.userId));

    const [chatSession] = await db
      .insert(chatSessions)
      .values({ ...session, isActive: true })
      .returning();
    return chatSession;
  }

  async getActiveSession(userId: string): Promise<ChatSession | undefined> {
    const [session] = await db
      .select()
      .from(chatSessions)
      .where(and(
        eq(chatSessions.userId, userId),
        eq(chatSessions.isActive, true)
      ))
      .orderBy(desc(chatSessions.updatedAt));
    return session;
  }

  async setActiveSession(userId: string, sessionId: number): Promise<void> {
    // Deactivate all other sessions
    await db
      .update(chatSessions)
      .set({ isActive: false })
      .where(eq(chatSessions.userId, userId));

    // Activate the selected session
    await db
      .update(chatSessions)
      .set({ isActive: true })
      .where(eq(chatSessions.id, sessionId));
  }

  async archiveSession(sessionId: number): Promise<void> {
    await db
      .update(chatSessions)
      .set({ isActive: false })
      .where(eq(chatSessions.id, sessionId));
  }

  // Chat message operations  
  async getChatMessages(userId: string, sessionId?: number): Promise<ChatMessage[]> {
    if (sessionId) {
      return await db
        .select()
        .from(chatMessages)
        .where(eq(chatMessages.sessionId, sessionId))
        .orderBy(chatMessages.timestamp)
        .limit(50);
    }

    // Get messages from active session
    const activeSession = await this.getActiveSession(userId);
    if (!activeSession) {
      return [];
    }

    return await db
      .select()
      .from(chatMessages)
      .where(eq(chatMessages.sessionId, activeSession.id))
      .orderBy(chatMessages.timestamp)
      .limit(50);
  }

  async getChatMessagesBySession(sessionId: number): Promise<ChatMessage[]> {
    return await db
      .select()
      .from(chatMessages)
      .where(eq(chatMessages.sessionId, sessionId))
      .orderBy(chatMessages.timestamp)
      .limit(50);
  }

  async createChatMessage(message: InsertChatMessage): Promise<ChatMessage> {
    const [newMessage] = await db.insert(chatMessages).values(message).returning();
    return newMessage;
  }

  async updateChatMessage(messageId: number, updates: Partial<InsertChatMessage>): Promise<ChatMessage> {
    const [updatedMessage] = await db
      .update(chatMessages)
      .set(updates)
      .where(eq(chatMessages.id, messageId))
      .returning();
    return updatedMessage;
  }

  async clearChatMessages(userId: string): Promise<void> {
    await db.delete(chatMessages).where(eq(chatMessages.userId, userId));
  }

  async searchChatMessages(userId: string, query: string): Promise<ChatMessage[]> {
    return await db
      .select()
      .from(chatMessages)
      .where(
        and(
          eq(chatMessages.userId, userId),
          sql`${chatMessages.message} ILIKE ${'%' + query + '%'}`
        )
      )
      .orderBy(desc(chatMessages.timestamp))
      .limit(50);
  }

  // Voice agent operations
  async getVoiceAgents(): Promise<VoiceAgent[]> {
    return await db
      .select()
      .from(voiceAgents)
      .where(eq(voiceAgents.isActive, true));
  }

  async createVoiceAgent(agentData: any): Promise<VoiceAgent> {
    const [newAgent] = await db.insert(voiceAgents).values(agentData).returning();
    return newAgent;
  }

  async getVoiceAgentById(id: number): Promise<VoiceAgent | null> {
    const [agent] = await db
      .select()
      .from(voiceAgents)
      .where(eq(voiceAgents.id, id));
    return agent || null;
  }

  async updateVoiceAgent(id: number, updates: any): Promise<VoiceAgent> {
    const [updatedAgent] = await db
      .update(voiceAgents)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(voiceAgents.id, id))
      .returning();
    return updatedAgent;
  }

  async deleteVoiceAgent(id: number): Promise<void> {
    await db
      .update(voiceAgents)
      .set({ isActive: false })
      .where(eq(voiceAgents.id, id));
  }

  // Call log operations
  async getCallLogs(userId: string): Promise<CallLog[]> {
    return await db
      .select()
      .from(callLogs)
      .where(eq(callLogs.userId, userId))
      .orderBy(desc(callLogs.createdAt));
  }

  async createCallLog(callLog: any): Promise<CallLog> {
    const [newCallLog] = await db.insert(callLogs).values(callLog).returning();
    return newCallLog;
  }

  // Subscription operations
  async getSubscriptionStatus(userId: string): Promise<any> {
    const [user] = await db
      .select({
        subscriptionPlan: users.subscriptionPlan,
        subscriptionStatus: users.subscriptionStatus,
        aiMessagesUsed: users.aiMessagesUsed,
        voiceCallsUsed: users.voiceCallsUsed,
        monthlyResetDate: users.monthlyResetDate,
        subscriptionEndDate: users.subscriptionEndDate,
      })
      .from(users)
      .where(eq(users.id, userId));
    return user;
  }

  async getSubscriptionPlan(planId: string): Promise<any> {
    const [plan] = await db
      .select()
      .from(subscriptionPlans)
      .where(eq(subscriptionPlans.id, planId));
    return plan;
  }

  async getAllSubscriptionPlans(): Promise<any[]> {
    return await db
      .select()
      .from(subscriptionPlans)
      .where(eq(subscriptionPlans.isActive, true))
      .orderBy(subscriptionPlans.price);
  }

  async trackUsage(userId: string, type: string, description?: string): Promise<void> {
    await db.insert(usageTracking).values({
      userId,
      type,
      description,
    });

    // Update user usage counters
    const updateData: any = { updatedAt: new Date() };
    
    switch (type) {
      case 'ai_message':
        updateData.aiMessagesUsed = sql`${users.aiMessagesUsed} + 1`;
        break;
      case 'voice_call':
        updateData.voiceCallsUsed = sql`${users.voiceCallsUsed} + 1`;
        break;
    }

    await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, userId));
  }

  async checkUsageLimit(userId: string, type: string): Promise<{ allowed: boolean; message?: string; requiresPayment?: boolean; requiresUpgrade?: boolean }> {
    const userSub = await this.getSubscriptionStatus(userId);
    if (!userSub) return { allowed: false, message: "Subscription not found" };

    const plan = await this.getSubscriptionPlan(userSub.subscriptionPlan);
    if (!plan) return { allowed: false, message: "Subscription plan not found" };

    // Handle trial users - they get exactly 10 free AI messages
    if (userSub.subscriptionStatus === 'trial' || userSub.subscriptionStatus === 'trialing') {
      switch (type) {
        case 'ai_message':
          if (userSub.aiMessagesUsed >= 10) {
            return { 
              allowed: false, 
              message: "🚀 You've reached your 10-message trial limit! Upgrade to continue chatting with ARAS AI.", 
              requiresPayment: true,
              requiresUpgrade: true
            };
          }
          break;
        case 'voice_call':
          return { 
            allowed: false, 
            message: "Voice calls are not available during trial. Please upgrade to Starter plan.", 
            requiresPayment: true 
          };
      }
      return { allowed: true };
    }

    // Check subscription status for paid users
    if (userSub.subscriptionStatus !== 'active') {
      return { allowed: false, message: "Subscription is not active" };
    }

    // Check usage limits for active paid users
    switch (type) {
      case 'ai_message':
        if (plan.aiMessagesLimit && userSub.aiMessagesUsed >= plan.aiMessagesLimit) {
          return { 
            allowed: false, 
            message: `Monthly AI message limit (${plan.aiMessagesLimit}) reached. Please upgrade to a higher plan.`,
            requiresUpgrade: true
          };
        }
        break;
      case 'voice_call':
        if (plan.voiceCallsLimit && userSub.voiceCallsUsed >= plan.voiceCallsLimit) {
          return { 
            allowed: false, 
            message: `Monthly voice call limit (${plan.voiceCallsLimit}) reached. Please upgrade to a higher plan.`,
            requiresUpgrade: true
          };
        }
        break;
    }

    return { allowed: true };
  }

  async resetMonthlyUsage(userId: string): Promise<void> {
    const nextResetDate = new Date();
    nextResetDate.setMonth(nextResetDate.getMonth() + 1);

    await db
      .update(users)
      .set({
        aiMessagesUsed: 0,
        voiceCallsUsed: 0,
        monthlyResetDate: nextResetDate,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));
  }

  async updateUserProfile(userId: string, profileData: any): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ ...profileData, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async updateUserThread(userId: string, threadId: string): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ threadId, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async updateUserSubscription(userId: string, subscriptionData: any): Promise<void> {
    await db
      .update(users)
      .set({
        subscriptionPlan: subscriptionData.plan,
        subscriptionStatus: subscriptionData.status,
        stripeCustomerId: subscriptionData.stripeCustomerId,
        stripeSubscriptionId: subscriptionData.stripeSubscriptionId,
        subscriptionEndDate: subscriptionData.currentPeriodEnd ? 
          new Date(subscriptionData.currentPeriodEnd * 1000) : null,
        updatedAt: new Date()
      })
      .where(eq(users.id, userId));
  }

  async updateUserSubscriptionStatus(userId: string, status: string): Promise<void> {
    await db
      .update(users)
      .set({
        subscriptionStatus: status,
        updatedAt: new Date()
      })
      .where(eq(users.id, userId));
  }



  async deleteLead(leadId: number, userId: string): Promise<void> {
    await db
      .delete(leads)
      .where(and(eq(leads.id, leadId), eq(leads.userId, userId)));
  }

  async deleteCampaign(campaignId: number, userId: string): Promise<void> {
    await db
      .delete(campaigns)
      .where(and(eq(campaigns.id, campaignId), eq(campaigns.userId, userId)));
  }

  async getUsageHistory(userId: string): Promise<any[]> {
    return await db
      .select()
      .from(usageTracking)
      .where(eq(usageTracking.userId, userId))
      .orderBy(desc(usageTracking.createdAt));
  }

  async importLeads(userId: string, csvData: any[]): Promise<Lead[]> {
    const importedLeads = [];
    for (const leadData of csvData) {
      const lead = await this.createLead({ ...leadData, userId });
      importedLeads.push(lead);
    }
    return importedLeads;
  }

  async exportLeadsToCSV(leads: Lead[]): Promise<string> {
    const headers = ['Name', 'Phone', 'Email', 'Company', 'Status'];
    const rows = leads.map(lead => [
      lead.name,
      lead.phone || '',
      lead.email || '',
      lead.company || '',
      lead.status
    ]);
    
    const csvContent = [headers, ...rows]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');
    
    return csvContent;
  }

  async getDashboardAnalytics(userId: string): Promise<any> {
    const [leadsCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(leads)
      .where(eq(leads.userId, userId));

    const [campaignsCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(campaigns)
      .where(eq(campaigns.userId, userId));

    const [callsCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(callLogs)
      .where(eq(callLogs.userId, userId));

    return {
      totalLeads: leadsCount.count,
      totalCampaigns: campaignsCount.count,
      totalCalls: callsCount.count,
      conversionRate: 0.12,
    };
  }

  async getPerformanceAnalytics(userId: string, period: string): Promise<any> {
    const leads = await this.getLeads(userId);
    const callLogs = await this.getCallLogs(userId);
    
    return {
      period,
      totalLeads: leads.length,
      contactedLeads: callLogs.length,
      convertedLeads: leads.filter(l => l.status === 'hot').length,
      avgCallDuration: callLogs.reduce((acc, call) => acc + (call.duration || 0), 0) / callLogs.length || 0,
    };
  }

  async getUserSettings(userId: string): Promise<any> {
    return {
      notifications: true,
      autoCall: false,
      voiceSpeed: 'normal',
      language: 'en',
      timezone: 'UTC',
    };
  }

  async updateUserSettings(userId: string, settings: any): Promise<void> {
    // For now, this is a no-op. In the future, this would update a user_settings table
    console.log(`Updated settings for user ${userId}:`, settings);
  }

  // Twilio settings operations
  async getTwilioSettings(userId: string): Promise<{ configured: boolean; accountSid?: string; phoneNumber?: string }> {
    const [settings] = await db.select().from(twilioSettings).where(eq(twilioSettings.userId, userId));
    if (!settings) {
      return { configured: false };
    }
    return {
      configured: true,
      accountSid: settings.accountSid || undefined,
      phoneNumber: settings.phoneNumber || undefined,
    };
  }

  async getTwilioSettingsRaw(userId: string): Promise<{ accountSid: string; authToken: string; phoneNumber: string } | null> {
    const [settings] = await db.select().from(twilioSettings).where(eq(twilioSettings.userId, userId));
    if (!settings || !settings.configured) {
      return null;
    }
    return {
      accountSid: settings.accountSid || '',
      authToken: settings.authToken || '',
      phoneNumber: settings.phoneNumber || '',
    };
  }

  async saveTwilioSettings(userId: string, settingsData: { accountSid: string; authToken: string; phoneNumber: string }): Promise<void> {
    const existingSettings = await db.select().from(twilioSettings).where(eq(twilioSettings.userId, userId));
    
    if (existingSettings.length > 0) {
      await db
        .update(twilioSettings)
        .set({
          ...settingsData,
          configured: true,
          updatedAt: new Date(),
        })
        .where(eq(twilioSettings.userId, userId));
    } else {
      await db
        .insert(twilioSettings)
        .values({
          userId,
          ...settingsData,
          configured: true,
        });
    }
  }

  async deleteTwilioSettings(userId: string): Promise<void> {
    await db.delete(twilioSettings).where(eq(twilioSettings.userId, userId));
  }

  // Call management operations
  async updateCallLog(callId: number, updates: any): Promise<void> {
    await db
      .update(callLogs)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(callLogs.id, callId));
  }

  // Simple in-memory storage for call messages and interactions (could be moved to database in future)
  private callMessages = new Map<number, any>();
  private callInteractions = new Map<string, any[]>();

  // Token operations (deprecated - using subscription system)
  async getTokenBalance(userId: string): Promise<number> {
    return 0; // Deprecated
  }

  async createTokenTransaction(transaction: any): Promise<any> {
    return {}; // Deprecated
  }

  async getTokenTransactions(userId: string): Promise<any[]> {
    return []; // Deprecated
  }

  async updateTokenBalance(userId: string, amount: number): Promise<void> {
    // Deprecated
  }

  async addTokens(userId: string, amount: number): Promise<void> {
    // Deprecated
  }

  async storeCallMessage(callId: number, messageData: any): Promise<void> {
    this.callMessages.set(callId, messageData);
  }

  async getCallMessage(callId: string): Promise<any> {
    return this.callMessages.get(parseInt(callId)) || null;
  }

  async logCallInteraction(callId: string, interaction: any): Promise<void> {
    const interactions = this.callInteractions.get(callId) || [];
    interactions.push({ ...interaction, timestamp: new Date() });
    this.callInteractions.set(callId, interactions);
  }
}

// In-memory storage class for authentication without database dependency
export class MemStorage implements IStorage {
  private users = new Map<string, User>();
  private usersByUsername = new Map<string, User>();
  private leads = new Map<string, Lead[]>();
  private campaigns = new Map<string, Campaign[]>();
  private chatSessions = new Map<string, ChatSession[]>();
  private chatMessages = new Map<string, ChatMessage[]>();
  private callLogs = new Map<string, CallLog[]>();
  private callMessages = new Map<number, any>();
  private callInteractions = new Map<string, any[]>();
  private voiceAgentStorage: VoiceAgent[] | null = null;
  private voiceAgentCounter = 100;
  
  private generateId(): string {
    return Math.random().toString(36).substr(2, 9);
  }

  // User operations
  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return this.usersByUsername.get(username);
  }

  async createUser(userData: UpsertUser): Promise<User> {
    const id = userData.id || this.generateId();
    
    // Hash the password before storing it
    const hashedPassword = await hashPassword(userData.password);
    
    const user: User = {
      ...userData,
      id,
      password: hashedPassword,
      createdAt: new Date(),
      updatedAt: new Date(),
      subscriptionPlan: userData.subscriptionPlan || 'starter',
      subscriptionStatus: userData.subscriptionStatus || 'trial', // New users start with trial
      subscriptionStartDate: new Date(),
      subscriptionEndDate: null,
      trialStartDate: userData.trialStartDate || null,
      trialEndDate: userData.trialEndDate || null,
      trialMessagesUsed: userData.trialMessagesUsed || 0,
      hasPaymentMethod: userData.hasPaymentMethod || false,
      stripePaymentMethodId: userData.stripePaymentMethodId || null,
      aiMessagesUsed: 0,
      voiceCallsUsed: 0,
      monthlyResetDate: new Date(),
      threadId: null,
      assistantId: null,
      stripeCustomerId: null,
      stripeSubscriptionId: null,
      email: userData.email || null,
      firstName: userData.firstName || null,
      lastName: userData.lastName || null,
      profileImageUrl: null,
    };
    
    this.users.set(id, user);
    this.usersByUsername.set(userData.username, user);
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const existingUser = this.usersByUsername.get(userData.username);
    if (existingUser) {
      // Hash password if it's being updated
      const hashedPassword = userData.password ? await hashPassword(userData.password) : existingUser.password;
      const updatedUser = { 
        ...existingUser, 
        ...userData, 
        password: hashedPassword,
        updatedAt: new Date() 
      };
      this.users.set(existingUser.id, updatedUser);
      this.usersByUsername.set(userData.username, updatedUser);
      return updatedUser;
    }
    return this.createUser(userData);
  }

  async updateUserStripeInfo(userId: string, stripeInfo: { stripeCustomerId?: string; customerId?: string; subscriptionId?: string; paymentMethodId?: string; hasPaymentMethod?: boolean }): Promise<User> {
    const user = this.users.get(userId);
    if (!user) throw new Error('User not found');
    
    const updateData: any = {};

    if (stripeInfo.stripeCustomerId || stripeInfo.customerId) {
      updateData.stripeCustomerId = stripeInfo.stripeCustomerId || stripeInfo.customerId;
    }
    if (stripeInfo.subscriptionId !== undefined) {
      updateData.stripeSubscriptionId = stripeInfo.subscriptionId;
    }
    if (stripeInfo.paymentMethodId !== undefined) {
      updateData.stripePaymentMethodId = stripeInfo.paymentMethodId;
    }
    if (stripeInfo.hasPaymentMethod !== undefined) {
      updateData.hasPaymentMethod = stripeInfo.hasPaymentMethod;
    }

    const updatedUser = {
      ...user,
      ...updateData,
      updatedAt: new Date(),
    };
    this.users.set(userId, updatedUser);
    this.usersByUsername.set(user.username, updatedUser);
    return updatedUser;
  }

  async updateUserPlan(userId: string, plan: string): Promise<User> {
    const user = this.users.get(userId);
    if (!user) throw new Error('User not found');
    
    const updatedUser = { ...user, subscriptionPlan: plan, updatedAt: new Date() };
    this.users.set(userId, updatedUser);
    this.usersByUsername.set(user.username, updatedUser);
    return updatedUser;
  }

  async updateUserProfile(userId: string, profileData: any): Promise<User> {
    const user = this.users.get(userId);
    if (!user) throw new Error('User not found');
    
    const updatedUser = { ...user, ...profileData, updatedAt: new Date() };
    this.users.set(userId, updatedUser);
    this.usersByUsername.set(user.username, updatedUser);
    return updatedUser;
  }

  async updateUserThread(userId: string, threadId: string): Promise<User> {
    const user = this.users.get(userId);
    if (!user) throw new Error('User not found');
    
    const updatedUser = { ...user, threadId, updatedAt: new Date() };
    this.users.set(userId, updatedUser);
    this.usersByUsername.set(user.username, updatedUser);
    return updatedUser;
  }

  // Subscription operations
  async getSubscriptionStatus(userId: string): Promise<any> {
    const user = this.users.get(userId);
    if (!user) return null;
    
    return {
      subscriptionPlan: user.subscriptionPlan,
      subscriptionStatus: user.subscriptionStatus,
      aiMessagesUsed: user.aiMessagesUsed,
      voiceCallsUsed: user.voiceCallsUsed,
      monthlyResetDate: user.monthlyResetDate,
      subscriptionEndDate: user.subscriptionEndDate,
    };
  }

  async getSubscriptionPlan(planId: string): Promise<any> {
    // Mock subscription plans
    const plans = {
      starter: {
        id: 'starter',
        name: 'Starter',
        price: 2900,
        aiMessagesLimit: 100,
        voiceCallsLimit: 10,
        leadsLimit: 500,
        campaignsLimit: 5,
        features: ['AI Chat', 'Voice Calls', 'Lead Management'],
        isActive: true,
      },
      professional: {
        id: 'professional',
        name: 'Professional', 
        price: 9900,
        aiMessagesLimit: 500,
        voiceCallsLimit: 50,
        leadsLimit: 2500,
        campaignsLimit: 25,
        features: ['AI Chat', 'Voice Calls', 'Lead Management', 'Analytics'],
        isActive: true,
      },
      enterprise: {
        id: 'enterprise',
        name: 'Enterprise',
        price: 29900,
        aiMessagesLimit: null, // unlimited
        voiceCallsLimit: null, // unlimited
        leadsLimit: null, // unlimited
        campaignsLimit: null, // unlimited
        features: ['AI Chat', 'Voice Calls', 'Lead Management', 'Analytics', 'Priority Support'],
        isActive: true,
      },
    };
    return plans[planId as keyof typeof plans];
  }

  async getAllSubscriptionPlans(): Promise<any[]> {
    return [
      await this.getSubscriptionPlan('starter'),
      await this.getSubscriptionPlan('professional'), 
      await this.getSubscriptionPlan('enterprise'),
    ];
  }

  async updateUserSubscription(userId: string, subscriptionData: any): Promise<void> {
    const user = this.users.get(userId);
    if (!user) throw new Error('User not found');
    
    const updatedUser = {
      ...user,
      subscriptionPlan: subscriptionData.plan,
      subscriptionStatus: subscriptionData.status,
      stripeCustomerId: subscriptionData.stripeCustomerId,
      stripeSubscriptionId: subscriptionData.stripeSubscriptionId,
      subscriptionEndDate: subscriptionData.currentPeriodEnd ? 
        new Date(subscriptionData.currentPeriodEnd * 1000) : null,
      updatedAt: new Date()
    };
    this.users.set(userId, updatedUser);
    this.usersByUsername.set(user.username, updatedUser);
  }

  async updateUserSubscriptionStatus(userId: string, status: string): Promise<void> {
    const user = this.users.get(userId);
    if (!user) throw new Error('User not found');
    
    const updatedUser = { ...user, subscriptionStatus: status, updatedAt: new Date() };
    this.users.set(userId, updatedUser);
    this.usersByUsername.set(user.username, updatedUser);
  }

  async trackUsage(userId: string, type: string, description?: string): Promise<void> {
    const user = this.users.get(userId);
    if (!user) return;
    
    let updatedUser = { ...user };
    switch (type) {
      case 'ai_message':
        updatedUser.aiMessagesUsed = (user.aiMessagesUsed || 0) + 1;
        break;
      case 'voice_call':
        updatedUser.voiceCallsUsed = (user.voiceCallsUsed || 0) + 1;
        break;
    }
    updatedUser.updatedAt = new Date();
    
    this.users.set(userId, updatedUser);
    this.usersByUsername.set(user.username, updatedUser);
  }

  async checkUsageLimit(userId: string, type: string): Promise<{ allowed: boolean; message?: string; requiresPayment?: boolean; requiresUpgrade?: boolean }> {
    const userSub = await this.getSubscriptionStatus(userId);
    if (!userSub) return { allowed: false, message: "Subscription not found" };

    const plan = await this.getSubscriptionPlan(userSub.subscriptionPlan);
    if (!plan) return { allowed: false, message: "Subscription plan not found" };

    // Handle trial users - they get exactly 10 free AI messages
    if (userSub.subscriptionStatus === 'trial' || userSub.subscriptionStatus === 'trialing') {
      switch (type) {
        case 'ai_message':
          if (userSub.aiMessagesUsed >= 10) {
            return { 
              allowed: false, 
              message: "🚀 You've reached your 10-message trial limit! Upgrade to continue chatting with ARAS AI.", 
              requiresPayment: true,
              requiresUpgrade: true
            };
          }
          break;
        case 'voice_call':
          return { 
            allowed: false, 
            message: "Voice calls are not available during trial. Please upgrade to Starter plan.", 
            requiresPayment: true 
          };
      }
      return { allowed: true };
    }

    // Check subscription status for paid users
    if (userSub.subscriptionStatus !== 'active') {
      return { allowed: false, message: "Subscription is not active" };
    }

    // Check usage limits for active paid users
    switch (type) {
      case 'ai_message':
        if (plan.aiMessagesLimit && userSub.aiMessagesUsed >= plan.aiMessagesLimit) {
          return { 
            allowed: false, 
            message: `Monthly AI message limit (${plan.aiMessagesLimit}) reached. Please upgrade to a higher plan.`,
            requiresUpgrade: true
          };
        }
        break;
      case 'voice_call':
        if (plan.voiceCallsLimit && userSub.voiceCallsUsed >= plan.voiceCallsLimit) {
          return { 
            allowed: false, 
            message: `Monthly voice call limit (${plan.voiceCallsLimit}) reached. Please upgrade to a higher plan.`,
            requiresUpgrade: true
          };
        }
        break;
    }

    return { allowed: true };
  }

  async resetMonthlyUsage(userId: string): Promise<void> {
    const user = this.users.get(userId);
    if (!user) return;
    
    const nextResetDate = new Date();
    nextResetDate.setMonth(nextResetDate.getMonth() + 1);
    
    const updatedUser = {
      ...user,
      aiMessagesUsed: 0,
      voiceCallsUsed: 0,
      monthlyResetDate: nextResetDate,
      updatedAt: new Date(),
    };
    this.users.set(userId, updatedUser);
    this.usersByUsername.set(user.username, updatedUser);
  }

  async startUserTrial(userId: string, trialData: { paymentMethodId: string; trialEndDate: string; hasPaymentMethod: boolean }): Promise<User> {
    const user = this.users.get(userId);
    if (!user) throw new Error('User not found');
    
    const updatedUser = {
      ...user,
      stripePaymentMethodId: trialData.paymentMethodId,
      trialStartDate: new Date(),
      trialEndDate: new Date(trialData.trialEndDate),
      hasPaymentMethod: trialData.hasPaymentMethod,
      subscriptionStatus: 'trialing' as any,
      updatedAt: new Date(),
    };
    
    this.users.set(userId, updatedUser);
    this.usersByUsername.set(user.username, updatedUser);
    return updatedUser;
  }

  // Stub implementations for other operations
  async getLeads(userId: string): Promise<Lead[]> {
    return this.leads.get(userId) || [];
  }

  async createLead(lead: InsertLead): Promise<Lead> {
    const newLead: Lead = {
      ...lead,
      id: parseInt(this.generateId(), 36),
      createdAt: new Date(),
      updatedAt: new Date(),
      status: lead.status || 'cold',
      lastContact: null,
      notes: null,
      email: lead.email || null,
      phone: lead.phone || null,
      company: lead.company || null,
    };
    
    const userLeads = this.leads.get(lead.userId) || [];
    userLeads.push(newLead);
    this.leads.set(lead.userId, userLeads);
    return newLead;
  }

  async updateLead(id: number, updates: Partial<InsertLead>): Promise<Lead> {
    // Find and update lead across all users
    for (const [userId, userLeads] of Array.from(this.leads.entries())) {
      const leadIndex = userLeads.findIndex((l: Lead) => l.id === id);
      if (leadIndex !== -1) {
        const updatedLead = { ...userLeads[leadIndex], ...updates, updatedAt: new Date() };
        userLeads[leadIndex] = updatedLead;
        this.leads.set(userId, userLeads);
        return updatedLead;
      }
    }
    throw new Error('Lead not found');
  }

  async deleteLead(leadId: number, userId: string): Promise<void> {
    const userLeads = this.leads.get(userId) || [];
    const filteredLeads = userLeads.filter(l => l.id !== leadId);
    this.leads.set(userId, filteredLeads);
  }

  async importLeads(userId: string, csvData: any[]): Promise<Lead[]> {
    const importedLeads = [];
    for (const leadData of csvData) {
      const lead = await this.createLead({ ...leadData, userId });
      importedLeads.push(lead);
    }
    return importedLeads;
  }

  async exportLeadsToCSV(leads: Lead[]): Promise<string> {
    const headers = ['Name', 'Phone', 'Email', 'Company', 'Status'];
    const rows = leads.map(lead => [
      lead.name,
      lead.phone || '',
      lead.email || '',
      lead.company || '',
      lead.status
    ]);
    
    const csvContent = [headers, ...rows]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');
    
    return csvContent;
  }

  // Implement remaining interface methods with stubs
  async getCampaigns(userId: string): Promise<Campaign[]> {
    return this.campaigns.get(userId) || [];
  }

  async createCampaign(campaign: InsertCampaign): Promise<Campaign> {
    const newCampaign: Campaign = {
      ...campaign,
      id: parseInt(this.generateId(), 36),
      createdAt: new Date(),
      updatedAt: new Date(),
      status: campaign.status || 'draft',
      totalLeads: 0,
      contacted: 0,
      converted: 0,
      description: campaign.description || null,
    };
    
    const userCampaigns = this.campaigns.get(campaign.userId) || [];
    userCampaigns.push(newCampaign);
    this.campaigns.set(campaign.userId, userCampaigns);
    return newCampaign;
  }

  async updateCampaign(id: number, updates: Partial<InsertCampaign>): Promise<Campaign> {
    for (const [userId, userCampaigns] of Array.from(this.campaigns.entries())) {
      const campaignIndex = userCampaigns.findIndex((c: Campaign) => c.id === id);
      if (campaignIndex !== -1) {
        const updatedCampaign = { ...userCampaigns[campaignIndex], ...updates, updatedAt: new Date() };
        userCampaigns[campaignIndex] = updatedCampaign;
        this.campaigns.set(userId, userCampaigns);
        return updatedCampaign;
      }
    }
    throw new Error('Campaign not found');
  }

  async deleteCampaign(campaignId: number, userId: string): Promise<void> {
    const userCampaigns = this.campaigns.get(userId) || [];
    const filteredCampaigns = userCampaigns.filter(c => c.id !== campaignId);
    this.campaigns.set(userId, filteredCampaigns);
  }

  async getChatSessions(userId: string): Promise<ChatSession[]> {
    return this.chatSessions.get(userId) || [];
  }

  async createChatSession(session: InsertChatSession): Promise<ChatSession> {
    const newSession: ChatSession = {
      ...session,
      id: parseInt(this.generateId(), 36),
      createdAt: new Date(),
      updatedAt: new Date(),
      title: session.title || 'New Chat',
      isActive: true,
    };
    
    // Deactivate other sessions
    const userSessions = this.chatSessions.get(session.userId) || [];
    userSessions.forEach(s => s.isActive = false);
    userSessions.push(newSession);
    this.chatSessions.set(session.userId, userSessions);
    return newSession;
  }

  async getActiveSession(userId: string): Promise<ChatSession | undefined> {
    const userSessions = this.chatSessions.get(userId) || [];
    return userSessions.find(s => s.isActive);
  }

  async setActiveSession(userId: string, sessionId: number): Promise<void> {
    const userSessions = this.chatSessions.get(userId) || [];
    userSessions.forEach(s => s.isActive = s.id === sessionId);
    this.chatSessions.set(userId, userSessions);
  }

  async archiveSession(sessionId: number): Promise<void> {
    for (const [userId, userSessions] of Array.from(this.chatSessions.entries())) {
      const session = userSessions.find((s: ChatSession) => s.id === sessionId);
      if (session) {
        session.isActive = false;
        this.chatSessions.set(userId, userSessions);
        break;
      }
    }
  }

  async getChatMessages(userId: string, sessionId?: number): Promise<ChatMessage[]> {
    return this.chatMessages.get(userId) || [];
  }

  async getChatMessagesBySession(sessionId: number): Promise<ChatMessage[]> {
    for (const [userId, messages] of Array.from(this.chatMessages.entries())) {
      const sessionMessages = messages.filter((m: ChatMessage) => m.sessionId === sessionId);
      if (sessionMessages.length > 0) return sessionMessages;
    }
    return [];
  }

  async createChatMessage(message: InsertChatMessage): Promise<ChatMessage> {
    const newMessage: ChatMessage = {
      ...message,
      id: parseInt(this.generateId(), 36),
      timestamp: new Date(),
      isAi: message.isAi || false,
      sessionId: message.sessionId || null,
    };
    
    const userMessages = this.chatMessages.get(message.userId) || [];
    userMessages.push(newMessage);
    this.chatMessages.set(message.userId, userMessages);
    return newMessage;
  }

  async updateChatMessage(messageId: number, updates: Partial<InsertChatMessage>): Promise<ChatMessage> {
    for (const [userId, userMessages] of Array.from(this.chatMessages.entries())) {
      const messageIndex = userMessages.findIndex((m: ChatMessage) => m.id === messageId);
      if (messageIndex !== -1) {
        const updatedMessage = { ...userMessages[messageIndex], ...updates };
        userMessages[messageIndex] = updatedMessage;
        this.chatMessages.set(userId, userMessages);
        return updatedMessage;
      }
    }
    throw new Error('Message not found');
  }

  async clearChatMessages(userId: string): Promise<void> {
    this.chatMessages.set(userId, []);
  }

  async searchChatMessages(userId: string, query: string): Promise<ChatMessage[]> {
    const userMessages = this.chatMessages.get(userId) || [];
    return userMessages.filter(m => m.message.toLowerCase().includes(query.toLowerCase()));
  }

  async getVoiceAgents(): Promise<VoiceAgent[]> {
    if (this.voiceAgentStorage) {
      return this.voiceAgentStorage;
    }
    
    return [
      {
        id: 1,
        name: 'Alex Chen',
        description: 'Professional sales agent with friendly demeanor',
        voice: 'professional',
        personality: 'A warm, professional sales agent who builds rapport quickly and focuses on understanding customer needs. Speaks clearly and confidently.',
        customScript: 'Hello! This is Alex from your sales team. I hope you\'re having a great day. I\'m calling to follow up on your recent interest in our services.',
        ttsVoice: 'nova',
        language: 'en',
        industry: 'general',
        userId: null,
        isSystemAgent: true,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 2,
        name: 'Sarah Mitchell',
        description: 'Expert business development specialist',
        voice: 'authoritative',
        personality: 'A confident, authoritative business development expert who takes charge of conversations and demonstrates deep industry knowledge.',
        customScript: 'Good day! This is Sarah Mitchell, your business development specialist. I\'m reaching out regarding the strategic opportunities we discussed.',
        ttsVoice: 'alloy',
        language: 'en',
        industry: 'business',
        userId: null,
        isSystemAgent: true,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 3,
        name: 'David Rodriguez',
        description: 'Senior sales executive with consultative approach',
        voice: 'friendly',
        personality: 'A friendly, consultative senior executive who listens carefully and provides thoughtful, personalized solutions.',
        customScript: 'Hi there! David Rodriguez here. I wanted to personally reach out to discuss how we can best serve your specific needs.',
        ttsVoice: 'onyx',
        language: 'en',
        industry: 'enterprise',
        userId: null,
        isSystemAgent: true,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];
  }

  async getCallLogs(userId: string): Promise<CallLog[]> {
    return this.callLogs.get(userId) || [];
  }

  async createCallLog(callLog: any): Promise<CallLog> {
    const newCallLog: CallLog = {
      ...callLog,
      id: parseInt(this.generateId(), 36),
      createdAt: new Date(),
      status: callLog.status || 'initiated',
      duration: callLog.duration || null,
      transcript: callLog.transcript || null,
    };
    
    const userCallLogs = this.callLogs.get(callLog.userId) || [];
    userCallLogs.push(newCallLog);
    this.callLogs.set(callLog.userId, userCallLogs);
    return newCallLog;
  }

  // Voice agent CRUD operations
  async createVoiceAgent(agentData: any): Promise<VoiceAgent> {
    const newAgent: VoiceAgent = {
      ...agentData,
      id: this.voiceAgentCounter++,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    const allAgents = await this.getVoiceAgents();
    allAgents.push(newAgent);
    
    // Update in-memory collection by overriding default data
    this.voiceAgentStorage = allAgents;
    return newAgent;
  }

  async getVoiceAgentById(id: number): Promise<VoiceAgent | null> {
    const agents = await this.getVoiceAgents();
    return agents.find(agent => agent.id === id) || null;
  }

  async updateVoiceAgent(id: number, updates: any): Promise<VoiceAgent> {
    const agents = await this.getVoiceAgents();
    const agentIndex = agents.findIndex(agent => agent.id === id);
    
    if (agentIndex === -1) {
      throw new Error('Voice agent not found');
    }
    
    agents[agentIndex] = {
      ...agents[agentIndex],
      ...updates,
      updatedAt: new Date(),
    };
    
    this.voiceAgentStorage = agents;
    return agents[agentIndex];
  }

  async deleteVoiceAgent(id: number): Promise<void> {
    const agents = await this.getVoiceAgents();
    const filteredAgents = agents.filter(agent => agent.id !== id);
    this.voiceAgentStorage = filteredAgents;
  }

  // Token operations (deprecated)
  async getTokenBalance(userId: string): Promise<number> {
    return 0;
  }

  async createTokenTransaction(transaction: any): Promise<any> {
    return {};
  }

  async getTokenTransactions(userId: string): Promise<any[]> {
    return [];
  }

  async updateTokenBalance(userId: string, amount: number): Promise<void> {
    // Deprecated
  }

  async addTokens(userId: string, amount: number): Promise<void> {
    // Deprecated
  }

  async getUsageHistory(userId: string): Promise<any[]> {
    return [];
  }

  async getDashboardAnalytics(userId: string): Promise<any> {
    const leads = await this.getLeads(userId);
    const campaigns = await this.getCampaigns(userId);
    const callLogs = await this.getCallLogs(userId);
    
    return {
      totalLeads: leads.length,
      totalCampaigns: campaigns.length,
      totalCalls: callLogs.length,
      conversionRate: 0.12,
    };
  }

  async getPerformanceAnalytics(userId: string, period: string): Promise<any> {
    const leads = await this.getLeads(userId);
    const callLogs = await this.getCallLogs(userId);
    
    return {
      period,
      totalLeads: leads.length,
      contactedLeads: callLogs.length,
      convertedLeads: leads.filter(l => l.status === 'hot').length,
      avgCallDuration: callLogs.reduce((acc, call) => acc + (call.duration || 0), 0) / callLogs.length || 0,
    };
  }

  async getUserSettings(userId: string): Promise<any> {
    return {
      notifications: true,
      autoCall: false,
      voiceSpeed: 'normal',
      language: 'en',
      timezone: 'UTC',
    };
  }

  async updateUserSettings(userId: string, settings: any): Promise<void> {
    console.log(`Updated settings for user ${userId}:`, settings);
  }

  async getTwilioSettings(userId: string): Promise<{ configured: boolean; accountSid?: string; phoneNumber?: string }> {
    return { configured: false };
  }

  async getTwilioSettingsRaw(userId: string): Promise<{ accountSid: string; authToken: string; phoneNumber: string } | null> {
    return null;
  }

  async saveTwilioSettings(userId: string, settings: { accountSid: string; authToken: string; phoneNumber: string }): Promise<void> {
    console.log(`Saved Twilio settings for user ${userId}`);
  }

  async deleteTwilioSettings(userId: string): Promise<void> {
    console.log(`Deleted Twilio settings for user ${userId}`);
  }

  async updateCallLog(callId: number, updates: any): Promise<void> {
    for (const [userId, userCallLogs] of Array.from(this.callLogs.entries())) {
      const callLogIndex = userCallLogs.findIndex((c: CallLog) => c.id === callId);
      if (callLogIndex !== -1) {
        userCallLogs[callLogIndex] = { ...userCallLogs[callLogIndex], ...updates };
        this.callLogs.set(userId, userCallLogs);
        break;
      }
    }
  }

  async storeCallMessage(callId: number, messageData: any): Promise<void> {
    this.callMessages.set(callId, messageData);
  }

  async getCallMessage(callId: string): Promise<any> {
    return this.callMessages.get(parseInt(callId)) || null;
  }

  async logCallInteraction(callId: string, interaction: any): Promise<void> {
    const interactions = this.callInteractions.get(callId) || [];
    interactions.push({ ...interaction, timestamp: new Date() });
    this.callInteractions.set(callId, interactions);
  }
}

// Use database storage for persistent data
export const storage = new DatabaseStorage();
