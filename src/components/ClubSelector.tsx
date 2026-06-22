/**
 * Club Selector - Quick club picker for the camera screen
 * Allows selecting which club is being used before/during a shot.
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { ClubType } from '../types';
import { COLORS, FONTS, SIZES } from '../utils/theme';

interface ClubSelectorProps {
  selectedClub: ClubType | null;
  onSelect: (club: ClubType) => void;
  compact?: boolean;
}

const CLUBS: ClubType[] = [
  'Driver', '3 Wood', '5 Wood',
  '3 Iron', '4 Iron', '5 Iron', '6 Iron', '7 Iron', '8 Iron', '9 Iron',
  'PW', 'SW', 'LW', 'Putter',
];

const SHORT_NAMES: Record<string, string> = {
  'Driver': 'DR',
  '3 Wood': '3W',
  '5 Wood': '5W',
  '3 Iron': '3i',
  '4 Iron': '4i',
  '5 Iron': '5i',
  '6 Iron': '6i',
  '7 Iron': '7i',
  '8 Iron': '8i',
  '9 Iron': '9i',
  'PW': 'PW',
  'SW': 'SW',
  'LW': 'LW',
  'Putter': 'PT',
};

export default function ClubSelector({ selectedClub, onSelect, compact }: ClubSelectorProps) {
  return (
    <View style={styles.container}>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {CLUBS.map((club) => {
          const isSelected = selectedClub === club;
          return (
            <TouchableOpacity
              key={club}
              style={[
                styles.chip,
                isSelected && styles.chipSelected,
                compact && styles.chipCompact,
              ]}
              onPress={() => onSelect(club)}
              activeOpacity={0.7}
            >
              <Text style={[
                styles.chipText,
                isSelected && styles.chipTextSelected,
                compact && styles.chipTextCompact,
              ]}>
                {compact ? SHORT_NAMES[club] : club}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 4,
  },
  scrollContent: {
    paddingHorizontal: 8,
    gap: 6,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  chipSelected: {
    backgroundColor: COLORS.accent + '30',
    borderColor: COLORS.accent,
  },
  chipCompact: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  chipText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    ...FONTS.medium,
  },
  chipTextSelected: {
    color: COLORS.accent,
    ...FONTS.bold,
  },
  chipTextCompact: {
    fontSize: 10,
  },
});
