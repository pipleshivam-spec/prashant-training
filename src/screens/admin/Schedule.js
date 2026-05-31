// src/screens/admin/Schedule.js
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ActivityIndicator, StatusBar, Dimensions, ScrollView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { LinearGradient } from 'expo-linear-gradient';
import { getSchedules } from '../../lib/supabase';
import { useAppTheme } from '../../context/ThemeContext';

const { width } = Dimensions.get('window');

const EN_MONTHS = ['January','February','March','April','May','June',
  'July','August','September','October','November','December'];
const GU_MONTHS = ['જાન્યુઆરી','ફેબ્રુઆરી','માર્ચ','એપ્રિલ','મે','જૂન',
  'જુલાઈ','ઓગસ્ટ','સપ્ટેમ્બર','ઓક્ટોબર','નવેમ્બર','ડિસેમ્બર'];
const EN_DAYS  = ['SUN','MON','TUE','WED','THU','FRI','SAT'];
const GU_DAYS  = ['ર','સો','મ','બુ','ગુ','શુ','શ'];

const AVATAR_COLORS = [
  { bg: '#EEEDFE', tx: '#534AB7' },
  { bg: '#EAF3DE', tx: '#3B6D11' },
  { bg: '#FAEEDA', tx: '#854F0B' },
  { bg: '#E6F1FB', tx: '#185FA5' },
];

function getInitials(name = '') {
  return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
}

// ── Custom Calendar ──────────────────────────────────────────────
const CELL_SIZE = (width - 60) / 7;

