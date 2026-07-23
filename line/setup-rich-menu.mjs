import fs from 'node:fs/promises';
import path from 'node:path';

const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
const liffBaseUrl =
  process.env.LINE_LIFF_URL ||
  'https://liff.line.me/2010748224-EeJEpvzz';
const liffUrl =
  process.env.LINE_START_URL ||
  (liffBaseUrl.endsWith('/purge')
    ? liffBaseUrl
    : liffBaseUrl.replace(/\/+$/, '') + '/purge');
const imagePath = path.resolve(
  import.meta.dirname,
  '..',
  'public',
  'line',
  'ai-prae-rich-menu-v1.jpg',
);

if (!token) {
  throw new Error('Set LINE_CHANNEL_ACCESS_TOKEN before running this script.');
}

const api = async (url, options = {}) => {
  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: 'Bearer ' + token,
      ...(options.headers || {}),
    },
  });
  if (!response.ok) {
    throw new Error(response.status + ' ' + (await response.text()));
  }
  const text = await response.text();
  return text ? JSON.parse(text) : null;
};

const richMenu = await api('https://api.line.me/v2/bot/richmenu', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    size: { width: 2500, height: 843 },
    selected: true,
    name: 'Ai Prae vocabulary menu v1',
    chatBarText: 'เปิดเมนูไอ้แปร๋',
    areas: [
      {
        bounds: { x: 0, y: 0, width: 834, height: 843 },
        action: { type: 'uri', label: 'เริ่มทวน', uri: liffUrl },
      },
      {
        bounds: { x: 834, y: 0, width: 833, height: 843 },
        action: {
          type: 'postback',
          label: 'คลังของฉัน',
          data: 'action=stats',
          displayText: 'ดูคลังของฉัน',
        },
      },
      {
        bounds: { x: 1667, y: 0, width: 833, height: 843 },
        action: {
          type: 'postback',
          label: 'วิธีใช้',
          data: 'action=help',
          displayText: 'วิธีใช้',
        },
      },
    ],
  }),
});

const image = await fs.readFile(imagePath);
if (image.byteLength > 1024 * 1024) {
  throw new Error('Rich menu image must be 1 MB or smaller.');
}

await api(
  'https://api-data.line.me/v2/bot/richmenu/' +
    richMenu.richMenuId +
    '/content',
  {
    method: 'POST',
    headers: { 'Content-Type': 'image/jpeg' },
    body: image,
  },
);

await api(
  'https://api.line.me/v2/bot/user/all/richmenu/' + richMenu.richMenuId,
  { method: 'POST' },
);

console.log('Default rich menu installed:', richMenu.richMenuId);
