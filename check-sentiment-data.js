require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function main() {
  // Get human conversations with sentiment data
  const { data, error } = await supabase
    .from('conversations')
    .select('*')
    .eq('source_type', 'human')
    .limit(5);

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('\n=== HUMAN AGENT - ALL COLUMNS ===');
  if (data && data.length > 0) {
    console.log('Available columns:', Object.keys(data[0]));
    console.log('\nFirst record:', JSON.stringify(data[0], null, 2));
  }
}

main().catch(console.error);
