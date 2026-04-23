// backend/src/routes/warehouse.js
import express from "express";
import { Op } from "sequelize";

import authMiddleware from "../middleware/authMiddleware.js";
import {
  sequelize,
  WarehouseItem,
  WarehouseItemImage,
  BorrowRecord,
  User,
  File,
} from "../models/index.js";
import { logAction } from "../utils/logAction.js";

const router = express.Router();

/* ---------------- Helpers ---------------- */
const norm = (s) => (s == null ? "" : String(s).trim());

const toUInt = (v, def = 0) => {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : def;
};

const toIntOrNull = (v) => {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? Math.floor(n) : null;
};

const toInt = (v, def = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.floor(n) : def;
};

const toBool = (v, def = false) => {
  if (v === true || v === false) return v;
  const s = String(v ?? "").trim().toLowerCase();
  if (["1", "true", "yes", "y", "on"].includes(s)) return true;
  if (["0", "false", "no", "n", "off", ""].includes(s)) return false;
  return def;
};

const isAdmin = (user) => String(user?.role || "").toLowerCase() === "admin";

const TYPE_WHITELIST = ["machine", "part", "tool", "instrument", "fixture", "other"];
const STATUS_WHITELIST = ["normal", "partial_damage", "disabled_scrap"];
const OS_WHITELIST = ["Win10", "Win11"];

const normalizeType = (v, fallback = "tool") => {
  const s = String(v ?? "").trim().toLowerCase();
  return TYPE_WHITELIST.includes(s) ? s : fallback;
};

const normalizeStatus = (v, fallback = "normal") => {
  const s = String(v ?? "").trim().toLowerCase();
  return STATUS_WHITELIST.includes(s) ? s : fallback;
};

const normalizeOS = (v) => {
  const s = String(v ?? "").trim();
  if (!s) return null;
  return OS_WHITELIST.includes(s) ? s : null;
};

const IMAGE_FILE_ATTRS = [
  "id",
  "originalName",
  "storedName",
  "displayName",
  "category",
  "mimeType",
  "size",
  "updatedAt",
  "isFolder",
];

/* ---------------- Borrow status helpers ---------------- */
const BORROW_STATUS_WHITELIST = ["requested", "borrowed", "returned", "canceled", "rejected"];
const REVIEW_STATUS_WHITELIST = ["pending", "approved", "rejected", "canceled"];

const normalizeBorrowStatus = (v, fallback = "requested") => {
  const s = String(v ?? "").trim().toLowerCase();
  return BORROW_STATUS_WHITELIST.includes(s) ? s : fallback;
};

const normalizeReviewStatus = (v, fallback = "pending") => {
  const s = String(v ?? "").trim().toLowerCase();
  return REVIEW_STATUS_WHITELIST.includes(s) ? s : fallback;
};

/** 批次抓 File 並驗證（必須是圖片 + 不能是資料夾） */
async function validateImageFileIdsBatch(ids) {
  const uniq = Array.from(new Set((ids || []).filter(Boolean)));
  if (!uniq.length) return { ok: true, map: new Map() };

  const files = await File.findAll({ where: { id: { [Op.in]: uniq } } });
  const map = new Map(files.map((f) => [Number(f.id), f]));

  for (const id of uniq) {
    const file = map.get(Number(id));
    if (!file) return { ok: false, message: "找不到指定的圖片檔案" };

    const cat = String(file.category ?? "").trim().toLowerCase();
    const mime = String(file.mimeType ?? "").trim().toLowerCase();
    const isImage = mime.startsWith("image/") || cat === "image";

    if (!isImage) {
      return { ok: false, message: "此檔案不是圖片，不能當作品項圖片" };
    }
    if (file.isFolder) {
      return { ok: false, message: "資料夾不能當作品項圖片" };
    }
  }

  return { ok: true, map };
}

/** 多張圖片：去重 + 驗證（批次） */
async function normalizeAndValidateImageIds(raw) {
  const arr = Array.isArray(raw) ? raw : [];
  const ids = arr
    .map((x) => toIntOrNull(x))
    .filter((x) => Number.isFinite(x) && x > 0);

  const seen = new Set();
  const uniq = [];
  for (const id of ids) {
    if (seen.has(id)) continue;
    seen.add(id);
    uniq.push(id);
  }

  const chk = await validateImageFileIdsBatch(uniq);
  if (chk.ok === false) return { ok: false, message: chk.message };

  return { ok: true, ids: uniq };
}

