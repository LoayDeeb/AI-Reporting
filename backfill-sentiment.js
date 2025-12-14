require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const OpenAI = require('openai');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function backfillSentiments() {
  console.log('🔄 Starting sentiment backfill for human agent conversations...\n');

  // Get human conversations without initial/final sentiment
  const { data: conversations, error } = await supabase
    .from('conversations')
    .select('id, source_id')
    .eq('source_type', 'human')
    .or('initial_sentiment.is.null,final_sentiment.is.null')
    .limit(500);

  if (error) {
    console.error('Error fetching conversations:', error);
    return;
  }

  console.log(`Found ${conversations.length} conversations to analyze\n`);

  let processed = 0;
  let errors = 0;

  for (const conv of conversations) {
    try {
      // Fetch messages
      const { data: messages } = await supabase
        .from('messages')
        .select('content, sender_role, timestamp')
        .eq('conversation_id', conv.id)
        .order('timestamp', { ascending: true });

      if (!messages || messages.length === 0) continue;

      const conversationText = messages
        .filter(m => m.content?.trim())
        .map(m => `${m.sender_role}: ${m.content}`)
        .join('\n')
        .substring(0, 3000);

      // Analyze with OpenAI
      const response = await openai.chat.completions.create({
        model: 'gpt-4.1-mini',
        messages: [
          {
            role: 'system',
            content: `Analyze this customer service conversation and determine the customer's sentiment at the start and end.

Return JSON: {"initialSentiment": "positive|neutral|negative", "finalSentiment": "positive|neutral|negative"}

Focus only on customer messages to determine their mood/satisfaction level.`
          },
          { role: 'user', content: conversationText }
        ],
        response_format: { type: 'json_object' },
        max_tokens: 100,
        temperature: 0.1,
      });

      const result = JSON.parse(response.choices[0].message.content);

      // Update database
      await supabase
        .from('conversations')
        .update({
          initial_sentiment: result.initialSentiment || 'neutral',
          final_sentiment: result.finalSentiment || 'neutral'
        })
        .eq('id', conv.id);

      processed++;
      if (processed % 10 === 0) {
        console.log(`✅ Processed ${processed}/${conversations.length}`);
      }

      // Rate limit
      await new Promise(r => setTimeout(r, 100));

    } catch (err) {
      errors++;
      console.error(`❌ Error processing ${conv.id}:`, err.message);
    }
  }

  console.log(`\n✅ Backfill complete: ${processed} processed, ${errors} errors`);
}

backfillSentiments().catch(console.error);
