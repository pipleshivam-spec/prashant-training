import React, { useState, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  StatusBar, ActivityIndicator, Dimensions, Animated,
  TextInput, Alert, Modal, ScrollView, Platform, KeyboardAvoidingView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getStudentSchedulesFull,
  submitSessionFeedback,
  getSessionFeedbackMap,
  submitRescheduleRequest,
  getRescheduleRequestMap,
} from '../../lib/supabase';
import { scheduleSessionReminders } from '../../lib/notifications';
import { useAppTheme } from '../../context/ThemeContext';

const { width } = Dimensions.get('window');

const FONTS = {
  black: 'Outfit_900Black',
  bold: 'Outfit_700Bold',
  semi: 'Outfit_600SemiBold',
  body: 'Inter_400Regular',
  bodySemi: 'Inter_600SemiBold',
};

// ── Star Rating Component ────────────────────────────────────
const StarRating = ({ rating, onRate, size = 32 }) => (
  <View style={{ flexDirection: 'row', justifyContent: 'center', marginVertical: 10 }}>
    {[1, 2, 3, 4, 5].map(star => (
      <TouchableOpacity key={star} onPress={() => onRate(star)} style={{ marginHorizontal: 6 }}>
        <Ionicons
          name={star <= rating ? 'star' : 'star-outline'}
          size={size}
          color={star <= rating ? '#FCD400' : '#CBD5E1'}
        />
      </TouchableOpacity>
    ))}
  </View>
);

