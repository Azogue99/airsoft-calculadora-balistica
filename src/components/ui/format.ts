/** Signo menos tipográfico (U+2212) para que las cifras negativas se alineen. */
export const MINUS = '\u2212';

/** Formatea una desviación en cm con signo explícito y guion tipográfico. */
export function formatCm(cm: number): string {
  if (cm > 0) return `+${cm} cm`;
  if (cm < 0) return `${MINUS}${Math.abs(cm)} cm`;
  return '0 cm';
}
