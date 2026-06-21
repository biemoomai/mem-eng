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
const HF_TOKEN = envVars['VITE_HUGGINGFACE_API_KEY'];
const MODEL_URL = "https://router.huggingface.co/hf-inference/models/black-forest-labs/FLUX.1-schnell";

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function generateMemeImage(word, meaning) {
  console.log(`🎨 Requesting HuggingFace API for word: "${word}"...`);
  const prompt = `A very simple black and white 2D line art cartoon, funny ugly troll face meme style like 9gag, thick outlines, white background. The image illustrates the concept of '${word}'. Context: ${meaning}. No colors, ms paint style.`;
  
  for (let i = 0; i < 5; i++) {
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
        console.warn(`⏳ Model is loading. Waiting ${Math.round(estimatedTime)}s (Attempt ${i + 1}/5)...`);
        await delay(estimatedTime * 1000);
        continue;
      }

      if (!response.ok) {
        const err = await response.text();
        console.error(`❌ API Error: ${response.status} ${response.statusText}`);
        console.error(err);
        return null;
      }

      const buffer = await response.arrayBuffer();
      return Buffer.from(buffer);
      
    } catch (error) {
      console.error("❌ Network Error:", error);
      if (i < 4) {
        console.log("Retrying in 5 seconds...");
        await delay(5000);
      }
    }
  }
  return null;
}

(async () => {
  try {
    console.log("Fetching user decks to check for missing memes...");
    const { data: userDecks, error } = await supabase
      .from('user_decks')
      .select('global_dictionary(id, word, video_url, meaning)');

    if (error) {
      console.error("Error fetching user decks:", error);
      return;
    }

    // Filter unique words that need a meme
    const wordsToProcess = [];
    const seenWords = new Set();

    for (const item of userDecks) {
      const g = item.global_dictionary;
      if (!g) continue;
      if (seenWords.has(g.id)) continue;
      seenWords.add(g.id);

      const url = g.video_url || '';
      const isBad = !url || url.startsWith('generating-') || url.includes('giphy') || url.includes('pollinations.ai');
      if (isBad) {
        wordsToProcess.push(g);
      }
    }

    console.log(`Found ${wordsToProcess.length} words in user's deck needing memes:`, wordsToProcess.map(w => w.word));

    for (const item of wordsToProcess) {
      console.log(`\n----------------------------------------`);
      console.log(`Processing: "${item.word}" (ID: ${item.id})`);
      
      const buffer = await generateMemeImage(item.word, item.meaning);
      if (!buffer) {
        console.error(`❌ Failed to generate image for "${item.word}"`);
        continue;
      }

      const filename = `${item.id}.png`;
      
      console.log(`Uploading "${filename}" to Supabase Storage "vocab-memes" bucket...`);
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('vocab-memes')
        .upload(filename, buffer, { 
          contentType: 'image/png',
          upsert: true 
        });

      if (uploadError) {
        console.error("❌ Upload failed:", uploadError);
        continue;
      }

      console.log("✅ Uploaded successfully!", uploadData);

      const { data: { publicUrl } } = supabase.storage
        .from('vocab-memes')
        .getPublicUrl(filename);

      console.log(`Updating database with video_url: ${publicUrl}`);
      const { error: updateError } = await supabase
        .from('global_dictionary')
        .update({ video_url: publicUrl })
        .eq('id', item.id);

      if (updateError) {
        console.error("❌ Failed to update global_dictionary:", updateError);
      } else {
        console.log(`🎉 Successfully generated and saved meme for "${item.word}"!`);
      }

      // Respect rate limiting
      await delay(1000);
    }

    console.log("\nAll done!");

  } catch (err) {
    console.error("Unhandled error:", err);
  }
})();
