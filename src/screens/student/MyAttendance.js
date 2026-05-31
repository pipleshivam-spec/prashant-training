import React, { useState, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  StatusBar, ActivityIndicator, Dimensions, ScrollView, Animated
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getStudentAttendanceList } from '../../lib/supabase';
import { Alert } from 'react-native';
import { useAppTheme } from '../../context/ThemeContext';

const { width } = Dimensions.get('window');

const FONTS = {
  black: 'Outfit_900Black',
  bold: 'Outfit_700Bold',
  semi: 'Outfit_600SemiBold',
  body: 'Inter_400Regular',
  bodySemi: 'Inter_600SemiBold',
};

const CalendarHeatmap = ({ records, colors }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  const recordMap = useMemo(() => {
    const map = {};
    records.forEach(r => { if (r.schedules?.session_date) map[r.schedules.session_date] = r.status; });
    return map;
  }, [records]);

  const days = [];
  for (let i = 0; i < firstDay; i++) days.push(null);
  for (let i = 1; i <= daysInMonth; i++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
    days.push({ day: i, status: recordMap[dateStr], date: dateStr });
  }

  const changeMonth = (val) => setCurrentDate(new Date(year, month + val, 1));
  const isToday = (dateStr) => dateStr === new Date().toISOString().split('T')[0];

  return (
    <View style={[styles.calendarCard, { backgroundColor: colors.white, shadowColor: colors.primaryDark }]}>
      <View style={styles.calHeader}>
        <TouchableOpacity onPress={() => changeMonth(-1)} style={styles.calBtn}><Ionicons name="chevron-back" size={18} color={colors.primaryDark} /></TouchableOpacity>
        <Text style={[styles.monthTxt, { color: colors.primaryDark }]}>{monthNames[month]} {year}</Text>
        <TouchableOpacity onPress={() => changeMonth(1)} style={styles.calBtn}><Ionicons name="chevron-forward" size={18} color={colors.primaryDark} /></TouchableOpacity>
      </View>
      <View style={styles.weekRow}>
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => <Text key={`${d}-${i}`} style={styles.weekTxt}>{d}</Text>)}
      </View>
      <View style={styles.daysGrid}>
        {days.map((d, i) => {
          if (!d) return <View key={`empty-${i}`} style={styles.dayCell} />;
          const statusColors = { present: '#DCFCE7', absent: '#FEE2E2', skipped: '#FEF3C7' };
          const bg = statusColors[d.status] || 'transparent';
          return (
            <View key={i} style={[styles.dayCell, { backgroundColor: bg }, isToday(d.date) && { borderColor: colors.accent, borderWidth: 1.5 }]}>
              <Text style={[styles.dayTxt, d.status && { color: colors.text, fontFamily: FONTS.bold }]}>{d.day}</Text>
            </View>
          );
        })}
      </View>
      <View style={styles.calLegend}>
        <View style={styles.legendItem}><View style={[styles.dot, { backgroundColor: '#10B981' }]} /><Text style={styles.legendTxt}>Present</Text></View>
        <View style={styles.legendItem}><View style={[styles.dot, { backgroundColor: '#EF4444' }]} /><Text style={styles.legendTxt}>Absent</Text></View>
        <View style={styles.legendItem}><View style={[styles.dot, { backgroundColor: '#F59E0B' }]} /><Text style={styles.legendTxt}>Skipped</Text></View>
      </View>
    </View>
  );
};

