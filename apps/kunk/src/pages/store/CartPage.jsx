import React, { useEffect, useMemo, useState } from 'react';
import {
  Autocomplete,
  Box,
  Button,
  Checkbox,
  CircularProgress,
  FormControlLabel,
  Grid,
  IconButton,
  MenuItem,
  Modal,
  Paper,
  Radio,
  RadioGroup,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
  Alert,
} from '@mui/material';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import AddShoppingCartOutlinedIcon from '@mui/icons-material/AddShoppingCartOutlined';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import PersonIcon from '@mui/icons-material/Person';
import SaveIcon from '@mui/icons-material/Save';
import { useSearchParams } from 'react-router-dom';
import { createApiClient } from '@kunk/api-client';
import { getKunkPublicConfig } from '@kunk/config';
import { useOperatorAuth } from '@kunk/auth-session';
import { PATHS } from '../../app/menuConfig.js';
import AddressEditDialog from '../../components/store/AddressEditDialog.jsx';
import DatePrescriptionEdit from '../../components/store/DatePrescriptionEdit.jsx';

const muiTheme = createTheme();
const GREEN = '#5a7a5b';
const GREEN_HOVER = '#303B30';
const PURPLE = '#7A5B7A';
const PURPLE_HOVER = '#4d2d4d';
const ZEBRA = 'rgb(243, 243, 243)';

/** Endereço de entrega OSS (`delivery_address`) com fallback legado. */
function getDeliveryAddress(u) {
  const d = u?.delivery_address || u?.address_delivery;
  if (d && typeof d === 'object' && d.street) return d;
  return null;
}

function cadastralAddress(u) {
  if (!u) return null;
  return (
    u.address || {
      street: u.street,
      number: u.number || u.street_number,
      neighborhood: u.neighborhood,
      city: u.city,
      state: u.state,
      cep: u.cep || u.postal_code,
      complement: u.complement,
    }
  );
}

function roundMoney(n) {
  return Math.round((Number(n) || 0) * 100) / 100;
}

function computeLocalTotal({ items, deliveryPrice, applyToTotal, discount, donation, customPayment }) {
  const products = roundMoney(
    (items || []).reduce((s, it) => s + (Number(it.amount) || 0) * (Number(it.quantity) || 0), 0)
  );
  const freight = applyToTotal ? roundMoney(deliveryPrice) : 0;
  const customSum = roundMoney(
    (customPayment || []).reduce((s, r) => s + (Number(r.value) || 0), 0)
  );
  return {
    products,
    freight,
    discount: roundMoney(discount),
    donation: roundMoney(donation),
    customSum,
    total: roundMoney(Math.max(0, products + freight - roundMoney(discount) - customSum - roundMoney(donation))),
  };
}

function formatPhone(phone) {
  if (!phone) return '—';
  const cleaned = String(phone).replace(/\D/g, '');
  const match = cleaned.match(/^55(\d{2})(\d{5})(\d{4})$/);
  if (match) return `(${match[1]}) ${match[2]}-${match[3]}`;
  return phone;
}

function associateDisplayName(u) {
  if (!u) return '';
  const full = [u.name || u.first_name || u.associate_name, u.last_name || u.lastname_associate]
    .filter(Boolean)
    .join(' ')
    .trim();
  return full || u.email_account || u.email || u.user_code || '';
}

function prescriptionBanner(u) {
  if (!u?.date_prescription) {
    return { ok: false, label: 'Data não informada' };
  }
  const d = new Date(u.date_prescription);
  const limit = new Date();
  limit.setFullYear(limit.getFullYear() - 1);
  const expired = d.getTime() < limit.getTime();
  const formatted = d.toLocaleDateString('pt-BR');
  return {
    ok: !expired,
    label: expired ? `${formatted} - Prescrição vencida` : formatted,
  };
}

function statusPill(status) {
  const s = String(status || '').toLowerCase();
  if (s.includes('aguard') || s.includes('await')) return { bg: '#FFF3CD', color: '#664d03' };
  if (s.includes('pago') || s.includes('paid') || s.includes('conclu')) return { bg: '#D1E7DD', color: '#0f5132' };
  if (s.includes('cancel')) return { bg: '#F8D7DA', color: '#842029' };
  return { bg: '#E2E3E5', color: '#41464b' };
}

