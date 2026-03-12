/**
 * Onglet Missions : créer des tâches, les assigner ou laisser des organisateurs s'en emparer.
 * Design distinct : missions à saisir (libres) vs missions assignées.
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

  const isCurrentUserInTeam = teamMembers.some((m) => m.userId === currentUserId);

  const missionsToTake = missions.filter((m) => !m.assignedToUserId);
  const missionsAssigned = missions.filter((m) => !!m.assignedToUserId);

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
  };

  const claimMission = async (missionId: string) => {
    await updateMission(missionId, { assignedToUserId: currentUserId });
  };

  const unclaimMission = async (missionId: string) => {
    if (!confirm("Abandonner cette mission ? Elle redeviendra « à saisir ».")) return;
    await updateMission(missionId, { assignedToUserId: undefined });
  };

  const deleteMission = async (missionId: string) => {
    if (!confirm('Supprimer cette mission ?')) return;
    const updated = { ...event, missions: missions.filter((m) => m.id !== missionId) };
    await onUpdate(updated);
  };

  const getAssigneeLabel = (userId: string | undefined) => {
    if (!userId) return null;
    if (userId === event.creatorId) return 'Propriétaire';
    const member = teamMembers.find((m) => m.userId === userId);
    return member?.label ?? 'Organisateur';
  };

  const inProgressCount = missionsAssigned.filter((m) => m.status !== 'done').length;
  const doneCount = missions.filter((m) => m.status === 'done').length;

  const MissionCard = ({ mission, variant }: { mission: Mission; variant: 'toTake' | 'assigned' }) => {
    const assigneeLabel = getAssigneeLabel(mission.assignedToUserId);
    const isAssignedToMe = mission.assignedToUserId === currentUserId;

    return (
      <article
        className={`relative rounded-xl overflow-hidden transition-all duration-200 ${
          variant === 'toTake'
            ? 'bg-white shadow-md border-l-4 border-l-amber-500 hover:shadow-lg'
            : mission.status === 'done'
            ? 'bg-slate-50 border-l-4 border-l-slate-300'
            : 'bg-white shadow-md border-l-4 border-l-teal-500 hover:shadow-lg'
        }`}
      >
        <div className="p-4 sm:p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
            <div className="min-w-0 flex-1">
              <h4
                className={`font-semibold text-lg ${
                  mission.status === 'done' ? 'text-slate-400 line-through' : 'text-slate-900'
                }`}
              >
                {mission.title}
              </h4>
              {mission.description && (
                <p className="text-sm text-slate-500 mt-1">{mission.description}</p>
              )}

              {variant === 'toTake' ? (
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/15 text-amber-800 text-sm font-bold">
                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                    Libre — personne ne s'en occupe
                  </span>
                  {isCurrentUserInTeam && (
                    <button
                      type="button"
                      onClick={() => claimMission(mission.id)}
                      className="px-5 py-2.5 bg-teal-600 text-white text-sm font-bold rounded-xl hover:bg-teal-700 shadow-lg hover:shadow-xl transition-all hover:scale-[1.02]"
                    >
                      ✋ Je m'en occupe
                    </button>
                  )}
                </div>
              ) : (
                <div className="mt-4">
                  <div
                    className={`inline-flex items-center gap-3 px-4 py-3 rounded-xl ${
                      mission.status === 'done'
                        ? 'bg-slate-100'
                        : isAssignedToMe
                        ? 'bg-teal-500/15 border border-teal-200'
                        : 'bg-teal-50 border border-teal-100'
                    }`}
                  >
                    <span
                      className={`w-10 h-10 rounded-full flex items-center justify-center text-base font-bold shrink-0 ${
                        mission.status === 'done'
                          ? 'bg-slate-400 text-white'
                          : 'bg-teal-600 text-white shadow'
                      }`}
                    >
                      {assigneeLabel?.charAt(0).toUpperCase() ?? '?'}
                    </span>
                    <div>
                      <p className="text-sm font-bold text-slate-900">
                        {isAssignedToMe ? "Tu t'en occupes" : `${assigneeLabel} s'en occupe`}
                      </p>
                      {isAssignedToMe && mission.status !== 'done' && (
                        <button
                          type="button"
                          onClick={() => unclaimMission(mission.id)}
                          className="text-xs text-teal-600 hover:text-teal-800 underline mt-0.5"
                        >
                          Abandonner
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}
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
                    className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm font-medium outline-none focus:border-teal-500"
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
                    className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm outline-none focus:border-teal-500 max-w-[160px]"
                    title="Réassigner"
                  >
                    <option value="">Libre (à saisir)</option>
                    {teamMembers.map((m) => (
                      <option key={m.userId} value={m.userId}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => deleteMission(mission.id)}
                    className="p-2 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50"
                    title="Supprimer"
                    aria-label="Supprimer"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
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
        </div>
      </article>
    );
  };

  return (
    <div className="space-y-8">
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h3 className="text-xl font-bold text-slate-900">Missions</h3>
          <p className="text-sm text-slate-500 mt-1 max-w-md">
            Créez des tâches. Assignez-les ou laissez-les libres pour qu'un organisateur s'en empare.
          </p>
        </div>
        {canManage && (
          <button
            type="button"
            onClick={() => setShowForm(!showForm)}
            className="px-5 py-2.5 bg-teal-600 text-white text-sm font-semibold rounded-xl hover:bg-teal-700 shrink-0 shadow-md"
          >
            {showForm ? 'Annuler' : '+ Nouvelle mission'}
          </button>
        )}
      </div>

      {/* Formulaire de création */}
      {showForm && canManage && (
        <div className="p-5 rounded-xl border-2 border-teal-200 bg-teal-50/50 space-y-4 shadow-sm">
          <h4 className="text-sm font-semibold text-slate-800">Créer une mission</h4>
          <input
            type="text"
            placeholder="Ex : Payer la décoration"
            value={formTitle}
            onChange={(e) => setFormTitle(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:border-teal-500"
          />
          <textarea
            placeholder="Détails ou instructions (optionnel)"
            value={formDescription}
            onChange={(e) => setFormDescription(e.target.value)}
            rows={2}
            className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:border-teal-500 resize-none"
          />
          <div className="flex flex-wrap items-center gap-3">
            <label className="text-sm text-slate-600">Assigner (optionnel) :</label>
            <select
              value={formAssignedTo}
              onChange={(e) => setFormAssignedTo(e.target.value)}
              className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm outline-none focus:border-teal-500"
            >
              <option value="">— Laisser libre (à saisir) —</option>
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

      {/* Résumé badges */}
      {missions.length > 0 && (
        <div className="flex flex-wrap gap-3">
          {missionsToTake.length > 0 && (
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/20 text-amber-900 font-bold text-sm">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              {missionsToTake.length} à saisir
            </span>
          )}
          <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-teal-500/20 text-teal-900 font-semibold text-sm">
            <span className="w-2.5 h-2.5 rounded-full bg-teal-500" />
            {inProgressCount} en cours
          </span>
          <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/20 text-emerald-900 font-semibold text-sm">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            {doneCount} terminé(s)
          </span>
        </div>
      )}

      {/* Liste vide */}
      {missions.length === 0 && !showForm && (
        <div className="py-16 text-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50">
          <p className="text-slate-500 text-sm">Aucune mission.</p>
          <p className="text-slate-400 text-xs mt-1">Créez une mission pour répartir les tâches.</p>
          {canManage && (
            <button
              type="button"
              onClick={() => setShowForm(true)}
              className="mt-4 px-5 py-2.5 bg-teal-600 text-white text-sm font-semibold rounded-xl hover:bg-teal-700"
            >
              + Créer une mission
            </button>
          )}
        </div>
      )}

      {/* BLOC À SAISIR — bien visible */}
      {missionsToTake.length > 0 && (
        <section className="rounded-2xl bg-amber-50/80 border-2 border-amber-200 p-5">
          <div className="flex items-center gap-2 mb-2">
            <span className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </span>
            <div>
              <h4 className="text-lg font-bold text-amber-900">Missions libres à saisir</h4>
              <p className="text-sm text-amber-700">Personne ne s'en occupe — clique pour t'en charger</p>
            </div>
          </div>
          <div className="space-y-3 mt-4">
            {missionsToTake
              .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
              .map((mission) => (
                <div key={mission.id}>
                  <MissionCard mission={mission} variant="toTake" />
                </div>
              ))}
          </div>
        </section>
      )}

      {/* BLOC ASSIGNÉES — distinct */}
      {missionsAssigned.length > 0 && (
        <section className="rounded-2xl bg-slate-50/80 border border-slate-200 p-5">
          <div className="flex items-center gap-2 mb-2">
            <span className="w-10 h-10 rounded-xl bg-teal-600 flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </span>
            <div>
              <h4 className="text-lg font-bold text-slate-900">Missions déjà assignées</h4>
              <p className="text-sm text-slate-600">Quelqu'un s'en occupe</p>
            </div>
          </div>
          <div className="space-y-3 mt-4">
            {missionsAssigned
              .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
              .map((mission) => (
                <div key={mission.id}>
                  <MissionCard mission={mission} variant="assigned" />
                </div>
              ))}
          </div>
        </section>
      )}
    </div>
  );
};
