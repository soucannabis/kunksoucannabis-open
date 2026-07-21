import React, { useEffect, useState } from 'react';
import { ASSOCIATION_DATA_DEFAULTS } from '@kunk/config';
import { loadAssociationData, saveAssociationData } from '../lib/associationDataConfig.js';
import {
  AssociationDataFields,
  validateAssociationForm,
} from '../components/AssociationDataFields.jsx';
import { AdminLoader } from '../components/AdminLoader.jsx';

export function AssociationDataPage({ api }) {
  const [form, setForm] = useState({ ...ASSOCIATION_DATA_DEFAULTS });
  const [baseline, setBaseline] = useState({ ...ASSOCIATION_DATA_DEFAULTS });
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
        const { values, itemsByKey: items } = await loadAssociationData(api);
        if (cancelled) return;
        setForm(values);
        setBaseline(values);
        setItemsByKey(items);
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
        Identidade jurídica usada no cadastramento e na assinatura de termos (título padrão e variáveis do texto).
        Todos os campos são obrigatórios.
      </p>
      {error ? <div className="alert alert-error">{error}</div> : null}
      {message ? <div className="alert alert-success">{message}</div> : null}

      <form className="card" onSubmit={onSubmit} style={{ maxWidth: 560 }} noValidate>
        <AssociationDataFields form={form} onChange={setField} />
        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
          <button className="btn btn-primary" type="submit" disabled={busy}>
            {busy ? 'Salvando…' : 'Salvar'}
          </button>
        </div>
      </form>
    </div>
  );
}
