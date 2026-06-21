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

async function decodeSuccess() {
  const { data, error } = await supabase
    .from('global_dictionary')
    .select('word, video_url')
    .in('word', ['access', 'amendment']);
  
  if (error) {
    console.error(error);
  } else {
    data.forEach(d => {
      const url = d.video_url || '';
      const cleanUrl = url.startsWith('approved:') ? url.substring('approved:'.length) : url;
      if (cleanUrl.startsWith('data:image/svg+xml;base64,')) {
        const base64 = cleanUrl.substring('data:image/svg+xml;base64,'.length);
        const decoded = Buffer.from(base64, 'base64').toString('utf8');
        console.log(`\n--- SVG for "${d.word}": ---`);
        console.log(decoded.substring(0, 300));
        console.log("------------------------");
      }
    });
  }
}
decodeSuccess();
