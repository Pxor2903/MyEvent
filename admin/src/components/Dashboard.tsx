import React, { useEffect, useState } from 'react';
import { fetchPlatformStats } from '../api/admin.ts';
import type { PlatformStats } from '../types.ts';

type Accent = 'blue' | 'teal' | 'violet' | 'orange';

const ACCENT_BORDER: Record<Accent, string> = {
  blue: 'rgba(59, 130, 246, 0.3)',
  teal: 'rgba(20, 184, 166, 0.3)',
  violet: 'rgba(139, 92, 246, 0.3)',
  orange: 'rgba(249, 115, 22, 0.45)',
};

function StatCard({
  icon,
  label,
  value,
  accent,
  empty,
}: {
  icon: string;
  label: string;
  value?: number;
  accent: Accent;
  empty?: boolean;
}) {
  return (
    <div
      style={{
        background: '#1e293b',
        border: `1px solid ${ACCENT_BORDER[accent]}`,
        borderRadius: 12,
        padding: 16,
        minHeight: 108,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
      }}
    >
      <span style={{ fontSize: 22, lineHeight: 1 }} aria-hidden>
        {icon}
      </span>
      <div>
        <div style={{ fontSize: 13, color: '#94a3b8', marginTop: 10 }}>{label}</div>
        {empty ? (
          <div style={{ fontSize: 22, fontWeight: 600, color: '#475569', marginTop: 8 }}>—</div>
        ) : (
          <div style={{ fontSize: 28, fontWeight: 700, color: '#ffffff', marginTop: 8 }}>
            {value ?? 0}
          </div>
        )}
      </div>
    </div>
  );
}

export const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const s = await fetchPlatformStats();
        if (!cancelled) setStats(s);
      } catch {
        if (!cancelled) setError('Impossible de charger les statistiques.');
      }
    };

    void load();

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

  const pendingAccent: Accent = stats.pendingProviders > 0 ? 'orange' : 'violet';

  return (
    <div>
      <h1 style={{ marginBottom: 24, color: '#f1f5f9' }}>Tableau de bord</h1>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
          gap: 16,
        }}
      >
        <StatCard icon="👥" label="Total inscrits" value={stats.totalUsers} accent="blue" />
        <StatCard icon="📈" label="Actifs ce mois" value={stats.usersActiveThisMonth} accent="blue" />
        <StatCard icon="🎉" label="Ont créé un événement" value={stats.usersWithEvents} accent="blue" />

        <StatCard icon="📅" label="Total événements" value={stats.totalEvents} accent="teal" />
        <StatCard icon="⚡" label="Événements en cours" value={stats.eventsActive} accent="teal" />
        <StatCard icon="🔮" label="À venir" accent="teal" empty />

        <StatCard icon="🏢" label="Total prestataires" value={stats.totalProviders} accent="violet" />
        <StatCard
          icon="⏳"
          label="En attente"
          value={stats.pendingProviders}
          accent={pendingAccent}
        />
        <StatCard icon="✅" label="Approuvés" value={stats.approvedProviders} accent="violet" />
      </div>
    </div>
  );
};
