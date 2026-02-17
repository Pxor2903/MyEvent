
import React, { useState } from 'react';
import { Input } from './Input';

interface LoginFormProps {
  onSubmit: (email: string, mdp: string) => void;
  onSocialSubmit: (provider: 'google' | 'apple') => void;
  isLoading: boolean;
  socialLoading: 'google' | 'apple' | null;
  onSwitch: () => void;
}

export const LoginForm: React.FC<LoginFormProps> = ({ onSubmit, onSocialSubmit, isLoading, socialLoading, onSwitch }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};
    if (!email) newErrors.email = "Email requis";
    if (!password) newErrors.password = "Mot de passe requis";
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    onSubmit(email, password);
  };

  const isAnyLoading = isLoading || socialLoading !== null;

  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <h2 className="text-4xl font-black text-gray-900 tracking-tighter">Accès Dashboard</h2>
        <p className="text-gray-400 font-medium">Content de vous revoir. Identifiez-vous pour continuer.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Input
          label="Adresse Email"
          type="email"
          placeholder="nom@domaine.com"
          value={email}
          error={errors.email}
          onChange={e => {
            setEmail(e.target.value);
            if(errors.email) setErrors({...errors, email: ''});
          }}
          disabled={isAnyLoading}
          icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>}
        />
        <Input
          label="Clé d'accès"
          type="password"
          placeholder="••••••••"
          value={password}
          error={errors.password}
          onChange={e => {
            setPassword(e.target.value);
            if(errors.password) setErrors({...errors, password: ''});
          }}
          disabled={isAnyLoading}
          icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>}
        />

        <div className="flex items-center justify-between text-xs font-black uppercase tracking-widest">
          <label className="flex items-center gap-2 cursor-pointer group">
            <input type="checkbox" className="sr-only peer" />
            <div className="w-5 h-5 border-2 border-gray-100 rounded-lg peer-checked:bg-indigo-600 peer-checked:border-indigo-600 transition-all"></div>
            <span className="text-gray-400 group-hover:text-gray-600 transition-colors">Session persistante</span>
          </label>
          <button type="button" className="text-indigo-600 hover:text-indigo-800 transition-colors">Perdu ?</button>
        </div>

        <button
          type="submit"
          disabled={isAnyLoading}
          className="w-full py-5 px-8 bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase tracking-widest text-[11px] rounded-2xl transition-all shadow-xl shadow-indigo-100 disabled:opacity-50 flex items-center justify-center gap-3"
        >
          {isLoading ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
          ) : 'Se connecter au système'}
        </button>
      </form>

      <div className="relative my-10">
        <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-100"></div></div>
        <div className="relative flex justify-center text-[10px] font-black uppercase tracking-[0.2em] text-gray-300"><span className="px-4 bg-white">Ou avec</span></div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        <button 
          onClick={() => onSocialSubmit('google')}
          disabled={isAnyLoading}
          className="flex items-center justify-center gap-3 py-4 px-6 bg-white border-2 border-gray-50 rounded-2xl hover:bg-gray-50 transition-all font-bold text-gray-700 text-sm disabled:opacity-50"
        >
          <img src="https://www.gstatic.com/images/branding/product/1x/gsa_512dp.png" className="w-5 h-5" alt="Google" />
          Continuer avec Google
        </button>
        {typeof window !== 'undefined' && !/^https?:\/\/localhost(:\d+)?\/?$/.test(window.location.origin) && (
          <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-xl p-3">
            Connexion depuis l’IP : pour que la redirection après Google reste ici, ajoute dans Supabase → <strong>Authentication → URL Configuration → Redirect URLs</strong> cette URL exacte :<br />
            <code className="block mt-1 break-all font-mono text-[10px]">{window.location.origin}/**</code>
          </p>
        )}
      </div>

      <p className="text-center text-xs font-bold text-gray-400">
        Nouveau ici ?{' '}
        <button onClick={onSwitch} className="text-indigo-600 hover:underline underline-offset-4">Ouvrir un compte</button>
      </p>
    </div>
  );
};
