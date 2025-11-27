import fs from 'fs';
import path from 'path';
import StreamValues from 'stream-json/streamers/StreamValues';
import parser from 'stream-json';
import { Conversation, Message, ConversationAnalytics, PlatformOverallScore, DetailedConversationAnalysis, MessageAnalysis } from '@/types/conversation';

interface CachedAnalysis {
  timestamp: number;
  analytics: ConversationAnalytics[];
  aiInsights: {
    insights: string;
    recommendations: string[];
    trends: string[];
  };
}

export class DataProcessor {
  private cacheFilePath: string;

  constructor() {
    const dataPath = process.env.DATA_PATH || path.join(process.cwd(), 'data');
    this.cacheFilePath = path.join(dataPath, 'analysis-cache.json');
  }

  /**
   * Load cached analysis results using streaming for large files
   */
  async loadCache(): Promise<CachedAnalysis | null> {
    try {
      // Check if directory exists first, create if needed (for cache saving)
      const dir = path.dirname(this.cacheFilePath);
      if (!fs.existsSync(dir)) {
        try {
          fs.mkdirSync(dir, { recursive: true });
        } catch (e) {
          console.warn(`Warning: Could not create cache directory ${dir}:`, e);
        }
      }

      if (fs.existsSync(this.cacheFilePath)) {
        const stats = fs.statSync(this.cacheFilePath);
        const fileSizeMB = stats.size / (1024 * 1024);
        
        // For files smaller than 400MB, use traditional method
        if (fileSizeMB < 400) {
          console.log(`📋 Loading cache file (${fileSizeMB.toFixed(1)}MB) using traditional method...`);
          const cacheData = fs.readFileSync(this.cacheFilePath, 'utf-8');
          return JSON.parse(cacheData);
        }
        
        // For large files (400MB+), use chunked reading
        console.log(`📋 Loading large cache file (${fileSizeMB.toFixed(1)}MB) using chunked reading...`);
        
        return new Promise((resolve, reject) => {
          let data = '';
          const stream = fs.createReadStream(this.cacheFilePath, { 
            encoding: 'utf8',
            highWaterMark: 64 * 1024 // 64KB chunks
          });
          
          stream.on('data', (chunk: string | Buffer) => {
            data += chunk.toString();
          });
          
          stream.on('end', () => {
            try {
              console.log('✅ Large cache file read, parsing JSON...');
              const cacheObject = JSON.parse(data);
              console.log('✅ Large cache file loaded and parsed successfully');
              resolve(cacheObject as CachedAnalysis);
            } catch (parseError) {
              console.error('❌ Error parsing large cache JSON:', parseError);
              reject(parseError);
            }
          });
          
          stream.on('error', (error) => {
            console.error('❌ Error reading large cache file:', error);
            reject(error);
          });
        });
      }
    } catch (error) {
      console.error('Error loading cache:', error);
    }
    return null;
  }

  /**
   * Save analysis results to cache
   */
  private saveCache(analytics: ConversationAnalytics[], aiInsights: any): void {
    try {
      const cacheData: CachedAnalysis = {
        timestamp: Date.now(),
        analytics,
        aiInsights
      };
      fs.writeFileSync(this.cacheFilePath, JSON.stringify(cacheData, null, 2));
      console.log('✅ Analysis results cached successfully');
    } catch (error) {
      console.error('Error saving cache:', error);
    }
  }

  /**
   * Check if cache is valid (no expiry - always valid)
   */
  isCacheValid(cache: CachedAnalysis): boolean {
    return true; // Always use cache if it exists, regardless of age
  }

  /**
   * Clear the analysis cache
   */
  clearCache(): void {
    try {
      if (fs.existsSync(this.cacheFilePath)) {
        fs.unlinkSync(this.cacheFilePath);
        console.log('✅ Analysis cache cleared');
      }
    } catch (error) {
      console.error('Error clearing cache:', error);
    }
  }

