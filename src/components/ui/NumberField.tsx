import React from 'react';

interface NumberFieldProps {
  id: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  /** Se llama solo con valores válidos ya recortados al rango. */
  onCommit: (value: number) => void;
  /** Unidad mostrada a la derecha (g, m, cm, FPS...). */
  suffix?: string;
  ariaLabel: string;
  /** Ancho del input (clase Tailwind). */
  inputWidthClassName?: string;
  decimals?: number;
  className?: string;
}

/**
 * Campo numérico que permite escribir libremente ("0.", "-", campo vacío)
 * sin que el valor salte a un valor por defecto en cada pulsación.
 * El recorte al rango se aplica al confirmar (blur o Enter).
 */
export const NumberField: React.FC<NumberFieldProps> = ({
  id,
  value,
  min,
  max,
  step = 1,
  onCommit,
  suffix,
  ariaLabel,
  inputWidthClassName = 'w-14',
  decimals,
  className = ''
}) => {
  const format = React.useCallback(
    (v: number) => (decimals === undefined ? String(v) : v.toFixed(decimals)),
    [decimals]
  );

  const [draft, setDraft] = React.useState<string>(() => format(value));
  const [editing, setEditing] = React.useState(false);

  // Mientras no se está escribiendo, el campo refleja el estado externo.
  React.useEffect(() => {
    if (!editing) setDraft(format(value));
  }, [value, editing, format]);

  const handleChange = (raw: string) => {
    setDraft(raw);
    const parsed = parseFloat(raw);
    // Solo propaga si el texto ya es un número completo dentro de rango.
    if (Number.isFinite(parsed) && parsed >= min && parsed <= max) {
      onCommit(parsed);
    }
  };

  const commit = () => {
    setEditing(false);
    const parsed = parseFloat(draft);
    if (!Number.isFinite(parsed)) {
      setDraft(format(value));
      return;
    }
    const next = Math.min(max, Math.max(min, parsed));
    onCommit(next);
    setDraft(format(next));
  };

  return (
    <div className={`field ${className}`}>
      <input
        id={id}
        type="number"
        inputMode="decimal"
        step={step}
        min={min}
        max={max}
        value={draft}
        aria-label={ariaLabel}
        onFocus={(e) => {
          setEditing(true);
          e.currentTarget.select();
        }}
        onChange={(e) => handleChange(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') e.currentTarget.blur();
        }}
        className={inputWidthClassName}
      />
      {suffix && <span className="unit shrink-0">{suffix}</span>}
    </div>
  );
};
