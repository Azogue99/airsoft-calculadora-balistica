import React, { useState, useMemo, useCallback } from 'react';
import { RotateCcw } from 'lucide-react';
import { BallisticInput, ReplicaPreset } from './types';
import { REPLICA_PRESETS } from './data/presets';
import { simulateTrajectory, energyToVelocityMs, msToFps } from './physics/ballistics';
import { Header, AppTab } from './components/Header';
import { InputsPanel } from './components/InputsPanel';
import { MetricsOverview } from './components/MetricsOverview';
import { TrajectoryChart } from './components/TrajectoryChart';
import { SpeedDropCalculator } from './components/SpeedDropCalculator';
import { VolumetricOptimizer } from './components/VolumetricOptimizer';

// Estado balístico inicial (AEG estándar 1.14 J con bola de 0.28 g).
const DEFAULT_INPUT: BallisticInput = {
  bbWeightG: 0.28,
  powerMode: 'velocity_fps',
  muzzleVelocityMs: 90.2,
  muzzleVelocityFps: 296,
  muzzleEnergyJ: 1.14,
  hopupPercent: 55,
  initialHeightM: 1.5,
  firingAngleDeg: 0,
  sightHeightCm: 4.5,
  zeroDistanceM: 35,
  temperatureC: 20
};

export default function App() {
  const [input, setInput] = useState<BallisticInput>(DEFAULT_INPUT);
  const [activeTab, setActiveTab] = useState<AppTab>('ballistics');
  const [activePresetId, setActivePresetId] = useState<string | null>('aeg_assault');

  const simulation = useMemo(() => simulateTrajectory(input), [input]);

  const handleSelectPreset = useCallback((preset: ReplicaPreset) => {
    setActivePresetId(preset.id);
    const vMs = energyToVelocityMs(preset.energyJ, preset.bbWeightG);

    setInput((prev) => ({
      ...prev,
      bbWeightG: preset.bbWeightG,
      muzzleEnergyJ: preset.energyJ,
      muzzleVelocityMs: Number(vMs.toFixed(1)),
      muzzleVelocityFps: Number(msToFps(vMs).toFixed(1)),
      hopupPercent: preset.hopupPercent,
      firingAngleDeg: 0,
      initialHeightM: 1.5
    }));
  }, []);

  const handleInputChange = useCallback((updater: (prev: BallisticInput) => BallisticInput) => {
    setActivePresetId(null); // pasa a configuración personalizada
    setInput(updater);
  }, []);

  const handleReset = useCallback(() => {
    setInput(DEFAULT_INPUT);
    setActivePresetId('aeg_assault');
  }, []);

  // Sincroniza el peso elegido en el optimizador volumétrico con la balística.
  const handleSyncBbWeight = useCallback((weightG: number) => {
    setInput((prev) => {
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
    <div className="min-h-screen flex flex-col">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:top-3 focus:left-3
                   focus:px-4 focus:py-2 focus:rounded-lg focus:bg-accent focus:text-on-accent
                   focus:text-sm focus:font-semibold"
      >
        Saltar al contenido
      </a>

      <Header activeTab={activeTab} onTabChange={setActiveTab} />

      <main
        id="main-content"
        className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-4"
      >
        {activeTab === 'ballistics' ? (
          <div
            id="panel-ballistics"
            role="tabpanel"
            aria-labelledby="nav-tab-ballistics"
            className="space-y-4"
          >
            {/* Presets */}
            <section
              aria-labelledby="presets-title"
              className="card px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
            >
              <h2 id="presets-title" className="label">
                Presets
              </h2>

              <div className="flex items-center gap-1.5 flex-wrap">
                {REPLICA_PRESETS.map((preset) => {
                  const isActive = activePresetId === preset.id;
                  return (
                    <button
                      key={preset.id}
                      id={`preset-btn-${preset.id}`}
                      type="button"
                      onClick={() => handleSelectPreset(preset)}
                      title={preset.description}
                      aria-pressed={isActive}
                      className="chip"
                    >
                      <span>{preset.name.split('/')[0].trim()}</span>
                      <span className="num opacity-70">{preset.energyJ.toFixed(2)} J</span>
                    </button>
                  );
                })}

                <button
                  id="reset-inputs-btn"
                  type="button"
                  onClick={handleReset}
                  title="Restablecer valores por defecto"
                  aria-label="Restablecer valores por defecto"
                  className="chip"
                >
                  <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
                </button>
              </div>
            </section>

            <MetricsOverview simulation={simulation} input={input} />

            {/* Controles a la izquierda, visualizaciones a la derecha */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
              <div className="lg:col-span-5 xl:col-span-4 space-y-4 lg:sticky lg:top-20">
                <InputsPanel
                  input={input}
                  onChange={handleInputChange}
                  hopupState={simulation.hopupState}
                />
              </div>

              <div className="lg:col-span-7 xl:col-span-8 space-y-4 min-w-0">
                <TrajectoryChart simulation={simulation} input={input} />
                <SpeedDropCalculator simulation={simulation} input={input} />
              </div>
            </div>
          </div>
        ) : (
          <div id="panel-volumetric" role="tabpanel" aria-labelledby="nav-tab-volumetric">
            <VolumetricOptimizer
              currentBbWeightG={input.bbWeightG}
              onSyncBbWeight={handleSyncBbWeight}
            />
          </div>
        )}
      </main>

      <footer className="mt-10 border-t border-line">
        <div
          className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex flex-col sm:flex-row
                     items-center justify-between gap-3 text-[11px] text-ink-3"
        >
          <p>Calculadora balística airsoft · motor Magnus 6 mm</p>
          <ul className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1">
            <li>
              Arrastre C<sub>d</sub> ≈ 0.44
            </li>
            <li>Magnus con decaimiento de spin</li>
            <li>Calibre 5.95 mm</li>
          </ul>
        </div>
      </footer>
    </div>
  );
}
