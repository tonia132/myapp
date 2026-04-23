import { onBeforeUnmount } from 'vue'
import { getApiBase } from '@/utils/apiBase'

function getToken () {
  return localStorage.getItem('token') || sessionStorage.getItem('token') || ''
}

function isAbsoluteUrl (v = '') {
  return /^https?:\/\//i.test(String(v))
}

function joinUrl (base = '', path = '') {
  const b = String(base || '').replace(/\/+$/, '')
  const p = String(path || '').trim()
  if (!p) return b
  if (isAbsoluteUrl(p) || p.startsWith('blob:') || p.startsWith('data:')) return p
  if (p.startsWith('/')) return `${b}${p}`
  return `${b}/${p}`
}

function normalizePreviewCandidate (candidate, apiBase) {
  const raw = String(candidate || '').trim()
  if (!raw) return ''

  if (
    raw.startsWith('blob:') ||
    raw.startsWith('data:') ||
    isAbsoluteUrl(raw)
  ) {
    return raw
  }

  if (raw.startsWith('/api/')) return raw
  if (raw.startsWith('/images/')) return raw
  if (raw.startsWith('/public/')) return raw
  if (raw.startsWith('/uploads/')) return raw
  if (raw.startsWith('api/')) return `/${raw}`
  if (raw.startsWith('uploads/')) return `/${raw}`

  return joinUrl(apiBase, raw)
}

function needsProtectedFetch (url = '') {
  const s = String(url || '')
  if (!s) return false
  if (s.startsWith('blob:') || s.startsWith('data:')) return false
  if (s.startsWith('/images/') || s.startsWith('/public/') || s.startsWith('/uploads/')) return false
  if (s.startsWith('/api/files/')) return true
  return /\/api\/files\/\d+\/preview(?:$|\?)/.test(s)
}

export function resolvePreviewRequest (input, apiBase = getApiBase()) {
  if (!input) return { url: '', fallbackId: 0 }

  if (typeof input === 'string') {
    return {
      url: normalizePreviewCandidate(input, apiBase),
      fallbackId: 0,
    }
  }

  if (typeof input === 'number') {
    return {
      url: `${apiBase}/files/${input}/preview`,
      fallbackId: Number(input) || 0,
    }
  }

  if (typeof input === 'object') {
    const direct =
      input.previewUrl ||
      input.url ||
      input.src ||
      input.thumbUrl ||
      ''

    const id = Number(input.id || input.fileId || input.imageId || 0)

    if (direct) {
      return {
        url: normalizePreviewCandidate(direct, apiBase),
        fallbackId: Number.isFinite(id) && id > 0 ? id : 0,
      }
    }

    if (Number.isFinite(id) && id > 0) {
      return {
        url: `${apiBase}/files/${id}/preview`,
        fallbackId: id,
      }
    }
  }

  return { url: '', fallbackId: 0 }
}

export function useProtectedImagePreview (options = {}) {
  const apiBase = options.apiBase || getApiBase()

  const cache = new Map()
  const inflight = new Map()
  const objectUrls = new Set()

  async function fetchProtectedImage (requestUrl) {
    const token = getToken()
    const headers = token ? { Authorization: `Bearer ${token}` } : {}

    const res = await fetch(requestUrl, {
      method: 'GET',
      headers,
      credentials: 'same-origin',
    })

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`)
    }

    const blob = await res.blob()
    const objectUrl = URL.createObjectURL(blob)
    objectUrls.add(objectUrl)
    return objectUrl
  }

  async function fetchWithFallback (requestUrl, fallbackId) {
    try {
      return await fetchProtectedImage(requestUrl)
    } catch (err) {
      if (fallbackId > 0 && !String(requestUrl).includes(`/files/${fallbackId}/preview`)) {
        const fallbackUrl = `${apiBase}/files/${fallbackId}/preview`
        return await fetchProtectedImage(fallbackUrl)
      }
      throw err
    }
  }

  async function getImageSrc (input) {
    const { url: requestUrl, fallbackId } = resolvePreviewRequest(input, apiBase)
    if (!requestUrl) return ''

    if (!needsProtectedFetch(requestUrl)) {
      cache.set(requestUrl, requestUrl)
      return requestUrl
    }

    const cacheKey = `${requestUrl}#${fallbackId || 0}`

    if (cache.has(cacheKey)) {
      return cache.get(cacheKey)
    }

    if (inflight.has(cacheKey)) {
      return inflight.get(cacheKey)
    }

    const task = fetchWithFallback(requestUrl, fallbackId)
      .then((src) => {
        cache.set(cacheKey, src)
        return src
      })
      .catch((err) => {
        console.error('getImageSrc failed:', requestUrl, err)
        return ''
      })
      .finally(() => {
        inflight.delete(cacheKey)
      })

    inflight.set(cacheKey, task)
    return task
  }

  function revokeBlobUrl (src) {
    if (!src || !String(src).startsWith('blob:')) return
    try {
      URL.revokeObjectURL(src)
    } catch {}
    objectUrls.delete(src)
  }

  function clearCache () {
    for (const src of cache.values()) {
      revokeBlobUrl(src)
    }
    cache.clear()
    inflight.clear()
  }

  onBeforeUnmount(() => {
    clearCache()
  })

  return {
    getImageSrc,
    clearCache,
  }
}