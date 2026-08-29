import React, { useMemo, useState } from 'react';
import { SimulationResult, BallisticInput, TrajectoryPoint } from '../types';
import { RangeSlider } from './ui/RangeSlider';
import { useElementWidth } from './ui/useElementWidth';
import { formatCm } from './ui/format';

interface TrajectoryChartProps {
  simulation: SimulationResult;
  input: BallisticInput;
}

// Tokens del sistema, usados directamente en atributos SVG.
const C = {
  accent: 'var(--color-accent)',
  accent2: 'var(--color-accent-2)',
  ink: 'var(--color-ink)',
  ink2: 'var(--color-ink-2)',
  ink3: 'var(--color-ink-3)',
  line: 'var(--color-line)',
  line2: 'var(--color-line-2)'
};

export const TrajectoryChart: React.FC<TrajectoryChartProps> = ({ simulation, input }) => {
  const { ref: containerRef, width: boxWidth } = useElementWidth<HTMLDivElement>(900);

  const [hoverPoint, setHoverPoint] = useState<TrajectoryPoint | null>(null);
  const [hoverSide, setHoverSide] = useState<'left' | 'right'>('right');
  const [targetDistance, setTargetDistance] = useState<number>(30);
  const [showSightLine, setShowSightLine] = useState<boolean>(true);
  const [showEffectiveCorridor, setShowEffectiveCorridor] = useState<boolean>(true);

  const points = simulation.points;
  const maxRange = simulation.maxRangeM;

  // El viewBox usa píxeles reales del contenedor: 1 unidad SVG = 1 px CSS,
  // así el texto de los ejes conserva su tamaño en móvil.
  const compact = boxWidth < 520;
  const svgWidth = Math.max(240, boxWidth);
  const svgHeight = compact
    ? Math.round(Math.min(320, Math.max(260, svgWidth * 0.85)))
    : Math.round(Math.min(440, Math.max(300, svgWidth * 0.47)));

  const padLeft = compact ? 32 : 46;
  const padRight = compact ? 14 : 28;
  const padTop = compact ? 22 : 26;
  const padBottom = compact ? 34 : 42;
  const fontAxis = compact ? 10 : 11;

  const chartW = svgWidth - padLeft - padRight;
  const chartH = svgHeight - padTop - padBottom;

  const maxX = useMemo(() => Math.ceil(Math.max(40, maxRange * 1.08) / 10) * 10, [maxRange]);
  const maxY = useMemo(
    () => Math.ceil(Math.max(3.0, simulation.apexHeightM * 1.35, input.initialHeightM + 0.8) * 2) / 2,
    [simulation.apexHeightM, input.initialHeightM]
  );
  const minY = -0.3;

  const toSvgX = (xM: number) => padLeft + (xM / maxX) * chartW;
  const toSvgY = (yM: number) => padTop + chartH - ((yM - minY) / (maxY - minY)) * chartH;
  const groundY = toSvgY(0);

  // Recta de mira (lineal): pendiente entre el primer y el último punto.
  const sightSlope = useMemo(() => {
    if (points.length < 2) return 0;
    const p0 = points[0];
    const pEnd = points[points.length - 1];
    return pEnd.x > 0 ? (pEnd.sightLineY - p0.sightLineY) / pEnd.x : 0;
  }, [points]);
  const sightAt = (xM: number) => (points[0]?.sightLineY ?? 0) + sightSlope * xM;

  const trajectoryPathD = useMemo(() => {
    if (points.length === 0) return '';
    return points
      .map((pt, i) => `${i === 0 ? 'M' : 'L'} ${toSvgX(pt.x).toFixed(1)},${toSvgY(pt.y).toFixed(1)}`)
      .join(' ');
  }, [points, maxX, maxY, chartW, chartH, padLeft, padTop]);

  const sightLinePathD = useMemo(() => {
    if (!showSightLine || points.length === 0) return '';
    const endX = points[points.length - 1].x;
    return `M ${toSvgX(0)},${toSvgY(sightAt(0))} L ${toSvgX(endX)},${toSvgY(sightAt(endX))}`;
  }, [points, showSightLine, maxX, maxY, chartW, chartH, padLeft, padTop, sightSlope]);

  // Banda de ±15 cm alrededor de la línea de mira hasta el alcance efectivo.
  const corridorPathD = useMemo(() => {
    if (!showEffectiveCorridor || simulation.effectiveRangeM <= 5) return '';
    const x1 = simulation.effectiveRangeM;
    return [
      `M ${toSvgX(0)},${toSvgY(sightAt(0) + 0.15)}`,
      `L ${toSvgX(x1)},${toSvgY(sightAt(x1) + 0.15)}`,
      `L ${toSvgX(x1)},${toSvgY(sightAt(x1) - 0.15)}`,
      `L ${toSvgX(0)},${toSvgY(sightAt(0) - 0.15)}`,
      'Z'
    ].join(' ');
  }, [
    showEffectiveCorridor,
    simulation.effectiveRangeM,
    maxX,
    maxY,
    chartW,
    chartH,
    padLeft,
    padTop,
    sightSlope
  ]);

  const targetPoint = useMemo(() => {
    if (points.length === 0) return null;
    const clamped = Math.min(targetDistance, maxRange);
    return points.reduce((prev, curr) =>
      Math.abs(curr.x - clamped) < Math.abs(prev.x - clamped) ? curr : prev
    );
  }, [points, targetDistance, maxRange]);

  const xTicks = useMemo(() => {
    const candidates = [5, 10, 20, 25, 50];
    const step = candidates.find((s) => (s / maxX) * chartW >= 52) ?? 50;
    const ticks: number[] = [];
    for (let x = 0; x <= maxX; x += step) ticks.push(x);
    return ticks;
  }, [maxX, chartW]);

  const yTicks = useMemo(() => {
    const step = maxY <= 3 ? 0.5 : 1.0;
    const ticks: number[] = [];
    for (let y = 0; y <= maxY; y += step) ticks.push(Number(y.toFixed(1)));
    return ticks;
  }, [maxY]);

  const handlePointerMove = (
    e: React.MouseEvent<SVGSVGElement> | React.TouchEvent<SVGSVGElement>
  ) => {
    const el = containerRef.current;
    if (!el || points.length === 0) return;
    const rect = el.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0]?.clientX : e.clientX;
    if (clientX === undefined) return;

    const relX = clientX - rect.left;
    setHoverSide(relX > rect.width / 2 ? 'left' : 'right');

    const svgX = (relX / rect.width) * svgWidth;
    const distM = ((svgX - padLeft) / chartW) * maxX;
    if (distM < 0 || distM > maxRange) {
      setHoverPoint(null);
      return;
    }
    setHoverPoint(
      points.reduce((prev, curr) =>
        Math.abs(curr.x - distM) < Math.abs(prev.x - distM) ? curr : prev
      )
    );
  };

  const apexSvgX = toSvgX(simulation.apexDistanceM);
  const apexSvgY = toSvgY(simulation.apexHeightM);
  const apexLabelAbove = apexSvgY - 20 > padTop;
  const apexLabelY = apexLabelAbove ? apexSvgY - 11 : apexSvgY + 19;
  const apexLabelX = Math.min(Math.max(apexSvgX, padLeft + 30), padLeft + chartW - 30);

  const rangeSvgX = toSvgX(maxRange);
  const rangeLabelAnchor: 'middle' | 'end' = rangeSvgX > padLeft + chartW - 30 ? 'end' : 'middle';

  const sliderMax = Math.max(6, Math.min(100, Math.ceil(maxRange)));

  const chartSummary =
    `Trayectoria balística: alcance máximo ${maxRange} metros, ` +
    `ápex de ${simulation.apexHeightM} metros a ${simulation.apexDistanceM} metros, ` +
    `alcance efectivo ${simulation.effectiveRangeM} metros.`;

  return (
    <section aria-labelledby="trajectory-title" className="card p-5">
      {/* Cabecera */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 pb-4 border-b border-line">
        <div className="min-w-0">
          <h2 id="trajectory-title" className="panel-title">
            Trayectoria
          </h2>
          <p className="panel-sub mt-0.5">Altura sobre el suelo frente a distancia recorrida</p>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap shrink-0">
          <button
            id="toggle-sightline-btn"
            type="button"
            onClick={() => setShowSightLine((v) => !v)}
            aria-pressed={showSightLine}
            className="chip chip-ghost"
          >
            Línea de mira
          </button>
          <button
            id="toggle-effective-btn"
            type="button"
            onClick={() => setShowEffectiveCorridor((v) => !v)}
            aria-pressed={showEffectiveCorridor}
            className="chip chip-ghost"
          >
            Zona ±15 cm
          </button>
        </div>
      </div>

      {/* Lienzo */}
      <div ref={containerRef} className="relative mt-4 select-none">
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          width="100%"
          height={svgHeight}
          role="img"
          aria-label={chartSummary}
          className="block cursor-crosshair touch-pan-y"
          onMouseMove={handlePointerMove}
          onMouseLeave={() => setHoverPoint(null)}
          onTouchStart={handlePointerMove}
          onTouchMove={handlePointerMove}
          onTouchEnd={() => setHoverPoint(null)}
        >
          <defs>
            <linearGradient id="trajFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={C.accent} stopOpacity="0.16" />
              <stop offset="100%" stopColor={C.accent} stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Rejilla: filetes sólidos y tenues, sin discontinuos */}
          {xTicks.map((x) => (
            <g key={`x-${x}`}>
              <line
                x1={toSvgX(x)}
                y1={padTop}
                x2={toSvgX(x)}
                y2={padTop + chartH}
                stroke={C.line}
                strokeWidth="1"
              />
              <text
                x={toSvgX(x)}
                y={padTop + chartH + fontAxis + 6}
                fill={C.ink3}
                fontSize={fontAxis}
                fontFamily="var(--font-mono)"
                textAnchor="middle"
              >
                {x}
              </text>
            </g>
          ))}

          {yTicks.map((y) => (
            <g key={`y-${y}`}>
              <line
                x1={padLeft}
                y1={toSvgY(y)}
                x2={padLeft + chartW}
                y2={toSvgY(y)}
                stroke={C.line}
                strokeWidth="1"
              />
              <text
                x={padLeft - 7}
                y={toSvgY(y) + 3.5}
                fill={C.ink3}
                fontSize={fontAxis}
                fontFamily="var(--font-mono)"
                textAnchor="end"
              >
                {y}
              </text>
            </g>
          ))}

          {/* Suelo */}
          <line
            x1={padLeft}
            y1={groundY}
            x2={padLeft + chartW}
            y2={groundY}
            stroke={C.line2}
            strokeWidth="1.5"
          />

          {/* Corredor efectivo */}
          {corridorPathD && <path d={corridorPathD} fill={C.accent} opacity="0.1" />}

          {/* Línea de mira */}
          {sightLinePathD && (
            <path
              d={sightLinePathD}
              fill="none"
              stroke={C.ink3}
              strokeWidth="1"
              strokeDasharray="5,5"
            />
          )}

          {/* Relleno bajo la curva */}
          {trajectoryPathD && (
            <path
              d={`${trajectoryPathD} L ${toSvgX(maxRange)},${groundY} L ${toSvgX(0)},${groundY} Z`}
              fill="url(#trajFill)"
            />
          )}

          {/* Curva balística */}
          {trajectoryPathD && (
            <path
              d={trajectoryPathD}
              fill="none"
              stroke={C.accent}
              strokeWidth="2.25"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Ápex: punto y etiqueta de texto, sin caja de color */}
          {simulation.apexHeightM > input.initialHeightM + 0.02 && (
            <g>
              <circle cx={apexSvgX} cy={apexSvgY} r="3" fill={C.accent2} />
              <text
                x={apexLabelX}
                y={apexLabelY}
                fill={C.ink2}
                fontSize={fontAxis}
                fontFamily="var(--font-mono)"
                textAnchor="middle"
              >
                ápex {simulation.apexHeightM} m
              </text>
            </g>
          )}

          {/* Punto de impacto */}
          <g>
            <circle cx={rangeSvgX} cy={groundY} r="3" fill={C.ink2} />
            <text
              x={rangeSvgX + (rangeLabelAnchor === 'end' ? -6 : 0)}
              y={groundY - 9}
              fill={C.ink2}
              fontSize={fontAxis}
              fontFamily="var(--font-mono)"
              textAnchor={rangeLabelAnchor}
            >
              {maxRange} m
            </text>
          </g>

          {/* Diana seleccionada */}
          {targetPoint && (
            <g>
              <line
                x1={toSvgX(targetPoint.x)}
                y1={toSvgY(targetPoint.y)}
                x2={toSvgX(targetPoint.x)}
                y2={groundY}
                stroke={C.line2}
                strokeWidth="1"
              />
              <circle
                cx={toSvgX(targetPoint.x)}
                cy={toSvgY(targetPoint.y)}
                r="5"
                fill="none"
                stroke={C.accent}
                strokeWidth="2"
              />
            </g>
          )}

          {/* Cursor */}
          {hoverPoint && (
            <g>
              <line
                x1={toSvgX(hoverPoint.x)}
                y1={padTop}
                x2={toSvgX(hoverPoint.x)}
                y2={groundY}
                stroke={C.line2}
                strokeWidth="1"
              />
              <circle
                cx={toSvgX(hoverPoint.x)}
                cy={toSvgY(hoverPoint.y)}
                r="4"
                fill={C.accent}
                stroke="var(--color-surface)"
                strokeWidth="2"
              />
            </g>
          )}

          {/* Rótulos de ejes */}
          <text
            x={padLeft + chartW}
            y={svgHeight - 5}
            fill={C.ink3}
            fontSize={fontAxis}
            textAnchor="end"
          >
            distancia (m)
          </text>
          <text x={padLeft - (compact ? 26 : 40)} y={padTop - 9} fill={C.ink3} fontSize={fontAxis}>
            altura (m)
          </text>
        </svg>

        {/* Lectura bajo el cursor */}
        {hoverPoint && !compact && (
          <div
            className={`absolute top-1 ${hoverSide === 'left' ? 'left-1' : 'right-1'}
                        card-inset px-3 py-2.5 text-xs z-20 pointer-events-none min-w-[190px]
                        shadow-lg shadow-black/40`}
          >
            <div className="label pb-1.5 mb-1.5 border-b border-line">
              <span className="num text-ink">{hoverPoint.x} m</span>
            </div>
            <dl className="space-y-1">
              {[
                ['Altura', `${hoverPoint.y} m`],
                ['Desvío de mira', formatCm(hoverPoint.dropRelativeToSightCm)],
                ['Velocidad', `${Math.round(hoverPoint.velocityFps)} FPS`],
                ['Energía', `${hoverPoint.energyJ} J`],
                ['Tiempo', `${hoverPoint.time} s`]
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between gap-4">
                  <dt className="text-ink-3">{label}</dt>
                  <dd className="num text-ink font-medium">{value}</dd>
                </div>
              ))}
            </dl>
          </div>
        )}

        {hoverPoint && compact && (
          <div className="absolute inset-x-0 bottom-0 bg-surface-2/95 border-t border-line px-3 py-2 z-20 pointer-events-none">
            <dl className="grid grid-cols-3 gap-2 text-center">
              {[
                ['Distancia', `${hoverPoint.x} m`],
                ['Desvío', formatCm(hoverPoint.dropRelativeToSightCm)],
                ['Velocidad', `${Math.round(hoverPoint.velocityFps)} FPS`]
              ].map(([label, value]) => (
                <div key={label}>
                  <dt className="label">{label}</dt>
                  <dd className="num text-[11px] text-ink font-medium mt-0.5">{value}</dd>
                </div>
              ))}
            </dl>
          </div>
        )}
      </div>

      {/* Leyenda */}
      <ul className="flex flex-wrap items-center gap-x-5 gap-y-2 mt-3 text-[11px] text-ink-3">
        <li className="flex items-center gap-2">
          <span className="w-4 h-0.5 rounded bg-accent" aria-hidden="true" />
          Trayectoria
        </li>
        {showSightLine && (
          <li className="flex items-center gap-2">
            <span
              className="w-4 border-t border-dashed border-ink-3"
              aria-hidden="true"
            />
            Línea de mira
          </li>
        )}
        {showEffectiveCorridor && (
          <li className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-sm bg-accent/20" aria-hidden="true" />
            Zona efectiva
          </li>
        )}
        <li className="flex items-center gap-2">
          <span
            className="w-3 h-3 rounded-full border-2 border-accent"
            aria-hidden="true"
          />
          Diana
        </li>
      </ul>

      {/* Inspector de diana */}
      <div className="mt-5 pt-5 border-t border-line space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <label htmlFor="target-distance-slider" className="label text-ink-2">
            Inspector de diana
          </label>
          <span className="num text-sm font-semibold text-accent">
            {Math.min(targetDistance, sliderMax)} <span className="unit">m</span>
          </span>
        </div>

        <RangeSlider
          id="target-distance-slider"
          min={5}
          max={sliderMax}
          step={1}
          value={Math.min(targetDistance, sliderMax)}
          onChange={setTargetDistance}
          valueText={`Diana a ${Math.min(targetDistance, sliderMax)} metros`}
        />

        {targetPoint && (
          <dl className="card-inset grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-px bg-line overflow-hidden">
            {[
              { label: 'Tiempo', value: `${targetPoint.time} s` },
              { label: 'Velocidad', value: `${Math.round(targetPoint.velocityFps)} FPS` },
              { label: 'Pérdida', value: `−${targetPoint.speedLossPercent} %` },
              { label: 'Energía', value: `${targetPoint.energyJ} J` },
              {
                label: 'Desvío',
                value: formatCm(targetPoint.dropRelativeToSightCm),
                tone:
                  Math.abs(targetPoint.dropRelativeToSightCm) <= 15 ? 'text-accent' : 'text-warn'
              }
            ].map((item) => (
              <div key={item.label} className="bg-surface-2 px-3 py-2.5">
                <dt className="label">{item.label}</dt>
                <dd className={`num text-sm font-semibold mt-1 ${item.tone ?? 'text-ink'}`}>
                  {item.value}
                </dd>
              </div>
            ))}
          </dl>
        )}
      </div>
    </section>
  );
};
