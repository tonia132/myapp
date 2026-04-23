// frontend/src/api/client.js
import axios from 'axios'

/* =========================================================
   單一 API Client
   - 不再依賴 /info 自動探測
   - 不再使用 localStorage.apiBaseURL 覆蓋
   - 預設走 VITE_API_BASE，沒有就 /api
========================================================= */

const LOGIN_PATH = '/login'

function trimSlashEnd (v = '') {
  return String(v || '').trim().replace(/\/+$/, '')
}

function ensureApiSuffix (base = '') {
  let s = trimSlashEnd(base || '/api')
  if (!s) s = '/api'
  if (!/\/api$/i.test(s)) s += '/api'
  return s
}

export function getApiBase () {
  return ensureApiSuffix(import.meta.env?.VITE_API_BASE || '/api')
}

export const apiBase = getApiBase()

export function apiUrl (path = '') {
  const p = String(path || '').trim()
  if (!p) return apiBase
  if (/^https?:\/\//i.test(p)) return p
  return `${apiBase}${p.startsWith('/') ? p : `/${p}`}`
}

/* =========================================================
   Auth helpers
========================================================= */

export function getToken () {
  return (
    localStorage.getItem('token') ||
    sessionStorage.getItem('token') ||
    ''
  )
}

export function getUser () {
  try {
    return JSON.parse(
      localStorage.getItem('user') ||
      sessionStorage.getItem('user') ||
      'null'
    )
  } catch {
    return null
  }
}

export function clearAuth () {
  localStorage.removeItem('token')
  localStorage.removeItem('user')
  sessionStorage.removeItem('token')
  sessionStorage.removeItem('user')
}

export function setAuth ({ token, user, remember = true } = {}) {
  const storage = remember ? localStorage : sessionStorage
  const other = remember ? sessionStorage : localStorage

  if (token) storage.setItem('token', token)
  else storage.removeItem('token')

  if (user != null) storage.setItem('user', JSON.stringify(user))
  else storage.removeItem('user')

  other.removeItem('token')
  other.removeItem('user')
}

export function authHeaders (extra = {}) {
  const headers = { ...extra }
  const token = getToken()
  if (token && !headers.Authorization) {
    headers.Authorization = `Bearer ${token}`
  }
  return headers
}

function redirectToLogin () {
  const here = `${window.location.pathname}${window.location.search}${window.location.hash}`
  if (window.location.pathname !== LOGIN_PATH) {
    window.location.assign(`${LOGIN_PATH}?redirect=${encodeURIComponent(here)}`)
  }
}

function normalizeErrorMessage (payload, fallback) {
  if (!payload) return fallback
  if (typeof payload === 'string') return payload || fallback
  return (
    payload.message ||
    payload.error ||
    payload.msg ||
    fallback
  )
}

function buildHttpError ({ response, data, url, method }) {
  const status = response?.status || 0
  const fallback = status ? `HTTP ${status}` : '網路錯誤'
  const err = new Error(normalizeErrorMessage(data, fallback))
  err.status = status
  err.data = data
  err.url = url
  err.method = method
  return err
}

/* =========================================================
   Axios instance
========================================================= */

export const api = axios.create({
  baseURL: apiBase,
  timeout: 20000,
  withCredentials: false,
  headers: {
    Accept: 'application/json',
  },
})

api.interceptors.request.use(
  (config) => {
    config.headers = config.headers || {}
    const token = getToken()
    if (token && !config.headers.Authorization) {
      config.headers.Authorization = `Bearer ${token}`
    }

    if (
      config.data &&
      !(config.data instanceof FormData) &&
      !config.headers['Content-Type'] &&
      !config.headers['content-type']
    ) {
      config.headers['Content-Type'] = 'application/json'
    }

    return config
  },
  (error) => Promise.reject(error)
)

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status || 0

    if (status === 401 && !error?.config?.__skip401) {
      clearAuth()
      redirectToLogin()
    }

    return Promise.reject(error)
  }
)

/* =========================================================
   Fetch helpers
========================================================= */

async function parseResponseData (resp, expected = 'json') {
  if (expected === 'blob') return await resp.blob()
  if (expected === 'text') return await resp.text()

  const text = await resp.text()
  if (!text) return null

  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}

