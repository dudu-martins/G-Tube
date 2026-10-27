const PREFIX = 'g-tube:';

const HOSTS = new Map([
  ['www.xvideos.com', 'xvideos'],
  ['xvideos.com', 'xvideos'],
  ['xhamster.com', 'xhamster'],
  ['www.xhamster.com', 'xhamster']
]);

export function sourceForUrl(value) {
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.username || url.password || url.hash) return null;
    const source = HOSTS.get(url.hostname.toLowerCase());
    if (!source) return null;
    const validPath =
      source === 'xhamster'
        ? /^\/videos\/[A-Za-z0-9._~-]+\/?$/.test(url.pathname)
        : /^\/video[.-][A-Za-z0-9._~-]+\/.+/.test(url.pathname);
    return validPath ? source : null;
  } catch {
    return null;
  }
}

export function encodeId(url) {
  if (!sourceForUrl(url)) throw new Error('Unsupported video URL');
  return PREFIX + Buffer.from(url).toString('base64url');
}

export function decodeId(id) {
  if (typeof id !== 'string' || !id.startsWith(PREFIX) || id.length > 2048) return null;
  try {
    const url = Buffer.from(id.slice(PREFIX.length), 'base64url').toString('utf8');
    return sourceForUrl(url) ? url : null;
  } catch {
    return null;
  }
}
