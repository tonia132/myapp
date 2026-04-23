// frontend/src/utils/apiBase.js
import api, {
  apiBase as clientApiBase,
  getApiBase as clientGetApiBase,
  apiUrl as clientApiUrl,
  getToken,
  getUser,
  setAuth,
  clearAuth,
  authHeaders,
  apiFetch,
  apiJson,
  apiText,
  apiBlob,
  apiForm,
  apiGet,
  apiPost,
  apiPut,
  apiPatch,
  apiDelete,
  downloadFile,
} from '../api/client'

/**
 * 舊相容層：
 * 讓原本從 utils/apiBase 匯入的舊程式先不要爆
 */

export function getApiBase () {
  return clientGetApiBase()
}

export const apiBase = clientApiBase

export function apiUrl (path = '') {
  return clientApiUrl(path)
}

export {
  getToken,
  getUser,
  setAuth,
  clearAuth,
  authHeaders,
  apiFetch,
  apiJson,
  apiText,
  apiBlob,
  apiForm,
  apiGet,
  apiPost,
  apiPut,
  apiPatch,
  apiDelete,
  downloadFile,
}

export default getApiBase