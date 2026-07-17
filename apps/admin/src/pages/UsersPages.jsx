import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

function parsePerms(value) {
  if (Array.isArray(value)) return value;
  try {
    const p = JSON.parse(value);
    return Array.isArray(p) ? p : [];
  } catch {
    return [];
  }
}

export function UsuariosPage({ api }) {
  const [rows, setRows] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await api.listSystemUsers();
        if (!cancelled) setRows(res.data || []);
      } catch (err) {
        if (!cancelled) setError(err.message);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [api]);

  return (
    <div>
      <div className="admin-top">
        <div>
          <h1>Usuários</h1>
          <p className="muted">Operadores (`system_users`) — cadastro por convite por e-mail.</p>
        </div>
        <Link className="btn btn-primary" to="/usuarios/novo">
          Convidar operador
        </Link>
        <Link className="btn" to="/usuarios/paginas">
          Páginas por role
        </Link>
      </div>
      {error ? <div className="alert alert-error">{error}</div> : null}
      <div className="card table-wrap">
        <table className="data">
          <thead>
            <tr>
              <th>ID</th>
              <th>Nome</th>
              <th>E-mail</th>
              <th>Status</th>
              <th>Roles</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td>
                  <Link to={`/usuarios/${row.id}`}>{row.id}</Link>
                </td>
                <td>{[row.name, row.last_name].filter(Boolean).join(' ')}</td>
                <td>{row.email}</td>
                <td>{row.status || '—'}</td>
                <td className="mono">{parsePerms(row.permissions).join(', ')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function UsuarioFormPage({ api, isNew = false }) {
  const id = !isNew ? window.location.pathname.split('/').pop() : null;
  const [rolesCatalog, setRolesCatalog] = useState([]);
  const [form, setForm] = useState({
    name: '',
    last_name: '',
    email: '',
    password: '',
    status: isNew ? 'pending' : 'active',
    permissions: [],
    internal_code: '',
  });
  const [inviteInfo, setInviteInfo] = useState(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const rolesRes = await api.adminRoles();
        if (!cancelled) setRolesCatalog(rolesRes.data || []);
        if (!isNew && id) {
          const res = await api.getSystemUser(id);
          const u = res.data || {};
          if (!cancelled) {
            setForm({
              name: u.name || '',
              last_name: u.last_name || '',
              email: u.email || '',
              password: '',
              status: u.status || 'active',
              permissions: parsePerms(u.permissions),
              internal_code: u.internal_code || '',
            });
          }
        }
      } catch (err) {
        if (!cancelled) setError(err.message);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [api, id, isNew]);

  function toggleRole(roleId) {
    setForm((prev) => {
      const set = new Set(prev.permissions);
      if (set.has(roleId)) set.delete(roleId);
      else set.add(roleId);
      return { ...prev, permissions: [...set] };
    });
  }

  async function onSubmit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    setMessage('');
    setInviteInfo(null);
    try {
      if (isNew) {
        if (!form.permissions.length) {
          throw new Error('Selecione ao menos uma permissão');
        }
        const res = await api.createSystemUser({
          name: form.name,
          last_name: form.last_name,
          email: form.email,
          permissions: form.permissions,
          internal_code: form.internal_code || undefined,
        });
        const data = res.data || {};
        setInviteInfo({
          invite_url: data.invite_url,
          email_sent: data.email_sent,
          email_status: data.email_status,
          expires_at: data.expires_at,
          userId: data.user?.id || data.system_user_id,
        });
        setMessage(
          data.email_sent
            ? 'Operador criado e convite enviado por e-mail.'
            : 'Operador criado. E-mail não enviado — copie o link do convite.'
        );
        return;
      }
      const body = {
        name: form.name,
        last_name: form.last_name,
        email: form.email,
        status: form.status,
        permissions: form.permissions,
        internal_code: form.internal_code || undefined,
      };
      if (form.password) body.password = form.password;
      await api.updateSystemUser(id, body);
      setMessage('Salvo.');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function onResendInvite() {
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const res = await api.resendSystemUserInvite(id);
      const data = res.data || {};
      setInviteInfo({
        invite_url: data.invite_url,
        email_sent: data.email_sent,
        email_status: data.email_status,
        expires_at: data.expires_at,
        userId: id,
      });
      setMessage(
        data.email_sent
          ? 'Convite reenviado por e-mail.'
          : 'Convite gerado. E-mail não enviado — copie o link.'
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function onDeactivate() {
    if (!window.confirm('Desativar este operador?')) return;
    setBusy(true);
    setError('');
    try {
      await api.updateSystemUser(id, { status: 'inactive' });
      setForm((f) => ({ ...f, status: 'inactive' }));
      setMessage('Desativado.');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function copyInvite() {
    if (!inviteInfo?.invite_url) return;
    try {
      await navigator.clipboard.writeText(inviteInfo.invite_url);
      setMessage('Link do convite copiado.');
    } catch {
      setMessage(inviteInfo.invite_url);
    }
  }

  return (
    <div>
      <div className="admin-top">
        <div>
          <h1>{isNew ? 'Convidar operador' : `Operador #${id}`}</h1>
          <p className="muted">
            <Link to="/usuarios">← Voltar</Link>
          </p>
        </div>
      </div>
      {error ? (
        <div className="alert alert-error" role="alert">
          {error}
        </div>
      ) : null}
      {message ? <div className="alert alert-info">{message}</div> : null}
      {inviteInfo?.invite_url ? (
        <div className="card" style={{ maxWidth: 560, marginBottom: 16 }} data-testid="invite-result">
          <p>
            Status do e-mail: <strong>{inviteInfo.email_status}</strong>
            {inviteInfo.email_sent ? ' (enviado)' : ' (não enviado)'}
          </p>
          <p className="muted" style={{ wordBreak: 'break-all', fontSize: '0.85rem' }}>
            {inviteInfo.invite_url}
          </p>
          <button type="button" className="btn" onClick={copyInvite}>
            Copiar link
          </button>
          {inviteInfo.userId ? (
            <Link className="btn" to={`/usuarios/${inviteInfo.userId}`} style={{ marginLeft: 8 }}>
              Abrir operador
            </Link>
          ) : null}
        </div>
      ) : null}
      <form className="card" onSubmit={onSubmit} style={{ maxWidth: 560 }}>
        <div className="field">
          <label htmlFor="name">Nome</label>
          <input
            id="name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
        </div>
        <div className="field">
          <label htmlFor="last_name">Sobrenome</label>
          <input
            id="last_name"
            value={form.last_name}
            onChange={(e) => setForm({ ...form, last_name: e.target.value })}
          />
        </div>
        <div className="field">
          <label htmlFor="email">E-mail</label>
          <input
            id="email"
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            required
          />
        </div>
        {!isNew ? (
          <div className="field">
            <label htmlFor="password">Nova senha (opcional)</label>
            <input
              id="password"
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              autoComplete="new-password"
            />
          </div>
        ) : (
          <p className="muted" style={{ fontSize: '0.9rem' }}>
            A senha será definida pelo operador ao aceitar o convite enviado por e-mail (link no
            Kunk).
          </p>
        )}
        {!isNew ? (
          <div className="field">
            <label htmlFor="status">Status</label>
            <select
              id="status"
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
            >
              <option value="pending">pending</option>
              <option value="active">active</option>
              <option value="inactive">inactive</option>
            </select>
          </div>
        ) : null}
        <div className="field">
          <label htmlFor="internal_code">Código interno</label>
          <input
            id="internal_code"
            value={form.internal_code}
            onChange={(e) => setForm({ ...form, internal_code: e.target.value })}
          />
        </div>
        <div className="field">
          <label>Permissões</label>
          <div className="chips">
            {rolesCatalog.map((role) => (
              <button
                key={role.id}
                type="button"
                className={`chip ${form.permissions.includes(role.id) ? 'on' : ''}`}
                onClick={() => toggleRole(role.id)}
                title={role.description}
              >
                {role.id}
              </button>
            ))}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button className="btn btn-primary" type="submit" disabled={busy}>
            {busy ? 'Salvando…' : isNew ? 'Criar e enviar convite' : 'Salvar'}
          </button>
          {!isNew ? (
            <>
              <button
                className="btn"
                type="button"
                onClick={onResendInvite}
                disabled={busy}
                data-testid="resend-invite"
              >
                Reenviar convite
              </button>
              <button className="btn btn-danger" type="button" onClick={onDeactivate} disabled={busy}>
                Desativar
              </button>
            </>
          ) : null}
        </div>
      </form>
    </div>
  );
}
