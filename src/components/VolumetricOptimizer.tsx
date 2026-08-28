import React, { useState, useMemo } from 'react';
import { 
  Cpu, 
  Layers, 
  CheckCircle2, 
  AlertTriangle, 
  AlertOctagon, 
  ArrowRight,
  Sparkles,
  Info,
  Maximize2
} from 'lucide-react';
import { 
  VolumetricInput, 
  CYLINDER_TYPES, 
  calculateVolumetricRatio
} from '../physics/volumetric';
import { STANDARD_BB_WEIGHTS } from '../data/presets';

interface VolumetricOptimizerProps {
  currentBbWeightG: number;
  onSyncBbWeight?: (weightG: number) => void;
}

export const VolumetricOptimizer: React.FC<VolumetricOptimizerProps> = ({
  currentBbWeightG,
  onSyncBbWeight
}) => {
  const [input, setInput] = useState<VolumetricInput>({
    cylinderDiameterMm: 23.8, // standard AEG
    cylinderLengthMm: 72.0, // standard AEG length
    cylinderTypeId: 'type2', // 3/4 standard
    barrelInnerDiameterMm: 6.03, // standard precision tightbore
    barrelLengthMm: 363, // standard M4 length
    bbWeightG: currentBbWeightG || 0.28
  });

  const [presetSelection, setPresetSelection] = useState<string>('m4_carbine');

  // Perform calculations
  const analysis = useMemo(() => {
    return calculateVolumetricRatio(input);
  }, [input]);

  // Handle Preset configurations
  const applyPreset = (presetKey: string) => {
    setPresetSelection(presetKey);
    switch (presetKey) {
      case 'cqb_pdw':
        setInput(prev => ({
          ...prev,
          cylinderTypeId: 'type3',
          barrelInnerDiameterMm: 6.03,
          barrelLengthMm: 229,
          bbWeightG: 0.25
        }));
        if (onSyncBbWeight) onSyncBbWeight(0.25);
        break;
      case 'm4_carbine':
        setInput(prev => ({
          ...prev,
          cylinderTypeId: 'type2',
          barrelInnerDiameterMm: 6.03,
          barrelLengthMm: 363,
          bbWeightG: 0.28
        }));
        if (onSyncBbWeight) onSyncBbWeight(0.28);
        break;
      case 'assault_long':
        setInput(prev => ({
          ...prev,
          cylinderTypeId: 'type1',
          barrelInnerDiameterMm: 6.02,
          barrelLengthMm: 455,
          bbWeightG: 0.28
        }));
        if (onSyncBbWeight) onSyncBbWeight(0.28);
        break;
      case 'dmr_precision':
        setInput(prev => ({
          ...prev,
          cylinderTypeId: 'full',
          barrelInnerDiameterMm: 6.02,
          barrelLengthMm: 480,
          bbWeightG: 0.36
        }));
        if (onSyncBbWeight) onSyncBbWeight(0.36);
        break;
      case 'sniper_bolt':
        setInput(prev => ({
          ...prev,
          cylinderDiameterMm: 22.0,
          cylinderLengthMm: 95.0, // longer bolt cylinder
          cylinderTypeId: 'full',
          barrelInnerDiameterMm: 6.03,
          barrelLengthMm: 430,
          bbWeightG: 0.43
        }));
        if (onSyncBbWeight) onSyncBbWeight(0.43);
        break;
    }
  };

  const getStatusVisuals = () => {
    switch (analysis.status) {
      case 'optimal':
        return {
          badge: 'RATIO ÓPTIMO (IDEAL)',
          badgeColor: 'bg-emerald-500/20 text-emerald-400 border-emerald-500',
          barColor: 'bg-emerald-400',
          icon: CheckCircle2
        };
      case 'slight_overvolume':
        return {
          badge: 'LIGERO SOBRE-VOLUMEN',
          badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500',
          barColor: 'bg-amber-400',
          icon: AlertTriangle
        };
      case 'heavy_overvolume':
        return {
          badge: 'SOBRE-VOLUMEN EXCESIVO',
          badgeColor: 'bg-rose-500/20 text-rose-400 border-rose-500',
          barColor: 'bg-rose-500',
          icon: AlertOctagon
        };
      case 'undervolume':
        return {
          badge: 'SUB-VOLUMEN MODERADO',
          badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500',
          barColor: 'bg-amber-500',
          icon: AlertTriangle
        };
      case 'severe_undervolume':
        return {
          badge: 'SUB-VOLUMEN CRÍTICO',
          badgeColor: 'bg-rose-500/20 text-rose-400 border-rose-500',
          barColor: 'bg-rose-500',
          icon: AlertOctagon
        };
    }
  };

  const statusVisual = getStatusVisuals();
  const StatusIcon = statusVisual.icon;

  const INNER_DIAMETERS = [6.01, 6.02, 6.03, 6.04, 6.05, 6.08];

  return (
    <div className="space-y-4">
      
      {/* Top Presets bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 bg-emerald-400 rounded-full animate-pulse"></div>
          <span className="text-xs font-mono font-bold uppercase tracking-wider text-white">
            CONFIGURACIONES VOLUMÉTRICAS PREESTABLECIDAS
          </span>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap text-xs font-mono">
          <button
            onClick={() => applyPreset('cqb_pdw')}
            className={`px-2.5 py-1 rounded border transition-all ${
              presetSelection === 'cqb_pdw'
                ? 'bg-emerald-500 text-slate-950 font-bold border-emerald-400 shadow-sm'
                : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:text-white'
            }`}
          >
            CQB / PDW (229mm)
          </button>
          <button
            onClick={() => applyPreset('m4_carbine')}
            className={`px-2.5 py-1 rounded border transition-all ${
              presetSelection === 'm4_carbine'
                ? 'bg-emerald-500 text-slate-950 font-bold border-emerald-400 shadow-sm'
                : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:text-white'
            }`}
          >
            Carabina M4 (363mm)
          </button>
          <button
            onClick={() => applyPreset('assault_long')}
            className={`px-2.5 py-1 rounded border transition-all ${
              presetSelection === 'assault_long'
                ? 'bg-emerald-500 text-slate-950 font-bold border-emerald-400 shadow-sm'
                : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:text-white'
            }`}
          >
            Asalto Largo (455mm)
          </button>
          <button
            onClick={() => applyPreset('dmr_precision')}
            className={`px-2.5 py-1 rounded border transition-all ${
              presetSelection === 'dmr_precision'
                ? 'bg-emerald-500 text-slate-950 font-bold border-emerald-400 shadow-sm'
                : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:text-white'
            }`}
          >
            DMR 0.36g (480mm)
          </button>
          <button
            onClick={() => applyPreset('sniper_bolt')}
            className={`px-2.5 py-1 rounded border transition-all ${
              presetSelection === 'sniper_bolt'
                ? 'bg-emerald-500 text-slate-950 font-bold border-emerald-400 shadow-sm'
                : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:text-white'
            }`}
          >
            Sniper Cerrojo (430mm)
          </button>
        </div>
      </div>

      {/* Main Grid: Controls Left, Gauge & Visualizer Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        
        {/* Controls Column */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          
          {/* Section 1: Cilindro */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2 text-xs font-mono">
              <span className="font-bold text-emerald-400 tracking-wider uppercase flex items-center gap-1.5">
                <Cpu className="w-4 h-4" /> 1. CONFIGURACIÓN DEL CILINDRO
              </span>
              <span className="text-white font-bold">{analysis.cylinderVolumeCc} cc</span>
            </div>

            {/* Cylinder Type Selection */}
            <div className="space-y-1.5">
              <label htmlFor="cylinder-type-select" className="text-xs font-mono text-slate-400 uppercase tracking-wider block">
                TIPO DE CILINDRO (VENTILACIÓN / PORTEO)
              </label>
              <select
                id="cylinder-type-select"
                value={input.cylinderTypeId}
                onChange={(e) => {
                  setPresetSelection('');
                  setInput(prev => ({ ...prev, cylinderTypeId: e.target.value }));
                }}
                className="w-full bg-slate-950 text-white border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono focus:outline-none focus:border-emerald-400"
              >
                {CYLINDER_TYPES.map((cyl) => (
                  <option key={cyl.id} value={cyl.id}>
                    {cyl.name} — ({cyl.portPercentage}% vol)
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-slate-400 font-mono leading-tight">
                {CYLINDER_TYPES.find(c => c.id === input.cylinderTypeId)?.description}
              </p>
            </div>

            {/* Cylinder dimensions (Advanced) */}
            <div className="grid grid-cols-2 gap-3 pt-1 text-xs font-mono">
              <div className="space-y-1">
                <span className="text-[10px] text-slate-400 uppercase">DIÁMETRO INTERNO</span>
                <div className="flex items-center gap-1 bg-slate-950 px-2 py-1.5 rounded border border-slate-800">
                  <input
                    id="cylinder-diameter-input"
                    type="number"
                    step="0.1"
                    min="20"
                    max="28"
                    value={input.cylinderDiameterMm}
                    onChange={(e) => setInput(prev => ({ ...prev, cylinderDiameterMm: parseFloat(e.target.value) || 23.8 }))}
                    className="w-full bg-transparent text-white text-right focus:outline-none font-bold"
                  />
                  <span className="text-[11px] text-slate-400">mm</span>
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] text-slate-400 uppercase">LONGITUD TOTAL</span>
                <div className="flex items-center gap-1 bg-slate-950 px-2 py-1.5 rounded border border-slate-800">
                  <input
                    id="cylinder-length-input"
                    type="number"
                    step="1"
                    min="50"
                    max="120"
                    value={input.cylinderLengthMm}
                    onChange={(e) => setInput(prev => ({ ...prev, cylinderLengthMm: parseFloat(e.target.value) || 72 }))}
                    className="w-full bg-transparent text-white text-right focus:outline-none font-bold"
                  />
                  <span className="text-[11px] text-slate-400">mm</span>
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Cañón Interno */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2 text-xs font-mono">
              <span className="font-bold text-emerald-400 tracking-wider uppercase flex items-center gap-1.5">
                <Maximize2 className="w-4 h-4" /> 2. CAÑÓN INTERNO (INNER BARREL)
              </span>
              <span className="text-white font-bold">{analysis.barrelVolumeCc} cc</span>
            </div>

            {/* Inner Diameter Options */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-slate-400 uppercase">DIÁMETRO INTERNO (CALIBRE)</span>
                <span className="text-emerald-400 font-bold">{input.barrelInnerDiameterMm.toFixed(2)} mm</span>
              </div>
              <div className="grid grid-cols-6 gap-1.5">
                {INNER_DIAMETERS.map((dia) => {
                  const isSel = Math.abs(input.barrelInnerDiameterMm - dia) < 0.005;
                  return (
                    <button
                      key={dia}
                      onClick={() => {
                        setPresetSelection('');
                        setInput(prev => ({ ...prev, barrelInnerDiameterMm: dia }));
                      }}
                      className={`py-1.5 rounded text-xs font-mono border transition-all ${
                        isSel
                          ? 'bg-emerald-500 text-slate-950 font-bold border-emerald-400'
                          : 'bg-slate-950 text-slate-300 border-slate-800 hover:text-white'
                      }`}
                    >
                      {dia.toFixed(2)}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Barrel Length Slider & Input */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-slate-400 uppercase">LONGITUD DEL CAÑÓN</span>
                <div className="flex items-center gap-1 bg-slate-950 px-2 py-1 rounded border border-slate-800">
                  <input
                    id="barrel-length-number"
                    type="number"
                    step="1"
                    min="100"
                    max="650"
                    value={input.barrelLengthMm}
                    onChange={(e) => {
                      setPresetSelection('');
                      setInput(prev => ({ ...prev, barrelLengthMm: parseInt(e.target.value) || 363 }));
                    }}
                    className="w-14 text-right bg-transparent text-white font-bold focus:outline-none"
                  />
                  <span className="text-slate-400">mm</span>
                </div>
              </div>

              <input
                id="barrel-length-slider"
                type="range"
                min="110"
                max="650"
                step="1"
                value={input.barrelLengthMm}
                onChange={(e) => {
                  setPresetSelection('');
                  setInput(prev => ({ ...prev, barrelLengthMm: parseInt(e.target.value) }));
                }}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-400"
              />

              <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                <span>110mm (PDW)</span>
                <span>363mm (M4)</span>
                <span>509mm (M16)</span>
                <span>650mm (PSG1)</span>
              </div>
            </div>
          </div>

          {/* Section 3: Peso de bola */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2 text-xs font-mono">
              <span className="font-bold text-emerald-400 tracking-wider uppercase flex items-center gap-1.5">
                <Layers className="w-4 h-4" /> 3. PESO DE BOLA PROYECTIL
              </span>
              <span className="text-emerald-400 font-bold">{input.bbWeightG.toFixed(2)}g</span>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {STANDARD_BB_WEIGHTS.map((w) => {
                const isSel = Math.abs(input.bbWeightG - w.weight) < 0.005;
                return (
                  <button
                    key={w.weight}
                    onClick={() => {
                      setPresetSelection('');
                      setInput(prev => ({ ...prev, bbWeightG: w.weight }));
                      if (onSyncBbWeight) onSyncBbWeight(w.weight);
                    }}
                    className={`text-xs px-2.5 py-1.5 rounded font-mono border transition-all ${
                      isSel
                        ? 'bg-emerald-500 text-slate-950 font-bold border-emerald-400'
                        : 'bg-slate-950 text-slate-300 border-slate-800 hover:text-white'
                    }`}
                  >
                    {w.weight.toFixed(2)}g
                  </button>
                );
              })}
            </div>
          </div>

        </div>

        {/* Visualizer & Analysis Column */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          
          {/* Main Ratio Metric Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col gap-5 relative overflow-hidden">
            
            {/* Header with Status Badge */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-800 pb-4">
              <div>
                <span className="text-xs text-slate-400 font-mono uppercase tracking-widest block">
                  RATIO VOLUMÉTRICO REAL (C/B RATIO)
                </span>
                <div className="flex items-baseline gap-2 font-mono mt-1">
                  <span className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
                    {analysis.actualRatio.toFixed(2)} : 1
                  </span>
                  <span className="text-xs text-slate-400">
                    (Ideal para {input.bbWeightG.toFixed(2)}g: <strong className="text-emerald-400">{analysis.idealRatioTarget.toFixed(2)}:1</strong>)
                  </span>
                </div>
              </div>

              <div className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold border flex items-center gap-1.5 self-start sm:self-auto ${statusVisual.badgeColor}`}>
                <StatusIcon className="w-4 h-4" />
                <span>{statusVisual.badge}</span>
              </div>
            </div>

            {/* Interactive Visual Gauge Bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-mono text-slate-400">
                <span>1.20:1 (Sub-Volumen)</span>
                <span className="text-emerald-400 font-bold">Rango Ideal ({analysis.idealRatioMin.toFixed(2)} - {analysis.idealRatioMax.toFixed(2)})</span>
                <span>3.60:1 (Sobre-Volumen)</span>
              </div>

              {/* Gauge track */}
              <div className="w-full h-4 bg-slate-950 rounded-full border border-slate-800 relative overflow-hidden">
                {/* Ideal target range zone highlight */}
                {(() => {
                  const minPercent = Math.max(0, ((analysis.idealRatioMin - 1.2) / (3.6 - 1.2)) * 100);
                  const maxPercent = Math.min(100, ((analysis.idealRatioMax - 1.2) / (3.6 - 1.2)) * 100);
                  const widthPercent = maxPercent - minPercent;
                  return (
                    <div 
                      className="absolute top-0 h-full bg-emerald-500/20 border-x border-emerald-400/50"
                      style={{ left: `${minPercent}%`, width: `${widthPercent}%` }}
                    />
                  );
                })()}

                {/* Actual indicator bar / marker */}
                {(() => {
                  const actualPercent = Math.max(2, Math.min(98, ((analysis.actualRatio - 1.2) / (3.6 - 1.2)) * 100));
                  return (
                    <div
                      className={`absolute top-0 h-full w-2.5 ${statusVisual.barColor} rounded-full shadow-md -ml-1 transition-all duration-300`}
                      style={{ left: `${actualPercent}%` }}
                    />
                  );
                })()}
              </div>

              <div className="flex justify-between text-[11px] font-mono text-slate-400">
                <span>Efecto Vacío / Pérdida FPS</span>
                <span>Eficiencia: <strong className="text-white">{analysis.efficiencyScore}%</strong></span>
                <span>Turbulencia en boca</span>
              </div>
            </div>

            {/* Comparative Breakdown Boxes */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono text-center">
              <div className="bg-slate-950 rounded-lg p-2.5 border border-slate-800">
                <span className="text-slate-400 block text-[10px]">VOLUMEN CILINDRO</span>
                <span className="font-bold text-white text-base">{analysis.cylinderVolumeCc} cc</span>
                <span className="text-[10px] text-slate-500 block">({analysis.cylinderVolumeMm3} mm³)</span>
              </div>
              <div className="bg-slate-950 rounded-lg p-2.5 border border-slate-800">
                <span className="text-slate-400 block text-[10px]">VOLUMEN CAÑÓN</span>
                <span className="font-bold text-white text-base">{analysis.barrelVolumeCc} cc</span>
                <span className="text-[10px] text-slate-500 block">({analysis.barrelVolumeMm3} mm³)</span>
              </div>
              <div className="bg-slate-950 rounded-lg p-2.5 border border-slate-800">
                <span className="text-slate-400 block text-[10px]">LONGITUD RECOM.</span>
                <span className="font-bold text-emerald-400 text-sm">
                  {analysis.recommendedBarrelLengthRangeMm.min} - {analysis.recommendedBarrelLengthRangeMm.max} mm
                </span>
                <span className="text-[10px] text-slate-500 block">para este cilindro</span>
              </div>
              <div className="bg-slate-950 rounded-lg p-2.5 border border-slate-800">
                <span className="text-slate-400 block text-[10px]">RIESGO JOULE CREEP</span>
                <span className={`font-bold text-sm ${analysis.jouleCreepIndex > 50 ? 'text-amber-400' : 'text-white'}`}>
                  {analysis.jouleCreepIndex}% ({analysis.jouleCreepIndex > 50 ? 'Alto' : 'Bajo'})
                </span>
                <span className="text-[10px] text-slate-500 block">con bola pesada</span>
              </div>
            </div>

            {/* Technical Diagnosis Box */}
            <div className="bg-slate-950 border border-slate-800 rounded-lg p-3.5 space-y-2 text-xs font-mono">
              <div className="flex items-center gap-1.5 text-white font-bold">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                <span>{analysis.diagnosisTitle}</span>
              </div>
              <p className="text-slate-300 leading-relaxed text-[11px]">
                {analysis.diagnosisSummary}
              </p>
              
              {analysis.technicalTips.length > 0 && (
                <div className="pt-2 border-t border-slate-800 space-y-1">
                  <span className="text-[10px] text-emerald-400 uppercase font-bold tracking-wider block">
                    RECOMENDACIONES TÉCNICAS:
                  </span>
                  {analysis.technicalTips.map((tip, idx) => (
                    <div key={idx} className="flex items-start gap-1.5 text-[11px] text-slate-400">
                      <ArrowRight className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                      <span>{tip}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>

          {/* Reference Table of Recommended Ratios by BB Weight */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-2.5">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <Info className="w-4 h-4 text-emerald-400" />
                TABLA DE REFERENCIA: RATIO ÓPTIMO SEGÚN GRAMAJE DE BOLA
              </span>
              <span className="text-slate-500">Estándar AEG / HPA / Sniper</span>
            </div>

            <div className="overflow-x-auto rounded-lg border border-slate-800">
              <table className="w-full text-xs font-mono text-left">
                <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 text-[10px] uppercase">
                  <tr>
                    <th className="py-2 px-3">PESO DE BOLA</th>
                    <th className="py-2 px-3">RATIO MÍNIMO</th>
                    <th className="py-2 px-3">RATIO IDEAL</th>
                    <th className="py-2 px-3">RATIO MÁXIMO</th>
                    <th className="py-2 px-3">CILINDRO TÍPICO (300-363mm)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 bg-slate-900 text-slate-200">
                  {[
                    { weight: 0.20, min: '1.50:1', target: '1.70:1', max: '1.85:1', cyl: 'Tipo 3 (1/2) o Tipo 2' },
                    { weight: 0.25, min: '1.75:1', target: '1.90:1', max: '2.10:1', cyl: 'Tipo 2 (3/4)' },
                    { weight: 0.28, min: '1.95:1', target: '2.10:1', max: '2.30:1', cyl: 'Tipo 2 (3/4) / Tipo 1' },
                    { weight: 0.32, min: '2.25:1', target: '2.45:1', max: '2.65:1', cyl: 'Tipo 1 (4/5) o Tipo 0' },
                    { weight: 0.36, min: '2.40:1', target: '2.60:1', max: '2.85:1', cyl: 'Tipo 0 (Cerrado)' },
                    { weight: 0.43, min: '2.80:1', target: '3.05:1', max: '3.40:1', cyl: 'Tipo 0 Cerrado / Bore-Up' },
                  ].map((row) => {
                    const isCurrent = Math.abs(input.bbWeightG - row.weight) < 0.02;
                    return (
                      <tr 
                        key={row.weight}
                        className={`transition-colors ${isCurrent ? 'bg-slate-800 font-bold' : 'hover:bg-slate-800/40'}`}
                      >
                        <td className="py-2 px-3 text-white flex items-center gap-1.5">
                          {isCurrent && <div className="w-1.5 h-1.5 rounded-full bg-emerald-400"></div>}
                          {row.weight.toFixed(2)}g
                        </td>
                        <td className="py-2 px-3 text-slate-400">{row.min}</td>
                        <td className="py-2 px-3 text-emerald-400 font-bold">{row.target}</td>
                        <td className="py-2 px-3 text-slate-400">{row.max}</td>
                        <td className="py-2 px-3 text-slate-300">{row.cyl}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};
