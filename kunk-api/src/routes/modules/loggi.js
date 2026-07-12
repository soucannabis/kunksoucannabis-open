'use strict';

const { Router } = require('express');
const { requireModule } = require('./requireModule');
const { ok } = require('../../utils/response');
const { LOGGI_SERVICE_CATALOG } = require('../../services/freightNormalize');
const loggiQuote = require('../../services/loggi/quote');
const loggiLabel = require('../../services/loggi/label');
const loggiClient = require('../../services/loggi/client');
const credentialsService = require('../../services/credentialsService');

const router = Router();
router.use(requireModule('loggi'));

router.get('/', (req, res) => {
  res.json(ok({ module: 'loggi', status: 'enabled' }));
});

router.get('/status', (req, res) => {
  res.json(ok({ module: 'loggi', enabled: true }));
});

router.get('/service-options', (req, res) => {
  res.json(ok({ provider: 'loggi', options: LOGGI_SERVICE_CATALOG }));
});

router.post('/quote-freight', async (req, res, next) => {
  try {
    const data = await loggiQuote.quoteFreight(req.body?.address || {});
    res.json(ok(data));
  } catch (err) {
    next(err);
  }
});

router.post('/create-label', async (req, res, next) => {
  try {
    const data = await loggiLabel.createLabel(req.body || {});
    res.json(ok(data));
  } catch (err) {
    next(err);
  }
});

router.post('/cancel', async (req, res, next) => {
  try {
    const data = await loggiLabel.cancelPackage(req.body || {});
    res.json(ok(data));
  } catch (err) {
    next(err);
  }
});

router.post('/packages', async (req, res, next) => {
  try {
    const data = await loggiLabel.getPackages(req.body || {});
    res.json(ok(data));
  } catch (err) {
    next(err);
  }
});

router.post('/test', async (req, res, next) => {
  try {
    const creds = await credentialsService.resolveAll('loggi');
    await loggiClient.testConnection(creds);
    await credentialsService.markTestResult('loggi', true);
    res.json(ok({ ok: true }));
  } catch (err) {
    await credentialsService.markTestResult('loggi', false).catch(() => {});
    next(err);
  }
});

module.exports = router;
