import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, StatusBar, KeyboardAvoidingView, Platform, Image,
} from 'react-native';
import { TextInput, ActivityIndicator, Snackbar, Button, Switch } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { addStudent, updateStudent } from '../../lib/supabase';
import { LinearGradient } from 'expo-linear-gradient';
import { useAppTheme } from '../../context/ThemeContext';

const FONTS = {
  bold: 'Outfit_700Bold',
  medium: 'Outfit_600SemiBold',
  regular: 'Inter_400Regular',
};

export default function AddStudent() {
  const { colors } = useAppTheme();
  const navigation = useNavigation();
  const route = useRoute();
  const editStudent = route.params?.student || null;
  const isEdit = !!editStudent;

  const [form, setForm] = useState({
    name:           editStudent?.name           || '',
    phone:          editStudent?.phone          || '',
    address:        editStudent?.address        || '',
    license_type:   editStudent?.license_type   || 'LMV',
    email:          editStudent?.email          || '',
    status:         editStudent?.status         || 'active',
    gender:         editStudent?.gender         || 'Male',
    total_days:     editStudent?.total_days     || 20,
    preferred_time: editStudent?.preferred_time || '08:00 AM',
  });

  const [loading,         setLoading]         = useState(false);
  const [snackbarVisible, setSnackbarVisible] = useState(false);

  const handleSave = async () => {
    if (!form.name || !form.phone) {
      Alert.alert('Error', 'Name and Phone are required');
      return;
    }
    setLoading(true);
    const { error } = isEdit
      ? await updateStudent(editStudent.id, form)
      : await addStudent(form);
    setLoading(false);
    if (!error) {
      setSnackbarVisible(true);
      setTimeout(() => navigation.goBack(), 1500);
    } else {
      Alert.alert('Error', error.message);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <LinearGradient colors={[colors.primary, colors.primaryDark]} style={styles.header}>
        <SafeAreaView edges={['top']}>
          <View style={styles.headerNav}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
              <Ionicons name="chevron-back" size={24} color={colors.white} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>{isEdit ? 'Edit Student' : 'Enroll Student'}</Text>
            <View style={{ width: 44 }} />
          </View>

          <View style={styles.miniProfile}>
            <View style={[styles.miniAvatar, { backgroundColor: colors.accent }]}>
              {editStudent?.avatar_url ? (
                <Image source={{ uri: editStudent.avatar_url }} style={styles.avatarImg} />
              ) : (
                <Text style={[styles.miniAvatarTxt, { color: colors.primary }]}>
                  {form.name ? form.name.charAt(0).toUpperCase() : '?'}
                </Text>
              )}
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.miniName} numberOfLines={1}>{form.name || 'Trainee Name'}</Text>
              <Text style={styles.miniSub}>{form.license_type} • {form.phone || 'Contact'}</Text>
            </View>
          </View>
        </SafeAreaView>
      </LinearGradient>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : null} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

          {/* Basic Info */}
          <View style={[styles.section, { backgroundColor: colors.white }]}>
            <Text style={styles.sectionTitle}>Basic Information</Text>

            <View style={styles.inputField}>
              <Text style={[styles.label, { color: colors.text }]}>Full Name</Text>
              <TextInput
                value={form.name}
                onChangeText={v => setForm({ ...form, name: v })}
                mode="outlined"
                dense
                textColor={colors.text}
                outlineColor="#E2E8F0"
                activeOutlineColor={colors.primary}
                style={[styles.textInput, { backgroundColor: colors.white }]}
                placeholder="Full name"
              />
            </View>

            <View style={styles.row}>
              <View style={[styles.inputField, { flex: 1, marginRight: 8 }]}>
                <Text style={[styles.label, { color: colors.text }]}>Phone Number</Text>
                <TextInput
                  value={form.phone}
                  onChangeText={v => setForm({ ...form, phone: v })}
                  mode="outlined"
                  dense
                  keyboardType="numeric"
                  maxLength={10}
                  textColor={colors.text}
                  outlineColor="#E2E8F0"
                  activeOutlineColor={colors.primary}
                  style={[styles.textInput, { backgroundColor: colors.white }]}
                />
              </View>
              <View style={[styles.inputField, { flex: 1, marginLeft: 8 }]}>
                <Text style={[styles.label, { color: colors.text }]}>Preferred Time</Text>
                <TouchableOpacity
                  style={[styles.mockSelect, { borderColor: '#E2E8F0' }]}
                  onPress={() => {
                    const times = ['08:00 AM', '10:00 AM', '04:00 PM', '06:00 PM'];
                    const idx = times.indexOf(form.preferred_time);
                    setForm({ ...form, preferred_time: times[(idx + 1) % times.length] });
                  }}
                >
                  <Text style={[styles.mockSelectTxt, { color: colors.text }]}>{form.preferred_time}</Text>
                  <Ionicons name="time-outline" size={16} color={colors.primary} />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.inputField}>
              <Text style={[styles.label, { color: colors.text }]}>Email (Optional)</Text>
              <TextInput
                value={form.email}
                onChangeText={v => setForm({ ...form, email: v })}
                mode="outlined"
                dense
                autoCapitalize="none"
                keyboardType="email-address"
                textColor={colors.text}
                outlineColor="#E2E8F0"
                activeOutlineColor={colors.primary}
                style={[styles.textInput, { backgroundColor: colors.white }]}
              />
            </View>
          </View>

          {/* Course Details */}
          <View style={[styles.section, { backgroundColor: colors.white }]}>
            <Text style={styles.sectionTitle}>Course Details</Text>

            <Text style={[styles.label, { color: colors.text }]}>License Type</Text>
            <View style={styles.choiceRow}>
              {['LMV', 'MCWG', 'LMV + MCWG'].map(lt => (
                <TouchableOpacity
                  key={lt}
                  style={[
                    styles.choiceBtn,
                    { borderColor: '#E2E8F0' },
                    form.license_type === lt && { backgroundColor: colors.primary, borderColor: colors.primary },
                  ]}
                  onPress={() => setForm({ ...form, license_type: lt })}
                >
                  <Text style={[
                    styles.choiceTxt,
                    { color: colors.text },
                    form.license_type === lt && { color: colors.white },
                  ]}>{lt}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.label, { color: colors.text }]}>Gender</Text>
                <TouchableOpacity
                  style={[styles.mockSelect, { borderColor: '#E2E8F0' }]}
                  onPress={() => {
                    const gs = ['Male', 'Female', 'Other'];
                    const idx = gs.indexOf(form.gender);
                    setForm({ ...form, gender: gs[(idx + 1) % gs.length] });
                  }}
                >
                  <Text style={[styles.mockSelectTxt, { color: colors.text }]}>{form.gender}</Text>
                  <Ionicons name="person-outline" size={16} color={colors.primary} />
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Preferences */}
          <View style={[styles.section, { backgroundColor: colors.white }]}>
            <Text style={styles.sectionTitle}>Preferences</Text>
            <View style={styles.toggleItem}>
              <View>
                <Text style={[styles.toggleMain, { color: colors.text }]}>Enable Login</Text>
                <Text style={styles.toggleSub}>Allow app access for this student</Text>
              </View>
              <Switch
                value={form.status === 'active'}
                onValueChange={v => setForm({ ...form, status: v ? 'active' : 'inactive' })}
                color={colors.primary}
              />
            </View>
          </View>

          <View style={{ height: 100 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Footer */}
      <View style={[styles.footer, { backgroundColor: colors.white, borderTopColor: '#E2E8F0' }]}>
        <Button
          mode="contained"
          onPress={handleSave}
          loading={loading}
          style={styles.saveAction}
          labelStyle={styles.saveActionLabel}
          buttonColor={colors.primary}
        >
          {isEdit ? 'Save Changes' : 'Confirm Enrollment'}
        </Button>
      </View>

      <Snackbar
        visible={snackbarVisible}
        onDismiss={() => setSnackbarVisible(false)}
        style={{ backgroundColor: '#10B981' }}
      >
        Operation Successful
      </Snackbar>
    </View>
  );
}

