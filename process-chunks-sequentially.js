#!/usr/bin/env node

const fs = require('fs').promises;
const path = require('path');
const axios = require('axios');

class ChunkProcessor {
    constructor() {
        this.baseURL = 'http://localhost:3008'; // Your Next.js app port
        this.chunksDir = path.join(__dirname, 'data', 'chunks');
        this.resultsDir = path.join(__dirname, 'data', 'chunk_results');
        this.progressFile = path.join(__dirname, 'data', 'processing_progress.json');
        
        this.totalChunks = 45;
        this.processedChunks = [];
        this.failedChunks = [];
        this.currentChunk = 0;
        
        this.startTime = Date.now();
    }

    async initialize() {
        console.log('🚀 Initializing Chunk Processing System');
        
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
        
        console.log(`📊 Ready to process ${this.totalChunks} chunks`);
        console.log(`✅ Already processed: ${this.processedChunks.length} chunks`);
        console.log(`❌ Failed chunks: ${this.failedChunks.length} chunks`);
        console.log(`⏳ Remaining: ${this.totalChunks - this.processedChunks.length} chunks`);
    }

    async loadProgress() {
        try {
            const progressData = await fs.readFile(this.progressFile, 'utf8');
            const progress = JSON.parse(progressData);
            
            this.processedChunks = progress.processedChunks || [];
            this.failedChunks = progress.failedChunks || [];
            this.currentChunk = progress.currentChunk || 0;
            
            console.log('📋 Loaded existing progress');
        } catch (error) {
            console.log('📋 No existing progress found, starting fresh');
        }
    }

