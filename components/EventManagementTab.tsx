import React from 'react';
import type { Event, User, Organizer, Permission } from '@/core/types';
import { EventMissionsTab } from './EventMissionsTab';

interface EventManagementTabProps {
  event: Event;
  currentUser: User;
  /** Organisateur courant (si l'utilisateur est dans l'équipe). */
  currentOrganizer?: Organizer;
  permissions: Permission[];
  isOwner: boolean;
  onUpdateEvent: (updated: Event) => void;
  /** Ouvre la page Documents détaillée. */
  onOpenDocuments: () => void;
  /** Ouvre la page Équipe / accès détaillée. */
  onOpenTeamSettings: () => void;
}

export const EventManagementTab: React.FC<EventManagementTabProps> = ({
  event,
  currentUser,
  currentOrganizer,
  permissions,
  isOwner,
  onUpdateEvent,
  onOpenDocuments,
  onOpenTeamSettings
}) => {
  const canManageMissions = isOwner || (currentOrganizer?.status === 'confirmed') || permissions.includes('manage_subevents') || permissions.includes('all');

  const teamMembers = [
    {
      userId: event.creatorId,
      label: event.creatorId === currentUser.id ? 'Propriétaire (vous)' : 'Propriétaire'
    },
    ...(event.organizers ?? [])
      .filter((o) => o.status === 'confirmed' && o.userId !== event.creatorId)
      .map((o) => ({
        userId: o.userId,
        label: `${o.firstName} ${o.lastName}`.trim() || 'Co-organisateur'
      }))
  ];

  const pendingOrganizers = (event.organizers ?? []).filter((o) => o.status === 'pending');

  return (
    <div className="space-y-8">
      {/* En-tête global */}
      <header className="space-y-2">
        <h2 className="text-xl sm:text-2xl font-semibold text-slate-900">Gestion du projet</h2>
        <p className="text-sm text-slate-500 max-w-2xl">
          Une seule page pour piloter les missions, l’équipe d’organisation et les documents partagés avec les invités.
        </p>
      </header>

      {/* Bloc Missions */}
      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm p-4 sm:p-6 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Missions</h3>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-xl">
              Liste des tâches à faire pour l’événement. Les organisateurs peuvent s’auto-assigner des missions ou en créer de nouvelles.
            </p>
          </div>
        </div>
        <div className="mt-2">
          <EventMissionsTab
            event={event}
            currentUserId={currentUser.id}
            canManage={canManageMissions}
            onUpdate={onUpdateEvent}
            teamMembers={teamMembers}
          />
        </div>
      </section>

      {/* Bloc Équipe & accès */}
      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm p-4 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-slate-900">Équipe & accès</h3>
            <p className="text-xs sm:text-sm text-slate-500 max-w-xl">
              Partage la clé d’accès, vois qui fait partie de l’équipe et gère les demandes de co‑organisation.
            </p>
          </div>
          <button
            type="button"
            onClick={onOpenTeamSettings}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 text-white text-xs sm:text-sm font-semibold shadow-sm hover:bg-slate-800"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
            </svg>
            Gérer les droits en détail
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col gap-1">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Clé de partage</p>
            <p className="font-mono text-sm text-slate-900 break-all">{event.shareCode}</p>
          </div>
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col gap-1">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Mot de passe</p>
            <p className="font-mono text-sm text-slate-900 break-all">{event.sharePassword || '—'}</p>
          </div>
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Co‑organisateurs</p>
              <p className="text-sm text-slate-900">
                {(event.organizers ?? []).filter((o) => o.status === 'confirmed').length} confirmé(s)
              </p>
            </div>
            {pendingOrganizers.length > 0 && (
              <p className="text-xs font-medium text-amber-700 bg-amber-50 rounded-lg px-2 py-1 mt-2">
                {pendingOrganizers.length} demande(s) en attente
              </p>
            )}
          </div>
        </div>
      </section>

      {/* Bloc Documents */}
      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm p-4 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-slate-900">Documents partagés</h3>
            <p className="text-xs sm:text-sm text-slate-500 max-w-xl">
              Gère les invitations, menus, plans et autres pièces jointes. Envoie-les ensuite par WhatsApp ou SMS depuis l’onglet Documents détaillé.
            </p>
          </div>
          <button
            type="button"
            onClick={onOpenDocuments}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-teal-600 text-white text-xs sm:text-sm font-semibold shadow-sm hover:bg-teal-700"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Ouvrir la gestion des documents
          </button>
        </div>
        <p className="text-xs text-slate-500">
          Astuce : marque tes cartes d’invitation avec le type <span className="font-semibold">« Carte d’invitation »</span> pour activer les liens de réponse automatiques.
        </p>
      </section>
    </div>
  );
};

