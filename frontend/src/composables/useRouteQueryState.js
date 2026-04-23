// frontend/src/composables/useRouteQueryState.js

function isNil(v) {
  return v === null || v === undefined
}

export function firstQueryValue(v) {
  return Array.isArray(v) ? v[0] : v
}

export function parseQueryText(v) {
  return String(firstQueryValue(v) || '').trim()
}

export function parsePositiveInt(v, fallback = 1) {
  const n = Number(firstQueryValue(v))
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback
}

export function parseBoolFlag(v, fallback = false) {
  const raw = String(firstQueryValue(v) ?? '').trim().toLowerCase()
  if (['1', 'true', 'yes', 'y', 'on'].includes(raw)) return true
  if (['0', 'false', 'no', 'n', 'off'].includes(raw)) return false
  return fallback
}

export function sameQuery(a = {}, b = {}) {
  const ak = Object.keys(a).sort()
  const bk = Object.keys(b).sort()
  if (ak.length !== bk.length) return false
  return ak.every((key, idx) => key === bk[idx] && String(a[key]) === String(b[key]))
}

export function omitQueryKeys(query = {}, keys = []) {
  const next = { ...(query || {}) }
  for (const key of keys) delete next[key]
  return next
}

export function cleanQueryObject(query = {}) {
  const out = {}
  for (const [key, value] of Object.entries(query || {})) {
    if (isNil(value)) continue
    if (typeof value === 'string' && value.trim() === '') continue
    out[key] = value
  }
  return out
}

export function mergeManagedQuery(currentQuery = {}, managedKeys = [], managedQuery = {}) {
  return {
    ...omitQueryKeys(currentQuery, managedKeys),
    ...cleanQueryObject(managedQuery),
  }
}

export default {
  firstQueryValue,
  parseQueryText,
  parsePositiveInt,
  parseBoolFlag,
  sameQuery,
  omitQueryKeys,
  cleanQueryObject,
  mergeManagedQuery,
}