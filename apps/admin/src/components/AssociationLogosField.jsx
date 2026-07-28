import React, { useState } from 'react';
import {
  KUNK_LOGO_FRAME_SIZE,
  KUNK_LOGO_RECT_FRAME_H,
  KUNK_LOGO_RECT_FRAME_W,
  LOGO_FORMAT_RECTANGULAR,
  LOGO_FORMAT_SQUARE,
  getBrandLogoFrameStyle,
  normalizeLogoFormat,
} from '@kunk/config';
import { LogoCropModal } from './LogoCropModal.jsx';
import { AdminLoader } from './AdminLoader.jsx';
import { uploadAppearanceAsset } from '../lib/kunkAppearanceConfig.js';

function LogoSlot({
  label,
  hint,
  format,
  value,
  selected,
  onSelect,
  onPersist,
  api,
  onError,
  busy,
  setBusy,
}) {
  const [cropSrc, setCropSrc] = useState(null);
  const frame = getBrandLogoFrameStyle(format, 'default');
  const isRect = format === LOGO_FORMAT_RECTANGULAR;

  function onFile(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    onError('');
    setCropSrc(URL.createObjectURL(file));
  }

  function onCancelCrop() {
    if (cropSrc) URL.revokeObjectURL(cropSrc);
    setCropSrc(null);
  }

  async function onConfirmCrop(blob) {
    setBusy(true);
    onError('');
    try {
      const name =
        format === LOGO_FORMAT_RECTANGULAR ? 'association-logo-rect.png' : 'association-logo-square.png';
      const file = new File([blob], name, { type: 'image/png' });
      const uploaded = await uploadAppearanceAsset(api, file);
      await onPersist(uploaded);
      if (cropSrc) URL.revokeObjectURL(cropSrc);
      setCropSrc(null);
    } catch (err) {
      onError(err.message || 'Falha no upload da logo');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={`logo-slot${selected ? ' logo-slot--selected' : ''}`}>
      <div className="logo-slot-header">
        <label className="logo-slot-radio">
          <input
            type="radio"
            name="association-logo-format"
            checked={selected}
            disabled={busy || !value}
            onChange={() => onSelect()}
          />
          <span>
            <strong>{label}</strong>
            {!value ? <span className="muted"> — envie para usar</span> : null}
          </span>
        </label>
      </div>
      <p className="muted logo-slot-hint">{hint}</p>
      <div
        className={`logo-frame-preview logo-frame-preview--${format}`}
        style={
          isRect
            ? { width: '100%', maxWidth: frame.width, height: 'auto', aspectRatio: '3 / 1' }
            : { width: frame.width, height: frame.height }
        }
        aria-label={`Pré-visualização ${label}`}
      >
        {value ? <img src={value} alt="" /> : <span className="muted">Sem logo</span>}
      </div>
      <div className="appearance-upload-row">
        <label className="btn">
          {busy ? 'Enviando…' : value ? 'Trocar' : 'Enviar'}
          <input type="file" accept="image/*" hidden disabled={busy} onChange={onFile} />
        </label>
        {value ? (
          <button type="button" className="btn" onClick={() => onPersist('')} disabled={busy}>
            Remover
          </button>
        ) : null}
      </div>
      {cropSrc ? (
        <LogoCropModal
          src={cropSrc}
          format={format}
          busy={busy}
          onConfirm={onConfirmCrop}
          onCancel={onCancelCrop}
        />
      ) : null}
    </div>
  );
}

function nextFormatAfterChange({ currentFormat, square, rectangular }) {
  const format = normalizeLogoFormat(currentFormat);
  if (format === LOGO_FORMAT_SQUARE && !square && rectangular) return LOGO_FORMAT_RECTANGULAR;
  if (format === LOGO_FORMAT_RECTANGULAR && !rectangular && square) return LOGO_FORMAT_SQUARE;
  if (!square && rectangular) return LOGO_FORMAT_RECTANGULAR;
  if (square && !rectangular) return LOGO_FORMAT_SQUARE;
  return format;
}

/**
 * Duas logos (quadrada + retangular) e escolha do formato ativo nos apps.
 */
export function AssociationLogosField({
  logoSquare,
  logoRectangular,
  logoFormat,
  onPersist,
  api,
  onError,
}) {
  const [busy, setBusy] = useState(false);
  const [savingFormat, setSavingFormat] = useState(false);
  const format = normalizeLogoFormat(logoFormat);


  async function persistSquare(url) {
    const nextSquare = String(url || '');
    await onPersist({
      logoSquare: nextSquare,
      logoRectangular,
      logoFormat: nextFormatAfterChange({
        currentFormat: format,
        square: nextSquare,
        rectangular: logoRectangular,
      }),
    });
  }

  async function persistRectangular(url) {
    const nextRect = String(url || '');
    await onPersist({
      logoSquare,
      logoRectangular: nextRect,
      logoFormat: nextFormatAfterChange({
        currentFormat: format,
        square: logoSquare,
        rectangular: nextRect,
      }),
    });
  }

  async function selectFormat(next) {
    const fmt = normalizeLogoFormat(next);
    if (fmt === LOGO_FORMAT_SQUARE && !logoSquare) {
      onError('Envie a logo quadrada antes de ativá-la.');
      return;
    }
    if (fmt === LOGO_FORMAT_RECTANGULAR && !logoRectangular) {
      onError('Envie a logo retangular antes de ativá-la.');
      return;
    }
    if (fmt === format) return;
    onError('');
    setSavingFormat(true);
    setBusy(true);
    try {
      await onPersist({
        logoSquare,
        logoRectangular,
        logoFormat: fmt,
      });
    } catch {
      /* erro já tratado em onPersist / página */
    } finally {
      setBusy(false);
      setSavingFormat(false);
    }
  }

  return (
    <div className={`association-logos-field${busy ? ' association-logos-field--busy' : ''}`}>
      <p className="muted" style={{ margin: '0 0 0.75rem' }}>
        Cadastre os dois formatos e escolha qual os apps exibem. Quadrado (
        {KUNK_LOGO_FRAME_SIZE}×{KUNK_LOGO_FRAME_SIZE}
        ) para ícone/menu; retangular (
        {KUNK_LOGO_RECT_FRAME_W}×{KUNK_LOGO_RECT_FRAME_H}
        , 3:1) para faixas horizontais.
      </p>

      <div className="association-logos-grid" aria-busy={busy}>
        {busy ? (
          <div className="association-logos-loader" role="status" aria-live="polite">
            <AdminLoader
              label={savingFormat ? 'Salvando formato…' : 'Salvando…'}
              className="admin-loader--embedded"
            />
          </div>
        ) : null}
        <LogoSlot
          label="Quadrada"
          hint={`1:1 — login, menu do Kunk, favicon e blocos centrais (${KUNK_LOGO_FRAME_SIZE}px).`}
          format={LOGO_FORMAT_SQUARE}
          value={logoSquare}
          selected={format === LOGO_FORMAT_SQUARE}
          onSelect={() => selectFormat(LOGO_FORMAT_SQUARE)}
          onPersist={persistSquare}
          api={api}
          onError={onError}
          busy={busy}
          setBusy={setBusy}
        />
        <LogoSlot
          label="Retangular"
          hint={`3:1 — login e barras horizontais (${KUNK_LOGO_RECT_FRAME_W}×${KUNK_LOGO_RECT_FRAME_H}px).`}
          format={LOGO_FORMAT_RECTANGULAR}
          value={logoRectangular}
          selected={format === LOGO_FORMAT_RECTANGULAR}
          onSelect={() => selectFormat(LOGO_FORMAT_RECTANGULAR)}
          onPersist={persistRectangular}
          api={api}
          onError={onError}
          busy={busy}
          setBusy={setBusy}
        />
      </div>
    </div>
  );
}
