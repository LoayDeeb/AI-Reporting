'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import { 
  Brain, MessageSquare, Clock, TrendingUp, Heart, 
  AlertTriangle, Target, Users, Award,
  ThumbsUp, Activity, Search, Palette
} from 'lucide-react';
import { ModernDashboard } from '../components/Dashboard';
import Navigation from '../components/Navigation';

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

interface AnalyticsData {
  senderID: string;
  conversationLength: number;
  firstResponseTime?: number;
  sentiment: 'positive' | 'negative' | 'neutral';
  sentimentScore: number;
  topics: string[];
  subCategories: string[];
  qualityScore: number;
  qualityReasons?: string[];
  knowledgeGaps: string[];
  summary: string;
}

interface AIInsights {
  insights: string;
  recommendations: string[];
  trends: string[];
}

interface DashboardData {
  analytics?: AnalyticsData[];
  metrics?: Metrics;
  aiInsights?: AIInsights;
  totalConversations?: number;
  conversationLengths?: number[];
  senderIDs?: string[];
  analysisType?: string;
  // Sample conversation data
  senderID?: string;
  messages?: Array<{
    ID: string;
    from?: 'bot' | 'user';
    MessageText?: string;
    TimeSent: string;
  }>;
  fastMode?: boolean;
  sampleSize?: number;
}