const FILE_API_BASE = "/api/files";

function toPlain(input) {
  if (!input) return null;
  return typeof input.get === "function" ? input.get({ plain: true }) : input;
}

function serializeUserLite(user) {
  const raw = toPlain(user);
  if (!raw) return null;

  return {
    id: Number(raw.id || 0) || null,
    username: norm(raw.username),
    name: norm(raw.name),
  };
}

function serializeFileLite(file) {
  const raw = toPlain(file);
  if (!raw) return null;

  const id = Number(raw.id || 0);
  if (!id) return null;

  const mimeType = String(raw.mimeType || "").trim();
  const category = String(raw.category || "").trim();

  return {
    id,
    mimeType,
    category: category || "Image",
    displayName: raw.displayName || raw.originalName || raw.storedName || "",
    originalName: raw.originalName || "",
    previewUrl: `${FILE_API_BASE}/${id}/preview`,
    downloadUrl: `${FILE_API_BASE}/${id}/download`,
  };
}

function serializeBorrowRecordLite(record) {
  const raw = toPlain(record);
  if (!raw) return null;

  return {
    id: raw.id,
    itemId: raw.itemId,
    borrowerId: raw.borrowerId,
    quantity: Number(raw.quantity || 0),
    status: raw.status || "requested",
    reviewStatus: raw.reviewStatus || "pending",
    approvedBy: raw.approvedBy ?? null,
    approvedAt: raw.approvedAt || null,
    purpose: norm(raw.purpose),
    expectedReturnAt: raw.expectedReturnAt || null,
    borrowedAt: raw.borrowedAt || null,
    returnedAt: raw.returnedAt || null,
    remark: norm(raw.remark),
    reviewNote: norm(raw.reviewNote),
    rejectReason: norm(raw.rejectReason),
    createdAt: raw.createdAt || null,
    updatedAt: raw.updatedAt || null,
    borrower: serializeUserLite(raw.borrower),
  };
}

function serializeWarehouseItem(item) {
  const raw = toPlain(item);
  if (!raw) return null;

  const images = (Array.isArray(raw.images) ? raw.images : [])
    .map((img) => {
      const file = serializeFileLite(img?.file);
      if (!file) return null;

      return {
        id: img?.id ?? null,
        sortOrder: Number(img?.sortOrder || 0),
        fileId: Number(img?.fileId || file.id),
        file,
      };
    })
    .filter(Boolean)
    .sort((a, b) => {
      const aOrder = Number(a.sortOrder || 0);
      const bOrder = Number(b.sortOrder || 0);
      if (aOrder !== bOrder) return aOrder - bOrder;
      return Number(a.id || 0) - Number(b.id || 0);
    });

  let imageFile = serializeFileLite(raw.imageFile);
  if (!imageFile && images[0]?.file) {
    imageFile = images[0].file;
  }

  const imageFileIds = images
    .map((x) => Number(x.fileId))
    .filter((x) => Number.isFinite(x) && x > 0);

  const imageFileId = imageFile?.id || imageFileIds[0] || null;

  if (!imageFile && imageFileId) {
    imageFile = images.find((x) => Number(x.fileId) === Number(imageFileId))?.file || null;
  }

  return {
    id: raw.id,
    name: raw.name,
    code: raw.code,
    type: raw.type,
    location: raw.location,
    totalQty: Number(raw.totalQty || 0),
    currentQty: Number(raw.currentQty || 0),
    status: raw.status || "normal",
    hasPeripheral: !!raw.hasPeripheral,
    os: raw.os || null,
    remark: raw.remark || "",
    createdBy: raw.createdBy ?? null,
    isDeleted: !!raw.isDeleted,
    createdAt: raw.createdAt || null,
    updatedAt: raw.updatedAt || null,

    creator: serializeUserLite(raw.creator),

    imageFileId,
    imageFileIds,
    imageFile,
    images,

    borrows: Array.isArray(raw.borrows)
      ? raw.borrows.map(serializeBorrowRecordLite).filter(Boolean)
      : undefined,
  };
}

