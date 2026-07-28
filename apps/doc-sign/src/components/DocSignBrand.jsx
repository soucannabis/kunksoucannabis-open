import React, { useEffect, useState } from 'react';
import {
  getKunkPublicConfig,
  getPublicConfig,
  mergeKunkPublicConfigFromApi,
  mergePublicConfigFromApi,
  applyAssociationLogoToKunkConfig,
  getBrandLogoFrameStyle,
  LOGO_FORMAT_SQUARE,
} from '@kunk/config';

/** Título fixo do produto — não substituir pelo nome da associação. */
export const DOCSIGN_PRODUCT_TITLE = 'Assinatura de Termos';

function applyFaviconFromLogo(href) {
  const url = String(href || '').trim();
  let link = document.querySelector("link[rel='icon']");
  if (!url) {
    if (link) link.setAttribute('href', '/favicon.svg');
    return;
  }
  if (!link) {
    link = document.createElement('link');
    link.setAttribute('rel', 'icon');
    document.head.appendChild(link);
  }
  const lower = url.split('?')[0].toLowerCase();
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
  link.setAttribute('href', url);
}

/**
 * Carrega a logo da associação (formato ativo) no login e no shell.
 */
export function useDocSignBranding(api) {
  const [logo, setLogo] = useState(() => getKunkPublicConfig().logo || '');
  const [logoFormat, setLogoFormat] = useState(LOGO_FORMAT_SQUARE);
  const [associationName, setAssociationName] = useState(() =>
    String(getPublicConfig().associationName || '').trim(),
  );
  const [brandingReady, setBrandingReady] = useState(false);

  useEffect(() => {
    applyFaviconFromLogo(logo);
  }, [logo]);

  useEffect(() => {
    const name = String(associationName || '').trim();
    document.title = name ? `Assinatura - ${name}` : 'Assinatura';
  }, [associationName]);

  useEffect(() => {
    if (!api) {
      setBrandingReady(true);
      return undefined;
    }
    let cancelled = false;
    setBrandingReady(false);
    (async () => {
      let nextLogo = getKunkPublicConfig().logo || '';
      let nextFormat = LOGO_FORMAT_SQUARE;
      let nextName = String(getPublicConfig().associationName || '').trim();
      try {
        const [kunkJson, regJson] = await Promise.all([
          api.get('/config/public?system=kunk'),
          api.get('/config/public?system=registration').catch(() => null),
        ]);
        if (cancelled) return;
        const mergedKunk = mergeKunkPublicConfigFromApi(
          getKunkPublicConfig(),
          kunkJson?.data?.values,
        );
        const mergedReg = mergePublicConfigFromApi(
          getPublicConfig(),
          regJson?.data?.values,
        );
        const withLogo = applyAssociationLogoToKunkConfig(mergedKunk, mergedReg);
        nextLogo = withLogo.logo || '';
        nextFormat = withLogo.logoFormat || LOGO_FORMAT_SQUARE;
        nextName = String(mergedReg.associationName || '').trim();
      } catch {
        /* mantém bootstrap */
      }
      if (cancelled) return;
      // Logo + ready no mesmo commit — evita revelar o form sem marca
      setLogo(nextLogo);
      setLogoFormat(nextFormat);
      setAssociationName(nextName);
      setBrandingReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [api]);

  return { logo, logoFormat, title: DOCSIGN_PRODUCT_TITLE, associationName, brandingReady };
}

/** Atualiza o favicon com a logo da associação em todas as rotas. */
export function DocSignFavicon({ api }) {
  useDocSignBranding(api);
  return null;
}

/**
 * @param {{ logo?: string, logoFormat?: string, variant?: 'login' | 'shell', className?: string }} props
 */
export function DocSignBrand({
  logo = '',
  logoFormat = LOGO_FORMAT_SQUARE,
  variant = 'shell',
  className = '',
}) {
  const frame = getBrandLogoFrameStyle(logoFormat, variant === 'login' ? 'login' : 'shell');
  const rootClass =
    variant === 'login'
      ? `docsign-brand docsign-brand--login docsign-brand--${frame.format} ${className}`.trim()
      : `docsign-brand docsign-brand--shell docsign-brand--${frame.format} brand ${className}`.trim();

  return (
    <div className={rootClass}>
      {logo ? (
        <div className="docsign-brand-logo-wrap">
          <img
            className="docsign-brand-logo brand-logo"
            src={logo}
            alt={DOCSIGN_PRODUCT_TITLE}
            width={frame.width}
            height={frame.height}
            style={{ objectFit: 'contain' }}
          />
        </div>
      ) : null}
      {variant === 'login' ? (
        <h1 className="brand login-page-title docsign-brand-title">{DOCSIGN_PRODUCT_TITLE}</h1>
      ) : (
        <span className="brand-text docsign-brand-title">{DOCSIGN_PRODUCT_TITLE}</span>
      )}
    </div>
  );
}
