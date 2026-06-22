import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, StatusBar } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { COLORS, FONTS, SIZES } from '../utils/theme';
import { isOnboardingDone } from '../utils/shotStore';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Splash'>;
};

export default function SplashScreen({ navigation }: Props) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.5)).current;
  const subtitleAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Animate in
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 6,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();

    // Subtitle fade in after logo
    setTimeout(() => {
      Animated.timing(subtitleAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }).start();
    }, 500);

    // Navigate after delay
    const timer = setTimeout(async () => {
      const done = await isOnboardingDone();
      navigation.replace(done ? 'MainTabs' : 'Onboarding');
    }, 2500);

    return () => clearTimeout(timer);
  }, []);

  return (
    <LinearGradient
      colors={[COLORS.primaryDark, COLORS.background, '#050A05']}
      style={styles.container}
    >
      <StatusBar barStyle="light-content" />

      <Animated.View
        style={[
          styles.logoContainer,
          { opacity: fadeAnim, transform: [{ scale: scaleAnim }] },
        ]}
      >
        <View style={styles.iconCircle}>
          <Ionicons name="golf" size={48} color={COLORS.accent} />
        </View>
        <Text style={styles.title}>GolfTracer</Text>
      </Animated.View>

      <Animated.Text style={[styles.subtitle, { opacity: subtitleAnim }]}>
        Track Every Shot. Trace Every Flight.
      </Animated.Text>

      <View style={styles.footer}>
        <View style={styles.dotRow}>
          <View style={[styles.dot, { backgroundColor: COLORS.accent }]} />
          <View style={[styles.dot, { backgroundColor: COLORS.trailOrange }]} />
          <View style={[styles.dot, { backgroundColor: COLORS.landingGreen }]} />
        </View>
        <Text style={styles.version}>v2.0</Text>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: SIZES.lg,
  },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.surface,
    borderWidth: 2,
    borderColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SIZES.md,
  },
  title: {
    fontSize: SIZES.fontHero,
    color: COLORS.white,
    ...FONTS.bold,
    letterSpacing: 2,
  },
  subtitle: {
    fontSize: SIZES.fontLg,
    color: COLORS.textSecondary,
    ...FONTS.light,
    letterSpacing: 1,
    marginTop: SIZES.sm,
  },
  footer: {
    position: 'absolute',
    bottom: 60,
    alignItems: 'center',
  },
  dotRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: SIZES.sm,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  version: {
    fontSize: SIZES.fontSm,
    color: COLORS.textMuted,
  },
});
