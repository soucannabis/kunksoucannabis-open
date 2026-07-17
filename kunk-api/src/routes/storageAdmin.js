'use strict';

const { Router } = require('express');
const storageAdminService = require('../services/storageAdminService');
const { ok } = require('../utils/response');

const router = Router();

router.get('/', async (req, res, next) => {
  try {
    res.json(ok(await storageAdminService.getStatus()));
  } catch (err) {
    next(err);
  }
});

router.put('/', async (req, res, next) => {
  try {
    res.json(ok(await storageAdminService.saveConfig(req.body || {})));
  } catch (err) {
    next(err);
  }
});

router.post('/test', async (req, res, next) => {
  try {
    res.json(ok(await storageAdminService.testConnection(req.body || {})));
  } catch (err) {
    next(err);
  }
});

router.post('/activate', async (req, res, next) => {
  try {
    res.json(ok(await storageAdminService.activate(req.body || {})));
  } catch (err) {
    next(err);
  }
});

module.exports = router;
