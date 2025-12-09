import React from 'react';
import {
  SlidersHorizontalIcon,
  SmileIcon,
  BarChart3Icon,
} from 'lucide-react';
import { FilterState, ConversationData } from '@/app/conversations/page';

interface FiltersProps {
  activeFilters: FilterState;
  onFilterChange: (filters: FilterState) => void;
  conversations: ConversationData[];
}

const Filters = ({ activeFilters, onFilterChange, conversations }: FiltersProps) => {
  // Extract unique values from conversations for dynamic filtering
  const sentimentOptions = Array.from(new Set(conversations.map(c => c.sentiment))).filter(Boolean);

  // Debug logging
  console.log('Filter Debug:', {
    conversationsCount: conversations.length,
    sentimentOptions,
    activeFilters
  });

  return (
    <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50">
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center">
          <SlidersHorizontalIcon className="text-violet-400 mr-2" size={20} />
          <h3 className="text-lg font-semibold text-white">Filters</h3>
        </div>
      </div>
      
      <div className="p-4 space-y-6">
        {/* Sentiment Filter */}
        <div>
          <div className="flex items-center mb-3">
            <SmileIcon className="text-yellow-400 mr-2" size={16} />
            <h4 className="text-sm font-medium text-gray-300">Sentiment ({sentimentOptions.length})</h4>
          </div>
          <div className="space-y-3">
            {sentimentOptions.map((sentiment) => (
              <label key={sentiment} className="flex items-center cursor-pointer group">
                <div className="relative">
                  <input
                    type="checkbox"
                    className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500 focus:ring-2"
                    checked={activeFilters.sentiment.includes(sentiment)}
                    onChange={(e) => {
                      console.log('Sentiment filter changed:', sentiment, e.target.checked);
                      const newSentiments = e.target.checked
                        ? [...activeFilters.sentiment, sentiment]
                        : activeFilters.sentiment.filter((s) => s !== sentiment);
                      onFilterChange({
                        ...activeFilters,
                        sentiment: newSentiments,
                      });
                    }}
                  />
                </div>
                <span className="ml-3 text-sm text-gray-300 group-hover:text-white transition-colors capitalize">
                  {sentiment}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Quality Score Filter */}
        <div>
          <div className="flex items-center mb-3">
            <BarChart3Icon className="text-emerald-400 mr-2" size={16} />
            <h4 className="text-sm font-medium text-gray-300">Quality Score Range</h4>
          </div>
          <div className="space-y-4">
            {/* Min Range */}
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Minimum Score</label>
              <input
                type="range"
                min="0"
                max="100"
                value={activeFilters.qualityScore[0]}
                onChange={(e) => {
                  onFilterChange({
                    ...activeFilters,
                    qualityScore: [parseInt(e.target.value), activeFilters.qualityScore[1]],
                  })
                }}
                className="w-full"
              />
            </div>
            
            {/* Max Range */}
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Maximum Score</label>
              <input
                type="range"
                min="0"
                max="100"
                value={activeFilters.qualityScore[1]}
                onChange={(e) => {
                  onFilterChange({
                    ...activeFilters,
                    qualityScore: [activeFilters.qualityScore[0], parseInt(e.target.value)],
                  })
                }}
                className="w-full"
              />
            </div>
            
            {/* Range Display */}
            <div className="flex items-center justify-between text-sm">
              <span className="px-2 py-1 bg-white text-gray-800 rounded border border-gray-300">
                {activeFilters.qualityScore[0]}%
              </span>
              <span className="text-gray-500">to</span>
              <span className="px-2 py-1 bg-white text-gray-800 rounded border border-gray-300">
                {activeFilters.qualityScore[1]}%
              </span>
            </div>
          </div>
        </div>

        {/* Clear Filters Button */}
        <div className="pt-2">
          <button
            onClick={() => {
              onFilterChange({
                sentiment: [],
                qualityScore: [0, 100],
                status: [],
                dateRange: { from: null, to: null },
                topics: [],
              });
            }}
            className="w-full px-3 py-2 text-sm bg-gray-700/50 hover:bg-gray-700 text-gray-300 hover:text-white rounded-lg border border-gray-600/50 hover:border-gray-500 transition-all duration-200"
          >
            Clear All Filters
          </button>
        </div>

        {/* Debug Info - Only show if filters are active */}
        {(activeFilters.sentiment.length > 0 || activeFilters.qualityScore[0] > 0 || activeFilters.qualityScore[1] < 100) && (
          <div className="text-xs text-gray-500 p-3 bg-gray-900/50 rounded-lg border border-gray-700/30">
            <div className="font-medium text-gray-400 mb-1">Active Filters:</div>
            {activeFilters.sentiment.length > 0 && (
              <div>• Sentiment: {activeFilters.sentiment.join(', ')}</div>
            )}
            <div>• Quality: {activeFilters.qualityScore[0]}% - {activeFilters.qualityScore[1]}%</div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Filters; 