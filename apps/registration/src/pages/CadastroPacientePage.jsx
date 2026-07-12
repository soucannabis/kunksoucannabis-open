import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAssociateAuth } from '@kunk/auth-session';
import { Ciap2Select, CpfInput, GenderSelect } from '@kunk/forms';
import { AlertError } from '@kunk/ui';

const EMPTY = {
  associate_name: '',
  associate_last_name: '',
  associate_birth_date: '',
  gender: '',
  nationality: 'Brasileira',
  associate_cpf: '',
  associate_rg: '',
  associate_rg_issuer: '',
  reason_treatment_text: '',
  ciap_codes: [],
};

export function CadastroPacientePage({ api }) {
  const { user, refresh } = useAssociateAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState(EMPTY);
  const [patientId, setPatientId] = useState(null);
  const [error, setError] = useState(null);
  const [invalid, setInvalid] = useState([]);
  const [busy, setBusy] = useState(false);
  const [ciap2Enabled, setCiap2Enabled] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await api.getCiap2Status();
        if (!cancelled && typeof res.data?.enabled === 'boolean') {
          setCiap2Enabled(res.data.enabled);
        }
      } catch {
        /* default on */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [api]);

  useEffect(() => {
    if (user?.responsible_type !== 'another') {
      navigate('/cadastro-associado');
      return;
    }
    (async () => {
      const res = await api.listMyPatients();
      const p = res.data?.[0];
      if (p) {
        setPatientId(p.id);
        setForm({
          associate_name: p.associate_name || '',
          associate_last_name: p.associate_last_name || '',
          associate_birth_date: p.associate_birth_date ? String(p.associate_birth_date).slice(0, 10) : '',
          gender: p.gender || '',
          nationality: p.nationality || 'Brasileira',
          associate_cpf: p.associate_cpf || '',
          associate_rg: p.associate_rg || '',
          associate_rg_issuer: p.associate_rg_issuer || '',
          reason_treatment_text: p.reason_treatment_text || '',
          ciap_codes: p.ciap_codes
            ? String(p.ciap_codes).split(/[;,]/).map((s) => s.trim()).filter(Boolean)
            : [],
        });
        setInvalid(p.invalid_fields || []);
      }
    })().catch((err) => setError(err.message));
  }, [user, api, navigate]);

  function setField(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function onSubmit(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      let res;
      if (patientId) res = await api.patchMyPatient(patientId, form);
      else res = await api.createMyPatient(form);
      setPatientId(res.data.id);
      setInvalid(res.meta?.invalid_fields || []);
      await refresh();
      if ((res.meta?.invalid_fields || []).length) {
        setError('Campos inválidos foram destacados; válidos foram salvos.');
        return;
      }
      await api.advance();
      await refresh();
      navigate('/documentos');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  const fieldClass = (name) => `form-control${invalid.includes(name) ? ' is-invalid' : ''}`;

  return (
    <form onSubmit={onSubmit}>
      <h1 className="h3 mb-3">Dados do paciente</h1>
      <AlertError message={error} emptyFields={invalid} />
      <div className="row g-2">
        <div className="col-md-6">
          <label className="form-label">Nome</label>
          <input className={fieldClass('associate_name')} value={form.associate_name} onChange={(e) => setField('associate_name', e.target.value)} />
        </div>
        <div className="col-md-6">
          <label className="form-label">Sobrenome</label>
          <input className={fieldClass('associate_last_name')} value={form.associate_last_name} onChange={(e) => setField('associate_last_name', e.target.value)} />
        </div>
        <div className="col-md-4">
          <label className="form-label">Nascimento</label>
          <input type="date" className={fieldClass('associate_birth_date')} value={form.associate_birth_date} onChange={(e) => setField('associate_birth_date', e.target.value)} />
        </div>
        <div className="col-md-4">
          <label className="form-label">Gênero</label>
          <GenderSelect value={form.gender} onChange={(v) => setField('gender', v)} />
        </div>
        <div className="col-md-4">
          <label className="form-label">Nacionalidade</label>
          <input className={fieldClass('nationality')} value={form.nationality} onChange={(e) => setField('nationality', e.target.value)} />
        </div>
        <div className="col-md-4">
          <label className="form-label">CPF</label>
          <CpfInput className={fieldClass('associate_cpf')} value={form.associate_cpf} onChange={(v) => setField('associate_cpf', v)} />
        </div>
        <div className="col-md-4">
          <label className="form-label">RG</label>
          <input className={fieldClass('associate_rg')} value={form.associate_rg} onChange={(e) => setField('associate_rg', e.target.value)} />
        </div>
        <div className="col-md-4">
          <label className="form-label">Órgão emissor</label>
          <input className={fieldClass('associate_rg_issuer')} value={form.associate_rg_issuer} onChange={(e) => setField('associate_rg_issuer', e.target.value)} />
        </div>
      </div>
      <div className="mt-3">
        {ciap2Enabled ? (
          <>
            <label className="form-label">CIAP-2</label>
            <Ciap2Select value={form.ciap_codes} onChange={(v) => setField('ciap_codes', v)} />
          </>
        ) : null}
      </div>
      <div className="mt-3">
        <label className="form-label">Motivo</label>
        <textarea className={fieldClass('reason_treatment_text')} rows={3} value={form.reason_treatment_text} onChange={(e) => setField('reason_treatment_text', e.target.value)} />
      </div>
      <button className="btn btn-success mt-4" type="submit" disabled={busy}>
        Salvar e continuar
      </button>
    </form>
  );
}
