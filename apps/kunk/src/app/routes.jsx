import React, { lazy } from 'react';
import { Navigate, Route } from 'react-router-dom';
import { PATHS } from './menuConfig.js';
import { roleHomePath } from '../auth/roleRedirect.js';
import Theme from '../layout/Theme.jsx';
import { RequireKunkStaff } from '../auth/RequireKunkStaff.jsx';

const RegistrationPage = lazy(() => import('../pages/reception/RegistrationPage.jsx'));
const ServicesPage = lazy(() => import('../pages/reception/ServicesPage.jsx'));
const TriagePage = lazy(() => import('../pages/reception/TriagePage.jsx'));
const InstitutionalClientsPage = lazy(() => import('../pages/reception/InstitutionalClientsPage.jsx'));
const OrdersPage = lazy(() => import('../pages/store/OrdersPage.jsx'));
const CartPage = lazy(() => import('../pages/store/CartPage.jsx'));
const ProductsPage = lazy(() => import('../pages/store/ProductsPage.jsx'));
const PrescribersPage = lazy(() => import('../pages/PrescribersPage.jsx'));
const SystemHistoryPage = lazy(() => import('../pages/SystemHistoryPage.jsx'));
const NotFoundPage = lazy(() => import('../pages/NotFoundPage.jsx'));

/** Flat list of app routes for tests and docs (path = Portuguese segment under /app). */
export const APP_ROUTE_DEFS = [
  { path: 'acolhimento/cadastramento', fullPath: PATHS.registration, element: 'RegistrationPage' },
  { path: 'acolhimento/servicos', fullPath: PATHS.services, element: 'ServicesPage' },
  { path: 'acolhimento/triagem', fullPath: PATHS.triage, element: 'TriagePage' },
  {
    path: 'acolhimento/clientesinstitucionais',
    fullPath: PATHS.institutionalClients,
    element: 'InstitutionalClientsPage',
  },
  { path: 'loja/novo-pedido', fullPath: PATHS.newOrder, element: 'CartPage' },
  { path: 'loja/pedidos', fullPath: PATHS.orders, element: 'OrdersPage' },
  { path: 'loja/produtos', fullPath: PATHS.products, element: 'ProductsPage' },
  { path: 'prescritores', fullPath: PATHS.prescribers, element: 'PrescribersPage' },
  { path: 'historico', fullPath: PATHS.systemHistory, element: 'SystemHistoryPage' },
];

export function AppIndexRedirect({ roles }) {
  return <Navigate to={roleHomePath(roles)} replace />;
}

export function buildAppRoutes({ roles }) {
  return (
    <Route
      path="/app"
      element={(
        <RequireKunkStaff>
          <Theme />
        </RequireKunkStaff>
      )}
    >
      <Route index element={<AppIndexRedirect roles={roles} />} />
      <Route path="acolhimento/cadastramento" element={<RegistrationPage />} />
      <Route path="acolhimento/servicos" element={<ServicesPage />} />
      <Route path="acolhimento/triagem" element={<TriagePage />} />
      <Route path="acolhimento/clientesinstitucionais" element={<InstitutionalClientsPage />} />
      <Route path="loja/novo-pedido" element={<CartPage />} />
      <Route path="loja/pedidos" element={<OrdersPage />} />
      <Route path="loja/produtos" element={<ProductsPage />} />
      <Route path="prescritores" element={<PrescribersPage />} />
      <Route path="historico" element={<SystemHistoryPage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Route>
  );
}
