// Quick script to get user statistics from the database
import 'dotenv/config';
import postgres from 'postgres';

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL nicht gefunden!');
  console.log('Bitte setze DATABASE_URL in .env oder als Umgebungsvariable');
  process.exit(1);
}

const sql = postgres(DATABASE_URL);

async function getUserStats() {
  try {
    console.log('\n🔍 ARAS AI - USER STATISTIKEN\n');
    console.log('═'.repeat(60));
    
    // Total Users
    const totalUsers = await sql`SELECT COUNT(*) as count FROM users`;
    console.log(`\n📊 GESAMT USER: ${totalUsers[0].count}`);
    
    // Plan Distribution
    console.log('\n📦 PLAN-VERTEILUNG:');
    const planDist = await sql`
      SELECT 
        COALESCE(subscription_plan, 'unknown') as plan, 
        COUNT(*) as count 
      FROM users 
      GROUP BY subscription_plan 
      ORDER BY count DESC
    `;
    planDist.forEach((row) => {
      console.log(`   - ${row.plan.toUpperCase()}: ${row.count} User`);
    });
    
    // Status Distribution
    console.log('\n🔄 STATUS-VERTEILUNG:');
    const statusDist = await sql`
      SELECT 
        COALESCE(subscription_status, 'unknown') as status, 
        COUNT(*) as count 
      FROM users 
      GROUP BY subscription_status 
      ORDER BY count DESC
    `;
    statusDist.forEach((row) => {
      console.log(`   - ${row.status}: ${row.count} User`);
    });
    
    // Usage Stats
    console.log('\n📈 NUTZUNGSSTATISTIKEN:');
    const usageStats = await sql`
      SELECT 
        SUM(COALESCE(ai_messages_used, 0)) as total_ai_messages,
        SUM(COALESCE(voice_calls_used, 0)) as total_voice_calls,
        AVG(COALESCE(ai_messages_used, 0))::int as avg_ai_messages,
        AVG(COALESCE(voice_calls_used, 0))::int as avg_voice_calls
      FROM users
    `;
    console.log(`   - Gesamt AI Messages: ${usageStats[0].total_ai_messages}`);
    console.log(`   - Gesamt Voice Calls: ${usageStats[0].total_voice_calls}`);
    console.log(`   - Durchschnitt AI/User: ${usageStats[0].avg_ai_messages}`);
    console.log(`   - Durchschnitt Calls/User: ${usageStats[0].avg_voice_calls}`);
    
    // All Users with details
    console.log('\n\n📋 ALLE USER IM DETAIL:');
    console.log('═'.repeat(60));
    const allUsers = await sql`
      SELECT 
        id, username, email, first_name, last_name,
        company, industry,
        subscription_plan, subscription_status,
        ai_messages_used, voice_calls_used,
        user_role,
        created_at
      FROM users 
      ORDER BY created_at DESC
    `;
    
    allUsers.forEach((user, i) => {
      const name = [user.first_name, user.last_name].filter(Boolean).join(' ') || user.username;
      console.log(`\n${i+1}. ${name}`);
      console.log(`   📧 ${user.email || 'Keine Email'}`);
      console.log(`   🏢 ${user.company || 'Keine Firma'} | ${user.industry || 'Keine Branche'}`);
      console.log(`   💳 Plan: ${(user.subscription_plan || 'free').toUpperCase()} | Status: ${user.subscription_status || 'unknown'}`);
      console.log(`   📊 AI: ${user.ai_messages_used || 0} Messages | Voice: ${user.voice_calls_used || 0} Calls`);
      console.log(`   🔐 Role: ${user.user_role || 'user'}`);
      console.log(`   📅 Seit: ${user.created_at ? new Date(user.created_at).toLocaleDateString('de-DE') : 'unknown'}`);
    });
    
    console.log('\n' + '═'.repeat(60));
    console.log('✅ Statistiken erfolgreich abgerufen!');
    
  } catch (error) {
    console.error('❌ Fehler:', error);
  } finally {
    await sql.end();
  }
}

getUserStats();
