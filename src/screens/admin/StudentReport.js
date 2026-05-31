// src/screens/admin/StudentReport.js
import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  StatusBar, ActivityIndicator, Dimensions, Share, Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import {
  getStudentById,
  getSchedulesByStudent,
  getAttendanceStatsByStudent,
} from '../../lib/supabase';
import { useAppTheme } from '../../context/ThemeContext';

const { width } = Dimensions.get('window');

const FONTS = {
  black: 'Outfit_900Black',
  bold: 'Outfit_700Bold',
  semi: 'Outfit_600SemiBold',
  body: 'Inter_400Regular',
  bodySemi: 'Inter_600SemiBold',
};

function getInitials(name = '') {
  return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
}

const InfoRow = ({ icon, label, value, colors }) => (
  <View style={styles.infoRow}>
    <View style={[styles.infoIcon, { backgroundColor: colors.bg }]}>
      <Ionicons name={icon} size={16} color={colors.primary} />
    </View>
    <Text style={[styles.infoLabel, { color: '#94A3B8' }]}>{label}</Text>
    <Text style={[styles.infoValue, { color: colors.text }]}>{value}</Text>
  </View>
);

const StatBox = ({ label, value, color, bg }) => (
  <View style={[styles.statBox, { backgroundColor: bg }]}>
    <Text style={[styles.statNum, { color }]}>{value}</Text>
    <Text style={[styles.statLbl, { color }]}>{label}</Text>
  </View>
);

