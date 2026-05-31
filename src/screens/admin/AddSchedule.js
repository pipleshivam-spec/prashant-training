import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  TextInput, Alert, ActivityIndicator, StatusBar
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { LinearGradient } from 'expo-linear-gradient';
import { getActiveStudents, addSchedule } from '../../lib/supabase';
import { useAppTheme } from '../../context/ThemeContext';

const FONTS = {
  black: 'Outfit_900Black', bold: 'Outfit_700Bold',
  body: 'Inter_400Regular', bodySemi: 'Inter_600SemiBold',
};

const DURATIONS  = ['30 min', '1 hour', '1.5 hours', '2 hours'];
const TIME_SLOTS = [
  '07:00 AM', '08:00 AM', '09:00 AM', '10:00 AM', '11:00 AM',
  '12:00 PM', '01:00 PM', '02:00 PM', '03:00 PM', '04:00 PM',
  '05:00 PM', '06:00 PM', '07:00 PM',
];

const AVATAR_COLORS = [
  { bg: '#EEEDFE', tx: '#534AB7' },
  { bg: '#EAF3DE', tx: '#3B6D11' },
  { bg: '#FAEEDA', tx: '#854F0B' },
  { bg: '#E6F1FB', tx: '#185FA5' },
];

export default function AddSchedule() {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const navigation = useNavigation();

  const [loading,         setLoading]         = useState(false);
  const [students,        setStudents]        = useState([]);
  const [fetching,        setFetching]        = useState(true);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [sessionDate,     setSessionDate]     = useState(new Date().toISOString().split('T')[0]);
  const [sessionTime,     setSessionTime]     = useState('09:00 AM');
  const [duration,        setDuration]        = useState('1 hour');
  const [licenseType,     setLicenseType]     = useState('');
  const [showStudents,    setShowStudents]    = useState(false);
  const [showTime,        setShowTime]        = useState(false);
  const [showDuration,    setShowDuration]    = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await getActiveStudents();
      if (data) setStudents(data);
      setFetching(false);
    })();
  }, []);

  const handleSelectStudent = (student) => {
    setSelectedStudent(student);
    setLicenseType(student.license_type || 'LMV');
    setShowStudents(false);
  };

  const handleSave = async () => {
    if (!selectedStudent || !sessionDate || !sessionTime) {
      Alert.alert('Required', 'Please fill all required fields.');
      return;
    }
    setLoading(true);
    const { error } = await addSchedule({
      student_id: selectedStudent.id,
      session_date: sessionDate,
      session_time: sessionTime,
      duration,
      license_type: licenseType,
      status: 'Scheduled',
    });
    setLoading(false);
    if (error) Alert.alert('Error', error.message);
    else {
      Alert.alert('Success', 'Schedule added ✅');
      navigation.goBack();
    }
  };

  const FieldLabel = ({ icon, label, required }) => (
    <View style={f.labelRow}>
      <Ionicons name={icon} size={15} color={colors.primary} />
      <Text style={[f.label, { color: colors.primary }]}>
        {label}{required && <Text style={{ color: '#EF4444' }}> *</Text>}
      </Text>
    </View>
  );

  const PickerRow = ({ value, placeholder, open, onToggle, children }) => (
    <View>
      <TouchableOpacity
        style={[f.field, open && { borderColor: colors.primary, borderWidth: 1.5, backgroundColor: colors.bg }]}
        onPress={onToggle}
        activeOpacity={0.8}
      >
        <Text style={[f.fieldTxt, !value && { color: '#94A3B8' }]}>
          {value || placeholder}
        </Text>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={18} color={colors.primary} />
      </TouchableOpacity>
      {open && <View style={[f.dropdown, { shadowColor: colors.primary }]}>{children}</View>}
    </View>
  );

  if (fetching) return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bg }}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  );

  return (
    <SafeAreaView style={[f.root, { backgroundColor: colors.bg }]}>
      <StatusBar barStyle="light-content" />

      <LinearGradient colors={[colors.primaryDark, colors.primary]} style={f.header}>
        <View style={f.ring1} pointerEvents="none" />
        <TouchableOpacity style={f.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={colors.white} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={f.headerSub}>Management</Text>
          <Text style={f.headerTitle}>Add Session</Text>
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={f.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

        {/* Progress */}
        <View style={[f.progressRow, { backgroundColor: colors.white, shadowColor: colors.primary }]}>
          {['Student', 'Date & Time', 'Details'].map((step, i) => (
            <View key={i} style={f.progressItem}>
              <View style={[f.progressDot, i === 0 && { backgroundColor: colors.primary }]}>
                <Text style={[f.progressNum, i === 0 && { color: '#fff' }]}>{i + 1}</Text>
              </View>
              <Text style={[f.progressLbl, i === 0 && { color: colors.primary }]}>{step}</Text>
            </View>
          ))}
        </View>

        {/* Form card */}
        <View style={[f.card, { backgroundColor: colors.white, shadowColor: colors.primary }]}>

          {/* Student */}
          <View style={f.sectionHeader}>
            <View style={[f.sectionIcon, { backgroundColor: '#EEEDFE' }]}>
              <Ionicons name="person" size={16} color="#534AB7" />
            </View>
            <Text style={[f.sectionTitle, { color: colors.text }]}>Select Student</Text>
          </View>

          <FieldLabel icon="people-outline" label="Student" required />
          <PickerRow
            value={selectedStudent ? `${selectedStudent.name} — ${licenseType}` : ''}
            placeholder="Choose a student..."
            open={showStudents}
            onToggle={() => { setShowStudents(!showStudents); setShowTime(false); setShowDuration(false); }}
          >
            {students.map((stu, i) => {
              const av = AVATAR_COLORS[i % AVATAR_COLORS.length];
              return (
                <TouchableOpacity key={stu.id} style={f.dropItem} onPress={() => handleSelectStudent(stu)}>
                  <View style={[f.dropAvatar, { backgroundColor: av.bg }]}>
                    <Text style={[f.dropAvatarTxt, { color: av.tx }]}>
                      {stu.name?.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[f.dropName, { color: colors.text }]}>{stu.name}</Text>
                    <Text style={f.dropSub}>{stu.license_type || 'LMV'}</Text>
                  </View>
                  {selectedStudent?.id === stu.id &&
                    <Ionicons name="checkmark-circle" size={18} color={colors.primary} />}
                </TouchableOpacity>
              );
            })}
          </PickerRow>

          <View style={f.divider} />

          {/* Date & Time */}
          <View style={f.sectionHeader}>
            <View style={[f.sectionIcon, { backgroundColor: '#FAEEDA' }]}>
              <Ionicons name="calendar" size={16} color="#854F0B" />
            </View>
            <Text style={[f.sectionTitle, { color: colors.text }]}>Date & Time</Text>
          </View>

          <FieldLabel icon="calendar-outline" label="Date (YYYY-MM-DD)" required />
          <View style={f.field}>
            <Ionicons name="calendar-outline" size={18} color={colors.primary} style={{ marginRight: 10 }} />
            <TextInput
              style={[f.textInput, { color: colors.text }]}
              value={sessionDate}
              onChangeText={setSessionDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor="#94A3B8"
            />
          </View>

          <FieldLabel icon="time-outline" label="Session Time" required />
          <PickerRow
            value={sessionTime}
            placeholder="Select time..."
            open={showTime}
            onToggle={() => { setShowTime(!showTime); setShowStudents(false); setShowDuration(false); }}
          >
            {TIME_SLOTS.map(ts => (
              <TouchableOpacity key={ts} style={f.dropItem} onPress={() => { setSessionTime(ts); setShowTime(false); }}>
                <Ionicons name="time-outline" size={16} color={colors.primary} style={{ marginRight: 10 }} />
                <Text style={[f.dropName, { color: colors.text }]}>{ts}</Text>
                {sessionTime === ts && <Ionicons name="checkmark-circle" size={16} color={colors.primary} />}
              </TouchableOpacity>
            ))}
          </PickerRow>

          <View style={f.divider} />

          {/* Details */}
          <View style={f.sectionHeader}>
            <View style={[f.sectionIcon, { backgroundColor: '#EAF3DE' }]}>
              <Ionicons name="options" size={16} color="#3B6D11" />
            </View>
            <Text style={[f.sectionTitle, { color: colors.text }]}>Session Details</Text>
          </View>

          <FieldLabel icon="hourglass-outline" label="Duration" />
          <PickerRow
            value={duration}
            placeholder="Select duration..."
            open={showDuration}
            onToggle={() => { setShowDuration(!showDuration); setShowStudents(false); setShowTime(false); }}
          >
            {DURATIONS.map(d => (
              <TouchableOpacity key={d} style={f.dropItem} onPress={() => { setDuration(d); setShowDuration(false); }}>
                <Ionicons name="hourglass-outline" size={16} color={colors.primary} style={{ marginRight: 10 }} />
                <Text style={[f.dropName, { color: colors.text }]}>{d}</Text>
                {duration === d && <Ionicons name="checkmark-circle" size={16} color={colors.primary} />}
              </TouchableOpacity>
            ))}
          </PickerRow>

          <FieldLabel icon="ribbon-outline" label="License Type (auto-filled)" />
          <View style={f.field}>
            <Ionicons name="ribbon-outline" size={18} color={colors.primary} style={{ marginRight: 10 }} />
            <TextInput
              style={[f.textInput, { color: colors.text }]}
              value={licenseType}
              onChangeText={setLicenseType}
              placeholder="e.g. LMV"
              placeholderTextColor="#94A3B8"
            />
          </View>

        </View>

        {/* Save */}
        <TouchableOpacity
          style={[f.saveWrap, { shadowColor: colors.accent }]}
          onPress={handleSave}
          disabled={loading}
          activeOpacity={0.85}
        >
          <LinearGradient colors={[colors.accent, colors.accent]} style={f.saveBtn}>
            {loading
              ? <ActivityIndicator color={colors.primaryDark} />
              : <>
                  <Ionicons name="checkmark-circle-outline" size={22} color={colors.primaryDark} />
                  <Text style={[f.saveTxt, { color: colors.primaryDark }]}>Save Schedule</Text>
                </>
            }
          </LinearGradient>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

const f = StyleSheet.create({
  root:        { flex: 1 },
  header:      { paddingTop: 16, paddingBottom: 24, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', gap: 14, position: 'relative', overflow: 'hidden' },
  ring1:       { position: 'absolute', width: 200, height: 200, borderRadius: 100, borderWidth: 1, borderColor: 'rgba(252,212,0,0.08)', top: -80, right: -50 },
  backBtn:     { width: 40, height: 40, borderRadius: 13, backgroundColor: 'rgba(255,255,255,0.12)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  headerSub:   { fontSize: 11, color: 'rgba(255,255,255,0.45)', fontFamily: 'Inter_600SemiBold', letterSpacing: 1.5, textTransform: 'uppercase' },
  headerTitle: { fontFamily: 'Outfit_900Black', fontSize: 24, color: '#FFFFFF', marginTop: 2 },
  scroll:      { padding: 16, paddingBottom: 60 },

  progressRow:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderRadius: 20, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: '#EEF2F8', elevation: 3, shadowOpacity: 0.07, shadowRadius: 12, shadowOffset: { width: 0, height: 4 } },
  progressItem: { alignItems: 'center', gap: 4, flex: 1 },
  progressDot:  { width: 28, height: 28, borderRadius: 14, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' },
  progressNum:  { fontSize: 12, fontFamily: 'Outfit_700Bold', color: '#94A3B8' },
  progressLbl:  { fontSize: 10, color: '#94A3B8', fontFamily: 'Inter_600SemiBold', textTransform: 'uppercase', letterSpacing: 0.5 },

  card:          { borderRadius: 24, padding: 20, marginBottom: 14, borderWidth: 1, borderColor: '#EEF2F8', elevation: 3, shadowOpacity: 0.07, shadowRadius: 12, shadowOffset: { width: 0, height: 4 } },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  sectionIcon:   { width: 30, height: 30, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  sectionTitle:  { fontFamily: 'Outfit_700Bold', fontSize: 15 },
  divider:       { height: 1, backgroundColor: '#F1F5F9', marginVertical: 18 },

  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8, marginTop: 12 },
  label:    { fontFamily: 'Inter_600SemiBold', fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.8 },

  field:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#F8FAFC', borderRadius: 16, borderWidth: 1, borderColor: '#E2E8F0', paddingHorizontal: 16, height: 52 },
  fieldTxt:  { fontFamily: 'Outfit_700Bold', fontSize: 14, flex: 1 },
  textInput: { flex: 1, fontFamily: 'Outfit_700Bold', fontSize: 14 },

  dropdown:     { backgroundColor: '#fff', borderRadius: 16, marginTop: 6, borderWidth: 1, borderColor: '#E2E8F0', overflow: 'hidden', elevation: 6, shadowOpacity: 0.08, shadowRadius: 12, shadowOffset: { width: 0, height: 4 } },
  dropItem:     { flexDirection: 'row', alignItems: 'center', paddingVertical: 13, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: '#F8FAFC' },
  dropAvatar:   { width: 34, height: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  dropAvatarTxt:{ fontFamily: 'Outfit_700Bold', fontSize: 13 },
  dropName:     { fontFamily: 'Outfit_700Bold', fontSize: 14, flex: 1 },
  dropSub:      { fontFamily: 'Inter_400Regular', fontSize: 11, color: '#94A3B8', marginTop: 2 },

  saveWrap: { borderRadius: 20, overflow: 'hidden', elevation: 10, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 12 },
  saveBtn:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 58, gap: 10 },
  saveTxt:  { fontFamily: 'Outfit_900Black', fontSize: 16, letterSpacing: 0.5 },
});
