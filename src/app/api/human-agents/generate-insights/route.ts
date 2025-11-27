import { NextRequest, NextResponse } from 'next/server';
import { SupabaseDataProcessor } from '../../../../lib/supabase-data-processor';
import { getOpenAIClient, isOpenAIConfigured } from '../../../../lib/openai';

export async function POST(request: NextRequest) {
  try {
    if (!isOpenAIConfigured()) {
      return NextResponse.json({ error: 'OpenAI not configured' }, { status: 400 });
    }

    console.log('🧠 Generating aggregated Human Agent insights from 1000 conversations...');

    // 1. Fetch Data from Supabase (fetching up to 5000 to cover all recent data)
    const processor = new SupabaseDataProcessor();
    const { analytics } = await processor.getAnalytics('human', 5000);

    if (analytics.length === 0) {
      return NextResponse.json({ error: 'No human agent data found to analyze' }, { status: 404 });
    }

    // 2. Aggregate Data for Prompt
    // We extract key signals from all fetched conversations
    const allRootCauses = analytics.flatMap(a => a.rootCauses || []);
    const allCoachingOps = analytics.flatMap(a => a.coachingOpportunities || []);
    const lowQualityConvs = analytics.filter(a => a.qualityScore < 50).length;
    const avgSentiment = analytics.reduce((acc, a) => {
      if (a.sentiment === 'positive') acc.positive++;
      if (a.sentiment === 'negative') acc.negative++;
      return acc;
    }, { positive: 0, negative: 0 });

    // Sample detailed issues (random shuffle to get diverse sample)
    const shuffle = (array: string[]) => array.sort(() => 0.5 - Math.random());
    const sampleRootCauses = shuffle([...allRootCauses]).slice(0, 200).join('; ');
    const sampleCoaching = shuffle([...allCoachingOps]).slice(0, 200).join('; ');

    const prompt = `
      Analyze the performance of Human Agents based on ${analytics.length} conversation records.
      
      Statistics:
      - Total Conversations: ${analytics.length}
      - Low Quality (<50/100): ${lowQualityConvs}
      - Sentiment: ${avgSentiment.positive} Positive vs ${avgSentiment.negative} Negative
      
      Sample Root Causes of Failure:
      "${sampleRootCauses}"
      
      Sample Coaching Opportunities Identified:
      "${sampleCoaching}"

      Task:
      Identify 5 key "Trends" (patterns in agent behavior or customer issues) and 5 strategic "Recommendations" for management to improve agent performance.
      
      Format output as JSON:
      {
        "trends": ["trend 1", "trend 2", ...],
        "recommendations": ["rec 1", "rec 2", ...]
      }
    `;

    // 3. Call OpenAI
    const openai = getOpenAIClient();
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: "You are a Senior Call Center QA Analyst." },
        { role: "user", content: prompt }
      ],
      temperature: 0.7,
      response_format: { type: "json_object" }
    });

    const content = response.choices[0]?.message?.content || '{}';
    const insights = JSON.parse(content);

    return NextResponse.json({ 
      success: true, 
      insights: {
        insights: `Analysis based on ${analytics.length} conversations.`,
        trends: insights.trends || [],
        recommendations: insights.recommendations || []
      }
    });

  } catch (error: any) {
    console.error('Error generating insights:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
