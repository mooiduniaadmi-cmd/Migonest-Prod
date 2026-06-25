import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.production') });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function check() {
  const { count, error: countError } = await supabase
    .from('service_requests')
    .select('*', { count: 'exact', head: true });

  if (countError) {
    console.error('Count Error:', countError);
  } else {
    console.log('Total service requests in DB:', count);
  }

  const { data, error } = await supabase
    .from('service_requests')
    .select('id, status, visa_status, created_at')
    .eq('student_id', '12de177f-5917-49bd-a5a3-efbfae3b21d2')
    .eq('expert_id', 'ca1c0033-9f88-4e8c-8f24-0373ab19129e');

  if (error) {
    console.error('Query Error:', error);
    process.exit(1);
  }

  console.log('Specific Results:', JSON.stringify(data, null, 2));
}

check();
