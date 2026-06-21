
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

(async () => {
  const prompt = "A crude black and white MS Paint stick figure drawing, low effort webcomic, funny internet meme, white background, depicting: A minister of the highest rank sent to a foreign court to represent there his sovereign or country.";
  const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=500&height=800&nologo=true&seed=123`;
  
  console.log('Fetching Pollinations image from URL:', url);
  
  try {
    const res = await fetch(url);
    console.log('Status code:', res.status);
    console.log('Headers:', Object.fromEntries(res.headers.entries()));
    if (res.ok) {
      const buffer = await res.arrayBuffer();
      fs.writeFileSync(path.join(__dirname, 'pollinations_test.jpg'), Buffer.from(buffer));
      console.log('Saved test image successfully!');
    } else {
      console.log('Failed to fetch:', res.statusText);
    }
  } catch (err) {
    console.error('Error fetching Pollinations:', err);
  }
})();
