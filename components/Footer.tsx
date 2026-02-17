
import React from 'react';
import { Logo } from '../constants';

interface FooterProps {
  onNavigate: (view: any) => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate }) => {
  return (
    <footer className="bg-white border-t border-gray-100 pt-16 pb-8 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
          <div className="space-y-4">
            <Logo />
            <p className="text-gray-500 text-sm leading-relaxed">
              La plateforme leader pour les organisateurs d'événements exigeants. Simplifiez votre logistique et gérez votre communauté.
            </p>
            <div className="flex items-center gap-4">
              {['facebook', 'twitter', 'instagram', 'linkedin'].map(social => (
                <button key={social} className="w-8 h-8 flex items-center justify-center rounded-lg bg-gray-50 text-gray-400 hover:bg-indigo-50 hover:text-indigo-600 transition-all">
                  <span className="sr-only">{social}</span>
                  <div className="w-4 h-4 bg-current rounded-sm"></div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <h4 className="font-bold text-gray-900 mb-6">Plateforme</h4>
            <ul className="space-y-4 text-sm text-gray-500">
              <li><button onClick={() => onNavigate('dashboard')} className="hover:text-indigo-600 transition-colors">Dashboard</button></li>
              <li><button className="hover:text-indigo-600 transition-colors">Planification</button></li>
              <li><button className="hover:text-indigo-600 transition-colors">Billetterie</button></li>
              <li><button className="hover:text-indigo-600 transition-colors">Analyses</button></li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-gray-900 mb-6">Compagnie</h4>
            <ul className="space-y-4 text-sm text-gray-500">
              <li><button onClick={() => onNavigate('about')} className="hover:text-indigo-600 transition-colors">À propos de nous</button></li>
              <li><button className="hover:text-indigo-600 transition-colors">Carrières</button></li>
              <li><button className="hover:text-indigo-600 transition-colors">Blog</button></li>
              <li><button className="hover:text-indigo-600 transition-colors">Partenaires</button></li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-gray-900 mb-6">Support</h4>
            <ul className="space-y-4 text-sm text-gray-500">
              <li><button onClick={() => onNavigate('contact')} className="hover:text-indigo-600 transition-colors">Nous contacter</button></li>
              <li><button className="hover:text-indigo-600 transition-colors">Centre d'aide</button></li>
              <li><button className="hover:text-indigo-600 transition-colors">Conditions d'utilisation</button></li>
              <li><button className="hover:text-indigo-600 transition-colors">Confidentialité</button></li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-xs text-gray-400 font-medium">
            © {new Date().getFullYear()} EventMaster Pro. Tous droits réservés.
          </p>
          <div className="flex items-center gap-6">
            <span className="flex items-center gap-2 text-[10px] font-bold text-emerald-500 uppercase tracking-widest">
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
              Système Opérationnel
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
};
