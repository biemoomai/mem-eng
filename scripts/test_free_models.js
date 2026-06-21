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

const HF_TOKEN = envVars['VITE_HUGGINGFACE_API_KEY'];

const models = [
  "stabilityai/sd-turbo",
  "segmind/SSD-1B",
  "cyberdelia/CyberRealistic",
  "stabilityai/sdxl-turbo"
];

(async () => {
  for (const model of models) {
    const url = `https://router.huggingface.co/hf-inference/models/${model}`;
    console.log(`Testing model "${model}" at: ${url}...`);
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${HF_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ inputs: "a simple black and white line art doodle of a dog" })
      });

      console.log(`  Response: ${response.status} ${response.statusText}`);
      if (response.status === 200) {
        console.log(`  ✅ SUCCESS! Model "${model}" is supported.`);
        const blob = await response.blob();
        console.log(`  Type: ${blob.type}, Size: ${blob.size} bytes`);
      } else {
        const text = await response.text();
        console.log(`  ❌ FAIL:`, text.substring(0, 150));
      }
    } catch (err) {
      console.error(`  ❌ Error:`, err.message);
    }
    console.log(`----------------------------------------`);
  }
})();
