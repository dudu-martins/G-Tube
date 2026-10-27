const integer = (env, key, fallback, min, max) => {
  const value = env[key] === undefined || env[key] === '' ? fallback : Number(env[key]);
  if (!Number.isInteger(value) || value < min || value > max) {
    throw new Error(`${key} must be an integer from ${min} to ${max}`);
  }
  return value;
};

export function loadConfig(env = process.env) {
  const addonToken = env.ADDON_TOKEN || '';
  if (addonToken && !/^[A-Za-z0-9_-]{24,128}$/.test(addonToken)) {
    throw new Error('ADDON_TOKEN must be 24-128 URL-safe characters');
  }
  const userAgent =
    env.USER_AGENT || 'Mozilla/5.0 (compatible; G-Tube/1.0; personal self-hosted use)';
  if (/[\u0000-\u001f\u007f]/.test(userAgent) || userAgent.length > 300) {
    throw new Error('Invalid USER_AGENT');
  }
  return {
    // 0.0.0.0 is required on Render / Railway / most cloud hosts
    host: env.HOST || '0.0.0.0',
    port: integer(env, 'PORT', 7000, 1, 65535),
    addonToken,
    enabledSources: ['xvideos', 'xhamster'],
    userAgent,
    requestTimeoutMs: integer(env, 'REQUEST_TIMEOUT_MS', 12000, 1000, 60000),
    extractTimeoutMs: integer(env, 'EXTRACT_TIMEOUT_MS', 25000, 3000, 120000),
    cacheTtlSeconds: integer(env, 'CACHE_TTL_SECONDS', 300, 0, 3600),
    maxCacheEntries: integer(env, 'MAX_CACHE_ENTRIES', 500, 10, 5000),
    maxResults: integer(env, 'MAX_RESULTS', 60, 4, 200),
    maxStreams: integer(env, 'MAX_STREAMS', 4, 1, 10)
  };
}
