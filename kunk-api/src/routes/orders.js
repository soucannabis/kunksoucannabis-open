'use strict';

const { Router } = require('express');
const ordersService = require('../services/ordersService');
const { authenticate } = require('../middleware/authenticate');
const { authorize } = require('../middleware/authorize');
const { ok } = require('../utils/response');

const router = Router();
router.use(authenticate);

router.get('/', authorize('orders', 'read'), async (req, res, next) => {
  try {
    const result = await ordersService.listOrders(req.query || {});
    res.json(ok(result.data, result.meta));
  } catch (err) {
    next(err);
  }
});

router.get('/facets', authorize('orders', 'read'), async (req, res, next) => {
  try {
    const data = await ordersService.facets(req.query || {});
    res.json(ok(data));
  } catch (err) {
    next(err);
  }
});

router.get('/status-config', authorize('orders', 'read'), async (req, res, next) => {
  try {
    const data = await ordersService.statusConfig();
    res.json(ok(data));
  } catch (err) {
    next(err);
  }
});

router.get('/stats', authorize('orders', 'read'), async (req, res, next) => {
  try {
    const data = await ordersService.stats();
    res.json(ok(data));
  } catch (err) {
    next(err);
  }
});

router.post('/bulk', authorize('orders', 'update'), async (req, res, next) => {
  try {
    const data = await ordersService.bulkAction(req.body || {});
    res.json(ok(data));
  } catch (err) {
    next(err);
  }
});

router.post('/', authorize('orders', 'create'), async (req, res, next) => {
  try {
    const data = await ordersService.createOrder(req.body || {}, req.user);
    res.status(201).json(ok(data));
  } catch (err) {
    next(err);
  }
});

router.get('/by-user/:userCode', authorize('orders', 'read'), async (req, res, next) => {
  try {
    const data = await ordersService.listByUser(req.params.userCode);
    res.json(ok(data));
  } catch (err) {
    next(err);
  }
});

router.patch('/:id', authorize('orders', 'update'), async (req, res, next) => {
  try {
    const data = await ordersService.updateOrder(req.params.id, req.body || {}, req.user);
    res.json(ok(data));
  } catch (err) {
    next(err);
  }
});

router.patch('/:id/status', authorize('orders', 'update'), async (req, res, next) => {
  try {
    const data = await ordersService.updateStatus(req.params.id, req.body?.status);
    res.json(ok(data));
  } catch (err) {
    next(err);
  }
});

router.patch('/:id/production', authorize('orders', 'update'), async (req, res, next) => {
  try {
    const data = await ordersService.updateProduction(req.params.id, req.body || {});
    res.json(ok(data));
  } catch (err) {
    next(err);
  }
});

router.post('/:id/payment', authorize('orders', 'update'), async (req, res, next) => {
  try {
    const data = await ordersService.registerPayment(req.params.id, req.body || {});
    res.json(ok(data));
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', authorize('orders', 'delete'), async (req, res, next) => {
  try {
    const data = await ordersService.deleteOrder(req.params.id);
    res.json(ok(data));
  } catch (err) {
    next(err);
  }
});

module.exports = router;
