import React, { useEffect, useState } from 'react';
import { fetchAdminActions } from '../api/admin.ts';
import type { AdminAction } from '../types.ts';

export const AdminActions: React.FC = () => {
  const [actions, setActions] = useState<AdminAction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void fetchAdminActions().then((rows) => {
      if (!cancelled) {
        setActions(rows);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return <p style={{ color: '#94a3b8' }}>Chargement…</p>;
  }

  return (
    <div>
      <h1 style={{ marginBottom: 16 }}>Journal des actions</h1>
      <ul style={{ listStyle: 'none', padding: 0 }}>
        {actions.map((a) => (
          <li
            key={a.id}
            style={{
              padding: '12px 0',
              borderBottom: '1px solid #1e293b',
              fontSize: 14,
            }}
          >
            <div style={{ fontWeight: 600 }}>{a.action_type}</div>
            <div style={{ color: '#94a3b8' }}>
              {a.admin_name} · {a.target_name} · {new Date(a.created_at).toLocaleString('fr-FR')}
            </div>
            {a.note ? <div style={{ marginTop: 6, color: '#cbd5e1' }}>{a.note}</div> : null}
          </li>
        ))}
      </ul>
      {actions.length === 0 ? <p style={{ color: '#94a3b8' }}>Aucune action enregistrée.</p> : null}
    </div>
  );
};
