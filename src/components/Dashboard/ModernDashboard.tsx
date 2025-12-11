'use client';

import React, { useState } from 'react';
import Header from './Header';
import MetricCard from './MetricCard';
import SentimentChart from './Charts/SentimentChart';
import TopicsChart from './Charts/TopicsChart';
import InsightsSection from './Insights/InsightsSection';
import KnowledgeBaseGenerator from './Insights/KnowledgeBaseGenerator';
import ParallelProcessingPanel from '../ParallelProcessing/ParallelProcessingPanel';
import {
  Users2,
  Clock,
  Target,
  AlertTriangle,
  ThumbsUp,
  Brain,
  MessageSquare,
  TrendingUp,
  Activity,
  Zap,
  UserPlus,
  ArrowRightLeft
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
  topTransferReasons?: Array<{ reason: string; count: number }>;
  transferRate?: number;
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
  onChannelChange
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
  const transferRate = metrics?.transferRate || 0;
  const topTransferReasons = metrics?.topTransferReasons || [];

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
      <div className="min-h-screen bg-gray-900 text-white">
        <div className="container mx-auto px-4 py-8">
          <div className="animate-pulse">
            <div className="h-48 bg-gray-800 rounded-2xl mb-8"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-32 bg-gray-800 rounded-xl"></div>
              ))}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-32 bg-gray-800 rounded-xl"></div>
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
      <div className="min-h-screen bg-gray-900 text-white">
        <div className="container mx-auto px-4 py-8">
          {/* Header */}
          <Header
            score={0}
            grade="N/A"
            totalConversations={0}
            analysisType="basic"
            fastMode={false}
            optimizationLevel="standard"
            loading={loading || isProcessing}
            onFullAnalysis={handleStartAnalysis}
            onConversationAnalysis={onConversationAnalysis}
          />

          {/* Welcome State */}
          <div className="text-center py-20">
            <div className="text-8xl mb-8">🚀</div>
            <h2 className="text-4xl font-bold text-white mb-6">Welcome to AI Analytics</h2>
            <p className="text-xl text-gray-400 mb-12 max-w-2xl mx-auto">
              Get intelligent insights from your chatbot conversations using advanced AI analysis. 
              Choose an analysis type to get started.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto mb-12">
              {/* Intelligent Analysis Card */}
              <div className="bg-gradient-to-br from-emerald-500/10 to-cyan-500/10 border border-emerald-500/20 rounded-2xl p-8 hover:border-emerald-500/40 transition-all duration-300">
                <div className="text-4xl mb-4">⚡</div>
                <h3 className="text-2xl font-bold text-white mb-4">Intelligent Analysis</h3>
                <p className="text-gray-300 mb-6">
                  AI-powered analysis with smart optimization. Fast processing with high accuracy.
                </p>
                <ul className="text-left text-gray-400 space-y-2 mb-6">
                  <li>• Smart conversation selection</li>
                  <li>• Sentiment & intent analysis</li>
                  <li>• AI recommendations</li>
                  <li>• Performance insights</li>
                </ul>
                <button
                  onClick={handleStartAnalysis}
                  className="w-full bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-white px-6 py-3 rounded-xl font-semibold transition-all duration-300"
                >
                  Start Analysis
                </button>
              </div>

              {/* Individual Conversations Card */}
              <div className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-2xl p-8 hover:border-purple-500/40 transition-all duration-300">
                <div className="text-4xl mb-4">💬</div>
                <h3 className="text-2xl font-bold text-white mb-4">Analyze Conversations</h3>
                <p className="text-gray-300 mb-6">
                  Select and analyze specific conversations for detailed insights and quality assessment.
                </p>
                <ul className="text-left text-gray-400 space-y-2 mb-6">
                  <li>• Browse conversation list</li>
                  <li>• Individual analysis</li>
                  <li>• Detailed metrics</li>
                  <li>• Quality scoring</li>
                </ul>
                <button
                  onClick={onConversationAnalysis}
                  className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white px-6 py-3 rounded-xl font-semibold transition-all duration-300"
                >
                  Browse Conversations
                </button>
              </div>

              {/* Zainjo Analysis Card */}
              <div className="bg-gradient-to-br from-orange-500/10 to-red-500/10 border border-orange-500/20 rounded-2xl p-8 hover:border-orange-500/40 transition-all duration-300">
                <div className="text-4xl mb-4">🔥</div>
                <h3 className="text-2xl font-bold text-white mb-4">Zainjo Analysis</h3>
                <p className="text-gray-300 mb-6">
                  Analyze Zainjo conversation data with advanced AI processing and insights generation.
                </p>
                <ul className="text-left text-gray-400 space-y-2 mb-6">
                  <li>• 18,668 conversations</li>
                  <li>• Intent classification</li>
                  <li>• Quality assessment</li>
                  <li>• Performance metrics</li>
                </ul>
                <button
                  onClick={onZainjoAnalysis}
                  className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white px-6 py-3 rounded-xl font-semibold transition-all duration-300"
                >
                  Analyze Zainjo Data
                </button>
              </div>
            </div>

            {/* Parallel Processing Panel */}
            <div className="max-w-6xl mx-auto">
              <ParallelProcessingPanel onProcessingComplete={onParallelProcessingComplete} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <Header
          score={platformScore?.overallScore || qualityScore}
          grade={platformScore?.grade || 'N/A'}
          totalConversations={totalConversations}
          analysisType={data.analysisType}
          fastMode={data.fastMode}
          optimizationLevel={data.optimizationLevel}
          loading={loading || isProcessing}
          onFullAnalysis={handleStartAnalysis}
          onConversationAnalysis={onConversationAnalysis}
        />

        {/* Channel Filter */}
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <span className="text-gray-400 font-medium">Filter by Channel:</span>
            <div className="flex space-x-2">
              <button
                onClick={() => onChannelChange?.('all')}
                className={`px-4 py-2 rounded-lg font-medium transition-all duration-300 ${
                  selectedChannel === 'all'
                    ? 'bg-cyan-500 text-white'
                    : 'bg-gray-700/50 text-gray-300 hover:bg-gray-600/50'
                }`}
              >
                All Channels
              </button>
              {availableChannels.map((channel) => (
                <button
                  key={channel}
                  onClick={() => onChannelChange?.(channel)}
                  className={`px-4 py-2 rounded-lg font-medium transition-all duration-300 capitalize ${
                    selectedChannel === channel
                      ? channel === 'app' 
                        ? 'bg-purple-500 text-white' 
                        : 'bg-blue-500 text-white'
                      : 'bg-gray-700/50 text-gray-300 hover:bg-gray-600/50'
                  }`}
                >
                  {channel === 'app' ? '📱 App' : channel === 'web' ? '🌐 Web' : channel}
                </button>
              ))}
            </div>
          </div>
          {selectedChannel !== 'all' && (
            <div className="text-sm text-gray-400">
              Showing <span className="text-cyan-400 font-semibold capitalize">{selectedChannel}</span> conversations only
            </div>
          )}
        </div>

        {/* Primary Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <MetricCard
            icon={<Users2 className="h-6 w-6" />}
            title="Total Conversations"
            value={totalConversations.toLocaleString()}
            color="cyan"
            subtitle={data.fastMode ? 'Smart analysis' : 'Full dataset'}
          />
          <MetricCard
            icon={<MessageSquare className="h-6 w-6" />}
            title="Avg Conversation Length"
            value={`${avgLength.toFixed(1)} msgs`}
            color="emerald"
            subtitle="Messages per conversation"
          />
          <MetricCard
            icon={<Target className="h-6 w-6" />}
            title="Quality Score"
            value={`${qualityScore.toFixed(0)}%`}
            color="fuchsia"
            subtitle="Overall performance"
          />
        </div>

        {/* Secondary Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <MetricCard
            icon={<AlertTriangle className="h-6 w-6" />}
            title="Escalation Rate"
                            value={`${escalationRate.toFixed(1)}%`}
            color="rose"
            subtitle="Conversations escalated"
          />
          <MetricCard
            icon={<ThumbsUp className="h-6 w-6" />}
            title="Resolution Rate"
                            value={`${resolutionRate.toFixed(0)}%`}
            color="emerald"
            subtitle="Successfully resolved"
          />
          <MetricCard
            icon={<Brain className="h-6 w-6" />}
            title="Knowledge Gaps"
            value={knowledgeGaps}
            color="violet"
            subtitle="Areas for improvement"
          />
        </div>

        {/* Transfer Rate Metric - show if we have transfer data */}
        {transferRate > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <MetricCard
              icon={<ArrowRightLeft className="h-6 w-6" />}
              title="Transfer to Agent Rate"
              value={`${transferRate.toFixed(1)}%`}
              color="amber"
              subtitle="Conversations transferred to human agents"
            />
            <MetricCard
              icon={<UserPlus className="h-6 w-6" />}
              title="Top Transfer Reason"
              value={topTransferReasons.length > 0 ? topTransferReasons[0].reason.substring(0, 30) + '...' : 'N/A'}
              color="orange"
              subtitle={topTransferReasons.length > 0 ? `${topTransferReasons[0].count} occurrences` : 'No transfers recorded'}
            />
          </div>
        )}

        {/* Transfer Reasons Section */}
        {topTransferReasons.length > 0 && (
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 mb-8 border border-amber-500/20">
            <div className="flex items-center mb-6">
              <div className="p-2 bg-amber-500/10 rounded-lg border border-amber-500/20 mr-3">
                <ArrowRightLeft className="text-amber-400 h-6 w-6" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-white">Reasons for Transfer to Human Agent</h3>
                <p className="text-gray-400 text-sm">Why users were transferred from bot to human agents</p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {topTransferReasons.slice(0, 6).map((item, index) => (
                <div 
                  key={index} 
                  className="p-4 bg-gradient-to-r from-amber-500/5 to-orange-500/5 rounded-lg border border-amber-500/10 hover:border-amber-500/30 transition-all duration-300"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="text-gray-300 text-sm leading-relaxed">{item.reason}</p>
                    </div>
                    <div className="ml-3 flex-shrink-0">
                      <span className="px-2 py-1 bg-amber-500/20 text-amber-400 rounded-full text-xs font-semibold">
                        {item.count}x
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <SentimentChart data={metrics?.sentimentDistribution} />
                          <TopicsChart data={metrics?.topTopics} />
        </div>

        {/* AI Insights */}
        <InsightsSection aiInsights={data.aiInsights} />
        
        {/* Knowledge Base Generator */}
        <KnowledgeBaseGenerator />

        {/* Performance Stats */}
        {data.fastMode && (
          <div className="mt-8 p-6 bg-gradient-to-r from-green-500/10 to-blue-500/10 rounded-xl border border-green-500/20">
            <div className="flex items-center mb-4">
              <Zap className="h-6 w-6 text-green-400 mr-3" />
              <h3 className="text-xl font-semibold text-white">Smart Analysis Performance</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-green-500/10 rounded-lg border border-green-500/20">
                <p className="text-2xl font-bold text-green-400 mb-1">Fast</p>
                <p className="text-sm text-gray-400">Processing Speed</p>
              </div>
              <div className="text-center p-4 bg-blue-500/10 rounded-lg border border-blue-500/20">
                <p className="text-2xl font-bold text-blue-400 mb-1">High</p>
                <p className="text-sm text-gray-400">Accuracy Level</p>
              </div>
              <div className="text-center p-4 bg-purple-500/10 rounded-lg border border-purple-500/20">
                <p className="text-2xl font-bold text-purple-400 mb-1">Smart</p>
                <p className="text-sm text-gray-400">Selection Method</p>
              </div>
            </div>
          </div>
        )}

        <div className="flex gap-4 flex-wrap">
          <button
            onClick={() => refreshInsights()}
            disabled={loading || isProcessing}
            className="px-6 py-3 bg-violet-500/20 text-violet-300 rounded-xl border border-violet-500/30 hover:bg-violet-500/30 hover:border-violet-500/50 transition-all duration-300 font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            <Brain className="h-5 w-5" />
            <span>{isProcessing ? 'Refreshing...' : 'Refresh Insights'}</span>
          </button>
          
          <button
            onClick={analyzeZainjoData}
            disabled={loading || isProcessing}
            className="px-6 py-3 bg-emerald-500/20 text-emerald-300 rounded-xl border border-emerald-500/30 hover:bg-emerald-500/30 hover:border-emerald-500/50 transition-all duration-300 font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            <Brain className="h-5 w-5" />
            <span>{isProcessing ? 'Processing...' : 'Analyze Zainjo Data'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ModernDashboard; 