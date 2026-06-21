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

async function decodeBroken() {
  const { data, error } = await supabase
    .from('global_dictionary')
    .select('word, video_url')
    .in('word', ['abundance', 'absence', 'academic']);
  
  if (error) {
    console.error(error);
  } else {
    data.forEach(d => {
      const url = d.video_url || '';
      if (url.startsWith('data:image/svg+xml;base64,')) {
        const base64 = url.substring('data:image/svg+xml;base64,'.length);
        const decoded = Buffer.from(base64, 'base64').toString('utf8');
        console.log(`\n--- SVG for "${d.word}": ---`);
        console.log(decoded.substring(0, 300));
        console.log("------------------------");
      } else {
        console.log(`"${d.word}": not base64 SVG`);
      }
    });
  }
}
decodeBroken();
