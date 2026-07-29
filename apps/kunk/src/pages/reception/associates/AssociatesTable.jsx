import React from 'react';
import {
  Avatar,
  Box,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import LocalHospitalIcon from '@mui/icons-material/LocalHospital';
import { displayName, formatCreated, statusLabel } from './associatesStatus.js';

const GREEN = '#5a7a5b';

export default function AssociatesTable({
  rows,
  localQ,
  onLocalQ,
  onOpen,
  onSendTriage,
  patientNames,
}) {
  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'center', mb: 1.5 }}>
        <TextField
          size="small"
          placeholder="Filtrar..."
          value={localQ}
          onChange={(e) => onLocalQ(e.target.value)}
          sx={{
            minWidth: 280,
            bgcolor: '#fff',
            '& .MuiOutlinedInput-root': {
              borderRadius: 2,
              '& fieldset': { borderColor: '#fff' },
              '&:hover fieldset': { borderColor: '#fff' },
              '&.Mui-focused fieldset': { borderColor: '#fff' },
            },
          }}
        />
      </Box>
      <TableContainer component={Paper} className="pageContainerTable">
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: GREEN }}>
              {['', 'Nome', 'E-mail', 'Telefone', 'Status', 'Criado', 'Triagem'].map((h) => (
                <TableCell key={h || 'a'} sx={{ color: '#fff', fontWeight: 600 }}>
                  {h}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {(rows || []).map((u) => {
              const patientSub = patientNames?.[u.user_code] || patientNames?.[String(u.id)];
              return (
                <TableRow key={u.id} hover>
                  <TableCell>
                    <Avatar
                      src={u.avatar_url || undefined}
                      sx={{ width: 36, height: 36, cursor: 'pointer', bgcolor: GREEN }}
                      onClick={() => onOpen(u)}
                    >
                      {(displayName(u) || '?').charAt(0)}
                    </Avatar>
                  </TableCell>
                  <TableCell>
                    <Typography
                      variant="body2"
                      sx={{ cursor: 'pointer', fontWeight: 600 }}
                      onClick={() => onOpen(u)}
                    >
                      {displayName(u)}
                    </Typography>
                    {patientSub ? (
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{ fontWeight: 400, display: 'block' }}
                      >
                        {patientSub}
                      </Typography>
                    ) : null}
                  </TableCell>
                  <TableCell>{u.email_account || '—'}</TableCell>
                  <TableCell>{u.mobile_number || '—'}</TableCell>
                  <TableCell>{statusLabel(u)}</TableCell>
                  <TableCell>{formatCreated(u)}</TableCell>
                  <TableCell>
                    {String(u.status) === 'Associado' ? (
                      <Tooltip title="Enviar para triagem">
                        <IconButton size="small" onClick={() => onSendTriage(u)} sx={{ color: GREEN }}>
                          <LocalHospitalIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    ) : null}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}
