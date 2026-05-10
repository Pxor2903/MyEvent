import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSupabaseAdmin } from '../api/admin.ts';

export const LoginAdmin: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setPending(true);
    const sb = getSupabaseAdmin();
    const { error: signErr } = await sb.auth.signInWithPassword({ email, password });
    setPending(false);
    if (signErr) {
      setError(signErr.message);
      return;
    }
    navigate('/', { replace: true });
  };

  return (
    <div style={{ maxWidth: 400, margin: '80px auto', padding: 24 }}>
      <h1 style={{ marginBottom: 8 }}>Connexion admin</h1>
      <p style={{ color: '#94a3b8', fontSize: 14, marginBottom: 24 }}>Accès réservé aux comptes avec rôle admin.</p>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span style={{ fontSize: 13 }}>Email</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{ padding: 10, borderRadius: 8, border: '1px solid #475569', background: '#1e293b', color: '#f1f5f9' }}
          />
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span style={{ fontSize: 13 }}>Mot de passe</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={{ padding: 10, borderRadius: 8, border: '1px solid #475569', background: '#1e293b', color: '#f1f5f9' }}
          />
        </label>
        {error ? <p style={{ color: '#f87171', fontSize: 14 }}>{error}</p> : null}
        <button
          type="submit"
          disabled={pending}
          style={{
            padding: '12px 16px',
            borderRadius: 8,
            border: 'none',
            background: '#0ea5e9',
            color: '#fff',
            fontWeight: 600,
            cursor: pending ? 'wait' : 'pointer',
          }}
        >
          {pending ? 'Connexion…' : 'Se connecter'}
        </button>
      </form>
    </div>
  );
};
