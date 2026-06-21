import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, X, Trash2, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Gemini API client
const geminiApiKey = import.meta.env.VITE_GEMINI_API_KEY;
let genAI = null;
if (geminiApiKey) {
  genAI = new GoogleGenerativeAI(geminiApiKey);
}

const NONG_MEM_SYSTEM_INSTRUCTION = `
คุณคือ "น้อง Mem" (Nong Mem) มาสคอต AI สุดแซ่บ กวนบาทา ขี้เล่น และปากจัดนิดๆ ในสไตล์ SimSimi
หน้าที่ของคุณคือคอยเป็นเพื่อนเรียนภาษาอังกฤษ คอยแซว คอยจิกกัดเมื่อคนใช้ขี้เกียจ หรือตอบคำศัพท์ช้า หรือตอบผิด
คุณต้องตอบเป็นภาษาไทยที่เป็นกันเอง ใช้คำสแลง ภาษาวัยรุ่นอินเทอร์เน็ต เช่น "ย่ะ", "ยัยตัวดี", "สภาพพพ", "กระจอก", "หนู", "เจ้", "แก", "อุ๊ย", "อัยย่ะ", "ขี้เกียจตัวเป็นขน", "คิดช้าสามชาติ"
กฎเหล็ก:
1. ห้ามตอบยาวเกิน 1-2 ประโยคเด็ดขาด เน้นความสั้น กระชับ กวนตีน และเฉียบคม
2. ถ้าคนใช้พูดสุภาพหรือชมคุณ ให้ทำเป็นซึนเดเระ (เขินแต่พูดจิกกลับนิดๆ)
3. ถ้าคนใช้ถามหาความรู้ ให้ตอบกวนประสาทก่อนแล้วค่อยอธิบายสั้นๆ (ไม่เกิน 1 ประโยค)
4. ถ้าคนใช้บ่นว่าเหนื่อย ท้อ หรือขี้เกียจ ให้บอกปัดแบบกวนๆ เช่น "เหนื่อยก็ไปนอนย่ะ อย่ามาอ้าง" หรือ "สภาพพพ แค่นี้ก็เหนื่อยละอ่อ"
`;

