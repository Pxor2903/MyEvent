import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import type { User, Event } from '@/core/types';
import { HomeV2 } from './HomeV2';
import { EventV2 } from './EventV2';
import { SubEventV2New } from './SubEventV2New';
import { RespondToInvitationV2 } from './RespondToInvitationV2';

interface V2RouterProps {
  user: User;
  onLogout: () => void;
  /** L’API existante route l’invitation via query `?token=...` (pas un paramètre path). */
  invitationToken: string | null;
  /** Événement courant si on veut précharger; optionnel. */
  initialEvent?: Event | null;
}

export const V2Router: React.FC<V2RouterProps> = ({ user, onLogout, invitationToken }) => {
  return (
    <Routes>
      <Route path="/" element={<HomeV2 user={user} onLogout={onLogout} />} />
      <Route path="/event/:eventId" element={<EventV2 user={user} />} />
      <Route path="/event/:eventId/sub/:subEventId" element={<SubEventV2New user={user} />} />

      {/* Route publique invitation (basée sur query string). */}
      <Route
        path="/repondre"
        element={invitationToken ? <RespondToInvitationV2 token={invitationToken} /> : <Navigate to="/" replace />}
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

