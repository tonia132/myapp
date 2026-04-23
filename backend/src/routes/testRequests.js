// backend/src/routes/testRequests.js
import express from "express";
import { Op } from "sequelize";
import authMiddleware from "../middleware/authMiddleware.js";
import * as models from "../models/index.js";

const router = express.Router();
const { TestRequest, User } = models;

/* ---------------- helpers ---------------- */
const clean = (v) => String(v ?? "").trim();

const toInt = (v, def = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.floor(n) : def;
};

const toNum = (v, def = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : def;
};

const isAdmin = (user) => String(user?.role || "").toLowerCase() === "admin";

/** ✅ 安全 include：association 存在才 include */
function assocInclude(model, alias, attributes, extra = {}) {
  if (!model?.associations || !model.associations[alias]) return null;
  return { association: alias, attributes, required: false, ...extra };
}

function hasAttr(model, key) {
  return !!model?.rawAttributes?.[key];
}

/** ✅ priority/status 正規化（避免髒資料） */
const PRIORITY_ALLOW = new Set(["low", "medium", "high", "urgent"]);
function normalizePriority(v, def = "medium") {
  const s = clean(v).toLowerCase();
  return PRIORITY_ALLOW.has(s) ? s : def;
}

const STATUS_ALLOW = new Set(["pending", "in_progress", "paused", "done", "completed", "rejected"]);
function normalizeStatus(v, def = "pending") {
  const s = clean(v).toLowerCase();
  // 相容舊值
  if (s === "finish" || s === "finished") return "done";
  if (s === "complete") return "completed";
  return STATUS_ALLOW.has(s) ? s : def;
}

/** ✅ YYYY-MM-DD or ISO => Date (nullable) */
function parseDate(v) {
  const s = clean(v);
  if (!s) return null;
  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return new Date(`${s}T00:00:00`);
  const d = new Date(s);
  return Number.isFinite(d.getTime()) ? d : null;
}

/** ✅ 產生需求單號：TR-YYYYMMDD-XXX（同一天序號遞增，避免碰撞） */
async function generateRequestNo() {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, ""); // YYYYMMDD
  const prefix = `TR-${dateStr}-`;

  // 找當天最大尾碼
  const rows = await TestRequest.findAll({
    where: { requestNo: { [Op.like]: `${prefix}%` } },
    attributes: ["requestNo"],
    order: [["createdAt", "DESC"]],
    limit: 50,
    raw: true,
  });

  let maxSeq = 0;
  for (const r of rows) {
    const no = String(r.requestNo || "");
    if (!no.startsWith(prefix)) continue;
    const tail = no.slice(prefix.length);
    const n = parseInt(tail, 10);
    if (Number.isFinite(n)) maxSeq = Math.max(maxSeq, n);
  }

  const next = String(maxSeq + 1).padStart(3, "0");
  return `${prefix}${next}`;
}

function serializeRow(r) {
  const json = r.toJSON ? r.toJSON() : r;
  return {
    ...json,
    createdByName: json.creator?.name || json.creator?.username || "",
    assigneeName: json.assignee?.name || json.assignee?.username || "",
  };
}

