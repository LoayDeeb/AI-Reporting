require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const NEW_DATA_FILES = [
  'APP AR_01 October 2025 - 31 October 2025 (1).txt',
  'APP EN_01 December 2025 - 09 December 2025.txt',
  'Web AR_01 October 2025 - 31 October 2025 (1).txt',
  'WEB EN_01 October 2025 - 31 October 2025 (1).txt'
];

// Phrases that mark the boundaries of human agent section
const AGENT_TRANSFER_PHRASE = 'Please wait until I connect you to an Agent';
const AGENT_TRANSFER_PHRASES_AR = [
  'الرجاء الانتظار حتى أقوم بتحويلك الى موظف',
  'يرجى الانتظار حتى أقوم بتوصيلك بأحد الموظفين',
  'الرجاء الانتظار حتى أقوم بتوصيلك'
];
const BOT_WELCOME_PHRASE = 'Welcome to LikeCard. How can I assist you today?';
const BOT_WELCOME_PHRASE_AR = 'أنا مساعدك الافتراضي من لايك كارد';

function getChannelFromFileName(fileName) {
  const lower = fileName.toLowerCase();
  if (lower.includes('app')) return 'app';
  if (lower.includes('web')) return 'web';
  return 'unknown';
}

async function clearDatabase() {
  console.log('🗑️  Clearing existing data...');
  
  // Delete messages first (foreign key constraint)
  let deleted = 0;
  let hasMore = true;
  
  while (hasMore) {
    const { data, error } = await supabase
      .from('messages')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000')
      .select('id')
      .limit(1000);
    
    if (error) {
      console.error('Error deleting messages:', error);
      break;
    }
    
    deleted += data?.length || 0;
    hasMore = data?.length === 1000;
    if (data?.length > 0) process.stdout.write(`\r  Deleted ${deleted} messages...`);
  }
  console.log(`\n  ✓ Deleted ${deleted} messages`);
  
  // Delete conversations
  deleted = 0;
  hasMore = true;
  
  while (hasMore) {
    const { data, error } = await supabase
      .from('conversations')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000')
      .select('id')
      .limit(1000);
    
    if (error) {
      console.error('Error deleting conversations:', error);
      break;
    }
    
    deleted += data?.length || 0;
    hasMore = data?.length === 1000;
    if (data?.length > 0) process.stdout.write(`\r  Deleted ${deleted} conversations...`);
  }
  console.log(`\n  ✓ Deleted ${deleted} conversations`);
  
  // Clear insights
  await supabase.from('insights').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  console.log('  ✓ Cleared insights');
}

function isAgentTransferMessage(text) {
  if (text.includes(AGENT_TRANSFER_PHRASE)) return true;
  for (const phrase of AGENT_TRANSFER_PHRASES_AR) {
    if (text.includes(phrase)) return true;
  }
  return false;
}

function isBotWelcomeMessage(text) {
  return text.includes(BOT_WELCOME_PHRASE) || text.includes(BOT_WELCOME_PHRASE_AR);
}

function splitConversation(chatHistory) {
  // Sort by Number field to ensure correct order
  const sorted = [...chatHistory].sort((a, b) => (a.Number || 0) - (b.Number || 0));
  
  // Track current mode: 'ai' or 'human'
  // Transitions:
  //   'ai' -> 'human': When we see transfer phrase (transfer message stays in AI)
  //   'human' -> 'ai': When we see welcome message (welcome message goes to AI)
  
  const aiMessages = [];
  const humanMessages = [];
  let currentMode = 'ai';
  let hasSeenTransfer = false; // Track if we've ever transferred to human
  
  for (let i = 0; i < sorted.length; i++) {
    const msg = sorted[i];
    const text = msg.MessageText || '';
    
    // Check for transition to human agent
    if (currentMode === 'ai') {
      if (isAgentTransferMessage(text)) {
        // Include the transfer message in AI section, then switch to human
        aiMessages.push(msg);
        currentMode = 'human';
        hasSeenTransfer = true;
        continue;
      }
    }
    
    // Check for transition back to AI (bot welcome message)
    // IMPORTANT: Only trigger this if we've previously transferred to human
    // The initial welcome at conversation start should NOT trigger a switch
    if (currentMode === 'human') {
      if (isBotWelcomeMessage(text)) {
        // Welcome message goes to AI section
        aiMessages.push(msg);
        currentMode = 'ai';
        continue;
      }
    }
    
    // Add message to appropriate section
    if (currentMode === 'ai') {
      aiMessages.push(msg);
    } else {
      humanMessages.push(msg);
    }
  }
  
  return { aiMessages, humanMessages };
}

function hasUserMessages(messages) {
  return messages.some(msg => 
    msg.from === 'user' || 
    (msg.bot === false && msg.from !== 'bot')
  );
}

