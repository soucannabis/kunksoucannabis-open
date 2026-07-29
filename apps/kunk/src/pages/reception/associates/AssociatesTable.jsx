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
  Tooltip,
  Typography,
} from '@mui/material';
import LocalHospitalIcon from '@mui/icons-material/LocalHospital';
import AssociateStatusChip from './AssociateStatusChip.jsx';
import { displayName, formatCreated, formatPhoneBr } from './associatesStatus.js';

const GREEN = '#5a7a5b';

export default function AssociatesTable({
  rows,
  onOpen,
  onSendTriage,
  patientNames,
}) {
  return (
    <Box>
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
                  <TableCell>{formatPhoneBr(u.mobile_number)}</TableCell>
                  <TableCell>
                    <AssociateStatusChip user={u} />
                  </TableCell>
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
