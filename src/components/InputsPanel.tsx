import React from 'react';
import { Gauge, Wind, Layers, Compass, ArrowUpRight, ChevronDown, Crosshair } from 'lucide-react';
import { BallisticInput, PowerInputMode } from '../types';
import { STANDARD_BB_WEIGHTS } from '../data/presets';
import { msToFps, fpsToMs, energyToVelocityMs, velocityMsToEnergy } from '../physics/ballistics';
import { RangeSlider } from './ui/RangeSlider';
import { NumberField } from './ui/NumberField';
import { SegmentedControl } from './ui/SegmentedControl';

type HopupState = 'under' | 'flat' | 'over' | 'extreme';

interface InputsPanelProps {
  input: BallisticInput;
  onChange: (updater: (prev: BallisticInput) => BallisticInput) => void;
  hopupState: HopupState;
}

/** Cabecera de grupo: icono monocromo + micro-etiqueta + valor a la derecha. */
const GroupHeader: React.FC<{
  htmlFor: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  field: React.ReactNode;
}> = ({ htmlFor, icon, children, field }) => (
  <div className="flex flex-wrap items-center justify-between gap-2">
    <label htmlFor={htmlFor} className="label flex items-center gap-2 text-ink-2">
      <span className="text-ink-3">{icon}</span>
      {children}
    </label>
    {field}
  </div>
);

const HOPUP_BADGES: Record<HopupState, { text: string; tone: string }> = {
  under: { text: 'Sub-hop · caída rápida', tone: 'text-ink-2' },
  flat: { text: 'Hop óptimo · línea plana', tone: 'text-accent' },
  over: { text: 'Sobre-hop · elevación', tone: 'text-warn' },
  extreme: { text: 'Sobre-hop extremo · globo', tone: 'text-danger' }
};

