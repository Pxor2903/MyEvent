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
    <div className="space-y-6">
      <div className="text-center sm:text-left">
        <h1 className="text-xl font-semibold text-slate-900">Connexion</h1>
        <p className="mt-1 text-sm text-slate-500">Accédez à vos événements</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Email"
          type="email"
          placeholder="vous@exemple.fr"
          value={email}
          error={errors.email}
          onChange={e => {
            setEmail(e.target.value);
            if (errors.email) setErrors({ ...errors, email: '' });
          }}
          disabled={isAnyLoading}
        />
        <Input
          label="Mot de passe"
          type="password"
          placeholder="••••••••"
          value={password}
          error={errors.password}
          onChange={e => {
            setPassword(e.target.value);
            if (errors.password) setErrors({ ...errors, password: '' });
          }}
          disabled={isAnyLoading}
        />
        <button
          type="submit"
          disabled={isAnyLoading}
          className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            'Se connecter'
          )}
        </button>
      </form>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-slate-200" />
        </div>
        <div className="relative flex justify-center">
          <span className="bg-white px-3 text-xs text-slate-400">ou</span>
        </div>
      </div>

      <div className="space-y-3">
        <button
          type="button"
          onClick={() => onSocialSubmit('google')}
          disabled={isAnyLoading}
          className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-white border border-slate-200 rounded-xl text-slate-700 text-sm font-medium hover:bg-slate-50 transition-colors disabled:opacity-50"
        >
          <img src="https://www.gstatic.com/images/branding/product/1x/gsa_512dp.png" className="w-5 h-5" alt="" />
          Google
        </button>
        {typeof window !== 'undefined' && !/^https?:\/\/localhost(:\d+)?\/?$/.test(window.location.origin) && (
          <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3">
            Connexion depuis l’IP : ajoute dans Supabase → Authentication → URL Configuration → Redirect URLs cette URL :<br />
            <code className="block mt-1 break-all font-mono text-[10px]">{window.location.origin}/**</code>
          </p>
        )}
      </div>

      <p className="text-center text-sm text-slate-500">
        Pas encore de compte ?{' '}
        <button type="button" onClick={onSwitch} className="text-indigo-600 font-medium hover:underline">
          S’inscrire
        </button>
      </p>
    </div>
  );
};
