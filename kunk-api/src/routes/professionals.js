'use strict';

const { Router } = require('express');
const professionalsService = require('../services/professionalsService');
const { authenticate } = require('../middleware/authenticate');
const { authorize } = require('../middleware/authorize');
const { ok } = require('../utils/response');

const router = Router();
router.use(authenticate);

router.get('/', authorize('professionals', 'read'), async (req, res, next) => {
  try {
    const data = await professionalsService.list(req.query);
    res.json(ok(data));
  } catch (err) {
    next(err);
  }
});

router.patch('/:id/donation-balance', authorize('professionals', 'update'), async (req, res, next) => {
  try {
    const data = await professionalsService.updateDonationBalance(
      req.params.id,
      req.body?.donation_balance
    );
    res.json(ok(data));
  } catch (err) {
    next(err);
  }
});

module.exports = router;
