/**
 * Realistic 6mm Airsoft Ballistics & Aerodynamics Engine
 * 
 * Includes:
 * - Air resistance (Drag force on 6mm sphere with Reynolds number correction)
 * - Magnus Effect (Hop-up backspin lift force with angular velocity decay)
 * - Kinetic energy (Joules) and velocity loss over time and distance
 * - Optical sight zeroing geometry and line-of-sight drop calculations
 */

import { BallisticInput, TrajectoryPoint, SimulationResult, SpeedDropCheckpoint, WeightComparisonResult } from '../types';

// Constants
export const BB_DIAMETER_M = 0.00595; // 5.95mm standard precision BB
export const BB_RADIUS_M = BB_DIAMETER_M / 2;
export const BB_CROSS_SECTION_AREA_M2 = Math.PI * Math.pow(BB_RADIUS_M, 2);
export const GRAVITY = 9.80665; // m/s^2
export const STANDARD_AIR_DENSITY = 1.205; // kg/m^3 at 20°C sea level
export const AIR_VISCOSITY = 1.81e-5; // kg/(m*s)

/**
 * Conversions
 */
export function msToFps(ms: number): number {
  return ms * 3.2808399;
}

export function fpsToMs(fps: number): number {
  return fps / 3.2808399;
}

export function energyToVelocityMs(joules: number, weightG: number): number {
  if (weightG <= 0 || joules <= 0) return 0;
  const massKg = weightG / 1000;
  return Math.sqrt((2 * joules) / massKg);
}

export function velocityMsToEnergy(velocityMs: number, weightG: number): number {
  const massKg = weightG / 1000;
  return 0.5 * massKg * Math.pow(velocityMs, 2);
}

/**
 * Estimate drag coefficient for 6mm sphere based on velocity
 */
function getDragCoefficient(velocity: number, airDensity: number): number {
  if (velocity <= 0.1) return 0.47;
  const reynolds = (airDensity * velocity * BB_DIAMETER_M) / AIR_VISCOSITY;
  // Subcritical sphere drag coefficient
  if (reynolds < 1000) return 0.50;
  if (reynolds < 50000) return 0.44 + (0.04 * (50000 - reynolds)) / 50000;
  return 0.44;
}

/**
 * Calculate Magnus lift coefficient for spinning BB
 * Spin ratio S = (r * omega) / v
 */
function getLiftCoefficient(spinRatio: number): number {
  if (spinRatio <= 0.001) return 0;
  // Experimental fit for rotating spheres at airsoft Reynolds numbers
  // CL saturates around 0.35 - 0.42 to avoid unphysical infinite lift
  const cl = 0.42 * Math.pow(spinRatio, 0.72);
  return Math.min(0.40, cl);
}

/**
 * Simulate the complete ballistic trajectory
 */
