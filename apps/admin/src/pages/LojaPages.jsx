import React, { useEffect, useState } from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import {
  isStoreFreightIncomplete,
  loadStoreFreightConfig,
  saveStoreFreightConfig,
} from '../lib/storeFreightConfig.js';

export function LojaShell() {
  return (
    <div>
      <div className="admin-top">
        <div>
          <h1 style={{ margin: 0 }}>Loja</h1>
          <p className="muted" style={{ margin: '0.25rem 0 0' }}>
            Frete, status de pedidos e declaração de conteúdo
          </p>
        </div>
      </div>
      <nav
        className="triage-subnav"
        style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}
      >
        <NavLink to="/loja" end className={({ isActive }) => (isActive ? 'btn btn-primary' : 'btn')}>
          Índice
        </NavLink>
        <NavLink to="/loja/frete" className={({ isActive }) => (isActive ? 'btn btn-primary' : 'btn')}>
          Frete
        </NavLink>
        <NavLink
          to="/loja/status-pedidos"
          className={({ isActive }) => (isActive ? 'btn btn-primary' : 'btn')}
        >
          Status de pedidos
        </NavLink>
      </nav>
      <Outlet />
    </div>
  );
}

export function LojaIndexPage() {
  return (
    <div className="card" style={{ padding: '1.25rem' }}>
      <h2 style={{ marginTop: 0 }}>Área Loja</h2>
      <ul style={{ lineHeight: 1.8 }}>
        <li>
          <Link to="/loja/frete">Frete</Link> — apply_to_total, remetente, caixa, declaração, favorito
        </li>
        <li>
          <Link to="/loja/status-pedidos">Status de pedidos</Link> — Aguardando / Pagamento concluído +
          customizados
        </li>
        <li>
          <Link to="/servicos-externos">Serviços externos</Link> — Loggi e Melhor Envio
        </li>
      </ul>
    </div>
  );
}

function Field({ label, children, required }) {
  return (
    <label style={{ display: 'block', marginBottom: '0.75rem' }}>
      <span style={{ display: 'block', fontSize: '0.85rem', marginBottom: 4 }}>
        {label}
        {required ? ' *' : ''}
      </span>
      {children}
    </label>
  );
}