  /**
   * Load and parse conversation data from JSON file
   * Supports new "Web AR*.txt" format with { Count, TotalPages, ActiveChatters: [...] } structure
   */
  async loadConversations(): Promise<Conversation[]> {
    try {
      // Use DATA_PATH env var if set (e.g. for Render persistent disk), otherwise use default data dir
      const dataDir = process.env.DATA_PATH || path.join(process.cwd(), 'data');
      
      console.log(`📂 Loading conversations from: ${dataDir}`);
      
      // PRIORITY 1: Check for "Web AR*.txt" file in data directory (new format)
      if (fs.existsSync(dataDir)) {
        const dataFiles = fs.readdirSync(dataDir);
        const webARFile = dataFiles.find(file => 
          file.startsWith('Web AR') && file.endsWith('.txt')
        );
        
        if (webARFile) {
          const filePath = path.join(dataDir, webARFile);
          const fileSize = fs.statSync(filePath).size;
          
          console.log(`📁 Found Web AR data file: ${webARFile} (${this.formatFileSize(fileSize)})`);
          console.log(`🎯 Loading conversations from new Web AR format...`);
          
          try {
            // Use streaming for large files
            const conversations = await this.loadWebARFile(filePath);
            console.log(`✅ Successfully loaded ${conversations.length} conversations from Web AR file`);
            return conversations;
          } catch (error) {
            console.error(`❌ Error loading Web AR file: ${error}`);
            // Fall through to legacy loading
          }
        }
      }

      // LEGACY: Check if data directory exists
      if (!fs.existsSync(dataDir)) {
        console.error('Data directory not found:', dataDir);
        return [];
      }

      // Find conversation chunk files in both data/ and data/chunks/ directories
      let files: string[] = [];
      
      // Check main data directory for temp_conversations_*.json files
      const mainDirFiles = fs.readdirSync(dataDir).filter(file => 
        file.endsWith('.json') && 
        file.startsWith('temp_conversations_') &&
        !file.includes('cache') && 
        !file.includes('progress') &&
        !file.includes('analysis-cache')
      );
      files = files.concat(mainDirFiles.map(f => f));
      
      // Check chunks subdirectory for conversations_chunk_*.json files
      const chunksDir = path.join(dataDir, 'chunks');
      if (fs.existsSync(chunksDir)) {
        const chunkFiles = fs.readdirSync(chunksDir).filter(file => 
          file.endsWith('.json') && 
          file.startsWith('conversations_chunk_') &&
          !file.includes('cache') && 
          !file.includes('progress') &&
          !file.includes('analysis-cache')
        );
        files = files.concat(chunkFiles.map(f => `chunks/${f}`));
      }
      
      if (files.length === 0) {
        console.error('No conversation files found in data directory or project root');
        return [];
      }

      console.log(`📁 Found ${files.length} conversation chunk file(s):`, files.map(f => `${f} (${this.getFileSize(path.join(dataDir, f))})`));
      console.log(`🎯 Using ONLY chunked conversation files (excluding progress files and corrupted chunks)`);

      let allConversations: Conversation[] = [];
      let totalSize = 0;

      // Load and merge all conversation files
      for (const file of files) {
        const filePath = path.join(dataDir, file);
        const fileSize = fs.statSync(filePath).size;
        totalSize += fileSize;
        
        console.log(`📖 Loading ${file} (${this.formatFileSize(fileSize)})...`);
        
        try {
          // Skip empty files
          if (fileSize === 0) {
            console.log(`⚠️ Skipping empty file: ${file}`);
            continue;
          }

          const rawData = fs.readFileSync(filePath, 'utf-8');
          
          // Skip files that are too small to contain valid conversation data
          if (rawData.length < 100) {
            console.log(`⚠️ Skipping file too small: ${file} (${rawData.length} bytes)`);
            continue;
          }

          const conversations: Conversation[] = JSON.parse(rawData);
          
          // Validate that we got an array of conversations
          if (!Array.isArray(conversations)) {
            console.log(`⚠️ Skipping invalid format: ${file} (not an array)`);
            continue;
          }

          console.log(`✅ Loaded ${conversations.length} conversations from ${file}`);
          allConversations = allConversations.concat(conversations);
        } catch (fileError) {
          console.error(`❌ Error loading ${file}:`, fileError instanceof Error ? fileError.message : 'Unknown error');
          console.log(`⚠️ Skipping corrupted file: ${file}`);
          // Continue with other files
        }
      }

      console.log(`🎯 Total: ${allConversations.length} conversations from ${files.length} valid chunk files (${this.formatFileSize(totalSize)} total)`);
      console.log(`✅ Successfully loaded chunked conversation data (original conversations.json excluded)`);
      return allConversations;
      
    } catch (error) {
      console.error('Error loading conversations:', error);
      return [];
    }
  }

  /**
   * Load conversations from Web AR format file
   * Handles the wrapper structure: { Count, TotalPages, PageSize, ActiveChatters: [...] }
   */
  private async loadWebARFile(filePath: string): Promise<Conversation[]> {
    const fileSize = fs.statSync(filePath).size;
    const fileSizeMB = fileSize / (1024 * 1024);
    
    console.log(`📖 Loading Web AR file (${fileSizeMB.toFixed(1)}MB)...`);
    
    // For very large files, use streaming
    if (fileSizeMB > 100) {
      console.log(`🔄 Using streaming parser for large file...`);
      return this.loadWebARFileStreaming(filePath);
    }
    
    // For smaller files, read directly
    return new Promise((resolve, reject) => {
      let data = '';
      const stream = fs.createReadStream(filePath, { 
        encoding: 'utf8',
        highWaterMark: 64 * 1024 // 64KB chunks
      });
      
      stream.on('data', (chunk: string | Buffer) => {
        data += chunk.toString();
      });
      
      stream.on('end', () => {
        try {
          console.log('✅ File read complete, parsing JSON...');
          const parsed = JSON.parse(data);
          
          // Extract ActiveChatters from the wrapper structure
          if (parsed.ActiveChatters && Array.isArray(parsed.ActiveChatters)) {
            console.log(`📊 Found ${parsed.Count || parsed.ActiveChatters.length} conversations in Web AR format`);
            console.log(`📄 Total pages: ${parsed.TotalPages || 'N/A'}, Page size: ${parsed.PageSize || 'N/A'}`);
            resolve(parsed.ActiveChatters as Conversation[]);
          } else if (Array.isArray(parsed)) {
            // Direct array format (fallback)
            console.log(`📊 Found ${parsed.length} conversations in direct array format`);
            resolve(parsed as Conversation[]);
          } else {
            reject(new Error('Invalid Web AR file format: expected ActiveChatters array or direct array'));
          }
        } catch (parseError) {
          console.error('❌ Error parsing Web AR JSON:', parseError);
          reject(parseError);
        }
      });
      
      stream.on('error', (error) => {
        console.error('❌ Error reading Web AR file:', error);
        reject(error);
      });
    });
  }

