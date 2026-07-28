import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  getPublicConfig,
  mergePublicConfigFromApi,
  getKunkPublicConfig,
  mergeKunkPublicConfigFromApi,
  applyAssociationLogoToKunkConfig,
  resolveActiveBrandingLogo,
  resolveBrandingLogoUrl,
} from '@kunk/config';

function withAppearanceLogo(registrationConfig, kunkConfig) {
  const withLogos = applyAssociationLogoToKunkConfig(kunkConfig || {}, registrationConfig || {});
  const active = resolveActiveBrandingLogo({
    format: withLogos.logoFormat || registrationConfig?.associationLogoFormat,
    square: withLogos.logoSquare || registrationConfig?.associationLogoSquare,
    rectangular: withLogos.logoRectangular || registrationConfig?.associationLogoRectangular,
    legacy: resolveBrandingLogoUrl(
      withLogos.logo,
      registrationConfig?.associationLogo,
      registrationConfig?.associationLogoMenu,
    ),
  });
  return {
    ...registrationConfig,
    associationLogoFormat: active.format,
    associationLogoSquare: withLogos.logoSquare || registrationConfig?.associationLogoSquare || '',
    associationLogoRectangular:
      withLogos.logoRectangular || registrationConfig?.associationLogoRectangular || '',
    appearanceLogo: active.url,
    appearanceLogoFormat: active.format,
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

        // Uma única atualização: logo/título já presentes quando configReady vira true
        const next = withAppearanceLogo(mergedReg, mergedKunk);
        setConfig(next);
        setConfigErrors(errors);
        setConfigReady(true);
      } catch {
        if (cancelled) return;
        setConfig(withAppearanceLogo(bootstrap, kunkBootstrap));
        setConfigErrors([]);
        setConfigReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [api, bootstrap, kunkBootstrap]);

  useEffect(() => {
    const href = resolveBrandingLogoUrl(config.appearanceLogo, config.associationLogo);
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

  useEffect(() => {
    const name = String(config.associationName || '').trim();
    document.title = name ? `Cadastro - ${name}` : 'Cadastro';
  }, [config.associationName]);

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
