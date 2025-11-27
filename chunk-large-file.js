const fs = require('fs');
const path = require('path');

class LargeFileChunker {
  constructor(inputFile, chunkSizeMB = 100) {
    this.inputFile = inputFile;
    this.chunkSizeMB = chunkSizeMB;
    this.chunkSizeBytes = chunkSizeMB * 1024 * 1024;
    this.dataDir = path.join(__dirname, 'data');
    this.chunksDir = path.join(this.dataDir, 'chunks');
  }

  async chunkFile() {
    console.log('🚀 Starting Large File Chunking Process');
    console.log(`📁 Input file: ${this.inputFile}`);
    console.log(`📊 Target chunk size: ${this.chunkSizeMB}MB`);
    
    // Create chunks directory
    if (!fs.existsSync(this.chunksDir)) {
      fs.mkdirSync(this.chunksDir, { recursive: true });
      console.log(`📂 Created chunks directory: ${this.chunksDir}`);
    }

    const inputPath = path.join(this.dataDir, this.inputFile);
    
    // Check if file exists
    if (!fs.existsSync(inputPath)) {
      throw new Error(`❌ File not found: ${inputPath}`);
    }

    const stats = fs.statSync(inputPath);
    const fileSizeGB = (stats.size / (1024 * 1024 * 1024)).toFixed(2);
    console.log(`📏 File size: ${fileSizeGB}GB (${stats.size} bytes)`);

    // Load and parse JSON
    console.log('📖 Loading JSON file...');
    const startTime = Date.now();
    
    let jsonData;
    try {
      const fileContent = fs.readFileSync(inputPath, 'utf8');
      jsonData = JSON.parse(fileContent);
      console.log(`✅ JSON loaded successfully in ${((Date.now() - startTime) / 1000).toFixed(2)}s`);
      console.log(`📊 Total conversations: ${jsonData.length}`);
    } catch (error) {
      throw new Error(`❌ Failed to parse JSON: ${error.message}`);
    }

    // Calculate conversations per chunk
    const totalConversations = jsonData.length;
    const estimatedConversationsPerChunk = Math.floor(
      (this.chunkSizeBytes / stats.size) * totalConversations
    );
    
    console.log(`🎯 Estimated conversations per chunk: ${estimatedConversationsPerChunk}`);

    // Split into chunks
    const chunks = [];
    let currentChunk = [];
    let currentChunkSize = 0;
    let chunkIndex = 0;

    for (let i = 0; i < jsonData.length; i++) {
      const conversation = jsonData[i];
      const conversationSize = JSON.stringify(conversation).length;

      // Check if adding this conversation would exceed chunk size
      if (currentChunkSize + conversationSize > this.chunkSizeBytes && currentChunk.length > 0) {
        // Save current chunk
        await this.saveChunk(currentChunk, chunkIndex, currentChunkSize);
        chunks.push({
          index: chunkIndex,
          conversations: currentChunk.length,
          sizeMB: (currentChunkSize / (1024 * 1024)).toFixed(2)
        });

        // Start new chunk
        currentChunk = [];
        currentChunkSize = 0;
        chunkIndex++;
      }

      currentChunk.push(conversation);
      currentChunkSize += conversationSize;

      // Progress indicator
      if ((i + 1) % 1000 === 0) {
        const progress = ((i + 1) / totalConversations * 100).toFixed(1);
        console.log(`⏳ Processing: ${progress}% (${i + 1}/${totalConversations})`);
      }
    }

    // Save final chunk
    if (currentChunk.length > 0) {
      await this.saveChunk(currentChunk, chunkIndex, currentChunkSize);
      chunks.push({
        index: chunkIndex,
        conversations: currentChunk.length,
        sizeMB: (currentChunkSize / (1024 * 1024)).toFixed(2)
      });
    }

    // Generate summary
    this.generateSummary(chunks, totalConversations, fileSizeGB);

    console.log('🎉 Chunking completed successfully!');
    return chunks;
  }

  async saveChunk(chunkData, index, size) {
    const chunkFileName = `conversations_chunk_${String(index).padStart(3, '0')}.json`;
    const chunkPath = path.join(this.chunksDir, chunkFileName);
    
    const chunkJson = JSON.stringify(chunkData, null, 2);
    fs.writeFileSync(chunkPath, chunkJson);
    
    const sizeMB = (size / (1024 * 1024)).toFixed(2);
    console.log(`💾 Saved chunk ${index}: ${chunkFileName} (${chunkData.length} conversations, ${sizeMB}MB)`);
  }

