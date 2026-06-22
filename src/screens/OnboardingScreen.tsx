import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  FlatList,
  TouchableOpacity,
  StatusBar,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { COLORS, FONTS, SIZES, SHADOWS } from '../utils/theme';
import { markOnboardingDone } from '../utils/shotStore';

const { width } = Dimensions.get('window');

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Onboarding'>;
};

const slides = [
  {
    id: '1',
    icon: 'videocam' as const,
    title: 'Capture Your Swing',
    description:
      'Point your camera at the ball. GolfTracer automatically detects when you swing and starts recording — hands-free.',
    color: COLORS.primary,
  },
  {
    id: '2',
    icon: 'analytics' as const,
    title: 'Trace the Flight',
    description:
      'Watch the ball path appear in real-time as a glowing trail overlay. See exactly where your shot went, from launch to landing.',
    color: COLORS.trailOrange,
  },
  {
    id: '3',
    icon: 'trophy' as const,
    title: 'Review & Improve',
    description:
      'Replay every shot with the flight trail overlaid on video. Track your stats over time and see your game improve.',
    color: COLORS.accent,
  },
];

export default function OnboardingScreen({ navigation }: Props) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const scrollX = useRef(new Animated.Value(0)).current;

  const handleNext = async () => {
    if (currentIndex < slides.length - 1) {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1 });
      setCurrentIndex(currentIndex + 1);
    } else {
      await markOnboardingDone();
      navigation.replace('MainTabs');
    }
  };

  const handleSkip = async () => {
    await markOnboardingDone();
    navigation.replace('MainTabs');
  };

  const renderSlide = ({ item }: { item: (typeof slides)[number] }) => (
    <View style={styles.slide}>
      <View style={[styles.iconCircle, { borderColor: item.color }]}>
        <Ionicons name={item.icon} size={56} color={item.color} />
      </View>
      <Text style={styles.slideTitle}>{item.title}</Text>
      <Text style={styles.slideDescription}>{item.description}</Text>
    </View>
  );

  return (
    <LinearGradient
      colors={[COLORS.primaryDark, COLORS.background]}
      style={styles.container}
    >
      <StatusBar barStyle="light-content" />

      {/* Skip */}
      <TouchableOpacity style={styles.skipBtn} onPress={handleSkip}>
        <Text style={styles.skipText}>Skip</Text>
      </TouchableOpacity>

      {/* Slides */}
      <FlatList
        ref={flatListRef}
        data={slides}
        renderItem={renderSlide}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          { useNativeDriver: false }
        )}
        onMomentumScrollEnd={(e) => {
          const idx = Math.round(e.nativeEvent.contentOffset.x / width);
          setCurrentIndex(idx);
        }}
      />

      {/* Bottom section */}
      <View style={styles.bottomSection}>
        {/* Dots */}
        <View style={styles.dotsContainer}>
          {slides.map((_, i) => {
            const inputRange = [(i - 1) * width, i * width, (i + 1) * width];
            const dotWidth = scrollX.interpolate({
              inputRange,
              outputRange: [8, 24, 8],
              extrapolate: 'clamp',
            });
            const dotOpacity = scrollX.interpolate({
              inputRange,
              outputRange: [0.3, 1, 0.3],
              extrapolate: 'clamp',
            });
            return (
              <Animated.View
                key={i}
                style={[
                  styles.dot,
                  { width: dotWidth, opacity: dotOpacity },
                  i === currentIndex && { backgroundColor: COLORS.accent },
                ]}
              />
            );
          })}
        </View>

        {/* Next / Get Started */}
        <TouchableOpacity
          style={[styles.nextBtn, SHADOWS.glow]}
          onPress={handleNext}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={[COLORS.accent, COLORS.accentLight]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.nextBtnGradient}
          >
            <Text style={styles.nextBtnText}>
              {currentIndex === slides.length - 1 ? 'Get Started' : 'Next'}
            </Text>
            <Ionicons
              name={
                currentIndex === slides.length - 1
                  ? 'checkmark'
                  : 'arrow-forward'
              }
              size={20}
              color={COLORS.textDark}
            />
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  skipBtn: {
    position: 'absolute',
    top: 56,
    right: 24,
    zIndex: 10,
    padding: SIZES.sm,
  },
  skipText: {
    color: COLORS.textSecondary,
    fontSize: SIZES.fontLg,
    ...FONTS.medium,
  },
  slide: {
    width,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SIZES.xl,
    paddingTop: 120,
  },
  iconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 2,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SIZES.xl,
  },
  slideTitle: {
    fontSize: SIZES.fontXxl,
    color: COLORS.white,
    ...FONTS.bold,
    textAlign: 'center',
    marginBottom: SIZES.md,
  },
  slideDescription: {
    fontSize: SIZES.fontLg,
    color: COLORS.textSecondary,
    ...FONTS.regular,
    textAlign: 'center',
    lineHeight: 24,
    maxWidth: 320,
  },
  bottomSection: {
    paddingBottom: 50,
    alignItems: 'center',
  },
  dotsContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: SIZES.xl,
  },
  dot: {
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.textSecondary,
  },
  nextBtn: {
    borderRadius: SIZES.radiusFull,
    overflow: 'hidden',
  },
  nextBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SIZES.xl,
    paddingVertical: SIZES.md,
    gap: 8,
  },
  nextBtnText: {
    fontSize: SIZES.fontLg,
    color: COLORS.textDark,
    ...FONTS.bold,
  },
});