function serializeBorrowRecord(record) {
  const raw = toPlain(record);
  if (!raw) return null;

  return {
    id: raw.id,
    itemId: raw.itemId,
    borrowerId: raw.borrowerId,
    quantity: Number(raw.quantity || 0),
    status: raw.status || "requested",
    reviewStatus: raw.reviewStatus || "pending",
    approvedBy: raw.approvedBy ?? null,
    approvedAt: raw.approvedAt || null,
    purpose: norm(raw.purpose),
    expectedReturnAt: raw.expectedReturnAt || null,
    borrowedAt: raw.borrowedAt || null,
    returnedAt: raw.returnedAt || null,
    remark: norm(raw.remark),
    reviewNote: norm(raw.reviewNote),
    rejectReason: norm(raw.rejectReason),
    createdAt: raw.createdAt || null,
    updatedAt: raw.updatedAt || null,
    borrower: serializeUserLite(raw.borrower),
    item: serializeWarehouseItem(raw.item),
  };
}

/** 共用 include：creator + 封面 + 多張圖（images -> file） */
function itemIncludes() {
  return [
    {
      model: User,
      as: "creator",
      attributes: ["id", "username", "name"],
    },
    {
      model: File,
      as: "imageFile",
      attributes: IMAGE_FILE_ATTRS,
      required: false,
    },
    {
      model: WarehouseItemImage,
      as: "images",
      required: false,
      separate: true,
      order: [
        ["sortOrder", "ASC"],
        ["id", "ASC"],
      ],
      include: [
        {
          model: File,
          as: "file",
          attributes: IMAGE_FILE_ATTRS,
          required: false,
        },
      ],
    },
  ];
}

/** Borrow include */
function borrowIncludes() {
  return [
    {
      model: WarehouseItem,
      as: "item",
      include: [
        {
          model: File,
          as: "imageFile",
          attributes: IMAGE_FILE_ATTRS,
          required: false,
        },
        {
          model: WarehouseItemImage,
          as: "images",
          required: false,
          separate: true,
          order: [
            ["sortOrder", "ASC"],
            ["id", "ASC"],
          ],
          include: [
            { model: File, as: "file", attributes: IMAGE_FILE_ATTRS, required: false },
          ],
        },
      ],
    },
    { model: User, as: "borrower", attributes: ["id", "username", "name"] },
  ];
}

/* =========================== 庫存列表 =========================== */
// GET /api/warehouse/items?keyword=&type=&status=&hasPeripheral=&os=&page=1&pageSize=20
router.get("/items", authMiddleware, async (req, res) => {
  try {
    const {
      keyword = "",
      type = "",
      status = "",
      hasPeripheral = "",
      os = "",
    } = req.query;

    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const size = Math.max(1, parseInt(req.query.pageSize, 10) || 20);

    const where = { isDeleted: false };

    if (keyword) {
      where[Op.or] = [
        { name: { [Op.like]: `%${keyword}%` } },
        { code: { [Op.like]: `%${keyword}%` } },
        { location: { [Op.like]: `%${keyword}%` } },
      ];
    }
    if (type) where.type = normalizeType(type, type);
    if (status) where.status = normalizeStatus(status, status);

    if (String(hasPeripheral).trim() !== "") {
      where.hasPeripheral = toBool(hasPeripheral, false);
    }

    const osNorm = normalizeOS(os);
    if (osNorm) where.os = osNorm;

    const { rows, count } = await WarehouseItem.findAndCountAll({
      where,
      include: itemIncludes(),
      limit: size,
      offset: (page - 1) * size,
      order: [["name", "ASC"]],
      distinct: true,
    });

    res.json({
      success: true,
      data: {
        rows: rows.map(serializeWarehouseItem),
        count,
        page,
        pageSize: size,
      },
    });
  } catch (err) {
    console.error("❌ 取得庫存列表失敗:", err);
    res.status(500).json({ success: false, message: "伺服器錯誤" });
  }
});

/* =========================== 單一品項 =========================== */
// GET /api/warehouse/items/:id
router.get("/items/:id", authMiddleware, async (req, res) => {
  try {
    const item = await WarehouseItem.findByPk(req.params.id, {
      include: [
        ...itemIncludes(),
        {
          model: BorrowRecord,
          as: "borrows",
          separate: true,
          limit: 20,
          order: [["borrowedAt", "DESC"], ["createdAt", "DESC"]],
          include: [
            {
              model: User,
              as: "borrower",
              attributes: ["id", "username", "name"],
            },
          ],
        },
      ],
      distinct: true,
    });

    if (!item) return res.status(404).json({ success: false, message: "找不到品項" });
    res.json({ success: true, data: serializeWarehouseItem(item) });
  } catch (err) {
    console.error("❌ 取得品項失敗:", err);
    res.status(500).json({ success: false, message: "伺服器錯誤" });
  }
});

