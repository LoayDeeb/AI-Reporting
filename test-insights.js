const fetch = require('node-fetch');

async function testInsights() {
  try {
    console.log('Testing AI insights generation...');
    
    // First test with sample analysis to see if insights work
    const response = await fetch('http://localhost:3000/api/analyze?action=sample');
    const data = await response.json();
    
    console.log('\n=== Sample Analysis Response ===');
    console.log('Has OpenAI:', data.hasOpenAI);
    console.log('Message:', data.message);
    
    if (data.senderID) {
      console.log('Sample SenderID:', data.senderID);
      console.log('Messages count:', data.messages?.length);
      
      // Now test individual conversation analysis
      console.log('\n=== Testing Individual Analysis ===');
      const analysisResponse = await fetch('http://localhost:3000/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          senderID: data.senderID, 
          action: 'analyze' 
        })
      });
      
      const analysisData = await analysisResponse.json();
      console.log('Individual analysis result:', {
        sentiment: analysisData.sentiment,
        qualityScore: analysisData.qualityScore,
        intents: analysisData.intents,
        summary: analysisData.summary?.substring(0, 100) + '...'
      });
    }
    
  } catch (error) {
    console.error('Error testing insights:', error);
  }
}

testInsights(); 