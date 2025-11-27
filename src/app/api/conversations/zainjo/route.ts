import { NextRequest, NextResponse } from 'next/server';
import { ZainjoDataProcessor } from '@/lib/zainjo-data-processor';

// Cache for transformed Zainjo conversations to avoid repeated processing
let zainjoConversationsCache: any[] | null = null;
let zainjoCacheTimestamp: number = 0;
const CACHE_DURATION = Infinity; // Cache persists forever

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '1000'); // Default to 1000 for performance
    const offset = parseInt(searchParams.get('offset') || '0');
    
    const zainjoProcessor = new ZainjoDataProcessor();
    
    // Load cached Zainjo analysis data
    const cache = await zainjoProcessor.loadCache();
    
    if (!cache || !cache.analytics || cache.analytics.length === 0) {
      return NextResponse.json({
        conversations: [],
        message: 'No Zainjo analysis data available. Please run Zainjo analysis first.'
      });
    }

    // Check if we have valid cached conversations
    const now = Date.now();
    if (zainjoConversationsCache && (now - zainjoCacheTimestamp) < CACHE_DURATION) {
      console.log('Returning paginated cached Zainjo conversations');
      const paginatedCached = zainjoConversationsCache.slice(offset, offset + limit);
      return NextResponse.json({
        conversations: paginatedCached,
        total: cache.analytics.length, // Total from original analytics
        page: Math.floor(offset / limit) + 1,
        limit: limit,
        hasMore: (offset + limit) < cache.analytics.length,
        message: `Zainjo conversations loaded from cache (${paginatedCached.length} of ${cache.analytics.length})`
      });
    }

    console.log('Transforming Zainjo analytics data to conversations...');
    
    // Transform ALL Zainjo analytics data to conversation format
    const allConversations = cache.analytics.map((analytics: any, index: number) => {
      // Use the actual data from the cache
      const hasKnowledgeGaps = analytics.knowledgeGaps && analytics.knowledgeGaps.length > 0;
      const qualityScore = Math.round(analytics.qualityScore || 0);
      const sentiment = analytics.sentiment || 'neutral'; // Use actual sentiment from cache
      
      let status = 'Completed';
      
      // Zainjo-specific status logic using real data
      if (sentiment === 'negative' && qualityScore < 50 && hasKnowledgeGaps) {
        status = 'Escalated';
      } else if (hasKnowledgeGaps) {
        status = 'Needs Review';
      } else if (qualityScore < 50) {
        status = 'Pending';
      }

      // Create timestamp for Zainjo conversations
      const timestamp = new Date(Date.UTC(2024, 0, 20, 10, 0, 0) + (index * 15 * 60 * 1000));

      // Extract intent from intents array if available
      const intent = analytics.intents && analytics.intents.length > 0 
        ? analytics.intents[0] 
        : 'general_inquiry';

      return {
        id: `ZAINJO-${String(index + 1).padStart(5, '0')}`,
        senderID: analytics.senderID, // Use actual senderID from cache (e.g., "zainjo-0")
        timestamp: timestamp.toISOString(),
        sentiment: sentiment, // Use actual sentiment from analysis
        qualityScore: qualityScore, // Use actual quality score
        intent: intent, // Use actual intent from analysis
        duration: `${Math.floor((analytics.firstResponseTime || 0) / 60000)}m ${Math.floor(((analytics.firstResponseTime || 0) % 60000) / 1000)}s`,
        status: status,
        messages: analytics.conversationLength || 0,
        conversationLength: analytics.conversationLength || 0,
        firstResponseTime: analytics.firstResponseTime,
        knowledgeGaps: analytics.knowledgeGaps || [],
        recommendations: analytics.recommendations || [],
        trends: analytics.trends || [],
        // Add Zainjo-specific fields using real data
        dataSource: 'zainjo',
        topics: analytics.intents || [], // Use intents as topics
        subCategories: analytics.subCategories || []
      };
    });

    // Cache ALL transformed conversations
    zainjoConversationsCache = allConversations;
    zainjoCacheTimestamp = now;

    // Return paginated subset
    const paginatedConversations = allConversations.slice(offset, offset + limit);

    // Debug logging
    console.log('Zainjo API Debug:', {
      totalConversations: allConversations.length,
      returnedConversations: paginatedConversations.length,
      sentiments: [...new Set(paginatedConversations.map((c: any) => c.sentiment))],
      sampleSenderIDs: paginatedConversations.slice(0, 3).map((c: any) => c.senderID),
      cached: true
    });

    return NextResponse.json({
      conversations: paginatedConversations,
      total: cache.analytics.length, // Total count from all analytics
      page: Math.floor(offset / limit) + 1,
      limit: limit,
      hasMore: (offset + limit) < cache.analytics.length,
      message: `Zainjo conversations loaded successfully (${paginatedConversations.length} of ${cache.analytics.length})`
    });

  } catch (error) {
    console.error('Error loading Zainjo conversations:', error);
    return NextResponse.json(
      { error: 'Failed to load Zainjo conversations' },
      { status: 500 }
    );
  }
} 