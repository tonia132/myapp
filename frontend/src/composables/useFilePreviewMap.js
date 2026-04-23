// frontend/src/composables/useFilePreviewMap.js
import { onBeforeUnmount, reactive } from 'vue'
import { useProtectedImagePreview } from '@/composables/useProtectedImagePreview'

function toSafeString(v) {
  return String(v ?? '').trim()
}

function toPositiveNumber(v) {
  const n = Number(v)
  return Number.isFinite(n) && n > 0 ? n : 0
}

/**
 * 預設 key 規則：
 * 優先用 id / fileId，其次 previewUrl / url / 檔名
 */
export function defaultPreviewKey(item) {
  if (!item || typeof item !== 'object') return ''

  return toSafeString(
    item.id ||
    item.fileId ||
    item.previewUrl ||
    item.url ||
    item.storedName ||
    item.originalName ||
    item.displayName ||
    ''
  )
}

/**
 * 預設 candidate 規則：
 * - 若 previewUrl 已是 /api/files/:id/preview，直接沿用
 * - 若有 id，強制改走 /api/files/:id/preview
 * - 否則原物件回傳
 */
export function defaultPreviewCandidate(item) {
  if (!item || typeof item !== 'object') return item

  const id = toPositiveNumber(item.id || item.fileId)
  const previewUrl = toSafeString(item.previewUrl)

  if (previewUrl.startsWith('/api/files/')) {
    return {
      ...item,
      previewUrl,
      url: '',
    }
  }

  if (id > 0) {
    return {
      ...item,
      previewUrl: `/api/files/${id}/preview`,
      url: '',
    }
  }

  return item
}

/**
 * 過濾可預覽項目
 */
export function isPreviewableItem(item, { ignoreFolders = true } = {}) {
  if (!item || typeof item !== 'object') return false
  if (ignoreFolders && item.isFolder) return false
  return !!defaultPreviewKey(item)
}

/**
 * 依 key 去重
 */
export function uniquePreviewItems(items = [], keyOf = defaultPreviewKey) {
  const map = new Map()

  for (const item of Array.isArray(items) ? items : []) {
    const key = toSafeString(keyOf(item))
    if (!key) continue
    if (!map.has(key)) map.set(key, item)
  }

  return [...map.values()]
}

/**
 * 建立 watch token
 * 用於 watch(() => token, refresh...)
 */
export function createPreviewToken(items = [], keyOf = defaultPreviewKey) {
  return uniquePreviewItems(items, keyOf)
    .map(item => toSafeString(keyOf(item)))
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }))
    .join(',')
}

/**
 * 共用圖片預覽 map composable
 */
export function useFilePreviewMap(options = {}) {
  const {
    keyOf = defaultPreviewKey,
    candidateOf = defaultPreviewCandidate,
    ignoreFolders = true,
    clearCacheOnUnmount = true,
  } = options

  const previewMap = reactive({})
  const { getImageSrc, clearCache } = useProtectedImagePreview()

  function previewKey(item) {
    return toSafeString(keyOf(item))
  }

  function previewCandidate(item) {
    return candidateOf(item)
  }

  function canPreview(item) {
    if (!item || typeof item !== 'object') return false
    if (ignoreFolders && item.isFolder) return false
    return !!previewKey(item)
  }

  function normalizeItems(items = []) {
    const raw = Array.isArray(items) ? items : []
    const filtered = raw.filter(canPreview)
    return uniquePreviewItems(filtered, previewKey)
  }

  function resolvePreview(item) {
    const key = previewKey(item)
    return key ? (previewMap[key] || '') : ''
  }

  function previewSrcList(items = []) {
    return normalizeItems(items)
      .map(resolvePreview)
      .filter(Boolean)
  }

  async function refreshPreviews(items = []) {
    const pool = normalizeItems(items)
    const nextKeys = new Set(pool.map(previewKey).filter(Boolean))

    await Promise.allSettled(
      pool.map(async (item) => {
        const key = previewKey(item)
        if (!key) return
        previewMap[key] = await getImageSrc(previewCandidate(item))
      })
    )

    for (const key of Object.keys(previewMap)) {
      if (!nextKeys.has(key)) {
        delete previewMap[key]
      }
    }
  }

  function removePreview(item) {
    const key = previewKey(item)
    if (key && key in previewMap) {
      delete previewMap[key]
    }
  }

  function clearPreviewState() {
    for (const key of Object.keys(previewMap)) {
      delete previewMap[key]
    }
  }

  function makeToken(items = []) {
    return createPreviewToken(normalizeItems(items), previewKey)
  }

  if (clearCacheOnUnmount) {
    onBeforeUnmount(() => {
      clearPreviewState()
      clearCache()
    })
  }

  return {
    previewMap,

    previewKey,
    previewCandidate,
    canPreview,
    normalizeItems,

    resolvePreview,
    previewSrcList,
    refreshPreviews,
    removePreview,
    clearPreviewState,
    makeToken,

    clearCache,
  }
}

export default useFilePreviewMap