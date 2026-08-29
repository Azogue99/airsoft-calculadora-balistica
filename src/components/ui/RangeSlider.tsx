import React from 'react';

interface RangeSliderProps {
  id: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  /** Etiqueta accesible cuando el control no tiene <label> asociado. */
  ariaLabel?: string;
  /** Texto legible del valor actual para lectores de pantalla. */
  valueText?: string;
  className?: string;
}

/**
 * Slider con pista y pulgar visibles (los nativos con `appearance:none`
 * quedan invisibles en Chromium) y 24px de área táctil.
 * Todos usan el mismo acento: el color no distingue controles.
 */
export const RangeSlider: React.FC<RangeSliderProps> = ({
  id,
  value,
  min,
  max,
  step,
  onChange,
  ariaLabel,
  valueText,
  className = ''
}) => {
  const span = max - min;
  const clamped = Math.min(max, Math.max(min, value));
  const pct = span > 0 ? ((clamped - min) / span) * 100 : 0;

  return (
    <input
      id={id}
      type="range"
      min={min}
      max={max}
      step={step}
      value={clamped}
      onChange={(e) => onChange(parseFloat(e.target.value))}
      aria-label={ariaLabel}
      aria-valuetext={valueText}
      className={`rng ${className}`}
      style={{ '--rng-fill': `${pct}%` } as React.CSSProperties}
    />
  );
};
