import { ReplicaPreset } from '../types';

export const REPLICA_PRESETS: ReplicaPreset[] = [
  {
    id: 'pistol',
    name: 'Pistola / CQB',
    category: 'Secundaria & Corto Alcance',
    description: '1.00 Joules (~328 FPS con 0.20g). Óptimo para interiores y distancias cortas hasta 35m.',
    bbWeightG: 0.25,
    energyJ: 1.00,
    fps020g: 328,
    hopupPercent: 45,
    iconName: 'Crosshair'
  },
  {
    id: 'aeg_assault',
    name: 'Fusilero AEG Estándar',
    category: 'Rol Principal Asalto',
    description: '1.14 Joules (~350 FPS con 0.20g). Configuración estándar de campo abierto con bola 0.28g.',
    bbWeightG: 0.28,
    energyJ: 1.14,
    fps020g: 350,
    hopupPercent: 55,
    iconName: 'Target'
  },
  {
    id: 'dmr',
    name: 'Tirador Selecto / DMR',
    category: 'Medio & Largo Alcance',
    description: '1.87 Joules (~450 FPS con 0.20g). Disparo semi-automático de precisión con bola pesada 0.32g-0.36g.',
    bbWeightG: 0.36,
    energyJ: 1.87,
    fps020g: 450,
    hopupPercent: 62,
    iconName: 'Zap'
  },
  {
    id: 'sniper',
    name: 'Francotirador / Sniper',
    category: 'Cerrojo Largo Alcance',
    description: '2.81 Joules (~550 FPS con 0.20g). Máximo alcance y retención de energía con bola 0.43g.',
    bbWeightG: 0.43,
    energyJ: 2.81,
    fps020g: 550,
    hopupPercent: 70,
    iconName: 'Crosshair'
  }
];

export const STANDARD_BB_WEIGHTS = [
  { weight: 0.20, label: '0.20g', desc: 'CQB / Crono estándar' },
  { weight: 0.23, label: '0.23g', desc: 'Transición' },
  { weight: 0.25, label: '0.25g', desc: 'Asalto ligero' },
  { weight: 0.28, label: '0.28g', desc: 'Asalto óptimo' },
  { weight: 0.30, label: '0.30g', desc: 'Asalto pesado' },
  { weight: 0.32, label: '0.32g', desc: 'DMR ligero' },
  { weight: 0.36, label: '0.36g', desc: 'DMR pesado' },
  { weight: 0.40, label: '0.40g', desc: 'Sniper' },
  { weight: 0.43, label: '0.43g', desc: 'Sniper pesado' },
  { weight: 0.45, label: '0.45g', desc: 'Sniper pesadísimo' },
];
