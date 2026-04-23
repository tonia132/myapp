// backend/src/routes/osImages.js
import express from "express";
import { Op } from "sequelize";
import authMiddleware from "../middleware/authMiddleware.js";
import authorizeRole from "../middleware/roleMiddleware.js";
import { OsImage } from "../models/index.js";
import { logAction } from "../utils/logAction.js";

const router = express.Router();

/* ---------------- helpers ---------------- */

const clean = (s) => String(s ?? "").trim();
const cleanOrNull = (s) => {
  const v = clean(s);
  return v ? v : null;
};

const toBool = (v) => {
  if (typeof v === "boolean") return v;
  if (v == null) return null;
  const s = String(v).trim().toLowerCase();
  if (["1", "true", "yes", "y", "on"].includes(s)) return true;
  if (["0", "false", "no", "n", "off"].includes(s)) return false;
  return null;
};

const toInt = (v, def) => {
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : def;
};

// onlyLatest 的分組 key：osFamily + isCustom + mbModel + edition + language
function makeGroupKey(row) {
  return [
    row.osFamily || "",
    row.isCustom ? 1 : 0,
    row.mbModel || "",
    row.edition || "",
    row.language || "",
  ].join("||");
}

/* =========================================================
   ✅ 取得 OS Image 清單（含篩選 / 分頁 / 只顯示最新版本）
   GET /api/os-images
   query:
     page, pageSize
     osFamily, isCustom
     board, product, language, edition, version, licenseType, keyword
     onlyLatest=1|true  // 每組條件只顯示最新一筆
========================================================= */
router.get("/", authMiddleware, async (req, res) => {
  try {
    const {
      page = 1,
      pageSize = 20,
      osFamily,
      isCustom,
      board,
      product,
      language,
      edition,
      version,
      licenseType,
      keyword,
      onlyLatest,
    } = req.query;

    const pageNum = Math.max(toInt(page, 1), 1);
    const pageSizeNum = Math.min(Math.max(toInt(pageSize, 20), 1), 500);

    const where = {};

    // OS 系列（精準）
    if (clean(osFamily)) where.osFamily = clean(osFamily);

    // 標準 / 客製
    const customFlag = toBool(isCustom);
    if (customFlag !== null) where.isCustom = customFlag;

    // 主板型號模糊搜尋
    if (clean(board)) where.mbModel = { [Op.like]: `%${clean(board)}%` };

    // 對應機種模糊搜尋
    if (clean(product)) where.productModels = { [Op.like]: `%${clean(product)}%` };

    // 語系模糊搜尋
    if (clean(language)) where.language = { [Op.like]: `%${clean(language)}%` };

    // Edition
    if (clean(edition)) where.edition = { [Op.like]: `%${clean(edition)}%` };

    // Version
    if (clean(version)) where.version = { [Op.like]: `%${clean(version)}%` };

    // License Type
    if (clean(licenseType)) where.licenseType = { [Op.like]: `%${clean(licenseType)}%` };

    // 關鍵字：pnIso / mbModel / productModels / edition / version / licenseType / notes
    if (clean(keyword)) {
      const kw = `%${clean(keyword)}%`;
      where[Op.or] = [
        { pnIso: { [Op.like]: kw } },
        { mbModel: { [Op.like]: kw } },
        { productModels: { [Op.like]: kw } },
        { edition: { [Op.like]: kw } },
        { version: { [Op.like]: kw } },
        { licenseType: { [Op.like]: kw } },
        { notes: { [Op.like]: kw } },
      ];
    }

    // 排序：先分組欄位，再 version DESC + id DESC（近似最新在前）
    const baseOrder = [
      ["osFamily", "ASC"],
      ["isCustom", "ASC"],
      ["mbModel", "ASC"],
      ["edition", "ASC"],
      ["language", "ASC"],
      ["version", "DESC"],
      ["id", "DESC"],
    ];

    const baseQuery = { where, order: baseOrder };

    const onlyLatestFlag = toBool(onlyLatest) === true;

    if (onlyLatestFlag) {
      // ✅ 先用排序把「最新」排到前，再用 Map 取每組第一筆
      const allRows = await OsImage.findAll(baseQuery);

      const latestMap = new Map();
      for (const row of allRows) {
        const key = makeGroupKey(row);
        if (!latestMap.has(key)) latestMap.set(key, row);
      }

      const latestRows = Array.from(latestMap.values());
      const total = latestRows.length;

      const start = (pageNum - 1) * pageSizeNum;
      const end = start + pageSizeNum;
      const pagedRows = latestRows.slice(start, end);

      return res.json({
        success: true,
        rows: pagedRows,
        total,
        page: pageNum,
        pageSize: pageSizeNum,
      });
    }

    // 一般分頁
    const { rows, count } = await OsImage.findAndCountAll({
      ...baseQuery,
      limit: pageSizeNum,
      offset: (pageNum - 1) * pageSizeNum,
    });

    res.json({
      success: true,
      rows,
      total: count,
      page: pageNum,
      pageSize: pageSizeNum,
    });
  } catch (err) {
    console.error("❌ 取得 OS Image 清單失敗:", err);
    res.status(500).json({
      success: false,
      message: "取得 OS Image 清單失敗",
      error: err?.message || String(err),
    });
  }
});

