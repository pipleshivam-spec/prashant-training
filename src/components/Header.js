// src/components/Header.js
// Reusable header with bilingual toggle EN / ગુજ
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';

const COLORS = { blue: '#1A3C6E', gold: '#FCD400', white: '#FFFFFF', bg: '#f8f9fa' };

export default function Header({ title }) {
  const { i18n } = useTranslation();
  const isGu = i18n.language === 'gu';

  const toggleLang = () => i18n.changeLanguage(isGu ? 'en' : 'gu');

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      <TouchableOpacity style={styles.pill} onPress={toggleLang} activeOpacity={0.8}>
        <Text style={[styles.pillText, !isGu && styles.pillActive]}>EN</Text>
        <Text style={[styles.pillText, isGu && styles.pillActive]}>ગુ</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.blue,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 48,
    paddingBottom: 14,
  },
  title: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: '700',
    flex: 1,
  },
  pill: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 20,
    padding: 3,
    gap: 2,
  },
  pillText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
    fontWeight: '600',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
  },
  pillActive: {
    backgroundColor: COLORS.gold,
    color: COLORS.blue,
  },
});
