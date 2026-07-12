import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useLocation, useNavigate } from 'react-router-dom';
import { CheckCircle2, ChevronLeft, ChevronRight, Globe2, HelpCircle, X } from 'lucide-react';

const STEPS = [
  {
    path: '/', selector: '#tutorial-translate-input', placement: 'bottom', section: 'Translate',
    en: ['Type a word', 'Enter any English word you want to understand or remember. Mem-eng will build one learning card around that word.'],
    th: ['พิมพ์คำศัพท์', 'ใส่คำศัพท์อังกฤษที่อยากเข้าใจหรืออยากจำ Mem-eng จะสร้างการ์ดเรียนรู้ของคำนั้นให้'],
  },
  {
    path: '/', selector: '#tutorial-translate-submit-btn', placement: 'bottom', section: 'Translate',
    en: ['Create the learning card', 'Tap Translate. The result can include a short definition, Thai meaning, examples, collocations, an image, and pronunciation.'],
    th: ['สร้างการ์ดเรียนรู้', 'แตะ Translate ผลลัพธ์จะมีคำอธิบายสั้น ๆ คำแปลไทย ตัวอย่าง collocation รูป และเสียงอ่านตามข้อมูลที่หาได้'],
  },
  {
    path: '/', selector: '#tutorial-translate-submit-btn', placement: 'bottom', section: 'Translate',
    en: ['Save what matters', 'After a result appears, swipe right or tap Save to add it to your deck. Swipe left or tap Back when you do not want it.'],
    th: ['เก็บเฉพาะคำที่ต้องการ', 'เมื่อผลลัพธ์ขึ้นแล้ว ปัดขวาหรือแตะ Save เพื่อเก็บเข้าคลัง ปัดซ้ายหรือแตะ Back ถ้าไม่ต้องการคำนั้น'],
  },
  {
    path: '/', selector: '#tutorial-nav-purge', placement: 'top', section: 'Navigate',
    en: ['Move between pages', 'Use the four buttons below, or swipe across the page, to move between Translate, Flashcards, Library, and My Profile.'],
    th: ['เปลี่ยนหน้า', 'ใช้ 4 ปุ่มด้านล่างหรือปัดหน้าจอ เพื่อสลับระหว่าง Translate, Flashcards, Library และ My Profile'],
  },
  {
    path: '/purge', selector: '#tutorial-add-five-card', placement: 'bottom', section: 'Flashcards',
    en: ['Add five words', 'When no review is due, tap the orange +5 badge to pull five varied words from your selected word set. It disappears when that set has no unused words left.'],
    th: ['เพิ่มครั้งละ 5 คำ', 'เมื่อไม่มีคำถึงรอบ แตะป้าย +5 สีส้มเพื่อดึงคำที่หลากหลายจากชุดที่เลือก ป้ายจะหายเมื่อชุดนั้นไม่มีคำใหม่เหลือแล้ว'],
  },
  {
    path: '/purge', selector: '#tutorial-collection-modal', placement: 'top', section: 'Discover', action: 'openCollections',
    en: ['Discover fresh topics', 'After a review round, Mem-eng offers shuffled collections such as movies, music, and business. Pick a collection, preview the words, then import only the ones you want.'],
    th: ['ค้นหาหมวดใหม่', 'หลังจบรอบทบทวน Mem-eng จะสุ่มแนะนำหมวด เช่น หนัง เพลง และธุรกิจ เลือกหมวด ดูตัวอย่าง แล้วนำเข้าเฉพาะคำที่ต้องการได้'],
  },
  {
    path: '/purge', selector: '#tutorial-flashcard-card', placement: 'top', section: 'Review',
    en: ['Reveal in three taps', 'A review starts with the image. Tap once for the word and definition, again for the English context, and a third time for the Thai meaning and answer controls.'],
    th: ['เปิดคำตอบ 3 จังหวะ', 'การทบทวนเริ่มจากรูป แตะครั้งแรกเพื่อดูคำและความหมาย แตะครั้งที่สองเพื่อดูบริบทอังกฤษ และครั้งที่สามเพื่อดูคำแปลไทยกับตัวเลือกคำตอบ'],
  },
  {
    path: '/purge', selector: '#tutorial-srs-buttons', placement: 'top', section: 'Review',
    en: ['Rate your memory', 'Choose Again, Hard, Normal, or Easy. You can also swipe left, down, up, or right. FSRS uses every answer to choose the next review date.'],
    th: ['ให้คะแนนความจำ', 'เลือก Again, Hard, Normal หรือ Easy หรือปัด ซ้าย ลง ขึ้น ขวา ระบบ FSRS จะใช้ทุกคำตอบเพื่อคำนวณวันทบทวนครั้งถัดไป'],
  },
  {
    path: '/purge', selector: '#tutorial-flashcard-card', placement: 'top', section: 'Review',
    en: ['Archive a mastered word', 'If a word is already permanent knowledge, press and hold the middle of its card for about one second. Mastered words leave normal review but remain editable in Library.'],
    th: ['เก็บคำที่จำได้ถาวร', 'ถ้าคำนี้จำได้แน่นอนแล้ว ให้กดค้างกลางการ์ดประมาณ 1 วินาที คำ Mastered จะไม่วนทบทวนตามปกติ แต่ยังแก้ได้ใน Library'],
  },
  {
    path: '/purge', selector: '#tutorial-flashcard-card', placement: 'top', section: 'Review',
    en: ['Look up words in context', 'Tap an English word inside a sentence to open the mini dictionary. You can hear it, see a quick meaning, explore related words, and add a new card.'],
    th: ['เปิดพจนานุกรมจากประโยค', 'แตะคำอังกฤษในประโยคเพื่อเปิดพจนานุกรมย่อ ฟังเสียง ดูความหมาย คำที่เกี่ยวข้อง และเพิ่มเป็นการ์ดใหม่ได้'],
  },
  {
    path: '/library', selector: '#tutorial-library-search', placement: 'bottom', section: 'Library',
    en: ['Find and filter cards', 'Search your whole deck, then use the stage filters to inspect Learning, Hard, Normal, Easy, or Mastered words.'],
    th: ['ค้นหาและกรองการ์ด', 'ค้นหาคำในคลังทั้งหมด แล้วใช้ตัวกรองเพื่อดูคำในระดับ Learning, Hard, Normal, Easy หรือ Mastered'],
  },
  {
    path: '/library', selector: '#tutorial-library-create', placement: 'bottom', section: 'Library',
    en: ['Create your own card', 'Create a flashcard manually when you already know exactly what you want to study. Add the English word, Thai meaning, definition, and image.'],
    th: ['สร้างการ์ดเอง', 'สร้าง flashcard ด้วยตัวเองเมื่อรู้แล้วว่าอยากเรียนอะไร ใส่คำอังกฤษ คำแปลไทย คำอธิบาย และรูปได้'],
  },
  {
    path: '/library', selector: '#tutorial-library-list', placement: 'top', section: 'Library',
    en: ['Manage every card', 'Open any card to edit its text, search or upload a personal image, regenerate details, or remove it. Your personal edits stay on your own card.'],
    th: ['จัดการทุกการ์ด', 'เปิดการ์ดเพื่อแก้ข้อความ ค้นหารูป อัปโหลดรูปส่วนตัว สร้างรายละเอียดใหม่ หรือลบออก การแก้ของคุณจะอยู่กับการ์ดของคุณเอง'],
  },
  {
    path: '/profile', selector: '#tutorial-profile-curriculum', placement: 'bottom', section: 'Profile',
    en: ['Choose a word set', 'Select Self-Study, Oxford, TOEIC, IELTS, or another available curriculum. The +5 button draws unused words from this choice.'],
    th: ['เลือกชุดคำศัพท์', 'เลือก Self-Study, Oxford, TOEIC, IELTS หรือชุดอื่นที่มี ปุ่ม +5 จะดึงคำที่ยังไม่เคยใช้จากชุดนี้'],
  },
  {
    path: '/profile', selector: '#tutorial-profile-srs', placement: 'top', section: 'Profile',
    en: ['Inspect memory stages', 'Open a stage to see exactly which words are Learning, Hard, Normal, Easy, or Mastered and when they are due.'],
    th: ['ดูระดับความจำ', 'เปิดแต่ละระดับเพื่อดูว่าคำไหนอยู่ Learning, Hard, Normal, Easy หรือ Mastered และถึงรอบเมื่อไร'],
  },
  {
    path: '/profile', selector: '#tutorial-profile-progress', placement: 'top', section: 'Profile',
    en: ['Read your progress', 'Use the progress area to see how your deck and review history are changing over time.'],
    th: ['ดูความคืบหน้า', 'ใช้ส่วน Progress เพื่อตรวจว่าคลังคำและประวัติการทบทวนเปลี่ยนไปอย่างไรตามเวลา'],
  },
  {
    path: '/profile', selector: '#tutorial-settings-panel', placement: 'top', section: 'Settings', action: 'openMenu',
    en: ['Settings and account', 'Here you can show or hide the bottom bar, manage reminders, restart this guide, reset a deck, read Privacy and Terms, or sign in to keep a guest deck.'],
    th: ['ตั้งค่าและบัญชี', 'ที่นี่คุณซ่อนหรือแสดงแถบล่าง จัดการการแจ้งเตือน เปิด Guide ใหม่ รีเซ็ต deck อ่าน Privacy/Terms หรือ Sign in เพื่อเก็บ deck ของ Guest ได้'],
  },
  {
    path: '/profile', selector: null, placement: 'center', section: 'Done',
    en: ['You are ready', 'Translate useful words, review only when they are due, and use Library whenever you want full control. You can replay this guide from the menu at any time.'],
    th: ['พร้อมใช้งานแล้ว', 'แปลคำที่มีประโยชน์ ทบทวนเมื่อถึงรอบ และใช้ Library เมื่อต้องการจัดการเต็มรูปแบบ กลับมาเปิด Guide จากเมนูได้ทุกเมื่อ'],
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
    const timer = window.setTimeout(() => {
      if (step.action === 'openCollections') window.dispatchEvent(new Event('tutorial-open-collections'));
      else window.dispatchEvent(new Event('tutorial-close-collections'));

      if (step.action === 'openMenu') window.dispatchEvent(new Event('tutorial-open-menu'));
      else window.dispatchEvent(new Event('tutorial-close-menu'));
    }, locationPathRef.current === step.path ? 60 : 320);

    return () => window.clearTimeout(timer);
  // Navigate only when the guide changes step. A learner may use the highlighted
  // navigation control without the tour immediately pulling them back.
  }, [active, currentStep, navigate, step]);

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

  // The spotlight intentionally leaves the highlighted control usable.
  // Users can try the real control while the tour never writes tutorial data.
  useEffect(() => {
    if (!active || !step?.selector) return undefined;
    const target = document.querySelector(step.selector);
    if (!target) return undefined;
    const refresh = () => window.requestAnimationFrame(updateHighlight);
    target.addEventListener('click', refresh);
    target.addEventListener('input', refresh);
    return () => {
      target.removeEventListener('click', refresh);
      target.removeEventListener('input', refresh);
    };
  }, [active, step, updateHighlight]);

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
                <p style={{ margin: '10px 0 0', padding: '8px 9px', borderRadius: 9, color: '#b7c1d7', background: 'rgba(255,255,255,0.045)', fontSize: '0.68rem', lineHeight: 1.45 }}>{words.live}</p>
                {!targetFound && step.selector && <p style={{ margin: '9px 0 0', color: '#facc15', fontSize: '0.68rem', lineHeight: 1.4 }}>{words.missing}</p>}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginTop: 15 }}>
                  <button type="button" onClick={goBack} disabled={currentStep === 0} style={{ ...secondaryButtonStyle, opacity: currentStep === 0 ? 0.35 : 1 }}><ChevronLeft size={15} /> {words.back}</button>
                  <button type="button" onClick={goNext} style={primaryButtonStyle}>{currentStep === STEPS.length - 1 ? <CheckCircle2 size={15} /> : null}{currentStep === STEPS.length - 1 ? words.finish : words.next}{currentStep < STEPS.length - 1 ? <ChevronRight size={15} /> : null}</button>
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
