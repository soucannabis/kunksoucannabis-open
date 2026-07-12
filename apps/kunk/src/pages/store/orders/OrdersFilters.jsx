import React from 'react';
import {
  Autocomplete,
  Box,
  Chip,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material';

export default function OrdersFilters({
  q,
  setQ,
  statusFilter,
  setStatusFilter,
  statusOptions,
  tagFilter,
  setTagFilter,
  tagOptions,
  dateFrom,
  setDateFrom,
  dateTo,
  setDateTo,
  dateField,
  setDateField,
  onSearch,
}) {
  return (
    <Box sx={{ mb: 2 }} data-testid="orders-filters">
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} flexWrap="wrap" useFlexGap>
        <TextField
          size="small"
          label="Pesquisar"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && onSearch()}
          sx={{ minWidth: 200 }}
          data-testid="orders-search"
        />
        <FormControl size="small" sx={{ minWidth: 200 }}>
          <InputLabel>Status</InputLabel>
          <Select
            label="Status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            data-testid="orders-status-select"
          >
            <MenuItem value="">Todos</MenuItem>
            {statusOptions.map((s) => (
              <MenuItem key={s.value || s} value={s.value || s}>
                {s.label || s}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <Autocomplete
          multiple
          size="small"
          options={tagOptions}
          value={tagFilter}
          onChange={(_, v) => setTagFilter(v)}
          renderTags={(value, getTagProps) =>
            value.map((option, index) => (
              <Chip variant="outlined" label={option} size="small" {...getTagProps({ index })} key={option} />
            ))
          }
          renderInput={(params) => <TextField {...params} label="Tags" />}
          sx={{ minWidth: 220, flex: 1 }}
        />
        <TextField
          size="small"
          type="date"
          label="Data inicial"
          InputLabelProps={{ shrink: true }}
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
        />
        <TextField
          size="small"
          type="date"
          label="Data final"
          InputLabelProps={{ shrink: true }}
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
        />
        <ToggleButtonGroup
          size="small"
          exclusive
          value={dateField}
          onChange={(_, v) => v && setDateField(v)}
        >
          <ToggleButton value="created_date">Criação</ToggleButton>
          <ToggleButton value="payment_date">Pagamento</ToggleButton>
        </ToggleButtonGroup>
      </Stack>
    </Box>
  );
}
