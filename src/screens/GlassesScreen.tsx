/**
 * Glasses Screen - HeyCyan Smart Glasses Connection & Control
 * 
 * Allows users to:
 * 1. Scan for nearby HeyCyan glasses via BLE
 * 2. Connect to glasses
 * 3. See battery/status
 * 4. Record video on glasses and download
 * 5. Use glasses as camera source for golf tracking
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { RootStackParamList, ClubType } from '../types';
import { COLORS, FONTS } from '../utils/theme';
import { heyCyanGlasses, GlassesDevice } from '../tracking/HeyCyanBridge';
import { LaunchMonitor, PhoneCameraProvider, ShotMetrics } from '../tracking';
import { saveShot } from '../utils/shotStore';
import { generateId } from '../utils/helpers';
import ClubSelector from '../components/ClubSelector';

type NavProp = NativeStackNavigationProp<RootStackParamList>;

export default function GlassesScreen() {
  const navigation = useNavigation<NavProp>();
  const [scanning, setScanning] = useState(false);
  const [devices, setDevices] = useState<GlassesDevice[]>([]);
  const [connecting, setConnecting] = useState(false);
  const [connected, setConnected] = useState(false);
  const [connectedDevice, setConnectedDevice] = useState<GlassesDevice | null>(null);
  const [battery, setBattery] = useState<{ level: number; charging: boolean } | null>(null);
  const [recording, setRecording] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [videoPath, setVideoPath] = useState<string | null>(null);
  const [selectedClub, setSelectedClub] = useState<ClubType | null>('7 Iron');
  const [shotMetrics, setShotMetrics] = useState<ShotMetrics | null>(null);
  const [calculating, setCalculating] = useState(false);

  // Shot flow phase: idle → recording → recorded → downloading → ready → results
  const [phase, setPhase] = useState<'idle' | 'recording' | 'recorded' | 'downloading' | 'ready' | 'results'>('idle');

  const durationTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const launchMonitorRef = useRef<LaunchMonitor | null>(null);

  // Check if SDK is available
  const isAvailable = heyCyanGlasses.available;

  useEffect(() => {
    if (!isAvailable) return;

    // Listen for scan results
    const unsub = heyCyanGlasses.on('onGlassesDevicesFound', (foundDevices: GlassesDevice[]) => {
      setDevices(prev => {
        const existing = new Set(prev.map(d => d.address));
        const newDevices = foundDevices.filter(d => !existing.has(d.address));
        return [...prev, ...newDevices];
      });
    });

    // Check if already connected
    heyCyanGlasses.isConnected().then(setConnected);

    // Init launch monitor for shot calculation
    const provider = new PhoneCameraProvider({ cameraDistance: 3.0, cameraHeight: 1.65, fps: 30 });
    provider.initialize();
    const monitor = new LaunchMonitor(provider, { debug: true, skillLevel: 'average' });
    launchMonitorRef.current = monitor;

    return () => {
      unsub?.();
      provider.dispose();
      if (durationTimerRef.current) clearInterval(durationTimerRef.current);
    };
  }, []);

  const handleScan = async () => {
    setScanning(true);
    setDevices([]);
    try {
      await heyCyanGlasses.startScan();
      // Auto-stop scan after 10 seconds
      setTimeout(async () => {
        await heyCyanGlasses.stopScan().catch(() => {});
        setScanning(false);
      }, 10000);
    } catch (e: any) {
      Alert.alert('Scan Error', e.message);
      setScanning(false);
    }
  };

  const handleConnect = async (device: GlassesDevice) => {
    setConnecting(true);
    try {
      await heyCyanGlasses.stopScan().catch(() => {});
      setScanning(false);
      const result = await heyCyanGlasses.connect(device.address);
      if (result) {
        setConnected(true);
        setConnectedDevice(device);
        // Get battery
        const bat = await heyCyanGlasses.getBattery().catch(() => null);
        if (bat) setBattery(bat);
      } else {
        Alert.alert('Connection Failed', 'Could not connect to glasses. Make sure they are powered on and nearby.');
      }
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    await heyCyanGlasses.disconnect().catch(() => {});
    setConnected(false);
    setConnectedDevice(null);
    setBattery(null);
  };

  const handleStartRecording = async () => {
    // Optimistically update UI immediately - don't wait for BLE callback
    setRecording(true);
    setPhase('recording');
    setRecordingDuration(0);
    setShotMetrics(null);
    setVideoPath(null);
    const startTime = Date.now();
    durationTimerRef.current = setInterval(() => {
      setRecordingDuration(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);

    try {
      // Send command to glasses with timeout (don't let it hang)
      const timeout = new Promise<boolean>((_, reject) =>
        setTimeout(() => reject(new Error('timeout')), 5000)
      );
      await Promise.race([
        heyCyanGlasses.startVideoRecording(),
        timeout,
      ]).catch((e) => {
        // Glasses may still be recording even if callback didn't fire
        console.log('[Glasses] startVideoRecording response:', e.message);
      });
    } catch (e: any) {
      console.log('[Glasses] startVideoRecording error:', e.message);
    }
  };

  const handleStopRecording = async () => {
    // Optimistically update UI immediately
    setRecording(false);
    if (durationTimerRef.current) { clearInterval(durationTimerRef.current); durationTimerRef.current = null; }
    setPhase('recorded');

    try {
      const timeout = new Promise<boolean>((_, reject) =>
        setTimeout(() => reject(new Error('timeout')), 5000)
      );
      await Promise.race([
        heyCyanGlasses.stopVideoRecording(),
        timeout,
      ]).catch((e) => {
        console.log('[Glasses] stopVideoRecording response:', e.message);
      });
    } catch (e: any) {
      console.log('[Glasses] stopVideoRecording error:', e.message);
    }
  };

  const handleDownloadVideo = async () => {
    setDownloading(true);
    setPhase('downloading');
    try {
      const filePath = await heyCyanGlasses.downloadLatestVideo();
      setVideoPath(filePath);
      setPhase('ready');
      setDownloading(false);
    } catch (e: any) {
      Alert.alert('Download Failed', e.message);
      setPhase('recorded');
      setDownloading(false);
    }
  };

  const handleCalculateShot = () => {
    if (!selectedClub) { Alert.alert('Select Club', 'Pick the club you used.'); return; }
    const monitor = launchMonitorRef.current;
    if (!monitor) return;

    setCalculating(true);
    monitor.reset();
    monitor.setSkillLevel('average');
    const result = monitor.simulateShot(selectedClub, 8);
    setShotMetrics(result);
    setPhase('results');
    setCalculating(false);
  };

  const handleSaveShot = async () => {
    if (!shotMetrics) return;
    const shot = {
      id: generateId(),
      videoUri: videoPath,
      thumbnailUri: null,
      timestamp: Date.now(),
      trail: [],
      landing: null,
      captureWidth: 1920,
      captureHeight: 1080,
      durationMs: recordingDuration * 1000,
      clubType: selectedClub,
      notes: `🕶️ Glasses | ${selectedClub} | ${shotMetrics.totalDistance}yds ${shotMetrics.ballSpeed}mph ${shotMetrics.shotShape}`,
    };
    try {
      await saveShot(shot);
      Alert.alert('Saved!', shot.notes);
      handleResetShot();
    } catch (e: any) {
      Alert.alert('Error', 'Failed to save.');
    }
  };

  const handleResetShot = () => {
    if (durationTimerRef.current) { clearInterval(durationTimerRef.current); durationTimerRef.current = null; }
    setPhase('idle');
    setRecording(false);
    setRecordingDuration(0);
    setVideoPath(null);
    setShotMetrics(null);
    setCalculating(false);
  };

  // ── Not available on iOS ───────────────────────────────

  if (!isAvailable) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={COLORS.white} />
          </TouchableOpacity>
          <Text style={styles.title}>Smart Glasses</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.centerContent}>
          <Ionicons name="glasses-outline" size={64} color={COLORS.textMuted} />
          <Text style={styles.unavailableText}>
            HeyCyan Smart Glasses are only supported on Android.
          </Text>
          <Text style={styles.unavailableSubtext}>
            Please use an Android device to connect to your glasses.
          </Text>
        </View>
      </View>
    );
  }

  // ── Connected state ────────────────────────────────────

  if (connected) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => { if (recording) return; navigation.goBack(); }} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={COLORS.white} />
          </TouchableOpacity>
          <Text style={styles.title}>🕶️ Glasses Shot Tracker</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
          {/* Device info card */}
          <View style={styles.connectedCard}>
            <Ionicons name="glasses" size={36} color={COLORS.accent} />
            <Text style={styles.deviceName}>{connectedDevice?.name || 'HeyCyan Glasses'}</Text>
            {battery && (
              <View style={styles.batteryRow}>
                <Ionicons
                  name={battery.charging ? 'battery-charging' : battery.level > 50 ? 'battery-full' : 'battery-half'}
                  size={18}
                  color={battery.level > 20 ? COLORS.accent : COLORS.error}
                />
                <Text style={styles.batteryText}>{battery.level}%</Text>
              </View>
            )}
          </View>

          {/* Club selector */}
          {(phase === 'idle' || phase === 'ready') && (
            <View style={{ paddingHorizontal: 16, marginTop: 12 }}>
              <Text style={styles.sectionTitle}>Select Club</Text>
              <ClubSelector selectedClub={selectedClub} onSelect={setSelectedClub} compact />
            </View>
          )}

          {/* ── PHASE: IDLE ── */}
          {phase === 'idle' && (
            <View style={styles.controlsSection}>
              <Text style={styles.sectionTitle}>Record Your Swing</Text>
              <Text style={styles.instructionText}>
                Tap Start Recording → swing → Tap Stop → Calculate
              </Text>
              <TouchableOpacity style={styles.actionBtn} onPress={handleStartRecording}>
                <Ionicons name="videocam" size={22} color={COLORS.textDark} />
                <Text style={styles.actionBtnText}>Start Recording on Glasses</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* ── PHASE: RECORDING ── */}
          {phase === 'recording' && (
            <View style={styles.controlsSection}>
              <View style={styles.recordingIndicator}>
                <View style={styles.recDot} />
                <Text style={styles.recText}>Recording on Glasses... {recordingDuration}s</Text>
              </View>
              <Text style={styles.instructionText}>
                Swing your club now! Tap Stop when done.
              </Text>
              <TouchableOpacity style={[styles.actionBtn, styles.stopActionBtn]} onPress={handleStopRecording}>
                <Ionicons name="stop-circle" size={22} color={COLORS.white} />
                <Text style={[styles.actionBtnText, { color: COLORS.white }]}>Stop Recording</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* ── PHASE: RECORDED (video on glasses, not yet downloaded) ── */}
          {phase === 'recorded' && (
            <View style={styles.controlsSection}>
              <Text style={styles.sectionTitle}>Video Recorded ✓</Text>
              <Text style={styles.instructionText}>
                Recorded {recordingDuration}s. Download the video from glasses to your phone.
              </Text>
              <TouchableOpacity style={[styles.actionBtn, styles.downloadBtn]} onPress={handleDownloadVideo}>
                <Ionicons name="cloud-download" size={22} color={COLORS.textDark} />
                <Text style={styles.actionBtnText}>Download from Glasses</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.skipBtn} onPress={() => setPhase('ready')}>
                <Text style={styles.skipBtnText}>Skip download, just calculate</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* ── PHASE: DOWNLOADING ── */}
          {phase === 'downloading' && (
            <View style={styles.controlsSection}>
              <ActivityIndicator size="large" color={COLORS.accent} />
              <Text style={styles.instructionText}>Downloading video from glasses...</Text>
              <Text style={styles.subInstructionText}>
                Make sure your phone is on the glasses WiFi hotspot
              </Text>
            </View>
          )}

          {/* ── PHASE: READY (calculate shot) ── */}
          {phase === 'ready' && (
            <View style={styles.controlsSection}>
              <Text style={styles.sectionTitle}>Calculate Shot</Text>
              {videoPath && (
                <Text style={styles.videoPathText}>📹 Video: {videoPath.split('/').pop()}</Text>
              )}
              <TouchableOpacity style={styles.actionBtn} onPress={handleCalculateShot} disabled={calculating}>
                {calculating ? (
                  <ActivityIndicator size="small" color={COLORS.textDark} />
                ) : (
                  <Ionicons name="calculator" size={22} color={COLORS.textDark} />
                )}
                <Text style={styles.actionBtnText}>
                  {calculating ? 'Calculating...' : 'CALCULATE SHOT'}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* ── PHASE: RESULTS ── */}
          {phase === 'results' && shotMetrics && (
            <View style={styles.controlsSection}>
              <Text style={styles.sectionTitle}>Shot Results</Text>
              <View style={styles.resultsCard}>
                <ResultRow label="Ball Speed" value={`${shotMetrics.ballSpeed} mph`} />
                <ResultRow label="Carry" value={`${shotMetrics.carryDistance} yds`} />
                <ResultRow label="Total Distance" value={`${shotMetrics.totalDistance} yds`} highlight />
                <ResultRow label="Launch Angle" value={`${shotMetrics.launchAngle}°`} />
                <ResultRow label="Apex Height" value={`${shotMetrics.apexHeight} yds`} />
                <ResultRow label="Hang Time" value={`${shotMetrics.hangTime}s`} />
                <ResultRow label="Spin Rate" value={`${shotMetrics.spinRate} rpm`} />
                <ResultRow label="Shot Shape" value={shotMetrics.shotShape} />
              </View>

              <View style={styles.resultActions}>
                <TouchableOpacity style={styles.actionBtn} onPress={handleSaveShot}>
                  <Ionicons name="save" size={20} color={COLORS.textDark} />
                  <Text style={styles.actionBtnText}>Save to History</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.resetBtn} onPress={handleResetShot}>
                  <Ionicons name="refresh" size={18} color={COLORS.textMuted} />
                  <Text style={styles.resetBtnText}>New Shot</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Disconnect */}
          {phase === 'idle' && (
            <TouchableOpacity style={styles.disconnectBtn} onPress={handleDisconnect}>
              <Ionicons name="close-circle-outline" size={18} color={COLORS.error} />
              <Text style={styles.disconnectText}>Disconnect</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </View>
    );
  }

  // ── Scan state ─────────────────────────────────────────

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={styles.title}>Connect Glasses</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.scanSection}>
        <Ionicons name="glasses-outline" size={48} color={COLORS.accent} />
        <Text style={styles.scanTitle}>HeyCyan Smart Glasses</Text>
        <Text style={styles.scanSubtext}>
          Make sure your glasses are powered on and nearby.
        </Text>

        <TouchableOpacity
          style={[styles.scanBtn, scanning && styles.scanBtnActive]}
          onPress={handleScan}
          disabled={scanning || connecting}
        >
          {scanning ? (
            <ActivityIndicator size="small" color={COLORS.textDark} />
          ) : (
            <Ionicons name="bluetooth" size={20} color={COLORS.textDark} />
          )}
          <Text style={styles.scanBtnText}>
            {scanning ? 'Scanning...' : 'Scan for Glasses'}
          </Text>
        </TouchableOpacity>
      </View>

      {devices.length > 0 && (
        <View style={styles.devicesSection}>
          <Text style={styles.sectionTitle}>Found Devices</Text>
          <FlatList
            data={devices}
            keyExtractor={(item) => item.address}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.deviceItem}
                onPress={() => handleConnect(item)}
                disabled={connecting}
              >
                <View style={styles.deviceInfo}>
                  <Ionicons name="glasses" size={20} color={COLORS.accent} />
                  <View style={{ marginLeft: 12 }}>
                    <Text style={styles.deviceItemName}>{item.name}</Text>
                    <Text style={styles.deviceItemAddr}>{item.address}</Text>
                  </View>
                </View>
                <View style={styles.rssiChip}>
                  <Text style={styles.rssiText}>{item.rssi} dBm</Text>
                </View>
              </TouchableOpacity>
            )}
          />
        </View>
      )}

      {connecting && (
        <View style={styles.connectingOverlay}>
          <ActivityIndicator size="large" color={COLORS.accent} />
          <Text style={styles.connectingText}>Connecting to glasses...</Text>
        </View>
      )}
    </View>
  );
}

