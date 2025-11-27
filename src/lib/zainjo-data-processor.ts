// 🎯 DEMO MODE INSTRUCTIONS:
// To enable demo mode (skip chunk loading): Set DEMO_MODE = true (line ~60)
// To disable demo mode (normal operation): Set DEMO_MODE = false (line ~60)

import fs from 'fs';
import path from 'path';
import StreamValues from 'stream-json/streamers/StreamValues';
import parser from 'stream-json';
import { Conversation, Message, ConversationAnalytics } from '@/types/conversation';

interface ZainjoMessage {
  ID: string;
  from: string;
  to: string;
  Type: string;
  Agent: boolean;
  MessageText: string;
  TimeSent: string;
  DateSent: string;
  DateStamp: string;
  SenderID: string;
  PageID: string;
  bot: boolean;
  Number: number;
}

interface ZainjoChatter {
  Id: string;
  SenderID: string;
  PageID: string;
  ChatDate: string;
  ChatHistory: ZainjoMessage[];
}

interface ZainjoDataFormat {
  Count: number;
  TotalPages: number;
  PageSize: number;
  ActiveChatters: ZainjoChatter[];
}

interface ZainjoCachedAnalysis {
  timestamp: number;
  analytics: ConversationAnalytics[];
  aiInsights: {
    insights: string;
    recommendations: string[];
    trends: string[];
  };
  sourceFile: string;
}

interface ZainjoChunk {
  chunkNumber: number;
  totalChatters: number;
  chatters: ZainjoChatter[];
}

interface ZainjoChunkSummary {
  totalChatters: number;
  totalChunks: number;
  maxChattersPerChunk: number;
  timestamp: string;
  sourceFile: string;
  sourceFileSizeMB: number;
}

export class ZainjoDataProcessor {
  private chunksDir: string;
  private cacheFilePath: string;
  private sourceFilePath: string;
  
  // 🎯 DEMO MODE TOGGLE - Set to true to skip cache loading for demos
  public static readonly DEMO_MODE = false; // Changed to false to enable full processing

  /**
   * @param sourceFileName - The JSON file to process (e.g., 'Zainjo.json' or 'alma.json')
   */
  constructor(sourceFileName: string = 'Zainjo.json') {
    // Use the file prefix (e.g., 'zainjo' or 'alma') for cache and chunk dirs
    const prefix = sourceFileName.replace(/\.json$/i, '').toLowerCase();
    this.chunksDir = path.join(process.cwd(), 'data', `${prefix}-chunks`);
    this.cacheFilePath = path.join(process.cwd(), 'data', `${prefix}-analysis-cache.json`);
    this.sourceFilePath = path.join(process.cwd(), 'data', sourceFileName);
  }

  /**
   * Load cached Zainjo analysis results
   */
  async loadCache(): Promise<ZainjoCachedAnalysis | null> {
    try {
      if (fs.existsSync(this.cacheFilePath)) {
        const stats = fs.statSync(this.cacheFilePath);
        const fileSizeMB = stats.size / (1024 * 1024);
        
        console.log(`📋 Loading Zainjo cache file (${fileSizeMB.toFixed(1)}MB)...`);
        
        const cacheData = fs.readFileSync(this.cacheFilePath, 'utf-8');
        return JSON.parse(cacheData);
      }
    } catch (error) {
      console.error('Error loading Zainjo cache:', error);
    }
    return null;
  }

  /**
   * Save Zainjo analysis results to cache
   */
  private saveCache(analytics: ConversationAnalytics[], aiInsights: any): void {
    try {
      const cacheData: ZainjoCachedAnalysis = {
        timestamp: Date.now(),
        analytics,
        aiInsights,
        sourceFile: this.sourceFilePath
      };
      fs.writeFileSync(this.cacheFilePath, JSON.stringify(cacheData, null, 2));
      console.log('✅ Zainjo analysis results cached successfully');
    } catch (error) {
      console.error('Error saving Zainjo cache:', error);
    }
  }

  /**
   * Check if Zainjo cache is valid (no expiry - always valid)
   */
  isCacheValid(cache: ZainjoCachedAnalysis): boolean {
    return true; // Always use cache if it exists, regardless of age
  }

