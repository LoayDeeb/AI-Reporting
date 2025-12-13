'use client';

import React from 'react';

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

interface AnalysisProgressProps {
  job: AnalysisJob | null;
  onCancel?: () => void;
  onClose?: () => void;
}

export function AnalysisProgress({ job, onCancel, onClose }: AnalysisProgressProps) {
  if (!job) return null;

  const progress = job.total_conversations > 0
    ? Math.round((job.processed_conversations / job.total_conversations) * 100)
    : 0;

  const isActive = job.status === 'pending' || job.status === 'running';
  const isCompleted = job.status === 'completed';
  const isFailed = job.status === 'failed';
  const isCancelled = job.status === 'cancelled';

  const statusColors = {
    pending: 'text-yellow-400',
    running: 'text-blue-400',
    completed: 'text-green-400',
    failed: 'text-red-400',
    cancelled: 'text-gray-400',
  };

  const progressBarColors = {
    pending: 'bg-yellow-500',
    running: 'bg-blue-500',
    completed: 'bg-green-500',
    failed: 'bg-red-500',
    cancelled: 'bg-gray-500',
  };

  const statusIcons = {
    pending: '⏳',
    running: '🔄',
    completed: '✅',
    failed: '❌',
    cancelled: '🚫',
  };

  const formatTime = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleTimeString();
  };

  const getElapsedTime = () => {
    if (!job.started_at) return '-';
    const start = new Date(job.started_at).getTime();
    const end = job.completed_at ? new Date(job.completed_at).getTime() : Date.now();
    const seconds = Math.floor((end - start) / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">{statusIcons[job.status]}</span>
          <span className="font-medium text-white">{job.version_name}</span>
          <span className={`text-sm ${statusColors[job.status]}`}>
            ({job.status})
          </span>
        </div>
        {!isActive && onClose && (
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            ✕
          </button>
        )}
      </div>

      {/* Progress Bar */}
      <div className="relative">
        <div className="w-full bg-gray-700 rounded-full h-3 overflow-hidden">
          <div
            className={`h-full transition-all duration-300 ${progressBarColors[job.status]} ${
              isActive ? 'animate-pulse' : ''
            }`}
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xs font-bold text-white drop-shadow-md">
            {progress}%
          </span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
        <div className="bg-gray-800 rounded p-2">
          <div className="text-gray-400">Processed</div>
          <div className="text-white font-medium">
            {job.processed_conversations} / {job.total_conversations}
          </div>
        </div>
        <div className="bg-gray-800 rounded p-2">
          <div className="text-gray-400">Errors</div>
          <div className={`font-medium ${job.error_count > 0 ? 'text-red-400' : 'text-green-400'}`}>
            {job.error_count}
          </div>
        </div>
        <div className="bg-gray-800 rounded p-2">
          <div className="text-gray-400">Elapsed</div>
          <div className="text-white font-medium">{getElapsedTime()}</div>
        </div>
        <div className="bg-gray-800 rounded p-2">
          <div className="text-gray-400">Started</div>
          <div className="text-white font-medium">{formatTime(job.started_at)}</div>
        </div>
      </div>

      {/* Error Message */}
      {isFailed && job.error_message && (
        <div className="bg-red-900/30 border border-red-800 rounded p-3 text-red-300 text-sm">
          <strong>Error:</strong> {job.error_message}
        </div>
      )}

      {/* Success Message */}
      {isCompleted && (
        <div className="bg-green-900/30 border border-green-800 rounded p-3 text-green-300 text-sm">
          ✅ Analysis completed successfully! {job.processed_conversations} conversations analyzed.
        </div>
      )}

      {/* Cancel Button */}
      {isActive && onCancel && (
        <div className="flex justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg text-sm transition-colors"
          >
            Cancel Analysis
          </button>
        </div>
      )}
    </div>
  );
}

interface AnalysisJobListProps {
  jobs: AnalysisJob[];
  onSelectJob?: (job: AnalysisJob) => void;
  selectedJobId?: string;
}

export function AnalysisJobList({ jobs, onSelectJob, selectedJobId }: AnalysisJobListProps) {
  if (jobs.length === 0) {
    return (
      <div className="text-gray-400 text-center py-4">
        No analysis runs yet
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {jobs.map(job => {
        const isSelected = job.id === selectedJobId;
        const progress = job.total_conversations > 0
          ? Math.round((job.processed_conversations / job.total_conversations) * 100)
          : 0;

        const statusColors: Record<string, string> = {
          pending: 'border-yellow-500',
          running: 'border-blue-500',
          completed: 'border-green-500',
          failed: 'border-red-500',
          cancelled: 'border-gray-500',
        };

        const statusIcons: Record<string, string> = {
          pending: '⏳',
          running: '🔄',
          completed: '✅',
          failed: '❌',
          cancelled: '🚫',
        };

        return (
          <button
            key={job.id}
            onClick={() => onSelectJob?.(job)}
            className={`w-full text-left p-3 rounded-lg border-l-4 transition-all ${
              statusColors[job.status]
            } ${
              isSelected
                ? 'bg-gray-700'
                : 'bg-gray-800 hover:bg-gray-750'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span>{statusIcons[job.status]}</span>
                <span className="text-white text-sm font-medium truncate max-w-[200px]">
                  {job.version_name}
                </span>
              </div>
              <span className="text-xs text-gray-400">
                {new Date(job.created_at).toLocaleDateString()}
              </span>
            </div>
            <div className="mt-1 flex items-center gap-2">
              <div className="flex-1 bg-gray-700 rounded-full h-1.5">
                <div
                  className={`h-full rounded-full ${
                    job.status === 'completed' ? 'bg-green-500' : 'bg-blue-500'
                  }`}
                  style={{ width: `${progress}%` }}
                />
              </div>
              <span className="text-xs text-gray-400">{progress}%</span>
            </div>
          </button>
        );
      })}
    </div>
  );
}
