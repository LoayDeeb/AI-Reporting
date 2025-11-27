const fs = require('fs');
const path = require('path');
const axios = require('axios');

class ChunkedDataProcessor {
  constructor(baseUrl = 'http://localhost:3008') {
    this.baseUrl = baseUrl;
    this.dataDir = path.join(__dirname, 'data');
    this.chunksDir = path.join(this.dataDir, 'chunks');
    this.resultsDir = path.join(this.dataDir, 'results');
    this.backupDir = path.join(this.dataDir, 'backup');
  }

  async processAllChunks() {
    console.log('🚀 Starting Chunked Data Processing');
    
    // Create results directory
    if (!fs.existsSync(this.resultsDir)) {
      fs.mkdirSync(this.resultsDir, { recursive: true });
    }

    // Load chunking summary
    const summaryPath = path.join(this.chunksDir, 'chunking_summary.json');
    if (!fs.existsSync(summaryPath)) {
      throw new Error('❌ No chunking summary found. Please run chunking first.');
    }

    const summary = JSON.parse(fs.readFileSync(summaryPath, 'utf8'));
    console.log(`📊 Processing ${summary.totalChunks} chunks (${summary.totalConversations.toLocaleString()} total conversations)`);
    console.log(`⏱️  Estimated time: ${summary.processingStats.estimatedProcessingTimeHours} hours`);
    console.log(`💰 Estimated cost: ${summary.processingStats.estimatedAPICostUSD}`);

    // Backup original file
    await this.backupOriginalFile();

    const results = [];
    const startTime = Date.now();

    for (let i = 0; i < summary.totalChunks; i++) {
      const chunkFileName = `conversations_chunk_${String(i).padStart(3, '0')}.json`;
      const chunkResult = await this.processChunk(i, chunkFileName, summary.totalChunks);
      results.push(chunkResult);

      // Save intermediate results
      await this.saveIntermediateResults(results, i + 1, summary.totalChunks);
    }

    // Combine all results
    const finalResults = await this.combineResults(results, summary);
    
    const totalTime = ((Date.now() - startTime) / 1000 / 60 / 60).toFixed(2);
    console.log(`\n🎉 All chunks processed successfully in ${totalTime} hours!`);
    
    return finalResults;
  }

  async processChunk(chunkIndex, chunkFileName, totalChunks) {
    console.log(`\n⏳ Processing chunk ${chunkIndex + 1}/${totalChunks}: ${chunkFileName}`);
    
    const chunkPath = path.join(this.chunksDir, chunkFileName);
    const tempPath = path.join(this.dataDir, 'temp_processing.json');
    
    try {
      // Copy chunk to main data directory
      fs.copyFileSync(chunkPath, tempPath);
      
      const startTime = Date.now();
      
      // Clear cache before processing each chunk
      await this.clearCache();
      
      // Process with ultra-fast mode
      console.log(`🔄 Analyzing chunk ${chunkIndex + 1} with ultra-fast mode...`);
      const response = await axios.get(`${this.baseUrl}/api/analyze`, {
        params: {
          action: 'full',
          fastMode: 'true',
          forceRefresh: 'true'
        },
        timeout: 30 * 60 * 1000 // 30 minute timeout
      });

      const processingTime = ((Date.now() - startTime) / 1000 / 60).toFixed(1);
      
      // Save chunk results
      const chunkResultPath = path.join(this.resultsDir, `chunk_${String(chunkIndex).padStart(3, '0')}_results.json`);
      fs.writeFileSync(chunkResultPath, JSON.stringify(response.data, null, 2));
      
      console.log(`✅ Chunk ${chunkIndex + 1} completed in ${processingTime} minutes`);
      console.log(`📊 Analyzed ${response.data.analyzedConversations} conversations`);
      console.log(`💾 Results saved: ${chunkResultPath}`);
      
      // Clean up temp file
      if (fs.existsSync(tempPath)) {
        fs.unlinkSync(tempPath);
      }
      
      return {
        chunkIndex,
        fileName: chunkFileName,
        processingTimeMinutes: parseFloat(processingTime),
        analyzedConversations: response.data.analyzedConversations,
        totalConversations: response.data.totalConversations,
        status: 'completed',
        resultFile: chunkResultPath,
        metrics: response.data.metrics,
        cacheMessage: response.data.cacheMessage
      };
      
    } catch (error) {
      console.error(`❌ Error processing chunk ${chunkIndex + 1}: ${error.message}`);
      
      // Clean up temp file on error
      if (fs.existsSync(tempPath)) {
        fs.unlinkSync(tempPath);
      }
      
      return {
        chunkIndex,
        fileName: chunkFileName,
        error: error.message,
        status: 'failed'
      };
    }
  }

