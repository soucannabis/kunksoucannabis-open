'use strict';

const { Router } = require('express');
const credentialsService = require('../services/credentialsService');
const storeFreight = require('../services/storeFreightConfig');
const systemConfigService = require('../services/systemConfigService');
const loggiClient = require('../services/loggi/client');
const meAuth = require('../services/melhorenvio/auth');
const { ok, AppError } = require('../utils/response');
const { env } = require('../config/env');

const SERVICES = ['loggi', 'melhorenvio'];

const router = Router();

function serviceOrThrow(service) {
  if (!SERVICES.includes(service)) {
    throw new AppError(404, 'NOT_FOUND', `Serviço ${service} desconhecido`);
  }
  return service;
}

async function getModuleConfigFlags(service) {
  const { values } = await systemConfigService.resolveAll('modules');
  const enabledKey = `modules.${service}.enabled`;
  const quoteKey = `modules.${service}.use_for_quote`;
  const labelKey = `modules.${service}.use_for_label`;
  const asBool = (v, fb) => {
    if (v == null || v === '') return fb;
    return String(v).toLowerCase() === 'true' || v === '1' || v === true;
  };
  return {
    enabled: env.modules[service] === true,
    config_enabled: asBool(values[enabledKey], false),
    use_for_quote: asBool(values[quoteKey], service === 'loggi' || service === 'melhorenvio'),
    use_for_label: asBool(values[labelKey], service === 'loggi'),
  };
}

async function upsertModuleFlag(key, value, description) {
  const listed = await systemConfigService.listBySystem('modules');
  const row = (listed || []).find((r) => r.key === key);
  const serialized = value ? 'true' : 'false';
  if (row?.id) {
    await systemConfigService.updateConfig(row.id, { value: serialized });
  } else {
    await systemConfigService.createConfig({
      system: 'modules',
      key,
      value: serialized,
      value_type: 'boolean',
      is_sensitive: false,
      allow_hardcoded: false,
      description,
    });
  }
}

router.get('/', async (req, res, next) => {
  try {
    const list = [];
    for (const service of SERVICES) {
      const flags = await getModuleConfigFlags(service);
      const credentials = await credentialsService.listPublic(service);
      list.push({ service, ...flags, credentials });
    }
    const store = await storeFreight.getStoreFreightConfig();
    res.json(
      ok({
        services: list,
        store_incomplete: {
          ship_from: !store.ship_from,
          package: !store.package,
          content_declaration: !store.content_declaration,
        },
      })
    );
  } catch (err) {
    next(err);
  }
});

router.get('/:service', async (req, res, next) => {
  try {
    const service = serviceOrThrow(req.params.service);
    const flags = await getModuleConfigFlags(service);
    const credentials = await credentialsService.listPublic(service);
    res.json(ok({ service, ...flags, credentials }));
  } catch (err) {
    next(err);
  }
});

router.patch('/:service', async (req, res, next) => {
  try {
    const service = serviceOrThrow(req.params.service);
    const body = req.body || {};
    if (body.use_for_quote !== undefined) {
      await upsertModuleFlag(
        `modules.${service}.use_for_quote`,
        Boolean(body.use_for_quote),
        `Usar ${service} no cálculo de frete`
      );
    }
    if (body.use_for_label !== undefined) {
      await upsertModuleFlag(
        `modules.${service}.use_for_label`,
        Boolean(body.use_for_label),
        `Usar ${service} na geração de etiqueta`
      );
    }
    if (body.enabled !== undefined) {
      await upsertModuleFlag(
        `modules.${service}.enabled`,
        Boolean(body.enabled),
        `Módulo ${service} habilitado (espelha env; runtime usa MODULE_*_ENABLED)`
      );
    }
    const flags = await getModuleConfigFlags(service);
    res.json(
      ok({
        service,
        ...flags,
        note:
          'Habilitar o módulo em runtime exige MODULE_' +
          service.toUpperCase() +
          '_ENABLED=true no ambiente',
      })
    );
  } catch (err) {
    next(err);
  }
});

router.get('/:service/credentials', async (req, res, next) => {
  try {
    const service = serviceOrThrow(req.params.service);
    const credentials = await credentialsService.listPublic(service);
    res.json(ok({ service, credentials }));
  } catch (err) {
    next(err);
  }
});

router.put('/:service/credentials', async (req, res, next) => {
  try {
    const service = serviceOrThrow(req.params.service);
    const fields = req.body?.fields || {};
    const runTest = req.body?.run_test !== false;

    const testFn = async (merged) => {
      if (service === 'loggi') {
        await loggiClient.testConnection(merged);
      } else {
        await meAuth.testConnection(merged);
      }
    };

    const credentials = await credentialsService.putCredentials(service, fields, {
      runTest,
      testFn,
    });
    res.json(ok({ service, credentials, persisted: true }));
  } catch (err) {
    next(err);
  }
});

router.delete('/:service/credentials/:fieldKey', async (req, res, next) => {
  try {
    const service = serviceOrThrow(req.params.service);
    const credentials = await credentialsService.deleteCredential(service, req.params.fieldKey);
    res.json(ok({ service, credentials }));
  } catch (err) {
    next(err);
  }
});

router.post('/:service/test', async (req, res, next) => {
  try {
    const service = serviceOrThrow(req.params.service);
    const creds = await credentialsService.resolveAll(service);
    if (service === 'loggi') {
      await loggiClient.testConnection(creds);
    } else {
      await meAuth.testConnection(creds);
    }
    await credentialsService.markTestResult(service, true);
    res.json(ok({ ok: true }));
  } catch (err) {
    await credentialsService.markTestResult(req.params.service, false).catch(() => {});
    next(err);
  }
});

module.exports = router;