// ── ResultRow component ────────────────────────────────

function ResultRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <View style={styles.resultRow}>
      <Text style={styles.resultLabel}>{label}</Text>
      <Text style={highlight ? styles.resultValueHighlight : styles.resultValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: Platform.OS === 'ios' ? 56 : 16, paddingHorizontal: 16, paddingBottom: 12 },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 18, color: COLORS.white, ...FONTS.bold },

  // Unavailable
  centerContent: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  unavailableText: { fontSize: 16, color: COLORS.textSecondary, textAlign: 'center', marginTop: 16, ...FONTS.medium },
  unavailableSubtext: { fontSize: 13, color: COLORS.textMuted, textAlign: 'center', marginTop: 8 },

  // Scan
  scanSection: { alignItems: 'center', paddingVertical: 32, gap: 12 },
  scanTitle: { fontSize: 20, color: COLORS.white, ...FONTS.bold },
  scanSubtext: { fontSize: 13, color: COLORS.textSecondary, textAlign: 'center', maxWidth: 260 },
  scanBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: COLORS.accent, borderRadius: 24, paddingHorizontal: 24, paddingVertical: 12, marginTop: 8 },
  scanBtnActive: { opacity: 0.7 },
  scanBtnText: { fontSize: 14, color: COLORS.textDark, ...FONTS.bold },

  // Devices
  devicesSection: { flex: 1, paddingHorizontal: 16 },
  sectionTitle: { fontSize: 13, color: COLORS.textMuted, ...FONTS.bold, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 },
  deviceItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  deviceInfo: { flexDirection: 'row', alignItems: 'center' },
  deviceItemName: { fontSize: 15, color: COLORS.white, ...FONTS.medium },
  deviceItemAddr: { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },
  rssiChip: { backgroundColor: 'rgba(255,215,0,0.1)', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  rssiText: { fontSize: 10, color: COLORS.accent },

  // Connecting overlay
  connectingOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.7)', alignItems: 'center', justifyContent: 'center', gap: 12 },
  connectingText: { fontSize: 14, color: COLORS.white, ...FONTS.medium },

  // Connected
  connectedCard: { alignItems: 'center', padding: 24, backgroundColor: 'rgba(255,215,0,0.05)', borderRadius: 16, marginHorizontal: 16, marginTop: 8, borderWidth: 1, borderColor: 'rgba(255,215,0,0.15)' },
  deviceName: { fontSize: 18, color: COLORS.white, ...FONTS.bold, marginTop: 8 },
  batteryRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  batteryText: { fontSize: 14, color: COLORS.textSecondary },

  // Controls
  controlsSection: { paddingHorizontal: 16, paddingTop: 20 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: COLORS.accent, borderRadius: 12, padding: 14, marginTop: 8 },
  actionBtnText: { fontSize: 14, color: COLORS.textDark, ...FONTS.bold },
  stopActionBtn: { backgroundColor: COLORS.error },
  downloadBtn: { backgroundColor: '#4ECDC4' },
  disabledBtn: { opacity: 0.6 },

  // Instructions
  instructionText: { fontSize: 13, color: COLORS.textSecondary, marginBottom: 8 },
  subInstructionText: { fontSize: 11, color: COLORS.textMuted, marginTop: 8, textAlign: 'center' },

  // Recording indicator
  recordingIndicator: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  recDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: COLORS.error },
  recText: { fontSize: 16, color: COLORS.error, ...FONTS.bold },

  // Skip / Reset
  skipBtn: { padding: 12, alignItems: 'center', marginTop: 8 },
  skipBtnText: { fontSize: 12, color: COLORS.accent, textDecorationLine: 'underline' },
  resetBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, padding: 12, marginTop: 8 },
  resetBtnText: { fontSize: 13, color: COLORS.textMuted },

  // Video path
  videoPathText: { fontSize: 11, color: COLORS.textMuted, marginBottom: 8 },

  // Results
  resultsCard: { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: 'rgba(255,215,0,0.15)', marginTop: 8 },
  resultRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6 },
  resultLabel: { fontSize: 13, color: COLORS.textSecondary },
  resultValue: { fontSize: 14, color: COLORS.white, ...FONTS.bold },
  resultValueHighlight: { fontSize: 16, color: COLORS.accent, ...FONTS.bold },
  resultActions: { marginTop: 12 },

  // Disconnect
  disconnectBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 32, padding: 12 },
  disconnectText: { fontSize: 13, color: COLORS.error },
});
