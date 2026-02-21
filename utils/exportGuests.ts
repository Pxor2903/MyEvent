/**
 * Export de la liste d’invités en Excel (xlsx) ou PDF.
 */

import type { Event, Guest, SubEvent } from '@/core/types';

function getGuestCount(g: Guest): number {
  return Math.max(1, Math.min(99, g.guestCount ?? 1));
}

function getAttendance(g: Guest, subEventId: string): number {
  const n = g.attendance?.[subEventId];
  if (n === undefined || n === null) return 0;
  return Math.max(0, Math.min(getGuestCount(g), Number(n)));
}

/** Construit les lignes pour export (tous invités + colonnes par sous-événement). */
export function buildExportRows(event: Event): { headers: string[]; rows: (string | number)[][] } {
  const subEvents = event.subEvents || [];
  const guests = event.guests || [];
  const headers = [
    'Prénom',
    'Nom',
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
    return [
      g.firstName,
      g.lastName,
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
  const { utils, writeFile } = await import('xlsx');
  const { headers, rows } = buildExportRows(event);
  const ws = utils.aoa_to_sheet([headers, ...rows]);
  const wb = utils.book_new();
  utils.book_append_sheet(wb, ws, 'Invités');
  const name = filename || `invites-${event.title.replace(/[^a-z0-9]/gi, '-').slice(0, 30)}.xlsx`;
  writeFile(wb, name);
}

export async function exportGuestsToPdf(event: Event, filename?: string): Promise<void> {
  const { jsPDF } = await import('jspdf');
  const { autoTable } = await import('jspdf-autotable');
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
    headStyles: { fillColor: [99, 102, 241] },
    margin: { left: 14 }
  });
  const name = filename || `invites-${event.title.replace(/[^a-z0-9]/gi, '-').slice(0, 30)}.pdf`;
  doc.save(name);
}
