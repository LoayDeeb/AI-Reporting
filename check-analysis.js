require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function main() {
  // Get analyzed AI conversations
  const { data: aiConvs, error: aiError } = await supabase
    .from('conversations')
    .select('id, source_id, quality_score, sentiment, sentiment_score, topics, was_transferred_to_agent, transfer_reason')
    .eq('source_type', 'ai')
    .not('quality_score', 'is', null)
    .gt('quality_score', 0)  // Only get ones that were properly analyzed
    .limit(3);
  
  if (aiError) {
    console.error('Error:', aiError);
    return;
  }
  
  console.log('\n=== ANALYZED AI CONVERSATIONS ===');
  console.log(JSON.stringify(aiConvs, null, 2));
  
  // Also fetch one conversation's messages
  if (aiConvs && aiConvs.length > 0) {
    const convId = aiConvs[0].id;
    const { data: msgs, error: msgError } = await supabase
      .from('messages')
      .select('sender_role, content')
      .eq('conversation_id', convId)
      .order('timestamp', { ascending: true })
      .limit(10);
    
    if (msgError) {
      console.error('Message error:', msgError);
    } else {
      console.log('\n=== SAMPLE CONVERSATION MESSAGES ===');
      console.log('Conversation ID:', convId);
      msgs.forEach(m => {
        const preview = m.content?.substring(0, 150) || '';
        console.log(`[${m.sender_role}]: ${preview}...`);
      });
    }
  }
}

main().catch(console.error);
