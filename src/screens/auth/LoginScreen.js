import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator,
  KeyboardAvoidingView, Platform, ScrollView,
  StatusBar, Dimensions, Animated, Modal, Pressable
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { adminLogin, sendMagicLink, verifyOtp, getStudentByEmail } from '../../lib/supabase';
import ConfettiCannon from 'react-native-confetti-cannon';
import { LinearGradient } from 'expo-linear-gradient';
import { useAppTheme } from '../../context/ThemeContext';

const { width, height } = Dimensions.get('window');

const FONTS = {
  black: 'Outfit_900Black',
  bold: 'Outfit_700Bold',
  semi: 'Outfit_600SemiBold',
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const ThemeItem = ({ themeKey, themeData, active, onSelect }) => (
  <TouchableOpacity
    activeOpacity={0.8}
    onPress={() => onSelect(themeKey)}
    style={[styles.themeItem, active && { borderColor: themeData.accent, borderWidth: 1.5, backgroundColor: themeData.accent + '11' }]}
  >
    <LinearGradient colors={[themeData.primaryDark, themeData.primary]} style={styles.themeCircle}>
      <View style={[styles.themeAccent, { backgroundColor: themeData.accent }]} />
    </LinearGradient>
    <Text style={[styles.themeName, { color: themeData.primaryDark }]}>{themeData.name}</Text>
  </TouchableOpacity>
);

const FloatingInput = ({ icon, label, value, onChangeText, secureTextEntry, keyboardType, colors, onToggleSecure, showSecureToggle, isOtp, onSubmitEditing, returnKeyType }) => {
  const [isFocused, setIsFocused] = useState(false);
  const animVal = useRef(new Animated.Value(value ? 1 : 0)).current;
  const focusBorder = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(animVal, {
      toValue: isFocused || value ? 1 : 0,
      duration: 150,
      useNativeDriver: false
    }).start();

    Animated.timing(focusBorder, {
      toValue: isFocused ? 1 : 0,
      duration: 150,
      useNativeDriver: false
    }).start();
  }, [isFocused, value]);

  const labelTop = animVal.interpolate({ inputRange: [0, 1], outputRange: [20, 6] });
  const labelSize = animVal.interpolate({ inputRange: [0, 1], outputRange: [15, 11] });
  const borderColor = focusBorder.interpolate({ inputRange: [0, 1], outputRange: ['#E2E8F0', colors.accent] });
  const shadowOpacity = focusBorder.interpolate({ inputRange: [0, 1], outputRange: [0, 0.15] });

  if (isOtp) {
    return (
      <Animated.View style={[styles.inputBoxOtp, { borderColor }]}>
        <TextInput
          style={[styles.fieldInputOtp, { color: colors.primary }]}
          value={value}
          onChangeText={onChangeText}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          keyboardType="number-pad"
          maxLength={6}
          placeholder="••••••"
          placeholderTextColor="#94A3B8"
        />
      </Animated.View>
    );
  }

  return (
    <Animated.View style={[styles.inputBox, { borderColor, shadowColor: colors.accent, shadowOffset: { width: 0, height: 4 }, shadowRadius: 8, shadowOpacity }]}>
      <Ionicons name={icon} size={20} color={isFocused ? colors.accent : '#94A3B8'} style={styles.fieldIcon} />
      <View style={{ flex: 1, height: '100%', justifyContent: 'center', position: 'relative' }}>
        <Animated.Text style={[styles.floatingLabel, { top: labelTop, left: 0, fontSize: labelSize, color: isFocused ? colors.accent : '#94A3B8' }]}>
          {label}
        </Animated.Text>
        <TextInput
          style={[styles.fieldInput, { color: colors.primary, opacity: isFocused || value ? 1 : 0, paddingTop: isFocused || value ? 18 : 0 }]}
          value={value}
          onChangeText={onChangeText}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          autoCapitalize="none"
          onSubmitEditing={onSubmitEditing}
          returnKeyType={returnKeyType}
        />
      </View>
      {showSecureToggle && (
        <TouchableOpacity onPress={onToggleSecure} style={{ padding: 4 }}>
          <Ionicons name={secureTextEntry ? 'eye-outline' : 'eye-off-outline'} size={20} color="#94A3B8" />
        </TouchableOpacity>
      )}
    </Animated.View>
  );
};

