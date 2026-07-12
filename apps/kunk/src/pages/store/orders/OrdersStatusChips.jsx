import React from 'react';
import { Box, Button, Chip, CircularProgress, Typography } from '@mui/material';

const GREEN = '#5a7a5b';

/** Cores de facet no estilo legado (bootstrap). */
const STATUS_CHIP_COLORS = {
  'Aguardando pagamento': { bg: '#FFF3CD', color: '#856404' },
  'Pagamento concluído': { bg: '#D1E7DD', color: '#0F5132' },
  'Em produção': { bg: '#CCE5FF', color: '#004085' },
  Enviado: { bg: '#D4EDDA', color: '#155724' },
  Entregue: { bg: '#D1E7DD', color: '#0F5132' },
  Cancelado: { bg: '#F8D7DA', color: '#842029' },
};

function chipColors(status) {
  return STATUS_CHIP_COLORS[status] || { bg: '#E2E3E5', color: '#41464B' };
}

/** Só contabilidade de status — no legado tags não entram neste bloco. */
export default function OrdersStatusChips({
  statusCounts,
  statusFilter,
  onStatusClick,
  onLoadFacets,
  facetsLoaded,
  loading,
}) {
  return (
    <Box
      data-testid="orders-facets"
      display="flex"
      flexWrap="wrap"
      gap={2}
      justifyContent="center"
      sx={{
        width: '100%',
        padding: '16px',
        borderRadius: '8px',
        marginBottom: '26px',
      }}
    >
      {!facetsLoaded ? (
        loading ? (
          <Box display="flex" flexDirection="column" alignItems="center" gap={1} width="100%" py={1}>
            <CircularProgress size={28} sx={{ color: GREEN }} />
            <Typography variant="body2" sx={{ color: GREEN, fontWeight: 600 }}>
              Contabilizando status…
            </Typography>
          </Box>
        ) : (
          <Button
            variant="outlined"
            onClick={onLoadFacets}
            disabled={loading}
            data-testid="show-status-counts"
            sx={{
              textTransform: 'none',
              fontWeight: 600,
              borderColor: GREEN,
              color: GREEN,
              '&:hover': {
                borderColor: '#4a6a4b',
                backgroundColor: 'rgba(90, 122, 91, 0.06)',
              },
            }}
          >
            Ver contabilidade dos status
          </Button>
        )
      ) : (
        Object.entries(statusCounts || {})
          .filter(([status]) => status !== 'Entregue')
          .map(([status, count]) => {
            const { bg, color } = chipColors(status);
            const active = statusFilter === status;
            return (
              <Chip
                key={status}
                label={`${status}: ${count}`}
                onClick={() => onStatusClick(status)}
                data-testid={`status-chip-${status}`}
                sx={{
                  backgroundColor: active ? GREEN : bg,
                  color: active ? '#fff' : color,
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  '&:hover': { opacity: 0.85, transform: 'scale(1.05)' },
                }}
              />
            );
          })
      )}
    </Box>
  );
}
