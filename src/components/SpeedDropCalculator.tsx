import React, { useMemo, useState } from 'react';
import { SimulationResult, BallisticInput, TrajectoryPoint } from '../types';
import { getWeightComparisons } from '../physics/ballistics';
import { SegmentedControl } from './ui/SegmentedControl';
import { useElementWidth } from './ui/useElementWidth';
import { formatCm, MINUS } from './ui/format';

interface SpeedDropCalculatorProps {
  simulation: SimulationResult;
  input: BallisticInput;
}

type DropViewMode = 'vs_distance' | 'vs_time' | 'multi_weight';
type SpeedUnit = 'fps' | 'ms';

const C = {
  accent: 'var(--color-accent)',
  ink2: 'var(--color-ink-2)',
  ink3: 'var(--color-ink-3)',
  line: 'var(--color-line)',
  line2: 'var(--color-line-2)'
};

const nearestPoint = (points: TrajectoryPoint[], key: 'x' | 'time', target: number) =>
  points.length === 0
    ? null
    : points.reduce((prev, curr) =>
        Math.abs(curr[key] - target) < Math.abs(prev[key] - target) ? curr : prev
      );

export const SpeedDropCalculator: React.FC<SpeedDropCalculatorProps> = ({ simulation, input }) => {
  const [viewMode, setViewMode] = useState<DropViewMode>('multi_weight');
  const [speedUnit, setSpeedUnit] = useState<SpeedUnit>('fps');
  const [hoverAxisValue, setHoverAxisValue] = useState<number | null>(null);

  const { ref: containerRef, width: boxWidth } = useElementWidth<HTMLDivElement>(850);

  const points = simulation.points;
  const unitLabel = speedUnit === 'fps' ? 'FPS' : 'm/s';
  const initialV = speedUnit === 'fps' ? input.muzzleVelocityFps : input.muzzleVelocityMs;
  const speedOf = (pt: TrajectoryPoint) => (speedUnit === 'fps' ? pt.velocityFps : pt.velocityMs);

  const weightComparisons = useMemo(() => getWeightComparisons(input), [input]);

  const compact = boxWidth < 520;
  const svgWidth = Math.max(240, boxWidth);
  const svgHeight = compact
    ? Math.round(Math.min(300, Math.max(240, svgWidth * 0.8)))
    : Math.round(Math.min(380, Math.max(280, svgWidth * 0.42)));

  const padLeft = compact ? 36 : 48;
  const padRight = compact ? 14 : 24;
  const padTop = compact ? 20 : 24;
  const padBottom = compact ? 34 : 42;
  const fontAxis = compact ? 10 : 11;

  const chartW = svgWidth - padLeft - padRight;
  const chartH = svgHeight - padTop - padBottom;

  const maxDist = useMemo(
    () => Math.ceil(Math.max(50, simulation.maxRangeM) / 10) * 10,
    [simulation.maxRangeM]
  );
  const maxTime = useMemo(
    () => Math.ceil(Math.max(1.5, simulation.flightTimeS) * 5) / 5,
    [simulation.flightTimeS]
  );

  const maxVelocity = useMemo(() => {
    if (viewMode === 'multi_weight') {
      const highest = Math.max(
        ...weightComparisons.map((w) =>
          speedUnit === 'fps' ? w.muzzleVelocityFps : w.muzzleVelocityMs
        )
      );
      return Math.ceil((highest * 1.1) / 50) * 50;
    }
    return Math.ceil((initialV * 1.1) / 50) * 50;
  }, [viewMode, weightComparisons, initialV, speedUnit]);

  const isTimeAxis = viewMode === 'vs_time';
  const axisMax = isTimeAxis ? maxTime : maxDist;

  const toX = (v: number) => padLeft + (v / axisMax) * chartW;
  const toYVel = (v: number) => padTop + chartH - (v / maxVelocity) * chartH;

  const buildPath = (pts: TrajectoryPoint[]) =>
    pts
      .map(
        (pt, i) =>
          `${i === 0 ? 'M' : 'L'} ${toX(isTimeAxis ? pt.time : pt.x).toFixed(1)},${toYVel(
            speedOf(pt)
          ).toFixed(1)}`
      )
      .join(' ');

  const singlePath = useMemo(
    () => (points.length ? buildPath(points) : ''),
    [points, axisMax, maxVelocity, speedUnit, isTimeAxis, chartW, chartH, padLeft, padTop]
  );

  const multiWeightSeries = useMemo(
    () =>
      weightComparisons.map((wc) => {
        const pts = wc.simulation.points;
        const at40 = pts.find((p) => p.x >= 40);
        return {
          ...wc,
          pathD: buildPath(pts),
          energyAt40m: at40?.energyJ ?? 0,
          speedLoss40m: at40?.speedLossPercent ?? 0,
          velocityAt40m: at40 ? (speedUnit === 'fps' ? at40.velocityFps : at40.velocityMs) : 0
        };
      }),
    [weightComparisons, axisMax, maxVelocity, speedUnit, isTimeAxis, chartW, chartH, padLeft, padTop]
  );

  const xTicks = useMemo(() => {
    const candidates = isTimeAxis ? [0.25, 0.5, 1, 2] : [10, 20, 25, 50];
    const step =
      candidates.find((s) => (s / axisMax) * chartW >= 48) ?? candidates[candidates.length - 1];
    const ticks: number[] = [];
    for (let v = 0; v <= axisMax + 1e-9; v += step) ticks.push(Number(v.toFixed(2)));
    return ticks;
  }, [axisMax, chartW, isTimeAxis]);

  const velTicks = useMemo(() => {
    const step = maxVelocity <= 200 ? 25 : maxVelocity <= 400 ? 50 : 100;
    const ticks: number[] = [];
    for (let v = 0; v <= maxVelocity; v += step) ticks.push(v);
    return ticks;
  }, [maxVelocity]);

  const handlePointerMove = (
    e: React.MouseEvent<SVGSVGElement> | React.TouchEvent<SVGSVGElement>
  ) => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0]?.clientX : e.clientX;
    if (clientX === undefined) return;
    const svgX = ((clientX - rect.left) / rect.width) * svgWidth;
    const value = ((svgX - padLeft) / chartW) * axisMax;
    setHoverAxisValue(value >= 0 && value <= axisMax ? value : null);
  };

  const hoverReadouts = useMemo(() => {
    if (hoverAxisValue === null) return null;
    const key: 'x' | 'time' = isTimeAxis ? 'time' : 'x';

    if (viewMode === 'multi_weight') {
      const rows = multiWeightSeries
        .map((s) => {
          const pt = nearestPoint(s.simulation.points, key, hoverAxisValue);
          if (!pt || Math.abs(pt[key] - hoverAxisValue) > axisMax * 0.06) return null;
          return { label: `${s.bbWeightG.toFixed(2)} g`, color: s.color, pt };
        })
        .filter(Boolean) as { label: string; color: string; pt: TrajectoryPoint }[];
      return rows.length ? rows : null;
    }

    const pt = nearestPoint(points, key, hoverAxisValue);
    if (!pt || Math.abs(pt[key] - hoverAxisValue) > axisMax * 0.06) return null;
    return [{ label: `${input.bbWeightG.toFixed(2)} g`, color: '#2fd8a4', pt }];
  }, [hoverAxisValue, viewMode, multiWeightSeries, points, isTimeAxis, axisMax, input.bbWeightG]);

  const hoverX = hoverAxisValue !== null ? toX(hoverAxisValue) : null;

  return (
    <section aria-labelledby="speeddrop-title" className="card p-5">
      {/* Cabecera */}
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3 pb-4 border-b border-line">
        <div className="min-w-0">
          <h2 id="speeddrop-title" className="panel-title">
            Pérdida de velocidad
          </h2>
          <p className="panel-sub mt-0.5">
            Desaceleración aerodinámica y degradación de energía en vuelo
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap shrink-0">
          <SegmentedControl<SpeedUnit>
            ariaLabel="Unidad de velocidad de la gráfica"
            idPrefix="speed-drop-unit"
            value={speedUnit}
            onChange={setSpeedUnit}
            options={[
              { value: 'fps', label: 'FPS' },
              { value: 'ms', label: 'm/s' }
            ]}
          />

          <SegmentedControl<DropViewMode>
            ariaLabel="Modo de visualización"
            idPrefix="view-tab"
            value={viewMode}
            onChange={(v) => {
              setViewMode(v);
              setHoverAxisValue(null);
            }}
            options={[
              { value: 'multi_weight', label: 'Gramajes' },
              { value: 'vs_distance', label: 'Distancia' },
              { value: 'vs_time', label: 'Tiempo' }
            ]}
          />
        </div>
      </div>

      {/* Gráfica */}
      <div ref={containerRef} className="relative mt-4 select-none">
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          width="100%"
          height={svgHeight}
          role="img"
          aria-label={`Velocidad en ${unitLabel} frente a ${
            isTimeAxis ? 'tiempo de vuelo' : 'distancia recorrida'
          }`}
          className="block cursor-crosshair touch-pan-y"
          onMouseMove={handlePointerMove}
          onMouseLeave={() => setHoverAxisValue(null)}
          onTouchStart={handlePointerMove}
          onTouchMove={handlePointerMove}
          onTouchEnd={() => setHoverAxisValue(null)}
        >
          {velTicks.map((v) => (
            <g key={`vel-${v}`}>
              <line
                x1={padLeft}
                y1={toYVel(v)}
                x2={padLeft + chartW}
                y2={toYVel(v)}
                stroke={C.line}
                strokeWidth="1"
              />
              <text
                x={padLeft - 7}
                y={toYVel(v) + 3.5}
                fill={C.ink3}
                fontSize={fontAxis}
                fontFamily="var(--font-mono)"
                textAnchor="end"
              >
                {v}
              </text>
            </g>
          ))}

          {xTicks.map((v) => (
            <g key={`x-${v}`}>
              <line
                x1={toX(v)}
                y1={padTop}
                x2={toX(v)}
                y2={padTop + chartH}
                stroke={C.line}
                strokeWidth="1"
              />
              <text
                x={toX(v)}
                y={padTop + chartH + fontAxis + 6}
                fill={C.ink3}
                fontSize={fontAxis}
                fontFamily="var(--font-mono)"
                textAnchor="middle"
              >
                {v}
              </text>
            </g>
          ))}

          {viewMode !== 'multi_weight' && singlePath && (
            <path
              d={singlePath}
              fill="none"
              stroke={C.accent}
              strokeWidth="2.25"
              strokeLinecap="round"
            />
          )}

          {viewMode === 'multi_weight' &&
            multiWeightSeries.map((mw) => {
              const isCurrent = Math.abs(mw.bbWeightG - input.bbWeightG) < 0.005;
              return (
                <path
                  key={`mw-${mw.bbWeightG}`}
                  d={mw.pathD}
                  fill="none"
                  stroke={mw.color}
                  strokeWidth={isCurrent ? 2.75 : 1.5}
                  strokeLinecap="round"
                  opacity={isCurrent ? 1 : 0.85}
                />
              );
            })}

          {hoverX !== null && (
            <line
              x1={hoverX}
              y1={padTop}
              x2={hoverX}
              y2={padTop + chartH}
              stroke={C.line2}
              strokeWidth="1"
            />
          )}
          {hoverReadouts?.map((r) => (
            <circle
              key={`hp-${r.label}`}
              cx={toX(isTimeAxis ? r.pt.time : r.pt.x)}
              cy={toYVel(speedUnit === 'fps' ? r.pt.velocityFps : r.pt.velocityMs)}
              r="3.5"
              fill={r.color}
              stroke="var(--color-surface)"
              strokeWidth="1.5"
            />
          ))}

          <text x={padLeft - (compact ? 30 : 42)} y={padTop - 8} fill={C.ink3} fontSize={fontAxis}>
            {unitLabel}
          </text>
          <text
            x={padLeft + chartW}
            y={svgHeight - 5}
            fill={C.ink3}
            fontSize={fontAxis}
            textAnchor="end"
          >
            {isTimeAxis ? 'tiempo (s)' : 'distancia (m)'}
          </text>
        </svg>

        {hoverReadouts && (
          <div
            className={`absolute top-1 ${
              hoverX !== null && hoverX > svgWidth / 2 ? 'left-1' : 'right-1'
            } card-inset px-3 py-2 text-xs z-20 pointer-events-none shadow-lg shadow-black/40`}
          >
            <div className="label mb-1.5">
              <span className="num text-ink">
                {isTimeAxis
                  ? `${hoverReadouts[0].pt.time} s`
                  : `${Math.round(hoverReadouts[0].pt.x)} m`}
              </span>
            </div>
            <ul className="space-y-1">
              {hoverReadouts.map((r) => (
                <li key={r.label} className="flex items-center justify-between gap-4">
                  <span className="flex items-center gap-2 text-ink-3">
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: r.color }}
                      aria-hidden="true"
                    />
                    <span className="num">{r.label}</span>
                  </span>
                  <span className="num text-ink font-medium">
                    {Math.round(speedUnit === 'fps' ? r.pt.velocityFps : r.pt.velocityMs)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Comparativa de gramajes */}
      {viewMode === 'multi_weight' && (
        <div className="mt-4 space-y-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <h3 className="label text-ink-2">
              Inercia aerodinámica · {input.muzzleEnergyJ.toFixed(2)} J fijos
            </h3>
            <span className="text-[11px] text-ink-3">Misma potencia en boca</span>
          </div>

          <div className="card-inset grid grid-cols-1 sm:grid-cols-3 xl:grid-cols-5 gap-px bg-line overflow-hidden">
            {multiWeightSeries.map((item) => {
              const isCurrent = Math.abs(item.bbWeightG - input.bbWeightG) < 0.005;
              const vInit = speedUnit === 'fps' ? item.muzzleVelocityFps : item.muzzleVelocityMs;

              return (
                <div
                  key={`card-${item.bbWeightG}`}
                  className={`px-3 py-3 ${isCurrent ? 'bg-surface-3' : 'bg-surface-2'}`}
                >
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: item.color }}
                        aria-hidden="true"
                      />
                      <span className="num text-sm font-semibold text-ink">
                        {item.bbWeightG.toFixed(2)} g
                      </span>
                    </span>
                    {isCurrent && <span className="label text-accent">Actual</span>}
                  </div>

                  <dl className="space-y-1 text-[11px]">
                    {[
                      { k: 'Salida', v: `${Math.round(vInit)} ${unitLabel}` },
                      { k: 'A 40 m', v: `${Math.round(item.velocityAt40m)} ${unitLabel}` },
                      { k: 'Pérdida', v: `${MINUS}${item.speedLoss40m} %` },
                      { k: 'Energía', v: `${item.energyAt40m.toFixed(2)} J` },
                      { k: 'Alcance', v: `${item.simulation.maxRangeM} m` }
                    ].map((row) => (
                      <div key={row.k} className="flex justify-between gap-2">
                        <dt className="text-ink-3">{row.k}</dt>
                        <dd className="num text-ink-2">{row.v}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              );
            })}
          </div>

          <p className="text-xs text-ink-3 leading-relaxed">
            Aunque salgan con menos FPS, las bolas más pesadas tienen más momento lineal (p = m · v)
            y menor relación superficie/masa, así que resisten mejor el frenado del aire y llegan a
            40–50 m con más energía.
          </p>
        </div>
      )}

      {/* Tabla */}
      <div className="mt-5 pt-5 border-t border-line space-y-2.5">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h3 className="label text-ink-2">Pérdida por distancia</h3>
          <span className="num text-[11px] text-ink-3">
            {input.bbWeightG.toFixed(2)} g · {Math.round(input.muzzleVelocityFps)} FPS ·{' '}
            {input.muzzleEnergyJ.toFixed(2)} J
          </span>
        </div>

        <div className="scroll-x rounded-xl border border-line">
          <table className="data-table min-w-[600px]">
            <caption className="sr-only">
              Velocidad, energía y caída de la bola en cada distancia de control
            </caption>
            <thead>
              <tr>
                {['Distancia', 'Tiempo', 'FPS', 'm/s', 'Pérdida', 'Energía', 'Caída'].map((h) => (
                  <th key={h} scope="col">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <th scope="row">0 m</th>
                <td>0.000</td>
                <td className="text-accent">{Math.round(input.muzzleVelocityFps)}</td>
                <td>{input.muzzleVelocityMs.toFixed(1)}</td>
                <td>0.0 %</td>
                <td>{input.muzzleEnergyJ.toFixed(2)}</td>
                <td>{formatCm(-input.sightHeightCm)}</td>
              </tr>

              {simulation.speedDropTable.map((row) => (
                <tr key={`row-${row.distanceM}`}>
                  <th scope="row">{row.distanceM} m</th>
                  <td>{row.timeS.toFixed(3)}</td>
                  <td className="text-ink">{Math.round(row.velocityFps)}</td>
                  <td>{row.velocityMs.toFixed(1)}</td>
                  <td className={row.speedLossPercent > 50 ? 'text-warn' : undefined}>
                    {MINUS}
                    {row.speedLossPercent} %
                  </td>
                  <td>{row.energyJ.toFixed(3)}</td>
                  <td className={Math.abs(row.dropCm) <= 15 ? 'text-accent' : undefined}>
                    {formatCm(row.dropCm)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="sm:hidden text-[11px] text-ink-3">Desliza la tabla para ver más columnas.</p>
      </div>
    </section>
  );
};
