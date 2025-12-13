'use client';

import React from 'react';
import { Brain, Award, MessageSquare, BarChart3, Users } from 'lucide-react';
import VersionSelector from './VersionSelector';

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
  selectedVersionId?: string | null;
  onVersionSelect?: (version: AnalysisJob | null) => void;
}

const Header = ({ 
  score = 0, 
  grade = 'N/A', 
  totalConversations = 0, 
  analysisType = 'basic',
  fastMode = false,
  loading = false,
  onFullAnalysis,
  onConversationAnalysis,
  selectedVersionId,
  onVersionSelect
}: HeaderProps) => {
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

  const getStatusBadge = () => {
    if (analysisType === 'basic') return '';
    if (analysisType === 'sample') return 'Sample';
    if (fastMode) return 'Smart';
    return 'Full';
  };

  return (
    <div className="relative overflow-hidden rounded-[var(--radius-xl)] bg-gradient-to-r from-[var(--brand-primary)] to-[var(--brand-secondary)] p-6 mb-8">
      {/* Subtle overlay */}
      <div className="absolute inset-0 bg-black/10" />
      
      <div className="relative z-10">
        <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start gap-6">
          {/* Left Section - Title & Info */}
          <div className="flex items-start gap-4">
            <div className="p-3 bg-white/10 backdrop-blur-md rounded-[var(--radius-lg)] border border-white/20">
              <Brain className="h-7 w-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold text-white">
                AI Analytics Dashboard
              </h1>
              <p className="text-white/70 mt-1">
                Intelligent conversation insights
              </p>
              <div className="flex flex-wrap items-center gap-2 mt-3">
                {getStatusBadge() && (
                  <span className="px-2.5 py-1 bg-white/15 backdrop-blur-sm rounded-full text-white/90 text-xs font-medium border border-white/20">
                    {getStatusBadge()} Analysis
                  </span>
                )}
                <span className="px-2.5 py-1 bg-white/15 backdrop-blur-sm rounded-full text-white/90 text-xs font-medium border border-white/20 flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5" />
                  {totalConversations.toLocaleString()} conversations
                </span>
                <VersionSelector
                  analysisType="dashboard"
                  selectedVersionId={selectedVersionId}
                  onVersionSelect={onVersionSelect}
                />
              </div>
            </div>
          </div>
          
          {/* Right Section - Actions & Score */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={onFullAnalysis}
                disabled={loading}
                className="flex items-center gap-2 bg-white/20 hover:bg-white/30 text-white px-4 py-2.5 rounded-[var(--radius-lg)] font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed border border-white/20"
              >
                <BarChart3 className="h-4 w-4" />
                <span>Show Analysis</span>
              </button>

              <button
                onClick={onConversationAnalysis}
                disabled={loading}
                className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-4 py-2.5 rounded-[var(--radius-lg)] font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed border border-white/10"
              >
                <MessageSquare className="h-4 w-4" />
                <span>Conversations</span>
              </button>
            </div>

            {/* Score Display */}
            <div className="flex items-center gap-3 pl-4 border-l border-white/20">
              <div className="text-right">
                <p className="text-white/60 text-xs uppercase tracking-wide">Score</p>
                <p className="text-3xl font-bold text-white">{score}</p>
              </div>
              <div className={`${getGradeColor(grade)} px-3 py-2 rounded-[var(--radius-md)] flex items-center gap-1.5`}>
                <Award className="h-4 w-4 text-white" />
                <span className="text-xl font-bold text-white">{grade}</span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Loading State */}
        {loading && (
          <div className="mt-6 flex items-center gap-3 p-3 bg-white/10 backdrop-blur-sm rounded-[var(--radius-lg)] border border-white/20">
            <div className="animate-spin rounded-full h-5 w-5 border-2 border-white/30 border-t-white" />
            <span className="text-white/90 text-sm">Processing analysis...</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default Header;
