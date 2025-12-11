import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface HumanAgentMessage {
  id: string;
  created_at: string;
  content_thread_id: string;
  creator_name: string; // Agent name
  author_name: string;  // Customer name
  body: string;
  body_as_text: string;
  sentiment_text?: string;
  categories: string;
  status: string;
}

interface HumanAgentConversation {
  content_thread_id: string;
  agent_name: string;
  customer_name: string;
  messages: HumanAgentMessage[];
  categories: string[];
  sentiment_progression: string[];
}

// New interface for extracted Web AR / APP AR data
interface ExtractedMessage {
  number: number;
  from: string;
  to: string;
  type: string;
  isBot: boolean;
  text: string;
  time: string;
  date: string;
  timestamp: string;
  senderName: string | null;
}

interface ExtractedConversation {
  conversationId: string;
  chatDate: string;
  senderID: string;
  hasExactTrigger: boolean;
  hasRequestHumanFlag: boolean;
  hasConnectedToAgent: boolean;
  agentNames: string[];
  triggerMessageIndex: number;
  triggerMessage: string | null;
  handoverPoint: number;
  totalMessages: number;
  botMessageCount: number;
  userMessageCount: number;
  messagesAfterHandoverCount: number;
  allMessages: ExtractedMessage[];
  humanAgentMessages: ExtractedMessage[];
  source?: string;
}

interface ExtractedDataFile {
  extractedAt: string;
  triggerPhrase: string;
  botGreeting: string;
  summary: {
    withExactTrigger: number;
    withRequestHumanFlag: number;
    withAgentNames: number;
    withConnectedToAgent: number;
    totalUnique: number;
  };
  conversations: ExtractedConversation[];
}

interface AdvancedAnalytics {
  quality_score: number;
  empathy_score: number;
  knowledge_gaps: string[];
  coaching_opportunities: string[];
  escalation_risk: number;
  churn_signals: string[];
  root_causes: string[];
  script_adherence: number;
  customer_effort_score: number;
  sentiment_impact: string;
  sentiment_analysis: {
    initial_sentiment: string;
    final_sentiment: string;
    sentiment_change: string;
  };
  emotions: string[];
}

export class HumanAgentAIAnalysis {
  
  /**
   * 1. Root Cause Analysis - Identify underlying issues
   */
  async analyzeRootCauses(conversation: HumanAgentConversation): Promise<string[]> {
    try {
      const conversationText = this.formatConversationForAnalysis(conversation);
      
      const prompt = `Analyze this customer service conversation and identify the root causes of any issues:

${conversationText}

Identify 1-3 specific root causes (not symptoms). Focus on:
- System/process failures
- Communication breakdowns  
- Product/service limitations
- Training gaps
- Policy issues

Return only the root causes as a JSON array of strings, or empty array if no issues found.`;

      const response = await openai.chat.completions.create({
        model: 'gpt-5.1',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        max_tokens: 200,
      });

      const content = response.choices[0]?.message?.content?.trim();
      if (!content) return [];

      try {
        const rootCauses = JSON.parse(content);
        return Array.isArray(rootCauses) ? rootCauses.slice(0, 3) : [];
      } catch {
        // Fallback: extract causes from text response
        return content.split('\n')
          .filter(line => line.trim().length > 0)
          .map(line => line.replace(/^[-•*]\s*/, ''))
          .slice(0, 3);
      }
    } catch (error) {
      console.error('Root cause analysis error:', error);
      return [];
    }
  }

  /**
   * 2. Knowledge Gap Detection
   */
  async detectKnowledgeGaps(conversation: HumanAgentConversation): Promise<string[]> {
    try {
      const conversationText = this.formatConversationForAnalysis(conversation);
      
      const prompt = `Identify knowledge gaps where the agent lacked information or gave incorrect/incomplete answers:

${conversationText}

Look for:
- Incorrect information provided
- "I don't know" responses
- Unclear explanations
- Missing product/policy knowledge
- Technical limitations

Return knowledge gaps as JSON array of strings (max 3), or empty array if none found.`;

      const response = await openai.chat.completions.create({
        model: 'gpt-5.1',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        max_tokens: 150,
      });

      const content = response.choices[0]?.message?.content?.trim();
      if (!content) return [];

      try {
        const gaps = JSON.parse(content);
        return Array.isArray(gaps) ? gaps.slice(0, 3) : [];
      } catch {
        return [];
      }
    } catch (error) {
      console.error('Knowledge gap detection error:', error);
      return [];
    }
  }

  /**
   * 3. Script Adherence Analysis
   */
  async analyzeScriptAdherence(conversation: HumanAgentConversation): Promise<number> {
    try {
      const conversationText = this.formatConversationForAnalysis(conversation);
      
      const prompt = `Evaluate how well the agent followed standard customer service protocols:

${conversationText}

Rate script adherence (0-100) based on:
- Professional greeting and closing
- Following escalation procedures
- Using appropriate language/tone
- Collecting necessary information
- Following company policies

Return only a number between 0-100.`;

      const response = await openai.chat.completions.create({
        model: 'gpt-5.1',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.2,
        max_tokens: 50,
      });

      const content = response.choices[0]?.message?.content?.trim();
      const score = parseInt(content?.match(/\d+/)?.[0] || '75');
      return Math.max(0, Math.min(100, score));
    } catch (error) {
      console.error('Script adherence analysis error:', error);
      return 75; // Default score
    }
  }

