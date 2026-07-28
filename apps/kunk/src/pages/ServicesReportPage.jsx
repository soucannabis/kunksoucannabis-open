import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Box,
  Button,
  Checkbox,
  CircularProgress,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  Autocomplete,
} from '@mui/material';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import RefreshIcon from '@mui/icons-material/Refresh';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import ClearIcon from '@mui/icons-material/Clear';
import DoneIcon from '@mui/icons-material/Done';
import WarningIcon from '@mui/icons-material/Warning';
import LogoutIcon from '@mui/icons-material/Logout';
import { jsPDF } from 'jspdf';
import { autoTable } from 'jspdf-autotable';
import { createApiClient } from '@kunk/api-client';
import { getKunkPublicConfig } from '@kunk/config';
import { useErrorModal } from '../components/errors/ErrorModalProvider.jsx';
import { formatMoney } from './reception/services/servicesUtils.js';

const muiTheme = createTheme();
const GREEN = '#5a7a5b';
const PURPLE = '#7a5b7a';

function formatMonthYear(dateStr) {
  if (!dateStr) return null;
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime()) || date.getFullYear() < 1970) return null;
  return date.toLocaleString('pt-BR', { month: 'long', year: 'numeric' }).replace(' de ', ' ');
}

function getCurrentMonthYear() {
  const now = new Date();
  return now.toLocaleString('pt-BR', { month: 'long', year: 'numeric' }).replace(' de ', ' ');
}

function getMonthsOfCurrentYear() {
  const months = [];
  const now = new Date();
  for (let i = 0; i <= now.getMonth(); i += 1) {
    const d = new Date(now.getFullYear(), i, 1);
    months.push(d.toLocaleString('pt-BR', { month: 'long', year: 'numeric' }).replace(' de ', ' '));
  }
  return months;
}

function monthLabelToYearMonth(label) {
  if (!label) return null;
  const [monthName, year] = label.split(' ');
  const months = [
    'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
    'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
  ];
  const idx = months.findIndex((m) => m === String(monthName || '').toLowerCase());
  if (idx < 0 || !year) return null;
  return `${year}-${String(idx + 1).padStart(2, '0')}`;
}

function professionalDisplayName(p) {
  if (!p) return '—';
  return `${p.name || ''} ${p.last_name || ''}`.trim() || p.professional_name || '—';
}

/**
 * @param {{ mode?: 'staff' | 'portal', onLogout?: () => void }} props
 */
