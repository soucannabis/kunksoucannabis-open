'use strict';

const { Router } = require('express');
const { AppError } = require('../utils/response');

const router = Router();

router.post('/contracts', (req, res, next) => {
  next(
    new AppError(
      501,
      'TERMS_MODULE_IN_DEVELOPMENT',
      'Módulo de assinatura de termos em desenvolvimento'
    )
  );
});

router.get('/status', (req, res) => {
  res.status(501).json({
    data: { status: 'module_in_development' },
    meta: null,
    errors: [
      {
        code: 'TERMS_MODULE_IN_DEVELOPMENT',
        message: 'Módulo de assinatura de termos em desenvolvimento',
        details: null,
      },
    ],
  });
});

module.exports = router;
