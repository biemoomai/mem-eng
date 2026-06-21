import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const envPath = path.join(__dirname, '../.env.local');
const envFile = fs.readFileSync(envPath, 'utf8');
const envVars = {};
envFile.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) envVars[match[1].trim()] = match[2].trim().replace(/^['"]|['"]$/g, '');
});

const supabase = createClient(envVars['VITE_SUPABASE_URL'], envVars['VITE_SUPABASE_ANON_KEY']);

(async () => {
  console.log('Signing up a temporary bot user...');
  const email = `adminbot${Date.now()}@gmail.com`;
  const password = 'botpassword123';
  
  const { data: authData, error: authError } = await supabase.auth.signUp({ email, password });
  if (authError) {
    console.log('Signup failed:', authError.message);
  } else {
    console.log('Logged in as:', authData.user?.email);
  }

  // Now try to read
  const { data, error } = await supabase.from('global_dictionary').select('id, word, meaning').limit(2);
  console.log('Sample data (Read):', data);
  if (error) console.log('Read Error:', error);

  if (data && data.length > 0) {
    const { error: updateError } = await supabase.from('global_dictionary').update({ meaning: 'Definition pending.' }).eq('id', data[0].id);
    if (updateError) {
      console.log('Update Error (RLS blocks updates?):', updateError.message);
    } else {
      console.log('Update Success! RLS allows authenticated users to update global_dictionary.');
    }
  }
})();
