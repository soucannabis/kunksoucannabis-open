import React, { useEffect, useState } from 'react';
import { KUNK_APPEARANCE_DEFAULTS, KUNK_LOGO_FRAME_SIZE } from '@kunk/config';
import { LogoCropModal } from '../components/LogoCropModal.jsx';
import {
  loadKunkAppearance,
  saveKunkAppearance,
  uploadAppearanceAsset,
} from '../lib/kunkAppearanceConfig.js';
import { AdminLoader } from '../components/AdminLoader.jsx';

function ColorField({ label, value, onChange }) {
  return (
    <label className="field">
      <span>{label}</span>
      <div className="color-field-row">
        <input
          type="color"
          value={normalizeHex(value)}
          onChange={(e) => onChange(e.target.value)}
          aria-label={label}
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="#000000"
        />
      </div>
    </label>
  );
}

function normalizeHex(value) {
  const v = String(value || '').trim();
  if (/^#[0-9a-fA-F]{6}$/.test(v)) return v;
  if (/^#[0-9a-fA-F]{3}$/.test(v)) {
    const r = v[1];
    const g = v[2];
    const b = v[3];
    return `#${r}${r}${g}${g}${b}${b}`;
  }
  return '#000000';
}

function ImageField({ label, value, onChange, onPersist, api, onError }) {
  const [busy, setBusy] = useState(false);

  async function onFile(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setBusy(true);
    onError('');
    try {
      const url = await uploadAppearanceAsset(api, file);
      await onPersist(url);
    } catch (err) {
      onError(err.message || 'Falha no upload');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="field">
      <span>{label}</span>
      {value ? (
        <div className="appearance-preview">
          <img src={value} alt="" />
        </div>
      ) : null}
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="/api/v1/files/…/download ou URL"
      />
      <div className="appearance-upload-row">
        <label className="btn">
          {busy ? 'Enviando…' : 'Upload'}
          <input type="file" accept="image/*" hidden disabled={busy} onChange={onFile} />
        </label>
        {value ? (
          <button type="button" className="btn" onClick={() => onPersist('')}>
            Limpar
          </button>
        ) : null}
      </div>
    </div>
  );
}

function LogoField({ value, onChange, onPersist, api, onError }) {
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
    <div className="field">
      <span>Logo</span>
      <p className="muted" style={{ margin: 0 }}>
        Espaço fixo {KUNK_LOGO_FRAME_SIZE}×{KUNK_LOGO_FRAME_SIZE}px no menu. No upload, enquadre a
        imagem no quadrado — a logo é salva na hora.
      </p>
      <div className="logo-frame-preview" aria-label="Pré-visualização do enquadramento">
        {value ? <img src={value} alt="" /> : <span className="muted">Sem logo</span>}
      </div>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="/api/v1/files/…/download ou URL"
      />
      <div className="appearance-upload-row">
        <label className="btn">
          Upload e enquadrar
          <input type="file" accept="image/*" hidden disabled={busy} onChange={onFile} />
        </label>
        {value ? (
          <button type="button" className="btn" onClick={() => onPersist('')} disabled={busy}>
            Limpar
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

export function AppearancePage({ api }) {
  const [form, setForm] = useState({ ...KUNK_APPEARANCE_DEFAULTS });
  const [baseline, setBaseline] = useState({ ...KUNK_APPEARANCE_DEFAULTS });
  const [itemsByKey, setItemsByKey] = useState({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const { values, itemsByKey: items } = await loadKunkAppearance(api);
        if (cancelled) return;
        setForm(values);
        setBaseline(values);
        setItemsByKey(items);
      } catch (err) {
        if (!cancelled) setError(err.message || 'Falha ao carregar aparência');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [api]);

  function setField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setMessage('');
  }

  /** Persist logo/bg immediately so Kunk picks it up and download becomes public. */
  async function persistAssetField(prop, url) {
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const nextForm = { ...form, [prop]: url };
      const nextItems = await saveKunkAppearance(api, nextForm, baseline, itemsByKey);
      setForm(nextForm);
      setItemsByKey(nextItems);
      setBaseline((prev) => ({ ...prev, [prop]: url }));
      setMessage(prop === 'logo' ? 'Logo salva.' : 'Imagem de fundo salva.');
    } catch (err) {
      setError(err.message || 'Falha ao salvar arquivo de aparência');
      throw err;
    } finally {
      setBusy(false);
    }
  }

  async function onSubmit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const nextItems = await saveKunkAppearance(api, form, baseline, itemsByKey);
      setItemsByKey(nextItems);
      setBaseline({ ...form });
      setMessage('Aparência salva.');
    } catch (err) {
      setError(err.message || 'Falha ao salvar');
    } finally {
      setBusy(false);
    }
  }

  function onResetDefaults() {
    setForm({ ...KUNK_APPEARANCE_DEFAULTS });
    setMessage('');
  }

  if (loading) {
    return <AdminLoader label="Carregando aparência…" />;
  }

  return (
    <div>
      <div className="admin-top">
        <div>
          <h1>Aparência do Kunk</h1>
          <p className="muted">Logo, título, fundo, menu e cores dos temas claro e escuro.</p>
        </div>
      </div>

      {error ? <div className="alert alert-error">{error}</div> : null}
      {message ? <div className="alert alert-info">{message}</div> : null}

      <form className="card appearance-form" onSubmit={onSubmit}>
        <h2>Identidade</h2>
        <div className="grid-2">
          <label className="field">
            <span>Título</span>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setField('title', e.target.value)}
              required
            />
          </label>
          <LogoField
            value={form.logo}
            onChange={(v) => setField('logo', v)}
            onPersist={(v) => persistAssetField('logo', v)}
            api={api}
            onError={setError}
          />
        </div>

        <h2>Fundo do sistema</h2>
        <div className="field">
          <span>Modo</span>
          <div className="appearance-radio-row">
            <label>
              <input
                type="radio"
                name="bgMode"
                checked={form.bgMode === 'color'}
                onChange={() => setField('bgMode', 'color')}
              />
              Cor (temas)
            </label>
            <label>
              <input
                type="radio"
                name="bgMode"
                checked={form.bgMode === 'image'}
                onChange={() => setField('bgMode', 'image')}
              />
              Imagem
            </label>
          </div>
          {form.bgMode === 'color' ? (
            <p className="muted" style={{ marginTop: '0.5rem' }}>
              As cores de fundo são definidas nas seções Tema escuro e Tema claro abaixo.
            </p>
          ) : null}
        </div>
        {form.bgMode === 'image' ? (
          <ImageField
            label="Imagem de fundo"
            value={form.bgImage}
            onChange={(v) => setField('bgImage', v)}
            onPersist={(v) => persistAssetField('bgImage', v)}
            api={api}
            onError={setError}
          />
        ) : null}

        <h2>Menu</h2>
        <div className="grid-2">
          <ColorField label="Fundo" value={form.menuBg} onChange={(v) => setField('menuBg', v)} />
          <ColorField label="Texto" value={form.menuText} onChange={(v) => setField('menuText', v)} />
          <ColorField
            label="Hover fundo"
            value={form.menuHoverBg}
            onChange={(v) => setField('menuHoverBg', v)}
          />
          <ColorField
            label="Hover texto"
            value={form.menuHoverText}
            onChange={(v) => setField('menuHoverText', v)}
          />
        </div>
        <div
          className="menu-preview"
          style={{
            background: form.menuBg,
            color: form.menuText,
            '--preview-hover-bg': form.menuHoverBg,
            '--preview-hover-text': form.menuHoverText,
          }}
        >
          <div className="menu-preview-item">Item do menu</div>
        </div>

        <h2>Tema padrão</h2>
        <label className="field">
          <span>Modo inicial (sem preferência do usuário)</span>
          <select
            value={form.defaultTheme}
            onChange={(e) => setField('defaultTheme', e.target.value)}
          >
            <option value="dark">Escuro</option>
            <option value="light">Claro</option>
          </select>
        </label>

        <h2>Tema escuro</h2>
        <div className="grid-2">
          <ColorField label="Fundo" value={form.darkBg} onChange={(v) => setField('darkBg', v)} />
          <ColorField
            label="Verde (primary)"
            value={form.darkPrimary}
            onChange={(v) => setField('darkPrimary', v)}
          />
          <ColorField
            label="Roxo (accent)"
            value={form.darkAccent}
            onChange={(v) => setField('darkAccent', v)}
          />
          <ColorField
            label="Hover do accent"
            value={form.darkAccentHover}
            onChange={(v) => setField('darkAccentHover', v)}
          />
        </div>

        <h2>Tema claro</h2>
        <div className="grid-2">
          <ColorField label="Fundo" value={form.lightBg} onChange={(v) => setField('lightBg', v)} />
          <ColorField
            label="Verde (primary)"
            value={form.lightPrimary}
            onChange={(v) => setField('lightPrimary', v)}
          />
          <ColorField
            label="Roxo (accent)"
            value={form.lightAccent}
            onChange={(v) => setField('lightAccent', v)}
          />
          <ColorField
            label="Hover do accent"
            value={form.lightAccentHover}
            onChange={(v) => setField('lightAccentHover', v)}
          />
        </div>

        <div className="appearance-actions">
          <button type="submit" className="btn btn-primary" disabled={busy}>
            {busy ? 'Salvando…' : 'Salvar'}
          </button>
          <button type="button" className="btn" onClick={onResetDefaults} disabled={busy}>
            Restaurar defaults
          </button>
        </div>
      </form>
    </div>
  );
}
