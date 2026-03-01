/**
 * Camembert (donut) SVG avec tooltip au survol et clic optionnel (desktop).
 */
import React, { useState, useCallback, useRef } from 'react';

export interface PieSegment {
  label: string;
  value: number;
  color: string;
  /** Id du sous-événement si le segment vient d'une séquence (pour navigation au clic). */
  subEventId?: string;
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
  colors?: string[];
  /** Format montant pour le tooltip (ex. "1 000 €"). */
  formatValue?: (value: number) => string;
  /** Clic sur un segment (desktop). Si segment.subEventId, navigation vers budget de la séquence. */
  onSegmentClick?: (segment: PieSegment) => void;
  /** Afficher tooltip et permettre le clic (true sur desktop, false sur mobile si liste en dessous). */
  interactive?: boolean;
}

export const BudgetPieChart: React.FC<BudgetPieChartProps> = ({
  segments,
  total,
  size = 200,
  strokeWidth = 24,
  className = '',
  colors = DEFAULT_COLORS,
  formatValue = (v) => v.toLocaleString('fr-FR'),
  onSegmentClick,
  interactive = true
}) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

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

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<SVGElement>, i: number) => {
      if (!interactive) return;
      setHoveredIndex(i);
      if (containerRef.current) {
        const r = containerRef.current.getBoundingClientRect();
        setTooltipPos({ x: e.clientX - r.left, y: e.clientY - r.top });
      }
    },
    [interactive]
  );

  const handleMouseLeave = useCallback(() => setHoveredIndex(null), []);

  return (
    <div ref={containerRef} className={`${className} relative`}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="mx-auto"
        onMouseLeave={handleMouseLeave}
      >
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
            const isHovered = hoveredIndex === i;
            const clickable = interactive && onSegmentClick && seg.subEventId;
            return (
              <path
                key={seg.label + String(seg.subEventId ?? '') + i}
                d={d}
                fill="none"
                stroke={seg.color}
                strokeWidth={strokeWidth}
                strokeLinecap="round"
                opacity={isHovered ? 1 : 0.95}
                style={{ cursor: clickable ? 'pointer' : 'default' }}
                title={interactive ? `${seg.label}: ${formatValue(seg.value)}` : undefined}
                onMouseMove={(e) => handleMouseMove(e, i)}
                onClick={() => clickable && onSegmentClick(seg)}
              />
            );
          })
        )}
      </svg>
      {interactive && hoveredIndex !== null && normalized[hoveredIndex] && (
        <div
          className="absolute z-10 px-2 py-1.5 rounded-lg shadow-lg bg-slate-800 text-white text-xs whitespace-nowrap pointer-events-none"
          style={{
            left: tooltipPos.x + 12,
            top: tooltipPos.y + 8,
            transform: 'translateY(-50%)'
          }}
        >
          {normalized[hoveredIndex].label}: {formatValue(normalized[hoveredIndex].value)}
        </div>
      )}
    </div>
  );
};
