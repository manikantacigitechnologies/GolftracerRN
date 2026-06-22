export interface TrailPoint {
  x: number;
  y: number;
  timestamp: number;
}

export interface Shot {
  id: string;
  videoUri: string | null;
  thumbnailUri: string | null;
  timestamp: number;
  trail: TrailPoint[];
  landing: { x: number; y: number } | null;
  captureWidth: number;
  captureHeight: number;
  durationMs: number;
  clubType: ClubType | null;
  notes: string;
}

export type ClubType =
  | 'Driver'
  | '3 Wood'
  | '5 Wood'
  | '3 Iron'
  | '4 Iron'
  | '5 Iron'
  | '6 Iron'
  | '7 Iron'
  | '8 Iron'
  | '9 Iron'
  | 'PW'
  | 'SW'
  | 'LW'
  | 'Putter';

export interface ShotStats {
  totalShots: number;
  thisWeek: number;
  avgTrailPoints: number;
  longestTrail: number;
  sessionsCount: number;
  landingRate: number; // percentage of shots with detected landing
}

export interface DetectionSettings {
  brightnessThreshold: number;
  motionSensitivity: number;
  minBallRadius: number;
  maxBallRadius: number;
  lockOnFrames: number;
}

export interface ShotMetricsData {
  ballSpeed: number;          // mph
  launchAngle: number;        // degrees
  carryDistance: number;       // yards
  totalDistance: number;       // yards
  apexHeight: number;         // yards
  hangTime: number;           // seconds
  landingAngle: number;       // degrees
  spinRate: number;           // rpm
  shotShape: string;
  confidence: number;         // 0-1
  detectionMethod: string;
}

export type RootStackParamList = {
  Splash: undefined;
  Onboarding: undefined;
  MainTabs: undefined;
  Camera: undefined;
  Glasses: undefined;
  ShotDetail: { shotId: string };
};

export type TabParamList = {
  Home: undefined;
  History: undefined;
  Stats: undefined;
  Settings: undefined;
};
