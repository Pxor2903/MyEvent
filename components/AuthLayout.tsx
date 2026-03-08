import React from 'react';
import { Logo } from '@/core/constants';

export const AuthLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="min-h-screen min-h-[100dvh] flex flex-col items-center justify-center content-padding py-8 pt-[max(2rem,env(safe-area-inset-top))] pb-[max(2rem,env(safe-area-inset-bottom))] bg-slate-50">
    <div className="w-full max-w-[400px] min-w-0 flex flex-col items-center">
      <a href="/" className="flex items-center gap-2 mb-8" aria-label="myEvent accueil">
        <Logo />
      </a>
      <div className="w-full rounded-2xl border border-slate-200/80 bg-white p-6 sm:p-8 shadow-md">
        {children}
      </div>
      <p className="mt-6 text-center text-xs text-slate-400">
        En continuant, vous acceptez l’utilisation du service.
      </p>
    </div>
  </div>
);
