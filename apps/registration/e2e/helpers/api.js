import { API_URL, PASSWORD, responsiblePayload, patientPayload } from './fixtures.js';

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
 * Seed associate via API using page.context().request so the session cookie
 * is available to subsequent page.goto calls.
 */
export async function seedAssociate(page, { email, phase = 1, responsibleType = 'himself' } = {}) {
  const api = createApi(page.context().request);
  const reg = await api.registerEmail(email);
  if (reg.status !== 201) {
    throw new Error(`register failed: ${reg.status} ${JSON.stringify(reg.data)}`);
  }

  if (phase <= 1) {
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
  while ((me.data?.data?.user?.associate_status || 1) < 3 && phase >= 3) {
    const adv = await api.advance();
    if (adv.status !== 200) {
      throw new Error(`advance failed: ${adv.status} ${JSON.stringify(adv.data)}`);
    }
    me = await api.me();
  }

  if (phase >= 4) {
    const up = await api.uploadIdentity({ docType: 'cnh', subject: 'responsible' });
    if (up.status !== 201) throw new Error(`upload failed: ${up.status} ${JSON.stringify(up.data)}`);
    if (responsibleType === 'another') {
      const upP = await api.uploadIdentity({ docType: 'cnh', subject: 'patient' });
      if (upP.status !== 201) throw new Error(`patient upload failed: ${upP.status}`);
    }
    const adv = await api.advance();
    if (adv.status !== 200) {
      throw new Error(`advance to 4 failed: ${adv.status} ${JSON.stringify(adv.data)}`);
    }
  }

  if (phase >= 5) {
    const { forceAssociatePhase } = await import('./db.js');
    await forceAssociatePhase(email, 5);
  }

  me = await api.me();
  return { api, email, user: me.data?.data?.user };
}
