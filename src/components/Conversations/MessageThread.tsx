import React from 'react';
import { BotIcon, UserIcon } from 'lucide-react';

interface MessageThreadProps {
  conversationId: string;
  conversationData?: any;
}

interface Message {
  id: number;
  type: 'user' | 'bot';
  content: string;
  timestamp: string;
}

const MessageThread = ({ conversationId, conversationData }: MessageThreadProps) => {
  // Use real conversation data if available
  let messages: Message[] = [];

  if (conversationData?.messages && Array.isArray(conversationData.messages)) {
    // If the messages are from the human agent backend, map them accordingly
    if (conversationData.messages.length > 0 && conversationData.messages[0].text !== undefined) {
      messages = conversationData.messages.map((msg: any, index: number) => {
        // Determine sender type based on creatorName/authorName
        let type: 'user' | 'bot' = 'user';
        let senderName = msg.authorName || '';
        // Heuristic: If creatorName contains 'agent' or matches the agent name, treat as bot
        if (
          (msg.creatorName && /agent/i.test(msg.creatorName)) ||
          (msg.creatorName && conversationData.agentName && msg.creatorName === conversationData.agentName)
        ) {
          type = 'bot';
          senderName = msg.creatorName;
        }
        return {
          id: index + 1,
          type,
          content: msg.text,
          timestamp: msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString() : '',
        };
      });
    } else {
      // fallback to legacy mapping for bot messages
      messages = conversationData.messages.map((msg: any, index: number) => {
        let content = '';
        if (msg.MessageText) content = msg.MessageText;
        return {
          id: index + 1,
          type: msg.from === 'user' ? 'user' : 'bot',
          content,
          timestamp: msg.TimeSent ? new Date(msg.TimeSent).toLocaleTimeString() : '',
        };
      });
    }
  } else {
    console.log('No messages found in conversationData:', conversationData);
  }

  // Fallback to mock data if no real data
  if (messages.length === 0) {
    messages = [
      {
        id: 1,
        type: 'user',
        content: 'Hi, I need help with your services',
        timestamp: '14:30:15',
      },
      {
        id: 2,
        type: 'bot',
        content:
          "Hello! I'd be happy to help you with our services. What specific information are you looking for?",
        timestamp: '14:30:18',
      },
      {
        id: 3,
        type: 'user',
        content: 'I want to know about your pricing plans',
        timestamp: '14:30:45',
      },
      {
        id: 4,
        type: 'bot',
        content:
          'We offer several pricing plans tailored to different needs. Our most popular plans are:\n\n1. Basic Plan - $10/month\n2. Pro Plan - $25/month\n3. Enterprise Plan - Custom pricing\n\nWould you like me to explain the features included in each plan?',
        timestamp: '14:30:48',
      },
    ];
  }

  return (
    <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6">
      <h2 className="text-lg font-semibold text-white mb-6">
        Conversation History
      </h2>
      <div className="space-y-6">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`flex max-w-[80%] ${message.type === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
            >
              <div
                className={`flex items-center justify-center h-8 w-8 rounded-full ${message.type === 'user' ? 'bg-blue-500/20 ml-3' : 'bg-violet-500/20 mr-3'}`}
              >
                {message.type === 'user' ? (
                  <UserIcon size={16} className="text-blue-400" />
                ) : (
                  <BotIcon size={16} className="text-violet-400" />
                )}
              </div>
              <div>
                <div
                  className={`rounded-xl p-4 ${message.type === 'user' ? 'bg-blue-500/10 text-blue-100' : 'bg-gray-900/50 text-gray-100'}`}
                >
                  <div className="whitespace-pre-wrap">
                    {message.content.split('\n').map((line, lineIndex) => {
                      // Handle bold text
                      if (line.includes('**')) {
                        const parts = line.split('**');
                        return (
                          <div key={lineIndex} className="mb-1">
                            {parts.map((part, partIndex) => 
                              partIndex % 2 === 1 ? (
                                <span key={partIndex} className="font-semibold text-white">{part}</span>
                              ) : (
                                <span key={partIndex}>{part}</span>
                              )
                            )}
                          </div>
                        );
                      }
                      // Handle bullet points
                      if (line.startsWith('• ')) {
                        return (
                          <div key={lineIndex} className="ml-4 mb-1 flex items-start">
                            <span className="text-blue-400 mr-2">•</span>
                            <span>{line.substring(2)}</span>
                          </div>
                        );
                      }
                      // Handle emoji headers
                      if (line.startsWith('🎯') || line.startsWith('🖼️') || line.startsWith('🎥') || line.startsWith('💬')) {
                        return (
                          <div key={lineIndex} className="font-medium text-yellow-300 mb-2">
                            {line}
                          </div>
                        );
                      }
                      // Regular text
                      return line ? <div key={lineIndex} className="mb-1">{line}</div> : <br key={lineIndex} />;
                    })}
                  </div>
                </div>
                <span className="text-xs text-gray-500 mt-1 block">
                  {message.timestamp}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MessageThread; 