import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { fetchAllProviders, updateProviderStatus } from '../api/admin.ts';
import type { Provider, ProviderStatus } from '../types.ts';
import { CATEGORY_LABELS } from '../types.ts';

export const ProviderDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [provider, setProvider] = useState<Provider | null>(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    void fetchAllProviders().then((rows) => {
      const found = rows.find((r) => r.id === id) ?? null;
      if (!cancelled) {
        setProvider(found);
        setNote(found?.admin_note ?? '');
      }
    });
    return () => {
      cancelled = true;
    };
  }, [id]);

  const applyStatus = async (status: ProviderStatus) => {
    if (!provider) return;
    setBusy(true);
    const ok = await updateProviderStatus(provider.id, status, note || undefined);
    setBusy(false);
    if (ok) {
      setProvider({ ...provider, status, admin_note: note || undefined });
      navigate('/providers');
    }
  };

  if (!id) {
    return <p>Identifiant manquant.</p>;
  }

  if (!provider) {
    return <p style={{ color: '#94a3b8' }}>Chargement ou prestataire introuvable…</p>;
  }

  const zone = provider.zone as Provider['zone'];

  return (
    <div>
      <p style={{ marginBottom: 16 }}>
        <Link to="/providers" style={{ color: '#38bdf8' }}>
          ← Liste
        </Link>
      </p>
      <h1 style={{ marginBottom: 8 }}>{provider.business_name}</h1>
      <p style={{ color: '#94a3b8', marginBottom: 24 }}>
        {CATEGORY_LABELS[provider.category]} · <strong>{provider.status}</strong>
      </p>

      <section style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 16, marginBottom: 8 }}>Description</h2>
        <p style={{ whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>{provider.description || '—'}</p>
      </section>

      <section style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 16, marginBottom: 8 }}>Zone</h2>
        <p style={{ color: '#cbd5e1' }}>
          {[zone?.city, zone?.region, zone?.country].filter(Boolean).join(', ') || zone?.country || '—'}
        </p>
      </section>

      <section style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 16, marginBottom: 8 }}>Documents</h2>
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {(provider.provider_documents ?? []).map((d) => (
            <li key={d.id} style={{ marginBottom: 8 }}>
              <a href={d.url} target="_blank" rel="noreferrer" style={{ color: '#38bdf8' }}>
                {d.name}
              </a>{' '}
              <span style={{ color: '#64748b', fontSize: 13 }}>({d.type})</span>
            </li>
          ))}
        </ul>
        {(provider.provider_documents ?? []).length === 0 ? <p style={{ color: '#64748b' }}>Aucun document.</p> : null}
      </section>

      <section style={{ marginBottom: 24 }}>
        <label style={{ display: 'block', marginBottom: 8, fontSize: 14 }}>Note admin (rejet / suspension)</label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
          style={{
            width: '100%',
            maxWidth: 480,
            padding: 10,
            borderRadius: 8,
            border: '1px solid #475569',
            background: '#1e293b',
            color: '#f1f5f9',
          }}
        />
      </section>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        <button
          type="button"
          disabled={busy}
          onClick={() => void applyStatus('approved')}
          style={{ padding: '10px 16px', borderRadius: 8, border: 'none', background: '#22c55e', color: '#fff', fontWeight: 600 }}
        >
          Approuver
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => void applyStatus('rejected')}
          style={{ padding: '10px 16px', borderRadius: 8, border: 'none', background: '#ef4444', color: '#fff', fontWeight: 600 }}
        >
          Rejeter
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => void applyStatus('suspended')}
          style={{ padding: '10px 16px', borderRadius: 8, border: 'none', background: '#64748b', color: '#fff', fontWeight: 600 }}
        >
          Suspendre
        </button>
      </div>
    </div>
  );
};
