import React, { useMemo } from 'react';
import { BrowserRouter, Navigate, Route, Routes, NavLink, Outlet, useParams } from 'react-router-dom';
import { createApiClient } from '@kunk/api-client';
import { OperatorAuthProvider, useOperatorAuth } from '@kunk/auth-session';
import { getPublicConfig } from '@kunk/config';
import { LoginPage } from './pages/LoginPage.jsx';
import { NewPasswordPage } from './pages/NewPasswordPage.jsx';
import { TemplatesPage } from './pages/TemplatesPage.jsx';
import { TemplateEditorPage } from './pages/TemplateEditorPage.jsx';
import { SignPage } from './pages/SignPage.jsx';
import { ContractPage } from './pages/ContractPage.jsx';
import { ContractsPage } from './pages/ContractsPage.jsx';
import { AuditPage } from './pages/AuditPage.jsx';

function RedirectContratoToTermo() {
  const { id } = useParams();
  return <Navigate to={`/termos/${id}`} replace />;
}

function RequireAdmin({ children }) {
  const { user, loading, hasRequiredRole, logout } = useOperatorAuth();
  if (loading) return <div className="shell"><p className="muted">Carregando sessão…</p></div>;
  if (!user) return <Navigate to="/login" replace />;
  if (!hasRequiredRole) {
    return (
      <div className="shell">
        <div className="alert alert-error">Acesso restrito a Administradores.</div>
        <button type="button" className="btn" onClick={() => logout()}>
          Sair
        </button>
      </div>
    );
  }
  return children;
}

function OperatorShell({ api }) {
  const { user, logout } = useOperatorAuth();
  return (
    <div className="shell">
      <div className="topbar">
        <div className="brand">Doc-sign</div>
        <div className="topbar-nav">
          <span className="muted">{user?.email}</span>
          <NavLink
            className={({ isActive }) => `btn nav-btn${isActive ? ' nav-btn-active' : ''}`}
            to="/termos"
          >
            Termos
          </NavLink>
          <NavLink
            className={({ isActive }) => `btn nav-btn${isActive ? ' nav-btn-active' : ''}`}
            to="/modelos"
          >
            Modelos
          </NavLink>
          <button type="button" className="btn" onClick={() => logout()}>
            Sair
          </button>
        </div>
      </div>
      <Outlet context={{ api }} />
    </div>
  );
}

export default function App() {
  const bootstrap = getPublicConfig();
  const api = useMemo(() => createApiClient({ baseUrl: bootstrap.apiUrl }), [bootstrap.apiUrl]);

  return (
    <OperatorAuthProvider api={api} requiredRole="Administrador">
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage api={api} />} />
          <Route path="/nova-senha" element={<NewPasswordPage api={api} />} />
          <Route path="/assinar/:token" element={<SignPage api={api} />} />
          <Route
            element={(
              <RequireAdmin>
                <OperatorShell api={api} />
              </RequireAdmin>
            )}
          >
            <Route path="/" element={<Navigate to="/termos" replace />} />
            <Route path="/contratos" element={<Navigate to="/termos" replace />} />
            <Route path="/contratos/:id" element={<RedirectContratoToTermo />} />
            <Route path="/termos" element={<ContractsPage api={api} />} />
            <Route path="/termos/:id" element={<ContractPage api={api} />} />
            <Route path="/termos/:id/audit" element={<AuditPage api={api} />} />
            <Route path="/modelos" element={<TemplatesPage api={api} />} />
            <Route path="/modelos/:kind" element={<TemplateEditorPage api={api} />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </OperatorAuthProvider>
  );
}
