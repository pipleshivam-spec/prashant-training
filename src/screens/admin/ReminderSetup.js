// src/screens/admin/ReminderSetup.js
import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  StatusBar, ActivityIndicator, Alert, Switch, Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import * as Notifications from 'expo-notifications';
import { getTodaySchedules, getSchedules } from '../../lib/supabase';
import { useAppTheme } from '../../context/ThemeContext';

const FONTS = {
  black: 'Outfit_900Black',
  bold: 'Outfit_700Bold',
  semi: 'Outfit_600SemiBold',
  body: 'Inter_400Regular',
  bodySemi: 'Inter_600SemiBold',
};

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

async function requestPermissions() {
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

async function scheduleSessionReminder(student, session, minutesBefore = 60) {
  const [year, month, day] = session.session_date.split('-').map(Number);
  const [timePart, meridiem] = session.session_time.split(' ');
  let [hours, minutes] = timePart.split(':').map(Number);
  if (meridiem === 'PM' && hours !== 12) hours += 12;
  if (meridiem === 'AM' && hours === 12) hours = 0;

  const sessionTime = new Date(year, month - 1, day, hours, minutes, 0);
  const triggerTime = new Date(sessionTime.getTime() - minutesBefore * 60 * 1000);

  if (triggerTime <= new Date()) return null;

  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: `🚗 Session Reminder — ${student}`,
      body: `Training session in ${minutesBefore} minutes at ${session.session_time}`,
      sound: true,
      data: { sessionId: session.id },
    },
    trigger: { 
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: triggerTime,
      channelId: 'session-reminders'
    },
  });
  return id;
}

function getInitials(name = '') {
  return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
}

const AVATAR_COLORS = [
  { bg: '#EEEDFE', tx: '#534AB7' },
  { bg: '#EAF3DE', tx: '#3B6D11' },
  { bg: '#FAEEDA', tx: '#854F0B' },
  { bg: '#E6F1FB', tx: '#185FA5' },
];

