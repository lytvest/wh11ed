// Build-time config. Vite inlines import.meta.env.VITE_* at build. Set VITE_API_BASE_URL when
// building for production (e.g. VITE_API_BASE_URL=https://api.wh-rules.ru npm run build); the
// default targets a local wh11ed-api dev server.
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8787'

// Canonical public origin (scheme + host, no trailing slash). The single source of truth for
// every absolute URL the site emits — per-route canonical/hreflang/og:url (useSeoMeta.js) and,
// via process.env, the sitemap (scripts/gen-seo-routes.mjs). Still overridable per build
// (VITE_SITE_ORIGIN in deploy.sh / .env.deploy) — the retired wh11ed.ru is frozen, not rebuilt.
export const SITE_ORIGIN = import.meta.env.VITE_SITE_ORIGIN || 'https://wh-rules.ru'

// The path the app is served under, WITH a trailing slash — always `/` for the normal
// root deployment, `/waha/` when a build is dropped into a subpath of a shared host.
//
// `import.meta.env.BASE_URL` is Vite's own value, so `vite build --base=/waha/` (or VITE_BASE)
// is the single switch: assets, the PWA manifest and this are all derived from it and cannot
// disagree. A build-time absolute base (`https://host/waha/`) is reduced to its pathname —
// vue-router and every URL built as `BASE + path` want a path, not an origin. The trailing slash
// matters: createWebHistory stores the base without it and `BASE + path` concatenation needs it.
export const BASE_URL = (() => {
  const raw = import.meta.env.BASE_URL || '/'
  try {
    const p = new URL(raw, 'http://vite.local').pathname
    return p.endsWith('/') ? p : p + '/'
  } catch {
    return '/'
  }
})()

// The domain the "we've moved" banner points visitors to. Deliberately a fixed constant, NOT
// SITE_ORIGIN: the banner only shows on the old host, whose build self-canonicals to itself, so
// reusing SITE_ORIGIN would advertise the old domain as the "new" one.
export const MOVED_TO_ORIGIN = 'https://wh-rules.ru'
// Move-banner phase (the wh11ed.ru → wh-rules.ru cutover): 'pre' = Phase 2 heads-up on the old domain ("we're moving —
// log in so your games follow, reinstall the app afterwards"), 'moved' = the post-301 variant
// ("we've moved, new address"). Off unless VITE_ANNOUNCE_MOVE is set per-build; the legacy value
// `true` maps to 'moved' so an old .env.deploy keeps working.
const announceRaw = import.meta.env.VITE_ANNOUNCE_MOVE
export const ANNOUNCE_MOVE =
  announceRaw === 'pre' ? 'pre' : announceRaw === 'moved' || announceRaw === 'true' ? 'moved' : false
