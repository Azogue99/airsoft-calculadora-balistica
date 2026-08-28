import React from 'react';
import { 
  Gauge, 
  Wind, 
  Layers, 
  Compass, 
  ArrowUpRight, 
  ChevronDown, 
  Sliders, 
  Info, 
  Crosshair,
  Sparkles
} from 'lucide-react';
import { BallisticInput, PowerInputMode } from '../types';
import { STANDARD_BB_WEIGHTS } from '../data/presets';
import { msToFps, fpsToMs, energyToVelocityMs, velocityMsToEnergy } from '../physics/ballistics';

interface InputsPanelProps {
  input: BallisticInput;
  onChange: (updater: (prev: BallisticInput) => BallisticInput) => void;
  hopupState: 'under' | 'flat' | 'over' | 'extreme';
}

export const InputsPanel: React.FC<InputsPanelProps> = ({
  input,
  onChange,
  hopupState
}) => {
  const [showAdvanced, setShowAdvanced] = React.useState(false);

  // Handle Weight change - keep energy constant or velocity constant
  const handleWeightChange = (newWeightG: number) => {
    onChange(prev => {
      const weight = Math.max(0.10, Math.min(0.60, Number(newWeightG)));
      let newEnergy = prev.muzzleEnergyJ;
      let newMs = prev.muzzleVelocityMs;
      let newFps = prev.muzzleVelocityFps;

      if (prev.powerMode === 'energy_j') {
        // keep energy constant, adjust velocity
        newMs = energyToVelocityMs(prev.muzzleEnergyJ, weight);
        newFps = msToFps(newMs);
      } else if (prev.powerMode === 'velocity_ms') {
        // keep velocity constant, recalculate energy
        newEnergy = velocityMsToEnergy(prev.muzzleVelocityMs, weight);
      } else {
        // fps mode: recalculate energy
        newMs = fpsToMs(prev.muzzleVelocityFps);
        newEnergy = velocityMsToEnergy(newMs, weight);
      }

      return {
        ...prev,
        bbWeightG: weight,
        muzzleVelocityMs: Number(newMs.toFixed(1)),
        muzzleVelocityFps: Number(newFps.toFixed(1)),
        muzzleEnergyJ: Number(newEnergy.toFixed(3))
      };
    });
  };

  // Handle Power Mode switcher
  const handlePowerModeChange = (mode: PowerInputMode) => {
    onChange(prev => ({
      ...prev,
      powerMode: mode
    }));
  };

  // Handle Velocity m/s change
  const handleVelocityMsChange = (val: number) => {
    onChange(prev => {
      const ms = Math.max(10, Math.min(250, Number(val)));
      const fps = msToFps(ms);
      const energy = velocityMsToEnergy(ms, prev.bbWeightG);
      return {
        ...prev,
        muzzleVelocityMs: Number(ms.toFixed(1)),
        muzzleVelocityFps: Number(fps.toFixed(1)),
        muzzleEnergyJ: Number(energy.toFixed(3))
      };
    });
  };

  // Handle Velocity FPS change
  const handleVelocityFpsChange = (val: number) => {
    onChange(prev => {
      const fps = Math.max(30, Math.min(800, Number(val)));
      const ms = fpsToMs(fps);
      const energy = velocityMsToEnergy(ms, prev.bbWeightG);
      return {
        ...prev,
        muzzleVelocityFps: Number(fps.toFixed(1)),
        muzzleVelocityMs: Number(ms.toFixed(1)),
        muzzleEnergyJ: Number(energy.toFixed(3))
      };
    });
  };

  // Handle Energy Joules change
  const handleEnergyChange = (val: number) => {
    onChange(prev => {
      const energy = Math.max(0.1, Math.min(5.0, Number(val)));
      const ms = energyToVelocityMs(energy, prev.bbWeightG);
      const fps = msToFps(ms);
      return {
        ...prev,
        muzzleEnergyJ: Number(energy.toFixed(3)),
        muzzleVelocityMs: Number(ms.toFixed(1)),
        muzzleVelocityFps: Number(fps.toFixed(1))
      };
    });
  };

  // Hop-up badge visual label
  const getHopupBadge = () => {
    switch (hopupState) {
      case 'under':
        return { text: 'Sub-Hop (Caída Rápida)', color: 'bg-blue-500/20 text-blue-300 border-blue-500/30' };
      case 'flat':
        return { text: 'Hop Óptimo (Línea Plana)', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30 font-bold' };
      case 'over':
        return { text: 'Sobre-Hop Ligero (Elevación)', color: 'bg-amber-500/20 text-amber-300 border-amber-500/30' };
      case 'extreme':
        return { text: 'Sobre-Hop Extremo (Globo)', color: 'bg-rose-500/20 text-rose-300 border-rose-500/30' };
    }
  };

  const hopBadge = getHopupBadge();

  // Reference equivalent FPS with 0.20g for chrono standards
  const fpsWith020 = msToFps(energyToVelocityMs(input.muzzleEnergyJ, 0.20));

  return (
    <div className="bg-slate-900/90 border border-slate-800/80 rounded-2xl p-4 sm:p-5 shadow-xl shadow-slate-950/40 space-y-5">
      
      {/* Section Title */}
      <div className="flex items-center justify-between border-b border-slate-800/60 pb-3">
        <div className="flex items-center gap-2">
          <Sliders className="w-4 h-4 text-emerald-400" />
          <h2 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
            Parámetros de Disparo
          </h2>
        </div>
        <span className="text-[11px] text-emerald-400 font-mono flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          Tiempo Real Activo
        </span>
      </div>

      {/* 1. PESO DE BOLA (g) */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <label htmlFor="bb-weight-slider" className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-sky-400" />
            Peso de Bola (g)
          </label>
          <div className="flex items-center gap-1 bg-slate-950 px-2 py-0.5 rounded-lg border border-slate-800">
            <input
              id="bb-weight-number-input"
              type="number"
              step="0.01"
              min="0.10"
              max="0.60"
              value={input.bbWeightG}
              onChange={(e) => handleWeightChange(parseFloat(e.target.value) || 0.28)}
              className="w-14 text-right bg-transparent text-sm font-bold font-mono text-sky-400 focus:outline-none"
            />
            <span className="text-xs font-mono text-slate-400">g</span>
          </div>
        </div>

        {/* Quick Weight Buttons */}
        <div className="flex flex-wrap gap-1.5">
          {STANDARD_BB_WEIGHTS.slice(0, 8).map((w) => {
            const isSelected = Math.abs(input.bbWeightG - w.weight) < 0.005;
            return (
              <button
                key={w.weight}
                id={`weight-btn-${w.weight}`}
                onClick={() => handleWeightChange(w.weight)}
                title={w.desc}
                className={`text-xs px-2.5 py-1 rounded-lg font-mono font-medium transition-all border ${
                  isSelected
                    ? 'bg-sky-500 text-slate-950 font-bold border-sky-400 shadow-sm shadow-sky-500/20 scale-105'
                    : 'bg-slate-950/70 hover:bg-slate-800 text-slate-300 border-slate-800 hover:border-slate-700'
                }`}
              >
                {w.weight.toFixed(2)}g
              </button>
            );
          })}
        </div>

        {/* Slider */}
        <input
          id="bb-weight-slider"
          type="range"
          min="0.12"
          max="0.50"
          step="0.01"
          value={input.bbWeightG}
          onChange={(e) => handleWeightChange(parseFloat(e.target.value))}
          className="w-full h-1.5 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-sky-400"
        />
      </div>

      {/* 2. SELECTOR DE POTENCIA: VELOCIDAD (M/S, FPS) O ENERGÍA (JOULES) */}
      <div className="space-y-3 bg-slate-950/50 p-3.5 rounded-xl border border-slate-800/80">
        
        {/* Mode Selector Tabs */}
        <div className="flex items-center justify-between gap-2">
          <label className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
            <Gauge className="w-3.5 h-3.5 text-emerald-400" />
            Potencia en Boca
          </label>
          <div className="inline-flex rounded-lg bg-slate-950 p-0.5 border border-slate-800">
            <button
              id="mode-tab-fps"
              onClick={() => handlePowerModeChange('velocity_fps')}
              className={`text-[11px] px-2.5 py-1 rounded-md font-mono font-semibold transition-all ${
                input.powerMode === 'velocity_fps'
                  ? 'bg-emerald-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              FPS
            </button>
            <button
              id="mode-tab-ms"
              onClick={() => handlePowerModeChange('velocity_ms')}
              className={`text-[11px] px-2.5 py-1 rounded-md font-mono font-semibold transition-all ${
                input.powerMode === 'velocity_ms'
                  ? 'bg-emerald-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              m/s
            </button>
            <button
              id="mode-tab-joules"
              onClick={() => handlePowerModeChange('energy_j')}
              className={`text-[11px] px-2.5 py-1 rounded-md font-mono font-semibold transition-all ${
                input.powerMode === 'energy_j'
                  ? 'bg-emerald-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Joules (J)
            </button>
          </div>
        </div>

        {/* Dynamic Controls based on selected mode */}
        {input.powerMode === 'velocity_fps' && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400">Velocidad en FPS con {input.bbWeightG.toFixed(2)}g:</span>
              <div className="flex items-center gap-1 bg-slate-900 px-2 py-0.5 rounded-lg border border-slate-700">
                <input
                  id="input-velocity-fps"
                  type="number"
                  step="1"
                  min="50"
                  max="700"
                  value={Math.round(input.muzzleVelocityFps)}
                  onChange={(e) => handleVelocityFpsChange(parseFloat(e.target.value) || 300)}
                  className="w-16 text-right bg-transparent text-sm font-bold font-mono text-emerald-400 focus:outline-none"
                />
                <span className="text-xs font-mono text-slate-400">FPS</span>
              </div>
            </div>
            <input
              id="slider-velocity-fps"
              type="range"
              min="150"
              max="650"
              step="1"
              value={input.muzzleVelocityFps}
              onChange={(e) => handleVelocityFpsChange(parseFloat(e.target.value))}
              className="w-full h-1.5 bg-slate-900 rounded-lg appearance-none cursor-pointer accent-emerald-400"
            />
          </div>
        )}

        {input.powerMode === 'velocity_ms' && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400">Velocidad en m/s con {input.bbWeightG.toFixed(2)}g:</span>
              <div className="flex items-center gap-1 bg-slate-900 px-2 py-0.5 rounded-lg border border-slate-700">
                <input
                  id="input-velocity-ms"
                  type="number"
                  step="0.5"
                  min="20"
                  max="200"
                  value={input.muzzleVelocityMs}
                  onChange={(e) => handleVelocityMsChange(parseFloat(e.target.value) || 100)}
                  className="w-16 text-right bg-transparent text-sm font-bold font-mono text-emerald-400 focus:outline-none"
                />
                <span className="text-xs font-mono text-slate-400">m/s</span>
              </div>
            </div>
            <input
              id="slider-velocity-ms"
              type="range"
              min="50"
              max="190"
              step="0.5"
              value={input.muzzleVelocityMs}
              onChange={(e) => handleVelocityMsChange(parseFloat(e.target.value))}
              className="w-full h-1.5 bg-slate-900 rounded-lg appearance-none cursor-pointer accent-emerald-400"
            />
          </div>
        )}

        {input.powerMode === 'energy_j' && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400">Energía Cinética:</span>
              <div className="flex items-center gap-1 bg-slate-900 px-2 py-0.5 rounded-lg border border-slate-700">
                <input
                  id="input-energy-j"
                  type="number"
                  step="0.05"
                  min="0.2"
                  max="4.0"
                  value={input.muzzleEnergyJ}
                  onChange={(e) => handleEnergyChange(parseFloat(e.target.value) || 1.14)}
                  className="w-16 text-right bg-transparent text-sm font-bold font-mono text-emerald-400 focus:outline-none"
                />
                <span className="text-xs font-mono text-slate-400">J</span>
              </div>
            </div>
            <input
              id="slider-energy-j"
              type="range"
              min="0.3"
              max="3.5"
              step="0.02"
              value={input.muzzleEnergyJ}
              onChange={(e) => handleEnergyChange(parseFloat(e.target.value))}
              className="w-full h-1.5 bg-slate-900 rounded-lg appearance-none cursor-pointer accent-emerald-400"
            />
          </div>
        )}

        {/* Live synchronized stats strip */}
        <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-800/80 text-center font-mono">
          <div className="bg-slate-900/90 rounded-lg p-1.5 border border-slate-800">
            <span className="text-[10px] text-slate-400 block font-sans">Velocidad</span>
            <span className="text-xs font-bold text-white">{input.muzzleVelocityMs.toFixed(1)} <span className="text-[10px] text-slate-400">m/s</span></span>
          </div>
          <div className="bg-slate-900/90 rounded-lg p-1.5 border border-slate-800">
            <span className="text-[10px] text-slate-400 block font-sans">Velocidad</span>
            <span className="text-xs font-bold text-emerald-400">{Math.round(input.muzzleVelocityFps)} <span className="text-[10px] text-emerald-500/70">FPS</span></span>
          </div>
          <div className="bg-slate-900/90 rounded-lg p-1.5 border border-slate-800">
            <span className="text-[10px] text-slate-400 block font-sans">Energía</span>
            <span className="text-xs font-bold text-amber-400">{input.muzzleEnergyJ.toFixed(2)} <span className="text-[10px] text-amber-500/70">J</span></span>
          </div>
        </div>
        <div className="text-[10px] text-slate-400 text-center font-mono">
          Equivalente crono @ 0.20g: <span className="text-slate-300 font-bold">{Math.round(fpsWith020)} FPS</span>
        </div>
      </div>

      {/* 3. HOP-UP (BACKSPIN EN %) */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label htmlFor="hopup-slider" className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
            <Wind className="w-3.5 h-3.5 text-cyan-400" />
            Hop-Up (Backspin Magnus)
          </label>
          <div className="flex items-center gap-2">
            <span className={`text-[10px] px-2 py-0.5 rounded-full border ${hopBadge.color}`}>
              {hopBadge.text}
            </span>
            <div className="flex items-center gap-1 bg-slate-950 px-2 py-0.5 rounded-lg border border-slate-800">
              <input
                id="hopup-number-input"
                type="number"
                step="1"
                min="0"
                max="100"
                value={Math.round(input.hopupPercent)}
                onChange={(e) => {
                  const val = Math.max(0, Math.min(100, parseFloat(e.target.value) || 0));
                  onChange(prev => ({ ...prev, hopupPercent: val }));
                }}
                className="w-10 text-right bg-transparent text-sm font-bold font-mono text-cyan-400 focus:outline-none"
              />
              <span className="text-xs font-mono text-slate-400">%</span>
            </div>
          </div>
        </div>

        <input
          id="hopup-slider"
          type="range"
          min="0"
          max="100"
          step="1"
          value={input.hopupPercent}
          onChange={(e) => {
            const val = parseFloat(e.target.value);
            onChange(prev => ({ ...prev, hopupPercent: val }));
          }}
          className="w-full h-1.5 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-cyan-400"
        />

        {/* Quick preset markers for hopup */}
        <div className="flex justify-between text-[10px] text-slate-500 font-mono px-0.5">
          <button 
            id="hop-0-btn"
            onClick={() => onChange(prev => ({ ...prev, hopupPercent: 0 }))} 
            className="hover:text-slate-300"
          >
            0% (Sin Hop)
          </button>
          <button 
            id="hop-55-btn"
            onClick={() => onChange(prev => ({ ...prev, hopupPercent: 55 }))} 
            className="text-emerald-400/80 hover:text-emerald-300 font-semibold"
          >
            55% (Típico AEG)
          </button>
          <button 
            id="hop-70-btn"
            onClick={() => onChange(prev => ({ ...prev, hopupPercent: 70 }))} 
            className="text-amber-400/80 hover:text-amber-300"
          >
            70% (Sniper R-Hop)
          </button>
          <button 
            id="hop-100-btn"
            onClick={() => onChange(prev => ({ ...prev, hopupPercent: 100 }))} 
            className="hover:text-rose-400"
          >
            100%
          </button>
        </div>
      </div>

      {/* 4. ELEVACIÓN INICIAL (m) & 5. ÁNGULO DE DISPARO (deg) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
        
        {/* Elevación (m) */}
        <div className="space-y-1.5 bg-slate-950/40 p-3 rounded-xl border border-slate-800/80">
          <div className="flex items-center justify-between">
            <label htmlFor="elevation-slider" className="text-xs font-semibold text-slate-200 flex items-center gap-1">
              <ArrowUpRight className="w-3.5 h-3.5 text-purple-400" />
              Elevación (m)
            </label>
            <div className="flex items-center gap-1 bg-slate-900 px-2 py-0.5 rounded-lg border border-slate-800">
              <input
                id="elevation-number-input"
                type="number"
                step="0.1"
                min="0"
                max="5"
                value={input.initialHeightM}
                onChange={(e) => {
                  const val = Math.max(0, Math.min(10, parseFloat(e.target.value) || 0));
                  onChange(prev => ({ ...prev, initialHeightM: Number(val.toFixed(2)) }));
                }}
                className="w-10 text-right bg-transparent text-xs font-bold font-mono text-purple-400 focus:outline-none"
              />
              <span className="text-xs font-mono text-slate-400">m</span>
            </div>
          </div>

          <input
            id="elevation-slider"
            type="range"
            min="0"
            max="4.0"
            step="0.05"
            value={input.initialHeightM}
            onChange={(e) => {
              const val = parseFloat(e.target.value);
              onChange(prev => ({ ...prev, initialHeightM: Number(val.toFixed(2)) }));
            }}
            className="w-full h-1.5 bg-slate-900 rounded-lg appearance-none cursor-pointer accent-purple-400"
          />

          <div className="flex justify-between text-[10px] text-slate-500 font-mono">
            <button id="elev-0-btn" onClick={() => onChange(prev => ({ ...prev, initialHeightM: 0.2 }))} className="hover:text-slate-300">0.2m (Suelo)</button>
            <button id="elev-1-btn" onClick={() => onChange(prev => ({ ...prev, initialHeightM: 0.9 }))} className="hover:text-slate-300">0.9m (Rodilla)</button>
            <button id="elev-15-btn" onClick={() => onChange(prev => ({ ...prev, initialHeightM: 1.5 }))} className="text-purple-400 font-semibold hover:text-purple-300">1.5m (Hombro)</button>
          </div>
        </div>

        {/* Ángulo (deg) */}
        <div className="space-y-1.5 bg-slate-950/40 p-3 rounded-xl border border-slate-800/80">
          <div className="flex items-center justify-between">
            <label htmlFor="angle-slider" className="text-xs font-semibold text-slate-200 flex items-center gap-1">
              <Compass className="w-3.5 h-3.5 text-amber-400" />
              Ángulo (° deg)
            </label>
            <div className="flex items-center gap-1 bg-slate-900 px-2 py-0.5 rounded-lg border border-slate-800">
              <input
                id="angle-number-input"
                type="number"
                step="0.5"
                min="-20"
                max="45"
                value={input.firingAngleDeg}
                onChange={(e) => {
                  const val = Math.max(-20, Math.min(45, parseFloat(e.target.value) || 0));
                  onChange(prev => ({ ...prev, firingAngleDeg: Number(val.toFixed(1)) }));
                }}
                className="w-10 text-right bg-transparent text-xs font-bold font-mono text-amber-400 focus:outline-none"
              />
              <span className="text-xs font-mono text-slate-400">°</span>
            </div>
          </div>

          <input
            id="angle-slider"
            type="range"
            min="-15"
            max="30"
            step="0.5"
            value={input.firingAngleDeg}
            onChange={(e) => {
              const val = parseFloat(e.target.value);
              onChange(prev => ({ ...prev, firingAngleDeg: Number(val.toFixed(1)) }));
            }}
            className="w-full h-1.5 bg-slate-900 rounded-lg appearance-none cursor-pointer accent-amber-400"
          />

          <div className="flex justify-between text-[10px] text-slate-500 font-mono">
            <button id="angle-down-btn" onClick={() => onChange(prev => ({ ...prev, firingAngleDeg: -5 }))} className="hover:text-slate-300">-5°</button>
            <button id="angle-flat-btn" onClick={() => onChange(prev => ({ ...prev, firingAngleDeg: 0 }))} className="text-amber-400 font-semibold hover:text-amber-300">0° (Horizontal)</button>
            <button id="angle-up-btn" onClick={() => onChange(prev => ({ ...prev, firingAngleDeg: 10 }))} className="hover:text-slate-300">+10°</button>
          </div>
        </div>

      </div>

      {/* Advanced Optic & Environmental Accordion */}
      <div className="border-t border-slate-800/80 pt-3">
        <button
          id="toggle-advanced-btn"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="w-full flex items-center justify-between text-xs text-slate-400 hover:text-slate-200 transition-colors py-1"
        >
          <span className="flex items-center gap-1.5">
            <Crosshair className="w-3.5 h-3.5 text-slate-400" />
            Ajustes Ópticos y Puesta a Cero (Opcional)
          </span>
          <ChevronDown className={`w-4 h-4 transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
        </button>

        {showAdvanced && (
          <div className="grid grid-cols-2 gap-3 mt-3 p-3 bg-slate-950/60 rounded-xl border border-slate-800/60 text-xs">
            <div className="space-y-1">
              <label htmlFor="sight-height-input" className="text-slate-400 block text-[11px]">Altura Visor sobre cañón</label>
              <div className="flex items-center gap-1 bg-slate-900 px-2 py-1 rounded border border-slate-800">
                <input
                  id="sight-height-input"
                  type="number"
                  step="0.5"
                  min="0"
                  max="15"
                  value={input.sightHeightCm}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value) || 4.5;
                    onChange(prev => ({ ...prev, sightHeightCm: val }));
                  }}
                  className="w-full bg-transparent font-mono text-white text-right focus:outline-none"
                />
                <span className="text-slate-500 font-mono">cm</span>
              </div>
            </div>

            <div className="space-y-1">
              <label htmlFor="zero-distance-input" className="text-slate-400 block text-[11px]">Distancia de Centrado (Zero)</label>
              <div className="flex items-center gap-1 bg-slate-900 px-2 py-1 rounded border border-slate-800">
                <input
                  id="zero-distance-input"
                  type="number"
                  step="5"
                  min="10"
                  max="80"
                  value={input.zeroDistanceM}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value) || 30;
                    onChange(prev => ({ ...prev, zeroDistanceM: val }));
                  }}
                  className="w-full bg-transparent font-mono text-white text-right focus:outline-none"
                />
                <span className="text-slate-500 font-mono">m</span>
              </div>
            </div>
          </div>
        )}
      </div>

    </div>
  );
};
