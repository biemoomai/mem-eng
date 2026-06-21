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

const HF_TOKEN = envVars['VITE_HUGGINGFACE_API_KEY'];
const MODEL_URL = "https://api-inference.huggingface.co/models/stabilityai/stable-diffusion-xl-base-1.0";

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function generateMemeImage(word, meaning, retries = 5) {
  console.log(`🎨 Requesting HuggingFace API for word: "${word}"...`);
  
  const prompt = `A very simple black and white 2D line art cartoon, funny ugly troll face meme style like 9gag, thick outlines, white background. The image illustrates the concept of '${word}'. Context: ${meaning}. No colors, ms paint style.`;
  
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(MODEL_URL, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${HF_TOKEN}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ inputs: prompt })
      });

      if (response.status === 503) {
        const errJson = await response.json();
        const estimatedTime = errJson.estimated_time || 20;
        console.warn(`⏳ Model is loading. Waiting ${Math.round(estimatedTime)}s (Attempt ${i + 1}/${retries})...`);
        await delay(estimatedTime * 1000);
        continue;
      }

      if (!response.ok) {
        const err = await response.text();
        console.error(`❌ API Error: ${response.status} ${response.statusText}`);
        console.error(err);
        return;
      }

      const buffer = await response.arrayBuffer();
      const filePath = path.join(__dirname, `${word}_test_meme.png`);
      fs.writeFileSync(filePath, Buffer.from(buffer));
      
      console.log(`✅ Success! Saved test image to: ${filePath}`);
      return;
      
    } catch (error) {
      console.error("❌ Network/Connection Error:", error);
      if (i < retries - 1) {
        console.log("Retrying in 5 seconds...");
        await delay(5000);
      }
    }
  }
  
  console.error("❌ Exceeded max retries. Model failed to load in time.");
}

// Test with a word
generateMemeImage("abandon", "to leave behind or run away from someone or something");
