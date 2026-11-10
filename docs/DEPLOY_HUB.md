# Deploying the public hub (https://hub.intelli.page)

The hub is a tiny catalogue page plus the seven QA-passed games, as one static folder: `dist-hub/`.
Nothing in this repo deploys it for you: you upload or connect it yourself.

```
dist-hub/
  index.html  404.html  sw.js  _headers
  assets/            hub shell (hashed): css, js, Bungee font subset, thumbnails, patterns
  snakes-ladders/  naija-ludo/  ayo-olopon/  naija-whot/  sabi-quiz/  sabi-words/  draughts-naija/
    index.html  sw.js  chunks/  assets/        (production build of each game, relative paths)
```

## Decisions recorded (from the owner)

- **Public to anyone.** No login, no `noindex`, no robots restrictions. The owner explicitly accepted that
  the quiz and word content goes live although it is **not fact-checked** (every Sabi Quiz question and
  Sabi Words entry is `reviewed: false`) and the Pidgin lines are unreviewed (`_review`).
- **Simple catalogue**; games open full screen at `https://hub.intelli.page/<slug>/`.
- **No GameSplash link-up.** The portal bridge only activates when `?portal=<allowed origin>` is in the URL.
  Opened directly, the games keep progress in `localStorage` (`naija:<slug>:...`) and make no API calls (a
  `?token=` without `?portal=` is ignored). Verified by `scripts/hub-build.test.ts` and `tests/e2e/hub.spec.ts`.

## Build and preview locally

```
npm run build:hub            # validates hub/games.json, builds the 7 games (production), assembles dist-hub/,
                             # runs the safety scan + prod gate on dist-hub, prints sizes
node scripts/build-hub.mjs --no-build   # reuse an existing dist/ (fast)
node scripts/serve-hub.mjs   # http://localhost:4190, applies dist-hub/_headers, /slug -> /slug/, 404.html
npm run e2e:hub              # Playwright smoke test against dist-hub (run build:hub first; Ctrl-C the server after)
```

Adding a game later: set `deploy: true` in `games/registry.json` and add its entry to `hub/games.json`
(the build fails until both agree). Edit text in `hub/games.json` and `hub/i18n/{en,pcm}.json`.

## Netlify (first choice)

Drag and drop (no account link to the repo):
1. `npm run build:hub` on your machine.
2. Netlify dashboard > Add new site > Deploy manually > drop the `dist-hub` folder.

Or connect the repo: Add new site > Import from Git > pick the repo and the branch to publish. Netlify reads
`netlify.toml` (build `npm run build:hub`, publish `dist-hub`, Node 22). `_headers` inside `dist-hub` is applied
automatically.

