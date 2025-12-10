require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function fetchAllMessages() {
  const BATCH_SIZE = 1000;
  let allMessages = [];
  let offset = 0;
  let hasMore = true;
  
  while (hasMore) {
    const { data, error } = await supabase
      .from('messages')
      .select('id, original_message_id, conversation_id, content')
      .order('original_message_id')
      .range(offset, offset + BATCH_SIZE - 1);
    
    if (error) {
      console.error('Error fetching batch:', error);
      break;
    }
    
    if (data && data.length > 0) {
      allMessages = allMessages.concat(data);
      offset += data.length;
      console.log(`  Fetched ${allMessages.length} messages...`);
      hasMore = data.length === BATCH_SIZE;
    } else {
      hasMore = false;
    }
  }
  
  return allMessages;
}

async function fixDuplicates() {
  console.log('🔍 Finding duplicate messages...');
  
  const messages = await fetchAllMessages();
  const error = null;
  
  if (error) {
    console.error('Error fetching messages:', error);
    return;
  }
  
  console.log(`📊 Total messages: ${messages.length}`);
  
  // Group by conversation_id and content to find duplicates
  const duplicateGroups = new Map();
  
  for (const msg of messages) {
    // Create a key based on conversation_id + content hash
    const key = `${msg.conversation_id}::${msg.content?.substring(0, 100) || ''}`;
    if (!duplicateGroups.has(key)) {
      duplicateGroups.set(key, []);
    }
    duplicateGroups.get(key).push(msg);
  }
  
  // Find groups with more than one message (duplicates)
  const duplicatesToDelete = [];
  let duplicateCount = 0;
  
  for (const [key, msgs] of duplicateGroups) {
    if (msgs.length > 1) {
      duplicateCount++;
      // Keep the first one (shortest ID usually), delete the rest
      const sorted = msgs.sort((a, b) => a.original_message_id.length - b.original_message_id.length);
      for (let i = 1; i < sorted.length; i++) {
        duplicatesToDelete.push(sorted[i].id);
      }
      if (duplicateCount <= 5) {
        console.log(`  Duplicate group: ${msgs.map(m => m.original_message_id).join(', ')}`);
      }
    }
  }
  
  console.log(`\n🔴 Found ${duplicateCount} duplicate groups`);
  console.log(`🗑️  Messages to delete: ${duplicatesToDelete.length}`);
  
  if (duplicatesToDelete.length === 0) {
    console.log('✅ No duplicates to fix!');
    return;
  }
  
  // Delete duplicates in batches
  const BATCH_SIZE = 500;
  let deleted = 0;
  
  for (let i = 0; i < duplicatesToDelete.length; i += BATCH_SIZE) {
    const batch = duplicatesToDelete.slice(i, i + BATCH_SIZE);
    const { error: deleteError } = await supabase
      .from('messages')
      .delete()
      .in('id', batch);
    
    if (deleteError) {
      console.error(`Error deleting batch ${i / BATCH_SIZE + 1}:`, deleteError);
    } else {
      deleted += batch.length;
      console.log(`  Deleted batch ${Math.floor(i / BATCH_SIZE) + 1}: ${batch.length} messages`);
    }
  }
  
  console.log(`\n✅ Deleted ${deleted} duplicate messages`);
  
  // Verify the specific conversation
  const { data: checkMsgs } = await supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', 'bc0d8d30-8443-44aa-ab1e-9dbb9bc01fb5');
  
  console.log(`\n📋 Messages for sender 0.9191367628633225: ${checkMsgs?.length || 0}`);
}

fixDuplicates().catch(console.error);
