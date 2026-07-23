import path from 'node:path';
import { pathToFileURL } from 'node:url';
import puppeteer from 'puppeteer';

const root = path.resolve(import.meta.dirname, '..');
const template = path.join(import.meta.dirname, 'rich-menu-template.html');
const output = path.join(root, 'public', 'line', 'ai-prae-rich-menu-v1.jpg');

const browser = await puppeteer.launch({ headless: true });
try {
  const page = await browser.newPage();
  await page.setViewport({ width: 2500, height: 843, deviceScaleFactor: 1 });
  await page.goto(pathToFileURL(template).href, { waitUntil: 'networkidle0' });
  await page.screenshot({
    path: output,
    type: 'jpeg',
    quality: 86,
    fullPage: false,
  });
  console.log(output);
} finally {
  await browser.close();
}
