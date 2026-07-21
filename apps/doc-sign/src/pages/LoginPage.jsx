import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useOperatorAuth } from '@kunk/auth-session';
import { getKunkPublicConfig, mergeKunkPublicConfigFromApi, KUNK_LOGO_FRAME_SIZE } from '@kunk/config';
import { getMissingAssociationFields } from '../lib/associationGate.js';

/** Credenciais do sample seed (`kunk-api/sample-data`). */
const TEST_CREDENTIALS = {
  email: 'admin@demo.kunk.local',
  password: 'DemoAdmin123!',
};

function AssociationIncompleteModal({ missing, onClose }) {
  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="modal-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="assoc-incomplete-title"
        onClick={(ev) => ev.stopPropagation()}
      >
        <div className="modal-header">
          <h2 id="assoc-incomplete-title" style={{ margin: 0 }}>
            Dados da associação incompletos
          </h2>
          <button type="button" className="btn" onClick={onClose}>
            Fechar
          </button>
        </div>
        <p style={{ marginTop: 0 }}>
          Não é possível entrar na Assinatura de Termos enquanto os dados da associação não
          estiverem completos no painel administrativo.
        </p>
        <p className="muted" style={{ marginBottom: '0.5rem' }}>
          Preencha em <strong>Admin → Dados da associação</strong>:
        </p>
        <ul style={{ marginTop: 0, paddingLeft: '1.25rem' }}>
          {missing.map((label) => (
            <li key={label}>{label}</li>
          ))}
        </ul>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
          <button type="button" className="btn btn-primary" onClick={onClose}>
            Entendi
          </button>
        </div>
      </div>
    </div>
  );
}

export function LoginPage({ api }) {
  const { login, logout, user } = useOperatorAuth();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [logo, setLogo] = useState(() => String(getKunkPublicConfig().logo || '').trim());
  const [associationTitle, setAssociationTitle] = useState(() => getKunkPublicConfig().title || '');
  const [missingFields, setMissingFields] = useState(() =>
    Array.isArray(location.state?.associationMissing) ? location.state.associationMissing : null
  );
  const gatingRef = useRef(false);
  const showTestLogin = import.meta.env.DEV;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const json = await api.get('/config/public?system=kunk');
        if (cancelled) return;
        const merged = mergeKunkPublicConfigFromApi(getKunkPublicConfig(), json?.data?.values);
        setLogo(String(merged.logo || '').trim());
        setAssociationTitle(merged.title || '');
      } catch {
        /* mantém bootstrap / vazio */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [api]);

  useEffect(() => {
    if (!user || gatingRef.current || missingFields?.length) return;
    let cancelled = false;
    (async () => {
      gatingRef.current = true;
      try {
        const missing = await getMissingAssociationFields(api);
        if (cancelled) return;
        if (missing.length) {
          await logout();
          setMissingFields(missing);
          return;
        }
        window.location.replace('/termos');
      } catch (err) {
        if (cancelled) return;
        await logout().catch(() => {});
        setError(err.message || 'Não foi possível validar os dados da associação');
      } finally {
        gatingRef.current = false;
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, api, logout, missingFields]);

  async function performLogin(nextEmail, nextPassword) {
    setBusy(true);
    setError(null);
    setMissingFields(null);
    gatingRef.current = true;
    try {
      await login(nextEmail, nextPassword);
      const missing = await getMissingAssociationFields(api);
      if (missing.length) {
        await logout();
        setMissingFields(missing);
        return;
      }
      window.location.assign('/termos');
    } catch (err) {
      setError(err.message || 'Falha no login');
    } finally {
      gatingRef.current = false;
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
    <div className="login-page">
      <div className="shell login-page-panel">
        {logo ? (
          <div className="login-page-logo">
            <img
              src={logo}
              alt={associationTitle || 'Logo da associação'}
              style={{
                width: KUNK_LOGO_FRAME_SIZE,
                height: KUNK_LOGO_FRAME_SIZE,
                objectFit: 'contain',
              }}
            />
          </div>
        ) : null}
        <h1 className="brand login-page-title">ASSINATURA DE TERMOS</h1>
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
      </div>

      {missingFields?.length ? (
        <AssociationIncompleteModal missing={missingFields} onClose={() => setMissingFields(null)} />
      ) : null}
    </div>
  );
}
