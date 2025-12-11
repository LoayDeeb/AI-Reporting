/**
 * analyze-human-agents-from-database.ts
 * 
 * This script runs AI analysis on HUMAN AGENT conversations stored in Supabase database
 * and saves the analysis results back to the database.
 * 
 * Usage:
 *   npx ts-node scripts/analyze-human-agents-from-database.ts [--limit 100] [--channel app|web] [--force]
 * 
 * Options:
 *   --limit    : Maximum number of conversations to analyze (default: 100)
 *   --channel  : Filter by channel 'app' or 'web' (default: all)
 *   --force    : Re-analyze conversations even if they already have analysis data
 */

import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false }
});

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

if (!process.env.OPENAI_API_KEY) {
  console.error('❌ Missing OPENAI_API_KEY environment variable');
  process.exit(1);
}

interface Message {
  id: string;
  content: string;
  sender_role: 'user' | 'bot' | 'agent';
  timestamp: string;
}

interface HumanAgentAnalysisResult {
  sentiment: 'positive' | 'negative' | 'neutral';
  sentimentScore: number;
  qualityScore: number;
  empathyScore: number;
  rootCauses: string[];
  knowledgeGaps: string[];
  coachingOpportunities: string[];
  escalationRisk: number;
  churnSignals: string[];
  customerEffortScore: number;
  resolutionStatus: string;
  summary: string;
  recommendations: string[];
}

// Parse command line arguments
function parseArgs(): { limit: number; channel?: string; force: boolean } {
  const args = process.argv.slice(2);
  let limit = 100;
  let channel: string | undefined;
  let force = false;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--limit' && args[i + 1]) {
      limit = parseInt(args[i + 1]);
      i++;
    } else if (args[i] === '--channel' && args[i + 1]) {
      channel = args[i + 1];
      i++;
    } else if (args[i] === '--force') {
      force = true;
    }
  }

  return { limit, channel, force };
}

// Format messages for AI analysis
function formatConversationForAI(messages: Message[]): string {
  return messages
    .filter(msg => msg.content && msg.content.trim())
    .map(msg => `${msg.sender_role}: ${msg.content}`)
    .join('\n');
}

// JSON Schema for Structured Outputs
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
    recommendations: { type: "array" as const, items: { type: "string" as const } }
  },
  required: ["sentiment", "sentimentScore", "qualityScore", "empathyScore", "rootCauses", "knowledgeGaps", "coachingOpportunities", "escalationRisk", "churnSignals", "customerEffortScore", "resolutionStatus", "summary", "recommendations"] as const,
  additionalProperties: false as const
};

