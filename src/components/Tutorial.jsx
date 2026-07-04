import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import { X, ChevronRight, HelpCircle, Minimize2, Maximize2 } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useVocab } from '../context/VocabContext';

const TUTORIAL_STEPS = [
  { path: '/', selector: '#tutorial-translate-input', title: 'Translate a Word', text: 'Type a word you want to learn, for example <span style="color:#facc15;font-weight:900">hello</span>. You can type any letter during the guide and Mem-eng will fill in hello for you.', position: 'bottom' },
  { path: '/', selector: '#tutorial-translate-submit-btn', title: 'Run Translation', text: 'Tap <span style="color:#facc15;font-weight:900">Translate</span> to create a learning card with meaning, examples, and context.', position: 'bottom' },
  { path: '/', selector: '.results-drag-wrapper', title: 'Explore the Card', text: 'Scroll through the result card to see the definition, example sentence, collocation, and visual context. When you are done, tap <span style="color:#facc15;font-weight:900">Next</span>.', position: 'top' },
  { path: '/', selector: '.results-drag-wrapper', title: 'Save Gesture Demo', text: 'You can manage a translated word with simple gestures:<br/>- <span style="color:#ef4444;font-weight:900">Swipe left</span> to go back or skip.<br/>- <span style="color:#10b981;font-weight:900">Swipe right</span> to save it to your deck.', position: 'top', showSwipeDemo: true },
  { path: '/', selector: '#tutorial-tinder-save-btn', title: 'Save the Word', text: 'You can also tap the <span style="color:#4ade80;font-weight:900">Save</span> button directly. This adds the word to your review deck.', position: 'top' },
  { path: '/purge', selector: '#tutorial-flashcard-card', title: 'Open Flashcards', text: 'This is your flashcard deck. Tap the center card to reveal the answer and learning details.', position: 'top' },
  { path: '/purge', selector: '#tutorial-flashcard-card', title: 'Reveal the Answer', text: 'Tap the card again to reveal the Thai meaning and the memory-rating controls.', position: 'top' },
  { path: '/purge', selector: '#tutorial-word-today', title: 'Quick Lookup', text: 'Tap a word inside an example sentence, such as <span style="color:#facc15;font-weight:900">today</span>, to open a quick dictionary popup.', position: 'top' },
  { path: '/purge', selector: '#tutorial-tooltip-info-container', title: 'Word Details and Sound', text: 'Read the quick meaning or tap the speaker button to hear the word. Then continue to the next step.', position: 'bottom', padding: 12 },
  { path: '/purge', selector: '#tutorial-tooltip-add-btn', title: 'Add From Lookup', text: 'Tap <span style="color:#facc15;font-weight:900">Add to Deck</span> to save that word into your learning deck.', position: 'bottom' },
  { path: '/purge', selector: '#tutorial-flashcard-card', title: 'Rate Your Memory', text: 'Mem-eng reviews words based on how well you remember them. You can swipe in four directions:<br/>- <span style="color:#3b82f6;font-weight:800">Right = Easy</span><br/>- <span style="color:#10b981;font-weight:800">Up = Normal</span><br/>- <span style="color:#f97316;font-weight:800">Down = Hard</span><br/>- <span style="color:#ef4444;font-weight:800">Left = Again</span>', position: 'top', padding: 6, showSwipeDemo: true },
  { path: '/purge', selector: '#tutorial-srs-buttons', title: 'Use Rating Buttons', text: 'If you do not want to swipe, you can tap the rating buttons at the bottom. Each choice changes the next review time.', position: 'top', padding: 6 },
  { path: '/profile', selector: '#tutorial-profile-curriculum', title: 'Choose a Word Set', text: 'Tap the curriculum label to choose a word set such as Oxford, TOEIC, or Self-Study.', position: 'bottom', padding: 4 },
  { path: '/profile', selector: '#tutorial-profile-curriculum-modal-content', title: 'Pick Your Focus', text: 'Choose the list you want to study. Use <span style="color:#facc15;font-weight:900">Self-Study</span> when you want to build your own deck.', position: 'top', padding: 10 },
  { path: '/profile', selector: '#tutorial-profile-srs', title: 'Check Memory Stages', text: 'Tap a memory stage, such as Learning or Mastered, to see the words in that group.', position: 'top', padding: 6 },
  { path: '/profile', selector: null, title: 'You Are Ready', text: 'That is the full tour. You can now translate words, save them, and review them with spaced repetition.', position: 'top' }
];
const PremiumFingerPointer = ({ direction = 'down' }) => {
  let rotateDeg = 0;
  if (direction === 'up') rotateDeg = 0; // 👆
  if (direction === 'down') rotateDeg = 180; // 👇
  if (direction === 'left') rotateDeg = -90; // 👈
  if (direction === 'right') rotateDeg = 90; // 👉

  return (
    <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      {/* Radar pulse ripple effect */}
      <div 
        style={{
          position: 'absolute',
          width: '32px',
          height: '32px',
          borderRadius: '50%',
          border: '2px solid rgba(255, 255, 255, 0.75)',
          boxShadow: '0 0 10px rgba(255,255,255,0.3)',
          animation: 'radarPulse 1.4s infinite ease-out',
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
        @keyframes radarPulse {
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

export const Tutorial = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { theme } = useTheme();
  const { user } = useAuth();
  const { clearDeckAndResetStats, setActiveCurriculum } = useVocab();
  
  const [active, setActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [highlightRect, setHighlightRect] = useState(null);
  const [viewportRect, setViewportRect] = useState(null);
  const [speakBtnRect, setSpeakBtnRect] = useState(null);
  const [isMinimized, setIsMinimized] = useState(false);
  const [showOptIn, setShowOptIn] = useState(false);
  const autoMinimizeTimerRef = useRef(null);

  const hasInitializedRef = useRef(false);
  const handleCloseRef = useRef(null);

  const handleClose = useCallback(async () => {
    setActive(false);
    localStorage.setItem('memeng_tutorial_done', 'true');
    localStorage.removeItem('memeng_tutorial_started');
    // Ensure all modals are closed when exiting tutorial
    window.dispatchEvent(new Event('tutorial-close-modals'));
    window.dispatchEvent(new Event('exit-study-session'));
    window.dispatchEvent(new Event('tutorial-reset'));
    
    // Always revert curriculum back to Self-Study default after tutorial finish
    try {
      setActiveCurriculum('Self-Study only');
      localStorage.setItem('chatgpt_anki_curriculum', 'Self-Study only');
    } catch (err) {
      console.error("Failed to reset curriculum default on finish:", err);
    }

    try {
      await clearDeckAndResetStats();
    } catch (err) {
      console.error("Failed to clear deck on tutorial complete:", err);
    }
    
    // Clean hard redirect to home screen to unmount all pages and boot cleanly
    window.location.href = '/';
  }, [clearDeckAndResetStats, setActiveCurriculum]);

  useEffect(() => {
    handleCloseRef.current = handleClose;
  }, [handleClose]);

  // Show opt-in popup for new users visiting /purge (no auto-start)
  useEffect(() => {
    if (!user) {
      hasInitializedRef.current = false;
      setActive(false);
      setShowOptIn(false);
      return;
    }

    const isDone = localStorage.getItem('memeng_tutorial_done') === 'true';
    const isOffered = localStorage.getItem('memeng_tutorial_offered') === 'true';
    if (!isDone && !isOffered && location.pathname === '/purge' && !hasInitializedRef.current && !active) {
      hasInitializedRef.current = true;
      setShowOptIn(true);
    }
  }, [user, location.pathname, active]);

  // Listen to hamburger trigger
  useEffect(() => {
    const handleTrigger = () => {
      if (!user) return;
      localStorage.setItem('memeng_tutorial_done', 'false');
      localStorage.setItem('memeng_tutorial_started', 'true');
      setActive(true);
      setCurrentStep(0);
      navigate('/');
    };
    window.addEventListener('trigger-tutorial', handleTrigger);
    return () => window.removeEventListener('trigger-tutorial', handleTrigger);
  }, [user, navigate]);

  // Dispatch custom event to notify pages of step transitions (e.g. to programmatically reveal cards)
  useEffect(() => {
    if (active) {
      window.dispatchEvent(new CustomEvent('tutorial-step-changed', { detail: { step: currentStep } }));
    }
  }, [currentStep, active]);

  // Sync active status changes with App.jsx
  useEffect(() => {
    window.dispatchEvent(new CustomEvent('tutorial-active-change', { detail: active }));
  }, [active]);

  // Listen to exit-tutorial event from settings drawer
  useEffect(() => {
    const handleExit = () => {
      if (handleCloseRef.current) handleCloseRef.current();
    };
    window.addEventListener('exit-tutorial', handleExit);
    return () => window.removeEventListener('exit-tutorial', handleExit);
  }, []);

  const [completedSteps, setCompletedSteps] = useState(() => new Array(TUTORIAL_STEPS.length).fill(false));

  // Reset completedSteps when tutorial restarts
  useEffect(() => {
    if (active) {
      setCompletedSteps(new Array(TUTORIAL_STEPS.length).fill(false));
    }
  }, [active]);

  // Scroll tracker for Step 2 (Explore AI Card)
  useEffect(() => {
    if (!active || currentStep !== 2) return;

    let scrollContainer = document.querySelector('.scrollable-content');
    
    const findAndAttach = () => {
      scrollContainer = document.querySelector('.scrollable-content');
      if (scrollContainer) {
        const handleScroll = () => {
          if (scrollContainer.scrollTop > 150) {
            setCompletedSteps(prev => {
              const next = [...prev];
              next[2] = true;
              return next;
            });
          }
        };
        scrollContainer.addEventListener('scroll', handleScroll, { passive: true });
        return () => {
          if (scrollContainer) {
            scrollContainer.removeEventListener('scroll', handleScroll);
          }
        };
      }
    };

    const cleanup = findAndAttach();
    const timer = setTimeout(findAndAttach, 500);

    return () => {
      if (cleanup) cleanup();
      clearTimeout(timer);
    };
  }, [active, currentStep]);

  // Listen to interactive events to auto-advance steps and mark completed
  useEffect(() => {
    if (!active) return;

    const handleTypedHello = () => {
      setCompletedSteps(prev => {
        const next = [...prev];
        next[0] = true;
        return next;
      });
      // REMOVED auto-advance to let user manually click the gold-bordered Next button
    };

    const handleTranslated = () => {
      setCompletedSteps(prev => {
        const next = [...prev];
        next[1] = true;
        return next;
      });
      if (currentStep === 1) {
        setTimeout(() => {
          setCurrentStep(2);
        }, 800);
      }
    };

    const handleWordSaved = () => {
      setCompletedSteps(prev => {
        const next = [...prev];
        next[4] = true;
        return next;
      });
      if (currentStep === 4) {
        setTimeout(() => {
          setCurrentStep(5);
          navigate('/purge');
        }, 800);
      }
    };

    const handleCardRevealed = () => {
      setCompletedSteps(prev => {
        const next = [...prev];
        next[5] = true;
        return next;
      });
      if (currentStep === 5) {
        setTimeout(() => {
          setCurrentStep(6);
        }, 800);
      }
    };

    const handleCardFullyRevealed = () => {
      setCompletedSteps(prev => {
        const next = [...prev];
        next[6] = true;
        return next;
      });
      if (currentStep === 6) {
        setTimeout(() => {
          setCurrentStep(7);
        }, 800);
      }
    };

    const handleTooltipOpened = (e) => {
      setCompletedSteps(prev => {
        const next = [...prev];
        next[7] = true;
        return next;
      });
      if (currentStep === 7) {
        setTimeout(() => {
          setCurrentStep(8);
        }, 1500);
      }
    };

    const handleTooltipSpoken = () => {
      setCompletedSteps(prev => {
        const next = [...prev];
        next[8] = true;
        return next;
      });
      if (currentStep === 8) {
        setTimeout(() => {
          setCurrentStep(9);
        }, 1000);
      }
    };

    const handleTooltipSaved = () => {
      setCompletedSteps(prev => {
        const next = [...prev];
        next[9] = true;
        return next;
      });
      if (currentStep === 9) {
        setTimeout(() => {
          setCurrentStep(10);
        }, 800);
      }
    };

    const handleSrsClicked = () => {
      setCompletedSteps(prev => {
        const next = [...prev];
        next[11] = true;
        return next;
      });
      if (currentStep === 11) {
        setTimeout(() => {
          setCurrentStep(12);
          navigate('/profile');
        }, 800);
      }
    };

    const handleCurriculumOpened = () => {
      setCompletedSteps(prev => {
        const next = [...prev];
        next[12] = true;
        return next;
      });
      if (currentStep === 12) {
        setTimeout(() => {
          setCurrentStep(13);
        }, 300);
      }
    };

    const handleCurriculumSelected = () => {
      setCompletedSteps(prev => {
        const next = [...prev];
        next[13] = true;
        return next;
      });
      if (currentStep === 13) {
        setTimeout(() => {
          setCurrentStep(14);
        }, 800);
      }
    };

    const handleSrsModalOpened = () => {
      setCompletedSteps(prev => {
        const next = [...prev];
        next[14] = true;
        return next;
      });
      if (currentStep === 14) {
        setTimeout(() => {
          setCurrentStep(15);
        }, 400);
      }
    };

    window.addEventListener('tutorial-typed-hello', handleTypedHello);
    window.addEventListener('tutorial-translated', handleTranslated);
    window.addEventListener('tutorial-word-saved', handleWordSaved);
    window.addEventListener('tutorial-card-revealed', handleCardRevealed);
    window.addEventListener('tutorial-card-fully-revealed', handleCardFullyRevealed);
    window.addEventListener('tutorial-tooltip-opened', handleTooltipOpened);
    window.addEventListener('tutorial-tooltip-spoken', handleTooltipSpoken);
    window.addEventListener('tutorial-tooltip-saved', handleTooltipSaved);
    window.addEventListener('tutorial-srs-clicked', handleSrsClicked);
    window.addEventListener('tutorial-curriculum-opened', handleCurriculumOpened);
    window.addEventListener('tutorial-curriculum-selected', handleCurriculumSelected);
    window.addEventListener('tutorial-srs-modal-opened', handleSrsModalOpened);

    return () => {
      window.removeEventListener('tutorial-typed-hello', handleTypedHello);
      window.removeEventListener('tutorial-translated', handleTranslated);
      window.removeEventListener('tutorial-word-saved', handleWordSaved);
      window.removeEventListener('tutorial-card-revealed', handleCardRevealed);
      window.removeEventListener('tutorial-card-fully-revealed', handleCardFullyRevealed);
      window.removeEventListener('tutorial-tooltip-opened', handleTooltipOpened);
      window.removeEventListener('tutorial-tooltip-spoken', handleTooltipSpoken);
      window.removeEventListener('tutorial-tooltip-saved', handleTooltipSaved);
      window.removeEventListener('tutorial-srs-clicked', handleSrsClicked);
      window.removeEventListener('tutorial-curriculum-opened', handleCurriculumOpened);
      window.removeEventListener('tutorial-curriculum-selected', handleCurriculumSelected);
      window.removeEventListener('tutorial-srs-modal-opened', handleSrsModalOpened);
    };
  }, [active, currentStep]);

  // Auto-complete Swipe Gestures Demo steps after 5 seconds to change 'Skip' to 'Next'
  useEffect(() => {
    if (!active) return;
    if (currentStep === 3 || currentStep === 10) {
      const timer = setTimeout(() => {
        setCompletedSteps(prev => {
          const next = [...prev];
          next[currentStep] = true;
          return next;
        });
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [currentStep, active]);

  // Close modals on step 16 (Profile Summary) to show the main profile stats
  useEffect(() => {
    if (!active) return;
    if (currentStep === 15) {
      window.dispatchEvent(new Event('tutorial-close-modals'));
    }
  }, [currentStep, active]);

  // Recalculate target position on step or location change
  useEffect(() => {
    if (!active) return;
    
    const stepConf = TUTORIAL_STEPS[currentStep];
    if (!stepConf) return;

    // Clear previous highlight while path switches
    if (location.pathname !== stepConf.path) {
      setHighlightRect(null);
      setViewportRect(null);
      return;
    }

    let frameId;
    let timerId;

    const runUpdate = () => {
      const el = document.querySelector(stepConf.selector);
      const containerEl = document.querySelector('.app-container') || document.querySelector('#root');
      
      if (el && containerEl) {
        const rect = el.getBoundingClientRect();
        const containerRect = containerEl.getBoundingClientRect();
        
        if (rect.width > 0 && rect.height > 0) {
          const pad = stepConf.padding || 0;
          setHighlightRect({
            top: rect.top - containerRect.top - pad,
            left: rect.left - containerRect.left - pad,
            width: rect.width + (pad * 2),
            height: rect.height + (pad * 2)
          });
          setViewportRect({
            top: rect.top - pad,
            left: rect.left - pad,
            width: rect.width + (pad * 2),
            height: rect.height + (pad * 2),
            bottom: rect.bottom + pad,
            right: rect.right + pad
          });
        }
      } else {
        setHighlightRect(null);
        setViewportRect(null);
      }

      // Track speaker button separately for finger indicator pointer during Step 8 (Sound)
      if (currentStep === 8 && containerEl) {
        const speakEl = document.getElementById('tutorial-tooltip-speak-btn');
        if (speakEl) {
          const sRect = speakEl.getBoundingClientRect();
          const containerRect = containerEl.getBoundingClientRect();
          setSpeakBtnRect({
            top: sRect.top - containerRect.top,
            left: sRect.left - containerRect.left,
            width: sRect.width,
            height: sRect.height
          });
        } else {
          setSpeakBtnRect(null);
        }
      } else {
        setSpeakBtnRect(null);
      }
    };

    window.addEventListener('resize', runUpdate);

    // Wait for slide transitions to complete before measuring/observing
    timerId = setTimeout(() => {
      const startTime = Date.now();
      const duration = 1200; // Poll for 1.2s to track final position shifts

      const updatePosition = () => {
        runUpdate();
        if (Date.now() - startTime < duration) {
          frameId = requestAnimationFrame(updatePosition);
        }
      };

      // Run initial check and start frame loop
      updatePosition();

      // Smooth scroll showcase behavior
      if (currentStep === 2) {
        const scrollContainer = document.querySelector('.scrollable-content');
        if (scrollContainer) {
          scrollContainer.scrollTo({ top: 300, behavior: 'smooth' });
          setTimeout(() => {
            scrollContainer.scrollTo({ top: 0, behavior: 'smooth' });
          }, 1800);
        }
      } else {
        const el = document.querySelector(stepConf.selector);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
    }, 450);

    return () => {
      window.removeEventListener('resize', runUpdate);
      if (timerId) clearTimeout(timerId);
      if (frameId) cancelAnimationFrame(frameId);
    };
  }, [currentStep, location.pathname, active]);

  // Reset minimized state when step changes
  useEffect(() => {
    if (active) {
      setIsMinimized(false);
    }
  }, [currentStep]);

  const handleMinimize = useCallback(() => {
    setIsMinimized(true);
  }, []);

  const handleExpand = useCallback(() => {
    setIsMinimized(false);
  }, []);

  // Opt-in popup handlers
  const handleOptInAccept = () => {
    localStorage.setItem('memeng_tutorial_offered', 'true');
    localStorage.setItem('memeng_tutorial_done', 'false');
    localStorage.setItem('memeng_tutorial_started', 'true');
    setShowOptIn(false);
    setActive(true);
    setCurrentStep(0);
    navigate('/');
  };

  const handleOptInDismiss = () => {
    localStorage.setItem('memeng_tutorial_offered', 'true');
    localStorage.setItem('memeng_tutorial_done', 'true');
    localStorage.removeItem('memeng_tutorial_started');
    setShowOptIn(false);
    // Notify Purge.jsx to immediately drop the mock card and load the real (empty) queue
    window.dispatchEvent(new Event('tutorial-reset'));
  };

  if (!active && !showOptIn) return null;

  // Render opt-in popup when not active but showOptIn is true
  if (!active && showOptIn) {
    return (
      <div style={{ position: 'fixed', inset: 0, zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}>
        <motion.div
          initial={{ opacity: 0, scale: 0.85, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.85, y: 20 }}
          transition={{ type: 'spring', stiffness: 400, damping: 28 }}
          className="glass-panel"
          style={{
            width: '88%',
            maxWidth: '320px',
            padding: '1.5rem 1.3rem',
            borderRadius: '24px',
            background: 'rgba(15, 23, 42, 0.95)',
            border: '1px solid rgba(251, 191, 36, 0.3)',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.6), 0 0 20px rgba(251, 191, 36, 0.1)',
            textAlign: 'center'
          }}
        >
          <div style={{ fontSize: '2.2rem', marginBottom: '0.5rem' }}>👋</div>
          <h3 style={{ margin: '0 0 0.4rem 0', color: 'white', fontWeight: 800, fontSize: '1.1rem' }}>
            สวัสดี!
          </h3>
          <p style={{ margin: '0 0 1.2rem 0', fontSize: '0.82rem', color: '#cbd5e1', lineHeight: '1.6' }}>
            อยากลองทำ Tutorial แนะนำการใช้งานไหม?
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <button
              onClick={handleOptInAccept}
              className="glass-button primary"
              style={{
                width: '100%',
                padding: '0.6rem 1rem',
                borderRadius: '14px',
                fontSize: '0.85rem',
                fontWeight: 800,
                cursor: 'pointer',
                border: 'none'
              }}
            >
              ลองเลย!
            </button>
            <button
              onClick={handleOptInDismiss}
              style={{
                width: '100%',
                padding: '0.55rem 1rem',
                borderRadius: '14px',
                fontSize: '0.78rem',
                fontWeight: 700,
                cursor: 'pointer',
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: 'rgba(255,255,255,0.55)'
              }}
            >
              ไม่ล่ะ ขอเล่นเอง
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  const stepConf = TUTORIAL_STEPS[currentStep];
  const isWrongPath = stepConf && location.pathname !== stepConf.path;
  const handleNext = () => {
    // If the step was already completed by the user manually, just advance directly without running fallback simulations
    if (completedSteps[currentStep]) {
      if (currentStep < TUTORIAL_STEPS.length - 1) {
        const nextStep = currentStep + 1;
        setCurrentStep(nextStep);
        if (TUTORIAL_STEPS[nextStep].path !== location.pathname) {
          navigate(TUTORIAL_STEPS[nextStep].path);
        }
      } else {
        handleClose();
      }
      return;
    }

    // Robust fallbacks for each step to simulate the target interaction if skipped/clicked manually
    if (currentStep === 0) {
      // Simulate typing "hello"
      window.dispatchEvent(new CustomEvent('tutorial-type-word', { detail: { word: 'hello' } }));
      setTimeout(() => {
        setCurrentStep(1);
      }, 150);
      return;
    }

    if (currentStep === 1) {
      // Trigger translate submit
      const form = document.querySelector('#tutorial-translate-input form');
      if (form) {
        form.requestSubmit();
      } else {
        // Fallback: Direct advance if element not found
        setCurrentStep(2);
      }
      return;
    }

    if (currentStep === 2) {
      // Move to Step 3: Swipe Gestures Demo (NEW)
      setCurrentStep(3);
      return;
    }

    if (currentStep === 3) {
      // Move to Step 4: Swipe or Tap to Save
      setCurrentStep(4);
      return;
    }

    if (currentStep === 4) {
      // Simulate Save click or swipe
      const saveBtn = document.getElementById('tutorial-tinder-save-btn');
      if (saveBtn) {
        saveBtn.click();
      } else {
        // Direct fallback: trigger the custom save event manually
        window.dispatchEvent(new Event('tutorial-word-saved'));
      }
      return;
    }

    if (currentStep === 5) {
      // Simulate reveal front card click
      window.dispatchEvent(new Event('tutorial-card-revealed'));
      setCurrentStep(6);
      return;
    }

    if (currentStep === 6) {
      // Simulate reveal back card click
      window.dispatchEvent(new Event('tutorial-card-fully-revealed'));
      setCurrentStep(7);
      return;
    }

    if (currentStep === 7) {
      // Simulate clicking the "today" word
      const todaySpan = document.getElementById('tutorial-word-today') || document.getElementById('tutorial-word-greeting');
      if (todaySpan) {
        todaySpan.click();
      } else {
        window.dispatchEvent(new CustomEvent('tutorial-tooltip-opened', { detail: { word: 'today' } }));
      }
      return;
    }

    if (currentStep === 8) {
      // Play pronunciation and advance to Add to Deck step
      const speakBtn = document.getElementById('tutorial-tooltip-speak-btn');
      if (speakBtn) speakBtn.click();
      setCurrentStep(9);
      return;
    }

    if (currentStep === 9) {
      // Simulate clicking Add to Deck inside the dictionary modal
      const addBtn = document.getElementById('tutorial-tooltip-add-btn');
      if (addBtn) {
        addBtn.click();
      } else {
        window.dispatchEvent(new Event('tutorial-tooltip-saved'));
      }
      return;
    }

    if (currentStep === 10) {
      // Swipe Gestures: manual next step, just advance to SRS Memory Rating (step 11)
      setCurrentStep(11);
      return;
    }

    if (currentStep === 11) {
      // Simulate SRS memory button click
      const easyBtn = document.querySelector('#tutorial-srs-buttons button:last-child');
      if (easyBtn) {
        easyBtn.click();
      } else {
        window.dispatchEvent(new Event('tutorial-srs-clicked'));
      }
      return;
    }

    if (currentStep === 12) {
      // Simulate curriculum switcher click
      const switcherBtn = document.getElementById('tutorial-profile-curriculum');
      if (switcherBtn) {
        switcherBtn.click();
      } else {
        window.dispatchEvent(new Event('tutorial-curriculum-opened'));
      }
      return;
    }

    if (currentStep === 13) {
      // Simulate selecting Self-Study option
      const selfStudyBtn = document.getElementById('tutorial-curriculum-option-self-study');
      if (selfStudyBtn) {
        selfStudyBtn.click();
      } else {
        window.dispatchEvent(new CustomEvent('tutorial-curriculum-selected', { detail: { id: 'Self-Study only' } }));
      }
      return;
    }

    if (currentStep === 14) {
      // Simulate SRS stage detail open
      window.dispatchEvent(new Event('tutorial-srs-modal-opened'));
      return;
    }

    if (currentStep < TUTORIAL_STEPS.length - 1) {
      const nextStep = currentStep + 1;
      setCurrentStep(nextStep);
      if (TUTORIAL_STEPS[nextStep].path !== location.pathname) {
        navigate(TUTORIAL_STEPS[nextStep].path);
      }
    } else {
      handleClose();
    }
  };
  const getTooltipStyle = () => {

    // For SRS Rating Buttons (step 11) in Purge: place above the buttons to avoid covering them
    if (currentStep === 11) {
      return {
        position: 'fixed',
        bottom: '195px',
        left: '50%',
        transform: 'translateX(-50%)',
        width: '92%',
        maxWidth: '340px',
        zIndex: 100004
      };
    }

    // Keep tip at the bottom of the viewport for profile modal switcher steps (steps 13-14)
    if (currentStep === 13 || currentStep === 14) {
      return {
        position: 'fixed',
        bottom: '20px',
        left: '50%',
        transform: 'translateX(-50%)',
        width: '90%',
        maxWidth: '320px',
        zIndex: 100004
      };
    }

    if (!highlightRect || isWrongPath) {
      return {
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '90%',
        maxWidth: '320px',
        zIndex: 100004
      };
    }

    const { top, left, width, height } = highlightRect;
    const isTop = stepConf.position === 'top';
    
    // Get container dimensions to constrain tooltip within the app frame boundaries
    const containerEl = document.querySelector('.app-container') || document.querySelector('#root');
    const containerWidth = containerEl ? containerEl.clientWidth : window.innerWidth;
    const containerHeight = containerEl ? containerEl.clientHeight : window.innerHeight;
    
    const calculatedTop = isTop 
      ? Math.max(10, top - (currentStep === 3 ? 220 : currentStep === 4 ? 245 : 180)) 
      : (top + height + 15);

    // If bottom positioning would overflow the visible viewport/container
    if (!isTop && calculatedTop + 180 > containerHeight) {
      return {
        position: 'absolute',
        left: `${Math.max(10, Math.min(containerWidth - 310, left + width / 2 - 150))}px`,
        bottom: '90px',
        width: '300px',
        zIndex: 100004,
      };
    }
    
    return {
      position: 'absolute',
      left: `${Math.max(10, Math.min(containerWidth - 310, left + width / 2 - 150))}px`,
      top: `${calculatedTop}px`,
      width: '300px',
      zIndex: 100004,
    };
  };

  const isSwipeStep = currentStep === 3;
  const backdropPointerEvents = isSwipeStep ? 'none' : 'auto';

  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 99999, pointerEvents: 'none' }}>
      <AnimatePresence mode="wait">
        {isMinimized ? (
          /* ===== MINIMIZED PILL ===== */
          <motion.div
            key="minimized-pill"
            drag
            dragConstraints={{ left: 0, right: window.innerWidth - 200, top: 0, bottom: window.innerHeight - 100 }}
            dragElastic={0.1}
            dragMomentum={false}
            initial={{ opacity: 0, x: -50, y: 0, scale: 0.8 }}
            animate={{ opacity: 1, x: 0, y: 0, scale: 1 }}
            exit={{ opacity: 0, x: -50, scale: 0.8 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            onClick={(e) => {
              // Only expand if the user tapped, not dragged
              handleExpand();
            }}
            style={{
              position: 'fixed',
              top: '45%',
              left: '16px',
              zIndex: 100010,
              pointerEvents: 'auto',
              cursor: 'grab',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 16px',
              borderRadius: '24px',
              background: 'rgba(15, 23, 42, 0.92)',
              border: '1.5px solid rgba(251, 191, 36, 0.4)',
              backdropFilter: 'blur(15px)',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5), 0 0 15px rgba(251, 191, 36, 0.15)',
              whiteSpace: 'nowrap',
              touchAction: 'none' // Essential for mobile drag support
            }}
            whileTap={{ cursor: 'grabbing' }}
          >
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
              style={{ display: 'flex', alignItems: 'center' }}
            >
              <HelpCircle size={14} color="#facc15" />
            </motion.div>
            <span style={{ fontSize: '0.7rem', color: '#facc15', fontWeight: 800 }}>
              Step {currentStep + 1}/{TUTORIAL_STEPS.length}
            </span>
            <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.6)', fontWeight: 600, maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {stepConf.title}
            </span>
            <Maximize2 size={12} color="rgba(255,255,255,0.4)" />
          </motion.div>
        ) : (
          /* ===== EXPANDED FULL TUTORIAL ===== */
          <motion.div
            key="expanded-tutorial"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {/* Dark Spotlight Backdrop Overlay */}
            {highlightRect && !isWrongPath ? (
              <>
                {/* Spotlight Backdrop Panels relative to app-container */}
                <div 
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: `${Math.max(0, highlightRect.top)}px`,
                    background: 'rgba(0, 0, 0, 0.75)',
                    zIndex: 100000,
                    pointerEvents: backdropPointerEvents
                  }}
                />
                <div 
                  style={{
                    position: 'absolute',
                    top: `${highlightRect.top + highlightRect.height}px`,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(0, 0, 0, 0.75)',
                    zIndex: 100000,
                    pointerEvents: backdropPointerEvents
                  }}
                />
                <div 
                  style={{
                    position: 'absolute',
                    top: `${highlightRect.top}px`,
                    left: 0,
                    width: `${Math.max(0, highlightRect.left)}px`,
                    height: `${highlightRect.height}px`,
                    background: 'rgba(0, 0, 0, 0.75)',
                    zIndex: 100000,
                    pointerEvents: backdropPointerEvents
                  }}
                />
                <div 
                  style={{
                    position: 'absolute',
                    top: `${highlightRect.top}px`,
                    left: `${highlightRect.left + highlightRect.width}px`,
                    right: 0,
                    height: `${highlightRect.height}px`,
                    background: 'rgba(0, 0, 0, 0.75)',
                    zIndex: 100000,
                    pointerEvents: backdropPointerEvents
                  }}
                />
              </>
            ) : (
              <div 
                style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'rgba(0, 0, 0, 0.75)',
                  zIndex: 100000,
                  pointerEvents: backdropPointerEvents
                }}
              />
            )}

            {/* Spotlight highlight border around targeted element */}
            {highlightRect && !isWrongPath && (
              <motion.div
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                style={{
                  position: 'absolute',
                  top: highlightRect.top - 6,
                  left: highlightRect.left - 6,
                  width: highlightRect.width + 12,
                  height: highlightRect.height + 12,
                  borderRadius: '16px',
                  border: (() => {
                    const containerEl = document.querySelector('.app-container') || document.querySelector('#root');
                    const containerWidth = containerEl ? containerEl.clientWidth : window.innerWidth;
                    const isFullWidth = highlightRect.width >= (containerWidth - 24);
                    return isFullWidth ? 'none' : '3px solid #fbbf24';
                  })(),
                  boxShadow: (() => {
                    const containerEl = document.querySelector('.app-container') || document.querySelector('#root');
                    const containerWidth = containerEl ? containerEl.clientWidth : window.innerWidth;
                    const isFullWidth = highlightRect.width >= (containerWidth - 24);
                    return isFullWidth ? 'none' : '0 0 20px #fbbf2460';
                  })(),
                  zIndex: 100003,
                  pointerEvents: 'none'
                }}
              />
            )}

            {/* Finger pointers for other steps to click/tap targets */}
            {highlightRect && !isWrongPath && (
              currentStep === 0 || 
              currentStep === 1 || 
              currentStep === 4 || 
              currentStep === 7 || 
              currentStep === 9 || 
              currentStep === 11 || 
              currentStep === 12 ||
              currentStep === 13 ||
              currentStep === 14
            ) && (
              <motion.div
                animate={{ y: [0, -8, 0] }}
                transition={{ repeat: Infinity, duration: 1.2, ease: "easeInOut" }}
                style={{
                  position: 'absolute',
                  top: highlightRect.top - 48,
                  left: highlightRect.left + (highlightRect.width / 2) - 17,
                  zIndex: 100005,
                  pointerEvents: 'none'
                }}
              >
                <PremiumFingerPointer direction="down" />
              </motion.div>
            )}

            {/* Finger tap animation inside the middle of target for card reveal steps */}
            {highlightRect && !isWrongPath && (currentStep === 5 || currentStep === 6) && (
              <motion.div
                animate={{ scale: [1, 1.12, 1], opacity: [0.95, 1, 0.95] }}
                transition={{ repeat: Infinity, duration: 1.0, ease: "easeInOut" }}
                style={{
                  position: 'absolute',
                  top: highlightRect.top + (highlightRect.height / 2) - 20,
                  left: highlightRect.left + (highlightRect.width / 2) - 17,
                  zIndex: 100005,
                  pointerEvents: 'none'
                }}
              >
                <PremiumFingerPointer direction="up" />
              </motion.div>
            )}

            {/* Finger pointer for Step 8 (Sound) pointing at the speaker icon */}
            {speakBtnRect && currentStep === 8 && (
              <motion.div
                animate={{ x: [0, -6, 0] }}
                transition={{ repeat: Infinity, duration: 0.8, ease: "easeInOut" }}
                style={{
                  position: 'absolute',
                  top: speakBtnRect.top + (speakBtnRect.height / 2) - 18,
                  left: speakBtnRect.left + speakBtnRect.width + 6,
                  zIndex: 100008,
                  pointerEvents: 'none'
                }}
              >
                <PremiumFingerPointer direction="left" />
              </motion.div>
            )}

            {/* Tooltip Card */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              style={{ ...getTooltipStyle(), pointerEvents: 'auto' }}
            >
              <div 
                className="glass-panel" 
                style={{ 
                  padding: '1rem 1rem 0.8rem', 
                  borderRadius: '20px', 
                  background: 'rgba(15, 23, 42, 0.95)',
                  border: '1px solid rgba(251, 191, 36, 0.3)',
                  boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                  boxSizing: 'border-box',
                  position: 'relative'
                }}
              >
                {/* Visual Arrow Indicator pointing to highlight */}
                {highlightRect && !isWrongPath && (
                  <div style={{
                    position: 'absolute',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: 0,
                    height: 0,
                    borderLeft: '8px solid transparent',
                    borderRight: '8px solid transparent',
                    zIndex: 100006,
                    ...(TUTORIAL_STEPS[currentStep]?.position === 'bottom' ? {
                      top: '-8px',
                      borderBottom: '8px solid rgba(15, 23, 42, 0.98)'
                    } : {
                      bottom: '-8px',
                      borderTop: '8px solid rgba(15, 23, 42, 0.98)'
                    })
                  }} />
                )}
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '0.6rem', background: '#facc1520', color: '#facc15', padding: '0.12rem 0.45rem', borderRadius: '6px', fontWeight: 900, display: 'flex', alignItems: 'center', gap: '3px' }}>
                    <HelpCircle size={9} /> STEP {currentStep + 1} OF {TUTORIAL_STEPS.length}
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <button 
                      onClick={handleMinimize}
                      style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', padding: '2px' }}
                      title="Minimize tutorial"
                    >
                      <Minimize2 size={13} />
                    </button>
                    <button 
                      onClick={handleClose} 
                      style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', padding: '2px' }}
                    >
                      <X size={14} />
                    </button>
                  </div>
                </div>

                {/* Guide Text */}
                {isWrongPath ? (
                  <div>
                    <h4 style={{ margin: '0 0 0.3rem 0', color: 'white', fontWeight: 800, fontSize: '0.88rem' }}>Open the next page</h4><p style={{ margin: 0, fontSize: '0.72rem', color: '#cbd5e1', lineHeight: '1.55' }}>Use the bottom navigation bar to open {stepConf.path === '/purge' ? 'Flashcards' : (stepConf.path === '/profile' ? 'My Profile' : 'Translate')} and continue the guide.</p></div>) : (
                  <div>
                    <h4 style={{ margin: '0 0 0.3rem 0', color: 'white', fontWeight: 800, fontSize: '0.88rem' }}>
                      {stepConf.title}
                    </h4>
                     <p style={{ margin: 0, fontSize: '0.72rem', color: '#cbd5e1', lineHeight: '1.55' }} dangerouslySetInnerHTML={{ __html: stepConf.text }} />
                  </div>
                )}

                {/* Action buttons */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.7rem', paddingTop: '0.5rem', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                  <button 
                    onClick={handleClose}
                    style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', fontSize: '0.68rem', cursor: 'pointer', fontWeight: 700 }}
                  >
                    Skip
                  </button>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {currentStep < TUTORIAL_STEPS.length - 1 ? (
                      <button 
                        onClick={handleNext}
                        className="glass-button animate-scale"
                        style={completedSteps[currentStep] ? { 
                          padding: '0.35rem 0.75rem', 
                          borderRadius: '10px', 
                          fontSize: '0.72rem', 
                          fontWeight: 900,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '3px',
                          border: '2.5px solid #facc15',
                          background: 'rgba(250, 204, 21, 0.18)',
                          color: '#facc15',
                          boxShadow: '0 0 15px rgba(250, 204, 21, 0.35)',
                          cursor: 'pointer'
                        } : {
                          padding: '0.3rem 0.65rem', 
                          borderRadius: '8px', 
                          fontSize: '0.7rem', 
                          fontWeight: 700,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '2px',
                          border: '1.5px solid rgba(255,255,255,0.15)',
                          background: 'rgba(255,255,255,0.04)',
                          color: 'rgba(255,255,255,0.7)',
                          cursor: 'pointer'
                        }}
                      >
                        <span>Next</span>
                        <ChevronRight size={11} />
                      </button>
                    ) : (
                      <button 
                        onClick={handleNext}
                        className="glass-button primary animate-scale"
                        style={{ 
                          padding: '0.35rem 0.75rem', 
                          borderRadius: '10px', 
                          fontSize: '0.72rem', 
                          fontWeight: 900,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '3px',
                          border: '2.5px solid #facc15',
                          background: 'rgba(250, 204, 21, 0.18)',
                          color: '#facc15',
                          boxShadow: '0 0 15px rgba(250, 204, 21, 0.35)'
                        }}
                      >
                        <span>Finish</span>
                        <ChevronRight size={11} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
