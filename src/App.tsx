import React, { useState, useMemo, useCallback } from 'react';
import { 
  Crosshair, 
  Sparkles, 
  HelpCircle, 
  Share2, 
  Sliders, 
  FileText,
  CheckCircle2,
  AlertTriangle,
  Target,
  Zap,
  Shield,
  RotateCcw
} from 'lucide-react';
import { BallisticInput, ReplicaPreset } from './types';
import { REPLICA_PRESETS } from './data/presets';
import { simulateTrajectory, energyToVelocityMs, msToFps } from './physics/ballistics';
import { Header } from './components/Header';
import { InputsPanel } from './components/InputsPanel';
import { MetricsOverview } from './components/MetricsOverview';
import { TrajectoryChart } from './components/TrajectoryChart';
import { SpeedDropCalculator } from './components/SpeedDropCalculator';
import { VolumetricOptimizer } from './components/VolumetricOptimizer';

// Default initial ballistic state (Standard AEG 1.14J / 0.28g)
const DEFAULT_INPUT: BallisticInput = {
  bbWeightG: 0.28,
  powerMode: 'velocity_fps',
  muzzleVelocityMs: 90.2,
  muzzleVelocityFps: 296,
  muzzleEnergyJ: 1.14,
  hopupPercent: 55,
  initialHeightM: 1.50,
  firingAngleDeg: 0,
  sightHeightCm: 4.5,
  zeroDistanceM: 35,
  temperatureC: 20
};

export default function App() {
  const [input, setInput] = useState<BallisticInput>(DEFAULT_INPUT);
  const [activeTab, setActiveTab] = useState<'ballistics' | 'volumetric'>('ballistics');
  const [activePresetId, setActivePresetId] = useState<string | null>('aeg_assault');
  const [showTheoryModal, setShowTheoryModal] = useState<boolean>(false);

  // Compute Ballistic Trajectory in real-time
  const simulation = useMemo(() => {
    return simulateTrajectory(input);
  }, [input]);

  // Handle Preset selection
  const handleSelectPreset = useCallback((preset: ReplicaPreset) => {
    setActivePresetId(preset.id);
    const vMs = energyToVelocityMs(preset.energyJ, preset.bbWeightG);
    const vFps = msToFps(vMs);

    setInput(prev => ({
      ...prev,
      bbWeightG: preset.bbWeightG,
      muzzleEnergyJ: preset.energyJ,
      muzzleVelocityMs: Number(vMs.toFixed(1)),
      muzzleVelocityFps: Number(vFps.toFixed(1)),
      hopupPercent: preset.hopupPercent,
      firingAngleDeg: 0,
      initialHeightM: 1.50
    }));
  }, []);

  // Handle Custom Input Changes
  const handleInputChange = useCallback((updater: (prev: BallisticInput) => BallisticInput) => {
    setActivePresetId(null); // switched to custom
    setInput(updater);
  }, []);

  // Reset to default
  const handleReset = useCallback(() => {
    setInput(DEFAULT_INPUT);
    setActivePresetId('aeg_assault');
  }, []);

  // Sync BB weight from Volumetric Optimizer to Ballistics
  const handleSyncBbWeight = useCallback((weightG: number) => {
    setInput(prev => {
      const vMs = energyToVelocityMs(prev.muzzleEnergyJ, weightG);
      return {
        ...prev,
        bbWeightG: weightG,
        muzzleVelocityMs: Number(vMs.toFixed(1)),
        muzzleVelocityFps: Number(msToFps(vMs).toFixed(1))
      };
    });
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-emerald-500 selection:text-slate-950">
      
      {/* Top Header */}
      <Header
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      {/* Main App Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-6 space-y-5">
        
        {activeTab === 'ballistics' ? (
          <>
            {/* Presets Bar (Outside Header, matching the Volumetric Optimizer layout) */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shadow-lg shadow-black/20">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 bg-emerald-400 rounded-full animate-pulse"></div>
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-white">
                  CONFIGURACIONES PREESTABLECIDAS (PRESETS BALÍSTICOS)
                </span>
              </div>

              <div className="flex items-center gap-1.5 flex-wrap text-xs font-mono">
                {REPLICA_PRESETS.map((preset) => {
                  const isActive = activePresetId === preset.id;
                  return (
                    <button
                      key={preset.id}
                      id={`preset-btn-${preset.id}`}
                      onClick={() => handleSelectPreset(preset)}
                      title={preset.description}
                      className={`px-3 py-1.5 rounded-lg border transition-all flex items-center gap-1.5 ${
                        isActive
                          ? 'bg-emerald-500 text-slate-950 font-bold border-emerald-400 shadow-sm'
                          : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:text-white hover:bg-slate-700'
                      }`}
                    >
                      {preset.id === 'pistol' && <Shield className="w-3.5 h-3.5" />}
                      {preset.id === 'aeg_assault' && <Target className="w-3.5 h-3.5" />}
                      {preset.id === 'dmr' && <Zap className="w-3.5 h-3.5" />}
                      {preset.id === 'sniper' && <Crosshair className="w-3.5 h-3.5" />}
                      <span>{preset.name.split('/')[0].trim()}</span>
                      <span className={`text-[10px] ${isActive ? 'text-slate-950 font-bold' : 'text-emerald-400'}`}>
                        {preset.energyJ}J
                      </span>
                    </button>
                  );
                })}
                <button
                  id="reset-inputs-btn"
                  onClick={handleReset}
                  title="Restablecer valores por defecto"
                  className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700 transition-colors ml-1"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Top Summary Metrics Ribbon */}
            <MetricsOverview
              simulation={simulation}
              input={input}
            />

            {/* Core Interactive Grid: Inputs on Left (Desktop), Charts on Right */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
              
              {/* Controls & Variables Column */}
              <div className="lg:col-span-4 xl:col-span-4 space-y-5">
                <InputsPanel
                  input={input}
                  onChange={handleInputChange}
                  onNavigateToVolumetric={() => setActiveTab('volumetric')}
                  hopupState={simulation.hopupState}
                />

                {/* Quick Ballistic Tip Box */}
                <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3.5 text-xs text-slate-400 space-y-1.5 font-sans">
                  <div className="flex items-center gap-1.5 text-emerald-400 font-bold font-mono">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Cálculo Balístico 100% Instantáneo</span>
                  </div>
                  <p>
                    Todos los valores se recalculan en tiempo real mientras mueves los deslizadores. Ajusta el <strong>Hop-Up</strong> hasta obtener una curva plana con el máximo alcance efectivo.
                  </p>
                </div>
              </div>

              {/* Visualizations Column */}
              <div className="lg:col-span-8 xl:col-span-8 space-y-5">
                
                {/* 1. Real-time Trajectory Chart */}
                <TrajectoryChart
                  simulation={simulation}
                  input={input}
                />

                {/* 2. Speed Drop Calculator & Comparative Chart */}
                <SpeedDropCalculator
                  simulation={simulation}
                  input={input}
                />

              </div>
            </div>
          </>
        ) : (
          <VolumetricOptimizer
            currentBbWeightG={input.bbWeightG}
            onSyncBbWeight={handleSyncBbWeight}
          />
        )}

      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950 py-4 mt-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 font-mono">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>Calculadora Balística Airsoft &bull; 6mm Magnus Aerodynamics Engine</span>
          </div>
          <div className="flex items-center gap-4 text-[11px]">
            <span>Arrastre $C_d \approx 0.44$</span>
            <span>Efecto Magnus $F_L$ con decaimiento de spin</span>
            <span>Estándar 6mm (5.95mm)</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