/* =========================================================
   GET /api/test-requests
   query: q, status, startDate, endDate, page, pageSize
   ✅ 修正：搜尋條件 AND 權限條件（非 admin 不會看到別人的單）
========================================================= */
router.get("/", authMiddleware, async (req, res) => {
  try {
    const user = req.user;

    const q = clean(req.query.q);
    const status = clean(req.query.status);
    const startDate = parseDate(req.query.startDate);
    const endDate = parseDate(req.query.endDate);

    const page = Math.max(1, toInt(req.query.page, 1));
    const pageSize = Math.min(200, Math.max(1, toInt(req.query.pageSize, 20)));

    const and = [];

    // 1) 權限條件（非 admin 必須套）
    if (!isAdmin(user)) {
      and.push({
        [Op.or]: [{ createdBy: user.id }, { assignedTo: user.id }],
      });
    }

    // 2) 狀態
    if (status) {
      and.push({ status: status }); // 若你要強制白名單：normalizeStatus(status, null)
    }

    // 3) 日期篩選（區間重疊）：
    //    expectedStartDate <= endDate AND expectedEndDate >= startDate
    //    - endDate 取當天 23:59:59
    if (startDate || endDate) {
      const s = startDate ? new Date(startDate) : null;
      const e = endDate ? new Date(endDate) : null;
      if (e) e.setHours(23, 59, 59, 999);

      const dateAnd = [];
      if (e && hasAttr(TestRequest, "expectedStartDate")) {
        dateAnd.push({ expectedStartDate: { [Op.lte]: e } });
      }
      if (s && hasAttr(TestRequest, "expectedEndDate")) {
        dateAnd.push({ expectedEndDate: { [Op.gte]: s } });
      }

      // 有些資料 expectedEndDate 可能為 null：視為「尚未定」也要能被抓到
      if (dateAnd.length) {
        and.push({
          [Op.and]: dateAnd,
        });
      }
    }

    // 4) 搜尋（requestNo/title/productName/remark）
    if (q) {
      const like = `%${q}%`;
      const or = [];
      if (hasAttr(TestRequest, "requestNo")) or.push({ requestNo: { [Op.like]: like } });
      if (hasAttr(TestRequest, "title")) or.push({ title: { [Op.like]: like } });
      if (hasAttr(TestRequest, "productName")) or.push({ productName: { [Op.like]: like } });
      if (hasAttr(TestRequest, "remark")) or.push({ remark: { [Op.like]: like } });
      if (or.length) and.push({ [Op.or]: or });
    }

    const where = and.length ? { [Op.and]: and } : {};

    const include = [
      assocInclude(TestRequest, "creator", ["id", "username", "name"]),
      assocInclude(TestRequest, "assignee", ["id", "username", "name"]),
    ].filter(Boolean);

    const { rows, count } = await TestRequest.findAndCountAll({
      where,
      include,
      order: [["createdAt", "DESC"]],
      offset: (page - 1) * pageSize,
      limit: pageSize,
      distinct: true,
    });

    return res.json({
      success: true,
      rows: rows.map(serializeRow),
      total: count,
      page,
      pageSize,
    });
  } catch (err) {
    console.error("❌ 取得測試需求單列表失敗:", err);
    return res.status(500).json({ success: false, message: "取得測試需求單列表失敗" });
  }
});

/* =========================================================
   POST /api/test-requests
   ✅ 非 admin：assignedTo 只能 null 或自己
========================================================= */
router.post("/", authMiddleware, async (req, res) => {
  try {
    const user = req.user;

    let {
      requestNo,
      title,
      productName,
      category,
      testItemCount,
      sampleQty,
      priority,
      expectedStartDate,
      expectedEndDate,
      status,
      remark,
      assignedTo,
    } = req.body || {};

    title = clean(title);
    productName = clean(productName);

    if (!title || !productName) {
      return res.status(400).json({ success: false, message: "title 與 productName 為必填欄位" });
    }

    // assignedTo
    assignedTo = assignedTo == null || assignedTo === "" ? null : toInt(assignedTo, null);
    if (!isAdmin(user)) {
      if (assignedTo && assignedTo !== user.id) {
        return res.status(403).json({ success: false, message: "只有管理者可以把需求指派給其他人" });
      }
    }

    // 正規化
    requestNo = clean(requestNo);
    if (!requestNo) requestNo = await generateRequestNo();

    category = clean(category) || "HW";
    priority = normalizePriority(priority, "medium");

    // ✅ 若有指派但 status 仍 pending → in_progress
    const normStatus = normalizeStatus(status, "pending");
    status = assignedTo && (normStatus === "pending" || !normStatus) ? "in_progress" : normStatus;

    testItemCount = Math.max(1, toInt(testItemCount, 1));
    sampleQty = Math.max(1, toInt(sampleQty, 1));

    const payload = {
      requestNo,
      title,
      productName,
      category,
      testItemCount,
      sampleQty,
      priority,
      expectedStartDate: clean(expectedStartDate) || null,
      expectedEndDate: clean(expectedEndDate) || null,
      status,
      remark: remark == null ? "" : String(remark),
      createdBy: user.id,
      assignedTo,
    };

    const created = await TestRequest.create(payload);

    const withUser = await TestRequest.findByPk(created.id, {
      include: [
        assocInclude(TestRequest, "creator", ["id", "username", "name"]),
        assocInclude(TestRequest, "assignee", ["id", "username", "name"]),
      ].filter(Boolean),
    });

    return res.status(201).json({ success: true, data: serializeRow(withUser || created) });
  } catch (err) {
    console.error("❌ 新增測試需求單失敗:", err);
    return res.status(500).json({ success: false, message: "新增測試需求單失敗" });
  }
});