/* =========================================================
   ✅ 取得單一 OS Image
   GET /api/os-images/:id
========================================================= */
router.get("/:id", authMiddleware, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      return res.status(400).json({ success: false, message: "無效的 id" });
    }

    const image = await OsImage.findByPk(id);

    if (!image) {
      return res.status(404).json({
        success: false,
        message: "找不到指定的 OS Image",
      });
    }

    res.json({ success: true, data: image });
  } catch (err) {
    console.error("❌ 取得 OS Image 失敗:", err);
    res.status(500).json({
      success: false,
      message: "取得 OS Image 失敗",
      error: err?.message || String(err),
    });
  }
});

/* =========================================================
   ✅ 新增 OS Image（Admin）
   POST /api/os-images
========================================================= */
router.post("/", authMiddleware, authorizeRole("admin"), async (req, res) => {
  try {
    const body = req.body || {};

    const pnIso = clean(body.pnIso ?? body.pn_iso);
    if (!pnIso) {
      return res.status(400).json({
        success: false,
        message: "pnIso 為必填欄位",
      });
    }

    const payload = {
      osFamily: cleanOrNull(body.osFamily ?? body.os_family),
      isCustom: toBool(body.isCustom ?? body.is_custom) ?? false,
      itemNo: body.itemNo ?? body.item_no ?? null,
      pnIso,
      mbModel: cleanOrNull(body.mbModel ?? body.mb_model),
      mbRevision: cleanOrNull(body.mbRevision ?? body.mb_revision),
      productModels: cleanOrNull(body.productModels ?? body.product_models),
      edition: cleanOrNull(body.edition),
      version: cleanOrNull(body.version),
      licenseType: cleanOrNull(body.licenseType ?? body.license_type),
      language: cleanOrNull(body.language),
      excelSheet: cleanOrNull(body.excelSheet ?? body.excel_sheet),
      notes: body.notes ?? null,
    };

    const created = await OsImage.create(payload);

    // ✅ 跟你其他 routes 一致：logAction(userId, action, resource, meta)
    logAction(req.user?.id, "CREATE_OS_IMAGE", "os_images", {
      recordId: created.id,
      note: `新增 OS Image pnIso=${created.pnIso}`,
    }).catch(() => {});

    res.status(201).json({ success: true, data: created });
  } catch (err) {
    console.error("❌ 新增 OS Image 失敗:", err);
    if (err?.name === "SequelizeUniqueConstraintError") {
      return res.status(409).json({
        success: false,
        message: "pnIso 已存在，不可重複",
      });
    }
    res.status(500).json({
      success: false,
      message: "新增 OS Image 失敗",
      error: err?.message || String(err),
    });
  }
});

