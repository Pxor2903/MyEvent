
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

export const RegisterForm: React.FC<RegisterFormProps> = ({ onSubmit, onSocialSubmit, isLoading, socialLoading, onSwitch }) => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    street: '',
    city: '',
    zipCode: '',
    password: '',
    confirmPassword: ''
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.firstName) newErrors.firstName = "Le prénom est requis";
    if (!formData.lastName) newErrors.lastName = "Le nom est requis";
    if (!formData.email.match(/^\S+@\S+\.\S+$/)) newErrors.email = "Email invalide";
    if (!formData.phone.match(/^\+?[0-9\s-]{10,}$/)) newErrors.phone = "Numéro de téléphone invalide";
    if (!formData.street) newErrors.street = "La rue est requise";
    if (!formData.city) newErrors.city = "La ville est requise";
    if (!formData.zipCode) newErrors.zipCode = "Le code postal est requis";
    if (formData.password.length < 8) newErrors.password = "Le mot de passe doit faire au moins 8 caractères";
    if (formData.password !== formData.confirmPassword) newErrors.confirmPassword = "Les mots de passe ne correspondent pas";
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleAddressSelect = (addr: { street: string; city: string; zipCode: string }) => {
    setFormData(prev => ({
      ...prev,
      street: addr.street,
      city: addr.city,
      zipCode: addr.zipCode
    }));
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
      <div className="space-y-2">
        <h2 className="text-3xl font-bold text-gray-900">Créer un compte</h2>
        <p className="text-gray-500">Rejoignez-nous et commencez à organiser vos événements.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Prénom"
            placeholder="Jean"
            value={formData.firstName}
            onChange={e => setFormData({...formData, firstName: e.target.value})}
            error={errors.firstName}
            disabled={isAnyLoading}
          />
          <Input
            label="Nom"
            placeholder="Dupont"
            value={formData.lastName}
            onChange={e => setFormData({...formData, lastName: e.target.value})}
            error={errors.lastName}
            disabled={isAnyLoading}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Email"
            type="email"
            placeholder="jean@exemple.fr"
            value={formData.email}
            onChange={e => setFormData({...formData, email: e.target.value})}
            error={errors.email}
            disabled={isAnyLoading}
            icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>}
          />
          <Input
            label="Téléphone"
            type="tel"
            placeholder="06 12 34 56 78"
            value={formData.phone}
            onChange={e => setFormData({...formData, phone: e.target.value})}
            error={errors.phone}
            disabled={isAnyLoading}
            icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/></svg>}
          />
        </div>

        <div className="space-y-4 pt-2 pb-2">
          <div className="p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100 space-y-4">
            <AddressAutocomplete 
              onAddressSelect={handleAddressSelect} 
              disabled={isAnyLoading}
              error={errors.street || errors.city || errors.zipCode}
            />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="md:col-span-1">
                <Input
                  label="Code Postal"
                  placeholder="75001"
                  value={formData.zipCode}
                  onChange={e => setFormData({...formData, zipCode: e.target.value})}
                  error={errors.zipCode}
                  disabled={isAnyLoading}
                />
              </div>
              <div className="md:col-span-2">
                <Input
                  label="Ville"
                  placeholder="Paris"
                  value={formData.city}
                  onChange={e => setFormData({...formData, city: e.target.value})}
                  error={errors.city}
                  disabled={isAnyLoading}
                />
              </div>
            </div>
            <Input
              label="Rue / Complément"
              placeholder="Ex: 12 bis rue de la paix"
              value={formData.street}
              onChange={e => setFormData({...formData, street: e.target.value})}
              error={errors.street}
              disabled={isAnyLoading}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Mot de passe"
            type="password"
            placeholder="••••••••"
            value={formData.password}
            onChange={e => setFormData({...formData, password: e.target.value})}
            error={errors.password}
            disabled={isAnyLoading}
          />
          <Input
            label="Confirmation"
            type="password"
            placeholder="••••••••"
            value={formData.confirmPassword}
            onChange={e => setFormData({...formData, confirmPassword: e.target.value})}
            error={errors.confirmPassword}
            disabled={isAnyLoading}
          />
        </div>

        <button
          type="submit"
          disabled={isAnyLoading}
          className="w-full py-4 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-all shadow-lg shadow-indigo-200 disabled:opacity-50 flex items-center justify-center gap-2 mt-4"
        >
          {isLoading ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
          ) : 'S\'inscrire'}
        </button>
      </form>

      <div className="relative my-8">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-200"></div>
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-2 bg-white text-gray-500 font-medium uppercase tracking-wider">ou continuer avec</span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        <button 
          onClick={() => onSocialSubmit('google')}
          disabled={isAnyLoading}
          className="flex items-center justify-center gap-3 py-2.5 px-4 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors font-medium disabled:opacity-50"
        >
          {socialLoading === 'google' ? (
            <div className="w-5 h-5 border-2 border-gray-300 border-t-indigo-600 rounded-full animate-spin"></div>
          ) : (
            <>
              <img src="https://www.gstatic.com/images/branding/product/1x/gsa_512dp.png" className="w-5 h-5" alt="Google" />
              Continuer avec Google
            </>
          )}
        </button>
      </div>

      <p className="text-center text-gray-500 text-sm pb-4">
        Déjà un compte ?{' '}
        <button onClick={onSwitch} className="text-indigo-600 font-bold hover:underline">Se connecter</button>
      </p>
    </div>
  );
};
