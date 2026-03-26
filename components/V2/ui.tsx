import React from 'react';

export const V2_PAGE_BG = 'bg-[radial-gradient(1200px_500px_at_20%_-10%,#dbeafe_0%,transparent_55%),radial-gradient(1000px_500px_at_100%_0%,#ccfbf1_0%,transparent_50%),#f8fafc]';

export const v2Btn =
  'inline-flex items-center justify-center rounded-2xl px-4 py-2.5 text-sm font-semibold transition-colors disabled:opacity-60 disabled:cursor-not-allowed';
export const v2BtnPrimary = `${v2Btn} bg-slate-900 text-white hover:bg-slate-800`;
export const v2BtnSoft = `${v2Btn} border border-slate-200 bg-white text-slate-700 hover:bg-slate-50`;
export const v2BtnDanger = `${v2Btn} border border-rose-200 bg-white text-rose-700 hover:bg-rose-50`;

export const V2Card: React.FC<{ className?: string; children: React.ReactNode }> = ({ className = '', children }) => (
  <div className={`rounded-3xl border border-slate-200/80 bg-white/90 backdrop-blur shadow-sm ${className}`}>{children}</div>
);

export const V2SectionTitle: React.FC<{ title: string; subtitle?: string }> = ({ title, subtitle }) => (
  <div>
    <h2 className="text-lg font-black tracking-tight text-slate-900">{title}</h2>
    {subtitle ? <p className="text-sm text-slate-600 mt-1">{subtitle}</p> : null}
  </div>
);

