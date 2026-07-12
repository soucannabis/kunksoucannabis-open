import React from 'react';
import { Box, Button, Chip, Stack, Typography } from '@mui/material';

const GREEN = '#5a7a5b';

export default function OrdersStatusChips({
  statusCounts,
  tagCounts,
  statusFilter,
  tagFilter,
  onStatusClick,
  onTagClick,
  onLoadFacets,
  facetsLoaded,
  loading,
}) {
  if (!facetsLoaded) {
    return (
      <Box sx={{ mb: 2 }}>
        <Button
          variant="outlined"
          size="small"
          onClick={onLoadFacets}
          disabled={loading}
          data-testid="show-status-counts"
          sx={{ borderColor: GREEN, color: GREEN }}
        >
          Ver contagem de status e tags
        </Button>
      </Box>
    );
  }

  const statuses = Object.entries(statusCounts || {}).filter(([k]) => k !== 'Entregue');
  const tags = Object.entries(tagCounts || {});

  return (
    <Box sx={{ mb: 2 }} data-testid="orders-facets">
      <Typography variant="subtitle2" sx={{ mb: 0.5, color: GREEN }}>
        Status
      </Typography>
      <Stack direction="row" flexWrap="wrap" gap={1} sx={{ mb: 1.5 }}>
        {statuses.map(([status, count]) => (
          <Chip
            key={status}
            label={`${status}: ${count}`}
            onClick={() => onStatusClick(status)}
            color={statusFilter === status ? 'success' : 'default'}
            variant={statusFilter === status ? 'filled' : 'outlined'}
            size="small"
            data-testid={`status-chip-${status}`}
          />
        ))}
      </Stack>
      {tags.length > 0 && (
        <>
          <Typography variant="subtitle2" sx={{ mb: 0.5, color: GREEN }}>
            Tags
          </Typography>
          <Stack direction="row" flexWrap="wrap" gap={1}>
            {tags.map(([tag, count]) => {
              const active = (tagFilter || []).includes(tag);
              return (
                <Chip
                  key={tag}
                  label={`${tag}: ${count}`}
                  onClick={() => onTagClick(tag)}
                  color={active ? 'secondary' : 'default'}
                  variant={active ? 'filled' : 'outlined'}
                  size="small"
                  data-testid={`tag-chip-${tag}`}
                />
              );
            })}
          </Stack>
        </>
      )}
    </Box>
  );
}
