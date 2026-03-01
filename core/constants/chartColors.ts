/** Palette de couleurs pour les camemberts (séquences / frais globaux). */
export const CHART_PALETTE = [
  '#0d9488', '#14b8a6', '#2dd4bf', '#5eead4', '#99f6e4',
  '#64748b', '#94a3b8', '#cbd5e1', '#f59e0b', '#f97316',
  '#ea580c', '#dc2626', '#7c3aed', '#4f46e5', '#2563eb'
];

/** Assombrir une couleur hex (pour dérivés). */
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const m = hex.replace(/^#/, '').match(/^([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
  if (!m) return null;
  return { r: parseInt(m[1], 16), g: parseInt(m[2], 16), b: parseInt(m[3], 16) };
}

function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map((x) => Math.round(Math.max(0, Math.min(255, x))).toString(16).padStart(2, '0')).join('');
}

/** Mélange linéaire entre deux couleurs (t=0 → c1, t=1 → c2). */
function mixHex(c1: string, c2: string, t: number): string {
  const r1 = hexToRgb(c1);
  const r2 = hexToRgb(c2);
  if (!r1 || !r2) return c1;
  return rgbToHex(
    r1.r + (r2.r - r1.r) * t,
    r1.g + (r2.g - r1.g) * t,
    r1.b + (r2.b - r1.b) * t
  );
}

/** Retourne n dérivés d'une couleur (plus clair → base → plus foncé). */
export function deriveShades(hex: string, n: number): string[] {
  if (n <= 0) return [];
  if (n === 1) return [hex];
  const out: string[] = [];
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    const mixed = t <= 0.5 ? mixHex(hex, '#ffffff', (0.5 - t) * 2 * 0.6) : mixHex(hex, '#1e293b', (t - 0.5) * 2 * 0.5);
    out.push(mixed);
  }
  return out;
}

/** Couleur par défaut pour "Non alloué". */
export const UNALLOCATED_COLOR = '#e2e8f0';
