import React, { useState } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { useOperatorAuth } from '@kunk/auth-session';
import { readRememberedAdminRoute, safeInternalPath } from '../lib/lastRoute.js';

export function LoginPage() {
  const { user, loading, hasRequiredRole, login } = useOperatorAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const nextPath = safeInternalPath(
    searchParams.get('next') || readRememberedAdminRoute('/dados'),
    '/dados'
  );

  if (!loading && user && hasRequiredRole) {
    return <Navigate to={nextPath} replace />;
  }
  if (!loading && user && !hasRequiredRole) {
    return <Navigate to="/sem-permissao" replace />;
  }

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const res = await login(email.trim(), password);
      const perms = res.data?.user?.permissions || res.data?.user?.roles || [];
      let roles = perms;
      if (typeof perms === 'string') {
        try {
          roles = JSON.parse(perms);
        } catch {
          roles = String(perms).split(',').map((s) => s.trim());
        }
      }
      if (!Array.isArray(roles) || !roles.includes('Administrador')) {
        navigate('/sem-permissao');
        return;
      }
      navigate(nextPath);
    } catch (err) {
      setError(err.message || 'Falha no login');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="login-page">
      <form className="card login-card" onSubmit={onSubmit}>
        <h1>Admin</h1>
        <p className="muted">Acesso restrito a operadores com role Administrador.</p>
        {error ? <div className="alert alert-error" role="alert">{error}</div> : null}
        <div className="field">
          <label htmlFor="email">E-mail</label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="field">
          <label htmlFor="password">Senha</label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <button className="btn btn-primary" type="submit" disabled={busy}>
          {busy ? 'Entrando…' : 'Entrar'}
        </button>
      </form>
    </div>
  );
}
