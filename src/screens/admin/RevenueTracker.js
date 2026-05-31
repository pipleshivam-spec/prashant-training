// src/screens/admin/RevenueTracker.js
import React, { useState, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  StatusBar, ActivityIndicator, Dimensions, FlatList
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { getSchedules, updateSchedule } from '../../lib/supabase';
import { useAppTheme } from '../../context/ThemeContext';

const { width } = Dimensions.get('window');

const FONTS = {
  black: 'Outfit_900Black',
  bold: 'Outfit_700Bold',
  semi: 'Outfit_600SemiBold',
  body: 'Inter_400Regular',
  bodySemi: 'Inter_600SemiBold',
};

const RATE = 400; // ₹ per session

const AVATAR_COLORS = [
  { bg: '#EEEDFE', tx: '#534AB7' },
  { bg: '#EAF3DE', tx: '#3B6D11' },
  { bg: '#FAEEDA', tx: '#854F0B' },
  { bg: '#E6F1FB', tx: '#185FA5' },
];

function getInitials(name = '') {
  return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
}

export default function RevenueTracker() {
  const { colors } = useAppTheme();
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const [schedules, setSchedules] = useState([]);
  const [activeFilter, setActiveFilter] = useState('All');

  useFocusEffect(useCallback(() => {
    (async () => {
      setLoading(true);
      const { data } = await getSchedules();
      if (data) setSchedules(data);
      setLoading(false);
    })();
  }, []));

  const stats = useMemo(() => {
    const completed = schedules.filter(s => s.status === 'Completed');
    const paid      = completed.filter(s => s.payment_status === 'paid');
    const pending   = completed.filter(s => s.payment_status !== 'paid');
    return {
      totalEarned:  paid.length * RATE,
      totalPending: pending.length * RATE,
      totalSessions: completed.length,
      paidCount:    paid.length,
      pendingCount: pending.length,
    };
  }, [schedules]);

  const filtered = useMemo(() => {
    const completed = schedules.filter(s => s.status === 'Completed');
    if (activeFilter === 'Paid')    return completed.filter(s => s.payment_status === 'paid');
    if (activeFilter === 'Pending') return completed.filter(s => s.payment_status !== 'paid');
    return completed;
  }, [schedules, activeFilter]);

  const togglePayment = async (item) => {
    const newStatus = item.payment_status === 'paid' ? 'pending' : 'paid';
    setSchedules(prev => prev.map(s => s.id === item.id ? { ...s, payment_status: newStatus } : s));
    await updateSchedule(item.id, { payment_status: newStatus });
  };

  const renderItem = ({ item, index }) => {
    const av = AVATAR_COLORS[index % AVATAR_COLORS.length];
    const isPaid = item.payment_status === 'paid';
    return (
      <View style={[styles.card, { backgroundColor: colors.white, shadowColor: colors.primary }]}>
        <View style={[styles.cardLeft, { backgroundColor: av.bg }]}>
          <Text style={[styles.initials, { color: av.tx }]}>{getInitials(item.students?.name || 'TR')}</Text>
        </View>
        <View style={styles.cardMid}>
          <Text style={[styles.cardName, { color: colors.text }]} numberOfLines={1}>
            {item.students?.name || 'Trainee'}
          </Text>
          <Text style={styles.cardDate}>{item.session_date} • {item.session_time}</Text>
          <Text style={styles.cardLicense}>{item.license_type || 'LMV'}</Text>
        </View>
        <View style={styles.cardRight}>
          <Text style={[styles.amount, { color: colors.primary }]}>₹{RATE}</Text>
          <TouchableOpacity
            style={[styles.payBadge, { backgroundColor: isPaid ? '#DCFCE7' : '#FEF3C7' }]}
            onPress={() => togglePayment(item)}
          >
            <Ionicons
              name={isPaid ? 'checkmark-circle' : 'time-outline'}
              size={12}
              color={isPaid ? '#10B981' : '#F59E0B'}
            />
            <Text style={[styles.payBadgeTxt, { color: isPaid ? '#10B981' : '#F59E0B' }]}>
              {isPaid ? 'PAID' : 'PENDING'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

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
              <Text style={styles.heroSub}>Finance</Text>
              <Text style={styles.heroTitle}>Revenue Tracker</Text>
            </View>
          </View>

          {/* Stats Row */}
          <View style={styles.statsRow}>
            <View style={[styles.statBox, { backgroundColor: 'rgba(252,212,0,0.15)', borderColor: 'rgba(252,212,0,0.3)' }]}>
              <Text style={[styles.statNum, { color: colors.accent }]}>₹{stats.totalEarned.toLocaleString()}</Text>
              <Text style={[styles.statLbl, { color: 'rgba(252,212,0,0.7)' }]}>COLLECTED</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statNum}>₹{stats.totalPending.toLocaleString()}</Text>
              <Text style={styles.statLbl}>PENDING</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statNum}>{stats.totalSessions}</Text>
              <Text style={styles.statLbl}>SESSIONS</Text>
            </View>
          </View>
        </SafeAreaView>
      </LinearGradient>

      {/* Progress Bar */}
      <View style={[styles.progressCard, { backgroundColor: colors.white, shadowColor: colors.primary }]}>
        <View style={styles.progressHeader}>
          <Text style={[styles.progressTitle, { color: colors.text }]}>Collection Rate</Text>
          <Text style={[styles.progressPct, { color: colors.primary }]}>
            {stats.totalSessions > 0 ? Math.round((stats.paidCount / stats.totalSessions) * 100) : 0}%
          </Text>
        </View>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, {
            backgroundColor: colors.primary,
            width: stats.totalSessions > 0 ? `${(stats.paidCount / stats.totalSessions) * 100}%` : '0%'
          }]} />
        </View>
        <View style={styles.progressLegend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#10B981' }]} />
            <Text style={styles.legendTxt}>{stats.paidCount} Paid</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#F59E0B' }]} />
            <Text style={styles.legendTxt}>{stats.pendingCount} Pending</Text>
          </View>
        </View>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterRow}>
        {['All', 'Paid', 'Pending'].map(f => (
          <TouchableOpacity
            key={f}
            style={[styles.filterTab, activeFilter === f && { backgroundColor: colors.primary }]}
            onPress={() => setActiveFilter(f)}
          >
            <Text style={[styles.filterTxt, activeFilter === f && { color: '#fff' }]}>{f}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={filtered}
          renderItem={renderItem}
          keyExtractor={item => item.id?.toString()}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="cash-outline" size={48} color="#E2E8F0" />
              <Text style={[styles.emptyTxt, { color: colors.text }]}>No completed sessions yet</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  hero: { paddingBottom: 28, paddingHorizontal: 20 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 20 },
  backBtn: { width: 40, height: 40, borderRadius: 13, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' },
  heroSub: { fontSize: 11, color: 'rgba(255,255,255,0.45)', fontFamily: FONTS.bodySemi, letterSpacing: 1.5, textTransform: 'uppercase' },
  heroTitle: { fontFamily: FONTS.black, fontSize: 26, color: '#FFFFFF', marginTop: 2 },
  statsRow: { flexDirection: 'row', gap: 8 },
  statBox: { flex: 1, backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', borderRadius: 16, paddingVertical: 12, alignItems: 'center' },
  statNum: { fontFamily: FONTS.black, fontSize: 18, color: '#FFFFFF' },
  statLbl: { fontSize: 9, color: 'rgba(255,255,255,0.5)', fontFamily: FONTS.bodySemi, marginTop: 2, letterSpacing: 0.5 },
  progressCard: { marginHorizontal: 16, marginTop: -12, borderRadius: 22, padding: 18, elevation: 6, shadowOpacity: 0.1, shadowRadius: 14, shadowOffset: { width: 0, height: 4 } },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  progressTitle: { fontFamily: FONTS.bold, fontSize: 14 },
  progressPct: { fontFamily: FONTS.black, fontSize: 14 },
  progressBar: { height: 8, backgroundColor: '#F1F5F9', borderRadius: 4, overflow: 'hidden', marginBottom: 10 },
  progressFill: { height: '100%', borderRadius: 4 },
  progressLegend: { flexDirection: 'row', gap: 16 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendTxt: { fontFamily: FONTS.bodySemi, fontSize: 11, color: '#64748B' },
  filterRow: { flexDirection: 'row', paddingHorizontal: 16, marginTop: 16, marginBottom: 8, gap: 8 },
  filterTab: { paddingHorizontal: 18, paddingVertical: 8, borderRadius: 20, backgroundColor: '#F1F5F9' },
  filterTxt: { fontFamily: FONTS.bold, fontSize: 13, color: '#64748B' },
  list: { paddingHorizontal: 16, paddingBottom: 40 },
  card: { flexDirection: 'row', alignItems: 'center', borderRadius: 20, padding: 14, marginBottom: 10, elevation: 2, shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } },
  cardLeft: { width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  initials: { fontFamily: FONTS.bold, fontSize: 15 },
  cardMid: { flex: 1 },
  cardName: { fontFamily: FONTS.bold, fontSize: 14 },
  cardDate: { fontFamily: FONTS.body, fontSize: 11, color: '#64748B', marginTop: 2 },
  cardLicense: { fontFamily: FONTS.bodySemi, fontSize: 10, color: '#94A3B8', marginTop: 2 },
  cardRight: { alignItems: 'flex-end', gap: 6 },
  amount: { fontFamily: FONTS.black, fontSize: 16 },
  payBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  payBadgeTxt: { fontFamily: FONTS.bold, fontSize: 9, letterSpacing: 0.3 },
  empty: { alignItems: 'center', marginTop: 60, gap: 12 },
  emptyTxt: { fontFamily: FONTS.bold, fontSize: 15 },
});
