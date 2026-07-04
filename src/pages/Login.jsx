import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

const Login = () => {
  const { user, signIn, signUp, signInWithGoogle, isAnonymous, loginAsGuest } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user && !isAnonymous) {
      navigate('/');
    }
  }, [user, isAnonymous, navigate]);

  const [isLoginMode, setIsLoginMode] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage('');

    try {
      const cleanEmail = email.trim(); // Supabase hates trailing spaces!
      
      if (isLoginMode) {
        const { error } = await signIn(cleanEmail, password);
        if (error) throw error;
      } else {
        const { error } = await signUp(cleanEmail, password);
        if (error) throw error;
        setMessage('Check your email for the confirmation link!');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '1rem', justifyContent: 'flex-start', alignItems: 'center', minHeight: '100vh', background: 'var(--bg-color)', overflowY: 'auto', boxSizing: 'border-box' }}>
      
      <div style={{ textAlign: 'center', marginTop: '1rem', marginBottom: '1.5rem', width: '100%', maxWidth: '440px' }}>
        <h1 style={{ fontSize: '2.2rem', fontWeight: 950, letterSpacing: '-1px', background: 'linear-gradient(135deg, #a78bfa 0%, #06b6d4 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', margin: 0 }}>
          Mem-eng (จำอิ้ง)
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: '0.25rem', marginInline: 0 }}>Spaced Repetition with Rich Contexts</p>
      </div>

      {isAnonymous && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-panel"
          style={{
            padding: '0.75rem 1rem',
            margin: '0 auto 1rem auto',
            maxWidth: '440px',
            width: '100%',
            background: 'linear-gradient(135deg, rgba(167, 139, 250, 0.08) 0%, rgba(6, 182, 212, 0.08) 100%)',
            border: '1px solid rgba(167, 139, 250, 0.25)',
            borderRadius: '16px',
            textAlign: 'center',
            boxShadow: '0 8px 32px rgba(167, 139, 250, 0.08)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '0.3rem',
            boxSizing: 'border-box'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#a78bfa', fontWeight: 800, fontSize: '0.8rem' }}>
            <span>✨ คุณกำลังใช้งานแบบ Guest</span>
          </div>
          <p style={{ margin: 0, fontSize: '0.7rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
            กรอกข้อมูลเพื่อสมัครสมาชิกใหม่ด้านล่าง ระบบจะเชื่อมโยงข้อมูลคำศัพท์และประวัติการเรียนที่คุณเพิ่งเล่นไว้ให้ครบถ้วนทันที!
          </p>
        </motion.div>
      )}

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-panel"
        style={{ padding: '1.25rem', width: '100%', maxWidth: '440px', boxSizing: 'border-box', marginBottom: '2rem' }}
      >
        <h2 style={{ marginBottom: '1rem', marginTop: 0, textAlign: 'center', fontSize: '1.2rem', fontWeight: 800 }}>
          {isLoginMode ? 'Welcome Back' : 'Create Account'}
        </h2>

        {error && (
          <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', padding: '0.75rem', borderRadius: '12px', marginBottom: '1rem', fontSize: '0.8rem', textAlign: 'center' }}>
            {error}
          </div>
        )}

        {message && (
          <div style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', padding: '0.75rem', borderRadius: '12px', marginBottom: '1rem', fontSize: '0.8rem', textAlign: 'center' }}>
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', marginBottom: '0.35rem', color: 'var(--text-secondary)' }}>Email</label>
            <input
              type="email"
              className="glass-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@email.com"
              required
              style={{ fontSize: '0.85rem', padding: '0.55rem 0.75rem' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', marginBottom: '0.35rem', color: 'var(--text-secondary)' }}>Password</label>
            <input
              type="password"
              className="glass-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              style={{ fontSize: '0.85rem', padding: '0.55rem 0.75rem' }}
            />
          </div>

          <button
            type="submit"
            className="glass-button primary animate-scale"
            style={{ marginTop: '0.5rem', padding: '0.65rem 0', fontSize: '0.85rem' }}
            disabled={loading}
          >
            {loading ? 'Processing...' : (isLoginMode ? 'Sign In' : 'Sign Up')}
          </button>
        </form>

        <div style={{ display: 'flex', alignItems: 'center', margin: '1rem 0', gap: '0.5rem' }}>
          <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.08)' }} />
          <span style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px' }}>Or</span>
          <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.08)' }} />
        </div>

        <button
          onClick={async () => {
            setLoading(true);
            setError(null);
            try {
              const { error } = await signInWithGoogle();
              if (error) throw error;
            } catch (err) {
              setError(err.message);
            } finally {
              setLoading(false);
            }
          }}
          className="glass-button animate-scale"
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.1)',
            color: 'white',
            fontWeight: 800,
            fontSize: '0.78rem',
            padding: '0.65rem 0',
            borderRadius: '12px',
            cursor: 'pointer'
          }}
          disabled={loading}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 6.64l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          <span>Sign In with Google</span>
        </button>

        {isAnonymous ? (
          <button
            onClick={() => navigate('/')}
            className="glass-button primary animate-scale"
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              background: 'linear-gradient(135deg, #a78bfa 0%, #06b6d4 100%)',
              border: 'none',
              color: 'white',
              fontWeight: 900,
              fontSize: '0.8rem',
              padding: '0.65rem 0',
              borderRadius: '12px',
              cursor: 'pointer',
              marginTop: '0.65rem',
              boxShadow: '0 8px 25px rgba(167, 139, 250, 0.25)'
            }}
          >
            <span>กลับสู่หน้าเรียนรู้ศัพท์ (Back to Translate) ➔</span>
          </button>
        ) : (
          <button
            onClick={async () => {
              setLoading(true);
              setError(null);
              try {
                const { error } = await loginAsGuest();
                if (error) throw error;
                navigate('/');
              } catch (err) {
                setError(err.message);
              } finally {
                setLoading(false);
              }
            }}
            className="glass-button animate-scale"
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              background: 'rgba(255,255,255,0.01)',
              border: '1px solid rgba(255,255,255,0.06)',
              color: 'var(--text-secondary)',
              fontWeight: 800,
              fontSize: '0.78rem',
              padding: '0.65rem 0',
              borderRadius: '12px',
              cursor: 'pointer',
              marginTop: '0.65rem'
            }}
            disabled={loading}
          >
            <span>Continue as Guest (ทดลองใช้งาน)</span>
          </button>
        )}

        <p style={{ textAlign: 'center', marginTop: '1.25rem', marginBottom: '0.25rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
          {isLoginMode ? "Don't have an account? " : "Already have an account? "}
          <span
            style={{ color: 'var(--secondary-accent)', cursor: 'pointer', fontWeight: 600 }}
            onClick={() => { setIsLoginMode(!isLoginMode); setError(null); setMessage(''); }}
          >
            {isLoginMode ? 'Sign Up' : 'Sign In'}
          </span>
        </p>

        <p style={{ textAlign: 'center', margin: '0.35rem 0 0', fontSize: '0.68rem', color: 'rgba(148, 163, 184, 0.78)', lineHeight: 1.5 }}>
          By continuing, you agree to our{' '}
          <span onClick={() => navigate('/terms')} style={{ color: '#94a3b8', cursor: 'pointer', fontWeight: 700 }}>Terms</span>
          {' '}and{' '}
          <span onClick={() => navigate('/privacy')} style={{ color: '#94a3b8', cursor: 'pointer', fontWeight: 700 }}>Privacy Policy</span>.
        </p>
      </motion.div>
    </div>
  );
};

export default Login;
