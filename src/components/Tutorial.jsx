import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useLocation, useNavigate } from 'react-router-dom';
import { CheckCircle2, ChevronLeft, Globe2, HelpCircle, X } from 'lucide-react';

const STEPS = [
  {
    path: '/', selector: '#tutorial-translate-input textarea', placement: 'bottom', section: 'Translate', completeOn: 'input',
    en: ['Type one English word', 'Enter a word you genuinely want to learn. This is your own live deck, so choose something useful.'],
    th: ['พิมพ์คำศัพท์อังกฤษ 1 คำ', 'ใส่คำที่อยากเรียนจริง ๆ นี่คือ deck จริงของคุณ เลือกคำที่มีประโยชน์ได้เลย'],
  },
  {
    path: '/', selector: '#tutorial-translate-submit-btn', placement: 'bottom', section: 'Translate', completeOn: 'click',
    en: ['Translate the word', 'Tap Translate and wait for the learning card to be prepared.'],
    th: ['แปลคำศัพท์', 'แตะ Translate แล้วรอให้ระบบเตรียม learning card'],
  },
  {
    path: '/', selector: '#tutorial-tinder-save-btn', placement: 'top', section: 'Translate', completeOn: 'click',
    en: ['Save it to your deck', 'Tap Save to keep this word. The next steps use a real card from your deck.'],
    th: ['บันทึกเข้าคลังคำศัพท์', 'แตะ Save เพื่อเก็บคำนี้ ขั้นต่อไปจะใช้การ์ดจริงจาก deck ของคุณ'],
  },
  {
    path: '/', selector: '#tutorial-nav-purge', placement: 'top', section: 'Navigate', completeOn: 'click',
    en: ['Open Flashcards', 'Use the Flashcards button in the bottom navigation.'],
    th: ['เปิดหน้า Flashcards', 'แตะปุ่ม Flashcards ที่แถบด้านล่าง'],
  },
  {
    path: '/purge', selector: '#tutorial-flashcard-card', placement: 'bottom', section: 'Review', completeOn: 'click',
    en: ['Reveal the word', 'Tap the card once to reveal the word and short definition.'],
    th: ['เปิดคำศัพท์', 'แตะการ์ด 1 ครั้งเพื่อดูคำศัพท์และคำอธิบายสั้น ๆ'],
  },
  {
    path: '/purge', selector: '#tutorial-flashcard-card', placement: 'bottom', section: 'Review', completeOn: 'click',
    en: ['Reveal the English context', 'Tap the same card again to see how the word is used in a sentence.'],
    th: ['ดูบริบทภาษาอังกฤษ', 'แตะการ์ดเดิมอีกครั้งเพื่อดูประโยคที่ใช้คำนี้'],
  },
  {
    path: '/purge', selector: '#tutorial-flashcard-card', placement: 'bottom', section: 'Review', completeOn: 'click',
    en: ['Reveal the Thai meaning', 'Tap once more. The answer controls will appear after the Thai meaning.'],
    th: ['ดูความหมายภาษาไทย', 'แตะอีกครั้ง แล้วปุ่มให้คะแนนความจำจะปรากฏ'],
  },
  {
    path: '/purge', selector: '#tutorial-srs-buttons', placement: 'top', section: 'Review', completeOn: 'click',
    en: ['Rate your memory', 'Choose Again, Hard, Normal, or Easy. FSRS uses your real answer to calculate the next review date.'],
    th: ['ให้คะแนนความจำ', 'เลือก Again, Hard, Normal หรือ Easy ระบบ FSRS จะใช้คำตอบจริงของคุณคำนวณวันทบทวนครั้งถัดไป'],
  },
  {
    path: '/purge', selector: '#tutorial-nav-library', placement: 'top', section: 'Library', completeOn: 'click',
    en: ['Open your Library', 'Tap Library to manage every saved card.'],
    th: ['เปิด Library', 'แตะ Library เพื่อจัดการการ์ดทั้งหมดที่บันทึกไว้'],
  },
  {
    path: '/library', selector: '#tutorial-library-search', placement: 'bottom', section: 'Library', completeOn: 'input',
    en: ['Find a saved word', 'Type any part of a word. You can then open a card to edit text, change its image, or remove it.'],
    th: ['ค้นหาคำที่บันทึก', 'พิมพ์ส่วนหนึ่งของคำ แล้วเปิดการ์ดเพื่อแก้ข้อความ เปลี่ยนรูป หรือลบออกได้'],
  },
  {
    path: '/library', selector: '#tutorial-nav-profile', placement: 'top', section: 'Profile', completeOn: 'click',
    en: ['Open My Profile', 'Tap My Profile to control your word set, stages, and settings.'],
    th: ['เปิด My Profile', 'แตะ My Profile เพื่อจัดการชุดคำศัพท์ ระดับการเรียน และการตั้งค่า'],
  },
  {
    path: '/profile', selector: '#tutorial-profile-curriculum', placement: 'bottom', section: 'Profile', completeOn: 'click',
    en: ['Choose a word set', 'Open this control whenever you want to switch between Self-Study, Oxford, TOEIC, IELTS, or daily phrases.'],
    th: ['เลือกชุดคำศัพท์', 'เปิดปุ่มนี้เมื่อต้องการสลับระหว่าง Self-Study, Oxford, TOEIC, IELTS หรือ Daily Phrases'],
  },
  {
    path: '/profile', selector: '#tutorial-profile-curriculum-modal-content', placement: 'top', section: 'Complete', final: true,
    en: ['You are ready', 'You have completed the real learning flow. From the menu you can replay this guide, manage reminders, reset a deck, read Privacy and Terms, or sign in to keep a guest deck.'],
    th: ['พร้อมใช้งานแล้ว', 'คุณทำ flow การเรียนจริงครบแล้ว จากเมนู คุณเปิด Guide ใหม่ จัดการการแจ้งเตือน รีเซ็ต deck อ่าน Privacy/Terms หรือ Sign in เพื่อเก็บ Guest deck ได้'],
  },
];

