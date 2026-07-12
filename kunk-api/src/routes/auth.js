'use strict';

const { Router } = require('express');
const authRepository = require('../repositories/authRepository');
const authAssociate = require('./authAssociate');
const { authenticate } = require('../middleware/authenticate');
const { authorizeAdmin } = require('../middleware/authorize');
const { ok } = require('../utils/response');
const { env } = require('../config/env');

const router = Router();

router.use('/associate', authAssociate);

router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body || {};
    const { user, sessionToken, expires } = await authRepository.login(email, password);
    res.cookie('session_token', sessionToken, {
      httpOnly: true,
      secure: env.cookieSecure,
      sameSite: 'lax',
      path: '/',
      maxAge: env.sessionMaxHours * 3600 * 1000,
      expires,
    });
    res.json(ok({ user }));
  } catch (err) {
    next(err);
  }
});

router.post('/logout', async (req, res, next) => {
  try {
    await authRepository.logout(req.cookies?.session_token);
    res.cookie('session_token', '', {
      httpOnly: true,
      secure: env.cookieSecure,
      sameSite: 'lax',
      path: '/',
      maxAge: 0,
    });
    res.json(ok({ ok: true }));
  } catch (err) {
    next(err);
  }
});

router.get('/me', authenticate, async (req, res) => {
  res.json(ok({ user: req.user }));
});

router.post('/tokens', authenticate, authorizeAdmin, async (req, res, next) => {
  try {
    const { email, scopes } = req.body || {};
    const token = await authRepository.createApiToken({ email, scopes });
    res.status(201).json(ok(token));
  } catch (err) {
    next(err);
  }
});

router.get('/tokens', authenticate, authorizeAdmin, async (req, res, next) => {
  try {
    const tokens = await authRepository.listApiTokens();
    res.json(ok(tokens));
  } catch (err) {
    next(err);
  }
});

router.delete('/tokens/:id', authenticate, authorizeAdmin, async (req, res, next) => {
  try {
    const result = await authRepository.revokeApiToken(req.params.id);
    res.json(ok(result));
  } catch (err) {
    next(err);
  }
});

module.exports = router;
