/**
 * Airsoft Cylinder-to-Barrel Volumetric Ratio (C/B Ratio) & Efficiency Physics Engine
 * 
 * Accurately models:
 * - Cylinder Porting Volume (Type 0 / 100%, Type 1 / 80%, Type 2 / 75%, Type 3 / 60%, Type 4 / 50%)
 * - Barrel Volume based on length (mm) and precision inner diameter (6.00mm - 6.08mm)
 * - Optimal Volumetric Ratio recommendations based on BB Weight (0.20g to 0.48g)
 * - Joule Creep tendencies (Over-volumed systems gaining energy with heavier BBs)
 * - Diagnosis: Over-voluming (barrel turbulence, muzzle pop, loss of accuracy) vs Under-voluming (underexpansion, vacuum suck-back, severe FPS loss)
 */

export interface CylinderPortType {
  id: string;
  name: string;
  portPercentage: number; // e.g. 100 for full cylinder, 80 for 4/5 port, etc.
  effectiveLengthMm: number; // distance from cylinder head to port edge (approx based on standard 72mm cylinder)
  description: string;
  typicalBarrelLengthMm: string;
}

export const CYLINDER_TYPES: CylinderPortType[] = [
  {
    id: 'full',
    name: 'Cilindro Cerrado (Tipo 0 / 100%)',
    portPercentage: 100,
    effectiveLengthMm: 72.0,
    description: 'Sin ventilación. Máximo volumen de aire para cañones largos o bolas pesadas (DMR/Sniper).',
    typicalBarrelLengthMm: '450mm - 650mm'
  },
  {
    id: 'type1',
    name: 'Cilindro Ranura 4/5 (Tipo 1 / ~80%)',
    portPercentage: 82,
    effectiveLengthMm: 59.0,
    description: 'Ranura cerca del final. Diseñado para fusiles estándar M4/AK con cañones medianos-largos.',
    typicalBarrelLengthMm: '363mm - 455mm'
  },
  {
    id: 'type2',
    name: 'Cilindro Ranura 3/4 (Tipo 2 / ~75%)',
    portPercentage: 74,
    effectiveLengthMm: 53.0,
    description: 'Ranura intermedia. El más común en réplicas de asalto estándar tipo carabina M4/G36.',
    typicalBarrelLengthMm: '280mm - 363mm'
  },
  {
    id: 'type3',
    name: 'Cilindro Ranura 1/2 (Tipo 3 / ~60%)',
    portPercentage: 60,
    effectiveLengthMm: 43.0,
    description: 'Ranura media. Optimizado para subfusiles y carabinas compactas tipo CQB.',
    typicalBarrelLengthMm: '200mm - 280mm'
  },
  {
    id: 'type4',
    name: 'Cilindro Ranura Corta (Tipo 4 / ~50%)',
    portPercentage: 50,
    effectiveLengthMm: 36.0,
    description: 'Ranura adelantada. Para cañones ultracortos (PDW, MP5K, pistolas HPA/AEP).',
    typicalBarrelLengthMm: '110mm - 200mm'
  }
];

export interface VolumetricInput {
  cylinderDiameterMm: number; // standard AEG is 23.8mm, Sniper/HPA may vary 22mm - 25mm
  cylinderLengthMm: number; // standard cylinder inner length is ~72.0mm
  cylinderTypeId: string;
  customPortDistanceMm?: number; // optional custom measurement
  barrelInnerDiameterMm: number; // 6.01, 6.02, 6.03, 6.05, 6.08
  barrelLengthMm: number; // e.g. 363mm
  bbWeightG: number; // e.g. 0.28g
  muzzleEnergyTargetJ?: number; // target Joules
}

export interface VolumetricAnalysisResult {
  cylinderVolumeMm3: number;
  cylinderVolumeCc: number; // cm3
  barrelVolumeMm3: number;
  barrelVolumeCc: number; // cm3
  actualRatio: number; // e.g. 2.15:1
  idealRatioMin: number;
  idealRatioMax: number;
  idealRatioTarget: number;
  status: 'severe_undervolume' | 'undervolume' | 'optimal' | 'slight_overvolume' | 'heavy_overvolume';
  efficiencyScore: number; // 0 - 100%
  jouleCreepIndex: number; // 0 (none/negative) to 100 (high creep potential)
  recommendedBarrelLengthRangeMm: { min: number; max: number };
  recommendedCylinderType: string;
  diagnosisTitle: string;
  diagnosisSummary: string;
  technicalTips: string[];
}

/**
 * Calculates optimal ratio bounds according to BB weight.
 * Heavier BBs accelerate slower inside the barrel and require higher volume ratios
 * to push expanding air behind them until muzzle exit without vacuum suck-back.
 */
