// Simple test to load Zainjo data
const fs = require('fs');
const path = require('path');

async function testZainjoLoad() {
  console.log('🧪 Testing Zainjo data loading...\n');
  
  const filePath = path.join(__dirname, 'data', 'Zainjo.json');
  
  try {
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      console.log('❌ File not found:', filePath);
      return;
    }
    
    const stats = fs.statSync(filePath);
    const fileSizeMB = stats.size / (1024 * 1024);
    console.log(`📁 File found: ${fileSizeMB.toFixed(1)}MB`);
    
    // Try to read and parse the file
    console.log('📖 Reading file...');
    const rawData = fs.readFileSync(filePath, 'utf-8');
    
    console.log('🔍 Parsing JSON...');
    const zainjoData = JSON.parse(rawData);
    
    console.log('✅ JSON parsed successfully!');
    console.log(`📊 Data structure:`);
    console.log(`   - Count: ${zainjoData.Count}`);
    console.log(`   - TotalPages: ${zainjoData.TotalPages}`);
    console.log(`   - PageSize: ${zainjoData.PageSize}`);
    console.log(`   - ActiveChatters: ${zainjoData.ActiveChatters ? zainjoData.ActiveChatters.length : 'undefined'}`);
    
    if (zainjoData.ActiveChatters && zainjoData.ActiveChatters.length > 0) {
      let validConversations = 0;
      let skippedConversations = 0;
      
      for (let i = 0; i < Math.min(10, zainjoData.ActiveChatters.length); i++) {
        const chatter = zainjoData.ActiveChatters[i];
        if (chatter.ChatHistory && chatter.ChatHistory.length > 0) {
          validConversations++;
          if (i === 0) {
            console.log(`\n📋 First valid chatter:`);
            console.log(`   - SenderID: ${chatter.SenderID}`);
            console.log(`   - ChatHistory length: ${chatter.ChatHistory.length}`);
            console.log(`   - First message: ${chatter.ChatHistory[0].MessageText ? chatter.ChatHistory[0].MessageText.substring(0, 50) + '...' : 'No text'}`);
          }
        } else {
          skippedConversations++;
        }
      }
      
      console.log(`\n📈 Sample analysis (first 10 chatters):`);
      console.log(`   - Valid conversations: ${validConversations}`);
      console.log(`   - Skipped conversations: ${skippedConversations}`);
      
      if (validConversations > 0) {
        console.log('\n🎉 SUCCESS: Zainjo data is valid and ready for processing!');
      } else {
        console.log('\n⚠️ WARNING: No valid conversations found in sample');
      }
    } else {
      console.log('❌ No ActiveChatters found in data');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.message.includes('JSON')) {
      console.log('💡 This might be a JSON formatting issue with the large file');
    }
  }
}

testZainjoLoad().catch(console.error); 