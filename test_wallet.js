const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config({ path: '/Users/mohammadwahedulhaque/Migonest-Prod/.env.staging' });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function test() {
  const { data, error } = await supabase.from('wallet_entries').insert({
    profile_id: 'd9b99616-d3a1-4d1e-9279-7a552271da92', // Dummy UUID
    amount: 10,
    type: 'UNLOCK',
    description: `Test`,
    status: 'COMPLETED',
    request_id: 'd9b99616-d3a1-4d1e-9279-7a552271da92',
    counterparty_id: 'd9b99616-d3a1-4d1e-9279-7a552271da92',
    counterparty_name: 'Test',
    counterparty_role: 'STUDENT',
    counterparty_avatar_url: 'http://test.com',
    university: 'Migonest Admission',
    country: 'Global'
  });
  console.log('Insert Result:', { data, error });
}
test();
