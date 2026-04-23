// frontend/src/utils/uiLog.js
import request from "./request"; // 你現有的 axios instance（會自動帶 JWT）

const lastMap = new Map();

/** 簡單節流：同一事件 key 在 ms 內不重複送 */
function throttleOnce(key, ms = 1500) {
  const now = Date.now();
  const last = lastMap.get(key) || 0;
  if (now - last < ms) return false;
  lastMap.set(key, now);
  return true;
}

/** 寫入 UI 行為到系統日誌（沒登入就直接略過，避免 401 打爆） */
export async function logUI({
  action = "UI_ACTION",
  resource = "ui",
  recordId = null,
  note = "",
  status = null,
  meta = {},
} = {}) {
  // 沒 token 不送（你若想 guest 也記，可改成後端允許不驗證）
  const token =
    localStorage.getItem("token") ||
    sessionStorage.getItem("token") ||
    "";
  if (!token) return;

  try {
    await request.post("/audit-logs/ui", {
      action,
      resource,
      recordId,
      note,
      status,
      meta,
    });
  } catch {
    // 日誌失敗不影響 UI
  }
}

/** 安裝：自動記錄頁面瀏覽 */
export function installRouteAudit(router) {
  router.afterEach((to, from) => {
    const key = `PAGE_VIEW:${to.fullPath}`;
    if (!throttleOnce(key, 1200)) return;

    logUI({
      action: "PAGE_VIEW",
      resource: `page:${to.name || to.path}`,
      note: "route change",
      meta: {
        to: {
          name: to.name || null,
          path: to.path,
          fullPath: to.fullPath,
          params: to.params || {},
          query: to.query || {},
          meta: to.meta || {},
        },
        from: {
          name: from?.name || null,
          path: from?.path || "",
          fullPath: from?.fullPath || "",
        },
      },
    });
  });
}

/** 給各頁一行好用：const { ui } = useUILogger('products') */
export function useUILogger(resourcePrefix = "ui") {
  return {
    ui(action, note = "", meta = {}, recordId = null, status = null) {
      return logUI({
        action,
        resource: resourcePrefix,
        note,
        meta,
        recordId,
        status,
      });
    },
  };
}
