import React from 'react';
import Link from 'next/link';
import {
  ArrowLeftIcon,
  CircleIcon,
  ClockIcon,
  MessageSquareIcon,
  BarChart3Icon,
  TagIcon,
  Share2Icon,
  DownloadIcon,
} from 'lucide-react';

interface ConversationHeaderProps {
  conversation: {
    id: string;
    timestamp: string;
    sentiment: string;
    qualityScore: number;
    intent: string;
    duration: string;
    status: string;
    messages: number;
    conversationLength?: number;
    firstResponseTime?: number;
  };
  backLink?: string;
}

const ConversationHeader = ({ conversation, backLink = '/conversations' }: ConversationHeaderProps) => {
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

  return (
    <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 overflow-hidden">
      <div className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link
              href={backLink}
              className="hover:bg-gray-700/50 p-2 rounded-lg transition-colors"
            >
              <ArrowLeftIcon className="text-gray-400" size={20} />
            </Link>
            <div>
              <div className="flex items-center space-x-2">
                <MessageSquareIcon size={20} className="text-blue-400" />
                <h1 className="text-xl font-semibold text-white">
                  {conversation.id}
                </h1>
              </div>
              <p className="text-sm text-gray-400 mt-1">
                {new Date(conversation.timestamp).toLocaleString()}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <button className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-gray-700/50 hover:bg-gray-700 transition-colors">
              <Share2Icon size={16} className="text-gray-400" />
              <span className="text-sm text-gray-300">Share</span>
            </button>
            <button className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-gray-700/50 hover:bg-gray-700 transition-colors">
              <DownloadIcon size={16} className="text-gray-400" />
              <span className="text-sm text-gray-300">Export</span>
            </button>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
          <div className="bg-gray-900/50 rounded-lg p-4">
            <div className="flex items-center space-x-2 text-gray-400 mb-2">
              <CircleIcon
                size={16}
                className={getSentimentColor(conversation.sentiment)}
              />
              <span className="text-sm">Sentiment</span>
            </div>
            <p className="text-lg font-medium text-white">
              {conversation.sentiment}
            </p>
          </div>
          <div className="bg-gray-900/50 rounded-lg p-4">
            <div className="flex items-center space-x-2 text-gray-400 mb-2">
              <BarChart3Icon size={16} className="text-emerald-400" />
              <span className="text-sm">Quality Score</span>
            </div>
            <p className="text-lg font-medium text-white">
              {conversation.qualityScore}%
            </p>
          </div>
          <div className="bg-gray-900/50 rounded-lg p-4">
            <div className="flex items-center space-x-2 text-gray-400 mb-2">
              <TagIcon size={16} className="text-blue-400" />
              <span className="text-sm">Intent</span>
            </div>
            <p className="text-lg font-medium text-white">
              {conversation.intent}
            </p>
          </div>
          <div className="bg-gray-900/50 rounded-lg p-4">
            <div className="flex items-center space-x-2 text-gray-400 mb-2">
              <ClockIcon size={16} className="text-violet-400" />
              <span className="text-sm">Response Time</span>
            </div>
            <p className="text-lg font-medium text-white">
              {conversation.firstResponseTime ? `${conversation.firstResponseTime}ms` : conversation.duration}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConversationHeader; 