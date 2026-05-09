/**
 * Export de la liste d’invités en Excel (exceljs) ou PDF.
 */

import type { Event, Guest } from '@/core/types';
import { formatQualifierLabel } from '@/core/constants/guests';

function getGuestCount(g: Guest): number {
  return Math.max(1, Math.min(99, g.guestCount ?? 1));
}

function getAttendance(g: Guest, subEventId: string): number {
  const n = g.attendance?.[subEventId];
  if (n === undefined || n === null) return 0;
  return Math.max(0, Math.min(getGuestCount(g), Number(n)));
}

/** Construit les lignes pour export (tous invités triés par nom, colonne Étiquettes). */
export function buildExportRows(event: Event): { headers: string[]; rows: (string | number)[][] } {
  const subEvents = event.subEvents || [];
  const guests = [...(event.guests || [])].sort((a, b) => {
    const ln = (a.lastName || '').localeCompare(b.lastName || '', 'fr');
    if (ln !== 0) return ln;
    return (a.firstName || '').localeCompare(b.firstName || '', 'fr');
  });
  const headers = [
    'Nom',
    'Prénom',
    'Étiquettes',
    'Email',
    'Téléphone',
    'Statut',
    'Nb personnes',
    ...subEvents.map((s) => `${s.title || 'Séquence'} (présents)`),
    'Total présents'
  ];
  const rows = guests.map((g) => {
    const totalPresent = subEvents.reduce(
      (sum, s) => sum + getAttendance(g, s.id),
      0
    );
    const etiquettes = (g.qualifiers && g.qualifiers.length > 0)
      ? g.qualifiers.map((q) => formatQualifierLabel(q)).join(', ')
      : '';
    return [
      g.lastName,
      g.firstName,
      etiquettes,
      g.email || '',
      g.phone || '',
      g.status,
      getGuestCount(g),
      ...subEvents.map((s) => getAttendance(g, s.id)),
      totalPresent
    ];
  });
  return { headers, rows };
}

export async function exportGuestsToExcel(event: Event, filename?: string): Promise<void> {
  const { default: ExcelJS } = await import('exceljs');
  const { headers, rows } = buildExportRows(event);
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Invités');
  sheet.addRow(headers);
  sheet.addRows(rows);

  // Rend l'entête plus lisible dans le fichier exporté.
  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true };

  const name = filename || `invites-${event.title.replace(/[^a-z0-9]/gi, '-').slice(0, 30)}.xlsx`;
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function exportGuestsToPdf(event: Event, filename?: string): Promise<void> {
  const { default: jsPDF } = await import('jspdf');
  const { default: autoTable } = await import('jspdf-autotable');
  const { headers, rows } = buildExportRows(event);
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  doc.setFontSize(14);
  doc.text(event.title, 14, 12);
  doc.setFontSize(10);
  doc.text('Liste des invités', 14, 18);
  autoTable(doc, {
    head: [headers],
    body: rows.map((r) => r.map(String)),
    startY: 22,
    styles: { fontSize: 8 },
    headStyles: { fillColor: [13, 148, 136] },
    margin: { left: 14 }
  });
  const name = filename || `invites-${event.title.replace(/[^a-z0-9]/gi, '-').slice(0, 30)}.pdf`;
  doc.save(name);
}
