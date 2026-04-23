// frontend/src/utils/uiAudit.js
import { apiUrl } from "./apiBase.js";

// 取 token（你專案目前就是 localStorage / sessionStorage）
function getToken() {
  return (
    localStorage.getItem("token") ||
    sessionStorage.getItem("token") ||
    ""
  );
}

function authHeaders() {
  const token = getToken();
  if (!token) return null;
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

// 簡單節流：避免同一頁在短時間重複寫太多筆
const lastSent = new Map();
function throttleOnce(key, ms = 1200) {
  const now = Date.now();
  const last = lastSent.get(key) || 0;
  if (now - last < ms) return false;
  lastSent.set(key, now);
  return true;
}

function safeToJson(v) {
  if (v == null) return "{}";
  if (typeof v === "string") return v;
  try {
    return JSON.stringify(v);
  } catch {
    // 避免 circular 導致 throw
    return JSON.stringify({ raw: String(v) });
  }
}

/**
 * ✅ 寫入 UI 行為到後端 /api/logs/ui
 * 對齊 AuditLog.js：action/resource/description/detail/targetType/targetId
 */
export async function logUI({
  action = "UI_ACTION",
  resource = "ui",
  description = "",
  detail = {},
  targetType = null,
  targetId = null,
} = {}) {
  const headers = authHeaders();
  if (!headers) return; // 未登入就不寫（避免 401）

  try {
    await fetch(apiUrl("/logs/ui"), {
      method: "POST",
      headers,
      body: JSON.stringify({
        action,
        resource,
        description,
        detail,      // 後端會存進 AuditLog.detail（JSON 字串）
        targetType,
        targetId,
      }),
    });
  } catch {
    // 日誌失敗不影響 UI
  }
}

/**
 * ✅ 安裝：自動記錄「每次切頁/進入頁面」行為
 * action: PAGE_VIEW
 * resource: page:<routeName 或 path>
 * detail: to/from + query/params/meta + duration
 */
export function installRouteAudit(router) {
  let enterAt = Date.now();

  router.beforeEach((_to, _from, next) => {
    enterAt = Date.now();
    next();
  });

  router.afterEach((to, from) => {
    const key = `PAGE_VIEW:${to.fullPath}`;
    if (!throttleOnce(key, 1000)) return;

    const durationMs = Date.now() - enterAt;

    logUI({
      action: "PAGE_VIEW",
      resource: `page:${to.name || to.path}`,
      description: "route change",
      detail: {
        durationMs,
        to: {
          name: to.name || null,
          path: to.path,
          fullPath: to.fullPath,
          query: to.query || {},
          params: to.params || {},
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

/**
 * ✅ 讓各頁面/按鈕一行記錄：ui('SEARCH', 'search...', {keyword})
 */
export function createUILogger(resourcePrefix = "ui") {
  return (action, description = "", detail = {}, targetType = null, targetId = null) =>
    logUI({
      action,
      resource: resourcePrefix,
      description,
      detail,
      targetType,
      targetId,
    });
}
