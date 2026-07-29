import React, { useMemo, useState } from 'react';
import {
  Box,
  Button,
  IconButton,
  Menu,
  MenuItem,
  Stack,
  Typography,
} from '@mui/material';
import CachedIcon from '@mui/icons-material/Cached';
import FilterAltIcon from '@mui/icons-material/FilterAlt';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import { FILTER_OPTIONS, statusLabel } from './associatesStatus.js';

const GREEN = '#5a7a5b';
const PURPLE = '#7a5b7a';

export default function AssociatesFilters({
  limit,
  filter,
  onFilterChange,
  onReload,
  onCreate,
  rows,
}) {
  const [anchor, setAnchor] = useState(null);

  const counts = useMemo(() => {
    const map = {};
    for (const opt of FILTER_OPTIONS) map[opt.value] = 0;
    for (const u of rows || []) {
      const label = statusLabel(u);
      const opt = FILTER_OPTIONS.find((o) => o.label === label);
      if (opt) map[opt.value] += 1;
    }
    return map;
  }, [rows]);

  return (
    <Box className="pageContainerOptions" sx={{ mb: 2 }}>
      <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
        <Button
          startIcon={<FilterAltIcon />}
          onClick={(e) => setAnchor(e.currentTarget)}
          sx={{ color: '#000' }}
        >
          Filtrar Associados
        </Button>
        <Menu anchorEl={anchor} open={Boolean(anchor)} onClose={() => setAnchor(null)}>
          <MenuItem
            selected={!filter}
            onClick={() => {
              onFilterChange('');
              setAnchor(null);
            }}
          >
            Todos
          </MenuItem>
          {FILTER_OPTIONS.map((o) => (
            <MenuItem
              key={o.value}
              selected={filter === o.value}
              onClick={() => {
                onFilterChange(o.value);
                setAnchor(null);
              }}
            >
              {o.label}
            </MenuItem>
          ))}
        </Menu>
        <Stack direction="row" spacing={1} alignItems="center">
          <IconButton onClick={onReload} sx={{ color: PURPLE }} title="Recarregar">
            <CachedIcon />
          </IconButton>
          <Button
            variant="contained"
            startIcon={<PersonAddIcon />}
            onClick={onCreate}
            sx={{ bgcolor: GREEN, '&:hover': { bgcolor: '#303B30' } }}
          >
            Criar Associado
          </Button>
        </Stack>
      </Stack>

      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 2 }}>
        {FILTER_OPTIONS.map((o) => (
          <Button
            key={o.value}
            size="small"
            variant={filter === o.value ? 'contained' : 'outlined'}
            onClick={() => onFilterChange(filter === o.value ? '' : o.value)}
            sx={{
              borderColor: GREEN,
              color: filter === o.value ? '#fff' : GREEN,
              bgcolor: filter === o.value ? GREEN : 'transparent',
              '&:hover': { borderColor: '#303B30' },
            }}
          >
            {o.label}: {counts[o.value] || 0}
          </Button>
        ))}
      </Stack>

      <Typography variant="body2" sx={{ color: '#000', mt: 2, textAlign: 'center' }}>
        Mostrando os últimos {limit} cadastros
      </Typography>
    </Box>
  );
}
