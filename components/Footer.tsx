import React from 'react';
import { Logo } from '@/core/constants';

interface FooterProps {
  onNavigate: (view: any) => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate }) => {
  return (
    <footer className="bg-white border-t border-slate-200 mt-auto">
      <div className="max-w-4xl mx-auto px-4 py-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <button type="button" onClick={() => onNavigate('dashboard')} className="opacity-80 hover:opacity-100">
          <Logo />
        </button>
        <p className="text-xs text-slate-400">
          © {new Date().getFullYear()} myEvent
        </p>
      </div>
    </footer>
  );
};
