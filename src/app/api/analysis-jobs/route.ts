import { NextRequest, NextResponse } from 'next/server';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabase: SupabaseClient | null = null;

function getSupabase() {
  if (!supabase) {
    supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    );
  }
  return supabase;
}

// GET - List analysis jobs or get a specific job
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get('id');
    const type = searchParams.get('type');
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '10');

    if (jobId) {
      // Get specific job
      const { data, error } = await getSupabase()
        .from('analysis_jobs')
        .select('*')
        .eq('id', jobId)
        .single();

      if (error) throw error;
      return NextResponse.json({ success: true, job: data });
    }

    // List jobs with filters
    let query = getSupabase()
      .from('analysis_jobs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (type) {
      query = query.eq('analysis_type', type);
    }
    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({ success: true, jobs: data });
  } catch (error) {
    console.error('Error fetching analysis jobs:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// POST - Create a new analysis job
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, customPrompt, metricsConfig, versionName } = body;

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

    // Count total conversations to analyze
    const sourceType = type === 'dashboard' ? 'ai' : 'human';
    const { count, error: countError } = await getSupabase()
      .from('conversations')
      .select('*', { count: 'exact', head: true })
      .eq('source_type', sourceType);

    if (countError) throw countError;

    // Generate version name if not provided
    const finalVersionName = versionName || `${type === 'dashboard' ? 'Dashboard' : 'Human Agent'} Analysis - ${new Date().toLocaleString()}`;

    // Create the job record
    const { data: job, error } = await getSupabase()
      .from('analysis_jobs')
      .insert({
        version_name: finalVersionName,
        analysis_type: type,
        status: 'pending',
        total_conversations: count || 0,
        processed_conversations: 0,
        error_count: 0,
        metrics_config: metricsConfig,
        custom_prompt: customPrompt,
      })
      .select()
      .single();

    if (error) throw error;

    // Start the background analysis (fire and forget)
    startBackgroundAnalysis(job.id, type, customPrompt, metricsConfig).catch(err => {
      console.error('Background analysis error:', err);
    });

    return NextResponse.json({
      success: true,
      job: job,
      message: `Analysis job created. Processing ${count} conversations.`,
    });
  } catch (error) {
    console.error('Error creating analysis job:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// DELETE - Cancel a running job
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get('id');

    if (!jobId) {
      return NextResponse.json(
        { success: false, error: 'Job ID is required' },
        { status: 400 }
      );
    }

    const { error } = await getSupabase()
      .from('analysis_jobs')
      .update({ status: 'cancelled' })
      .eq('id', jobId)
      .in('status', ['pending', 'running']);

    if (error) throw error;

    return NextResponse.json({ success: true, message: 'Job cancelled' });
  } catch (error) {
    console.error('Error cancelling job:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// Background analysis function
async function startBackgroundAnalysis(
  jobId: string,
  type: 'dashboard' | 'humanAgent',
  customPrompt: string,
  metricsConfig: any[]
) {
  const OpenAI = (await import('openai')).default;
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  try {
    // Update job status to running
    await getSupabase()
      .from('analysis_jobs')
      .update({ status: 'running', started_at: new Date().toISOString() })
      .eq('id', jobId);

    const sourceType = type === 'dashboard' ? 'ai' : 'human';

    // Fetch all conversations
    const { data: conversations, error } = await getSupabase()
      .from('conversations')
      .select('id, source_id, channel, message_count')
      .eq('source_type', sourceType)
      .order('created_at', { ascending: false });

    if (error) throw error;

    if (!conversations || conversations.length === 0) {
      await getSupabase()
        .from('analysis_jobs')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
        })
        .eq('id', jobId);
      return;
    }

    const CONCURRENCY = 10;
    let processedCount = 0;
    let errorCount = 0;

    // JSON Schemas
    const dashboardSchema = {
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

    const humanAgentSchema = {
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
        recommendations: { type: "array" as const, items: { type: "string" as const } }
      },
      required: ["sentiment", "sentimentScore", "qualityScore", "empathyScore", "rootCauses", "knowledgeGaps", "coachingOpportunities", "escalationRisk", "churnSignals", "customerEffortScore", "resolutionStatus", "summary", "recommendations"] as const,
      additionalProperties: false as const
    };

    const schema = type === 'dashboard' ? dashboardSchema : humanAgentSchema;

    // Process in batches
    for (let i = 0; i < conversations.length; i += CONCURRENCY) {
      // Check if job was cancelled
      const { data: currentJob } = await getSupabase()
        .from('analysis_jobs')
        .select('status')
        .eq('id', jobId)
        .single();

      if (currentJob?.status === 'cancelled') {
        console.log(`Job ${jobId} was cancelled`);
        return;
      }

      const batch = conversations.slice(i, i + CONCURRENCY);

      const results = await Promise.all(batch.map(async (conversation) => {
        try {
          // Fetch messages
          const { data: messages, error: msgError } = await getSupabase()
            .from('messages')
            .select('id, content, sender_role, timestamp, cards_list')
            .eq('conversation_id', conversation.id)
            .order('timestamp', { ascending: true });

          if (msgError || !messages || messages.length === 0) {
            return { success: false };
          }

          const conversationText = formatMessages(messages, type);
          if (!conversationText.trim()) return { success: false };

          // Analyze with OpenAI
          const response = await openai.chat.completions.create({
            model: 'gpt-4.1-mini',
            messages: [
              { role: 'system', content: customPrompt },
              { role: 'user', content: `Analyze this conversation:\n\n${conversationText.substring(0, 3000)}` }
            ],
            response_format: {
              type: "json_schema",
              json_schema: {
                name: type === 'dashboard' ? 'conversation_analysis' : 'human_agent_analysis',
                strict: true,
                schema: schema
              }
            },
            max_completion_tokens: 800,
            temperature: 0.1,
          });

          const result = response.choices[0].message.content;
          if (!result) return { success: false };

          const parsed = JSON.parse(result);

          // Update conversation with analysis results
          const updateData = type === 'dashboard'
            ? {
                quality_score: parsed.qualityScore || 0,
                sentiment: parsed.sentiment || 'neutral',
                sentiment_score: parsed.sentimentScore || 0,
                intent: parsed.intents?.[0] || null,
                topics: parsed.intents || [],
                sub_categories: parsed.subCategories || [],
                knowledge_gaps: parsed.knowledgeGaps || [],
                recommendations: parsed.recommendations || [],
                trends: parsed.trends || [],
                transfer_reason: parsed.transferReason || null,
                was_transferred_to_agent: parsed.wasTransferredToAgent || false,
                resolution_status: (parsed.qualityScore >= 60) ? 'resolved' : 'unresolved',
                analysis_version: jobId,
              }
            : {
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
                analysis_version: jobId,
              };

          const { error: updateError } = await getSupabase()
            .from('conversations')
            .update(updateData)
            .eq('id', conversation.id);

          return { success: !updateError };
        } catch (err) {
          console.error(`Error analyzing conversation:`, err);
          return { success: false };
        }
      }));

      for (const r of results) {
        if (r.success) processedCount++;
        else errorCount++;
      }

      // Update job progress
      await getSupabase()
        .from('analysis_jobs')
        .update({
          processed_conversations: processedCount,
          error_count: errorCount,
        })
        .eq('id', jobId);

      // Small delay between batches
      if (i + CONCURRENCY < conversations.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    // Mark job as completed
    await getSupabase()
      .from('analysis_jobs')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        processed_conversations: processedCount,
        error_count: errorCount,
      })
      .eq('id', jobId);

  } catch (error) {
    console.error('Background analysis error:', error);
    await getSupabase()
      .from('analysis_jobs')
      .update({
        status: 'failed',
        completed_at: new Date().toISOString(),
        error_message: error instanceof Error ? error.message : 'Unknown error',
      })
      .eq('id', jobId);
  }
}

function formatMessages(messages: any[], type: string): string {
  if (!Array.isArray(messages)) return '';

  return messages
    .filter((msg: any) => msg.content && msg.content.trim())
    .map((msg: any) => {
      let content = msg.content;
      if (type === 'dashboard' && msg.cards_list && Array.isArray(msg.cards_list) && msg.cards_list.length > 0) {
        const cardTitles = msg.cards_list.map((card: any) => card.title || 'Option').join(', ');
        content += ` [Cards: ${cardTitles}]`;
      }
      return `${msg.sender_role}: ${content}`;
    })
    .join('\n');
}
