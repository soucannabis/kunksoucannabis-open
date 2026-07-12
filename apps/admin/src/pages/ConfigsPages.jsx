import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { VisibleFieldsPicker } from '../components/VisibleFieldsPicker.jsx';
import { collectionLabel, isDadosCollection } from '../lib/collectionLabels.js';
import {
  defaultVisibleFields,
  parseFieldsJson,
  parseVisibleFieldsKey,
  saveVisibleFields,
} from '../lib/visibleFieldsConfig.js';

const SYSTEM_LABELS = {
  admin: 'Admin',
  registration: 'Cadastramento',
  kunk: 'Kunk',
  triage: 'Triagem',
  panel: 'Painel',
  terms: 'Termos',
  api: 'API',
};

function systemLabel(name) {
  return SYSTEM_LABELS[name] || (name ? name.charAt(0).toUpperCase() + name.slice(1) : name);
}

export function ConfigsIndexPage({ api }) {
  const [systems, setSystems] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await api.configSystems();
        if (!cancelled) setSystems(res.data || []);
      } catch (err) {
        if (!cancelled) setError(err.message);
      }
    })();
    return () => { cancelled = true; };
  }, [api]);

  return (
    <div>
      <h1>System configs</h1>
      <p className="muted">Variáveis agrupadas por sistema (cascata DB → env → hardcoded).</p>
      {error ? <div className="alert alert-error">{error}</div> : null}
      <div className="grid-2" style={{ marginTop: '1rem' }}>
        {systems.map((s) => (
          <Link key={s.system} className="collection-link" to={`/configs/${encodeURIComponent(s.system)}`}>
            <strong>{systemLabel(s.system)}</strong>
            <div className="muted">{s.system} · {s.key_count} keys</div>
          </Link>
        ))}
      </div>
    </div>
  );
}