  /**
   * Load Web AR file using streaming parser for very large files
   */
  private async loadWebARFileStreaming(filePath: string): Promise<Conversation[]> {
    return new Promise((resolve, reject) => {
      const conversations: Conversation[] = [];
      let inActiveChatterArray = false;
      let currentDepth = 0;
      
      const pipeline = fs.createReadStream(filePath)
        .pipe(parser())
        .pipe(StreamValues.withParser());
      
      pipeline.on('data', (data: { key: number; value: any }) => {
        // Look for conversations in the ActiveChatters array
        if (data.value && data.value.ChatHistory) {
          conversations.push(data.value as Conversation);
          
          // Progress logging every 1000 conversations
          if (conversations.length % 1000 === 0) {
            console.log(`📊 Loaded ${conversations.length} conversations...`);
          }
        }
      });
      
      pipeline.on('end', () => {
        console.log(`✅ Streaming complete: ${conversations.length} conversations loaded`);
        resolve(conversations);
      });
      
      pipeline.on('error', (error: Error) => {
        console.error('❌ Streaming error:', error);
        reject(error);
      });
    });
  }

  /**
   * Get file size for logging
   */
  private getFileSize(filePath: string): string {
    try {
      const stats = fs.statSync(filePath);
      return this.formatFileSize(stats.size);
    } catch {
      return 'unknown size';
    }
  }

  /**
   * Format file size in human readable format
   */
  private formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  /**
   * Group conversations by SenderID
   */
  groupBySenderID(conversations: Conversation[]): Map<string, Message[]> {
    const grouped = new Map<string, Message[]>();

    conversations.forEach(conversation => {
      // Check if conversation has ChatHistory property (skip cache files)
      if (conversation && conversation.ChatHistory && Array.isArray(conversation.ChatHistory)) {
        conversation.ChatHistory.forEach(message => {
          if (message.SenderID) {
            if (!grouped.has(message.SenderID)) {
              grouped.set(message.SenderID, []);
            }
            grouped.get(message.SenderID)!.push(message);
          }
        });
      }
    });

    // Sort messages by timestamp for each sender
    grouped.forEach((messages) => {
      messages.sort((a, b) => {
        const timeA = this.getTimestampFromMessage(a);
        const timeB = this.getTimestampFromMessage(b);
        return timeA - timeB;
      });
    });

    return grouped;
  }

  /**
   * Extract timestamp from message - handles both MongoDB format and ISO string format
   */
  private getTimestampFromMessage(message: Message): number {
    if (!message.DateStamp) return 0;
    
    // Check if it's MongoDB format: { $date: { $numberLong: "..." } }
    if (typeof message.DateStamp === 'object' && message.DateStamp.$date) {
      if (message.DateStamp.$date.$numberLong) {
        return parseInt(message.DateStamp.$date.$numberLong);
      }
      // Handle { $date: "ISO string" } format
      if (typeof message.DateStamp.$date === 'string') {
        return new Date(message.DateStamp.$date).getTime();
      }
    }
    
    // Check if it's a direct ISO string format (Web AR format)
    if (typeof message.DateStamp === 'string') {
      return new Date(message.DateStamp).getTime();
    }
    
    return 0;
  }

  /**
   * Calculate basic metrics without AI
   */
  calculateBasicMetrics(messages: Message[]): {
    conversationLength: number;
    firstResponseTime: number | undefined;
  } {
    const conversationLength = messages.length;
    
    const firstUserMessage = messages.find(msg => msg.from === 'user');
    const firstBotResponse = messages.find((msg, index) => {
      if (msg.from === 'bot' && firstUserMessage) {
        const userMsgIndex = messages.indexOf(firstUserMessage);
        return index > userMsgIndex;
      }
      return false;
    });

    let firstResponseTime: number | undefined;
    if (firstUserMessage && firstBotResponse && 
        firstUserMessage.DateStamp && firstBotResponse.DateStamp) {
      const userTime = this.getTimestampFromMessage(firstUserMessage);
      const botTime = this.getTimestampFromMessage(firstBotResponse);
      if (userTime > 0 && botTime > 0) {
        firstResponseTime = botTime - userTime;
      }
    }

    return {
      conversationLength,
      firstResponseTime
    };
  }

