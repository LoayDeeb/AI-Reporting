import React from 'react';
import {
  UserIcon,
  MonitorIcon,
  GlobeIcon,
  BrainCircuitIcon,
  ThumbsUpIcon,
  ClockIcon,
  MessagesSquareIcon,
  HeartIcon,
  AlertTriangleIcon,
  FileCheckIcon,
  ActivityIcon,
  ZapIcon,
  TrendingUpIcon,
  LightbulbIcon,
} from 'lucide-react';

interface AnalyticsPanelProps {
  conversation: {
    id: string;
    messages: number;
    firstResponseTime?: number;
    knowledgeGaps?: string[];
    qualityScore?: number;
    user?: {
      id: string;
      sessionId: string;
      browser: string;
      device: string;
      location: string;
    };
    // Human Agent specific fields
    empathyScore?: number;
    escalationRisk?: number;
    scriptAdherence?: number;
    customerEffortScore?: number;
    coachingOpportunities?: string[];
    churnSignals?: string[];
    rootCauses?: string[];
  };
  conversationData?: any;
}

const AnalyticsPanel = ({ conversation, conversationData }: AnalyticsPanelProps) => {
  // Extract real metrics from conversation data
  const responseTime = conversation.firstResponseTime 
    ? `${conversation.firstResponseTime}ms avg`
    : conversationData?.firstResponseTime 
    ? `${conversationData.firstResponseTime}ms avg`
    : '2.3s avg';
    
  const knowledgeGapsCount = conversation.knowledgeGaps?.length || 
    conversationData?.knowledgeGaps?.length || 0;
    
  const qualityScore = conversation.qualityScore || 
    conversationData?.qualityScore || 95;
  
  const metrics = [
    {
      label: 'Response Time',
      value: responseTime,
      icon: <ClockIcon className="text-emerald-400" size={16} />,
    },
    {
      label: 'Total Messages',
      value: conversation.messages || conversationData?.messages?.length || 0,
      icon: <MessagesSquareIcon className="text-blue-400" size={16} />,
    },
    {
      label: 'Knowledge Gaps',
      value: knowledgeGapsCount,
      icon: <BrainCircuitIcon className="text-violet-400" size={16} />,
    },
    {
      label: 'Quality Score',
      value: `${qualityScore}%`,
      icon: <ThumbsUpIcon className="text-yellow-400" size={16} />,
    },
  ];

  // Add Human Agent metrics if available
  if (conversation.empathyScore !== undefined) {
    metrics.push({
      label: 'Empathy Score',
      value: `${conversation.empathyScore}%`,
      icon: <HeartIcon className="text-pink-400" size={16} />,
    });
  }

  if (conversation.escalationRisk !== undefined) {
    metrics.push({
      label: 'Escalation Risk',
      value: `${conversation.escalationRisk}%`,
      icon: <AlertTriangleIcon className="text-orange-400" size={16} />,
    });
  }

  if (conversation.scriptAdherence !== undefined) {
    metrics.push({
      label: 'Script Adherence',
      value: `${conversation.scriptAdherence}%`,
      icon: <FileCheckIcon className="text-blue-400" size={16} />,
    });
  }

  if (conversation.customerEffortScore !== undefined) {
    metrics.push({
      label: 'Effort Score',
      value: `${conversation.customerEffortScore}/10`,
      icon: <ActivityIcon className="text-green-400" size={16} />,
    });
  }

  return (
    <div className="space-y-6">
      <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Session Info</h3>
        <div className="space-y-4">
          <div className="flex items-center text-gray-300">
            <UserIcon size={16} className="text-gray-400 mr-3" />
            <span className="text-sm">User ID: {conversation.user?.id || conversationData?.senderID || 'Unknown'}</span>
          </div>
          <div className="flex items-center text-gray-300">
            <MonitorIcon size={16} className="text-gray-400 mr-3" />
            <span className="text-sm">
              {conversation.user?.device || 'Desktop'} - {conversation.user?.browser || 'Chrome'}
            </span>
          </div>
          <div className="flex items-center text-gray-300">
            <GlobeIcon size={16} className="text-gray-400 mr-3" />
            <span className="text-sm">{conversation.user?.location || 'Unknown Location'}</span>
          </div>
        </div>
      </div>
      
      <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Analytics</h3>
        <div className="grid grid-cols-1 gap-4">
          {metrics.map((metric) => (
            <div
              key={metric.label}
              className="flex items-center justify-between bg-gray-900/50 rounded-lg p-4"
            >
              <div className="flex items-center space-x-3">
                {metric.icon}
                <span className="text-sm text-gray-300">{metric.label}</span>
              </div>
              <span className="text-sm font-medium text-white">
                {metric.value}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Detailed Insights for Human Agents */}
      {(conversation.coachingOpportunities?.length ? conversation.coachingOpportunities.length > 0 : false) && (
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
            <LightbulbIcon className="text-yellow-400 mr-2" size={18} />
            Coaching Opportunities
          </h3>
          <ul className="space-y-2">
            {conversation.coachingOpportunities?.map((item, i) => (
              <li key={i} className="flex items-start text-sm text-gray-300">
                <span className="mr-2 text-yellow-500">•</span>
                {item}
              </li>
            ))}
          </ul>
        </div>
      )}

      {(conversation.churnSignals?.length ? conversation.churnSignals.length > 0 : false) && (
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
            <TrendingUpIcon className="text-red-400 mr-2" size={18} />
            Churn Signals
          </h3>
          <ul className="space-y-2">
            {conversation.churnSignals?.map((item, i) => (
              <li key={i} className="flex items-start text-sm text-gray-300">
                <span className="mr-2 text-red-500">•</span>
                {item}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default AnalyticsPanel; 