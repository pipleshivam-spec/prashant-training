import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getStudentNotifications } from '../../lib/supabase';
import { useAppTheme } from '../../context/ThemeContext';

const FONTS = { black: 'Outfit_900Black', bold: 'Outfit_700Bold', semi: 'Outfit_600SemiBold', body: 'Inter_400Regular', bodySemi: 'Inter_600SemiBold' };

export default function Announcements() {
  const { colors } = useAppTheme();
  const [loading, setLoading] = useState(true);
  const [notices, setNotices] = useState([]);

  useEffect(() => {
    const fetch = async () => {
      const str = await AsyncStorage.getItem('studentData');
      if (str) {
        const student = JSON.parse(str);
        const { data } = await getStudentNotifications(student.id);
        if (data) setNotices(data);
      }
      setLoading(false);
    };
    fetch();
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <LinearGradient colors={[colors.primaryDark, colors.primary]} style={styles.header}>
        <SafeAreaView edges={['top']}>
          <View style={{ paddingHorizontal: 25, paddingTop: 20, paddingBottom: 10 }}>
            <Text style={{ fontSize: 26, fontFamily: FONTS.black, color: '#FFFFFF' }}>Notice Board</Text>
          </View>
        </SafeAreaView>
      </LinearGradient>

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>
      ) : (
        <FlatList
          data={notices}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="notifications-off-outline" size={50} color="#CBD5E1" />
              <Text style={styles.emptyTxt}>No announcements yet.</Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={[styles.card, { backgroundColor: colors.white }]}>
              <View style={[styles.iconWrap, { backgroundColor: item.student_id ? '#EEF2FF' : '#FEF3C7' }]}>
                <Ionicons name={item.student_id ? "person" : "megaphone"} size={20} color={item.student_id ? "#4F46E5" : "#F59E0B"} />
              </View>
              <View style={styles.info}>
                <Text style={[styles.msg, { color: colors.text }]}>{item.message}</Text>
                <Text style={styles.time}>{new Date(item.sent_at).toLocaleString()}</Text>
              </View>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingBottom: 30, borderBottomLeftRadius: 30, borderBottomRightRadius: 30 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { padding: 20, paddingTop: 10 },
  card: { flexDirection: 'row', padding: 18, borderRadius: 20, marginBottom: 15, elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8 },
  iconWrap: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 15 },
  info: { flex: 1 },
  msg: { fontSize: 14, fontFamily: FONTS.semi, lineHeight: 20 },
  time: { fontSize: 11, fontFamily: FONTS.bodySemi, color: '#94A3B8', marginTop: 8 },
  empty: { alignItems: 'center', marginTop: 50 },
  emptyTxt: { fontSize: 14, fontFamily: FONTS.bodySemi, color: '#94A3B8', marginTop: 10 }
});
