const { DataProcessor } = require('./src/lib/data-processor');

async function regenerateInsights() {
  console.log('🔄 Starting insights regeneration from cached data...\n');
  
  try {
    const processor = new DataProcessor();
    
    // Check if cache exists
    const cache = await processor.loadCache();
    if (!cache || !cache.analytics || cache.analytics.length === 0) {
      console.log('❌ No cached data found. Please run full analysis first.');
      return;
    }
    
    console.log(`📊 Found cached analysis with ${cache.analytics.length} conversations`);
    console.log(`📅 Cache created: ${new Date(cache.timestamp).toLocaleString()}`);
    
    // Check current insights status
    if (cache.aiInsights && cache.aiInsights.insights) {
      console.log(`🔍 Current insights: ${cache.aiInsights.insights.substring(0, 100)}...`);
      console.log(`📋 Current recommendations: ${cache.aiInsights.recommendations?.length || 0}`);
      console.log(`📈 Current trends: ${cache.aiInsights.trends?.length || 0}\n`);
    } else {
      console.log('⚠️  No AI insights found in cache\n');
    }
    
    // Regenerate insights
    console.log('🚀 Regenerating AI insights with optimized method...');
    const newInsights = await processor.regenerateAIInsights();
    
    console.log('\n✅ SUCCESS! New insights generated:');
    console.log(`📝 Insights: ${newInsights.insights}`);
    console.log(`\n📋 Recommendations (${newInsights.recommendations.length}):`);
    newInsights.recommendations.forEach((rec, index) => {
      console.log(`  ${index + 1}. ${rec}`);
    });
    
    console.log(`\n📈 Trends (${newInsights.trends.length}):`);
    newInsights.trends.forEach((trend, index) => {
      console.log(`  ${index + 1}. ${trend}`);
    });
    
    console.log('\n🎯 Your insights should now appear in the dashboard!');
    console.log('💡 Refresh your browser to see the updated insights.');
    
  } catch (error) {
    console.error('❌ Error regenerating insights:', error.message);
    console.log('\n💡 Troubleshooting:');
    console.log('1. Make sure you have run full analysis at least once');
    console.log('2. Check if cache file exists in data/analysis-cache.json');
    console.log('3. Verify OpenAI API key is configured');
  }
}

// Run the regeneration
regenerateInsights(); 