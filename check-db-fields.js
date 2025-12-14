const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://bmtjwpdkjxzmdiviioki.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseKey) {
  console.error('Please set SUPABASE_SERVICE_ROLE_KEY environment variable');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  console.log('Checking database fields for human conversations...\n');
  
  // Sample data
  const { data, error } = await supabase
    .from('conversations')
    .select('id, initial_sentiment, final_sentiment, sentiment, was_transferred_to_agent, transfer_reason')
    .eq('source_type', 'human')
    .limit(10);
  
  if (error) {
    console.error('Error:', error);
    return;
  }
  
  console.log('Sample data (10 rows):');
  data.forEach((row, i) => console.log(`${i+1}:`, JSON.stringify(row)));
  
  // Count total
  const { count: totalCount } = await supabase
    .from('conversations')
    .select('*', { count: 'exact', head: true })
    .eq('source_type', 'human');
  
  // Count with initial_sentiment
  const { count: initialSentimentCount } = await supabase
    .from('conversations')
    .select('*', { count: 'exact', head: true })
    .eq('source_type', 'human')
    .not('initial_sentiment', 'is', null);
  
  // Count with final_sentiment
  const { count: finalSentimentCount } = await supabase
    .from('conversations')
    .select('*', { count: 'exact', head: true })
    .eq('source_type', 'human')
    .not('final_sentiment', 'is', null);
    
  // Count with was_transferred_to_agent=true
  const { count: transferCount } = await supabase
    .from('conversations')
    .select('*', { count: 'exact', head: true })
    .eq('source_type', 'human')
    .eq('was_transferred_to_agent', true);
    
  // Count with transfer_reason not null and not empty
  const { count: reasonCount } = await supabase
    .from('conversations')
    .select('*', { count: 'exact', head: true })
    .eq('source_type', 'human')
    .not('transfer_reason', 'is', null)
    .neq('transfer_reason', '');
    
  console.log('\n=== COUNTS ===');
  console.log('Total human conversations:', totalCount);
  console.log('With initial_sentiment:', initialSentimentCount);
  console.log('With final_sentiment:', finalSentimentCount);
  console.log('With was_transferred_to_agent=true:', transferCount);
  console.log('With transfer_reason (non-empty):', reasonCount);
  
  // Sample transfer_reasons
  const { data: reasons } = await supabase
    .from('conversations')
    .select('transfer_reason')
    .eq('source_type', 'human')
    .not('transfer_reason', 'is', null)
    .neq('transfer_reason', '')
    .limit(20);
    
  console.log('\n=== Sample transfer_reasons ===');
  if (reasons) {
    const uniqueReasons = [...new Set(reasons.map(r => r.transfer_reason))];
    uniqueReasons.forEach((r, i) => console.log(`${i+1}:`, r));
  }
}

check();
