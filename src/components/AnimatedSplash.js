import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

export default function AnimatedSplash({ onFinish }) {
  const scale = useRef(new Animated.Value(0.3)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const textTranslate = useRef(new Animated.Value(20)).current;
  const ringScale = useRef(new Animated.Value(0.5)).current;
  const ringOpacity = useRef(new Animated.Value(0)).current;
  
  // Pulse animation for continuous loading feel
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.delay(100),
      Animated.parallel([
        Animated.spring(scale, { toValue: 1, friction: 6, tension: 40, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 600, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(textOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.spring(textTranslate, { toValue: 0, friction: 8, useNativeDriver: true }),
        Animated.timing(ringOpacity, { toValue: 0.6, duration: 400, useNativeDriver: true }),
        Animated.spring(ringScale, { toValue: 1.5, friction: 10, useNativeDriver: true }),
      ]),
      Animated.delay(1000), // Hold the splash screen
      
      // Exit animation
      Animated.parallel([
        Animated.timing(opacity, { toValue: 0, duration: 300, useNativeDriver: true }),
        Animated.timing(textOpacity, { toValue: 0, duration: 300, useNativeDriver: true }),
        Animated.timing(ringOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
        Animated.spring(scale, { toValue: 1.2, friction: 20, useNativeDriver: true })
      ])
    ]).start(() => {
      onFinish && onFinish();
    });

    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.05, duration: 800, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 800, useNativeDriver: true })
      ])
    ).start();
  }, []);

  return (
    <LinearGradient colors={['#0F172A', '#1E293B']} style={styles.container}>
      <Animated.View style={[styles.ring, { opacity: ringOpacity, transform: [{ scale: ringScale }] }]} />
      
      <Animated.View style={[styles.logoContainer, { opacity, transform: [{ scale }, { scale: pulse }] }]}>
        <LinearGradient colors={['#FCD400', '#F59E0B']} style={styles.logoBadge}>
          <Text style={styles.logoLetter}>P</Text>
        </LinearGradient>
      </Animated.View>
      
      <Animated.View style={[styles.textContainer, { opacity: textOpacity, transform: [{ translateY: textTranslate }] }]}>
        <Text style={styles.title}>PRASHANT</Text>
        <Text style={styles.subtitle}>DRIVING ACADEMY</Text>
      </Animated.View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  ring: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 2,
    borderColor: '#FCD400',
  },
  logoContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#FCD400',
    shadowOpacity: 0.4,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 10 },
    elevation: 15,
  },
  logoBadge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoLetter: {
    fontFamily: 'Outfit_900Black',
    fontSize: 48,
    color: '#0F172A',
    includeFontPadding: false,
    lineHeight: 52,
  },
  textContainer: {
    alignItems: 'center',
  },
  title: {
    fontFamily: 'Outfit_900Black',
    fontSize: 36,
    color: '#FFF',
    letterSpacing: 2,
  },
  subtitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 14,
    color: '#FCD400',
    letterSpacing: 6,
    marginTop: 4,
  }
});
