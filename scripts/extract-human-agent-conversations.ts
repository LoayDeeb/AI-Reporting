/**
 * Extract Human Agent Conversations from Web AR Data
 * 
 * This script processes the Web AR data file and extracts conversations
 * that were escalated to human agents for analysis.
 * 
 * Detection criteria:
 * 1. RequestHuman flag is true
 * 2. Messages contain "I would like to speak to a human" or Arabic equivalents
 * 3. Messages after bot greeting "أنا مساعدك الافتراضي من لايك كارد"
 * 4. Messages with @@agentname pattern indicating agent involvement
 */

import * as fs from 'fs';
import * as path from 'path';

// THE EXACT trigger phrase for human agent transfer
const EXACT_HUMAN_TRIGGER = "I would like to speak to a human";

// Additional patterns to detect human agent request (fallback)
const HUMAN_REQUEST_PATTERNS = [
  /I would like to speak to a human/i,  // Primary trigger
  /speak to a human/i,
  /talk to a human/i,
  /human agent/i,
  /أريد التحدث/,
  /تحدث مع موظف/,
  /تحدث مع خدمة/,
  /التحدث مع/,
  /أريد موظف/,
  /ممثل خدمة/,
];

// Pattern to detect bot greeting (before agent takeover)
const BOT_GREETING_PATTERN = /أنا مساعدك الافتراضي من لايك كارد/;

// Pattern to detect agent names (@@agentname)
const AGENT_NAME_PATTERN = /@@([^@\s,،.]+)/g;

interface WebARMessage {
  ID: string | null;
  from: string;
  to: string;
  Type: string;
  Agent: boolean;
  MessageText: string;
  TimeSent: string;
  DateSent: string;
  DateStamp: string;
  SenderID: string;
  PageID: string;
  bot: boolean;
  Number: number;
  SenderName: string | null;
  ConversationThreadId: number;
  CardsList: any[] | null;
}

interface WebARConversation {
  Id: string;
  Online: boolean;
  UserID: string | null;
  SenderID: string;
  PageID: string;
  From: string | null;
  ChatDate: string;
  ConnectedToAgent: boolean;
  RequestHuman: boolean;
  ChatHistory: WebARMessage[];
}

interface WebARData {
  Count: number;
  TotalPages: number;
  PageSize: number;
  ActiveChatters: WebARConversation[];
}

interface ExtractedHumanAgentConversation {
  conversationId: string;
  chatDate: string;
  requestedHuman: boolean;
  connectedToAgent: boolean;
  agentNames: string[];
  humanRequestMessage: string | null;
  handoverPoint: number; // Message number where handover occurred
  botMessages: WebARMessage[];
  userMessages: WebARMessage[];
  agentMessages: WebARMessage[];
  totalMessages: number;
  userMessagesAfterHandover: WebARMessage[];
  agentMessagesAfterHandover: WebARMessage[];
}

function extractAgentNames(messages: WebARMessage[]): string[] {
  const agentNames = new Set<string>();
  
  for (const msg of messages) {
    if (msg.MessageText) {
      const matches = msg.MessageText.matchAll(AGENT_NAME_PATTERN);
      for (const match of matches) {
        if (match[1] && match[1].length > 1) {
          agentNames.add(match[1].trim());
        }
      }
    }
    
    // Also check SenderName for agent identification
    if (msg.SenderName && !msg.bot && msg.from !== 'user') {
      agentNames.add(msg.SenderName);
    }
  }
  
  return Array.from(agentNames);
}

function findHumanRequestMessage(messages: WebARMessage[]): { message: WebARMessage | null; index: number } {
  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    if (msg.MessageText) {
      for (const pattern of HUMAN_REQUEST_PATTERNS) {
        if (pattern.test(msg.MessageText)) {
          return { message: msg, index: i };
        }
      }
    }
  }
  return { message: null, index: -1 };
}

function findBotGreeting(messages: WebARMessage[]): number {
  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    if (msg.MessageText && BOT_GREETING_PATTERN.test(msg.MessageText)) {
      return i;
    }
  }
  return -1;
}

function findHandoverPoint(messages: WebARMessage[]): number {
  // Find the point where bot stops and agent takes over
  // Look for:
  // 1. First message with Agent:true (if available)
  // 2. First message with @@agentname pattern
  // 3. First non-bot message after human request
  
  const { index: humanRequestIndex } = findHumanRequestMessage(messages);
  
  for (let i = Math.max(0, humanRequestIndex); i < messages.length; i++) {
    const msg = messages[i];
    
    // Check for Agent flag
    if (msg.Agent === true) {
      return i;
    }
    
    // Check for @@agentname pattern
    if (msg.MessageText && AGENT_NAME_PATTERN.test(msg.MessageText)) {
      return i;
    }
    
    // Check for non-bot message that's not from user
    if (!msg.bot && msg.from !== 'user' && msg.from !== 'bot' && msg.SenderName) {
      return i;
    }
  }
  
  // If no clear handover point, use the human request point
  return humanRequestIndex > 0 ? humanRequestIndex : -1;
}