export default function Dashboard() {
  const [data, setData] = useState<DashboardData>({});
  const [loading, setLoading] = useState(false);
  const [analysisType, setAnalysisType] = useState<'basic' | 'sample' | 'full'>('basic');
  const [selectedSender, setSelectedSender] = useState<string>('');
  const [senderAnalysis, setSenderAnalysis] = useState<AnalyticsData | null>(null);
  const [useModernDesign, setUseModernDesign] = useState(true);
  const [demoMode, setDemoMode] = useState(true);

  const loadData = async (type: 'basic' | 'sample' | 'full', fastMode = false, limit = 0, optimization: 'standard' | 'aggressive' | 'extreme' = 'aggressive') => {
    setLoading(true);
    try {
      let url = `/api/analyze?action=${type}`;
      if (fastMode) url += `&fastMode=true`;
      if (limit > 0) url += `&sampleSize=${limit}`;
      if (fastMode && optimization) url += `&optimization=${optimization}`;
      
      const response = await fetch(url);
      const result = await response.json();
      setData(result);
      setAnalysisType(type);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadZainjoData = async (fastMode = true, limit = 0, optimization: 'standard' | 'aggressive' | 'extreme' = 'aggressive') => {
    setLoading(true);
    try {
      let url = `/api/analyze-zainjo?action=full`;
      if (fastMode) url += `&fastMode=true`;
      // Don't add sampleSize parameter if limit is 0 (means all conversations)
      if (limit > 0) url += `&sampleSize=${limit}`;
      if (fastMode && optimization) url += `&optimization=${optimization}`;
      
      const response = await fetch(url);
      const result = await response.json();
      if (result.success) {
        // Transform Zainjo data structure to match dashboard expectations
        const transformedData = {
          ...result,
          metrics: {
            totalConversations: result.dashboardMetrics?.totalConversations || 0,
            avgQualityScore: result.dashboardMetrics?.avgQualityScore || 0,
            avgConversationLength: result.dashboardMetrics?.avgConversationLength || 0,
            avgFirstResponseTime: 2500, // Default value for Zainjo data
            sentimentDistribution: result.dashboardMetrics?.sentimentDistribution || {
              positive: 0,
              negative: 0,
              neutral: 0
            },
            topTopics: result.dashboardMetrics?.topIntents?.map((intent: any) => ({
              topic: intent.item,
              count: intent.count
            })) || [],
            topSubCategories: [],
            topKnowledgeGaps: result.dashboardMetrics?.topKnowledgeGaps?.map((gap: any) => ({
              gap: gap.item,
              count: gap.count
            })) || [],
            escalationRate: 15, // Default value for Zainjo data
            resolutionRate: 85, // Default value for Zainjo data
            platformScore: {
              overallScore: result.dashboardMetrics?.avgQualityScore || 0,
              scoreBreakdown: {
                qualityScore: result.dashboardMetrics?.avgQualityScore || 0,
                sentimentScore: result.dashboardMetrics?.sentimentDistribution?.positive || 0,
                responseTimeScore: 75, // Default value
                resolutionScore: 85 // Default value
              },
              grade: getGradeFromScore(result.dashboardMetrics?.avgQualityScore || 0),
              improvementAreas: result.dashboardMetrics?.topKnowledgeGaps?.slice(0, 3).map((gap: any) => gap.item) || []
            },
            trendsOverTime: []
          },
          totalConversations: result.dashboardMetrics?.totalConversations || 0,
          analysisType: 'zainjo',
          fastMode,
          sampleSize: limit
        };
        
        setData(transformedData);
        setAnalysisType('full');
      }
    } catch (error) {
      console.error('Error loading Zainjo data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Helper function to convert score to grade
  const getGradeFromScore = (score: number): 'A' | 'B' | 'C' | 'D' | 'F' => {
    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    return 'F';
  };

  // Handler for intelligent full analysis - optimized for large datasets
  const handleFullAnalysis = () => {
    // Use ALL conversations to match cached analysis (325k conversations)
    // This will load from cache instantly if available, or process all if cache is missing
    loadData('full', true, 0, 'aggressive'); // 0 = ALL conversations, will use cache if available
  };

  // Handler for individual conversation analysis - navigate to conversations page
  const handleConversationAnalysis = () => {
    // Navigate to the conversations page
    window.location.href = '/conversations';
  };

  // Handler for parallel processing completion
  const handleParallelProcessingComplete = () => {
    // Refresh the dashboard data when parallel processing completes
    // Use ALL conversations to match cached analysis
    loadData('full', true, 0, 'aggressive');
  };

  // Handler for Zainjo data analysis
  const handleZainjoAnalysis = () => {
    // Load ALL Zainjo conversations (0 = all conversations, will be cached)
    loadZainjoData(true, 0, 'aggressive');
  };

  const analyzeSender = async (senderID: string) => {
    if (!senderID) return;
    
    setLoading(true);
    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ senderID, action: 'analyze' })
      });
      const result = await response.json();
      setSenderAnalysis(result);
    } catch (error) {
      console.error('Error analyzing sender:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!demoMode) {
      loadData('basic');
    }
  }, [demoMode]);

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

  // Helper function to get grade color
  const getGradeColor = (grade: string) => {
    switch (grade) {
      case 'A': return 'text-green-600 bg-green-100';
      case 'B': return 'text-blue-600 bg-blue-100';
      case 'C': return 'text-yellow-600 bg-yellow-100';
      case 'D': return 'text-orange-600 bg-orange-100';
      case 'F': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  // If using modern design, render the new dashboard
  if (useModernDesign) {
    return (
      <div className="relative min-h-screen bg-gray-900">
        <Navigation />
        
        <div className="pt-16">
          <ModernDashboard 
            data={{
              ...data,
              optimizationLevel: data.fastMode ? 'aggressive' : 'standard'
            }} 
            loading={loading}
            onFullAnalysis={handleFullAnalysis}
            onConversationAnalysis={handleConversationAnalysis}
            onParallelProcessingComplete={handleParallelProcessingComplete}
            onZainjoAnalysis={handleZainjoAnalysis}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      {/* Design Toggle */}
      <div className="fixed top-4 right-4 z-50">
        <button
          onClick={() => setUseModernDesign(true)}
          className="flex items-center space-x-2 px-4 py-2 bg-white shadow-lg text-gray-700 rounded-lg border hover:bg-gray-50 transition-all duration-300"
        >
          <Palette className="h-4 w-4" />
          <span className="text-sm">Switch to Modern</span>
        </button>
      </div>
      
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Brain className="h-8 w-8 text-blue-600" />
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  AI-Powered Chatbot Analytics
                </h1>
                <p className="text-gray-600">
                  Intelligent conversation analysis with OpenAI integration
                </p>
              </div>
            </div>
            
            <div className="flex space-x-2">
              <button
                onClick={() => loadData('basic')}
                className={`px-4 py-2 rounded-lg ${
                  analysisType === 'basic' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-200 text-gray-700'
                }`}
                disabled={loading}
              >
                Basic Info
              </button>
              <button
                onClick={() => loadData('sample')}
                className={`px-4 py-2 rounded-lg ${
                  analysisType === 'sample' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-200 text-gray-700'
                }`}
                disabled={loading}
              >
                Sample Analysis
              </button>
              <button
                onClick={() => loadData('full')}
                className={`px-4 py-2 rounded-lg ${
                  analysisType === 'full' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-200 text-gray-700'
                }`}
                disabled={loading}
              >
                🤖 Full AI Analysis
              </button>
              
              {/* Fast Mode Options */}
              <div className="flex space-x-2 border-l pl-2 ml-2">
                <button
                  onClick={() => loadData('full', true, 100, 'extreme')}
                  className="px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
                  disabled={loading}
                  title="Analyze 100 conversations in extreme mode - perfect for quick demo"
                >
                  🏃 Ultra 100
                </button>
                <button
                  onClick={() => loadData('full', true, 1000, 'aggressive')}
                  className="px-4 py-2 rounded-lg bg-orange-600 text-white hover:bg-orange-700 disabled:opacity-50"
                  disabled={loading}
                  title="Analyze 1000 conversations in aggressive mode for quick results"
                >
                  ⚡ Fast 1K
                </button>
                <button
                  onClick={() => loadData('full', true, 5000, 'aggressive')}
                  className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
                  disabled={loading}
                  title="Analyze 5000 conversations in aggressive mode for comprehensive results"
                >
                  🚀 Fast 5K
                </button>
                <button
                  onClick={() => loadData('full', true, 0, 'aggressive')}
                  className="px-4 py-2 rounded-lg bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50"
                  disabled={loading}
                  title="Analyze ALL conversations in aggressive mode - 5x faster with 95% accuracy"
                >
                  💨 Aggressive ALL
                </button>
                <button
                  onClick={() => loadData('full', true, 0, 'extreme')}
                  className="px-4 py-2 rounded-lg bg-pink-600 text-white hover:bg-pink-700 disabled:opacity-50"
                  disabled={loading}
                  title="Analyze representative samples in extreme mode - 17x faster with 85% accuracy"
                >
                  🚀 Extreme ALL
                </button>
              </div>
            </div>
          </div>
        </div>

        {loading && (
          <div className="text-center py-12">
            <div className="inline-flex items-center space-x-2">
              <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-600 border-t-transparent"></div>
              <span className="text-gray-600">
                {analysisType === 'full' ? (
                  data.fastMode ? 
                    `⚡ Fast AI analysis in progress... ${data.sampleSize ? `(${data.sampleSize} samples)` : '(ALL conversations)'} This should complete much faster!` :
                    'Running AI analysis... This may take several minutes.'
                ) : 'Loading...'}
              </span>
            </div>
            {analysisType === 'full' && (
              <div className="mt-4 text-sm text-gray-500">
                {data.fastMode ? (
                  <>
                    <p>🚀 Fast Mode: Single AI call per conversation (5x faster than before!)</p>
                    <p>⏱️ Estimated time: {
                      data.sampleSize === 100 ? '1-2 minutes' :
                      data.sampleSize === 1000 ? '3-5 minutes' :
                      data.sampleSize === 5000 ? '10-15 minutes' :
                      '20-30 minutes for all conversations'
                    }</p>
                  </>
                ) : (
                  <p>⏱️ Standard mode: This will take 1-2 hours for full analysis</p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Platform Overall Score - Only show with full AI analysis */}
        {data.metrics?.platformScore && (
          <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg shadow-lg p-8 mb-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold mb-2">Platform Overall Score</h2>
                <div className="flex items-center space-x-4">
                  <div className="text-5xl font-bold">{data.metrics.platformScore.overallScore}</div>
                  <div className={`px-4 py-2 rounded-full text-2xl font-bold ${getGradeColor(data.metrics.platformScore.grade)} text-gray-800`}>
                    {data.metrics.platformScore.grade}
                  </div>
                </div>
              </div>
              <Award className="h-16 w-16 opacity-80" />
            </div>
            
            {/* Score Breakdown */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
              <div className="bg-white bg-opacity-20 rounded-lg p-4">
                <div className="text-sm opacity-90">Quality Score</div>
                <div className="text-2xl font-bold">{data.metrics.platformScore.scoreBreakdown.qualityScore}%</div>
              </div>
              <div className="bg-white bg-opacity-20 rounded-lg p-4">
                <div className="text-sm opacity-90">Sentiment Score</div>
                <div className="text-2xl font-bold">{data.metrics.platformScore.scoreBreakdown.sentimentScore}%</div>
              </div>
              <div className="bg-white bg-opacity-20 rounded-lg p-4">
                <div className="text-sm opacity-90">Response Time</div>
                <div className="text-2xl font-bold">{data.metrics.platformScore.scoreBreakdown.responseTimeScore}%</div>
              </div>
              <div className="bg-white bg-opacity-20 rounded-lg p-4">
                <div className="text-sm opacity-90">Resolution Rate</div>
                <div className="text-2xl font-bold">{data.metrics.platformScore.scoreBreakdown.resolutionScore}%</div>
              </div>
            </div>

            {/* Improvement Areas */}
            {data.metrics.platformScore.improvementAreas.length > 0 && (
              <div className="mt-4">
                <div className="text-sm opacity-90 mb-2">Areas for Improvement:</div>
                <div className="flex flex-wrap gap-2">
                  {data.metrics.platformScore.improvementAreas.map((area, index) => (
                    <span key={index} className="bg-white bg-opacity-20 px-3 py-1 rounded-full text-sm">
                      {area}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Basic Stats */}
        {data.totalConversations && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <div className="flex items-center">
                <Users className="h-8 w-8 text-blue-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Conversations</p>
                  <p className="text-2xl font-bold text-gray-900">{data.totalConversations}</p>
                </div>
              </div>
            </div>

            {data.metrics && (
              <>
                <div className="bg-white rounded-lg shadow-sm border p-6">
                  <div className="flex items-center">
                    <MessageSquare className="h-8 w-8 text-green-600" />
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Avg Conversation Length</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {Math.round(data.metrics.avgConversationLength)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow-sm border p-6">
                  <div className="flex items-center">
                    <Clock className="h-8 w-8 text-yellow-600" />
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Avg Response Time</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {data.metrics.avgFirstResponseTime < 1000 
                          ? `${Math.round(data.metrics.avgFirstResponseTime)}ms`
                          : `${Math.round(data.metrics.avgFirstResponseTime / 1000)}s`
                        }
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow-sm border p-6">
                  <div className="flex items-center">
                    <Target className="h-8 w-8 text-purple-600" />
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Quality Score</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {Math.round(data.metrics.avgQualityScore)}%
                      </p>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* Enhanced Metrics - Only show with full AI analysis */}
        {data.metrics?.escalationRate !== undefined && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <div className="flex items-center">
                <AlertTriangle className="h-8 w-8 text-red-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Escalation Rate</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {Math.round(data.metrics.escalationRate)}%
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border p-6">
              <div className="flex items-center">
                <ThumbsUp className="h-8 w-8 text-green-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Resolution Rate</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {Math.round(data.metrics.resolutionRate)}%
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border p-6">
              <div className="flex items-center">
                <Activity className="h-8 w-8 text-indigo-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Knowledge Gaps</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {data.metrics.topKnowledgeGaps?.length || 0}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Individual Conversation Analysis */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
            <Search className="h-6 w-6 mr-2" />
            Individual Conversation Analysis
          </h2>
          <div className="flex space-x-4">
            <input
              type="text"
              value={selectedSender}
              onChange={(e) => setSelectedSender(e.target.value)}
              placeholder="Enter Sender ID or Conversation ID"
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button
              onClick={() => analyzeSender(selectedSender)}
              disabled={!selectedSender || loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              🤖 Quick Analysis
            </button>
            <button
              onClick={() => window.location.href = '/conversation'}
              className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
            >
              📊 Detailed Analysis
            </button>
          </div>
          
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Quick Analysis:</strong> Basic AI insights shown here. 
              <strong> Detailed Analysis:</strong> Per-message analysis, conversation timeline, and advanced metrics.
            </p>
          </div>
          
          {senderAnalysis && (
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <h3 className="font-semibold text-lg mb-2">Quick Analysis Results for {senderAnalysis.senderID}</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div>
                  <span className="text-sm text-gray-600">Sentiment:</span>
                  <div className={`font-medium ${
                    senderAnalysis.sentiment === 'positive' ? 'text-green-600' :
                    senderAnalysis.sentiment === 'negative' ? 'text-red-600' : 'text-yellow-600'
                  }`}>
                    {senderAnalysis.sentiment.charAt(0).toUpperCase() + senderAnalysis.sentiment.slice(1)}
                  </div>
                </div>
                <div>
                  <span className="text-sm text-gray-600">Quality Score:</span>
                  <div className="font-medium">{Math.round(senderAnalysis.qualityScore)}%</div>
                </div>
                <div>
                  <span className="text-sm text-gray-600">Length:</span>
                  <div className="font-medium">{senderAnalysis.conversationLength} messages</div>
                </div>
              </div>
              
              {senderAnalysis.topics.length > 0 && (
                <div className="mb-4">
                  <span className="text-sm text-gray-600">Detected Topics:</span>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {senderAnalysis.topics.map((topic: string, index: number) => (
                      <span key={index} className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm">
                        {topic}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              
              {senderAnalysis.knowledgeGaps.length > 0 && (
                <div className="mb-4">
                  <span className="text-sm text-gray-600">Knowledge Gaps:</span>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {senderAnalysis.knowledgeGaps.map((gap, index) => (
                      <span key={index} className="bg-red-100 text-red-800 px-2 py-1 rounded text-sm">
                        {gap}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              
              <div className="mb-4">
                <span className="text-sm text-gray-600">AI Summary:</span>
                <p className="mt-1 text-gray-800">{senderAnalysis.summary}</p>
              </div>

              <div className="pt-4 border-t border-gray-200">
                <button
                  onClick={() => window.location.href = `/conversation?id=${senderAnalysis.senderID}`}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm"
                >
                  📊 View Detailed Analysis
                </button>
              </div>
            </div>
          )}
        </div>

        {/* AI Analysis Charts */}
        {data.metrics && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Sentiment Distribution */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Heart className="h-5 w-5 mr-2 text-red-500" />
                Sentiment Distribution
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={[
                      { name: 'Positive', value: Math.round(data.metrics.sentimentDistribution.positive) },
                      { name: 'Neutral', value: Math.round(data.metrics.sentimentDistribution.neutral) },
                      { name: 'Negative', value: Math.round(data.metrics.sentimentDistribution.negative) }
                    ]}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {[0, 1, 2].map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Top Intents */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Target className="h-5 w-5 mr-2 text-blue-500" />
                                  Top User Topics
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={data.metrics.topTopics.slice(0, 6)}>
                  <CartesianGrid strokeDasharray="3 3" />
                                      <XAxis dataKey="topic" angle={-45} textAnchor="end" height={80} />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* AI Insights Section - Only show for full AI analysis */}
        {data.aiInsights && data.analysisType === 'full_ai' && (
          <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Brain className="h-5 w-5 mr-2 text-purple-500" />
              🤖 AI-Powered Insights
            </h3>
            
            {/* Overall Analysis */}
            <div className="mb-6">
              <h4 className="font-semibold text-gray-900 mb-2">Overall Analysis</h4>
              <p className="text-gray-700 bg-purple-50 rounded-lg p-4 border-l-4 border-purple-500">
                {data.aiInsights.insights}
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* AI Recommendations */}
              <div>
                <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                  <TrendingUp className="h-4 w-4 mr-2 text-blue-500" />
                  AI Recommendations
                </h4>
                <ul className="space-y-2">
                  {data.aiInsights.recommendations.map((rec, index) => (
                    <li key={index} className="flex items-start">
                      <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium mr-3 mt-0.5">
                        {index + 1}
                      </span>
                      <span className="text-gray-700">{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* AI Trends */}
              <div>
                <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                  <Target className="h-4 w-4 mr-2 text-green-500" />
                  Identified Trends
                </h4>
                <ul className="space-y-2">
                  {data.aiInsights.trends.map((trend, index) => (
                    <li key={index} className="flex items-start">
                      <span className="flex-shrink-0 w-2 h-2 bg-green-500 rounded-full mr-3 mt-2"></span>
                      <span className="text-gray-700">{trend}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Sample Data Display */}
        {analysisType === 'sample' && data.senderID && (
          <div className="mt-6 bg-white rounded-lg shadow-sm border p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Sample Conversation</h3>
            <p className="text-sm text-gray-600 mb-2">SenderID: {data.senderID}</p>
            <p className="text-sm text-gray-600">Messages: {data.messages?.length}</p>
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 text-center text-gray-500 text-sm">
          <p>Powered by OpenAI GPT-3.5 • Built with Next.js 14 & React</p>
        </div>
      </div>
    </div>
  );
}
