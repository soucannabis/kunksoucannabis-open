'use strict';

const { Router } = require('express');
const productsService = require('../services/productsService');
const { authenticate } = require('../middleware/authenticate');
const { authorize } = require('../middleware/authorize');
const { ok } = require('../utils/response');

const router = Router();
router.use(authenticate);

router.patch('/:id/batch', authorize('products', 'update'), async (req, res, next) => {
  try {
    const data = await productsService.updateBatch(req.params.id, req.body?.batch);
    res.json(ok(data));
  } catch (err) {
    next(err);
  }
});

router.post('/sync-batches', authorize('products', 'update'), async (req, res, next) => {
  try {
    const data = await productsService.syncBatches(req.body?.items || []);
    res.json(ok(data));
  } catch (err) {
    next(err);
  }
});

module.exports = router;
