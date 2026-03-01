/**
 * Page Budget de l'événement : total, devise, camembert de répartition, dispatch par sous-événement.
 */
import React, { useState, useEffect } from 'react';
import type { Event, SubEvent } from '@/core/types';
import { BudgetPieChart, type PieSegment } from './BudgetPieChart';
import { CURRENCIES, getCurrencySymbol } from '@/core/constants/currencies';
import { Input } from './Input';

const SUB_EVENT_CHART_COLORS = ['#0d9488', '#14b8a6', '#2dd4bf', '#5eead4', '#99f6e4', '#64748b'];

interface EventBudgetPageProps {
  event: Event;
  canEdit: boolean;
  onUpdate: (updated: Event) => void;
  onSaveBudget: (amount: number, currency: string, subEventBudgets: Record<string, number>) => Promise<void>;
  onBack?: () => void;
}

export const EventBudgetPage: React.FC<EventBudgetPageProps> = ({
  event,
  canEdit,
  onUpdate,
  onSaveBudget,
  onBack
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
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setLocalDispatch(event.subEventBudgets ?? {});
  }, [event.subEventBudgets]);

  const totalAllocated = Object.values(localDispatch).reduce((a, b) => a + b, 0);
  const unallocated = Math.max(0, budget - totalAllocated);

  const pieSegments: PieSegment[] = [
    ...subEvents
      .filter((s) => (localDispatch[s.id] ?? 0) > 0)
      .map((s, i) => ({
        label: s.title || 'Séquence',
        value: localDispatch[s.id] ?? 0,
        color: SUB_EVENT_CHART_COLORS[i % SUB_EVENT_CHART_COLORS.length]
      })),
    ...(unallocated > 0 ? [{ label: 'Non alloué', value: unallocated, color: '#e2e8f0' }] : [])
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
              Répartition par séquence ci-dessous. La somme allouée peut être inférieure au budget total.
            </p>
          )}
        </div>
      </div>

      {subEvents.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <h3 className="text-base font-semibold text-slate-900 mb-4">Répartition par séquence</h3>
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
                    <button
                      type="button"
                      onClick={handleSaveDispatch}
                      className="text-xs text-teal-600 font-medium hover:underline"
                    >
                      Enregistrer
                    </button>
                  </>
                ) : (
                  <span className="text-slate-900">
                    {(localDispatch[s.id] ?? 0).toLocaleString('fr-FR')} {symbol}
                  </span>
                )}
              </li>
            ))}
          </ul>
          <p className="text-xs text-slate-500 mt-3">
            Total alloué : {totalAllocated.toLocaleString('fr-FR')} {symbol}
            {unallocated > 0 && ` · Non alloué : ${unallocated.toLocaleString('fr-FR')} ${symbol}`}
          </p>
        </div>
      )}

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
