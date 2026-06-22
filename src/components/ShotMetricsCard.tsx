/**
 * Shot Metrics Card - Displays calculated shot data
 * 
 * Shown after a shot is calculated. Displays primary and secondary metrics
 * with confidence indicator and detection method badge.
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ShotMetrics, DetectionMethod } from '../tracking/types';
import { COLORS, FONTS, SIZES } from '../utils/theme';

interface ShotMetricsCardProps {
  metrics: ShotMetrics;
  onDismiss: () => void;
  onSave: () => void;
}

const METHOD_LABELS: Record<DetectionMethod, string> = {
  vision_tracked: '👁 Vision Tracked',
  launch_estimated: '📐 Launch Estimated',
  physics_only: '🧮 Physics Model',
  hybrid: '🔀 Hybrid',
};

const METHOD_COLORS: Record<DetectionMethod, string> = {
  vision_tracked: '#4CAF50',
  launch_estimated: '#2196F3',
  physics_only: '#FF9800',
  hybrid: '#9C27B0',
};

export default function ShotMetricsCard({ metrics, onDismiss, onSave }: ShotMetricsCardProps) {
  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.title}>Shot Analysis</Text>
          <View style={[styles.methodBadge, { backgroundColor: METHOD_COLORS[metrics.detectionMethod] + '30' }]}>
            <Text style={[styles.methodText, { color: METHOD_COLORS[metrics.detectionMethod] }]}>
              {METHOD_LABELS[metrics.detectionMethod]}
            </Text>
          </View>
        </View>
        <TouchableOpacity onPress={onDismiss} style={styles.closeBtn}>
          <Ionicons name="close" size={20} color={COLORS.textMuted} />
        </TouchableOpacity>
      </View>

      {/* Confidence bar */}
      <View style={styles.confidenceRow}>
        <Text style={styles.confidenceLabel}>Accuracy</Text>
        <View style={styles.confidenceBar}>
          <View style={[styles.confidenceFill, { width: `${metrics.confidence * 100}%` }]} />
        </View>
        <Text style={styles.confidenceValue}>{Math.round(metrics.confidence * 100)}%</Text>
      </View>

      {/* Primary metrics */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.primaryRow}>
        <MetricBox 
          label="Ball Speed" 
          value={`${metrics.ballSpeed}`} 
          unit="mph" 
          icon="speedometer-outline" 
          primary 
        />
        <MetricBox 
          label="Carry" 
          value={`${metrics.carryDistance}`} 
          unit="yds" 
          icon="golf-outline" 
          primary 
        />
        <MetricBox 
          label="Total" 
          value={`${metrics.totalDistance}`} 
          unit="yds" 
          icon="flag-outline" 
          primary 
        />
      </ScrollView>

      {/* Secondary metrics grid */}
      <View style={styles.grid}>
        <MetricCell label="Launch Angle" value={`${metrics.launchAngle}°`} />
        <MetricCell label="Apex Height" value={`${metrics.apexHeight} yds`} />
        <MetricCell label="Hang Time" value={`${metrics.hangTime}s`} />
        <MetricCell label="Landing Angle" value={`${metrics.landingAngle}°`} />
        <MetricCell label="Spin Rate" value={`${metrics.spinRate} rpm`} />
        <MetricCell label="Shot Shape" value={metrics.shotShape} />
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        <TouchableOpacity style={styles.saveBtn} onPress={onSave}>
          <Ionicons name="checkmark-circle" size={20} color={COLORS.white} />
          <Text style={styles.saveBtnText}>Save Shot</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function MetricBox({ label, value, unit, icon, primary }: {
  label: string;
  value: string;
  unit: string;
  icon: string;
  primary?: boolean;
}) {
  return (
    <View style={[styles.metricBox, primary && styles.metricBoxPrimary]}>
      <Ionicons name={icon as any} size={16} color={COLORS.accent} />
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricUnit}>{unit}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

function MetricCell({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.cell}>
      <Text style={styles.cellValue}>{value}</Text>
      <Text style={styles.cellLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 80,
    left: 12,
    right: 12,
    backgroundColor: 'rgba(10,15,10,0.95)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.2)',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  headerLeft: {
    gap: 4,
  },
  title: {
    fontSize: 16,
    color: COLORS.white,
    ...FONTS.bold,
  },
  methodBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  methodText: {
    fontSize: 10,
    fontWeight: '600',
  },
  closeBtn: {
    padding: 4,
  },
  confidenceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  confidenceLabel: {
    fontSize: 10,
    color: COLORS.textMuted,
    width: 55,
  },
  confidenceBar: {
    flex: 1,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  confidenceFill: {
    height: '100%',
    backgroundColor: COLORS.accent,
    borderRadius: 2,
  },
  confidenceValue: {
    fontSize: 10,
    color: COLORS.accent,
    fontWeight: '600',
    width: 30,
    textAlign: 'right',
  },
  primaryRow: {
    marginBottom: 12,
  },
  metricBox: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    padding: 12,
    marginRight: 10,
    minWidth: 90,
    gap: 2,
  },
  metricBoxPrimary: {
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.15)',
  },
  metricValue: {
    fontSize: 22,
    color: COLORS.white,
    ...FONTS.bold,
  },
  metricUnit: {
    fontSize: 10,
    color: COLORS.textMuted,
  },
  metricLabel: {
    fontSize: 9,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 1,
    marginBottom: 12,
  },
  cell: {
    width: '32%',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 8,
    padding: 8,
    alignItems: 'center',
    marginBottom: 4,
  },
  cellValue: {
    fontSize: 13,
    color: COLORS.white,
    ...FONTS.semiBold,
  },
  cellLabel: {
    fontSize: 8,
    color: COLORS.textMuted,
    marginTop: 2,
    textAlign: 'center',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 10,
    gap: 6,
  },
  saveBtnText: {
    fontSize: 14,
    color: COLORS.white,
    ...FONTS.semiBold,
  },
});
