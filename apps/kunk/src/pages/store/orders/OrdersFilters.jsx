import React from 'react';
import {
  Autocomplete,
  Box,
  Button,
  Chip,
  FormControlLabel,
  IconButton,
  MenuItem,
  Radio,
  RadioGroup,
  Select,
  TextField,
  Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';

const GREEN = '#5a7a5b';
const GREEN_HOVER = '#4a6a4b';

function dateFieldLabel(dateField) {
  return dateField === 'payment_date' ? 'Data do pagamento' : 'Data de criação';
}

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
  onClearDates,
}) {
  const canClearDates = Boolean(dateFrom || dateTo);

  return (
    <Box data-testid="orders-filters" sx={{ width: '100%' }}>
      {/* Linha 1: filtro por data — centralizado como no legado */}
      <Box display="flex" justifyContent="center" alignItems="center" gap={1} mb={1.5} flexWrap="wrap">
        <Typography
          variant="body2"
          sx={{
            fontWeight: 700,
            color: GREEN,
            minWidth: { xs: '100%', sm: 'auto' },
            textAlign: { xs: 'center', sm: 'left' },
          }}
        >
          {dateFieldLabel(dateField)}
        </Typography>
        <TextField
          label="Data inicial"
          type="date"
          size="small"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          InputLabelProps={{ shrink: true }}
          sx={{ minWidth: 140 }}
        />
        <TextField
          label="Data final"
          type="date"
          size="small"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          InputLabelProps={{ shrink: true }}
          sx={{ minWidth: 140 }}
        />
        <Button
          variant="contained"
          size="small"
          onClick={onSearch}
          data-testid="orders-search-btn"
          sx={{
            minHeight: 40,
            backgroundColor: GREEN,
            '&:hover': { backgroundColor: GREEN_HOVER },
          }}
        >
          Buscar
        </Button>
        {canClearDates && (
          <IconButton
            size="small"
            aria-label="Limpar filtro de datas"
            onClick={onClearDates}
            sx={{ color: '#c62828' }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        )}
      </Box>

      {/* Linha 2: pesquisa, status e tags — centralizado */}
      <Box display="flex" justifyContent="center" alignItems="center" gap={2} mb={1} flexWrap="wrap">
        <TextField
          label="Pesquisar"
          variant="outlined"
          size="small"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && onSearch()}
          sx={{ minWidth: 180 }}
          data-testid="orders-search"
        />
        <Select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          displayEmpty
          size="small"
          sx={{ minWidth: 180 }}
          data-testid="orders-status-select"
        >
          <MenuItem value="">Todos os Status</MenuItem>
          {statusOptions.map((s) => (
            <MenuItem key={s.value || s} value={s.value || s}>
              {s.label || s}
            </MenuItem>
          ))}
        </Select>
        <Autocomplete
          multiple
          size="small"
          options={tagOptions}
          value={tagFilter}
          onChange={(_, newValue) => setTagFilter(newValue)}
          limitTags={2}
          sx={{ minWidth: 220 }}
          renderTags={(value, getTagProps) =>
            value.map((option, index) => (
              <Chip
                variant="outlined"
                label={option}
                size="small"
                {...getTagProps({ index })}
                key={option}
                sx={{ borderColor: GREEN, color: GREEN }}
              />
            ))
          }
          renderInput={(params) => (
            <TextField
              {...params}
              label="Tags"
              placeholder={tagFilter.length ? '' : 'Todas as tags'}
            />
          )}
        />
      </Box>

      {/* Ordenar — centralizado */}
      <Box display="flex" justifyContent="center" alignItems="center" flexWrap="wrap" gap={0.5} mb={1}>
        <Typography variant="body2" color="text.secondary" sx={{ mr: 0.5 }}>
          Ordenar:
        </Typography>
        <RadioGroup row value={dateField} onChange={(e) => setDateField(e.target.value)}>
          <FormControlLabel
            value="created_date"
            control={<Radio size="small" />}
            label="Data de criação"
          />
          <FormControlLabel
            value="payment_date"
            control={<Radio size="small" />}
            label="Data do pagamento"
          />
        </RadioGroup>
      </Box>
    </Box>
  );
}
