import type { Request, Response, NextFunction } from "express";
import { storage } from "../storage";
import { checkUsageLimit } from "../usage-limits";
import { logger } from "../logger";

export async function checkCallLimit(req: any, res: Response, next: NextFunction) {
  try {
    const userId = req.session?.userId;
    
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const user = await storage.getUserById(userId);
    
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const { allowed, limit, remaining } = checkUsageLimit(
      user.subscriptionPlan || 'starter',
      user.voiceCallsUsed || 0,
      'calls'
    );

    if (!allowed && user.subscriptionPlan !== 'pro' && user.subscriptionPlan !== 'enterprise') {
      logger.warn(`[LIMIT] User ${user.username} reached call limit (${limit})`);
      return res.status(403).json({
        error: "Call limit reached",
        message: `You have reached your call limit of ${limit} calls. Please upgrade to continue.`,
        limit,
        used: user.voiceCallsUsed,
        plan: user.subscriptionPlan
      });
    }

    // Add limit info to request
    req.usageInfo = { allowed, limit, remaining };
    next();
  } catch (error) {
    logger.error("[LIMIT] Error checking call limit:", error);
    res.status(500).json({ error: "Failed to check usage limits" });
  }
}

export async function checkMessageLimit(req: any, res: Response, next: NextFunction) {
  try {
    const userId = req.session?.userId;
    
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const user = await storage.getUserById(userId);
    
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const { allowed, limit, remaining } = checkUsageLimit(
      user.subscriptionPlan || 'starter',
      user.aiMessagesUsed || 0,
      'messages'
    );

    if (!allowed && user.subscriptionPlan !== 'pro' && user.subscriptionPlan !== 'enterprise') {
      logger.warn(`[LIMIT] User ${user.username} reached message limit (${limit})`);
      return res.status(403).json({
        error: "Message limit reached",
        message: `You have reached your message limit of ${limit} messages. Please upgrade to continue.`,
        limit,
        used: user.aiMessagesUsed,
        plan: user.subscriptionPlan
      });
    }

    // Add limit info to request
    req.usageInfo = { allowed, limit, remaining };
    next();
  } catch (error) {
    logger.error("[LIMIT] Error checking message limit:", error);
    res.status(500).json({ error: "Failed to check usage limits" });
  }
}
