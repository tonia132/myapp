// frontend/src/utils/request.js
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
} from '../api/client'

/**
 * 舊工具相容層：
 * 以前從 utils/request 匯入的頁面，先全部導到新的 client.js
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