'use strict';

const { env } = require('../../config/env');
const { fail } = require('../../utils/response');

function requireModule(name) {
  return (req, res, next) => {
    if (!env.modules[name]) {
      return res.status(503).json(
        fail('MODULE_DISABLED', `Módulo ${name} desabilitado`, { module: name })
      );
    }
    next();
  };
}

module.exports = { requireModule };
