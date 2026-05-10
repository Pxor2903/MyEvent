import React, { Suspense, lazy } from 'react';
import { Routes, Route } from 'react-router-dom';
import type { User } from '@/core/types';
import { NotFound } from './NotFound';

const HomeV2 = lazy(() => import('./HomeV2').then((m) => ({ default: m.HomeV2 })));
const EventV2 = lazy(() => import('./EventV2').then((m) => ({ default: m.EventV2 })));
const SubEventV2New = lazy(() => import('./SubEventV2New').then((m) => ({ default: m.SubEventV2New })));
const RespondToInvitationV2 = lazy(() => import('./RespondToInvitationV2').then((m) => ({ default: m.RespondToInvitationV2 })));
const GuestEventV2 = lazy(() => import('./GuestEventV2').then((m) => ({ default: m.GuestEventV2 })));
const ProfileV2 = lazy(() => import('./ProfileV2').then((m) => ({ default: m.ProfileV2 })));
const BecomeProviderPage = lazy(() =>
  import('./provider/BecomeProviderPage').then((m) => ({ default: m.BecomeProviderPage }))
);
const ProviderSpacePlaceholder = lazy(() =>
  import('./provider/ProviderSpacePlaceholder').then((m) => ({ default: m.ProviderSpacePlaceholder }))
);
const RegisterProviderPage = lazy(() =>
  import('./provider/RegisterProviderPage').then((m) => ({ default: m.RegisterProviderPage }))
);

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
      <Route path="/register-provider" element={user ? withSuspense(<RegisterProviderPage />) : authElement} />
      <Route path="/" element={user ? withSuspense(<HomeV2 user={user} onLogout={onLogout} />) : authElement} />
      <Route path="/event/:eventId" element={user ? withSuspense(<EventV2 user={user} />) : authElement} />
      <Route path="/event/:eventId/sub/:subEventId" element={user ? withSuspense(<SubEventV2New user={user} />) : authElement} />
      <Route path="/guest/event/:eventId" element={user ? withSuspense(<GuestEventV2 user={user} />) : authElement} />
      <Route path="/profile/devenir-prestataire" element={user ? withSuspense(<BecomeProviderPage />) : authElement} />
      <Route path="/profile/prestataire" element={user ? withSuspense(<ProviderSpacePlaceholder />) : authElement} />
      <Route path="/profile" element={user ? withSuspense(<ProfileV2 user={user} onLogout={onLogout} />) : authElement} />

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

