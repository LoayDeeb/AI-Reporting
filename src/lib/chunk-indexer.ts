import fs from 'fs';
import path from 'path';

interface ChunkIndex {
  [senderID: string]: string; // Maps senderID to chunk filename
}

interface ChunkMetadata {
  filename: string;
  senderIDs: string[];
  messageCount: number;
  lastModified: number;
}

export class ChunkIndexer {
  private static indexCache: ChunkIndex | null = null;
  private static indexTimestamp: number = 0;
  private static readonly INDEX_CACHE_DURATION = Infinity; // Cache never expires
  private static readonly INDEX_FILE = path.join(process.cwd(), 'data', 'chunk-index.json');

  /**
   * Get or create an index mapping senderIDs to chunk filenames
   */
  static async getChunkIndex(): Promise<ChunkIndex> {
    const now = Date.now();
    
    // Return cached index if valid
    if (this.indexCache && (now - this.indexTimestamp) < this.INDEX_CACHE_DURATION) {
      console.log('📋 Using cached chunk index');
      return this.indexCache;
    }

    // Try to load existing index file
    if (fs.existsSync(this.INDEX_FILE)) {
      try {
        const indexData = JSON.parse(fs.readFileSync(this.INDEX_FILE, 'utf-8'));
        const indexAge = now - indexData.timestamp;
        
                 if (indexAge < this.INDEX_CACHE_DURATION) {
           console.log('📋 Loaded chunk index from file');
           this.indexCache = indexData.index;
           this.indexTimestamp = indexData.timestamp;
           return this.indexCache!;
         }
      } catch (error) {
        console.log('⚠️ Failed to load existing index, rebuilding...');
      }
    }

    // Build new index
    console.log('🔨 Building chunk index...');
    const index = await this.buildChunkIndex();
    
    // Cache the index
    this.indexCache = index;
    this.indexTimestamp = now;
    
    // Save index to file
    try {
      const indexData = {
        index,
        timestamp: now,
        buildTime: new Date().toISOString()
      };
      fs.writeFileSync(this.INDEX_FILE, JSON.stringify(indexData, null, 2));
      console.log('💾 Saved chunk index to file');
    } catch (error) {
      console.log('⚠️ Failed to save index file:', error);
    }

    return index;
  }

  /**
   * Build index by scanning chunk file headers (not loading full content)
   */
  private static async buildChunkIndex(): Promise<ChunkIndex> {
    const index: ChunkIndex = {};
    const chunksDir = path.join(process.cwd(), 'data', 'chunks');
    
    if (!fs.existsSync(chunksDir)) {
      console.log('❌ Chunks directory not found');
      return index;
    }

    const files = fs.readdirSync(chunksDir)
      .filter(file => file.startsWith('conversations_chunk_') && file.endsWith('.json'))
      .sort();

    console.log(`🔍 Scanning ${files.length} chunk files for senderIDs...`);

    for (const file of files) {
      try {
        const filePath = path.join(chunksDir, file);
        const fileStats = fs.statSync(filePath);
        
        // Load chunk data
        const chunkData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        
        // Extract senderIDs from conversations
        const senderIDs = new Set<string>();
        
        if (Array.isArray(chunkData)) {
          for (const conversation of chunkData) {
            if (conversation.ChatHistory && Array.isArray(conversation.ChatHistory)) {
              for (const message of conversation.ChatHistory) {
                if (message.SenderID) {
                  senderIDs.add(message.SenderID);
                }
              }
            }
          }
        }

        // Map each senderID to this chunk
        for (const senderID of senderIDs) {
          index[senderID] = file;
        }

        console.log(`✅ ${file}: ${senderIDs.size} unique senderIDs`);
        
      } catch (error) {
        console.log(`❌ Failed to process ${file}:`, error);
      }
    }

    console.log(`🎯 Index built: ${Object.keys(index).length} senderIDs mapped to chunks`);
    return index;
  }

  /**
   * Find which chunk contains a specific senderID
   */
  static async findChunkForSender(senderID: string): Promise<string | null> {
    const index = await this.getChunkIndex();
    return index[senderID] || null;
  }

  /**
   * Load messages for a specific senderID from its chunk
   */
  static async loadMessagesForSender(senderID: string): Promise<any[] | null> {
    const chunkFile = await this.findChunkForSender(senderID);
    
    if (!chunkFile) {
      console.log(`❌ No chunk found for senderID: ${senderID}`);
      return null;
    }

    console.log(`📖 Loading messages from ${chunkFile} for senderID: ${senderID}`);
    
    try {
      const chunksDir = path.join(process.cwd(), 'data', 'chunks');
      const filePath = path.join(chunksDir, chunkFile);
      const chunkData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      
      // Find messages for this specific senderID
      const messages: any[] = [];
      
      if (Array.isArray(chunkData)) {
        for (const conversation of chunkData) {
          if (conversation.ChatHistory && Array.isArray(conversation.ChatHistory)) {
            const conversationMessages = conversation.ChatHistory.filter(
              (message: any) => message.SenderID === senderID
            );
            messages.push(...conversationMessages);
          }
        }
      }

      console.log(`✅ Found ${messages.length} messages for senderID: ${senderID}`);
      return messages.length > 0 ? messages : null;
      
    } catch (error) {
      console.log(`❌ Failed to load chunk ${chunkFile}:`, error);
      return null;
    }
  }

  /**
   * Force rebuild the index (useful for development)
   */
  static async rebuildIndex(): Promise<ChunkIndex> {
    this.indexCache = null;
    this.indexTimestamp = 0;
    
    if (fs.existsSync(this.INDEX_FILE)) {
      fs.unlinkSync(this.INDEX_FILE);
    }
    
    return await this.getChunkIndex();
  }
} 