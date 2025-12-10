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
  const sorted = [...chatHistory].sort((a, b) => (a.Number || 0) - (b.Number || 0));
  const aiMessages = [];
  const humanMessages = [];
  let currentMode = 'ai';
  
  for (const msg of sorted) {
    const text = msg.MessageText || '';
    
    if (currentMode === 'ai' && isAgentTransferMessage(text)) {
      aiMessages.push(msg);
      currentMode = 'human';
      continue;
    }
    
    if (currentMode === 'human' && isBotWelcomeMessage(text)) {
      aiMessages.push(msg);
      currentMode = 'ai';
      continue;
    }
    
    if (currentMode === 'ai') {
      aiMessages.push(msg);
    } else {
      humanMessages.push(msg);
    }
  }
  
  return { aiMessages, humanMessages };
}

function hasUserMessages(messages) {
  return messages.some(msg => msg.from === 'user' || (msg.bot === false && msg.from !== 'bot'));
}

async function clearAllData() {
  console.log('🗑️  Clearing ALL data...');
  
  // Delete in batches to avoid timeout
  let deleted = 0;
  while (true) {
    const { data, error } = await supabase
      .from('messages')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000')
      .select('id')
      .limit(5000);
    
    if (error || !data || data.length === 0) break;
    deleted += data.length;
    process.stdout.write(`\r  Messages deleted: ${deleted}`);
  }
  console.log(`\n  ✓ Deleted ${deleted} messages`);
  
  deleted = 0;
  while (true) {
    const { data, error } = await supabase
      .from('conversations')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000')
      .select('id')
      .limit(5000);
    
    if (error || !data || data.length === 0) break;
    deleted += data.length;
    process.stdout.write(`\r  Conversations deleted: ${deleted}`);
  }
  console.log(`\n  ✓ Deleted ${deleted} conversations`);
}

// Process a single batch of chatters and insert
async function processBatch(chatters, channel, batchNum, totalBatches) {
  const convBatch = [];
  const msgBatch = [];
  
  for (const chatter of chatters) {
    const { aiMessages, humanMessages } = splitConversation(chatter.ChatHistory || []);
    
    // AI conversations
    if (aiMessages.length > 0 && hasUserMessages(aiMessages)) {
      const sourceId = `${chatter.SenderID}-ai`;
      convBatch.push({
        source_id: sourceId,
        source_type: 'ai',
        channel,
        started_at: aiMessages[0]?.DateStamp || new Date().toISOString(),
        message_count: aiMessages.length,
        _messages: aiMessages.filter(m => m.MessageText?.trim() || (m.CardsList && m.CardsList.length > 0)).map(m => ({
          content: m.MessageText || '',
          sender_role: m.from === 'bot' || m.bot === true ? 'bot' : 'user',
          timestamp: m.DateStamp || new Date().toISOString(),
          sequence_number: m.Number || 0,
          original_message_id: `${chatter.SenderID}-ai-${m.Number}`,
          cards_list: m.CardsList && m.CardsList.length > 0 ? m.CardsList : null,
          is_card_selection: m.MessageText === 'Card Selected' || m.MessageText === 'تم اختيار البطاقة'
        }))
      });
    }
    
    // Human conversations (no cards for human agents)
    if (humanMessages.length > 0) {
      const sourceId = `${chatter.SenderID}-human`;
      convBatch.push({
        source_id: sourceId,
        source_type: 'human',
        channel,
        started_at: humanMessages[0]?.DateStamp || new Date().toISOString(),
        message_count: humanMessages.length,
        _messages: humanMessages.filter(m => m.MessageText?.trim()).map(m => ({
          content: m.MessageText,
          sender_role: m.from === 'user' ? 'user' : 'agent',
          timestamp: m.DateStamp || new Date().toISOString(),
          sequence_number: m.Number || 0,
          original_message_id: `${chatter.SenderID}-human-${m.Number}`
        }))
      });
    }
  }
  
  // Insert conversations
  const convData = convBatch.map(c => {
    const { _messages, ...conv } = c;
    return conv;
  });
  
  if (convData.length === 0) return { convs: 0, msgs: 0 };
  
  const { data: insertedConvs, error: convError } = await supabase
    .from('conversations')
    .upsert(convData, { onConflict: 'source_id,source_type' })
    .select('id, source_id, source_type');
  
  if (convError) {
    console.error(`  Batch ${batchNum} conv error:`, convError.message);
    return { convs: 0, msgs: 0 };
  }
  
  // Map back to messages
  const convIdMap = {};
  (insertedConvs || []).forEach(c => {
    convIdMap[`${c.source_id}-${c.source_type}`] = c.id;
  });
  
  // Prepare all messages with conversation IDs
  for (const conv of convBatch) {
    const key = `${conv.source_id}-${conv.source_type}`;
    const convId = convIdMap[key];
    if (convId && conv._messages) {
      for (const msg of conv._messages) {
        msgBatch.push({ ...msg, conversation_id: convId });
      }
    }
  }
  
  // Insert messages in chunks
  let msgsInserted = 0;
  const CHUNK = 200;
  for (let i = 0; i < msgBatch.length; i += CHUNK) {
    const chunk = msgBatch.slice(i, i + CHUNK);
    const { error: msgError } = await supabase
      .from('messages')
      .upsert(chunk, { onConflict: 'original_message_id', ignoreDuplicates: true });
    
    if (!msgError) msgsInserted += chunk.length;
  }
  
  return { convs: insertedConvs?.length || 0, msgs: msgsInserted };
}

