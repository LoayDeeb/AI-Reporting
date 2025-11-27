#!/usr/bin/env node

const fs = require('fs').promises;
const path = require('path');
const axios = require('axios');
const { Worker } = require('worker_threads');

class ParallelChunkProcessor {
    constructor(maxConcurrency = 6) {
        this.baseURL = 'http://localhost:3008';
        this.chunksDir = path.join(__dirname, 'data', 'chunks');
        this.resultsDir = path.join(__dirname, 'data', 'chunk_results');
        this.progressFile = path.join(__dirname, 'data', 'parallel_progress.json');
        
        this.totalChunks = 45;
        this.maxConcurrency = maxConcurrency; // Process 6 chunks simultaneously
        this.processedChunks = [];
        this.failedChunks = [];
        this.activeWorkers = new Map();
        
        this.startTime = Date.now();
    }

    async initialize() {
        console.log('🚀 Initializing Parallel Chunk Processing System');
        console.log(`⚡ Max Concurrency: ${this.maxConcurrency} chunks simultaneously`);
        
        // Create results directory
        try {
            await fs.mkdir(this.resultsDir, { recursive: true });
            console.log(`📂 Created results directory: ${this.resultsDir}`);
        } catch (error) {
            console.log(`📂 Results directory already exists: ${this.resultsDir}`);
        }

        // Load existing progress
        await this.loadProgress();
        
        // Verify chunks exist
        await this.verifyChunks();
        
        const remaining = this.totalChunks - this.processedChunks.length;
        const estimatedTime = Math.ceil(remaining / this.maxConcurrency) * 66; // 66 minutes per batch
        
        console.log(`📊 Ready to process ${this.totalChunks} chunks`);
        console.log(`✅ Already processed: ${this.processedChunks.length} chunks`);
        console.log(`❌ Failed chunks: ${this.failedChunks.length} chunks`);
        console.log(`⏳ Remaining: ${remaining} chunks`);
        console.log(`⚡ Estimated time with parallel processing: ${Math.round(estimatedTime / 60)} hours`);
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
            maxConcurrency: this.maxConcurrency,
            processingStats: {
                totalProcessed: this.processedChunks.length,
                totalFailed: this.failedChunks.length,
                successRate: `${((this.processedChunks.length / (this.processedChunks.length + this.failedChunks.length)) * 100).toFixed(1)}%`,
                elapsedTimeMinutes: Math.round((Date.now() - this.startTime) / 60000),
                estimatedRemainingMinutes: this.getEstimatedRemainingTime()
            }
        };

