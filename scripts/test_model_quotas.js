import { GoogleGenerativeAI } from '@google/generative-ai';
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

const genAI = new GoogleGenerativeAI(envVars['VITE_GEMINI_API_KEY']);

const models = [
  'gemini-2.5-flash-lite',
  'gemini-flash-latest',
  'gemini-2.5-flash',
  'gemini-3.1-flash-lite',
  'gemini-2.0-flash-lite'
];

(async () => {
  for (const m of models) {
    console.log(`Testing model: ${m}...`);
    try {
      const model = genAI.getGenerativeModel({ model: m });
      const result = await model.generateContent("hello");
      console.log(`  ✅ SUCCESS! Response: ${result.response.text().trim().substring(0, 30)}`);
    } catch (err) {
      console.log(`  ❌ FAILED: ${err.message}`);
    }
    console.log("--------------------");
  }
})();
