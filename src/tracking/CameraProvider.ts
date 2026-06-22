/**
 * Camera Provider - Abstraction Layer
 * 
 * Provides a unified interface for camera input regardless of source.
 * Currently implements phone camera; designed to be extended for Meta Smart Glasses.
 * 
 * Migration path to Meta Glasses:
 * 1. Create MetaGlassesCameraProvider implementing ICameraProvider
 * 2. Swap provider in LaunchMonitor initialization
 * 3. All downstream processing remains unchanged
 */

import { CameraSource, CalibrationData, FrameData } from './types';
import {
  DEFAULT_CAMERA_DISTANCE,
  DEFAULT_CAMERA_HEIGHT,
  DEFAULT_CAMERA_ANGLE,
  DEFAULT_PIXELS_PER_METER,
  DEFAULT_FPS,
} from './constants';

// ── Camera Provider Interface ────────────────────────

export interface ICameraProvider {
  source: CameraSource;
  isReady: boolean;
  calibration: CalibrationData;
  
  initialize(): Promise<void>;
  getCalibration(): CalibrationData;
  updateCalibration(partial: Partial<CalibrationData>): void;
  
  // Frame rate info
  getEffectiveFPS(): number;
  getResolution(): { width: number; height: number };
  
  // For future: real-time frame access
  // onFrame?: (frame: FrameData) => void;
  
  dispose(): void;
}

// ── Phone Camera Provider ────────────────────────────

export class PhoneCameraProvider implements ICameraProvider {
  source: CameraSource = 'phone';
  isReady = false;
  calibration: CalibrationData;

  private resolution = { width: 1920, height: 1080 };

  constructor(calibration?: Partial<CalibrationData>) {
    this.calibration = {
      cameraDistance: calibration?.cameraDistance ?? DEFAULT_CAMERA_DISTANCE,
      cameraHeight: calibration?.cameraHeight ?? DEFAULT_CAMERA_HEIGHT,
      cameraAngle: calibration?.cameraAngle ?? DEFAULT_CAMERA_ANGLE,
      pixelsPerMeter: calibration?.pixelsPerMeter ?? DEFAULT_PIXELS_PER_METER,
      fps: calibration?.fps ?? DEFAULT_FPS,
    };
  }

  async initialize(): Promise<void> {
    // Phone camera initialization is handled by expo-camera
    // This layer just tracks state
    this.isReady = true;
  }

  getCalibration(): CalibrationData {
    return { ...this.calibration };
  }

  updateCalibration(partial: Partial<CalibrationData>): void {
    this.calibration = { ...this.calibration, ...partial };
    // Recalculate pixels per meter based on distance
    if (partial.cameraDistance) {
      // Approximate: at 1m, phone captures ~0.8m width in frame
      // pixelsPerMeter ≈ resolution.width / (visible_width_at_distance)
      // visible_width ≈ 2 * distance * tan(FOV/2) where FOV ≈ 70° for phone
      const fovRad = (70 * Math.PI) / 180;
      const visibleWidth = 2 * partial.cameraDistance * Math.tan(fovRad / 2);
      this.calibration.pixelsPerMeter = this.resolution.width / visibleWidth;
    }
  }

  getEffectiveFPS(): number {
    return this.calibration.fps;
  }

  getResolution(): { width: number; height: number } {
    return { ...this.resolution };
  }

  setResolution(width: number, height: number): void {
    this.resolution = { width, height };
  }

  dispose(): void {
    this.isReady = false;
  }
}

// ── Meta Glasses Provider (Placeholder) ──────────────

export class MetaGlassesCameraProvider implements ICameraProvider {
  source: CameraSource = 'meta_glasses';
  isReady = false;
  calibration: CalibrationData;

  constructor() {
    // Meta Ray-Ban glasses have specific camera specs
    this.calibration = {
      cameraDistance: 0.0,    // Glasses are on the head, looking at ball
      cameraHeight: 1.7,     // Eye level
      cameraAngle: -30,      // Looking down at ball
      pixelsPerMeter: 500,   // Higher resolution at closer viewing angle
      fps: 30,
    };
  }

  async initialize(): Promise<void> {
    // TODO: Initialize Meta Glasses SDK connection
    // await MetaGlassesSDK.connect();
    // await MetaGlassesSDK.startCamera();
    throw new Error('Meta Glasses support not yet implemented. Coming in Phase 2.');
  }

  getCalibration(): CalibrationData {
    return { ...this.calibration };
  }

  updateCalibration(partial: Partial<CalibrationData>): void {
    this.calibration = { ...this.calibration, ...partial };
  }

  getEffectiveFPS(): number {
    return this.calibration.fps;
  }

  getResolution(): { width: number; height: number } {
    return { width: 1280, height: 720 }; // Meta glasses camera resolution
  }

  dispose(): void {
    this.isReady = false;
  }
}

// ── Factory ──────────────────────────────────────────

export function createCameraProvider(
  source: CameraSource,
  calibration?: Partial<CalibrationData>
): ICameraProvider {
  switch (source) {
    case 'phone':
      return new PhoneCameraProvider(calibration);
    case 'meta_glasses':
      return new MetaGlassesCameraProvider();
    default:
      return new PhoneCameraProvider(calibration);
  }
}
