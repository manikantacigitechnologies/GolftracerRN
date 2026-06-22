import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  StatusBar,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS, FONTS, SIZES, SHADOWS } from '../utils/theme';
import { computeStats, loadAllShots } from '../utils/shotStore';
import { ShotStats, Shot } from '../types';
import { formatDate } from '../utils/helpers';

const { width: screenWidth } = Dimensions.get('window');

export default function StatsScreen() {
  const [stats, setStats] = useState<ShotStats | null>(null);
  const [weeklyData, setWeeklyData] = useState<number[]>([0, 0, 0, 0, 0, 0, 0]);
  const [clubBreakdown, setClubBreakdown] = useState<Record<string, number>>({});

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const loadData = async () => {
    const [s, shots] = await Promise.all([computeStats(), loadAllShots()]);
    setStats(s);

    // Weekly breakdown (last 7 days)
    const now = Date.now();
    const days = [0, 0, 0, 0, 0, 0, 0];
    const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    shots.forEach((shot) => {
      const daysAgo = Math.floor((now - shot.timestamp) / (24 * 60 * 60 * 1000));
      if (daysAgo < 7) {
        const dayOfWeek = new Date(shot.timestamp).getDay();
        // Convert Sunday=0 to Monday=0 index
        const idx = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
        days[idx]++;
      }
    });
    setWeeklyData(days);

    // Club breakdown
    const clubs: Record<string, number> = {};
    shots.forEach((shot) => {
      const club = shot.clubType ?? 'Unknown';
      clubs[club] = (clubs[club] || 0) + 1;
    });
    setClubBreakdown(clubs);
  };

  const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const maxWeekly = Math.max(...weeklyData, 1);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Header */}
        <LinearGradient
          colors={[COLORS.primaryDark, COLORS.background]}
          style={styles.header}
        >
          <Text style={styles.headerTitle}>Statistics</Text>
          <Text style={styles.headerSub}>Track your progress</Text>
        </LinearGradient>

        {/* Summary Cards */}
        <View style={styles.summaryRow}>
          <SummaryCard
            icon="flash"
            value={`${stats?.totalShots ?? 0}`}
            label="Total Shots"
            gradient={[COLORS.accent, '#FFC107']}
          />
          <SummaryCard
            icon="calendar"
            value={`${stats?.sessionsCount ?? 0}`}
            label="Sessions"
            gradient={[COLORS.primary, COLORS.primaryLight]}
          />
        </View>

        <View style={styles.summaryRow}>
          <SummaryCard
            icon="trending-up"
            value={`${stats?.thisWeek ?? 0}`}
            label="This Week"
            gradient={[COLORS.trailOrange, '#FF6E40']}
          />
          <SummaryCard
            icon="flag"
            value={`${stats?.landingRate ?? 0}%`}
            label="Landing Rate"
            gradient={[COLORS.landingGreen, '#69F0AE']}
          />
        </View>

        {/* Weekly chart */}
        <View style={[styles.chartCard, SHADOWS.small]}>
          <View style={styles.chartHeader}>
            <Ionicons name="bar-chart-outline" size={20} color={COLORS.accent} />
            <Text style={styles.chartTitle}>Weekly Activity</Text>
          </View>

          <View style={styles.barChart}>
            {weeklyData.map((val, i) => (
              <View key={i} style={styles.barColumn}>
                <View style={styles.barContainer}>
                  <LinearGradient
                    colors={[COLORS.accent, COLORS.accentLight]}
                    style={[
                      styles.bar,
                      {
                        height: `${Math.max((val / maxWeekly) * 100, 4)}%`,
                      },
                    ]}
                  />
                </View>
                <Text style={styles.barLabel}>{dayLabels[i]}</Text>
                <Text style={styles.barValue}>{val}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Additional stats */}
        <View style={[styles.chartCard, SHADOWS.small]}>
          <View style={styles.chartHeader}>
            <Ionicons name="analytics-outline" size={20} color={COLORS.accent} />
            <Text style={styles.chartTitle}>Performance</Text>
          </View>

          <StatRow
            label="Avg Trail Points"
            value={`${stats?.avgTrailPoints ?? 0}`}
            icon="git-branch-outline"
          />
          <StatRow
            label="Longest Trail"
            value={`${stats?.longestTrail ?? 0} points`}
            icon="resize-outline"
          />
          <StatRow
            label="Total Sessions"
            value={`${stats?.sessionsCount ?? 0} days`}
            icon="calendar-outline"
          />
          <StatRow
            label="Landing Rate"
            value={`${stats?.landingRate ?? 0}%`}
            icon="flag-outline"
            valueColor={
              (stats?.landingRate ?? 0) >= 70
                ? COLORS.landingGreen
                : (stats?.landingRate ?? 0) >= 40
                ? COLORS.warning
                : COLORS.error
            }
          />
        </View>

        {/* Club breakdown */}
        {Object.keys(clubBreakdown).length > 0 && (
          <View style={[styles.chartCard, SHADOWS.small]}>
            <View style={styles.chartHeader}>
              <Ionicons name="golf-outline" size={20} color={COLORS.accent} />
              <Text style={styles.chartTitle}>Club Breakdown</Text>
            </View>

            {Object.entries(clubBreakdown)
              .sort(([, a], [, b]) => b - a)
              .map(([club, count]) => {
                const total = stats?.totalShots ?? 1;
                const pct = Math.round((count / total) * 100);
                return (
                  <View key={club} style={styles.clubRow}>
                    <Text style={styles.clubName}>{club}</Text>
                    <View style={styles.clubBarBg}>
                      <LinearGradient
                        colors={[COLORS.accent, COLORS.accentLight]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={[styles.clubBar, { width: `${Math.max(pct, 5)}%` }]}
                      />
                    </View>
                    <Text style={styles.clubCount}>{count}</Text>
                  </View>
                );
              })}
          </View>
        )}

        {/* Empty state */}
        {(stats?.totalShots ?? 0) === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="bar-chart-outline" size={56} color={COLORS.textMuted} />
            <Text style={styles.emptyTitle}>No data yet</Text>
            <Text style={styles.emptyText}>
              Start recording shots to see your statistics and trends here
            </Text>
          </View>
        )}

        <View style={{ height: SIZES.tabBarHeight + 20 }} />
      </ScrollView>
    </View>
  );
}