export function getIdealRatioForWeight(weightG: number): { min: number; max: number; target: number } {
  if (weightG <= 0.20) {
    return { min: 1.50, max: 1.85, target: 1.70 };
  } else if (weightG <= 0.25) {
    return { min: 1.75, max: 2.10, target: 1.90 };
  } else if (weightG <= 0.28) {
    return { min: 1.95, max: 2.30, target: 2.10 };
  } else if (weightG <= 0.30) {
    return { min: 2.10, max: 2.50, target: 2.25 };
  } else if (weightG <= 0.32) {
    return { min: 2.25, max: 2.65, target: 2.45 };
  } else if (weightG <= 0.36) {
    return { min: 2.40, max: 2.85, target: 2.60 };
  } else if (weightG <= 0.40) {
    return { min: 2.60, max: 3.10, target: 2.85 };
  } else if (weightG <= 0.45) {
    return { min: 2.80, max: 3.40, target: 3.05 };
  } else {
    // 0.48g+ sniper BBs
    return { min: 3.00, max: 3.60, target: 3.25 };
  }
}

/**
 * Calculates complete Volumetric Ratio analysis
 */
export function calculateVolumetricRatio(input: VolumetricInput): VolumetricAnalysisResult {
  const cylRadius = Math.max(5, input.cylinderDiameterMm) / 2;
  const barrelRadius = Math.max(2.5, input.barrelInnerDiameterMm) / 2;
  const barrelLength = Math.max(50, input.barrelLengthMm);

  // Cylinder effective stroke length
  const portConfig = CYLINDER_TYPES.find(c => c.id === input.cylinderTypeId) || CYLINDER_TYPES[0];
  const effectiveCylLength = (input.cylinderLengthMm * portConfig.portPercentage) / 100;

  // Volumes in mm³
  const cylinderVolumeMm3 = Math.PI * Math.pow(cylRadius, 2) * effectiveCylLength;
  const barrelVolumeMm3 = Math.PI * Math.pow(barrelRadius, 2) * barrelLength;

  const cylinderVolumeCc = cylinderVolumeMm3 / 1000;
  const barrelVolumeCc = barrelVolumeMm3 / 1000;

  const actualRatio = barrelVolumeMm3 > 0 ? cylinderVolumeMm3 / barrelVolumeMm3 : 0;
  const ideal = getIdealRatioForWeight(input.bbWeightG);

  // Status & Diagnosis determination
  let status: VolumetricAnalysisResult['status'] = 'optimal';
  let efficiencyScore = 100;

  if (actualRatio < ideal.min * 0.85) {
    status = 'severe_undervolume';
    efficiencyScore = Math.max(20, Math.round(50 - (ideal.min - actualRatio) * 40));
  } else if (actualRatio < ideal.min) {
    status = 'undervolume';
    efficiencyScore = Math.max(60, Math.round(80 - (ideal.min - actualRatio) * 30));
  } else if (actualRatio <= ideal.max) {
    status = 'optimal';
    const distFromTarget = Math.abs(actualRatio - ideal.target);
    efficiencyScore = Math.round(100 - distFromTarget * 15);
  } else if (actualRatio <= ideal.max * 1.35) {
    status = 'slight_overvolume';
    efficiencyScore = Math.max(65, Math.round(85 - (actualRatio - ideal.max) * 20));
  } else {
    status = 'heavy_overvolume';
    efficiencyScore = Math.max(30, Math.round(60 - (actualRatio - ideal.max * 1.35) * 15));
  }

  // Joule Creep Potential Index
  // Occurs strongly when there is excess cylinder volume combined with heavy BBs
  let jouleCreepIndex = 0;
  if (actualRatio > 2.2 && input.bbWeightG >= 0.28) {
    jouleCreepIndex = Math.min(100, Math.round(((actualRatio - 2.0) * 25) + ((input.bbWeightG - 0.25) * 150)));
  } else if (actualRatio > 1.9 && input.bbWeightG >= 0.30) {
    jouleCreepIndex = Math.min(60, Math.round((actualRatio - 1.8) * 30));
  }

  // Calculate ideal barrel length range for current cylinder and BB weight
  const idealBarrelVolMin = cylinderVolumeMm3 / ideal.max;
  const idealBarrelVolMax = cylinderVolumeMm3 / ideal.min;
  const barrelCrossSection = Math.PI * Math.pow(barrelRadius, 2);

  const recommendedBarrelMinMm = Math.round(idealBarrelVolMin / barrelCrossSection);
  const recommendedBarrelMaxMm = Math.round(idealBarrelVolMax / barrelCrossSection);

  // Recommended cylinder type for current barrel length and BB weight
  const targetCylinderVol = barrelVolumeMm3 * ideal.target;
  const fullCylinderVol = Math.PI * Math.pow(cylRadius, 2) * input.cylinderLengthMm;
  const neededPortPercentage = Math.min(100, Math.max(40, (targetCylinderVol / fullCylinderVol) * 100));

  let recommendedCyl = CYLINDER_TYPES[0];
  let minDiff = 999;
  for (const c of CYLINDER_TYPES) {
    const diff = Math.abs(c.portPercentage - neededPortPercentage);
    if (diff < minDiff) {
      minDiff = diff;
      recommendedCyl = c;
    }
  }

  // Diagnosis copy
  let diagnosisTitle = '';
  let diagnosisSummary = '';
  const technicalTips: string[] = [];

  switch (status) {
    case 'severe_undervolume':
      diagnosisTitle = 'SUB-VOLUMEN CRÍTICO (Falta Grave de Aire)';
      diagnosisSummary = `El cañón (${barrelLength}mm) tiene demasiado volumen para este cilindro ventilado con bolas de ${input.bbWeightG}g. La bola abandona el cañón cuando el pistón ya terminó su carrera, creando efecto vacío (suck-back) y una pérdida dramática de FPS y alcance.`;
      technicalTips.push('Instala un cilindro con menos ventilación (ej. Tipo 0 o Tipo 1) o acorta el cañón.');
      technicalTips.push(`Para ${input.bbWeightG}g con este cañón se recomienda un ratio de ~${ideal.target.toFixed(2)}:1 (actual: ${actualRatio.toFixed(2)}:1).`);
      break;

    case 'undervolume':
      diagnosisTitle = 'LIGERO SUB-VOLUMEN (Falta de Presión Final)';
      diagnosisSummary = `El ratio actual (${actualRatio.toFixed(2)}:1) está por debajo del rango ideal (${ideal.min.toFixed(2)}:1 - ${ideal.max.toFixed(2)}:1). Con ${input.bbWeightG}g notarás menor consistencia en disparos consecutivos y caída prematura en los últimos metros.`;
      technicalTips.push('Idealmente sube a un cilindro con mayor volumen efectivo o usa bolas ligeramente más ligeras.');
      technicalTips.push('Comprueba que la compresión (tóricas de pistón y nozzle) sea 100% estanca.');
      break;

    case 'optimal':
      diagnosisTitle = 'EQUILIBRIO VOLUMÉTRICO PERFECTO (Ratio Óptimo)';
      diagnosisSummary = `Excelente sintonía (${actualRatio.toFixed(2)}:1). El volumen de aire empuja la bola de ${input.bbWeightG}g exactamente hasta la boca de fuego con la máxima eficiencia de compresión, sin turbulencias y con mínima dispersión.`;
      technicalTips.push('Consistencia tiro a tiro y agrupación de disparos óptimas.');
      technicalTips.push('Aprovechamiento máximo del muelle instalado sin sobre-esfuerzo del gearbox.');
      break;

    case 'slight_overvolume':
      diagnosisTitle = 'LIGERO SOBRE-VOLUMEN (Aceptable / Joule Creep Moderado)';
      diagnosisSummary = `El cilindro suministra algo más de aire (${actualRatio.toFixed(2)}:1) del estrictamente necesario (${ideal.target.toFixed(2)}:1). La réplica tendrá un sonido de disparo ligeramente más seco pero funcionará bien.`;
      technicalTips.push('Existe margen para subir a gramajes más pesados (ej. +0.04g) ganando alcance sin perder energía.');
      technicalTips.push('Un silenciador o bocacha con cono puede amortiguar el remanente de aire en la boca.');
      break;

    case 'heavy_overvolume':
      diagnosisTitle = 'SOBRE-VOLUMEN EXCESIVO (Turbulencia & Estallido en Boca)';
      diagnosisSummary = `Demasiado aire residual saliendo detrás de la bola de ${input.bbWeightG}g (${actualRatio.toFixed(2)}:1 frente a ${ideal.target.toFixed(2)}:1 recomendado). El chorro de aire a presión desestabiliza la bola al salir de la corona del cañón, dispersando los impactos.`;
      technicalTips.push(`Instala un cilindro ventilado (${recommendedCyl.name}) o aumenta el gramaje de bola.`);
      technicalTips.push('Atención a las normas de crono de tu campo: este setup tiene alto riesgo de Joule Creep con bolas pesadas.');
      break;
  }

  return {
    cylinderVolumeMm3: Number(cylinderVolumeMm3.toFixed(1)),
    cylinderVolumeCc: Number(cylinderVolumeCc.toFixed(2)),
    barrelVolumeMm3: Number(barrelVolumeMm3.toFixed(1)),
    barrelVolumeCc: Number(barrelVolumeCc.toFixed(2)),
    actualRatio: Number(actualRatio.toFixed(2)),
    idealRatioMin: Number(ideal.min.toFixed(2)),
    idealRatioMax: Number(ideal.max.toFixed(2)),
    idealRatioTarget: Number(ideal.target.toFixed(2)),
    status,
    efficiencyScore,
    jouleCreepIndex,
    recommendedBarrelLengthRangeMm: {
      min: Math.max(100, recommendedBarrelMinMm),
      max: Math.min(700, recommendedBarrelMaxMm)
    },
    recommendedCylinderType: recommendedCyl.name,
    diagnosisTitle,
    diagnosisSummary,
    technicalTips
  };
}
