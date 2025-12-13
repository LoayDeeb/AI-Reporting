import { NextRequest, NextResponse } from 'next/server';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

let supabase: SupabaseClient | null = null;
let openai: OpenAI | null = null;

function getSupabase() {
  if (!supabase) {
    supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    );
  }
  return supabase;
}

function getOpenAI() {
  if (!openai) {
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  return openai;
}

interface MetricConfig {
  key: string;
  name: string;
  description: string;
  range?: string;
}

// JSON Schema for Dashboard/Bot conversation analysis (Structured Outputs)
const dashboardAnalysisSchema = {
  type: "object" as const,
  properties: {
    sentiment: { type: "string" as const, enum: ["positive", "negative", "neutral"] },
    sentimentScore: { type: "number" as const },
    intents: { type: "array" as const, items: { type: "string" as const } },
    subCategories: { type: "array" as const, items: { type: "string" as const } },
    qualityScore: { type: "number" as const },
    qualityReasons: { type: "array" as const, items: { type: "string" as const } },
    knowledgeGaps: { type: "array" as const, items: { type: "string" as const } },
    summary: { type: "string" as const },
    recommendations: { type: "array" as const, items: { type: "string" as const } },
    trends: { type: "array" as const, items: { type: "string" as const } },
    transferReason: { type: "string" as const },
    wasTransferredToAgent: { type: "boolean" as const }
  },
  required: ["sentiment", "sentimentScore", "intents", "subCategories", "qualityScore", "qualityReasons", "knowledgeGaps", "summary", "recommendations", "trends", "transferReason", "wasTransferredToAgent"] as const,
  additionalProperties: false as const
};

// JSON Schema for Human Agent conversation analysis (Structured Outputs)
const humanAgentAnalysisSchema = {
  type: "object" as const,
  properties: {
    sentiment: { type: "string" as const, enum: ["positive", "negative", "neutral"] },
    sentimentScore: { type: "number" as const },
    qualityScore: { type: "number" as const },
    empathyScore: { type: "number" as const },
    rootCauses: { type: "array" as const, items: { type: "string" as const } },
    knowledgeGaps: { type: "array" as const, items: { type: "string" as const } },
    coachingOpportunities: { type: "array" as const, items: { type: "string" as const } },
    escalationRisk: { type: "number" as const },
    churnSignals: { type: "array" as const, items: { type: "string" as const } },
    customerEffortScore: { type: "number" as const },
    resolutionStatus: { type: "string" as const, enum: ["resolved", "partial", "unresolved"] },
    summary: { type: "string" as const },
    recommendations: { type: "array" as const, items: { type: "string" as const } },
    wasTransferredToAgent: { type: "boolean" as const },
    transferReason: { type: "string" as const }
  },
  required: ["sentiment", "sentimentScore", "qualityScore", "empathyScore", "rootCauses", "knowledgeGaps", "coachingOpportunities", "escalationRisk", "churnSignals", "customerEffortScore", "resolutionStatus", "summary", "recommendations", "wasTransferredToAgent", "transferReason"] as const,
  additionalProperties: false as const
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, customPrompt, metricsConfig, limit = 100 } = body;

    if (!type || !['dashboard', 'humanAgent'].includes(type)) {
      return NextResponse.json(
        { success: false, error: 'Invalid type. Use "dashboard" or "humanAgent"' },
        { status: 400 }
      );
    }

    if (!customPrompt || !metricsConfig) {
      return NextResponse.json(
        { success: false, error: 'customPrompt and metricsConfig are required' },
        { status: 400 }
      );
    }

    console.log(`🔍 Starting custom prompt analysis for ${type} with ${limit} conversations`);

    if (type === 'dashboard') {
      return await analyzeDashboardConversations(customPrompt, metricsConfig, limit);
    } else {
      return await analyzeHumanAgentConversations(customPrompt, metricsConfig, limit);
    }
  } catch (error) {
    console.error('Custom prompt analysis error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

async function analyzeDashboardConversations(
  customPrompt: string,
  metricsConfig: MetricConfig[],
  limit: number
) {
  try {
    // Fetch AI/bot conversations (source_type='ai') that need analysis
    const { data: conversations, error } = await getSupabase()
      .from('conversations')
      .select('id, source_id, channel, message_count')
      .eq('source_type', 'ai')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    if (!conversations || conversations.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No conversations found to analyze',
      });
    }

    console.log(`📊 Analyzing ${conversations.length} dashboard conversations with custom prompt`);

    let analyzedCount = 0;
    let errorCount = 0;
    const CONCURRENCY = 10;

    // Process in batches
    for (let i = 0; i < conversations.length; i += CONCURRENCY) {
      const batch = conversations.slice(i, i + CONCURRENCY);
      
      const results = await Promise.all(batch.map(async (conversation) => {
        try {
          // Fetch messages for this conversation
          const { data: messages, error: msgError } = await getSupabase()
            .from('messages')
            .select('id, content, sender_role, timestamp, cards_list')
            .eq('conversation_id', conversation.id)
            .order('timestamp', { ascending: true });

          if (msgError || !messages || messages.length === 0) {
            return { success: false };
          }

          const conversationText = formatMessagesForAnalysis(messages);
          if (!conversationText.trim()) return { success: false };

          // Use Structured Outputs for reliable JSON parsing
          const response = await getOpenAI().chat.completions.create({
            model: 'gpt-4.1-mini',
            messages: [
              { role: 'system', content: customPrompt },
              { role: 'user', content: `Analyze this conversation:\n\n${conversationText.substring(0, 3000)}` }
            ],
            response_format: {
              type: "json_schema",
              json_schema: {
                name: "conversation_analysis",
                strict: true,
                schema: dashboardAnalysisSchema
              }
            },
            max_completion_tokens: 800,
            temperature: 0.1,
          });

          const result = response.choices[0].message.content;
          if (!result) return { success: false };

          const parsed = JSON.parse(result);

          // Update using the same columns as the original script
          const { error: updateError } = await getSupabase()
            .from('conversations')
            .update({
              quality_score: parsed.qualityScore || 0,
              sentiment: parsed.sentiment || 'neutral',
              sentiment_score: parsed.sentimentScore || 0,
              intent: (parsed.intents && parsed.intents[0]) || null,
              topics: parsed.intents || [],
              sub_categories: parsed.subCategories || [],
              knowledge_gaps: parsed.knowledgeGaps || [],
              recommendations: parsed.recommendations || [],
              trends: parsed.trends || [],
              transfer_reason: parsed.transferReason || null,
              was_transferred_to_agent: parsed.wasTransferredToAgent || false,
              resolution_status: (parsed.qualityScore >= 60) ? 'resolved' : 'unresolved',
            })
            .eq('id', conversation.id);

          return { success: !updateError };
        } catch (err) {
          console.error(`Error analyzing conversation:`, err);
          return { success: false };
        }
      }));

      for (const r of results) {
        if (r.success) analyzedCount++;
        else errorCount++;
      }

      console.log(`  Batch ${Math.floor(i / CONCURRENCY) + 1}: ${analyzedCount + errorCount}/${conversations.length} done`);
      
      // Small delay between batches
      if (i + CONCURRENCY < conversations.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    return NextResponse.json({
      success: true,
      message: `Analyzed ${analyzedCount} conversations (${errorCount} errors)`,
      analyzed: analyzedCount,
      errors: errorCount,
    });
  } catch (error) {
    throw error;
  }
}

async function analyzeHumanAgentConversations(
  customPrompt: string,
  metricsConfig: MetricConfig[],
  limit: number
) {
  try {
    // Fetch human agent conversations (source_type='human') from the conversations table
    const { data: conversations, error } = await getSupabase()
      .from('conversations')
      .select('id, source_id, channel, message_count')
      .eq('source_type', 'human')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    if (!conversations || conversations.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No human agent conversations found to analyze',
      });
    }

    console.log(`👤 Analyzing ${conversations.length} human agent conversations with custom prompt`);

    let analyzedCount = 0;
    let errorCount = 0;
    const CONCURRENCY = 10;

    // Process in batches
    for (let i = 0; i < conversations.length; i += CONCURRENCY) {
      const batch = conversations.slice(i, i + CONCURRENCY);
      
      const results = await Promise.all(batch.map(async (conversation) => {
        try {
          // Fetch messages for this conversation
          const { data: messages, error: msgError } = await getSupabase()
            .from('messages')
            .select('id, content, sender_role, timestamp')
            .eq('conversation_id', conversation.id)
            .order('timestamp', { ascending: true });

          if (msgError || !messages || messages.length === 0) {
            return { success: false };
          }

          const conversationText = formatHumanAgentMessagesForAnalysis(messages);
          if (!conversationText.trim()) return { success: false };

          // Use Structured Outputs for reliable JSON parsing
          const response = await getOpenAI().chat.completions.create({
            model: 'gpt-4.1-mini',
            messages: [
              { role: 'system', content: customPrompt },
              { role: 'user', content: `Analyze this human agent conversation:\n\n${conversationText.substring(0, 3000)}` }
            ],
            response_format: {
              type: "json_schema",
              json_schema: {
                name: "human_agent_analysis",
                strict: true,
                schema: humanAgentAnalysisSchema
              }
            },
            max_completion_tokens: 800,
            temperature: 0.2,
          });

          const result = response.choices[0].message.content;
          if (!result) return { success: false };

          const parsed = JSON.parse(result);

          // Update using the same columns as the original human agent script
          const { error: updateError } = await getSupabase()
            .from('conversations')
            .update({
              quality_score: parsed.qualityScore || 0,
              empathy_score: parsed.empathyScore || 0,
              sentiment: parsed.sentiment || 'neutral',
              sentiment_score: parsed.sentimentScore || 0,
              knowledge_gaps: parsed.knowledgeGaps || [],
              root_causes: parsed.rootCauses || [],
              coaching_opportunities: parsed.coachingOpportunities || [],
              escalation_risk: parsed.escalationRisk || 0,
              churn_signals: parsed.churnSignals || [],
              customer_effort_score: parsed.customerEffortScore || 50,
              resolution_status: parsed.resolutionStatus || 'unresolved',
              recommendations: parsed.recommendations || [],
              was_transferred_to_agent: parsed.wasTransferredToAgent || false,
              transfer_reason: parsed.transferReason || '',
            })
            .eq('id', conversation.id);

          return { success: !updateError };
        } catch (err) {
          console.error(`Error analyzing human agent conversation:`, err);
          return { success: false };
        }
      }));

      for (const r of results) {
        if (r.success) analyzedCount++;
        else errorCount++;
      }

      console.log(`  Batch ${Math.floor(i / CONCURRENCY) + 1}: ${analyzedCount + errorCount}/${conversations.length} done`);
      
      // Small delay between batches
      if (i + CONCURRENCY < conversations.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    return NextResponse.json({
      success: true,
      message: `Analyzed ${analyzedCount} human agent conversations (${errorCount} errors)`,
      analyzed: analyzedCount,
      errors: errorCount,
    });
  } catch (error) {
    throw error;
  }
}

function formatMessagesForAnalysis(messages: any[]): string {
  if (!Array.isArray(messages)) return '';
  
  return messages
    .filter((msg: any) => msg.content && msg.content.trim())
    .map((msg: any) => {
      let content = msg.content;
      if (msg.cards_list && Array.isArray(msg.cards_list) && msg.cards_list.length > 0) {
        const cardTitles = msg.cards_list.map((card: any) => card.title || 'Option').join(', ');
        content += ` [Cards: ${cardTitles}]`;
      }
      return `${msg.sender_role}: ${content}`;
    })
    .join('\n');
}

function formatHumanAgentMessagesForAnalysis(messages: any[]): string {
  if (!Array.isArray(messages)) return '';
  
  return messages
    .filter((msg: any) => msg.content && msg.content.trim())
    .map((msg: any) => `${msg.sender_role}: ${msg.content}`)
    .join('\n');
}
