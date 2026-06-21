import { BrowserRouter, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { useEffect, useState, useRef } from 'react';
import { Menu, X, Sparkles, CheckSquare, User, LogOut, Bell, Sliders, Volume2, Plus, XCircle, Palette, Trash2, HelpCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { VocabProvider, useVocab } from './context/VocabContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { useTheme } from './context/ThemeContext';
import ThemeBackground from './components/ThemeBackground';
import AddWord from './pages/AddWord';
import Purge from './pages/Purge';
import Login from './pages/Login';
import Profile from './pages/Profile';
import { playClickSound, playSwipeSound } from './utils/soundHelper';
import { Tutorial } from './components/Tutorial';

function AppContent() {
  const { user, signOut } = useAuth();
  const { vocab, streak, clearDeckAndResetStats } = useVocab();
  const { theme, setTheme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  // Global Selection Dictionary Lookup
  const { addWordToDeck, getAiWordRichDetails } = useVocab();
  const [selectedWord, setSelectedWord] = useState('');
  const [wordDetails, setWordDetails] = useState(null);
  const [selectionRect, setSelectionRect] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [popupVisible, setPopupVisible] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [addSuccess, setAddSuccess] = useState(false);
  
  const ignoreSelectionChangeRef = useRef(false);

  useEffect(() => {
    const handleSelectionChange = () => {
      if (location.pathname !== '/purge') return;
      try {
        if (localStorage.getItem('memeng_is_studying') !== 'true') return;
      } catch (e) {
        return;
      }
      if (ignoreSelectionChangeRef.current) return;
      
      const selection = window.getSelection();
      const text = selection.toString().trim();
      
      if (text && /^[a-zA-Z\s\-']{2,30}$/.test(text) && !/[\u0e00-\u0e7f]/.test(text)) {
        try {
          const range = selection.getRangeAt(0);
          const rect = range.getBoundingClientRect();
          if (rect.width > 0 && rect.height > 0) {
            setSelectionRect({
              top: rect.top + window.scrollY,
              left: rect.left + window.scrollX,
              width: rect.width,
              height: rect.height
            });
            setSelectedWord(text);
            setWordDetails(null);
          }
        } catch (e) {}
      } else {
        if (!text) {
          setSelectedWord('');
          setPopupVisible(false);
        }
      }
    };

    document.addEventListener('selectionchange', handleSelectionChange);
    return () => {
      document.removeEventListener('selectionchange', handleSelectionChange);
    };
  }, []);

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (e.target.closest('#global-lookup-popup')) {
        return;
      }
      setSelectedWord('');
      setPopupVisible(false);
    };

    window.addEventListener('mousedown', handleOutsideClick);
    window.addEventListener('touchstart', handleOutsideClick);
    return () => {
      window.removeEventListener('mousedown', handleOutsideClick);
      window.removeEventListener('touchstart', handleOutsideClick);
    };
  }, []);

  useEffect(() => {
    if (!selectedWord) {
      setPopupVisible(false);
      return;
    }

    const timer = setTimeout(async () => {
      setLoadingDetails(true);
      setPopupVisible(true);
      try {
        const details = await getAiWordRichDetails(selectedWord);
        if (details && !details.error) {
          setWordDetails(details);
        } else {
          setWordDetails({
            word: selectedWord,
            pos: 'n.',
            englishExplanation: { definition: 'Could not find definition.' },
            thaiTranslation: { word: 'ไม่พบความหมาย' }
          });
        }
      } catch (err) {
        console.error("Failed looking up selected word", err);
      } finally {
        setLoadingDetails(false);
      }
    }, 450);

    return () => clearTimeout(timer);
  }, [selectedWord]);

  const handlePopupMouseDown = () => {
    ignoreSelectionChangeRef.current = true;
  };

  const handlePopupMouseUp = () => {
    setTimeout(() => {
      ignoreSelectionChangeRef.current = false;
    }, 100);
  };

  const [showBottomNav, setShowBottomNav] = useState(() => {
    try {
      return localStorage.getItem('chatgpt_anki_show_bottom_nav') !== 'false';
    } catch (e) {
      return true;
    }
  });
  const [reminderTime, setReminderTime] = useState(() => {
    try {
      return localStorage.getItem('chatgpt_anki_reminder') || '20:00';
    } catch (e) {
      return '20:00';
    }
  });

  const [dragStart, setDragStart] = useState(null);
  const [swipeDirection, setSwipeDirection] = useState(null);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const minSwipeDistance = 60;

  const getDragStart = (x, y, target) => {
    if (
      target.closest('.snap-card') || 
      target.closest('button') || 
      target.closest('input') || 
      target.closest('textarea') || 
      target.closest('img') || 
      target.closest('label') || 
      target.closest('[drag]') ||
      target.closest('#global-lookup-popup')
    ) {
      return null;
    }
    return { x, y };
  };

  const handleDragMove = (x, y) => {
    if (!dragStart) return;
    const dx = x - dragStart.x;
    const dy = y - dragStart.y;

    if (!swipeDirection) {
      const absX = Math.abs(dx);
      const absY = Math.abs(dy);
      if (absX > 10 || absY > 10) {
        if (absX > absY) {
          setSwipeDirection('horizontal');
          setIsSwiping(true);
        } else {
          setSwipeDirection('vertical');
        }
      }
    } else if (swipeDirection === 'horizontal') {
      setSwipeOffset(dx);
    }
  };

  const handleDragEnd = () => {
    if (dragStart && swipeDirection === 'horizontal') {
      const routes = ['/', '/purge', '/profile'];
      const currentIdx = routes.indexOf(location.pathname);
      
      if (currentIdx !== -1) {
        if (swipeOffset < -minSwipeDistance && currentIdx < routes.length - 1) {
          playSwipeSound();
          navigate(routes[currentIdx + 1]);
        } else if (swipeOffset > minSwipeDistance && currentIdx > 0) {
          playSwipeSound();
          navigate(routes[currentIdx - 1]);
        }
      }
    }
    setDragStart(null);
    setSwipeDirection(null);
    setSwipeOffset(0);
    setIsSwiping(false);
  };

  const onMouseDown = (e) => {
    const start = getDragStart(e.clientX, e.clientY, e.target);
    if (start) {
      setDragStart(start);
    }
  };

  const onMouseMove = (e) => {
    if (!dragStart) return;
    handleDragMove(e.clientX, e.clientY);
  };

  const onMouseUp = () => {
    handleDragEnd();
  };

  const onTouchStart = (e) => {
    const touch = e.targetTouches[0];
    const start = getDragStart(touch.clientX, touch.clientY, e.target);
    if (start) {
      setDragStart(start);
    }
  };

  const onTouchMove = (e) => {
    if (!dragStart) return;
    const touch = e.targetTouches[0];
    handleDragMove(touch.clientX, touch.clientY);
    
    if (swipeDirection === 'horizontal') {
      if (e.cancelable) e.preventDefault();
    }
  };

  const onTouchEnd = () => {
    handleDragEnd();
  };

  useEffect(() => {
    const handleDocumentClick = (e) => {
      if (location.pathname !== '/purge') return;
      try {
        if (localStorage.getItem('memeng_is_studying') !== 'true') return;
      } catch (e) {
        return;
      }
      if (
        e.target.closest('#global-lookup-popup') || 
        e.target.closest('button') || 
        e.target.closest('input') || 
        e.target.closest('textarea') ||
        e.target.closest('.badge-neon') ||
        e.target.closest('.badge-cyan') ||
        e.target.closest('.glass-button') ||
        e.target.closest('a')
      ) {
        return;
      }

      let range, textNode, offset;
      if (document.caretRangeFromPoint) {
        range = document.caretRangeFromPoint(e.clientX, e.clientY);
        if (range) {
          textNode = range.startContainer;
          offset = range.startOffset;
        }
      }

      if (textNode && textNode.nodeType === Node.TEXT_NODE) {
        const text = textNode.textContent;
        const leftMatch = text.substring(0, offset).match(/[a-zA-Z'\-]+$/);
        const rightMatch = text.substring(offset).match(/^[a-zA-Z'\-]+/);

        const leftWord = leftMatch ? leftMatch[0] : '';
        const rightWord = rightMatch ? rightMatch[0] : '';
        const clickedWord = (leftWord + rightWord).trim();

        if (clickedWord && clickedWord.length >= 2 && clickedWord.length <= 30) {
          const newRange = document.createRange();
          const startPos = offset - leftWord.length;
          const endPos = offset + rightWord.length;
          try {
            newRange.setStart(textNode, startPos);
            newRange.setEnd(textNode, endPos);
            const selection = window.getSelection();
            selection.removeAllRanges();
            selection.addRange(newRange);

            const rect = newRange.getBoundingClientRect();
            setSelectionRect({
              top: rect.top + window.scrollY,
              left: rect.left + window.scrollX,
              width: rect.width,
              height: rect.height
            });
            setSelectedWord(clickedWord);
          } catch (err) {}
        }
      }
    };

    document.addEventListener('click', handleDocumentClick);
    return () => {
      document.removeEventListener('click', handleDocumentClick);
    };
  }, []);

  // Theme is managed globally by ThemeContext now

  // Auto-close menu on location change
  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  // Redirect to login if user is not authenticated
  useEffect(() => {
    if (!user && location.pathname !== '/login') {
      navigate('/login');
    }
  }, [user, location.pathname, navigate]);

  const dueToday = vocab.filter(
    w => w.srsLevel !== 'Mastered' && new Date(w.nextReviewDate) <= new Date()
  ).length;

  const showMenuButton = user && location.pathname !== '/login';

  const navItems = [
    {
      path: '/',
      label: 'Translate',
      description: 'Translate and add words using AI',
      icon: Sparkles
    },
    {
      path: '/purge',
      label: 'Flashcards',
      description: 'Review due cards with FSRS model',
      icon: CheckSquare,
      badge: dueToday
    },
    {
      path: '/profile',
      label: 'My Profile',
      description: 'Track stats, levels, and word log',
      icon: User
    }
  ];

  const handleNavigation = (path) => {
    setMenuOpen(false);
    navigate(path);
  };

  const handleLogout = async () => {
    setMenuOpen(false);
    await signOut();
    navigate('/login');
  };

  // Menu Animation Variants
  const overlayVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { duration: 0.25, ease: 'easeOut' }
    },
    exit: { 
      opacity: 0,
      transition: { duration: 0.2, ease: 'easeIn', delay: 0.1 }
    }
  };

  const containerVariants = {
    hidden: { opacity: 0, scale: 0.96 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: {
        staggerChildren: 0.06,
        delayChildren: 0.05
      }
    },
    exit: {
      opacity: 0,
      scale: 0.96,
      transition: { duration: 0.15 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    visible: { 
      opacity: 1, 
      y: 0, 
      transition: { type: 'spring', stiffness: 300, damping: 24 } 
    }
  };

  const isTabRoute = location.pathname === '/' || location.pathname === '/purge' || location.pathname === '/profile';
  const currentIdx = ['/', '/purge', '/profile'].indexOf(location.pathname);
  
  const getEffectiveSwipeOffset = () => {
    if (currentIdx === -1) return 0;
    if (currentIdx === 0 && swipeOffset > 0) {
      return swipeOffset * 0.25;
    }
    if (currentIdx === 2 && swipeOffset < 0) {
      return swipeOffset * 0.25;
    }
    return swipeOffset * 0.85;
  };
  const effectiveSwipeOffset = getEffectiveSwipeOffset();

  return (
    <div 
      className="app-container"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={() => { setDragStart(null); setSwipeDirection(null); setSwipeOffset(0); setIsSwiping(false); }}
      style={{
        userSelect: isSwiping ? 'none' : 'auto',
        WebkitUserSelect: isSwiping ? 'none' : 'auto',
        MozUserSelect: isSwiping ? 'none' : 'auto',
        msUserSelect: isSwiping ? 'none' : 'auto'
      }}
    >
      <ThemeBackground />

      {/* Visual Tinder Swipe Stamps */}
      {(() => {
        if (Math.abs(swipeOffset) < 20) return null;
        
        const routes = ['/', '/purge', '/profile'];
        const currentIdx = routes.indexOf(location.pathname);
        if (currentIdx === -1) return null;
        
        const opacity = Math.min(1, (Math.abs(swipeOffset) - 20) / 80);
        
        if (swipeOffset < 0 && currentIdx < routes.length - 1) {
          const nextRoute = routes[currentIdx + 1];
          const text = nextRoute === '/purge' ? 'FLASHCARDS' : 'PROFILE';
          const color = nextRoute === '/purge' ? '#eab308' : '#06b6d4';
          return (
            <div
              style={{
                position: 'fixed',
                top: '50%',
                right: '30px',
                transform: 'translateY(-50%) rotate(15deg)',
                border: `3px solid ${color}`,
                borderRadius: '10px',
                padding: '0.5rem 1rem',
                color: color,
                fontWeight: 900,
                fontSize: '1.2rem',
                background: 'rgba(10,8,20,0.85)',
                boxShadow: `0 8px 25px ${color}35`,
                zIndex: 99999,
                opacity: opacity,
                pointerEvents: 'none',
                letterSpacing: '1px'
              }}
            >
              {text} →
            </div>
          );
        } else if (swipeOffset > 0 && currentIdx > 0) {
          const prevRoute = routes[currentIdx - 1];
          const text = prevRoute === '/' ? 'TRANSLATE' : 'FLASHCARDS';
          const color = prevRoute === '/' ? '#a78bfa' : '#eab308';
          return (
            <div
              style={{
                position: 'fixed',
                top: '50%',
                left: '30px',
                transform: 'translateY(-50%) rotate(-15deg)',
                border: `3px solid ${color}`,
                borderRadius: '10px',
                padding: '0.5rem 1rem',
                color: color,
                fontWeight: 900,
                fontSize: '1.2rem',
                background: 'rgba(10,8,20,0.85)',
                boxShadow: `0 8px 25px ${color}35`,
                zIndex: 99999,
                opacity: opacity,
                pointerEvents: 'none',
                letterSpacing: '1px'
              }}
            >
              ← {text}
            </div>
          );
        }
        return null;
      })()}

      {isTabRoute ? (
        <div style={{
          flex: 1,
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          position: 'relative'
        }}>
          <div
            style={{
              display: 'flex',
              width: '300%',
              height: '100%',
              transform: `translate3d(calc(-${(currentIdx * 100) / 3}% + ${effectiveSwipeOffset}px), 0, 0)`,
              transition: isSwiping ? 'none' : 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)'
            }}
          >
            <div style={{ width: '33.333%', flexShrink: 0, height: '100%', display: 'flex', flexDirection: 'column', position: 'relative' }}>
              <AddWord />
            </div>
            <div style={{ width: '33.333%', flexShrink: 0, height: '100%', display: 'flex', flexDirection: 'column', position: 'relative' }}>
              <Purge />
            </div>
            <div style={{ width: '33.333%', flexShrink: 0, height: '100%', display: 'flex', flexDirection: 'column', position: 'relative' }}>
              <Profile />
            </div>
          </div>
        </div>
      ) : (
        <div style={{ flex: 1, width: '100%', display: 'flex', flexDirection: 'column' }}>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="*" element={<AddWord />} />
          </Routes>
        </div>
      )}

      {/* Floating Translucent Silver Bottom Nav Dock */}
      {showBottomNav && user && location.pathname !== '/login' && (
        <div 
          className="bottom-nav-dock"
          style={{
            position: 'fixed',
            bottom: '16px',
            left: '50%',
            transform: 'translateX(-50%)',
            width: 'calc(100% - 32px)',
            maxWidth: '400px',
            height: '56px',
            background: theme === 'theme-3' ? '#ffffff' : 'rgba(255, 255, 255, 0.03)',
            backdropFilter: theme === 'theme-3' ? 'none' : 'blur(20px)',
            WebkitBackdropFilter: theme === 'theme-3' ? 'none' : 'blur(20px)',
            border: theme === 'theme-3' ? '1px solid #000000' : '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: theme === 'theme-3' ? '0px' : '20px',
            display: 'flex',
            justifyContent: 'space-around',
            alignItems: 'center',
            padding: '0 8px',
            boxSizing: 'border-box',
            zIndex: 9999,
            boxShadow: theme === 'theme-3' ? 'none' : '0 8px 32px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
            transition: 'all 0.3s ease'
          }}
        >
          {navItems.map((item) => {
            const IconComponent = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <button
                key={item.path}
                onClick={() => {
                  playClickSound();
                  navigate(item.path);
                }}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '4px',
                  background: 'transparent',
                  border: 'none',
                  color: theme === 'theme-3' 
                    ? (isActive ? '#000000' : '#888888') 
                    : (isActive ? '#ffffff' : '#94a3b8'),
                  cursor: 'pointer',
                  padding: '6px 12px',
                  borderRadius: theme === 'theme-3' ? '0px' : '12px',
                  position: 'relative',
                  transition: 'all 0.2s ease',
                  outline: 'none'
                }}
              >
                <IconComponent size={18} color={theme === 'theme-3' ? (isActive ? '#000000' : '#888888') : (isActive ? '#ffffff' : '#94a3b8')} />
                <span style={{ fontSize: '0.65rem', fontWeight: isActive ? 800 : 500 }}>{item.label}</span>
                {item.badge !== undefined && item.badge > 0 && (
                  <span style={{
                    position: 'absolute',
                    top: '2px',
                    right: '8px',
                    background: '#ef4444',
                    color: 'white',
                    fontSize: '0.55rem',
                    fontWeight: 900,
                    borderRadius: '50%',
                    width: '14px',
                    height: '14px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 0 6px rgba(239, 68, 68, 0.65)'
                  }}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Global Dictionary Lookup Tooltip */}
      <AnimatePresence>
        {popupVisible && selectedWord && (
          <motion.div
            id="global-lookup-popup"
            initial={{ opacity: 0, scale: 0.9, y: 5 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 5 }}
            transition={{ duration: 0.18 }}
            onMouseDown={handlePopupMouseDown}
            onMouseUp={handlePopupMouseUp}
            onTouchStart={handlePopupMouseDown}
            onTouchEnd={handlePopupMouseUp}
            style={{
              position: 'absolute',
              top: `${selectionRect ? (selectionRect.top - 145 < 10 ? selectionRect.top + selectionRect.height + 10 : selectionRect.top - 145) : 0}px`,
              left: `${selectionRect ? Math.max(10, Math.min(window.innerWidth - 258, selectionRect.left + (selectionRect.width / 2) - 124)) : 10}px`,
              width: '248px',
              background: 'rgba(17, 20, 28, 0.85)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              borderRadius: '16px',
              padding: '0.85rem',
              boxShadow: '0 12px 36px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
              zIndex: 99999,
              display: 'flex',
              flexDirection: 'column',
              gap: '0.55rem',
              fontSize: '0.8rem',
              color: '#f8fafc',
              userSelect: 'text'
            }}
          >
            {loadingDetails ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '1rem', gap: '0.5rem' }}>
                <div style={{ width: '20px', height: '20px', borderRadius: '50%', border: '2px solid rgba(234, 179, 8, 0.1)', borderTopColor: '#eab308', animation: 'spin 0.8s linear infinite' }} />
                <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)', fontWeight: 600 }}>Looking up "{selectedWord}"…</span>
              </div>
            ) : (
              <>
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.25rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', overflow: 'hidden' }}>
                    <span style={{ fontWeight: 800, fontSize: '0.95rem', color: 'white', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '120px' }} title={wordDetails?.word || selectedWord}>
                      {wordDetails?.word || selectedWord}
                    </span>
                    {wordDetails?.pos && (
                      <span style={{ fontSize: '0.55rem', background: 'rgba(167, 139, 250, 0.15)', color: '#a78bfa', border: '1px solid rgba(167, 139, 250, 0.25)', padding: '0.05rem 0.25rem', borderRadius: '4px', fontWeight: 800, textTransform: 'uppercase' }}>
                        {wordDetails.pos}
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!selectedWord || !window.speechSynthesis) return;
                        window.speechSynthesis.cancel();
                        const utterance = new SpeechSynthesisUtterance(selectedWord);
                        utterance.lang = 'en-US';
                        window.speechSynthesis.speak(utterance);
                      }}
                      style={{
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        color: 'rgba(255,255,255,0.8)',
                        cursor: 'pointer',
                        padding: '4px',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        outline: 'none'
                      }}
                      title="Speak"
                    >
                      <Volume2 size={12} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedWord('');
                        setPopupVisible(false);
                      }}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'rgba(255,255,255,0.4)',
                        cursor: 'pointer',
                        padding: '2px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      <X size={14} />
                    </button>
                  </div>
                </div>

                {/* Meanings */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <div style={{ color: 'rgba(255, 255, 255, 0.85)', fontSize: '0.72rem', lineHeight: '1.25' }}>
                    {wordDetails?.englishExplanation?.definition || 'No explanation found.'}
                  </div>
                  {wordDetails?.thaiTranslation?.word && (
                    <div style={{ color: '#eab308', fontSize: '0.72rem', fontWeight: 700, borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '0.25rem', marginTop: '0.1rem' }}>
                      แปล: {wordDetails.thaiTranslation.word}
                    </div>
                  )}
                </div>

                {/* Add to Deck button */}
                <button
                  onClick={async (e) => {
                    e.stopPropagation();
                    const isInDeck = vocab.some(v => v.word.toLowerCase() === selectedWord.toLowerCase());
                    if (isInDeck) return;
                    setIsAdding(true);
                    try {
                      const res = await addWordToDeck(wordDetails?.word || selectedWord, wordDetails);
                      if (res.success) {
                        setAddSuccess(true);
                        setTimeout(() => {
                          setAddSuccess(false);
                          window.getSelection().removeAllRanges();
                          setSelectedWord('');
                          setPopupVisible(false);
                        }, 1200);
                      } else {
                        alert(res.error || 'Failed to add word');
                      }
                    } catch (err) {
                      console.error(err);
                    } finally {
                      setIsAdding(false);
                    }
                  }}
                  disabled={isAdding || addSuccess || vocab.some(v => v.word.toLowerCase() === selectedWord.toLowerCase())}
                  style={{
                    width: '100%',
                    padding: '0.4rem 0.5rem',
                    borderRadius: '8px',
                    fontSize: '0.68rem',
                    fontWeight: 800,
                    cursor: vocab.some(v => v.word.toLowerCase() === selectedWord.toLowerCase()) ? 'default' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.25rem',
                    outline: 'none',
                    border: '1px solid',
                    borderColor: vocab.some(v => v.word.toLowerCase() === selectedWord.toLowerCase()) 
                      ? 'rgba(255,255,255,0.1)' 
                      : addSuccess 
                        ? 'rgba(16, 185, 129, 0.35)' 
                        : 'rgba(234, 179, 8, 0.35)',
                    background: vocab.some(v => v.word.toLowerCase() === selectedWord.toLowerCase()) 
                      ? 'rgba(255,255,255,0.02)' 
                      : addSuccess 
                        ? 'rgba(16, 185, 129, 0.15)' 
                        : 'rgba(234, 179, 8, 0.15)',
                    color: vocab.some(v => v.word.toLowerCase() === selectedWord.toLowerCase()) 
                      ? 'rgba(255,255,255,0.4)' 
                      : addSuccess 
                        ? '#10b981' 
                        : '#eab308',
                    transition: 'all 0.2s ease',
                    marginTop: '0.2rem'
                  }}
                >
                  {isAdding ? (
                    <>
                      <div style={{ width: '12px', height: '12px', borderRadius: '50%', border: '2px solid rgba(255,255,255,0.1)', borderTopColor: 'currentColor', animation: 'spin 0.8s linear infinite' }} />
                      <span>Saving...</span>
                    </>
                  ) : addSuccess ? (
                    <span>Added to Deck!</span>
                  ) : vocab.some(v => v.word.toLowerCase() === selectedWord.toLowerCase()) ? (
                    <span>In Deck</span>
                  ) : (
                    <>
                      <Plus size={12} />
                      <span>Add to Deck</span>
                    </>
                  )}
                </button>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Hamburger Toggle Button & Overlay Navigation Drawer placed at the bottom to stay on top of translate3d pages */}
      <AnimatePresence>
        {showMenuButton && (
          <motion.button
            key="hamburger-button"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.92 }}
            onClick={() => setMenuOpen(!menuOpen)}
            style={{
              position: 'absolute',
              top: '18px',
              right: '18px',
              width: '44px',
              height: '44px',
              borderRadius: theme === 'theme-3' ? '0px' : '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: theme === 'theme-3' 
                ? '#ffffff' 
                : 'rgba(255, 255, 255, 0.02)',
              border: theme === 'theme-3' 
                ? '1px solid #000000' 
                : '1px solid rgba(255, 255, 255, 0.08)',
              backdropFilter: theme === 'theme-3' ? 'none' : 'blur(16px)',
              WebkitBackdropFilter: theme === 'theme-3' ? 'none' : 'blur(16px)',
              color: theme === 'theme-3' ? '#000000' : (menuOpen ? '#ffffff' : '#cbd5e1'),
              cursor: 'pointer',
              zIndex: 100000,
              boxShadow: theme === 'theme-3' ? 'none' : (menuOpen ? 'none' : '0 4px 20px rgba(255, 255, 255, 0.06)'),
              outline: 'none',
              transition: 'all 0.2s ease'
            }}
          >
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </motion.button>
        )}
      </AnimatePresence>

      {/* Full Screen Navigation Drawer Overlay */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            key="nav-overlay"
            variants={overlayVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            style={{
              position: 'absolute',
              inset: 0,
              zIndex: 99999,
              background: theme === 'theme-3'
                ? '#ffffff'
                : 'radial-gradient(circle at 50% 30%, rgba(255, 255, 255, 0.04) 0%, #08090b 100%)',
              backdropFilter: theme === 'theme-3' ? 'none' : 'blur(30px)',
              WebkitBackdropFilter: theme === 'theme-3' ? 'none' : 'blur(30px)',
              padding: '45px 20px 20px 20px',
              display: 'flex',
              flexDirection: 'column',
              boxSizing: 'border-box',
              border: theme === 'theme-3' ? '1px solid #000000' : 'none'
            }}
          >
            {/* Overlay header / logo */}
            <div style={{ marginBottom: '12px', textAlign: 'center' }}>
              <h2 style={{
                fontSize: '1.8rem',
                fontWeight: 950,
                margin: 0,
                background: theme === 'theme-3'
                  ? 'none'
                  : 'linear-gradient(135deg, #ffffff 0%, #cbd5e1 100%)',
                color: theme === 'theme-3' ? '#000000' : 'transparent',
                WebkitBackgroundClip: theme === 'theme-3' ? 'initial' : 'text',
                WebkitTextFillColor: theme === 'theme-3' ? 'initial' : 'transparent',
                letterSpacing: '-1.5px'
              }}>
                memeng
              </h2>
              <p style={{ color: theme === 'theme-3' ? '#666666' : 'var(--text-secondary)', fontSize: '0.72rem', marginTop: '2px' }}>
                Spaced Repetition Companion
              </p>
            </div>

            {/* User Profile Info inside menu */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              marginBottom: '14px',
              color: theme === 'theme-3' ? '#666666' : 'var(--text-secondary)',
              fontSize: '0.78rem'
            }}>
              <span style={{ display: 'inline-block', width: '5px', height: '5px', borderRadius: theme === 'theme-3' ? '0px' : '50%', background: theme === 'theme-3' ? '#000000' : '#cbd5e1', boxShadow: theme === 'theme-3' ? 'none' : '0 0 6px #cbd5e1' }} />
              <span>Logged in as <strong style={{ color: theme === 'theme-3' ? '#000000' : 'inherit' }}>{user?.email || 'cz01'}</strong></span>
            </div>

            {/* Navigation Items (The 3 Modes) */}
            <motion.div 
              variants={containerVariants}
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                flex: 1,
                overflowY: 'hidden',
                paddingRight: '4px'
              }}
            >
              {navItems.map((item) => {
                const IconComponent = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <motion.div
                    key={item.path}
                    variants={itemVariants}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleNavigation(item.path)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '10px 14px',
                      borderRadius: theme === 'theme-3' ? '0px' : '12px',
                      background: theme === 'theme-3'
                        ? (isActive ? '#000000' : '#ffffff')
                        : (isActive ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.02)'),
                      border: theme === 'theme-3'
                        ? '1px solid #000000'
                        : (isActive ? '1px solid rgba(255, 255, 255, 0.15)' : '1px solid rgba(255, 255, 255, 0.04)'),
                      cursor: 'pointer'
                    }}
                  >
                    <div style={{
                      width: '30px',
                      height: '30px',
                      borderRadius: theme === 'theme-3' ? '0px' : '8px',
                      background: theme === 'theme-3'
                        ? (isActive ? '#000000' : '#ffffff')
                        : (isActive ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.03)'),
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: theme === 'theme-3'
                        ? 'none'
                        : (isActive ? '1px solid rgba(255, 255, 255, 0.15)' : '1px solid rgba(255, 255, 255, 0.06)')
                    }}>
                      <IconComponent size={15} color={theme === 'theme-3' ? (isActive ? '#ffffff' : '#000000') : (isActive ? '#ffffff' : '#94a3b8')} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '0.85rem', fontWeight: 800, color: theme === 'theme-3' ? (isActive ? '#ffffff' : '#000000') : 'white', display: 'flex', alignItems: 'center', gap: '5px' }}>
                        {item.label}
                        {item.badge !== undefined && item.badge > 0 && (
                          <span style={{
                            background: '#ef4444',
                            color: 'white',
                            fontSize: '0.58rem',
                            fontWeight: 900,
                            borderRadius: '50%',
                            width: '14px',
                            height: '14px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: '0 0 5px rgba(239, 68, 68, 0.65)'
                          }}>
                            {item.badge}
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '0.68rem', color: theme === 'theme-3' ? (isActive ? '#cccccc' : '#666666') : '#94a3b8', marginTop: '1px' }}>{item.description}</div>
                    </div>
                  </motion.div>
                );
              })}

              {/* Spacer / Divider */}
              <div style={{ height: '1px', background: 'rgba(255, 255, 255, 0.06)', margin: '4px 0' }} />

              {/* Appearance / Theme Selector */}
              <motion.div
                variants={itemVariants}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  padding: '12px 14px',
                  borderRadius: theme === 'theme-3' ? '0px' : '12px',
                  background: theme === 'theme-3' ? '#ffffff' : 'rgba(255, 255, 255, 0.02)',
                  border: theme === 'theme-3' ? '1px solid #000000' : '1px solid rgba(255, 255, 255, 0.04)',
                  marginBottom: '4px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{
                    width: '30px',
                    height: '30px',
                    borderRadius: theme === 'theme-3' ? '0px' : '8px',
                    background: theme === 'theme-3' ? '#ffffff' : 'rgba(255, 255, 255, 0.03)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: theme === 'theme-3' ? '1px solid #000000' : '1px solid rgba(255, 255, 255, 0.06)'
                  }}>
                    <Palette size={15} color={theme === 'theme-3' ? '#000000' : '#94a3b8'} />
                  </div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 800, color: theme === 'theme-3' ? '#000000' : 'white' }}>
                    Appearance
                  </div>
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px', marginTop: '4px' }}>
                  {[
                    { id: 'theme-1', name: 'Glass' },
                    { id: 'theme-2', name: 'Silver' }
                  ].map(t => {
                    const isActive = theme === t.id;
                    return (
                      <button
                        key={t.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          setTheme(t.id);
                        }}
                        style={{
                          background: isActive ? 'rgba(255, 255, 255, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                          border: `1px solid ${isActive ? 'rgba(255, 255, 255, 0.3)' : 'rgba(255, 255, 255, 0.08)'}`,
                          borderRadius: '8px',
                          color: isActive ? 'white' : '#94a3b8',
                          padding: '6px 4px',
                          fontSize: '0.7rem',
                          fontWeight: isActive ? 'bold' : 'normal',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          textAlign: 'center',
                          outline: 'none'
                        }}
                      >
                        {t.name}
                      </button>
                    );
                  })}
                </div>
              </motion.div>

              {/* Conditional Exit Study Session Option */}
              {localStorage.getItem('memeng_is_studying') === 'true' && (
                <motion.div
                  variants={itemVariants}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    // Dispatch a custom event so Purge.jsx can reset its study session
                    window.dispatchEvent(new Event('exit-study-session'));
                    setMenuOpen(false);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '10px 14px',
                    borderRadius: '12px',
                    background: 'rgba(239, 68, 68, 0.08)',
                    border: '1px solid rgba(239, 68, 68, 0.25)',
                    cursor: 'pointer',
                    marginBottom: '8px'
                  }}
                >
                  <div style={{
                    width: '30px',
                    height: '30px',
                    borderRadius: '8px',
                    background: 'rgba(239, 68, 68, 0.12)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '1px solid rgba(239, 68, 68, 0.2)'
                  }}>
                    <XCircle size={15} color="#ef4444" />
                  </div>
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#ef4444' }}>
                      Exit Study Session
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Settings side-by-side layout */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.15fr 0.85fr', gap: '8px', marginBottom: '8px', marginTop: '2px' }}>
                {/* Compact Setting 1: Daily Reminder */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '8px',
                    padding: '8px 12px',
                    borderRadius: theme === 'theme-3' ? '0px' : '12px',
                    background: theme === 'theme-3' ? '#ffffff' : 'rgba(255, 255, 255, 0.01)',
                    border: theme === 'theme-3' ? '1px solid #000000' : '1px solid rgba(255, 255, 255, 0.03)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Bell size={14} color={theme === 'theme-3' ? '#000000' : '#94a3b8'} />
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: theme === 'theme-3' ? '#000000' : 'white' }}>Reminder</span>
                  </div>
                  <input 
                    type="time" 
                    value={reminderTime}
                    onChange={(e) => {
                      setReminderTime(e.target.value);
                      try {
                        localStorage.setItem('chatgpt_anki_reminder', e.target.value);
                      } catch (err) {}
                    }}
                    style={{
                      background: theme === 'theme-3' ? '#ffffff' : 'rgba(255,255,255,0.04)',
                      border: theme === 'theme-3' ? '1px solid #000000' : '1px solid rgba(255,255,255,0.1)',
                      borderRadius: theme === 'theme-3' ? '0px' : '6px',
                      padding: '0.15rem 0.35rem',
                      color: theme === 'theme-3' ? '#000000' : 'white',
                      fontSize: '0.72rem',
                      outline: 'none',
                      width: '62px'
                    }}
                  />
                </div>

                {/* Compact Setting 2: Bottom Navigation Toggle */}
                <div
                  onClick={() => {
                    const val = !showBottomNav;
                    setShowBottomNav(val);
                    try {
                      localStorage.setItem('chatgpt_anki_show_bottom_nav', val.toString());
                    } catch (err) {}
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '8px',
                    padding: '8px 12px',
                    borderRadius: theme === 'theme-3' ? '0px' : '12px',
                    background: theme === 'theme-3' ? '#ffffff' : 'rgba(255, 255, 255, 0.01)',
                    border: theme === 'theme-3' ? '1px solid #000000' : '1px solid rgba(255, 255, 255, 0.03)',
                    cursor: 'pointer'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Sliders size={14} color={theme === 'theme-3' ? '#000000' : '#94a3b8'} />
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: theme === 'theme-3' ? '#000000' : 'white' }}>Nav Dock</span>
                  </div>
                  {/* Visual Toggle Switch */}
                  <div style={{
                    width: '28px',
                    height: '16px',
                    borderRadius: theme === 'theme-3' ? '0px' : '8px',
                    background: showBottomNav ? (theme === 'theme-3' ? '#000000' : 'rgba(255,255,255,0.2)') : (theme === 'theme-3' ? '#ffffff' : 'rgba(255,255,255,0.04)'),
                    position: 'relative',
                    transition: 'background-color 0.2s',
                    border: theme === 'theme-3' ? '1px solid #000000' : '1px solid rgba(255,255,255,0.08)'
                  }}>
                    <div style={{
                      width: '10px',
                      height: '10px',
                      borderRadius: theme === 'theme-3' ? '0px' : '50%',
                      background: showBottomNav ? '#ffffff' : (theme === 'theme-3' ? '#000000' : 'rgba(255,255,255,0.3)'),
                      position: 'absolute',
                      top: '2px',
                      left: showBottomNav ? '14px' : '2px',
                      transition: 'left 0.2s',
                      boxShadow: theme === 'theme-3' ? 'none' : '0 1px 3px rgba(0,0,0,0.2)'
                    }} />
                  </div>
                </div>
              </div>

              {/* Restart Tutorial */}
              <motion.div
                variants={itemVariants}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  setMenuOpen(false);
                  window.dispatchEvent(new Event('trigger-tutorial'));
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '10px 14px',
                  borderRadius: theme === 'theme-3' ? '0px' : '12px',
                  background: theme === 'theme-3' ? '#ffffff' : 'rgba(251, 191, 36, 0.05)',
                  border: theme === 'theme-3' ? '1px solid #facc15' : '1px solid rgba(251, 191, 36, 0.2)',
                  cursor: 'pointer',
                  marginTop: '12px',
                  marginBottom: '4px'
                }}
              >
                <div style={{
                  width: '30px',
                  height: '30px',
                  borderRadius: '8px',
                  background: 'rgba(251, 191, 36, 0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '1px solid rgba(251, 191, 36, 0.2)'
                }}>
                  <HelpCircle size={14} color="#facc15" />
                </div>
                <div>
                  <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#facc15' }}>
                    Guide Tour (สอนใช้งาน)
                  </div>
                  <div style={{ fontSize: '0.62rem', color: 'rgba(251, 191, 36, 0.6)' }}>
                    Restart the interactive tutorial
                  </div>
                </div>
              </motion.div>

              {/* Reset Deck & Stats - Danger Zone */}
              <motion.div
                variants={itemVariants}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  if (window.confirm('⚠️ This will permanently delete ALL words and review history from local cache AND Supabase cloud database. This cannot be undone. Are you sure?')) {
                    clearDeckAndResetStats();
                    setMenuOpen(false);
                  }
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '10px 14px',
                  borderRadius: theme === 'theme-3' ? '0px' : '12px',
                  background: theme === 'theme-3' ? '#ffffff' : 'rgba(239, 68, 68, 0.04)',
                  border: theme === 'theme-3' ? '1px solid #ef4444' : '1px solid rgba(239, 68, 68, 0.15)',
                  cursor: 'pointer',
                  marginTop: '20px'
                }}
              >
                <div style={{
                  width: '30px',
                  height: '30px',
                  borderRadius: '8px',
                  background: 'rgba(239, 68, 68, 0.08)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '1px solid rgba(239, 68, 68, 0.2)'
                }}>
                  <Trash2 size={14} color="#ef4444" />
                </div>
                <div>
                  <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#fca5a5' }}>
                    Reset Deck & Stats
                  </div>
                  <div style={{ fontSize: '0.62rem', color: 'rgba(252, 165, 165, 0.6)' }}>
                    Delete all words and review history
                  </div>
                </div>
              </motion.div>

              {/* Log out option at bottom */}
              <motion.div
                variants={itemVariants}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleLogout}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '10px 14px',
                  borderRadius: theme === 'theme-3' ? '0px' : '12px',
                  background: theme === 'theme-3' ? '#ffffff' : 'rgba(239, 68, 68, 0.04)',
                  border: theme === 'theme-3' ? '1px solid #ef4444' : '1px solid rgba(239, 68, 68, 0.15)',
                  cursor: 'pointer',
                  marginTop: '20px'
                }}
              >
                <div style={{
                  width: '30px',
                  height: '30px',
                  borderRadius: '8px',
                  background: 'rgba(239, 68, 68, 0.08)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '1px solid rgba(239, 68, 68, 0.2)'
                }}>
                  <LogOut size={14} color="#ef4444" />
                </div>
                <div>
                  <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#fca5a5' }}>
                    Sign Out
                  </div>
                  <div style={{ fontSize: '0.62rem', color: 'rgba(252, 165, 165, 0.6)' }}>
                    Log out of your profile
                  </div>
                </div>
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      
      <Tutorial />
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <VocabProvider>
        <BrowserRouter>
          <AppContent />
        </BrowserRouter>
      </VocabProvider>
    </AuthProvider>
  );
}

export default App;
