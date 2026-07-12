import React from 'react';
import { NavLink, Navigate, Outlet, useNavigate } from 'react-router-dom';
import { useOperatorAuth } from '@kunk/auth-session';

export function RequireAdmin({ children }) {
  const { user, loading, hasRequiredRole } = useOperatorAuth();

  if (loading) {
    return <div className="login-page muted">Carregando sessão…</div>;
  }
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  if (!hasRequiredRole) {
    return <Navigate to="/sem-permissao" replace />;
  }
  return children;
}

export function AdminShell() {
  const { user, logout } = useOperatorAuth();
  const navigate = useNavigate();

  async function onLogout() {
    await logout();
    navigate('/login');
  }

  return (
    <div className="admin-shell">
      <aside className="admin-nav">
        <div className="brand">Kunk Admin</div>
        <NavLink to="/dados" className={({ isActive }) => (isActive ? 'active' : '')}>Dados</NavLink>
        <NavLink to="/arquivos" className={({ isActive }) => (isActive ? 'active' : '')}>Arquivos</NavLink>
        <NavLink to="/configs" className={({ isActive }) => (isActive ? 'active' : '')}>Configs</NavLink>
        <NavLink to="/aparencia" className={({ isActive }) => (isActive ? 'active' : '')}>Aparência</NavLink>
        <NavLink to="/triagem" className={({ isActive }) => (isActive ? 'active' : '')}>Triagem</NavLink>
        <NavLink to="/loja" className={({ isActive }) => (isActive ? 'active' : '')}>Loja</NavLink>
        <NavLink to="/servicos-externos" className={({ isActive }) => (isActive ? 'active' : '')}>Serviços externos</NavLink>
        <NavLink to="/usuarios" className={({ isActive }) => (isActive ? 'active' : '')}>Usuários</NavLink>
        <div style={{ flex: 1 }} />
        <div className="muted" style={{ fontSize: '0.8rem', padding: '0.5rem' }}>
          {user?.email || user?.name}
        </div>
        <button type="button" className="btn" onClick={onLogout}>Sair</button>
      </aside>
      <main className="admin-main">
        <Outlet />
      </main>
    </div>
  );
}
