import React from 'react';
import { useNavigate } from 'react-router-dom';
import { V2Card } from '@/components/V2/ui';

/** Espace prestataire complet : placeholder en attendant les écrans métier. */
export const ProviderSpacePlaceholder: React.FC = () => {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-slate-50">
      <div
        className="page-container content-padding py-4 border-b border-slate-200 bg-white"
        style={{ paddingTop: 'calc(1rem + var(--safe-area-top))' }}
      >
        <button
          type="button"
          onClick={() => navigate('/profile')}
          className="text-sm font-semibold text-teal-700 hover:text-teal-900"
        >
          ← Retour au profil
        </button>
      </div>
      <main className="page-container content-padding py-8 max-w-lg mx-auto">
        <V2Card className="p-8 space-y-4">
          <h1 className="text-xl font-black text-slate-900 tracking-tight">Espace prestataire</h1>
          <p className="text-sm text-slate-600 leading-relaxed">
            La gestion complète de votre vitrine (annonces, messages, disponibilités) arrive prochainement ici.
          </p>
          <button
            type="button"
            onClick={() => navigate('/profile')}
            className="w-full rounded-2xl bg-teal-600 text-white py-3 text-sm font-bold hover:bg-teal-700 transition-colors"
          >
            Retour au profil
          </button>
        </V2Card>
      </main>
    </div>
  );
};
