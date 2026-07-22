import React from 'react';
import { NavLink, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useOperatorAuth } from '@kunk/auth-session';
import { rememberAdminRoute } from '../lib/lastRoute.js';
import { dismissStoragePrompt, isStoragePromptDismissed } from '../lib/storageConfig.js';
import {
  EMAIL_CONFIG_PATH,
} from '../lib/emailModuleConfig.js';
import { loadExternalServices } from '../lib/externalServicesConfig.js';
import {
  EXT_FREIGHT_SLUGS,
  EXT_OTHER_SLUGS,
  EXT_SERVICE_LABELS,
  deriveExternalServiceStatus,
  deriveShippingStatus,
} from '../lib/externalServiceStatus.js';
import { ExternalServiceStatusIcon } from '../components/ExternalServiceStatus.jsx';
import { AdminLoader } from '../components/AdminLoader.jsx';
import { useInstallStatus } from '../lib/installStatus.jsx';

export function RequireAdmin({ children }) {
  const { user, loading, hasRequiredRole } = useOperatorAuth();
  const { needsInstall, canInstallSample, loading: installLoading } = useInstallStatus();
  const location = useLocation();

  if (loading || installLoading || needsInstall == null) {
    return <AdminLoader label="Carregando sessão…" className="admin-loader--viewport" />;
  }
  if (needsInstall || canInstallSample) {
    return <Navigate to="/instalacao" replace />;
  }
  if (!user) {
    const next = encodeURIComponent(`${location.pathname}${location.search}`);
    return <Navigate to={`/login?next=${next}`} replace />;
  }
  if (!hasRequiredRole) {
    return <Navigate to="/sem-permissao" replace />;
  }
  return children;
}

function StoragePromptModal({ open, onYes, onNo }) {
  if (!open) return null;
  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Configurar armazenamento">
      <div className="modal-card">
        <h2 style={{ marginTop: 0 }}>Armazenamento em nuvem</h2>
        <p>
          O sistema está usando disco local para arquivos. Recomendamos configurar um bucket
          (Amazon S3 ou Google Cloud Storage) para maior resiliência e backups.
        </p>
        <p className="muted">Deseja configurar o armazenamento em nuvem agora?</p>
        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
          <button type="button" className="btn" onClick={onNo}>
            Não
          </button>
          <button type="button" className="btn btn-primary" onClick={onYes}>
            Sim
          </button>
        </div>
      </div>
    </div>
  );
}

function EmailPromptModal({ open, onConfigure }) {
  if (!open) return null;
  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Configurar módulo de e-mail">
      <div className="modal-card" style={{ maxWidth: 480 }}>
        <h2 style={{ marginTop: 0 }}>Módulo de e-mail necessário</h2>
        <p>
          O envio de e-mails está desativado. Esse módulo é essencial para o funcionamento dos
          sistemas: convites de operadores, redefinição de senha, assinatura de documentos e
          outras notificações.
        </p>
        <p className="muted">
          Ative o módulo e configure o SMTP em Serviços externos → E-mail para continuar com os
          fluxos que dependem de e-mail.
        </p>
        <div
          style={{
            display: 'flex',
            gap: '0.5rem',
            justifyContent: 'flex-end',
            marginTop: '1rem',
          }}
        >
          <button type="button" className="btn btn-primary" onClick={onConfigure}>
            Configurar
          </button>
        </div>
      </div>
    </div>
  );
}

function ExtNavLink({ to, end, status, children }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) => `admin-nav-ext-link${isActive ? ' active' : ''}`}
    >
      {status ? (
        <ExternalServiceStatusIcon kind={status.kind} label={status.label} />
      ) : (
        <span className="ext-status-dot ext-status-dot--disabled" aria-hidden="true" />
      )}
      <span>{children}</span>
    </NavLink>
  );
}