  /**
   * Calculate Platform Overall Score
   */
  calculatePlatformScore(analytics: ConversationAnalytics[]): PlatformOverallScore {
    if (analytics.length === 0) {
      return {
        overallScore: 0,
        scoreBreakdown: {
          qualityScore: 0,
          sentimentScore: 0,
          responseTimeScore: 0,
          resolutionScore: 0
        },
        grade: 'F',
        improvementAreas: ['No data available']
      };
    }

    // Calculate component scores
    const avgQualityScore = analytics.reduce((sum, a) => sum + (a.qualityScore || 0), 0) / analytics.length;
    
    const sentimentScores = analytics.map(a => {
      const sentiment = a.sentiment || 'neutral';
      switch (sentiment) {
        case 'positive': return 1;
        case 'neutral': return 0.5;
        case 'negative': return 0;
        default: return 0.5;
      }
    });
    const avgSentimentScore = sentimentScores.reduce((sum: number, score: number) => sum + score, 0) / sentimentScores.length;
    
    // Response time score (normalized)
    const validResponseTimes = analytics.filter(a => a.firstResponseTime).map(a => a.firstResponseTime!);
    let responseTimeScore = 0.8; // Default if no response times
    if (validResponseTimes.length > 0) {
      const avgResponseTime = validResponseTimes.reduce((sum, time) => sum + time, 0) / validResponseTimes.length;
      // Score based on response time (lower is better)
      // Assuming good response time is under 30 seconds (30000ms)
      responseTimeScore = Math.max(0, Math.min(1, 1 - (avgResponseTime / 30000)));
    }
    
    // Resolution score based on knowledge gaps (fewer gaps = higher score)
    const totalKnowledgeGaps = analytics.reduce((sum, a) => sum + a.knowledgeGaps.length, 0);
    const avgKnowledgeGaps = totalKnowledgeGaps / analytics.length;
    const resolutionScore = Math.max(0, Math.min(1, 1 - (avgKnowledgeGaps / 5))); // Assuming 5+ gaps is poor

    // Weighted overall score
    const overallScore = Math.round(
      (avgQualityScore * 0.4 + 
       avgSentimentScore * 100 * 0.3 + 
       responseTimeScore * 100 * 0.15 + 
       resolutionScore * 100 * 0.15)
    );

    // Determine grade
    let grade: 'A' | 'B' | 'C' | 'D' | 'F';
    if (overallScore >= 90) grade = 'A';
    else if (overallScore >= 80) grade = 'B';
    else if (overallScore >= 70) grade = 'C';
    else if (overallScore >= 60) grade = 'D';
    else grade = 'F';

    // Improvement areas
    const improvementAreas: string[] = [];
    if (avgQualityScore < 70) improvementAreas.push('Response Quality');
    if (avgSentimentScore < 0.6) improvementAreas.push('User Satisfaction');
    if (responseTimeScore < 0.7) improvementAreas.push('Response Speed');
    if (resolutionScore < 0.7) improvementAreas.push('Knowledge Coverage');

    return {
      overallScore,
      scoreBreakdown: {
        qualityScore: Math.round(avgQualityScore),
        sentimentScore: Math.round(avgSentimentScore * 100),
        responseTimeScore: Math.round(responseTimeScore * 100),
        resolutionScore: Math.round(resolutionScore * 100)
      },
      grade,
      improvementAreas
    };
  }

  /**
   * Analyze a single conversation with AI (requires API key)
   */
  async analyzeConversation(senderID: string, messages: Message[]): Promise<ConversationAnalytics> {
    // Dynamically import AI service only when needed
    const { AIAnalysisService } = await import('./ai-analysis');
    const aiService = new AIAnalysisService();

    // Calculate basic metrics
    const basicMetrics = this.calculateBasicMetrics(messages);

    // ULTRA-FAST: Single AI call gets everything we need including individual insights
    const analysis = await aiService.analyzeConversationUltraFast(messages);

    return {
      senderID,
      conversationLength: basicMetrics.conversationLength,
      firstResponseTime: basicMetrics.firstResponseTime,
      sentiment: analysis.sentiment,
      sentimentScore: analysis.sentimentScore,
      intents: analysis.intents,
      subCategories: analysis.subCategories,
      qualityScore: analysis.qualityScore,
      qualityReasons: analysis.qualityReasons,
      knowledgeGaps: analysis.knowledgeGaps,
      summary: analysis.summary,
      recommendations: analysis.recommendations,
      trends: analysis.trends
    };
  }

