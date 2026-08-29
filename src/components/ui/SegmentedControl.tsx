import React from 'react';

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
  /** Etiqueta compacta para pantallas pequeñas. */
  shortLabel?: string;
  icon?: React.ReactNode;
  title?: string;
}

interface SegmentedControlProps<T extends string> {
  value: T;
  options: SegmentOption<T>[];
  onChange: (value: T) => void;
  ariaLabel: string;
  idPrefix?: string;
  className?: string;
}

/**
 * Grupo de botones mutuamente excluyentes con semántica de radiogroup.
 * El estado activo lo pinta el CSS mediante `aria-checked`.
 */
export function SegmentedControl<T extends string>({
  value,
  options,
  onChange,
  ariaLabel,
  idPrefix,
  className = ''
}: SegmentedControlProps<T>) {
  const move = (dir: 1 | -1) => {
    const i = options.findIndex((o) => o.value === value);
    const next = options[(i + dir + options.length) % options.length];
    if (next) onChange(next.value);
  };

  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={`seg ${className}`}
      onKeyDown={(e) => {
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
          e.preventDefault();
          move(1);
        } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
          e.preventDefault();
          move(-1);
        }
      }}
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            id={idPrefix ? `${idPrefix}-${opt.value}` : undefined}
            type="button"
            role="radio"
            aria-checked={active}
            tabIndex={active ? 0 : -1}
            title={opt.title}
            onClick={() => onChange(opt.value)}
            className="seg-item"
          >
            {opt.icon}
            {opt.shortLabel ? (
              <>
                <span className="hidden sm:inline">{opt.label}</span>
                <span className="sm:hidden">{opt.shortLabel}</span>
              </>
            ) : (
              <span>{opt.label}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
