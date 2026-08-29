import React, { useMemo, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { VolumetricInput, CYLINDER_TYPES, calculateVolumetricRatio } from '../physics/volumetric';
import { STANDARD_BB_WEIGHTS } from '../data/presets';
import { RangeSlider } from './ui/RangeSlider';
import { NumberField } from './ui/NumberField';

interface VolumetricOptimizerProps {
  currentBbWeightG: number;
  onSyncBbWeight?: (weightG: number) => void;
}

const SETUP_PRESETS: {
  id: string;
  label: string;
  hint: string;
  patch: Partial<VolumetricInput>;
}[] = [
  {
    id: 'cqb_pdw',
    label: 'CQB / PDW',
    hint: 'Cañón de 229 mm, cilindro 1/2, bola 0.25 g',
    patch: {
      cylinderTypeId: 'type3',
      barrelInnerDiameterMm: 6.03,
      barrelLengthMm: 229,
      bbWeightG: 0.25
    }
  },
  {
    id: 'm4_carbine',
    label: 'Carabina M4',
    hint: 'Cañón de 363 mm, cilindro 3/4, bola 0.28 g',
    patch: {
      cylinderTypeId: 'type2',
      barrelInnerDiameterMm: 6.03,
      barrelLengthMm: 363,
      bbWeightG: 0.28
    }
  },
  {
    id: 'assault_long',
    label: 'Asalto largo',
    hint: 'Cañón de 455 mm, cilindro 4/5, bola 0.28 g',
    patch: {
      cylinderTypeId: 'type1',
      barrelInnerDiameterMm: 6.02,
      barrelLengthMm: 455,
      bbWeightG: 0.28
    }
  },
  {
    id: 'dmr_precision',
    label: 'DMR',
    hint: 'Cañón de 480 mm, cilindro cerrado, bola 0.36 g',
    patch: {
      cylinderTypeId: 'full',
      barrelInnerDiameterMm: 6.02,
      barrelLengthMm: 480,
      bbWeightG: 0.36
    }
  },
  {
    id: 'sniper_bolt',
    label: 'Sniper cerrojo',
    hint: 'Cañón de 430 mm, cilindro cerrado 95 mm, bola 0.43 g',
    patch: {
      cylinderDiameterMm: 22.0,
      cylinderLengthMm: 95.0,
      cylinderTypeId: 'full',
      barrelInnerDiameterMm: 6.03,
      barrelLengthMm: 430,
      bbWeightG: 0.43
    }
  }
];

const BARREL_MARKERS = [
  { value: 110, label: 'PDW' },
  { value: 363, label: 'M4' },
  { value: 509, label: 'M16' },
  { value: 650, label: 'PSG1' }
];

const INNER_DIAMETERS = [6.01, 6.02, 6.03, 6.04, 6.05, 6.08];

/** Tres estados visuales, no cinco colores. */
const STATUS_VISUALS = {
  optimal: { badge: 'Ratio óptimo', text: 'text-accent', bar: 'bg-accent' },
  slight_overvolume: { badge: 'Ligero sobre-volumen', text: 'text-warn', bar: 'bg-warn' },
  heavy_overvolume: { badge: 'Sobre-volumen excesivo', text: 'text-danger', bar: 'bg-danger' },
  undervolume: { badge: 'Sub-volumen moderado', text: 'text-warn', bar: 'bg-warn' },
  severe_undervolume: { badge: 'Sub-volumen crítico', text: 'text-danger', bar: 'bg-danger' }
} as const;

const GAUGE_MIN = 1.2;
const GAUGE_MAX = 3.6;
const toGaugePercent = (ratio: number) =>
  Math.max(0, Math.min(100, ((ratio - GAUGE_MIN) / (GAUGE_MAX - GAUGE_MIN)) * 100));

const REFERENCE_ROWS = [
  { weight: 0.2, min: '1.50', target: '1.70', max: '1.85', cyl: 'Tipo 3 (1/2) o Tipo 2' },
  { weight: 0.25, min: '1.75', target: '1.90', max: '2.10', cyl: 'Tipo 2 (3/4)' },
  { weight: 0.28, min: '1.95', target: '2.10', max: '2.30', cyl: 'Tipo 2 (3/4) / Tipo 1' },
  { weight: 0.32, min: '2.25', target: '2.45', max: '2.65', cyl: 'Tipo 1 (4/5) o Tipo 0' },
  { weight: 0.36, min: '2.40', target: '2.60', max: '2.85', cyl: 'Tipo 0 (cerrado)' },
  { weight: 0.43, min: '2.80', target: '3.05', max: '3.40', cyl: 'Tipo 0 cerrado / bore-up' }
];

const Section: React.FC<{
  step: number;
  title: string;
  badge: React.ReactNode;
  children: React.ReactNode;
}> = ({ step, title, badge, children }) => (
  <section className="card p-5">
    <div className="flex items-center justify-between gap-3 pb-3 mb-4 border-b border-line">
      <h3 className="panel-title flex items-center gap-2">
        <span className="num text-ink-3 text-xs">{step}</span>
        {title}
      </h3>
      <div className="num text-xs font-semibold text-ink-2 shrink-0">{badge}</div>
    </div>
    {children}
  </section>
);

export const VolumetricOptimizer: React.FC<VolumetricOptimizerProps> = ({
  currentBbWeightG,
  onSyncBbWeight
}) => {
  const [input, setInput] = useState<VolumetricInput>({
    cylinderDiameterMm: 23.8,
    cylinderLengthMm: 72.0,
    cylinderTypeId: 'type2',
    barrelInnerDiameterMm: 6.03,
    barrelLengthMm: 363,
    bbWeightG: currentBbWeightG || 0.28
  });

  const [presetSelection, setPresetSelection] = useState<string>('m4_carbine');

  const analysis = useMemo(() => calculateVolumetricRatio(input), [input]);

  /** Cualquier ajuste manual deja de coincidir con un preset. */
  const patchInput = (patch: Partial<VolumetricInput>) => {
    setPresetSelection('');
    setInput((prev) => ({ ...prev, ...patch }));
  };

  /** Un único punto de entrada para el peso: campo, slider y fichas rápidas. */
  const setBbWeight = (weightG: number) => {
    const weight = Number(Math.min(0.6, Math.max(0.1, weightG)).toFixed(2));
    patchInput({ bbWeightG: weight });
    onSyncBbWeight?.(weight);
  };

  const applyPreset = (presetId: string) => {
    const preset = SETUP_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    setPresetSelection(presetId);
    setInput((prev) => ({ ...prev, ...preset.patch }));
    if (preset.patch.bbWeightG && onSyncBbWeight) onSyncBbWeight(preset.patch.bbWeightG);
  };

  const status = STATUS_VISUALS[analysis.status];
  const idealMinPct = toGaugePercent(analysis.idealRatioMin);
  const idealMaxPct = toGaugePercent(analysis.idealRatioMax);
  const actualPct = toGaugePercent(analysis.actualRatio);

  return (
    <div className="space-y-4">
      {/* Presets */}
      <section
        aria-labelledby="volumetric-presets-title"
        className="card px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
      >
        <h2 id="volumetric-presets-title" className="label">
          Configuraciones
        </h2>
        <div className="flex items-center gap-1.5 flex-wrap">
          {SETUP_PRESETS.map((preset) => (
            <button
              key={preset.id}
              id={`volumetric-preset-${preset.id}`}
              type="button"
              onClick={() => applyPreset(preset.id)}
              title={preset.hint}
              aria-pressed={presetSelection === preset.id}
              className="chip"
            >
              {preset.label}
            </button>
          ))}
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* Controles */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          <Section step={1} title="Cilindro" badge={`${analysis.cylinderVolumeCc} cc`}>
            <div className="space-y-2">
              <label htmlFor="cylinder-type-select" className="label block">
                Tipo de cilindro
              </label>
              <select
                id="cylinder-type-select"
                value={input.cylinderTypeId}
                onChange={(e) => patchInput({ cylinderTypeId: e.target.value })}
                className="select"
              >
                {CYLINDER_TYPES.map((cyl) => (
                  <option key={cyl.id} value={cyl.id}>
                    {cyl.name}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-ink-3 leading-relaxed">
                {CYLINDER_TYPES.find((c) => c.id === input.cylinderTypeId)?.description}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 mt-4">
              <div className="space-y-2">
                <label htmlFor="cylinder-diameter-input" className="label block">
                  Diámetro interno
                </label>
                <NumberField
                  id="cylinder-diameter-input"
                  ariaLabel="Diámetro interno del cilindro en milímetros"
                  value={input.cylinderDiameterMm}
                  min={18}
                  max={30}
                  step={0.1}
                  decimals={1}
                  suffix="mm"
                  inputWidthClassName="w-full"
                  className="w-full"
                  onCommit={(val) => patchInput({ cylinderDiameterMm: val })}
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="cylinder-length-input" className="label block">
                  Longitud total
                </label>
                <NumberField
                  id="cylinder-length-input"
                  ariaLabel="Longitud total del cilindro en milímetros"
                  value={input.cylinderLengthMm}
                  min={40}
                  max={140}
                  step={1}
                  decimals={0}
                  suffix="mm"
                  inputWidthClassName="w-full"
                  className="w-full"
                  onCommit={(val) => patchInput({ cylinderLengthMm: val })}
                />
              </div>
            </div>
          </Section>

          <Section step={2} title="Cañón interno" badge={`${analysis.barrelVolumeCc} cc`}>
            <fieldset>
              <legend className="flex w-full items-center justify-between gap-2 mb-2">
                <span className="label">Calibre interno</span>
                <span className="num text-xs font-semibold text-accent">
                  {input.barrelInnerDiameterMm.toFixed(2)} mm
                </span>
              </legend>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
                {INNER_DIAMETERS.map((dia) => (
                  <button
                    key={dia}
                    type="button"
                    onClick={() => patchInput({ barrelInnerDiameterMm: dia })}
                    aria-pressed={Math.abs(input.barrelInnerDiameterMm - dia) < 0.005}
                    className="chip num"
                  >
                    {dia.toFixed(2)}
                  </button>
                ))}
              </div>
            </fieldset>

            <div className="mt-5 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label htmlFor="barrel-length-slider" className="label">
                  Longitud del cañón
                </label>
                <NumberField
                  id="barrel-length-number"
                  ariaLabel="Longitud del cañón en milímetros"
                  value={input.barrelLengthMm}
                  min={100}
                  max={700}
                  step={1}
                  decimals={0}
                  suffix="mm"
                  inputWidthClassName="w-12"
                  onCommit={(val) => patchInput({ barrelLengthMm: Math.round(val) })}
                />
              </div>

              <RangeSlider
                id="barrel-length-slider"
                min={110}
                max={650}
                step={1}
                value={input.barrelLengthMm}
                onChange={(val) => patchInput({ barrelLengthMm: Math.round(val) })}
                valueText={`${input.barrelLengthMm} milímetros`}
              />

              <div className="flex flex-wrap gap-1.5">
                {BARREL_MARKERS.map((m) => (
                  <button
                    key={m.value}
                    type="button"
                    onClick={() => patchInput({ barrelLengthMm: m.value })}
                    aria-pressed={input.barrelLengthMm === m.value}
                    className="chip"
                  >
                    {m.label} <span className="num opacity-70">{m.value}</span>
                  </button>
                ))}
              </div>
            </div>
          </Section>

          {/* Mismo control que en la pestaña de trayectoria: campo, slider y
              fichas rápidas, con idénticos rangos y pasos. */}
          <Section
            step={3}
            title="Peso de bola"
            badge={
              <NumberField
                id="volumetric-bb-weight-input"
                ariaLabel="Peso de bola en gramos"
                value={input.bbWeightG}
                min={0.1}
                max={0.6}
                step={0.01}
                decimals={2}
                suffix="g"
                inputWidthClassName="w-11"
                onCommit={setBbWeight}
              />
            }
          >
            <RangeSlider
              id="volumetric-bb-weight-slider"
              min={0.12}
              max={0.5}
              step={0.01}
              value={input.bbWeightG}
              onChange={setBbWeight}
              ariaLabel="Peso de bola en gramos"
              valueText={`${input.bbWeightG.toFixed(2)} gramos`}
            />

            <div className="flex flex-wrap gap-1.5 mt-3">
              {STANDARD_BB_WEIGHTS.map((w) => (
                <button
                  key={w.weight}
                  id={`volumetric-weight-btn-${w.weight}`}
                  type="button"
                  title={w.desc}
                  onClick={() => setBbWeight(w.weight)}
                  aria-pressed={Math.abs(input.bbWeightG - w.weight) < 0.005}
                  className="chip num"
                >
                  {w.weight.toFixed(2)}
                </button>
              ))}
            </div>

            <p className="text-[11px] text-ink-3 mt-3">
              El peso elegido se sincroniza con la pestaña de trayectoria.
            </p>
          </Section>
        </div>

        {/* Análisis */}
        <div className="lg:col-span-7 flex flex-col gap-4 min-w-0">
          <section aria-labelledby="ratio-title" className="card p-5">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 pb-4 border-b border-line">
              <div>
                <h2 id="ratio-title" className="label">
                  Ratio volumétrico cilindro / cañón
                </h2>
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 mt-2">
                  <span className="num text-4xl font-semibold text-ink leading-none tracking-tight">
                    {analysis.actualRatio.toFixed(2)}
                    <span className="text-ink-3 text-2xl"> : 1</span>
                  </span>
                  <span className="text-xs text-ink-3">
                    objetivo{' '}
                    <span className="num text-accent">{analysis.idealRatioTarget.toFixed(2)}</span>{' '}
                    para {input.bbWeightG.toFixed(2)} g
                  </span>
                </div>
              </div>

              <p
                role="status"
                className={`text-xs font-semibold shrink-0 self-start flex items-center gap-2 ${status.text}`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-current" aria-hidden="true" />
                {status.badge}
              </p>
            </div>

            {/* Indicador */}
            <div className="mt-5 space-y-2">
              <div
                role="meter"
                aria-label="Ratio volumétrico actual"
                aria-valuemin={GAUGE_MIN}
                aria-valuemax={GAUGE_MAX}
                aria-valuenow={Number(analysis.actualRatio.toFixed(2))}
                aria-valuetext={`${analysis.actualRatio.toFixed(2)} a 1 — ${status.badge}`}
                className="relative w-full h-2.5 rounded-full bg-surface-2 border border-line overflow-hidden"
              >
                <div
                  className="absolute inset-y-0 bg-accent/20"
                  style={{
                    left: `${idealMinPct}%`,
                    width: `${Math.max(0, idealMaxPct - idealMinPct)}%`
                  }}
                />
                <div
                  className={`absolute inset-y-0 w-1 -ml-0.5 rounded-full ${status.bar} transition-[left] duration-300`}
                  style={{ left: `${Math.max(1, Math.min(99, actualPct))}%` }}
                />
              </div>

              <div className="flex justify-between gap-2 text-[11px] text-ink-3">
                <span className="num">{GAUGE_MIN.toFixed(2)}</span>
                <span>
                  rango ideal{' '}
                  <span className="num text-accent">
                    {analysis.idealRatioMin.toFixed(2)}–{analysis.idealRatioMax.toFixed(2)}
                  </span>
                </span>
                <span className="num">{GAUGE_MAX.toFixed(2)}</span>
              </div>
            </div>

            {/* Desglose */}
            <dl className="mt-5 card-inset grid grid-cols-2 lg:grid-cols-4 gap-px bg-line overflow-hidden">
              {[
                {
                  label: 'Volumen cilindro',
                  value: `${analysis.cylinderVolumeCc} cc`,
                  hint: `${analysis.cylinderVolumeMm3} mm³`
                },
                {
                  label: 'Volumen cañón',
                  value: `${analysis.barrelVolumeCc} cc`,
                  hint: `${analysis.barrelVolumeMm3} mm³`
                },
                {
                  label: 'Longitud recom.',
                  value: `${analysis.recommendedBarrelLengthRangeMm.min}–${analysis.recommendedBarrelLengthRangeMm.max}`,
                  hint: 'mm para este cilindro',
                  tone: 'text-accent'
                },
                {
                  label: 'Eficiencia',
                  value: `${analysis.efficiencyScore} %`,
                  hint: `Joule creep ${analysis.jouleCreepIndex} %`,
                  tone: analysis.jouleCreepIndex > 50 ? 'text-warn' : undefined
                }
              ].map((item) => (
                <div key={item.label} className="bg-surface-2 px-3 py-3">
                  <dt className="label">{item.label}</dt>
                  <dd className={`num text-base font-semibold mt-1 ${item.tone ?? 'text-ink'}`}>
                    {item.value}
                  </dd>
                  <dd className="text-[10px] text-ink-3 mt-0.5">{item.hint}</dd>
                </div>
              ))}
            </dl>

            {/* Diagnóstico */}
            <div className="mt-5 pt-5 border-t border-line">
              <h3 className="panel-title">{analysis.diagnosisTitle}</h3>
              <p className="text-xs text-ink-2 leading-relaxed mt-1.5">
                {analysis.diagnosisSummary}
              </p>

              {analysis.technicalTips.length > 0 && (
                <ul className="mt-4 space-y-1.5">
                  {analysis.technicalTips.map((tip, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-xs text-ink-3">
                      <ArrowRight
                        className="w-3.5 h-3.5 text-accent shrink-0 mt-0.5"
                        aria-hidden="true"
                      />
                      <span>{tip}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>

          {/* Tabla de referencia */}
          <section aria-labelledby="ratio-reference-title" className="card p-5">
            <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
              <h2 id="ratio-reference-title" className="label text-ink-2">
                Ratio óptimo según gramaje
              </h2>
              <span className="text-[11px] text-ink-3">AEG / HPA / sniper</span>
            </div>

            <div className="scroll-x rounded-xl border border-line">
              <table className="data-table min-w-[520px]">
                <caption className="sr-only">
                  Ratio volumétrico mínimo, ideal y máximo recomendado por peso de bola
                </caption>
                <thead>
                  <tr>
                    {['Bola', 'Mínimo', 'Ideal', 'Máximo', 'Cilindro típico'].map((h) => (
                      <th key={h} scope="col">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {REFERENCE_ROWS.map((row) => {
                    const isCurrent = Math.abs(input.bbWeightG - row.weight) < 0.02;
                    return (
                      <tr key={row.weight} aria-current={isCurrent ? 'true' : undefined}>
                        <th scope="row">{row.weight.toFixed(2)} g</th>
                        <td>{row.min}</td>
                        <td className={isCurrent ? 'text-accent' : 'text-ink'}>{row.target}</td>
                        <td>{row.max}</td>
                        <td className="font-sans">{row.cyl}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};
