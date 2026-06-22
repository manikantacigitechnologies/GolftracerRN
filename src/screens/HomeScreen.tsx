import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList, ShotStats } from '../types';
import { COLORS, FONTS, SIZES, SHADOWS } from '../utils/theme';
import { computeStats, loadAllShots } from '../utils/shotStore';
import { Shot } from '../types';
import { timeAgo } from '../utils/helpers';

export default function HomeScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [stats, setStats] = useState<ShotStats | null>(null);
  const [recentShots, setRecentShots] = useState<Shot[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    const [s, shots] = await Promise.all([computeStats(), loadAllShots()]);
    setStats(s);
    setRecentShots(shots.slice(0, 5));
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.accent} />
        }
      >
        {/* Header */}
        <LinearGradient
          colors={[COLORS.primaryDark, COLORS.primary, COLORS.background]}
          style={styles.header}
        >
          <View style={styles.headerContent}>
            <View>
              <Text style={styles.greeting}>Welcome back</Text>
              <Text style={styles.appName}>GolfTracer</Text>
            </View>
            <View style={styles.headerIcon}>
              <Ionicons name="golf" size={28} color={COLORS.accent} />
            </View>
          </View>

          {/* Quick Stats Row */}
          <View style={styles.quickStats}>
            <StatBadge
              icon="flash"
              value={stats?.totalShots ?? 0}
              label="Total Shots"
            />
            <StatBadge
              icon="calendar"
              value={stats?.thisWeek ?? 0}
              label="This Week"
            />
            <StatBadge
              icon="flag"
              value={`${stats?.landingRate ?? 0}%`}
              label="Landing Rate"
            />
          </View>
        </LinearGradient>

        {/* Big Camera Button */}
        <TouchableOpacity
          style={[styles.cameraBtn, SHADOWS.glow]}
          activeOpacity={0.85}
          onPress={() => navigation.navigate('Camera')}
        >
          <LinearGradient
            colors={[COLORS.accent, '#FFC107']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.cameraBtnGradient}
          >
            <Ionicons name="camera" size={32} color={COLORS.textDark} />
            <View>
              <Text style={styles.cameraBtnTitle}>Start Tracing</Text>
              <Text style={styles.cameraBtnSub}>Open camera to track your shot</Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color={COLORS.textDark} />
          </LinearGradient>
        </TouchableOpacity>

        {/* Feature Cards */}
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.featureRow}>
          <FeatureCard
            icon="time-outline"
            title="History"
            subtitle={`${stats?.totalShots ?? 0} shots`}
            onPress={() => navigation.navigate('MainTabs', { screen: 'History' } as any)}
          />
          <FeatureCard
            icon="stats-chart-outline"
            title="Statistics"
            subtitle="View trends"
            onPress={() => navigation.navigate('MainTabs', { screen: 'Stats' } as any)}
          />
        </View>

        {/* Recent Shots */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Shots</Text>
          {recentShots.length > 0 && (
            <TouchableOpacity onPress={() => navigation.navigate('MainTabs', { screen: 'History' } as any)}>
              <Text style={styles.seeAll}>See All</Text>
            </TouchableOpacity>
          )}
        </View>

        {recentShots.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="golf-outline" size={48} color={COLORS.textMuted} />
            <Text style={styles.emptyText}>No shots recorded yet</Text>
            <Text style={styles.emptySubtext}>
              Tap "Start Tracing" to capture your first shot
            </Text>
          </View>
        ) : (
          recentShots.map((shot) => (
            <TouchableOpacity
              key={shot.id}
              style={[styles.shotItem, SHADOWS.small]}
              onPress={() => navigation.navigate('ShotDetail', { shotId: shot.id })}
              activeOpacity={0.7}
            >
              <View style={styles.shotThumb}>
                <Ionicons name="videocam" size={24} color={COLORS.accent} />
              </View>
              <View style={styles.shotInfo}>
                <Text style={styles.shotTitle}>
                  {shot.clubType ?? 'Shot'} · {shot.trail.length} points
                </Text>
                <Text style={styles.shotTime}>{timeAgo(shot.timestamp)}</Text>
              </View>
              <View
                style={[
                  styles.shotBadge,
                  { backgroundColor: shot.landing ? COLORS.landingGreen + '30' : COLORS.warning + '30' },
                ]}
              >
                <Text
                  style={[
                    styles.shotBadgeText,
                    { color: shot.landing ? COLORS.landingGreen : COLORS.warning },
                  ]}
                >
                  {shot.landing ? 'Landed' : 'In Flight'}
                </Text>
              </View>
            </TouchableOpacity>
          ))
        )}

        <View style={{ height: 30 }} />
      </ScrollView>
    </View>
  );
}

