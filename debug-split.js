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

const data = JSON.parse(fs.readFileSync('data/NewData/WEB EN_01 October 2025 - 31 October 2025 (1).txt', 'utf8'));
const sample = data.ActiveChatters.find(c => c.SenderID === '0.9361994186926805');

const sorted = [...sample.ChatHistory].sort((a, b) => (a.Number || 0) - (b.Number || 0));

console.log('=== ALL MESSAGES IN ORDER ===\n');
sorted.forEach((m, i) => {
  const text = m.MessageText || '';
  const isTransfer = isAgentTransferMessage(text);
  const isWelcome = isBotWelcomeMessage(text);
  
  let marker = '';
  if (isTransfer) marker = ' <<< TRANSFER TO HUMAN';
  if (isWelcome) marker = ' <<< WELCOME (BACK TO AI)';
  
  console.log(`${i.toString().padStart(2)}: [#${m.Number}] ${m.from} - "${text.substring(0, 50)}"${marker}`);
});
