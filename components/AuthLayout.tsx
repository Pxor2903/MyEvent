import React from 'react';
import { Logo } from '@/core/constants';

export const AuthLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="min-h-screen min-h-[100dvh] flex flex-col items-center justify-center bg-slate-50 px-4 py-6 sm:py-10 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
      <div className="w-full max-w-[400px] flex flex-col items-center">
        <Logo />
        <div className="mt-6 sm:mt-8 w-full bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 sm:p-8">
          {children}
        </div>
      </div>
    </div>
  );
}
