import sdk from 'stremio-addon-sdk';
import { TtlCache } from './cache.js';
import { createTextFetcher } from './http.js';
import { decodeId, sourceForUrl } from './ids.js';
import {
  catalogId,
  genresForSource,
  listUrl,
  parseSite,
  siteHosts,
  siteLabel,
  sourceForCatalog
} from './sites.js';
import { createExtractor, metaFromExtraction, streamsFromExtraction } from './extractor.js';

export function createAddon(config, dependencies = {}) {
  const fetchText = dependencies.fetchText || createTextFetcher(config);
  const extract = dependencies.extract || createExtractor(config);
  const log = dependencies.log || (record => console.log(JSON.stringify(record)));

  const catalogCache = new TtlCache(config.maxCacheEntries);
  const extractCache = new TtlCache(config.maxCacheEntries);
  const itemCache = new TtlCache(config.maxCacheEntries);
  const extractionInFlight = new Map();

  const catalogs = config.enabledSources.map(source => ({
    id: catalogId(source),
    type: 'Porn',
    name: source === 'xvideos' ? 'G-Tube XVideos' : 'G-Tube xHamster',
    extra: [
      { name: 'search', isRequired: false },
      {
        name: 'genre',
        isRequired: false,
        options: genresForSource(source),
        optionsLimit: 1
      },
      { name: 'skip', isRequired: false }
    ]
  }));

  const builder = new sdk.addonBuilder({
    id: 'community.g.tube',
    version: '1.0.0',
    name: 'G-Tube',
    description:
      'Browse and play gay videos from XVideos and xHamster with duration filters. Self-hosted personal use only.',
    resources: ['catalog', 'meta', 'stream'],
    types: ['Porn'],
    idPrefixes: ['g-tube:'],
    catalogs,
    behaviorHints: { adult: true, p2p: false, configurable: false }
  });

  async function extraction(pageUrl) {
    const hit = extractCache.get(pageUrl);
    if (hit) return hit;
    if (extractionInFlight.has(pageUrl)) return extractionInFlight.get(pageUrl);
    const pending = extract(pageUrl)
      .then(value => {
        extractCache.set(pageUrl, value, Math.min(config.cacheTtlSeconds, 300));
        return value;
      })
      .finally(() => extractionInFlight.delete(pageUrl));
    extractionInFlight.set(pageUrl, pending);
    return pending;
  }

  builder.defineCatalogHandler(async ({ id, type, extra = {} }) => {
    const source = sourceForCatalog(id);
    if (!source || type !== 'Porn') return { metas: [] };
    if (!config.enabledSources.includes(source)) return { metas: [] };

    const search = String(extra.search || '').trim().slice(0, 100);
    const genre = String(extra.genre || '').trim();
    const skip = Math.max(0, Math.min(1000, Number.parseInt(extra.skip, 10) || 0));
    const page = Math.floor(skip / config.maxResults);

    // When user types a search we ignore the fixed genre URL and use the site search
    // on the gay section (kept simple and consistent with original prism behaviour).
    let url;
    if (search) {
      if (source === 'xvideos') {
        url = `https://www.xvideos.com/gay/${page || ''}?k=${encodeURIComponent(search)}`;
      } else {
        url = `https://xhamster.com/gay/search/${encodeURIComponent(search)}${page ? `/${page + 1}` : ''}`;
      }
    } else {
      url = listUrl(source, genre, page);
    }

    const key = `${source}\0${genre}\0${search}\0${page}`;
    const cached = catalogCache.get(key);
    if (cached) return cached;

    let items = [];
    try {
      const html = await fetchText(url, siteHosts(source));
      items = parseSite(source, html).slice(0, config.maxResults);
      for (const item of items) {
        item.genres = [...new Set(['Gay', ...(genre ? [genre] : [])])];
        itemCache.set(item.id, item, 3600);
      }
    } catch (err) {
      log({ event: 'source_failed', source, error: String(err?.message || err) });
    }

    const response = { metas: items };
    catalogCache.set(key, response, config.cacheTtlSeconds);
    log({
      event: 'catalog_complete',
      source,
      search: Boolean(search),
      genre: genre || undefined,
      results: response.metas.length
    });
    return response;
  });

  builder.defineMetaHandler(async ({ type, id }) => {
    if (type !== 'Porn') return { meta: null };
    const pageUrl = decodeId(id);
    if (!pageUrl || !config.enabledSources.includes(sourceForUrl(pageUrl))) {
      return { meta: null };
    }
    let known = itemCache.get(id);
    const baseTags = known?.genres || ['Gay'];
    try {
      return {
        meta: {
          ...known,
          ...metaFromExtraction(await extraction(pageUrl), id, pageUrl, baseTags)
        }
      };
    } catch {
      if (known) return { meta: known };
      return {
        meta: {
          id,
          type: 'Porn',
          name: `${siteLabel(sourceForUrl(pageUrl))} video`,
          genres: baseTags,
          behaviorHints: { defaultVideoId: id }
        }
      };
    }
  });

  builder.defineStreamHandler(async ({ type, id }) => {
    if (type !== 'Porn') return { streams: [] };
    const pageUrl = decodeId(id);
    const source = pageUrl && sourceForUrl(pageUrl);
    if (!source || !config.enabledSources.includes(source)) return { streams: [] };

    let streams = [];
    try {
      streams = streamsFromExtraction(await extraction(pageUrl), pageUrl, config);
    } catch {
      log({ event: 'extract_failed', source });
    }
    streams.push({
      name: `Open on ${siteLabel(source)}`,
      title: 'Open the original video page',
      description: 'Open the original video page',
      externalUrl: pageUrl
    });
    return { streams };
  });

  return builder.getInterface();
}
