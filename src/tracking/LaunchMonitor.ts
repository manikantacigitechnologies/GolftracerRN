/**
 * Launch Monitor - Main Orchestrator
 * 
 * Coordinates the full tracking pipeline:
 * 1. Monitors camera for motion (impact detection)
 * 2. When impact detected, starts ball tracking
 * 3. Analyzes tracked positions to determine launch parameters
 * 4. Falls back to club-based estimation if vision tracking insufficient
 * 5. Runs physics simulation for full trajectory
 * 6. Outputs metrics + trajectory
 * 
 * Debug logging is built-in and can be toggled for testing.
 */

import {
  TrackingState,
  TrackingPhase,
  BallPosition,
  LaunchParameters,
  TrajectoryPoint,
  ShotMetrics,
  DebugInfo,
  CalibrationData,
  TrackingEvent,
  DetectionMethod,
} from './types';
import { TrajectoryEngine } from './TrajectoryEngine';
import { ICameraProvider } from './CameraProvider';
import {
  IMPACT_MOTION_SPIKE,
  MIN_FRAMES_FOR_TRACKING,
  TRACKING_TIMEOUT_MS,
  CLUB_DATA,
  MPH_TO_MS,
  SKILL_MULTIPLIERS,
  SkillLevel,
} from './constants';

export type TrackingEventHandler = (event: TrackingEvent) => void;

export class LaunchMonitor {
  private cameraProvider: ICameraProvider;
  private trajectoryEngine: TrajectoryEngine;
  private state: TrackingState;
  private eventHandlers: TrackingEventHandler[] = [];
  private debugEnabled: boolean;
  private skillLevel: SkillLevel;
  
  // Motion detection state
  private motionHistory: number[] = [];
  private motionBaseline = 0;
  private impactTimestamp: number | null = null;
  
  // Ball tracking state
  private trackedPositions: BallPosition[] = [];
  private trackingStartTime: number | null = null;
  
  // Debug timing
  private lastProcessTime = 0;
  private frameCount = 0;
  private fpsCounter = 0;
  private lastFpsTime = Date.now();

  constructor(
    cameraProvider: ICameraProvider,
    options?: {
      debug?: boolean;
      skillLevel?: SkillLevel;
    }
  ) {
    this.cameraProvider = cameraProvider;
    this.trajectoryEngine = new TrajectoryEngine();
    this.debugEnabled = options?.debug ?? false;
    this.skillLevel = options?.skillLevel ?? 'average';
    this.state = this.createInitialState();
  }

  // ── Public API ─────────────────────────────────────

  getState(): TrackingState {
    return { ...this.state };
  }

  getDebugInfo(): DebugInfo {
    return { ...this.state.debugInfo };
  }

  setDebugEnabled(enabled: boolean): void {
    this.debugEnabled = enabled;
  }

  setSkillLevel(level: SkillLevel): void {
    this.skillLevel = level;
  }

  onEvent(handler: TrackingEventHandler): () => void {
    this.eventHandlers.push(handler);
    return () => {
      this.eventHandlers = this.eventHandlers.filter(h => h !== handler);
    };
  }

  /**
   * Start monitoring for a shot. Call this when user is ready to swing.
   */
  startMonitoring(): void {
    this.reset();
    this.state.phase = 'ready';
    this.motionBaseline = 0;
    this.motionHistory = [];
    this.log('📡 Monitoring started - watching for impact...');
  }

  /**
   * Stop monitoring and reset state.
   */
  stopMonitoring(): void {
    this.state.phase = 'idle';
    this.log('⏹ Monitoring stopped');
  }

