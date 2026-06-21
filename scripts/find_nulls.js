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
  if (match) envVars[match[1].trim()] = match[2].trim().replace(/^['"]|['"]$/g, '').replace(/\r/g, '');
});

const supabase = createClient(envVars['VITE_SUPABASE_URL'], envVars['SUPABASE_SERVICE_ROLE_KEY']);

(async () => {
  const { data, error } = await supabase
    .from('user_decks')
    .select('*, global_dictionary(*)');
  
  if (error) {
    console.error("Query error:", error);
    return;
  }
  
  console.log("Total user decks fetched:", data.length);
  const nullRefs = data.filter(item => !item.global_dictionary);
  console.log("User decks with null global_dictionary reference:", nullRefs.length);
  nullRefs.forEach(item => {
    console.log(`  Deck ID: ${item.id}, Word ID: ${item.word_id}`);
  });
})();
