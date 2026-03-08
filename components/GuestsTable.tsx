/**
 * Tableau des invités : colonnes classiques + nb personnes (éditable) + présence par sous-événement.
 * Mise à jour immédiate en local, sauvegarde débrayée côté parent. Export Excel / PDF. Suppression d’invités.
 */

import React, { useState, useCallback } from 'react';
import type { Event, Guest } from '@/core/types';
import { canEditGuest, formatQualifierLabel } from '@/core/constants/guests';
import { exportGuestsToExcel, exportGuestsToPdf } from '@/utils/exportGuests';

const STATUS_LABELS: Record<Guest['status'], string> = {
  pending: 'En attente',
  confirmed: 'Confirmé',
  declined: 'Décliné'
};

function getGuestCount(g: Guest): number {
  return Math.max(1, Math.min(99, g.guestCount ?? 1));
}

/** Nombre de « présents » pour une séquence : lié à la réponse d’invitation (décliné = 0, confirmé = nombre de personnes). */
function getAttendance(g: Guest, subEventId: string): number {
  const n = g.attendance?.[subEventId];
  if (n !== undefined && n !== null) return Math.max(0, Math.min(getGuestCount(g), Number(n)));
  // Anciennes réponses sans attendance : dérivé du statut (décliné → 0, confirmé → guestCount)
  if (g.status === 'declined') return 0;
  if (g.status === 'confirmed' && g.linkedSubEventIds?.includes(subEventId)) return getGuestCount(g);
  return 0;
}

type LocalOverrides = Record<string, { guestCount?: number; attendance?: Record<string, number> }>;

function mergeOverrides(event: Event, overrides: LocalOverrides): Event {
  return {
    ...event,
    guests: (event.guests ?? []).map((g) => {
      const o = overrides[g.id];
      if (!o) return g;
      return {
        ...g,
        ...(o.guestCount != null && { guestCount: o.guestCount }),
        ...(o.attendance && { attendance: { ...(g.attendance || {}), ...o.attendance } })
      };
    })
  };
}

interface GuestsTableProps {
  event: Event;
  filterSubEventId?: string | null;
  /** Filtre par responsable : n'afficher que les invités ajoutés par cet userId (null = vue d'ensemble). */
  filterAddedByUserId?: string | null;
  canManage: boolean;
  /** Id de l'utilisateur connecté (pour droits par invité). */
  currentUserId: string;
  onUpdate: (updated: Event) => void;
  onGuestClick?: (guest: Guest) => void;
}

