import React, { useEffect, useMemo, useState } from 'react';
import {
  Autocomplete,
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  FormLabel,
  Radio,
  RadioGroup,
  TextField,
  Chip,
} from '@mui/material';
import { associateDisplayName, defaultPriceForType, typeLabel } from './servicesUtils.js';
import { useCacheConfig } from '../../../lib/cache/CacheConfigProvider.jsx';
import {
  fetchAssociateUser,
  fetchCollaboratorProfessionals,
  fetchTags,
} from '../../../lib/cache/fetchers.js';

function patientLabel(p) {
  if (!p) return '';
  return (
    [p.associate_name, p.associate_last_name].filter(Boolean).join(' ').trim() ||
    p.fullname ||
    p.user_code ||
    ''
  );
}

export default function NewServiceModal({
  open,
  onClose,
  api,
  initialUserCode,
  onCreated,
}) {
  const [associate, setAssociate] = useState(null);
  const [associateQ, setAssociateQ] = useState('');
  const [associateOpts, setAssociateOpts] = useState([]);
  const [patients, setPatients] = useState([]);
  const [beneficiary, setBeneficiary] = useState('responsible');
  const [professionals, setProfessionals] = useState([]);
  const [professionalTypes, setProfessionalTypes] = useState([]);
  const [selectedPros, setSelectedPros] = useState([]);
  const [rows, setRows] = useState({});
  const [observations, setObservations] = useState('');
  const [tags, setTags] = useState([]);
  const [tagOpts, setTagOpts] = useState([]);
  const [existingServices, setExistingServices] = useState([]);
  const [linkService, setLinkService] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const { enabled: cacheEnabled } = useCacheConfig();

  useEffect(() => {
    if (!open) return;
    (async () => {
      try {
        const [pros, tagList, typesRes] = await Promise.all([
          fetchCollaboratorProfessionals(api, cacheEnabled),
          fetchTags(api, cacheEnabled),
          api.getProfessionalTypes().catch(() => ({ data: [] })),
        ]);
        setProfessionals(pros);
        setTagOpts(tagList.map((t) => t.tag).filter(Boolean));
        setProfessionalTypes(Array.isArray(typesRes.data) ? typesRes.data : []);
      } catch {
        /* ignore */
      }
    })();
  }, [open, api, cacheEnabled]);

  useEffect(() => {
    if (!open || !initialUserCode) return;
    (async () => {
      try {
        const user = await fetchAssociateUser(api, cacheEnabled, initialUserCode, '');
        if (user) setAssociate(user);
      } catch {
        /* ignore */
      }
    })();
  }, [open, initialUserCode, api, cacheEnabled]);

  useEffect(() => {
    if (!associateQ || associateQ.length < 2) return;
    const t = setTimeout(async () => {
      try {
        const res = await api.searchUsers(associateQ);
        setAssociateOpts(res.data || []);
      } catch {
        setAssociateOpts([]);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [associateQ, api]);

  useEffect(() => {
    if (!open) return;
    (async () => {
      try {
        const res = await api.listServices('limit=100');
        setExistingServices(res.data || []);
      } catch {
        setExistingServices([]);
      }
    })();
  }, [open, api]);

  useEffect(() => {
    if (!associate?.id && !associate?.user_code) {
      setPatients([]);
      setBeneficiary('responsible');
      return;
    }
    (async () => {
      try {
        let list = [];
        if (associate.id) {
          const res = await api.getUserPatients(associate.id);
          list = res.data || [];
        }
        setPatients(list);
        const funnelCode = associate.patient_user_code;
        const match = list.find((p) => String(p.user_code) === String(funnelCode));
        setBeneficiary(match ? String(match.user_code) : 'responsible');
      } catch {
        setPatients([]);
        setBeneficiary('responsible');
      }
    })();
  }, [associate, api]);

  useEffect(() => {
    setRows((prev) => {
      const next = { ...prev };
      for (const p of selectedPros) {
        const key = String(p.id);
        if (!next[key]) {
          next[key] = {
            price: defaultPriceForType(p.type, p, professionalTypes),
            donation: 0,
            price_paid: 0,
            consultation_date: '',
            create_calendar_event: false,
          };
        }
      }
      return next;
    });
  }, [selectedPros, professionalTypes]);

  function updateRow(proId, patch) {
    setRows((prev) => {
      const key = String(proId);
      const cur = prev[key] || {};
      const next = { ...cur, ...patch };
      if (patch.consultation_date !== undefined && patch.consultation_date) {
        next.create_calendar_event = true;
      }
      return { ...prev, [key]: next };
    });
  }

  async function onSubmit() {
    setBusy(true);
    setError('');
    try {
      if (!associate?.user_code) {
        throw new Error('Selecione o associado');
      }
      if (!selectedPros.length) throw new Error('Selecione ao menos um profissional');
      const patient =
        beneficiary !== 'responsible'
          ? patients.find((p) => String(p.user_code) === String(beneficiary))
          : null;
      const body = {
        associate_user_code: associate.user_code,
        associate_name: associateDisplayName(associate) || associate.email_account,
        associate_email: associate.email_account || null,
        patient_user_code: patient?.user_code || null,
        patient_name: patient ? patientLabel(patient) : null,
        observations,
        tags: tags.map((t) => (typeof t === 'string' ? t : t?.tag || t?.name || String(t))),
        booking_group_code: linkService?.booking_group_code || null,
        items: selectedPros.map((p) => {
          const r = rows[String(p.id)] || {};
          return {
            professional_id: p.professional_code || p.id,
            consultation_date: r.consultation_date || null,
            price: Number(r.price) || 0,
            donation: Number(r.donation) || 0,
            price_paid: Number(r.price_paid) || 0,
            create_calendar_event: Boolean(r.create_calendar_event && r.consultation_date),
          };
        }),
      };
      await api.createServices(body);
      onCreated?.();
      onClose();
    } catch (err) {
      setError(err.message || 'Falha ao criar');
    } finally {
      setBusy(false);
    }
  }

  const uniqueExisting = useMemo(() => {
    const seen = new Set();
    return existingServices.filter((s) => {
      if (!s.booking_group_code || seen.has(s.booking_group_code)) return false;
      seen.add(s.booking_group_code);
      return true;
    });
  }, [existingServices]);

  return (
    <Dialog
      open={open}
      onClose={() => {}}
      maxWidth="md"
      fullWidth
      PaperProps={{ sx: { borderRadius: '20px' } }}
      sx={{
        '& .MuiBackdrop-root': {
          left: 'var(--kunk-sidebar-offset, 220px)',
          width: 'calc(100% - var(--kunk-sidebar-offset, 220px))',
        },
        '& .MuiDialog-container': {
          marginLeft: 'var(--kunk-sidebar-offset, 220px)',
          width: 'calc(100% - var(--kunk-sidebar-offset, 220px))',
        },
      }}
    >
      <DialogTitle>Novo Serviço</DialogTitle>
      <DialogContent sx={{ pt: 1 }}>
        {error && <Box sx={{ color: '#b00020', mb: 1 }}>{error}</Box>}
        <Autocomplete
          options={associateOpts}
          getOptionLabel={(o) => associateDisplayName(o) || ''}
          isOptionEqualToValue={(a, b) =>
            String(a?.user_code || a?.id) === String(b?.user_code || b?.id)
          }
          value={associate}
          onChange={(_, v) => setAssociate(v)}
          onInputChange={(_, v, reason) => {
            if (reason === 'input') setAssociateQ(v);
          }}
          renderOption={(props, option) => (
            <li {...props} key={option.user_code || option.id}>
              {associateDisplayName(option)}
            </li>
          )}
          renderInput={(params) => (
            <TextField {...params} label="Associado responsável" margin="dense" fullWidth />
          )}
        />

        {associate ? (
          <FormControl sx={{ mt: 1, mb: 1 }} fullWidth>
            <FormLabel>Beneficiário do atendimento</FormLabel>
            <RadioGroup value={beneficiary} onChange={(e) => setBeneficiary(e.target.value)}>
              <FormControlLabel
                value="responsible"
                control={<Radio />}
                label={`O próprio associado (${associateDisplayName(associate)})`}
              />
              {patients.map((p) => (
                <FormControlLabel
                  key={p.user_code}
                  value={String(p.user_code)}
                  control={<Radio />}
                  label={`Paciente: ${patientLabel(p)}`}
                />
              ))}
            </RadioGroup>
          </FormControl>
        ) : null}

        <Autocomplete
          options={uniqueExisting}
          getOptionLabel={(o) =>
            `${o.associate_name || ''} · ${o.professional_name || ''} · ${o.booking_group_code?.slice(0, 8) || ''}`
          }
          value={linkService}
          onChange={(_, v) => setLinkService(v)}
          renderInput={(params) => (
            <TextField
              {...params}
              label="Relacionar a serviço existente (opcional)"
              margin="dense"
              fullWidth
            />
          )}
        />
        <Autocomplete
          multiple
          options={professionals}
          getOptionLabel={(o) =>
            `${o.name || ''} ${o.last_name || ''} (${typeLabel(o.type, professionalTypes)})`.trim()
          }
          value={selectedPros}
          onChange={(_, v) => setSelectedPros(v)}
          renderInput={(params) => (
            <TextField {...params} label="Profissionais (colaboradores)" margin="dense" fullWidth />
          )}
        />
        {selectedPros.map((p) => {
          const r = rows[String(p.id)] || {};
          return (
            <Box
              key={p.id}
              sx={{ border: '1px solid #ddd', borderRadius: 2, px: 1.5, pt: 1.5, pb: 1.5, mt: 1.5 }}
            >
              <strong>
                {p.name} {p.last_name}
              </strong>
              <Box
                sx={{
                  display: 'flex',
                  gap: 1.25,
                  flexWrap: 'nowrap',
                  alignItems: 'flex-start',
                  mt: 2,
                  pt: 1.25,
                  overflowX: 'auto',
                }}
              >
                <TextField
                  label="Valor consulta"
                  type="number"
                  size="small"
                  value={r.price ?? ''}
                  InputProps={{ readOnly: true }}
                  sx={{ minWidth: 120, flex: 1 }}
                />
                <TextField
                  label="Doação"
                  type="number"
                  size="small"
                  value={r.donation ?? ''}
                  onChange={(e) => updateRow(p.id, { donation: e.target.value })}
                  sx={{ minWidth: 100, flex: 1 }}
                />
                <TextField
                  label="Valor pago"
                  type="number"
                  size="small"
                  value={r.price_paid ?? ''}
                  onChange={(e) => updateRow(p.id, { price_paid: e.target.value })}
                  sx={{ minWidth: 100, flex: 1 }}
                />
                <Box sx={{ minWidth: 200, flex: 1.2 }}>
                  <TextField
                    label="Data da consulta"
                    type="datetime-local"
                    size="small"
                    fullWidth
                    InputLabelProps={{ shrink: true }}
                    value={r.consultation_date || ''}
                    onChange={(e) => updateRow(p.id, { consultation_date: e.target.value })}
                  />
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={Boolean(r.create_calendar_event)}
                        onChange={(e) => updateRow(p.id, { create_calendar_event: e.target.checked })}
                      />
                    }
                    label="Criar evento no calendário"
                  />
                </Box>
              </Box>
            </Box>
          );
        })}
        <Autocomplete
          multiple
          freeSolo
          options={tagOpts}
          value={tags}
          onChange={(_, v) => setTags(v)}
          renderTags={(value, getTagProps) =>
            value.map((option, index) => (
              <Chip variant="outlined" label={option} {...getTagProps({ index })} key={option} />
            ))
          }
          renderInput={(params) => <TextField {...params} label="Tags" margin="dense" fullWidth />}
        />
        <TextField
          label="Observações"
          margin="dense"
          fullWidth
          multiline
          minRows={3}
          value={observations}
          onChange={(e) => setObservations(e.target.value)}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={busy}>
          Cancelar
        </Button>
        <Button variant="contained" onClick={onSubmit} disabled={busy} sx={{ bgcolor: '#5a7a5b' }}>
          Criar
        </Button>
      </DialogActions>
    </Dialog>
  );
}