// ── Sub-components ──────────────────────────────────

function StatBadge({
  icon,
  value,
  label,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  value: number | string;
  label: string;
}) {
  return (
    <View style={styles.statBadge}>
      <View style={styles.statBadgeIcon}>
        <Ionicons name={icon} size={16} color={COLORS.accent} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function FeatureCard({
  icon,
  title,
  subtitle,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.featureCard, SHADOWS.small]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Ionicons name={icon} size={28} color={COLORS.accent} />
      <Text style={styles.featureTitle}>{title}</Text>
      <Text style={styles.featureSub}>{subtitle}</Text>
    </TouchableOpacity>
  );
}

// ── Styles ──────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scroll: {
    paddingBottom: SIZES.tabBarHeight,
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: SIZES.lg,
    paddingBottom: SIZES.xl,
    borderBottomLeftRadius: SIZES.radiusXl,
    borderBottomRightRadius: SIZES.radiusXl,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SIZES.lg,
  },
  greeting: {
    fontSize: SIZES.fontMd,
    color: COLORS.textSecondary,
    ...FONTS.regular,
  },
  appName: {
    fontSize: SIZES.fontXxl,
    color: COLORS.white,
    ...FONTS.bold,
    letterSpacing: 1,
  },
  headerIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: SIZES.sm,
  },
  statBadge: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.radiusMd,
    padding: SIZES.md,
    alignItems: 'center',
  },
  statBadgeIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.accent + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  statValue: {
    fontSize: SIZES.fontXl,
    color: COLORS.white,
    ...FONTS.bold,
  },
  statLabel: {
    fontSize: SIZES.fontXs,
    color: COLORS.textMuted,
    ...FONTS.regular,
    marginTop: 2,
  },

  // Camera button
  cameraBtn: {
    marginHorizontal: SIZES.lg,
    marginTop: -SIZES.md,
    borderRadius: SIZES.radiusLg,
    overflow: 'hidden',
  },
  cameraBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SIZES.lg,
    gap: SIZES.md,
  },
  cameraBtnTitle: {
    fontSize: SIZES.fontXl,
    color: COLORS.textDark,
    ...FONTS.bold,
    flex: 1,
  },
  cameraBtnSub: {
    fontSize: SIZES.fontSm,
    color: COLORS.textDark,
    ...FONTS.regular,
    opacity: 0.7,
  },

  // Features
  sectionTitle: {
    fontSize: SIZES.fontXl,
    color: COLORS.white,
    ...FONTS.bold,
    paddingHorizontal: SIZES.lg,
    marginTop: SIZES.lg,
    marginBottom: SIZES.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingRight: SIZES.lg,
  },
  seeAll: {
    fontSize: SIZES.fontMd,
    color: COLORS.accent,
    ...FONTS.medium,
  },
  featureRow: {
    flexDirection: 'row',
    paddingHorizontal: SIZES.lg,
    gap: SIZES.md,
  },
  featureCard: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderRadius: SIZES.radiusMd,
    padding: SIZES.md,
    gap: 6,
  },
  featureTitle: {
    fontSize: SIZES.fontLg,
    color: COLORS.white,
    ...FONTS.semiBold,
  },
  featureSub: {
    fontSize: SIZES.fontSm,
    color: COLORS.textMuted,
  },

  // Recent shots
  shotItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    marginHorizontal: SIZES.lg,
    marginBottom: SIZES.sm,
    borderRadius: SIZES.radiusMd,
    padding: SIZES.md,
    gap: SIZES.md,
  },
  shotThumb: {
    width: 48,
    height: 48,
    borderRadius: SIZES.radiusSm,
    backgroundColor: COLORS.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shotInfo: {
    flex: 1,
  },
  shotTitle: {
    fontSize: SIZES.fontMd,
    color: COLORS.white,
    ...FONTS.medium,
  },
  shotTime: {
    fontSize: SIZES.fontSm,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  shotBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: SIZES.radiusFull,
  },
  shotBadgeText: {
    fontSize: SIZES.fontXs,
    ...FONTS.semiBold,
  },

  // Empty
  emptyState: {
    alignItems: 'center',
    paddingVertical: SIZES.xxl,
    gap: SIZES.sm,
  },
  emptyText: {
    fontSize: SIZES.fontLg,
    color: COLORS.textSecondary,
    ...FONTS.medium,
  },
  emptySubtext: {
    fontSize: SIZES.fontMd,
    color: COLORS.textMuted,
    textAlign: 'center',
    maxWidth: 260,
  },
});
