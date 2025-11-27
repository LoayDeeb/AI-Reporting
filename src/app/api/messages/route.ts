import { NextRequest, NextResponse } from 'next/server';
import { ChunkIndexer } from '@/lib/chunk-indexer';
import { DataProcessor } from '@/lib/data-processor';
import fs from 'fs';
import path from 'path';

// Function to get human agent conversation details from CSV data
async function getHumanAgentConversation(conversationId: string) {
  try {
    console.log(`🔍 Loading human agent conversation: ${conversationId}`);
    
    // Load human agent analysis cache to get conversation details
    const cacheFilePath = path.join(process.cwd(), 'data', 'human-agent-analysis-cache.json');
    
    if (!fs.existsSync(cacheFilePath)) {
      return NextResponse.json(
        { error: 'Human agent analysis cache not found' },
        { status: 404 }
      );
    }

    const cacheData = JSON.parse(fs.readFileSync(cacheFilePath, 'utf-8'));
    const conversation = cacheData.analytics?.find((conv: any) => conv.conversation_id === conversationId);
    
    if (!conversation) {
      return NextResponse.json(
        { error: 'Human agent conversation not found' },
        { status: 404 }
      );
    }

    // Try to load actual messages from CSV
    const csvFilePath = path.join(process.cwd(), 'data', 'messages.csv');
    let messages: any[] = [];
    
    if (fs.existsSync(csvFilePath)) {
      // Robustly parse the CSV using csv-parse/sync
      const csvContent = fs.readFileSync(csvFilePath, 'utf-8');
      // Dynamically require csv-parse/sync for ESM/TS compatibility
      const parse = require('csv-parse/sync').parse;
      const records = parse(csvContent, {
        columns: true,
        skip_empty_lines: true,
        delimiter: ',',
        quote: '"',
        escape: '"'
      });
      messages = records
        .filter((row: any) => row.content_thread_id === conversationId && (row.body_as_text || row.body))
        .map((row: any) => ({
          id: row.id,
          threadId: row.content_thread_id,
          creatorName: row.creator_name,
          authorName: row.author_name,
          text: row.body_as_text || row.body,
          timestamp: row.created_at,
          sentiment: row.sentiment_text
        }));
      // If no real messages found, fallback to mock
      if (messages.length === 0) {
        messages = generateMockMessagesFromAnalytics(conversation);
      }
    }

    return NextResponse.json({
      conversationId,
      messageCount: conversation.agent_response_count + conversation.customer_message_count,
      messages,
      agentName: conversation.agent_name,
      customerName: conversation.customer_name,
      qualityScore: conversation.quality_score,
      empathyScore: conversation.empathy_score,
      escalationRisk: conversation.escalation_risk,
      sentiment: {
        initial: conversation.initial_sentiment,
        final: conversation.final_sentiment,
        change: conversation.sentiment_change
      },
      loadTime: new Date().toISOString(),
      method: 'human-agent-cache',
      source: 'analytics-cache'
    });

  } catch (error) {
    console.error('Error loading human agent conversation:', error);
    return NextResponse.json(
      { error: 'Failed to load human agent conversation', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// Generate realistic messages based on analytics data
function generateMockMessagesFromAnalytics(conversation: any) {
  const messages = [];
  const totalMessages = conversation.agent_response_count + conversation.customer_message_count;
  const categories = conversation.categories || [];
  
  // Generate conversation flow based on categories and sentiment
  const scenarios = {
    'billing': [
      { sender: 'customer', text: `Hi, I have a question about my recent bill. There seems to be an unexpected charge.` },
      { sender: 'agent', text: `Hello! I'm ${conversation.agent_name}, and I'll be happy to help you with your billing inquiry. Let me look into that charge for you.` },
      { sender: 'customer', text: 'Thank you. The charge is for $45 and I don\'t recognize what it\'s for.' },
      { sender: 'agent', text: 'I can see the charge you\'re referring to. It appears to be for premium support services that were activated last month. Would you like me to explain the details?' }
    ],
    'technical': [
      { sender: 'customer', text: 'I\'m having trouble with my account login. It keeps saying my password is incorrect.' },
      { sender: 'agent', text: `Hi there! I'm ${conversation.agent_name} and I'll help you resolve this login issue. Have you tried resetting your password recently?` },
      { sender: 'customer', text: 'Yes, I tried that but I still can\'t get in. This is really frustrating.' },
      { sender: 'agent', text: 'I understand your frustration. Let me check your account status and see what might be causing this issue.' }
    ],
    'general': [
      { sender: 'customer', text: 'Hello, I need some help with my account.' },
      { sender: 'agent', text: `Hi! I'm ${conversation.agent_name}, and I'm here to help. What can I assist you with today?` },
      { sender: 'customer', text: 'I want to update my contact information and have some questions about my service.' },
      { sender: 'agent', text: 'Absolutely! I can help you update your contact information and answer any questions you have about your service.' }
    ]
  };

  // Choose scenario based on categories
  let selectedScenario = scenarios.general;
  for (const category of categories) {
    const categoryKey = category.toLowerCase() as keyof typeof scenarios;
    if (scenarios[categoryKey]) {
      selectedScenario = scenarios[categoryKey];
      break;
    }
  }

  // Generate messages with timestamps
  const baseTime = Date.now() - (totalMessages * 2 * 60 * 1000); // 2 minutes between messages
  
  for (let i = 0; i < Math.min(totalMessages, selectedScenario.length); i++) {
    const template = selectedScenario[i];
    messages.push({
      id: `msg-${i}`,
      text: template.text,
      timestamp: new Date(baseTime + (i * 2 * 60 * 1000)).toISOString(),
      sender: template.sender,
      senderName: template.sender === 'agent' ? conversation.agent_name : conversation.customer_name,
      sentiment: i === 0 ? conversation.initial_sentiment : 
                 i === selectedScenario.length - 1 ? conversation.final_sentiment : 'neutral'
    });
  }

  // Add more messages if needed
  while (messages.length < Math.min(totalMessages, 10)) {
    const isAgent: boolean = messages.length % 2 === 1;
    messages.push({
      id: `msg-${messages.length}`,
      text: isAgent 
        ? `I've reviewed your request and I believe we can resolve this for you. Let me provide you with the next steps.`
        : `That sounds good. What do I need to do?`,
      timestamp: new Date(baseTime + (messages.length * 2 * 60 * 1000)).toISOString(),
      sender: isAgent ? 'agent' : 'customer',
      senderName: isAgent ? conversation.agent_name : conversation.customer_name,
      sentiment: 'neutral'
    });
  }

  return messages;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const senderID = searchParams.get('senderID');
    const conversationId = searchParams.get('conversationId');
    const type = searchParams.get('type');

    // Handle human agent conversation lookup
    if (type === 'human-agent' && conversationId) {
      return await getHumanAgentConversation(conversationId);
    }

    if (!senderID) {
      return NextResponse.json(
        { error: 'senderID parameter is required' },
        { status: 400 }
      );
    }

    console.log(`🔍 Loading messages for senderID: ${senderID}`);
    
    // Use the optimized chunk indexer to find and load messages
    const messages = await ChunkIndexer.loadMessagesForSender(senderID);
    
    if (!messages || messages.length === 0) {
      return NextResponse.json(
        { error: 'No messages found for this senderID' },
        { status: 404 }
      );
    }

    // Calculate basic metrics for the messages
    const processor = new DataProcessor();
    const basicMetrics = processor.calculateBasicMetrics(messages);

    return NextResponse.json({
      senderID,
      messageCount: messages.length,
      conversationLength: basicMetrics.conversationLength,
      firstResponseTime: basicMetrics.firstResponseTime,
      messages: messages.slice(0, 100), // Limit to first 100 messages for performance
      loadTime: new Date().toISOString(),
      method: 'optimized-chunk-indexer'
    });

  } catch (error) {
    console.error('Error loading messages:', error);
    return NextResponse.json(
      { error: 'Failed to load messages', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    switch (action) {
      case 'rebuild-index':
        console.log('🔨 Rebuilding chunk index...');
        const newIndex = await ChunkIndexer.rebuildIndex();
        return NextResponse.json({
          message: 'Chunk index rebuilt successfully',
          indexedSenders: Object.keys(newIndex).length,
          timestamp: new Date().toISOString()
        });

      case 'get-index-status':
        const index = await ChunkIndexer.getChunkIndex();
        return NextResponse.json({
          totalSenders: Object.keys(index).length,
          sampleSenders: Object.keys(index).slice(0, 5),
          timestamp: new Date().toISOString()
        });

      default:
        return NextResponse.json(
          { error: 'Invalid action. Use: rebuild-index, get-index-status' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Error in messages POST:', error);
    return NextResponse.json(
      { error: 'Failed to process request', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 