  /**
   * Feed a motion level reading from the camera/sensor.
   * This simulates frame analysis - in production with Meta Glasses,
   * this would be actual frame difference calculations.
   * 
   * @param motionLevel 0-100 representing detected motion intensity
   */
  processMotionFrame(motionLevel: number): void {
    const startTime = Date.now();
    this.frameCount++;
    this.fpsCounter++;

    // Update FPS counter
    const now = Date.now();
    if (now - this.lastFpsTime >= 1000) {
      this.state.debugInfo.fps = this.fpsCounter;
      this.fpsCounter = 0;
      this.lastFpsTime = now;
    }

    this.state.debugInfo.frameCount = this.frameCount;
    this.state.debugInfo.motionLevel = motionLevel;

    // Update motion history
    this.motionHistory.push(motionLevel);
    if (this.motionHistory.length > 30) {
      this.motionHistory.shift();
    }

    // Calculate baseline (average of recent non-spike frames)
    if (this.motionHistory.length >= 10) {
      const sorted = [...this.motionHistory].sort((a, b) => a - b);
      // Use median of lower 70% as baseline
      const baselineSlice = sorted.slice(0, Math.floor(sorted.length * 0.7));
      this.motionBaseline = baselineSlice.reduce((a, b) => a + b, 0) / baselineSlice.length;
    }

    // Impact detection
    if (this.state.phase === 'ready') {
      const spike = motionLevel - this.motionBaseline;
      
      if (spike > IMPACT_MOTION_SPIKE) {
        this.detectImpact(motionLevel);
      }
    }

    // Update processing time
    this.lastProcessTime = Date.now() - startTime;
    this.state.debugInfo.processingTimeMs = this.lastProcessTime;
  }

  /**
   * Register a detected ball position (from vision processing).
   * Call this when ball is found in a frame.
   */
  addBallDetection(position: BallPosition): void {
    if (this.state.phase !== 'tracking' && this.state.phase !== 'impact_detected') {
      return;
    }

    this.state.phase = 'tracking';
    this.trackedPositions.push(position);
    this.state.ballPositions.push(position);
    this.state.debugInfo.ballDetections = this.trackedPositions.length;
    this.state.debugInfo.detectionConfidence = position.confidence;

    this.emit({ type: 'ball_found', position });
    this.log(`🎯 Ball detected at (${position.x.toFixed(3)}, ${position.y.toFixed(3)}) conf=${position.confidence.toFixed(2)}`);

    // Check if we have enough for calculation
    if (this.trackedPositions.length >= MIN_FRAMES_FOR_TRACKING) {
      this.state.debugInfo.pipelineStage = 'Sufficient detections - can calculate';
    }
  }

  /**
   * Manually trigger a shot calculation.
   * Uses whatever data is available (vision positions + club data).
   */
  triggerCalculation(clubType?: string): ShotMetrics | null {
    this.state.phase = 'calculating';
    this.state.debugInfo.pipelineStage = 'Calculating trajectory...';
    this.log('🧮 Calculating trajectory...');

    const startTime = Date.now();
    let launchParams: LaunchParameters;
    let detectionMethod: DetectionMethod;

    // Try vision-based estimation first
    if (this.trackedPositions.length >= MIN_FRAMES_FOR_TRACKING) {
      const calibration = this.cameraProvider.getCalibration();
      const estimated = this.trajectoryEngine.estimateLaunchFromPositions(
        this.trackedPositions.map(p => ({
          x: p.x * calibration.pixelsPerMeter, // scale to pixels
          y: p.y * calibration.pixelsPerMeter,
          timestamp: p.timestamp,
        })),
        calibration
      );

      if (estimated && estimated.ballSpeed > 5) {
        launchParams = estimated;
        detectionMethod = this.trackedPositions.length >= 5 ? 'vision_tracked' : 'launch_estimated';
        this.log(`👁 Vision-based: speed=${(estimated.ballSpeed * 2.237).toFixed(1)}mph angle=${estimated.launchAngle.toFixed(1)}°`);
      } else {
        // Fall back to club-based
        launchParams = this.getClubBasedLaunch(clubType);
        detectionMethod = 'physics_only';
        this.log('⚠️ Vision insufficient, using club-based estimation');
      }
    } else if (clubType) {
      // No vision data, use club type
      launchParams = this.getClubBasedLaunch(clubType);
      detectionMethod = 'physics_only';
      this.log(`🏌️ Using club data: ${clubType}`);
    } else {
      // Hybrid: combine any partial vision data with defaults
      launchParams = this.getClubBasedLaunch('7 Iron'); // Default to 7 iron
      detectionMethod = 'physics_only';
      this.log('📊 No club selected, defaulting to 7 Iron');
    }

    // If we have some vision data but not enough for full tracking,
    // use it to adjust the club-based parameters
    if (detectionMethod === 'physics_only' && this.trackedPositions.length >= 2) {
      launchParams = this.hybridEstimation(launchParams, clubType);
      detectionMethod = 'hybrid';
      this.log('🔀 Hybrid estimation: club data + partial vision');
    }

    // Run trajectory simulation
    const { trajectory, metrics } = this.trajectoryEngine.calculate(launchParams, clubType);

    // Update metrics with detection method
    metrics.detectionMethod = detectionMethod;

    // Store results
    this.state.launchParams = launchParams;
    this.state.trajectory = trajectory;
    this.state.metrics = metrics;
    this.state.phase = 'complete';

    const calcTime = Date.now() - startTime;
    this.state.debugInfo.processingTimeMs = calcTime;
    this.state.debugInfo.pipelineStage = `Complete (${calcTime}ms)`;

    this.emit({ type: 'metrics_ready', metrics });
    this.logMetrics(metrics);

    return metrics;
  }

