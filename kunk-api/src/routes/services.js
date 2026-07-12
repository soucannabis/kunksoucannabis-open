'use strict';

const { Router } = require('express');
const servicesService = require('../services/servicesService');
const { authenticate } = require('../middleware/authenticate');
const { authorize } = require('../middleware/authorize');
const { scopeFilterFor } = require('../schema/rbac');
const { ok } = require('../utils/response');

const router = Router();
router.use(authenticate);

router.get('/', authorize('services', 'read'), async (req, res, next) => {
  try {
    const scopeFilter = scopeFilterFor(req.user?.roles || req.user?.permissions, req.user);
    const result = await servicesService.list(req.query, { scopeFilter });
    res.json(ok(result.data, result.meta));
  } catch (err) {
    next(err);
  }
});

router.post('/', authorize('services', 'create'), async (req, res, next) => {
  try {
    const data = await servicesService.createService(req.body || {}, req.user);
    res.status(201).json(ok(data));
  } catch (err) {
    next(err);
  }
});

router.patch('/:id', authorize('services', 'update'), async (req, res, next) => {
  try {
    const data = await servicesService.updateService(req.params.id, req.body || {});
    res.json(ok(data));
  } catch (err) {
    next(err);
  }
});

router.get('/by-professional/:id', authorize('services', 'read'), async (req, res, next) => {
  try {
    const data = await servicesService.byProfessional(req.params.id, req.query);
    res.json(ok(data));
  } catch (err) {
    next(err);
  }
});

router.get('/exists', authorize('services', 'read'), async (req, res, next) => {
  try {
    const data = await servicesService.exists(req.query.associate_user_code, req.query.professional_id);
    res.json(ok(data));
  } catch (err) {
    next(err);
  }
});

module.exports = router;
