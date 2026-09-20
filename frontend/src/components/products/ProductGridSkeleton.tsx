import React from "react";

interface ProductGridSkeletonProps {
  cantidad?: number;
  className?: string;
}

// Placeholders animados con la misma grilla que las tarjetas de producto,
// para la carga inicial y para la carga de páginas adicionales (scroll infinito).
export const ProductGridSkeleton: React.FC<ProductGridSkeletonProps> = ({
  cantidad = 4,
  className = "",
}) => (
  <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 ${className}`}>
    {Array.from({ length: cantidad }, (_, i) => (
      <div
        key={i}
        className="h-[320px] rounded-xl bg-surface-container-low animate-pulse border border-outline-variant/20"
      />
    ))}
  </div>
);
