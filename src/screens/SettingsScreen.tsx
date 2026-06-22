import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  StatusBar,
  Linking,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { RootStackParamList } from '../types';
import { COLORS, FONTS, SIZES, SHADOWS } from '../utils/theme';
import { AppSettings, loadSettings, saveSettings, loadAllShots } from '../utils/shotStore';

export default function SettingsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [shotCount, setShotCount] = useState(0);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const loadData = async () => {
    const [s, shots] = await Promise.all([loadSettings(), loadAllShots()]);
    setSettings(s);
    setShotCount(shots.length);
  };

  const updateSetting = async <K extends keyof AppSettings>(
    key: K,
    value: AppSettings[K]
  ) => {
    if (!settings) return;
    const updated = { ...settings, [key]: value };
    setSettings(updated);
    await saveSettings(updated);
  };

  const handleClearData = () => {
    Alert.alert(
      'Clear All Data',
      `This will delete all ${shotCount} shots and reset settings. This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear Everything',
          style: 'destructive',
          onPress: async () => {
            await AsyncStorage.clear();
            setSettings(null);
            setShotCount(0);
            loadData();
            Alert.alert('Done', 'All data has been cleared.');
          },
        },
      ]
    );
  };

  const handleResetOnboarding = async () => {
    await AsyncStorage.removeItem('@golftracer_onboarding_done');
    navigation.replace('Onboarding');
  };

  if (!settings) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Header */}
        <LinearGradient
          colors={[COLORS.primaryDark, COLORS.background]}
          style={styles.header}
        >
          <Text style={styles.headerTitle}>Settings</Text>
          <Text style={styles.headerSub}>Customize your experience</Text>
        </LinearGradient>

        {/* Camera section */}
        <SectionLabel label="Camera" />

        <View style={styles.card}>
          <SettingRow
            icon="videocam-outline"
            label="Video Quality"
            value={settings.videoQuality.charAt(0).toUpperCase() + settings.videoQuality.slice(1)}
            onPress={() => {
              const options: AppSettings['videoQuality'][] = ['low', 'medium', 'high'];
              const nextIdx =
                (options.indexOf(settings.videoQuality) + 1) % options.length;
              updateSetting('videoQuality', options[nextIdx]);
            }}
          />
          <Divider />
          <ToggleRow
            icon="radio-button-on-outline"
            label="Auto-Record on Detection"
            value={settings.autoRecord}
            onToggle={(v) => updateSetting('autoRecord', v)}
          />
          <Divider />
          <ToggleRow
            icon="bug-outline"
            label="Show Debug Overlay"
            value={settings.showDebugOverlay}
            onToggle={(v) => updateSetting('showDebugOverlay', v)}
          />
        </View>

        {/* Detection section */}
        <SectionLabel label="Detection" />

        <View style={styles.card}>
          <SettingRow
            icon="sunny-outline"
            label="Brightness Threshold"
            value={`${settings.brightnessThreshold}`}
            onPress={() => {
              const values = [180, 190, 200, 210, 220, 230];
              const nextIdx =
                (values.indexOf(settings.brightnessThreshold) + 1) % values.length;
              updateSetting('brightnessThreshold', values[nextIdx] ?? 200);
            }}
          />
          <Divider />
          <SettingRow
            icon="speedometer-outline"
            label="Motion Sensitivity"
            value={`${settings.motionSensitivity}`}
            onPress={() => {
              const values = [15, 20, 25, 30, 35, 40];
              const nextIdx =
                (values.indexOf(settings.motionSensitivity) + 1) % values.length;
              updateSetting('motionSensitivity', values[nextIdx] ?? 25);
            }}
          />
        </View>

        {/* General section */}
        <SectionLabel label="General" />

        <View style={styles.card}>
          <ToggleRow
            icon="phone-portrait-outline"
            label="Haptic Feedback"
            value={settings.hapticFeedback}
            onToggle={(v) => updateSetting('hapticFeedback', v)}
          />
        </View>

        {/* Smart Glasses section */}
        <SectionLabel label="Smart Glasses" />

        <View style={styles.card}>
          <TouchableOpacity style={styles.settingRow} onPress={() => navigation.navigate('Glasses')}>
            <Ionicons name="glasses-outline" size={22} color={COLORS.accent} />
            <Text style={styles.settingLabel}>Connect HeyCyan Glasses</Text>
            <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Data section */}
        <SectionLabel label="Data" />

        <View style={styles.card}>
          <SettingRow
            icon="folder-outline"
            label="Stored Shots"
            value={`${shotCount} shots`}
          />
          <Divider />
          <TouchableOpacity style={styles.settingRow} onPress={handleClearData}>
            <Ionicons name="trash-outline" size={22} color={COLORS.error} />
            <Text style={[styles.settingLabel, { color: COLORS.error }]}>
              Clear All Data
            </Text>
          </TouchableOpacity>
        </View>

        {/* About section */}
        <SectionLabel label="About" />

        <View style={styles.card}>
          <SettingRow icon="information-circle-outline" label="Version" value="2.0.0" />
          <Divider />
          <TouchableOpacity style={styles.settingRow} onPress={handleResetOnboarding}>
            <Ionicons name="refresh-outline" size={22} color={COLORS.textSecondary} />
            <Text style={styles.settingLabel}>Show Onboarding</Text>
            <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
          </TouchableOpacity>
        </View>

        {/* App info */}
        <View style={styles.appInfo}>
          <View style={styles.appInfoIcon}>
            <Ionicons name="golf" size={24} color={COLORS.accent} />
          </View>
          <Text style={styles.appInfoName}>GolfTracer</Text>
          <Text style={styles.appInfoSub}>
            Track Every Shot. Trace Every Flight.
          </Text>
          <Text style={styles.appInfoVersion}>
            Built with React Native + Expo
          </Text>
        </View>

        <View style={{ height: SIZES.tabBarHeight + 20 }} />
      </ScrollView>
    </View>
  );
}

// ── Sub-components ──────────────────────────────────

function SectionLabel({ label }: { label: string }) {
  return <Text style={styles.sectionLabel}>{label}</Text>;
}

function Divider() {
  return <View style={styles.divider} />;
}

function SettingRow({
  icon,
  label,
  value,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value?: string;
  onPress?: () => void;
}) {
  const content = (
    <View style={styles.settingRow}>
      <Ionicons name={icon} size={22} color={COLORS.textSecondary} />
      <Text style={styles.settingLabel}>{label}</Text>
      {value && <Text style={styles.settingValue}>{value}</Text>}
      {onPress && (
        <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
      )}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.6}>
        {content}
      </TouchableOpacity>
    );
  }
  return content;
}

function ToggleRow({
  icon,
  label,
  value,
  onToggle,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: boolean;
  onToggle: (v: boolean) => void;
}) {
  return (
    <View style={styles.settingRow}>
      <Ionicons name={icon} size={22} color={COLORS.textSecondary} />
      <Text style={styles.settingLabel}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ false: COLORS.surfaceLight, true: COLORS.accent + '60' }}
        thumbColor={value ? COLORS.accent : COLORS.textMuted}
      />
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

  sectionLabel: {
    fontSize: SIZES.fontSm,
    color: COLORS.textMuted,
    ...FONTS.semiBold,
    textTransform: 'uppercase',
    letterSpacing: 1,
    paddingHorizontal: SIZES.lg,
    marginTop: SIZES.lg,
    marginBottom: SIZES.sm,
  },

  card: {
    backgroundColor: COLORS.card,
    borderRadius: SIZES.radiusMd,
    marginHorizontal: SIZES.lg,
    overflow: 'hidden',
  },

  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SIZES.md,
    gap: SIZES.md,
  },
  settingLabel: {
    flex: 1,
    fontSize: SIZES.fontMd,
    color: COLORS.white,
    ...FONTS.medium,
  },
  settingValue: {
    fontSize: SIZES.fontMd,
    color: COLORS.textSecondary,
  },

  divider: {
    height: 1,
    backgroundColor: COLORS.divider,
    marginLeft: SIZES.md + 22 + SIZES.md, // icon + gap + padding
  },

  appInfo: {
    alignItems: 'center',
    marginTop: SIZES.xl,
    gap: 4,
  },
  appInfoIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.accent + '40',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SIZES.sm,
  },
  appInfoName: {
    fontSize: SIZES.fontXl,
    color: COLORS.white,
    ...FONTS.bold,
  },
  appInfoSub: {
    fontSize: SIZES.fontSm,
    color: COLORS.textSecondary,
  },
  appInfoVersion: {
    fontSize: SIZES.fontXs,
    color: COLORS.textMuted,
    marginTop: 4,
  },
});