/* =========================== 新增品項（Admin） =========================== */
// POST /api/warehouse/items
router.post("/items", authMiddleware, async (req, res) => {
  try {
    if (!isAdmin(req.user)) {
      return res.status(403).json({ success: false, message: "僅管理員可新增品項" });
    }

    const {
      name,
      code,
      type,
      location,
      totalQty,
      currentQty,
      status,
      remark,
      hasPeripheral,
      os,
      imageFileId,
      imageFileIds,
    } = req.body || {};

    if (!name) return res.status(400).json({ success: false, message: "請填寫品項名稱" });

    const total = toUInt(totalQty, 0);
    const current = currentQty != null ? toUInt(currentQty, total) : total;

    const rawIds = Array.isArray(imageFileIds)
      ? imageFileIds
      : (imageFileId != null ? [imageFileId] : []);

    const idsCheck = await normalizeAndValidateImageIds(rawIds);
    if (idsCheck.ok === false) {
      return res.status(400).json({ success: false, message: idsCheck.message });
    }
    const ids = idsCheck.ids || [];

    const coverId = toIntOrNull(imageFileId) ?? (ids[0] ?? null);

    const finalStatus =
      status != null && String(status).trim() !== ""
        ? normalizeStatus(status, "normal")
        : "normal";

    const createdItem = await sequelize.transaction(async (t) => {
      const created = await WarehouseItem.create(
        {
          name: norm(name),
          code: norm(code),
          type: normalizeType(type, "tool"),
          location: norm(location),
          totalQty: total,
          currentQty: current,
          status: finalStatus,
          hasPeripheral: toBool(hasPeripheral, false),
          os: normalizeOS(os),
          remark: norm(remark),
          imageFileId: coverId,
          createdBy: req.user.id,
          isDeleted: false,
        },
        { transaction: t }
      );

      if (ids.length) {
        await WarehouseItemImage.bulkCreate(
          ids.map((fid, idx) => ({
            itemId: created.id,
            fileId: fid,
            sortOrder: idx + 1,
          })),
          { transaction: t }
        );

        if (!coverId && ids[0]) {
          await created.update({ imageFileId: ids[0] }, { transaction: t });
        }
      }

      return created;
    });

    logAction(req.user.id, "CREATE_WAREHOUSE_ITEM", "warehouse_items", {
      recordId: createdItem.id,
      note: `新增倉庫品項：${createdItem.name}`,
    }).catch(() => {});

    const fresh = await WarehouseItem.findByPk(createdItem.id, { include: itemIncludes() });
    res.status(201).json({
      success: true,
      message: "✅ 已新增品項",
      data: serializeWarehouseItem(fresh || createdItem),
    });
  } catch (err) {
    console.error("❌ 新增品項失敗:", err);
    res.status(500).json({ success: false, message: err?.message || "伺服器錯誤" });
  }
});

