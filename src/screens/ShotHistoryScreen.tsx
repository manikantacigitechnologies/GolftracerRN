import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import { RootStackParamList, Shot } from '../types';
import { COLORS, FONTS, SIZES, SHADOWS } from '../utils/theme';
import { loadAllShots, deleteShot } from '../utils/shotStore';
import { formatDate, formatTime, timeAgo } from '../utils/helpers';

export default function ShotHistoryScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [shots, setShots] = useState<Shot[]>([]);
  const [filter, setFilter] = useState<'all' | 'landed' | 'inflight'>('all');

  const loadData = useCallback(async () => {
    const all = await loadAllShots();
    setShots(all);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const handleDelete = (shot: Shot) => {
    Alert.alert('Delete Shot', 'Are you sure you want to delete this shot?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteShot(shot.id);
          loadData();
        },
      },
    ]);
  };

  const filteredShots = shots.filter((s) => {
    if (filter === 'landed') return s.landing !== null;
    if (filter === 'inflight') return s.landing === null;
    return true;
  });

  // Group shots by date
  const grouped = filteredShots.reduce<Record<string, Shot[]>>((acc, shot) => {
    const date = formatDate(shot.timestamp);
    if (!acc[date]) acc[date] = [];
    acc[date].push(shot);
    return acc;
  }, {});

  const renderShot = ({ item }: { item: Shot }) => (
    <TouchableOpacity
      style={[styles.shotCard, SHADOWS.small]}
      onPress={() => navigation.navigate('ShotDetail', { shotId: item.id })}
      activeOpacity={0.7}
    >
      <View style={styles.shotLeft}>
        <View style={styles.thumbnail}>
          <Ionicons
            name={item.videoUri ? 'videocam' : 'image'}
            size={28}
            color={COLORS.accent}
          />
        </View>
      </View>

      <View style={styles.shotMiddle}>
        <Text style={styles.shotClub}>{item.clubType ?? 'Shot'}</Text>
        <View style={styles.shotMeta}>
          <Ionicons name="time-outline" size={12} color={COLORS.textMuted} />
          <Text style={styles.shotMetaText}>{formatTime(item.timestamp)}</Text>
          <Text style={styles.shotMetaDot}>·</Text>
          <Ionicons name="analytics-outline" size={12} color={COLORS.textMuted} />
          <Text style={styles.shotMetaText}>{item.trail.length} pts</Text>
        </View>
        {item.notes ? (
          <Text style={styles.shotNote} numberOfLines={1}>
            {item.notes}
          </Text>
        ) : null}
      </View>

      <View style={styles.shotRight}>
        <View
          style={[
            styles.landingBadge,
            {
              backgroundColor: item.landing
                ? COLORS.landingGreen + '20'
                : COLORS.warning + '20',
            },
          ]}
        >
          <View
            style={[
              styles.landingDot,
              {
                backgroundColor: item.landing
                  ? COLORS.landingGreen
                  : COLORS.warning,
              },
            ]}
          />
        </View>

        <TouchableOpacity
          style={styles.deleteBtn}
          onPress={() => handleDelete(item)}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="trash-outline" size={18} color={COLORS.error} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  const renderSectionHeader = (date: string) => (
    <Text style={styles.sectionDate}>{date}</Text>
  );

  // Build flat list data with section headers
  const listData: Array<{ type: 'header'; date: string } | { type: 'shot'; shot: Shot }> = [];
  Object.entries(grouped).forEach(([date, dateShots]) => {
    listData.push({ type: 'header', date });
    dateShots.forEach((shot) => listData.push({ type: 'shot', shot }));
  });

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <LinearGradient
        colors={[COLORS.primaryDark, COLORS.background]}
        style={styles.header}
      >
        <Text style={styles.headerTitle}>Shot History</Text>
        <Text style={styles.headerSub}>{shots.length} shots recorded</Text>
      </LinearGradient>

      {/* Filter pills */}
      <View style={styles.filterRow}>
        {(['all', 'landed', 'inflight'] as const).map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.filterPill, filter === f && styles.filterPillActive]}
            onPress={() => setFilter(f)}
          >
            <Text
              style={[
                styles.filterText,
                filter === f && styles.filterTextActive,
              ]}
            >
              {f === 'all' ? 'All' : f === 'landed' ? 'Landed' : 'In Flight'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Shot list */}
      {filteredShots.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="golf-outline" size={56} color={COLORS.textMuted} />
          <Text style={styles.emptyTitle}>No shots found</Text>
          <Text style={styles.emptyText}>
            {shots.length === 0
              ? 'Start tracing to build your shot history'
              : 'No shots match the selected filter'}
          </Text>
          {shots.length === 0 && (
            <TouchableOpacity
              style={styles.emptyBtn}
              onPress={() => navigation.navigate('Camera')}
            >
              <LinearGradient
                colors={[COLORS.accent, COLORS.accentLight]}
                style={styles.emptyBtnGradient}
              >
                <Ionicons name="camera" size={18} color={COLORS.textDark} />
                <Text style={styles.emptyBtnText}>Open Camera</Text>
              </LinearGradient>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <FlatList
          data={listData}
          keyExtractor={(item, i) =>
            item.type === 'header' ? `h-${item.date}` : `s-${item.shot.id}`
          }
          renderItem={({ item }) =>
            item.type === 'header' ? (
              renderSectionHeader(item.date)
            ) : (
              renderShot({ item: item.shot })
            )
          }
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
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

  // Filters
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: SIZES.lg,
    paddingVertical: SIZES.md,
    gap: SIZES.sm,
  },
  filterPill: {
    paddingHorizontal: SIZES.md,
    paddingVertical: 8,
    borderRadius: SIZES.radiusFull,
    backgroundColor: COLORS.surface,
  },
  filterPillActive: {
    backgroundColor: COLORS.accent,
  },
  filterText: {
    fontSize: SIZES.fontSm,
    color: COLORS.textSecondary,
    ...FONTS.medium,
  },
  filterTextActive: {
    color: COLORS.textDark,
  },

  // List
  list: {
    paddingHorizontal: SIZES.lg,
    paddingBottom: SIZES.tabBarHeight + SIZES.lg,
  },
  sectionDate: {
    fontSize: SIZES.fontSm,
    color: COLORS.textMuted,
    ...FONTS.semiBold,
    marginTop: SIZES.md,
    marginBottom: SIZES.sm,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },

  // Shot card
  shotCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.card,
    borderRadius: SIZES.radiusMd,
    padding: SIZES.md,
    marginBottom: SIZES.sm,
    alignItems: 'center',
  },
  shotLeft: {
    marginRight: SIZES.md,
  },
  thumbnail: {
    width: 56,
    height: 56,
    borderRadius: SIZES.radiusSm,
    backgroundColor: COLORS.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shotMiddle: {
    flex: 1,
    gap: 4,
  },
  shotClub: {
    fontSize: SIZES.fontLg,
    color: COLORS.white,
    ...FONTS.semiBold,
  },
  shotMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  shotMetaText: {
    fontSize: SIZES.fontXs,
    color: COLORS.textMuted,
  },
  shotMetaDot: {
    color: COLORS.textMuted,
    fontSize: SIZES.fontXs,
  },
  shotNote: {
    fontSize: SIZES.fontXs,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
  },
  shotRight: {
    alignItems: 'center',
    gap: SIZES.sm,
  },
  landingBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  landingDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  deleteBtn: {
    padding: 4,
  },

  // Empty
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: SIZES.md,
    paddingBottom: SIZES.tabBarHeight,
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
    maxWidth: 260,
  },
  emptyBtn: {
    borderRadius: SIZES.radiusFull,
    overflow: 'hidden',
    marginTop: SIZES.sm,
  },
  emptyBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SIZES.lg,
    paddingVertical: SIZES.md,
    gap: 8,
  },
  emptyBtnText: {
    fontSize: SIZES.fontMd,
    color: COLORS.textDark,
    ...FONTS.bold,
  },
});