export function AdminShell({ api }) {
  const { user, logout } = useOperatorAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showStoragePrompt, setShowStoragePrompt] = React.useState(false);
  const [emailModuleActive, setEmailModuleActive] = React.useState(null);
  const [emailPromptOpen, setEmailPromptOpen] = React.useState(false);
  const [extStatuses, setExtStatuses] = React.useState({});

  const onEmailConfigPage = location.pathname === EMAIL_CONFIG_PATH;

  React.useEffect(() => {
    rememberAdminRoute(location.pathname, location.search);
  }, [location.pathname, location.search]);

  React.useEffect(() => {
    window.scrollTo(0, 0);
    const main = document.querySelector('.admin-main');
    if (main) main.scrollTop = 0;
  }, [location.pathname]);

  const refreshExtStatuses = React.useCallback(async () => {
    if (!api) return;
    try {
      const res = await loadExternalServices(api);
      const next = {};
      for (const s of res.services || []) {
        next[s.service] = deriveExternalServiceStatus(s);
      }
      next.envio = deriveShippingStatus(res.store_incomplete);
      setExtStatuses(next);

      const emailService = (res.services || []).find((s) => s.service === 'email');
      const active = emailService ? Boolean(emailService.enabled) : false;
      setEmailModuleActive(active);
      if (!active) {
        setEmailPromptOpen(true);
      } else {
        setEmailPromptOpen(false);
      }
    } catch {
      /* menu continua sem dots coloridos */
    }
  }, [api]);

  React.useEffect(() => {
    refreshExtStatuses();
  }, [refreshExtStatuses, location.pathname]);

  React.useEffect(() => {
    function onChanged() {
      refreshExtStatuses();
    }
    window.addEventListener('kunk:external-services-changed', onChanged);
    return () => window.removeEventListener('kunk:external-services-changed', onChanged);
  }, [refreshExtStatuses]);

  React.useEffect(() => {
    if (!api || isStoragePromptDismissed()) return undefined;
    let cancelled = false;
    (async () => {
      try {
        const res = await api.getStorageStatus();
        const driver = res.data?.driver || 'local';
        if (!cancelled && driver === 'local') {
          setShowStoragePrompt(true);
        }
      } catch {
        /* ignore — seed SQL pode ainda não ter sido aplicado */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [api]);

  async function onLogout() {
    await logout();
    navigate('/login');
  }

  function onStorageYes() {
    setShowStoragePrompt(false);
    navigate('/armazenamento');
  }

  function onStorageNo() {
    dismissStoragePrompt();
    setShowStoragePrompt(false);
  }

  function onEmailConfigure() {
    setEmailPromptOpen(false);
    navigate(EMAIL_CONFIG_PATH);
  }

  const showEmailModal = emailPromptOpen && emailModuleActive === false && !onEmailConfigPage;
  const showStorageModal = showStoragePrompt && emailModuleActive === true;

  return (
    <div className="admin-shell">
      <aside className="admin-nav">
        <div className="brand">Kunk Admin</div>

        <NavLink to="/inicio" className={({ isActive }) => (isActive ? 'active' : '')}>
          Início
        </NavLink>

        <NavLink to="/dados-associacao" className={({ isActive }) => (isActive ? 'active' : '')}>
          Dados da associação
        </NavLink>
        <NavLink to="/sistema-cadastro" className={({ isActive }) => (isActive ? 'active' : '')}>
          Sistema de cadastro
        </NavLink>

        <div className="admin-nav-section">Triagem</div>
        <NavLink to="/triagem/formulario" className={({ isActive }) => (isActive ? 'active' : '')}>
          Formulário
        </NavLink>
        <NavLink to="/triagem/status" className={({ isActive }) => (isActive ? 'active' : '')}>
          Status da fila
        </NavLink>
        <NavLink to="/triagem/modulos" className={({ isActive }) => (isActive ? 'active' : '')}>
          Módulos
        </NavLink>

        <div className="admin-nav-section">Dados</div>
        <NavLink to="/dados" className={({ isActive }) => (isActive ? 'active' : '')}>
          Registros
        </NavLink>
        <NavLink to="/arquivos" className={({ isActive }) => (isActive ? 'active' : '')}>
          Arquivos
        </NavLink>

        <div className="admin-nav-section">Configurações do sistema</div>
        <NavLink to="/configs" className={({ isActive }) => (isActive ? 'active' : '')}>
          Variáveis
        </NavLink>
        <NavLink to="/armazenamento" className={({ isActive }) => (isActive ? 'active' : '')}>
          Armazenamento
        </NavLink>
        <NavLink to="/cache" className={({ isActive }) => (isActive ? 'active' : '')}>
          Cache
        </NavLink>
        <NavLink to="/aparencia" className={({ isActive }) => (isActive ? 'active' : '')}>
          Aparência
        </NavLink>

        <div className="admin-nav-section">Kunk</div>
        <NavLink
          to="/kunk/configuracao-profissionais"
          className={({ isActive }) => (isActive ? 'active' : '')}
        >
          Configuração de profissionais
        </NavLink>
        <NavLink to="/kunk/permissoes" className={({ isActive }) => (isActive ? 'active' : '')}>
          Permissões de acesso
        </NavLink>
        <NavLink to="/kunk/ciap2" className={({ isActive }) => (isActive ? 'active' : '')}>
          CIAP-2
        </NavLink>

        <div className="admin-nav-section">Loja</div>
        <NavLink to="/loja/status-pedidos" className={({ isActive }) => (isActive ? 'active' : '')}>
          Status dos pedidos
        </NavLink>

        <div className="admin-nav-section">Webmaster</div>
        <NavLink to="/usuarios" className={({ isActive }) => (isActive ? 'active' : '')}>
          Usuários
        </NavLink>
        <NavLink to="/acesso-api" className={({ isActive }) => (isActive ? 'active' : '')}>
          API
        </NavLink>
        <NavLink to="/erros-sistema" className={({ isActive }) => (isActive ? 'active' : '')}>
          Erros do sistema
        </NavLink>
        <NavLink to="/web-vitals" className={({ isActive }) => (isActive ? 'active' : '')}>
          Web Vitals
        </NavLink>

        <div className="admin-nav-section">Serviços externos</div>
        <NavLink to="/servicos-externos" end className={({ isActive }) => (isActive ? 'active' : '')}>
          Visão geral
        </NavLink>
        <div className="admin-nav-group">Transportadoras</div>
        <div className="admin-nav-nested">
          <ExtNavLink to="/servicos-externos/envio" status={extStatuses.envio}>
            Dados de envio
          </ExtNavLink>
          {EXT_FREIGHT_SLUGS.map((slug) => (
            <ExtNavLink key={slug} to={`/servicos-externos/${slug}`} status={extStatuses[slug]}>
              {EXT_SERVICE_LABELS[slug] || slug}
            </ExtNavLink>
          ))}
        </div>
        {EXT_OTHER_SLUGS.map((slug) => (
          <ExtNavLink key={slug} to={`/servicos-externos/${slug}`} status={extStatuses[slug]}>
            {EXT_SERVICE_LABELS[slug] || slug}
          </ExtNavLink>
        ))}

        <div style={{ flex: 1 }} />
        <div className="muted" style={{ fontSize: '0.8rem', padding: '0.5rem' }}>
          {user?.email || user?.name}
        </div>
        <button type="button" className="btn" onClick={onLogout}>
          Sair
        </button>
      </aside>
      <main className="admin-main">
        <Outlet />
      </main>
      <EmailPromptModal open={showEmailModal} onConfigure={onEmailConfigure} />
      <StoragePromptModal open={showStorageModal} onYes={onStorageYes} onNo={onStorageNo} />
    </div>
  );
}
