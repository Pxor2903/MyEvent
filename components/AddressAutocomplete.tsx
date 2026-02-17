
import React, { useState, useEffect, useRef } from 'react';
import { Input } from './Input';

interface AddressAutocompleteProps {
  onAddressSelect: (address: { street: string; city: string; zipCode: string }) => void;
  error?: string;
  disabled?: boolean;
}

export const AddressAutocomplete: React.FC<AddressAutocompleteProps> = ({ onAddressSelect, error, disabled }) => {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (query.length < 5) { // Un peu plus long pour éviter trop d'appels inutiles
      setSuggestions([]);
      return;
    }

    setIsSearching(true);
    const timer = setTimeout(async () => {
      try {
        const response = await fetch(`https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(query)}&limit=5&type=housenumber`);
        const data = await response.json();
        setSuggestions(data.features || []);
        setShowDropdown(true);
      } catch (err) {
        console.error('Failed to fetch addresses', err);
      } finally {
        setIsSearching(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [query]);

  const handleSelect = (feature: any) => {
    const { name, postcode, city } = feature.properties;
    setQuery(feature.properties.label);
    setSuggestions([]);
    setShowDropdown(false);
    onAddressSelect({
      street: name,
      zipCode: postcode,
      city: city
    });
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <Input
        label="Rechercher une adresse exacte"
        placeholder="Numéro et nom de rue..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        error={error}
        disabled={disabled}
        icon={isSearching ? (
          <div className="w-5 h-5 border-2 border-indigo-200 border-t-indigo-500 rounded-full animate-spin"></div>
        ) : (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
        )}
      />
      
      {showDropdown && suggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="px-3 py-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest bg-gray-50 border-b border-gray-100">
            Adresses suggérées par l'API BAN
          </div>
          {suggestions.map((s, i) => (
            <button
              key={i}
              type="button"
              className="w-full text-left px-4 py-3 hover:bg-indigo-50 transition-colors border-b last:border-0 border-gray-100 flex flex-col group"
              onClick={() => handleSelect(s)}
            >
              <span className="font-semibold text-gray-900 group-hover:text-indigo-600 text-sm transition-colors">{s.properties.label}</span>
              <span className="text-xs text-gray-500">{s.properties.context}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
