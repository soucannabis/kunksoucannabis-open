'use strict';

const { Router } = require('express');
const systemErrorsService = require('../services/systemErrorsService');
const { ok, AppError } = require('../utils/response');
const { checkRateLimit } = require('../utils/rateLimit');

const router = Router();

router.post('/', async (req, res, next) => {
  try {
    const ip = req.ip || req.socket?.remoteAddress || 'unknown';
    const rl = checkRateLimit(`system-errors:${ip}`, { limit: 60, windowMs: 60 * 1000 });
    if (!rl.ok) {
      throw new AppError(429, 'RATE_LIMITED', 'Muitos erros reportados. Aguarde um momento.');
    }

    const body = req.body || {};
    const user = req.user || null;
    const userCode =
      body.user_code ||
      user?.user_code ||
      user?.internal_code ||
      (user?.id != null ? String(user.id) : null);

    const row = await systemErrorsService.record({
      ...body,
      source: body.source || 'frontend',
      user_code: userCode,
      user_agent: body.user_agent || req.headers['user-agent'] || null,
      environment: body.environment || process.env.NODE_ENV || null,
    });

    res.status(201).json(ok({ id: row.id, error_hash: row.error_hash }));
  } catch (err) {
    next(err);
  }
});

module.exports = router;
