import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Box,
  Button,
  CircularProgress,
  IconButton,
  Link,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import DeleteForeverIcon from '@mui/icons-material/DeleteForever';
import ImageIcon from '@mui/icons-material/Image';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import {
  DOCUMENT_KINDS,
  DOCUMENT_KIND_KEYS,
  buildDocumentFileName,
  getDocumentKind,
} from '../../lib/documentKinds.js';
import { useErrorModal } from '../errors/ErrorModalProvider.jsx';

const GREEN = '#5a7a5b';
const GREEN_HOVER = '#303B30';

function labelForFile(file) {
  const docKind = String(file?.doc_kind || '');
  const subject = String(file?.subject || '');
  const match = DOCUMENT_KIND_KEYS.map((key) => DOCUMENT_KINDS[key]).find((cfg) => {
    if (cfg.doc_kind !== docKind) return false;
    if (cfg.subject == null) return !subject;
    return cfg.subject === subject;
  });
  if (match) return match.label;
  if (docKind === 'identity' && subject === 'patient') return 'Documento do paciente';
  if (docKind === 'identity') return 'Documento do Associado';
  if (docKind === 'prescription') return 'Receita';
  if (docKind === 'report') return 'Laudo';
  if (docKind === 'exam') return 'Exame';
  return docKind || 'Documento';
}

/**
 * Upload global de arquivos do associado.
 *
 * @param {object} props
 * @param {object} props.api — createApiClient
 * @param {object} props.user — associado (precisa de id + user_code)
 * @param {string} [props.kind] — se informado, fixa o tipo (ex.: "prescription") e não mostra seletor
 * @param {function} [props.onUploaded]
 * @param {function} [props.onDeleted]
 * @param {boolean} [props.readOnly]
 */