function CustomCalendar({ markedDates, selectedDate, onDayPress, lang, colors }) {
  const [viewYear,  setViewYear]  = useState(() => new Date(selectedDate).getFullYear());
  const [viewMonth, setViewMonth] = useState(() => new Date(selectedDate).getMonth());

  const months = lang === 'gu' ? GU_MONTHS : EN_MONTHS;
  const days   = lang === 'gu' ? GU_DAYS   : EN_DAYS;

  const goBack = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  };
  const goNext = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  };

  const grid = useMemo(() => {
    const first = new Date(viewYear, viewMonth, 1).getDay();
    const total = new Date(viewYear, viewMonth + 1, 0).getDate();
    const cells = Array(first).fill(null);
    for (let d = 1; d <= total; d++) cells.push(d);
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [viewYear, viewMonth]);

  const todayStr = new Date().toISOString().split('T')[0];
  const fmt = d => {
    const mm = String(viewMonth + 1).padStart(2, '0');
    const dd = String(d).padStart(2, '0');
    return `${viewYear}-${mm}-${dd}`;
  };

  return (
    <View style={cal.wrap}>
      {/* Nav */}
      <View style={cal.nav}>
        <TouchableOpacity style={[cal.navBtn, { backgroundColor: colors.bg }]} onPress={goBack}>
          <Ionicons name="chevron-back" size={18} color={colors.primary} />
        </TouchableOpacity>
        <Text style={[cal.monthTitle, { color: colors.primary }]}>{months[viewMonth]} {viewYear}</Text>
        <TouchableOpacity style={[cal.navBtn, { backgroundColor: colors.bg }]} onPress={goNext}>
          <Ionicons name="chevron-forward" size={18} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Day headers */}
      <View style={cal.row}>
        {days.map((d, i) => (
          <View key={i} style={[cal.cell, { width: CELL_SIZE }]}>
            <Text style={cal.dayHd}>{d}</Text>
          </View>
        ))}
      </View>

      {/* Grid rows */}
      {Array.from({ length: grid.length / 7 }, (_, row) => (
        <View key={row} style={cal.row}>
          {grid.slice(row * 7, row * 7 + 7).map((d, col) => {
            if (!d) return <View key={col} style={[cal.cell, { width: CELL_SIZE }]} />;
            const ds       = fmt(d);
            const isSel    = ds === selectedDate;
            const isToday  = ds === todayStr;
            const isMarked = !!markedDates[ds];
            return (
              <TouchableOpacity
                key={col}
                style={[cal.cell, { width: CELL_SIZE }]}
                onPress={() => onDayPress(ds)}
                activeOpacity={0.75}
              >
                <View style={[
                  cal.circle,
                  isSel && [cal.circleSel, { backgroundColor: colors.primary, shadowColor: colors.primary }],
                  isToday && !isSel && [cal.circleToday, { borderColor: colors.accent }],
                ]}>
                  <Text style={[
                    cal.dayNum,
                    isSel && cal.dayNumSel,
                    isToday && !isSel && [cal.dayNumToday, { color: colors.primary }],
                  ]}>{d}</Text>
                </View>
                {isMarked && (
                  <View style={[cal.dot, { backgroundColor: colors.accent }, isSel && { backgroundColor: '#FFFFFF' }]} />
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      ))}
    </View>
  );
}

// ── Main Screen ──────────────────────────────────────────────────
export default function ScheduleScreen() {
  const { t, i18n } = useTranslation();
  const { colors }  = useAppTheme();
  const navigation  = useNavigation();
  const lang        = i18n.language;

  const [loading,      setLoading]      = useState(true);
  const [schedules,    setSchedules]    = useState([]);
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split('T')[0]
  );

  const loadSchedules = async () => {
    setLoading(true);
    const { data } = await getSchedules();
    if (data) setSchedules(data);
    setLoading(false);
  };

  useFocusEffect(useCallback(() => { loadSchedules(); }, []));

  const markedDates = useMemo(() => {
    const m = {};
    schedules.forEach(s => { if (s.session_date) m[s.session_date] = true; });
    return m;
  }, [schedules]);

  const filteredSessions = useMemo(() =>
    schedules.filter(s => s.session_date === selectedDate),
  [schedules, selectedDate]);

  const dateLabel = useMemo(() => {
    try {
      return new Date(`${selectedDate}T00:00:00`).toLocaleDateString(
        lang === 'gu' ? 'en-IN' : 'en-US',
        { weekday: 'long', day: 'numeric', month: 'long' }
      );
    } catch { return selectedDate; }
  }, [selectedDate, lang]);

  const totalDone = schedules.filter(s => s.status === 'Completed').length;

  const StatusBadge = ({ status }) => {
    if (status === 'Completed')
      return <View style={[s.badge, { backgroundColor: '#EAF3DE' }]}><Text style={[s.badgeTxt, { color: '#3B6D11' }]}>DONE</Text></View>;
    if (status === 'Cancelled')
      return <View style={[s.badge, { backgroundColor: '#FCEBEB' }]}><Text style={[s.badgeTxt, { color: '#A32D2D' }]}>CANCELLED</Text></View>;
    return <View style={[s.badge, { backgroundColor: '#F1F5F9' }]}><Text style={[s.badgeTxt, { color: '#64748B' }]}>SCHEDULED</Text></View>;
  };

  const renderSession = (item, index) => {
    const av = AVATAR_COLORS[index % AVATAR_COLORS.length];
    const ac = [colors.accent, colors.primaryDark, colors.primary][index % 3];
    return (
      <TouchableOpacity
        key={item.id?.toString() || index.toString()}
        style={[s.sessionCard, { backgroundColor: colors.white, shadowColor: colors.primary }]}
        activeOpacity={0.8}
        onPress={() => navigation.navigate('SessionDetail', { sessionId: item.id })}
      >
        <View style={[s.accentBar, { backgroundColor: ac }]} />
        <View style={s.sessionInner}>
          <View style={[s.avatar, { backgroundColor: av.bg }]}>
            <Text style={[s.avatarTxt, { color: av.tx }]}>
              {getInitials(item.students?.name || 'TR')}
            </Text>
          </View>
          <View style={s.timeCol}>
            <Text style={[s.sessionTime, { color: colors.primary }]}>{item.session_time || '--:--'}</Text>
            <Text style={s.sessionDur}>{item.duration || '1h'}</Text>
          </View>
          <View style={[s.vDivider, { backgroundColor: '#EEF2F8' }]} />
          <View style={s.infoCol}>
            <Text style={[s.studentName, { color: colors.text }]} numberOfLines={1}>
              {item.students?.name || 'Trainee'}
            </Text>
            <View style={s.badgeRow}>
              <View style={[s.badge, { backgroundColor: '#E6F1FB' }]}>
                <Text style={[s.badgeTxt, { color: '#185FA5' }]}>{item.license_type || 'LMV'}</Text>
              </View>
              <StatusBadge status={item.status} />
            </View>
          </View>
          <Ionicons name="chevron-forward" size={16} color={'#E2E8F0'} />
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[s.root, { backgroundColor: colors.bg }]}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primaryDark} />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>

        {/* ── Hero Header ── */}
        <LinearGradient
          colors={[colors.primaryDark, colors.primary]}
          style={s.hero}
        >
          <View style={s.ring1} pointerEvents="none" />
          <View style={s.ring2} pointerEvents="none" />
          <View style={s.ring3} pointerEvents="none" />

          <View style={s.headerRow}>
            <View>
              <Text style={s.heroSub}>
                {lang === 'gu' ? 'સત્ર યોજના' : 'Training'}
              </Text>
              <Text style={s.heroTitle}>
                {lang === 'gu' ? 'શેડ્યૂલ' : 'Schedule'}
              </Text>
            </View>
            <TouchableOpacity
              style={s.langPill}
              onPress={() => i18n.changeLanguage(lang === 'gu' ? 'en' : 'gu')}
            >
              <Text style={s.langTxt}>{lang === 'gu' ? 'EN' : 'ગુ'}</Text>
            </TouchableOpacity>
          </View>

          <View style={s.statsRow}>
            <View style={[s.chip, { backgroundColor: 'rgba(252,212,0,0.15)', borderColor: 'rgba(252,212,0,0.3)' }]}>
              <Text style={[s.chipNum, { color: colors.accent }]}>{schedules.length}</Text>
              <Text style={[s.chipLbl, { color: 'rgba(252,212,0,0.65)' }]}>
                {lang === 'gu' ? 'કુલ' : 'Total'}
              </Text>
            </View>
            <View style={s.chip}>
              <Text style={s.chipNum}>{filteredSessions.length}</Text>
              <Text style={s.chipLbl}>{lang === 'gu' ? 'આજ' : 'Today'}</Text>
            </View>
            <View style={s.chip}>
              <Text style={s.chipNum}>{totalDone}</Text>
              <Text style={s.chipLbl}>{lang === 'gu' ? 'પૂર્ણ' : 'Done'}</Text>
            </View>
          </View>
        </LinearGradient>

        {/* ── Calendar Card ── */}
        <View style={[s.calCard, { backgroundColor: colors.white, shadowColor: colors.primary }]}>
          <CustomCalendar
            markedDates={markedDates}
            selectedDate={selectedDate}
            onDayPress={setSelectedDate}
            lang={lang}
            colors={colors}
          />
        </View>

        {/* ── Session List ── */}
        <View style={s.listSection}>
          <View style={s.listHd}>
            <View>
              <Text style={[s.listDate, { color: colors.text }]}>{dateLabel}</Text>
              <Text style={s.listCount}>
                {filteredSessions.length} {lang === 'gu' ? 'સત્ર' : 'session(s)'}
              </Text>
            </View>
            <TouchableOpacity
              style={[s.addBtn, { backgroundColor: colors.accent }]}
              onPress={() => navigation.navigate('AddSchedule')}
              activeOpacity={0.85}
            >
              <Ionicons name="add" size={18} color={colors.primaryDark} />
              <Text style={[s.addBtnTxt, { color: colors.primaryDark }]}>{lang === 'gu' ? 'ઉમેરો' : 'Add'}</Text>
            </TouchableOpacity>
          </View>

          {loading ? (
            <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
          ) : filteredSessions.length === 0 ? (
            <View style={s.emptyBox}>
              <View style={s.emptyIconWrap}>
                <Ionicons name="calendar-clear-outline" size={32} color={'#94A3B8'} />
              </View>
              <Text style={[s.emptyTitle, { color: colors.text }]}>
                {lang === 'gu' ? 'કોઈ સત્ર નથી' : 'No sessions'}
              </Text>
              <Text style={s.emptySub}>
                {lang === 'gu'
                  ? 'આ દિવસ માટે કોઈ સત્ર ઉમેરાયું નથી'
                  : 'No training sessions scheduled for this day.'}
              </Text>
              <TouchableOpacity
                style={[s.emptyCta, { backgroundColor: colors.primary }]}
                onPress={() => navigation.navigate('AddSchedule')}
              >
                <Text style={s.emptyCtaTxt}>
                  {lang === 'gu' ? '+ સત્ર ઉમેરો' : '+ Add Session'}
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            filteredSessions.map((item, index) => renderSession(item, index))
          )}
        </View>
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity
        style={[s.fab, { shadowColor: colors.accent }]}
        onPress={() => navigation.navigate('AddSchedule')}
        activeOpacity={0.85}
      >
        <LinearGradient colors={[colors.accent, colors.accent]} style={s.fabGrad}>
          <Ionicons name="add" size={26} color={colors.primaryDark} />
        </LinearGradient>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

// ── Calendar Styles ──────────────────────────────────────────────
const cal = StyleSheet.create({
  wrap:       { paddingHorizontal: 10, paddingBottom: 14 },
  nav:        { flexDirection:'row', alignItems:'center', justifyContent:'space-between', paddingVertical:14, paddingHorizontal:4 },
  navBtn:     { width:34, height:34, borderRadius:11, alignItems:'center', justifyContent:'center' },
  monthTitle: { fontFamily:'Outfit_900Black', fontSize:17 },
  row:        { flexDirection:'row' },
  cell:       { alignItems:'center', paddingVertical:3 },
  dayHd:      { fontSize:10, fontWeight:'700', color:'#94A3B8', paddingVertical:6, letterSpacing:0.5 },
  circle:     { width:34, height:34, borderRadius:17, alignItems:'center', justifyContent:'center' },
  circleSel:  { shadowOpacity:0.35, shadowRadius:8, shadowOffset:{width:0,height:4}, elevation:6 },
  circleToday:{ borderWidth:1.5 },
  dayNum:     { fontSize:13, fontWeight:'500', color:'#0F172A' },
  dayNumSel:  { color:'#FFFFFF', fontFamily:'Outfit_900Black' },
  dayNumToday:{ fontFamily:'Outfit_900Black' },
  dot:        { width:5, height:5, borderRadius:3, marginTop:1 },
});

// ── Screen Styles ────────────────────────────────────────────────
const s = StyleSheet.create({
  root:   { flex:1 },
  scroll: { paddingBottom:110 },

  // Hero
  hero:       { paddingTop:20, paddingHorizontal:20, paddingBottom:28, position:'relative', overflow:'hidden' },
  ring1:      { position:'absolute', width:260, height:260, borderRadius:130, borderWidth:1, borderColor:'rgba(252,212,0,0.08)', top:-80, right:-70 },
  ring2:      { position:'absolute', width:170, height:170, borderRadius:85,  borderWidth:1, borderColor:'rgba(252,212,0,0.06)', top:-20, right:-10 },
  ring3:      { position:'absolute', width:90,  height:90,  borderRadius:45,  borderWidth:1, borderColor:'rgba(252,212,0,0.12)', top:30,  right:50  },
  headerRow:  { flexDirection:'row', justifyContent:'space-between', alignItems:'flex-start', marginBottom:20 },
  heroSub:    { fontSize:11, color:'rgba(255,255,255,0.45)', fontFamily:'Inter_600SemiBold', letterSpacing:1.5, textTransform:'uppercase', marginBottom:5 },
  heroTitle:  { fontFamily:'Outfit_900Black', fontSize:30, color:'#FFFFFF', lineHeight:34 },
  langPill:   { backgroundColor:'rgba(255,255,255,0.12)', borderWidth:1, borderColor:'rgba(255,255,255,0.2)', borderRadius:20, paddingVertical:7, paddingHorizontal:15 },
  langTxt:    { fontSize:12, fontFamily:'Inter_600SemiBold', color:'#FFFFFF' },
  statsRow:   { flexDirection:'row', gap:8 },
  chip:       { flex:1, backgroundColor:'rgba(255,255,255,0.08)', borderWidth:1, borderColor:'rgba(255,255,255,0.12)', borderRadius:16, paddingVertical:10, alignItems:'center' },
  chipNum:    { fontFamily:'Outfit_900Black', fontSize:22, color:'#FFFFFF' },
  chipLbl:    { fontSize:10, color:'rgba(255,255,255,0.5)', fontFamily:'Inter_600SemiBold', marginTop:2, letterSpacing:0.5, textTransform:'uppercase' },

  // Calendar card
  calCard:    { marginHorizontal:14, marginTop:-8, borderRadius:28, elevation:8, shadowOpacity:0.12, shadowRadius:20, shadowOffset:{width:0,height:6}, overflow:'hidden' },

  // List
  listSection:{ paddingHorizontal:16, paddingTop:22 },
  listHd:     { flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom:16 },
  listDate:   { fontFamily:'Outfit_700Bold', fontSize:16 },
  listCount:  { fontFamily:'Inter_400Regular', fontSize:12, color:'#64748B', marginTop:2 },
  addBtn:     { flexDirection:'row', alignItems:'center', gap:5, borderRadius:14, paddingHorizontal:14, paddingVertical:9 },
  addBtnTxt:  { fontFamily:'Outfit_700Bold', fontSize:13 },

  // Session card
  sessionCard:  { borderRadius:22, marginBottom:12, overflow:'hidden', elevation:3, shadowOpacity:0.07, shadowRadius:10, shadowOffset:{width:0,height:3} },
  accentBar:    { height:3 },
  sessionInner: { flexDirection:'row', alignItems:'center', padding:16 },
  avatar:       { width:42, height:42, borderRadius:14, alignItems:'center', justifyContent:'center', marginRight:12 },
  avatarTxt:    { fontFamily:'Outfit_700Bold', fontSize:14 },
  timeCol:      { width:62, alignItems:'center' },
  sessionTime:  { fontFamily:'Outfit_900Black', fontSize:14 },
  sessionDur:   { fontFamily:'Inter_600SemiBold', fontSize:10, color:'#94A3B8', marginTop:2 },
  vDivider:     { width:1, height:44, marginHorizontal:14 },
  infoCol:      { flex:1 },
  studentName:  { fontFamily:'Outfit_700Bold', fontSize:15, marginBottom:6 },
  badgeRow:     { flexDirection:'row', gap:6 },
  badge:        { paddingHorizontal:8, paddingVertical:3, borderRadius:8 },
  badgeTxt:     { fontSize:10, fontFamily:'Inter_600SemiBold', letterSpacing:0.3 },

  // Empty
  emptyBox:     { alignItems:'center', paddingVertical:48 },
  emptyIconWrap:{ width:68, height:68, borderRadius:22, backgroundColor:'#F8FAFC', alignItems:'center', justifyContent:'center', marginBottom:16, elevation:2 },
  emptyTitle:   { fontFamily:'Outfit_700Bold', fontSize:17, marginBottom:6 },
  emptySub:     { fontFamily:'Inter_400Regular', fontSize:13, color:'#94A3B8', textAlign:'center', lineHeight:20, paddingHorizontal:30, marginBottom:20 },
  emptyCta:     { paddingHorizontal:24, paddingVertical:12, borderRadius:16 },
  emptyCtaTxt:  { fontFamily:'Outfit_700Bold', fontSize:14, color:'#FFFFFF' },

  // FAB
  fab:      { position:'absolute', bottom:28, right:20, borderRadius:27, elevation:12, shadowOffset:{width:0,height:6}, shadowOpacity:0.4, shadowRadius:14 },
  fabGrad:  { width:54, height:54, borderRadius:27, alignItems:'center', justifyContent:'center' },
});