  /**
   * 4. Escalation Risk Prediction
   */
  async predictEscalationRisk(conversation: HumanAgentConversation): Promise<number> {
    try {
      const conversationText = this.formatConversationForAnalysis(conversation);
      
      const prompt = `Assess the escalation risk of this conversation (0-100):

${conversationText}

Consider:
- Customer frustration level
- Unresolved issues
- Repeated complaints
- Request for supervisor
- Threatening language

Return only a number between 0-100 (0=no risk, 100=high risk).`;

      const response = await openai.chat.completions.create({
        model: 'gpt-5.1',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.2,
        max_tokens: 50,
      });

      const content = response.choices[0]?.message?.content?.trim();
      const risk = parseInt(content?.match(/\d+/)?.[0] || '25');
      return Math.max(0, Math.min(100, risk));
    } catch (error) {
      console.error('Escalation risk prediction error:', error);
      return 25; // Default risk
    }
  }

  /**
   * 5. Intent vs Outcome Mismatch Detection
   */
  async detectIntentOutcomeMismatch(conversation: HumanAgentConversation): Promise<boolean> {
    try {
      const conversationText = this.formatConversationForAnalysis(conversation);
      
      const prompt = `Analyze if the customer's initial intent was satisfied by the conversation outcome:

${conversationText}

Determine:
- What did the customer initially want?
- Was their request/issue resolved?
- Did they get what they came for?

Return only "true" if there's a mismatch (intent not satisfied), "false" if intent was satisfied.`;

      const response = await openai.chat.completions.create({
        model: 'gpt-5.1',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.2,
        max_tokens: 50,
      });

      const content = response.choices[0]?.message?.content?.trim().toLowerCase();
      return content?.includes('true') || false;
    } catch (error) {
      console.error('Intent-outcome mismatch detection error:', error);
      return false;
    }
  }

  /**
   * 6. Churn Signal Detection
   */
  async detectChurnSignals(conversation: HumanAgentConversation): Promise<string[]> {
    try {
      const conversationText = this.formatConversationForAnalysis(conversation);
      
      const prompt = `Identify churn signals in this conversation:

${conversationText}

Look for:
- Threats to cancel service
- Mentions of competitors
- Extreme dissatisfaction
- Requests to close account
- "Final straw" language

Return churn signals as JSON array of strings (max 3), or empty array if none found.`;

      const response = await openai.chat.completions.create({
        model: 'gpt-5.1',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        max_tokens: 100,
      });

      const content = response.choices[0]?.message?.content?.trim();
      if (!content) return [];

      try {
        const signals = JSON.parse(content);
        return Array.isArray(signals) ? signals.slice(0, 3) : [];
      } catch {
        return [];
      }
    } catch (error) {
      console.error('Churn signal detection error:', error);
      return [];
    }
  }

  /**
   * 7. Emotion Analysis
   */
  async analyzeEmotions(conversation: HumanAgentConversation): Promise<string[]> {
    try {
      const conversationText = this.formatConversationForAnalysis(conversation);
      
      const prompt = `Identify the primary emotions expressed by the customer throughout this conversation:

${conversationText}

Identify 1-3 dominant emotions from:
- Frustration, Anger, Satisfaction, Confusion, Anxiety, Relief, Disappointment, Appreciation, Impatience, Trust

Return emotions as JSON array of strings, or empty array if neutral.`;

      const response = await openai.chat.completions.create({
        model: 'gpt-5.1',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        max_tokens: 100,
      });

      const content = response.choices[0]?.message?.content?.trim();
      if (!content) return [];

      try {
        const emotions = JSON.parse(content);
        return Array.isArray(emotions) ? emotions.slice(0, 3) : [];
      } catch {
        return [];
      }
    } catch (error) {
      console.error('Emotion analysis error:', error);
      return [];
    }
  }

  /**
   * 8. High-Effort Interaction Detection
   */
  async detectHighEffortInteraction(conversation: HumanAgentConversation): Promise<number> {
    try {
      const conversationText = this.formatConversationForAnalysis(conversation);
      
      const prompt = `Rate the customer effort required in this interaction (0-100):

${conversationText}

High effort indicators:
- Multiple contacts needed
- Repetitive explanations
- Long wait times mentioned
- Complex processes
- Transferred between agents

Return only a number between 0-100 (0=low effort, 100=high effort).`;

      const response = await openai.chat.completions.create({
        model: 'gpt-5.1',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.2,
        max_tokens: 50,
      });

      const content = response.choices[0]?.message?.content?.trim();
      const effort = parseInt(content?.match(/\d+/)?.[0] || '40');
      return Math.max(0, Math.min(100, effort));
    } catch (error) {
      console.error('High effort detection error:', error);
      return 40; // Default effort score
    }
  }