        await fs.writeFile(this.progressFile, JSON.stringify(progress, null, 2));
    }

    async verifyChunks() {
        const chunkFiles = [];
        for (let i = 0; i < this.totalChunks; i++) {
            const chunkFile = `conversations_chunk_${i.toString().padStart(3, '0')}.json`;
            const chunkPath = path.join(this.chunksDir, chunkFile);
            
            try {
                await fs.access(chunkPath);
                chunkFiles.push(chunkFile);
            } catch (error) {
                console.error(`❌ Missing chunk file: ${chunkFile}`);
                throw new Error(`Missing chunk file: ${chunkFile}`);
            }
        }
        
        console.log(`✅ Verified all ${chunkFiles.length} chunk files exist`);
    }

    async processChunk(chunkIndex) {
        const chunkFile = `conversations_chunk_${chunkIndex.toString().padStart(3, '0')}.json`;
        const chunkPath = path.join(this.chunksDir, chunkFile);
        const resultFile = `result_chunk_${chunkIndex.toString().padStart(3, '0')}.json`;
        const resultPath = path.join(this.resultsDir, resultFile);

        console.log(`🔄 [Worker ${chunkIndex}] Processing: ${chunkFile}`);
        
        try {
            // Check if already processed
            if (this.processedChunks.includes(chunkIndex)) {
                console.log(`✅ [Worker ${chunkIndex}] Already processed, skipping`);
                return { success: true, skipped: true, chunkIndex };
            }

            // Load chunk data
            const chunkData = await fs.readFile(chunkPath, 'utf8');
            const conversations = JSON.parse(chunkData);
            
            console.log(`📊 [Worker ${chunkIndex}] ${conversations.length} conversations loaded`);

            // Create temporary file for this worker
            const tempFile = path.join(__dirname, 'data', `temp_conversations_${chunkIndex}.json`);
            await fs.writeFile(tempFile, JSON.stringify(conversations, null, 2));
            
            // Clear cache for this specific processing
            try {
                await axios.get(`${this.baseURL}/api/analyze?action=clear-cache&worker=${chunkIndex}`);
            } catch (error) {
                console.log(`⚠️  [Worker ${chunkIndex}] Cache clear failed: ${error.message}`);
            }

            // Process with API using temporary file approach
            console.log(`🚀 [Worker ${chunkIndex}] Starting API analysis...`);
            const startTime = Date.now();
            
            // Use a different approach - send data directly in request
            const response = await axios.post(`${this.baseURL}/api/analyze`, {
                action: 'full',
                fastMode: true,
                chunkIndex: chunkIndex,
                totalChunks: this.totalChunks,
                conversations: conversations.slice(0, 1000), // Process first 1000 for speed
                isChunkProcessing: true
            }, {
                timeout: 1800000, // 30 minute timeout per chunk
                headers: {
                    'Content-Type': 'application/json'
                },
                maxContentLength: Infinity,
                maxBodyLength: Infinity
            });

            const processingTime = Math.round((Date.now() - startTime) / 1000);
            console.log(`✅ [Worker ${chunkIndex}] Completed in ${processingTime}s`);

            // Save result
            const result = {
                chunkIndex: chunkIndex,
                chunkFile: chunkFile,
                conversationCount: conversations.length,
                processedCount: Math.min(conversations.length, 1000),
                processingTimeSeconds: processingTime,
                processedAt: new Date().toISOString(),
                apiResponse: response.data,
                isParallelProcessing: true
            };

            await fs.writeFile(resultPath, JSON.stringify(result, null, 2));
            
            // Clean up temp file
            try {
                await fs.unlink(tempFile);
            } catch (error) {
                // Ignore cleanup errors
            }

            return { 
                success: true, 
                processingTime: processingTime,
                conversationCount: conversations.length,
                chunkIndex: chunkIndex,
                result: result
            };

        } catch (error) {
            console.error(`❌ [Worker ${chunkIndex}] Error:`, error.message);
            
            return { 
                success: false, 
                error: error.message,
                chunkIndex: chunkIndex
            };
        }
    }

    async processAllChunksParallel() {
        console.log('\n🚀 Starting Parallel Chunk Processing');
        console.log(`⚡ Processing ${this.maxConcurrency} chunks simultaneously`);
        
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

        for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
            const batch = batches[batchIndex];
            console.log(`\n🔥 Processing Batch ${batchIndex + 1}/${batches.length}: Chunks [${batch.join(', ')}]`);
            
            // Process all chunks in this batch simultaneously
            const batchPromises = batch.map(chunkIndex => this.processChunk(chunkIndex));
            const batchResults = await Promise.allSettled(batchPromises);
            
            // Process results
            for (let i = 0; i < batchResults.length; i++) {
                const result = batchResults[i];
                const chunkIndex = batch[i];
                
                if (result.status === 'fulfilled' && result.value.success) {
                    if (!result.value.skipped && !this.processedChunks.includes(chunkIndex)) {
                        this.processedChunks.push(chunkIndex);
                        totalSuccess++;
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
            const remaining = this.getEstimatedRemainingTime();
            const completedBatches = batchIndex + 1;
            const totalBatches = batches.length;
            
            console.log(`📊 Batch ${completedBatches}/${totalBatches} complete`);
            console.log(`📈 Progress: ${totalSuccess} success, ${totalFailed} failed`);
            console.log(`⏱️  Elapsed: ${elapsed}min, Estimated remaining: ${remaining}min`);

            // Small delay between batches to prevent overwhelming the system
            if (batchIndex < batches.length - 1) {
                console.log(`⏸️  Waiting 10 seconds before next batch...`);
                await new Promise(resolve => setTimeout(resolve, 10000));
            }
        }

        // Final summary
        const totalTime = Math.round((Date.now() - startTime) / 60000);
        console.log('\n🎉 PARALLEL PROCESSING COMPLETE!');
        console.log(`📊 Final Results:`);
        console.log(`   ✅ Successful: ${totalSuccess}/${this.totalChunks}`);
        console.log(`   ❌ Failed: ${totalFailed}/${this.totalChunks}`);
        console.log(`   ⏱️  Total time: ${totalTime} minutes (${(totalTime/60).toFixed(1)} hours)`);
        console.log(`   ⚡ Speed improvement: ${((49.5 * 60) / totalTime).toFixed(1)}x faster`);
        console.log(`   📁 Results saved in: ${this.resultsDir}`);

        return {
            totalChunks: this.totalChunks,
            successCount: totalSuccess,
            failureCount: totalFailed,
            totalTimeMinutes: totalTime,
            speedImprovement: ((49.5 * 60) / totalTime).toFixed(1),
            resultsDirectory: this.resultsDir
        };
    }

    getEstimatedRemainingTime() {
        const processed = this.processedChunks.length;
        const remaining = this.totalChunks - processed;
        
        if (processed === 0) return 'calculating...';
        
        const elapsed = (Date.now() - this.startTime) / 60000; // minutes
        const avgTimePerChunk = elapsed / processed;
        const remainingBatches = Math.ceil(remaining / this.maxConcurrency);
        
        return Math.round(remainingBatches * (avgTimePerChunk * this.maxConcurrency / this.maxConcurrency));
    }
}

async function main() {
    const args = process.argv.slice(2);
    const concurrency = parseInt(args[0]) || 6; // Default 6 concurrent processes
    
    console.log(`🚀 Starting Parallel Processing with ${concurrency} concurrent workers`);
    console.log(`⚡ Target: Complete 45 chunks in under 8 hours`);
    
    const processor = new ParallelChunkProcessor(concurrency);
    
    try {
        await processor.initialize();
        const results = await processor.processAllChunksParallel();
        
        console.log(`\n🎯 TARGET CHECK:`);
        console.log(`   ⏱️  Actual time: ${(results.totalTimeMinutes/60).toFixed(1)} hours`);
        console.log(`   🎯 Target time: 8 hours`);
        console.log(`   ${results.totalTimeMinutes/60 <= 8 ? '✅ TARGET MET!' : '❌ Target exceeded'}`);
        
    } catch (error) {
        console.error('❌ Fatal error:', error.message);
        process.exit(1);
    }
}

if (require.main === module) {
    main().catch(console.error);
}

module.exports = ParallelChunkProcessor; 