
import React, { useState } from 'react';
import type { Event, SubEvent, User } from '@/core/types';
import { Input } from './Input';
import { AddressAutocomplete } from './AddressAutocomplete';

interface EventFormProps {
  user: User;
  onSubmit: (event: Omit<Event, 'id' | 'shareCode' | 'sharePassword' | 'isGuestChatEnabled' | 'organizers'>) => void;
  onCancel: () => void;
}

export const EventForm: React.FC<EventFormProps> = ({ user, onSubmit, onCancel }) => {
  const [isPeriod, setIsPeriod] = useState(false);
  const [isDateTBD, setIsDateTBD] = useState(false);
  const [isLocationUndecided, setIsLocationUndecided] = useState(false);
  const [subEvents, setSubEvents] = useState<SubEvent[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    startDate: '',
    endDate: '',
    location: '',
    category: 'Social' as Event['category'],
    generalGuestsCount: '0',
    budget: '0',
  });

  const addSubEvent = () => {
    const newSub: SubEvent = {
      id: crypto.randomUUID(),
      title: '',
      date: '',
      location: '',
      estimatedGuests: 0,
      keyMoments: []
    };
    setSubEvents([...subEvents, newSub]);
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.title.trim()) newErrors.title = "Un titre est indispensable pour commencer.";
    
    if (!isDateTBD && !formData.startDate) {
      newErrors.startDate = "Veuillez choisir une date ou cocher 'À confirmer'.";
    }

    if (isPeriod && formData.endDate && new Date(formData.endDate) <= new Date(formData.startDate)) {
      newErrors.endDate = "La date de fin doit être ultérieure au début.";
    }

    if (!formData.location && !isLocationUndecided) {
      newErrors.location = "Précisez un lieu ou cochez 'À confirmer'.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      onSubmit({
        ...formData,
        generalGuestsCount: parseInt(formData.generalGuestsCount) || 0,
        budget: parseFloat(formData.budget) || 0,
        isPeriod,
        isDateTBD,
        subEvents,
        guests: [],
        creatorId: user.id,
        startDate: isDateTBD ? undefined : formData.startDate,
        endDate: (isPeriod && !isDateTBD) ? formData.endDate : undefined,
        date: isDateTBD ? undefined : formData.startDate 
      });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-12 animate-in fade-in slide-in-from-bottom-6 duration-700">
      <section className="space-y-8">
        <header className="border-b border-gray-100 pb-4">
          <h3 className="text-xl font-black text-gray-900 tracking-tight flex items-center gap-3">
            <span className="w-8 h-8 bg-indigo-600 text-white rounded-lg flex items-center justify-center text-sm">1</span>
            Identité de l'événement
          </h3>
        </header>
        
        <Input 
          label="Titre du projet" 
          placeholder="Ex: Mariage de Sarah & Marc" 
          required
          value={formData.title}
          error={errors.title}
          onChange={e => setFormData({...formData, title: e.target.value})}
        />
        
        <div className="flex flex-col gap-2">
          <label className="text-sm font-bold text-gray-700 ml-1">Présentation / Brief</label>
          <textarea 
            className="w-full h-32 p-5 bg-white border-2 border-gray-100 rounded-[2rem] outline-none focus:border-indigo-500 transition-all resize-none text-sm font-medium leading-relaxed"
            placeholder="Décrivez l'ambiance, les objectifs, les contraintes..."
            value={formData.description}
            onChange={e => setFormData({...formData, description: e.target.value})}
          />
        </div>
      </section>

      <section className="space-y-8">
        <header className="border-b border-gray-100 pb-4">
          <h3 className="text-xl font-black text-gray-900 tracking-tight flex items-center gap-3">
            <span className="w-8 h-8 bg-amber-500 text-white rounded-lg flex items-center justify-center text-sm">2</span>
            Temporalité & Lieu
          </h3>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-6">
            <div className="flex items-center gap-6 mb-2">
              <label className="flex items-center gap-2 cursor-pointer group">
                <input type="checkbox" className="sr-only peer" checked={isDateTBD} onChange={() => setIsDateTBD(!isDateTBD)} />
                <div className="w-5 h-5 border-2 border-gray-200 rounded-lg peer-checked:bg-indigo-600 peer-checked:border-indigo-600 transition-all"></div>
                <span className="text-[10px] font-black uppercase text-gray-400 peer-checked:text-indigo-600">Date à confirmer</span>
              </label>
              {!isDateTBD && (
                <label className="flex items-center gap-2 cursor-pointer group">
                  <input type="checkbox" className="sr-only peer" checked={isPeriod} onChange={() => setIsPeriod(!isPeriod)} />
                  <div className="w-5 h-5 border-2 border-gray-200 rounded-lg peer-checked:bg-indigo-600 peer-checked:border-indigo-600 transition-all"></div>
                  <span className="text-[10px] font-black uppercase text-gray-400 peer-checked:text-indigo-600">Sur plusieurs jours</span>
                </label>
              )}
            </div>

            {!isDateTBD && (
              <div className="grid grid-cols-1 gap-4 animate-in slide-in-from-top-2">
                <Input 
                  label={isPeriod ? "Date de début" : "Date & Heure"} 
                  type="datetime-local" 
                  value={formData.startDate} 
                  error={errors.startDate} 
                  onChange={e => setFormData({...formData, startDate: e.target.value})} 
                />
                {isPeriod && (
                  <Input 
                    label="Date de fin" 
                    type="datetime-local" 
                    value={formData.endDate} 
                    error={errors.endDate} 
                    onChange={e => setFormData({...formData, endDate: e.target.value})} 
                  />
                )}
              </div>
            )}
          </div>

          <div className="space-y-6">
            <AddressAutocomplete onAddressSelect={(a) => setFormData({...formData, location: `${a.street}, ${a.city}`})} disabled={isLocationUndecided} />
            <label className="flex items-center gap-2 cursor-pointer group">
              <input type="checkbox" className="sr-only peer" checked={isLocationUndecided} onChange={() => setIsLocationUndecided(!isLocationUndecided)} />
              <div className="w-5 h-5 border-2 border-gray-200 rounded-lg peer-checked:bg-indigo-600 peer-checked:border-indigo-600 transition-all"></div>
              <span className="text-[10px] font-black uppercase text-gray-400 peer-checked:text-indigo-600">Lieu à confirmer</span>
            </label>
          </div>
        </div>
      </section>

      <section className="bg-gray-50/50 p-8 rounded-[3rem] border border-gray-100 space-y-6">
        <h4 className="text-sm font-black text-gray-400 uppercase tracking-widest px-2">Logistique prévisionnelle</h4>
        <div className="grid grid-cols-2 gap-6">
          <Input label="Budget estimé (€)" type="number" value={formData.budget} onChange={e => setFormData({...formData, budget: e.target.value})} />
          <Input label="Nb d'invités (Max)" type="number" value={formData.generalGuestsCount} onChange={e => setFormData({...formData, generalGuestsCount: e.target.value})} />
        </div>
      </section>

      <div className="flex flex-col sm:flex-row items-center gap-4 pt-10">
        <button type="button" onClick={onCancel} className="w-full sm:w-auto px-10 py-5 text-gray-400 font-black uppercase tracking-widest text-[11px]">Abandonner</button>
        <button type="submit" className="w-full sm:flex-1 py-5 bg-indigo-600 text-white font-black uppercase tracking-widest text-[11px] rounded-3xl shadow-2xl shadow-indigo-200 hover:scale-[1.02] active:scale-[0.98] transition-all">
          Créer l'espace de gestion
        </button>
      </div>
    </form>
  );
};
