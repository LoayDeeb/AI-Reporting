import { NextRequest, NextResponse } from 'next/server';
import { ZainjoDataProcessor } from '@/lib/zainjo-data-processor';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'full';
    const fastMode = searchParams.get('fastMode') === 'true';
    const sampleSize = searchParams.get('sampleSize') ? parseInt(searchParams.get('sampleSize')!) : 0; // 0 means all conversations
    const optimization = searchParams.get('optimization') as 'standard' | 'aggressive' | 'extreme' || 'standard';
    const forceRefresh = searchParams.get('forceRefresh') === 'true';

    console.log(`🚀 Zainjo API: ${action} analysis requested`);
    console.log(`⚙️ Settings: fastMode=${fastMode}, sampleSize=${sampleSize}, optimization=${optimization}, forceRefresh=${forceRefresh}`);

    const processor = new ZainjoDataProcessor();

    if (action === 'full') {
      const result = await processor.processZainjoConversations(
        fastMode,
        sampleSize,
        optimization,
        forceRefresh
      );

      // Calculate basic metrics for dashboard
      const totalConversations = result.analytics.length;
      const avgQualityScore = result.analytics.reduce((sum: number, a: any) => sum + a.qualityScore, 0) / totalConversations;
      const sentimentCounts = result.analytics.reduce((acc: any, a: any) => {
        acc[a.sentiment]++;
        return acc;
      }, { positive: 0, negative: 0, neutral: 0 });

      const dashboardMetrics = {
        totalConversations,
        avgQualityScore: Math.round(avgQualityScore * 100) / 100,
        sentimentDistribution: {
          positive: Math.round((sentimentCounts.positive / totalConversations) * 100),
          negative: Math.round((sentimentCounts.negative / totalConversations) * 100),
          neutral: Math.round((sentimentCounts.neutral / totalConversations) * 100)
        },
                 topIntents: getTopItems(result.analytics.flatMap((a: any) => a.intents)),
         topKnowledgeGaps: getTopItems(result.analytics.flatMap((a: any) => a.knowledgeGaps)),
        avgConversationLength: Math.round(result.analytics.reduce((sum: number, a: any) => sum + a.conversationLength, 0) / totalConversations),
        dataSource: 'Zainjo Dataset'
      };

      return NextResponse.json({
        success: true,
        analytics: result.analytics,
        aiInsights: result.aiInsights,
        dashboardMetrics,
        fromCache: result.fromCache,
        timestamp: new Date().toISOString()
      });
    }

    if (action === 'regenerate-insights') {
      const aiInsights = await processor.regenerateZainjoInsights();
      
      return NextResponse.json({
        success: true,
        aiInsights,
        message: 'Zainjo AI insights regenerated successfully'
      });
    }

    if (action === 'clear-cache') {
      processor.clearCache();
      return NextResponse.json({
        success: true,
        message: 'Zainjo cache cleared successfully'
      });
    }

    return NextResponse.json({
      success: false,
      error: 'Invalid action. Supported actions: full, regenerate-insights, clear-cache'
    }, { status: 400 });

  } catch (error: any) {
    console.error('❌ Zainjo API Error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Internal server error'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, ...options } = body;

    const processor = new ZainjoDataProcessor();

    if (action === 'regenerate-insights') {
      const aiInsights = await processor.regenerateZainjoInsights();
      
      return NextResponse.json({
        success: true,
        aiInsights,
        message: 'Zainjo AI insights regenerated successfully'
      });
    }

    return NextResponse.json({
      success: false,
      error: 'Invalid POST action'
    }, { status: 400 });

  } catch (error: any) {
    console.error('❌ Zainjo POST API Error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Internal server error'
    }, { status: 500 });
  }
}

// Helper function to get top items with counts
function getTopItems(items: string[], limit: number = 10): Array<{ item: string; count: number }> {
  const counts = items.reduce((acc, item) => {
    acc[item] = (acc[item] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return Object.entries(counts)
    .map(([item, count]) => ({ item, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
} 