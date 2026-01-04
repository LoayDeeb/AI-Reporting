import { NextRequest, NextResponse } from 'next/server';
import { SupabaseDataProcessor } from '../../../lib/supabase-data-processor';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const version = searchParams.get('version') || undefined;
    
    console.log(`🚀 Human Agent API: Analysis requested (Supabase, version: ${version || 'all'})`);
    
    const processor = new SupabaseDataProcessor();
    const { analytics, aiInsights } = await processor.getAnalytics('human', 5000, undefined, version);
    
    if (analytics.length === 0) {
      return NextResponse.json({
        error: 'No human agent data found in database',
        hasData: false
      }, { status: 404 });
    }

    // Map to the exact structure expected by the frontend
    const transformedAnalytics = analytics.map(a => {
      // Use the actual initial_sentiment and final_sentiment from database
      // These are set by the AI analysis script directly
      const initialSentiment = a.initial_sentiment || a.sentiment || 'neutral';
      const finalSentiment = a.final_sentiment || a.sentiment || 'neutral';

      return {
        conversation_id: a.senderID, // Map senderID to conversation_id for human agents
        agent_name: a.agentName || 'Agent',
        customer_name: a.customerName || a.senderID,
        conversation_length: a.conversationLength,
        quality_score: a.qualityScore,
        empathy_score: a.empathyScore,
        escalation_risk: a.escalationRisk || 0,
        script_adherence: a.scriptAdherence || 0,
        customer_effort_score: a.customerEffortScore || 0,
        final_sentiment: finalSentiment,
        initial_sentiment: initialSentiment,
        sentiment_change: a.sentimentChange || 'maintained',
        knowledge_gaps: a.knowledgeGaps,
        coaching_opportunities: a.coachingOpportunities || [],
        root_causes: a.rootCauses || [],
        churn_signals: a.churnSignals || [],
        timestamp: a.timestamp,
        was_transferred_to_agent: a.wasTransferredToAgent || false,
        transfer_reason: a.transferReason || ''
      };
    });

    // Calculate agent stats
    const total_agents = new Set(transformedAnalytics.map(a => a.agent_name)).size;

    return NextResponse.json({
      analytics: transformedAnalytics,
      aiInsights,
      total_conversations: transformedAnalytics.length,
      total_agents,
      timestamp: Date.now(),
      fromCache: true,
      source: 'supabase',
      currentVersion: version || null
    });

  } catch (error: any) {
    console.error('❌ Human Agent API Error:', error);
    return NextResponse.json({
      error: 'Internal server error',
      message: error.message
    }, { status: 500 });
  }
} 