/* =========================== 更新品項（Admin） =========================== */
// PUT /api/warehouse/items/:id
router.put("/items/:id", authMiddleware, async (req, res) => {
  try {
    if (!isAdmin(req.user)) {
      return res.status(403).json({ success: false, message: "僅管理員可修改品項" });
    }

    const item = await WarehouseItem.findByPk(req.params.id);
    if (!item) return res.status(404).json({ success: false, message: "找不到品項" });

    const body = req.body || {};
    const payload = {};

    if (body.name !== undefined) payload.name = norm(body.name);
    if (body.code !== undefined) payload.code = norm(body.code);
    if (body.type !== undefined) payload.type = normalizeType(body.type, "tool");
    if (body.location !== undefined) payload.location = norm(body.location);
    if (body.remark !== undefined) payload.remark = norm(body.remark);

    if (body.totalQty !== undefined) payload.totalQty = toUInt(body.totalQty, item.totalQty);
    if (body.currentQty !== undefined) payload.currentQty = toUInt(body.currentQty, item.currentQty);

    if (body.hasPeripheral !== undefined) payload.hasPeripheral = toBool(body.hasPeripheral, item.hasPeripheral);
    if (body.os !== undefined) payload.os = normalizeOS(body.os);

    if (body.status !== undefined) {
      payload.status = normalizeStatus(body.status, item.status || "normal");
    }

    if (body.imageFileId !== undefined) {
      const coverId = toIntOrNull(body.imageFileId);
      const chk = await validateImageFileIdsBatch(coverId ? [coverId] : []);
      if (chk.ok === false) {
        return res.status(400).json({ success: false, message: chk.message });
      }
      payload.imageFileId = coverId;
    }

    const hasImageIds = body.imageFileIds !== undefined;

    await sequelize.transaction(async (t) => {
      await item.update(payload, { transaction: t });

      if (hasImageIds) {
        const idsCheck = await normalizeAndValidateImageIds(body.imageFileIds);
        if (idsCheck.ok === false) throw new Error(idsCheck.message);

        let ids = idsCheck.ids || [];

        const explicitCoverId = body.imageFileId !== undefined ? toIntOrNull(body.imageFileId) : null;
        if (explicitCoverId && !ids.includes(explicitCoverId)) {
          ids = [explicitCoverId, ...ids];
        }

        await WarehouseItemImage.destroy({ where: { itemId: item.id }, transaction: t });

        if (ids.length) {
          await WarehouseItemImage.bulkCreate(
            ids.map((fid, idx) => ({
              itemId: item.id,
              fileId: fid,
              sortOrder: idx + 1,
            })),
            { transaction: t }
          );

          if (body.imageFileId === undefined) {
            await item.update({ imageFileId: ids[0] }, { transaction: t });
          }
        } else if (body.imageFileId === undefined) {
          await item.update({ imageFileId: null }, { transaction: t });
        }
      } else if (body.imageFileId !== undefined) {
        const coverId = payload.imageFileId ?? item.imageFileId;
        if (coverId) {
          const existed = await WarehouseItemImage.findOne({
            where: { itemId: item.id, fileId: coverId },
            transaction: t,
          });

          if (!existed) {
            const maxOrder = await WarehouseItemImage.max("sortOrder", {
              where: { itemId: item.id },
              transaction: t,
            });

            await WarehouseItemImage.create(
              {
                itemId: item.id,
                fileId: coverId,
                sortOrder: (Number(maxOrder) || 0) + 1,
              },
              { transaction: t }
            );
          }
        }
      }
    });

    logAction(req.user.id, "UPDATE_WAREHOUSE_ITEM", "warehouse_items", {
      recordId: item.id,
      note: `更新倉庫品項：${item.name}`,
    }).catch(() => {});

    const fresh = await WarehouseItem.findByPk(item.id, { include: itemIncludes() });
    res.json({
      success: true,
      message: "✅ 品項已更新",
      data: serializeWarehouseItem(fresh || item),
    });
  } catch (err) {
    console.error("❌ 更新品項失敗:", err);
    res.status(500).json({ success: false, message: err?.message || "伺服器錯誤" });
  }
});

/* =========================== 硬刪除品項（Admin） =========================== */
// DELETE /api/warehouse/items/:id
router.delete("/items/:id", authMiddleware, async (req, res) => {
  try {
    if (!isAdmin(req.user)) {
      return res.status(403).json({ success: false, message: "僅管理員可刪除品項" });
    }

    const id = toInt(req.params.id, 0);
    if (!id) return res.status(400).json({ success: false, message: "Bad id" });

    const item = await WarehouseItem.unscoped().findByPk(id);
    if (!item) return res.status(404).json({ success: false, message: "找不到品項" });

    await sequelize.transaction(async (t) => {
      await BorrowRecord.destroy({ where: { itemId: id }, transaction: t });
      await WarehouseItemImage.destroy({ where: { itemId: id }, transaction: t });
      await WarehouseItem.unscoped().destroy({ where: { id }, transaction: t });
    });

    logAction(req.user.id, "PURGE_WAREHOUSE_ITEM", "warehouse_items", {
      recordId: id,
      note: `硬刪除倉庫品項：${item.name}`,
    }).catch(() => {});

    res.json({ success: true, message: "🗑 已永久刪除（資料庫移除）" });
  } catch (err) {
    console.error("❌ 永久刪除品項失敗:", err);
    res.status(500).json({ success: false, message: err?.message || "伺服器錯誤" });
  }
});

