import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../../lib/supabase';

async function fetchAllConversations(sourceType: string, requestedLimit: number) {
  const BATCH_SIZE = 1000;
  const allData: any[] = [];
  let offset = 0;
  let hasMore = true;
  let totalCount = 0;
  
  while (hasMore && allData.length < requestedLimit) {
    const batchLimit = Math.min(BATCH_SIZE, requestedLimit - allData.length);
    const { data, error, count } = await supabase
      .from('conversations')
      .select('*', { count: 'exact' })
      .eq('source_type', sourceType)
      .order('created_at', { ascending: false })
      .range(offset, offset + batchLimit - 1);
    
    if (error) {
      console.error('Batch fetch error:', error);
      break;
    }
    
    if (count && totalCount === 0) {
      totalCount = count;
    }
    
    if (data && data.length > 0) {
      allData.push(...data);
      offset += data.length;
      hasMore = data.length === batchLimit && allData.length < requestedLimit;
    } else {
      hasMore = false;
    }
  }
  
  return { data: allData, count: totalCount };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '1000');
    const offset = parseInt(searchParams.get('offset') || '0');
    const sourceType = searchParams.get('sourceType') || 'ai';
    
    console.log(`🔍 Fetching conversations from Supabase (source: ${sourceType}, limit: ${limit}, offset: ${offset})...`);

    const { data, count } = await fetchAllConversations(sourceType, limit);
    const error = null;

    if (error) {
      console.error('Supabase Error:', error);
      return NextResponse.json({
        conversations: [],
        total: 0,
        error: error.message
      });
    }

    if (!data || data.length === 0) {
      return NextResponse.json({
        conversations: [],
        total: 0,
        message: 'No conversations found. Run an analysis from the dashboard first.'
      });
    }

    console.log(`✅ Loaded ${data.length} conversations from Supabase`);

    const conversations = data.map((row, index) => {
      const qualityScore = Math.round(row.quality_score || 0);
      const sentiment = row.sentiment || 'neutral';
      const hasKnowledgeGaps = row.knowledge_gaps && row.knowledge_gaps.length > 0;
      
      let status = 'Completed';
      if (sentiment === 'negative' && qualityScore < 50 && hasKnowledgeGaps) {
        status = 'Escalated';
      } else if (hasKnowledgeGaps) {
        status = 'Needs Review';
      } else if (qualityScore < 50) {
        status = 'Pending';
      }

      const durationSeconds = row.duration_seconds || 0;
      const minutes = Math.floor(durationSeconds / 60);
      const seconds = durationSeconds % 60;

      return {
        id: row.id,
        senderID: row.source_id,
        timestamp: row.started_at || row.created_at,
        sentiment: sentiment,
        qualityScore: qualityScore,
        intent: row.intent || 'general_inquiry',
        duration: durationSeconds > 0 ? `${minutes}m ${seconds}s` : 'N/A',
        status: status,
        messages: row.message_count || 0,
        conversationLength: row.message_count || 0,
        firstResponseTime: row.first_response_time_ms,
        knowledgeGaps: row.knowledge_gaps || [],
        recommendations: row.recommendations || [],
        trends: row.trends || [],
        topics: row.topics || [],
        subCategories: row.sub_categories || [],
        summary: row.summary || '',
        channel: row.channel || 'unknown'
      };
    });

    return NextResponse.json({
      conversations,
      total: count || data.length,
      page: Math.floor(offset / limit) + 1,
      limit: limit,
      hasMore: (offset + limit) < (count || data.length),
      message: `Loaded ${conversations.length} conversations from database`
    });

  } catch (error) {
    console.error('Error loading conversations:', error);
    return NextResponse.json(
      { error: 'Failed to load conversations', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
