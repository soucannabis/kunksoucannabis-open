'use strict';

const { Router } = require('express');
const credentialsService = require('../services/credentialsService');
const storeFreight = require('../services/storeFreightConfig');
const systemConfigService = require('../services/systemConfigService');
const loggiClient = require('../services/loggi/client');
const meAuth = require('../services/melhorenvio/auth');
const geoClient = require('../services/geoapify/client');
const gcAuth = require('../services/google_calendar/auth');
const { ok, AppError } = require('../utils/response');
const { env } = require('../config/env');
const { query } = require('../db/pool');
const { oauthRedirectUri } = require('../utils/publicApiUrl');

const SERVICES = ['loggi', 'melhorenvio', 'geoapify', 'google_calendar'];
const FREIGHT_SERVICES = new Set(['loggi', 'melhorenvio']);

const router = Router();

function serviceOrThrow(service) {
  if (!SERVICES.includes(service)) {
    throw new AppError(404, 'NOT_FOUND', `Serviço ${service} desconhecido`);
  }
  return service;
}

function asBool(v, fb) {
  if (v == null || v === '') return fb;
  return String(v).toLowerCase() === 'true' || v === '1' || v === true;
}

async function getModuleConfigFlags(service) {
  const enabledKey = `modules.${service}.enabled`;
  const quoteKey = `modules.${service}.use_for_quote`;
  const labelKey = `modules.${service}.use_for_label`;
  const validationKey = `modules.${service}.use_for_validation`;
  const schedulingKey = `modules.${service}.use_for_scheduling`;
  const primaryKey = `modules.${service}.primary_calendar_id`;
  const result = await query(
    `SELECT key, value FROM system_configs
     WHERE system = 'modules' AND key = ANY($1::text[])`,
    [[enabledKey, quoteKey, labelKey, validationKey, schedulingKey, primaryKey]]
  );
  const values = Object.fromEntries(result.rows.map((r) => [r.key, r.value]));
  const flags = {
    enabled: env.modules[service] === true,
    config_enabled: asBool(values[enabledKey], false),
  };
  if (FREIGHT_SERVICES.has(service)) {
    flags.use_for_quote = asBool(values[quoteKey], service === 'loggi' || service === 'melhorenvio');
    flags.use_for_label = asBool(values[labelKey], service === 'loggi');
  }
  if (service === 'geoapify') {
    flags.use_for_validation = asBool(values[validationKey], false);
  }
  if (service === 'google_calendar') {
    flags.use_for_scheduling = asBool(values[schedulingKey], true);
    flags.primary_calendar_id = values[primaryKey] || null;
  }
  return flags;
}

