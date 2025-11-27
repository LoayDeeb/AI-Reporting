import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { HumanAgentAIAnalysis } from '../../../lib/human-agent-analysis';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'analyze';
    const forceRefresh = searchParams.get('force') === 'true';
    const maxConversations = parseInt(searchParams.get('limit') || '0'); // Default to 0 = ALL conversations
    const source = searchParams.get('source') || 'auto'; // 'auto', 'json', or 'csv'

    console.log(`🚀 Human Agent API: ${action} analysis requested`);
    console.log(`⚙️ Settings: forceRefresh=${forceRefresh}, maxConversations=${maxConversations === 0 ? 'ALL' : maxConversations}, source=${source}`);

    // Use DATA_PATH env var if set, otherwise use default data dir
    const dataDir = process.env.DATA_PATH || path.join(process.cwd(), 'data');
    console.log(`📂 Using data directory: ${dataDir}`);

    const cacheFilePath = path.join(dataDir, 'human-agent-analysis-cache.json');
    const jsonFilePath = path.join(dataDir, 'human-agent-conversations.json');
    const csvFilePath = path.join(dataDir, 'messages.csv');

    // Determine data source (prefer JSON from Web AR/APP AR extraction)
    const hasJson = fs.existsSync(jsonFilePath);
    const hasCsv = fs.existsSync(csvFilePath);
    
    let useJson = false;
    if (source === 'json') {
      useJson = hasJson;
    } else if (source === 'csv') {
      useJson = false;
    } else {
      // Auto: prefer JSON (newer extraction from Web AR/APP AR)
      useJson = hasJson;
    }

    const dataFilePath = useJson ? jsonFilePath : csvFilePath;
    const dataFileExists = useJson ? hasJson : hasCsv;

    // Check if data file exists
    if (!dataFileExists) {
      return NextResponse.json({
        error: 'No human agent data available',
        message: useJson 
          ? 'human-agent-conversations.json not found. Run extraction script first.'
          : 'messages.csv file not found in data directory',
        hasData: false,
        hasJson,
        hasCsv
      }, { status: 404 });
    }

    // Check if cache exists and is valid (unless force refresh)
    if (!forceRefresh && fs.existsSync(cacheFilePath)) {
      console.log('📋 Loading cached human agent analysis...');
      const cacheData = fs.readFileSync(cacheFilePath, 'utf-8');
      const cache = JSON.parse(cacheData);
      
      // Always use cache if it exists (no expiry)
      const isValid = true;
      
      if (isValid) {
        console.log(`✅ Using cached human agent analysis (${cache.analytics.length} conversations)`);
        return NextResponse.json({
          ...cache,
          fromCache: true,
          dataSource: cache.sourceFile || 'unknown'
        });
      } else {
        console.log('⏰ Cache expired, will regenerate...');
      }
    }

    // Run new analysis
    if (action === 'analyze' || action === 'full') {
      console.log(`🔄 Running comprehensive human agent analysis from ${useJson ? 'extracted JSON' : 'CSV'}...`);
      
      const analyzer = new HumanAgentAIAnalysis();
      let analysisResult;
      
      if (useJson) {
        // Use new extracted JSON from Web AR / APP AR
        analysisResult = await analyzer.analyzeExtractedConversations(jsonFilePath, maxConversations);
      } else {
        // Fallback to CSV
        analysisResult = await analyzer.analyzeAllHumanAgentConversations(csvFilePath, maxConversations);
      }
      
      // Add source file info
      const resultWithSource = {
        ...analysisResult,
        sourceFile: useJson ? 'human-agent-conversations.json (Web AR + APP AR)' : 'messages.csv'
      };
      
      // Save to cache
      console.log('💾 Saving analysis to cache...');
      fs.writeFileSync(cacheFilePath, JSON.stringify(resultWithSource, null, 2));
      
      console.log(`✅ Analysis completed and cached! Analyzed ${analysisResult.analytics.length} conversations from ${analysisResult.total_agents} agents`);
      
      return NextResponse.json({
        ...resultWithSource,
        fromCache: false,
        dataSource: useJson ? 'Web AR + APP AR (extracted JSON)' : 'messages.csv'
      });
    }

    // Status check
    if (action === 'status') {
      const hasCache = fs.existsSync(cacheFilePath);
      
      if (hasCache) {
        const cacheData = fs.readFileSync(cacheFilePath, 'utf-8');
        const cache = JSON.parse(cacheData);
        
        return NextResponse.json({
          status: 'completed',
          hasData: true,
          hasJson,
          hasCsv,
          dataSource: cache.sourceFile || 'unknown',
          totalConversations: cache.analytics?.length || 0,
          totalAgents: cache.total_agents || 0,
          lastAnalysis: new Date(cache.timestamp).toISOString(),
          fromCache: true
        });
      }
      
      return NextResponse.json({
        status: (hasJson || hasCsv) ? 'ready_for_analysis' : 'no_data',
        hasData: false,
        hasJson,
        hasCsv,
        recommendedSource: hasJson ? 'json (Web AR + APP AR)' : (hasCsv ? 'csv' : 'none'),
        message: hasJson 
          ? 'Ready to analyze human-agent-conversations.json (Web AR + APP AR data)'
          : (hasCsv ? 'Ready to analyze messages.csv' : 'No data files found. Run extraction script first.')
      });
    }

    return NextResponse.json({
      error: 'Invalid action',
      validActions: ['analyze', 'full', 'status'],
      availableSources: { hasJson, hasCsv }
    }, { status: 400 });

  } catch (error: any) {
    console.error('❌ Human Agent API Error:', error);
    return NextResponse.json({
      error: 'Internal server error',
      message: error.message
    }, { status: 500 });
  }
} 