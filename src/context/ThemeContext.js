import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const Themes = {
  royal: {
    name: 'Royal Indigo',
    primary: '#1A3C6E',
    primaryDark: '#0D1B2A',
    accent: '#FCD400',
    bg: '#F8FAFC',
    text: '#1E293B',
    muted: '#64748B',
    white: '#FFFFFF',
  },
  emerald: {
    name: 'Emerald Green',
    primary: '#064E3B',
    primaryDark: '#022C22',
    accent: '#10B981',
    bg: '#F0FDF4',
    text: '#064E3B',
    muted: '#6B7280',
    white: '#FFFFFF',
  },
  midnight: {
    name: 'Midnight Black',
    primary: '#0F172A',
    primaryDark: '#020617',
    accent: '#3B82F6',
    bg: '#F8FAFC',
    text: '#0F172A',
    muted: '#94A3B8',
    white: '#FFFFFF',
  },
  slate: {
    name: 'Carbon Slate',
    primary: '#334155',
    primaryDark: '#1E293B',
    accent: '#94A3B8',
    bg: '#F1F5F9',
    text: '#1E293B',
    muted: '#64748B',
    white: '#FFFFFF',
  },
  titanium: {
    name: 'Titanium Gold',
    primary: '#475569',
    primaryDark: '#1E293B',
    accent: '#F59E0B',
    bg: '#F8FAFC',
    text: '#0F172A',
    muted: '#64748B',
    white: '#FFFFFF',
  },
  oceania: {
    name: 'Oceania Deep',
    primary: '#0C4A6E',
    primaryDark: '#082F49',
    accent: '#0EA5E9',
    bg: '#F0F9FF',
    text: '#0C4A6E',
    muted: '#64748B',
    white: '#FFFFFF',
  },
  nordic: {
    name: 'Nordic Sea',
    primary: '#1E3A8A',
    primaryDark: '#172554',
    accent: '#A5F3FC',
    bg: '#F8FAFC',
    text: '#1E3A8A',
    muted: '#64748B',
    white: '#FFFFFF',
  },
  velvet: {
    name: 'Velvet Ruby',
    primary: '#7F1D1D',
    primaryDark: '#450A0A',
    accent: '#FCD400',
    bg: '#FEF2F2',
    text: '#7F1D1D',
    muted: '#9CA3AF',
    white: '#FFFFFF',
  },
};

const THEME_KEY = 'globalAppTheme';
const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const [currentTheme, setCurrentTheme] = useState('royal');
  const [colors, setColors] = useState(Themes.royal);
  const [role, setRole] = useState('admin');

  // Load saved theme and role on mount
  useEffect(() => {
    (async () => {
      try {
        const [savedTheme, savedRole] = await Promise.all([
          AsyncStorage.getItem(THEME_KEY),
          AsyncStorage.getItem('userRole'),
        ]);
        if (savedTheme && Themes[savedTheme]) {
          setCurrentTheme(savedTheme);
          setColors(Themes[savedTheme]);
        }
        if (savedRole) setRole(savedRole);
      } catch (e) {
        console.log('ThemeContext: failed to load saved state');
      }
    })();
  }, []);

  /**
   * changeTheme — updates the active theme globally and persists it.
   * Works from any screen (Login, Admin, Student).
   */
  const changeTheme = async (themeKey) => {
    if (!Themes[themeKey]) return;
    setCurrentTheme(themeKey);
    setColors(Themes[themeKey]);
    try {
      await AsyncStorage.setItem(THEME_KEY, themeKey);
    } catch (e) {
      console.log('ThemeContext: failed to persist theme');
    }
  };

  /**
   * updateRole — call after login/logout to record the active role.
   */
  const updateRole = (newRole) => {
    setRole(newRole);
    AsyncStorage.setItem('userRole', newRole).catch(() => {});
  };

  return (
    <ThemeContext.Provider value={{ currentTheme, colors, changeTheme, updateRole, Themes, role }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useAppTheme = () => useContext(ThemeContext);
