import React, { useCallback, useEffect, useRef, useState } from 'react';
import { DRIVER_LABELS } from '../lib/storageConfig.js';
import { AdminLoader } from '../components/AdminLoader.jsx';
import { StorageCredentialsGuide } from '../components/StorageCredentialsGuide.jsx';

const FIELD_LABELS = {
  access_key_id: 'Access Key ID',
  secret_access_key: 'Secret Access Key',
};

function emptyForm(status) {
  return {
    driver: status?.driver === 'local' ? 's3' : status?.driver || 's3',
    key_prefix: status?.key_prefix || 'kunk/',
    s3: {
      bucket: status?.s3?.bucket || '',
      region: status?.s3?.region || 'us-east-1',
    },
    gcs: {
      bucket: status?.gcs?.bucket || '',
      project_id: status?.gcs?.project_id || '',
    },
    credentials: {
      storage_s3: {
        access_key_id: '',
        secret_access_key: '',
      },
      storage_gcs: {
        client_email: '',
        private_key: '',
      },
    },
  };
}

function findCred(status, service, fieldKey) {
  const list = status?.credentials?.[service] || [];
  return list.find((c) => c.field_key === fieldKey) || {
    field_key: fieldKey,
    is_secret: true,
    has_value: false,
    value: null,
    description: FIELD_LABELS[fieldKey] || fieldKey,
  };
}

function parseServiceAccountJson(text) {
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('Arquivo JSON inválido');
  }
  if (!parsed || typeof parsed !== 'object') {
    throw new Error('JSON da service account inválido');
  }
  const clientEmail = String(parsed.client_email || '').trim();
  const privateKey = String(parsed.private_key || '').trim();
  if (!clientEmail || !privateKey) {
    throw new Error('JSON incompleto: precisa de client_email e private_key');
  }
  return {
    client_email: clientEmail,
    private_key: privateKey,
    project_id: String(parsed.project_id || '').trim(),
  };
}

function StorageCredentialField({
  cred,
  value,
  editing,
  disabled,
  onChange,
  onStartEdit,
  onCancelEdit,
}) {
  const label = FIELD_LABELS[cred.field_key] || cred.description || cred.field_key;
  const showDisplay = cred.has_value && !editing;

  return (
    <div className="field" style={{ marginBottom: 14 }}>
      <label htmlFor={`storage-cred-${cred.field_key}`}>{label}</label>
      {showDisplay ? (
        <div className="cred-value-row" data-testid={`storage-cred-display-${cred.field_key}`}>
          <span className="cred-value-text">
            {cred.is_secret ? '••••••••' : cred.value || '—'}
          </span>
          <button
            type="button"
            className="cred-edit-link"
            disabled={disabled}
            data-testid={`storage-cred-edit-${cred.field_key}`}
            onClick={onStartEdit}
          >
            editar
          </button>
        </div>
      ) : (
        <div>
          <input
            id={`storage-cred-${cred.field_key}`}
            className="input"
            type={cred.is_secret ? 'password' : 'text'}
            autoComplete="off"
            disabled={disabled}
            placeholder={cred.has_value ? 'Nova chave' : ''}
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
          />
          {cred.has_value ? (
            <button
              type="button"
              className="cred-edit-link"
              style={{ marginTop: 6 }}
              disabled={disabled}
              onClick={onCancelEdit}
            >
              cancelar
            </button>
          ) : null}
        </div>
      )}
    </div>
  );
}