export const InputsPanel: React.FC<InputsPanelProps> = ({ input, onChange, hopupState }) => {
  const [showAdvanced, setShowAdvanced] = React.useState(false);

  // Cambio de peso: mantiene energía o velocidad según el modo activo.
  const handleWeightChange = (newWeightG: number) => {
    onChange((prev) => {
      const weight = Math.max(0.1, Math.min(0.6, Number(newWeightG)));
      let newEnergy = prev.muzzleEnergyJ;
      let newMs = prev.muzzleVelocityMs;
      let newFps = prev.muzzleVelocityFps;

      if (prev.powerMode === 'energy_j') {
        newMs = energyToVelocityMs(prev.muzzleEnergyJ, weight);
        newFps = msToFps(newMs);
      } else if (prev.powerMode === 'velocity_ms') {
        newEnergy = velocityMsToEnergy(prev.muzzleVelocityMs, weight);
      } else {
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

  const handleVelocityMsChange = (val: number) => {
    onChange((prev) => {
      const ms = Math.max(10, Math.min(250, Number(val)));
      return {
        ...prev,
        muzzleVelocityMs: Number(ms.toFixed(1)),
        muzzleVelocityFps: Number(msToFps(ms).toFixed(1)),
        muzzleEnergyJ: Number(velocityMsToEnergy(ms, prev.bbWeightG).toFixed(3))
      };
    });
  };

  const handleVelocityFpsChange = (val: number) => {
    onChange((prev) => {
      const fps = Math.max(30, Math.min(800, Number(val)));
      const ms = fpsToMs(fps);
      return {
        ...prev,
        muzzleVelocityFps: Number(fps.toFixed(1)),
        muzzleVelocityMs: Number(ms.toFixed(1)),
        muzzleEnergyJ: Number(velocityMsToEnergy(ms, prev.bbWeightG).toFixed(3))
      };
    });
  };

  const handleEnergyChange = (val: number) => {
    onChange((prev) => {
      const energy = Math.max(0.1, Math.min(5.0, Number(val)));
      const ms = energyToVelocityMs(energy, prev.bbWeightG);
      return {
        ...prev,
        muzzleEnergyJ: Number(energy.toFixed(3)),
        muzzleVelocityMs: Number(ms.toFixed(1)),
        muzzleVelocityFps: Number(msToFps(ms).toFixed(1))
      };
    });
  };

  const hopBadge = HOPUP_BADGES[hopupState];
  const fpsWith020 = msToFps(energyToVelocityMs(input.muzzleEnergyJ, 0.2));

  return (
    <section aria-labelledby="inputs-panel-title" className="card p-5">
      <div className="flex items-center justify-between gap-3 pb-4 border-b border-line">
        <h2 id="inputs-panel-title" className="panel-title">
          Parámetros de disparo
        </h2>
        <span className="label">Tiempo real</span>
      </div>

      {/* 1. Peso de bola */}
      <div className="pt-5 space-y-3">
        <GroupHeader
          htmlFor="bb-weight-slider"
          icon={<Layers className="w-3.5 h-3.5" aria-hidden="true" />}
          field={
            <NumberField
              id="bb-weight-number-input"
              ariaLabel="Peso de bola en gramos"
              value={input.bbWeightG}
              min={0.1}
              max={0.6}
              step={0.01}
              decimals={2}
              suffix="g"
              inputWidthClassName="w-11"
              onCommit={handleWeightChange}
            />
          }
        >
          Peso de bola
        </GroupHeader>

        <RangeSlider
          id="bb-weight-slider"
          min={0.12}
          max={0.5}
          step={0.01}
          value={input.bbWeightG}
          onChange={handleWeightChange}
          valueText={`${input.bbWeightG.toFixed(2)} gramos`}
        />

        <div className="flex flex-wrap gap-1.5">
          {STANDARD_BB_WEIGHTS.slice(0, 8).map((w) => (
            <button
              key={w.weight}
              id={`weight-btn-${w.weight}`}
              type="button"
              onClick={() => handleWeightChange(w.weight)}
              aria-pressed={Math.abs(input.bbWeightG - w.weight) < 0.005}
              title={w.desc}
              className="chip num"
            >
              {w.weight.toFixed(2)}
            </button>
          ))}
        </div>
      </div>

      {/* 2. Potencia en boca */}
      <div className="pt-5 mt-5 border-t border-line space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="label flex items-center gap-2 text-ink-2">
            <span className="text-ink-3">
              <Gauge className="w-3.5 h-3.5" aria-hidden="true" />
            </span>
            Potencia en boca
          </span>
          <SegmentedControl<PowerInputMode>
            ariaLabel="Unidad de potencia en boca"
            idPrefix="mode-tab"
            value={input.powerMode}
            onChange={(mode) => onChange((prev) => ({ ...prev, powerMode: mode }))}
            options={[
              { value: 'velocity_fps', label: 'FPS' },
              { value: 'velocity_ms', label: 'm/s' },
              { value: 'energy_j', label: 'J' }
            ]}
          />
        </div>

        {input.powerMode === 'velocity_fps' && (
          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label htmlFor="slider-velocity-fps" className="text-xs text-ink-3">
                Con bola de {input.bbWeightG.toFixed(2)} g
              </label>
              <NumberField
                id="input-velocity-fps"
                ariaLabel="Velocidad en pies por segundo"
                value={Math.round(input.muzzleVelocityFps)}
                min={30}
                max={800}
                step={1}
                decimals={0}
                suffix="FPS"
                inputWidthClassName="w-12"
                onCommit={handleVelocityFpsChange}
              />
            </div>
            <RangeSlider
              id="slider-velocity-fps"
              min={150}
              max={650}
              step={1}
              value={input.muzzleVelocityFps}
              onChange={handleVelocityFpsChange}
              valueText={`${Math.round(input.muzzleVelocityFps)} pies por segundo`}
            />
          </div>
        )}

        {input.powerMode === 'velocity_ms' && (
          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label htmlFor="slider-velocity-ms" className="text-xs text-ink-3">
                Con bola de {input.bbWeightG.toFixed(2)} g
              </label>
              <NumberField
                id="input-velocity-ms"
                ariaLabel="Velocidad en metros por segundo"
                value={input.muzzleVelocityMs}
                min={10}
                max={250}
                step={0.5}
                decimals={1}
                suffix="m/s"
                inputWidthClassName="w-12"
                onCommit={handleVelocityMsChange}
              />
            </div>
            <RangeSlider
              id="slider-velocity-ms"
              min={50}
              max={190}
              step={0.5}
              value={input.muzzleVelocityMs}
              onChange={handleVelocityMsChange}
              valueText={`${input.muzzleVelocityMs.toFixed(1)} metros por segundo`}
            />
          </div>
        )}

        {input.powerMode === 'energy_j' && (
          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label htmlFor="slider-energy-j" className="text-xs text-ink-3">
                Energía cinética
              </label>
              <NumberField
                id="input-energy-j"
                ariaLabel="Energía cinética en julios"
                value={input.muzzleEnergyJ}
                min={0.1}
                max={5}
                step={0.05}
                decimals={2}
                suffix="J"
                inputWidthClassName="w-12"
                onCommit={handleEnergyChange}
              />
            </div>
            <RangeSlider
              id="slider-energy-j"
              min={0.3}
              max={3.5}
              step={0.02}
              value={input.muzzleEnergyJ}
              onChange={handleEnergyChange}
              valueText={`${input.muzzleEnergyJ.toFixed(2)} julios`}
            />
          </div>
        )}

        {/* Equivalencias en vivo */}
        <div className="card-inset grid grid-cols-3 divide-x divide-line overflow-hidden">
          {[
            { unit: 'm/s', value: input.muzzleVelocityMs.toFixed(1) },
            { unit: 'FPS', value: String(Math.round(input.muzzleVelocityFps)) },
            { unit: 'J', value: input.muzzleEnergyJ.toFixed(2) }
          ].map((row) => (
            <p key={row.unit} className="px-2 py-2.5 text-center">
              <span className="num text-sm font-semibold text-ink">{row.value}</span>{' '}
              <span className="unit">{row.unit}</span>
            </p>
          ))}
        </div>
        <p className="text-[11px] text-ink-3 text-center">
          Equivalente crono @ 0.20 g ·{' '}
          <span className="num text-ink-2">{Math.round(fpsWith020)} FPS</span>
        </p>
      </div>

      {/* 3. Hop-up */}
      <div className="pt-5 mt-5 border-t border-line space-y-3">
        <GroupHeader
          htmlFor="hopup-slider"
          icon={<Wind className="w-3.5 h-3.5" aria-hidden="true" />}
          field={
            <NumberField
              id="hopup-number-input"
              ariaLabel="Hop-up en porcentaje"
              value={Math.round(input.hopupPercent)}
              min={0}
              max={100}
              step={1}
              decimals={0}
              suffix="%"
              inputWidthClassName="w-9"
              onCommit={(val) => onChange((prev) => ({ ...prev, hopupPercent: val }))}
            />
          }
        >
          Hop-up · backspin
        </GroupHeader>

        <RangeSlider
          id="hopup-slider"
          min={0}
          max={100}
          step={1}
          value={input.hopupPercent}
          onChange={(val) => onChange((prev) => ({ ...prev, hopupPercent: val }))}
          valueText={`${Math.round(input.hopupPercent)} por ciento — ${hopBadge.text}`}
        />

        <p
          role="status"
          className="inline-flex items-center gap-2 text-[11px] rounded-full
                     bg-surface-2 border border-line px-2.5 py-1"
        >
          <span className={`w-1.5 h-1.5 rounded-full bg-current ${hopBadge.tone}`} aria-hidden="true" />
          <span className={hopBadge.tone}>{hopBadge.text}</span>
        </p>

        <div className="flex flex-wrap gap-1.5">
          {[
            { id: 'hop-0-btn', value: 0, label: '0 %' },
            { id: 'hop-55-btn', value: 55, label: '55 % AEG' },
            { id: 'hop-70-btn', value: 70, label: '70 % R-Hop' },
            { id: 'hop-100-btn', value: 100, label: '100 %' }
          ].map((p) => (
            <button
              key={p.id}
              id={p.id}
              type="button"
              onClick={() => onChange((prev) => ({ ...prev, hopupPercent: p.value }))}
              aria-pressed={Math.round(input.hopupPercent) === p.value}
              className="chip"
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* 4 y 5. Elevación y ángulo */}
      <div className="pt-5 mt-5 border-t border-line grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div className="space-y-3">
          <GroupHeader
            htmlFor="elevation-slider"
            icon={<ArrowUpRight className="w-3.5 h-3.5" aria-hidden="true" />}
            field={
              <NumberField
                id="elevation-number-input"
                ariaLabel="Altura inicial de disparo en metros"
                value={input.initialHeightM}
                min={0}
                max={10}
                step={0.1}
                decimals={2}
                suffix="m"
                inputWidthClassName="w-11"
                onCommit={(val) => onChange((prev) => ({ ...prev, initialHeightM: val }))}
              />
            }
          >
            Elevación
          </GroupHeader>

          <RangeSlider
            id="elevation-slider"
            min={0}
            max={4}
            step={0.05}
            value={input.initialHeightM}
            onChange={(val) =>
              onChange((prev) => ({ ...prev, initialHeightM: Number(val.toFixed(2)) }))
            }
            valueText={`${input.initialHeightM.toFixed(2)} metros`}
          />

          <div className="flex flex-wrap gap-1.5">
            {[
              { id: 'elev-0-btn', value: 0.2, label: 'Suelo' },
              { id: 'elev-1-btn', value: 0.9, label: 'Rodilla' },
              { id: 'elev-15-btn', value: 1.5, label: 'Hombro' }
            ].map((p) => (
              <button
                key={p.id}
                id={p.id}
                type="button"
                onClick={() => onChange((prev) => ({ ...prev, initialHeightM: p.value }))}
                aria-pressed={Math.abs(input.initialHeightM - p.value) < 0.005}
                className="chip"
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <GroupHeader
            htmlFor="angle-slider"
            icon={<Compass className="w-3.5 h-3.5" aria-hidden="true" />}
            field={
              <NumberField
                id="angle-number-input"
                ariaLabel="Ángulo de disparo en grados"
                value={input.firingAngleDeg}
                min={-20}
                max={45}
                step={0.5}
                decimals={1}
                suffix="°"
                inputWidthClassName="w-11"
                onCommit={(val) => onChange((prev) => ({ ...prev, firingAngleDeg: val }))}
              />
            }
          >
            Ángulo
          </GroupHeader>

          <RangeSlider
            id="angle-slider"
            min={-15}
            max={30}
            step={0.5}
            value={input.firingAngleDeg}
            onChange={(val) =>
              onChange((prev) => ({ ...prev, firingAngleDeg: Number(val.toFixed(1)) }))
            }
            valueText={`${input.firingAngleDeg.toFixed(1)} grados`}
          />

          <div className="flex flex-wrap gap-1.5">
            {[
              { id: 'angle-down-btn', value: -5, label: '−5°' },
              { id: 'angle-flat-btn', value: 0, label: '0°' },
              { id: 'angle-up-btn', value: 10, label: '+10°' }
            ].map((p) => (
              <button
                key={p.id}
                id={p.id}
                type="button"
                onClick={() => onChange((prev) => ({ ...prev, firingAngleDeg: p.value }))}
                aria-pressed={Math.abs(input.firingAngleDeg - p.value) < 0.005}
                className="chip num"
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Ajustes ópticos */}
      <div className="pt-4 mt-5 border-t border-line">
        <button
          id="toggle-advanced-btn"
          type="button"
          onClick={() => setShowAdvanced((v) => !v)}
          aria-expanded={showAdvanced}
          aria-controls="advanced-optics-panel"
          className="w-full min-h-[32px] flex items-center justify-between gap-2 rounded-lg
                     text-xs text-ink-3 hover:text-ink transition-colors"
        >
          <span className="flex items-center gap-2">
            <Crosshair className="w-3.5 h-3.5" aria-hidden="true" />
            Ajustes ópticos y puesta a cero
          </span>
          <ChevronDown
            className={`w-4 h-4 transition-transform ${showAdvanced ? 'rotate-180' : ''}`}
            aria-hidden="true"
          />
        </button>

        {showAdvanced && (
          <div id="advanced-optics-panel" className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
            <div className="space-y-2">
              <label htmlFor="sight-height-input" className="label block">
                Altura del visor
              </label>
              <NumberField
                id="sight-height-input"
                ariaLabel="Altura del visor sobre el cañón en centímetros"
                value={input.sightHeightCm}
                min={0}
                max={15}
                step={0.5}
                decimals={1}
                suffix="cm"
                inputWidthClassName="w-full"
                className="w-full"
                onCommit={(val) => onChange((prev) => ({ ...prev, sightHeightCm: val }))}
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="zero-distance-input" className="label block">
                Distancia de centrado
              </label>
              <NumberField
                id="zero-distance-input"
                ariaLabel="Distancia de centrado del visor en metros"
                value={input.zeroDistanceM}
                min={5}
                max={100}
                step={5}
                decimals={0}
                suffix="m"
                inputWidthClassName="w-full"
                className="w-full"
                onCommit={(val) => onChange((prev) => ({ ...prev, zeroDistanceM: val }))}
              />
            </div>
          </div>
        )}
      </div>
    </section>
  );
};
