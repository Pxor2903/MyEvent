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
    if (!formData.title.trim()) newErrors.title = "Titre requis.";
    if (!isDateTBD && !formData.startDate) newErrors.startDate = "Choisissez une date ou cochez « À confirmer ».";
    if (isPeriod && formData.endDate && new Date(formData.endDate) <= new Date(formData.startDate)) newErrors.endDate = "La date de fin doit être après le début.";
    if (!formData.location && !isLocationUndecided) newErrors.location = "Indiquez un lieu ou cochez « À confirmer ».";
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
    <form onSubmit={handleSubmit} className="space-y-8">
      <section className="space-y-4">
        <h3 className="text-base font-semibold text-slate-900">1. Identité</h3>
        <Input label="Titre" placeholder="Ex: Mariage Sarah & Marc" value={formData.title} error={errors.title} onChange={e => setFormData({ ...formData, title: e.target.value })} />
        <div>
          <label className="text-sm font-medium text-slate-700 block mb-1">Description</label>
          <textarea
            className="w-full h-28 px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 resize-none"
            placeholder="Ambiance, objectifs..."
            value={formData.description}
            onChange={e => setFormData({ ...formData, description: e.target.value })}
          />
        </div>
      </section>

      <section className="space-y-4">
        <h3 className="text-base font-semibold text-slate-900">2. Date et lieu</h3>
        <div className="flex flex-wrap gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" checked={isDateTBD} onChange={() => setIsDateTBD(!isDateTBD)} />
            <span className="text-sm text-slate-600">Date à confirmer</span>
          </label>
          {!isDateTBD && (
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" checked={isPeriod} onChange={() => setIsPeriod(!isPeriod)} />
              <span className="text-sm text-slate-600">Plusieurs jours</span>
            </label>
          )}
        </div>
        {!isDateTBD && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label={isPeriod ? "Début" : "Date et heure"} type="datetime-local" value={formData.startDate} error={errors.startDate} onChange={e => setFormData({ ...formData, startDate: e.target.value })} />
            {isPeriod && <Input label="Fin" type="datetime-local" value={formData.endDate} error={errors.endDate} onChange={e => setFormData({ ...formData, endDate: e.target.value })} />}
          </div>
        )}
        <AddressAutocomplete onAddressSelect={(a) => setFormData({ ...formData, location: `${a.street}, ${a.city}` })} disabled={isLocationUndecided} />
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" checked={isLocationUndecided} onChange={() => setIsLocationUndecided(!isLocationUndecided)} />
          <span className="text-sm text-slate-600">Lieu à confirmer</span>
        </label>
      </section>

      <section className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 space-y-4">
        <h3 className="text-base font-semibold text-slate-900">3. Prévisions</h3>
        <div className="grid grid-cols-2 gap-4">
          <Input label="Budget (€)" type="number" value={formData.budget} onChange={e => setFormData({ ...formData, budget: e.target.value })} />
          <Input label="Invités (max)" type="number" value={formData.generalGuestsCount} onChange={e => setFormData({ ...formData, generalGuestsCount: e.target.value })} />
        </div>
      </section>

      <div className="flex gap-3 pt-4">
        <button type="button" onClick={onCancel} className="px-4 py-2.5 text-slate-600 text-sm font-medium rounded-xl hover:bg-slate-100">Annuler</button>
        <button type="submit" className="flex-1 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-700">Créer l’événement</button>
      </div>
    </form>
  );
};