export function StoragePage({ api }) {
  const [status, setStatus] = useState(null);
  const [form, setForm] = useState(null);
  const [editing, setEditing] = useState({});
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [testBusy, setTestBusy] = useState(false);
  const [activateBusy, setActivateBusy] = useState(false);
  const [activateMessage, setActivateMessage] = useState('');
  const [gcsUploading, setGcsUploading] = useState(false);
  const [replaceGcsFile, setReplaceGcsFile] = useState(false);
  const gcsFileRef = useRef(null);

  const reload = useCallback(async () => {
    const res = await api.getStorageStatus();
    setStatus(res.data);
    setForm((prev) => prev || emptyForm(res.data));
    return res.data;
  }, [api]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await reload();
        if (!cancelled) {
          setForm(emptyForm(data));
          setEditing({});
          setReplaceGcsFile(false);
        }
      } catch (err) {
        if (!cancelled) setError(err.message);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [reload]);

  function updateForm(patch) {
    setForm((prev) => ({ ...prev, ...patch }));
  }

  function setCredValue(service, fieldKey, value) {
    setForm((prev) => ({
      ...prev,
      credentials: {
        ...prev.credentials,
        [service]: {
          ...prev.credentials[service],
          [fieldKey]: value,
        },
      },
    }));
  }

  function startEdit(fieldKey) {
    setEditing((prev) => ({ ...prev, [fieldKey]: true }));
  }

  function cancelEdit(service, fieldKey) {
    setEditing((prev) => {
      const next = { ...prev };
      delete next[fieldKey];
      return next;
    });
    setCredValue(service, fieldKey, '');
  }

  function pickCredentialFields(service, fieldKeys, sourceForm = form, sourceEditing = editing) {
    const out = {};
    for (const key of fieldKeys) {
      const cred = findCred(status, service, key);
      const isEditing = Boolean(sourceEditing[key]);
      if (!cred.has_value || isEditing) {
        const v = sourceForm.credentials[service]?.[key];
        if (v != null && String(v).trim() !== '') {
          out[key] = v;
        }
      }
    }
    return out;
  }

  function buildPayload(overrides = {}) {
    const nextForm = overrides.form || form;
    const nextEditing = overrides.editing || editing;
    const driver = nextForm.driver;
    const payload = {
      driver,
      key_prefix: nextForm.key_prefix,
      s3: nextForm.s3,
      gcs: nextForm.gcs,
      credentials: {},
    };
    if (driver === 's3') {
      payload.credentials.storage_s3 = pickCredentialFields(
        'storage_s3',
        ['access_key_id', 'secret_access_key'],
        nextForm,
        nextEditing
      );
    } else if (driver === 'gcs') {
      // Sempre envia o par extraído do JSON quando presente (upload) ou campos em edição
      const gcsCreds = {};
      const email = nextForm.credentials.storage_gcs?.client_email;
      const key = nextForm.credentials.storage_gcs?.private_key;
      if (email && String(email).trim()) gcsCreds.client_email = email;
      if (key && String(key).trim()) gcsCreds.private_key = key;
      payload.credentials.storage_gcs = gcsCreds;
    }
    return payload;
  }

  function applySavedStatus(nextStatus, keepDriver) {
    setStatus(nextStatus);
    setForm({
      ...emptyForm(nextStatus),
      driver: keepDriver || nextStatus.driver || 's3',
    });
    setEditing({});
    setReplaceGcsFile(false);
  }

  async function runTestAndSave(payload, keepDriver) {
    setTestBusy(true);
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const res = await api.testStorage(payload);
      if (res.data?.status) {
        applySavedStatus(res.data.status, keepDriver || payload.driver);
      } else {
        await reload();
        setEditing({});
        setReplaceGcsFile(false);
      }
      setMessage(res.data?.message || 'Teste OK — credenciais salvas');
      return true;
    } catch (err) {
      setError(err.message);
      return false;
    } finally {
      setTestBusy(false);
      setBusy(false);
    }
  }

  async function onTest() {
    await runTestAndSave(buildPayload(), form.driver);
  }

  function ensureGcsBucketFilled() {
    if (form.gcs.bucket?.trim()) return true;
    setError('Informe o nome do bucket antes de enviar a service account');
    setMessage('');
    return false;
  }

  function onGcsFileClick(e) {
    if (!ensureGcsBucketFilled()) {
      e.preventDefault();
      e.stopPropagation();
    }
  }

  function openGcsFilePicker() {
    setError('');
    if (!ensureGcsBucketFilled()) return;
    gcsFileRef.current?.click();
  }

  async function onGcsJsonFile(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setError('');
    setMessage('');

    if (!ensureGcsBucketFilled()) return;

    setGcsUploading(true);
    try {
      const text = await file.text();
      const extracted = parseServiceAccountJson(text);
      const nextForm = {
        ...form,
        driver: 'gcs',
        gcs: {
          ...form.gcs,
          project_id: extracted.project_id || form.gcs.project_id || '',
        },
        credentials: {
          ...form.credentials,
          storage_gcs: {
            client_email: extracted.client_email,
            private_key: extracted.private_key,
          },
        },
      };
      setForm(nextForm);
      setMessage(`Arquivo lido (${file.name}). Testando conexão…`);
      setGcsUploading(false);

      const payload = buildPayload({
        form: nextForm,
        editing: { client_email: true, private_key: true },
      });
      await runTestAndSave(payload, 'gcs');
    } catch (err) {
      setError(err.message || 'Falha ao processar o arquivo');
      setGcsUploading(false);
    }
  }

  async function onActivate() {
    setActivateBusy(true);
    setBusy(true);
    setError('');
    setMessage('');
    setActivateMessage('Ativando bucket…');
    try {
      const res = await api.activateStorage(buildPayload());
      applySavedStatus(res.data, res.data?.driver);
      setMessage(res.data?.message || 'Bucket ativado');
    } catch (err) {
      setError(err.message);
    } finally {
      setActivateBusy(false);
      setActivateMessage('');
      setBusy(false);
    }
  }

  if (!status || !form) {
    return <AdminLoader label="Carregando armazenamento…" />;
  }

  const readOnlyProvider = status.is_cloud && !status.can_change_provider;
  const gcsHasCreds = Boolean(status.gcs?.has_credentials);
  const showGcsUpload = !gcsHasCreds || replaceGcsFile;

  const s3Fields = [
    { key: 'access_key_id' },
    { key: 'secret_access_key' },
  ];

  return (
    <div>
      <h1>Armazenamento</h1>
      <p className="muted">
        Configure o bucket de arquivos (Amazon S3 ou Google Cloud Storage). O download continua via
        {' '}
        <span className="mono">/api/v1/files/:id/download</span>
        {' '}
        — o bucket fica privado e a API acessa com as credenciais.
      </p>

      <div className="card" style={{ marginBottom: '1rem' }}>
        <h2>Status</h2>
        <p>
          <strong>Driver ativo:</strong>
          {' '}
          {DRIVER_LABELS[status.driver] || status.driver}
          {' '}
          <span className="muted">({status.driver_source})</span>
        </p>
        <p>
          <strong>Travado:</strong>
          {' '}
          {status.locked ? 'Sim' : 'Não'}
        </p>
        <p>
          <strong>Arquivos no bucket:</strong>
          {' '}
          {status.cloud_files_count}
          {' · '}
          <strong>Ainda locais:</strong>
          {' '}
          {status.local_files_pending}
        </p>
        {status.cloud_files_count > 0 ? (
          <p className="alert alert-info" style={{ marginTop: '0.75rem' }}>
            Já existem arquivos neste bucket. Você pode alterar o nome do bucket do mesmo provedor
            (S3 ou GCS). Trocar de provedor só é permitido se não houver arquivos na nuvem.
          </p>
        ) : null}
      </div>

      <div className="card" style={{ marginBottom: '1rem' }}>
        <h2>Configuração</h2>
        <div className="field" style={{ marginBottom: '0.75rem' }}>
          <label htmlFor="storage-driver">Provedor</label>
          <select
            id="storage-driver"
            value={form.driver}
            disabled={readOnlyProvider || busy}
            onChange={(e) => updateForm({ driver: e.target.value })}
          >
            {!status.is_cloud ? <option value="local">Disco local (padrão)</option> : null}
            <option value="s3">Amazon S3</option>
            <option value="gcs">Google Cloud Storage</option>
          </select>
        </div>

        {form.driver === 's3' || form.driver === 'gcs' ? (
          <StorageCredentialsGuide provider={form.driver} />
        ) : null}

        <div className="field" style={{ marginBottom: '0.75rem' }}>
          <label htmlFor="key-prefix">Prefixo das keys</label>
          <input
            id="key-prefix"
            className="mono"
            value={form.key_prefix}
            disabled={busy}
            onChange={(e) => updateForm({ key_prefix: e.target.value })}
          />
        </div>

        {form.driver === 's3' ? (
          <div className="config-accordion" style={{ gap: '0.75rem' }}>
            <div className="field">
              <label htmlFor="s3-bucket">Bucket</label>
              <input
                id="s3-bucket"
                value={form.s3.bucket}
                disabled={busy}
                onChange={(e) => updateForm({ s3: { ...form.s3, bucket: e.target.value } })}
              />
            </div>
            <div className="field">
              <label htmlFor="s3-region">Região</label>
              <input
                id="s3-region"
                value={form.s3.region}
                disabled={busy}
                onChange={(e) => updateForm({ s3: { ...form.s3, region: e.target.value } })}
              />
            </div>
            {s3Fields.map(({ key }) => {
              const cred = findCred(status, 'storage_s3', key);
              return (
                <StorageCredentialField
                  key={key}
                  cred={cred}
                  value={form.credentials.storage_s3[key]}
                  editing={Boolean(editing[key])}
                  disabled={busy}
                  onChange={(v) => setCredValue('storage_s3', key, v)}
                  onStartEdit={() => {
                    startEdit(key);
                    setCredValue('storage_s3', key, '');
                  }}
                  onCancelEdit={() => cancelEdit('storage_s3', key)}
                />
              );
            })}
          </div>
        ) : null}

        {form.driver === 'gcs' ? (
          <div className="config-accordion" style={{ gap: '0.75rem' }}>
            <div className="field">
              <label htmlFor="gcs-bucket">Bucket</label>
              <input
                id="gcs-bucket"
                value={form.gcs.bucket}
                disabled={busy}
                onChange={(e) => updateForm({ gcs: { ...form.gcs, bucket: e.target.value } })}
              />
            </div>

            <div className="field" style={{ marginBottom: 14 }}>
              <label htmlFor="gcs-sa-file">Service account (JSON)</label>
              {gcsHasCreds && !replaceGcsFile ? (
                <div className="cred-value-row">
                  <span className="cred-value-text">••••••••</span>
                  <button
                    type="button"
                    className="cred-edit-link"
                    disabled={busy}
                    onClick={() => setReplaceGcsFile(true)}
                  >
                    editar
                  </button>
                </div>
              ) : (
                <div>
                  <input
                    ref={gcsFileRef}
                    id="gcs-sa-file"
                    type="file"
                    accept="application/json,.json"
                    disabled={busy || gcsUploading}
                    style={{ display: 'none' }}
                    onClick={onGcsFileClick}
                    onChange={onGcsJsonFile}
                  />
                  <button
                    type="button"
                    className="btn"
                    disabled={busy || gcsUploading}
                    onClick={openGcsFilePicker}
                  >
                    {gcsUploading ? 'Enviando…' : 'Enviar arquivo JSON'}
                  </button>
                  <p className="muted" style={{ margin: '0.35rem 0 0', fontSize: '0.8rem' }}>
                    Preencha o bucket antes. O arquivo não é armazenado — extraímos client_email,
                    private_key e project_id, testamos e só então salvamos as credenciais.
                  </p>
                  {gcsHasCreds ? (
                    <button
                      type="button"
                      className="cred-edit-link"
                      style={{ marginTop: 6 }}
                      disabled={busy}
                      onClick={() => setReplaceGcsFile(false)}
                    >
                      cancelar
                    </button>
                  ) : null}
                </div>
              )}
            </div>
          </div>
        ) : null}

        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '1rem', alignItems: 'center' }}>
          {form.driver !== 'local' ? (
            <>
              <button type="button" className="btn" disabled={busy || gcsUploading} onClick={onTest}>
                {testBusy ? (
                  <>
                    <span className="spinner spinner-inline" aria-hidden="true" />
                    Testando…
                  </>
                ) : (
                  'Testar e salvar'
                )}
              </button>
              <button type="button" className="btn btn-primary" disabled={busy || gcsUploading} onClick={onActivate}>
                  {activateBusy ? (
                    <>
                      <span className="spinner spinner-inline" aria-hidden="true" />
                      Ativando…
                    </>
                  ) : (
                    'Ativar bucket'
                  )}
                </button>
              {activateBusy && activateMessage ? (
                <span className="muted" style={{ display: 'inline-flex', alignItems: 'center' }}>
                  {activateMessage}
                </span>
              ) : null}
              {form.driver === 'gcs' && gcsUploading ? (
                <span className="muted" style={{ display: 'inline-flex', alignItems: 'center' }}>
                  <span className="spinner spinner-inline" aria-hidden="true" />
                  Lendo arquivo…
                </span>
              ) : null}
              {form.driver === 'gcs' && !gcsHasCreds ? (
                <p className="muted" style={{ margin: 0 }}>
                  Informe o bucket e envie o JSON da service account (ou use Testar e salvar após o upload).
                </p>
              ) : null}
            </>
          ) : (
            <p className="muted">Selecione S3 ou GCS para configurar o armazenamento em nuvem.</p>
          )}
        </div>
      </div>

      {error ? (
        <div className="alert alert-error" style={{ marginTop: '1rem' }}>
          {error}
        </div>
      ) : null}
      {message ? (
        <div className="alert alert-info" style={{ marginTop: '1rem' }}>
          {message}
        </div>
      ) : null}
    </div>
  );
}
