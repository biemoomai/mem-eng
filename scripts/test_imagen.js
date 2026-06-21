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

async function testImageGeneration() {
  try {
    console.log("Attempting to generate an image using Gemini (Imagen)...");
    
    // The @google/generative-ai package might not fully support Imagen yet depending on version,
    // but we can use the fetch API directly to generativelanguage.googleapis.com if needed.
    // Let's try direct REST API call since we know the model name is models/imagen-4.0-generate-001
    
    const url = `https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-generate-001:predict?key=${envVars['VITE_GEMINI_API_KEY']}`;
    
    const requestBody = {
      instances: [
        {
          prompt: "A simple black and white 2D line art cartoon, funny troll face meme style like 9gag, of a person eating an apple"
        }
      ],
      parameters: {
        sampleCount: 1,
        aspectRatio: "1:1"
      }
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errData = await response.text();
      console.error("API Request failed:");
      console.error(errData);
      return;
    }

    const data = await response.json();
    if (data.predictions && data.predictions.length > 0) {
      console.log("Success! Received image data.");
      // The image is base64 encoded in data.predictions[0].bytesBase64Encoded
      const base64Data = data.predictions[0].bytesBase64Encoded;
      const buffer = Buffer.from(base64Data, 'base64');
      fs.writeFileSync(path.join(__dirname, 'test_image.png'), buffer);
      console.log("Saved test image to scripts/test_image.png");
    } else {
      console.log("No image data in response:", JSON.stringify(data, null, 2));
    }

  } catch (err) {
    console.error("Error during image generation:", err);
  }
}

testImageGeneration();
