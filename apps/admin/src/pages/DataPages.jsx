import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { collectionLabel, isDadosCollection } from '../lib/collectionLabels.js';
import { fieldLabel } from '../lib/fieldLabels.js';
import { VisibleFieldsPicker } from '../components/VisibleFieldsPicker.jsx';
import {
  availableFields,
  defaultVisibleFields,
  loadVisibleFields,
  saveVisibleFields,
} from '../lib/visibleFieldsConfig.js';
import {
  applyColumnOrder,
  loadColumnOrder,
  loadSort,
  nextSortState,
  saveColumnOrder,
  saveSort,
  sortRows,
} from '../lib/tableStorage.js';

export function DadosIndexPage({ api }) {
  const [items, setItems] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const schemaRes = await api.adminSchema();
        const collections = (schemaRes.data?.collections || []).filter((c) => isDadosCollection(c.name));

        const withCounts = await Promise.all(
          collections.map(async (c) => {
            try {
              const res = await api.listItems(c.name, 'limit=1&meta=filter_count');
              return {
                name: c.name,
                label: collectionLabel(c.name),
                count: res.meta?.filter_count ?? res.meta?.total_count ?? (res.data?.length || 0),
              };
            } catch {
              return { name: c.name, label: collectionLabel(c.name), count: null };
            }
          })
        );

        withCounts.sort((a, b) => a.label.localeCompare(b.label, 'pt-BR'));
        if (!cancelled) setItems(withCounts);
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [api]);

  return (
    <div>
      <h1>Dados</h1>
      <p className="muted">Visualize e edite os registros cadastrados no sistema.</p>
      {error ? <div className="alert alert-error">{error}</div> : null}
      {loading ? <p className="muted">Carregando…</p> : null}
      <div className="grid-2" style={{ marginTop: '1rem' }}>
        {items.map((item) => (
          <Link key={item.name} className="collection-link" to={`/dados/${item.name}`}>
            <strong>{item.label}</strong>
            <div className="muted">
              {item.count == null ? 'Abrir registros' : `${item.count} registro${item.count === 1 ? '' : 's'}`}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

function SettingsIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z"
        stroke="currentColor"
        strokeWidth="1.75"
      />
      <path
        d="M19.4 13a7.8 7.8 0 0 0 .1-2l2-1.2-2-3.4-2.3.6a7.6 7.6 0 0 0-1.7-1L15 3.5h-4l-.5 2.5a7.6 7.6 0 0 0-1.7 1l-2.3-.6-2 3.4 2 1.2a7.8 7.8 0 0 0 0 2l-2 1.2 2 3.4 2.3-.6a7.6 7.6 0 0 0 1.7 1l.5 2.5h4l.5-2.5a7.6 7.6 0 0 0 1.7-1l2.3.6 2-3.4-2-1.2Z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function VisibleFieldsModal({
  open,
  collection,
  schema,
  selected,
  onChange,
  onClose,
  onSave,
  busy,
  error,
}) {
  if (!open) return null;

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="modal-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="visible-fields-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="admin-top" style={{ marginBottom: '0.75rem' }}>
          <div>
            <h2 id="visible-fields-title" style={{ margin: 0 }}>Campos visíveis</h2>
            <p className="muted" style={{ margin: '0.25rem 0 0' }}>
              {collectionLabel(collection)} — desmarque para remover; use o select para adicionar
            </p>
          </div>
          <button type="button" className="btn" onClick={onClose} aria-label="Fechar">×</button>
        </div>
        {error ? <div className="alert alert-error">{error}</div> : null}
        <VisibleFieldsPicker
          schema={schema}
          selected={selected}
          onChange={onChange}
          idPrefix={`modal-${collection}`}
        />
        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', justifyContent: 'flex-end' }}>
          <button type="button" className="btn" onClick={onClose}>Cancelar</button>
          <button type="button" className="btn btn-primary" onClick={onSave} disabled={busy || selected.length === 0}>
            {busy ? 'Salvando…' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  );
}

export function DadosCollectionPage({ api }) {
  const { collection } = useParams();
  const label = collectionLabel(collection);
  const [rows, setRows] = useState([]);
  const [schema, setSchema] = useState(null);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [total, setTotal] = useState(null);
  const [visibleCols, setVisibleCols] = useState(['id']);
  const [configItem, setConfigItem] = useState(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [draftCols, setDraftCols] = useState([]);
  const [settingsBusy, setSettingsBusy] = useState(false);
  const [settingsError, setSettingsError] = useState('');
  const [sort, setSort] = useState(null);
  const [dragFrom, setDragFrom] = useState(null);
  const [loading, setLoading] = useState(true);
  const skipHeaderClickRef = useRef(false);
  const allowed = isDadosCollection(collection);

  useEffect(() => {
    if (!allowed) return undefined;
    setSort(loadSort(collection));
    setLoading(true);
    setRows([]);
    setTotal(null);
    setError('');
  }, [collection, allowed]);

  useEffect(() => {
    if (!allowed) return undefined;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const schemaRes = await api.adminSchema();
        const col = (schemaRes.data?.collections || []).find((c) => c.name === collection);
        if (!cancelled) setSchema(col || null);

        const loaded = await loadVisibleFields(api, collection, col);
        if (!cancelled) {
          const ordered = applyColumnOrder(loaded.fields, loadColumnOrder(collection));
          setVisibleCols(ordered);
          setConfigItem(loaded.configItem);
        }

        const qs = new URLSearchParams({ limit: '50', meta: 'filter_count' });
        if (search) qs.set('search', search);
        const res = await api.listItems(collection, qs.toString());
        if (!cancelled) {
          setRows(res.data || []);
          setTotal(res.meta?.filter_count ?? res.meta?.total_count ?? null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message);
          setRows([]);
          setTotal(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [api, collection, search, allowed]);

  const previewCols = useMemo(() => {
    if (!schema) return visibleCols.length ? visibleCols : ['id'];
    const allowedSet = new Set(availableFields(schema));
    const cols = visibleCols.filter((c) => allowedSet.has(c));
    return cols.length ? cols : defaultVisibleFields(schema);
  }, [schema, visibleCols]);

  const displayRows = useMemo(() => sortRows(rows, sort), [rows, sort]);

  if (!allowed) {
    return <Navigate to="/dados" replace />;
  }

  function openSettings() {
    setDraftCols(previewCols);
    setSettingsError('');
    setSettingsOpen(true);
  }

  async function saveSettings() {
    setSettingsBusy(true);
    setSettingsError('');
    try {
      const res = await saveVisibleFields(api, collection, draftCols, configItem);
      const item = res.data || configItem;
      setConfigItem(item);
      const ordered = applyColumnOrder(draftCols, loadColumnOrder(collection));
      setVisibleCols(ordered);
      saveColumnOrder(collection, ordered);
      setSettingsOpen(false);
    } catch (err) {
      setSettingsError(err.message || 'Falha ao salvar');
    } finally {
      setSettingsBusy(false);
    }
  }

  function reorderColumns(fromField, toField) {
    if (!fromField || !toField || fromField === toField) return;
    const next = [...previewCols];
    const fromIdx = next.indexOf(fromField);
    const toIdx = next.indexOf(toField);
    if (fromIdx < 0 || toIdx < 0) return;
    next.splice(fromIdx, 1);
    next.splice(toIdx, 0, fromField);
    setVisibleCols(next);
    saveColumnOrder(collection, next);
  }

  function onHeaderClick(field) {
    const next = nextSortState(sort, field);
    setSort(next);
    saveSort(collection, next);
  }

  return (
    <div>
      <div className="admin-top">
        <div>
          <h1>{label}</h1>
          <p className="muted">
            <Link to="/dados">← Dados</Link>
            {!loading && total != null ? ` · ${total} registro${total === 1 ? '' : 's'}` : null}
          </p>
        </div>
        {!loading ? (
          <Link className="btn btn-primary" to={`/dados/${collection}/novo`}>Novo registro</Link>
        ) : null}
      </div>

      {loading ? (
        <div className="page-loader" role="status" aria-live="polite" aria-busy="true">
          <div className="spinner" aria-hidden="true" />
          <p className="muted">Carregando registros…</p>
        </div>
      ) : (
        <>
          <div className="table-toolbar">
            <div className="field" style={{ maxWidth: 320, marginBottom: 0 }}>
              <label htmlFor="search">Busca</label>
              <input id="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar registros…" />
            </div>
            <button
              type="button"
              className="btn btn-icon"
              onClick={openSettings}
              title="Configurar campos visíveis"
              aria-label="Configurar campos visíveis"
            >
              <SettingsIcon />
            </button>
          </div>
          {error ? <div className="alert alert-error">{error}</div> : null}
          <div className="card table-wrap">
            <table className="data">
              <thead>
                <tr>
                  {previewCols.map((c) => {
                    const active = sort?.field === c;
                    const ariaSort = active ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none';
                    return (
                      <th
                        key={c}
                        className={`th-interactive${active ? ' th-sorted' : ''}${dragFrom === c ? ' th-dragging' : ''}`}
                        draggable
                        aria-sort={ariaSort}
                        onDragStart={(e) => {
                          skipHeaderClickRef.current = false;
                          setDragFrom(c);
                          e.dataTransfer.effectAllowed = 'move';
                          e.dataTransfer.setData('text/plain', c);
                        }}
                        onDragOver={(e) => {
                          e.preventDefault();
                          e.dataTransfer.dropEffect = 'move';
                          skipHeaderClickRef.current = true;
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          skipHeaderClickRef.current = true;
                          const from = e.dataTransfer.getData('text/plain') || dragFrom;
                          reorderColumns(from, c);
                          setDragFrom(null);
                        }}
                        onDragEnd={() => {
                          setDragFrom(null);
                          window.setTimeout(() => {
                            skipHeaderClickRef.current = false;
                          }, 50);
                        }}
                        onClick={() => {
                          if (skipHeaderClickRef.current) return;
                          onHeaderClick(c);
                        }}
                        title="Arraste para reordenar · clique para ordenar"
                      >
                        <span className="th-label">{fieldLabel(c)}</span>
                        <span className="th-sort" aria-hidden="true">
                          {active ? (sort.dir === 'asc' ? ' ↑' : ' ↓') : ''}
                        </span>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {displayRows.length === 0 ? (
                  <tr>
                    <td colSpan={Math.max(previewCols.length, 1)} className="muted">Nenhum registro encontrado.</td>
                  </tr>
                ) : (
                  displayRows.map((row) => (
                    <tr key={row.id ?? JSON.stringify(row)}>
                      {previewCols.map((c) => (
                        <td key={c}>
                          {c === (schema?.pk?.name || 'id') || c === 'id' ? (
                            <Link to={`/dados/${collection}/${row.id}`}>{String(row[c] ?? '')}</Link>
                          ) : (
                            <span className="mono">{formatCell(row[c])}</span>
                          )}
                        </td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      <VisibleFieldsModal
        open={settingsOpen}
        collection={collection}
        schema={schema}
        selected={draftCols}
        onChange={setDraftCols}
        onClose={() => setSettingsOpen(false)}
        onSave={saveSettings}
        busy={settingsBusy}
        error={settingsError}
      />
    </div>
  );
}

function formatCell(value) {
  if (value == null) return '—';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

export function DadosItemPage({ api, isNew = false }) {
  const { collection, id } = useParams();
  const label = collectionLabel(collection);
  const navigate = useNavigate();
  const [schema, setSchema] = useState(null);
  const [form, setForm] = useState({});
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const allowed = isDadosCollection(collection);

  useEffect(() => {
    if (!allowed) return undefined;
    let cancelled = false;
    (async () => {
      try {
        const schemaRes = await api.adminSchema();
        const col = (schemaRes.data?.collections || []).find((c) => c.name === collection);
        if (!cancelled) setSchema(col || null);
        if (!isNew && id) {
          const res = await api.getItem(collection, id);
          if (!cancelled) setForm(res.data || {});
        }
      } catch (err) {
        if (!cancelled) setError(err.message);
      }
    })();
    return () => { cancelled = true; };
  }, [api, collection, id, isNew, allowed]);

  const editableCols = useMemo(() => {
    if (!schema) return [];
    const readonly = new Set(schema.readonly || []);
    const sensitive = new Set(schema.sensitive || []);
    return (schema.columns || []).filter((c) => !readonly.has(c) && !sensitive.has(c));
  }, [schema]);

  const relations = schema?.relations || [];

  if (!allowed) {
    return <Navigate to="/dados" replace />;
  }

  async function onSubmit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const body = {};
      for (const col of editableCols) {
        if (form[col] !== undefined) body[col] = form[col] === '' ? null : form[col];
      }
      if (isNew) {
        const res = await api.createItem(collection, body);
        navigate(`/dados/${collection}/${res.data.id}`);
        return;
      }
      await api.updateItem(collection, id, body);
      setMessage('Salvo.');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function onDelete() {
    if (!window.confirm('Excluir este registro?')) return;
    setBusy(true);
    try {
      await api.deleteItem(collection, id);
      navigate(`/dados/${collection}`);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="admin-top">
        <div>
          <h1>{isNew ? `Novo registro · ${label}` : `${label} #${id}`}</h1>
          <p className="muted"><Link to={`/dados/${collection}`}>← {label}</Link></p>
        </div>
      </div>
      {error ? <div className="alert alert-error" role="alert">{error}</div> : null}
      {message ? <div className="alert alert-info">{message}</div> : null}

      {relations.length ? (
        <div className="card" style={{ marginBottom: '1rem' }}>
          <strong>Relacionados</strong>
          <ul>
            {relations.map((rel) => {
              const val = form[rel.field];
              if (!isDadosCollection(rel.collection)) {
                return (
                  <li key={rel.field}>
                    <span>{fieldLabel(rel.field)}</span>
                    {': '}
                    <span className="muted">{val != null && val !== '' ? String(val) : 'vazio'}</span>
                  </li>
                );
              }
              return (
                <li key={rel.field}>
                  <span>{fieldLabel(rel.field)}</span>
                  {' → '}
                  {val != null && val !== '' ? (
                    <Link to={`/dados/${rel.collection}/${val}`}>
                      {collectionLabel(rel.collection)} / {String(val)}
                    </Link>
                  ) : (
                    <span className="muted">vazio</span>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}

      <form className="card" onSubmit={onSubmit}>
        {editableCols.map((col) => (
          <div className="field" key={col}>
            <label htmlFor={`f-${col}`}>{fieldLabel(col)}</label>
            <input
              id={`f-${col}`}
              value={form[col] == null ? '' : typeof form[col] === 'object' ? JSON.stringify(form[col]) : String(form[col])}
              onChange={(e) => setForm({ ...form, [col]: e.target.value })}
            />
          </div>
        ))}
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn btn-primary" type="submit" disabled={busy}>{busy ? 'Salvando…' : 'Salvar'}</button>
          {!isNew ? (
            <button className="btn btn-danger" type="button" onClick={onDelete} disabled={busy}>Excluir</button>
          ) : null}
        </div>
      </form>
    </div>
  );
}