export default function MyAttendance() {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const [loading, setLoading] = useState(true);
  const [attendance, setAttendance] = useState([]);
  const fadeAnim = React.useRef(new Animated.Value(0)).current;

  const loadData = async () => {
    try {
      setLoading(true);
      const studentDataStr = await AsyncStorage.getItem('studentData');
      if (!studentDataStr) return;
      const studentData = JSON.parse(studentDataStr);
      const { data } = await getStudentAttendanceList(studentData.id);
      if (data) setAttendance(data);
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start();
    } catch (error) { console.error(error); } finally { setLoading(false); }
  };

  useFocusEffect(useCallback(() => { loadData(); }, []));

  const stats = useMemo(() => {
    const present = attendance.filter(a => a.status === 'present').length;
    const total = attendance.length || 1;
    const percent = Math.round((present / total) * 100);
    const absent = attendance.filter(a => a.status === 'absent').length;
    const skipped = attendance.filter(a => a.status === 'skipped').length;
    return { present, absent, skipped, percent };
  }, [attendance]);

  const handleReportIssue = (item) => {
    Alert.alert('Report Issue', 'Something wrong with this record?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Chat with Instructor', onPress: () => {
        Alert.alert('Opening Chat...', 'Connecting you to the instructor.');
      }}
    ]);
  };

  if (loading) return <View style={[styles.center, { backgroundColor: colors.bg }]}><ActivityIndicator size="large" color={colors.primary} /></View>;

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.bg }]} showsVerticalScrollIndicator={false}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={[colors.primaryDark, colors.primary]} style={styles.hero}>
        <SafeAreaView edges={['top']}>
          <View style={{ paddingHorizontal: 25, paddingTop: 20, paddingBottom: 10 }}>
            <Text style={{ fontSize: 26, fontFamily: FONTS.black, color: '#FFFFFF' }}>{t('attendance.myTitle')}</Text>
          </View>
          <View style={styles.heroSummary}>
            <View style={styles.mainStat}>
              <Text style={[styles.mainStatVal, { color: colors.accent }]}>{stats.percent}%</Text>
              <Text style={styles.mainStatLbl}>Presence</Text>
            </View>
            <View style={styles.statLine} />
            <View style={styles.subStats}>
              <View style={styles.subStatItem}><Text style={[styles.subStatVal, { color: '#FFFFFF' }]}>{stats.present}</Text><Text style={styles.subStatLbl}>Present</Text></View>
              <View style={styles.subStatItem}><Text style={[styles.subStatVal, { color: '#FFFFFF' }]}>{stats.absent}</Text><Text style={styles.subStatLbl}>Absent</Text></View>
            </View>
          </View>
        </SafeAreaView>
      </LinearGradient>

      <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Attendance Activity</Text>
          <CalendarHeatmap records={attendance} colors={colors} />
        </View>

        <View style={[styles.section, { marginBottom: 40 }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>History Log</Text>
          {attendance.map((item, index) => (
            <View key={`att-${item.id || index}-${index}`} style={[styles.historyCard, { backgroundColor: colors.white, shadowColor: colors.primaryDark }]}>
              <View style={styles.historyInfo}>
                <Text style={[styles.historyDate, { color: colors.text }]}>{item.schedules?.session_date}</Text>
                <Text style={styles.historyTime}>{item.schedules?.session_time}</Text>
              </View>
              <View style={styles.historyTypeBox}>
                <Text style={[styles.historyType, { color: colors.primaryDark }]}>{item.schedules?.session_type}</Text>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: item.status === 'present' ? '#DCFCE7' : item.status === 'absent' ? '#FEE2E2' : '#FEF3C7' }]}>
                <Text style={[styles.statusBadgeTxt, { color: item.status === 'present' ? '#10B981' : item.status === 'absent' ? '#EF4444' : '#F59E0B' }]}>{item.status?.toUpperCase()}</Text>
              </View>
              <TouchableOpacity style={styles.reportBtn} onPress={() => handleReportIssue(item)}>
                <Ionicons name="help-circle-outline" size={20} color={'#94A3B8'} />
              </TouchableOpacity>
            </View>
          ))}
          {attendance.length === 0 && (
            <View style={styles.empty}>
              <MaterialCommunityIcons name="clipboard-text-outline" size={50} color={'#E2E8F0'} />
              <Text style={styles.emptyTxt}>No records available yet.</Text>
            </View>
          )}
        </View>
      </Animated.View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  hero: { paddingBottom: 60, borderBottomLeftRadius: 40, borderBottomRightRadius: 40 },
  heroSummary: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 30, marginTop: 25 },
  mainStat: { alignItems: 'center' },
  mainStatVal: { fontSize: 32, fontFamily: FONTS.black },
  mainStatLbl: { fontSize: 10, fontFamily: FONTS.bold, color: 'rgba(255,255,255,0.5)', marginTop: 2 },
  statLine: { width: 1, height: 40, backgroundColor: 'rgba(255,255,255,0.1)', marginHorizontal: 30 },
  subStats: { flexDirection: 'row', flex: 1, justifyContent: 'space-between' },
  subStatItem: { alignItems: 'center' },
  subStatVal: { fontSize: 20, fontFamily: FONTS.bold },
  subStatLbl: { fontSize: 9, fontFamily: FONTS.bodySemi, color: 'rgba(255,255,255,0.5)', marginTop: 4 },
  content: { paddingHorizontal: 25, marginTop: -30 },
  section: { marginTop: 30 },
  sectionTitle: { fontSize: 18, fontFamily: FONTS.bold, marginBottom: 15 },
  calendarCard: { borderRadius: 28, padding: 20, elevation: 8, shadowOpacity: 0.05, shadowRadius: 20 },
  calHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  monthTxt: { fontSize: 17, fontFamily: FONTS.bold },
  calBtn: { width: 32, height: 32, borderRadius: 10, backgroundColor: '#F8FAFC', alignItems: 'center', justifyContent: 'center' },
  weekRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  weekTxt: { width: (width - 90) / 7, textAlign: 'center', fontSize: 11, fontFamily: FONTS.bold, color: '#94A3B8' },
  daysGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  dayCell: { width: (width - 90) / 7, height: 38, alignItems: 'center', justifyContent: 'center', borderRadius: 12, marginBottom: 6 },
  dayTxt: { fontSize: 13, fontFamily: FONTS.bodySemi, color: '#64748B' },
  calLegend: { flexDirection: 'row', justifyContent: 'center', marginTop: 15, borderTopWidth: 1, borderTopColor: '#F1F5F9', paddingTop: 15 },
  legendItem: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 10 },
  dot: { width: 6, height: 6, borderRadius: 3, marginRight: 6 },
  legendTxt: { fontSize: 10, fontFamily: FONTS.bodySemi, color: '#64748B' },
  historyCard: { borderRadius: 22, padding: 18, marginBottom: 12, flexDirection: 'row', alignItems: 'center', elevation: 2, shadowOpacity: 0.03 },
  historyInfo: { flex: 1 },
  historyDate: { fontSize: 14, fontFamily: FONTS.bold },
  historyTime: { fontSize: 11, fontFamily: FONTS.body, color: '#64748B', marginTop: 2 },
  historyTypeBox: { backgroundColor: '#F1F5F9', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, marginRight: 15 },
  historyType: { fontSize: 10, fontFamily: FONTS.bold },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, minWidth: 75, alignItems: 'center' },
  statusBadgeTxt: { fontSize: 11, fontFamily: FONTS.bold },
  reportBtn: { marginLeft: 10, padding: 5 },
  empty: { alignItems: 'center', marginTop: 30 },
  emptyTxt: { fontSize: 14, fontFamily: FONTS.bodySemi, color: '#94A3B8', marginTop: 10 },
});
