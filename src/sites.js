import * as cheerio from 'cheerio';
import { encodeId } from './ids.js';

const clean = value =>
  String(value || '')
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const absolute = (value, base) => {
  try {
    const url = new URL(value, base);
    return url.protocol === 'https:' ? url.href : null;
  } catch {
    return null;
  }
};

// Fixed duration genres requested by the user
export const XVIDEOS_GENRES = Object.freeze([
  { label: 'Vídeos curtos (1-3min)', url: 'https://www.xvideos.com/c/d:1-3min/Gay-45' },
  { label: 'Vídeos Médio (3-10min)', url: 'https://www.xvideos.com/c/d:3-10min/Gay-45' },
  { label: 'Vídeos longos (10-20min)', url: 'https://www.xvideos.com/c/d:10-20min/Gay-45' },
  { label: 'Vídeos longos (+20min)', url: 'https://www.xvideos.com/c/d:20min_more/Gay-45' }
]);

export const XHAMSTER_GENRES = Object.freeze([
  { label: 'Duração: 0-2min', url: 'https://xhamster.com/gay?max-duration=2' },
  { label: 'Duração: 2-5min', url: 'https://xhamster.com/gay?min-duration=2&max-duration=5' },
  { label: 'Duração: 5-10min', url: 'https://xhamster.com/gay?min-duration=5&max-duration=10' },
  { label: 'Duração: 10-30min', url: 'https://xhamster.com/gay?min-duration=10&max-duration=30' },
  { label: 'Duração: 30-60min', url: 'https://xhamster.com/gay?min-duration=30&max-duration=60' },
  { label: 'Duração: 60-90min', url: 'https://xhamster.com/gay?min-duration=60&max-duration=90' },
  { label: 'Duração: 90+ min', url: 'https://xhamster.com/gay?min-duration=90' },
  { label: 'Filmes Completos', url: 'https://xhamster.com/gay/full-length' }
]);

const definitions = {
  xvideos: {
    label: 'XVideos',
    hosts: ['www.xvideos.com', 'xvideos.com'],
    base: 'https://www.xvideos.com',
    // Default gay listing
    defaultList: (page) => `https://www.xvideos.com/gay/${page || ''}`,
    parse(html) {
      const $ = cheerio.load(html);
      const rows = [];
      $('.thumb-block, .frame-block.thumb-block').each((_i, node) => {
        const link = $(node).find('a[title][href^="/video."]').first();
        const image = $(node).find('.thumb img').first();
        rows.push(
          row(
            this,
            link.attr('href'),
            link.attr('title'),
            image.attr('data-src') || image.attr('src'),
            $(node).find('.duration').first().text()
          )
        );
      });
      return rows.filter(Boolean);
    }
  },
  xhamster: {
    label: 'xHamster',
    hosts: ['xhamster.com', 'www.xhamster.com'],
    base: 'https://xhamster.com',
    defaultList: (page) => `https://xhamster.com/gay${page ? `/${page + 1}` : ''}`,
    parse(html) {
      const $ = cheerio.load(html);
      const rows = [];
      $('.video-thumb[data-video-id]').each((_i, node) => {
        const link = $(node).find('a[data-role="thumb-link"][href*="/videos/"]').first();
        const image = $(node)
          .find('img[data-role="thumb-preview-img"], img.thumb-image-container__image')
          .first();
        rows.push(
          row(
            this,
            link.attr('href'),
            link.attr('aria-label') || link.attr('title'),
            image.attr('src'),
            $(node)
              .find('[data-role="video-duration-container"], .thumb-image-container__duration')
              .first()
              .text()
          )
        );
      });
      return rows.filter(Boolean);
    }
  }
};

function row(site, href, title, poster, duration) {
  const url = absolute(href, site.base);
  const name = clean(title).slice(0, 300);
  const image = absolute(poster, site.base);
  if (!url || !name || !image || !site.hosts.includes(new URL(url).hostname)) return null;
  try {
    return {
      id: encodeId(url),
      type: 'Porn',
      name,
      poster: image,
      posterShape: 'landscape',
      description: [site.label, clean(duration)].filter(Boolean).join(' · '),
      behaviorHints: { defaultVideoId: encodeId(url) },
      source: site.label,
      url
    };
  } catch {
    return null;
  }
}

export function getSite(name) {
  return definitions[name] || null;
}

export function parseSite(name, html) {
  const site = getSite(name);
  if (!site) return [];
  const seen = new Set();
  return site.parse(html).filter(item => !seen.has(item.id) && seen.add(item.id));
}

/**
 * Build the listing URL for a source + optional genre + page.
 * When a duration genre is selected we use the exact fixed URL the user provided.
 */
export function listUrl(name, genreLabel = '', page = 0) {
  const site = getSite(name);
  if (!site) throw new Error('Unknown source');

  const p = Math.max(0, Math.min(20, Number(page) || 0));

  if (name === 'xvideos') {
    const genre = XVIDEOS_GENRES.find(g => g.label === genreLabel);
    if (genre) {
      // XVideos category pages paginate as /c/.../2 , /c/.../3 ...
      return p === 0 ? genre.url : `${genre.url}/${p + 1}`;
    }
    // Default gay section
    return site.defaultList(p === 0 ? '' : String(p + 1));
  }

  if (name === 'xhamster') {
    const genre = XHAMSTER_GENRES.find(g => g.label === genreLabel);
    if (genre) {
      const u = new URL(genre.url);
      // xHamster uses /gay/2, /gay/3 ... for pagination on filtered views
      if (p > 0) {
        // full-length is a path; duration filters are query params
        if (u.pathname.includes('/full-length')) {
          u.pathname = `/gay/full-length/${p + 1}`;
        } else {
          // keep query params and add page path
          u.pathname = `/gay/${p + 1}`;
        }
      }
      return u.href;
    }
    return site.defaultList(p);
  }

  throw new Error('Unknown source');
}

export function siteHosts(name) {
  return [...(getSite(name)?.hosts || [])];
}

export function siteLabel(name) {
  return getSite(name)?.label || name;
}

export function catalogId(name) {
  return getSite(name) ? `g-tube-${name}` : null;
}

export function sourceForCatalog(id) {
  const name = String(id || '').replace(/^g-tube-/, '');
  return getSite(name) ? name : null;
}

export function genresForSource(name) {
  if (name === 'xvideos') return XVIDEOS_GENRES.map(g => g.label);
  if (name === 'xhamster') return XHAMSTER_GENRES.map(g => g.label);
  return [];
}
