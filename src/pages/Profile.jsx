import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Volume2, BookOpen, Trash2, User, Menu, X, Search, Calendar, Filter, Trophy, ChevronDown, TrendingUp, Eye, ArrowUpZA, ArrowDownAZ, Plus, Loader2, MessageSquare, Sparkles } from 'lucide-react';
import { useVocab } from '../context/VocabContext';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { getVerbForms } from '../utils/textUtils';

const srsTapColors = {
  'Learning': '#cbd5e1', // Silver/white
  'Hard': '#ef4444',     // Red
  'Normal': '#10b981',   // Green
  'Easy': '#3b82f6',     // Blue
  'Mastered': '#eab308'  // Gold
};

const cefrTapColors = {
  'A1': '#f59e0b', // Amber
  'A2': '#f97316', // Orange
  'B1': '#ff6b6b', // Coral
  'B2': '#ec4899', // Pink
  'C1': '#a855f7', // Purple
  'C2': '#6366f1'  // Indigo
};

const categoryColors = {
  'Daily Life': '#06b6d4', // Teal
  'Business': '#6366f1',   // Indigo
  'Academic': '#d946ef'    // Fuchsia
};

const cleanMediaUrl = (url) => {
  if (!url) return '';
  if (url.startsWith('approved:')) return url.substring(9);
  return url;
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

const Profile = () => {
  const { vocab, getSrsCounts, deleteWordFromDeck, updateWordProperties, activeCurriculum, setActiveCurriculum, clearDeckAndResetStats, curriculumWords, curriculumList, loadingCurriculumWords, addWordToDeck, getAiWordRichDetails } = useVocab();
  const { profile, signOut, isAnonymous } = useAuth();
  const { theme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const activeVocab = vocab.filter(item => {
    if (!item || !item.word) return false;
    if (activeCurriculum === 'Self-Study only') {
      return !item.curriculum || item.curriculum === 'Self-Study only';
    }
    return item.curriculum === activeCurriculum || (curriculumWords && curriculumWords.has(item.word.toLowerCase().trim()));
  });

  const counts = getSrsCounts(activeVocab);

  const [selectedLevel, setSelectedLevel] = useState(null); // 'A1', 'A2', etc.
  const [levelType, setLevelType] = useState(null); // 'cefr' or 'srs'
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState('asc');
  const [previewWord, setPreviewWord] = useState(null);
  const [revealedCardIds, setRevealedCardIds] = useState({});
  const [revealedThaiIds, setRevealedThaiIds] = useState({});
  const [previewShowThai, setPreviewShowThai] = useState(false);
  const [addingWordId, setAddingWordId] = useState(null);

  // Auto-close any open modals when navigating away from the profile tab
  useEffect(() => {
    if (location.pathname !== '/profile') {
      setSelectedLevel(null);
      setPreviewWord(null);
      setShowCurriculumModal(false);
    }
  }, [location.pathname]);

  const handleAddWaitingWord = async (word) => {
    if (!word) return;
    setAddingWordId(word);
    try {
      const details = await getAiWordRichDetails(word);
      if (details && !details.error) {
        const res = await addWordToDeck(word, details);
        if (res.success) {
          // Reactively added to deck
        } else {
          alert(res.error || 'Failed to add word to deck');
        }
      } else {
        alert(details?.error || 'Failed to fetch details for word');
      }
    } catch (err) {
      console.error(err);
      alert('An error occurred while adding word');
    } finally {
      setAddingWordId(null);
    }
  };

  const handleSpeak = (text) => {
    if (!text || !window.speechSynthesis) return;
    try {
      window.speechSynthesis.cancel();
      const cleanText = text.replace(/\*\*/g, '');
      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.lang = 'en-US';
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn("Speech synthesis error:", e);
    }
  };
  
  const [activeCategory, setActiveCategory] = useState('All Categories');
  const [activePos, setActivePos] = useState('All POS');
  const [isCatExpanded, setIsCatExpanded] = useState(false);
  const [isPosExpanded, setIsPosExpanded] = useState(false);
  const [visibleCount, setVisibleCount] = useState(50);

  // Reset pagination count when search query or filters change to keep performance high
  useEffect(() => {
    setVisibleCount(50);
  }, [searchQuery, selectedLevel, sortOrder, activeCategory, activePos]);

  const [hoveredSrs, setHoveredSrs] = useState(null);
  const [hoveredCefr, setHoveredCefr] = useState(null);
  const [hoveredCategory, setHoveredCategory] = useState(null);
  const [oxfordActiveLevel, setOxfordActiveLevel] = useState(null);
  const [oxfordHoveredLevel, setOxfordHoveredLevel] = useState(null);
  const [showStreakSplash, setShowStreakSplash] = useState(false);
  const [displayedStreak, setDisplayedStreak] = useState(1);
  const [showCurriculumModal, setShowCurriculumModal] = useState(false);
  const [headerHovered, setHeaderHovered] = useState(false);
  const [progressHovered, setProgressHovered] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const isTutorial = localStorage.getItem('memeng_tutorial_done') !== 'true' && localStorage.getItem('memeng_tutorial_started') === 'true';
  const activeShowDetails = isTutorial ? true : showDetails;

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

  const curriculumColors = {
    'Self-Study only': {
      gradient: 'linear-gradient(135deg, #94a3b8 0%, #475569 100%)',
      border: '1px solid #475569',
      glow: '0 12px 30px rgba(148, 163, 184, 0.35)'
    },
    'Oxford 5000': {
      gradient: 'linear-gradient(135deg, #60a5fa 0%, #2563eb 100%)',
      border: '1px solid #2563eb',
      glow: '0 12px 30px rgba(59, 130, 246, 0.35)'
    },
    'TOEIC Essential': {
      gradient: 'linear-gradient(135deg, #f87171 0%, #dc2626 100%)',
      border: '1px solid #dc2626',
      glow: '0 12px 30px rgba(239, 68, 68, 0.35)'
    },
    'IELTS Academic': {
      gradient: 'linear-gradient(135deg, #c084fc 0%, #7c3aed 100%)',
      border: '1px solid #7c3aed',
      glow: '0 12px 30px rgba(167, 139, 250, 0.35)'
    },
    'Daily Phrases': {
      gradient: 'linear-gradient(135deg, #34d399 0%, #059669 100%)',
      border: '1px solid #059669',
      glow: '0 12px 30px rgba(52, 211, 153, 0.35)'
    }
  };

  const categories = ['All Categories', 'Daily Life', 'Business', 'Academic'];
  const posTypes = ['All POS', 'noun', 'verb', 'adjective', 'adverb', 'phrase'];

  const stats = {
    totalKnown: counts.total,
    streak: profile?.streak_days ?? 0,
  };

  useEffect(() => {
    if (isTutorial) {
      setShowStreakSplash(false);
      return;
    }
    if (stats.streak > 0) {
      setShowStreakSplash(true);
      setDisplayedStreak(1);
      
      let current = 0;
      const target = stats.streak;
      let active = true;
      
      const tick = () => {
        if (!active) return;
        current += 1;
        setDisplayedStreak(current);
        if (current < target) {
          const progress = current / target;
          const delay = 40 + Math.pow(progress, 3.5) * 380;
          setTimeout(tick, delay);
        }
      };

      const startTimer = setTimeout(() => {
        tick();
      }, 250);

      const closeTimer = setTimeout(() => {
        setShowStreakSplash(false);
      }, 5500);

      return () => {
        active = false;
        clearTimeout(startTimer);
        clearTimeout(closeTimer);
      };
    }
  }, [stats.streak, isTutorial]);

  // Nong Mem comment trigger on mount/stats load
  useEffect(() => {
    // Wait slightly for vocab and profile to load
    const timer = setTimeout(() => {
      if (!vocab) return;
      const dueCount = vocab.filter(w => w.srsLevel !== 'Mastered' && new Date(w.nextReviewDate) <= new Date()).length;
      const streakVal = profile?.streak_days ?? 0;
      
      let comment = '';
      let mood = 'mocking';

      if (dueCount > 0) {
        const dueComments = [
          `มีคำศัพท์ค้างทบทวนตั้ง ${dueCount} คำแน่ะ ขี้เกียจจังยัยตัวดี! 🙄`,
          `ยังเหลือทบทวนอีกตั้ง ${dueCount} คำนะย่ะ มัวแต่มาส่องโปรไฟล์อยู่ได้!`,
          `สภาพพพพ มีคำค้างเรียนอยู่ ${dueCount} คำ ดองไว้ทำเค็มหรอจ๊ะ?`,
          `มีตั้ง ${dueCount} คำที่ต้องเคลียร์ ไปเคลียร์เดี๋ยวนี้นะย่ะ!`
        ];
        comment = dueComments[Math.floor(Math.random() * dueComments.length)];
        mood = 'mocking';
      } else if (streakVal === 0 || streakVal === 1) {
        const streakComments = [
          "สตรีคแค่นี้ อย่าเรียกว่าเข้ามาเรียนเลยน้อง ขำกลิ้ง 🤭",
          "สตรีคเหี่ยวแห้งเหมือนผักชีเลยจ้าาา ขยันหน่อยสิย่ะ!",
          "พึ่งสตรีคได้แค่นี้เองหรอ สภาพพพพ ปวดเฮดเลยเจ้",
          "หนูจ๋า... สตรีคเหี่ยวเฉาขนาดนี้ แถวบ้านเจ้เรียกขี้เกียจนะจ๊ะ"
        ];
        comment = streakComments[Math.floor(Math.random() * streakComments.length)];
        mood = 'angry';
      } else if (streakVal >= 7) {
        const highStreakComments = [
          `โอ้โห สตรีคตั้ง ${streakVal} วัน! แอบโกงระบบปะเนี่ย เก่งเกินปุยมุ้ย! 🎉`,
          `สตรีค ${streakVal} วันละเรอะ! ชื่นชมนะ แต่ก็แอบหมั่นไส้อยู่ดีย่ะ`,
          `เรียนติดต่อกัน ${streakVal} วัน! วันนี้ฝนจะตกหิมะจะตกหรือเปล่าเนี่ยยย`,
          `เก่งมากจ้าสตรีค ${streakVal} วัน เอาถ้วยรางวัลกระดาษไปเลยยย!`
        ];
        comment = highStreakComments[Math.floor(Math.random() * highStreakComments.length)];
        mood = 'happy';
      } else {
        const normalComments = [
          `สตรีค ${streakVal} วันแล้วหรอ พยายามรักษามันไว้ให้ได้ล่ะแก๊`,
          `โปรไฟล์ก็ดูดีขึ้นนะ แต่ขยันได้มากกว่านี้อีกย่ะ!`,
          `เข้ามาดูโปรไฟล์บ่อยๆ เดี๋ยวก็ฉลาดขึ้นเองแหละ... มั้งนะ?`,
          "มีอะไรให้ช่วยบ่นไหมจ๊ะ ทักแชทคุยกับเจ้ได้เสมอนะ"
        ];
        comment = normalComments[Math.floor(Math.random() * normalComments.length)];
        mood = 'idle';
      }

      if (comment) {
        window.dispatchEvent(new CustomEvent('nongmem-comment', { 
          detail: { text: comment, mood, duration: 4500 } 
        }));
      }
    }, 1200);

    return () => clearTimeout(timer);
  }, [vocab, profile]);

  // Automatically show details if tutorial is active
  useEffect(() => {
    const isDone = localStorage.getItem('memeng_tutorial_done') === 'true';
    if (!isDone) {
      setShowDetails(true);
    }

    const handleTrigger = () => {
      setShowDetails(true);
    };
    window.addEventListener('trigger-tutorial', handleTrigger);
    return () => window.removeEventListener('trigger-tutorial', handleTrigger);
  }, []);

  // Automatically close modals on tutorial request
  useEffect(() => {
    const handleCloseModals = () => {
      setShowCurriculumModal(false);
      setSelectedLevel(null);
    };
    window.addEventListener('tutorial-close-modals', handleCloseModals);
    return () => window.removeEventListener('tutorial-close-modals', handleCloseModals);
  }, []);

  const getCefr = (wordObj) => (wordObj?.cefrLevel || 'A1');

  const getCefrTarget = (cefrId) => {
    if (activeCurriculum !== 'Self-Study only' && curriculumList && curriculumList.length > 0) {
      const totalInCurriculum = curriculumList.filter(item => item && item.cefr_level && (item.cefr_level || '').toUpperCase() === cefrId.toUpperCase()).length;
      return totalInCurriculum || 1;
    }
    return cefrId === 'C2' ? 500 : 1000;
  };

  const getCategory = (wordObj) => {
    if (!wordObj) return 'Daily Life';
    if (typeof wordObj === 'object' && wordObj.category) return wordObj.category;
    const wordStr = typeof wordObj === 'string' ? wordObj : (wordObj.word || '');
    if (!wordStr) return 'Daily Life';
    if (wordStr.length >= 9) return 'Academic';
    if (['manage', 'market', 'trade', 'value', 'price', 'compete'].some(k => wordStr.includes(k))) return 'Business';
    return 'Daily Life';
  };

  const cefrTiers = [
    { id: 'A1', name: 'Beginner', color: '#2d3139' },
    { id: 'A2', name: 'Elementary', color: '#454b57' },
    { id: 'B1', name: 'Intermediate', color: '#646d7d' },
    { id: 'B2', name: 'Upper Intermediate', color: '#8793a6' },
    { id: 'C1', name: 'Advanced', color: '#b0bccd' },
    { id: 'C2', name: 'Mastery', color: '#ffffff' }
  ];

  const getWaitingCount = () => {
    if (activeCurriculum === 'Self-Study only' || !curriculumList || curriculumList.length === 0) return 0;
    const activeVocabWords = new Set(
      activeVocab
        .filter(w => w && w.word)
        .map(w => w.word.toLowerCase().trim())
    );
    return curriculumList.filter(item => item && item.word && !activeVocabWords.has(item.word.toLowerCase().trim())).length;
  };
  const waitingCount = getWaitingCount();

  const cefrLevels = cefrTiers.map(tier => {
    const count = activeVocab.filter(w => w && getCefr(w) === tier.id).length;
    const totalInCurriculum = (activeCurriculum !== 'Self-Study only' && curriculumList && curriculumList.length > 0)
      ? curriculumList.filter(w => w && w.cefr_level && (w.cefr_level || '').toUpperCase() === tier.id.toUpperCase()).length
      : 0;
    return { ...tier, count, totalInCurriculum };
  });

  const srsLevels = [
    { 
      level: 'Learning', 
      count: activeVocab.filter(w => w.srsLevel === 'Learning').length + waitingCount, 
      color: '#334155',
      actualLearning: activeVocab.filter(w => w.srsLevel === 'Learning').length,
      waiting: waitingCount
    },
    { level: 'Easy', count: counts.easy + counts.superEasy, color: '#cbd5e1' },
    { level: 'Normal', count: counts.normal, color: '#94a3b8' },
    { level: 'Hard', count: counts.hard, color: '#64748b' },
    { level: 'Mastered', count: counts.mastered, color: '#ffffff' }
  ];

  const handleOpenModal = (level, type) => {
    setSelectedLevel(level);
    setLevelType(type);
    setSearchQuery('');
    setActiveCategory('All Categories');
    setActivePos('All POS');
    window.dispatchEvent(new CustomEvent('tutorial-srs-modal-opened', { detail: { level, type } }));
  };

  const getModalList = () => {
    if (!selectedLevel || !levelType) return [];
    
    let list = [];

    if (levelType === 'srs') {
      if (selectedLevel === 'Total') {
        list = activeVocab;
      } else if (selectedLevel === 'Learning') {
        const studyingList = activeVocab.filter(w => w.srsLevel === 'Learning');
        if (activeCurriculum !== 'Self-Study only' && curriculumList && curriculumList.length > 0) {
          const activeVocabWords = new Set(
            activeVocab
              .filter(w => w && w.word)
              .map(w => w.word.toLowerCase().trim())
          );
          const waitingWords = curriculumList
            .filter(item => item && item.word && !activeVocabWords.has(item.word.toLowerCase().trim()))
            .map(currItem => ({
              id: `waiting-${currItem.word.toLowerCase().trim()}`,
              word: currItem.word.toLowerCase().trim(),
              pos: currItem.pos || 'n.',
              cefrLevel: currItem.cefr_level || 'A1',
              srsLevel: 'Waiting',
              meaning: '',
              example: '',
              isWaiting: true
            }));
          list = [...studyingList, ...waitingWords];
        } else {
          list = studyingList;
        }
      } else {
        list = activeVocab.filter(w => {
          if (!w) return false;
          if (selectedLevel === 'Easy') {
            return w.srsLevel === 'Easy' || w.srsLevel === 'Super Easy';
          }
          return w.srsLevel === selectedLevel;
        });
      }
    } else if (levelType === 'category') {
      list = activeVocab.filter(w => getCategory(w) === selectedLevel);
    } else {
      if (activeCurriculum !== 'Self-Study only' && curriculumList && curriculumList.length > 0) {
        const currWords = curriculumList.filter(item => item && item.word && (item.cefr_level || '').toUpperCase() === selectedLevel.toUpperCase());
        list = currWords.map(currItem => {
          const existing = activeVocab.find(v => v && v.word && v.word.toLowerCase().trim() === currItem.word.toLowerCase().trim());
          if (existing) {
            return existing;
          } else {
            return {
              id: `waiting-${currItem.word.toLowerCase().trim()}`,
              word: currItem.word.toLowerCase().trim(),
              pos: currItem.pos || 'n.',
              cefrLevel: currItem.cefr_level || selectedLevel,
              srsLevel: 'Waiting',
              meaning: '',
              example: '',
              isWaiting: true
            };
          }
        });
      } else {
        list = activeVocab.filter(w => w && getCefr(w) === selectedLevel);
      }
    }
    
    if (searchQuery.trim().length > 0) {
      const q = searchQuery.toLowerCase();
      list = list.filter(w => w && ((w.word && w.word.toLowerCase().includes(q)) || (w.meaning && w.meaning.toLowerCase().includes(q))));
    }
    
    if (activeCategory !== 'All Categories') {
      list = list.filter(w => getCategory(w) === activeCategory);
    }
    
    if (activePos !== 'All POS') {
      list = list.filter(w => {
         if (!w) return false;
         const p = (w.pos || '').toLowerCase();
         return p.includes(activePos.toLowerCase());
      });
    }

    list.sort((a, b) => {
      const aWord = a?.word || '';
      const bWord = b?.word || '';
      if (sortOrder === 'asc') return aWord.localeCompare(bWord);
      return bWord.localeCompare(aWord);
    });
    
    return list;
  };

  const modalList = getModalList();
  
  const getModalColor = () => {
    if (levelType === 'srs') {
      if (selectedLevel === 'Total') return '#ffffff';
      return srsTapColors[selectedLevel] || '#cbd5e1';
    }
    if (levelType === 'cefr') {
      return cefrTapColors[selectedLevel] || '#cbd5e1';
    }
    if (levelType === 'category') {
      return categoryColors[selectedLevel] || '#cbd5e1';
    }
    return '#cbd5e1';
  };

  const renderCurriculumModal = () => {
    return (
      <AnimatePresence>
        {showCurriculumModal && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowCurriculumModal(false)}
              style={{
                position: 'absolute',
                inset: 0,
                background: 'rgba(0,0,0,0.85)',
                zIndex: 15000,
                backdropFilter: 'blur(10px)',
                WebkitBackdropFilter: 'blur(10px)'
              }}
            />

            {/* Menu Container */}
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
                id="tutorial-profile-curriculum-modal-content"
                initial={{ scale: 0.92, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.92, opacity: 0, y: 20 }}
                transition={{ type: 'spring', damping: 25, stiffness: 280 }}
                style={{
                  pointerEvents: 'auto',
                  width: '90%',
                  maxWidth: '380px',
                  background: 'radial-gradient(circle at 50% 0%, rgba(255, 255, 255, 0.06) 0%, rgba(10, 12, 17, 0.85) 100%)',
                  borderRadius: '28px',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  boxShadow: '0 25px 60px rgba(0, 0, 0, 0.8), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
                  display: 'flex',
                  flexDirection: 'column',
                  padding: '2rem 1.5rem 1.8rem 1.5rem',
                  position: 'relative',
                  overflow: 'hidden'
                }}
              >
                {/* Close Button */}
                <button
                  onClick={() => setShowCurriculumModal(false)}
                  style={{
                    position: 'absolute',
                    top: '1.25rem',
                    right: '1.25rem',
                    background: 'rgba(255, 255, 255, 0.04)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '50%',
                    width: '32px',
                    height: '32px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#cbd5e1',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                    e.currentTarget.style.color = '#ffffff';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)';
                    e.currentTarget.style.color = '#cbd5e1';
                  }}
                >
                  <X size={16} />
                </button>

                {/* Header title */}
                <div style={{ textAlign: 'center', marginBottom: '1.8rem' }}>
                  <h3 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 950, color: 'white', letterSpacing: '-0.5px' }}>
                    Curriculum Profile
                  </h3>
                  <p style={{ margin: '0.35rem 0 0 0', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                    Select your learning focus mode
                  </p>
                </div>

                {/* Options List */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                  {[
                    { 
                      id: 'Self-Study only', 
                      label: 'Self-Study', 
                      desc: 'Pure custom vocabulary practice', 
                      icon: Trophy, 
                      color: '#cbd5e1',
                      standard: true
                    },
                    { 
                      id: 'Oxford 5000', 
                      label: 'Oxford 5000', 
                      desc: 'Core everyday English words', 
                      icon: BookOpen, 
                      color: '#3b82f6',
                      suggested: true
                    },
                    { 
                      id: 'TOEIC Essential', 
                      label: 'TOEIC Essential', 
                      desc: 'Business & workplace focus', 
                      icon: TrendingUp,
                      color: '#ef4444' 
                    },
                    { 
                      id: 'IELTS Academic', 
                      label: 'IELTS Academic', 
                      desc: 'Academic & university prep', 
                      icon: Trophy,
                      color: '#a78bfa' 
                    },
                    { 
                      id: 'Daily Phrases', 
                      label: 'Daily Phrases', 
                      desc: 'Common phrases for everyday use', 
                      icon: MessageSquare,
                      color: '#34d399' 
                    }
                  ].map(item => {
                    const isActive = activeCurriculum === item.id;
                    const ItemIcon = item.icon;
                    return (
                      <button
                        key={item.id}
                        id={
                          item.id === 'TOEIC Essential' 
                            ? 'tutorial-curriculum-option-toeic' 
                            : item.id === 'Self-Study only'
                            ? 'tutorial-curriculum-option-self-study'
                            : undefined
                        }
                        onClick={() => {
                          setActiveCurriculum(item.id);
                          localStorage.setItem('chatgpt_anki_curriculum', item.id);
                          setShowCurriculumModal(false);
                          window.dispatchEvent(new CustomEvent('tutorial-curriculum-selected', { detail: { id: item.id } }));
                        }}
                        style={{
                          width: '100%',
                          padding: '0.9rem 1.1rem',
                          background: isActive ? `${item.color}15` : 'rgba(255, 255, 255, 0.015)',
                          border: isActive ? `1.5px solid ${item.color}` : '1.5px solid rgba(255, 255, 255, 0.05)',
                          borderRadius: '18px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.9rem',
                          textAlign: 'left',
                          transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                          outline: 'none',
                          boxShadow: isActive ? `0 8px 25px ${item.color}20` : 'none'
                        }}
                        onMouseEnter={(e) => {
                          if (!isActive) {
                            e.currentTarget.style.borderColor = `${item.color}50`;
                            e.currentTarget.style.background = `${item.color}0a`;
                            e.currentTarget.style.boxShadow = `0 6px 20px ${item.color}10`;
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!isActive) {
                            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.05)';
                            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.015)';
                            e.currentTarget.style.boxShadow = 'none';
                          }
                        }}
                      >
                        {/* Icon Box */}
                        <div style={{
                          width: '38px',
                          height: '38px',
                          borderRadius: '10px',
                          background: isActive ? `${item.color}18` : 'rgba(255, 255, 255, 0.03)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: isActive ? item.color : '#cbd5e1',
                          flexShrink: 0,
                          transition: 'all 0.2s'
                        }}>
                          <ItemIcon size={18} />
                        </div>

                        {/* Text Content */}
                        <div style={{ flex: 1 }}>
                          <div style={{ 
                            fontSize: '0.9rem', 
                            fontWeight: 800, 
                            color: isActive ? 'white' : '#cbd5e1',
                            transition: 'color 0.2s',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                          }}>
                            <span>{item.label}</span>
                            {item.suggested && (
                              <span style={{
                                fontSize: '0.58rem',
                                padding: '2px 6px',
                                borderRadius: '6px',
                                background: 'rgba(59, 130, 246, 0.15)',
                                border: '1px solid rgba(59, 130, 246, 0.3)',
                                color: '#3b82f6',
                                fontWeight: 900,
                                textTransform: 'uppercase',
                                letterSpacing: '0.5px'
                              }}>
                                Suggest
                              </span>
                            )}
                            {item.standard && (
                              <span style={{
                                fontSize: '0.58rem',
                                padding: '2px 6px',
                                borderRadius: '6px',
                                background: 'rgba(255, 255, 255, 0.05)',
                                border: '1px solid rgba(255, 255, 255, 0.15)',
                                color: 'rgba(255, 255, 255, 0.5)',
                                fontWeight: 900,
                                textTransform: 'uppercase',
                                letterSpacing: '0.5px'
                              }}>
                                Standard
                              </span>
                            )}
                          </div>
                          <div style={{ 
                            fontSize: '0.7rem', 
                            color: 'var(--text-secondary)', 
                            marginTop: '2px',
                            fontWeight: 500,
                            lineHeight: '1.3'
                          }}>
                            {item.desc}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>
    );
  };


  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      
      {/* Full-Screen Streak Splash Overlay */}
      <AnimatePresence>
        {showStreakSplash && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowStreakSplash(false)}
            style={{
              position: 'absolute',
              inset: 0,
              zIndex: 999999,
              background: 'rgba(5, 6, 8, 0.94)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer'
            }}
          >
            <motion.div
              initial={{ scale: 0.8, y: 30, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.8, y: -30, opacity: 0 }}
              transition={{ type: 'spring', damping: 18, stiffness: 150 }}
              style={{
                textAlign: 'center',
                padding: '2.5rem',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center'
              }}
            >
               <motion.div
                 animate={{ 
                   filter: [
                     'drop-shadow(0 0 20px rgba(249, 115, 22, 0.2))',
                     'drop-shadow(0 0 45px rgba(239, 68, 68, 0.45))',
                     'drop-shadow(0 0 20px rgba(249, 115, 22, 0.2))'
                   ]
                 }}
                 transition={{ 
                   repeat: Infinity, 
                   duration: 3.5, 
                   ease: "easeInOut" 
                 }}
                 style={{
                   marginBottom: '1.5rem',
                 }}
               >
                 <div style={{
                   width: '135px',
                   height: '145px',
                   background: 'rgba(255, 255, 255, 0.04)',
                   borderRadius: '20px',
                   border: '1px solid rgba(255, 255, 255, 0.12)',
                   boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 45px rgba(249, 115, 22, 0.15)',
                   display: 'flex',
                   flexDirection: 'column',
                   overflow: 'hidden',
                   position: 'relative'
                 }}>
                   {/* Calendar Header binder */}
                   <div style={{
                     width: '100%',
                     height: '28px',
                     background: 'linear-gradient(90deg, #f97316 0%, #ef4444 100%)',
                     display: 'flex',
                     alignItems: 'center',
                     justifyContent: 'center',
                     position: 'relative'
                   }}>
                     {/* Ring holes */}
                     <div style={{ position: 'absolute', top: '8px', left: '22px', width: '5px', height: '5px', borderRadius: '50%', background: '#090a0f' }} />
                     <div style={{ position: 'absolute', top: '8px', right: '22px', width: '5px', height: '5px', borderRadius: '50%', background: '#090a0f' }} />
                   </div>
                   
                   {/* Content */}
                   <div style={{
                     flex: 1,
                     display: 'flex',
                     flexDirection: 'column',
                     alignItems: 'center',
                     justifyContent: 'center',
                     paddingTop: '0.2rem'
                   }}>
                      <div style={{
                        position: 'relative',
                        height: '4rem',
                        width: '100%',
                        overflow: 'hidden',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <AnimatePresence mode="popLayout">
                          <motion.span
                            key={displayedStreak}
                            initial={{ y: 32, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: -32, opacity: 0 }}
                            transition={{ type: 'spring', stiffness: 300, damping: 21 }}
                            style={{
                              position: 'absolute',
                              fontSize: '3.8rem',
                              fontWeight: 950,
                              color: '#ffffff',
                              lineHeight: 1,
                              letterSpacing: '-2px'
                            }}
                          >
                            {displayedStreak}
                          </motion.span>
                        </AnimatePresence>
                      </div>
                     <span style={{
                       fontSize: '0.6rem',
                       color: '#f97316',
                       fontWeight: 900,
                       letterSpacing: '2px',
                       textTransform: 'uppercase',
                       marginTop: '0.1rem',
                       zIndex: 5
                     }}>
                       DAYS
                     </span>
                   </div>
                 </div>
               </motion.div>
 
               <h2 style={{
                 fontSize: '2.4rem',
                 fontWeight: 950,
                 margin: 0,
                 color: 'white',
                 letterSpacing: '-1.2px',
                 lineHeight: '1.2',
                 display: 'flex',
                 alignItems: 'center',
                 justifyContent: 'center',
                 gap: '0.45rem'
               }}>
                 <span>STREAK</span>
                 <div style={{
                   position: 'relative',
                   height: '2.8rem',
                   width: '65px',
                   overflow: 'hidden',
                   display: 'inline-flex',
                   alignItems: 'center',
                   justifyContent: 'center'
                 }}>
                   <AnimatePresence mode="popLayout">
                     <motion.span
                       key={displayedStreak}
                       initial={{ y: 22, opacity: 0 }}
                       animate={{ y: 0, opacity: 1 }}
                       exit={{ y: -22, opacity: 0 }}
                       transition={{ type: 'spring', stiffness: 300, damping: 21 }}
                       style={{
                         position: 'absolute',
                         fontWeight: 950,
                         color: '#ffffff'
                       }}
                     >
                       {displayedStreak}
                     </motion.span>
                   </AnimatePresence>
                 </div>
               </h2>

              <p style={{
                fontSize: '1rem',
                fontWeight: 800,
                color: '#cbd5e1',
                marginTop: '0.6rem',
                margin: '0.6rem 0 0 0',
                letterSpacing: '1px',
                background: 'linear-gradient(135deg, #ffffff 0%, #a78bfa 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                textTransform: 'uppercase'
              }}>
                <span>Keep the momentum!</span>
                <motion.span
                  animate={{ y: [0, -3, 0] }}
                  transition={{ repeat: Infinity, duration: 1.2, ease: 'easeInOut' }}
                >
                  ⚡
                </motion.span>
              </p>

              <span style={{
                fontSize: '0.72rem',
                color: 'var(--text-secondary)',
                opacity: 0.5,
                marginTop: '3.5rem',
                textTransform: 'uppercase',
                letterSpacing: '1px'
              }}>
                Tap anywhere to continue
              </span>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <div 
        className="scrollable-content" 
        style={{ 
          padding: '65px 1.25rem 1.25rem 1.25rem', 
          width: '100%', 
          boxSizing: 'border-box', 
          height: '100%', 
          overflowY: 'auto', 
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: activeShowDetails ? 'flex-start' : 'center',
          cursor: 'pointer',
          position: 'relative'
        }}
        onClick={() => {
          if (isTutorial) return;
          setShowDetails(prev => !prev);
        }}
      >

        {/* Premium Artsy Morphing Ambient Glow in Minimal Mode */}
        {theme === 'theme-1' && !activeShowDetails && (
          <motion.div 
            animate={{ 
              borderRadius: ['42% 58% 70% 30%', '70% 30% 52% 48%', '42% 58% 70% 30%'],
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
              background: activeCurriculum === 'Oxford 5000' 
                ? 'linear-gradient(135deg, rgba(59, 130, 246, 0.12) 0%, rgba(6, 182, 212, 0.08) 50%, rgba(99, 102, 241, 0.08) 100%)'
                : activeCurriculum === 'TOEIC Essential' 
                ? 'linear-gradient(135deg, rgba(239, 68, 68, 0.12) 0%, rgba(249, 115, 22, 0.08) 50%, rgba(167, 139, 250, 0.08) 100%)'
                : activeCurriculum === 'IELTS Academic' 
                ? 'linear-gradient(135deg, rgba(168, 85, 247, 0.12) 0%, rgba(236, 72, 153, 0.08) 50%, rgba(99, 102, 241, 0.08) 100%)'
                : activeCurriculum === 'Daily Phrases'
                ? 'linear-gradient(135deg, rgba(52, 211, 153, 0.12) 0%, rgba(5, 150, 105, 0.08) 50%, rgba(16, 185, 129, 0.08) 100%)'
                : 'linear-gradient(135deg, rgba(255, 255, 255, 0.08) 0%, rgba(148, 163, 184, 0.05) 50%, rgba(71, 85, 105, 0.05) 100%)',
              filter: 'blur(75px)',
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
          flex: activeShowDetails ? '0 0 auto' : '1',
          width: '100%',
          margin: activeShowDetails ? '0.5rem 0 1.25rem 0' : 'auto 0'
        }}>
          {/* Compact Curriculum Trigger */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.6rem', marginTop: '0px' }}>
            <button
              id="tutorial-profile-curriculum"
              onClick={(e) => {
                e.stopPropagation();
                setShowCurriculumModal(true);
                window.dispatchEvent(new Event('tutorial-curriculum-opened'));
              }}
              style={{
                padding: '0.22rem 0.6rem',
                fontSize: '0.65rem',
                fontWeight: 800,
                borderRadius: '12px',
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(255, 255, 255, 0.06)',
                color: '#cbd5e1',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                transition: 'all 0.22s cubic-bezier(0.4, 0, 0.2, 1)',
                outline: 'none',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
              }}
              onMouseEnter={(e) => {
                const colors = {
                  'Self-Study only': '#cbd5e1',
                  'Oxford 5000': '#3b82f6',
                  'TOEIC Essential': '#ef4444',
                  'IELTS Academic': '#a78bfa',
                  'Daily Phrases': '#34d399'
                };
                const activeColor = colors[activeCurriculum] || '#cbd5e1';
                e.currentTarget.style.background = `${activeColor}10`;
                e.currentTarget.style.borderColor = `${activeColor}40`;
                e.currentTarget.style.color = activeColor;
                e.currentTarget.style.boxShadow = `0 4px 12px ${activeColor}15`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.06)';
                e.currentTarget.style.color = '#cbd5e1';
                e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
              }}
            >
              <span>{activeCurriculum === 'Self-Study only' ? 'Self-Study' : activeCurriculum}</span>
            </button>
          </div>

          {/* Profile Header */}
          <div style={{ marginBottom: '1.25rem', marginTop: '0.5rem', textAlign: 'center', zIndex: 1, position: 'relative' }}>
            {/* Prominent Word Count Highlight with Glass Shine */}
            <motion.div 
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={(e) => {
                e.stopPropagation();
                handleOpenModal('Total', 'srs');
              }}
              onMouseEnter={() => setHeaderHovered(true)}
              onMouseLeave={() => setHeaderHovered(false)}
              style={{
                display: 'inline-flex',
                flexDirection: 'column',
                alignItems: 'center',
                background: headerHovered 
                  ? 'linear-gradient(135deg, rgba(255, 255, 255, 0.12) 0%, rgba(255, 255, 255, 0.05) 100%)'
                  : 'linear-gradient(135deg, rgba(255, 255, 255, 0.07) 0%, rgba(255, 255, 255, 0.02) 100%)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                boxShadow: headerHovered
                  ? '0 25px 50px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.25), inset 0 -1px 0 rgba(0, 0, 0, 0.4)'
                  : '0 20px 40px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.15), inset 0 -1px 0 rgba(0, 0, 0, 0.3)',
                borderRadius: '24px',
                padding: '1.25rem 2.5rem',
                cursor: 'pointer',
                transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                backdropFilter: 'blur(35px)',
                WebkitBackdropFilter: 'blur(35px)',
                position: 'relative',
                overflow: 'hidden'
              }}
            >
              {/* Diagonal Glass Shine Sweep Effect */}
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

              <span style={{ 
                fontSize: '2.5rem', 
                fontWeight: 950, 
                color: 'white', 
                lineHeight: '1.1', 
                background: 'linear-gradient(135deg, #ffffff 0%, #cbd5e1 50%, #94a3b8 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                transition: 'color 0.2s',
                letterSpacing: '-1px'
              }}>
                {stats.totalKnown}
              </span>
              <span style={{ 
                fontSize: '0.65rem', 
                color: 'var(--text-secondary)', 
                fontWeight: 800, 
                textTransform: 'uppercase', 
                letterSpacing: '1.5px', 
                marginTop: '6px',
                transition: 'color 0.2s'
              }}>
                Words in deck
              </span>
            </motion.div>
          </div>



          {!activeShowDetails && (
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
          {activeShowDetails && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ duration: 0.3 }}
              style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}
            >
              {/* SRS Stages Section */}
              <div id="tutorial-profile-srs" className="glass-panel" style={{ padding: '1.25rem', marginBottom: '1.25rem', background: 'rgba(255, 255, 255, 0.01)', border: '1px solid rgba(255, 255, 255, 0.05)', width: '100%' }}>
                <h3 style={{ margin: '0 0 0.85rem 0', fontSize: '1.05rem', color: 'white', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 800 }}>
                  <TrendingUp size={16} color="#cbd5e1" style={{ filter: 'drop-shadow(0 0 4px rgba(255,255,255,0.2))' }} /> SRS Stages
                </h3>
                
                {/* Stacked Proportional Bar Graph */}
                <div style={{
                  height: '12px',
                  borderRadius: '6px',
                  background: 'rgba(255, 255, 255, 0.04)',
                  overflow: 'hidden',
                  display: 'flex',
                  width: '100%',
                  marginBottom: '1rem',
                  border: '1px solid rgba(255,255,255,0.02)'
                }}>
                  {srsLevels.map((lvl) => {
                    const pct = (lvl.count / (counts.total || 1)) * 100;
                    if (pct <= 0) return null;
                    const isHovered = hoveredSrs === lvl.level;
                    const barBg = isHovered ? srsTapColors[lvl.level] : lvl.color;
                    return (
                      <div
                        key={lvl.level}
                        onMouseEnter={() => setHoveredSrs(lvl.level)}
                        onMouseLeave={() => setHoveredSrs(null)}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenModal(lvl.level, 'srs');
                        }}
                        style={{
                          width: `${pct}%`,
                          height: '100%',
                          background: barBg,
                          transition: 'width 0.4s ease-out, background-color 0.15s ease, box-shadow 0.15s ease',
                          boxShadow: isHovered ? `0 0 12px ${srsTapColors[lvl.level]}80, inset 0 1px 0 rgba(255,255,255,0.1)` : 'none',
                          cursor: 'pointer'
                        }}
                        title={`${lvl.level}: ${lvl.count}`}
                      />
                    );
                  })}
                </div>

                {/* Grid of Clickable mini cards with dynamic tap colors */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.4rem' }}>
                  {srsLevels.map(lvl => {
                    const isHovered = hoveredSrs === lvl.level;
                    return (
                      <motion.div 
                        whileTap={{ scale: 0.95 }}
                        key={lvl.level} 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenModal(lvl.level, 'srs');
                        }} 
                        style={{ 
                          background: 'rgba(255,255,255,0.01)', 
                          padding: '0.5rem 0.2rem', 
                          borderRadius: '10px', 
                          cursor: 'pointer', 
                          textAlign: 'center', 
                          border: '1px solid rgba(255,255,255,0.05)',
                          borderColor: isHovered ? srsTapColors[lvl.level] : 'rgba(255,255,255,0.05)',
                          boxShadow: isHovered ? `0 0 15px ${srsTapColors[lvl.level]}20` : 'none',
                          transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)'
                        }}
                        onMouseEnter={() => setHoveredSrs(lvl.level)}
                        onMouseLeave={() => setHoveredSrs(null)}
                      >
                         <div style={{ 
                           color: isHovered ? srsTapColors[lvl.level] : '#cbd5e1', 
                           opacity: isHovered ? 1 : 0.7,
                           fontSize: '0.55rem', 
                           fontWeight: 800, 
                           marginBottom: '0.2rem', 
                           textTransform: 'uppercase',
                           transition: 'color 0.25s ease, opacity 0.25s ease'
                         }}>{lvl.level}</div>
                          <div style={{ 
                            fontSize: '1rem', 
                            color: isHovered ? srsTapColors[lvl.level] : '#ffffff', 
                            fontWeight: 900,
                            transition: 'color 0.25s ease'
                          }}>
                            {lvl.level === 'Learning' && lvl.waiting > 0 ? (
                              <>
                                {lvl.actualLearning}
                                <span style={{ fontSize: '0.62rem', color: '#fbbf24', display: 'block', fontWeight: 500, marginTop: '2px' }}>
                                  ({lvl.waiting} wait)
                                </span>
                              </>
                            ) : (
                              lvl.count
                            )}
                          </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>

              {/* 2-Column Side-by-Side Layout for Topics & CEFR */}
              <div style={{ display: 'grid', gridTemplateColumns: activeCurriculum === 'Self-Study only' ? '1fr' : '1.05fr 0.95fr', gap: '0.75rem', width: '100%', marginBottom: '1.25rem' }}>
                
                {/* Left Side: Topics & Contexts Panel */}
                <div className="glass-panel" style={{ padding: '0.95rem', background: 'rgba(255, 255, 255, 0.01)', border: '1px solid rgba(255, 255, 255, 0.05)', borderRadius: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    <h3 style={{ margin: '0 0 0.65rem 0', fontSize: '0.92rem', color: 'white', display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 800 }}>
                      <BookOpen size={14} color="#cbd5e1" /> Topics & Contexts
                    </h3>

                    {/* Mini proportional bar graph */}
                    <div style={{
                      height: '8px',
                      borderRadius: '4px',
                      background: 'rgba(255, 255, 255, 0.04)',
                      overflow: 'hidden',
                      display: 'flex',
                      width: '100%',
                      marginBottom: '0.75rem',
                      border: '1px solid rgba(255,255,255,0.02)',
                      gap: '1px'
                    }}>
                      {['Daily Life', 'Business', 'Academic'].map((cat) => {
                        const count = activeVocab.filter(w => getCategory(w) === cat).length;
                        const pct = (count / (counts.total || 1)) * 100;
                        if (pct <= 0) return null;
                        const isLit = hoveredCategory === cat || (selectedLevel === cat && levelType === 'category');
                        const barBg = isLit ? categoryColors[cat] : '#cbd5e150';
                        return (
                          <div
                            key={cat}
                            onMouseEnter={() => setHoveredCategory(cat)}
                            onMouseLeave={() => setHoveredCategory(null)}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenModal(cat, 'category');
                            }}
                            style={{
                              width: `${pct}%`,
                              height: '100%',
                              background: barBg,
                              transition: 'width 0.4s ease-out, background-color 0.25s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                              boxShadow: isLit ? `0 0 10px ${categoryColors[cat]}` : 'none',
                              cursor: 'pointer',
                              borderRadius: '1px'
                            }}
                            title={`${cat}: ${count}`}
                          />
                        );
                      })}
                    </div>
                  </div>

                  {/* Long Row Items */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                    {['Daily Life', 'Business', 'Academic'].map(cat => {
                      const count = activeVocab.filter(w => getCategory(w) === cat).length;
                      const isActive = hoveredCategory === cat || (selectedLevel === cat && levelType === 'category');
                      const brandColor = isActive ? categoryColors[cat] : '#cbd5e1';
                      return (
                        <motion.div 
                          whileTap={{ scale: 0.97 }}
                          key={cat} 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenModal(cat, 'category');
                          }} 
                          style={{ 
                            background: isActive ? `${brandColor}15` : 'rgba(255, 255, 255, 0.01)', 
                            padding: '0.45rem 0.6rem', 
                            borderRadius: '8px', 
                            cursor: 'pointer', 
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            border: '1px solid',
                            borderLeft: `4px solid ${brandColor}`,
                            borderColor: isActive ? brandColor : 'rgba(255, 255, 255, 0.05)',
                            boxShadow: isActive ? `0 0 10px ${brandColor}15` : 'none',
                            transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)'
                          }}
                          onMouseEnter={() => setHoveredCategory(cat)}
                          onMouseLeave={() => setHoveredCategory(null)}
                        >
                           <span style={{ color: isActive ? '#ffffff' : '#cbd5e1', fontSize: '0.72rem', fontWeight: 700 }}>{cat}</span>
                           <span style={{ fontSize: '0.85rem', color: brandColor, fontWeight: 900 }}>{count}</span>
                        </motion.div>
                      )
                    })}
                  </div>
                </div>

                {/* Right Side: CEFR Level Progress Panel */}
                {activeCurriculum !== 'Self-Study only' && (
                  <div className="glass-panel" style={{ padding: '0.95rem', background: 'rgba(255, 255, 255, 0.01)', border: '1px solid rgba(255, 255, 255, 0.05)', borderRadius: '20px' }}>
                    <h3 style={{ margin: '0 0 0.65rem 0', fontSize: '0.92rem', color: 'white', display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 800 }}>
                      <Trophy size={14} color="#cbd5e1" /> CEFR Level
                    </h3>

                    {/* Mini proportional bar graph */}
                    <div style={{
                      height: '8px',
                      borderRadius: '4px',
                      background: 'rgba(255, 255, 255, 0.04)',
                      overflow: 'hidden',
                      display: 'flex',
                      width: '100%',
                      marginBottom: '0.75rem',
                      border: '1px solid rgba(255,255,255,0.02)',
                      gap: '1px'
                    }}>
                      {cefrLevels.map((lvl) => {
                        const pct = (lvl.count / (counts.total || 1)) * 100;
                        if (pct <= 0) return null;
                        const isLit = hoveredCefr === lvl.id || (selectedLevel === lvl.id && levelType === 'cefr');
                        const barBg = isLit ? cefrTapColors[lvl.id] : '#cbd5e150';
                        return (
                          <div
                            key={lvl.id}
                            onMouseEnter={() => setHoveredCefr(lvl.id)}
                            onMouseLeave={() => setHoveredCefr(null)}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenModal(lvl.id, 'cefr');
                            }}
                            style={{
                              width: `${pct}%`,
                              height: '100%',
                              background: barBg,
                              transition: 'width 0.4s ease-out, background-color 0.25s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                              boxShadow: isLit ? `0 0 10px ${cefrTapColors[lvl.id]}` : 'none',
                              cursor: 'pointer',
                              borderRadius: '1px'
                            }}
                            title={`${lvl.id}: ${lvl.count}`}
                          />
                        );
                      })}
                    </div>

                    {/* Grid of Clickable mini cards (2 rows of 3 columns) */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.35rem' }}>
                      {cefrLevels.map(item => {
                        const isActive = hoveredCefr === item.id || (selectedLevel === item.id && levelType === 'cefr');
                        const brandColor = isActive ? cefrTapColors[item.id] : '#cbd5e1';
                        return (
                          <motion.div 
                            whileTap={{ scale: 0.95 }}
                            key={item.id} 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenModal(item.id, 'cefr');
                            }} 
                            style={{ 
                              background: isActive ? `${brandColor}12` : 'rgba(255,255,255,0.01)', 
                              padding: '0.45rem 0.2rem', 
                              borderRadius: '8px', 
                              cursor: 'pointer', 
                              textAlign: 'center', 
                              border: '1px solid',
                              borderColor: isActive ? brandColor : 'rgba(255,255,255,0.05)',
                              boxShadow: isActive ? `0 0 12px ${brandColor}25` : 'none',
                              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
                            }}
                            onMouseEnter={() => {
                              setHoveredCefr(item.id);
                              setOxfordHoveredLevel(item.id);
                            }}
                            onMouseLeave={() => {
                              setHoveredCefr(null);
                              setOxfordHoveredLevel(null);
                            }}
                          >
                             <div style={{ 
                               color: isActive ? '#ffffff' : brandColor, 
                               opacity: isActive ? 1 : 0.75,
                               fontSize: '0.7rem', 
                               fontWeight: 800, 
                               marginBottom: '0.1rem',
                               transition: 'color 0.2s, opacity 0.2s'
                             }}>{item.id}</div>
                             <div style={{ 
                               fontSize: '0.85rem', 
                               color: isActive ? brandColor : '#ffffff', 
                               fontWeight: 900,
                               transition: 'color 0.2s'
                             }}>
                               {activeCurriculum === 'Self-Study only' ? (
                                 item.count
                               ) : (
                                 <>
                                   {item.count}
                                   <span style={{ color: 'var(--text-secondary)', fontSize: '0.65rem', fontWeight: 500 }}> / {item.totalInCurriculum}</span>
                                 </>
                               )}
                             </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Oxford 5000 CEFR Coverage Panel */}
              {activeCurriculum !== 'Self-Study only' && (
                <div 
                  id="tutorial-profile-progress"
                  className="glass-panel" 
                  onMouseEnter={() => setProgressHovered(true)}
                  onMouseLeave={() => setProgressHovered(false)}
                  style={{ 
                    padding: '0.85rem 1rem', 
                    background: progressHovered 
                      ? 'rgba(10, 8, 20, 0.65)'
                      : 'rgba(10, 8, 20, 0.35)',
                    border: progressHovered
                      ? '1px solid rgba(255, 255, 255, 0.15)'
                      : '1px solid rgba(255, 255, 255, 0.05)',
                    boxShadow: progressHovered
                      ? '0 8px 25px rgba(0, 0, 0, 0.35)'
                      : 'none',
                    borderRadius: '18px', 
                    width: '100%', 
                    boxSizing: 'border-box', 
                    marginTop: '0.25rem',
                    transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)'
                  }}
                >
                    {(() => {
                    const displayedLevelId = oxfordHoveredLevel || oxfordActiveLevel;
                    if (displayedLevelId) {
                      const tier = cefrTiers.find(t => t.id === displayedLevelId);
                      const count = activeVocab.filter(w => getCefr(w) === displayedLevelId).length;
                      const target = getCefrTarget(displayedLevelId);
                      const pct = Math.min((count / target) * 100, 100);
                      const brandColor = cefrTapColors[displayedLevelId];
                      
                      return (
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', height: '18px' }}>
                          <h4 style={{ margin: 0, color: brandColor, display: 'flex', alignItems: 'center', gap: '0.35rem', fontWeight: 800, transition: 'all 0.2s' }}>
                            <TrendingUp size={12} color={brandColor} /> 
                            <span>{displayedLevelId} ({tier.name})</span>
                          </h4>
                          <div style={{ fontWeight: 800, color: '#ffffff', transition: 'all 0.2s' }}>
                            {count} <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>/ {target} words</span>
                            <span style={{ marginLeft: '8px', color: brandColor, fontSize: '0.75rem' }}>{pct.toFixed(1)}%</span>
                          </div>
                        </div>
                      );
                    } else {
                      // Use real curriculum count from database, fallback to hardcoded only if curriculumList is empty
                      const targetLimit = (activeCurriculum !== 'Self-Study only' && curriculumList && curriculumList.length > 0) 
                        ? curriculumList.length 
                        : (activeCurriculum === 'Self-Study only' ? Math.max(counts.total, 1) : 0);
                      const pct = targetLimit > 0 ? Math.min((counts.total / targetLimit) * 100, 100) : 0;
                      const waitingCount = (activeCurriculum !== 'Self-Study only' && curriculumList && curriculumList.length > 0)
                        ? Math.max(0, curriculumList.length - counts.total)
                        : 0;
                      return (
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.72rem', minHeight: '18px', height: 'auto', flexWrap: 'wrap', gap: '4px' }}>
                          <h4 style={{ margin: 0, color: 'white', display: 'flex', alignItems: 'center', gap: '0.25rem', fontWeight: 800, fontSize: '0.72rem', whiteSpace: 'nowrap' }}>
                            <TrendingUp size={11} color="#cbd5e1" /> 
                            <span>{activeCurriculum === 'Self-Study only' ? 'Self-Study' : activeCurriculum}</span>
                          </h4>
                          <div style={{ fontWeight: 800, color: '#ffffff', fontSize: '0.7rem', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <span>{counts.total}</span>
                            <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>/ {targetLimit}</span>
                            {waitingCount > 0 && <span style={{ color: '#fbbf24', fontSize: '0.62rem', fontWeight: 700 }}>({waitingCount} wait)</span>}
                            <span style={{ color: '#cbd5e1', fontSize: '0.65rem', marginLeft: '2px' }}>{pct.toFixed(1)}%</span>
                          </div>
                        </div>
                      );
                    }
                  })()}

                  {/* Progress Bar Container with 6 segments */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(6, 1fr)',
                    gap: '4px',
                    height: '6px',
                    marginTop: '0.55rem'
                  }}>
                    {cefrTiers.map((tier) => {
                      const count = activeVocab.filter(w => getCefr(w) === tier.id).length;
                      const target = getCefrTarget(tier.id);
                      const pct = Math.min((count / target) * 100, 100);
                      const brandColor = cefrTapColors[tier.id];
                      
                      const isActive = oxfordActiveLevel === tier.id;
                      const isHovered = oxfordHoveredLevel === tier.id;
                      const isHighlighted = isHovered || isActive;
                      
                      const segmentColor = isHighlighted ? brandColor : '#cbd5e1';
                      
                      return (
                        <div 
                          key={tier.id}
                          onMouseEnter={() => setOxfordHoveredLevel(tier.id)}
                          onMouseLeave={() => setOxfordHoveredLevel(null)}
                          onClick={(e) => {
                            e.stopPropagation();
                            setOxfordActiveLevel(prev => prev === tier.id ? null : tier.id);
                            handleOpenModal(tier.id, 'cefr');
                          }}
                          style={{
                            height: '100%',
                            borderRadius: '2px',
                            background: 'rgba(255, 255, 255, 0.04)',
                            border: isHighlighted ? `1px solid ${brandColor}50` : '1px solid rgba(255, 255, 255, 0.01)',
                            position: 'relative',
                            cursor: 'pointer',
                            overflow: 'hidden',
                            transition: 'all 0.25s'
                          }}
                          title={`${tier.id} (${tier.name}): ${count} / ${target} words`}
                        >
                          {/* Fill bar */}
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${pct}%` }}
                            transition={{ duration: 0.6, ease: 'easeOut' }}
                            style={{
                              height: '100%',
                              borderRadius: '2px',
                              background: isHighlighted 
                                ? `linear-gradient(90deg, ${segmentColor}aa 0%, ${segmentColor} 100%)` 
                                : `${segmentColor}40`, 
                              boxShadow: isHighlighted ? `0 0 8px ${segmentColor}60` : 'none',
                              transition: 'background 0.25s, box-shadow 0.25s'
                            }}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}


            </motion.div>
          )}
        </AnimatePresence>


      </div>

      {/* Interactive Word List Modal */}
      <AnimatePresence>
        {selectedLevel && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setSelectedLevel(null)}
              style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 9999, backdropFilter: 'blur(8px)' }}
            />
            <motion.div
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              style={{
                position: 'fixed', bottom: 0, left: 0, right: 0, height: '90%',
                background: `radial-gradient(circle at 50% 0%, ${getModalColor()}12 0%, #08090b 100%)`,
                borderTop: `2px solid ${getModalColor()}`,
                boxShadow: `0 -10px 40px rgba(0, 0, 0, 0.6), 0 0 40px ${getModalColor()}20, inset 0 0 0 1px ${getModalColor()}30`,
                zIndex: 10000, borderTopLeftRadius: '32px', borderTopRightRadius: '32px',
                display: 'flex', flexDirection: 'column'
              }}
            >
              {/* Drag Handle */}
              <div style={{ width: '50px', height: '5px', background: `${getModalColor()}40`, borderRadius: '5px', margin: '1rem auto' }} />

              {/* Modal Header */}
              <div style={{ padding: '0 1.5rem 1.0rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <div>
                  <h2 style={{ margin: '0 0 0.2rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'white', fontSize: '1.4rem', fontWeight: 900 }}>
                     <span style={{ color: getModalColor() }}>{selectedLevel}</span> Library
                  </h2>
                  <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Viewing {modalList.length} words</p>
                </div>
                <button onClick={() => setSelectedLevel(null)} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                  <X size={24} />
                </button>
              </div>

              {/* Search Bar */}
              <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ position: 'relative' }}>
                  <Search size={16} color="var(--text-secondary)" style={{ position: 'absolute', left: '0.8rem', top: '50%', transform: 'translateY(-50%)' }} />
                  <input 
                    type="text" 
                    placeholder="Search dictionary..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{
                      width: '100%', padding: '0.8rem 2rem 0.8rem 2.2rem', borderRadius: '12px',
                      background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)',
                      color: 'white', fontSize: '0.9rem', outline: 'none',
                      transition: 'border-color 0.2s, box-shadow 0.2s'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = getModalColor();
                      e.target.style.boxShadow = `0 0 12px ${getModalColor()}40`;
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                      e.target.style.boxShadow = 'none';
                    }}
                  />
                  {searchQuery && (
                    <button onClick={() => setSearchQuery('')} style={{ position: 'absolute', right: '0.8rem', top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', color: 'var(--text-secondary)' }}>
                      <X size={14} />
                    </button>
                  )}
                </div>

                {/* Categories & POS Filters */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', marginTop: '1rem', padding: '0 1.5rem 1rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', width: '100%' }}>
                    {/* Category Filter */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Category:</span>
                      <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center', overflow: 'hidden' }}>
                        <AnimatePresence mode="wait">
                          {!isCatExpanded ? (
                            <motion.button
                              key="collapsed-cat"
                              initial={{ opacity: 0, scale: 0.95 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0, scale: 0.95 }}
                              onClick={() => setIsCatExpanded(true)}
                              className="glass-button"
                              style={{ 
                                padding: '0.25rem 0.65rem', borderRadius: '16px', fontSize: '0.75rem',
                                background: getModalColor() + '15',
                                color: getModalColor(),
                                borderColor: getModalColor() + '40',
                                cursor: 'pointer',
                                fontWeight: 800,
                                display: 'flex',
                                alignItems: 'center',
                                gap: '3px'
                              }}
                            >
                              <span>{activeCategory}</span>
                              <ChevronDown size={11} />
                            </motion.button>
                          ) : (
                            <motion.div
                              key="expanded-cat"
                              initial={{ opacity: 0, x: -10, width: 0 }}
                              animate={{ opacity: 1, x: 0, width: 'auto' }}
                              exit={{ opacity: 0, x: -10, width: 0 }}
                              style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }}
                            >
                              {categories.map(cat => (
                                <button 
                                  key={cat}
                                  onClick={() => {
                                    setActiveCategory(cat);
                                    setIsCatExpanded(false);
                                  }}
                                  className="glass-button"
                                  style={{ 
                                    padding: '0.25rem 0.65rem', borderRadius: '16px', fontSize: '0.75rem', whiteSpace: 'nowrap',
                                    background: activeCategory === cat ? getModalColor() : 'rgba(255,255,255,0.03)',
                                    color: activeCategory === cat ? '#08090b' : 'var(--text-secondary)',
                                    borderColor: activeCategory === cat ? 'transparent' : 'rgba(255,255,255,0.1)',
                                    cursor: 'pointer',
                                    fontWeight: 800
                                  }}
                                >
                                  {cat}
                                </button>
                              ))}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>

                    {/* Sort Order Button */}
                    <button 
                      onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                      style={{ 
                        background: 'transparent', border: 'none', color: 'var(--accent-color)', 
                        display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', cursor: 'pointer',
                        marginLeft: 'auto'
                      }}
                    >
                      {sortOrder === 'asc' ? <ArrowUpZA size={16} /> : <ArrowDownAZ size={16} />}
                      {sortOrder === 'asc' ? 'Z-A' : 'A-Z'}
                    </button>
                  </div>

                  {/* POS Filter */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.4rem', width: '100%' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>POS:</span>
                      <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center', overflow: 'hidden' }}>
                      <AnimatePresence mode="wait">
                        {!isPosExpanded ? (
                          <motion.button
                            key="collapsed-pos"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            onClick={() => setIsPosExpanded(true)}
                            className="glass-button"
                            style={{ 
                              padding: '0.25rem 0.65rem', borderRadius: '6px', fontSize: '0.75rem',
                              background: getModalColor() + '15',
                              color: getModalColor(),
                              borderColor: getModalColor() + '40',
                              cursor: 'pointer',
                              fontWeight: 800,
                              display: 'flex',
                              alignItems: 'center',
                              gap: '3px'
                            }}
                          >
                            <span>{activePos}</span>
                            <ChevronDown size={11} />
                          </motion.button>
                        ) : (
                          <motion.div
                            key="expanded-pos"
                            initial={{ opacity: 0, x: -10, width: 0 }}
                            animate={{ opacity: 1, x: 0, width: 'auto' }}
                            exit={{ opacity: 0, x: -10, width: 0 }}
                            style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }}
                          >
                            {posTypes.map(pos => (
                              <button 
                                key={pos}
                                onClick={() => {
                                  setActivePos(pos);
                                  setIsPosExpanded(false);
                                }}
                                className="glass-button"
                                style={{ 
                                  padding: '0.25rem 0.65rem', borderRadius: '6px', fontSize: '0.75rem', whiteSpace: 'nowrap',
                                  background: activePos === pos ? getModalColor() : 'rgba(255,255,255,0.03)',
                                  color: activePos === pos ? '#08090b' : 'var(--text-secondary)',
                                  borderColor: activePos === pos ? 'transparent' : 'rgba(255,255,255,0.1)',
                                  cursor: 'pointer',
                                  fontWeight: 800
                                }}
                              >
                                {pos}
                              </button>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                </div>
              </div>
            </div>

              <div 
                className="scrollable-content"
                onScroll={(e) => {
                  if (Object.keys(revealedThaiIds).length > 0) {
                    setRevealedThaiIds({});
                  }
                  
                  const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
                  if (scrollHeight - scrollTop - clientHeight < 100) {
                    setVisibleCount(prev => Math.min(modalList.length, prev + 50));
                  }
                }}
                style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}
              >
                <AnimatePresence>
                  {loadingCurriculumWords ? (
                    <motion.div
                      key="loading-curriculum"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      style={{ 
                        display: 'flex', 
                        flexDirection: 'column', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        padding: '4rem 1.5rem', 
                        gap: '1rem' 
                      }}
                    >
                      <div style={{ 
                        width: '36px', 
                        height: '36px', 
                        borderRadius: '50%', 
                        border: '3px solid rgba(255,255,255,0.08)', 
                        borderTopColor: getModalColor(), 
                        animation: 'spin 0.8s linear infinite' 
                      }} />
                      <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                        Loading vocabulary library...
                      </div>
                    </motion.div>
                  ) : modalList.length === 0 ? (
                    <motion.div 
                      key="no-words-found"
                      initial={{ opacity: 0, scale: 0.96 }} 
                      animate={{ opacity: 1, scale: 1 }} 
                      style={{ 
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '3.5rem 1.5rem',
                        color: 'var(--text-secondary)',
                        textAlign: 'center',
                        background: 'radial-gradient(circle at 50% 0%, rgba(255, 255, 255, 0.02) 0%, rgba(255, 255, 255, 0.0) 100%)',
                        border: '1.5px dashed rgba(255, 255, 255, 0.07)',
                        borderRadius: '24px',
                        marginTop: '1rem',
                        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.02)'
                      }}
                    >
                      <div style={{
                        width: '50px',
                        height: '50px',
                        borderRadius: '50%',
                        background: 'rgba(255, 255, 255, 0.02)',
                        border: '1px solid rgba(255, 255, 255, 0.06)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: '1rem',
                        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.3)'
                      }}>
                        <Search size={18} color="rgba(255, 255, 255, 0.4)" />
                      </div>
                      <h4 style={{ margin: '0 0 0.25rem 0', color: 'rgba(255, 255, 255, 0.85)', fontWeight: 800, fontSize: '0.9rem', letterSpacing: '-0.3px' }}>
                        No Words Found
                      </h4>
                      <p style={{ margin: 0, fontSize: '0.72rem', color: 'var(--text-secondary)', maxWidth: '240px', lineHeight: 1.5 }}>
                        There are no words matching your filters in this stage. Try changing POS or adding some new words to deck!
                      </p>
                    </motion.div>
                  ) : (
                    modalList.slice(0, visibleCount).map((item) => {
                      if (item.isWaiting) {
                        const isCurrentlyAdding = addingWordId === item.word;
                        return (
                          <motion.div 
                            key={item.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            style={{ width: '100%' }}
                          >
                            <div 
                              className="glass-panel"
                              style={{
                                padding: '1.0rem 1.2rem',
                                borderLeft: '4px dashed rgba(249, 115, 22, 0.4)',
                                background: 'rgba(249, 115, 22, 0.01)',
                                border: '1px solid rgba(255, 255, 255, 0.05)',
                                borderLeftWidth: '4px',
                                borderLeftStyle: 'dashed',
                                borderLeftColor: 'rgba(249, 115, 22, 0.4)',
                                borderRadius: '16px',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                gap: '1rem',
                                marginBottom: '0.75rem',
                                boxSizing: 'border-box'
                              }}
                            >
                              <div style={{ flex: 1 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
                                  <h3 style={{ margin: 0, fontSize: '1.15rem', color: 'rgba(255,255,255,0.7)', fontWeight: 800 }}>
                                    {item.word}
                                  </h3>
                                  <span style={{ fontSize: '0.65rem', background: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)', padding: '0.08rem 0.35rem', borderRadius: '4px' }}>
                                    {item.pos}
                                  </span>
                                  <span style={{ fontSize: '0.55rem', background: 'rgba(249, 115, 22, 0.1)', color: '#f97316', border: '1px solid rgba(249, 115, 22, 0.2)', padding: '0.05rem 0.25rem', borderRadius: '4px', fontWeight: 800, textTransform: 'uppercase' }}>
                                    {item.srsLevel}
                                  </span>
                                </div>
                                <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                                  Click '+' to import and learn this word
                                </div>
                              </div>

                              <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleSpeak(item.word);
                                  }}
                                  style={{
                                    background: 'rgba(255, 255, 255, 0.04)',
                                    border: '1px solid rgba(255, 255, 255, 0.08)',
                                    color: 'rgba(255, 255, 255, 0.6)',
                                    cursor: 'pointer',
                                    padding: '8px',
                                    borderRadius: '50%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    transition: 'all 0.2s',
                                    outline: 'none'
                                  }}
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.color = '#ffffff';
                                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.color = 'rgba(255, 255, 255, 0.6)';
                                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)';
                                  }}
                                >
                                  <Volume2 size={14} />
                                </button>

                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (!isCurrentlyAdding) {
                                      handleAddWaitingWord(item.word);
                                    }
                                  }}
                                  disabled={isCurrentlyAdding}
                                  style={{
                                    background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
                                    border: 'none',
                                    color: 'white',
                                    cursor: isCurrentlyAdding ? 'default' : 'pointer',
                                    padding: '8px',
                                    borderRadius: '50%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    boxShadow: '0 4px 12px rgba(249, 115, 22, 0.3)',
                                    transition: 'all 0.2s',
                                    outline: 'none'
                                  }}
                                  onMouseEnter={(e) => {
                                    if (!isCurrentlyAdding) {
                                      e.currentTarget.style.boxShadow = '0 6px 16px rgba(249, 115, 22, 0.45)';
                                      e.currentTarget.style.transform = 'scale(1.05)';
                                    }
                                  }}
                                  onMouseLeave={(e) => {
                                    if (!isCurrentlyAdding) {
                                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(249, 115, 22, 0.3)';
                                      e.currentTarget.style.transform = 'none';
                                    }
                                  }}
                                >
                                  {isCurrentlyAdding ? (
                                    <Loader2 size={14} className="spin" />
                                  ) : (
                                    <Plus size={14} />
                                  )}
                                </button>
                              </div>
                            </div>
                          </motion.div>
                        );
                      }

                      let phrase = '';
                      let phraseMeaning = '';
                      let definition = '';
                      let parsedMeaning = null;

                      if (item.meaning) {
                        if (typeof item.meaning === 'object') {
                          parsedMeaning = item.meaning;
                        } else if (typeof item.meaning === 'string') {
                          if (item.meaning.startsWith('{')) {
                            try {
                              parsedMeaning = JSON.parse(item.meaning);
                            } catch (e) {}
                          } else {
                            definition = item.meaning;
                          }
                        }
                      }

                      if (parsedMeaning) {
                        definition = parsedMeaning.englishExplanation?.definition || item.word;
                        phrase = parsedMeaning.englishExplanation?.phrase || '';
                        phraseMeaning = parsedMeaning.englishExplanation?.phraseMeaning || '';
                      } else {
                        definition = item.meaning || '';
                      }

                      const thaiTranslation = parsedMeaning?.thaiTranslation?.word || '';
                      const exampleSentence = item.example || parsedMeaning?.scenes?.[0]?.dialogue || '';
                      const exampleThai = parsedMeaning?.scenes?.[0]?.meaning || '';

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

                      const isFlipped = !!revealedThaiIds[item.id];
                      const srsColor = getWordSrsColor(item.srsLevel);

                      return (
                        <motion.div 
                          key={item.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          style={{ width: '100%' }}
                        >
                          <div className="flip-card-container" style={{ height: 'auto', flexShrink: 0, transition: 'height 0.6s cubic-bezier(0.4, 0, 0.2, 1)', marginBottom: '1rem' }}>
                            <div 
                              className={`flip-card-inner ${isFlipped ? 'flipped' : ''}`}
                              style={{ position: 'relative', width: '100%', transition: 'transform 0.6s cubic-bezier(0.4, 0, 0.2, 1)', transformStyle: 'preserve-3d', transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)' }}
                              onClick={() => {
                                setRevealedThaiIds(prev => ({
                                  ...prev,
                                  [item.id]: !prev[item.id]
                                }));
                              }}
                            >
                              
                              {/* FRONT SIDE (English) */}
                              <div 
                                className="glass-panel flip-card-front"
                                style={{
                                  padding: '1.2rem', 
                                  display: 'flex', flexDirection: 'column', gap: '0.8rem',
                                  borderLeft: `4px solid ${srsColor}`,
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
                                  <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                                      <h3 style={{ margin: 0, fontSize: '1.2rem', color: 'white', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 800 }}>
                                        {item.word}
                                        <span style={{ fontSize: '0.7rem', background: 'rgba(255,255,255,0.08)', color: 'var(--text-secondary)', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>{item.pos}</span>
                                      </h3>
                                      
                                      {/* Action Buttons */}
                                      <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
                                        <span style={{ 
                                          fontSize: '0.55rem', 
                                          padding: '0.22rem 0.5rem', 
                                          borderRadius: '8px', 
                                          background: 'rgba(255, 255, 255, 0.04)', 
                                          border: '1px solid rgba(255, 255, 255, 0.08)', 
                                          color: '#94a3b8', 
                                          fontWeight: 700,
                                          marginRight: '0.35rem'
                                        }}>
                                           {getNextReviewText(item.nextReviewDate)}
                                        </span>
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setPreviewWord(item);
                                            setPreviewShowThai(false);
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
                                            transition: 'color 0.2s, background 0.2s'
                                          }}
                                          onMouseEnter={(e) => {
                                            e.currentTarget.style.color = 'white';
                                            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
                                          }}
                                          onMouseLeave={(e) => {
                                            e.currentTarget.style.color = 'rgba(255, 255, 255, 0.45)';
                                            e.currentTarget.style.background = 'transparent';
                                          }}
                                          title="View full details"
                                        >
                                          <Eye size={15} />
                                        </button>

                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleSpeak(item.word);
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
                                            transition: 'color 0.2s, background 0.2s'
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
                                    </div>
                                    
                                    <div style={{ marginBottom: '0.45rem' }}>
                                      <span style={{ 
                                        fontSize: '0.7rem', 
                                        padding: '0.2rem 0.5rem', 
                                        borderRadius: '12px', 
                                        background: `${categoryColors[getCategory(item)] || '#3b82f6'}15`, 
                                        border: `1px solid ${categoryColors[getCategory(item)] || '#3b82f6'}30`, 
                                        color: categoryColors[getCategory(item)] || '#cbd5e1', 
                                        fontWeight: 700 
                                      }}>
                                         {getCategory(item)}
                                      </span>
                                    </div>

                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
                                      {/* Definition */}
                                      <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                                        {definition}
                                      </p>

                                      {/* Example Sentence */}
                                      <div>
                                        <span style={{ fontSize: '0.58rem', textTransform: 'uppercase', color: getModalColor() || '#8b5cf6', fontWeight: 800, letterSpacing: '0.5px', display: 'block', marginBottom: '0.15rem' }}>Example Sentence</span>
                                        <p style={{ margin: 0, fontSize: '0.82rem', color: 'white', fontWeight: 700, fontStyle: 'italic', lineHeight: '1.4' }}>
                                          "{exampleSentence || 'No example sentence available.'}"
                                        </p>
                                      </div>
                                    </div>
                                  </div>
                                  
                                  {/* Image Thumbnail Box */}
                                  {item.videoUrl && (
                                    <div style={{ width: '80px', height: '80px', borderRadius: '12px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.08)', flexShrink: 0, boxShadow: '0 4px 12px rgba(0,0,0,0.3)', alignSelf: 'center' }}>
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

                              {/* BACK SIDE (Thai) */}
                              <div 
                                className="glass-panel flip-card-back"
                                style={{
                                  padding: '1.2rem', 
                                  display: 'flex', flexDirection: 'column', gap: '0.8rem',
                                  borderLeft: `4px solid ${srsColor}`,
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
                                  <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                                      <h3 style={{ margin: 0, fontSize: '1.2rem', color: 'white', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 800 }}>
                                        {item.word}
                                        <span style={{ fontSize: '0.7rem', background: 'rgba(255,255,255,0.08)', color: 'var(--text-secondary)', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>{item.pos}</span>
                                      </h3>
                                      
                                      {/* Action Buttons */}
                                      <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setPreviewWord(item);
                                            setPreviewShowThai(false);
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
                                            transition: 'color 0.2s, background 0.2s'
                                          }}
                                          onMouseEnter={(e) => {
                                            e.currentTarget.style.color = 'white';
                                            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
                                          }}
                                          onMouseLeave={(e) => {
                                            e.currentTarget.style.color = 'rgba(255, 255, 255, 0.45)';
                                            e.currentTarget.style.background = 'transparent';
                                          }}
                                          title="View full details"
                                        >
                                          <Eye size={15} />
                                        </button>

                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleSpeak(item.word);
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
                                            transition: 'color 0.2s, background 0.2s'
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
                                    </div>
                                    
                                    <div style={{ marginBottom: '0.45rem' }}>
                                      <span style={{ 
                                        fontSize: '0.7rem', 
                                        padding: '0.2rem 0.5rem', 
                                        borderRadius: '12px', 
                                        background: `${categoryColors[getCategory(item)] || '#3b82f6'}15`, 
                                        border: `1px solid ${categoryColors[getCategory(item)] || '#3b82f6'}30`, 
                                        color: categoryColors[getCategory(item)] || '#cbd5e1', 
                                        fontWeight: 700 
                                      }}>
                                         {getCategory(item)}
                                      </span>
                                    </div>

                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginTop: '0.5rem' }}>
                                       <p style={{ margin: 0, fontSize: '1.05rem', color: '#facc15', fontWeight: 800, lineHeight: '1.3' }}>
                                         {thaiTranslation || 'ไม่มีคำแปลภาษาไทย'}
                                       </p>
                                       {exampleThai && (
                                         <p style={{ margin: 0, fontSize: '0.85rem', color: 'rgba(255,255,255,0.7)', fontWeight: 600, lineHeight: '1.3' }}>
                                           {highlightThaiTranslation(exampleThai, thaiTranslation)}
                                         </p>
                                       )}
                                     </div>
                                  </div>
                                  
                                  {/* Image Thumbnail Box */}
                                  {item.videoUrl && (
                                    <div style={{ width: '80px', height: '80px', borderRadius: '12px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.08)', flexShrink: 0, boxShadow: '0 4px 12px rgba(0,0,0,0.3)', alignSelf: 'center' }}>
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

                            </div>
                          </div>
                        </motion.div>
                      );
                    })
                  )}
                </AnimatePresence>
              </div>

            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Preview Word Detail Modal */}
      <AnimatePresence>
        {previewWord && (() => {
          const currentItem = vocab.find(w => w.id === previewWord.id) || previewWord;
          const url = currentItem.videoUrl || '';
          
          let parsedMeaning = null;
          let rawMeaningText = '';

          if (currentItem.meaning) {
            if (typeof currentItem.meaning === 'object') {
              parsedMeaning = currentItem.meaning;
            } else if (typeof currentItem.meaning === 'string') {
              if (currentItem.meaning.startsWith('{')) {
                try {
                  parsedMeaning = JSON.parse(currentItem.meaning);
                } catch (e) {}
              } else {
                rawMeaningText = currentItem.meaning;
              }
            }
          }

          const thaiWordTranslation = parsedMeaning?.thaiTranslation?.word || rawMeaningText || '';
          const englishExplanationText = parsedMeaning?.englishExplanation?.definition || '';
          const phraseText = parsedMeaning?.englishExplanation?.phrase || '';
          const phraseMeaningText = parsedMeaning?.englishExplanation?.phraseMeaning || '';

          return (
            <>
              <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                onClick={() => setPreviewWord(null)}
                style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 11000, backdropFilter: 'blur(8px)' }}
              />
              {/* Centering Wrapper */}
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
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.9, opacity: 0 }}
                  style={{
                    pointerEvents: 'auto',
                    width: '90%', maxWidth: '400px', background: '#08090b',
                    borderRadius: '24px', border: `1px solid ${getModalColor()}40`,
                    boxShadow: `0 20px 50px rgba(0,0,0,0.5), 0 0 30px ${getModalColor()}15`,
                    display: 'flex', flexDirection: 'column', overflow: 'hidden'
                  }}
                >
                {/* Header */}
                <div style={{ padding: '1.2rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.3rem', color: 'white', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 800 }}>
                      {currentItem.word}
                      <span style={{ fontSize: '0.75rem', background: `${getModalColor()}15`, color: getModalColor(), padding: '0.15rem 0.5rem', borderRadius: '6px', fontWeight: 800 }}>{currentItem.pos}</span>
                      <button
                        onClick={() => {
                          if (window.confirm(`ต้องการลบคำว่า "${currentItem.word}" ออกจาก Deck จริงๆ หรือไม่?`)) {
                            deleteWordFromDeck(currentItem.id);
                            setPreviewWord(null);
                          }
                        }}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: 'rgba(239, 68, 68, 0.45)',
                          cursor: 'pointer',
                          padding: '4px',
                          borderRadius: '6px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          marginLeft: '0.4rem',
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
                    </h3>
                  </div>
                  <button onClick={() => setPreviewWord(null)} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                    <X size={22} />
                  </button>
                </div>

                {/* Content */}
                <div style={{ padding: '1.1rem', display: 'flex', flexDirection: 'column', gap: '0.8rem', alignItems: 'center', overflowY: 'auto', maxHeight: '65vh' }}>
                  {/* Photo Container — Shrunk from 220px to 160px for compact layout */}
                  <div style={{ width: '100%', height: '160px', borderRadius: '16px', background: '#0b0c10', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', position: 'relative', border: '1px solid rgba(255,255,255,0.05)', flexShrink: 0 }}>
                    {url ? (
                      <img 
                        src={url} 
                        alt={currentItem.word}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    ) : (
                      <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>No photo available</div>
                    )}
                  </div>

                  {/* Definitions & Details — Elevated to the top directly under the image */}
                  <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '0.65rem', textAlign: 'left' }}>
                    {englishExplanationText && (
                      <div>
                        <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>ENGLISH DEFINITION</div>
                        <div style={{ fontSize: '1.15rem', color: 'white', fontWeight: 850, lineHeight: '1.45', marginTop: '0.2rem' }}>{englishExplanationText}</div>
                      </div>
                    )}

                    {phraseText && (
                      <div>
                        <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>COMMON phrase</div>
                        <div style={{ fontSize: '0.9rem', color: 'white', fontWeight: 700, marginTop: '0.2rem' }}>{phraseText}</div>
                        {phraseMeaningText && <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.1rem' }}>{phraseMeaningText}</div>}
                      </div>
                    )}
                    
                    {currentItem.example && (
                      <div>
                        <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>EXAMPLE</div>
                        <div style={{ fontSize: '0.95rem', color: getModalColor(), fontWeight: 800, fontStyle: 'italic', lineHeight: '1.45', marginTop: '0.2rem', textShadow: `0 0 10px ${getModalColor()}30` }}>"{currentItem.example}"</div>
                      </div>
                    )}

                    {parsedMeaning?.takeaway && (
                      <div style={{ width: '100%', background: 'rgba(16,185,129,0.02)', border: '1px solid rgba(16,185,129,0.12)', padding: '0.55rem 0.75rem', borderRadius: '12px', boxSizing: 'border-box' }}>
                        <span style={{ fontSize: '0.55rem', textTransform: 'uppercase', color: '#34d399', fontWeight: 800, display: 'block', marginBottom: '0.1rem' }}>
                          Key Takeaway
                        </span>
                        <p style={{ margin: 0, fontSize: '0.78rem', color: 'rgba(255,255,255,0.85)', lineHeight: 1.3 }}>{parsedMeaning.takeaway}</p>
                      </div>
                    )}

                    {(() => {
                      let verbForms = parsedMeaning?.verbForms;
                      if (!verbForms) {
                        verbForms = getVerbForms(currentItem.word, currentItem.pos);
                      }
                      if (!verbForms || !Array.isArray(verbForms) || verbForms.length < 3) return null;
                      const [v1, v2, v3] = verbForms;
                      return (
                        <div style={{ width: '100%', background: 'rgba(255, 255, 255, 0.012)', border: '1px solid rgba(255, 255, 255, 0.08)', padding: '0.65rem 0.85rem', borderRadius: '12px', boxSizing: 'border-box' }}>
                          <span style={{ fontSize: '0.55rem', textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: 800, display: 'block', letterSpacing: '0.5px', marginBottom: '0.35rem' }}>
                            Verb Forms (Tenses)
                          </span>
                          <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', fontSize: '0.78rem' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1 }}>
                              <span style={{ fontSize: '0.55rem', textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: 800, letterSpacing: '0.2px' }}>V1</span>
                              <span style={{ color: 'white', fontWeight: 900, fontSize: '1.05rem' }}>{v1}</span>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1, alignItems: 'center' }}>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', alignItems: 'flex-start' }}>
                                <span style={{ fontSize: '0.55rem', textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: 800, letterSpacing: '0.2px' }}>V2</span>
                                <span style={{ color: 'white', fontWeight: 900, fontSize: '1.05rem' }}>{v2}</span>
                              </div>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1, alignItems: 'flex-end' }}>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', alignItems: 'flex-start' }}>
                                <span style={{ fontSize: '0.55rem', textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: 800, letterSpacing: '0.2px' }}>V3</span>
                                <span style={{ color: 'white', fontWeight: 900, fontSize: '1.05rem' }}>{v3}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })()}

                    {previewShowThai ? (
                      <div style={{ 
                        width: '100%',
                        marginTop: '0.4rem', 
                        paddingTop: '0.6rem', 
                        borderTop: '1px solid rgba(255,255,255,0.06)' 
                      }}>
                        <div style={{ fontSize: '0.58rem', color: 'rgba(255,255,255,0.25)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>THAI TRANSLATION</div>
                        <div style={{ fontSize: '0.78rem', color: '#10b981', fontWeight: 700, marginTop: '0.15rem' }}>{thaiWordTranslation}</div>
                      </div>
                    ) : (
                      <div 
                        onClick={() => setPreviewShowThai(true)}
                        style={{ 
                          width: '100%',
                          marginTop: '0.6rem', 
                          padding: '0.5rem',
                          borderRadius: '8px',
                          background: 'rgba(255,255,255,0.02)',
                          border: '1px dashed rgba(255,255,255,0.1)',
                          textAlign: 'center',
                          cursor: 'pointer',
                          color: 'rgba(255,255,255,0.4)',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          transition: 'background 0.2s'
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.02)'; }}
                      >
                        Tap to reveal Thai Translation
                      </div>
                    )}

                    {/* Move POS & Category select dropdowns here at the very bottom, small */}
                    <div style={{ 
                      marginTop: '0.65rem', 
                      paddingTop: '0.65rem', 
                      borderTop: '1px solid rgba(255,255,255,0.06)',
                      display: 'flex', 
                      gap: '0.75rem',
                      width: '100%' 
                    }}>
                      <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <span style={{ fontSize: '0.6rem', color: 'var(--text-secondary)', fontWeight: 800, textTransform: 'uppercase' }}>POS</span>
                        <select
                          value={currentItem.pos || 'noun'}
                          onChange={(e) => updateWordProperties(currentItem.id, { pos: e.target.value })}
                          style={{
                            flex: 1,
                            padding: '0.25rem 0.4rem',
                            borderRadius: '6px',
                            background: 'rgba(255,255,255,0.04)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            color: 'white',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            outline: 'none',
                            cursor: 'pointer'
                          }}
                        >
                          {['noun', 'verb', 'adjective', 'adverb', 'phrase', 'preposition', 'conjunction'].map(p => (
                            <option key={p} value={p} style={{ background: '#08090b', color: 'white' }}>{p}</option>
                          ))}
                        </select>
                      </div>
                      
                      <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <span style={{ fontSize: '0.6rem', color: 'var(--text-secondary)', fontWeight: 800, textTransform: 'uppercase' }}>Category</span>
                        <select
                          value={getCategory(currentItem)}
                          onChange={(e) => updateWordProperties(currentItem.id, { category: e.target.value })}
                          style={{
                            flex: 1,
                            padding: '0.25rem 0.4rem',
                            borderRadius: '6px',
                            background: 'rgba(255,255,255,0.04)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            color: 'white',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            outline: 'none',
                            cursor: 'pointer'
                          }}
                        >
                          {['Daily Life', 'Business', 'Academic'].map(c => (
                            <option key={c} value={c} style={{ background: '#08090b', color: 'white' }}>{c}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer Speaker Controls */}
                <div style={{ padding: '1rem 1.5rem', background: 'rgba(255,255,255,0.02)', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'center' }}>
                  <button 
                    onClick={() => handleSpeak(currentItem.word)}
                    className="glass-button" 
                    style={{ 
                      width: '100%', 
                      padding: '0.65rem', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      gap: '0.4rem', 
                      borderRadius: '12px',
                      background: `linear-gradient(135deg, #ffffff 0%, ${getModalColor()} 100%)`,
                      border: `1px solid rgba(255,255,255,0.2)`,
                      color: '#08090b',
                      fontWeight: 800,
                      cursor: 'pointer'
                    }}
                  >
                    <Volume2 size={16} />
                    <span>Pronounce Word</span>
                  </button>
                </div>
              </motion.div>
              </div>
            </>
          );
        })()}
      </AnimatePresence>

      {/* Curriculum Modal */}
      {renderCurriculumModal()}

    </div>
  );
};

export default Profile;
