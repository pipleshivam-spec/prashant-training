import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Dimensions, StatusBar, ActivityIndicator, Animated, Alert, Image
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ConfettiCannon from 'react-native-confetti-cannon';
import Svg, { Circle } from 'react-native-svg';
import * as ImagePicker from 'expo-image-picker';
import { 
  getStudentProfile, 
  getNextSession, 
  getStudentSchedulesFull, 
  getStudentAttendanceList,
  getStudentFeeInfo,
  signOut,
  uploadProfilePicture
} from '../../lib/supabase';
import Header from '../../components/Header';
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

function getInitials(name = '') {
  return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
}

const StatChip = ({ label, value, icon, color }) => (
  <View style={styles.statChip}>
    <View style={[styles.statIconBox, { backgroundColor: color + '20' }]}>
      <Ionicons name={icon} size={16} color={color} />
    </View>
    <View style={styles.statContent}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  </View>
);

const AttendanceRing = ({ percentage, color }) => {
  const size = 90;
  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const animatedValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(animatedValue, { toValue: percentage, duration: 1500, useNativeDriver: false }).start();
  }, [percentage]);

  const strokeDashoffset = animatedValue.interpolate({
    inputRange: [0, 100],
    outputRange: [circumference, 0],
  });

  return (
    <View style={styles.ringWrapper}>
      <Svg width={size} height={size}>
        <Circle cx={size/2} cy={size/2} r={radius} stroke="#E2E8F0" strokeWidth={strokeWidth} fill="none" />
        <AnimatedCircle
          cx={size/2} cy={size/2} r={radius}
          stroke={color || '#10B981'} strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round" fill="none"
          transform={`rotate(-90 ${size/2} ${size/2})`}
        />
      </Svg>
      <View style={styles.ringText}>
        <Text style={styles.ringPercent}>{Math.round(percentage)}%</Text>
      </View>
    </View>
  );
};