  /**
   * Convert Zainjo format to standard conversation format
   */
  private convertZainjoToConversations(zainjoData: ZainjoDataFormat): Conversation[] {
    console.log(`🔄 Converting ${zainjoData.ActiveChatters.length} Zainjo chatters to conversation format...`);
    
    const conversations: Conversation[] = [];
    let skippedCount = 0;
    
    for (const chatter of zainjoData.ActiveChatters) {
      if (!chatter.ChatHistory || chatter.ChatHistory.length === 0) {
        skippedCount++;
        continue; // Skip chatters with no messages
      }

      // Convert Zainjo messages to standard message format
      const messages: Message[] = chatter.ChatHistory.map((msg: ZainjoMessage) => ({
        ID: msg.ID,
        from: (msg.from === 'bot' ? 'bot' : 'user') as 'bot' | 'user',
        to: (msg.to === 'bot' ? 'bot' : 'user') as 'bot' | 'user',
        Type: msg.Type as 'Text' | 'Video' | 'Image' | 'Cards' | undefined,
        Agent: msg.Agent,
        MessageText: msg.MessageText,
        TimeSent: msg.TimeSent,
        DateSent: msg.DateSent,
        DateStamp: { $date: { $numberLong: new Date(msg.DateStamp).getTime().toString() } },
        SenderID: msg.SenderID,
        PageID: msg.PageID,
        bot: msg.bot,
        Number: msg.Number
      }));

      // Create conversation object using the correct interface
      const conversation: Conversation = {
        ChatDate: { $date: { $numberLong: new Date(chatter.ChatDate || Date.now()).getTime().toString() } },
        ChatHistory: messages
      };

      conversations.push(conversation);
    }

    console.log(`✅ Conversion completed:`);
    console.log(`   - Valid conversations: ${conversations.length}`);
    console.log(`   - Skipped (no messages): ${skippedCount}`);
    console.log(`   - Total processed: ${zainjoData.ActiveChatters.length}`);
    
    return conversations;
  }

  /**
   * Load and convert Zainjo data using streaming for large files
   */
  async loadZainjoConversations(): Promise<Conversation[]> {
    try {
      console.log('📖 Loading Zainjo data file...');
      
      if (!fs.existsSync(this.sourceFilePath)) {
        console.error('Zainjo data file not found:', this.sourceFilePath);
        return [];
      }

      const stats = fs.statSync(this.sourceFilePath);
      const fileSizeMB = stats.size / (1024 * 1024);
      console.log(`📁 Loading Zainjo.json (${fileSizeMB.toFixed(1)}MB)...`);

      // For large files, use streaming JSON parser
      if (fileSizeMB > 100) {
        console.log('🔄 Using streaming parser for large file...');
        return this.loadZainjoWithStreaming();
      }

      // For smaller files, use traditional method
      console.log('📖 Reading file directly...');
      const rawData = fs.readFileSync(this.sourceFilePath, 'utf-8');
      
      console.log('🔍 Parsing JSON...');
      const zainjoData: ZainjoDataFormat = JSON.parse(rawData);

      console.log(`📊 Zainjo data loaded successfully!`);
      console.log(`   - Total records: ${zainjoData.Count}`);
      console.log(`   - Active chatters: ${zainjoData.ActiveChatters.length}`);
      console.log(`   - Total pages: ${zainjoData.TotalPages}`);

      // Convert to standard format
      const conversations = this.convertZainjoToConversations(zainjoData);
      
      return conversations;
    } catch (error) {
      console.error('Error loading Zainjo conversations:', error);
      return [];
    }
  }

