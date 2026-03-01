/**
 * Sélecteur de couleur par pastilles (palette ou dérivés).
 */
import React from 'react';
import { CHART_PALETTE, deriveShades } from '@/core/constants/chartColors';

interface ColorSwatchPickerProps {
  value?: string;
  onChange: (hex: string) => void;
  /** Si fourni, afficher seulement les dérivés de cette couleur au lieu de la palette. */
  baseColor?: string;
  /** Nombre de dérivés si baseColor fourni. */
  shadeCount?: number;
  className?: string;
}

export const ColorSwatchPicker: React.FC<ColorSwatchPickerProps> = ({
  value,
  onChange,
  baseColor,
  shadeCount = 5,
  className = ''
}) => {
  const colors = baseColor ? deriveShades(baseColor, shadeCount) : CHART_PALETTE;
  return (
    <div className={`flex flex-wrap gap-1.5 ${className}`}>
      {colors.map((hex) => (
        <button
          key={hex}
          type="button"
          onClick={() => onChange(hex)}
          className={`w-6 h-6 rounded-full border-2 transition-transform hover:scale-110 ${
            value === hex ? 'border-slate-800 ring-2 ring-offset-1 ring-slate-400' : 'border-slate-200'
          }`}
          style={{ backgroundColor: hex }}
          title={hex}
        />
      ))}
    </div>
  );
};
