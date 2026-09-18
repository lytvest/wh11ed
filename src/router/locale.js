// The RU locale lives on a PATH PREFIX (`/ru/rules`), not a query parameter.
//
// Why it had to move: the site is a static bucket behind a CDN. The bucket addresses objects by
// path only — there is no such thing as a key for "path + query" — and the CDN is configured with
// `ignore_query_string`, so `/rules` and `/rules?lang=ru` were physically the same object. That
// made a Russian page incapable of ever carrying its own HTML, which is exactly what the crawler
// we care about (Yandex, which barely executes JS) needs to see. See CLAUDE.md → Architecture (History-mode SEO machinery).
//
// English keeps the bare path: it is already indexed, its bucket keys exist, and changing it would
// be risk spent on the audience we did NOT prioritise.
//
// Shared by the router, the locale singleton, the SEO meta and — via a plain import —
// `scripts/gen-seo-routes.mjs`, so the app and the sitemap can never disagree about what a
// Russian URL looks like. Keep it dependency-free for that reason.

/** The one locale that gets a prefix. EN is the bare path. */
export const RU_PREFIX = '/ru'

/** Optional leading route segment: matches `/rules` and `/ru/rules` with ONE route record.
 *  Verified against vue-router's matcher, including that `/roster/new` still outranks
 *  `/roster/:id` and that an unknown `/ru/...` still falls through to the catch-all. */
export const LOCALE_SEGMENT = '/:lang(ru)?'

/** The app's own base PATH (`/` normally, `/waha/` when deployed into a subpath), origin
 *  stripped. `import.meta.env.BASE_URL` is Vite's value for the build's `base`, so it always
 *  matches the emitted asset URLs and the router's `createWebHistory(base)`; a build-time
 *  absolute base (`https://host/waha/`) is normalised to its pathname here, because the only
 *  things that read this are path operations. Defaults to `/` when there is no Vite env
 *  (a plain Node import by `scripts/gen-seo-routes.mjs`) or no base at all. */
export const APP_BASE = (() => {
  const raw = (import.meta.env && import.meta.env.BASE_URL) || '/'
  try {
    // Keep only the path, so `https://host/waha/` and `/waha/` behave identically.
    const p = new URL(raw, 'http://vite.local').pathname
    return p.endsWith('/') ? p : p + '/'
  } catch {
    return '/'
  }
})()

/** Strip the deployment base off a raw `location.pathname`. vue-router's own `route.path` is
 *  already base-free, so this is only for the few places that read the browser's pathname
 *  directly — the locale singleton at boot. Without it, a build under `/waha/` sees
 *  `/waha/ru/rules` and never finds the locale prefix. No-ops on a root deployment. */
export function stripBase(path) {
  if (APP_BASE === '/') return path
  const bare = APP_BASE.slice(0, -1) // '/waha/'
  if (path === bare) return '/'
  return path.startsWith(APP_BASE) ? path.slice(bare.length) : path
}

/** 'ru' for a path under the RU prefix, 'en' otherwise. Accepts a raw `location.pathname`
 *  (base included) as well as a router path — `stripBase` no-ops on the root deployment. */
export function localeOfPath(path) {
  const p = stripBase(path)
  return p === RU_PREFIX || (p || '').startsWith(RU_PREFIX + '/') ? 'ru' : 'en'
}

/** `/ru/rules` → `/rules`, `/ru` → `/`. A path with no prefix is returned unchanged, so this is
 *  safe to apply to any path and is what every `route.path` comparison in the app should go
 *  through — otherwise a predicate like `startsWith('/roster')` silently stops matching in RU. */
export function stripLocale(path) {
  if (path === RU_PREFIX) return '/'
  if ((path || '').startsWith(RU_PREFIX + '/')) return path.slice(RU_PREFIX.length)
  return path
}

/** `('/rules', 'ru')` → `/ru/rules`; `('/', 'ru')` → `/ru`; anything with locale 'en' → bare path.
 *  Idempotent: the input is stripped first, so applying it twice can't produce `/ru/ru/...`. */
export function localePath(path, locale) {
  const bare = stripLocale(path || '/')
  if (locale !== 'ru') return bare
  return bare === '/' ? RU_PREFIX : RU_PREFIX + bare
}
