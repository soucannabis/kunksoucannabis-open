import React, { useMemo, useState } from 'react';
import PhoneInputImport from 'react-phone-input-2';
import 'react-phone-input-2/lib/bootstrap.css';
import {
  CIAP2_OPTIONS as CIAP2_CATALOG,
  normalizeCiapCodes,
  resolveCiapCodes,
} from './ciap2Catalog.js';

export {
  CIAP2_OPTIONS,
  flattenCiapOptions,
  normalizeCiapCodes,
  resolveCiapCodes,
  serializeCiapCodes,
} from './ciap2Catalog.js';

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

/**
 * CIAP-2 multi-select (Bootstrap) — UX alinhada ao Kunk/cadastramento legado:
 * chips selecionados + “Adicionar CIAP” + busca + categorias com checkboxes.
 */
export function Ciap2Select({ value = [], onChange, max = 10 }) {
  const [q, setQ] = useState('');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [openCat, setOpenCat] = useState(null);
  const selected = normalizeCiapCodes(value);
  const selectedItems = useMemo(() => resolveCiapCodes(selected), [selected]);

  const filteredCategories = useMemo(() => {
    const term = q.trim().toLowerCase();
    return CIAP2_CATALOG.map((cat) => ({
      ...cat,
      subcategories: (cat.subcategories || []).filter((sub) => {
        if (!term) return true;
        return (
          String(sub.label || '').toLowerCase().includes(term) ||
          String(sub.value || '').toLowerCase().includes(term) ||
          String(cat.category || '').toLowerCase().includes(term)
        );
      }),
    })).filter((cat) => cat.subcategories.length > 0);
  }, [q]);

  function addCode(code) {
    if (selected.includes(code) || selected.length >= max) return;
    onChange([...selected, code]);
  }

  function removeCode(code) {
    onChange(selected.filter((c) => c !== code));
  }

  function toggle(code) {
    if (selected.includes(code)) removeCode(code);
    else addCode(code);
  }

  return (
    <div className="kunk-ciap2">
      <div className="d-flex flex-wrap gap-1 align-items-center mb-2">
        {selectedItems.map((item) => (
          <span
            key={item.value}
            className="badge text-bg-primary"
            title={item.category || undefined}
            style={{ fontWeight: 500 }}
          >
            {item.value} - {item.label}
            <button
              type="button"
              className="btn-close btn-close-white ms-1"
              aria-label={`Remover ${item.value}`}
              style={{ fontSize: '0.55rem' }}
              onClick={() => removeCode(item.value)}
            />
          </span>
        ))}
        {selected.length < max && !pickerOpen ? (
          <button type="button" className="btn btn-sm btn-success" onClick={() => setPickerOpen(true)}>
            + Adicionar CIAP
          </button>
        ) : null}
      </div>
      <div className="text-muted small mb-1">
        {selected.length}/{max} motivos
      </div>
      {pickerOpen ? (
        <div className="border rounded p-2 bg-white">
          <label className="form-label">Pesquise pelo motivo do tratamento:</label>
          <input
            className="form-control mb-2"
            placeholder="Motivo do tratamento"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setOpenCat('all');
            }}
          />
          <div className="fw-semibold text-center mb-2">Selecione as opções abaixo</div>
          <div style={{ maxHeight: 280, overflow: 'auto' }}>
            {filteredCategories.map((cat, index) => {
              const catKey = `cat-${index}`;
              const expanded = openCat === 'all' || openCat === catKey || Boolean(q.trim());
              return (
                <div key={cat.category} className="mb-2 border-bottom pb-1">
                  <button
                    type="button"
                    className="btn btn-link text-decoration-none p-0 fw-semibold text-start w-100"
                    onClick={() => setOpenCat((prev) => (prev === catKey ? null : catKey))}
                  >
                    {cat.category}
                  </button>
                  {expanded ? (
                    <div className="ps-1 mt-1">
                      {cat.subcategories.map((sub) => (
                        <label key={sub.value} className="d-block">
                          <input
                            type="checkbox"
                            checked={selected.includes(sub.value)}
                            disabled={!selected.includes(sub.value) && selected.length >= max}
                            onChange={() => toggle(sub.value)}
                          />{' '}
                          {sub.value} — {sub.label}
                        </label>
                      ))}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
          <button type="button" className="btn btn-sm btn-outline-secondary mt-2" onClick={() => setPickerOpen(false)}>
            Fechar seletor
          </button>
        </div>
      ) : null}
    </div>
  );
}

export function validateAssociateForm(form, { ciap2Enabled = true } = {}) {
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
  if (ciap2Enabled) {
    const codes = normalizeCiapCodes(form.ciap_codes);
    if (codes.length < 1) invalid.push('ciap_codes');
    if (codes.length > 10) invalid.push('ciap_codes');
  }
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
