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
  // Let's get the user ID first
  const { data: { users }, error: userError } = await supabase.auth.admin.listUsers();
  if (userError) {
    console.log('Error listing users:', userError);
  }
  
  // Just query all rows from user_decks
  const { data, error } = await supabase
    .from('user_decks')
    .select('*, global_dictionary(*)');
    
  console.log('User decks count:', data ? data.length : 0);
  if (data && data.length > 0) {
    console.log('First 5 deck items:', data.slice(0, 5).map(item => ({
      id: item.id,
      word: item.global_dictionary ? item.global_dictionary.word : 'No global dict row!',
      video_url: item.global_dictionary ? item.global_dictionary.video_url : null,
      word_id: item.word_id
    })));
  }
  if (error) console.log('Error:', error);
})();
