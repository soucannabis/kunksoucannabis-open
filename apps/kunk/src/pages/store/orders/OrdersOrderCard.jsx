import React from 'react';
import {
  Box,
  Button,
  Checkbox,
  Chip,
  IconButton,
  MenuItem,
  Paper,
  Select,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import CancelOutlinedIcon from '@mui/icons-material/CancelOutlined';

const GREEN = '#5a7a5b';
const ZEBRA = 'rgb(243, 243, 243)';

function formatMoney(n) {
  return Number(n || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatDate(v) {
  if (!v) return '—';
  try {
    return new Date(v).toLocaleString('pt-BR');
  } catch {
    return String(v);
  }
}

function addressLine(addr) {
  if (!addr || typeof addr !== 'object') return '—';
  const parts = [
    addr.street,
    addr.number || addr.street_number,
    addr.neighborhood,
    addr.city,
    addr.state,
    addr.cep,
  ].filter(Boolean);
  return parts.join(', ') || '—';
}

export default function OrdersOrderCard({
  order,
  selected,
  onToggleSelect,
  awaitingStatus,
  paidStatus,
  labelFlags,
  onStatusChange,
  onCreateLabel,
  onCancelLabel,
  onOpenCart,
  onDelete,
  onCopyTracking,
  zebra,
}) {
  const canToggle =
    order.status === awaitingStatus || order.status === paidStatus;
  const preferred = String(order.freight_carrier || '').toLowerCase();
  const hasTracking = Boolean(order.tracking_code || order.carrier_order_code);
  const tags = Array.isArray(order.tags)
    ? order.tags.map((t) => (typeof t === 'string' ? t : t?.tag)).filter(Boolean)
    : [];
  const items = Array.isArray(order.items) ? order.items : [];

  return (
    <Paper
      elevation={0}
      data-testid={`order-card-${order.id}`}
      sx={{
        p: 1.5,
        mb: 1,
        border: '1px solid #ddd',
        borderRadius: 1,
        bgcolor: zebra ? ZEBRA : '#fff',
      }}
    >
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1}>
        <Stack direction="row" spacing={1} alignItems="center">
          <Checkbox
            checked={selected}
            onChange={() => onToggleSelect(order.id)}
            data-testid={`order-select-${order.id}`}
          />
          <Box>
            <Typography fontWeight={700}>
              #{order.id} — {order.associate_name || 'Sem nome'}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Criado: {formatDate(order.date_created || order.created_date)}
              {order.payment_date ? ` · Pago: ${formatDate(order.payment_date)}` : ''}
            </Typography>
          </Box>
        </Stack>
        <Box sx={{ textAlign: 'right' }}>
          {canToggle ? (
            <Select
              size="small"
              value={order.status}
              onChange={(e) => onStatusChange(order, e.target.value)}
              data-testid={`order-status-${order.id}`}
              sx={{ minWidth: 200, fontSize: 13 }}
            >
              <MenuItem value={awaitingStatus}>{awaitingStatus}</MenuItem>
              <MenuItem value={paidStatus}>{paidStatus}</MenuItem>
            </Select>
          ) : (
            <Chip size="small" label={order.status || 'Sem status'} sx={{ bgcolor: GREEN, color: '#fff' }} />
          )}
        </Box>
      </Stack>

      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mt: 1.5 }}>
        <Box sx={{ flex: 1 }}>
          <Typography variant="body2">
            <strong>Endereço:</strong> {addressLine(order.address)}
          </Typography>
          {order.details || order.info ? (
            <Typography variant="body2" sx={{ mt: 0.5 }}>
              <strong>Info:</strong> {order.details || order.info}
            </Typography>
          ) : null}
        </Box>
        <Box sx={{ flex: 1 }}>
          {items.slice(0, 5).map((it, i) => (
            <Typography key={i} variant="body2">
              {(it.quantity || 1) * 1}× {it.name || it.code} — {formatMoney(it.amount)}
            </Typography>
          ))}
          {items.length > 5 && (
            <Typography variant="caption">+{items.length - 5} itens</Typography>
          )}
          <Typography fontWeight={700} sx={{ mt: 0.5 }}>
            Total: {formatMoney(order.total)}
          </Typography>
          {hasTracking && (
            <Stack direction="row" alignItems="center" spacing={0.5}>
              <Typography variant="body2">
                Rastreio: {order.tracking_code || order.carrier_order_code}
              </Typography>
              <IconButton size="small" onClick={() => onCopyTracking(order)}>
                <ContentCopyIcon fontSize="small" />
              </IconButton>
            </Stack>
          )}
        </Box>
        <Box sx={{ minWidth: 180 }}>
          <Stack direction="row" flexWrap="wrap" gap={0.5} sx={{ mb: 1 }}>
            {tags.map((t) => (
              <Chip key={t} label={t} size="small" />
            ))}
          </Stack>
          <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
            {labelFlags.loggi && (
              <>
                <Tooltip title="Etiqueta Loggi">
                  <Button
                    size="small"
                    variant={preferred === 'loggi' ? 'contained' : 'outlined'}
                    onClick={() => onCreateLabel(order, 'loggi')}
                    sx={{ minWidth: 36, bgcolor: preferred === 'loggi' ? GREEN : undefined }}
                    data-testid={`label-loggi-${order.id}`}
                  >
                    <LocalShippingIcon fontSize="small" />
                  </Button>
                </Tooltip>
                {hasTracking && preferred !== 'melhorenvio' && (
                  <Tooltip title="Cancelar Loggi">
                    <Button
                      size="small"
                      variant="outlined"
                      color="error"
                      onClick={() => onCancelLabel(order, 'loggi')}
                      data-testid={`cancel-loggi-${order.id}`}
                    >
                      <CancelOutlinedIcon fontSize="small" />
                    </Button>
                  </Tooltip>
                )}
              </>
            )}
            {labelFlags.melhorenvio && (
              <>
                <Tooltip title="Etiqueta Melhor Envio">
                  <Button
                    size="small"
                    variant={preferred === 'melhorenvio' ? 'contained' : 'outlined'}
                    onClick={() => onCreateLabel(order, 'melhorenvio')}
                    data-testid={`label-me-${order.id}`}
                  >
                    ME
                  </Button>
                </Tooltip>
                {hasTracking && preferred !== 'loggi' && (
                  <Tooltip title="Cancelar Melhor Envio">
                    <Button
                      size="small"
                      variant="outlined"
                      color="error"
                      onClick={() => onCancelLabel(order, 'melhorenvio')}
                      data-testid={`cancel-me-${order.id}`}
                    >
                      <CancelOutlinedIcon fontSize="small" />
                    </Button>
                  </Tooltip>
                )}
              </>
            )}
            <Tooltip title="Retornar ao carrinho">
              <Button size="small" variant="outlined" onClick={() => onOpenCart(order)} data-testid={`cart-${order.id}`}>
                <ShoppingCartIcon fontSize="small" />
              </Button>
            </Tooltip>
            <Tooltip title="Excluir">
              <Button size="small" variant="outlined" color="error" onClick={() => onDelete(order)} data-testid={`delete-${order.id}`}>
                <DeleteOutlineIcon fontSize="small" />
              </Button>
            </Tooltip>
          </Stack>
        </Box>
      </Stack>
    </Paper>
  );
}
