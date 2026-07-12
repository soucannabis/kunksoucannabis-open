import React, { useMemo, useState } from 'react';
import {
  Box,
  Button,
  IconButton,
  Menu,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import CachedIcon from '@mui/icons-material/Cached';
import FilterAltIcon from '@mui/icons-material/FilterAlt';
import BusinessIcon from '@mui/icons-material/Business';
import { FILTER_OPTIONS } from './institutionalStatus.js';

const GREEN = '#5a7a5b';
const PURPLE = '#7a5b7a';

export default function InstitutionalFilters({
  shownCount = 0,
  totalCount = null,
  filter,
  onFilterChange,
  onReload,
  onCreate,
  localQ,
  onLocalQ,
}) {
  const [anchor, setAnchor] = useState(null);

  const countLabel = useMemo(() => {
    const shown = Number(shownCount) || 0;
    const total = totalCount != null ? Number(totalCount) : null;
    if (total != null && total !== shown) {
      return `Mostrando ${shown} de ${total} cadastro${total === 1 ? '' : 's'}`;
    }
    return `Mostrando ${shown} cadastro${shown === 1 ? '' : 's'}`;
  }, [shownCount, totalCount]);

  const filterLabel = FILTER_OPTIONS.find((o) => o.value === filter)?.label || 'Todos';

  return (
    <Box className="pageContainerOptions" sx={{ mb: 2 }}>
      <Stack
        direction="row"
        spacing={1}
        flexWrap="wrap"
        alignItems="center"
        justifyContent="space-between"
        useFlexGap
      >
        <Stack direction="row" spacing={1} flexWrap="wrap" alignItems="center" useFlexGap>
          <IconButton onClick={onReload} sx={{ color: PURPLE }} title="Recarregar">
            <CachedIcon />
          </IconButton>
          <Button
            startIcon={<FilterAltIcon />}
            onClick={(e) => setAnchor(e.currentTarget)}
            sx={{ color: '#000' }}
          >
            Filtrar{filter ? `: ${filterLabel}` : ''}
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
          <TextField
            size="small"
            placeholder="Pesquisar..."
            value={localQ}
            onChange={(e) => onLocalQ(e.target.value)}
            sx={{ minWidth: 280, bgcolor: '#fff' }}
          />
          <Typography variant="body2" sx={{ color: '#000' }}>
            {countLabel}
          </Typography>
        </Stack>

        <Button
          variant="contained"
          startIcon={<BusinessIcon />}
          onClick={onCreate}
          sx={{ bgcolor: GREEN, '&:hover': { bgcolor: '#303B30' } }}
        >
          Criar Cliente Institucional
        </Button>
      </Stack>
    </Box>
  );
}
