import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const [theme, setThemeState] = useState('theme-1');

  useEffect(() => {
    try {
      localStorage.setItem('appTheme', 'theme-1');
      
      // Remove any existing theme classes
      document.documentElement.classList.remove('theme-1', 'theme-2', 'theme-3', 'light-mode');
      // Add the active theme class to root
      document.documentElement.classList.add('theme-1');
      
      // We also enforce dark mode color scheme base
      localStorage.setItem('theme', 'dark');
    } catch (e) {}
  }, []);

  const setTheme = () => {
    setThemeState('theme-1');
  };

  const toggleTheme = () => {
    setThemeState('theme-1');
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
