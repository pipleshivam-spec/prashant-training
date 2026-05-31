import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  ActivityIndicator, Alert, RefreshControl, StatusBar,
  Dimensions, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect, useRoute } from '@react-navigation/native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import {
  getActiveStudents,
  getStudentSchedules,
  getNotifications,
  getNotificationStats,
  addNotification,
  getTodaySchedules,
} from '../../lib/supabase';
import {
  buildWhatsAppMessage,
  openWhatsApp,
  formatNotificationTime,
  NOTIFICATION_TYPES,
} from '../../services/NotificationService';
import { useAppTheme } from '../../context/ThemeContext';

const FONTS = {
  black:   'Outfit_900Black',
  bold:    'Outfit_700Bold',
  semi:    'Outfit_600SemiBold',
  body:    'Inter_400Regular',
  bodySemi:'Inter_600SemiBold',
};

const AVATAR_COLORS = [
  { bg: '#EEEDFE', tx: '#534AB7' },
  { bg: '#EAF3DE', tx: '#3B6D11' },
  { bg: '#FAEEDA', tx: '#854F0B' },
  { bg: '#E6F1FB', tx: '#185FA5' },
];

const getInitials = (name = '') =>
  name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();

export default function Notifications() {
  const { colors } = useAppTheme();
  const navigation = useNavigation();
  const route = useRoute();
  const initialStudent = route.params?.student;

  const [loading,            setLoading]            = useState(true);
  const [refreshing,         setRefreshing]         = useState(false);
  const [stats,              setStats]              = useState({ total: 0, today: 0, students: 0 });
  const [history,            setHistory]            = useState([]);
  const [students,           setStudents]           = useState([]);
  const [selectedStudent,    setSelectedStudent]    = useState(null);
  const [sessions,           setSessions]           = useState([]);
  const [selectedSession,    setSelectedSession]    = useState(null);
  const [selectedTemplate,   setSelectedTemplate]   = useState(NOTIFICATION_TYPES.SESSION);
  const [showStudentPicker,  setShowStudentPicker]  = useState(false);
  const [sending,            setSending]            = useState(false);
  const [search,             setSearch]             = useState('');
  const [todaySchedules,     setTodaySchedules]     = useState([]);

  const fetchStats = async () => {
    const res = await getNotificationStats();
    if (!res.error) setStats(res);
  };

  const fetchHistory = async () => {
    const res = await getNotifications();
    if (!res.error && res.data) setHistory(res.data);
  };

  const fetchStudents = async () => {
    const res = await getActiveStudents();
    if (!res.error && res.data) setStudents(res.data);
  };

  const fetchTodaySchedules = async (currentHistory = []) => {
    const { data } = await getTodaySchedules();
    if (data) {
      const today = new Date().toISOString().split('T')[0];
      const remindedIds = new Set(
        currentHistory.filter(h => h.sent_at?.startsWith(today)).map(h => h.student_id)
      );
      setTodaySchedules(data.filter(s => !remindedIds.has(s.student_id)));
    }
  };

  const loadInitialData = async () => {
    setLoading(true);
    try {
      const [, , , histRes] = await Promise.all([
        fetchStats(), fetchStudents(), fetchTodaySchedules(), fetchHistory(),
      ]);
      if (initialStudent) handleSelectStudent(initialStudent);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchStats(), fetchHistory(), fetchStudents(), fetchTodaySchedules()]);
    setRefreshing(false);
  };

  useFocusEffect(useCallback(() => { loadInitialData(); }, []));

  const handleSelectStudent = async (student) => {
    setSelectedStudent(student);
    setShowStudentPicker(false);
    setSelectedSession(null);
    setSessions([]);
    const res = await getStudentSchedules(student.id);
    if (!res.error && res.data) setSessions(res.data);
  };

  const handleSend = async () => {
    if (!selectedStudent) {
      Alert.alert('Error', 'Please select a student.');
      return;
    }
    const message = buildWhatsAppMessage(selectedStudent, selectedSession, selectedTemplate);
    const res = await openWhatsApp(selectedStudent.phone, message);
    if (res.success) {
      Alert.alert(
        'Mark as Sent?',
        'WhatsApp opened ✅ — mark this reminder as sent?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Confirm',
            onPress: async () => {
              setSending(true);
              const { error } = await addNotification(selectedStudent.id, message);
              setSending(false);
              if (error) Alert.alert('Error', error.message);
              else {
                onRefresh();
                setSelectedStudent(null);
                setSelectedSession(null);
              }
            },
          },
        ]
      );
    } else {
      Alert.alert('Error', 'Could not open WhatsApp. Make sure it is installed.');
    }
  };

  const filteredHistory = history.filter(item =>
    item.students?.name?.toLowerCase().includes(search.toLowerCase()) ||
    item.message?.toLowerCase().includes(search.toLowerCase())
  );

  const messagePreview = selectedStudent
    ? buildWhatsAppMessage(selectedStudent, selectedSession, selectedTemplate)
    : 'Select a student to preview the message...';

  const TemplateChip = ({ type, label, icon }) => (
    <TouchableOpacity
      style={[s.tempChip, { borderColor: '#E2E8F0', backgroundColor: '#F8FAFC' },
        selectedTemplate === type && { backgroundColor: colors.accent, borderColor: colors.accent }]}
      onPress={() => setSelectedTemplate(type)}
    >
      <MaterialCommunityIcons
        name={icon}
        size={18}
        color={selectedTemplate === type ? colors.primaryDark : '#64748B'}
      />
      <Text style={[s.tempLabel, { color: '#64748B' },
        selectedTemplate === type && { color: colors.primaryDark }]}>{label}</Text>
    </TouchableOpacity>
  );

  if (loading && !refreshing) {
    return (
      <View style={[s.loadingContainer, { backgroundColor: colors.bg }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={s.loadingTxt}>Loading...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={[s.container, { backgroundColor: colors.bg }]}>
      <StatusBar barStyle="light-content" />

      <LinearGradient colors={[colors.primaryDark, colors.primary]} style={s.hero}>
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={colors.white} />
        </TouchableOpacity>
        <View style={s.heroHeader}>
          <View>
            <Text style={s.heroTitle}>Notifications</Text>
            <Text style={s.heroSub}>Send WhatsApp reminders</Text>
          </View>
          <View style={[s.statBadge, { backgroundColor: colors.accent }]}>
            <Text style={[s.statBadgeTxt, { color: colors.primaryDark }]}>{stats.today} today</Text>
          </View>
        </View>
        <View style={s.statRow}>
          <View style={s.statCol}>
            <Text style={s.statNum}>{stats.total}</Text>
            <Text style={s.statLab}>TOTAL SENT</Text>
          </View>
          <View style={s.statDivider} />
          <View style={s.statCol}>
            <Text style={s.statNum}>{stats.students}</Text>
            <Text style={s.statLab}>STUDENTS</Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={s.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        {/* Bulk Today Reminders */}
        {todaySchedules.length > 0 && (
          <View style={s.bulkSection}>
            <Text style={[s.sectionTitle, { color: colors.text }]}>Today's Reminders</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.bulkScroll}>
              {todaySchedules.map(item => (
                <TouchableOpacity
                  key={item.id}
                  style={[s.bulkCard, { backgroundColor: colors.primary }]}
                  onPress={() => item.students && handleSelectStudent(item.students)}
                >
                  <View style={s.bulkIcon}>
                    <Ionicons name="time" size={14} color={colors.accent} />
                  </View>
                  <View>
                    <Text style={s.bulkName}>{item.students?.name}</Text>
                    <Text style={s.bulkTime}>{item.session_time}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Templates */}
        <View style={s.tempSection}>
          <Text style={[s.sectionTitle, { color: colors.text }]}>Message Templates</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.tempScroll}>
            <TemplateChip type={NOTIFICATION_TYPES.SESSION} label="Session"  icon="calendar-clock" />
            <TemplateChip type={NOTIFICATION_TYPES.FEES}    label="Fees Due" icon="cash-multiple" />
            <TemplateChip type={NOTIFICATION_TYPES.LATE}    label="Late"     icon="clock-alert-outline" />
            <TemplateChip type={NOTIFICATION_TYPES.GENERIC} label="General"  icon="message-text-outline" />
          </ScrollView>
        </View>

        {/* Send Card */}
        <View style={[s.card, { backgroundColor: colors.white, shadowColor: colors.primary }]}>
          <Text style={s.inputLabel}>Select Student</Text>
          <TouchableOpacity
            style={[s.picker, showStudentPicker && { borderColor: colors.primary, borderWidth: 1.5 }]}
            onPress={() => setShowStudentPicker(!showStudentPicker)}
          >
            {selectedStudent
              ? <Text style={[s.selectedTxt, { color: colors.text }]}>{selectedStudent.name}</Text>
              : <Text style={s.placeholder}>Choose a student...</Text>}
            <Ionicons name="chevron-down" size={20} color={colors.primary} />
          </TouchableOpacity>

          {showStudentPicker && (
            <View style={[s.dropdown, { backgroundColor: colors.white }]}>
              {students.map(stu => (
                <TouchableOpacity key={stu.id} style={s.dropItem} onPress={() => handleSelectStudent(stu)}>
                  <Text style={[s.dropTxt, { color: colors.text }]}>{stu.name}</Text>
                  <Text style={s.dropSub}>{stu.phone}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {selectedTemplate === NOTIFICATION_TYPES.SESSION && (
            <View style={s.sessionContainer}>
              <Text style={s.inputLabel}>Select Session (optional)</Text>
              {!selectedStudent ? (
                <View style={s.sessionEmpty}>
                  <Text style={s.sessionEmptyTxt}>Select a student to see their slots</Text>
                </View>
              ) : sessions.length === 0 ? (
                <View style={s.sessionEmpty}>
                  <Text style={s.sessionEmptyTxt}>No upcoming sessions found</Text>
                </View>
              ) : (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.sessionScroll}>
                  {sessions.map(sess => (
                    <TouchableOpacity
                      key={sess.id}
                      style={[s.sessionCard,
                        selectedSession?.id === sess.id && { backgroundColor: colors.primaryDark, borderColor: colors.primaryDark }]}
                      onPress={() => setSelectedSession(sess)}
                    >
                      <View style={[s.sessionIconBox,
                        selectedSession?.id === sess.id && { backgroundColor: 'rgba(255,255,255,0.15)' }]}>
                        <Ionicons
                          name={sess.session_type === 'driving' ? 'car' : 'book'}
                          size={16}
                          color={selectedSession?.id === sess.id ? colors.white : colors.primary}
                        />
                      </View>
                      <Text style={[s.sessionDate, selectedSession?.id === sess.id && { color: colors.white }]}>
                        {sess.session_date}
                      </Text>
                      <Text style={[s.sessionTime, selectedSession?.id === sess.id && { color: 'rgba(255,255,255,0.6)' }]}>
                        {sess.session_time}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}
            </View>
          )}

          <View style={s.previewHeader}>
            <Text style={s.inputLabel}>Message Preview</Text>
            <MaterialCommunityIcons name="whatsapp" size={16} color="#25D366" />
          </View>
          <View style={[s.previewCard, { backgroundColor: colors.bg, borderColor: '#E2E8F0' }]}>
            <Text style={[s.previewTxt, { color: colors.primary }]}>{messagePreview}</Text>
          </View>

          <TouchableOpacity style={s.sendBtn} onPress={handleSend} disabled={sending}>
            <LinearGradient colors={[colors.accent, colors.accent]} style={s.sendGrad}>
              {sending
                ? <ActivityIndicator color={colors.primaryDark} />
                : <Text style={[s.sendBtnTxt, { color: colors.primaryDark }]}>Send via WhatsApp</Text>}
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* History */}
        <View style={s.historySection}>
          <View style={s.historyHeaderRow}>
            <Text style={[s.sectionTitle, { color: colors.text }]}>Sent History</Text>
            <View style={s.searchBox}>
              <Ionicons name="search" size={16} color="#64748B" />
              <TextInput
                style={s.searchIn}
                placeholder="Search..."
                value={search}
                onChangeText={setSearch}
                placeholderTextColor="#94A3B8"
              />
            </View>
          </View>

          {filteredHistory.map((item, idx) => (
            <View key={item.id} style={[s.historyCard, { backgroundColor: colors.white, borderColor: '#EEF2F8' }]}>
              <View style={[s.avatar, { backgroundColor: AVATAR_COLORS[idx % 4].bg }]}>
                <Text style={[s.avatarTxt, { color: AVATAR_COLORS[idx % 4].tx }]}>
                  {getInitials(item.students?.name || 'S')}
                </Text>
              </View>
              <View style={s.historyInfo}>
                <View style={s.historyTop}>
                  <Text style={[s.historyName, { color: colors.text }]}>{item.students?.name || 'Unknown'}</Text>
                  <Text style={s.historyTime}>{formatNotificationTime(item.sent_at)}</Text>
                </View>
                <Text style={[s.historyMsg, { color: '#64748B' }]} numberOfLines={2}>{item.message}</Text>
              </View>
            </View>
          ))}

          {filteredHistory.length === 0 && (
            <View style={s.emptyHistory}>
              <Ionicons name="notifications-off-outline" size={40} color="#E2E8F0" />
              <Text style={s.emptyHistoryTxt}>No notifications sent yet</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container:        { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingTxt:       { fontFamily: FONTS.bodySemi, color: '#64748B', marginTop: 10 },

  hero:        { padding: 24, paddingBottom: 32, borderBottomLeftRadius: 32, borderBottomRightRadius: 32 },
  backBtn:     { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  heroHeader:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  heroTitle:   { fontFamily: FONTS.black, fontSize: 28, color: '#FFFFFF' },
  heroSub:     { fontFamily: FONTS.body, fontSize: 14, color: 'rgba(255,255,255,0.6)' },
  statBadge:   { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  statBadgeTxt:{ fontFamily: FONTS.bold, fontSize: 10 },
  statRow:     { flexDirection: 'row', alignItems: 'center', marginTop: 24, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 20, padding: 16 },
  statCol:     { flex: 1, alignItems: 'center' },
  statNum:     { fontFamily: FONTS.black, fontSize: 20, color: '#FFFFFF' },
  statLab:     { fontFamily: FONTS.bodySemi, fontSize: 10, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase' },
  statDivider: { width: 1, height: 30, backgroundColor: 'rgba(255,255,255,0.2)' },

  scroll:       { padding: 20 },
  sectionTitle: { fontFamily: FONTS.bold, fontSize: 18, marginBottom: 12 },

  bulkSection: { marginBottom: 20 },
  bulkScroll:  { paddingRight: 20 },
  bulkCard:    { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 16, marginRight: 10, width: 150 },
  bulkIcon:    { width: 24, height: 24, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  bulkName:    { fontFamily: FONTS.bold, fontSize: 13, color: '#FFFFFF' },
  bulkTime:    { fontFamily: FONTS.body, fontSize: 11, color: 'rgba(255,255,255,0.6)' },

  tempSection: { marginBottom: 24 },
  tempScroll:  { paddingRight: 20 },
  tempChip:    { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 16, marginRight: 10, borderWidth: 1 },
  tempLabel:   { fontFamily: FONTS.bodySemi, fontSize: 13, marginLeft: 6 },

  card:       { borderRadius: 24, padding: 20, elevation: 4, shadowOpacity: 0.1, shadowRadius: 10, marginBottom: 24 },
  inputLabel: { fontFamily: FONTS.bodySemi, fontSize: 12, color: '#64748B', textTransform: 'uppercase', marginBottom: 8 },

  picker:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#F8FAFC', borderRadius: 16, borderWidth: 1, borderColor: '#EEF2F8', padding: 14, height: 56 },
  placeholder: { fontFamily: FONTS.body, color: '#94A3B8' },
  selectedTxt: { fontFamily: FONTS.bold },
  dropdown:    { borderRadius: 16, marginTop: 4, borderWidth: 1, borderColor: '#EEF2F8', overflow: 'hidden', elevation: 8 },
  dropItem:    { padding: 14, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  dropTxt:     { fontFamily: FONTS.bold, fontSize: 14 },
  dropSub:     { fontFamily: FONTS.body, fontSize: 12, color: '#94A3B8' },

  sessionContainer: { marginTop: 20 },
  sessionScroll:    { paddingVertical: 10 },
  sessionCard:      { width: 120, backgroundColor: '#F8FAFC', borderRadius: 20, padding: 12, marginRight: 12, borderWidth: 1, borderColor: '#E2E8F0', alignItems: 'center' },
  sessionIconBox:   { width: 32, height: 32, borderRadius: 10, backgroundColor: '#EEF2F8', alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  sessionDate:      { fontFamily: FONTS.bold, fontSize: 13 },
  sessionTime:      { fontFamily: FONTS.body, fontSize: 11 },
  sessionEmpty:     { padding: 20, backgroundColor: '#F1F5F9', borderRadius: 16, alignItems: 'center' },
  sessionEmptyTxt:  { fontFamily: FONTS.body, fontSize: 12, color: '#94A3B8' },

  previewHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 20, marginBottom: 8 },
  previewCard:   { borderRadius: 16, padding: 16, borderWidth: 1 },
  previewTxt:    { fontFamily: FONTS.body, fontSize: 12, lineHeight: 18 },

  sendBtn:    { marginTop: 20, borderRadius: 16, overflow: 'hidden' },
  sendGrad:   { height: 56, alignItems: 'center', justifyContent: 'center' },
  sendBtnTxt: { fontFamily: FONTS.black, fontSize: 16 },

  historySection:   { marginBottom: 40 },
  historyHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  searchBox:        { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F1F5F9', borderRadius: 10, paddingHorizontal: 10, flex: 1, marginLeft: 10, height: 36 },
  searchIn:         { flex: 1, fontFamily: FONTS.body, fontSize: 12, marginLeft: 6, color: '#1E293B' },
  historyCard:      { flexDirection: 'row', alignItems: 'center', borderRadius: 16, padding: 14, marginBottom: 12, borderWidth: 1 },
  avatar:           { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  avatarTxt:        { fontFamily: FONTS.bold, fontSize: 16 },
  historyInfo:      { flex: 1, marginLeft: 12 },
  historyTop:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  historyName:      { fontFamily: FONTS.bold, fontSize: 14 },
  historyTime:      { fontFamily: FONTS.body, fontSize: 11, color: '#94A3B8' },
  historyMsg:       { fontFamily: FONTS.body, fontSize: 12, marginTop: 2 },
  emptyHistory:     { alignItems: 'center', paddingVertical: 40 },
  emptyHistoryTxt:  { fontFamily: FONTS.body, fontSize: 13, color: '#94A3B8', marginTop: 10 },
});
