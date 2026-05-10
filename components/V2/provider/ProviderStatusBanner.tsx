import React from 'react';
import type { ProviderStatus } from '@/core/types';

export interface ProviderStatusBannerProps {
  providerStatus: ProviderStatus | null;
  adminNote?: string;
  /** Ouvre le formulaire prestataire */
  onBecomProvider: () => void;
  /** Vers l’espace prestataire */
  onGoToProviderSpace: () => void;
}

export const ProviderStatusBanner: React.FC<ProviderStatusBannerProps> = ({
  providerStatus,
  adminNote,
  onBecomProvider,
  onGoToProviderSpace,
}) => {
  if (providerStatus === null) {
    return (
      <div className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-4 sm:px-5 sm:py-5 shadow-sm">
        <h3 className="text-base font-bold text-blue-950">Proposez vos services sur myEvent</h3>
        <p className="mt-1.5 text-sm text-blue-900/90 leading-relaxed">
          Inscrivez-vous comme prestataire et soyez découvert par des milliers d&apos;organisateurs
        </p>
        <button
          type="button"
          onClick={onBecomProvider}
          className="mt-4 inline-flex items-center rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 transition-colors"
        >
          Devenir prestataire →
        </button>
      </div>
    );
  }

  if (providerStatus === 'pending') {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 sm:px-5 sm:py-5 shadow-sm">
        <div className="flex items-start gap-3">
          <span className="text-2xl leading-none" aria-hidden>
            ⏳
          </span>
          <div>
            <h3 className="text-base font-bold text-amber-950">Demande en cours d&apos;examen</h3>
            <p className="mt-1.5 text-sm text-amber-900/90 leading-relaxed">
              Notre équipe examine votre dossier. Vous serez notifié sous 48h.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (providerStatus === 'approved') {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4 sm:px-5 sm:py-5 shadow-sm">
        <h3 className="text-base font-bold text-emerald-950">Compte prestataire actif ✓</h3>
        <p className="mt-1.5 text-sm text-emerald-900/90 leading-relaxed">
          Votre profil est visible dans l&apos;annuaire myEvent
        </p>
        <button
          type="button"
          onClick={onGoToProviderSpace}
          className="mt-4 inline-flex items-center rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 transition-colors"
        >
          Gérer mon espace prestataire →
        </button>
      </div>
    );
  }

  if (providerStatus === 'rejected') {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-4 sm:px-5 sm:py-5 shadow-sm">
        <h3 className="text-base font-bold text-rose-950">Demande non approuvée</h3>
        <p className="mt-1.5 text-sm text-rose-900/90 leading-relaxed">
          {adminNote?.trim()
            ? adminNote
            : 'Votre demande n’a pas été validée. Vous pouvez soumettre une nouvelle candidature.'}
        </p>
        <button
          type="button"
          onClick={onBecomProvider}
          className="mt-4 inline-flex items-center rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-rose-700 transition-colors"
        >
          Soumettre une nouvelle demande →
        </button>
      </div>
    );
  }

  if (providerStatus === 'suspended') {
    return (
      <div className="rounded-2xl border border-slate-300 bg-slate-100 px-4 py-4 sm:px-5 sm:py-5 shadow-sm">
        <h3 className="text-base font-bold text-slate-900">Compte prestataire suspendu</h3>
        <p className="mt-1.5 text-sm text-slate-700 leading-relaxed">
          {adminNote?.trim()
            ? adminNote
            : 'Votre compte prestataire est temporairement suspendu. Contactez le support pour plus d’informations.'}
        </p>
      </div>
    );
  }

  return null;
};
