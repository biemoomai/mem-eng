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
  if (match) envVars[match[1].trim()] = match[2].trim().replace(/^['"]|['"]$/g, '');
});

const genAI = new GoogleGenerativeAI(envVars['VITE_GEMINI_API_KEY']);

async function test() {
  const models = ['gemini-2.0-flash', 'gemini-2.5-flash', 'gemini-flash-latest'];
  for (const modelName of models) {
    try {
      console.log(`Testing model: ${modelName}...`);
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent("Say 'hello' in one word.");
      console.log(`  [SUCCESS] Output: "${result.response.text().trim()}"`);
    } catch (err) {
      console.log(`  [FAILED] Error: ${err.message || err}`);
    }
  }
}

test();
