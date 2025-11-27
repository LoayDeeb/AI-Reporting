const fetch = require('node-fetch');

async function testFastMode() {
  console.log('🧪 Testing Fast Mode Analysis...\n');
  
  const baseUrl = 'http://localhost:3000';
  
  // Test 1: Fast mode with 100 samples (should be very quick)
  console.log('1️⃣ Testing Fast Mode with 100 samples...');
  const start1 = Date.now();
  
  try {
    const response1 = await fetch(`${baseUrl}/api/analyze?action=full&fastMode=true&sampleSize=100`);
    const result1 = await response1.json();
    
    const time1 = Math.round((Date.now() - start1) / 1000);
    console.log(`✅ Completed in ${time1}s`);
    console.log(`📊 Analyzed ${result1.totalConversations} conversations`);
    console.log(`🤖 AI Insights: ${result1.aiInsights?.insights ? 'Generated' : 'Failed'}`);
    console.log(`📈 Platform Score: ${result1.metrics?.platformScore?.overallScore || 'N/A'}\n`);
  } catch (error) {
    console.error('❌ Test 1 failed:', error.message);
  }
  
  // Test 2: Fast mode with 500 samples
  console.log('2️⃣ Testing Fast Mode with 500 samples...');
  const start2 = Date.now();
  
  try {
    const response2 = await fetch(`${baseUrl}/api/analyze?action=full&fastMode=true&sampleSize=500`);
    const result2 = await response2.json();
    
    const time2 = Math.round((Date.now() - start2) / 1000);
    console.log(`✅ Completed in ${time2}s`);
    console.log(`📊 Analyzed ${result2.totalConversations} conversations`);
    console.log(`🤖 AI Insights: ${result2.aiInsights?.insights ? 'Generated' : 'Failed'}`);
    console.log(`📈 Platform Score: ${result2.metrics?.platformScore?.overallScore || 'N/A'}\n`);
  } catch (error) {
    console.error('❌ Test 2 failed:', error.message);
  }
  
  // Test 3: Check if cache is working
  console.log('3️⃣ Testing cache retrieval...');
  const start3 = Date.now();
  
  try {
    const response3 = await fetch(`${baseUrl}/api/analyze?action=full`);
    const result3 = await response3.json();
    
    const time3 = Math.round((Date.now() - start3) / 1000);
    console.log(`✅ Completed in ${time3}s`);
    console.log(`📋 From cache: ${result3.fromCache ? 'Yes' : 'No'}`);
    console.log(`📊 Cached conversations: ${result3.totalConversations}`);
  } catch (error) {
    console.error('❌ Test 3 failed:', error.message);
  }
  
  console.log('\n🎯 Fast Mode Test Complete!');
  console.log('💡 For your deadline, use: ⚡ Fast 1K or 🚀 Fast 5K buttons');
}

// Run the test
testFastMode().catch(console.error); 