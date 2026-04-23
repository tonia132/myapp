// frontend/src/composables/useSafeI18n.js
import { computed, unref } from 'vue'
import { useI18n } from 'vue-i18n'

function isNil(v) {
  return v === null || v === undefined
}

function toText(v) {
  return isNil(v) ? '' : String(v)
}

function resolveFallback(fallback, key) {
  if (typeof fallback === 'function') return fallback(key)
  if (!isNil(fallback)) return fallback
  return key
}

/**
 * 安全翻譯 helper
 *
 * 用法：
 * const { t, tt, hasKey, missingText } = useSafeI18n()
 *
 * tt('warehouse.title', '倉庫管理')
 * tt('msg.key', (key) => `[${key}]`)
 *
 * 開發期想顯示缺 key：
 * const { tt } = useSafeI18n({ showMissing: true })
 */
export function useSafeI18n(options = {}) {
  const {
    showMissing = false,
    missingPrefix = '[MISSING] ',
    treatSameAsMissing = true,
    treatEmptyStringAsMissing = false,
  } = options

  const i18n = useI18n()
  const {
    t,
    te,
    tm,
    rt,
    n,
    d,
    locale,
    availableLocales,
  } = i18n

  function hasKey(key, targetLocale) {
    if (!key) return false
    try {
      if (targetLocale) return !!te(key, targetLocale)
      return !!te(key)
    } catch {
      return false
    }
  }

  function missingText(key, fallback) {
    if (showMissing) return `${missingPrefix}${key}`
    return resolveFallback(fallback, key)
  }

  function tt(key, fallback = '', params) {
    const rawKey = toText(key).trim()
    if (!rawKey) return resolveFallback(fallback, rawKey)

    const exists = hasKey(rawKey)

    try {
      const value = params === undefined ? t(rawKey) : t(rawKey, params)
      const text = toText(value)

      if (!exists) {
        return missingText(rawKey, fallback)
      }

      if (treatSameAsMissing && text === rawKey) {
        return missingText(rawKey, fallback)
      }

      if (treatEmptyStringAsMissing && text === '') {
        return missingText(rawKey, fallback)
      }

      return value
    } catch {
      return missingText(rawKey, fallback)
    }
  }

  function tmSafe(key, fallback = {}) {
    const rawKey = toText(key).trim()
    if (!rawKey) return fallback

    try {
      if (!hasKey(rawKey)) return fallback
      const value = tm(rawKey)
      return isNil(value) ? fallback : value
    } catch {
      return fallback
    }
  }

  function rtSafe(message, fallback = '') {
    try {
      const value = rt(message)
      const text = toText(value)
      if (treatEmptyStringAsMissing && text === '') return fallback
      return value
    } catch {
      return fallback
    }
  }

  function withPrefix(prefix = '') {
    const safePrefix = toText(prefix)

    return {
      tt(key, fallback = '', params) {
        return tt(`${safePrefix}${key}`, fallback, params)
      },
      hasKey(key, targetLocale) {
        return hasKey(`${safePrefix}${key}`, targetLocale)
      },
      tmSafe(key, fallback = {}) {
        return tmSafe(`${safePrefix}${key}`, fallback)
      },
    }
  }

  const currentLocale = computed(() => unref(locale))
  const locales = computed(() => availableLocales || [])

  return {
    ...i18n,

    t,
    te,
    tm,
    rt,
    n,
    d,
    locale,
    currentLocale,
    locales,

    hasKey,
    missingText,
    tt,
    tmSafe,
    rtSafe,
    withPrefix,
  }
}

export default useSafeI18n