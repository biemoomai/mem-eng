import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(() => {
    try {
      const saved = localStorage.getItem('appTheme');
      if (saved === 'theme-3') return 'theme-1';
      return saved || 'theme-1'; // Default to Theme 1 (Glass)
    } catch (e) {
      return 'theme-1';
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('appTheme', theme);
      
      // Remove any existing theme classes
      document.documentElement.classList.remove('theme-1', 'theme-2', 'theme-3', 'light-mode');
      // Add the active theme class to root
      document.documentElement.classList.add(theme);
      
      // We also enforce dark mode color scheme base
      localStorage.setItem('theme', 'dark');
    } catch (e) {}
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => {
      if (prev === 'theme-1') return 'theme-2';
      return 'theme-1';
    });
  };

  const value = {
    theme,
    setTheme,
    toggleTheme
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