async function request (path, options = {}) {
  const {
    method = 'GET',
    headers = {},
    body,
    responseType = 'json',
    skip401 = false,
    raw = false,
    credentials = 'same-origin',
    signal,
    cache,
  } = options

  const url = apiUrl(path)
  const finalHeaders = new Headers(headers)

  const token = getToken()
  if (token && !finalHeaders.has('Authorization')) {
    finalHeaders.set('Authorization', `Bearer ${token}`)
  }

  const isFormData = body instanceof FormData
  if (!isFormData && body != null && !finalHeaders.has('Content-Type')) {
    finalHeaders.set('Content-Type', 'application/json')
  }

  const resp = await fetch(url, {
    method,
    headers: finalHeaders,
    body,
    credentials,
    signal,
    cache,
  })

  if (raw) return resp

  const data = await parseResponseData(resp, responseType)

  if (!resp.ok) {
    if (resp.status === 401 && !skip401) {
      clearAuth()
      redirectToLogin()
    }
    throw buildHttpError({ response: resp, data, url, method })
  }

  return data
}

/* =========================================================
   對外 API
========================================================= */

export async function apiFetch (path, options = {}) {
  return request(path, options)
}

export async function apiJson (path, {
  method = 'GET',
  data,
  body,
  headers = {},
  ...rest
} = {}) {
  const payload = body ?? (data !== undefined ? JSON.stringify(data) : undefined)

  return request(path, {
    method,
    headers,
    body: payload,
    responseType: 'json',
    ...rest,
  })
}

export async function apiText (path, options = {}) {
  return request(path, {
    ...options,
    responseType: 'text',
  })
}

export async function apiBlob (path, options = {}) {
  return request(path, {
    ...options,
    responseType: 'blob',
  })
}

export async function apiForm (path, formData, {
  method = 'POST',
  headers = {},
  ...rest
} = {}) {
  return request(path, {
    method,
    headers,
    body: formData,
    responseType: 'json',
    ...rest,
  })
}

export async function apiDelete (path, options = {}) {
  return apiJson(path, {
    method: 'DELETE',
    ...options,
  })
}

export async function apiGet (path, options = {}) {
  return apiJson(path, {
    method: 'GET',
    ...options,
  })
}

export async function apiPost (path, data, options = {}) {
  return apiJson(path, {
    method: 'POST',
    data,
    ...options,
  })
}

export async function apiPut (path, data, options = {}) {
  return apiJson(path, {
    method: 'PUT',
    data,
    ...options,
  })
}

export async function apiPatch (path, data, options = {}) {
  return apiJson(path, {
    method: 'PATCH',
    data,
    ...options,
  })
}

/* =========================================================
   檔案下載 helper
========================================================= */

function readFilenameFromDisposition (contentDisposition = '') {
  const s = String(contentDisposition || '')

  const utf8Match = s.match(/filename\*\s*=\s*UTF-8''([^;]+)/i)
  if (utf8Match?.[1]) {
    try {
      return decodeURIComponent(utf8Match[1])
    } catch {
      return utf8Match[1]
    }
  }

  const plainMatch = s.match(/filename\s*=\s*"([^"]+)"/i) || s.match(/filename\s*=\s*([^;]+)/i)
  if (plainMatch?.[1]) {
    return plainMatch[1].trim()
  }

  return ''
}

export async function downloadFile (path, fallbackName = 'download') {
  const resp = await request(path, { responseType: 'blob', raw: true })
  if (!resp.ok) {
    const data = await parseResponseData(resp, 'json').catch(() => null)
    throw buildHttpError({
      response: resp,
      data,
      url: apiUrl(path),
      method: 'GET',
    })
  }

  const blob = await resp.blob()
  const contentDisposition = resp.headers.get('content-disposition') || ''
  const filename = readFilenameFromDisposition(contentDisposition) || fallbackName

  const objectUrl = URL.createObjectURL(blob)
  try {
    const a = document.createElement('a')
    a.href = objectUrl
    a.download = filename
    document.body.appendChild(a)
    a.click()
    a.remove()
  } finally {
    setTimeout(() => URL.revokeObjectURL(objectUrl), 1000)
  }

  return { ok: true, filename }
}

export default api