/* =========================== 借用：建立借用（Admin 自動核准並扣庫存） =========================== */
// POST /api/warehouse/borrow
router.post("/borrow", authMiddleware, async (req, res) => {
  try {
    const { itemId, quantity, purpose, expectedReturnAt, remark } = req.body || {};
    const qty = toUInt(quantity, 1);
    const iid = toInt(itemId, 0);

    if (!iid || !qty) {
      return res.status(400).json({ success: false, message: "請提供 itemId 與 quantity" });
    }

    const autoApprove = isAdmin(req.user);

    const record = await sequelize.transaction(async (t) => {
      const item = await WarehouseItem.unscoped().findByPk(iid, {
        transaction: t,
        lock: t.LOCK.UPDATE,
      });
      if (!item || item.isDeleted) throw new Error("找不到品項");

      if (String(item.status || "").toLowerCase() === "disabled_scrap") {
        throw new Error("DISABLED_SCRAP");
      }

      const cur = Number(item.currentQty || 0);
      if (cur < qty) {
        throw new Error("庫存不足，無法借用");
      }

      const now = new Date();

      if (autoApprove) {
        await item.update({ currentQty: cur - qty }, { transaction: t });
      }

      let exp = null;
      if (expectedReturnAt) {
        const d = new Date(expectedReturnAt);
        if (!Number.isNaN(d.getTime())) exp = d;
      }

      return await BorrowRecord.create(
        {
          itemId: item.id,
          borrowerId: req.user.id,
          quantity: qty,
          status: autoApprove ? "borrowed" : "requested",
          reviewStatus: autoApprove ? "approved" : "pending",
          approvedBy: autoApprove ? req.user.id : null,
          approvedAt: autoApprove ? now : null,
          reviewNote: null,
          rejectReason: null,
          purpose: norm(purpose),
          expectedReturnAt: exp,
          borrowedAt: now,
          returnedAt: null,
          remark: norm(remark),
        },
        { transaction: t }
      );
    });

    logAction(req.user.id, autoApprove ? "BORROW_ITEM_AUTO_APPROVE" : "REQUEST_BORROW_ITEM", "borrow_records", {
      recordId: record.id,
      note: `${autoApprove ? "借出" : "申請借用"} itemId=${record.itemId} x${record.quantity}`,
      status: autoApprove ? "approved" : "pending",
    }).catch(() => {});

    const fresh = await BorrowRecord.findByPk(record.id, { include: borrowIncludes() });

    return res.status(201).json({
      success: true,
      message: autoApprove ? "✅ 已借出並扣庫存" : "✅ 借用申請已送出（待審核）",
      data: serializeBorrowRecord(fresh || record),
    });
  } catch (err) {
    const msg = String(err?.message || "");
    if (msg.includes("找不到品項")) {
      return res.status(404).json({ success: false, message: "找不到品項" });
    }
    if (msg === "DISABLED_SCRAP") {
      return res.status(400).json({ success: false, message: "此品項為停用/報廢，無法借用" });
    }
    if (msg.includes("庫存不足")) {
      return res.status(400).json({ success: false, message: "庫存不足，無法借用" });
    }

    console.error("❌ 借用失敗:", err);
    return res.status(500).json({ success: false, message: err?.message || "伺服器錯誤" });
  }
});

/* =========================== 借用：取消申請（本人/管理員，pending 才能取消） =========================== */
// PATCH /api/warehouse/borrow/:id/cancel
router.patch("/borrow/:id/cancel", authMiddleware, async (req, res) => {
  try {
    const id = toInt(req.params.id, 0);
    if (!id) return res.status(400).json({ success: false, message: "Bad id" });

    const updated = await sequelize.transaction(async (t) => {
      const record = await BorrowRecord.findByPk(id, { transaction: t, lock: t.LOCK.UPDATE });
      if (!record) throw new Error("NOT_FOUND");

      if (!isAdmin(req.user) && Number(record.borrowerId) !== Number(req.user.id)) {
        throw new Error("FORBIDDEN");
      }

      if (
        normalizeReviewStatus(record.reviewStatus) !== "pending" ||
        normalizeBorrowStatus(record.status) !== "requested"
      ) {
        throw new Error("CANNOT_CANCEL");
      }

      await record.update(
        {
          status: "canceled",
          reviewStatus: "canceled",
          reviewNote: norm(req.body?.note),
        },
        { transaction: t }
      );

      return record;
    });

    logAction(req.user.id, "CANCEL_BORROW_REQUEST", "borrow_records", {
      recordId: updated.id,
      note: `取消借用申請 #${updated.id}`,
    }).catch(() => {});

    const fresh = await BorrowRecord.findByPk(updated.id, { include: borrowIncludes() });
    res.json({ success: true, message: "✅ 已取消申請", data: serializeBorrowRecord(fresh || updated) });
  } catch (err) {
    const msg = String(err?.message || "");
    if (msg === "NOT_FOUND") return res.status(404).json({ success: false, message: "找不到借用紀錄" });
    if (msg === "FORBIDDEN") return res.status(403).json({ success: false, message: "沒有權限取消" });
    if (msg === "CANNOT_CANCEL") {
      return res.status(400).json({ success: false, message: "此紀錄無法取消（可能已審核/已借出）" });
    }
    console.error("❌ 取消借用失敗:", err);
    res.status(500).json({ success: false, message: "伺服器錯誤" });
  }
});

