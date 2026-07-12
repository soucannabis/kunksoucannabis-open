import React, { useMemo } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { createApiClient } from '@kunk/api-client';
import { AssociateAuthProvider } from '@kunk/auth-session';
import { getPublicConfig } from '@kunk/config';
import { PublicConfigProvider } from './config/PublicConfigProvider.jsx';
import { AppShell, PhaseGuard, PhaseHomeRedirect, PublicLayout } from './layout/AppShell.jsx';
import { CadastroPage, LoginPage, NovaSenhaPage } from './pages/AuthPages.jsx';
import { BemVindoPage } from './pages/BemVindoPage.jsx';
import { CadastroAssociadoPage } from './pages/CadastroAssociadoPage.jsx';
import { CadastroPacientePage } from './pages/CadastroPacientePage.jsx';
import { DocumentosPage } from './pages/DocumentosPage.jsx';
import { CadastroConcluidoPage, ConsultaPage } from './pages/ConsultaPages.jsx';

export default function App() {
  const bootstrap = getPublicConfig();
  const api = useMemo(() => createApiClient({ baseUrl: bootstrap.apiUrl }), [bootstrap.apiUrl]);

  return (
    <PublicConfigProvider api={api}>
      <AssociateAuthProvider api={api}>
        <BrowserRouter>
          <Routes>
            <Route element={<PublicLayout />}>
              <Route path="/cadastro" element={<CadastroPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/nova-senha" element={<NovaSenhaPage api={api} />} />
            </Route>

            <Route element={<AppShell />}>
              <Route path="/" element={<PhaseHomeRedirect />} />
              <Route
                path="/bem-vindo"
                element={(
                  <PhaseGuard allow={[1]}>
                    <BemVindoPage />
                  </PhaseGuard>
                )}
              />
              <Route
                path="/cadastro-associado"
                element={(
                  <PhaseGuard allow={[1, 2]}>
                    <CadastroAssociadoPage api={api} />
                  </PhaseGuard>
                )}
              />
              <Route
                path="/cadastro-paciente"
                element={(
                  <PhaseGuard allow={[2]}>
                    <CadastroPacientePage api={api} />
                  </PhaseGuard>
                )}
              />
              <Route
                path="/documentos"
                element={(
                  <PhaseGuard allow={[3, 4]}>
                    <DocumentosPage api={api} />
                  </PhaseGuard>
                )}
              />
              <Route
                path="/consulta"
                element={(
                  <PhaseGuard allow={[5]}>
                    <ConsultaPage api={api} />
                  </PhaseGuard>
                )}
              />
              <Route
                path="/cadastro-concluido"
                element={(
                  <PhaseGuard allow={['done', 5]}>
                    <CadastroConcluidoPage />
                  </PhaseGuard>
                )}
              />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AssociateAuthProvider>
    </PublicConfigProvider>
  );
}
