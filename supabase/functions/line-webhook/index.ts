import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.103.2';
import {
  ensureLineUser,
  fetchLineBotProfile,
  normalizeLineUserId,
  type LineProfile,
  type LineUser,
} from '../_shared/line-user.ts';

const LINE_CHANNEL_ACCESS_TOKEN = Deno.env.get('LINE_CHANNEL_ACCESS_TOKEN') || '';
const LINE_CHANNEL_SECRET = Deno.env.get('LINE_CHANNEL_SECRET') || '';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const LINE_LIFF_URL =
  Deno.env.get('LINE_LIFF_URL') ||
  'https://liff.line.me/2010748224-EeJEpvzz';
const LINE_START_URL =
  Deno.env.get('LINE_START_URL') ||
  (LINE_LIFF_URL.endsWith('/purge') ? LINE_LIFF_URL : LINE_LIFF_URL.replace(/\/+$/, '') + '/purge');

const LINE_CONNECT_URL =
  Deno.env.get('LINE_CONNECT_URL') ||
  LINE_LIFF_URL.replace(/\/purge(?:\?.*)?$/, '').replace(/\/+$/, '') +
    '/login?auth=1';

const BOT_NAME = Deno.env.get('LINE_BOT_NAME') || 'ไอ้แปร๋';

const jsonHeaders = { 'Content-Type': 'application/json' };

const asText = (value: unknown, fallback = '') =>
  typeof value === 'string' && value.trim() ? value.trim() : fallback;

const clampText = (value: unknown, max: number, fallback = '') => {
  const text = asText(value, fallback);
  return text.length > max ? text.slice(0, max - 1).trimEnd() + '…' : text;
};

const normalizeWord = (value: unknown) =>
  asText(value).toLowerCase().replace(/\s+/g, ' ').trim();

const encodeBase64 = (bytes: Uint8Array) => {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
};

