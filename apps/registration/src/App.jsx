import React, { useMemo } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { createApiClient } from '@kunk/api-client';
import { AssociateAuthProvider } from '@kunk/auth-session';
import { getPublicConfig } from '@kunk/config';
import { PublicConfigProvider } from './config/PublicConfigProvider.jsx';
import { AppShell, PhaseGuard, PhaseHomeRedirect, PublicLayout } from './layout/AppShell.jsx';
import { SignupPage, LoginPage, NewPasswordPage } from './pages/AuthPages.jsx';
import { WelcomePage } from './pages/WelcomePage.jsx';
import { AssociateRegistrationPage } from './pages/AssociateRegistrationPage.jsx';
import { PatientRegistrationPage } from './pages/PatientRegistrationPage.jsx';
import { DocumentsPage } from './pages/DocumentsPage.jsx';
import { RegistrationCompletePage, ConsultationPage } from './pages/ConsultationPages.jsx';

export default function App() {
  const bootstrap = getPublicConfig();
  const api = useMemo(() => createApiClient({ baseUrl: bootstrap.apiUrl }), [bootstrap.apiUrl]);

  return (
    <PublicConfigProvider api={api}>
      <AssociateAuthProvider api={api}>
        <BrowserRouter>
          <Routes>
            <Route element={<PublicLayout />}>
              <Route path="/cadastro" element={<SignupPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/nova-senha" element={<NewPasswordPage api={api} />} />
            </Route>

            <Route element={<AppShell />}>
              <Route path="/" element={<PhaseHomeRedirect />} />
              <Route
                path="/bem-vindo"
                element={(
                  <PhaseGuard allow={[1]}>
                    <WelcomePage />
                  </PhaseGuard>
                )}
              />
              <Route
                path="/cadastro-associado"
                element={(
                  <PhaseGuard allow={[1, 2]}>
                    <AssociateRegistrationPage api={api} />
                  </PhaseGuard>
                )}
              />
              <Route
                path="/cadastro-paciente"
                element={(
                  <PhaseGuard allow={[2]}>
                    <PatientRegistrationPage api={api} />
                  </PhaseGuard>
                )}
              />
              <Route
                path="/documentos"
                element={(
                  <PhaseGuard allow={[3, 4]}>
                    <DocumentsPage api={api} />
                  </PhaseGuard>
                )}
              />
              <Route
                path="/consulta"
                element={(
                  <PhaseGuard allow={[5]}>
                    <ConsultationPage api={api} />
                  </PhaseGuard>
                )}
              />
              <Route
                path="/cadastro-concluido"
                element={(
                  <PhaseGuard allow={['done', 5]}>
                    <RegistrationCompletePage />
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
