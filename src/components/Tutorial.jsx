import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import { X, ChevronRight, HelpCircle } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';

const TUTORIAL_STEPS = [
  {
    path: '/',
    selector: '#tutorial-translate-input',
    title: 'Translate Word',
    text: 'พิมพ์คำศัพท์ที่ต้องการเรียนรู้ลงในช่องค้นหา เช่น hello แล้วกดปุ่มแปลภาษาหรือกด Enter',
    position: 'bottom'
  },
  {
    path: '/',
    selector: '.results-drag-wrapper',
    title: 'Swipe to Save',
    text: 'ลองปัดการ์ดผลลัพธ์นี้ไปทางขวา เพื่อบันทึกคำศัพท์เข้าสู่เด็คทบทวนของคุณ',
    position: 'bottom'
  },
  {
    path: '/purge',
    selector: '#tutorial-flashcard-card',
    title: 'Flashcard Deck',
    text: 'การ์ดคำศัพท์ที่คุณกำลังเรียนอยู่ ลองแตะที่การ์ดเบาๆ เพื่อเปิดเผยคำอธิบายภาษาอังกฤษและตัวอย่างประโยค',
    position: 'bottom'
  },
  {
    path: '/purge',
    selector: '#tutorial-flashcard-card',
    title: 'Reveal Thai Translation',
    text: 'ลองแตะที่การ์ดอีกครั้ง เพื่อเปิดเผยคำแปลภาษาไทยและแถบปุ่มระบบช่วยจำ',
    position: 'bottom'
  },
  {
    path: '/purge',
    selector: '#tutorial-srs-buttons',
    title: 'SRS Memory Rating',
    text: 'เลือกความยากง่ายเพื่อกำหนดระยะทบทวนในอนาคต ลองกดปุ่มระดับความจำปุ่มใดก็ได้ เช่น Easy หรือ Normal เพื่อเรียนรู้ต่อ',
    position: 'top'
  },
  {
    path: '/profile',
    selector: '#tutorial-profile-curriculum',
    title: 'Curriculum Switcher',
    text: 'กดเลือกปุ่มหลักสูตรนี้ เพื่อเปิดตัวเลือกการสลับโหมดคำศัพท์ เช่น Oxford 5000 หรือ TOEIC',
    position: 'bottom'
  },
  {
    path: '/profile',
    selector: '#tutorial-profile-srs',
    title: 'SRS Memory Stages',
    text: 'ลองกดที่ปุ่มระดับความจำกลุ่มใดก็ได้ เช่น Learning หรือ Mastered เพื่อแสดงรายชื่อคำศัพท์ของกลุ่มนั้น',
    position: 'bottom'
  },
  {
    path: '/profile',
    selector: '#tutorial-profile-progress',
    title: 'Curriculum Progress',
    text: 'แถบแสดงจำนวนคำศัพท์ที่เพิ่มเข้าสู่การเรียนรู้จริงเปรียบเทียบกับคำศัพท์ทั้งหมด ยินดีด้วย! การแนะนำโปรแกรมเสร็จสิ้นแล้ว กดปุ่ม Finish เพื่อเริ่มใช้งานจริงได้เลย',
    position: 'top'
  }
];

