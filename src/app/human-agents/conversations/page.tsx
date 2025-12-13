'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Navigation from '../../../components/Navigation';
import { 
  Users, 
  MessageSquareIcon, 
  Star, 
  Heart, 
  AlertTriangle, 
  Clock, 
  Search, 
  ChevronLeft, 
  ChevronRight, 
  LoaderIcon,
  Database,
  RefreshCw,
  ThumbsUp,
  ThumbsDown,
  Minus,
  Globe,
  Smartphone
} from 'lucide-react';

export interface HumanAgentConversationData {
  id: string;
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
  timestamp?: string;
  channel?: string;
}

export interface HumanAgentFilterState {
  sentiment: string[];
  qualityScore: number[];
  empathyScore: number[];
  escalationRisk: number[];
  agents: string[];
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
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    loadConversations();
  }, []);

  const loadConversations = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/human-agents/conversations?limit=5000&offset=0');
      const data = await response.json();
      
      if (data.conversations) {
        setConversations(data.conversations);
        console.log('✅ Human agent conversations loaded from database:', {
          received: data.conversations.length,
          total: data.total
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

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1);
  }, []);

  const filteredConversations = React.useMemo(() => {
    if (conversations.length === 0) return [];
    
    return conversations.filter((conv) => {
      if (debouncedSearchQuery) {
        const query = debouncedSearchQuery.toLowerCase();
        if (
          !conv.conversation_id?.toLowerCase().includes(query) &&
          !conv.agent_name?.toLowerCase().includes(query) &&
          !conv.customer_name?.toLowerCase().includes(query) &&
          !(conv.final_sentiment || '').toLowerCase().includes(query)
        ) {
          return false;
        }
      }

      if (activeFilters.sentiment.length > 0) {
        if (!activeFilters.sentiment.includes(conv.final_sentiment)) {
          return false;
        }
      }

      if (activeFilters.agents.length > 0) {
        if (!activeFilters.agents.includes(conv.agent_name)) {
          return false;
        }
      }

      if (
        conv.quality_score < activeFilters.qualityScore[0] ||
        conv.quality_score > activeFilters.qualityScore[1]
      ) {
        return false;
      }

      if (
        conv.empathy_score < activeFilters.empathyScore[0] ||
        conv.empathy_score > activeFilters.empathyScore[1]
      ) {
        return false;
      }

      if (
        conv.escalation_risk < activeFilters.escalationRisk[0] ||
        conv.escalation_risk > activeFilters.escalationRisk[1]
      ) {
        return false;
      }

      return true;
    });
  }, [conversations, debouncedSearchQuery, activeFilters]);

  const paginatedConversations = React.useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return filteredConversations.slice(startIndex, endIndex);
  }, [filteredConversations, currentPage]);

  const totalPages = Math.ceil(filteredConversations.length / ITEMS_PER_PAGE);

  const uniqueAgents = React.useMemo(() => {
    return [...new Set(conversations.map(conv => conv.agent_name))].sort();
  }, [conversations]);

  const uniqueSentiments = React.useMemo(() => {
    return [...new Set(conversations.map(conv => conv.final_sentiment))].sort();
  }, [conversations]);

  const getSentimentIcon = (sentiment: string) => {
    switch (sentiment.toLowerCase()) {
      case 'positive':
        return <ThumbsUp className="h-4 w-4" />;
      case 'negative':
        return <ThumbsDown className="h-4 w-4" />;
      default:
        return <Minus className="h-4 w-4" />;
    }
  };

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

  const stats = React.useMemo(() => {
    if (filteredConversations.length === 0) return null;
    
    const total = filteredConversations.length;
    const avgQuality = filteredConversations.reduce((sum, c) => sum + c.quality_score, 0) / total;
    const avgEmpathy = filteredConversations.reduce((sum, c) => sum + c.empathy_score, 0) / total;
    const avgEscalation = filteredConversations.reduce((sum, c) => sum + c.escalation_risk, 0) / total;
    const uniqueAgentCount = new Set(filteredConversations.map(c => c.agent_name)).size;

    return {
      total,
      avgQuality: Math.round(avgQuality),
      avgEmpathy: Math.round(avgEmpathy),
      avgEscalation: Math.round(avgEscalation),
      agents: uniqueAgentCount
    };
  }, [filteredConversations]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white">
        <Navigation />
        <div className="container mx-auto px-4 py-8 pt-24">
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-8">
            <div className="flex items-center justify-center">
              <LoaderIcon className="animate-spin text-blue-400 mr-3" size={24} />
              <span className="text-gray-300">Loading human agent conversations from database...</span>
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
          <div className="absolute inset-0 bg-black/20 backdrop-blur-sm"></div>
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent"></div>
          
          <div className="absolute top-4 right-4 w-32 h-32 bg-white/5 rounded-full blur-xl"></div>
          <div className="absolute bottom-4 left-4 w-24 h-24 bg-white/5 rounded-full blur-xl"></div>
          
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <div className="p-3 bg-white/10 backdrop-blur-md rounded-xl border border-white/20 mr-4">
                  <Users className="h-8 w-8 text-white" />
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

              {/* Database Status & Refresh */}
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2 bg-white/10 backdrop-blur-md rounded-xl px-4 py-2 border border-white/20">
                  <Database className="h-4 w-4 text-emerald-400" />
                  <span className="text-sm text-white/70">Supabase</span>
                </div>
                <button
                  onClick={loadConversations}
                  disabled={loading}
                  className="flex items-center space-x-2 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-xl px-4 py-2 border border-white/20 transition-all duration-200"
                >
                  <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                  <span className="text-sm">Refresh</span>
                </button>
              </div>
            </div>
            
            {/* Stats Summary */}
            {stats && (
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-6">
                <div className="bg-white/10 backdrop-blur-md rounded-lg p-3 border border-white/20">
                  <p className="text-white/70 text-xs">Total</p>
                  <p className="text-2xl font-bold text-white">{stats.total}</p>
                </div>
                <div className="bg-white/10 backdrop-blur-md rounded-lg p-3 border border-white/20">
                  <p className="text-white/70 text-xs">Agents</p>
                  <p className="text-2xl font-bold text-white">{stats.agents}</p>
                </div>
                <div className="bg-white/10 backdrop-blur-md rounded-lg p-3 border border-white/20">
                  <p className="text-white/70 text-xs">Avg Quality</p>
                  <p className="text-2xl font-bold text-emerald-300">{stats.avgQuality}%</p>
                </div>
                <div className="bg-white/10 backdrop-blur-md rounded-lg p-3 border border-white/20">
                  <p className="text-white/70 text-xs">Avg Empathy</p>
                  <p className="text-2xl font-bold text-fuchsia-300">{stats.avgEmpathy}%</p>
                </div>
                <div className="bg-white/10 backdrop-blur-md rounded-lg p-3 border border-white/20">
                  <p className="text-white/70 text-xs">Avg Escalation</p>
                  <p className="text-2xl font-bold text-amber-300">{stats.avgEscalation}%</p>
                </div>
              </div>
            )}

            {/* No Data Warning */}
            {conversations.length === 0 && !loading && (
              <div className="mt-6 bg-amber-500/20 border border-amber-500/30 rounded-lg p-4">
                <div className="flex items-center space-x-3">
                  <AlertTriangle className="h-5 w-5 text-amber-400" />
                  <div>
                    <p className="text-amber-200 font-medium">No conversations found in database</p>
                    <p className="text-amber-200/70 text-sm">Run a Human Agent analysis from the Dashboard first to populate conversation data.</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-[350px,1fr] gap-6 mb-8">
          {/* Filters Sidebar */}
          <div className="space-y-6">
            {/* Search */}
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50">
              <div className="flex items-center mb-4">
                <Search className="h-5 w-5 text-gray-400 mr-2" />
                <h3 className="text-lg font-semibold text-white">Search</h3>
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={handleSearchChange}
                placeholder="Search by agent, customer, ID..."
                className="w-full px-4 py-3 bg-gray-900/50 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
              />
            </div>

            {/* Agent Filter */}
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50">
              <div className="flex items-center mb-4">
                <Users className="h-5 w-5 text-blue-400 mr-2" />
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
                    <span className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${getSentimentColor(sentiment)}`}>
                      {getSentimentIcon(sentiment)}
                      <span className="capitalize">{sentiment}</span>
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Quality Score Filter */}
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50">
              <div className="flex items-center mb-4">
                <Star className="h-5 w-5 text-amber-400 mr-2" />
                <h3 className="text-lg font-semibold text-white">Quality Score</h3>
              </div>
              <div className="space-y-4">
                <div className="flex items-center justify-between text-sm text-gray-400">
                  <span>{activeFilters.qualityScore[0]}%</span>
                  <span>{activeFilters.qualityScore[1]}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={activeFilters.qualityScore[0]}
                  onChange={(e) => {
                    const val = parseInt(e.target.value);
                    setActiveFilters(prev => ({
                      ...prev,
                      qualityScore: [val, prev.qualityScore[1]]
                    }));
                    setCurrentPage(1);
                  }}
                  className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                />
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={activeFilters.qualityScore[1]}
                  onChange={(e) => {
                    const val = parseInt(e.target.value);
                    setActiveFilters(prev => ({
                      ...prev,
                      qualityScore: [prev.qualityScore[0], val]
                    }));
                    setCurrentPage(1);
                  }}
                  className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                />
              </div>
            </div>

            {/* Clear Filters */}
            {(activeFilters.sentiment.length > 0 || activeFilters.agents.length > 0 || 
              activeFilters.qualityScore[0] !== 0 || activeFilters.qualityScore[1] !== 100) && (
              <button
                onClick={() => {
                  setActiveFilters({
                    sentiment: [],
                    qualityScore: [0, 100],
                    empathyScore: [0, 100],
                    escalationRisk: [0, 100],
                    agents: [],
                  });
                  setCurrentPage(1);
                }}
                className="w-full px-4 py-3 bg-gray-700/50 hover:bg-gray-700 text-gray-300 rounded-lg transition-colors text-sm font-medium"
              >
                Clear All Filters
              </button>
            )}
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
                    ? "Run a Human Agent analysis from the Dashboard first to populate conversation data."
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
                      <th className="px-6 py-4 text-left text-sm font-medium text-gray-400">Channel</th>
                      <th className="px-6 py-4 text-left text-sm font-medium text-gray-400">Quality</th>
                      <th className="px-6 py-4 text-left text-sm font-medium text-gray-400">Empathy</th>
                      <th className="px-6 py-4 text-left text-sm font-medium text-gray-400">Sentiment</th>
                      <th className="px-6 py-4 text-left text-sm font-medium text-gray-400">Escalation</th>
                      <th className="px-6 py-4 text-left text-sm font-medium text-gray-400">Messages</th>
                      <th className="px-6 py-4 text-left text-sm font-medium text-gray-400">Resolution</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedConversations.map((conv) => (
                      <tr 
                        key={conv.id} 
                        className="border-b border-gray-700/50 hover:bg-gray-700/20 transition-colors cursor-pointer"
                        onClick={() => {
                          window.location.href = `/human-agents/conversations/${conv.id}`;
                        }}
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
                              {conv.agent_name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="text-white font-medium">{conv.agent_name}</p>
                              <p className="text-gray-400 text-xs">ID: {conv.id.slice(0, 8)}...</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${
                            conv.channel === 'web' 
                              ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20' 
                              : 'bg-violet-500/10 text-violet-400 border border-violet-500/20'
                          }`}>
                            {conv.channel === 'web' ? <Globe className="h-3 w-3" /> : <Smartphone className="h-3 w-3" />}
                            <span className="capitalize">{conv.channel || 'unknown'}</span>
                          </span>
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
                          <span className={`flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-medium w-fit ${getSentimentColor(conv.final_sentiment)}`}>
                            {getSentimentIcon(conv.final_sentiment)}
                            <span className="capitalize">{conv.final_sentiment}</span>
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