const constantTimeEqual = (left: string, right: string) => {
  if (left.length !== right.length) return false;
  let mismatch = 0;
  for (let index = 0; index < left.length; index += 1) {
    mismatch |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return mismatch === 0;
};

async function verifyLineSignature(rawBody: string, signature: string | null) {
  if (!LINE_CHANNEL_SECRET || !signature) return false;
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(LINE_CHANNEL_SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const digest = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(rawBody),
  );
  return constantTimeEqual(
    encodeBase64(new Uint8Array(digest)),
    signature,
  );
}

const postbackData = (
  action: string,
  values: Record<string, string> = {},
) => {
  const params = new URLSearchParams({ action, ...values });
  return params.toString();
};

async function lineRequest(path: string, body: unknown) {
  const response = await fetch('https://api.line.me' + path, {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + LINE_CHANNEL_ACCESS_TOKEN,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(
      'LINE API ' + response.status + ': ' + (await response.text()),
    );
  }
}

const reply = (replyToken: string, messages: unknown[]) =>
  lineRequest('/v2/bot/message/reply', { replyToken, messages });

const startLoading = async (lineUserId: string) => {
  try {
    await lineRequest('/v2/bot/chat/loading/start', {
      chatId: lineUserId,
      loadingSeconds: 20,
    });
  } catch (error) {
    console.warn('LINE loading animation unavailable:', error);
  }
};

async function getProfileForEvent(
  admin: any,
  lineUserId: string,
): Promise<LineProfile> {
  const canonicalLineUserId = normalizeLineUserId(lineUserId);
  const { data: known } = await admin
    .from('line_identities')
    .select('display_name,picture_url')
    .eq('line_user_id', canonicalLineUserId)
    .maybeSingle();

  if (known) {
    return {
      userId: lineUserId,
      displayName: known.display_name,
      pictureUrl: known.picture_url,
    };
  }

  return fetchLineBotProfile(lineUserId, LINE_CHANNEL_ACCESS_TOKEN);
}

async function claimEvent(admin: any, event: any) {
  const eventId = asText(event.webhookEventId);
  if (!eventId) return true;

  const { data, error } = await admin.rpc('claim_line_webhook_event', {
    p_webhook_event_id: eventId,
    p_line_user_id: asText(event.source?.userId) || null,
    p_event_type: asText(event.type, 'unknown'),
  });

  if (error) throw new Error('Could not claim webhook event: ' + error.message);
  return data === true;
}

async function completeEvent(admin: any, event: any) {
  const eventId = asText(event.webhookEventId);
  if (!eventId) return;

  const { error } = await admin
    .from('line_webhook_events')
    .update({
      status: 'completed',
      processed_at: new Date().toISOString(),
      last_error: null,
    })
    .eq('webhook_event_id', eventId);

  if (error) {
    throw new Error('Could not complete webhook event: ' + error.message);
  }
}

async function releaseEvent(admin: any, event: any) {
  const eventId = asText(event.webhookEventId);
  if (!eventId) return;
  const { error } = await admin
    .from('line_webhook_events')
    .delete()
    .eq('webhook_event_id', eventId);
  if (error) {
    throw new Error('Could not release webhook event: ' + error.message);
  }
}

function parseDictionaryData(row: any) {
  if (!row) return null;

  let data = row.rich_data;
  if (!data && typeof row.meaning === 'string') {
    try {
      data = JSON.parse(row.meaning);
    } catch {
      data = null;
    }
  }

  if (!data || typeof data !== 'object') {
    data = {
      word: row.word,
      pos: row.pos,
      cefrLevel: row.cefr_level,
      englishExplanation: { definition: row.meaning || '' },
    };
  }

  return {
    ...data,
    word: data.word || row.word,
    pos: data.pos || row.pos,
    cefrLevel: data.cefrLevel || row.cefr_level,
    _wordId: row.id,
  };
}

async function findCachedWord(admin: any, word: string) {
  const { data, error } = await admin
    .from('global_dictionary')
    .select('id,word,pos,meaning,rich_data,cefr_level')
    .eq('word', normalizeWord(word))
    .maybeSingle();

  if (error) throw new Error('Dictionary lookup failed: ' + error.message);
  return parseDictionaryData(data);
}

async function ensureDictionaryWord(
  admin: any,
  requestedWord: string,
  details: any,
) {
  const canonicalWord = normalizeWord(details.word || requestedWord);
  if (!/^[a-z][a-z'-]*(?:\s+[a-z][a-z'-]*){0,7}$/i.test(canonicalWord)) {
    throw new Error('Generated word is not safe to cache');
  }

  const richData = {
    ...details,
    word: canonicalWord,
  };

  const { data: existing, error: lookupError } = await admin
    .from('global_dictionary')
    .select('id')
    .eq('word', canonicalWord)
    .maybeSingle();

  if (lookupError) {
    throw new Error('Dictionary lookup failed: ' + lookupError.message);
  }

  if (existing?.id) {
    return { ...richData, _wordId: existing.id };
  }

  const { data: inserted, error: insertError } = await admin
    .from('global_dictionary')
    .insert({
      word: canonicalWord,
      pos: details.pos || 'word',
      meaning: JSON.stringify(richData),
      rich_data: richData,
      cefr_level: details.cefrLevel || 'Unranked',
    })
    .select('id')
    .single();

  if (insertError || !inserted?.id) {
    throw new Error(
      'Dictionary insert failed: ' + (insertError?.message || 'unknown error'),
    );
  }

  return { ...richData, _wordId: inserted.id };
}

async function ensurePrivateLineCard(
  admin: any,
  userId: string,
  requestedWord: string,
  details: any,
) {
  const normalizedWord = normalizeWord(requestedWord);
  if (!normalizedWord || normalizedWord.length > 80) {
    throw new Error('Forced word is invalid');
  }

  const staleCutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    .toISOString();
  await admin
    .from('line_private_cards')
    .delete()
    .lt('updated_at', staleCutoff);

  const richData = {
    ...details,
    word: normalizedWord,
    _forcedOriginal: true,
  };
  const { data, error } = await admin
    .from('line_private_cards')
    .upsert({
      user_id: userId,
      normalized_word: normalizedWord,
      rich_data: richData,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id,normalized_word' })
    .select('id')
    .single();
  if (error || !data?.id) {
    throw new Error('Could not prepare private word');
  }
  return { ...richData, _privateCardId: data.id };
}

async function generateWord(
  admin: any,
  user: LineUser,
  requestedWord: string,
  forceOriginal = false,
) {
  if (!forceOriginal) {
    const cached = await findCachedWord(admin, requestedWord);
    if (cached) return cached;
  }

  const response = await fetch(
    SUPABASE_URL + '/functions/v1/get-word-details',
    {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + SUPABASE_SERVICE_ROLE_KEY,
        'Content-Type': 'application/json',
        'x-memeng-internal-user-id': user.id,
      },
      body: JSON.stringify({
        word: requestedWord,
        forceValid: forceOriginal,
      }),
    },
  );

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message =
      response.status === 429
        ? 'วันนี้หาคำใหม่ครบโควต้าแล้ว แต่คำในคลังเดิมยังค้นได้ตามปกติ'
        : asText(payload.error, 'ระบบแปลกำลังพัก ลองใหม่อีกครั้งนะ');
    throw new Error(message);
  }

  if (payload.validation?.isInvalid && !forceOriginal) return payload;
  return forceOriginal
    ? ensurePrivateLineCard(admin, user.id, requestedWord, payload)
    : ensureDictionaryWord(admin, requestedWord, payload);
}

const getThai = (details: any) =>
  asText(
    details.thaiTranslation?.word,
    asText(details.validation?.thaiTranslationShort, 'ยังไม่มีคำแปลไทย'),
  );

const getDefinition = (details: any) => {
  const raw = asText(
    details.englishExplanation?.definition,
    asText(details.validation?.englishExplanationShort, 'No definition yet.'),
  );
  const words = raw.split(/\s+/).filter(Boolean);
  return clampText(words.slice(0, 18).join(' '), 150, 'No definition yet.');
};

const getExample = (details: any) =>
  clampText(
    details.scenes?.[0]?.dialogue ||
      details.exampleSentence ||
      details.collocation?.example,
    180,
    'Try using this word in your own sentence.',
  );

function buildWordCard(details: any, forcedOriginal = false) {
  const word = clampText(details.word, 80, 'word');
  const thai = clampText(getThai(details), 120);
  const definition = getDefinition(details);
  const example = getExample(details);
  const level = clampText(details.cefrLevel, 8, '—').toUpperCase();
  const pos = clampText(details.pos, 24, 'WORD').toUpperCase();
  const wordId = asText(details._wordId);
  const privateCardId = asText(details._privateCardId);
  const saveValues = privateCardId
    ? { private_card_id: privateCardId, word }
    : { word_id: wordId, word };
  if (!privateCardId && !wordId) {
    throw new Error('Card has no save target');
  }

  const warning = forcedOriginal
    ? [{
        type: 'text',
        text: 'คำนี้อาจสะกดไม่มาตรฐาน แต่บันทึกตามที่คุณยืนยัน',
        color: '#F59E0B',
        size: 'xs',
        wrap: true,
        margin: 'md',
      }]
    : [];

  return {
    type: 'flex',
    altText: word + ' = ' + thai,
    contents: {
      type: 'bubble',
      size: 'mega',
      styles: {
        header: { backgroundColor: '#15161B' },
        body: { backgroundColor: '#15161B' },
        footer: { backgroundColor: '#15161B' },
      },
      header: {
        type: 'box',
        layout: 'horizontal',
        alignItems: 'center',
        contents: [
          {
            type: 'text',
            text: BOT_NAME,
            color: '#F5C842',
            weight: 'bold',
            size: 'sm',
            flex: 1,
          },
          {
            type: 'text',
            text: level + '  ' + pos,
            color: '#A7ACB9',
            size: 'xs',
            align: 'end',
            flex: 2,
          },
        ],
      },
      body: {
        type: 'box',
        layout: 'vertical',
        spacing: 'md',
        contents: [
          {
            type: 'text',
            text: word,
            color: '#FFFFFF',
            weight: 'bold',
            size: 'xxl',
            wrap: true,
          },
          {
            type: 'text',
            text: thai,
            color: '#5DE0A3',
            weight: 'bold',
            size: 'lg',
            wrap: true,
          },
          {
            type: 'separator',
            color: '#333640',
          },
          {
            type: 'text',
            text: definition,
            color: '#D7DAE3',
            size: 'sm',
            wrap: true,
          },
          {
            type: 'box',
            layout: 'vertical',
            backgroundColor: '#202229',
            cornerRadius: '8px',
            paddingAll: '12px',
            contents: [
              {
                type: 'text',
                text: example,
                color: '#FFFFFF',
                size: 'sm',
                wrap: true,
              },
            ],
          },
          ...warning,
        ],
      },
      footer: {
        type: 'box',
        layout: 'horizontal',
        spacing: 'sm',
        contents: [
          {
            type: 'button',
            style: 'primary',
            color: '#2DAA73',
            height: 'sm',
            action: {
              type: 'postback',
              label: 'เก็บคำนี้',
              data: postbackData('save', saveValues),
              displayText: 'เก็บคำว่า ' + word,
            },
          },
          {
            type: 'button',
            style: 'secondary',
            height: 'sm',
            action: {
              type: 'uri',
              label: 'เริ่มทวน',
              uri: LINE_START_URL,
            },
          },
        ],
      },
    },
  };
}

function buildSuggestionCard(input: string, details: any) {
  const suggestion = normalizeWord(details.validation?.suggestion);
  const thai = clampText(details.validation?.thaiTranslationShort, 100);

  if (!suggestion) {
    return {
      type: 'text',
      text: 'ยังไม่รู้จักคำว่า "' + input + '" ลองตรวจการสะกดแล้วส่งอีกครั้งนะ',
      quickReply: {
        items: [{
          type: 'action',
          action: {
            type: 'postback',
            label: 'Use original',
            data: postbackData('force', { word: input }),
            displayText: 'Use original: ' + input,
          },
        }],
      },
    };
  }

  return {
    type: 'flex',
    altText: 'คุณหมายถึง ' + suggestion + ' หรือเปล่า',
    contents: {
      type: 'bubble',
      styles: {
        body: { backgroundColor: '#15161B' },
        footer: { backgroundColor: '#15161B' },
      },
      body: {
        type: 'box',
        layout: 'vertical',
        spacing: 'md',
        contents: [
          {
            type: 'text',
            text: 'สะกดแบบนี้หรือเปล่า?',
            color: '#A7ACB9',
            size: 'sm',
          },
          {
            type: 'text',
            text: suggestion,
            color: '#FFFFFF',
            weight: 'bold',
            size: 'xxl',
            wrap: true,
          },
          ...(thai
            ? [{
                type: 'text',
                text: thai,
                color: '#5DE0A3',
                size: 'md',
                wrap: true,
              }]
            : []),
        ],
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        spacing: 'sm',
        contents: [
          {
            type: 'button',
            style: 'primary',
            color: '#F59E0B',
            action: {
              type: 'message',
              label: 'ใช่ คำนี้แหละ',
              text: suggestion,
            },
          },
          {
            type: 'button',
            style: 'secondary',
            action: {
              type: 'postback',
              label: 'ใช้คำเดิม',
              data: postbackData('force', { word: input }),
              displayText: 'ใช้คำเดิม: ' + input,
            },
          },
        ],
      },
    },
  };
}

async function saveWord(admin: any, userId: string, wordId: string) {
  if (!/^[0-9a-f-]{36}$/i.test(wordId)) {
    throw new Error('Word ID is invalid');
  }

  const { data: existing, error: existingError } = await admin
    .from('user_decks')
    .select('id')
    .eq('user_id', userId)
    .eq('word_id', wordId)
    .maybeSingle();

  if (existingError) {
    throw new Error('Could not check deck: ' + existingError.message);
  }
  if (existing?.id) return 'existing';

  const { error } = await admin.from('user_decks').insert({
    user_id: userId,
    word_id: wordId,
    srs_level: 'Learning',
    next_review_date: new Date().toISOString(),
  });

  if (error?.code === '23505') return 'existing';
  if (error) throw new Error('Could not save word: ' + error.message);
  return 'saved';
}

async function savePrivateWord(
  admin: any,
  userId: string,
  privateCardId: string,
) {
  if (!/^[0-9a-f-]{36}$/i.test(privateCardId)) {
    throw new Error('Private card ID is invalid');
  }

  const { data: privateCard, error: privateError } = await admin
    .from('line_private_cards')
    .select('normalized_word,rich_data')
    .eq('id', privateCardId)
    .eq('user_id', userId)
    .maybeSingle();
  if (privateError || !privateCard) {
    throw new Error('Private card is unavailable');
  }

  const { data: existing, error: existingError } = await admin
    .from('user_decks')
    .select('id')
    .eq('user_id', userId)
    .eq('custom_word', privateCard.normalized_word)
    .maybeSingle();
  if (existingError) {
    throw new Error('Could not check private deck: ' + existingError.message);
  }
  if (existing?.id) return 'existing';

  const { data: deckId, error: saveError } = await admin.rpc(
    'save_private_word_to_deck',
    {
      p_word: privateCard.normalized_word,
      p_details: privateCard.rich_data,
      p_user_id: userId,
    },
  );
  if (saveError || !deckId) {
    throw new Error(
      'Could not save private word: ' + (saveError?.message || 'unknown error'),
    );
  }
  return 'saved';
}

async function buildStatsCard(admin: any, userId: string) {
  const { data: stats, error: statsError } = await admin.rpc(
    'get_user_cefr_stats',
    { p_user_id: userId },
  );
  if (statsError) {
    throw new Error('Could not read deck statistics: ' + statsError.message);
  }

  const ids = { length: Number(stats?.total || 0) };
  const counts: Record<string, number> = {
    A1: Number(stats?.A1 || 0),
    A2: Number(stats?.A2 || 0),
    B1: Number(stats?.B1 || 0),
    B2: Number(stats?.B2 || 0),
    C1: Number(stats?.C1 || 0),
    C2: Number(stats?.C2 || 0),
  };

  const levelText =
    'A1 ' + counts.A1 + '  •  A2 ' + counts.A2 + '  •  B1 ' + counts.B1 +
    '\nB2 ' + counts.B2 + '  •  C1 ' + counts.C1 + '  •  C2 ' + counts.C2;

  return {
    type: 'flex',
    altText: 'คลังของฉัน ' + ids.length + ' คำ',
    contents: {
      type: 'bubble',
      styles: {
        body: { backgroundColor: '#15161B' },
        footer: { backgroundColor: '#15161B' },
      },
      body: {
        type: 'box',
        layout: 'vertical',
        spacing: 'md',
        contents: [
          {
            type: 'text',
            text: 'คลังของฉัน',
            color: '#FFFFFF',
            weight: 'bold',
            size: 'xl',
          },
          {
            type: 'text',
            text: ids.length + ' คำ',
            color: '#F5C842',
            weight: 'bold',
            size: 'xxl',
          },
          {
            type: 'text',
            text: levelText,
            color: '#D7DAE3',
            size: 'sm',
            wrap: true,
          },
        ],
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'button',
            style: 'primary',
            color: '#F59E0B',
            action: {
              type: 'uri',
              label: 'เริ่มทวนคำ',
              uri: LINE_START_URL,
            },
          },
        ],
      },
    },
  };
}