const COPY = {
  en: { choose: 'Choose guide language', chooseHint: 'The same tour is available in Thai or English.', thai: 'ภาษาไทย', english: 'English', cancel: 'Not now', back: 'Back', next: 'Next', finish: 'Finish', close: 'Close guide', missing: 'This control appears when the related content is available.', live: 'This is the real app. You may try the highlighted control. The guide never saves, removes, resets, or rates your cards.' },
  th: { choose: 'เลือกภาษาของ Guide', chooseHint: 'เนื้อหาเหมือนกัน เลือกคำอธิบายภาษาไทยหรืออังกฤษได้', thai: 'ภาษาไทย', english: 'English', cancel: 'ไว้ทีหลัง', back: 'ย้อนกลับ', next: 'ถัดไป', finish: 'เสร็จสิ้น', close: 'ปิด Guide', missing: 'ปุ่มนี้จะแสดงเมื่อมีเนื้อหาที่เกี่ยวข้อง', live: 'นี่คือหน้าจอจริง ลองแตะจุดที่ไฮไลต์ได้ตามต้องการ Guide นี้จะไม่บันทึก ลบ รีเซ็ต หรือให้คะแนนการ์ดของคุณ' },
};

export const Tutorial = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [active, setActive] = useState(false);
  const [showLanguage, setShowLanguage] = useState(false);
  const [language, setLanguage] = useState(() => localStorage.getItem('memeng_tutorial_language') || 'en');
  const [currentStep, setCurrentStep] = useState(0);
  const [highlightRect, setHighlightRect] = useState(null);
  const [targetFound, setTargetFound] = useState(false);
  const guideCardRef = useRef(null);
  const locationPathRef = useRef(location.pathname);
  const completedStepRef = useRef(null);

  const step = STEPS[currentStep];
  const words = COPY[language] || COPY.en;
  const content = step?.[language] || step?.en;

  const closeGuide = useCallback((completed = false) => {
    setActive(false);
    setShowLanguage(false);
    localStorage.removeItem('memeng_tutorial_running');
    if (completed) localStorage.setItem('memeng_tutorial_done', 'true');
    window.dispatchEvent(new Event('tutorial-close-collections'));
    window.dispatchEvent(new Event('tutorial-close-menu'));
    window.dispatchEvent(new CustomEvent('tutorial-active-change', { detail: false }));
  }, []);

  useEffect(() => {
    const open = () => {
      closeGuide(false);
      setCurrentStep(0);
      setShowLanguage(true);
    };
    const exit = () => closeGuide(false);
    window.addEventListener('trigger-tutorial', open);
    window.addEventListener('exit-tutorial', exit);
    return () => {
      window.removeEventListener('trigger-tutorial', open);
      window.removeEventListener('exit-tutorial', exit);
    };
  }, [closeGuide]);

  useEffect(() => {
    locationPathRef.current = location.pathname;
  }, [location.pathname]);

  const startGuide = (nextLanguage) => {
    setLanguage(nextLanguage);
    localStorage.setItem('memeng_tutorial_language', nextLanguage);
    localStorage.removeItem('memeng_tutorial_started');
    localStorage.setItem('memeng_tutorial_running', 'true');
    setShowLanguage(false);
    window.dispatchEvent(new Event('tutorial-close-menu'));
    setCurrentStep(0);
    setActive(true);
    window.dispatchEvent(new CustomEvent('tutorial-active-change', { detail: true }));
  };

  useEffect(() => {
    if (!active || !step) return undefined;
    if (locationPathRef.current !== step.path) navigate(step.path);
    return undefined;
  }, [active, currentStep, navigate, step]);

  const advanceFromAction = useCallback(() => {
    if (!active || step?.final || completedStepRef.current === currentStep) return;
    completedStepRef.current = currentStep;
    window.setTimeout(() => {
      setCurrentStep((value) => Math.min(value + 1, STEPS.length - 1));
      completedStepRef.current = null;
    }, 180);
  }, [active, currentStep, step?.final]);

  const updateHighlight = useCallback(() => {
    if (!active || !step?.selector) {
      setHighlightRect(null);
      setTargetFound(false);
      return;
    }

    const target = document.querySelector(step.selector);
    if (!target) {
      setHighlightRect(null);
      setTargetFound(false);
      return;
    }

    let rect = target.getBoundingClientRect();
    if (rect.bottom < 70 || rect.top > window.innerHeight - 70) {
      target.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'auto' });
      rect = target.getBoundingClientRect();
    }

    const padding = 8;
    setHighlightRect({
      top: Math.max(6, rect.top - padding),
      left: Math.max(6, rect.left - padding),
      width: Math.min(window.innerWidth - 12, rect.width + padding * 2),
      height: Math.min(window.innerHeight - 12, rect.height + padding * 2),
    });
    setTargetFound(true);
  }, [active, step]);

  useEffect(() => {
    if (!active) return undefined;
    const timers = [60, 260, 650].map((delay) => window.setTimeout(updateHighlight, delay));
    const refresh = () => window.requestAnimationFrame(updateHighlight);
    window.addEventListener('resize', refresh);
    window.addEventListener('scroll', refresh, true);
    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
      window.removeEventListener('resize', refresh);
      window.removeEventListener('scroll', refresh, true);
    };
  }, [active, currentStep, location.pathname, updateHighlight]);

  useEffect(() => {
    if (!active) return undefined;
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') closeGuide(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    window.setTimeout(() => guideCardRef.current?.focus(), 0);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [active, closeGuide]);

  // Each guided action is detected on the real control. Until it happens,
  // the four blocker panels prevent accidental interaction with anything else.
  useEffect(() => {
    if (!active || !step?.selector || !step.completeOn) return undefined;
    const target = document.querySelector(step.selector);
    if (!target) return undefined;
    const handleAction = (event) => {
      if (step.completeOn === 'input' && !String(event.currentTarget.value || '').trim()) return;
      if (step.completeOn === 'click' && event.currentTarget.disabled) return;
      advanceFromAction();
    };
    target.addEventListener(step.completeOn, handleAction);
    return () => target.removeEventListener(step.completeOn, handleAction);
  }, [active, step, targetFound, advanceFromAction]);

  useEffect(() => {
    if (!active) return undefined;
    const observer = new MutationObserver(() => window.requestAnimationFrame(updateHighlight));
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'style', 'disabled'] });
    return () => observer.disconnect();
  }, [active, updateHighlight]);

  const goBack = () => setCurrentStep((value) => Math.max(0, value - 1));
  const goNext = () => {
    if (currentStep >= STEPS.length - 1) {
      closeGuide(true);
      return;
    }
    setCurrentStep((value) => value + 1);
  };

  const guidePosition = useMemo(() => {
    if (!targetFound || step?.placement === 'center') {
      return { top: '50%', transform: 'translate(-50%, -50%)' };
    }
    if (step?.placement === 'top') return { top: 'max(76px, env(safe-area-inset-top))', transform: 'translateX(-50%)' };
    return { bottom: 'max(82px, calc(env(safe-area-inset-bottom) + 70px))', transform: 'translateX(-50%)' };
  }, [step?.placement, targetFound]);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <>
      <AnimatePresence>
        {showLanguage && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, zIndex: 2147483500, background: 'rgba(0,0,0,0.78)', display: 'grid', placeItems: 'center', padding: '20px' }}
          >
            <motion.div
              initial={{ opacity: 0, y: 12, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 12, scale: 0.97 }}
              role="dialog" aria-modal="true" aria-label="Choose guide language" style={{ width: 'min(100%, 360px)', borderRadius: '18px', padding: '22px', background: '#15161b', border: '1px solid rgba(255,255,255,0.12)', boxShadow: '0 24px 80px rgba(0,0,0,0.65)', color: '#fff' }}
            >
              <div style={{ width: 44, height: 44, borderRadius: 12, display: 'grid', placeItems: 'center', marginBottom: 14, background: 'rgba(167,139,250,0.14)', border: '1px solid rgba(167,139,250,0.28)', color: '#a78bfa' }}><Globe2 size={22} /></div>
              <h2 style={{ margin: '0 0 6px', fontSize: '1.15rem' }}>{COPY.th.choose}</h2>
              <p style={{ margin: '0 0 18px', color: '#9ca3af', fontSize: '0.8rem', lineHeight: 1.5 }}>{COPY.th.chooseHint}</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <button type="button" onClick={() => startGuide('th')} style={languageButtonStyle}>ภาษาไทย</button>
                <button type="button" onClick={() => startGuide('en')} style={languageButtonStyle}>English</button>
              </div>
              <button type="button" onClick={() => setShowLanguage(false)} style={{ width: '100%', marginTop: 12, padding: 9, border: 0, background: 'transparent', color: '#8b93a7', cursor: 'pointer', fontWeight: 700 }}>Not now</button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {active && step && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ position: 'fixed', inset: 0, zIndex: 2147483400, pointerEvents: 'none' }}>
            {highlightRect ? (
              <div style={{ position: 'fixed', ...highlightRect, borderRadius: 14, border: '2px solid #facc15', boxShadow: '0 0 0 9999px rgba(0,0,0,0.72), 0 0 24px rgba(250,204,21,0.4)', transition: 'top 180ms ease, left 180ms ease, width 180ms ease, height 180ms ease' }} />
            ) : (
              <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.72)' }} />
            )}

            <div style={{ position: 'fixed', left: '50%', width: 'min(calc(100% - 24px), 370px)', zIndex: 2147483402, pointerEvents: 'auto', ...guidePosition }}>
              <motion.div
                ref={guideCardRef}
                role="dialog"
                aria-modal="true"
                tabIndex={-1}
                key={`${language}-${currentStep}`}
                initial={{ opacity: 0, y: 10, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }}
                style={{ borderRadius: 16, padding: '16px', background: 'rgba(18,19,24,0.98)', border: '1px solid rgba(255,255,255,0.13)', boxShadow: '0 18px 60px rgba(0,0,0,0.62)', color: '#fff' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 10 }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#facc15', fontSize: '0.66rem', fontWeight: 900, textTransform: 'uppercase' }}><HelpCircle size={13} /> {step.section} · {currentStep + 1}/{STEPS.length}</span>
                  <button type="button" aria-label={words.close} onClick={() => closeGuide(false)} style={iconButtonStyle}><X size={17} /></button>
                </div>
                <div style={{ height: 3, borderRadius: 999, overflow: 'hidden', background: 'rgba(255,255,255,0.08)', marginBottom: 13 }}>
                  <div style={{ width: `${((currentStep + 1) / STEPS.length) * 100}%`, height: '100%', background: '#facc15', transition: 'width 180ms ease' }} />
                </div>
                <h3 style={{ margin: '0 0 7px', fontSize: '1rem', lineHeight: 1.25 }}>{content[0]}</h3>
                <p style={{ margin: 0, color: '#c5cad5', fontSize: '0.78rem', lineHeight: 1.55 }}>{content[1]}</p>
                <p style={{ margin: '10px 0 0', padding: '8px 9px', borderRadius: 9, color: '#facc15', background: 'rgba(250,204,21,0.08)', fontSize: '0.68rem', lineHeight: 1.45, fontWeight: 750 }}>{step.final ? (language === 'th' ? 'Guide จบแล้ว กดเสร็จสิ้นเพื่อกลับไปใช้งานตามปกติ' : 'The guided flow is complete. Finish to return to the app.') : (targetFound ? (language === 'th' ? 'แตะเฉพาะจุดที่ไฮไลต์เพื่อปลดล็อกขั้นถัดไป' : 'Tap the highlighted control to unlock the next step.') : (language === 'th' ? 'กำลังรอให้หน้าจอแสดงจุดนี้...' : 'Waiting for this control to appear...'))}</p>
                {!targetFound && step.selector && <p style={{ margin: '9px 0 0', color: '#facc15', fontSize: '0.68rem', lineHeight: 1.4 }}>{words.missing}</p>}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginTop: 15 }}>
                  <button type="button" onClick={goBack} disabled={currentStep === 0} style={{ ...secondaryButtonStyle, opacity: currentStep === 0 ? 0.35 : 1 }}><ChevronLeft size={15} /> {words.back}</button>
                  {step.final ? (
                    <button type="button" onClick={() => closeGuide(true)} style={primaryButtonStyle}><CheckCircle2 size={15} /> {words.finish}</button>
                  ) : (
                    <span style={{ color: '#b7c1d7', fontSize: '0.68rem', fontWeight: 800, textAlign: 'right' }}>{targetFound ? (language === 'th' ? 'รอการแตะ' : 'Action required') : (language === 'th' ? 'กำลังเตรียม' : 'Preparing')}</span>
                  )}
                </div>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>,
    document.body,
  );
};

const languageButtonStyle = { padding: '12px 10px', borderRadius: 11, border: '1px solid rgba(167,139,250,0.32)', background: 'rgba(167,139,250,0.12)', color: '#fff', cursor: 'pointer', fontWeight: 850 };
const iconButtonStyle = { width: 30, height: 30, borderRadius: '50%', display: 'grid', placeItems: 'center', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)', color: '#b8bfce', cursor: 'pointer' };
const secondaryButtonStyle = { minHeight: 36, padding: '8px 11px', borderRadius: 9, border: '1px solid rgba(255,255,255,0.11)', background: 'rgba(255,255,255,0.035)', color: '#c5cad5', display: 'inline-flex', alignItems: 'center', gap: 4, cursor: 'pointer', fontWeight: 800, fontSize: '0.74rem' };
const primaryButtonStyle = { minHeight: 36, padding: '8px 13px', borderRadius: 9, border: '1px solid rgba(250,204,21,0.38)', background: 'rgba(250,204,21,0.14)', color: '#facc15', display: 'inline-flex', alignItems: 'center', gap: 4, cursor: 'pointer', fontWeight: 900, fontSize: '0.74rem' };