  generateSummary(chunks, totalConversations, originalSizeGB) {
    const summaryPath = path.join(this.chunksDir, 'chunking_summary.json');
    
    const summary = {
      originalFile: this.inputFile,
      originalSizeGB: parseFloat(originalSizeGB),
      totalConversations: totalConversations,
      totalChunks: chunks.length,
      targetChunkSizeMB: this.chunkSizeMB,
      chunks: chunks,
      createdAt: new Date().toISOString(),
      processingStats: {
        averageConversationsPerChunk: Math.round(totalConversations / chunks.length),
        averageChunkSizeMB: (chunks.reduce((sum, chunk) => sum + parseFloat(chunk.sizeMB), 0) / chunks.length).toFixed(2),
        estimatedProcessingTimeHours: (chunks.length * 1.1).toFixed(1), // 66 minutes per chunk
        estimatedAPICostUSD: `$${(chunks.length * 2.5).toFixed(0)}-${(chunks.length * 5).toFixed(0)}`
      }
    };

    fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
    
    console.log('\n📊 CHUNKING SUMMARY:');
    console.log(`📁 Original file: ${this.inputFile} (${originalSizeGB}GB)`);
    console.log(`🔢 Total conversations: ${totalConversations.toLocaleString()}`);
    console.log(`📦 Total chunks created: ${chunks.length}`);
    console.log(`⏱️  Estimated processing time: ${summary.processingStats.estimatedProcessingTimeHours} hours`);
    console.log(`💰 Estimated API cost: ${summary.processingStats.estimatedAPICostUSD}`);
    console.log(`📄 Summary saved: ${summaryPath}`);
    
    console.log('\n📦 CHUNK DETAILS:');
    chunks.forEach(chunk => {
      console.log(`  Chunk ${chunk.index}: ${chunk.conversations} conversations (${chunk.sizeMB}MB)`);
    });
  }

  async processChunksSequentially() {
    const summaryPath = path.join(this.chunksDir, 'chunking_summary.json');
    
    if (!fs.existsSync(summaryPath)) {
      throw new Error('❌ No chunking summary found. Please run chunking first.');
    }

    const summary = JSON.parse(fs.readFileSync(summaryPath, 'utf8'));
    console.log(`🚀 Starting sequential processing of ${summary.totalChunks} chunks`);

    const results = [];
    
    for (let i = 0; i < summary.totalChunks; i++) {
      const chunkFileName = `conversations_chunk_${String(i).padStart(3, '0')}.json`;
      console.log(`\n⏳ Processing chunk ${i + 1}/${summary.totalChunks}: ${chunkFileName}`);
      
      try {
        // Move chunk to main data directory temporarily
        const chunkPath = path.join(this.chunksDir, chunkFileName);
        const tempPath = path.join(this.dataDir, 'temp_processing.json');
        
        fs.copyFileSync(chunkPath, tempPath);
        
        // Process chunk (this would call your existing API)
        const startTime = Date.now();
        console.log(`🔄 Analyzing chunk ${i + 1}...`);
        
        // Here you would call your analysis API
        // const result = await this.analyzeChunk(tempPath);
        
        const processingTime = ((Date.now() - startTime) / 1000 / 60).toFixed(1);
        console.log(`✅ Chunk ${i + 1} completed in ${processingTime} minutes`);
        
        // Clean up temp file
        fs.unlinkSync(tempPath);
        
        results.push({
          chunkIndex: i,
          fileName: chunkFileName,
          processingTimeMinutes: parseFloat(processingTime),
          status: 'completed'
        });
        
      } catch (error) {
        console.error(`❌ Error processing chunk ${i + 1}: ${error.message}`);
        results.push({
          chunkIndex: i,
          fileName: chunkFileName,
          error: error.message,
          status: 'failed'
        });
      }
    }

    // Save processing results
    const resultsPath = path.join(this.chunksDir, 'processing_results.json');
    fs.writeFileSync(resultsPath, JSON.stringify(results, null, 2));
    
    console.log(`\n🎉 Sequential processing completed!`);
    console.log(`📄 Results saved: ${resultsPath}`);
    
    return results;
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'chunk';
  const fileName = args[1] || '0d1d46c3-ea4f-4fa6-b2a0-e58ec3211ce3.json';
  const chunkSize = parseInt(args[2]) || 100;

  const chunker = new LargeFileChunker(fileName, chunkSize);

  try {
    if (command === 'chunk') {
      await chunker.chunkFile();
    } else if (command === 'process') {
      await chunker.processChunksSequentially();
    } else {
      console.log('Usage:');
      console.log('  node chunk-large-file.js chunk [filename] [chunkSizeMB]');
      console.log('  node chunk-large-file.js process');
      console.log('');
      console.log('Examples:');
      console.log('  node chunk-large-file.js chunk 0d1d46c3-ea4f-4fa6-b2a0-e58ec3211ce3.json 100');
      console.log('  node chunk-large-file.js process');
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = LargeFileChunker; 