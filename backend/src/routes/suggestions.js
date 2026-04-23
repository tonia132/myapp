// backend/src/routes/suggestions.js
import express from "express";
import { Op } from "sequelize";
import authMiddleware from "../middleware/authMiddleware.js";
import { Suggestion, User } from "../models/index.js";
import { logAction } from "../utils/logAction.js";

const router = express.Router();

// ✅ 全域保護（後面就不用每條都寫 authMiddleware）
router.use(authMiddleware);

/* ---------------- Helpers ---------------- */

// 統一字串處理
const norm = (v) => (v == null ? "" : String(v).trim());

const toInt = (v, def = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.floor(n) : def;
};

// 🔹 判斷是否為管理員
const isAdmin = (user) => String(user?.role || "").toLowerCase() === "admin";

// 🔹 優先度正規化
const PRIORITY_MAP = { P1: "P1", P2: "P2", P3: "P3" };
function normalizePriority(v, def = "P2") {
  const key = String(v ?? "").trim().toUpperCase();
  const normalized = PRIORITY_MAP[key] || def;

  // ✅ 需要時才開：避免 production 一直噴 log
  if (process.env.SUGGESTION_DEBUG === "1") {
    console.log("[Suggestion] priority =", v, "=>", normalized);
  }

  return normalized;
}

// 🔹 狀態正規化（DB 實際存：pending / reviewed / resolved）
const STATUS_MAP = {
  pending: "pending",
  reviewed: "reviewed",
  processing: "reviewed", // 前端若傳 processing，一律當 reviewed 存
  resolved: "resolved",
};
function normalizeStatus(v) {
  if (v == null) return null;
  const key = String(v).toLowerCase().trim();
  return STATUS_MAP[key] || null;
}

/* =========================================================
   一般使用者：新增建議
   POST /api/suggestions
========================================================= */
router.post("/", async (req, res) => {
  try {
    const { title, content, priority } = req.body || {};
    if (!title || !content) {
      return res.status(400).json({ success: false, message: "請填寫標題與內容" });
    }

    const suggestion = await Suggestion.create({
      title: norm(title),
      content: norm(content),
      priority: normalizePriority(priority, "P2"),
      status: "pending",
      userId: req.user.id,
    });

    logAction(req.user.id, "CREATE_SUGGESTION", "suggestions", {
      recordId: suggestion.id,
      note: `新增建議：${suggestion.title}`,
    }).catch(() => {});

    return res.status(201).json({
      success: true,
      message: "✅ 已送出建議，感謝回饋",
      data: suggestion,
    });
  } catch (err) {
    console.error("❌ 新增建議失敗:", err);
    return res.status(500).json({ success: false, message: "伺服器錯誤" });
  }
});

/* =========================================================
   一般使用者：我的建議列表
   GET /api/suggestions/mine?status=&priority=&page=&pageSize=&limit=
   👉 rows / total 在最外層，兼容舊前端
========================================================= */
router.get("/mine", async (req, res) => {
  try {
    const page = Math.max(1, toInt(req.query.page, 1));

    // 支援 limit 參數，優先於 pageSize
    const limitParam = toInt(req.query.limit, 0);
    const pageSizeParam = toInt(req.query.pageSize, 10);

    // ✅ 統一上限（避免一次撈太多）
    const size = Math.min(
      200,
      Math.max(1, limitParam > 0 ? limitParam : pageSizeParam || 10)
    );

    const status = normalizeStatus(req.query.status || "");
    // def=""：代表不限制 priority
    const priority = normalizePriority(req.query.priority || "", "");

    const where = { userId: req.user.id };
    if (status) where.status = status;
    if (priority) where.priority = priority;

    const { rows, count } = await Suggestion.findAndCountAll({
      where,
      order: [["createdAt", "DESC"]],
      limit: size,
      offset: (page - 1) * size,
    });

    return res.json({
      success: true,
      rows,
      total: count,
      page,
      pageSize: size,
      data: { rows, count, page, pageSize: size },
    });
  } catch (err) {
    console.error("❌ 取得我的建議失敗:", err);
    return res.status(500).json({ success: false, message: "伺服器錯誤" });
  }
});

