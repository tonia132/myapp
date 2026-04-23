// frontend/src/api/axios.js
import api, {
  apiBase,
  apiUrl,
  getApiBase,
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
} from './client'

/**
 * 舊檔相容層：
 * 以前如果有：
 *   import api from '@/api/axios'
 *   import { getApiBase, authHeaders } from '@/api/axios'
 * 都會轉到新的 client.js
 */

export {
  apiBase,
  apiUrl,
  getApiBase,
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

export default api