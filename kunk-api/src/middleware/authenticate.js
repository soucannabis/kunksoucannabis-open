'use strict';

const authRepository = require('../repositories/authRepository');
const { AppError } = require('../utils/response');

function extractBearer(req) {
  const header = req.headers.authorization || '';
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : null;
}

async function authenticate(req, res, next) {
  try {
    const bearer = extractBearer(req);
    const cookieToken = req.cookies?.session_token;
    // associate_session may coexist on localhost (shared cookie jar across ports);
    // operator routes prefer session_token / Bearer and ignore associate cookies.
    const channels = [Boolean(bearer), Boolean(cookieToken)].filter(Boolean).length;
    if (channels > 1) {
      throw new AppError(401, 'AUTH_CONFLICT', 'Use cookie ou Bearer, não ambos');
    }

    if (!bearer && !cookieToken && req.cookies?.associate_session) {
      throw new AppError(401, 'UNAUTHORIZED', 'Cookie de associado não autorizado nesta rota');
    }

    if (bearer) {
      const apiToken = await authRepository.resolveBearer(bearer);
      if (!apiToken) {
        throw new AppError(401, 'UNAUTHORIZED', 'Token inválido');
      }
      req.auth = { type: 'api_key', scopes: apiToken.scopes };
      req.apiToken = apiToken;
      req.user = {
        id: apiToken.id,
        email: apiToken.email,
        permissions: apiToken.roles,
        roles: apiToken.roles,
        internal_code: null,
      };
      return next();
    }

    if (cookieToken) {
      const user = await authRepository.resolveSession(cookieToken);
      if (!user) {
        throw new AppError(401, 'UNAUTHORIZED', 'Sessão inválida ou expirada');
      }
      req.auth = { type: 'session', subject: 'operator' };
      req.user = { ...user, roles: user.permissions };
      return next();
    }

    throw new AppError(401, 'UNAUTHORIZED', 'Autenticação necessária');
  } catch (err) {
    next(err);
  }
}

function optionalAuthenticate(req, res, next) {
  const bearer = extractBearer(req);
  const cookieToken = req.cookies?.session_token;
  if (!bearer && !cookieToken) {
    return next();
  }
  return authenticate(req, res, next);
}

module.exports = { authenticate, optionalAuthenticate, extractBearer };
