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

(async () => {
  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${envVars['VITE_GEMINI_API_KEY']}`;
    const response = await fetch(url);
    const data = await response.json();
    
    console.log("All supported generateContent models:");
    data.models?.forEach(m => {
      if (m.supportedGenerationMethods?.includes("generateContent")) {
        console.log(`  - ${m.name} (DisplayName: ${m.displayName})`);
      }
    });
  } catch (err) {
    console.error(err);
  }
})();
