import React from 'react';
import { Brain, Lightbulb, TrendingUp, Sparkles } from 'lucide-react';

interface AIInsights {
  insights?: string;
  recommendations?: string[];
  trends?: string[];
}

interface InsightsSectionProps {
  aiInsights?: AIInsights;
}

const InsightsSection = ({ aiInsights }: InsightsSectionProps) => {
  // Only show insights if we have real AI data
  if (!aiInsights) {
    return (
      <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-8 mt-8 border border-gray-700/50 hover:border-gray-600/50 transition-all duration-300 group">
        {/* Header */}
        <div className="flex items-center mb-8">
          <div className="p-3 bg-violet-500/10 rounded-xl border border-violet-500/20 mr-4">
            <Brain className="text-violet-400 h-8 w-8" />
          </div>
          <div>
            <h2 className="text-3xl font-bold text-white">
              AI-Powered Insights
            </h2>
            <p className="text-gray-400 mt-1">Intelligent analysis and recommendations</p>
          </div>
        </div>

        {/* No Data State */}
        <div className="text-center py-16">
          <div className="text-6xl mb-6">🤖</div>
          <h3 className="text-2xl font-bold text-white mb-4">No AI Insights Available</h3>
          <p className="text-gray-400 text-lg mb-8">
            Run an intelligent analysis to get AI-powered recommendations and trends
          </p>
          <div className="inline-flex items-center space-x-2 px-6 py-3 bg-violet-500/10 rounded-xl border border-violet-500/20">
            <Brain className="h-5 w-5 text-violet-400" />
            <span className="text-violet-400 font-medium">Click "Intelligent Analysis" to get started</span>
          </div>
        </div>
      </div>
    );
  }

  const recommendations = aiInsights.recommendations || [];
  const trends = aiInsights.trends || [];
  const insights = aiInsights.insights || '';

  return (
    <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-8 mt-8 border border-gray-700/50 hover:border-gray-600/50 transition-all duration-300 group">
      {/* Header */}
      <div className="flex items-center mb-8">
        <div className="p-3 bg-violet-500/10 rounded-xl border border-violet-500/20 mr-4 group-hover:scale-110 transition-transform duration-300">
          <Brain className="text-violet-400 h-8 w-8" />
        </div>
        <div>
          <h2 className="text-3xl font-bold text-white group-hover:text-gray-100 transition-colors duration-300">
            AI-Powered Insights
          </h2>
          <p className="text-gray-400 mt-1">Intelligent analysis and recommendations</p>
        </div>
        <div className="ml-auto">
          <div className="flex items-center space-x-2 px-4 py-2 bg-violet-500/10 rounded-full border border-violet-500/20">
            <Sparkles className="h-4 w-4 text-violet-400" />
            <span className="text-violet-400 text-sm font-medium">AI Generated</span>
          </div>
        </div>
      </div>

      {/* Overall Analysis */}
      <div className="mb-8">
        <h3 className="text-xl font-semibold text-gray-200 mb-4 flex items-center">
          <div className="w-2 h-2 bg-violet-400 rounded-full mr-3"></div>
          Overall Analysis
        </h3>
        <div className="bg-gradient-to-r from-violet-500/10 to-purple-500/10 border-l-4 border-violet-400 p-6 rounded-r-xl backdrop-blur-sm">
          {insights ? (
            <p className="text-gray-300 leading-relaxed text-lg">
              {insights}
            </p>
          ) : (
            <div className="text-center py-8 text-gray-400">
              <div className="text-3xl mb-2">🔍</div>
              <p className="text-lg">No analysis summary available</p>
              <p className="text-sm mt-2">Run an intelligent analysis to get detailed insights</p>
            </div>
          )}
        </div>
      </div>

      {/* Recommendations and Trends Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* AI Recommendations */}
        <div className="space-y-6">
          <div className="flex items-center mb-6">
            <div className="p-2 bg-amber-500/10 rounded-lg border border-amber-500/20 mr-3">
              <Lightbulb className="text-amber-400 h-6 w-6" />
            </div>
            <h3 className="text-xl font-semibold text-white">AI Recommendations</h3>
          </div>
          
          <div className="space-y-4">
            {recommendations.length > 0 ? (
              recommendations.slice(0, 6).map((recommendation, index) => (
                <div key={index} className="flex group/item hover:bg-amber-500/5 p-4 rounded-lg transition-all duration-300">
                  <div className="flex-shrink-0">
                    <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 font-semibold border border-amber-500/20 group-hover/item:border-amber-500/40 group-hover/item:scale-110 transition-all duration-300">
                      {index + 1}
                    </div>
                  </div>
                  <div className="ml-4">
                    <p className="text-gray-300 group-hover/item:text-gray-200 transition-colors duration-300">
                      {recommendation}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-400">
                <div className="text-3xl mb-2">💡</div>
                <p>No recommendations available yet</p>
              </div>
            )}
          </div>
        </div>

        {/* Identified Trends */}
        <div className="space-y-6">
          <div className="flex items-center mb-6">
            <div className="p-2 bg-emerald-500/10 rounded-lg border border-emerald-500/20 mr-3">
              <TrendingUp className="text-emerald-400 h-6 w-6" />
            </div>
            <h3 className="text-xl font-semibold text-white">Identified Trends</h3>
          </div>
          
          <div className="space-y-4">
            {trends.length > 0 ? (
              trends.slice(0, 5).map((trend, index) => (
                <div key={index} className="flex group/item hover:bg-emerald-500/5 p-4 rounded-lg transition-all duration-300">
                  <div className="flex-shrink-0">
                    <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 group-hover/item:border-emerald-500/40 group-hover/item:scale-110 transition-all duration-300">
                      <TrendingUp size={16} />
                    </div>
                  </div>
                  <div className="ml-4">
                    <p className="text-gray-300 group-hover/item:text-gray-200 transition-colors duration-300">
                      {trend}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-400">
                <div className="text-3xl mb-2">📈</div>
                <p>No trends identified yet</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Action Items */}
      <div className="mt-8 p-6 bg-gradient-to-r from-blue-500/10 to-cyan-500/10 rounded-xl border border-blue-500/20">
        <h4 className="text-lg font-semibold text-white mb-3 flex items-center">
          <div className="w-2 h-2 bg-blue-400 rounded-full mr-3"></div>
          Key Action Items
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center p-4 bg-blue-500/10 rounded-lg border border-blue-500/20">
            <p className="text-2xl font-bold text-blue-400 mb-1">High</p>
            <p className="text-sm text-gray-400">Priority Issues</p>
          </div>
          <div className="text-center p-4 bg-amber-500/10 rounded-lg border border-amber-500/20">
            <p className="text-2xl font-bold text-amber-400 mb-1">Medium</p>
            <p className="text-sm text-gray-400">Optimization Areas</p>
          </div>
          <div className="text-center p-4 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
            <p className="text-2xl font-bold text-emerald-400 mb-1">Low</p>
            <p className="text-sm text-gray-400">Enhancement Ideas</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InsightsSection; 