function isAgentMessage(msg: WebARMessage): boolean {
  // A message is from an agent if:
  // 1. Agent flag is true
  // 2. Not a bot message and not from user
  // 3. Contains @@agentname (sent by agent)
  // 4. Has a non-null SenderName and isn't bot
  
  if (msg.Agent === true) return true;
  if (msg.bot === true) return false;
  if (msg.from === 'bot') return false;
  if (msg.from === 'user') return false;
  if (msg.SenderName && msg.SenderName !== null) return true;
  
  return false;
}

function processWebARData(filePath: string): ExtractedHumanAgentConversation[] {
  console.log('📖 Reading Web AR data file...');
  const fileContent = fs.readFileSync(filePath, 'utf-8');
  
  console.log('🔍 Parsing JSON...');
  const data: WebARData = JSON.parse(fileContent);
  
  console.log(`📊 Found ${data.Count} total conversations`);
  
  const extractedConversations: ExtractedHumanAgentConversation[] = [];
  let humanRequestCount = 0;
  let agentInvolvedCount = 0;
  
  for (const conversation of data.ActiveChatters) {
    const messages = conversation.ChatHistory || [];
    
    // Skip empty conversations
    if (messages.length === 0) continue;
    
    // Check if human was requested
    const { message: humanRequestMsg, index: humanRequestIndex } = findHumanRequestMessage(messages);
    const hasHumanRequest = conversation.RequestHuman === true || humanRequestMsg !== null;
    
    if (hasHumanRequest) {
      humanRequestCount++;
    }
    
    // Extract agent names
    const agentNames = extractAgentNames(messages);
    
    // Find handover point
    const handoverPoint = findHandoverPoint(messages);
    
    // Categorize messages
    const botMessages = messages.filter(m => m.bot === true || m.from === 'bot');
    const userMessages = messages.filter(m => m.from === 'user');
    const agentMessages = messages.filter(m => isAgentMessage(m));
    
    // Get messages after handover
    const userMessagesAfterHandover = handoverPoint > 0 
      ? userMessages.filter(m => m.Number > handoverPoint)
      : [];
    const agentMessagesAfterHandover = handoverPoint > 0
      ? agentMessages.filter(m => m.Number > handoverPoint)
      : [];
    
    // Only include conversations that have:
    // 1. RequestHuman flag OR explicit human request message
    // 2. AND either ConnectedToAgent OR agent names found OR agent messages
    const hasAgentInvolvement = 
      conversation.ConnectedToAgent === true || 
      agentNames.length > 0 || 
      agentMessages.length > 0;
    
    if (hasHumanRequest || hasAgentInvolvement) {
      if (hasAgentInvolvement) {
        agentInvolvedCount++;
      }
      
      extractedConversations.push({
        conversationId: conversation.Id,
        chatDate: conversation.ChatDate,
        requestedHuman: hasHumanRequest,
        connectedToAgent: conversation.ConnectedToAgent,
        agentNames,
        humanRequestMessage: humanRequestMsg?.MessageText || null,
        handoverPoint,
        botMessages,
        userMessages,
        agentMessages,
        totalMessages: messages.length,
        userMessagesAfterHandover,
        agentMessagesAfterHandover,
      });
    }
  }
  
  console.log(`\n📈 Extraction Summary:`);
  console.log(`   Total conversations: ${data.Count}`);
  console.log(`   Human requested: ${humanRequestCount}`);
  console.log(`   Agent involvement detected: ${agentInvolvedCount}`);
  console.log(`   Extracted for analysis: ${extractedConversations.length}`);
  
  return extractedConversations;
}

