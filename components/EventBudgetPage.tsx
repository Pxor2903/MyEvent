/**
 * Page Budget de l'événement : total, devise, camembert, frais globaux, dispatch par sous-événement.
 */
import React, { useState, useEffect } from 'react';
import type { Event, SubEvent, BudgetAllocation } from '@/core/types';
import { BudgetPieChart, type PieSegment } from './BudgetPieChart';
import { CURRENCIES, getCurrencySymbol } from '@/core/constants/currencies';
import { CHART_PALETTE, UNALLOCATED_COLOR } from '@/core/constants/chartColors';
import { Input } from './Input';
import { ColorSwatchPicker } from './ColorSwatchPicker';

interface EventBudgetPageProps {
  event: Event;
  canEdit: boolean;
  onUpdate: (updated: Event) => void;
  onSaveBudget: (amount: number, currency: string, subEventBudgets: Record<string, number>) => Promise<void>;
  onSaveGlobalAllocations?: (allocations: BudgetAllocation[]) => Promise<void>;
  onBack?: () => void;
  /** Desktop: clic sur un segment du camembert → aller au budget de la séquence. */
  onNavigateToSubEventBudget?: (subEventId: string) => void;
}

export const EventBudgetPage: React.FC<EventBudgetPageProps> = ({
  event,
  canEdit,
  onUpdate,
  onSaveBudget,
  onSaveGlobalAllocations,
  onBack,
  onNavigateToSubEventBudget
}) => {
  const budget = event.budget ?? 0;
  const currency = event.currency ?? 'EUR';
  const symbol = getCurrencySymbol(currency);
  const subEventBudgets = event.subEventBudgets ?? {};
  const subEvents = event.subEvents ?? [];

  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [adjustAmount, setAdjustAmount] = useState(String(budget));
  const [adjustCurrency, setAdjustCurrency] = useState(currency);
  const [localDispatch, setLocalDispatch] = useState<Record<string, number>>(subEventBudgets);
  const [localGlobalAllocations, setLocalGlobalAllocations] = useState<BudgetAllocation[]>(event.globalBudgetAllocations ?? []);
  const [saving, setSaving] = useState(false);
  const [globalEditId, setGlobalEditId] = useState<string | null>(null);
  const [newGlobalLabel, setNewGlobalLabel] = useState('');
  const [newGlobalAmount, setNewGlobalAmount] = useState('');
  const [newGlobalColor, setNewGlobalColor] = useState<string>(CHART_PALETTE[0]);
  const [editGlobalColor, setEditGlobalColor] = useState<string>(CHART_PALETTE[0]);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    setLocalDispatch(event.subEventBudgets ?? {});
  }, [event.subEventBudgets]);

  useEffect(() => {
    setLocalGlobalAllocations(event.globalBudgetAllocations ?? []);
  }, [event.globalBudgetAllocations]);

  const totalGlobal = localGlobalAllocations.reduce((sum: number, b: BudgetAllocation) => sum + b.amount, 0 as number);
  const totalSequences = Object.values(localDispatch).reduce((sum: number, v: number) => sum + v, 0 as number);
  const totalAllocated = totalGlobal + totalSequences;
  const unallocated = Math.max(0, budget - totalAllocated);

  // Un segment par allocation (frais globaux + chaque poste des séquences) pour couleurs et clic
  const totalInPostes =
    localGlobalAllocations.reduce((s, a) => s + a.amount, 0) +
    subEvents.reduce((s, sub) => s + (sub.budgetAllocations ?? []).reduce((t, a) => t + a.amount, 0), 0);
  const unallocatedPostes = Math.max(0, budget - totalInPostes);
  let colorIndex = 0;
  const pieSegments: PieSegment[] = [
    ...localGlobalAllocations.filter((a) => a.amount > 0).map((a) => ({
      label: (a.label || 'Sans nom').trim(),
      value: a.amount,
      color: a.color || CHART_PALETTE[colorIndex++ % CHART_PALETTE.length]
    })),
    ...subEvents.flatMap((sub) =>
      (sub.budgetAllocations ?? [])
        .filter((a) => a.amount > 0)
        .map((a) => ({
          label: (a.label || 'Sans nom').trim(),
          value: a.amount,
          color: a.color || sub.color || CHART_PALETTE[colorIndex++ % CHART_PALETTE.length],
          subEventId: sub.id
        }))
    ),
    ...(unallocatedPostes > 0 ? [{ label: 'Non alloué', value: unallocatedPostes, color: UNALLOCATED_COLOR }] : [])
  ];

  const handleSaveAdjust = async () => {
    const amount = parseFloat(adjustAmount) || 0;
    setSaving(true);
    try {
      await onSaveBudget(amount, adjustCurrency, localDispatch);
      setShowAdjustModal(false);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveDispatch = async () => {
    setSaving(true);
    try {
      await onSaveBudget(budget, currency, localDispatch);
      onUpdate({ ...event, subEventBudgets: localDispatch });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveGlobalAllocations = async (allocations: BudgetAllocation[]) => {
    if (!onSaveGlobalAllocations) return;
    const previous = localGlobalAllocations;
    setLocalGlobalAllocations(allocations);
    setSaveError(null);
    setSaving(true);
    try {
      await onSaveGlobalAllocations(allocations);
      onUpdate({ ...event, globalBudgetAllocations: allocations });
    } catch (err) {
      setLocalGlobalAllocations(previous);
      setSaveError(err instanceof Error ? err.message : 'Erreur d\'enregistrement. Vérifiez que la base de données est à jour (migration global_budget_allocations).');
    } finally {
      setSaving(false);
    }
  };

  const handleAddGlobal = async () => {
    const label = newGlobalLabel.trim();
    const amount = parseFloat(newGlobalAmount) || 0;
    if (!label || !onSaveGlobalAllocations) return;
    const next = [...localGlobalAllocations, { id: crypto.randomUUID(), label, amount, color: newGlobalColor }];
    setNewGlobalLabel('');
    setNewGlobalAmount('');
    setNewGlobalColor(CHART_PALETTE[0]);
    const previous = localGlobalAllocations;
    setLocalGlobalAllocations(next);
    setSaveError(null);
    setSaving(true);
    try {
      await onSaveGlobalAllocations(next);
      onUpdate({ ...event, globalBudgetAllocations: next });
    } catch (err) {
      setLocalGlobalAllocations(previous);
      setSaveError(err instanceof Error ? err.message : 'Erreur d\'enregistrement. Vérifiez que la base de données est à jour (migration global_budget_allocations).');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateGlobal = async (id: string, label: string, amount: number, color?: string) => {
    const next = localGlobalAllocations.map((a) => (a.id === id ? { ...a, label, amount, ...(color != null && { color }) } : a));
    setGlobalEditId(null);
    await handleSaveGlobalAllocations(next);
  };

  const handleDeleteGlobal = async (id: string) => {
    await handleSaveGlobalAllocations(localGlobalAllocations.filter((a) => a.id !== id));
  };

  useEffect(() => {
    if (saveError) {
      const t = setTimeout(() => setSaveError(null), 8000);
      return () => clearTimeout(t);
    }
  }, [saveError]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h2 className="text-lg font-semibold text-slate-900">Budget du projet</h2>
        {onBack && (
          <button type="button" onClick={onBack} className="text-sm text-teal-600 font-medium hover:underline">
            ← Vue d'ensemble
          </button>
        )}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 flex flex-col sm:flex-row gap-6 items-start">
        <div className="shrink-0">
          <BudgetPieChart
            segments={pieSegments}
            total={budget > 0 ? budget : 1}
            size={180}
            strokeWidth={28}
            formatValue={(v) => `${v.toLocaleString('fr-FR')} ${symbol}`}
            onSegmentClick={onNavigateToSubEventBudget ? (seg) => seg.subEventId && onNavigateToSubEventBudget(seg.subEventId) : undefined}
            interactive={true}
          />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-slate-500 mb-1">Budget total</p>
          <div className="flex items-center gap-3 flex-wrap">
            <p className="text-3xl font-semibold text-slate-900">
              {budget.toLocaleString('fr-FR')} {symbol}
            </p>
            {canEdit && (
              <button
                type="button"
                onClick={() => {
                  setAdjustAmount(String(budget));
                  setAdjustCurrency(currency);
                  setShowAdjustModal(true);
                }}
                className="px-4 py-2 rounded-xl border border-teal-200 bg-teal-50 text-teal-700 text-sm font-medium hover:bg-teal-100"
              >
                Ajuster le budget
              </button>
            )}
          </div>
          {canEdit && (
            <p className="text-xs text-slate-500 mt-2">
              Répartition du budget ci-dessous (frais globaux + séquences). La somme peut être inférieure au budget total.
            </p>
          )}
        </div>
      </div>

      {/* Liste des frais regroupés par séquence (mobile) */}
      <div className="block sm:hidden rounded-xl border border-slate-200 bg-white p-6">
        <h3 className="text-base font-semibold text-slate-900 mb-3">Détail des frais</h3>
        <div className="space-y-4">
          {localGlobalAllocations.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-slate-600 mb-2">Frais globaux</h4>
              <ul className="space-y-2">
                {localGlobalAllocations.map((a) => (
                  <li key={a.id} className="flex items-center gap-2 text-sm">
                    <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: a.color || CHART_PALETTE[0] }} />
                    <span className="font-medium text-slate-800">{a.label}</span>
                    <span className="text-slate-600">{a.amount.toLocaleString('fr-FR')} {symbol}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {subEvents.map((sub) => {
            const allocs = (sub.budgetAllocations ?? []).filter((a) => a.amount > 0);
            if (allocs.length === 0) return null;
            return (
              <div key={sub.id}>
                <h4 className="text-sm font-medium text-slate-600 mb-2">{sub.title || 'Séquence'}</h4>
                <ul className="space-y-2">
                  {allocs.map((a) => (
                    <li key={a.id} className="flex items-center gap-2 text-sm">
                      <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: a.color || sub.color || CHART_PALETTE[0] }} />
                      <span className="font-medium text-slate-800">{a.label}</span>
                      <span className="text-slate-600">{a.amount.toLocaleString('fr-FR')} {symbol}</span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </div>

      {saveError && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          {saveError}
        </div>
      )}

      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <h3 className="text-base font-semibold text-slate-900 mb-4">Répartition du budget</h3>
        <p className="text-xs text-slate-500 mb-4">Frais globaux (pour tout l'événement) et montants alloués aux séquences. Tout est déduit du budget initial.</p>

        {/* Frais globaux */}
        <div className="mb-6">
          <h4 className="text-sm font-medium text-slate-700 mb-2">Frais globaux</h4>
          <ul className="space-y-3">
            {localGlobalAllocations.map((a) => (
              <li key={a.id} className="flex flex-wrap items-center gap-3 py-2 border-b border-slate-100 last:border-0">
                {globalEditId === a.id ? (
                  <>
                    <input
                      type="text"
                      defaultValue={a.label}
                      id={`global-edit-label-${a.id}`}
                      className="flex-1 min-w-[120px] rounded-lg border border-slate-200 px-3 py-2 text-sm"
                      placeholder="Libellé"
                    />
                    <input
                      type="number"
                      min={0}
                      step={100}
                      defaultValue={a.amount}
                      id={`global-edit-amount-${a.id}`}
                      className="w-28 rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    />
                    <span className="text-slate-500 text-sm">{symbol}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-500">Couleur</span>
                      <ColorSwatchPicker value={editGlobalColor} onChange={setEditGlobalColor} />
                    </div>
                    <button type="button" onClick={() => { const label = (document.getElementById(`global-edit-label-${a.id}`) as HTMLInputElement)?.value?.trim() ?? a.label; const amount = parseFloat((document.getElementById(`global-edit-amount-${a.id}`) as HTMLInputElement)?.value ?? '0') || 0; handleUpdateGlobal(a.id, label, amount, editGlobalColor); }} className="text-sm text-teal-600 font-medium">OK</button>
                    <button type="button" onClick={() => setGlobalEditId(null)} className="text-sm text-slate-500">Annuler</button>
                  </>
                ) : (
                  <>
                    <span className="w-4 h-4 rounded-full shrink-0" style={{ backgroundColor: a.color || CHART_PALETTE[0] }} />
                    <span className="font-medium text-slate-900 min-w-[120px]">{a.label}</span>
                    <span className="text-slate-700">{a.amount.toLocaleString('fr-FR')} {symbol}</span>
                    {canEdit && onSaveGlobalAllocations && (
                      <>
                        <button type="button" onClick={() => { setGlobalEditId(a.id); setEditGlobalColor(a.color || CHART_PALETTE[0]); }} className="text-xs text-teal-600 font-medium hover:underline">Modifier</button>
                        <button type="button" onClick={() => handleDeleteGlobal(a.id)} className="text-xs text-red-600 font-medium hover:underline">Supprimer</button>
                      </>
                    )}
                  </>
                )}
              </li>
            ))}
          </ul>
          {canEdit && onSaveGlobalAllocations && (
            <div className="flex flex-wrap items-center gap-2 mt-4">
              <input type="text" value={newGlobalLabel} onChange={(e) => setNewGlobalLabel(e.target.value)} placeholder="Ex. Assurance, Location salle..." className="rounded-lg border border-slate-200 px-3 py-2 text-sm w-44" />
              <input type="number" min={0} step={100} value={newGlobalAmount} onChange={(e) => setNewGlobalAmount(e.target.value)} placeholder="Montant" className="rounded-lg border border-slate-200 px-3 py-2 text-sm w-28" />
              <span className="text-slate-500 text-sm">{symbol}</span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500">Couleur</span>
                <ColorSwatchPicker value={newGlobalColor} onChange={setNewGlobalColor} />
              </div>
              <button type="button" onClick={handleAddGlobal} disabled={saving || !newGlobalLabel.trim()} className="px-4 py-2 bg-teal-600 text-white text-sm font-medium rounded-xl hover:bg-teal-700 disabled:opacity-50">Ajouter un frais</button>
            </div>
          )}
        </div>

        {/* Par séquence */}
        {subEvents.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-slate-700 mb-2">Par séquence</h4>
            <ul className="space-y-4">
              {subEvents.map((s) => (
                <li key={s.id} className="flex flex-wrap items-center gap-3">
                  <span className="w-32 text-sm font-medium text-slate-700 truncate">{s.title || 'Sans titre'}</span>
                  {canEdit ? (
                    <>
                      <input
                        type="number"
                        min={0}
                        step={100}
                        value={localDispatch[s.id] ?? ''}
                        onChange={(e) =>
                          setLocalDispatch((prev) => ({
                            ...prev,
                            [s.id]: parseFloat(e.target.value) || 0
                          }))
                        }
                        className="w-28 rounded-lg border border-slate-200 px-3 py-2 text-sm"
                      />
                      <span className="text-slate-500 text-sm">{symbol}</span>
                      <button type="button" onClick={handleSaveDispatch} className="text-xs text-teal-600 font-medium hover:underline">Enregistrer</button>
                    </>
                  ) : (
                    <span className="text-slate-900">{(localDispatch[s.id] ?? 0).toLocaleString('fr-FR')} {symbol}</span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        <p className="text-xs text-slate-500 mt-4 pt-4 border-t border-slate-100">
          Budget total : {budget.toLocaleString('fr-FR')} {symbol}
          {Number(totalGlobal) > 0 && ` · Frais globaux : ${Number(totalGlobal).toLocaleString('fr-FR')} ${symbol}`}
          {Number(totalSequences) > 0 && ` · Séquences : ${Number(totalSequences).toLocaleString('fr-FR')} ${symbol}`}
          {unallocated > 0 && ` · Non alloué : ${unallocated.toLocaleString('fr-FR')} ${symbol}`}
        </p>
      </div>

      {showAdjustModal && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Ajuster le budget</h3>
            <div className="space-y-4">
              <Input
                label="Montant"
                type="number"
                min="0"
                step="100"
                value={adjustAmount}
                onChange={(e) => setAdjustAmount(e.target.value)}
              />
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Devise</label>
                <select
                  value={adjustCurrency}
                  onChange={(e) => setAdjustCurrency(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
                >
                  {CURRENCIES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.symbol} {c.label} ({c.code})
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                type="button"
                onClick={() => setShowAdjustModal(false)}
                className="flex-1 py-2.5 text-slate-600 text-sm font-medium rounded-xl border border-slate-200"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleSaveAdjust}
                disabled={saving}
                className="flex-1 py-2.5 bg-teal-600 text-white text-sm font-medium rounded-xl hover:bg-teal-700 disabled:opacity-50"
              >
                {saving ? 'Enregistrement…' : 'Enregistrer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
