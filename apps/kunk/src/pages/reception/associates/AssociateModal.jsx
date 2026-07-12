import React, { useCallback, useEffect, useState } from 'react';
import {
  Avatar,
  Box,
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Menu,
  Stack,
  Tab,
  Tabs,
  Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import DescriptionIcon from '@mui/icons-material/Description';
import FileUpload from '../../../components/files/FileUpload.jsx';
import { useOperatorAuth } from '@kunk/auth-session';
import {
  AnnotationsTab,
  ConfirmDialog,
  HistoryTab,
  PatientsTab,
  PersonalDataTab,
  PrescriberTab,
  TermStubMenu,
} from './AssociateTabs.jsx';
import { displayName, formatCreated, parseAnnotations, contentAreaDialogSx } from './associatesStatus.js';

const GREEN = '#5a7a5b';

export default function AssociateModal({ open, user: initialUser, api, onClose, onChanged }) {
  const { user: operator } = useOperatorAuth();
  const [tab, setTab] = useState(0);
  const [user, setUser] = useState(initialUser);
  const [patients, setPatients] = useState([]);
  const [history, setHistory] = useState({ orders: [], services: [] });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [termAnchor, setTermAnchor] = useState(null);
  const [confirmMake, setConfirmMake] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [ciap2Enabled, setCiap2Enabled] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await api.getCiap2Status();
        if (!cancelled && res?.data && typeof res.data.enabled === 'boolean') {
          setCiap2Enabled(res.data.enabled);
        }
      } catch {
        /* default on */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [api]);

  const reload = useCallback(async () => {
    if (!initialUser?.id && !initialUser?.user_code) return;
    setBusy(true);
    setMsg('');
    try {
      let u = initialUser;
      if (initialUser.user_code) {
        const res = await api.getUserByCode(initialUser.user_code, 'patients=1');
        u = res.data || initialUser;
      }
      setUser(u);
      if (u?.id) {
        const [pRes, hRes] = await Promise.all([
          api.getUserPatients(u.id),
          api.getUserHistory(u.id),
        ]);
        setPatients(pRes.data || []);
        setHistory(hRes.data || { orders: [], services: [] });
      }
    } catch (err) {
      setMsg(err.message || 'Falha ao carregar');
    } finally {
      setBusy(false);
    }
  }, [api, initialUser]);

  useEffect(() => {
    if (open) {
      setTab(0);
      reload();
    }
  }, [open, reload]);

  async function saveUser(patch) {
    setBusy(true);
    setMsg('');
    try {
      const res = await api.updateUser(user.id, patch);
      setUser(res.data);
      onChanged?.();
      setMsg('Salvo');
    } catch (err) {
      setMsg(err.message || 'Falha ao salvar');
    } finally {
      setBusy(false);
    }
  }

  async function makeAssociate() {
    setBusy(true);
    try {
      const res = await api.makeAssociate(user.id);
      setUser(res.data);
      onChanged?.();
      setConfirmMake(false);
    } catch (err) {
      setMsg(err.message || 'Falha');
    } finally {
      setBusy(false);
    }
  }

  async function deleteUser() {
    setBusy(true);
    try {
      await api.deleteUser(user.id);
      setConfirmDelete(false);
      onChanged?.();
      onClose();
    } catch (err) {
      setMsg(err.message || 'Não foi possível excluir');
      setConfirmDelete(false);
    } finally {
      setBusy(false);
    }
  }

  const annotations = parseAnnotations(user?.annotations);
  const operatorName = [operator?.name, operator?.last_name].filter(Boolean).join(' ') || 'Operador';

  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        maxWidth="lg"
        fullWidth
        sx={contentAreaDialogSx}
        PaperProps={{ sx: { height: '88vh', maxWidth: 1020, borderRadius: '20px' } }}
      >
        <DialogTitle sx={{ pr: 6 }}>
          <Stack direction="row" spacing={2} alignItems="center">
            <Avatar src={user?.avatar_url || undefined} sx={{ bgcolor: GREEN, width: 56, height: 56 }}>
              {(displayName(user) || '?').charAt(0)}
            </Avatar>
            <Box flex={1}>
              <Typography variant="h6">{displayName(user)}</Typography>
              <Typography variant="body2" color="text.secondary">
                Associado desde {formatCreated(user)}
              </Typography>
            </Box>
            {String(user?.status) !== 'Associado' ? (
              <Button variant="outlined" onClick={() => setConfirmMake(true)} sx={{ borderColor: GREEN, color: GREEN }}>
                Tornar associado
              </Button>
            ) : null}
            <Button
              startIcon={<DescriptionIcon />}
              onClick={(e) => setTermAnchor(e.currentTarget)}
              sx={{ bgcolor: GREEN, color: '#fff', '&:hover': { bgcolor: '#303B30' } }}
            >
              Termo
            </Button>
            <Menu anchorEl={termAnchor} open={Boolean(termAnchor)} onClose={() => setTermAnchor(null)}>
              <TermStubMenu
                onStub={(label) => {
                  setTermAnchor(null);
                  setMsg(`Módulo de termos em desenvolvimento (${label})`);
                }}
              />
            </Menu>
          </Stack>
          <IconButton onClick={onClose} sx={{ position: 'absolute', right: 8, top: 8 }}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers sx={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          {msg ? (
            <Typography variant="body2" sx={{ mb: 1, color: msg.includes('desenvolvimento') ? 'warning.main' : 'text.secondary' }}>
              {msg}
            </Typography>
          ) : null}
          <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable" sx={{ mb: 2 }}>
            <Tab label="Dados Pessoais" />
            <Tab label="Pacientes" />
            <Tab label="Prescritor" />
            <Tab label="Anotações" />
            <Tab label="Documentos" />
            <Tab label="Histórico" />
          </Tabs>
          <Box sx={{ flex: 1, overflow: 'auto' }}>
            {tab === 0 ? (
              <PersonalDataTab
                user={user}
                busy={busy}
                ciap2Enabled={ciap2Enabled}
                onSave={saveUser}
                onDelete={() => setConfirmDelete(true)}
              />
            ) : null}
            {tab === 1 ? (
              <PatientsTab
                patients={patients}
                busy={busy}
                ciap2Enabled={ciap2Enabled}
                onCreate={async (body) => {
                  setBusy(true);
                  try {
                    await api.createUserPatient(user.id, body);
                    await reload();
                    onChanged?.();
                  } catch (err) {
                    setMsg(err.message);
                  } finally {
                    setBusy(false);
                  }
                }}
                onSave={async (patientId, body) => {
                  setBusy(true);
                  try {
                    await api.updateUserPatient(user.id, patientId, body);
                    await reload();
                  } catch (err) {
                    setMsg(err.message);
                  } finally {
                    setBusy(false);
                  }
                }}
                onDelete={async (patientId) => {
                  setBusy(true);
                  try {
                    await api.deleteUserPatient(user.id, patientId);
                    await reload();
                    onChanged?.();
                  } catch (err) {
                    setMsg(err.message);
                  } finally {
                    setBusy(false);
                  }
                }}
              />
            ) : null}
            {tab === 2 ? (
              <PrescriberTab user={user} onSave={saveUser} busy={busy} FileUpload={FileUpload} api={api} />
            ) : null}
            {tab === 3 ? (
              <AnnotationsTab
                annotations={annotations}
                busy={busy}
                operatorName={operatorName}
                onAdd={async (item) => {
                  await saveUser({ annotations: [...annotations, item] });
                }}
                onRemove={async (id) => {
                  await saveUser({ annotations: annotations.filter((a) => a.id !== id) });
                }}
              />
            ) : null}
            {tab === 4 && user ? <FileUpload api={api} user={user} /> : null}
            {tab === 5 ? <HistoryTab history={history} /> : null}
          </Box>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={confirmMake}
        title="Tornar este cadastro Associado? (não gera termo)"
        onClose={() => setConfirmMake(false)}
        onConfirm={makeAssociate}
      />
      <ConfirmDialog
        open={confirmDelete}
        title="Excluir associado? Só funciona sem pedidos, serviços ou pacientes."
        onClose={() => setConfirmDelete(false)}
        onConfirm={deleteUser}
      />
    </>
  );
}
