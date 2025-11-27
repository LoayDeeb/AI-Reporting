import { NextRequest, NextResponse } from 'next/server';
import { ZainjoDataProcessor } from '../../../../lib/zainjo-data-processor';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const senderID = searchParams.get('senderID');

    if (!id && !senderID) {
      return NextResponse.json(
        { error: 'Either id or senderID parameter is required' },
        { status: 400 }
      );
    }

    console.log(`🔍 Loading Zainjo messages for ID: ${id}, senderID: ${senderID}`);
    
    const zainjoProcessor = new ZainjoDataProcessor();
    
    // If we have senderID, use it directly, otherwise extract from ID
    let actualSenderID = senderID;
    if (!actualSenderID && id) {
      // Extract senderID from Zainjo conversation ID (e.g., ZAINJO-00001 -> get from cache)
      const cache = await zainjoProcessor.loadCache();
      if (cache && cache.analytics) {
        const index = parseInt(id.replace('ZAINJO-', '')) - 1;
        if (index >= 0 && index < cache.analytics.length) {
          actualSenderID = cache.analytics[index].senderID;
        }
      }
    }

    if (!actualSenderID) {
      return NextResponse.json(
        { error: 'Could not determine senderID for this conversation' },
        { status: 400 }
      );
    }

    console.log(`📖 Loading messages for senderID: ${actualSenderID}`);
    
    // Load actual messages from Zainjo chunks
    const messages = await zainjoProcessor.loadZainjoMessagesForSender(actualSenderID);
    
    if (!messages || messages.length === 0) {
      return NextResponse.json(
        { error: 'No messages found for this senderID in Zainjo chunks' },
        { status: 404 }
      );
    }

    // Load analytics for this conversation
    const analytics = await zainjoProcessor.getZainjoConversationAnalytics(actualSenderID);

    // Transform Zainjo messages to standard format
    const transformedMessages = messages.map((msg, index) => ({
      ID: msg.ID,
      MessageText: msg.MessageText,
      TimeSent: msg.TimeSent,
      from: msg.from === 'bot' ? 'bot' : 'user' as 'bot' | 'user',
      SenderID: msg.SenderID,
      sentiment: index === 0 && analytics ? analytics.sentiment : 'neutral',
      Number: msg.Number || index + 1,
      Agent: msg.Agent,
      bot: msg.bot,
      Type: msg.Type,
      DateSent: msg.DateSent,
      PageID: msg.PageID
    }));

    // Calculate metrics
    const conversationLength = messages.length;
    const firstResponseTime = analytics?.firstResponseTime || 2500;

    return NextResponse.json({
      senderID: actualSenderID,
      messageCount: messages.length,
      conversationLength: conversationLength,
      firstResponseTime: firstResponseTime,
      messages: transformedMessages.slice(0, 100), // Limit to first 100 messages for performance
      loadTime: new Date().toISOString(),
      method: 'zainjo-chunks',
      source: 'zainjo-analysis',
      // Additional Zainjo-specific data from analytics
      qualityScore: analytics?.qualityScore || 0,
      sentiment: analytics?.sentiment || 'neutral',
      intents: analytics?.intents || [],
      subCategories: analytics?.subCategories || [],
      knowledgeGaps: analytics?.knowledgeGaps || [],
      recommendations: analytics?.recommendations || [],
      trends: analytics?.trends || []
    });

  } catch (error) {
    console.error('Error loading Zainjo messages:', error);
    return NextResponse.json(
      { error: 'Failed to load Zainjo messages', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 