import React, { useMemo, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  CircleIcon,
  ClockIcon,
  MessageSquareIcon,
  CheckCircleIcon,
  XCircleIcon,
  AlertTriangleIcon,
  LoaderIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from 'lucide-react';
import { ConversationData, FilterState } from '@/app/conversations/page';

interface ConversationListProps {
  conversations: ConversationData[];
  searchQuery: string;
  activeFilters: FilterState;
  loading: boolean;
}

const ITEMS_PER_PAGE = 50; // Limit to 50 items per page for performance

const ConversationList = ({
  conversations,
  searchQuery,
  activeFilters,
  loading,
}: ConversationListProps) => {
  const router = useRouter();
  const [currentPage, setCurrentPage] = useState(1);

  // Debug logging
  console.log('🔍 ConversationList Debug:', {
    receivedConversations: conversations.length,
    totalPages: Math.ceil(conversations.length / ITEMS_PER_PAGE),
    currentPage,
    ITEMS_PER_PAGE
  });

  const filteredConversations = useMemo(() => {
    if (conversations.length === 0) return [];
    
    console.log('🔍 Filtering conversations:', {
      totalConversations: conversations.length,
      activeFilters,
      searchQuery,
      firstConversation: conversations[0], // Debug: show first conversation
      isZainjoData: conversations[0]?.dataSource === 'zainjo' || conversations[0]?.id?.startsWith('ZAINJO-')
    });
    
    const filtered = conversations.filter((conv) => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        if (
          !conv.id.toLowerCase().includes(query) &&
          !conv.senderID.toLowerCase().includes(query) &&
          !conv.sentiment.toLowerCase().includes(query)
        ) {
          return false;
        }
      }

      // Sentiment filter
      if (activeFilters.sentiment.length > 0) {
        if (!activeFilters.sentiment.includes(conv.sentiment)) {
          return false;
        }
      }

      // Quality score filter
      if (
        conv.qualityScore < activeFilters.qualityScore[0] ||
        conv.qualityScore > activeFilters.qualityScore[1]
      ) {
        return false;
      }

      return true;
    });
    
    console.log('🎯 Filtered result:', {
      originalCount: conversations.length,
      filteredCount: filtered.length,
      firstFilteredConversation: filtered[0], // Debug: show first filtered conversation
      isFilteredZainjoData: filtered[0]?.dataSource === 'zainjo' || filtered[0]?.id?.startsWith('ZAINJO-')
    });
    
    return filtered;
  }, [conversations, searchQuery, activeFilters]);

  // Paginated conversations
  const paginatedConversations = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return filteredConversations.slice(startIndex, endIndex);
  }, [filteredConversations, currentPage]);

  const totalPages = Math.ceil(filteredConversations.length / ITEMS_PER_PAGE);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, activeFilters]);

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment.toLowerCase()) {
      case 'positive':
        return 'text-emerald-400';
      case 'neutral':
        return 'text-blue-400';
      case 'negative':
        return 'text-rose-400';
      default:
        return 'text-gray-400';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return <CheckCircleIcon className="text-emerald-400" size={16} />;
      case 'escalated':
        return <XCircleIcon className="text-rose-400" size={16} />;
      case 'needs review':
        return <AlertTriangleIcon className="text-blue-400" size={16} />;
      case 'pending':
        return <AlertTriangleIcon className="text-amber-400" size={16} />;
      default:
        return <CircleIcon className="text-gray-400" size={16} />;
    }
  };

  const formatDuration = (firstResponseTime?: number) => {
    if (!firstResponseTime) return 'N/A';
    const minutes = Math.floor(firstResponseTime / 60000);
    const seconds = Math.floor((firstResponseTime % 60000) / 1000);
    return `${minutes}m ${seconds}s`;
  };

  if (loading) {
    return (
      <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-8">
        <div className="flex items-center justify-center">
          <LoaderIcon className="animate-spin text-blue-400 mr-3" size={24} />
          <span className="text-gray-300">Loading conversations...</span>
        </div>
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-8">
        <div className="text-center">
          <MessageSquareIcon className="mx-auto text-gray-400 mb-4" size={48} />
          <h3 className="text-lg font-medium text-gray-300 mb-2">No Conversations Found</h3>
          <p className="text-gray-400">
            Run an analysis first to see conversation data here.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 overflow-hidden">
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white">
            Conversations ({filteredConversations.length})
          </h3>
          <div className="flex items-center space-x-4">
            {filteredConversations.length !== conversations.length && (
              <span className="text-sm text-gray-400">
                Filtered from {conversations.length} total
              </span>
            )}
            {totalPages > 1 && (
              <span className="text-sm text-gray-400">
                Page {currentPage} of {totalPages}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-700">
              <th className="px-6 py-4 text-left text-sm font-medium text-gray-400">
                ID
              </th>
              <th className="px-6 py-4 text-left text-sm font-medium text-gray-400">
                Date & Time
              </th>
              <th className="px-6 py-4 text-left text-sm font-medium text-gray-400">
                Sentiment
              </th>
              <th className="px-6 py-4 text-left text-sm font-medium text-gray-400">
                Quality
              </th>
              <th className="px-6 py-4 text-left text-sm font-medium text-gray-400">
                Duration
              </th>
              <th className="px-6 py-4 text-left text-sm font-medium text-gray-400">
                Messages
              </th>
              <th className="px-6 py-4 text-left text-sm font-medium text-gray-400">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {paginatedConversations.map((conv) => (
              <tr
                key={conv.id}
                className="hover:bg-gray-700/30 transition-colors duration-150 cursor-pointer"
                onClick={() => {
                  // Navigate to conversation detail page using conversation ID
                  router.push(`/conversations/${conv.id}`);
                }}
              >
                <td className="px-6 py-4">
                  <div className="flex items-center space-x-2">
                    <MessageSquareIcon size={16} className="text-gray-400" />
                    <span className="text-sm font-medium text-white">
                      {conv.id}
                    </span>
                    {/* Visual indicator for data source */}
                    {(conv.dataSource === 'zainjo' || conv.id.startsWith('ZAINJO-')) && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-900/50 text-orange-300 border border-orange-500/30">
                        Zainjo
                      </span>
                    )}
                    {(!conv.dataSource || conv.dataSource !== 'zainjo') && !conv.id.startsWith('ZAINJO-') && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-900/50 text-blue-300 border border-blue-500/30">
                        Regular
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-gray-300">
                  {new Date(conv.timestamp).toLocaleString()}
                </td>
                <td className="px-6 py-4">
                  <span
                    className={`inline-flex items-center space-x-1 ${getSentimentColor(conv.sentiment)}`}
                  >
                    <CircleIcon size={8} />
                    <span className="text-sm capitalize">{conv.sentiment}</span>
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center space-x-2">
                    <div className="w-12 bg-gray-700 rounded-full h-2">
                      <div
                        className="h-2 rounded-full bg-gradient-to-r from-blue-500 to-blue-400"
                        style={{ width: `${conv.qualityScore}%` }}
                      />
                    </div>
                    <span className="text-sm text-gray-300">{conv.qualityScore}%</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-gray-300">
                  <div className="flex items-center space-x-1">
                    <ClockIcon size={14} className="text-gray-400" />
                    <span>{formatDuration(conv.firstResponseTime)}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-gray-300">
                  {conv.messages}
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center space-x-2">
                    {getStatusIcon(conv.status)}
                    <span className="text-sm text-gray-300">{conv.status}</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="p-4 border-t border-gray-700">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-400">
              Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1} to {Math.min(currentPage * ITEMS_PER_PAGE, filteredConversations.length)} of {filteredConversations.length} conversations
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="flex items-center px-3 py-2 text-sm bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:text-gray-500 rounded-lg transition-colors"
              >
                <ChevronLeftIcon size={16} className="mr-1" />
                Previous
              </button>
              
              <div className="flex items-center space-x-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }
                  
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`px-3 py-2 text-sm rounded-lg transition-colors ${
                        currentPage === pageNum
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>

              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="flex items-center px-3 py-2 text-sm bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:text-gray-500 rounded-lg transition-colors"
              >
                Next
                <ChevronRightIcon size={16} className="ml-1" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ConversationList; 