  /**
   * Get detailed conversation analysis with per-message insights
   */
  async getDetailedConversationAnalysis(senderID: string, messages: Message[]): Promise<DetailedConversationAnalysis> {
    // First get the basic analytics
    const basicAnalytics = await this.analyzeConversation(senderID, messages);
    
    // Dynamically import AI service
    const { AIAnalysisService } = await import('./ai-analysis');
    const aiService = new AIAnalysisService();

    // Analyze each message individually
    const messageAnalyses: MessageAnalysis[] = [];
    
    for (const message of messages) {
      if (message.MessageText || (message.CardsList && message.CardsList.length > 0)) {
        const content = message.MessageText || 
          (message.CardsList ? message.CardsList.map(card => card.title).join(', ') : '');
        
        let sentiment: 'positive' | 'negative' | 'neutral' | undefined;
        let sentimentScore: number | undefined;
        let intent: string | undefined;
        
        if (message.from === 'user') {
          // Analyze user messages
          const sentimentResult = await aiService.analyzeSentiment([message]);
          sentiment = sentimentResult.sentiment;
          sentimentScore = sentimentResult.score;
          
          const intents = await aiService.extractIntents([message]);
          intent = intents[0];
        }

        messageAnalyses.push({
          messageId: message.ID,
          content,
          sender: message.from || 'bot',
          timestamp: message.TimeSent,
          sentiment,
          sentimentScore,
          intent
        });
      }
    }

    // Determine escalation risk and resolution status
    const escalationRisk: 'low' | 'medium' | 'high' = 
      basicAnalytics.sentiment === 'negative' && basicAnalytics.sentimentScore < -0.5 ? 'high' :
      basicAnalytics.sentiment === 'negative' ? 'medium' : 'low';

    const resolutionStatus: 'resolved' | 'partial' | 'unresolved' = 
      basicAnalytics.knowledgeGaps.length === 0 ? 'resolved' :
      basicAnalytics.knowledgeGaps.length <= 2 ? 'partial' : 'unresolved';

    // Generate conversation flow
    const conversationFlow = messages
      .filter(msg => msg.MessageText || (msg.CardsList && msg.CardsList.length > 0))
      .map(msg => `${msg.from}: ${msg.MessageText || 'Interactive content'}`);

    // Generate recommended actions
    const recommendedActions = await aiService.generateRecommendedActions(basicAnalytics, escalationRisk, resolutionStatus);

    return {
      ...basicAnalytics,
      messageAnalyses,
      conversationFlow,
      escalationRisk,
      resolutionStatus,
      recommendedActions
    };
  }

