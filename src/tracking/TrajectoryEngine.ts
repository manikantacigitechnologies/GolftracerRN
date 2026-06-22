/**
 * Trajectory Engine - Physics-Based Ball Flight Simulation
 * 
 * Uses a 3D projectile motion model with:
 * - Aerodynamic drag (quadratic air resistance)
 * - Magnus effect (lift from backspin)
 * - Side spin (curve/draw/fade)
 * - Wind effects (placeholder for future sensor integration)
 * 
 * The simulation runs a 4th-order Runge-Kutta integration
 * for accurate trajectory prediction.
 */

import {
  LaunchParameters,
  TrajectoryPoint,
  ShotMetrics,
  ShotShape,
  CalibrationData,
} from './types';
import {
  GRAVITY,
  AIR_DENSITY,
  BALL_MASS,
  BALL_AREA,
  BALL_RADIUS,
  DRAG_COEFFICIENT,
  LIFT_COEFFICIENT_FACTOR,
  MAGNUS_FACTOR,
  ROLL_FACTOR_DRIVER,
  ROLL_FACTOR_IRON,
  ROLL_FACTOR_WEDGE,
  MPH_TO_MS,
  MS_TO_MPH,
  METERS_TO_YARDS,
  DEG_TO_RAD,
  RAD_TO_DEG,
  CLUB_DATA,
} from './constants';

// ── Simulation State ─────────────────────────────────

interface SimState {
  x: number;  // forward distance (m)
  y: number;  // height (m)
  z: number;  // lateral distance (m)
  vx: number; // forward velocity (m/s)
  vy: number; // vertical velocity (m/s)
  vz: number; // lateral velocity (m/s)
}

// ── Main Trajectory Engine ───────────────────────────

export class TrajectoryEngine {
  private dt = 0.005;       // Time step (5ms for accuracy)
  private maxTime = 15;     // Max flight time (seconds)
  private outputInterval = 0.05; // Output a point every 50ms

  /**
   * Calculate full trajectory from launch parameters.
   * Returns trajectory points and computed metrics.
   */
  calculate(
    launch: LaunchParameters,
    clubType?: string
  ): { trajectory: TrajectoryPoint[]; metrics: ShotMetrics } {
    const trajectory = this.simulateTrajectory(launch);
    const metrics = this.computeMetrics(launch, trajectory, clubType);
    return { trajectory, metrics };
  }

  /**
   * Estimate launch parameters from detected ball positions.
   * Uses first N positions to extrapolate initial velocity vector.
   */
  estimateLaunchFromPositions(
    positions: { x: number; y: number; timestamp: number }[],
    calibration: CalibrationData
  ): LaunchParameters | null {
    if (positions.length < 2) return null;

    // Need at least 2 points to determine direction and speed
    const p0 = positions[0];
    const p1 = positions[positions.length > 2 ? 2 : 1]; // Use 3rd point if available for smoothing
    
    const dt = (p1.timestamp - p0.timestamp) / 1000; // seconds
    if (dt <= 0) return null;

    // Convert pixel displacement to meters
    const ppm = calibration.pixelsPerMeter;
    const dx = (p1.x - p0.x) / ppm; // meters forward
    const dy = -(p1.y - p0.y) / ppm; // meters up (inverted because screen y is down)

    // Calculate velocity components
    const vx = dx / dt;
    const vy = dy / dt;
    const speed = Math.sqrt(vx * vx + vy * vy);

    // Calculate angles
    const launchAngle = Math.atan2(vy, Math.abs(vx)) * RAD_TO_DEG;
    const launchDirection = 0; // Can't determine from single camera without depth

    // Estimate spin from launch angle (higher angle = more backspin typically)
    const estimatedSpin = 2000 + (launchAngle * 200);

    return {
      launchAngle: Math.max(0, Math.min(60, launchAngle)),
      launchDirection,
      ballSpeed: speed,
      spinRate: Math.max(1000, Math.min(12000, estimatedSpin)),
      spinAxis: 0,
    };
  }

  /**
   * Estimate launch parameters from club data when vision tracking fails.
   * Uses club-specific averages with a speed multiplier for skill adjustment.
   */
  estimateLaunchFromClub(
    clubType: string,
    speedMultiplier: number = 1.0
  ): LaunchParameters {
    const club = CLUB_DATA[clubType] || CLUB_DATA['7 Iron'];
    
    return {
      launchAngle: club.typicalLaunchAngle,
      launchDirection: 0,
      ballSpeed: club.typicalBallSpeed * MPH_TO_MS * speedMultiplier,
      spinRate: club.typicalSpinRate,
      spinAxis: 0,
    };
  }

  // ── Private: Trajectory Simulation ───────────────────