// Analyze a single human agent conversation using GPT-4.1-mini with Structured Outputs
async function analyzeHumanAgentConversation(messages: Message[]): Promise<HumanAgentAnalysisResult> {
  const conversationText = formatConversationForAI(messages);
  
  if (!conversationText.trim()) {
    return getDefaultAnalysis();
  }

  const systemPrompt = `You are a call center quality analyst. Analyze this human agent conversation and provide structured analysis.

ANALYSIS GUIDELINES:
- sentiment: Overall customer sentiment at end of conversation
- sentimentScore: -1 (very negative) to 1 (very positive)
- qualityScore: 0-100 - how well the agent handled the conversation
- empathyScore: 0-100 - how empathetic was the agent
- rootCauses: Root causes of customer issues (max 3, in English)
- knowledgeGaps: Topics the agent struggled with (max 3, in English)
- coachingOpportunities: Areas for agent improvement (max 3, in English)
- escalationRisk: 0-100 - likelihood customer will escalate
- churnSignals: Signs customer might leave (max 3, in English)
- customerEffortScore: 0-100 - how hard customer had to work (higher = more effort = worse)
- resolutionStatus: resolved/partial/unresolved
- summary: Brief summary (max 100 words, in English)
- recommendations: Actionable recommendations (max 3, in English)

Handle Arabic and English conversations. Output all text fields in English for dashboard consistency.`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-5.1',
      messages: [
        { role: 'system', content: systemPrompt },
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
      temperature: 0.2
    });

    const result = response.choices[0]?.message?.content;
    if (!result) {
      throw new Error('No response from OpenAI');
    }

    const parsed = JSON.parse(result);
    
    return {
      sentiment: ['positive', 'negative', 'neutral'].includes(parsed.sentiment) ? parsed.sentiment : 'neutral',
      sentimentScore: typeof parsed.sentimentScore === 'number' ? Math.max(-1, Math.min(1, parsed.sentimentScore)) : 0,
      qualityScore: typeof parsed.qualityScore === 'number' ? Math.max(0, Math.min(100, parsed.qualityScore)) : 0,
      empathyScore: typeof parsed.empathyScore === 'number' ? Math.max(0, Math.min(100, parsed.empathyScore)) : 0,
      rootCauses: Array.isArray(parsed.rootCauses) ? parsed.rootCauses.slice(0, 3) : [],
      knowledgeGaps: Array.isArray(parsed.knowledgeGaps) ? parsed.knowledgeGaps.slice(0, 3) : [],
      coachingOpportunities: Array.isArray(parsed.coachingOpportunities) ? parsed.coachingOpportunities.slice(0, 3) : [],
      escalationRisk: typeof parsed.escalationRisk === 'number' ? Math.max(0, Math.min(100, parsed.escalationRisk)) : 0,
      churnSignals: Array.isArray(parsed.churnSignals) ? parsed.churnSignals.slice(0, 3) : [],
      customerEffortScore: typeof parsed.customerEffortScore === 'number' ? Math.max(0, Math.min(100, parsed.customerEffortScore)) : 50,
      resolutionStatus: ['resolved', 'partial', 'unresolved'].includes(parsed.resolutionStatus) ? parsed.resolutionStatus : 'unresolved',
      summary: typeof parsed.summary === 'string' ? parsed.summary.substring(0, 300) : '',
      recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations.slice(0, 3) : []
    };
  } catch (error) {
    console.error('  ❌ Analysis error:', error);
    return getDefaultAnalysis();
  }
}

function getDefaultAnalysis(): HumanAgentAnalysisResult {
  return {
    sentiment: 'neutral',
    sentimentScore: 0,
    qualityScore: 0,
    empathyScore: 0,
    rootCauses: [],
    knowledgeGaps: [],
    coachingOpportunities: [],
    escalationRisk: 50,
    churnSignals: [],
    customerEffortScore: 50,
    resolutionStatus: 'unresolved',
    summary: 'Analysis failed',
    recommendations: []
  };
}

// Save analysis results to Supabase
async function saveAnalysisToDatabase(conversationId: string, analysis: HumanAgentAnalysisResult): Promise<boolean> {
  const { error } = await supabase
    .from('conversations')
    .update({
      quality_score: analysis.qualityScore,
      empathy_score: analysis.empathyScore,
      sentiment: analysis.sentiment,
      sentiment_score: analysis.sentimentScore,
      knowledge_gaps: analysis.knowledgeGaps,
      root_causes: analysis.rootCauses,
      coaching_opportunities: analysis.coachingOpportunities,
      escalation_risk: analysis.escalationRisk,
      churn_signals: analysis.churnSignals,
      customer_effort_score: analysis.customerEffortScore,
      resolution_status: analysis.resolutionStatus,
      recommendations: analysis.recommendations
    })
    .eq('id', conversationId);

  if (error) {
    console.error(`  ❌ Failed to save analysis for ${conversationId}:`, error.message);
    return false;
  }
  return true;
}

interface Conversation {
  id: string;
  source_id: string;
  channel: string;
  message_count: number;
  quality_score: number | null;
}

