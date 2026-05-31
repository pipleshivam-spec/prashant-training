import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  StatusBar,
  Dimensions,
  Linking,
  ScrollView,
  Image,
} from 'react-native';
import { Searchbar, ActivityIndicator, IconButton, FAB } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { getStudents } from '../../lib/supabase';
import { LinearGradient } from 'expo-linear-gradient';
import { useAppTheme } from '../../context/ThemeContext';

const { width } = Dimensions.get('window');

const FONTS = {
  bold: 'Outfit_700Bold',
  medium: 'Outfit_600SemiBold',
  regular: 'Inter_400Regular',
};

const StudentCard = ({ student, onPress, navigation, colors }) => {
  const initials = student.name ? student.name.charAt(0).toUpperCase() : '?';
  const progress = (student.completed_days || 8) / (student.total_days || 20);

  const handleCall = () => Linking.openURL(`tel:${student.phone}`);
  const handleWA = () => navigation.navigate('Notifications', { student });

  return (
    <TouchableOpacity activeOpacity={0.7} onPress={onPress} style={[styles.card, { backgroundColor: colors.white }]}>
      <View style={styles.cardTop}>
        <View style={styles.avatarWrap}>
          <View style={styles.avatar}>
            {student.avatar_url ? (
              <Image source={{ uri: student.avatar_url }} style={styles.avatarImg} />
            ) : (
              <LinearGradient colors={[colors.primary, colors.primaryDark]} style={styles.avatarFull}>
                <Text style={styles.avatarTxt}>{initials}</Text>
              </LinearGradient>
            )}
          </View>
          {student.status === 'active' && <View style={[styles.activeDot, { backgroundColor: '#10B981', borderColor: colors.white }]} />}
        </View>
        
        <View style={styles.infoCol}>
          <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>{student.name}</Text>
          <Text style={styles.sub}>{student.license_type} • {student.preferred_time || '08:00 AM'}</Text>
        </View>

        <View style={styles.actionRow}>
          <TouchableOpacity onPress={handleCall} style={styles.smallAction}>
            <Ionicons name="call-outline" size={18} color={colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleWA} style={[styles.smallAction, { marginLeft: 8 }]}>
            <Ionicons name="logo-whatsapp" size={18} color={'#10B981'} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate('StudentReport', { studentId: student.id })} style={[styles.smallAction, { marginLeft: 8 }]}>
            <Ionicons name="bar-chart-outline" size={18} color={'#534AB7'} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.cardBottom}>
        <View style={styles.progressRow}>
          <Text style={styles.progressLabel}>Training Day {student.completed_days || 8} of {student.total_days || 20}</Text>
          <Text style={[styles.progressPercent, { color: colors.primary }]}>{Math.round(progress * 100)}%</Text>
        </View>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${progress * 100}%`, backgroundColor: colors.primary }]} />
        </View>
      </View>
    </TouchableOpacity>
  );
};

const StatItem = ({ label, value, icon, dark, accent, colors }) => (
  <View style={[styles.statBox, { backgroundColor: colors.white }, dark && { backgroundColor: colors.primary }]}>
    <View style={styles.statTop}>
      <Ionicons name={icon} size={14} color={dark ? colors.accent : colors.primary} />
      <Text style={[styles.statVal, { color: colors.primary }, dark && { color: colors.white }, accent && { color: colors.accent }]}>{value}</Text>
    </View>
    <Text style={[styles.statLbl, dark && { color: 'rgba(255,255,255,0.6)' }]}>{label}</Text>
  </View>
);

export default function StudentList() {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const navigation = useNavigation();
  const [students, setStudents] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    const { data, error } = await getStudents();
    if (!error) setStudents(data || []);
    setLoading(false);
  };

  useFocusEffect(useCallback(() => { loadData(); }, []));

  const stats = useMemo(() => ({
    total: students.length,
    active: students.filter(s => s.status === 'active').length,
    lmv: students.filter(s => s.license_type === 'LMV').length,
  }), [students]);

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      
      <LinearGradient colors={[colors.primary, colors.primaryDark]} style={styles.header}>
        <SafeAreaView edges={['top']}>
          <View style={styles.headerTitleRow}>
            <Text style={styles.headerTitle}>Students</Text>
            <TouchableOpacity style={styles.headIcon}>
              <Ionicons name="notifications-outline" size={22} color={colors.white} />
            </TouchableOpacity>
          </View>

          <View style={[styles.searchBarBox, { backgroundColor: colors.white }]}>
            <Ionicons name="search-outline" size={18} color={'#64748B'} />
            <Searchbar
              placeholder="Search by name..."
              onChangeText={setSearch}
              value={search}
              style={styles.searchBar}
              inputStyle={styles.searchInput}
              elevation={0}
            />
          </View>
        </SafeAreaView>
      </LinearGradient>

      <View style={styles.statsContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.statsScroll}>
          <StatItem label="Total" value={stats.total} icon="people" dark accent colors={colors} />
          <StatItem label="Active" value={stats.active} icon="checkmark-circle" colors={colors} />
          <StatItem label="LMV" value={stats.lmv} icon="car" colors={colors} />
        </ScrollView>
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator color={colors.primary} /></View>
      ) : (
        <FlatList
          data={students.filter(s => s.name.toLowerCase().includes(search.toLowerCase()))}
          keyExtractor={item => item.id.toString()}
          renderItem={({ item }) => <StudentCard student={item} navigation={navigation} colors={colors} onPress={() => navigation.navigate('AddStudent', { student: item })} />}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyTxt}>No records found</Text>
            </View>
          }
        />
      )}

      <FAB
        icon="plus"
        color={colors.primaryDark}
        style={[styles.fab, { backgroundColor: colors.accent }]}
        onPress={() => navigation.navigate('AddStudent', { student: null })}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingBottom: 20, borderBottomLeftRadius: 30, borderBottomRightRadius: 30 },
  headerTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 25, paddingVertical: 10 },
  headerTitle: { fontSize: 24, fontFamily: FONTS.bold, color: '#FFFFFF' },
  headIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },
  searchBarBox: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 25, marginTop: 10, paddingHorizontal: 15, borderRadius: 15, height: 48 },
  searchBar: { flex: 1, backgroundColor: 'transparent' },
  searchInput: { fontSize: 14, fontFamily: FONTS.regular },
  statsContainer: { marginTop: -15 },
  statsScroll: { paddingHorizontal: 25, gap: 10, paddingBottom: 15 },
  statBox: { 
    width: 90, 
    padding: 10, 
    borderRadius: 16, 
    elevation: 3, 
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 3 }, 
    shadowOpacity: 0.1, 
    shadowRadius: 5 
  },
  statTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  statVal: { fontSize: 16, fontFamily: FONTS.bold },
  statLbl: { fontSize: 9, fontFamily: FONTS.medium, color: '#64748B', marginTop: 4, textTransform: 'uppercase' },
  list: { paddingHorizontal: 25, paddingTop: 10, paddingBottom: 100 },
  card: { borderRadius: 20, padding: 15, marginBottom: 15, elevation: 1 },
  cardTop: { flexDirection: 'row', alignItems: 'center' },
  avatarWrap: { position: 'relative' },
  avatar: { width: 48, height: 48, borderRadius: 14, overflow: 'hidden' },
  avatarFull: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' },
  avatarImg: { width: '100%', height: '100%' },
  avatarTxt: { fontSize: 20, fontFamily: FONTS.bold, color: '#FFFFFF' },
  activeDot: { position: 'absolute', bottom: -2, right: -2, width: 12, height: 12, borderRadius: 6, borderWidth: 2 },
  infoCol: { flex: 1, marginLeft: 15 },
  name: { fontSize: 16, fontFamily: FONTS.bold },
  sub: { fontSize: 12, color: '#64748B', marginTop: 2 },
  actionRow: { flexDirection: 'row' },
  smallAction: { width: 34, height: 34, borderRadius: 10, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' },
  cardBottom: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#F8FAFC' },
  progressRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  progressLabel: { fontSize: 11, fontFamily: FONTS.medium, color: '#64748B' },
  progressPercent: { fontSize: 11, fontFamily: FONTS.bold },
  progressBar: { height: 6, borderRadius: 3, backgroundColor: '#E2E8F0', overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  empty: { marginTop: 50, alignItems: 'center' },
  emptyTxt: { fontSize: 14, color: '#64748B', fontFamily: FONTS.medium },
  fab: { position: 'absolute', bottom: 30, right: 25, borderRadius: 18 },
});
