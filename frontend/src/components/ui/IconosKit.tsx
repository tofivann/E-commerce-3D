import React from "react";

// Iconos de marca del kit "rooftop atelier" (MimiMMDArt-v5-FIXED/assets/icons),
// como SVG inline para que tomen el color del texto (currentColor). Los demás
// iconos de la app siguen siendo Material Symbols.

interface IconoProps {
  className?: string;
}

const base = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.7,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

// La conejita del logo.
export const IconoConejo: React.FC<IconoProps> = ({ className }) => (
  <svg {...base} className={className}>
    <path d="M7 12C1-2 10-3 10 11M14 11c0-14 9-13 3 1" />
    <ellipse cx="12" cy="16" rx="9" ry="7" />
    <path d="M8 15h.01M16 15h.01m-6 3 2 1 2-1" />
  </svg>
);

// El corazón de la postal del menú (y la expresión "feliz" de Mimi).
export const IconoCorazon: React.FC<IconoProps> = ({ className }) => (
  <svg {...base} className={className}>
    <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z" />
  </svg>
);

// Los cuatro restantes son los botones de expresión de Mimi (ControlesEscena).
export const IconoSonrisa: React.FC<IconoProps> = ({ className }) => (
  <svg {...base} className={className}>
    <circle cx="12" cy="12" r="10" />
    <path d="M8 9h.01M16 9h.01M7 14q5 6 10 0" />
  </svg>
);

export const IconoMas: React.FC<IconoProps> = ({ className }) => (
  <svg {...base} className={className}>
    <path d="M12 4v16M4 12h16" />
  </svg>
);

export const IconoLuna: React.FC<IconoProps> = ({ className }) => (
  <svg {...base} className={className}>
    <path d="M21 14A9 9 0 0 1 10 3a9 9 0 1 0 11 11Z" />
  </svg>
);

export const IconoEstrella: React.FC<IconoProps> = ({ className }) => (
  <svg {...base} className={className}>
    <path d="m12 2 3 6 7 1-5 5 1 8-6-4-6 4 1-8-5-5 7-1Z" />
  </svg>
);
