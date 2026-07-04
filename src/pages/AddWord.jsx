import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion';
import { Sparkles, Loader2, Volume2, Search, CheckCircle, HelpCircle, ArrowRight, History, Trash2, X, RefreshCw, Activity, CheckSquare, Bookmark, Lightbulb, PlusCircle, Check } from 'lucide-react';
import { useVocab } from '../context/VocabContext';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { fetchVocabImage, cleanKeyword } from '../utils/imageHelper';
import { SafeImage } from '../components/SafeImage';
import { playClickSound } from '../utils/soundHelper';


// Premium white minimal finger pointer SVG component for tutorial highlights
const PremiumFingerPointer = ({ direction = 'down', scale = 1.0 }) => {
  let rotateDeg = 0;
  if (direction === 'up') rotateDeg = 0; // 👆
  if (direction === 'down') rotateDeg = 180; // 👇
  if (direction === 'left') rotateDeg = -90; // 👈
  if (direction === 'right') rotateDeg = 90; // 👉

  return (
    <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', transform: `scale(${scale})` }}>
      {/* Radar pulse ripple effect */}
      <div 
        style={{
          position: 'absolute',
          width: '32px',
          height: '32px',
          borderRadius: '50%',
          border: '2px solid rgba(255, 255, 255, 0.75)',
          boxShadow: '0 0 10px rgba(255,255,255,0.3)',
          animation: 'radarPulseAdd 1.4s infinite ease-out',
          top: '-4px',
          left: '-2px',
          pointerEvents: 'none'
        }}
      />
      <svg
        width="34"
        height="34"
        viewBox="0 0 24 24"
        fill="rgba(255, 255, 255, 0.18)"
        stroke="white"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{
          transform: `rotate(${rotateDeg}deg)`,
          filter: 'drop-shadow(0 4px 10px rgba(0,0,0,0.65))',
          pointerEvents: 'none'
        }}
      >
        <path d="M10 14V6.5C10 5.67 10.67 5 11.5 5C12.33 5 13 5.67 13 6.5V12M13 12V8.5C13 7.67 13.67 7 14.5 7C15.33 7 16 7.67 16 8.5V12M16 12V9.5C16 8.67 16.67 8 17.5 8C18.33 8 19 8.67 19 9.5V15C19 18.31 16.31 21 13 21H11.5C9.01 21 7 18.99 7 16.5V13.62C7 13.06 7.45 12.6 8.01 12.62C8.52 12.64 8.93 13.06 8.95 13.57L9 14" />
      </svg>
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes radarPulseAdd {
          0% {
            transform: scale(0.5);
            opacity: 1;
            border-width: 3px;
          }
          100% {
            transform: scale(1.7);
            opacity: 0;
            border-width: 1px;
          }
        }
      `}} />
    </div>
  );
};


// Highlight the Thai translation word inside a Thai sentence with a distinct blue
const renderHighlightedThaiText = (text, thaiWord) => {
  if (!text || !thaiWord) return text;
  const strText = typeof text === 'string' ? text : JSON.stringify(text);
  const strThaiWord = typeof thaiWord === 'string' ? thaiWord : JSON.stringify(thaiWord);

  const words = strThaiWord
    .split(/[,/|]|\s*หรือ\s*/)
    .map(w => w.trim())
    .filter(Boolean);
  if (words.length === 0) return strText;
  words.sort((a, b) => b.length - a.length);
  const escaped = words.map(w => w.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')).join('|');
  const parts = strText.split(new RegExp(`(${escaped})`, 'g'));
  return parts.map((part, i) => {
    const isMatch = words.some(w => w === part);
    return isMatch
      ? <span key={i} style={{ color: '#60a5fa', fontWeight: 700 }}>{part}</span>
      : part;
  });
};

const cleanLexicalCandidate = (value, targetWord = '') => {
  if (!value || typeof value !== 'string') return null;
  const cleaned = value.toLowerCase().replace(/[^a-z\s-]/g, '').trim();
  if (!cleaned || cleaned === targetWord || cleaned.length > 28 || cleaned.split(/\s+/).length > 3) return null;
  return cleaned;
};

const uniqueLexicalWords = (items, targetWord = '', max = 6) => {
  const seen = new Set();
  const result = [];
  for (const item of items || []) {
    const candidate = cleanLexicalCandidate(item?.word || item, targetWord);
    if (!candidate || seen.has(candidate)) continue;
    seen.add(candidate);
    result.push(candidate);
    if (result.length >= max) break;
  }
  return result;
};

const getLexicalList = (source, fallbackSource, ...keys) => {
  for (const key of keys) {
    const value = source?.[key];
    if (Array.isArray(value) && value.length > 0) return value.map(String).filter(Boolean);
    if (typeof value === 'string' && value.trim()) {
      return value.split(/[,;|]/).map(item => item.trim()).filter(Boolean);
    }
  }
  for (const key of keys) {
    const value = fallbackSource?.[key];
    if (Array.isArray(value) && value.length > 0) return value.map(String).filter(Boolean);
  }
  return [];
};

const irregularVerbs = {
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

const getRegularVerbForms = (word) => {
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

const getVerbForms = (word, pos) => {
  if (!word) return null;
  const w = word.toLowerCase().trim();
  const p = (pos || '').toLowerCase().trim();
  const isExcluded = p.includes('adverb') || p.includes('adj') || p.includes('prep') || p.includes('conj') || p.includes('pron') || p === 'noun' || p === 'n' || p === 'n.';
  const isVerb = (p === 'v' || p === 'verb' || p.startsWith('v.') || p.includes('verb') || p.includes('/v') || p.includes(' v ')) && !isExcluded;
  if (!isVerb) return null;
  
  // Check if it's any form of an irregular verb
  for (const key in irregularVerbs) {
    const forms = irregularVerbs[key];
    if (forms.includes(w)) {
      return forms;
    }
  }

  return getRegularVerbForms(w);
};

const renderInteractiveSentence = (text, targetWord, onWordClick) => {
  if (!text) return '';
  const strText = typeof text === 'string' ? text : JSON.stringify(text);
  const parts = strText.split(/(\s+|[.,\/#!$%\^&\*;:{}=\-_`~()?"'])/g).filter(Boolean);
  
  return parts.map((part, idx) => {
    if (/^\s+$/.test(part) || /^[.,\/#!$%\^&\*;:{}=\-_`~()?"']$/.test(part)) {
      return <React.Fragment key={idx}>{part}</React.Fragment>;
    }
    
    const isTarget = targetWord && (
      part.toLowerCase() === targetWord.toLowerCase() || 
      part.toLowerCase() === (targetWord.toLowerCase() + 's') ||
      part.toLowerCase() === (targetWord.toLowerCase() + 'ed') ||
      part.toLowerCase() === (targetWord.toLowerCase() + 'ing')
    );
    
    const style = {
      color: isTarget ? '#ef4444' : 'inherit',
      fontWeight: isTarget ? 900 : 'inherit',
      cursor: 'pointer',
      display: 'inline',
      transition: 'color 0.15s, background 0.15s',
      borderRadius: '4px',
      padding: '0'
    };

    return (
      <span
        key={idx}
        className="interactive-word"
        role="button"
        style={style}
        onClick={(e) => {
          e.stopPropagation();
          onWordClick(part);
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
          if (!isTarget) e.currentTarget.style.color = '#f97316';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'transparent';
          e.currentTarget.style.color = isTarget ? '#ef4444' : 'inherit';
        }}
      >
        {part}
      </span>
    );
  });
};

const AddWord = () => {
  const { vocab, addWordToDeck, deleteWordFromDeck, getAiWordRichDetails, updateCardImages } = useVocab();
  const { theme } = useTheme();
  const { isAnonymous } = useAuth();
  const navigate = useNavigate();
  const firstCardRef = useRef(null);
  const imageHistoryRef = useRef({}); // { [sceneIdx]: [url1, url2, ...] }
  const [wordInput, setWordInput] = useState('');
  const [isFilling, setIsFilling] = useState(false);
  const [richCardData, setRichCardData] = useState(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const [isAlreadyInDeck, setIsAlreadyInDeck] = useState(false);
  const [existingCard, setExistingCard] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [loadingStep, setLoadingStep] = useState(0);
  const [sourceToast, setSourceToast] = useState(null);
  const [sceneImages, setSceneImages] = useState([]);       // [{url, source}, ...]
  const [sceneImagesLoading, setSceneImagesLoading] = useState(false);
  const [lexicalFallback, setLexicalFallback] = useState({});
  const [regenCounts, setRegenCounts] = useState([0, 0]);
  const [activeSearchOverlays, setActiveSearchOverlays] = useState([false, false]);
  const [selectedPrimaryImageIdx, setSelectedPrimaryImageIdx] = useState(null);
  const [activeImageControlsIdx, setActiveImageControlsIdx] = useState(null);
  const [isTutorialActive, setIsTutorialActive] = useState(() => {
    try {
      return localStorage.getItem('memeng_tutorial_done') !== 'true' && localStorage.getItem('memeng_tutorial_started') === 'true';
    } catch (e) {
      return false;
    }
  });
  const [tutorialStep, setTutorialStep] = useState(() => {
    try {
      const isDone = localStorage.getItem('memeng_tutorial_done') === 'true';
      return isDone ? null : 0;
    } catch (e) {
      return null;
    }
  });
  const [tutorialSwipeDemoReady, setTutorialSwipeDemoReady] = useState(false);

  const [guestNudge, setGuestNudge] = useState(null); // null, 'soft', 'firm'
  const [showShortcutButtons, setShowShortcutButtons] = useState(() => {
    try {
      return localStorage.getItem('memeng_show_shortcut_buttons') !== 'false';
    } catch (e) {
      return true;
    }
  });

  useEffect(() => {
    const handleShortcutChanged = (e) => {
      setShowShortcutButtons(e.detail?.show !== false);
    };
    window.addEventListener('shortcut-buttons-changed', handleShortcutChanged);
    return () => {
      window.removeEventListener('shortcut-buttons-changed', handleShortcutChanged);
    };
  }, []);

  useEffect(() => {
    if (!isAnonymous) return;
    const count = vocab.length;
    if (count >= 10 && count < 20) {
      const shown10 = localStorage.getItem('memeng_nudge_10_shown') === 'true';
      if (!shown10) {
        setGuestNudge('soft');
      }
    } else if (count >= 20) {
      const shown20 = localStorage.getItem('memeng_nudge_20_shown') === 'true';
      if (!shown20) {
        setGuestNudge('firm');
      }
    }
  }, [vocab.length, isAnonymous]);

  const handleCloseNudge = () => {
    if (guestNudge === 'soft') {
      localStorage.setItem('memeng_nudge_10_shown', 'true');
    } else if (guestNudge === 'firm') {
      localStorage.setItem('memeng_nudge_20_shown', 'true');
    }
    setGuestNudge(null);
  };

  useEffect(() => {
    const handleStepChanged = (e) => {
      setTutorialStep(e.detail.step);
    };
    const handleActiveChange = (e) => {
      const nextActive = !!e.detail;
      setIsTutorialActive(nextActive);
      if (!nextActive) {
        setTutorialStep(null);
      } else {
        setTutorialStep(0);
      }
    };
    window.addEventListener('tutorial-step-changed', handleStepChanged);
    window.addEventListener('tutorial-active-change', handleActiveChange);
    return () => {
      window.removeEventListener('tutorial-step-changed', handleStepChanged);
      window.removeEventListener('tutorial-active-change', handleActiveChange);
    };
  }, []);

  const [tooltipStack, setTooltipStack] = useState([]);
  const currentTooltip = tooltipStack[tooltipStack.length - 1];
  const activeTooltipWord = currentTooltip?.word || null;
  const tooltipDetails = currentTooltip?.details || null;
  const isSearchingTooltipWord = currentTooltip?.loading || false;
  const [isAddingTooltipWord, setIsAddingTooltipWord] = useState(false);

  const handleWordClick = (word) => {
    const cleaned = word.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"']/g, "").trim().toLowerCase();
    if (!cleaned) return;
    
    if (tooltipStack.length > 0 && tooltipStack[tooltipStack.length - 1].word === cleaned) {
      return;
    }

    playClickSound();
    setTooltipStack(prev => [...prev, { word: cleaned, loading: true, details: null }]);
    
    const local = vocab.find(v => v && v.word && v.word.toLowerCase() === cleaned);
    if (local) {
      let parsed = null;
      try {
        parsed = typeof local.meaning === 'string' ? JSON.parse(local.meaning) : local.meaning;
      } catch (e) {}
      
      const details = {
        definition: parsed?.englishExplanation?.definition || parsed?.meaning || 'No definition available',
        translation: parsed?.thaiTranslation?.word || parsed?.translation || 'ไม่มีคำแปล',
        pos: local.pos || parsed?.pos || 'n.',
        alreadyInDeck: true,
        rawDetails: parsed
      };
      
      setTooltipStack(prev => prev.map((item, idx) => 
        idx === prev.length - 1 && item.word === cleaned ? { ...item, loading: false, details } : item
      ));
    } else {
      getAiWordRichDetails(cleaned).then(details => {
        let detailsObj;
        if (details && !details.error) {
          detailsObj = {
            definition: details.englishExplanation?.definition || details.definition || 'No definition available',
            translation: details.thaiTranslation?.word || details.translation || 'ไม่มีคำแปล',
            pos: details.pos || 'n.',
            alreadyInDeck: false,
            rawDetails: details
          };
        } else {
          detailsObj = {
            definition: 'Could not fetch details for this word.',
            translation: 'ไม่พบข้อมูลคำศัพท์',
            pos: '',
            alreadyInDeck: false,
            rawDetails: null
          };
        }
        setTooltipStack(prev => prev.map((item, idx) => 
          idx === prev.length - 1 && item.word === cleaned ? { ...item, loading: false, details: detailsObj } : item
        ));
      }).catch(err => {
        console.error(err);
        const detailsObj = {
          definition: 'Error fetching details.',
          translation: 'เกิดข้อผิดพลาด',
          pos: '',
          alreadyInDeck: false,
          rawDetails: null
        };
        setTooltipStack(prev => prev.map((item, idx) => 
          idx === prev.length - 1 && item.word === cleaned ? { ...item, loading: false, details: detailsObj } : item
        ));
      });
    }
  };

  const handleAddWordFromTooltip = async (word, details) => {
    if (!word || !details || isAddingTooltipWord) return;
    setIsAddingTooltipWord(true);
    playClickSound();
    try {
      const res = await addWordToDeck(word, details);
      if (res.success) {
        setTooltipStack(prev => prev.map(item => 
          item.word === word ? { ...item, details: { ...item.details, alreadyInDeck: true } } : item
        ));
        setSourceToast({
          message: `Added "${word}" to your deck!`,
          type: 'live'
        });
      } else {
        setSourceToast({
          message: res.error || 'Failed to add word.',
          type: 'error'
        });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsAddingTooltipWord(false);
    }
  };

  const renderWordTooltip = () => {
    if (tooltipStack.length === 0) return null;
    return (
      <AnimatePresence>
        <div style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 15000,
          background: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)'
        }}
        onClick={() => {
          playClickSound();
          setTooltipStack(prev => prev.slice(0, -1));
        }}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '85%',
              maxWidth: '320px',
              background: 'radial-gradient(circle at 50% 0%, rgba(255, 255, 255, 0.08) 0%, rgba(10, 12, 17, 0.72) 100%)',
              backdropFilter: 'blur(20px)',
              borderRadius: '24px',
              border: '1px solid rgba(255,255,255,0.12)',
              boxShadow: '0 20px 50px rgba(0,0,0,0.6)',
              padding: '1.25rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem',
              position: 'relative'
            }}
          >
            {/* Close Button */}
            <button 
              onClick={() => {
                playClickSound();
                setTooltipStack(prev => prev.slice(0, -1));
              }}
              className="glass-button animate-scale"
              style={{
                position: 'absolute',
                top: '12px',
                right: '12px',
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                padding: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'rgba(255,255,255,0.03)',
                borderColor: 'rgba(255,255,255,0.08)',
                cursor: 'pointer'
              }}
            >
              <X size={10} color="white" />
            </button>

            {/* Word Row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap', marginRight: '24px' }}>
              <span style={{ fontSize: '1.4rem', fontWeight: 900, color: 'white', letterSpacing: '-0.01em' }}>
                {activeTooltipWord}
              </span>
              {tooltipDetails?.pos && (
                <span className="badge-neon" style={{ fontSize: '0.6rem' }}>{tooltipDetails.pos}</span>
              )}
            </div>

            {/* Content Area */}
            {isSearchingTooltipWord ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.45rem', padding: '1rem 0' }}>
                <Loader2 size={24} className="spin" color="rgba(255,255,255,0.7)" />
                <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px' }}>Searching word...</span>
              </div>
            ) : tooltipDetails ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.7rem' }}>
                {/* Definition */}
                <div>
                  <span style={{ fontSize: '0.55rem', textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: 800, display: 'block', letterSpacing: '0.5px', marginBottom: '1px' }}>English Definition</span>
                  <span style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.9)', lineHeight: '1.3' }}>
                    {renderInteractiveSentence(tooltipDetails.definition, null, handleWordClick)}
                  </span>
                </div>

                {/* Translation */}
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '0.5rem' }}>
                  <span style={{ fontSize: '0.55rem', textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: 800, display: 'block', letterSpacing: '0.5px', marginBottom: '1px' }}>Thai Translation</span>
                  <span style={{ fontSize: '0.95rem', color: '#34d399', fontWeight: 800 }}>
                    {tooltipDetails.translation}
                  </span>
                </div>

                {/* Add to Deck Button */}
                {!tooltipDetails.alreadyInDeck && (
                  <button
                    onClick={() => handleAddWordFromTooltip(activeTooltipWord, tooltipDetails.rawDetails)}
                    disabled={isAddingTooltipWord}
                    className="glass-button primary animate-scale"
                    style={{
                      marginTop: '0.4rem',
                      height: '38px',
                      borderRadius: '12px',
                      fontSize: '0.8rem',
                      padding: '0 1rem',
                      fontWeight: 800,
                      width: '100%'
                    }}
                  >
                    {isAddingTooltipWord ? (
                      <Loader2 size={14} className="spin" />
                    ) : (
                      <>
                        <PlusCircle size={14} />
                        <span>Add word to deck</span>
                      </>
                    )}
                  </button>
                )}

                {tooltipDetails.alreadyInDeck && (
                  <div style={{
                    marginTop: '0.4rem',
                    height: '38px',
                    borderRadius: '12px',
                    background: 'rgba(16, 185, 129, 0.04)',
                    border: '1px solid rgba(16, 185, 129, 0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    color: '#34d399',
                    fontSize: '0.78rem',
                    fontWeight: 800
                  }}>
                    <CheckCircle size={14} />
                    <span>Already in Deck</span>
                  </div>
                )}
              </div>
            ) : (
              <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', textAlign: 'center', padding: '1rem 0' }}>
                Failed to load word.
              </div>
            )}
          </motion.div>
        </div>
      </AnimatePresence>
    );
  };

  const hasContent = richCardData || isFilling;

  const translateX = useMotionValue(0);
  const rotateTranslate = useTransform(translateX, [-200, 200], [-10, 10]);
  const stampSaveOpacity = useTransform(translateX, [50, 150], [0, 1]);
  const stampDiscardOpacity = useTransform(translateX, [-50, -150], [0, 1]);
  const overlayTranslateGreen = useTransform(translateX, [50, 150], [0, 0.45]);
  const overlayTranslateRed = useTransform(translateX, [-50, -150], [0, 0.45]);

  useEffect(() => {
    const targetWord = richCardData?.word ? String(richCardData.word).toLowerCase().trim() : '';
    if (!targetWord || richCardData?.validation?.isInvalid) return;

    const hasBuiltInLexical =
      getLexicalList(richCardData, null, 'synonyms').length > 0 ||
      getLexicalList(richCardData, null, 'nearWords', 'relatedWords').length > 0 ||
      getLexicalList(richCardData, null, 'wordFamily', 'wordFamilies', 'family').length > 0;
    const fallbackStatus = lexicalFallback[targetWord]?.status;
    if (hasBuiltInLexical || fallbackStatus === 'loaded' || fallbackStatus === 'loading') return;

    let cancelled = false;
    setLexicalFallback(prev => ({
      ...prev,
      [targetWord]: { status: 'loading', synonyms: [], nearWords: [], wordFamily: [] }
    }));

    const fetchDatamuse = async (query) => {
      const controller = new AbortController();
      const timeoutId = window.setTimeout(() => controller.abort(), 3200);
      try {
        const response = await fetch(`https://api.datamuse.com/words?${query}`, {
          signal: controller.signal
        });
        if (!response.ok) return [];
        const data = await response.json();
        return Array.isArray(data) ? data : [];
      } catch {
        return [];
      } finally {
        window.clearTimeout(timeoutId);
      }
    };

    (async () => {
      const encoded = encodeURIComponent(targetWord);
      const [synonymsRaw, relatedRaw, triggerRaw, meansLikeRaw, familyRaw] = await Promise.all([
        fetchDatamuse(`rel_syn=${encoded}&max=12`),
        fetchDatamuse(`rel_trg=${encoded}&max=12`),
        fetchDatamuse(`ml=${encoded}&max=12`),
        fetchDatamuse(`ml=${encoded}&topics=${encoded}&max=12`),
        fetchDatamuse(`sp=${encoded}*&max=12`)
      ]);
      if (cancelled) return;

      const synonyms = uniqueLexicalWords(synonymsRaw, targetWord, 5);
      const nearWords = uniqueLexicalWords([...relatedRaw, ...triggerRaw, ...meansLikeRaw], targetWord, 6)
        .filter(item => !synonyms.includes(item));
      const wordFamily = targetWord.length >= 4
        ? uniqueLexicalWords(familyRaw, targetWord, 5)
          .filter(item => item.startsWith(targetWord.slice(0, Math.min(5, targetWord.length))))
        : [];

      setLexicalFallback(prev => ({
        ...prev,
        [targetWord]: { status: 'loaded', synonyms, nearWords, wordFamily }
      }));
    })();

    return () => {
      cancelled = true;
    };
    // lexicalFallback is intentionally omitted: adding it cancels the in-flight fallback request.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [richCardData]);

  const handleSaveWord = async () => {
    if (isSuccess || isExiting) return;
    const isTutorialActive = localStorage.getItem('memeng_tutorial_done') === 'false' && localStorage.getItem('memeng_tutorial_started') === 'true';
    if (isTutorialActive) {
      setIsExiting(true);
      setTimeout(() => {
        setIsSuccess(true);
        window.dispatchEvent(new CustomEvent('tutorial-word-saved'));
        setSourceToast({
          message: `Saved to deck! (Mock)`,
          type: 'live'
        });
      }, 500);
      return;
    }
    
    // Swipe Right / Save
    if (richCardData?.validation?.isInvalid) {
      const suggestion = richCardData.validation.suggestion;
      if (suggestion) {
        setIsExiting(true);
        setSourceToast({
          message: `Saving "${suggestion.toLowerCase()}"...`,
          type: 'live'
        });
        
        // Non-blocking background save
        (async () => {
          try {
            const richDetails = await getAiWordRichDetails(suggestion);
            const firstImagePrompt = richDetails.imagePrompts && richDetails.imagePrompts[0] 
              ? richDetails.imagePrompts[0] 
              : suggestion.trim().toLowerCase();
            const imageRes = await fetchVocabImage(firstImagePrompt, 'photo');
            const imgUrl = imageRes.url || `https://image.pollinations.ai/prompt/${encodeURIComponent(firstImagePrompt)}?width=500&height=400&model=flux&nologo=true`;
            
            const updatedRichData = {
              ...richDetails,
              savedSceneImages: [imgUrl]
            };
            
            await addWordToDeck(suggestion.trim().toLowerCase(), updatedRichData);
            window.dispatchEvent(new CustomEvent('tutorial-word-saved'));
            setSourceToast({
              message: `Saved "${suggestion.toLowerCase()}" to deck!`,
              type: 'live'
            });
          } catch (err) {
            console.error('Failed to auto-save suggestion:', err);
            setSourceToast({
              message: `Failed to save "${suggestion.toLowerCase()}"`,
              type: 'live'
            });
          }
        })();
      }
      window.dispatchEvent(new CustomEvent('tutorial-word-saved'));
      setTimeout(() => {
        handleClear();
      }, 300);
      return;
    }

    if (isAlreadyInDeck) {
      setIsExiting(true);
      window.dispatchEvent(new CustomEvent('tutorial-word-saved'));
      setTimeout(() => {
        handleClear();
      }, 300);
      return;
    }
    const targetWord = richCardData?.word ? String(richCardData.word).trim().toLowerCase() : String(wordInput).trim().toLowerCase();
    const selectedUrls = sceneImages.map(img => img?.url || null);
    const savedSceneImages = [...selectedUrls];
    
    const isExplicitlyPinned = selectedPrimaryImageIdx !== null;
    let primaryIdx = selectedPrimaryImageIdx;
    if (primaryIdx === null) {
      // Randomly pick 0 or 1
      primaryIdx = Math.floor(Math.random() * Math.min(2, savedSceneImages.length));
    }
    
    if (primaryIdx === 1 && savedSceneImages.length > 1) {
      // Swap index 0 and 1 so that the chosen image becomes the primary image (index 0)
      const temp = savedSceneImages[0];
      savedSceneImages[0] = savedSceneImages[1];
      savedSceneImages[1] = temp;
    }
    
    const updatedRichData = {
      ...richCardData,
      savedSceneImages: savedSceneImages,
      hasPinnedImage: isExplicitlyPinned
    };
    const res = await addWordToDeck(targetWord, updatedRichData);
    if (res.success) {
      setIsExiting(true);
      setIsSuccess(true);
      window.dispatchEvent(new CustomEvent('tutorial-word-saved'));
      setSourceToast({
        message: `Saved to deck!`,
        type: 'live'
      });
      // Auto-clear and return to search input after short transition delay
      setTimeout(() => {
        handleClear();
      }, 300);
    } else {
      setErrorMsg(res.error || 'Failed to save card.');
    }
  };

  const handleDiscardWord = () => {
    if (isSuccess || isExiting) return;
    const isTutorialActive = localStorage.getItem('memeng_tutorial_done') === 'false' && localStorage.getItem('memeng_tutorial_started') === 'true';
    if (isTutorialActive) {
      setIsExiting(true);
      setTimeout(() => {
        setIsSuccess(true);
        window.dispatchEvent(new CustomEvent('tutorial-word-saved'));
        setSourceToast({
          message: `Discarded! (Mock)`,
          type: 'live'
        });
      }, 500);
      return;
    }
    setIsExiting(true);
    setTimeout(() => {
      handleClear();
    }, 300);
  };

  const handleTranslateDragEnd = async (event, info) => {
    if (isSuccess || isExiting) return;
    const threshold = 80;
    if (info.offset.x > threshold) {
      await handleSaveWord();
    } else if (info.offset.x < -threshold) {
      handleDiscardWord();
    }
  };

  useEffect(() => {
    if (sourceToast) {
      const timer = setTimeout(() => {
        setSourceToast(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [sourceToast]);

  // Cycling messages for loading animation
  const loadingSteps = [
    "Consulting Gemini AI...",
    "Analyzing CEFR level & grammar...",
    "Drafting contextual dialogues...",
    "Matching Thai definitions...",
    "Locating visual art context...",
    "Scheduling Spaced Repetition..."
  ];

  useEffect(() => {
    let interval;
    if (isFilling) {
      setLoadingStep(0);
      interval = setInterval(() => {
        setLoadingStep((prev) => (prev + 1) % loadingSteps.length);
      }, 1300);
    }
    return () => clearInterval(interval);
  }, [isFilling]);

  const currentIndex = useRef(0);
  const isScrolling = useRef(false);

  const handleScrollToCard = (index) => {
    const cards = document.querySelectorAll('.snap-card');
    if (index < -1 || index >= cards.length) return;
    
    currentIndex.current = index;
    isScrolling.current = true;

    if (index === -1) {
      const scrollContainer = document.querySelector('.scrollable-content');
      if (scrollContainer) {
        scrollContainer.scrollTo({
          top: 0,
          behavior: 'smooth'
        });
      }
    } else {
      const targetCard = cards[index];
      if (targetCard) {
        targetCard.scrollIntoView({
          behavior: 'smooth',
          block: 'center'
        });
      }
    }

    setTimeout(() => {
      isScrolling.current = false;
    }, 650);
  };

  const updateDatabaseImages = (newSceneImgs) => {
    if (!newSceneImgs || newSceneImgs.length === 0) return;
    const mainImgUrl = newSceneImgs[0]?.url || null;
    const sceneImgsArray = newSceneImgs.map(img => img?.url || null);
    const targetWord = richCardData?.word 
      ? String(richCardData.word).trim().toLowerCase() 
      : String(wordInput).trim().toLowerCase();
    if (!targetWord) return;
    updateCardImages(targetWord, mainImgUrl, sceneImgsArray);
  };

  const handleCustomImageUpload = (sceneIdx, file) => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    setSceneImages(prev => {
      const next = [...prev];
      next[sceneIdx] = { url, source: 'Upload', loading: false };
      updateDatabaseImages(next);
      return next;
    });
  };

  const handleCustomKeywordSearch = async (sceneIdx, customKeyword) => {
    if (!customKeyword.trim()) return;
    
    setSceneImages(prev => {
      const next = [...prev];
      next[sceneIdx] = { url: null, source: 'none', loading: true };
      return next;
    });

    const result = await fetchVocabImage(customKeyword.trim(), 'photo');
    
    if (result && result.url) {
      try {
        await new Promise((resolve) => {
          const img = new Image();
          img.src = result.url;
          img.onload = resolve;
          img.onerror = resolve;
          setTimeout(resolve, 6000);
        });
      } catch (e) {}
    }

    setSceneImages(prev => {
      const next = [...prev];
      next[sceneIdx] = { ...result, loading: false };
      updateDatabaseImages(next);
      return next;
    });
  };

  const handleRegenImage = async (sceneIdx) => {
    if (!richCardData || !richCardData.scenes) return;

    setRegenCounts(prev => {
      const next = [...prev];
      next[sceneIdx] += 1;
      return next;
    });

    // Track previously seen URL for this scene to prevent showing it again
    const currentUrl = sceneImages[sceneIdx]?.url;
    if (currentUrl) {
      if (!imageHistoryRef.current[sceneIdx]) {
        imageHistoryRef.current[sceneIdx] = [];
      }
      if (!imageHistoryRef.current[sceneIdx].includes(currentUrl)) {
        imageHistoryRef.current[sceneIdx].push(currentUrl);
      }
    }

    // Clear current image and trigger the loader overlay state
    setSceneImages(prev => {
      const next = [...prev];
      next[sceneIdx] = { url: null, source: 'none', loading: true };
      return next;
    });

    const excluded = imageHistoryRef.current[sceneIdx] || [];
    const refreshCount = excluded.length;
    
    let keyword = richCardData.imagePrompts?.[sceneIdx] || wordInput;
    if (refreshCount >= 3) {
      if (richCardData.thaiTranslation?.word) {
        keyword = richCardData.thaiTranslation.word;
        console.log(`🔄 Refresh count >= 3. Using Thai translation query: "${keyword}"`);
      } else if (richCardData.scenes?.[sceneIdx]?.situation) {
        keyword = richCardData.scenes[sceneIdx].situation;
        console.log(`🔄 Refresh count >= 3. Using situation query: "${keyword}"`);
      }
    }

    const result = await fetchVocabImage(keyword, 'photo', excluded);

    // Preload image in Javascript background before showing it
    if (result && result.url) {
      try {
        await new Promise((resolve, reject) => {
          const img = new Image();
          img.src = result.url;
          img.onload = resolve;
          img.onerror = reject;
          setTimeout(resolve, 6000); // 6s fallback safety timeout
        });
      } catch (e) {
        console.warn('Preloading regenerated image failed:', e);
      }
    }

    setSceneImages(prev => {
      const next = [...prev];
      next[sceneIdx] = { ...result, loading: false };
      updateDatabaseImages(next);
      return next;
    });
  };

  const handleDownloadImage = async (url, filename) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename || 'scene-image.jpg';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.error("Failed to download image", err);
      window.open(url, '_blank');
    }
  };

  // Self-correcting mock card cleanup when tutorial is completed/reset
  useEffect(() => {
    const isDone = localStorage.getItem('memeng_tutorial_done') === 'true';
    if (isDone && richCardData?._provider === 'Offline Tutorial Mock') {
      handleClear();
    }
  }, [richCardData]);

  // Auto-scroll to center first card when translation completes
  useEffect(() => {
    if (richCardData) {
      setRegenCounts(richCardData.scenes ? richCardData.scenes.map(() => 0) : [0, 0]);
      setActiveSearchOverlays(richCardData.scenes ? richCardData.scenes.map(() => false) : [false, false]);
      setSelectedPrimaryImageIdx(0);
      imageHistoryRef.current = {};
      currentIndex.current = 0;
      const timer = setTimeout(() => {
        handleScrollToCard(0);
      }, 350);

      if (isTutorialActive) {
        setSceneImages([
          {
            url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=500&auto=format&fit=crop',
            source: 'Unsplash (Mock)'
          },
          {
            url: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=500&auto=format&fit=crop',
            source: 'Unsplash (Mock)'
          }
        ]);
        setSceneImagesLoading(false);
      } else if (richCardData && !richCardData.validation?.isInvalid && richCardData.scenes?.length) {
        setSceneImages([]);
        setSceneImagesLoading(true);
        Promise.all(
          richCardData.scenes.map((scene, idx) => {
            const keyword = richCardData.imagePrompts?.[idx] || richCardData.word || wordInput;
            return fetchVocabImage(keyword, 'photo');
          })
        ).then(results => {
          setSceneImages(results);
          setSceneImagesLoading(false);
          console.log('📸 Scene images loaded:', results);
          updateDatabaseImages(results);
        });
      }

      return () => clearTimeout(timer);
    }
  }, [richCardData]);

  // Paging scroll logic for Mouse Wheel & Touch Swipes
  useEffect(() => {
    const scrollContainer = document.querySelector('.scrollable-content');
    if (!scrollContainer || !hasContent) return;

    let touchStartY = 0;

    const handleWheel = (e) => {
      e.preventDefault();
      if (isScrolling.current) return;

      if (e.deltaY > 0) {
        handleScrollToCard(currentIndex.current + 1);
      } else if (e.deltaY < 0) {
        handleScrollToCard(currentIndex.current - 1);
      }
    };

    const handleTouchStart = (e) => {
      touchStartY = e.touches[0].clientY;
    };

    const handleTouchMove = (e) => {
      if (isScrolling.current) {
        e.preventDefault();
        return;
      }
      
      const touchEndY = e.touches[0].clientY;
      const diffY = touchStartY - touchEndY;

      if (Math.abs(diffY) > 35) { // 35px swipe detection
        e.preventDefault();
        if (diffY > 0) {
          handleScrollToCard(currentIndex.current + 1);
        } else {
          handleScrollToCard(currentIndex.current - 1);
        }
      }
    };

    scrollContainer.addEventListener('wheel', handleWheel, { passive: false });
    scrollContainer.addEventListener('touchstart', handleTouchStart, { passive: true });
    scrollContainer.addEventListener('touchmove', handleTouchMove, { passive: false });

    return () => {
      scrollContainer.removeEventListener('wheel', handleWheel);
      scrollContainer.removeEventListener('touchstart', handleTouchStart);
      scrollContainer.removeEventListener('touchmove', handleTouchMove);
    };
  }, [hasContent]);

  const renderHighlightedText = (text, targetWord) => {
    if (!text) return '';
    const strText = typeof text === 'string' ? text : JSON.stringify(text);
    const boldParts = strText.split('**');
    return boldParts.map((part, idx) => {
      if (idx % 2 === 1) {
        return (
          <span key={`bold-${idx}`} style={{ color: '#ef4444', fontWeight: 900 }}>
            {part}
          </span>
        );
      }
      
      if (!targetWord) return part;
      const escapedWord = targetWord.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
      const regex = new RegExp(`(\\b${escapedWord}\\b|\\b${escapedWord}s?\\b)`, 'gi');
      const subParts = part.split(regex);
      
      if (subParts.length === 1) return part;
      
      return subParts.map((subPart, subIdx) => {
        const isMatch = subPart.toLowerCase() === targetWord.toLowerCase() || 
                        subPart.toLowerCase() === (targetWord.toLowerCase() + 's');
        if (isMatch) {
          return (
            <span key={`match-${idx}-${subIdx}`} style={{ color: '#ef4444', fontWeight: 900 }}>
              {subPart}
            </span>
          );
        }
        return subPart;
      });
    });
  };

  const handleSpeak = (text) => {
    if (!text || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const cleanText = text.replace(/\*\*/g, '');
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = 'en-US';
    window.speechSynthesis.speak(utterance);
  };

  useEffect(() => {
    const handleTypeWordEvent = async (e) => {
      const targetWord = e.detail?.word || 'hello';
      setWordInput('');
      
      let typed = '';
      for (let i = 0; i < targetWord.length; i++) {
        await new Promise(resolve => setTimeout(resolve, 150));
        typed += targetWord[i];
        setWordInput(typed);
      }
      
      await new Promise(resolve => setTimeout(resolve, 400));
      performTranslation(targetWord);
    };

    const handleSaveWordEvent = async () => {
      if (isSuccess || isExiting || !richCardData) return;
      
      const isTutorialActive = localStorage.getItem('memeng_tutorial_done') === 'false' && localStorage.getItem('memeng_tutorial_started') === 'true';
      if (isTutorialActive) {
        setIsExiting(true);
        setTimeout(() => {
          setIsSuccess(true);
          window.dispatchEvent(new CustomEvent('tutorial-word-saved'));
          setSourceToast({
            message: `Saved to deck! (Mock)`,
            type: 'live'
          });
        }, 500);
        return;
      }
      
      if (isAlreadyInDeck) {
        setIsExiting(true);
        window.dispatchEvent(new CustomEvent('tutorial-word-saved'));
        setSourceToast({
          message: `Saved to deck!`,
          type: 'live'
        });
        setTimeout(() => {
          handleClear();
        }, 300);
        return;
      }
      
      const targetWord = richCardData.word ? String(richCardData.word).trim().toLowerCase() : String(wordInput).trim().toLowerCase();
      const selectedUrls = sceneImages.map(img => img?.url || null);
      const savedSceneImages = [...selectedUrls];
      
      const isExplicitlyPinned = selectedPrimaryImageIdx !== null;
      let primaryIdx = selectedPrimaryImageIdx;
      if (primaryIdx === null) {
        primaryIdx = Math.floor(Math.random() * Math.min(2, savedSceneImages.length));
      }
      if (primaryIdx === 1 && savedSceneImages.length > 1) {
        const temp = savedSceneImages[0];
        savedSceneImages[0] = savedSceneImages[1];
        savedSceneImages[1] = temp;
      }
      
      const updatedRichData = {
        ...richCardData,
        savedSceneImages: savedSceneImages,
        hasPinnedImage: isExplicitlyPinned
      };
      
      setIsExiting(true);
      const res = await addWordToDeck(targetWord, updatedRichData);
      if (res.success) {
        setIsSuccess(true);
        window.dispatchEvent(new CustomEvent('tutorial-word-saved'));
        setSourceToast({
          message: `Saved to deck!`,
          type: 'live'
        });
        setTimeout(() => {
          handleClear();
        }, 300);
      }
    };

    const handleResetEvent = () => {
      handleClear();
    };

    window.addEventListener('tutorial-type-word', handleTypeWordEvent);
    window.addEventListener('tutorial-save-word', handleSaveWordEvent);
    window.addEventListener('tutorial-reset', handleResetEvent);
    return () => {
      window.removeEventListener('tutorial-type-word', handleTypeWordEvent);
      window.removeEventListener('tutorial-save-word', handleSaveWordEvent);
      window.removeEventListener('tutorial-reset', handleResetEvent);
    };
  }, [vocab, richCardData, sceneImages, selectedPrimaryImageIdx, isAlreadyInDeck, wordInput]);

  const handleClear = () => {
    setWordInput('');
    setRichCardData(null);
    setIsSuccess(false);
    setIsExiting(false);
    setIsAlreadyInDeck(false);
    setExistingCard(null);
    setErrorMsg('');
    setSceneImages([]);
    setSceneImagesLoading(false);
  };

  const handleTranslate = async (e) => {
    if (e) e.preventDefault();
    const cleanWord = wordInput.trim().toLowerCase();
    if (!cleanWord) return;
    
    setWordInput(cleanWord); // Normalize input text box to lowercase
    
    // Limit to 50 characters
    if (cleanWord.length > 50) {
      setErrorMsg('Please enter a word or short phrase under 50 characters.');
      return;
    }
    
    // Allow English & Thai characters, numbers, spaces, and basic punctuation
    if (/[^a-zA-Z0-9\s\-\'\?!\.,;:\"()\u0e00-\u0e7f]/.test(cleanWord)) {
      setErrorMsg('Please enter English or Thai words/phrases only.');
      return;
    }
    await performTranslation(cleanWord);
  };

  const performTranslation = async (targetWord, forceValid = false) => {
    setIsFilling(true);
    setRichCardData(null);
    setIsSuccess(false);
    setIsAlreadyInDeck(false);
    setExistingCard(null);
    setErrorMsg('');

    const isTutorialActive = localStorage.getItem('memeng_tutorial_done') === 'false' && localStorage.getItem('memeng_tutorial_started') === 'true';
    if (isTutorialActive) {
      setTimeout(() => {
        const mockDetails = {
          word: targetWord || 'hello',
          pos: 'interjection',
          cefrLevel: 'A1',
          _provider: 'Offline Tutorial Mock',
          englishExplanation: {
            definition: 'Used as a greeting or to begin a telephone conversation.',
            phrase: 'Hello! How are you doing today?',
            phraseMeaning: 'สวัสดี! วันนี้คุณเป็นอย่างไรบ้าง?'
          },
          thaiTranslation: {
            word: 'สวัสดี',
            phrase: 'สวัสดี! วันนี้คุณเป็นอย่างไรบ้าง?'
          },
          scenes: [
            {
              situation: 'A warm greeting between friends meeting at a cafe',
              thaiDescription: 'เพื่อนทักทายกันอย่างอบอุ่นที่ร้านกาแฟ'
            },
            {
              situation: 'Greeting someone on a phone call politely',
              thaiDescription: 'การทักทายใครบางคนทางโทรศัพท์อย่างสุภาพ'
            }
          ],
          imagePrompts: [
            'A warm greeting between friends meeting at a cafe',
            'Greeting someone on a phone call politely'
          ],
          validation: {
            isInvalid: false,
            suggestion: null
          }
        };

        setRichCardData(mockDetails);
        setIsSuccess(false);
        
        setSceneImages([
          {
            url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=500&auto=format&fit=crop',
            source: 'Unsplash (Mock)'
          },
          {
            url: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=500&auto=format&fit=crop',
            source: 'Unsplash (Mock)'
          }
        ]);
        setSceneImagesLoading(false);
        setIsFilling(false);

        // Advance tutorial step 1 -> step 2
        window.dispatchEvent(new CustomEvent('tutorial-translated'));
      }, 600);
      return;
    }

    const isThaiInput = /[\u0e00-\u0e7f]/.test(targetWord);

    // 1. Check if word already exists in deck (skip if Thai input since deck stores English)
    if (!isThaiInput) {
      const existing = vocab.find(v => v && v.word && v.word.toLowerCase() === targetWord.toLowerCase());
      if (existing) {
        let parsed = null;
        try {
          if (typeof existing.meaning === 'object' && existing.meaning !== null) {
            parsed = existing.meaning;
          } else if (typeof existing.meaning === 'string' && existing.meaning.startsWith('{')) {
            parsed = JSON.parse(existing.meaning);
          }
        } catch (err) {
          console.error(err);
        }

        if (parsed) {
          parsed.word = targetWord;
          setRichCardData(parsed);

        } else {
          setRichCardData({
            word: targetWord,
            pos: existing.pos || 'n.',
            cefrLevel: existing.cefrLevel || 'C1',
            englishExplanation: { definition: existing.meaning, phrase: '', phraseMeaning: '' },
            thaiTranslation: { word: 'บันทึกอยู่ในเด็คแล้ว', phrase: '' }
          });
          setSourceToast({
            message: `Loaded from Local Storage (Legacy Card)`,
            type: 'cache'
          });
        }

        setExistingCard(existing);
        setIsAlreadyInDeck(true);
        setIsFilling(false);
        window.dispatchEvent(new CustomEvent('tutorial-translated'));
        return;
      }
    }

    // 2. Query AI
    try {
      const startTime = Date.now();
      const details = await getAiWordRichDetails(targetWord, forceValid);
      const duration = ((Date.now() - startTime) / 1000).toFixed(1);
      
      if (details) {
        if (details.error) {
          const errLower = details.error.toLowerCase();
          const geminiHit429 = details.error.includes('429') && details.error.includes('Gemini');
          const groqHit429 = details.error.includes('429') && details.error.includes('Groq');
          const bothFailed = details.error.includes('Gemini:') && details.error.includes('Groq:');

          if (geminiHit429 && !groqHit429 && !bothFailed) {
            setErrorMsg('⚡ Gemini rate limit hit — Groq fallback also unavailable. Try again shortly.');
          } else if ((geminiHit429 || groqHit429) && bothFailed) {
            setErrorMsg('⏳ Both Gemini & Groq hit rate limits at the same time. This happens if you translated many words rapidly. Please wait ~1 minute and try again.');
          } else if (errLower.includes('429') || errLower.includes('quota')) {
            let countdown = 60;
            const interval = setInterval(() => {
              countdown -= 1;
              if (countdown > 0) {
                setErrorMsg(`⏳ API rate limit reached. Retrying automatically in ${countdown}s...`);
              } else {
                clearInterval(interval);
                performTranslation(targetWord);
              }
            }, 1000);
            setErrorMsg(`⏳ API rate limit reached. Retrying automatically in ${countdown}s...`);
            return;
          } else if (details.error.includes('API_KEY_INVALID') || details.error.includes('API key not valid')) {
            setErrorMsg('Invalid Gemini API Key. Please verify your key in .env.local.');
          } else {
            setErrorMsg(`API Error: ${details.error}`);
          }
        } else if (details.validation?.isInvalid) {
          // If suggestion / invalid input, display suggestion card without auto-saving
          details.word = targetWord;
          setRichCardData(details);
          setIsSuccess(false);
          setIsAlreadyInDeck(false);

        } else {
          // 3. Present swipe-to-save preview card (don't save automatically)
          const isThaiInput = /[\u0e00-\u0e7f]/.test(targetWord);
          if (isThaiInput) {
            const translatedEnglishWord = String(details.word || '').trim().toLowerCase();
            
            if (translatedEnglishWord) {
              // Since it's a Thai search input, check if this translated English word is already in the deck!
              const existingEng = vocab.find(v => v && v.word && v.word.toLowerCase() === translatedEnglishWord);
              if (existingEng) {
                setIsAlreadyInDeck(true);
                setExistingCard(existingEng);
                let cached = null;
                try {
                  if (typeof existingEng.meaning === 'object' && existingEng.meaning !== null) {
                    cached = existingEng.meaning;
                  } else if (typeof existingEng.meaning === 'string' && existingEng.meaning.startsWith('{')) {
                    cached = JSON.parse(existingEng.meaning);
                  }
                } catch (err) {}
                if (cached) {
                  cached.word = translatedEnglishWord;
                  setRichCardData(cached);
                } else {
                  setRichCardData({
                    word: translatedEnglishWord,
                    pos: existingEng.pos || 'n.',
                    cefrLevel: existingEng.cefrLevel || 'C1',
                    englishExplanation: { definition: existingEng.meaning, phrase: '', phraseMeaning: '' },
                    thaiTranslation: { word: 'บันทึกอยู่ในเด็คแล้ว', phrase: '' }
                  });
                }
                setIsFilling(false);
                return;
              }

              // If not in deck, present suggestion box suggesting the translated English word first!
              details.validation = {
                isInvalid: true,
                suggestion: translatedEnglishWord,
                thaiTranslationShort: targetWord,
                englishExplanationShort: details.englishExplanation?.definition || ''
              };
              details.word = targetWord; // keeps the Thai input to identify it in UI
              
              setRichCardData(details);
              setIsSuccess(false);
              setSourceToast({
                message: `Suggested English translation: "${translatedEnglishWord}"`,
                type: 'live'
              });
              setIsFilling(false);
              return;
            }
          } else {
            details.word = targetWord;
          }
          
          setRichCardData(details);
          setIsSuccess(false);

          window.dispatchEvent(new CustomEvent('tutorial-translated'));
        }
      } else {
        setErrorMsg('Failed to translate word. Please verify your Gemini API Key in .env.local.');
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('An error occurred during translation.');
    } finally {
      setIsFilling(false);
    }
  };

  const loadRecentWord = (card) => {
    setWordInput(card.word.toLowerCase());
    let parsed = null;
    try {
      if (typeof card.meaning === 'object' && card.meaning !== null) {
        parsed = card.meaning;
      } else if (typeof card.meaning === 'string' && card.meaning.startsWith('{')) {
        parsed = JSON.parse(card.meaning);
      }
    } catch (e) {}

    if (parsed) {
      parsed.word = card.word.toLowerCase();
      setRichCardData(parsed);

    } else {
      setRichCardData({
        word: card.word.toLowerCase(),
        pos: card.pos || 'n.',
        cefrLevel: card.cefrLevel || 'C1',
        englishExplanation: { definition: card.meaning, phrase: '', phraseMeaning: '' },
        thaiTranslation: { word: card.meaning, phrase: '' }
      });
      setSourceToast({
        message: `Loaded from Local Storage (Legacy Card)`,
        type: 'cache'
      });
    }
    setExistingCard(card);
    setIsAlreadyInDeck(true);
    setIsSuccess(false);
    setErrorMsg('');
  };

  const formatReviewTime = (dateStr) => {
    if (!dateStr) return 'now';
    const diff = new Date(dateStr) - new Date();
    if (diff <= 0) return 'Due today';
    const hrs = Math.ceil(diff / 3600000);
    if (hrs < 24) return `due in ${hrs} hr${hrs > 1 ? 's' : ''}`;
    const days = Math.round(hrs / 24);
    return `due in ${days} day${days > 1 ? 's' : ''}`;
  };

  // Framer Motion variants for active center focus snapping
  const focusVariants = {
    offscreen: { 
      opacity: 0.25, 
      scale: 0.93,
      filter: 'blur(0.8px)',
      borderColor: 'rgba(255, 255, 255, 0.03)',
      background: 'rgba(255, 255, 255, 0.01)',
      boxShadow: '0 4px 15px rgba(0, 0, 0, 0.2)'
    },
    onscreen: { 
      opacity: 1, 
      scale: 1.02,
      filter: 'blur(0px)',
      borderColor: 'rgba(255, 255, 255, 0.15)',
      background: 'rgba(255, 255, 255, 0.04)',
      boxShadow: '0 20px 45px rgba(0, 0, 0, 0.55), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
      transition: {
        type: 'spring',
        stiffness: 180,
        damping: 22
      }
    }
  };



  return (
    <div 
      style={{ 
        position: 'relative', 
        width: '100%', 
        height: '100%', 
        display: 'flex', 
        flexDirection: 'column', 
        overflow: 'hidden' 
      }}
    >
      {richCardData && !isFilling && !isSuccess && !isExiting && (
        <motion.button
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.85 }}
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.94 }}
          onClick={(e) => {
            e.stopPropagation();
            handleClear();
          }}
          className="glass-button animate-scale"
          title="Close translation"
          style={{
            position: 'absolute',
            top: '82px',
            right: '24px',
            width: '34px',
            height: '34px',
            borderRadius: '50%',
            padding: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(15, 18, 24, 0.72)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            color: 'rgba(255, 255, 255, 0.78)',
            boxShadow: '0 10px 24px rgba(0, 0, 0, 0.35)',
            zIndex: 100004,
            cursor: 'pointer'
          }}
        >
          <X size={17} />
        </motion.button>
      )}
      {/* Fixed Swipe Feedback Overlay */}
      {!isSuccess && !isExiting && richCardData && (
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 100002 }}>
          {/* Green and Red background glows on swipe */}
          <motion.div style={{ position: 'absolute', inset: 0, background: 'rgba(16, 185, 129, 0.4)', opacity: overlayTranslateGreen, mixBlendMode: 'overlay' }} />
          <motion.div style={{ position: 'absolute', inset: 0, background: 'rgba(239, 68, 68, 0.4)', opacity: overlayTranslateRed, mixBlendMode: 'overlay' }} />
          
          {/* Stamps */}
          {isAlreadyInDeck ? (
            <>
              <motion.div
                style={{
                  position: 'absolute', top: '35%', left: '30px', opacity: stampSaveOpacity, rotate: -12, 
                  border: '4px solid #10b981', borderRadius: '12px', padding: '0.4rem 0.8rem', color: '#10b981', fontWeight: 900, fontSize: '1.4rem',
                  textTransform: 'uppercase', background: 'rgba(10, 8, 20, 0.9)', display: 'flex', gap: '6px', alignItems: 'center', boxShadow: '0 8px 25px rgba(16,185,129,0.3)'
                }}
              >
                <CheckCircle size={24} /> BACK
              </motion.div>
              
              <motion.div
                style={{
                  position: 'absolute', top: '35%', right: '30px', opacity: stampDiscardOpacity, rotate: 12, 
                  border: '4px solid #ef4444', borderRadius: '12px', padding: '0.4rem 0.8rem', color: '#ef4444', fontWeight: 900, fontSize: '1.4rem',
                  textTransform: 'uppercase', background: 'rgba(10, 8, 20, 0.9)', display: 'flex', gap: '6px', alignItems: 'center', boxShadow: '0 8px 25px rgba(239,68,68,0.3)'
                }}
              >
                <X size={24} /> BACK
              </motion.div>
            </>
          ) : richCardData.validation?.isInvalid ? (
            <>
              <motion.div
                style={{
                  position: 'absolute', top: '35%', left: '30px', opacity: stampSaveOpacity, rotate: -12, 
                  border: '4px solid #10b981', borderRadius: '12px', padding: '0.4rem 0.8rem', color: '#10b981', fontWeight: 900, fontSize: '1.4rem',
                  textTransform: 'uppercase', background: 'rgba(10, 8, 20, 0.9)', display: 'flex', gap: '6px', alignItems: 'center', boxShadow: '0 8px 25px rgba(16,185,129,0.3)'
                }}
              >
                <CheckCircle size={24} /> SAVE
              </motion.div>
              
              <motion.div
                style={{
                  position: 'absolute', top: '35%', right: '30px', opacity: stampDiscardOpacity, rotate: 12, 
                  border: '4px solid #ef4444', borderRadius: '12px', padding: '0.4rem 0.8rem', color: '#ef4444', fontWeight: 900, fontSize: '1.4rem',
                  textTransform: 'uppercase', background: 'rgba(10, 8, 20, 0.9)', display: 'flex', gap: '6px', alignItems: 'center', boxShadow: '0 8px 25px rgba(239,68,68,0.3)'
                }}
              >
                <X size={24} /> BACK
              </motion.div>
            </>
          ) : (
            <>
              <motion.div
                style={{
                  position: 'absolute', top: '35%', left: '30px', opacity: stampSaveOpacity, rotate: -12, 
                  border: '4px solid #10b981', borderRadius: '12px', padding: '0.4rem 0.8rem', color: '#10b981', fontWeight: 900, fontSize: '1.4rem',
                  textTransform: 'uppercase', background: 'rgba(10, 8, 20, 0.9)', display: 'flex', gap: '6px', alignItems: 'center', boxShadow: '0 8px 25px rgba(16,185,129,0.3)'
                }}
              >
                <CheckCircle size={24} /> SAVE
              </motion.div>
              
              <motion.div
                style={{
                  position: 'absolute', top: '35%', right: '30px', opacity: stampDiscardOpacity, rotate: 12, 
                  border: '4px solid #ef4444', borderRadius: '12px', padding: '0.4rem 0.8rem', color: '#ef4444', fontWeight: 900, fontSize: '1.4rem',
                  textTransform: 'uppercase', background: 'rgba(10, 8, 20, 0.9)', display: 'flex', gap: '6px', alignItems: 'center', boxShadow: '0 8px 25px rgba(239,68,68,0.3)'
                }}
              >
                <Trash2 size={24} /> DISCARD
              </motion.div>
            </>
          )}
        </div>
      )}


      <div 
        className={`scrollable-content ${hasContent ? 'snap-container' : ''}`} 
        onClick={(e) => {
          if (richCardData && !e.target.closest('.snap-card') && !e.target.closest('button') && !e.target.closest('form')) {
            handleClear();
          }
        }}
        style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          boxSizing: 'border-box', 
          paddingTop: '65px', 
          paddingBottom: '24px', 
          height: '100%',
          width: '100%',
          overflowY: 'auto'
        }}
      >
        <motion.div 
          layout
          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
          style={{ 
            maxWidth: '650px', 
            width: '100%', 
            padding: '0 0.25rem',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            position: 'relative'
          }}
        >
          {/* Google Translate Style Large Input Area */}
        {(!richCardData || isFilling) && (
          <div 
            id="tutorial-translate-input"
            className="glass-panel" 
            style={{ 
              padding: '1.25rem', 
              marginBottom: '1.25rem', 
              background: 'var(--card-bg)', 
              backdropFilter: 'blur(24px)',
              WebkitBackdropFilter: 'blur(24px)',
              border: '1px solid var(--card-border)',
              borderRadius: '24px',
              position: 'relative',
              transition: 'border-color 0.3s ease, box-shadow 0.3s ease'
            }}
          >
            <form onSubmit={handleTranslate} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'flex-start' }}>
                <textarea
                  value={wordInput}
                  maxLength={50}
                  onChange={(e) => {
                    const val = e.target.value;
                    const isTutorial = localStorage.getItem('memeng_tutorial_done') === 'false' && localStorage.getItem('memeng_tutorial_started') === 'true';
                    
                    if (isTutorial && tutorialStep === 0) {
                      const target = "hello";
                      if (val.trim().toLowerCase() === 'hello') {
                        setWordInput('hello');
                        window.dispatchEvent(new CustomEvent('tutorial-typed-hello'));
                        return;
                      }
                      const currentLength = wordInput.length;
                      if (val.length < currentLength) {
                        setWordInput(val);
                      } else {
                        const nextChar = target[currentLength];
                        if (nextChar) {
                          const newVal = wordInput + nextChar;
                          setWordInput(newVal);
                          if (newVal.toLowerCase() === "hello") {
                            window.dispatchEvent(new CustomEvent('tutorial-typed-hello'));
                          }
                        }
                      }
                      return;
                    }

                    // Allow English letters, Thai characters (\u0e00-\u0e7f), numbers, spaces, and basic English punctuation
                    let cleaned = val.replace(/[^a-zA-Z0-9\s\-\'\?!\.,;:\"()\u0e00-\u0e7f]/g, '');
                    if (cleaned.length > 50) {
                      cleaned = cleaned.slice(0, 50);
                    }
                    setWordInput(cleaned);
                    if (!cleaned.trim()) {
                      setRichCardData(null);
                      setIsSuccess(false);
                      setIsAlreadyInDeck(false);
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleTranslate();
                    }
                  }}
                  placeholder="Enter English to translate..."
                  disabled={isFilling}
                  rows={2}
                  style={{
                    width: '100%',
                    background: 'transparent',
                    border: 'none',
                    color: 'white',
                    fontSize: '1.5rem',
                    fontWeight: 800,
                    outline: 'none',
                    resize: 'none',
                    fontFamily: 'inherit',
                    paddingRight: '2.5rem',
                    lineHeight: 1.3
                  }}
                />

                {wordInput && (
                  <button
                    type="button"
                    onClick={handleClear}
                    style={{
                      position: 'absolute',
                      right: 0,
                      top: '4px',
                      background: 'rgba(255,255,255,0.06)',
                      border: 'none',
                      borderRadius: '50%',
                      width: '24px',
                      height: '24px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--text-secondary)',
                      cursor: 'pointer'
                    }}
                  >
                    <X size={13} />
                  </button>
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '0.75rem', marginTop: '0.25rem' }}>
                <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.3)', fontWeight: 600 }}>
                  Press Enter to Translate & Save
                </span>
                <button
                  id="tutorial-translate-submit-btn"
                  type="submit"
                  disabled={isFilling || !wordInput.trim() || (localStorage.getItem('memeng_tutorial_done') === 'false' && localStorage.getItem('memeng_tutorial_started') === 'true' && wordInput.toLowerCase().trim() !== 'hello')}
                  className="glass-button primary animate-scale"
                  style={{
                    borderRadius: '12px',
                    padding: '0.5rem 1.1rem',
                    fontSize: '0.8rem',
                    minHeight: '34px'
                  }}
                >
                  {isFilling ? (
                    <Loader2 size={14} className="spin" />
                  ) : (
                    <>
                      <Sparkles size={13} />
                      <span>Translate</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Loading Pulsing State */}
        <AnimatePresence>
          {isFilling && (
            <motion.div 
              key="loading-pulsing"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="glass-panel"
              style={{ 
                padding: '2.2rem 1.5rem', 
                textAlign: 'center', 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center', 
                gap: '1rem',
                background: 'rgba(255, 255, 255, 0.01)',
                border: '1px solid var(--card-border)',
                marginBottom: '1.25rem'
              }}
            >
              <div style={{ position: 'relative', width: '56px', height: '56px' }}>
                <div style={{
                  position: 'absolute',
                  inset: 0,
                  borderRadius: '50%',
                  border: '3px solid rgba(255, 255, 255, 0.08)',
                  borderTopColor: 'var(--text-primary)',
                  animation: 'spin 1s linear infinite'
                }} />
                <div style={{
                  position: 'absolute',
                  inset: 5,
                  borderRadius: '50%',
                  background: 'rgba(255, 255, 255, 0.02)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Sparkles size={18} color="var(--accent-hover)" className="pulse" />
                </div>
              </div>

              <div>
                <h4 style={{ color: 'white', fontSize: '0.95rem', fontWeight: 800, margin: '0 0 0.2rem 0' }}>AI is translating...</h4>
                <p style={{ 
                  margin: 0, 
                  fontSize: '0.75rem', 
                  color: 'var(--text-secondary)', 
                  fontWeight: 600,
                  minHeight: '18px'
                }}>
                  {loadingSteps[loadingStep]}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Error Banner */}
        {errorMsg && (
          <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', padding: '0.85rem', borderRadius: '12px', fontSize: '0.8rem', border: '1px solid rgba(239, 68, 68, 0.2)', marginBottom: '1.25rem', fontWeight: 600 }}>
            {errorMsg}
          </div>
        )}

        {/* Dynamic Display (Scroll Snapping Reveal OR Idle Recent list) */}
        <AnimatePresence mode="wait">
          {richCardData && !isFilling ? (
            richCardData.validation?.isInvalid ? (
              /* SUGGESTION CARD FOR TYPOS/GIBBERISH */
              <motion.div
                key="invalid-card"
                drag={isExiting ? false : "x"}
                dragConstraints={{ left: 0, right: 0 }}
                dragSnapToOrigin={true}
                onDragEnd={handleTranslateDragEnd}
                initial="offscreen"
                whileInView="onscreen"
                exit="offscreen"
                viewport={{ once: false, amount: 0.15, margin: "-22% 0px -22% 0px" }}
                variants={focusVariants}
                className="snap-card glass-panel"
                style={{
                  padding: '1.75rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1.25rem',
                  width: '100%',
                  marginTop: '2vh',
                  marginBottom: '10vh',
                  textAlign: 'center',
                  border: /[\u0e00-\u0e7f]/.test(richCardData.word || '') ? '1px solid rgba(167, 139, 250, 0.25)' : '1px solid rgba(239, 68, 68, 0.2)',
                  background: /[\u0e00-\u0e7f]/.test(richCardData.word || '') ? 'rgba(167, 139, 250, 0.02)' : 'rgba(239, 68, 68, 0.02)',
                  x: translateX,
                  rotate: rotateTranslate,
                  touchAction: 'pan-y',
                  position: 'relative',
                  userSelect: 'none',
                  WebkitUserSelect: 'none',
                  cursor: isExiting ? 'default' : 'grab'
                }}
              >
                {/* Swipe Overlay indicators for Suggestion Card */}
                <div>
                  <span style={{ fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: /[\u0e00-\u0e7f]/.test(richCardData.word || '') ? '#a78bfa' : '#ef4444', fontWeight: 800 }}>
                    {/[\u0e00-\u0e7f]/.test(richCardData.word || '') ? 'Thai Translation' : 'Typo or Invalid Word'}
                  </span>
                  <h3 style={{ fontSize: '1.3rem', fontWeight: 900, color: 'white', marginTop: '0.35rem' }}>
                    {/[\u0e00-\u0e7f]/.test(richCardData.word || '') ? 'English Suggestion' : 'Did you mean?'}
                  </h3>
                </div>

                {richCardData.validation.suggestion ? (
                  <div style={{ 
                    padding: '1.25rem', 
                    background: 'rgba(255, 255, 255, 0.02)', 
                    border: '1px solid rgba(255, 255, 255, 0.07)', 
                    borderRadius: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.75rem',
                    textAlign: 'left'
                  }}>
                    {/* Suggested word title */}
                    <div style={{ fontSize: '1.35rem', fontWeight: 900, color: 'var(--text-primary)', borderBottom: '1px solid rgba(255, 255, 255, 0.05)', paddingBottom: '0.5rem' }}>
                      {String(richCardData.validation.suggestion || '')}
                    </div>

                    {/* Quick Thai Translation */}
                    {richCardData.validation.thaiTranslationShort && (
                      <div>
                        <span style={{ fontSize: '0.55rem', textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: 800, display: 'block', marginBottom: '0.15rem' }}>แปลไทย (Thai Translation)</span>
                        <p style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: '#f1f5f9' }}>
                          {richCardData.validation.thaiTranslationShort}
                        </p>
                      </div>
                    )}

                    {/* Short English definition */}
                    {richCardData.validation.englishExplanationShort && (
                      <div>
                        <span style={{ fontSize: '0.55rem', textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: 800, display: 'block', marginBottom: '0.15rem' }}>English Definition</span>
                        <p style={{ margin: 0, fontSize: '0.8rem', color: 'rgba(255,255,255,0.7)', lineHeight: 1.3 }}>
                          {richCardData.validation.englishExplanationShort}
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    No suggestion found. Please check your spelling.
                  </p>
                )}

                {richCardData.validation.suggestion && (
                  <button
                    onClick={() => {
                      const sugg = String(richCardData.validation.suggestion || '').toLowerCase();
                      setWordInput(sugg);
                      performTranslation(sugg, true);
                    }}
                    className="glass-button primary animate-scale"
                    style={{
                      borderRadius: '14px',
                      padding: '0.75rem 1.25rem',
                      fontSize: '0.85rem',
                      fontWeight: 800,
                      gap: '0.4rem',
                      marginTop: '0.5rem'
                    }}
                  >
                    <Sparkles size={14} />
                    <span>Translate "{String(richCardData.validation.suggestion || '').toLowerCase()}"</span>
                  </button>
                )}
              </motion.div>
            ) : (
              <motion.div 
                key="valid-card-wrapper"
                exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
                drag={(isSuccess || isExiting || tutorialStep === 2 || tutorialStep === 3) ? false : "x"}
                dragConstraints={{ left: 0, right: 0 }}
                dragSnapToOrigin={true}
                onDragEnd={handleTranslateDragEnd}
                className="results-drag-wrapper"
                animate={(!isSuccess && !isExiting && tutorialStep === 3) ? {
                  x: [0, 135, 0, -135, 0],
                  rotate: [0, 9, 0, -9, 0],
                  transition: { repeat: Infinity, duration: 3.2, ease: 'easeInOut', repeatDelay: 0.8 }
                } : undefined}
                style={{ 
                  x: translateX, 
                  rotate: rotateTranslate,
                  display: 'flex', 
                  flexDirection: 'column', 
                  width: '100%',
                  touchAction: 'pan-y',
                  position: 'relative',
                  userSelect: 'none',
                  WebkitUserSelect: 'none',
                  cursor: isSuccess || isExiting ? 'default' : 'grab'
                }}
              >
                {/* Top spacer to allow vertical centering of the first card */}
                <div style={{ height: '12vh', flexShrink: 0 }} />

                {/* Swipe Overlay indicators */}
              
                {/* Dictionary Header + Common Collocation */}
                <motion.div
                  ref={firstCardRef}
                  initial="offscreen"
                  whileInView="onscreen"
                  viewport={{ once: false, amount: 0.15, margin: "-22% 0px -22% 0px" }}
                  variants={focusVariants}
                  className="snap-card"
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '1rem',
                    width: '100%',
                    marginTop: '2vh',
                    marginBottom: '10vh'
                  }}
                >
                  {/* Dictionary Header Card */}
                  <div className="glass-panel" style={{ padding: '1.5rem', width: '100%' }}>
                    {/* Notification Banner */}
                    {isSuccess && (
                      <div style={{ 
                        background: 'rgba(16, 185, 129, 0.08)', 
                        border: '1px solid rgba(16, 185, 129, 0.2)', 
                        color: '#10b981', 
                        padding: '0.65rem 0.85rem', 
                        borderRadius: '12px', 
                        fontSize: '0.75rem', 
                        fontWeight: 800,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        boxShadow: '0 4px 15px rgba(16, 185, 129, 0.06)',
                        marginBottom: '0.8rem'
                      }}>
                        <CheckCircle size={14} />
                        <span>Saved to Flashcards</span>
                      </div>
                    )}
                    
                    {isAlreadyInDeck && existingCard && (
                      <div style={{ 
                        background: 'rgba(255, 255, 255, 0.03)', 
                        border: '1px solid rgba(255, 255, 255, 0.08)', 
                        color: 'var(--text-secondary)', 
                        padding: '0.65rem 0.85rem', 
                        borderRadius: '12px', 
                        fontSize: '0.75rem', 
                        fontWeight: 800,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        boxShadow: '0 4px 15px rgba(255, 255, 255, 0.02)',
                        marginBottom: '0.8rem'
                      }}>
                        <History size={14} />
                        <span>In Deck ({existingCard.srsLevel} | {formatReviewTime(existingCard.nextReviewDate)})</span>
                      </div>
                    )}

                    {/* Word Title + Pronounce */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: richCardData.morphNote ? 'none' : '1px solid rgba(255, 255, 255, 0.06)', paddingBottom: richCardData.morphNote ? '0.3rem' : '0.65rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <h2 style={{ fontSize: '1.6rem', fontWeight: 900, margin: 0, color: 'white' }}>
                          {wordInput}
                        </h2>
                        <span className="badge-neon" style={{ fontSize: '0.65rem' }}>{richCardData.pos || 'n.'}</span>
                        <span className="badge-cyan" style={{ fontSize: '0.65rem' }}>{richCardData.cefrLevel || 'C1'}</span>
                      </div>

                      <button 
                        onClick={() => handleSpeak(wordInput)}
                        className="glass-button animate-scale"
                        style={{ 
                          width: '32px', 
                          height: '32px', 
                          borderRadius: '50%', 
                          padding: 0, 
                          borderColor: 'rgba(255,255,255,0.06)', 
                          background: 'rgba(255,255,255,0.03)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                        title="Pronounce word"
                      >
                        <Volume2 size={14} color="var(--accent-hover)" />
                      </button>
                    </div>

                    {/* English Explanation */}
                    <div style={{ marginTop: '0.8rem' }}>
                      <span style={{ fontSize: '0.6rem', textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: 800, display: 'block', letterSpacing: '0.5px', marginBottom: '0.15rem' }}>English Definition</span>
                      <p style={{ margin: 0, fontSize: '0.85rem', color: 'rgba(255,255,255,0.95)', lineHeight: 1.4 }}>
                        {renderInteractiveSentence(String(richCardData.englishExplanation?.definition || ''), null, handleWordClick)}
                      </p>
                    </div>
                  </div>

                  {/* Common Collocation Card */}
                  {richCardData.englishExplanation?.phrase && (
                    <div className="glass-panel" style={{ padding: '1.25rem', width: '100%' }}>
                      <span style={{ fontSize: '0.55rem', textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: 800, display: 'block', letterSpacing: '0.5px' }}>Common Collocation</span>
                      
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem', marginTop: '0.4rem' }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '1rem', fontWeight: 800, color: 'white', lineHeight: 1.2 }}>
                            {renderInteractiveSentence(String(richCardData.englishExplanation.phrase || ''), null, handleWordClick)}
                          </div>
                          <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)', marginTop: '0.25rem' }}>
                            {renderInteractiveSentence(String(richCardData.englishExplanation.phraseMeaning || ''), null, handleWordClick)}
                          </div>
                        </div>
                        <button 
                          onClick={() => handleSpeak(String(richCardData.englishExplanation.phrase || ''))}
                          className="glass-button animate-scale"
                          style={{ 
                            width: '28px', 
                            height: '28px', 
                            borderRadius: '50%', 
                            padding: 0, 
                            borderColor: 'rgba(255,255,255,0.06)', 
                            background: 'rgba(255,255,255,0.02)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0
                          }}
                        >
                          <Volume2 size={12} color="rgba(255,255,255,0.5)" />
                        </button>
                      </div>
                    </div>
                  )}
                </motion.div>

                {/* Slide 2: Visual Context — Real Photos */}
                {richCardData.scenes && (
                  <motion.div
                    initial="offscreen"
                    whileInView="onscreen"
                    viewport={{ once: false, amount: 0.15, margin: "-22% 0px -22% 0px" }}
                    variants={focusVariants}
                    className="snap-card glass-panel"
                    style={{
                      padding: '1.25rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.75rem',
                      width: '100%',
                      marginBottom: '18vh'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.55rem', textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: 800, letterSpacing: '0.5px' }}>Visual Context</span>
                      {sceneImagesLoading && (
                        <span style={{ fontSize: '0.5rem', color: 'rgba(255,255,255,0.3)', fontWeight: 600 }}>loading photos…</span>
                      )}
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                      {richCardData.scenes?.map((scene, idx) => {
                        const imgData = sceneImages[idx];
                        const isLoading = sceneImagesLoading && !imgData;
                        const isRegenerating = imgData?.loading;


                        return (
                          <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            <div
                              className="image-card-container"
                              onClick={() => {
                                if (imgData?.url && !isLoading) {
                                  setActiveImageControlsIdx(prev => prev === idx ? null : idx);
                                }
                              }}
                              style={{
                                position: 'relative',
                                borderRadius: '14px',
                                overflow: 'hidden',
                                height: '160px',
                                background: 'rgba(255,255,255,0.03)',
                                border: selectedPrimaryImageIdx === idx ? '2px solid rgba(255, 255, 255, 0.55)' : '1px solid rgba(255,255,255,0.06)',
                                cursor: (imgData?.url && !isLoading) ? 'pointer' : 'default',
                                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                                boxShadow: selectedPrimaryImageIdx === idx ? '0 8px 25px rgba(255, 255, 255, 0.08)' : 'none'
                              }}
                            >
                              {/* Loading spinner */}
                              {isLoading && (
                                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', flexDirection: 'column' }}>
                                  <div style={{ width: '28px', height: '28px', borderRadius: '50%', border: '2px solid rgba(255,255,255,0.1)', borderTopColor: 'rgba(255,255,255,0.5)', animation: 'spin 1s linear infinite' }} />
                                  <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.3)', fontWeight: 600 }}>Fetching photo…</span>
                                </div>
                              )}

                              {/* Regenerating Overlay */}
                              {isRegenerating && (
                                <div style={{
                                  position: 'absolute',
                                  inset: 0,
                                  background: 'rgba(0,0,0,0.5)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  flexDirection: 'column',
                                  gap: '0.4rem',
                                  zIndex: 5,
                                  backdropFilter: 'blur(3px)'
                                }}>
                                  <Loader2 size={24} className="spin" color="white" />
                                  <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>Regenerating…</span>
                                </div>
                              )}

                              {/* Real photo */}
                              {imgData?.url && !isLoading && (
                                <img
                                  src={imgData.url}
                                  alt={String(scene.title || '')}
                                  draggable="false"
                                  onDragStart={(e) => e.preventDefault()}
                                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', userSelect: 'none', pointerEvents: 'none' }}
                                  onError={(e) => { e.target.style.display = 'none'; }}
                                />
                              )}

                              {/* Select as Primary for Flashcard Button (Top-Left) */}
                              {imgData?.url && !isLoading && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedPrimaryImageIdx(prev => prev === idx ? null : idx);
                                  }}
                                  className="image-control-overlay glass-button animate-scale"
                                  style={{
                                    position: 'absolute',
                                    top: '12px',
                                    left: '12px',
                                    width: '32px',
                                    height: '32px',
                                    borderRadius: '50%',
                                    padding: 0,
                                    border: selectedPrimaryImageIdx === idx ? '1px solid rgba(255, 255, 255, 0.45)' : '1px solid rgba(255, 255, 255, 0.15)',
                                    background: selectedPrimaryImageIdx === idx ? 'rgba(255, 255, 255, 0.35)' : 'rgba(15, 18, 24, 0.65)',
                                    backdropFilter: 'blur(10px)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: 'pointer',
                                    zIndex: 10,
                                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
                                    color: 'white',
                                    opacity: (activeImageControlsIdx === idx) ? 1 : undefined,
                                    pointerEvents: (activeImageControlsIdx === idx) ? 'auto' : undefined
                                  }}
                                  title={selectedPrimaryImageIdx === idx ? "Primary image for flashcard (Selected)" : "Select as primary image for flashcard"}
                                >
                                  <Bookmark size={13} fill={selectedPrimaryImageIdx === idx ? 'white' : 'none'} color={selectedPrimaryImageIdx === idx ? 'transparent' : 'white'} />
                                </button>
                              )}

                              {/* Search & Regenerate Group (Top-Right) */}
                              {imgData?.url && !isLoading && (
                                <div className="image-control-overlay" style={{
                                  position: 'absolute',
                                  top: '12px',
                                  right: '12px',
                                  display: 'flex',
                                  gap: '8px',
                                  zIndex: 10,
                                  opacity: (activeImageControlsIdx === idx) ? 1 : undefined,
                                  pointerEvents: (activeImageControlsIdx === idx) ? 'auto' : undefined
                                }}>
                                  {/* Search Custom Image Button */}
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setActiveSearchOverlays(prev => {
                                        const next = [...prev];
                                        next[idx] = !next[idx];
                                        return next;
                                      });
                                    }}
                                    className="glass-button animate-scale"
                                    style={{
                                      width: '32px',
                                      height: '32px',
                                      borderRadius: '50%',
                                      padding: 0,
                                      border: '1px solid rgba(255, 255, 255, 0.15)',
                                      background: 'rgba(15, 18, 24, 0.65)',
                                      backdropFilter: 'blur(10px)',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      cursor: 'pointer',
                                      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)'
                                    }}
                                    title="Search Custom Image"
                                  >
                                    <Search size={13} color="white" />
                                  </button>

                                  {/* Regenerate Button */}
                                  <button
                                    onClick={() => handleRegenImage(idx)}
                                    disabled={isRegenerating}
                                    className="glass-button animate-scale"
                                    style={{
                                      width: '32px',
                                      height: '32px',
                                      borderRadius: '50%',
                                      padding: 0,
                                      border: '1px solid rgba(255, 255, 255, 0.15)',
                                      background: 'rgba(15, 18, 24, 0.65)',
                                      backdropFilter: 'blur(10px)',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      cursor: 'pointer',
                                      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)'
                                    }}
                                    title="Regenerate Image"
                                  >
                                    {isRegenerating ? (
                                      <Loader2 size={13} className="spin" color="white" />
                                    ) : (
                                      <RefreshCw size={13} color="white" />
                                    )}
                                  </button>
                                </div>
                              )}

                              {/* Gradient overlay + scene title label at bottom */}
                              {imgData?.url && !isLoading && (
                                <div style={{
                                  position: 'absolute',
                                  bottom: 0,
                                  left: 0,
                                  right: 0,
                                  background: 'linear-gradient(to top, rgba(0,0,0,0.72) 0%, transparent 100%)',
                                  padding: '0.6rem 0.75rem 0.5rem',
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  alignItems: 'flex-end',
                                  zIndex: 2
                                }}>
                                  <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.9)', fontWeight: 700 }}>{String(scene.title || '')}</span>
                                </div>
                              )}

                              {/* Custom upload/search options if regen count >= 6 or activeSearchOverlays[idx] is true */}
                              {(regenCounts[idx] >= 6 || activeSearchOverlays[idx]) && (
                                <div style={{
                                  position: 'absolute',
                                  inset: 0,
                                  background: 'rgba(10, 8, 20, 0.95)',
                                  backdropFilter: 'blur(12px)',
                                  WebkitBackdropFilter: 'blur(12px)',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  justifyContent: 'center',
                                  padding: '1rem',
                                  gap: '0.65rem',
                                  zIndex: 40,
                                  borderRadius: '14px'
                                }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontSize: '0.65rem', color: '#a78bfa', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Custom Image Option</span>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setRegenCounts(prev => {
                                          const next = [...prev];
                                          if (next[idx] >= 6) next[idx] = 5; // Reset to 5 to hide overlay
                                          return next;
                                        });
                                        setActiveSearchOverlays(prev => {
                                          const next = [...prev];
                                          next[idx] = false;
                                          return next;
                                        });
                                      }}
                                      style={{
                                        background: 'transparent',
                                        border: 'none',
                                        color: 'rgba(255, 255, 255, 0.5)',
                                        cursor: 'pointer',
                                        padding: '2px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                      }}
                                    >
                                      <X size={16} />
                                    </button>
                                  </div>

                                  <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                                    <input 
                                      type="text" 
                                      placeholder="Type keyword for Pexels..."
                                      id={`custom-kw-${idx}`}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                          handleCustomKeywordSearch(idx, e.target.value);
                                          setRegenCounts(prev => {
                                            const next = [...prev];
                                            next[idx] = 0; // reset to 0
                                            return next;
                                          });
                                          setActiveSearchOverlays(prev => {
                                            const next = [...prev];
                                            next[idx] = false;
                                            return next;
                                          });
                                        }
                                      }}
                                      style={{
                                        flex: 1,
                                        background: 'rgba(255,255,255,0.04)',
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        borderRadius: '8px',
                                        padding: '0.35rem 0.65rem',
                                        color: 'white',
                                        fontSize: '0.75rem',
                                        outline: 'none'
                                      }}
                                    />
                                    <button
                                      onClick={() => {
                                        const val = document.getElementById(`custom-kw-${idx}`)?.value;
                                        if (val) {
                                          handleCustomKeywordSearch(idx, val);
                                          setRegenCounts(prev => {
                                            const next = [...prev];
                                            next[idx] = 0; // reset to 0
                                            return next;
                                          });
                                          setActiveSearchOverlays(prev => {
                                            const next = [...prev];
                                            next[idx] = false;
                                            return next;
                                          });
                                        }
                                      }}
                                      className="glass-button animate-scale"
                                      style={{
                                        padding: '0.35rem 0.75rem',
                                        borderRadius: '8px',
                                        fontSize: '0.7rem',
                                        fontWeight: 800,
                                        borderColor: 'rgba(167, 139, 250, 0.3)',
                                        background: 'rgba(167, 139, 250, 0.1)',
                                        color: '#a78bfa',
                                        cursor: 'pointer'
                                      }}
                                    >
                                      Search
                                    </button>
                                  </div>

                                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '0.4rem', marginTop: '0.2rem' }}>
                                    <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.45)' }}>Or upload your own photo:</span>
                                    <label
                                      className="glass-button animate-scale"
                                      style={{
                                        padding: '0.3rem 0.65rem',
                                        borderRadius: '8px',
                                        fontSize: '0.65rem',
                                        fontWeight: 800,
                                        cursor: 'pointer',
                                        display: 'inline-block'
                                      }}
                                    >
                                      Upload File
                                      <input 
                                        type="file" 
                                        accept="image/*" 
                                        onChange={(e) => {
                                          if (e.target.files?.[0]) {
                                            handleCustomImageUpload(idx, e.target.files[0]);
                                            setRegenCounts(prev => {
                                              const next = [...prev];
                                              next[idx] = 0; // reset to 0
                                              return next;
                                            });
                                          }
                                        }}
                                        style={{ display: 'none' }} 
                                      />
                                    </label>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </motion.div>
                )}

                {/* Slide 3: Contextual Scenarios */}
                {richCardData.scenes && (
                  <motion.div 
                    initial="offscreen"
                    whileInView="onscreen"
                    viewport={{ once: false, amount: 0.15, margin: "-22% 0px -22% 0px" }}
                    variants={focusVariants}
                    className="snap-card glass-panel"
                    style={{ 
                      padding: '1.25rem', 
                      display: 'flex', 
                      flexDirection: 'column', 
                      gap: '0.85rem', 
                      width: '100%',
                      marginBottom: '10vh'
                    }}
                  >
                    <span style={{ fontSize: '0.55rem', textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: 800, display: 'block', letterSpacing: '0.5px' }}>Contextual Scenarios</span>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      {richCardData.scenes?.map((scene, idx) => (
                        <div 
                          key={idx}
                          style={{ 
                            padding: '0.75rem', 
                            background: 'rgba(255,255,255,0.01)', 
                            border: '1px solid rgba(255,255,255,0.03)', 
                            borderRadius: '12px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '0.25rem'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.75rem', color: '#cbd5e1', fontWeight: 800 }}>
                            <span>{String(scene.title || '').replace(/\p{Extended_Pictographic}/gu, '').trim()}</span>
                          </div>
                          <p style={{ margin: 0, fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{String(scene.situation || '')}</p>
                          
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.2rem' }}>
                            <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 800, color: '#e2e8f0', fontStyle: 'italic', flex: 1 }}>
                              {renderInteractiveSentence(String(scene.dialogue || ''), String(wordInput || ''), handleWordClick)}
                            </p>
                            <button 
                              onClick={() => handleSpeak(String(scene.dialogue || ''))}
                              className="glass-button animate-scale"
                              style={{ 
                                width: '24px', 
                                height: '24px', 
                                borderRadius: '50%', 
                                padding: 0, 
                                borderColor: 'rgba(255,255,255,0.06)', 
                                background: 'rgba(255,255,255,0.02)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                marginLeft: '0.5rem',
                                flexShrink: 0
                              }}
                            >
                              <Volume2 size={11} color="rgba(255,255,255,0.4)" />
                            </button>
                          </div>
                          <p style={{ margin: '0.15rem 0 0 0', fontSize: '0.7rem', color: 'rgba(255,255,255,0.45)' }}>
                            <strong>Meaning:</strong>{' '}
                            {renderHighlightedThaiText(String(scene.meaning || ''), String(scene.thaiWordUsed || richCardData?.thaiTranslation?.word || ''))}
                          </p>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}

                {/* Slide 4: Thai Translation + Key Takeaway */}
                <motion.div 
                  initial="offscreen"
                  whileInView="onscreen"
                  viewport={{ once: false, amount: 0.15, margin: "-22% 0px -22% 0px" }}
                  variants={focusVariants}
                  className="snap-card"
                  style={{ 
                    display: 'flex', 
                    flexDirection: 'column', 
                    gap: '1rem', 
                    width: '100%',
                    marginBottom: '10vh'
                  }}
                >
                  {/* Thai Translation Card */}
                  {richCardData.thaiTranslation && (
                    <div className="glass-panel" style={{ padding: '1.25rem', width: '100%' }}>
                      <span style={{ fontSize: '0.55rem', textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: 800, display: 'block', letterSpacing: '0.5px' }}>ภาษาไทย (Thai Matches)</span>
                      
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.8rem', marginTop: '0.4rem' }}>
                        <div style={{ color: 'white', display: 'flex', alignItems: 'baseline', gap: '0.3rem' }}>
                          <strong style={{ color: 'var(--text-secondary)', fontSize: '0.65rem', textTransform: 'uppercase', minWidth: '45px' }}>คำแปล:</strong>
                          <span style={{ fontSize: '0.95rem', fontWeight: 600 }}>{String(richCardData.thaiTranslation.word || '')}</span>
                        </div>
                        {richCardData.thaiTranslation.phrase && (
                          <div style={{ color: 'rgba(255,255,255,0.85)', display: 'flex', alignItems: 'baseline', gap: '0.3rem' }}>
                            <strong style={{ color: 'var(--text-secondary)', fontSize: '0.65rem', textTransform: 'uppercase', minWidth: '45px' }}>วลีไทย:</strong>
                            <span style={{ fontWeight: 600 }}>{String(richCardData.thaiTranslation.phrase || '')}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {(() => {
                    const targetWord = String(richCardData.word || '').toLowerCase().trim();
                    const fallback = lexicalFallback[targetWord] || {};
                    const synonyms = getLexicalList(richCardData, fallback, 'synonyms').slice(0, 5);
                    const nearWords = getLexicalList(richCardData, fallback, 'nearWords', 'relatedWords').slice(0, 6);
                    const wordFamily = getLexicalList(richCardData, fallback, 'wordFamily', 'wordFamilies', 'family').slice(0, 5);
                    const isLoadingLexical = fallback.status === 'loading';
                    const hasLexical = synonyms.length > 0 || nearWords.length > 0 || wordFamily.length > 0;
                    if (!hasLexical && !isLoadingLexical) return null;

                    const renderChips = (items, color) => (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginTop: '0.35rem' }}>
                        {items.map(item => (
                          <span
                            key={item}
                            style={{
                              borderRadius: '999px',
                              border: `1px solid ${color.border}`,
                              background: color.bg,
                              color: color.text,
                              fontSize: '0.72rem',
                              fontWeight: 800,
                              padding: '0.32rem 0.55rem',
                              lineHeight: 1
                            }}
                          >
                            {item}
                          </span>
                        ))}
                      </div>
                    );

                    return (
                      <div className="glass-panel" style={{ padding: '1.25rem', width: '100%' }}>
                        <span style={{ fontSize: '0.55rem', textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: 800, display: 'block', letterSpacing: '0.5px' }}>
                          Word connections
                        </span>
                        {isLoadingLexical && !hasLexical && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', marginTop: '0.55rem', color: 'rgba(255,255,255,0.62)', fontSize: '0.75rem', fontWeight: 800 }}>
                            <Loader2 size={12} className="spin" />
                            Loading related words
                          </div>
                        )}
                        {synonyms.length > 0 && (
                          <div style={{ marginTop: '0.65rem' }}>
                            <span style={{ fontSize: '0.58rem', color: 'var(--text-secondary)', fontWeight: 900, textTransform: 'uppercase' }}>Synonyms</span>
                            {renderChips(synonyms, { border: 'rgba(96, 165, 250, 0.26)', bg: 'rgba(96, 165, 250, 0.08)', text: '#93c5fd' })}
                          </div>
                        )}
                        {nearWords.length > 0 && (
                          <div style={{ marginTop: '0.65rem' }}>
                            <span style={{ fontSize: '0.58rem', color: 'var(--text-secondary)', fontWeight: 900, textTransform: 'uppercase' }}>Related words</span>
                            {renderChips(nearWords, { border: 'rgba(52, 211, 153, 0.24)', bg: 'rgba(52, 211, 153, 0.07)', text: '#6ee7b7' })}
                          </div>
                        )}
                        {wordFamily.length > 0 && (
                          <div style={{ marginTop: '0.65rem' }}>
                            <span style={{ fontSize: '0.58rem', color: 'var(--text-secondary)', fontWeight: 900, textTransform: 'uppercase' }}>Word family</span>
                            {renderChips(wordFamily, { border: 'rgba(251, 146, 60, 0.25)', bg: 'rgba(251, 146, 60, 0.08)', text: '#fdba74' })}
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {/* Key Takeaway Card */}
                  {richCardData.takeaway && (
                    <div className="glass-panel" style={{ padding: '1.25rem', width: '100%' }}>
                      <span style={{ fontSize: '0.55rem', textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '4px', letterSpacing: '0.5px' }}>
                        <Lightbulb size={12} color="#eab308" fill="rgba(234, 179, 8, 0.1)" /> Key Takeaway
                      </span>
                      <p style={{ margin: '0.4rem 0 0 0', fontSize: '0.8rem', color: 'rgba(255,255,255,0.95)', lineHeight: 1.45 }}>
                        {richCardData.takeaway}
                      </p>
                    </div>
                  )}

                  {/* Verb Forms (V1, V2, V3) Card */}
                  {(() => {
                    let verbForms = undefined;
                    if (richCardData && 'verbForms' in richCardData) {
                      verbForms = richCardData.verbForms;
                    } else {
                      verbForms = getVerbForms(String(richCardData.word || ''), String(richCardData.pos || ''));
                    }
                    if (!verbForms || !Array.isArray(verbForms) || verbForms.length < 3) return null;
                    const [v1, v2, v3] = verbForms;
                    return (
                      <div className="glass-panel" style={{ padding: '1.25rem', width: '100%' }}>
                        <span style={{ fontSize: '0.55rem', textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: 800, display: 'block', letterSpacing: '0.5px', marginBottom: '0.5rem' }}>
                          Verb Forms (Tenses)
                        </span>
                        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', fontSize: '0.82rem' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1 }}>
                            <span style={{ fontSize: '0.58rem', textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: 800, letterSpacing: '0.2px' }}>V1 (Base)</span>
                            <span style={{ color: 'white', fontWeight: 900, fontSize: '1.2rem', letterSpacing: '-0.01em' }}>{v1}</span>
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1, alignItems: 'center' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', alignItems: 'flex-start' }}>
                              <span style={{ fontSize: '0.58rem', textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: 800, letterSpacing: '0.2px' }}>V2 (Past)</span>
                              <span style={{ color: 'white', fontWeight: 900, fontSize: '1.2rem', letterSpacing: '-0.01em' }}>{v2}</span>
                            </div>
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1, alignItems: 'flex-end' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', alignItems: 'flex-start' }}>
                              <span style={{ fontSize: '0.58rem', textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: 800, letterSpacing: '0.2px' }}>V3 (Participle)</span>
                              <span style={{ color: 'white', fontWeight: 900, fontSize: '1.2rem', letterSpacing: '-0.01em' }}>{v3}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </motion.div>

                {/* Extra spacing at the bottom to allow scrolling the last card to the center */}
                <div style={{ height: '32vh', flexShrink: 0 }} />
              </motion.div>
            )
          ) : (
            /* IDLE STATE: CLEAN DISTRACTION-FREE VIEW */
            <motion.div
              key="idle"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', width: '100%' }}
            >
              {/* Minimal Recent Searches Row */}
              {vocab.length > 0 && (
                <div style={{ marginTop: '2rem', width: '100%', textAlign: 'center' }}>
                  <span style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'rgba(255, 255, 255, 0.25)', fontWeight: 800 }}>
                    Recent Searches
                  </span>
                  
                  <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '0.45rem', marginTop: '0.65rem' }}>
                    {vocab.slice(0, 5).map((card) => (
                      <button
                        key={card.id}
                        onClick={() => loadRecentWord(card)}
                        style={{
                          background: 'rgba(255, 255, 255, 0.02)',
                          border: '1px solid rgba(255, 255, 255, 0.05)',
                          borderRadius: '20px',
                          padding: '0.3rem 0.8rem',
                          color: 'rgba(255, 255, 255, 0.65)',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          outline: 'none'
                        }}
                        onMouseEnter={(e) => { e.target.style.background = 'rgba(255,255,255,0.06)'; e.target.style.borderColor = 'rgba(255,255,255,0.1)'; }}
                        onMouseLeave={(e) => { e.target.style.background = 'rgba(255,255,255,0.02)'; e.target.style.borderColor = 'rgba(255,255,255,0.05)'; }}
                      >
                        {card.word}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

      </motion.div>
      </div>

      {/* Toast Notification for Data Source */}
      <AnimatePresence>
        {sourceToast && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 350, damping: 26 }}
            style={{
              position: 'absolute',
              bottom: '85px',
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 2000,
              background: 'rgba(15, 18, 24, 0.85)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '16px',
              padding: '0.75rem 1.25rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.65rem',
              boxShadow: '0 10px 30px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
              maxWidth: '90%',
              width: 'max-content',
              pointerEvents: 'auto'
            }}
          >
            <div 
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: sourceToast.type === 'live' 
                  ? (sourceToast.message.includes('Groq') ? '#ef4444' : '#a78bfa') 
                  : '#10b981',
                boxShadow: `0 0 10px ${sourceToast.type === 'live' 
                  ? (sourceToast.message.includes('Groq') ? 'rgba(239, 68, 68, 0.5)' : 'rgba(167, 139, 250, 0.5)') 
                  : 'rgba(16, 185, 129, 0.5)'}`
              }} 
            />
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'rgba(255, 255, 255, 0.95)' }}>
              {sourceToast.message}
            </span>
            <button
              onClick={() => setSourceToast(null)}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'rgba(255, 255, 255, 0.4)',
                cursor: 'pointer',
                padding: '0 0 0 0.5rem',
                display: 'flex',
                alignItems: 'center',
                outline: 'none'
              }}
            >
              <X size={12} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
      {renderWordTooltip()}
      
      <AnimatePresence>
        {guestNudge && (
          <div style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 16000,
            background: 'rgba(0,0,0,0.75)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)'
          }}>
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 280 }}
              style={{
                width: '88%',
                maxWidth: '360px',
                background: 'radial-gradient(circle at 50% 0%, rgba(255, 255, 255, 0.08) 0%, rgba(10, 12, 17, 0.85) 100%)',
                borderRadius: '28px',
                border: '1px solid rgba(255,255,255,0.12)',
                boxShadow: '0 25px 60px rgba(0, 0, 0, 0.8), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
                padding: '2rem 1.5rem',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center',
                position: 'relative'
              }}
            >
              {/* Close button */}
              <button
                onClick={handleCloseNudge}
                style={{
                  position: 'absolute',
                  top: '1rem',
                  right: '1rem',
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '50%',
                  width: '28px',
                  height: '28px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'rgba(255,255,255,0.6)',
                  cursor: 'pointer',
                  outline: 'none'
                }}
              >
                <X size={14} />
              </button>

              <div style={{
                width: '60px',
                height: '60px',
                borderRadius: '16px',
                background: 'rgba(167, 139, 250, 0.15)',
                border: '1px solid rgba(167, 139, 250, 0.25)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#a78bfa',
                marginBottom: '1.25rem',
                boxShadow: '0 0 20px rgba(167, 139, 250, 0.2)'
              }}>
                <Sparkles size={28} />
              </div>

              <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.3rem', fontWeight: 950, color: 'white', letterSpacing: '-0.5px' }}>
                {guestNudge === 'soft' ? 'Nice work! You saved 10 words' : 'Great job! You saved 20 words'}
              </h3>

              <p style={{ margin: '0 0 1.5rem 0', fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                {guestNudge === 'soft' 
                  ? 'You are doing great. Create a free account to keep your words and study progress safe.'
                  : 'Your word list is growing. Sign up to back it up and keep it safe on every device.'}
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', width: '100%' }}>
                <button
                  onClick={() => {
                    handleCloseNudge();
                    navigate('/login?auth=1');
                  }}
                  className="glass-button primary animate-scale"
                  style={{
                    padding: '0.75rem',
                    fontSize: '0.85rem',
                    fontWeight: 900,
                    width: '100%',
                    borderRadius: '14px',
                    background: 'linear-gradient(135deg, #a78bfa 0%, #06b6d4 100%)',
                    border: 'none',
                    color: 'white',
                    cursor: 'pointer',
                    boxShadow: '0 8px 25px rgba(167, 139, 250, 0.3)'
                  }}
                >
                  Create free account
                </button>

                <button
                  onClick={handleCloseNudge}
                  style={{
                    padding: '0.6rem',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    width: '100%',
                    borderRadius: '12px',
                    background: 'transparent',
                    border: 'none',
                    color: 'rgba(255, 255, 255, 0.5)',
                    cursor: 'pointer',
                    outline: 'none'
                  }}
                >
                  {guestNudge === 'soft' ? 'Later, keep studying' : 'Not now, I understand'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      {/* Tutorial Step 3: Swipe Demo Overlay — shows BACK/SAVE direction hints while card wobbles */}
      {tutorialStep === 3 && !isSuccess && !isExiting && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4 }}
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 9990,
            pointerEvents: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 28px',
            bottom: '140px',
            top: 'auto',
            height: '80px'
          }}
        >
          {/* ← BACK */}
          <motion.div
            animate={{ x: [-8, 0, -8] }}
            transition={{ repeat: Infinity, duration: 1.2, ease: 'easeInOut' }}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}
          >
            <PremiumFingerPointer direction="left" scale={0.9} />
            <span style={{
              fontSize: '0.72rem', fontWeight: 900, color: '#ef4444',
              letterSpacing: '1.5px', textTransform: 'uppercase',
              textShadow: '0 0 12px rgba(239,68,68,0.7)',
              marginTop: '4px'
            }}>Back</span>
          </motion.div>
          {/* SAVE → */}
          <motion.div
            animate={{ x: [8, 0, 8] }}
            transition={{ repeat: Infinity, duration: 1.2, ease: 'easeInOut' }}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}
          >
            <PremiumFingerPointer direction="right" scale={0.9} />
            <span style={{
              fontSize: '0.72rem', fontWeight: 900, color: '#10b981',
              letterSpacing: '1.5px', textTransform: 'uppercase',
              textShadow: '0 0 12px rgba(16,185,129,0.7)',
              marginTop: '4px'
            }}>Save</span>
          </motion.div>
        </motion.div>
      )}
      {richCardData && !isFilling && !isSuccess && !isExiting && showShortcutButtons && tutorialStep !== 2 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ 
            opacity: (tutorialStep === 3) ? 0 : 1, 
            y: 0 
          }}
          exit={{ opacity: 0, y: 20 }}
          style={{
            position: 'absolute',
            bottom: '88px',
            left: 0,
            right: 0,
            margin: '0 auto',
            display: 'flex',
            width: 'calc(100% - 32px)',
            maxWidth: '380px',
            alignItems: 'center',
            gap: '0.85rem',
            zIndex: 9999,
            pointerEvents: (tutorialStep === 3) ? 'none' : 'auto'
          }}
        >
          {/* Discard / Back Button (Red, Left) */}
          <button
            onClick={() => {
              playClickSound();
              handleDiscardWord();
            }}
            className="animate-scale"
            style={{
              flex: 1,
              height: '42px',
              borderRadius: '12px',
              background: 'rgba(239, 68, 68, 0.05)',
              border: '1.5px solid rgba(239, 68, 68, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#ef4444',
              fontSize: '0.82rem',
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              boxShadow: '0 4px 15px rgba(239, 68, 68, 0.1)',
              outline: 'none',
              transition: 'all 0.2s ease'
            }}
            id="tutorial-tinder-discard-btn"
            title="Discard Word (Swipe Left)"
          >
            Back
          </button>

          {/* Save Button (Green, Right) */}
          <button
            onClick={() => {
              playClickSound();
              handleSaveWord();
            }}
            className="animate-scale"
            style={{
              flex: 1,
              height: '42px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              border: tutorialStep === 4 ? '2.5px solid #fff' : 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: 'white',
              fontSize: '0.82rem',
              fontWeight: 900,
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              boxShadow: tutorialStep === 4 
                ? '0 0 25px rgba(74, 222, 128, 0.8), 0 6px 20px rgba(16, 185, 129, 0.3)' 
                : '0 6px 20px rgba(16, 185, 129, 0.3)',
              outline: 'none',
              transition: 'all 0.2s ease'
            }}
            id="tutorial-tinder-save-btn"
            title="Save Word (Swipe Right)"
          >
            {tutorialStep === 4 ? (
              <motion.span
                animate={{ textShadow: ['0 0 0px #fff', '0 0 12px #4ade80', '0 0 0px #fff'] }}
                transition={{ repeat: Infinity, duration: 1.0 }}
              >👉 Save</motion.span>
            ) : 'Save'}
          </button>
        </motion.div>
      )}
      </AnimatePresence>
    </div>
  );
};

export default AddWord;

