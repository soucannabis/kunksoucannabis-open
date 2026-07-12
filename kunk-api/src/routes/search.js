'use strict';

const { Router } = require('express');
const searchService = require('../services/searchService');
const { authenticate } = require('../middleware/authenticate');
const { ok } = require('../utils/response');

const router = Router();
router.use(authenticate);

router.get('/', async (req, res, next) => {
  try {
    const data = await searchService.globalSearch(req.query.q, req.query.entity);
    res.json(ok(data));
  } catch (err) {
    next(err);
  }
});

module.exports = router;
