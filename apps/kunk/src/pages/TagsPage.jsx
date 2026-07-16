import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  FormGroup,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import { createApiClient } from '@kunk/api-client';
import { getKunkPublicConfig } from '@kunk/config';
import { useErrorModal } from '../components/errors/ErrorModalProvider.jsx';

const materialTheme = createTheme({
  palette: {
    primary: { main: '#5a7a5b' },
    secondary: { main: '#7A5B7A' },
  },
});

const GREEN = '#5a7a5b';
const PURPLE = '#7A5B7A';

const CONTEXT_OPTIONS = [
  { value: 'orders', label: 'Pedidos' },
  { value: 'services', label: 'Serviços' },
  { value: 'reception', label: 'Triagem' },
];

const CONTEXT_LABELS = Object.fromEntries(CONTEXT_OPTIONS.map((c) => [c.value, c.label]));

const EMPTY = { tag: '', contexts: [], color: '#546E7A' };

function parseContexts(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.map(String).filter(Boolean);
  return String(raw)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

function contextsToString(list) {
  return (list || []).join(',');
}

export default function TagsPage() {
  const api = useMemo(() => {
    const bootstrap = getKunkPublicConfig();
    return createApiClient({ baseUrl: bootstrap.apiUrl });
  }, []);
  const { showError } = useErrorModal();

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [dialog, setDialog] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [busy, setBusy] = useState(false);
  const [scTags, setScTags] = useState([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.listItems('tags', 'limit=500');
      setRows(res.data || []);
    } catch (err) {
      showError(err);
      setRows([]);
    } finally {
      setLoading(false);
    }
    try {
      const st = await api.getSoucannabisOrdersStatus();
      if (st.data?.enabled && st.data?.sync_tags !== false) {
        const tres = await api.listSoucannabisTags();
        const list = Array.isArray(tres.data) ? tres.data : [];
        setScTags(
          list.map((t) =>
            typeof t === 'string'
              ? { tag: t, color: '#5a7a5b' }
              : { tag: t.tag || t.name, color: t.color || '#5a7a5b' }
          )
        );
      } else {
        setScTags([]);
      }
    } catch {
      setScTags([]);
    }
  }, [api, showError]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter((row) => {
      const tag = String(row.tag || '').toLowerCase();
      const contexts = String(row.contexts || '').toLowerCase();
      return tag.includes(needle) || contexts.includes(needle);
    });
  }, [rows, q]);

  function openNew() {
    setForm(EMPTY);
    setDialog({ mode: 'new' });
  }

  function openEdit(row) {
    setForm({
      tag: row.tag || '',
      contexts: parseContexts(row.contexts),
      color: row.color || '#546E7A',
    });
    setDialog({ mode: 'edit', id: row.id });
  }

  function toggleContext(value) {
    setForm((prev) => {
      const has = prev.contexts.includes(value);
      return {
        ...prev,
        contexts: has ? prev.contexts.filter((c) => c !== value) : [...prev.contexts, value],
      };
    });
  }

  async function onSave() {
    const tag = form.tag.trim();
    if (!tag) {
      showError(new Error('Informe o nome da tag'));
      return;
    }
    if (!form.contexts.length) {
      showError(new Error('Selecione ao menos um contexto'));
      return;
    }
    setBusy(true);
    try {
      const body = {
        tag,
        contexts: contextsToString(form.contexts),
        color: form.color || '#546E7A',
      };
      if (dialog.mode === 'new') await api.createItem('tags', body);
      else await api.updateItem('tags', dialog.id, body);
      setDialog(null);
      await load();
    } catch (err) {
      showError(err);
    } finally {
      setBusy(false);
    }
  }

  async function onDelete(row) {
    if (!window.confirm(`Excluir a tag "${row.tag}"?`)) return;
    try {
      await api.deleteItem('tags', row.id);
      await load();
    } catch (err) {
      showError(err);
    }
  }

  return (
    <ThemeProvider theme={materialTheme}>
      <Box sx={{ width: '100%', mb: 2 }}>
        <Paper
          elevation={0}
          sx={{
            backgroundColor: '#f5f5f5',
            borderRadius: '30px',
            p: '20px 24px',
            mb: 2,
            display: 'flex',
            gap: 2,
            flexWrap: 'wrap',
            alignItems: 'center',
          }}
        >
          <TextField
            size="small"
            label="Buscar"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            sx={{ minWidth: 220 }}
          />
          <Button
            variant="contained"
            onClick={openNew}
            sx={{ bgcolor: GREEN, '&:hover': { bgcolor: '#466147' } }}
          >
            Nova tag
          </Button>
          <Typography variant="body2" sx={{ color: GREEN, fontWeight: 700 }}>
            {filtered.length} tag{filtered.length === 1 ? '' : 's'}
          </Typography>
        </Paper>

        <TableContainer
          component={Paper}
          elevation={0}
          sx={{ backgroundColor: '#f5f5f5', borderRadius: '30px', overflow: 'hidden' }}
        >
          <Table>
            <TableHead>
              <TableRow sx={{ backgroundColor: GREEN }}>
                {['Tag', 'Contextos', 'Cor', ''].map((h) => (
                  <TableCell key={h || 'actions'} sx={{ color: '#fff', fontWeight: 700 }}>
                    {h}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={4} align="center" sx={{ py: 4 }}>
                    <CircularProgress size={28} sx={{ color: GREEN }} />
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} align="center" sx={{ py: 4, color: '#666' }}>
                    Nenhuma tag encontrada
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((row) => {
                  const contexts = parseContexts(row.contexts);
                  return (
                    <TableRow key={row.id} hover>
                      <TableCell>
                        <Chip
                          label={row.tag || '—'}
                          size="small"
                          sx={{
                            bgcolor: row.color || '#546E7A',
                            color: '#fff',
                            fontWeight: 600,
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                          {contexts.length
                            ? contexts.map((c) => (
                                <Chip
                                  key={c}
                                  label={CONTEXT_LABELS[c] || c}
                                  size="small"
                                  variant="outlined"
                                />
                              ))
                            : '—'}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Box
                            sx={{
                              width: 18,
                              height: 18,
                              borderRadius: '4px',
                              bgcolor: row.color || '#ccc',
                              border: '1px solid #bbb',
                            }}
                          />
                          <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                            {row.color || '—'}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell align="right">
                        <Button size="small" onClick={() => openEdit(row)}>
                          Editar
                        </Button>
                        <Button size="small" color="error" onClick={() => onDelete(row)}>
                          Excluir
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {scTags.length > 0 && (
          <Paper
            elevation={0}
            data-testid="sc-tags-section"
            sx={{
              backgroundColor: '#f5f5f5',
              borderRadius: '30px',
              p: '20px 24px',
              mt: 2,
            }}
          >
            <Typography variant="subtitle1" sx={{ fontWeight: 700, color: GREEN, mb: 1 }}>
              Tags SouCannabis
            </Typography>
            <Typography variant="body2" sx={{ color: '#666', mb: 1.5 }}>
              Somente leitura — sincronizadas do catálogo externo.
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {scTags.map((t) => (
                <Chip
                  key={t.tag}
                  label={t.tag}
                  size="small"
                  sx={{ bgcolor: t.color || GREEN, color: '#fff' }}
                />
              ))}
            </Box>
          </Paper>
        )}
      </Box>

      <Dialog open={Boolean(dialog)} onClose={() => !busy && setDialog(null)} fullWidth maxWidth="sm">
        <DialogTitle>{dialog?.mode === 'edit' ? 'Editar tag' : 'Nova tag'}</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          <TextField
            autoFocus
            label="Nome"
            value={form.tag}
            onChange={(e) => setForm((p) => ({ ...p, tag: e.target.value }))}
            fullWidth
            margin="dense"
          />
          <Box>
            <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
              Contextos
            </Typography>
            <FormGroup row>
              {CONTEXT_OPTIONS.map((opt) => (
                <FormControlLabel
                  key={opt.value}
                  control={
                    <Checkbox
                      checked={form.contexts.includes(opt.value)}
                      onChange={() => toggleContext(opt.value)}
                    />
                  }
                  label={opt.label}
                />
              ))}
            </FormGroup>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <TextField
              label="Cor"
              type="color"
              value={form.color || '#546E7A'}
              onChange={(e) => setForm((p) => ({ ...p, color: e.target.value }))}
              sx={{ width: 120 }}
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              label="Hex"
              value={form.color || ''}
              onChange={(e) => setForm((p) => ({ ...p, color: e.target.value }))}
              sx={{ flex: 1 }}
              placeholder="#546E7A"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialog(null)} disabled={busy}>
            Cancelar
          </Button>
          <Button
            variant="contained"
            onClick={onSave}
            disabled={busy}
            sx={{ bgcolor: PURPLE, '&:hover': { bgcolor: '#4d2d4d' } }}
          >
            {busy ? 'Salvando…' : 'Salvar'}
          </Button>
        </DialogActions>
      </Dialog>
    </ThemeProvider>
  );
}
