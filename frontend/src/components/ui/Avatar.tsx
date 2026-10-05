import React, { useState } from "react";

type Tamano = "sm" | "md" | "lg";

interface AvatarProps {
  // Dirección de la foto; sin ella (o si no carga) se muestra la inicial.
  foto?: string | null;
  nombre?: string | null;
  tamano?: Tamano;
  className?: string;
}

const TAMANOS: Record<Tamano, string> = {
  sm: "w-9 h-9 text-sm",
  md: "w-12 h-12 text-lg",
  lg: "w-28 h-28 text-4xl",
};

// Foto de perfil redonda, o la inicial del nombre si el usuario no tiene
// foto. Único sitio donde se define: lo usan la cabecera, "Mi perfil" y el
// chat del admin.
export const Avatar: React.FC<AvatarProps> = ({ foto, nombre, tamano = "sm", className = "" }) => {
  // Dirección que falló al cargar (archivo borrado, sin red...): se cae a la
  // inicial. Se guarda la dirección y no un booleano para que una foto nueva
  // vuelva a intentarse sola, sin efectos.
  const [fotoRota, setFotoRota] = useState<string | null>(null);
  const base = `${TAMANOS[tamano]} rounded-full shrink-0 overflow-hidden border border-outline-variant/40 ${className}`;

  if (foto && foto !== fotoRota) {
    return (
      <img
        src={foto}
        alt={nombre || ""}
        onError={() => setFotoRota(foto)}
        className={`${base} object-cover bg-surface-container-lowest`}
      />
    );
  }
  return (
    <span
      aria-hidden={!nombre}
      className={`${base} bg-surface-variant text-on-surface-variant font-semibold uppercase flex items-center justify-center select-none`}
    >
      {(nombre || "?").trim().charAt(0) || "?"}
    </span>
  );
};
