/**
 * Tableau des invités : colonnes classiques + nb personnes (éditable) + présence par sous-événement.
 * Mode « tous les invités » ou filtré par un sous-événement. Export Excel / PDF.
 */

import React, { useState, useCallback } from 'react';
import type { Event, Guest, SubEvent } from '@/core/types';
import { exportGuestsToExcel, exportGuestsToPdf } from '@/utils/exportGuests';

const STATUS_LABELS: Record<Guest['status'], string> = {
  pending: 'En attente',
  confirmed: 'Confirmé',
  declined: 'Décliné'
};

function getGuestCount(g: Guest): number {
  return Math.max(1, Math.min(99, g.guestCount ?? 1));
}

function getAttendance(g: Guest, subEventId: string): number {
  const n = g.attendance?.[subEventId];
  if (n === undefined || n === null) return 0;
  return Math.max(0, Math.min(getGuestCount(g), Number(n)));
}

interface GuestsTableProps {
  event: Event;
  /** Si défini, n’afficher que les invités liés à ce sous-événement. */
  filterSubEventId?: string | null;
  canManage: boolean;
  onUpdate: (updated: Event) => void;
}

export const GuestsTable: React.FC<GuestsTableProps> = ({
  event,
  filterSubEventId,
  canManage,
  onUpdate
}) => {
  const [exporting, setExporting] = useState<'excel' | 'pdf' | null>(null);

  const subEvents = event.subEvents || [];
  const allGuests = event.guests || [];
  const guests = filterSubEventId
    ? allGuests.filter((g) => g.linkedSubEventIds.includes(filterSubEventId))
    : allGuests;
  const currentSub = filterSubEventId
    ? subEvents.find((s) => s.id === filterSubEventId)
    : null;

  const updateGuest = useCallback(
    (guestId: string, patch: Partial<Guest>) => {
      const updated = {
        ...event,
        guests: event.guests?.map((g) => (g.id === guestId ? { ...g, ...patch } : g)) ?? []
      };
      onUpdate(updated);
    },
    [event, onUpdate]
  );

  const setGuestCount = useCallback(
    (g: Guest, value: number) => {
      const n = Math.max(1, Math.min(99, value));
      updateGuest(g.id, { guestCount: n });
    },
    [updateGuest]
  );

  const setAttendance = useCallback(
    (g: Guest, subEventId: string, value: number) => {
      const max = getGuestCount(g);
      const n = Math.max(0, Math.min(max, value));
      updateGuest(g.id, {
        attendance: { ...(g.attendance || {}), [subEventId]: n }
      });
    },
    [updateGuest]
  );

  const handleExportExcel = useCallback(async () => {
    setExporting('excel');
    try {
      await exportGuestsToExcel(event);
    } finally {
      setExporting(null);
    }
  }, [event]);

  const handleExportPdf = useCallback(async () => {
    setExporting('pdf');
    try {
      await exportGuestsToPdf(event);
    } finally {
      setExporting(null);
    }
  }, [event]);

  const columnsForSubEvents = filterSubEventId ? [] : subEvents;

  return (
    <div className="flex flex-col h-full min-h-0 rounded-xl border border-slate-200 bg-white overflow-hidden">
      {/* En-tête : titre + export */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 border-b border-slate-200 bg-slate-50/50">
        <h2 className="text-lg font-semibold text-slate-900">
          {currentSub ? `Invités · ${currentSub.title || 'Séquence'}` : 'Tous les invités'}
        </h2>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExportExcel}
            disabled={!!exporting || guests.length === 0}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 text-sm font-medium hover:bg-slate-50 disabled:opacity-50"
          >
            {exporting === 'excel' ? (
              <span className="animate-pulse">Export…</span>
            ) : (
              <>
                <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                Excel
              </>
            )}
          </button>
          <button
            type="button"
            onClick={handleExportPdf}
            disabled={!!exporting || guests.length === 0}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 text-sm font-medium hover:bg-slate-50 disabled:opacity-50"
          >
            {exporting === 'pdf' ? (
              <span className="animate-pulse">Export…</span>
            ) : (
              <>
                <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                PDF
              </>
            )}
          </button>
        </div>
      </div>

      {/* Tableau scrollable */}
      <div className="flex-1 overflow-auto min-h-0">
        {guests.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-sm">
            {filterSubEventId ? 'Aucun invité pour cette séquence.' : 'Aucun invité. Ajoutez-en depuis le Programme (sélectionnez une séquence) ou importez des contacts.'}
          </div>
        ) : (
          <table className="w-full text-left text-sm border-collapse">
            <thead className="sticky top-0 bg-slate-100 border-b border-slate-200 z-10">
              <tr>
                <th className="px-3 py-3 font-semibold text-slate-700 whitespace-nowrap">Prénom</th>
                <th className="px-3 py-3 font-semibold text-slate-700 whitespace-nowrap">Nom</th>
                <th className="px-3 py-3 font-semibold text-slate-700 whitespace-nowrap hidden sm:table-cell">Email</th>
                <th className="px-3 py-3 font-semibold text-slate-700 whitespace-nowrap hidden md:table-cell">Tél</th>
                <th className="px-3 py-3 font-semibold text-slate-700 whitespace-nowrap">Statut</th>
                <th className="px-3 py-3 font-semibold text-slate-700 whitespace-nowrap text-center" title="Nombre de personnes par invitation">Nb pers.</th>
                {filterSubEventId ? (
                  <th className="px-3 py-3 font-semibold text-slate-700 whitespace-nowrap text-center">Présents</th>
                ) : (
                  columnsForSubEvents.map((s) => (
                    <th key={s.id} className="px-2 py-3 font-semibold text-slate-600 text-center whitespace-nowrap max-w-[80px]" title={s.title}>
                      <span className="truncate block">{s.title?.slice(0, 12) || '—'}</span>
                    </th>
                  ))
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {guests.map((g) => {
                const count = getGuestCount(g);
                return (
                  <tr key={g.id} className="hover:bg-slate-50/50">
                    <td className="px-3 py-2.5 font-medium text-slate-900">{g.firstName}</td>
                    <td className="px-3 py-2.5 text-slate-800">{g.lastName}</td>
                    <td className="px-3 py-2.5 text-slate-600 hidden sm:table-cell truncate max-w-[180px]">{g.email || '—'}</td>
                    <td className="px-3 py-2.5 text-slate-600 hidden md:table-cell">{g.phone || '—'}</td>
                    <td className="px-3 py-2.5">
                      <span className={`inline-flex px-2 py-0.5 rounded-md text-xs font-medium ${
                        g.status === 'confirmed' ? 'bg-emerald-100 text-emerald-800' :
                        g.status === 'declined' ? 'bg-red-100 text-red-800' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {STATUS_LABELS[g.status]}
                      </span>
                    </td>
                    <td className="px-2 py-2.5 text-center">
                      {canManage ? (
                        <input
                          type="number"
                          min={1}
                          max={99}
                          value={count}
                          onChange={(e) => setGuestCount(g, e.target.value === '' ? 1 : parseInt(e.target.value, 10))}
                          className="w-12 text-center rounded-lg border border-slate-200 px-1 py-1 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                          title="Nombre de personnes (ex. couple + enfants)"
                        />
                      ) : (
                        <span className="text-slate-700">{count}</span>
                      )}
                    </td>
                    {filterSubEventId ? (
                      <td className="px-2 py-2.5 text-center">
                        {canManage ? (
                          <input
                            type="number"
                            min={0}
                            max={count}
                            value={getAttendance(g, filterSubEventId)}
                            onChange={(e) => setAttendance(g, filterSubEventId, e.target.value === '' ? 0 : parseInt(e.target.value, 10))}
                            className="w-12 text-center rounded-lg border border-slate-200 px-1 py-1 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                            title="Nombre de personnes présentes"
                          />
                        ) : (
                          <span className="text-slate-700">{getAttendance(g, filterSubEventId)}</span>
                        )}
                      </td>
                    ) : (
                      columnsForSubEvents.map((s) => {
                        const present = getAttendance(g, s.id);
                        const isLinked = g.linkedSubEventIds.includes(s.id);
                        return (
                          <td key={s.id} className="px-2 py-2.5 text-center">
                            {!isLinked ? (
                              <span className="text-slate-300">—</span>
                            ) : canManage ? (
                              <input
                                type="number"
                                min={0}
                                max={count}
                                value={present}
                                onChange={(e) => setAttendance(g, s.id, e.target.value === '' ? 0 : parseInt(e.target.value, 10))}
                                className="w-10 text-center rounded-lg border border-slate-200 px-1 py-1 text-xs focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                                title={`Présents · ${s.title}`}
                              />
                            ) : (
                              <span className="text-slate-700">{present}</span>
                            )}
                          </td>
                        );
                      })
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
