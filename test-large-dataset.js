#!/usr/bin/env node

/**
 * Large Dataset Testing Script
 * Use this to test your new large conversation files before full processing
 */

const fs = require('fs');
const path = require('path');

async function testLargeDataset() {
  console.log('🚀 Large Dataset Testing Script');
  console.log('================================\n');

  // Check data directory
  const dataDir = path.join(__dirname, 'data');
  if (!fs.existsSync(dataDir)) {
    console.error('❌ Data directory not found!');
    return;
  }

  // Find all JSON files
  const files = fs.readdirSync(dataDir).filter(file => file.endsWith('.json'));
  console.log(`📁 Found ${files.length} conversation file(s):\n`);

  let totalConversations = 0;
  let totalSize = 0;

  // Analyze each file
  for (const file of files) {
    const filePath = path.join(dataDir, file);
    const stats = fs.statSync(filePath);
    const sizeInMB = (stats.size / (1024 * 1024)).toFixed(1);
    totalSize += stats.size;

    console.log(`📄 ${file}:`);
    console.log(`   Size: ${sizeInMB} MB`);

    try {
      // Test JSON parsing without loading full content
      console.log(`   🔍 Validating JSON structure...`);
      const rawData = fs.readFileSync(filePath, 'utf-8');
      const conversations = JSON.parse(rawData);
      
      console.log(`   ✅ Valid JSON with ${conversations.length} conversations`);
      totalConversations += conversations.length;

      // Sample validation
      if (conversations.length > 0) {
        const sample = conversations[0];
        if (sample.ChatHistory && Array.isArray(sample.ChatHistory)) {
          console.log(`   ✅ Valid conversation structure`);
          console.log(`   📊 Sample conversation has ${sample.ChatHistory.length} messages`);
        } else {
          console.log(`   ⚠️  Warning: Unexpected conversation structure`);
        }
      }

    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
    }
    console.log('');
  }

  // Summary
  const totalSizeInMB = (totalSize / (1024 * 1024)).toFixed(1);
  const totalSizeInGB = (totalSize / (1024 * 1024 * 1024)).toFixed(2);
  
  console.log('📊 SUMMARY:');
  console.log(`   Total files: ${files.length}`);
  console.log(`   Total conversations: ${totalConversations.toLocaleString()}`);
  console.log(`   Total size: ${totalSizeInMB} MB (${totalSizeInGB} GB)`);
  
  // Performance estimates
  console.log('\n⏱️  PROCESSING TIME ESTIMATES (Ultra-Fast Mode):');
  const estimatedMinutes = Math.round((totalConversations / 10181) * 66);
  const estimatedHours = Math.floor(estimatedMinutes / 60);
  const remainingMinutes = estimatedMinutes % 60;
  
  if (estimatedHours > 0) {
    console.log(`   Estimated time: ${estimatedHours}h ${remainingMinutes}m`);
  } else {
    console.log(`   Estimated time: ${estimatedMinutes} minutes`);
  }
  
  // API cost estimates
  const estimatedCost = Math.round((totalConversations / 10181) * 3.5 * 100) / 100;
  console.log(`   Estimated API cost: $${estimatedCost} (GPT-4o-mini)`);

  // Recommendations
  console.log('\n💡 RECOMMENDATIONS:');
  
  if (totalConversations > 50000) {
    console.log('   🚨 Very large dataset detected!');
    console.log('   📝 Consider testing with samples first');
    console.log('   💾 Ensure sufficient RAM (8GB+ recommended)');
    console.log('   ⏰ Plan for several hours of processing time');
  } else if (totalConversations > 20000) {
    console.log('   ⚠️  Large dataset detected');
    console.log('   📝 Test with 1000 samples first');
    console.log('   💾 Monitor memory usage during processing');
  } else {
    console.log('   ✅ Dataset size looks manageable');
    console.log('   🚀 Ready for ultra-fast processing');
  }

  console.log('\n🔧 NEXT STEPS:');
  console.log('   1. Test basic loading: npm run test:basic');
  console.log('   2. Test with sample: npm run test:sample');
  console.log('   3. Run full analysis: npm run test:full');
  console.log('   4. Or use the web interface at http://localhost:3001');
}

// Run the test
testLargeDataset().catch(console.error); 