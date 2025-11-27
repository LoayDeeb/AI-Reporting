'use client';

import React, { useState, useEffect } from 'react';
import ConversationHeader from '@/components/Conversations/ConversationHeader';
import MessageThread from '@/components/Conversations/MessageThread';
import AnalyticsPanel from '@/components/Conversations/AnalyticsPanel';

interface ConversationDetailsProps {
  params: Promise<{
    id: string;
  }>;
}

const ConversationDetails = ({ params }: ConversationDetailsProps) => {
  const [conversation, setConversation] = useState<any>(null);
  const [conversationData, setConversationData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [conversationId, setConversationId] = useState<string>('');
  
  useEffect(() => {
    const fetchConversationData = async () => {
      try {
        setLoading(true);
        
        // Await the params to get the id
        const resolvedParams = await params;
        const id = resolvedParams.id;
        setConversationId(id);
        
        // Detect if this is a Zainjo conversation
        const isZainjoConversation = id.startsWith('ZAINJO-') || id.includes('ZAINJO-USER-');
        
        // Choose the appropriate API endpoint based on conversation type
        const conversationsEndpoint = isZainjoConversation 
          ? '/api/conversations/zainjo' 
          : '/api/conversations';
        
        console.log(`Looking for ${isZainjoConversation ? 'Zainjo' : 'regular'} conversation with senderID:`, id);
        
        // Get conversation list to find the specific conversation
        const conversationsResponse = await fetch(conversationsEndpoint);
        const conversationsResult = await conversationsResponse.json();
        
        console.log('Available conversations sample:', conversationsResult.conversations?.slice(0, 3));
        
        // Find the specific conversation by ID (not senderID)
        const foundConversation = conversationsResult.conversations?.find((conv: any) => conv.id === id);
        
        if (foundConversation) {
          console.log('Found conversation:', foundConversation);
          // Ensure user object exists for the conversation
          const conversationWithUser = {
            ...foundConversation,
            user: foundConversation.user || {
              id: foundConversation.senderID,
              sessionId: isZainjoConversation ? 'ZAINJO-SESSION' : 'SESSION-001',
              browser: 'Chrome',
              device: 'Desktop',
              location: isZainjoConversation ? 'Saudi Arabia' : 'Unknown Location',
            }
          };
          setConversation(conversationWithUser);
          
          // Fetch messages based on conversation type
          const messagesEndpoint = isZainjoConversation 
            ? `/api/messages/zainjo?id=${id}`
            : `/api/messages?id=${id}`;
          
          console.log(`🚀 Loading ${isZainjoConversation ? 'Zainjo' : 'regular'} messages using optimized API...`);
          const messagesResponse = await fetch(messagesEndpoint);
          const messagesResult = await messagesResponse.json();
          
          if (messagesResponse.ok) {
            console.log('✅ Messages loaded successfully:', {
              messageCount: messagesResult.messageCount,
              method: messagesResult.method,
              loadTime: messagesResult.loadTime,
              source: messagesResult.source || 'regular'
            });
            setConversationData(messagesResult);
          } else {
            console.log('❌ Failed to load messages:', messagesResult.error);
            // Fallback to empty conversation data
            setConversationData({
              senderID: id,
              messageCount: 0,
              messages: []
            });
          }
        } else {
          // Fallback to mock data if real data not found
          setConversation({
            id: isZainjoConversation ? `ZAINJO-${id.slice(-8)}` : `CONV-${id.slice(0, 8)}`,
            timestamp: '2024-01-20T14:30:00',
            sentiment: 'Positive',
            qualityScore: 92,
            intent: isZainjoConversation ? 'account_inquiry' : 'service_inquiry',
            duration: '4m 30s',
            status: 'Completed',
            messages: 8,
            senderID: id, // Real senderID
            user: {
              id: id,
              sessionId: isZainjoConversation ? 'ZAINJO-SESSION' : 'SESSION-001',
              browser: 'Chrome',
              device: 'Desktop',
              location: isZainjoConversation ? 'Saudi Arabia' : 'United States',
            },
          });
        }
      } catch (error) {
        console.error('Error fetching conversation data:', error);
        // Set fallback data on error - use conversationId state
        const isZainjoConversation = conversationId.startsWith('ZAINJO-') || conversationId.includes('ZAINJO-USER-');
        setConversation({
          id: isZainjoConversation ? `ZAINJO-${conversationId.slice(-8)}` : `CONV-${conversationId.slice(0, 8)}`,
          timestamp: '2024-01-20T14:30:00',
          sentiment: 'Positive',
          qualityScore: 92,
          intent: isZainjoConversation ? 'account_inquiry' : 'service_inquiry',
          duration: '4m 30s',
          status: 'Completed',
          messages: 8,
          senderID: conversationId, // Real senderID
          user: {
            id: conversationId,
            sessionId: isZainjoConversation ? 'ZAINJO-SESSION' : 'SESSION-001',
            browser: 'Chrome',
            device: 'Desktop',
            location: isZainjoConversation ? 'Saudi Arabia' : 'United States',
          },
        });
      } finally {
        setLoading(false);
      }
    };

    fetchConversationData();
  }, [params]);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-white text-lg">Loading conversation...</div>
        </div>
      </div>
    );
  }

  if (!conversation) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-white text-lg">Conversation not found</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <ConversationHeader conversation={conversation} />
      <div className="grid grid-cols-1 lg:grid-cols-[1fr,300px] gap-6 mt-6">
        <MessageThread conversationId={conversationId} conversationData={conversationData} />
        <AnalyticsPanel conversation={conversation} conversationData={conversationData} />
      </div>
    </div>
  );
};

export default ConversationDetails; 