  private simulateTrajectory(launch: LaunchParameters): TrajectoryPoint[] {
    const trajectory: TrajectoryPoint[] = [];
    
    // Initial conditions
    const speedMs = launch.ballSpeed; // Already in m/s from estimator
    const launchRad = launch.launchAngle * DEG_TO_RAD;
    const dirRad = launch.launchDirection * DEG_TO_RAD;

    let state: SimState = {
      x: 0,
      y: 0.01, // Start just above ground
      z: 0,
      vx: speedMs * Math.cos(launchRad) * Math.cos(dirRad),
      vy: speedMs * Math.sin(launchRad),
      vz: speedMs * Math.cos(launchRad) * Math.sin(dirRad),
    };

    let time = 0;
    let lastOutput = 0;
    const spinDecay = 0.98; // Spin decays over time
    let currentSpin = launch.spinRate;

    // Add initial point
    trajectory.push({ x: 0, y: 0, z: 0, time: 0 });

    while (time < this.maxTime) {
      // RK4 integration step
      state = this.rk4Step(state, currentSpin, launch.spinAxis);
      time += this.dt;
      currentSpin *= spinDecay;

      // Check if ball has landed
      if (state.y < 0 && time > 0.1) {
        // Interpolate landing point
        const landingPoint: TrajectoryPoint = {
          x: state.x,
          y: 0,
          z: state.z,
          time,
        };
        trajectory.push(landingPoint);
        break;
      }

      // Record point at output interval
      if (time - lastOutput >= this.outputInterval) {
        trajectory.push({
          x: state.x,
          y: Math.max(0, state.y),
          z: state.z,
          time,
        });
        lastOutput = time;
      }
    }

    return trajectory;
  }

  private rk4Step(state: SimState, spinRate: number, spinAxis: number): SimState {
    const k1 = this.derivatives(state, spinRate, spinAxis);
    const s2 = this.addScaled(state, k1, this.dt / 2);
    const k2 = this.derivatives(s2, spinRate, spinAxis);
    const s3 = this.addScaled(state, k2, this.dt / 2);
    const k3 = this.derivatives(s3, spinRate, spinAxis);
    const s4 = this.addScaled(state, k3, this.dt);
    const k4 = this.derivatives(s4, spinRate, spinAxis);

    return {
      x: state.x + (this.dt / 6) * (k1.x + 2 * k2.x + 2 * k3.x + k4.x),
      y: state.y + (this.dt / 6) * (k1.y + 2 * k2.y + 2 * k3.y + k4.y),
      z: state.z + (this.dt / 6) * (k1.z + 2 * k2.z + 2 * k3.z + k4.z),
      vx: state.vx + (this.dt / 6) * (k1.vx + 2 * k2.vx + 2 * k3.vx + k4.vx),
      vy: state.vy + (this.dt / 6) * (k1.vy + 2 * k2.vy + 2 * k3.vy + k4.vy),
      vz: state.vz + (this.dt / 6) * (k1.vz + 2 * k2.vz + 2 * k3.vz + k4.vz),
    };
  }

  private derivatives(state: SimState, spinRate: number, spinAxis: number): SimState {
    const speed = Math.sqrt(state.vx ** 2 + state.vy ** 2 + state.vz ** 2);
    if (speed < 0.01) {
      return { x: 0, y: 0, z: 0, vx: 0, vy: -GRAVITY, vz: 0 };
    }

    // Drag force: F_drag = 0.5 * Cd * rho * A * v²
    const dragMag = 0.5 * DRAG_COEFFICIENT * AIR_DENSITY * BALL_AREA * speed * speed;
    const dragX = -dragMag * (state.vx / speed) / BALL_MASS;
    const dragY = -dragMag * (state.vy / speed) / BALL_MASS;
    const dragZ = -dragMag * (state.vz / speed) / BALL_MASS;

    // Lift (Magnus effect from backspin)
    // Lift is perpendicular to velocity, in the vertical plane
    const liftCoeff = LIFT_COEFFICIENT_FACTOR * spinRate;
    const liftMag = 0.5 * liftCoeff * AIR_DENSITY * BALL_AREA * speed * speed;
    const liftY = liftMag / BALL_MASS; // Backspin creates upward lift

    // Side force (from sidespin / tilted spin axis)
    const sideSpinFraction = Math.sin(spinAxis * DEG_TO_RAD);
    const sideMag = MAGNUS_FACTOR * spinRate * sideSpinFraction * speed;
    const sideZ = sideMag / BALL_MASS;

    return {
      x: state.vx,
      y: state.vy,
      z: state.vz,
      vx: dragX,
      vy: -GRAVITY + dragY + liftY,
      vz: dragZ + sideZ,
    };
  }

