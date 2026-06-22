/**
 * HeyCyan Smart Glasses - React Native Bridge
 * 
 * TypeScript wrapper for the native HeyCyanGlasses module.
 * Provides scan, connect, video recording, and file transfer APIs.
 */

import { NativeModules, NativeEventEmitter, Platform } from 'react-native';

const { HeyCyanGlasses } = NativeModules;

// Event emitter for glasses events (Android only)
const glassesEmitter = Platform.OS === 'android' && HeyCyanGlasses
  ? new NativeEventEmitter(HeyCyanGlasses)
  : null;

// ── Types ────────────────────────────────────────────

export interface GlassesDevice {
  name: string;
  address: string;
  rssi: number;
}

export interface GlassesBattery {
  level: number;
  charging: boolean;
}

export interface GlassesMediaCount {
  photos: number;
  videos: number;
  audio: number;
}

export interface GlassesState {
  dataType: number;
  workType: number;
  errorCode: number;
}

export type GlassesEventType =
  | 'onGlassesDevicesFound'
  | 'onGlassesVideoDownloaded'
  | 'onGlassesStateChanged';

// ── API ──────────────────────────────────────────────

class HeyCyanGlassesAPI {
  private isAvailable: boolean;

  constructor() {
    this.isAvailable = Platform.OS === 'android' && !!HeyCyanGlasses;
  }

  /**
   * Check if glasses SDK is available on this platform
   */
  get available(): boolean {
    return this.isAvailable;
  }

  /**
   * Start BLE scan for HeyCyan glasses
   */
  async startScan(): Promise<boolean> {
    if (!this.isAvailable) throw new Error('HeyCyan SDK only available on Android');
    return HeyCyanGlasses.startScan();
  }

  /**
   * Stop BLE scan
   */
  async stopScan(): Promise<boolean> {
    if (!this.isAvailable) throw new Error('HeyCyan SDK only available on Android');
    return HeyCyanGlasses.stopScan();
  }

  /**
   * Connect to glasses by BLE address
   */
  async connect(address: string): Promise<boolean> {
    if (!this.isAvailable) throw new Error('HeyCyan SDK only available on Android');
    return HeyCyanGlasses.connect(address);
  }

  /**
   * Disconnect from glasses
   */
  async disconnect(): Promise<boolean> {
    if (!this.isAvailable) throw new Error('HeyCyan SDK only available on Android');
    return HeyCyanGlasses.disconnect();
  }

  /**
   * Check if glasses are connected
   */
  async isConnected(): Promise<boolean> {
    if (!this.isAvailable) return false;
    return HeyCyanGlasses.isGlassesConnected();
  }

  /**
   * Start video recording on glasses
   */
  async startVideoRecording(): Promise<boolean> {
    if (!this.isAvailable) throw new Error('HeyCyan SDK only available on Android');
    return HeyCyanGlasses.startVideoRecording();
  }

  /**
   * Stop video recording on glasses
   */
  async stopVideoRecording(): Promise<boolean> {
    if (!this.isAvailable) throw new Error('HeyCyan SDK only available on Android');
    return HeyCyanGlasses.stopVideoRecording();
  }

  /**
   * Download the latest video from glasses (switches to WiFi transfer mode)
   * Returns the local file path of the downloaded video
   */
  async downloadLatestVideo(): Promise<string> {
    if (!this.isAvailable) throw new Error('HeyCyan SDK only available on Android');
    return HeyCyanGlasses.downloadLatestVideo();
  }

  /**
   * Get battery status
   */
  async getBattery(): Promise<GlassesBattery> {
    if (!this.isAvailable) throw new Error('HeyCyan SDK only available on Android');
    return HeyCyanGlasses.getBatteryLevel();
  }

  /**
   * Get media file counts on glasses
   */
  async getMediaCount(): Promise<GlassesMediaCount> {
    if (!this.isAvailable) throw new Error('HeyCyan SDK only available on Android');
    return HeyCyanGlasses.getMediaCount();
  }

  /**
   * Subscribe to glasses events
   */
  on(event: GlassesEventType, callback: (data: any) => void): (() => void) | null {
    if (!glassesEmitter) return null;
    const subscription = glassesEmitter.addListener(event, callback);
    return () => subscription.remove();
  }
}

export const heyCyanGlasses = new HeyCyanGlassesAPI();
export default heyCyanGlasses;