  /**
   * Process all conversations with advanced optimization options
   */
  async processAllConversations(
    forceRefresh = false, 
    fastMode = false, 
    sampleSize?: number,
    optimizationLevel: 'standard' | 'aggressive' | 'extreme' = 'standard'
  ): Promise<{
    analytics: ConversationAnalytics[];
    aiInsights: {
      insights: string;
      recommendations: string[];
      trends: string[];
    };
    fromCache: boolean;
  }> {
    // Check cache first (unless force refresh requested)
    if (!forceRefresh) {
      const cache = await this.loadCache();
      if (cache && this.isCacheValid(cache)) {
        console.log('📋 Using cached analysis results');
        return {
          ...cache,
          fromCache: true
        };
      }
    }

    console.log('🚀 Running fresh AI analysis on all conversations...');
    if (fastMode) {
      console.log('⚡ FAST MODE ENABLED - Optimized for speed and deadline delivery');
      console.log(`🎯 Optimization Level: ${optimizationLevel.toUpperCase()}`);
    }
    console.log('⚠️  This will take several minutes and use OpenAI API credits');
    
    console.log('Loading conversations...');
    const conversations = await this.loadConversations();
    
    console.log('Grouping by SenderID...');
    const grouped = this.groupBySenderID(conversations);
    
    let senderIDs = Array.from(grouped.keys());
    
    // Apply sampling FIRST if specified - this takes priority over optimization
    // DISABLED SAMPLING FOR FULL DATASET PROCESSING
    if (sampleSize && sampleSize < senderIDs.length && !fastMode) {
      console.log(`📊 SMART SAMPLING: Processing ${sampleSize} out of ${senderIDs.length} conversations for optimal performance`);
      console.log(`🎯 Large Dataset Optimization: Avoiding memory issues while maintaining high accuracy`);
      
      // Take a representative sample (every nth conversation) for better coverage
      const step = Math.floor(senderIDs.length / sampleSize);
      senderIDs = senderIDs.filter((_, index) => index % step === 0).slice(0, sampleSize);
      
      console.log(`✅ Selected ${senderIDs.length} representative conversations from ${grouped.size} total`);
    } else if (fastMode) {
      console.log(`🚀 FAST MODE: Processing ALL ${senderIDs.length} conversations (sampling disabled)`);
    }
    
    // Then apply advanced optimization strategies to the sampled set
    if (fastMode && optimizationLevel !== 'standard' && senderIDs.length > 1000) {
      console.log(`🎯 Applying ${optimizationLevel} optimization to sampled dataset...`);
      senderIDs = this.applyAdvancedOptimization(senderIDs, grouped, optimizationLevel);
    } else if (fastMode) {
      console.log(`🚀 ULTRA-FAST MODE: Processing ${senderIDs.length} conversations with optimized single AI call per conversation`);
    }
    
    console.log(`Found ${senderIDs.length} conversations to analyze. Running AI analysis...`);
    
    const analytics: ConversationAnalytics[] = [];
    let processed = 0;
    const startTime = Date.now();

    // Optimize batch processing based on mode and optimization level
    const { batchSize, delayBetweenBatches, maxConcurrency } = this.getOptimizationSettings(fastMode, optimizationLevel);

    console.log(`Processing ${senderIDs.length} conversations in batches of ${batchSize} with ${delayBetweenBatches}ms delays...`);
    if (fastMode) {
      console.log(`⚡ ${optimizationLevel} mode: ${batchSize} per batch, ${delayBetweenBatches}ms delays, ${maxConcurrency} concurrent`);
      console.log(`🚀 ULTRA-FAST: Using single AI call per conversation (reduced from 3-5 calls)`);
    }

    // 🛡️ CHUNK-BASED PROCESSING: Split into recovery-safe chunks
    const CHUNK_SIZE = 500; // Save after every 500 conversations
    const chunks: string[][] = [];
    for (let i = 0; i < senderIDs.length; i += CHUNK_SIZE) {
      chunks.push(senderIDs.slice(i, i + CHUNK_SIZE));
    }

    console.log(`🛡️ RECOVERY-SAFE PROCESSING: ${chunks.length} chunks of ${CHUNK_SIZE} conversations each`);
    console.log(`💾 Progress auto-saved after each chunk completion`);

    // Process chunks with full recovery protection
    for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex++) {
      const chunk = chunks[chunkIndex];
      const chunkStartTime = Date.now();
      
      console.log(`\n🔥 CHUNK ${chunkIndex + 1}/${chunks.length}: Processing ${chunk.length} conversations`);
      
      // Process chunk in batches
      for (let i = 0; i < chunk.length; i += batchSize) {
        const batch = chunk.slice(i, i + batchSize);
      const batchNumber = Math.floor(i / batchSize) + 1;
        const totalBatches = Math.ceil(chunk.length / batchSize);

        try {
      // Process batch with controlled concurrency
      const batchPromises = batch.map(async (senderID, index) => {
        // Stagger requests within batch to avoid rate limits
        if (index > 0 && optimizationLevel !== 'extreme') {
          await new Promise(resolve => setTimeout(resolve, index * 50));
        }
        
                 const messages = grouped.get(senderID);
         if (!messages) throw new Error(`Messages not found for senderID: ${senderID}`);
         return this.analyzeConversation(senderID, messages);
      });

      // Wait for batch completion with concurrency control
      const batchResults = await this.processBatchWithConcurrency(batchPromises, maxConcurrency);
      analytics.push(...batchResults);
      processed += batch.length;
      
      // Progress reporting
          if (processed % 50 === 0 || batchNumber % 5 === 0) {
        const elapsedMs = Date.now() - startTime;
        const eta = this.calculateETA(processed, senderIDs.length, elapsedMs);
        console.log(`AI Analysis: Processed ${processed}/${senderIDs.length} conversations... (${Math.round(processed/senderIDs.length*100)}%) ETA: ${eta}`);
      }

      console.log(`Batch ${batchNumber}/${totalBatches} complete. Waiting ${delayBetweenBatches}ms before next batch...`);
      
          // Delay between batches (except for last batch in chunk)
          if (i + batchSize < chunk.length) {
        await new Promise(resolve => setTimeout(resolve, delayBetweenBatches));
          }

        } catch (error) {
          console.error(`❌ BATCH FAILED in Chunk ${chunkIndex + 1}, Batch ${batchNumber}: ${error}`);
          throw error; // Will be caught at chunk level
        }
      }

      // 🚨 CRITICAL: Save chunk progress immediately after completion
      try {
        const chunkTime = Math.round((Date.now() - chunkStartTime) / 1000);
        const tempInsights = {
          insights: `Chunk ${chunkIndex + 1}/${chunks.length} completed - ${processed}/${senderIDs.length} conversations processed`,
          recommendations: [`Progress protected: ${Math.round(processed/senderIDs.length*100)}% complete`],
          trends: [`Chunk processing time: ${chunkTime}s`]
        };
        
        this.saveCache(analytics, tempInsights);
        console.log(`✅ CHUNK ${chunkIndex + 1} SAVED! ${chunk.length} conversations processed in ${chunkTime}s`);
        console.log(`🛡️ RECOVERY POINT: ${processed}/${senderIDs.length} conversations safely cached`);
        
      } catch (saveError) {
        console.error(`❌ CRITICAL: Failed to save Chunk ${chunkIndex + 1} progress: ${saveError}`);
        console.log(`⚠️ Processing was successful but cache save failed - continuing...`);
      }
      
      // Brief pause between chunks for system stability
      if (chunkIndex + 1 < chunks.length) {
        console.log(`⏸️ 3-second recovery pause before next chunk...`);
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
    }

    console.log('Consolidating individual conversation insights into platform insights...');
    
    // Dynamically import AI service for insights consolidation
    const { AIAnalysisService } = await import('./ai-analysis');
    const aiService = new AIAnalysisService();
    const aiInsights = await aiService.consolidateConversationInsights(analytics);

    // Cache the results
    this.saveCache(analytics, aiInsights);
    console.log('✅ Analysis results cached successfully');

    const totalTime = Math.round((Date.now() - startTime) / 1000);
    console.log(`✅ AI Analysis complete and cached! Total time: ${totalTime}s`);

    return {
      analytics,
      aiInsights,
      fromCache: false
    };
  }

