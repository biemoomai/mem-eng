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
  console.log('Creating public storage bucket "vocab-memes"...');
  
  const { data, error } = await supabase.storage.createBucket('vocab-memes', {
    public: true,
    allowedMimeTypes: ['image/png', 'image/jpeg', 'image/webp'],
    fileSizeLimit: 1048576 // 1MB
  });

  if (error) {
    if (error.message.includes('already exists')) {
      console.log('✅ Bucket "vocab-memes" already exists.');
    } else {
      console.error('❌ Error creating bucket:', error);
    }
  } else {
    console.log('✅ Success! Created public bucket:', data);
  }
})();
