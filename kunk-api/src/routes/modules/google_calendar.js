'use strict';

const { Router } = require('express');
const { requireModule } = require('./requireModule');
const { ok } = require('../../utils/response');
const auth = require('../../services/google_calendar/auth');
const calendars = require('../../services/google_calendar/calendars');
const events = require('../../services/google_calendar/events');
const credentialsService = require('../../services/credentialsService');
const { env } = require('../../config/env');

const router = Router();

router.get('/oauth/authorize', requireModule('google_calendar'), async (req, res, next) => {
  try {
    const { oauthRedirectUri } = require('../../utils/publicApiUrl');
    await auth.ensureCredentialRows();
    await credentialsService.putCredentials(
      'google_calendar',
      { redirect_uri: oauthRedirectUri('google_calendar', req) },
      { runTest: false }
    );
    const url = await auth.getAuthorizeUrl();
    if (req.query.redirect === '0') {
      return res.json(ok({ url }));
    }
    res.redirect(url);
  } catch (err) {
    next(err);
  }
});

router.get('/oauth/status', requireModule('google_calendar'), async (req, res, next) => {
  try {
    const data = await auth.oauthStatus();
    res.json(ok(data));
  } catch (err) {
    next(err);
  }
});

router.use(requireModule('google_calendar'));

router.get('/', (req, res) => {
  res.json(ok({ module: 'google_calendar', status: 'enabled' }));
});

router.get('/status', async (req, res, next) => {
  try {
    const { isModuleEnabled } = require('../../services/moduleFlags');
    const oauth = await auth.oauthStatus();
    const primary = await auth.getPrimaryCalendarId();
    const useScheduling = await auth.getSchedulingEnabled();
    res.json(
      ok({
        module: 'google_calendar',
        enabled: await isModuleEnabled('google_calendar'),
        use_for_scheduling: useScheduling,
        primary_calendar_id: primary,
        credentials_complete: oauth.credentials_complete,
        oauth_connected: oauth.connected,
        ...oauth,
      })
    );
  } catch (err) {
    next(err);
  }
});

router.get('/calendars', async (req, res, next) => {
  try {
    const data = await calendars.listCalendars();
    res.json(ok(data));
  } catch (err) {
    next(err);
  }
});

router.post('/events', async (req, res, next) => {
  try {
    const data = await events.createEvent(req.body || {});
    res.json(ok(data));
  } catch (err) {
    next(err);
  }
});

router.patch('/events/:eventId', async (req, res, next) => {
  try {
    const data = await events.updateEvent(req.params.eventId, {
      ...(req.body || {}),
      calendarId: req.body?.calendarId || req.query.calendarId,
    });
    res.json(ok(data));
  } catch (err) {
    next(err);
  }
});

router.delete('/events/:eventId', async (req, res, next) => {
  try {
    const calendarId = req.query.calendarId || req.body?.calendarId;
    const data = await events.deleteEvent(req.params.eventId, calendarId);
    res.json(ok(data));
  } catch (err) {
    next(err);
  }
});

router.post('/test', async (req, res, next) => {
  try {
    const creds = await credentialsService.resolveAll('google_calendar');
    await auth.testConnection(creds);
    await credentialsService.markTestResult('google_calendar', true);
    res.json(ok({ ok: true }));
  } catch (err) {
    await credentialsService.markTestResult('google_calendar', false).catch(() => {});
    next(err);
  }
});

module.exports = router;