  /**
   * Load Zainjo data using streaming JSON parser for large files
   */
  private async loadZainjoWithStreaming(): Promise<Conversation[]> {
    return new Promise((resolve, reject) => {
      const conversations: Conversation[] = [];
      let processedCount = 0;
      let skippedCount = 0;
      
      console.log('🌊 Starting streaming JSON parse...');
      
      const pipeline = fs.createReadStream(this.sourceFilePath)
        .pipe(parser())
        .pipe(StreamValues.withParser());

      pipeline.on('data', (data) => {
        try {
          // Look for ActiveChatters array items
          if (data.key === 'ActiveChatters' && Array.isArray(data.value)) {
            console.log(`📊 Found ActiveChatters array with ${data.value.length} items`);
            
            // Process each chatter
            for (const chatter of data.value) {
              if (!chatter.ChatHistory || chatter.ChatHistory.length === 0) {
                skippedCount++;
                continue;
              }

              // Convert to standard message format
              const messages: Message[] = chatter.ChatHistory.map((msg: any) => ({
                ID: msg.ID,
                from: (msg.from === 'bot' ? 'bot' : 'user') as 'bot' | 'user',
                to: (msg.to === 'bot' ? 'bot' : 'user') as 'bot' | 'user',
                Type: msg.Type as 'Text' | 'Video' | 'Image' | 'Cards' | undefined,
                Agent: msg.Agent,
                MessageText: msg.MessageText,
                TimeSent: msg.TimeSent,
                DateSent: msg.DateSent,
                DateStamp: { $date: { $numberLong: new Date(msg.DateStamp).getTime().toString() } },
                SenderID: msg.SenderID,
                PageID: msg.PageID,
                bot: msg.bot,
                Number: msg.Number
              }));

              // Create conversation object
              const conversation: Conversation = {
                ChatDate: { $date: { $numberLong: new Date(chatter.ChatDate || Date.now()).getTime().toString() } },
                ChatHistory: messages
              };

              conversations.push(conversation);
              processedCount++;
              
              // Log progress every 1000 conversations
              if (processedCount % 1000 === 0) {
                console.log(`📈 Processed ${processedCount} conversations...`);
              }
            }
          }
        } catch (error) {
          console.error('Error processing stream data:', error);
        }
      });

      pipeline.on('end', () => {
        console.log(`✅ Streaming completed:`);
        console.log(`   - Valid conversations: ${conversations.length}`);
        console.log(`   - Skipped (no messages): ${skippedCount}`);
        console.log(`   - Total processed: ${processedCount + skippedCount}`);
        resolve(conversations);
      });

      pipeline.on('error', (error) => {
        console.error('❌ Streaming error:', error);
        reject(error);
      });
    });
  }

  /**
   * Process Zainjo conversations with analysis - ENHANCED VERSION
   */
  async processZainjoConversations(
    fastMode: boolean = false,
    sampleSize: number = 5,
    optimization: string = 'standard',
    forceRefresh: boolean = false
  ): Promise<any> {
    console.log('🚀 Starting ENHANCED Zainjo data processing...');
    
    // Check if we should process all conversations (sampleSize = 0)
    const processAll = sampleSize === 0;
    const effectiveSampleSize = processAll ? 18668 : sampleSize;
    
    console.log(`📊 Processing mode: ${processAll ? 'ALL conversations' : `${sampleSize} conversations`}`);
    console.log(`⚡ ENHANCED: Parallel processing + Resume capability + Optimized AI calls`);
    
    // Check cache first (unless forced refresh)
    if (!forceRefresh) {
      const cache = await this.loadCache();
      if (cache && this.isCacheValid(cache)) {
        console.log('✅ Using cached Zainjo analysis results');
        
        if (processAll || cache.analytics.length >= sampleSize) {
          const analyticsToReturn = processAll ? cache.analytics : cache.analytics.slice(0, sampleSize);
          
          return {
            analytics: analyticsToReturn,
            aiInsights: cache.aiInsights,
            fromCache: true
          };
        }
      }
    }
    
    console.log(`🔄 Processing ${processAll ? 'ALL' : effectiveSampleSize} conversations with ENHANCED engine...`);
    
    // Load conversations with optimized chunk processing
    const conversations = await this.loadZainjoConversationsOptimized(processAll ? 0 : sampleSize);
    if (conversations.length === 0) {
      // 🎯 DEMO MODE: If no conversations loaded (demo mode), check if we have cache
      if (ZainjoDataProcessor.DEMO_MODE) {
        const cache = await this.loadCache();
        if (cache) {
          console.log('🎯 DEMO MODE: Using existing cached data instead of chunk loading');
          const analyticsToReturn = processAll ? cache.analytics : cache.analytics.slice(0, sampleSize);
          return {
            analytics: analyticsToReturn,
            aiInsights: cache.aiInsights,
            fromCache: true
          };
        } else {
          throw new Error('DEMO MODE: No cached data available and chunk loading is disabled');
        }
      }
      throw new Error('No Zainjo conversations loaded from chunks');
    }

    console.log(`📊 Loaded ${conversations.length} Zainjo conversations for processing`);

    // Import the existing data processor for analysis logic
    const { DataProcessor } = await import('./data-processor');
    const dataProcessor = new DataProcessor();

    // Convert to the format expected by the data processor
    const conversationMap = new Map<string, Message[]>();
    conversations.forEach((conv, index) => {
      conversationMap.set(`zainjo-${index}`, conv.ChatHistory);
    });

    const conversationIds = Array.from(conversationMap.keys());
    const idsToProcess = processAll ? conversationIds : conversationIds.slice(0, sampleSize);
    
    console.log(`🔥 ENHANCED PROCESSING: ${idsToProcess.length} conversations`);
    console.log(`⚡ Features: Parallel batches + Resume capability + Progress tracking`);
    
    // Enhanced parallel processing with resume capability
    const analytics = await this.processConversationsParallel(idsToProcess, conversationMap, dataProcessor);
    
    console.log(`✅ Completed processing ${analytics.length} conversations`);

    // Generate AI insights with optimization
    console.log('🧠 Generating optimized AI insights...');
    const { AIAnalysisService } = await import('./ai-analysis');
    const aiService = new AIAnalysisService();
    const aiInsights = await aiService.consolidateConversationInsights(analytics);

    // Cache the results
    if (processAll || analytics.length >= 50) {
      console.log('💾 Caching enhanced analysis results...');
      this.saveCache(analytics, aiInsights);
    }

    return {
      analytics,
      aiInsights,
      fromCache: false
    };
  }

