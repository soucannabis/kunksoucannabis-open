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
  sendExternalTestEmail,
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

/** Pagar.me: webhooks ficam fora do bloco “Autenticar”. */
const PAGARME_WEBHOOK_FIELDS = new Set(['webhook_user', 'webhook_pass']);
const PAGARME_AUTH_FIELDS = new Set(['secret_key', 'public_key']);

const FIELD_LABELS = {
  client_id: 'Client ID',
  client_secret: 'Client Secret',
  redirect_uri: 'Redirect URI (callback OAuth)',
  api_base_url: 'API base URL',
  company_id: 'Company ID',
  token_url: 'Token URL',
  api_key: 'API Key',
  host: 'Host SMTP',
  port: 'Porta',
  secure: 'TLS implícito (secure)',
  user: 'Usuário SMTP',
  pass: 'Senha',
  from_email: 'E-mail remetente (From)',
  from_name: 'Nome do remetente',
  secret_key: 'Secret key (sk_… / sk_test_…) — obrigatória',
  public_key: 'Public key (pk_… / pk_test_…) — opcional',
  webhook_user: 'Usuário HTTP Basic (igual ao painel Pagar.me)',
  webhook_pass: 'Senha HTTP Basic (igual ao painel Pagar.me)',
  base_url: 'Base URL SouCannabis',
};

const FREIGHT_SERVICES = new Set(['loggi', 'melhorenvio']);
const SERVICE_LABELS = {
  loggi: 'Loggi',
  melhorenvio: 'Melhor Envio',
  geoapify: 'Geoapify',
  google_calendar: 'Google Calendar',
  email: 'E-mail (SMTP)',
  pagarme: 'Pagar.me',
  soucannabis_orders: 'Pedidos SouCannabis',
};

const SC_AUTH_FIELDS = new Set(['base_url', 'token_url', 'client_id', 'client_secret']);

/** Mensagem rica para erros de Autenticar (code + etapa + HTTP remoto). */
function formatExternalAuthError(err) {
  if (!err) return 'Teste falhou — nada foi persistido';
  if (err.status === 401 || /Sessão inválida/i.test(err.message || '')) {
    return 'Sessão do Admin expirada — faça login novamente e clique em Autenticar.';
  }
  const parts = [];
  if (err.code) parts.push(`[${err.code}]`);
  parts.push(err.message || 'Teste falhou — nada foi persistido');
  const d = err.details;
  if (d && typeof d === 'object') {
    const extras = [];
    if (d.step) extras.push(`etapa=${d.step}`);
    if (d.token_url) extras.push(`token_url=${d.token_url}`);
    if (d.base_url) extras.push(`base_url=${d.base_url}`);
    if (d.url) extras.push(`url=${d.url}`);
    const remoteStatus = d.remote_status ?? d.status;
    if (remoteStatus != null) extras.push(`HTTP remoto=${remoteStatus}`);
    if (Array.isArray(d.missing) && d.missing.length) {
      extras.push(`faltando=${d.missing.join(',')}`);
    }
    if (d.remote_message) extras.push(`remoto=${d.remote_message}`);
    if (d.payment_percentage != null) extras.push(`payment_percentage=${d.payment_percentage}`);
    if (extras.length) parts.push(`(${extras.join(' · ')})`);
  }
  return parts.join(' ');
}

