import { supabase } from './supabase';
import { ConversationAnalytics } from '@/types/conversation';

export class SupabaseDataProcessor {
  
  /**
   * Fetch analytics from Supabase
   * This replaces loadCache()
   */
  async getAnalytics(sourceType: 'ai' | 'human' = 'ai', limit = 5000): Promise<{ analytics: ConversationAnalytics[], aiInsights: any }> {
    console.log(`🔍 Fetching ${sourceType} analytics from Supabase (limit: ${limit})...`);

    const { data, error } = await supabase
      .from('conversations')
      .select('*')
      .eq('source_type', sourceType)
      .limit(limit)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Supabase Error:', error);
      return { analytics: [], aiInsights: null };
    }

    // Map DB result to ConversationAnalytics interface
    const analytics = data.map(row => ({
      conversationId: row.id,
      senderID: row.source_id,
      // Map fields
      sentiment: row.sentiment,
      sentimentScore: row.sentiment_score,
      qualityScore: row.quality_score,
      empathyScore: row.empathy_score,
      intent: row.intent,
      topics: row.topics || [],
      subCategories: row.sub_categories || [],
      knowledgeGaps: row.knowledge_gaps || [],
      resolutionStatus: row.resolution_status,
      conversationLength: row.message_count,
      firstResponseTime: row.first_response_time_ms,
      
      // Additional fields
      recommendations: row.recommendations || [],
      trends: row.trends || [],
      customerEffortScore: row.customer_effort_score,
      
      // Human Agent Specific
      agentName: row.agent_name,
      customerName: row.customer_name,
      coachingOpportunities: row.coaching_opportunities || [],
      scriptAdherence: row.script_adherence,
      escalationRisk: row.escalation_risk,
      rootCauses: row.root_causes || [],
      churnSignals: row.churn_signals || [],
      sentimentChange: row.sentiment_change,
      
      // Timestamps
      timestamp: row.started_at
    }));

    // Aggregate insights (since DB stores them per conversation mostly)
    // In a real app, we'd store platform-level insights in analytics_summary table
    const aiInsights = this.aggregateInsights(analytics);

    return { analytics, aiInsights };
  }

  private aggregateInsights(analytics: any[]) {
    // Simple aggregation for now
    
    // Try standard fields first
    let allTrends = analytics.flatMap(a => a.trends || []);
    let allRecs = analytics.flatMap(a => a.recommendations || []);
    
    // If empty, try human agent specific fields
    if (allTrends.length === 0) {
      allTrends = analytics.flatMap(a => a.rootCauses || []);
    }
    if (allRecs.length === 0) {
      allRecs = analytics.flatMap(a => a.coachingOpportunities || []);
    }
    
    return {
      insights: `Analyzed ${analytics.length} conversations from database.`,
      recommendations: [...new Set(allRecs)].slice(0, 5),
      trends: [...new Set(allTrends)].slice(0, 5)
    };
  }

  /**
   * Save analysis result back to Supabase
   */
  async saveAnalysis(conversationId: string, analysis: any) {
    // ... (keep existing or update if needed)
  }
}
