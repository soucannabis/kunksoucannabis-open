/**
 * HTTP client for kunk-api /v1 (browser, credentials include).
 */

export class ApiError extends Error {
  constructor(status, code, message, details = null, errors = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
    this.errors = errors;
  }
}

export function createApiClient({ baseUrl }) {
  const root = String(baseUrl || '').replace(/\/$/, '');

  async function request(method, path, body, options = {}) {
    const headers = { ...(options.headers || {}) };
    let payload = body;
    if (body && !(body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
      payload = JSON.stringify(body);
    }
    const res = await fetch(`${root}${path}`, {
      method,
      credentials: 'include',
      headers,
      body: method === 'GET' || method === 'HEAD' ? undefined : payload,
    });
    const json = await res.json().catch(() => ({ data: null, meta: null, errors: [{ code: 'INTERNAL_ERROR', message: 'Resposta inválida' }] }));
    if (!res.ok) {
      const err0 = (json.errors && json.errors[0]) || {};
      throw new ApiError(res.status, err0.code || 'INTERNAL_ERROR', err0.message || res.statusText, err0.details, json.errors);
    }
    return json;
  }

  return {
    request,
    get: (path) => request('GET', path),
    post: (path, body) => request('POST', path, body),
    patch: (path, body) => request('PATCH', path, body),
    del: (path) => request('DELETE', path),

    // Operator auth
    login: (email, password) => request('POST', '/auth/login', { email, password }),
    logout: () => request('POST', '/auth/logout', {}),
    me: () => request('GET', '/auth/me'),

    // Associate auth
    registerEmail: (email, password) => request('POST', '/auth/associate/register-email', { email, password }),
    loginAssociate: (email, password) => request('POST', '/auth/associate/login', { email, password }),
    logoutAssociate: () => request('POST', '/auth/associate/logout', {}),
    meAssociate: () => request('GET', '/auth/associate/me'),
    forgotPassword: (email) => request('POST', '/auth/associate/forgot-password', { email }),
    resetPassword: (token, password) => request('POST', '/auth/associate/reset-password', { token, password }),

    // Funnel
    usersExists: (email) => request('GET', `/users/exists?email=${encodeURIComponent(email)}`),
    patchMe: (fields) => request('PATCH', '/users/me', fields),
    listMyPatients: () => request('GET', '/users/me/patients'),
    createMyPatient: (fields) => request('POST', '/users/me/patients', fields),
    patchMyPatient: (id, fields) => request('PATCH', `/users/me/patients/${id}`, fields),
    advance: () => request('POST', '/users/me/advance', {}),
    complete: () => request('POST', '/users/me/complete', {}),
    documentsStatus: () => request('GET', '/users/me/documents/status'),
    uploadFile: (formData) => request('POST', '/files', formData),
    deleteFile: (id) => request('DELETE', `/files/${id}`),
    listFiles: (qs = '') => request('GET', `/files${qs ? `?${qs}` : ''}`),
    listUserFiles: ({ userId, docKind, limit = 50 } = {}) => {
      const params = new URLSearchParams();
      if (userId != null) params.set('user_id', String(userId));
      if (docKind) params.set('doc_kind', String(docKind));
      if (limit != null) params.set('limit', String(limit));
      return request('GET', `/files?${params.toString()}`);
    },
    getFile: (id) => request('GET', `/files/${id}`),
    attachFile: (id, body) => request('POST', `/files/${id}/attach`, body),
    fileDownloadUrl: (id) => `${root}/files/${id}/download`,
    termsStatus: () => request('GET', '/terms/status'),
    createContract: () => request('POST', '/terms/contracts', {}),

    // Admin / operator
    adminSchema: () => request('GET', '/admin/schema'),
    adminRoles: () => request('GET', '/admin/roles'),
    listExternalServices: () => request('GET', '/admin/external-services'),
    getExternalService: (service) => request('GET', `/admin/external-services/${service}`),
    patchExternalService: (service, body) =>
      request('PATCH', `/admin/external-services/${service}`, body),
    putExternalCredentials: (service, body) =>
      request('PUT', `/admin/external-services/${service}/credentials`, body),
    deleteExternalCredential: (service, fieldKey) =>
      request('DELETE', `/admin/external-services/${service}/credentials/${fieldKey}`),
    testExternalService: (service) =>
      request('POST', `/admin/external-services/${service}/test`, {}),
    freightQuote: (body) => request('POST', '/freight/quote', body),
    freightServiceOptions: () => request('GET', '/freight/service-options'),
    getFreightDefaultOption: () => request('GET', '/freight/default-option'),
    putFreightDefaultOption: (body) => request('PUT', '/freight/default-option', body),
    createOrder: (body) => request('POST', '/orders', body),
    updateOrder: (id, body) => request('PATCH', `/orders/${id}`, body),
    deleteOrder: (id) => request('DELETE', `/orders/${id}`),
    listOrders: (qs = '') => request('GET', `/orders${qs ? `?${qs}` : ''}`),
    ordersFacets: (qs = '') => request('GET', `/orders/facets${qs ? `?${qs}` : ''}`),
    ordersStatusConfig: () => request('GET', '/orders/status-config'),
    ordersBulk: (body) => request('POST', '/orders/bulk', body),
    updateOrderStatus: (id, status) => request('PATCH', `/orders/${id}/status`, { status }),
    ordersByUser: (userCode) => request('GET', `/orders/by-user/${encodeURIComponent(userCode)}`),
    createLoggiLabel: (body) => request('POST', '/modules/loggi/create-label', body),
    cancelLoggiLabel: (body) => request('POST', '/modules/loggi/cancel', body),
    createMelhorEnvioLabel: (body) => request('POST', '/modules/melhorenvio/create-label', body),
    cancelMelhorEnvioLabel: (body) => request('POST', '/modules/melhorenvio/cancel', body),
    listSystemUsers: () => request('GET', '/system-users'),
    getSystemUser: (id) => request('GET', `/system-users/${id}`),
    createSystemUser: (body) => request('POST', '/system-users', body),
    updateSystemUser: (id, body) => request('PATCH', `/system-users/${id}`, body),
    deleteSystemUser: (id) => request('DELETE', `/system-users/${id}`),
    configSystems: () => request('GET', '/config/systems'),
    configBySystem: (system) => request('GET', `/config?system=${encodeURIComponent(system)}`),
    getConfig: (id) => request('GET', `/config/${id}`),
    createConfig: (body) => request('POST', '/config', body),
    updateConfig: (id, body) => request('PATCH', `/config/${id}`, body),
    clearConfig: (id) => request('POST', `/config/${id}/clear`, {}),
    deleteConfig: (id) => request('DELETE', `/config/${id}`),
    listItems: (collection, qs = '') => request('GET', `/items/${collection}${qs ? `?${qs}` : ''}`),
    getItem: (collection, id) => request('GET', `/items/${collection}/${id}`),
    createItem: (collection, body) => request('POST', `/items/${collection}`, body),
    updateItem: (collection, id, body) => request('PATCH', `/items/${collection}/${id}`, body),
    deleteItem: (collection, id) => request('DELETE', `/items/${collection}/${id}`),

    // Reception / triage
    receptionFormSchema: () => request('GET', '/reception/form-schema'),
    createPublicReception: (body) => request('POST', '/reception/public', body),
    receptionStatusCounts: () => request('GET', '/reception/status-counts'),
    receptionAttendants: () => request('GET', '/reception/attendants'),
    createReception: (body) => request('POST', '/reception', body),
    completeReception: (id, completion_reason) =>
      request('PATCH', `/reception/${id}/complete`, { completion_reason }),
    assignReceptionAttendant: (id, attendant) =>
      request('PATCH', `/reception/${id}/attendant`, { attendant }),
    clearReceptionAttendant: (id) =>
      request('PATCH', `/reception/${id}/attendant`, { attendant: null }),
    updateReceptionStatus: (id, status) =>
      request('PATCH', `/reception/${id}/status`, { status }),
    linkReceptionAssociate: (id, associate_code) =>
      request('PATCH', `/reception/${id}/link`, { associate_code }),
    unlinkReceptionAssociate: (id) => request('PATCH', `/reception/${id}/unlink`, {}),
    searchUsers: (q) => request('GET', `/users/search?q=${encodeURIComponent(q)}`),
    getUserByCode: (userCode) =>
      request('GET', `/users/by-code/${encodeURIComponent(userCode)}`),

    // System activity
    listActivity: (qs = '') => request('GET', `/activity${qs ? `?${qs}` : ''}`),
    listMyActivity: (qs = '') => request('GET', `/activity/mine${qs ? `?${qs}` : ''}`),
    myActivityUnreadCount: () => request('GET', '/activity/mine/unread-count'),
    markActivityRead: (body) => request('POST', '/activity/mine/read', body),
  };
}
