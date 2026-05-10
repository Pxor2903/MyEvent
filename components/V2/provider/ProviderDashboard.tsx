import type { User } from '@/core/types';

export function ProviderDashboard({ user }: { user: User }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
      <div className="text-5xl">🎯</div>
      <h2 className="text-xl font-bold text-slate-800">Espace Prestataire</h2>
      <p className="text-slate-500 max-w-sm">
        Votre tableau de bord prestataire arrive bientôt. Gérez votre profil, vos messages et vos rendez-vous ici.
      </p>
    </div>
  );
}
