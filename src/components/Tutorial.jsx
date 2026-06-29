import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import { X, ChevronRight, HelpCircle, Minimize2, Maximize2 } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useVocab } from '../context/VocabContext';

const TUTORIAL_STEPS = [
  {
    path: '/',
    selector: '#tutorial-translate-input',
    title: 'Translate Word',
    text: 'พิมพ์คำศัพท์ที่ต้องการเรียนรู้ลงในช่องค้นหา เช่น hello (พิมพ์ตัวอักษรใดก็ได้ ระบบจะป้อนคำว่า hello ให้อัตโนมัติ)',
    position: 'bottom'
  },
  {
    path: '/',
    selector: '#tutorial-translate-submit-btn',
    title: 'Click Translate',
    text: 'เก่งมาก! ตอนนี้กดปุ่ม Translate เพื่อแปลคำศัพท์ผ่านระบบจำลองออฟไลน์',
    position: 'bottom'
  },
  {
    path: '/',
    selector: '.results-drag-wrapper',
    title: 'Explore AI Card',
    text: 'ผลการเรียนรู้ผ่าน AI ได้รับการจัดรูปแบบเป็นการ์ดสวยงาม ลองปัดหน้าจอเลื่อนขึ้น-ลงเพื่อสำรวจเนื้อหา ตัวอย่างประโยค และรูปภาพประกอบให้ครบก่อน เมื่อดูเสร็จแล้ว ให้คลิกปุ่ม "ถัดไป" เพื่อไปขั้นตอนต่อไป',
    position: 'top'
  },
  {
    path: '/',
    selector: '#tutorial-tinder-save-btn',
    title: 'Swipe or Tap to Save',
    text: 'ลองปัดการ์ดไปทางขวาเพื่อบันทึก หรือจะกดปุ่ม Save สีเขียวเพื่อบันทึกทันทีก็ได้จ้า (ปัดซ้ายหรือกดปุ่ม Back สีแดงเพื่อยกเลิก)',
    position: 'top'
  },
  {
    path: '/purge',
    selector: '#tutorial-flashcard-card',
    title: 'Flashcard Deck',
    text: 'การ์ดคำศัพท์ที่คุณกำลังเรียนอยู่ ลองแตะที่การ์ดเบาๆ เพื่อเปิดเผยคำอธิบายภาษาอังกฤษและตัวอย่างประโยค',
    position: 'top'
  },
  {
    path: '/purge',
    selector: '#tutorial-flashcard-card',
    title: 'Reveal Thai Translation',
    text: 'ลองแตะที่การ์ดอีกครั้ง เพื่อเปิดเผยคำแปลภาษาไทยและแถบปุ่มระบบช่วยจำ',
    position: 'top'
  },
  {
    path: '/purge',
    selector: '#tutorial-word-today',
    title: 'Dictionary Lookup',
    text: 'ลองแตะที่คำว่า today หรือคำศัพท์ใดก็ได้ในประโยคตัวอย่างเพื่อจำลองการเปิดพจนานุกรมความหมายด่วน',
    position: 'top'
  },
  {
    path: '/purge',
    selector: '#tutorial-tooltip-info-container',
    title: 'Word Details & Sound',
    text: 'นี่คือความหมายและคำแปลภาษาไทยของคำศัพท์ที่แตะ ลองอ่านทบทวนหรือแตะปุ่มลำโพงเพื่อทดลองฟังเสียงพูดออกเสียงได้จ้า เสร็จแล้วกดปุ่ม "ถัดไป"',
    position: 'bottom',
    padding: 12
  },
  {
    path: '/purge',
    selector: '#tutorial-tooltip-add-btn',
    title: 'Add Word to Deck',
    text: 'แตะปุ่ม "Add to Deck" เพื่อเก็บสะสมคำศัพท์นั้นเข้าคลังเรียนรู้ของคุณทันที',
    position: 'bottom'
  },
  {
    path: '/purge',
    selector: '#tutorial-srs-buttons',
    title: 'SRS Memory Rating',
    text: 'เลือกความยากง่ายเพื่อกำหนดระยะทบทวนในอนาคต ลองกดปุ่มระดับความจำปุ่มใดก็ได้ เช่น Easy หรือ Normal เพื่อเรียนรู้ต่อ',
    position: 'top',
    padding: 6
  },
  {
    path: '/profile',
    selector: '#tutorial-profile-curriculum',
    title: 'Curriculum Switcher',
    text: 'กดเลือกปุ่มหลักสูตรนี้ เพื่อเปิดตัวเลือกการสลับโหมดคำศัพท์',
    position: 'bottom',
    padding: 4
  },
  {
    path: '/profile',
    selector: '#tutorial-profile-curriculum-modal-content',
    title: 'Choose Curriculum Focus',
    text: 'นี่คือรายการตัวเลือกหลักสูตรที่เลือกเล่นได้ เช่น Oxford หรือ TOEIC แตะเลือกหลักสูตรที่สนใจ หรือแตะเลือก Self-Study เพื่อใช้งานโหมดคำศัพท์ทั่วไปตามเดิม แล้วกดปุ่มถัดไป',
    position: 'top',
    padding: 10
  },
  {
    path: '/profile',
    selector: '#tutorial-profile-srs',
    title: 'SRS Memory Stages',
    text: 'ลองกดที่ปุ่มระดับความจำกลุ่มใดก็ได้ เช่น Learning หรือ Mastered เพื่อแสดงรายชื่อคำศัพท์ของกลุ่มนั้น',
    position: 'top',
    padding: 6
  },
  {
    path: '/profile',
    selector: null,
    title: 'Profile Summary',
    text: 'หน้านี้เป็นส่วนของโปรไฟล์ผู้ใช้ เพื่อดูสถิติและคำศัพท์ทั้งหมดที่คุณได้เรียนและสะสมมาครับ ยินดีด้วย! การแนะนำโปรแกรมเสร็จสิ้นแล้ว ระบบจะพาคุณกลับไปหน้าค้นหาเพื่อเริ่มต้นใหม่ครับ',
    position: 'top'
  }
];

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
  const [isMinimized, setIsMinimized] = useState(false);
  const [showOptIn, setShowOptIn] = useState(false);
  const autoMinimizeTimerRef = useRef(null);

  const hasInitializedRef = useRef(false);

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
      handleClose();
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
        next[3] = true;
        return next;
      });
      if (currentStep === 3) {
        setTimeout(() => {
          setCurrentStep(4);
          navigate('/purge');
        }, 800);
      }
    };

    const handleCardRevealed = () => {
      setCompletedSteps(prev => {
        const next = [...prev];
        next[4] = true;
        return next;
      });
      if (currentStep === 4) {
        setTimeout(() => {
          setCurrentStep(5);
        }, 800);
      }
    };

    const handleCardFullyRevealed = () => {
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

    const handleTooltipOpened = (e) => {
      setCompletedSteps(prev => {
        const next = [...prev];
        next[6] = true;
        return next;
      });
      if (currentStep === 6) {
        setTimeout(() => {
          setCurrentStep(7);
        }, 1500);
      }
    };

    const handleTooltipSpoken = () => {
      setCompletedSteps(prev => {
        const next = [...prev];
        next[7] = true;
        return next;
      });
      if (currentStep === 7) {
        setTimeout(() => {
          setCurrentStep(8);
        }, 1000);
      }
    };

    const handleTooltipSaved = () => {
      setCompletedSteps(prev => {
        const next = [...prev];
        next[8] = true;
        return next;
      });
      if (currentStep === 8) {
        setTimeout(() => {
          setCurrentStep(9);
        }, 800);
      }
    };

    const handleSrsClicked = () => {
      setCompletedSteps(prev => {
        const next = [...prev];
        next[9] = true;
        return next;
      });
      if (currentStep === 9) {
        setTimeout(() => {
          setCurrentStep(10);
          navigate('/profile');
        }, 800);
      }
    };

    const handleCurriculumOpened = () => {
      setCompletedSteps(prev => {
        const next = [...prev];
        next[10] = true;
        return next;
      });
      if (currentStep === 10) {
        setTimeout(() => {
          setCurrentStep(11);
        }, 300);
      }
    };

    const handleCurriculumSelected = () => {
      setCompletedSteps(prev => {
        const next = [...prev];
        next[11] = true;
        return next;
      });
      if (currentStep === 11) {
        setTimeout(() => {
          setCurrentStep(12);
        }, 800);
      }
    };

    const handleSrsModalOpened = () => {
      setCompletedSteps(prev => {
        const next = [...prev];
        next[12] = true;
        return next;
      });
      if (currentStep === 12) {
        setTimeout(() => {
          window.dispatchEvent(new Event('tutorial-close-modals'));
          setCurrentStep(13);
        }, 2000);
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
      // Move to Step 3: Swipe/tap to Save
      setCurrentStep(3);
      return;
    }

    if (currentStep === 3) {
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

    if (currentStep === 4) {
      // Simulate reveal front card click
      window.dispatchEvent(new Event('tutorial-card-revealed'));
      setCurrentStep(5);
      return;
    }

    if (currentStep === 5) {
      // Simulate reveal back card click
      window.dispatchEvent(new Event('tutorial-card-fully-revealed'));
      setCurrentStep(6);
      return;
    }

    if (currentStep === 6) {
      // Simulate clicking the "today" word
      const todaySpan = document.getElementById('tutorial-word-today') || document.getElementById('tutorial-word-greeting');
      if (todaySpan) {
        todaySpan.click();
      } else {
        window.dispatchEvent(new CustomEvent('tutorial-tooltip-opened', { detail: { word: 'today' } }));
      }
      return;
    }

    if (currentStep === 7) {
      // Play pronunciation and advance to Add to Deck step
      const speakBtn = document.getElementById('tutorial-tooltip-speak-btn');
      if (speakBtn) speakBtn.click();
      setCurrentStep(8);
      return;
    }

    if (currentStep === 8) {
      // Simulate clicking Add to Deck inside the dictionary modal
      const addBtn = document.getElementById('tutorial-tooltip-add-btn');
      if (addBtn) {
        addBtn.click();
      } else {
        window.dispatchEvent(new Event('tutorial-tooltip-saved'));
      }
      return;
    }

    if (currentStep === 9) {
      // Simulate SRS memory button click
      const easyBtn = document.querySelector('#tutorial-srs-buttons button:last-child');
      if (easyBtn) {
        easyBtn.click();
      } else {
        window.dispatchEvent(new Event('tutorial-srs-clicked'));
      }
      return;
    }

    if (currentStep === 10) {
      // Simulate curriculum switcher click
      const switcherBtn = document.getElementById('tutorial-profile-curriculum');
      if (switcherBtn) {
        switcherBtn.click();
      } else {
        window.dispatchEvent(new Event('tutorial-curriculum-opened'));
      }
      return;
    }

    if (currentStep === 11) {
      // Simulate selecting Self-Study option
      const selfStudyBtn = document.getElementById('tutorial-curriculum-option-self-study');
      if (selfStudyBtn) {
        selfStudyBtn.click();
      } else {
        window.dispatchEvent(new CustomEvent('tutorial-curriculum-selected', { detail: { id: 'Self-Study only' } }));
      }
      return;
    }

    if (currentStep === 12) {
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
  const handleClose = async () => {
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
    
    // Navigate home first to unmount /purge page and prevent race-condition empty-vocab render crashes
    navigate('/');

    try {
      await clearDeckAndResetStats();
    } catch (err) {
      console.error("Failed to clear deck on tutorial complete:", err);
    }
  };

  const getTooltipStyle = () => {
    // Keep tip at the bottom of the viewport for step 12 (index 11) so it does not overlay/block options
    if (currentStep === 11) {
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
      ? Math.max(10, top - (currentStep === 3 ? 220 : 180)) 
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
            {viewportRect && !isWrongPath ? (
              <>
                {/* Top Panel */}
                <div 
                  style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: `${viewportRect.top}px`,
                    background: 'rgba(0, 0, 0, 0.75)',
                    zIndex: 100000,
                    pointerEvents: backdropPointerEvents
                  }}
                />
                {/* Bottom Panel */}
                <div 
                  style={{
                    position: 'fixed',
                    top: `${viewportRect.bottom}px`,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(0, 0, 0, 0.75)',
                    zIndex: 100000,
                    pointerEvents: backdropPointerEvents
                  }}
                />
                {/* Left Panel */}
                <div 
                  style={{
                    position: 'fixed',
                    top: `${viewportRect.top}px`,
                    left: 0,
                    width: `${viewportRect.left}px`,
                    height: `${viewportRect.bottom - viewportRect.top}px`,
                    background: 'rgba(0, 0, 0, 0.75)',
                    zIndex: 100000,
                    pointerEvents: backdropPointerEvents
                  }}
                />
                {/* Right Panel */}
                <div 
                  style={{
                    position: 'fixed',
                    top: `${viewportRect.top}px`,
                    left: `${viewportRect.right}px`,
                    right: 0,
                    height: `${viewportRect.bottom - viewportRect.top}px`,
                    background: 'rgba(0, 0, 0, 0.75)',
                    zIndex: 100000,
                    pointerEvents: backdropPointerEvents
                  }}
                />
              </>
            ) : (
              <div 
                style={{
                  position: 'fixed',
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
                  border: '3px solid #fbbf24',
                  boxShadow: '0 0 20px #fbbf2460, 0 0 0 9999px rgba(0,0,0,0.5)',
                  zIndex: 100003,
                  pointerEvents: 'none'
                }}
              />
            )}

            {/* Bouncing emoji finger pointers for Step 0 (input hello) and Step 1 (click translate) */}
            {highlightRect && !isWrongPath && (currentStep === 0 || currentStep === 1) && (
              <motion.div
                animate={{ y: [0, -10, 0] }}
                transition={{ repeat: Infinity, duration: 1.2, ease: "easeInOut" }}
                style={{
                  position: 'absolute',
                  top: highlightRect.top - 45,
                  left: highlightRect.left + (highlightRect.width / 2) - 15,
                  zIndex: 100005,
                  fontSize: '1.8rem',
                  filter: 'drop-shadow(0 0 8px rgba(251, 191, 36, 0.85))',
                  pointerEvents: 'none'
                }}
              >
                👇
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
                      title="ย่อ Tutorial"
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
                    <h4 style={{ margin: '0 0 0.3rem 0', color: 'white', fontWeight: 800, fontSize: '0.88rem' }}>
                      สลับหน้าจอเพื่อเรียนรู้ต่อ
                    </h4>
                    <p style={{ margin: 0, fontSize: '0.72rem', color: '#cbd5e1', lineHeight: '1.55' }}>
                      กรุณากดเลือกแถบนำทางที่ {stepConf.path === '/purge' ? 'Flashcards' : (stepConf.path === '/profile' ? 'Profile' : 'Translate')} ด้านล่างของจอเพื่อดูขั้นตอนสอนการใช้งานถัดไปครับ!
                    </p>
                  </div>
                ) : (
                  <div>
                    <h4 style={{ margin: '0 0 0.3rem 0', color: 'white', fontWeight: 800, fontSize: '0.88rem' }}>
                      {stepConf.title}
                    </h4>
                    <p style={{ margin: 0, fontSize: '0.72rem', color: '#cbd5e1', lineHeight: '1.55' }}>
                      {stepConf.text}
                    </p>
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
                        <span>{completedSteps[currentStep] ? 'ถัดไป' : 'ข้าม'}</span>
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
