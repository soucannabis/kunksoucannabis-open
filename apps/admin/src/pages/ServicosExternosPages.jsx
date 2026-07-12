import React, { useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useParams, useSearchParams } from 'react-router-dom';
import {
  activateMelhorEnvioProduction,
  activateMelhorEnvioSandbox,
  getGoogleCalendarOAuthStatus,
  getMelhorEnvioOAuthStatus,
  loadExternalService,
  loadExternalServices,
  saveExternalCredentials,
  saveExternalServiceFlags,
  startGoogleCalendarOAuth,
  startMelhorEnvioOAuth,
  testExternalService,
} from '../lib/externalServicesConfig.js';

const ME_DEFAULT_URLS = {
  sandbox: 'https://sandbox.melhorenvio.com.br/api/v2',
  production: 'https://www.melhorenvio.com.br/api/v2',
};

const HIDDEN_CRED_FIELDS = new Set([
  'access_token',
  'refresh_token',
  'environment',
  'api_base_url',
  'redirect_uri',
]);

const FIELD_LABELS = {
  client_id: 'Client ID',
  client_secret: 'Client Secret',
  redirect_uri: 'Redirect URI (callback OAuth)',
  api_base_url: 'API base URL',
  company_id: 'Company ID',
  token_url: 'Token URL',
  api_key: 'API Key',
};

const FREIGHT_SERVICES = new Set(['loggi', 'melhorenvio']);
const SERVICE_LABELS = {
  loggi: 'Loggi',
  melhorenvio: 'Melhor Envio',
  geoapify: 'Geoapify',
  google_calendar: 'Google Calendar',
};

export function ServicosExternosShell() {
  return (
    <div>
      <div className="admin-top">
        <div>
          <h1 style={{ margin: 0 }}>Serviços externos</h1>
          <p className="muted" style={{ margin: '0.25rem 0 0' }}>
            Loggi, Melhor Envio, Geoapify e Google Calendar — flags, credenciais e dados de envio
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
          to="/servicos-externos/envio"
          className={({ isActive }) => (isActive ? 'btn btn-primary' : 'btn')}
        >
          Dados de envio
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
        <NavLink
          to="/servicos-externos/geoapify"
          className={({ isActive }) => (isActive ? 'btn btn-primary' : 'btn')}
        >
          Geoapify
        </NavLink>
        <NavLink
          to="/servicos-externos/google_calendar"
          className={({ isActive }) => (isActive ? 'btn btn-primary' : 'btn')}
        >
          Google Calendar
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
      <ul style={{ lineHeight: 1.8 }}>
        <li>
          <Link to="/servicos-externos/envio">Dados de envio</Link> — remetente, caixa e declaração
          (obrigatório antes de ativar frete)
        </li>
        {(data.services || []).map((s) => (
          <li key={s.service}>
            <Link to={`/servicos-externos/${s.service}`}>
              {SERVICE_LABELS[s.service] || s.service}
            </Link>
            {' — '}
            runtime {s.enabled ? 'on' : 'off'}
            {FREIGHT_SERVICES.has(s.service) ? (
              <>
                {' '}
                · quote {s.use_for_quote ? 'sim' : 'não'} · label {s.use_for_label ? 'sim' : 'não'}
              </>
            ) : null}
            {s.service === 'geoapify' ? (
              <> · validação {s.use_for_validation ? 'sim' : 'não'}</>
            ) : null}
            {s.service === 'google_calendar' ? (
              <> · agendamento {s.use_for_scheduling ? 'sim' : 'não'}</>
            ) : null}
          </li>
        ))}
      </ul>
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
          . <Link to="/servicos-externos/envio">Configurar dados de envio</Link>
        </p>
      )}
      <p className="muted" style={{ fontSize: '0.85rem' }}>
        Runtime exige MODULE_*_ENABLED no ambiente (Loggi, Melhor Envio, Geoapify, Google Calendar).
      </p>
    </div>
  );
}

