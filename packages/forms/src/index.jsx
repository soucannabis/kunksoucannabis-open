import React, { useMemo, useState } from 'react';
import PhoneInputImport from 'react-phone-input-2';
import 'react-phone-input-2/lib/bootstrap.css';

// CJS/ESM interop: Vite may nest default export as { default: Component }
const PhoneInputLib = PhoneInputImport?.default || PhoneInputImport;

/** Digits-only CPF validation (Brazilian). */
export function isValidCpf(value) {
  const cpf = String(value || '').replace(/\D/g, '');
  if (cpf.length !== 11 || /^(\d)\1+$/.test(cpf)) return false;
  let sum = 0;
  for (let i = 0; i < 9; i += 1) sum += Number(cpf[i]) * (10 - i);
  let d1 = (sum * 10) % 11;
  if (d1 === 10) d1 = 0;
  if (d1 !== Number(cpf[9])) return false;
  sum = 0;
  for (let i = 0; i < 10; i += 1) sum += Number(cpf[i]) * (11 - i);
  let d2 = (sum * 10) % 11;
  if (d2 === 10) d2 = 0;
  return d2 === Number(cpf[10]);
}

export function isValidCep(value) {
  return String(value || '').replace(/\D/g, '').length === 8;
}

/** Format digits as 000.000.000-00 */
export function formatCpf(value) {
  const d = String(value || '').replace(/\D/g, '').slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

export function onlyDigits(value) {
  return String(value || '').replace(/\D/g, '');
}

export function isValidPhoneBr(value) {
  const digits = onlyDigits(value);
  return digits.length >= 10 && digits.length <= 15;
}

export function isValidPassword(value) {
  return String(value || '').length >= 8;
}

export const GENDER_OPTIONS = [
  { value: 'homem-cis', label: 'Homem cis' },
  { value: 'mulher-cis', label: 'Mulher cis' },
  { value: 'homem-trans', label: 'Homem trans' },
  { value: 'mulher-trans', label: 'Mulher trans' },
  { value: 'travesti', label: 'Travesti' },
  { value: 'nao-binario', label: 'Não-binário' },
  { value: 'outro', label: 'Outro' },
];

export const MARITAL_OPTIONS = ['Solteiro', 'Casado', 'União-Estável', 'Viúvo', 'Divorciado'];

export const UF_OPTIONS = [
  'AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO',
];

/** Minimal CIAP-2 sample; full catalog can be expanded from legacy CIAP2Select. */
export const CIAP2_OPTIONS = [
  { value: 'A01', label: 'Dor generalizada /múltipla', category: 'GERAL E INESPECÍFICO' },
  { value: 'A04', label: 'Debilidade/cansaço geral/fadiga', category: 'GERAL E INESPECÍFICO' },
  { value: 'P01', label: 'Sensação de ansiedade/nervosismo/tensão', category: 'PSICOLÓGICO' },
  { value: 'P76', label: 'Perturbações depressivas', category: 'PSICOLÓGICO' },
  { value: 'L01', label: 'Sinais/sintomas do pescoço', category: 'MUSCULOSQUELÉTICO' },
  { value: 'L03', label: 'Sinais/sintomas da região lombar', category: 'MUSCULOSQUELÉTICO' },
  { value: 'N01', label: 'Cefaleia', category: 'NEUROLÓGICO' },
  { value: 'R05', label: 'Tosse', category: 'RESPIRATÓRIO' },
  { value: 'D01', label: 'Dor abdominal generalizada/cólicas', category: 'DIGESTIVO' },
  { value: 'T90', label: 'Diabetes não-insulino-dependente', category: 'ENDÓCRINO' },
];

/** CPF with 000.000.000-00 mask; onChange receives digits only. */
export function CpfInput({ value, onChange, className = 'form-control', ...rest }) {
  return (
    <input
      {...rest}
      type="text"
      inputMode="numeric"
      autoComplete="off"
      placeholder="000.000.000-00"
      className={className}
      value={formatCpf(value)}
      onChange={(e) => onChange(onlyDigits(e.target.value).slice(0, 11))}
    />
  );
}

/**
 * International phone with country selector (DDI).
 * Value / onChange use digits with country code (e.g. 5511999999999), matching API storage.
 */
export function PhoneInput({
  value,
  onChange,
  className = '',
  inputClass = 'form-control',
  invalid = false,
  preferredCountries = ['br', 'pt', 'us', 'ar', 'py', 'uy', 'bo', 'pe', 'cl', 'co', 'mx'],
  ...rest
}) {
  return (
    <PhoneInputLib
      {...rest}
      country="br"
      value={onlyDigits(value)}
      onChange={(phone) => onChange(onlyDigits(phone))}
      enableSearch
      preferredCountries={preferredCountries}
      countryCodeEditable={false}
      containerClass={`kunk-phone-input ${invalid ? 'is-invalid' : ''} ${className}`.trim()}
      inputClass={`${inputClass}${invalid ? ' is-invalid' : ''}`}
      buttonClass="kunk-phone-flag-btn"
      dropdownClass="kunk-phone-dropdown"
      searchClass="kunk-phone-search"
      inputProps={{
        name: 'mobile_number',
        autoComplete: 'tel',
        ...(rest.inputProps || {}),
      }}
    />
  );
}

export function GenderSelect({ value, onChange, name = 'gender', className = 'form-select' }) {
  const [other, setOther] = useState('');
  const isOther = value && !GENDER_OPTIONS.some((o) => o.value === value && o.value !== 'outro');
  const selectValue = GENDER_OPTIONS.some((o) => o.value === value) ? value : value ? 'outro' : '';
  return (
    <>
      <select
        className={className}
        name={name}
        value={selectValue === 'outro' || isOther ? 'outro' : selectValue}
        onChange={(e) => {
          if (e.target.value === 'outro') onChange(other || 'outro');
          else onChange(e.target.value);
        }}
      >
        <option value="">Selecione</option>
        {GENDER_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      {(selectValue === 'outro' || isOther) && (
        <input
          className="form-control mt-2"
          placeholder="Descreva"
          value={isOther && selectValue !== 'outro' ? value : other}
          onChange={(e) => {
            setOther(e.target.value);
            onChange(e.target.value);
          }}
        />
      )}
    </>
  );
}

export function Ciap2Select({ value = [], onChange, max = 10 }) {
  const [q, setQ] = useState('');
  const selected = Array.isArray(value) ? value : [];
  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return CIAP2_OPTIONS;
    return CIAP2_OPTIONS.filter(
      (o) => o.label.toLowerCase().includes(term) || o.value.toLowerCase().includes(term)
    );
  }, [q]);

  function toggle(code) {
    if (selected.includes(code)) onChange(selected.filter((c) => c !== code));
    else if (selected.length < max) onChange([...selected, code]);
  }

  return (
    <div>
      <div className="text-white mb-1">{selected.length}/{max}</div>
      <input className="form-control mb-2" placeholder="Buscar CIAP-2" value={q} onChange={(e) => setQ(e.target.value)} />
      <div style={{ maxHeight: 220, overflow: 'auto', background: '#fff', borderRadius: 4, padding: 8 }}>
        {filtered.map((o) => (
          <label key={o.value} className="d-block">
            <input type="checkbox" checked={selected.includes(o.value)} onChange={() => toggle(o.value)} />{' '}
            {o.value} — {o.label}
          </label>
        ))}
      </div>
    </div>
  );
}

