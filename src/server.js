import express from 'express';
import sdk from 'stremio-addon-sdk';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { timingSafeEqual } from 'node:crypto';
import { loadConfig } from './config.js';
import { createAddon } from './addon.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const matches = (value, expected) => {
  const a = Buffer.from(value || '');
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
};

export function createApp(config, dependencies) {
  const app = express();
  app.disable('x-powered-by');

  app.use(express.static(path.join(__dirname, '..', 'public'), {
    maxAge: '1d'
  }));

  app.use((req, res, next) => {
    res.set('Access-Control-Allow-Origin', '*');
    res.set('X-Content-Type-Options', 'nosniff');
    res.set('Cache-Control', 'no-store');

    if (req.method === 'OPTIONS') {
      res.set('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
      return res.sendStatus(204);
    }

    if (!['GET', 'HEAD'].includes(req.method)) return res.sendStatus(405);
    if (req.originalUrl.length > 4096) return res.sendStatus(414);

    next();
  });

  app.get('/health', (_req, res) =>
    res.json({ status: 'ok', version: '1.0.0', name: 'G-Tube' })
  );

  const addon = createAddon(config, dependencies);
  const router = sdk.getRouter(addon);

  const sendManifest = (_req, res) => res.json(addon.manifest);

  if (config.addonToken) {
    const privateRoute = (req, res, next) =>
      matches(req.params.token, config.addonToken) ? next() : res.sendStatus(404);

    app.get('/:token/manifest.json', privateRoute, sendManifest);
    app.use('/:token', privateRoute, router);
  } else {
    app.get('/manifest.json', sendManifest);
    app.use(router);
  }

  app.use((_req, res) => res.status(404).json({ error: 'Not found' }));

  return app;
}

export function start() {
  let config;

  try {
    config = loadConfig();
  } catch (error) {
    console.error(`Configuration error: ${error.message}`);
    process.exitCode = 1;
    return;
  }

  const server = createApp(config).listen(config.port, config.host, () => {
    console.log(`G-Tube listening on ${config.host}:${config.port}`);

    if (config.addonToken) {
      console.log(`Install: http://127.0.0.1:${config.port}/${config.addonToken}/manifest.json`);
    } else {
      console.log(`Manifest: http://127.0.0.1:${config.port}/manifest.json`);
    }
  });

  server.requestTimeout = 30000;
  server.headersTimeout = 10000;
  server.keepAliveTimeout = 5000;

  for (const event of ['SIGINT', 'SIGTERM']) {
    process.once(event, () => server.close(() => process.exit(0)));
  }

  return server;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  start();
}
