/**
 * Camembert (donut) SVG pour afficher des segments (ex. répartition budget).
 */
import React from 'react';

export interface PieSegment {
  label: string;
  value: number;
  color: string;
}

const DEFAULT_COLORS = [
  '#0d9488', '#14b8a6', '#2dd4bf', '#5eead4', '#99f6e4',
  '#64748b', '#94a3b8', '#cbd5e1', '#f59e0b', '#f97316'
];

interface BudgetPieChartProps {
  segments: PieSegment[];
  total: number;
  size?: number;
  strokeWidth?: number;
  className?: string;
  /** Couleurs par défaut si segment.color non fourni */
  colors?: string[];
}

export const BudgetPieChart: React.FC<BudgetPieChartProps> = ({
  segments,
  total,
  size = 200,
  strokeWidth = 24,
  className = '',
  colors = DEFAULT_COLORS
}) => {
  const radius = (size - strokeWidth) / 2;
  const cx = size / 2;
  const cy = size / 2;
  let acc = 0;
  const normalized = total > 0
    ? segments.filter((s) => s.value > 0).map((s, i) => ({
        ...s,
        color: s.color || colors[i % colors.length],
        start: acc,
        ratio: s.value / total,
        end: (acc += s.value / total)
      }))
    : [];

  return (
    <div className={className}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="mx-auto">
        {normalized.length === 0 ? (
          <circle cx={cx} cy={cy} r={radius} fill="#f1f5f9" stroke="#e2e8f0" strokeWidth={strokeWidth} />
        ) : (
          normalized.map((seg, i) => {
            const startAngle = seg.start * 2 * Math.PI - Math.PI / 2;
            const endAngle = seg.end * 2 * Math.PI - Math.PI / 2;
            const x1 = cx + radius * Math.cos(startAngle);
            const y1 = cy + radius * Math.sin(startAngle);
            const x2 = cx + radius * Math.cos(endAngle);
            const y2 = cy + radius * Math.sin(endAngle);
            const large = seg.ratio > 0.5 ? 1 : 0;
            const d = `M ${x1} ${y1} A ${radius} ${radius} 0 ${large} 1 ${x2} ${y2}`;
            return (
              <path
                key={seg.label + i}
                d={d}
                fill="none"
                stroke={seg.color}
                strokeWidth={strokeWidth}
                strokeLinecap="round"
              />
            );
          })
        )}
      </svg>
    </div>
  );
};