const styles = StyleSheet.create({
  container:   { flex: 1 },
  header:      { paddingBottom: 25, borderBottomLeftRadius: 30, borderBottomRightRadius: 30 },
  headerNav:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 15 },
  iconBtn:     { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontFamily: FONTS.bold, color: '#FFFFFF' },
  miniProfile: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginHorizontal: 25, marginTop: 15,
    padding: 12, borderRadius: 20,
  },
  miniAvatar:    { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  avatarImg:     { width: '100%', height: '100%' },
  miniAvatarTxt: { fontSize: 20, fontFamily: FONTS.bold },
  miniName:      { fontSize: 16, fontFamily: FONTS.bold, color: '#FFFFFF' },
  miniSub:       { fontSize: 11, color: 'rgba(255,255,255,0.6)', marginTop: 2 },
  scroll:        { padding: 25 },
  section:       { borderRadius: 24, padding: 20, marginBottom: 20, elevation: 1 },
  sectionTitle:  { fontSize: 12, fontFamily: FONTS.bold, color: '#64748B', textTransform: 'uppercase', marginBottom: 15, letterSpacing: 0.5 },
  inputField:    { marginBottom: 15 },
  label:         { fontSize: 13, fontFamily: FONTS.medium, marginBottom: 6, marginLeft: 2 },
  textInput:     { fontSize: 14, height: 44 },
  row:           { flexDirection: 'row', alignItems: 'center' },
  mockSelect:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: 44, borderRadius: 8, borderWidth: 1, paddingHorizontal: 12, backgroundColor: '#F8FAFC' },
  mockSelectTxt: { fontSize: 14, fontFamily: FONTS.regular },
  choiceRow:     { flexDirection: 'row', gap: 10, marginBottom: 15, flexWrap: 'wrap' },
  choiceBtn:     { flex: 1, height: 40, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F8FAFC', minWidth: 60 },
  choiceTxt:     { fontSize: 13, fontFamily: FONTS.bold },
  toggleItem:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  toggleMain:    { fontSize: 15, fontFamily: FONTS.medium },
  toggleSub:     { fontSize: 11, color: '#64748B', marginTop: 2 },
  footer:        { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 25, paddingVertical: 15, borderTopWidth: 1 },
  saveAction:    { borderRadius: 12, elevation: 0 },
  saveActionLabel: { fontSize: 15, fontFamily: FONTS.bold, paddingVertical: 4 },
});