export function simulateTrajectory(input: BallisticInput): SimulationResult {
  const massKg = Math.max(0.00005, input.bbWeightG / 1000);
  const airDensity = STANDARD_AIR_DENSITY;
  
  // Calculate initial velocity components
  let initialV = input.muzzleVelocityMs;
  if (input.powerMode === 'velocity_fps') {
    initialV = fpsToMs(input.muzzleVelocityFps);
  } else if (input.powerMode === 'energy_j') {
    initialV = energyToVelocityMs(input.muzzleEnergyJ, input.bbWeightG);
  }
  
  initialV = Math.max(1, initialV);
  const muzzleEnergy = 0.5 * massKg * Math.pow(initialV, 2);

  const angleRad = (input.firingAngleDeg * Math.PI) / 180;
  let vx = initialV * Math.cos(angleRad);
  let vy = initialV * Math.sin(angleRad);
  let x = 0;
  let y = Math.max(0, input.initialHeightM);
  let t = 0;

  // Hop-up: 0% = 0 RPM, 50% = ~45,000 RPM, 100% = ~90,000 RPM backspin
  // Scaled by weight: heavier BBs take more friction bucking force to spin
  const maxRpm = 85000;
  const initialRpm = (input.hopupPercent / 100) * maxRpm;
  let omega = (initialRpm * 2 * Math.PI) / 60; // rad/s

  const points: TrajectoryPoint[] = [];
  const dt = 0.001; // 1 ms integration step for high numerical precision
  const maxTime = 6.0; // max seconds
  const maxDistance = 150; // max meters

  // Sight line geometry (for relative drop)
  // Sight line starts at (0, y + sightHeight) and intersects barrel axis or zero point
  const sightHeightM = (input.sightHeightCm || 4.5) / 100;
  const sightZeroDistance = Math.max(5, input.zeroDistanceM || 30);
  // Estimate sight angle so sight line meets initial trajectory near zero distance
  // Or simple flat line of sight:
  const sightAngleRad = Math.atan2((input.initialHeightM - (input.initialHeightM + sightHeightM)), sightZeroDistance);

  let apexHeight = y;
  let apexDistance = 0;
  let flightTime = 0;
  let impactVelocity = initialV;
  let impactEnergy = muzzleEnergy;
  let effectiveRange = 0;

  // Add initial point
  points.push({
    time: 0,
    x: 0,
    y: y,
    sightLineY: y + sightHeightM,
    dropRelativeToSightCm: -input.sightHeightCm,
    vx: vx,
    vy: vy,
    velocityMs: initialV,
    velocityFps: msToFps(initialV),
    speedLossPercent: 0,
    energyJ: muzzleEnergy,
    spinRpm: initialRpm
  });

  // Track max height within first few meters to classify hop-up behavior
  let initialY = y;
  let maxAltitudeExceeded = false;
  let sampleCount = 0;

  while (y >= 0 && x <= maxDistance && t <= maxTime) {
    const v = Math.sqrt(vx * vx + vy * vy);
    if (v < 0.1) break;

    // Aerodynamic forces
    const cd = getDragCoefficient(v, airDensity);
    const dragForce = 0.5 * airDensity * cd * BB_CROSS_SECTION_AREA_M2 * v * v;
    
    // Drag components opposing velocity
    const fDragX = -dragForce * (vx / v);
    const fDragY = -dragForce * (vy / v);

    // Magnus Lift Force (perpendicular to velocity vector, upwards for backspin)
    const spinRatio = (BB_RADIUS_M * omega) / v;
    const cl = getLiftCoefficient(spinRatio);
    const liftForce = 0.5 * airDensity * cl * BB_CROSS_SECTION_AREA_M2 * v * v;

    // Normal vector perpendicular to velocity (rotated 90 deg counter-clockwise)
    const fLiftX = -liftForce * (vy / v);
    const fLiftY = liftForce * (vx / v);

    // Gravity force
    const fGravityY = -massKg * GRAVITY;

    // Total accelerations
    const ax = (fDragX + fLiftX) / massKg;
    const ay = (fDragY + fLiftY + fGravityY) / massKg;

    // Update state (RK2 / Euler-Cromer)
    vx += ax * dt;
    vy += ay * dt;
    x += vx * dt;
    y += vy * dt;
    t += dt;

    // Spin decay: air resistance slows the backspin (characteristic decay time ~1.4s)
    omega = Math.max(0, omega - (omega / 1.4) * dt);

    // Apex tracking
    if (y > apexHeight) {
      apexHeight = y;
      apexDistance = x;
    }

    if (y > initialY + 0.6) {
      maxAltitudeExceeded = true;
    }

    // Save trajectory points at regular downsampled intervals (every 10ms for smooth 60fps graph)
    sampleCount++;
    if (sampleCount % 10 === 0 || y <= 0) {
      const currentV = Math.sqrt(vx * vx + vy * vy);
      const currentE = 0.5 * massKg * Math.pow(currentV, 2);
      const speedLoss = ((initialV - currentV) / initialV) * 100;
      const sightLineY = (input.initialHeightM + sightHeightM) + Math.sin(sightAngleRad) * x;
      const dropCm = (y - sightLineY) * 100;

      points.push({
        time: Number(t.toFixed(3)),
        x: Number(x.toFixed(2)),
        y: Math.max(0, Number(y.toFixed(3))),
        sightLineY: Number(sightLineY.toFixed(3)),
        dropRelativeToSightCm: Number(dropCm.toFixed(1)),
        vx: Number(vx.toFixed(2)),
        vy: Number(vy.toFixed(2)),
        velocityMs: Number(currentV.toFixed(2)),
        velocityFps: Number(msToFps(currentV).toFixed(1)),
        speedLossPercent: Number(Math.min(100, Math.max(0, speedLoss)).toFixed(1)),
        energyJ: Number(currentE.toFixed(3)),
        spinRpm: Number(((omega * 60) / (2 * Math.PI)).toFixed(0))
      });
    }

    flightTime = t;
    impactVelocity = Math.sqrt(vx * vx + vy * vy);
    impactEnergy = 0.5 * massKg * Math.pow(impactVelocity, 2);
  }

  const maxRange = x;

  // Calculate effective range: continuous distance where trajectory remains within ±15cm of line of sight
  for (let i = 0; i < points.length; i++) {
    const pt = points[i];
    if (Math.abs(pt.dropRelativeToSightCm) <= 15) {
      effectiveRange = pt.x;
    } else if (pt.x > 10 && Math.abs(pt.dropRelativeToSightCm) > 20) {
      // trajectory broke out of effective zone
      break;
    }
  }

  // If effectiveRange wasn't restricted, it's roughly 70% of max flat distance
  if (effectiveRange <= 0) {
    effectiveRange = Math.min(maxRange, apexDistance * 1.2);
  }

  // Determine hop-up condition
  let hopupState: 'under' | 'flat' | 'over' | 'extreme' = 'flat';
  const apexDelta = apexHeight - input.initialHeightM;
  if (input.hopupPercent < 20 || apexDelta < 0.05) {
    hopupState = 'under';
  } else if (apexDelta > 1.2) {
    hopupState = 'extreme';
  } else if (apexDelta > 0.4) {
    hopupState = 'over';
  } else {
    hopupState = 'flat';
  }

  // Generate standard speed drop checkpoints every 5m/10m
  const speedDropTable: SpeedDropCheckpoint[] = [];
  const targetDistances = [5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80];

  for (const dist of targetDistances) {
    if (dist > maxRange) break;
    // Find closest point in trajectory
    const pt = points.reduce((prev, curr) => 
      Math.abs(curr.x - dist) < Math.abs(prev.x - dist) ? curr : prev
    );

    if (pt) {
      const energyLoss = ((muzzleEnergy - pt.energyJ) / muzzleEnergy) * 100;
      speedDropTable.push({
        distanceM: dist,
        timeS: pt.time,
        velocityMs: pt.velocityMs,
        velocityFps: pt.velocityFps,
        speedLossPercent: pt.speedLossPercent,
        energyJ: pt.energyJ,
        energyLossPercent: Number(Math.max(0, energyLoss).toFixed(1)),
        dropCm: pt.dropRelativeToSightCm
      });
    }
  }

  return {
    points,
    maxRangeM: Number(maxRange.toFixed(1)),
    effectiveRangeM: Number(effectiveRange.toFixed(1)),
    apexHeightM: Number(apexHeight.toFixed(2)),
    apexDistanceM: Number(apexDistance.toFixed(1)),
    flightTimeS: Number(flightTime.toFixed(3)),
    impactVelocityMs: Number(impactVelocity.toFixed(1)),
    impactVelocityFps: Number(msToFps(impactVelocity).toFixed(1)),
    impactEnergyJ: Number(impactEnergy.toFixed(3)),
    speedDropTable,
    hopupState
  };
}

