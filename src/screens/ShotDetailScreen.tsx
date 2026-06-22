import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  StatusBar,
  Dimensions,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Video, ResizeMode } from 'expo-av';
import { RootStackParamList, Shot, ClubType } from '../types';
import { COLORS, FONTS, SIZES, SHADOWS } from '../utils/theme';
import { loadAllShots, updateShot, deleteShot } from '../utils/shotStore';
import { formatDate, formatTime, formatDuration } from '../utils/helpers';

const { width: screenWidth } = Dimensions.get('window');

const CLUB_OPTIONS: ClubType[] = [
  'Driver', '3 Wood', '5 Wood',
  '3 Iron', '4 Iron', '5 Iron', '6 Iron', '7 Iron', '8 Iron', '9 Iron',
  'PW', 'SW', 'LW', 'Putter',
];

export default function ShotDetailScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'ShotDetail'>>();
  const [shot, setShot] = useState<Shot | null>(null);
  const [notes, setNotes] = useState('');
  const [showClubPicker, setShowClubPicker] = useState(false);

  useEffect(() => {
    loadShot();
  }, []);

  const loadShot = async () => {
    const shots = await loadAllShots();
    const found = shots.find((s) => s.id === route.params.shotId);
    if (found) {
      setShot(found);
      setNotes(found.notes);
    }
  };

  const handleClubSelect = async (club: ClubType) => {
    if (!shot) return;
    const updated = { ...shot, clubType: club };
    await updateShot(updated);
    setShot(updated);
    setShowClubPicker(false);
  };

  const handleSaveNotes = async () => {
    if (!shot) return;
    const updated = { ...shot, notes };
    await updateShot(updated);
    setShot(updated);
  };

  const handleDelete = () => {
    Alert.alert('Delete Shot', 'This action cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          if (shot) {
            await deleteShot(shot.id);
            navigation.goBack();
          }
        },
      },
    ]);
  };

  if (!shot) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" />
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading shot...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Back button header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={24} color={COLORS.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Shot Detail</Text>
          <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete}>
            <Ionicons name="trash-outline" size={22} color={COLORS.error} />
          </TouchableOpacity>
        </View>

        {/* Video player */}
        <View style={styles.videoContainer}>
          {shot.videoUri ? (
            <Video
              source={{ uri: shot.videoUri }}
              style={styles.video}
              useNativeControls
              resizeMode={ResizeMode.CONTAIN}
              isLooping={false}
            />
          ) : shot.thumbnailUri ? (
            <View style={styles.videoPlaceholder}>
              <Ionicons name="image" size={48} color={COLORS.accent} />
              <Text style={styles.placeholderText}>Photo captured</Text>
            </View>
          ) : (
            <View style={styles.videoPlaceholder}>
              <Ionicons name="videocam-off-outline" size={48} color={COLORS.textMuted} />
              <Text style={styles.placeholderText}>No video available</Text>
            </View>
          )}
        </View>

        {/* Shot info cards */}
        <View style={styles.infoGrid}>
          <InfoCard
            icon="calendar-outline"
            label="Date"
            value={formatDate(shot.timestamp)}
          />
          <InfoCard
            icon="time-outline"
            label="Time"
            value={formatTime(shot.timestamp)}
          />
          <InfoCard
            icon="analytics-outline"
            label="Trail Points"
            value={`${shot.trail.length}`}
          />
          <InfoCard
            icon="flag-outline"
            label="Landing"
            value={shot.landing ? 'Detected' : 'N/A'}
            valueColor={shot.landing ? COLORS.landingGreen : COLORS.textMuted}
          />
        </View>

        {/* Club selector */}
        <TouchableOpacity
          style={[styles.sectionCard, SHADOWS.small]}
          onPress={() => setShowClubPicker(!showClubPicker)}
        >
          <View style={styles.sectionRow}>
            <Ionicons name="golf-outline" size={22} color={COLORS.accent} />
            <Text style={styles.sectionLabel}>Club Used</Text>
            <Text style={styles.sectionValue}>
              {shot.clubType ?? 'Tap to select'}
            </Text>
            <Ionicons
              name={showClubPicker ? 'chevron-up' : 'chevron-down'}
              size={18}
              color={COLORS.textMuted}
            />
          </View>
        </TouchableOpacity>

        {showClubPicker && (
          <View style={styles.clubGrid}>
            {CLUB_OPTIONS.map((club) => (
              <TouchableOpacity
                key={club}
                style={[
                  styles.clubChip,
                  shot.clubType === club && styles.clubChipActive,
                ]}
                onPress={() => handleClubSelect(club)}
              >
                <Text
                  style={[
                    styles.clubChipText,
                    shot.clubType === club && styles.clubChipTextActive,
                  ]}
                >
                  {club}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Notes */}
        <View style={[styles.sectionCard, SHADOWS.small]}>
          <View style={styles.sectionRow}>
            <Ionicons name="document-text-outline" size={22} color={COLORS.accent} />
            <Text style={styles.sectionLabel}>Notes</Text>
          </View>
          <TextInput
            style={styles.notesInput}
            value={notes}
            onChangeText={setNotes}
            onBlur={handleSaveNotes}
            placeholder="Add notes about this shot..."
            placeholderTextColor={COLORS.textMuted}
            multiline
            maxLength={500}
          />
        </View>

        {/* Trail visualization placeholder */}
        {shot.trail.length > 0 && (
          <View style={[styles.sectionCard, SHADOWS.small]}>
            <View style={styles.sectionRow}>
              <Ionicons name="git-branch-outline" size={22} color={COLORS.trailOrange} />
              <Text style={styles.sectionLabel}>Flight Path</Text>
              <Text style={styles.sectionValue}>{shot.trail.length} points</Text>
            </View>
            <View style={styles.trailPreview}>
              {/* Simple trail visualization */}
              <View style={styles.trailLine}>
                <View style={[styles.trailDot, { backgroundColor: COLORS.accent }]} />
                <View style={styles.trailPath} />
                <View
                  style={[
                    styles.trailDot,
                    {
                      backgroundColor: shot.landing
                        ? COLORS.landingGreen
                        : COLORS.trailOrange,
                    },
                  ]}
                />
              </View>
              <View style={styles.trailLabels}>
                <Text style={styles.trailLabelText}>Launch</Text>
                <Text style={styles.trailLabelText}>
                  {shot.landing ? 'Landing' : 'Last Seen'}
                </Text>
              </View>
            </View>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

function InfoCard({
  icon,
  label,
  value,
  valueColor,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  valueColor?: string;
}) {
  return (
    <View style={[styles.infoCard, SHADOWS.small]}>
      <Ionicons name={icon} size={20} color={COLORS.accent} />
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={[styles.infoValue, valueColor ? { color: valueColor } : null]}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scroll: {
    paddingBottom: SIZES.xl,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: COLORS.textMuted,
    fontSize: SIZES.fontLg,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 56,
    paddingHorizontal: SIZES.md,
    paddingBottom: SIZES.md,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: SIZES.fontXl,
    color: COLORS.white,
    ...FONTS.bold,
    textAlign: 'center',
  },
  deleteBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Video
  videoContainer: {
    marginHorizontal: SIZES.lg,
    borderRadius: SIZES.radiusMd,
    overflow: 'hidden',
    backgroundColor: COLORS.surface,
    marginBottom: SIZES.md,
  },
  video: {
    width: '100%',
    height: (screenWidth - SIZES.lg * 2) * 0.5625, // 16:9
  },
  videoPlaceholder: {
    width: '100%',
    height: (screenWidth - SIZES.lg * 2) * 0.5625,
    alignItems: 'center',
    justifyContent: 'center',
    gap: SIZES.sm,
  },
  placeholderText: {
    color: COLORS.textMuted,
    fontSize: SIZES.fontMd,
  },

  // Info grid
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: SIZES.lg,
    gap: SIZES.sm,
    marginBottom: SIZES.md,
  },
  infoCard: {
    width: (screenWidth - SIZES.lg * 2 - SIZES.sm) / 2,
    backgroundColor: COLORS.card,
    borderRadius: SIZES.radiusMd,
    padding: SIZES.md,
    gap: 4,
  },
  infoLabel: {
    fontSize: SIZES.fontXs,
    color: COLORS.textMuted,
    ...FONTS.medium,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoValue: {
    fontSize: SIZES.fontLg,
    color: COLORS.white,
    ...FONTS.bold,
  },

  // Section card
  sectionCard: {
    backgroundColor: COLORS.card,
    borderRadius: SIZES.radiusMd,
    padding: SIZES.md,
    marginHorizontal: SIZES.lg,
    marginBottom: SIZES.sm,
  },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SIZES.sm,
  },
  sectionLabel: {
    flex: 1,
    fontSize: SIZES.fontMd,
    color: COLORS.white,
    ...FONTS.medium,
  },
  sectionValue: {
    fontSize: SIZES.fontMd,
    color: COLORS.textSecondary,
  },

  // Club picker
  clubGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: SIZES.lg,
    gap: SIZES.sm,
    marginBottom: SIZES.md,
  },
  clubChip: {
    paddingHorizontal: SIZES.md,
    paddingVertical: 8,
    borderRadius: SIZES.radiusFull,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.divider,
  },
  clubChipActive: {
    backgroundColor: COLORS.accent + '30',
    borderColor: COLORS.accent,
  },
  clubChipText: {
    fontSize: SIZES.fontSm,
    color: COLORS.textSecondary,
    ...FONTS.medium,
  },
  clubChipTextActive: {
    color: COLORS.accent,
  },

  // Notes
  notesInput: {
    marginTop: SIZES.sm,
    fontSize: SIZES.fontMd,
    color: COLORS.white,
    minHeight: 60,
    textAlignVertical: 'top',
  },

  // Trail
  trailPreview: {
    marginTop: SIZES.md,
    paddingVertical: SIZES.sm,
  },
  trailLine: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SIZES.md,
  },
  trailDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  trailPath: {
    flex: 1,
    height: 3,
    backgroundColor: COLORS.trailOrange,
    marginHorizontal: 4,
    borderRadius: 2,
  },
  trailLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: SIZES.sm,
    marginTop: 6,
  },
  trailLabelText: {
    fontSize: SIZES.fontXs,
    color: COLORS.textMuted,
    ...FONTS.medium,
  },
});
