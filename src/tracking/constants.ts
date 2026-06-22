/**
 * Golf Physics Constants and Club Data
 * 
 * Based on verified golf physics research and PGA/amateur statistics.
 * Sources: TrackMan, FlightScope published data, USGA research.
 */

import { ClubData } from './types';

// ── Physical Constants ───────────────────────────────

export const GRAVITY = 9.81;                    // m/s²
export const AIR_DENSITY = 1.225;               // kg/m³ at sea level
export const BALL_MASS = 0.04593;               // kg (1.62 oz)
export const BALL_DIAMETER = 0.04267;           // m (1.68 inches)
export const BALL_RADIUS = BALL_DIAMETER / 2;
export const BALL_AREA = Math.PI * BALL_RADIUS * BALL_RADIUS; // cross-sectional area

// Aerodynamic coefficients (empirically derived for golf balls)
export const DRAG_COEFFICIENT = 0.25;           // Cd for dimpled golf ball
export const LIFT_COEFFICIENT_FACTOR = 0.00015; // Cl per rpm of backspin
export const MAGNUS_FACTOR = 0.00002;           // Side force per rpm of sidespin

// Roll estimation
export const ROLL_FACTOR_DRIVER = 0.15;         // 15% of carry added as roll
export const ROLL_FACTOR_IRON = 0.05;           // 5% for higher-lofted clubs
export const ROLL_FACTOR_WEDGE = -0.02;         // Wedges can spin back

// ── Unit Conversions ─────────────────────────────────

export const MPH_TO_MS = 0.44704;
export const MS_TO_MPH = 2.23694;
export const METERS_TO_YARDS = 1.09361;
export const YARDS_TO_METERS = 0.9144;
export const DEG_TO_RAD = Math.PI / 180;
export const RAD_TO_DEG = 180 / Math.PI;

// ── Club Database (Average Amateur Data) ─────────────

export const CLUB_DATA: Record<string, ClubData> = {
  'Driver': {
    name: 'Driver',
    typicalBallSpeed: 132,
    typicalLaunchAngle: 12.5,
    typicalSpinRate: 2800,
    typicalCarry: 200,
    loftAngle: 10.5,
  },
  '3 Wood': {
    name: '3 Wood',
    typicalBallSpeed: 120,
    typicalLaunchAngle: 11.0,
    typicalSpinRate: 3500,
    typicalCarry: 180,
    loftAngle: 15,
  },
  '5 Wood': {
    name: '5 Wood',
    typicalBallSpeed: 112,
    typicalLaunchAngle: 12.5,
    typicalSpinRate: 4000,
    typicalCarry: 165,
    loftAngle: 18,
  },
  '3 Iron': {
    name: '3 Iron',
    typicalBallSpeed: 115,
    typicalLaunchAngle: 11.5,
    typicalSpinRate: 3800,
    typicalCarry: 170,
    loftAngle: 21,
  },
  '4 Iron': {
    name: '4 Iron',
    typicalBallSpeed: 110,
    typicalLaunchAngle: 13.0,
    typicalSpinRate: 4200,
    typicalCarry: 160,
    loftAngle: 24,
  },
  '5 Iron': {
    name: '5 Iron',
    typicalBallSpeed: 105,
    typicalLaunchAngle: 14.5,
    typicalSpinRate: 4700,
    typicalCarry: 150,
    loftAngle: 27,
  },
  '6 Iron': {
    name: '6 Iron',
    typicalBallSpeed: 100,
    typicalLaunchAngle: 16.0,
    typicalSpinRate: 5200,
    typicalCarry: 140,
    loftAngle: 30,
  },
  '7 Iron': {
    name: '7 Iron',
    typicalBallSpeed: 95,
    typicalLaunchAngle: 18.0,
    typicalSpinRate: 5800,
    typicalCarry: 130,
    loftAngle: 34,
  },
  '8 Iron': {
    name: '8 Iron',
    typicalBallSpeed: 90,
    typicalLaunchAngle: 20.5,
    typicalSpinRate: 6500,
    typicalCarry: 120,
    loftAngle: 38,
  },
  '9 Iron': {
    name: '9 Iron',
    typicalBallSpeed: 85,
    typicalLaunchAngle: 23.0,
    typicalSpinRate: 7200,
    typicalCarry: 110,
    loftAngle: 42,
  },
  'PW': {
    name: 'PW',
    typicalBallSpeed: 80,
    typicalLaunchAngle: 25.5,
    typicalSpinRate: 8000,
    typicalCarry: 100,
    loftAngle: 46,
  },
  'SW': {
    name: 'SW',
    typicalBallSpeed: 70,
    typicalLaunchAngle: 30.0,
    typicalSpinRate: 9000,
    typicalCarry: 80,
    loftAngle: 54,
  },
  'LW': {
    name: 'LW',
    typicalBallSpeed: 60,
    typicalLaunchAngle: 34.0,
    typicalSpinRate: 9500,
    typicalCarry: 60,
    loftAngle: 58,
  },
  'Putter': {
    name: 'Putter',
    typicalBallSpeed: 10,
    typicalLaunchAngle: 2.0,
    typicalSpinRate: 500,
    typicalCarry: 0,
    loftAngle: 4,
  },
};

// ── Detection Thresholds ─────────────────────────────

// Motion detection
export const MOTION_THRESHOLD_LOW = 15;
export const MOTION_THRESHOLD_MEDIUM = 30;
export const MOTION_THRESHOLD_HIGH = 50;
export const IMPACT_MOTION_SPIKE = 70;          // Motion level that indicates impact

// Ball detection
export const MIN_BALL_RADIUS_PX = 3;            // Minimum detectable ball radius
export const MAX_BALL_RADIUS_PX = 30;           // Maximum expected ball radius
export const BALL_BRIGHTNESS_MIN = 180;         // White ball brightness threshold (0-255)
export const BALL_CIRCULARITY_MIN = 0.7;        // How round the detection must be (0-1)

// Tracking
export const MIN_FRAMES_FOR_TRACKING = 3;       // Minimum frames to establish trajectory
export const MAX_FRAMES_TRACKABLE = 15;         // Ball typically visible for this many frames
export const TRACKING_TIMEOUT_MS = 2000;        // Max time to wait for ball after impact
export const POSITION_SMOOTHING = 0.3;          // Exponential smoothing factor

// Frame timing
export const STANDARD_FPS = 30;
export const SLOW_MO_FPS = 120;
export const FRAME_INTERVAL_30FPS = 33.33;      // ms between frames at 30fps

// ── Calibration Defaults ─────────────────────────────

export const DEFAULT_CAMERA_DISTANCE = 3.0;     // meters from ball (tripod/hand position)
export const DEFAULT_CAMERA_HEIGHT = 1.2;       // meters (chest/hand height)
export const DEFAULT_CAMERA_ANGLE = -5;         // degrees (slightly angled down)
export const DEFAULT_PIXELS_PER_METER = 350;    // at 3m distance with phone camera
export const DEFAULT_FPS = 30;

// ── Swing Speed Multipliers ──────────────────────────
// Allows adjusting calculations based on player skill level

export type SkillLevel = 'beginner' | 'average' | 'advanced' | 'pro';

export const SKILL_MULTIPLIERS: Record<SkillLevel, number> = {
  beginner: 0.70,
  average: 0.85,
  advanced: 1.0,
  pro: 1.15,
};
