import { NextRequest, NextResponse } from 'next/server';
import { SupabaseDataProcessor } from '../../../lib/supabase-data-processor';
import { AIAnalysisService } from '../../../lib/ai-analysis';

export async function POST(request: NextRequest) {
  try {
    console.log('🔄 API: Regenerating insights from Supabase data...');
    
    // 1. Fetch Data from Supabase (up to 5000 records for comprehensive analysis)
    const processor = new SupabaseDataProcessor();
    const { analytics } = await processor.getAnalytics('ai', 5000);
    
    if (!analytics || analytics.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No conversation data found in database.'
      }, { status: 400 });
    }

    console.log(`📊 Found ${analytics.length} conversations in database`);

    // 2. Consolidate insights using AI Analysis Service
    // This aggregates individual conversation signals into platform-level insights
    const aiService = new AIAnalysisService();
    const aiInsights = await aiService.consolidateConversationInsights(analytics);
    
    console.log('✅ Insights regenerated successfully');

    return NextResponse.json({
      success: true,
      message: `Successfully regenerated insights from ${analytics.length} conversations`,
      aiInsights,
      cachedConversations: analytics.length,
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
  // Basic check endpoint
  return NextResponse.json({
    status: 'ready',
    service: 'Supabase Insight Generator'
  });
} 