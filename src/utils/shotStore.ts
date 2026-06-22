import AsyncStorage from '@react-native-async-storage/async-storage';
import { Shot, ShotStats } from '../types';

const SHOTS_KEY = '@golftracer_shots';
const SETTINGS_KEY = '@golftracer_settings';
const ONBOARDING_KEY = '@golftracer_onboarding_done';

// ── Shot persistence ────────────────────────────────

export async function loadAllShots(): Promise<Shot[]> {
  try {
    const json = await AsyncStorage.getItem(SHOTS_KEY);
    if (!json) return [];
    const shots: Shot[] = JSON.parse(json);
    return shots.sort((a, b) => b.timestamp - a.timestamp);
  } catch {
    return [];
  }
}

export async function saveShot(shot: Shot): Promise<void> {
  const shots = await loadAllShots();
  shots.unshift(shot);
  await AsyncStorage.setItem(SHOTS_KEY, JSON.stringify(shots));
}

export async function deleteShot(shotId: string): Promise<void> {
  const shots = await loadAllShots();
  const filtered = shots.filter((s) => s.id !== shotId);
  await AsyncStorage.setItem(SHOTS_KEY, JSON.stringify(filtered));
}

export async function updateShot(updated: Shot): Promise<void> {
  const shots = await loadAllShots();
  const idx = shots.findIndex((s) => s.id === updated.id);
  if (idx >= 0) shots[idx] = updated;
  await AsyncStorage.setItem(SHOTS_KEY, JSON.stringify(shots));
}

// ── Statistics ──────────────────────────────────────

export async function computeStats(): Promise<ShotStats> {
  const shots = await loadAllShots();
  const now = Date.now();
  const weekAgo = now - 7 * 24 * 60 * 60 * 1000;

  const thisWeek = shots.filter((s) => s.timestamp >= weekAgo).length;
  const avgTrailPoints =
    shots.length > 0
      ? Math.round(shots.reduce((sum, s) => sum + s.trail.length, 0) / shots.length)
      : 0;
  const longestTrail = shots.reduce((max, s) => Math.max(max, s.trail.length), 0);
  const landingCount = shots.filter((s) => s.landing !== null).length;
  const landingRate = shots.length > 0 ? Math.round((landingCount / shots.length) * 100) : 0;

  // Count unique days
  const uniqueDays = new Set(
    shots.map((s) => new Date(s.timestamp).toDateString())
  );

  return {
    totalShots: shots.length,
    thisWeek,
    avgTrailPoints,
    longestTrail,
    sessionsCount: uniqueDays.size,
    landingRate,
  };
}

// ── Onboarding ──────────────────────────────────────

export async function isOnboardingDone(): Promise<boolean> {
  const val = await AsyncStorage.getItem(ONBOARDING_KEY);
  return val === 'true';
}

export async function markOnboardingDone(): Promise<void> {
  await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
}

// ── Settings ────────────────────────────────────────

export interface AppSettings {
  videoQuality: 'low' | 'medium' | 'high';
  autoRecord: boolean;
  hapticFeedback: boolean;
  darkMode: boolean;
  showDebugOverlay: boolean;
  brightnessThreshold: number;
  motionSensitivity: number;
}

const DEFAULT_SETTINGS: AppSettings = {
  videoQuality: 'high',
  autoRecord: true,
  hapticFeedback: true,
  darkMode: true,
  showDebugOverlay: false,
  brightnessThreshold: 200,
  motionSensitivity: 25,
};

export async function loadSettings(): Promise<AppSettings> {
  try {
    const json = await AsyncStorage.getItem(SETTINGS_KEY);
    if (!json) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(json) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}