// ── Feedback Modal ───────────────────────────────────────────
const FeedbackModal = ({ visible, session, studentId, onClose, onSubmit }) => {
  const { colors } = useAppTheme();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const ratingLabels = ['', 'Needs Work', 'Below Average', 'Good', 'Very Good', 'Excellent!'];

  const handleSubmit = async () => {
    if (rating === 0) { Alert.alert('Please select a rating'); return; }
    setSubmitting(true);
    const { error } = await submitSessionFeedback(studentId, session?.id, rating, comment);
    setSubmitting(false);
    if (error) {
      Alert.alert('Error', 'Could not save feedback. Please try again.');
    } else {
      onSubmit(session?.id, rating);
      onClose();
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={fbStyles.overlay}>
        <View style={[fbStyles.sheet, { backgroundColor: colors.white }]}>
          <View style={fbStyles.handle} />
          <Text style={[fbStyles.title, { color: colors.text }]}>Rate this Session</Text>
          <Text style={fbStyles.sessionInfo}>
            {session?.session_date} · {session?.session_type}
          </Text>

          <StarRating rating={rating} onRate={setRating} />
          {rating > 0 && (
            <Text style={[fbStyles.ratingLabel, { color: colors.primary }]}>
              {ratingLabels[rating]}
            </Text>
          )}

          <TextInput
            style={[fbStyles.commentBox, { borderColor: colors.primary + '40', color: colors.text }]}
            placeholder="Any comments for your instructor? (optional)"
            placeholderTextColor="#94A3B8"
            value={comment}
            onChangeText={setComment}
            multiline
            maxLength={200}
          />

          <View style={fbStyles.btnRow}>
            <TouchableOpacity style={fbStyles.cancelBtn} onPress={onClose}>
              <Text style={fbStyles.cancelTxt}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[fbStyles.submitBtn, { backgroundColor: colors.primary }]}
              onPress={handleSubmit}
              disabled={submitting}
            >
              {submitting
                ? <ActivityIndicator size="small" color="#FFF" />
                : <Text style={fbStyles.submitTxt}>Submit</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

// ── Session Detail Modal ───────────────────────────────────────
const SessionDetailModal = ({ visible, session, onClose }) => {
  const { colors } = useAppTheme();
  if (!session) return null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={rsStyles.overlay}>
        <TouchableOpacity style={{flex: 1}} onPress={onClose} activeOpacity={1} />
        <View style={[rsStyles.sheet, { backgroundColor: colors.white, paddingBottom: 40 }]}>
          <View style={rsStyles.handle} />
          <Text style={[rsStyles.title, { color: colors.text }]}>Session Details</Text>
          <Text style={rsStyles.sessionInfo}>Information about your training slot.</Text>

          <View style={{ marginTop: 10 }}>
            <View style={styles.detailModalRow}>
              <View style={[styles.detailModalIcon, { backgroundColor: colors.primary + '15' }]}><Ionicons name="calendar-outline" size={20} color={colors.primary} /></View>
              <View><Text style={styles.detailModalLbl}>Date</Text><Text style={[styles.detailModalVal, { color: colors.text }]}>{session.session_date}</Text></View>
            </View>
            <View style={styles.detailModalRow}>
              <View style={[styles.detailModalIcon, { backgroundColor: '#0EA5E915' }]}><Ionicons name="time-outline" size={20} color="#0EA5E9" /></View>
              <View><Text style={styles.detailModalLbl}>Time Slot</Text><Text style={[styles.detailModalVal, { color: colors.text }]}>{session.session_time}</Text></View>
            </View>
            <View style={styles.detailModalRow}>
              <View style={[styles.detailModalIcon, { backgroundColor: '#10B98115' }]}><Ionicons name="car-outline" size={20} color="#10B981" /></View>
              <View><Text style={styles.detailModalLbl}>Type</Text><Text style={[styles.detailModalVal, { color: colors.text }]}>{session.session_type}</Text></View>
            </View>
            <View style={styles.detailModalRow}>
              <View style={[styles.detailModalIcon, { backgroundColor: '#F59E0B15' }]}><Ionicons name="card-outline" size={20} color="#F59E0B" /></View>
              <View><Text style={styles.detailModalLbl}>License</Text><Text style={[styles.detailModalVal, { color: colors.text }]}>{session.license_type || 'LMV'}</Text></View>
            </View>
            <View style={styles.detailModalRow}>
              <View style={[styles.detailModalIcon, { backgroundColor: '#8B5CF615' }]}><Ionicons name="information-circle-outline" size={20} color="#8B5CF6" /></View>
              <View><Text style={styles.detailModalLbl}>Status</Text><Text style={[styles.detailModalVal, { color: colors.text }]}>{session.status}</Text></View>
            </View>
          </View>

          <TouchableOpacity style={[fbStyles.cancelBtn, { marginTop: 25 }]} onPress={onClose}>
            <Text style={fbStyles.cancelTxt}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

// ── Reschedule Modal ─────────────────────────────────────────
const RescheduleModal = ({ visible, session, studentId, onClose, onSubmit }) => {
  const { colors } = useAppTheme();
  const [preferredDate, setPreferredDate] = useState('');
  const [preferredTime, setPreferredTime] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const quickTimes = ['08:00', '09:00', '10:00', '11:00', '14:00', '15:00', '16:00', '17:00'];

  const handleSubmit = async () => {
    if (!preferredDate.trim()) { Alert.alert('Please enter your preferred date (YYYY-MM-DD)'); return; }
    if (!preferredTime) { Alert.alert('Please select a preferred time'); return; }
    setSubmitting(true);
    const { error } = await submitRescheduleRequest(
      studentId, session?.id, preferredDate.trim(), preferredTime, reason
    );
    setSubmitting(false);
    if (error) {
      Alert.alert('Error', 'Could not send request. Please try again.');
    } else {
      onSubmit(session?.id);
      onClose();
      Alert.alert('✅ Request Sent', 'Your reschedule request has been sent to your instructor. They will confirm soon.');
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={rsStyles.overlay}>
        <TouchableOpacity style={{flex: 1}} onPress={onClose} activeOpacity={1} />
        <View style={[rsStyles.sheet, { backgroundColor: colors.white }]}>
          <ScrollView keyboardShouldPersistTaps="handled">
            <View style={rsStyles.handle} />
            <Text style={[rsStyles.title, { color: colors.text }]}>Request Reschedule</Text>
            <Text style={rsStyles.sessionInfo}>
              Current: {session?.session_date} at {session?.session_time}
            </Text>

            <Text style={[rsStyles.label, { color: colors.text }]}>Preferred Date</Text>
            <TextInput
              style={[rsStyles.input, { borderColor: colors.primary + '40', color: colors.text }]}
              placeholder="YYYY-MM-DD  (e.g. 2025-06-15)"
              placeholderTextColor="#94A3B8"
              value={preferredDate}
              onChangeText={setPreferredDate}
              keyboardType="numeric"
              maxLength={10}
            />

            <Text style={[rsStyles.label, { color: colors.text }]}>Preferred Time</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
              {quickTimes.map(t => (
                <TouchableOpacity
                  key={t}
                  style={[rsStyles.timeChip, preferredTime === t && { backgroundColor: colors.primary }]}
                  onPress={() => setPreferredTime(t)}
                >
                  <Text style={[rsStyles.timeTxt, preferredTime === t && { color: '#FFF' }]}>{t}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={[rsStyles.label, { color: colors.text }]}>Reason (optional)</Text>
            <TextInput
              style={[rsStyles.input, { borderColor: colors.primary + '40', color: colors.text, height: 80 }]}
              placeholder="e.g. Work commitment, exam, family function..."
              placeholderTextColor="#94A3B8"
              value={reason}
              onChangeText={setReason}
              multiline
              maxLength={150}
            />

            <View style={rsStyles.btnRow}>
              <TouchableOpacity style={rsStyles.cancelBtn} onPress={onClose}>
                <Text style={rsStyles.cancelTxt}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[rsStyles.submitBtn, { backgroundColor: colors.primary }]}
                onPress={handleSubmit}
                disabled={submitting}
              >
                {submitting
                  ? <ActivityIndicator size="small" color="#FFF" />
                  : <Text style={rsStyles.submitTxt}>Send Request</Text>}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

// ── Main Screen ──────────────────────────────────────────────
export default function MySchedule() {
  const { colors } = useAppTheme();
  const [loading, setLoading] = useState(true);
  const [schedules, setSchedules] = useState([]);
  const [filter, setFilter] = useState('Upcoming');
  const [searchQuery, setSearchQuery] = useState('');
  const [feedbackMap, setFeedbackMap] = useState({});
  const [rescheduleMap, setRescheduleMap] = useState({});
  const [feedbackSession, setFeedbackSession] = useState(null);
  const [rescheduleSession, setRescheduleSession] = useState(null);
  const [detailSession, setDetailSession] = useState(null);
  const [studentId, setStudentId] = useState(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const loadData = async () => {
    try {
      setLoading(true);
      const str = await AsyncStorage.getItem('studentData');
      if (!str) return;
      const sd = JSON.parse(str);
      setStudentId(sd.id);

      const [schedulesRes, fbRes, rsRes] = await Promise.all([
        getStudentSchedulesFull(sd.id),
        getSessionFeedbackMap(sd.id),
        getRescheduleRequestMap(sd.id),
      ]);

      if (schedulesRes.data) {
        setSchedules(schedulesRes.data);
        // Feature 1: Schedule push notifications for upcoming sessions
        const upcoming = schedulesRes.data.filter(s => s.status === 'Scheduled');
        scheduleSessionReminders(upcoming);
      }
      if (fbRes.data) setFeedbackMap(fbRes.data);
      if (rsRes.data) setRescheduleMap(rsRes.data);

      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(useCallback(() => { loadData(); }, []));

  const filteredData = schedules.filter(s => {
    const todayStr = new Date().toISOString().split('T')[0];
    const isPastDate = s.session_date < todayStr;
    const matchesFilter = filter === 'Upcoming'
      ? s.status === 'Scheduled' && !isPastDate
      : (s.status === 'Completed' || s.status === 'Cancelled' || isPastDate);
    const matchesSearch = s.session_date.includes(searchQuery) ||
      s.session_type?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const renderItem = ({ item }) => {
    const isCompleted = item.status === 'Completed';
    const isCancelled = item.status === 'Cancelled';
    const isUpcoming  = item.status === 'Scheduled';
    const statusColor = isCompleted ? '#10B981' : isCancelled ? '#EF4444' : '#3B82F6';
    const hasFeedback = !!feedbackMap[item.id];
    const hasReschedule = !!rescheduleMap[item.id];

    return (
      <Animated.View style={[styles.card, { opacity: fadeAnim, backgroundColor: colors.white, shadowColor: colors.primaryDark }]}>
        <View style={[styles.statusStrip, { backgroundColor: statusColor }]} />
        <View style={styles.cardContent}>
          <TouchableOpacity activeOpacity={0.7} onPress={() => setDetailSession(item)}>
            {/* Header row */}
            <View style={styles.cardHeader}>
              <View style={styles.dateTime}>
                <Text style={[styles.dateTxt, { color: colors.text }]}>{item.session_date}</Text>
                <View style={styles.timeRow}>
                  <Ionicons name="time-outline" size={12} color="#64748B" />
                  <Text style={styles.timeTxt}>{item.session_time}</Text>
                </View>
              </View>
              <View style={[styles.badge, { backgroundColor: statusColor + '15' }]}>
                <Text style={[styles.badgeTxt, { color: statusColor }]}>{item.status.toUpperCase()}</Text>
              </View>
            </View>

            {/* Details row */}
            <View style={styles.detailsRow}>
              <View style={styles.detailItem}>
                <View style={styles.iconCircle}>
                  <Ionicons name="car-outline" size={16} color={colors.primaryDark} />
                </View>
                <Text style={[styles.detailTxt, { color: colors.text }]}>{item.session_type}</Text>
              </View>
              <View style={styles.detailItem}>
                <View style={styles.iconCircle}>
                  <Ionicons name="card-outline" size={16} color={colors.primaryDark} />
                </View>
                <Text style={[styles.detailTxt, { color: colors.text }]}>{item.license_type || 'L-MCWOG'}</Text>
              </View>
            </View>
          </TouchableOpacity>

          {/* Action buttons */}
          <View style={styles.actionRow}>
            {/* Feature 4: Feedback button on completed sessions */}
            {isCompleted && (
              <TouchableOpacity
                style={[styles.actionBtn, hasFeedback
                  ? { backgroundColor: '#FCD40020', borderColor: '#FCD400' }
                  : { backgroundColor: '#10B98115', borderColor: '#10B981' }]}
                onPress={() => !hasFeedback && setFeedbackSession(item)}
              >
                <Ionicons
                  name={hasFeedback ? 'star' : 'star-outline'}
                  size={14}
                  color={hasFeedback ? '#FCD400' : '#10B981'}
                />
                <Text style={[styles.actionBtnTxt, { color: hasFeedback ? '#B7950B' : '#10B981' }]}>
                  {hasFeedback ? `Rated ${feedbackMap[item.id]?.rating}★` : 'Rate Session'}
                </Text>
              </TouchableOpacity>
            )}

            {/* Feature 5: Reschedule button on upcoming sessions */}
            {isUpcoming && (
              <TouchableOpacity
                style={[styles.actionBtn, hasReschedule
                  ? { backgroundColor: '#F59E0B15', borderColor: '#F59E0B' }
                  : { backgroundColor: '#3B82F615', borderColor: '#3B82F6' }]}
                onPress={() => !hasReschedule && setRescheduleSession(item)}
              >
                <Ionicons
                  name={hasReschedule ? 'checkmark-circle' : 'calendar-outline'}
                  size={14}
                  color={hasReschedule ? '#F59E0B' : '#3B82F6'}
                />
                <Text style={[styles.actionBtnTxt, { color: hasReschedule ? '#B7770B' : '#3B82F6' }]}>
                  {hasReschedule ? 'Request Sent' : 'Reschedule'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Animated.View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <StatusBar barStyle="light-content" />

      <LinearGradient colors={[colors.primaryDark, colors.primary]} style={styles.hero}>
        <SafeAreaView edges={['top']}>
          <View style={{ paddingHorizontal: 25, paddingTop: 20, paddingBottom: 10 }}>
            <Text style={{ fontSize: 26, fontFamily: FONTS.black, color: '#FFFFFF' }}>My Schedule</Text>
          </View>
          <View style={styles.filterRow}>
            {['Upcoming', 'Past'].map(f => (
              <TouchableOpacity
                key={f}
                style={[styles.filterTab, filter === f && { backgroundColor: colors.accent }]}
                onPress={() => setFilter(f)}
              >
                <Text style={[styles.filterTxt, filter === f && { color: colors.primaryDark }]}>{f}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.searchContainer}>
            <View style={styles.searchBar}>
              <Ionicons name="search" size={18} color="rgba(255,255,255,0.4)" />
              <TextInput
                style={styles.searchInput}
                placeholder="Search date or type..."
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholderTextColor="rgba(255,255,255,0.4)"
              />
            </View>
          </View>
        </SafeAreaView>
      </LinearGradient>

      <View style={styles.content}>
        {loading ? (
          <ActivityIndicator size="large" color={colors.primaryDark} style={{ marginTop: 50 }} />
        ) : (
          <FlatList
            data={filteredData}
            renderItem={renderItem}
            keyExtractor={item => `session-${item.id}`}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={() => (
              <View style={styles.empty}>
                <MaterialCommunityIcons name="calendar-blank-outline" size={60} color="#E2E8F0" />
                <Text style={[styles.emptyTitle, { color: colors.text }]}>No Sessions Found</Text>
                <Text style={styles.emptySub}>Your {filter.toLowerCase()} sessions will appear here.</Text>
              </View>
            )}
          />
        )}
      </View>

      {/* Feature 4: Feedback Modal */}
      <FeedbackModal
        visible={!!feedbackSession}
        session={feedbackSession}
        studentId={studentId}
        onClose={() => setFeedbackSession(null)}
        onSubmit={(sessionId, rating) => {
          setFeedbackMap(prev => ({ ...prev, [sessionId]: { rating } }));
        }}
      />

      {/* Feature 5: Reschedule Modal */}
      <RescheduleModal
        visible={!!rescheduleSession}
        session={rescheduleSession}
        studentId={studentId}
        onClose={() => setRescheduleSession(null)}
        onSubmit={(sessionId) => {
          setRescheduleMap(prev => ({ ...prev, [sessionId]: { status: 'pending' } }));
        }}
      />
      
      <SessionDetailModal
        visible={!!detailSession}
        session={detailSession}
        onClose={() => setDetailSession(null)}
      />
    </View>
  );
}

// ── Main Styles ──────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1 },
  hero: { paddingBottom: 30, borderBottomLeftRadius: 40, borderBottomRightRadius: 40 },
  filterRow: { flexDirection: 'row', paddingHorizontal: 25, marginTop: 20 },
  filterTab: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20, marginRight: 10, backgroundColor: 'rgba(255,255,255,0.1)' },
  filterTxt: { fontSize: 13, fontFamily: FONTS.bold, color: 'rgba(255,255,255,0.6)' },
  searchContainer: { paddingHorizontal: 25, marginTop: 15 },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 15, paddingHorizontal: 12, height: 45 },
  searchInput: { flex: 1, marginLeft: 10, color: '#FFFFFF', fontFamily: FONTS.body, fontSize: 14 },
  content: { flex: 1, marginTop: -20 },
  list: { paddingHorizontal: 25, paddingTop: 10, paddingBottom: 40 },
  card: { borderRadius: 24, marginBottom: 16, flexDirection: 'row', overflow: 'hidden', elevation: 8, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.05, shadowRadius: 15 },
  statusStrip: { width: 5 },
  cardContent: { flex: 1, padding: 18 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  dateTime: { flex: 1 },
  dateTxt: { fontSize: 15, fontFamily: FONTS.bold },
  timeRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  timeTxt: { fontSize: 12, fontFamily: FONTS.bodySemi, color: '#64748B', marginLeft: 4 },
  badge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  badgeTxt: { fontSize: 9, fontFamily: FONTS.bold },
  detailsRow: { flexDirection: 'row', marginTop: 16, borderTopWidth: 1, borderTopColor: '#F1F5F9', paddingTop: 14 },
  detailItem: { flexDirection: 'row', alignItems: 'center', marginRight: 25 },
  iconCircle: { width: 28, height: 28, borderRadius: 10, backgroundColor: '#F8FAFC', alignItems: 'center', justifyContent: 'center', marginRight: 8 },
  detailTxt: { fontSize: 13, fontFamily: FONTS.bodySemi },
  actionRow: { flexDirection: 'row', marginTop: 14, gap: 10 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12, borderWidth: 1, gap: 6 },
  actionBtnTxt: { fontSize: 12, fontFamily: FONTS.bold },
  empty: { alignItems: 'center', marginTop: 80 },
  emptyTitle: { fontSize: 18, fontFamily: FONTS.bold, marginTop: 15 },
  emptySub: { fontSize: 14, fontFamily: FONTS.body, color: '#64748B', marginTop: 5, textAlign: 'center' },
  detailModalRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  detailModalIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginRight: 15 },
  detailModalLbl: { fontSize: 12, fontFamily: FONTS.body, color: '#64748B' },
  detailModalVal: { fontSize: 15, fontFamily: FONTS.bold, marginTop: 2 }
});

// ── Feedback Modal Styles ────────────────────────────────────
const fbStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 28, paddingBottom: 40 },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#E2E8F0', alignSelf: 'center', marginBottom: 20 },
  title: { fontSize: 22, fontFamily: FONTS.black, textAlign: 'center' },
  sessionInfo: { fontSize: 13, fontFamily: FONTS.bodySemi, color: '#64748B', textAlign: 'center', marginTop: 6, marginBottom: 10 },
  ratingLabel: { fontSize: 14, fontFamily: FONTS.bold, textAlign: 'center', marginBottom: 10 },
  commentBox: { borderWidth: 1.5, borderRadius: 16, padding: 14, fontFamily: FONTS.body, fontSize: 14, minHeight: 90, textAlignVertical: 'top', marginTop: 12, marginBottom: 20 },
  btnRow: { flexDirection: 'row', gap: 12 },
  cancelBtn: { flex: 1, paddingVertical: 16, borderRadius: 16, backgroundColor: '#F1F5F9', alignItems: 'center' },
  cancelTxt: { fontSize: 15, fontFamily: FONTS.bold, color: '#64748B' },
  submitBtn: { flex: 2, paddingVertical: 16, borderRadius: 16, alignItems: 'center' },
  submitTxt: { fontSize: 15, fontFamily: FONTS.bold, color: '#FFFFFF' },
});

// ── Reschedule Modal Styles ──────────────────────────────────
const rsStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  scroll: { justifyContent: 'flex-end', flexGrow: 1 },
  sheet: { borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 28, paddingBottom: 50 },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#E2E8F0', alignSelf: 'center', marginBottom: 20 },
  title: { fontSize: 22, fontFamily: FONTS.black },
  sessionInfo: { fontSize: 13, fontFamily: FONTS.bodySemi, color: '#64748B', marginTop: 4, marginBottom: 20 },
  label: { fontSize: 13, fontFamily: FONTS.bold, marginBottom: 8, marginTop: 4 },
  input: { borderWidth: 1.5, borderRadius: 14, padding: 14, fontFamily: FONTS.body, fontSize: 14, marginBottom: 16 },
  timeChip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, backgroundColor: '#F1F5F9', marginRight: 8, marginBottom: 4 },
  timeTxt: { fontSize: 13, fontFamily: FONTS.bold, color: '#64748B' },
  btnRow: { flexDirection: 'row', gap: 12, marginTop: 8 },
  cancelBtn: { flex: 1, paddingVertical: 16, borderRadius: 16, backgroundColor: '#F1F5F9', alignItems: 'center' },
  cancelTxt: { fontSize: 15, fontFamily: FONTS.bold, color: '#64748B' },
  submitBtn: { flex: 2, paddingVertical: 16, borderRadius: 16, alignItems: 'center' },
  submitTxt: { fontSize: 15, fontFamily: FONTS.bold, color: '#FFFFFF' },
});