export function LojaFretePage({ api }) {
  const [values, setValues] = useState(null);
  const [baseline, setBaseline] = useState(null);
  const [itemsByKey, setItemsByKey] = useState({});
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [serviceOptions, setServiceOptions] = useState([]);
  const [useLabelOverride, setUseLabelOverride] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await loadStoreFreightConfig(api);
        if (cancelled) return;
        setValues(res.values);
        setBaseline(structuredClone(res.values));
        setItemsByKey(res.itemsByKey);
        setUseLabelOverride(Boolean(res.values.labelPackage));
      } catch (err) {
        if (!cancelled) setError(err.message || 'Falha ao carregar');
      }
      try {
        const opts = await api.freightServiceOptions();
        if (!cancelled) setServiceOptions(opts.data?.options || []);
      } catch {
        /* modules may be off */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [api]);

  function patch(path, value) {
    setValues((prev) => {
      const next = structuredClone(prev);
      const parts = path.split('.');
      let cur = next;
      for (let i = 0; i < parts.length - 1; i += 1) cur = cur[parts[i]];
      cur[parts[parts.length - 1]] = value;
      return next;
    });
  }

  async function onSave(e) {
    e.preventDefault();
    if (!values) return;
    if (isStoreFreightIncomplete(values)) {
      setError('Preencha remetente, caixa e declaração de conteúdo (obrigatórios).');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const toSave = {
        ...values,
        labelPackage: useLabelOverride ? values.labelPackage : null,
      };
      const updated = await saveStoreFreightConfig(api, toSave, baseline, itemsByKey);
      setItemsByKey(updated);
      setBaseline(structuredClone(toSave));
      setValues(toSave);
    } catch (err) {
      setError(err.message || 'Falha ao salvar');
    } finally {
      setSaving(false);
    }
  }

  if (!values) {
    return <div className="muted">{error || 'Carregando…'}</div>;
  }

  const incomplete = isStoreFreightIncomplete(values);
  const ship = values.shipFrom;
  const pkg = values.package;
  const decl = values.contentDeclaration;
  const labelPkg = values.labelPackage || {
    weight_g: '',
    length_cm: '',
    width_cm: '',
    height_cm: '',
  };

  return (
    <form onSubmit={onSave} className="card" style={{ padding: '1.25rem', maxWidth: 720 }}>
      <h2 style={{ marginTop: 0 }}>Frete da loja</h2>
      {incomplete && (
        <div
          role="alert"
          data-testid="freight-incomplete-banner"
          style={{
            background: '#fff3cd',
            border: '1px solid #ffc107',
            padding: '0.75rem',
            marginBottom: '1rem',
            borderRadius: 4,
          }}
        >
          Configuração incompleta: cotação e etiqueta falharão com CONFIG_INCOMPLETE até preencher
          remetente, caixa e declaração.
        </div>
      )}
      {error && (
        <p role="alert" style={{ color: '#b00020' }}>
          {error}
        </p>
      )}

      <Field label="Aplicar frete no total">
        <input
          type="checkbox"
          data-testid="apply-to-total"
          checked={Boolean(values.applyToTotal)}
          onChange={(e) => patch('applyToTotal', e.target.checked)}
        />
      </Field>

      <h3>Remetente *</h3>
      {['name', 'street', 'number', 'neighborhood', 'complement', 'city', 'state', 'cep', 'phone', 'document'].map(
        (k) => (
          <Field key={k} label={k} required={['street', 'number', 'city', 'state', 'cep'].includes(k)}>
            <input
              className="input"
              data-testid={`ship-from-${k}`}
              value={ship[k] || ''}
              onChange={(e) => patch(`shipFrom.${k}`, e.target.value)}
              required={['street', 'number', 'city', 'state', 'cep'].includes(k)}
            />
          </Field>
        )
      )}

      <h3>Caixa (cotação) *</h3>
      {['weight_g', 'length_cm', 'width_cm', 'height_cm'].map((k) => (
        <Field key={k} label={k} required>
          <input
            className="input"
            type="number"
            min="0"
            step="any"
            data-testid={`package-${k}`}
            value={pkg[k] ?? ''}
            onChange={(e) => patch(`package.${k}`, e.target.value === '' ? '' : Number(e.target.value))}
            required
          />
        </Field>
      ))}

      <Field label="Usar dims/peso diferentes na etiqueta">
        <input
          type="checkbox"
          data-testid="use-label-package"
          checked={useLabelOverride}
          onChange={(e) => {
            setUseLabelOverride(e.target.checked);
            if (e.target.checked && !values.labelPackage) {
              patch('labelPackage', { ...pkg });
            }
          }}
        />
      </Field>
      {useLabelOverride &&
        ['weight_g', 'length_cm', 'width_cm', 'height_cm'].map((k) => (
          <Field key={k} label={`label ${k}`}>
            <input
              className="input"
              type="number"
              data-testid={`label-package-${k}`}
              value={labelPkg[k] ?? ''}
              onChange={(e) =>
                patch(`labelPackage.${k}`, e.target.value === '' ? '' : Number(e.target.value))
              }
            />
          </Field>
        ))}

      <h3>Declaração de conteúdo *</h3>
      <Field label="Descrição" required>
        <input
          className="input"
          data-testid="content-description"
          value={decl.description || ''}
          onChange={(e) => patch('contentDeclaration.description', e.target.value)}
          required
        />
      </Field>
      <Field label="Valor declarado (R$)" required>
        <input
          className="input"
          type="number"
          min="0"
          step="0.01"
          data-testid="content-total-value"
          value={decl.total_value ?? ''}
          onChange={(e) =>
            patch(
              'contentDeclaration.total_value',
              e.target.value === '' ? '' : Number(e.target.value)
            )
          }
          required
        />
      </Field>

      <h3>Favorito de entrega</h3>
      <Field label="Opção padrão">
        <select
          className="input"
          data-testid="default-option"
          value={values.defaultOption?.option_key || ''}
          onChange={(e) => {
            const opt = serviceOptions.find((o) => o.option_key === e.target.value);
            patch(
              'defaultOption',
              opt
                ? {
                    option_key: opt.option_key,
                    provider: opt.provider,
                    service_label: opt.service_label || opt.label,
                  }
                : null
            );
          }}
        >
          <option value="">— nenhum —</option>
          {serviceOptions.map((o) => (
            <option key={o.option_key} value={o.option_key}>
              {o.service_label || o.label || o.option_key}
            </option>
          ))}
        </select>
      </Field>

      <Field label="SISUs Loggi (JSON array)">
        <input
          className="input"
          data-testid="loggi-sisus"
          value={JSON.stringify(values.loggiExternalServiceIds || [])}
          onChange={(e) => {
            try {
              patch('loggiExternalServiceIds', JSON.parse(e.target.value || '[]'));
            } catch {
              /* ignore while typing */
            }
          }}
        />
      </Field>

      <button type="submit" className="btn btn-primary" data-testid="save-freight" disabled={saving}>
        {saving ? 'Salvando…' : 'Salvar'}
      </button>
    </form>
  );
}

