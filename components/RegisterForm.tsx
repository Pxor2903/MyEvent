import React, { useState } from 'react';
import { Input } from './Input';
import { AddressAutocomplete } from './AddressAutocomplete';
import type { RegisterData } from '@/core/types';

interface RegisterFormProps {
  onSubmit: (data: RegisterData) => void;
  onSocialSubmit: (provider: 'google' | 'apple') => void;
  isLoading: boolean;
  socialLoading: 'google' | 'apple' | null;
  onSwitch: () => void;
}

export const RegisterForm: React.FC<RegisterFormProps> = ({
  onSubmit,
  onSocialSubmit,
  isLoading,
  socialLoading,
  onSwitch,
}) => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    street: '',
    city: '',
    zipCode: '',
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.firstName) newErrors.firstName = 'Prénom requis';
    if (!formData.lastName) newErrors.lastName = 'Nom requis';
    if (!formData.email.match(/^\S+@\S+\.\S+$/)) newErrors.email = 'Email invalide';
    if (!formData.phone.match(/^\+?[0-9\s-]{10,}$/)) newErrors.phone = 'Téléphone invalide';
    if (!formData.street) newErrors.street = 'Adresse requise';
    if (!formData.city) newErrors.city = 'Ville requise';
    if (!formData.zipCode) newErrors.zipCode = 'Code postal requis';
    if (formData.password.length < 8) newErrors.password = '8 caractères minimum';
    if (formData.password !== formData.confirmPassword) newErrors.confirmPassword = 'Mots de passe différents';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleAddressSelect = (addr: { street: string; city: string; zipCode: string }) => {
    setFormData(prev => ({ ...prev, street: addr.street, city: addr.city, zipCode: addr.zipCode }));
    setErrors(prev => {
      const { street, city, zipCode, ...rest } = prev;
      return rest;
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      const { confirmPassword, ...data } = formData;
      onSubmit(data as RegisterData);
    }
  };

  const isAnyLoading = isLoading || socialLoading !== null;

  return (
    <div className="space-y-6">
      <div className="text-center sm:text-left">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Créer un compte</h1>
        <p className="mt-1.5 text-sm text-slate-500">Organisez vos événements en quelques clics.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Input label="Prénom" placeholder="Jean" value={formData.firstName} onChange={e => setFormData({ ...formData, firstName: e.target.value })} error={errors.firstName} disabled={isAnyLoading} />
          <Input label="Nom" placeholder="Dupont" value={formData.lastName} onChange={e => setFormData({ ...formData, lastName: e.target.value })} error={errors.lastName} disabled={isAnyLoading} />
        </div>
        <Input label="Email" type="email" placeholder="jean@exemple.fr" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} error={errors.email} disabled={isAnyLoading} />
        <Input label="Téléphone" type="tel" placeholder="06 12 34 56 78" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} error={errors.phone} disabled={isAnyLoading} />

        <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 space-y-3">
          <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Adresse</p>
          <AddressAutocomplete onAddressSelect={handleAddressSelect} disabled={isAnyLoading} error={errors.street || errors.city || errors.zipCode} />
          <div className="grid grid-cols-3 gap-2">
            <Input label="CP" placeholder="75001" value={formData.zipCode} onChange={e => setFormData({ ...formData, zipCode: e.target.value })} error={errors.zipCode} disabled={isAnyLoading} />
            <div className="col-span-2">
              <Input label="Ville" placeholder="Paris" value={formData.city} onChange={e => setFormData({ ...formData, city: e.target.value })} error={errors.city} disabled={isAnyLoading} />
            </div>
          </div>
          <Input label="Rue" placeholder="12 rue de la Paix" value={formData.street} onChange={e => setFormData({ ...formData, street: e.target.value })} error={errors.street} disabled={isAnyLoading} />
        </div>

        <Input label="Mot de passe" type="password" placeholder="••••••••" value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} error={errors.password} disabled={isAnyLoading} />
        <Input label="Confirmer le mot de passe" type="password" placeholder="••••••••" value={formData.confirmPassword} onChange={e => setFormData({ ...formData, confirmPassword: e.target.value })} error={errors.confirmPassword} disabled={isAnyLoading} />

        <button
          type="submit"
          disabled={isAnyLoading}
          className="w-full min-h-[48px] py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-sm font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {isLoading ? <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : "S'inscrire"}
        </button>
      </form>

      <div className="relative py-2">
        <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200" /></div>
        <div className="relative flex justify-center"><span className="bg-white px-3 text-xs font-medium text-slate-400">ou</span></div>
      </div>
      <button
        type="button"
        onClick={() => onSocialSubmit('google')}
        disabled={isAnyLoading}
        className="w-full min-h-[48px] flex items-center justify-center gap-3 py-3 px-4 bg-white border border-slate-200 rounded-xl text-slate-700 text-sm font-medium hover:bg-slate-50 disabled:opacity-50"
      >
        <img src="https://www.gstatic.com/images/branding/product/1x/gsa_512dp.png" className="w-5 h-5" alt="" />
        Google
      </button>

      <p className="text-center text-sm text-slate-500 pt-2">
        Déjà un compte ?{' '}
        <button type="button" onClick={onSwitch} className="font-semibold text-indigo-600 hover:text-indigo-700 hover:underline">Se connecter</button>
      </p>
    </div>
  );
};
