import express from "express";
import OpenAI from "openai";
import { greetingTemplate } from "../arasPrompts";
import { storage } from "./storage";

const router = express.Router();
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Session-based auth middleware (matches main app)
function requireAuth(req: any, res: any, next: any) {
  if (!req.session?.userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  next();
}

router.post("/chat", requireAuth, async (req, res) => {
  try {
    const { message } = req.body;
    const userId = (req as any).session.userId;

    if (!message) {
      return res.json({ reply: greetingTemplate });
    }

    // Get user from storage using session
    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    // Check trial limits for trial users (both "trial" and "trialing" status)
    if (user.subscriptionStatus === "trial" || user.subscriptionStatus === "trialing") {
      if (user.aiMessagesUsed >= 10) {
        return res.status(402).json({ 
          reply: "🚀 You've reached your 10-message trial limit! Upgrade to Starter plan to continue chatting with ARAS AI.",
          trialExpired: true,
          requiresUpgrade: true
        });
      }
    }

    // Check if required environment variables are set
    if (!process.env.OPENAI_API_KEY || !process.env.OPENAI_ASSISTANT_ID) {
      return res.status(500).json({ 
        reply: "⚠️ ARAS configuration is incomplete. Please check API key and Assistant ID." 
      });
    }

    // Create a new thread
    const thread = await client.beta.threads.create();

    // Add the user message to the thread
    await client.beta.threads.messages.create(thread.id, {
      role: "user",
      content: message,
    });

    // Run the assistant
    const run = await client.beta.threads.runs.create(thread.id, {
      assistant_id: process.env.OPENAI_ASSISTANT_ID!,
    });

    // Wait for the run to complete
    let runStatus = await client.beta.threads.runs.retrieve(thread.id, run.id);
    
    while (runStatus.status === "queued" || runStatus.status === "in_progress") {
      await new Promise(resolve => setTimeout(resolve, 1000));
      runStatus = await client.beta.threads.runs.retrieve(thread.id, run.id);
    }

    if (runStatus.status === "completed") {
      // Get the assistant's messages
      const messages = await client.beta.threads.messages.list(thread.id);
      const assistantMessage = messages.data.find(
        (msg) => msg.role === "assistant" && msg.run_id === run.id
      );

      if (assistantMessage && assistantMessage.content[0].type === "text") {
        const reply = assistantMessage.content[0].text.value;
        
        // Increment message count for trial users
        if (user.subscriptionStatus === "trial" || user.subscriptionStatus === "trialing") {
          await storage.updateUser(user.id, {
            aiMessagesUsed: user.aiMessagesUsed + 1
          });
        }
        
        return res.json({ reply });
      }
    }

    // Handle failed runs or other issues
    res.status(500).json({ 
      reply: "⚠️ ARAS encountered an issue processing your request. Please try again." 
    });

  } catch (err) {
    console.error("Assistant API error:", err);
    res.status(500).json({ reply: "⚠️ ARAS encountered an error. Please check configuration." });
  }
});

export default router;