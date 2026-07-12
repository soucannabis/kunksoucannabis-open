import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Drawer,
  MenuItem,
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
import { useErrorModal } from '../../components/errors/ErrorModalProvider.jsx';
import ProductCsvImportDialog from './products/ProductCsvImportDialog.jsx';

const materialTheme = createTheme({
  palette: {
    primary: { main: '#5a7a5b' },
    secondary: { main: '#7A5B7A' },
  },
});

const GREEN = '#5a7a5b';
const PURPLE = '#7A5B7A';

const EMPTY = {
  sku: '',
  name: '',
  type: '',
  unit: '',
  concentration: '',
  price: '',
  amount: '0',
  category: '',
  batch: '',
  status: 'published',
};

const STATUS_OPTIONS = [
  { value: 'published', label: 'Publicado' },
  { value: 'draft', label: 'Rascunho' },
  { value: 'archived', label: 'Arquivado' },
];

const KIND_LABELS = {
  sale: 'Venda',
  sale_reversal: 'Estorno',
  adjustment: 'Ajuste',
};

function downloadText(filename, text) {
  const blob = new Blob([text], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function toForm(row) {
  return {
    sku: row.sku || '',
    name: row.name || '',
    type: row.type || '',
    unit: row.unit || '',
    concentration: row.concentration != null ? String(row.concentration) : '',
    price: row.price != null ? String(row.price) : '',
    amount: row.amount != null ? String(row.amount) : '0',
    category: row.category || '',
    batch: row.batch || '',
    status: row.status || 'published',
  };
}

function buildPayload(form) {
  const concentration =
    form.concentration === '' || form.concentration == null
      ? null
      : Number(form.concentration);
  const price = Number(String(form.price).replace(',', '.'));
  const amount = Math.trunc(Number(form.amount));
  if (!form.sku.trim()) throw new Error('Informe o SKU');
  if (!form.name.trim()) throw new Error('Informe o nome');
  if (!Number.isFinite(price)) throw new Error('Preço inválido');
  if (!Number.isFinite(amount) || amount < 0) throw new Error('Estoque inválido');
  if (concentration != null && (!Number.isFinite(concentration) || !Number.isInteger(concentration))) {
    throw new Error('Concentração inválida');
  }
  return {
    sku: form.sku.trim(),
    name: form.name.trim(),
    type: form.type.trim() || null,
    unit: form.unit.trim() || null,
    concentration,
    price,
    amount,
    category: form.category.trim() || null,
    batch: form.batch.trim() || null,
    status: form.status || 'published',
  };
}

export default function ProductsPage() {
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
  const [importOpen, setImportOpen] = useState(false);
  const [stockDialog, setStockDialog] = useState(null);
  const [stockDelta, setStockDelta] = useState('');
  const [stockNote, setStockNote] = useState('');
  const [history, setHistory] = useState(null);
  const [historyRows, setHistoryRows] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [importSuccess, setImportSuccess] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.listItems('products', 'limit=500&sort=-id');
      setRows(res.data || []);
    } catch (err) {
      showError(err);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [api, showError]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter((row) => {
      const blob = [row.sku, row.name, row.type, row.category, row.batch, row.status]
        .map((v) => String(v || '').toLowerCase())
        .join(' ');
      return blob.includes(needle);
    });
  }, [rows, q]);

  function openNew() {
    setForm(EMPTY);
    setDialog({ mode: 'new' });
  }

  function openEdit(row) {
    setForm(toForm(row));
    setDialog({ mode: 'edit', id: row.id });
  }

  async function onSave() {
    setBusy(true);
    try {
      const body = buildPayload(form);
      if (dialog.mode === 'new') await api.createItem('products', body);
      else await api.updateItem('products', dialog.id, body);
      setDialog(null);
      await load();
    } catch (err) {
      showError(err);
    } finally {
      setBusy(false);
    }
  }

  async function onDelete(row) {
    if (!window.confirm(`Excluir o produto "${row.name}" (${row.sku})?`)) return;
    try {
      await api.deleteItem('products', row.id);
      await load();
    } catch (err) {
      showError(err);
    }
  }

  async function onExport() {
    try {
      const csv = await api.exportProductsCsv();
      downloadText('produtos.csv', csv);
    } catch (err) {
      showError(err);
    }
  }

  async function openHistory(row) {
    setHistory(row);
    setHistoryLoading(true);
    setHistoryRows([]);
    try {
      const res = await api.listProductMovements(row.id, '?limit=100');
      setHistoryRows(res.data?.movements || []);
    } catch (err) {
      showError(err);
      setHistory(null);
    } finally {
      setHistoryLoading(false);
    }
  }

  async function onAdjustStock() {
    const delta = Math.trunc(Number(stockDelta));
    if (!Number.isFinite(delta) || delta === 0) {
      showError(new Error('Informe um delta inteiro diferente de zero'));
      return;
    }
    setBusy(true);
    try {
      await api.adjustProductStock(stockDialog.id, { delta, note: stockNote || undefined });
      setStockDialog(null);
      setStockDelta('');
      setStockNote('');
      await load();
      if (history?.id === stockDialog.id) await openHistory(stockDialog);
    } catch (err) {
      showError(err);
    } finally {
      setBusy(false);
    }
  }

  return (
    <ThemeProvider theme={materialTheme}>
      <Box sx={{ width: '100%', mb: 2 }}>
        {importSuccess && (
          <Paper
            elevation={0}
            sx={{
              backgroundColor: '#e8f5e9',
              borderRadius: '16px',
              p: 2,
              mb: 2,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 2,
            }}
          >
            <Typography variant="body2" sx={{ color: GREEN, fontWeight: 700 }}>
              Importação concluída: {importSuccess.created} criado(s), {importSuccess.updated}{' '}
              atualizado(s). Todos os produtos válidos foram gravados.
            </Typography>
            <Button size="small" onClick={() => setImportSuccess(null)}>
              Fechar
            </Button>
          </Paper>
        )}

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
            Novo produto
          </Button>
          <Button variant="outlined" onClick={onExport}>
            Exportar CSV
          </Button>
          <Button variant="outlined" onClick={() => setImportOpen(true)}>
            Importar CSV
          </Button>
          <Typography variant="body2" sx={{ color: GREEN, fontWeight: 700 }}>
            {filtered.length} produto{filtered.length === 1 ? '' : 's'}
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
                {['SKU', 'Nome', 'Tipo', 'Preço', 'Estoque', 'Lote', 'Status', ''].map((h) => (
                  <TableCell key={h || 'actions'} sx={{ color: '#fff', fontWeight: 700 }}>
                    {h}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                    <CircularProgress size={28} sx={{ color: GREEN }} />
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 4, color: '#666' }}>
                    Nenhum produto encontrado
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((row) => (
                  <TableRow key={row.id} hover>
                    <TableCell sx={{ fontFamily: 'monospace' }}>{row.sku || '—'}</TableCell>
                    <TableCell>{row.name || '—'}</TableCell>
                    <TableCell>{row.type || '—'}</TableCell>
                    <TableCell>
                      {row.price != null
                        ? Number(row.price).toLocaleString('pt-BR', {
                            style: 'currency',
                            currency: 'BRL',
                          })
                        : '—'}
                    </TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={row.amount ?? 0}
                        sx={{
                          bgcolor: Number(row.amount) > 0 ? '#e8f5e9' : '#ffebee',
                          fontWeight: 700,
                        }}
                      />
                    </TableCell>
                    <TableCell>{row.batch || '—'}</TableCell>
                    <TableCell>{row.status || '—'}</TableCell>
                    <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                      <Button size="small" onClick={() => openEdit(row)}>
                        Editar
                      </Button>
                      <Button
                        size="small"
                        onClick={() => {
                          setStockDialog(row);
                          setStockDelta('');
                          setStockNote('');
                        }}
                      >
                        Estoque
                      </Button>
                      <Button size="small" onClick={() => openHistory(row)}>
                        Histórico
                      </Button>
                      <Button size="small" color="error" onClick={() => onDelete(row)}>
                        Excluir
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>

      <Dialog open={Boolean(dialog)} onClose={() => !busy && setDialog(null)} fullWidth maxWidth="sm">
        <DialogTitle>{dialog?.mode === 'edit' ? 'Editar produto' : 'Novo produto'}</DialogTitle>
        <DialogContent
          sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, pt: 1 }}
        >
          {[
            ['sku', 'SKU', true],
            ['name', 'Nome', true],
            ['type', 'Tipo', false],
            ['unit', 'Unidade', false],
            ['concentration', 'Concentração', false],
            ['price', 'Preço', true],
            ['amount', 'Estoque', true],
            ['category', 'Categoria', false],
            ['batch', 'Lote', false],
          ].map(([key, label]) => (
            <TextField
              key={key}
              label={label}
              value={form[key]}
              onChange={(e) => setForm((p) => ({ ...p, [key]: e.target.value }))}
              fullWidth
              margin="dense"
              sx={key === 'name' ? { gridColumn: '1 / -1' } : undefined}
            />
          ))}
          <TextField
            select
            label="Status"
            value={form.status}
            onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}
            fullWidth
            margin="dense"
          >
            {STATUS_OPTIONS.map((opt) => (
              <MenuItem key={opt.value} value={opt.value}>
                {opt.label}
              </MenuItem>
            ))}
          </TextField>
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

      <Dialog
        open={Boolean(stockDialog)}
        onClose={() => !busy && setStockDialog(null)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>Ajustar estoque — {stockDialog?.sku}</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          <Typography variant="body2">
            Estoque atual: <strong>{stockDialog?.amount ?? 0}</strong>
          </Typography>
          <TextField
            label="Delta (+ entrada / − saída)"
            value={stockDelta}
            onChange={(e) => setStockDelta(e.target.value)}
            fullWidth
            autoFocus
          />
          <TextField
            label="Nota"
            value={stockNote}
            onChange={(e) => setStockNote(e.target.value)}
            fullWidth
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setStockDialog(null)} disabled={busy}>
            Cancelar
          </Button>
          <Button
            variant="contained"
            onClick={onAdjustStock}
            disabled={busy}
            sx={{ bgcolor: GREEN, '&:hover': { bgcolor: '#466147' } }}
          >
            Aplicar
          </Button>
        </DialogActions>
      </Dialog>

      <Drawer anchor="right" open={Boolean(history)} onClose={() => setHistory(null)}>
        <Box sx={{ width: { xs: 320, sm: 420 }, p: 2 }}>
          <Typography variant="h6" sx={{ mb: 1 }}>
            Histórico — {history?.name}
          </Typography>
          <Typography variant="body2" sx={{ mb: 2, color: '#666' }}>
            SKU {history?.sku} · estoque {history?.amount ?? 0}
          </Typography>
          {historyLoading ? (
            <CircularProgress size={28} sx={{ color: GREEN }} />
          ) : historyRows.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              Nenhum movimento registrado.
            </Typography>
          ) : (
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Data</TableCell>
                  <TableCell>Tipo</TableCell>
                  <TableCell>Qtd</TableCell>
                  <TableCell>Pedido</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {historyRows.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell>
                      {m.date_created
                        ? new Date(m.date_created).toLocaleString('pt-BR')
                        : '—'}
                    </TableCell>
                    <TableCell>{KIND_LABELS[m.kind] || m.kind}</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>{m.quantity}</TableCell>
                    <TableCell>{m.order_id || '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Box>
      </Drawer>

      <ProductCsvImportDialog
        open={importOpen}
        onClose={() => setImportOpen(false)}
        api={api}
        showError={showError}
        onImported={async (result) => {
          await load();
          if (result?.success) {
            setImportSuccess(result);
            setImportOpen(false);
          }
        }}
      />
    </ThemeProvider>
  );
}
