/**
 * analyze-from-database.ts
 * 
 * This script runs AI analysis on conversations stored in Supabase database
 * and saves the analysis results (including transfer_reason, channel) back to the database.
 * 
 * Usage:
 *   npx ts-node scripts/analyze-from-database.ts [--type ai|human] [--limit 100] [--channel app|web]
 * 
 * Options:
 *   --type     : 'ai' for bot conversations, 'human' for human agent conversations (default: ai)
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

// Agent transfer detection phrases
const AGENT_TRANSFER_PHRASES = [
  'Please wait until I connect you to an Agent',
  'الرجاء الانتظار حتى أقوم بتحويلك الى موظف',
  'يرجى الانتظار حتى أقوم بتوصيلك بأحد الموظفين',
  'الرجاء الانتظار حتى أقوم بتوصيلك'
];

interface Message {
  id: string;
  content: string;
  sender_role: 'user' | 'bot' | 'agent';
  timestamp: string;
  cards_list?: any;
}

interface Conversation {
  id: string;
  source_id: string;
  source_type: 'ai' | 'human';
  channel: string;
  message_count: number;
  quality_score: number | null;
}

interface AnalysisResult {
  sentiment: 'positive' | 'negative' | 'neutral';
  sentimentScore: number;
  intents: string[];
  subCategories: string[];
  qualityScore: number;
  qualityReasons: string[];
  knowledgeGaps: string[];
  summary: string;
  recommendations: string[];
  trends: string[];
  transferReason: string;
  wasTransferredToAgent: boolean;
}

// Parse command line arguments
function parseArgs(): { type: 'ai' | 'human'; limit: number; channel?: string; force: boolean } {
  const args = process.argv.slice(2);
  let type: 'ai' | 'human' = 'ai';
  let limit = 100;
  let channel: string | undefined;
  let force = false;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--type' && args[i + 1]) {
      type = args[i + 1] as 'ai' | 'human';
      i++;
    } else if (args[i] === '--limit' && args[i + 1]) {
      limit = parseInt(args[i + 1]);
      i++;
    } else if (args[i] === '--channel' && args[i + 1]) {
      channel = args[i + 1];
      i++;
    } else if (args[i] === '--force') {
      force = true;
    }
  }

  return { type, limit, channel, force };
}

// Format messages for AI analysis
function formatConversationForAI(messages: Message[]): string {
  return messages
    .filter(msg => msg.content && msg.content.trim())
    .map(msg => {
      let content = msg.content;
      if (msg.cards_list && Array.isArray(msg.cards_list) && msg.cards_list.length > 0) {
        const cardTitles = msg.cards_list.map((card: any) => card.title || 'Option').join(', ');
        content += ` [Cards: ${cardTitles}]`;
      }
      return `${msg.sender_role}: ${content}`;
    })
    .join('\n');
}

// Check if conversation contains agent transfer
function checkForAgentTransfer(messages: Message[]): boolean {
  for (const msg of messages) {
    if (!msg.content) continue;
    for (const phrase of AGENT_TRANSFER_PHRASES) {
      if (msg.content.includes(phrase)) {
        return true;
      }
    }
  }
  return false;
}

// JSON Schema for Structured Outputs
const analysisSchema = {
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

// Analyze a single conversation using GPT-4.1-mini with Structured Outputs
async function analyzeConversation(messages: Message[]): Promise<AnalysisResult> {
  const conversationText = formatConversationForAI(messages);
  
  if (!conversationText.trim()) {
    return {
      sentiment: 'neutral',
      sentimentScore: 0,
      intents: [],
      subCategories: [],
      qualityScore: 0,
      qualityReasons: ['Empty conversation'],
      knowledgeGaps: [],
      summary: 'Empty conversation',
      recommendations: [],
      trends: [],
      transferReason: '',
      wasTransferredToAgent: false
    };
  }

  const systemPrompt = `You are a conversation analyzer for a chatbot analytics platform. Analyze the conversation and provide structured analysis.

ANALYSIS GUIDELINES:
- sentiment: Overall conversation sentiment
- sentimentScore: -1 (very negative) to 1 (very positive)
- intents: Specific topics discussed (max 5, use English snake_case like "order_status", "payment_issue")
- subCategories: Sub-topics (max 5, use English snake_case)
- qualityScore: 0-100 based on how well the bot resolved the user's issue
- qualityReasons: Specific reasons for the score (max 3, in English)
- knowledgeGaps: Things the bot couldn't handle (max 5, in English)
- summary: Brief summary (max 100 words, in English)
- recommendations: Actionable improvements (max 3, in English)
- trends: Patterns observed (max 2, in English)
- transferReason: WHY user was transferred (empty string if no transfer, in English)
- wasTransferredToAgent: true if transferred to human

AGENT TRANSFER DETECTION - Look for these phrases:
- English: "Please wait until I connect you to an Agent"
- Arabic: "الرجاء الانتظار حتى أقوم بتحويلك الى موظف" or "يرجى الانتظار حتى أقوم بتوصيلك بأحد الموظفين"

Handle Arabic and English conversations. Output all text fields in English for dashboard consistency.`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-5.1',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Analyze this conversation:\n\n${conversationText.substring(0, 3000)}` }
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "conversation_analysis",
          strict: true,
          schema: analysisSchema
        }
      },
      max_completion_tokens: 800,
      temperature: 0.1
    });

    const result = response.choices[0]?.message?.content;
    if (!result) {
      throw new Error('No response from OpenAI');
    }

    const parsed = JSON.parse(result);
    
    return {
      sentiment: ['positive', 'negative', 'neutral'].includes(parsed.sentiment) ? parsed.sentiment : 'neutral',
      sentimentScore: typeof parsed.sentimentScore === 'number' ? Math.max(-1, Math.min(1, parsed.sentimentScore)) : 0,
      intents: Array.isArray(parsed.intents) ? parsed.intents.slice(0, 5) : [],
      subCategories: Array.isArray(parsed.subCategories) ? parsed.subCategories.slice(0, 5) : [],
      qualityScore: typeof parsed.qualityScore === 'number' ? Math.max(0, Math.min(100, parsed.qualityScore)) : 0,
      qualityReasons: Array.isArray(parsed.qualityReasons) ? parsed.qualityReasons.slice(0, 3) : [],
      knowledgeGaps: Array.isArray(parsed.knowledgeGaps) ? parsed.knowledgeGaps.slice(0, 5) : [],
      summary: typeof parsed.summary === 'string' ? parsed.summary.substring(0, 300) : '',
      recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations.slice(0, 3) : [],
      trends: Array.isArray(parsed.trends) ? parsed.trends.slice(0, 2) : [],
      transferReason: typeof parsed.transferReason === 'string' ? parsed.transferReason.substring(0, 300) : '',
      wasTransferredToAgent: parsed.wasTransferredToAgent === true
    };
  } catch (error) {
    console.error('  ❌ Analysis error:', error);
    // Return basic analysis with transfer detection fallback
    const wasTransferred = checkForAgentTransfer(messages);
    return {
      sentiment: 'neutral',
      sentimentScore: 0,
      intents: [],
      subCategories: [],
      qualityScore: 0,
      qualityReasons: ['Analysis failed'],
      knowledgeGaps: [],
      summary: 'Analysis failed',
      recommendations: [],
      trends: [],
      transferReason: wasTransferred ? 'Transfer detected but reason analysis failed' : '',
      wasTransferredToAgent: wasTransferred
    };
  }
}

// Save analysis results to Supabase
async function saveAnalysisToDatabase(conversationId: string, analysis: AnalysisResult): Promise<boolean> {
  const { error } = await supabase
    .from('conversations')
    .update({
      quality_score: analysis.qualityScore,
      sentiment: analysis.sentiment,
      sentiment_score: analysis.sentimentScore,
      intent: analysis.intents[0] || null,
      topics: analysis.intents,
      sub_categories: analysis.subCategories,
      knowledge_gaps: analysis.knowledgeGaps,
      recommendations: analysis.recommendations,
      trends: analysis.trends,
      transfer_reason: analysis.transferReason || null,
      was_transferred_to_agent: analysis.wasTransferredToAgent,
      resolution_status: analysis.qualityScore >= 60 ? 'resolved' : 'unresolved'
    })
    .eq('id', conversationId);

  if (error) {
    console.error(`  ❌ Failed to save analysis for ${conversationId}:`, error.message);
    return false;
  }
  return true;
}

// Fetch all conversations with pagination (Supabase has 1000 row limit per query)
async function fetchAllConversations(type: 'ai' | 'human', channel?: string, force?: boolean, maxLimit?: number): Promise<Conversation[]> {
  const PAGE_SIZE = 1000;
  let allConversations: Conversation[] = [];
  let offset = 0;
  
  while (true) {
    let query = supabase
      .from('conversations')
      .select('id, source_id, source_type, channel, message_count, quality_score')
      .eq('source_type', type)
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
  const { type, limit, channel, force } = parseArgs();
  
  console.log('🚀 Starting AI Analysis from Database');
  console.log(`   Type: ${type}`);
  console.log(`   Limit: ${limit}`);
  console.log(`   Channel: ${channel || 'all'}`);
  console.log(`   Force re-analyze: ${force}`);
  console.log('');

  // 1. Fetch conversations that need analysis (with pagination)
  console.log('📥 Fetching conversations from database...');
  
  let conversations: Conversation[];
  try {
    conversations = await fetchAllConversations(type, channel, force, limit);
  } catch (error: any) {
    console.error('❌', error.message);
    process.exit(1);
  }

  if (conversations.length === 0) {
    console.log('✅ No conversations need analysis. Use --force to re-analyze.');
    process.exit(0);
  }

  console.log(`📊 Found ${conversations.length} conversations to analyze`);
  console.log('');

  // 2. Process conversations in parallel batches
  const CONCURRENCY = 10; // Process 10 at a time
  let processed = 0;
  let failed = 0;
  let transferred = 0;

  // Process a single conversation
  async function processOne(conv: Conversation): Promise<{ success: boolean; transferred: boolean }> {
    try {
      // Fetch messages for this conversation
      const { data: messages, error: msgError } = await supabase
        .from('messages')
        .select('id, content, sender_role, timestamp, cards_list')
        .eq('conversation_id', conv.id)
        .order('timestamp', { ascending: true });

      if (msgError || !messages || messages.length === 0) {
        return { success: false, transferred: false };
      }

      // Analyze the conversation
      const analysis = await analyzeConversation(messages as Message[]);
      
      // Save to database
      const saved = await saveAnalysisToDatabase(conv.id, analysis);
      
      return { success: saved, transferred: analysis.wasTransferredToAgent };
    } catch (error) {
      return { success: false, transferred: false };
    }
  }

  // Process in batches of CONCURRENCY
  for (let i = 0; i < conversations.length; i += CONCURRENCY) {
    const batch = conversations.slice(i, i + CONCURRENCY);
    const startTime = Date.now();
    
    // Process batch in parallel
    const results = await Promise.all(batch.map(conv => processOne(conv)));
    
    // Count results
    for (const result of results) {
      if (result.success) {
        processed++;
        if (result.transferred) {
          transferred++;
        }
      } else {
        failed++;
      }
    }

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    const total = processed + failed;
    const remaining = conversations.length - total;
    const eta = remaining > 0 ? Math.round((remaining / CONCURRENCY) * parseFloat(elapsed) / 60) : 0;
    
    console.log(`✅ Batch ${Math.floor(i / CONCURRENCY) + 1}: ${total}/${conversations.length} done (${elapsed}s) | ETA: ~${eta} min | Transfers: ${transferred}`);
    
    // Small delay between batches to avoid rate limits
    if (i + CONCURRENCY < conversations.length) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  console.log('\n');
  console.log('═'.repeat(50));
  console.log('🎉 Analysis Complete!');
  console.log(`   ✅ Processed: ${processed}`);
  console.log(`   ❌ Failed: ${failed}`);
  console.log(`   🔄 Transferred to Agent: ${transferred}`);
  console.log('═'.repeat(50));
}

main().catch(console.error);
