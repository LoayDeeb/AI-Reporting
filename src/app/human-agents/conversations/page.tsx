'use client';

import React, { useState, useEffect, useCallback } from 'react';
import SearchBar from '@/components/conversations/SearchBar';
import Navigation from '../../../components/Navigation';
import { Users, MessageSquareIcon, Star, Heart, AlertTriangle, CheckCircle, Clock, User, Filter, Search, ChevronLeft, ChevronRight, LoaderIcon } from 'lucide-react';

export interface HumanAgentConversationData {
  conversation_id: string;
  agent_name: string;
  customer_name: string;
  conversation_length: number;
  agent_response_count: number;
  customer_message_count: number;
  resolution_time: number | null;
  sentiment_change: string;
  initial_sentiment: string;
  final_sentiment: string;
  categories: string[];
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
  emotions: string[];
}

export interface HumanAgentFilterState {
  sentiment: string[];
  qualityScore: number[];
  empathyScore: number[];
  escalationRisk: number[];
  agents: string[];
  categories: string[];
}

const ITEMS_PER_PAGE = 25;

const HumanAgentConversations = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [conversations, setConversations] = useState<HumanAgentConversationData[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [activeFilters, setActiveFilters] = useState<HumanAgentFilterState>({
    sentiment: [],
    qualityScore: [0, 100],
    empathyScore: [0, 100],
    escalationRisk: [0, 100],
    agents: [],
    categories: [],
  });

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    loadHumanAgentConversations();
  }, []);

  const loadHumanAgentConversations = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/analyze-human-agents?action=analyze');
      const data = await response.json();
      
      if (data.analytics) {
        setConversations(data.analytics);
        console.log('✅ Human agent conversations loaded:', {
          received: data.analytics.length,
          total: data.total_conversations
        });
      } else {
        console.log('❌ No human agent conversations in API response:', data);
      }
    } catch (error) {
      console.error('Error loading human agent conversations:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSearchChange = useCallback((query: string) => {
    setSearchQuery(query);
    setCurrentPage(1);
  }, []);

  // Filter conversations
  const filteredConversations = React.useMemo(() => {
    if (conversations.length === 0) return [];
    
    return conversations.filter((conv) => {
      // Search filter
      if (debouncedSearchQuery) {
        const query = debouncedSearchQuery.toLowerCase();
        if (
          !conv.conversation_id.toLowerCase().includes(query) &&
          !conv.agent_name.toLowerCase().includes(query) &&
          !conv.customer_name.toLowerCase().includes(query) &&
          !conv.final_sentiment.toLowerCase().includes(query)
        ) {
          return false;
        }
      }

      // Sentiment filter
      if (activeFilters.sentiment.length > 0) {
        if (!activeFilters.sentiment.includes(conv.final_sentiment)) {
          return false;
        }
      }

      // Quality score filter
      if (
        conv.quality_score < activeFilters.qualityScore[0] ||
        conv.quality_score > activeFilters.qualityScore[1]
      ) {
        return false;
      }

      // Empathy score filter
      if (
        conv.empathy_score < activeFilters.empathyScore[0] ||
        conv.empathy_score > activeFilters.empathyScore[1]
      ) {
        return false;
      }

      // Escalation risk filter
      if (
        conv.escalation_risk < activeFilters.escalationRisk[0] ||
        conv.escalation_risk > activeFilters.escalationRisk[1]
      ) {
        return false;
      }

      // Agent filter
      if (activeFilters.agents.length > 0) {
        if (!activeFilters.agents.includes(conv.agent_name)) {
          return false;
        }
      }

      return true;
    });
  }, [conversations, debouncedSearchQuery, activeFilters]);

  // Paginated conversations
  const paginatedConversations = React.useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return filteredConversations.slice(startIndex, endIndex);
  }, [filteredConversations, currentPage]);

  const totalPages = Math.ceil(filteredConversations.length / ITEMS_PER_PAGE);

  // Get unique agents for filter
  const uniqueAgents = React.useMemo(() => {
    return [...new Set(conversations.map(conv => conv.agent_name))].sort();
  }, [conversations]);

  // Get unique sentiments for filter
  const uniqueSentiments = React.useMemo(() => {
    return [...new Set(conversations.map(conv => conv.final_sentiment))].sort();
  }, [conversations]);

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment.toLowerCase()) {
      case 'positive':
        return 'text-emerald-400 bg-emerald-500/10';
      case 'neutral':
        return 'text-blue-400 bg-blue-500/10';
      case 'negative':
        return 'text-rose-400 bg-rose-500/10';
      default:
        return 'text-gray-400 bg-gray-500/10';
    }
  };

  const getQualityColor = (score: number) => {
    if (score >= 80) return 'text-emerald-400';
    if (score >= 60) return 'text-amber-400';
    return 'text-rose-400';
  };

  const getEscalationRiskColor = (risk: number) => {
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
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-8">
            <div className="flex items-center justify-center">
              <LoaderIcon className="animate-spin text-blue-400 mr-3" size={24} />
              <span className="text-gray-300">Loading human agent conversations...</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <Navigation />
      <div className="container mx-auto px-4 py-8 pt-24">
        {/* Header */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-purple-600 via-pink-600 to-rose-600 p-8 mb-8">
          {/* Background Pattern */}
          <div className="absolute inset-0 bg-black/20 backdrop-blur-sm"></div>
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent"></div>
          
          {/* Floating Elements */}
          <div className="absolute top-4 right-4 w-32 h-32 bg-white/5 rounded-full blur-xl"></div>
          <div className="absolute bottom-4 left-4 w-24 h-24 bg-white/5 rounded-full blur-xl"></div>
          
          <div className="relative z-10">
            <div className="flex items-center mb-4">
              <div className="p-3 bg-white/10 backdrop-blur-md rounded-xl border border-white/20 mr-4">
                <MessageSquareIcon className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-white/90">
                  Human Agent Conversations
                </h1>
                <p className="text-white/70 mt-2 text-lg">
                  Detailed conversation analysis and performance insights
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4 mt-6">
              <span className="px-3 py-1 bg-white/10 backdrop-blur-md rounded-full text-white/90 text-sm border border-white/20">
                <MessageSquareIcon className="h-4 w-4 inline mr-1" />
                {filteredConversations.length} conversations
              </span>
              {filteredConversations.length !== conversations.length && (
                <span className="px-3 py-1 bg-amber-500/20 backdrop-blur-md rounded-full text-amber-300 text-sm border border-amber-500/30">
                  Filtered from {conversations.length} total
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="grid grid-cols-1 lg:grid-cols-[350px,1fr] gap-6 mb-8">
          {/* Filters Sidebar */}
          <div className="space-y-6">
            {/* Search */}
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50">
              <div className="flex items-center mb-4">
                <Search className="h-5 w-5 text-gray-400 mr-2" />
                <h3 className="text-lg font-semibold text-white">Search</h3>
              </div>
              <SearchBar onSearch={handleSearchChange} />
            </div>

            {/* Agent Filter */}
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50">
              <div className="flex items-center mb-4">
                <User className="h-5 w-5 text-blue-400 mr-2" />
                <h3 className="text-lg font-semibold text-white">Agents</h3>
              </div>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {uniqueAgents.map((agent) => (
                  <label key={agent} className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={activeFilters.agents.includes(agent)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setActiveFilters(prev => ({
                            ...prev,
                            agents: [...prev.agents, agent]
                          }));
                        } else {
                          setActiveFilters(prev => ({
                            ...prev,
                            agents: prev.agents.filter(a => a !== agent)
                          }));
                        }
                        setCurrentPage(1);
                      }}
                      className="rounded border-gray-600 bg-gray-700 text-blue-500 focus:ring-blue-500"
                    />
                    <span className="text-gray-300 text-sm">{agent}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Sentiment Filter */}
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50">
              <div className="flex items-center mb-4">
                <Heart className="h-5 w-5 text-fuchsia-400 mr-2" />
                <h3 className="text-lg font-semibold text-white">Sentiment</h3>
              </div>
              <div className="space-y-2">
                {uniqueSentiments.map((sentiment) => (
                  <label key={sentiment} className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={activeFilters.sentiment.includes(sentiment)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setActiveFilters(prev => ({
                            ...prev,
                            sentiment: [...prev.sentiment, sentiment]
                          }));
                        } else {
                          setActiveFilters(prev => ({
                            ...prev,
                            sentiment: prev.sentiment.filter(s => s !== sentiment)
                          }));
                        }
                        setCurrentPage(1);
                      }}
                      className="rounded border-gray-600 bg-gray-700 text-blue-500 focus:ring-blue-500"
                    />
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getSentimentColor(sentiment)}`}>
                      {sentiment}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Conversations Table */}
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 overflow-hidden">
            {/* Table Header */}
            <div className="p-6 border-b border-gray-700">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold text-white">
                  Conversations ({filteredConversations.length})
                </h3>
                {totalPages > 1 && (
                  <div className="flex items-center space-x-4">
                    <span className="text-sm text-gray-400">
                      Page {currentPage} of {totalPages}
                    </span>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                        disabled={currentPage === 1}
                        className="p-2 rounded-lg bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                        disabled={currentPage === totalPages}
                        className="p-2 rounded-lg bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Table Content */}
            {paginatedConversations.length === 0 ? (
              <div className="p-8 text-center">
                <MessageSquareIcon className="mx-auto text-gray-400 mb-4" size={48} />
                <h3 className="text-lg font-medium text-gray-300 mb-2">No Conversations Found</h3>
                <p className="text-gray-400">
                  {conversations.length === 0 
                    ? "Run a human agent analysis first to see conversation data here."
                    : "Try adjusting your search criteria or filters."
                  }
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-700">
                      <th className="px-6 py-4 text-left text-sm font-medium text-gray-400">Agent</th>
                      <th className="px-6 py-4 text-left text-sm font-medium text-gray-400">Customer</th>
                      <th className="px-6 py-4 text-left text-sm font-medium text-gray-400">Quality</th>
                      <th className="px-6 py-4 text-left text-sm font-medium text-gray-400">Empathy</th>
                      <th className="px-6 py-4 text-left text-sm font-medium text-gray-400">Sentiment</th>
                      <th className="px-6 py-4 text-left text-sm font-medium text-gray-400">Escalation Risk</th>
                      <th className="px-6 py-4 text-left text-sm font-medium text-gray-400">Messages</th>
                      <th className="px-6 py-4 text-left text-sm font-medium text-gray-400">Resolution</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedConversations.map((conv, index) => (
                      <tr 
                        key={conv.conversation_id} 
                        className="border-b border-gray-700/50 hover:bg-gray-700/20 transition-colors cursor-pointer"
                        onClick={() => {
                          window.location.href = `/human-agents/conversations/${conv.conversation_id}`;
                        }}
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
                              {conv.agent_name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="text-white font-medium">{conv.agent_name}</p>
                              <p className="text-gray-400 text-xs">ID: {conv.conversation_id.slice(-8)}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-gray-300">{conv.customer_name}</p>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center space-x-2">
                            <Star className="h-4 w-4 text-emerald-400" />
                            <span className={`font-bold ${getQualityColor(conv.quality_score)}`}>
                              {conv.quality_score}/100
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center space-x-2">
                            <Heart className="h-4 w-4 text-fuchsia-400" />
                            <span className={`font-bold ${getQualityColor(conv.empathy_score)}`}>
                              {conv.empathy_score}/100
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${getSentimentColor(conv.final_sentiment)}`}>
                            {conv.final_sentiment}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center space-x-2">
                            <AlertTriangle className="h-4 w-4 text-amber-400" />
                            <span className={`font-bold ${getEscalationRiskColor(conv.escalation_risk)}`}>
                              {conv.escalation_risk}%
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-gray-300">
                            <p className="text-sm">{conv.conversation_length} total</p>
                            <p className="text-xs text-gray-400">{conv.agent_response_count} agent</p>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center space-x-2">
                            <Clock className="h-4 w-4 text-blue-400" />
                            <span className="text-gray-300 text-sm">
                              {formatResolutionTime(conv.resolution_time)}
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination Footer */}
            {totalPages > 1 && (
              <div className="p-4 border-t border-gray-700 flex items-center justify-between">
                <div className="text-sm text-gray-400">
                  Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1} to {Math.min(currentPage * ITEMS_PER_PAGE, filteredConversations.length)} of {filteredConversations.length} conversations
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
                  >
                    Previous
                  </button>
                  <span className="px-3 py-2 text-sm text-gray-400">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default HumanAgentConversations; 