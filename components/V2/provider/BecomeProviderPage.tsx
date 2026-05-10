import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ProviderRegistrationForm } from './ProviderRegistrationForm';

/** Page dédiée : formulaire « Devenir prestataire » avec retour profil. */
export const BecomeProviderPage: React.FC = () => {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-slate-50">
      <div
        className="page-container content-padding py-3 border-b border-slate-200 bg-white/90"
        style={{ paddingTop: 'calc(0.75rem + var(--safe-area-top))' }}
      >
        <button
          type="button"
          onClick={() => navigate('/profile')}
          className="text-sm font-semibold text-teal-700 hover:text-teal-900"
        >
          ← Retour au profil
        </button>
      </div>
      <ProviderRegistrationForm onReturn={() => navigate('/profile')} />
    </div>
  );
};