export function LojaStatusPedidosPage({ api }) {
  const [statuses, setStatuses] = useState(null);
  const [itemsByKey, setItemsByKey] = useState({});
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { loadOrderStatusesConfig } = await import('../lib/orderStatusesConfig.js');
        const res = await loadOrderStatusesConfig(api);
        if (cancelled) return;
        setStatuses(res.statuses);
        setItemsByKey(res.itemsByKey);
        setLoaded(true);
      } catch (err) {
        if (!cancelled) setError(err.message || 'Falha ao carregar');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [api]);

  function updateStatus(id, patch) {
    setStatuses((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  }

  function addStatus() {
    const id = `st_${Date.now().toString(36)}`;
    setStatuses((prev) => [
      ...prev,
      {
        id,
        value: 'Novo status',
        label: 'Novo status',
        order: (prev.length + 1) * 10,
        system: false,
        color: '#5c6bc0',
      },
    ]);
  }

  function removeStatus(id) {
    const target = statuses.find((s) => s.id === id);
    if (target?.system) {
      setError('Status de sistema não pode ser removido');
      return;
    }
    setStatuses((prev) => prev.filter((s) => s.id !== id));
  }

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    const awaiting = statuses.filter((s) => s.is_awaiting);
    const paid = statuses.filter((s) => s.is_paid);
    if (awaiting.length !== 1 || paid.length !== 1) {
      setError('Deve haver exatamente um status "aguardando" e um "pago" (sistema)');
      return;
    }
    if (statuses.some((s) => !String(s.label || '').trim())) {
      setError('Todos os status precisam de um nome');
      return;
    }
    setSaving(true);
    try {
      const { saveOrderStatusesConfig } = await import('../lib/orderStatusesConfig.js');
      const next = await saveOrderStatusesConfig(api, statuses, itemsByKey);
      setStatuses(next);
      const reloaded = await (await import('../lib/orderStatusesConfig.js')).loadOrderStatusesConfig(api);
      setItemsByKey(reloaded.itemsByKey);
    } catch (err) {
      setError(err.message || 'Falha ao salvar');
    } finally {
      setSaving(false);
    }
  }

  if (!loaded || !statuses) {
    return <p className="muted">{error || 'Carregando…'}</p>;
  }

  return (
    <form
      onSubmit={onSubmit}
      className="card"
      style={{ padding: '1.25rem', display: 'grid', gap: '1rem' }}
      data-testid="order-statuses-form"
    >
      {error ? <p style={{ color: 'var(--admin-danger)', margin: 0 }}>{error}</p> : null}
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem' }}>
        <h2 style={{ margin: 0 }}>Status de pedidos</h2>
        <button type="button" className="btn" onClick={addStatus} data-testid="add-order-status">
          Adicionar status
        </button>
      </div>
      <p className="muted" style={{ margin: 0 }}>
        Os dois status de sistema (Aguardando pagamento / Pagamento concluído) controlam o toggle de
        pagamento e a data de pagamento. Você pode adicionar outros para filtros e ações em massa.
      </p>
      <table className="data">
        <thead>
          <tr>
            <th>Nome / valor</th>
            <th>Cor</th>
            <th>Ordem</th>
            <th>Sistema</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {statuses
            .slice()
            .sort((a, b) => (a.order || 0) - (b.order || 0))
            .map((s) => (
              <tr key={s.id}>
                <td>
                  <input
                    type="text"
                    value={s.label || ''}
                    disabled={s.system}
                    onChange={(e) => {
                      const label = e.target.value;
                      updateStatus(s.id, { label, value: s.system ? s.value : label });
                    }}
                    required
                  />
                </td>
                <td>
                  <input
                    type="color"
                    value={/^#[0-9a-fA-F]{3,8}$/.test(String(s.color || '')) ? s.color : '#5c6bc0'}
                    onChange={(e) => updateStatus(s.id, { color: e.target.value })}
                  />
                </td>
                <td>
                  <input
                    type="number"
                    value={s.order ?? 0}
                    onChange={(e) => updateStatus(s.id, { order: Number(e.target.value) || 0 })}
                    style={{ width: 72 }}
                  />
                </td>
                <td>{s.system ? 'sim' : '—'}</td>
                <td>
                  {!s.system && (
                    <button type="button" className="btn" onClick={() => removeStatus(s.id)}>
                      Remover
                    </button>
                  )}
                </td>
              </tr>
            ))}
        </tbody>
      </table>
      <button type="submit" className="btn btn-primary" data-testid="save-order-statuses" disabled={saving}>
        {saving ? 'Salvando…' : 'Salvar'}
      </button>
    </form>
  );
}
