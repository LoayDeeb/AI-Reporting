import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../../../lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '1000');
    const offset = parseInt(searchParams.get('offset') || '0');
    
    console.log(`🔍 Fetching human agent conversations from Supabase (limit: ${limit}, offset: ${offset})...`);

    const { data, error, count } = await supabase
      .from('conversations')
      .select('*', { count: 'exact' })
      .eq('source_type', 'human')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

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
        message: 'No human agent conversations found. Run a human agent analysis from the dashboard first.'
      });
    }

    console.log(`✅ Loaded ${data.length} human agent conversations from Supabase`);

    const conversations = data.map((row) => {
      const qualityScore = Math.round(row.quality_score || 0);
      const empathyScore = Math.round(row.empathy_score || 0);
      const escalationRisk = Math.round(row.escalation_risk || 0);
      const sentiment = row.sentiment || 'neutral';
      
      let initialSentiment = sentiment;
      if (row.sentiment_change && row.sentiment_change.includes('→')) {
        const parts = row.sentiment_change.split('→');
        if (parts.length >= 1) {
          initialSentiment = parts[0].trim().toLowerCase();
        }
      }

      const durationSeconds = row.duration_seconds || 0;
      const minutes = Math.floor(durationSeconds / 60);
      const seconds = durationSeconds % 60;

      return {
        id: row.id,
        conversation_id: row.source_id,
        agent_name: row.agent_name || 'Agent',
        customer_name: row.customer_name || 'Customer',
        timestamp: row.started_at || row.created_at,
        conversation_length: row.message_count || 0,
        agent_response_count: Math.floor((row.message_count || 0) / 2),
        customer_message_count: Math.ceil((row.message_count || 0) / 2),
        resolution_time: durationSeconds > 0 ? durationSeconds : null,
        quality_score: qualityScore,
        empathy_score: empathyScore,
        escalation_risk: escalationRisk,
        script_adherence: Math.round(row.script_adherence || 0),
        customer_effort_score: Math.round(row.customer_effort_score || 0),
        final_sentiment: sentiment,
        initial_sentiment: initialSentiment,
        sentiment_change: row.sentiment_change || 'maintained',
        sentiment_impact: row.sentiment_change || 'stable',
        categories: row.topics || [],
        knowledge_gaps: row.knowledge_gaps || [],
        coaching_opportunities: row.coaching_opportunities || [],
        root_causes: row.root_causes || [],
        churn_signals: row.churn_signals || [],
        emotions: row.emotions || [],
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
      message: `Loaded ${conversations.length} human agent conversations from database`
    });

  } catch (error) {
    console.error('Error loading human agent conversations:', error);
    return NextResponse.json(
      { error: 'Failed to load human agent conversations', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