export default function StudentDashboard() {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [student, setStudent] = useState(null);
  const [nextSession, setNextSession] = useState(null);
  const [stats, setStats] = useState({ done: 0, attendance: 0, present: 0, absent: 0, skipped: 0 });
  const [feeInfo, setFeeInfo] = useState({ presentSessions: 0, sessionFee: 0, paid: 0, balance: 0 });
  const progressAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const loadData = async () => {
    try {
      setLoading(true);
      const studentDataStr = await AsyncStorage.getItem('studentData');
      if (!studentDataStr) { navigation.replace('LoginScreen'); return; }
      const studentData = JSON.parse(studentDataStr);
      const studentId = studentData.id;

      const [profileRes, nextRes, schedulesRes, attendanceRes, feeRes] = await Promise.all([
        getStudentProfile(studentId),
        getNextSession(studentId),
        getStudentSchedulesFull(studentId),
        getStudentAttendanceList(studentId),
        getStudentFeeInfo(studentId),
      ]);
      if (feeRes.data) setFeeInfo(feeRes.data);

      if (profileRes.data) setStudent(profileRes.data[0]);
      if (nextRes.data) setNextSession(nextRes.data);
      
      const isFresh = await AsyncStorage.getItem('isFreshLogin');
      if (isFresh === 'true') {
        setShowCelebration(true);
        await AsyncStorage.removeItem('isFreshLogin');
      }
      
      const done = schedulesRes.data?.filter(s => s.status === 'Completed').length || 0;
      const attData = attendanceRes.data || [];
      const present = attData.filter(a => a.status === 'present').length;
      const attPercent = (present / (attData.length || 1)) * 100;

      setStats({ 
        done, 
        attendance: attPercent, 
        present, 
        absent: attData.filter(a => a.status === 'absent').length, 
        skipped: attData.filter(a => a.status === 'skipped').length 
      });

      Animated.parallel([
        Animated.timing(progressAnim, { toValue: (done / 20) * 100, duration: 1500, useNativeDriver: false }),
        Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true })
      ]).start();

    } catch (error) { console.error(error); } 
    finally { setLoading(false); }
  };

  useFocusEffect(useCallback(() => { loadData(); }, []));

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return;
    let result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [1, 1], quality: 0.5 });
    if (!result.canceled) {
      setUploading(true);
      const { data: url, error } = await uploadProfilePicture(student.id, result.assets[0].uri);
      setUploading(false);
      if (!error) setStudent({ ...student, avatar_url: url });
    }
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to exit?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: async () => {
        await signOut();
        navigation.reset({ index: 0, routes: [{ name: 'LoginScreen' }] });
      }}
    ]);
  };

  if (loading) return <View style={[styles.center, { backgroundColor: colors.bg }]}><ActivityIndicator size="large" color={colors.primary} /></View>;

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      {showCelebration && (
        <ConfettiCannon
          count={150}
          origin={{ x: width / 2, y: -20 }}
          autoStart={true}
          fadeOut={true}
          fallSpeed={2500}
          colors={[colors.primary, colors.accent, '#10B981', '#3B82F6', '#F59E0B']}
        />
      )}
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        
        <LinearGradient colors={[colors.primaryDark, colors.primary]} style={styles.hero}>
          <SafeAreaView edges={['top']}>
            <View style={styles.headerTop}>
              <View style={styles.profileSection}>
                <TouchableOpacity onPress={pickImage} style={styles.avatarWrap} disabled={uploading}>
                  <View style={[styles.avatar, { borderColor: 'rgba(255,255,255,0.3)' }]}>
                    {uploading ? <ActivityIndicator size="small" color={'#FFFFFF'} /> :
                     student?.avatar_url ? <Image source={{ uri: student.avatar_url }} style={styles.avatarImg} /> :
                     <Text style={styles.avatarTxt}>{getInitials(student?.name)}</Text>}
                    <View style={[styles.editIcon, { backgroundColor: colors.primaryDark, borderColor: '#FFFFFF' }]}><Ionicons name="camera" size={10} color={'#FFFFFF'} /></View>
                  </View>
                </TouchableOpacity>
                <View style={styles.headerInfo}>
                  <Text style={styles.greeting}>Jai Shree Swaminarayan,</Text>
                  <Text style={styles.name}>{(student?.name || 'Trainee').split(' ')[0]}</Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => navigation.navigate('Announcements')} style={styles.logoutBtn}>
                <Ionicons name="notifications" size={20} color={'#FFFFFF'} />
              </TouchableOpacity>
            </View>

            <View style={styles.heroStats}>
              <StatChip label="Sessions" value={stats.done} icon="car" color={colors.accent} />
              <View style={styles.divider} />
              <StatChip label="Remaining" value={Math.max(0, 20-stats.done)} icon="time" color={'#0EA5E9'} />
              <View style={styles.divider} />
              <StatChip label="Accuracy" value={`${Math.round(stats.attendance)}%`} icon="checkmark-done" color={'#10B981'} />
            </View>
          </SafeAreaView>
        </LinearGradient>

        <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
          <View style={[styles.journeyCard, { backgroundColor: colors.white, shadowColor: colors.primaryDark }]}>
            <View style={styles.cardHeader}>
              <Text style={[styles.cardTitle, { color: colors.text }]}>Road to License</Text>
              <Text style={[styles.cardSub, { color: colors.primary }]}>{Math.round((stats.done / 20) * 100)}% Complete</Text>
            </View>
            <View style={styles.track}>
              <Animated.View style={[styles.fill, { backgroundColor: colors.primary, width: progressAnim.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] }) }]} />
            </View>
            <Text style={styles.journeyMsg}>{stats.done} sessions down, {Math.max(0, 20-stats.done)} to go! Keep it up! 💪</Text>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Next Session</Text>
            <TouchableOpacity style={[styles.nextSessionCard, { backgroundColor: colors.white, shadowColor: colors.primaryDark }]} onPress={() => navigation.navigate('MySchedule')}>
              {nextSession ? (
                <>
                  <LinearGradient colors={[colors.primaryDark, colors.primary]} style={styles.dateBox}>
                    <Text style={[styles.dateDay, { color: colors.accent }]}>{nextSession.session_date.split('-')[2]}</Text>
                    <Text style={styles.dateMonth}>{new Date(nextSession.session_date).toLocaleString('en-US', { month: 'short' }).toUpperCase()}</Text>
                  </LinearGradient>
                  <View style={styles.nextInfo}>
                    <Text style={[styles.nextTime, { color: colors.text }]}>{nextSession.session_time}</Text>
                    <Text style={styles.nextType}>{nextSession.session_type} Training</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={'#94A3B8'} />
                </>
              ) : (
                <View style={styles.emptySession}><Text style={styles.emptyTxt}>No upcoming sessions scheduled.</Text></View>
              )}
            </TouchableOpacity>
          </View>

          {/* ── Quick Action Grid: 2 top + 1 wide bottom ── */}
          <View style={styles.gridRow}>
            <TouchableOpacity
              style={[styles.actionCard, { backgroundColor: colors.white, shadowColor: colors.primaryDark }]}
              onPress={() => navigation.navigate('MySchedule')}
            >
              <View style={[styles.actionIcon, { backgroundColor: '#EEF2FF' }]}>
                <Ionicons name="calendar" size={26} color="#4F46E5" />
              </View>
              <Text style={[styles.actionLabel, { color: colors.text }]} numberOfLines={1}>Schedule</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionCard, { backgroundColor: colors.white, shadowColor: colors.primaryDark }]}
              onPress={() => navigation.navigate('MyAttendance')}
            >
              <View style={[styles.actionIcon, { backgroundColor: '#ECFDF5' }]}>
                <Ionicons name="checkmark-circle" size={26} color="#10B981" />
              </View>
              <Text style={[styles.actionLabel, { color: colors.text }]} numberOfLines={1}>Attendance</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionCard, { backgroundColor: colors.white, shadowColor: colors.primaryDark }]}
              onPress={() => navigation.navigate('Announcements')}
            >
              <View style={[styles.actionIcon, { backgroundColor: '#FEF3C7' }]}>
                <Ionicons name="megaphone" size={26} color="#F59E0B" />
              </View>
              <Text style={[styles.actionLabel, { color: colors.text }]} numberOfLines={1}>Notices</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.attendanceSection}>
            <View style={styles.attHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Attendance Overview</Text>
              <TouchableOpacity onPress={() => navigation.navigate('MyAttendance')}><Text style={[styles.viewAll, { color: colors.primary }]}>Details</Text></TouchableOpacity>
            </View>
            <View style={[styles.attCard, { backgroundColor: colors.white }]}>
              <AttendanceRing percentage={stats.attendance} color={colors.primary} />
              <View style={styles.attDetails}>
                <View style={styles.attRow}><View style={[styles.dot, { backgroundColor: '#10B981' }]} /><Text style={[styles.attText, { color: colors.text }]}>{stats.present} Present</Text></View>
                <View style={styles.attRow}><View style={[styles.dot, { backgroundColor: '#EF4444' }]} /><Text style={[styles.attText, { color: colors.text }]}>{stats.absent} Absent</Text></View>
                <View style={styles.attRow}><View style={[styles.dot, { backgroundColor: '#F59E0B' }]} /><Text style={[styles.attText, { color: colors.text }]}>{stats.skipped} Skipped</Text></View>
              </View>
            </View>
          </View>

          <TouchableOpacity style={styles.helpBtn} onPress={() => Alert.alert('Contact', 'Prashant Sir: +91 99988 87776')}>
            <LinearGradient colors={['#25D366', '#128C7E']} style={styles.helpGrad}>
              <Ionicons name="logo-whatsapp" size={20} color={'#FFFFFF'} />
              <Text style={styles.helpTxt}>Message Instructor</Text>
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { flexGrow: 1 },
  hero: { paddingTop: 60, paddingBottom: 40, paddingHorizontal: 25, borderBottomLeftRadius: 40, borderBottomRightRadius: 40 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  profileSection: { flexDirection: 'row', alignItems: 'center' },
  avatarWrap: { position: 'relative' },
  avatar: { width: 70, height: 70, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderWidth: 1 },
  avatarImg: { width: '100%', height: '100%' },
  avatarTxt: { fontSize: 24, fontFamily: FONTS.bold, color: '#FFFFFF' },
  editIcon: { position: 'absolute', bottom: 0, right: 0, width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 2 },
  headerInfo: { marginLeft: 15 },
  greeting: { fontSize: 13, fontFamily: FONTS.body, color: 'rgba(255,255,255,0.6)' },
  name: { fontSize: 28, fontFamily: FONTS.black, color: '#FFFFFF', marginTop: 2 },
  logoutBtn: { width: 42, height: 42, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },
  heroStats: { flexDirection: 'row', alignItems: 'center', marginTop: 35, backgroundColor: 'rgba(0,0,0,0.2)', padding: 20, borderRadius: 28 },
  statChip: { flex: 1, alignItems: 'center', flexDirection: 'row', justifyContent: 'center' },
  statIconBox: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  statContent: { alignItems: 'flex-start' },
  statValue: { fontSize: 16, fontFamily: FONTS.bold, color: '#FFFFFF' },
  statLabel: { fontSize: 9, fontFamily: FONTS.bodySemi, color: 'rgba(255,255,255,0.5)', letterSpacing: 0.5 },
  divider: { width: 1, height: 30, backgroundColor: 'rgba(255,255,255,0.1)', marginHorizontal: 5 },
  content: { padding: 25, marginTop: -20 },
  journeyCard: { padding: 20, borderRadius: 28, elevation: 12, shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.1, shadowRadius: 24, marginBottom: 30 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  cardTitle: { fontSize: 16, fontFamily: FONTS.bold },
  cardSub: { fontSize: 13, fontFamily: FONTS.semi },
  track: { height: 10, backgroundColor: '#F1F5F9', borderRadius: 5, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 5 },
  journeyMsg: { fontSize: 12, fontFamily: FONTS.bodySemi, color: '#64748B', marginTop: 12, textAlign: 'center' },
  section: { marginBottom: 30 },
  sectionTitle: { fontSize: 18, fontFamily: FONTS.bold },
  nextSessionCard: { padding: 15, borderRadius: 24, flexDirection: 'row', alignItems: 'center', marginTop: 15, elevation: 4, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10 },
  dateBox: { width: 55, height: 55, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  dateDay: { fontSize: 22, fontFamily: FONTS.black },
  dateMonth: { fontSize: 9, fontFamily: FONTS.bold, color: '#FFFFFF' },
  nextInfo: { flex: 1, marginLeft: 15 },
  nextTime: { fontSize: 17, fontFamily: FONTS.black },
  nextType: { fontSize: 13, fontFamily: FONTS.bodySemi, color: '#64748B', marginTop: 2 },
  gridRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  actionCard: { flex: 1, marginHorizontal: 6, padding: 12, borderRadius: 20, alignItems: 'center', elevation: 6, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.04, shadowRadius: 12 },
  actionIcon: { width: 44, height: 44, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  actionLabel: { fontSize: 12, fontFamily: FONTS.bold },
  attendanceSection: { marginBottom: 30 },
  attHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  viewAll: { fontSize: 13, fontFamily: FONTS.semi },
  attCard: { padding: 20, borderRadius: 28, flexDirection: 'row', alignItems: 'center', elevation: 2 },
  ringWrapper: { position: 'relative', alignItems: 'center', justifyContent: 'center' },
  ringText: { position: 'absolute' },
  ringPercent: { fontSize: 18, fontFamily: FONTS.black, color: '#0F172A' },
  attDetails: { marginLeft: 25, flex: 1 },
  attRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  dot: { width: 8, height: 8, borderRadius: 4, marginRight: 10 },
  attText: { fontSize: 13, fontFamily: FONTS.bodySemi },
  helpBtn: { marginBottom: 40 },
  helpGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 18, borderRadius: 24 },
  helpTxt: { fontSize: 15, fontFamily: FONTS.bold, color: '#FFFFFF', marginLeft: 10 },
  emptySession: { flex: 1, padding: 10, alignItems: 'center' },
  emptyTxt: { fontSize: 14, fontFamily: FONTS.bodySemi, color: '#94A3B8' },
});
