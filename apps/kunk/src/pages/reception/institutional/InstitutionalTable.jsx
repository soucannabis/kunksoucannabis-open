import React from 'react';
import {
  Avatar,
  Box,
  Chip,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import {
  contactEmail,
  contactPhone,
  displayName,
  documentLabel,
  formatCreated,
  statusLabel,
  typeLabel,
} from './institutionalStatus.js';

const GREEN = '#5a7a5b';

export default function InstitutionalTable({ rows, onOpen }) {
  return (
    <Box>
      <TableContainer component={Paper} className="pageContainerTable">
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: GREEN }}>
              {['', 'Nome', 'Documento', 'E-mail', 'Telefone', 'Tipo', 'Status', 'Criado'].map(
                (h) => (
                  <TableCell key={h || 'a'} sx={{ color: '#fff', fontWeight: 600 }}>
                    {h}
                  </TableCell>
                )
              )}
            </TableRow>
          </TableHead>
          <TableBody>
            {(rows || []).map((c) => (
              <TableRow key={c.id} hover>
                <TableCell>
                  <Avatar
                    sx={{ width: 36, height: 36, cursor: 'pointer', bgcolor: GREEN }}
                    onClick={() => onOpen(c)}
                  >
                    {(displayName(c) || '?').charAt(0)}
                  </Avatar>
                </TableCell>
                <TableCell>
                  <Typography
                    variant="body2"
                    sx={{ cursor: 'pointer', fontWeight: 600 }}
                    onClick={() => onOpen(c)}
                  >
                    {displayName(c)}
                  </Typography>
                  {typeLabel(c) === 'Empresa' && c.representative_name ? (
                    <Typography variant="caption" color="text.secondary" display="block">
                      Rep.: {[c.representative_name, c.representative_last_name]
                        .filter(Boolean)
                        .join(' ')}
                    </Typography>
                  ) : null}
                </TableCell>
                <TableCell>{documentLabel(c)}</TableCell>
                <TableCell>{contactEmail(c) || '—'}</TableCell>
                <TableCell>{contactPhone(c) || '—'}</TableCell>
                <TableCell>
                  <Chip
                    size="small"
                    label={typeLabel(c)}
                    sx={{ bgcolor: typeLabel(c) === 'Empresa' ? '#e8f0e8' : '#f0f0f0' }}
                  />
                </TableCell>
                <TableCell>{statusLabel(c)}</TableCell>
                <TableCell>{formatCreated(c)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}
