import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { getPublicConfig, mergePublicConfigFromApi } from '@kunk/config';

const PublicConfigContext = createContext({
  config: getPublicConfig(),
  configErrors: [],
  configReady: false,
});

export function PublicConfigProvider({ api, children }) {
  const bootstrap = useMemo(() => getPublicConfig(), []);
  const [config, setConfig] = useState(bootstrap);
  const [configErrors, setConfigErrors] = useState([]);
  const [configReady, setConfigReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const json = await api.get('/config/public?system=registration');
        const data = json?.data || {};
        if (cancelled) return;
        setConfig(mergePublicConfigFromApi(bootstrap, data.values));
        setConfigErrors(Array.isArray(data.errors) ? data.errors : []);
      } catch {
        if (cancelled) return;
        // Keep Vite/hardcoded branding if API is unreachable
        setConfig(bootstrap);
        setConfigErrors([]);
      } finally {
        if (!cancelled) setConfigReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [api, bootstrap]);

  const value = useMemo(
    () => ({ config, configErrors, configReady }),
    [config, configErrors, configReady],
  );

  return (
    <PublicConfigContext.Provider value={value}>
      {configErrors.length > 0 ? (
        <div
          role="alert"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            zIndex: 9999,
            background: '#7a1f1f',
            color: '#fff',
            padding: '0.5rem 1rem',
            fontSize: '0.875rem',
          }}
        >
          Configuração incompleta:
          {' '}
          {configErrors.join(' · ')}
        </div>
      ) : null}
      {children}
    </PublicConfigContext.Provider>
  );
}

export function usePublicConfig() {
  return useContext(PublicConfigContext);
}