/* =========================================================
   管理員：建議列表
   GET /api/suggestions?status=&priority=&keyword=&user=&page=&pageSize=
   👉 rows / total 在最外層
========================================================= */
router.get("/", async (req, res) => {
  try {
    if (!isAdmin(req.user)) {
      return res.status(403).json({ success: false, message: "僅管理員可以檢視所有建議" });
    }

    const page = Math.max(1, toInt(req.query.page, 1));
    const size = Math.min(200, Math.max(1, toInt(req.query.pageSize, 20)));

    const status = normalizeStatus(req.query.status || "");
    const priority = normalizePriority(req.query.priority || "", "");
    const keyword = norm(req.query.keyword || "");
    const userKeyword = norm(req.query.user || "");

    const where = {};
    if (status) where.status = status;
    if (priority) where.priority = priority;

    if (keyword) {
      where[Op.or] = [
        { title: { [Op.like]: `%${keyword}%` } },
        { content: { [Op.like]: `%${keyword}%` } },
      ];
    }

    const userWhere = {};
    if (userKeyword) {
      userWhere[Op.or] = [
        { username: { [Op.like]: `%${userKeyword}%` } },
        { name: { [Op.like]: `%${userKeyword}%` } },
      ];
    }

    const { rows, count } = await Suggestion.findAndCountAll({
      where,
      include: [
        {
          model: User,
          as: "creator",
          attributes: ["id", "username", "name"],
          // ✅ 有 userKeyword 才做 inner join 篩選；沒填就不要限制
          required: Boolean(userKeyword),
          where: Object.keys(userWhere).length ? userWhere : undefined,
        },
      ],
      order: [["createdAt", "DESC"]],
      limit: size,
      offset: (page - 1) * size,
    });

    return res.json({
      success: true,
      rows,
      total: count,
      page,
      pageSize: size,
      data: { rows, count, page, pageSize: size },
    });
  } catch (err) {
    console.error("❌ 取得建議列表失敗:", err);
    return res.status(500).json({ success: false, message: "伺服器錯誤" });
  }
});

/* =========================================================
   管理員：單筆更新（狀態 / 優先度 / 回覆）
   PATCH /api/suggestions/:id
========================================================= */
router.patch("/:id", async (req, res) => {
  try {
    if (!isAdmin(req.user)) {
      return res.status(403).json({ success: false, message: "僅管理員可以編輯建議" });
    }

    const id = toInt(req.params.id, 0);
    if (!id) return res.status(400).json({ success: false, message: "無效的 ID" });

    const suggestion = await Suggestion.findByPk(id);
    if (!suggestion) {
      return res.status(404).json({ success: false, message: "找不到建議" });
    }

    const body = req.body || {};
    const payload = {};

    if (body.status !== undefined) {
      const s = normalizeStatus(body.status);
      if (!s) {
        return res.status(400).json({ success: false, message: "狀態值無效" });
      }
      payload.status = s;
    }

    if (body.priority !== undefined) {
      payload.priority = normalizePriority(body.priority, suggestion.priority);
    }

    if (body.adminReply !== undefined) {
      payload.adminReply = norm(body.adminReply);
    }

    await suggestion.update(payload);

    logAction(req.user.id, "UPDATE_SUGGESTION", "suggestions", {
      recordId: suggestion.id,
      note: `更新建議狀態/回覆：${suggestion.title}`,
    }).catch(() => {});

    return res.json({
      success: true,
      message: "✅ 已更新建議",
      data: suggestion,
    });
  } catch (err) {
    console.error("❌ 更新建議失敗:", err);
    return res.status(500).json({ success: false, message: "伺服器錯誤" });
  }
});

/* =========================================================
   管理員：批次更新狀態（底下兩顆按鈕用）
   POST /api/suggestions/bulk
   PUT  /api/suggestions/bulk  也支援
   body: { ids: number[], status: 'pending'|'processing'|'reviewed'|'resolved' }
========================================================= */
async function handleBulkUpdate(req, res) {
  try {
    if (!isAdmin(req.user)) {
      return res.status(403).json({ success: false, message: "僅管理員可以批次更新" });
    }

    const ids = Array.isArray(req.body?.ids) ? req.body.ids.map((x) => toInt(x, 0)).filter((x) => x > 0) : [];
    const status = normalizeStatus(req.body?.status);

    if (!ids.length || !status) {
      return res.status(400).json({
        success: false,
        message: "請提供 ids 陣列與有效的 status",
      });
    }

    const [affected] = await Suggestion.update(
      { status },
      { where: { id: { [Op.in]: ids } } }
    );

    logAction(req.user.id, "BULK_UPDATE_SUGGESTION_STATUS", "suggestions", {
      recordId: null,
      note: `批次更新建議狀態：${affected} 筆 → ${status}`,
    }).catch(() => {});

    return res.json({
      success: true,
      message: `✅ 已更新 ${affected} 筆建議狀態`,
      data: { affected },
    });
  } catch (err) {
    console.error("❌ 批次更新建議失敗:", err);
    return res.status(500).json({ success: false, message: "伺服器錯誤" });
  }
}

// 同一路徑，同一個 handler，同時支援 POST / PUT
router.post("/bulk", handleBulkUpdate);
router.put("/bulk", handleBulkUpdate);

export default router;
