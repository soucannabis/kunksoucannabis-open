'use strict';

const { Router } = require('express');
const searchService = require('../services/searchService');
const { authenticate } = require('../middleware/authenticate');
const { ok } = require('../utils/response');

const router = Router();
router.use(authenticate);

router.get('/', async (req, res, next) => {
  try {
    const result = await searchService.globalSearch(req.query);
    res.json(ok(result.data, result.meta));
  } catch (err) {
    next(err);
  }
});

module.exports = router;
