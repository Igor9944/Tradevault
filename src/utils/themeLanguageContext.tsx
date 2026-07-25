import React, { createContext, useContext, useState, useEffect } from 'react';
import { translations } from './translations';

export type Lang = 'fr';
export type Theme = 'light' | 'dark';

interface ThemeLanguageContextType {
  lang: Lang;
  toggleLang: () => void;
  setLang: (lang: Lang) => void;
  theme: Theme;
  toggleTheme: () => void;
  t: (key: string) => string;
}

const ThemeLanguageContext = createContext<ThemeLanguageContextType | undefined>(undefined);

export const ThemeLanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const lang: Lang = 'fr';
  const [theme, setTheme] = useState<Theme>('dark');

  useEffect(() => {
    document.documentElement.className = theme;
  }, [theme]);

  const toggleLang = () => {};
  const setLang = (newLang: Lang) => {};

  const toggleTheme = () => setTheme(prev => prev === 'light' ? 'dark' : 'light');

  const t = (key: string): string => {
    return translations['fr'][key] || key;
  };

  return (
    <ThemeLanguageContext.Provider value={{
      lang,
      toggleLang,
      setLang,
      theme,
      toggleTheme,
      t
    }}>
      {children}
    </ThemeLanguageContext.Provider>
  );
};

export const useThemeLang = () => {
  const context = useContext(ThemeLanguageContext);
  if (!context) {
    throw new Error('useThemeLang must be used within a ThemeLanguageProvider');
  }
  return context;
};
