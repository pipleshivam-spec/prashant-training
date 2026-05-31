import React, { useState, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, StatusBar, Alert, Dimensions, ScrollView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { LinearGradient } from 'expo-linear-gradient';
import {
  getTodaySchedules,
  getTodayAttendance,
  upsertAttendance,
  getStudents,
  getAttendanceRecords,
} from '../../lib/supabase';
import { useAppTheme } from '../../context/ThemeContext';

const FONTS = {
  bold:    'Outfit_700Bold',
  semi:    'Outfit_600SemiBold',
  regular: 'Inter_400Regular',
  medium:  'Inter_500Medium',
};

export default function Attendance() {
  const { i18n } = useTranslation();
  const { colors } = useAppTheme();
  const navigation = useNavigation();

  const [activeTab,       setActiveTab]       = useState('today');
  const [loading,         setLoading]         = useState(true);
  const [sessions,        setSessions]        = useState([]);
  const [attendanceMap,   setAttendanceMap]   = useState({});
  const [students,        setStudents]        = useState([]);
  const [selectedStudent, setSelectedStudent] = useState('All');
  const [historyRecords,  setHistoryRecords]  = useState([]);

  const formattedDate = useMemo(() => {
    return new Date().toLocaleDateString(
      i18n.language === 'gu' ? 'en-IN' : 'en-US',
      { weekday: 'long', day: 'numeric', month: 'long' }
    );
  }, [i18n.language]);

  const loadTodayData = async () => {
    setLoading(true);
    try {
      const sessionsRes = await getTodaySchedules();
      if (sessionsRes.data) {
        setSessions(sessionsRes.data);
        const sessionIds = sessionsRes.data.map(s => s.id);
        if (sessionIds.length > 0) {
          const attendanceRes = await getTodayAttendance(sessionIds);
          const attMap = {};
          (attendanceRes.data || []).forEach(rec => { attMap[rec.session_id] = rec.status; });
          setAttendanceMap(attMap);
        }
      }
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const loadHistoryData = async () => {
    setLoading(true);
    const [studentsRes, recordsRes] = await Promise.all([
      getStudents(),
      getAttendanceRecords(selectedStudent === 'All' ? null : selectedStudent),
    ]);
    if (studentsRes.data) setStudents(studentsRes.data);
    if (recordsRes.data) setHistoryRecords(recordsRes.data);
    setLoading(false);
  };

  useFocusEffect(useCallback(() => {
    if (activeTab === 'today') loadTodayData();
    else loadHistoryData();
  }, [activeTab, selectedStudent]));

  const handleMarkAttendance = async (sessionId, studentId, status) => {
    const session = sessions.find(s => s.id === sessionId);
    const finalStudentId = studentId || session?.students?.id || session?.student_id;
    if (!finalStudentId) {
      Alert.alert('Error', 'Student profile not linked to this session.');
      return;
    }
    const prevStatus = attendanceMap[sessionId];
    setAttendanceMap(prev => ({ ...prev, [sessionId]: status }));
    try {
      const { error } = await upsertAttendance({
        session_id: sessionId,
        student_id: finalStudentId,
        status,
        marked_at: new Date().toISOString(),
      });
      if (error) {
        setAttendanceMap(prev => ({ ...prev, [sessionId]: prevStatus }));
        Alert.alert('Save Failed', error.message);
      }
    } catch (err) {
      setAttendanceMap(prev => ({ ...prev, [sessionId]: prevStatus }));
      Alert.alert('System Error', err.message);
    }
  };

  const SessionCard = ({ item }) => {
    const status = attendanceMap[item.id];
    return (
      <View style={[styles.card, { backgroundColor: colors.white, shadowColor: colors.primary }]}>
        <View style={styles.cardHeader}>
          <View style={[styles.avatar, { backgroundColor: '#EFF6FF' }]}>
            <Text style={[styles.avatarTxt, { color: colors.primary }]}>
              {item.students?.name?.charAt(0).toUpperCase() || '?'}
            </Text>
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={[styles.cardName, { color: colors.text }]}>{item.students?.name || 'Trainee'}</Text>
            <Text style={styles.cardSub}>{item.session_time} • {item.duration || '60m'}</Text>
          </View>
          <View style={styles.typeTag}>
            <Text style={[styles.typeTagTxt, { color: colors.primary }]}>{item.license_type || 'LMV'}</Text>
          </View>
        </View>

        <View style={styles.actionRow}>
          {[
            { id: 'present', icon: 'checkmark-circle', color: '#10B981', bg: '#E6F4EA', label: 'Present' },
            { id: 'absent',  icon: 'close-circle',     color: '#EF4444', bg: '#FEE2E2', label: 'Absent'  },
            { id: 'skip',    icon: 'help-circle',      color: '#64748B', bg: '#F1F5F9', label: 'Skip'    },
          ].map(btn => (
            <TouchableOpacity
              key={btn.id}
              onPress={() => handleMarkAttendance(item.id, item.student_id, btn.id)}
              style={[styles.actionBtn, { backgroundColor: status === btn.id ? btn.color : btn.bg }]}
            >
              <Ionicons name={btn.icon} size={18} color={status === btn.id ? colors.white : btn.color} />
              <Text style={[styles.actionBtnTxt, { color: status === btn.id ? colors.white : btn.color }]}>
                {btn.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  };

  const HistoryRow = ({ item }) => (
    <View style={[styles.historyItem, { backgroundColor: colors.white }]}>
      <View style={{ flex: 1 }}>
        <Text style={[styles.historyName, { color: colors.text }]}>{item.students?.name}</Text>
        <Text style={styles.historyMeta}>{item.schedules?.session_date} • {item.schedules?.session_time}</Text>
      </View>
      <View style={[styles.statusBadge, { backgroundColor: item.status === 'present' ? '#E6F4EA' : '#FEE2E2' }]}>
        <Text style={[styles.statusBadgeTxt, { color: item.status === 'present' ? '#10B981' : '#EF4444' }]}>
          {item.status?.toUpperCase()}
        </Text>
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <StatusBar barStyle="light-content" />

      <LinearGradient colors={[colors.primaryDark, colors.primary]} style={styles.header}>
        <SafeAreaView edges={['top']}>
          <View style={styles.navRow}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
              <Ionicons name="chevron-back" size={24} color={colors.white} />
            </TouchableOpacity>
            <Text style={styles.title}>Attendance</Text>
            <View style={{ width: 44 }} />
          </View>
          <View style={styles.dateBox}>
            <Ionicons name="calendar-outline" size={16} color={colors.accent} />
            <Text style={styles.dateText}>{formattedDate}</Text>
          </View>
        </SafeAreaView>
      </LinearGradient>

      <View style={styles.body}>
        {/* Tab Bar */}
        <View style={[styles.tabContainer, { backgroundColor: colors.white, shadowColor: colors.primary }]}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'today' && { backgroundColor: colors.accent }]}
            onPress={() => setActiveTab('today')}
          >
            <Text style={[styles.tabTxt, activeTab === 'today' && { color: colors.primary }]}>Mark Today</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'history' && { backgroundColor: colors.accent }]}
            onPress={() => setActiveTab('history')}
          >
            <Text style={[styles.tabTxt, activeTab === 'history' && { color: colors.primary }]}>History</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
        ) : activeTab === 'today' ? (
          <FlatList
            data={sessions}
            renderItem={({ item }) => <SessionCard item={item} />}
            keyExtractor={item => item.id.toString()}
            contentContainerStyle={styles.list}
            ListEmptyComponent={
              <View style={styles.empty}>
                <Ionicons name="calendar-clear-outline" size={48} color="#E2E8F0" />
                <Text style={styles.emptyTxt}>No sessions scheduled for today</Text>
              </View>
            }
          />
        ) : (
          <View style={{ flex: 1 }}>
            <View style={styles.filterSection}>
              <Text style={styles.filterTitle}>Filter by Student</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipScroll}>
                <TouchableOpacity
                  style={[styles.chip, { backgroundColor: colors.white, borderColor: '#E2E8F0' },
                    selectedStudent === 'All' && { backgroundColor: colors.primary, borderColor: colors.primary }]}
                  onPress={() => setSelectedStudent('All')}
                >
                  <Text style={[styles.chipTxt, { color: colors.primary },
                    selectedStudent === 'All' && { color: colors.white }]}>All Students</Text>
                </TouchableOpacity>
                {students.map(s => (
                  <TouchableOpacity
                    key={s.id}
                    style={[styles.chip, { backgroundColor: colors.white, borderColor: '#E2E8F0' },
                      selectedStudent === s.id && { backgroundColor: colors.primary, borderColor: colors.primary }]}
                    onPress={() => setSelectedStudent(s.id)}
                  >
                    <Text style={[styles.chipTxt, { color: colors.primary },
                      selectedStudent === s.id && { color: colors.white }]}>{s.name}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
            <FlatList
              data={historyRecords}
              renderItem={({ item }) => <HistoryRow item={item} />}
              keyExtractor={item => item.id.toString()}
              contentContainerStyle={styles.list}
            />
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container:     { flex: 1 },
  header:        { paddingBottom: 30, borderBottomLeftRadius: 35, borderBottomRightRadius: 35 },
  navRow:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 15 },
  iconBtn:       { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  title:         { fontSize: 20, fontFamily: FONTS.bold, color: '#FFFFFF' },
  dateBox:       { flexDirection: 'row', alignItems: 'center', alignSelf: 'center', marginTop: 10, backgroundColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 15, paddingVertical: 6, borderRadius: 20 },
  dateText:      { fontSize: 13, fontFamily: FONTS.semi, color: '#FFFFFF', marginLeft: 8 },
  body:          { flex: 1, paddingHorizontal: 20, marginTop: -25 },
  tabContainer:  { flexDirection: 'row', borderRadius: 20, padding: 6, elevation: 4, shadowOpacity: 0.1, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } },
  tab:           { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 16 },
  tabTxt:        { fontSize: 14, fontFamily: FONTS.bold, color: '#64748B' },
  list:          { paddingTop: 20, paddingBottom: 100 },
  card:          { borderRadius: 24, padding: 18, marginBottom: 16, elevation: 2, shadowOpacity: 0.05, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } },
  cardHeader:    { flexDirection: 'row', alignItems: 'center', marginBottom: 18 },
  avatar:        { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  avatarTxt:     { fontSize: 20, fontFamily: FONTS.bold },
  cardName:      { fontSize: 17, fontFamily: FONTS.bold },
  cardSub:       { fontSize: 12, color: '#64748B', marginTop: 2, fontFamily: FONTS.regular },
  typeTag:       { backgroundColor: '#F1F5F9', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  typeTagTxt:    { fontSize: 10, fontFamily: FONTS.bold },
  actionRow:     { flexDirection: 'row', gap: 10 },
  actionBtn:     { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 12, gap: 6 },
  actionBtnTxt:  { fontSize: 12, fontFamily: FONTS.bold },
  historyItem:   { borderRadius: 18, padding: 15, marginBottom: 12, flexDirection: 'row', alignItems: 'center' },
  historyName:   { fontSize: 15, fontFamily: FONTS.bold },
  historyMeta:   { fontSize: 11, color: '#64748B', marginTop: 2, fontFamily: FONTS.regular },
  statusBadge:   { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  statusBadgeTxt:{ fontSize: 10, fontFamily: FONTS.bold },
  filterSection: { marginTop: 20, marginBottom: 10 },
  filterTitle:   { fontSize: 12, fontFamily: FONTS.bold, color: '#64748B', textTransform: 'uppercase', marginLeft: 5, marginBottom: 10 },
  chipScroll:    { gap: 10, paddingBottom: 5 },
  chip:          { paddingHorizontal: 15, paddingVertical: 8, borderRadius: 14, borderWidth: 1 },
  chipTxt:       { fontSize: 13, fontFamily: FONTS.semi },
  empty:         { alignItems: 'center', marginTop: 60 },
  emptyTxt:      { fontSize: 14, color: '#64748B', marginTop: 10, fontFamily: FONTS.medium },
});
