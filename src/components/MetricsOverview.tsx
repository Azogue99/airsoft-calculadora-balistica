import React from 'react';
import { Target, ArrowUp, Clock, Zap, Gauge, Crosshair } from 'lucide-react';
import { SimulationResult, BallisticInput } from '../types';

interface MetricsOverviewProps {
  simulation: SimulationResult;
  input: BallisticInput;
}

export const MetricsOverview: React.FC<MetricsOverviewProps> = ({
  simulation,
  input
}) => {
  const muzzleEnergy = input.muzzleEnergyJ;
  const energyRetention = muzzleEnergy > 0 ? (simulation.impactEnergyJ / muzzleEnergy) * 100 : 0;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-3">
      
      {/* 1. Alcance Máximo */}
      <div className="bg-slate-900/90 border border-slate-800/90 rounded-xl p-3 shadow-md hover:border-emerald-500/40 transition-colors">
        <div className="flex items-center justify-between text-slate-400 mb-1">
          <span className="text-[11px] font-medium uppercase tracking-wider">Alcance Máx.</span>
          <Target className="w-3.5 h-3.5 text-emerald-400" />
        </div>
        <div className="flex items-baseline gap-1 font-mono">
          <span className="text-xl sm:text-2xl font-black text-white">{simulation.maxRangeM}</span>
          <span className="text-xs font-semibold text-emerald-400">m</span>
        </div>
        <div className="text-[10px] text-slate-500 mt-0.5">
          Caída a suelo (y=0)
        </div>
      </div>

      {/* 2. Alcance Efectivo (Torso ±15cm) */}
      <div className="bg-slate-900/90 border border-slate-800/90 rounded-xl p-3 shadow-md hover:border-sky-500/40 transition-colors">
        <div className="flex items-center justify-between text-slate-400 mb-1">
          <span className="text-[11px] font-medium uppercase tracking-wider">Alcance Efectivo</span>
          <Crosshair className="w-3.5 h-3.5 text-sky-400" />
        </div>
        <div className="flex items-baseline gap-1 font-mono">
          <span className="text-xl sm:text-2xl font-black text-sky-400">{simulation.effectiveRangeM}</span>
          <span className="text-xs font-semibold text-sky-400">m</span>
        </div>
        <div className="text-[10px] text-slate-500 mt-0.5">
          Corredor de impacto ±15cm
        </div>
      </div>

      {/* 3. Ápex (Altura Máxima) */}
      <div className="bg-slate-900/90 border border-slate-800/90 rounded-xl p-3 shadow-md hover:border-purple-500/40 transition-colors">
        <div className="flex items-center justify-between text-slate-400 mb-1">
          <span className="text-[11px] font-medium uppercase tracking-wider">Ápex (Máx. Y)</span>
          <ArrowUp className="w-3.5 h-3.5 text-purple-400" />
        </div>
        <div className="flex items-baseline gap-1 font-mono">
          <span className="text-xl sm:text-2xl font-black text-purple-300">{simulation.apexHeightM}</span>
          <span className="text-xs font-semibold text-purple-400">m</span>
        </div>
        <div className="text-[10px] text-slate-500 mt-0.5 font-mono">
          a {simulation.apexDistanceM}m de distancia
        </div>
      </div>

      {/* 4. Tiempo de Vuelo */}
      <div className="bg-slate-900/90 border border-slate-800/90 rounded-xl p-3 shadow-md hover:border-amber-500/40 transition-colors">
        <div className="flex items-center justify-between text-slate-400 mb-1">
          <span className="text-[11px] font-medium uppercase tracking-wider">Tiempo Vuelo</span>
          <Clock className="w-3.5 h-3.5 text-amber-400" />
        </div>
        <div className="flex items-baseline gap-1 font-mono">
          <span className="text-xl sm:text-2xl font-black text-amber-300">{simulation.flightTimeS}</span>
          <span className="text-xs font-semibold text-amber-400">s</span>
        </div>
        <div className="text-[10px] text-slate-500 mt-0.5 font-mono">
          Hasta contacto final
        </div>
      </div>

      {/* 5. Velocidad de Impacto */}
      <div className="bg-slate-900/90 border border-slate-800/90 rounded-xl p-3 shadow-md hover:border-cyan-500/40 transition-colors">
        <div className="flex items-center justify-between text-slate-400 mb-1">
          <span className="text-[11px] font-medium uppercase tracking-wider">Velocidad Fin</span>
          <Gauge className="w-3.5 h-3.5 text-cyan-400" />
        </div>
        <div className="flex items-baseline gap-1 font-mono">
          <span className="text-xl sm:text-2xl font-black text-cyan-300">{Math.round(simulation.impactVelocityFps)}</span>
          <span className="text-xs font-semibold text-cyan-400">FPS</span>
        </div>
        <div className="text-[10px] text-slate-500 mt-0.5 font-mono">
          {simulation.impactVelocityMs} m/s
        </div>
      </div>

      {/* 6. Energía Remanente */}
      <div className="bg-slate-900/90 border border-slate-800/90 rounded-xl p-3 shadow-md hover:border-rose-500/40 transition-colors">
        <div className="flex items-center justify-between text-slate-400 mb-1">
          <span className="text-[11px] font-medium uppercase tracking-wider">Energía Impacto</span>
          <Zap className="w-3.5 h-3.5 text-rose-400" />
        </div>
        <div className="flex items-baseline gap-1 font-mono">
          <span className="text-xl sm:text-2xl font-black text-rose-300">{simulation.impactEnergyJ}</span>
          <span className="text-xs font-semibold text-rose-400">J</span>
        </div>
        <div className="text-[10px] text-slate-500 mt-0.5 font-mono">
          {energyRetention.toFixed(0)}% de energía inicial
        </div>
      </div>

    </div>
  );
};
