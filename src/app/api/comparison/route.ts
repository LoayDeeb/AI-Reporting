import { NextRequest, NextResponse } from 'next/server';
import { DataProcessor } from '../../../lib/data-processor';
import fs from 'fs';
import path from 'path';

export async function GET(request: NextRequest) {
  try {
    console.log('⚖️ Generating Human vs AI Comparison Data...');

    // 1. Load AI Data (Web AR / Zainjo)
    const dataProcessor = new DataProcessor();
    const aiCache = await dataProcessor.loadCache();
    
    // 2. Load Human Agent Data
    const humanCachePath = path.join(process.cwd(), 'data', 'human-agent-analysis-cache.json');
    let humanData = { analytics: [] };
    if (fs.existsSync(humanCachePath)) {
      humanData = JSON.parse(fs.readFileSync(humanCachePath, 'utf-8'));
    }

    if (!aiCache?.analytics || !humanData?.analytics) {
      return NextResponse.json({
        error: 'Missing analysis data. Please run both AI and Human Agent analysis first.'
      }, { status: 404 });
    }

    // 3. Calculate Metrics
    const aiMetrics = calculateMetrics(aiCache.analytics, 'AI (Web AR)');
    const humanMetrics = calculateMetrics(humanData.analytics, 'Human Agents');

    // 4. Comparison Logic
    const comparison = {
      ai: aiMetrics,
      human: humanMetrics,
      insights: generateComparisonInsights(aiMetrics, humanMetrics),
      topicBreakdown: compareTopics(aiCache.analytics, humanData.analytics)
    };

    return NextResponse.json(comparison);

  } catch (error) {
    console.error('Error generating comparison:', error);
    return NextResponse.json({ error: 'Failed to generate comparison' }, { status: 500 });
  }
}

function calculateMetrics(analytics: any[], type: string) {
  const total = analytics.length;
  if (total === 0) return null;

  const totalQuality = analytics.reduce((sum, a) => sum + (a.qualityScore || a.quality_score || 0), 0);
  const totalEmpathy = analytics.reduce((sum, a) => sum + (a.empathyScore || a.empathy_score || 0), 0);
  const totalSentiment = analytics.reduce((acc, a) => {
    const sentiment = (a.sentiment || a.final_sentiment || 'neutral').toLowerCase();
    if (sentiment === 'positive') acc.positive++;
    else if (sentiment === 'negative') acc.negative++;
    else acc.neutral++;
    return acc;
  }, { positive: 0, neutral: 0, negative: 0 });

  // Calculate Resolution Rate (Simple approximation if not explicit)
  // For AI: Quality > 60
  // For Human: Resolution Time is not null OR Quality > 60
  const resolvedCount = analytics.filter(a => {
    const quality = a.qualityScore || a.quality_score || 0;
    const hasResolutionTime = a.resolution_time !== null && a.resolution_time !== undefined;
    return quality >= 60 || hasResolutionTime;
  }).length;

  return {
    type,
    totalConversations: total,
    avgQuality: Math.round(totalQuality / total),
    avgEmpathy: Math.round(totalEmpathy / total),
    resolutionRate: Math.round((resolvedCount / total) * 100),
    sentimentDistribution: {
      positive: Math.round((totalSentiment.positive / total) * 100),
      neutral: Math.round((totalSentiment.neutral / total) * 100),
      negative: Math.round((totalSentiment.negative / total) * 100),
    }
  };
}

function compareTopics(aiAnalytics: any[], humanAnalytics: any[]) {
  // Normalize topics/intents
  const getTopics = (list: any[], isHuman: boolean) => {
    const topicCounts: Record<string, { count: number, qualitySum: number }> = {};
    
    list.forEach(a => {
      // Human has 'categories', AI has 'intents' or 'topics'
      const topics = isHuman ? a.categories : (a.intents || a.topics || []);
      const quality = a.qualityScore || a.quality_score || 0;

      topics?.forEach((t: string) => {
        if (!topicCounts[t]) topicCounts[t] = { count: 0, qualitySum: 0 };
        topicCounts[t].count++;
        topicCounts[t].qualitySum += quality;
      });
    });

    return Object.entries(topicCounts).map(([topic, data]) => ({
      topic,
      count: data.count,
      avgQuality: Math.round(data.qualitySum / data.count)
    }));
  };

  const aiTopics = getTopics(aiAnalytics, false);
  const humanTopics = getTopics(humanAnalytics, true);

  // Find overlapping topics for direct comparison
  const commonTopics = aiTopics.filter(at => humanTopics.some(ht => ht.topic === at.topic))
    .map(at => {
      const ht = humanTopics.find(h => h.topic === at.topic)!;
      return {
        topic: at.topic,
        aiQuality: at.avgQuality,
        humanQuality: ht.avgQuality,
        volumeAi: at.count,
        volumeHuman: ht.count,
        winner: at.avgQuality > ht.avgQuality ? 'AI' : 'Human'
      };
    })
    .sort((a, b) => (b.volumeAi + b.volumeHuman) - (a.volumeAi + a.volumeHuman)) // Sort by total volume
    .slice(0, 10); // Top 10 comparisons

  return commonTopics;
}

function generateComparisonInsights(ai: any, human: any) {
  const insights = [];
  
  if (ai.avgQuality > human.avgQuality) {
    insights.push(`🤖 AI outperforms Human Agents in overall quality by ${ai.avgQuality - human.avgQuality} points.`);
  } else {
    insights.push(`👤 Human Agents maintain a ${human.avgQuality - ai.avgQuality} point quality lead over the AI.`);
  }

  if (human.avgEmpathy > ai.avgEmpathy + 10) {
    insights.push(`❤️ Humans show significantly higher empathy (${human.avgEmpathy} vs ${ai.avgEmpathy}), suggesting the AI needs "soft skills" tuning.`);
  }

  if (ai.resolutionRate > human.resolutionRate) {
    insights.push(`⚡ AI is resolving queries more effectively (${ai.resolutionRate}% vs ${human.resolutionRate}%), likely due to handling simpler transactional queries.`);
  }

  return insights;
}