export default function StudentReport() {
  const { colors } = useAppTheme();
  const navigation = useNavigation();
  const route = useRoute();
  const { studentId } = route.params || {};

  const [loading, setLoading]   = useState(true);
  const [student, setStudent]   = useState(null);
  const [schedules, setSchedules] = useState([]);
  const [attStats, setAttStats] = useState({ total: 0, present: 0, percent: 0 });

  useFocusEffect(useCallback(() => {
    (async () => {
      setLoading(true);
      const [stuRes, schRes, attRes] = await Promise.all([
        getStudentById(studentId),
        getSchedulesByStudent(studentId),
        getAttendanceStatsByStudent(studentId),
      ]);
      if (stuRes.data) setStudent(stuRes.data);
      if (schRes.data) setSchedules(schRes.data);
      setAttStats(attRes);
      setLoading(false);
    })();
  }, [studentId]));

  const completed  = schedules.filter(s => s.status === 'Completed').length;
  const total      = student?.total_days || 20;
  const progress   = Math.min((completed / total) * 100, 100);
  const isReady    = completed >= total;

  const handleShare = async () => {
    if (!student) return;
    const msg =
      `📋 PRASHANT DRIVING ACADEMY\n` +
      `Student Report Card\n\n` +
      `👤 Name: ${student.name}\n` +
      `📱 Phone: ${student.phone}\n` +
      `🚗 License: ${student.license_type}\n\n` +
      `✅ Sessions Completed: ${completed}/${total}\n` +
      `📊 Attendance: ${attStats.percent}%\n` +
      `🏆 Status: ${isReady ? 'READY FOR TEST ✅' : 'In Training 🔄'}\n\n` +
      `— Prashant Sir, Manjalpur Vadodara`;
    await Share.share({ message: msg });
  };

  if (loading) return (
    <View style={[styles.center, { backgroundColor: colors.bg }]}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  );

  if (!student) return (
    <View style={[styles.center, { backgroundColor: colors.bg }]}>
      <Text style={{ color: colors.text }}>Student not found.</Text>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primaryDark} />

      <LinearGradient colors={[colors.primaryDark, colors.primary]} style={styles.hero}>
        <SafeAreaView edges={['top']}>
          <View style={styles.headerRow}>
            <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
              <Ionicons name="arrow-back" size={22} color="#fff" />
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <Text style={styles.heroSub}>Student</Text>
              <Text style={styles.heroTitle}>Report Card</Text>
            </View>
            <TouchableOpacity style={styles.shareBtn} onPress={handleShare}>
              <Ionicons name="share-social-outline" size={20} color="#fff" />
            </TouchableOpacity>
          </View>

          {/* Avatar + Name */}
          <View style={styles.profileSection}>
            <View style={[styles.avatar, { backgroundColor: colors.accent }]}>
              <Text style={[styles.avatarTxt, { color: colors.primaryDark }]}>
                {getInitials(student.name)}
              </Text>
            </View>
            <Text style={styles.studentName}>{student.name}</Text>
            <Text style={styles.studentSub}>{student.phone} • {student.license_type}</Text>
            {isReady && (
              <View style={styles.readyBadge}>
                <Ionicons name="trophy" size={14} color="#10B981" />
                <Text style={styles.readyTxt}>READY FOR TEST</Text>
              </View>
            )}
          </View>
        </SafeAreaView>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Progress Card */}
        <View style={[styles.card, { backgroundColor: colors.white, shadowColor: colors.primary }]}>
          <View style={styles.cardHeader}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>Training Progress</Text>
            <Text style={[styles.cardPct, { color: colors.primary }]}>{Math.round(progress)}%</Text>
          </View>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${progress}%`, backgroundColor: colors.primary }]} />
          </View>
          <Text style={styles.progressMsg}>
            {completed} of {total} sessions completed
            {isReady ? ' 🎉' : ` · ${total - completed} remaining`}
          </Text>

          {/* Stat Boxes */}
          <View style={styles.statsRow}>
            <StatBox label="Done"      value={completed}          color="#185FA5" bg="#E6F1FB" />
            <StatBox label="Remaining" value={total - completed}  color="#854F0B" bg="#FAEEDA" />
            <StatBox label="Attendance" value={`${attStats.percent}%`} color="#3B6D11" bg="#EAF3DE" />
          </View>
        </View>

        {/* Student Info */}
        <View style={[styles.card, { backgroundColor: colors.white, shadowColor: colors.primary }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Student Details</Text>
          <InfoRow icon="person-outline"    label="Name"         value={student.name}                    colors={colors} />
          <InfoRow icon="call-outline"      label="Phone"        value={student.phone}                   colors={colors} />
          <InfoRow icon="ribbon-outline"    label="License"      value={student.license_type}            colors={colors} />
          <InfoRow icon="location-outline"  label="Address"      value={student.address || '—'}          colors={colors} />
          <InfoRow icon="calendar-outline"  label="Joined"       value={student.joining_date?.split('T')[0] || '—'} colors={colors} />
          <InfoRow icon="checkmark-circle-outline" label="Status" value={student.status?.toUpperCase() || 'ACTIVE'} colors={colors} />
        </View>

        {/* Recent Sessions */}
        <View style={[styles.card, { backgroundColor: colors.white, shadowColor: colors.primary }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Recent Sessions</Text>
          {schedules.slice(0, 5).map((s, i) => (
            <View key={s.id || i} style={styles.sessionRow}>
              <View style={[styles.sessionDot, {
                backgroundColor: s.status === 'Completed' ? '#10B981' : s.status === 'Cancelled' ? '#EF4444' : '#3B82F6'
              }]} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.sessionDate, { color: colors.text }]}>{s.session_date}</Text>
                <Text style={styles.sessionTime}>{s.session_time}</Text>
              </View>
              <View style={[styles.sessionBadge, {
                backgroundColor: s.status === 'Completed' ? '#DCFCE7' : s.status === 'Cancelled' ? '#FEE2E2' : '#DBEAFE'
              }]}>
                <Text style={[styles.sessionBadgeTxt, {
                  color: s.status === 'Completed' ? '#10B981' : s.status === 'Cancelled' ? '#EF4444' : '#3B82F6'
                }]}>{s.status?.toUpperCase()}</Text>
              </View>
            </View>
          ))}
          {schedules.length === 0 && (
            <Text style={styles.noData}>No sessions recorded yet.</Text>
          )}
        </View>

        {/* Share Button */}
        <TouchableOpacity style={[styles.shareFullBtn, { shadowColor: colors.primary }]} onPress={handleShare}>
          <LinearGradient colors={[colors.primary, colors.primaryDark]} style={styles.shareGrad}>
            <Ionicons name="share-social" size={20} color="#fff" />
            <Text style={styles.shareTxt}>Share Report Card</Text>
          </LinearGradient>
        </TouchableOpacity>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  hero: { paddingBottom: 30, paddingHorizontal: 20 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 20 },
  backBtn: { width: 40, height: 40, borderRadius: 13, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' },
  shareBtn: { width: 40, height: 40, borderRadius: 13, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' },
  heroSub: { fontSize: 11, color: 'rgba(255,255,255,0.45)', fontFamily: FONTS.bodySemi, letterSpacing: 1.5, textTransform: 'uppercase' },
  heroTitle: { fontFamily: FONTS.black, fontSize: 26, color: '#FFFFFF', marginTop: 2 },
  profileSection: { alignItems: 'center', paddingBottom: 10 },
  avatar: { width: 72, height: 72, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  avatarTxt: { fontFamily: FONTS.black, fontSize: 26 },
  studentName: { fontFamily: FONTS.black, fontSize: 22, color: '#FFFFFF' },
  studentSub: { fontFamily: FONTS.bodySemi, fontSize: 13, color: 'rgba(255,255,255,0.6)', marginTop: 4 },
  readyBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#DCFCE7', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, marginTop: 10 },
  readyTxt: { fontFamily: FONTS.bold, fontSize: 11, color: '#10B981', letterSpacing: 0.5 },
  scroll: { padding: 16, paddingBottom: 50 },
  card: { borderRadius: 24, padding: 20, marginBottom: 14, elevation: 3, shadowOpacity: 0.07, shadowRadius: 12, shadowOffset: { width: 0, height: 4 } },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  cardTitle: { fontFamily: FONTS.bold, fontSize: 16 },
  cardPct: { fontFamily: FONTS.black, fontSize: 16 },
  progressBar: { height: 10, backgroundColor: '#F1F5F9', borderRadius: 5, overflow: 'hidden', marginBottom: 8 },
  progressFill: { height: '100%', borderRadius: 5 },
  progressMsg: { fontFamily: FONTS.bodySemi, fontSize: 12, color: '#64748B', marginBottom: 16 },
  statsRow: { flexDirection: 'row', gap: 8 },
  statBox: { flex: 1, borderRadius: 14, padding: 12, alignItems: 'center' },
  statNum: { fontFamily: FONTS.black, fontSize: 20 },
  statLbl: { fontFamily: FONTS.bodySemi, fontSize: 9, marginTop: 2, textTransform: 'uppercase', letterSpacing: 0.5 },
  infoRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  infoIcon: { width: 30, height: 30, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  infoLabel: { fontFamily: FONTS.bodySemi, fontSize: 12, flex: 1 },
  infoValue: { fontFamily: FONTS.bold, fontSize: 13 },
  sessionRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F8FAFC' },
  sessionDot: { width: 8, height: 8, borderRadius: 4, marginRight: 12 },
  sessionDate: { fontFamily: FONTS.bold, fontSize: 13 },
  sessionTime: { fontFamily: FONTS.body, fontSize: 11, color: '#94A3B8', marginTop: 2 },
  sessionBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  sessionBadgeTxt: { fontFamily: FONTS.bold, fontSize: 9 },
  noData: { fontFamily: FONTS.body, fontSize: 13, color: '#94A3B8', textAlign: 'center', paddingVertical: 20 },
  shareFullBtn: { borderRadius: 20, overflow: 'hidden', elevation: 8, shadowOpacity: 0.2, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, marginBottom: 10 },
  shareGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 56, gap: 10 },
  shareTxt: { fontFamily: FONTS.black, fontSize: 15, color: '#FFFFFF' },
});