export default function ServicesReportPage({ mode = 'staff', onLogout }) {
  const isPortal = mode === 'portal';
  const bootstrap = getKunkPublicConfig();
  const api = useMemo(() => createApiClient({ baseUrl: bootstrap.apiUrl, app: 'kunk' }), [bootstrap.apiUrl]);
  const { showError } = useErrorModal();

  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonthYear());
  const [selectedProfessional, setSelectedProfessional] = useState(null);
  const [services, setServices] = useState([]);
  const [professionals, setProfessionals] = useState([]);
  const [totals, setTotals] = useState({ count: 0, payable_sum: 0, association_fee_sum: 0 });
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState([]);
  const [contestOpen, setContestOpen] = useState(false);
  const [contestText, setContestText] = useState('');
  const [contestBusy, setContestBusy] = useState(false);

  const monthOptions = useMemo(() => getMonthsOfCurrentYear(), []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      const ym = monthLabelToYearMonth(selectedMonth);
      if (ym) params.set('month', ym);
      if (!isPortal && selectedProfessional?.professional_code) {
        params.set('professional_id', selectedProfessional.professional_code);
      }
      const res = await api.getServicesReport(params.toString() ? `?${params}` : '');
      const data = res.data || {};
      setServices(Array.isArray(data.services) ? data.services : []);
      setProfessionals(Array.isArray(data.professionals) ? data.professionals : []);
      setTotals(data.totals || { count: 0, payable_sum: 0 });
      setSelectedIds([]);
    } catch (err) {
      showError(err);
      setServices([]);
      setProfessionals([]);
    } finally {
      setLoading(false);
    }
  }, [api, selectedMonth, selectedProfessional, isPortal, showError]);

  useEffect(() => {
    load();
  }, [load]);

  const professionalOptions = useMemo(() => {
    const map = new Map();
    for (const p of professionals) {
      const code = p.professional_code;
      if (code) map.set(String(code), p);
    }
    for (const s of services) {
      if (s.professional_id && !map.has(String(s.professional_id))) {
        map.set(String(s.professional_id), {
          professional_code: s.professional_id,
          name: s.professional_name,
          last_name: '',
        });
      }
    }
    return [...map.values()].sort((a, b) =>
      professionalDisplayName(a).localeCompare(professionalDisplayName(b), 'pt-BR')
    );
  }, [professionals, services]);

  const grouped = useMemo(() => {
    const tree = {};
    for (const service of services) {
      const monthYear = formatMonthYear(service.consultation_date);
      if (!monthYear) continue;
      const profName =
        service.professional_name ||
        professionalDisplayName(
          professionals.find((p) => String(p.professional_code) === String(service.professional_id))
        );
      if (!tree[monthYear]) tree[monthYear] = {};
      if (!tree[monthYear][profName]) tree[monthYear][profName] = [];
      tree[monthYear][profName].push(service);
    }
    return tree;
  }, [services, professionals]);

  const showTotals = Boolean(selectedProfessional) || isPortal;

  function toggleSelect(service, checked) {
    setSelectedIds((prev) => {
      if (checked) return prev.includes(service.id) ? prev : [...prev, service.id];
      return prev.filter((id) => id !== service.id);
    });
  }

  async function handleValidation(validationType) {
    try {
      await api.validateServicesReport({
        ids: selectedIds,
        commission_validation: validationType,
      });
      await load();
    } catch (err) {
      showError(err);
    }
  }

  async function resolveContest(professional, index) {
    try {
      await api.deleteProfessionalContestReport(professional.id, index);
      await load();
    } catch (err) {
      showError(err);
    }
  }

  async function submitContest() {
    const pro = professionals[0];
    if (!pro?.id || !contestText.trim()) return;
    setContestBusy(true);
    try {
      await api.addProfessionalContestReport(pro.id, {
        text: contestText.trim(),
        month: selectedMonth,
      });
      setContestText('');
      setContestOpen(false);
      await load();
    } catch (err) {
      showError(err);
    } finally {
      setContestBusy(false);
    }
  }

  function exportPdf() {
    const doc = new jsPDF();
    doc.text('Relatório de Serviços', 14, 12);
    let y = 20;
    if (showTotals) {
      doc.text(`Total de registros: ${totals.count}`, 14, y);
      y += 7;
      doc.text(
        `Valor a receber: R$ ${Number(totals.payable_sum || 0).toFixed(2).replace('.', ',')}`,
        14,
        y
      );
      y += 10;
    }
    Object.entries(grouped).forEach(([monthYear, professionalsGroup]) => {
      doc.text(monthYear, 14, y);
      y += 7;
      Object.entries(professionalsGroup).forEach(([profName, list]) => {
        doc.text(`Profissional: ${profName}`, 14, y);
        y += 5;
        const rows = list.map((service) => [
          service.consultation_date
            ? new Date(service.consultation_date).toLocaleString('pt-BR')
            : '-',
          service.associate_name || '-',
          formatMoney(
            service.price_paid != null && service.price_paid !== ''
              ? service.price_paid
              : (Number(service.price) || 0) - (Number(service.donation) || 0)
          ),
          formatMoney(service.donation),
          formatMoney(service.price),
          formatMoney(service.payable),
        ]);
        autoTable(doc, {
          head: [['Data', 'Associado', 'Valor pago', 'Doação', 'Consulta', 'A receber']],
          body: rows,
          startY: y,
          styles: { fontSize: 8 },
        });
        y = (doc.lastAutoTable?.finalY || y) + 8;
      });
    });
    const profLabel = selectedProfessional
      ? professionalDisplayName(selectedProfessional).replace(/[\\/:*?"<>|]/g, '')
      : isPortal
        ? 'Portal'
        : 'Todos';
    const now = new Date();
    const stamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    doc.save(`${stamp} - Relatorio-Servicos - ${profLabel}.pdf`);
  }

  function contestsForProfessional(profName) {
    const professional = professionals.find(
      (p) => professionalDisplayName(p) === profName || p.name === profName
    );
    if (!professional?.contest_reports) return { professional: null, contests: [] };
    const contests = (professional.contest_reports || []).filter((c) => {
      if (!selectedMonth) return true;
      return c.month === selectedMonth;
    });
    return { professional, contests };
  }

  return (
    <ThemeProvider theme={muiTheme}>
    <Box>
      <Box
        className="pageContainerOptions"
        sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}
      >
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
          <FormControl size="small" sx={{ minWidth: 180 }}>
            <InputLabel>Mês/Ano</InputLabel>
            <Select
              value={selectedMonth}
              label="Mês/Ano"
              onChange={(e) => setSelectedMonth(e.target.value)}
            >
              {monthOptions.map((month) => (
                <MenuItem key={month} value={month}>
                  {month.charAt(0).toUpperCase() + month.slice(1)}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          {!isPortal && (
            <Autocomplete
              size="small"
              options={professionalOptions}
              value={selectedProfessional}
              onChange={(_, v) => setSelectedProfessional(v)}
              getOptionLabel={(o) => professionalDisplayName(o)}
              isOptionEqualToValue={(a, b) =>
                String(a?.professional_code) === String(b?.professional_code)
              }
              renderInput={(params) => <TextField {...params} label="Profissional" />}
              sx={{ minWidth: 240 }}
            />
          )}
        </Box>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          {isPortal && (
            <Button
              variant="contained"
              color="warning"
              startIcon={<WarningIcon />}
              onClick={() => setContestOpen(true)}
            >
              Estão faltando dados
            </Button>
          )}
          <Button variant="contained" color="primary" onClick={exportPdf} disabled={loading}>
            Exportar PDF
          </Button>
          <Button
            variant="contained"
            onClick={load}
            disabled={loading}
            startIcon={loading ? <CircularProgress size={18} sx={{ color: '#fff' }} /> : <RefreshIcon />}
            sx={{ bgcolor: PURPLE, '&:hover': { bgcolor: '#684a68' } }}
          >
            Atualizar
          </Button>
          {isPortal && onLogout && (
            <Button
              variant="contained"
              color="error"
              startIcon={<LogoutIcon />}
              onClick={onLogout}
            >
              Sair
            </Button>
          )}
        </Box>
      </Box>

      <TableContainer className="pageContainerTable" component={Paper} sx={{ minHeight: 400, mt: 2 }}>
        <Typography variant="h6" sx={{ m: 2 }}>
          Relatório de Serviços (Agrupado por Mês e Profissional)
        </Typography>
        {showTotals && (
          <Box sx={{ m: 2, mt: 0 }}>
            <Typography variant="subtitle1">
              Valor a receber: <b>{formatMoney(totals.payable_sum)}</b>
            </Typography>
            {Number(totals.association_fee_sum) > 0 && (
              <Typography variant="body2" color="text.secondary">
                Já com desconto da taxa de associação ({formatMoney(totals.association_fee_sum)})
              </Typography>
            )}
          </Box>
        )}
        {loading ? (
          <CircularProgress sx={{ m: 3 }} />
        ) : Object.keys(grouped).length === 0 ? (
          <Typography sx={{ m: 3 }} color="text.secondary">
            Nenhum serviço pago com data de consulta neste período.
          </Typography>
        ) : (
          Object.entries(grouped).map(([monthYear, professionalsGroup]) => (
            <Box key={monthYear} sx={{ mb: 4 }}>
              <Typography variant="subtitle1" sx={{ m: 2, fontWeight: 'bold' }}>
                {monthYear.charAt(0).toUpperCase() + monthYear.slice(1)}
              </Typography>
              {Object.entries(professionalsGroup).map(([profName, list]) => {
                const { professional, contests } = contestsForProfessional(profName);
                const groupPayable = list.reduce((a, s) => a + (Number(s.payable) || 0), 0);
                return (
                  <Box key={profName} sx={{ mb: 4, ml: 2 }}>
                    <Typography variant="subtitle2" sx={{ m: 1 }}>
                      Profissional: <b>{profName}</b>
                    </Typography>
                    <Typography variant="subtitle1" sx={{ m: 1, mt: 0 }}>
                      Valor a receber: <b>{formatMoney(groupPayable)}</b>
                    </Typography>
                    {(() => {
                      const groupFee = list.reduce((a, s) => a + (Number(s.association_fee) || 0), 0);
                      if (groupFee <= 0) return null;
                      return (
                        <Typography variant="body2" color="text.secondary" sx={{ m: 1, mt: 0 }}>
                          Taxa de associação retida: {formatMoney(groupFee)}
                        </Typography>
                      );
                    })()}

                    {contests.length > 0 && (
                      <Box sx={{ ml: 2, mb: 2, maxWidth: 600 }}>
                        <Typography variant="subtitle2" color="error" sx={{ mb: 1 }}>
                          Estão faltando os seguintes dados:
                        </Typography>
                        {contests.map((contest) => {
                          const fullIndex = (professional.contest_reports || []).indexOf(contest);
                          return (
                          <Box
                            key={`${contest.date}-${fullIndex}`}
                            sx={{
                              mb: 1,
                              p: 1,
                              backgroundColor: 'rgba(244, 67, 54, 0.1)',
                              borderRadius: 1,
                              display: 'flex',
                              justifyContent: 'space-between',
                            }}
                          >
                            <Box>
                              <Typography variant="body2" color="text.secondary">
                                {String(contest.date || '').replace('T', ' ').replace(/\..*$/, '')}
                              </Typography>
                              <Typography variant="body2">{contest.text}</Typography>
                            </Box>
                            {!isPortal && professional?.id != null && fullIndex >= 0 && (
                              <IconButton
                                color="success"
                                size="small"
                                onClick={() => resolveContest(professional, fullIndex)}
                              >
                                <DoneIcon />
                              </IconButton>
                            )}
                          </Box>
                          );
                        })}
                      </Box>
                    )}

                    {!isPortal && selectedIds.length > 0 && (
                      <Box sx={{ my: 2 }}>
                        <Button
                          variant="contained"
                          color="success"
                          sx={{ mr: 1 }}
                          startIcon={<CheckCircleIcon />}
                          onClick={() => handleValidation('approved')}
                        >
                          Aprovar ({selectedIds.length})
                        </Button>
                        <Button
                          variant="contained"
                          color="error"
                          sx={{ mr: 1 }}
                          startIcon={<CancelIcon />}
                          onClick={() => handleValidation('contested')}
                        >
                          Contestar ({selectedIds.length})
                        </Button>
                        <Button
                          variant="contained"
                          color="info"
                          startIcon={<ClearIcon />}
                          onClick={() => setSelectedIds([])}
                        >
                          Limpar seleção
                        </Button>
                      </Box>
                    )}

                    <Table size="small">
                      <TableHead>
                        <TableRow sx={{ backgroundColor: GREEN }}>
                          {!isPortal && (
                            <TableCell sx={{ color: '#fff', width: 50 }}>Sel</TableCell>
                          )}
                          <TableCell sx={{ color: '#fff' }}>Data</TableCell>
                          <TableCell sx={{ color: '#fff' }}>Associado</TableCell>
                          <TableCell sx={{ color: '#fff' }}>Valor pago</TableCell>
                          <TableCell sx={{ color: '#fff' }}>Doação</TableCell>
                          <TableCell sx={{ color: '#fff' }}>Valor da consulta</TableCell>
                          <TableCell sx={{ color: '#fff' }}>Valor a receber</TableCell>
                          <TableCell sx={{ color: '#fff' }}>Validação</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {list.map((service) => (
                          <TableRow key={service.id}>
                            {!isPortal && (
                              <TableCell>
                                <Checkbox
                                  checked={selectedIds.includes(service.id)}
                                  onChange={(e) => toggleSelect(service, e.target.checked)}
                                  sx={{ color: GREEN, '&.Mui-checked': { color: GREEN } }}
                                />
                              </TableCell>
                            )}
                            <TableCell>
                              {service.consultation_date
                                ? new Date(service.consultation_date).toLocaleString('pt-BR')
                                : '—'}
                            </TableCell>
                            <TableCell>{service.associate_name || '—'}</TableCell>
                            <TableCell>
                              {formatMoney(
                                service.price_paid != null && service.price_paid !== ''
                                  ? service.price_paid
                                  : (Number(service.price) || 0) - (Number(service.donation) || 0)
                              )}
                            </TableCell>
                            <TableCell>{formatMoney(service.donation)}</TableCell>
                            <TableCell>{formatMoney(service.price)}</TableCell>
                            <TableCell>{formatMoney(service.payable)}</TableCell>
                            <TableCell>
                              {service.commission_validation === 'approved'
                                ? 'Aprovado'
                                : service.commission_validation === 'contested'
                                  ? 'Contestado'
                                  : '—'}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </Box>
                );
              })}
            </Box>
          ))
        )}
      </TableContainer>

      {contestOpen && (
        <Box
          sx={{
            position: 'fixed',
            inset: 0,
            bgcolor: 'rgba(0,0,0,0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1300,
          }}
        >
          <Paper sx={{ p: 3, width: 420, maxWidth: '90vw' }}>
            <Typography variant="h6" gutterBottom>
              Contestar relatório
            </Typography>
            <TextField
              autoFocus
              fullWidth
              multiline
              rows={4}
              label="Motivo da contestação"
              value={contestText}
              onChange={(e) => setContestText(e.target.value)}
            />
            <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
              <Button onClick={() => setContestOpen(false)}>Cancelar</Button>
              <Button
                variant="contained"
                color="error"
                disabled={!contestText.trim() || contestBusy}
                onClick={submitContest}
              >
                Enviar
              </Button>
            </Box>
          </Paper>
        </Box>
      )}
    </Box>
    </ThemeProvider>
  );
}
