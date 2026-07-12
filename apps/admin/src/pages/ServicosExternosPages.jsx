import React, { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useParams } from 'react-router-dom';
import {
  loadExternalService,
  loadExternalServices,
  saveExternalCredentials,
  saveExternalServiceFlags,
  testExternalService,
} from '../lib/externalServicesConfig.js';

export function ServicosExternosShell() {
  return (
    <div>
      <div className="admin-top">
        <div>
          <h1 style={{ margin: 0 }}>Serviços externos</h1>
          <p className="muted" style={{ margin: '0.25rem 0 0' }}>
            Loggi e Melhor Envio — flags e credenciais
          </p>
        </div>
      </div>
      <nav
        style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}
      >
        <NavLink
          to="/servicos-externos"
          end
          className={({ isActive }) => (isActive ? 'btn btn-primary' : 'btn')}
        >
          Índice
        </NavLink>
        <NavLink
          to="/servicos-externos/loggi"
          className={({ isActive }) => (isActive ? 'btn btn-primary' : 'btn')}
        >
          Loggi
        </NavLink>
        <NavLink
          to="/servicos-externos/melhorenvio"
          className={({ isActive }) => (isActive ? 'btn btn-primary' : 'btn')}
        >
          Melhor Envio
        </NavLink>
      </nav>
      <Outlet />
    </div>
  );
}

export function ServicosExternosIndexPage({ api }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await loadExternalServices(api);
        if (!cancelled) setData(res);
      } catch (err) {
        if (!cancelled) setError(err.message || 'Falha ao carregar');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [api]);

  if (error) return <p style={{ color: '#b00020' }}>{error}</p>;
  if (!data) return <div className="muted">Carregando…</div>;

  return (
    <div className="card" style={{ padding: '1.25rem' }}>
      <h2 style={{ marginTop: 0 }}>Provedores</h2>
      {data.store_incomplete && (
        <p className="muted">
          Loja incompleta:{' '}
          {[
            data.store_incomplete.ship_from && 'remetente',
            data.store_incomplete.package && 'caixa',
            data.store_incomplete.content_declaration && 'declaração',
          ]
            .filter(Boolean)
            .join(', ') || 'ok'}
          . <Link to="/loja/frete">Configurar frete</Link>
        </p>
      )}
      <ul style={{ lineHeight: 1.8 }}>
        {(data.services || []).map((s) => (
          <li key={s.service}>
            <Link to={`/servicos-externos/${s.service}`}>{s.service}</Link>
            {' — '}
            runtime {s.enabled ? 'on' : 'off'} · quote {s.use_for_quote ? 'sim' : 'não'} · label{' '}
            {s.use_for_label ? 'sim' : 'não'}
          </li>
        ))}
      </ul>
      <p className="muted" style={{ fontSize: '0.85rem' }}>
        Runtime exige MODULE_LOGGI_ENABLED / MODULE_MELHORENVIO_ENABLED no ambiente.
      </p>
    </div>
  );
}

export function ServicoExternoDetailPage({ api }) {
  const { service } = useParams();
  const [data, setData] = useState(null);
  const [fields, setFields] = useState({});
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [saving, setSaving] = useState(false);

  async function reload() {
    const res = await loadExternalService(api, service);
    setData(res);
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await loadExternalService(api, service);
        if (!cancelled) {
          setData(res);
          setFields({});
        }
      } catch (err) {
        if (!cancelled) setError(err.message || 'Falha');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [api, service]);

  async function onToggle(flag, value) {
    setError('');
    try {
      await saveExternalServiceFlags(api, service, { [flag]: value });
      await reload();
    } catch (err) {
      setError(err.message || 'Falha ao salvar flag');
    }
  }

  async function onSaveCredentials(e) {
    e.preventDefault();
    setSaving(true);
    setError('');
    setMsg('');
    try {
      const payload = {};
      for (const [k, v] of Object.entries(fields)) {
        if (v !== undefined && v !== '') payload[k] = v;
      }
      if (!Object.keys(payload).length) {
        setError('Preencha ao menos um campo novo para salvar');
        return;
      }
      await saveExternalCredentials(api, service, payload, true);
      setFields({});
      setMsg('Credenciais salvas (teste ok)');
      await reload();
    } catch (err) {
      setError(err.message || 'Teste falhou — nada foi persistido');
    } finally {
      setSaving(false);
    }
  }

  async function onTest() {
    setError('');
    setMsg('');
    try {
      await testExternalService(api, service);
      setMsg('Teste ok');
      await reload();
    } catch (err) {
      setError(err.message || 'Teste falhou');
    }
  }

  if (!data && !error) return <div className="muted">Carregando…</div>;
  if (!data) return <p style={{ color: '#b00020' }}>{error}</p>;

  return (
    <div className="card" style={{ padding: '1.25rem', maxWidth: 640 }}>
      <h2 style={{ marginTop: 0 }}>{service}</h2>
      <p className="muted">
        Runtime: {data.enabled ? 'habilitado' : 'desabilitado'} (env MODULE_*)
      </p>
      {error && (
        <p role="alert" data-testid="ext-error" style={{ color: '#b00020' }}>
          {error}
        </p>
      )}
      {msg && (
        <p data-testid="ext-msg" style={{ color: '#2e7d32' }}>
          {msg}
        </p>
      )}

      <label style={{ display: 'block', marginBottom: 8 }}>
        <input
          type="checkbox"
          data-testid="use-for-quote"
          checked={Boolean(data.use_for_quote)}
          onChange={(e) => onToggle('use_for_quote', e.target.checked)}
        />{' '}
        Usar na cotação
      </label>
      <label style={{ display: 'block', marginBottom: 16 }}>
        <input
          type="checkbox"
          data-testid="use-for-label"
          checked={Boolean(data.use_for_label)}
          onChange={(e) => onToggle('use_for_label', e.target.checked)}
        />{' '}
        Usar na etiqueta
      </label>

      <h3>Credenciais</h3>
      <form onSubmit={onSaveCredentials}>
        {(data.credentials || []).map((c) => (
          <label key={c.field_key} style={{ display: 'block', marginBottom: 12 }}>
            <span style={{ display: 'block', fontSize: '0.85rem' }}>
              {c.field_key}
              {c.has_value ? ` (${c.source})` : ' (vazio)'}
              {c.env_present && c.source === 'env' ? ` via ${c.env_fallback}` : ''}
            </span>
            <input
              className="input"
              type={c.is_secret ? 'password' : 'text'}
              data-testid={`cred-${c.field_key}`}
              placeholder={c.is_secret ? 'Nova chave' : c.has_value ? 'Alterar valor' : ''}
              autoComplete="off"
              value={fields[c.field_key] || ''}
              onChange={(e) => setFields((prev) => ({ ...prev, [c.field_key]: e.target.value }))}
            />
          </label>
        ))}
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="submit" className="btn btn-primary" data-testid="save-credentials" disabled={saving}>
            {saving ? 'Testando e salvando…' : 'Salvar (com teste)'}
          </button>
          <button type="button" className="btn" data-testid="test-credentials" onClick={onTest}>
            Testar
          </button>
        </div>
      </form>
    </div>
  );
}
