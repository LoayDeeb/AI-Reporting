// Debug script for Zainjo data
const fs = require('fs');
const path = require('path');

async function debugZainjoData() {
  console.log('🔍 Debugging Zainjo data structure...\n');
  
  const filePath = path.join(__dirname, 'data', 'Zainjo.json');
  
  try {
    // Check file existence
    if (!fs.existsSync(filePath)) {
      console.log('❌ File not found:', filePath);
      return;
    }
    
    const stats = fs.statSync(filePath);
    console.log(`📁 File size: ${(stats.size / (1024 * 1024)).toFixed(1)}MB`);
    
    // Read first 5000 characters to analyze structure
    const stream = fs.createReadStream(filePath, { 
      encoding: 'utf8',
      start: 0,
      end: 5000
    });
    
    let data = '';
    
    stream.on('data', (chunk) => {
      data += chunk;
    });
    
    stream.on('end', () => {
      console.log('📝 First 2000 characters:');
      console.log(data.substring(0, 2000));
      console.log('\n...\n');
      
      try {
        // Try to parse the beginning as JSON
        const firstBrace = data.indexOf('{');
        if (firstBrace !== -1) {
          // Find the end of the first complete object
          let braceCount = 0;
          let endIndex = firstBrace;
          
          for (let i = firstBrace; i < data.length; i++) {
            if (data[i] === '{') braceCount++;
            if (data[i] === '}') braceCount--;
            if (braceCount === 0) {
              endIndex = i;
              break;
            }
          }
          
          const partialJson = data.substring(0, endIndex + 1);
          console.log('🔍 Attempting to parse partial JSON...');
          
          const parsed = JSON.parse(partialJson);
          console.log('✅ Successfully parsed partial JSON');
          console.log('📊 Structure:');
          console.log('- Count:', parsed.Count);
          console.log('- TotalPages:', parsed.TotalPages);
          console.log('- PageSize:', parsed.PageSize);
          console.log('- ActiveChatters length:', parsed.ActiveChatters ? parsed.ActiveChatters.length : 'undefined');
          
          if (parsed.ActiveChatters && parsed.ActiveChatters.length > 0) {
            const firstChatter = parsed.ActiveChatters[0];
            console.log('\n📋 First chatter structure:');
            console.log('- Id:', firstChatter.Id);
            console.log('- SenderID:', firstChatter.SenderID);
            console.log('- ChatDate:', firstChatter.ChatDate);
            console.log('- ChatHistory length:', firstChatter.ChatHistory ? firstChatter.ChatHistory.length : 'undefined');
            
            if (firstChatter.ChatHistory && firstChatter.ChatHistory.length > 0) {
              console.log('\n💬 First message structure:');
              const firstMsg = firstChatter.ChatHistory[0];
              console.log('- ID:', firstMsg.ID);
              console.log('- from:', firstMsg.from);
              console.log('- Type:', firstMsg.Type);
              console.log('- MessageText:', firstMsg.MessageText ? firstMsg.MessageText.substring(0, 50) + '...' : 'undefined');
              console.log('- SenderID:', firstMsg.SenderID);
            }
          }
        }
      } catch (parseError) {
        console.log('❌ JSON parse error:', parseError.message);
      }
    });
    
    stream.on('error', (error) => {
      console.error('❌ Stream error:', error);
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

debugZainjoData().catch(console.error); 