import React from 'react';
import { Brain, Award, Zap, MessageSquare, BarChart3, Users } from 'lucide-react';

interface HeaderProps {
  score?: number;
  grade?: string;
  totalConversations?: number;
  analysisType?: string;
  fastMode?: boolean;
  optimizationLevel?: string;
  loading?: boolean;
  onFullAnalysis?: () => void;
  onConversationAnalysis?: () => void;
}

const Header = ({ 
  score = 0, 
  grade = 'N/A', 
  totalConversations = 0, 
  analysisType = 'basic',
  fastMode = false,
  optimizationLevel = 'standard',
  loading = false,
  onFullAnalysis,
  onConversationAnalysis
}: HeaderProps) => {
  const getGradeColor = (grade: string) => {
    switch (grade) {
      case 'A': return 'from-green-400 to-emerald-600';
      case 'B': return 'from-blue-400 to-cyan-600';
      case 'C': return 'from-yellow-400 to-amber-600';
      case 'D': return 'from-orange-400 to-red-500';
      case 'F': return 'from-red-400 to-rose-600';
      default: return 'from-gray-400 to-gray-600';
    }
  };

  const getStatusBadge = () => {
    if (analysisType === 'basic') return '';
    if (analysisType === 'sample') return 'Sample Analysis';
    if (fastMode) {
      return 'Smart Analysis';
    }
    return 'Full Analysis';
  };

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600 via-purple-600 to-violet-600 p-8 mb-8">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-black/20 backdrop-blur-sm"></div>
      <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent"></div>
      
      {/* Floating Elements */}
      <div className="absolute top-4 right-4 w-32 h-32 bg-white/5 rounded-full blur-xl"></div>
      <div className="absolute bottom-4 left-4 w-24 h-24 bg-white/5 rounded-full blur-xl"></div>
      
      <div className="relative z-10">
        <div className="flex justify-between items-start">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-white/10 backdrop-blur-md rounded-xl border border-white/20">
              <Brain className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-white/90">
                AI Analytics Dashboard
              </h1>
              <p className="text-white/70 mt-2 text-lg">
                Intelligent conversation insights powered by AI
              </p>
              <div className="flex items-center space-x-4 mt-3">
                {getStatusBadge() && (
                  <span className="px-3 py-1 bg-white/10 backdrop-blur-md rounded-full text-white/90 text-sm border border-white/20">
                    {getStatusBadge()}
                  </span>
                )}
                <span className="px-3 py-1 bg-white/10 backdrop-blur-md rounded-full text-white/90 text-sm border border-white/20">
                  <Users className="h-4 w-4 inline mr-1" />
                  {totalConversations.toLocaleString()} conversations
                </span>
              </div>
            </div>
          </div>
          
          {/* Action Buttons */}
          <div className="flex items-center space-x-4">
            {/* Full Analysis Button */}
            <div className="group relative">
              <button
                onClick={onFullAnalysis}
                disabled={loading}
                className="relative overflow-hidden bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-white px-6 py-3 rounded-xl font-semibold transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
              >
                <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <div className="relative flex items-center space-x-2">
                  <BarChart3 className="h-5 w-5" />
                  <span>Show Analysis</span>
                </div>
                <div className="absolute -bottom-1 left-0 right-0 h-1 bg-gradient-to-r from-emerald-300 to-cyan-300 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              </button>
              
              {/* Tooltip */}
              <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-50">
                <div className="bg-gray-900/95 backdrop-blur-sm text-white text-sm rounded-lg p-3 shadow-xl border border-gray-700/50 whitespace-nowrap">
                  <div className="font-medium text-emerald-400">📊 View Data</div>
                  <div className="text-gray-300 mt-1">Load analysis from database</div>
                  <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-gray-900 rotate-45 border-l border-t border-gray-700/50"></div>
                </div>
              </div>
            </div>

            {/* Individual Conversation Analysis Button */}
            <div className="group relative">
              <button
                onClick={onConversationAnalysis}
                disabled={loading}
                className="relative overflow-hidden bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white px-6 py-3 rounded-xl font-semibold transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
              >
                <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <div className="relative flex items-center space-x-2">
                  <MessageSquare className="h-5 w-5" />
                  <span>Analyze Conversations</span>
                </div>
                <div className="absolute -bottom-1 left-0 right-0 h-1 bg-gradient-to-r from-purple-300 to-pink-300 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              </button>
              
              {/* Tooltip */}
              <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-50">
                <div className="bg-gray-900/95 backdrop-blur-sm text-white text-sm rounded-lg p-3 shadow-xl border border-gray-700/50 whitespace-nowrap">
                  <div className="font-medium text-purple-400">💬 Individual Analysis</div>
                  <div className="text-gray-300 mt-1">Select & analyze specific conversations</div>
                  <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-gray-900 rotate-45 border-l border-t border-gray-700/50"></div>
                </div>
              </div>
            </div>

            {/* Score Display */}
            <div className="flex items-center space-x-4 ml-4">
              <div className="text-right">
                <p className="text-white/60 text-sm uppercase tracking-wide">Platform Score</p>
                <div className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-white/90">
                  {score}
                </div>
                <p className="text-white/60 text-xs">out of 100</p>
              </div>
              <div className={`bg-gradient-to-r ${getGradeColor(grade)} p-3 rounded-xl shadow-lg border border-white/20`}>
                <div className="flex items-center space-x-2">
                  <Award className="h-5 w-5 text-white" />
                  <span className="text-2xl font-bold text-white">{grade}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Progress Bars or Loading State */}
        <div className="mt-8">
          {loading ? (
            <div className="flex items-center justify-center space-x-4 p-4 bg-white/10 backdrop-blur-md rounded-xl border border-white/20">
              <div className="animate-spin rounded-full h-6 w-6 border-2 border-white/30 border-t-white"></div>
              <div className="text-white/90">
                <span className="font-medium">Analysis in Progress...</span>
                <p className="text-sm text-white/70 mt-1">
                  {analysisType === 'full' && fastMode ? 
                    `🚀 Smart Analysis - Processing conversations with AI intelligence` :
                    'Processing your request...'
                  }
                </p>
              </div>
              <div className="flex space-x-1">
                {[...Array(3)].map((_, i) => (
                  <div 
                    key={i} 
                    className="w-2 h-2 bg-white/60 rounded-full animate-pulse"
                    style={{ animationDelay: `${i * 0.2}s` }}
                  ></div>
                ))}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-2 rounded-full bg-gradient-to-r from-white/20 to-white/10 overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-white/60 to-white/40 rounded-full transition-all duration-1000 ease-out"
                    style={{ width: `${Math.min(100, (score / 100) * 100)}%` }}
                  ></div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Header; 