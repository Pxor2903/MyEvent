import React, { useEffect, useState } from 'react';
import { fetchPlatformStats } from '../api/admin.ts';
import type { PlatformStats } from '../types.ts';

export const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetchPlatformStats().then(
      (s) => {
        if (!cancelled) setStats(s);
      },
      () => {
        if (!cancelled) setError('Impossible de charger les statistiques.');
      }
    );
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) {
    return <p style={{ color: '#f87171' }}>{error}</p>;
  }

  if (!stats) {
    return <p style={{ color: '#94a3b8' }}>Chargement…</p>;
  }

  const cards: { label: string; value: number }[] = [
    { label: 'Utilisateurs', value: stats.totalUsers },
    { label: 'Prestataires', value: stats.totalProviders },
    { label: 'En attente', value: stats.pendingProviders },
    { label: 'Approuvés', value: stats.approvedProviders },
    { label: 'Événements', value: stats.totalEvents },
  ];

  return (
    <div>
      <h1 style={{ marginBottom: 24 }}>Tableau de bord</h1>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 16 }}>
        {cards.map((c) => (
          <div
            key={c.label}
            style={{
              background: '#1e293b',
              border: '1px solid #334155',
              borderRadius: 12,
              padding: 16,
            }}
          >
            <div style={{ fontSize: 13, color: '#94a3b8' }}>{c.label}</div>
            <div style={{ fontSize: 28, fontWeight: 700, marginTop: 8 }}>{c.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
};
