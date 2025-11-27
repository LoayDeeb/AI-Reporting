import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!; // Use Service Role Key for backend ingestion

// Warning if keys are missing
if (!supabaseUrl || !supabaseKey) {
  console.warn('⚠️ Supabase keys are missing. Database features will not work.');
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false // No session needed for backend scripts
  }
});
