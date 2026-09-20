import React, { useEffect, useEffectEvent, useRef } from "react";

interface InfiniteScrollSentinelProps {
  // Se llama cada vez que el centinela entra en pantalla (o cerca, según margen).
  onVisible: () => void;
  // Mientras sea true no observa: no hay más páginas o ya hay una carga en curso.
  disabled?: boolean;
  // Cuánto antes de llegar al final empezar a cargar, en px (margen del viewport).
  margenPx?: number;
  className?: string;
}

// Elemento invisible que se coloca al final de una lista: cuando el usuario
// hace scroll hasta verlo, avisa para pedir la siguiente página.
export const InfiniteScrollSentinel: React.FC<InfiniteScrollSentinelProps> = ({
  onVisible,
  disabled = false,
  margenPx = 400,
  className = "",
}) => {
  const ref = useRef<HTMLDivElement>(null);
  // Siempre la última versión de onVisible sin que el observer tenga que
  // recrearse cada vez que el padre re-renderiza.
  const alHacerseVisible = useEffectEvent(onVisible);

  useEffect(() => {
    const el = ref.current;
    if (disabled || !el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) alHacerseVisible();
      },
      { rootMargin: `${margenPx}px 0px` }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [disabled, margenPx]);

  return <div ref={ref} aria-hidden="true" className={`h-px w-full ${className}`} />;
};
