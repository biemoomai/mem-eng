import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Groq from 'groq-sdk';
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

const groq = new Groq({ apiKey: envVars['GROQ_API_KEY'] });

async function verifyDoodle(word, meaning, example) {
  const prompt = buildDoodlePrompt(word, meaning, example);
  console.log(`Sending prompt to Groq for word: "${word}"...`);
  
  try {
    const completion = await groq.chat.completions.create({
      model: 'llama-3.1-8b-instant',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: 4096,
    });
    
    let text = completion.choices[0].message.content.trim();
    console.log("Raw output length:", text.length);
    
    // Clean SVG wrappers and extract using regex
    if (text.startsWith("```")) {
      text = text.replace(/^```[a-z]*\n?/, "").replace(/\n?```$/, "");
    }
    
    const svgMatch = text.match(/<svg[\s\S]*?<\/svg>/i);
    if (svgMatch) {
      let cleanedSvg = svgMatch[0].trim();
      if (!/xmlns\s*=/i.test(cleanedSvg)) {
        cleanedSvg = cleanedSvg.replace(/<svg/i, '<svg xmlns="http://www.w3.org/2000/svg"');
      }
      
      const outputPath = path.join(__dirname, `test_animated_${word}.svg`);
      fs.writeFileSync(outputPath, cleanedSvg);
      console.log(`✅ SUCCESS! Saved animated SVG to: ${outputPath}`);
      
      // Verify style tag exists
      if (cleanedSvg.includes("<style>") && cleanedSvg.includes("</style>")) {
        console.log("   ✓ SVG contains embedded <style> block.");
      } else {
        console.warn("   ⚠️ WARNING: SVG does not contain a <style> block.");
      }
      
      // Verify animation classes are used
      const hasWiggle = cleanedSvg.includes('class="wiggle"');
      const hasBounce = cleanedSvg.includes('class="bounce"');
      const hasStress = cleanedSvg.includes('class="stress"');
      const hasPulse = cleanedSvg.includes('class="pulse"');
      
      console.log(`   Animation classes used: wiggle=${hasWiggle}, bounce=${hasBounce}, stress=${hasStress}, pulse=${hasPulse}`);
    } else {
      console.error("❌ FAILED: Could not find <svg> ... </svg> in LLM output!");
    }
  } catch (err) {
    console.error("❌ Error calling Groq:", err.message);
  }
}

(async () => {
  if (!envVars['GROQ_API_KEY']) {
    console.error("❌ GROQ_API_KEY missing in .env.local!");
    return;
  }
  await verifyDoodle("accountant", "a person whose job is to keep or inspect financial accounts.", "We hired an accountant to help us with our taxes.");
})();