    async saveProgress() {
        const progress = {
            processedChunks: this.processedChunks,
            failedChunks: this.failedChunks,
            currentChunk: this.currentChunk,
            lastUpdated: new Date().toISOString(),
            totalChunks: this.totalChunks,
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

        console.log(`\n🔄 Processing Chunk ${chunkIndex}: ${chunkFile}`);
        
        try {
            // Check if already processed
            if (this.processedChunks.includes(chunkIndex)) {
                console.log(`✅ Chunk ${chunkIndex} already processed, skipping`);
                return { success: true, skipped: true };
            }

            // Load chunk data
            console.log(`📖 Loading chunk data...`);
            const chunkData = await fs.readFile(chunkPath, 'utf8');
            const conversations = JSON.parse(chunkData);
            
            console.log(`📊 Chunk ${chunkIndex}: ${conversations.length} conversations`);

            // Temporarily replace the main conversations file
            const originalFile = path.join(__dirname, 'data', 'conversations.json');
            const backupFile = path.join(__dirname, 'data', 'conversations_backup.json');
            
            // Backup original if it exists
            try {
                await fs.access(originalFile);
                await fs.copyFile(originalFile, backupFile);
                console.log(`💾 Backed up original conversations.json`);
            } catch (error) {
                console.log(`📝 No original conversations.json to backup`);
            }

            // Write chunk as temporary conversations.json
            await fs.writeFile(originalFile, JSON.stringify(conversations, null, 2));
            console.log(`📝 Temporarily replaced conversations.json with chunk data`);

            // Clear cache first
            console.log(`🧹 Clearing cache...`);
            try {
                await axios.get(`${this.baseURL}/api/analyze?action=clear-cache`);
                console.log(`✅ Cache cleared`);
            } catch (error) {
                console.log(`⚠️  Cache clear failed (continuing anyway): ${error.message}`);
            }

            // Process with API
            console.log(`🚀 Starting API analysis...`);
            const startTime = Date.now();
            
            const response = await axios.post(`${this.baseURL}/api/analyze`, {
                action: 'full',
                fastMode: true,
                chunkIndex: chunkIndex,
                totalChunks: this.totalChunks
            }, {
                timeout: 3600000, // 1 hour timeout
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            const processingTime = Math.round((Date.now() - startTime) / 1000);
            console.log(`✅ API analysis completed in ${processingTime}s`);

            // Save result
            const result = {
                chunkIndex: chunkIndex,
                chunkFile: chunkFile,
                conversationCount: conversations.length,
                processingTimeSeconds: processingTime,
                processedAt: new Date().toISOString(),
                apiResponse: response.data
            };

            await fs.writeFile(resultPath, JSON.stringify(result, null, 2));
            console.log(`💾 Saved result: ${resultFile}`);

            // Restore original file
            try {
                await fs.access(backupFile);
                await fs.copyFile(backupFile, originalFile);
                await fs.unlink(backupFile);
                console.log(`🔄 Restored original conversations.json`);
            } catch (error) {
                await fs.unlink(originalFile);
                console.log(`🗑️  Removed temporary conversations.json`);
            }

            return { 
                success: true, 
                processingTime: processingTime,
                conversationCount: conversations.length,
                result: result
            };

        } catch (error) {
            console.error(`❌ Error processing chunk ${chunkIndex}:`, error.message);
            
            // Try to restore original file on error
            try {
                const backupFile = path.join(__dirname, 'data', 'conversations_backup.json');
                const originalFile = path.join(__dirname, 'data', 'conversations.json');
                await fs.access(backupFile);
                await fs.copyFile(backupFile, originalFile);
                await fs.unlink(backupFile);
                console.log(`🔄 Restored original conversations.json after error`);
            } catch (restoreError) {
                console.log(`⚠️  Could not restore original file: ${restoreError.message}`);
            }

            return { 
                success: false, 
                error: error.message,
                chunkIndex: chunkIndex
            };
        }
    }

    async processAllChunks() {
        console.log('\n🚀 Starting Sequential Chunk Processing');
        console.log(`📊 Total chunks to process: ${this.totalChunks}`);
        
        const startTime = Date.now();
        let successCount = 0;
        let failureCount = 0;

        for (let i = 0; i < this.totalChunks; i++) {
            // Skip if already processed
            if (this.processedChunks.includes(i)) {
                console.log(`⏭️  Skipping chunk ${i} (already processed)`);
                successCount++;
                continue;
            }

            console.log(`\n📍 Progress: ${i + 1}/${this.totalChunks} (${((i + 1) / this.totalChunks * 100).toFixed(1)}%)`);
            
            const result = await this.processChunk(i);
            
            if (result.success) {
                if (!result.skipped) {
                    this.processedChunks.push(i);
                    successCount++;
                    console.log(`✅ Chunk ${i} processed successfully`);
                } else {
                    successCount++;
                }
            } else {
                this.failedChunks.push({
                    chunkIndex: i,
                    error: result.error,
                    failedAt: new Date().toISOString()
                });
                failureCount++;
                console.log(`❌ Chunk ${i} failed: ${result.error}`);
            }

            this.currentChunk = i + 1;
            await this.saveProgress();

            // Progress summary
            const elapsed = Math.round((Date.now() - startTime) / 60000);
            const remaining = this.getEstimatedRemainingTime();
            console.log(`📊 Progress: ${successCount} success, ${failureCount} failed, ${elapsed}min elapsed, ~${remaining}min remaining`);

            // Small delay between chunks to prevent overwhelming the system
            if (i < this.totalChunks - 1) {
                console.log(`⏸️  Waiting 5 seconds before next chunk...`);
                await new Promise(resolve => setTimeout(resolve, 5000));
            }
        }

        // Final summary
        const totalTime = Math.round((Date.now() - startTime) / 60000);
        console.log('\n🎉 PROCESSING COMPLETE!');
        console.log(`📊 Final Results:`);
        console.log(`   ✅ Successful: ${successCount}/${this.totalChunks}`);
        console.log(`   ❌ Failed: ${failureCount}/${this.totalChunks}`);
        console.log(`   ⏱️  Total time: ${totalTime} minutes`);
        console.log(`   📁 Results saved in: ${this.resultsDir}`);

        if (failureCount > 0) {
            console.log(`\n⚠️  Failed chunks can be retried by running this script again`);
        }

        return {
            totalChunks: this.totalChunks,
            successCount: successCount,
            failureCount: failureCount,
            totalTimeMinutes: totalTime,
            resultsDirectory: this.resultsDir
        };
    }

    getEstimatedRemainingTime() {
        const processed = this.processedChunks.length;
        const remaining = this.totalChunks - processed;
        
        if (processed === 0) return 'calculating...';
        
        const elapsed = (Date.now() - this.startTime) / 60000; // minutes
        const avgTimePerChunk = elapsed / processed;
        
        return Math.round(remaining * avgTimePerChunk);
    }

    async retryFailedChunks() {
        if (this.failedChunks.length === 0) {
            console.log('✅ No failed chunks to retry');
            return;
        }

        console.log(`🔄 Retrying ${this.failedChunks.length} failed chunks`);
        
        const failedIndices = this.failedChunks.map(f => f.chunkIndex);
        this.failedChunks = []; // Clear failed list for retry
        
        for (const chunkIndex of failedIndices) {
            // Remove from processed list to force reprocessing
            this.processedChunks = this.processedChunks.filter(i => i !== chunkIndex);
            
            console.log(`\n🔄 Retrying chunk ${chunkIndex}`);
            const result = await this.processChunk(chunkIndex);
            
            if (result.success) {
                this.processedChunks.push(chunkIndex);
                console.log(`✅ Retry successful for chunk ${chunkIndex}`);
            } else {
                this.failedChunks.push({
                    chunkIndex: chunkIndex,
                    error: result.error,
                    failedAt: new Date().toISOString(),
                    retryAttempt: true
                });
                console.log(`❌ Retry failed for chunk ${chunkIndex}: ${result.error}`);
            }

            await this.saveProgress();
            
            // Delay between retries
            await new Promise(resolve => setTimeout(resolve, 10000)); // 10 second delay
        }
    }
}

async function main() {
    const args = process.argv.slice(2);
    const command = args[0] || 'process';

    const processor = new ChunkProcessor();
    
    try {
        await processor.initialize();

        switch (command) {
            case 'process':
                await processor.processAllChunks();
                break;
            
            case 'retry':
                await processor.retryFailedChunks();
                break;
            
            case 'status':
                console.log('📊 Current Processing Status:');
                console.log(`   ✅ Processed: ${processor.processedChunks.length}/${processor.totalChunks}`);
                console.log(`   ❌ Failed: ${processor.failedChunks.length}`);
                console.log(`   ⏳ Remaining: ${processor.totalChunks - processor.processedChunks.length}`);
                break;
            
            default:
                console.log('Usage:');
                console.log('  node process-chunks-sequentially.js process  # Process all chunks');
                console.log('  node process-chunks-sequentially.js retry    # Retry failed chunks');
                console.log('  node process-chunks-sequentially.js status   # Show current status');
        }

    } catch (error) {
        console.error('❌ Fatal error:', error.message);
        process.exit(1);
    }
}

if (require.main === module) {
    main().catch(console.error);
}

module.exports = ChunkProcessor; 