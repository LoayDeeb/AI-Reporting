const fs = require('fs');

const AGENT_TRANSFER_PHRASE = 'Please wait until I connect you to an Agent';
const AGENT_TRANSFER_PHRASES_AR = [
  'الرجاء الانتظار حتى أقوم بتحويلك الى موظف',
  'يرجى الانتظار حتى أقوم بتوصيلك بأحد الموظفين',
  'الرجاء الانتظار حتى أقوم بتوصيلك'
];
const BOT_WELCOME_PHRASE = 'Welcome to LikeCard. How can I assist you today?';
const BOT_WELCOME_PHRASE_AR = 'أنا مساعدك الافتراضي من لايك كارد';

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
  let hasSeenTransfer = false;
  
  for (let i = 0; i < sorted.length; i++) {
    const msg = sorted[i];
    const text = msg.MessageText || '';
    
    // Check for transition to human agent
    if (currentMode === 'ai') {
      if (isAgentTransferMessage(text)) {
        aiMessages.push(msg);
        currentMode = 'human';
        hasSeenTransfer = true;
        continue;
      }
    }
    
    // Check for transition back to AI (only if we've transferred before)
    if (currentMode === 'human') {
      if (isBotWelcomeMessage(text)) {
        aiMessages.push(msg);
        currentMode = 'ai';
        continue;
      }
    }
    
    if (currentMode === 'ai') {
      aiMessages.push(msg);
    } else {
      humanMessages.push(msg);
    }
  }
  return { aiMessages, humanMessages };
}

const data = JSON.parse(fs.readFileSync('data/NewData/WEB EN_01 October 2025 - 31 October 2025 (1).txt', 'utf8'));
const sample = data.ActiveChatters.find(c => c.SenderID === '0.9361994186926805');

console.log('Sample SenderID:', sample.SenderID);
console.log('Total messages:', sample.ChatHistory.length);

const { aiMessages, humanMessages } = splitConversation(sample.ChatHistory);

console.log('\n=== AI Messages (' + aiMessages.length + ') ===');
aiMessages.forEach((m, i) => console.log(`  [#${m.Number}]`, m.from, (m.MessageText || '').substring(0, 50)));

console.log('\n=== Human Agent Messages (' + humanMessages.length + ') ===');
humanMessages.forEach((m, i) => console.log(`  [#${m.Number}]`, m.from, (m.MessageText || '').substring(0, 50)));
