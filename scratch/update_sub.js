import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const email = 'testbd181@gmail.com';
  
  // Find user
  const { data: users, error: userError } = await supabase
    .from('users')
    .select('*')
    .eq('email', email);
    
  if (userError) {
    console.error('Error finding user in "users" table:', userError);
    // try auth users?
  }
  console.log('Users found:', users);
  
  const { data: profiles, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('email', email);
    
  console.log('Profiles found:', profiles);
}

main();