  /**
   * Apply advanced optimization strategies for large datasets
   */
  private applyAdvancedOptimization(
    senderIDs: string[], 
    grouped: Map<string, Message[]>, 
    optimizationLevel: 'aggressive' | 'extreme'
  ): string[] {
    console.log(`🎯 Applying ${optimizationLevel} optimization strategies...`);
    
    if (optimizationLevel === 'aggressive') {
      // Strategy 1: Intelligent sampling - prioritize longer, more complex conversations
      const conversationComplexity = senderIDs.map(id => {
        const messages = grouped.get(id);
        if (!messages) throw new Error(`Messages not found for senderID: ${id}`);
        const complexity = this.calculateConversationComplexity(messages);
        return { id, complexity, messageCount: messages.length };
      });

      // Sort by complexity and take top 60% + random 20% from remainder
      conversationComplexity.sort((a, b) => b.complexity - a.complexity);
      const topComplexCount = Math.floor(conversationComplexity.length * 0.6);
      const remainderCount = Math.floor(conversationComplexity.length * 0.2);
      
      const topComplex = conversationComplexity.slice(0, topComplexCount);
      const remainder = conversationComplexity.slice(topComplexCount);
      const randomRemainder = this.shuffleArray(remainder).slice(0, remainderCount);
      
      const optimizedSet = [...topComplex, ...randomRemainder].map(item => item.id);
      
      console.log(`📊 Aggressive optimization: Reduced from ${senderIDs.length} to ${optimizedSet.length} conversations (${Math.round(optimizedSet.length/senderIDs.length*100)}%)`);
      console.log(`🎯 Selected: 60% most complex + 20% random sample`);
      
      return optimizedSet;
      
    } else if (optimizationLevel === 'extreme') {
      // Strategy 2: Representative sampling with clustering
      const clusters = this.clusterConversations(senderIDs, grouped);
      const representatives = this.selectClusterRepresentatives(clusters, grouped);
      
      console.log(`📊 Extreme optimization: Reduced from ${senderIDs.length} to ${representatives.length} conversations (${Math.round(representatives.length/senderIDs.length*100)}%)`);
      console.log(`🎯 Selected: Representative samples from ${clusters.length} conversation clusters`);
      
      return representatives;
    }
    
    return senderIDs;
  }

  /**
   * Calculate conversation complexity score for intelligent sampling
   */
  private calculateConversationComplexity(messages: Message[]): number {
    let complexity = 0;
    
    // Length factor (more messages = more complex)
    complexity += messages.length * 2;
    
    // User engagement factor (more user messages = more complex)
    const userMessages = messages.filter(m => m.from === 'user').length;
    complexity += userMessages * 3;
    
    // Text length factor (longer messages = more complex)
    const avgTextLength = messages.reduce((sum, m) => sum + (m.MessageText?.length || 0), 0) / messages.length;
    complexity += avgTextLength / 10;
    
    // Time span factor (longer conversations = more complex)
    if (messages.length > 1) {
      const firstTime = this.getTimestampFromMessage(messages[0]);
      const lastTime = this.getTimestampFromMessage(messages[messages.length - 1]);
      const timeSpan = lastTime - firstTime;
      complexity += timeSpan / 60000; // Convert to minutes
    }
    
    return complexity;
  }

  /**
   * Simple clustering based on conversation characteristics
   */
  private clusterConversations(senderIDs: string[], grouped: Map<string, Message[]>): string[][] {
    const clusters: { [key: string]: string[] } = {
      'short': [],      // 1-5 messages
      'medium': [],     // 6-15 messages  
      'long': [],       // 16-30 messages
      'very_long': []   // 30+ messages
    };
    
    senderIDs.forEach(id => {
      const messages = grouped.get(id);
      if (!messages) return; // Skip if messages not found
      const messageCount = messages.length;
      if (messageCount <= 5) clusters.short.push(id);
      else if (messageCount <= 15) clusters.medium.push(id);
      else if (messageCount <= 30) clusters.long.push(id);
      else clusters.very_long.push(id);
    });
    
    return Object.values(clusters).filter(cluster => cluster.length > 0);
  }

