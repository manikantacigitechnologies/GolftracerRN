/**
 * Golf Ball Tracking - Type Definitions
 * 
 * Architecture: Designed for phone camera now, Meta Smart Glasses later.
 * The CameraSource type allows swapping input without changing the pipeline.
 */

export type CameraSource = 'phone' | 'meta_glasses' | 'simulator';

export interface FrameData {
  timestamp: number;       // ms since recording start
  frameIndex: number;
  width: number;
  height: number;
  // Raw pixel data would go here for native processing
  // For now we use motion vectors from the camera
}

export interface BallPosition {
  x: number;              // normalized 0-1 (left to right)
  y: number;              // normalized 0-1 (top to bottom)
  confidence: number;     // 0-1 detection confidence
  radius: number;         // estimated ball radius in pixels
  timestamp: number;      // ms since recording start
  frameIndex: number;
}

export interface LaunchParameters {
  launchAngle: number;        // degrees (vertical angle from ground)
  launchDirection: number;    // degrees (horizontal: 0=straight, +=right, -=left)
  ballSpeed: number;          // m/s at launch
  spinRate: number;           // rpm (estimated)
  spinAxis: number;           // degrees tilt of spin axis
}

export interface TrajectoryPoint {
  x: number;   // meters forward (distance from tee)
  y: number;   // meters height (altitude)
  z: number;   // meters lateral (left/right)
  time: number; // seconds since launch
}

export interface ShotMetrics {
  // Primary metrics
  ballSpeed: number;          // mph
  launchAngle: number;        // degrees
  carryDistance: number;       // yards
  totalDistance: number;       // yards (carry + roll)
  
  // Secondary metrics
  apexHeight: number;         // yards (max height)
  hangTime: number;           // seconds in air
  landingAngle: number;       // degrees at landing
  spinRate: number;           // rpm
  
  // Direction
  offlineDistance: number;    // yards left(-) or right(+) of target line
  curveAmount: number;        // yards of curve (draw/fade)
  shotShape: ShotShape;
  
  // Confidence
  confidence: number;         // 0-1 overall confidence in calculations
  detectionMethod: DetectionMethod;
}

export type ShotShape = 
  | 'straight'
  | 'fade' 
  | 'draw' 
  | 'slice' 
  | 'hook' 
  | 'push' 
  | 'pull';

export type DetectionMethod = 
  | 'vision_tracked'         // Ball detected in multiple frames
  | 'launch_estimated'       // Estimated from first 2-3 frames
  | 'physics_only'           // Club data + physics model only
  | 'hybrid';               // Combination of methods

export interface TrackingState {
  phase: TrackingPhase;
  ballPositions: BallPosition[];
  launchParams: LaunchParameters | null;
  trajectory: TrajectoryPoint[];
  metrics: ShotMetrics | null;
  debugInfo: DebugInfo;
}

export type TrackingPhase = 
  | 'idle'                   // Waiting for shot
  | 'ready'                  // Camera active, watching for motion
  | 'impact_detected'        // Motion spike detected
  | 'tracking'              // Tracking ball in frames
  | 'calculating'           // Computing trajectory
  | 'complete'              // Results ready
  | 'error';

export interface DebugInfo {
  fps: number;
  frameCount: number;
  motionLevel: number;       // 0-100 current motion intensity
  detectionConfidence: number;
  processingTimeMs: number;
  ballDetections: number;
  lastError: string | null;
  calibrationStatus: CalibrationStatus;
  pipelineStage: string;
}

export type CalibrationStatus = 'uncalibrated' | 'estimated' | 'calibrated';

export interface CalibrationData {
  // Distance from camera to ball at address (meters)
  cameraDistance: number;
  // Camera height from ground (meters)
  cameraHeight: number;
  // Camera angle (degrees from horizontal)
  cameraAngle: number;
  // Pixels per meter at ball distance (estimated)
  pixelsPerMeter: number;
  // Frame rate of camera
  fps: number;
}

export interface ClubData {
  name: string;
  typicalBallSpeed: number;    // mph
  typicalLaunchAngle: number;  // degrees
  typicalSpinRate: number;     // rpm
  typicalCarry: number;        // yards (average amateur)
  loftAngle: number;           // degrees
}

// Event system for pipeline communication
export type TrackingEvent = 
  | { type: 'motion_detected'; level: number; timestamp: number }
  | { type: 'impact_detected'; timestamp: number; confidence: number }
  | { type: 'ball_found'; position: BallPosition }
  | { type: 'ball_lost'; lastPosition: BallPosition }
  | { type: 'tracking_complete'; positions: BallPosition[] }
  | { type: 'metrics_ready'; metrics: ShotMetrics }
  | { type: 'error'; message: string };