Domain and HTTPS:
1. Site configuration > Domain management > Add a domain > `hub.intelli.page`.
2. At the DNS host of `intelli.page` add `CNAME  hub  ->  <your-site>.netlify.app`.
3. Back in Netlify, Domain management > HTTPS > Verify DNS, then Provision certificate (Let's Encrypt).
   Turn on "Force HTTPS".

Redeploy: connected repo = push/merge to the production branch (or Deploys > Trigger deploy); drag-and-drop =
rebuild and drop the folder again. Roll back: Deploys > pick an older successful deploy > Publish deploy.

## Vercel

Import the repo; `vercel.json` sets build `npm run build:hub`, output `dist-hub`, `trailingSlash: true` (required:
without it `/snakes-ladders` would not redirect to `/snakes-ladders/` and the games' relative `./chunks/` paths
break) and the same headers. Vercel ignores `_headers` (the file is just served, harmless). Add the domain
`hub.intelli.page` under Settings > Domains and create the CNAME it shows (`cname.vercel-dns.com`). Redeploy by
pushing; roll back with Deployments > old deployment > Promote to Production.

## Cloudflare Pages

Create a project from the repo (or Direct Upload of `dist-hub`). Build command `npm run build:hub`, output
directory `dist-hub`, environment variable `NODE_VERSION=22`. `_headers` is honoured as is (it has fewer than the
100-rule limit; a test keeps it so). Custom domain: Pages project > Custom domains > `hub.intelli.page`; if
`intelli.page` is on Cloudflare DNS the CNAME is added for you, otherwise add `CNAME hub -> <project>.pages.dev`.
Roll back: Deployments > old deployment > Rollback.

## Cache policy (generated into `dist-hub/_headers`)

| Path | Cache-Control | Why |
|---|---|---|
| `/`, `/index.html`, `/404.html`, `/sw.js` | `public, max-age=0, must-revalidate` | always revalidate, so a new hub or worker is seen at once |
| `/assets/*` (hub shell, content-hashed) | `public, max-age=31536000, immutable` | filename changes with content |
| `/<slug>/`, `/<slug>/index.html`, `/<slug>/sw.js` | `public, max-age=0, must-revalidate` | |
| `/<slug>/chunks/*` (hashed JS/CSS) | `public, max-age=31536000, immutable` | |
| `/<slug>/assets/packs/*.json` | `public, max-age=0, must-revalidate` | content packs can change without a code release |
| `/<slug>/assets/**` other (art, audio; NOT hashed) | none set: host default | a long cache here would feed stale files into a game's worker update |

Cache-Control rules never overlap (hosts merge matching rules); a test enforces this. Security headers on every
path: `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer`, a minimal `Permissions-Policy`, and a CSP
with no external origin: `default-src 'self'`, `style-src 'self' 'unsafe-inline'` (games build inline styles),
`font-src 'self' data:` (Vite inlines the Bungee subset as a data URI), `worker-src 'self' blob:`,
`frame-ancestors 'self' https://m.gamesplash.com.ng` (so the portal can embed the games later; no
`X-Frame-Options`). HSTS is left to the host. No `.mjs` or `.webmanifest` file is shipped, so no MIME rules are
emitted (the script adds them if one ever appears). No `_redirects` and no SPA catch-all: an unknown path gets
`404.html`.

## Service workers

Hub: `/sw.js`, scope `/`, cache `naija-hub-<hash>`, precaches only the hub shell and passes every other request
(all `/<slug>/...`) straight through. Each game keeps its own `/<slug>/sw.js`, scope `/<slug>/`, cache
`naija-<slug>-<hash>`. The build refuses slugs that would make one game's cache prefix swallow another's.

## What is excluded from `dist-hub` (checked on every build and by tests)

No `__naijaTest`, `autoplay`, `setSeed` etc. (prod gate), no `?tempo=` / `?clock=` / `?pack=` readers, no source
maps or `sourceMappingURL`, no `.env`, `docs/`, `qa`, `tmp/`, `_template`, `.md` or test files.

## Manual smoke test (after each deploy)

1. On a real phone (mobile data), open `https://hub.intelli.page/`. Seven cards, thumbnails, no horizontal scroll.
2. Tap Pidgin: texts change; reload keeps it. Tap English.
3. Open each of the seven games with Play. Each reaches its menu, sound works after the first tap, no error banner.
4. Open `https://hub.intelli.page/naija-ludo` (no trailing slash): it must land on `/naija-ludo/`.
5. Open `https://hub.intelli.page/nope`: the Naija Games 404 page.
6. Switch to airplane mode, reload the hub and two games: they still open (workers installed on the first visit).
7. In a desktop browser: DevTools > Application > Service Workers shows `/sw.js` (scope `/`) and
   `/<slug>/sw.js` (scope `/<slug>/`); Console has no errors; Network shows no request to another origin.
8. Response headers on `/` and a game: CSP, nosniff, Referrer-Policy; `sw.js` and `index.html` revalidate.

## Open items (not decided here)

- **GameSplash portal link-up:** real portal origin, token contract and progress API shape (today only the default
  `https://m.gamesplash.com.ng` is accepted and `connect-src` is `'self'`, so the CSP must be widened when the
  link-up is built).
- **Content review gates:** quiz packs `reviewed:false` (58 `uncertain`), word packs `reviewed:false`
  (`npm run packs:release-check` would FAIL); Pidgin `_review` lines in every game and the hub (see build output).
  Sabi Words status in `docs/STATUS.md` still says "QA round 1 FAIL, fixes pending"; the task brief says it passed.
- **Analytics:** none included.
- **Privacy and telco notices:** none on the page (no data is collected beyond local storage on the phone).
- **Preview/under-review note** in the hub footer: not added (optional); add a `hub.preview` string if wanted.
- **Custom 404:** a basic branded 404 exists; wording and design need approval.
- **Pack JSON cache lifetime:** currently always revalidate (cheap 304s); decide a short `max-age` per game if needed.
- **Unhashed game assets** (`/<slug>/assets/**` except packs) use the host default; Cloudflare's default may be longer
  than Netlify/Vercel's revalidate. Hash them or add explicit rules if stale art ever appears.
- **Host choice**, DNS access for `intelli.page`, and who owns redeploys.
