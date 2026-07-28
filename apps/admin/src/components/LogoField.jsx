import React, { useState } from 'react';
import { KUNK_LOGO_FRAME_SIZE } from '@kunk/config';
import { LogoCropModal } from './LogoCropModal.jsx';
import { uploadAppearanceAsset } from '../lib/kunkAppearanceConfig.js';

/**
 * Upload + enquadramento da logo (somente arquivo — sem URL manual).
 * Persiste imediatamente via onPersist.
 */
export function LogoField({ value, onPersist, api, onError }) {
  const [busy, setBusy] = useState(false);
  const [cropSrc, setCropSrc] = useState(null);

  function onFile(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    onError('');
    const url = URL.createObjectURL(file);
    setCropSrc(url);
  }

  function onCancelCrop() {
    if (cropSrc) URL.revokeObjectURL(cropSrc);
    setCropSrc(null);
  }

  async function onConfirmCrop(blob) {
    setBusy(true);
    onError('');
    try {
      const file = new File([blob], 'kunk-logo.png', { type: 'image/png' });
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
    <div className="logo-field">
      <p className="muted" style={{ margin: '0 0 0.75rem' }}>
        Espaço fixo {KUNK_LOGO_FRAME_SIZE}×{KUNK_LOGO_FRAME_SIZE}px no menu do Kunk. Enquadre a imagem
        no quadrado — a logo é salva na hora.
      </p>
      <div className="logo-frame-preview" aria-label="Pré-visualização da logo">
        {value ? <img src={value} alt="" /> : <span className="muted">Sem logo</span>}
      </div>
      <div className="appearance-upload-row">
        <label className="btn">
          {busy ? 'Enviando…' : value ? 'Trocar logo' : 'Enviar logo'}
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
          busy={busy}
          onConfirm={onConfirmCrop}
          onCancel={onCancelCrop}
        />
      ) : null}
    </div>
  );
}
