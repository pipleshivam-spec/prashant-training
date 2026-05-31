import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  ActivityIndicator, Alert, StatusBar, Dimensions, Image, ImageBackground
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { LinearGradient } from 'expo-linear-gradient';
import { getScheduleById, updateSchedule, deleteSchedule } from '../../lib/supabase';
import { useAppTheme } from '../../context/ThemeContext';

const { width } = Dimensions.get('window');

const FONTS = {
  black:    'Outfit_900Black',
  bold:     'Outfit_700Bold',
  semi:     'Outfit_600SemiBold',
  body:     'Inter_400Regular',
  bodySemi: 'Inter_600SemiBold',
};

export default function SessionDetail() {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const navigation = useNavigation();
  const route = useRoute();
  const { sessionId } = route.params || {};

  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState(null);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (sessionId) loadSession();
  }, [sessionId]);

  const loadSession = async () => {
    setLoading(true);
    const { data, error } = await getScheduleById(sessionId);
    if (data) setSession(data);
    else if (error) Alert.alert('Error', error.message);
    setLoading(false);
  };

  const handleUpdateStatus = async (newStatus) => {
    setUpdating(true);
    const { error } = await updateSchedule(sessionId, { status: newStatus });
    setUpdating(false);
    if (!error) {
      Alert.alert('Success', `Session marked as ${newStatus}`);
      loadSession();
    } else {
      Alert.alert('Error', error.message);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Session',
      'Remove this training slot permanently?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive', 
          onPress: async () => {
            setUpdating(true);
            const { error } = await deleteSchedule(sessionId);
            setUpdating(false);
            if (!error) {
              navigation.goBack();
            } else {
              Alert.alert('Error', error.message);
            }
          } 
        }
      ]
    );
  };

  if (loading) return (
    <View style={[s.center, { backgroundColor: colors.bg }]}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  );

  const isCompleted = session?.status === 'Completed';
  const isCancelled = session?.status === 'Cancelled';

  return (
    <View style={[s.root, { backgroundColor: colors.bg }]}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {/* Header Hero */}
        <LinearGradient
          colors={[colors.primaryDark, colors.primary]}
          style={s.hero}
        >
          <View style={s.topNav}>
            <TouchableOpacity style={s.navBtn} onPress={() => navigation.goBack()}>
              <Ionicons name="arrow-back" size={22} color={colors.white} />
            </TouchableOpacity>
            <TouchableOpacity style={s.navBtn} onPress={handleDelete}>
              <Ionicons name="trash-outline" size={22} color={colors.white} />
            </TouchableOpacity>
          </View>

          <View style={s.heroContent}>
            <View style={s.avatarGlow}>
              <View style={[s.avatarContainer, { backgroundColor: colors.accent, borderColor: colors.white }]}>
                <Text style={[s.avatarTxt, { color: colors.primaryDark }]}>
                  {session.students?.name?.split(' ').map(w=>w[0]).join('').toUpperCase().slice(0,2)}
                </Text>
              </View>
            </View>
            <Text style={s.hStudentName}>{session.students?.name}</Text>
            <View style={s.statusRow}>
              <View style={[s.hBadge, isCompleted ? { backgroundColor: '#10B981' } : isCancelled ? { backgroundColor: '#EF4444' } : { backgroundColor: colors.accent }]}>
                <Text style={[s.hBadgeTxt, !isCompleted && !isCancelled && { color: colors.primaryDark }]}>{session.status || 'SCHEDULED'}</Text>
              </View>
              <Text style={s.hLicense}>{session.license_type || 'LMV'}</Text>
            </View>
          </View>
        </LinearGradient>

        <View style={s.mainBody}>
          {/* Appointment Card */}
          <View style={[s.infoCard, { backgroundColor: colors.white, shadowColor: colors.primary }]}>
            <Text style={[s.cardTitle, { color: colors.primary }]}>Session Details</Text>
            <DetailItem icon="calendar" color="#185FA5" label="Date" value={session.session_date} colors={colors} />
            <DetailItem icon="time" color="#534AB7" label="Time Slot" value={session.session_time} colors={colors} />
            <DetailItem icon="hourglass" color="#854F0B" label="Duration" value={session.duration || '1 hour'} colors={colors} />
            <DetailItem icon="car" color="#3B6D11" label="Session Type" value="Practical Training" colors={colors} />
          </View>

          {/* Contact Card */}
          <View style={[s.infoCard, { backgroundColor: colors.white, shadowColor: colors.primary }]}>
            <Text style={[s.cardTitle, { color: colors.primary }]}>Student Contact</Text>
            <View style={s.contactRow}>
              <View style={s.contactInfo}>
                <Text style={s.contactLabel}>Email Address</Text>
                <Text style={[s.contactVal, { color: colors.text }]}>{session.students?.email || 'N/A'}</Text>
              </View>
              <TouchableOpacity style={s.contactAction}>
                <Ionicons name="mail" size={18} color={colors.primary} />
              </TouchableOpacity>
            </View>
            <View style={s.divider} />
            <View style={s.contactRow}>
              <View style={s.contactInfo}>
                <Text style={s.contactLabel}>Phone Number</Text>
                <Text style={[s.contactVal, { color: colors.text }]}>{session.students?.phone || 'N/A'}</Text>
              </View>
              <TouchableOpacity style={s.contactAction}>
                <Ionicons name="call" size={18} color={colors.primary} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Action Hub */}
          <View style={s.actionHub}>
            <Text style={[s.hubTitle, { color: colors.primary }]}>Management Actions</Text>
            <View style={s.actionGrid}>
              <QuickAction 
                icon="checkmark-done" color="#10B981" 
                label="Complete" onPress={() => handleUpdateStatus('Completed')}
                disabled={isCompleted || updating} colors={colors}
              />
              <QuickAction 
                icon="close" color="#EF4444" 
                label="Cancel" onPress={() => handleUpdateStatus('Cancelled')}
                disabled={isCancelled || updating} colors={colors}
              />
              <QuickAction 
                icon="create-outline" color={colors.primary} 
                label="Edit Info" onPress={() => Alert.alert('Edit', 'Edit feature coming soon!')} colors={colors}
              />
              <QuickAction 
                icon="document-text-outline" color="#854F0B" 
                label="Add Notes" onPress={() => navigation.navigate('SessionNotes', { sessionId })} colors={colors}
              />
              <QuickAction 
                icon="share-social" color="#534AB7" 
                label="Notify" onPress={() => Alert.alert('Notify', 'Student will be notified via WhatsApp.')} colors={colors}
              />
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Bottom Floating Action */}
      {!isCompleted && !isCancelled && (
        <View style={s.bottomBar}>
          <TouchableOpacity 
            style={[s.fabMain, { shadowColor: colors.primary }]} 
            activeOpacity={0.9}
            onPress={() => handleUpdateStatus('Completed')}
            disabled={updating}
          >
            <LinearGradient colors={[colors.primary, colors.primaryDark]} style={s.fabGradient}>
              {updating ? <ActivityIndicator color={colors.white} /> : (
                <>
                  <Ionicons name="shield-checkmark" size={22} color={colors.white} />
                  <Text style={s.fabTxt}>MARK AS COMPLETED</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const DetailItem = ({ icon, color, label, value, colors }) => (
  <View style={s.detailRow}>
    <View style={[s.detailIcon, { backgroundColor: color + '15' }]}>
      <Ionicons name={icon} size={18} color={color} />
    </View>
    <View style={{ flex: 1 }}>
      <Text style={s.detailLabel}>{label}</Text>
      <Text style={[s.detailValue, { color: colors.text }]}>{value}</Text>
    </View>
    <Ionicons name="chevron-forward" size={14} color={'#94A3B8'} />
  </View>
);

const QuickAction = ({ icon, color, label, onPress, disabled, colors }) => (
  <TouchableOpacity 
    style={[s.qAction, { backgroundColor: colors.white, borderColor: '#EEF2F8' }, disabled && { opacity: 0.4 }]} 
    onPress={onPress} 
    disabled={disabled}
    activeOpacity={0.7}
  >
    <View style={[s.qIconWrap, { backgroundColor: color + '12' }]}>
      <Ionicons name={icon} size={22} color={color} />
    </View>
    <Text style={[s.qLabel, { color: colors.text }]}>{label}</Text>
  </TouchableOpacity>
);

const s = StyleSheet.create({
  root:   { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { paddingBottom: 120 },
  
  // Hero
  hero:        { height: 280, width: width, padding: 20, justifyContent: 'center' },
  topNav:      { flexDirection: 'row', justifyContent: 'space-between', position: 'absolute', top: 50, left: 20, right: 20 },
  navBtn:      { width: 42, height: 42, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  
  heroContent: { alignItems: 'center', marginTop: 40 },
  avatarGlow:  { padding: 8, borderRadius: 60, backgroundColor: 'rgba(255,255,255,0.1)' },
  avatarContainer: { width: 84, height: 84, borderRadius: 42, alignItems: 'center', justifyContent: 'center', borderWidth: 3 },
  avatarTxt:   { fontFamily: FONTS.black, fontSize: 32 },
  hStudentName:{ fontFamily: FONTS.black, fontSize: 26, color: '#FFFFFF', marginTop: 12 },
  statusRow:   { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8 },
  hBadge:      { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
  hBadgeTxt:   { fontFamily: FONTS.bold, fontSize: 11, color: '#FFFFFF', letterSpacing: 1 },
  hLicense:    { fontFamily: FONTS.bodySemi, fontSize: 13, color: 'rgba(255,255,255,0.6)' },
  
  // Body
  mainBody: { padding: 16, marginTop: -30 },
  infoCard: { borderRadius: 24, padding: 20, marginBottom: 16, elevation: 6, shadowOpacity: 0.1, shadowRadius: 15, shadowOffset: { width: 0, height: 6 } },
  cardTitle:{ fontFamily: FONTS.bold, fontSize: 16, marginBottom: 18 },
  
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 15, marginBottom: 18 },
  detailIcon:{ width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  detailLabel:{ fontFamily: FONTS.body, fontSize: 12, color: '#64748B' },
  detailValue:{ fontFamily: FONTS.bold, fontSize: 15 },

  // Contact
  contactRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10 },
  contactInfo:{ flex: 1 },
  contactLabel:{ fontFamily: FONTS.body, fontSize: 11, color: '#64748B', marginBottom: 2 },
  contactVal: { fontFamily: FONTS.bodySemi, fontSize: 14 },
  contactAction:{ width: 36, height: 36, borderRadius: 10, backgroundColor: '#F8FAFC', alignItems: 'center', justifyContent: 'center' },
  divider:    { height: 1, backgroundColor: '#EEF2F8', marginVertical: 4 },

  // Action Hub
  actionHub: { paddingHorizontal: 4 },
  hubTitle:  { fontFamily: FONTS.bold, fontSize: 15, marginBottom: 15 },
  actionGrid:{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  qAction:   { width: (width - 60) / 2, borderRadius: 20, padding: 16, alignItems: 'center', gap: 10, borderWidth: 1 },
  qIconWrap: { width: 44, height: 44, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  qLabel:    { fontFamily: FONTS.bodySemi, fontSize: 13 },

  // Bottom Floating Bar
  bottomBar: { position: 'absolute', bottom: 20, left: 20, right: 20 },
  fabMain:   { borderRadius: 20, overflow: 'hidden', elevation: 12, shadowOpacity: 0.3, shadowRadius: 10 },
  fabGradient:{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 64, gap: 12 },
  fabTxt:    { fontFamily: FONTS.black, fontSize: 16, color: '#FFFFFF', letterSpacing: 0.5 },
});
