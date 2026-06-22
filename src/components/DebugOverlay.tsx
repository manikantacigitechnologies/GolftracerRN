/**
 * Debug Overlay Component
 * 
 * Shows real-time tracking data overlay on the camera view.
 * Toggle via Settings > Show Debug Overlay
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { DebugInfo, TrackingPhase } from '../tracking/types';
import { COLORS } from '../utils/theme';

interface DebugOverlayProps {
  debugInfo: DebugInfo;
  phase: TrackingPhase;
  visible: boolean;
}

const PHASE_COLORS: Record<TrackingPhase, string> = {
  idle: '#888888',
  ready: '#4CAF50',
  impact_detected: '#FF9800',
  tracking: '#2196F3',
  calculating: '#9C27B0',
  complete: '#00E676',
  error: '#F44336',
};

const PHASE_LABELS: Record<TrackingPhase, string> = {
  idle: 'IDLE',
  ready: 'READY - Watching',
  impact_detected: 'IMPACT!',
  tracking: 'TRACKING BALL',
  calculating: 'CALCULATING...',
  complete: 'COMPLETE',
  error: 'ERROR',
};

export default function DebugOverlay({ debugInfo, phase, visible }: DebugOverlayProps) {
  if (!visible) return null;

  const phaseColor = PHASE_COLORS[phase];

  return (
    <View style={styles.container} pointerEvents="none">
      {/* Phase indicator */}
      <View style={[styles.phaseBar, { backgroundColor: phaseColor + '40' }]}>
        <View style={[styles.phaseDot, { backgroundColor: phaseColor }]} />
        <Text style={[styles.phaseText, { color: phaseColor }]}>
          {PHASE_LABELS[phase]}
        </Text>
      </View>

      {/* Debug data grid */}
      <View style={styles.dataGrid}>
        <DebugRow label="FPS" value={`${debugInfo.fps}`} />
        <DebugRow label="Frames" value={`${debugInfo.frameCount}`} />
        <DebugRow label="Motion" value={`${debugInfo.motionLevel.toFixed(0)}`} 
          highlight={debugInfo.motionLevel > 50} />
        <DebugRow label="Detections" value={`${debugInfo.ballDetections}`} />
        <DebugRow label="Confidence" value={`${(debugInfo.detectionConfidence * 100).toFixed(0)}%`} />
        <DebugRow label="Process" value={`${debugInfo.processingTimeMs}ms`} />
        <DebugRow label="Calibration" value={debugInfo.calibrationStatus} />
      </View>

      {/* Pipeline stage */}
      <View style={styles.pipelineRow}>
        <Text style={styles.pipelineLabel}>Pipeline:</Text>
        <Text style={styles.pipelineValue}>{debugInfo.pipelineStage}</Text>
      </View>

      {/* Motion meter */}
      <View style={styles.motionMeter}>
        <View style={styles.motionTrack}>
          <View 
            style={[
              styles.motionFill,
              { 
                width: `${Math.min(100, debugInfo.motionLevel)}%`,
                backgroundColor: debugInfo.motionLevel > 70 ? '#FF3D00' : 
                                 debugInfo.motionLevel > 40 ? '#FFA000' : '#4CAF50',
              },
            ]} 
          />
        </View>
        <Text style={styles.motionLabel}>MOTION</Text>
      </View>

      {/* Error display */}
      {debugInfo.lastError && (
        <View style={styles.errorRow}>
          <Text style={styles.errorText}>⚠️ {debugInfo.lastError}</Text>
        </View>
      )}
    </View>
  );
}

function DebugRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={[styles.value, highlight && styles.valueHighlight]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 50,
    left: 8,
    backgroundColor: 'rgba(0,0,0,0.75)',
    borderRadius: 8,
    padding: 8,
    minWidth: 160,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  phaseBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
    marginBottom: 6,
    gap: 6,
  },
  phaseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  phaseText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  dataGrid: {
    gap: 2,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 1,
  },
  label: {
    fontSize: 9,
    color: '#888',
    fontWeight: '500',
    fontFamily: 'monospace',
  },
  value: {
    fontSize: 9,
    color: '#DDD',
    fontWeight: '600',
    fontFamily: 'monospace',
  },
  valueHighlight: {
    color: '#FF9800',
  },
  pipelineRow: {
    marginTop: 6,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  pipelineLabel: {
    fontSize: 8,
    color: '#666',
    fontFamily: 'monospace',
  },
  pipelineValue: {
    fontSize: 9,
    color: '#4CAF50',
    fontWeight: '500',
    fontFamily: 'monospace',
    marginTop: 2,
  },
  motionMeter: {
    marginTop: 6,
    gap: 2,
  },
  motionTrack: {
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  motionFill: {
    height: '100%',
    borderRadius: 2,
  },
  motionLabel: {
    fontSize: 7,
    color: '#666',
    fontWeight: '600',
    fontFamily: 'monospace',
    letterSpacing: 1,
  },
  errorRow: {
    marginTop: 4,
    padding: 4,
    backgroundColor: 'rgba(244,67,54,0.2)',
    borderRadius: 4,
  },
  errorText: {
    fontSize: 9,
    color: '#F44336',
    fontFamily: 'monospace',
  },
});
