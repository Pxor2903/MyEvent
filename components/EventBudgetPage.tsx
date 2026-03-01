/**
 * Page Budget de l'événement : total, devise, camembert, frais globaux, dispatch par sous-événement.
 */
import React, { useState, useEffect } from 'react';
import type { Event, SubEvent, BudgetAllocation } from '@/core/types';
import { BudgetPieChart, type PieSegment } from './BudgetPieChart';
import { CURRENCIES, getCurrencySymbol } from '@/core/constants/currencies';
import { Input } from './Input';

interface EventBudgetPageProps {
  event: Event;
  canEdit: boolean;
  onUpdate: (updated: Event) => void;
  onSaveBudget: (amount: number, currency: string, subEventBudgets: Record<string, number>) => Promise<void>;
  onSaveGlobalAllocations?: (allocations: BudgetAllocation[]) => Promise<void>;
  onBack?: () => void;
}

export const EventBudgetPage: React.FC<EventBudgetPageProps> = ({
  event,
  canEdit,
  onUpdate,
  onSaveBudget,
  onSaveGlobalAllocations,
  onBack
}) => {
  const budget = event.budget ?? 0;
  const currency = event.currency ?? 'EUR';
  const symbol = getCurrencySymbol(currency);
  const subEventBudgets = event.subEventBudgets ?? {};
  const subEvents = event.subEvents ?? [];
  const globalAllocations = event.globalBudgetAllocations ?? [];

  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [adjustAmount, setAdjustAmount] = useState(String(budget));
  const [adjustCurrency, setAdjustCurrency] = useState(currency);
  const [localDispatch, setLocalDispatch] = useState<Record<string, number>>(subEventBudgets);
  const [saving, setSaving] = useState(false);
  const [globalEditId, setGlobalEditId] = useState<string | null>(null);
  const [newGlobalLabel, setNewGlobalLabel] = useState('');
  const [newGlobalAmount, setNewGlobalAmount] = useState('');

  useEffect(() => {
    setLocalDispatch(event.subEventBudgets ?? {});
  }, [event.subEventBudgets]);

  const totalGlobal = globalAllocations.reduce((a, b) => a + b.amount, 0);
  const totalSequences = Object.values(localDispatch).reduce((a, b) => a + b, 0);
  const totalAllocated = totalGlobal + totalSequences;
  const unallocated = Math.max(0, budget - totalAllocated);

  // Agrégation des postes : frais globaux + postes de toutes les séquences
  const byLabel = new Map<string, number>();
  globalAllocations.forEach((a) => {
    const key = (a.label || 'Sans nom').trim();
    byLabel.set(key, (byLabel.get(key) ?? 0) + a.amount);
  });
  subEvents.forEach((s) => {
    (s.budgetAllocations ?? []).forEach((a) => {
      const key = (a.label || 'Sans nom').trim();
      byLabel.set(key, (byLabel.get(key) ?? 0) + a.amount);
    });
  });
  const totalInPostes = Array.from(byLabel.values()).reduce((a, b) => a + b, 0);
  const unallocatedPostes = Math.max(0, budget - totalInPostes);

  const POSTE_CHART_COLORS = ['#0d9488', '#14b8a6', '#2dd4bf', '#5eead4', '#99f6e4', '#64748b', '#94a3b8', '#f59e0b', '#f97316'];
  const pieSegments: PieSegment[] = [
    ...Array.from(byLabel.entries())
      .filter(([, value]) => value > 0)
      .map(([label, value], i) => ({
        label,
        value,
        color: POSTE_CHART_COLORS[i % POSTE_CHART_COLORS.length]
      })),
    ...(unallocatedPostes > 0 ? [{ label: 'Non alloué', value: unallocatedPostes, color: '#e2e8f0' }] : [])
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
    setSaving(true);
    try {
      await onSaveGlobalAllocations(allocations);
      onUpdate({ ...event, globalBudgetAllocations: allocations });
    } finally {
      setSaving(false);
    }
  };

  const handleAddGlobal = async () => {
    const label = newGlobalLabel.trim();
    const amount = parseFloat(newGlobalAmount) || 0;
    if (!label || !onSaveGlobalAllocations) return;
    const next = [...globalAllocations, { id: crypto.randomUUID(), label, amount }];
    setNewGlobalLabel('');
    setNewGlobalAmount('');
    await handleSaveGlobalAllocations(next);
  };

  const handleUpdateGlobal = async (id: string, label: string, amount: number) => {
    const next = globalAllocations.map((a) => (a.id === id ? { ...a, label, amount } : a));
    setGlobalEditId(null);
    await handleSaveGlobalAllocations(next);
  };

  const handleDeleteGlobal = async (id: string) => {
    await handleSaveGlobalAllocations(globalAllocations.filter((a) => a.id !== id));
  };

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
          <BudgetPieChart segments={pieSegments} total={budget > 0 ? budget : 1} size={180} strokeWidth={28} />
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

      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <h3 className="text-base font-semibold text-slate-900 mb-4">Répartition du budget</h3>
        <p className="text-xs text-slate-500 mb-4">Frais globaux (pour tout l'événement) et montants alloués aux séquences. Tout est déduit du budget initial.</p>

        {/* Frais globaux */}
        <div className="mb-6">
          <h4 className="text-sm font-medium text-slate-700 mb-2">Frais globaux</h4>
          <ul className="space-y-3">
            {globalAllocations.map((a) => (
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
                    <button type="button" onClick={() => { const label = (document.getElementById(`global-edit-label-${a.id}`) as HTMLInputElement)?.value?.trim() ?? a.label; const amount = parseFloat((document.getElementById(`global-edit-amount-${a.id}`) as HTMLInputElement)?.value ?? '0') || 0; handleUpdateGlobal(a.id, label, amount); }} className="text-sm text-teal-600 font-medium">OK</button>
                    <button type="button" onClick={() => setGlobalEditId(null)} className="text-sm text-slate-500">Annuler</button>
                  </>
                ) : (
                  <>
                    <span className="font-medium text-slate-900 min-w-[120px]">{a.label}</span>
                    <span className="text-slate-700">{a.amount.toLocaleString('fr-FR')} {symbol}</span>
                    {canEdit && onSaveGlobalAllocations && (
                      <>
                        <button type="button" onClick={() => setGlobalEditId(a.id)} className="text-xs text-teal-600 font-medium hover:underline">Modifier</button>
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
          {totalGlobal > 0 && ` · Frais globaux : ${totalGlobal.toLocaleString('fr-FR')} ${symbol}`}
          {totalSequences > 0 && ` · Séquences : ${totalSequences.toLocaleString('fr-FR')} ${symbol}`}
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
