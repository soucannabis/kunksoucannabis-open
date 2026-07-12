import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  CircularProgress,
  Stack,
  Typography,
} from '@mui/material';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import RefreshIcon from '@mui/icons-material/Refresh';
import { useNavigate } from 'react-router-dom';
import { createApiClient } from '@kunk/api-client';
import { getKunkPublicConfig, ORDER_STATUS_AWAITING, ORDER_STATUS_PAID } from '@kunk/config';
import { PATHS } from '../../app/menuConfig.js';
import OrdersStatusChips from './orders/OrdersStatusChips.jsx';
import OrdersFilters from './orders/OrdersFilters.jsx';
import OrdersOrderCard from './orders/OrdersOrderCard.jsx';
import OrdersBulkActions, { OrdersBulkResultDialog } from './orders/OrdersBulkActions.jsx';

const muiTheme = createTheme();
const GREEN = '#5a7a5b';
const PAGE_SIZE = 50;

function buildQs(filters, { limit = PAGE_SIZE, offset = 0 } = {}) {
  const p = new URLSearchParams();
  if (filters.status) p.set('status', filters.status);
  if (filters.q) p.set('q', filters.q);
  if (filters.dateFrom) p.set('date_from', filters.dateFrom);
  if (filters.dateTo) p.set('date_to', filters.dateTo);
  if (filters.dateField) p.set('date_field', filters.dateField);
  if (filters.tags?.length) p.set('tags', filters.tags.join(','));
  p.set('limit', String(limit));
  p.set('offset', String(offset));
  return p.toString();
}

