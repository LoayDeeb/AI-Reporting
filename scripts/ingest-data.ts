import dotenv from 'dotenv';
import path from 'path';

// Load .env.local explicitly
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import fs from 'fs';
import { createClient } from '@supabase/supabase-js';
import { parse } from 'csv-parse/sync';

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

  // 3. Ingest AI Messages from Web AR file
  await ingestAIMessages();

  // 4. Ingest Human Agent Messages
  await ingestHumanMessages();
}

async function ingestAIMessages() {
  console.log('\n💬 Starting Ingestion of AI Conversation Messages...');
  
  // Find the Web AR file
  const dataDir = path.join(process.cwd(), 'data');
  const files = fs.readdirSync(dataDir);
  const webARFile = files.find(f => f.startsWith('Web AR') && f.endsWith('.txt'));
  
  if (!webARFile) {
    console.log('⚠️ Web AR file not found. Skipping AI message ingestion.');
    return;
  }

  const filePath = path.join(dataDir, webARFile);
  console.log(`   📂 Reading ${webARFile}...`);

  // 1. Fetch all AI conversations to get UUIDs from Supabase
  console.log('   📥 Fetching existing AI conversation IDs from Supabase...');
  
  let allConversations: { id: string, source_id: string }[] = [];
  let offset = 0;
  const LIMIT = 1000;
  let hasMore = true;

  while (hasMore) {
    const { data: conversations, error } = await supabase
      .from('conversations')
      .select('id, source_id')
      .eq('source_type', 'ai')
      .range(offset, offset + LIMIT - 1);

    if (error) {
      console.error('   ❌ Failed to fetch conversations:', error.message);
      return;
    }

    if (conversations && conversations.length > 0) {
      allConversations = [...allConversations, ...conversations];
      offset += LIMIT;
      if (conversations.length < LIMIT) hasMore = false;
    } else {
      hasMore = false;
    }
  }

  const conversationMap = new Map(allConversations.map(c => [c.source_id, c.id]));
  console.log(`   ✅ Loaded ${conversationMap.size} AI conversation mappings from DB.`);

  if (conversationMap.size === 0) {
    console.log('   ⚠️ No AI conversations found in DB. Run conversation ingestion first.');
    return;
  }

  // 2. Read the Web AR file (it's a JSON wrapped in array)
  const fileContent = fs.readFileSync(filePath, 'utf-8');
  let rawData: any;
  
  try {
    rawData = JSON.parse(fileContent);
  } catch (e) {
    console.error('   ❌ Failed to parse Web AR file:', e);
    return;
  }

  // The file structure is: { Count, TotalPages, PageSize, ActiveChatters: [...] }
  const conversations = rawData.ActiveChatters || rawData.conversations || (Array.isArray(rawData) ? rawData : []);
  console.log(`   📊 Found ${conversations.length} conversations in file. Processing messages...`);

  // 3. Process and Upload
  const BATCH_SIZE = 500;
  let successes = 0;
  let skipped = 0;
  let messageBatch: any[] = [];

  for (const conv of conversations) {
    const senderID = conv.SenderID;
    
    // Look up the Supabase UUID
    const conversationUUID = conversationMap.get(senderID);

    if (!conversationUUID) {
      skipped++;
      continue;
    }

    // Process messages in ChatHistory
    if (conv.ChatHistory && Array.isArray(conv.ChatHistory)) {
      for (const msg of conv.ChatHistory) {
        // Skip empty messages or card-only messages
        if (!msg.MessageText || msg.MessageText.trim() === '') continue;

        // Map 'from' field to sender_role enum
        let role: 'user' | 'bot' | 'agent' = 'user';
        if (msg.from === 'bot') role = 'bot';
        else if (msg.Agent === true) role = 'agent';

        // Generate a unique message ID if not present or empty
        const originalMsgId = (msg.MessageId && msg.MessageId.trim() !== '') 
          ? msg.MessageId 
          : `${senderID}-${msg.Number}-${msg.DateStamp || Date.now()}`;

        messageBatch.push({
          conversation_id: conversationUUID,
          content: msg.MessageText,
          sender_role: role,
          timestamp: msg.DateStamp || new Date().toISOString(),
          original_message_id: originalMsgId,
          sentiment: null
        });
      }
    }

    // Upload batch if full
    if (messageBatch.length >= BATCH_SIZE) {
      // Deduplicate batch by original_message_id (keep first occurrence)
      const seen = new Set<string>();
      const dedupedBatch = messageBatch.filter(m => {
        if (seen.has(m.original_message_id)) return false;
        seen.add(m.original_message_id);
        return true;
      });

      const { error } = await supabase.from('messages').upsert(
        dedupedBatch, 
        { onConflict: 'original_message_id' }
      );
      
      if (error) {
        console.error('   ❌ Message batch failed:', error.message);
      } else {
        successes += dedupedBatch.length;
        process.stdout.write(`\r   ✅ AI Messages: ${successes} uploaded`);
      }
      messageBatch = [];
    }
  }

  // Final batch
  if (messageBatch.length > 0) {
    // Deduplicate final batch
    const seen = new Set<string>();
    const dedupedBatch = messageBatch.filter(m => {
      if (seen.has(m.original_message_id)) return false;
      seen.add(m.original_message_id);
      return true;
    });

    const { error } = await supabase.from('messages').upsert(
      dedupedBatch, 
      { onConflict: 'original_message_id' }
    );
    if (error) {
      console.error('   ❌ Final message batch failed:', error.message);
    } else {
      successes += dedupedBatch.length;
    }
  }

  console.log(`\n   🎉 AI Messages ingestion complete! (${successes} inserted, ${skipped} conversations skipped)`);
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
      
      // Check sentiment
      let rawSentiment = (item.sentiment || item.final_sentiment || 'neutral');
      if (typeof rawSentiment !== 'string') rawSentiment = 'neutral';
      
      let lower = rawSentiment.toLowerCase();
      
      if (lower === 'frustrated') lower = 'negative';
      else if (lower === 'happy' || lower === 'satisfied') lower = 'positive';
      else if (lower === 'confused' || lower === 'uncertain') lower = 'neutral';
      
      if (lower !== 'positive' && lower !== 'neutral' && lower !== 'negative') {
        lower = 'neutral'; 
      }
      
      // Define metrics
      const quality = item.qualityScore || item.quality_score || 0;
      const empathy = item.empathyScore || item.empathy_score || 0;
      const sentimentScore = item.sentimentScore || 0;
      
      // ID handling
      const sourceId = item.conversation_id || item.senderID || item.id || `unknown-${Math.random()}`;
      
      // Calculate timestamp
      const startedAt = item.timestamp || item.started_at || new Date().toISOString();

      return {
        source_id: sourceId,
        source_type: sourceType,
        started_at: startedAt,
        
        // Metrics
        message_count: item.conversationLength || item.messageCount || 0,
        first_response_time_ms: item.firstResponseTime || (item.resolution_time ? item.resolution_time * 1000 : null),
        
        // Analytics
        quality_score: quality,
        empathy_score: empathy,
        sentiment: lower,
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

    const validRecords = records.filter((r: any) => r !== null);

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
  console.log('\n   🎉 Conversation ingestion complete!');
}

async function ingestHumanMessages() {
  console.log('\n💬 Starting Ingestion of Human Agent Messages...');
  
  // Use the extracted conversations JSON which contains the exact messages used in analysis
  const conversationsFilePath = path.join(process.cwd(), 'data/human-agent-conversations.json');
  
  if (!fs.existsSync(conversationsFilePath)) {
    console.log('⚠️ human-agent-conversations.json not found. Run extract-human-agent-conversations.ts first.');
    return;
  }

  // 1. Fetch all human conversations to get UUIDs from Supabase
  console.log('   📥 Fetching existing conversation IDs from Supabase...');
  
  let allConversations: { id: string, source_id: string }[] = [];
  let offset = 0;
  const LIMIT = 1000;
  let hasMore = true;

  while (hasMore) {
    const { data: conversations, error } = await supabase
      .from('conversations')
      .select('id, source_id')
      .eq('source_type', 'human')
      .range(offset, offset + LIMIT - 1);

    if (error) {
      console.error('   ❌ Failed to fetch conversations:', error.message);
      return;
    }

    if (conversations && conversations.length > 0) {
      allConversations = [...allConversations, ...conversations];
      offset += LIMIT;
      if (conversations.length < LIMIT) hasMore = false;
    } else {
      hasMore = false;
    }
  }

  const conversationMap = new Map(allConversations.map(c => [c.source_id, c.id]));
  console.log(`   ✅ Loaded ${conversationMap.size} conversation mappings from DB.`);

  // 2. Read the JSON file
  console.log('   📂 Reading human-agent-conversations.json...');
  const fileContent = fs.readFileSync(conversationsFilePath, 'utf-8');
  const data = JSON.parse(fileContent);
  const conversations = data.conversations || [];

  console.log(`   📊 Found ${conversations.length} conversations with messages. Uploading...`);

  // 3. Process and Upload
  const BATCH_SIZE = 500;
  let successes = 0;
  let skipped = 0;
  let messageBatch: any[] = [];

  for (const conv of conversations) {
    // Determine the source ID (original conversation ID)
    // The JSON uses 'conversationId' not 'content_thread_id'
    const threadId = conv.conversationId || conv.content_thread_id; 
    
    // Look up the Supabase UUID
    const conversationUUID = conversationMap.get(threadId);

    if (!conversationUUID) {
      skipped++;
      continue;
    }

    // Process messages - JSON uses 'allMessages' with fields: number, from, isBot, text, timestamp, senderName
    const messages = conv.allMessages || conv.messages || [];
    
    for (const msg of messages) {
      const content = msg.text || msg.body;
      if (!content) continue;

      // Determine role: bot (isBot=true), agent (senderName set), or user
      let role: 'user' | 'bot' | 'agent' = 'user';
      if (msg.from === 'bot' && msg.isBot === true) role = 'bot';
      else if (msg.from === 'bot' && msg.senderName) role = 'agent';
      else if (msg.from === 'user') role = 'user';

      // Generate unique message ID
      const originalMsgId = `human-${threadId}-${msg.number || msg.timestamp || Date.now()}`;

      messageBatch.push({
        conversation_id: conversationUUID,
        content: content,
        sender_role: role,
        timestamp: msg.timestamp || new Date().toISOString(),
        original_message_id: originalMsgId,
        sentiment: null
      });
    }

    // Upload batch if full
    if (messageBatch.length >= BATCH_SIZE) {
      // Deduplicate batch
      const seen = new Set<string>();
      const dedupedBatch = messageBatch.filter(m => {
        if (seen.has(m.original_message_id)) return false;
        seen.add(m.original_message_id);
        return true;
      });

      const { error } = await supabase.from('messages').upsert(
        dedupedBatch, 
        { onConflict: 'original_message_id' }
      );
      
      if (error) {
        console.error('   ❌ Message batch failed:', error.message);
      } else {
        successes += dedupedBatch.length;
        process.stdout.write(`\r   ✅ Messages: ${successes} uploaded`);
      }
      messageBatch = [];
    }
  }

  // Final batch
  if (messageBatch.length > 0) {
    const seen = new Set<string>();
    const dedupedBatch = messageBatch.filter(m => {
      if (seen.has(m.original_message_id)) return false;
      seen.add(m.original_message_id);
      return true;
    });

    const { error } = await supabase.from('messages').upsert(dedupedBatch, { onConflict: 'original_message_id' });
    if (error) {
      console.error('   ❌ Final message batch failed:', error.message);
    } else {
      successes += dedupedBatch.length;
    }
  }

  console.log(`\n   🎉 Messages ingestion complete! (${successes} inserted, ${skipped} conversations skipped)`);
}

ingestAnalyzedData().catch(console.error);
