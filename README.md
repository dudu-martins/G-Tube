# G-Tube for Stremio / Nuvio

Addon self-hosted para Stremio/Nuvio focado nas seções **gay** do XVideos e xHamster, com filtros de duração prontos.

## Características

- **Nome**: G-Tube
- **Tipo**: `Porn` (aparece em Discover → Porn)
- **Catálogos**:
  - **G-Tube XVideos** → `https://xvideos.com/gay` (+ filtros de duração)
  - **G-Tube xHamster** → `https://xhamster.com/gay` (+ filtros de duração)

### Gêneros – G-Tube XVideos

| Gênero                    | URL |
|---------------------------|-----|
| Vídeos curtos (1-3min)    | https://www.xvideos.com/c/d:1-3min/Gay-45 |
| Vídeos Médio (3-10min)    | https://www.xvideos.com/c/d:3-10min/Gay-45 |
| Vídeos longos (10-20min)  | https://www.xvideos.com/c/d:10-20min/Gay-45 |
| Vídeos longos (+20min)    | https://www.xvideos.com/c/d:20min_more/Gay-45 |

### Gêneros – G-Tube xHamster

| Gênero              | URL |
|---------------------|-----|
| Duração: 0-2min     | https://xhamster.com/gay?max-duration=2 |
| Duração: 2-5min     | https://xhamster.com/gay?min-duration=2&max-duration=5 |
| Duração: 5-10min    | https://xhamster.com/gay?min-duration=5&max-duration=10 |
| Duração: 10-30min   | https://xhamster.com/gay?min-duration=10&max-duration=30 |
| Duração: 30-60min   | https://xhamster.com/gay?min-duration=30&max-duration=60 |
| Duração: 60-90min   | https://xhamster.com/gay?min-duration=60&max-duration=90 |
| Duração: 90+ min    | https://xhamster.com/gay?min-duration=90 |
| Filmes Completos    | https://xhamster.com/gay/full-length |

Também tem busca por texto em cada catálogo.

## Requisitos

- Node.js **22.16+**
- Python 3.9+ (necessário para o `yt-dlp` via `youtube-dl-exec`)

## Instalação rápida

```bash
cd g-tube
cp .env.example .env
npm install
npm start
```

Manifest local:

```
http://127.0.0.1:7000/manifest.json
```

Cole essa URL em **Stremio → Addons → Install from URL** (ou no Nuvio).

## Configuração opcional

No `.env`:

- `PORT` – porta (padrão 7000)
- `HOST` – host (padrão 127.0.0.1)
- `ADDON_TOKEN` – se definir, o manifest fica em `http://host:port/<TOKEN>/manifest.json`
- `MAX_RESULTS`, `MAX_STREAMS`, timeouts e cache – veja `.env.example`

## Aviso

Uso pessoal e adulto. O addon **não** baixa, armazena nem rehosta os vídeos – só lista e extrai links diretos (ou abre a página original). Respeite as leis da sua região e os termos dos sites.

Baseado em [prism-tube-stremio](https://github.com/michaelhotker/prism-tube-stremio).