const GOOGLE_CALENDAR_FORM_CREDS = [
  {
    field_key: 'client_id',
    is_secret: true,
    has_value: false,
    value: null,
    description: 'Google OAuth Client ID',
  },
  {
    field_key: 'client_secret',
    is_secret: true,
    has_value: false,
    value: null,
    description: 'Google OAuth Client Secret',
  },
];

function CredentialField({
  cred,
  value,
  editing,
  onChange,
  onStartEdit,
  onCancelEdit,
  envSuffix,
}) {
  const label = FIELD_LABELS[cred.field_key] || cred.description || cred.field_key;
  const showDisplay = cred.has_value && !editing;

  return (
    <div className="field" style={{ marginBottom: 14 }}>
      <label htmlFor={`cred-${cred.field_key}`}>
        {label}
        {envSuffix || ''}
      </label>
      {showDisplay ? (
        <div className="cred-value-row" data-testid={`cred-display-${cred.field_key}`}>
          <span className="cred-value-text">
            {cred.is_secret ? '••••••••' : cred.value || value || '—'}
          </span>
          <button
            type="button"
            className="cred-edit-link"
            data-testid={`cred-edit-${cred.field_key}`}
            onClick={onStartEdit}
          >
            editar
          </button>
        </div>
      ) : (
        <div>
          <input
            id={`cred-${cred.field_key}`}
            className="input"
            type={
              cred.is_secret
                ? 'password'
                : cred.field_key.includes('url')
                  ? 'url'
                  : 'text'
            }
            data-testid={`cred-${cred.field_key}`}
            placeholder={cred.is_secret ? 'Nova chave' : ''}
            autoComplete="off"
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
          />
          {cred.has_value && (
            <button
              type="button"
              className="cred-edit-link"
              style={{ marginTop: 6 }}
              onClick={onCancelEdit}
            >
              cancelar
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function OAuthRedirectUriCopy({ uri }) {
  const [copied, setCopied] = useState(false);
  if (!uri) return null;

  async function onCopy() {
    try {
      await navigator.clipboard.writeText(uri);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="field" style={{ marginBottom: 14 }} data-testid="oauth-redirect-uri">
      <label>Redirect URI (copie para o provedor OAuth)</label>
      <div className="cred-value-row">
        <span className="cred-value-text" style={{ wordBreak: 'break-all' }}>
          {uri}
        </span>
        <button type="button" className="cred-edit-link" onClick={onCopy}>
          {copied ? 'copiado' : 'copiar'}
        </button>
      </div>
      <p className="muted" style={{ margin: '0.35rem 0 0', fontSize: '0.8rem' }}>
        Cadastre esta URI exatamente igual no console do provedor. O sistema grava automaticamente —
        não é necessário colar no formulário.
      </p>
    </div>
  );
}

export function ServicoExternoDetailPage({ api }) {
  const { service } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const [data, setData] = useState(null);
  const [fields, setFields] = useState({});
  const [editing, setEditing] = useState({});
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [saving, setSaving] = useState(false);
  const [oauthStarting, setOauthStarting] = useState(false);
  const [calendars, setCalendars] = useState([]);
  const oauthWaitRef = useRef(null);

  function stopOauthWait() {
    if (oauthWaitRef.current) {
      clearInterval(oauthWaitRef.current.interval);
      clearTimeout(oauthWaitRef.current.timeout);
      window.removeEventListener('message', oauthWaitRef.current.onMessage);
      oauthWaitRef.current = null;
    }
    setOauthStarting(false);
  }

  function applyLoaded(res) {
    setData(res);
    const initial = {};
    for (const c of res.credentials || []) {
      if (!c.is_secret && c.value) initial[c.field_key] = c.value;
    }
    setFields(initial);
    setEditing({});
  }

  async function reload() {
    const res = await loadExternalService(api, service);
    applyLoaded(res);
    return res;
  }

  useEffect(() => () => stopOauthWait(), []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await loadExternalService(api, service);
        if (!cancelled) applyLoaded(res);
      } catch (err) {
        if (!cancelled) setError(err.message || 'Falha');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [api, service]);

  useEffect(() => {
    const oauth = searchParams.get('oauth');
    if (!oauth) return;
    if (oauth === 'ok') {
      setMsg(
        service === 'google_calendar'
          ? 'OAuth Google Calendar autorizado — tokens salvos'
          : 'OAuth Melhor Envio autorizado — tokens salvos'
      );
      reload().catch(() => {});
    } else if (oauth === 'error') {
      setError(
        searchParams.get('message') ||
          (service === 'google_calendar' ? 'Falha no OAuth Google' : 'Falha no OAuth Melhor Envio')
      );
    }
    const next = new URLSearchParams(searchParams);
    next.delete('oauth');
    next.delete('message');
    setSearchParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  async function onToggle(flag, value) {
    setError('');
    setMsg('');
    if (
      service === 'melhorenvio' &&
      value === true &&
      (flag === 'use_for_quote' || flag === 'use_for_label') &&
      data?.store_freight_ready === false
    ) {
      const missing =
        (data.store_freight_missing || []).join(', ') || 'remetente, caixa e declaração';
      setError(
        `Não é possível ativar o Melhor Envio: preencha ${missing} em Dados de envio.`
      );
      return;
    }
    const prev = data;
    setData((d) => (d ? { ...d, [flag]: value } : d));
    try {
      const res = await saveExternalServiceFlags(api, service, { [flag]: value });
      setData((d) =>
        d
          ? {
              ...d,
              use_for_quote: res.use_for_quote,
              use_for_label: res.use_for_label,
              use_for_validation: res.use_for_validation,
              use_for_scheduling: res.use_for_scheduling,
              primary_calendar_id: res.primary_calendar_id,
              config_enabled: res.config_enabled,
              enabled: res.enabled,
            }
          : d
      );
    } catch (err) {
      setData(prev);
      setError(err.message || 'Falha ao salvar flag');
    }
  }

  async function finishOauthSuccess() {
    stopOauthWait();
    setMsg('Autenticado no Melhor Envio — tokens salvos');
    await reload();
  }

  function finishOauthError(message) {
    stopOauthWait();
    setError(message || 'Falha no OAuth Melhor Envio');
  }

  async function openMelhorEnvioOAuth() {
    setOauthStarting(true);
    const url = await startMelhorEnvioOAuth(api);
    if (!/^https?:\/\//i.test(url)) {
      throw new Error(
        `URL OAuth inválida (não é absoluta): ${url}. Confira o ambiente (sandbox/produção).`
      );
    }

    // Snapshot before opening: re-auth already has tokens — do not treat "authenticated"
    // as success until the access_token timestamp changes (or first-time auth completes).
    let baseline;
    try {
      baseline = await getMelhorEnvioOAuthStatus(api);
    } catch {
      baseline = { authenticated: false, access_token_updated_at: null };
    }

    function oauthCompleted(status) {
      if (!status?.authenticated) return false;
      if (!baseline?.authenticated) return true;
      const before = baseline.access_token_updated_at || null;
      const after = status.access_token_updated_at || null;
      return Boolean(after && after !== before);
    }

    const popup = window.open(url, 'melhorenvio_oauth', 'popup=yes,width=720,height=800');
    if (!popup) {
      throw new Error('Pop-up bloqueado — permita pop-ups para este site e tente de novo');
    }
    setMsg(
      baseline?.authenticated
        ? 'Reautorização — conclua o login no Melhor Envio na nova janela…'
        : 'Teste ok — autorize na nova aba…'
    );

    const onMessage = (event) => {
      const dataMsg = event.data;
      if (!dataMsg || dataMsg.type !== 'melhorenvio-oauth') return;
      if (dataMsg.ok) finishOauthSuccess();
      else finishOauthError(dataMsg.message);
    };
    window.addEventListener('message', onMessage);

    const interval = setInterval(async () => {
      try {
        if (popup.closed) {
          const status = await getMelhorEnvioOAuthStatus(api);
          if (oauthCompleted(status)) await finishOauthSuccess();
          else finishOauthError('Janela OAuth fechada antes de concluir');
          return;
        }
        const status = await getMelhorEnvioOAuthStatus(api);
        if (oauthCompleted(status)) {
          try {
            popup.close();
          } catch {
            /* ignore */
          }
          await finishOauthSuccess();
        }
      } catch {
        /* keep waiting */
      }
    }, 2000);

    const timeout = setTimeout(() => {
      finishOauthError('Tempo esgotado aguardando autorização Melhor Envio');
    }, 5 * 60 * 1000);

    oauthWaitRef.current = { interval, timeout, onMessage };
  }

  async function openGoogleCalendarOAuth() {
    setOauthStarting(true);
    const url = await startGoogleCalendarOAuth(api);
    const popup = window.open(url, 'google_calendar_oauth', 'popup=yes,width=720,height=800');
    if (!popup) {
      throw new Error('Pop-up bloqueado — permita pop-ups para este site e tente de novo');
    }
    setMsg('Autorize o Google Calendar na nova janela…');

    const onMessage = (event) => {
      const dataMsg = event.data;
      if (!dataMsg || dataMsg.type !== 'google-calendar-oauth') return;
      if (dataMsg.ok) {
        stopOauthWait();
        setMsg('Autenticado no Google Calendar — tokens salvos');
        reload().then(loadCalendars).catch(() => {});
      } else {
        stopOauthWait();
        setError(dataMsg.message || 'Falha no OAuth Google');
      }
    };
    window.addEventListener('message', onMessage);

    const interval = setInterval(async () => {
      try {
        if (popup.closed) {
          const status = await getGoogleCalendarOAuthStatus(api);
          if (status?.connected || status?.has_refresh_token) {
            stopOauthWait();
            setMsg('Autenticado no Google Calendar — tokens salvos');
            await reload();
            await loadCalendars();
          } else {
            stopOauthWait();
            setError('Janela OAuth fechada antes de concluir');
          }
        }
      } catch {
        /* keep waiting */
      }
    }, 2000);

    const timeout = setTimeout(() => {
      stopOauthWait();
      setError('Tempo esgotado aguardando autorização Google');
    }, 5 * 60 * 1000);

    oauthWaitRef.current = { interval, timeout, onMessage };
  }

  async function loadCalendars() {
    if (service !== 'google_calendar') return;
    try {
      const res = await api.listGoogleCalendars();
      setCalendars(res.data || []);
    } catch {
      setCalendars([]);
    }
  }

  useEffect(() => {
    if (service === 'google_calendar' && data?.oauth?.authenticated) {
      loadCalendars();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [service, data?.oauth?.authenticated]);

  async function onAuthenticate(e) {
    e.preventDefault();
    setSaving(true);
    setError('');
    setMsg('');
    try {
      if (service === 'melhorenvio' && data?.store_freight_ready === false) {
        const missing =
          (data.store_freight_missing || []).join(', ') || 'remetente, caixa e declaração';
        throw new Error(
          `Preencha ${missing} em Dados de envio antes de autenticar o Melhor Envio.`
        );
      }

      const formCreds =
        service === 'google_calendar' &&
        !(data?.credentials || []).some((c) => c.field_key === 'client_id')
          ? GOOGLE_CALENDAR_FORM_CREDS
          : data?.credentials || [];

      const payload = {};
      for (const c of formCreds) {
        if (HIDDEN_CRED_FIELDS.has(c.field_key)) continue;
        const v = fields[c.field_key];
        if (v === undefined || v === '') continue;
        if (editing[c.field_key] || !c.has_value) payload[c.field_key] = v;
      }

      // Google: include newly typed secrets (secrets não voltam no GET).
      if (service === 'google_calendar') {
        for (const key of ['client_id', 'client_secret']) {
          const v = fields[key];
          if (v !== undefined && v !== '') payload[key] = v;
        }
      }

      const hasPayload = Object.keys(payload).length > 0;
      if (hasPayload) {
        await saveExternalCredentials(api, service, payload, true);
      } else if (service === 'google_calendar') {
        const byKey = Object.fromEntries(
          (data?.credentials || []).map((c) => [c.field_key, c])
        );
        const hasSaved =
          Boolean(byKey.client_id?.has_value) && Boolean(byKey.client_secret?.has_value);
        if (!hasSaved) {
          throw new Error('Preencha Client ID e Client Secret antes de autenticar');
        }
        // Credenciais já salvas — só revalida e segue para OAuth.
        await testExternalService(api, service);
      } else {
        await testExternalService(api, service);
      }

      await reload();

      if (service === 'melhorenvio') {
        await openMelhorEnvioOAuth();
      } else if (service === 'google_calendar') {
        await openGoogleCalendarOAuth();
      } else {
        setMsg('Credenciais autenticadas (teste ok)');
      }
    } catch (err) {
      stopOauthWait();
      setError(err.message || 'Teste falhou — nada foi persistido');
    } finally {
      setSaving(false);
    }
  }

  async function onActivateProduction() {
    const okConfirm = window.confirm(
      'Ativar produção?\n\nAs credenciais de sandbox e tokens OAuth serão limpos. Você precisará informar o app de produção. Continuar?'
    );
    if (!okConfirm) return;
    setError('');
    setMsg('');
    setSaving(true);
    try {
      const res = await activateMelhorEnvioProduction(api);
      setMsg(res.message || 'Produção ativada — informe as credenciais do app real');
      await reload();
    } catch (err) {
      setError(err.message || 'Falha ao ativar produção');
    } finally {
      setSaving(false);
    }
  }

  async function onActivateSandbox() {
    const okConfirm = window.confirm(
      'Voltar ao sandbox?\n\nCredenciais de produção e tokens OAuth serão limpos. Continuar?'
    );
    if (!okConfirm) return;
    setError('');
    setMsg('');
    setSaving(true);
    try {
      const res = await activateMelhorEnvioSandbox(api);
      setMsg(res.message || 'Sandbox ativado');
      await reload();
    } catch (err) {
      setError(err.message || 'Falha ao ativar sandbox');
    } finally {
      setSaving(false);
    }
  }

  if (!data && !error) return <div className="muted">Carregando…</div>;
  if (!data) return <p style={{ color: '#b00020' }}>{error}</p>;

  const meUrls = data.me_urls || {
    sandbox: { api_base_url: ME_DEFAULT_URLS.sandbox, label: 'Sandbox (teste)' },
    production: { api_base_url: ME_DEFAULT_URLS.production, label: 'Produção' },
  };
  const environment = data.environment || 'sandbox';
  const isProduction = environment === 'production';
  const pinnedApiBase = meUrls[environment]?.api_base_url || ME_DEFAULT_URLS[environment];
  const credList =
    service === 'google_calendar' &&
    !(data.credentials || []).some((c) => c.field_key === 'client_id')
      ? GOOGLE_CALENDAR_FORM_CREDS
      : data.credentials || [];
  const editableCreds = credList.filter((c) => !HIDDEN_CRED_FIELDS.has(c.field_key));
  const oauth = data.oauth;
  const busy = saving || oauthStarting;

  return (
    <div className="card" style={{ padding: '1.25rem', maxWidth: 640 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 4 }}>
        <h2 style={{ margin: 0 }}>{service}</h2>
        {service === 'melhorenvio' && (
          <span
            className={`me-env-pill${isProduction ? ' is-production' : ''}`}
            data-testid="me-env-label"
          >
            {isProduction ? 'Produção' : 'Sandbox'}
          </span>
        )}
      </div>
      <p className="muted" style={{ marginTop: 4 }}>
        Runtime: {data.enabled ? 'habilitado' : 'desabilitado'} (env MODULE_*)
        {service === 'melhorenvio' && oauth ? (
          <>
            {' · '}
            OAuth:{' '}
            <strong data-testid="me-oauth-status">
              {oauth.authenticated ? 'autorizado' : 'não autorizado'}
            </strong>
          </>
        ) : null}
      </p>

      {FREIGHT_SERVICES.has(service) ? (
        <>
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
        </>
      ) : null}

      {service === 'geoapify' ? (
        <label style={{ display: 'block', marginBottom: 16 }}>
          <input
            type="checkbox"
            data-testid="use-for-validation"
            checked={Boolean(data.use_for_validation)}
            onChange={(e) => onToggle('use_for_validation', e.target.checked)}
          />{' '}
          Usar na verificação de endereço
        </label>
      ) : null}

      {service === 'google_calendar' ? (
        <>
          <label style={{ display: 'block', marginBottom: 8 }}>
            <input
              type="checkbox"
              data-testid="use-for-scheduling"
              checked={data.use_for_scheduling !== false}
              onChange={(e) => onToggle('use_for_scheduling', e.target.checked)}
            />{' '}
            Usar no agendamento de serviços
          </label>
          <div className="field" style={{ marginBottom: 16 }}>
            <label htmlFor="primary-calendar">Calendário principal da associação</label>
            <select
              id="primary-calendar"
              className="input"
              data-testid="primary-calendar"
              value={data.primary_calendar_id || ''}
              disabled={!calendars.length}
              onChange={(e) => onToggle('primary_calendar_id', e.target.value || null)}
            >
              <option value="">— selecione após autorizar —</option>
              {calendars.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.summary}
                  {c.primary ? ' (primary Google)' : ''}
                </option>
              ))}
            </select>
            <p className="muted" style={{ fontSize: '0.8rem', margin: '0.35rem 0 0' }}>
              Eventos de consulta vão nos calendários secundários de cada profissional, não neste.
            </p>
          </div>
          {oauth ? (
            <p className="muted" style={{ marginTop: 0 }}>
              OAuth:{' '}
              <strong>{oauth.authenticated ? 'autorizado' : 'não autorizado'}</strong>
            </p>
          ) : null}
        </>
      ) : null}

      {service === 'geoapify' && (
        <div style={{ marginTop: 0, marginBottom: 16, fontSize: '0.85rem' }}>
          <p className="muted" style={{ margin: '0 0 0.5rem' }}>
            Usa Geoapify Geocode Search + ViaCEP (Correios) com a mesma política do Kunk legado.
            Crie ou copie a API Key no painel do serviço:
          </p>
          <p style={{ margin: 0 }}>
            Site:{' '}
            <a
              href="https://www.geoapify.com"
              target="_blank"
              rel="noreferrer"
              data-testid="geoapify-site-link"
            >
              geoapify.com
            </a>
            {' · '}
            Painel / API Keys:{' '}
            <a
              href="https://myprojects.geoapify.com"
              target="_blank"
              rel="noreferrer"
              data-testid="geoapify-projects-link"
            >
              myprojects.geoapify.com
            </a>
          </p>
        </div>
      )}

      {service === 'google_calendar' && (
        <div
          data-testid="google-calendar-setup-guide"
          style={{
            marginTop: 0,
            marginBottom: 16,
            fontSize: '0.85rem',
            padding: '0.85rem 1rem',
            border: '1px solid #ddd',
            borderRadius: 8,
            background: '#f7f7f7',
            color: '#111',
          }}
        >
          <p style={{ margin: '0 0 0.5rem', fontWeight: 600, color: '#111' }}>
            Como obter as credenciais OAuth
          </p>
          <ol style={{ margin: 0, paddingLeft: '1.25rem', color: '#111' }}>
            <li style={{ marginBottom: 6 }}>
              Abra o{' '}
              <a
                href="https://console.cloud.google.com/"
                target="_blank"
                rel="noreferrer"
                data-testid="gc-console-link"
                style={{ color: '#0b57d0' }}
              >
                Google Cloud Console
              </a>{' '}
              e selecione (ou crie) o projeto da associação.
            </li>
            <li style={{ marginBottom: 6 }}>
              Em <strong>APIs e serviços → Biblioteca</strong>, ative a{' '}
              <a
                href="https://console.cloud.google.com/apis/library/calendar-json.googleapis.com"
                target="_blank"
                rel="noreferrer"
                style={{ color: '#0b57d0' }}
              >
                Google Calendar API
              </a>
              .
            </li>
            <li style={{ marginBottom: 6 }}>
              Em <strong>APIs e serviços → Tela de consentimento OAuth</strong>, configure o app
              (tipo Externo ou Interno).
            </li>
            <li style={{ marginBottom: 6 }}>
              Em <strong>Clientes → Criar clientes</strong>, escolha tipo{' '}
              <strong>Aplicativo da Web</strong>.
            </li>
            <li style={{ marginBottom: 6 }}>
              Em <strong>URIs de redirecionamento autorizados</strong>, cole a{' '}
              <strong>Redirect URI</strong> exibida abaixo nesta página (botão copiar).
            </li>
            <li style={{ marginBottom: 6 }}>
              Copie o <strong>Client ID</strong> e o <strong>Client Secret</strong> para os campos
              abaixo.
            </li>
            <li>
              Clique em <strong>Autenticar</strong> — o sistema salva as credenciais, grava a
              Redirect URI automaticamente, testa e abre o Google para autorizar a conta da
              associação. Depois selecione o calendário principal.
            </li>
          </ol>
          <p style={{ margin: '0.75rem 0 0', color: '#444' }}>
            Docs:{' '}
            <a
              href="https://developers.google.com/calendar/api/guides/overview"
              target="_blank"
              rel="noreferrer"
              style={{ color: '#0b57d0' }}
            >
              Calendar API
            </a>
            {' · '}
            <a
              href="https://developers.google.com/identity/protocols/oauth2"
              target="_blank"
              rel="noreferrer"
              style={{ color: '#0b57d0' }}
            >
              OAuth 2.0
            </a>
          </p>
        </div>
      )}

      {service === 'melhorenvio' && data.store_freight_ready === false && (
        <div
          role="alert"
          data-testid="me-freight-gate"
          style={{
            background: '#fff3cd',
            border: '1px solid #ffc107',
            padding: '0.85rem 1rem',
            marginBottom: '1.25rem',
            borderRadius: 8,
            color: '#000',
          }}
        >
          <strong>Dados de envio incompletos.</strong> Preencha remetente, caixa e declaração em{' '}
          <Link to="/servicos-externos/envio">Dados de envio</Link> antes de ativar cotação/etiqueta
          ou autenticar.
        </div>
      )}

      <h3>Credenciais de conexão</h3>
      <form onSubmit={onAuthenticate}>
        {service === 'melhorenvio' && (
          <div className="field" style={{ marginBottom: 14 }}>
            <label>API base URL</label>
            <div className="cred-value-row" data-testid="cred-display-api_base_url">
              <span className="cred-value-text">{pinnedApiBase}</span>
            </div>
            <p className="muted" style={{ margin: '0.35rem 0 0', fontSize: '0.8rem' }}>
              Sandbox: <code>{ME_DEFAULT_URLS.sandbox}</code>
              <br />
              Produção: <code>{ME_DEFAULT_URLS.production}</code>
            </p>
          </div>
        )}

        {(service === 'melhorenvio' || service === 'google_calendar') && (
          <OAuthRedirectUriCopy uri={data.oauth_redirect_uri} />
        )}

        {editableCreds.map((c) => (
          <CredentialField
            key={c.field_key}
            cred={c}
            value={fields[c.field_key]}
            editing={Boolean(editing[c.field_key])}
            envSuffix={
              service === 'melhorenvio' &&
              (c.field_key === 'client_id' || c.field_key === 'client_secret')
                ? isProduction
                  ? ' (produção)'
                  : ' (sandbox)'
                : ''
            }
            onChange={(v) => setFields((prev) => ({ ...prev, [c.field_key]: v }))}
            onStartEdit={() => {
              setEditing((prev) => ({ ...prev, [c.field_key]: true }));
              setFields((prev) => ({
                ...prev,
                [c.field_key]: c.is_secret ? '' : c.value || prev[c.field_key] || '',
              }));
            }}
            onCancelEdit={() => {
              setEditing((prev) => {
                const next = { ...prev };
                delete next[c.field_key];
                return next;
              });
              setFields((prev) => {
                const next = { ...prev };
                if (c.is_secret) delete next[c.field_key];
                else if (c.value) next[c.field_key] = c.value;
                return next;
              });
            }}
          />
        ))}

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <button
            type="submit"
            className="btn btn-primary"
            data-testid="save-credentials"
            disabled={busy}
          >
            {busy ? 'Autenticando…' : 'Autenticar'}
          </button>
        </div>
        {error && (
          <p
            role="alert"
            data-testid="ext-error"
            style={{ color: '#b00020', margin: '0.75rem 0 0' }}
          >
            {error}
          </p>
        )}
        {msg && (
          <p data-testid="ext-msg" style={{ color: '#2e7d32', margin: '0.75rem 0 0' }}>
            {msg}
          </p>
        )}
        {service === 'melhorenvio' && (
          <p className="muted me-oauth-hint">
            Autenticar testa as credenciais e, se ok, abre o Melhor Envio para autorizar o app.
          </p>
        )}
        {service === 'google_calendar' && (
          <p className="muted" data-testid="gc-oauth-hint">
            Autenticar salva Client ID/Secret, grava a Redirect URI automaticamente, testa e abre o
            Google para autorizar a conta da associação (tokens ficam só no servidor).
          </p>
        )}
      </form>

      {service === 'melhorenvio' && (
        <section
          className={`me-prod-block${isProduction ? ' is-production' : ''}`}
          data-testid="me-env-banner"
        >
          <p className="me-prod-kicker">Ambiente</p>
          <h3 className="me-prod-title">
            {isProduction ? 'Você está em produção' : 'Comece pelo sandbox'}
          </h3>

          {!isProduction ? (
            <>
              <ol className="me-steps">
                <li className="me-step">
                  <span className="me-step-num">1</span>
                  <p className="me-step-body">
                    Crie um aplicativo em{' '}
                    <a href="https://sandbox.melhorenvio.com.br" target="_blank" rel="noreferrer">
                      sandbox.melhorenvio.com.br
                    </a>{' '}
                    (Área Dev).
                  </p>
                </li>
                <li className="me-step">
                  <span className="me-step-num">2</span>
                  <p className="me-step-body">
                    Preencha Client ID, Secret e Redirect URI do sandbox e clique em{' '}
                    <strong>Autenticar</strong>.
                  </p>
                </li>
                <li className="me-step">
                  <span className="me-step-num">3</span>
                  <p className="me-step-body">
                    Só depois de validar o fluxo de teste, ative a produção com o app real.
                  </p>
                </li>
              </ol>
              <button
                type="button"
                className="btn btn-primary"
                data-testid="me-activate-production"
                disabled={busy}
                onClick={onActivateProduction}
              >
                Ativar produção
              </button>
            </>
          ) : (
            <>
              <ol className="me-steps">
                <li className="me-step">
                  <span className="me-step-num">1</span>
                  <p className="me-step-body">
                    Use Client ID e Secret do app criado em{' '}
                    <a href="https://melhorenvio.com.br" target="_blank" rel="noreferrer">
                      melhorenvio.com.br
                    </a>
                    .
                  </p>
                </li>
                <li className="me-step">
                  <span className="me-step-num">2</span>
                  <p className="me-step-body">
                    A API base fica fixa em <code>{ME_DEFAULT_URLS.production}</code>.
                  </p>
                </li>
                <li className="me-step">
                  <span className="me-step-num">3</span>
                  <p className="me-step-body">
                    Clique em <strong>Autenticar</strong> para testar e autorizar o app de produção.
                  </p>
                </li>
              </ol>
              <button
                type="button"
                className="btn"
                data-testid="me-activate-sandbox"
                disabled={busy}
                onClick={onActivateSandbox}
              >
                Voltar ao sandbox
              </button>
            </>
          )}
        </section>
      )}
    </div>
  );
}
