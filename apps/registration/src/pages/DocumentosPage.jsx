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

export function DocumentosPage({ api }) {
  const { user, refresh } = useAssociateAuth();
  const phase = Number(user?.associate_status) || 1;
  const [status, setStatus] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const res = await api.documentsStatus();
    setStatus(res.data);
  }, [api]);

  useEffect(() => {
    if (phase === 3) load().catch((err) => setError(err.message));
  }, [phase, load]);

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

  if (phase === 4) {
    return (
      <div>
        <h1 className="h3 mb-3">Assinatura do termo</h1>
        <div className="alert alert-warning">
          <strong>Módulo de assinatura de termos em desenvolvimento.</strong>
          <p className="mb-0 mt-2">
            Seus documentos foram recebidos. Em breve você poderá assinar o termo de adesão por aqui.
          </p>
        </div>
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
