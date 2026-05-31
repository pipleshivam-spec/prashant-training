// src/screens/admin/SessionNotes.js
import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  StatusBar, ActivityIndicator, TextInput, Alert, KeyboardAvoidingView, Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { getScheduleById, updateSchedule } from '../../lib/supabase';
import { useAppTheme } from '../../context/ThemeContext';

const FONTS = {
  black: 'Outfit_900Black',
  bold: 'Outfit_700Bold',
  semi: 'Outfit_600SemiBold',
  body: 'Inter_400Regular',
  bodySemi: 'Inter_600SemiBold',
};

const QUICK_NOTES = [
  '✅ Good progress today',
  '🚗 Excellent reversing',
  '⚠️ Needs work on parking',
  '🛑 Improve braking',
  '↩️ Work on turning',
  '🏆 Ready for test',
  '📍 Lane discipline good',
  '🔄 Practice gear shifts',
];

const RATINGS = [
  { value: 5, label: 'Excellent', color: '#10B981', icon: 'star' },
  { value: 4, label: 'Good',      color: '#3B82F6', icon: 'thumbs-up' },
  { value: 3, label: 'Average',   color: '#F59E0B', icon: 'remove-circle' },
  { value: 2, label: 'Poor',      color: '#EF4444', icon: 'thumbs-down' },
];

function getInitials(name = '') {
  return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
}

