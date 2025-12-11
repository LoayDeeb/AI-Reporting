const fs = require('fs');

const data = JSON.parse(fs.readFileSync('data/NewData/WEB EN_01 October 2025 - 31 October 2025 (1).txt', 'utf8'));

console.log('=== Looking for Agent Names in Source Data ===\n');

const allFields = new Set();
const fieldExamples = {};

// Inspect all fields in messages
for (const chatter of data.ActiveChatters.slice(0, 100)) {
  for (const msg of chatter.ChatHistory || []) {
    for (const [key, value] of Object.entries(msg)) {
      allFields.add(key);
      if (!fieldExamples[key] && value !== null && value !== undefined && value !== '') {
        fieldExamples[key] = value;
      }
      
      // Look for agent-related fields
      const keyLower = key.toLowerCase();
      if (keyLower.includes('agent') || keyLower.includes('name') || keyLower.includes('operator')) {
        console.log(`Potential agent field: ${key} = ${JSON.stringify(value).substring(0, 100)}`);
      }
    }
  }
}

console.log('\n=== All Message Fields ===\n');
for (const field of [...allFields].sort()) {
  const example = fieldExamples[field];
  const exampleStr = typeof example === 'object' ? JSON.stringify(example).substring(0, 100) : String(example).substring(0, 100);
  console.log(`  ${field}: ${exampleStr}`);
}

// Check chatter-level fields too
console.log('\n=== Chatter-Level Fields ===\n');
const chatterFields = new Set();
const chatterExamples = {};

for (const chatter of data.ActiveChatters.slice(0, 50)) {
  for (const [key, value] of Object.entries(chatter)) {
    if (key !== 'ChatHistory') {
      chatterFields.add(key);
      if (!chatterExamples[key] && value !== null && value !== undefined && value !== '') {
        chatterExamples[key] = value;
      }
    }
  }
}

for (const field of [...chatterFields].sort()) {
  const example = chatterExamples[field];
  const exampleStr = typeof example === 'object' ? JSON.stringify(example).substring(0, 100) : String(example).substring(0, 100);
  console.log(`  ${field}: ${exampleStr}`);
}

// Look at a conversation that likely has human agent
console.log('\n=== Sample Human Agent Messages ===\n');
for (const chatter of data.ActiveChatters.slice(0, 200)) {
  for (const msg of chatter.ChatHistory || []) {
    const text = msg.MessageText || '';
    // Look for agent transfer and subsequent messages
    if (text.includes('connect you to an Agent') || text.includes('تحويلك الى موظف')) {
      console.log(`SenderID: ${chatter.SenderID}`);
      const idx = chatter.ChatHistory.indexOf(msg);
      // Show next few messages
      for (let i = idx; i < Math.min(idx + 5, chatter.ChatHistory.length); i++) {
        const m = chatter.ChatHistory[i];
        console.log(`  [${i}] from=${m.from}, bot=${m.bot}, text=${(m.MessageText || '').substring(0, 50)}...`);
        console.log(`       All keys: ${Object.keys(m).join(', ')}`);
      }
      console.log('');
      break;
    }
  }
}
