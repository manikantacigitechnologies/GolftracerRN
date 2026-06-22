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

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { RootStackParamList } from '../types';
import { COLORS, FONTS } from '../utils/theme';
import { heyCyanGlasses, GlassesDevice } from '../tracking/HeyCyanBridge';

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

    return () => { unsub?.(); };
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
    try {
      await heyCyanGlasses.startVideoRecording();
      setRecording(true);
    } catch (e: any) {
      Alert.alert('Recording Error', e.message);
    }
  };

  const handleStopRecording = async () => {
    try {
      await heyCyanGlasses.stopVideoRecording();
      setRecording(false);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  };

  const handleDownloadVideo = async () => {
    setDownloading(true);
    try {
      const filePath = await heyCyanGlasses.downloadLatestVideo();
      Alert.alert('Download Complete', `Video saved to:\n${filePath}`, [
        { text: 'OK' },
      ]);
    } catch (e: any) {
      Alert.alert('Download Failed', e.message);
    } finally {
      setDownloading(false);
    }
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
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={COLORS.white} />
          </TouchableOpacity>
          <Text style={styles.title}>Glasses Connected</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.connectedCard}>
          <Ionicons name="glasses" size={48} color={COLORS.accent} />
          <Text style={styles.deviceName}>{connectedDevice?.name || 'HeyCyan Glasses'}</Text>
          {battery && (
            <View style={styles.batteryRow}>
              <Ionicons
                name={battery.charging ? 'battery-charging' : battery.level > 50 ? 'battery-full' : 'battery-half'}
                size={20}
                color={battery.level > 20 ? COLORS.accent : COLORS.error}
              />
              <Text style={styles.batteryText}>{battery.level}%</Text>
            </View>
          )}
        </View>

        <View style={styles.controlsSection}>
          <Text style={styles.sectionTitle}>Video Control</Text>

          {!recording ? (
            <TouchableOpacity style={styles.actionBtn} onPress={handleStartRecording}>
              <Ionicons name="videocam" size={22} color={COLORS.textDark} />
              <Text style={styles.actionBtnText}>Start Recording</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={[styles.actionBtn, styles.stopActionBtn]} onPress={handleStopRecording}>
              <Ionicons name="stop-circle" size={22} color={COLORS.white} />
              <Text style={[styles.actionBtnText, { color: COLORS.white }]}>Stop Recording</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.actionBtn, styles.downloadBtn, downloading && styles.disabledBtn]}
            onPress={handleDownloadVideo}
            disabled={downloading}
          >
            {downloading ? (
              <ActivityIndicator size="small" color={COLORS.textDark} />
            ) : (
              <Ionicons name="cloud-download" size={22} color={COLORS.textDark} />
            )}
            <Text style={styles.actionBtnText}>
              {downloading ? 'Downloading...' : 'Download Latest Video'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.controlsSection}>
          <Text style={styles.sectionTitle}>Use as Camera</Text>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => {
              // Navigate to camera screen with glasses source
              navigation.navigate('Camera' as any, { source: 'glasses' });
            }}
          >
            <Ionicons name="golf" size={22} color={COLORS.textDark} />
            <Text style={styles.actionBtnText}>Track Shot with Glasses</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.disconnectBtn} onPress={handleDisconnect}>
          <Ionicons name="close-circle-outline" size={18} color={COLORS.error} />
          <Text style={styles.disconnectText}>Disconnect</Text>
        </TouchableOpacity>
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

  // Disconnect
  disconnectBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 32, padding: 12 },
  disconnectText: { fontSize: 13, color: COLORS.error },
});