  /**
   * Quick shot: Record + calculate in one step.
   * Simulates motion detection for testing when real frame analysis isn't available.
   */
  simulateShot(clubType: string, variancePercent: number = 10): ShotMetrics {
    this.state.phase = 'calculating';
    this.state.debugInfo.pipelineStage = 'Calculating trajectory...';
    this.log('🏌️ Simulating shot: ' + clubType + ' (variance: ' + variancePercent + '%)');

    const club = CLUB_DATA[clubType] || CLUB_DATA['7 Iron'];
    const skillMult = SKILL_MULTIPLIERS[this.skillLevel];
    const variance = variancePercent / 100;

    // Apply variance: random deviation within ±variance range
    const speedVariance = 1 + (Math.random() - 0.5) * variance;
    const angleVariance = 1 + (Math.random() - 0.5) * variance * 0.5;
    const spinVariance = 1 + (Math.random() - 0.5) * variance * 0.3;

    // Calculate launch parameters directly from club data
    const ballSpeedMph = club.typicalBallSpeed * skillMult * speedVariance;
    const launchAngle = club.typicalLaunchAngle * angleVariance;
    const spinRate = club.typicalSpinRate * spinVariance;

    // Small random direction for shot shape variety
    const launchDirection = (Math.random() - 0.5) * 4; // ±2 degrees

    const launchParams: LaunchParameters = {
      ballSpeed: ballSpeedMph * MPH_TO_MS, // Convert to m/s for physics engine
      launchAngle: Math.max(1, Math.min(55, launchAngle)),
      launchDirection,
      spinRate: Math.max(1000, Math.min(12000, spinRate)),
      spinAxis: (Math.random() - 0.5) * 20, // ±10 degrees spin axis tilt
    };

    this.log('📊 Launch: ' + ballSpeedMph.toFixed(1) + 'mph, ' + launchAngle.toFixed(1) + '°, spin=' + spinRate.toFixed(0) + 'rpm');

    // Run physics simulation
    const { trajectory, metrics } = this.trajectoryEngine.calculate(launchParams, clubType);
    metrics.detectionMethod = 'physics_only';
    metrics.ballSpeed = Math.round(ballSpeedMph); // Display in mph

    // Store results in state
    this.state.launchParams = launchParams;
    this.state.trajectory = trajectory;
    this.state.metrics = metrics;
    this.state.phase = 'complete';
    this.state.debugInfo.pipelineStage = 'Complete';

    this.emit({ type: 'metrics_ready', metrics });
    this.logMetrics(metrics);

    return metrics;
  }

  /**
   * Reset all tracking state for a new shot.
   */
  reset(): void {
    this.state = this.createInitialState();
    this.trackedPositions = [];
    this.trackingStartTime = null;
    this.impactTimestamp = null;
    this.frameCount = 0;
  }

  // ── Private Methods ────────────────────────────────

