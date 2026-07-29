import React, { useState } from 'react';
import {
  Box,
  Button,
  IconButton,
  InputAdornment,
  Menu,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import CachedIcon from '@mui/icons-material/Cached';
import FilterAltIcon from '@mui/icons-material/FilterAlt';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import SearchIcon from '@mui/icons-material/Search';
import { FILTER_OPTIONS } from './associatesStatus.js';

const GREEN = '#5a7a5b';
const PURPLE = '#7a5b7a';

export const PAGE_SIZE_OPTIONS = [30, 50, 100, 250];

export default function AssociatesFilters({
  filter,
  onFilterChange,
  searchInput,
  onSearchInputChange,
  onSearch,
  onReload,
  onCreate,
  page,
  pageSize,
  totalCount,
}) {
  const [anchor, setAnchor] = useState(null);
  const filterActive = Boolean(filter);
  const total = Number(totalCount) || 0;
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  function submitSearch(e) {
    e?.preventDefault?.();
    onSearch?.();
  }

  return (
    <Box className="pageContainerOptions" sx={{ mb: 2 }}>
      <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
        <Box
          component="form"
          onSubmit={submitSearch}
          sx={{ flex: 1, maxWidth: 420, minWidth: { xs: 160, sm: 280 } }}
        >
          <TextField
            size="small"
            fullWidth
            placeholder="Pesquisar"
            value={searchInput}
            onChange={(e) => onSearchInputChange(e.target.value)}
            sx={{
              bgcolor: '#fff',
              '& .MuiOutlinedInput-root': {
                borderRadius: 2,
              },
            }}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    type="submit"
                    edge="end"
                    size="small"
                    title="Pesquisar"
                    sx={{ color: PURPLE }}
                    aria-label="Pesquisar"
                  >
                    <SearchIcon />
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
        </Box>
        <Stack direction="row" spacing={0.5} alignItems="center">
          <IconButton
            onClick={(e) => setAnchor(e.currentTarget)}
            sx={{ color: filterActive ? GREEN : PURPLE }}
            title={filterActive ? `Filtro: ${FILTER_OPTIONS.find((o) => o.value === filter)?.label || filter}` : 'Filtrar por status'}
          >
            <FilterAltIcon />
          </IconButton>
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
          <IconButton onClick={onReload} sx={{ color: PURPLE }} title="Recarregar">
            <CachedIcon />
          </IconButton>
          <Button
            variant="contained"
            startIcon={<PersonAddIcon />}
            onClick={onCreate}
            sx={{ bgcolor: GREEN, '&:hover': { bgcolor: '#303B30' }, ml: 0.5 }}
          >
            Criar Associado
          </Button>
        </Stack>
      </Stack>

      <Typography variant="body2" sx={{ color: '#000', mt: 3, pt: 1, textAlign: 'center' }}>
        {total === 0
          ? 'Nenhum cadastro encontrado'
          : `Mostrando ${from}–${to} de ${total} cadastro${total === 1 ? '' : 's'}`}
      </Typography>
    </Box>
  );
}
