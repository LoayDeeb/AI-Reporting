#!/usr/bin/env node

const fs = require('fs').promises;
const path = require('path');
const axios = require('axios');

class FastChunkProcessor {
    constructor() {
        this.baseURL = 'http://localhost:3008';
        this.chunksDir = path.join(__dirname, 'data', 'chunks');
        this.resultsDir = path.join(__dirname, 'data', 'fast_results');
        this.progressFile = path.join(__dirname, 'data', 'fast_progress.json');
        
        this.totalChunks = 45;
        this.processedChunks = [];
        this.failedChunks = [];
        
        // Fast processing settings
        this.sampleSize = 500; // Process only 500 conversations per chunk
        this.maxConcurrency = 8; // Higher concurrency
        this.fastMode = true;
        
        this.startTime = Date.now();
    }

    async initialize() {
        console.log('🚀 Initializing FAST Chunk Processing System');
        console.log(`⚡ Sample size: ${this.sampleSize} conversations per chunk`);
        console.log(`⚡ Concurrency: ${this.maxConcurrency} chunks simultaneously`);
        console.log(`🎯 Target: Complete in under 8 hours`);
        
        // Create results directory
        try {
            await fs.mkdir(this.resultsDir, { recursive: true });
            console.log(`📂 Created results directory: ${this.resultsDir}`);
        } catch (error) {
            console.log(`📂 Results directory already exists: ${this.resultsDir}`);
        }

        // Load existing progress
        await this.loadProgress();
        
        // Calculate time estimates
        const remaining = this.totalChunks - this.processedChunks.length;
        const estimatedTimePerChunk = 8; // 8 minutes per chunk with sampling
        const totalBatches = Math.ceil(remaining / this.maxConcurrency);
        const estimatedTotalTime = totalBatches * estimatedTimePerChunk;
        
        console.log(`📊 Processing plan:`);
        console.log(`   📦 Total chunks: ${this.totalChunks}`);
        console.log(`   ✅ Already processed: ${this.processedChunks.length}`);
        console.log(`   ⏳ Remaining: ${remaining}`);
        console.log(`   📊 Batches needed: ${totalBatches}`);
        console.log(`   ⏱️  Estimated time: ${Math.round(estimatedTotalTime)} minutes (${(estimatedTotalTime/60).toFixed(1)} hours)`);
        console.log(`   🎯 Target met: ${estimatedTotalTime <= 480 ? '✅ YES' : '❌ NO'}`);
    }

    async loadProgress() {
        try {
            const progressData = await fs.readFile(this.progressFile, 'utf8');
            const progress = JSON.parse(progressData);
            
            this.processedChunks = progress.processedChunks || [];
            this.failedChunks = progress.failedChunks || [];
            
            console.log('📋 Loaded existing progress');
        } catch (error) {
            console.log('📋 No existing progress found, starting fresh');
        }
    }

    async saveProgress() {
        const progress = {
            processedChunks: this.processedChunks,
            failedChunks: this.failedChunks,
            lastUpdated: new Date().toISOString(),
            totalChunks: this.totalChunks,
            sampleSize: this.sampleSize,
            maxConcurrency: this.maxConcurrency,
            processingStats: {
                totalProcessed: this.processedChunks.length,
                totalFailed: this.failedChunks.length,
                successRate: `${((this.processedChunks.length / (this.processedChunks.length + this.failedChunks.length)) * 100).toFixed(1)}%`,
                elapsedTimeMinutes: Math.round((Date.now() - this.startTime) / 60000)
            }
        };

        await fs.writeFile(this.progressFile, JSON.stringify(progress, null, 2));
    }

