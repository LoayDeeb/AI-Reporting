'use client';

import React, { useState } from 'react';
import Header from './Header';
import MetricCard from '@/components/ui/metric-card';
import SentimentChart from './Charts/SentimentChart';
import TopicsChart from './Charts/TopicsChart';
import InsightsSection from './Insights/InsightsSection';
import KnowledgeBaseGenerator from './Insights/KnowledgeBaseGenerator';
import ParallelProcessingPanel from '../ParallelProcessing/ParallelProcessingPanel';
import {
  Users2,
  Target,
  AlertTriangle,
  ThumbsUp,
  Brain,
  MessageSquare,
  Zap,
  BarChart3,
  Sparkles,
  Database
} from 'lucide-react';

interface PlatformOverallScore {
  overallScore: number;
  scoreBreakdown: {
    qualityScore: number;
    sentimentScore: number;
    responseTimeScore: number;
    resolutionScore: number;
  };
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  improvementAreas: string[];
}

interface Metrics {
  totalConversations: number;
  avgConversationLength: number;
  avgFirstResponseTime: number;
  sentimentDistribution: {
    positive: number;
    negative: number;
    neutral: number;
  };
  topTopics: Array<{ topic: string; count: number }>;
  topSubCategories: Array<{ category: string; count: number }>;
  avgQualityScore: number;
  platformScore: PlatformOverallScore;
  topKnowledgeGaps: Array<{ gap: string; count: number }>;
  escalationRate: number;
  resolutionRate: number;
  trendsOverTime: Array<{
    period: string;
    qualityScore: number;
    sentimentScore: number;
    volume: number;
  }>;

}

interface AIInsights {
  insights: string;
  recommendations: string[];
  trends: string[];
}

interface DashboardData {
  metrics?: Metrics;
  aiInsights?: AIInsights;
  totalConversations?: number;
  analysisType?: string;
  fastMode?: boolean;
  sampleSize?: number;
  optimizationLevel?: string;
  currentChannel?: string;
  availableChannels?: string[];
}

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

interface ModernDashboardProps {
  data: DashboardData;
  loading?: boolean;
  onFullAnalysis?: () => void;
  onConversationAnalysis?: () => void;
  onParallelProcessingComplete?: () => void;
  onZainjoAnalysis?: () => void;
  selectedChannel?: string;
  availableChannels?: string[];
  onChannelChange?: (channel: string) => void;
  selectedVersionId?: string | null;
  onVersionSelect?: (version: AnalysisJob | null) => void;
}

