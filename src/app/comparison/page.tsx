'use client';

import React, { useState, useEffect } from 'react';
import Navigation from '@/components/Navigation';
import { 
  Scale, 
  Brain, 
  Users, 
  Trophy, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle, 
  BarChart3,
  Zap
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar
} from 'recharts';

export default function ComparisonPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchComparisonData();
  }, []);

  const fetchComparisonData = async () => {
    try {
      const response = await fetch('/api/comparison');
      const result = await response.json();
      
      if (result.error) {
        setError(result.error);
      } else {
        setData(result);
      }
    } catch (err) {
      setError('Failed to load comparison data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white">
        <Navigation />
        <div className="container mx-auto px-4 py-8 pt-24 flex justify-center items-center h-[80vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 text-white">
        <Navigation />
        <div className="container mx-auto px-4 py-8 pt-24 text-center">
          <AlertTriangle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Comparison Data Unavailable</h2>
          <p className="text-gray-400 mb-6">{error}</p>
          <p className="text-sm text-gray-500">Make sure you have run both AI (Web AR) and Human Agent analysis first.</p>
        </div>
      </div>
    );
  }

  // Radar Data Preparation
  const radarData = [
    { subject: 'Quality', A: data.ai.avgQuality, B: data.human.avgQuality, fullMark: 100 },
    { subject: 'Empathy', A: data.ai.avgEmpathy, B: data.human.avgEmpathy, fullMark: 100 },
    { subject: 'Resolution', A: data.ai.resolutionRate, B: data.human.resolutionRate, fullMark: 100 },
    { subject: 'Positive Sentiment', A: data.ai.sentimentDistribution.positive, B: data.human.sentimentDistribution.positive, fullMark: 100 },
  ];

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <Navigation />
      
      <div className="container mx-auto px-4 py-8 pt-24">
        {/* Header */}
        <div className="mb-10 text-center">
          <div className="inline-flex p-3 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-2xl mb-4 border border-blue-500/30">
            <Scale className="h-8 w-8 text-blue-400 mr-3" />
            <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400">
              Human vs. AI Showdown
            </h1>
          </div>
          <p className="text-gray-400 max-w-2xl mx-auto">
            Direct comparison between Web AR (AI) performance and Human Agent interactions across key success metrics.
          </p>
        </div>

        {/* Head-to-Head Scorecards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
          {/* AI Card */}
          <div className="bg-gray-800/40 backdrop-blur-sm rounded-2xl border border-cyan-500/20 p-6 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <Brain className="h-32 w-32 text-cyan-500" />
            </div>
            <div className="flex items-center mb-6">
              <div className="p-3 bg-cyan-500/20 rounded-xl mr-4">
                <Brain className="h-8 w-8 text-cyan-400" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">Web AR (AI)</h2>
                <p className="text-cyan-400 font-medium">{data.ai.totalConversations.toLocaleString()} Conversations</p>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <MetricTile label="Quality Score" value={data.ai.avgQuality} color="cyan" />
              <MetricTile label="Empathy" value={data.ai.avgEmpathy} color="cyan" />
              <MetricTile label="Resolution Rate" value={`${data.ai.resolutionRate}%`} color="cyan" />
              <MetricTile label="Positive Sentiment" value={`${data.ai.sentimentDistribution.positive}%`} color="cyan" />
            </div>
          </div>

          {/* Human Card */}
          <div className="bg-gray-800/40 backdrop-blur-sm rounded-2xl border border-purple-500/20 p-6 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <Users className="h-32 w-32 text-purple-500" />
            </div>
            <div className="flex items-center mb-6">
              <div className="p-3 bg-purple-500/20 rounded-xl mr-4">
                <Users className="h-8 w-8 text-purple-400" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">Human Agents</h2>
                <p className="text-purple-400 font-medium">{data.human.totalConversations.toLocaleString()} Conversations</p>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <MetricTile label="Quality Score" value={data.human.avgQuality} color="purple" />
              <MetricTile label="Empathy" value={data.human.avgEmpathy} color="purple" />
              <MetricTile label="Resolution Rate" value={`${data.human.resolutionRate}%`} color="purple" />
              <MetricTile label="Positive Sentiment" value={`${data.human.sentimentDistribution.positive}%`} color="purple" />
            </div>
          </div>
        </div>

        {/* Insights Section */}
        <div className="bg-gradient-to-r from-blue-900/20 to-purple-900/20 border border-blue-500/20 rounded-2xl p-8 mb-12">
          <div className="flex items-center mb-6">
            <Zap className="h-6 w-6 text-yellow-400 mr-3" />
            <h3 className="text-xl font-bold text-white">Strategic Insights</h3>
          </div>
          <div className="space-y-3">
            {data.insights.map((insight: string, i: number) => (
              <div key={i} className="flex items-start p-3 bg-white/5 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-400 mr-3 mt-0.5 flex-shrink-0" />
                <p className="text-gray-200">{insight}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
          {/* Radar Comparison */}
          <div className="bg-gray-800/40 rounded-2xl border border-gray-700 p-6 lg:col-span-1">
            <h3 className="text-lg font-bold text-white mb-6 text-center">Performance Shape</h3>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                  <PolarGrid stroke="#374151" />
                  <PolarAngleAxis dataKey="subject" tick={{ fill: '#9CA3AF', fontSize: 12 }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                  <Radar name="AI" dataKey="A" stroke="#22D3EE" fill="#22D3EE" fillOpacity={0.3} />
                  <Radar name="Human" dataKey="B" stroke="#A855F7" fill="#A855F7" fillOpacity={0.3} />
                  <Legend />
                  <Tooltip contentStyle={{ backgroundColor: '#1F2937', borderColor: '#374151', color: '#F3F4F6' }} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Topic Battleground */}
          <div className="bg-gray-800/40 rounded-2xl border border-gray-700 p-6 lg:col-span-2">
            <h3 className="text-lg font-bold text-white mb-2">Topic Battleground: Quality Score</h3>
            <p className="text-gray-400 text-sm mb-6">Comparing average quality score on overlapping topics</p>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={data.topicBreakdown}
                  margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                  <XAxis dataKey="topic" stroke="#9CA3AF" fontSize={12} />
                  <YAxis stroke="#9CA3AF" domain={[0, 100]} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1F2937', borderColor: '#374151', color: '#F3F4F6' }}
                    cursor={{ fill: '#374151', opacity: 0.2 }}
                  />
                  <Legend />
                  <Bar name="AI Quality" dataKey="aiQuality" fill="#22D3EE" radius={[4, 4, 0, 0]} />
                  <Bar name="Human Quality" dataKey="humanQuality" fill="#A855F7" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricTile({ label, value, color }: { label: string, value: string | number, color: 'cyan' | 'purple' }) {
  const colors = {
    cyan: { text: 'text-cyan-400', bg: 'bg-cyan-500/10' },
    purple: { text: 'text-purple-400', bg: 'bg-purple-500/10' }
  };
  
  return (
    <div className={`${colors[color].bg} p-4 rounded-xl text-center`}>
      <div className={`text-2xl font-bold ${colors[color].text}`}>{value}</div>
      <div className="text-xs text-gray-400 uppercase tracking-wide mt-1">{label}</div>
    </div>
  );
}
