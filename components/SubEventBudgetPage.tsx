/**
 * Page Budget d'un sous-événement : camembert des postes, liste des allocations (ajout / édition / suppression).
 */
import React, { useState } from 'react';
import type { SubEvent, BudgetAllocation } from '@/core/types';
import { BudgetPieChart, type PieSegment } from './BudgetPieChart';
import { getCurrencySymbol } from '@/core/constants/currencies';

const ALLOCATION_COLORS = ['#0d9488', '#14b8a6', '#2dd4bf', '#5eead4', '#99f6e4', '#64748b', '#94a3b8', '#f59e0b'];

interface SubEventBudgetPageProps {
  subEvent: SubEvent;
  currency: string;
  allocatedFromParent: number; // montant alloué à cette séquence depuis l'événement global
  canEdit: boolean;
  onSaveAllocations: (allocations: BudgetAllocation[]) => Promise<void>;
}

export const SubEventBudgetPage: React.FC<SubEventBudgetPageProps> = ({
  subEvent,
  currency,
  allocatedFromParent,
  canEdit,
  onSaveAllocations
}) => {
  const symbol = getCurrencySymbol(currency);
  const allocations = subEvent.budgetAllocations ?? [];
  const totalAllocated = allocations.reduce((s, a) => s + a.amount, 0);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newLabel, setNewLabel] = useState('');
  const [newAmount, setNewAmount] = useState('');
  const [saving, setSaving] = useState(false);

  const pieSegments: PieSegment[] = allocations
    .filter((a) => a.amount > 0)
    .map((a, i) => ({
      label: a.label,
      value: a.amount,
      color: ALLOCATION_COLORS[i % ALLOCATION_COLORS.length]
    }));

  const handleAdd = async () => {
    const label = newLabel.trim();
    const amount = parseFloat(newAmount) || 0;
    if (!label) return;
    const next: BudgetAllocation[] = [...allocations, { id: crypto.randomUUID(), label, amount }];
    setNewLabel('');
    setNewAmount('');
    setSaving(true);
    try {
      await onSaveAllocations(next);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async (id: string, label: string, amount: number) => {
    const next = allocations.map((a) => (a.id === id ? { ...a, label, amount } : a));
    setEditingId(null);
    setSaving(true);
    try {
      await onSaveAllocations(next);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    const next = allocations.filter((a) => a.id !== id);
    setSaving(true);
    try {
      await onSaveAllocations(next);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <h3 className="text-base font-semibold text-slate-900">Budget de la séquence</h3>
      {allocatedFromParent > 0 && (
        <p className="text-sm text-slate-500">
          Montant alloué à cette séquence (depuis le budget global) : {allocatedFromParent.toLocaleString('fr-FR')} {symbol}
        </p>
      )}

      <div className="rounded-xl border border-slate-200 bg-white p-6 flex flex-col sm:flex-row gap-6 items-start">
        <div className="shrink-0">
          <BudgetPieChart
            segments={pieSegments}
            total={totalAllocated > 0 ? totalAllocated : 1}
            size={160}
            strokeWidth={24}
          />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-slate-500 mb-1">Total des postes</p>
          <p className="text-2xl font-semibold text-slate-900">
            {totalAllocated.toLocaleString('fr-FR')} {symbol}
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <h4 className="text-sm font-semibold text-slate-700 mb-4">Postes d'allocation</h4>
        <ul className="space-y-3">
          {allocations.map((a) => (
            <li key={a.id} className="flex flex-wrap items-center gap-3 py-2 border-b border-slate-100 last:border-0">
              {editingId === a.id ? (
                <>
                  <input
                    type="text"
                    defaultValue={a.label}
                    id={`edit-label-${a.id}`}
                    className="flex-1 min-w-[120px] rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    placeholder="Libellé"
                  />
                  <input
                    type="number"
                    min={0}
                    step={100}
                    defaultValue={a.amount}
                    id={`edit-amount-${a.id}`}
                    className="w-28 rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  />
                  <span className="text-slate-500 text-sm">{symbol}</span>
                  <button
                    type="button"
                    onClick={() => {
                      const label = (document.getElementById(`edit-label-${a.id}`) as HTMLInputElement)?.value?.trim() ?? a.label;
                      const amount = parseFloat((document.getElementById(`edit-amount-${a.id}`) as HTMLInputElement)?.value ?? '0') || 0;
                      handleUpdate(a.id, label, amount);
                    }}
                    className="text-sm text-teal-600 font-medium"
                  >
                    OK
                  </button>
                  <button type="button" onClick={() => setEditingId(null)} className="text-sm text-slate-500">
                    Annuler
                  </button>
                </>
              ) : (
                <>
                  <span className="font-medium text-slate-900 min-w-[120px]">{a.label}</span>
                  <span className="text-slate-700">{a.amount.toLocaleString('fr-FR')} {symbol}</span>
                  {canEdit && (
                    <>
                      <button
                        type="button"
                        onClick={() => setEditingId(a.id)}
                        className="text-xs text-teal-600 font-medium hover:underline"
                      >
                        Modifier
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(a.id)}
                        className="text-xs text-red-600 font-medium hover:underline"
                      >
                        Supprimer
                      </button>
                    </>
                  )}
                </>
              )}
            </li>
          ))}
        </ul>
        {canEdit && (
          <div className="flex flex-wrap items-center gap-2 mt-4 pt-4 border-t border-slate-100">
            <input
              type="text"
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              placeholder="Ex. Fleurs, Traiteur..."
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm w-40"
            />
            <input
              type="number"
              min={0}
              step={100}
              value={newAmount}
              onChange={(e) => setNewAmount(e.target.value)}
              placeholder="Montant"
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm w-28"
            />
            <span className="text-slate-500 text-sm">{symbol}</span>
            <button
              type="button"
              onClick={handleAdd}
              disabled={saving || !newLabel.trim()}
              className="px-4 py-2 bg-teal-600 text-white text-sm font-medium rounded-xl hover:bg-teal-700 disabled:opacity-50"
            >
              Ajouter
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
