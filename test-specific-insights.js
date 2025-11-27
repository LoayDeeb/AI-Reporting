const fetch = require('node-fetch');

async function testSpecificInsights() {
  console.log('🧪 Testing Improved AI Insights (Specific & Actionable)...\n');
  
  const baseUrl = 'http://localhost:3000';
  
  try {
    // First clear cache to ensure fresh analysis
    console.log('🗑️ Clearing cache...');
    await fetch(`${baseUrl}/api/analyze?action=clear-cache`);
    
    // Test with Ultra 100 mode for quick results
    console.log('🏃 Running Ultra 100 analysis with improved prompting...');
    const start = Date.now();
    
    const response = await fetch(`${baseUrl}/api/analyze?action=full&fastMode=true&sampleSize=100`);
    const result = await response.json();
    
    const time = Math.round((Date.now() - start) / 1000);
    console.log(`✅ Completed in ${time}s\n`);
    
    // Display the improved insights
    if (result.aiInsights) {
      console.log('🤖 AI INSIGHTS (Should be specific now):');
      console.log('=' .repeat(60));
      console.log(result.aiInsights.insights);
      console.log('\n📋 AI RECOMMENDATIONS (Should be actionable):');
      result.aiInsights.recommendations.forEach((rec, index) => {
        console.log(`${index + 1}. ${rec}`);
      });
      console.log('\n📈 IDENTIFIED TRENDS (Should be specific):');
      result.aiInsights.trends.forEach((trend, index) => {
        console.log(`• ${trend}`);
      });
      
      console.log('\n🔍 ANALYSIS QUALITY CHECK:');
      console.log(`- Contains specific numbers: ${/\d+%|\d+\.\d+/.test(result.aiInsights.insights) ? '✅' : '❌'}`);
      console.log(`- Mentions specific intents: ${result.aiInsights.insights.includes('intent') || result.aiInsights.insights.includes('greeting') || result.aiInsights.insights.includes('service') ? '✅' : '❌'}`);
      console.log(`- Actionable recommendations: ${result.aiInsights.recommendations.some(r => r.includes('implement') || r.includes('add') || r.includes('improve') || r.includes('train')) ? '✅' : '❌'}`);
      console.log(`- Platform Score: ${result.metrics?.platformScore?.overallScore || 'N/A'}`);
      
    } else {
      console.log('❌ No AI insights generated');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
  
  console.log('\n🎯 Test Complete!');
  console.log('💡 The insights should now be much more specific and actionable');
}

// Run the test
testSpecificInsights().catch(console.error); 