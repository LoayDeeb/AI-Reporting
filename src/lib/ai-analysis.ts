import { getOpenAIClient } from './openai';
import { Message } from '@/types/conversation';

export class AIAnalysisService {
  private openai;

  constructor() {
    this.openai = getOpenAIClient(); // This will throw if not configured
  }
  
  /**
   * Retry wrapper for OpenAI API calls with exponential backoff
   */
  private async retryApiCall<T>(
    apiCall: () => Promise<T>,
    maxRetries: number = 3,
    baseDelay: number = 1000
  ): Promise<T> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await apiCall();
      } catch (error: any) {
        const isLastAttempt = attempt === maxRetries;
        const isRetryableError = error?.code === 'rate_limit_exceeded' || 
                                error?.message?.includes('timeout') ||
                                error?.message?.includes('Request timed out') ||
                                error?.status === 429;

        if (isLastAttempt || !isRetryableError) {
          throw error;
        }

        // Exponential backoff: 1s, 2s, 4s
        const delay = baseDelay * Math.pow(2, attempt - 1);
        console.log(`API call failed (attempt ${attempt}/${maxRetries}), retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    throw new Error('Max retries exceeded');
  }
  
  /**
   * Helper function to format message content including cards
   */
  private formatMessageContent(message: Message): string {
    let content = '';
    
    // Add message text if available
    if (message.MessageText) {
      content += message.MessageText;
    }
    
    // Add cards information if available
    if (message.CardsList && Array.isArray(message.CardsList) && message.CardsList.length > 0) {
      content += content ? '\n' : '';
      content += '[Cards/Choices presented: ';
      const cardTitles = message.CardsList.map(card => {
        // Extract the actual title without MENU: or CAROUSEL: prefix
        const cleanTitle = card.title?.replace(/^(MENU:|CAROUSEL:)/, '').trim() || '';
        
        // Always prefer the cleaned title over selectName
        // Only use selectName if title is empty and selectName is meaningful
        let displayName = cleanTitle;
        if (!cleanTitle && card.selectName && card.selectName !== 'أختر' && card.selectName.trim() !== '') {
          displayName = card.selectName;
        }
        
        // Fallback if both are empty
        return displayName || 'Option';
      }).join(', ');
      content += cardTitles + ']';
    }
    
    return content.trim();
  }

  /**
   * Helper function to format conversation for AI analysis
   */
  private formatConversationForAI(messages: Message[]): string {
    return messages
      .filter(msg => msg.MessageText || (msg.CardsList && msg.CardsList.length > 0))
      .map(msg => {
        const content = this.formatMessageContent(msg);
        return content ? `${msg.from}: ${content}` : '';
      })
      .filter(line => line.trim())
      .join('\n');
  }
  
  /**
   * Analyze sentiment of a conversation
   */
  async analyzeSentiment(messages: Message[]): Promise<{ sentiment: 'positive' | 'negative' | 'neutral'; score: number }> {
    const userMessages = messages
      .filter(msg => msg.from === 'user')
      .map(msg => this.formatMessageContent(msg))
      .filter(content => content.trim())
      .join(' ');

    if (!userMessages.trim()) {
      return { sentiment: 'neutral', score: 0 };
    }

    try {
      const response = await this.openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are a sentiment analysis expert. Analyze the sentiment of user messages and return ONLY a valid JSON object with 'sentiment' (positive/negative/neutral) and 'score' (-1 to 1). Handle Arabic and English text. Consider both text messages and user choices/selections from menus. Do not include any markdown formatting or code blocks."
          },
          {
            role: "user",
            content: `Analyze the sentiment of these user messages: ${userMessages}`
          }
        ],
        max_tokens: 100,
        temperature: 0.1,
      });

      const result = response.choices[0].message.content;
      // Clean the result to remove any markdown formatting
      const cleanResult = result?.replace(/```json\n?|\n?```/g, '').trim();
      const parsed = JSON.parse(cleanResult || '{"sentiment": "neutral", "score": 0}');
      return {
        sentiment: parsed.sentiment,
        score: parsed.score
      };
    } catch (error) {
      console.error('Sentiment analysis error:', error);
      return { sentiment: 'neutral', score: 0 };
    }
  }

  /**
   * Extract user intents from conversation
   */
  async extractIntents(messages: Message[]): Promise<string[]> {
    const conversationText = this.formatConversationForAI(messages);

    if (!conversationText.trim()) {
      return [];
    }

    try {
      const response = await this.openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are an intent extraction expert. Identify the main intents/purposes in user messages and interactions. Return ONLY a valid JSON array of intent strings. Handle Arabic and English text. Consider both text messages and user menu selections/choices. Common intents include: inquiry, complaint, support_request, information_seeking, booking, payment, navigation, service_selection, etc. Do not include any markdown formatting or code blocks."
          },
          {
            role: "user",
            content: `Extract intents from this conversation including user choices: ${conversationText}`
          }
        ],
        max_tokens: 150,
        temperature: 0.1,
      });

      const result = response.choices[0].message.content;
      if (!result) {
        return [];
      }
      
      // Clean the result to remove any markdown formatting and extra text
      let cleanResult = result.replace(/```json\n?|\n?```/g, '').trim();
      
      // Try to extract JSON from the response if it contains other text
      const jsonMatch = cleanResult.match(/\[.*\]/);
      if (jsonMatch) {
        cleanResult = jsonMatch[0];
      }
      
      // Fallback if not valid JSON array format
      if (!cleanResult.startsWith('[')) {
        // Try to create a simple array from comma-separated values
        const items = cleanResult.split(/[,;\n]/)
          .map(item => item.trim().replace(/['"]/g, ''))
          .filter(item => item.length > 0)
          .slice(0, 5); // Limit to 5 intents
        return items;
      }
      
      const parsed = JSON.parse(cleanResult);
      return Array.isArray(parsed) ? parsed.slice(0, 5) : []; // Limit to 5 intents
    } catch (error) {
      console.error('Intent extraction error:', error);
      // Return empty array on any parsing error
      return [];
    }
  }

  /**
   * Categorize conversations into sub-categories
   */
  async categorizeConversation(messages: Message[]): Promise<string[]> {
    const conversationText = this.formatConversationForAI(messages);

    if (!conversationText.trim()) {
      return [];
    }

    try {
      const response = await this.openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are a conversation categorization expert. Categorize conversations into relevant sub-categories. Return ONLY a valid JSON array of category strings. Handle Arabic and English text. Consider both text messages and user menu selections/card choices. Common categories include: technical_support, billing, general_inquiry, complaint, product_info, account_management, navigation, service_request, etc. Do not include any markdown formatting or code blocks."
          },
          {
            role: "user",
            content: `Categorize this conversation including user interactions: ${conversationText.substring(0, 2000)}`
          }
        ],
        max_tokens: 100,
        temperature: 0.1,
      });

      const result = response.choices[0].message.content;
      if (!result) {
        return [];
      }
      
      // Clean the result to remove any markdown formatting and extra text
      let cleanResult = result.replace(/```json\n?|\n?```/g, '').trim();
      
      // Try to extract JSON from the response if it contains other text
      const jsonMatch = cleanResult.match(/\[.*\]/);
      if (jsonMatch) {
        cleanResult = jsonMatch[0];
      }
      
      // Fallback if not valid JSON array format
      if (!cleanResult.startsWith('[')) {
        // Try to create a simple array from comma-separated values
        const items = cleanResult.split(/[,;\n]/)
          .map(item => item.trim().replace(/['"]/g, ''))
          .filter(item => item.length > 0)
          .slice(0, 5); // Limit to 5 categories
        return items;
      }
      
      const parsed = JSON.parse(cleanResult);
      return Array.isArray(parsed) ? parsed.slice(0, 5) : []; // Limit to 5 categories
    } catch (error) {
      console.error('Categorization error:', error);
      // Return empty array on any parsing error
      return [];
    }
  }

  /**
   * Evaluate if bot answered user's actual question with reasoning
   */
  async evaluateResponseQuality(userMessage: Message, botResponse: Message): Promise<{
    score: number;
    reasoning: string;
  }> {
    const userContent = this.formatMessageContent(userMessage);
    const botContent = this.formatMessageContent(botResponse);
    
    if (!userContent.trim() || !botContent.trim()) {
      return { score: 0, reasoning: 'Empty messages provided' };
    }

    try {
      const response = await this.retryApiCall(() =>
        this.openai.chat.completions.create({
          model: "gpt-4o", 
        messages: [
          {
            role: "system",
            content: "You are a conversation quality evaluator. Evaluate if the bot response adequately addresses the user's question/request. Return ONLY a valid JSON object with 'score' (0-1) where 1 means perfectly addressed and 0 means completely missed the point, and 'reasoning' explaining why you gave this score. Handle Arabic and English text. Consider both text responses and card/menu presentations as valid responses. Do not include any markdown formatting or code blocks."
          },
          {
            role: "user",
            content: `User: ${userContent}\nBot: ${botContent}\n\nEvaluate how well the bot response addresses the user's question and provide reasoning.`
          }
        ],
          max_tokens: 150,
        temperature: 0.1,
        })
      );

      const result = response.choices[0].message.content;
      // Clean the result to remove any markdown formatting
      const cleanResult = result?.replace(/```json\n?|\n?```/g, '').trim();
      const parsed = JSON.parse(cleanResult || '{"score": 0.5, "reasoning": "Unable to evaluate"}');
      return {
        score: Math.max(0, Math.min(1, parsed.score)),
        reasoning: parsed.reasoning || 'No reasoning provided'
      };
    } catch (error) {
      console.error('Quality evaluation error:', error);
      return { score: 0.5, reasoning: 'Error during evaluation' };
    }
  }

  /**
   * Identify knowledge gaps in conversations
   */
  async identifyKnowledgeGaps(messages: Message[]): Promise<string[]> {
    // Find user requests that didn't get adequate responses
    const conversationPairs: string[] = [];
    
    for (let i = 0; i < messages.length - 1; i++) {
      const userMsg = messages[i];
      const nextMsg = messages[i + 1];
      
      if (userMsg.from === 'user' && nextMsg.from === 'bot') {
        const userContent = this.formatMessageContent(userMsg);
        const botContent = this.formatMessageContent(nextMsg);
        
        // Consider it a potential gap if user had content but bot didn't respond meaningfully
        if (userContent.trim() && !botContent.trim()) {
          conversationPairs.push(userContent);
        }
      }
    }

    if (conversationPairs.length === 0) {
      return [];
    }

    try {
      const response = await this.retryApiCall(() =>
        this.openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are a knowledge gap analyzer. Identify what information/topics the chatbot couldn't address based on unanswered user questions or requests. Return ONLY a valid JSON array of knowledge gap descriptions. Handle Arabic and English text. Consider both text messages and menu/card selections. Do not include any markdown formatting or code blocks."
          },
          {
            role: "user",
            content: `Identify knowledge gaps from these unanswered user requests: ${conversationPairs.join('; ')}`
          }
        ],
        temperature: 0.1,
        })
      );

      const result = response.choices[0].message.content;
      // Clean the result to remove any markdown formatting
      const cleanResult = result?.replace(/```json\n?|\n?```/g, '').trim();
      const parsed = JSON.parse(cleanResult || '[]');
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      console.error('Knowledge gap analysis error:', error);
      return [];
    }
  }

  /**
   * Generate conversation summary
   */
  async generateSummary(messages: Message[]): Promise<string> {
    const conversationText = this.formatConversationForAI(messages);

    if (!conversationText.trim()) {
      return 'Empty conversation';
    }

    try {
      const response = await this.retryApiCall(() =>
        this.openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are a conversation summarizer. Create a concise summary of the conversation highlighting the main topic, user needs, interactions with menus/cards, and outcome. Handle Arabic and English text. Keep it under 100 words. Return only the summary text, no additional formatting."
          },
          {
            role: "user",
              content: `Summarize this conversation including user interactions: ${conversationText.substring(0, 1500)}`
          }
        ],
        temperature: 0.3,
        })
      );

      return response.choices[0].message.content || 'Unable to generate summary';
    } catch (error) {
      console.error('Summary generation error:', error);
      return 'Summary generation failed';
    }
  }

  /**
   * Generate AI-powered insights for overall metrics
   */
  async generateOverallInsights(analytics: Array<{
    conversationLength: number;
    sentiment: string;
    intents: string[];
    subCategories: string[];
    qualityScore: number;
    qualityReasons?: string[];
    knowledgeGaps: string[];
    summary: string;
  }>): Promise<{
    insights: string;
    recommendations: string[];
    trends: string[];
  }> {
    try {
      // Create detailed analysis with specific metrics
      const totalConversations = analytics.length;
      const avgLength = analytics.reduce((sum, a) => sum + a.conversationLength, 0) / analytics.length;
      const avgQuality = analytics.reduce((sum, a) => sum + a.qualityScore, 0) / analytics.length;
      
      // Sentiment breakdown with percentages
      const sentimentCounts = analytics.reduce((acc: Record<string, number>, a) => {
          acc[a.sentiment] = (acc[a.sentiment] || 0) + 1;
          return acc;
      }, {});
      const sentimentPercentages = Object.entries(sentimentCounts).map(([sentiment, count]) => ({
        sentiment,
        count,
        percentage: Math.round((count / totalConversations) * 100)
      }));

      // Top topics with frequency
      const topicCounts = analytics.flatMap(a => a.intents).reduce((acc: Record<string, number>, topic) => {
        acc[topic] = (acc[topic] || 0) + 1;
        return acc;
      }, {});
      const topTopics = Object.entries(topicCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10)
        .map(([topic, count]) => ({ topic, count, percentage: Math.round((count / totalConversations) * 100) }));

      // Top categories with frequency
      const categoryCounts = analytics.flatMap(a => a.subCategories).reduce((acc: Record<string, number>, category) => {
        acc[category] = (acc[category] || 0) + 1;
        return acc;
      }, {});
      const topCategories = Object.entries(categoryCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 8)
        .map(([category, count]) => ({ category, count, percentage: Math.round((count / totalConversations) * 100) }));

      // Knowledge gaps analysis
      const allKnowledgeGaps = analytics.flatMap(a => a.knowledgeGaps);
      const gapCounts = allKnowledgeGaps.reduce((acc: Record<string, number>, gap) => {
        acc[gap] = (acc[gap] || 0) + 1;
        return acc;
      }, {});
      const topKnowledgeGaps = Object.entries(gapCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
        .map(([gap, count]) => ({ gap, count, percentage: Math.round((count / totalConversations) * 100) }));

      // Quality distribution
      const qualityRanges = {
        excellent: analytics.filter(a => a.qualityScore >= 80).length,
        good: analytics.filter(a => a.qualityScore >= 60 && a.qualityScore < 80).length,
        average: analytics.filter(a => a.qualityScore >= 40 && a.qualityScore < 60).length,
        poor: analytics.filter(a => a.qualityScore < 40).length
      };

      // Most common quality issues
      const allQualityReasons = analytics.flatMap(a => a.qualityReasons || []);
      const qualityReasonCounts = allQualityReasons.reduce((acc: Record<string, number>, reason) => {
        acc[reason] = (acc[reason] || 0) + 1;
        return acc;
      }, {});
      const topQualityIssues = Object.entries(qualityReasonCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
        .map(([reason, count]) => ({ reason, count }));

      const detailedSummary = {
        overview: {
          totalConversations,
          avgLength: Math.round(avgLength * 100) / 100,
          avgQuality: Math.round(avgQuality * 100) / 100
        },
        sentiment: {
          distribution: sentimentPercentages,
          dominantSentiment: sentimentPercentages.sort((a, b) => b.percentage - a.percentage)[0]
        },
        topics: {
          topTopics,
          totalUniqueTopics: Object.keys(topicCounts).length,
          mostCommonTopic: topTopics[0]
        },
        categories: {
          topCategories,
          totalUniqueCategories: Object.keys(categoryCounts).length
        },
        quality: {
          averageScore: Math.round(avgQuality * 100) / 100,
          distribution: qualityRanges,
          topIssues: topQualityIssues
        },
        knowledgeGaps: {
          totalGaps: allKnowledgeGaps.length,
          uniqueGaps: Object.keys(gapCounts).length,
          topGaps: topKnowledgeGaps,
          conversationsWithGaps: analytics.filter(a => a.knowledgeGaps.length > 0).length
        }
      };

      const response = await this.retryApiCall(() =>
        this.openai.chat.completions.create({
          model: "gpt-4.1-nano",
        messages: [
          {
            role: "system",
              content: `You are an expert chatbot performance analyst. Analyze the detailed conversation data and provide specific, actionable insights.

IMPORTANT: Base your analysis on the ACTUAL DATA provided. Be specific about:
- Exact percentages and numbers from the data
- Specific topics, categories, and knowledge gaps mentioned
- Concrete quality issues identified
- Actionable recommendations based on the actual patterns found

Return ONLY a valid JSON object with:
- 'insights': A detailed paragraph analyzing the specific performance patterns, mentioning actual numbers, percentages, and specific issues found
- 'recommendations': Array of 5-7 specific, actionable recommendations based on the actual data patterns
- 'trends': Array of 4-6 specific trends identified from the actual data

Do not use generic language. Reference the specific data points, topics, categories, and issues provided.`
          },
          {
            role: "user",
              content: `Analyze this detailed chatbot performance data and provide specific insights:

${JSON.stringify(detailedSummary, null, 2)}

Focus on the specific topics, categories, quality issues, and knowledge gaps found in this actual data. Provide actionable recommendations based on these specific findings.`
            }
          ],
          temperature: 0.3,
          max_tokens: 800,
        })
      );

      const result = response.choices[0].message.content;
      const cleanResult = result?.replace(/```json\n?|\n?```/g, '').trim();
      const parsed = JSON.parse(cleanResult || '{"insights": "Analysis unavailable", "recommendations": [], "trends": []}');
      
      return {
        insights: parsed.insights || 'Analysis unavailable',
        recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations : [],
        trends: Array.isArray(parsed.trends) ? parsed.trends : []
      };
    } catch (error) {
      console.error('Overall insights error:', error);
      return {
        insights: 'Unable to generate insights due to processing error',
        recommendations: ['Review conversation data quality', 'Check API connectivity', 'Verify data processing pipeline'],
        trends: ['Data analysis requires troubleshooting']
      };
    }
  }

  /**
   * Calculate conversation metrics (basic, non-AI)
   */
  calculateBasicMetrics(messages: Message[]): {
    conversationLength: number;
    firstResponseTime: number | undefined;
  } {
    const conversationLength = messages.length;
    
    const firstUserMessage = messages.find(msg => msg.from === 'user');
    const firstBotResponse = messages.find((msg, index) => {
      if (msg.from === 'bot' && firstUserMessage) {
        const userMsgIndex = messages.indexOf(firstUserMessage);
        return index > userMsgIndex;
      }
      return false;
    });

    let firstResponseTime: number | undefined;
    if (firstUserMessage && firstBotResponse && 
        firstUserMessage.DateStamp && firstBotResponse.DateStamp) {
      const userTime = parseInt(firstUserMessage.DateStamp.$date.$numberLong);
      const botTime = parseInt(firstBotResponse.DateStamp.$date.$numberLong);
      firstResponseTime = botTime - userTime;
    }

    return {
      conversationLength,
      firstResponseTime
    };
  }

  /**
   * Generate recommended actions based on conversation analysis
   */
  async generateRecommendedActions(
    analytics: {
      sentiment: string;
      qualityScore: number;
      knowledgeGaps: string[];
    },
    escalationRisk: 'low' | 'medium' | 'high',
    resolutionStatus: 'resolved' | 'partial' | 'unresolved'
  ): Promise<string[]> {
    try {
      const context = {
        sentiment: analytics.sentiment,
        qualityScore: analytics.qualityScore,
        knowledgeGaps: analytics.knowledgeGaps,
        escalationRisk,
        resolutionStatus
      };

      const response = await this.retryApiCall(() =>
        this.openai.chat.completions.create({
          model: "gpt-4.5-preview",
          messages: [
            {
              role: "system",
              content: "You are a customer service improvement specialist. Based on conversation analysis, provide actionable recommendations for improving the chatbot or handling the specific case. Return ONLY a valid JSON array of recommendation strings. Each should be specific and actionable. Do not include any markdown formatting or code blocks."
            },
            {
              role: "user",
              content: `Generate recommended actions based on this analysis: ${JSON.stringify(context)}`
            }
          ],
          temperature: 0.2,
        })
      );

      const result = response.choices[0].message.content;
      const cleanResult = result?.replace(/```json\n?|\n?```/g, '').trim();
      const parsed = JSON.parse(cleanResult || '[]');
      return Array.isArray(parsed) ? parsed : ['Review conversation for improvement opportunities'];
    } catch (error) {
      console.error('Recommended actions generation error:', error);
      return ['Review conversation for improvement opportunities'];
    }
  }

  /**
   * ULTRA-FAST: Analyze entire conversation in ONE AI call
   * Gets sentiment, intents, quality, knowledge gaps, summary, recommendations, and trends all at once
   */
  async analyzeConversationUltraFast(messages: Message[]): Promise<{
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
  }> {
    const conversationText = this.formatConversationForAI(messages);

    if (!conversationText.trim()) {
      return {
        sentiment: 'neutral',
        sentimentScore: 0,
        intents: [],
        subCategories: [],
        qualityScore: 0,
        qualityReasons: ['No conversation content'],
        knowledgeGaps: [],
        summary: 'Empty conversation',
        recommendations: [],
        trends: []
      };
    }

    try {
      const response = await this.retryApiCall(() => 
        this.openai.chat.completions.create({
          model: "gpt-4.5-preview",
          messages: [
            {
              role: "system",
              content: `You are a conversation analyzer. Analyze the conversation and return ONLY a valid JSON object with:
- 'sentiment' (positive/negative/neutral)
- 'sentimentScore' (number from -1 to 1)
- 'intents' (array of specific conversation topics discussed, max 5)
- 'subCategories' (array of specific conversation sub-topics, max 5)
- 'qualityScore' (0-100, how well the bot answered user questions)
- 'qualityReasons' (array of specific reasons for the quality score - be detailed about what the bot did well or poorly, max 3)
- 'knowledgeGaps' (array of specific things the bot couldn't answer or handle properly, max 5)
- 'summary' (brief summary of what happened in the conversation, max 100 words)
- 'recommendations' (array of 2-3 specific actionable recommendations for improving this type of conversation)
- 'trends' (array of 1-2 specific patterns or trends observed in this conversation)

Be SPECIFIC in your analysis:
- For qualityReasons: mention specific response issues like "Bot provided generic response to pricing question" or "Bot successfully guided user through account setup"
- For knowledgeGaps: mention specific topics like "Product pricing information", "Technical support for mobile app", "Refund policy details"
- For intents: be specific TOPICS like "product_pricing", "account_management", "technical_support", "billing_inquiries", "service_complaints"
- For subCategories: be specific like "billing_issues", "technical_support", "product_information"
- For recommendations: be actionable like "Add specific pricing information to bot knowledge base", "Improve escalation flow for technical issues"
- For trends: identify patterns like "User required multiple attempts to get pricing info", "Bot successfully handled greeting but failed on follow-up questions"

Handle Arabic and English text. Do not include any markdown formatting or code blocks.`
            },
            {
              role: "user",
              content: `Analyze this conversation: ${conversationText.substring(0, 3000)}`
            }
          ],
          max_tokens: 700,
          temperature: 0.1,
        })
      );

      const result = response.choices[0].message.content;
      if (!result) {
        return this.getDefaultAnalysisWithInsights();
      }

      // Clean and parse result
      let cleanResult = result.replace(/```json\n?|\n?```/g, '').trim();
      
      // Try to extract JSON from the response
      const jsonMatch = cleanResult.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        cleanResult = jsonMatch[0];
      }

      const parsed = JSON.parse(cleanResult);
      
      return {
        sentiment: ['positive', 'negative', 'neutral'].includes(parsed.sentiment) 
          ? parsed.sentiment 
          : 'neutral',
        sentimentScore: typeof parsed.sentimentScore === 'number' 
          ? Math.max(-1, Math.min(1, parsed.sentimentScore)) 
          : 0,
        intents: Array.isArray(parsed.intents) 
          ? parsed.intents.slice(0, 5) 
          : [],
        subCategories: Array.isArray(parsed.subCategories) 
          ? parsed.subCategories.slice(0, 5) 
          : [],
        qualityScore: typeof parsed.qualityScore === 'number'
          ? Math.max(0, Math.min(100, parsed.qualityScore))
          : 0,
        qualityReasons: Array.isArray(parsed.qualityReasons)
          ? parsed.qualityReasons.slice(0, 3)
          : ['Analysis completed'],
        knowledgeGaps: Array.isArray(parsed.knowledgeGaps)
          ? parsed.knowledgeGaps.slice(0, 5)
          : [],
        summary: typeof parsed.summary === 'string'
          ? parsed.summary.substring(0, 200)
          : 'Conversation analyzed',
        recommendations: Array.isArray(parsed.recommendations)
          ? parsed.recommendations.slice(0, 3)
          : [],
        trends: Array.isArray(parsed.trends)
          ? parsed.trends.slice(0, 2)
          : []
      };
    } catch (error) {
      console.error('Ultra-fast analysis error:', error);
      return this.getDefaultAnalysisWithInsights();
    }
  }

  /**
   * Default analysis for error cases (with insights)
   */
  private getDefaultAnalysisWithInsights() {
    return {
      sentiment: 'neutral' as const,
      sentimentScore: 0,
      intents: [],
      subCategories: [],
      qualityScore: 0,
      qualityReasons: ['Analysis failed'],
      knowledgeGaps: [],
      summary: 'Analysis failed',
      recommendations: [],
      trends: []
    };
  }

  /**
   * NEW: Consolidate individual conversation insights into platform-level insights
   * OPTIMIZED: Reduced token usage by pre-aggregating data and sending only compact summaries
   */
  async consolidateConversationInsights(analytics: Array<{
    conversationLength: number;
    sentiment: string;
    intents: string[];
    subCategories: string[];
    qualityScore: number;
    qualityReasons?: string[];
    knowledgeGaps: string[];
    summary: string;
    recommendations: string[];
    trends: string[];
  }>): Promise<{
    insights: string;
    recommendations: string[];
    trends: string[];
  }> {
    try {
      console.log(`🔧 Consolidating insights from ${analytics.length} conversations...`);
      
      // Aggregate all individual insights
      const allRecommendations = analytics.flatMap(a => a.recommendations);
      const allTrends = analytics.flatMap(a => a.trends);
      const allQualityReasons = analytics.flatMap(a => a.qualityReasons || []);
      const allKnowledgeGaps = analytics.flatMap(a => a.knowledgeGaps);

      // Count frequencies and get TOP items only (drastically reduce data size)
      const recommendationCounts = allRecommendations.reduce((acc: Record<string, number>, rec) => {
        acc[rec] = (acc[rec] || 0) + 1;
        return acc;
      }, {});
      
      const trendCounts = allTrends.reduce((acc: Record<string, number>, trend) => {
        acc[trend] = (acc[trend] || 0) + 1;
        return acc;
      }, {});
      
      const qualityIssueCounts = allQualityReasons.reduce((acc: Record<string, number>, reason) => {
        acc[reason] = (acc[reason] || 0) + 1;
        return acc;
      }, {});
      
      const gapCounts = allKnowledgeGaps.reduce((acc: Record<string, number>, gap) => {
        acc[gap] = (acc[gap] || 0) + 1;
        return acc;
      }, {});

      // Get all items sorted by frequency
      const topRecommendations = Object.entries(recommendationCounts)
        .sort(([,a], [,b]) => b - a)
        .map(([rec, count]) => `${rec} (${count}x, ${Math.round((count / analytics.length) * 100)}%)`);

      const topTrends = Object.entries(trendCounts)
        .sort(([,a], [,b]) => b - a)
        .map(([trend, count]) => `${trend} (${count}x, ${Math.round((count / analytics.length) * 100)}%)`);

      const topQualityIssues = Object.entries(qualityIssueCounts)
        .sort(([,a], [,b]) => b - a)
        .map(([issue, count]) => `${issue} (${count}x, ${Math.round((count / analytics.length) * 100)}%)`);

      const topKnowledgeGaps = Object.entries(gapCounts)
        .sort(([,a], [,b]) => b - a)
        .map(([gap, count]) => `${gap} (${count}x, ${Math.round((count / analytics.length) * 100)}%)`);

      // Calculate basic stats
      const totalConversations = analytics.length;
      const avgQuality = Math.round((analytics.reduce((sum, a) => sum + a.qualityScore, 0) / analytics.length) * 100) / 100;
      const sentimentCounts = analytics.reduce((acc: Record<string, number>, a) => {
        acc[a.sentiment] = (acc[a.sentiment] || 0) + 1;
        return acc;
      }, {});

      const compactSummary = [
        `📊 ANALYSIS OF ${totalConversations} CONVERSATIONS`,
        `Average Quality: ${avgQuality}%`,
        `Sentiment: ${Object.entries(sentimentCounts).map(([s, c]) => `${s}=${Math.round(c/totalConversations*100)}%`).join(', ')}`,
        '',
        `🔧 RECOMMENDATIONS FROM DATABASE (Sorted by frequency):`,
        ...topRecommendations,
        '',
        `📈 TRENDS FROM DATABASE (Sorted by frequency):`,
        ...topTrends,
        '',
        `⚠️ QUALITY ISSUES FROM DATABASE (Sorted by frequency):`,
        ...topQualityIssues,
        '',
        `🧠 KNOWLEDGE GAPS FROM DATABASE (Sorted by frequency):`,
        ...topKnowledgeGaps
      ].join('\n');

      console.log(`📦 Compact summary size: ${compactSummary.length} characters (estimated ~${Math.round(compactSummary.length/4)} tokens)`);

      const response = await this.retryApiCall(() =>
        this.openai.chat.completions.create({
          model: "gpt-4.5-preview",
          messages: [
            {
              role: "system",
              content: `You are a chatbot performance analyst. Analyze the consolidated data from ${totalConversations} individual conversations and provide platform-level insights.

The input contains ALL aggregated Recommendations, Trends, Quality Issues, and Knowledge Gaps from the database analysis of ${totalConversations} conversations, sorted by frequency.

YOUR TASK:
1. Review the full list of "RECOMMENDATIONS" and "TRENDS" provided in the input.
2. Identify the most significant and frequent patterns.
3. Refine and polish them into a professional executive summary.
4. Return them as the final insights.

Return ONLY a valid JSON object with:
- 'insights': A comprehensive paragraph analyzing the performance patterns, mentioning specific percentages and most frequent issues found in the data.
- 'recommendations': Array of 6-8 prioritized, actionable recommendations. Select the most impactful ones from the provided list.
- 'trends': Array of 5-7 key trends. Select the most impactful ones from the provided list.

IMPORTANT:
- Do NOT invent new trends or recommendations. Use the ones provided in the input.
- Mention the frequency/percentage if available in the input to add credibility.
- If the input lists specific technical issues or gaps, make sure to include them.`
            },
            {
              role: "user",
              content: compactSummary
            }
          ],
          temperature: 0.3,
        })
      );

      const result = response.choices[0].message.content;
      const cleanResult = result?.replace(/```json\n?|\n?```/g, '').trim();
      const parsed = JSON.parse(cleanResult || '{"insights": "Analysis unavailable", "recommendations": [], "trends": []}');
      
      console.log(`✅ Insights consolidated successfully with ${parsed.recommendations?.length || 0} recommendations and ${parsed.trends?.length || 0} trends`);
      
      return {
        insights: parsed.insights || 'Analysis unavailable',
        recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations : [],
        trends: Array.isArray(parsed.trends) ? parsed.trends : []
      };
    } catch (error) {
      console.error('❌ Consolidation error:', error);
      
      // Fallback: Generate insights from raw data without LLM
      return this.generateFallbackInsights(analytics);
    }
  }

  /**
   * Fallback method to generate insights when LLM fails
   */
  private generateFallbackInsights(analytics: Array<{
    conversationLength: number;
    sentiment: string;
    intents: string[];
    subCategories: string[];
    qualityScore: number;
    qualityReasons?: string[];
    knowledgeGaps: string[];
    summary: string;
    recommendations: string[];
    trends: string[];
  }>): {
    insights: string;
    recommendations: string[];
    trends: string[];
  } {
    const totalConversations = analytics.length;
    const avgQuality = analytics.reduce((sum, a) => sum + a.qualityScore, 0) / totalConversations;
    
    // Count sentiments
    const sentimentCounts = analytics.reduce((acc: Record<string, number>, a) => {
      acc[a.sentiment] = (acc[a.sentiment] || 0) + 1;
      return acc;
    }, {});
    
    const positivePct = Math.round((sentimentCounts.positive || 0) / totalConversations * 100);
    const negativePct = Math.round((sentimentCounts.negative || 0) / totalConversations * 100);
    
    // Count top recommendations
    const allRecommendations = analytics.flatMap(a => a.recommendations);
    const recCounts = allRecommendations.reduce((acc: Record<string, number>, rec) => {
      acc[rec] = (acc[rec] || 0) + 1;
      return acc;
    }, {});
    const topRecs = Object.entries(recCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 6)
      .map(([rec]) => rec);
    
    // Count top trends
    const allTrends = analytics.flatMap(a => a.trends);
    const trendCounts = allTrends.reduce((acc: Record<string, number>, trend) => {
      acc[trend] = (acc[trend] || 0) + 1;
      return acc;
    }, {});
    const topTrends = Object.entries(trendCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([trend]) => trend);

    return {
      insights: `Analysis of ${totalConversations} conversations shows an average quality score of ${avgQuality.toFixed(1)}%. Sentiment distribution: ${positivePct}% positive, ${negativePct}% negative conversations. The system identified ${Object.keys(recCounts).length} unique recommendations and ${Object.keys(trendCounts).length} distinct trends across all conversations.`,
      recommendations: topRecs.length > 0 ? topRecs : [
        'Improve response quality and accuracy',
        'Enhance knowledge base coverage', 
        'Optimize conversation flow',
        'Address frequent user pain points',
        'Implement better escalation handling',
        'Strengthen intent recognition'
      ],
      trends: topTrends.length > 0 ? topTrends : [
        'Users require more detailed explanations',
        'Increased demand for specific information',
        'Common patterns in conversation escalation',
        'Recurring topics need better coverage',
        'Response time impacts user satisfaction'
      ]
    };
  }
} 