  /**
   * Enhanced parallel processing with resume capability
   */
  private async processConversationsParallel(
    conversationIds: string[],
    conversationMap: Map<string, Message[]>,
    dataProcessor: any
  ): Promise<any[]> {
    const BATCH_SIZE = 20; // Process 20 conversations in parallel
    const SAVE_INTERVAL = 100; // Save progress every 100 conversations
    const PROGRESS_FILE = path.join(this.chunksDir, 'processing-progress.json');
    
    // Check for existing progress
    let processedIds: string[] = [];
    let startIndex = 0;
    
    if (fs.existsSync(PROGRESS_FILE)) {
      try {
        const progress = JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf-8'));
        processedIds = progress.processedIds || [];
        startIndex = processedIds.length;
        console.log(`📋 RESUME: Found previous progress - ${startIndex} conversations already processed`);
             } catch (error: any) {
         console.log('⚠️ Could not read progress file, starting fresh');
       }
    }
    
    const remainingIds = conversationIds.slice(startIndex);
    const analytics: any[] = [];
    
    console.log(`🚀 PARALLEL PROCESSING: ${remainingIds.length} remaining conversations in batches of ${BATCH_SIZE}`);
    
    const startTime = Date.now();
    
    // Process in parallel batches
    for (let i = 0; i < remainingIds.length; i += BATCH_SIZE) {
      const batch = remainingIds.slice(i, i + BATCH_SIZE);
      const batchStartTime = Date.now();
      
      console.log(`📊 Batch ${Math.floor(i/BATCH_SIZE) + 1}/${Math.ceil(remainingIds.length/BATCH_SIZE)}: Processing ${batch.length} conversations...`);
      
      // Process batch in parallel
      const batchPromises = batch.map(async (id) => {
        const messages = conversationMap.get(id)!;
        return await dataProcessor.analyzeConversation(id, messages);
      });
      
      try {
        const batchResults = await Promise.all(batchPromises);
        analytics.push(...batchResults);
        processedIds.push(...batch);
        
        const batchTime = Date.now() - batchStartTime;
        const totalProcessed = startIndex + i + batch.length;
        const totalTime = Date.now() - startTime;
        const rate = totalProcessed / (totalTime / 1000);
        const remaining = conversationIds.length - totalProcessed;
        const eta = remaining / rate;
        
        console.log(`✅ Batch completed in ${Math.round(batchTime/1000)}s | Rate: ${rate.toFixed(1)}/s | ETA: ${Math.round(eta/60)}min`);
        
        // Save progress periodically
        if (totalProcessed % SAVE_INTERVAL === 0 || i + BATCH_SIZE >= remainingIds.length) {
          console.log(`💾 Saving progress... (${totalProcessed}/${conversationIds.length})`);
          fs.writeFileSync(PROGRESS_FILE, JSON.stringify({
            processedIds,
            timestamp: new Date().toISOString(),
            totalCompleted: totalProcessed,
            totalTarget: conversationIds.length
          }, null, 2));
        }
        
        // Brief delay to prevent API rate limiting
        if (i + BATCH_SIZE < remainingIds.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        
             } catch (error: any) {
         console.error(`❌ Batch failed:`, error);
         // Save progress before rethrowing
         fs.writeFileSync(PROGRESS_FILE, JSON.stringify({
           processedIds,
           error: error?.message || 'Unknown error',
           timestamp: new Date().toISOString()
         }, null, 2));
         throw error;
       }
    }
    
    // Clean up progress file on successful completion
    if (fs.existsSync(PROGRESS_FILE)) {
      fs.unlinkSync(PROGRESS_FILE);
      console.log('🧹 Cleaned up progress file - analysis completed successfully');
    }
    
    return analytics;
  }

  /**
   * Optimized chunk loading - only loads necessary chunks
   */
  private async loadZainjoConversationsOptimized(sampleSize: number): Promise<Conversation[]> {
    console.log('📖 Loading Zainjo data with optimized chunk processing...');
    
    // 🎯 DEMO MODE: Skip heavy chunk loading and return empty array to force cache usage
    if (ZainjoDataProcessor.DEMO_MODE) {
      console.log('🎯 DEMO MODE: Skipping chunk loading - will use cached data only');
      return [];
    }
    
    try {
      if (!fs.existsSync(this.chunksDir)) {
        console.log('❌ Zainjo chunks directory not found');
        return [];
      }

      const summaryPath = path.join(this.chunksDir, 'chunking-summary.json');
      if (!fs.existsSync(summaryPath)) {
        console.log('❌ Chunking summary not found');
        return [];
      }

      const summary: ZainjoChunkSummary = JSON.parse(fs.readFileSync(summaryPath, 'utf-8'));
      console.log(`📋 Summary: ${summary.totalChatters} chatters in ${summary.totalChunks} chunks`);

      const allConversations: Conversation[] = [];
      const processAll = sampleSize === 0;
      const targetCount = processAll ? summary.totalChatters : sampleSize;
      
      console.log(`🎯 Target: ${processAll ? 'ALL' : targetCount} conversations`);

      // Process chunks in order until we have enough conversations
      for (let i = 0; i < summary.totalChunks && (processAll || allConversations.length < targetCount); i++) {
        const chunkFilename = `zainjo-chunk-${i.toString().padStart(3, '0')}.json`;
        const chunkPath = path.join(this.chunksDir, chunkFilename);
        
        if (fs.existsSync(chunkPath)) {
          console.log(`📄 Processing ${chunkFilename}... (${allConversations.length}/${targetCount})`);
          
          const chunkData: ZainjoChunk = JSON.parse(fs.readFileSync(chunkPath, 'utf-8'));
          
          // Convert conversations from this chunk
          for (const chatter of chunkData.chatters || []) {
            if (!processAll && allConversations.length >= targetCount) break;
            
            const conversation = this.convertZainjoChatterToConversation(chatter);
            if (conversation) {
              allConversations.push(conversation);
            }
          }
          
          console.log(`   ✅ Total conversations: ${allConversations.length}`);
          
          // Early exit if we have enough for sampling
          if (!processAll && allConversations.length >= targetCount) {
            console.log(`🎯 Target reached! Stopping at chunk ${i + 1}/${summary.totalChunks}`);
            break;
          }
        }
      }

      console.log(`📊 Optimized loading complete: ${allConversations.length} conversations loaded`);
      return allConversations;

    } catch (error) {
      console.error('Error in optimized Zainjo loading:', error);
      return [];
    }
  }

  private convertZainjoChatterToConversation(chatter: ZainjoChatter): Conversation | null {
    try {
      if (!chatter.ChatHistory || chatter.ChatHistory.length === 0) {
        return null;
      }

      // Convert Zainjo messages to our format
      const messages: Message[] = chatter.ChatHistory.map((msg: ZainjoMessage) => ({
        ID: msg.ID || `${msg.Number}`,
        from: (msg.from === 'bot' ? 'bot' : 'user') as 'bot' | 'user',
        to: (msg.to === 'bot' ? 'bot' : 'user') as 'bot' | 'user',
        Type: msg.Type as 'Text' | 'Video' | 'Image' | 'Cards',
        Agent: msg.Agent,
        MessageText: msg.MessageText,
        TimeSent: msg.TimeSent,
        DateSent: msg.DateSent,
        DateStamp: typeof msg.DateStamp === 'string' 
          ? { $date: { $numberLong: new Date(msg.DateStamp).getTime().toString() } }
          : msg.DateStamp,
        SenderID: msg.SenderID,
        PageID: msg.PageID,
        bot: msg.bot,
        Number: msg.Number
      }));

      const conversation: Conversation = {
        ChatDate: typeof chatter.ChatDate === 'string'
          ? { $date: { $numberLong: new Date(chatter.ChatDate).getTime().toString() } }
          : chatter.ChatDate,
        ChatHistory: messages
      };

      return conversation;
    } catch (error) {
      console.error('Error converting Zainjo chatter:', error);
      return null;
    }
  }

  // Helper method to get chunk statistics
  async getChunkStatistics(): Promise<any> {
    const summaryPath = path.join(this.chunksDir, 'chunking-summary.json');
    if (fs.existsSync(summaryPath)) {
      return JSON.parse(fs.readFileSync(summaryPath, 'utf-8'));
    }
    return null;
  }

  /**
   * Regenerate AI insights from cached Zainjo data
   */
  async regenerateZainjoInsights(): Promise<{
    insights: string;
    recommendations: string[];
    trends: string[];
  }> {
    console.log('🔄 Regenerating Zainjo AI insights from cached data...');
    
    const cache = await this.loadCache();
    if (!cache || !cache.analytics || cache.analytics.length === 0) {
      throw new Error('No cached Zainjo analysis data found. Please run full analysis first.');
    }

    console.log(`📊 Found cached Zainjo analysis with ${cache.analytics.length} conversations`);

    // Check if cached analytics have the required fields for consolidation
    const hasRequiredFields = cache.analytics && cache.analytics.every(a => 
      a.hasOwnProperty('recommendations') && 
      a.hasOwnProperty('trends') && 
      a.hasOwnProperty('knowledgeGaps')
    );

    if (!hasRequiredFields) {
      throw new Error('Cached Zainjo analytics missing required fields. Please run full analysis first.');
    }

    // Generate fresh AI insights using the optimized method
    const { AIAnalysisService } = await import('./ai-analysis');
    const aiService = new AIAnalysisService();
    
    const aiInsights = await aiService.consolidateConversationInsights(cache.analytics);

    // Update cache with new insights
    this.saveCache(cache.analytics, aiInsights);

    console.log('✅ Zainjo AI insights regenerated and cached!');
    return aiInsights;
  }

  /**
   * Clear Zainjo cache
   */
  clearCache(): void {
    try {
      if (fs.existsSync(this.cacheFilePath)) {
        fs.unlinkSync(this.cacheFilePath);
        console.log('✅ Zainjo analysis cache cleared');
      }
    } catch (error) {
      console.error('Error clearing Zainjo cache:', error);
    }
  }

  /**
   * Build index mapping senderIDs to Zainjo chunk filenames
   */
  private async buildZainjoChunkIndex(): Promise<{ [senderID: string]: string }> {
    const index: { [senderID: string]: string } = {};
    
    if (!fs.existsSync(this.chunksDir)) {
      console.log('❌ Zainjo chunks directory not found');
      return index;
    }

    const files = fs.readdirSync(this.chunksDir)
      .filter(file => file.startsWith('zainjo-chunk-') && file.endsWith('.json'))
      .sort();

    console.log(`🔍 Scanning ${files.length} Zainjo chunk files for senderIDs...`);

    for (const file of files) {
      try {
        const filePath = path.join(this.chunksDir, file);
        const chunkData: ZainjoChunk = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        
        // Extract senderIDs from Zainjo chatters
        for (const chatter of chunkData.chatters) {
          if (chatter.SenderID) {
            index[chatter.SenderID] = file;
          }
        }

        console.log(`✅ ${file}: ${chunkData.chatters.length} chatters processed`);
        
      } catch (error) {
        console.log(`❌ Failed to process ${file}:`, error);
      }
    }

    console.log(`🎯 Zainjo index built: ${Object.keys(index).length} senderIDs mapped to chunks`);
    return index;
  }

  /**
   * Find which Zainjo chunk contains a specific senderID
   */
  async findZainjoChunkForSender(senderID: string): Promise<string | null> {
    const index = await this.buildZainjoChunkIndex();
    return index[senderID] || null;
  }

  /**
   * Get the original senderID for a processed senderID (e.g., zainjo-0 -> 962795685937)
   */
  async getOriginalSenderID(processedSenderID: string): Promise<string | null> {
    try {
      // Extract index from processed senderID (e.g., "zainjo-0" -> 0)
      const match = processedSenderID.match(/zainjo-(\d+)/);
      if (!match) {
        return processedSenderID; // Return as-is if not in zainjo-X format
      }
      
      const targetIndex = parseInt(match[1]);
      console.log(`🔍 Looking for original senderID at index ${targetIndex} for ${processedSenderID}`);
      
      if (!fs.existsSync(this.chunksDir)) {
        console.log('❌ Zainjo chunks directory not found');
        return null;
      }

      const summaryPath = path.join(this.chunksDir, 'chunking-summary.json');
      if (!fs.existsSync(summaryPath)) {
        console.log('❌ Chunking summary not found');
        return null;
      }

      const summary: ZainjoChunkSummary = JSON.parse(fs.readFileSync(summaryPath, 'utf-8'));
      let currentIndex = 0;
      
      // Process chunks in order to find the chatter at targetIndex
      for (let i = 0; i < summary.totalChunks; i++) {
        const chunkFilename = `zainjo-chunk-${i.toString().padStart(3, '0')}.json`;
        const chunkPath = path.join(this.chunksDir, chunkFilename);
        
        if (fs.existsSync(chunkPath)) {
          const chunkData: ZainjoChunk = JSON.parse(fs.readFileSync(chunkPath, 'utf-8'));
          
          // Check if our target index is in this chunk
          if (currentIndex + chunkData.chatters.length > targetIndex) {
            const chatterIndex = targetIndex - currentIndex;
            const originalSenderID = chunkData.chatters[chatterIndex].SenderID;
            console.log(`✅ Found mapping: ${processedSenderID} -> ${originalSenderID}`);
            return originalSenderID;
          }
          
          currentIndex += chunkData.chatters.length;
        }
      }
      
      console.log(`❌ Could not find original senderID for ${processedSenderID} at index ${targetIndex}`);
      return null;
      
    } catch (error) {
      console.error('Error getting original senderID:', error);
      return null;
    }
  }

  /**
   * Load messages for a specific senderID from Zainjo chunks
   * Now supports both original senderIDs and processed senderIDs
   */
  async loadZainjoMessagesForSender(senderID: string): Promise<ZainjoMessage[] | null> {
    // If it's a processed senderID (zainjo-X), get the original senderID first
    let actualSenderID = senderID;
    if (senderID.startsWith('zainjo-')) {
      const originalSenderID = await this.getOriginalSenderID(senderID);
      if (!originalSenderID) {
        console.log(`❌ Could not find original senderID for ${senderID}`);
        return null;
      }
      actualSenderID = originalSenderID;
      console.log(`🔄 Mapped ${senderID} -> ${actualSenderID}`);
    }

    const chunkFile = await this.findZainjoChunkForSender(actualSenderID);
    
    if (!chunkFile) {
      console.log(`❌ No Zainjo chunk found for senderID: ${actualSenderID}`);
      return null;
    }

    console.log(`📖 Loading Zainjo messages from ${chunkFile} for senderID: ${actualSenderID}`);
    
    try {
      const filePath = path.join(this.chunksDir, chunkFile);
      const chunkData: ZainjoChunk = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      
      // Find the specific chatter with this senderID
      const chatter = chunkData.chatters.find(c => c.SenderID === actualSenderID);
      
      if (!chatter || !chatter.ChatHistory) {
        console.log(`❌ No chat history found for senderID: ${actualSenderID}`);
        return null;
      }

      console.log(`✅ Found ${chatter.ChatHistory.length} messages for senderID: ${actualSenderID}`);
      return chatter.ChatHistory;
      
    } catch (error) {
      console.log(`❌ Failed to load Zainjo chunk ${chunkFile}:`, error);
      return null;
    }
  }

  /**
   * Get Zainjo conversation analytics for a specific senderID
   */
  async getZainjoConversationAnalytics(senderID: string): Promise<ConversationAnalytics | null> {
    try {
      const cache = await this.loadCache();
      if (!cache || !cache.analytics) {
        return null;
      }

      // Find analytics for this specific senderID
      const analytics = cache.analytics.find((conv: ConversationAnalytics) => 
        conv.senderID === senderID
      );

      return analytics || null;
    } catch (error) {
      console.error('Error loading Zainjo analytics for senderID:', senderID, error);
      return null;
    }
  }
} 