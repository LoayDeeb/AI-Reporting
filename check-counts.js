const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Parse .env.local manually
const envFile = fs.readFileSync(path.join(__dirname, '.env.local'), 'utf8');
const envVars = {};
envFile.split('\n').forEach(line => {
  const [key, ...valueParts] = line.split('=');
  if (key && valueParts.length > 0) {
    envVars[key.trim()] = valueParts.join('=').trim();
  }
});

const supabase = createClient(
  envVars.NEXT_PUBLIC_SUPABASE_URL,
  envVars.SUPABASE_SERVICE_ROLE_KEY
);

async function check() {
  console.log('Checking database counts...\n');
  
  // Count by source_type
  const { count: aiCount, error: aiErr } = await supabase
    .from('conversations')
    .select('*', { count: 'exact', head: true })
    .eq('source_type', 'ai');
    
  const { count: humanCount, error: humanErr } = await supabase
    .from('conversations')
    .select('*', { count: 'exact', head: true })
    .eq('source_type', 'human');
  
  // Get distinct agents for human conversations  
  const { data: humanConvs, error: agentErr } = await supabase
    .from('conversations')
    .select('agent_name')
    .eq('source_type', 'human');
  
  if (aiErr) console.log('AI Error:', aiErr.message);
  if (humanErr) console.log('Human Error:', humanErr.message);
  if (agentErr) console.log('Agent Error:', agentErr.message);
  
  const agents = [...new Set(humanConvs?.map(c => c.agent_name).filter(Boolean) || [])];
  
  console.log('=== Conversation Counts ===');
  console.log('AI/Chatbot conversations:', aiCount);
  console.log('Human agent conversations:', humanCount);
  console.log('\n=== Agents ===');
  console.log('Distinct agents:', agents.length);
  if (agents.length > 0) {
    console.log('Agent names:', agents.slice(0, 20).join(', '));
  }
  
  // Check sample human conversation to see structure
  const { data: sample } = await supabase
    .from('conversations')
    .select('*')
    .eq('source_type', 'human')
    .limit(1);
  
  console.log('\n=== Sample Human Conversations ===');
  sample?.forEach((c, i) => {
    console.log(`\n[${i+1}] ID: ${c.id}`);
    console.log('  source_id:', c.source_id);
    console.log('  agent_name:', c.agent_name);
    console.log('  customer_name:', c.customer_name);
    console.log('  message_count:', c.message_count);
  });
  
  // Check messages from a human conversation for agent info
  if (sample && sample.length > 0) {
    const { data: messages } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', sample[0].id)
      .limit(5);
    
    console.log('\n=== Sample Messages (Human Conv) ===');
    messages?.forEach((m, i) => {
      console.log(`\n[${i+1}] sender_role: ${m.sender_role}, content: ${(m.content || '').substring(0, 50)}...`);
    });
  }
  
  // Count distinct agents by sender_role in messages
  const { data: agentMessages } = await supabase
    .from('messages')
    .select('sender_role')
    .in('conversation_id', (await supabase.from('conversations').select('id').eq('source_type', 'human')).data?.map(c => c.id) || [])
    .eq('sender_role', 'agent');
  
  console.log('\n=== Agent Messages Count ===');
  console.log('Messages with sender_role=agent:', agentMessages?.length || 0);
  
  // Check distinct sender_roles
  const { data: roles } = await supabase
    .from('messages')
    .select('sender_role');
  const distinctRoles = [...new Set(roles?.map(r => r.sender_role).filter(Boolean) || [])];
  console.log('Distinct sender_roles:', distinctRoles);
}

check().catch(console.error);
