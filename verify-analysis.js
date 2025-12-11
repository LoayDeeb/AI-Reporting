require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function main() {
  // Get one AI conversation with transfer
  const { data: aiConv } = await supabase
    .from('conversations')
    .select('id, source_id, quality_score, sentiment, topics, transfer_reason, was_transferred_to_agent')
    .eq('source_type', 'ai')
    .eq('was_transferred_to_agent', true)
    .gt('quality_score', 0)
    .limit(1)
    .single();
  
  console.log('========================================');
  console.log('AI CONVERSATION WITH TRANSFER');
  console.log('========================================');
  console.log('Analysis:', JSON.stringify(aiConv, null, 2));
  
  const { data: aiMsgs } = await supabase
    .from('messages')
    .select('sender_role, content')
    .eq('conversation_id', aiConv.id)
    .order('timestamp', { ascending: true });
  
  console.log('\nActual Messages:');
  aiMsgs.forEach(m => {
    const content = (m.content || '').substring(0, 200);
    console.log(`[${m.sender_role}]: ${content}`);
  });

  // Get one human agent conversation
  const { data: humanConv } = await supabase
    .from('conversations')
    .select('id, source_id, quality_score, empathy_score, sentiment, root_causes, coaching_opportunities, resolution_status')
    .eq('source_type', 'human')
    .gt('quality_score', 0)
    .limit(1)
    .single();
  
  console.log('\n========================================');
  console.log('HUMAN AGENT CONVERSATION');
  console.log('========================================');
  console.log('Analysis:', JSON.stringify(humanConv, null, 2));
  
  const { data: humanMsgs } = await supabase
    .from('messages')
    .select('sender_role, content')
    .eq('conversation_id', humanConv.id)
    .order('timestamp', { ascending: true });
  
  console.log('\nActual Messages:');
  humanMsgs.forEach(m => {
    const content = (m.content || '').substring(0, 200);
    console.log(`[${m.sender_role}]: ${content}`);
  });
}

main().catch(console.error);
