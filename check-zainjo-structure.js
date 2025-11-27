// Check Zainjo file structure without loading entire file
const fs = require('fs');
const path = require('path');

function checkZainjoStructure() {
  const sourceFile = path.join(__dirname, 'data', 'Zainjo.json');
  
  console.log('🔍 Checking Zainjo file structure...\n');
  
  const stream = fs.createReadStream(sourceFile, { encoding: 'utf8', highWaterMark: 1024 * 1024 });
  let buffer = '';
  let foundStructure = false;
  let chunkCount = 0;
  
  stream.on('data', (chunk) => {
    buffer += chunk;
    chunkCount++;
    
    if (!foundStructure && buffer.length > 10000) {
      console.log('📋 First 2000 characters of file:');
      console.log('=' .repeat(50));
      console.log(buffer.substring(0, 2000));
      console.log('=' .repeat(50));
      
      // Look for key patterns
      const patterns = [
        '"Count"',
        '"TotalPages"',
        '"PageSize"',
        '"ActiveChatters"',
        '"SenderID"',
        '"ChatHistory"'
      ];
      
      console.log('\n🔍 Pattern analysis:');
      patterns.forEach(pattern => {
        const index = buffer.indexOf(pattern);
        console.log(`   ${pattern}: ${index !== -1 ? `Found at position ${index}` : 'Not found'}`);
      });
      
      // Count ActiveChatters occurrences
      const activeChattersMatches = buffer.match(/"ActiveChatters"/g);
      console.log(`\n📊 "ActiveChatters" occurrences in first chunk: ${activeChattersMatches ? activeChattersMatches.length : 0}`);
      
      // Look for array structure
      const arrayStart = buffer.indexOf('"ActiveChatters":[');
      if (arrayStart !== -1) {
        console.log(`\n✅ Found ActiveChatters array at position ${arrayStart}`);
        const sampleAfterArray = buffer.substring(arrayStart + 18, arrayStart + 500);
        console.log('📝 Sample after ActiveChatters array start:');
        console.log(sampleAfterArray);
      }
      
      foundStructure = true;
      stream.destroy(); // Stop reading
    }
  });
  
  stream.on('end', () => {
    console.log(`\n📊 File analysis completed. Read ${chunkCount} chunks.`);
  });
  
  stream.on('error', (error) => {
    console.error('❌ Error:', error);
  });
}

checkZainjoStructure(); 