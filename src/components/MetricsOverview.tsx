import React from 'react';
import { SimulationResult, BallisticInput } from '../types';

interface MetricsOverviewProps {
  simulation: SimulationResult;
  input: BallisticInput;
}

interface Metric {
  label: string;
  value: string | number;
  unit: string;
  hint: string;
}

/**
 * Panel único con filetes de 1px entre celdas (grid con `gap-px` sobre fondo
 * de línea) en lugar de seis tarjetas sueltas de seis colores distintos.
 */
export const MetricsOverview: React.FC<MetricsOverviewProps> = ({ simulation, input }) => {
  const muzzleEnergy = input.muzzleEnergyJ;
  const energyRetention = muzzleEnergy > 0 ? (simulation.impactEnergyJ / muzzleEnergy) * 100 : 0;

  const metrics: Metric[] = [
    {
      label: 'Alcance máx.',
      value: simulation.maxRangeM,
      unit: 'm',
      hint: 'Caída al suelo'
    },
    {
      label: 'Alcance efectivo',
      value: simulation.effectiveRangeM,
      unit: 'm',
      hint: 'Corredor ±15 cm'
    },
    {
      label: 'Ápex',
      value: simulation.apexHeightM,
      unit: 'm',
      hint: `A ${simulation.apexDistanceM} m`
    },
    {
      label: 'Tiempo de vuelo',
      value: simulation.flightTimeS,
      unit: 's',
      hint: 'Hasta el impacto'
    },
    {
      label: 'Velocidad final',
      value: Math.round(simulation.impactVelocityFps),
      unit: 'FPS',
      hint: `${simulation.impactVelocityMs} m/s`
    },
    {
      label: 'Energía de impacto',
      value: simulation.impactEnergyJ,
      unit: 'J',
      hint: `${energyRetention.toFixed(0)} % de la inicial`
    }
  ];

  return (
    <section aria-label="Resumen de resultados balísticos" className="card overflow-hidden">
      <h2 className="sr-only">Resumen de resultados balísticos</h2>
      <dl className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-px bg-line">
        {metrics.map((m) => (
          <div key={m.label} className="bg-surface px-4 py-3.5">
            <dt className="label">{m.label}</dt>
            <dd className="mt-1.5 flex items-baseline gap-1">
              <span className="num text-2xl font-semibold text-ink leading-none">{m.value}</span>
              <span className="unit">{m.unit}</span>
            </dd>
            <dd className="mt-1 text-[11px] text-ink-3 leading-tight">{m.hint}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
};
