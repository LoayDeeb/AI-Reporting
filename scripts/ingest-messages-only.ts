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

async function ingestMessagesOnly() {
  console.log('🚀 Starting Dedicated Message Ingestion...');

  const conversationsFilePath = path.join(process.cwd(), 'data/human-agent-conversations.json');
  
  if (!fs.existsSync(conversationsFilePath)) {
    console.error('❌ Error: human-agent-conversations.json not found. Run extract-human-agent-conversations.ts first.');
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
  
  // Use rawExtracted first as it has the richest data structure
  const conversations = data.rawExtracted || data.conversations || [];

  console.log(`   📊 Found ${conversations.length} conversations in JSON source.`);

  // 3. Process and Upload
  const BATCH_SIZE = 500;
  let successes = 0;
  let skipped = 0;
  let messageBatch: any[] = [];
  let totalMessagesProcessed = 0;

  let isFirst = true;
  for (const conv of conversations) {
    // Determine the source ID (original conversation ID)
    // In `rawExtracted`, it's `conversationId`. In `conversations`, it's `content_thread_id`.
    const threadId = conv.conversationId || conv.content_thread_id; 
    
    if (isFirst) {
      console.log('--- DEBUG FIRST CONVERSATION ---');
      console.log('Thread ID:', threadId);
      console.log('Keys:', Object.keys(conv));
      if (conv.messages) console.log('Messages type:', Array.isArray(conv.messages) ? `Array(${conv.messages.length})` : typeof conv.messages);
      if (conv.botMessages) console.log('botMessages type:', Array.isArray(conv.botMessages) ? `Array(${conv.botMessages.length})` : typeof conv.botMessages);
      isFirst = false;
    } 
    
    // Look up the Supabase UUID
    // Try both direct lookup and lookup with stripped prefixes if needed
    let conversationUUID = conversationMap.get(threadId);

    if (!conversationUUID) {
      // Debugging: Try to see why IDs are not matching
      // console.log(`   ⚠️ Skipping conversation ${threadId} (not found in DB)`);
      skipped++;
      continue;
    }

    // Process messages using `rawExtracted` format structure
    // rawExtracted has arrays: botMessages, userMessages, agentMessages
    
    let allMessages: any[] = [];
    
    // Method 1: rawExtracted arrays
    if (conv.botMessages || conv.userMessages || conv.agentMessages) {
      allMessages = [
        ...(conv.botMessages || []).map((m: any) => ({ ...m, role: 'bot' })),
        ...(conv.userMessages || []).map((m: any) => ({ ...m, role: 'user' })),
        ...(conv.agentMessages || []).map((m: any) => ({ ...m, role: 'agent' }))
      ];
    } 
    // Method 2: `messages` array (analysisFormat)
    else if (conv.messages && Array.isArray(conv.messages)) {
      allMessages = conv.messages;
    }
    // Method 3: `ChatHistory` (original WebAR format)
    else if (conv.ChatHistory && Array.isArray(conv.ChatHistory)) {
      allMessages = conv.ChatHistory.map((m: any) => ({
        ...m,
        role: m.from === 'bot' || m.bot ? 'bot' : (m.from === 'user' ? 'user' : (m.Agent ? 'agent' : 'user'))
      }));
    }
    // Method 4: `allMessages` or `humanAgentMessages` (Debugged format)
    else if (conv.allMessages && Array.isArray(conv.allMessages)) {
        allMessages = conv.allMessages;
    }
    else if (conv.humanAgentMessages && Array.isArray(conv.humanAgentMessages)) {
        allMessages = conv.humanAgentMessages;
    }

    if (allMessages.length > 0) {
      // Sort by Number or timestamp if possible
      allMessages.sort((a, b) => (a.Number || 0) - (b.Number || 0));

      for (const msg of allMessages) {
        let role = 'user';
        
        // Determine role
        if (msg.role) {
          role = msg.role;
        } else {
          const author = (msg.author_name || '').toLowerCase();
          const creator = (msg.creator_name || '').toLowerCase();
          
          if (author === 'customer' || creator === 'user' || msg.from === 'user') role = 'user';
          else if (author === 'bot' || creator === 'bot' || msg.from === 'bot' || msg.bot) role = 'bot';
          else if (msg.Agent) role = 'agent';
          else role = 'agent'; // Default fallback
        }
        
        // Normalize to enum
        if (role !== 'user' && role !== 'bot' && role !== 'agent') role = 'user';

        // Ensure we have an ID
        const messageId = msg.id || msg.ID || `msg-${conversationUUID}-${Date.now()}-${Math.random()}`;
        const content = msg.body || msg.body_as_text || msg.MessageText || '';

        if (!content) {
          // console.log('Skipping empty content');
          continue;
        }

        messageBatch.push({
          conversation_id: conversationUUID,
          content: content,
          sender_role: role,
          timestamp: msg.created_at || msg.DateStamp || msg.TimeSent ? new Date().toISOString() : new Date().toISOString(), // Fallback time
          original_message_id: messageId,
          sentiment: msg.sentiment_text || null
        });
        totalMessagesProcessed++;
      }
    } else {
      // Debugging: Why no messages found?
      // console.log(`No messages found for ${threadId}. Conv keys: ${Object.keys(conv)}`);
    }

    // Upload batch if full
    if (messageBatch.length >= BATCH_SIZE) {
      const { error } = await supabase.from('messages').upsert(
        messageBatch, 
        { onConflict: 'original_message_id' }
      );
      
      if (error) {
        console.error('   ❌ Message batch failed:', error.message);
      } else {
        successes += messageBatch.length;
        process.stdout.write(`\r   ✅ Messages Uploaded: ${successes} / ${totalMessagesProcessed}`);
      }
      messageBatch = [];
    }
  }

  // Final batch
  if (messageBatch.length > 0) {
    const { error } = await supabase.from('messages').upsert(messageBatch, { onConflict: 'original_message_id' });
    if (error) {
      console.error('   ❌ Final message batch failed:', error.message);
    } else {
      successes += messageBatch.length;
      process.stdout.write(`\r   ✅ Messages Uploaded: ${successes} / ${totalMessagesProcessed}`);
    }
  }

  console.log(`\n\n🎉 Summary:`);
  console.log(`   - Conversations Processed: ${conversations.length - skipped}`);
  console.log(`   - Conversations Skipped: ${skipped} (missing in DB)`);
  console.log(`   - Total Messages Inserted: ${successes}`);
}

ingestMessagesOnly().catch(console.error);

