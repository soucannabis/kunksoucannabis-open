'use strict';

const { Router } = require('express');
const { requireModule } = require('./requireModule');
const { ok } = require('../../utils/response');
const meAuth = require('../../services/melhorenvio/auth');
const meQuote = require('../../services/melhorenvio/quote');
const meLabel = require('../../services/melhorenvio/label');
const credentialsService = require('../../services/credentialsService');

const router = Router();
router.use(requireModule('melhorenvio'));

router.get('/', (req, res) => {
  res.json(ok({ module: 'melhorenvio', status: 'enabled' }));
});

router.get('/status', async (req, res, next) => {
  try {
    const oauth = await meAuth.oauthStatus();
    res.json(ok({ module: 'melhorenvio', enabled: true, ...oauth }));
  } catch (err) {
    next(err);
  }
});

router.post('/quote', async (req, res, next) => {
  try {
    const data = await meQuote.quote(req.body || {});
    res.json(ok(data));
  } catch (err) {
    next(err);
  }
});

router.post('/correios-quote', async (req, res, next) => {
  try {
    const data = await meQuote.quote(req.body || {});
    res.json(ok(data));
  } catch (err) {
    next(err);
  }
});

router.get('/companies', async (req, res, next) => {
  try {
    const data = await meQuote.listCompanies();
    res.json(ok(data));
  } catch (err) {
    next(err);
  }
});

router.get('/services', async (req, res, next) => {
  try {
    const data = await meQuote.listServices();
    res.json(ok(data));
  } catch (err) {
    next(err);
  }
});

router.get('/service-options', async (req, res, next) => {
  try {
    const data = await meQuote.listServices();
    res.json(ok(data));
  } catch (err) {
    next(err);
  }
});

router.post('/create-label', async (req, res, next) => {
  try {
    const data = await meLabel.createLabel(req.body || {});
    res.json(ok(data));
  } catch (err) {
    next(err);
  }
});

router.post('/cancel', async (req, res, next) => {
  try {
    const data = await meLabel.cancelLabel(req.body || {});
    res.json(ok(data));
  } catch (err) {
    next(err);
  }
});

router.post('/shipment-details', async (req, res, next) => {
  try {
    const id = req.body?.id || req.body?.shipment_id || req.body?.carrier_order_code;
    const data = await meLabel.getShipmentDetails(id);
    res.json(ok(data));
  } catch (err) {
    next(err);
  }
});

router.get('/oauth/authorize', async (req, res, next) => {
  try {
    const credentialsService = require('../../services/credentialsService');
    const { oauthRedirectUri } = require('../../utils/publicApiUrl');
    await credentialsService.putCredentials(
      'melhorenvio',
      { redirect_uri: oauthRedirectUri('melhorenvio', req) },
      { runTest: false }
    );
    const url = await meAuth.buildAuthorizeUrl();
    res.json(ok({ url }));
  } catch (err) {
    next(err);
  }
});

/** Browser callback is registered publicly on /modules (before authenticate). */
router.get('/oauth/callback', async (req, res, next) => {
  try {
    const code = req.query.code;
    await meAuth.exchangeCode(code);
    res.json(ok({ ok: true }));
  } catch (err) {
    next(err);
  }
});

router.get('/oauth/status', async (req, res, next) => {
  try {
    const data = await meAuth.oauthStatus();
    res.json(ok(data));
  } catch (err) {
    next(err);
  }
});

router.post('/test', async (req, res, next) => {
  try {
    const creds = await credentialsService.resolveAll('melhorenvio');
    await meAuth.testConnection(creds);
    await credentialsService.markTestResult('melhorenvio', true);
    res.json(ok({ ok: true }));
  } catch (err) {
    await credentialsService.markTestResult('melhorenvio', false).catch(() => {});
    next(err);
  }
});

module.exports = router;
