import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  getPublicConfig,
  mergePublicConfigFromApi,
  getKunkPublicConfig,
  mergeKunkPublicConfigFromApi,
} from '@kunk/config';

function withAppearanceLogo(registrationConfig, kunkConfig) {
  const appearanceLogo = String(kunkConfig?.logo || '').trim();
  return {
    ...registrationConfig,
    appearanceLogo,
  };
}

const PublicConfigContext = createContext({
  config: withAppearanceLogo(getPublicConfig(), getKunkPublicConfig()),
  configErrors: [],
  configReady: false,
});

export function PublicConfigProvider({ api, children }) {
  const bootstrap = useMemo(() => getPublicConfig(), []);
  const kunkBootstrap = useMemo(() => getKunkPublicConfig(), []);
  const [config, setConfig] = useState(() => withAppearanceLogo(bootstrap, kunkBootstrap));
  const [configErrors, setConfigErrors] = useState([]);
  const [configReady, setConfigReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [regResult, kunkResult] = await Promise.allSettled([
          api.get('/config/public?system=registration'),
          api.get('/config/public?system=kunk'),
        ]);
        if (cancelled) return;

        let mergedReg = bootstrap;
        let errors = [];
        if (regResult.status === 'fulfilled') {
          const data = regResult.value?.data || {};
          mergedReg = mergePublicConfigFromApi(bootstrap, data.values);
          errors = Array.isArray(data.errors) ? data.errors : [];
        }

        let mergedKunk = kunkBootstrap;
        if (kunkResult.status === 'fulfilled') {
          mergedKunk = mergeKunkPublicConfigFromApi(kunkBootstrap, kunkResult.value?.data?.values);
        }

        setConfig(withAppearanceLogo(mergedReg, mergedKunk));
        setConfigErrors(errors);
      } catch {
        if (cancelled) return;
        setConfig(withAppearanceLogo(bootstrap, kunkBootstrap));
        setConfigErrors([]);
      } finally {
        if (!cancelled) setConfigReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [api, bootstrap, kunkBootstrap]);

  useEffect(() => {
    const href = String(config.appearanceLogo || config.associationLogo || '').trim();
    let link = document.querySelector("link[rel='icon']");
    if (!href) {
      if (link) link.setAttribute('href', '/favicon.svg');
      return;
    }
    if (!link) {
      link = document.createElement('link');
      link.setAttribute('rel', 'icon');
      document.head.appendChild(link);
    }
    const lower = href.split('?')[0].toLowerCase();
    const type = lower.endsWith('.svg')
      ? 'image/svg+xml'
      : lower.endsWith('.ico')
        ? 'image/x-icon'
        : lower.endsWith('.jpg') || lower.endsWith('.jpeg')
          ? 'image/jpeg'
          : lower.endsWith('.webp')
            ? 'image/webp'
            : 'image/png';
    link.setAttribute('type', type);
    link.setAttribute('href', href);
  }, [config.appearanceLogo, config.associationLogo]);

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
