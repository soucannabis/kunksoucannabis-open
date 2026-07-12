import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

const EMPTY_TYPE = {
  id: '',
  label: '',
  association_fee: 0,
  default_consultation_price: '',
  active: true,
  sort: 100,
};

export function ServicesTypesPage({ api }) {
  const [types, setTypes] = useState([]);
  const [settings, setSettings] = useState({ deduct_donation_from_payable: false });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_TYPE);
  const [isNew, setIsNew] = useState(false);

  async function reload() {
    const [typesRes, settingsRes] = await Promise.all([
      api.getProfessionalTypes(),
      api.getServiceReportSettings(),
    ]);
    setTypes(Array.isArray(typesRes.data) ? typesRes.data : []);
    setSettings(settingsRes.data || { deduct_donation_from_payable: false });
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await reload();
      } catch (err) {
        if (!cancelled) setError(err.message || 'Falha ao carregar');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [api]);

  const sorted = useMemo(
    () => [...types].sort((a, b) => (a.sort || 0) - (b.sort || 0) || String(a.label).localeCompare(b.label, 'pt-BR')),
    [types]
  );

  function openNew() {
    setIsNew(true);
    setEditing('__new__');
    setForm({ ...EMPTY_TYPE, sort: (types.length + 1) * 10 });
    setMessage('');
    setError('');
  }

  function openEdit(row) {
    setIsNew(false);
    setEditing(row.id);
    setForm({
      id: row.id,
      label: row.label || '',
      association_fee: row.association_fee ?? 0,
      default_consultation_price:
        row.default_consultation_price == null ? '' : row.default_consultation_price,
      active: row.active !== false,
      sort: row.sort ?? 100,
    });
    setMessage('');
    setError('');
  }

  function closeForm() {
    setEditing(null);
    setForm(EMPTY_TYPE);
  }

  async function saveTypes(nextTypes) {
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const res = await api.putProfessionalTypes(nextTypes);
      setTypes(Array.isArray(res.data) ? res.data : nextTypes);
      setMessage('Tipos salvos.');
      closeForm();
    } catch (err) {
      setError(err.message || 'Falha ao salvar tipos');
    } finally {
      setSaving(false);
    }
  }

  async function onSubmitType(e) {
    e.preventDefault();
    const id = String(form.id || '').trim();
    if (!id || !String(form.label || '').trim()) {
      setError('Código e label são obrigatórios');
      return;
    }
    const row = {
      id,
      label: String(form.label).trim(),
      association_fee: Number(form.association_fee) || 0,
      default_consultation_price:
        form.default_consultation_price === '' || form.default_consultation_price == null
          ? null
          : Number(form.default_consultation_price),
      active: Boolean(form.active),
      sort: Number(form.sort) || 100,
    };
    let next;
    if (isNew) {
      if (types.some((t) => t.id === id)) {
        setError('Já existe um tipo com este código');
        return;
      }
      next = [...types, row];
    } else {
      next = types.map((t) => (t.id === editing ? row : t));
    }
    await saveTypes(next);
  }

  async function toggleActive(row) {
    const next = types.map((t) => (t.id === row.id ? { ...t, active: !t.active } : t));
    await saveTypes(next);
  }

  async function saveSettings(e) {
    e.preventDefault();
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const res = await api.putServiceReportSettings(settings);
      setSettings(res.data || settings);
      setMessage('Configuração do relatório salva.');
    } catch (err) {
      setError(err.message || 'Falha ao salvar');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p className="muted">Carregando…</p>;

  return (
    <div style={{ display: 'grid', gap: '1.25rem', maxWidth: 900 }}>
      <div>
        <p className="muted" style={{ margin: '0 0 0.5rem' }}>
          <Link to="/configs">← Configs</Link>
        </p>
        <h2 style={{ marginTop: 0 }}>Tipos de profissional e relatório</h2>
        <p className="muted" style={{ margin: 0 }}>
          Taxas por tipo (valor retido pela associação) e preço padrão de consulta. Default do
          sistema: taxa 0 e doação não desconta o pagamento ao profissional.
        </p>
      </div>

      {error ? <p style={{ color: 'var(--admin-danger)', margin: 0 }}>{error}</p> : null}
      {message ? <p style={{ color: 'var(--admin-success, #2e7d32)', margin: 0 }}>{message}</p> : null}

      <form className="card" style={{ padding: '1.25rem' }} onSubmit={saveSettings}>
        <h3 style={{ marginTop: 0 }}>Relatório de serviços</h3>
        <label className="field" style={{ flexDirection: 'row', alignItems: 'center', gap: '0.75rem' }}>
          <input
            type="checkbox"
            checked={Boolean(settings.deduct_donation_from_payable)}
            onChange={(e) =>
              setSettings((s) => ({ ...s, deduct_donation_from_payable: e.target.checked }))
            }
          />
          <span>
            Descontar doação do valor a pagar ao profissional
            <br />
            <span className="muted">
              Se ligado: valor a receber = preço − taxa − doação. Default: desligado.
            </span>
          </span>
        </label>
        <button type="submit" className="btn btn-primary" disabled={saving} style={{ marginTop: '0.75rem' }}>
          {saving ? 'Salvando…' : 'Salvar configuração'}
        </button>
      </form>

      <div className="card" style={{ padding: '1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
          <h3 style={{ margin: 0 }}>Tipos</h3>
          <button type="button" className="btn btn-primary" onClick={openNew}>
            Novo tipo
          </button>
        </div>
        <table className="data-table" style={{ width: '100%', marginTop: '1rem' }}>
          <thead>
            <tr>
              <th>Código</th>
              <th>Label</th>
              <th>Taxa (R$)</th>
              <th>Preço padrão</th>
              <th>Ativo</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {sorted.map((row) => (
              <tr key={row.id}>
                <td>
                  <code>{row.id}</code>
                </td>
                <td>{row.label}</td>
                <td>{Number(row.association_fee || 0).toFixed(2)}</td>
                <td>
                  {row.default_consultation_price == null
                    ? '—'
                    : Number(row.default_consultation_price).toFixed(2)}
                </td>
                <td>{row.active === false ? 'Não' : 'Sim'}</td>
                <td style={{ whiteSpace: 'nowrap' }}>
                  <button type="button" className="btn" onClick={() => openEdit(row)}>
                    Editar
                  </button>{' '}
                  <button type="button" className="btn" onClick={() => toggleActive(row)}>
                    {row.active === false ? 'Ativar' : 'Desativar'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing ? (
        <form className="card" style={{ padding: '1.25rem', display: 'grid', gap: '0.75rem' }} onSubmit={onSubmitType}>
          <h3 style={{ margin: 0 }}>{isNew ? 'Novo tipo' : `Editar ${editing}`}</h3>
          <label className="field">
            Código
            <input
              value={form.id}
              disabled={!isNew}
              onChange={(e) => setForm((f) => ({ ...f, id: e.target.value }))}
              required
            />
          </label>
          <label className="field">
            Label
            <input
              value={form.label}
              onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
              required
            />
          </label>
          <label className="field">
            Taxa da associação (R$)
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.association_fee}
              onChange={(e) => setForm((f) => ({ ...f, association_fee: e.target.value }))}
            />
          </label>
          <label className="field">
            Preço padrão da consulta (vazio = usa o do profissional)
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.default_consultation_price}
              onChange={(e) => setForm((f) => ({ ...f, default_consultation_price: e.target.value }))}
            />
          </label>
          <label className="field">
            Ordem
            <input
              type="number"
              value={form.sort}
              onChange={(e) => setForm((f) => ({ ...f, sort: e.target.value }))}
            />
          </label>
          <label className="field" style={{ flexDirection: 'row', alignItems: 'center', gap: '0.5rem' }}>
            <input
              type="checkbox"
              checked={Boolean(form.active)}
              onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))}
            />
            Ativo
          </label>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Salvando…' : 'Salvar tipo'}
            </button>
            <button type="button" className="btn" onClick={closeForm}>
              Cancelar
            </button>
          </div>
        </form>
      ) : null}
    </div>
  );
}
