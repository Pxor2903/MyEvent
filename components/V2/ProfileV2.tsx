import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { ProviderProfile, User } from '@/core/types';
import { profilesApi } from '@/api/profiles';
import { getMyProviderProfile } from '@/api/providers';
import { V2Card } from '@/components/V2/ui';
import { Footer } from '@/components/Footer';
import { ProviderStatusBanner } from '@/components/V2/provider/ProviderStatusBanner';

export interface ProfileV2Props {
  user: User;
  onLogout: () => void;
}

export const ProfileV2: React.FC<ProfileV2Props> = ({ user, onLogout }) => {
  const navigate = useNavigate();
  const [freshUser, setFreshUser] = useState<User>(user);
  const [providerProfile, setProviderProfile] = useState<ProviderProfile | null>(null);
  const [loadingProvider, setLoadingProvider] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingProvider(true);
      const [u, p] = await Promise.all([profilesApi.getById(user.id), getMyProviderProfile()]);
      if (cancelled) return;
      if (u) setFreshUser(u);
      setProviderProfile(p);
      setLoadingProvider(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [user.id]);

  const initials = `${freshUser.firstName?.[0] ?? ''}${freshUser.lastName?.[0] ?? ''}`.toUpperCase() || '?';

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header
        className="page-container content-padding py-4 flex items-center justify-between gap-3 border-b border-slate-200 bg-white"
        style={{ paddingTop: 'calc(1rem + var(--safe-area-top))' }}
      >
        <button
          type="button"
          onClick={() => navigate('/')}
          className="text-sm font-semibold text-teal-700 hover:text-teal-900"
        >
          ← Accueil
        </button>
        <h1 className="text-lg font-bold text-slate-900 truncate text-center flex-1 px-2">Mon profil</h1>
        <span className="w-16 sm:w-24" aria-hidden />
      </header>

      <main className="page-container content-padding py-6 flex-1 space-y-6 max-w-2xl mx-auto w-full min-w-0">
        <V2Card className="p-6 space-y-5">
          <h2 className="text-lg font-black text-slate-900 tracking-tight">Informations personnelles</h2>
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            {freshUser.avatar ? (
              <img
                src={freshUser.avatar}
                alt=""
                className="w-20 h-20 rounded-2xl object-cover border border-slate-200 shadow-sm shrink-0"
              />
            ) : (
              <div className="w-20 h-20 rounded-2xl bg-teal-100 text-teal-800 flex items-center justify-center text-xl font-black border border-teal-200 shrink-0">
                {initials}
              </div>
            )}
            <dl className="flex-1 space-y-2 text-sm">
              <div>
                <dt className="text-slate-500 font-medium">Nom</dt>
                <dd className="text-slate-900 font-semibold">
                  {freshUser.firstName} {freshUser.lastName}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500 font-medium">Email</dt>
                <dd className="text-slate-900 font-semibold break-all">{freshUser.email}</dd>
              </div>
              <div>
                <dt className="text-slate-500 font-medium">Téléphone</dt>
                <dd className="text-slate-900 font-semibold">{freshUser.phone ?? '—'}</dd>
              </div>
            </dl>
          </div>
        </V2Card>

        <section aria-busy={loadingProvider}>
          {loadingProvider ? (
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-6 text-center text-sm text-slate-500">
              Chargement du statut prestataire…
            </div>
          ) : (
            <ProviderStatusBanner
              providerStatus={providerProfile?.status ?? null}
              adminNote={providerProfile?.adminNote}
              onBecomProvider={() => navigate('/profile/devenir-prestataire')}
              onGoToProviderSpace={() => navigate('/profile/prestataire')}
            />
          )}
        </section>

        <div className="pb-8">
          <button
            type="button"
            onClick={onLogout}
            className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-800 hover:bg-slate-50"
          >
            Déconnexion
          </button>
        </div>
      </main>

      <Footer onNavigate={() => navigate('/')} />
    </div>
  );
};