  async clearCache() {
    try {
      await axios.get(`${this.baseUrl}/api/analyze`, {
        params: { action: 'clear-cache' }
      });
    } catch (error) {
      console.warn('⚠️  Warning: Could not clear cache:', error.message);
    }
  }

  async backupOriginalFile() {
    console.log('💾 Creating backup of original file...');
    
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
    }

    const originalFile = '0d1d46c3-ea4f-4fa6-b2a0-e58ec3211ce3.json';
    const originalPath = path.join(this.dataDir, originalFile);
    
    if (fs.existsSync(originalPath)) {
      const backupPath = path.join(this.backupDir, `${originalFile}.backup.${Date.now()}`);
      fs.copyFileSync(originalPath, backupPath);
      console.log(`✅ Backup created: ${backupPath}`);
    }
  }

  async saveIntermediateResults(results, completedChunks, totalChunks) {
    const progressPath = path.join(this.resultsDir, 'processing_progress.json');
    
    const progress = {
      completedChunks,
      totalChunks,
      progressPercentage: ((completedChunks / totalChunks) * 100).toFixed(1),
      results: results,
      lastUpdated: new Date().toISOString(),
      totalProcessingTime: results.reduce((sum, r) => sum + (r.processingTimeMinutes || 0), 0),
      successfulChunks: results.filter(r => r.status === 'completed').length,
      failedChunks: results.filter(r => r.status === 'failed').length
    };
    
    fs.writeFileSync(progressPath, JSON.stringify(progress, null, 2));
    console.log(`📈 Progress: ${progress.progressPercentage}% (${completedChunks}/${totalChunks})`);
  }

  async combineResults(results, summary) {
    console.log('\n🔄 Combining results from all chunks...');
    
    const successfulResults = results.filter(r => r.status === 'completed');
    const failedResults = results.filter(r => r.status === 'failed');
    
    // Combine analytics from all successful chunks
    const combinedAnalytics = [];
    const combinedMetrics = {
      totalConversations: 0,
      analyzedConversations: 0,
      averageQualityScore: 0,
      escalationRate: 0,
      resolutionRate: 0,
      averageResponseTime: 0
    };

    let totalQualityScore = 0;
    let totalEscalations = 0;
    let totalResolutions = 0;
    let totalResponseTime = 0;
    let validResponseTimes = 0;

    for (const result of successfulResults) {
      if (result.resultFile && fs.existsSync(result.resultFile)) {
        const chunkData = JSON.parse(fs.readFileSync(result.resultFile, 'utf8'));
        
        if (chunkData.analytics) {
          combinedAnalytics.push(...chunkData.analytics);
        }
        
        if (chunkData.metrics) {
          combinedMetrics.totalConversations += chunkData.metrics.totalConversations || 0;
          combinedMetrics.analyzedConversations += chunkData.metrics.analyzedConversations || 0;
          
          totalQualityScore += (chunkData.metrics.averageQualityScore || 0) * (chunkData.metrics.analyzedConversations || 0);
          totalEscalations += (chunkData.metrics.escalationRate || 0) * (chunkData.metrics.analyzedConversations || 0) / 100;
          totalResolutions += (chunkData.metrics.resolutionRate || 0) * (chunkData.metrics.analyzedConversations || 0) / 100;
          
          if (chunkData.metrics.averageResponseTime > 0) {
            totalResponseTime += (chunkData.metrics.averageResponseTime || 0) * (chunkData.metrics.analyzedConversations || 0);
            validResponseTimes += chunkData.metrics.analyzedConversations || 0;
          }
        }
      }
    }

    // Calculate combined averages
    if (combinedMetrics.analyzedConversations > 0) {
      combinedMetrics.averageQualityScore = totalQualityScore / combinedMetrics.analyzedConversations;
      combinedMetrics.escalationRate = (totalEscalations / combinedMetrics.analyzedConversations) * 100;
      combinedMetrics.resolutionRate = (totalResolutions / combinedMetrics.analyzedConversations) * 100;
    }
    
    if (validResponseTimes > 0) {
      combinedMetrics.averageResponseTime = totalResponseTime / validResponseTimes;
    }

    const finalResults = {
      summary: {
        originalFile: summary.originalFile,
        originalSizeGB: summary.originalSizeGB,
        totalChunks: summary.totalChunks,
        successfulChunks: successfulResults.length,
        failedChunks: failedResults.length,
        totalProcessingTimeHours: (results.reduce((sum, r) => sum + (r.processingTimeMinutes || 0), 0) / 60).toFixed(2),
        completedAt: new Date().toISOString()
      },
      combinedMetrics,
      totalAnalyzedConversations: combinedAnalytics.length,
      chunkResults: results,
      failedChunks: failedResults.map(r => ({ chunkIndex: r.chunkIndex, error: r.error }))
    };

    // Save final combined results
    const finalResultsPath = path.join(this.resultsDir, 'final_combined_results.json');
    fs.writeFileSync(finalResultsPath, JSON.stringify(finalResults, null, 2));
    
    // Save combined analytics separately (for potential future use)
    const combinedAnalyticsPath = path.join(this.resultsDir, 'combined_analytics.json');
    fs.writeFileSync(combinedAnalyticsPath, JSON.stringify(combinedAnalytics, null, 2));
    
    console.log('\n📊 FINAL RESULTS SUMMARY:');
    console.log(`✅ Successfully processed: ${successfulResults.length}/${summary.totalChunks} chunks`);
    console.log(`❌ Failed chunks: ${failedResults.length}`);
    console.log(`📈 Total conversations analyzed: ${combinedAnalytics.length.toLocaleString()}`);
    console.log(`⏱️  Total processing time: ${finalResults.summary.totalProcessingTimeHours} hours`);
    console.log(`📄 Final results saved: ${finalResultsPath}`);
    console.log(`📊 Combined analytics saved: ${combinedAnalyticsPath}`);
    
    if (failedResults.length > 0) {
      console.log('\n❌ FAILED CHUNKS:');
      failedResults.forEach(result => {
        console.log(`  Chunk ${result.chunkIndex}: ${result.error}`);
      });
    }
    
    return finalResults;
  }

  async restoreOriginalFile() {
    console.log('🔄 Restoring original file configuration...');
    
    const originalFile = '0d1d46c3-ea4f-4fa6-b2a0-e58ec3211ce3.json';
    const originalPath = path.join(this.dataDir, originalFile);
    const tempPath = path.join(this.dataDir, 'temp_processing.json');
    
    // Remove temp file if exists
    if (fs.existsSync(tempPath)) {
      fs.unlinkSync(tempPath);
      console.log('🗑️  Removed temporary processing file');
    }
    
    // Ensure original file is in place
    if (fs.existsSync(originalPath)) {
      console.log('✅ Original file is ready for normal operations');
    } else {
      console.log('⚠️  Warning: Original file not found');
    }
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'process';
  const baseUrl = args[1] || 'http://localhost:3008';

  const processor = new ChunkedDataProcessor(baseUrl);

  try {
    switch (command) {
      case 'process':
        console.log(`🌐 Using API base URL: ${baseUrl}`);
        console.log('⚠️  Make sure your Next.js server is running on the specified port!');
        console.log('⚠️  This process will take several hours and consume significant API credits!');
        console.log('⏳ Starting in 10 seconds... Press Ctrl+C to cancel');
        
        // 10 second delay to allow cancellation
        await new Promise(resolve => setTimeout(resolve, 10000));
        
        const results = await processor.processAllChunks();
        await processor.restoreOriginalFile();
        
        console.log('\n🎉 Chunked processing completed successfully!');
        console.log('📊 Check the data/results/ directory for detailed results');
        break;
        
      case 'restore':
        await processor.restoreOriginalFile();
        break;
        
      default:
        console.log('Usage:');
        console.log('  node process-chunked-data.js process [baseUrl]');
        console.log('  node process-chunked-data.js restore');
        console.log('');
        console.log('Examples:');
        console.log('  node process-chunked-data.js process http://localhost:3008');
        console.log('  node process-chunked-data.js restore');
        console.log('');
        console.log('Make sure to:');
        console.log('1. Run chunking first: node chunk-large-file.js chunk');
        console.log('2. Start your Next.js server: npm run dev');
        console.log('3. Then run: node process-chunked-data.js process');
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = ChunkedDataProcessor; 