'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { SearchBar, Filters, ConversationList } from '@/components/conversations';
import Navigation from '@/components/Navigation';
import { MessageSquareIcon } from 'lucide-react';

export interface ConversationData {
  id: string;
  senderID: string;
  timestamp: string;
  sentiment: string;
  qualityScore: number;
  intent: string;
  duration: string;
  status: string;
  messages: number;
  conversationLength: number;
  firstResponseTime?: number;
  knowledgeGaps: string[];
  recommendations: string[];
  trends: string[];
  // Zainjo-specific fields
  dataSource?: string;
  topics?: string[];
  subCategories?: string[];
}

export interface FilterState {
  sentiment: string[];
  qualityScore: number[];
  dateRange: {
    from: Date | null;
    to: Date | null;
  };
  topics: string[];
}

const Conversations = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [conversations, setConversations] = useState<ConversationData[]>([]);
  const [loading, setLoading] = useState(true);
  const [isZainjoMode, setIsZainjoMode] = useState(false); // Toggle for Zainjo data
  const [activeFilters, setActiveFilters] = useState<FilterState>({
    sentiment: [],
    qualityScore: [0, 100],
    dateRange: {
      from: null,
      to: null,
    },
    topics: [],
  });

  // Debounce search query to improve performance
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    loadConversations();
  }, [isZainjoMode]); // Reload when switching between modes

  const loadConversations = useCallback(async () => {
    setLoading(true);
    try {
      // Choose API endpoint based on mode
      const endpoint = isZainjoMode 
        ? '/api/conversations/zainjo?limit=5000&offset=0'
        : '/api/conversations?limit=5000&offset=0';
      
      const response = await fetch(endpoint);
      const data = await response.json();
      
      if (data.conversations) {
        setConversations(data.conversations);
        console.log(`✅ ${isZainjoMode ? 'Zainjo' : 'Regular'} conversations loaded successfully:`, {
          received: data.conversations.length,
          total: data.total,
          shouldShowPages: Math.ceil(data.conversations.length / 50),
          apiResponse: data
        });
      } else {
        console.log(`❌ No ${isZainjoMode ? 'Zainjo' : 'regular'} conversations in API response:`, data);
      }
    } catch (error) {
      console.error(`Error loading ${isZainjoMode ? 'Zainjo' : 'regular'} conversations:`, error);
    } finally {
      setLoading(false);
    }
  }, [isZainjoMode]);

  const handleSearchChange = useCallback((query: string) => {
    setSearchQuery(query);
  }, []);

  const handleFilterChange = useCallback((filters: FilterState) => {
    setActiveFilters(filters);
  }, []);

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <Navigation />
      <div className="container mx-auto px-4 py-8 pt-24">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center">
              <MessageSquareIcon className="text-blue-400 mr-3" size={28} />
              <h1 className="text-3xl font-bold text-white">Conversations</h1>
            </div>
            
            {/* Data Source Toggle */}
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-400">Data Source:</span>
              <div className="flex items-center space-x-2 px-4 py-2 bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-lg">
                <span className={`text-sm font-medium ${!isZainjoMode ? 'text-blue-400' : 'text-gray-400'}`}>
                  Regular
                </span>
                <button
                  onClick={() => setIsZainjoMode(!isZainjoMode)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    isZainjoMode ? 'bg-orange-600' : 'bg-gray-600'
                  }`}
                  disabled={loading}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      isZainjoMode ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
                <span className={`text-sm font-medium ${isZainjoMode ? 'text-orange-400' : 'text-gray-400'}`}>
                  Zainjo
                </span>
              </div>
              {loading && (
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-400 border-t-transparent"></div>
              )}
            </div>
          </div>
          <p className="text-gray-400">
            View and analyze {isZainjoMode ? 'Zainjo' : 'chatbot'} conversations ({conversations.length} total)
            {isZainjoMode && <span className="text-orange-400 ml-2">• Advanced AI Analysis</span>}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[300px,1fr] gap-6">
          <div className="space-y-6">
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50">
              <SearchBar onSearch={handleSearchChange} />
            </div>
            <Filters
              activeFilters={activeFilters}
              onFilterChange={handleFilterChange}
              conversations={conversations}
            />
          </div>
          
          <ConversationList
            conversations={conversations}
            searchQuery={debouncedSearchQuery}
            activeFilters={activeFilters}
            loading={loading}
          />
        </div>
      </div>
    </div>
  );
};

export default Conversations; 