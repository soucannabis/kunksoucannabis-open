import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  getStoreFreightGaps,
  loadStoreFreightConfig,
  saveStoreFreightConfig,
} from '../lib/storeFreightConfig.js';

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

/**
 * Remetente, caixa e declaração — exigidos para ativar Loggi / Melhor Envio.
 */
export function ServicosExternosEnvioPage({ api }) {
  const [values, setValues] = useState(null);
  const [baseline, setBaseline] = useState(null);
  const [itemsByKey, setItemsByKey] = useState({});
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await loadStoreFreightConfig(api);
        if (cancelled) return;
        setValues(res.values);
        setBaseline(structuredClone(res.values));
        setItemsByKey(res.itemsByKey);
      } catch (err) {
        if (!cancelled) setError(err.message || 'Falha ao carregar');
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
    const gaps = getStoreFreightGaps(values);
    if (gaps.incomplete) {
      setError(`Preencha: ${gaps.missing.join(', ')}.`);
      return;
    }
    setSaving(true);
    setError('');
    setMsg('');
    try {
      const updated = await saveStoreFreightConfig(api, values, baseline, itemsByKey);
      setItemsByKey(updated);
      setBaseline(structuredClone(values));
      setMsg('Dados de envio salvos. Agora você pode ativar o Melhor Envio.');
    } catch (err) {
      setError(err.message || 'Falha ao salvar');
    } finally {
      setSaving(false);
    }
  }

  if (!values) {
    return <div className="muted">{error || 'Carregando…'}</div>;
  }

  const gaps = getStoreFreightGaps(values);
  const incomplete = gaps.incomplete;
  const ship = values.shipFrom || {};
  const pkg = values.package || {};
  const decl = values.contentDeclaration || {};

  return (
    <form onSubmit={onSave} className="card" style={{ padding: '1.25rem', maxWidth: 720 }}>
      <h2 style={{ marginTop: 0 }}>Dados de envio</h2>
      <p className="muted" style={{ marginTop: 0 }}>
        Remetente, caixa e declaração de conteúdo são obrigatórios para cotar frete e ativar Loggi /
        Melhor Envio.
      </p>

      {incomplete && (
        <div
          role="alert"
          data-testid="envio-incomplete-banner"
          style={{
            background: '#fff3cd',
            border: '1px solid #ffc107',
            padding: '0.75rem 1rem',
            marginBottom: '1rem',
            borderRadius: 8,
            color: '#000',
          }}
        >
          Faltando: <strong>{gaps.missing.join(', ')}</strong>. O Melhor Envio não pode ser ativado
          até preencher estes campos.
        </div>
      )}
      {!incomplete && (
        <div
          data-testid="envio-complete-banner"
          style={{
            background: '#e8f5e9',
            border: '1px solid #a5d6a7',
            padding: '0.75rem 1rem',
            marginBottom: '1rem',
            borderRadius: 8,
          }}
        >
          Dados completos.{' '}
          <Link to="/servicos-externos/melhorenvio">Ir para Melhor Envio</Link> para autenticar e
          ativar cotação/etiqueta.
        </div>
      )}

      {error && (
        <p role="alert" style={{ color: '#b00020' }}>
          {error}
        </p>
      )}
      {msg && (
        <p style={{ color: '#2e7d32' }} data-testid="envio-msg">
          {msg}
        </p>
      )}

      <h3>Remetente (origem) *</h3>
      {['name', 'street', 'number', 'neighborhood', 'complement', 'city', 'state', 'cep', 'phone', 'document'].map(
        (k) => (
          <Field
            key={k}
            label={k}
            required={['name', 'street', 'number', 'city', 'state', 'cep', 'phone', 'document'].includes(k)}
          >
            <input
              className="input"
              data-testid={`envio-ship-${k}`}
              value={ship[k] || ''}
              onChange={(e) => patch(`shipFrom.${k}`, e.target.value)}
              required={['name', 'street', 'number', 'city', 'state', 'cep', 'phone', 'document'].includes(k)}
            />
          </Field>
        )
      )}
      <p className="muted" style={{ marginTop: -4 }}>
        Nome, telefone e CPF/CNPJ do remetente são obrigatórios para etiqueta Loggi.
      </p>

      <h3>Caixa (cotação) *</h3>
      {['weight_g', 'length_cm', 'width_cm', 'height_cm'].map((k) => (
        <Field key={k} label={k} required>
          <input
            className="input"
            type="number"
            min="0"
            step="any"
            data-testid={`envio-package-${k}`}
            value={pkg[k] ?? ''}
            onChange={(e) => patch(`package.${k}`, e.target.value === '' ? '' : Number(e.target.value))}
            required
          />
        </Field>
      ))}

      <h3>Declaração de conteúdo *</h3>
      <Field label="Descrição" required>
        <input
          className="input"
          data-testid="envio-content-description"
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
          data-testid="envio-content-total-value"
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

      <button type="submit" className="btn btn-primary" data-testid="envio-save" disabled={saving}>
        {saving ? 'Salvando…' : 'Salvar dados de envio'}
      </button>
      <p className="muted" style={{ fontSize: '0.85rem', marginTop: 8 }}>
        Também editável em <Link to="/loja/frete">Loja → Frete</Link> (favoritos e opções extras).
      </p>
    </form>
  );
}
