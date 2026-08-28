export type PowerInputMode = 'velocity_ms' | 'velocity_fps' | 'energy_j';

export interface BallisticInput {
  bbWeightG: number; // e.g. 0.28
  powerMode: PowerInputMode;
  muzzleVelocityMs: number; // m/s
  muzzleVelocityFps: number; // fps
  muzzleEnergyJ: number; // Joules
  hopupPercent: number; // 0 to 100% (Magnus lift effect)
  initialHeightM: number; // e.g. 1.50m (shoulder/muzzle height)
  firingAngleDeg: number; // e.g. 0° (-15° to 45°)
  sightHeightCm: number; // e.g. 4.5 cm (optic height above barrel center)
  zeroDistanceM: number; // e.g. 35 m (distance where optic is zeroed)
  windSpeedMs?: number; // crosswind or headwind optional
  temperatureC?: number; // 20°C
}

export interface TrajectoryPoint {
  time: number; // seconds
  x: number; // distance in meters
  y: number; // height above ground in meters
  sightLineY: number; // optical sight line height at this distance
  dropRelativeToSightCm: number; // cm above/below reticle
  vx: number; // horizontal velocity m/s
  vy: number; // vertical velocity m/s
  velocityMs: number; // total velocity m/s
  velocityFps: number; // total velocity fps
  speedLossPercent: number; // % of muzzle velocity lost
  energyJ: number; // kinetic energy in Joules
  spinRpm: number; // backspin RPM
}

export interface SpeedDropCheckpoint {
  distanceM: number;
  timeS: number;
  velocityMs: number;
  velocityFps: number;
  speedLossPercent: number;
  energyJ: number;
  energyLossPercent: number;
  dropCm: number;
}

export interface SimulationResult {
  points: TrajectoryPoint[];
  maxRangeM: number;
  effectiveRangeM: number; // distance within ±15cm corridor of aim
  apexHeightM: number;
  apexDistanceM: number;
  flightTimeS: number;
  impactVelocityMs: number;
  impactVelocityFps: number;
  impactEnergyJ: number;
  speedDropTable: SpeedDropCheckpoint[];
  hopupState: 'under' | 'flat' | 'over' | 'extreme';
}

export interface WeightComparisonResult {
  bbWeightG: number;
  label: string;
  color: string;
  muzzleVelocityMs: number;
  muzzleVelocityFps: number;
  muzzleEnergyJ: number;
  simulation: SimulationResult;
}

export interface ReplicaPreset {
  id: string;
  name: string;
  category: string;
  description: string;
  bbWeightG: number;
  energyJ: number;
  fps020g: number;
  hopupPercent: number;
  iconName: string;
}
