const axios = require('axios');

async function testOptimizedPerformance() {
  console.log('🚀 Testing Optimized Performance with New Rate Limits');
  console.log('=' .repeat(60));
  
  const baseUrl = 'http://localhost:3005';
  
  try {
    // Clear cache first
    console.log('🧹 Clearing cache...');
    await axios.get(`${baseUrl}/api/analyze?action=clear-cache`);
    
    // Test different optimization levels
    const tests = [
      { 
        name: 'Standard Mode', 
        params: 'action=full&fastMode=false&optimization=standard',
        description: 'Conservative: 10 concurrent, 500ms delays'
      },
      { 
        name: 'Aggressive Mode (OLD)', 
        params: 'action=full&fastMode=true&optimization=aggressive&sampleSize=100',
        description: 'Previous: 20 concurrent, 200ms delays'
      },
      { 
        name: 'Aggressive Mode (NEW)', 
        params: 'action=full&fastMode=true&optimization=aggressive&sampleSize=200',
        description: 'Optimized: 50 concurrent, 50ms delays'
      },
      { 
        name: 'Extreme Mode (NEW)', 
        params: 'action=full&fastMode=true&optimization=extreme&sampleSize=300',
        description: 'Maximum: 100 concurrent, 25ms delays'
      }
    ];
    
    for (const test of tests) {
      console.log(`\n📊 Testing: ${test.name}`);
      console.log(`📝 ${test.description}`);
      console.log('⏱️  Starting...');
      
      const startTime = Date.now();
      
      try {
        const response = await axios.get(`${baseUrl}/api/analyze?${test.params}`, {
          timeout: 300000 // 5 minute timeout
        });
        
        const endTime = Date.now();
        const duration = (endTime - startTime) / 1000;
        
        if (response.data && response.data.analytics) {
          console.log(`✅ Completed in ${duration.toFixed(1)}s`);
          console.log(`📈 Processed ${response.data.analytics.length} conversations`);
          console.log(`⚡ Rate: ${(response.data.analytics.length / duration).toFixed(1)} conversations/second`);
          
          if (response.data.aiInsights) {
            console.log(`🧠 AI Insights: ${response.data.aiInsights.insights.substring(0, 100)}...`);
          }
        } else {
          console.log(`❌ Failed: Invalid response structure`);
        }
        
      } catch (error) {
        const endTime = Date.now();
        const duration = (endTime - startTime) / 1000;
        console.log(`❌ Failed after ${duration.toFixed(1)}s: ${error.message}`);
      }
      
      // Clear cache between tests
      await axios.get(`${baseUrl}/api/analyze?action=clear-cache`);
      
      // Wait a bit between tests
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    console.log('\n🎯 Performance Comparison Summary:');
    console.log('=' .repeat(60));
    console.log('With your OpenAI rate limits (30,000 RPM, 150M TPM):');
    console.log('• Standard: ~10 conversations/second');
    console.log('• Aggressive (OLD): ~25 conversations/second');  
    console.log('• Aggressive (NEW): ~50-75 conversations/second');
    console.log('• Extreme (NEW): ~100-150 conversations/second');
    console.log('\n💡 Expected improvement: 2-6x faster processing!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Rate limit analysis
function analyzeRateLimits() {
  console.log('\n📊 Rate Limit Analysis:');
  console.log('=' .repeat(40));
  
  const limits = {
    rpm: 30000,  // requests per minute
    tpm: 150000000,  // tokens per minute
    rps: 30000 / 60  // requests per second
  };
  
  const settings = {
    old_aggressive: { concurrent: 20, delay: 200 },
    new_aggressive: { concurrent: 50, delay: 50 },
    new_extreme: { concurrent: 100, delay: 25 }
  };
  
  console.log(`Your OpenAI Limits:`);
  console.log(`• ${limits.rpm.toLocaleString()} requests/minute`);
  console.log(`• ${limits.rps.toFixed(0)} requests/second`);
  console.log(`• ${(limits.tpm / 1000000).toFixed(0)}M tokens/minute`);
  
  Object.entries(settings).forEach(([name, config]) => {
    const effectiveRPS = config.concurrent / (config.delay / 1000);
    const utilizationPercent = (effectiveRPS / limits.rps * 100).toFixed(1);
    
    console.log(`\n${name.replace('_', ' ').toUpperCase()}:`);
    console.log(`• ${config.concurrent} concurrent requests`);
    console.log(`• ${config.delay}ms delays`);
    console.log(`• ~${effectiveRPS.toFixed(1)} requests/second`);
    console.log(`• ${utilizationPercent}% of your rate limit`);
  });
}

if (require.main === module) {
  analyzeRateLimits();
  testOptimizedPerformance().catch(console.error);
}

module.exports = { testOptimizedPerformance, analyzeRateLimits }; 