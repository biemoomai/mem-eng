import Groq from 'groq-sdk';
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

const groq = new Groq({ apiKey: envVars['GROQ_API_KEY'] });

async function listModels() {
  try {
    const models = await groq.models.list();
    console.log(models.data.map(m => ({ id: m.id, owned_by: m.owned_by })));
  } catch (err) {
    console.error(err);
  }
}
listModels();