async function upsertModuleFlag(key, value, description, valueType = 'boolean') {
  const serialized =
    valueType === 'boolean' ? (value ? 'true' : 'false') : value == null ? null : String(value);
  const existing = await query(
    `SELECT id FROM system_configs WHERE system = 'modules' AND key = $1 LIMIT 1`,
    [key]
  );
  if (existing.rows[0]?.id) {
    await systemConfigService.updateConfig(existing.rows[0].id, { value: serialized });
  } else {
    await systemConfigService.createConfig({
      system: 'modules',
      key,
      value: serialized,
      value_type: valueType,
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
    let [flags, credentials, storeCfg] = await Promise.all([
      getModuleConfigFlags(service),
      credentialsService.listPublic(service),
      service === 'melhorenvio' ? storeFreight.getStoreFreightConfig() : Promise.resolve(null),
    ]);
    const payload = { service, ...flags, credentials };
    if (service === 'melhorenvio') {
      const hasEnvRow = credentials.some((c) => c.field_key === 'environment');
      if (!hasEnvRow) await meAuth.ensureEnvironmentRow();

      const envCred = credentials.find((c) => c.field_key === 'environment');
      const apiCred = credentials.find((c) => c.field_key === 'api_base_url');
      const environment = envCred?.value
        ? meAuth.resolveEnvironmentKey(envCred.value)
        : apiCred?.value
          ? meAuth.detectEnvironmentFromApiBase(apiCred.value)
          : 'sandbox';
      const pinned = meAuth.ME_ENVIRONMENTS[environment].api_base_url;

      const accessCred = credentials.find((c) => c.field_key === 'access_token');
      const refreshCred = credentials.find((c) => c.field_key === 'refresh_token');
      payload.oauth = {
        authenticated: Boolean(accessCred?.has_value),
        has_refresh: Boolean(refreshCred?.has_value),
      };
      payload.environment = environment;
      payload.me_urls = meAuth.ME_ENVIRONMENTS;

      // Pin display values without writing on every GET
      const redirectUri = oauthRedirectUri('melhorenvio', req);
      payload.oauth_redirect_uri = redirectUri;
      payload.credentials = credentials.map((c) => {
        if (c.field_key === 'api_base_url') {
          return { ...c, value: pinned, has_value: true, source: c.source || 'db' };
        }
        if (c.field_key === 'environment') {
          return { ...c, value: environment, has_value: true, source: c.source || 'db' };
        }
        if (c.field_key === 'redirect_uri') {
          return { ...c, value: redirectUri, has_value: true, source: 'computed' };
        }
        return c;
      });
      payload.hidden_cred_fields = [
        'access_token',
        'refresh_token',
        'environment',
        'api_base_url',
        'redirect_uri',
      ];

      try {
        storeFreight.assertShipFrom(storeCfg.ship_from);
        storeFreight.assertPackage(storeCfg.package);
        storeFreight.assertContentDeclaration(storeCfg.content_declaration);
        payload.store_freight_ready = true;
      } catch (err) {
        payload.store_freight_ready = false;
        payload.store_freight_missing = err.details?.missing || [];
      }
    }
    if (service === 'google_calendar') {
      const needed = ['client_id', 'client_secret', 'redirect_uri'];
      const hasFormRows = needed.every((k) => credentials.some((c) => c.field_key === k));
      if (!hasFormRows) {
        await gcAuth.ensureCredentialRows();
        credentials = await credentialsService.listPublic(service);
      }
      const redirectUri = oauthRedirectUri('google_calendar', req);
      payload.oauth_redirect_uri = redirectUri;
      payload.credentials = credentials.map((c) => {
        if (c.field_key === 'redirect_uri') {
          return { ...c, value: redirectUri, has_value: true, source: 'computed' };
        }
        return c;
      });
      const accessCred = credentials.find((c) => c.field_key === 'access_token');
      const refreshCred = credentials.find((c) => c.field_key === 'refresh_token');
      payload.oauth = {
        authenticated: Boolean(accessCred?.has_value || refreshCred?.has_value),
        has_refresh: Boolean(refreshCred?.has_value),
      };
      payload.hidden_cred_fields = ['access_token', 'refresh_token', 'redirect_uri'];
    }
    res.json(ok(payload));
  } catch (err) {
    next(err);
  }
});

router.patch('/:service', async (req, res, next) => {
  try {
    const service = serviceOrThrow(req.params.service);
    const body = req.body || {};

    const enablingFreight =
      service === 'melhorenvio' &&
      (body.use_for_quote === true || body.use_for_label === true || body.enabled === true);
    if (enablingFreight) {
      const cfg = await storeFreight.getStoreFreightConfig();
      try {
        storeFreight.assertShipFrom(cfg.ship_from);
        storeFreight.assertPackage(cfg.package);
        storeFreight.assertContentDeclaration(cfg.content_declaration);
      } catch (err) {
        throw new AppError(
          400,
          'CONFIG_INCOMPLETE',
          'Preencha remetente, caixa e declaração de conteúdo em Serviços externos → Dados de envio antes de ativar o Melhor Envio',
          {
            missing: err.details?.missing || [
              'store.ship_from',
              'store.freight.package',
              'store.freight.content_declaration',
            ],
          }
        );
      }
    }

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
    if (body.use_for_validation !== undefined) {
      await upsertModuleFlag(
        `modules.${service}.use_for_validation`,
        Boolean(body.use_for_validation),
        `Usar ${service} na verificação de endereço`
      );
    }
    if (body.use_for_scheduling !== undefined) {
      await upsertModuleFlag(
        `modules.${service}.use_for_scheduling`,
        Boolean(body.use_for_scheduling),
        `Usar ${service} no agendamento de serviços`
      );
    }
    if (body.primary_calendar_id !== undefined) {
      await upsertModuleFlag(
        `modules.${service}.primary_calendar_id`,
        body.primary_calendar_id || null,
        'Calendário principal da associação',
        'string'
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
    const fields = { ...(req.body?.fields || {}) };
    const runTest = req.body?.run_test !== false;

    if (service === 'melhorenvio') {
      await meAuth.ensureEnvironmentRow();
      const envKey = meAuth.resolveEnvironmentKey(
        fields.environment || (await meAuth.getEnvironment())
      );
      fields.environment = envKey;
      fields.api_base_url = meAuth.ME_ENVIRONMENTS[envKey].api_base_url;
    }

    if (service === 'google_calendar') {
      await gcAuth.ensureCredentialRows();
    }

    // Redirect URI is always computed by the API — never taken from the admin form.
    if (service === 'melhorenvio' || service === 'google_calendar') {
      fields.redirect_uri = oauthRedirectUri(service, req);
    }

    const testFn = async (merged) => {
      if (service === 'loggi') {
        await loggiClient.testConnection(merged);
      } else if (service === 'geoapify') {
        await geoClient.testConnection(merged);
      } else if (service === 'google_calendar') {
        await gcAuth.testConnection(merged);
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

router.post('/:service/activate-production', async (req, res, next) => {
  try {
    const service = serviceOrThrow(req.params.service);
    if (service !== 'melhorenvio') {
      throw new AppError(400, 'VALIDATION_ERROR', 'Somente Melhor Envio suporta ativar produção');
    }
    const result = await meAuth.setEnvironment('production', { clearAppCredentials: true });
    const credentials = await credentialsService.listPublic(service);
    const oauth = await meAuth.oauthStatus();
    res.json(
      ok({
        service,
        ...result,
        credentials,
        oauth,
        message:
          'Produção ativada. Informe client_id e client_secret do app de produção e autorize novamente.',
      })
    );
  } catch (err) {
    next(err);
  }
});

router.post('/:service/activate-sandbox', async (req, res, next) => {
  try {
    const service = serviceOrThrow(req.params.service);
    if (service !== 'melhorenvio') {
      throw new AppError(400, 'VALIDATION_ERROR', 'Somente Melhor Envio suporta ativar sandbox');
    }
    const result = await meAuth.setEnvironment('sandbox', { clearAppCredentials: true });
    const credentials = await credentialsService.listPublic(service);
    const oauth = await meAuth.oauthStatus();
    res.json(
      ok({
        service,
        ...result,
        credentials,
        oauth,
        message: 'Sandbox ativado. Use as credenciais do app de teste e autorize novamente.',
      })
    );
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
    } else if (service === 'geoapify') {
      await geoClient.testConnection(creds);
    } else if (service === 'google_calendar') {
      await gcAuth.testConnection(creds);
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
