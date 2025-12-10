require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function main() {
  // Get a sample AI conversation
  const { data: conv } = await supabase
    .from('conversations')
    .select('id, source_id, message_count')
    .eq('source_type', 'ai')
    .gt('message_count', 5)
    .limit(1)
    .single();
  
  if (!conv) {
    console.log('No conversation found');
    return;
  }
  
  console.log(`\n📋 Sample AI Conversation: ${conv.source_id}`);
  console.log(`   Message count: ${conv.message_count}`);
  
  // Get messages ordered by sequence_number
  const { data: messages } = await supabase
    .from('messages')
    .select('sequence_number, sender_role, content')
    .eq('conversation_id', conv.id)
    .order('sequence_number', { ascending: true });
  
  console.log(`\n=== Messages (ordered by sequence_number) ===\n`);
  
  messages?.forEach((msg, i) => {
    const role = msg.sender_role.padEnd(5);
    const text = (msg.content || '').substring(0, 50);
    console.log(`  [#${msg.sequence_number}] ${role} | ${text}`);
  });
  
  // Verify no human agent messages in AI conversation
  const humanSender = messages?.filter(m => m.sender_role === 'agent');
  if (humanSender?.length > 0) {
    console.log(`\n⚠️ WARNING: Found ${humanSender.length} agent messages in AI conversation!`);
  } else {
    console.log(`\n✅ No human agent messages in AI conversation (correct!)`);
  }
  
  // Check a human conversation too
  const { data: humanConv } = await supabase
    .from('conversations')
    .select('id, source_id, message_count')
    .eq('source_type', 'human')
    .gt('message_count', 5)
    .limit(1)
    .single();
  
  if (humanConv) {
    console.log(`\n\n📋 Sample Human Conversation: ${humanConv.source_id}`);
    
    const { data: humanMsgs } = await supabase
      .from('messages')
      .select('sequence_number, sender_role, content')
      .eq('conversation_id', humanConv.id)
      .order('sequence_number', { ascending: true })
      .limit(10);
    
    console.log(`\n=== First 10 Messages ===\n`);
    humanMsgs?.forEach(msg => {
      const role = msg.sender_role.padEnd(5);
      const text = (msg.content || '').substring(0, 50);
      console.log(`  [#${msg.sequence_number}] ${role} | ${text}`);
    });
    
    // Verify no bot messages
    const botMsgs = humanMsgs?.filter(m => m.sender_role === 'bot');
    if (botMsgs?.length > 0) {
      console.log(`\n⚠️ WARNING: Found ${botMsgs.length} bot messages in human conversation!`);
    } else {
      console.log(`\n✅ No bot messages in human conversation (correct!)`);
    }
  }
}

main().catch(console.error);
