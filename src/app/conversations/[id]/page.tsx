'use client';

import React, { useState, useEffect } from 'react';
import Navigation from '../../../components/Navigation';
import Link from 'next/link';
import { 
  ArrowLeft,
  MessageSquare,
  Star,
  ThumbsUp,
  ThumbsDown,
  Minus,
  Clock,
  BrainCircuit,
  Target,
  TrendingUp,
  Lightbulb,
  AlertTriangle,
  User,
  Bot,
  Monitor,
  Globe,
  CheckCircle,
  Loader,
  Database,
  LayoutGrid,
  MousePointerClick
} from 'lucide-react';

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
        
        const resolvedParams = await params;
        const id = resolvedParams.id;
        setConversationId(id);
        
        console.log(`🔍 Loading conversation from database: ${id}`);
        
        // Fetch conversation details from the API
        const conversationsResponse = await fetch(`/api/conversations?limit=5000&offset=0&sourceType=ai`);
        const conversationsResult = await conversationsResponse.json();
        
        const foundConversation = conversationsResult.conversations?.find((conv: any) => conv.id === id);
        
        if (foundConversation) {
          console.log('✅ Found conversation:', foundConversation);
          setConversation({
            ...foundConversation,
            user: {
              id: foundConversation.senderID,
              sessionId: 'SESSION-001',
              browser: 'Chrome',
              device: 'Desktop',
              location: 'Unknown Location',
            }
          });
          
          // Fetch messages from database
          console.log(`🔍 Loading messages for conversation: ${id}`);
          const messagesResponse = await fetch(`/api/messages?id=${id}`);
          const messagesResult = await messagesResponse.json();
          
          if (messagesResponse.ok) {
            console.log('✅ Messages loaded:', {
              messageCount: messagesResult.messageCount,
              method: messagesResult.method,
              source: messagesResult.source
            });
            setConversationData(messagesResult);
          } else {
            console.log('⚠️ No messages found:', messagesResult);
            setConversationData({
              conversationId: id,
              messageCount: 0,
              messages: [],
              method: 'empty',
              source: 'none'
            });
          }
        } else {
          console.log('❌ Conversation not found in database');
          setConversation(null);
        }
      } catch (error) {
        console.error('Error fetching conversation data:', error);
        setConversation(null);
      } finally {
        setLoading(false);
      }
    };

    fetchConversationData();
  }, [params]);

  const getSentimentIcon = (sentiment: string) => {
    switch (sentiment?.toLowerCase()) {
      case 'positive':
        return <ThumbsUp className="h-5 w-5" />;
      case 'negative':
        return <ThumbsDown className="h-5 w-5" />;
      default:
        return <Minus className="h-5 w-5" />;
    }
  };

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment?.toLowerCase()) {
      case 'positive':
        return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';
      case 'negative':
        return 'text-rose-400 bg-rose-500/10 border-rose-500/30';
      default:
        return 'text-blue-400 bg-blue-500/10 border-blue-500/30';
    }
  };

  const getQualityColor = (score: number) => {
    if (score >= 80) return 'text-emerald-400';
    if (score >= 60) return 'text-amber-400';
    return 'text-rose-400';
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'completed':
        return 'text-emerald-400 bg-emerald-500/10';
      case 'escalated':
        return 'text-rose-400 bg-rose-500/10';
      case 'needs review':
        return 'text-amber-400 bg-amber-500/10';
      case 'pending':
        return 'text-blue-400 bg-blue-500/10';
      default:
        return 'text-gray-400 bg-gray-500/10';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white">
        <Navigation />
        <div className="container mx-auto px-4 py-8 pt-24">
          <div className="flex items-center justify-center min-h-[400px]">
            <Loader className="animate-spin text-blue-400 mr-3" size={24} />
            <span className="text-white text-lg">Loading conversation from database...</span>
          </div>
        </div>
      </div>
    );
  }

  if (!conversation) {
    return (
      <div className="min-h-screen bg-gray-900 text-white">
        <Navigation />
        <div className="container mx-auto px-4 py-8 pt-24">
          <Link 
            href="/conversations"
            className="inline-flex items-center text-gray-400 hover:text-white mb-6 transition-colors"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Conversations
          </Link>
          
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-8 text-center">
            <MessageSquare className="h-12 w-12 text-gray-600 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-white mb-2">Conversation Not Found</h2>
            <p className="text-gray-400">This conversation could not be found in the database.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <Navigation />
      <div className="container mx-auto px-4 py-8 pt-24">
        {/* Back Link */}
        <Link 
          href="/conversations"
          className="inline-flex items-center text-gray-400 hover:text-white mb-6 transition-colors"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Conversations
        </Link>

        {/* Header Card */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600 via-cyan-600 to-teal-600 p-8 mb-8">
          <div className="absolute inset-0 bg-black/20 backdrop-blur-sm"></div>
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent"></div>
          
          <div className="relative z-10">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="p-4 bg-white/10 backdrop-blur-md rounded-xl border border-white/20 mr-6">
                  <Bot className="h-10 w-10 text-white" />
                </div>
                <div>
                  <div className="flex items-center space-x-3 mb-2">
                    <h1 className="text-2xl font-bold text-white">{conversation.id.slice(0, 8)}...</h1>
                    <span className="flex items-center space-x-1 px-2 py-1 bg-white/10 rounded-lg text-xs">
                      <Database className="h-3 w-3" />
                      <span>Supabase</span>
                    </span>
                  </div>
                  <p className="text-white/70">Sender: {conversation.senderID}</p>
                </div>
              </div>

              <div className="flex items-center space-x-4">
                <span className={`flex items-center space-x-2 px-4 py-2 rounded-full border ${getSentimentColor(conversation.sentiment)}`}>
                  {getSentimentIcon(conversation.sentiment)}
                  <span className="capitalize font-medium">{conversation.sentiment}</span>
                </span>
                <span className={`px-4 py-2 rounded-full font-medium ${getStatusColor(conversation.status)}`}>
                  {conversation.status}
                </span>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-8">
              <div className="bg-white/10 backdrop-blur-md rounded-lg p-4 border border-white/20">
                <div className="flex items-center space-x-2 mb-2">
                  <Star className="h-5 w-5 text-amber-400" />
                  <span className="text-white/70 text-sm">Quality Score</span>
                </div>
                <p className={`text-3xl font-bold ${getQualityColor(conversation.qualityScore)}`}>
                  {conversation.qualityScore}%
                </p>
              </div>
              <div className="bg-white/10 backdrop-blur-md rounded-lg p-4 border border-white/20">
                <div className="flex items-center space-x-2 mb-2">
                  <MessageSquare className="h-5 w-5 text-blue-400" />
                  <span className="text-white/70 text-sm">Messages</span>
                </div>
                <p className="text-3xl font-bold text-white">
                  {conversation.messages || conversation.conversationLength || 0}
                </p>
              </div>
              <div className="bg-white/10 backdrop-blur-md rounded-lg p-4 border border-white/20">
                <div className="flex items-center space-x-2 mb-2">
                  <Clock className="h-5 w-5 text-violet-400" />
                  <span className="text-white/70 text-sm">Duration</span>
                </div>
                <p className="text-2xl font-bold text-white">
                  {conversation.duration || 'N/A'}
                </p>
              </div>
              <div className="bg-white/10 backdrop-blur-md rounded-lg p-4 border border-white/20">
                <div className="flex items-center space-x-2 mb-2">
                  <Target className="h-5 w-5 text-cyan-400" />
                  <span className="text-white/70 text-sm">Intent</span>
                </div>
                <p className="text-lg font-bold text-white truncate">
                  {conversation.intent || 'N/A'}
                </p>
              </div>
              <div className="bg-white/10 backdrop-blur-md rounded-lg p-4 border border-white/20">
                <div className="flex items-center space-x-2 mb-2">
                  <BrainCircuit className="h-5 w-5 text-amber-400" />
                  <span className="text-white/70 text-sm">Knowledge Gaps</span>
                </div>
                <p className="text-3xl font-bold text-amber-400">
                  {conversation.knowledgeGaps?.length || 0}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr,400px] gap-6">
          {/* Messages Section */}
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6">
            <h2 className="text-xl font-bold text-white mb-6 flex items-center">
              <MessageSquare className="h-5 w-5 mr-2 text-blue-400" />
              Conversation Thread
              {conversationData?.source && (
                <span className="ml-3 text-xs px-2 py-1 bg-gray-700 rounded text-gray-400">
                  Source: {conversationData.source}
                </span>
              )}
            </h2>

            {conversationData?.messages && conversationData.messages.length > 0 ? (
              <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
                {conversationData.messages.map((msg: any, idx: number) => {
                  const isBot = msg.from === 'bot' || msg.sender === 'agent' || msg.sender === 'bot';
                  return (
                    <div 
                      key={msg.ID || msg.id || idx}
                      className={`flex ${isBot ? 'justify-start' : 'justify-end'}`}
                    >
                      <div className={`max-w-[80%] ${isBot ? 'order-2' : 'order-1'}`}>
                        <div className={`flex items-center space-x-2 mb-1 ${isBot ? '' : 'justify-end'}`}>
                          {isBot ? (
                            <Bot className="h-4 w-4 text-blue-400" />
                          ) : (
                            <User className="h-4 w-4 text-emerald-400" />
                          )}
                          <span className="text-xs text-gray-400">
                            {isBot ? 'Bot' : 'User'}
                          </span>
                          {(msg.TimeSent || msg.timestamp) && (
                            <span className="text-xs text-gray-500">
                              {new Date(msg.TimeSent || msg.timestamp).toLocaleTimeString()}
                            </span>
                          )}
                        </div>
                        <div className={`rounded-xl p-4 ${
                          isBot 
                            ? 'bg-gray-700/50 text-gray-200' 
                            : msg.isCardSelection
                              ? 'bg-violet-600/20 text-violet-100 border border-violet-500/30'
                              : 'bg-blue-600/20 text-blue-100 border border-blue-500/30'
                        }`}>
                          {msg.isCardSelection && (
                            <div className="flex items-center space-x-1 text-violet-400 text-xs mb-2">
                              <MousePointerClick className="h-3 w-3" />
                              <span>Card Selected</span>
                            </div>
                          )}
                          {(msg.MessageText || msg.text || msg.content || !(msg.cardsList && msg.cardsList.length > 0)) && (
                            <p className="text-sm leading-relaxed">
                              {msg.MessageText || msg.text || msg.content || 'No message content'}
                            </p>
                          )}
                          {msg.cardsList && msg.cardsList.length > 0 && (
                            <div className="mt-3 pt-3 border-t border-gray-600/50">
                              <div className="flex items-center space-x-1 text-gray-400 text-xs mb-2">
                                <LayoutGrid className="h-3 w-3" />
                                <span>Options presented ({msg.cardsList.length})</span>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                {msg.cardsList.slice(0, 6).map((card: any, cardIdx: number) => (
                                  <span 
                                    key={cardIdx}
                                    className="px-2 py-1 bg-gray-600/50 rounded text-xs text-gray-300 truncate max-w-[150px]"
                                    title={card.title}
                                  >
                                    {card.title?.replace('VMENU:', '').replace('CAROUSEL:', '')}
                                  </span>
                                ))}
                                {msg.cardsList.length > 6 && (
                                  <span className="px-2 py-1 text-xs text-gray-500">
                                    +{msg.cardsList.length - 6} more
                                  </span>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12">
                <MessageSquare className="h-12 w-12 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400">No messages available for this conversation.</p>
                <p className="text-gray-500 text-sm mt-2">
                  Messages may not have been ingested into the database yet.
                </p>
              </div>
            )}
          </div>

          {/* Analytics Panel */}
          <div className="space-y-6">
            {/* Session Info */}
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Session Info</h3>
              <div className="space-y-4">
                <div className="flex items-center text-gray-300">
                  <User className="h-4 w-4 text-gray-400 mr-3" />
                  <span className="text-sm">Sender: {conversation.senderID || 'Unknown'}</span>
                </div>
                <div className="flex items-center text-gray-300">
                  <Database className="h-4 w-4 text-gray-400 mr-3" />
                  <span className="text-sm">ID: {conversation.id.slice(0, 12)}...</span>
                </div>
                {conversation.timestamp && (
                  <div className="flex items-center text-gray-300">
                    <Clock className="h-4 w-4 text-gray-400 mr-3" />
                    <span className="text-sm">{new Date(conversation.timestamp).toLocaleString()}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Summary */}
            {conversation.summary && (
              <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                  <Lightbulb className="h-5 w-5 mr-2 text-yellow-400" />
                  Summary
                </h3>
                <p className="text-gray-300 text-sm leading-relaxed">{conversation.summary}</p>
              </div>
            )}

            {/* Knowledge Gaps */}
            {conversation.knowledgeGaps && conversation.knowledgeGaps.length > 0 && (
              <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                  <BrainCircuit className="h-5 w-5 mr-2 text-amber-400" />
                  Knowledge Gaps
                </h3>
                <ul className="space-y-2">
                  {conversation.knowledgeGaps.map((gap: string, i: number) => (
                    <li key={i} className="flex items-start text-sm">
                      <AlertTriangle className="h-4 w-4 text-amber-400 mr-2 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-300">{gap}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Recommendations */}
            {conversation.recommendations && conversation.recommendations.length > 0 && (
              <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                  <Lightbulb className="h-5 w-5 mr-2 text-yellow-400" />
                  Recommendations
                </h3>
                <ul className="space-y-2">
                  {conversation.recommendations.map((rec: string, i: number) => (
                    <li key={i} className="flex items-start text-sm">
                      <CheckCircle className="h-4 w-4 text-emerald-400 mr-2 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-300">{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Trends */}
            {conversation.trends && conversation.trends.length > 0 && (
              <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                  <TrendingUp className="h-5 w-5 mr-2 text-violet-400" />
                  Observed Trends
                </h3>
                <ul className="space-y-2">
                  {conversation.trends.map((trend: string, i: number) => (
                    <li key={i} className="flex items-start text-sm">
                      <span className="w-2 h-2 bg-violet-400 rounded-full mr-3 mt-1.5 flex-shrink-0" />
                      <span className="text-gray-300">{trend}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Metrics Summary */}
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Analytics Summary</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-900/50 rounded-lg p-4">
                  <div className="flex items-center space-x-2 mb-1">
                    <Clock className="h-4 w-4 text-emerald-400" />
                    <span className="text-sm text-gray-400">Response Time</span>
                  </div>
                  <span className="text-lg font-bold text-white">
                    {conversation.firstResponseTime ? `${conversation.firstResponseTime}ms` : 'N/A'}
                  </span>
                </div>
                <div className="bg-gray-900/50 rounded-lg p-4">
                  <div className="flex items-center space-x-2 mb-1">
                    <MessageSquare className="h-4 w-4 text-blue-400" />
                    <span className="text-sm text-gray-400">Total Messages</span>
                  </div>
                  <span className="text-lg font-bold text-white">
                    {conversation.messages || conversation.conversationLength || 0}
                  </span>
                </div>
                <div className="bg-gray-900/50 rounded-lg p-4">
                  <div className="flex items-center space-x-2 mb-1">
                    <BrainCircuit className="h-4 w-4 text-violet-400" />
                    <span className="text-sm text-gray-400">Knowledge Gaps</span>
                  </div>
                  <span className="text-lg font-bold text-white">
                    {conversation.knowledgeGaps?.length || 0}
                  </span>
                </div>
                <div className="bg-gray-900/50 rounded-lg p-4">
                  <div className="flex items-center space-x-2 mb-1">
                    <Star className="h-4 w-4 text-yellow-400" />
                    <span className="text-sm text-gray-400">Quality Score</span>
                  </div>
                  <span className={`text-lg font-bold ${getQualityColor(conversation.qualityScore)}`}>
                    {conversation.qualityScore}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConversationDetails;
