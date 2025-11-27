import { NextRequest, NextResponse } from 'next/server';
import { DataProcessor } from '../../../lib/data-processor';
import { SupabaseDataProcessor } from '../../../lib/supabase-data-processor';
import { DashboardMetrics, Message } from '../../../types/conversation';
import { isOpenAIConfigured } from '../../../lib/openai';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const action = searchParams.get('action');
    
    // Use Supabase processor for fetching analytics
    const dbProcessor = new SupabaseDataProcessor();
    const processor = new DataProcessor(); // Keep for metrics calculation helpers if needed

    switch (action) {
      case 'sample':
        // Get a sample conversation for testing (no AI needed)
        const sample = await processor.getSampleConversation();
        return NextResponse.json(sample);

      case 'full':
        // Fallback to basic view but using DB data (simulating full analysis result)
      case 'basic':
      default:
        console.log('🔍 Loading conversation analysis from Supabase...');
        
        // Fetch AI analytics from Supabase
        const { analytics, aiInsights } = await dbProcessor.getAnalytics('ai', 10000);
        
        if (analytics.length === 0) {
           // Fallback for demo mode or empty state
           return NextResponse.json({
            totalConversations: 0,
            metrics: null,
            fromCache: false,
            message: 'No data found in database.'
           });
        }

        console.log(`✅ Loaded ${analytics.length} conversations from DB`);
        
        // Calculate dashboard metrics from the loaded analytics
        const metrics: DashboardMetrics = calculateDashboardMetrics(analytics, processor);
        
        return NextResponse.json({
          analytics, // Include the raw list for charts/tables
          metrics,   // Aggregated metrics
          aiInsights,
          totalConversations: analytics.length,
          analyzedConversations: analytics.length,
          analysisType: 'full_ai',
          fromCache: true,
          message: 'Data loaded successfully from Supabase'
        });
        
      case 'regenerate-insights':
        // ... (keep existing logic or update later)
        return NextResponse.json({ success: false, error: 'Not implemented for DB yet' });
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