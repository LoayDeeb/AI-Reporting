'use client';

import React, { useState, useEffect } from 'react';
import Navigation from '../../../../components/Navigation';
import Link from 'next/link';
import { 
  ArrowLeft,
  MessageSquare,
  Star,
  Heart,
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
  Users,
  CheckCircle,
  Loader,
  Database,
  BookOpen,
  Activity
} from 'lucide-react';

interface ConversationDetailsProps {
  params: Promise<{
    id: string;
  }>;
}

const HumanAgentConversationDetails = ({ params }: ConversationDetailsProps) => {
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
        
        console.log(`🔍 Loading human agent conversation from database: ${id}`);
        
        // Fetch conversation details from the API
        const conversationsResponse = await fetch(`/api/human-agents/conversations?limit=5000&offset=0`);
        const conversationsResult = await conversationsResponse.json();
        
        const foundConversation = conversationsResult.conversations?.find((conv: any) => conv.id === id);
        
        if (foundConversation) {
          console.log('✅ Found human agent conversation:', foundConversation);
          setConversation(foundConversation);
          
          // Fetch messages from database
          console.log(`🔍 Loading messages for conversation: ${id}`);
          const messagesResponse = await fetch(`/api/messages?id=${id}`);
          const messagesResult = await messagesResponse.json();
          
          if (messagesResponse.ok && messagesResult.messages?.length > 0) {
            console.log('✅ Messages loaded:', {
              messageCount: messagesResult.messageCount,
              method: messagesResult.method,
              source: messagesResult.source
            });
            setConversationData(messagesResult);
          } else {
            console.log('⚠️ No messages found, generating mock messages');
            // Generate mock messages based on conversation data
            setConversationData({
              conversationId: id,
              messageCount: foundConversation.conversation_length,
              messages: generateMockMessages(foundConversation),
              method: 'mock',
              source: 'generated'
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

  const generateMockMessages = (conv: any) => {
    const messages = [];
    const totalMessages = conv.conversation_length || 6;
    
    const scenarios = [
      { sender: 'customer', text: `Hi, I need help with my account.` },
      { sender: 'agent', text: `Hello! I'm ${conv.agent_name} and I'll be happy to help you today. What can I assist you with?` },
      { sender: 'customer', text: `I'm having trouble accessing my account settings.` },
      { sender: 'agent', text: `I understand. Let me look into that for you. Can you tell me what error you're seeing?` },
      { sender: 'customer', text: `It just says "Access Denied" when I try to change my password.` },
      { sender: 'agent', text: `I see the issue. I've reset your access permissions. Please try again now, and let me know if it works.` },
    ];

    const baseTime = Date.now() - (totalMessages * 2 * 60 * 1000);
    
    for (let i = 0; i < Math.min(totalMessages, scenarios.length); i++) {
      const template = scenarios[i];
      messages.push({
        id: `msg-${i}`,
        text: template.text,
        content: template.text,
        timestamp: new Date(baseTime + (i * 2 * 60 * 1000)).toISOString(),
        sender: template.sender,
        senderName: template.sender === 'agent' ? conv.agent_name : conv.customer_name,
        sentiment: i === 0 ? conv.initial_sentiment : 
                   i === scenarios.length - 1 ? conv.final_sentiment : 'neutral'
      });
    }

    return messages;
  };

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

  const getEscalationColor = (risk: number) => {
    if (risk >= 70) return 'text-rose-400';
    if (risk >= 40) return 'text-amber-400';
    return 'text-emerald-400';
  };

  const formatResolutionTime = (time: number | null) => {
    if (!time) return 'N/A';
    const minutes = Math.floor(time / 60);
    const seconds = time % 60;
    return `${minutes}m ${seconds}s`;
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
            href="/human-agents/conversations"
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
          href="/human-agents/conversations"
          className="inline-flex items-center text-gray-400 hover:text-white mb-6 transition-colors"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Conversations
        </Link>

        {/* Header Card */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-purple-600 via-pink-600 to-rose-600 p-8 mb-8">
          <div className="absolute inset-0 bg-black/20 backdrop-blur-sm"></div>
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent"></div>
          
          <div className="relative z-10">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="p-4 bg-white/10 backdrop-blur-md rounded-xl border border-white/20 mr-6">
                  <Users className="h-10 w-10 text-white" />
                </div>
                <div>
                  <div className="flex items-center space-x-3 mb-2">
                    <h1 className="text-2xl font-bold text-white">{conversation.agent_name}</h1>
                    <span className="text-white/50">→</span>
                    <span className="text-white/80">{conversation.customer_name}</span>
                    <span className="flex items-center space-x-1 px-2 py-1 bg-white/10 rounded-lg text-xs">
                      <Database className="h-3 w-3" />
                      <span>Supabase</span>
                    </span>
                  </div>
                  <p className="text-white/70">ID: {conversation.id.slice(0, 12)}...</p>
                </div>
              </div>

              <div className="flex items-center space-x-4">
                <span className={`flex items-center space-x-2 px-4 py-2 rounded-full border ${getSentimentColor(conversation.final_sentiment)}`}>
                  {getSentimentIcon(conversation.final_sentiment)}
                  <span className="capitalize font-medium">{conversation.final_sentiment}</span>
                </span>
                {conversation.sentiment_change && conversation.sentiment_change !== 'maintained' && (
                  <span className="px-3 py-1 bg-white/10 rounded-full text-xs text-white/70">
                    {conversation.sentiment_change}
                  </span>
                )}
              </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mt-8">
              <div className="bg-white/10 backdrop-blur-md rounded-lg p-4 border border-white/20">
                <div className="flex items-center space-x-2 mb-2">
                  <Star className="h-5 w-5 text-emerald-400" />
                  <span className="text-white/70 text-sm">Quality</span>
                </div>
                <p className={`text-3xl font-bold ${getQualityColor(conversation.quality_score)}`}>
                  {conversation.quality_score}%
                </p>
              </div>
              <div className="bg-white/10 backdrop-blur-md rounded-lg p-4 border border-white/20">
                <div className="flex items-center space-x-2 mb-2">
                  <Heart className="h-5 w-5 text-fuchsia-400" />
                  <span className="text-white/70 text-sm">Empathy</span>
                </div>
                <p className={`text-3xl font-bold ${getQualityColor(conversation.empathy_score)}`}>
                  {conversation.empathy_score}%
                </p>
              </div>
              <div className="bg-white/10 backdrop-blur-md rounded-lg p-4 border border-white/20">
                <div className="flex items-center space-x-2 mb-2">
                  <AlertTriangle className="h-5 w-5 text-amber-400" />
                  <span className="text-white/70 text-sm">Escalation</span>
                </div>
                <p className={`text-3xl font-bold ${getEscalationColor(conversation.escalation_risk)}`}>
                  {conversation.escalation_risk}%
                </p>
              </div>
              <div className="bg-white/10 backdrop-blur-md rounded-lg p-4 border border-white/20">
                <div className="flex items-center space-x-2 mb-2">
                  <MessageSquare className="h-5 w-5 text-blue-400" />
                  <span className="text-white/70 text-sm">Messages</span>
                </div>
                <p className="text-3xl font-bold text-white">
                  {conversation.conversation_length}
                </p>
              </div>
              <div className="bg-white/10 backdrop-blur-md rounded-lg p-4 border border-white/20">
                <div className="flex items-center space-x-2 mb-2">
                  <Clock className="h-5 w-5 text-violet-400" />
                  <span className="text-white/70 text-sm">Resolution</span>
                </div>
                <p className="text-2xl font-bold text-white">
                  {formatResolutionTime(conversation.resolution_time)}
                </p>
              </div>
              <div className="bg-white/10 backdrop-blur-md rounded-lg p-4 border border-white/20">
                <div className="flex items-center space-x-2 mb-2">
                  <Activity className="h-5 w-5 text-cyan-400" />
                  <span className="text-white/70 text-sm">Script</span>
                </div>
                <p className={`text-3xl font-bold ${getQualityColor(conversation.script_adherence)}`}>
                  {conversation.script_adherence}%
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
                  const isAgent = msg.sender === 'agent';
                  return (
                    <div 
                      key={msg.id || idx}
                      className={`flex ${isAgent ? 'justify-start' : 'justify-end'}`}
                    >
                      <div className={`max-w-[80%]`}>
                        <div className={`flex items-center space-x-2 mb-1 ${isAgent ? '' : 'justify-end'}`}>
                          {isAgent ? (
                            <Users className="h-4 w-4 text-purple-400" />
                          ) : (
                            <User className="h-4 w-4 text-emerald-400" />
                          )}
                          <span className="text-xs text-gray-400">
                            {msg.senderName || (isAgent ? conversation.agent_name : conversation.customer_name)}
                          </span>
                          {msg.timestamp && (
                            <span className="text-xs text-gray-500">
                              {new Date(msg.timestamp).toLocaleTimeString()}
                            </span>
                          )}
                        </div>
                        <div className={`rounded-xl p-4 ${
                          isAgent 
                            ? 'bg-purple-600/20 text-purple-100 border border-purple-500/30' 
                            : 'bg-gray-700/50 text-gray-200'
                        }`}>
                          <p className="text-sm leading-relaxed">
                            {msg.text || msg.content || 'No message content'}
                          </p>
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
            {/* Agent & Customer Info */}
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Participants</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-gray-700/30 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white font-bold">
                      {conversation.agent_name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-white font-medium">{conversation.agent_name}</p>
                      <p className="text-gray-400 text-xs">Agent</p>
                    </div>
                  </div>
                  <span className="text-gray-400 text-sm">{conversation.agent_response_count} msgs</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-700/30 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full flex items-center justify-center text-white font-bold">
                      {conversation.customer_name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-white font-medium">{conversation.customer_name}</p>
                      <p className="text-gray-400 text-xs">Customer</p>
                    </div>
                  </div>
                  <span className="text-gray-400 text-sm">{conversation.customer_message_count} msgs</span>
                </div>
              </div>
            </div>

            {/* Sentiment Journey */}
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                <TrendingUp className="h-5 w-5 mr-2 text-violet-400" />
                Sentiment Journey
              </h3>
              <div className="flex items-center justify-between">
                <div className="text-center">
                  <span className={`flex items-center space-x-1 px-3 py-2 rounded-lg ${getSentimentColor(conversation.initial_sentiment)}`}>
                    {getSentimentIcon(conversation.initial_sentiment)}
                    <span className="capitalize">{conversation.initial_sentiment}</span>
                  </span>
                  <p className="text-gray-500 text-xs mt-1">Initial</p>
                </div>
                <div className="flex-1 mx-4 h-1 bg-gray-700 rounded relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-gray-600 via-violet-500 to-emerald-500 rounded"></div>
                </div>
                <div className="text-center">
                  <span className={`flex items-center space-x-1 px-3 py-2 rounded-lg ${getSentimentColor(conversation.final_sentiment)}`}>
                    {getSentimentIcon(conversation.final_sentiment)}
                    <span className="capitalize">{conversation.final_sentiment}</span>
                  </span>
                  <p className="text-gray-500 text-xs mt-1">Final</p>
                </div>
              </div>
            </div>

            {/* Knowledge Gaps */}
            {conversation.knowledge_gaps && conversation.knowledge_gaps.length > 0 && (
              <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                  <BookOpen className="h-5 w-5 mr-2 text-amber-400" />
                  Knowledge Gaps
                </h3>
                <ul className="space-y-2">
                  {conversation.knowledge_gaps.map((gap: string, i: number) => (
                    <li key={i} className="flex items-start text-sm">
                      <AlertTriangle className="h-4 w-4 text-amber-400 mr-2 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-300">{gap}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Coaching Opportunities */}
            {conversation.coaching_opportunities && conversation.coaching_opportunities.length > 0 && (
              <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                  <Lightbulb className="h-5 w-5 mr-2 text-yellow-400" />
                  Coaching Opportunities
                </h3>
                <ul className="space-y-2">
                  {conversation.coaching_opportunities.map((opp: string, i: number) => (
                    <li key={i} className="flex items-start text-sm">
                      <CheckCircle className="h-4 w-4 text-yellow-400 mr-2 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-300">{opp}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Root Causes */}
            {conversation.root_causes && conversation.root_causes.length > 0 && (
              <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                  <Target className="h-5 w-5 mr-2 text-rose-400" />
                  Root Causes
                </h3>
                <ul className="space-y-2">
                  {conversation.root_causes.map((cause: string, i: number) => (
                    <li key={i} className="flex items-start text-sm">
                      <span className="w-2 h-2 bg-rose-400 rounded-full mr-3 mt-1.5 flex-shrink-0" />
                      <span className="text-gray-300">{cause}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Metrics Summary */}
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Performance Metrics</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-900/50 rounded-lg p-4">
                  <div className="flex items-center space-x-2 mb-1">
                    <Star className="h-4 w-4 text-emerald-400" />
                    <span className="text-sm text-gray-400">Quality</span>
                  </div>
                  <span className={`text-lg font-bold ${getQualityColor(conversation.quality_score)}`}>
                    {conversation.quality_score}%
                  </span>
                </div>
                <div className="bg-gray-900/50 rounded-lg p-4">
                  <div className="flex items-center space-x-2 mb-1">
                    <Heart className="h-4 w-4 text-fuchsia-400" />
                    <span className="text-sm text-gray-400">Empathy</span>
                  </div>
                  <span className={`text-lg font-bold ${getQualityColor(conversation.empathy_score)}`}>
                    {conversation.empathy_score}%
                  </span>
                </div>
                <div className="bg-gray-900/50 rounded-lg p-4">
                  <div className="flex items-center space-x-2 mb-1">
                    <Activity className="h-4 w-4 text-blue-400" />
                    <span className="text-sm text-gray-400">Script</span>
                  </div>
                  <span className={`text-lg font-bold ${getQualityColor(conversation.script_adherence)}`}>
                    {conversation.script_adherence}%
                  </span>
                </div>
                <div className="bg-gray-900/50 rounded-lg p-4">
                  <div className="flex items-center space-x-2 mb-1">
                    <AlertTriangle className="h-4 w-4 text-amber-400" />
                    <span className="text-sm text-gray-400">Escalation</span>
                  </div>
                  <span className={`text-lg font-bold ${getEscalationColor(conversation.escalation_risk)}`}>
                    {conversation.escalation_risk}%
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

export default HumanAgentConversationDetails;
