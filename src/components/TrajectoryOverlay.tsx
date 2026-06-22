/**
 * Trajectory Overlay - Draws the ball flight path on the camera view
 * 
 * Renders the projected trajectory as an SVG arc overlaid on the camera.
 * Shows launch point, apex, and landing with animated trail.
 */

import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Svg, { Path, Circle, Line, Text as SvgText } from 'react-native-svg';
import { TrajectoryPoint } from '../tracking/types';
import { COLORS } from '../utils/theme';
import { METERS_TO_YARDS } from '../tracking/constants';

interface TrajectoryOverlayProps {
  trajectory: TrajectoryPoint[];
  visible: boolean;
}

export default function TrajectoryOverlay({ trajectory, visible }: TrajectoryOverlayProps) {
  if (!visible || trajectory.length < 3) return null;

  const { width: screenW, height: screenH } = Dimensions.get('window');
  
  // Map 3D trajectory to 2D screen coordinates
  // Side view: x → horizontal, y → vertical (inverted)
  const maxX = Math.max(...trajectory.map(p => p.x));
  const maxY = Math.max(...trajectory.map(p => p.y));
  
  if (maxX === 0 || maxY === 0) return null;

  // Padding
  const padL = 40;
  const padR = 20;
  const padT = 60;
  const padB = 40;
  const drawW = screenW - padL - padR;
  const drawH = screenH * 0.4; // Use 40% of screen height for trajectory

  // Scale factors
  const scaleX = drawW / maxX;
  const scaleY = drawH / (maxY * 1.2); // 20% headroom above apex

  // Convert trajectory to screen coords
  const points = trajectory.map(p => ({
    sx: padL + p.x * scaleX,
    sy: padT + drawH - p.y * scaleY, // invert Y
    original: p,
  }));

  // Build SVG path
  let pathD = `M ${points[0].sx} ${points[0].sy}`;
  for (let i = 1; i < points.length; i++) {
    pathD += ` L ${points[i].sx} ${points[i].sy}`;
  }

  // Find apex point
  const apexIdx = trajectory.reduce((maxIdx, p, i, arr) => 
    p.y > arr[maxIdx].y ? i : maxIdx, 0);
  const apexPoint = points[apexIdx];
  const apexYards = Math.round(trajectory[apexIdx].y * METERS_TO_YARDS);

  // Landing point
  const landingPoint = points[points.length - 1];
  const landingYards = Math.round(trajectory[trajectory.length - 1].x * METERS_TO_YARDS);

  return (
    <View style={styles.container} pointerEvents="none">
      <Svg width={screenW} height={screenH * 0.5} style={styles.svg}>
        {/* Ground line */}
        <Line
          x1={padL}
          y1={padT + drawH}
          x2={screenW - padR}
          y2={padT + drawH}
          stroke="rgba(255,255,255,0.2)"
          strokeWidth={1}
          strokeDasharray="4,4"
        />

        {/* Trajectory path - glow */}
        <Path
          d={pathD}
          fill="none"
          stroke={COLORS.trailGlow}
          strokeWidth={4}
          opacity={0.3}
        />

        {/* Trajectory path - main */}
        <Path
          d={pathD}
          fill="none"
          stroke={COLORS.trailOrange}
          strokeWidth={2}
          strokeLinecap="round"
        />

        {/* Launch point */}
        <Circle
          cx={points[0].sx}
          cy={points[0].sy}
          r={6}
          fill={COLORS.accent}
          stroke={COLORS.white}
          strokeWidth={1}
        />

        {/* Apex marker */}
        <Circle
          cx={apexPoint.sx}
          cy={apexPoint.sy}
          r={4}
          fill={COLORS.info}
          stroke={COLORS.white}
          strokeWidth={1}
        />
        <SvgText
          x={apexPoint.sx}
          y={apexPoint.sy - 10}
          fontSize={10}
          fill={COLORS.info}
          textAnchor="middle"
          fontWeight="600"
        >
          {apexYards}yd ↑
        </SvgText>

        {/* Landing point */}
        <Circle
          cx={landingPoint.sx}
          cy={landingPoint.sy}
          r={6}
          fill={COLORS.landingGreen}
          stroke={COLORS.white}
          strokeWidth={1}
        />
        <SvgText
          x={landingPoint.sx}
          y={landingPoint.sy + 16}
          fontSize={11}
          fill={COLORS.landingGreen}
          textAnchor="middle"
          fontWeight="700"
        >
          {landingYards} yds
        </SvgText>

        {/* Distance markers along ground */}
        {[0.25, 0.5, 0.75].map((frac, i) => {
          const x = padL + drawW * frac;
          const dist = Math.round(maxX * frac * METERS_TO_YARDS);
          return (
            <SvgText
              key={i}
              x={x}
              y={padT + drawH + 14}
              fontSize={8}
              fill="rgba(255,255,255,0.4)"
              textAnchor="middle"
            >
              {dist}
            </SvgText>
          );
        })}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  svg: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
});