export function validateAssociateForm(form) {
  const invalid = [];
  const required = [
    'responsible_type', 'associate_name', 'associate_last_name', 'associate_birth_date',
    'gender', 'nationality', 'associate_cpf', 'associate_rg', 'associate_rg_issuer',
    'marital_status', 'account_password', 'mobile_number', 'street', 'street_number',
    'neighborhood', 'city', 'state', 'cep', 'reason_treatment_text',
  ];
  for (const key of required) {
    if (form[key] === undefined || form[key] === null || String(form[key]).trim() === '') invalid.push(key);
  }
  if (!Array.isArray(form.ciap_codes) || form.ciap_codes.length < 1) invalid.push('ciap_codes');
  if (Array.isArray(form.ciap_codes) && form.ciap_codes.length > 10) invalid.push('ciap_codes');
  if (form.associate_cpf && !isValidCpf(form.associate_cpf)) invalid.push('associate_cpf');
  if (form.cep && !isValidCep(form.cep)) invalid.push('cep');
  if (form.mobile_number && !isValidPhoneBr(form.mobile_number)) invalid.push('mobile_number');
  if (form.account_password && !isValidPassword(form.account_password)) invalid.push('account_password');
  return [...new Set(invalid)];
}

export function pickValidFields(form, invalidKeys) {
  const invalid = new Set(invalidKeys);
  const out = {};
  for (const [k, v] of Object.entries(form)) {
    if (invalid.has(k)) continue;
    if (v === undefined || v === null || v === '') continue;
    if (k === 'ciap_codes' && Array.isArray(v)) {
      if (v.length >= 1 && v.length <= 10) out[k] = v.join(';');
      continue;
    }
    out[k] = v;
  }
  return out;
}
