import React, { useState, useMemo } from 'react';
import { 
  TrendingDown, 
  Clock, 
  Target, 
  Layers, 
  Zap, 
  Table, 
  BarChart3, 
  Flame, 
  Info,
  Sliders,
  ChevronRight
} from 'lucide-react';
import { SimulationResult, BallisticInput, WeightComparisonResult } from '../types';
import { getWeightComparisons } from '../physics/ballistics';

interface SpeedDropCalculatorProps {
  simulation: SimulationResult;
  input: BallisticInput;
}

type DropViewMode = 'vs_distance' | 'vs_time' | 'multi_weight';

export const SpeedDropCalculator: React.FC<SpeedDropCalculatorProps> = ({
  simulation,
  input
}) => {
  const [viewMode, setViewMode] = useState<DropViewMode>('multi_weight');
  const [speedUnit, setSpeedUnit] = useState<'fps' | 'ms'>('fps');
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const points = simulation.points;
  const initialV = speedUnit === 'fps' ? input.muzzleVelocityFps : input.muzzleVelocityMs;
  const initialEnergy = input.muzzleEnergyJ;

  // Multi-weight comparison data
  const weightComparisons = useMemo(() => {
    return getWeightComparisons(input);
  }, [input]);

  // SVG Chart dimensions
  const svgWidth = 850;
  const svgHeight = 360;
  const padLeft = 60;
  const padRight = 30;
  const padTop = 25;
  const padBottom = 45;
  const chartW = svgWidth - padLeft - padRight;
  const chartH = svgHeight - padTop - padBottom;

  // Max bounds for Distance & Time
  const maxDist = useMemo(() => {
    const raw = Math.max(50, simulation.maxRangeM);
    return Math.ceil(raw / 10) * 10;
  }, [simulation.maxRangeM]);

  const maxTime = useMemo(() => {
    const raw = Math.max(1.5, simulation.flightTimeS);
    return Math.ceil(raw * 5) / 5; // round to 0.2s
  }, [simulation.flightTimeS]);

  const maxVelocity = useMemo(() => {
    if (viewMode === 'multi_weight') {
      const highestInitial = Math.max(
        ...weightComparisons.map(w => speedUnit === 'fps' ? w.muzzleVelocityFps : w.muzzleVelocityMs)
      );
      return Math.ceil((highestInitial * 1.1) / 50) * 50;
    }
    return Math.ceil((initialV * 1.1) / 50) * 50;
  }, [viewMode, weightComparisons, initialV, speedUnit]);

  // Coordinate Converters
  const toXDist = (xM: number) => padLeft + (xM / maxDist) * chartW;
  const toXTime = (tS: number) => padLeft + (tS / maxTime) * chartW;
  const toYVel = (v: number) => padTop + chartH - (v / maxVelocity) * chartH;

  // Single trajectory speed curve (vs Distance)
  const pathVsDistance = useMemo(() => {
    if (!points || points.length === 0) return '';
    return points.reduce((acc, pt, index) => {
      const sx = toXDist(pt.x);
      const v = speedUnit === 'fps' ? pt.velocityFps : pt.velocityMs;
      const sy = toYVel(v);
      return index === 0 ? `M ${sx},${sy}` : `${acc} L ${sx},${sy}`;
    }, '');
  }, [points, maxDist, maxVelocity, speedUnit]);

  // Single trajectory speed curve (vs Time)
  const pathVsTime = useMemo(() => {
    if (!points || points.length === 0) return '';
    return points.reduce((acc, pt, index) => {
      const sx = toXTime(pt.time);
      const v = speedUnit === 'fps' ? pt.velocityFps : pt.velocityMs;
      const sy = toYVel(v);
      return index === 0 ? `M ${sx},${sy}` : `${acc} L ${sx},${sy}`;
    }, '');
  }, [points, maxTime, maxVelocity, speedUnit]);

  // Multi-weight comparison paths (vs Distance)
  const multiWeightPaths = useMemo(() => {
    return weightComparisons.map((wc) => {
      const pts = wc.simulation.points;
      const pathD = pts.reduce((acc, pt, index) => {
        const sx = toXDist(pt.x);
        const v = speedUnit === 'fps' ? pt.velocityFps : pt.velocityMs;
        const sy = toYVel(v);
        return index === 0 ? `M ${sx},${sy}` : `${acc} L ${sx},${sy}`;
      }, '');
      return {
        ...wc,
        pathD,
        finalVelocity: pts.length > 0 ? (speedUnit === 'fps' ? pts[pts.length - 1].velocityFps : pts[pts.length - 1].velocityMs) : 0,
        energyAt40m: pts.find(p => p.x >= 40)?.energyJ || 0,
        timeTo40m: pts.find(p => p.x >= 40)?.time || 0
      };
    });
  }, [weightComparisons, maxDist, maxVelocity, speedUnit]);

  // Ticks
  const distTicks = useMemo(() => {
    const step = maxDist <= 60 ? 10 : 20;
    const ticks: number[] = [];
    for (let d = 0; d <= maxDist; d += step) ticks.push(d);
    return ticks;
  }, [maxDist]);

  const timeTicks = useMemo(() => {
    const step = 0.25;
    const ticks: number[] = [];
    for (let t = 0; t <= maxTime; t += step) ticks.push(Number(t.toFixed(2)));
    return ticks;
  }, [maxTime]);

  const velTicks = useMemo(() => {
    const step = maxVelocity <= 200 ? 25 : maxVelocity <= 400 ? 50 : 100;
    const ticks: number[] = [];
    for (let v = 0; v <= maxVelocity; v += step) ticks.push(v);
    return ticks;
  }, [maxVelocity]);

  return (
    <div className="bg-slate-900/90 border border-slate-800/90 rounded-2xl p-4 sm:p-5 shadow-xl shadow-slate-950/40 space-y-4">
      
      {/* Header with Title and Mode Switchers */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 border-b border-slate-800/80 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <TrendingDown className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
              Speed Drop Calculator (Pérdida de Velocidad)
            </h3>
          </div>
          <p className="text-xs text-slate-400">
            Análisis aerodinámico de desaceleración y degradación de energía en el aire
          </p>
        </div>

        {/* View Controls */}
        <div className="flex items-center gap-2 flex-wrap text-xs">
          
          {/* Unit Toggle */}
          <div className="inline-flex rounded-lg bg-slate-950 p-0.5 border border-slate-800">
            <button
              id="speed-drop-unit-fps"
              onClick={() => setSpeedUnit('fps')}
              className={`px-2.5 py-1 rounded-md font-mono font-semibold transition-all ${
                speedUnit === 'fps' ? 'bg-amber-500 text-slate-950 shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              FPS
            </button>
            <button
              id="speed-drop-unit-ms"
              onClick={() => setSpeedUnit('ms')}
              className={`px-2.5 py-1 rounded-md font-mono font-semibold transition-all ${
                speedUnit === 'ms' ? 'bg-amber-500 text-slate-950 shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              m/s
            </button>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="inline-flex rounded-lg bg-slate-950 p-0.5 border border-slate-800">
            <button
              id="view-tab-multiweight"
              onClick={() => setViewMode('multi_weight')}
              className={`px-2.5 py-1 rounded-md font-mono font-semibold transition-all flex items-center gap-1 ${
                viewMode === 'multi_weight' ? 'bg-emerald-500 text-slate-950 shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Layers className="w-3 h-3" />
              Comparativa Gramajes
            </button>

            <button
              id="view-tab-distance"
              onClick={() => setViewMode('vs_distance')}
              className={`px-2.5 py-1 rounded-md font-mono font-semibold transition-all flex items-center gap-1 ${
                viewMode === 'vs_distance' ? 'bg-emerald-500 text-slate-950 shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Target className="w-3 h-3" />
              Vel. vs Distancia
            </button>

            <button
              id="view-tab-time"
              onClick={() => setViewMode('vs_time')}
              className={`px-2.5 py-1 rounded-md font-mono font-semibold transition-all flex items-center gap-1 ${
                viewMode === 'vs_time' ? 'bg-emerald-500 text-slate-950 shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Clock className="w-3 h-3" />
              Vel. vs Tiempo
            </button>
          </div>

        </div>
      </div>

      {/* Main SVG Visualizer */}
      <div className="relative w-full overflow-hidden bg-slate-950 rounded-xl border border-slate-800/80 p-1 shadow-inner">
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full h-auto block select-none"
        >
          {/* Y Axis Grid Lines & Labels */}
          {velTicks.map((v) => {
            const sy = toYVel(v);
            return (
              <g key={`vel-grid-${v}`}>
                <line
                  x1={padLeft}
                  y1={sy}
                  x2={padLeft + chartW}
                  y2={sy}
                  stroke="#334155"
                  strokeWidth="0.5"
                  strokeDasharray="3,3"
                  opacity={0.4}
                />
                <text
                  x={padLeft - 8}
                  y={sy + 3.5}
                  fill="#64748b"
                  fontSize="11"
                  fontFamily="monospace"
                  textAnchor="end"
                >
                  {v}
                </text>
              </g>
            );
          })}

          {/* X Axis Grid Lines (Distance or Time) */}
          {viewMode !== 'vs_time' ? (
            distTicks.map((d) => {
              const sx = toXDist(d);
              return (
                <g key={`dist-grid-${d}`}>
                  <line
                    x1={sx}
                    y1={padTop}
                    x2={sx}
                    y2={padTop + chartH}
                    stroke="#334155"
                    strokeWidth="0.5"
                    strokeDasharray="3,3"
                    opacity={0.4}
                  />
                  <text
                    x={sx}
                    y={padTop + chartH + 16}
                    fill="#64748b"
                    fontSize="11"
                    fontFamily="monospace"
                    textAnchor="middle"
                  >
                    {d}m
                  </text>
                </g>
              );
            })
          ) : (
            timeTicks.map((t) => {
              const sx = toXTime(t);
              return (
                <g key={`time-grid-${t}`}>
                  <line
                    x1={sx}
                    y1={padTop}
                    x2={sx}
                    y2={padTop + chartH}
                    stroke="#334155"
                    strokeWidth="0.5"
                    strokeDasharray="3,3"
                    opacity={0.4}
                  />
                  <text
                    x={sx}
                    y={padTop + chartH + 16}
                    fill="#64748b"
                    fontSize="11"
                    fontFamily="monospace"
                    textAnchor="middle"
                  >
                    {t}s
                  </text>
                </g>
              );
            })
          )}

          {/* Render Curve based on mode */}
          {viewMode === 'vs_distance' && pathVsDistance && (
            <path
              d={pathVsDistance}
              fill="none"
              stroke="#f59e0b"
              strokeWidth="3"
              strokeLinecap="round"
            />
          )}

          {viewMode === 'vs_time' && pathVsTime && (
            <path
              d={pathVsTime}
              fill="none"
              stroke="#38bdf8"
              strokeWidth="3"
              strokeLinecap="round"
            />
          )}

          {/* Multi-Weight Comparative Curves */}
          {viewMode === 'multi_weight' && (
            multiWeightPaths.map((mw) => {
              const isCurrent = Math.abs(mw.bbWeightG - input.bbWeightG) < 0.005;
              return (
                <path
                  key={`mw-path-${mw.bbWeightG}`}
                  d={mw.pathD}
                  fill="none"
                  stroke={mw.color}
                  strokeWidth={isCurrent ? "3.5" : "2"}
                  strokeDasharray={isCurrent ? undefined : "4,2"}
                  strokeLinecap="round"
                  opacity={isCurrent ? 1 : 0.75}
                />
              );
            })
          )}

          {/* Axis Labels */}
          <text
            x={padLeft - 10}
            y={padTop - 8}
            fill="#94a3b8"
            fontSize="11"
            fontFamily="monospace"
            textAnchor="start"
            fontWeight="bold"
          >
            ↑ Velocidad ({speedUnit === 'fps' ? 'FPS' : 'm/s'})
          </text>

          <text
            x={padLeft + chartW}
            y={padTop + chartH + 34}
            fill="#94a3b8"
            fontSize="11"
            fontFamily="monospace"
            textAnchor="end"
            fontWeight="bold"
          >
            {viewMode === 'vs_time' ? 'Tiempo de Vuelo (s) →' : 'Distancia Total Recorrida (m) →'}
          </text>
        </svg>
      </div>

      {/* Multi-Weight Comparative Legend & Insights */}
      {viewMode === 'multi_weight' && (
        <div className="space-y-3 bg-slate-950/60 p-3 sm:p-4 rounded-xl border border-slate-800">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-white font-mono uppercase tracking-wider flex items-center gap-1.5">
              <Flame className="w-3.5 h-3.5 text-amber-400" />
              Comparativa de Inercia Aerodinámica ({input.muzzleEnergyJ.toFixed(2)} Joules fijos)
            </span>
            <span className="text-[11px] text-slate-400 font-mono hidden sm:inline">
              Misma potencia en boca
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2 font-mono text-xs">
            {multiWeightPaths.map((item) => {
              const isCurrent = Math.abs(item.bbWeightG - input.bbWeightG) < 0.005;
              const vInit = speedUnit === 'fps' ? item.muzzleVelocityFps : item.muzzleVelocityMs;
              const v40m = item.simulation.points.find(p => p.x >= 40);
              const v40mVal = v40m ? (speedUnit === 'fps' ? v40m.velocityFps : v40m.velocityMs) : 0;
              const speedLoss40m = v40m ? v40m.speedLossPercent : 0;

              return (
                <div
                  key={`card-${item.bbWeightG}`}
                  className={`p-2.5 rounded-xl border transition-all ${
                    isCurrent
                      ? 'bg-slate-900 border-emerald-400 ring-1 ring-emerald-400/40 shadow-lg'
                      : 'bg-slate-900/60 border-slate-800/80 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-bold flex items-center gap-1.5 text-white">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }}></span>
                      {item.bbWeightG.toFixed(2)}g
                    </span>
                    {isCurrent && (
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                        ACTUAL
                      </span>
                    )}
                  </div>

                  <div className="space-y-1 text-[11px] text-slate-300">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Salida:</span>
                      <span className="font-bold text-white">{Math.round(vInit)} {speedUnit === 'fps' ? 'FPS' : 'm/s'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">A 40 metros:</span>
                      <span className="font-bold text-cyan-300">{Math.round(v40mVal)} {speedUnit === 'fps' ? 'FPS' : 'm/s'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Pérdida @ 40m:</span>
                      <span className={`font-bold ${speedLoss40m > 60 ? 'text-rose-400' : 'text-amber-400'}`}>
                        -{speedLoss40m}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Energía @ 40m:</span>
                      <span className="font-bold text-amber-300">{item.energyAt40m.toFixed(2)} J</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Alcance máx:</span>
                      <span className="font-bold text-emerald-400">{item.simulation.maxRangeM}m</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="p-2.5 rounded-lg bg-emerald-950/20 border border-emerald-800/40 text-[11px] text-emerald-300/90 flex items-start gap-2">
            <Info className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <p>
              <strong>Principio Balístico de Airsoft:</strong> A pesar de salir con menos FPS en el cañón, las bolas más pesadas (ej. 0.28g - 0.40g) poseen mayor momento lineal ($p = m \cdot v$) y menor relación superficie/masa, por lo que <strong>resisten mucho mejor el frenado del aire</strong>, mantienen su trayectoria más estable y llegan a 40m-50m con mayor energía y precisión.
            </p>
          </div>
        </div>
      )}

      {/* Speed Drop Checkpoints Table */}
      <div className="space-y-2 pt-2 border-t border-slate-800/80">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-white font-mono uppercase tracking-wider flex items-center gap-1.5">
            <Table className="w-3.5 h-3.5 text-sky-400" />
            Tabla de Pérdida de Velocidad por Distancia
          </span>
          <span className="text-[11px] text-slate-400 font-mono">
            {input.bbWeightG.toFixed(2)}g @ {Math.round(input.muzzleVelocityFps)} FPS ({input.muzzleEnergyJ.toFixed(2)}J)
          </span>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-800/80">
          <table className="w-full text-xs font-mono text-left">
            <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 text-[11px]">
              <tr>
                <th className="py-2 px-3 font-semibold">Distancia</th>
                <th className="py-2 px-3 font-semibold">Tiempo (s)</th>
                <th className="py-2 px-3 font-semibold">Velocidad (FPS)</th>
                <th className="py-2 px-3 font-semibold">Velocidad (m/s)</th>
                <th className="py-2 px-3 font-semibold">Pérdida Velocidad</th>
                <th className="py-2 px-3 font-semibold">Energía (J)</th>
                <th className="py-2 px-3 font-semibold">Caída de Mira</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 bg-slate-900/60 text-slate-200">
              {/* Row 0: Muzzle / 0m */}
              <tr className="hover:bg-slate-800/50 transition-colors bg-emerald-950/10">
                <td className="py-2 px-3 font-bold text-white">0 m (Boca)</td>
                <td className="py-2 px-3 text-slate-400">0.000 s</td>
                <td className="py-2 px-3 font-bold text-emerald-400">{Math.round(input.muzzleVelocityFps)} FPS</td>
                <td className="py-2 px-3 text-slate-300">{input.muzzleVelocityMs.toFixed(1)} m/s</td>
                <td className="py-2 px-3 text-slate-400">0.0%</td>
                <td className="py-2 px-3 font-bold text-amber-400">{input.muzzleEnergyJ.toFixed(2)} J</td>
                <td className="py-2 px-3 text-slate-400">-{input.sightHeightCm} cm</td>
              </tr>

              {simulation.speedDropTable.map((row) => {
                const isTarget = Math.abs(row.distanceM - 30) < 0.1 || Math.abs(row.distanceM - 50) < 0.1;
                return (
                  <tr 
                    key={`table-row-${row.distanceM}`}
                    className={`hover:bg-slate-800/60 transition-colors ${
                      isTarget ? 'bg-slate-800/30 font-semibold' : ''
                    }`}
                  >
                    <td className="py-2 px-3 font-bold text-white flex items-center gap-1">
                      <Target className="w-3 h-3 text-slate-500" />
                      {row.distanceM} m
                    </td>
                    <td className="py-2 px-3 text-slate-300">{row.timeS.toFixed(3)} s</td>
                    <td className="py-2 px-3 font-bold text-cyan-300">{Math.round(row.velocityFps)} FPS</td>
                    <td className="py-2 px-3 text-slate-300">{row.velocityMs.toFixed(1)} m/s</td>
                    <td className="py-2 px-3">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        row.speedLossPercent > 50 ? 'bg-rose-500/20 text-rose-300' : 'bg-amber-500/20 text-amber-300'
                      }`}>
                        -{row.speedLossPercent}%
                      </span>
                    </td>
                    <td className="py-2 px-3 font-bold text-amber-400">{row.energyJ.toFixed(3)} J</td>
                    <td className="py-2 px-3">
                      <span className={Math.abs(row.dropCm) <= 15 ? 'text-emerald-400' : 'text-slate-300'}>
                        {row.dropCm > 0 ? `+${row.dropCm}` : row.dropCm} cm
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