async function ingestFile(filePath, fileName) {
  console.log(`\n📂 Processing: ${fileName}`);
  
  const channel = getChannelFromFileName(fileName);
  console.log(`  Channel: ${channel}`);
  
  const content = fs.readFileSync(filePath, 'utf8');
  const data = JSON.parse(content);
  
  if (!data.ActiveChatters || !Array.isArray(data.ActiveChatters)) {
    console.log('  ⚠️ No ActiveChatters found');
    return { aiConversations: 0, humanConversations: 0, messages: 0, skipped: 0 };
  }
  
  console.log(`  Total chatters in file: ${data.ActiveChatters.length}`);
  
  let aiConversations = 0;
  let humanConversations = 0;
  let messagesInserted = 0;
  let skipped = 0;
  
  const BATCH_SIZE = 50;
  
  for (let i = 0; i < data.ActiveChatters.length; i += BATCH_SIZE) {
    const batch = data.ActiveChatters.slice(i, i + BATCH_SIZE);
    
    for (const chatter of batch) {
      const { aiMessages, humanMessages } = splitConversation(chatter.ChatHistory || []);
      
      // Process AI portion
      if (aiMessages.length > 0 && hasUserMessages(aiMessages)) {
        const convData = {
          source_id: `${chatter.SenderID}-ai`,
          source_type: 'ai',
          channel: channel,
          started_at: aiMessages[0]?.DateStamp || new Date().toISOString(),
          message_count: aiMessages.length
        };
        
        const { data: conv, error: convError } = await supabase
          .from('conversations')
          .upsert(convData, { onConflict: 'source_id,source_type' })
          .select('id')
          .single();
        
        if (!convError && conv) {
          aiConversations++;
          
          // Insert messages
          const msgs = aiMessages
            .filter(m => m.MessageText && m.MessageText.trim() !== '')
            .map(m => ({
              conversation_id: conv.id,
              content: m.MessageText,
              sender_role: m.from === 'bot' || m.bot === true ? 'bot' : 'user',
              timestamp: m.DateStamp || new Date().toISOString(),
              sequence_number: m.Number || 0,
              original_message_id: `${chatter.SenderID}-ai-${m.Number}-${m.DateStamp || ''}`
            }));
          
          if (msgs.length > 0) {
            const { error: msgError } = await supabase
              .from('messages')
              .upsert(msgs, { onConflict: 'original_message_id', ignoreDuplicates: true });
            
            if (!msgError) messagesInserted += msgs.length;
          }
        }
      } else if (aiMessages.length > 0) {
        skipped++; // Bot-only AI conversation
      }
      
      // Process Human Agent portion
      if (humanMessages.length > 0) {
        const convData = {
          source_id: `${chatter.SenderID}-human`,
          source_type: 'human',
          channel: channel,
          started_at: humanMessages[0]?.DateStamp || new Date().toISOString(),
          message_count: humanMessages.length
        };
        
        const { data: conv, error: convError } = await supabase
          .from('conversations')
          .upsert(convData, { onConflict: 'source_id,source_type' })
          .select('id')
          .single();
        
        if (!convError && conv) {
          humanConversations++;
          
          // Insert messages
          const msgs = humanMessages
            .filter(m => m.MessageText && m.MessageText.trim() !== '')
            .map(m => ({
              conversation_id: conv.id,
              content: m.MessageText,
              sender_role: m.from === 'user' ? 'user' : 'agent',
              timestamp: m.DateStamp || new Date().toISOString(),
              sequence_number: m.Number || 0,
              original_message_id: `${chatter.SenderID}-human-${m.Number}-${m.DateStamp || ''}`
            }));
          
          if (msgs.length > 0) {
            const { error: msgError } = await supabase
              .from('messages')
              .upsert(msgs, { onConflict: 'original_message_id', ignoreDuplicates: true });
            
            if (!msgError) messagesInserted += msgs.length;
          }
        }
      }
    }
    
    process.stdout.write(`\r  Progress: ${Math.min(i + BATCH_SIZE, data.ActiveChatters.length)}/${data.ActiveChatters.length} chatters`);
  }
  
  console.log(`\n  ✓ AI convs: ${aiConversations}, Human convs: ${humanConversations}, Messages: ${messagesInserted}, Skipped: ${skipped}`);
  
  return { aiConversations, humanConversations, messages: messagesInserted, skipped };
}

async function main() {
  console.log('🚀 Fresh Data Ingestion (with channel & AI/Human split)\n');
  console.log('='.repeat(60));
  
  // Check if channel column exists, if not add it
  console.log('📋 Checking schema...');
  const { error: schemaError } = await supabase.rpc('add_channel_column_if_missing');
  if (schemaError) {
    console.log('  Note: channel column may need to be added manually');
  }
  
  // Step 1: Clear database
  await clearDatabase();
  
  // Step 2: Ingest new files
  const dataDir = path.join(process.cwd(), 'data', 'NewData');
  let totalAI = 0, totalHuman = 0, totalMsg = 0, totalSkipped = 0;
  
  for (const fileName of NEW_DATA_FILES) {
    const filePath = path.join(dataDir, fileName);
    if (!fs.existsSync(filePath)) {
      console.log(`\n⚠️ File not found: ${fileName}`);
      continue;
    }
    
    const result = await ingestFile(filePath, fileName);
    totalAI += result.aiConversations;
    totalHuman += result.humanConversations;
    totalMsg += result.messages;
    totalSkipped += result.skipped;
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('📊 SUMMARY');
  console.log('='.repeat(60));
  console.log(`✅ AI Conversations (with user interaction): ${totalAI}`);
  console.log(`✅ Human Agent Conversations: ${totalHuman}`);
  console.log(`✅ Total Messages: ${totalMsg}`);
  console.log(`⏭️  Skipped (bot-only): ${totalSkipped}`);
  
  // Verify
  const { count: aiCount } = await supabase
    .from('conversations')
    .select('*', { count: 'exact', head: true })
    .eq('source_type', 'ai');
  const { count: humanCount } = await supabase
    .from('conversations')
    .select('*', { count: 'exact', head: true })
    .eq('source_type', 'human');
  const { count: msgCount } = await supabase
    .from('messages')
    .select('*', { count: 'exact', head: true });
  
  console.log(`\n📋 Database now has:`);
  console.log(`   - AI conversations: ${aiCount}`);
  console.log(`   - Human conversations: ${humanCount}`);
  console.log(`   - Total messages: ${msgCount}`);
}

main().catch(console.error);
