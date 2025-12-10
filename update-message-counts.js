require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function updateMessageCounts() {
  console.log('🔍 Fetching message counts per conversation...');
  
  // Get actual message counts from messages table
  const { data: counts, error: countError } = await supabase
    .rpc('get_message_counts_by_conversation');
  
  if (countError) {
    console.log('RPC not available, using manual aggregation...');
    
    // Fallback: fetch all conversations and update one by one
    const BATCH_SIZE = 1000;
    let offset = 0;
    let hasMore = true;
    let updated = 0;
    
    while (hasMore) {
      const { data: conversations, error } = await supabase
        .from('conversations')
        .select('id')
        .range(offset, offset + BATCH_SIZE - 1);
      
      if (error || !conversations || conversations.length === 0) {
        hasMore = false;
        continue;
      }
      
      console.log(`Processing batch ${Math.floor(offset/BATCH_SIZE) + 1}...`);
      
      for (const conv of conversations) {
        const { count } = await supabase
          .from('messages')
          .select('*', { count: 'exact', head: true })
          .eq('conversation_id', conv.id);
        
        if (count !== null) {
          await supabase
            .from('conversations')
            .update({ message_count: count })
            .eq('id', conv.id);
          updated++;
        }
      }
      
      offset += conversations.length;
      hasMore = conversations.length === BATCH_SIZE;
      console.log(`  Updated ${updated} conversations...`);
    }
    
    console.log(`✅ Updated message counts for ${updated} conversations`);
  } else {
    console.log(`Found ${counts.length} conversation counts via RPC`);
  }
  
  // Verify the specific conversation
  const { data: conv } = await supabase
    .from('conversations')
    .select('id, source_id, message_count')
    .eq('source_id', '0.9191367628633225')
    .single();
  
  console.log(`\n📋 Sender 0.9191367628633225 message_count: ${conv?.message_count}`);
}

updateMessageCounts().catch(console.error);