  /**
   * Select representative samples from each cluster
   */
  private selectClusterRepresentatives(clusters: string[][], grouped: Map<string, Message[]>): string[] {
    const representatives: string[] = [];
    
    clusters.forEach(cluster => {
      // Take 10% from each cluster, minimum 1, maximum 50
      const sampleSize = Math.max(1, Math.min(50, Math.floor(cluster.length * 0.1)));
      const shuffled = this.shuffleArray([...cluster]);
      representatives.push(...shuffled.slice(0, sampleSize));
    });
    
    return representatives;
  }

  /**
   * Shuffle array using Fisher-Yates algorithm
   */
  private shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  /**
   * Get optimization settings based on mode and level
   */
  private getOptimizationSettings(fastMode: boolean, optimizationLevel: string) {
    if (!fastMode) {
      return { batchSize: 5, delayBetweenBatches: 2000, maxConcurrency: 5 };
    }
    
    switch (optimizationLevel) {
      case 'aggressive':
        // Optimized for OpenAI rate limits: 30,000 RPM (500 RPS), 150M TPM
        return { batchSize: 100, delayBetweenBatches: 50, maxConcurrency: 50 };
      case 'extreme':
        // Maximum performance within OpenAI limits
        return { batchSize: 200, delayBetweenBatches: 25, maxConcurrency: 100 };
      default: // standard
        return { batchSize: 20, delayBetweenBatches: 500, maxConcurrency: 10 };
    }
  }

  /**
   * Process batch with controlled concurrency
   */
  private async processBatchWithConcurrency<T>(promises: Promise<T>[], maxConcurrency: number): Promise<T[]> {
    const results: T[] = [];
    
    for (let i = 0; i < promises.length; i += maxConcurrency) {
      const batch = promises.slice(i, i + maxConcurrency);
      const batchResults = await Promise.all(batch);
      results.push(...batchResults);
    }
    
    return results;
  }

  /**
   * Calculate ETA for processing
   */
  private calculateETA(processed: number, total: number, elapsedMs: number): string {
    if (processed === 0) return 'Calculating...';
    
    const avgTimePerItem = elapsedMs / processed;
    const remaining = total - processed;
    const etaMs = remaining * avgTimePerItem;
    
    const minutes = Math.floor(etaMs / 60000);
    const seconds = Math.floor((etaMs % 60000) / 1000);
    
    return `${minutes}m ${seconds}s`;
  }

  /**
   * Get sample conversation for testing
   */
  async getSampleConversation(): Promise<{ senderID: string; messages: Message[] } | null> {
    const conversations = await this.loadConversations();
    const grouped = this.groupBySenderID(conversations);
    
    for (const [senderID, messages] of grouped.entries()) {
      if (messages.length > 3) { // Get a conversation with some messages
        return { senderID, messages };
      }
    }
    
    return null;
  }

  /**
   * Regenerate AI insights from existing analytics data
   * UPDATED: Now uses the optimized consolidateConversationInsights method
   */
  async regenerateAIInsights(): Promise<{
    insights: string;
    recommendations: string[];
    trends: string[];
  }> {
    console.log('🔄 Regenerating AI insights from existing analytics...');
    
    // Load existing cache
    const cache = await this.loadCache();
    if (!cache || !cache.analytics || cache.analytics.length === 0) {
      throw new Error('No existing analytics data found. Please run full analysis first.');
    }

    console.log(`📊 Found ${cache.analytics.length} cached conversation analytics`);

    // Check if cached analytics have the required fields for consolidation
    const hasRequiredFields = cache.analytics && cache.analytics.every(a => 
      a.hasOwnProperty('recommendations') && 
      a.hasOwnProperty('trends') && 
      a.hasOwnProperty('knowledgeGaps')
    );

    if (!hasRequiredFields) {
      console.log('⚠️  Cached analytics missing required fields (recommendations/trends). Using fallback method.');
      
      // Fallback to old method for older cache format
    const { AIAnalysisService } = await import('./ai-analysis');
    const aiService = new AIAnalysisService();
    const aiInsights = await aiService.generateOverallInsights(cache.analytics);

    // Update cache with new insights
    this.saveCache(cache.analytics, aiInsights);
      console.log('✅ AI insights regenerated using fallback method!');
      return aiInsights;
    }

    // Generate fresh AI insights using optimized method
    const { AIAnalysisService } = await import('./ai-analysis');
    const aiService = new AIAnalysisService();
    
    console.log('🚀 Using optimized consolidateConversationInsights method...');
    const aiInsights = await aiService.consolidateConversationInsights(cache.analytics);

    // Update cache with new insights
    this.saveCache(cache.analytics, aiInsights);

    console.log('✅ AI insights regenerated and cached with optimized method!');
    return aiInsights;
  }
} 