import React from "react";

interface BandejaProps {
  id?: string;
  // Clases extra para el contenido (p. ej. "flex flex-col gap-6").
  className?: string;
  children: React.ReactNode;
}

// La bandeja de papel del kit: el contenido de una sección va dentro para
// leerse sobre la escena. La dibuja cada página, debajo de su HojaSeccion;
// el chat (que ya es un panel) y el hero de Inicio van sin ella.
export const Bandeja: React.FC<BandejaProps> = ({ id, className = "", children }) => (
  <div id={id} className={`bandeja-kit ${className}`}>
    {children}
  </div>
);
