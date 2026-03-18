const buckets = new Map();

function nowMs() {
  return Date.now();
}

function buildKey({ routeKey, ip, userId, email }) {
  return `${routeKey}|${ip || '-'}|${userId || '-'}|${email || '-'}`;
}

function cleanupStaleBuckets(maxAgeMs = 5 * 60 * 1000) {
  const threshold = nowMs() - maxAgeMs;
  for (const [key, value] of buckets.entries()) {
    if ((value?.updatedAt || 0) < threshold) {
      buckets.delete(key);
    }
  }
}

export function checkRateLimit({
  routeKey,
  ip = null,
  userId = null,
  email = null,
  limit = 10,
  windowMs = 60 * 1000
}) {
  cleanupStaleBuckets();

  const key = buildKey({ routeKey, ip, userId, email });
  const current = buckets.get(key) || {
    count: 0,
    resetAt: nowMs() + windowMs,
    updatedAt: nowMs()
  };

  if (nowMs() > current.resetAt) {
    current.count = 0;
    current.resetAt = nowMs() + windowMs;
  }

  current.count += 1;
  current.updatedAt = nowMs();
  buckets.set(key, current);

  const allowed = current.count <= limit;
  return {
    allowed,
    limit,
    remaining: Math.max(0, limit - current.count),
    retryAfterMs: allowed ? 0 : Math.max(0, current.resetAt - nowMs()),
    resetAt: current.resetAt
  };
}
