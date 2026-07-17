import React, { useEffect, useState } from 'react';
import {
  Autocomplete,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  TextField,
} from '@mui/material';
import { formatDateTime, PAYMENT_TYPES, typeLabel } from './servicesUtils.js';
import { useCacheConfig } from '../../../lib/cache/CacheConfigProvider.jsx';
import {
  fetchCollaboratorProfessionals,
  fetchTags,
  invalidateServicesCache,
} from '../../../lib/cache/fetchers.js';

export default function ServiceInfoModal({ open, service, api, onClose, onSaved }) {
  const [group, setGroup] = useState([]);
  const [professionals, setProfessionals] = useState([]);
  const [selectedPro, setSelectedPro] = useState(null);
  const [observations, setObservations] = useState('');
  const [tags, setTags] = useState([]);
  const [tagOpts, setTagOpts] = useState([]);
  const [paymentType, setPaymentType] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [receiptFile, setReceiptFile] = useState(null);
  const { enabled: cacheEnabled } = useCacheConfig();

  useEffect(() => {
    if (!open || !service) return;
    setObservations(service.observations || '');
    setTags(
      (Array.isArray(service.tags) ? service.tags : []).map((t) =>
        typeof t === 'string' ? t : t?.tag || t?.name || ''
      ).filter(Boolean)
    );
    setPaymentType(service.payment_type || '');
    (async () => {
      try {
        const [g, pros, tagList] = await Promise.all([
          service.booking_group_code
            ? api.listServicesByGroup(service.booking_group_code)
            : Promise.resolve({ data: [service] }),
          fetchCollaboratorProfessionals(api, cacheEnabled),
          fetchTags(api, cacheEnabled),
        ]);
        setGroup(g.data || [service]);
        setProfessionals(pros);
        setTagOpts(tagList.map((t) => t.tag).filter(Boolean));
        const match = pros.find(
          (p) =>
            String(p.professional_code) === String(service.professional_id) ||
            String(p.id) === String(service.professional_id)
        );
        setSelectedPro(match || null);
      } catch (err) {
        setError(err.message || 'Falha ao carregar');
      }
    })();
  }, [open, service, api, cacheEnabled]);

  async function onSave() {
    setBusy(true);
    setError('');
    try {
      const body = {
        observations,
        tags,
        payment_type: paymentType || null,
      };
      if (selectedPro) {
        body.professional_id = selectedPro.professional_code || selectedPro.id;
      }
      await api.updateService(service.id, body);
      onSaved?.();
      onClose();
    } catch (err) {
      setError(err.message || 'Falha ao salvar');
    } finally {
      setBusy(false);
    }
  }

  async function onUploadReceipt() {
    if (!receiptFile) return;
    setBusy(true);
    setError('');
    try {
      const fd = new FormData();
      fd.append('file', receiptFile);
      const up = await api.uploadFile(fd);
      const fileId = up.data?.id || up.data?.file_id;
      if (fileId) {
        await api.createItem('services_files', { service_id: service.id, file_id: fileId });
      }
      await api.markServicePaid(service.id);
      onSaved?.();
      setReceiptFile(null);
    } catch (err) {
      setError(err.message || 'Falha no comprovante');
    } finally {
      setBusy(false);
    }
  }

  if (!service) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: '20px' } }}>
      <DialogTitle>Observações do Serviço</DialogTitle>
      <DialogContent>
        {error && <Box sx={{ color: '#b00020', mb: 1 }}>{error}</Box>}
        <Box sx={{ mb: 2 }}>
          <div>
            <strong>Profissional:</strong> {service.professional_name} ·{' '}
            {typeLabel(service.type)}
          </div>
          <div>
            <strong>Responsável:</strong> {service.associate_name || '—'}
          </div>
          {service.patient_user_code || service.patient_name ? (
            <div>
              <strong>Paciente:</strong> {service.patient_name || service.patient_user_code}
            </div>
          ) : null}
          {group.length > 1 && (
            <Box sx={{ mt: 1, fontSize: '0.9rem' }}>
              <strong>Grupo ({group.length}):</strong>
              <ul style={{ margin: '0.25rem 0' }}>
                {group.map((g) => (
                  <li key={g.id}>
                    {g.professional_name} — {formatDateTime(g.consultation_date)}
                  </li>
                ))}
              </ul>
            </Box>
          )}
        </Box>
        <Autocomplete
          options={professionals}
          getOptionLabel={(o) => `${o.name || ''} ${o.last_name || ''}`.trim()}
          value={selectedPro}
          onChange={(_, v) => setSelectedPro(v)}
          renderInput={(params) => (
            <TextField {...params} label="Alterar profissional" margin="dense" fullWidth />
          )}
        />
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
          multiline
          minRows={4}
          fullWidth
          margin="dense"
          value={observations}
          onChange={(e) => setObservations(e.target.value)}
        />
        <TextField
          select
          label="Tipo de pagamento"
          fullWidth
          margin="dense"
          value={paymentType}
          onChange={(e) => setPaymentType(e.target.value)}
        >
          <MenuItem value="">—</MenuItem>
          {PAYMENT_TYPES.map((t) => (
            <MenuItem key={t} value={t}>
              {t}
            </MenuItem>
          ))}
        </TextField>
        <Box sx={{ mt: 2 }}>
          <strong>Comprovante</strong>
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mt: 1 }}>
            <Button variant="outlined" component="label" size="small">
              Arquivo
              <input
                type="file"
                hidden
                onChange={(e) => setReceiptFile(e.target.files?.[0] || null)}
              />
            </Button>
            <span style={{ fontSize: '0.85rem' }}>{receiptFile?.name || 'Nenhum'}</span>
            <Button
              size="small"
              variant="contained"
              disabled={!receiptFile || busy}
              onClick={onUploadReceipt}
              sx={{ bgcolor: '#5a7a5b' }}
            >
              Enviar (marca pago)
            </Button>
          </Box>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button variant="contained" disabled={busy} onClick={onSave} sx={{ bgcolor: '#5a7a5b' }}>
          Salvar
        </Button>
      </DialogActions>
    </Dialog>
  );
}