function generateAnalysisReport(conversations: ExtractedHumanAgentConversation[]): void {
  const agentStats = new Map<string, {
    conversationCount: number;
    totalMessages: number;
    avgMessagesPerConversation: number;
  }>();
  
  // Aggregate by agent
  for (const conv of conversations) {
    for (const agentName of conv.agentNames) {
      const stats = agentStats.get(agentName) || {
        conversationCount: 0,
        totalMessages: 0,
        avgMessagesPerConversation: 0,
      };
      
      stats.conversationCount++;
      stats.totalMessages += conv.agentMessagesAfterHandover.length;
      agentStats.set(agentName, stats);
    }
  }
  
  // Calculate averages
  for (const [agent, stats] of agentStats) {
    stats.avgMessagesPerConversation = 
      stats.conversationCount > 0 
        ? Math.round(stats.totalMessages / stats.conversationCount * 10) / 10
        : 0;
  }
  
  console.log(`\n👥 Agent Statistics:`);
  console.log(`   Unique agents found: ${agentStats.size}`);
  
  if (agentStats.size > 0) {
    console.log(`\n   Top Agents by Conversation Count:`);
    const sortedAgents = Array.from(agentStats.entries())
      .sort((a, b) => b[1].conversationCount - a[1].conversationCount)
      .slice(0, 10);
    
    for (const [agent, stats] of sortedAgents) {
      console.log(`   - ${agent}: ${stats.conversationCount} conversations, ${stats.totalMessages} messages`);
    }
  }
}

function convertToHumanAgentFormat(conversations: ExtractedHumanAgentConversation[]): any[] {
  // Convert to the format expected by HumanAgentAIAnalysis
  return conversations.map(conv => {
    const messages = [];
    
    // Add all messages in order
    const allMessages = [
      ...conv.botMessages.map(m => ({ ...m, role: 'bot' })),
      ...conv.userMessages.map(m => ({ ...m, role: 'user' })),
      ...conv.agentMessages.map(m => ({ ...m, role: 'agent' })),
    ].sort((a, b) => a.Number - b.Number);
    
    for (const msg of allMessages) {
      messages.push({
        id: msg.ID || `msg_${msg.Number}`,
        created_at: msg.DateStamp,
        content_thread_id: conv.conversationId,
        creator_name: msg.role === 'agent' ? (conv.agentNames[0] || 'Agent') : (msg.role === 'bot' ? 'Bot' : 'User'),
        author_name: msg.role === 'user' ? 'Customer' : (msg.role === 'agent' ? (conv.agentNames[0] || 'Agent') : 'Bot'),
        body: msg.MessageText,
        body_as_text: msg.MessageText,
        sentiment_text: '',
        categories: '',
        status: 'completed',
      });
    }
    
    return {
      content_thread_id: conv.conversationId,
      agent_name: conv.agentNames[0] || 'Unknown Agent',
      customer_name: 'Customer',
      messages,
      categories: [],
      sentiment_progression: [],
      metadata: {
        chatDate: conv.chatDate,
        requestedHuman: conv.requestedHuman,
        connectedToAgent: conv.connectedToAgent,
        handoverPoint: conv.handoverPoint,
        totalAgentMessages: conv.agentMessagesAfterHandover.length,
        totalUserMessagesAfterHandover: conv.userMessagesAfterHandover.length,
      }
    };
  });
}

async function main() {
  const dataDir = path.join(process.cwd(), 'data');
  const webARFile = path.join(dataDir, 'Web AR_01 October 2025 - 31 October 2025.txt');
  
  if (!fs.existsSync(webARFile)) {
    console.error('❌ Web AR data file not found:', webARFile);
    process.exit(1);
  }
  
  console.log('🚀 Starting Human Agent Conversation Extraction\n');
  console.log('=' .repeat(60));
  
  // Process the data
  const extractedConversations = processWebARData(webARFile);
  
  // Generate statistics
  generateAnalysisReport(extractedConversations);
  
  // Convert to analysis format
  const analysisFormat = convertToHumanAgentFormat(extractedConversations);
  
  // Save extracted data
  const outputFile = path.join(dataDir, 'human-agent-conversations.json');
  fs.writeFileSync(outputFile, JSON.stringify({
    extractedAt: new Date().toISOString(),
    totalConversations: extractedConversations.length,
    conversations: analysisFormat,
    rawExtracted: extractedConversations,
  }, null, 2));
  
  console.log(`\n✅ Saved extracted conversations to: ${outputFile}`);
  console.log('=' .repeat(60));
  
  // Show sample conversation
  if (extractedConversations.length > 0) {
    console.log('\n📝 Sample Extracted Conversation:');
    const sample = extractedConversations[0];
    console.log(`   ID: ${sample.conversationId}`);
    console.log(`   Date: ${sample.chatDate}`);
    console.log(`   Human Requested: ${sample.requestedHuman}`);
    console.log(`   Agent Names: ${sample.agentNames.join(', ') || 'None detected'}`);
    console.log(`   Total Messages: ${sample.totalMessages}`);
    console.log(`   Bot Messages: ${sample.botMessages.length}`);
    console.log(`   User Messages: ${sample.userMessages.length}`);
    console.log(`   Agent Messages: ${sample.agentMessages.length}`);
  }
}

// Run the script
main().catch(console.error);