export default function ReminderSetup() {
  const { colors } = useAppTheme();
  const navigation = useNavigation();

  const [loading,     setLoading]     = useState(true);
  const [sessions,    setSessions]    = useState([]);
  const [scheduled,   setScheduled]   = useState({});
  const [autoRemind,  setAutoRemind]  = useState(true);
  const [hasPermission, setHasPermission] = useState(false);
  const [sending,     setSending]     = useState(null);

  useEffect(() => {
    requestPermissions().then(setHasPermission);
  }, []);

  useFocusEffect(useCallback(() => {
    (async () => {
      setLoading(true);
      const { data } = await getSchedules();
      if (data) {
        const upcoming = data.filter(s => {
          if (s.status !== 'Scheduled') return false;
          const today = new Date().toISOString().split('T')[0];
          return s.session_date >= today;
        });
        setSessions(upcoming.slice(0, 20));
      }
      setLoading(false);
    })();
  }, []));

  const handleScheduleReminder = async (item, index) => {
    if (!hasPermission) {
      const granted = await requestPermissions();
      if (!granted) {
        Alert.alert('Permission Required', 'Please allow notifications in your device settings.');
        return;
      }
      setHasPermission(true);
    }

    setSending(item.id);
    const id = await scheduleSessionReminder(
      item.students?.name || 'Student',
      item,
      60
    );
    setSending(null);

    if (id) {
      setScheduled(prev => ({ ...prev, [item.id]: id }));
      Alert.alert('Reminder Set ✅', `Push notification scheduled 1 hour before ${item.students?.name}'s session on ${item.session_date}`);
    } else {
      Alert.alert('Cannot Schedule', 'This session time has already passed.');
    }
  };

  const handleCancelReminder = async (item) => {
    const notifId = scheduled[item.id];
    if (notifId) {
      await Notifications.cancelScheduledNotificationAsync(notifId);
      setScheduled(prev => {
        const next = { ...prev };
        delete next[item.id];
        return next;
      });
      Alert.alert('Cancelled', 'Reminder has been removed.');
    }
  };

  const handleSendNow = async (item) => {
    if (!hasPermission) {
      Alert.alert('Permission Required', 'Please allow notifications first.');
      return;
    }
    await Notifications.scheduleNotificationAsync({
      content: {
        title: `🚗 Session Today — ${item.students?.name}`,
        body: `Training session at ${item.session_time} on ${item.session_date}`,
        sound: true,
      },
      trigger: null,
    });
    Alert.alert('Sent ✅', 'Notification delivered immediately.');
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
              <Text style={styles.heroSub}>Automation</Text>
              <Text style={styles.heroTitle}>Push Reminders</Text>
            </View>
          </View>

          {/* Permission Banner */}
          <View style={[styles.permBanner, {
            backgroundColor: hasPermission ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
            borderColor: hasPermission ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'
          }]}>
            <Ionicons
              name={hasPermission ? 'shield-checkmark' : 'warning'}
              size={16}
              color={hasPermission ? '#10B981' : '#EF4444'}
            />
            <Text style={[styles.permTxt, { color: hasPermission ? '#10B981' : '#EF4444' }]}>
              {hasPermission ? 'Notifications enabled — ready to send' : 'Notifications disabled — tap to enable'}
            </Text>
          </View>
        </SafeAreaView>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Auto Remind Toggle */}
        <View style={[styles.card, { backgroundColor: colors.white, shadowColor: colors.primary }]}>
          <View style={styles.toggleRow}>
            <View style={[styles.toggleIcon, { backgroundColor: '#EEEDFE' }]}>
              <Ionicons name="notifications" size={20} color="#534AB7" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.toggleTitle, { color: colors.text }]}>Auto Reminders</Text>
              <Text style={styles.toggleSub}>Automatically remind 1 hour before each session</Text>
            </View>
            <Switch
              value={autoRemind}
              onValueChange={setAutoRemind}
              trackColor={{ false: '#E2E8F0', true: colors.primary }}
              thumbColor={autoRemind ? colors.accent : '#fff'}
            />
          </View>
        </View>

        {/* How it works */}
        <View style={[styles.card, { backgroundColor: colors.white, shadowColor: colors.primary }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>How It Works</Text>
          {[
            { icon: 'calendar-outline',      text: 'Select an upcoming session below' },
            { icon: 'notifications-outline', text: 'Tap "Set Reminder" to schedule a push notification' },
            { icon: 'time-outline',          text: 'Student gets notified 1 hour before their session' },
            { icon: 'phone-portrait-outline',text: 'Works even when the app is closed' },
          ].map((step, i) => (
            <View key={i} style={styles.stepRow}>
              <View style={[styles.stepNum, { backgroundColor: colors.primary }]}>
                <Text style={styles.stepNumTxt}>{i + 1}</Text>
              </View>
              <Ionicons name={step.icon} size={16} color={colors.primary} style={{ marginRight: 10 }} />
              <Text style={[styles.stepTxt, { color: colors.text }]}>{step.text}</Text>
            </View>
          ))}
        </View>

        {/* Upcoming Sessions */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Upcoming Sessions</Text>

        {loading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 20 }} />
        ) : sessions.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="calendar-clear-outline" size={48} color="#E2E8F0" />
            <Text style={[styles.emptyTxt, { color: colors.text }]}>No upcoming sessions</Text>
          </View>
        ) : (
          sessions.map((item, index) => {
            const av = AVATAR_COLORS[index % AVATAR_COLORS.length];
            const isScheduled = !!scheduled[item.id];
            return (
              <View key={item.id} style={[styles.sessionCard, { backgroundColor: colors.white, shadowColor: colors.primary }]}>
                <View style={[styles.sessionAvatar, { backgroundColor: av.bg }]}>
                  <Text style={[styles.sessionAvatarTxt, { color: av.tx }]}>
                    {getInitials(item.students?.name || 'TR')}
                  </Text>
                </View>
                <View style={styles.sessionInfo}>
                  <Text style={[styles.sessionName, { color: colors.text }]} numberOfLines={1}>
                    {item.students?.name || 'Trainee'}
                  </Text>
                  <Text style={styles.sessionMeta}>{item.session_date} • {item.session_time}</Text>
                </View>
                <View style={styles.sessionActions}>
                  {/* Send Now */}
                  <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: '#E6F1FB' }]}
                    onPress={() => handleSendNow(item)}
                  >
                    <Ionicons name="send" size={14} color="#185FA5" />
                  </TouchableOpacity>

                  {/* Schedule / Cancel */}
                  <TouchableOpacity
                    style={[styles.remindBtn, {
                      backgroundColor: isScheduled ? '#DCFCE7' : colors.primary
                    }]}
                    onPress={() => isScheduled ? handleCancelReminder(item) : handleScheduleReminder(item, index)}
                    disabled={sending === item.id}
                  >
                    {sending === item.id
                      ? <ActivityIndicator size="small" color="#fff" />
                      : <Text style={[styles.remindTxt, { color: isScheduled ? '#10B981' : '#fff' }]}>
                          {isScheduled ? '✓ Set' : 'Remind'}
                        </Text>
                    }
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  hero: { paddingBottom: 24, paddingHorizontal: 20 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 16 },
  backBtn: { width: 40, height: 40, borderRadius: 13, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' },
  heroSub: { fontSize: 11, color: 'rgba(255,255,255,0.45)', fontFamily: FONTS.bodySemi, letterSpacing: 1.5, textTransform: 'uppercase' },
  heroTitle: { fontFamily: FONTS.black, fontSize: 26, color: '#FFFFFF', marginTop: 2 },
  permBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10 },
  permTxt: { fontFamily: FONTS.bodySemi, fontSize: 12, flex: 1 },
  scroll: { padding: 16, paddingBottom: 50 },
  card: { borderRadius: 24, padding: 20, marginBottom: 14, elevation: 3, shadowOpacity: 0.07, shadowRadius: 12, shadowOffset: { width: 0, height: 4 } },
  cardTitle: { fontFamily: FONTS.bold, fontSize: 15, marginBottom: 14 },
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  toggleIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  toggleTitle: { fontFamily: FONTS.bold, fontSize: 15 },
  toggleSub: { fontFamily: FONTS.body, fontSize: 12, color: '#64748B', marginTop: 2 },
  stepRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  stepNum: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  stepNumTxt: { fontFamily: FONTS.bold, fontSize: 11, color: '#fff' },
  stepTxt: { fontFamily: FONTS.bodySemi, fontSize: 13, flex: 1 },
  sectionTitle: { fontFamily: FONTS.bold, fontSize: 16, marginBottom: 12 },
  sessionCard: { flexDirection: 'row', alignItems: 'center', borderRadius: 20, padding: 14, marginBottom: 10, elevation: 2, shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } },
  sessionAvatar: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  sessionAvatarTxt: { fontFamily: FONTS.bold, fontSize: 15 },
  sessionInfo: { flex: 1 },
  sessionName: { fontFamily: FONTS.bold, fontSize: 14 },
  sessionMeta: { fontFamily: FONTS.body, fontSize: 11, color: '#64748B', marginTop: 2 },
  sessionActions: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  actionBtn: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  remindBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12 },
  remindTxt: { fontFamily: FONTS.bold, fontSize: 12 },
  empty: { alignItems: 'center', marginTop: 40, gap: 12 },
  emptyTxt: { fontFamily: FONTS.bold, fontSize: 15 },
});
