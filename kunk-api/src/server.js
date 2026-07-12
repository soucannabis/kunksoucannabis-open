'use strict';

const { createApp } = require('./app');
const { env } = require('./config/env');
const { checkConnection } = require('./db/pool');

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

  const app = createApp();
  const host = process.env.HOST || '0.0.0.0';
  app.listen(env.port, host, () => {
    console.log(`kunk-api listening on http://${host}:${env.port}/api/v1`);
  });
}

main();
