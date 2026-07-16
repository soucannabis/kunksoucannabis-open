import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAssociateAuth } from '@kunk/auth-session';
import { AlertError, UploadLabel } from '@kunk/ui';

export function ConsultationPage({ api }) {
  const { refresh } = useAssociateAuth();
  const navigate = useNavigate();
  const [prescription, setPrescription] = useState('');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('signed') === '1') {
      refresh().catch(() => {});
    }
  }, [refresh]);

  async function uploadExtra(docKind, file) {
    if (!file) return;
    const fd = new FormData();
    fd.append('file', file);
    fd.append('doc_kind', docKind);
    fd.append('subject', 'responsible');
    await api.uploadFile(fd);
  }

  async function finish() {
    setBusy(true);
    setError(null);
    try {
      if (prescription.trim()) {
        await api.patchMe({ prescription: prescription.trim() });
      }
      await api.complete();
      await refresh();
      navigate('/cadastro-concluido');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <h1 className="h3 mb-3">Consulta e documentos extras</h1>
      <p className="text-white-50">Envie receita, laudos ou exames (opcional) e conclua o cadastro.</p>
      <AlertError message={error} />

      <div className="mb-3">
        <label className="form-label">Receita (texto)</label>
        <textarea className="form-control" rows={3} value={prescription} onChange={(e) => setPrescription(e.target.value)} />
      </div>

      <div className="d-flex flex-wrap gap-3 mb-4">
        <div>
          <UploadLabel htmlFor="rx-file">Upload receita</UploadLabel>
          <input id="rx-file" type="file" className="d-none" onChange={(e) => uploadExtra('prescription', e.target.files?.[0]).catch((err) => setError(err.message))} />
        </div>
        <div>
          <UploadLabel htmlFor="report-file">Upload laudo</UploadLabel>
          <input id="report-file" type="file" className="d-none" onChange={(e) => uploadExtra('report', e.target.files?.[0]).catch((err) => setError(err.message))} />
        </div>
        <div>
          <UploadLabel htmlFor="exam-file">Upload exame</UploadLabel>
          <input id="exam-file" type="file" className="d-none" onChange={(e) => uploadExtra('exam', e.target.files?.[0]).catch((err) => setError(err.message))} />
        </div>
      </div>

      <button type="button" className="btn btn-success btn-lg" disabled={busy} onClick={finish}>
        Concluir cadastro
      </button>
    </div>
  );
}

export function RegistrationCompletePage() {
  const { user } = useAssociateAuth();
  return (
    <div className="text-center">
      <h1 className="h2 mb-3">Cadastro concluído</h1>
      <p className="text-white">
        {user?.associate_name || 'Associado'}, seu cadastro foi finalizado com status <strong>Associado</strong>.
      </p>
    </div>
  );
}
