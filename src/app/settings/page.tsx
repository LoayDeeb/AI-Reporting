'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { AnalysisProgress, AnalysisJobList } from '@/components/ui/analysis-progress';

interface MetricConfig {
  key: string;
  name: string;
  description: string;
  range?: string;
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
  error_message: string | null;
}

const defaultDashboardMetrics: MetricConfig[] = [
  {
    key: 'sentiment',
    name: 'Sentiment',
    description: 'Analyze the overall emotional tone of the conversation (positive/negative/neutral)',
  },
  {
    key: 'sentimentScore',
    name: 'Sentiment Score',
    description: 'A number from -1 to 1 indicating sentiment intensity',
    range: '-1 to 1',
  },
  {
    key: 'intents',
    name: 'Intents',
    description: 'Array of specific conversation topics discussed (e.g., product_pricing, account_management, technical_support, billing_inquiries, service_complaints)',
  },
  {
    key: 'subCategories',
    name: 'Sub Categories',
    description: 'Array of specific conversation sub-topics (e.g., billing_issues, technical_support, product_information)',
  },
  {
    key: 'qualityScore',
    name: 'Quality Score',
    description: 'How well the bot answered user questions (0-100)',
    range: '0-100',
  },
  {
    key: 'qualityReasons',
    name: 'Quality Reasons',
    description: 'Specific reasons for the quality score - be detailed about what the bot did well or poorly',
  },
  {
    key: 'knowledgeGaps',
    name: 'Knowledge Gaps',
    description: 'Specific things the bot couldn\'t answer or handle properly (e.g., Product pricing information, Technical support for mobile app, Refund policy details)',
  },
  {
    key: 'summary',
    name: 'Summary',
    description: 'Brief summary of what happened in the conversation (max 100 words)',
  },
  {
    key: 'recommendations',
    name: 'Recommendations',
    description: 'Specific actionable recommendations for improving this type of conversation (e.g., Add specific pricing information to bot knowledge base)',
  },
  {
    key: 'trends',
    name: 'Trends',
    description: 'Patterns or trends observed in this conversation (e.g., User required multiple attempts to get pricing info)',
  },
  {
    key: 'transferReason',
    name: 'Transfer Reason',
    description: 'Why the user was transferred to a human agent (e.g., Bot couldn\'t resolve billing dispute, User requested human assistance, Complex technical issue beyond bot capabilities)',
  },
  {
    key: 'wasTransferredToAgent',
    name: 'Was Transferred to Agent',
    description: 'Boolean indicating if user was transferred to human agent. Look for phrases like "Please wait until I connect you to an Agent" (English) or "الرجاء الانتظار حتى أقوم بتحويلك الى موظف" (Arabic)',
  },
];

