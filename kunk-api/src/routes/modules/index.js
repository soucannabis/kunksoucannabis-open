'use strict';

const { Router } = require('express');
const { env } = require('../../config/env');
const { authenticate } = require('../../middleware/authenticate');
const { ok } = require('../../utils/response');
const { requireModule } = require('./requireModule');

const MODULE_NAMES = [
  'pagarme',
  'loggi',
  'melhorenvio',
  'google_calendar',
  'beeviral',
  'utalk',
  'pipefy',
  'brasilnfe',
  'scp',
  'nibo',
  'geoapify',
  'ciap2',
];

const router = Router();
const meAuth = require('../../services/melhorenvio/auth');
const { AppError } = require('../../utils/response');

function adminPublicBase() {
  return (process.env.ADMIN_PUBLIC_URL || 'http://localhost:4256').replace(/\/$/, '');
}

function oauthResultHtml({ ok, message, type, servicePath, title }) {
  const admin = adminPublicBase();
  const payload = JSON.stringify({
    type,
    ok: Boolean(ok),
    message: message || null,
  });
  const redirect = ok
    ? `${admin}/servicos-externos/${servicePath}?oauth=ok`
    : `${admin}/servicos-externos/${servicePath}?oauth=error&message=${encodeURIComponent(message || 'oauth_failed')}`;
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="utf-8"><title>${title}</title></head>
<body>
  <p>${ok ? 'Autorização concluída. Esta aba pode ser fechada.' : `Falha: ${String(message || 'erro').replace(/[<>&]/g, '')}`}</p>
  <script>
    (function () {
      var payload = ${payload};
      try {
        if (window.opener && !window.opener.closed) {
          window.opener.postMessage(payload, ${JSON.stringify(admin)});
        }
      } catch (e) {}
      try { window.close(); } catch (e) {}
      setTimeout(function () { location.replace(${JSON.stringify(redirect)}); }, 400);
    })();
  </script>
</body>
</html>`;
}

function meOauthResultHtml(opts) {
  return oauthResultHtml({
    ...opts,
    type: 'melhorenvio-oauth',
    servicePath: 'melhorenvio',
    title: 'Melhor Envio OAuth',
  });
}

function googleOauthResultHtml(opts) {
  return oauthResultHtml({
    ...opts,
    type: 'google-calendar-oauth',
    servicePath: 'google_calendar',
    title: 'Google Calendar OAuth',
  });
}

/** OAuth callback must be public — Melhor Envio redirects the browser here without our session. */
router.get('/melhorenvio/oauth/callback', requireModule('melhorenvio'), async (req, res, next) => {
  const asJson = String(req.query.format || '') === 'json';
  try {
    const code = req.query.code;
    if (!code) {
      const tip =
        'code OAuth ausente. Não abra esta URL manualmente — use “Autorizar no Melhor Envio” no admin. Após autorizar, o Melhor Envio redireciona para cá com ?code=…';
      if (asJson) throw new AppError(400, 'VALIDATION_ERROR', tip);
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.status(200).send(meOauthResultHtml({ ok: false, message: tip }));
    }
    await meAuth.exchangeCode(code);
    if (asJson) return res.json(ok({ ok: true }));
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(200).send(meOauthResultHtml({ ok: true }));
  } catch (err) {
    if (asJson) return next(err);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(200).send(meOauthResultHtml({ ok: false, message: err.message || 'oauth_failed' }));
  }
});

const gcAuth = require('../../services/google_calendar/auth');

router.get('/google_calendar/oauth/callback', requireModule('google_calendar'), async (req, res, next) => {
  const asJson = String(req.query.format || '') === 'json';
  try {
    const code = req.query.code;
    if (!code) {
      const tip =
        'code OAuth ausente. Use “Autorizar com Google” no admin. Após autorizar, o Google redireciona para cá com ?code=…';
      if (asJson) throw new AppError(400, 'VALIDATION_ERROR', tip);
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.status(200).send(googleOauthResultHtml({ ok: false, message: tip }));
    }
    await gcAuth.exchangeCode(code);
    if (asJson) return res.json(ok({ ok: true }));
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(200).send(googleOauthResultHtml({ ok: true }));
  } catch (err) {
    if (asJson) return next(err);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(200).send(googleOauthResultHtml({ ok: false, message: err.message || 'oauth_failed' }));
  }
});

/** Public CIAP-2 status (no auth) — used by Kunk and cadastramento. */
const ciap2Router = require('./ciap2');
router.use('/ciap2', ciap2Router);

router.use(authenticate);

router.get('/', (req, res) => {
  const list = MODULE_NAMES.map((name) => ({
    name,
    enabled: Boolean(env.modules[name]),
  }));
  res.json(ok(list));
});

const loggiRouter = require('./loggi');
const melhorenvioRouter = require('./melhorenvio');
const geoapifyRouter = require('./geoapify');
const googleCalendarRouter = require('./google_calendar');
router.use('/loggi', loggiRouter);
router.use('/melhorenvio', melhorenvioRouter);
router.use('/geoapify', geoapifyRouter);
router.use('/google_calendar', googleCalendarRouter);

for (const name of MODULE_NAMES) {
  if (
    name === 'loggi' ||
    name === 'melhorenvio' ||
    name === 'geoapify' ||
    name === 'google_calendar' ||
    name === 'ciap2'
  ) {
    continue;
  }
  router.get(`/${name}`, requireModule(name), (req, res) => {
    res.json(ok({ module: name, status: 'enabled', message: 'Stub ativo' }));
  });
  router.get(`/${name}/status`, requireModule(name), (req, res) => {
    res.json(ok({ module: name, enabled: true }));
  });
}

module.exports = { router, MODULE_NAMES, requireModule };
