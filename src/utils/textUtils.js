/**
 * Splits a sentence into a 'pre' and 'post' section surrounding a target word.
 * This is used to allow UI components to stylize or obscure the target word in the middle.
 * 
 * @param {string} sentence The full example sentence (e.g., "We must mitigate the risk.")
 * @param {string} targetWord The word to extract (e.g., "mitigate")
 * @returns {{ pre: string, post: string }} The surrounding parts of the sentence.
 */
export const splitSentenceAroundWord = (sentence, targetWord) => {
  if (!sentence || !targetWord) {
    return { pre: sentence || '', post: '' };
  }

  // Use case-insensitive regex to find the target word as a whole word boundary
  // Note: we use \b to ensure we match whole words, not partial matches.
  try {
    // If targetWord has special regex characters, this could theoretically fail, but usually it's just plain text.
    // To be safe we could escape it, but we'll assume basic alphabetical strings for Vocab.
    const escapedWord = targetWord.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`\\b${escapedWord}\\b`, 'i');
    
    const parts = sentence.split(regex);
    
    if (parts.length > 1) {
      // Split found the word!
      const pre = parts[0];
      // Join the rest in case the word appears multiple times in the sentence
      const post = parts.slice(1).join(targetWord);
      return { pre, post };
    }
  } catch (err) {
    console.error("Regex split failed: ", err);
  }

  // Fallback if the word isn't strictly found with boundaries (e.g., it was conjugated to 'mitigated')
  // We can try a loose split without boundaries.
  try {
    const looseRegex = new RegExp(targetWord, 'i');
    const parts = sentence.split(looseRegex);
    if (parts.length > 1) {
      return { pre: parts[0], post: parts.slice(1).join(targetWord) };
    }
  } catch (err) {}

  // If the word isn't in the sentence at all, dump everything into 'pre'
  return { pre: sentence, post: '' };
};

export const irregularVerbs = {
  be: ['am/is/are', 'was/were', 'been'],
  go: ['go', 'went', 'gone'],
  write: ['write', 'wrote', 'written'],
  eat: ['eat', 'ate', 'eaten'],
  do: ['do', 'did', 'done'],
  make: ['make', 'made', 'made'],
  see: ['see', 'saw', 'seen'],
  take: ['take', 'took', 'taken'],
  come: ['come', 'came', 'come'],
  give: ['give', 'gave', 'given'],
  find: ['find', 'found', 'found'],
  think: ['think', 'thought', 'thought'],
  tell: ['tell', 'told', 'told'],
  say: ['say', 'said', 'said'],
  run: ['run', 'ran', 'run'],
  speak: ['speak', 'spoke', 'spoken'],
  sing: ['sing', 'sang', 'sung'],
  break: ['break', 'broke', 'broken'],
  choose: ['choose', 'chose', 'chosen'],
  know: ['know', 'knew', 'known'],
  buy: ['buy', 'bought', 'bought'],
  bring: ['bring', 'brought', 'brought'],
  get: ['get', 'got', 'gotten'],
  begin: ['begin', 'began', 'begun'],
  drink: ['drink', 'drank', 'drunk'],
  drive: ['drive', 'drove', 'driven'],
  fall: ['fall', 'fell', 'fallen'],
  fly: ['fly', 'flew', 'flown'],
  forget: ['forget', 'forgot', 'forgotten'],
  grow: ['grow', 'grew', 'grown'],
  hide: ['hide', 'hid', 'hidden'],
  ride: ['ride', 'rode', 'ridden'],
  rise: ['rise', 'rose', 'risen'],
  shake: ['shake', 'shook', 'shaken'],
  steal: ['steal', 'stole', 'stolen'],
  swear: ['swear', 'swore', 'sworn'],
  swim: ['swim', 'swam', 'swum'],
  throw: ['throw', 'threw', 'thrown'],
  wake: ['wake', 'woke', 'woken'],
  wear: ['wear', 'wore', 'worn'],
  keep: ['keep', 'kept', 'kept'],
  leave: ['leave', 'left', 'left'],
  lose: ['lose', 'lost', 'lost'],
  meet: ['meet', 'met', 'met'],
  read: ['read', 'read', 'read'],
  send: ['send', 'sent', 'sent'],
  sleep: ['sleep', 'slept', 'slept'],
  spend: ['spend', 'spent', 'spent'],
  build: ['build', 'built', 'built'],
  feel: ['feel', 'felt', 'felt'],
  hear: ['hear', 'heard', 'heard'],
  hold: ['hold', 'held', 'held'],
  pay: ['pay', 'paid', 'paid'],
  sell: ['sell', 'sold', 'sold'],
  sit: ['sit', 'sat', 'sat'],
  stand: ['stand', 'stood', 'stood'],
  win: ['win', 'won', 'won'],
  catch: ['catch', 'caught', 'caught'],
  fight: ['fight', 'fought', 'fought'],
  teach: ['teach', 'taught', 'taught'],
  understand: ['understand', 'understood', 'understood'],
  cut: ['cut', 'cut', 'cut'],
  hit: ['hit', 'hit', 'hit'],
  hurt: ['hurt', 'hurt', 'hurt'],
  let: ['let', 'let', 'let'],
  put: ['put', 'put', 'put'],
  set: ['set', 'set', 'set'],
  shut: ['shut', 'shut', 'shut'],
  cost: ['cost', 'cost', 'cost']
};

export const getRegularVerbForms = (word) => {
  const w = word.toLowerCase().trim();
  if (w.endsWith('e')) {
    return [w, w + 'd', w + 'd'];
  }
  if (w.endsWith('y') && w.length > 1 && !['a','e','i','o','u'].includes(w[w.length - 2])) {
    const base = w.slice(0, -1);
    return [w, base + 'ied', base + 'ied'];
  }
  const vowels = ['a','e','i','o','u'];
  if (w.length >= 3) {
    const lastChar = w[w.length - 1];
    const secondLast = w[w.length - 2];
    const thirdLast = w[w.length - 3];
    const isLastConsonant = !vowels.includes(lastChar) && !['w','x','y'].includes(lastChar);
    const isSecondLastVowel = vowels.includes(secondLast);
    const isThirdLastConsonant = !vowels.includes(thirdLast);
    if (isLastConsonant && isSecondLastVowel && isThirdLastConsonant) {
      if (w.endsWith('er') || w.endsWith('en') || w.endsWith('open') || w.endsWith('limit')) {
        return [w, w + 'ed', w + 'ed'];
      }
      return [w, w + lastChar + 'ed', w + lastChar + 'ed'];
    }
  }
  return [w, w + 'ed', w + 'ed'];
};

export const getVerbForms = (word, pos) => {
  if (!word) return null;
  const w = word.toLowerCase().trim();
  
  // Check if it's any form of an irregular verb
  for (const key in irregularVerbs) {
    const forms = irregularVerbs[key];
    if (forms.includes(w)) {
      return forms;
    }
  }

  const p = (pos || '').toLowerCase().trim();
  const isVerb = p === 'v' || p === 'verb' || p.includes('verb') || p.startsWith('v.') || p.includes('/v') || p.includes(' v ');
  if (isVerb) {
    return getRegularVerbForms(w);
  }
  return null;
};
