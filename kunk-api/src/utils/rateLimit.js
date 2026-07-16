'use strict';

/**
 * Simple in-memory rate limiter (per process).
 * Suitable for single-instance installs; returns true when under limit.
 */
const buckets = new Map();

function prune(key, windowMs) {
  const entry = buckets.get(key);
  if (!entry) return;
  const cutoff = Date.now() - windowMs;
  entry.times = entry.times.filter((t) => t > cutoff);
  if (!entry.times.length) buckets.delete(key);
}

function checkRateLimit(key, { limit = 5, windowMs = 15 * 60 * 1000 } = {}) {
  const now = Date.now();
  prune(key, windowMs);
  let entry = buckets.get(key);
  if (!entry) {
    entry = { times: [] };
    buckets.set(key, entry);
  }
  if (entry.times.length >= limit) {
    return { ok: false, retryAfterMs: entry.times[0] + windowMs - now };
  }
  entry.times.push(now);
  return { ok: true };
}

function resetRateLimits() {
  buckets.clear();
}

module.exports = { checkRateLimit, resetRateLimits };
