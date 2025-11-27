import { NextRequest, NextResponse } from 'next/server';
import { DataProcessor } from '@/lib/data-processor';

export async function POST(request: NextRequest) {
  try {
    console.log('🔄 API: Regenerating insights from cached data...');
    
    const processor = new DataProcessor();
    
    // Check if cache exists
    const cache = await processor.loadCache();
    if (!cache || !cache.analytics || cache.analytics.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No cached analysis data found. Please run full analysis first.'
      }, { status: 400 });
    }

    console.log(`📊 Found cached analysis with ${cache.analytics.length} conversations`);

    // Regenerate AI insights from cached data
    const aiInsights = await processor.regenerateAIInsights();
    
    console.log('✅ Insights regenerated successfully');

    return NextResponse.json({
      success: true,
      message: `Successfully regenerated insights from ${cache.analytics.length} cached conversations`,
      aiInsights,
      cachedConversations: cache.analytics.length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error regenerating insights:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to regenerate insights',
      details: 'Check server logs for more information'
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const processor = new DataProcessor();
    const cache = await processor.loadCache();
    
    if (!cache || !cache.analytics || cache.analytics.length === 0) {
      return NextResponse.json({
        hasCachedData: false,
        message: 'No cached analysis data found'
      });
    }

    return NextResponse.json({
      hasCachedData: true,
      cachedConversations: cache.analytics.length,
      cacheTimestamp: cache.timestamp,
      hasInsights: !!(cache.aiInsights && cache.aiInsights.insights),
      currentInsightsLength: cache.aiInsights?.insights?.length || 0,
      currentRecommendations: cache.aiInsights?.recommendations?.length || 0,
      currentTrends: cache.aiInsights?.trends?.length || 0
    });

  } catch (error) {
    console.error('❌ Error checking cache:', error);
    return NextResponse.json({
      hasCachedData: false,
      error: error instanceof Error ? error.message : 'Failed to check cache'
    }, { status: 500 });
  }
} 