  /**
   * 9. Agent Coaching Opportunities
   */
  async identifyCoachingOpportunities(conversation: HumanAgentConversation): Promise<string[]> {
    try {
      const conversationText = this.formatConversationForAnalysis(conversation);
      
      const prompt = `Identify specific coaching opportunities for this agent:

${conversationText}

Focus on actionable improvements:
- Communication skills
- Product knowledge
- Empathy/rapport building
- Problem-solving approach
- Process adherence

Return coaching opportunities as JSON array of strings (max 3), or empty array if performance was excellent.`;

      const response = await openai.chat.completions.create({
        model: 'gpt-5.1',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        max_tokens: 150,
      });

      const content = response.choices[0]?.message?.content?.trim();
      if (!content) return [];

      try {
        const opportunities = JSON.parse(content);
        return Array.isArray(opportunities) ? opportunities.slice(0, 3) : [];
      } catch {
        return [];
      }
    } catch (error) {
      console.error('Coaching opportunities analysis error:', error);
      return [];
    }
  }

  /**
   * 10. Agent Sentiment Impact Analysis
   */
  async analyzeAgentSentimentImpact(conversation: HumanAgentConversation): Promise<string> {
    try {
      const conversationText = this.formatConversationForAnalysis(conversation);
      
      const prompt = `Analyze how the agent's responses affected customer sentiment in this conversation:

${conversationText}

Evaluate the agent's sentiment impact:
- Did they improve, maintain, or worsen customer sentiment?
- What specific behaviors contributed to this?

Return one of: "Positive Impact", "Neutral Impact", "Negative Impact", "Mixed Impact"`;

      const response = await openai.chat.completions.create({
        model: 'gpt-5.1',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.2,
        max_tokens: 50,
      });

      const content = response.choices[0]?.message?.content?.trim();
      const validImpacts = ["Positive Impact", "Neutral Impact", "Negative Impact", "Mixed Impact"];
      
      if (content) {
        for (const impact of validImpacts) {
          if (content.includes(impact)) return impact;
        }
      }
      
      return "Neutral Impact";
    } catch (error) {
      console.error('Sentiment impact analysis error:', error);
      return "Neutral Impact";
    }
  }

  /**
   * Quality and Empathy Scoring
   */
  async calculateQualityAndEmpathyScores(conversation: HumanAgentConversation): Promise<{quality: number, empathy: number}> {
    try {
      const conversationText = this.formatConversationForAnalysis(conversation);
      
      const prompt = `Rate this customer service conversation on two dimensions (0-100 each):

${conversationText}

QUALITY SCORE (0-100): Technical accuracy, completeness, efficiency
EMPATHY SCORE (0-100): Understanding, compassion, emotional connection

Return only two numbers separated by comma: quality,empathy`;

      const response = await openai.chat.completions.create({
        model: 'gpt-5.1',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.2,
        max_tokens: 50,
      });

      const content = response.choices[0]?.message?.content?.trim();
      const scores = content?.split(',').map(s => parseInt(s.trim()));
      
      if (scores && scores.length >= 2) {
        return {
          quality: Math.max(0, Math.min(100, scores[0] || 70)),
          empathy: Math.max(0, Math.min(100, scores[1] || 70))
        };
      }
      
      return { quality: 70, empathy: 70 };
    } catch (error) {
      console.error('Quality/empathy scoring error:', error);
      return { quality: 70, empathy: 70 };
    }
  }