export default function OrdersPage() {
  const bootstrap = getKunkPublicConfig();
  const api = useMemo(() => createApiClient({ baseUrl: bootstrap.apiUrl }), [bootstrap.apiUrl]);
  const navigate = useNavigate();

  const [orders, setOrders] = useState([]);
  const [meta, setMeta] = useState({ total_count: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');

  const [q, setQ] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [tagFilter, setTagFilter] = useState([]);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [dateField, setDateField] = useState('created_date');
  const [offset, setOffset] = useState(0);

  const [statusConfig, setStatusConfig] = useState({
    statuses: [],
    awaiting: ORDER_STATUS_AWAITING,
    paid: ORDER_STATUS_PAID,
  });
  const [tagOptions, setTagOptions] = useState([]);
  const [labelFlags, setLabelFlags] = useState({ loggi: false, melhorenvio: false });

  const [facetsLoaded, setFacetsLoaded] = useState(false);
  const [statusCounts, setStatusCounts] = useState({});
  const [tagCounts, setTagCounts] = useState({});
  const [facetsLoading, setFacetsLoading] = useState(false);

  const [selected, setSelected] = useState(() => new Set());
  const [showOnlySelected, setShowOnlySelected] = useState(false);
  const [bulkResult, setBulkResult] = useState(null);

  const filters = useMemo(
    () => ({
      q: q.trim(),
      status: statusFilter,
      tags: tagFilter,
      dateFrom,
      dateTo,
      dateField,
    }),
    [q, statusFilter, tagFilter, dateFrom, dateTo, dateField]
  );

  const loadOrders = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.listOrders(buildQs(filters, { offset }));
      setOrders(res.data || []);
      setMeta(res.meta || { total_count: (res.data || []).length });
    } catch (err) {
      setError(err.message || 'Falha ao listar pedidos');
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, [api, filters, offset]);

  const loadFacets = useCallback(async () => {
    setFacetsLoading(true);
    try {
      const p = new URLSearchParams();
      if (filters.q) p.set('q', filters.q);
      if (filters.dateFrom) p.set('date_from', filters.dateFrom);
      if (filters.dateTo) p.set('date_to', filters.dateTo);
      if (filters.dateField) p.set('date_field', filters.dateField);
      const res = await api.ordersFacets(p.toString());
      setStatusCounts(res.data?.statusCounts || {});
      setTagCounts(res.data?.tagCounts || {});
      setFacetsLoaded(true);
    } catch (err) {
      setError(err.message || 'Falha ao carregar contagens');
    } finally {
      setFacetsLoading(false);
    }
  }, [api, filters]);

  useEffect(() => {
    (async () => {
      try {
        const cfg = await api.ordersStatusConfig();
        setStatusConfig({
          statuses: cfg.data?.statuses || [],
          awaiting: cfg.data?.awaiting || ORDER_STATUS_AWAITING,
          paid: cfg.data?.paid || ORDER_STATUS_PAID,
        });
      } catch {
        /* defaults */
      }
      try {
        const tags = await api.listItems('tags', 'limit=200');
        setTagOptions((tags.data || []).map((t) => t.tag || t.name).filter(Boolean));
      } catch {
        setTagOptions([]);
      }
      try {
        const mod = await api.configBySystem('modules');
        const items = mod.data?.items || [];
        const map = Object.fromEntries(items.map((i) => [i.key, i.value ?? i.resolved_value]));
        setLabelFlags({
          loggi: String(map['modules.loggi.use_for_label'] ?? 'true') === 'true',
          melhorenvio: String(map['modules.melhorenvio.use_for_label'] ?? 'false') === 'true',
        });
      } catch {
        setLabelFlags({ loggi: true, melhorenvio: false });
      }
    })();
  }, [api]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const displayed = showOnlySelected
    ? orders.filter((o) => selected.has(o.id))
    : orders;

  function toggleSelect(id) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectPage() {
    const ids = displayed.map((o) => o.id);
    const allSelected = ids.length && ids.every((id) => selected.has(id));
    setSelected((prev) => {
      const next = new Set(prev);
      if (allSelected) ids.forEach((id) => next.delete(id));
      else ids.forEach((id) => next.add(id));
      return next;
    });
  }

  async function onStatusChange(order, status) {
    setError('');
    try {
      await api.updateOrderStatus(order.id, status);
      setMsg(`Pedido #${order.id} → ${status}`);
      await loadOrders();
      if (facetsLoaded) await loadFacets();
    } catch (err) {
      setError(err.message || 'Falha ao atualizar status');
    }
  }

  async function onCreateLabel(order, provider) {
    setError('');
    try {
      if (provider === 'loggi') {
        await api.createLoggiLabel({
          order_id: order.id,
          order_code: order.order_code,
          address: order.address,
          name_associate: order.associate_name,
          freight_option: order.freight_option,
        });
      } else {
        await api.createMelhorEnvioLabel({
          order_id: order.id,
          order_code: order.order_code,
          address: order.address,
          name_associate: order.associate_name,
          freight_option: order.freight_option,
        });
      }
      setMsg(`Etiqueta ${provider} solicitada para #${order.id}`);
      await loadOrders();
    } catch (err) {
      setError(err.message || 'Falha na etiqueta');
    }
  }

  async function onCancelLabel(order, provider) {
    setError('');
    try {
      if (provider === 'loggi') {
        await api.cancelLoggiLabel({
          orderId: order.id,
          tracking_code: order.tracking_code || order.carrier_order_code,
        });
      } else {
        await api.cancelMelhorEnvioLabel({ orderId: order.id });
      }
      setMsg(`Cancelamento ${provider} #${order.id}`);
      await loadOrders();
    } catch (err) {
      setError(err.message || 'Falha ao cancelar');
    }
  }

  async function onDelete(order) {
    if (!window.confirm(`Excluir pedido #${order.id}?`)) return;
    try {
      await api.deleteOrder(order.id);
      setMsg(`Pedido #${order.id} excluído`);
      await loadOrders();
    } catch (err) {
      setError(err.message || 'Falha ao excluir');
    }
  }

  function onOpenCart(order) {
    const u = order.user_code || '';
    navigate(`${PATHS.newOrder}?u=${encodeURIComponent(u)}&p=${encodeURIComponent(order.id)}`);
  }

  function onCopyTracking(order) {
    const code = order.tracking_code || order.carrier_order_code || '';
    if (code) navigator.clipboard?.writeText(String(code));
    setMsg('Rastreio copiado');
  }

  async function runBulk(body) {
    setError('');
    try {
      const res = await api.ordersBulk(body);
      setBulkResult({ title: `Bulk: ${body.action}`, results: res.data?.results || [] });
      await loadOrders();
      if (facetsLoaded) await loadFacets();
    } catch (err) {
      setError(err.message || 'Falha na ação em massa');
    }
  }

  const selectedIds = [...selected];

  return (
    <ThemeProvider theme={muiTheme}>
      <Box sx={{ p: 1, pb: 4 }} data-testid="orders-page">
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
          <Typography variant="h5" sx={{ color: GREEN, fontWeight: 700 }}>
            Pedidos
          </Typography>
          <Stack direction="row" spacing={1} alignItems="center">
            <OrdersBulkActions
              selectedCount={selectedIds.length}
              statusOptions={statusConfig.statuses}
              labelFlags={labelFlags}
              onBulkStatus={(status) => runBulk({ ids: selectedIds, action: 'status', status })}
              onBulkTags={(mode, tags) =>
                runBulk({
                  ids: selectedIds,
                  action: mode === 'add' ? 'tags_add' : 'tags_remove',
                  tags,
                })
              }
              onBulkLabel={(provider, kind) =>
                runBulk({
                  ids: selectedIds,
                  action: kind === 'create' ? 'label_create' : 'label_cancel',
                  provider,
                })
              }
              onShowOnlySelected={() => setShowOnlySelected(true)}
            />
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={() => loadOrders()}
              data-testid="orders-refresh"
            >
              Atualizar
            </Button>
          </Stack>
        </Stack>

        {error && (
          <Alert severity="error" sx={{ mb: 1 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}
        {msg && (
          <Alert severity="success" sx={{ mb: 1 }} onClose={() => setMsg('')}>
            {msg}
          </Alert>
        )}

        <OrdersStatusChips
          statusCounts={statusCounts}
          tagCounts={tagCounts}
          statusFilter={statusFilter}
          tagFilter={tagFilter}
          facetsLoaded={facetsLoaded}
          loading={facetsLoading}
          onLoadFacets={loadFacets}
          onStatusClick={(s) => {
            setOffset(0);
            setStatusFilter((prev) => (prev === s ? '' : s));
          }}
          onTagClick={(t) => {
            setOffset(0);
            setTagFilter((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));
          }}
        />

        <OrdersFilters
          q={q}
          setQ={setQ}
          statusFilter={statusFilter}
          setStatusFilter={(v) => {
            setOffset(0);
            setStatusFilter(v);
          }}
          statusOptions={statusConfig.statuses}
          tagFilter={tagFilter}
          setTagFilter={(v) => {
            setOffset(0);
            setTagFilter(v);
          }}
          tagOptions={tagOptions}
          dateFrom={dateFrom}
          setDateFrom={setDateFrom}
          dateTo={dateTo}
          setDateTo={setDateTo}
          dateField={dateField}
          setDateField={setDateField}
          onSearch={() => {
            setOffset(0);
            loadOrders();
          }}
        />

        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
          <Checkbox
            checked={displayed.length > 0 && displayed.every((o) => selected.has(o.id))}
            indeterminate={
              displayed.some((o) => selected.has(o.id)) &&
              !displayed.every((o) => selected.has(o.id))
            }
            onChange={toggleSelectPage}
            data-testid="select-page"
          />
          <Typography variant="body2">
            {meta.total_count ?? displayed.length} registro(s)
            {showOnlySelected ? ' (somente selecionados)' : ''}
          </Typography>
          {showOnlySelected && (
            <Button size="small" onClick={() => setShowOnlySelected(false)}>
              Mostrar todos
            </Button>
          )}
        </Stack>

        {loading ? (
          <Box sx={{ py: 4, textAlign: 'center' }}>
            <CircularProgress sx={{ color: GREEN }} />
          </Box>
        ) : (
          displayed.map((o, i) => (
            <OrdersOrderCard
              key={o.id}
              order={o}
              selected={selected.has(o.id)}
              onToggleSelect={toggleSelect}
              awaitingStatus={statusConfig.awaiting}
              paidStatus={statusConfig.paid}
              labelFlags={labelFlags}
              onStatusChange={onStatusChange}
              onCreateLabel={onCreateLabel}
              onCancelLabel={onCancelLabel}
              onOpenCart={onOpenCart}
              onDelete={onDelete}
              onCopyTracking={onCopyTracking}
              zebra={i % 2 === 1}
            />
          ))
        )}

        {!loading && !showOnlySelected && (meta.total_count || 0) > PAGE_SIZE && (
          <Stack direction="row" spacing={1} justifyContent="center" sx={{ mt: 2 }}>
            <Button disabled={offset <= 0} onClick={() => setOffset((o) => Math.max(0, o - PAGE_SIZE))}>
              Anterior
            </Button>
            <Typography sx={{ alignSelf: 'center' }}>
              {offset + 1}–{Math.min(offset + PAGE_SIZE, meta.total_count)} de {meta.total_count}
            </Typography>
            <Button
              disabled={offset + PAGE_SIZE >= meta.total_count}
              onClick={() => setOffset((o) => o + PAGE_SIZE)}
            >
              Próxima
            </Button>
          </Stack>
        )}

        <OrdersBulkResultDialog
          open={Boolean(bulkResult)}
          onClose={() => setBulkResult(null)}
          title={bulkResult?.title}
          results={bulkResult?.results}
        />
      </Box>
    </ThemeProvider>
  );
}
