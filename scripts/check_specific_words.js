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

const supabase = createClient(
  envVars['VITE_SUPABASE_URL'],
  envVars['SUPABASE_SERVICE_ROLE_KEY']
);

async function checkSpecificWords() {
  const words = ['assumption', 'beach', 'boat', 'carry', 'drive', 'lion', 'sentence', 'subject', 'vacation', 'window'];
  const { data, error } = await supabase
    .from('global_dictionary')
    .select('word, video_url')
    .in('word', words);

  if (error) {
    console.error(error);
  } else {
    console.log("Details of checked words:");
    data.forEach(d => {
      const url = d.video_url || '';
      const status = url.startsWith('data:image/svg') ? 'SVG' : (url ? url.substring(0, 30) : 'EMPTY');
      console.log(`  "${d.word}": ${status}`);
    });
  }
}
checkSpecificWords();