export default function FileUpload({
  api,
  user,
  kind: kindProp,
  onUploaded,
  onDeleted,
  readOnly = false,
}) {
  const fixedKind = kindProp ? getDocumentKind(kindProp) : null;
  const [pickerKind, setPickerKind] = useState(kindProp || '');
  const activeKindKey = fixedKind?.key || pickerKind || '';
  const activeKind = getDocumentKind(activeKindKey);

  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const { showError } = useErrorModal();
  const [previewUrl, setPreviewUrl] = useState(null);
  const [previewMime, setPreviewMime] = useState('');
  const inputRef = useRef(null);

  const userId = user?.id;
  // Com `kind` fixo (ex.: receita no prescritor), filtra por doc_kind.
  // Na aba Documentos (sem kind), lista todos os arquivos do associado.
  const listDocKind = fixedKind?.doc_kind || null;

  const loadFiles = useCallback(async () => {
    if (!api || !userId) {
      setFiles([]);
      return;
    }
    setLoading(true);
    try {
      const res = await api.listUserFiles({
        userId,
        docKind: listDocKind || undefined,
        limit: 50,
      });
      setFiles(res.data || []);
    } catch (err) {
      showError(err.message || 'Falha ao listar arquivos');
      setFiles([]);
    } finally {
      setLoading(false);
    }
  }, [api, userId, listDocKind, showError]);

  useEffect(() => {
    loadFiles();
  }, [loadFiles]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const title = useMemo(() => {
    if (fixedKind) return fixedKind.label;
    return 'Documentos';
  }, [fixedKind]);

  async function openPreview(file) {
    if (!api?.fileDownloadUrl) return;
    try {
      const url = api.fileDownloadUrl(file.id);
      const res = await fetch(url, { credentials: 'include' });
      if (!res.ok) throw new Error('Não foi possível abrir o arquivo');
      const blob = await res.blob();
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewMime(file.mime_type || blob.type || '');
      setPreviewUrl(URL.createObjectURL(blob));
    } catch (err) {
      showError(err.message || 'Erro ao visualizar');
    }
  }

  async function handleUpload(fileList) {
    if (!api || !userId || !activeKind || !fileList?.length) return;
    if (!fixedKind && !pickerKind) {
      showError('Selecione o tipo do documento.');
      return;
    }
    setUploading(true);
    try {
      for (const file of Array.from(fileList)) {
        const filename = buildDocumentFileName(activeKind, user, file.name);
        const fd = new FormData();
        fd.append('file', file, filename);
        fd.append('filename', filename);
        fd.append('user_id', String(userId));
        fd.append('doc_kind', activeKind.doc_kind);
        if (activeKind.subject) fd.append('subject', activeKind.subject);

        const res = await api.uploadFile(fd);

        if (activeKind.doc_kind === 'prescription' && userId) {
          try {
            await api.updateItem('users', userId, { prescription: res.data?.id || null });
          } catch {
            /* campo opcional */
          }
        }

        onUploaded?.(res.data, activeKind);
      }
      if (!fixedKind) setPickerKind('');
      await loadFiles();
    } catch (err) {
      showError(err.message || 'Falha no upload');
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  async function handleDelete(file) {
    if (!api || readOnly) return;
    if (!window.confirm(`Remover ${file.filename}?`)) return;
    try {
      await api.deleteFile(file.id);
      onDeleted?.(file);
      await loadFiles();
    } catch (err) {
      showError(err.message || 'Falha ao remover');
    }
  }

  function onInputChange(e) {
    const list = e.target.files;
    if (!list?.length) return;
    handleUpload(list);
  }

  return (
    <Box data-testid="file-upload" sx={{ width: '100%', mt: 1 }}>
      <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
        {title}
      </Typography>

      {!fixedKind && !readOnly && (
        <TextField
          select
          size="small"
          fullWidth
          label="Tipo do documento"
          value={pickerKind}
          onChange={(e) => setPickerKind(e.target.value)}
          sx={{ mb: 1 }}
          data-testid="file-upload-kind"
        >
          {DOCUMENT_KIND_KEYS.map((key) => (
            <MenuItem key={key} value={key}>
              {DOCUMENT_KINDS[key].label}
            </MenuItem>
          ))}
        </TextField>
      )}

      {!readOnly && (
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
          <Button
            variant="contained"
            size="small"
            startIcon={uploading ? <CircularProgress size={16} color="inherit" /> : <UploadFileIcon />}
            disabled={uploading || !userId || (!fixedKind && !pickerKind)}
            onClick={() => inputRef.current?.click()}
            sx={{ bgcolor: GREEN, '&:hover': { bgcolor: GREEN_HOVER } }}
            data-testid="file-upload-button"
          >
            Enviar arquivo
          </Button>
          <input
            ref={inputRef}
            type="file"
            hidden
            accept="image/*,application/pdf"
            onChange={onInputChange}
            data-testid="file-upload-input"
          />
          {activeKind && (
            <Typography variant="caption" color="text.secondary">
              Prefixo: {activeKind.prefix}
            </Typography>
          )}
        </Stack>
      )}

      {loading ? (
        <CircularProgress size={24} sx={{ color: GREEN }} />
      ) : (
        <Stack spacing={0.75}>
          {files.length === 0 && (
            <Typography variant="body2" color="text.secondary">
              Nenhum arquivo {fixedKind ? `de ${fixedKind.label.toLowerCase()} ` : ''}enviado.
            </Typography>
          )}
          {files.map((f) => {
            const isPdf = String(f.mime_type || '').includes('pdf') || /\.pdf$/i.test(f.filename || '');
            return (
              <Box
                key={f.id}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  border: '1px solid #ddd',
                  borderRadius: 1,
                  px: 1,
                  py: 0.5,
                }}
                data-testid={`file-row-${f.id}`}
              >
                {isPdf ? <PictureAsPdfIcon fontSize="small" color="action" /> : <ImageIcon fontSize="small" color="action" />}
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  {!fixedKind ? (
                    <Typography variant="caption" color="text.secondary" display="block">
                      {labelForFile(f)}
                    </Typography>
                  ) : null}
                  <Link
                    component="button"
                    type="button"
                    underline="hover"
                    onClick={() => openPreview(f)}
                    sx={{ textAlign: 'left', fontSize: 13 }}
                  >
                    {f.filename}
                  </Link>
                </Box>
                {!readOnly && (
                  <IconButton size="small" aria-label="Remover" onClick={() => handleDelete(f)}>
                    <DeleteForeverIcon fontSize="small" color="error" />
                  </IconButton>
                )}
              </Box>
            );
          })}
        </Stack>
      )}

      {previewUrl && (
        <Box sx={{ mt: 2 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
            <Typography variant="caption">Pré-visualização</Typography>
            <Button size="small" onClick={() => { URL.revokeObjectURL(previewUrl); setPreviewUrl(null); }}>
              Fechar
            </Button>
          </Stack>
          {String(previewMime).includes('pdf') ? (
            <Box
              component="iframe"
              src={previewUrl}
              title="preview"
              sx={{ width: '100%', height: 360, border: '1px solid #ccc' }}
            />
          ) : (
            <Box
              component="img"
              src={previewUrl}
              alt="preview"
              sx={{ maxWidth: '100%', maxHeight: 360, display: 'block', border: '1px solid #ccc' }}
            />
          )}
        </Box>
      )}
    </Box>
  );
}