// Fetch all conversations with pagination (Supabase has 1000 row limit per query)
async function fetchAllConversations(channel?: string, force?: boolean, maxLimit?: number): Promise<Conversation[]> {
  const PAGE_SIZE = 1000;
  let allConversations: Conversation[] = [];
  let offset = 0;
  
  while (true) {
    let query = supabase
      .from('conversations')
      .select('id, source_id, channel, message_count, quality_score')
      .eq('source_type', 'human')
      .order('created_at', { ascending: false })
      .range(offset, offset + PAGE_SIZE - 1);
    
    if (channel) {
      query = query.eq('channel', channel);
    }
    
    if (!force) {
      query = query.is('quality_score', null);
    }

    const { data, error } = await query;
    
    if (error) {
      throw new Error(`Failed to fetch conversations: ${error.message}`);
    }
    
    if (!data || data.length === 0) {
      break;
    }
    
    allConversations = allConversations.concat(data as Conversation[]);
    console.log(`   Fetched ${allConversations.length} conversations so far...`);
    
    if (data.length < PAGE_SIZE) {
      break; // Last page
    }
    
    if (maxLimit && allConversations.length >= maxLimit) {
      allConversations = allConversations.slice(0, maxLimit);
      break;
    }
    
    offset += PAGE_SIZE;
  }
  
  return allConversations;
}

// Main function
async function main() {
  const { limit, channel, force } = parseArgs();
  
  console.log('🚀 Starting Human Agent AI Analysis from Database');
  console.log(`   Limit: ${limit}`);
  console.log(`   Channel: ${channel || 'all'}`);
  console.log(`   Force re-analyze: ${force}`);
  console.log('');

  // 1. Fetch human agent conversations that need analysis (with pagination)
  console.log('📥 Fetching human agent conversations from database...');
  
  let conversations: Conversation[];
  try {
    conversations = await fetchAllConversations(channel, force, limit);
  } catch (error: any) {
    console.error('❌', error.message);
    process.exit(1);
  }

  if (conversations.length === 0) {
    console.log('✅ No human agent conversations need analysis. Use --force to re-analyze.');
    process.exit(0);
  }

  console.log(`📊 Found ${conversations.length} human agent conversations to analyze`);
  console.log('');

  // 2. Process conversations in parallel batches
  const CONCURRENCY = 10; // Process 10 at a time
  let processed = 0;
  let failed = 0;

  // Process a single conversation
  async function processOne(conv: Conversation): Promise<boolean> {
    try {
      // Fetch messages for this conversation
      const { data: messages, error: msgError } = await supabase
        .from('messages')
        .select('id, content, sender_role, timestamp')
        .eq('conversation_id', conv.id)
        .order('timestamp', { ascending: true });

      if (msgError || !messages || messages.length === 0) {
        return false;
      }

      // Analyze the conversation
      const analysis = await analyzeHumanAgentConversation(messages as Message[]);
      
      // Save to database
      return await saveAnalysisToDatabase(conv.id, analysis);
    } catch (error) {
      return false;
    }
  }

  // Process in batches of CONCURRENCY
  for (let i = 0; i < conversations.length; i += CONCURRENCY) {
    const batch = conversations.slice(i, i + CONCURRENCY);
    const startTime = Date.now();
    
    // Process batch in parallel
    const results = await Promise.all(batch.map(conv => processOne(conv)));
    
    // Count results
    for (const success of results) {
      if (success) {
        processed++;
      } else {
        failed++;
      }
    }

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    const total = processed + failed;
    const remaining = conversations.length - total;
    const eta = remaining > 0 ? Math.round((remaining / CONCURRENCY) * parseFloat(elapsed) / 60) : 0;
    
    console.log(`✅ Batch ${Math.floor(i / CONCURRENCY) + 1}: ${total}/${conversations.length} done (${elapsed}s) | ETA: ~${eta} min`);
    
    // Small delay between batches to avoid rate limits
    if (i + CONCURRENCY < conversations.length) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  console.log('\n');
  console.log('═'.repeat(50));
  console.log('🎉 Human Agent Analysis Complete!');
  console.log(`   ✅ Processed: ${processed}`);
  console.log(`   ❌ Failed: ${failed}`);
  console.log('═'.repeat(50));
}

main().catch(console.error);