const helpMessage = () => ({
  type: 'text',
  text:
    BOT_NAME +
    ' ใช้ง่ายมาก\n\n' +
    '1. พิมพ์คำอังกฤษที่อยากรู้\n' +
    '2. กด “เก็บคำนี้” บนการ์ด\n' +
    '3. กด “เริ่มทวน” เพื่อเล่นแฟลชการ์ด\n\n' +
    'พิมพ์ “คลัง” เพื่อดูจำนวนคำของคุณ',
  quickReply: {
    items: [
      {
        type: 'action',
        action: {
          type: 'uri',
          label: 'Start flashcards',
          uri: LINE_START_URL,
        },
      },
      {
        type: 'action',
        action: {
          type: 'uri',
          label: 'Connect Google',
          uri: LINE_CONNECT_URL,
        },
      },
    ],
  },
});

async function processPostback(
  admin: any,
  event: any,
  user: LineUser,
) {
  const params = new URLSearchParams(asText(event.postback?.data));
  const action = params.get('action') || '';

  if (action === 'save') {
    const wordId = params.get('word_id') || '';
    const privateCardId = params.get('private_card_id') || '';
    const word = clampText(params.get('word'), 80, 'คำนี้');
    const result = privateCardId
      ? await savePrivateWord(admin, user.id, privateCardId)
      : await saveWord(admin, user.id, wordId);
    await reply(event.replyToken, [{
      type: 'text',
      text:
        result === 'existing'
          ? 'คำว่า "' + word + '" อยู่ในคลังของคุณแล้ว'
          : 'เก็บ "' + word + '" แล้ว กดเริ่มทวนได้เลย',
      quickReply: {
        items: [{
          type: 'action',
          action: {
            type: 'uri',
            label: 'เริ่มทวน',
            uri: LINE_START_URL,
          },
        }],
      },
    }]);
    return;
  }

  if (action === 'force') {
    const word = normalizeWord(params.get('word'));
    if (!word) throw new Error('Forced word is missing');
    const [details] = await Promise.all([
      generateWord(admin, user, word, true),
      startLoading(user.lineUserId),
    ]);
    await reply(event.replyToken, [buildWordCard(details, true)]);
    return;
  }

  if (action === 'stats') {
    await reply(event.replyToken, [await buildStatsCard(admin, user.id)]);
    return;
  }

  await reply(event.replyToken, [helpMessage()]);
}