  private addScaled(state: SimState, deriv: SimState, scale: number): SimState {
    return {
      x: state.x + deriv.x * scale,
      y: state.y + deriv.y * scale,
      z: state.z + deriv.z * scale,
      vx: state.vx + deriv.vx * scale,
      vy: state.vy + deriv.vy * scale,
      vz: state.vz + deriv.vz * scale,
    };
  }

  // ── Metrics Computation ────────────────────────────

  private computeMetrics(
    launch: LaunchParameters,
    trajectory: TrajectoryPoint[],
    clubType?: string
  ): ShotMetrics {
    if (trajectory.length < 2) {
      return this.emptyMetrics();
    }

    const lastPoint = trajectory[trajectory.length - 1];
    const carryMeters = Math.sqrt(lastPoint.x ** 2 + lastPoint.z ** 2);
    const carryYards = carryMeters * METERS_TO_YARDS;

    // Find apex
    let apexHeight = 0;
    let apexTime = 0;
    for (const p of trajectory) {
      if (p.y > apexHeight) {
        apexHeight = p.y;
        apexTime = p.time;
      }
    }

    // Hang time
    const hangTime = lastPoint.time;

    // Landing angle (angle of descent at landing)
    const preLastIdx = Math.max(0, trajectory.length - 3);
    const preLast = trajectory[preLastIdx];
    const landingDx = lastPoint.x - preLast.x;
    const landingDy = lastPoint.y - preLast.y;
    const landingAngle = Math.abs(Math.atan2(landingDy, landingDx) * RAD_TO_DEG);

    // Roll estimation based on club and landing angle
    let rollFactor = ROLL_FACTOR_IRON;
    if (clubType) {
      const club = CLUB_DATA[clubType];
      if (club) {
        if (club.loftAngle <= 15) rollFactor = ROLL_FACTOR_DRIVER;
        else if (club.loftAngle >= 50) rollFactor = ROLL_FACTOR_WEDGE;
        else rollFactor = ROLL_FACTOR_IRON * (1 - (club.loftAngle - 20) / 40);
      }
    }
    const totalYards = carryYards * (1 + Math.max(0, rollFactor));

    // Offline (lateral) distance
    const offlineMeters = lastPoint.z;
    const offlineYards = offlineMeters * METERS_TO_YARDS;

    // Shot shape determination
    const shotShape = this.determineShotShape(trajectory, launch);

    // Ball speed in mph
    const ballSpeedMph = launch.ballSpeed * MS_TO_MPH;

    // Confidence based on detection method
    const confidence = launch.ballSpeed > 0 ? 0.75 : 0.5;

    return {
      ballSpeed: Math.round(ballSpeedMph),
      launchAngle: Math.round(launch.launchAngle * 10) / 10,
      carryDistance: Math.round(carryYards),
      totalDistance: Math.round(totalYards),
      apexHeight: Math.round(apexHeight * METERS_TO_YARDS),
      hangTime: Math.round(hangTime * 10) / 10,
      landingAngle: Math.round(landingAngle),
      spinRate: Math.round(launch.spinRate),
      offlineDistance: Math.round(offlineYards),
      curveAmount: Math.round(Math.abs(offlineYards)),
      shotShape,
      confidence,
      detectionMethod: 'physics_only',
    };
  }

  private determineShotShape(
    trajectory: TrajectoryPoint[],
    launch: LaunchParameters
  ): ShotShape {
    if (trajectory.length < 5) return 'straight';

    const lastPoint = trajectory[trajectory.length - 1];
    const midPoint = trajectory[Math.floor(trajectory.length / 2)];
    
    const totalLateral = lastPoint.z * METERS_TO_YARDS;
    const midLateral = midPoint.z * METERS_TO_YARDS;

    if (Math.abs(totalLateral) < 5) return 'straight';

    // Check if it curves (mid different from start-to-end line)
    const expectedMid = totalLateral / 2;
    const curveAmount = midLateral - expectedMid;

    if (totalLateral > 15) {
      return Math.abs(curveAmount) > 5 ? 'slice' : 'push';
    } else if (totalLateral > 5) {
      return 'fade';
    } else if (totalLateral < -15) {
      return Math.abs(curveAmount) > 5 ? 'hook' : 'pull';
    } else if (totalLateral < -5) {
      return 'draw';
    }

    return 'straight';
  }

  private emptyMetrics(): ShotMetrics {
    return {
      ballSpeed: 0,
      launchAngle: 0,
      carryDistance: 0,
      totalDistance: 0,
      apexHeight: 0,
      hangTime: 0,
      landingAngle: 0,
      spinRate: 0,
      offlineDistance: 0,
      curveAmount: 0,
      shotShape: 'straight',
      confidence: 0,
      detectionMethod: 'physics_only',
    };
  }
}
