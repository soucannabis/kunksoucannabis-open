'use strict';

/**
 * Cookie HttpOnly da sessão de operador (system_users) no Kunk OSS.
 * Nome distinto de `session_token` do Kunk legado para conviver em localhost
 * (cookies de localhost são compartilhados entre portas).
 */
const OPERATOR_SESSION_COOKIE = 'kunk_oss_session';

/** Cookie de sessão de associado (users) — cadastramento / doc-sign. */
const ASSOCIATE_SESSION_COOKIE = 'associate_session';

module.exports = {
  OPERATOR_SESSION_COOKIE,
  ASSOCIATE_SESSION_COOKIE,
};
