import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchAllProviders } from '../api/admin.ts';
import type { Provider } from '../types.ts';
import { CATEGORY_LABELS } from '../types.ts';

export const ProvidersList: React.FC = () => {
  const [list, setList] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void fetchAllProviders().then((rows) => {
      if (!cancelled) {
        setList(rows);
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
      <h1 style={{ marginBottom: 16 }}>Prestataires</h1>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
          <thead>
            <tr style={{ textAlign: 'left', borderBottom: '1px solid #334155' }}>
              <th style={{ padding: '10px 8px' }}>Nom commercial</th>
              <th style={{ padding: '10px 8px' }}>Catégorie</th>
              <th style={{ padding: '10px 8px' }}>Statut</th>
              <th style={{ padding: '10px 8px' }}>Créé</th>
            </tr>
          </thead>
          <tbody>
            {list.map((p) => (
              <tr key={p.id} style={{ borderBottom: '1px solid #1e293b' }}>
                <td style={{ padding: '10px 8px' }}>
                  <Link to={`/providers/${p.id}`} style={{ color: '#38bdf8' }}>
                    {p.business_name}
                  </Link>
                </td>
                <td style={{ padding: '10px 8px' }}>{CATEGORY_LABELS[p.category] ?? p.category}</td>
                <td style={{ padding: '10px 8px' }}>{p.status}</td>
                <td style={{ padding: '10px 8px', color: '#94a3b8' }}>
                  {new Date(p.created_at).toLocaleDateString('fr-FR')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {list.length === 0 ? <p style={{ marginTop: 16, color: '#94a3b8' }}>Aucun prestataire.</p> : null}
      </div>
    </div>
  );
};