const ModernDashboard = ({ 
  data, 
  loading = false, 
  onFullAnalysis, 
  onConversationAnalysis,
  onParallelProcessingComplete,
  onZainjoAnalysis,
  selectedChannel = 'all',
  availableChannels = ['app', 'web'],
  onChannelChange,
  selectedVersionId,
  onVersionSelect
}: ModernDashboardProps) => {
  const metrics = data.metrics;
  const platformScore = metrics?.platformScore;
  
  // Calculate derived metrics
  const totalConversations = data.totalConversations || metrics?.totalConversations || 0;
  const avgLength = metrics?.avgConversationLength || 0;
  const avgResponseTime = metrics?.avgFirstResponseTime || 0;
  const qualityScore = metrics?.avgQualityScore || platformScore?.overallScore || 0;
  const escalationRate = metrics?.escalationRate || 0;
  const resolutionRate = metrics?.resolutionRate || 0;
  const knowledgeGaps = metrics?.topKnowledgeGaps?.length || 0;

  // Format response time
  const formatResponseTime = (time: number) => {
    if (time < 1000) return `${Math.round(time)}ms`;
    if (time < 60000) return `${Math.round(time / 1000)}s`;
    return `${Math.round(time / 60000)}m`;
  };

  const [isProcessing, setIsProcessing] = useState(false);

  const refreshInsights = async (autoReload = true) => {
    try {
      setIsProcessing(true);
      const response = await fetch('/api/regenerate-insights', {
        method: 'POST'
      });
      const result = await response.json();
      
      if (result.success && autoReload && onFullAnalysis) {
        // Refresh the dashboard data to show updated insights
        onFullAnalysis();
      }
      return result.success;
    } catch (error) {
      console.error('Error refreshing insights:', error);
      return false;
    } finally {
      setIsProcessing(false);
    }
  };

  // Auto-refresh insights when onFullAnalysis is called (e.g. user clicks "Start Analysis")
  // This ensures we always have fresh AI insights when running a full analysis
  const handleStartAnalysis = async () => {
    if (onFullAnalysis) {
      // Trigger refresh first (no auto-reload inside, we handle it here)
      await refreshInsights(false);
      // ALWAYS load data, even if refresh failed
      onFullAnalysis();
    }
  };

  const analyzeZainjoData = async () => {
    if (onZainjoAnalysis) {
      onZainjoAnalysis();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--surface-base)] text-[var(--text-primary)]">
        <div className="container mx-auto px-4 py-8">
          <div className="animate-pulse">
            <div className="h-36 bg-[var(--surface-elevated)] rounded-[var(--radius-xl)] mb-8" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-32 bg-[var(--surface-elevated)] rounded-[var(--radius-xl)]" />
              ))}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {[...Array(2)].map((_, i) => (
                <div key={i} className="h-64 bg-[var(--surface-elevated)] rounded-[var(--radius-xl)]" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show welcome state if no data has been loaded yet
  const hasData = totalConversations > 0 || metrics || data.aiInsights;
  
  if (!hasData) {
    return (
      <div className="min-h-screen bg-[var(--surface-base)] text-[var(--text-primary)]">
        <div className="container mx-auto px-4 py-8">
          {/* Header */}
          <Header
            score={0}
            grade="N/A"
            totalConversations={0}
            analysisType="basic"
            fastMode={false}
            loading={loading || isProcessing}
            onFullAnalysis={handleStartAnalysis}
            onConversationAnalysis={onConversationAnalysis}
          />

          {/* Welcome State */}
          <div className="py-12">
            <div className="text-center mb-12">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-[var(--radius-xl)] bg-[var(--brand-primary)]/10 border border-[var(--brand-primary)]/20 mb-6">
                <BarChart3 className="h-8 w-8 text-[var(--brand-primary)]" />
              </div>
              <h2 className="text-3xl font-bold text-[var(--text-primary)] mb-3">
                Conversation Analytics
              </h2>
              <p className="text-lg text-[var(--text-secondary)] max-w-xl mx-auto">
                Get actionable insights from your chatbot conversations with AI-powered analysis.
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto mb-12">
              {/* Dashboard Analysis Card */}
              <div className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-[var(--radius-xl)] p-6 hover:border-[var(--brand-primary)]/40 transition-all duration-200 group">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2.5 rounded-[var(--radius-lg)] bg-emerald-500/10 border border-emerald-500/20">
                    <Sparkles className="h-5 w-5 text-emerald-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-[var(--text-primary)]">Dashboard Analysis</h3>
                </div>
                <p className="text-[var(--text-secondary)] text-sm mb-5">
                  AI-powered insights with sentiment analysis, topic detection, and quality scoring.
                </p>
                <ul className="text-sm text-[var(--text-muted)] space-y-2 mb-6">
                  <li className="flex items-center gap-2">
                    <span className="w-1 h-1 bg-emerald-400 rounded-full" />
                    Sentiment & intent analysis
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1 h-1 bg-emerald-400 rounded-full" />
                    AI recommendations
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1 h-1 bg-emerald-400 rounded-full" />
                    Performance metrics
                  </li>
                </ul>
                <button
                  onClick={handleStartAnalysis}
                  className="w-full bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2.5 rounded-[var(--radius-lg)] font-medium transition-colors duration-200"
                >
                  View Dashboard
                </button>
              </div>

              {/* Conversations Card */}
              <div className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-[var(--radius-xl)] p-6 hover:border-[var(--brand-secondary)]/40 transition-all duration-200 group">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2.5 rounded-[var(--radius-lg)] bg-[var(--brand-secondary)]/10 border border-[var(--brand-secondary)]/20">
                    <MessageSquare className="h-5 w-5 text-indigo-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-[var(--text-primary)]">Conversations</h3>
                </div>
                <p className="text-[var(--text-secondary)] text-sm mb-5">
                  Browse and analyze individual conversations with detailed quality metrics.
                </p>
                <ul className="text-sm text-[var(--text-muted)] space-y-2 mb-6">
                  <li className="flex items-center gap-2">
                    <span className="w-1 h-1 bg-indigo-400 rounded-full" />
                    Browse full conversation list
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1 h-1 bg-indigo-400 rounded-full" />
                    Individual analysis
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1 h-1 bg-indigo-400 rounded-full" />
                    Quality scoring
                  </li>
                </ul>
                <button
                  onClick={onConversationAnalysis}
                  className="w-full bg-[var(--brand-secondary)] hover:bg-indigo-600 text-white px-4 py-2.5 rounded-[var(--radius-lg)] font-medium transition-colors duration-200"
                >
                  Browse Conversations
                </button>
              </div>

              {/* Dataset Analysis Card */}
              <div className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-[var(--radius-xl)] p-6 hover:border-amber-500/40 transition-all duration-200 group">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2.5 rounded-[var(--radius-lg)] bg-amber-500/10 border border-amber-500/20">
                    <Database className="h-5 w-5 text-amber-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-[var(--text-primary)]">Dataset Analysis</h3>
                </div>
                <p className="text-[var(--text-secondary)] text-sm mb-5">
                  Process large conversation datasets with batch analysis capabilities.
                </p>
                <ul className="text-sm text-[var(--text-muted)] space-y-2 mb-6">
                  <li className="flex items-center gap-2">
                    <span className="w-1 h-1 bg-amber-400 rounded-full" />
                    Bulk processing
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1 h-1 bg-amber-400 rounded-full" />
                    Intent classification
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1 h-1 bg-amber-400 rounded-full" />
                    Export capabilities
                  </li>
                </ul>
                <button
                  onClick={onZainjoAnalysis}
                  className="w-full bg-amber-500 hover:bg-amber-600 text-white px-4 py-2.5 rounded-[var(--radius-lg)] font-medium transition-colors duration-200"
                >
                  Analyze Dataset
                </button>
              </div>
            </div>

            {/* Parallel Processing Panel */}
            <div className="max-w-5xl mx-auto">
              <ParallelProcessingPanel onProcessingComplete={onParallelProcessingComplete} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--surface-base)] text-[var(--text-primary)]">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <Header
          score={platformScore?.overallScore || qualityScore}
          grade={platformScore?.grade || 'N/A'}
          totalConversations={totalConversations}
          analysisType={data.analysisType}
          fastMode={data.fastMode}
          loading={loading || isProcessing}
          onFullAnalysis={handleStartAnalysis}
          onConversationAnalysis={onConversationAnalysis}
          selectedVersionId={selectedVersionId}
          onVersionSelect={onVersionSelect}
        />

        {/* Channel Filter */}
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <span className="text-[var(--text-muted)] font-medium text-sm">Channel:</span>
            <div className="flex gap-2">
              <button
                onClick={() => onChannelChange?.('all')}
                className={`px-3 py-1.5 rounded-[var(--radius-md)] text-sm font-medium transition-colors duration-200 ${
                  selectedChannel === 'all'
                    ? 'bg-[var(--brand-primary)] text-white'
                    : 'bg-[var(--surface-elevated)] text-[var(--text-secondary)] hover:bg-[var(--surface-card)]'
                }`}
              >
                All
              </button>
              {availableChannels.map((channel) => (
                <button
                  key={channel}
                  onClick={() => onChannelChange?.(channel)}
                  className={`px-3 py-1.5 rounded-[var(--radius-md)] text-sm font-medium transition-colors duration-200 capitalize ${
                    selectedChannel === channel
                      ? 'bg-[var(--brand-primary)] text-white'
                      : 'bg-[var(--surface-elevated)] text-[var(--text-secondary)] hover:bg-[var(--surface-card)]'
                  }`}
                >
                  {channel}
                </button>
              ))}
            </div>
          </div>
          {selectedChannel !== 'all' && (
            <div className="text-sm text-[var(--text-muted)]">
              Filtered: <span className="text-[var(--brand-primary)] font-medium capitalize">{selectedChannel}</span>
            </div>
          )}
        </div>

        {/* Primary Metrics - 4-column grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <MetricCard
            icon={<Users2 className="h-5 w-5" />}
            title="Total Conversations"
            value={totalConversations.toLocaleString()}
            variant="info"
            subtitle={data.fastMode ? 'Smart analysis' : 'Full dataset'}
          />
          <MetricCard
            icon={<MessageSquare className="h-5 w-5" />}
            title="Avg Length"
            value={`${avgLength.toFixed(1)} msgs`}
            variant="primary"
            subtitle="Per conversation"
          />
          <MetricCard
            icon={<Target className="h-5 w-5" />}
            title="Quality Score"
            value={`${qualityScore.toFixed(0)}%`}
            variant="success"
            subtitle="Overall performance"
          />
          <MetricCard
            icon={<ThumbsUp className="h-5 w-5" />}
            title="Resolution Rate"
            value={`${resolutionRate.toFixed(0)}%`}
            variant="success"
            subtitle="Successfully resolved"
          />
        </div>

        {/* Secondary Metrics - 4-column grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <MetricCard
            icon={<AlertTriangle className="h-5 w-5" />}
            title="Escalation Rate"
            value={`${escalationRate.toFixed(1)}%`}
            variant="warning"
            subtitle="Conversations escalated"
          />
          <MetricCard
            icon={<Brain className="h-5 w-5" />}
            title="Knowledge Gaps"
            value={knowledgeGaps}
            variant="neutral"
            subtitle="Areas for improvement"
          />
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <SentimentChart data={metrics?.sentimentDistribution} />
          <TopicsChart data={metrics?.topTopics} />
        </div>

        {/* AI Insights */}
        <InsightsSection aiInsights={data.aiInsights} />
        
        {/* Knowledge Base Generator */}
        <KnowledgeBaseGenerator />

        {/* Action Buttons */}
        <div className="mt-8 flex gap-3 flex-wrap">
          <button
            onClick={() => refreshInsights()}
            disabled={loading || isProcessing}
            className="px-4 py-2.5 bg-[var(--surface-elevated)] text-[var(--text-secondary)] rounded-[var(--radius-lg)] border border-[var(--border-default)] hover:border-[var(--brand-primary)]/50 hover:text-[var(--text-primary)] transition-colors duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Brain className="h-4 w-4" />
            <span>{isProcessing ? 'Refreshing...' : 'Refresh Insights'}</span>
          </button>
          
          <button
            onClick={analyzeZainjoData}
            disabled={loading || isProcessing}
            className="px-4 py-2.5 bg-[var(--surface-elevated)] text-[var(--text-secondary)] rounded-[var(--radius-lg)] border border-[var(--border-default)] hover:border-emerald-500/50 hover:text-[var(--text-primary)] transition-colors duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Database className="h-4 w-4" />
            <span>{isProcessing ? 'Processing...' : 'Analyze Dataset'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ModernDashboard; 