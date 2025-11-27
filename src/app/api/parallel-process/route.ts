import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs/promises';

interface ParallelProcessStatus {
  isRunning: boolean;
  progress?: {
    processedChunks: number[];
    failedChunks: any[];
    totalChunks: number;
    elapsedTimeMinutes?: number;
    estimatedRemainingMinutes?: number;
    successRate?: string;
  };
  error?: string;
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const action = searchParams.get('action');

    switch (action) {
      case 'status':
        return await getProcessingStatus();
      
      case 'logs':
        return await getProcessingLogs();
      
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Error in parallel process GET:', error);
    return NextResponse.json(
      { error: 'Failed to get status', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, concurrency = 6, method = 'parallel' } = body;

    switch (action) {
      case 'start':
        return await startParallelProcessing(concurrency, method);
      
      case 'stop':
        return await stopParallelProcessing();
      
      case 'retry':
        return await retryFailedChunks();
      
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Error in parallel process POST:', error);
    return NextResponse.json(
      { error: 'Failed to process request', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

async function getProcessingStatus(): Promise<NextResponse> {
  try {
    const projectRoot = process.cwd();
    const progressFile = path.join(projectRoot, 'data', 'parallel_progress.json');
    
    // Check if processing is currently running by looking for active processes
    const isRunning = await checkIfProcessRunning();
    
    let progress = null;
    try {
      const progressData = await fs.readFile(progressFile, 'utf8');
      progress = JSON.parse(progressData);
    } catch (error) {
      // Progress file doesn't exist or is invalid
    }

    const status: ParallelProcessStatus = {
      isRunning,
      progress: progress?.processingStats ? {
        processedChunks: progress.processedChunks || [],
        failedChunks: progress.failedChunks || [],
        totalChunks: progress.totalChunks || 45,
        elapsedTimeMinutes: progress.processingStats.elapsedTimeMinutes,
        estimatedRemainingMinutes: progress.processingStats.estimatedRemainingMinutes,
        successRate: progress.processingStats.successRate
      } : undefined
    };

    return NextResponse.json(status);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to get status', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

async function getProcessingLogs(): Promise<NextResponse> {
  try {
    const projectRoot = process.cwd();
    const logFile = path.join(projectRoot, 'parallel_processing.log');
    
    try {
      const logs = await fs.readFile(logFile, 'utf8');
      const logLines = logs.split('\n').slice(-100); // Last 100 lines
      return NextResponse.json({ logs: logLines });
    } catch (error) {
      return NextResponse.json({ logs: ['No logs available yet'] });
    }
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to get logs', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

async function startParallelProcessing(concurrency: number, method: string): Promise<NextResponse> {
  try {
    // Check if already running
    const isRunning = await checkIfProcessRunning();
    if (isRunning) {
      return NextResponse.json(
        { error: 'Parallel processing is already running' },
        { status: 400 }
      );
    }

    // For now, return instructions to run manually
    // This avoids the module resolution issues in Next.js
    const commands = {
      parallel: `node process-chunks-parallel.js ${concurrency}`,
      fast: `node process-chunks-fast.js 500`,
      hybrid: `node process-chunks-fast.js 1000`
    };

    return NextResponse.json({
      success: true,
      message: `To start ${method} processing, run this command in your terminal:`,
      command: commands[method as keyof typeof commands] || commands.parallel,
      method,
      concurrency,
      estimatedTime: method === 'fast' ? '4 hours' : method === 'hybrid' ? '6 hours' : '8 hours',
      instructions: [
        '1. Open a terminal in your project directory',
        `2. Run: ${commands[method as keyof typeof commands] || commands.parallel}`,
        '3. The process will run in the background and update progress files',
        '4. Use the "Show Logs" button to monitor progress'
      ]
    });

  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to start parallel processing', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

async function stopParallelProcessing(): Promise<NextResponse> {
  try {
    const projectRoot = process.cwd();
    const pidFile = path.join(projectRoot, 'parallel_processing.pid');
    
    try {
      const pidData = await fs.readFile(pidFile, 'utf8');
      const pid = parseInt(pidData.trim());
      
      if (pid) {
        // Kill the process
        process.kill(pid, 'SIGTERM');
        
        // Clean up PID file
        await fs.unlink(pidFile);
        
        // Log the stop
        const logFile = path.join(projectRoot, 'parallel_processing.log');
        const stopTime = new Date().toISOString();
        await fs.appendFile(logFile, `\n🛑 [${stopTime}] Parallel processing stopped by user\n`);
        
        return NextResponse.json({
          success: true,
          message: 'Parallel processing stopped successfully'
        });
      }
    } catch (error) {
      // PID file doesn't exist or process not found
    }

    return NextResponse.json({
      success: true,
      message: 'No active parallel processing found'
    });

  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to stop parallel processing', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

async function retryFailedChunks(): Promise<NextResponse> {
  try {
    return NextResponse.json({
      success: true,
      message: 'To retry failed chunks, run: node process-chunks-parallel.js retry',
      command: 'node process-chunks-parallel.js retry',
      instructions: [
        '1. Open a terminal in your project directory',
        '2. Run: node process-chunks-parallel.js retry',
        '3. This will retry only the failed chunks'
      ]
    });

  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to retry failed chunks', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

async function checkIfProcessRunning(): Promise<boolean> {
  try {
    const projectRoot = process.cwd();
    const pidFile = path.join(projectRoot, 'parallel_processing.pid');
    
    try {
      const pidData = await fs.readFile(pidFile, 'utf8');
      const pid = parseInt(pidData.trim());
      
      if (pid) {
        // Check if process is still running
        try {
          process.kill(pid, 0); // Signal 0 just checks if process exists
          return true;
        } catch (error) {
          // Process doesn't exist, clean up PID file
          await fs.unlink(pidFile);
          return false;
        }
      }
    } catch (error) {
      // PID file doesn't exist
      return false;
    }

    return false;
  } catch (error) {
    return false;
  }
} 