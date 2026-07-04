const ENGLISH_VOICE_HINTS = [
  'samantha',
  'daniel',
  'alex',
  'google us english',
  'google uk english',
  'microsoft aria',
  'microsoft guy',
  'microsoft libby',
  'microsoft mark'
];

const getEnglishVoice = () => {
  if (typeof window === 'undefined' || !window.speechSynthesis) return null;
  const voices = window.speechSynthesis.getVoices?.() || [];
  const englishVoices = voices.filter(voice => /^en(-|_)/i.test(voice.lang || ''));
  if (englishVoices.length === 0) return null;

  return (
    englishVoices.find(voice => ENGLISH_VOICE_HINTS.some(hint => voice.name.toLowerCase().includes(hint))) ||
    englishVoices.find(voice => /^en-US/i.test(voice.lang || '')) ||
    englishVoices.find(voice => /^en-GB/i.test(voice.lang || '')) ||
    englishVoices[0]
  );
};

export const speakEnglish = (text, options = {}) => {
  if (!text || typeof window === 'undefined' || !window.speechSynthesis) return;
  try {
    const cleanText = String(text).replace(/\*\*/g, '').trim();
    if (!cleanText) return;

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = 'en-US';
    utterance.rate = options.rate ?? 0.92;
    utterance.pitch = options.pitch ?? 1;
    utterance.voice = getEnglishVoice();
    window.speechSynthesis.speak(utterance);
  } catch (error) {
    console.warn('Speech synthesis error:', error);
  }
};
