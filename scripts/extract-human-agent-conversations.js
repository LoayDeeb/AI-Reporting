/**
 * Extract Human Agent Conversations from Web AR Data
 * 
 * This script processes the Web AR data file and extracts conversations
 * that were escalated to human agents for analysis.
 * 
 * THE EXACT TRIGGER: "I would like to speak to a human"
 * After this, look for the bot greeting and then @@agentname patterns
 */

const fs = require('fs');
const path = require('path');

// THE EXACT trigger phrase for human agent transfer
const EXACT_HUMAN_TRIGGER = "I would like to speak to a human";

// Bot greeting pattern (appears before agent takes over)
const BOT_GREETING = "أنا مساعدك الافتراضي من لايك كارد";

// Pattern to detect agent names (@@agentname)
const AGENT_NAME_REGEX = /@@([^\s@,،.。!?]+)/g;

function extractAgentNames(messages) {
  const agentNames = new Set();
  
  for (const msg of messages) {
    if (msg.MessageText) {
      const matches = msg.MessageText.matchAll(AGENT_NAME_REGEX);
      for (const match of matches) {
        if (match[1] && match[1].length > 1) {
          agentNames.add(match[1].trim());
        }
      }
    }
    
    // Also check SenderName for agent identification
    if (msg.SenderName && msg.SenderName !== null && !msg.bot) {
      agentNames.add(msg.SenderName);
    }
  }
  
  return Array.from(agentNames);
}

function findExactTrigger(messages) {
  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    if (msg.MessageText && msg.MessageText.includes(EXACT_HUMAN_TRIGGER)) {
      return { message: msg, index: i };
    }
  }
  return { message: null, index: -1 };
}

function findBotGreeting(messages) {
  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    if (msg.MessageText && msg.MessageText.includes(BOT_GREETING)) {
      return i;
    }
  }
  return -1;
}

function findHandoverPoint(messages, triggerIndex) {
  // Find the point after the trigger where:
  // 1. @@agentname appears (agent introduction)
  // 2. Or a non-bot message with SenderName
  
  const startSearch = Math.max(0, triggerIndex);
  
  for (let i = startSearch; i < messages.length; i++) {
    const msg = messages[i];
    
    // Check for @@agentname pattern
    if (msg.MessageText && AGENT_NAME_REGEX.test(msg.MessageText)) {
      // Reset regex lastIndex
      AGENT_NAME_REGEX.lastIndex = 0;
      return i;
    }
    
    // Check for non-bot message with SenderName (agent)
    if (!msg.bot && msg.SenderName && msg.SenderName !== null && msg.from !== 'user') {
      return i;
    }
  }
  
  return triggerIndex > 0 ? triggerIndex : -1;
}

