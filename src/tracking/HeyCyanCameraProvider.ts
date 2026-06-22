/**
 * HeyCyan Glasses Camera Provider
 * 
 * Implements ICameraProvider for HeyCyan smart glasses.
 * Records video on glasses via BLE, downloads via WiFi P2P.
 * 
 * Key differences from PhoneCameraProvider:
 * - Camera is at eye level (glasses on head), looking at ball on ground
 * - Wide-angle lens on glasses (~120° FOV)
 * - Video is captured on glasses, then transferred to phone
 * - Cannot access frames in real-time (video analyzed after download)
 */

import { ICameraProvider } from './CameraProvider';
import { CameraSource, CalibrationData } from './types';
import { heyCyanGlasses, GlassesDevice } from './HeyCyanBridge';

export class HeyCyanCameraProvider implements ICameraProvider {
  source: CameraSource = 'meta_glasses'; // Reuse type for smart glasses
  isReady = false;
  calibration: CalibrationData;

  private connected = false;
  private recording = false;
  private deviceAddress: string | null = null;

  constructor() {
    // HeyCyan glasses camera specs (estimates based on smart glasses form factor)
    this.calibration = {
      cameraDistance: 0.0,    // On head, looking at ball ~1.5m away on ground
      cameraHeight: 1.65,    // Eye level
      cameraAngle: -35,      // Looking down at ball
      pixelsPerMeter: 400,   // Glasses camera resolution at typical viewing distance
      fps: 30,
    };
  }

  async initialize(): Promise<void> {
    if (!heyCyanGlasses.available) {
      throw new Error('HeyCyan glasses only supported on Android');
    }
    // Don't auto-connect; connection is managed by GlassesScreen
    this.isReady = true;
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
    return { width: 1920, height: 1080 }; // HeyCyan glasses typical resolution
  }

  dispose(): void {
    this.isReady = false;
    if (this.connected) {
      heyCyanGlasses.disconnect().catch(() => {});
      this.connected = false;
    }
  }

  // ── Glasses-specific methods ───────────────────────────

  async connectToGlasses(address: string): Promise<boolean> {
    try {
      const result = await heyCyanGlasses.connect(address);
      this.connected = result;
      this.deviceAddress = address;
      return result;
    } catch (e) {
      console.log('[HeyCyan] Connect failed:', e);
      return false;
    }
  }

  async disconnectGlasses(): Promise<void> {
    await heyCyanGlasses.disconnect();
    this.connected = false;
    this.deviceAddress = null;
  }

  async isGlassesConnected(): Promise<boolean> {
    return heyCyanGlasses.isConnected();
  }

  async startRecording(): Promise<boolean> {
    if (!this.connected) throw new Error('Glasses not connected');
    const result = await heyCyanGlasses.startVideoRecording();
    this.recording = result;
    return result;
  }

  async stopRecording(): Promise<boolean> {
    if (!this.recording) return false;
    const result = await heyCyanGlasses.stopVideoRecording();
    this.recording = false;
    return result;
  }

  /**
   * Download the latest video from glasses to phone.
   * This switches glasses to WiFi transfer mode and downloads via HTTP.
   * Returns the local file URI of the downloaded video.
   */
  async downloadVideo(): Promise<string> {
    return heyCyanGlasses.downloadLatestVideo();
  }

  async getBattery(): Promise<{ level: number; charging: boolean }> {
    return heyCyanGlasses.getBattery();
  }

  async getMediaCount(): Promise<{ photos: number; videos: number; audio: number }> {
    return heyCyanGlasses.getMediaCount();
  }

  get isConnectedToGlasses(): boolean {
    return this.connected;
  }

  get isRecording(): boolean {
    return this.recording;
  }
}