export function ConfigsSystemPage({ api }) {
  const { system } = useParams();
  const isAdmin = system === 'admin';
  const [items, setItems] = useState([]);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [drafts, setDrafts] = useState({});
  const [schemaByCollection, setSchemaByCollection] = useState({});
  const [dadosCollections, setDadosCollections] = useState([]);
  const [fieldDrafts, setFieldDrafts] = useState({});
  const [fieldsDirty, setFieldsDirty] = useState({});
  const [fieldsBusy, setFieldsBusy] = useState({});
  const [openCollections, setOpenCollections] = useState({});

  async function reload() {
    const res = await api.configBySystem(system);
    setItems(res.data?.items || []);
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await reload();
      } catch (err) {
        if (!cancelled) setError(err.message);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [api, system]);

  useEffect(() => {
    if (!isAdmin) return undefined;
    let cancelled = false;
    (async () => {
      try {
        const schemaRes = await api.adminSchema();
        const collections = (schemaRes.data?.collections || [])
          .filter((c) => isDadosCollection(c.name))
          .sort((a, b) => collectionLabel(a.name).localeCompare(collectionLabel(b.name), 'pt-BR'));
        const map = {};
        for (const c of collections) map[c.name] = c;
        if (!cancelled) {
          setDadosCollections(collections);
          setSchemaByCollection(map);
        }
      } catch (err) {
        if (!cancelled) setError(err.message);
      }
    })();
    return () => { cancelled = true; };
  }, [api, isAdmin]);

  const visibleFieldItems = useMemo(() => {
    const visible = [];
    for (const item of items) {
      if (parseVisibleFieldsKey(item.key)) visible.push(item);
    }
    visible.sort((a, b) => {
      const ca = parseVisibleFieldsKey(a.key) || '';
      const cb = parseVisibleFieldsKey(b.key) || '';
      return collectionLabel(ca).localeCompare(collectionLabel(cb), 'pt-BR');
    });
    return visible;
  }, [items]);

  const configByCollection = useMemo(() => {
    const map = {};
    for (const item of visibleFieldItems) {
      const name = parseVisibleFieldsKey(item.key);
      if (name) map[name] = item;
    }
    return map;
  }, [visibleFieldItems]);

  useEffect(() => {
    if (!isAdmin || !dadosCollections.length) return;
    setFieldDrafts((prev) => {
      const next = { ...prev };
      for (const col of dadosCollections) {
        if (fieldsDirty[col.name]) continue;
        const item = configByCollection[col.name];
        const parsed = parseFieldsJson(item?.value || item?.resolved_value);
        const schema = schemaByCollection[col.name];
        const allowed = new Set((schema?.columns || []).filter((c) => !(schema.sensitive || []).includes(c)));
        if (parsed?.length) {
          const filtered = parsed.filter((f) => allowed.has(f));
          next[col.name] = filtered.length ? filtered : defaultVisibleFields(schema);
        } else {
          next[col.name] = defaultVisibleFields(schema);
        }
      }
      return next;
    });
  }, [isAdmin, dadosCollections, configByCollection, schemaByCollection, fieldsDirty]);

  async function saveItem(item) {
    setError('');
    setMessage('');
    try {
      const value = drafts[item.id] !== undefined ? drafts[item.id] : (item.is_sensitive ? '' : item.value);
      if (item.is_sensitive && !value) {
        setError('Informe um novo valor para config sensível');
        return;
      }
      await api.updateConfig(item.id, { value });
      setMessage(`Salvo: ${item.key}`);
      await reload();
    } catch (err) {
      setError(err.message);
    }
  }

  async function clearItem(item) {
    setError('');
    try {
      await api.clearConfig(item.id);
      setMessage(`Limpo: ${item.key}`);
      await reload();
    } catch (err) {
      setError(err.message);
    }
  }

  async function saveVisibleForCollection(collection) {
    setError('');
    setMessage('');
    setFieldsBusy((b) => ({ ...b, [collection]: true }));
    try {
      const fields = fieldDrafts[collection] || [];
      if (!fields.length) {
        setError('Selecione ao menos um campo');
        return;
      }
      await saveVisibleFields(api, collection, fields, configByCollection[collection] || null);
      setMessage(`Campos visíveis salvos: ${collectionLabel(collection)}`);
      setFieldsDirty((d) => {
        const next = { ...d };
        delete next[collection];
        return next;
      });
      await reload();
    } catch (err) {
      setError(err.message);
    } finally {
      setFieldsBusy((b) => ({ ...b, [collection]: false }));
    }
  }

  async function clearVisibleForCollection(collection) {
    const item = configByCollection[collection];
    if (!item) return;
    setError('');
    try {
      await api.clearConfig(item.id);
      setMessage(`Limpo: ${collectionLabel(collection)}`);
      setFieldsDirty((d) => {
        const next = { ...d };
        delete next[collection];
        return next;
      });
      await reload();
    } catch (err) {
      setError(err.message);
    }
  }

  function toggleCollection(name) {
    setOpenCollections((prev) => ({ ...prev, [name]: !prev[name] }));
  }

  return (
    <div>
      <div className="admin-top">
        <div>
          <h1>Configs · {systemLabel(system)}</h1>
          <p className="muted"><Link to="/configs">← Sistemas</Link></p>
        </div>
      </div>
      {error ? <div className="alert alert-error" role="alert">{error}</div> : null}
      {message ? <div className="alert alert-info">{message}</div> : null}

      {isAdmin ? (
        <section>
          <h2>Campos visíveis em Dados</h2>
          <p className="muted">
            Clique em uma tabela para configurar os campos da listagem.
          </p>
          {dadosCollections.length === 0 ? (
            <div className="card muted">Carregando tabelas…</div>
          ) : (
            <div className="config-accordion">
              {dadosCollections.map((col) => {
                const schema = schemaByCollection[col.name];
                const selected = fieldDrafts[col.name] || defaultVisibleFields(schema);
                const hasSaved = Boolean(configByCollection[col.name]);
                const busy = Boolean(fieldsBusy[col.name]);
                const open = Boolean(openCollections[col.name]);
                return (
                  <div key={col.name} className={`config-accordion-item${open ? ' is-open' : ''}`}>
                    <button
                      type="button"
                      className="config-accordion-trigger"
                      aria-expanded={open}
                      onClick={() => toggleCollection(col.name)}
                    >
                      <span className="config-accordion-chevron" aria-hidden="true">{open ? '▾' : '▸'}</span>
                      <span className="config-accordion-title">
                        <strong>{collectionLabel(col.name)}</strong>
                        <span className="mono muted">{col.name}</span>
                      </span>
                      <span className="muted" style={{ fontSize: '0.8rem' }}>
                        {hasSaved ? 'salvo' : 'padrão'} · {selected.length} campos
                      </span>
                    </button>
                    {open ? (
                      <div className="config-accordion-body">
                        <VisibleFieldsPicker
                          schema={schema}
                          selected={selected}
                          idPrefix={`cfg-${col.name}`}
                          onChange={(next) => {
                            setFieldDrafts((d) => ({ ...d, [col.name]: next }));
                            setFieldsDirty((d) => ({ ...d, [col.name]: true }));
                          }}
                        />
                        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.85rem', flexWrap: 'wrap' }}>
                          <button
                            type="button"
                            className="btn btn-primary"
                            disabled={busy || selected.length === 0}
                            onClick={() => saveVisibleForCollection(col.name)}
                          >
                            {busy ? 'Salvando…' : 'Salvar'}
                          </button>
                          {hasSaved ? (
                            <button
                              type="button"
                              className="btn"
                              disabled={busy}
                              onClick={() => clearVisibleForCollection(col.name)}
                            >
                              Clear
                            </button>
                          ) : null}
                        </div>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      ) : (
        <>
          <h2>Keys</h2>
          <div className="card table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th>Key</th>
                  <th>Valor</th>
                  <th>Source</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="muted">Nenhuma key neste grupo.</td>
                  </tr>
                ) : (
                  items.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <div className="mono">{item.key}</div>
                        <div className="muted">{item.description}</div>
                      </td>
                      <td>
                        <input
                          style={{ width: '100%' }}
                          type={item.is_sensitive ? 'password' : 'text'}
                          placeholder={item.is_sensitive ? (item.has_value ? '********' : '(vazio)') : (item.resolved_value || '')}
                          value={drafts[item.id] !== undefined ? drafts[item.id] : (item.is_sensitive ? '' : (item.value || ''))}
                          onChange={(e) => setDrafts((d) => ({ ...d, [item.id]: e.target.value }))}
                        />
                      </td>
                      <td className="mono">{item.source}</td>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        <button type="button" className="btn btn-primary" onClick={() => saveItem(item)}>Salvar</button>
                        {' '}
                        <button type="button" className="btn" onClick={() => clearItem(item)}>Clear</button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