function processWebARData(filePath) {
  console.log('📖 Reading Web AR data file...');
  console.log(`   File: ${filePath}`);
  
  const fileContent = fs.readFileSync(filePath, 'utf-8');
  const fileSizeMB = (Buffer.byteLength(fileContent, 'utf8') / (1024 * 1024)).toFixed(2);
  console.log(`   Size: ${fileSizeMB} MB`);
  
  console.log('🔍 Parsing JSON...');
  const data = JSON.parse(fileContent);
  
  console.log(`📊 Total conversations in file: ${data.Count}`);
  console.log(`   ActiveChatters array length: ${data.ActiveChatters.length}`);
  
  const results = {
    withExactTrigger: [],
    withRequestHumanFlag: [],
    withAgentNames: [],
    withConnectedToAgent: [],
    allHumanAgentConversations: []
  };
  
  let processedCount = 0;
  
  for (const conversation of data.ActiveChatters) {
    processedCount++;
    
    if (processedCount % 1000 === 0) {
      console.log(`   Processed ${processedCount}/${data.ActiveChatters.length} conversations...`);
    }
    
    const messages = conversation.ChatHistory || [];
    if (messages.length === 0) continue;
    
    // Check for exact trigger phrase
    const { message: triggerMsg, index: triggerIndex } = findExactTrigger(messages);
    const hasExactTrigger = triggerMsg !== null;
    
    // Check RequestHuman flag
    const hasRequestHumanFlag = conversation.RequestHuman === true;
    
    // Check ConnectedToAgent flag
    const hasConnectedToAgent = conversation.ConnectedToAgent === true;
    
    // Extract agent names
    const agentNames = extractAgentNames(messages);
    const hasAgentNames = agentNames.length > 0;
    
    // Find handover point
    const handoverPoint = triggerIndex > 0 ? findHandoverPoint(messages, triggerIndex) : -1;
    
    // Categorize messages
    const botMessages = messages.filter(m => m.bot === true || m.from === 'bot');
    const userMessages = messages.filter(m => m.from === 'user');
    
    // Messages after handover (human agent part)
    const messagesAfterHandover = handoverPoint > 0 
      ? messages.filter(m => m.Number > handoverPoint)
      : [];
    
    const extractedData = {
      conversationId: conversation.Id,
      chatDate: conversation.ChatDate,
      senderID: conversation.SenderID,
      hasExactTrigger,
      hasRequestHumanFlag,
      hasConnectedToAgent,
      agentNames,
      triggerMessageIndex: triggerIndex,
      triggerMessage: triggerMsg ? triggerMsg.MessageText : null,
      handoverPoint,
      totalMessages: messages.length,
      botMessageCount: botMessages.length,
      userMessageCount: userMessages.length,
      messagesAfterHandoverCount: messagesAfterHandover.length,
      // Include all messages for analysis
      allMessages: messages.map(m => ({
        number: m.Number,
        from: m.from,
        to: m.to,
        type: m.Type,
        isBot: m.bot,
        text: m.MessageText,
        time: m.TimeSent,
        date: m.DateSent,
        timestamp: m.DateStamp,
        senderName: m.SenderName,
      })),
      // Include only messages after handover for human agent analysis
      humanAgentMessages: messagesAfterHandover.map(m => ({
        number: m.Number,
        from: m.from,
        to: m.to,
        type: m.Type,
        isBot: m.bot,
        text: m.MessageText,
        time: m.TimeSent,
        date: m.DateSent,
        timestamp: m.DateStamp,
        senderName: m.SenderName,
      }))
    };
    
    // Categorize
    if (hasExactTrigger) {
      results.withExactTrigger.push(extractedData);
    }
    if (hasRequestHumanFlag) {
      results.withRequestHumanFlag.push(extractedData);
    }
    if (hasAgentNames) {
      results.withAgentNames.push(extractedData);
    }
    if (hasConnectedToAgent) {
      results.withConnectedToAgent.push(extractedData);
    }
    
    // Include in main list if any criteria met
    if (hasExactTrigger || hasRequestHumanFlag || hasAgentNames || hasConnectedToAgent) {
      results.allHumanAgentConversations.push(extractedData);
    }
  }
  
  return results;
}

function generateReport(results) {
  console.log('\n' + '='.repeat(70));
  console.log('📈 EXTRACTION RESULTS SUMMARY');
  console.log('='.repeat(70));
  
  console.log(`\n🎯 Conversations with EXACT trigger "${EXACT_HUMAN_TRIGGER}": ${results.withExactTrigger.length}`);
  console.log(`🚩 Conversations with RequestHuman=true flag: ${results.withRequestHumanFlag.length}`);
  console.log(`👥 Conversations with @@agentname detected: ${results.withAgentNames.length}`);
  console.log(`🔗 Conversations with ConnectedToAgent=true: ${results.withConnectedToAgent.length}`);
  console.log(`\n📊 TOTAL unique human agent conversations: ${results.allHumanAgentConversations.length}`);
  
  // Extract unique agent names
  const allAgentNames = new Set();
  for (const conv of results.allHumanAgentConversations) {
    conv.agentNames.forEach(name => allAgentNames.add(name));
  }
  
  console.log(`\n👤 Unique agent names found: ${allAgentNames.size}`);
  if (allAgentNames.size > 0 && allAgentNames.size <= 20) {
    console.log('   Agents:', Array.from(allAgentNames).join(', '));
  } else if (allAgentNames.size > 20) {
    console.log('   First 20 agents:', Array.from(allAgentNames).slice(0, 20).join(', '));
  }
  
  // Show sample conversations
  if (results.withExactTrigger.length > 0) {
    console.log('\n📝 Sample conversation with exact trigger:');
    const sample = results.withExactTrigger[0];
    console.log(`   ID: ${sample.conversationId}`);
    console.log(`   Date: ${sample.chatDate}`);
    console.log(`   Trigger at message #${sample.triggerMessageIndex + 1}`);
    console.log(`   Handover at message #${sample.handoverPoint + 1}`);
    console.log(`   Total messages: ${sample.totalMessages}`);
    console.log(`   Messages after handover: ${sample.messagesAfterHandoverCount}`);
    console.log(`   Agent names: ${sample.agentNames.join(', ') || 'None detected'}`);
  }
  
  return allAgentNames;
}

