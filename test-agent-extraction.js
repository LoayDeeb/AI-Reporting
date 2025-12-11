const fs = require('fs');

function extractAgentName(humanMessages) {
  // Method 1: Look for @@agentname pattern (most reliable)
  const atPattern = /@@([^\s@,،.。!?]+)/;
  for (const msg of humanMessages) {
    const text = msg.MessageText || '';
    const atMatch = text.match(atPattern);
    if (atMatch && atMatch[1] && atMatch[1].length > 1) {
      return atMatch[1].trim();
    }
  }
  
  // Method 2: Look for agent introduction patterns
  const introPatterns = [
    /(?:This is|I'm|I am)\s+(\w+)\s+from\s+(?:Like\s*Card|لايك\s*كارد)/i,
    /Welcome.*I'm\s+(\w+)\s+from/i,
    /(\w+)\s+is\s+talking\s+to\s+you\s+from\s+(?:Like\s*Card)/i,
    /معك\s+(\S+)\s+من/,
    /معاك\s+(\S+)\s+من/,
    /معك\s*\(?\s*(\S+)\s*\)?\s*من/,
    /معك\s+([^\s]+)\s+من\s+(?:موقع\s+)?(?:فريق\s+)?(?:لايك|Like)/i,
    /معك\s+(\S+)\s+\S+\s+من\s+(?:موقع|فريق)/,
  ];
  
  for (const msg of humanMessages.slice(0, 5)) {
    const text = msg.MessageText || '';
    if (msg.from !== 'user' && msg.bot !== false) {
      for (const pattern of introPatterns) {
        const match = text.match(pattern);
        if (match && match[1]) {
          const name = match[1].replace(/[()]/g, '').trim();
          if (name.length > 1 && !/^[\s\u0600-\u06FF]{0,1}$/.test(name)) {
            return name;
          }
        }
      }
    }
  }
  return null;
}

// Test samples
const testCases = [
  { MessageText: "اهلا بك استاذي الكريم\nمعك لانا من موقع لايك كارد", from: 'bot', bot: true },
  { MessageText: "This is Mahmoud from Like Card", from: 'bot', bot: true },
  { MessageText: "حياك الله!\nمعك (   هدير  ) من فريق لايك كارد", from: 'bot', bot: true },
  { MessageText: "معك وائل من لايك كارد", from: 'bot', bot: true },
  { MessageText: "Welcome, sir. I'm Ryan from Like Card", from: 'bot', bot: true },
  { MessageText: "معك لارا من لايك كارد", from: 'bot', bot: true },
  { MessageText: "مرحبا استاذ\nمعك وائل من لايك كارد", from: 'bot', bot: true },
  { MessageText: "اهلا بك استاذ محمد\nمعك آلاء يمانى من موقع لايك كارد", from: 'bot', bot: true },
  { MessageText: "حياك الله!  استاذ محمد\nمعك نور  من فريق لايك كارد", from: 'bot', bot: true },
  { MessageText: "Hello, dear sir.\nThis is Wael from Like Card.", from: 'bot', bot: true },
  { MessageText: "Hello, sir.\nThis is Lara from Like Card.", from: 'bot', bot: true },
  { MessageText: "اهلا بك سيد عيسى معك داليا من لايك كارد", from: 'bot', bot: true },
  { MessageText: "معاك ريان من موقع لايك كارد", from: 'bot', bot: true },
  { MessageText: "معك حمزة من موقع لايك كارد", from: 'bot', bot: true },
];

console.log('=== Testing Agent Name Extraction ===\n');

for (const tc of testCases) {
  const name = extractAgentName([tc]);
  console.log(`Message: ${tc.MessageText.substring(0, 50)}...`);
  console.log(`Extracted: ${name || '(none)'}\n`);
}

// Test with real data
console.log('\n=== Testing with Real Data ===\n');

const AGENT_TRANSFER_PHRASE = 'Please wait until I connect you to an Agent';
const AGENT_TRANSFER_PHRASES_AR = [
  'الرجاء الانتظار حتى أقوم بتحويلك الى موظف',
  'يرجى الانتظار حتى أقوم بتوصيلك بأحد الموظفين',
  'الرجاء الانتظار حتى أقوم بتوصيلك'
];

function isAgentTransferMessage(text) {
  if (text.includes(AGENT_TRANSFER_PHRASE)) return true;
  for (const phrase of AGENT_TRANSFER_PHRASES_AR) {
    if (text.includes(phrase)) return true;
  }
  return false;
}

const data = JSON.parse(fs.readFileSync('data/NewData/WEB EN_01 October 2025 - 31 October 2025 (1).txt', 'utf8'));

let found = 0;
let notFound = 0;
const agentCounts = {};

for (const chatter of data.ActiveChatters) {
  const sorted = [...(chatter.ChatHistory || [])].sort((a, b) => (a.Number || 0) - (b.Number || 0));
  let inHumanSection = false;
  const humanMessages = [];
  
  for (const msg of sorted) {
    const text = msg.MessageText || '';
    if (isAgentTransferMessage(text)) {
      inHumanSection = true;
      continue;
    }
    if (inHumanSection) {
      humanMessages.push(msg);
    }
  }
  
  if (humanMessages.length > 0) {
    const name = extractAgentName(humanMessages);
    if (name) {
      found++;
      agentCounts[name] = (agentCounts[name] || 0) + 1;
    } else {
      notFound++;
      if (notFound <= 3) {
        console.log('Failed to extract from:');
        humanMessages.slice(0, 3).forEach(m => {
          if (m.from !== 'user') {
            console.log(`  ${m.MessageText?.substring(0, 100)}`);
          }
        });
        console.log('');
      }
    }
  }
}

console.log('\n=== Summary ===');
console.log(`Found agent name: ${found}`);
console.log(`Not found: ${notFound}`);
console.log(`Success rate: ${((found / (found + notFound)) * 100).toFixed(1)}%`);

console.log('\n=== Agent Distribution ===');
const sortedAgents = Object.entries(agentCounts).sort((a, b) => b[1] - a[1]);
for (const [name, count] of sortedAgents.slice(0, 20)) {
  console.log(`  ${name}: ${count}`);
}
console.log(`Total unique agents: ${sortedAgents.length}`);
