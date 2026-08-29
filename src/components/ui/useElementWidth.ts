import { useCallback, useLayoutEffect, useRef, useState } from 'react';

/**
 * Ancho interior en píxeles del contenedor.
 * Las gráficas SVG lo usan como ancho del viewBox para que
 * 1 unidad SVG = 1 píxel CSS: así el texto de los ejes conserva su tamaño
 * en móvil en lugar de encogerse a 3-4px.
 */
export function useElementWidth<T extends HTMLElement>(fallback = 900) {
  const ref = useRef<T | null>(null);
  const [width, setWidth] = useState(fallback);

  const measure = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    // clientWidth excluye bordes, igual que ResizeObserver.contentRect.
    const w = el.clientWidth;
    if (w > 0) setWidth((prev) => (Math.abs(prev - w) >= 1 ? w : prev));
  }, []);

  useLayoutEffect(() => {
    measure();

    // ResizeObserver cubre los cambios de layout que no vienen del viewport
    // (abrir un panel, cambiar de pestaña...).
    let ro: ResizeObserver | undefined;
    if (typeof ResizeObserver !== 'undefined' && ref.current) {
      ro = new ResizeObserver(measure);
      ro.observe(ref.current);
    }

    // Respaldo para entornos donde ResizeObserver no entrega notificaciones.
    window.addEventListener('resize', measure);
    window.addEventListener('orientationchange', measure);

    return () => {
      ro?.disconnect();
      window.removeEventListener('resize', measure);
      window.removeEventListener('orientationchange', measure);
    };
  }, [measure]);

  return { ref, width };
}
