import React, { useMemo } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAssociateAuth } from '@kunk/auth-session';
import { AuthLoginLayout, Loader, ProgressSidebar } from '@kunk/ui';
import { usePublicConfig } from '../config/PublicConfigProvider.jsx';
import {
  PHASE,
  normalizePhase,
  phaseIndex,
  isAssociado,
  isConcluido,
} from '../lib/associatePhases.js';
import authPublicBg from '../assets/registration-login-bg.jpg';

const STEPS = [
  { id: 1, label: 'Cadastro', phases: [PHASE.CADASTRO_CRIADO, PHASE.DADOS_PESSOAIS] },
  { id: 2, label: 'Documentos', phases: [PHASE.DOCUMENTOS, PHASE.ASSINATURA_TERMO] },
  { id: 3, label: 'Finalizar', phases: [] },
  { id: 4, label: 'Concluído', phases: [PHASE.CONCLUIDO] },
];

const PUBLIC_AUTH_PATH = '/cadastro';

function stepState(step, phase, user) {
  const associado = isAssociado(user);
  const concluido = isConcluido(user);

  if (step.id === 4) {
    if (concluido) return 'done current';
    return 'locked';
  }
  if (step.id === 3) {
    if (concluido) return 'done';
    if (associado) return 'current';
    return 'locked';
  }
  if (concluido || associado) return 'done';
  if (step.phases.includes(phase)) return 'current';
  const maxIdx = Math.max(...step.phases.map((p) => phaseIndex(p)), -1);
  if (phaseIndex(phase) > maxIdx && step.phases.length) return 'done';
  return 'locked';
}

export function PublicLayout() {
  const { config: cfg, configReady } = usePublicConfig();
  const logo = String(cfg.appearanceLogo || '').trim();
  const format = cfg.appearanceLogoFormat || 'square';
  const fullName = String(cfg.associationFullName || cfg.associationName || '').trim();

  return (
    <AuthLoginLayout
      backgroundImage={authPublicBg}
      logo={logo}
      logoFormat={format}
      logoWidth={cfg.appearanceLogoWidth}
      title={fullName}
      ready={configReady}
    >
      <Outlet />
    </AuthLoginLayout>
  );
}

export function AppShell() {
  const { user, loading, logout } = useAssociateAuth();
  const { config: cfg } = usePublicConfig();
  const location = useLocation();

  const steps = useMemo(() => {
    const phase = normalizePhase(user?.associate_status);
    return STEPS.map((s) => ({
      ...s,
      state: stepState(s, phase, user),
    }));
  }, [user]);

  if (loading) return <Loader />;
  if (!user) return <Navigate to={PUBLIC_AUTH_PATH} replace state={{ from: location }} />;

  const navLogo = String(cfg.appearanceMenuLogo || cfg.appearanceLogo || '').trim();
  const format = cfg.appearanceMenuLogoFormat || cfg.appearanceLogoFormat || 'square';
  const navW = cfg.appearanceMenuLogoWidth || 40;
  const navAlt = String(cfg.associationFullName || cfg.associationName || 'Logo').trim();
  const fullName = String(cfg.associationFullName || cfg.associationName || '').trim();

  return (
    <div className="wrapper">
      <nav className="navbar navbar-dark px-3 w-100 app-navbar">
        <div className="app-navbar-brand">
          {navLogo ? (
            <div className="app-navbar-logo-wrap">
              <img
                className={`app-navbar-logo app-navbar-logo--${format}`}
                src={navLogo}
                alt={navAlt}
                style={{ width: navW, height: 'auto' }}
              />
            </div>
          ) : null}
          {fullName ? <span className="app-navbar-title">{fullName}</span> : null}
        </div>
        <button type="button" className="btn btn-sm btn-outline-light" onClick={() => logout()}>
          Sair
        </button>
      </nav>
      <div className="app-body">
        <div className="app-sidebar-col d-none d-md-flex">
          <ProgressSidebar steps={steps} contactUrl={cfg.contactUrl} />
        </div>
        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

/** Redirect `/` to the route for current phase. */
export function PhaseHomeRedirect() {
  const { user, loading } = useAssociateAuth();
  if (loading) return <Loader />;
  if (!user) return <Navigate to={PUBLIC_AUTH_PATH} replace />;
  if (isConcluido(user)) return <Navigate to="/cadastro-concluido" replace />;
  if (isAssociado(user)) return <Navigate to="/finalizar" replace />;
  const phase = normalizePhase(user.associate_status);
  if (phase === PHASE.CADASTRO_CRIADO) return <Navigate to="/bem-vindo" replace />;
  if (phase === PHASE.DADOS_PESSOAIS) {
    if (user.responsible_type === 'another') return <Navigate to="/cadastro-paciente" replace />;
    return <Navigate to="/cadastro-associado" replace />;
  }
  if (phase === PHASE.DOCUMENTOS || phase === PHASE.ASSINATURA_TERMO) {
    return <Navigate to="/documentos" replace />;
  }
  return <Navigate to="/bem-vindo" replace />;
}

export function PhaseGuard({ allow, children }) {
  const { user, loading } = useAssociateAuth();
  if (loading) return <Loader />;
  if (!user) return <Navigate to={PUBLIC_AUTH_PATH} replace />;

  const phase = normalizePhase(user.associate_status);
  const associado = isAssociado(user);
  const concluido = isConcluido(user);

  if (allow.includes('done')) {
    if (concluido) return children;
    return <PhaseHomeRedirect />;
  }

  if (allow.includes('associado')) {
    if (associado && !concluido) return children;
    return <PhaseHomeRedirect />;
  }

  if (associado || concluido) {
    return <PhaseHomeRedirect />;
  }

  if (!allow.includes(phase)) {
    return <PhaseHomeRedirect />;
  }
  return children;
}