async function processEvent(admin: any, event: any) {
  const lineUserId = asText(event.source?.userId);
  const replyToken = asText(event.replyToken);
  if (!lineUserId || !replyToken) return;

  const profile = await getProfileForEvent(admin, lineUserId);
  const user = await ensureLineUser(admin, profile);

  if (event.type === 'follow') {
    await reply(replyToken, [{
      type: 'text',
      text:
        'หวัดดี เรา ' + BOT_NAME +
        '\nส่งคำศัพท์อังกฤษมาได้เลย เดี๋ยวแปลให้และเก็บไว้ทวนได้ทันที',
    }, helpMessage()]);
    return;
  }

  if (event.type === 'postback') {
    await processPostback(admin, event, user);
    return;
  }

  if (event.type !== 'message' || event.message?.type !== 'text') {
    await reply(replyToken, [{
      type: 'text',
      text: 'ตอนนี้ส่งเป็นคำศัพท์อังกฤษมาก่อนได้เลยนะ',
    }]);
    return;
  }

  const input = asText(event.message.text);
  const command = input.toLowerCase();

  if (['help', 'วิธีใช้', 'ช่วย'].includes(command)) {
    await reply(replyToken, [helpMessage()]);
    return;
  }

  if (['stats', 'คลัง', 'คลังของฉัน'].includes(command)) {
    await reply(replyToken, [await buildStatsCard(admin, user.id)]);
    return;
  }

  if (!input || input.length > 80) {
    await reply(replyToken, [{
      type: 'text',
      text: 'ส่งมาเป็นคำหรือวลีสั้น ๆ ไม่เกิน 80 ตัวอักษรนะ',
    }]);
    return;
  }

  const [details] = await Promise.all([
    generateWord(admin, user, input, false),
    startLoading(lineUserId),
  ]);

  if (details.validation?.isInvalid) {
    await reply(replyToken, [buildSuggestionCard(input, details)]);
    return;
  }

  await reply(replyToken, [buildWordCard(details)]);
}