export default function LoginScreen({ navigation }) {
  const { colors, changeTheme, Themes, currentTheme, updateRole } = useAppTheme();

  const [role, setRole] = useState('admin');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [otp, setOtp] = useState('');
  const [showConfetti, setShowConfetti] = useState(false);
  const [showThemes, setShowThemes] = useState(false);

  const fadeAnim = useRef(new Animated.Value(1)).current;
  const shiftAnim = useRef(new Animated.Value(role === 'admin' ? 0 : 1)).current;
  const btnScale = useRef(new Animated.Value(1)).current;

  const animateRoleChange = (newRole) => {
    if (newRole === role) return;
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
      Animated.spring(shiftAnim, { toValue: newRole === 'admin' ? 0 : 1, useNativeDriver: false, tension: 50, friction: 9 })
    ]).start(() => {
      setRole(newRole);
      updateRole(newRole);
      setSent(false);
      Animated.timing(fadeAnim, { toValue: 1, duration: 250, useNativeDriver: true }).start();
    });
  };

  const onPressIn = () => Animated.spring(btnScale, { toValue: 0.95, useNativeDriver: true }).start();
  const onPressOut = () => Animated.spring(btnScale, { toValue: 1, useNativeDriver: true, tension: 100, friction: 5 }).start();

  const handleAdminLogin = async () => {
    if (!username.trim() || !password.trim()) return Alert.alert('Attention', 'All fields required.');
    setLoading(true);
    const { data, error } = await adminLogin(username.trim(), password.trim());
    setLoading(false);
    if (error || !data) return Alert.alert('Error', 'Invalid credentials.');
    await AsyncStorage.setItem('userRole', 'admin');
    await AsyncStorage.setItem('adminData', JSON.stringify(data));
    navigation.replace('AdminTabs');
  };

  const handleMagicLink = async () => {
    if (!email.trim() || !email.includes('@')) return Alert.alert('Error', 'Invalid email address.');
    setLoading(true);
    const { error } = await sendMagicLink(email.trim());
    setLoading(false);
    if (error) return Alert.alert('Error', 'Failed to send secure key.');
    setSent(true);
  };

  const handleVerifyOtp = async (codeToVerify = otp) => {
    if (codeToVerify.length < 6) return Alert.alert('Error', 'Incomplete key.');
    setLoading(true);
    const { error } = await verifyOtp(email.trim(), codeToVerify.trim());
    if (error) { setLoading(false); return Alert.alert('Error', error.message || 'Verification failed.'); }
    const studentRes = await getStudentByEmail(email.trim());
    const studentData = studentRes.data || null;

    setShowConfetti(true);
    await AsyncStorage.setItem('userRole', 'student');

    const finalData = studentData || { email: email.trim().toLowerCase(), name: '' };
    await AsyncStorage.setItem('studentData', JSON.stringify(finalData));
    await AsyncStorage.setItem('isFreshLogin', 'true');

    setTimeout(() => {
      navigation.replace('StudentTabs');
    }, 1500);
  };

  useEffect(() => {
    if (sent && role === 'student' && otp.length === 6 && !loading) {
      handleVerifyOtp(otp);
    }
  }, [otp]);

  return (
    <View style={[styles.container, { backgroundColor: '#F8FAFC' }]}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      {showConfetti && <ConfettiCannon count={200} origin={{ x: width / 2, y: -20 }} fallSpeed={2500} fadeOut={true} />}

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.scroll}>
        <LinearGradient colors={[colors.primaryDark, colors.primary]} style={styles.header}>
          <View style={styles.headerPattern}>
            <View style={[styles.bgCircle, styles.circle1, { backgroundColor: colors.accent }]} />
            <View style={[styles.bgCircle, styles.circle2, { backgroundColor: colors.accent }]} />
          </View>

          <SafeAreaView edges={['top']} style={styles.headerContent}>
            <TouchableOpacity style={styles.themeBtn} onPress={() => setShowThemes(true)}>
              <Ionicons name="color-palette-outline" size={20} color="#FFFFFF" />
            </TouchableOpacity>

            <View style={styles.branding}>
              <View style={[styles.crestBox, { shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 20, shadowOffset: { width: 0, height: 10 } }]}>
                <LinearGradient colors={['rgba(255,255,255,0.15)', 'rgba(255,255,255,0.05)']} style={styles.crestIcon}>
                  <Text style={[styles.crestLetter, { color: colors.accent }]}>P</Text>
                </LinearGradient>
                <View style={[styles.crestRing, { borderColor: 'rgba(255,255,255,0.1)' }]} />
              </View>
              <Text style={styles.titleText}>PRASHANT</Text>
              <Text style={[styles.subTitleText, { color: colors.accent }]}>DRIVING ACADEMY</Text>
            </View>

            <View style={styles.roleWrap}>
              <View style={styles.roleTrack}>
                <TouchableOpacity style={styles.roleBtn} onPress={() => animateRoleChange('admin')}>
                  <Text style={[styles.roleLabel, role === 'admin' ? { color: colors.primaryDark } : { color: 'rgba(255,255,255,0.7)' }]}>Management</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.roleBtn} onPress={() => animateRoleChange('student')}>
                  <Text style={[styles.roleLabel, role === 'student' ? { color: colors.primaryDark } : { color: 'rgba(255,255,255,0.7)' }]}>Students</Text>
                </TouchableOpacity>
                <Animated.View style={[
                  styles.roleIndicator,
                  {
                    width: (width - 56) / 2,
                    backgroundColor: colors.white,
                    transform: [{ translateX: shiftAnim.interpolate({ inputRange: [0, 1], outputRange: [4, 4 + (width - 56) / 2] }) }]
                  }
                ]} />
              </View>
            </View>
          </SafeAreaView>
        </LinearGradient>

        <View style={styles.body}>

          <Animated.View style={[styles.card, { opacity: fadeAnim, backgroundColor: colors.white }]}>
            <View style={styles.cardHeader}>
              <View>
                <Text style={[styles.cardTitle, { color: colors.primary }]}>
                  {role === 'admin' ? 'System Login' : (sent ? 'Secure Key' : 'Student Access')}
                </Text>
                <Text style={styles.cardSub}>
                  {role === 'admin' ? 'Enter your credentials to securely access the management portal.' :
                    (sent ? `Enter the 6-digit passcode sent to your inbox.` : 'Provide your registered email to receive an access key.')}
                </Text>
              </View>
              <View style={[styles.dotLine, { backgroundColor: colors.accent }]} />
            </View>

            <View style={styles.form}>
              {role === 'admin' ? (
                <>
                  <FloatingInput icon="id-card-outline" label="Administrator ID" value={username} onChangeText={setUsername} colors={colors} returnKeyType="next" />
                  <FloatingInput icon="key-outline" label="Secure Passcode" value={password} onChangeText={setPassword} secureTextEntry={!showPass} showSecureToggle onToggleSecure={() => setShowPass(!showPass)} colors={colors} returnKeyType="done" onSubmitEditing={handleAdminLogin} />
                </>
              ) : (
                <>
                  {!sent ? (
                    <FloatingInput icon="mail-outline" label="Email Address" value={email} onChangeText={setEmail} keyboardType="email-address" colors={colors} returnKeyType="send" onSubmitEditing={handleMagicLink} />
                  ) : (
                    <FloatingInput isOtp value={otp} onChangeText={setOtp} colors={colors} />
                  )}
                </>
              )}
            </View>

            <AnimatedPressable
              style={[styles.actionBtn, { transform: [{ scale: btnScale }] }]}
              onPressIn={onPressIn} onPressOut={onPressOut}
              onPress={role === 'admin' ? handleAdminLogin : (sent ? handleVerifyOtp : handleMagicLink)} disabled={loading}
            >
              <LinearGradient colors={[colors.accent, colors.accent]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.actionGrad}>
                {loading ? <ActivityIndicator color={colors.primaryDark} /> : (
                  <>
                    <Text style={[styles.actionText, { color: colors.primaryDark }]}>
                      {role === 'admin' ? 'Secure Login' : (sent ? 'Verify Access' : 'Request Access Key')}
                    </Text>
                    <Ionicons name="log-in-outline" size={20} color={colors.primaryDark} />
                  </>
                )}
              </LinearGradient>
            </AnimatedPressable>

            {role === 'student' && sent && (
              <TouchableOpacity style={styles.retryBtn} onPress={() => setSent(false)}>
                <Text style={styles.retryText}>Wrong email? Try again.</Text>
              </TouchableOpacity>
            )}
          </Animated.View>
        </View>
      </KeyboardAvoidingView>

      <Modal visible={showThemes} transparent animationType="fade" onRequestClose={() => setShowThemes(false)}>
        <View style={styles.mOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setShowThemes(false)} />
          <View style={styles.mBox}>
            <View style={styles.mHeader}>
              <Text style={[styles.mTitle, { color: colors.primary }]}>Customize Theme</Text>
              <TouchableOpacity onPress={() => setShowThemes(false)} style={styles.mClose}>
                <Ionicons name="close" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.mGrid}>
              {Object.keys(Themes).map((key) => (
                <ThemeItem key={key} themeKey={key} themeData={Themes[key]} active={currentTheme === key} onSelect={(k) => { changeTheme(k); setShowThemes(false); }} />
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingBottom: 20 },
  scroll: { flex: 1 },
  header: { height: height * 0.48, borderBottomLeftRadius: 40, borderBottomRightRadius: 40, alignItems: 'center', justifyContent: 'flex-start', overflow: 'hidden', paddingBottom: 20 },
  headerPattern: { ...StyleSheet.absoluteFillObject, overflow: 'hidden' },
  bgCircle: { position: 'absolute', borderRadius: 999, opacity: 0.08 },
  circle1: { width: 350, height: 350, top: -120, right: -120 },
  circle2: { width: 500, height: 500, bottom: -200, left: -200 },
  headerContent: { width: '100%', alignItems: 'center', paddingHorizontal: 24, flex: 1, justifyContent: 'space-between', paddingTop: 0, paddingBottom: 0 },
  themeBtn: { position: 'absolute', top: 65, right: 20, width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)', zIndex: 10 },
  branding: { alignItems: 'center', marginTop: 55 },
  crestBox: { width: 75, height: 75, marginBottom: 14, alignItems: 'center', justifyContent: 'center' },
  crestIcon: { width: 60, height: 60, borderRadius: 18, alignItems: 'center', justifyContent: 'center', zIndex: 2, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  crestLetter: { fontSize: 32, fontFamily: FONTS.bold },
  crestRing: { position: 'absolute', width: 74, height: 74, borderRadius: 24, borderWidth: 1, zIndex: 1 },
  titleText: { fontSize: 24, fontFamily: FONTS.bold, color: '#FFFFFF', letterSpacing: 8, marginBottom: 6 },
  subTitleText: { fontSize: 10, fontFamily: FONTS.semi, letterSpacing: 5, opacity: 0.9 },

  body: { paddingHorizontal: 24, paddingTop: 24 },
  roleWrap: { width: '100%', alignItems: 'center', marginBottom: 0 },
  roleTrack: { flexDirection: 'row', borderRadius: 30, height: 54, alignItems: 'center', padding: 4, backgroundColor: 'rgba(255,255,255,0.2)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)', width: '100%', elevation: 10, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 15, shadowOffset: { width: 0, height: 8 } },
  roleBtn: { flex: 1, alignItems: 'center', justifyContent: 'center', zIndex: 2, height: '100%' },
  roleLabel: { fontSize: 14, fontFamily: FONTS.bold },
  roleIndicator: { position: 'absolute', height: 46, borderRadius: 23, zIndex: 1, elevation: 2, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 8, shadowOffset: { width: 0, height: 4 } },

  card: { borderRadius: 32, padding: 24, backgroundColor: '#FFF', elevation: 20, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 30, shadowOffset: { width: 0, height: 15 } },
  cardHeader: { marginBottom: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardTitle: { fontSize: 22, fontFamily: FONTS.bold, marginBottom: 6 },
  cardSub: { fontSize: 13, fontFamily: FONTS.medium, color: '#64748B', maxWidth: '90%', lineHeight: 18 },
  dotLine: { width: 44, height: 4, borderRadius: 2, marginTop: 8 },

  form: { marginBottom: 10 },
  inputBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', borderRadius: 24, paddingHorizontal: 16, height: 60, borderWidth: 1.5, marginBottom: 12 },
  fieldIcon: { marginRight: 14 },
  floatingLabel: { position: 'absolute', fontFamily: FONTS.medium },
  fieldInput: { flex: 1, fontSize: 15, fontFamily: FONTS.medium, height: '100%' },
  inputBoxOtp: { backgroundColor: '#F8FAFC', borderRadius: 24, height: 72, borderWidth: 1.5, marginBottom: 16, justifyContent: 'center', alignItems: 'center' },
  fieldInputOtp: { fontSize: 32, fontFamily: FONTS.black, letterSpacing: 12, textAlign: 'center', width: '100%' },

  actionBtn: { borderRadius: 24, overflow: 'hidden', marginTop: 10, elevation: 8, shadowColor: '#FCD400', shadowOpacity: 0.3, shadowRadius: 15, shadowOffset: { width: 0, height: 8 } },
  actionGrad: { height: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12 },
  actionText: { fontSize: 16, fontFamily: FONTS.bold },

  retryBtn: { alignItems: 'center', marginTop: 16 },
  retryText: { fontSize: 13, fontFamily: FONTS.medium, color: '#94A3B8', textDecorationLine: 'underline' },

  prestigeFooter: { alignItems: 'center', marginTop: 24, marginBottom: 8 },
  footerSecurity: { fontSize: 10, fontFamily: FONTS.bold, color: '#94A3B8', letterSpacing: 1.5, marginBottom: 8, flexDirection: 'row', alignItems: 'center' },
  footerCopy: { fontSize: 9, fontFamily: FONTS.medium, color: '#CBD5E1', letterSpacing: 1 },

  mOverlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.6)', justifyContent: 'flex-end' },
  mBox: { borderTopLeftRadius: 40, borderTopRightRadius: 40, padding: 30, backgroundColor: '#FFF', maxHeight: height * 0.7, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 30, shadowOffset: { width: 0, height: -10 } },
  mHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25 },
  mTitle: { fontSize: 20, fontFamily: FONTS.bold },
  mClose: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center' },
  mGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  themeItem: { width: '47%', marginBottom: 15, padding: 16, borderRadius: 24, backgroundColor: '#F8FAFC', alignItems: 'center', borderWidth: 1.5, borderColor: '#F1F5F9' },
  themeCircle: { width: 50, height: 50, borderRadius: 25, marginBottom: 12, justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10, shadowOffset: { width: 0, height: 5 } },
  themeAccent: { width: 14, height: 14, borderRadius: 7 },
  themeName: { fontSize: 11, fontFamily: FONTS.bold, textAlign: 'center' },
});

