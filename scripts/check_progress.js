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

const supabase = createClient(
  envVars['VITE_SUPABASE_URL'],
  envVars['SUPABASE_SERVICE_ROLE_KEY']
);

(async () => {
  const { count: nullExamples } = await supabase
    .from('global_dictionary')
    .select('id', { count: 'exact', head: true })
    .or('example.is.null,example.eq.');

  console.log(`❌ Words with NO example (NULL or empty): ${nullExamples}`);
  
  const { data: sample } = await supabase
    .from('global_dictionary')
    .select('word, meaning, example')
    .or('example.is.null,example.eq.')
    .limit(5);
    
  console.log(`\nSample words with NO example:`);
  sample?.forEach(w => console.log(`  "${w.word}": meaning="${w.meaning?.substring(0, 30)}..." example=${w.example}`));
})();
