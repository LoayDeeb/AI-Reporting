// Chunk the large Zainjo file into smaller pieces
const fs = require('fs');
const path = require('path');

async function chunkZainjoFile() {
  console.log('🔧 Chunking large Zainjo file...\n');
  
  const sourceFile = path.join(__dirname, 'data', 'Zainjo.json');
  const outputDir = path.join(__dirname, 'data', 'zainjo-chunks');
  
  // Create output directory
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  try {
    const stats = fs.statSync(sourceFile);
    const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(1);
    console.log(`📁 Source file: ${fileSizeMB}MB`);
    
    // Read file in chunks
    const chunkSize = 1024 * 1024; // 1MB chunks
    let buffer = '';
    let foundArray = false;
    let braceCount = 0;
    let currentChunk = 0;
    let chattersProcessed = 0;
    let currentChunkData = [];
    const maxChattersPerChunk = 500; // Smaller chunks for better memory management
    let inObject = false;
    let objectStart = -1;
    
    console.log('🔍 Looking for ActiveChatters array...');
    
    const stream = fs.createReadStream(sourceFile, { encoding: 'utf8', highWaterMark: chunkSize });
    
    stream.on('data', (chunk) => {
      buffer += chunk;
      
      if (!foundArray) {
        const activeChattersIndex = buffer.indexOf('"ActiveChatters":[');
        if (activeChattersIndex !== -1) {
          foundArray = true;
          console.log('✅ Found ActiveChatters array start');
          // Keep everything from the array start
          buffer = buffer.substring(activeChattersIndex + 18); // Skip "ActiveChatters":[
        } else {
          // Keep only the last part that might contain the start
          buffer = buffer.slice(-100);
        }
        return;
      }
      
      // Process character by character to find complete objects
      for (let i = 0; i < buffer.length; i++) {
        const char = buffer[i];
        
        if (char === '{') {
          if (braceCount === 0) {
            objectStart = i;
            inObject = true;
          }
          braceCount++;
        } else if (char === '}') {
          braceCount--;
          if (braceCount === 0 && inObject && objectStart >= 0) {
            // Complete object found
            try {
              const objectJson = buffer.substring(objectStart, i + 1);
              const chatter = JSON.parse(objectJson);
              
              // Validate that it's a proper chatter object
              if (chatter.SenderID && chatter.ChatHistory && Array.isArray(chatter.ChatHistory)) {
                currentChunkData.push(chatter);
                chattersProcessed++;
                
                if (chattersProcessed % 100 === 0) {
                  console.log(`📊 Processed ${chattersProcessed} chatters...`);
                }
                
                if (currentChunkData.length >= maxChattersPerChunk) {
                  // Save chunk
                  saveChunk(outputDir, currentChunk, currentChunkData);
                  currentChunk++;
                  currentChunkData = [];
                }
              }
            } catch (e) {
              // Skip invalid JSON - this is normal for partial objects
            }
            
            inObject = false;
            objectStart = -1;
          }
        }
      }
      
      // Keep unprocessed part of buffer (last incomplete object)
      if (objectStart >= 0) {
        buffer = buffer.substring(objectStart);
      } else {
        // Keep last 1000 characters to ensure we don't lose object boundaries
        buffer = buffer.slice(-1000);
      }
    });
    
    stream.on('end', () => {
      // Save remaining data
      if (currentChunkData.length > 0) {
        saveChunk(outputDir, currentChunk, currentChunkData);
        currentChunk++;
      }
      
      console.log(`\n✅ Chunking completed!`);
      console.log(`   - Total chatters processed: ${chattersProcessed}`);
      console.log(`   - Chunks created: ${currentChunk}`);
      console.log(`   - Output directory: ${outputDir}`);
      
      // Create a summary file
      const summary = {
        totalChatters: chattersProcessed,
        totalChunks: currentChunk,
        maxChattersPerChunk,
        timestamp: new Date().toISOString(),
        sourceFile: sourceFile,
        sourceFileSizeMB: parseFloat(fileSizeMB)
      };
      
      fs.writeFileSync(path.join(outputDir, 'chunking-summary.json'), JSON.stringify(summary, null, 2));
      console.log(`📋 Summary saved to chunking-summary.json`);
      
      // Verify first chunk
      if (currentChunk > 0) {
        const firstChunkPath = path.join(outputDir, 'zainjo-chunk-000.json');
        if (fs.existsSync(firstChunkPath)) {
          const firstChunk = JSON.parse(fs.readFileSync(firstChunkPath, 'utf-8'));
          console.log(`\n🔍 First chunk verification:`);
          console.log(`   - Chatters in first chunk: ${firstChunk.totalChatters}`);
          console.log(`   - First chatter SenderID: ${firstChunk.chatters[0]?.SenderID}`);
          console.log(`   - First chatter messages: ${firstChunk.chatters[0]?.ChatHistory?.length}`);
        }
      }
    });
    
    stream.on('error', (error) => {
      console.error('❌ Error:', error);
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

function saveChunk(outputDir, chunkNumber, chatters) {
  const filename = `zainjo-chunk-${chunkNumber.toString().padStart(3, '0')}.json`;
  const filepath = path.join(outputDir, filename);
  
  const chunkData = {
    chunkNumber,
    totalChatters: chatters.length,
    chatters: chatters
  };
  
  fs.writeFileSync(filepath, JSON.stringify(chunkData, null, 2));
  console.log(`💾 Saved chunk ${chunkNumber}: ${chatters.length} chatters -> ${filename}`);
}

chunkZainjoFile().catch(console.error); 