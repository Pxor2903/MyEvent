/**
 * Modal fiche invité : affichage et édition (propriétaire ou admin qui a ajouté).
 */
import React, { useState, useEffect } from 'react';
import type { Event, Guest, SubGuest } from '@/core/types';
import { canEditGuest, QUALIFIER_LABELS, QUALIFIER_OPTIONS, formatQualifierLabel } from '@/core/constants/guests';
import { Input } from './Input';

const STATUS_OPTIONS: { value: Guest['status']; label: string }[] = [
  { value: 'pending', label: 'En attente' },
  { value: 'confirmed', label: 'Confirmé' },
  { value: 'declined', label: 'Décliné' }
];

interface GuestDetailModalProps {
  guest: Guest;
  event: Event;
  currentUserId: string;
  onSave: (updated: Event) => void;
  onClose: () => void;
}

export const GuestDetailModal: React.FC<GuestDetailModalProps> = ({
  guest: initialGuest,
  event,
  currentUserId,
  onSave,
  onClose
}) => {
  const guestFromEvent = event.guests?.find((g) => g.id === initialGuest.id) ?? initialGuest;
  const canEdit = canEditGuest(guestFromEvent, currentUserId, event);
  const [form, setForm] = useState({
    firstName: guestFromEvent.firstName,
    lastName: guestFromEvent.lastName,
    email: guestFromEvent.email ?? '',
    phone: guestFromEvent.phone ?? '',
    status: guestFromEvent.status,
    guestCount: guestFromEvent.guestCount ?? 1,
    adultsCount: guestFromEvent.adultsCount ?? 1,
    childrenCount: guestFromEvent.childrenCount ?? 0,
    qualifiers: guestFromEvent.qualifiers ?? [],
    subGuests: (guestFromEvent.subGuests ?? []) as SubGuest[]
  });
  const [customQualifierInput, setCustomQualifierInput] = useState('');

  useEffect(() => {
    setForm({
      firstName: guestFromEvent.firstName,
      lastName: guestFromEvent.lastName,
      email: guestFromEvent.email ?? '',
      phone: guestFromEvent.phone ?? '',
      status: guestFromEvent.status,
      guestCount: guestFromEvent.guestCount ?? 1,
      adultsCount: guestFromEvent.adultsCount ?? 1,
      childrenCount: guestFromEvent.childrenCount ?? 0,
      qualifiers: guestFromEvent.qualifiers ?? [],
      subGuests: (guestFromEvent.subGuests ?? []) as SubGuest[]
    });
  }, [guestFromEvent.id]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit) return;
    const updatedGuests = (event.guests ?? []).map((g) =>
      g.id === guestFromEvent.id
        ? {
            ...g,
            firstName: form.firstName.trim(),
            lastName: form.lastName.trim(),
            email: form.email.trim() || g.email,
            phone: form.phone.trim() || undefined,
            status: form.status,
            guestCount: Math.max(1, Math.min(99, form.guestCount)),
            adultsCount: form.adultsCount,
            childrenCount: form.childrenCount,
            qualifiers: form.qualifiers.length ? form.qualifiers : undefined,
            subGuests: form.subGuests.length ? form.subGuests : undefined
          }
        : g
    );
    onSave({ ...event, guests: updatedGuests });
    onClose();
  };

  const toggleQualifier = (key: string) => {
    if (!canEdit) return;
    setForm((prev) => ({
      ...prev,
      qualifiers: prev.qualifiers.includes(key) ? prev.qualifiers.filter((q) => q !== key) : [...prev.qualifiers, key]
    }));
  };

  const addCustomQualifier = () => {
    const label = customQualifierInput.trim();
    if (!label || !canEdit) return;
    if (form.qualifiers.includes(label)) return;
    setForm((prev) => ({ ...prev, qualifiers: [...prev.qualifiers, label] }));
    setCustomQualifierInput('');
  };

  const removeQualifier = (q: string) => {
    if (!canEdit) return;
    setForm((prev) => ({ ...prev, qualifiers: prev.qualifiers.filter((x) => x !== q) }));
  };

  const updateSubGuest = (index: number, patch: Partial<SubGuest>) => {
    if (!canEdit) return;
    setForm((prev) => ({
      ...prev,
      subGuests: prev.subGuests.map((s, i) => (i === index ? { ...s, ...patch } : s))
    }));
  };

  const addSubGuest = (type: 'adult' | 'child') => {
    if (!canEdit) return;
    setForm((prev) => ({ ...prev, subGuests: [...prev.subGuests, { type }] }));
  };

  const removeSubGuest = (index: number) => {
    if (!canEdit) return;
    setForm((prev) => ({ ...prev, subGuests: prev.subGuests.filter((_, i) => i !== index) }));
  };

  return (
    <div className="fixed inset-0 z-[280] flex items-end sm:items-center justify-center p-0 sm:p-4 md:p-6 bg-gray-900/80 backdrop-blur-xl">
      <div className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl shadow-xl max-h-[90vh] overflow-hidden flex flex-col pb-[env(safe-area-inset-bottom)]">
        <div className="p-4 sm:p-5 border-b border-slate-200 shrink-0 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-900">Fiche invité</h3>
          <button type="button" onClick={onClose} className="p-2 rounded-lg text-slate-400 hover:bg-slate-100" aria-label="Fermer">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input label="Prénom" value={form.firstName} onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))} disabled={!canEdit} />
            <Input label="Nom" value={form.lastName} onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))} disabled={!canEdit} />
            <Input label="Email" type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} disabled={!canEdit} className="sm:col-span-2" />
            <Input label="Téléphone" type="tel" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} disabled={!canEdit} className="sm:col-span-2" />
          </div>

          {canEdit ? (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Statut</label>
              <select
                value={form.status}
                onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as Guest['status'] }))}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              >
                {STATUS_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
          ) : (
            <p className="text-sm text-slate-600"><span className="font-medium">Statut :</span> {STATUS_OPTIONS.find((o) => o.value === form.status)?.label}</p>
          )}

          <div className="grid grid-cols-2 gap-3">
            <Input label="Nb personnes (total)" type="number" min={1} max={99} value={String(form.guestCount)} onChange={(e) => setForm((f) => ({ ...f, guestCount: parseInt(e.target.value, 10) || 1 }))} disabled={!canEdit} />
            <div className="space-y-1">
              <label className="block text-sm font-medium text-slate-700">Adultes / Enfants</label>
              <div className="flex gap-2">
                <input type="number" min={0} max={99} value={form.adultsCount} onChange={(e) => setForm((f) => ({ ...f, adultsCount: parseInt(e.target.value, 10) || 0 }))} disabled={!canEdit} className="w-14 rounded-lg border border-slate-200 px-2 py-1.5 text-sm" />
                <span className="self-center text-slate-400">/</span>
                <input type="number" min={0} max={99} value={form.childrenCount} onChange={(e) => setForm((f) => ({ ...f, childrenCount: parseInt(e.target.value, 10) || 0 }))} disabled={!canEdit} className="w-14 rounded-lg border border-slate-200 px-2 py-1.5 text-sm" />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Qualificatifs (cartons d'invitation)</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {QUALIFIER_OPTIONS.map((key) => (
                <label key={key} className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm cursor-pointer ${form.qualifiers.includes(key) ? 'border-teal-500 bg-teal-50 text-teal-800' : 'border-slate-200 bg-white text-slate-600'}`}>
                  <input type="checkbox" checked={form.qualifiers.includes(key)} onChange={() => toggleQualifier(key)} disabled={!canEdit} className="rounded border-slate-300 text-teal-600" />
                  {QUALIFIER_LABELS[key]}
                </label>
              ))}
            </div>
            <p className="text-xs text-slate-500 mb-1">Autre : saisir un libellé puis ajouter.</p>
            <div className="flex gap-2 flex-wrap items-center">
              <input
                type="text"
                value={customQualifierInput}
                onChange={(e) => setCustomQualifierInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCustomQualifier())}
                placeholder="Ex : Parrain, Témoin…"
                disabled={!canEdit}
                className="flex-1 min-w-[120px] rounded-lg border border-slate-200 px-3 py-1.5 text-sm"
              />
              <button type="button" onClick={addCustomQualifier} disabled={!canEdit || !customQualifierInput.trim()} className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700 text-sm hover:bg-slate-50 disabled:opacity-50">Ajouter</button>
            </div>
            {form.qualifiers.filter((q) => !QUALIFIER_OPTIONS.includes(q)).length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {form.qualifiers.filter((q) => !QUALIFIER_OPTIONS.includes(q)).map((q) => (
                  <span key={q} className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-slate-100 text-slate-700 text-xs">
                    {formatQualifierLabel(q)}
                    {canEdit && <button type="button" onClick={() => removeQualifier(q)} className="text-slate-400 hover:text-red-600" aria-label="Retirer">×</button>}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-slate-700">Sous-invités (prénom, âge)</label>
              {canEdit && (
                <div className="flex gap-1">
                  <button type="button" onClick={() => addSubGuest('adult')} className="text-xs px-2 py-1 rounded border border-slate-200 text-slate-600 hover:bg-slate-50">+ Adulte</button>
                  <button type="button" onClick={() => addSubGuest('child')} className="text-xs px-2 py-1 rounded border border-slate-200 text-slate-600 hover:bg-slate-50">+ Enfant</button>
                </div>
              )}
            </div>
            {form.subGuests.length === 0 && <p className="text-xs text-slate-500">Aucun détail saisi.</p>}
            {form.subGuests.map((s, i) => (
              <div key={i} className="flex gap-2 items-center mb-2">
                <span className="text-xs text-slate-500 w-14">{s.type === 'adult' ? 'Adulte' : 'Enfant'}</span>
                <input placeholder="Prénom" value={s.firstName ?? ''} onChange={(e) => updateSubGuest(i, { firstName: e.target.value || undefined })} disabled={!canEdit} className="flex-1 rounded-lg border border-slate-200 px-2 py-1.5 text-sm" />
                <input type="number" placeholder="Âge" min={0} max={120} value={s.age ?? ''} onChange={(e) => updateSubGuest(i, { age: e.target.value === '' ? undefined : parseInt(e.target.value, 10) })} disabled={!canEdit} className="w-16 rounded-lg border border-slate-200 px-2 py-1.5 text-sm" />
                {canEdit && <button type="button" onClick={() => removeSubGuest(i)} className="p-1 text-slate-400 hover:text-red-600">×</button>}
              </div>
            ))}
          </div>

          <div className="flex gap-3 pt-2 border-t border-slate-200">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 text-slate-600 text-sm font-medium rounded-xl border border-slate-200">Fermer</button>
            {canEdit && (
              <button type="submit" className="flex-1 py-2.5 bg-teal-600 text-white text-sm font-medium rounded-xl hover:bg-teal-700">Enregistrer</button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};
