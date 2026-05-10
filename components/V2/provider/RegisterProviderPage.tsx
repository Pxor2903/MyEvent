import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ProviderRegistrationForm } from './ProviderRegistrationForm';

/** Route post-inscription : compléter le profil prestataire (utilisateur connecté). */
export const RegisterProviderPage: React.FC = () => {
  const navigate = useNavigate();
  const goHome = () => navigate('/', { replace: true });
  return (
    <div className="min-h-screen bg-slate-50">
      <div
        className="page-container content-padding py-3 border-b border-slate-200 bg-white/90"
        style={{ paddingTop: 'calc(0.75rem + var(--safe-area-top))' }}
      >
        <button type="button" onClick={goHome} className="text-sm font-semibold text-teal-700 hover:text-teal-900">
          ← Accueil
        </button>
      </div>
      <ProviderRegistrationForm onComplete={goHome} onReturn={goHome} />
    </div>
  );
};
