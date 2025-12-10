require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const client = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL, 
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function check() {
  const { data: conv, error: convErr } = await client
    .from('conversations')
    .select('*')
    .eq('source_id', '0.9191367628633225')
    .single();
  
  console.log('Conversation:', conv);
  if (convErr) console.log('Conv Error:', convErr);
  
  if (conv) {
    const { data: msgs, error: msgErr } = await client
      .from('messages')
      .select('*')
      .eq('conversation_id', conv.id)
      .order('timestamp', { ascending: true });
    
    console.log('Messages count:', msgs?.length);
    if (msgErr) console.log('Msg Error:', msgErr);
    msgs?.forEach((m, i) => console.log(i, m.sender_role, m.original_message_id, m.content?.substring(0, 50)));
  }
}

check();
