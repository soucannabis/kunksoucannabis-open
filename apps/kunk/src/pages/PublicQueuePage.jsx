import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { createApiClient } from '@kunk/api-client';
import { isValidEmail, isValidPhoneBr, PhoneInput } from '@kunk/forms';
import { useErrorModal } from '../components/errors/ErrorModalProvider.jsx';
import { getKunkPublicConfig } from '@kunk/config';

function FieldInput({ field, value, onChange, error }) {
  const id = `fila-${field.id}`;
  const type = field.type
    || (field.id === 'is_associate' ? 'checkbox'
      : field.id === 'message' ? 'textarea'
        : field.id === 'help_topic' ? 'select'
          : 'text');
  const options = Array.isArray(field.options) ? field.options : [];
  const requiredMark = ' *';

  if (type === 'checkbox') {
    return (
      <label className={`fila-field fila-check${error ? ' fila-field-invalid' : ''}`}>
        <input
          id={id}
          type="checkbox"
          checked={Boolean(value)}
          required
          onChange={(e) => onChange(e.target.checked)}
        />
        <span>{field.label}{requiredMark}</span>
        {error ? <span className="fila-field-error">{error}</span> : null}
      </label>
    );
  }

  if (type === 'textarea' || field.id === 'message') {
    return (
      <label className={`fila-field${error ? ' fila-field-invalid' : ''}`}>
        <span>{field.label}{requiredMark}</span>
        <textarea
          id={id}
          rows={4}
          value={value || ''}
          required
          onChange={(e) => onChange(e.target.value)}
        />
        {error ? <span className="fila-field-error">{error}</span> : null}
      </label>
    );
  }

  if (type === 'select') {
    return (
      <label className={`fila-field${error ? ' fila-field-invalid' : ''}`}>
        <span>{field.label}{requiredMark}</span>
        <select
          id={id}
          value={value || ''}
          required
          onChange={(e) => onChange(e.target.value)}
        >
          <option value="">Selecione…</option>
          {(options.length ? options : ['Outro']).map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
        {error ? <span className="fila-field-error">{error}</span> : null}
      </label>
    );
  }

  if (field.id === 'phone') {
    return (
      <div className={`fila-field${error ? ' fila-field-invalid' : ''}`}>
        <span>{field.label}{requiredMark}</span>
        <PhoneInput
          value={value || ''}
          onChange={onChange}
          invalid={Boolean(error)}
          inputClass="fila-phone-input"
          className="fila-phone"
          inputProps={{
            id,
            name: 'phone',
            required: true,
            autoComplete: 'tel',
          }}
        />
        {error ? <span className="fila-field-error">{error}</span> : null}
      </div>
    );
  }

  return (
    <label className={`fila-field${error ? ' fila-field-invalid' : ''}`}>
      <span>{field.label}{requiredMark}</span>
      <input
        id={id}
        type={field.id === 'email' ? 'email' : 'text'}
        value={value || ''}
        required
        autoComplete={field.id === 'email' ? 'email' : undefined}
        onChange={(e) => onChange(e.target.value)}
      />
      {error ? <span className="fila-field-error">{error}</span> : null}
    </label>
  );
}

function validateForm(fields, form) {
  const errors = {};
  for (const field of fields) {
    const value = form[field.id];
    const empty = value === undefined || value === null || String(value).trim() === '';
    if (empty && value !== false) {
      errors[field.id] = `${field.label || field.id} é obrigatório`;
      continue;
    }
    if (field.id === 'email' && !isValidEmail(value)) {
      errors[field.id] = 'Informe um e-mail válido';
    }
    if (field.id === 'phone' && !isValidPhoneBr(value)) {
      errors[field.id] = 'Informe um telefone válido';
    }
  }
  return errors;
}

export default function PublicQueuePage() {
  const [searchParams] = useSearchParams();
  const embed = searchParams.get('embed') === '1';
  const bootstrap = useMemo(() => getKunkPublicConfig(), []);
  const api = useMemo(() => createApiClient({ baseUrl: bootstrap.apiUrl }), [bootstrap.apiUrl]);

  const [fields, setFields] = useState([]);
  const [enabled, setEnabled] = useState(true);
  const [form, setForm] = useState({});
  const [fieldErrors, setFieldErrors] = useState({});
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
        const nextFields = (res.data?.fields || []).map((f) => ({ ...f, required: true }));
        setFields(nextFields);
        const initial = {};
        for (const f of nextFields) {
          initial[f.id] = f.type === 'checkbox' || f.id === 'is_associate' ? false : '';
        }
        setForm(initial);
        setFieldErrors({});
      } catch (err) {
        if (!cancelled) showError(err.message || 'Falha ao carregar formulário');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [api, showError]);

  function updateField(id, value) {
    setForm((prev) => ({ ...prev, [id]: value }));
    setFieldErrors((prev) => {
      if (!prev[id]) return prev;
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }

  async function onSubmit(e) {
    e.preventDefault();
    const errors = validateForm(fields, form);
    setFieldErrors(errors);
    if (Object.keys(errors).length) {
      showError(Object.values(errors)[0]);
      return;
    }
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
        .fila-field > span { font-size: 0.9rem; color: #9aab9e; }
        .fila-field input, .fila-field textarea, .fila-field select {
          width: 100%; box-sizing: border-box; border-radius: 8px;
          border: 1px solid #2d3b30; background: #0f1410; color: #e8efe9;
          padding: 0.65rem 0.75rem; font: inherit;
        }
        .fila-field-invalid input,
        .fila-field-invalid textarea,
        .fila-field-invalid select,
        .fila-field-invalid .fila-phone-input {
          border-color: #c66 !important;
        }
        .fila-field-error { font-size: 0.8rem; color: #e88; }
        .fila-check { display: flex; align-items: center; gap: 0.6rem; flex-wrap: wrap; }
        .fila-check input { width: auto; }
        .fila-phone { width: 100%; }
        .fila-phone .fila-phone-input {
          width: 100% !important;
          height: 42px !important;
          box-sizing: border-box !important;
          border-radius: 0 8px 8px 0 !important;
          border: 1px solid #2d3b30 !important;
          background: #0f1410 !important;
          color: #e8efe9 !important;
          font: inherit !important;
        }
        .fila-phone .flag-dropdown,
        .fila-phone .kunk-phone-flag-btn {
          background: #0f1410 !important;
          border: 1px solid #2d3b30 !important;
          border-radius: 8px 0 0 8px !important;
        }
        .fila-phone .selected-flag:hover,
        .fila-phone .selected-flag:focus,
        .fila-phone .selected-flag.open {
          background: #142018 !important;
        }
        .fila-phone .country-list,
        .fila-phone .kunk-phone-dropdown {
          background: #142018 !important;
          color: #e8efe9 !important;
          border: 1px solid #2d3b30 !important;
          z-index: 30 !important;
        }
        .fila-phone .country-list .country:hover,
        .fila-phone .country-list .country.highlight {
          background: #1a2a1c !important;
        }
        .fila-phone .search-box {
          background: #0f1410 !important;
          color: #e8efe9 !important;
          border: 1px solid #2d3b30 !important;
        }
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
          <form onSubmit={onSubmit} noValidate>
            {fields.map((field) => (
              <FieldInput
                key={field.id}
                field={field}
                value={form[field.id]}
                error={fieldErrors[field.id]}
                onChange={(v) => updateField(field.id, v)}
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