const defaultHumanAgentMetrics: MetricConfig[] = [
  {
    key: 'quality_score',
    name: 'Quality Score',
    description: 'Technical accuracy, completeness, and efficiency of the agent\'s responses',
    range: '0-100',
  },
  {
    key: 'empathy_score',
    name: 'Empathy Score',
    description: 'Understanding, compassion, and emotional connection shown by the agent',
    range: '0-100',
  },
  {
    key: 'script_adherence',
    name: 'Script Adherence',
    description: 'How well the agent follows protocols and uses professional language',
    range: '0-100',
  },
  {
    key: 'escalation_risk',
    name: 'Escalation Risk',
    description: 'Level of customer frustration and unresolved issues that may lead to escalation',
    range: '0-100',
  },
  {
    key: 'customer_effort_score',
    name: 'Customer Effort Score',
    description: 'How hard the customer had to work to get their issue resolved',
    range: '0-100',
  },
  {
    key: 'sentiment_impact',
    name: 'Sentiment Impact',
    description: 'How the agent affected customer mood (Positive Impact, Neutral Impact, Negative Impact, Mixed Impact)',
  },
  {
    key: 'sentiment_analysis',
    name: 'Sentiment Analysis',
    description: 'Track customer sentiment progression: initial sentiment, final sentiment, and whether it improved/maintained/worsened',
  },
  {
    key: 'knowledge_gaps',
    name: 'Knowledge Gaps',
    description: 'Topics or information the agent didn\'t know or couldn\'t provide',
  },
  {
    key: 'coaching_opportunities',
    name: 'Coaching Opportunities',
    description: 'Specific areas where the agent could improve with additional training',
  },
  {
    key: 'churn_signals',
    name: 'Churn Signals',
    description: 'Cancellation threats, competitor mentions, or other signs customer may leave',
  },
  {
    key: 'root_causes',
    name: 'Root Causes',
    description: 'Underlying system or process issues that led to the customer\'s problem',
  },
  {
    key: 'emotions',
    name: 'Emotions',
    description: 'Customer emotional states detected during the conversation',
  },
];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'humanAgent'>('dashboard');
  const [dashboardMetrics, setDashboardMetrics] = useState<MetricConfig[]>(defaultDashboardMetrics);
  const [humanAgentMetrics, setHumanAgentMetrics] = useState<MetricConfig[]>(defaultHumanAgentMetrics);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  // Job tracking state
  const [currentJob, setCurrentJob] = useState<AnalysisJob | null>(null);
  const [recentJobs, setRecentJobs] = useState<AnalysisJob[]>([]);
  const [showJobHistory, setShowJobHistory] = useState(false);
  const [versionName, setVersionName] = useState('');
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  const loadSettings = useCallback(async (type: 'dashboard' | 'humanAgent') => {
    try {
      const response = await fetch(`/api/settings?type=${type}`);
      const data = await response.json();
      
      if (data.success && data.metricsConfig) {
        if (type === 'dashboard') {
          setDashboardMetrics(data.metricsConfig);
        } else {
          setHumanAgentMetrics(data.metricsConfig);
        }
        if (data.updatedAt) {
          setLastSaved(new Date(data.updatedAt).toLocaleString());
        }
      }
    } catch (error) {
      console.error(`Error loading ${type} settings:`, error);
    }
  }, []);

  const loadRecentJobs = useCallback(async () => {
    try {
      const response = await fetch(`/api/analysis-jobs?type=${activeTab}&limit=5`);
      const data = await response.json();
      if (data.success && data.jobs) {
        setRecentJobs(data.jobs);
        
        // Check if there's an active job
        const activeJob = data.jobs.find((j: AnalysisJob) => 
          j.status === 'pending' || j.status === 'running'
        );
        if (activeJob && !currentJob) {
          setCurrentJob(activeJob);
        }
      }
    } catch (error) {
      console.error('Error loading recent jobs:', error);
    }
  }, [activeTab, currentJob]);

  useEffect(() => {
    const loadAllSettings = async () => {
      setIsLoading(true);
      await Promise.all([
        loadSettings('dashboard'),
        loadSettings('humanAgent'),
      ]);
      await loadRecentJobs();
      setIsLoading(false);
    };
    loadAllSettings();
  }, [loadSettings, loadRecentJobs]);

  // Poll for job updates when there's an active job
  useEffect(() => {
    if (currentJob && (currentJob.status === 'pending' || currentJob.status === 'running')) {
      pollingRef.current = setInterval(async () => {
        try {
          const response = await fetch(`/api/analysis-jobs?id=${currentJob.id}`);
          const data = await response.json();
          if (data.success && data.job) {
            setCurrentJob(data.job);
            
            // Stop polling if job is no longer active
            if (!['pending', 'running'].includes(data.job.status)) {
              if (pollingRef.current) {
                clearInterval(pollingRef.current);
                pollingRef.current = null;
              }
              // Refresh the jobs list
              loadRecentJobs();
            }
          }
        } catch (error) {
          console.error('Error polling job status:', error);
        }
      }, 1000);

      return () => {
        if (pollingRef.current) {
          clearInterval(pollingRef.current);
          pollingRef.current = null;
        }
      };
    }
  }, [currentJob, loadRecentJobs]);

  // Reload jobs when tab changes
  useEffect(() => {
    loadRecentJobs();
  }, [activeTab, loadRecentJobs]);

  const updateMetricDescription = (
    type: 'dashboard' | 'humanAgent',
    key: string,
    newDescription: string
  ) => {
    if (type === 'dashboard') {
      setDashboardMetrics(prev =>
        prev.map(m => (m.key === key ? { ...m, description: newDescription } : m))
      );
    } else {
      setHumanAgentMetrics(prev =>
        prev.map(m => (m.key === key ? { ...m, description: newDescription } : m))
      );
    }
    setHasUnsavedChanges(true);
  };

  const saveSettings = async () => {
    setIsSaving(true);
    setMessage(null);
    
    try {
      const metricsConfig = activeTab === 'dashboard' ? dashboardMetrics : humanAgentMetrics;
      
      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: activeTab,
          metricsConfig,
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        setMessage('✅ Settings saved successfully!');
        setHasUnsavedChanges(false);
        if (data.updatedAt) {
          setLastSaved(new Date(data.updatedAt).toLocaleString());
        }
      } else {
        setMessage(`❌ Error saving: ${data.error || 'Failed to save settings'}`);
      }
    } catch (error) {
      setMessage(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsSaving(false);
    }
  };

  const generatePrompt = (type: 'dashboard' | 'humanAgent'): string => {
    const metrics = type === 'dashboard' ? dashboardMetrics : humanAgentMetrics;
    
    if (type === 'dashboard') {
      const metricDescriptions = metrics.map(m => {
        const rangeInfo = m.range ? ` (${m.range})` : '';
        return `- '${m.key}'${rangeInfo}: ${m.description}`;
      }).join('\n');
      
      return `You are a conversation analyzer for a chatbot analytics platform. Analyze the conversation and return ONLY a valid JSON object with:
${metricDescriptions}

Be SPECIFIC in your analysis. Handle Arabic and English text. Do not include any markdown formatting or code blocks.`;
    } else {
      const metricDescriptions = metrics.map(m => {
        const rangeInfo = m.range ? ` (${m.range})` : '';
        return `- ${m.name}${rangeInfo}: ${m.description}`;
      }).join('\n');
      
      return `Analyze this customer service conversation and return ALL metrics in a single JSON response.

Metrics to analyze:
${metricDescriptions}

Return ONLY valid JSON with the metric keys matching the exact names specified.`;
    }
  };

  const handleStartAnalysis = async () => {
    // Save settings first if there are unsaved changes
    if (hasUnsavedChanges) {
      await saveSettings();
    }
    
    setMessage(null);
    
    try {
      const prompt = generatePrompt(activeTab);
      const metricsConfig = activeTab === 'dashboard' ? dashboardMetrics : humanAgentMetrics;
      
      const response = await fetch('/api/analysis-jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: activeTab,
          customPrompt: prompt,
          metricsConfig,
          versionName: versionName || undefined,
        }),
      });

      const data = await response.json();
      
      if (data.success && data.job) {
        setCurrentJob(data.job);
        setVersionName('');
        setMessage(`🚀 Analysis started! Tracking ${data.job.total_conversations} conversations.`);
      } else {
        setMessage(`❌ Error: ${data.error || 'Failed to start analysis'}`);
      }
    } catch (error) {
      setMessage(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleCancelJob = async () => {
    if (!currentJob) return;
    
    try {
      const response = await fetch(`/api/analysis-jobs?id=${currentJob.id}`, {
        method: 'DELETE',
      });
      const data = await response.json();
      
      if (data.success) {
        setCurrentJob(prev => prev ? { ...prev, status: 'cancelled' } : null);
        setMessage('🚫 Analysis cancelled');
      }
    } catch (error) {
      setMessage(`❌ Error cancelling: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleCloseJob = () => {
    setCurrentJob(null);
    loadRecentJobs();
  };

  const resetToDefaults = async () => {
    if (activeTab === 'dashboard') {
      setDashboardMetrics(defaultDashboardMetrics);
    } else {
      setHumanAgentMetrics(defaultHumanAgentMetrics);
    }
    
    try {
      const response = await fetch(`/api/settings?type=${activeTab}`, {
        method: 'DELETE',
      });
      const data = await response.json();
      
      if (data.success) {
        setMessage('✅ Reset to default descriptions and cleared saved settings');
        setHasUnsavedChanges(false);
        setLastSaved(null);
      }
    } catch (error) {
      setMessage('✅ Reset to default descriptions (local only)');
    }
  };

  const currentMetrics = activeTab === 'dashboard' ? dashboardMetrics : humanAgentMetrics;
  const hasActiveJob = currentJob && ['pending', 'running'].includes(currentJob.status);

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 max-w-6xl">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <svg className="animate-spin h-8 w-8 text-blue-500 mx-auto mb-4" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <p className="text-gray-400">Loading settings...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Analysis Settings</h1>
        <p className="text-gray-400">
          Customize metric descriptions used in AI analysis prompts
        </p>
        {lastSaved && (
          <p className="text-xs text-gray-500 mt-1">Last saved: {lastSaved}</p>
        )}
      </div>

      {/* Tab Navigation */}
      <div className="flex space-x-4 mb-6">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`px-6 py-3 rounded-lg font-medium transition-all ${
            activeTab === 'dashboard'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
          }`}
        >
          📊 Dashboard Metrics
        </button>
        <button
          onClick={() => setActiveTab('humanAgent')}
          className={`px-6 py-3 rounded-lg font-medium transition-all ${
            activeTab === 'humanAgent'
              ? 'bg-purple-600 text-white'
              : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
          }`}
        >
          👤 Human Agent Metrics
        </button>
      </div>

      {/* Current Analysis Progress */}
      {currentJob && (
        <Card className="bg-gray-800 border-gray-700 mb-6">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              {hasActiveJob ? '🔄' : '📊'} Current Analysis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <AnalysisProgress
              job={currentJob}
              onCancel={hasActiveJob ? handleCancelJob : undefined}
              onClose={!hasActiveJob ? handleCloseJob : undefined}
            />
          </CardContent>
        </Card>
      )}

      {/* Analysis History */}
      <Card className="bg-gray-800 border-gray-700 mb-6">
        <CardHeader>
          <CardTitle className="text-white flex items-center justify-between">
            <span className="flex items-center gap-2">
              📜 Analysis History
            </span>
            <button
              onClick={() => setShowJobHistory(!showJobHistory)}
              className="text-sm px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded transition-colors"
            >
              {showJobHistory ? 'Hide' : 'Show'} History
            </button>
          </CardTitle>
        </CardHeader>
        {showJobHistory && (
          <CardContent>
            <AnalysisJobList
              jobs={recentJobs.filter(j => j.analysis_type === activeTab)}
              onSelectJob={setCurrentJob}
              selectedJobId={currentJob?.id}
            />
          </CardContent>
        )}
      </Card>

      {/* Start New Analysis */}
      <Card className="bg-gray-800 border-gray-700 mb-6">
        <CardHeader>
          <CardTitle className="text-white">🚀 Start New Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-2">
                Version Name (optional)
              </label>
              <input
                type="text"
                value={versionName}
                onChange={(e) => setVersionName(e.target.value)}
                placeholder={`${activeTab === 'dashboard' ? 'Dashboard' : 'Human Agent'} Analysis - ${new Date().toLocaleDateString()}`}
                className="w-full bg-gray-900 border border-gray-600 rounded-lg p-3 text-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
              />
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={handleStartAnalysis}
                disabled={hasActiveJob}
                className={`px-6 py-3 rounded-lg font-semibold transition-all flex items-center gap-2 ${
                  hasActiveJob
                    ? 'bg-gray-600 cursor-not-allowed text-gray-400'
                    : activeTab === 'dashboard'
                    ? 'bg-blue-600 hover:bg-blue-500 text-white'
                    : 'bg-purple-600 hover:bg-purple-500 text-white'
                }`}
              >
                {hasActiveJob ? (
                  <>
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Analysis in Progress...
                  </>
                ) : (
                  <>
                    🔍 Start Analysis with Custom Metrics
                  </>
                )}
              </button>
              {hasActiveJob && (
                <span className="text-sm text-gray-400">
                  Wait for current analysis to complete or cancel it
                </span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Message */}
      {message && (
        <Card className="bg-gray-800 border-gray-700 mb-6">
          <CardContent className="pt-6">
            <p className="text-gray-200">{message}</p>
          </CardContent>
        </Card>
      )}

      {/* Metrics Editor */}
      <Card className="bg-gray-800 border-gray-700 mb-6">
        <CardHeader>
          <CardTitle className="text-white flex items-center justify-between">
            <span className="flex items-center gap-2">
              {activeTab === 'dashboard' ? '📊 Dashboard' : '👤 Human Agent'} Metric Descriptions
              {hasUnsavedChanges && (
                <span className="text-xs text-yellow-400 bg-yellow-900/30 px-2 py-1 rounded">
                  Unsaved changes
                </span>
              )}
            </span>
            <div className="flex gap-2">
              <button
                onClick={resetToDefaults}
                className="text-sm px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
              >
                Reset to Defaults
              </button>
              <button
                onClick={saveSettings}
                disabled={isSaving || !hasUnsavedChanges}
                className={`text-sm px-4 py-2 rounded-lg transition-colors ${
                  hasUnsavedChanges
                    ? 'bg-green-600 hover:bg-green-500 text-white'
                    : 'bg-gray-700 text-gray-400 cursor-not-allowed'
                }`}
              >
                {isSaving ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {currentMetrics.map(metric => (
              <div key={metric.key} className="bg-gray-900 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-white font-medium">
                    {metric.name}
                    {metric.range && (
                      <span className="ml-2 text-xs text-blue-400 bg-blue-900/30 px-2 py-1 rounded">
                        Range: {metric.range}
                      </span>
                    )}
                  </label>
                  <span className="text-xs text-gray-500 font-mono">{metric.key}</span>
                </div>
                <textarea
                  value={metric.description}
                  onChange={e => updateMetricDescription(activeTab, metric.key, e.target.value)}
                  className="w-full bg-gray-800 border border-gray-600 rounded-lg p-3 text-gray-200 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-colors resize-none"
                  rows={2}
                  placeholder={`Description for ${metric.name}...`}
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Generated Prompt Preview */}
      <Card className="bg-gray-800 border-gray-700 mb-6">
        <CardHeader>
          <CardTitle className="text-white">Generated Prompt Preview</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="bg-gray-900 rounded-lg p-4 text-sm text-gray-300 overflow-x-auto whitespace-pre-wrap max-h-64 overflow-y-auto">
            {generatePrompt(activeTab)}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}
