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
const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

(async () => {
  try {
    console.log("Testing gemini-2.0-flash...");
    const result = await model.generateContent("hello! say 'working' if you receive this.");
    console.log("Response:", result.response.text());
  } catch (err) {
    console.error("Error:", err);
  }
})();
