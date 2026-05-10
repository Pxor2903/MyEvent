import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';

const linkStyle = { color: '#94a3b8', textDecoration: 'none', padding: '8px 12px', borderRadius: 8 };
const activeStyle = { ...linkStyle, color: '#f8fafc', background: '#334155' };

export const AdminLayout: React.FC = () => (
  <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
    <header
      style={{
        borderBottom: '1px solid #334155',
        padding: '12px 24px',
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        flexWrap: 'wrap',
      }}
    >
      <strong style={{ marginRight: 16 }}>myEvent Admin</strong>
      <nav style={{ display: 'flex', gap: 8 }}>
        <NavLink to="/" end style={({ isActive }) => (isActive ? activeStyle : linkStyle)}>
          Tableau de bord
        </NavLink>
        <NavLink to="/providers" style={({ isActive }) => (isActive ? activeStyle : linkStyle)}>
          Prestataires
        </NavLink>
        <NavLink to="/actions" style={({ isActive }) => (isActive ? activeStyle : linkStyle)}>
          Journal
        </NavLink>
      </nav>
    </header>
    <main style={{ flex: 1, padding: 24 }}>
      <Outlet />
    </main>
  </div>
);
