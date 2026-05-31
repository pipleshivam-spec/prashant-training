import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert,
  KeyboardAvoidingView, Platform, StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { sendMagicLink } from '../../lib/supabase';

const BLUE = '#1A3C6E';
const GOLD = '#FCD400';

export default function StudentLogin({ navigation }) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSend = async () => {
    if (!email.trim() || !email.includes('@')) {
      Alert.alert('Error', 'Please enter a valid email address.');
      return;
    }
    setLoading(true);
    const { error } = await sendMagicLink(email.trim().toLowerCase());
    setLoading(false);
    if (error) {
      Alert.alert('Error', error.message || 'Failed to send login link.');
      return;
    }
    setSent(true);
  };

  return (
    <KeyboardAvoidingView style={s.root} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <StatusBar barStyle="light-content" backgroundColor={BLUE} />

      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={s.logoBox}>
          <Ionicons name="school-outline" size={48} color={GOLD} />
        </View>
        <Text style={s.appName}>Student Login</Text>
        <Text style={s.subtitle}>Prashant Motor Training</Text>
      </View>

      {/* Form */}
      <View style={s.card}>
        {sent ? (
          <View style={s.sentBox}>
            <Ionicons name="checkmark-circle" size={64} color="#27ae60" />
            <Text style={s.sentTitle}>Check your email!</Text>
            <Text style={s.sentMsg}>A login link has been sent to{'\n'}<Text style={s.sentEmail}>{email}</Text></Text>
            <TouchableOpacity style={s.retryBtn} onPress={() => setSent(false)}>
              <Text style={s.retryText}>Use different email</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <Text style={s.cardTitle}>Welcome 🎓</Text>
            <Text style={s.cardSub}>Enter your email to receive a login link</Text>

            <View style={s.inputWrap}>
              <Ionicons name="mail-outline" size={20} color="#888" style={s.inputIcon} />
              <TextInput
                style={s.input}
                placeholder="Email address"
                placeholderTextColor="#aaa"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <TouchableOpacity style={s.loginBtn} onPress={handleSend} disabled={loading}>
              {loading
                ? <ActivityIndicator color={BLUE} />
                : <Text style={s.loginBtnText}>Send Login Link</Text>}
            </TouchableOpacity>

            <TouchableOpacity style={s.adminLink} onPress={() => navigation.goBack()}>
              <Text style={s.adminLinkText}>← Admin Login</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: BLUE },
  header: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 40 },
  backBtn: { position: 'absolute', top: 50, left: 20, padding: 8 },
  logoBox: {
    width: 90, height: 90, borderRadius: 45,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  appName: { fontSize: 22, fontWeight: '800', color: '#fff' },
  subtitle: { fontSize: 13, color: 'rgba(255,255,255,0.6)', marginTop: 4 },
  card: {
    backgroundColor: '#fff', borderTopLeftRadius: 32, borderTopRightRadius: 32,
    padding: 28, paddingBottom: 40,
  },
  cardTitle: { fontSize: 22, fontWeight: '700', color: BLUE, marginBottom: 4 },
  cardSub: { fontSize: 13, color: '#888', marginBottom: 24 },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#f4f6f9', borderRadius: 12,
    paddingHorizontal: 14, marginBottom: 14, height: 52,
  },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, fontSize: 15, color: '#1A1A2E' },
  loginBtn: {
    backgroundColor: GOLD, borderRadius: 12,
    height: 52, alignItems: 'center', justifyContent: 'center',
    marginTop: 8, elevation: 3,
  },
  loginBtnText: { fontSize: 16, fontWeight: '700', color: BLUE },
  adminLink: { alignItems: 'center', marginTop: 20 },
  adminLinkText: { color: BLUE, fontSize: 14, fontWeight: '600' },
  sentBox: { alignItems: 'center', paddingVertical: 20 },
  sentTitle: { fontSize: 22, fontWeight: '700', color: BLUE, marginTop: 16 },
  sentMsg: { fontSize: 14, color: '#555', textAlign: 'center', marginTop: 8, lineHeight: 22 },
  sentEmail: { fontWeight: '700', color: BLUE },
  retryBtn: { marginTop: 24 },
  retryText: { color: '#888', fontSize: 14, textDecorationLine: 'underline' },
});
