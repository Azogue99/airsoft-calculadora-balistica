import React, { useState, useRef, useMemo } from 'react';
import { 
  Maximize2, 
  Eye, 
  Crosshair, 
  MapPin, 
  Activity, 
  ArrowUp, 
  Sliders,
  ShieldAlert,
  Info
} from 'lucide-react';
import { SimulationResult, BallisticInput, TrajectoryPoint } from '../types';

interface TrajectoryChartProps {
  simulation: SimulationResult;
  input: BallisticInput;
}

export const TrajectoryChart: React.FC<TrajectoryChartProps> = ({
  simulation,
  input
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoverPoint, setHoverPoint] = useState<TrajectoryPoint | null>(null);
  const [targetDistance, setTargetDistance] = useState<number>(30);
  const [showSightLine, setShowSightLine] = useState<boolean>(true);
  const [showEffectiveCorridor, setShowEffectiveCorridor] = useState<boolean>(true);
  const [showGridNumbers, setShowGridNumbers] = useState<boolean>(true);

  const points = simulation.points;
  const maxRange = simulation.maxRangeM;
  const apexHeight = simulation.apexHeightM;

  // View bounds with nice round margins
  const maxX = useMemo(() => {
    const rawMax = Math.max(40, maxRange * 1.08);
    return Math.ceil(rawMax / 10) * 10;
  }, [maxRange]);

  const maxY = useMemo(() => {
    const rawMax = Math.max(3.0, apexHeight * 1.35, input.initialHeightM + 0.8);
    return Math.ceil(rawMax * 2) / 2; // round to nearest 0.5m
  }, [apexHeight, input.initialHeightM]);

  const minY = -0.3; // small margin below ground

  // SVG Coordinate Conversion
  const svgWidth = 900;
  const svgHeight = 420;
  const padLeft = 55;
  const padRight = 35;
  const padTop = 30;
  const padBottom = 45;

  const chartW = svgWidth - padLeft - padRight;
  const chartH = svgHeight - padTop - padBottom;

  const toSvgX = (xM: number) => padLeft + (xM / maxX) * chartW;
  const toSvgY = (yM: number) => padTop + chartH - ((yM - minY) / (maxY - minY)) * chartH;
  const groundY = toSvgY(0);

  // SVG Path for trajectory
  const trajectoryPathD = useMemo(() => {
    if (!points || points.length === 0) return '';
    return points.reduce((acc, pt, index) => {
      const sx = toSvgX(pt.x);
      const sy = toSvgY(pt.y);
      return index === 0 ? `M ${sx},${sy}` : `${acc} L ${sx},${sy}`;
    }, '');
  }, [points, maxX, maxY]);

  // SVG Path for Sight Line
  const sightLinePathD = useMemo(() => {
    if (!showSightLine || points.length === 0) return '';
    const p0 = points[0];
    const pEnd = points[points.length - 1];
    const sx1 = toSvgX(0);
    const sy1 = toSvgY(p0.sightLineY);
    const sx2 = toSvgX(pEnd.x);
    const sy2 = toSvgY(pEnd.sightLineY);
    return `M ${sx1},${sy1} L ${sx2},${sy2}`;
  }, [points, showSightLine, maxX, maxY]);

  // Find target point stats at targetDistance
  const targetPoint = useMemo(() => {
    if (!points || points.length === 0) return null;
    const clampedDist = Math.min(targetDistance, maxRange);
    return points.reduce((prev, curr) => 
      Math.abs(curr.x - clampedDist) < Math.abs(prev.x - clampedDist) ? curr : prev
    );
  }, [points, targetDistance, maxRange]);

  // Grid steps
  const xTicks = useMemo(() => {
    const step = maxX <= 50 ? 5 : maxX <= 100 ? 10 : 20;
    const ticks: number[] = [];
    for (let x = 0; x <= maxX; x += step) {
      ticks.push(x);
    }
    return ticks;
  }, [maxX]);

  const yTicks = useMemo(() => {
    const step = maxY <= 3 ? 0.5 : 1.0;
    const ticks: number[] = [];
    for (let y = 0; y <= maxY; y += step) {
      ticks.push(Number(y.toFixed(1)));
    }
    return ticks;
  }, [maxY]);

  // Mouse / Touch scrubber handler
  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement> | React.TouchEvent<SVGSVGElement>) => {
    if (!containerRef.current || points.length === 0) return;
    const rect = containerRef.current.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const relX = clientX - rect.left;
    const svgX = (relX / rect.width) * svgWidth;
    
    // Map svgX back to distance in meters
    const distM = ((svgX - padLeft) / chartW) * maxX;
    if (distM < 0 || distM > maxRange) {
      setHoverPoint(null);
      return;
    }

    // Find closest point
    const closest = points.reduce((prev, curr) => 
      Math.abs(curr.x - distM) < Math.abs(prev.x - distM) ? curr : prev
    );
    setHoverPoint(closest);
  };

  const handleMouseLeave = () => {
    setHoverPoint(null);
  };

  // Apex SVG coordinates
  const apexSvgX = toSvgX(simulation.apexDistanceM);
  const apexSvgY = toSvgY(simulation.apexHeightM);

  return (
    <div className="bg-slate-900/90 border border-slate-800/90 rounded-2xl p-4 sm:p-5 shadow-xl shadow-slate-950/40 space-y-4">
      
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-800/80 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
              Gráfica de Trayectoria Balística
            </h3>
          </div>
          <p className="text-xs text-slate-400">
            Eje Y: Altura (m) — Eje X: Distancia recorrida (m) en tiempo real
          </p>
        </div>

        {/* Layer Toggles */}
        <div className="flex items-center gap-2 flex-wrap text-xs">
          <button
            id="toggle-sightline-btn"
            onClick={() => setShowSightLine(!showSightLine)}
            className={`px-2.5 py-1 rounded-lg border font-mono transition-all flex items-center gap-1.5 ${
              showSightLine
                ? 'bg-rose-500/10 text-rose-300 border-rose-500/40'
                : 'bg-slate-950 text-slate-500 border-slate-800 hover:text-slate-400'
            }`}
          >
            <span className="w-2 h-0.5 bg-rose-400 inline-block"></span>
            Línea de Mira
          </button>

          <button
            id="toggle-effective-btn"
            onClick={() => setShowEffectiveCorridor(!showEffectiveCorridor)}
            className={`px-2.5 py-1 rounded-lg border font-mono transition-all flex items-center gap-1.5 ${
              showEffectiveCorridor
                ? 'bg-sky-500/10 text-sky-300 border-sky-500/40'
                : 'bg-slate-950 text-slate-500 border-slate-800 hover:text-slate-400'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-sky-400/40 inline-block"></span>
            Zona Efectiva
          </button>
        </div>
      </div>

      {/* Main SVG Ballistic Canvas */}
      <div 
        ref={containerRef}
        className="relative w-full overflow-hidden bg-slate-950 rounded-xl border border-slate-800/80 select-none shadow-inner"
        style={{ touchAction: 'none' }}
      >
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full h-auto cursor-crosshair block"
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          onTouchMove={handleMouseMove}
          onTouchEnd={handleMouseLeave}
        >
          <defs>
            {/* Trajectory Stroke Gradient (Bright Emerald to Amber/Rose) */}
            <linearGradient id="trajectoryGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#10b981" />
              <stop offset="50%" stopColor="#38bdf8" />
              <stop offset="85%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#ef4444" />
            </linearGradient>

            {/* Trajectory Under-Fill Gradient */}
            <linearGradient id="trajectoryAreaGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.25" />
              <stop offset="70%" stopColor="#0284c7" stopOpacity="0.08" />
              <stop offset="100%" stopColor="#0f172a" stopOpacity="0.0" />
            </linearGradient>

            {/* Ground Grid Pattern */}
            <pattern id="gridSub" width="10" height="10" patternUnits="userSpaceOnUse">
              <path d="M 10 0 L 0 0 0 10" fill="none" stroke="#1e293b" strokeWidth="0.4" />
            </pattern>
          </defs>

          {/* Grid background */}
          <rect x={padLeft} y={padTop} width={chartW} height={chartH} fill="url(#gridSub)" />

          {/* X Axis Grid Lines */}
          {xTicks.map((x) => {
            const sx = toSvgX(x);
            return (
              <g key={`x-grid-${x}`}>
                <line
                  x1={sx}
                  y1={padTop}
                  x2={sx}
                  y2={padTop + chartH}
                  stroke="#334155"
                  strokeWidth={x % 20 === 0 ? "1" : "0.5"}
                  strokeDasharray={x % 20 === 0 ? undefined : "3,3"}
                  opacity={x === 0 ? 0.8 : 0.4}
                />
                {showGridNumbers && (
                  <text
                    x={sx}
                    y={padTop + chartH + 16}
                    fill="#64748b"
                    fontSize="11"
                    fontFamily="monospace"
                    textAnchor="middle"
                  >
                    {x}m
                  </text>
                )}
              </g>
            );
          })}

          {/* Y Axis Grid Lines */}
          {yTicks.map((y) => {
            const sy = toSvgY(y);
            return (
              <g key={`y-grid-${y}`}>
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
                {showGridNumbers && (
                  <text
                    x={padLeft - 8}
                    y={sy + 3.5}
                    fill="#64748b"
                    fontSize="11"
                    fontFamily="monospace"
                    textAnchor="end"
                  >
                    {y}m
                  </text>
                )}
              </g>
            );
          })}

          {/* Ground Line (y = 0) */}
          <line
            x1={padLeft}
            y1={groundY}
            x2={padLeft + chartW}
            y2={groundY}
            stroke="#10b981"
            strokeWidth="1.5"
            opacity="0.8"
          />
          <rect
            x={padLeft}
            y={groundY}
            width={chartW}
            height={padTop + chartH - groundY}
            fill="#064e3b"
            opacity="0.15"
          />
          <text
            x={padLeft + chartW - 5}
            y={groundY - 5}
            fill="#059669"
            fontSize="10"
            fontFamily="monospace"
            textAnchor="end"
            fontWeight="bold"
          >
            SUELO (0.0m)
          </text>

          {/* Effective Corridor Highlight */}
          {showEffectiveCorridor && simulation.effectiveRangeM > 5 && (
            <g opacity="0.12">
              <rect
                x={toSvgX(0)}
                y={toSvgY(input.initialHeightM + 0.15)}
                width={toSvgX(simulation.effectiveRangeM) - toSvgX(0)}
                height={toSvgY(input.initialHeightM - 0.15) - toSvgY(input.initialHeightM + 0.15)}
                fill="#38bdf8"
                rx="4"
              />
            </g>
          )}

          {/* Line of Sight (Optical Axis) */}
          {showSightLine && sightLinePathD && (
            <path
              d={sightLinePathD}
              fill="none"
              stroke="#f43f5e"
              strokeWidth="1.2"
              strokeDasharray="5,4"
              opacity="0.7"
            />
          )}

          {/* Trajectory Under-Fill */}
          {trajectoryPathD && (
            <path
              d={`${trajectoryPathD} L ${toSvgX(maxRange)},${groundY} L ${toSvgX(0)},${groundY} Z`}
              fill="url(#trajectoryAreaGrad)"
            />
          )}

          {/* Ballistic Trajectory Curve */}
          {trajectoryPathD && (
            <path
              d={trajectoryPathD}
              fill="none"
              stroke="url(#trajectoryGrad)"
              strokeWidth="2.8"
              strokeLinecap="round"
            />
          )}

          {/* Apex Indicator Marker */}
          {simulation.apexHeightM > input.initialHeightM && (
            <g transform={`translate(${apexSvgX}, ${apexSvgY})`}>
              <circle r="4.5" fill="#a855f7" stroke="#ffffff" strokeWidth="1.5" />
              <line x1="0" y1="-5" x2="0" y2="-18" stroke="#a855f7" strokeWidth="1" strokeDasharray="2,2" />
              <rect x="-35" y="-34" width="70" height="15" rx="3" fill="#1e1b4b" stroke="#a855f7" strokeWidth="0.8" />
              <text x="0" y="-23" fill="#e9d5ff" fontSize="9.5" fontFamily="monospace" textAnchor="middle" fontWeight="bold">
                Ápex {simulation.apexHeightM}m
              </text>
            </g>
          )}

          {/* Max Range Contact Point */}
          <g transform={`translate(${toSvgX(maxRange)}, ${groundY})`}>
            <circle r="4" fill="#ef4444" stroke="#ffffff" strokeWidth="1.5" />
            <text x="0" y="16" fill="#f87171" fontSize="10" fontFamily="monospace" textAnchor="middle" fontWeight="bold">
              {maxRange}m
            </text>
          </g>

          {/* Target Range Pin Marker */}
          {targetPoint && (
            <g transform={`translate(${toSvgX(targetPoint.x)}, ${toSvgY(targetPoint.y)})`}>
              <line
                x1="0"
                y1="0"
                x2="0"
                y2={groundY - toSvgY(targetPoint.y)}
                stroke="#38bdf8"
                strokeWidth="1.2"
                strokeDasharray="3,3"
                opacity="0.7"
              />
              <circle r="5" fill="#0284c7" stroke="#38bdf8" strokeWidth="2" />
              <circle r="2" fill="#ffffff" />
            </g>
          )}

          {/* Interactive Hover Point HUD on Chart */}
          {hoverPoint && (
            <g transform={`translate(${toSvgX(hoverPoint.x)}, ${toSvgY(hoverPoint.y)})`}>
              <circle r="6" fill="#10b981" stroke="#ffffff" strokeWidth="2" className="animate-ping" opacity="0.6" />
              <circle r="5" fill="#10b981" stroke="#ffffff" strokeWidth="2" />
              
              {/* Vertical line to ground */}
              <line
                x1="0"
                y1="0"
                x2="0"
                y2={groundY - toSvgY(hoverPoint.y)}
                stroke="#10b981"
                strokeWidth="1"
                strokeDasharray="2,2"
              />
            </g>
          )}

          {/* Axis Labels */}
          <text
            x={padLeft + chartW}
            y={padTop + chartH + 34}
            fill="#94a3b8"
            fontSize="11"
            fontFamily="monospace"
            textAnchor="end"
            fontWeight="bold"
          >
            Distancia (m) →
          </text>
          <text
            x={padLeft - 10}
            y={padTop - 12}
            fill="#94a3b8"
            fontSize="11"
            fontFamily="monospace"
            textAnchor="start"
            fontWeight="bold"
          >
            ↑ Altura (m)
          </text>
        </svg>

        {/* Live Hover Info Floating Badge */}
        {hoverPoint && (
          <div 
            className="absolute top-3 right-3 bg-slate-900/95 border border-emerald-500/60 rounded-xl p-3 shadow-2xl backdrop-blur-md text-xs font-mono z-20 pointer-events-none min-w-[200px]"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-1.5 mb-2 text-emerald-400 font-bold">
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5" /> Posición Balística
              </span>
              <span>{hoverPoint.x}m</span>
            </div>
            <div className="space-y-1 text-slate-300">
              <div className="flex justify-between">
                <span className="text-slate-400">Altura suelo:</span>
                <span className="font-bold text-white">{hoverPoint.y} m</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Desvío de mira:</span>
                <span className={`font-bold ${hoverPoint.dropRelativeToSightCm >= 0 ? 'text-amber-400' : 'text-rose-400'}`}>
                  {hoverPoint.dropRelativeToSightCm > 0 ? `+${hoverPoint.dropRelativeToSightCm}` : hoverPoint.dropRelativeToSightCm} cm
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Velocidad:</span>
                <span className="font-bold text-cyan-300">{Math.round(hoverPoint.velocityFps)} FPS <span className="text-slate-500 font-normal">({hoverPoint.velocityMs}m/s)</span></span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Pérdida veloc.:</span>
                <span className="font-bold text-rose-400">-{hoverPoint.speedLossPercent}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Energía:</span>
                <span className="font-bold text-amber-300">{hoverPoint.energyJ} J</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Tiempo vuelo:</span>
                <span className="font-bold text-white">{hoverPoint.time} s</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Target Distance Inspector Bar */}
      <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3 sm:p-4 space-y-2.5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="flex items-center gap-2">
            <Crosshair className="w-4 h-4 text-sky-400" />
            <span className="text-xs font-bold text-white font-mono uppercase tracking-wider">
              Inspector de Impacto en Diana
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs font-mono">
            <span className="text-slate-400">Distancia al blanco:</span>
            <span className="px-2.5 py-0.5 rounded-md bg-sky-500/20 text-sky-300 border border-sky-500/40 font-bold">
              {targetDistance} metros
            </span>
          </div>
        </div>

        <input
          id="target-distance-slider"
          type="range"
          min="5"
          max={Math.min(100, Math.ceil(maxRange))}
          step="1"
          value={Math.min(targetDistance, maxRange)}
          onChange={(e) => setTargetDistance(parseFloat(e.target.value))}
          className="w-full h-1.5 bg-slate-900 rounded-lg appearance-none cursor-pointer accent-sky-400"
        />

        {targetPoint && (
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-1 font-mono text-center">
            <div className="bg-slate-900/90 rounded-lg p-2 border border-slate-800">
              <span className="text-[10px] text-slate-400 block font-sans">Tiempo al Blanco</span>
              <span className="text-sm font-bold text-white">{targetPoint.time}s</span>
            </div>
            <div className="bg-slate-900/90 rounded-lg p-2 border border-slate-800">
              <span className="text-[10px] text-slate-400 block font-sans">Velocidad en Diana</span>
              <span className="text-sm font-bold text-cyan-400">{Math.round(targetPoint.velocityFps)} <span className="text-[10px] text-cyan-500/70">FPS</span></span>
            </div>
            <div className="bg-slate-900/90 rounded-lg p-2 border border-slate-800">
              <span className="text-[10px] text-slate-400 block font-sans">Caída de Velocidad</span>
              <span className="text-sm font-bold text-rose-400">-{targetPoint.speedLossPercent}%</span>
            </div>
            <div className="bg-slate-900/90 rounded-lg p-2 border border-slate-800">
              <span className="text-[10px] text-slate-400 block font-sans">Energía en Impacto</span>
              <span className="text-sm font-bold text-amber-400">{targetPoint.energyJ} <span className="text-[10px] text-amber-500/70">J</span></span>
            </div>
            <div className="bg-slate-900/90 rounded-lg p-2 border border-slate-800 col-span-2 sm:col-span-1">
              <span className="text-[10px] text-slate-400 block font-sans">Desvío de Altura</span>
              <span className={`text-sm font-bold ${Math.abs(targetPoint.dropRelativeToSightCm) <= 15 ? 'text-emerald-400' : 'text-amber-400'}`}>
                {targetPoint.dropRelativeToSightCm > 0 ? `+${targetPoint.dropRelativeToSightCm}` : targetPoint.dropRelativeToSightCm} cm
              </span>
            </div>
          </div>
        )}
      </div>

    </div>
  );
};