  private detectImpact(motionLevel: number): void {
    this.impactTimestamp = Date.now();
    this.trackingStartTime = Date.now();
    this.state.phase = 'impact_detected';
    this.state.debugInfo.pipelineStage = 'Impact detected! Tracking ball...';
    
    const confidence = Math.min(1, motionLevel / 100);
    this.emit({ type: 'impact_detected', timestamp: this.impactTimestamp, confidence });
    this.log(`💥 IMPACT DETECTED! Motion spike: ${motionLevel} (baseline: ${this.motionBaseline.toFixed(1)})`);

    // Set timeout for tracking phase
    setTimeout(() => {
      if (this.state.phase === 'impact_detected' || this.state.phase === 'tracking') {
        this.log(`⏰ Tracking timeout - ${this.trackedPositions.length} positions collected`);
        if (this.trackedPositions.length > 0) {
          this.state.debugInfo.pipelineStage = 'Tracking timeout - ready for calculation';
        }
      }
    }, TRACKING_TIMEOUT_MS);
  }

  private getClubBasedLaunch(clubType?: string): LaunchParameters {
    const club = clubType || '7 Iron';
    const multiplier = SKILL_MULTIPLIERS[this.skillLevel];
    return this.trajectoryEngine.estimateLaunchFromClub(club, multiplier);
  }

  private hybridEstimation(
    clubLaunch: LaunchParameters,
    clubType?: string
  ): LaunchParameters {
    // Use vision data to adjust the direction and partially the speed
    if (this.trackedPositions.length < 2) return clubLaunch;

    const p0 = this.trackedPositions[0];
    const p1 = this.trackedPositions[this.trackedPositions.length - 1];
    
    // Adjust launch direction based on horizontal movement
    const horizontalMovement = p1.x - p0.x;
    const verticalMovement = p0.y - p1.y; // inverted
    
    // Crude angle estimation from vision
    const visionAngle = Math.atan2(verticalMovement, Math.abs(horizontalMovement)) * (180 / Math.PI);
    
    // Blend: 70% club data, 30% vision data
    const blendedAngle = clubLaunch.launchAngle * 0.7 + visionAngle * 0.3;
    
    return {
      ...clubLaunch,
      launchAngle: Math.max(0, Math.min(60, blendedAngle)),
      launchDirection: horizontalMovement > 0.1 ? 2 : horizontalMovement < -0.1 ? -2 : 0,
    };
  }

  private createInitialState(): TrackingState {
    return {
      phase: 'idle',
      ballPositions: [],
      launchParams: null,
      trajectory: [],
      metrics: null,
      debugInfo: {
        fps: 0,
        frameCount: 0,
        motionLevel: 0,
        detectionConfidence: 0,
        processingTimeMs: 0,
        ballDetections: 0,
        lastError: null,
        calibrationStatus: 'estimated',
        pipelineStage: 'Idle',
      },
    };
  }

  private emit(event: TrackingEvent): void {
    for (const handler of this.eventHandlers) {
      try {
        handler(event);
      } catch (e) {
        // Don't let handler errors crash the pipeline
      }
    }
  }

  private log(message: string): void {
    if (this.debugEnabled) {
      const timestamp = new Date().toISOString().substr(11, 12);
      console.log(`[LaunchMonitor ${timestamp}] ${message}`);
    }
  }

  private logMetrics(metrics: ShotMetrics): void {
    if (!this.debugEnabled) return;
    console.log('╔══════════════════════════════════════╗');
    console.log('║       SHOT METRICS RESULT            ║');
    console.log('╠══════════════════════════════════════╣');
    console.log(`║ Ball Speed:    ${metrics.ballSpeed} mph`);
    console.log(`║ Launch Angle:  ${metrics.launchAngle}°`);
    console.log(`║ Carry:         ${metrics.carryDistance} yards`);
    console.log(`║ Total:         ${metrics.totalDistance} yards`);
    console.log(`║ Apex Height:   ${metrics.apexHeight} yards`);
    console.log(`║ Hang Time:     ${metrics.hangTime}s`);
    console.log(`║ Landing Angle: ${metrics.landingAngle}°`);
    console.log(`║ Spin Rate:     ${metrics.spinRate} rpm`);
    console.log(`║ Shot Shape:    ${metrics.shotShape}`);
    console.log(`║ Confidence:    ${(metrics.confidence * 100).toFixed(0)}%`);
    console.log(`║ Method:        ${metrics.detectionMethod}`);
    console.log('╚══════════════════════════════════════╝');
  }
}