Deno.serve(async (request) => {
  if (request.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: jsonHeaders },
    );
  }

  if (
    !LINE_CHANNEL_ACCESS_TOKEN ||
    !LINE_CHANNEL_SECRET ||
    !SUPABASE_URL ||
    !SUPABASE_SERVICE_ROLE_KEY
  ) {
    console.error('LINE webhook secrets are incomplete');
    return new Response(
      JSON.stringify({ error: 'Server configuration is incomplete' }),
      { status: 500, headers: jsonHeaders },
    );
  }

  const contentLength = Number(request.headers.get('content-length') || 0);
  if (Number.isFinite(contentLength) && contentLength > 1024 * 1024) {
    return new Response(
      JSON.stringify({ error: 'Payload too large' }),
      { status: 413, headers: jsonHeaders },
    );
  }

  const rawBody = await request.text();
  const signature = request.headers.get('x-line-signature');
  if (rawBody.length > 1024 * 1024) {
    return new Response(
      JSON.stringify({ error: 'Payload too large' }),
      { status: 413, headers: jsonHeaders },
    );
  }

  if (!(await verifyLineSignature(rawBody, signature))) {
    return new Response(
      JSON.stringify({ error: 'Invalid LINE signature' }),
      { status: 401, headers: jsonHeaders },
    );
  }

  let payload: any;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return new Response(
      JSON.stringify({ error: 'Invalid JSON' }),
      { status: 400, headers: jsonHeaders },
    );
  }

  if (!Array.isArray(payload.events)) {
    return new Response(
      JSON.stringify({ error: 'Invalid LINE event payload' }),
      { status: 400, headers: jsonHeaders },
    );
  }

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  let shouldRetry = false;
  for (const event of payload.events) {
    let claimed = false;
    const eventTimestamp = Number(event?.timestamp);
    const now = Date.now();
    if (
      !Number.isFinite(eventTimestamp) ||
      eventTimestamp > now + 10 * 60 * 1000 ||
      eventTimestamp < now - 7 * 24 * 60 * 60 * 1000
    ) {
      console.warn('Ignored LINE event with implausible timestamp');
      continue;
    }
    try {
      claimed = await claimEvent(admin, event);
      if (!claimed) continue;
      await processEvent(admin, event);
      await completeEvent(admin, event);
    } catch (error) {
      console.error('LINE event failed:', error);
      if (claimed) {
        try {
          await reply(event.replyToken, [{
            type: 'text',
            text:
              error instanceof Error && error.message.includes('โควต้า')
                ? error.message
                : 'ระบบสะดุดนิดหน่อย ลองส่งคำนี้มาอีกครั้งนะ',
          }]);
          await completeEvent(admin, event);
        } catch (replyError) {
          console.error('LINE fallback reply failed:', replyError);
          shouldRetry = true;
          try {
            await releaseEvent(admin, event);
          } catch (releaseError) {
            console.error('LINE event release failed:', releaseError);
          }
        }
      } else {
        // Claim/storage failures must be retried by LINE, never acknowledged.
        shouldRetry = true;
      }
    }
  }

  return new Response(
    JSON.stringify({ success: !shouldRetry }),
    { status: shouldRetry ? 500 : 200, headers: jsonHeaders },
  );
});
