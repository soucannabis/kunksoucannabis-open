import React, { useMemo } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { createApiClient } from '@kunk/api-client';
import { OperatorAuthProvider } from '@kunk/auth-session';
import { getPublicConfig } from '@kunk/config';
import { AdminShell, RequireAdmin } from './layout/AdminShell.jsx';
import { LoginPage } from './pages/LoginPage.jsx';
import { ForbiddenPage } from './pages/ForbiddenPage.jsx';
import { DadosIndexPage, DadosCollectionPage, DadosItemPage } from './pages/DadosPages.jsx';
import { ArquivosPage } from './pages/ArquivosPage.jsx';
import { ConfigsIndexPage, ConfigsSystemPage } from './pages/ConfigsPages.jsx';
import { AparenciaPage } from './pages/AparenciaPage.jsx';
import {
  TriageShell,
  TriageIndexPage,
  TriageFormPage,
  TriageStatusPage,
  TriageModulesPage,
} from './pages/TriagemPages.jsx';
import { LojaShell, LojaIndexPage, LojaFretePage, LojaStatusPedidosPage } from './pages/LojaPages.jsx';
import {
  ServicosExternosShell,
  ServicosExternosIndexPage,
  ServicoExternoDetailPage,
} from './pages/ServicosExternosPages.jsx';
import { UsuariosPage, UsuarioFormPage } from './pages/UsuariosPages.jsx';

export default function App() {
  const bootstrap = getPublicConfig();
  const api = useMemo(() => createApiClient({ baseUrl: bootstrap.apiUrl }), [bootstrap.apiUrl]);

  return (
    <OperatorAuthProvider api={api} requiredRole="Administrador">
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/sem-permissao" element={<ForbiddenPage />} />
          <Route
            element={(
              <RequireAdmin>
                <AdminShell />
              </RequireAdmin>
            )}
          >
            <Route path="/" element={<Navigate to="/dados" replace />} />
            <Route path="/dados" element={<DadosIndexPage api={api} />} />
            <Route path="/dados/:collection" element={<DadosCollectionPage api={api} />} />
            <Route path="/dados/:collection/novo" element={<DadosItemPage api={api} isNew />} />
            <Route path="/dados/:collection/:id" element={<DadosItemPage api={api} />} />
            <Route path="/arquivos" element={<ArquivosPage api={api} />} />
            <Route path="/arquivos/:id" element={<ArquivosPage api={api} />} />
            <Route path="/configs" element={<ConfigsIndexPage api={api} />} />
            <Route path="/configs/:system" element={<ConfigsSystemPage api={api} />} />
            <Route path="/aparencia" element={<AparenciaPage api={api} />} />
            <Route path="/triagem" element={<TriageShell />}>
              <Route index element={<TriageIndexPage />} />
              <Route path="formulario" element={<TriageFormPage api={api} />} />
              <Route path="status" element={<TriageStatusPage api={api} />} />
              <Route path="modulos" element={<TriageModulesPage api={api} />} />
            </Route>
            <Route path="/loja" element={<LojaShell />}>
              <Route index element={<LojaIndexPage />} />
              <Route path="frete" element={<LojaFretePage api={api} />} />
              <Route path="status-pedidos" element={<LojaStatusPedidosPage api={api} />} />
            </Route>
            <Route path="/servicos-externos" element={<ServicosExternosShell />}>
              <Route index element={<ServicosExternosIndexPage api={api} />} />
              <Route path=":service" element={<ServicoExternoDetailPage api={api} />} />
            </Route>
            <Route path="/usuarios" element={<UsuariosPage api={api} />} />
            <Route path="/usuarios/novo" element={<UsuarioFormPage api={api} isNew />} />
            <Route path="/usuarios/:id" element={<UsuarioFormPage api={api} />} />
          </Route>
          <Route path="*" element={<Navigate to="/dados" replace />} />
        </Routes>
      </BrowserRouter>
    </OperatorAuthProvider>
  );
}
