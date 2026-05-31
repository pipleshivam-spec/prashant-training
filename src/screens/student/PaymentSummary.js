import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  StatusBar, ActivityIndicator, Animated, Dimensions, Easing
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Svg, { Circle, Defs, LinearGradient as SvgGradient, Stop } from 'react-native-svg';
import { getStudentFeeInfo } from '../../lib/supabase';
import { useAppTheme } from '../../context/ThemeContext';

const { width } = Dimensions.get('window');

const FONTS = {
  black: 'Outfit_900Black',
  bold: 'Outfit_700Bold',
  semi: 'Outfit_600SemiBold',
  body: 'Inter_400Regular',
  bodySemi: 'Inter_600SemiBold',
};

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

// ── Payment Ring ─────────────────────────────────────────────
const PaymentRing = ({ paidPercent, isFullyPaid }) => {
  const size = 150;
  const strokeWidth = 14;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const animVal = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(animVal, { 
      toValue: paidPercent, 
      duration: 1500, 
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false 
    }).start();
  }, [paidPercent]);

  const offset = animVal.interpolate({ inputRange: [0, 100], outputRange: [circumference, 0] });
  
  const strokeColor = isFullyPaid ? '#10B981' : '#FBBF24';

  return (
    <View style={styles.ringContainer}>
      <Svg width={size} height={size}>
        <Defs>
          <SvgGradient id="grad" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={strokeColor} stopOpacity="1" />
            <Stop offset="1" stopColor={isFullyPaid ? '#34D399' : '#FDE68A'} stopOpacity="1" />
          </SvgGradient>
        </Defs>
        {/* Background Track */}
        <Circle 
          cx={size / 2} cy={size / 2} r={radius} 
          stroke="rgba(255,255,255,0.2)" strokeWidth={strokeWidth} fill="none" 
        />
        {/* Animated Progress */}
        <AnimatedCircle
          cx={size / 2} cy={size / 2} r={radius}
          stroke="url(#grad)"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          fill="none"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <View style={styles.ringCenter}>
        <Text style={[styles.ringPct, { color: '#FFFFFF' }]}>
          {Math.round(paidPercent)}%
        </Text>
        <Text style={styles.ringLbl}>Paid</Text>
      </View>
    </View>
  );
};

// ── Mode Icon ────────────────────────────────────────────────
const ModeIcon = ({ mode }) => {
  const map = {
    cash: { icon: 'cash', color: '#10B981', bg: '#DCFCE7' },
    upi: { icon: 'phone-portrait', color: '#6366F1', bg: '#EEF2FF' },
    card: { icon: 'card', color: '#3B82F6', bg: '#DBEAFE' },
    bank: { icon: 'business', color: '#F59E0B', bg: '#FEF3C7' },
  };
  const m = map[mode?.toLowerCase()] || map.cash;
  return (
    <View style={[styles.modeIcon, { backgroundColor: m.bg }]}>
      <Ionicons name={m.icon} size={20} color={m.color} />
    </View>
  );
};

