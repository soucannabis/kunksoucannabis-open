'use strict';

const { Router } = require('express');
const partnersService = require('../services/partnersService');
const { authenticate } = require('../middleware/authenticate');
const { authorize } = require('../middleware/authorize');
const { ok } = require('../utils/response');

const router = Router();
router.use(authenticate);

router.get('/by-code/:user_code', authorize('partners', 'read'), async (req, res, next) => {
  try {
    const data = await partnersService.byCode(req.params.user_code);
    res.json(ok(data));
  } catch (err) {
    next(err);
  }
});

router.patch('/:id/favorite', authorize('partners', 'update'), async (req, res, next) => {
  try {
    const data = await partnersService.setFavorite(req.params.id, req.body?.is_favorite);
    res.json(ok(data));
  } catch (err) {
    next(err);
  }
});

module.exports = router;
