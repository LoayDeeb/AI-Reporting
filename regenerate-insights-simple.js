// Simple script to regenerate insights from cached data
const https = require('https');

async function regenerateInsights() {
  console.log('🔄 Regenerating insights from cached data...\n');
  
  try {
    // Call the analyze API with force refresh for insights only
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/api/regenerate-insights',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    };

    console.log('📡 Calling regenerate insights API...');
    
    const result = await makeRequest(options, {});
    
    if (result.success) {
      console.log('✅ SUCCESS! Insights regenerated:');
      console.log(`📝 Insights: ${result.aiInsights.insights}`);
      console.log(`\n📋 Recommendations (${result.aiInsights.recommendations.length}):`);
      result.aiInsights.recommendations.forEach((rec, index) => {
        console.log(`  ${index + 1}. ${rec}`);
      });
      console.log(`\n📈 Trends (${result.aiInsights.trends.length}):`);
      result.aiInsights.trends.forEach((trend, index) => {
        console.log(`  ${index + 1}. ${trend}`);
      });
      console.log('\n🎯 Refresh your dashboard to see the new insights!');
    } else {
      console.log('❌ Error:', result.error || 'Unknown error');
    }
    
  } catch (error) {
    console.error('❌ Failed to regenerate insights:', error.message);
    console.log('\n💡 Alternative: Use the frontend to regenerate insights');
    console.log('   - Go to your dashboard');
    console.log('   - Click "Intelligent Analysis" button');
    console.log('   - This will use your cached data and regenerate insights');
  }
}

function makeRequest(options, data) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(body));
        } catch (e) {
          reject(new Error('Invalid JSON response'));
        }
      });
    });
    
    req.on('error', reject);
    req.write(JSON.stringify(data));
    req.end();
  });
}

regenerateInsights(); 