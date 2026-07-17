import React, { useMemo } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { createApiClient } from '@kunk/api-client';
import { OperatorAuthProvider } from '@kunk/auth-session';
import { getPublicConfig } from '@kunk/config';
import { AdminShell, RequireAdmin } from './layout/AdminShell.jsx';
import { LoginPage } from './pages/LoginPage.jsx';
import { NewPasswordPage } from './pages/NewPasswordPage.jsx';
import { ForbiddenPage } from './pages/ForbiddenPage.jsx';
import { DataIndexPage, DataCollectionPage, DataItemPage } from './pages/DataPages.jsx';
import { FilesPage } from './pages/FilesPage.jsx';
import { StoragePage } from './pages/StoragePage.jsx';
import { ConfigsIndexPage, ConfigsSystemPage } from './pages/ConfigsPages.jsx';
import { AppearancePage } from './pages/AppearancePage.jsx';
import {
  TriageShell,
  TriageIndexPage,
  TriageFormPage,
  TriageStatusPage,
  TriageModulesPage,
} from './pages/TriagePages.jsx';
import { StoreOrderStatusesPage } from './pages/StorePages.jsx';
import {
  ExternalServicesShell,
  ExternalServicesIndexPage,
  ExternalServiceDetailPage,
} from './pages/ExternalServicesPages.jsx';
import { ExternalServicesShippingPage } from './pages/ExternalServicesShippingPage.jsx';
import { UsersPage, UserFormPage } from './pages/UsersPages.jsx';
import { RolePagesPage } from './pages/RolePagesPage.jsx';
import { Ciap2ModulePage } from './pages/Ciap2ModulePage.jsx';
import { ServicesTypesPage } from './pages/ServicesTypesPage.jsx';
import { KunkShell } from './pages/KunkPages.jsx';
import { SystemErrorBoundary } from './components/errors/SystemErrorBoundary.jsx';
import { SystemErrorsPage } from './pages/SystemErrorsPage.jsx';
import { WebVitalsPage } from './pages/WebVitalsPage.jsx';
import { CachePage } from './pages/CachePage.jsx';

export default function App() {
  const bootstrap = getPublicConfig();
  const api = useMemo(() => createApiClient({ baseUrl: bootstrap.apiUrl }), [bootstrap.apiUrl]);

  return (
    <SystemErrorBoundary app="admin" baseUrl={bootstrap.apiUrl}>
      <OperatorAuthProvider api={api} requiredRole="Administrador">
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/nova-senha" element={<NewPasswordPage api={api} />} />
            <Route path="/sem-permissao" element={<ForbiddenPage />} />
            <Route
              element={(
                <RequireAdmin>
                  <AdminShell api={api} />
                </RequireAdmin>
              )}
            >
              <Route path="/" element={<Navigate to="/dados" replace />} />
              <Route path="/dados" element={<DataIndexPage api={api} />} />
              <Route path="/dados/:collection" element={<DataCollectionPage api={api} />} />
              <Route path="/dados/:collection/novo" element={<DataItemPage api={api} isNew />} />
              <Route path="/dados/:collection/:id" element={<DataItemPage api={api} />} />
              <Route path="/arquivos" element={<FilesPage api={api} />} />
              <Route path="/arquivos/:id" element={<FilesPage api={api} />} />
              <Route path="/armazenamento" element={<StoragePage api={api} />} />
              <Route path="/erros-sistema" element={<SystemErrorsPage api={api} />} />
              <Route path="/web-vitals" element={<WebVitalsPage api={api} />} />
              <Route path="/cache" element={<CachePage api={api} />} />
              <Route path="/configs" element={<ConfigsIndexPage api={api} />} />
              <Route path="/configs/cache" element={<CachePage api={api} />} />
              <Route path="/configs/ciap2" element={<Navigate to="/kunk/ciap2" replace />} />
              <Route
                path="/configs/services-types"
                element={<Navigate to="/kunk/configuracao-profissionais" replace />}
              />
              <Route path="/configs/:system" element={<ConfigsSystemPage api={api} />} />
              <Route path="/aparencia" element={<AppearancePage api={api} />} />
              <Route path="/kunk" element={<KunkShell />}>
                <Route index element={<Navigate to="/kunk/configuracao-profissionais" replace />} />
                <Route path="configuracao-profissionais" element={<ServicesTypesPage api={api} />} />
                <Route
                  path="tipos-profissional"
                  element={<Navigate to="/kunk/configuracao-profissionais" replace />}
                />
                <Route path="permissoes" element={<RolePagesPage api={api} />} />
                <Route path="ciap2" element={<Ciap2ModulePage api={api} />} />
              </Route>
              <Route path="/triagem" element={<TriageShell />}>
                <Route index element={<TriageIndexPage />} />
                <Route path="formulario" element={<TriageFormPage api={api} />} />
                <Route path="status" element={<TriageStatusPage api={api} />} />
                <Route path="modulos" element={<TriageModulesPage api={api} />} />
              </Route>
            <Route path="/loja" element={<Navigate to="/loja/status-pedidos" replace />} />
            <Route path="/loja/status-pedidos" element={<StoreOrderStatusesPage api={api} />} />
            <Route path="/loja/frete" element={<Navigate to="/servicos-externos/envio" replace />} />
            <Route path="/servicos-externos" element={<ExternalServicesShell />}>
              <Route index element={<ExternalServicesIndexPage api={api} />} />
              <Route path="envio" element={<ExternalServicesShippingPage api={api} />} />
              <Route path=":service" element={<ExternalServiceDetailPage api={api} />} />
            </Route>
            <Route path="/usuarios" element={<UsersPage api={api} />} />
            <Route path="/usuarios/paginas" element={<Navigate to="/kunk/permissoes" replace />} />
            <Route path="/usuarios/novo" element={<UserFormPage api={api} isNew />} />
            <Route path="/usuarios/:id" element={<UserFormPage api={api} />} />
          </Route>
          <Route path="*" element={<Navigate to="/dados" replace />} />
        </Routes>
      </BrowserRouter>
      </OperatorAuthProvider>
    </SystemErrorBoundary>
  );
}