export default function PaymentSummary() {
  const { colors } = useAppTheme();
  const [loading, setLoading] = useState(true);
  const [feeInfo, setFeeInfo] = useState({
    presentSessions: 0,
    sessionFee: 0,
    paid: 0,
    balance: 0,
    payments: [],
  });
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const loadData = async () => {
    try {
      setLoading(true);
      const str = await AsyncStorage.getItem('studentData');
      if (!str) return;
      const sd = JSON.parse(str);
      const { data } = await getStudentFeeInfo(sd.id);
      if (data) setFeeInfo(data);
      Animated.timing(fadeAnim, { toValue: 1, duration: 700, useNativeDriver: true }).start();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(useCallback(() => { loadData(); }, []));

  const paidPercent = feeInfo.sessionFee > 0
    ? Math.min(100, (feeInfo.paid / feeInfo.sessionFee) * 100)
    : 0;
  const isFullyPaid = feeInfo.sessionFee > 0 && feeInfo.balance === 0;

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.bg }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 80 }}>
        <LinearGradient colors={[colors.primaryDark || '#1E3A8A', colors.primary || '#3B82F6']} style={styles.hero}>
          <SafeAreaView edges={['top']}>
            <View style={styles.heroHeader}>
              <Text style={styles.heroTitle}>Fee Summary</Text>
              <Text style={styles.heroSub}>Track your payment progress</Text>
            </View>

            {/* Ring + Stats */}
            <View style={styles.heroBody}>
              <PaymentRing paidPercent={paidPercent} isFullyPaid={isFullyPaid} />
              
              <View style={styles.heroStats}>
                <View style={styles.statBox}>
                  <View style={styles.statIconWrap}>
                    <Ionicons name="checkmark-done-circle" size={16} color="#93C5FD" />
                  </View>
                  <View>
                    <Text style={styles.statVal}>{feeInfo.presentSessions}</Text>
                    <Text style={styles.statLbl}>Sessions Present</Text>
                  </View>
                </View>
                
                <View style={styles.statDivider} />
                
                <View style={styles.statBox}>
                  <View style={[styles.statIconWrap, { backgroundColor: 'rgba(16, 185, 129, 0.2)' }]}>
                    <Ionicons name="wallet" size={16} color="#34D399" />
                  </View>
                  <View>
                    <Text style={[styles.statVal, { color: '#34D399' }]}>₹{feeInfo.paid.toLocaleString()}</Text>
                    <Text style={styles.statLbl}>Amount Paid</Text>
                  </View>
                </View>
                
                <View style={styles.statDivider} />
                
                <View style={styles.statBox}>
                  <View style={[styles.statIconWrap, { backgroundColor: isFullyPaid ? 'rgba(16, 185, 129, 0.2)' : 'rgba(251, 191, 36, 0.2)' }]}>
                    <Ionicons name="alert-circle" size={16} color={isFullyPaid ? "#34D399" : "#FBBF24"} />
                  </View>
                  <View>
                    <Text style={[styles.statVal, { color: isFullyPaid ? '#34D399' : '#FBBF24' }]}>
                      ₹{feeInfo.balance.toLocaleString()}
                    </Text>
                    <Text style={styles.statLbl}>Balance Due</Text>
                  </View>
                </View>
              </View>
            </View>
          </SafeAreaView>
        </LinearGradient>

        <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
          {/* Status Banner */}
          <View style={[styles.statusBanner, {
            backgroundColor: isFullyPaid ? '#DCFCE7' : feeInfo.balance < 800 ? '#FEF3C7' : '#FEE2E2',
            borderColor: isFullyPaid ? '#10B98130' : feeInfo.balance < 800 ? '#F59E0B30' : '#EF444430',
          }]}>
            <View style={[styles.statusIconContainer, {
              backgroundColor: isFullyPaid ? '#10B981' : feeInfo.balance < 800 ? '#F59E0B' : '#EF4444'
            }]}>
              <Ionicons
                name={isFullyPaid ? 'checkmark' : 'alert'}
                size={16}
                color="#FFFFFF"
              />
            </View>
            <Text style={[styles.statusMsg, {
              color: isFullyPaid ? '#065F46' : feeInfo.balance < 800 ? '#92400E' : '#991B1B'
            }]}>
              {feeInfo.presentSessions === 0
                ? '📋 No sessions attended yet. Fees will appear once marked.'
                : isFullyPaid
                ? `🎉 All ${feeInfo.presentSessions} sessions paid! You're fully clear.`
                : `₹${feeInfo.balance.toLocaleString()} due for ${feeInfo.presentSessions} sessions.`}
            </Text>
          </View>

          {/* Session Fee Breakdown */}
          <View style={[styles.progressCard, { backgroundColor: colors.white }]}>
            <View style={styles.progressHeader}>
              <View style={styles.titleRow}>
                <Ionicons name="calculator" size={20} color={colors.primary} style={styles.titleIcon} />
                <Text style={[styles.progressTitle, { color: colors.text }]}>Fee Calculation</Text>
              </View>
              <View style={[styles.percentBadge, { backgroundColor: colors.primary + '15' }]}>
                <Text style={[styles.progressPct, { color: colors.primary }]}>{Math.round(paidPercent)}% Paid</Text>
              </View>
            </View>

            {/* Sessions × Rate row */}
            <View style={styles.calcRow}>
              <View style={styles.calcBox}>
                <Text style={[styles.calcVal, { color: colors.text }]}>{feeInfo.presentSessions}</Text>
                <Text style={styles.calcLbl}>Sessions</Text>
              </View>
              <Ionicons name="close" size={16} color="#94A3B8" />
              <View style={styles.calcBox}>
                <Text style={[styles.calcVal, { color: colors.text }]}>₹400</Text>
                <Text style={styles.calcLbl}>Per Session</Text>
              </View>
              <Ionicons name="reorder-two" size={20} color="#94A3B8" />
              <View style={styles.calcBox}>
                <Text style={[styles.calcVal, { color: colors.primary }]}>₹{feeInfo.sessionFee.toLocaleString()}</Text>
                <Text style={styles.calcLbl}>Total Fee</Text>
              </View>
            </View>

            <View style={styles.progressTrack}>
              <Animated.View style={[
                styles.progressFill,
                { 
                  backgroundColor: isFullyPaid ? '#10B981' : colors.primary, 
                  width: `${Math.min(100, paidPercent)}%` 
                }
              ]} />
            </View>
            <View style={styles.progressLabels}>
              <Text style={styles.progressLblTxt}>₹0</Text>
              <Text style={styles.progressLblTxt}>₹{feeInfo.sessionFee.toLocaleString()}</Text>
            </View>
          </View>

          {/* Payment History */}
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Recent Payments</Text>
            {feeInfo.payments.length > 0 && (
              <Text style={styles.paymentCount}>{feeInfo.payments.length} transactions</Text>
            )}
          </View>

          {feeInfo.payments.length === 0 ? (
            <View style={[styles.emptyCard, { backgroundColor: colors.white }]}>
              <View style={styles.emptyIconWrap}>
                <Ionicons name="receipt-outline" size={32} color="#94A3B8" />
              </View>
              <Text style={styles.emptyTxt}>No payments recorded yet</Text>
              <Text style={styles.emptySub}>Your payment history will appear here once processed.</Text>
            </View>
          ) : (
            feeInfo.payments.map((p, i) => (
              <View key={i} style={[styles.payCard, { backgroundColor: colors.white }]}>
                <ModeIcon mode={p.mode} />
                <View style={styles.payInfo}>
                  <Text style={[styles.payAmt, { color: colors.text }]}>₹{(p.amount || 0).toLocaleString()}</Text>
                  <Text style={styles.payDate}>{p.payment_date || '—'}</Text>
                  {p.note ? (
                    <View style={styles.noteContainer}>
                      <Ionicons name="chatbubble-ellipses-outline" size={12} color="#94A3B8" />
                      <Text style={styles.payNote}>{p.note}</Text>
                    </View>
                  ) : null}
                </View>
                <View style={[styles.modeBadge, { 
                  backgroundColor: p.mode?.toLowerCase() === 'cash' ? '#DCFCE7' : '#EEF2FF'
                }]}>
                  <Text style={[styles.modeTxt, {
                    color: p.mode?.toLowerCase() === 'cash' ? '#065F46' : '#3730A3'
                  }]}>{(p.mode || 'CASH').toUpperCase()}</Text>
                </View>
              </View>
            ))
          )}

          {/* Contact note */}
          <View style={[styles.contactNote, { backgroundColor: colors.primary + '08', borderColor: colors.primary + '20' }]}>
            <Ionicons name="information-circle" size={20} color={colors.primary} />
            <Text style={[styles.contactTxt, { color: colors.text }]}>
              Notice a discrepancy? Please contact{' '}
              <Text style={{ color: colors.primary, fontFamily: FONTS.bold }}>Prashant Sir</Text> for corrections.
            </Text>
          </View>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  hero: { 
    paddingBottom: 40, 
    borderBottomLeftRadius: 32, 
    borderBottomRightRadius: 32,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  heroHeader: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 24 },
  heroTitle: { fontSize: 32, fontFamily: FONTS.black, color: '#FFFFFF', letterSpacing: -0.5 },
  heroSub: { fontSize: 14, fontFamily: FONTS.body, color: 'rgba(255,255,255,0.8)', marginTop: 4 },
  heroBody: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24 },
  ringContainer: { alignItems: 'center', justifyContent: 'center' },
  ringCenter: { position: 'absolute', alignItems: 'center' },
  ringPct: { fontSize: 32, fontFamily: FONTS.black, includeFontPadding: false },
  ringLbl: { fontSize: 12, fontFamily: FONTS.bodySemi, color: 'rgba(255,255,255,0.7)', marginTop: -2 },
  heroStats: { flex: 1, marginLeft: 24 },
  statBox: { flexDirection: 'row', alignItems: 'center', marginVertical: 4 },
  statIconWrap: { width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  statVal: { fontSize: 20, fontFamily: FONTS.bold, color: '#FFFFFF', includeFontPadding: false },
  statLbl: { fontSize: 11, fontFamily: FONTS.body, color: 'rgba(255,255,255,0.7)' },
  statDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.1)', marginVertical: 6, marginLeft: 40 },
  content: { paddingHorizontal: 24, marginTop: -20 },
  
  statusBanner: { flexDirection: 'row', alignItems: 'center', borderRadius: 16, padding: 14, marginBottom: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2, borderWidth: 1 },
  statusIconContainer: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  statusMsg: { flex: 1, fontSize: 13, fontFamily: FONTS.bodySemi, lineHeight: 18 },
  
  progressCard: { borderRadius: 24, padding: 20, marginBottom: 28, elevation: 6, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 12 },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  titleRow: { flexDirection: 'row', alignItems: 'center' },
  titleIcon: { marginRight: 8 },
  progressTitle: { fontSize: 16, fontFamily: FONTS.bold },
  percentBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  progressPct: { fontSize: 12, fontFamily: FONTS.bold },
  
  calcRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#F8FAFC', borderRadius: 16, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: '#F1F5F9' },
  calcBox: { alignItems: 'center', flex: 1 },
  calcVal: { fontSize: 20, fontFamily: FONTS.black, includeFontPadding: false },
  calcLbl: { fontSize: 11, fontFamily: FONTS.bodySemi, color: '#64748B', marginTop: 4 },
  
  progressTrack: { height: 10, backgroundColor: '#F1F5F9', borderRadius: 5, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 5 },
  progressLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  progressLblTxt: { fontSize: 12, fontFamily: FONTS.bodySemi, color: '#94A3B8' },
  
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 16 },
  sectionTitle: { fontSize: 18, fontFamily: FONTS.bold },
  paymentCount: { fontSize: 12, fontFamily: FONTS.bodySemi, color: '#94A3B8', marginBottom: 2 },
  
  emptyCard: { borderRadius: 24, padding: 32, alignItems: 'center', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, borderWidth: 1, borderColor: '#F1F5F9' },
  emptyIconWrap: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#F8FAFC', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  emptyTxt: { fontSize: 16, fontFamily: FONTS.bold, color: '#475569' },
  emptySub: { fontSize: 13, fontFamily: FONTS.body, color: '#94A3B8', marginTop: 6, textAlign: 'center', paddingHorizontal: 20 },
  
  payCard: { flexDirection: 'row', alignItems: 'center', borderRadius: 20, padding: 16, marginBottom: 12, elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, borderWidth: 1, borderColor: '#F8FAFC' },
  modeIcon: { width: 46, height: 46, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginRight: 16 },
  payInfo: { flex: 1 },
  payAmt: { fontSize: 18, fontFamily: FONTS.black, includeFontPadding: false },
  payDate: { fontSize: 12, fontFamily: FONTS.bodySemi, color: '#64748B', marginTop: 2 },
  noteContainer: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  payNote: { fontSize: 11, fontFamily: FONTS.body, color: '#94A3B8', marginLeft: 4, flex: 1 },
  modeBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  modeTxt: { fontSize: 10, fontFamily: FONTS.bold },
  
  contactNote: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 16, padding: 16, marginTop: 16, gap: 12 },
  contactTxt: { flex: 1, fontSize: 13, fontFamily: FONTS.body, lineHeight: 20 },
});
