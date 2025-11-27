import React, { useState, useEffect } from 'react';
import { BookOpen, Sparkles, ArrowRight, Copy, Check } from 'lucide-react';

const KnowledgeBaseGenerator = () => {
  const [gaps, setGaps] = useState<any[]>([]);
  const [selectedGap, setSelectedGap] = useState<any>(null);
  const [suggestion, setSuggestion] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchGaps();
  }, []);

  const fetchGaps = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/knowledge-base');
      const result = await response.json();
      if (result.gaps) {
        setGaps(result.gaps);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const generateContent = async (gap: any) => {
    try {
      setSelectedGap(gap);
      setGenerating(true);
      setSuggestion(null);
      
      const response = await fetch('/api/knowledge-base', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: gap.topic, examples: gap.examples })
      });
      
      const result = await response.json();
      if (result.success) {
        setSuggestion(result.suggestion);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setGenerating(false);
    }
  };

  const copyToClipboard = () => {
    if (!suggestion) return;
    const text = `Intent: ${suggestion.intent}\n\nResponse: ${suggestion.response}\n\nSystem Instruction: ${suggestion.system_instruction}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading && gaps.length === 0) return null;
  if (gaps.length === 0) return null;

  return (
    <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl border border-purple-500/20 p-6 mt-8">
      <div className="flex items-center mb-6">
        <div className="p-2 bg-purple-500/20 rounded-lg mr-3">
          <Sparkles className="h-6 w-6 text-purple-400" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-white">Auto-Generate Solutions</h3>
          <p className="text-gray-400 text-sm">Turn detected knowledge gaps into instant fixes.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* List of Gaps */}
        <div className="lg:col-span-1 space-y-2">
          <h4 className="text-sm font-semibold text-gray-400 uppercase mb-2">Detected Gaps</h4>
          {gaps.map((gap) => (
            <button
              key={gap.topic}
              onClick={() => generateContent(gap)}
              disabled={generating}
              className={`w-full text-left p-3 rounded-xl border transition-all duration-200 flex items-center justify-between group ${
                selectedGap?.topic === gap.topic
                  ? 'bg-purple-500/20 border-purple-500/50 text-white'
                  : 'bg-gray-700/30 border-transparent hover:bg-gray-700/50 text-gray-300'
              }`}
            >
              <span className="truncate pr-2">{gap.topic}</span>
              <ArrowRight className={`h-4 w-4 transition-transform ${
                selectedGap?.topic === gap.topic ? 'text-purple-400' : 'text-gray-500 group-hover:translate-x-1'
              }`} />
            </button>
          ))}
        </div>

        {/* Generator Area */}
        <div className="lg:col-span-2 bg-gray-900/50 rounded-xl border border-gray-700/50 p-6 min-h-[300px] relative">
          {!selectedGap ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-500">
              <BookOpen className="h-12 w-12 mb-4 opacity-20" />
              <p>Select a knowledge gap to generate a solution</p>
            </div>
          ) : generating ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-purple-500 mb-4"></div>
              <p className="text-purple-400 animate-pulse">Drafting solution...</p>
            </div>
          ) : suggestion ? (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h4 className="text-lg font-bold text-white">{suggestion.intent}</h4>
                <button 
                  onClick={copyToClipboard}
                  className="flex items-center space-x-2 text-xs text-gray-400 hover:text-white bg-gray-800 px-3 py-1.5 rounded-lg transition-colors"
                >
                  {copied ? <Check className="h-3 w-3 text-green-400" /> : <Copy className="h-3 w-3" />}
                  <span>{copied ? 'Copied!' : 'Copy All'}</span>
                </button>
              </div>

              <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
                <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Recommended Response</span>
                <p className="text-gray-200 mt-2 leading-relaxed">{suggestion.response}</p>
              </div>

              <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
                <span className="text-xs font-bold text-blue-400 uppercase tracking-wider">System Instruction</span>
                <p className="text-gray-300 mt-2 font-mono text-sm">{suggestion.system_instruction}</p>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default KnowledgeBaseGenerator;
