import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { createApiClient } from '@kunk/api-client';
import { useErrorModal } from '../components/errors/ErrorModalProvider.jsx';
import { getKunkPublicConfig } from '@kunk/config';

function FieldInput({ field, value, onChange }) {
  const id = `fila-${field.id}`;
  const type = field.type
    || (field.id === 'is_associate' ? 'checkbox'
      : field.id === 'message' ? 'textarea'
        : field.id === 'option1' ? 'select'
          : 'text');
  const options = Array.isArray(field.options) ? field.options : [];

  if (type === 'checkbox') {
    return (
      <label className="fila-field fila-check">
        <input
          id={id}
          type="checkbox"
          checked={Boolean(value)}
          onChange={(e) => onChange(e.target.checked)}
        />
        <span>{field.label}</span>
      </label>
    );
  }

  if (type === 'textarea' || field.id === 'message') {
    return (
      <label className="fila-field">
        <span>{field.label}{field.required ? ' *' : ''}</span>
        <textarea
          id={id}
          rows={4}
          value={value || ''}
          required={Boolean(field.required)}
          onChange={(e) => onChange(e.target.value)}
        />
      </label>
    );
  }

  if (type === 'select') {
    return (
      <label className="fila-field">
        <span>{field.label}{field.required ? ' *' : ''}</span>
        <select
          id={id}
          value={value || ''}
          required={Boolean(field.required)}
          onChange={(e) => onChange(e.target.value)}
        >
          <option value="">Selecione…</option>
          {(options.length ? options : ['Outro']).map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      </label>
    );
  }

  return (
    <label className="fila-field">
      <span>{field.label}{field.required ? ' *' : ''}</span>
      <input
        id={id}
        type={field.id === 'email' ? 'email' : field.id === 'phone' ? 'tel' : 'text'}
        value={value || ''}
        required={Boolean(field.required)}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}

export default function PublicQueuePage() {
  const [searchParams] = useSearchParams();
  const embed = searchParams.get('embed') === '1';
  const bootstrap = useMemo(() => getKunkPublicConfig(), []);
  const api = useMemo(() => createApiClient({ baseUrl: bootstrap.apiUrl }), [bootstrap.apiUrl]);

  const [fields, setFields] = useState([]);
  const [enabled, setEnabled] = useState(true);
  const [form, setForm] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const { showError } = useErrorModal();
  const [done, setDone] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await api.receptionFormSchema();
        if (cancelled) return;
        setEnabled(res.data?.enabled !== false);
        setFields(res.data?.fields || []);
        const initial = {};
        for (const f of res.data?.fields || []) {
          initial[f.id] = f.type === 'checkbox' || f.id === 'is_associate' ? false : '';
        }
        setForm(initial);
      } catch (err) {
        if (!cancelled) showError(err.message || 'Falha ao carregar formulário');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [api]);

  async function onSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.createPublicReception(form);
      setDone(true);
    } catch (err) {
      showError(err.message || 'Não foi possível enviar');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className={`fila-page${embed ? ' fila-embed' : ''}`}>
      <style>{`
        .fila-page {
          min-height: 100vh;
          box-sizing: border-box;
          padding: 2rem 1rem;
          background: linear-gradient(160deg, #1a2a1c 0%, #0f1410 55%, #1a1520 100%);
          color: #e8efe9;
          font-family: "IBM Plex Sans", "Segoe UI", sans-serif;
        }
        .fila-embed { min-height: auto; padding: 1rem; background: #142018; }
        .fila-card {
          max-width: 520px;
          margin: 0 auto;
          background: rgba(26, 34, 28, 0.92);
          border: 1px solid #2d3b30;
          border-radius: 12px;
          padding: 1.5rem;
        }
        .fila-card h1 { margin: 0 0 0.35rem; font-size: 1.5rem; }
        .fila-muted { color: #9aab9e; margin: 0 0 1.25rem; }
        .fila-field { display: grid; gap: 0.35rem; margin-bottom: 0.9rem; }
        .fila-field span { font-size: 0.9rem; color: #9aab9e; }
        .fila-field input, .fila-field textarea, .fila-field select {
          width: 100%; box-sizing: border-box; border-radius: 8px;
          border: 1px solid #2d3b30; background: #0f1410; color: #e8efe9;
          padding: 0.65rem 0.75rem; font: inherit;
        }
        .fila-check { display: flex; align-items: center; gap: 0.6rem; }
        .fila-check input { width: auto; }
        .fila-btn {
          width: 100%; border: 0; border-radius: 8px; padding: 0.8rem 1rem;
          background: #5a8f5e; color: #0f1410; font-weight: 700; cursor: pointer;
        }
        .fila-btn:disabled { opacity: 0.6; cursor: wait; }
        .fila-error { color: #e88; margin-bottom: 0.75rem; }
        .fila-success { text-align: center; padding: 1rem 0; }
      `}</style>
      <div className="fila-card">
        {!embed ? <h1>{bootstrap.title || 'Fila de acolhimento'}</h1> : <h1 style={{ fontSize: '1.2rem' }}>Fila de acolhimento</h1>}
        <p className="fila-muted">Preencha para entrar na fila de contato do acolhimento.</p>

        {loading ? <p className="fila-muted">Carregando…</p> : null}
        {!loading && !enabled ? (
          <p className="fila-error">Formulário temporariamente indisponível.</p>
        ) : null}
        {!loading && enabled && done ? (
          <div className="fila-success">
            <h2 style={{ marginTop: 0 }}>Você entrou na fila</h2>
            <p className="fila-muted">Em breve a equipe de acolhimento entrará em contato.</p>
          </div>
        ) : null}
        {!loading && enabled && !done ? (
          <form onSubmit={onSubmit}>
            {fields.map((field) => (
              <FieldInput
                key={field.id}
                field={field}
                value={form[field.id]}
                onChange={(v) => setForm((prev) => ({ ...prev, [field.id]: v }))}
              />
            ))}
            <button className="fila-btn" type="submit" disabled={submitting || fields.length === 0}>
              {submitting ? 'Enviando…' : 'Entrar na fila'}
            </button>
          </form>
        ) : null}
      </div>
    </div>
  );
}
