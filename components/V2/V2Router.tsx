import React, { Suspense, lazy } from 'react';
import { Routes, Route } from 'react-router-dom';
import type { User } from '@/core/types';
import { NotFound } from './NotFound';

const HomeV2 = lazy(() => import('./HomeV2').then((m) => ({ default: m.HomeV2 })));
const EventV2 = lazy(() => import('./EventV2').then((m) => ({ default: m.EventV2 })));
const SubEventV2New = lazy(() => import('./SubEventV2New').then((m) => ({ default: m.SubEventV2New })));
const RespondToInvitationV2 = lazy(() => import('./RespondToInvitationV2').then((m) => ({ default: m.RespondToInvitationV2 })));
const GuestEventV2 = lazy(() => import('./GuestEventV2').then((m) => ({ default: m.GuestEventV2 })));

interface V2RouterProps {
  user: User | null;
  onLogout: () => void;
  authElement: React.ReactElement;
}

export const V2Router: React.FC<V2RouterProps> = ({ user, onLogout, authElement }) => {
  const withSuspense = (element: React.ReactElement) => (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-slate-500">Chargement...</div>}>
      {element}
    </Suspense>
  );

  return (
    <Routes>
      <Route path="/repondre" element={withSuspense(<RespondToInvitationV2 />)} />
      <Route path="/" element={user ? withSuspense(<HomeV2 user={user} onLogout={onLogout} />) : authElement} />
      <Route path="/event/:eventId" element={user ? withSuspense(<EventV2 user={user} />) : authElement} />
      <Route path="/event/:eventId/sub/:subEventId" element={user ? withSuspense(<SubEventV2New user={user} />) : authElement} />
      <Route path="/guest/event/:eventId" element={user ? withSuspense(<GuestEventV2 user={user} />) : authElement} />

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

