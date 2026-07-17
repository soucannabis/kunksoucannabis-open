import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';

export function KunkShell() {
  return (
    <div>
      <div className="admin-top">
        <div>
          <h1 style={{ margin: 0 }}>Kunk</h1>
          <p className="muted" style={{ margin: '0.25rem 0 0' }}>
            Módulos e configurações do app operacional
          </p>
        </div>
      </div>
      <nav
        className="kunk-subnav"
        style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}
      >
        <NavLink
          to="/kunk/configuracao-profissionais"
          className={({ isActive }) => (isActive ? 'btn btn-primary' : 'btn')}
        >
          Configuração de profissionais
        </NavLink>
        <NavLink
          to="/kunk/permissoes"
          className={({ isActive }) => (isActive ? 'btn btn-primary' : 'btn')}
        >
          Permissões de acesso
        </NavLink>
        <NavLink
          to="/kunk/ciap2"
          className={({ isActive }) => (isActive ? 'btn btn-primary' : 'btn')}
        >
          CIAP-2
        </NavLink>
      </nav>
      <Outlet />
    </div>
  );
}
