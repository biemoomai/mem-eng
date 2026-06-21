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

const GIPHY_API_KEY = "dc6zaTOxFJmzC";

async function testGiphy(word) {
  try {
    const url = `https://api.giphy.com/v1/gifs/translate?api_key=${GIPHY_API_KEY}&s=${encodeURIComponent(word)}&weirdness=3`;
    console.log(`🔍 Querying GIPHY Translate API for: "${word}"...`);
    const res = await fetch(url);
    if (!res.ok) {
      console.error(`❌ GIPHY API Error: ${res.status} ${res.statusText}`);
      return;
    }
    const json = await res.json();
    if (json.data && json.data.images) {
      console.log(`✅ Success for "${word}"!`);
      console.log(`   Title: ${json.data.title}`);
      console.log(`   GIF URL: ${json.data.images.original.url}`);
      console.log(`   HTML Embed: ${json.data.embed_url}`);
    } else {
      console.log(`⚠️ No image data returned for "${word}"`);
    }
  } catch (err) {
    console.error(`❌ Error querying GIPHY for "${word}":`, err.message);
  }
}

(async () => {
  if (!GIPHY_API_KEY) {
    console.error("❌ No VITE_GIPHY_API_KEY found in .env.local!");
    return;
  }
  console.log(`Using Giphy API Key: ${GIPHY_API_KEY.substring(0, 5)}...`);
  await testGiphy("accountant");
  console.log("");
  await testGiphy("abundance");
  console.log("");
  await testGiphy("mitigate");
})();
