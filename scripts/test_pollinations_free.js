import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

(async () => {
  const urls = [
    "https://image.pollinations.ai/prompt/a%20cute%20cat",
    "https://gen.pollinations.ai/image/a%20cute%20cat",
    "https://image.pollinations.ai/prompt/a%20cute%20cat?model=flux"
  ];
  
  for (const url of urls) {
    console.log(`\nTesting URL: ${url}`);
    try {
      const res = await fetch(url);
      console.log('Status:', res.status);
      console.log('Content-Type:', res.headers.get('content-type'));
      if (!res.ok) {
        const text = await res.text();
        console.log('Response body:', text.slice(0, 500));
      } else {
        const buffer = await res.arrayBuffer();
        console.log(`Success! Image size: ${buffer.byteLength} bytes`);
      }
    } catch (err) {
      console.error('Fetch error:', err.message);
    }
  }
})();