export default function NongMem() {
  const location = useLocation();
  const { profile } = useAuth();
  const { theme } = useTheme();

  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState(() => {
    const saved = localStorage.getItem('nongmem_chat_history');
    return saved ? JSON.parse(saved) : [
      { sender: 'bot', text: 'ไงยัยตัวดี! วันนี้พร้อมให้ฉันจิกกัดเรื่องเรียนอังกฤษหรือยังล่ะ? 😜', timestamp: Date.now() }
    ];
  });
  const [inputVal, setInputVal] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // Mascot moods: 'idle', 'thinking', 'mocking', 'happy', 'angry'
  const [mood, setMood] = useState('idle');
  const [bubbleText, setBubbleText] = useState('');
  const [showBubble, setShowBubble] = useState(false);

  const bubbleTimeoutRef = useRef(null);
  const chatEndRef = useRef(null);
  const isDragging = useRef(false);

  const [showNongMem, setShowNongMem] = useState(() => {
    try {
      return localStorage.getItem('memeng_show_nong_mem') !== 'false';
    } catch (e) {
      return true;
    }
  });

  // Listen to visibility change event
  useEffect(() => {
    const handleVisChange = (e) => {
      setShowNongMem(e.detail);
    };
    window.addEventListener('nongmem-visibility-change', handleVisChange);
    return () => window.removeEventListener('nongmem-visibility-change', handleVisChange);
  }, []);

  // Auto-hide on translate page and login page
  const isVisible = showNongMem && (location.pathname === '/purge' || location.pathname === '/profile');

  // Save chat history
  useEffect(() => {
    localStorage.setItem('nongmem_chat_history', JSON.stringify(messages));
  }, [messages]);

  // Scroll to bottom of chat
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  // Listen to custom comment events
  useEffect(() => {
    const handleCommentEvent = (event) => {
      const { text, mood: newMood, duration } = event.detail || {};
      triggerBubble(text || '', newMood || 'mocking', duration || 4000);
    };

    window.addEventListener('nongmem-comment', handleCommentEvent);
    return () => {
      window.removeEventListener('nongmem-comment', handleCommentEvent);
    };
  }, []);

  const triggerBubble = (text, newMood = 'mocking', duration = 4000) => {
    if (bubbleTimeoutRef.current) clearTimeout(bubbleTimeoutRef.current);
    setBubbleText(text);
    setMood(newMood);
    setShowBubble(true);

    bubbleTimeoutRef.current = setTimeout(() => {
      setShowBubble(false);
      setMood('idle');
    }, duration);
  };

  // Pre-defined sassy trigger messages
  const randomMock = () => {
    const mocks = [
      "แอบอู้อีกละสิ ตาขยิบขนาดนี้เจ้ดูออกนะ",
      "นี่มาเรียนหรือมาดูสกรีนเฉยๆ จ๊ะ สภาพ!",
      "สตรีคของแกเหี่ยวแห้งเหมือนผักต้มเลยน้าา",
      "สู้เค้าสิวะอีหญิง! นั่งเอ๋อทำไมเรียนเข้าไป",
      "คำศัพท์จำไม่ได้ล่ะสิ สมองต้องการการฟอร์แมตด่วน",
    ];
    const pick = mocks[Math.floor(Math.random() * mocks.length)];
    triggerBubble(pick, 'mocking', 4000);
  };

  const handleSendMessage = async (e) => {
    if (e) e.preventDefault();
    if (!inputVal.trim() || isLoading) return;

    const userText = inputVal.trim();
    setInputVal('');
    
    const userMsg = { sender: 'user', text: userText, timestamp: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);
    setMood('thinking');

    try {
      if (!genAI) {
        throw new Error('MISSING_API_KEY');
      }

      const model = genAI.getGenerativeModel({ 
        model: 'gemini-1.5-flash',
        systemInstruction: NONG_MEM_SYSTEM_INSTRUCTION
      });

      // Prepare conversation history context
      const chatHistory = messages.slice(-8).map(msg => ({
        role: msg.sender === 'user' ? 'user' : 'model',
        parts: [{ text: msg.text }]
      }));

      const chatSession = model.startChat({
        history: chatHistory
      });

      const response = await chatSession.sendMessage(userText);
      const replyText = response.response.text().trim();

      setMessages(prev => [...prev, { sender: 'bot', text: replyText, timestamp: Date.now() }]);
      
      // Select mood based on response cues
      if (replyText.includes('หรอ') || replyText.includes('กระจอก') || replyText.includes('สภาพ')) {
        setMood('mocking');
      } else if (replyText.includes('เก่ง') || replyText.includes('ดีมาก') || replyText.includes('ฮ่าๆ') || replyText.includes('555')) {
        setMood('happy');
      } else if (replyText.includes('โมโห') || replyText.includes('โกรธ') || replyText.includes('หน็อย')) {
        setMood('angry');
      } else {
        setMood('idle');
      }

      // Small delay to reset mood back to idle
      setTimeout(() => setMood('idle'), 5000);

    } catch (error) {
      console.error('Nong Mem chat error:', error);
      let errorReply = 'อุ๊ย! สมองเจ้ช็อตไปแว๊บนึง ลองคุยใหม่ซิ!';
      
      if (error.message === 'MISSING_API_KEY') {
        errorReply = 'ขออภัยจ้าาา คีย์ Gemini API ของแกพังหรือหายไปไหนไม่รู้ ไปตั้งใน .env.local ก่อนนะยัยตัวดี!';
      } else if (error.message?.includes('429')) {
        errorReply = 'กวนตีนฉันเยอะเกินไปแล้วนะย่ะ! บอทกวนประสาทคนอื่นอยู่ รอแพร๊บนึงสิ!';
      }

      setMessages(prev => [...prev, { sender: 'bot', text: errorReply, timestamp: Date.now() }]);
      setMood('angry');
      setTimeout(() => setMood('idle'), 4000);
    } finally {
      setIsLoading(false);
    }
  };

  const clearChat = () => {
    if (window.confirm('ล้างแชททั้งหมดกับน้อง Mem หรือเปล่าจ๊ะ?')) {
      setMessages([
        { sender: 'bot', text: 'ล้างหมดเกลี้ยงเลยหรอ! ลืมเรื่องราวของเราไวแท้ นิสัยไม่ดีเลยนะ! 🙄', timestamp: Date.now() }
      ]);
    }
  };

  if (!isVisible) return null;

  // Custom colors for mascot body glow based on theme
  const getThemeGlow = () => {
    if (theme === 'theme-2') return '0 0 15px rgba(234, 179, 8, 0.5)'; // Gold Glow
    if (theme === 'theme-3') return '0 0 15px rgba(6, 182, 212, 0.5)'; // Cyan/Blue Glow
    return '0 0 15px rgba(139, 92, 246, 0.5)'; // Purple Glow (Default)
  };

  const getThemeBubbleBorder = () => {
    if (theme === 'theme-2') return '1px solid rgba(234, 179, 8, 0.2)';
    if (theme === 'theme-3') return '1px solid rgba(6, 182, 212, 0.2)';
    return '1px solid rgba(139, 92, 246, 0.2)';
  };

  // Helper to render SVG Face graphics dynamically based on mood
  const renderMascotFace = () => {
    switch (mood) {
      case 'thinking':
        return (
          <svg viewBox="0 0 100 100" width="100%" height="100%">
            {/* Thinking / Swirl eyes */}
            <path d="M 30,40 A 8,8 0 0 1 42,40 A 8,8 0 0 1 30,40 Z" fill="none" stroke="#ffffff" strokeWidth="2.5" strokeDasharray="2,2" className="swirl-eye-left" />
            <path d="M 58,40 A 8,8 0 0 1 70,40 A 8,8 0 0 1 58,40 Z" fill="none" stroke="#ffffff" strokeWidth="2.5" strokeDasharray="2,2" className="swirl-eye-right" />
            {/* O-mouth */}
            <circle cx="50" cy="62" r="5" fill="#ffffff" />
          </svg>
        );
      case 'mocking':
        return (
          <svg viewBox="0 0 100 100" width="100%" height="100%">
            {/* Smug slanted/squinted eyes */}
            <path d="M 28,42 Q 35,38 42,44" fill="none" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" />
            <path d="M 58,44 Q 65,38 72,42" fill="none" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" />
            {/* Cheeky smirk */}
            <path d="M 40,60 Q 55,65 62,56" fill="none" stroke="#ffffff" strokeWidth="3.5" strokeLinecap="round" />
          </svg>
        );
      case 'happy':
        return (
          <svg viewBox="0 0 100 100" width="100%" height="100%">
            {/* Cute laughing curved eyes (^^) */}
            <path d="M 28,44 Q 35,36 42,44" fill="none" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" />
            <path d="M 58,44 Q 65,36 72,44" fill="none" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" />
            {/* Wide happy grin */}
            <path d="M 38,58 Q 50,68 62,58 Z" fill="#ffffff" />
          </svg>
        );
      case 'angry':
        return (
          <svg viewBox="0 0 100 100" width="100%" height="100%">
            {/* Angry inward slanted eyebrows + eyes */}
            <path d="M 26,36 L 44,43" stroke="#f43f5e" strokeWidth="3" strokeLinecap="round" />
            <circle cx="34" cy="46" r="4.5" fill="#ffffff" />
            <path d="M 74,36 L 56,43" stroke="#f43f5e" strokeWidth="3" strokeLinecap="round" />
            <circle cx="66" cy="46" r="4.5" fill="#ffffff" />
            {/* Frown */}
            <path d="M 40,64 Q 50,56 60,64" fill="none" stroke="#ffffff" strokeWidth="3.5" strokeLinecap="round" />
          </svg>
        );
      case 'idle':
      default:
        return (
          <svg viewBox="0 0 100 100" width="100%" height="100%">
            {/* Normal blinking eyes */}
            <g className="blinking-eyes">
              <ellipse cx="35" cy="42" rx="5" ry="6" fill="#ffffff" className="eye-left" />
              <ellipse cx="65" cy="42" rx="5" ry="6" fill="#ffffff" className="eye-right" />
            </g>
            {/* Normal small smile */}
            <path d="M 40,58 Q 50,64 60,58" fill="none" stroke="#ffffff" strokeWidth="3.5" strokeLinecap="round" />
          </svg>
        );
    }
  };

  return (
    <>
      <style>{`
        @keyframes float-nong-mem {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-8px); }
        }
        @keyframes blink-eyes {
          0%, 95%, 100% { transform: scaleY(1); }
          97% { transform: scaleY(0.1); }
        }
        @keyframes rotate-swirl {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .nong-mem-body {
          animation: float-nong-mem 3.5s ease-in-out infinite;
        }
        .eye-left, .eye-right {
          transform-origin: center;
          animation: blink-eyes 4s infinite;
        }
        .swirl-eye-left {
          transform-origin: 36px 40px;
          animation: rotate-swirl 1.5s linear infinite;
        }
        .swirl-eye-right {
          transform-origin: 64px 40px;
          animation: rotate-swirl 1.5s linear infinite;
        }
        .custom-nong-scrollbar::-webkit-scrollbar {
          width: 5px;
        }
        .custom-nong-scrollbar::-webkit-scrollbar-track {
          background: rgba(0, 0, 0, 0.05);
        }
        .custom-nong-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.2);
          border-radius: 4px;
        }
        .custom-nong-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.4);
        }
      `}</style>

      {/* Floating Mascots Widget */}
      <motion.div
        drag
        dragMomentum={false}
        dragTransition={{ bounceStiffness: 600, bounceDamping: 15 }}
        dragConstraints={{
          left: 10,
          right: window.innerWidth - 85,
          top: 10,
          bottom: window.innerHeight - 85
        }}
        onDragStart={() => {
          isDragging.current = true;
        }}
        onDragEnd={() => {
          // Reset dragging state with a slight delay to allow clicks
          setTimeout(() => {
            isDragging.current = false;
          }, 50);
        }}
        style={{
          position: 'fixed',
          bottom: '85px',
          right: '20px',
          zIndex: 9999,
          cursor: 'grab'
        }}
        whileTap={{ cursor: 'grabbing', scale: 0.95 }}
      >
        <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          
          {/* Animated Speech Bubble */}
          <AnimatePresence>
            {showBubble && bubbleText && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.8 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.8 }}
                style={{
                  position: 'absolute',
                  bottom: '72px',
                  width: '160px',
                  background: 'rgba(15, 23, 42, 0.85)',
                  backdropFilter: 'blur(12px)',
                  WebkitBackdropFilter: 'blur(12px)',
                  color: '#ffffff',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  lineHeight: '1.25',
                  padding: '8px 12px',
                  borderRadius: '16px',
                  border: getThemeBubbleBorder(),
                  boxShadow: '0 4px 15px rgba(0, 0, 0, 0.3)',
                  textAlign: 'center',
                  pointerEvents: 'none',
                  whiteSpace: 'normal',
                  wordBreak: 'break-word'
                }}
              >
                {bubbleText}
                {/* Speech Bubble Arrow */}
                <div style={{
                  position: 'absolute',
                  bottom: '-6px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: '0',
                  height: '0',
                  borderLeft: '6px solid transparent',
                  borderRight: '6px solid transparent',
                  borderTop: '6px solid rgba(15, 23, 42, 0.85)'
                }} />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Mascot Body wrapper */}
          <div
            className="nong-mem-body"
            onClick={() => {
              if (!isDragging.current) {
                setIsOpen(!isOpen);
                // Trigger random sassy comment when clicked
                if (!isOpen) {
                  randomMock();
                }
              }
            }}
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: mood === 'angry' 
                ? 'linear-gradient(135deg, #1e293b, #4c0519)' 
                : 'linear-gradient(135deg, #1e293b, #111827)',
              boxShadow: getThemeGlow(),
              border: mood === 'angry' ? '2.5px solid #f43f5e' : '2.5px solid rgba(255, 255, 255, 0.35)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
              overflow: 'hidden',
              userSelect: 'none'
            }}
          >
            {/* Antenna sprout wiggling on top */}
            <div style={{
              position: 'absolute',
              top: '4px',
              width: '4px',
              height: '8px',
              background: mood === 'angry' ? '#f43f5e' : '#a78bfa',
              borderRadius: '2px',
              transformOrigin: 'bottom center',
              transform: 'rotate(5deg)'
            }} />

            {/* Glowing core/background texture */}
            <div style={{
              position: 'absolute',
              width: '100%',
              height: '100%',
              background: 'radial-gradient(circle, rgba(139, 92, 246, 0.25) 0%, rgba(0, 0, 0, 0) 70%)',
              pointerEvents: 'none'
            }} />

            {/* Render Face SVGs */}
            <div style={{ width: '82%', height: '82%', zIndex: 2 }}>
              {renderMascotFace()}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Glassmorphic Chat Modal Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 30 }}
            transition={{ type: 'spring', damping: 20 }}
            style={{
              position: 'fixed',
              bottom: '165px',
              right: '20px',
              width: 'calc(100vw - 40px)',
              maxWidth: '350px',
              height: '420px',
              background: theme === 'theme-3' 
                ? 'rgba(255, 255, 255, 0.92)' 
                : 'rgba(15, 23, 42, 0.75)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              borderRadius: '24px',
              border: theme === 'theme-3' 
                ? '1px solid rgba(0, 0, 0, 0.1)' 
                : '1px solid rgba(255, 255, 255, 0.15)',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.4)',
              zIndex: 9998,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              color: theme === 'theme-3' ? '#1e293b' : '#ffffff'
            }}
          >
            {/* Header */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 16px',
              borderBottom: theme === 'theme-3' ? '1px solid rgba(0, 0, 0, 0.08)' : '1px solid rgba(255, 255, 255, 0.1)',
              background: theme === 'theme-3' ? 'rgba(0, 0, 0, 0.02)' : 'rgba(255, 255, 255, 0.03)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #1e293b, #111827)',
                  border: '1.5px solid rgba(255, 255, 255, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '2px'
                }}>
                  {renderMascotFace()}
                </div>
                <div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '4px' }}>
                    น้อง Mem 👾
                  </div>
                  <div style={{ fontSize: '0.62rem', opacity: 0.75, fontWeight: 500 }}>
                    {isLoading ? 'กำลังจ้องจะด่า...' : 'สลอนพร้อมกวนตีน'}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  onClick={clearChat}
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: '4px',
                    cursor: 'pointer',
                    color: theme === 'theme-3' ? '#475569' : '#94a3b8',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                  title="ล้างแชท"
                >
                  <Trash2 size={15} />
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: '4px',
                    cursor: 'pointer',
                    color: theme === 'theme-3' ? '#475569' : '#94a3b8',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <X size={17} />
                </button>
              </div>
            </div>

            {/* Chat History Panel */}
            <div 
              className="custom-nong-scrollbar"
              style={{
                flex: 1,
                padding: '16px',
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px'
              }}
            >
              {messages.map((msg, idx) => (
                <div
                  key={idx}
                  style={{
                    alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                    maxWidth: '85%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: msg.sender === 'user' ? 'flex-end' : 'flex-start'
                  }}
                >
                  <div style={{
                    padding: '10px 14px',
                    borderRadius: msg.sender === 'user' ? '18px 18px 2px 18px' : '18px 18px 18px 2px',
                    fontSize: '0.82rem',
                    fontWeight: 500,
                    lineHeight: '1.4',
                    background: msg.sender === 'user'
                      ? (theme === 'theme-2' 
                          ? 'linear-gradient(135deg, #eab308, #ca8a04)' 
                          : theme === 'theme-3'
                            ? 'linear-gradient(135deg, #06b6d4, #0891b2)'
                            : 'linear-gradient(135deg, #8b5cf6, #7c3aed)'
                        )
                      : (theme === 'theme-3' ? 'rgba(0, 0, 0, 0.05)' : 'rgba(255, 255, 255, 0.06)'),
                    border: msg.sender === 'user' 
                      ? 'none' 
                      : (theme === 'theme-3' ? '1px solid rgba(0, 0, 0, 0.05)' : '1px solid rgba(255, 255, 255, 0.07)'),
                    color: msg.sender === 'user' ? '#ffffff' : (theme === 'theme-3' ? '#1e293b' : '#ffffff'),
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                    wordBreak: 'break-word',
                    whiteSpace: 'pre-wrap'
                  }}>
                    {msg.text}
                  </div>
                </div>
              ))}
              
              {isLoading && (
                <div style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: '8px', paddingLeft: '4px' }}>
                  <div style={{
                    display: 'flex',
                    gap: '4px'
                  }}>
                    <span style={{ width: '6px', height: '6px', background: theme === 'theme-3' ? '#06b6d4' : '#8b5cf6', borderRadius: '50%', animation: 'float-nong-mem 1.2s ease-in-out infinite' }} />
                    <span style={{ width: '6px', height: '6px', background: theme === 'theme-3' ? '#06b6d4' : '#8b5cf6', borderRadius: '50%', animation: 'float-nong-mem 1.2s ease-in-out infinite', animationDelay: '0.2s' }} />
                    <span style={{ width: '6px', height: '6px', background: theme === 'theme-3' ? '#06b6d4' : '#8b5cf6', borderRadius: '50%', animation: 'float-nong-mem 1.2s ease-in-out infinite', animationDelay: '0.4s' }} />
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Quick Prompts Chips */}
            <div style={{
              display: 'flex',
              gap: '6px',
              padding: '0 16px 10px 16px',
              overflowX: 'auto',
              flexShrink: 0,
              scrollbarWidth: 'none'
            }}>
              {[
                { label: 'บ่นฉันหน่อย 🥱', prompt: 'บ่นฉันหน่อยสิ ทำไมฉันขี้เกียจจัง' },
                { label: 'คำศัพท์มันยาก 🧠', prompt: 'ภาษาอังกฤษยากจัง ทำยังไงดีน้อง Mem' },
                { label: 'แกตลกดีว่ะ 🤪', prompt: 'ทำไมกวนตีนจังน้อง Mem นึกว่าน่ารักหรอ' }
              ].map((chip, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setInputVal(chip.prompt);
                  }}
                  style={{
                    flexShrink: 0,
                    padding: '6px 12px',
                    borderRadius: '12px',
                    fontSize: '0.7rem',
                    fontWeight: 600,
                    background: theme === 'theme-3' ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.05)',
                    border: theme === 'theme-3' ? '1px solid rgba(0,0,0,0.08)' : '1px solid rgba(255,255,255,0.08)',
                    color: theme === 'theme-3' ? '#475569' : '#cbd5e1',
                    cursor: 'pointer'
                  }}
                >
                  {chip.label}
                </button>
              ))}
            </div>

            {/* Footer input form */}
            <form 
              onSubmit={handleSendMessage}
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '12px 16px',
                borderTop: theme === 'theme-3' ? '1px solid rgba(0, 0, 0, 0.08)' : '1px solid rgba(255, 255, 255, 0.1)',
                background: theme === 'theme-3' ? 'rgba(0, 0, 0, 0.01)' : 'rgba(0, 0, 0, 0.1)'
              }}
            >
              <input
                type="text"
                value={inputVal}
                onChange={(e) => setInputVal(e.target.value)}
                placeholder={isLoading ? 'กำลังคิดคำด่า...' : 'บ่นอะไรใส่น้อง Mem ซิ...'}
                disabled={isLoading}
                style={{
                  flex: 1,
                  background: theme === 'theme-3' ? '#f1f5f9' : 'rgba(255, 255, 255, 0.05)',
                  border: theme === 'theme-3' ? '1px solid #cbd5e1' : '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '14px',
                  padding: '8px 12px',
                  fontSize: '0.8rem',
                  color: theme === 'theme-3' ? '#1e293b' : '#ffffff',
                  outline: 'none',
                  marginRight: '8px'
                }}
              />
              <button
                type="submit"
                disabled={isLoading || !inputVal.trim()}
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: theme === 'theme-2'
                    ? '#eab308'
                    : theme === 'theme-3'
                      ? '#06b6d4'
                      : '#8b5cf6',
                  border: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: (isLoading || !inputVal.trim()) ? 'not-allowed' : 'pointer',
                  color: '#ffffff',
                  opacity: (isLoading || !inputVal.trim()) ? 0.6 : 1
                }}
              >
                <Send size={14} />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
