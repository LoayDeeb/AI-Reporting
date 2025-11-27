import { NextRequest, NextResponse } from 'next/server';
import { DataProcessor } from '../../../lib/data-processor';
import { isOpenAIConfigured, generateCompletion } from '../../../lib/openai';

export async function POST(request: NextRequest) {
  try {
    if (!isOpenAIConfigured()) {
      return NextResponse.json({ error: 'OpenAI not configured' }, { status: 400 });
    }

    const body = await request.json();
    const { topic, examples } = body;

    if (!topic || !examples || examples.length === 0) {
      return NextResponse.json({ error: 'Missing topic or examples' }, { status: 400 });
    }

    console.log(`📚 Generating knowledge base entry for topic: ${topic}`);

    const prompt = `
      You are a Knowledge Base Architect. Your goal is to create a concise, helpful FAQ entry or System Prompt to resolve a specific user issue that the chatbot is currently failing to handle.

      TOPIC: ${topic}

      Here are 3-5 examples of user queries where the bot failed (Knowledge Gap):
      ${examples.map((ex: string, i: number) => `${i+1}. "${ex}"`).join('\n')}

      Please generate:
      1. A clear "User Intent" definition.
      2. A "Recommended Bot Response" (the solution).
      3. A short "System Instruction" to add to the bot's prompt to handle this future cases.

      Format the output as JSON with keys: intent, response, system_instruction.
    `;

    const completion = await generateCompletion(prompt);
    
    // Parse JSON from the completion
    const jsonMatch = completion?.match(/\{[\s\S]*\}/);
    const result = jsonMatch ? JSON.parse(jsonMatch[0]) : { 
      intent: topic, 
      response: completion, 
      system_instruction: "Update knowledge base." 
    };

    return NextResponse.json({ success: true, suggestion: result });

  } catch (error) {
    console.error('Error generating KB entry:', error);
    return NextResponse.json({ error: 'Failed to generate content' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  // Get list of knowledge gaps to populate the UI
  try {
    const processor = new DataProcessor();
    const cache = await processor.loadCache();
    
    if (!cache?.analytics) {
      return NextResponse.json({ gaps: [] });
    }

    // Aggregate knowledge gaps
    const gapMap = new Map<string, string[]>();
    
    cache.analytics.forEach((conv: any) => {
      if (conv.knowledgeGaps && conv.knowledgeGaps.length > 0) {
        conv.knowledgeGaps.forEach((gap: string) => {
          // Collect example user messages for this gap
          // (Simplified: we don't have message-level mapping in analytics summary, 
          // so we'll use the 'intent' or generic placeholders if message text isn't preserved in analytics)
          // Ideally, we would pull real user quotes here.
          const existing = gapMap.get(gap) || [];
          if (existing.length < 5) {
            existing.push(`User query regarding ${gap}`); 
          }
          gapMap.set(gap, existing);
        });
      }
    });

    const gaps = Array.from(gapMap.entries()).map(([gap, examples]) => ({
      topic: gap,
      count: 10, // Placeholder count or real aggregation
      examples
    })).slice(0, 10); // Top 10 gaps

    return NextResponse.json({ gaps });

  } catch (error) {
    console.error('Error fetching gaps:', error);
    return NextResponse.json({ error: 'Failed to fetch gaps' }, { status: 500 });
  }
}
