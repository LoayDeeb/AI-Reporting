const fetch = require('node-fetch');

async function testTwoStageInsights() {
  console.log('🧪 Testing Two-Stage AI Insights Approach...\n');
  console.log('Stage 1: Individual conversation analysis with recommendations & trends');
  console.log('Stage 2: Consolidation of all individual insights into platform insights\n');
  
  const baseUrl = 'http://localhost:3001';
  
  try {
    // First clear cache to ensure fresh analysis
    console.log('🗑️ Clearing cache...');
    await fetch(`${baseUrl}/api/analyze?action=clear-cache`);
    
    // Test with Ultra 100 mode for quick results
    console.log('🏃 Running Ultra 100 analysis with two-stage approach...');
    const start = Date.now();
    
    const response = await fetch(`${baseUrl}/api/analyze?action=full&fastMode=true&sampleSize=100`);
    const result = await response.json();
    
    const time = Math.round((Date.now() - start) / 1000);
    console.log(`✅ Completed in ${time}s\n`);
    
    // Display the improved insights
    if (result.aiInsights) {
      console.log('🤖 CONSOLIDATED AI INSIGHTS:');
      console.log('=' .repeat(70));
      console.log(result.aiInsights.insights);
      console.log('\n📋 CONSOLIDATED RECOMMENDATIONS:');
      result.aiInsights.recommendations.forEach((rec, index) => {
        console.log(`${index + 1}. ${rec}`);
      });
      console.log('\n📈 CONSOLIDATED TRENDS:');
      result.aiInsights.trends.forEach((trend, index) => {
        console.log(`• ${trend}`);
      });
      
      console.log('\n🔍 TWO-STAGE ANALYSIS QUALITY CHECK:');
      console.log(`- Contains specific recommendations: ${result.aiInsights.recommendations.some(r => r.includes('Add') || r.includes('Improve') || r.includes('Implement')) ? '✅' : '❌'}`);
      console.log(`- References conversation patterns: ${result.aiInsights.insights.includes('conversation') || result.aiInsights.insights.includes('frequent') ? '✅' : '❌'}`);
      console.log(`- Mentions specific issues: ${result.aiInsights.insights.includes('%') || result.aiInsights.insights.includes('most') ? '✅' : '❌'}`);
      console.log(`- Platform Score: ${result.metrics?.platformScore?.overallScore || 'N/A'}`);
      
      // Check if we have individual conversation data with insights
      if (result.analytics && result.analytics.length > 0) {
        const sampleConversation = result.analytics[0];
        console.log('\n📊 SAMPLE INDIVIDUAL CONVERSATION INSIGHTS:');
        console.log(`- Individual recommendations: ${sampleConversation.recommendations?.length || 0}`);
        console.log(`- Individual trends: ${sampleConversation.trends?.length || 0}`);
        console.log(`- Quality reasons: ${sampleConversation.qualityReasons?.length || 0}`);
        console.log(`- Knowledge gaps: ${sampleConversation.knowledgeGaps?.length || 0}`);
        
        if (sampleConversation.recommendations?.length > 0) {
          console.log('\n🔍 Sample individual recommendations:');
          sampleConversation.recommendations.slice(0, 2).forEach((rec, index) => {
            console.log(`  ${index + 1}. ${rec}`);
          });
        }
      }
      
    } else {
      console.log('❌ No AI insights generated');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
  
  console.log('\n🎯 Two-Stage Test Complete!');
  console.log('💡 The insights should now be based on actual individual conversation recommendations');
  console.log('🔄 Stage 1: Each conversation analyzed for specific recommendations & trends');
  console.log('🔄 Stage 2: All individual insights consolidated into platform-level insights');
}

// Run the test
testTwoStageInsights().catch(console.error); 