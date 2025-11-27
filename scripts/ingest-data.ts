import dotenv from 'dotenv';
import path from 'path';

// Load .env.local explicitly
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

// Create a local client for this script to ensure env vars are loaded
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Error: Missing Supabase environment variables.');
  console.error('   Ensure .env.local exists and contains NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false }
});

async function ingestAnalyzedData() {
  console.log('🚀 Starting Ingestion of Analyzed Cache Files...');

  // 1. Ingest AI Analysis (Modern Dashboard)
  await ingestCacheFile('data/analysis-cache.json', 'ai');

  // 2. Ingest Human Agent Analysis
  await ingestCacheFile('data/human-agent-analysis-cache.json', 'human');
}

async function ingestCacheFile(filePath: string, sourceType: 'ai' | 'human') {
  const fullPath = path.join(process.cwd(), filePath);
  
  if (!fs.existsSync(fullPath)) {
    console.log(`⚠️ Cache file not found: ${filePath} - Skipping.`);
    return;
  }

  console.log(`\n📂 Reading ${filePath}...`);
  const fileContent = fs.readFileSync(fullPath, 'utf-8');
  const cache = JSON.parse(fileContent);
  
  const analytics = cache.analytics || [];
  if (analytics.length === 0) {
    console.log('   ❌ No analytics data found in file.');
    return;
  }

  console.log(`   📊 Found ${analytics.length} conversations. Uploading to Supabase...`);

  const BATCH_SIZE = 100;
  let successes = 0;

  for (let i = 0; i < analytics.length; i += BATCH_SIZE) {
    const batch = analytics.slice(i, i + BATCH_SIZE);
    const records = batch.map((item: any) => {
      // Map your JSON fields to Supabase columns
      // Note: Different cache files might have slightly different field names
      
      // Check sentiment
      let rawSentiment = (item.sentiment || item.final_sentiment || 'neutral');
      // Ensure string
      if (typeof rawSentiment !== 'string') rawSentiment = 'neutral';
      
      let lower = rawSentiment.toLowerCase();
      
      // Map known non-standard sentiments
      if (lower === 'frustrated') lower = 'negative';
      else if (lower === 'happy' || lower === 'satisfied') lower = 'positive';
      else if (lower === 'confused' || lower === 'uncertain') lower = 'neutral';
      
      if (lower !== 'positive' && lower !== 'neutral' && lower !== 'negative') {
        console.log(`⚠️ Invalid sentiment found: "${rawSentiment}" in ID: ${item.conversation_id || item.senderID}`);
        // For unknown values, default to neutral to ensure ingestion, or skip
        lower = 'neutral'; 
      }
      
      // Define metrics
      const quality = item.qualityScore || item.quality_score || 0;
      const empathy = item.empathyScore || item.empathy_score || 0;
      const sentimentScore = item.sentimentScore || 0;
      
      // ID handling: Human agent file uses 'conversation_id', AI uses 'senderID' or 'id'
      const sourceId = item.conversation_id || item.senderID || item.id || `unknown-${Math.random()}`;
      
      // Calculate timestamp
      // AI cache usually has no timestamp per conversation in the analytics array directly,
      // but Human agent one does (or implies it). We'll default to Now if missing.
      const startedAt = item.timestamp || item.started_at || new Date().toISOString();

      return {
        source_id: sourceId,
        source_type: sourceType,
        started_at: startedAt,
        
        // Metrics
        message_count: item.conversationLength || item.messageCount || 0,
        first_response_time_ms: item.firstResponseTime || item.resolution_time * 1000 || null,
        
        // Analytics
        quality_score: quality,
        empathy_score: empathy,
        sentiment: lower, // Use the lowercased version but keep original value logic
        sentiment_score: sentimentScore,
        
        // Metadata
        intent: item.intent || (item.intents ? item.intents[0] : null),
        topics: item.topics || item.intents || (item.categories ? item.categories : []),
        sub_categories: item.subCategories || [],
        
        // Flags
        knowledge_gaps: item.knowledgeGaps || item.knowledge_gaps || [],
        resolution_status: item.resolutionStatus || (quality > 60 ? 'resolved' : 'unresolved'),
        
        // Additional Insights
        recommendations: item.recommendations || [],
        trends: item.trends || [],
        customer_effort_score: item.customerEffortScore || item.customer_effort_score || null,
        
        // Human Agent Specific
        agent_name: item.agent_name || null,
        customer_name: item.customer_name || null,
        coaching_opportunities: item.coaching_opportunities || [],
        script_adherence: item.script_adherence || null,
        escalation_risk: item.escalation_risk || null,
        root_causes: item.root_causes || [],
        churn_signals: item.churn_signals || [],
        sentiment_change: item.sentiment_change || null
      };
    });

    // Filter out nulls (skipped records)
    const validRecords = records.filter(r => r !== null);

    if (validRecords.length > 0) {
      const { error } = await supabase
        .from('conversations')
        .upsert(validRecords, { onConflict: 'source_id,source_type' });

      if (error) {
        console.error('   ❌ Batch insert failed:', error.message);
      } else {
        successes += validRecords.length;
        process.stdout.write(`\r   ✅ Progress: ${successes}/${analytics.length}`);
      }
    }
  }
  console.log('\n   🎉 File ingestion complete!');
}

ingestAnalyzedData().catch(console.error);