export function ServicosExternosShell() {
  return (
    <div>
      <div className="admin-top">
        <div>
          <h1 style={{ margin: 0 }}>Serviços externos</h1>
          <p className="muted" style={{ margin: '0.25rem 0 0' }}>
            Loggi, Melhor Envio, Geoapify, Google Calendar, E-mail, Pagar.me e Pedidos SouCannabis
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
        <NavLink
          to="/servicos-externos/email"
          className={({ isActive }) => (isActive ? 'btn btn-primary' : 'btn')}
        >
          E-mail
        </NavLink>
        <NavLink
          to="/servicos-externos/pagarme"
          className={({ isActive }) => (isActive ? 'btn btn-primary' : 'btn')}
        >
          Pagar.me
        </NavLink>
        <NavLink
          to="/servicos-externos/soucannabis_orders"
          className={({ isActive }) => (isActive ? 'btn btn-primary' : 'btn')}
        >
          Pedidos SouCannabis
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
            {s.source === 'admin' ? ' (admin)' : ' (env)'}
            {FREIGHT_SERVICES.has(s.service) ? (
              <>
                {' '}
                · quote {s.use_for_quote ? 'sim' : 'não'} · label {s.use_for_label ? 'sim' : 'não'}
                {' '}
                · tracking {s.use_for_tracking ? 'sim' : 'não'}
              </>
            ) : null}
            {s.service === 'geoapify' ? (
              <> · validação {s.use_for_validation ? 'sim' : 'não'}</>
            ) : null}
            {s.service === 'google_calendar' ? (
              <> · agendamento {s.use_for_scheduling ? 'sim' : 'não'}</>
            ) : null}
            {s.service === 'pagarme' ? (
              <>
                {' '}
                · pedidos {s.use_for_orders ? 'sim' : 'não'} · serviços{' '}
                {s.use_for_services ? 'sim' : 'não'}
              </>
            ) : null}
            {s.service === 'soucannabis_orders' ? (
              <>
                {' '}
                · sync produtos {s.sync_products ? 'sim' : 'não'} · tags{' '}
                {s.sync_tags ? 'sim' : 'não'} · pedidos {s.sync_orders ? 'sim' : 'não'}
              </>
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
        Ative ou desative cada módulo nesta página. O Admin sobrescreve o padrão do
        ambiente (MODULE_*_ENABLED).
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

const EMAIL_FORM_CREDS = [
  { field_key: 'host', is_secret: false, has_value: false, value: null, description: 'Servidor SMTP' },
  { field_key: 'port', is_secret: false, has_value: false, value: '587', description: 'Porta SMTP' },
  { field_key: 'secure', is_secret: false, has_value: false, value: 'false', description: 'TLS implícito' },
  { field_key: 'user', is_secret: false, has_value: false, value: null, description: 'Usuário SMTP' },
  { field_key: 'pass', is_secret: true, has_value: false, value: null, description: 'Senha SMTP' },
  { field_key: 'from_email', is_secret: false, has_value: false, value: null, description: 'E-mail remetente' },
  { field_key: 'from_name', is_secret: false, has_value: false, value: null, description: 'Nome do remetente' },
];

function CredentialField({
  cred,
  value,
  editing,
  onChange,
  onStartEdit,
  onCancelEdit,
  envSuffix,
  alwaysEditable = false,
}) {
  const label = FIELD_LABELS[cred.field_key] || cred.description || cred.field_key;

  if (cred.field_key === 'secure') {
    const current = String(value ?? cred.value ?? 'false').toLowerCase();
    const isYes = current === 'true' || current === '1' || current === 'yes' || current === 'on';
    return (
      <fieldset className="field" style={{ marginBottom: 14, border: 0, padding: 0 }} data-testid="cred-secure">
        <legend style={{ fontWeight: 600, marginBottom: 8 }}>{label}{envSuffix || ''}</legend>
        <div style={{ display: 'flex', gap: 16 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <input
              type="radio"
              name={`cred-${cred.field_key}`}
              checked={isYes}
              onChange={() => onChange('true')}
            />
            Sim
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <input
              type="radio"
              name={`cred-${cred.field_key}`}
              checked={!isYes}
              onChange={() => onChange('false')}
            />
            Não
          </label>
        </div>
        <p className="muted" style={{ margin: '0.35rem 0 0', fontSize: '0.8rem' }}>
          Use Sim na porta 465 (TLS implícito). Na 587 use Não (STARTTLS).
        </p>
      </fieldset>
    );
  }

  const showDisplay = !alwaysEditable && cred.has_value && !editing;

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
              cred.field_key === 'user'
                ? 'email'
                : cred.is_secret
                  ? 'password'
                  : cred.field_key.includes('url')
                    ? 'url'
                    : 'text'
            }
            data-testid={`cred-${cred.field_key}`}
            placeholder={
              cred.field_key === 'pass'
                ? 'Senha SMTP'
                : cred.is_secret
                  ? 'Nova chave'
                  : ''
            }
            autoComplete={cred.field_key === 'pass' ? 'new-password' : 'off'}
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
          />
          {cred.has_value && !alwaysEditable && (
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

function CopyIcon({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="9" y="9" width="13" height="13" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

function CopyableUrlRow({ label, url, testId }) {
  const [copied, setCopied] = useState(false);
  if (!url) return null;

  async function onCopy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  }

  return (
    <div style={{ marginBottom: 10 }} data-testid={testId}>
      <div style={{ fontSize: '0.8rem', marginBottom: 4, color: 'var(--admin-text)' }}>{label}</div>
      <div className="cred-value-row" style={{ alignItems: 'flex-start', gap: 8 }}>
        <code style={{ wordBreak: 'break-all', flex: 1, fontSize: '0.85rem', color: '#fff' }}>
          {url}
        </code>
        <button
          type="button"
          className="btn-icon"
          title={copied ? 'Copiado' : 'Copiar'}
          aria-label={copied ? 'Copiado' : `Copiar ${label}`}
          onClick={onCopy}
          style={{ flexShrink: 0 }}
        >
          {copied ? '✓' : <CopyIcon />}
        </button>
      </div>
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
  const [testEmailTo, setTestEmailTo] = useState('');
  const [sendingTestEmail, setSendingTestEmail] = useState(false);
  const [outboundCreds, setOutboundCreds] = useState(null);
  const [webhookInfo, setWebhookInfo] = useState(null);
  const [pagarmeForceEdit, setPagarmeForceEdit] = useState(false);
  const [assocRecipientDraft, setAssocRecipientDraft] = useState('');
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
    if (res.sc_status) {
      setAssocRecipientDraft(res.sc_status.association_recipient_id || '');
    }
  }

  async function reload() {
    const res = await loadExternalService(api, service);
    applyLoaded(res);
    return res;
  }

  useEffect(() => () => stopOauthWait(), []);

  useEffect(() => {
    let cancelled = false;
    // Evita flash do serviço anterior (ex.: Pagar.me → Pedidos SouCannabis).
    setData(null);
    setFields({});
    setEditing({});
    setError('');
    setMsg('');
    setPagarmeForceEdit(false);
    setOutboundCreds(null);
    setWebhookInfo(null);
    setAssocRecipientDraft('');
    setCalendars([]);
    setSaving(false);
    stopOauthWait();
    (async () => {
      try {
        const res = await loadExternalService(api, service);
        if (!cancelled) {
          applyLoaded(res);
          setError('');
        }
      } catch (err) {
        if (!cancelled) {
          setData(null);
          setError(err.message || 'Falha');
        }
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
              use_for_tracking: res.use_for_tracking,
              sc_blocks_quote_label: res.sc_blocks_quote_label,
              use_for_validation: res.use_for_validation,
              use_for_scheduling: res.use_for_scheduling,
              primary_calendar_id: res.primary_calendar_id,
              config_enabled: res.config_enabled,
              enabled: res.enabled,
              source: res.source,
              env_default: res.env_default,
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
          : service === 'email' && !(data?.credentials || []).length
            ? EMAIL_FORM_CREDS
            : data?.credentials || [];

      const payload = {};
      for (const c of formCreds) {
        if (HIDDEN_CRED_FIELDS.has(c.field_key)) continue;
        // Pagar.me: Autenticar só envia secret/public; webhooks têm bloco próprio.
        if (service === 'pagarme' && PAGARME_WEBHOOK_FIELDS.has(c.field_key)) continue;
        if (service === 'pagarme' && !PAGARME_AUTH_FIELDS.has(c.field_key)) continue;
        const v = fields[c.field_key];
        if (v === undefined || v === '') continue;
        if (editing[c.field_key] || !c.has_value || service === 'email') {
          payload[c.field_key] = v;
        }
      }

      // Google: include newly typed secrets (secrets não voltam no GET).
      if (service === 'google_calendar') {
        for (const key of ['client_id', 'client_secret']) {
          const v = fields[key];
          if (v !== undefined && v !== '') payload[key] = v;
        }
      }

      // Pagar.me: secret/public tipados entram mesmo sem clicar “editar” no estado.
      if (service === 'pagarme') {
        for (const key of ['secret_key', 'public_key']) {
          const v = fields[key];
          if (v !== undefined && v !== '') payload[key] = v;
        }
      }

      // Pedidos SouCannabis: tipados entram mesmo sem “editar”.
      if (service === 'soucannabis_orders') {
        for (const key of SC_AUTH_FIELDS) {
          const v = fields[key];
          if (v !== undefined && v !== '') payload[key] = v;
        }
      }

      // E-mail: senha pode estar vazia no estado se não reeditada — só manda se preenchida.
      if (service === 'email' && fields.pass) {
        payload.pass = fields.pass;
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
      setError(formatExternalAuthError(err));
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

  async function onSendTestEmail(e) {
    e.preventDefault();
    setSendingTestEmail(true);
    setError('');
    setMsg('');
    try {
      await sendExternalTestEmail(api, testEmailTo);
      setMsg(`E-mail de teste enviado para ${testEmailTo}`);
    } catch (err) {
      setError(err.message || 'Falha ao enviar e-mail de teste');
    } finally {
      setSendingTestEmail(false);
    }
  }

  if (!data && !error) {
    return (
      <div className="card" style={{ padding: '1.25rem', maxWidth: 640 }} data-testid="ext-loading">
        <h2 style={{ margin: 0 }}>{SERVICE_LABELS[service] || service}</h2>
        <p className="muted" style={{ margin: '0.75rem 0 0' }}>
          Carregando…
        </p>
      </div>
    );
  }
  if (!data) {
    return (
      <div className="card" style={{ padding: '1.25rem', maxWidth: 640 }}>
        <h2 style={{ margin: 0 }}>{SERVICE_LABELS[service] || service}</h2>
        <p role="alert" style={{ color: '#b00020' }} data-testid="ext-error">
          {error}
        </p>
      </div>
    );
  }

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
      : service === 'email' && !(data.credentials || []).length
        ? EMAIL_FORM_CREDS
        : data.credentials || [];
  const editableCreds = credList.filter((c) => {
    if (HIDDEN_CRED_FIELDS.has(c.field_key)) return false;
    if (service === 'pagarme' && PAGARME_WEBHOOK_FIELDS.has(c.field_key)) return false;
    return true;
  });
  const pagarmeWebhookCreds = credList.filter((c) => PAGARME_WEBHOOK_FIELDS.has(c.field_key));
  const oauth = data.oauth;
  const busy = saving || oauthStarting;
  const pagarmeAuthed = Boolean(
    data.pagarme_status?.credentials_complete ||
      (data.credentials || []).some((c) => c.field_key === 'secret_key' && c.has_value)
  );
  const pagarmeWebhooksReady = Boolean(data.pagarme_status?.webhooks?.ready);
  const pagarmeWebhookAuthReady = Boolean(
    data.pagarme_status?.webhooks?.basic_auth_configured ||
      ((data.credentials || []).some((c) => c.field_key === 'webhook_user' && c.has_value) &&
        (data.credentials || []).some((c) => c.field_key === 'webhook_pass' && c.has_value)) ||
      (String(fields.webhook_user || '').trim() && String(fields.webhook_pass || '').trim())
  );
  const pagarmeTestPayment =
    data.pagarme_status?.webhooks?.test_payment || data.pagarme_status?.webhooks?.test_order || null;
  const pagarmePaymentLinkReady = Boolean(pagarmeTestPayment?.order?.id);
  const pagarmeCanEnable = pagarmeAuthed && pagarmeWebhooksReady;
  const pagarmeSetupComplete =
    pagarmeAuthed && pagarmePaymentLinkReady && pagarmeWebhooksReady;
  const pagarmeShowSetup = !pagarmeSetupComplete || pagarmeForceEdit;
  const pagarmeSetupBlockStyle = {
    marginTop: 16,
    padding: '1.1rem 1.15rem',
    border: '1px solid var(--admin-border)',
    borderRadius: 10,
    background: '#151a16',
  };
  const pagarmeConnectedRowStyle = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    padding: '10px 12px',
    borderRadius: 8,
    border: '1px solid #2e5a3a',
    background: '#1a2a1c',
    color: '#7dcea0',
    fontWeight: 600,
  };

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
        Estado efetivo:{' '}
        <strong data-testid="module-enabled-status">
          {data.enabled ? 'habilitado' : 'desabilitado'}
        </strong>
        {' · '}
        fonte {data.source === 'admin' ? 'Admin' : 'ambiente (MODULE_*)'}
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

      <label
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          margin: '12px 0 16px',
          padding: '10px 12px',
          border: '1px solid var(--admin-border)',
          borderRadius: 8,
          background: data.enabled ? '#1a2a1c' : '#151a16',
          color: 'var(--admin-text)',
        }}
        data-testid="module-enabled-toggle"
      >
        <input
          type="checkbox"
          checked={Boolean(data.enabled) && (service !== 'pagarme' || pagarmeCanEnable)}
          disabled={service === 'pagarme' && !pagarmeCanEnable}
          onChange={(e) => onToggle('enabled', e.target.checked)}
        />
        <span>
          <strong style={{ color: 'var(--admin-text)' }}>Módulo ativo</strong>
          <span style={{ display: 'block', fontSize: '0.85rem', color: 'var(--admin-muted)' }}>
            {service === 'pagarme'
              ? 'Só pode ativar com API autenticada, link de teste e webhooks validados. A validação ativa o módulo automaticamente.'
              : 'Quando desligado, o serviço não envia e-mails / não é usado em runtime. O valor salvo no Admin sobrescreve o env.'}
          </span>
          {service === 'pagarme' && !pagarmeCanEnable && (
            <span style={{ display: 'block', fontSize: '0.8rem', color: 'var(--admin-danger)', marginTop: 4 }}>
              {!pagarmeAuthed
                ? 'Autentique a Secret key (passo 1).'
                : !pagarmePaymentLinkReady
                  ? 'Crie um link de pagamento de teste (passo 2).'
                  : 'Valide os webhooks (passo 3) antes de ativar.'}
            </span>
          )}
        </span>
      </label>

      {FREIGHT_SERVICES.has(service) ? (
        <>
          {data.sc_blocks_quote_label ? (
            <p style={{ marginBottom: 12, color: '#664d03', background: '#fff3cd', padding: 8, borderRadius: 4 }}>
              Pedidos SouCannabis ativo: cotação e etiqueta ficam desligadas. Ative o módulo e use
              só <strong>Tracking (código de rastreio)</strong> para consultar status.
            </p>
          ) : null}
          <label style={{ display: 'block', marginBottom: 8, opacity: data.sc_blocks_quote_label ? 0.5 : 1 }}>
            <input
              type="checkbox"
              data-testid="use-for-quote"
              checked={Boolean(data.use_for_quote)}
              disabled={Boolean(data.sc_blocks_quote_label)}
              onChange={(e) => onToggle('use_for_quote', e.target.checked)}
            />{' '}
            Usar na cotação
          </label>
          <label style={{ display: 'block', marginBottom: 8, opacity: data.sc_blocks_quote_label ? 0.5 : 1 }}>
            <input
              type="checkbox"
              data-testid="use-for-label"
              checked={Boolean(data.use_for_label)}
              disabled={Boolean(data.sc_blocks_quote_label)}
              onChange={(e) => onToggle('use_for_label', e.target.checked)}
            />{' '}
            Usar na etiqueta
          </label>
          <label style={{ display: 'block', marginBottom: 16 }}>
            <input
              type="checkbox"
              data-testid="use-for-tracking"
              checked={Boolean(data.use_for_tracking)}
              onChange={(e) => onToggle('use_for_tracking', e.target.checked)}
            />{' '}
            Tracking (código de rastreio)
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

      {service === 'pagarme' ? (
        <>
          <label style={{ display: 'block', marginBottom: 8 }}>
            <input
              type="checkbox"
              data-testid="use-for-orders"
              checked={data.use_for_orders !== false}
              onChange={(e) => onToggle('use_for_orders', e.target.checked)}
            />{' '}
            Usar em pedidos
          </label>
          <label style={{ display: 'block', marginBottom: 16 }}>
            <input
              type="checkbox"
              data-testid="use-for-services"
              checked={data.use_for_services !== false}
              onChange={(e) => onToggle('use_for_services', e.target.checked)}
            />{' '}
            Usar em serviços
          </label>
        </>
      ) : null}

      {service === 'soucannabis_orders' ? (
        <>
          <label style={{ display: 'block', marginBottom: 8 }}>
            <input
              type="checkbox"
              data-testid="sync-products"
              checked={data.sync_products !== false}
              onChange={(e) => onToggle('sync_products', e.target.checked)}
            />{' '}
            Sync produtos
          </label>
          <label style={{ display: 'block', marginBottom: 8 }}>
            <input
              type="checkbox"
              data-testid="sync-tags"
              checked={data.sync_tags !== false}
              onChange={(e) => onToggle('sync_tags', e.target.checked)}
            />{' '}
            Sync tags
          </label>
          <label style={{ display: 'block', marginBottom: 16 }}>
            <input
              type="checkbox"
              data-testid="sync-orders"
              checked={data.sync_orders !== false}
              onChange={(e) => onToggle('sync_orders', e.target.checked)}
            />{' '}
            Sync pedidos
          </label>
        </>
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

      {service === 'pagarme' && pagarmeSetupComplete && !pagarmeForceEdit && (
        <div
          data-testid="pagarme-connected-summary"
          style={{ ...pagarmeSetupBlockStyle, borderColor: '#2e5a3a' }}
        >
          <p style={{ margin: '0 0 12px', color: '#7dcea0', fontWeight: 700, fontSize: '1.05rem' }}>
            Pagar.me conectado
          </p>
          <div style={{ display: 'grid', gap: 8 }}>
            <div data-testid="pagarme-connected-auth" style={pagarmeConnectedRowStyle}>
              <span>1. API autenticada</span>
              <span>conectado</span>
            </div>
            <div data-testid="pagarme-connected-payment" style={pagarmeConnectedRowStyle}>
              <span>2. Link de pagamento</span>
              <span>conectado</span>
            </div>
            <div data-testid="pagarme-connected-webhooks" style={pagarmeConnectedRowStyle}>
              <span>3. Webhooks</span>
              <span>conectado</span>
            </div>
          </div>
          <button
            type="button"
            className="btn"
            data-testid="pagarme-reconfigure"
            style={{ marginTop: 14 }}
            onClick={() => setPagarmeForceEdit(true)}
          >
            Reconfigurar
          </button>
        </div>
      )}

      {service === 'pagarme' && pagarmeShowSetup && (
        <div
          data-testid="pagarme-step-auth"
          style={pagarmeSetupBlockStyle}
        >
          <h3 style={{ marginTop: 0 }}>1. Autenticar API</h3>
          {pagarmeAuthed ? (
            <p
              data-testid="pagarme-auth-ok"
              style={{ color: '#7dcea0', margin: '0 0 12px', fontWeight: 600 }}
            >
              Autenticado
              {data.pagarme_status?.is_psp === true
                ? ' · conta PSP'
                : data.pagarme_status?.is_psp === false
                  ? ' · conta Gateway (sem split)'
                  : ''}
            </p>
          ) : (
            <p className="muted" style={{ marginTop: 0, fontSize: '0.85rem' }}>
              Salve e teste a <strong>Secret key</strong> (<code>sk_test_…</code>). Public key é
              opcional. O passo 2 abre depois da autenticação.
            </p>
          )}
          <form onSubmit={onAuthenticate} autoComplete="off">
            {editableCreds.map((c) => (
              <CredentialField
                key={c.field_key}
                cred={c}
                value={fields[c.field_key]}
                editing={Boolean(editing[c.field_key])}
                alwaysEditable={false}
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
                {busy ? 'Autenticando…' : pagarmeAuthed ? 'Reautenticar' : 'Autenticar'}
              </button>
              {pagarmeSetupComplete && (
                <button
                  type="button"
                  className="btn"
                  data-testid="pagarme-close-setup"
                  onClick={() => setPagarmeForceEdit(false)}
                >
                  Fechar
                </button>
              )}
            </div>
            <p className="muted" data-testid="pagarme-auth-hint" style={{ marginTop: 10 }}>
              Autenticar salva secret/public e testa a API (lista recipients → indica se a conta é
              PSP). Contas Gateway só suportam Pagar.me standalone, sem split SouCannabis.
            </p>
          </form>
        </div>
      )}

      {service !== 'pagarme' && (
        <>
          <h3>Credenciais de conexão</h3>
          <form onSubmit={onAuthenticate} autoComplete="off">
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
                alwaysEditable={service === 'email'}
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
            {service === 'email' && (
              <p className="muted" data-testid="email-smtp-hint">
                Autenticar valida a conexão SMTP (VERIFY). Depois use o campo abaixo para enviar um
                e-mail de teste. Ative o módulo no interruptor acima para liberar o envio nos sistemas.
              </p>
            )}
            {service === 'soucannabis_orders' && (
              <p className="muted" data-testid="sc-auth-hint">
                Autenticar obtém token OAuth, valida /me (payment_percentage inteiro) e testa products/tags.
                Exige Pagar.me ativo e conta PSP.
              </p>
            )}
          </form>
        </>
      )}

      {error && (
        <p
          role="alert"
          data-testid="ext-error"
          style={{ color: '#b00020', margin: '0.75rem 0 0', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
        >
          {error}
        </p>
      )}
      {msg && (
        <p data-testid="ext-msg" style={{ color: '#2e7d32', margin: '0.75rem 0 0' }}>
          {msg}
        </p>
      )}

      {service === 'pagarme' && pagarmeShowSetup && pagarmeAuthed && (
        <section
          data-testid="pagarme-test-payment"
          style={pagarmeSetupBlockStyle}
        >
          <h3 style={{ marginTop: 0 }}>2. Link de pagamento de teste</h3>
          <p className="muted" style={{ fontSize: '0.85rem', marginTop: 0 }}>
            Cria um checkout boleto na Pagar.me (<code>KUNK_WH_*</code>). Isso dispara o{' '}
            <code>order.created</code> que o passo 3 vai conferir — não pague o boleto.
          </p>
          {pagarmePaymentLinkReady && pagarmeTestPayment ? (
            <div
              data-testid="pagarme-test-payment-result"
              style={{
                margin: '0 0 14px',
                padding: '10px 12px',
                borderRadius: 8,
                border: '1px solid var(--admin-border)',
                background: '#1a2a1c',
              }}
            >
              <p style={{ margin: '0 0 6px', color: '#7dcea0', fontWeight: 600 }}>
                Link de pagamento criado
              </p>
              <p style={{ margin: '0 0 6px', fontSize: '0.85rem', color: 'var(--admin-muted)' }}>
                Pedido <code>{pagarmeTestPayment.order.id}</code>
                {' · '}
                code <code>{pagarmeTestPayment.code}</code>
                {' · '}
                status {pagarmeTestPayment.order.status}
              </p>
              {pagarmeTestPayment.payment_url ? (
                <>
                  <CopyableUrlRow
                    label="Link de pagamento"
                    url={pagarmeTestPayment.payment_url}
                    testId="pagarme-payment-link"
                  />
                  <a
                    href={pagarmeTestPayment.payment_url}
                    target="_blank"
                    rel="noreferrer"
                    data-testid="pagarme-payment-link-open"
                    style={{ fontSize: '0.85rem' }}
                  >
                    Abrir link de pagamento
                  </a>
                </>
              ) : (
                <p className="muted" style={{ margin: 0, fontSize: '0.85rem' }}>
                  Pedido criado, mas a Pagar.me não retornou URL de checkout.
                </p>
              )}
            </div>
          ) : null}
          <button
            type="button"
            className="btn"
            data-testid="pagarme-create-test-payment"
            disabled={busy}
            onClick={async () => {
              setSaving(true);
              setError('');
              setMsg('');
              try {
                const res = await api.createPagarmeTestPaymentLink();
                const tp = res.data;
                setPagarmeForceEdit(true);
                setData((prev) =>
                  prev
                    ? {
                        ...prev,
                        pagarme_status: {
                          ...(prev.pagarme_status || {}),
                          webhooks: {
                            ...(prev.pagarme_status?.webhooks || {}),
                            test_payment: tp,
                            test_order: tp,
                            ready: false,
                          },
                        },
                      }
                    : prev
                );
                setMsg(
                  tp?.payment_url
                    ? 'Link de pagamento criado. Configure os webhooks e valide no passo 3.'
                    : `Pedido ${tp?.order?.id || tp?.code} criado. Configure os webhooks no passo 3.`
                );
                await reload();
              } catch (err) {
                setError(err.message || 'Falha ao criar link de pagamento');
              } finally {
                setSaving(false);
              }
            }}
          >
            {busy
              ? 'Criando link…'
              : pagarmePaymentLinkReady
                ? 'Criar novo link de pagamento'
                : 'Criar link de pagamento'}
          </button>
        </section>
      )}

      {service === 'pagarme' && pagarmeShowSetup && pagarmeAuthed && pagarmePaymentLinkReady && (
        <section
          data-testid="pagarme-webhooks"
          style={pagarmeSetupBlockStyle}
        >
          <h3 style={{ marginTop: 0 }}>3. Webhooks</h3>
          <p
            data-testid="pagarme-webhooks-dashboard-hint"
            style={{
              fontSize: '0.85rem',
              margin: '0 0 14px',
              padding: '8px 10px',
              background: '#f4f6f4',
              borderRadius: 6,
              color: '#000',
            }}
          >
            Conta → Configurações → Webhooks → Criar webhook. Eventos:{' '}
            <code>order.created</code> (obrigatório) e <code>order.paid</code>. Copie as URLs, use
            usuário/senha abaixo e clique em Validar — a API confere se já recebeu o{' '}
            <code>order.created</code> do link do passo 2. Isso pode levar até 1 minuto; se ainda
            não aparecer, tente de novo em breve. Se ok, o módulo é ativado.
          </p>

          <div style={{ marginBottom: 16 }}>
            <CopyableUrlRow
              label="Pedidos"
              url={data.webhook_urls?.orders}
              testId="webhook-orders"
            />
            <CopyableUrlRow
              label="Serviços"
              url={data.webhook_urls?.services}
              testId="webhook-services"
            />
          </div>

          <div
            data-testid="pagarme-webhooks-status"
            style={{ marginBottom: 14, fontSize: '0.85rem', color: 'var(--admin-text)' }}
          >
            <p style={{ margin: '0 0 6px' }}>
              Webhooks válidos:{' '}
              {pagarmeWebhooksReady ? (
                <span style={{ color: '#7dcea0' }}>sim</span>
              ) : (
                <span style={{ color: 'var(--admin-danger)' }}>não</span>
              )}
              {data.pagarme_status?.webhooks?.validated_at
                ? ` · última tentativa ${data.pagarme_status.webhooks.validated_at}`
                : ''}
            </p>
            {data.pagarme_status?.webhooks?.details && (
              <p style={{ margin: '0 0 6px', color: 'var(--admin-muted)' }}>
                Endpoints:{' '}
                {data.pagarme_status.webhooks.details.public_ok
                  ? 'OK'
                  : data.pagarme_status.webhooks.details.public_ok == null
                    ? '—'
                    : 'falhou'}
                {' · '}
                order.created:{' '}
                {data.pagarme_status.webhooks.details.order_created_event ? (
                  <span style={{ color: '#7dcea0' }}>recebido pela API</span>
                ) : (
                  <span style={{ color: 'var(--admin-danger)' }}>ainda não</span>
                )}
              </p>
            )}
            {data.pagarme_status?.webhooks?.webhook_receipt && (
              <p
                style={{
                  margin: '0 0 6px',
                  color:
                    data.pagarme_status.webhooks.webhook_receipt.type === 'order.created' &&
                    data.pagarme_status.webhooks.webhook_receipt.auth_ok !== false
                      ? '#7dcea0'
                      : 'var(--admin-warn)',
                }}
              >
                Webhook recebido:{' '}
                <code>{data.pagarme_status.webhooks.webhook_receipt.type || 'evento'}</code>
                {' · code '}
                <code>{data.pagarme_status.webhooks.webhook_receipt.code}</code>
                {data.pagarme_status.webhooks.webhook_receipt.auth_ok === false
                  ? ' · Basic Auth falhou'
                  : ''}
                {' · '}
                {data.pagarme_status.webhooks.webhook_receipt.at}
              </p>
            )}
            {data.pagarme_status?.webhooks?.reason && !pagarmeWebhooksReady && (
              <p style={{ margin: '0 0 8px', color: 'var(--admin-danger)', whiteSpace: 'pre-wrap' }}>
                {data.pagarme_status.webhooks.reason}
              </p>
            )}
          </div>

          <form
            autoComplete="off"
            onSubmit={async (e) => {
              e.preventDefault();
              setSaving(true);
              setError('');
              setMsg('');
              try {
                const payload = {};
                for (const key of ['webhook_user', 'webhook_pass']) {
                  const cred = pagarmeWebhookCreds.find((c) => c.field_key === key);
                  const typed = String(fields[key] || '').trim();
                  if (typed) payload[key] = typed;
                  else if (!cred?.has_value) {
                    throw new Error('Usuário e senha do webhook são obrigatórios');
                  }
                }
                if (!payload.webhook_user && !payload.webhook_pass) {
                  const hasUser = pagarmeWebhookCreds.some(
                    (c) => c.field_key === 'webhook_user' && c.has_value
                  );
                  const hasPass = pagarmeWebhookCreds.some(
                    (c) => c.field_key === 'webhook_pass' && c.has_value
                  );
                  if (!hasUser || !hasPass) {
                    throw new Error('Usuário e senha do webhook são obrigatórios');
                  }
                }
                if (Object.keys(payload).length) {
                  await saveExternalCredentials(api, 'pagarme', payload, false);
                }
                setMsg('Usuário e senha do webhook salvos — valide os webhooks');
                await reload();
              } catch (err) {
                setError(err.message || 'Falha ao salvar webhooks');
              } finally {
                setSaving(false);
              }
            }}
          >
            {pagarmeWebhookCreds.map((c) => (
              <CredentialField
                key={c.field_key}
                cred={c}
                value={fields[c.field_key]}
                editing={Boolean(editing[c.field_key])}
                alwaysEditable={false}
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
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              <button
                type="submit"
                className="btn"
                data-testid="save-pagarme-webhooks"
                disabled={busy}
              >
                {busy ? 'Salvando…' : 'Salvar usuário e senha'}
              </button>
              <button
                type="button"
                className="btn"
                data-testid="validate-pagarme-webhooks"
                disabled={busy || !pagarmeWebhookAuthReady}
                onClick={async () => {
                  if (!pagarmeWebhookAuthReady) {
                    setError('Informe e salve usuário e senha do webhook antes de validar');
                    return;
                  }
                  setSaving(true);
                  setError('');
                  setMsg('');
                  try {
                    const payload = {};
                    for (const key of ['webhook_user', 'webhook_pass']) {
                      const typed = String(fields[key] || '').trim();
                      if (typed) payload[key] = typed;
                    }
                    if (Object.keys(payload).length) {
                      await saveExternalCredentials(api, 'pagarme', payload, false);
                    }
                    const res = await api.validatePagarmeWebhooks();
                    const st = res.data;
                    setData((prev) =>
                      prev
                        ? {
                            ...prev,
                            pagarme_status: {
                              ...(prev.pagarme_status || {}),
                              webhooks: st,
                            },
                            enabled: st?.ready ? true : prev.enabled,
                          }
                        : prev
                    );
                    if (st?.ready) {
                      setPagarmeForceEdit(false);
                      setMsg('Webhooks válidos — Pagar.me conectado');
                    } else {
                      setError(
                        st?.reason ||
                          'Ainda não encontramos o webhook do link. Isso pode levar até 1 minuto — tente novamente em breve.'
                      );
                    }
                    await reload();
                  } catch (err) {
                    setError(err.message || 'Falha ao validar webhooks');
                  } finally {
                    setSaving(false);
                  }
                }}
              >
                {busy ? 'Validando…' : 'Validar webhooks'}
              </button>
            </div>
          </form>
        </section>
      )}



      {service === 'soucannabis_orders' && (
        <>
          <section
            data-testid="sc-split-mode"
            style={{ marginTop: 24, paddingTop: 16, borderTop: '1px solid #ddd' }}
          >
            <h3 style={{ marginTop: 0 }}>Modo split</h3>
            {!data.sc_status?.pagarme_ok && (
              <p role="alert" style={{ color: '#b00020' }} data-testid="sc-pagarme-gate">
                Ative e autentique o Pagar.me (conta PSP) antes de informar o ID do recebedor e
                ligar o módulo.
              </p>
            )}
            {data.sc_status && (
              <ul style={{ fontSize: '0.9rem', lineHeight: 1.7, marginBottom: 16 }}>
                <li>
                  Conta PSP:{' '}
                  {data.sc_status.is_psp ? (
                    <span style={{ color: '#2e7d32' }}>sim</span>
                  ) : (
                    <span style={{ color: '#b00020' }}>não</span>
                  )}
                </li>
                <li>
                  payment_percentage:{' '}
                  <strong data-testid="sc-pct">
                    {data.sc_status.payment_percentage ?? '—'}
                  </strong>
                  {data.sc_status.payment_percentage_ok === false && (
                    <span style={{ color: '#b00020' }}> (não inteiro — bloqueado)</span>
                  )}
                </li>
                <li>
                  Recipient associação:{' '}
                  <code data-testid="assoc-recipient-id">
                    {data.sc_status.association_recipient_id || '—'}
                  </code>
                </li>
                <li>
                  Recipient SouCannabis:{' '}
                  <code data-testid="sc-recipient-id">
                    {data.sc_status.soucannabis_recipient_id ||
                      'ainda não criado (outbound SC → POST …/pagarme/recipients)'}
                  </code>
                </li>
                <li>
                  Split pronto:{' '}
                  {data.sc_status.split_ready ? (
                    <span style={{ color: '#2e7d32' }}>sim</span>
                  ) : (
                    <span style={{ color: '#b00020' }}>não</span>
                  )}
                </li>
              </ul>
            )}
            <h4 style={{ margin: '0 0 8px' }}>Recebedor da associação</h4>
            <p className="muted" style={{ fontSize: '0.85rem', marginTop: 0 }}>
              Cadastre o recebedor no painel Pagar.me e informe o ID aqui (ex.:{' '}
              <code>re_…</code> ou <code>rp_…</code>).
            </p>
            <form
              data-testid="association-recipient-id-form"
              onSubmit={async (e) => {
                e.preventDefault();
                setSaving(true);
                setError('');
                setMsg('');
                try {
                  const id = String(assocRecipientDraft || '').trim();
                  await saveExternalServiceFlags(api, service, {
                    association_recipient_id: id || null,
                  });
                  setMsg(
                    id
                      ? `Recebedor da associação gravado: ${id}`
                      : 'Recebedor da associação removido'
                  );
                  await reload();
                } catch (err) {
                  setError(err.message || 'Falha ao gravar recipient_id');
                } finally {
                  setSaving(false);
                }
              }}
              style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'flex-end' }}
            >
              <div className="field" style={{ flex: '1 1 220px', marginBottom: 0 }}>
                <label htmlFor="assoc-recipient-id-input">ID do recebedor</label>
                <input
                  id="assoc-recipient-id-input"
                  className="input"
                  data-testid="assoc-recipient-id-input"
                  value={assocRecipientDraft}
                  disabled={busy || !Boolean(data.sc_status?.is_psp || data.sc_status?.pagarme_ok)}
                  onChange={(e) => setAssocRecipientDraft(e.target.value)}
                  placeholder="re_… ou rp_…"
                  autoComplete="off"
                />
              </div>
              <button
                type="submit"
                className="btn btn-primary"
                data-testid="save-assoc-recipient-id"
                disabled={busy || !Boolean(data.sc_status?.is_psp || data.sc_status?.pagarme_ok)}
              >
                {busy ? 'Salvando…' : 'Salvar ID'}
              </button>
            </form>
          </section>

          <section
            data-testid="sc-setup"
            style={{ marginTop: 24, paddingTop: 16, borderTop: '1px solid #ddd' }}
          >
            <h3 style={{ marginTop: 0 }}>Outbound (SC → esta instalação)</h3>
            <p className="muted" style={{ fontSize: '0.85rem' }}>
              Credenciais que a SouCannabis usa para espelhar pedidos e cadastrar o recipient SC via{' '}
              <code>POST …/outbound/pagarme/recipients</code>.
            </p>
            {data.sc_status?.remote_app_id != null && (
              <p className="muted" style={{ fontSize: '0.85rem' }}>
                remote_app_id: {data.sc_status.remote_app_id || '—'}
              </p>
            )}
            <button
              type="button"
              className="btn"
              data-testid="sc-outbound-creds"
              style={{ marginTop: 8 }}
              onClick={async () => {
                setError('');
                try {
                  const res = await api.getSoucannabisOutboundCredentials({ reveal: true });
                  setOutboundCreds(res.data);
                  setMsg('Credenciais outbound geradas/carregadas');
                } catch (err) {
                  setError(err.message || 'Falha ao obter outbound');
                }
              }}
            >
              Gerar / mostrar credenciais outbound
            </button>
            {outboundCreds && (
              <div
                data-testid="sc-outbound-panel"
                style={{
                  marginTop: 12,
                  padding: '0.85rem 1rem',
                  background: '#f7f7f7',
                  borderRadius: 8,
                  fontSize: '0.85rem',
                  color: '#000',
                }}
              >
                <p style={{ color: '#000' }}>
                  client_id: <code style={{ color: '#000' }}>{outboundCreds.client_id}</code>
                </p>
                {outboundCreds.client_secret && (
                  <p style={{ color: '#000' }}>
                    client_secret:{' '}
                    <code style={{ color: '#000' }}>{outboundCreds.client_secret}</code>
                  </p>
                )}
                {outboundCreds.base_url && (
                  <p style={{ color: '#000' }}>
                    base_url: <code style={{ color: '#000' }}>{outboundCreds.base_url}</code>
                  </p>
                )}
                {outboundCreds.paths && (
                  <ul style={{ margin: '0.5rem 0 0', paddingLeft: '1.1rem', color: '#000' }}>
                    {Object.entries(outboundCreds.paths).map(([k, v]) => (
                      <li key={k}>
                        {k}: <code style={{ color: '#000' }}>{v}</code>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </section>

          <section
            data-testid="sc-webhook-sync"
            style={{ marginTop: 24, paddingTop: 16, borderTop: '1px solid #ddd' }}
          >
            <h3 style={{ marginTop: 0 }}>Webhook — sincronização manual de pedidos</h3>
            <p className="muted" style={{ fontSize: '0.85rem' }}>
              Endpoint para o Kunk legado enviar atualizações de pedidos (sync manual). Autenticado com as{' '}
              <strong>credenciais outbound</strong> (as mesmas de “Gerar / mostrar credenciais outbound”
              acima).
            </p>
            <button
              type="button"
              className="btn"
              data-testid="sc-webhook-info"
              style={{ marginTop: 8 }}
              onClick={async () => {
                setError('');
                try {
                  const res = await api.getSoucannabisWebhooksInfo();
                  setWebhookInfo(res.data);
                  setMsg('URL do webhook carregada');
                } catch (err) {
                  setError(err.message || 'Falha ao obter webhook');
                }
              }}
            >
              Mostrar URL do webhook
            </button>
            {webhookInfo && (
              <div
                data-testid="sc-webhook-panel"
                style={{
                  marginTop: 12,
                  padding: '0.85rem 1rem',
                  background: '#f7f7f7',
                  borderRadius: 8,
                  fontSize: '0.85rem',
                  color: '#000',
                }}
              >
                <p style={{ color: '#000', marginTop: 0 }}>
                  Auth: {webhookInfo.auth || 'client_id / client_secret outbound'}
                </p>
                <p style={{ color: '#000' }}>
                  Token:{' '}
                  <code style={{ color: '#000', wordBreak: 'break-all' }}>{webhookInfo.token_url}</code>
                </p>
                <p style={{ color: '#000' }}>
                  Sync pedidos:{' '}
                  <code style={{ color: '#000', wordBreak: 'break-all' }}>
                    {webhookInfo.orders_sync_url}
                  </code>
                </p>
                <p className="muted" style={{ fontSize: '0.8rem', color: '#333' }}>
                  <code>POST</code> token com outbound <code>{'{ client_id, client_secret }'}</code> →
                  depois <code>POST</code> sync com <code>Authorization: Bearer …</code> (também vale o
                  token de <code>…/outbound/auth/token</code>). Alternativa: HTTP Basic ou{' '}
                  <code>X-Client-Id</code> + <code>X-Client-Secret</code>.
                </p>
                <pre
                  style={{
                    margin: '0.75rem 0 0',
                    padding: '0.75rem',
                    background: '#fff',
                    borderRadius: 6,
                    overflow: 'auto',
                    fontSize: '0.75rem',
                    color: '#000',
                  }}
                >
                  {JSON.stringify(
                    webhookInfo.example?.sync?.body || {
                      orders: [
                        {
                          id: 47368,
                          external_id: 'uuid-do-pedido-oss',
                          status: 'Aguardando aprovação',
                          tracking_code: 'ABC123',
                          external_delivery_type: 'loggi',
                        },
                      ],
                    },
                    null,
                    2
                  )}
                </pre>
              </div>
            )}
          </section>
        </>
      )}

      {service === 'email' && (
        <form
          onSubmit={onSendTestEmail}
          data-testid="email-test-form"
          style={{ marginTop: 24, paddingTop: 16, borderTop: '1px solid #ddd' }}
        >
          <h3 style={{ marginTop: 0 }}>E-mail de teste</h3>
          <p className="muted" style={{ fontSize: '0.85rem' }}>
            Envia uma mensagem padrão para validar envio real (além do VERIFY da conexão).
          </p>
          <div className="field" style={{ marginBottom: 12 }}>
            <label htmlFor="test-email-to">Destinatário</label>
            <input
              id="test-email-to"
              className="input"
              type="email"
              data-testid="test-email-to"
              value={testEmailTo}
              onChange={(e) => setTestEmailTo(e.target.value)}
              placeholder="voce@exemplo.com"
              required
            />
          </div>
          <button
            type="submit"
            className="btn"
            data-testid="send-test-email"
            disabled={sendingTestEmail || !testEmailTo}
          >
            {sendingTestEmail ? 'Enviando…' : 'Enviar e-mail de teste'}
          </button>
        </form>
      )}

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
