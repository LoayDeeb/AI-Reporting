import { NextRequest, NextResponse } from 'next/server';
import { DataProcessor } from '@/lib/data-processor';
import { ZainjoDataProcessor } from '@/lib/zainjo-data-processor';
import { DashboardMetrics, Message } from '@/types/conversation';
import { isOpenAIConfigured } from '@/lib/openai';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const action = searchParams.get('action');
    const forceRefresh = searchParams.get('forceRefresh') === 'true';

    // Support for alma.json via ZainjoDataProcessor
    const sourceParam = searchParams.get('source');
    let processor: any;
    if (sourceParam === 'alma') {
      processor = new ZainjoDataProcessor('alma.json');
      console.log('🔄 Using alma.json for analysis');
    } else {
      processor = new DataProcessor();
    }

    switch (action) {
      case 'sample':
        // Get a sample conversation for testing (no AI needed)
        const sample = await processor.getSampleConversation();
        return NextResponse.json(sample);

      case 'full':
        // Process all conversations (requires OpenAI)
        if (!isOpenAIConfigured()) {
          return NextResponse.json(
            { error: 'OpenAI API key not configured. Please set your API key in .env.local' },
            { status: 400 }
          );
        }
        
        // Get optimization parameters
        const fastMode = searchParams.get('fastMode') === 'true';
        const sampleSize = searchParams.get('sampleSize') ? parseInt(searchParams.get('sampleSize')!) : undefined;
        const optimizationLevel = (searchParams.get('optimization') as 'standard' | 'aggressive' | 'extreme') || 'standard';
        
        console.log(`🚀 Starting analysis with fastMode: ${fastMode}, optimization: ${optimizationLevel}, sampleSize: ${fastMode ? 'ALL (ultra-fast ignores sampling)' : (sampleSize || 'all')}`);
        
        let analytics, aiInsights, fromCache;
if (processor instanceof ZainjoDataProcessor) {
  // processZainjoConversations: (fastMode, sampleSize, optimization, forceRefresh)
  ({ analytics, aiInsights, fromCache } = await processor.processZainjoConversations(fastMode, sampleSize, optimizationLevel, forceRefresh));
} else {
  ({ analytics, aiInsights, fromCache } = await processor.processAllConversations(forceRefresh, fastMode, sampleSize, optimizationLevel));
}
        
        // Get the actual total number of conversations in the dataset
        // If loaded from cache, use the analytics count to avoid reloading all chunks
        let actualTotalConversations: number;
        if (fromCache) {
          console.log('📋 Using cached data - skipping raw conversation loading');
          actualTotalConversations = analytics.length; // Use cached analytics count
        } else {
          console.log('📁 Loading raw conversations for total count...');
          const allConversations = await processor.loadConversations();
          const allGrouped = processor.groupBySenderID(allConversations);
          actualTotalConversations = allGrouped.size;
        }
        
        // Calculate dashboard metrics with platform score
        const metrics: DashboardMetrics = calculateDashboardMetrics(analytics, processor);
        
        return NextResponse.json({
          analytics,
          metrics,
          aiInsights,
          totalConversations: actualTotalConversations, // Show actual total, not just analyzed
          analyzedConversations: analytics.length, // Show how many were analyzed
          analysisType: 'full_ai',
          fromCache,
          fastMode,
          optimizationLevel,
          sampleSize,
          cacheMessage: fromCache 
            ? '📋 Results loaded from cache' 
            : `🚀 Fresh analysis completed and cached${fastMode ? ` (Smart Analysis)` : ''}${sampleSize && !fastMode ? ` (${sampleSize} samples)` : ''}`
        });

      case 'clear-cache':
        // Clear the analysis cache
        processor.clearCache();
        return NextResponse.json({
          success: true,
          message: 'Analysis cache cleared successfully'
        });

      case 'regenerate-insights':
        // Regenerate AI insights from existing analytics
        if (!isOpenAIConfigured()) {
          return NextResponse.json(
            { error: 'OpenAI API key not configured. Please set your API key in .env.local to use AI analysis features.' },
            { status: 400 }
          );
        }
        
        try {
          const aiInsights = await processor.regenerateAIInsights();
          return NextResponse.json({
            success: true,
            message: 'AI insights regenerated successfully',
            aiInsights
          });
        } catch (error) {
          return NextResponse.json(
            { error: 'Failed to regenerate AI insights', details: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
          );
        }

      case 'basic':
      default:
        // Check if we have cached analysis first to avoid loading all chunks
        console.log('Loading basic conversation data...');
        const cache = await processor.loadCache();
        
        if (cache && processor.isCacheValid(cache)) {
          console.log('📋 Using cached data for basic metrics - skipping chunk loading');
          
          // Calculate full dashboard metrics from cached analytics
          const analytics = cache.analytics;
          const metrics = calculateDashboardMetrics(analytics, processor);
          
          return NextResponse.json({
            totalConversations: metrics.totalConversations,
            totalMessages: analytics.reduce((sum: number, a: any) => sum + a.conversationLength, 0),
            avgConversationLength: Math.round(metrics.avgConversationLength),
            avgResponseTime: Math.round(metrics.avgFirstResponseTime / 1000), // Convert to seconds
            conversationLengths: analytics.map((a: any) => a.conversationLength),
            senderIDs: analytics.slice(0, 10).map((a: any) => a.senderID), // First 10 from cache
            metrics, // Include full metrics with topics
            hasOpenAI: isOpenAIConfigured(),
            fromCache: true,
            message: isOpenAIConfigured() 
              ? 'OpenAI configured - AI features available (loaded from cache)' 
              : 'OpenAI not configured - only basic analytics available (loaded from cache)'
          });
        }
        
        // Fallback: Load raw conversations only if no cache available
        console.log('📁 No valid cache found - loading raw conversation data...');
        
        // 🎯 DEMO MODE: Check if we should skip heavy loading
        const isDemoMode = (ZainjoDataProcessor as any).DEMO_MODE;
        
        if (isDemoMode) {
          console.log('🎯 DEMO MODE: Skipping heavy conversation loading for basic analysis');
          return NextResponse.json({
            totalConversations: 0,
            totalMessages: 0,
            avgConversationLength: 0,
            avgResponseTime: 0,
            conversationLengths: [],
            senderIDs: [],
            hasOpenAI: isOpenAIConfigured(),
            fromCache: false,
            demoMode: true,
            message: 'Demo mode: Click "Analyze Zainjo Data" to see cached analysis results'
          });
        }
        
        const conversations = await processor.loadConversations();
        console.log(`Loaded ${conversations.length} conversations`);
        
        const grouped = processor.groupBySenderID(conversations);
        console.log(`Found ${grouped.size} unique senders`);
        
        // Calculate basic metrics for all conversations
        const conversationLengths = (Array.from(grouped.values()) as Message[][]).map(msgs => msgs.length);
        const totalMessages = conversationLengths.reduce((sum: number, length: number) => sum + length, 0);
        const avgConversationLength = totalMessages / grouped.size;
        
        // Get response times where available
        const responseTimes: number[] = [];
        grouped.forEach((messages: Message[]) => {
          const basicMetrics = processor.calculateBasicMetrics(messages);
          if (basicMetrics.firstResponseTime) {
            responseTimes.push(basicMetrics.firstResponseTime);
          }
        });
        
        const avgResponseTime = responseTimes.length > 0 
          ? responseTimes.reduce((sum: number, time: number) => sum + time, 0) / responseTimes.length 
          : 0;
        
        return NextResponse.json({
          totalConversations: grouped.size,
          totalMessages,
          avgConversationLength: Math.round(avgConversationLength),
          avgResponseTime: Math.round(avgResponseTime / 1000), // Convert to seconds
          conversationLengths,
          senderIDs: Array.from(grouped.keys()).slice(0, 10), // First 10 for preview
          hasOpenAI: isOpenAIConfigured(),
          fromCache: false,
          message: isOpenAIConfigured() 
            ? 'OpenAI configured - AI features available' 
            : 'OpenAI not configured - only basic analytics available'
        });
    }
  } catch (error) {
    console.error('Analysis error:', error);
    return NextResponse.json(
      { error: 'Failed to analyze conversations', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { senderID, action } = body;

    if (!senderID) {
      return NextResponse.json(
        { error: 'SenderID is required' },
        { status: 400 }
      );
    }

    const processor = new DataProcessor();
    const conversations = await processor.loadConversations();
    const grouped = processor.groupBySenderID(conversations);
    
    const messages = grouped.get(senderID);
    if (!messages) {
      return NextResponse.json(
        { error: 'SenderID not found' },
        { status: 404 }
      );
    }

    switch (action) {
      case 'analyze':
        // Analyze specific conversation (requires OpenAI)
        if (!isOpenAIConfigured()) {
          return NextResponse.json(
            { error: 'OpenAI API key not configured. Please set your API key in .env.local to use AI analysis features.' },
            { status: 400 }
          );
        }
        
        const analytics = await processor.analyzeConversation(senderID, messages);
        return NextResponse.json(analytics);

      case 'detailed':
        // Get detailed conversation analysis (requires OpenAI)
        if (!isOpenAIConfigured()) {
          return NextResponse.json(
            { error: 'OpenAI API key not configured. Please set your API key in .env.local to use AI analysis features.' },
            { status: 400 }
          );
        }
        
        const detailedAnalytics = await processor.getDetailedConversationAnalysis(senderID, messages);
        return NextResponse.json(detailedAnalytics);

      case 'messages':
        // Get raw messages for a sender (no AI needed)
        const basicMetrics = processor.calculateBasicMetrics(messages);
        return NextResponse.json({
          senderID,
          messageCount: messages.length,
          conversationLength: basicMetrics.conversationLength,
          firstResponseTime: basicMetrics.firstResponseTime,
          messages: messages.slice(0, 50) // Limit to first 50 messages
        });

      default:
        return NextResponse.json(
          { error: 'Invalid action. Use: analyze, detailed, or messages' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Analysis error:', error);
    return NextResponse.json(
      { error: 'Failed to analyze conversation', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

function calculateDashboardMetrics(analytics: import('@/types/conversation').ConversationAnalytics[], processor: DataProcessor): DashboardMetrics {
  const totalConversations = analytics.length;
  
  // Calculate metrics for dashboard
  
  const avgConversationLength = analytics.reduce((sum: number, a: any) => sum + a.conversationLength, 0) / totalConversations;
  
  const validResponseTimes = analytics.filter(a => a.firstResponseTime).map(a => a.firstResponseTime!);
  const avgFirstResponseTime = validResponseTimes.length > 0 
    ? validResponseTimes.reduce((sum: number, time: number) => sum + time, 0) / validResponseTimes.length 
    : 0;

  const sentimentCounts = analytics.reduce((acc, a) => {
    const sentiment = a.sentiment || 'neutral'; // Handle undefined sentiment
    if (sentiment in acc) {
      acc[sentiment as keyof typeof acc]++;
    } else {
      acc.neutral++; // Default to neutral for unknown sentiments
    }
    return acc;
  }, { positive: 0, negative: 0, neutral: 0 });

  const sentimentDistribution = {
    positive: (sentimentCounts.positive / totalConversations) * 100,
    negative: (sentimentCounts.negative / totalConversations) * 100,
    neutral: (sentimentCounts.neutral / totalConversations) * 100
  };
  
  // Sentiment analysis complete

  // Count all intents
  const intentCounts: { [key: string]: number } = {};
  analytics.forEach(a => {
    a.intents.forEach((intent: string) => {
      intentCounts[intent] = (intentCounts[intent] || 0) + 1;
    });
  });

  const topIntents = Object.entries(intentCounts)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 10)
    .map(([intent, count]) => ({ intent, count }));

  // Count all subcategories
  const categoryCounts: { [key: string]: number } = {};
  analytics.forEach(a => {
    a.subCategories.forEach((category: string) => {
      categoryCounts[category] = (categoryCounts[category] || 0) + 1;
    });
  });

  const topSubCategories = Object.entries(categoryCounts)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 10)
    .map(([category, count]) => ({ category, count }));

  const avgQualityScore = analytics.reduce((sum, a) => sum + (a.qualityScore || 0), 0) / totalConversations;

  // Calculate platform score
  const platformScore = processor.calculatePlatformScore(analytics);

  // Count knowledge gaps
  const knowledgeGapCounts: { [key: string]: number } = {};
  analytics.forEach(a => {
    a.knowledgeGaps.forEach((gap: string) => {
      knowledgeGapCounts[gap] = (knowledgeGapCounts[gap] || 0) + 1;
    });
  });

  const topKnowledgeGaps = Object.entries(knowledgeGapCounts)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 10)
    .map(([gap, count]) => ({ gap, count }));

  // Calculate escalation and resolution rates (ensure they're between 0-100%)
  console.log('📊 Metrics Debug:', {
    totalConversations,
    sentimentCounts,
    conversationsWithGaps: analytics.filter(a => a.knowledgeGaps.length > 0).length
  });
  
  // Escalation rate: conversations with negative sentiment AND low quality score AND knowledge gaps
  const escalatedConversations = analytics.filter(a => 
    a.sentiment === 'negative' && 
    a.qualityScore < 50 && 
    a.knowledgeGaps.length > 0
  ).length;
  const escalationRate = Math.min(100, Math.max(0, (escalatedConversations / totalConversations) * 100));
  
  // Resolution rate: conversations with decent quality (ignoring knowledge gaps)
  const resolvedConversations = analytics.filter(a => 
    a.qualityScore >= 60
  ).length;
  const resolutionRate = Math.min(100, Math.max(0, (resolvedConversations / totalConversations) * 100));
  
  console.log('📊 Calculated Rates:', { 
    escalationRate, 
    resolutionRate, 
    escalatedConversations, 
    resolvedConversations 
  });

  // Simple trends (could be enhanced with time-based data)
  const trendsOverTime = [
    {
      period: 'Current',
      qualityScore: avgQualityScore,
      sentimentScore: (sentimentCounts.positive / totalConversations) * 100,
      volume: totalConversations
    }
  ];

  return {
    totalConversations,
    avgConversationLength,
    avgFirstResponseTime,
    sentimentDistribution,
    topIntents,
    topTopics: topIntents.map(({ intent, count }) => ({ topic: intent, count })),
    topSubCategories,
    avgQualityScore,
    platformScore,
    topKnowledgeGaps,
    escalationRate,
    resolutionRate,
    trendsOverTime
  };
} 