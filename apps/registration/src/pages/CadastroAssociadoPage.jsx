import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAssociateAuth } from '@kunk/auth-session';
import {
  Ciap2Select,
  CpfInput,
  GenderSelect,
  MARITAL_OPTIONS,
  PhoneInput,
  UF_OPTIONS,
} from '@kunk/forms';
import { AlertError } from '@kunk/ui';

const EMPTY = {
  responsible_type: 'himself',
  associate_name: '',
  associate_last_name: '',
  associate_birth_date: '',
  gender: '',
  nationality: 'Brasileira',
  associate_cpf: '',
  associate_rg: '',
  associate_rg_issuer: '',
  marital_status: '',
  mobile_number: '',
  street: '',
  street_number: '',
  complement: '',
  neighborhood: '',
  city: '',
  state: '',
  cep: '',
  reason_treatment_text: '',
  ciap_codes: [],
};

export function CadastroAssociadoPage({ api }) {
  const { user, refresh } = useAssociateAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState(null);
  const [invalid, setInvalid] = useState([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user) return;
    setForm((prev) => ({
      ...prev,
      responsible_type: user.responsible_type || prev.responsible_type,
      associate_name: user.associate_name || '',
      associate_last_name: user.associate_last_name || '',
      associate_birth_date: user.associate_birth_date
        ? String(user.associate_birth_date).slice(0, 10)
        : '',
      gender: user.gender || '',
      nationality: user.nationality || 'Brasileira',
      associate_cpf: user.associate_cpf || '',
      associate_rg: user.associate_rg || '',
      associate_rg_issuer: user.associate_rg_issuer || '',
      marital_status: user.marital_status || '',
      mobile_number: user.mobile_number || '',
      street: user.street || '',
      street_number: user.street_number || '',
      complement: user.complement || '',
      neighborhood: user.neighborhood || '',
      city: user.city || '',
      state: user.state || '',
      cep: user.cep || '',
      reason_treatment_text: user.reason_treatment_text || '',
      ciap_codes: user.ciap_codes
        ? String(user.ciap_codes).split(/[;,]/).map((s) => s.trim()).filter(Boolean)
        : [],
    }));
    setInvalid(user.invalid_fields || []);
  }, [user]);

  function setField(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function onSubmit(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const body = { ...form };
    try {
      const res = await api.patchMe(body);
      await refresh();
      const inv = res.meta?.invalid_fields || [];
      setInvalid(inv);
      if (inv.length) {
        setError('Alguns campos precisam de correção. Os válidos foram salvos.');
        return;
      }
      if (res.data.responsible_type === 'another') {
        navigate('/cadastro-paciente');
      } else {
        await api.advance();
        await refresh();
        navigate('/documentos');
      }
    } catch (err) {
      setError(err.message || 'Erro ao salvar');
    } finally {
      setBusy(false);
    }
  }

  const fieldClass = (name) =>
    `form-control${invalid.includes(name) ? ' is-invalid' : ''}`;

  return (
    <form onSubmit={onSubmit}>
      <h1 className="h3 mb-3">Dados do responsável</h1>
      <AlertError message={error} emptyFields={invalid} />

      <div className="mb-3">
        <span className="form-label d-block">Tipo de cadastro</span>
        {['himself', 'another', 'pet'].map((v) => (
          <button
            key={v}
            type="button"
            className={`btn btn-outline-primary me-2 mb-2 ${form.responsible_type === v ? 'active' : ''}`}
            onClick={() => setField('responsible_type', v)}
          >
            {v === 'himself' ? 'Para mim' : v === 'another' ? 'Para outra pessoa' : 'Para pet'}
          </button>
        ))}
      </div>

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
        <div className="col-md-4">
          <label className="form-label">Estado civil</label>
          <select className={fieldClass('marital_status')} value={form.marital_status} onChange={(e) => setField('marital_status', e.target.value)}>
            <option value="">Selecione</option>
            {MARITAL_OPTIONS.map((o) => (
              <option key={o} value={o}>{o}</option>
            ))}
          </select>
        </div>
        <div className="col-md-8">
          <label className="form-label">Celular</label>
          <PhoneInput
            value={form.mobile_number}
            onChange={(v) => setField('mobile_number', v)}
            invalid={invalid.includes('mobile_number')}
          />
        </div>
        <div className="col-md-8">
          <label className="form-label">Rua</label>
          <input className={fieldClass('street')} value={form.street} onChange={(e) => setField('street', e.target.value)} />
        </div>
        <div className="col-md-4">
          <label className="form-label">Número</label>
          <input className={fieldClass('street_number')} value={form.street_number} onChange={(e) => setField('street_number', e.target.value)} />
        </div>
        <div className="col-md-4">
          <label className="form-label">Complemento</label>
          <input className="form-control" value={form.complement} onChange={(e) => setField('complement', e.target.value)} />
        </div>
        <div className="col-md-4">
          <label className="form-label">Bairro</label>
          <input className={fieldClass('neighborhood')} value={form.neighborhood} onChange={(e) => setField('neighborhood', e.target.value)} />
        </div>
        <div className="col-md-4">
          <label className="form-label">Cidade</label>
          <input className={fieldClass('city')} value={form.city} onChange={(e) => setField('city', e.target.value)} />
        </div>
        <div className="col-md-2">
          <label className="form-label">UF</label>
          <select className={fieldClass('state')} value={form.state} onChange={(e) => setField('state', e.target.value)}>
            <option value="">UF</option>
            {UF_OPTIONS.map((uf) => (
              <option key={uf} value={uf}>{uf}</option>
            ))}
          </select>
        </div>
        <div className="col-md-4">
          <label className="form-label">CEP</label>
          <input className={fieldClass('cep')} value={form.cep} onChange={(e) => setField('cep', e.target.value)} />
        </div>
      </div>

      <div className="mt-3">
        <label className="form-label">Motivos de tratamento (CIAP-2)</label>
        <Ciap2Select value={form.ciap_codes} onChange={(v) => setField('ciap_codes', v)} />
      </div>
      <div className="mt-3">
        <label className="form-label">Descreva o motivo</label>
        <textarea className={fieldClass('reason_treatment_text')} rows={3} value={form.reason_treatment_text} onChange={(e) => setField('reason_treatment_text', e.target.value)} />
      </div>

      <button className="btn btn-success mt-4" type="submit" disabled={busy}>
        Salvar e continuar
      </button>
    </form>
  );
}
