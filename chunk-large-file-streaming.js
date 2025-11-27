const fs = require('fs');
const path = require('path');
const { Transform } = require('stream');

class StreamingJSONChunker {
  constructor(inputFile, chunkSizeMB = 100) {
    this.inputFile = inputFile;
    this.chunkSizeMB = chunkSizeMB;
    this.chunkSizeBytes = chunkSizeMB * 1024 * 1024;
    this.dataDir = path.join(__dirname, 'data');
    this.chunksDir = path.join(this.dataDir, 'chunks');
    
    this.currentChunk = [];
    this.currentChunkSize = 0;
    this.chunkIndex = 0;
    this.totalConversations = 0;
    this.chunks = [];
    
    this.buffer = '';
    this.bracketDepth = 0;
    this.inArray = false;
    this.objectStart = -1;
  }

  async chunkFile() {
    console.log('🚀 Starting Streaming Large File Chunking Process');
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

    console.log('📖 Starting streaming JSON processing...');
    const startTime = Date.now();

    return new Promise((resolve, reject) => {
      const readStream = fs.createReadStream(inputPath, { encoding: 'utf8', highWaterMark: 64 * 1024 });
      
      readStream.on('data', (chunk) => {
        try {
          this.processChunk(chunk);
        } catch (error) {
          reject(error);
        }
      });

      readStream.on('end', async () => {
        try {
          // Process any remaining buffer
          if (this.buffer.trim()) {
            this.processChunk('');
          }
          
          // Save final chunk
          if (this.currentChunk.length > 0) {
            await this.saveChunk(this.currentChunk, this.chunkIndex, this.currentChunkSize);
            this.chunks.push({
              index: this.chunkIndex,
              conversations: this.currentChunk.length,
              sizeMB: (this.currentChunkSize / (1024 * 1024)).toFixed(2)
            });
          }

          // Generate summary
          this.generateSummary(this.chunks, this.totalConversations, fileSizeGB);

          const processingTime = ((Date.now() - startTime) / 1000).toFixed(2);
          console.log(`✅ Streaming processing completed in ${processingTime}s`);
          console.log('🎉 Chunking completed successfully!');
          
          resolve(this.chunks);
        } catch (error) {
          reject(error);
        }
      });

      readStream.on('error', (error) => {
        reject(error);
      });
    });
  }

  processChunk(data) {
    this.buffer += data;
    
    let i = 0;
    while (i < this.buffer.length) {
      const char = this.buffer[i];
      
      if (char === '[' && !this.inArray) {
        this.inArray = true;
        this.objectStart = i + 1;
      } else if (char === '{' && this.inArray) {
        if (this.bracketDepth === 0) {
          this.objectStart = i;
        }
        this.bracketDepth++;
      } else if (char === '}' && this.inArray) {
        this.bracketDepth--;
        
        if (this.bracketDepth === 0 && this.objectStart !== -1) {
          // We have a complete object
          const objectStr = this.buffer.substring(this.objectStart, i + 1);
          try {
            const conversation = JSON.parse(objectStr);
            this.addConversationToChunk(conversation, objectStr);
          } catch (error) {
            // Skip malformed JSON objects
            console.warn(`⚠️  Skipping malformed JSON object at position ${this.objectStart}`);
          }
          this.objectStart = -1;
        }
      }
      
      i++;
    }
    
    // Keep only the unprocessed part of the buffer
    if (this.objectStart !== -1 && this.objectStart > 0) {
      this.buffer = this.buffer.substring(this.objectStart);
      this.objectStart = 0;
    } else if (this.bracketDepth === 0 && this.inArray) {
      // Find the last complete object boundary
      const lastBrace = this.buffer.lastIndexOf('}');
      if (lastBrace !== -1) {
        this.buffer = this.buffer.substring(lastBrace + 1);
      }
    }
  }