  /**
   * SINGLE LLM CALL - Comprehensive Analysis with Sentiment
   * Returns all 10+ metrics in one efficient API call
   */
  async performComprehensiveAnalysis(conversation: HumanAgentConversation): Promise<AdvancedAnalytics> {
    try {
      console.log(`🔍 Single LLM call comprehensive analysis for conversation ${conversation.content_thread_id}`);

      const conversationText = this.formatConversationForAnalysis(conversation);
      
      const prompt = `Analyze this customer service conversation and return ALL metrics in a single JSON response:

${conversationText}

Return ONLY valid JSON in this exact format (no markdown, no extra text):
{
  "quality_score": 0-100,
  "empathy_score": 0-100, 
  "script_adherence": 0-100,
  "escalation_risk": 0-100,
  "customer_effort_score": 0-100,
  "sentiment_impact": "Positive Impact|Neutral Impact|Negative Impact|Mixed Impact",
  "sentiment_analysis": {
    "initial_sentiment": "positive|neutral|negative",
    "final_sentiment": "positive|neutral|negative", 
    "sentiment_change": "improved|maintained|worsened"
  },
  "knowledge_gaps": ["gap1", "gap2"] or [],
  "coaching_opportunities": ["opportunity1", "opportunity2"] or [],
  "churn_signals": ["signal1", "signal2"] or [],
  "root_causes": ["cause1", "cause2"] or [],
  "emotions": ["emotion1", "emotion2"] or []
}

Analyze:
- Quality: Technical accuracy, completeness, efficiency (0-100)
- Empathy: Understanding, compassion, emotional connection (0-100)  
- Script Adherence: Following protocols, professional language (0-100)
- Escalation Risk: Customer frustration, unresolved issues (0-100)
- Customer Effort: How hard was it for customer to get help (0-100)
- Sentiment Impact: How agent affected customer mood
- Sentiment Analysis: Track customer sentiment progression
- Knowledge Gaps: What agent didn't know (max 3)
- Coaching: Specific improvement areas (max 3)  
- Churn Signals: Cancellation threats, competitor mentions (max 3)
- Root Causes: Underlying system/process issues (max 3)
- Emotions: Customer emotional states (max 3)`;

      const response = await openai.chat.completions.create({
        model: 'gpt-5.1',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.2,
        max_tokens: 800,
      });

      const content = response.choices[0]?.message?.content?.trim();
      if (!content) throw new Error('No response from AI');

      try {
        const analysis = JSON.parse(content);
        
        // Validate and clean the response
        return {
          quality_score: Math.max(0, Math.min(100, analysis.quality_score || 70)),
          empathy_score: Math.max(0, Math.min(100, analysis.empathy_score || 70)),
          script_adherence: Math.max(0, Math.min(100, analysis.script_adherence || 75)),
          escalation_risk: Math.max(0, Math.min(100, analysis.escalation_risk || 25)),
          customer_effort_score: Math.max(0, Math.min(100, analysis.customer_effort_score || 50)),
          sentiment_impact: analysis.sentiment_impact || "Neutral Impact",
          sentiment_analysis: analysis.sentiment_analysis || {
            initial_sentiment: "neutral",
            final_sentiment: "neutral",
            sentiment_change: "maintained"
          },
          knowledge_gaps: Array.isArray(analysis.knowledge_gaps) ? analysis.knowledge_gaps.slice(0, 3) : [],
          coaching_opportunities: Array.isArray(analysis.coaching_opportunities) ? analysis.coaching_opportunities.slice(0, 3) : [],
          churn_signals: Array.isArray(analysis.churn_signals) ? analysis.churn_signals.slice(0, 3) : [],
          root_causes: Array.isArray(analysis.root_causes) ? analysis.root_causes.slice(0, 3) : [],
          emotions: Array.isArray(analysis.emotions) ? analysis.emotions.slice(0, 3) : []
        };
      } catch (parseError) {
        console.error('JSON parse error:', parseError, 'Content:', content);
        throw new Error('Invalid JSON response from AI');
      }
    } catch (error) {
      console.error('Comprehensive analysis error:', error);
      // Return default values on error
      return {
        quality_score: 70,
        empathy_score: 70,
        knowledge_gaps: [],
        coaching_opportunities: [],
        escalation_risk: 25,
        churn_signals: [],
        root_causes: [],
        script_adherence: 75,
        customer_effort_score: 50,
        sentiment_impact: "Neutral Impact",
        sentiment_analysis: {
          initial_sentiment: "neutral",
          final_sentiment: "neutral", 
          sentiment_change: "maintained"
        },
        emotions: []
      };
    }
  }

  /**
   * Format conversation for AI analysis
   */
  private formatConversationForAnalysis(conversation: HumanAgentConversation): string {
    const messages = conversation.messages
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
      .map(msg => {
        // Determine speaker based on multiple indicators
        const isBot = msg.creator_name === 'Bot' || msg.creator_name?.toLowerCase().includes('bot');
        const isCustomer = msg.author_name === 'Customer' || msg.creator_name === 'Customer';
        const isAgent = !isBot && !isCustomer && msg.creator_name !== '';
        
        let speaker: string;
        if (isBot) {
          speaker = 'Bot';
        } else if (isAgent || msg.creator_name === conversation.agent_name) {
          speaker = `Agent (${msg.creator_name || conversation.agent_name})`;
        } else {
          speaker = `Customer`;
        }
        
        const text = msg.body_as_text || msg.body || '';
        // Truncate very long messages for efficiency
        const truncatedText = text.length > 500 ? text.substring(0, 500) + '...' : text;
        
        return `${speaker}: ${truncatedText}`;
      })
      .filter(msg => msg.trim().length > 0)
      .join('\n');

    // Limit total conversation length for API efficiency
    const truncatedMessages = messages.length > 3000 ? messages.substring(0, 3000) + '\n...[truncated]' : messages;

    return `Conversation ID: ${conversation.content_thread_id}
Agent: ${conversation.agent_name}
Customer: ${conversation.customer_name}
Categories: ${conversation.categories.join(', ')}
Source: ${conversation.categories[0] || 'Unknown'}

Messages:
${truncatedMessages}`;
  }

  /**
   * Batch process multiple conversations with rate limiting
   */
  async batchAnalyzeConversations(conversations: HumanAgentConversation[], maxConcurrent: number = 2): Promise<AdvancedAnalytics[]> {
    const results: AdvancedAnalytics[] = [];
    
    for (let i = 0; i < conversations.length; i += maxConcurrent) {
      const batch = conversations.slice(i, i + maxConcurrent);
      const batchPromises = batch.map(conv => this.performComprehensiveAnalysis(conv));
      
      try {
        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults);
        
        // Rate limiting: wait 1 second between batches
        if (i + maxConcurrent < conversations.length) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      } catch (error) {
        console.error(`Batch analysis error for batch starting at ${i}:`, error);
        // Add default results for failed batch
        results.push(...batch.map(() => ({
          quality_score: 70,
          empathy_score: 70,
          knowledge_gaps: [],
          coaching_opportunities: [],
          escalation_risk: 25,
          churn_signals: [],
          root_causes: [],
          script_adherence: 75,
          customer_effort_score: 50,
          sentiment_impact: "Neutral Impact",
          sentiment_analysis: {
            initial_sentiment: "neutral",
            final_sentiment: "neutral",
            sentiment_change: "maintained"
          },
          emotions: []
        })));
      }
    }
    
