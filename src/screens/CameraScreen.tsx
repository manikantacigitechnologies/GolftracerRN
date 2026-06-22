/**
 * Camera Screen - Golf Shot Calculator
 * 
 * Honest flow:
 * 1. Select club type
 * 2. Record video of the swing (video saved as reference)
 * 3. Confirm: "Did the ball get hit?" + select swing power
 * 4. Calculate metrics using club data + power level + physics engine
 * 5. Results vary based on club + power (different every time)
 * 6. Save shot with video to history
 * 
 * Without native frame processing (needs dev build + OpenCV/TFLite),
 * we cannot analyze video content. The video is reference footage.
 * Architecture supports future real CV via CameraProvider swap.
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Alert,
  Platform,
} from 'react-native';
import { CameraView, useCameraPermissions, useMicrophonePermissions, CameraType } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as ScreenOrientation from 'expo-screen-orientation';
import * as Haptics from 'expo-haptics';

import { RootStackParamList, ClubType } from '../types';
import { COLORS, FONTS, SIZES } from '../utils/theme';
import { saveShot } from '../utils/shotStore';
import { generateId } from '../utils/helpers';

import {
  LaunchMonitor,
  PhoneCameraProvider,
  ShotMetrics,
  TrajectoryPoint,
  DebugInfo,
} from '../tracking';

import DebugOverlay from '../components/DebugOverlay';
import ShotMetricsCard from '../components/ShotMetricsCard';
import TrajectoryOverlay from '../components/TrajectoryOverlay';
import ClubSelector from '../components/ClubSelector';

// Swing power affects ball speed calculation
type SwingPower = 'easy' | 'medium' | 'hard' | 'max';
const POWER_MULTIPLIERS: Record<SwingPower, number> = {
  easy: 0.65,
  medium: 0.80,
  hard: 0.92,
  max: 1.0,
};
const POWER_LABELS: Record<SwingPower, string> = {
  easy: 'Easy Swing (65%)',
  medium: 'Medium (80%)',
  hard: 'Hard (92%)',
  max: 'Full Power (100%)',
};

type ScreenPhase = 'idle' | 'recording' | 'confirm' | 'results';

export default function CameraScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [permission, requestPermission] = useCameraPermissions();
  const [micPermission, requestMicPermission] = useMicrophonePermissions();
  const [facing, setFacing] = useState<CameraType>('back');
  const cameraRef = useRef<CameraView>(null);

  // State
  const [phase, setPhase] = useState<ScreenPhase>('idle');
  const [selectedClub, setSelectedClub] = useState<ClubType | null>('7 Iron');
  const [swingPower, setSwingPower] = useState<SwingPower>('medium');
  const [metrics, setMetrics] = useState<ShotMetrics | null>(null);
  const [trajectory, setTrajectory] = useState<TrajectoryPoint[]>([]);
  const [videoUri, setVideoUri] = useState<string | null>(null);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [statusText, setStatusText] = useState('Select club & tap Record');
  const [showDebug, setShowDebug] = useState(true);
  const [debugInfo, setDebugInfo] = useState<DebugInfo>({
    fps: 30, frameCount: 0, motionLevel: 0,
    detectionConfidence: 0, processingTimeMs: 0, ballDetections: 0,
    lastError: null, calibrationStatus: 'estimated', pipelineStage: 'Idle',
  });

  // Refs
  const recordingRef = useRef(false);
  const durationTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const launchMonitorRef = useRef<LaunchMonitor | null>(null);

  // ── Initialize ─────────────────────────────────────

  useEffect(() => {
    const provider = new PhoneCameraProvider({ cameraDistance: 3.0, cameraHeight: 1.2, fps: 30 });
    provider.initialize();
    const monitor = new LaunchMonitor(provider, { debug: true, skillLevel: 'average' });
    launchMonitorRef.current = monitor;
    return () => {
      provider.dispose();
      if (durationTimerRef.current) clearInterval(durationTimerRef.current);
    };
  }, []);

  useEffect(() => {
    ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE_RIGHT).catch(() => {});
    return () => {
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP).catch(() => {});
    };
  }, []);

  useEffect(() => {
    if (!permission?.granted) requestPermission();
    if (!micPermission?.granted) requestMicPermission();
  }, [permission, micPermission]);

  // ── Recording ──────────────────────────────────────

  const handleStartRecording = async () => {
    if (!cameraRef.current || recordingRef.current) return;
    if (!selectedClub) {
      Alert.alert('Select Club', 'Please select which club you are using.');
      return;
    }

    recordingRef.current = true;
    setPhase('recording');
    setVideoUri(null);
    setMetrics(null);
    setTrajectory([]);
    setRecordingDuration(0);
    setStatusText('Recording... Swing when ready!');
    setDebugInfo(prev => ({ ...prev, pipelineStage: 'Recording video...' }));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});

    const startTime = Date.now();
    durationTimerRef.current = setInterval(() => {
      setRecordingDuration(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);

    try {
      const video = await cameraRef.current.recordAsync({ maxDuration: 20 });
      recordingRef.current = false;
      if (durationTimerRef.current) { clearInterval(durationTimerRef.current); durationTimerRef.current = null; }

      if (video?.uri) {
        setVideoUri(video.uri);
        setPhase('confirm');
        setStatusText('Did the ball get hit? Select power & tap Calculate.');
        setDebugInfo(prev => ({ ...prev, pipelineStage: 'Waiting for user confirmation' }));
        console.log('[Camera] Video saved:', video.uri);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      } else {
        setPhase('idle');
        setStatusText('Recording failed. Try again.');
      }
    } catch (err) {
      recordingRef.current = false;
      if (durationTimerRef.current) { clearInterval(durationTimerRef.current); durationTimerRef.current = null; }
      setPhase('idle');
      setStatusText('Recording error. Try again.');
      console.log('[Camera] Error:', err);
    }
  };

  const handleStopRecording = () => {
    if (cameraRef.current && recordingRef.current) {
      cameraRef.current.stopRecording();
    }
  };

  // ── Calculate ──────────────────────────────────────

  const handleCalculate = () => {
    if (!selectedClub) return;
    const monitor = launchMonitorRef.current;
    if (!monitor) return;

    setDebugInfo(prev => ({ ...prev, pipelineStage: 'Calculating with ' + selectedClub + ' @ ' + swingPower + '...' }));

    const startTime = Date.now();
    monitor.reset();

    // Map power directly to skill level
    const skillMap: Record<SwingPower, 'beginner' | 'average' | 'advanced' | 'pro'> = {
      easy: 'beginner',
      medium: 'average',
      hard: 'advanced',
      max: 'pro',
    };
    monitor.setSkillLevel(skillMap[swingPower]);

    // Calculate with variance (more power = more variance in results)
    const variance = swingPower === 'max' ? 12 : swingPower === 'hard' ? 8 : 5;
    const result = monitor.simulateShot(selectedClub, variance);

    const calcTime = Date.now() - startTime;

    setMetrics(result);
    setTrajectory(monitor.getState().trajectory);
    setPhase('results');
    setStatusText(result.totalDistance + ' yds | ' + result.ballSpeed + ' mph | ' + result.shotShape);
    setDebugInfo(prev => ({
      ...prev,
      pipelineStage: 'Done (' + calcTime + 'ms) | Club: ' + selectedClub + ' | Power: ' + swingPower,
      processingTimeMs: calcTime,
      detectionConfidence: result.confidence,
      ballDetections: 0,
    }));

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    console.log('[Camera] Result:', selectedClub, swingPower, result.totalDistance + 'yds', result.ballSpeed + 'mph');
  };

  // ── Save ───────────────────────────────────────────

  const handleSaveShot = async () => {
    if (!metrics) return;
    const monitor = launchMonitorRef.current;
    const state = monitor?.getState();

    const shot = {
      id: generateId(),
      videoUri: videoUri,
      thumbnailUri: null,
      timestamp: Date.now(),
      trail: (state?.ballPositions || []).map(p => ({ x: p.x, y: p.y, timestamp: p.timestamp })),
      landing: trajectory.length > 0
        ? { x: trajectory[trajectory.length - 1].x, y: trajectory[trajectory.length - 1].z }
        : null,
      captureWidth: 1920,
      captureHeight: 1080,
      durationMs: metrics.hangTime * 1000,
      clubType: selectedClub,
      notes: selectedClub + ' | ' + swingPower + ' | ' + metrics.totalDistance + 'yds ' + metrics.ballSpeed + 'mph ' + metrics.shotShape,
    };

    try {
      await saveShot(shot);
      console.log('[Camera] Saved to history:', shot.id, shot.notes);
      Alert.alert('Saved!', shot.notes, [{ text: 'OK' }]);
      handleReset();
    } catch (err) {
      Alert.alert('Error', 'Failed to save. Try again.');
    }
  };

  // ── Reset ──────────────────────────────────────────

  const handleReset = () => {
    if (durationTimerRef.current) { clearInterval(durationTimerRef.current); durationTimerRef.current = null; }
    launchMonitorRef.current?.reset();
    setPhase('idle');
    setMetrics(null);
    setTrajectory([]);
    setVideoUri(null);
    setRecordingDuration(0);
    setStatusText('Select club & tap Record');
    setDebugInfo({ fps: 30, frameCount: 0, motionLevel: 0, detectionConfidence: 0, processingTimeMs: 0, ballDetections: 0, lastError: null, calibrationStatus: 'estimated', pipelineStage: 'Idle' });
  };

  // ── Permission ─────────────────────────────────────

  if (!permission?.granted || !micPermission?.granted) {
    return (
      <View style={styles.permissionContainer}>
        <StatusBar barStyle="light-content" />
        <Ionicons name="camera-outline" size={64} color={COLORS.textMuted} />
        <Text style={styles.permTitle}>Camera & Microphone Access Required</Text>
        <Text style={styles.permText}>GolfTracer needs camera and microphone access to record your swing.</Text>
        <TouchableOpacity style={styles.permBtn} onPress={() => { requestPermission(); requestMicPermission(); }}>
          <Text style={styles.permBtnText}>Grant Permissions</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backBtnText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── Render ─────────────────────────────────────────

  return (
    <View style={styles.container}>
      <StatusBar hidden />

      {/* Camera (no children in SDK 54) */}
      <CameraView ref={cameraRef} style={styles.camera} facing={facing} mode="video" />

      {/* Overlay UI */}
      <View style={styles.overlay} pointerEvents="box-none">

        {/* Debug */}
        <DebugOverlay
          debugInfo={debugInfo}
          phase={phase === 'recording' ? 'ready' : phase === 'results' ? 'complete' : 'idle'}
          visible={showDebug}
        />

        {/* Trajectory arc (results only) */}
        <TrajectoryOverlay trajectory={trajectory} visible={phase === 'results'} />

        {/* Top bar */}
        <View style={styles.topBar}>
          <TouchableOpacity style={styles.topBtn} onPress={() => { if (recordingRef.current) handleStopRecording(); navigation.goBack(); }}>
            <Ionicons name="close" size={26} color={COLORS.white} />
          </TouchableOpacity>

          <View style={styles.statusPill}>
            {phase === 'recording' && <View style={styles.recDot} />}
            {phase === 'recording' && <Text style={styles.durText}>{recordingDuration}s</Text>}
            <Text style={styles.statusText} numberOfLines={1}>{statusText}</Text>
          </View>

          <TouchableOpacity
            style={[styles.topBtn, showDebug && styles.topBtnActive]}
            onPress={() => setShowDebug(!showDebug)}
          >
            <Ionicons name="bug-outline" size={18} color={showDebug ? COLORS.accent : COLORS.white} />
          </TouchableOpacity>
        </View>

        {/* Club selector (idle + confirm phases) */}
        {(phase === 'idle' || phase === 'confirm') && (
          <View style={styles.clubRow}>
            <ClubSelector selectedClub={selectedClub} onSelect={setSelectedClub} compact />
          </View>
        )}

        {/* Crosshair */}
        {(phase === 'idle' || phase === 'recording') && (
          <View style={styles.crosshairWrap} pointerEvents="none">
            <View style={styles.crossH} />
            <View style={styles.crossV} />
            <View style={[styles.crossCircle, phase === 'recording' && styles.crossRec]} />
          </View>
        )}

        {/* ── CONFIRM PANEL (after recording) ── */}
        {phase === 'confirm' && (
          <View style={styles.confirmPanel}>
            <Text style={styles.confirmTitle}>Confirm Shot</Text>
            <Text style={styles.confirmSub}>Select your swing power:</Text>

            <View style={styles.powerRow}>
              {(['easy', 'medium', 'hard', 'max'] as SwingPower[]).map(p => (
                <TouchableOpacity
                  key={p}
                  style={[styles.powerBtn, swingPower === p && styles.powerBtnActive]}
                  onPress={() => setSwingPower(p)}
                >
                  <Text style={[styles.powerLabel, swingPower === p && styles.powerLabelActive]}>
                    {p.toUpperCase()}
                  </Text>
                  <Text style={styles.powerPct}>
                    {Math.round(POWER_MULTIPLIERS[p] * 100)}%
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.confirmActions}>
              <TouchableOpacity style={styles.redoBtn} onPress={handleReset}>
                <Ionicons name="close-circle-outline" size={20} color={COLORS.textMuted} />
                <Text style={styles.redoBtnText}>No Ball Hit</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.calcBtn} onPress={handleCalculate}>
                <Ionicons name="calculator" size={20} color={COLORS.textDark} />
                <Text style={styles.calcBtnText}>CALCULATE</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Metrics card (results) */}
        {phase === 'results' && metrics && (
          <ShotMetricsCard metrics={metrics} onDismiss={handleReset} onSave={handleSaveShot} />
        )}

        {/* Bottom controls */}
        <View style={styles.bottomBar}>

          {/* IDLE */}
          {phase === 'idle' && (
            <>
              <TouchableOpacity style={styles.sideBtn} onPress={() => { navigation.goBack(); setTimeout(() => navigation.navigate('MainTabs', { screen: 'History' } as any), 100); }}>
                <Ionicons name="time-outline" size={22} color={COLORS.white} />
                <Text style={styles.sideBtnText}>History</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.recordBtn} onPress={handleStartRecording} activeOpacity={0.7}>
                <View style={styles.recordBtnInner} />
              </TouchableOpacity>

              <TouchableOpacity style={styles.sideBtn} onPress={() => setFacing(facing === 'back' ? 'front' : 'back')}>
                <Ionicons name="camera-reverse-outline" size={22} color={COLORS.white} />
                <Text style={styles.sideBtnText}>Flip</Text>
              </TouchableOpacity>
            </>
          )}

          {/* RECORDING */}
          {phase === 'recording' && (
            <>
              <View style={styles.sideBtn} />
              <TouchableOpacity style={styles.stopBtn} onPress={handleStopRecording} activeOpacity={0.7}>
                <View style={styles.stopBtnInner} />
              </TouchableOpacity>
              <View style={styles.sideBtn} />
            </>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.black },
  camera: { flex: 1 },
  overlay: { ...StyleSheet.absoluteFillObject },
  permissionContainer: { flex: 1, backgroundColor: COLORS.background, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 12 },
  permTitle: { fontSize: 22, color: COLORS.white, ...FONTS.bold, marginTop: 12 },
  permText: { fontSize: 15, color: COLORS.textSecondary, textAlign: 'center', maxWidth: 280 },
  permBtn: { backgroundColor: COLORS.accent, borderRadius: 99, paddingHorizontal: 28, paddingVertical: 14, marginTop: 12 },
  permBtnText: { fontSize: 15, color: COLORS.textDark, ...FONTS.bold },
  backBtn: { padding: 12 },
  backBtnText: { fontSize: 14, color: COLORS.textMuted },

  // Top bar
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: Platform.OS === 'ios' ? 20 : 16, paddingHorizontal: 12 },
  topBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: COLORS.overlay, alignItems: 'center', justifyContent: 'center' },
  topBtnActive: { borderWidth: 1, borderColor: COLORS.accent },
  statusPill: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.overlay, borderRadius: 99, paddingHorizontal: 12, paddingVertical: 5, gap: 5, maxWidth: '55%' },
  recDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: COLORS.error },
  durText: { fontSize: 11, color: COLORS.error, ...FONTS.bold },
  statusText: { fontSize: 10, color: COLORS.white, ...FONTS.medium, flexShrink: 1 },

  // Club row
  clubRow: { position: 'absolute', top: Platform.OS === 'ios' ? 62 : 58, left: 0, right: 0 },

  // Crosshair
  crosshairWrap: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  crossH: { position: 'absolute', width: 50, height: 1, backgroundColor: 'rgba(255,215,0,0.3)' },
  crossV: { position: 'absolute', width: 1, height: 50, backgroundColor: 'rgba(255,215,0,0.3)' },
  crossCircle: { width: 70, height: 70, borderRadius: 35, borderWidth: 1, borderColor: 'rgba(255,215,0,0.2)' },
  crossRec: { borderColor: 'rgba(239,83,80,0.6)', borderWidth: 2 },

  // Confirm panel
  confirmPanel: {
    position: 'absolute', bottom: 70, left: 16, right: 16,
    backgroundColor: 'rgba(10,15,10,0.95)', borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: 'rgba(255,215,0,0.2)',
  },
  confirmTitle: { fontSize: 16, color: COLORS.white, ...FONTS.bold, marginBottom: 4 },
  confirmSub: { fontSize: 11, color: COLORS.textSecondary, marginBottom: 12 },
  powerRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  powerBtn: {
    flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  powerBtnActive: { backgroundColor: 'rgba(255,215,0,0.15)', borderColor: COLORS.accent },
  powerLabel: { fontSize: 11, color: COLORS.textSecondary, ...FONTS.bold },
  powerLabelActive: { color: COLORS.accent },
  powerPct: { fontSize: 9, color: COLORS.textMuted, marginTop: 2 },
  confirmActions: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  redoBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, padding: 10 },
  redoBtnText: { fontSize: 12, color: COLORS.textMuted },
  calcBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: COLORS.accent, borderRadius: 24, paddingHorizontal: 20, paddingVertical: 11 },
  calcBtnText: { fontSize: 13, color: COLORS.textDark, ...FONTS.bold },

  // Bottom bar
  bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', paddingBottom: Platform.OS === 'ios' ? 18 : 14, paddingTop: 10, backgroundColor: 'rgba(0,0,0,0.55)' },
  sideBtn: { alignItems: 'center', gap: 3, minWidth: 55 },
  sideBtnText: { fontSize: 9, color: COLORS.white, ...FONTS.medium },
  recordBtn: { width: 68, height: 68, borderRadius: 34, borderWidth: 4, borderColor: COLORS.white, alignItems: 'center', justifyContent: 'center' },
  recordBtnInner: { width: 52, height: 52, borderRadius: 26, backgroundColor: COLORS.error },
  stopBtn: { width: 68, height: 68, borderRadius: 34, borderWidth: 4, borderColor: COLORS.error, alignItems: 'center', justifyContent: 'center' },
  stopBtnInner: { width: 26, height: 26, borderRadius: 4, backgroundColor: COLORS.error },
});
