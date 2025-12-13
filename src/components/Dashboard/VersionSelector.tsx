'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Clock, CheckCircle, XCircle, AlertCircle, ChevronDown } from 'lucide-react';

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

interface VersionSelectorProps {
  analysisType: 'dashboard' | 'humanAgent';
  selectedVersionId?: string | null;
  onVersionSelect?: (version: AnalysisJob | null) => void;
}

export default function VersionSelector({
  analysisType,
  selectedVersionId,
  onVersionSelect,
}: VersionSelectorProps) {
  const [versions, setVersions] = useState<AnalysisJob[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadVersions = useCallback(async () => {
    try {
      const response = await fetch(
        `/api/analysis-jobs?type=${analysisType}&status=completed&limit=10`
      );
      const data = await response.json();
      if (data.success && data.jobs) {
        setVersions(data.jobs);
      }
    } catch (error) {
      console.error('Error loading versions:', error);
    } finally {
      setLoading(false);
    }
  }, [analysisType]);

  useEffect(() => {
    loadVersions();
  }, [loadVersions]);

  const selectedVersion = versions.find(v => v.id === selectedVersionId);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-400" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-400" />;
      case 'running':
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-400 animate-pulse" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-400" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 px-4 py-2 bg-gray-800/50 rounded-lg">
        <Clock className="h-4 w-4 text-gray-400 animate-pulse" />
        <span className="text-sm text-gray-400">Loading versions...</span>
      </div>
    );
  }

  if (versions.length === 0) {
    return (
      <div className="flex items-center gap-2 px-4 py-2 bg-gray-800/50 rounded-lg">
        <AlertCircle className="h-4 w-4 text-gray-500" />
        <span className="text-sm text-gray-500">No analysis versions</span>
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 bg-gray-800/50 hover:bg-gray-700/50 border border-gray-700 rounded-lg transition-colors"
      >
        <Clock className="h-4 w-4 text-cyan-400" />
        <span className="text-sm text-gray-200 max-w-[200px] truncate">
          {selectedVersion ? selectedVersion.version_name : 'Current Analysis'}
        </span>
        <ChevronDown
          className={`h-4 w-4 text-gray-400 transition-transform ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />

          {/* Dropdown */}
          <div className="absolute top-full mt-2 right-0 w-80 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-20 overflow-hidden">
            <div className="p-2 border-b border-gray-700">
              <span className="text-xs text-gray-400 uppercase tracking-wider">
                Analysis Versions
              </span>
            </div>

            <div className="max-h-64 overflow-y-auto">
              {/* Current/Latest option */}
              <button
                onClick={() => {
                  onVersionSelect?.(null);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center gap-3 p-3 hover:bg-gray-700/50 transition-colors ${
                  !selectedVersionId ? 'bg-cyan-500/10 border-l-2 border-cyan-500' : ''
                }`}
              >
                <CheckCircle className="h-5 w-5 text-cyan-400" />
                <div className="flex-1 text-left">
                  <div className="text-sm font-medium text-white">
                    Current Analysis
                  </div>
                  <div className="text-xs text-gray-400">
                    Latest data without version filter
                  </div>
                </div>
              </button>

              {/* Version list */}
              {versions.map(version => (
                <button
                  key={version.id}
                  onClick={() => {
                    onVersionSelect?.(version);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 p-3 hover:bg-gray-700/50 transition-colors ${
                    selectedVersionId === version.id
                      ? 'bg-cyan-500/10 border-l-2 border-cyan-500'
                      : ''
                  }`}
                >
                  {getStatusIcon(version.status)}
                  <div className="flex-1 text-left min-w-0">
                    <div className="text-sm font-medium text-white truncate">
                      {version.version_name}
                    </div>
                    <div className="text-xs text-gray-400 flex items-center gap-2">
                      <span>{formatDate(version.created_at)}</span>
                      <span className="text-gray-600">•</span>
                      <span>
                        {version.processed_conversations} conversations
                      </span>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            <div className="p-2 border-t border-gray-700 bg-gray-800/50">
              <a
                href="/settings"
                className="block text-center text-xs text-cyan-400 hover:text-cyan-300 py-1"
              >
                Manage Analysis Settings →
              </a>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