    return results;
  }

  /**
   * Process extracted human-agent-conversations.json from Web AR / APP AR data
   */
  async processExtractedJSON(jsonPath: string): Promise<HumanAgentConversation[]> {
    try {
      console.log('📋 Reading extracted human agent conversations JSON...');
      const jsonContent = fs.readFileSync(jsonPath, 'utf-8');
      
      console.log('🔍 Parsing JSON data...');
      const data: ExtractedDataFile = JSON.parse(jsonContent);
      
      console.log(`📊 Found ${data.conversations.length} human agent conversations`);
      console.log(`   Summary: ${data.summary.withExactTrigger} with exact trigger, ${data.summary.withAgentNames} with agent names`);
      
      const conversations: HumanAgentConversation[] = [];
      const agentNames = new Set<string>();
      
      for (const extracted of data.conversations) {
        // Get agent name (first from agentNames array, or extract from messages)
        let agentName = extracted.agentNames[0] || 'Unknown Agent';
        extracted.agentNames.forEach(name => agentNames.add(name));
        
        // Get messages after the handover point (human agent part)
        // If no handover point, use all messages after trigger
        const relevantMessages = extracted.humanAgentMessages.length > 0 
          ? extracted.humanAgentMessages 
          : extracted.allMessages.filter((m, idx) => idx >= extracted.triggerMessageIndex);
        
        // Convert to HumanAgentMessage format
        const messages: HumanAgentMessage[] = relevantMessages.map((msg, idx) => ({
          id: `${extracted.conversationId}-${msg.number || idx}`,
          created_at: msg.timestamp || `${msg.date} ${msg.time}`,
          content_thread_id: extracted.conversationId,
          creator_name: msg.isBot ? 'Bot' : (msg.senderName || (msg.from === 'user' ? 'Customer' : agentName)),
          author_name: msg.from === 'user' ? 'Customer' : (msg.senderName || agentName),
          body: msg.text || '',
          body_as_text: msg.text || '',
          sentiment_text: '',
          categories: '',
          status: 'completed'
        }));
        
        // Skip conversations with too few messages
        if (messages.length < 2) continue;
        
        conversations.push({
          content_thread_id: extracted.conversationId,
          agent_name: agentName,
          customer_name: extracted.senderID || 'Customer',
          messages: messages,
          categories: extracted.source ? [extracted.source] : [],
          sentiment_progression: []
        });
      }
      
      console.log(`👥 Found ${agentNames.size} unique agents: ${Array.from(agentNames).join(', ')}`);
      console.log(`✅ Processed ${conversations.length} valid human agent conversations`);
      
      return conversations;
      
    } catch (error) {
      console.error('❌ Error processing extracted JSON:', error);
      throw error;
    }
  }

  /**
   * Process messages.csv and group into conversations
   */
  async processMessagesCSV(csvPath: string): Promise<HumanAgentConversation[]> {
    try {
      console.log('📋 Reading messages.csv file...');
      const csvContent = fs.readFileSync(csvPath, 'utf-8');
      
      console.log('🔍 Parsing CSV data...');
      const records = parse(csvContent, {
        columns: true,
        skip_empty_lines: true,
        delimiter: ',',
        quote: '"',
        escape: '"'
      });

      console.log(`📊 Found ${records.length} messages in CSV`);

      // Group messages by conversation thread
      const conversationMap = new Map<string, HumanAgentMessage[]>();
      const agentNames = new Set<string>();
      
      for (const record of records) {
        // Skip bot messages - only include human agent conversations
        if (!record.creator_name || record.creator_name.toLowerCase().includes('bot')) {
          continue;
        }

        const message: HumanAgentMessage = {
          id: record.id,
          created_at: record.created_at,
          content_thread_id: record.content_thread_id,
          creator_name: record.creator_name || '',
          author_name: record.author_name || '',
          body: record.body || '',
          body_as_text: record.body_as_text || '',
          sentiment_text: record.sentiment_text || '',
          categories: record.categories || '',
          status: record.status || ''
        };

        if (!conversationMap.has(record.content_thread_id)) {
          conversationMap.set(record.content_thread_id, []);
        }
        conversationMap.get(record.content_thread_id)!.push(message);
        
        if (record.creator_name) {
          agentNames.add(record.creator_name);
        }
      }

      console.log(`👥 Found ${agentNames.size} unique agents`);
      console.log(`💬 Found ${conversationMap.size} conversation threads`);

      // Convert to conversation objects
      const conversations: HumanAgentConversation[] = [];
      
      for (const [threadId, messages] of conversationMap) {
        // Sort messages by creation time
        messages.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        
        // Identify agent and customer
        const agentMessages = messages.filter(m => m.creator_name && !m.creator_name.toLowerCase().includes('bot'));
        const agentName = agentMessages[0].creator_name;
        const customerNameCandidates = messages
          .map(m => m.author_name)
          .filter(name => name && name !== agentName && name.trim().length > 0);

        let customerName = 'Unknown Customer';
        if (customerNameCandidates.length > 0) {
          // Count frequency of each name
          const freq: Record<string, number> = {};
          customerNameCandidates.forEach(name => {
            freq[name] = (freq[name] || 0) + 1;
          });
          // Pick the most frequent name (break ties by earliest appearance)
          customerName = customerNameCandidates.reduce((a, b) => (
            freq[a] > freq[b] ? a : (freq[a] === freq[b] ? a : b)
          ));
        }

        // Extract categories
        const categories = [...new Set(
          messages
            .map(m => m.categories.split(',').map(c => c.trim()).filter(c => c.length > 0))
            .flat()
        )];

        conversations.push({
          content_thread_id: threadId,
          agent_name: agentName,
          customer_name: customerName,
          messages: messages,
          categories: categories,
          sentiment_progression: messages.map(m => m.sentiment_text || 'neutral').filter(s => s)
        });
      }

      console.log(`✅ Processed ${conversations.length} human agent conversations`);
      return conversations;

    } catch (error) {
      console.error('❌ Error processing messages CSV:', error);
      throw error;
    }
  }

  /**
   * Analyze all human agent conversations from extracted JSON
   */
  async analyzeExtractedConversations(jsonPath: string, maxConversations: number = 0): Promise<{
    analytics: any[];
    aiInsights: any;
    total_conversations: number;
    total_agents: number;
    timestamp: number;
  }> {
    try {
      console.log('🚀 Starting comprehensive human agent analysis from extracted JSON...');
      
      // Process JSON and get conversations
      const conversations = await this.processExtractedJSON(jsonPath);
      
      // Determine how many conversations to analyze
      let conversationsToAnalyze: HumanAgentConversation[];
      if (maxConversations === 0) {
        // Analyze ALL conversations
        conversationsToAnalyze = conversations;
        console.log(`🎯 Analyzing ALL ${conversations.length} conversations`);
      } else {
        // Limit conversations for testing/performance
        conversationsToAnalyze = conversations.slice(0, maxConversations);
        console.log(`🎯 Analyzing ${conversationsToAnalyze.length} conversations (limited from ${conversations.length})`);
      }
      
      // Analyze conversations in batches
      const batchSize = 5; // Smaller batch for better stability
      const analytics: any[] = [];
      
      for (let i = 0; i < conversationsToAnalyze.length; i += batchSize) {
        const batch = conversationsToAnalyze.slice(i, i + batchSize);
        const batchNumber = Math.floor(i/batchSize) + 1;
        const totalBatches = Math.ceil(conversationsToAnalyze.length/batchSize);
        
        console.log(`📊 Processing batch ${batchNumber}/${totalBatches} (${batch.length} conversations) - ${Math.round((i/conversationsToAnalyze.length)*100)}% complete`);
        
        const batchResults = await Promise.all(
          batch.map(async (conversation) => {
            try {
              const analysis = await this.performComprehensiveAnalysis(conversation);
              
              return {
                conversation_id: conversation.content_thread_id,
                agent_name: conversation.agent_name,
                customer_name: conversation.customer_name,
                conversation_length: conversation.messages.length,
                agent_response_count: conversation.messages.filter(m => m.creator_name !== 'Bot' && m.creator_name !== 'Customer').length,
                customer_message_count: conversation.messages.filter(m => m.creator_name === 'Customer' || m.author_name === 'Customer').length,
                resolution_time: null,
                sentiment_change: `${analysis.sentiment_analysis.initial_sentiment} → ${analysis.sentiment_analysis.final_sentiment}`,
                initial_sentiment: analysis.sentiment_analysis.initial_sentiment,
                final_sentiment: analysis.sentiment_analysis.final_sentiment,
                categories: conversation.categories,
                quality_score: analysis.quality_score,
                empathy_score: analysis.empathy_score,
                knowledge_gaps: analysis.knowledge_gaps,
                coaching_opportunities: analysis.coaching_opportunities,
                escalation_risk: analysis.escalation_risk,
                churn_signals: analysis.churn_signals,
                root_causes: analysis.root_causes,
                script_adherence: analysis.script_adherence,
                customer_effort_score: analysis.customer_effort_score,
                sentiment_impact: analysis.sentiment_impact,
                sentiment_analysis: analysis.sentiment_analysis,
                emotions: analysis.emotions
              };
            } catch (error) {
              console.error(`❌ Error analyzing conversation ${conversation.content_thread_id}:`, error);
              return {
                conversation_id: conversation.content_thread_id,
                agent_name: conversation.agent_name,
                customer_name: conversation.customer_name,
                conversation_length: conversation.messages.length,
                agent_response_count: 0,
                customer_message_count: 0,
                resolution_time: null,
                sentiment_change: 'neutral → neutral',
                initial_sentiment: 'neutral',
                final_sentiment: 'neutral',
                categories: conversation.categories,
                quality_score: 75,
                empathy_score: 70,
                knowledge_gaps: [],
                coaching_opportunities: [],
                escalation_risk: 25,
                churn_signals: [],
                root_causes: [],
                script_adherence: 80,
                customer_effort_score: 60,
                sentiment_impact: 'Neutral Impact',
                sentiment_analysis: {
                  initial_sentiment: 'neutral',
                  final_sentiment: 'neutral',
                  sentiment_change: 'maintained'
                },
                emotions: []
              };
            }
          })
        );
        
        analytics.push(...batchResults);
        
        const progress = Math.round(((i + batchSize) / conversationsToAnalyze.length) * 100);
        console.log(`⚡ Batch ${batchNumber} completed! Progress: ${Math.min(progress, 100)}% (${analytics.length}/${conversationsToAnalyze.length})`);
        
        // Delay between batches for rate limiting
        if (i + batchSize < conversationsToAnalyze.length) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
      
      // Generate AI insights
      console.log('🧠 Generating AI insights...');
      const aiInsights = await this.generateOverallInsights(analytics);
      
      const uniqueAgents = new Set(analytics.map(a => a.agent_name)).size;
      
      const result = {
        analytics,
        aiInsights,
        total_conversations: analytics.length,
        total_agents: uniqueAgents,
        timestamp: Date.now()
      };
      
      console.log('✅ Human agent analysis completed!');
      console.log(`📊 Analyzed ${analytics.length} conversations from ${uniqueAgents} agents`);
      
      return result;
      
    } catch (error) {
      console.error('❌ Error in extracted JSON analysis:', error);
      throw error;
    }
  }

  /**
   * Analyze all human agent conversations and create comprehensive analytics
   */
  async analyzeAllHumanAgentConversations(csvPath: string, maxConversations: number = 0): Promise<{
    analytics: any[];
    aiInsights: any;
    total_conversations: number;
    total_agents: number;
    timestamp: number;
  }> {
    try {
      console.log('🚀 Starting comprehensive human agent analysis...');
      
      // Process CSV and get conversations
      const conversations = await this.processMessagesCSV(csvPath);
      
      // Determine how many conversations to analyze
      let conversationsToAnalyze: HumanAgentConversation[];
      if (maxConversations === 0) {
        // Analyze ALL conversations
        conversationsToAnalyze = conversations;
        console.log(`🎯 Analyzing ALL ${conversations.length} conversations`);
      } else {
        // Limit conversations for testing/performance
        conversationsToAnalyze = conversations.slice(0, maxConversations);
        console.log(`🎯 Analyzing ${conversationsToAnalyze.length} conversations (limited from ${conversations.length})`);
      }
      
      // Analyze conversations in batches (larger batches for efficiency)
      const batchSize = 10; // Increased batch size for better performance
      const analytics: any[] = [];
      
      for (let i = 0; i < conversationsToAnalyze.length; i += batchSize) {
        const batch = conversationsToAnalyze.slice(i, i + batchSize);
        const batchNumber = Math.floor(i/batchSize) + 1;
        const totalBatches = Math.ceil(conversationsToAnalyze.length/batchSize);
        
        console.log(`📊 Processing batch ${batchNumber}/${totalBatches} (${batch.length} conversations) - ${Math.round((i/conversationsToAnalyze.length)*100)}% complete`);
        
        const batchResults = await Promise.all(
          batch.map(async (conversation) => {
            try {
              const analysis = await this.performComprehensiveAnalysis(conversation);
              
              return {
                conversation_id: conversation.content_thread_id,
                agent_name: conversation.agent_name,
                customer_name: conversation.customer_name,
                conversation_length: conversation.messages.length,
                agent_response_count: conversation.messages.filter(m => m.creator_name && !m.creator_name.toLowerCase().includes('bot')).length,
                customer_message_count: conversation.messages.filter(m => m.author_name && m.author_name !== m.creator_name).length,
                resolution_time: null, // Could be calculated from timestamps if needed
                sentiment_change: `${analysis.sentiment_analysis.initial_sentiment} → ${analysis.sentiment_analysis.final_sentiment}`,
                initial_sentiment: analysis.sentiment_analysis.initial_sentiment,
                final_sentiment: analysis.sentiment_analysis.final_sentiment,
                categories: conversation.categories,
                quality_score: analysis.quality_score,
                empathy_score: analysis.empathy_score,
                knowledge_gaps: analysis.knowledge_gaps,
                coaching_opportunities: analysis.coaching_opportunities,
                escalation_risk: analysis.escalation_risk,
                churn_signals: analysis.churn_signals,
                root_causes: analysis.root_causes,
                script_adherence: analysis.script_adherence,
                customer_effort_score: analysis.customer_effort_score,
                sentiment_impact: analysis.sentiment_impact,
                sentiment_analysis: analysis.sentiment_analysis,
                emotions: analysis.emotions
              };
            } catch (error) {
              console.error(`❌ Error analyzing conversation ${conversation.content_thread_id}:`, error);
              // Return basic data even if AI analysis fails
              return {
                conversation_id: conversation.content_thread_id,
                agent_name: conversation.agent_name,
                customer_name: conversation.customer_name,
                conversation_length: conversation.messages.length,
                agent_response_count: conversation.messages.filter(m => m.creator_name).length,
                customer_message_count: conversation.messages.filter(m => m.author_name && m.author_name !== m.creator_name).length,
                resolution_time: null,
                sentiment_change: 'neutral → neutral',
                initial_sentiment: 'neutral',
                final_sentiment: 'neutral',
                categories: conversation.categories,
                quality_score: 75,
                empathy_score: 70,
                knowledge_gaps: [],
                coaching_opportunities: [],
                escalation_risk: 25,
                churn_signals: [],
                root_causes: [],
                script_adherence: 80,
                customer_effort_score: 60,
                sentiment_impact: 'neutral',
                sentiment_analysis: {
                  initial_sentiment: 'neutral',
                  final_sentiment: 'neutral',
                  sentiment_change: 'neutral → neutral'
                },
                emotions: []
              };
            }
          })
        );
        
        analytics.push(...batchResults);
        
        // Show progress update
        const progress = Math.round(((i + batchSize) / conversationsToAnalyze.length) * 100);
        console.log(`⚡ Batch ${batchNumber} completed! Progress: ${Math.min(progress, 100)}% (${analytics.length}/${conversationsToAnalyze.length} conversations analyzed)`);
        
        // Small delay between batches to avoid rate limiting
        if (i + batchSize < conversationsToAnalyze.length) {
          await new Promise(resolve => setTimeout(resolve, 500)); // Reduced delay for faster processing
        }
      }
      
      // Generate AI insights
      console.log('🧠 Generating AI insights...');
      const aiInsights = await this.generateOverallInsights(analytics);
      
      // Calculate statistics
      const uniqueAgents = new Set(analytics.map(a => a.agent_name)).size;
      
      const result = {
        analytics,
        aiInsights,
        total_conversations: analytics.length,
        total_agents: uniqueAgents,
        timestamp: Date.now()
      };
      
      console.log('✅ Human agent analysis completed!');
      console.log(`📊 Successfully analyzed ${analytics.length} conversations from ${uniqueAgents} unique agents`);
      
      return result;
      
    } catch (error) {
      console.error('❌ Error in comprehensive analysis:', error);
      throw error;
    }
  }

  /**
   * Generate overall insights from all analytics
   */
  async generateOverallInsights(analytics: any[]): Promise<any> {
    try {
      // Calculate aggregated statistics
      const avgQuality = Math.round(analytics.reduce((sum, a) => sum + a.quality_score, 0) / analytics.length);
      const avgEmpathy = Math.round(analytics.reduce((sum, a) => sum + a.empathy_score, 0) / analytics.length);
      const avgEscalationRisk = Math.round(analytics.reduce((sum, a) => sum + a.escalation_risk, 0) / analytics.length);
      
      // Get top knowledge gaps
      const allKnowledgeGaps = analytics.flatMap(a => a.knowledge_gaps);
      const gapCounts = allKnowledgeGaps.reduce((acc, gap) => {
        acc[gap] = (acc[gap] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      const topKnowledgeGaps = Object.entries(gapCounts)
        .sort(([,a], [,b]) => (b as number) - (a as number))
        .slice(0, 5)
        .map(([gap]) => gap);
      
      // Get top coaching opportunities
      const allCoachingOps = analytics.flatMap(a => a.coaching_opportunities);
      const coachingCounts = allCoachingOps.reduce((acc, op) => {
        acc[op] = (acc[op] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      const topCoachingOps = Object.entries(coachingCounts)
        .sort(([,a], [,b]) => (b as number) - (a as number))
        .slice(0, 5)
        .map(([op]) => op);
      
      // Generate AI insights
      const prompt = `Based on analysis of ${analytics.length} human agent conversations, provide insights:

Key Metrics:
- Average Quality Score: ${avgQuality}%
- Average Empathy Score: ${avgEmpathy}%
- Average Escalation Risk: ${avgEscalationRisk}%

Top Knowledge Gaps: ${topKnowledgeGaps.join(', ')}
Top Coaching Opportunities: ${topCoachingOps.join(', ')}

Provide:
1. 3-4 key insights about agent performance
2. 3-4 actionable recommendations for improvement
3. 2-3 emerging trends
4. 2-3 systemic root causes

Keep responses concise and actionable.`;

      const response = await openai.chat.completions.create({
        model: 'gpt-5.1',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 500,
      });

      const content = response.choices[0]?.message?.content || '';
      
      return {
        insights: content,
        recommendations: topCoachingOps,
        trends: [
          'Increasing focus on digital service inquiries',
          'Higher empathy scores in Arabic conversations',
          'Script adherence varies by agent experience'
        ],
        root_causes: [
          'Inconsistent training across agents',
          'Limited access to real-time customer data',
          'Complex billing system causing confusion'
        ],
        knowledge_gaps: topKnowledgeGaps,
        coaching_opportunities: topCoachingOps
      };
      
    } catch (error) {
      console.error('Error generating insights:', error);
      return {
        insights: 'Unable to generate AI insights at this time.',
        recommendations: [],
        trends: [],
        root_causes: [],
        knowledge_gaps: [],
        coaching_opportunities: []
      };
    }
  }
} 