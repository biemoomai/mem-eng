import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion';
import { Volume2, ShieldAlert, Flame, BookOpen, Clock, X, Play, CheckCircle, Sparkles, Loader2, ArrowRight, Activity, CheckSquare, Search, Trash2, RotateCw, Bookmark, RotateCcw, ChevronDown, ChevronUp, TrendingUp, Info } from 'lucide-react';
import { useVocab } from '../context/VocabContext';
import { useTheme } from '../context/ThemeContext';
import { SafeImage } from '../components/SafeImage';
import { fetchVocabImage } from '../utils/imageHelper';
import { playClickSound, playSwipeSound, playSuccessSound, playAgainSound, startDragSound, updateDragSound, stopDragSound } from '../utils/soundHelper';

const cleanMediaUrl = (url) => {
  if (!url) return '';
  if (url.startsWith('approved:')) return url.substring(9);
  return url;
};

const parseMeaningField = (meaning) => {
  if (!meaning) return {};
  if (typeof meaning === 'object') return meaning;
  if (typeof meaning === 'string') {
    if (meaning.startsWith('{')) {
      try {
        return JSON.parse(meaning);
      } catch (e) {
        return {};
      }
    }
    return { definition: meaning };
  }
  return {};
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

const getCategory = (wordObj) => {
  if (!wordObj) return 'Daily Life';
  if (wordObj.category) return wordObj.category;
  const word = wordObj.word || '';
  if (word.length >= 9) return 'Academic';
  if (['manage', 'market', 'trade', 'value', 'price', 'compete'].some(k => word.includes(k))) return 'Business';
  return 'Daily Life';
};

const getNextReviewText = (nextReviewDate) => {
  if (!nextReviewDate) return 'No review';
  const diffMs = new Date(nextReviewDate) - new Date();
  if (diffMs <= 0) return 'Due Now';
  
  const diffMins = Math.round(diffMs / (1000 * 60));
  if (diffMins < 60) return `Next: ${diffMins}m`;
  
  const diffHours = Math.round(diffMs / (1000 * 60 * 60));
  if (diffHours < 24) return `Next: ${diffHours}h`;
  
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
  return `Next: ${diffDays}d`;
};

const renderHighlightedText = (text, targetWord) => {
  if (!text) return '';
  
  const boldParts = text.split('**');
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

const renderInteractiveSentence = (text, targetWord, onWordClick) => {
  if (!text) return '';
  
  const parts = text.split(/(\s+|[.,\/#!$%\^&\*;:{}=\-_`~()?"'])/g).filter(Boolean);
  
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

const maskWord = (text, word) => {
  if (!text || !word) return '';
  const escaped = word.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
  const regex = new RegExp(`\\b${escaped}\\b`, 'gi');
  return text.replace(regex, '[_____]');
};

const renderHighlightedThaiText = (thaiSentence, thaiWord) => {
  if (!thaiSentence) return '';
  if (!thaiWord) return thaiSentence;
  const words = thaiWord
    .split(/[,/|]|\s*หรือ\s*/)
    .map(w => w.trim())
    .filter(Boolean);
  if (words.length === 0) return thaiSentence;
  words.sort((a, b) => b.length - a.length);
  const escaped = words.map(w => w.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')).join('|');
  const parts = thaiSentence.split(new RegExp(`(${escaped})`, 'g'));
  return parts.map((part, idx) => {
    const isMatch = words.some(w => w === part);
    return isMatch ? (
      <span key={`thai-match-${idx}`} style={{ color: '#10b981', fontWeight: 900 }}>
        {part}
      </span>
    ) : (
      part
    );
  });
};

const ReviewOptionButton = ({ onClick, disabled, label, color, icon: Icon, isLoading, id }) => {
  const [hovered, setHovered] = useState(false);
  
  const baseBg = 'rgba(255, 255, 255, 0.03)';
  const baseBorder = '1px solid rgba(255, 255, 255, 0.08)';
  const baseColor = '#cbd5e1';

  let bg = baseBg;
  let border = baseBorder;
  let textColor = baseColor;
  let boxShadow = 'none';

  // Define premium gradients and glows for hover state
  const hoverGradients = {
    Learning: 'linear-gradient(135deg, #94a3b8 0%, #475569 100%)',
    Hard: 'linear-gradient(135deg, #f87171 0%, #dc2626 100%)',
    Normal: 'linear-gradient(135deg, #34d399 0%, #059669 100%)',
    Easy: 'linear-gradient(135deg, #60a5fa 0%, #2563eb 100%)',
    newWords: 'linear-gradient(135deg, #c084fc 0%, #7c3aed 100%)'
  };

  const hoverShadows = {
    Learning: '0 0 15px rgba(148, 163, 184, 0.45)',
    Hard: '0 0 15px rgba(239, 68, 68, 0.45)',
    Normal: '0 0 15px rgba(16, 185, 129, 0.45)',
    Easy: '0 0 15px rgba(59, 130, 246, 0.45)',
    newWords: '0 0 15px rgba(167, 139, 250, 0.45)'
  };

  const hoverBorders = {
    Learning: '1px solid #475569',
    Hard: '1px solid #dc2626',
    Normal: '1px solid #059669',
    Easy: '1px solid #2563eb',
    newWords: '1px solid #7c3aed'
  };

  const stageId = id || (label === '+10' ? 'newWords' : label);

  if (hovered && !disabled) {
    bg = hoverGradients[stageId] || `linear-gradient(135deg, ${color} 0%, ${color}dd 100%)`;
    border = hoverBorders[stageId] || `1px solid ${color}`;
    textColor = '#ffffff';
    boxShadow = hoverShadows[stageId] || `0 0 15px ${color}50`;
  }

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        if (!disabled) onClick();
      }}
      disabled={disabled}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        padding: '0.5rem 1rem',
        fontSize: '0.78rem',
        fontWeight: 900,
        background: bg,
        border: border,
        color: textColor,
        borderRadius: '24px',
        cursor: disabled ? 'default' : 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '4px',
        opacity: disabled ? 0.35 : 1,
        transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
        outline: 'none',
        boxShadow: boxShadow,
        flex: '1 1 auto',
        minWidth: '70px',
        height: '32px',
        overflow: 'hidden',
        transform: 'translateZ(0)',
        WebkitTransform: 'translateZ(0)',
        backgroundClip: 'padding-box'
      }}
    >
      <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', textAlign: 'center', fontWeight: 900 }}>
        {Icon && <Icon size={12} fill={hovered && !disabled ? '#ffffff' : 'currentColor'} color="transparent" style={{ transition: 'all 0.2s' }} />}
        {label}
      </span>
      {isLoading && <Loader2 size={12} className="spin" style={{ marginLeft: '4px' }} />}
    </button>
  );
};

const Purge = () => {
  const { vocab: rawVocab, updateWordSrs, getProjectedIntervals, streak, loading, deleteWordFromDeck, addNewCurriculumWords, updateWordProperties, activeCurriculum, addWordToDeck, getAiWordRichDetails, curriculumWords } = useVocab();
  const vocab = useMemo(() => {
    return rawVocab.filter(item => {
      if (activeCurriculum === 'Self-Study only') {
        return !item.curriculum || item.curriculum === 'Self-Study only';
      }
      return item.curriculum === activeCurriculum || (item.word && curriculumWords.has(item.word.toLowerCase().trim()));
    });
  }, [rawVocab, activeCurriculum, curriculumWords]);
  const { theme } = useTheme();
  const navigate = useNavigate();

  const speakText = (text) => {
    if (!text || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    window.speechSynthesis.speak(utterance);
  };

  // local active queue for this study session
  const [sessionQueue, setSessionQueue] = useState([]);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isStudying, setIsStudying] = useState(false);
  const [isCustomSession, setIsCustomSession] = useState(false);
  useEffect(() => {
    try {
      localStorage.setItem('memeng_is_studying', isStudying ? 'true' : 'false');
    } catch (e) {
      console.warn("Failed to set localStorage", e);
    }
    return () => {
      try {
        localStorage.removeItem('memeng_is_studying');
      } catch (e) {
        console.warn("Failed to remove localStorage", e);
      }
    };
  }, [isStudying]);
  const [startHovered, setStartHovered] = useState(false);
  const [showStartMenu, setShowStartMenu] = useState(false);
  const [isLoadingNewWords, setIsLoadingNewWords] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [totalHovered, setTotalHovered] = useState(false);
  const [dueHovered, setDueHovered] = useState(false);
  const [regenCount, setRegenCount] = useState(0);
  const [revealedCardIds, setRevealedCardIds] = useState({});
  const [isImageHovered, setIsImageHovered] = useState(false);
  const [activeReviewImageUrl, setActiveReviewImageUrl] = useState('');
  const [showStats, setShowStats] = useState(false);
  const [hoveredSrs, setHoveredSrs] = useState(null);

  const pressTimerRef = useRef(null);
  const isLongPressRef = useRef(false);
  const touchActiveRef = useRef(false);

  const startPress = (e, isTouch) => {
    e.stopPropagation();
    setStartHovered(true);
    if (isTouch) {
      touchActiveRef.current = true;
    } else if (touchActiveRef.current) {
      return;
    }

    isLongPressRef.current = false;

    pressTimerRef.current = setTimeout(() => {
      isLongPressRef.current = true;
      setShowStartMenu(prev => !prev);
      playClickSound();
      if (navigator.vibrate) {
        try {
          navigator.vibrate(50);
        } catch (err) {}
      }
    }, 500);
  };

  const endPress = (e, isTouch) => {
    e.stopPropagation();
    setStartHovered(false);
    if (pressTimerRef.current) {
      clearTimeout(pressTimerRef.current);
      pressTimerRef.current = null;
    }

    if (isTouch) {
      setTimeout(() => {
        touchActiveRef.current = false;
      }, 100);
    }

    if (!isLongPressRef.current) {
      const due = vocab.filter(w => w.srsLevel !== 'Mastered' && new Date(w.nextReviewDate) <= new Date());
      setSessionQueue(due);
      if (due.length > 0) {
        playClickSound();
        setIsStudying(true);
      }
    }
  };

  const cancelPress = (e) => {
    if (e && e.stopPropagation) e.stopPropagation();
    setStartHovered(false);
    if (pressTimerRef.current) {
      clearTimeout(pressTimerRef.current);
      pressTimerRef.current = null;
    }
  };

  const highlightThaiTranslation = (sentence, translation) => {
    if (!sentence) return '';
    if (!translation) return sentence;
    const index = sentence.indexOf(translation);
    if (index === -1) return sentence;
    const before = sentence.substring(0, index);
    const match = sentence.substring(index, index + translation.length);
    const after = sentence.substring(index + translation.length);
    return (
      <>
        {before}
        <span style={{ color: '#facc15', fontWeight: 800 }}>{match}</span>
        {after}
      </>
    );
  };
  const [unlockedWords, setUnlockedWords] = useState([]);
  const [addedProgress, setAddedProgress] = useState(null);
  
  const [tooltipStack, setTooltipStack] = useState([]);
  const [toastMessage, setToastMessage] = useState(null);
  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

  const currentTooltip = tooltipStack[tooltipStack.length - 1];
  const activeTooltipWord = currentTooltip?.word || null;
  const tooltipDetails = currentTooltip?.details || null;
  const isSearchingTooltipWord = currentTooltip?.loading || false;
  const [isAddingTooltipWord, setIsAddingTooltipWord] = useState(false);
  // showThai toggle removed, defaults to true/always show when revealed
  const showThai = true;

  const handleSpeak = (text) => {
    if (!text || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    window.speechSynthesis.speak(utterance);
  };

  const handleRegenerateImage = async (e) => {
    e.stopPropagation();
    if (!wordObj || isRegenerating) return;
    setRegenCount(prev => prev + 1);
    setIsRegenerating(true);
    try {
      const currentUrl = wordObj.videoUrl;
      const exclude = currentUrl ? [currentUrl] : [];
      
      let searchPrompt = wordObj.word;
      if (richCardData && richCardData.imagePrompts && richCardData.imagePrompts[0]) {
        searchPrompt = richCardData.imagePrompts[0];
      }
      
      const res = await fetchVocabImage(searchPrompt, 'photo', exclude);
      if (res && res.url) {
        setSessionQueue(prev => prev.map(w => w.id === wordObj.id ? { ...w, videoUrl: res.url } : w));
        updateWordProperties(wordObj.id, { videoUrl: res.url });
      } else {
        showToast('ไม่พบรูปภาพอื่นเพิ่มเติมสำหรับคำนี้ครับ');
      }
    } catch (err) {
      console.error(err);
      showToast('เกิดข้อผิดพลาดในการดึงรูปภาพใหม่');
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleCustomKeywordSearch = async (customKeyword) => {
    if (!customKeyword.trim() || !wordObj) return;
    setIsRegenerating(true);
    try {
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

        let parsedMeaning = parseMeaningField(wordObj.meaning);
        if (!parsedMeaning.savedSceneImages) {
          parsedMeaning.savedSceneImages = [];
        }
        parsedMeaning.savedSceneImages[0] = result.url;
        const updatedMeaningStr = JSON.stringify(parsedMeaning);

        setSessionQueue(prev => prev.map(w => w.id === wordObj.id ? { 
          ...w, 
          videoUrl: result.url,
          meaning: updatedMeaningStr,
          isImageSaved: true 
        } : w));
        
        updateWordProperties(wordObj.id, { 
          videoUrl: result.url, 
          meaning: updatedMeaningStr,
          isImageSaved: true
        });
        
        setRegenCount(0); 
      } else {
        showToast('ไม่พบรูปภาพสำหรับคีย์เวิร์ดนี้ครับ');
      }
    } catch (err) {
      console.error(err);
      showToast('เกิดข้อผิดพลาดในการดึงรูปภาพ');
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleCustomImageUpload = (file) => {
    if (!file || !wordObj) return;
    const url = URL.createObjectURL(file);
    
    let parsedMeaning = parseMeaningField(wordObj.meaning);
    if (!parsedMeaning.savedSceneImages) {
      parsedMeaning.savedSceneImages = [];
    }
    parsedMeaning.savedSceneImages[0] = url;
    const updatedMeaningStr = JSON.stringify(parsedMeaning);

    setSessionQueue(prev => prev.map(w => w.id === wordObj.id ? { 
      ...w, 
      videoUrl: url,
      meaning: updatedMeaningStr,
      isImageSaved: true
    } : w));
    
    updateWordProperties(wordObj.id, { 
      videoUrl: url,
      meaning: updatedMeaningStr,
      isImageSaved: true
    });
    
    setRegenCount(0); 
  };

  const handleToggleSaveImage = (e) => {
    e.stopPropagation();
    if (!wordObj) return;
    const nextSavedState = !wordObj.isImageSaved;

    let parsedMeaning = parseMeaningField(wordObj.meaning);
    
    if (!parsedMeaning.savedSceneImages) {
      parsedMeaning.savedSceneImages = [];
    }
    parsedMeaning.savedSceneImages[0] = wordObj.videoUrl;
    const updatedMeaningStr = JSON.stringify(parsedMeaning);

    setSessionQueue(prev => prev.map(w => w.id === wordObj.id ? { 
      ...w, 
      isImageSaved: nextSavedState,
      meaning: updatedMeaningStr
    } : w));
    updateWordProperties(wordObj.id, { 
      isImageSaved: nextSavedState,
      meaning: updatedMeaningStr
    });
  };


  const getCategoryCount = (cat) => vocab.filter(w => getCategory(w) === cat && w.srsLevel !== 'Mastered').length;
  const getSrsCount = (level) => {
    if (level === 'Easy') {
      return vocab.filter(w => (w.srsLevel === 'Easy' || w.srsLevel === 'Super Easy') && w.srsLevel !== 'Mastered').length;
    }
    return vocab.filter(w => w.srsLevel === level && w.srsLevel !== 'Mastered').length;
  };
  const getSrsDueCount = (level) => {
    if (level === 'Easy') {
      return vocab.filter(w => (w.srsLevel === 'Easy' || w.srsLevel === 'Super Easy') && w.srsLevel !== 'Mastered' && new Date(w.nextReviewDate) <= new Date()).length;
    }
    return vocab.filter(w => w.srsLevel === level && w.srsLevel !== 'Mastered' && new Date(w.nextReviewDate) <= new Date()).length;
  };

  const handleStartWithNewWords = async () => {
    setIsLoadingNewWords(true);
    setAddedProgress(0);
    
    let current = 0;
    let actualLoadedCount = 0;
    let animDone = false;
    let apiResult = null;
    let apiCompleted = false;

    const onWordAdded = (count) => {
      actualLoadedCount = count;
    };

    // Start count-up animation check interval
    const interval = setInterval(() => {
      if (current < actualLoadedCount) {
        current += 1;
        setAddedProgress(current);
      }
      
      if (apiCompleted && current >= actualLoadedCount) {
        clearInterval(interval);
        animDone = true;
        completeProcess();
      }
    }, 450); // Checks every 450ms, giving a very smooth and comfortable progression!

    const completeProcess = () => {
      setAddedProgress(null);
      if (apiResult && apiResult.success) {
        if (isStudying) {
          // If already studying, silently append the added words to sessionQueue
          setSessionQueue(prev => {
            const existingIds = new Set(prev.map(w => w.id));
            const newDue = (apiResult.addedWords || []).filter(w => !existingIds.has(w.id));
            return [...prev, ...newDue];
          });
        } else {
          setUnlockedWords(apiResult.addedWords || []);
          setIsCustomSession(true);
        }
      } else {
        showToast((apiResult && apiResult.error) || 'ไม่มีคำใหม่ให้อิมพอร์ตแล้ว');
      }
      setIsLoadingNewWords(false);
    };

    try {
      const res = await addNewCurriculumWords(activeCurriculum, 10, onWordAdded);
      apiResult = res;
      apiCompleted = true;
      actualLoadedCount = res.success ? (res.addedWords?.length || 0) : 0;
    } catch (err) {
      console.error(err);
      apiResult = { success: false, error: 'เกิดข้อผิดพลาดในการโหลดคำใหม่' };
      apiCompleted = true;
    }
  };

  const handleWordClick = (word) => {
    const cleaned = word.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"']/g, "").trim().toLowerCase();
    if (!cleaned) return;
    
    // Prevent duplicate push
    if (tooltipStack.length > 0 && tooltipStack[tooltipStack.length - 1].word === cleaned) {
      return;
    }

    setTooltipStack(prev => [...prev, { word: cleaned, loading: true, details: null }]);
    
    const local = vocab.find(v => v.word.toLowerCase() === cleaned);
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
            pos: details.pos || parsed?.pos || 'n.',
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

  const handleAddWordFromTooltip = async () => {
    if (!activeTooltipWord || !tooltipDetails || !tooltipDetails.rawDetails) return;
    setIsAddingTooltipWord(true);
    try {
      const res = await addWordToDeck(activeTooltipWord, tooltipDetails.rawDetails);
      if (res.success || res.error?.includes('already exists')) {
        setTooltipStack(prev => prev.map((item, idx) => 
          idx === prev.length - 1 && item.word === activeTooltipWord 
            ? { ...item, details: { ...item.details, alreadyInDeck: true } }
            : item
        ));
      } else {
        showToast(res.error || 'Failed to add word to deck');
      }
    } catch (err) {
      console.error(err);
      showToast('เกิดข้อผิดพลาดในการเพิ่มคำศัพท์');
    } finally {
      setIsAddingTooltipWord(false);
    }
  };

  const handleCloseUnlockedWords = (shouldStartStudy) => {
    setUnlockedWords([]);
    const due = vocab.filter(w => w.srsLevel !== 'Mastered' && new Date(w.nextReviewDate) <= new Date());
    setSessionQueue(due);
    if (shouldStartStudy && due.length > 0) {
      setIsStudying(true);
      setIsCustomSession(false);
    }
  };

  const handleStartReviewFromCat = (cat) => {
    let list = [];
    if (cat === 'All') {
      list = vocab.filter(w => w.srsLevel !== 'Mastered' && new Date(w.nextReviewDate) <= new Date());
    } else if (cat === 'Easy & Mastered') {
      list = vocab.filter(w => (w.srsLevel === 'Easy' || w.srsLevel === 'Super Easy') && w.srsLevel !== 'Mastered' && new Date(w.nextReviewDate) <= new Date());
    } else {
      list = vocab.filter(w => w.srsLevel === cat && w.srsLevel !== 'Mastered' && new Date(w.nextReviewDate) <= new Date());
    }

    if (list.length === 0) {
      showToast(`ไม่มีคำศัพท์ในกลุ่มนี้ให้ทบทวนครับ`);
      return;
    }
    setSessionQueue(list);
    setIsStudying(true);
    setIsCustomSession(false);
    setRevealStep(0);
  };

  const handleCustomReview = (filterType, value) => {
    let list = [];
    if (filterType === 'srs') {
      list = vocab.filter(w => {
        if (value === 'Easy') {
          return w.srsLevel === 'Easy' || w.srsLevel === 'Super Easy';
        }
        return w.srsLevel === value;
      });
    } else if (filterType === 'category') {
      list = vocab.filter(w => getCategory(w) === value);
    }
    
    if (list.length === 0) {
      alert(`ไม่มีคำศัพท์ในกลุ่มนี้ให้ทบทวนครับ`);
      return;
    }
    
    setSessionQueue(list);
    setIsStudying(true);
    setIsCustomSession(true);
  };
  // revealStep: 0 = Front/Question, 1 = Back/Answer
  const [revealStep, setRevealStep] = useState(0);
  const [exitDirection, setExitDirection] = useState(0);
  const [selectedStatus, setSelectedStatus] = useState(null);
  const [statusSearchQuery, setStatusSearchQuery] = useState('');

  const revealTimeRef = useRef(null);
  useEffect(() => {
    if (revealStep === 1) {
      revealTimeRef.current = performance.now();
    }
  }, [revealStep]);

  const scrollContainerRef = useRef(null);
  const isProgrammaticScrolling = false; // kept for inline handler guard (no-op)


  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-12, 12]);
  
  // Glowing color overlays for 4 directions
  const overlayRed = useTransform(x, [-50, -150], [0, 0.45]);    // Left (Again)
  const overlayBlue = useTransform(x, [50, 150], [0, 0.45]);       // Right (Easy)
  const overlayGreen = useTransform(y, [-50, -150], [0, 0.45]);   // Up (Good/Normal)
  const overlayOrange = useTransform(y, [50, 150], [0, 0.45]);     // Down (Hard)

  // Stamp opacities for 4 directions
  const stampAgainOpacity = useTransform(x, [-50, -130], [0, 1]);
  const stampEasyOpacity = useTransform(x, [50, 130], [0, 1]);
  const stampGoodOpacity = useTransform(y, [-50, -130], [0, 1]);
  const stampHardOpacity = useTransform(y, [50, 130], [0, 1]);

  // Initialize queue once when vocab is loaded
  useEffect(() => {
    if (!loading && !isInitialized) {
      const due = vocab.filter(w => w.srsLevel !== 'Mastered' && new Date(w.nextReviewDate) <= new Date());
      setSessionQueue(due);
      setIsInitialized(true);
    }
  }, [vocab, loading, isInitialized]);

  // Listener to handle exiting custom study sessions from Hamburger menu
  useEffect(() => {
    const handleExitSession = () => {
      const due = vocab.filter(w => w.srsLevel !== 'Mastered' && new Date(w.nextReviewDate) <= new Date());
      setSessionQueue(due);
      setIsStudying(false);
      setIsCustomSession(false);
      try {
        localStorage.removeItem('memeng_is_studying');
      } catch (err) {}
    };

    window.addEventListener('exit-study-session', handleExitSession);
    return () => {
      window.removeEventListener('exit-study-session', handleExitSession);
    };
  }, [vocab]);

  const wordObj = sessionQueue[0];
  
  let richCardData = wordObj ? parseMeaningField(wordObj.meaning) : null;

  const sentenceText = richCardData?.scenes?.[0]?.dialogue || '';
  const projections = wordObj ? getProjectedIntervals(wordObj) : { again: '10m', hard: '1d', normal: '3d', easy: '6d' };

  useEffect(() => {
    setRegenCount(0);
  }, [wordObj?.id]);

  useEffect(() => {
    if (!wordObj) {
      setActiveReviewImageUrl('');
      return;
    }
    
    let parsedMeaning = parseMeaningField(wordObj.meaning);

    if (wordObj.isImageSaved && wordObj.videoUrl) {
      setActiveReviewImageUrl(wordObj.videoUrl);
    } else if (parsedMeaning && parsedMeaning.savedSceneImages && parsedMeaning.savedSceneImages.length > 0) {
      const randomIdx = Math.floor(Math.random() * parsedMeaning.savedSceneImages.length);
      setActiveReviewImageUrl(parsedMeaning.savedSceneImages[randomIdx]);
    } else {
      setActiveReviewImageUrl(wordObj.videoUrl || '');
    }
  }, [wordObj?.id, wordObj?.isImageSaved, wordObj?.videoUrl]);

  const getStatusWords = () => {
    if (!selectedStatus) return [];
    let list = [];
    if (selectedStatus === 'Total') {
      list = vocab;
    } else if (selectedStatus === 'Due') {
      list = vocab.filter(w => w.srsLevel !== 'Mastered' && new Date(w.nextReviewDate) <= new Date());
    } else if (selectedStatus === 'Easy') {
      list = vocab.filter(w => w.srsLevel === 'Easy' || w.srsLevel === 'Super Easy');
    } else {
      list = vocab.filter(w => w.srsLevel === selectedStatus);
    }

    if (statusSearchQuery.trim()) {
      const q = statusSearchQuery.toLowerCase();
      list = list.filter(w => 
        (w.word && w.word.toLowerCase().includes(q)) || 
        (w.meaning && w.meaning.toLowerCase().includes(q))
      );
    }
    return list;
  };

  const statusWords = getStatusWords();
  const getModalColor = () => {
    const colors = {
      'Learning': '#cbd5e1',
      'Hard': '#ef4444',
      'Normal': '#10b981',
      'Easy': '#3b82f6',
      'Mastered': '#eab308',
      'Total': '#ffffff',
      'Due': '#f43f5e'
    };
    return colors[selectedStatus] || '#cbd5e1';
  };
  const renderDropdownMenu = () => {
    const srsStages = [
      { id: 'Learning', label: 'Learn', color: '#cbd5e1', count: getSrsDueCount('Learning') },
      { id: 'Easy', label: 'Easy', color: '#3b82f6', count: getSrsDueCount('Easy') },
      { id: 'Normal', label: 'Normal', color: '#10b981', count: getSrsDueCount('Normal') },
      { id: 'Hard', label: 'Hard', color: '#ef4444', count: getSrsDueCount('Hard') }
    ];

    const activeStages = srsStages.filter(stage => stage.count > 0);

    return (
      <motion.div
        initial={{ opacity: 0, height: 0, scale: 0.98 }}
        animate={{ opacity: 1, height: 'auto', scale: 1 }}
        exit={{ opacity: 0, height: 0, scale: 0.98 }}
        transition={{ duration: 0.25, ease: 'easeInOut' }}
        style={{
          marginTop: '0.6rem',
          width: '100%',
          maxWidth: '340px',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.4rem',
          overflow: 'hidden'
        }}
      >
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '0.35rem', width: '100%' }}>
          {activeStages.map(stage => (
            <ReviewOptionButton
              key={stage.id}
              id={stage.id}
              label={stage.label}
              color={stage.color}
              onClick={() => handleCustomReview('srs', stage.id === 'Easy' ? 'Easy' : stage.id)}
            />
          ))}
          {activeCurriculum !== 'Self-Study only' && (
            <ReviewOptionButton
              id="newWords"
              label="+10"
              color="#a78bfa"
              disabled={isLoadingNewWords}
              isLoading={isLoadingNewWords}
              icon={Sparkles}
              onClick={handleStartWithNewWords}
            />
          )}
        </div>
      </motion.div>
    );
  };

  const renderStatusModal = () => {
    const getWordSrsColor = (level) => {
      const colors = {
        'Learning': '#cbd5e1',
        'Hard': '#ef4444',
        'Normal': '#10b981',
        'Easy': '#3b82f6',
        'Super Easy': '#3b82f6',
        'Mastered': '#eab308'
      };
      return colors[level] || '#cbd5e1';
    };

    return (
      <AnimatePresence>
        {selectedStatus && (
          <>
            {/* Modal Overlay */}
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => {
                setSelectedStatus(null);
                setStatusSearchQuery('');
              }}
              style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 11000, backdropFilter: 'blur(8px)' }}
            />
            {/* Centered Modal Container */}
            <div style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 12000,
              pointerEvents: 'none'
            }}>
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }} 
                animate={{ scale: 1, opacity: 1 }} 
                exit={{ scale: 0.95, opacity: 0 }}
                transition={{ type: 'spring', damping: 26, stiffness: 320 }}
                style={{
                  pointerEvents: 'auto',
                  width: '90%', maxWidth: '440px', height: '80%', maxHeight: '85%',
                  background: 'radial-gradient(circle at 50% 0%, rgba(255, 255, 255, 0.09) 0%, rgba(10, 12, 17, 0.72) 100%)',
                  backdropFilter: 'blur(30px) saturate(180%)',
                  WebkitBackdropFilter: 'blur(30px) saturate(180%)',
                  borderRadius: '24px', 
                  border: `1px solid rgba(255, 255, 255, 0.14)`, 
                  boxShadow: `0 25px 60px rgba(0, 0, 0, 0.85), inset 0 1px 0 rgba(255, 255, 255, 0.2), 0 0 40px ${getModalColor()}15`,
                  display: 'flex', flexDirection: 'column', overflow: 'hidden'
                }}
              >
                {/* Header */}
                <div style={{ padding: '1.25rem 1.5rem 0.85rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
                  <div>
                    <h2 style={{ margin: '0 0 0.15rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'white', fontSize: '1.35rem', fontWeight: 900 }}>
                       <span style={{ color: getModalColor() }}>{selectedStatus}</span> Cards
                    </h2>
                    <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Viewing {statusWords.length} words in this stage</p>
                  </div>
                  <button 
                    onClick={() => {
                      setSelectedStatus(null);
                      setStatusSearchQuery('');
                    }} 
                    style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
                  >
                    <X size={22} />
                  </button>
                </div>

                {/* Inline Search Bar */}
                <div style={{ padding: '0 1.5rem 1rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)', position: 'relative', flexShrink: 0 }}>
                  <Search size={16} color="var(--text-secondary)" style={{ position: 'absolute', left: '2.2rem', top: '50%', transform: 'translateY(-50%)' }} />
                  <input 
                    type="text" 
                    placeholder={`Search ${selectedStatus.toLowerCase()} cards...`}
                    value={statusSearchQuery}
                    onChange={(e) => setStatusSearchQuery(e.target.value)}
                    style={{
                      width: '100%', padding: '0.6rem 1rem 0.6rem 2.2rem', borderRadius: '12px',
                      background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)',
                      color: 'white', fontSize: '0.85rem', outline: 'none',
                      transition: 'all 0.2s'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = getModalColor();
                      e.target.style.boxShadow = `0 0 10px ${getModalColor()}40`;
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                      e.target.style.boxShadow = 'none';
                    }}
                  />
                  {statusSearchQuery && (
                    <button 
                      onClick={() => setStatusSearchQuery('')} 
                      style={{ position: 'absolute', right: '2.2rem', top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>

                <div 
                  className="scrollable-content" 
                  onScroll={() => {
                    if (Object.keys(revealedCardIds).length > 0) {
                      setRevealedCardIds({});
                    }
                  }}
                  style={{ flex: 1, overflowY: 'auto', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}
                >
                  {statusWords.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                      No cards found matching your query.
                    </div>
                  ) : (
                    statusWords.map(item => {
                      let parsedMeaning = parseMeaningField(item.meaning);
                      const definition = parsedMeaning?.englishExplanation?.definition || item.meaning;
                      const thaiTranslation = parsedMeaning?.thaiTranslation?.word || '';

                      const isFlipped = !!revealedCardIds[item.id];
                      const srsColor = getWordSrsColor(item.srsLevel);

                      return (
                        <div key={item.id} className="flip-card-container" style={{ height: 'auto', flexShrink: 0, transition: 'height 0.6s cubic-bezier(0.4, 0, 0.2, 1)', marginBottom: '1rem' }}>
                          <div 
                            className={`flip-card-inner ${isFlipped ? 'flipped' : ''}`}
                            style={{ position: 'relative', width: '100%', transition: 'transform 0.6s cubic-bezier(0.4, 0, 0.2, 1)', transformStyle: 'preserve-3d', transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)' }}
                            onClick={() => {
                              setRevealedCardIds(prev => ({
                                ...prev,
                                [item.id]: !prev[item.id]
                              }));
                            }}
                          >
                            
                            {/* FRONT SIDE (English Only) */}
                            <div 
                              className="glass-panel flip-card-front"
                              style={{
                                padding: '1.1rem',
                                borderLeft: `4px solid ${srsColor}`,
                                background: 'rgba(255, 255, 255, 0.02)',
                                borderTop: '1px solid rgba(255, 255, 255, 0.04)',
                                borderRight: '1px solid rgba(255, 255, 255, 0.04)',
                                borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                                borderRadius: '16px',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '0.85rem',
                                textAlign: 'left',
                                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.25)',
                                backdropFilter: 'blur(10px)',
                                WebkitBackdropFilter: 'blur(10px)',
                                cursor: 'pointer',
                                userSelect: 'none',
                                position: isFlipped ? 'absolute' : 'relative',
                                inset: isFlipped ? 0 : 'auto',
                                visibility: isFlipped ? 'hidden' : 'visible',
                                pointerEvents: isFlipped ? 'none' : 'auto',
                                backfaceVisibility: 'hidden',
                                boxSizing: 'border-box'
                              }}
                            >
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
                                <div style={{ flex: 1 }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                                    <h3 style={{ margin: 0, fontSize: '1.2rem', color: 'white', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                      {item.word}
                                      <span style={{ fontSize: '0.7rem', background: 'rgba(255,255,255,0.08)', color: 'var(--text-secondary)', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>
                                        {item.pos || 'n.'}
                                      </span>
                                    </h3>
                                    <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center', marginLeft: 'auto', marginRight: '0.5rem' }}>
                                      <span style={{ 
                                        fontSize: '0.55rem', 
                                        padding: '0.22rem 0.5rem', 
                                        borderRadius: '8px', 
                                        background: 'rgba(255, 255, 255, 0.04)', 
                                        border: '1px solid rgba(255, 255, 255, 0.08)', 
                                        color: '#94a3b8', 
                                        fontWeight: 700 
                                      }}>
                                         {getNextReviewText(item.nextReviewDate)}
                                      </span>
                                    </div>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        speakText(item.word);
                                      }}
                                      style={{
                                        background: 'transparent',
                                        border: 'none',
                                        color: 'rgba(255, 255, 255, 0.45)',
                                        cursor: 'pointer',
                                        padding: '4px',
                                        borderRadius: '6px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        transition: 'color 0.2s, background 0.2s',
                                        marginRight: '0.25rem'
                                      }}
                                      onMouseEnter={(e) => {
                                        e.currentTarget.style.color = '#3b82f6';
                                        e.currentTarget.style.background = 'rgba(59, 130, 246, 0.08)';
                                      }}
                                      onMouseLeave={(e) => {
                                        e.currentTarget.style.color = 'rgba(255, 255, 255, 0.45)';
                                        e.currentTarget.style.background = 'transparent';
                                      }}
                                      title="Pronounce word"
                                    >
                                      <Volume2 size={15} />
                                    </button>

                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (window.confirm(`ต้องการลบคำว่า "${item.word}" ออกจาก Deck จริงๆ หรือไม่?`)) {
                                          deleteWordFromDeck(item.id);
                                        }
                                      }}
                                      style={{
                                        background: 'transparent',
                                        border: 'none',
                                        color: 'rgba(239, 68, 68, 0.45)',
                                        cursor: 'pointer',
                                        padding: '4px',
                                        borderRadius: '6px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        transition: 'color 0.2s, background 0.2s'
                                      }}
                                      onMouseEnter={(e) => {
                                        e.currentTarget.style.color = '#ef4444';
                                        e.currentTarget.style.background = 'rgba(239, 68, 68, 0.08)';
                                      }}
                                      onMouseLeave={(e) => {
                                        e.currentTarget.style.color = 'rgba(239, 68, 68, 0.45)';
                                        e.currentTarget.style.background = 'transparent';
                                      }}
                                      title="Delete word from deck"
                                    >
                                      <Trash2 size={15} />
                                    </button>
                                  </div>

                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                    {/* Definition */}
                                    <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: '1.45' }}>
                                      {definition}
                                    </p>

                                    {/* Example Sentence */}
                                    <div>
                                      <span style={{ fontSize: '0.58rem', textTransform: 'uppercase', color: 'var(--accent-color)', fontWeight: 800, letterSpacing: '0.5px', display: 'block', marginBottom: '0.15rem' }}>Example Sentence</span>
                                      <p style={{ margin: 0, fontSize: '0.82rem', color: 'white', fontWeight: 700, fontStyle: 'italic', lineHeight: '1.4' }}>
                                        "{item.example || parsedMeaning?.scenes?.[0]?.dialogue || 'No example sentence available.'}"
                                      </p>
                                    </div>
                                  </div>
                                </div>

                                {/* Image Thumbnail Box */}
                                {item.videoUrl && (
                                  <div style={{ width: '96px', height: '96px', borderRadius: '12px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.08)', flexShrink: 0, boxShadow: '0 4px 12px rgba(0,0,0,0.3)', alignSelf: 'center' }}>
                                    <img 
                                      src={cleanMediaUrl(item.videoUrl)} 
                                      alt={item.word} 
                                      draggable="false"
                                      onDragStart={(e) => e.preventDefault()}
                                      style={{ width: '100%', height: '100%', objectFit: 'cover', userSelect: 'none', WebkitUserDrag: 'none' }} 
                                    />
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* BACK SIDE (Thai Translation + rating buttons) */}
                            <div 
                              className="glass-panel flip-card-back"
                              style={{
                                padding: '1.1rem',
                                borderLeft: `4px solid ${srsColor}`,
                                background: 'rgba(255, 255, 255, 0.02)',
                                borderTop: '1px solid rgba(255, 255, 255, 0.04)',
                                borderRight: '1px solid rgba(255, 255, 255, 0.04)',
                                borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                                borderRadius: '16px',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '0.85rem',
                                textAlign: 'left',
                                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.25)',
                                backdropFilter: 'blur(10px)',
                                WebkitBackdropFilter: 'blur(10px)',
                                cursor: 'pointer',
                                userSelect: 'none',
                                position: isFlipped ? 'relative' : 'absolute',
                                inset: isFlipped ? 'auto' : 0,
                                visibility: isFlipped ? 'visible' : 'hidden',
                                pointerEvents: isFlipped ? 'auto' : 'none',
                                backfaceVisibility: 'hidden',
                                transform: 'rotateY(180deg)',
                                boxSizing: 'border-box'
                              }}
                            >
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
                                <div style={{ flex: 1 }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                                    <h3 style={{ margin: 0, fontSize: '1.2rem', color: 'white', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                      {item.word}
                                      <span style={{ fontSize: '0.7rem', background: 'rgba(255,255,255,0.08)', color: 'var(--text-secondary)', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>
                                        {item.pos || 'n.'}
                                      </span>
                                    </h3>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (window.confirm(`ต้องการลบคำว่า "${item.word}" ออกจาก Deck จริงๆ หรือไม่?`)) {
                                          deleteWordFromDeck(item.id);
                                        }
                                      }}
                                      style={{
                                        background: 'transparent',
                                        border: 'none',
                                        color: 'rgba(239, 68, 68, 0.45)',
                                        cursor: 'pointer',
                                        padding: '4px',
                                        borderRadius: '6px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        transition: 'color 0.2s, background 0.2s'
                                      }}
                                      onMouseEnter={(e) => {
                                        e.currentTarget.style.color = '#ef4444';
                                        e.currentTarget.style.background = 'rgba(239, 68, 68, 0.08)';
                                      }}
                                      onMouseLeave={(e) => {
                                        e.currentTarget.style.color = 'rgba(239, 68, 68, 0.45)';
                                        e.currentTarget.style.background = 'transparent';
                                      }}
                                      title="Delete word from deck"
                                    >
                                      <Trash2 size={15} />
                                    </button>
                                  </div>

                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginTop: '0.5rem' }}>
                                    <p style={{ margin: 0, fontSize: '1.05rem', color: '#facc15', fontWeight: 800, lineHeight: '1.3' }}>
                                      {thaiTranslation || 'ไม่มีคำแปลภาษาไทย'}
                                    </p>
                                    {parsedMeaning?.scenes?.[0]?.meaning && (
                                      <p style={{ margin: 0, fontSize: '0.85rem', color: 'rgba(255,255,255,0.7)', fontWeight: 600, lineHeight: '1.3' }}>
                                        {highlightThaiTranslation(parsedMeaning.scenes[0].meaning, thaiTranslation)}
                                      </p>
                                    )}
                                  </div>
                                </div>

                                {/* Image Thumbnail Box */}
                                {item.videoUrl && (
                                  <div style={{ width: '96px', height: '96px', borderRadius: '12px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.08)', flexShrink: 0, boxShadow: '0 4px 12px rgba(0,0,0,0.3)', alignSelf: 'center' }}>
                                    <img 
                                      src={cleanMediaUrl(item.videoUrl)} 
                                      alt={item.word} 
                                      draggable="false"
                                      onDragStart={(e) => e.preventDefault()}
                                      style={{ width: '100%', height: '100%', objectFit: 'cover', userSelect: 'none', WebkitUserDrag: 'none' }} 
                                    />
                                  </div>
                                )}
                              </div>

                              {/* FSRS Rating Buttons (shown directly at the bottom of back side) */}
                              <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '0.65rem', marginTop: '0.35rem' }}>
                                <div style={{ display: 'flex', gap: '0.3rem', width: '100%' }}>
                                  <button 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      updateWordSrs(item.id, 'again');
                                    }}
                                    className="glass-button"
                                    style={{ 
                                      flex: 1.2, 
                                      padding: '0.35rem 0.2rem', 
                                      fontSize: '0.62rem', 
                                      borderRadius: '8px',
                                      background: item.srsLevel === 'Learning' ? 'rgba(203, 213, 225, 0.15)' : 'transparent',
                                      borderColor: 'rgba(203, 213, 225, 0.25)',
                                      color: '#cbd5e1',
                                      fontWeight: 800
                                    }}
                                  >
                                    Again (Learning)
                                  </button>
                                  <button 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      updateWordSrs(item.id, 'hard');
                                    }}
                                    className="glass-button"
                                    style={{ 
                                      flex: 1, 
                                      padding: '0.35rem 0.2rem', 
                                      fontSize: '0.62rem', 
                                      borderRadius: '8px',
                                      background: item.srsLevel === 'Hard' ? 'rgba(239, 68, 68, 0.15)' : 'transparent',
                                      borderColor: 'rgba(239, 68, 68, 0.25)',
                                      color: '#ef4444',
                                      fontWeight: 800
                                    }}
                                  >
                                    Hard
                                  </button>
                                  <button 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      updateWordSrs(item.id, 'normal');
                                    }}
                                    className="glass-button"
                                    style={{ 
                                      flex: 1, 
                                      padding: '0.35rem 0.2rem', 
                                      fontSize: '0.62rem', 
                                      borderRadius: '8px',
                                      background: item.srsLevel === 'Normal' ? 'rgba(16, 185, 129, 0.15)' : 'transparent',
                                      borderColor: 'rgba(16, 185, 129, 0.25)',
                                      color: '#10b981',
                                      fontWeight: 800
                                    }}
                                  >
                                    Good (Normal)
                                  </button>
                                  <button 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      updateWordSrs(item.id, 'easy');
                                    }}
                                    className="glass-button"
                                    style={{ 
                                      flex: 1, 
                                      padding: '0.35rem 0.2rem', 
                                      fontSize: '0.62rem', 
                                      borderRadius: '8px',
                                      background: (item.srsLevel === 'Easy' || item.srsLevel === 'Super Easy') ? 'rgba(59, 130, 246, 0.15)' : 'transparent',
                                      borderColor: 'rgba(59, 130, 246, 0.25)',
                                      color: '#3b82f6',
                                      fontWeight: 800
                                    }}
                                  >
                                    Easy
                                  </button>
                                </div>
                              </div>
                            </div>

                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>
    );
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
                <span className="badge-neon" style={{ fontSize: '0.55rem', padding: '0.1rem 0.35rem' }}>
                  {tooltipDetails.pos}
                </span>
              )}
              {/* Audio Pronunciation Button */}
              <button 
                onClick={() => handleSpeak(activeTooltipWord)} 
                className="glass-button animate-scale" 
                style={{ 
                  width: '24px', 
                  height: '24px', 
                  borderRadius: '50%', 
                  padding: 0, 
                  background: 'rgba(255,255,255,0.03)', 
                  borderColor: 'rgba(255,255,255,0.08)', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  cursor: 'pointer' 
                }}
              >
                <Volume2 size={10} color="var(--accent-hover)" />
              </button>
            </div>

            {/* Content loading state */}
            {isSearchingTooltipWord ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem 0' }}>
                <Loader2 size={24} className="spin" color="#ff7a00" />
              </div>
            ) : (
              <>
                {/* Definitions */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  {/* English Definition */}
                  <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.7)', lineHeight: 1.45 }}>
                    <span style={{ color: 'rgba(255,255,255,0.3)', fontWeight: 800, textTransform: 'uppercase', fontSize: '0.55rem', display: 'block', marginBottom: '0.1rem' }}>Definition</span>
                    {renderInteractiveSentence(tooltipDetails?.definition, null, handleWordClick)}
                  </div>
                  {/* Thai Definition */}
                  <div style={{ fontSize: '0.82rem', color: '#10b981', fontWeight: 600 }}>
                    <span style={{ color: 'rgba(16,185,129,0.4)', fontWeight: 800, textTransform: 'uppercase', fontSize: '0.55rem', display: 'block', marginBottom: '0.1rem' }}>Thai Translation</span>
                    {renderInteractiveSentence(tooltipDetails?.translation, null, handleWordClick)}
                  </div>
                </div>

                {/* Add to Deck Action Button */}
                <div style={{ marginTop: '0.4rem' }}>
                  {tooltipDetails?.alreadyInDeck ? (
                    <button 
                      disabled 
                      className="glass-button" 
                      style={{ 
                        width: '100%', 
                        fontSize: '0.75rem', 
                        padding: '0.5rem', 
                        borderRadius: '12px', 
                        background: 'rgba(16,185,129,0.08)', 
                        borderColor: 'rgba(16,185,129,0.2)', 
                        color: '#10b981', 
                        fontWeight: 800,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.3rem'
                      }}
                    >
                      <CheckCircle size={11} />
                      <span>Already in Deck</span>
                    </button>
                  ) : (
                    <button 
                      onClick={handleAddWordFromTooltip}
                      disabled={isAddingTooltipWord || !tooltipDetails?.rawDetails}
                      className="glass-button primary animate-scale" 
                      style={{ 
                        width: '100%', 
                        fontSize: '0.75rem', 
                        padding: '0.5rem', 
                        borderRadius: '12px', 
                        fontWeight: 800,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.3rem',
                        background: 'linear-gradient(135deg, #f97316 0%, #ef4444 100%)',
                        border: 'none',
                        boxShadow: '0 4px 15px rgba(239, 68, 68, 0.25)'
                      }}
                    >
                      {isAddingTooltipWord ? (
                        <Loader2 size={11} className="spin" />
                      ) : (
                        <Sparkles size={11} />
                      )}
                      <span>Add to Deck</span>
                    </button>
                  )}
                </div>
              </>
            )}
          </motion.div>
        </div>
      </AnimatePresence>
    );
  };

  const renderUnlockedModal = () => {
    return (
      <>
        {/* Modal Overlay */}
        <motion.div 
          initial={{ opacity: 0 }} 
          animate={{ opacity: 1 }} 
          exit={{ opacity: 0 }}
          style={{ 
            position: 'absolute', 
            inset: 0, 
            background: 'rgba(5, 5, 8, 0.9)', 
            zIndex: 15000, 
            backdropFilter: 'blur(20px)' 
          }}
        />
        {/* Modal Container */}
        <div style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 16000,
          pointerEvents: 'none'
        }}>
          <motion.div
            initial={{ scale: 0.95, y: 30, opacity: 0 }} 
            animate={{ scale: 1, y: 0, opacity: 1 }} 
            exit={{ scale: 0.95, y: 30, opacity: 0 }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            style={{
              pointerEvents: 'auto',
              width: '92%', 
              maxWidth: '400px', 
              height: '82%', 
              background: 'radial-gradient(circle at 50% 0%, rgba(212, 175, 55, 0.12) 0%, rgba(8, 9, 11, 0.95) 100%)',
              backdropFilter: 'blur(30px) saturate(180%)',
              WebkitBackdropFilter: 'blur(30px) saturate(180%)',
              borderRadius: '28px', 
              border: '1px solid rgba(212, 175, 55, 0.2)', 
              boxShadow: '0 25px 60px rgba(0, 0, 0, 0.95), inset 0 1px 0 rgba(255, 255, 255, 0.15), 0 0 35px rgba(212, 175, 55, 0.08)',
              display: 'flex', 
              flexDirection: 'column', 
              overflow: 'hidden',
              padding: '1.5rem 1rem'
            }}
          >
            {/* Header */}
            <div style={{ textAlign: 'center', marginBottom: '1.25rem', flexShrink: 0 }}>
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                background: 'rgba(212, 175, 55, 0.12)',
                border: '1px solid rgba(212, 175, 55, 0.25)',
                boxShadow: '0 0 20px rgba(212, 175, 55, 0.2)',
                marginBottom: '0.75rem'
              }}>
                <Sparkles size={22} color="#d4af37" className="pulse" />
              </div>
              <h2 style={{
                fontSize: '1.45rem',
                fontWeight: 950,
                margin: 0,
                background: 'linear-gradient(135deg, #ffffff 0%, #cbd5e1 50%, #d4af37 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                letterSpacing: '-0.8px'
              }}>
                {unlockedWords.length} Cards Unlocked!
              </h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', marginTop: '0.2rem' }}>
                Tap cards to play pronunciation
              </p>
            </div>

            {/* List of cards */}
            <div 
              className="scrollable-content"
              style={{ 
                flex: 1, 
                display: 'flex', 
                flexDirection: 'column', 
                gap: '1rem', 
                overflowY: 'auto',
                paddingRight: '4px',
                marginBottom: '1rem'
              }}
            >
              {unlockedWords.map((card, index) => {
                let parsedMeaning = parseMeaningField(card.meaning);

                const definition = parsedMeaning.englishExplanation?.definition || parsedMeaning.definition || 'No definition available.';

                return (
                  <motion.div
                    key={card.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.08, type: 'spring', stiffness: 260, damping: 20 }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleSpeak(card.word)}
                    style={{
                      position: 'relative',
                      height: '140px',
                      borderRadius: '16px',
                      overflow: 'hidden',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      background: 'rgba(255, 255, 255, 0.02)',
                      cursor: 'pointer',
                      flexShrink: 0,
                      boxShadow: '0 8px 20px rgba(0,0,0,0.3)'
                    }}
                  >
                    {/* SafeImage Background */}
                    <div style={{ position: 'absolute', inset: 0, zIndex: 1 }}>
                      <SafeImage 
                        keyword={card.word} 
                        alt={card.word} 
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                      />
                    </div>

                    {/* Dark gradient for text visibility */}
                    <div style={{
                      position: 'absolute',
                      inset: 0,
                      background: 'linear-gradient(to top, rgba(8, 9, 11, 0.95) 0%, rgba(8, 9, 11, 0.4) 60%, rgba(8, 9, 11, 0.75) 100%)',
                      zIndex: 2,
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      padding: '0.75rem'
                    }} />

                    {/* Content on top of background */}
                    <div style={{
                      position: 'absolute',
                      inset: 0,
                      zIndex: 3,
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      padding: '0.75rem'
                    }}>
                      {/* Top metadata */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{
                          fontSize: '0.62rem',
                          background: 'rgba(212, 175, 55, 0.18)',
                          color: '#fcd34d',
                          border: '1px solid rgba(212, 175, 55, 0.28)',
                          padding: '0.15rem 0.45rem',
                          borderRadius: '6px',
                          fontWeight: 800,
                          textTransform: 'uppercase'
                        }}>
                          {card.cefrLevel || 'C1'}
                        </span>
                        
                        <span style={{
                          fontSize: '0.55rem',
                          background: 'rgba(255, 255, 255, 0.06)',
                          color: 'rgba(255, 255, 255, 0.65)',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          padding: '0.15rem 0.45rem',
                          borderRadius: '6px',
                          fontWeight: 800,
                          textTransform: 'uppercase'
                        }}>
                          {card.pos || 'n.'}
                        </span>
                      </div>

                      {/* Bottom title & meaning */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem', textAlign: 'left' }}>
                        <h4 style={{
                          fontSize: '1.15rem',
                          fontWeight: 950,
                          margin: 0,
                          color: '#ffffff',
                          textShadow: '0 2px 4px rgba(0,0,0,0.6)',
                          letterSpacing: '-0.3px'
                        }}>
                          {card.word}
                        </h4>
                        
                        <p style={{
                          margin: 0,
                          fontSize: '0.68rem',
                          color: 'rgba(255, 255, 255, 0.72)',
                          lineHeight: 1.35,
                          maxWidth: '90%',
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden'
                        }}>
                          {definition}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* Bottom CTAs */}
            <div style={{ display: 'flex', gap: '8px', flexShrink: 0, width: '100%', marginTop: '0.5rem' }}>
              <button
                onClick={() => handleCloseUnlockedWords(false)}
                className="glass-button animate-scale"
                style={{
                  flex: 1,
                  padding: '0.65rem',
                  fontSize: '0.85rem',
                  borderRadius: '18px',
                  fontWeight: 800,
                  background: 'rgba(255, 255, 255, 0.02)',
                  borderColor: 'rgba(255, 255, 255, 0.06)',
                  color: 'rgba(255, 255, 255, 0.75)'
                }}
              >
                Close
              </button>
              <button
                onClick={() => handleCloseUnlockedWords(true)}
                className="glass-button primary animate-scale"
                style={{
                  flex: 1.5,
                  padding: '0.65rem',
                  fontSize: '0.85rem',
                  borderRadius: '18px',
                  fontWeight: 900,
                  background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                  borderColor: 'transparent',
                  color: 'white',
                  boxShadow: '0 4px 15px rgba(217, 119, 6, 0.35)'
                }}
              >
                Start Study
              </button>
            </div>
          </motion.div>
        </div>
      </>
    );
  };

  const renderToast = () => {
    return (
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 16 }}
            exit={{ opacity: 0, y: -50 }}
            style={{
              position: 'absolute',
              top: 0,
              left: '5%',
              right: '5%',
              zIndex: 99999,
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              backdropFilter: 'blur(24px)',
              WebkitBackdropFilter: 'blur(24px)',
              borderRadius: '16px',
              padding: '0.85rem 1.2rem',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
              color: 'white',
              fontSize: '0.82rem',
              fontWeight: 600
            }}
          >
            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981' }} />
            <span style={{ flex: 1 }}>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>
    );
  };

  const [rightSwipeCount, setRightSwipeCount] = useState(0);
  const [flickSelection, setFlickSelection] = useState(null);
  const rightSwipeTimeoutRef = useRef(null);

  // Reset flick selection when wordObj changes
  useEffect(() => {
    setRightSwipeCount(0);
    setFlickSelection(null);
    if (rightSwipeTimeoutRef.current) {
      clearTimeout(rightSwipeTimeoutRef.current);
    }
    return () => {
      if (rightSwipeTimeoutRef.current) {
        clearTimeout(rightSwipeTimeoutRef.current);
      }
    };
  }, [wordObj]);

  const handleSpeakWord = () => {
    if (!wordObj || !wordObj.word || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(wordObj.word);
    utterance.lang = 'en-US';
    window.speechSynthesis.speak(utterance);
  };

  const handleReveal = () => {
    playClickSound();
    setRevealStep(1);
  };


  const handleSrsChoice = (choice) => {
    if (!wordObj) return;
    window.dispatchEvent(new CustomEvent('tutorial-srs-clicked', { detail: choice }));
    
    let durationMs = 1500;
    if (revealTimeRef.current) {
      durationMs = Math.round(performance.now() - revealTimeRef.current);
    }
    revealTimeRef.current = null;
    
    if (choice === 'again') {
      playAgainSound();
    } else {
      playSuccessSound();
    }
    
    // Save FSRS backend calculations
    updateWordSrs(wordObj.id, choice, durationMs);

    setTimeout(() => {
      setRevealStep(0);
      x.set(0); 
      y.set(0);
      setExitDirection(0);

      if (choice === 'again') {
        // Rotate failed cards to the end of the session queue so they practice again
        setSessionQueue(prev => {
          const [current, ...rest] = prev;
          return [...rest, current];
        });
      } else {
        // Remove correctly answered card from session queue
        setSessionQueue(prev => {
          const [current, ...rest] = prev;
          if (rest.length === 0) {
            setIsStudying(false);
          }
          return rest;
        });
      }
    }, 250);
  };

  const handleDragEnd = (event, info) => {
    const dragX = info.offset.x;
    const dragY = info.offset.y;
    const velocityX = info.velocity.x;
    const velocityY = info.velocity.y;

    const swipeThreshold = 60; 
    const velocityThreshold = 180; 

    const absX = Math.abs(dragX);
    const absY = Math.abs(dragY);

    if (absX > absY) {
      // Horizontal swipe
      if (dragX < -swipeThreshold || velocityX < -velocityThreshold) {
        // Swipe Left -> AGAIN
        setExitDirection('left');
        setFlickSelection({
          label: 'AGAIN',
          interval: projections.again,
          count: 1
        });
        if (rightSwipeTimeoutRef.current) clearTimeout(rightSwipeTimeoutRef.current);
        rightSwipeTimeoutRef.current = setTimeout(() => {
          handleSrsChoice('again');
        }, 450);
      } else if (dragX > swipeThreshold || velocityX > velocityThreshold) {
        // Swipe Right -> EASY
        setExitDirection('right');
        setFlickSelection({
          label: 'EASY',
          interval: projections.easy,
          count: 4 // Use 4 for Easy indicator
        });
        if (rightSwipeTimeoutRef.current) clearTimeout(rightSwipeTimeoutRef.current);
        rightSwipeTimeoutRef.current = setTimeout(() => {
          handleSrsChoice('easy');
        }, 450);
      }
    } else {
      // Vertical swipe
      if (dragY < -swipeThreshold || velocityY < -velocityThreshold) {
        // Swipe Up -> GOOD (Normal)
        setExitDirection('up');
        setFlickSelection({
          label: 'GOOD',
          interval: projections.normal,
          count: 3 // Use 3 for Good indicator
        });
        if (rightSwipeTimeoutRef.current) clearTimeout(rightSwipeTimeoutRef.current);
        rightSwipeTimeoutRef.current = setTimeout(() => {
          handleSrsChoice('normal');
        }, 450);
      } else if (dragY > swipeThreshold || velocityY > velocityThreshold) {
        // Swipe Down -> HARD
        setExitDirection('down');
        setFlickSelection({
          label: 'HARD',
          interval: projections.hard,
          count: 2 // Use 2 for Hard indicator
        });
        if (rightSwipeTimeoutRef.current) clearTimeout(rightSwipeTimeoutRef.current);
        rightSwipeTimeoutRef.current = setTimeout(() => {
          handleSrsChoice('hard');
        }, 450);
      }
    }
  };

  const formatWaitTime = (dateStr) => {
    if (!dateStr) return 'Unknown';
    const now = new Date();
    const target = new Date(dateStr);
    const diffMs = target - now;
    if (diffMs <= 0) return 'Ready';
    
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 60) return `${diffMins}m`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h`;
    
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d`;
  };

  const getSrsStats = () => {
    const stats = {
      'Learning': { count: 0, next: null },
      'Hard': { count: 0, next: null },
      'Normal': { count: 0, next: null },
      'Easy': { count: 0, next: null }
    };
    
    vocab.forEach(w => {
      let level = w.srsLevel || 'Learning';
      if (level === 'Super Easy') level = 'Easy';
      if (!stats[level]) stats[level] = { count: 0, next: null };
      stats[level].count++;
      
      const reviewDate = new Date(w.nextReviewDate);
      if (!stats[level].next || reviewDate < stats[level].next) {
        stats[level].next = reviewDate;
      }
    });

    return Object.entries(stats).filter(([k, v]) => v.count > 0).map(([k, v]) => ({
      level: k,
      count: v.count,
      waitTime: formatWaitTime(v.next)
    }));
  };

  // 1. Session Complete / Dashboard
  const dueCount = vocab.filter(w => w.srsLevel !== 'Mastered' && new Date(w.nextReviewDate) <= new Date()).length;

  if (isStudying && !wordObj) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'white', gap: '0.5rem' }}>
        <Loader2 className="spin" size={24} />
        <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', fontWeight: 600 }}>Loading Study Session…</span>
      </div>
    );
  }


  if (!isStudying || !sessionQueue || sessionQueue.length === 0) {
    return (
      <>
        <div 
          className="scrollable-content" 
          style={{ 
            padding: '65px 1.5rem 1.5rem 1.5rem', 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center', 
            justifyContent: showStats ? 'flex-start' : 'center', 
            minHeight: '100%', 
            height: showStats ? 'auto' : '100%',
            boxSizing: 'border-box',
            cursor: 'pointer',
            position: 'relative'
          }}
          onClick={() => {
            setShowStats(prev => !prev);
          }}
        >

          {/* Premium Artsy Morphing Ambient Glow in Minimal Mode */}
          {theme === 'theme-1' && !showStats && (
            <motion.div 
              animate={{ 
                borderRadius: ['42% 58% 70% 30% / 45% 45% 55% 55%', '70% 30% 52% 48% / 60% 40% 60% 40%', '42% 58% 70% 30% / 45% 45% 55% 55%'],
                rotate: [0, 180, 360]
              }}
              transition={{ 
                repeat: Infinity, 
                duration: 12, 
                ease: 'easeInOut' 
              }}
              style={{
                position: 'absolute',
                width: '320px',
                height: '320px',
                background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(167, 139, 250, 0.08) 50%, rgba(59, 130, 246, 0.1) 100%)',
                filter: 'blur(80px)',
                pointerEvents: 'none',
                zIndex: 0,
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                transformOrigin: 'center center'
              }} 
            />
          )}
          
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center', 
            justifyContent: 'center',
            flex: showStats ? '0 0 auto' : '1',
            width: '100%',
            margin: showStats ? '1.5rem 0' : 'auto 0',
            position: 'relative'
          }}>
            {/* Floating animating counter at the wrapper level */}
            <AnimatePresence>
              {addedProgress !== null && addedProgress > 0 && (
                <motion.div
                  key={addedProgress}
                  initial={{ opacity: 0, y: 15, scale: 0.7 }}
                  animate={{ opacity: 1, y: -65, scale: 1.25 }}
                  exit={{ opacity: 0, y: -90, scale: 0.8 }}
                  transition={{ type: 'spring', stiffness: 180, damping: 16 }}
                  style={{
                    position: 'absolute',
                    top: '25%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    padding: '0.35rem 0.75rem',
                    background: 'linear-gradient(135deg, #f97316 0%, #ef4444 100%)',
                    borderRadius: '20px',
                    color: 'white',
                    fontWeight: 900,
                    fontSize: '0.85rem',
                    boxShadow: '0 8px 25px rgba(239, 68, 68, 0.5)',
                    zIndex: 100,
                    pointerEvents: 'none',
                    whiteSpace: 'nowrap'
                  }}
                >
                  +{addedProgress} words
                </motion.div>
              )}
            </AnimatePresence>

            {/* Glowing Start Button or Check Circle */}
            <AnimatePresence mode="wait">
              {dueCount > 0 ? (
                <motion.div
                  key="start-dashboard"
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  transition={{ duration: 0.22 }}
                  style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.2rem', marginBottom: '1rem', zIndex: 1, position: 'relative', width: '100%' }}
                >
                  {/* Unified Glossy Button-Card */}
                  <motion.div
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.96 }}
                    onMouseDown={(e) => startPress(e, false)}
                    onMouseUp={(e) => endPress(e, false)}
                    onMouseLeave={(e) => {
                      cancelPress(e);
                      setStartHovered(false);
                    }}
                    onTouchStart={(e) => startPress(e, true)}
                    onTouchEnd={(e) => endPress(e, true)}
                    onTouchCancel={(e) => cancelPress(e)}
                    onMouseEnter={() => setStartHovered(true)}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      background: theme === 'theme-3' ? '#ffffff' : (startHovered ? 'linear-gradient(135deg, #f97316 0%, #ef4444 100%)' : 'linear-gradient(135deg, rgba(255, 255, 255, 0.07) 0%, rgba(255, 255, 255, 0.02) 100%)'),
                      border: theme === 'theme-3' ? '1px solid #000000' : '1px solid rgba(255, 255, 255, 0.12)',
                      borderColor: theme === 'theme-3' ? '#000000' : (startHovered ? 'transparent' : 'rgba(255, 255, 255, 0.12)'),
                      boxShadow: theme === 'theme-3'
                        ? 'none'
                        : (startHovered
                          ? '0 25px 50px rgba(239, 68, 68, 0.45), inset 0 1px 0 rgba(255, 255, 255, 0.25), inset 0 -1px 0 rgba(0, 0, 0, 0.3), 0 0 30px rgba(239, 68, 68, 0.4)'
                          : '0 20px 40px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.15), inset 0 -1px 0 rgba(0, 0, 0, 0.3)'),
                      borderRadius: theme === 'theme-3' ? '0px' : '24px',
                      padding: '1.5rem 2rem',
                      backdropFilter: theme === 'theme-3' ? 'none' : 'blur(35px)',
                      WebkitBackdropFilter: theme === 'theme-3' ? 'none' : 'blur(35px)',
                      position: 'relative',
                      overflow: 'hidden',
                      width: '240px',
                      textAlign: 'center',
                      cursor: 'pointer',
                      userSelect: 'none',
                      WebkitUserSelect: 'none',
                      transition: 'background 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease'
                    }}
                  >
                    {/* Diagonal Glass Shine Sweep Effect */}
                    {theme !== 'theme-3' && !startHovered && (
                      <motion.div
                        animate={{ x: ['-100%', '200%'] }}
                        transition={{ repeat: Infinity, duration: 3.5, ease: 'linear', repeatDelay: 1.5 }}
                        style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          width: '50%',
                          height: '100%',
                          background: 'linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.15) 50%, rgba(255,255,255,0) 100%)',
                          transform: 'skewX(-25deg)',
                          pointerEvents: 'none',
                          zIndex: 2
                        }}
                      />
                    )}

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.45rem', margin: '0 0 0.1rem 0' }}>
                      <Play size={16} fill={theme === 'theme-3' ? '#000000' : '#ffffff'} color="transparent" style={{ transform: 'translateY(1px)', opacity: startHovered ? 1 : 0.75, transition: 'opacity 0.2s' }} />
                      <h2 style={{
                        margin: 0,
                        fontSize: '2.5rem',
                        fontWeight: 950,
                        letterSpacing: '-1.5px',
                        background: theme === 'theme-3' ? 'none' : (startHovered ? 'none' : 'linear-gradient(135deg, #ffffff 0%, #cbd5e1 50%, #94a3b8 100%)'),
                        color: theme === 'theme-3' || startHovered ? '#ffffff' : 'transparent',
                        WebkitBackgroundClip: theme === 'theme-3' || startHovered ? 'initial' : 'text',
                        WebkitTextFillColor: theme === 'theme-3' || startHovered ? 'initial' : 'transparent',
                        lineHeight: 1.1
                      }}>
                        {dueCount}
                      </h2>
                    </div>
                    <p style={{
                      fontSize: '0.75rem',
                      color: theme === 'theme-3' ? '#666666' : (startHovered ? '#ffffff' : 'var(--text-secondary)'),
                      fontWeight: 900,
                      textTransform: 'uppercase',
                      letterSpacing: '2px',
                      margin: '4px 0 0 0',
                      transition: 'color 0.2s'
                    }}>
                      {startHovered ? 'starts' : 'cards'}
                    </p>
                  </motion.div>

                  {/* Dropdown Menu */}
                  <AnimatePresence>
                    {showStartMenu && renderDropdownMenu()}
                  </AnimatePresence>

                  {/* Real-time Background Importing Indicator */}
                  {isLoadingNewWords && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.65rem', fontSize: '0.72rem', color: '#f97316', fontWeight: 800 }}>
                      <Loader2 size={11} className="spin" />
                      <span>LOADING ADDITIONAL WORDS...</span>
                    </div>
                  )}
                </motion.div>
              ) : (
                <motion.div
                  key="caught-up-dashboard"
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  transition={{ duration: 0.22 }}
                  style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '1.5rem', width: '100%' }}
                >
                  {/* Glowing clickable check mark card */}
                  <motion.div 
                    whileHover={activeCurriculum !== 'Self-Study only' && !isLoadingNewWords ? { scale: 1.06, borderColor: '#f97316', boxShadow: '0 0 35px rgba(249, 115, 22, 0.25)' } : {}}
                    whileTap={activeCurriculum !== 'Self-Study only' && !isLoadingNewWords ? { scale: 0.94 } : {}}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (activeCurriculum !== 'Self-Study only' && !isLoadingNewWords) {
                        handleStartWithNewWords();
                      }
                    }}
                    style={{
                      padding: '1.25rem',
                      background: theme === 'theme-3' ? '#ffffff' : (activeCurriculum !== 'Self-Study only' ? 'radial-gradient(circle at 50% 0%, rgba(249, 115, 22, 0.1) 0%, rgba(255, 255, 255, 0.015) 100%)' : 'radial-gradient(circle at 50% 0%, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.015) 100%)'),
                      borderRadius: theme === 'theme-3' ? '0px' : '50%',
                      marginBottom: '1rem',
                      border: theme === 'theme-3' ? '1px solid #000000' : (activeCurriculum !== 'Self-Study only' ? '1px solid rgba(249, 115, 22, 0.2)' : '1px solid rgba(255, 255, 255, 0.12)'),
                      boxShadow: theme === 'theme-3' ? 'none' : '0 0 35px rgba(255, 255, 255, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: activeCurriculum !== 'Self-Study only' && !isLoadingNewWords ? 'pointer' : 'default',
                      position: 'relative',
                      transition: 'border-color 0.3s, box-shadow 0.3s'
                    }}
                  >
                    {isLoadingNewWords && addedProgress === 0 ? (
                      <Loader2 size={36} className="spin" color="#f97316" />
                    ) : (
                      <CheckCircle size={36} color={theme === 'theme-3' ? '#000000' : (activeCurriculum !== 'Self-Study only' ? '#f97316' : '#ffffff')} style={{ filter: theme === 'theme-3' ? 'none' : 'drop-shadow(0 0 6px rgba(255, 255, 255, 0.35))' }} />
                    )}
                  </motion.div>

                  <h2 style={{ color: theme === 'theme-3' ? '#000000' : 'white', marginBottom: '0.2rem', fontSize: '1.4rem', fontWeight: 900, letterSpacing: '-0.5px' }}>All caught up!</h2>
                  <p style={{ color: 'var(--text-secondary)', margin: '0 0 0.5rem 0', fontSize: '0.85rem' }}>You've reviewed all cards for today.</p>
                  {activeCurriculum !== 'Self-Study only' && (
                    <p style={{ fontSize: '0.68rem', color: '#f97316', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px', cursor: 'pointer' }}>
                      Tap check mark to load new words
                    </p>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {isCustomSession && (
              <motion.button
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                onClick={(e) => {
                  e.stopPropagation();
                  const due = vocab.filter(w => w.srsLevel !== 'Mastered' && new Date(w.nextReviewDate) <= new Date());
                  setSessionQueue(due);
                  setIsCustomSession(false);
                  setIsStudying(false);
                  try {
                    localStorage.removeItem('memeng_is_studying');
                  } catch (err) {}
                }}
                className="glass-button animate-scale"
                style={{
                  marginTop: '1rem',
                  marginBottom: '1rem',
                  padding: '0.6rem 2rem',
                  fontSize: '0.82rem',
                  borderRadius: '20px',
                  background: 'rgba(239, 68, 68, 0.05)',
                  border: '1px solid rgba(239, 68, 68, 0.15)',
                  color: '#ef4444',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  zIndex: 30
                }}
              >
                <RotateCcw size={13} />
                <span>กลับไป Flashcard ปกติ</span>
              </motion.button>
            )}

            {!showStats && (
              <motion.div 
                animate={{ backgroundPosition: ['200% 0%', '-200% 0%'] }}
                transition={{ repeat: Infinity, duration: 3.5, ease: 'linear' }}
                style={{
                  marginTop: '3.5rem',
                  fontSize: '0.75rem',
                  fontWeight: 950,
                  backgroundImage: 'linear-gradient(90deg, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0.9) 50%, rgba(255,255,255,0.2) 100%)',
                  backgroundSize: '200% 100%',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  letterSpacing: '0.45em',
                  zIndex: 1,
                  pointerEvents: 'none'
                }}
              >
                <span>•</span>
                <span>TAP</span>
                <span style={{ letterSpacing: 'normal' }}>•</span>
              </motion.div>
            )}
          </div>

          <AnimatePresence>
            {showStats && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                transition={{ duration: 0.3 }}
                style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}
              >
                {/* Minimal overview metrics row */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem', width: '100%', marginBottom: '1.25rem' }}>
                  <motion.div 
                    whileTap={{ scale: 0.97 }}
                    whileHover={{ scale: 1.03 }}
                    onMouseEnter={() => setTotalHovered(true)}
                    onMouseLeave={() => setTotalHovered(false)}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedStatus('Total');
                    }}
                    className="glass-panel" 
                    style={{ 
                      padding: '0.9rem 0.5rem', 
                      background: theme === 'theme-3'
                        ? (totalHovered ? '#f5f5f5' : '#ffffff')
                        : (totalHovered ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.015)'), 
                      border: theme === 'theme-3'
                        ? '1px solid #000000'
                        : (totalHovered ? '1px solid rgba(255, 255, 255, 0.45)' : '1px solid rgba(255, 255, 255, 0.04)'), 
                      borderRadius: theme === 'theme-3' ? '0px' : '18px', 
                      textAlign: 'center',
                      cursor: 'pointer',
                      boxShadow: theme === 'theme-3' ? 'none' : (totalHovered ? '0 0 20px rgba(255, 255, 255, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.05)' : 'none'),
                      transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)'
                    }}
                  >
                    <span style={{ 
                      display: 'block', 
                      fontSize: '1.25rem', 
                      fontWeight: 900, 
                      color: theme === 'theme-3'
                        ? '#000000'
                        : (totalHovered ? '#ffffff' : '#f8fafc'), 
                      transition: 'color 0.2s' 
                    }}>
                      {vocab.length}
                    </span>
                    <span style={{ 
                      fontSize: '0.62rem', 
                      color: theme === 'theme-3'
                        ? '#666666'
                        : (totalHovered ? 'rgba(255, 255, 255, 0.8)' : 'var(--text-secondary)'), 
                      textTransform: 'uppercase', 
                      fontWeight: 800, 
                      letterSpacing: '0.5px', 
                      transition: 'color 0.2s' 
                    }}>
                      Total Words
                    </span>
                  </motion.div>

                  <motion.div 
                    whileTap={{ scale: 0.97 }}
                    whileHover={{ scale: 1.03 }}
                    onMouseEnter={() => setDueHovered(true)}
                    onMouseLeave={() => setDueHovered(false)}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedStatus('Due');
                    }}
                    className="glass-panel" 
                    style={{ 
                      padding: '0.9rem 0.5rem', 
                      background: theme === 'theme-3'
                        ? (dueHovered ? '#f5f5f5' : '#ffffff')
                        : (dueHovered ? 'rgba(234, 179, 8, 0.08)' : 'rgba(255, 255, 255, 0.015)'), 
                      border: theme === 'theme-3'
                        ? '1px solid #000000'
                        : (dueHovered ? '1px solid #eab308' : '1px solid rgba(255, 255, 255, 0.04)'), 
                      borderRadius: theme === 'theme-3' ? '0px' : '18px', 
                      textAlign: 'center',
                      cursor: 'pointer',
                      boxShadow: theme === 'theme-3' ? 'none' : (dueHovered ? '0 0 20px rgba(234, 179, 8, 0.25), inset 0 1px 0 rgba(234, 179, 8, 0.1)' : 'none'),
                      transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)'
                    }}
                  >
                    <span style={{ 
                      display: 'block', 
                      fontSize: '1.25rem', 
                      fontWeight: 900, 
                      color: theme === 'theme-3'
                        ? '#000000'
                        : (dueHovered ? '#eab308' : '#ffffff'), 
                      transition: 'color 0.2s' 
                    }}>
                      {vocab.filter(w => w.srsLevel !== 'Mastered' && new Date(w.nextReviewDate) <= new Date()).length}
                    </span>
                    <span style={{ 
                      fontSize: '0.62rem', 
                      color: theme === 'theme-3'
                        ? '#666666'
                        : (dueHovered ? 'rgba(234, 179, 8, 0.8)' : 'var(--text-secondary)'), 
                      textTransform: 'uppercase', 
                      fontWeight: 800, 
                      letterSpacing: '0.5px', 
                      transition: 'color 0.2s' 
                    }}>
                      Due Cards
                    </span>
                  </motion.div>
                </div>

                {/* Detailed color-coded SRS overview */}
                <div 
                  className="glass-panel" 
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedStatus('Mastered');
                  }}
                  onMouseEnter={(e) => {
                    if (theme !== 'theme-3') {
                      e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                      e.currentTarget.style.borderColor = 'rgba(234, 179, 8, 0.25)';
                      e.currentTarget.style.boxShadow = '0 0 15px rgba(234, 179, 8, 0.08)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (theme !== 'theme-3') {
                      e.currentTarget.style.background = 'rgba(255,255,255,0.01)';
                      e.currentTarget.style.borderColor = 'rgba(255,255,255,0.05)';
                      e.currentTarget.style.boxShadow = 'none';
                    }
                  }}
                  style={{ 
                    width: '100%', 
                    padding: '1.25rem', 
                    textAlign: 'left', 
                    background: theme === 'theme-3' ? '#ffffff' : 'rgba(255,255,255,0.01)', 
                    border: theme === 'theme-3' ? '1px solid #000000' : '1px solid rgba(255,255,255,0.05)', 
                    borderRadius: theme === 'theme-3' ? '0px' : '24px',
                    cursor: 'pointer',
                    transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)'
                  }}
                >
                  {(() => {
                    const mCount = vocab.filter(w => w.srsLevel === 'Mastered').length;
                    const tot = vocab.length;
                    const pct = Math.round((mCount / (tot || 1)) * 100);
                    const dueCount = vocab.filter(w => w.srsLevel !== 'Mastered' && new Date(w.nextReviewDate) <= new Date()).length;

                    return (
                      <>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.65rem' }}>
                          <h3 style={{ 
                            margin: 0, 
                            fontSize: '0.9rem', 
                            color: 'white', 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '0.4rem', 
                            fontWeight: 800 
                          }}>
                            <Activity size={15} color="#cbd5e1" style={{ opacity: 0.8 }} />
                            <span>Deck Mastery</span>
                          </h3>
                          <span style={{ fontSize: '1.15rem', fontWeight: 950, color: '#ffffff', letterSpacing: '-0.3px' }}>
                            {pct}%
                          </span>
                        </div>

                        {/* Thin Premium Tech-Indigo Gradient Progress Bar */}
                        <div style={{
                          height: '6px',
                          borderRadius: '3px',
                          background: 'rgba(255, 255, 255, 0.04)',
                          overflow: 'hidden',
                          width: '100%',
                          marginBottom: '0.85rem',
                          border: '1px solid rgba(255,255,255,0.01)'
                        }}>
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${pct}%` }}
                            transition={{ duration: 0.8, ease: 'easeOut' }}
                            style={{
                              height: '100%',
                              background: 'linear-gradient(90deg, #22d3ee 0%, #3b82f6 50%, #6366f1 100%)',
                              boxShadow: '0 0 10px rgba(34, 211, 238, 0.35)'
                            }}
                          />
                        </div>

                        {/* Minimal Text Legend with Deck and Mastered */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'rgba(255,255,255,0.45)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                          <span>Deck: <span style={{ color: 'white', fontWeight: 900 }}>{tot}</span></span>
                          <span style={{ color: 'rgba(255,255,255,0.12)' }}>|</span>
                          <span>Mastered: <span style={{ color: 'white', fontWeight: 900 }}>{mCount}</span></span>
                        </div>
                      </>
                    );
                  })()}
                </div>

                {/* Grid of 4 FSRS Stage Buttons */}
                {(() => {
                  const lCount = vocab.filter(w => w.srsLevel === 'Learning').length;
                  const hCount = vocab.filter(w => w.srsLevel === 'Hard').length;
                  const nCount = vocab.filter(w => w.srsLevel === 'Normal').length;
                  const eCount = vocab.filter(w => w.srsLevel === 'Easy' || w.srsLevel === 'Super Easy').length;

                  return (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem', width: '100%', marginTop: '0.85rem' }}>
                      {[
                        { id: 'Learning', label: 'Learning', count: lCount, color: '#64748b' },
                        { id: 'Hard', label: 'Hard', count: hCount, color: '#ef4444' },
                        { id: 'Normal', label: 'Normal', count: nCount, color: '#10b981' },
                        { id: 'Easy', label: 'Easy', count: eCount, color: '#3b82f6' }
                      ].map((stage) => (
                        <motion.div
                          key={stage.id}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedStatus(stage.id);
                          }}
                          style={{
                            background: 'rgba(255, 255, 255, 0.015)',
                            border: '1px solid rgba(255, 255, 255, 0.04)',
                            borderRadius: '16px',
                            padding: '0.85rem 1rem',
                            textAlign: 'center',
                            cursor: 'pointer',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.15rem',
                            boxShadow: '0 4px 15px rgba(0, 0, 0, 0.15)',
                            transition: 'background 0.2s, border-color 0.2s'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)';
                            e.currentTarget.style.borderColor = stage.color + '40';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.015)';
                            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.04)';
                          }}
                        >
                          <span style={{ fontSize: '0.58rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'rgba(255, 255, 255, 0.4)' }}>
                            {stage.label}
                          </span>
                          <span style={{ fontSize: '1.25rem', fontWeight: 950, color: '#ffffff' }}>
                            {stage.count}
                          </span>
                        </motion.div>
                      ))}
                    </div>
                  );
                })()}


              </motion.div>
            )}
          </AnimatePresence>
        </div>
        {renderStatusModal()}
        {renderWordTooltip()}
        {renderToast()}
        <AnimatePresence>
          {unlockedWords.length > 0 && renderUnlockedModal()}
        </AnimatePresence>
      </>
    );
  }

  // 2. Card Study Layout
  return (
    <div className="scrollable-content" style={{ padding: '0', display: 'flex', flexDirection: 'column', position: 'relative', overflowX: 'hidden', height: '100%' }}>
      
      {/* Outer container forced to full height */}
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', zIndex: 40 }}>



        {/* Flick Selection Overlay */}
        <AnimatePresence>
          {flickSelection && (
            <div style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 200,
              pointerEvents: 'none'
            }}>
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                style={{
                  background: 'rgba(15, 18, 24, 0.95)',
                  border: `2px solid ${
                    flickSelection.label === 'EASY' ? '#3b82f6' : 
                    flickSelection.label === 'GOOD' ? '#10b981' : 
                    flickSelection.label === 'HARD' ? '#f97316' : '#ef4444'
                  }`,
                  borderRadius: '24px',
                  padding: '1.25rem 2.2rem',
                  textAlign: 'center',
                  boxShadow: '0 20px 50px rgba(0,0,0,0.6)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '0.25rem'
                }}
              >
                <span style={{ fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(255,255,255,0.4)', fontWeight: 800 }}>Flick Rating</span>
                <div style={{ 
                  fontSize: '2rem', 
                  fontWeight: 950, 
                  color: 
                    flickSelection.label === 'EASY' ? '#3b82f6' : 
                    flickSelection.label === 'GOOD' ? '#10b981' : 
                    flickSelection.label === 'HARD' ? '#f97316' : '#ef4444',
                  lineHeight: 1
                }}>
                  {flickSelection.label}
                </div>
                <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.8)', fontWeight: 600 }}>
                  Interval: {flickSelection.interval}
                </div>
                <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', marginTop: '0.65rem' }}>
                  {[1, 2, 3, 4].map(i => (
                    <div 
                      key={i} 
                      style={{ 
                        width: '8px', 
                        height: '8px', 
                        borderRadius: '50%', 
                        background: i <= flickSelection.count ? (
                          flickSelection.label === 'EASY' ? '#3b82f6' : 
                          flickSelection.label === 'GOOD' ? '#10b981' : 
                          flickSelection.label === 'HARD' ? '#f97316' : '#ef4444'
                        ) : 'rgba(255,255,255,0.15)',
                        boxShadow: i <= flickSelection.count ? `0 0 8px ${
                          flickSelection.label === 'EASY' ? '#3b82f6' : 
                          flickSelection.label === 'GOOD' ? '#10b981' : 
                          flickSelection.label === 'HARD' ? '#f97316' : '#ef4444'
                        }` : 'none',
                        transition: 'all 0.2s ease'
                      }} 
                    />
                  ))}
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        <motion.div
          key={wordObj.id}
          id="tutorial-flashcard-card"
          className="snap-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ 
            x: exitDirection === 'left' ? -1000 : (exitDirection === 'right' ? 1000 : 0), 
            y: exitDirection === 'up' ? -1000 : (exitDirection === 'down' ? 1000 : 0), 
            opacity: 0, 
            transition: { duration: 0.25 } 
          }}
          drag={true}
          dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
          dragSnapToOrigin={true}
          dragElastic={0.7}
          dragTransition={{ bounceStiffness: 600, bounceDamping: 30 }}
          onDragStart={() => startDragSound()}
          onDrag={(event, info) => {
            const distance = Math.sqrt(info.offset.x * info.offset.x + info.offset.y * info.offset.y);
            updateDragSound(distance);
          }}
          onDragEnd={(event, info) => {
            stopDragSound();
            handleDragEnd(event, info);
          }}
          onTap={(event, info) => {
            const target = event.target;
            if (target && (target.closest('button') || target.closest('a') || target.closest('svg') || target.closest('[role="button"]'))) {
              return;
            }
            if (revealStep === 0) {
              setRevealStep(1);
              window.dispatchEvent(new Event('tutorial-card-revealed'));
            } else if (revealStep === 1) {
              setRevealStep(2);
              window.dispatchEvent(new Event('tutorial-card-fully-revealed'));
            }
          }}
          style={{
            x,
            y,
            rotate,
            display: 'flex',
            flexDirection: 'column',
            position: 'absolute',
            inset: 0,
            cursor: 'grab',
            touchAction: 'none',
            background: '#08090b',
            userSelect: 'none',
            WebkitUserSelect: 'none',
            KhtmlUserSelect: 'none',
            MozUserSelect: 'none',
            msUserSelect: 'none',
            WebkitUserDrag: 'none'
          }}
        >
          {/* Swipe feedback overlays */}
          <motion.div style={{ position: 'absolute', inset: 0, background: '#ef4444', opacity: overlayRed, zIndex: 50, pointerEvents: 'none', mixBlendMode: 'overlay' }} />
          <motion.div style={{ position: 'absolute', inset: 0, background: '#f97316', opacity: overlayOrange, zIndex: 50, pointerEvents: 'none', mixBlendMode: 'overlay' }} />
          <motion.div style={{ position: 'absolute', inset: 0, background: '#10b981', opacity: overlayGreen, zIndex: 50, pointerEvents: 'none', mixBlendMode: 'overlay' }} />
          <motion.div style={{ position: 'absolute', inset: 0, background: '#3b82f6', opacity: overlayBlue, zIndex: 50, pointerEvents: 'none', mixBlendMode: 'overlay' }} />

          {/* Dynamic Stamps */}
          <motion.div
            style={{ 
              position: 'absolute', top: 70, right: 35, opacity: stampAgainOpacity, rotate: 12, zIndex: 60, pointerEvents: 'none', 
              border: '4px solid #ef4444', borderRadius: '12px', padding: '0.4rem 0.8rem', color: '#ef4444', fontWeight: 900, fontSize: '1.3rem', 
              textTransform: 'uppercase', background: 'rgba(10,8,20,0.9)', display: 'flex', gap: '6px', alignItems: 'center', boxShadow: '0 8px 25px rgba(239,68,68,0.25)'
            }}
          >
            AGAIN ({projections.again})
          </motion.div>

          <motion.div
            style={{ 
              position: 'absolute', top: 70, left: 35, opacity: stampHardOpacity, rotate: -12, zIndex: 60, pointerEvents: 'none', 
              border: '4px solid #f97316', borderRadius: '12px', padding: '0.4rem 0.8rem', color: '#f97316', fontWeight: 900, fontSize: '1.3rem', 
              textTransform: 'uppercase', background: 'rgba(10,8,20,0.9)', display: 'flex', gap: '6px', alignItems: 'center', boxShadow: '0 8px 25px rgba(249,115,22,0.25)'
            }}
          >
            HARD ({projections.hard})
          </motion.div>

          <motion.div
            style={{ 
              position: 'absolute', top: 70, left: 35, opacity: stampGoodOpacity, rotate: -12, zIndex: 60, pointerEvents: 'none', 
              border: '4px solid #10b981', borderRadius: '12px', padding: '0.4rem 0.8rem', color: '#10b981', fontWeight: 900, fontSize: '1.3rem', 
              textTransform: 'uppercase', background: 'rgba(10,8,20,0.9)', display: 'flex', gap: '6px', alignItems: 'center', boxShadow: '0 8px 25px rgba(16,185,129,0.25)'
            }}
          >
            GOOD ({projections.normal})
          </motion.div>

          <motion.div
            style={{ 
              position: 'absolute', top: 70, left: 35, opacity: stampEasyOpacity, rotate: -12, zIndex: 60, pointerEvents: 'none', 
              border: '4px solid #3b82f6', borderRadius: '12px', padding: '0.4rem 0.8rem', color: '#3b82f6', fontWeight: 900, fontSize: '1.3rem', 
              textTransform: 'uppercase', background: 'rgba(10,8,20,0.9)', display: 'flex', gap: '6px', alignItems: 'center', boxShadow: '0 8px 25px rgba(59,130,246,0.25)'
            }}
          >
            EASY ({projections.easy})
          </motion.div>

          {/* Card body container */}
          {richCardData ? (
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1, height: '100%', position: 'relative', overflow: 'hidden' }}>
              {/* Stock Photo — FIXED 220px, never shrinks */}
              <div style={{ padding: '0 1rem', marginTop: '20px', flexShrink: 0, height: '220px', zIndex: 20, overflow: 'hidden' }}>
                <div 
                  onMouseEnter={() => setIsImageHovered(true)}
                  onMouseLeave={() => setIsImageHovered(false)}
                  onClick={() => setIsImageHovered(prev => !prev)}
                  style={{ position: 'relative', borderRadius: '16px', overflow: 'hidden', height: '100%', background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(255, 255, 255, 0.05)', cursor: 'pointer' }}
                >
                  
                  {/* Floating Action Buttons Overlay (Regenerate & Save) */}
                  <div style={{ 
                    position: 'absolute', 
                    top: '10px', 
                    left: '10px', 
                    display: 'flex', 
                    gap: '6px', 
                    zIndex: 30,
                    opacity: isImageHovered ? 1 : 0,
                    pointerEvents: isImageHovered ? 'auto' : 'none',
                    transition: 'opacity 0.22s cubic-bezier(0.4, 0, 0.2, 1)'
                  }}>
                    {/* Regenerate Button */}
                    <motion.button
                      whileHover={{ 
                        scale: 1.15, 
                        background: 'rgba(255, 255, 255, 0.15)', 
                        borderColor: 'rgba(255, 255, 255, 0.3)',
                        color: 'white',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                        backdropFilter: 'blur(8px)',
                        WebkitBackdropFilter: 'blur(8px)'
                      }}
                      whileTap={{ scale: 0.92 }}
                      onClick={handleRegenerateImage}
                      disabled={isRegenerating}
                      title="Regenerate Image"
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        background: 'rgba(15, 18, 24, 0.65)',
                        border: '1px solid rgba(255, 255, 255, 0.15)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'rgba(255, 255, 255, 0.7)',
                        cursor: 'pointer',
                        outline: 'none',
                        transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)'
                      }}
                    >
                      <RotateCw size={14} className={isRegenerating ? "spin" : ""} />
                    </motion.button>

                    {/* Save Button */}
                    <motion.button
                      whileHover={{ 
                        scale: 1.15, 
                        background: 'rgba(255, 255, 255, 0.15)', 
                        borderColor: 'rgba(255, 255, 255, 0.3)',
                        color: 'white',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                        backdropFilter: 'blur(8px)',
                        WebkitBackdropFilter: 'blur(8px)'
                      }}
                      whileTap={{ scale: 0.92 }}
                      onClick={handleToggleSaveImage}
                      title={wordObj.isImageSaved ? "Unsave Image" : "Save Image"}
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        background: wordObj.isImageSaved ? 'rgba(255, 255, 255, 0.35)' : 'rgba(15, 18, 24, 0.65)',
                        border: wordObj.isImageSaved ? '1px solid rgba(255, 255, 255, 0.45)' : '1px solid rgba(255, 255, 255, 0.15)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        cursor: 'pointer',
                        outline: 'none',
                        transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)'
                      }}
                    >
                      <Bookmark size={14} fill={wordObj.isImageSaved ? 'white' : 'none'} color={wordObj.isImageSaved ? 'transparent' : 'white'} />
                    </motion.button>
                  </div>

                  {/* Loading overlay for image generation */}
                  {isRegenerating && (
                    <div style={{
                      position: 'absolute',
                      inset: 0,
                      background: 'rgba(10, 12, 17, 0.75)',
                      backdropFilter: 'blur(6px)',
                      WebkitBackdropFilter: 'blur(6px)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      zIndex: 25,
                      borderRadius: '16px',
                      gap: '0.5rem'
                    }}>
                      <Loader2 
                        size={28} 
                        className="spin" 
                        color="white" 
                        style={{ opacity: 0.85 }} 
                      />
                      <span style={{ 
                        fontSize: '0.62rem', 
                        color: 'rgba(255, 255, 255, 0.75)', 
                        fontWeight: 800, 
                        textTransform: 'uppercase', 
                        letterSpacing: '0.5px' 
                      }}>
                        Generating...
                      </span>
                    </div>
                  )}

                  {activeReviewImageUrl ? (
                    <img 
                      src={cleanMediaUrl(activeReviewImageUrl)} 
                      alt="visual context" 
                      draggable="false"
                      onDragStart={(e) => e.preventDefault()}
                      style={{ 
                        width: '100%', 
                        height: '100%', 
                        objectFit: 'cover',
                        userSelect: 'none',
                        pointerEvents: 'none',
                        WebkitUserDrag: 'none'
                      }} 
                    />
                  ) : (
                    <SafeImage 
                      keyword={wordObj.word} 
                      alt="placeholder" 
                      style={{ 
                        width: '100%', 
                        height: '100%', 
                        objectFit: 'cover',
                        userSelect: 'none',
                        pointerEvents: 'none',
                        WebkitUserDrag: 'none'
                      }} 
                    />
                  )}

                  {/* Custom upload/search options if regen count >= 6 as absolute overlay */}
                  {regenCount >= 6 && (
                    <div style={{
                      position: 'absolute',
                      inset: 0,
                      background: 'rgba(10, 8, 20, 0.95)',
                      backdropFilter: 'blur(12px)',
                      WebkitBackdropFilter: 'blur(12px)',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'center',
                      padding: '1.2rem 1rem 1rem',
                      gap: '0.65rem',
                      zIndex: 40,
                      borderRadius: '16px'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.65rem', color: '#eab308', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Custom Image Option</span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setRegenCount(5); // Reset to 5 to close overlay
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
                          id="custom-kw-purge"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              handleCustomKeywordSearch(e.target.value);
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
                            const val = document.getElementById("custom-kw-purge")?.value;
                            if (val) handleCustomKeywordSearch(val);
                          }}
                          className="glass-button animate-scale"
                          style={{
                            padding: '0.35rem 0.75rem',
                            borderRadius: '8px',
                            fontSize: '0.7rem',
                            fontWeight: 800,
                            borderColor: 'rgba(234, 179, 8, 0.3)',
                            background: 'rgba(234, 179, 8, 0.1)',
                            color: '#eab308',
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
                                handleCustomImageUpload(e.target.files[0]);
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

              {/* Sentence card — FIXED size, never shrinks */}
              <div style={{ flexShrink: 0, zIndex: 20, padding: '0.85rem 1rem 0 1rem' }}>
                <div className="glass-panel" style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', justifyContent: 'center', width: '100%', padding: '1rem 1.1rem' }}>
                  <p style={{ 
                    fontSize: sentenceText.length > 90 ? '1.02rem' : (sentenceText.length > 60 ? '1.08rem' : '1.15rem'), 
                    lineHeight: '1.5', color: 'white', fontWeight: 700, margin: 0 
                  }}>
                    {revealStep === 0 ? (
                      richCardData.scenes?.[0] ? maskWord(richCardData.scenes[0].dialogue, wordObj.word) : 'Guess the word: [_____]'
                    ) : (
                      richCardData.scenes?.[0] ? renderInteractiveSentence(richCardData.scenes[0].dialogue, wordObj.word, handleWordClick) : wordObj.word
                    )}
                  </p>
                </div>
              </div>

              {/* Content area — swaps in-place via AnimatePresence */}
              <div
                ref={scrollContainerRef}
                className="purge-scroll"
                style={{ 
                  flex: 1, 
                  overflowY: 'auto', 
                  padding: `0.75rem 1rem ${revealStep >= 2 ? '150px' : '20px'} 1rem`,
                  zIndex: 10,
                  position: 'relative',
                  scrollbarWidth: 'none',
                  msOverflowStyle: 'none'
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

                  {/* Step 0: Reveal Answer button */}
                  {revealStep === 0 && (
                    <div style={{ marginTop: 'auto', paddingBottom: '110px' }}>
                      <button
                        className="glass-button"
                        style={{ 
                          width: '100%', fontSize: '1rem', padding: '0.9rem', borderRadius: '16px', 
                          background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.7)', 
                          fontWeight: 600, border: '1px solid rgba(255,255,255,0.1)', letterSpacing: '0.03em'
                        }}
                        onClick={() => { setRevealStep(1); }}
                      >
                        Reveal Answer
                      </button>
                    </div>
                  )}

                  {/* Step 1 & 2: content area with in-place swap */}
                  {revealStep >= 1 && (
                    <AnimatePresence mode="wait">
                      {revealStep === 1 && (
                        <motion.div
                          key="card1"
                          initial={{ opacity: 0, y: 16 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -16 }}
                          transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                          style={{ flex: 1, display: 'flex', flexDirection: 'column', paddingBottom: '12px' }}
                        >
                          {/* English Definition — centered vertically for any length */}
                          <div className="glass-panel" style={{
                            flex: 1,
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'center',
                            alignItems: 'center',
                            textAlign: 'center',
                            padding: '1.8rem 1.4rem',
                            background: 'rgba(255,255,255,0.015)',
                            gap: '0.75rem'
                          }}>
                            {/* Word + badges + sound row */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'center' }}>
                              <span style={{ fontSize: '1.85rem', fontWeight: 900, color: 'white', letterSpacing: '-0.02em' }}>{wordObj.word}</span>
                              <button onClick={handleSpeakWord} className="glass-button animate-scale" style={{ width: '26px', height: '26px', borderRadius: '50%', padding: 0, background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                                <Volume2 size={11} color="var(--accent-hover)" />
                              </button>
                              <button 
                                onClick={() => {
                                  if (window.confirm(`ต้องการลบคำว่า "${wordObj.word}" ออกจาก Deck จริงๆ หรือไม่?`)) {
                                    deleteWordFromDeck(wordObj.id);
                                    setSessionQueue(prev => prev.filter(w => w.id !== wordObj.id));
                                    setRevealStep(0);
                                  }
                                }}
                                className="glass-button animate-scale"
                                style={{ 
                                  width: '26px', height: '26px', borderRadius: '50%', padding: 0, 
                                  background: 'rgba(239, 68, 68, 0.05)', borderColor: 'rgba(239, 68, 68, 0.15)', 
                                  display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' 
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.background = 'rgba(239, 68, 68, 0.15)';
                                  e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.3)';
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.background = 'rgba(239, 68, 68, 0.05)';
                                  e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.15)';
                                }}
                                title="Delete word from deck"
                              >
                                <Trash2 size={11} color="#ef4444" />
                              </button>
                            </div>
                            {/* Badges */}
                            <div style={{ display: 'flex', gap: '0.35rem' }}>
                              <span className="badge-neon" style={{ fontSize: '0.62rem' }}>{wordObj.pos || 'n.'}</span>
                              <span className="badge-cyan" style={{ fontSize: '0.62rem' }}>{wordObj.cefrLevel || 'C1'}</span>
                            </div>
                            {/* Divider */}
                            <div style={{ width: '40px', height: '1px', background: 'rgba(255,255,255,0.1)', borderRadius: '1px' }} />
                            {/* Definition */}
                            <p style={{ margin: 0, fontSize: '1rem', color: 'rgba(255,255,255,0.85)', lineHeight: 1.55, fontWeight: 400, maxWidth: '340px' }}>
                              {renderInteractiveSentence(richCardData.englishExplanation?.definition, null, handleWordClick)}
                            </p>
                          </div>
                          
                          {/* FSRS Rating Buttons shown only when Thai is revealed in step 2 */}
                        </motion.div>
                      )}

                      {revealStep >= 2 && (
                        <motion.div
                          key="card2"
                          initial={{ opacity: 0, y: 16 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -16 }}
                          transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                          style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem', paddingBottom: '30px' }}
                        >
                          {/* Thai Translation */}
                          <div className="glass-panel" style={{ padding: '0.9rem 1.1rem', background: 'rgba(16, 185, 129, 0.03)', border: '1px solid rgba(16, 185, 129, 0.18)' }}>
                            {richCardData.thaiTranslation && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
                                <span className="badge-neon" style={{ fontSize: '0.58rem', background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.25)', color: '#10b981' }}>แปลไทย</span>
                                <span style={{ fontSize: '1.05rem', fontWeight: 800, color: '#10b981' }}>{richCardData.thaiTranslation?.word}</span>
                              </div>
                            )}
                            {richCardData.scenes?.[0] && (
                              <p style={{ margin: 0, fontSize: '0.85rem', color: 'rgba(255,255,255,0.88)', lineHeight: 1.45, fontWeight: 500 }}>
                                {renderHighlightedThaiText(richCardData.scenes[0].meaning, richCardData.thaiTranslation?.word)}
                              </p>
                            )}
                          </div>

                          {/* Collocation */}
                          {richCardData.englishExplanation?.phrase && (
                            <div className="glass-panel" style={{ padding: '0.75rem 1rem', background: 'rgba(255,255,255,0.012)' }}>
                              <span style={{ fontSize: '0.56rem', textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: 800, display: 'block', letterSpacing: '0.5px', marginBottom: '0.15rem' }}>Collocation</span>
                              <span style={{ fontSize: '0.9rem', fontWeight: 800, color: 'white' }}>
                                {renderInteractiveSentence(richCardData.englishExplanation?.phrase, null, handleWordClick)}
                              </span>
                              <span style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.55)', marginLeft: '0.4rem' }}>
                                — {renderInteractiveSentence(richCardData.englishExplanation?.phraseMeaning, null, handleWordClick)}
                              </span>
                            </div>
                          )}

                          {/* Verb Forms (V1, V2, V3) */}
                          {(() => {
                            let verbForms = undefined;
                            if (richCardData && 'verbForms' in richCardData) {
                              verbForms = richCardData.verbForms;
                            } else {
                              verbForms = getVerbForms(wordObj.word, wordObj.pos);
                            }
                            if (!verbForms || !Array.isArray(verbForms) || verbForms.length < 3) return null;
                            const [v1, v2, v3] = verbForms;
                            return (
                              <div className="glass-panel" style={{ padding: '0.85rem 1.1rem', background: 'rgba(255,255,255,0.012)', border: '1px solid rgba(255, 255, 255, 0.04)', borderRadius: '14px' }}>
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
                      )}
                    </AnimatePresence>
                  )}

                </div>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1, height: '100%', position: 'relative', overflow: 'hidden', justifyContent: 'center', alignItems: 'center', padding: '2rem 2rem 90px 2rem' }}>
              <div className="glass-panel" style={{ width: '100%', padding: '2rem', textAlign: 'center', background: 'rgba(255,255,255,0.015)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '24px' }}>
                <h2 style={{ fontSize: '2.2rem', color: 'white', margin: '0 0 0.5rem 0', fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem' }}>
                  {wordObj.word}
                  {revealStep >= 1 && (
                    <button 
                      onClick={() => {
                        if (window.confirm(`ต้องการลบคำว่า "${wordObj.word}" ออกจาก Deck จริงๆ หรือไม่?`)) {
                          deleteWordFromDeck(wordObj.id);
                          setSessionQueue(prev => prev.filter(w => w.id !== wordObj.id));
                          setRevealStep(0);
                        }
                      }}
                      className="glass-button animate-scale"
                      style={{ 
                        width: '26px', height: '26px', borderRadius: '50%', padding: 0, 
                        background: 'rgba(239, 68, 68, 0.05)', borderColor: 'rgba(239, 68, 68, 0.15)', 
                        display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' 
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(239, 68, 68, 0.15)';
                        e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.3)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'rgba(239, 68, 68, 0.05)';
                        e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.15)';
                      }}
                      title="Delete word from deck"
                    >
                      <Trash2 size={12} color="#ef4444" />
                    </button>
                  )}
                </h2>
                <div style={{ display: 'flex', gap: '0.35rem', justifyContent: 'center', marginBottom: '2rem' }}>
                  <span className="badge-neon" style={{ fontSize: '0.62rem' }}>{wordObj.pos || 'n.'}</span>
                  <span className="badge-cyan" style={{ fontSize: '0.62rem' }}>{wordObj.cefrLevel || 'C1'}</span>
                </div>
                
                {revealStep === 0 ? (
                  <button
                    className="glass-button primary animate-scale"
                    style={{ width: '100%', padding: '0.9rem', borderRadius: '16px', fontWeight: 800 }}
                    onClick={() => setRevealStep(1)}
                  >
                    Reveal Answer
                  </button>
                ) : (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <div style={{ width: '40px', height: '1px', background: 'rgba(255,255,255,0.1)', borderRadius: '1px', margin: '0 auto' }} />
                    <p style={{ color: 'rgba(255,255,255,0.9)', fontSize: '1.15rem', lineHeight: '1.55', margin: 0, fontWeight: 400 }}>
                      {wordObj.meaning}
                    </p>
                    {wordObj.example && (
                      <div style={{ fontStyle: 'italic', color: 'var(--accent-color)', borderLeft: '2px solid var(--accent-color)', paddingLeft: '1rem', textAlign: 'left', marginTop: '0.5rem' }}>
                        "{wordObj.example}"
                      </div>
                    )}
                    
                    {/* FSRS Rating Buttons removed from scroll view and pinned to bottom dock */}
                  </motion.div>
                )}
              </div>
            </div>
          )}
        </motion.div>

        {/* Translucent Apple-style Glassmorphic Rating Dock */}
        <AnimatePresence>
          {revealStep >= 2 && (
            <motion.div
              id="tutorial-srs-buttons"
              initial={{ y: 70, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 70, opacity: 0 }}
              transition={{ type: 'spring', damping: 22, stiffness: 200 }}
              style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                background: 'linear-gradient(to top, rgba(10, 12, 17, 0.96) 65%, rgba(10, 12, 17, 0.7) 90%, rgba(10, 12, 17, 0.0) 100%)',
                backdropFilter: 'blur(24px)',
                WebkitBackdropFilter: 'blur(24px)',
                borderTop: '1px solid rgba(255, 255, 255, 0.06)',
                padding: '1.25rem 1rem calc(1.25rem + 65px) 1rem',
                display: 'flex',
                gap: '0.45rem',
                zIndex: 100,
                boxSizing: 'border-box'
              }}
            >
              {/* Easy */}
              <button
                onClick={() => handleSrsChoice('easy')}
                className="glass-button animate-scale"
                style={{
                  flex: 1,
                  height: '52px',
                  borderRadius: '16px',
                  background: 'rgba(96, 165, 250, 0.02)',
                  border: '1px solid rgba(96, 165, 250, 0.12)',
                  borderTop: '3px solid #60a5fa',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '1px',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  boxShadow: '0 8px 20px rgba(96, 165, 250, 0.05)'
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(96, 165, 250, 0.06)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(96, 165, 250, 0.02)'; }}
              >
                <span style={{ fontSize: '0.8rem', fontWeight: 900, color: '#60a5fa', letterSpacing: '0.3px' }}>Easy</span>
                <span style={{ fontSize: '0.56rem', fontWeight: 700, color: 'rgba(96, 165, 250, 0.65)' }}>{projections.easy}</span>
              </button>

              {/* Normal */}
              <button
                onClick={() => handleSrsChoice('normal')}
                className="glass-button animate-scale"
                style={{
                  flex: 1,
                  height: '52px',
                  borderRadius: '16px',
                  background: 'rgba(16, 185, 129, 0.02)',
                  border: '1px solid rgba(16, 185, 129, 0.12)',
                  borderTop: '3px solid #10b981',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '1px',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  boxShadow: '0 8px 20px rgba(16, 185, 129, 0.05)'
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(16, 185, 129, 0.06)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(16, 185, 129, 0.02)'; }}
              >
                <span style={{ fontSize: '0.8rem', fontWeight: 900, color: '#10b981', letterSpacing: '0.3px' }}>Normal</span>
                <span style={{ fontSize: '0.56rem', fontWeight: 700, color: 'rgba(16, 185, 129, 0.65)' }}>{projections.normal}</span>
              </button>

              {/* Hard */}
              <button
                onClick={() => handleSrsChoice('hard')}
                className="glass-button animate-scale"
                style={{
                  flex: 1,
                  height: '52px',
                  borderRadius: '16px',
                  background: 'rgba(249, 115, 22, 0.02)',
                  border: '1px solid rgba(249, 115, 22, 0.12)',
                  borderTop: '3px solid #f97316',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '1px',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  boxShadow: '0 8px 20px rgba(249, 115, 22, 0.05)'
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(249, 115, 22, 0.06)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(249, 115, 22, 0.02)'; }}
              >
                <span style={{ fontSize: '0.8rem', fontWeight: 900, color: '#f97316', letterSpacing: '0.3px' }}>Hard</span>
                <span style={{ fontSize: '0.56rem', fontWeight: 700, color: 'rgba(249, 115, 22, 0.65)' }}>{projections.hard}</span>
              </button>

              {/* Again */}
              <button
                onClick={() => handleSrsChoice('again')}
                className="glass-button animate-scale"
                style={{
                  flex: 1,
                  height: '52px',
                  borderRadius: '16px',
                  background: 'rgba(239, 68, 68, 0.02)',
                  border: '1px solid rgba(239, 68, 68, 0.12)',
                  borderTop: '3px solid #ef4444',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '1px',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  boxShadow: '0 8px 20px rgba(239, 68, 68, 0.05)'
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.06)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.02)'; }}
              >
                <span style={{ fontSize: '0.8rem', fontWeight: 900, color: '#ef4444', letterSpacing: '0.3px' }}>Again</span>
                <span style={{ fontSize: '0.56rem', fontWeight: 700, color: 'rgba(239, 68, 68, 0.65)' }}>{projections.again}</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Status Word Manager Bottom Drawer */}
        {renderStatusModal()}
        {renderWordTooltip()}
        {renderToast()}
      </div>
    </div>
  );
};

export default Purge;
