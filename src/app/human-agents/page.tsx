'use client';

import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Star, 
  AlertTriangle, 
  BookOpen, 
  Target, 
  Heart, 
  TrendingUp, 
  MessageSquare, 
  Award,
  Brain,
  ChevronRight,
  BarChart3,
  ThumbsUp,
  ThumbsDown,
  Minus,
  User,
  CheckCircle,
  Sparkles,
  X
} from 'lucide-react';
import MetricCard from '@/components/ui/metric-card';
import Modal from '@/components/ui/modal';
import ProgressBar from '@/components/ui/progress-bar';
import VersionSelector from '@/components/Dashboard/VersionSelector';

interface AnalysisJob {
  id: string;
  version_name: string;
  analysis_type: 'dashboard' | 'humanAgent';
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  total_conversations: number;
  processed_conversations: number;
  error_count: number;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
}

interface HumanAgentConversation {
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
  sentiment_analysis: {
    initial_sentiment: string;
    final_sentiment: string;
    sentiment_change: string;
  };
  emotions: string[];
  was_transferred_to_agent: boolean;
  transfer_reason: string;
}

interface HumanAgentAnalytics {
  analytics: HumanAgentConversation[];
  aiInsights: {
    insights: string;
    recommendations: string[];
    trends: string[];
    root_causes: string[];
    knowledge_gaps: string[];
    coaching_opportunities: string[];
  };
  sourceFile: string;
  total_conversations: number;
  total_agents: number;
  timestamp: number;
  fromCache?: boolean;
}

