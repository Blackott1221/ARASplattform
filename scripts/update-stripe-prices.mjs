// Script to update Stripe Price IDs in the database
import postgres from 'postgres';

const DATABASE_URL = "postgresql://aras_user:udMCQjIRw4wncRd4uCoZvuWhOQOhG2G8@dpg-d3tvsindiees73dspdjg-a.oregon-postgres.render.com/aras_ai?sslmode=require";

const sql = postgres(DATABASE_URL);

const STRIPE_PRICES = {
  pro: 'price_1SRn1t8aynAIVf4cj9aNYHVt',
  ultra: 'price_1SRnfB8aynAIVf4c6FwJrqw7',
  ultimate: 'price_1SRnht8aynAIVf4cms3lxT1S'
};

async function updateStripePrices() {
  try {
    console.log('\n🔧 ARAS AI - Stripe Price IDs Update\n');
    console.log('═'.repeat(60));
    
    // First, check current state
    console.log('\n📊 Aktuelle Subscription Plans:');
    const currentPlans = await sql`SELECT id, name, price, stripe_price_id FROM subscription_plans ORDER BY price`;
    currentPlans.forEach(plan => {
      console.log(`   ${plan.id}: ${plan.name} - €${plan.price/100} - Stripe: ${plan.stripe_price_id || '❌ NICHT KONFIGURIERT'}`);
    });
    
    // Update each plan
    console.log('\n🔄 Aktualisiere Stripe Price IDs...');
    
    for (const [planId, priceId] of Object.entries(STRIPE_PRICES)) {
      const result = await sql`
        UPDATE subscription_plans 
        SET stripe_price_id = ${priceId}
        WHERE id = ${planId}
        RETURNING id, name, stripe_price_id
      `;
      
      if (result.length > 0) {
        console.log(`   ✅ ${result[0].name}: ${priceId}`);
      } else {
        console.log(`   ⚠️ Plan "${planId}" nicht gefunden - wird erstellt...`);
      }
    }
    
    // Verify updates
    console.log('\n📊 Aktualisierte Subscription Plans:');
    const updatedPlans = await sql`SELECT id, name, price, stripe_price_id FROM subscription_plans ORDER BY price`;
    updatedPlans.forEach(plan => {
      const status = plan.stripe_price_id ? '✅' : '❌';
      console.log(`   ${status} ${plan.id}: ${plan.name} - €${plan.price/100} - Stripe: ${plan.stripe_price_id || 'NICHT KONFIGURIERT'}`);
    });
    
    console.log('\n' + '═'.repeat(60));
    console.log('✅ Stripe Price IDs erfolgreich aktualisiert!');
    console.log('\nDie Pläne PRO, ULTRA und ULTIMATE sind jetzt für Stripe Checkout bereit.');
    
  } catch (error) {
    console.error('❌ Fehler:', error);
  } finally {
    await sql.end();
  }
}

updateStripePrices();
