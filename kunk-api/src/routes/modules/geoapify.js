'use strict';

const { Router } = require('express');
const { requireModule } = require('./requireModule');
const { ok } = require('../../utils/response');
const geoClient = require('../../services/geoapify/client');
const validateAddress = require('../../services/geoapify/validateAddress');
const credentialsService = require('../../services/credentialsService');

const router = Router();
router.use(requireModule('geoapify'));

router.get('/', (req, res) => {
  res.json(ok({ module: 'geoapify', status: 'enabled' }));
});

router.get('/status', async (req, res, next) => {
  try {
    const data = await validateAddress.getValidationStatus();
    res.json(ok(data));
  } catch (err) {
    next(err);
  }
});

router.post('/validate-address', async (req, res, next) => {
  try {
    const data = await validateAddress.validateAddress(req.body || {});
    res.json(ok(data));
  } catch (err) {
    next(err);
  }
});

router.post('/test', async (req, res, next) => {
  try {
    const creds = await credentialsService.resolveAll('geoapify');
    await geoClient.testConnection(creds);
    await credentialsService.markTestResult('geoapify', true);
    res.json(ok({ ok: true }));
  } catch (err) {
    await credentialsService.markTestResult('geoapify', false).catch(() => {});
    next(err);
  }
});

module.exports = router;
