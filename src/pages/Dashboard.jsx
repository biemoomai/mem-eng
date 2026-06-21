import React from 'react';
import { PlayCircle, Flame, Target, CheckSquare, Youtube } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

const Dashboard = () => {
  const navigate = useNavigate();

  return (
    <div className="scrollable-content" style={{ padding: '1.5rem' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h2 style={{ fontSize: '1.1rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Welcome back,</h2>
          <h1 style={{ fontSize: '2rem', letterSpacing: '-0.5px' }}>Alex 👋</h1>
        </div>
        <div style={{ background: 'rgba(255,255,255,0.05)', padding: '0.4rem 0.8rem', borderRadius: '30px', display: 'flex', alignItems: 'center', gap: '0.4rem', border: '1px solid rgba(255,255,255,0.05)' }}>
          <Flame size={18} color="#f97316" />
          <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>14 Days</span>
        </div>
      </div>

      {/* Pitch Hook Banner */}
      <div style={{ padding: '0.5rem 0', marginBottom: '2rem' }}>
         <h3 style={{ fontSize: '1.4rem', fontWeight: 700, fontStyle: 'italic', background: 'linear-gradient(45deg, #f43f5e, #3b82f6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            "Stop Memorizing.<br/>Start Experiencing."
         </h3>
      </div>

      {/* Mode Selection Grid */}
      <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', color: 'var(--text-secondary)' }}>Choose your mode</h3>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem' }}>
        
        {/* Mode 1: Context is King */}
        <div 
          className="glass-panel" 
          onClick={() => navigate('/learn')}
          style={{ padding: '1.5rem', cursor: 'pointer', background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.15), rgba(40, 42, 54, 0.8))', border: '1px solid rgba(59, 130, 246, 0.3)' }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
            <div style={{ background: 'rgba(59, 130, 246, 0.2)', padding: '0.8rem', borderRadius: '16px', color: '#60a5fa' }}>
              <PlayCircle size={28} />
            </div>
            <div>
              <h4 style={{ fontSize: '1.2rem', marginBottom: '0.2rem' }}>Experience</h4>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                Learn from real-world contexts. No more translation flashcards.
              </p>
            </div>
          </div>
        </div>

        {/* Mode 2: Respect Your Time (Purge) */}
        <div 
          className="glass-panel" 
          onClick={() => navigate('/purge')}
          style={{ padding: '1.5rem', cursor: 'pointer' }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
            <div style={{ background: 'rgba(244, 63, 94, 0.1)', padding: '0.8rem', borderRadius: '16px', color: 'var(--accent-color)' }}>
              <CheckSquare size={28} />
            </div>
            <div>
              <h4 style={{ fontSize: '1.2rem', marginBottom: '0.2rem' }}>The Purge</h4>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                Respect your time. Filter out words you already know forever.
              </p>
            </div>
          </div>
        </div>

        {/* Mode 3: The Magic Sync */}
        <div 
          className="glass-panel" 
          onClick={() => navigate('/sync')}
          style={{ padding: '1.5rem', cursor: 'pointer' }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
            <div style={{ background: 'rgba(239, 68, 68, 0.1)', padding: '0.8rem', borderRadius: '16px', color: '#ef4444' }}>
              <Youtube size={28} />
            </div>
            <div>
              <h4 style={{ fontSize: '1.2rem', marginBottom: '0.2rem' }}>The Magic Sync</h4>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                Pull vocabulary directly from your last watched YouTube video.
              </p>
            </div>
          </div>
        </div>

      </div>
      
    </div>
  );
};

export default Dashboard;
