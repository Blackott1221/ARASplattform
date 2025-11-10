import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { db, client } from "./db";
import { subscriptionPlans } from "@shared/schema";

const app = express();
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: false }));

// Serve static files from attached_assets
app.use('/attached_assets', express.static('attached_assets'));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

// Seed subscription plans on startup
async function seedSubscriptionPlans() {
  try {
    const PLANS = [
      {
        id: "free",
        name: "ARAS Free – Discover Mode",
        price: 0,
        aiMessagesLimit: 10,
        voiceCallsLimit: 2,
        leadsLimit: 50,
        campaignsLimit: 1,
        features: [
          "2 kostenlose Outbound Calls",
          "10 freie Chatnachrichten",
          "Zugriff auf die ARAS-Konsole (Basic)",
          "Basis-Statistiken zu Gesprächsdauer und Erfolgsquote",
          "Dauerhaft kostenlos, keine Zahlungsdaten erforderlich"
        ],
        stripePriceId: null,
        stripeProductId: null,
        isActive: true
      },
      {
        id: "pro",
        name: "ARAS Pro – Growth Mode",
        price: 5900, // €59.00
        aiMessagesLimit: 500,
        voiceCallsLimit: 100,
        leadsLimit: 500,
        campaignsLimit: 10,
        features: [
          "100 Outbound Calls pro Monat",
          "500 Chatnachrichten pro Monat",
          "Integration mit Make, Zapier oder n8n",
          "Live-Dashboard mit Erfolgsquote und Performance-Daten",
          "E-Mail-Support (Antwort innerhalb von 24 Stunden)"
        ],
        stripePriceId: process.env.STRIPE_PRICE_ID_PRO || null,
        stripeProductId: process.env.STRIPE_PRODUCT_ID_PRO || null,
        isActive: true
      },
      {
        id: "ultra",
        name: "ARAS Ultra – Performance Mode",
        price: 24900, // €249.00
        aiMessagesLimit: 10000,
        voiceCallsLimit: 1000,
        leadsLimit: 5000,
        campaignsLimit: 50,
        features: [
          "1.000 Outbound Calls pro Monat",
          "10.000 Chatnachrichten pro Monat",
          "Zugriff auf das erweiterte ARAS Voice Model",
          "Mehrbenutzerzugang (bis zu 5 Teammitglieder)",
          "Erweiterte Analysen (Emotion, Conversion, KPI-Tracking)",
          "Priorisierter Support (Antwort innerhalb von 6 Stunden)",
          "Zugang zum ARAS Partner-Netzwerk"
        ],
        stripePriceId: process.env.STRIPE_PRICE_ID_ULTRA || null,
        stripeProductId: process.env.STRIPE_PRODUCT_ID_ULTRA || null,
        isActive: true
      },
      {
        id: "ultimate",
        name: "ARAS Ultimate – Enterprise Mode",
        price: 199000, // €1990.00
        aiMessagesLimit: null, // unlimited
        voiceCallsLimit: 10000,
        leadsLimit: null,
        campaignsLimit: null,
        features: [
          "10.000 Outbound Calls pro Monat",
          "Unbegrenzte Chatnachrichten",
          "Zugriff auf das dedizierte ARAS Enterprise-LLM",
          "API- und CRM-Integrationen (Salesforce, HubSpot, Bitrix24 u.a.)",
          "Swiss Data Hosting – DSGVO-, ISO- und SOC2-zertifiziert",
          "24/7 Premium-Support mit persönlichem Account Manager",
          "Early Access zu neuen Modulen (Voice2Action, Memory, Multi-LLM)"
        ],
        stripePriceId: process.env.STRIPE_PRICE_ID_ULTIMATE || null,
        stripeProductId: process.env.STRIPE_PRODUCT_ID_ULTIMATE || null,
        isActive: true
      }
    ];

    for (const plan of PLANS) {
      await db
        .insert(subscriptionPlans)
        .values(plan)
        .onConflictDoUpdate({
          target: subscriptionPlans.id,
          set: {
            name: plan.name,
            price: plan.price,
            aiMessagesLimit: plan.aiMessagesLimit,
            voiceCallsLimit: plan.voiceCallsLimit,
            leadsLimit: plan.leadsLimit,
            campaignsLimit: plan.campaignsLimit,
            features: plan.features,
            stripePriceId: plan.stripePriceId,
            stripeProductId: plan.stripeProductId,
            isActive: plan.isActive
          }
        });
    }
    
    log("✅ Subscription plans seeded successfully");
  } catch (error: any) {
    log("⚠️  Error seeding plans (table may not exist yet):", error);
  }
}

(async () => {
  // Seed subscription plans
  await seedSubscriptionPlans();
  
  // Add migration endpoint (temporary - can be removed after migration)
  // Support both GET and POST since browsers default to GET
  const migrationHandler = async (req: any, res: Response) => {
    try {
      log('[ADMIN] Starting plan migration...');
      
      // First, check how many users need migration
      const usersToMigrate = await client`
        SELECT id, username, subscription_plan 
        FROM users 
        WHERE subscription_plan IN ('starter', 'enterprise')
      `;
      
      log(`[ADMIN] Found ${usersToMigrate.length} users to migrate`);
      
      if (usersToMigrate.length === 0) {
        return res.json({
          success: true,
          message: 'No users need migration',
          users: []
        });
      }
      
      // Perform the migration
      const result = await client`
        UPDATE users
        SET subscription_plan = 
          CASE subscription_plan
            WHEN 'starter' THEN 'free'
            WHEN 'enterprise' THEN 'ultimate'
            ELSE subscription_plan
          END,
          updated_at = NOW()
        WHERE subscription_plan IN ('starter', 'enterprise')
        RETURNING id, username, subscription_plan
      `;
      
      log(`[ADMIN] Successfully migrated ${result.length} users`);
      
      res.json({
        success: true,
        message: `Successfully migrated ${result.length} users from old plans to new plans`,
        users: result.map((u: any) => ({
          id: u.id,
          username: u.username,
          newPlan: u.subscription_plan
        }))
      });
    } catch (error: any) {
      log('[ADMIN] Error migrating plans:', error);
      res.status(500).json({ 
        error: 'Migration failed',
        details: error.message 
      });
    }
  };
  
  // Register for both GET and POST
  app.get('/api/admin/migrate-plans-now', migrationHandler);
  app.post('/api/admin/migrate-plans-now', migrationHandler);
  
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on port 5000
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = 5000;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();
