// backend/src/utils/logAction.js
import { AuditLog } from "../models/index.js";

/** 安全轉字串並 trim */
const sTrim = (v) => (v == null ? "" : String(v)).trim();

/** 盡量把 resource 轉成合理的表/資源名稱 */
const normalizeResource = (resource) => {
  if (resource == null) return "";

  // 已經是字串
  if (typeof resource === "string") return resource.trim();

  // Sequelize Model / instance 常見線索
  // Model.tableName / instance.constructor.tableName
  const tableName =
    resource?.tableName ||
    resource?.constructor?.tableName ||
    (typeof resource?.getTableName === "function" ? resource.getTableName() : null);

  if (tableName) return sTrim(tableName);

  // 退而求其次：name
  if (resource?.name) return sTrim(resource.name);

  // 最後保底
  return sTrim(resource);
};

/**
 * ✅ 統一操作紀錄工具
 * @param {number|null} actorId
 * @param {string} action
 * @param {string|object} resource  // 允許 model/instance/object，會自動正規化
 * @param {object} [extra={}]
 */
export const logAction = async (actorId, action, resource, extra = {}) => {
  try {
    if (!AuditLog) throw new Error("AuditLog model 未載入");

    const actionStr = sTrim(action);
    const resourceStr = normalizeResource(resource);

    if (!actionStr || !resourceStr) {
      throw new Error("缺少必要參數: action 或 resource");
    }

    await AuditLog.create({
      actorId: actorId || null,
      action: actionStr,
      resource: resourceStr,
      recordId: extra.recordId ?? null,
      description: sTrim(extra.note || ""),
      status: extra.status ?? null,
      meta:
        extra.meta && typeof extra.meta === "object"
          ? JSON.stringify(extra.meta)
          : (extra.meta ?? null),
    });
  } catch (err) {
    console.error("⚠️ [logAction] 寫入日誌失敗:", err?.message || err);
  }
};
