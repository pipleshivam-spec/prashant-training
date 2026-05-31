// AdminDashboard.js — Full Redesign
import React, { useState, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  ActivityIndicator, Dimensions, Alert, FlatList,
  RefreshControl, StatusBar, Modal
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { getAdminDashboardStats, signOut } from '../../lib/supabase';
import { Image } from 'react-native';
import { useAppTheme } from '../../context/ThemeContext';

const { width } = Dimensions.get('window');

const FONTS = {
  black:    'Outfit_900Black',
  bold:     'Outfit_700Bold',
  semi:     'Outfit_600SemiBold',
  body:     'Inter_400Regular',
  bodySemi: 'Inter_600SemiBold',
};

export default function AdminDashboard() {
  const { colors, changeTheme, Themes, currentTheme } = useAppTheme();
  const navigation = useNavigation();
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showThemes, setShowThemes] = useState(false);
  const [stats, setStats] = useState({
    activeStudents:    0,
    newStudentsWeek:   0,
    todaysCount:       0,
    totalSessions:     0,
    attendancePercent: 0,
    totalRevenue:      0,
    todaysSessions:    [],
    recentActivity:    [],
  });

  const todayStr = useMemo(() =>
    new Date().toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  , []);

  const loadData = async (isRefreshing = false) => {
    if (isRefreshing) setRefreshing(true); else setLoading(true);
    try {
      const { data } = await getAdminDashboardStats();
      if (data) setStats(data);
    } catch (_) {}
    setLoading(false);
    setRefreshing(false);
  };

  useFocusEffect(useCallback(() => { loadData(); }, []));

  const handleLogout = () => Alert.alert(
    'Logout', 'Exit the academy portal?',
    [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: async () => {
          await signOut();
          navigation.reset({ index: 0, routes: [{ name: 'LoginScreen' }] });
      }},
    ]
  );

  const getInitials = (name = '') =>
    name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();

  const avatarColors = [
    { bg: '#EEEDFE', text: '#534AB7' },
    { bg: '#EAF3DE', text: '#3B6D11' },
    { bg: '#FAEEDA', text: '#854F0B' },
    { bg: '#E6F1FB', text: '#185FA5' },
  ];

  // ── Sub-components ──────────────────────────────────────────────

  const StatCard = ({ label, value, iconName, iconColor, iconBg, dark, trend, trendWarn }) => (
    <View style={[styles.statCard, dark && { backgroundColor: colors.primaryDark, borderRadius: 18, padding: 14 }]}>
      <View style={[styles.statIconWrap, { backgroundColor: dark ? 'rgba(252,212,0,0.18)' : iconBg }]}>
        <Ionicons name={iconName} size={18} color={dark ? colors.accent : iconColor} />
      </View>
      <Text style={[styles.statNum, { color: dark ? '#FFFFFF' : colors.text }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: dark ? 'rgba(255,255,255,0.5)' : '#94A3B8' }]}>{label}</Text>
      {trend ? <Text style={[styles.statTrend, { color: trendWarn ? '#F59E0B' : '#10B981' }]}>{trend}</Text> : null}
    </View>
  );

  const ActionCard = ({ label, sub, iconName, iconColor, iconBg, dark, onPress }) => (
    <TouchableOpacity
      style={[
        styles.actionCard,
        { backgroundColor: dark ? colors.primaryDark : colors.white, borderColor: '#EEF2F8' },
        dark && { borderColor: 'transparent' },
      ]}
      onPress={onPress}
      activeOpacity={0.82}
    >
      <View style={[styles.actionIconWrap, { backgroundColor: dark ? 'rgba(252,212,0,0.15)' : iconBg }]}>
        <Ionicons name={iconName} size={22} color={dark ? colors.accent : iconColor} />
      </View>
      <Text style={[styles.actionLabel, { color: dark ? '#FFFFFF' : colors.text }]}>{label}</Text>
      <Text style={[styles.actionSub, { color: dark ? 'rgba(255,255,255,0.42)' : '#94A3B8' }]}>{sub}</Text>
    </TouchableOpacity>
  );

  const renderSession = ({ item, index }) => {
    const c = avatarColors[index % avatarColors.length];
    const isPractical = item.session_type === 'practical';
    return (
      <View style={styles.sessionRow}>
        <View style={[styles.sessionAvatar, { backgroundColor: c.bg }]}>
          {item.students?.avatar_url ? (
            <Image source={{ uri: item.students.avatar_url }} style={styles.sessionAvatarImg} />
          ) : (
            <Text style={[styles.sessionAvatarTxt, { color: c.text }]}>
              {getInitials(item.students?.name || 'TR')}
            </Text>
          )}
        </View>
        <View style={styles.sessionInfo}>
          <Text style={[styles.sessionName, { color: colors.text }]}>{item.students?.name || 'Trainee'}</Text>
          <View style={styles.sessionMeta}>
            <Text style={styles.sessionMetaTxt}>{item.license_type || 'LMV'}</Text>
            <View style={[styles.sessionBadge,
              isPractical ? { backgroundColor: '#EAF3DE' } : { backgroundColor: '#E6F1FB' }]}>
              <Text style={[styles.sessionBadgeTxt,
                isPractical ? { color: '#3B6D11' } : { color: '#185FA5' }]}>
                {(item.session_type || 'session').toUpperCase()}
              </Text>
            </View>
          </View>
        </View>
        <View style={styles.sessionRight}>
          <Text style={[styles.sessionTime, { color: colors.text }]}>{item.session_time || '--:--'}</Text>
          <Text style={styles.sessionDur}>{item.duration_minutes || 60}m</Text>
        </View>
      </View>
    );
  };

  // ── Render ───────────────────────────────────────────────────────
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primaryDark} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadData(true)}
            tintColor={colors.primary}
          />
        }
      >
        {/* ── Hero Header ─────────────────────────────── */}
        <LinearGradient colors={[colors.primaryDark, colors.primary]} style={styles.hero}>
          {/* decorative rings */}
          <View style={styles.ring1} pointerEvents="none" />
          <View style={styles.ring2} pointerEvents="none" />

          {/* theme switcher */}
          <TouchableOpacity style={[styles.headerIconBtn, { right: 72 }]} onPress={() => setShowThemes(true)}>
            <Ionicons name="color-palette-outline" size={20} color="#FFFFFF" />
          </TouchableOpacity>

          {/* logout */}
          <TouchableOpacity style={[styles.headerIconBtn, { right: 20 }]} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={20} color="#FFFFFF" />
          </TouchableOpacity>

          {/* live badge */}
          <View style={styles.liveBadge}>
            <View style={[styles.liveDot, { backgroundColor: colors.accent }]} />
            <Text style={[styles.liveTxt, { color: colors.accent }]}>ADMIN PORTAL</Text>
          </View>

          <Text style={styles.heroDate}>{todayStr}</Text>
          <Text style={styles.heroTitle}>Academy{'\n'}Overview</Text>
          <Text style={styles.heroSub}>Jai Shree Swaminarayan, Prashant Sir 🙏</Text>
        </LinearGradient>

        {/* ── Stat Cards (overlap hero) ────────────── */}
        <View style={styles.statsWrap}>
          <View style={[styles.statsGrid, { backgroundColor: colors.white, shadowColor: colors.primary }]}>
            <StatCard
              label="Today's Sessions" value={stats.todaysCount}
              iconName="calendar" iconColor={colors.accent} iconBg="rgba(252,212,0,0.1)"
              dark trend="+2 vs yesterday" trendWarn
            />
            <StatCard
              label="Active Students" value={stats.activeStudents}
              iconName="people" iconColor="#185FA5" iconBg="#E6F1FB"
              trend={stats.newStudentsWeek > 0 ? `+${stats.newStudentsWeek} this week` : 'Stable growth'}
            />
            <StatCard
              label="Attendance Rate" value={`${stats.attendancePercent}%`}
              iconName="stats-chart" iconColor="#3B6D11" iconBg="#EAF3DE"
              trend="Perfect record"
            />
            <StatCard
              label="Total Revenue" value={`₹${stats.totalRevenue.toLocaleString()}`}
              iconName="cash" iconColor="#854F0B" iconBg="#FAEEDA"
              trend="₹400 per session"
            />
          </View>
        </View>

        {/* ── Actions ─────────────────────────────── */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Management Hub</Text>
          <View style={styles.actionGrid}>
            <ActionCard
              label="Add Student" sub="Enrol new trainee →"
              iconName="person-add" iconColor="#534AB7" iconBg="#EEEDFE"
              onPress={() => navigation.navigate('AddStudent')}
            />
            <ActionCard
              label="Attendance" sub="Mark today →"
              iconName="checkbox" iconColor="#3B6D11" iconBg="#EAF3DE"
              onPress={() => navigation.navigate('Attendance')}
            />
            <ActionCard
              label="Schedule" sub="View all slots →"
              iconName="calendar" iconColor="#854F0B" iconBg="#FAEEDA"
              onPress={() => navigation.navigate('Schedule')}
            />
            <ActionCard
              label="Notifications" sub="Send Reminders →"
              iconName="notifications" iconColor={colors.accent} iconBg="#EEEDFE"
              dark onPress={() => navigation.navigate('Notifications')}
            />
            <ActionCard
              label="Revenue" sub="Track payments →"
              iconName="cash" iconColor="#10B981" iconBg="#DCFCE7"
              onPress={() => navigation.navigate('RevenueTracker')}
            />
            <ActionCard
              label="Reminders" sub="Push alerts →"
              iconName="alarm" iconColor="#534AB7" iconBg="#EEEDFE"
              onPress={() => navigation.navigate('ReminderSetup')}
            />
          </View>
        </View>

        {/* ── Recent Activity ────────────────────────── */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Recent Activity</Text>
          <View style={[styles.activityBox, { backgroundColor: colors.white, borderColor: '#EEF2F8' }]}>
            {stats.recentActivity.length === 0 ? (
              <Text style={styles.emptyInfo}>No recent activity found.</Text>
            ) : (
              stats.recentActivity.map((act, i) => (
                <View key={act.id || i} style={styles.activityRow}>
                  <View style={[styles.activityDot, { backgroundColor: colors.primary }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.activityMsg, { color: colors.text }]} numberOfLines={1}>
                      {act.message}
                    </Text>
                    <Text style={styles.activityTime}>
                      {act.students?.name || 'System'} • {act.sent_at
                        ? new Date(act.sent_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                        : 'Just now'}
                    </Text>
                  </View>
                  <Ionicons name="chatbubble-ellipses-outline" size={16} color="#94A3B8" />
                </View>
              ))
            )}
          </View>
        </View>

        {/* ── Live Training Log ────────────────────── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 0 }]}>Live Training Log</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Schedule')}>
              <Text style={[styles.seeAll, { color: colors.primary }]}>See all</Text>
            </TouchableOpacity>
          </View>

          <View style={[styles.sessionCard, { backgroundColor: colors.white, borderColor: '#EEF2F8' }]}>
            {loading && !refreshing ? (
              <ActivityIndicator color={colors.primary} style={{ marginVertical: 40 }} />
            ) : stats.todaysSessions.length === 0 ? (
              <View style={styles.emptyState}>
                <View style={styles.emptyIconBox}>
                  <Ionicons name="calendar-clear-outline" size={28} color="#94A3B8" />
                </View>
                <Text style={[styles.emptyTitle, { color: colors.text }]}>No sessions today</Text>
                <Text style={styles.emptySub}>No training programs scheduled. Tap Schedule to add one.</Text>
              </View>
            ) : (
              stats.todaysSessions.map((item, index) => (
                <View key={`session-${item.id || index}-${index}`}>
                  {renderSession({ item, index })}
                </View>
              ))
            )}
          </View>
        </View>
      </ScrollView>

      {/* ── Theme Modal ────────────────────────────── */}
      <Modal visible={showThemes} transparent animationType="slide" onRequestClose={() => setShowThemes(false)}>
        <View style={styles.mOverlay}>
          <View style={[styles.mBox, { backgroundColor: colors.white }]}>
            <View style={styles.mHeader}>
              <Text style={[styles.mTitle, { color: colors.primary }]}>Academy Theme</Text>
              <TouchableOpacity onPress={() => setShowThemes(false)}>
                <Ionicons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.mGrid}>
              {Object.keys(Themes).map((key) => (
                <TouchableOpacity
                  key={key}
                  activeOpacity={0.8}
                  onPress={() => { changeTheme(key); setShowThemes(false); }}
                  style={[
                    styles.themeItem,
                    currentTheme === key && { borderColor: Themes[key].accent, borderWidth: 2 },
                  ]}
                >
                  <LinearGradient colors={[Themes[key].primaryDark, Themes[key].primary]} style={styles.themeCircle}>
                    <View style={[styles.themeAccent, { backgroundColor: Themes[key].accent }]} />
                  </LinearGradient>
                  <Text style={[styles.themeName, { color: colors.text }]}>{Themes[key].name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  // Hero
  hero: {
    paddingTop: 56, paddingHorizontal: 24, paddingBottom: 60,
    position: 'relative', overflow: 'hidden',
  },
  ring1: {
    position: 'absolute', width: 240, height: 240, borderRadius: 120,
    borderWidth: 1, borderColor: 'rgba(252,212,0,0.10)', top: -70, right: -60,
  },
  ring2: {
    position: 'absolute', width: 160, height: 160, borderRadius: 80,
    borderWidth: 1, borderColor: 'rgba(252,212,0,0.07)', top: -20, right: -10,
  },
  headerIconBtn: {
    position: 'absolute', top: 56,
    width: 42, height: 42, borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center', justifyContent: 'center',
  },
  liveBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(252,212,0,0.13)',
    borderWidth: 1, borderColor: 'rgba(252,212,0,0.25)',
    borderRadius: 20, paddingVertical: 5, paddingHorizontal: 12,
    marginBottom: 14,
  },
  liveDot:   { width: 7, height: 7, borderRadius: 4 },
  liveTxt:   { fontSize: 11, fontFamily: FONTS.bodySemi, letterSpacing: 1 },
  heroDate:  { fontSize: 12, color: 'rgba(255,255,255,0.5)', fontFamily: FONTS.body, marginBottom: 4 },
  heroTitle: { fontSize: 30, fontFamily: FONTS.black, color: '#FFFFFF', lineHeight: 36, marginBottom: 6 },
  heroSub:   { fontSize: 13, color: 'rgba(255,255,255,0.45)', fontFamily: FONTS.body },

  // Stats
  statsWrap: { marginTop: -40, paddingHorizontal: 16, marginBottom: 6 },
  statsGrid: {
    flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between',
    borderRadius: 28, padding: 16,
    shadowOpacity: 0.10, shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 }, elevation: 8,
  },
  statCard:     { width: '48%', marginBottom: 16, gap: 4 },
  statIconWrap: { width: 36, height: 36, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  statNum:      { fontFamily: FONTS.black, fontSize: 22 },
  statLabel:    { fontFamily: FONTS.bodySemi, fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
  statTrend:    { fontFamily: FONTS.bodySemi, fontSize: 11 },

  // Sections
  section:       { paddingHorizontal: 16, marginTop: 20 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  sectionTitle:  { fontFamily: FONTS.bold, fontSize: 18, marginBottom: 14 },
  seeAll:        { fontFamily: FONTS.bodySemi, fontSize: 13 },

  // Actions
  actionGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  actionCard: {
    width: (width - 44) / 2,
    borderRadius: 20, padding: 18, marginBottom: 12,
    borderWidth: 1, gap: 8,
  },
  actionIconWrap: { width: 46, height: 46, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  actionLabel:    { fontFamily: FONTS.bold, fontSize: 15 },
  actionSub:      { fontFamily: FONTS.body, fontSize: 11 },

  // Activity
  activityBox: { borderRadius: 20, padding: 16, borderWidth: 1 },
  activityRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, gap: 12 },
  activityDot: { width: 6, height: 6, borderRadius: 3 },
  activityMsg:  { fontSize: 13, fontFamily: FONTS.bodySemi },
  activityTime: { fontSize: 11, fontFamily: FONTS.body, color: '#94A3B8', marginTop: 2 },
  emptyInfo:    { textAlign: 'center', color: '#94A3B8', fontSize: 13, paddingVertical: 10 },

  // Sessions
  sessionCard:      { borderRadius: 20, paddingHorizontal: 16, borderWidth: 1, marginBottom: 30 },
  sessionRow:       { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F8FAFC' },
  sessionAvatar:    { width: 50, height: 50, borderRadius: 16, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  sessionAvatarImg: { width: '100%', height: '100%' },
  sessionAvatarTxt: { fontFamily: FONTS.bold, fontSize: 14 },
  sessionInfo:      { flex: 1 },
  sessionName:      { fontFamily: FONTS.bold, fontSize: 14 },
  sessionMeta:      { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 },
  sessionMetaTxt:   { fontFamily: FONTS.body, fontSize: 11, color: '#94A3B8' },
  sessionBadge:     { borderRadius: 6, paddingVertical: 2, paddingHorizontal: 7 },
  sessionBadgeTxt:  { fontFamily: FONTS.bodySemi, fontSize: 10, letterSpacing: 0.3 },
  sessionRight:     { alignItems: 'flex-end' },
  sessionTime:      { fontFamily: FONTS.bold, fontSize: 14 },
  sessionDur:       { fontFamily: FONTS.body, fontSize: 11, color: '#94A3B8', marginTop: 2 },

  // Empty
  emptyState:   { padding: 40, alignItems: 'center' },
  emptyIconBox: { width: 56, height: 56, borderRadius: 18, backgroundColor: '#F8FAFC', alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  emptyTitle:   { fontFamily: FONTS.bold, fontSize: 15, marginBottom: 4 },
  emptySub:     { fontFamily: FONTS.body, fontSize: 12, color: '#94A3B8', textAlign: 'center', lineHeight: 18 },

  // Theme Modal
  mOverlay:    { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  mBox:        { borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 25, maxHeight: 500 },
  mHeader:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  mTitle:      { fontSize: 18, fontFamily: FONTS.bold },
  mGrid:       { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  themeItem:   { width: '48%', marginBottom: 12, padding: 12, borderRadius: 20, backgroundColor: '#F8FAFC', alignItems: 'center', borderWidth: 1, borderColor: '#EEF2F8' },
  themeCircle: { width: 44, height: 44, borderRadius: 22, marginBottom: 8, justifyContent: 'center', alignItems: 'center' },
  themeAccent: { width: 12, height: 12, borderRadius: 6 },
  themeName:   { fontSize: 10, fontFamily: FONTS.bold, textAlign: 'center' },
});
