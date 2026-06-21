import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { buildDoodlePrompt } from '../src/utils/doodlePromptBuilder.js';

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

// Initialize Gemini Client
const genAI = new GoogleGenerativeAI(envVars['VITE_GEMINI_API_KEY']);
const geminiModel = genAI.getGenerativeModel({
  model: 'gemini-3.1-flash-lite',
  generationConfig: { responseMimeType: "text/plain" }
});

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

function cleanSvg(svgText) {
  let cleaned = svgText.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```[a-z]*\n?/, "").replace(/\n?```$/, "");
  }
  
  // Extract SVG strictly using regex to allow comments/plan before the SVG
  const svgMatch = cleaned.match(/<svg[\s\S]*?<\/svg>/i);
  if (svgMatch) {
    cleaned = svgMatch[0].trim();
  }
  
  if (!/xmlns\s*=/i.test(cleaned)) {
    cleaned = cleaned.replace(/<svg/i, '<svg xmlns="http://www.w3.org/2000/svg"');
  }
  return cleaned;
}

async function generateSvgDoodle(word, meaning, example = '') {
  const prompt = buildDoodlePrompt(word, meaning, example);
  
  // Try up to 3 attempts with Gemini 3.1 Flash-Lite
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const result = await geminiModel.generateContent(prompt);
      const svg = result.response.text().trim();
      
      if (svg.includes('<svg') && svg.includes('</svg>')) {
        return cleanSvg(svg);
      }
      console.warn(`  ⚠️ Attempt ${attempt}/3 returned invalid SVG, retrying...`);
    } catch (err) {
      console.error(`  ❌ Gemini error on attempt ${attempt}/3:`, err.message || err);
      const errStr = String(err);
      if (errStr.includes('429') || errStr.includes('503') || errStr.toLowerCase().includes('quota') || errStr.toLowerCase().includes('rate')) {
        console.warn("  ⚠️ Gemini rate limited/busy. Waiting 30s...");
        await delay(30000);
      } else {
        await delay(5000);
      }
    }
  }
  return null;
}

(async () => {
  try {
    console.log('🚀 Starting batch regeneration of old unapproved SVGs using Gemini 3.1 Flash-Lite...\n');

    // Fetch all global dictionary entries
    let allEntries = [];
    let start = 0;
    const step = 1000;
    let keepFetching = true;

    while (keepFetching) {
      console.log(`Fetching dictionary records ${start} to ${start + step}...`);
      const { data, error } = await supabase
        .from('global_dictionary')
        .select('id, word, video_url, meaning, example')
        .range(start, start + step - 1);

      if (error) {
        console.error('Error fetching global dictionary:', error);
        return;
      }

      if (!data || data.length === 0) {
        keepFetching = false;
      } else {
        allEntries = [...allEntries, ...data];
        if (data.length < step) keepFetching = false;
        start += step;
      }
    }

    const unapprovedEntries = allEntries.filter(e => {
      const url = e.video_url || '';
      // Target any generated SVG, old PNG, or temp loading state that hasn't been approved yet
      return url !== '' && !url.startsWith('approved:') && !url.startsWith('generating-') && !url.startsWith('error-');
    });

    console.log(`Found ${unapprovedEntries.length} unapproved SVG doodles to regenerate using Gemini.`);
    console.log(unapprovedEntries.map(e => e.word).join(', '));
    console.log('\nStarting loop...\n');

    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < unapprovedEntries.length; i++) {
      const item = unapprovedEntries[i];
      console.log(`[${i + 1}/${unapprovedEntries.length}] Regenerating: "${item.word}"`);

      const svg = await generateSvgDoodle(item.word, item.meaning, item.example);

      if (!svg) {
        console.error(`  ❌ Failed to generate SVG for "${item.word}"`);
        failCount++;
        await delay(5000);
        continue;
      }

      const base64Svg = Buffer.from(svg).toString('base64');
      const finalUrl = `data:image/svg+xml;base64,${base64Svg}`;

      const { error: updateError } = await supabase
        .from('global_dictionary')
        .update({ video_url: finalUrl })
        .eq('id', item.id);

      if (updateError) {
        console.error(`  ❌ DB update failed:`, updateError);
        failCount++;
      } else {
        successCount++;
        console.log(`  ✅ Successfully updated "${item.word}"! (${successCount} done)`);
      }

      // 6-second delay between requests to stay safely under the 15 Requests Per Minute limit of the free tier
      await delay(6000);
    }

    console.log(`\n\n🎉 Batch regeneration complete!`);
    console.log(`  ✅ Success: ${successCount}`);
    console.log(`  ❌ Failed: ${failCount}`);

  } catch (err) {
    console.error('Unhandled error:', err);
  }
})();