    async processChunkFast(chunkIndex) {
        const chunkFile = `conversations_chunk_${chunkIndex.toString().padStart(3, '0')}.json`;
        const chunkPath = path.join(this.chunksDir, chunkFile);
        const resultFile = `fast_result_chunk_${chunkIndex.toString().padStart(3, '0')}.json`;
        const resultPath = path.join(this.resultsDir, resultFile);

        console.log(`🔄 [Fast-${chunkIndex}] Processing: ${chunkFile}`);
        
        try {
            // Check if already processed
            if (this.processedChunks.includes(chunkIndex)) {
                console.log(`✅ [Fast-${chunkIndex}] Already processed, skipping`);
                return { success: true, skipped: true, chunkIndex };
            }

            // Load and sample chunk data
            const chunkData = await fs.readFile(chunkPath, 'utf8');
            const allConversations = JSON.parse(chunkData);
            
            // Smart sampling - take conversations from different parts of the chunk
            const sampleConversations = this.smartSample(allConversations, this.sampleSize);
            
            console.log(`📊 [Fast-${chunkIndex}] Sampled ${sampleConversations.length}/${allConversations.length} conversations`);

            // Process with ultra-fast API call
            console.log(`🚀 [Fast-${chunkIndex}] Starting fast API analysis...`);
            const startTime = Date.now();
            
            const response = await axios.post(`${this.baseURL}/api/analyze`, {
                action: 'fast-insights', // Use fastest analysis mode
                fastMode: true,
                ultraFast: true,
                chunkIndex: chunkIndex,
                totalChunks: this.totalChunks,
                conversations: sampleConversations,
                sampleSize: this.sampleSize,
                originalSize: allConversations.length,
                isFastProcessing: true
            }, {
                timeout: 600000, // 10 minute timeout
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            const processingTime = Math.round((Date.now() - startTime) / 1000);
            console.log(`✅ [Fast-${chunkIndex}] Completed in ${processingTime}s`);

            // Save result with sampling info
            const result = {
                chunkIndex: chunkIndex,
                chunkFile: chunkFile,
                originalConversationCount: allConversations.length,
                sampledConversationCount: sampleConversations.length,
                sampleRatio: `${((sampleConversations.length / allConversations.length) * 100).toFixed(1)}%`,
                processingTimeSeconds: processingTime,
                processedAt: new Date().toISOString(),
                apiResponse: response.data,
                isFastProcessing: true,
                processingMode: 'ultra-fast-sampling'
            };

            await fs.writeFile(resultPath, JSON.stringify(result, null, 2));

            return { 
                success: true, 
                processingTime: processingTime,
                conversationCount: allConversations.length,
                sampledCount: sampleConversations.length,
                chunkIndex: chunkIndex,
                result: result
            };

        } catch (error) {
            console.error(`❌ [Fast-${chunkIndex}] Error:`, error.message);
            
            return { 
                success: false, 
                error: error.message,
                chunkIndex: chunkIndex
            };
        }
    }

    smartSample(conversations, sampleSize) {
        if (conversations.length <= sampleSize) {
            return conversations;
        }

        // Take samples from beginning, middle, and end to get representative data
        const step = Math.floor(conversations.length / sampleSize);
        const sampled = [];
        
        for (let i = 0; i < sampleSize; i++) {
            const index = Math.min(i * step, conversations.length - 1);
            sampled.push(conversations[index]);
        }

        return sampled;
    }

    async processAllChunksFast() {
        console.log('\n🚀 Starting ULTRA-FAST Chunk Processing');
        console.log(`⚡ Processing ${this.maxConcurrency} chunks simultaneously`);
        console.log(`📊 Sampling ${this.sampleSize} conversations per chunk`);
        
        const startTime = Date.now();
        const remainingChunks = [];
        
        // Get list of chunks that need processing
        for (let i = 0; i < this.totalChunks; i++) {
            if (!this.processedChunks.includes(i)) {
                remainingChunks.push(i);
            }
        }

        console.log(`📊 Processing ${remainingChunks.length} remaining chunks`);
        
        // Process chunks in batches
        const batches = [];
        for (let i = 0; i < remainingChunks.length; i += this.maxConcurrency) {
            batches.push(remainingChunks.slice(i, i + this.maxConcurrency));
        }

        console.log(`📦 Created ${batches.length} batches of up to ${this.maxConcurrency} chunks each`);

        let totalSuccess = this.processedChunks.length;
        let totalFailed = this.failedChunks.length;
        let totalSampled = 0;
        let totalOriginal = 0;

        for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
            const batch = batches[batchIndex];
            console.log(`\n🔥 Processing Batch ${batchIndex + 1}/${batches.length}: Chunks [${batch.join(', ')}]`);
            
            // Process all chunks in this batch simultaneously
            const batchPromises = batch.map(chunkIndex => this.processChunkFast(chunkIndex));
            const batchResults = await Promise.allSettled(batchPromises);
            
            // Process results
            for (let i = 0; i < batchResults.length; i++) {
                const result = batchResults[i];
                const chunkIndex = batch[i];
                
                if (result.status === 'fulfilled' && result.value.success) {
                    if (!result.value.skipped && !this.processedChunks.includes(chunkIndex)) {
                        this.processedChunks.push(chunkIndex);
                        totalSuccess++;
                        if (result.value.conversationCount) {
                            totalOriginal += result.value.conversationCount;
                            totalSampled += result.value.sampledCount;
                        }
                    }
                    console.log(`✅ Batch ${batchIndex + 1}: Chunk ${chunkIndex} completed`);
                } else {
                    const error = result.status === 'rejected' ? result.reason : result.value.error;
                    this.failedChunks.push({
                        chunkIndex: chunkIndex,
                        error: error,
                        failedAt: new Date().toISOString(),
                        batchIndex: batchIndex + 1
                    });
                    totalFailed++;
                    console.log(`❌ Batch ${batchIndex + 1}: Chunk ${chunkIndex} failed: ${error}`);
                }
            }

            await this.saveProgress();

            // Progress update
            const elapsed = Math.round((Date.now() - startTime) / 60000);
            const completedBatches = batchIndex + 1;
            const totalBatches = batches.length;
            const remainingBatches = totalBatches - completedBatches;
            const estimatedRemaining = remainingBatches * 8; // 8 minutes per batch
            
            console.log(`📊 Batch ${completedBatches}/${totalBatches} complete`);
            console.log(`📈 Progress: ${totalSuccess} success, ${totalFailed} failed`);
            console.log(`⏱️  Elapsed: ${elapsed}min, Estimated remaining: ${estimatedRemaining}min`);
            console.log(`🎯 On track for 8-hour target: ${(elapsed + estimatedRemaining) <= 480 ? '✅ YES' : '❌ NO'}`);

            // Minimal delay between batches
            if (batchIndex < batches.length - 1) {
                console.log(`⏸️  Waiting 3 seconds before next batch...`);
                await new Promise(resolve => setTimeout(resolve, 3000));
            }
        }

        // Final summary
        const totalTime = Math.round((Date.now() - startTime) / 60000);
        const totalHours = (totalTime / 60).toFixed(1);
        
        console.log('\n🎉 ULTRA-FAST PROCESSING COMPLETE!');
        console.log(`📊 Final Results:`);
        console.log(`   ✅ Successful: ${totalSuccess}/${this.totalChunks}`);
        console.log(`   ❌ Failed: ${totalFailed}/${this.totalChunks}`);
        console.log(`   ⏱️  Total time: ${totalTime} minutes (${totalHours} hours)`);
        console.log(`   📊 Total conversations: ${totalOriginal.toLocaleString()}`);
        console.log(`   📊 Sampled conversations: ${totalSampled.toLocaleString()}`);
        console.log(`   📊 Sample ratio: ${((totalSampled / totalOriginal) * 100).toFixed(1)}%`);
        console.log(`   ⚡ Speed improvement: ${((49.5 * 60) / totalTime).toFixed(1)}x faster than sequential`);
        console.log(`   🎯 8-hour target: ${totalTime <= 480 ? '✅ MET!' : '❌ EXCEEDED'}`);
        console.log(`   📁 Results saved in: ${this.resultsDir}`);

        return {
            totalChunks: this.totalChunks,
            successCount: totalSuccess,
            failureCount: totalFailed,
            totalTimeMinutes: totalTime,
            totalHours: parseFloat(totalHours),
            targetMet: totalTime <= 480,
            speedImprovement: ((49.5 * 60) / totalTime).toFixed(1),
            totalConversations: totalOriginal,
            sampledConversations: totalSampled,
            sampleRatio: ((totalSampled / totalOriginal) * 100).toFixed(1),
            resultsDirectory: this.resultsDir
        };
    }
}

async function main() {
    const args = process.argv.slice(2);
    const sampleSize = parseInt(args[0]) || 500;
    
    console.log(`🚀 Starting ULTRA-FAST Processing`);
    console.log(`⚡ Sample size: ${sampleSize} conversations per chunk`);
    console.log(`🎯 Target: Complete 45 chunks in under 8 hours`);
    
    const processor = new FastChunkProcessor();
    processor.sampleSize = sampleSize;
    
    try {
        await processor.initialize();
        const results = await processor.processAllChunksFast();
        
        console.log(`\n🎯 FINAL TARGET CHECK:`);
        console.log(`   ⏱️  Actual time: ${results.totalHours} hours`);
        console.log(`   🎯 Target time: 8 hours`);
        console.log(`   📊 Result: ${results.targetMet ? '✅ TARGET MET!' : '❌ Target exceeded'}`);
        console.log(`   📈 Data coverage: ${results.sampleRatio}% of conversations analyzed`);
        
    } catch (error) {
        console.error('❌ Fatal error:', error.message);
        process.exit(1);
    }
}

if (require.main === module) {
    main().catch(console.error);
}

module.exports = FastChunkProcessor; 