/* =========================== 借用：管理員審核（核准會扣庫存） =========================== */
// PATCH /api/warehouse/borrow/:id/review
// body: { action: "approve"|"reject", note?, rejectReason? }
router.patch("/borrow/:id/review", authMiddleware, async (req, res) => {
  try {
    if (!isAdmin(req.user)) {
      return res.status(403).json({ success: false, message: "僅管理員可審核借用" });
    }

    const id = toInt(req.params.id, 0);
    const action = String(req.body?.action || "").trim().toLowerCase();
    const note = norm(req.body?.note);
    const rejectReason = norm(req.body?.rejectReason);

    if (!id) return res.status(400).json({ success: false, message: "Bad id" });
    if (!["approve", "reject"].includes(action)) {
      return res.status(400).json({ success: false, message: "action 必須是 approve 或 reject" });
    }

    const result = await sequelize.transaction(async (t) => {
      const record = await BorrowRecord.findByPk(id, { transaction: t, lock: t.LOCK.UPDATE });
      if (!record) throw new Error("NOT_FOUND");

      if (
        normalizeReviewStatus(record.reviewStatus) !== "pending" ||
        normalizeBorrowStatus(record.status) !== "requested"
      ) {
        throw new Error("CANNOT_REVIEW");
      }

      const item = await WarehouseItem.unscoped().findByPk(record.itemId, {
        transaction: t,
        lock: t.LOCK.UPDATE,
      });
      if (!item || item.isDeleted) throw new Error("ITEM_NOT_FOUND");

      if (String(item.status || "").toLowerCase() === "disabled_scrap") {
        throw new Error("DISABLED_SCRAP");
      }

      if (action === "reject") {
        if (!rejectReason) throw new Error("REJECT_REASON_REQUIRED");

        await record.update(
          {
            reviewStatus: "rejected",
            status: "rejected",
            approvedBy: req.user.id,
            approvedAt: new Date(),
            reviewNote: note || null,
            rejectReason,
          },
          { transaction: t }
        );

        return record;
      }

      const cur = Number(item.currentQty || 0);
      const qty = Number(record.quantity || 0);
      if (cur < qty) throw new Error("NOT_ENOUGH_STOCK");

      const nextQty = cur - qty;

      await item.update({ currentQty: nextQty }, { transaction: t });

      await record.update(
        {
          reviewStatus: "approved",
          status: "borrowed",
          approvedBy: req.user.id,
          approvedAt: new Date(),
          reviewNote: note || null,
          rejectReason: null,
          borrowedAt: new Date(),
        },
        { transaction: t }
      );

      return record;
    });

    logAction(req.user.id, "REVIEW_BORROW_REQUEST", "borrow_records", {
      recordId: result.id,
      note: `審核借用 #${result.id} => ${result.reviewStatus}`,
    }).catch(() => {});

    const fresh = await BorrowRecord.findByPk(result.id, { include: borrowIncludes() });
    res.json({
      success: true,
      message: "✅ 審核完成",
      data: serializeBorrowRecord(fresh || result),
    });
  } catch (err) {
    const msg = String(err?.message || "");
    if (msg === "NOT_FOUND") return res.status(404).json({ success: false, message: "找不到借用紀錄" });
    if (msg === "ITEM_NOT_FOUND") return res.status(404).json({ success: false, message: "找不到品項" });
    if (msg === "CANNOT_REVIEW") {
      return res.status(400).json({ success: false, message: "此紀錄無法審核（可能已審核/已取消）" });
    }
    if (msg === "NOT_ENOUGH_STOCK") {
      return res.status(400).json({ success: false, message: "庫存不足，無法核准" });
    }
    if (msg === "REJECT_REASON_REQUIRED") {
      return res.status(400).json({ success: false, message: "rejectReason 為必填" });
    }
    if (msg === "DISABLED_SCRAP") {
      return res.status(400).json({ success: false, message: "此品項為停用/報廢，無法核准借用" });
    }

    console.error("❌ 審核借用失敗:", err);
    res.status(500).json({ success: false, message: err?.message || "伺服器錯誤" });
  }
});