async function processFile(filePath, fileName) {
  console.log(`\n📂 ${fileName}`);
  
  const channel = getChannelFromFileName(fileName);
  const content = fs.readFileSync(filePath, 'utf8');
  const data = JSON.parse(content);
  
  if (!data.ActiveChatters?.length) {
    console.log('  ⚠️ No ActiveChatters');
    return { convs: 0, msgs: 0 };
  }
  
  const chatters = data.ActiveChatters;
  const BATCH_SIZE = 100; // Process 100 chatters at a time
  const totalBatches = Math.ceil(chatters.length / BATCH_SIZE);
  
  console.log(`  ${chatters.length} chatters → ${totalBatches} batches`);
  
  let totalConvs = 0, totalMsgs = 0;
  
  for (let i = 0; i < chatters.length; i += BATCH_SIZE) {
    const batch = chatters.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    
    const result = await processBatch(batch, channel, batchNum, totalBatches);
    totalConvs += result.convs;
    totalMsgs += result.msgs;
    
    process.stdout.write(`\r  Batch ${batchNum}/${totalBatches} - Convs: ${totalConvs}, Msgs: ${totalMsgs}`);
  }
  
  console.log(`\n  ✓ ${totalConvs} conversations, ${totalMsgs} messages`);
  return { convs: totalConvs, msgs: totalMsgs };
}

async function main() {
  console.log('⚡ TURBO Ingest - Optimized for Speed\n');
  const startTime = Date.now();
  
  await clearAllData();
  
  const dataDir = path.join(process.cwd(), 'data', 'NewData');
  let totalConvs = 0, totalMsgs = 0;
  
  for (const fileName of NEW_DATA_FILES) {
    const filePath = path.join(dataDir, fileName);
    if (!fs.existsSync(filePath)) {
      console.log(`\n⚠️ Not found: ${fileName}`);
      continue;
    }
    const result = await processFile(filePath, fileName);
    totalConvs += result.convs;
    totalMsgs += result.msgs;
  }
  
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  
  console.log('\n' + '='.repeat(40));
  console.log(`✅ Total: ${totalConvs} convs, ${totalMsgs} msgs`);
  console.log(`⏱️  Time: ${elapsed}s`);
  
  // Quick verify
  const { count: aiCount } = await supabase.from('conversations').select('*', { count: 'exact', head: true }).eq('source_type', 'ai');
  const { count: humanCount } = await supabase.from('conversations').select('*', { count: 'exact', head: true }).eq('source_type', 'human');
  console.log(`📋 DB: ${aiCount} AI, ${humanCount} Human conversations`);
}

main().catch(console.error);
