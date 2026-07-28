import React, { useEffect, useState } from 'react';
import { ASSOCIATION_DATA_DEFAULTS } from '@kunk/config';
import {
  loadAssociationData,
  saveAssociationData,
  saveAssociationLogoAndTitle,
} from '../lib/associationDataConfig.js';
import { loadKunkAppearance } from '../lib/kunkAppearanceConfig.js';
import {
  AssociationDataFields,
  validateAssociationForm,
} from '../components/AssociationDataFields.jsx';
import { LogoField } from '../components/LogoField.jsx';
import { AdminLoader } from '../components/AdminLoader.jsx';

export function AssociationDataPage({ api }) {
  const [form, setForm] = useState({ ...ASSOCIATION_DATA_DEFAULTS });
  const [baseline, setBaseline] = useState({ ...ASSOCIATION_DATA_DEFAULTS });
  const [itemsByKey, setItemsByKey] = useState({});
  const [logo, setLogo] = useState('');
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
        const [{ values, itemsByKey: items }, appearance] = await Promise.all([
          loadAssociationData(api),
          loadKunkAppearance(api),
        ]);
        if (cancelled) return;
        setForm(values);
        setBaseline(values);
        setItemsByKey(items);
        const logoUrl = String(
          appearance.values.logo ||
            items.VITE_ASSOCIATION_LOGO?.value ||
            items.VITE_ASSOCIATION_LOGO_MENU?.value ||
            '',
        ).trim();
        setLogo(logoUrl);
      } catch (err) {
        if (!cancelled) setError(err.message || 'Falha ao carregar dados da associação');
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

  async function persistLogo(url) {
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const result = await saveAssociationLogoAndTitle(api, {
        logo: url,
        associationName: form.associationName,
      });
      setLogo(result.logo);
      setMessage(url ? 'Logo salva.' : 'Logo removida.');
    } catch (err) {
      setError(err.message || 'Falha ao salvar logo');
      throw err;
    } finally {
      setBusy(false);
    }
  }

  async function onSubmit(e) {
    e.preventDefault();
    const missing = validateAssociationForm(form);
    if (missing.length) {
      setError(`Preencha todos os campos obrigatórios: ${missing.join(', ')}.`);
      setMessage('');
      return;
    }
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const nextItems = await saveAssociationData(api, form, baseline, itemsByKey);
      setItemsByKey(nextItems);
      setBaseline({ ...form });
      await saveAssociationLogoAndTitle(api, {
        logo,
        associationName: form.associationName,
      });
      setMessage('Dados da associação salvos.');
    } catch (err) {
      setError(err.message || 'Falha ao salvar');
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <AdminLoader label="Carregando dados da associação…" />;

  return (
    <div>
      <h1 style={{ marginTop: 0 }}>Dados da associação</h1>
      <p className="muted">
        Identidade jurídica usada no cadastramento e na assinatura de termos. O nome da associação é
        o título do app Kunk. Todos os campos de texto são obrigatórios.
      </p>
      {error ? <div className="alert alert-error">{error}</div> : null}
      {message ? <div className="alert alert-success">{message}</div> : null}

      <div className="association-data-layout">
        <form className="card association-data-card" onSubmit={onSubmit} noValidate>
          <h2 className="association-data-card-title">Dados cadastrais</h2>
          <AssociationDataFields form={form} onChange={setField} />
          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
            <button className="btn btn-primary" type="submit" disabled={busy}>
              {busy ? 'Salvando…' : 'Salvar'}
            </button>
          </div>
        </form>

        <div className="card association-data-card association-data-card--logo">
          <h2 className="association-data-card-title">Logo</h2>
          <LogoField value={logo} onPersist={persistLogo} api={api} onError={setError} />
        </div>
      </div>
    </div>
  );
}
