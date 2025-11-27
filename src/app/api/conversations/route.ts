import { NextRequest, NextResponse } from 'next/server';
import { DataProcessor } from '../../../lib/data-processor';

// Cache for transformed conversations to avoid repeated processing
let conversationsCache: any[] | null = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION = Infinity; // Cache persists forever

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '1000'); // Default to 1000 for performance
    const offset = parseInt(searchParams.get('offset') || '0');
    
    const dataProcessor = new DataProcessor();
    
    // Load cached analytics data
    const cache = await dataProcessor.loadCache();
    
    if (!cache || !cache.analytics || cache.analytics.length === 0) {
      return NextResponse.json({
        conversations: [],
        message: 'No conversation data available. Please run an analysis first.'
      });
    }

    // Check if we have valid cached conversations
    const now = Date.now();
    if (conversationsCache && (now - cacheTimestamp) < CACHE_DURATION) {
      console.log('Returning paginated cached conversations');
      const paginatedCached = conversationsCache.slice(offset, offset + limit);
      return NextResponse.json({
        conversations: paginatedCached,
        total: cache.analytics.length, // Total from original analytics
        page: Math.floor(offset / limit) + 1,
        limit: limit,
        hasMore: (offset + limit) < cache.analytics.length,
        message: `Conversations loaded from cache (${paginatedCached.length} of ${cache.analytics.length})`
      });
    }

    console.log('Transforming analytics data to conversations...');
    
    // Transform ALL analytics data to conversation format (cache all, paginate on return)
    const allConversations = cache.analytics.map((analytics: any, index: number) => {
      // Determine status based on comprehensive escalation criteria (aligned with dashboard logic)
      const hasKnowledgeGaps = analytics.knowledgeGaps && analytics.knowledgeGaps.length > 0;
      const qualityScore = Math.round(analytics.qualityScore || 0);
      const sentiment = analytics.sentiment || 'neutral';
      
      let status = 'Completed';
      
      // True escalation: negative sentiment + low quality + knowledge gaps
      if (sentiment === 'negative' && qualityScore < 50 && hasKnowledgeGaps) {
        status = 'Escalated';
      } 
      // Needs attention: has knowledge gaps but good sentiment/quality
      else if (hasKnowledgeGaps) {
        status = 'Needs Review';
      } 
      // Quality issues: low quality without knowledge gaps
      else if (qualityScore < 50) {
        status = 'Pending';
      }

      // Create a timestamp (optimized calculation)
      const timestamp = new Date(Date.UTC(2024, 0, 20, 10, 0, 0) + (index * 15 * 60 * 1000));

      return {
        id: `CONV-${String(index + 1).padStart(4, '0')}`,
        senderID: analytics.senderID,
        timestamp: timestamp.toISOString(),
        sentiment: analytics.sentiment || 'neutral',
        qualityScore: qualityScore,
        intent: analytics.intent || 'general_inquiry',
        duration: `${Math.floor((analytics.firstResponseTime || 0) / 60000)}m ${Math.floor(((analytics.firstResponseTime || 0) % 60000) / 1000)}s`,
        status: status,
        messages: analytics.conversationLength || 0,
        conversationLength: analytics.conversationLength || 0,
        firstResponseTime: analytics.firstResponseTime,
        knowledgeGaps: analytics.knowledgeGaps || [],
        recommendations: analytics.recommendations || [],
        trends: analytics.trends || []
      };
    });

    // Cache ALL transformed conversations
    conversationsCache = allConversations;
    cacheTimestamp = now;

    // Return paginated subset
    const paginatedConversations = allConversations.slice(offset, offset + limit);

    // Debug logging (reduced)
    console.log('API Debug:', {
      totalConversations: allConversations.length,
      returnedConversations: paginatedConversations.length,
      sentiments: [...new Set(paginatedConversations.map((c: any) => c.sentiment))],
      cached: true
    });

    return NextResponse.json({
      conversations: paginatedConversations,
      total: cache.analytics.length, // Total count from all analytics
      page: Math.floor(offset / limit) + 1,
      limit: limit,
      hasMore: (offset + limit) < cache.analytics.length,
      message: `Conversations loaded successfully (${paginatedConversations.length} of ${cache.analytics.length})`
    });

  } catch (error) {
    console.error('Error loading conversations:', error);
    return NextResponse.json(
      { error: 'Failed to load conversations' },
      { status: 500 }
    );
  }
} 