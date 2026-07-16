'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const templates = require('../../src/services/email/templates');
const { normalizeConfig } = require('../../src/services/email');
const { checkRateLimit, resetRateLimits } = require('../../src/utils/rateLimit');

describe('email templates', () => {
  it('builds password reset template', () => {
    const tpl = templates.passwordReset({
      resetUrl: 'https://example.com/nova-senha?token=abc',
      associationName: 'Assoc',
    });
    assert.ok(tpl.subject);
    assert.match(tpl.html, /nova-senha\?token=abc/);
    assert.match(tpl.text, /https:\/\/example.com/);
  });

  it('builds invite and contract templates', () => {
    const invite = templates.systemInvite({
      inviteUrl: 'https://kunk/cadastro?token=x',
      recipientName: 'Ana',
    });
    assert.match(invite.html, /Ana/);
    const sign = templates.contractSigningLink({
      signingUrl: 'https://doc/assinar/tok',
      signerName: 'Bob',
    });
    assert.match(sign.html, /assinar\/tok/);
    const done = templates.contractSignedConfirmation({ signerName: 'Bob' });
    assert.match(done.html, /assinatura/);
  });
});

describe('email normalizeConfig', () => {
  it('parses port and secure', () => {
    const cfg = normalizeConfig({
      host: 'smtp.test',
      port: '465',
      secure: 'true',
      from_email: 'a@b.c',
      from_name: 'Test',
    });
    assert.equal(cfg.host, 'smtp.test');
    assert.equal(cfg.port, 465);
    assert.equal(cfg.secure, true);
    assert.equal(cfg.fromEmail, 'a@b.c');
  });
});

describe('rateLimit', () => {
  it('limits after N hits', () => {
    resetRateLimits();
    const key = `test-${Date.now()}`;
    for (let i = 0; i < 3; i++) {
      assert.equal(checkRateLimit(key, { limit: 3, windowMs: 60000 }).ok, true);
    }
    assert.equal(checkRateLimit(key, { limit: 3, windowMs: 60000 }).ok, false);
  });
});
