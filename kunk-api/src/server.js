'use strict';

const { createApp } = require('./app');
const { env } = require('./config/env');
const { checkConnection } = require('./db/pool');
const systemErrorsService = require('./services/systemErrorsService');

function installProcessErrorHooks() {
  process.on('unhandledRejection', (reason) => {
    const err = reason instanceof Error ? reason : new Error(String(reason));
    console.error('[kunk-api] unhandledRejection', err);
    void systemErrorsService.recordSafe({
      ...systemErrorsService.payloadFromBackendError(err),
      code: 'UNHANDLED_REJECTION',
      metadata: { hook: 'unhandledRejection' },
    });
  });

  process.on('uncaughtException', (err) => {
    console.error('[kunk-api] uncaughtException', err);
    void systemErrorsService.recordSafe({
      ...systemErrorsService.payloadFromBackendError(err),
      code: 'UNCAUGHT_EXCEPTION',
      metadata: { hook: 'uncaughtException' },
    });
  });
}

async function main() {
  if (!env.databaseUrl) {
    console.error('DATABASE_URL is required');
    process.exit(1);
  }

  try {
    await checkConnection();
    console.log('Database connected');
  } catch (err) {
    console.error('Database connection failed:', err.message);
    process.exit(1);
  }

  installProcessErrorHooks();

  const app = createApp();
  const host = process.env.HOST || '0.0.0.0';
  app.listen(env.port, host, () => {
    console.log(`kunk-api listening on http://${host}:${env.port}/api/v1`);
  });
}

main();