export const GuestsTable: React.FC<GuestsTableProps> = ({
  event,
  filterSubEventId,
  filterAddedByUserId,
  canManage,
  currentUserId,
  onUpdate,
  onGuestClick
}) => {
  const [exporting, setExporting] = useState<'excel' | 'pdf' | null>(null);
  const [localOverrides, setLocalOverrides] = useState<LocalOverrides>({});
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const subEvents = event.subEvents || [];
  const allGuests = event.guests || [];
  let guests = filterSubEventId
    ? allGuests.filter((g) => g.linkedSubEventIds.includes(filterSubEventId))
    : allGuests;
  if (filterAddedByUserId != null) {
    guests = guests.filter((g) => (g.addedByUserId ?? event.creatorId) === filterAddedByUserId);
  }
  guests = [...guests].sort((a, b) => {
    const ln = (a.lastName || '').localeCompare(b.lastName || '', 'fr');
    if (ln !== 0) return ln;
    return (a.firstName || '').localeCompare(b.firstName || '', 'fr');
  });
  const currentSub = filterSubEventId
    ? subEvents.find((s) => s.id === filterSubEventId)
    : null;

  const effectiveGuestCount = useCallback((g: Guest) => {
    const o = localOverrides[g.id]?.guestCount;
    if (o !== undefined) return Math.max(1, Math.min(99, o));
    return getGuestCount(g);
  }, [localOverrides]);

  const effectiveAttendance = useCallback((g: Guest, subEventId: string) => {
    const o = localOverrides[g.id]?.attendance?.[subEventId];
    if (o !== undefined) return Math.max(0, o);
    return getAttendance(g, subEventId);
  }, [localOverrides]);

  const applyAndNotify = useCallback((nextOverrides: LocalOverrides) => {
    setLocalOverrides(nextOverrides);
    onUpdate(mergeOverrides(event, nextOverrides));
  }, [event, onUpdate]);

  const updateGuest = useCallback(
    (guestId: string, patch: Partial<Guest>) => {
      const g = allGuests.find((x) => x.id === guestId);
      if (!g) return;
      const next: LocalOverrides = { ...localOverrides };
      if (!next[guestId]) next[guestId] = {};
      if (patch.guestCount != null) next[guestId].guestCount = patch.guestCount;
      if (patch.attendance) next[guestId].attendance = { ...(next[guestId].attendance ?? g.attendance ?? {}), ...patch.attendance };
      applyAndNotify(next);
    },
    [event, allGuests, localOverrides, applyAndNotify]
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
      const max = effectiveGuestCount(g);
      const n = Math.max(0, Math.min(max, value));
      updateGuest(g.id, {
        attendance: { ...(g.attendance || {}), [subEventId]: n }
      });
    },
    [updateGuest, effectiveGuestCount]
  );

  const handleDeleteGuest = useCallback(
    (g: Guest) => {
      if (!canManage || !canEditGuest(g, currentUserId, event)) return;
      const linkedSubs = subEvents.filter((s) => g.linkedSubEventIds.includes(s.id));
      const subsText = linkedSubs.length
        ? '\n\nIl/elle sera aussi retiré(e) des séquences :\n- ' +
          linkedSubs.map((s) => s.title || 'Séquence sans titre').join('\n- ')
        : '';
      const message = `Supprimer ${g.firstName} ${g.lastName} de l'événement ?${subsText}`;
      if (!window.confirm(message)) return;
      setDeletingId(g.id);
      const nextGuests = (event.guests ?? []).filter((x) => x.id !== g.id);
      const nextOverrides = { ...localOverrides };
      delete nextOverrides[g.id];
      setLocalOverrides(nextOverrides);
      onUpdate({ ...event, guests: nextGuests });
      setDeletingId(null);
    },
    [canManage, currentUserId, event, localOverrides, onUpdate, subEvents]
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

  const isGlobalView = filterSubEventId == null;
  const columnsForSubEvents = filterSubEventId ? [] : subEvents;

  // Scinder : en attente de réponse vs réponses reçues (confirmé ou décliné)
  const guestsPending = guests.filter((g) => g.status === 'pending');
  const guestsResponded = guests.filter((g) => g.status !== 'pending');

  const effectiveAttendanceForRow = (g: Guest, subEventId: string) => {
    const max = effectiveGuestCount(g);
    const raw = effectiveAttendance(g, subEventId);
    return Math.min(raw, max);
  };

  const renderGuestCard = (g: Guest) => {
    const canEditThis = canEditGuest(g, currentUserId, event);
    return (
      <li key={g.id} className="py-3 px-2">
        <div
          role={onGuestClick ? 'button' : undefined}
          tabIndex={onGuestClick ? 0 : undefined}
          onClick={onGuestClick ? () => onGuestClick(g) : undefined}
          onKeyDown={onGuestClick ? (e) => e.key === 'Enter' && onGuestClick(g) : undefined}
          className={`w-full text-left rounded-xl p-3 border border-slate-100 bg-slate-50/50 flex flex-col gap-1 ${onGuestClick ? 'hover:bg-slate-50 hover:border-slate-200 active:bg-slate-100 min-h-[44px] cursor-pointer' : ''}`}
        >
          <span className="font-medium text-slate-900">
            {g.firstName} {g.lastName}
          </span>
          {g.email && <span className="text-xs text-slate-500 truncate">{g.email}</span>}
          {!g.email && g.phone && <span className="text-xs text-slate-500">{g.phone}</span>}
          <span className={`inline-flex self-start mt-1 px-2 py-0.5 rounded-md text-xs font-medium ${
            g.status === 'confirmed' ? 'bg-emerald-100 text-emerald-800' :
            g.status === 'declined' ? 'bg-red-100 text-red-800' : 'bg-slate-100 text-slate-600'
          }`}>
            {STATUS_LABELS[g.status]}
          </span>
          {isGlobalView && (
            <span className="text-xs text-slate-500 mt-0.5">Nb personnes : {effectiveGuestCount(g)}</span>
          )}
          {!isGlobalView && filterSubEventId && (
            <span className="text-xs text-slate-500 mt-0.5">
              Présents : {effectiveAttendanceForRow(g, filterSubEventId)} / {effectiveGuestCount(g)}
            </span>
          )}
        </div>
        {canManage && (
          <div className="mt-2 flex justify-end">
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); handleDeleteGuest(g); }}
              disabled={deletingId === g.id}
              className="touch-target p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 text-xs font-medium"
              aria-label="Supprimer"
            >
              Supprimer
            </button>
          </div>
        )}
      </li>
    );
  };

  const renderTableRow = (g: Guest) => {
    const count = effectiveGuestCount(g);
    const canEditThis = canEditGuest(g, currentUserId, event);
    return (
      <tr key={g.id} className="hover:bg-slate-50/50">
        <td className="px-2 py-2.5 text-slate-600 text-xs max-w-[140px]">
          {(g.qualifiers && g.qualifiers.length > 0)
            ? g.qualifiers.map((q) => formatQualifierLabel(q)).join(', ')
            : '—'}
        </td>
        <td className="px-3 py-2.5 font-medium text-slate-900">
          {onGuestClick ? (
            <button type="button" onClick={() => onGuestClick(g)} className="text-left hover:text-teal-600 underline decoration-teal-200 hover:decoration-teal-500">
              {g.lastName}
            </button>
          ) : (
            g.lastName
          )}
        </td>
        <td className="px-3 py-2.5 text-slate-800">
          {onGuestClick ? (
            <button type="button" onClick={() => onGuestClick(g)} className="text-left hover:text-teal-600 underline decoration-teal-200 hover:decoration-teal-500">
              {g.firstName}
            </button>
          ) : (
            g.firstName
          )}
        </td>
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
        {isGlobalView && (
          <td className="px-3 py-2.5 text-center text-slate-700">
            {canEditThis ? (
              <input
                type="number"
                min={1}
                max={99}
                value={count}
                onChange={(e) => setGuestCount(g, e.target.value === '' ? 1 : parseInt(e.target.value, 10))}
                className="w-12 text-center rounded-lg border border-slate-200 px-1 py-1 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                title="Nombre de personnes"
              />
            ) : (
              <span>{count}</span>
            )}
          </td>
        )}
        {!isGlobalView && (filterSubEventId ? (
          <td className="px-2 py-2.5 text-center">
            {canEditThis ? (
              <input
                type="number"
                min={0}
                max={count}
                value={effectiveAttendanceForRow(g, filterSubEventId)}
                onChange={(e) => setAttendance(g, filterSubEventId, e.target.value === '' ? 0 : parseInt(e.target.value, 10))}
                className="w-12 text-center rounded-lg border border-slate-200 px-1 py-1 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                title="Nombre de personnes présentes"
              />
            ) : (
              <span className="text-slate-700">{effectiveAttendanceForRow(g, filterSubEventId)}</span>
            )}
          </td>
        ) : (
          columnsForSubEvents.map((s) => {
            const present = effectiveAttendanceForRow(g, s.id);
            const isLinked = g.linkedSubEventIds.includes(s.id);
            return (
              <td key={s.id} className="px-2 py-2.5 text-center">
                {!isLinked ? (
                  <span className="text-slate-300">—</span>
                ) : canEditThis ? (
                  <input
                    type="number"
                    min={0}
                    max={count}
                    value={present}
                    onChange={(e) => setAttendance(g, s.id, e.target.value === '' ? 0 : parseInt(e.target.value, 10))}
                    className="w-10 text-center rounded-lg border border-slate-200 px-1 py-1 text-xs focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                    title={`Présents · ${s.title}`}
                  />
                ) : (
                  <span className="text-slate-700">{present}</span>
                )}
              </td>
            );
          })
        ))}
        {canManage && (
          <td className="px-2 py-2.5 text-center">
            <button
              type="button"
              onClick={() => handleDeleteGuest(g)}
              disabled={deletingId === g.id || !canEditThis}
              className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Supprimer l’invité"
              aria-label="Supprimer"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
            </button>
          </td>
        )}
      </tr>
    );
  };

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

      {/* Contenu : vide / cartes mobile / tableau desktop */}
      <div className="flex-1 overflow-auto min-h-0 min-w-0">
        {guests.length === 0 ? (
          <div className="p-8 sm:p-12 text-center text-slate-500 text-sm">
            {filterSubEventId ? 'Aucun invité pour cette séquence.' : 'Aucun invité. Ajoutez-en depuis le Programme (sélectionnez une séquence) ou importez des contacts.'}
          </div>
        ) : (
          <>
            {/* Vue cartes — mobile uniquement (scindée en deux blocs) */}
            <div className="md:hidden p-3 space-y-6">
              {guestsPending.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 px-2 pb-2">
                    En attente de réponse ({guestsPending.length})
                  </h3>
                  <ul className="divide-y divide-slate-100 space-y-0">
                    {guestsPending.map((g) => renderGuestCard(g))}
                  </ul>
                </div>
              )}
              {guestsResponded.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 px-2 pb-2">
                    Réponses reçues ({guestsResponded.length})
                  </h3>
                  <ul className="divide-y divide-slate-100 space-y-0">
                    {guestsResponded.map((g) => renderGuestCard(g))}
                  </ul>
                </div>
              )}
            </div>

            {/* Tableau — desktop */}
            <table className="hidden md:table w-full text-left text-sm border-collapse">
            <thead className="sticky top-0 bg-slate-100 border-b border-slate-200 z-10">
              <tr>
                <th className="px-2 py-3 font-semibold text-slate-700 whitespace-nowrap max-w-[140px]">Étiquettes</th>
                <th className="px-3 py-3 font-semibold text-slate-700 whitespace-nowrap">Nom</th>
                <th className="px-3 py-3 font-semibold text-slate-700 whitespace-nowrap">Prénom</th>
                <th className="px-3 py-3 font-semibold text-slate-700 whitespace-nowrap hidden sm:table-cell">Email</th>
                <th className="px-3 py-3 font-semibold text-slate-700 whitespace-nowrap hidden md:table-cell">Tél</th>
                <th className="px-3 py-3 font-semibold text-slate-700 whitespace-nowrap">Statut</th>
                {isGlobalView && <th className="px-3 py-3 font-semibold text-slate-700 whitespace-nowrap text-center">Nb personnes</th>}
                {!isGlobalView && (filterSubEventId ? (
                  <th className="px-3 py-3 font-semibold text-slate-700 whitespace-nowrap text-center">Présents</th>
                ) : (
                  columnsForSubEvents.map((s) => (
                    <th key={s.id} className="px-2 py-3 font-semibold text-slate-600 text-center whitespace-nowrap max-w-[80px]" title={s.title}>
                      <span className="truncate block">{s.title?.slice(0, 12) || '—'}</span>
                    </th>
                  ))
                ))}
                {canManage && <th className="px-2 py-3 font-semibold text-slate-600 text-center w-12" aria-label="Supprimer" />}
              </tr>
            </thead>
            {/* En attente de réponse */}
            {guestsPending.length > 0 && (
              <tbody className="divide-y divide-slate-100">
                <tr className="bg-slate-50/80">
                  <td colSpan={100} className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    En attente de réponse ({guestsPending.length})
                  </td>
                </tr>
                {guestsPending.map((g) => renderTableRow(g))}
              </tbody>
            )}
            {/* Réponses reçues */}
            {guestsResponded.length > 0 && (
              <tbody className="divide-y divide-slate-100">
                <tr className="bg-slate-50/80">
                  <td colSpan={100} className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Réponses reçues ({guestsResponded.length})
                  </td>
                </tr>
                {guestsResponded.map((g) => renderTableRow(g))}
              </tbody>
            )}
            </table>
          </>
        )}
      </div>
    </div>
  );
};
