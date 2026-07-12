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
];

const router = Router();

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
router.use('/loggi', loggiRouter);
router.use('/melhorenvio', melhorenvioRouter);

for (const name of MODULE_NAMES) {
  if (name === 'loggi' || name === 'melhorenvio') continue;
  router.get(`/${name}`, requireModule(name), (req, res) => {
    res.json(ok({ module: name, status: 'enabled', message: 'Stub ativo' }));
  });
  router.get(`/${name}/status`, requireModule(name), (req, res) => {
    res.json(ok({ module: name, enabled: true }));
  });
}

module.exports = { router, MODULE_NAMES, requireModule };
