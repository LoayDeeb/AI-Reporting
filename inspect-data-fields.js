const fs = require('fs');

const data = JSON.parse(fs.readFileSync('data/NewData/WEB EN_01 October 2025 - 31 October 2025 (1).txt', 'utf8'));

// Get a sample with various message types
const samples = data.ActiveChatters.slice(0, 10);

console.log('=== Inspecting Message Fields ===\n');

const allFields = new Set();
const fieldExamples = {};

for (const chatter of samples) {
  for (const msg of chatter.ChatHistory || []) {
    for (const key of Object.keys(msg)) {
      allFields.add(key);
      if (!fieldExamples[key] && msg[key] !== null && msg[key] !== undefined && msg[key] !== '') {
        fieldExamples[key] = msg[key];
      }
    }
  }
}

console.log('All fields found in messages:');
for (const field of [...allFields].sort()) {
  const example = fieldExamples[field];
  const exampleStr = typeof example === 'object' ? JSON.stringify(example).substring(0, 80) : String(example).substring(0, 80);
  console.log(`  - ${field}: ${exampleStr}`);
}

// Look specifically for card/choice related fields
console.log('\n=== Looking for Card/Choice Related Data ===\n');

for (const chatter of data.ActiveChatters.slice(0, 50)) {
  for (const msg of chatter.ChatHistory || []) {
    // Check for any field containing 'card', 'choice', 'select', 'button', 'option'
    for (const [key, value] of Object.entries(msg)) {
      const keyLower = key.toLowerCase();
      const valueLower = String(value).toLowerCase();
      
      if (keyLower.includes('card') || keyLower.includes('choice') || 
          keyLower.includes('select') || keyLower.includes('button') ||
          keyLower.includes('option') || keyLower.includes('quick') ||
          valueLower.includes('selected') || valueLower.includes('choice')) {
        console.log(`Found in ${chatter.SenderID}:`);
        console.log(`  Field: ${key}`);
        console.log(`  Value: ${JSON.stringify(value).substring(0, 200)}`);
        console.log('');
      }
    }
  }
}

// Show a full message sample
console.log('\n=== Full Sample Message ===\n');
const sampleMsg = data.ActiveChatters[0].ChatHistory[0];
console.log(JSON.stringify(sampleMsg, null, 2));