/**
 * Generate multi-weight comparison simulations with equal muzzle energy
 */
export function getWeightComparisons(currentInput: BallisticInput): WeightComparisonResult[] {
  // Use current muzzle energy as the benchmark
  let baseEnergyJ = currentInput.muzzleEnergyJ;
  if (currentInput.powerMode === 'velocity_ms') {
    baseEnergyJ = velocityMsToEnergy(currentInput.muzzleVelocityMs, currentInput.bbWeightG);
  } else if (currentInput.powerMode === 'velocity_fps') {
    baseEnergyJ = velocityMsToEnergy(fpsToMs(currentInput.muzzleVelocityFps), currentInput.bbWeightG);
  }
  baseEnergyJ = Math.max(0.2, baseEnergyJ);

  const weightsToCompare = [
    { weight: 0.20, label: '0.20g (CQB/Estándar)', color: '#38bdf8' }, // sky-400
    { weight: 0.25, label: '0.25g (Asalto Ligero)', color: '#34d399' }, // emerald-400
    { weight: 0.28, label: '0.28g (Asalto Óptimo)', color: '#fbbf24' }, // amber-400
    { weight: 0.32, label: '0.32g (DMR / Pesada)', color: '#f97316' }, // orange-500
    { weight: 0.40, label: '0.40g (Francotirador)', color: '#a855f7' }, // purple-500
  ];

  return weightsToCompare.map(item => {
    const vMs = energyToVelocityMs(baseEnergyJ, item.weight);
    const simInput: BallisticInput = {
      ...currentInput,
      bbWeightG: item.weight,
      powerMode: 'energy_j',
      muzzleEnergyJ: baseEnergyJ,
      muzzleVelocityMs: vMs,
      muzzleVelocityFps: msToFps(vMs)
    };

    const sim = simulateTrajectory(simInput);
    return {
      bbWeightG: item.weight,
      label: item.label,
      color: item.color,
      muzzleVelocityMs: Number(vMs.toFixed(1)),
      muzzleVelocityFps: Number(msToFps(vMs).toFixed(1)),
      muzzleEnergyJ: Number(baseEnergyJ.toFixed(2)),
      simulation: sim
    };
  });
}