/* =========================== 歸還（僅 borrowed 才能歸還） =========================== */
// PATCH /api/warehouse/borrow/:id/return
router.patch("/borrow/:id/return", authMiddleware, async (req, res) => {
  try {
    const id = toInt(req.params.id, 0);
    if (!id) return res.status(400).json({ success: false, message: "Bad id" });

    const updated = await sequelize.transaction(async (t) => {
      const record = await BorrowRecord.findByPk(id, { transaction: t, lock: t.LOCK.UPDATE });
      if (!record) throw new Error("NOT_FOUND");

      if (!isAdmin(req.user) && Number(record.borrowerId) !== Number(req.user.id)) {
        throw new Error("FORBIDDEN");
      }

      if (normalizeBorrowStatus(record.status) !== "borrowed") {
        throw new Error("NOT_BORROWED");
      }

      const item = await WarehouseItem.unscoped().findByPk(record.itemId, {
        transaction: t,
        lock: t.LOCK.UPDATE,
      });
      if (!item) throw new Error("ITEM_NOT_FOUND");

      const nextQty = Number(item.currentQty || 0) + Number(record.quantity || 0);

      await item.update({ currentQty: nextQty }, { transaction: t });

      await record.update(
        {
          status: "returned",
          returnedAt: new Date(),
        },
        { transaction: t }
      );

      return record;
    });

    logAction(req.user.id, "RETURN_ITEM", "borrow_records", {
      recordId: updated.id,
      note: `歸還 #${updated.id}`,
    }).catch(() => {});

    const fresh = await BorrowRecord.findByPk(updated.id, { include: borrowIncludes() });
    res.json({ success: true, message: "✅ 已標記歸還", data: serializeBorrowRecord(fresh || updated) });
  } catch (err) {
    const msg = String(err?.message || "");
    if (msg === "NOT_FOUND") return res.status(404).json({ success: false, message: "找不到借用紀錄" });
    if (msg === "ITEM_NOT_FOUND") return res.status(400).json({ success: false, message: "借用紀錄缺少品項資訊" });
    if (msg === "FORBIDDEN") return res.status(403).json({ success: false, message: "沒有權限歸還此紀錄" });
    if (msg === "NOT_BORROWED") return res.status(400).json({ success: false, message: "此紀錄尚未借出或無法歸還" });

    console.error("❌ 歸還失敗:", err);
    res.status(500).json({ success: false, message: err?.message || "伺服器錯誤" });
  }
});

/* =========================== 借用列表 =========================== */
// GET /api/warehouse/borrow?mine=1&status=borrowed&reviewStatus=pending&page=1&pageSize=20
router.get("/borrow", authMiddleware, async (req, res) => {
  try {
    const mine = String(req.query.mine || "0") === "1";
    const status = String(req.query.status || "").trim().toLowerCase();
    const reviewStatus = String(req.query.reviewStatus || "").trim().toLowerCase();
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const size = Math.max(1, parseInt(req.query.pageSize, 10) || 20);

    const where = {};
    if (mine || !isAdmin(req.user)) where.borrowerId = req.user.id;
    if (status) where.status = normalizeBorrowStatus(status, status);
    if (reviewStatus) where.reviewStatus = normalizeReviewStatus(reviewStatus, reviewStatus);

    const { rows, count } = await BorrowRecord.findAndCountAll({
      where,
      include: borrowIncludes(),
      order: [["borrowedAt", "DESC"], ["createdAt", "DESC"]],
      limit: size,
      offset: (page - 1) * size,
      distinct: true,
    });

    res.json({
      success: true,
      data: {
        rows: rows.map(serializeBorrowRecord),
        count,
        page,
        pageSize: size,
      },
    });
  } catch (err) {
    console.error("❌ 取得借用列表失敗:", err);
    res.status(500).json({ success: false, message: "伺服器錯誤" });
  }
});

export default router;