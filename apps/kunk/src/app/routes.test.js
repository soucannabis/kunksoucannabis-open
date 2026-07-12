import { describe, expect, it } from 'vitest';
import { APP_ROUTE_DEFS } from './routes.jsx';
import { PATHS, getNavigablePaths } from './menuConfig.js';
import { roleHomePath } from '../auth/roleRedirect.js';

describe('routes map', () => {
  it('defines all Portuguese fullPaths from PATHS', () => {
    const fullPaths = APP_ROUTE_DEFS.map((r) => r.fullPath);
    expect(fullPaths).toEqual(expect.arrayContaining(Object.values(PATHS)));
    expect(fullPaths).toHaveLength(Object.keys(PATHS).length);
  });

  it('every navigable menu path has a route def', () => {
    const menuPaths = getNavigablePaths(undefined, { isAdmin: true });
    const routePaths = new Set(APP_ROUTE_DEFS.map((r) => r.fullPath));
    for (const path of menuPaths) {
      expect(routePaths.has(path)).toBe(true);
    }
  });

  it('role redirects match legacy priority', () => {
    expect(roleHomePath(['Produção'])).toBe(PATHS.orders);
    expect(roleHomePath(['Acolhimento'])).toBe(PATHS.triage);
    expect(roleHomePath(['Administrador'])).toBe(PATHS.registration);
    expect(roleHomePath(['Administrador', 'Produção'])).toBe(PATHS.orders);
  });
});
