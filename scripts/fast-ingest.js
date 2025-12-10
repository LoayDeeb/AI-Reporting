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

async function clearAllData() {
  console.log('🗑️  Clearing ALL existing data...');
  
  // Delete all messages first (foreign key)
  const { error: msgError } = await supabase
    .from('messages')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000');
  
  if (msgError) console.error('Error clearing messages:', msgError.message);
  else console.log('  ✓ Cleared all messages');
  
  // Delete all conversations
  const { error: convError } = await supabase
    .from('conversations')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000');
  
  if (convError) console.error('Error clearing conversations:', convError.message);
  else console.log('  ✓ Cleared all conversations');
  
  // Delete insights
  const { error: insError } = await supabase
    .from('insights')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000');
  
  if (insError) console.error('Error clearing insights:', insError.message);
  else console.log('  ✓ Cleared all insights');
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
  
  const aiMessages = [];
  const humanMessages = [];
  let currentMode = 'ai';
  
  for (let i = 0; i < sorted.length; i++) {
    const msg = sorted[i];
    const text = msg.MessageText || '';
    
    // Check for transition to human agent
    if (currentMode === 'ai') {
      if (isAgentTransferMessage(text)) {
        // Include the transfer message in AI section, then switch to human
        aiMessages.push(msg);
        currentMode = 'human';
        continue;
      }
    }
    
    // Check for transition back to AI (bot welcome message)
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

async function batchInsertConversations(conversations) {
  if (conversations.length === 0) return [];
  
  const { data, error } = await supabase
    .from('conversations')
    .upsert(conversations, { onConflict: 'source_id,source_type' })
    .select('id, source_id, source_type');
  
  if (error) {
    console.error('Batch conversation insert error:', error.message);
    return [];
  }
  return data || [];
}

async function batchInsertMessages(messages) {
  if (messages.length === 0) return 0;
  
  // Split into chunks of 500 for Supabase limits
  const CHUNK_SIZE = 500;
  let inserted = 0;
  
  for (let i = 0; i < messages.length; i += CHUNK_SIZE) {
    const chunk = messages.slice(i, i + CHUNK_SIZE);
    const { error } = await supabase
      .from('messages')
      .upsert(chunk, { onConflict: 'original_message_id', ignoreDuplicates: true });
    
    if (error) {
      console.error('Batch message insert error:', error.message);
    } else {
      inserted += chunk.length;
    }
  }
  
  return inserted;
}

async function processFile(filePath, fileName) {
  console.log(`\n📂 Processing: ${fileName}`);
  
  const channel = getChannelFromFileName(fileName);
  const content = fs.readFileSync(filePath, 'utf8');
  const data = JSON.parse(content);
  
  if (!data.ActiveChatters || !Array.isArray(data.ActiveChatters)) {
    console.log('  ⚠️ No ActiveChatters found');
    return { ai: 0, human: 0, messages: 0 };
  }
  
  console.log(`  Chatters: ${data.ActiveChatters.length}, Channel: ${channel}`);
  
  // Prepare all data in memory first
  const aiConversations = [];
  const humanConversations = [];
  const allAiMsgData = [];
  const allHumanMsgData = [];
  
  for (const chatter of data.ActiveChatters) {
    const { aiMessages, humanMessages } = splitConversation(chatter.ChatHistory || []);
    
    // Process AI portion
    if (aiMessages.length > 0 && hasUserMessages(aiMessages)) {
      const sourceId = `${chatter.SenderID}-ai`;
      aiConversations.push({
        source_id: sourceId,
        source_type: 'ai',
        channel: channel,
        started_at: aiMessages[0]?.DateStamp || new Date().toISOString(),
        message_count: aiMessages.length
      });
      
      // Prepare messages with placeholder conv id (will be replaced)
      aiMessages
        .filter(m => m.MessageText && m.MessageText.trim() !== '')
        .forEach(m => {
          allAiMsgData.push({
            _source_id: sourceId,
            content: m.MessageText,
            sender_role: m.from === 'bot' || m.bot === true ? 'bot' : 'user',
            timestamp: m.DateStamp || new Date().toISOString(),
            sequence_number: m.Number || 0,
            original_message_id: `${chatter.SenderID}-ai-${m.Number}`
          });
        });
    }
    
    // Process Human Agent portion
    if (humanMessages.length > 0) {
      const sourceId = `${chatter.SenderID}-human`;
      humanConversations.push({
        source_id: sourceId,
        source_type: 'human',
        channel: channel,
        started_at: humanMessages[0]?.DateStamp || new Date().toISOString(),
        message_count: humanMessages.length
      });
      
      humanMessages
        .filter(m => m.MessageText && m.MessageText.trim() !== '')
        .forEach(m => {
          allHumanMsgData.push({
            _source_id: sourceId,
            content: m.MessageText,
            sender_role: m.from === 'user' ? 'user' : 'agent',
            timestamp: m.DateStamp || new Date().toISOString(),
            sequence_number: m.Number || 0,
            original_message_id: `${chatter.SenderID}-human-${m.Number}`
          });
        });
    }
  }
  
  // Batch insert conversations
  console.log(`  Inserting ${aiConversations.length} AI + ${humanConversations.length} human conversations...`);
  
  const insertedAi = await batchInsertConversations(aiConversations);
  const insertedHuman = await batchInsertConversations(humanConversations);
  
  // Create lookup map for conversation IDs
  const convIdMap = {};
  insertedAi.forEach(c => { convIdMap[`${c.source_id}-${c.source_type}`] = c.id; });
  insertedHuman.forEach(c => { convIdMap[`${c.source_id}-${c.source_type}`] = c.id; });
  
  // Assign conversation IDs to messages
  const finalAiMsgs = allAiMsgData
    .map(m => {
      const convId = convIdMap[`${m._source_id}-ai`];
      if (!convId) return null;
      const { _source_id, ...rest } = m;
      return { ...rest, conversation_id: convId };
    })
    .filter(Boolean);
  
  const finalHumanMsgs = allHumanMsgData
    .map(m => {
      const convId = convIdMap[`${m._source_id}-human`];
      if (!convId) return null;
      const { _source_id, ...rest } = m;
      return { ...rest, conversation_id: convId };
    })
    .filter(Boolean);
  
  // Batch insert messages
  console.log(`  Inserting ${finalAiMsgs.length} AI + ${finalHumanMsgs.length} human messages...`);
  
  const aiMsgCount = await batchInsertMessages(finalAiMsgs);
  const humanMsgCount = await batchInsertMessages(finalHumanMsgs);
  
  console.log(`  ✓ Done: ${insertedAi.length} AI convs, ${insertedHuman.length} human convs, ${aiMsgCount + humanMsgCount} msgs`);
  
  return {
    ai: insertedAi.length,
    human: insertedHuman.length,
    messages: aiMsgCount + humanMsgCount
  };
}

async function main() {
  console.log('🚀 FAST Data Ingestion (Optimized)\n');
  console.log('='.repeat(50));
  
  const startTime = Date.now();
  
  // Step 1: Clear all data
  await clearAllData();
  
  // Step 2: Process files
  const dataDir = path.join(process.cwd(), 'data', 'NewData');
  let totalAI = 0, totalHuman = 0, totalMsg = 0;
  
  for (const fileName of NEW_DATA_FILES) {
    const filePath = path.join(dataDir, fileName);
    if (!fs.existsSync(filePath)) {
      console.log(`\n⚠️ File not found: ${fileName}`);
      continue;
    }
    
    const result = await processFile(filePath, fileName);
    totalAI += result.ai;
    totalHuman += result.human;
    totalMsg += result.messages;
  }
  
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  
  console.log('\n' + '='.repeat(50));
  console.log('📊 SUMMARY');
  console.log('='.repeat(50));
  console.log(`✅ AI Conversations: ${totalAI}`);
  console.log(`✅ Human Conversations: ${totalHuman}`);
  console.log(`✅ Total Messages: ${totalMsg}`);
  console.log(`⏱️  Time: ${elapsed}s`);
  
  // Verify counts
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
  
  console.log(`\n📋 Database verification:`);
  console.log(`   AI conversations: ${aiCount}`);
  console.log(`   Human conversations: ${humanCount}`);
  console.log(`   Total messages: ${msgCount}`);
}

main().catch(console.error);
