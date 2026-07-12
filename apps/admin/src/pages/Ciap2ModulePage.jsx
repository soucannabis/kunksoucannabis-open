import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

export function Ciap2ModulePage({ api }) {
  const [enabled, setEnabled] = useState(true);
  const [baseline, setBaseline] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await api.getCiap2Status();
        const next = Boolean(res.data?.enabled);
        if (!cancelled) {
          setEnabled(next);
          setBaseline(next);
        }
      } catch (err) {
        if (!cancelled) setError(err.message || 'Falha ao carregar');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [api]);

  async function onSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const res = await api.patchCiap2Status({ enabled });
      const next = Boolean(res.data?.enabled);
      setEnabled(next);
      setBaseline(next);
      setMessage(next ? 'CIAP-2 habilitado.' : 'CIAP-2 desabilitado.');
    } catch (err) {
      setError(err.message || 'Falha ao salvar');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p className="muted">Carregando…</p>;

  return (
    <form
      onSubmit={onSubmit}
      className="card"
      style={{ padding: '1.25rem', display: 'grid', gap: '1rem', maxWidth: 560 }}
    >
      <div>
        <p className="muted" style={{ margin: '0 0 0.5rem' }}>
          <Link to="/configs">← Configs</Link>
        </p>
        <h2 style={{ marginTop: 0 }}>Módulo CIAP-2</h2>
        <p className="muted" style={{ margin: 0 }}>
          Controla o seletor de motivos CIAP-2 no Kunk (associados/pacientes) e no cadastramento.
          Desabilitar oculta o campo e deixa de exigir códigos no cadastro.
        </p>
      </div>
      {error ? <p style={{ color: 'var(--admin-danger)', margin: 0 }}>{error}</p> : null}
      {message ? <p style={{ color: 'var(--admin-success, #2e7d32)', margin: 0 }}>{message}</p> : null}
      <label className="field" style={{ flexDirection: 'row', alignItems: 'center', gap: '0.75rem' }}>
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => setEnabled(e.target.checked)}
        />
        <span>
          Habilitar módulo CIAP-2
          <br />
          <span className="muted">Default ligado. Pode forçar off com MODULE_CIAP2_ENABLED=false.</span>
        </span>
      </label>
      <div>
        <button type="submit" className="btn btn-primary" disabled={saving || enabled === baseline}>
          {saving ? 'Salvando…' : 'Salvar'}
        </button>
      </div>
    </form>
  );
}