// ── Sub-components ──────────────────────────────────

function SummaryCard({
  icon,
  value,
  label,
  gradient,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  value: string;
  label: string;
  gradient: [string, string];
}) {
  return (
    <View style={[styles.summaryCard, SHADOWS.small]}>
      <LinearGradient
        colors={gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.summaryIconBg}
      >
        <Ionicons name={icon} size={20} color={COLORS.white} />
      </LinearGradient>
      <Text style={styles.summaryValue}>{value}</Text>
      <Text style={styles.summaryLabel}>{label}</Text>
    </View>
  );
}

function StatRow({
  label,
  value,
  icon,
  valueColor,
}: {
  label: string;
  value: string;
  icon: keyof typeof Ionicons.glyphMap;
  valueColor?: string;
}) {
  return (
    <View style={styles.statRow}>
      <Ionicons name={icon} size={18} color={COLORS.textMuted} />
      <Text style={styles.statRowLabel}>{label}</Text>
      <Text style={[styles.statRowValue, valueColor ? { color: valueColor } : null]}>
        {value}
      </Text>
    </View>
  );
}

// ── Styles ──────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scroll: {
    paddingBottom: SIZES.xl,
  },
  header: {
    paddingTop: 60,
    paddingBottom: SIZES.lg,
    paddingHorizontal: SIZES.lg,
  },
  headerTitle: {
    fontSize: SIZES.fontXxl,
    color: COLORS.white,
    ...FONTS.bold,
  },
  headerSub: {
    fontSize: SIZES.fontMd,
    color: COLORS.textSecondary,
    marginTop: 4,
  },

  // Summary cards
  summaryRow: {
    flexDirection: 'row',
    paddingHorizontal: SIZES.lg,
    gap: SIZES.sm,
    marginBottom: SIZES.sm,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderRadius: SIZES.radiusMd,
    padding: SIZES.md,
    gap: 6,
  },
  summaryIconBg: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryValue: {
    fontSize: SIZES.fontXxl,
    color: COLORS.white,
    ...FONTS.bold,
  },
  summaryLabel: {
    fontSize: SIZES.fontSm,
    color: COLORS.textMuted,
  },

  // Chart card
  chartCard: {
    backgroundColor: COLORS.card,
    borderRadius: SIZES.radiusMd,
    padding: SIZES.md,
    marginHorizontal: SIZES.lg,
    marginTop: SIZES.md,
  },
  chartHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SIZES.sm,
    marginBottom: SIZES.md,
  },
  chartTitle: {
    fontSize: SIZES.fontLg,
    color: COLORS.white,
    ...FONTS.semiBold,
  },

  // Bar chart
  barChart: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 140,
    paddingTop: SIZES.md,
  },
  barColumn: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  barContainer: {
    flex: 1,
    width: '60%',
    justifyContent: 'flex-end',
    borderRadius: 4,
    overflow: 'hidden',
  },
  bar: {
    width: '100%',
    borderRadius: 4,
    minHeight: 4,
  },
  barLabel: {
    fontSize: SIZES.fontXs,
    color: COLORS.textMuted,
    ...FONTS.medium,
  },
  barValue: {
    fontSize: SIZES.fontXs,
    color: COLORS.textSecondary,
    ...FONTS.bold,
  },

  // Stat rows
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SIZES.sm,
    gap: SIZES.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  statRowLabel: {
    flex: 1,
    fontSize: SIZES.fontMd,
    color: COLORS.textSecondary,
  },
  statRowValue: {
    fontSize: SIZES.fontMd,
    color: COLORS.white,
    ...FONTS.bold,
  },

  // Club breakdown
  clubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SIZES.sm,
    gap: SIZES.sm,
  },
  clubName: {
    width: 70,
    fontSize: SIZES.fontSm,
    color: COLORS.textSecondary,
    ...FONTS.medium,
  },
  clubBarBg: {
    flex: 1,
    height: 16,
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 8,
    overflow: 'hidden',
  },
  clubBar: {
    height: '100%',
    borderRadius: 8,
  },
  clubCount: {
    width: 30,
    fontSize: SIZES.fontSm,
    color: COLORS.white,
    ...FONTS.bold,
    textAlign: 'right',
  },

  // Empty
  emptyState: {
    alignItems: 'center',
    paddingVertical: SIZES.xxl,
    gap: SIZES.md,
  },
  emptyTitle: {
    fontSize: SIZES.fontXl,
    color: COLORS.textSecondary,
    ...FONTS.semiBold,
  },
  emptyText: {
    fontSize: SIZES.fontMd,
    color: COLORS.textMuted,
    textAlign: 'center',
    maxWidth: 280,
  },
});
