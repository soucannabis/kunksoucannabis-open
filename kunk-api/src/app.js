'use strict';

const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const { env } = require('./config/env');
const routes = require('./routes');
const { errorHandler } = require('./middleware/errorHandler');
const { fail } = require('./utils/response');

function createApp() {
  const app = express();
  app.use(cors({ origin: env.corsOrigin, credentials: true }));
  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());

  app.get('/health', (req, res) => {
    res.json({ data: { ok: true }, meta: null, errors: null });
  });

  app.use('/api/v1', routes);

  app.use((req, res) => {
    res.status(404).json(fail('NOT_FOUND', `Rota não encontrada: ${req.method} ${req.path}`));
  });

  app.use(errorHandler);
  return app;
}

module.exports = { createApp };
