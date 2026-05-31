import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Switch, Alert, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { signOut } from '../../lib/supabase';
import { useAppTheme } from '../../context/ThemeContext';

const FONTS = { black: 'Outfit_900Black', bold: 'Outfit_700Bold', semi: 'Outfit_600SemiBold', body: 'Inter_400Regular', bodySemi: 'Inter_600SemiBold' };

function getInitials(name = '') {
  return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
}

export default function Profile() {
  const { colors } = useAppTheme();
  const navigation = useNavigation();
  const { t, i18n } = useTranslation();
  const [student, setStudent] = useState(null);
  
  useFocusEffect(useCallback(() => {
    const load = async () => {
      const data = await AsyncStorage.getItem('studentData');
      if (data) setStudent(JSON.parse(data));
    };
    load();
  }, []));

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to exit?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: async () => {
        await signOut();
        navigation.reset({ index: 0, routes: [{ name: 'LoginScreen' }] });
      }}
    ]);
  };

  const toggleLanguage = () => {
    const nextLang = i18n.language === 'en' ? 'gu' : 'en';
    i18n.changeLanguage(nextLang);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <LinearGradient colors={[colors.primaryDark, colors.primary]} style={styles.header}>
        <SafeAreaView edges={['top']}>
          <Text style={styles.headerTitle}>My Profile</Text>
        </SafeAreaView>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.card, { backgroundColor: colors.white }]}>
          <View style={[styles.avatarWrap, { borderColor: colors.primary + '30' }]}>
            {student?.avatar_url ? (
              <Image source={{ uri: student.avatar_url }} style={styles.avatarImg} />
            ) : (
              <Text style={[styles.avatarTxt, { color: colors.primary }]}>{getInitials(student?.name)}</Text>
            )}
          </View>
          <Text style={[styles.name, { color: colors.text }]}>{student?.name || 'Student'}</Text>
          <Text style={styles.phone}>{student?.phone || 'No phone added'}</Text>
          
          <TouchableOpacity style={[styles.editBtn, { backgroundColor: colors.primary + '15' }]} onPress={() => navigation.navigate('ProfileSetup', { studentData: student })}>
            <Text style={[styles.editBtnTxt, { color: colors.primary }]}>Edit Profile</Text>
          </TouchableOpacity>
        </View>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>Preferences</Text>
        
        <View style={[styles.settingsCard, { backgroundColor: colors.white }]}>
          <View style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <View style={[styles.iconBox, { backgroundColor: '#EEF2FF' }]}><Ionicons name="language" size={20} color="#4F46E5" /></View>
              <Text style={[styles.settingTxt, { color: colors.text }]}>Gujarati Language</Text>
            </View>
            <Switch 
              value={i18n.language === 'gu'} 
              onValueChange={toggleLanguage}
              trackColor={{ false: '#CBD5E1', true: colors.primary }}
              thumbColor={'#FFFFFF'}
            />
          </View>
          
          <View style={styles.divider} />
          
          <TouchableOpacity style={styles.settingRow} onPress={() => navigation.navigate('Announcements')}>
            <View style={styles.settingLeft}>
              <View style={[styles.iconBox, { backgroundColor: '#FEF3C7' }]}><Ionicons name="notifications" size={20} color="#F59E0B" /></View>
              <Text style={[styles.settingTxt, { color: colors.text }]}>Announcements</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#94A3B8" />
          </TouchableOpacity>
          
          <View style={styles.divider} />
          
          <TouchableOpacity style={styles.settingRow} onPress={handleLogout}>
            <View style={styles.settingLeft}>
              <View style={[styles.iconBox, { backgroundColor: '#FEE2E2' }]}><Ionicons name="log-out" size={20} color="#EF4444" /></View>
              <Text style={[styles.settingTxt, { color: '#EF4444' }]}>Logout</Text>
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingBottom: 30, borderBottomLeftRadius: 30, borderBottomRightRadius: 30, alignItems: 'center' },
  headerTitle: { fontSize: 24, fontFamily: FONTS.black, color: '#FFFFFF', marginTop: 10 },
  content: { padding: 20 },
  card: { alignItems: 'center', padding: 30, borderRadius: 24, marginTop: -40, elevation: 5, shadowColor: '#000', shadowOffset: {width:0, height:4}, shadowOpacity: 0.1, shadowRadius: 10, marginBottom: 25 },
  name: { fontSize: 22, fontFamily: FONTS.bold, marginTop: 10 },
  phone: { fontSize: 14, fontFamily: FONTS.body, color: '#64748B', marginTop: 4 },
  editBtn: { marginTop: 20, paddingHorizontal: 24, paddingVertical: 10, borderRadius: 12 },
  editBtnTxt: { fontSize: 14, fontFamily: FONTS.bold },
  sectionTitle: { fontSize: 18, fontFamily: FONTS.bold, marginBottom: 15, marginLeft: 5 },
  settingsCard: { borderRadius: 24, padding: 10, elevation: 3, shadowColor: '#000', shadowOffset: {width:0, height:2}, shadowOpacity: 0.05, shadowRadius: 8 },
  settingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 15 },
  settingLeft: { flexDirection: 'row', alignItems: 'center' },
  iconBox: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 15 },
  settingTxt: { fontSize: 15, fontFamily: FONTS.semi },
  divider: { height: 1, backgroundColor: '#F1F5F9', marginHorizontal: 15 },
  avatarWrap: { width: 84, height: 84, borderRadius: 42, borderWidth: 3, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F8FAFC', overflow: 'hidden' },
  avatarImg: { width: '100%', height: '100%' },
  avatarTxt: { fontSize: 28, fontFamily: FONTS.bold }
});
