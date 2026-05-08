import React from 'react';

export function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8 text-center">
      <div className="text-6xl mb-6">🔍</div>
      <h1 className="text-2xl font-bold text-gray-800 mb-2">Page introuvable</h1>
      <p className="text-gray-500 mb-8">
        Cette page n'existe pas ou a été déplacée.
      </p>
      <a
        href="/"
        className="px-6 py-3 bg-teal-500 text-white rounded-xl font-semibold"
      >
        Retour à l'accueil
      </a>
    </div>
  );
}