export default function SessionNotes() {
  const { colors } = useAppTheme();
  const navigation = useNavigation();
  const route = useRoute();
  const { sessionId } = route.params || {};

  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);
  const [session,  setSession]  = useState(null);
  const [note,     setNote]     = useState('');
  const [rating,   setRating]   = useState(null);

  useFocusEffect(useCallback(() => {
    (async () => {
      setLoading(true);
      const { data } = await getScheduleById(sessionId);
      if (data) {
        setSession(data);
        setNote(data.notes || '');
        setRating(data.rating || null);
      }
      setLoading(false);
    })();
  }, [sessionId]));

  const appendQuickNote = (text) => {
    setNote(prev => prev ? `${prev}\n${text}` : text);
  };

  const handleSave = async () => {
    if (!note.trim() && !rating) {
      Alert.alert('Nothing to save', 'Add a note or rating first.');
      return;
    }
    setSaving(true);
    const { error } = await updateSchedule(sessionId, { notes: note.trim(), rating });
    setSaving(false);
    if (error) Alert.alert('Error', error.message);
    else {
      Alert.alert('Saved ✅', 'Session feedback saved successfully.');
      navigation.goBack();
    }
  };

  if (loading) return (
    <View style={[styles.center, { backgroundColor: colors.bg }]}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.bg }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar barStyle="light-content" backgroundColor={colors.primaryDark} />

      <LinearGradient colors={[colors.primaryDark, colors.primary]} style={styles.hero}>
        <SafeAreaView edges={['top']}>
          <View style={styles.headerRow}>
            <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
              <Ionicons name="arrow-back" size={22} color="#fff" />
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <Text style={styles.heroSub}>Session</Text>
              <Text style={styles.heroTitle}>Feedback & Notes</Text>
            </View>
          </View>

          {/* Session Info */}
          {session && (
            <View style={styles.sessionInfo}>
              <View style={[styles.avatar, { backgroundColor: colors.accent }]}>
                <Text style={[styles.avatarTxt, { color: colors.primaryDark }]}>
                  {getInitials(session.students?.name || 'TR')}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.studentName}>{session.students?.name || 'Trainee'}</Text>
                <Text style={styles.sessionMeta}>{session.session_date} • {session.session_time}</Text>
              </View>
              <View style={[styles.statusPill, {
                backgroundColor: session.status === 'Completed' ? '#DCFCE7' : '#DBEAFE'
              }]}>
                <Text style={[styles.statusTxt, {
                  color: session.status === 'Completed' ? '#10B981' : '#3B82F6'
                }]}>{session.status}</Text>
              </View>
            </View>
          )}
        </SafeAreaView>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

        {/* Rating */}
        <View style={[styles.card, { backgroundColor: colors.white, shadowColor: colors.primary }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Session Rating</Text>
          <View style={styles.ratingRow}>
            {RATINGS.map(r => (
              <TouchableOpacity
                key={r.value}
                style={[styles.ratingBtn, { borderColor: rating === r.value ? r.color : '#E2E8F0' },
                  rating === r.value && { backgroundColor: r.color }]}
                onPress={() => setRating(r.value)}
              >
                <Ionicons name={r.icon} size={20} color={rating === r.value ? '#fff' : r.color} />
                <Text style={[styles.ratingTxt, { color: rating === r.value ? '#fff' : r.color }]}>
                  {r.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Quick Notes */}
        <View style={[styles.card, { backgroundColor: colors.white, shadowColor: colors.primary }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Quick Tags</Text>
          <View style={styles.quickRow}>
            {QUICK_NOTES.map((qn, i) => (
              <TouchableOpacity
                key={i}
                style={[styles.quickChip, { backgroundColor: colors.bg, borderColor: '#E2E8F0' }]}
                onPress={() => appendQuickNote(qn)}
              >
                <Text style={[styles.quickTxt, { color: colors.text }]}>{qn}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Notes Input */}
        <View style={[styles.card, { backgroundColor: colors.white, shadowColor: colors.primary }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Instructor Notes</Text>
          <TextInput
            style={[styles.noteInput, { color: colors.text, borderColor: '#E2E8F0', backgroundColor: colors.bg }]}
            value={note}
            onChangeText={setNote}
            placeholder="Write detailed feedback about this session..."
            placeholderTextColor="#94A3B8"
            multiline
            numberOfLines={6}
            textAlignVertical="top"
          />
          <Text style={styles.charCount}>{note.length} characters</Text>
        </View>

        {/* Save Button */}
        <TouchableOpacity
          style={[styles.saveBtn, { shadowColor: colors.accent }]}
          onPress={handleSave}
          disabled={saving}
        >
          <LinearGradient colors={[colors.accent, colors.accent]} style={styles.saveGrad}>
            {saving
              ? <ActivityIndicator color={colors.primaryDark} />
              : <>
                  <Ionicons name="checkmark-circle" size={22} color={colors.primaryDark} />
                  <Text style={[styles.saveTxt, { color: colors.primaryDark }]}>Save Feedback</Text>
                </>
            }
          </LinearGradient>
        </TouchableOpacity>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  hero: { paddingBottom: 24, paddingHorizontal: 20 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 16 },
  backBtn: { width: 40, height: 40, borderRadius: 13, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' },
  heroSub: { fontSize: 11, color: 'rgba(255,255,255,0.45)', fontFamily: FONTS.bodySemi, letterSpacing: 1.5, textTransform: 'uppercase' },
  heroTitle: { fontFamily: FONTS.black, fontSize: 26, color: '#FFFFFF', marginTop: 2 },
  sessionInfo: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 18, padding: 14 },
  avatar: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  avatarTxt: { fontFamily: FONTS.bold, fontSize: 16 },
  studentName: { fontFamily: FONTS.bold, fontSize: 15, color: '#FFFFFF' },
  sessionMeta: { fontFamily: FONTS.body, fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 2 },
  statusPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  statusTxt: { fontFamily: FONTS.bold, fontSize: 10 },
  scroll: { padding: 16, paddingBottom: 50 },
  card: { borderRadius: 24, padding: 20, marginBottom: 14, elevation: 3, shadowOpacity: 0.07, shadowRadius: 12, shadowOffset: { width: 0, height: 4 } },
  cardTitle: { fontFamily: FONTS.bold, fontSize: 15, marginBottom: 14 },
  ratingRow: { flexDirection: 'row', gap: 8 },
  ratingBtn: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 14, borderWidth: 1.5, gap: 4 },
  ratingTxt: { fontFamily: FONTS.bold, fontSize: 10 },
  quickRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  quickChip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1 },
  quickTxt: { fontFamily: FONTS.bodySemi, fontSize: 12 },
  noteInput: { borderWidth: 1, borderRadius: 16, padding: 14, fontSize: 14, fontFamily: FONTS.body, minHeight: 120 },
  charCount: { fontFamily: FONTS.body, fontSize: 11, color: '#94A3B8', textAlign: 'right', marginTop: 6 },
  saveBtn: { borderRadius: 20, overflow: 'hidden', elevation: 8, shadowOpacity: 0.3, shadowRadius: 12, shadowOffset: { width: 0, height: 4 } },
  saveGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 58, gap: 10 },
  saveTxt: { fontFamily: FONTS.black, fontSize: 16 },
});
