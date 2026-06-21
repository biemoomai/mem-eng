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

const HF_KEY = envVars['VITE_HUGGINGFACE_API_KEY'];
const MODEL_URL = "https://router.huggingface.co/hf-inference/models/black-forest-labs/FLUX.1-schnell";

(async () => {
  try {
    const prompt = "A funny cat look at computer meme, high quality photo, with caption: 'Me trying to write SVG coordinates by hand'";
    console.log(`Sending request to Hugging Face FLUX...`);
    const response = await fetch(MODEL_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${HF_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ inputs: prompt })
    });

    if (!response.ok) {
      throw new Error(`HF HTTP error! status: ${response.status} - ${await response.text()}`);
    }

    const buffer = await response.arrayBuffer();
    fs.writeFileSync(path.join(__dirname, 'test_flux.png'), Buffer.from(buffer));
    console.log("Success! Saved FLUX image to scripts/test_flux.png");
  } catch (err) {
    console.error("Error generating with FLUX:", err);
  }
})();
