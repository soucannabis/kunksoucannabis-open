import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useOperatorAuth } from '@kunk/auth-session';

/** Credenciais do sample seed (`kunk-api/sample-data`). */
const TEST_CREDENTIALS = {
  email: 'admin@demo.kunk.local',
  password: 'DemoAdmin123!',
};

export function LoginPage({ api }) {
  const { login, user } = useOperatorAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const showTestLogin = import.meta.env.DEV;

  useEffect(() => {
    if (user) window.location.replace('/termos');
  }, [user]);

  async function performLogin(nextEmail, nextPassword) {
    setBusy(true);
    setError(null);
    try {
      await login(nextEmail, nextPassword);
      window.location.assign('/termos');
    } catch (err) {
      setError(err.message || 'Falha no login');
    } finally {
      setBusy(false);
    }
  }

  async function onSubmit(e) {
    e.preventDefault();
    await performLogin(email, password);
  }

  async function handleTestLogin() {
    setEmail(TEST_CREDENTIALS.email);
    setPassword(TEST_CREDENTIALS.password);
    await performLogin(TEST_CREDENTIALS.email, TEST_CREDENTIALS.password);
  }

  return (
    <div className="shell" style={{ maxWidth: 420 }}>
      <h1 className="brand">Doc-sign</h1>
      <p className="muted">Entre com um operador Administrador para editar os modelos de termo.</p>
      {error && <div className="alert alert-error">{error}</div>}
      <form className="card" onSubmit={onSubmit}>
        <div className="field">
          <label htmlFor="email">E-mail</label>
          <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div className="field">
          <label htmlFor="password">Senha</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          <button className="btn btn-primary" type="submit" disabled={busy}>
            {busy ? 'Entrando…' : 'Entrar'}
          </button>
          {showTestLogin ? (
            <button className="btn" type="button" disabled={busy} onClick={handleTestLogin}>
              Entrar como teste
            </button>
          ) : null}
          <Link to="/nova-senha">Esqueci a senha</Link>
        </div>
      </form>
      <p className="muted">
        <Link to="/">Voltar</Link>
      </p>
    </div>
  );
}