const HumanAgentDashboard: React.FC = () => {
  const [data, setData] = useState<HumanAgentAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<any | null>(null);
  const [showAgentModal, setShowAgentModal] = useState(false);
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);

  const [isGeneratingInsights, setIsGeneratingInsights] = useState(false);

  const generateInsights = async () => {
    try {
      setIsGeneratingInsights(true);
      const response = await fetch('/api/human-agents/generate-insights', { method: 'POST' });
      const result = await response.json();
      
      if (result.success && result.insights) {
        setData(prev => prev ? {
          ...prev,
          aiInsights: result.insights
        } : null);
      }
    } catch (error) {
      console.error('Error generating insights:', error);
    } finally {
      setIsGeneratingInsights(false);
    }
  };

  useEffect(() => {
    loadHumanAgentData();
  }, []);

  const loadHumanAgentData = async (versionId?: string | null) => {
    try {
      setLoading(true);
      setError(null);
      
      let url = '/api/analyze-human-agents?action=analyze';
      // Add version filter
      const versionToUse = versionId !== undefined ? versionId : selectedVersionId;
      if (versionToUse) {
        url += `&version=${versionToUse}`;
      }
      
      const response = await fetch(url);
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.message || 'Failed to load human agent data');
      }
      
      setData(result);
    } catch (err: any) {
      setError(err.message);
      console.error('Error loading human agent data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Handle version selection - filter data by analysis version
  const handleVersionSelect = (version: AnalysisJob | null) => {
    const versionId = version?.id || null;
    setSelectedVersionId(versionId);
    // Reload data with the selected version filter
    loadHumanAgentData(versionId);
  };

  const runFullAnalysis = async () => {
    try {
      setIsAnalyzing(true);
      const response = await fetch('/api/analyze-human-agents?action=analyze&force=true');
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.message || 'Analysis failed');
      }
      
      setData(result);
    } catch (err: any) {
      setError(err.message);
      console.error('Error running analysis:', err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const calculateAverages = () => {
    if (!data?.analytics || data.analytics.length === 0) {
      return {
        avgQualityScore: 0,
        avgEmpathyScore: 0,
        avgEscalationRisk: 0,
        avgScriptAdherence: 0,
        avgCustomerEffort: 0
      };
    }

    const total = data.analytics.length;
    return {
      avgQualityScore: Math.round(data.analytics.reduce((sum, conv) => sum + conv.quality_score, 0) / total),
      avgEmpathyScore: Math.round(data.analytics.reduce((sum, conv) => sum + conv.empathy_score, 0) / total),
      avgEscalationRisk: Math.round(data.analytics.reduce((sum, conv) => sum + conv.escalation_risk, 0) / total),
      avgScriptAdherence: Math.round(data.analytics.reduce((sum, conv) => sum + conv.script_adherence, 0) / total),
      avgCustomerEffort: Math.round(data.analytics.reduce((sum, conv) => sum + conv.customer_effort_score, 0) / total)
    };
  };

  const getTopAgents = () => {
    if (!data?.analytics) return [];
    
    const agentStats = data.analytics.reduce((acc, conv) => {
      if (!acc[conv.agent_name]) {
        acc[conv.agent_name] = {
          name: conv.agent_name,
          conversations: 0,
          avgQuality: 0,
          avgEmpathy: 0,
          totalQuality: 0,
          totalEmpathy: 0,
          totalEscalationRisk: 0,
          avgEscalationRisk: 0
        };
      }
      
      acc[conv.agent_name].conversations++;
      acc[conv.agent_name].totalQuality += conv.quality_score;
      acc[conv.agent_name].totalEmpathy += conv.empathy_score;
      acc[conv.agent_name].totalEscalationRisk += conv.escalation_risk;
      
      return acc;
    }, {} as any);

    return Object.values(agentStats).map((agent: any) => ({
      ...agent,
      avgQuality: Math.round(agent.totalQuality / agent.conversations),
      avgEmpathy: Math.round(agent.totalEmpathy / agent.conversations),
      avgEscalationRisk: Math.round(agent.totalEscalationRisk / agent.conversations)
    })).sort((a: any, b: any) => b.avgQuality - a.avgQuality).slice(0, 6);
  };

  const getSentimentDistribution = () => {
    if (!data?.analytics) return { positive: 0, neutral: 0, negative: 0 };
    
    return data.analytics.reduce((acc, conv) => {
      const sentiment = (conv.final_sentiment || 'neutral').toLowerCase();
      if (sentiment === 'positive') acc.positive++;
      else if (sentiment === 'negative') acc.negative++;
      else acc.neutral++;
      return acc;
    }, { positive: 0, neutral: 0, negative: 0 });
  };

  const getSentimentShiftMetrics = () => {
    if (!data?.analytics) return { 
      improved: 0, 
      declined: 0, 
      stable: 0,
      improvementRate: 0,
      declineRate: 0
    };
    
    const shifts = data.analytics.reduce((acc, conv) => {
      const initial = (conv.initial_sentiment || 'neutral').toLowerCase();
      const final = (conv.final_sentiment || 'neutral').toLowerCase();
      
      // Define sentiment values for comparison
      const sentimentValues = { negative: 1, neutral: 2, positive: 3 };
      const initialValue = sentimentValues[initial as keyof typeof sentimentValues] || 2;
      const finalValue = sentimentValues[final as keyof typeof sentimentValues] || 2;
      
      if (finalValue > initialValue) {
        acc.improved++;
      } else if (finalValue < initialValue) {
        acc.declined++;
      } else {
        acc.stable++;
      }
      
      return acc;
    }, { improved: 0, declined: 0, stable: 0 });
    
    const total = data.analytics.length;
    return {
      ...shifts,
      improvementRate: Math.round((shifts.improved / total) * 100),
      declineRate: Math.round((shifts.declined / total) * 100)
    };
  };

  const getTransferMetrics = () => {
    if (!data?.analytics) return { 
      transferRate: 0, 
      transferredCount: 0, 
      topTransferReasons: [] as Array<{ reason: string; count: number }>,
      totalConversations: 0
    };
    
    // Count how many have was_transferred_to_agent=true (for stats)
    const transferred = data.analytics.filter(conv => conv.was_transferred_to_agent);
    const transferredCount = transferred.length;
    const transferRate = Math.round((transferredCount / data.analytics.length) * 100);
    
    // Get topics from ALL conversations (not just transferred)
    // Since transfer_reason now captures the main topic/inquiry of each conversation
    const reasonCounts = data.analytics.reduce((acc, conv) => {
      if (conv.transfer_reason && conv.transfer_reason.trim()) {
        acc[conv.transfer_reason] = (acc[conv.transfer_reason] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);
    
    const topTransferReasons = Object.entries(reasonCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10) // Show top 10 instead of 6
      .map(([reason, count]) => ({ reason, count }));
    
    return { 
      transferRate, 
      transferredCount, 
      topTransferReasons,
      totalConversations: data.analytics.length
    };
  };

  const getTopKnowledgeGaps = () => {
    if (!data?.analytics) return [];
    
    const gapCounts = data.analytics.reduce((acc, conv) => {
      conv.knowledge_gaps.forEach(gap => {
        acc[gap] = (acc[gap] || 0) + 1;
      });
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(gapCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([gap, count]) => ({ gap, count }));
  };

  const getTopCoachingOpportunities = () => {
    if (!data?.analytics) return [];
    
    const opportunityCounts = data.analytics.reduce((acc, conv) => {
      conv.coaching_opportunities.forEach(opportunity => {
        acc[opportunity] = (acc[opportunity] || 0) + 1;
      });
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(opportunityCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([opportunity, count]) => ({ opportunity, count }));
  };

  const getOverallScore = () => {
    const averages = calculateAverages();
    const score = Math.round(
      (averages.avgQualityScore + 
       averages.avgEmpathyScore + 
       averages.avgScriptAdherence + 
       (100 - averages.avgEscalationRisk) + 
       (100 - averages.avgCustomerEffort)) / 5
    );
    
    let grade = 'F';
    if (score >= 90) grade = 'A';
    else if (score >= 80) grade = 'B';
    else if (score >= 70) grade = 'C';
    else if (score >= 60) grade = 'D';
    
    return { score, grade };
  };

  const openAgentModal = (agentName: string) => {
    if (!data?.analytics) return;
    
    // Get all conversations for this agent
    const agentConversations = data.analytics.filter(conv => conv.agent_name === agentName);
    
    // Calculate agent-specific metrics
    const avgQuality = Math.round(agentConversations.reduce((sum, conv) => sum + conv.quality_score, 0) / agentConversations.length);
    const avgEmpathy = Math.round(agentConversations.reduce((sum, conv) => sum + conv.empathy_score, 0) / agentConversations.length);
    const avgEscalationRisk = Math.round(agentConversations.reduce((sum, conv) => sum + conv.escalation_risk, 0) / agentConversations.length);
    const avgScriptAdherence = Math.round(agentConversations.reduce((sum, conv) => sum + conv.script_adherence, 0) / agentConversations.length);
    const avgCustomerEffort = Math.round(agentConversations.reduce((sum, conv) => sum + conv.customer_effort_score, 0) / agentConversations.length);
    
    // Get sentiment distribution for this agent
    const agentSentimentDist = agentConversations.reduce((acc, conv) => {
      const sentiment = (conv.final_sentiment || 'neutral').toLowerCase();
      if (sentiment === 'positive') acc.positive++;
      else if (sentiment === 'negative') acc.negative++;
      else acc.neutral++;
      return acc;
    }, { positive: 0, neutral: 0, negative: 0 });
    
    // Get top knowledge gaps for this agent
    const agentKnowledgeGaps = agentConversations.flatMap(conv => conv.knowledge_gaps);
    const gapCounts = agentKnowledgeGaps.reduce((acc, gap) => {
      acc[gap] = (acc[gap] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    const topAgentGaps = Object.entries(gapCounts)
      .sort(([,a], [,b]) => (b as number) - (a as number))
      .slice(0, 3)
      .map(([gap, count]) => ({ gap, count }));
    
    // Get coaching opportunities for this agent
    const agentCoachingOps = agentConversations.flatMap(conv => conv.coaching_opportunities);
    const coachingCounts = agentCoachingOps.reduce((acc, op) => {
      acc[op] = (acc[op] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    const topAgentCoaching = Object.entries(coachingCounts)
      .sort(([,a], [,b]) => (b as number) - (a as number))
      .slice(0, 3)
      .map(([op, count]) => ({ opportunity: op, count }));

    // Calculate sentiment shift for this agent
    const agentSentimentShift = agentConversations.reduce((acc, conv) => {
      const initial = (conv.initial_sentiment || 'neutral').toLowerCase();
      const final = (conv.final_sentiment || 'neutral').toLowerCase();
      
      const sentimentValues = { negative: 1, neutral: 2, positive: 3 };
      const initialValue = sentimentValues[initial as keyof typeof sentimentValues] || 2;
      const finalValue = sentimentValues[final as keyof typeof sentimentValues] || 2;
      
      if (finalValue > initialValue) acc.improved++;
      else if (finalValue < initialValue) acc.declined++;
      else acc.stable++;
      
      return acc;
    }, { improved: 0, declined: 0, stable: 0 });
    
    const agentData = {
      name: agentName,
      totalConversations: agentConversations.length,
      metrics: {
        avgQuality,
        avgEmpathy,
        avgEscalationRisk,
        avgScriptAdherence,
        avgCustomerEffort
      },
      sentimentDistribution: agentSentimentDist,
      sentimentShift: agentSentimentShift,
      knowledgeGaps: topAgentGaps,
      coachingOpportunities: topAgentCoaching,
      recentConversations: agentConversations.slice(-5) // Last 5 conversations
    };
    
    setSelectedAgent(agentData);
    setShowAgentModal(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--surface-base)] text-[var(--text-primary)]">
        <div className="container mx-auto px-4 py-8">
          <div className="animate-pulse">
            <div className="h-32 bg-[var(--surface-elevated)] rounded-[var(--radius-xl)] mb-8" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-32 bg-[var(--surface-elevated)] rounded-[var(--radius-xl)]" />
              ))}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-64 bg-[var(--surface-elevated)] rounded-[var(--radius-xl)]" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[var(--surface-base)] text-[var(--text-primary)]">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center py-16">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-[var(--radius-xl)] bg-rose-500/10 border border-rose-500/20 mb-6">
              <AlertTriangle className="h-8 w-8 text-rose-400" />
            </div>
            <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-3">Unable to Load Data</h2>
            <p className="text-[var(--text-secondary)] mb-6 max-w-md mx-auto">{error}</p>
            <button
              onClick={loadHumanAgentData}
              className="bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)] text-white px-5 py-2.5 rounded-[var(--radius-lg)] font-medium transition-colors duration-200"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  const averages = calculateAverages();
  const topAgents = getTopAgents();
  const sentimentDist = getSentimentDistribution();
  const sentimentShiftMetrics = getSentimentShiftMetrics();
  const knowledgeGaps = getTopKnowledgeGaps();
  const coachingOpportunities = getTopCoachingOpportunities();
  const overallScore = getOverallScore();
  const transferMetrics = getTransferMetrics();

  const getGradeColor = (grade: string) => {
    switch (grade) {
      case 'A': return 'bg-emerald-500';
      case 'B': return 'bg-blue-500';
      case 'C': return 'bg-amber-500';
      case 'D': return 'bg-orange-500';
      case 'F': return 'bg-rose-500';
      default: return 'bg-slate-500';
    }
  };

  return (
    <div className="min-h-screen bg-[var(--surface-base)] text-[var(--text-primary)]">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="relative overflow-hidden rounded-[var(--radius-xl)] bg-gradient-to-r from-[var(--brand-secondary)] to-rose-600 p-6 mb-8">
          <div className="absolute inset-0 bg-black/10" />
          
          <div className="relative z-10">
            <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start gap-6">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-white/10 backdrop-blur-md rounded-[var(--radius-lg)] border border-white/20">
                  <Users className="h-7 w-7 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl lg:text-3xl font-bold text-white">
                    Human Agent Analytics
                  </h1>
                  <p className="text-white/70 mt-1">
                    Performance insights for support agents
                  </p>
                  <div className="flex flex-wrap items-center gap-2 mt-3">
                    <span className="px-2.5 py-1 bg-white/15 backdrop-blur-sm rounded-full text-white/90 text-xs font-medium border border-white/20 flex items-center gap-1.5">
                      <User className="h-3.5 w-3.5" />
                      {data?.total_agents || 0} agents
                    </span>
                    <span className="px-2.5 py-1 bg-white/15 backdrop-blur-sm rounded-full text-white/90 text-xs font-medium border border-white/20 flex items-center gap-1.5">
                      <MessageSquare className="h-3.5 w-3.5" />
                      {data?.total_conversations || 0} calls
                    </span>
                    {data?.fromCache && (
                      <span className="px-2.5 py-1 bg-emerald-500/20 rounded-full text-emerald-300 text-xs font-medium border border-emerald-500/30">
                        Cached
                      </span>
                    )}
                    <VersionSelector
                      analysisType="humanAgent"
                      selectedVersionId={selectedVersionId}
                      onVersionSelect={handleVersionSelect}
                    />
                  </div>
                </div>
              </div>
              
              {/* Action Buttons & Score */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <div className="flex gap-3">
                  <button
                    onClick={() => window.location.href = '/human-agents/conversations'}
                    className="flex items-center gap-2 bg-white/20 hover:bg-white/30 text-white px-4 py-2.5 rounded-[var(--radius-lg)] font-medium transition-colors duration-200 border border-white/20"
                  >
                    <MessageSquare className="h-4 w-4" />
                    <span>Calls</span>
                  </button>
                </div>

                {/* Score Display */}
                <div className="flex items-center gap-3 pl-4 border-l border-white/20">
                  <div className="text-right">
                    <p className="text-white/60 text-xs uppercase tracking-wide">Score</p>
                    <p className="text-3xl font-bold text-white">{overallScore.score}</p>
                  </div>
                  <div className={`${getGradeColor(overallScore.grade)} px-3 py-2 rounded-[var(--radius-md)] flex items-center gap-1.5`}>
                    <Award className="h-4 w-4 text-white" />
                    <span className="text-xl font-bold text-white">{overallScore.grade}</span>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Loading State */}
            {isAnalyzing && (
              <div className="mt-6 flex items-center gap-3 p-3 bg-white/10 backdrop-blur-sm rounded-[var(--radius-lg)] border border-white/20">
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-white/30 border-t-white" />
                <span className="text-white/90 text-sm">Processing analysis...</span>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 mb-8">
          <button
            onClick={generateInsights}
            disabled={isGeneratingInsights || loading}
            className="flex items-center gap-2 bg-[var(--surface-elevated)] text-[var(--text-secondary)] px-4 py-2.5 rounded-[var(--radius-lg)] border border-[var(--border-default)] hover:border-[var(--brand-secondary)]/50 hover:text-[var(--text-primary)] transition-colors duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isGeneratingInsights ? (
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            <span>{isGeneratingInsights ? 'Generating...' : 'Generate Insights'}</span>
          </button>
          
          <button
            onClick={runFullAnalysis}
            disabled={isAnalyzing}
            className="flex items-center gap-2 bg-[var(--surface-elevated)] text-[var(--text-secondary)] px-4 py-2.5 rounded-[var(--radius-lg)] border border-[var(--border-default)] hover:border-emerald-500/50 hover:text-[var(--text-primary)] transition-colors duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isAnalyzing ? (
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent" />
            ) : (
              <Brain className="h-4 w-4" />
            )}
            <span>{isAnalyzing ? 'Analyzing...' : 'Run Analysis'}</span>
          </button>
        </div>

        {/* Key Metrics Grid - 4 column */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <MetricCard
            icon={<Star className="h-5 w-5" />}
            title="Quality Score"
            value={`${averages.avgQualityScore}%`}
            variant="success"
            subtitle="Conversation quality"
          />
          <MetricCard
            icon={<Heart className="h-5 w-5" />}
            title="Empathy Score"
            value={`${averages.avgEmpathyScore}%`}
            variant="primary"
            subtitle="Customer connection"
          />
          <MetricCard
            icon={<AlertTriangle className="h-5 w-5" />}
            title="Escalation Risk"
            value={`${averages.avgEscalationRisk}%`}
            variant="warning"
            subtitle="Risk level"
          />
          <MetricCard
            icon={<CheckCircle className="h-5 w-5" />}
            title="Script Adherence"
            value={`${averages.avgScriptAdherence}%`}
            variant="info"
            subtitle="Protocol compliance"
          />
        </div>

        {/* Charts and Analysis Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          {/* Sentiment Distribution */}
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-white flex items-center">
                <BarChart3 className="h-5 w-5 mr-2 text-blue-400" />
                Sentiment Distribution
              </h3>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <ThumbsUp className="h-5 w-5 text-emerald-400" />
                  <span className="text-gray-300">Positive</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-32 bg-gray-700 rounded-full h-2">
                    <div 
                      className="bg-gradient-to-r from-emerald-400 to-emerald-500 h-2 rounded-full transition-all duration-1000"
                      style={{ width: `${(sentimentDist.positive / (data?.total_conversations || 1)) * 100}%` }}
                    ></div>
                  </div>
                  <span className="text-emerald-400 font-bold w-12 text-right">{sentimentDist.positive}</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Minus className="h-5 w-5 text-gray-400" />
                  <span className="text-gray-300">Neutral</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-32 bg-gray-700 rounded-full h-2">
                    <div 
                      className="bg-gradient-to-r from-gray-400 to-gray-500 h-2 rounded-full transition-all duration-1000"
                      style={{ width: `${(sentimentDist.neutral / (data?.total_conversations || 1)) * 100}%` }}
                    ></div>
                  </div>
                  <span className="text-gray-400 font-bold w-12 text-right">{sentimentDist.neutral}</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <ThumbsDown className="h-5 w-5 text-rose-400" />
                  <span className="text-gray-300">Negative</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-32 bg-gray-700 rounded-full h-2">
                    <div 
                      className="bg-gradient-to-r from-rose-400 to-rose-500 h-2 rounded-full transition-all duration-1000"
                      style={{ width: `${(sentimentDist.negative / (data?.total_conversations || 1)) * 100}%` }}
                    ></div>
                  </div>
                  <span className="text-rose-400 font-bold w-12 text-right">{sentimentDist.negative}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Sentiment Shift Analysis */}
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-white flex items-center">
                <TrendingUp className="h-5 w-5 mr-2 text-emerald-400" />
                Sentiment Impact
              </h3>
            </div>
            <div className="space-y-6">
              {/* Improvement Rate */}
              <div className="text-center">
                <div className="text-4xl font-bold text-emerald-400 mb-2">
                  {sentimentShiftMetrics.improvementRate}%
                </div>
                <p className="text-gray-300 text-sm mb-3">Calls Improved</p>
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div 
                    className="bg-gradient-to-r from-emerald-400 to-emerald-500 h-2 rounded-full transition-all duration-1000"
                    style={{ width: `${sentimentShiftMetrics.improvementRate}%` }}
                  ></div>
                </div>
              </div>

              {/* Breakdown */}
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center p-3 bg-gray-700/30 rounded-lg">
                  <div className="text-xl font-bold text-emerald-400">{sentimentShiftMetrics.improved}</div>
                  <p className="text-gray-400 text-xs">Improved</p>
                </div>
                <div className="text-center p-3 bg-gray-700/30 rounded-lg">
                  <div className="text-xl font-bold text-gray-400">{sentimentShiftMetrics.stable}</div>
                  <p className="text-gray-400 text-xs">Stable</p>
                </div>
                <div className="text-center p-3 bg-gray-700/30 rounded-lg">
                  <div className="text-xl font-bold text-rose-400">{sentimentShiftMetrics.declined}</div>
                  <p className="text-gray-400 text-xs">Declined</p>
                </div>
              </div>
            </div>
          </div>

          {/* Top Performing Agents */}
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-white flex items-center">
                <Award className="h-5 w-5 mr-2 text-emerald-400" />
                Top Performing Agents
              </h3>
            </div>
            <div className="space-y-3">
              {topAgents.slice(0, 5).map((agent: any, index) => (
                <div 
                  key={agent.name} 
                  className="flex items-center justify-between p-3 bg-gray-700/30 rounded-lg hover:bg-gray-700/50 transition-all duration-200 cursor-pointer hover:scale-[1.02] hover:shadow-lg border border-transparent hover:border-gray-600/50"
                  onClick={() => openAgentModal(agent.name)}
                >
                  <div className="flex items-center space-x-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                      index === 0 ? 'bg-gradient-to-r from-yellow-400 to-yellow-500 text-yellow-900' :
                      index === 1 ? 'bg-gradient-to-r from-gray-300 to-gray-400 text-gray-900' :
                      index === 2 ? 'bg-gradient-to-r from-amber-600 to-amber-700 text-amber-100' :
                      'bg-gradient-to-r from-blue-500 to-blue-600 text-blue-100'
                    }`}>
                      {index + 1}
                    </div>
                    <div>
                      <p className="text-white font-medium hover:text-blue-300 transition-colors">{agent.name}</p>
                      <p className="text-gray-400 text-sm">{agent.conversations} calls</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-emerald-400 font-bold">{agent.avgQuality}/100</p>
                    <p className="text-gray-400 text-sm">Quality Score</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Knowledge Gaps and Coaching Opportunities */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Knowledge Gaps */}
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-white flex items-center">
                <BookOpen className="h-5 w-5 mr-2 text-amber-400" />
                Top Knowledge Gaps
              </h3>
            </div>
            <div className="space-y-3">
              {knowledgeGaps.map((item, index) => (
                <div key={item.gap} className="flex items-center justify-between p-3 bg-gray-700/30 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-amber-400 rounded-full"></div>
                    <span className="text-gray-300 text-sm">{item.gap}</span>
                  </div>
                  <span className="text-amber-400 font-bold">{item.count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Coaching Opportunities */}
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-white flex items-center">
                <Target className="h-5 w-5 mr-2 text-violet-400" />
                Coaching Opportunities
              </h3>
            </div>
            <div className="space-y-3">
              {coachingOpportunities.map((item, index) => (
                <div key={item.opportunity} className="flex items-center justify-between p-3 bg-gray-700/30 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-violet-400 rounded-full"></div>
                    <span className="text-gray-300 text-sm">{item.opportunity}</span>
                  </div>
                  <span className="text-violet-400 font-bold">{item.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Top Inquiry Reasons Section - Static */}
        <div className="bg-[var(--surface-card)] rounded-[var(--radius-xl)] p-6 mb-8 border border-[var(--border-default)]">
          <div className="flex items-center gap-3 mb-5">
            <div className="p-2 bg-blue-500/10 rounded-[var(--radius-md)] border border-blue-500/20">
              <MessageSquare className="text-blue-400 h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-[var(--text-primary)]">Top Inquiry Reasons</h3>
              <p className="text-[var(--text-muted)] text-sm">
                Main reasons customers contact human agents
              </p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-[var(--surface-elevated)] rounded-[var(--radius-lg)] border border-[var(--border-muted)] hover:border-blue-500/30 transition-colors duration-200">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                <h4 className="text-[var(--text-primary)] font-medium">OTP Issues in Account Activation</h4>
              </div>
              <p className="text-[var(--text-muted)] text-sm">Customers experiencing problems with one-time passwords during account setup</p>
            </div>
            <div className="p-4 bg-[var(--surface-elevated)] rounded-[var(--radius-lg)] border border-[var(--border-muted)] hover:border-emerald-500/30 transition-colors duration-200">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-2 h-2 bg-emerald-400 rounded-full"></div>
                <h4 className="text-[var(--text-primary)] font-medium">Wallet/Payment Issues</h4>
              </div>
              <p className="text-[var(--text-muted)] text-sm">Issues related to wallet balance, payments, or transaction problems</p>
            </div>
            <div className="p-4 bg-[var(--surface-elevated)] rounded-[var(--radius-lg)] border border-[var(--border-muted)] hover:border-amber-500/30 transition-colors duration-200">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-2 h-2 bg-amber-400 rounded-full"></div>
                <h4 className="text-[var(--text-primary)] font-medium">General Questions</h4>
              </div>
              <p className="text-[var(--text-muted)] text-sm">General inquiries about services, features, or how to use the platform</p>
            </div>
          </div>
        </div>

        {/* AI Insights Section */}
        {data?.aiInsights && (
          <div className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded-2xl p-8 mb-8">
            <div className="flex items-center mb-6">
              <div className="p-3 bg-blue-500/20 rounded-xl mr-4">
                <Brain className="h-6 w-6 text-blue-400" />
              </div>
              <h3 className="text-2xl font-bold text-white">AI-Powered Insights</h3>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Main Insights */}
              <div className="lg:col-span-2">
                <h4 className="text-lg font-semibold text-blue-400 mb-3">Key Findings</h4>
                <p className="text-gray-300 leading-relaxed mb-6">{data.aiInsights.insights}</p>
                
                <h4 className="text-lg font-semibold text-emerald-400 mb-3">Recommendations</h4>
                <ul className="space-y-2">
                  {data.aiInsights.recommendations.map((rec, index) => (
                    <li key={index} className="flex items-start space-x-3">
                      <ChevronRight className="h-4 w-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-300 text-sm">{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>
              
              {/* Trends */}
              <div>
                <h4 className="text-lg font-semibold text-violet-400 mb-3">Trends</h4>
                <ul className="space-y-2">
                  {data.aiInsights.trends.map((trend, index) => (
                    <li key={index} className="flex items-start space-x-3">
                      <TrendingUp className="h-4 w-4 text-violet-400 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-300 text-sm">{trend}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Agent Performance Modal */}
      {showAgentModal && selectedAgent && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-800 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto border border-gray-700/50">
            {/* Modal Header */}
            <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-purple-600 p-6 rounded-t-2xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="p-3 bg-white/10 backdrop-blur-md rounded-xl border border-white/20">
                    <User className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-white">{selectedAgent.name}</h2>
                    <p className="text-white/70">Performance Analysis</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowAgentModal(false)}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                >
                  <X className="h-6 w-6 text-white" />
                </button>
              </div>
            </div>

            <div className="p-6">
              {/* Agent Metrics Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <div className="bg-gray-700/30 rounded-xl p-4 text-center">
                  <Star className="h-6 w-6 text-emerald-400 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-emerald-400">{selectedAgent.metrics.avgQuality}</p>
                  <p className="text-gray-400 text-sm">Quality Score</p>
                </div>
                <div className="bg-gray-700/30 rounded-xl p-4 text-center">
                  <Heart className="h-6 w-6 text-fuchsia-400 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-fuchsia-400">{selectedAgent.metrics.avgEmpathy}</p>
                  <p className="text-gray-400 text-sm">Empathy Score</p>
                </div>
                <div className="bg-gray-700/30 rounded-xl p-4 text-center">
                  <AlertTriangle className="h-6 w-6 text-amber-400 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-amber-400">{selectedAgent.metrics.avgEscalationRisk}%</p>
                  <p className="text-gray-400 text-sm">Escalation Risk</p>
                </div>
                <div className="bg-gray-700/30 rounded-xl p-4 text-center">
                  <CheckCircle className="h-6 w-6 text-blue-400 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-blue-400">{selectedAgent.metrics.avgScriptAdherence}%</p>
                  <p className="text-gray-400 text-sm">Script Adherence</p>
                </div>
              </div>

              {/* Performance Details Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                {/* Sentiment Analysis */}
                <div className="bg-gray-700/30 rounded-xl p-6">
                  <h3 className="text-lg font-bold text-white mb-4 flex items-center">
                    <BarChart3 className="h-5 w-5 mr-2 text-blue-400" />
                    Sentiment Performance
                  </h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <ThumbsUp className="h-4 w-4 text-emerald-400" />
                        <span className="text-gray-300">Positive</span>
                      </div>
                      <div className="flex items-center space-x-3">
                        <div className="w-24 bg-gray-600 rounded-full h-2">
                          <div 
                            className="bg-gradient-to-r from-emerald-400 to-emerald-500 h-2 rounded-full"
                            style={{ width: `${(selectedAgent.sentimentDistribution.positive / selectedAgent.totalConversations) * 100}%` }}
                          ></div>
                        </div>
                        <span className="text-emerald-400 font-bold w-8 text-right">{selectedAgent.sentimentDistribution.positive}</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <Minus className="h-4 w-4 text-gray-400" />
                        <span className="text-gray-300">Neutral</span>
                      </div>
                      <div className="flex items-center space-x-3">
                        <div className="w-24 bg-gray-600 rounded-full h-2">
                          <div 
                            className="bg-gradient-to-r from-gray-400 to-gray-500 h-2 rounded-full"
                            style={{ width: `${(selectedAgent.sentimentDistribution.neutral / selectedAgent.totalConversations) * 100}%` }}
                          ></div>
                        </div>
                        <span className="text-gray-400 font-bold w-8 text-right">{selectedAgent.sentimentDistribution.neutral}</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <ThumbsDown className="h-4 w-4 text-rose-400" />
                        <span className="text-gray-300">Negative</span>
                      </div>
                      <div className="flex items-center space-x-3">
                        <div className="w-24 bg-gray-600 rounded-full h-2">
                          <div 
                            className="bg-gradient-to-r from-rose-400 to-rose-500 h-2 rounded-full"
                            style={{ width: `${(selectedAgent.sentimentDistribution.negative / selectedAgent.totalConversations) * 100}%` }}
                          ></div>
                        </div>
                        <span className="text-rose-400 font-bold w-8 text-right">{selectedAgent.sentimentDistribution.negative}</span>
                      </div>
                    </div>
                  </div>

                  {/* Sentiment Shift */}
                  <div className="mt-6 pt-4 border-t border-gray-600">
                    <h4 className="text-md font-semibold text-white mb-3 flex items-center">
                      <TrendingUp className="h-4 w-4 mr-2 text-emerald-400" />
                      Sentiment Impact
                    </h4>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="text-center">
                        <p className="text-2xl font-bold text-emerald-400">{selectedAgent.sentimentShift.improved}</p>
                        <p className="text-gray-400 text-xs">Improved</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-gray-400">{selectedAgent.sentimentShift.stable}</p>
                        <p className="text-gray-400 text-xs">Stable</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-rose-400">{selectedAgent.sentimentShift.declined}</p>
                        <p className="text-gray-400 text-xs">Declined</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Knowledge Gaps & Coaching */}
                <div className="bg-gray-700/30 rounded-xl p-6">
                  <h3 className="text-lg font-bold text-white mb-4 flex items-center">
                    <BookOpen className="h-5 w-5 mr-2 text-amber-400" />
                    Development Areas
                  </h3>
                  
                  {/* Knowledge Gaps */}
                  <div className="mb-6">
                    <h4 className="text-md font-semibold text-amber-400 mb-3">Knowledge Gaps</h4>
                    <div className="space-y-2">
                      {selectedAgent.knowledgeGaps.length > 0 ? selectedAgent.knowledgeGaps.map((item: any, index: number) => (
                        <div key={index} className="flex items-center justify-between p-2 bg-gray-600/30 rounded-lg">
                          <span className="text-gray-300 text-sm">{item.gap}</span>
                          <span className="text-amber-400 font-bold text-sm">{item.count}</span>
                        </div>
                      )) : (
                        <p className="text-gray-400 text-sm">No specific knowledge gaps identified</p>
                      )}
                    </div>
                  </div>

                  {/* Coaching Opportunities */}
                  <div>
                    <h4 className="text-md font-semibold text-violet-400 mb-3">Coaching Opportunities</h4>
                    <div className="space-y-2">
                      {selectedAgent.coachingOpportunities.length > 0 ? selectedAgent.coachingOpportunities.map((item: any, index: number) => (
                        <div key={index} className="flex items-center justify-between p-2 bg-gray-600/30 rounded-lg">
                          <span className="text-gray-300 text-sm">{item.opportunity}</span>
                          <span className="text-violet-400 font-bold text-sm">{item.count}</span>
                        </div>
                      )) : (
                        <p className="text-gray-400 text-sm">No specific coaching opportunities identified</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Recent Conversations */}
              <div className="bg-gray-700/30 rounded-xl p-6">
                <h3 className="text-lg font-bold text-white mb-4 flex items-center">
                  <MessageSquare className="h-5 w-5 mr-2 text-blue-400" />
                  Recent Calls ({selectedAgent.totalConversations} total)
                </h3>
                <div className="space-y-3">
                  {selectedAgent.recentConversations.map((conv: any, index: number) => (
                    <div key={conv.conversation_id} className="p-4 bg-gray-600/30 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-3">
                          <span className="text-white font-medium">{conv.customer_name}</span>
                          <span className="px-2 py-1 bg-blue-500/20 text-blue-300 text-xs rounded-full">
                            {conv.conversation_length} messages
                          </span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            (conv.final_sentiment || 'neutral').toLowerCase() === 'positive' ? 'bg-emerald-500/20 text-emerald-300' :
                            (conv.final_sentiment || 'neutral').toLowerCase() === 'negative' ? 'bg-rose-500/20 text-rose-300' :
                            'bg-gray-500/20 text-gray-300'
                          }`}>
                            {conv.final_sentiment || 'Neutral'}
                          </span>
                          <span className="text-emerald-400 font-bold text-sm">{conv.quality_score}/100</span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-4 text-sm text-gray-400">
                        <span>Empathy: {conv.empathy_score}/100</span>
                        <span>Risk: {conv.escalation_risk}%</span>
                        <span>Script: {conv.script_adherence}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HumanAgentDashboard; 