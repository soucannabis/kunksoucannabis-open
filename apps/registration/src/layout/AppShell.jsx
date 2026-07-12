import React, { useMemo } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAssociateAuth } from '@kunk/auth-session';
import { Loader, ProgressSidebar } from '@kunk/ui';
import { usePublicConfig } from '../config/PublicConfigProvider.jsx';

const STEPS = [
  { id: 1, label: 'Cadastro', phases: [1, 2] },
  { id: 2, label: 'Documentos', phases: [3, 4] },
  { id: 3, label: 'Consulta', phases: [5] },
  { id: 4, label: 'Concluído', phases: [] },
];

function stepState(step, phase, status) {
  if (status === 'Associado' && step.id === 4) return 'done current';
  if (status === 'Associado' && step.id < 4) return 'done';
  if (step.phases.includes(phase)) return 'current';
  const maxPhase = Math.max(...step.phases, 0);
  if (phase > maxPhase && step.phases.length) return 'done';
  return 'locked';
}

export function PublicLayout() {
  const { config: cfg } = usePublicConfig();
  return (
    <div className="container vertical-center">
      <div className="col-md-6 col-12 text-center">
        <img
          src={cfg.associationLogo}
          alt={cfg.associationName}
          style={{ maxWidth: cfg.associationLogoSize, marginBottom: '1.5rem' }}
        />
        <Outlet />
      </div>
    </div>
  );
}

export function AppShell() {
  const { user, loading, logout } = useAssociateAuth();
  const { config: cfg } = usePublicConfig();
  const location = useLocation();

  const steps = useMemo(() => {
    const phase = Number(user?.associate_status) || 1;
    return STEPS.map((s) => ({
      ...s,
      state: stepState(s, phase, user?.status),
    }));
  }, [user]);

  if (loading) return <Loader />;
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />;

  return (
    <div className="wrapper">
      <nav className="navbar navbar-dark px-3 w-100" style={{ position: 'fixed', top: 0, zIndex: 10 }}>
        <img src={cfg.associationLogoMenu} alt={cfg.associationName} height={36} />
        <button type="button" className="btn btn-sm btn-outline-light" onClick={() => logout()}>
          Sair
        </button>
      </nav>
      <div className="d-flex w-100" style={{ paddingTop: 56 }}>
        <div className="d-none d-md-block" style={{ width: 220 }}>
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
  if (!user) return <Navigate to="/login" replace />;
  if (user.status === 'Associado') return <Navigate to="/cadastro-concluido" replace />;
  const phase = Number(user.associate_status) || 1;
  if (phase === 1) return <Navigate to="/bem-vindo" replace />;
  if (phase === 2) {
    if (user.responsible_type === 'another') return <Navigate to="/cadastro-paciente" replace />;
    return <Navigate to="/cadastro-associado" replace />;
  }
  if (phase === 3 || phase === 4) return <Navigate to="/documentos" replace />;
  if (phase >= 5) return <Navigate to="/consulta" replace />;
  return <Navigate to="/bem-vindo" replace />;
}

export function PhaseGuard({ allow, children }) {
  const { user, loading } = useAssociateAuth();
  if (loading) return <Loader />;
  if (!user) return <Navigate to="/login" replace />;
  const phase = Number(user.associate_status) || 1;
  if (user.status === 'Associado' && !allow.includes('done')) {
    return <Navigate to="/cadastro-concluido" replace />;
  }
  if (!allow.includes(phase) && !(user.status === 'Associado' && allow.includes('done'))) {
    return <PhaseHomeRedirect />;
  }
  return children;
}
