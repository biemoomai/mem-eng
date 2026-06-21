import React from 'react';
import { useTheme } from '../context/ThemeContext';
import { motion } from 'framer-motion';

export default function ThemeBackground() {
  const { theme } = useTheme();

  if (theme === 'theme-2') {
    return (
      <div style={{
        position: 'fixed',
        inset: 0,
        zIndex: -1,
        background: '#050505',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        pointerEvents: 'none'
      }}>
        {/* Subtle noise texture */}
        <div style={{
          position: 'absolute',
          inset: 0,
          opacity: 0.03,
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`
        }} />
        
        {/* Brutalist Typographic Background */}
        <div style={{
          position: 'absolute',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          opacity: 0.04,
          fontFamily: "'Outfit', sans-serif",
          fontWeight: 900,
          lineHeight: 0.8,
          letterSpacing: '-0.05em',
          transform: 'rotate(-5deg) scale(1.2)',
          color: '#ffffff'
        }}>
          <span style={{ fontSize: '28vh' }}>MEM</span>
          <span style={{ fontSize: '28vh' }}>ENG</span>
        </div>
      </div>
    );
  }

  // Theme 1: Default App background is handled by CSS body/root gradient
  return null;
}
