import { supabase } from './supabase';
import { ConversationAnalytics } from '@/types/conversation';

export class SupabaseDataProcessor {
  
  /**
   * Fetch analytics from Supabase
   * This replaces loadCache()
   */
  async getAnalytics(sourceType: 'ai' | 'human' = 'ai', limit = 5000): Promise<{ analytics: ConversationAnalytics[], aiInsights: any }> {
    console.log(`🔍 Fetching ${sourceType} analytics from Supabase (target limit: ${limit})...`);

    let allData: any[] = [];
    let offset = 0;
    const BATCH_SIZE = 1000; // Supabase default limit is often 1000
    let hasMore = true;

    while (hasMore && allData.length < limit) {
      const remaining = limit - allData.length;
      const currentBatchSize = Math.min(BATCH_SIZE, remaining);
      
      // Use range for pagination to bypass the 1000 row default limit
      const { data, error } = await supabase
        .from('conversations')
        .select('*')
        .eq('source_type', sourceType)
        .order('created_at', { ascending: false })
        .range(offset, offset + currentBatchSize - 1);

      if (error) {
        console.error('Supabase Error:', error);
        // If we have some data, return what we have, otherwise return empty
        if (allData.length === 0) {
          return { analytics: [], aiInsights: null };
        }
        break;
      }

      if (!data || data.length === 0) {
        hasMore = false;
        break;
      }

      allData = [...allData, ...data];
      offset += data.length;
      
      if (data.length < currentBatchSize) {
        hasMore = false; // We fetched less than requested, so we are at the end
      }
    }

    console.log(`✅ Fetched total ${allData.length} records from Supabase`);

    // Map DB result to ConversationAnalytics interface
    const analytics = allData.map(row => ({
      conversationId: row.id,
      senderID: row.source_id,
      // Map fields
      sentiment: row.sentiment,
      sentimentScore: row.sentiment_score,
      qualityScore: row.quality_score,
      empathyScore: row.empathy_score || 0,
      intents: row.intents || (row.intent ? [row.intent] : []), // Map intent to intents array if needed
      topics: row.topics || [],
      subCategories: row.sub_categories || [],
      knowledgeGaps: row.knowledge_gaps || [],
      resolutionStatus: row.resolution_status,
      conversationLength: row.message_count,
      firstResponseTime: row.first_response_time_ms,
      summary: row.summary || '', // Ensure summary is present
      
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
    // Improved aggregation with frequency counting to show most common insights
    
    const countOccurrences = (items: string[]) => {
      const counts: Record<string, number> = {};
      items.forEach(item => {
        if (!item) return;
        // Normalize string to avoid duplicates due to case/spacing
        const normalized = item.trim();
        if (normalized.length > 0) {
          counts[normalized] = (counts[normalized] || 0) + 1;
        }
      });
      return Object.entries(counts)
        .sort(([,a], [,b]) => b - a)
        .map(([item]) => item);
    };
    
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
    
    const topTrends = countOccurrences(allTrends).slice(0, 8);
    const topRecs = countOccurrences(allRecs).slice(0, 8);
    
    return {
      insights: `Analyzed ${analytics.length} conversations from database.`,
      recommendations: topRecs.length > 0 ? topRecs : ['No specific recommendations found.'],
      trends: topTrends.length > 0 ? topTrends : ['No specific trends identified.']
    };
  }

  /**
   * Save analysis result back to Supabase
   */
  async saveAnalysis(conversationId: string, analysis: any) {
    // ... (keep existing or update if needed)
  }
}
