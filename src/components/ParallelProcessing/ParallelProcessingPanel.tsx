'use client';

import React, { useState, useEffect } from 'react';
import { 
  Play, 
  Square, 
  RefreshCw, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Zap,
  Database,
  TrendingUp,
  Activity
} from 'lucide-react';

interface ParallelProcessingStatus {
  isRunning: boolean;
  progress?: {
    processedChunks: number[];
    failedChunks: any[];
    totalChunks: number;
    elapsedTimeMinutes?: number;
    estimatedRemainingMinutes?: number;
    successRate?: string;
  };
  error?: string;
}

interface ParallelProcessingPanelProps {
  onProcessingComplete?: () => void;
}

const ParallelProcessingPanel = ({ onProcessingComplete }: ParallelProcessingPanelProps) => {
  const [status, setStatus] = useState<ParallelProcessingStatus>({ isRunning: false });
  const [logs, setLogs] = useState<string[]>([]);
  const [selectedMethod, setSelectedMethod] = useState<'parallel' | 'fast' | 'hybrid'>('parallel');
  const [concurrency, setConcurrency] = useState(6);
  const [loading, setLoading] = useState(false);
  const [showLogs, setShowLogs] = useState(false);

  // Poll for status updates
  useEffect(() => {
    const pollStatus = async () => {
      try {
        const response = await fetch('/api/parallel-process?action=status');
        const data = await response.json();
        setStatus(data);
        
        // If processing completed, notify parent
        if (!data.isRunning && status.isRunning && onProcessingComplete) {
          onProcessingComplete();
        }
      } catch (error) {
        console.error('Failed to fetch status:', error);
      }
    };

    // Poll every 5 seconds when running, every 30 seconds when idle
    const interval = setInterval(pollStatus, status.isRunning ? 5000 : 30000);
    
    // Initial poll
    pollStatus();

    return () => clearInterval(interval);
  }, [status.isRunning, onProcessingComplete]);

  const startProcessing = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/parallel-process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'start',
          method: selectedMethod,
          concurrency: selectedMethod === 'parallel' ? concurrency : undefined
        })
      });

      const result = await response.json();
      
      if (result.success) {
        // Show command instructions to user
        alert(`${result.message}\n\nCommand: ${result.command}\n\nInstructions:\n${result.instructions.join('\n')}`);
      } else {
        console.error('Failed to start processing:', result.error);
        alert(`Error: ${result.error}`);
      }
    } catch (error) {
      console.error('Error starting processing:', error);
    } finally {
      setLoading(false);
    }
  };

  const stopProcessing = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/parallel-process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'stop' })
      });

      const result = await response.json();
      
      if (result.success) {
        setStatus({ isRunning: false });
      }
    } catch (error) {
      console.error('Error stopping processing:', error);
    } finally {
      setLoading(false);
    }
  };

  const retryFailed = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/parallel-process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'retry' })
      });

      const result = await response.json();
      
      if (result.success) {
        // Refresh status
        setStatus({ isRunning: true });
      }
    } catch (error) {
      console.error('Error retrying failed chunks:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchLogs = async () => {
    try {
      const response = await fetch('/api/parallel-process?action=logs');
      const data = await response.json();
      setLogs(data.logs || []);
    } catch (error) {
      console.error('Failed to fetch logs:', error);
    }
  };

  const getMethodInfo = (method: string) => {
    switch (method) {
      case 'parallel':
        return {
          name: 'Full Parallel Analysis',
          description: '100% data coverage with parallel processing',
          time: '~8 hours',
          coverage: '463K conversations',
          icon: <Database className="h-5 w-5" />,
          color: 'from-blue-500 to-cyan-500'
        };
      case 'fast':
        return {
          name: 'Ultra-Fast Analysis',
          description: 'Smart sampling for quick insights',
          time: '~4 hours',
          coverage: '22K conversations (sampled)',
          icon: <Zap className="h-5 w-5" />,
          color: 'from-emerald-500 to-green-500'
        };
      case 'hybrid':
        return {
          name: 'Hybrid Analysis',
          description: 'Balanced speed and coverage',
          time: '~6 hours',
          coverage: '45K conversations (sampled)',
          icon: <TrendingUp className="h-5 w-5" />,
          color: 'from-purple-500 to-pink-500'
        };
      default:
        return {
          name: 'Unknown',
          description: '',
          time: '',
          coverage: '',
          icon: <Activity className="h-5 w-5" />,
          color: 'from-gray-500 to-gray-600'
        };
    }
  };

  const progress = status.progress;
  const progressPercentage = progress ? 
    Math.round((progress.processedChunks.length / progress.totalChunks) * 100) : 0;

  return (
    <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 rounded-2xl border border-gray-700/50 p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-gradient-to-r from-orange-500/20 to-red-500/20 rounded-lg">
            <Database className="h-6 w-6 text-orange-400" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">Massive Dataset Processing</h3>
            <p className="text-gray-400">Process 6GB conversation file with 463K conversations</p>
          </div>
        </div>
        
        {status.isRunning && (
          <div className="flex items-center space-x-2 px-3 py-1 bg-green-500/20 rounded-full border border-green-500/30">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            <span className="text-green-400 text-sm font-medium">Processing</span>
          </div>
        )}
      </div>

      {/* Method Selection */}
      {!status.isRunning && (
        <div className="mb-6">
          <h4 className="text-lg font-semibold text-white mb-4">Choose Processing Method</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {(['parallel', 'fast', 'hybrid'] as const).map((method) => {
              const info = getMethodInfo(method);
              return (
                <div
                  key={method}
                  onClick={() => setSelectedMethod(method)}
                  className={`p-4 rounded-xl border-2 cursor-pointer transition-all duration-300 ${
                    selectedMethod === method
                      ? 'border-blue-500/50 bg-blue-500/10'
                      : 'border-gray-600/50 bg-gray-800/30 hover:border-gray-500/50'
                  }`}
                >
                  <div className="flex items-center space-x-3 mb-3">
                    <div className={`p-2 bg-gradient-to-r ${info.color}/20 rounded-lg`}>
                      {info.icon}
                    </div>
                    <div>
                      <h5 className="font-semibold text-white">{info.name}</h5>
                      <p className="text-xs text-gray-400">{info.time}</p>
                    </div>
                  </div>
                  <p className="text-sm text-gray-300 mb-2">{info.description}</p>
                  <p className="text-xs text-gray-400">{info.coverage}</p>
                </div>
              );
            })}
          </div>

          {/* Concurrency Setting for Parallel Method */}
          {selectedMethod === 'parallel' && (
            <div className="mt-4 p-4 bg-gray-800/50 rounded-xl border border-gray-700/50">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Concurrency Level: {concurrency} chunks simultaneously
              </label>
              <input
                type="range"
                min="2"
                max="10"
                value={concurrency}
                onChange={(e) => setConcurrency(parseInt(e.target.value))}
                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>2 (Safer)</span>
                <span>6 (Recommended)</span>
                <span>10 (Aggressive)</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Progress Display */}
      {status.isRunning && progress && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-300">Processing Progress</span>
            <span className="text-sm text-gray-400">{progressPercentage}%</span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2">
            <div 
              className="bg-gradient-to-r from-blue-500 to-cyan-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progressPercentage}%` }}
            ></div>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
            <div className="text-center p-3 bg-gray-800/50 rounded-lg">
              <CheckCircle className="h-5 w-5 text-green-400 mx-auto mb-1" />
              <p className="text-lg font-bold text-green-400">{progress.processedChunks.length}</p>
              <p className="text-xs text-gray-400">Completed</p>
            </div>
            <div className="text-center p-3 bg-gray-800/50 rounded-lg">
              <XCircle className="h-5 w-5 text-red-400 mx-auto mb-1" />
              <p className="text-lg font-bold text-red-400">{progress.failedChunks.length}</p>
              <p className="text-xs text-gray-400">Failed</p>
            </div>
            <div className="text-center p-3 bg-gray-800/50 rounded-lg">
              <Clock className="h-5 w-5 text-blue-400 mx-auto mb-1" />
              <p className="text-lg font-bold text-blue-400">{progress.elapsedTimeMinutes || 0}m</p>
              <p className="text-xs text-gray-400">Elapsed</p>
            </div>
            <div className="text-center p-3 bg-gray-800/50 rounded-lg">
              <TrendingUp className="h-5 w-5 text-purple-400 mx-auto mb-1" />
              <p className="text-lg font-bold text-purple-400">{progress.estimatedRemainingMinutes || 0}m</p>
              <p className="text-xs text-gray-400">Remaining</p>
            </div>
          </div>
        </div>
      )}

      {/* Control Buttons */}
      <div className="flex flex-wrap gap-3 mb-4">
        {!status.isRunning ? (
          <button
            onClick={startProcessing}
            disabled={loading}
            className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-white rounded-xl font-semibold transition-all duration-300 disabled:opacity-50"
          >
            <Play className="h-5 w-5" />
            <span>{loading ? 'Starting...' : 'Start Processing'}</span>
          </button>
        ) : (
          <button
            onClick={stopProcessing}
            disabled={loading}
            className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white rounded-xl font-semibold transition-all duration-300 disabled:opacity-50"
          >
            <Square className="h-5 w-5" />
            <span>{loading ? 'Stopping...' : 'Stop Processing'}</span>
          </button>
        )}

        {progress && progress.failedChunks.length > 0 && (
          <button
            onClick={retryFailed}
            disabled={loading || status.isRunning}
            className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-orange-500 to-yellow-500 hover:from-orange-600 hover:to-yellow-600 text-white rounded-xl font-semibold transition-all duration-300 disabled:opacity-50"
          >
            <RefreshCw className="h-5 w-5" />
            <span>Retry Failed ({progress.failedChunks.length})</span>
          </button>
        )}

        <button
          onClick={() => {
            setShowLogs(!showLogs);
            if (!showLogs) fetchLogs();
          }}
          className="flex items-center space-x-2 px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-xl font-semibold transition-all duration-300"
        >
          <Activity className="h-5 w-5" />
          <span>{showLogs ? 'Hide Logs' : 'Show Logs'}</span>
        </button>
      </div>

      {/* Logs Display */}
      {showLogs && (
        <div className="bg-gray-900/80 rounded-xl border border-gray-700/50 p-4">
          <h4 className="text-sm font-semibold text-gray-300 mb-3">Processing Logs</h4>
          <div className="max-h-64 overflow-y-auto">
            {logs.length > 0 ? (
              <div className="space-y-1">
                {logs.map((log, index) => (
                  <div key={index} className="text-xs text-gray-400 font-mono">
                    {log}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">No logs available</p>
            )}
          </div>
        </div>
      )}

      {/* Status Messages */}
      {status.error && (
        <div className="mt-4 p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
          <div className="flex items-center space-x-2">
            <AlertCircle className="h-5 w-5 text-red-400" />
            <span className="text-red-400 font-medium">Error</span>
          </div>
          <p className="text-red-300 text-sm mt-1">{status.error}</p>
        </div>
      )}
    </div>
  );
};

export default ParallelProcessingPanel; 