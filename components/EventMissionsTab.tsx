/**
 * Onglet Missions : lister et créer des tâches, les assigner aux organisateurs.
 */
import React, { useState } from 'react';
import type { Event, Mission } from '@/core/types';

const STATUS_LABELS: Record<Mission['status'], string> = {
  todo: 'À faire',
  in_progress: 'En cours',
  done: 'Terminé'
};

interface EventMissionsTabProps {
  event: Event;
  currentUserId: string;
  canManage: boolean;
  onUpdate: (updated: Event) => void;
  /** Membre de l'équipe pour l'assignation (propriétaire + organisateurs confirmés). */
  teamMembers: { userId: string; label: string }[];
}

export const EventMissionsTab: React.FC<EventMissionsTabProps> = ({
  event,
  currentUserId,
  canManage,
  onUpdate,
  teamMembers
}) => {
  const missions = event.missions ?? [];
  const [showForm, setShowForm] = useState(false);
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formAssignedTo, setFormAssignedTo] = useState<string>('');
  const [saving, setSaving] = useState(false);

  const saveMission = async () => {
    const title = formTitle.trim();
    if (!title) return;
    setSaving(true);
    try {
      const newMission: Mission = {
        id: crypto.randomUUID(),
        title,
        description: formDescription.trim() || undefined,
        assignedToUserId: formAssignedTo || undefined,
        status: 'todo',
        createdAt: new Date().toISOString()
      };
      const updated = { ...event, missions: [...missions, newMission] };
      await onUpdate(updated);
      setFormTitle('');
      setFormDescription('');
      setFormAssignedTo('');
      setShowForm(false);
    } catch (e) {
      console.error(e);
      alert('Impossible de créer la mission.');
    } finally {
      setSaving(false);
    }
  };

  const updateMission = async (missionId: string, updates: Partial<Mission>) => {
    const updated = {
      ...event,
      missions: missions.map((m) => (m.id === missionId ? { ...m, ...updates } : m))
    };
    await onUpdate(updated);
    setEditingId(null);
  };

  const deleteMission = async (missionId: string) => {
    if (!confirm('Supprimer cette mission ?')) return;
    const updated = { ...event, missions: missions.filter((m) => m.id !== missionId) };
    await onUpdate(updated);
  };

  const getAssigneeLabel = (userId: string | undefined) => {
    if (!userId) return 'Non assigné';
    if (userId === event.creatorId) return 'Propriétaire';
    const member = teamMembers.find((m) => m.userId === userId);
    return member?.label ?? 'Organisateur';
  };

  const todoCount = missions.filter((m) => m.status === 'todo').length;
  const doneCount = missions.filter((m) => m.status === 'done').length;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">Missions</h3>
          <p className="text-sm text-slate-500 mt-0.5">
            Créez des tâches et assignez-les aux membres de l'équipe.
          </p>
        </div>
        {canManage && (
          <button
            type="button"
            onClick={() => setShowForm(!showForm)}
            className="px-4 py-2.5 bg-teal-600 text-white text-sm font-medium rounded-xl hover:bg-teal-700 shrink-0"
          >
            {showForm ? 'Annuler' : '+ Nouvelle mission'}
          </button>
        )}
      </div>

      {showForm && canManage && (
        <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
          <input
            type="text"
            placeholder="Titre de la mission"
            value={formTitle}
            onChange={(e) => setFormTitle(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:border-teal-500"
          />
          <textarea
            placeholder="Description (optionnel)"
            value={formDescription}
            onChange={(e) => setFormDescription(e.target.value)}
            rows={2}
            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:border-teal-500 resize-none"
          />
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={formAssignedTo}
              onChange={(e) => setFormAssignedTo(e.target.value)}
              className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm outline-none focus:border-teal-500"
            >
              <option value="">Non assigné</option>
              {teamMembers.map((m) => (
                <option key={m.userId} value={m.userId}>
                  {m.label}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={saveMission}
              disabled={saving || !formTitle.trim()}
              className="px-4 py-2 bg-teal-600 text-white text-sm font-medium rounded-lg hover:bg-teal-700 disabled:opacity-50"
            >
              {saving ? 'Enregistrement…' : 'Créer'}
            </button>
          </div>
        </div>
      )}

      {/* Résumé */}
      {missions.length > 0 && (
        <div className="flex gap-4 text-sm">
          <span className="px-3 py-1.5 rounded-lg bg-amber-50 text-amber-700 font-medium">
            {todoCount} à faire
          </span>
          <span className="px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 font-medium">
            {doneCount} terminé(s)
          </span>
        </div>
      )}

      {/* Liste des missions */}
      <ul className="space-y-3">
        {missions.length === 0 && !showForm && (
          <li className="py-8 text-center text-slate-400 text-sm">
            Aucune mission pour l'instant. Créez-en une pour répartir les tâches.
          </li>
        )}
        {missions
          .slice()
          .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
          .map((mission) => (
            <li
              key={mission.id}
              className={`p-4 rounded-xl border transition-colors ${
                mission.status === 'done'
                  ? 'border-slate-100 bg-slate-50/50'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <h4
                    className={`font-medium ${
                      mission.status === 'done' ? 'text-slate-500 line-through' : 'text-slate-900'
                    }`}
                  >
                    {mission.title}
                  </h4>
                  {mission.description && (
                    <p className="text-sm text-slate-500 mt-1">{mission.description}</p>
                  )}
                  <p className="text-xs text-slate-400 mt-2">
                    Assigné à : {getAssigneeLabel(mission.assignedToUserId)}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  {canManage && (
                    <>
                      <select
                        value={mission.status}
                        onChange={(e) =>
                          updateMission(mission.id, {
                            status: e.target.value as Mission['status']
                          })
                        }
                        className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-medium outline-none focus:border-teal-500"
                      >
                        {(['todo', 'in_progress', 'done'] as const).map((s) => (
                          <option key={s} value={s}>
                            {STATUS_LABELS[s]}
                          </option>
                        ))}
                      </select>
                      <select
                        value={mission.assignedToUserId ?? ''}
                        onChange={(e) =>
                          updateMission(mission.id, {
                            assignedToUserId: e.target.value || undefined
                          })
                        }
                        className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs outline-none focus:border-teal-500 max-w-[140px]"
                      >
                        <option value="">Non assigné</option>
                        {teamMembers.map((m) => (
                          <option key={m.userId} value={m.userId}>
                            {m.label}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => deleteMission(mission.id)}
                        className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg"
                        title="Supprimer"
                        aria-label="Supprimer"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                      </button>
                    </>
                  )}
                  {!canManage && (
                    <span
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium ${
                        mission.status === 'done'
                          ? 'bg-emerald-100 text-emerald-700'
                          : mission.status === 'in_progress'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-amber-100 text-amber-700'
                      }`}
                    >
                      {STATUS_LABELS[mission.status]}
                    </span>
                  )}
                </div>
              </div>
            </li>
          ))}
      </ul>
    </div>
  );
};