  async addConversationToChunk(conversation, conversationStr) {
    const conversationSize = conversationStr.length;
    
    // Check if adding this conversation would exceed chunk size
    if (this.currentChunkSize + conversationSize > this.chunkSizeBytes && this.currentChunk.length > 0) {
      // Save current chunk
      await this.saveChunk(this.currentChunk, this.chunkIndex, this.currentChunkSize);
      this.chunks.push({
        index: this.chunkIndex,
        conversations: this.currentChunk.length,
        sizeMB: (this.currentChunkSize / (1024 * 1024)).toFixed(2)
      });

      // Start new chunk
      this.currentChunk = [];
      this.currentChunkSize = 0;
      this.chunkIndex++;
    }

    this.currentChunk.push(conversation);
    this.currentChunkSize += conversationSize;
    this.totalConversations++;

    // Progress indicator
    if (this.totalConversations % 1000 === 0) {
      console.log(`⏳ Processed: ${this.totalConversations.toLocaleString()} conversations`);
    }
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
}

// Alternative approach using line-by-line processing for very large files
class LineByLineChunker {
  constructor(inputFile, chunkSizeMB = 100) {
    this.inputFile = inputFile;
    this.chunkSizeMB = chunkSizeMB;
    this.chunkSizeBytes = chunkSizeMB * 1024 * 1024;
    this.dataDir = path.join(__dirname, 'data');
    this.chunksDir = path.join(this.dataDir, 'chunks');
  }

  async chunkFileByLines() {
    console.log('🚀 Starting Line-by-Line Chunking (Alternative Method)');
    console.log('⚠️  This method assumes each conversation is on a separate line');
    
    const inputPath = path.join(this.dataDir, this.inputFile);
    const readline = require('readline');
    
    const fileStream = fs.createReadStream(inputPath);
    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity
    });

    let currentChunk = [];
    let currentChunkSize = 0;
    let chunkIndex = 0;
    let totalConversations = 0;
    const chunks = [];

    for await (const line of rl) {
      if (line.trim() && line.trim() !== '[' && line.trim() !== ']' && line.trim() !== ',') {
        try {
          // Remove trailing comma if present
          const cleanLine = line.trim().replace(/,$/, '');
          const conversation = JSON.parse(cleanLine);
          const conversationSize = cleanLine.length;

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
          totalConversations++;

          if (totalConversations % 1000 === 0) {
            console.log(`⏳ Processed: ${totalConversations.toLocaleString()} conversations`);
          }
        } catch (error) {
          console.warn(`⚠️  Skipping invalid JSON line: ${line.substring(0, 100)}...`);
        }
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

    console.log(`✅ Line-by-line processing completed: ${totalConversations.toLocaleString()} conversations`);
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
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'stream';
  const fileName = args[1] || '0d1d46c3-ea4f-4fa6-b2a0-e58ec3211ce3.json';
  const chunkSize = parseInt(args[2]) || 100;

  try {
    if (command === 'stream') {
      const chunker = new StreamingJSONChunker(fileName, chunkSize);
      await chunker.chunkFile();
    } else if (command === 'lines') {
      const chunker = new LineByLineChunker(fileName, chunkSize);
      await chunker.chunkFileByLines();
    } else {
      console.log('Usage:');
      console.log('  node chunk-large-file-streaming.js stream [filename] [chunkSizeMB]');
      console.log('  node chunk-large-file-streaming.js lines [filename] [chunkSizeMB]');
      console.log('');
      console.log('Examples:');
      console.log('  node chunk-large-file-streaming.js stream 0d1d46c3-ea4f-4fa6-b2a0-e58ec3211ce3.json 100');
      console.log('  node chunk-large-file-streaming.js lines 0d1d46c3-ea4f-4fa6-b2a0-e58ec3211ce3.json 100');
      console.log('');
      console.log('Methods:');
      console.log('  stream - Streaming JSON parser (recommended for large files)');
      console.log('  lines  - Line-by-line processing (alternative method)');
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { StreamingJSONChunker, LineByLineChunker }; 