/* =========================================================
   PUT /api/test-requests/:id
   ✅ 權限建議：
   - admin / 建立者：可改全部
   - assignee：可改 status/remark（讓負責人能更新進度）
========================================================= */
router.put("/:id", authMiddleware, async (req, res) => {
  try {
    const id = toInt(req.params.id, 0);
    if (!id) return res.status(400).json({ success: false, message: "Bad id" });

    const user = req.user;
    const record = await TestRequest.findByPk(id);
    if (!record) return res.status(404).json({ success: false, message: "找不到此測試需求單" });

    const canEditAll = isAdmin(user) || Number(record.createdBy) === Number(user.id);
    const canEditAsAssignee = Number(record.assignedTo) === Number(user.id);

    if (!canEditAll && !canEditAsAssignee) {
      return res.status(403).json({ success: false, message: "沒有權限修改此測試需求單" });
    }

    const body = req.body || {};

    // -------- 全欄位（admin/creator） --------
    if (canEditAll) {
      if (body.title !== undefined) record.title = clean(body.title);
      if (body.productName !== undefined) record.productName = clean(body.productName);
      if (body.category !== undefined) record.category = clean(body.category) || record.category;
      if (body.testItemCount !== undefined) record.testItemCount = Math.max(1, toInt(body.testItemCount, 1));
      if (body.sampleQty !== undefined) record.sampleQty = Math.max(1, toInt(body.sampleQty, 1));
      if (body.priority !== undefined) record.priority = normalizePriority(body.priority, record.priority || "medium");
      if (body.expectedStartDate !== undefined) record.expectedStartDate = clean(body.expectedStartDate) || null;
      if (body.expectedEndDate !== undefined) record.expectedEndDate = clean(body.expectedEndDate) || null;

      // assignedTo：非 admin 只能指派自己/清空；admin 可指派任何人
      if (body.assignedTo !== undefined) {
        const parsed = body.assignedTo == null || body.assignedTo === "" ? null : toInt(body.assignedTo, null);
        if (!isAdmin(user) && parsed && parsed !== user.id) {
          return res.status(403).json({ success: false, message: "只有管理者可以更改負責人" });
        }
        record.assignedTo = parsed;
      }
    }

    // -------- 允許 assignee 更新（以及 admin/creator 當然也可） --------
    if (body.status !== undefined) record.status = normalizeStatus(body.status, record.status || "pending");
    if (body.remark !== undefined) record.remark = body.remark == null ? "" : String(body.remark);

    // ✅ 若已指定負責人且狀態還是 pending → in_progress
    if (record.assignedTo && String(record.status) === "pending") {
      record.status = "in_progress";
    }

    await record.save();

    const withUser = await TestRequest.findByPk(record.id, {
      include: [
        assocInclude(TestRequest, "creator", ["id", "username", "name"]),
        assocInclude(TestRequest, "assignee", ["id", "username", "name"]),
      ].filter(Boolean),
    });

    return res.json({ success: true, data: serializeRow(withUser || record) });
  } catch (err) {
    console.error("❌ 更新測試需求單失敗:", err);
    return res.status(500).json({ success: false, message: "更新測試需求單失敗" });
  }
});

/* =========================================================
   DELETE /api/test-requests/:id
   ✅ 只有 admin / 建立者
========================================================= */
router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    const id = toInt(req.params.id, 0);
    if (!id) return res.status(400).json({ success: false, message: "Bad id" });

    const user = req.user;
    const record = await TestRequest.findByPk(id);
    if (!record) return res.status(404).json({ success: false, message: "找不到此測試需求單" });

    if (!isAdmin(user) && Number(record.createdBy) !== Number(user.id)) {
      return res.status(403).json({ success: false, message: "沒有權限刪除此測試需求單" });
    }

    await record.destroy();
    return res.json({ success: true });
  } catch (err) {
    console.error("❌ 刪除測試需求單失敗:", err);
    return res.status(500).json({ success: false, message: "刪除測試需求單失敗" });
  }
});

export default router;