export default function CartPage() {
  const bootstrap = getKunkPublicConfig();
  const api = useMemo(() => createApiClient({ baseUrl: bootstrap.apiUrl }), [bootstrap.apiUrl]);
  const { user: operator } = useOperatorAuth();
  const [searchParams] = useSearchParams();
  const userCodeFromQuery = (searchParams.get('u') || '').trim();

  const [associate, setAssociate] = useState(null);
  const [loadingAssociate, setLoadingAssociate] = useState(Boolean(userCodeFromQuery));

  const [products, setProducts] = useState([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [productFilter, setProductFilter] = useState('');
  const [qtyBySku, setQtyBySku] = useState({});

  const [items, setItems] = useState([]);
  const [discount, setDiscount] = useState(0);
  const [donation, setDonation] = useState(0);
  const [customPaymentDraft, setCustomPaymentDraft] = useState({ item: '', qnt: 1, value: 0 });
  const [customPayment, setCustomPayment] = useState([]);
  const [showCustomPayment, setShowCustomPayment] = useState(false);

  const [info, setInfo] = useState('');
  const [orderTags, setOrderTags] = useState([]);
  const [tagOptions, setTagOptions] = useState([]);

  const [prescriber, setPrescriber] = useState('');
  const [prescriberCode, setPrescriberCode] = useState('');
  const [professionals, setProfessionals] = useState([]);
  const [showPrescriberModal, setShowPrescriberModal] = useState(false);
  const [newPrescriber, setNewPrescriber] = useState({ name: '', last_name: '', email: '' });

  const [freightOptions, setFreightOptions] = useState([]);
  const [selectedFreight, setSelectedFreight] = useState(null);
  const [applyToTotal, setApplyToTotal] = useState(true);
  const [freightLoading, setFreightLoading] = useState(false);

  const [history, setHistory] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [editingOrderId, setEditingOrderId] = useState(null);
  const [openAddressEdit, setOpenAddressEdit] = useState(false);

  const totals = computeLocalTotal({
    items,
    deliveryPrice: selectedFreight ? Number(selectedFreight.price) || 0 : 0,
    applyToTotal,
    discount,
    donation,
    customPayment,
  });

  const rx = prescriptionBanner(associate);
  const deliveryAddr = getDeliveryAddress(associate);

  async function applyAssociate(u) {
    if (!u) return;
    setAssociate(u);
    if (u.user_code) {
      try {
        const hist = await api.ordersByUser(u.user_code);
        setHistory(hist.data || []);
      } catch {
        setHistory([]);
      }
    }
  }

  useEffect(() => {
    if (!userCodeFromQuery) {
      setAssociate(null);
      setLoadingAssociate(false);
      return undefined;
    }
    let cancelled = false;
    (async () => {
      setLoadingAssociate(true);
      setError('');
      try {
        const res = await api.getUserByCode(userCodeFromQuery);
        if (!cancelled) await applyAssociate(res.data);
      } catch (err) {
        if (!cancelled) {
          setAssociate(null);
          setError(err.message || `Associado ${userCodeFromQuery} não encontrado`);
        }
      } finally {
        if (!cancelled) setLoadingAssociate(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [api, userCodeFromQuery]);

  useEffect(() => {
    if (!userCodeFromQuery) return undefined;
    (async () => {
      setProductsLoading(true);
      try {
        const res = await api.listItems('products', 'limit=200');
        setProducts(res.data || []);
      } catch {
        setProducts([]);
      } finally {
        setProductsLoading(false);
      }
      try {
        const res = await api.listItems('professionals', 'filter[is_prescriber][_eq]=true&limit=100');
        setProfessionals(res.data || []);
      } catch {
        /* ignore */
      }
      try {
        const res = await api.listItems('tags', 'limit=200');
        const tags = (res.data || []).map((t) => t.tag || t.name).filter(Boolean);
        setTagOptions(tags);
      } catch {
        setTagOptions([]);
      }
    })();
  }, [api, userCodeFromQuery]);

  const filteredProducts = useMemo(() => {
    const term = productFilter.trim().toLowerCase();
    if (!term) return products;
    return products.filter((p) => String(p.name || '').toLowerCase().includes(term));
  }, [products, productFilter]);

  function addProduct(product) {
    const key = product.sku || String(product.id);
    const qty = Math.max(1, Number(qtyBySku[key]) || 1);
    setItems((prev) => {
      const existing = prev.find((i) => i.code === key || i.product_id === product.id);
      if (existing) {
        return prev.map((i) =>
          i === existing ? { ...i, quantity: Number(i.quantity) + qty } : i
        );
      }
      return [
        ...prev,
        {
          product_id: product.id,
          code: key,
          name: product.name,
          amount: Number(product.price) || 0,
          quantity: qty,
        },
      ];
    });
  }

  function updateItemQty(idx, quantity) {
    setItems((prev) =>
      prev
        .map((it, i) => (i === idx ? { ...it, quantity: Number(quantity) || 0 } : it))
        .filter((it) => it.quantity > 0)
    );
  }

  function removeItem(idx) {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  }

  async function quoteFreight() {
    if (!associate) {
      setError('Selecione um associado');
      return;
    }
    setFreightLoading(true);
    setError('');
    const address = getDeliveryAddress(associate) || cadastralAddress(associate);
    if (!address?.cep) {
      setFreightLoading(false);
      setError('Associado sem CEP para cotar frete');
      return;
    }
    try {
      const res = await api.freightQuote({ address, items });
      setFreightOptions(res.data?.options || []);
      setApplyToTotal(res.data?.apply_to_total !== false);
      const selKey = res.data?.selected_option_key;
      const sel =
        (res.data?.options || []).find((o) => o.option_key === selKey) ||
        (res.data?.options || [])[0] ||
        null;
      setSelectedFreight(sel);
    } catch (err) {
      setFreightOptions([]);
      setSelectedFreight(null);
      setError(err.message || 'Falha ao cotar frete');
    } finally {
      setFreightLoading(false);
    }
  }

  async function setAsDefault() {
    if (!selectedFreight) return;
    try {
      await api.putFreightDefaultOption({
        default_option: {
          option_key: selectedFreight.option_key,
          provider: selectedFreight.provider,
          service_label: selectedFreight.service_label,
        },
      });
      setSuccess('Favorito de frete atualizado');
    } catch (err) {
      setError(err.message || 'Falha ao definir padrão');
    }
  }

  async function createPrescriber() {
    try {
      const res = await api.createItem('professionals', {
        ...newPrescriber,
        is_prescriber: true,
        active: true,
      });
      const p = res.data;
      setProfessionals((prev) => [...prev, p]);
      setPrescriber(`${p.name || ''} ${p.last_name || ''}`.trim());
      setPrescriberCode(p.professional_code || String(p.id));
      setShowPrescriberModal(false);
      setNewPrescriber({ name: '', last_name: '', email: '' });
    } catch (err) {
      setError(err.message || 'Falha ao criar prescritor');
    }
  }

  function handleAddCustomPayment() {
    if (!customPaymentDraft.item || !(Number(customPaymentDraft.value) > 0)) return;
    setCustomPayment((prev) => [
      ...prev,
      {
        item: customPaymentDraft.item,
        qnt: Number(customPaymentDraft.qnt) || 1,
        value: Number(customPaymentDraft.value) || 0,
      },
    ]);
    setCustomPaymentDraft({ item: '', qnt: 1, value: 0 });
    setShowCustomPayment(false);
  }

  async function submitOrder({ forceWrongTotal = false } = {}) {
    setError('');
    setSuccess('');
    if (!associate) {
      setError('Selecione um associado');
      return;
    }
    if (!items.length) {
      setError('Adicione itens');
      return;
    }
    setSubmitting(true);
    try {
      const address = getDeliveryAddress(associate) || cadastralAddress(associate);
      const body = {
        user: associate.id,
        user_code: associate.user_code,
        name_associate: associateDisplayName(associate),
        email: associate.email_account || associate.email,
        address,
        items,
        total: forceWrongTotal ? totals.total + 99 : totals.total,
        delivery_price: selectedFreight ? Number(selectedFreight.price) || 0 : 0,
        freight_carrier: selectedFreight?.provider || null,
        freight_option: selectedFreight || null,
        discount: Number(discount) || 0,
        donation: Number(donation) || 0,
        custom_payment: customPayment,
        prescriber,
        prescriber_code: prescriberCode,
        info,
        tags: orderTags,
        status: 'Aguardando pagamento',
        kunk_user: operator?.email || operator?.name,
      };
      let res;
      if (editingOrderId) {
        res = await api.updateOrder(editingOrderId, body);
      } else {
        res = await api.createOrder(body);
      }
      setSuccess(`Pedido ${res.data?.order_code || res.data?.id} salvo`);
      setEditingOrderId(null);
      if (associate.user_code) {
        const hist = await api.ordersByUser(associate.user_code);
        setHistory(hist.data || []);
      }
    } catch (err) {
      setError(err?.errors?.[0]?.message || err.message || 'Falha ao salvar pedido');
    } finally {
      setSubmitting(false);
    }
  }

  function loadHistoryOrder(o) {
    setEditingOrderId(o.id);
    setItems(o.items || []);
    setDiscount(o.discount || 0);
    setDonation(o.donation || 0);
    setCustomPayment(o.custom_payment || []);
    setInfo(o.info || o.details || '');
    setOrderTags(Array.isArray(o.tags) ? o.tags.map((t) => (typeof t === 'string' ? t : t.tag)).filter(Boolean) : []);
    setSelectedFreight(o.freight_option || null);
    setSuccess(`Editando pedido #${o.id}`);
  }

  const headCell = {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
    borderBottom: '2px solid #fff',
    textAlign: 'center',
  };

  return (
    <ThemeProvider theme={muiTheme}>
      <Box data-testid="cart-page" sx={{ width: '100%', pb: 4 }}>
        {error && (
          <Alert severity="error" data-testid="cart-error" sx={{ mb: 2, ml: '20px', mr: 2 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}
        {!userCodeFromQuery && (
          <Alert severity="warning" data-testid="cart-missing-user" sx={{ mb: 2, ml: '20px', mr: 2 }}>
            Novo pedido exige o código do associado na URL (<code>?u=</code>). Abra a partir da triagem ou do cadastro
            do associado.
          </Alert>
        )}
        {success && (
          <Alert severity="success" data-testid="cart-success" sx={{ mb: 2, ml: '20px', mr: 2 }} onClose={() => setSuccess('')}>
            {success}
          </Alert>
        )}

        {userCodeFromQuery && (
          <>
        {/* Toolbar prescritor — legado */}
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', width: '100%', mb: 1, ml: '20px', pr: 2 }}>
          <Button
            variant="contained"
            startIcon={<PersonAddIcon />}
            data-testid="open-prescriber-modal"
            onClick={() => setShowPrescriberModal(true)}
            sx={{ backgroundColor: PURPLE, '&:hover': { backgroundColor: '#684c68' } }}
          >
            Novo Prescritor
          </Button>
        </Box>

        {/* Modal novo prescritor */}
        <Modal open={showPrescriberModal} onClose={() => setShowPrescriberModal(false)}>
          <Box
            data-testid="prescriber-modal"
            sx={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: 420,
              bgcolor: 'background.paper',
              p: 3,
              borderRadius: 1,
            }}
          >
            <Typography variant="h6" sx={{ mb: 2 }}>
              Novo prescritor
            </Typography>
            <TextField
              fullWidth
              size="small"
              label="Nome"
              data-testid="prescriber-name"
              value={newPrescriber.name}
              onChange={(e) => setNewPrescriber((p) => ({ ...p, name: e.target.value }))}
              sx={{ mb: 1 }}
            />
            <TextField
              fullWidth
              size="small"
              label="Sobrenome"
              data-testid="prescriber-last-name"
              value={newPrescriber.last_name}
              onChange={(e) => setNewPrescriber((p) => ({ ...p, last_name: e.target.value }))}
              sx={{ mb: 1 }}
            />
            <TextField
              fullWidth
              size="small"
              label="E-mail"
              value={newPrescriber.email}
              onChange={(e) => setNewPrescriber((p) => ({ ...p, email: e.target.value }))}
              sx={{ mb: 2 }}
            />
            <Stack direction="row" spacing={1} justifyContent="flex-end">
              <Button onClick={() => setShowPrescriberModal(false)}>Cancelar</Button>
              <Button variant="contained" onClick={createPrescriber} sx={{ bgcolor: PURPLE }}>
                Salvar
              </Button>
            </Stack>
          </Box>
        </Modal>

        {loadingAssociate && !associate && (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.5, py: 4 }}>
            <CircularProgress size={36} sx={{ color: GREEN }} />
            <Typography variant="body2" sx={{ color: GREEN, fontWeight: 600 }}>
              Carregando dados do pedido...
            </Typography>
          </Box>
        )}

        {/* Painel associado */}
        {associate?.id && (
          <Box className="pageContainerOptions" sx={{ mb: '20px', ml: '20px', mr: 2 }}>
            <Grid container spacing={2}>
              <Grid item xs={12} md={4}>
                <Typography variant="h6" gutterBottom>
                  Dados Pessoais
                </Typography>
                <Typography variant="body1" data-testid="associate-selected">
                  <strong>Nome:</strong> {associateDisplayName(associate)}
                </Typography>
                <Typography variant="body1">
                  <strong>Email:</strong> {associate.email_account || associate.email || '—'}
                </Typography>
                <Typography variant="body1">
                  <strong>Telefone:</strong> {formatPhone(associate.mobile_number)}
                </Typography>
              </Grid>
              <Grid item xs={12} md={5}>
                <Typography variant="h6" gutterBottom>
                  Endereço
                </Typography>
                {deliveryAddr ? (
                  <Typography variant="body1">
                    {deliveryAddr.street}, {deliveryAddr.number}
                    {deliveryAddr.complement ? ` - ${deliveryAddr.complement}` : ''}
                    {' — '}
                    {deliveryAddr.neighborhood} — {deliveryAddr.city} — {deliveryAddr.state} —{' '}
                    {deliveryAddr.cep}
                  </Typography>
                ) : (
                  <>
                    <Typography variant="body1">
                      <strong>Rua:</strong> {associate.street || associate.address?.street || '—'},{' '}
                      {associate.number || associate.street_number || associate.address?.number || ''}
                    </Typography>
                    <Typography variant="body1">
                      <strong>Bairro:</strong> {associate.neighborhood || associate.address?.neighborhood || '—'}
                    </Typography>
                    <Typography variant="body1">
                      <strong>Cidade:</strong> {associate.city || associate.address?.city || '—'} /{' '}
                      {associate.state || associate.address?.state || '—'}
                    </Typography>
                    <Typography variant="body1">
                      <strong>CEP:</strong> {associate.cep || associate.postal_code || associate.address?.cep || '—'}
                    </Typography>
                  </>
                )}
              </Grid>
              <Grid item xs={12} md={3} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<EditIcon />}
                  sx={{ backgroundColor: GREEN, color: 'white', '&:hover': { bgcolor: GREEN_HOVER } }}
                  onClick={() => setOpenAddressEdit(true)}
                  data-testid="edit-associate-data"
                >
                  Editar Dados
                </Button>
                {openAddressEdit && (
                  <AddressEditDialog
                    key={associate?.date_updated || associate?.id}
                    open={openAddressEdit}
                    onClose={() => setOpenAddressEdit(false)}
                    user={associate}
                    api={api}
                    onSaved={(newAddress) => {
                      setAssociate((prev) => ({
                        ...prev,
                        street: newAddress.official.street,
                        street_number: newAddress.official.number,
                        number: newAddress.official.number,
                        complement: newAddress.official.complement,
                        neighborhood: newAddress.official.neighborhood,
                        city: newAddress.official.city,
                        state: newAddress.official.state,
                        cep: newAddress.official.cep,
                        delivery_address: newAddress.delivery,
                      }));
                      setSuccess('Dados do associado atualizados');
                      setOpenAddressEdit(false);
                    }}
                  />
                )}
                <DatePrescriptionEdit
                  user={associate}
                  api={api}
                  onDateSaved={(date) => {
                    setAssociate((prev) => ({ ...prev, date_prescription: date || null }));
                    setSuccess(date ? 'Data da prescrição atualizada' : 'Data da prescrição removida');
                  }}
                />
                <Button
                  variant="contained"
                  size="small"
                  startIcon={<PersonIcon />}
                  sx={{ backgroundColor: GREEN, color: 'white', '&:hover': { bgcolor: GREEN_HOVER } }}
                  onClick={() => {
                    window.open(
                      `${window.location.origin}${PATHS.registration}?a=${encodeURIComponent(associate.user_code || '')}`,
                      '_blank'
                    );
                  }}
                >
                  Ver Associado
                </Button>
              </Grid>
              <Grid
                container
                justifyContent="center"
                alignItems="center"
                sx={{
                  mt: 3,
                  ml: 2,
                  bgcolor: rx.ok ? GREEN : 'red',
                  borderRadius: 2,
                  p: 1,
                  width: '100%',
                }}
              >
                <Typography variant="body1" sx={{ color: 'white', fontWeight: 500 }}>
                  <strong>Data da Prescrição:</strong> {rx.label}
                </Typography>
              </Grid>
            </Grid>
          </Box>
        )}

        {/* Split 7/5 — só com associado (ou após fechar modal se já tiver) */}
        {associate?.id && (
          <Grid container spacing={2}>
            {/* ESQUERDA: carrinho + checkout + histórico */}
            <Grid item xs={12} md={7}>
              <Table className="pageContainerTable" sx={{ ml: '20px', width: 'calc(100% - 20px)' }}>
                <TableHead sx={{ bgcolor: GREEN }}>
                  <TableRow>
                    {['#', 'Produto', 'Qnt', 'Preço', 'Excluir'].map((h) => (
                      <TableCell key={h} sx={headCell}>
                        {h}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {items.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} align="center" sx={{ py: 3 }}>
                        Selecione um produto
                      </TableCell>
                    </TableRow>
                  )}
                  {items.map((it, idx) => (
                    <TableRow key={`${it.code}-${idx}`} sx={{ bgcolor: ZEBRA }}>
                      <TableCell align="center" sx={{ fontSize: 18 }}>
                        {idx + 1}
                      </TableCell>
                      <TableCell sx={{ fontSize: 18 }}>{it.name}</TableCell>
                      <TableCell align="center">
                        <TextField
                          size="small"
                          type="number"
                          data-testid={`item-qty-${idx}`}
                          value={it.quantity}
                          onChange={(e) => updateItemQty(idx, e.target.value)}
                          inputProps={{ min: 1, style: { textAlign: 'center', width: 56 } }}
                        />
                      </TableCell>
                      <TableCell align="center" sx={{ fontSize: 18 }}>
                        R${Number(it.amount).toFixed(2)}
                      </TableCell>
                      <TableCell align="center">
                        <IconButton color="error" onClick={() => removeItem(idx)}>
                          <DeleteIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}

                  {/* Desconto + Doação */}
                  <TableRow>
                    <TableCell colSpan={5}>
                      <Box sx={{ display: 'flex', gap: 3, justifyContent: 'center', py: 1 }}>
                        <TextField
                          size="small"
                          type="number"
                          label="Desconto (R$)"
                          data-testid="discount"
                          value={discount}
                          onChange={(e) => setDiscount(e.target.value)}
                          sx={{ width: 160 }}
                          inputProps={{ min: 0, step: '0.01' }}
                        />
                        <TextField
                          size="small"
                          type="number"
                          label="Doação (R$)"
                          data-testid="donation"
                          value={donation}
                          onChange={(e) => setDonation(e.target.value)}
                          sx={{ width: 160 }}
                          inputProps={{ min: 0, step: '0.01' }}
                        />
                      </Box>
                    </TableCell>
                  </TableRow>

                  {/* Total */}
                  <TableRow>
                    <TableCell colSpan={3} />
                    <TableCell
                      colSpan={2}
                      sx={{ bgcolor: GREEN, textAlign: 'center', color: '#fff' }}
                    >
                      <Typography>Total:</Typography>
                      <Typography data-testid="cart-total" sx={{ fontWeight: 'bold', fontSize: 18 }}>
                        R${totals.total.toFixed(2)}
                      </Typography>
                      {(totals.discount > 0 || totals.donation > 0 || totals.customSum > 0 || (applyToTotal && totals.freight > 0)) && (
                        <Box sx={{ mt: 1, fontSize: 14 }}>
                          {applyToTotal && totals.freight > 0 && (
                            <span style={{ color: 'white', display: 'block' }}>
                              Frete R${totals.freight.toFixed(2)}
                            </span>
                          )}
                          {totals.discount > 0 && (
                            <span style={{ color: 'white', display: 'block' }}>
                              Desconto -R${totals.discount.toFixed(2)}
                            </span>
                          )}
                          {totals.donation > 0 && (
                            <span style={{ color: 'white', display: 'block' }}>
                              Doação -R${totals.donation.toFixed(2)}
                            </span>
                          )}
                          {customPayment.map((pay, idx) => (
                            <span key={idx} style={{ color: 'white', display: 'block' }}>
                              {pay.item} -R${Number(pay.value).toFixed(2)}
                            </span>
                          ))}
                        </Box>
                      )}
                    </TableCell>
                  </TableRow>

                  {/* Info, tags, prescritor, custom pay, frete, criar */}
                  <TableRow>
                    <TableCell colSpan={5} align="center" sx={{ verticalAlign: 'top' }}>
                      <TextField
                        label="Informações do pedido"
                        variant="outlined"
                        fullWidth
                        data-testid="order-info"
                        value={info}
                        onChange={(e) => setInfo(e.target.value)}
                        sx={{ mb: 2 }}
                      />
                      <Autocomplete
                        multiple
                        disableCloseOnSelect
                        options={tagOptions}
                        value={orderTags}
                        onChange={(_e, v) => setOrderTags(v)}
                        freeSolo
                        renderOption={(props, option, { selected }) => (
                          <li {...props}>
                            <Checkbox checked={selected} sx={{ mr: 1 }} readOnly />
                            {option}
                          </li>
                        )}
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            variant="outlined"
                            label="Tags do Pedido"
                            placeholder="Selecione as tags..."
                            data-testid="order-tags"
                          />
                        )}
                        sx={{ mb: 2 }}
                      />

                      <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
                        <TextField
                          select
                          size="small"
                          label="Prescritor"
                          data-testid="prescriber-select"
                          value={prescriberCode}
                          onChange={(e) => {
                            const p = professionals.find(
                              (x) => String(x.professional_code || x.id) === e.target.value
                            );
                            setPrescriberCode(e.target.value);
                            setPrescriber(p ? `${p.name || ''} ${p.last_name || ''}`.trim() : '');
                          }}
                          sx={{ minWidth: 280 }}
                        >
                          <MenuItem value="">—</MenuItem>
                          {professionals.map((p) => (
                            <MenuItem key={p.id} value={String(p.professional_code || p.id)}>
                              {p.name} {p.last_name}
                            </MenuItem>
                          ))}
                        </TextField>
                      </Box>

                      <Box sx={{ mt: '24px' }}>
                        <Button
                          variant="text"
                          data-testid="add-custom-payment"
                          sx={{ color: PURPLE, mb: 2, mr: 2 }}
                          onClick={() => setShowCustomPayment((v) => !v)}
                        >
                          Adicionar pagamento personalizado
                        </Button>
                      </Box>
                      {showCustomPayment && (
                        <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap', justifyContent: 'center' }}>
                          <TextField
                            label="Nome da Troca"
                            size="small"
                            value={customPaymentDraft.item}
                            onChange={(e) =>
                              setCustomPaymentDraft((p) => ({ ...p, item: e.target.value }))
                            }
                            sx={{ flex: 1, minWidth: 140 }}
                          />
                          <TextField
                            label="Quantidade"
                            type="number"
                            size="small"
                            value={customPaymentDraft.qnt}
                            onChange={(e) =>
                              setCustomPaymentDraft((p) => ({
                                ...p,
                                qnt: parseInt(e.target.value, 10) || 0,
                              }))
                            }
                            sx={{ width: 110 }}
                          />
                          <TextField
                            label="Valor para descontar"
                            type="number"
                            size="small"
                            value={customPaymentDraft.value}
                            onChange={(e) =>
                              setCustomPaymentDraft((p) => ({
                                ...p,
                                value: Number(e.target.value) || 0,
                              }))
                            }
                            sx={{ width: 140 }}
                          />
                          <Button
                            variant="contained"
                            onClick={handleAddCustomPayment}
                            sx={{ bgcolor: PURPLE, minWidth: 40, '&:hover': { bgcolor: PURPLE_HOVER } }}
                          >
                            <SaveIcon />
                          </Button>
                        </Box>
                      )}
                      {customPayment.length > 0 && (
                        <Box sx={{ mb: 2, textAlign: 'left' }}>
                          <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 1 }}>
                            Pagamentos personalizados salvos:
                          </Typography>
                          {customPayment.map((pay, idx) => (
                            <Box
                              key={idx}
                              data-testid={`custom-payment-${idx}`}
                              sx={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 2,
                                mb: 1,
                                pl: 1,
                                background: '#f5f5f5',
                                borderRadius: 1,
                              }}
                            >
                              <Typography sx={{ flex: 1 }}>
                                {pay.item} | Qnt: {pay.qnt} | Valor: R${Number(pay.value).toFixed(2)}
                              </Typography>
                              <IconButton
                                size="small"
                                color="error"
                                onClick={() => setCustomPayment((prev) => prev.filter((_, i) => i !== idx))}
                              >
                                <DeleteIcon />
                              </IconButton>
                            </Box>
                          ))}
                        </Box>
                      )}

                      {/* Frete */}
                      <Paper
                        variant="outlined"
                        sx={{ p: 2, mb: 2, borderColor: GREEN, borderRadius: 1, textAlign: 'left' }}
                      >
                        <Typography variant="subtitle1" fontWeight={700}>
                          Simulação de frete
                        </Typography>
                        <Typography variant="caption" display="block" sx={{ mb: 1 }}>
                          {applyToTotal
                            ? 'O valor selecionado entra no total do pedido.'
                            : 'Valores estimados — não entram no total do pedido.'}
                        </Typography>
                        <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
                          <Button
                            size="small"
                            variant="outlined"
                            data-testid="quote-freight"
                            onClick={quoteFreight}
                            disabled={freightLoading}
                            sx={{ borderColor: GREEN, color: GREEN }}
                          >
                            {freightLoading ? 'Calculando…' : 'Calcular frete'}
                          </Button>
                          <Button
                            size="small"
                            variant="text"
                            data-testid="set-default-freight"
                            onClick={setAsDefault}
                            disabled={!selectedFreight}
                            sx={{ color: PURPLE }}
                          >
                            Definir como padrão
                          </Button>
                        </Stack>
                        {freightLoading && (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, my: 1 }}>
                            <CircularProgress size={20} sx={{ color: GREEN }} />
                            <Typography variant="body2">Consultando modalidades…</Typography>
                          </Box>
                        )}
                        <RadioGroup
                          data-testid="freight-option"
                          value={selectedFreight?.option_key || ''}
                          onChange={(e) => {
                            const opt = freightOptions.find((o) => o.option_key === e.target.value);
                            setSelectedFreight(opt || null);
                          }}
                        >
                          {freightOptions.map((o) => (
                            <FormControlLabel
                              key={o.option_key}
                              value={o.option_key}
                              control={<Radio size="small" />}
                              label={`${o.service_label} — R$ ${Number(o.price).toFixed(2)}${
                                o.eta_days != null ? ` · ${o.eta_days} dia(s)` : ''
                              }`}
                              sx={{
                                m: 0.5,
                                px: 1,
                                borderRadius: 1,
                                bgcolor: o.provider === 'loggi' ? '#1262FE22' : '#FFD40033',
                              }}
                            />
                          ))}
                        </RadioGroup>
                        {!freightOptions.length && !freightLoading && (
                          <Typography variant="body2" color="text.secondary">
                            Clique em calcular frete para ver modalidades.
                          </Typography>
                        )}
                      </Paper>

                      <Button
                        variant="contained"
                        data-testid="submit-order"
                        disabled={submitting || items.length === 0}
                        onClick={() => submitOrder()}
                        startIcon={
                          submitting ? (
                            <CircularProgress size={20} sx={{ color: 'white' }} />
                          ) : editingOrderId ? (
                            <EditIcon />
                          ) : (
                            <AddShoppingCartOutlinedIcon />
                          )
                        }
                        sx={{
                          backgroundColor: items.length === 0 ? '#ccc' : GREEN,
                          color: 'white',
                          mt: '25px',
                          '&:hover': { bgcolor: items.length === 0 ? '#ccc' : GREEN_HOVER },
                        }}
                      >
                        {submitting
                          ? editingOrderId
                            ? 'Alterando pedido...'
                            : 'Criando pedido...'
                          : editingOrderId
                            ? 'Alterar Pedido'
                            : 'Criar Pedido'}
                      </Button>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>

              {/* Histórico */}
              {history.length > 0 && (
                <Box
                  className="pageContainerTable"
                  data-testid="order-history"
                  sx={{ mt: '30px', ml: '20px', width: 'calc(100% - 20px)' }}
                >
                  <Typography variant="h6" gutterBottom sx={{ textAlign: 'center', p: '10px' }}>
                    Histórico de Pedidos
                  </Typography>
                  <Table>
                    <TableHead sx={{ bgcolor: GREEN }}>
                      <TableRow>
                        {['Data', 'Status', 'Total', ''].map((h) => (
                          <TableCell key={h || 'a'} sx={{ ...headCell, fontSize: 14 }}>
                            {h}
                          </TableCell>
                        ))}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {history.slice(0, 15).map((o) => {
                        const pill = statusPill(o.status);
                        return (
                          <TableRow key={o.id} sx={{ bgcolor: ZEBRA }}>
                            <TableCell>
                              {o.date_created
                                ? new Date(o.date_created).toLocaleDateString('pt-BR')
                                : '—'}
                            </TableCell>
                            <TableCell>
                              <Box
                                component="span"
                                sx={{
                                  px: 1,
                                  py: 0.25,
                                  borderRadius: 1,
                                  bgcolor: pill.bg,
                                  color: pill.color,
                                  fontSize: 13,
                                  fontWeight: 600,
                                }}
                              >
                                {o.status || '—'}
                              </Box>
                            </TableCell>
                            <TableCell>R$ {Number(o.total || 0).toFixed(2)}</TableCell>
                            <TableCell>
                              <Button
                                size="small"
                                variant="outlined"
                                onClick={() => loadHistoryOrder(o)}
                                sx={{ borderColor: GREEN, color: GREEN }}
                              >
                                Comprar Novamente
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </Box>
              )}
            </Grid>

            {/* DIREITA: catálogo */}
            <Grid item xs={12} md={5}>
              <Box
                className="pageContainerOptions"
                sx={{
                  height: 600,
                  overflow: 'auto',
                  ml: '20px',
                  mr: 2,
                  mb: '20px',
                  py: '25px !important',
                }}
              >
                {productsLoading ? (
                  <Box
                    sx={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 1.5,
                      height: '100%',
                      minHeight: 280,
                    }}
                  >
                    <CircularProgress size={40} sx={{ color: GREEN }} />
                    <Typography variant="body2" sx={{ color: GREEN, fontWeight: 600 }}>
                      Carregando produtos...
                    </Typography>
                  </Box>
                ) : (
                  <>
                    <TextField
                      label="Filtrar por nome"
                      variant="outlined"
                      fullWidth
                      value={productFilter}
                      onChange={(e) => setProductFilter(e.target.value)}
                      sx={{ mb: 2 }}
                    />
                    <Table>
                      <TableHead>
                        <TableRow sx={{ bgcolor: GREEN }}>
                          {['Nome', 'Qnt', 'Carrinho'].map((h) => (
                            <TableCell key={h} sx={headCell}>
                              {h}
                            </TableCell>
                          ))}
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {filteredProducts.map((p) => {
                          const key = p.sku || String(p.id);
                          return (
                            <TableRow key={p.id} sx={{ '&:hover': { bgcolor: '#e0e0e0' } }}>
                              <TableCell sx={{ maxWidth: 120, fontSize: '0.9em', textAlign: 'left' }}>
                                <strong>{p.name}</strong>
                                <br />
                                <br />
                                Preço: <strong>R${Number(p.price || 0).toFixed(2)}</strong>
                              </TableCell>
                              <TableCell sx={{ textAlign: 'center' }}>
                                <input
                                  type="number"
                                  min={1}
                                  max={99}
                                  value={qtyBySku[key] || 1}
                                  onChange={(e) =>
                                    setQtyBySku((prev) => ({
                                      ...prev,
                                      [key]: e.target.value,
                                    }))
                                  }
                                  style={{
                                    padding: '4px 8px',
                                    borderRadius: 4,
                                    border: '1px solid #ccc',
                                    width: 70,
                                    textAlign: 'center',
                                  }}
                                />
                              </TableCell>
                              <TableCell sx={{ textAlign: 'center' }}>
                                <Button
                                  variant="contained"
                                  data-testid={`product-${p.id}`}
                                  onClick={() => addProduct(p)}
                                  sx={{
                                    bgcolor: GREEN,
                                    '&:hover': { bgcolor: PURPLE_HOVER },
                                  }}
                                >
                                  <AddShoppingCartOutlinedIcon sx={{ fontSize: 20 }} />
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                    {/* hidden helper for e2e that used manual item */}
                    <Button
                      sx={{ display: 'none' }}
                      data-testid="add-manual-item"
                      onClick={() =>
                        setItems((prev) => [
                          ...prev,
                          { code: 'manual', name: 'Item manual', amount: 10, quantity: 1 },
                        ])
                      }
                    />
                    <Button
                      sx={{ display: 'none' }}
                      data-testid="submit-wrong-total"
                      onClick={() => submitOrder({ forceWrongTotal: true })}
                    />
                  </>
                )}
              </Box>
            </Grid>
          </Grid>
        )}
          </>
        )}
      </Box>
    </ThemeProvider>
  );
}
