import { API_URL, PASSWORD, responsiblePayload, patientPayload } from './fixtures.js';

const PHASE = {
  1: 'cadastro_criado',
  2: 'dados_pessoais',
  3: 'documentos',
  4: 'assinatura_termo',
  5: 'associado',
};

const PHASE_ORDER = {
  cadastro_criado: 1,
  dados_pessoais: 2,
  documentos: 3,
  assinatura_termo: 4,
  concluido: 5,
};

function phaseRank(value) {
  if (typeof value === 'number') return value;
  return PHASE_ORDER[value] || PHASE_ORDER[PHASE[value]] || 1;
}

/**
 * API helpers bound to Playwright's context.request (shares cookies with the browser).
 */
export function createApi(request) {
  async function json(method, path, body, options = {}) {
    const res = await request[method](`${API_URL}${path}`, {
      data: body,
      failOnStatusCode: false,
      ...options,
    });
    const data = await res.json().catch(() => ({}));
    return { status: res.status(), data, res };
  }

  return {
    registerEmail: (email, password = PASSWORD) => json('post', '/auth/associate/register-email', { email, password }),
    login: (email, password = PASSWORD) => json('post', '/auth/associate/login', { email, password }),
    logout: () => json('post', '/auth/associate/logout', {}),
    me: () => json('get', '/auth/associate/me'),
    patchMe: (fields) => json('patch', '/users/me', fields),
    createPatient: (fields) => json('post', '/users/me/patients', fields),
    advance: () => json('post', '/users/me/advance', {}),
    complete: () => json('post', '/users/me/complete', {}),
    documentsStatus: () => json('get', '/users/me/documents/status'),
    forgotPassword: (email) => json('post', '/auth/associate/forgot-password', { email }),
    resetPassword: (token, password) => json('post', '/auth/associate/reset-password', { token, password }),
    async uploadIdentity({ docType = 'cnh', side = 'front', subject = 'responsible' } = {}) {
      const res = await request.post(`${API_URL}/files`, {
        multipart: {
          file: {
            name: `${docType}-${side}.jpg`,
            mimeType: 'image/jpeg',
            buffer: Buffer.from([0xff, 0xd8, 0xff, 0xd9]),
          },
          doc_type: docType,
          side,
          subject,
          doc_kind: 'identity',
        },
        failOnStatusCode: false,
      });
      return { status: res.status(), data: await res.json().catch(() => ({})) };
    },
  };
}

/**
 * Ensure both doc-sign templates are published (needed before creating contracts).
 */
export async function ensureDocSignTemplatesPublished(request) {
  const login = await request.post(`${API_URL}/auth/login`, {
    data: { email: 'admin@kunk-api.test', password: 'TestAdmin123!' },
    failOnStatusCode: false,
  });
  if (login.status() !== 200) {
    // fallback: templates may already be published by another process
    return;
  }
  const setCookie = login.headers()['set-cookie'];
  const cookie = Array.isArray(setCookie) ? setCookie.map((c) => String(c).split(';')[0]).join('; ') : String(setCookie || '').split(';')[0];

  for (const kind of ['self', 'with_patient']) {
    const tpl = await request.get(`${API_URL}/doc-sign/templates/${kind}`, {
      headers: { Cookie: cookie },
      failOnStatusCode: false,
    });
    if (tpl.status() !== 200) continue;
    const body = await tpl.json().catch(() => ({}));
    if (body.data?.current_version_id) continue;
    await request.post(`${API_URL}/doc-sign/templates/${kind}/publish`, {
      headers: { Cookie: cookie },
      data: { notes: 'e2e auto-publish' },
      failOnStatusCode: false,
    });
  }
}

/**
 * Seed associate via API using page.context().request so the session cookie
 * is available to subsequent page.goto calls.
 * `phase` aceita 1–5 (legado e2e) ou string pt-BR.
 */
export async function seedAssociate(page, { email, phase = 1, responsibleType = 'himself' } = {}) {
  const targetRank = phaseRank(phase);
  if (targetRank >= 3) {
    await ensureDocSignTemplatesPublished(page.context().request);
  }
  const api = createApi(page.context().request);
  const reg = await api.registerEmail(email);
  if (reg.status !== 201) {
    throw new Error(`register failed: ${reg.status} ${JSON.stringify(reg.data)}`);
  }

  if (targetRank <= 1) {
    return { api, email, user: reg.data.data.user };
  }

  const patch = await api.patchMe(responsiblePayload({ responsible_type: responsibleType }));
  if (patch.status !== 200) {
    throw new Error(`patchMe failed: ${patch.status} ${JSON.stringify(patch.data)}`);
  }

  if (responsibleType === 'another') {
    const patient = await api.createPatient(patientPayload());
    if (patient.status !== 201) {
      throw new Error(`createPatient failed: ${patient.status} ${JSON.stringify(patient.data)}`);
    }
  }

  let me = await api.me();
  while (phaseRank(me.data?.data?.user?.associate_status) < 3 && targetRank >= 3) {
    const adv = await api.advance();
    if (adv.status !== 200) {
      throw new Error(`advance failed: ${adv.status} ${JSON.stringify(adv.data)}`);
    }
    me = await api.me();
  }

  if (targetRank >= 4) {
    const up = await api.uploadIdentity({ docType: 'cnh', subject: 'responsible' });
    if (up.status !== 201) throw new Error(`upload failed: ${up.status} ${JSON.stringify(up.data)}`);
    if (responsibleType === 'another') {
      const upP = await api.uploadIdentity({ docType: 'cnh', subject: 'patient' });
      if (upP.status !== 201) throw new Error(`patient upload failed: ${upP.status}`);
    }
    const adv = await api.advance();
    if (adv.status !== 200) {
      throw new Error(`advance to assinatura_termo failed: ${adv.status} ${JSON.stringify(adv.data)}`);
    }
  }

  if (targetRank >= 5) {
    const { forceAssociateStatus } = await import('./db.js');
    await forceAssociateStatus(email, {
      status: 'Associado',
      associate_status: 'assinatura_termo',
    });
  }

  me = await api.me();
  return { api, email, user: me.data?.data?.user };
}
