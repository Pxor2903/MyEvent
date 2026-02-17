
import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  icon?: React.ReactNode;
}

export const Input: React.FC<InputProps> = ({ label, error, icon, ...props }) => {
  return (
    <div className="flex flex-col gap-1 w-full">
      <div className="flex items-center justify-between px-1">
        <label className="text-sm font-bold text-gray-700">
          {label}
        </label>
        {error && (
          <span className="text-[10px] font-black text-red-500 uppercase tracking-widest flex items-center gap-1 animate-in fade-in slide-in-from-right-2 duration-300">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            {error}
          </span>
        )}
      </div>
      <div className="relative group">
        {icon && (
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-500 transition-colors">
            {icon}
          </div>
        )}
        <input
          {...props}
          className={`
            w-full py-3 px-4 ${icon ? 'pl-11' : ''}
            bg-white border-2 rounded-2xl outline-none transition-all duration-300
            placeholder:text-gray-300 text-sm font-medium
            ${error 
              ? 'border-red-200 bg-red-50/30 focus:border-red-500 focus:ring-4 focus:ring-red-500/10' 
              : 'border-gray-100 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10'
            }
            ${props.disabled ? 'opacity-50 cursor-not-allowed grayscale' : ''}
          `}
        />
      </div>
    </div>
  );
};
