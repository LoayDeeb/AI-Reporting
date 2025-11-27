export interface DateObject {
  $date: {
    $numberLong: string;
  };
}

export interface Card {
  title: string;
  subtitle?: string | null;
  imageUrl?: string | null;
  action?: string | null;
  pvalue?: string | null;
  nextId?: string | null;
  actionName?: string | null;
  selectName?: string | null;
}

export interface Message {
  ID: string;
  from?: 'bot' | 'user';
  to?: 'bot' | 'user';
  Type?: 'Text' | 'Video' | 'Image' | 'Cards';
  Agent?: boolean;
  MessageText?: string;
  TimeSent: string;
  DateSent?: string;
  DateStamp?: DateObject;
  SenderID?: string;
  PageID?: string;
  bot?: boolean;
  Number?: number;
  IOSDateStamp?: null;
  IsArchived?: boolean;
  MessageStatus?: number;
  MessageId?: string;
  ConversationThreadId?: null;
  CardsList?: Card[] | null;
}

export interface Conversation {
  ChatDate: DateObject;
  ChatHistory: Message[];
}

export interface ConversationAnalytics {
  senderID: string;
  conversationLength: number;
  firstResponseTime?: number;
  sentiment: 'positive' | 'negative' | 'neutral';
  sentimentScore: number;
  intents: string[];
  subCategories: string[];
  qualityScore: number;
  qualityReasons?: string[];
  knowledgeGaps: string[];
  summary: string;
  recommendations: string[];
  trends: string[];
  
  // Optional fields for Human Agent Analysis
  agentName?: string;
  customerName?: string;
  coachingOpportunities?: string[];
  scriptAdherence?: number;
  escalationRisk?: number;
  rootCauses?: string[];
  churnSignals?: string[];
  sentimentChange?: string;
  empathyScore: number;
  customerEffortScore?: number;
  resolutionStatus?: string;
  topics?: string[];
  
  // Timestamps
  timestamp?: string;
}

// Enhanced types for detailed analysis
export interface MessageAnalysis {
  messageId: string;
  content: string;
  sender: 'bot' | 'user';
  timestamp: string;
  sentiment?: 'positive' | 'negative' | 'neutral';
  sentimentScore?: number;
  intent?: string;
  qualityScore?: number;
  qualityReasoning?: string;
}

export interface DetailedConversationAnalysis extends Omit<ConversationAnalytics, 'escalationRisk' | 'resolutionStatus'> {
  messageAnalyses: MessageAnalysis[];
  conversationFlow: string[];
  escalationRisk: 'low' | 'medium' | 'high';
  resolutionStatus: 'resolved' | 'partial' | 'unresolved';
  recommendedActions: string[];
}

export interface PlatformOverallScore {
  overallScore: number; // 0-100
  scoreBreakdown: {
    qualityScore: number;
    sentimentScore: number;
    responseTimeScore: number;
    resolutionScore: number;
  };
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  improvementAreas: string[];
}

export interface DashboardMetrics {
  totalConversations: number;
  avgConversationLength: number;
  avgFirstResponseTime: number;
  sentimentDistribution: {
    positive: number;
    negative: number;
    neutral: number;
  };
  topIntents: Array<{ intent: string; count: number }>;
  topTopics: Array<{ topic: string; count: number }>;
  topSubCategories: Array<{ category: string; count: number }>;
  avgQualityScore: number;
  // Enhanced metrics
  platformScore: PlatformOverallScore;
  topKnowledgeGaps: Array<{ gap: string; count: number }>;
  escalationRate: number;
  resolutionRate: number;
  trendsOverTime: Array<{
    period: string;
    qualityScore: number;
    sentimentScore: number;
    volume: number;
  }>;
} 