export const Tutorial = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { theme } = useTheme();
  const { user } = useAuth();
  
  const [active, setActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [highlightRect, setHighlightRect] = useState(null);
  const [viewportRect, setViewportRect] = useState(null);

  const hasInitializedRef = useRef(false);

  // Check if tutorial needs to run on mount / login
  useEffect(() => {
    if (!user) {
      hasInitializedRef.current = false;
      setActive(false);
      return;
    }

    if (hasInitializedRef.current) return;

    const isDone = localStorage.getItem('memeng_tutorial_done') === 'true';
    if (!isDone) {
      hasInitializedRef.current = true;
      setActive(true);
      setCurrentStep(0);
      if (location.pathname !== '/') {
        navigate('/');
      }
    }
  }, [user]);

  // Listen to hamburger trigger
  useEffect(() => {
    const handleTrigger = () => {
      if (!user) return;
      localStorage.setItem('memeng_tutorial_done', 'false');
      setActive(true);
      setCurrentStep(0);
      navigate('/');
    };
    window.addEventListener('trigger-tutorial', handleTrigger);
    return () => window.removeEventListener('trigger-tutorial', handleTrigger);
  }, [user, navigate]);

  // Listen to interactive events to auto-advance steps
  useEffect(() => {
    if (!active) return;

    const handleTranslated = () => {
      if (currentStep === 0) {
        setTimeout(() => {
          handleNext();
        }, 800);
      }
    };

    const handleWordSaved = () => {
      if (currentStep === 1) {
        setTimeout(() => {
          handleNext();
        }, 800);
      }
    };

    const handleCardRevealed = () => {
      if (currentStep === 2) {
        setTimeout(() => {
          handleNext();
        }, 800);
      }
    };

    const handleCardFullyRevealed = () => {
      if (currentStep === 3) {
        setTimeout(() => {
          handleNext();
        }, 800);
      }
    };

    const handleSrsClicked = () => {
      if (currentStep === 4) {
        setTimeout(() => {
          handleNext();
        }, 800);
      }
    };

    const handleCurriculumOpened = () => {
      if (currentStep === 5) {
        setTimeout(() => {
          window.dispatchEvent(new Event('tutorial-close-modals'));
          handleNext();
        }, 1500);
      }
    };

    const handleSrsModalOpened = () => {
      if (currentStep === 6) {
        setTimeout(() => {
          window.dispatchEvent(new Event('tutorial-close-modals'));
          handleNext();
        }, 2000);
      }
    };

    window.addEventListener('tutorial-translated', handleTranslated);
    window.addEventListener('tutorial-word-saved', handleWordSaved);
    window.addEventListener('tutorial-card-revealed', handleCardRevealed);
    window.addEventListener('tutorial-card-fully-revealed', handleCardFullyRevealed);
    window.addEventListener('tutorial-srs-clicked', handleSrsClicked);
    window.addEventListener('tutorial-curriculum-opened', handleCurriculumOpened);
    window.addEventListener('tutorial-srs-modal-opened', handleSrsModalOpened);

    return () => {
      window.removeEventListener('tutorial-translated', handleTranslated);
      window.removeEventListener('tutorial-word-saved', handleWordSaved);
      window.removeEventListener('tutorial-card-revealed', handleCardRevealed);
      window.removeEventListener('tutorial-card-fully-revealed', handleCardFullyRevealed);
      window.removeEventListener('tutorial-srs-clicked', handleSrsClicked);
      window.removeEventListener('tutorial-curriculum-opened', handleCurriculumOpened);
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

    // Wait for slide transitions to complete before measuring/observing
    timerId = setTimeout(() => {
      const startTime = Date.now();
      const duration = 1200; // Poll for 1.2s to track final position shifts

      const updatePosition = () => {
        const el = document.querySelector(stepConf.selector);
        const containerEl = document.querySelector('.app-container') || document.querySelector('#root');
        
        if (el && containerEl) {
          const rect = el.getBoundingClientRect();
          const containerRect = containerEl.getBoundingClientRect();
          
          if (rect.width > 0 && rect.height > 0) {
            setHighlightRect({
              top: rect.top - containerRect.top,
              left: rect.left - containerRect.left,
              width: rect.width,
              height: rect.height
            });
            setViewportRect({
              top: rect.top,
              left: rect.left,
              width: rect.width,
              height: rect.height,
              bottom: rect.bottom,
              right: rect.right
            });
          }
        } else {
          setHighlightRect(null);
          setViewportRect(null);
        }

        if (Date.now() - startTime < duration) {
          frameId = requestAnimationFrame(updatePosition);
        }
      };

      // Run initial check and start frame loop
      updatePosition();

      // Smooth scroll showcase behavior
      if (currentStep === 1) {
        const scrollContainer = document.querySelector('.scrollable-content');
        if (scrollContainer) {
          scrollContainer.scrollTo({ top: 400, behavior: 'smooth' });
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
      if (timerId) clearTimeout(timerId);
      if (frameId) cancelAnimationFrame(frameId);
    };
  }, [currentStep, location.pathname, active]);

  if (!active) return null;

  const stepConf = TUTORIAL_STEPS[currentStep];
  const isWrongPath = stepConf && location.pathname !== stepConf.path;

  const handleNext = () => {
    if (currentStep === 0) {
      const textarea = document.querySelector('#tutorial-translate-input textarea');
      if (textarea && textarea.value.trim().length === 0) {
        window.dispatchEvent(new CustomEvent('tutorial-type-word', { detail: { word: 'hello' } }));
        return;
      }
    }
    
    if (currentStep === 1) {
      window.dispatchEvent(new Event('tutorial-save-word'));
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

  const handleClose = () => {
    setActive(false);
    localStorage.setItem('memeng_tutorial_done', 'true');
    // Ensure all modals are closed when exiting tutorial
    window.dispatchEvent(new Event('tutorial-close-modals'));
  };

  const getTooltipStyle = () => {
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
    
    return {
      position: 'absolute',
      left: `${Math.max(10, Math.min(containerWidth - 310, left + width / 2 - 150))}px`,
      top: isTop 
        ? `${Math.max(10, top - 180)}px` 
        : `${top + height + 15}px`,
      width: '300px',
      zIndex: 100004,
    };
  };

  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 99999, pointerEvents: 'auto' }}>
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
              backdropFilter: 'blur(3px)',
              WebkitBackdropFilter: 'blur(3px)',
              zIndex: 100000,
              pointerEvents: 'auto'
            }}
            onClick={handleNext}
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
              backdropFilter: 'blur(3px)',
              WebkitBackdropFilter: 'blur(3px)',
              zIndex: 100000,
              pointerEvents: 'auto'
            }}
            onClick={handleNext}
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
              backdropFilter: 'blur(3px)',
              WebkitBackdropFilter: 'blur(3px)',
              zIndex: 100000,
              pointerEvents: 'auto'
            }}
            onClick={handleNext}
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
              backdropFilter: 'blur(3px)',
              WebkitBackdropFilter: 'blur(3px)',
              zIndex: 100000,
              pointerEvents: 'auto'
            }}
            onClick={handleNext}
          />
        </>
      ) : (
        <div 
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(3px)',
            WebkitBackdropFilter: 'blur(3px)',
            zIndex: 100000,
            pointerEvents: 'auto'
          }}
          onClick={handleNext}
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

      {/* Tooltip Card */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        style={getTooltipStyle()}
      >
        <div 
          className="glass-panel" 
          style={{ 
            padding: '1.2rem', 
            borderRadius: '20px', 
            background: 'rgba(15, 23, 42, 0.95)',
            border: '1px solid rgba(251, 191, 36, 0.3)',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
            boxSizing: 'border-box'
          }}
        >
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.65rem' }}>
            <span style={{ fontSize: '0.65rem', background: '#facc1520', color: '#facc15', padding: '0.15rem 0.5rem', borderRadius: '6px', fontWeight: 900, display: 'flex', alignItems: 'center', gap: '3px' }}>
              <HelpCircle size={10} /> STEP {currentStep + 1} OF {TUTORIAL_STEPS.length}
            </span>
            <button 
              onClick={handleClose} 
              style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', padding: '2px' }}
            >
              <X size={14} />
            </button>
          </div>

          {/* Guide Text */}
          {isWrongPath ? (
            <div>
              <h4 style={{ margin: '0 0 0.4rem 0', color: 'white', fontWeight: 800, fontSize: '0.95rem' }}>
                สลับหน้าจอเพื่อเรียนรู้ต่อ
              </h4>
              <p style={{ margin: 0, fontSize: '0.78rem', color: '#cbd5e1', lineHeight: '1.6' }}>
                กรุณากดเลือกแถบนำทางที่ {stepConf.path === '/purge' ? 'Flashcards' : (stepConf.path === '/profile' ? 'Profile' : 'Translate')} ด้านล่างของจอเพื่อดูขั้นตอนสอนการใช้งานถัดไปครับ!
              </p>
            </div>
          ) : (
            <div>
              <h4 style={{ margin: '0 0 0.4rem 0', color: 'white', fontWeight: 800, fontSize: '0.95rem' }}>
                {stepConf.title}
              </h4>
              <p style={{ margin: 0, fontSize: '0.78rem', color: '#cbd5e1', lineHeight: '1.6' }}>
                {stepConf.text}
              </p>
            </div>
          )}

          {/* Action buttons */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.1rem', paddingTop: '0.65rem', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <button 
              onClick={handleClose}
              style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', fontSize: '0.72rem', cursor: 'pointer', fontWeight: 700 }}
            >
              Skip
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              {currentStep < TUTORIAL_STEPS.length - 1 ? (
                <button 
                  onClick={handleNext}
                  className="glass-button secondary animate-scale"
                  style={{ 
                    padding: '0.35rem 0.75rem', 
                    borderRadius: '8px', 
                    fontSize: '0.75rem', 
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '2px',
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: 'white'
                  }}
                >
                  <span>ถัดไป</span>
                  <ChevronRight size={12} />
                </button>
              ) : (
                <button 
                  onClick={handleNext}
                  className="glass-button primary animate-scale"
                  style={{ 
                    padding: '0.35rem 0.75rem', 
                    borderRadius: '8px', 
                    fontSize: '0.75rem', 
                    fontWeight: 800,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '2px'
                  }}
                >
                  <span>Finish</span>
                  <ChevronRight size={12} />
                </button>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
