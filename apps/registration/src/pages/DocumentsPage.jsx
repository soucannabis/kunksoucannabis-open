import React, { useCallback, useEffect, useState } from 'react';
import { useAssociateAuth } from '@kunk/auth-session';
import { AlertError, UploadLabel } from '@kunk/ui';

function SubjectDocs({ api, subject, label, status, onUploaded }) {
  const [docType, setDocType] = useState('rg');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  async function upload(side, file) {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('doc_type', docType);
      fd.append('side', side);
      fd.append('subject', subject);
      fd.append('doc_kind', 'identity');
      await api.uploadFile(fd);
      await onUploaded();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  const mode = status?.mode;
  const complete = status?.complete;

  return (
    <div className="mb-4 p-3" style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 8 }}>
      <h2 className="h5 text-white">{label}</h2>
      <AlertError message={error} />
      {complete ? (
        <p className="text-success">Documentos OK ({mode}).</p>
      ) : (
        <>
          <div className="mb-3">
            <button type="button" className={`btn btn-outline-light me-2 ${docType === 'rg' ? 'active' : ''}`} onClick={() => setDocType('rg')}>
              RG (frente e verso)
            </button>
            <button type="button" className={`btn btn-outline-light ${docType === 'cnh' ? 'active' : ''}`} onClick={() => setDocType('cnh')}>
              CNH (frente)
            </button>
          </div>
          <div className="d-flex flex-wrap gap-3">
            <div>
              <UploadLabel htmlFor={`${subject}-front`}>Enviar frente</UploadLabel>
              <input
                id={`${subject}-front`}
                type="file"
                accept="image/*,.pdf"
                className="d-none"
                disabled={busy}
                onChange={(e) => upload('front', e.target.files?.[0])}
              />
            </div>
            {docType === 'rg' && (
              <div>
                <UploadLabel htmlFor={`${subject}-back`}>Enviar verso</UploadLabel>
                <input
                  id={`${subject}-back`}
                  type="file"
                  accept="image/*,.pdf"
                  className="d-none"
                  disabled={busy}
                  onChange={(e) => upload('back', e.target.files?.[0])}
                />
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function docSignOrigin() {
  return import.meta.env.VITE_DOC_SIGN_URL || 'http://localhost:4258';
}

export function DocumentsPage({ api }) {
  const { user, refresh } = useAssociateAuth();
  const phase = Number(user?.associate_status) || 1;
  const [status, setStatus] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [signingUrl, setSigningUrl] = useState(null);

  const load = useCallback(async () => {
    const res = await api.documentsStatus();
    setStatus(res.data);
  }, [api]);

  useEffect(() => {
    if (phase === 3) load().catch((err) => setError(err.message));
  }, [phase, load]);

  useEffect(() => {
    if (phase !== 4) return undefined;
    let cancelled = false;
    (async () => {
      setBusy(true);
      setError(null);
      try {
        const res = await api.post('/doc-sign/contracts', {});
        if (!cancelled) setSigningUrl(res.data?.signing_url || null);
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setBusy(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [phase, api]);

  async function advanceToTerms() {
    setBusy(true);
    setError(null);
    try {
      await api.advance();
      await refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  function openSigning() {
    if (!signingUrl) return;
    const returnUrl = encodeURIComponent(`${window.location.origin}/consulta?signed=1`);
    const url = `${signingUrl}${signingUrl.includes('?') ? '&' : '?'}return_url=${returnUrl}`;
    window.location.assign(url);
  }

  if (phase === 4) {
    return (
      <div>
        <h1 className="h3 mb-3">Assinatura do termo</h1>
        <AlertError message={error} />
        <p className="text-white-50 mb-3">
          Seus documentos foram recebidos. Assine o termo de adesão para continuar o cadastro.
        </p>
        <button type="button" className="btn btn-success" disabled={busy || !signingUrl} onClick={openSigning}>
          {busy && !signingUrl ? 'Preparando termo…' : 'Assinar termo'}
        </button>
        <p className="small text-white-50 mt-3 mb-0">
          Você será redirecionado para {docSignOrigin()}
        </p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="h3 mb-3">Documentos de identidade</h1>
      <AlertError message={error} />
      <SubjectDocs
        api={api}
        subject="responsible"
        label="Responsável"
        status={status?.responsible}
        onUploaded={load}
      />
      {user?.responsible_type === 'another' && (
        <SubjectDocs
          api={api}
          subject="patient"
          label="Paciente"
          status={status?.patient}
          onUploaded={load}
        />
      )}
      {status?.complete && (
        <button type="button" className="btn btn-success" disabled={busy} onClick={advanceToTerms}>
          Avançar para assinatura
        </button>
      )}
    </div>
  );
}
