import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, KeyboardAvoidingView,
  Platform, Alert, StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { adminLogin } from '../../lib/supabase';

const BLUE = '#1A3C6E';
const GOLD = '#FCD400';

export default function AdminLogin({ navigation }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!username.trim() || !password.trim()) {
      Alert.alert('Error', 'Please enter username and password.');
      return;
    }
    setLoading(true);
    const { data, error } = await adminLogin(username.trim(), password.trim());
    setLoading(false);
    if (error || !data) {
      Alert.alert('Login Failed', 'Invalid username or password.');
      return;
    }
    await AsyncStorage.setItem('userRole', 'admin');
    await AsyncStorage.setItem('adminData', JSON.stringify(data));
    navigation.replace('AdminTabs');
  };

  return (
    <KeyboardAvoidingView style={s.root} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <StatusBar barStyle="light-content" backgroundColor={BLUE} />

      {/* Header */}
      <View style={s.header}>
        <View style={s.logoBox}>
          <Ionicons name="car-sport" size={48} color={GOLD} />
        </View>
        <Text style={s.appName}>Prashant Motor Training</Text>
        <Text style={s.subtitle}>Admin Portal</Text>
      </View>

      {/* Form */}
      <View style={s.card}>
        <Text style={s.cardTitle}>Welcome Back 👋</Text>
        <Text style={s.cardSub}>Sign in to manage your students</Text>

        <View style={s.inputWrap}>
          <Ionicons name="person-outline" size={20} color="#888" style={s.inputIcon} />
          <TextInput
            style={s.input}
            placeholder="Username"
            placeholderTextColor="#aaa"
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        <View style={s.inputWrap}>
          <Ionicons name="lock-closed-outline" size={20} color="#888" style={s.inputIcon} />
          <TextInput
            style={s.input}
            placeholder="Password"
            placeholderTextColor="#aaa"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPass}
            autoCapitalize="none"
          />
          <TouchableOpacity onPress={() => setShowPass(!showPass)} style={s.eyeBtn}>
            <Ionicons name={showPass ? 'eye-off-outline' : 'eye-outline'} size={20} color="#888" />
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={s.loginBtn} onPress={handleLogin} disabled={loading}>
          {loading
            ? <ActivityIndicator color={BLUE} />
            : <Text style={s.loginBtnText}>Login</Text>}
        </TouchableOpacity>

        <TouchableOpacity style={s.studentLink} onPress={() => navigation.navigate('StudentLogin')}>
          <Text style={s.studentLinkText}>Student? Login here →</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: BLUE },
  header: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 40 },
  logoBox: {
    width: 90, height: 90, borderRadius: 45,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  appName: { fontSize: 22, fontWeight: '800', color: '#fff', textAlign: 'center' },
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
  eyeBtn: { padding: 4 },
  loginBtn: {
    backgroundColor: GOLD, borderRadius: 12,
    height: 52, alignItems: 'center', justifyContent: 'center',
    marginTop: 8, elevation: 3,
  },
  loginBtnText: { fontSize: 16, fontWeight: '700', color: BLUE },
  studentLink: { alignItems: 'center', marginTop: 20 },
  studentLinkText: { color: BLUE, fontSize: 14, fontWeight: '600' },
});