function saveResults(results, outputDir) {
  // Save all extracted conversations
  const mainOutputFile = path.join(outputDir, 'human-agent-conversations.json');
  fs.writeFileSync(mainOutputFile, JSON.stringify({
    extractedAt: new Date().toISOString(),
    triggerPhrase: EXACT_HUMAN_TRIGGER,
    botGreeting: BOT_GREETING,
    summary: {
      withExactTrigger: results.withExactTrigger.length,
      withRequestHumanFlag: results.withRequestHumanFlag.length,
      withAgentNames: results.withAgentNames.length,
      withConnectedToAgent: results.withConnectedToAgent.length,
      totalUnique: results.allHumanAgentConversations.length,
    },
    conversations: results.allHumanAgentConversations,
  }, null, 2));
  console.log(`\n💾 Saved all conversations to: ${mainOutputFile}`);
  
  // Save just the exact trigger conversations (for focused analysis)
  if (results.withExactTrigger.length > 0) {
    const triggerOutputFile = path.join(outputDir, 'exact-trigger-conversations.json');
    fs.writeFileSync(triggerOutputFile, JSON.stringify({
      extractedAt: new Date().toISOString(),
      triggerPhrase: EXACT_HUMAN_TRIGGER,
      count: results.withExactTrigger.length,
      conversations: results.withExactTrigger,
    }, null, 2));
    console.log(`💾 Saved exact trigger conversations to: ${triggerOutputFile}`);
  }
  
  // Save conversations with agent names (these have confirmed agent involvement)
  if (results.withAgentNames.length > 0) {
    const agentOutputFile = path.join(outputDir, 'agent-involved-conversations.json');
    fs.writeFileSync(agentOutputFile, JSON.stringify({
      extractedAt: new Date().toISOString(),
      count: results.withAgentNames.length,
      conversations: results.withAgentNames,
    }, null, 2));
    console.log(`💾 Saved agent-involved conversations to: ${agentOutputFile}`);
  }
}

// Merge results from multiple files
function mergeResults(allResults) {
  const merged = {
    withExactTrigger: [],
    withRequestHumanFlag: [],
    withAgentNames: [],
    withConnectedToAgent: [],
    allHumanAgentConversations: []
  };
  
  for (const result of allResults) {
    merged.withExactTrigger.push(...result.withExactTrigger);
    merged.withRequestHumanFlag.push(...result.withRequestHumanFlag);
    merged.withAgentNames.push(...result.withAgentNames);
    merged.withConnectedToAgent.push(...result.withConnectedToAgent);
    merged.allHumanAgentConversations.push(...result.allHumanAgentConversations);
  }
  
  return merged;
}

// Main execution
function main() {
  const dataDir = path.join(process.cwd(), 'data');
  
  // Data files to process
  const dataFiles = [
    { name: 'Web AR', file: 'Web AR_01 October 2025 - 31 October 2025.txt' },
    { name: 'APP AR', file: 'APP AR_01 October 2025 - 31 October 2025.txt' }
  ];
  
  console.log('🚀 Human Agent Conversation Extraction');
  console.log('='.repeat(70));
  console.log(`\n🎯 Looking for trigger phrase: "${EXACT_HUMAN_TRIGGER}"`);
  console.log(`📍 Looking for bot greeting: "${BOT_GREETING}"`);
  console.log(`👤 Looking for agent names pattern: @@agentname\n`);
  
  const allResults = [];
  
  for (const { name, file } of dataFiles) {
    const filePath = path.join(dataDir, file);
    
    if (!fs.existsSync(filePath)) {
      console.log(`⚠️  ${name} file not found, skipping: ${file}`);
      continue;
    }
    
    console.log(`\n📂 Processing ${name}...`);
    console.log('-'.repeat(70));
    
    const results = processWebARData(filePath);
    results.source = name;
    
    // Add source to each conversation
    for (const conv of results.allHumanAgentConversations) {
      conv.source = name;
    }
    
    allResults.push(results);
    
    console.log(`   ✓ ${name}: ${results.allHumanAgentConversations.length} human agent conversations found`);
  }
  
  if (allResults.length === 0) {
    console.error('\n❌ No data files found to process!');
    process.exit(1);
  }
  
  // Merge all results
  console.log('\n📊 Merging results from all sources...');
  const mergedResults = mergeResults(allResults);
  
  // Generate report
  generateReport(mergedResults);
  
  // Save results
  saveResults(mergedResults, dataDir);
  
  console.log('\n✅ Extraction complete!');
  console.log('='.repeat(70));
}

main();


