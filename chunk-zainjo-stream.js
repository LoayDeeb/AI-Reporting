// Chunk the large Zainjo file using stream-json
const fs = require('fs');
const path = require('path');
const StreamValues = require('stream-json/streamers/StreamValues');
const parser = require('stream-json');

async function chunkZainjoFileStream() {
  console.log('🔧 Chunking large Zainjo file with stream-json...\n');
  
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
    
    let currentChunk = 0;
    let chattersProcessed = 0;
    let currentChunkData = [];
    const maxChattersPerChunk = 500;
    
    console.log('🔍 Starting stream processing...');
    
    const pipeline = fs.createReadStream(sourceFile)
      .pipe(parser())
      .pipe(StreamValues.withParser());
    
    pipeline.on('data', (data) => {
      const key = data.key;
      const value = data.value;
      
      // We're looking for the ActiveChatters array
      if (key === 'ActiveChatters' && Array.isArray(value)) {
        console.log(`✅ Found ActiveChatters array with ${value.length} items`);
        
        // Process each chatter
        value.forEach((chatter, index) => {
          if (chatter.SenderID && chatter.ChatHistory && Array.isArray(chatter.ChatHistory)) {
            currentChunkData.push(chatter);
            chattersProcessed++;
            
            if (chattersProcessed % 1000 === 0) {
              console.log(`📊 Processed ${chattersProcessed} chatters...`);
            }
            
            if (currentChunkData.length >= maxChattersPerChunk) {
              // Save chunk
              saveChunk(outputDir, currentChunk, currentChunkData);
              currentChunk++;
              currentChunkData = [];
            }
          }
        });
        
        // Save remaining data
        if (currentChunkData.length > 0) {
          saveChunk(outputDir, currentChunk, currentChunkData);
          currentChunk++;
        }
        
        console.log(`\n✅ Processing completed!`);
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
      }
    });
    
    pipeline.on('error', (error) => {
      console.error('❌ Stream error:', error);
    });
    
    pipeline.on('end', () => {
      console.log('📊 Stream processing completed');
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

chunkZainjoFileStream().catch(console.error); 