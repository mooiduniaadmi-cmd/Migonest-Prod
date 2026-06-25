import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function main() {
  const email = 'testbd181@gmail.com';
  
  const { data, error } = await supabase
    .from('profiles')
    .update({
      is_subscribed: false,
      subscription_id: 'sub_expired_demo',
      current_period_end: Math.floor(Date.now() / 1000) - 86400, // 1 day ago
      cancel_at_period_end: true
    })
    .eq('email', email)
    .select();
    
  console.log('Update result:', data, error);
}
main();
