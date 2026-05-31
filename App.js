import 'react-native-gesture-handler';
import 'react-native-url-polyfill/auto';
import React, { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import { Provider as PaperProvider, DefaultTheme } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { useFonts } from 'expo-font';
import {
  Outfit_400Regular, Outfit_600SemiBold,
  Outfit_700Bold, Outfit_900Black,
} from '@expo-google-fonts/outfit';
import {
  Inter_400Regular, Inter_500Medium,
  Inter_600SemiBold, Inter_700Bold,
} from '@expo-google-fonts/inter';

import './src/i18n/index';
import AppNavigator from './src/navigation/AppNavigator';
import { ThemeProvider } from './src/context/ThemeContext';
import { requestNotificationPermission } from './src/lib/notifications';

const theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: '#1A3C6E',
    accent: '#FCD400',
    background: '#f8f9fa',
    surface: '#FFFFFF',
    text: '#1A1A2E',
    placeholder: '#9E9E9E',
    notification: '#FCD400',
  },
};

class ErrorBoundary extends React.Component {
  state = { error: null };
  static getDerivedStateFromError(error) { return { error }; }
  render() {
    if (this.state.error) {
      return (
        <View style={eb.container}>
          <Text style={eb.title}>🚨 App Error</Text>
          <ScrollView style={eb.scroll}>
            <Text style={eb.msg}>{this.state.error?.message || String(this.state.error)}</Text>
            <Text style={eb.stack}>{this.state.error?.stack}</Text>
          </ScrollView>
          <TouchableOpacity style={eb.btn} onPress={() => this.setState({ error: null })}>
            <Text style={eb.btnText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}

const eb = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1A3C6E', padding: 24, paddingTop: 60 },
  title:     { color: '#FCD400', fontSize: 22, fontWeight: '700', marginBottom: 16 },
  scroll:    { flex: 1, backgroundColor: '#fff', borderRadius: 8, padding: 12, marginBottom: 16 },
  msg:       { color: '#c0392b', fontSize: 14, fontWeight: '600', marginBottom: 8 },
  stack:     { color: '#555', fontSize: 11 },
  btn:       { backgroundColor: '#FCD400', padding: 14, borderRadius: 8, alignItems: 'center' },
  btnText:   { color: '#1A3C6E', fontWeight: '700', fontSize: 16 },
});

export default function App() {
  const [fontsLoaded] = useFonts({
    Outfit_400Regular,
    Outfit_600SemiBold,
    Outfit_700Bold,
    Outfit_900Black,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  // Request notification permission on first launch
  useEffect(() => {
    requestNotificationPermission();
  }, []);

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0F172A' }}>
        <ActivityIndicator color="#FCD400" size="large" />
      </View>
    );
  }

  return (
    <ErrorBoundary>
      <ThemeProvider>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <SafeAreaProvider>
            <PaperProvider theme={theme}>
              <StatusBar style="light" />
              <AppNavigator />
            </PaperProvider>
          </SafeAreaProvider>
        </GestureHandlerRootView>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
