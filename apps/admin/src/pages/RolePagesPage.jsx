import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

/** Page ids aligned with apps/kunk menuConfig (for role_pages). */
export const KUNK_PAGE_OPTIONS = [
  { id: 'associados', label: 'Associados' },
  { id: 'servicos', label: 'Serviços' },
  { id: 'triagem', label: 'Triagem' },
  { id: 'institutional-clients', label: 'Clientes Institucionais' },
  { id: 'pedidos', label: 'Pedidos' },
  { id: 'produtos', label: 'Produtos' },
  { id: 'profissionais', label: 'Profissionais' },
  { id: 'relatorios-servicos', label: 'Relatório de serviços' },
  { id: 'historico', label: 'Histórico do sistema' },
  { id: 'tags', label: 'Tags' },
];

const STAFF_ROLES = ['Administrador', 'Acolhimento', 'Produção', 'Financeiro'];
const ALL_ROLES = [...STAFF_ROLES, 'Profissional'];

function defaultRolePages() {
  return {
    ...Object.fromEntries(STAFF_ROLES.map((r) => [r, ['*']])),
    Profissional: ['relatorios-servicos'],
  };
}

function parseRolePages(raw) {
  if (!raw) return defaultRolePages();
  try {
    const v = typeof raw === 'string' ? JSON.parse(raw) : raw;
    return { ...defaultRolePages(), ...v };
  } catch {
    return defaultRolePages();
  }
}

function isAll(pages) {
  return !pages?.length || pages.includes('*');
}

export function RolePagesPage({ api }) {
  const [configRow, setConfigRow] = useState(null);
  const [rolePages, setRolePages] = useState(defaultRolePages());
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await api.configBySystem('kunk');
        const list = res.data || [];
        const row = list.find((c) => c.key === 'role_pages');
        if (!cancelled) {
          setConfigRow(row || null);
          setRolePages(parseRolePages(row?.value));
        }
      } catch (err) {
        if (!cancelled) setError(err.message || 'Falha ao carregar');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [api]);

  const roles = useMemo(() => Object.keys(rolePages), [rolePages]);

  function toggleAll(role, checked) {
    setRolePages((prev) => ({
      ...prev,
      [role]: checked ? ['*'] : [],
    }));
  }

  function togglePage(role, pageId, checked) {
    setRolePages((prev) => {
      const cur = prev[role] || [];
      if (isAll(cur)) {
        const next = checked
          ? ['*']
          : KUNK_PAGE_OPTIONS.map((p) => p.id).filter((id) => id !== pageId);
        return { ...prev, [role]: next };
      }
      const set = new Set(cur);
      if (checked) set.add(pageId);
      else set.delete(pageId);
      const arr = [...set];
      if (arr.length === KUNK_PAGE_OPTIONS.length) return { ...prev, [role]: ['*'] };
      return { ...prev, [role]: arr };
    });
  }

  async function onSave() {
    setSaving(true);
    setError('');
    setMsg('');
    try {
      const value = JSON.stringify(rolePages);
      if (configRow?.id) {
        await api.updateConfig(configRow.id, { value });
      } else {
        const created = await api.createConfig({
          system: 'kunk',
          key: 'role_pages',
          value,
          value_type: 'json',
          is_sensitive: false,
          description: 'Páginas do menu Kunk por role (* = todas)',
        });
        setConfigRow(created.data);
      }
      setMsg('Páginas por role salvas');
    } catch (err) {
      setError(err.message || 'Falha ao salvar');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="admin-top">
        <div>
          <h1 style={{ margin: 0 }}>Páginas do Kunk por role</h1>
          <p className="muted" style={{ margin: '0.25rem 0 0' }}>
            Default: todas as páginas para todas as roles staff. <Link to="/usuarios">← Usuários</Link>
          </p>
        </div>
        <button type="button" className="btn btn-primary" disabled={saving} onClick={onSave}>
          {saving ? 'Salvando…' : 'Salvar'}
        </button>
      </div>
      {error && <p style={{ color: '#b00020' }}>{error}</p>}
      {msg && <p style={{ color: '#2e7d32' }}>{msg}</p>}

      <div className="card" style={{ padding: '1.25rem', overflowX: 'auto' }}>
        <table className="table">
          <thead>
            <tr>
              <th>Role</th>
              <th>Todas</th>
              {KUNK_PAGE_OPTIONS.map((p) => (
                <th key={p.id}>{p.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {roles.map((role) => {
              const pages = rolePages[role] || [];
              const all = isAll(pages);
              return (
                <tr key={role}>
                  <td>
                    <strong>{role}</strong>
                  </td>
                  <td>
                    <input
                      type="checkbox"
                      checked={all}
                      onChange={(e) => toggleAll(role, e.target.checked)}
                      aria-label={`${role} todas`}
                    />
                  </td>
                  {KUNK_PAGE_OPTIONS.map((p) => (
                    <td key={p.id}>
                      <input
                        type="checkbox"
                        checked={all || pages.includes(p.id)}
                        disabled={all}
                        onChange={(e) => togglePage(role, p.id, e.target.checked)}
                        aria-label={`${role} ${p.id}`}
                      />
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
