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

async function testGroq70b() {
  const prompt = buildDoodlePrompt("accountant", "a person whose job is to keep or inspect financial accounts.", "We hired an accountant to help us with our taxes.");
  console.log("Querying Groq llama-3.3-70b-versatile...");
  
  try {
    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: 4096,
    });
    
    let text = completion.choices[0].message.content.trim();
    console.log("Success! Raw output length:", text.length);
    
    if (text.startsWith("```")) {
      text = text.replace(/^```[a-z]*\n?/, "").replace(/\n?```$/, "");
    }
    
    const svgMatch = text.match(/<svg[\s\S]*?<\/svg>/i);
    if (svgMatch) {
      let cleaned = svgMatch[0].trim();
      if (!/xmlns\s*=/i.test(cleaned)) {
        cleaned = cleaned.replace(/<svg/i, '<svg xmlns="http://www.w3.org/2000/svg"');
      }
      fs.writeFileSync(path.join(__dirname, 'test_groq_70b_accountant.svg'), cleaned);
      console.log("Saved generated SVG to scripts/test_groq_70b_accountant.svg!");
    } else {
      console.log("Could not find SVG block in output.");
    }
  } catch (err) {
    console.error("Groq 70B Error:", err.message || err);
  }
}

testGroq70b();
