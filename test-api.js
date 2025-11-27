const fetch = require('node-fetch');

async function testAPI() {
  try {
    console.log('Testing API endpoint...');
    const response = await fetch('http://localhost:3000/api/analyze?action=full');
    const data = await response.json();
    
    console.log('\n=== API Response ===');
    console.log('Total conversations:', data.totalConversations);
    console.log('Analysis type:', data.analysisType);
    console.log('From cache:', data.fromCache);
    
    console.log('\n=== AI Insights Check ===');
    console.log('Has aiInsights:', !!data.aiInsights);
    if (data.aiInsights) {
      console.log('Insights:', data.aiInsights.insights);
      console.log('Recommendations count:', data.aiInsights.recommendations?.length || 0);
      console.log('Recommendations:', data.aiInsights.recommendations);
      console.log('Trends count:', data.aiInsights.trends?.length || 0);
      console.log('Trends:', data.aiInsights.trends);
    } else {
      console.log('❌ No aiInsights found in response');
    }
    
    if (data.metrics) {
      console.log('\n=== Platform Score ===');
      console.log('Overall score:', data.metrics.platformScore?.overallScore);
      console.log('Grade:', data.metrics.platformScore?.grade);
      console.log('Score breakdown:', data.metrics.platformScore?.scoreBreakdown);
      
      console.log('\n=== Sentiment Distribution ===');
      console.log('Positive:', data.metrics.sentimentDistribution?.positive + '%');
      console.log('Negative:', data.metrics.sentimentDistribution?.negative + '%');
      console.log('Neutral:', data.metrics.sentimentDistribution?.neutral + '%');
      
      console.log('\n=== Other Metrics ===');
      console.log('Avg Quality Score:', data.metrics.avgQualityScore);
      console.log('Escalation Rate:', data.metrics.escalationRate + '%');
      console.log('Resolution Rate:', data.metrics.resolutionRate + '%');
      
      console.log('\n=== Top Intents ===');
      console.log(data.metrics.topIntents?.slice(0, 5));
    }
    
    if (data.analytics && data.analytics.length > 0) {
      console.log('\n=== Sample Analytics ===');
      const sample = data.analytics[0];
      console.log('Sample conversation:', {
        senderID: sample.senderID,
        sentiment: sample.sentiment,
        qualityScore: sample.qualityScore,
        intents: sample.intents,
        knowledgeGaps: sample.knowledgeGaps
      });
    }
    
  } catch (error) {
    console.error('Error testing API:', error);
  }
}

testAPI(); 