/* =========================================================
   ✅ 更新 OS Image（Admin）
   PUT /api/os-images/:id
   ✅ 改成「只更新有帶的欄位」，避免沒帶值被 clean 成空字串覆蓋
========================================================= */
router.put("/:id", authMiddleware, authorizeRole("admin"), async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      return res.status(400).json({ success: false, message: "無效的 id" });
    }

    const body = req.body || {};
    const image = await OsImage.findByPk(id);

    if (!image) {
      return res.status(404).json({
        success: false,
        message: "找不到指定的 OS Image",
      });
    }

    const payload = {};

    // ✅ 只有「有帶」才更新
    if (body.osFamily !== undefined || body.os_family !== undefined) {
      payload.osFamily = cleanOrNull(body.osFamily ?? body.os_family);
    }
    if (body.isCustom !== undefined || body.is_custom !== undefined) {
      payload.isCustom = toBool(body.isCustom ?? body.is_custom) ?? Boolean(image.isCustom);
    }
    if (body.itemNo !== undefined || body.item_no !== undefined) {
      payload.itemNo = body.itemNo ?? body.item_no ?? null;
    }
    if (body.pnIso !== undefined || body.pn_iso !== undefined) {
      const pnIso = clean(body.pnIso ?? body.pn_iso);
      if (!pnIso) {
        return res.status(400).json({ success: false, message: "pnIso 不可為空" });
      }
      payload.pnIso = pnIso;
    }
    if (body.mbModel !== undefined || body.mb_model !== undefined) {
      payload.mbModel = cleanOrNull(body.mbModel ?? body.mb_model);
    }
    if (body.mbRevision !== undefined || body.mb_revision !== undefined) {
      payload.mbRevision = cleanOrNull(body.mbRevision ?? body.mb_revision);
    }
    if (body.productModels !== undefined || body.product_models !== undefined) {
      payload.productModels = cleanOrNull(body.productModels ?? body.product_models);
    }
    if (body.edition !== undefined) payload.edition = cleanOrNull(body.edition);
    if (body.version !== undefined) payload.version = cleanOrNull(body.version);
    if (body.licenseType !== undefined || body.license_type !== undefined) {
      payload.licenseType = cleanOrNull(body.licenseType ?? body.license_type);
    }
    if (body.language !== undefined) payload.language = cleanOrNull(body.language);
    if (body.excelSheet !== undefined || body.excel_sheet !== undefined) {
      payload.excelSheet = cleanOrNull(body.excelSheet ?? body.excel_sheet);
    }
    if (body.notes !== undefined) payload.notes = body.notes;

    await image.update(payload);

    logAction(req.user?.id, "UPDATE_OS_IMAGE", "os_images", {
      recordId: image.id,
      note: `更新 OS Image pnIso=${image.pnIso}`,
      fields: Object.keys(payload),
    }).catch(() => {});

    res.json({ success: true, data: image });
  } catch (err) {
    console.error("❌ 更新 OS Image 失敗:", err);
    if (err?.name === "SequelizeUniqueConstraintError") {
      return res.status(409).json({
        success: false,
        message: "pnIso 已存在，不可重複",
      });
    }
    res.status(500).json({
      success: false,
      message: "更新 OS Image 失敗",
      error: err?.message || String(err),
    });
  }
});

/* =========================================================
   ✅ 刪除 OS Image（Admin）
   DELETE /api/os-images/:id
========================================================= */
router.delete("/:id", authMiddleware, authorizeRole("admin"), async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      return res.status(400).json({ success: false, message: "無效的 id" });
    }

    const image = await OsImage.findByPk(id);
    if (!image) {
      return res.status(404).json({
        success: false,
        message: "找不到指定的 OS Image",
      });
    }

    const pnIso = image.pnIso;
    await image.destroy();

    logAction(req.user?.id, "DELETE_OS_IMAGE", "os_images", {
      recordId: id,
      note: `刪除 OS Image pnIso=${pnIso}`,
    }).catch(() => {});

    res.json({ success: true, message: "刪除成功" });
  } catch (err) {
    console.error("❌ 刪除 OS Image 失敗:", err);
    res.status(500).json({
      success: false,
      message: "刪除 OS Image 失敗",
      error: err?.message || String(err),
    });
  }
});

export default router;
