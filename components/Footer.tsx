import React from 'react';
import { Logo } from '@/core/constants';

interface FooterProps {
  onNavigate: (view: any) => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate }) => (
  <footer className="bg-white border-t border-slate-200 mt-auto pb-[env(safe-area-inset-bottom)]">
    <div className="max-w-4xl mx-auto px-4 py-5 flex flex-col sm:flex-row items-center justify-between gap-4">
      <button
        type="button"
        onClick={() => onNavigate('dashboard')}
        className="min-h-[44px] min-w-[44px] flex items-center justify-center opacity-90 hover:opacity-100 active:opacity-100 transition-opacity"
        aria-label="Retour à l’accueil"
      >
        <Logo />
      </button>
      <p className="text-xs text-slate-400">© {new Date().getFullYear()} myEvent</p>
    </div>
  </footer>
);
