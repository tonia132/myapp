import express from "express";
import path from "node:path";
import fs from "node:fs";
import crypto from "node:crypto";
import multer from "multer";
import { Op, fn, col } from "sequelize";

import authMiddleware from "../middleware/authMiddleware.js";
import { File, User } from "../models/index.js";
import { logAction } from "../utils/logAction.js";

const router = express.Router();

/* =========================================================
   分類白名單（含 OS / Driver / Firmware / 認證）
========================================================= */
const CATEGORY_WHITELIST = [
  "general",
  "SOP",
  "Report",
  "Machine",
  "Image",
  "Dataset",
  "Other",
  "OS",
  "Driver",
  "Firmware",
  "認證",
];

function normalizeCategory(input, fallback = "general") {
  if (input == null) return fallback;
  const raw = String(input).trim();
  if (!raw) return fallback;

  if (raw.toUpperCase() === "OS") return "OS";
  if (CATEGORY_WHITELIST.includes(raw)) return raw;

  const lower = raw.toLowerCase();
  const mapping = {
    general: "general",
    sop: "SOP",
    report: "Report",
    machine: "Machine",
    image: "Image",
    dataset: "Dataset",
    other: "Other",
    os: "OS",
    driver: "Driver",
    firmware: "Firmware",
    cert: "認證",
    "認證": "認證",
  };

  if (mapping[lower]) return mapping[lower];
  return raw || fallback;
}

/* =========================================================
   小工具
========================================================= */
const clean = (s) => String(s ?? "").trim();

const clampStr = (v, max = 200) => {
  const s = clean(v);
  if (!s) return "";
  const noCtl = s.replace(/[\u0000-\u001f\u007f]/g, "");
  return noCtl.length > max ? noCtl.slice(0, max) : noCtl;
};

const toBool = (v, def = false) => {
  if (v === true || v === false) return v;
  const s = String(v ?? "").toLowerCase().trim();
  if (["1", "true", "yes", "y", "on"].includes(s)) return true;
  if (["0", "false", "no", "n", "off", ""].includes(s)) return false;
  return def;
};

const getClientIp = (req) =>
  req.headers["x-forwarded-for"]?.toString()?.split(",")[0]?.trim() || req.ip || "";

/* =========================================================
   檔案根資料夾（可用 env 指定）
========================================================= */
const ROOT = path.resolve(process.env.FILES_ROOT || path.join("uploads", "files"));
fs.mkdirSync(ROOT, { recursive: true });

const randomName = (ext = "") =>
  `${Date.now()}_${crypto.randomBytes(6).toString("hex")}${ext && !ext.startsWith(".") ? "." + ext : ext}`;

const genFolderStoredName = () =>
  `dir_${Date.now()}_${crypto.randomBytes(6).toString("hex")}`;

/* =========================================================
   URL helper
========================================================= */
function normalizeApiBase(raw, fallback = "/api") {
  const s = String(raw ?? "").trim();
  if (!s) return fallback;

  if (/^https?:\/\//i.test(s)) {
    return s.replace(/\/+$/, "");
  }

  let p = s;
  if (!p.startsWith("/")) p = "/" + p;
  p = p.replace(/\/+$/, "");
  return p || fallback;
}

const API_BASE = normalizeApiBase(process.env.PUBLIC_API_PREFIX, "/api");
const buildDownloadUrl = (id) => `${API_BASE}/files/${id}/download`;
const buildPreviewUrl = (id) => `${API_BASE}/files/${id}/preview`;

function attachPublicUrls(instanceOrPlain) {
  if (!instanceOrPlain) return instanceOrPlain;

  const mimeType =
    (instanceOrPlain.mimeType ?? instanceOrPlain.get?.("mimeType") ?? "") + "";

  const id = instanceOrPlain.id ?? instanceOrPlain.get?.("id");
  if (!id) return instanceOrPlain;

  const isImage = mimeType.startsWith("image/");
  const downloadUrl = buildDownloadUrl(id);
  const previewUrl = isImage ? buildPreviewUrl(id) : "";
  const url = previewUrl || downloadUrl;

  if (typeof instanceOrPlain.setDataValue === "function") {
    instanceOrPlain.setDataValue("downloadUrl", downloadUrl);
    instanceOrPlain.setDataValue("url", url);
    instanceOrPlain.setDataValue("previewUrl", previewUrl || null);
    return instanceOrPlain;
  }

  return {
    ...instanceOrPlain,
    downloadUrl,
    url,
    previewUrl: previewUrl || null,
  };
}

/* =========================================================
   Serializer
========================================================= */
function toPlain(input) {
  if (!input) return null;
  return typeof input.get === "function" ? input.get({ plain: true }) : input;
}

function serializeUploaderLite(user) {
  const raw = toPlain(user);
  if (!raw) return null;

  return {
    id: raw.id ?? null,
    username: raw.username || "",
    name: raw.name || "",
  };
}

function serializeFile(input, { canManage = false } = {}) {
  const raw = toPlain(input);
  if (!raw) return null;

  const urls = raw.isFolder
    ? { downloadUrl: null, previewUrl: null, url: null }
    : attachPublicUrls({ ...raw });

  return {
    id: raw.id ?? null,
    displayName: raw.displayName || "",
    originalName: raw.originalName || "",
    storedName: raw.storedName || "",
    ext: raw.ext || "",
    mimeType: raw.mimeType || "",
    size: Number(raw.size || 0),
    category: raw.category || "general",
    isFolder: !!raw.isFolder,
    isDeleted: !!raw.isDeleted,
    parentId: raw.parentId ?? null,
    uploaderId: raw.uploaderId ?? null,
    createdAt: raw.createdAt || null,
    updatedAt: raw.updatedAt || null,

    canManage: !!canManage,

    downloadUrl: urls?.downloadUrl || null,
    previewUrl: urls?.previewUrl || null,
    url: urls?.url || null,

    uploader: serializeUploaderLite(raw.uploader),
  };
}

function serializeFolderListRow(row, { canManage = false } = {}) {
  const raw = toPlain(row);
  if (!raw) return null;

  return {
    id: raw.id ?? null,
    displayName: raw.displayName || raw.originalName || "",
    originalName: raw.originalName || "",
    parentId: raw.parentId ?? null,
    category: raw.category || "general",
    uploaderId: raw.uploaderId ?? null,
    createdAt: raw.createdAt || null,
    canManage: !!canManage,
  };
}

/* =========================================================
   安全刪檔（只允許刪 uploads/files 內的檔案）
========================================================= */
const isInsideRoot = (targetPath) => {
  try {
    const rel = path.relative(ROOT, path.resolve(targetPath));
    return !!rel && !rel.startsWith("..") && !path.isAbsolute(rel);
  } catch {
    return false;
  }
};

const safeUnlinkInRoot = (p) => {
  try {
    if (!p) return;
    const abs = path.resolve(p);
    if (!isInsideRoot(abs)) {
      console.warn("⚠️ [safeUnlinkInRoot] blocked:", abs);
      return;
    }
    if (fs.existsSync(abs)) fs.unlinkSync(abs);
  } catch {}
};

const safeUnlink = safeUnlinkInRoot;

/* =========================================================
   遞迴永久刪除（迭代避免深層 stack）
========================================================= */
async function hardDeleteNode(node, { transaction } = {}) {
  if (!node) return;

  const stack = [node];
  const post = [];

  while (stack.length) {
    const cur = stack.pop();
    if (!cur) continue;
    post.push(cur);

    if (cur.isFolder) {
      const children = await File.scope("withPath").findAll({
        where: { parentId: cur.id },
        paranoid: false,
        transaction,
      });
      for (const c of children) stack.push(c);
    }
  }

  for (let i = post.length - 1; i >= 0; i--) {
    const cur = post[i];
    if (!cur) continue;

    if (!cur.isFolder) {
      safeUnlinkInRoot(cur.path);
    }
    await cur.destroy({ force: true, transaction });
  }
}

/* =========================================================
   Multer 設定
========================================================= */
const MAX_FILE_SIZE_MB = Number(process.env.FILE_MAX_SIZE_MB || 500);
console.log("📁 File upload max size =", MAX_FILE_SIZE_MB, "MB");

const ALLOWED_EXTS = new Set([
  ".pdf",
  ".png",
  ".jpg",
  ".jpeg",
  ".webp",
  ".gif",
  ".bmp",
  ".xls",
  ".xlsx",
  ".xlsm",
  ".csv",
  ".doc",
  ".docx",
  ".txt",
  ".zip",
  ".7z",
  ".rar",
]);

const BLOCKED_EXTS = new Set([
  ".html",
  ".htm",
  ".svg",
  ".js",
  ".mjs",
  ".cjs",
  ".xhtml",
  ".xml",
]);

const ALLOWED_MIMES = new Set([
  "application/pdf",

  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "image/bmp",

  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel.sheet.macroenabled.12",
  "text/csv",

  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",

  "application/zip",
  "application/x-zip-compressed",
  "application/x-7z-compressed",
  "application/vnd.rar",
  "application/octet-stream",
]);

function safeExt(name = "") {
  return String(path.extname(name || "")).toLowerCase().trim();
}

function fileFilter(_req, file, cb) {
  const originalName = String(file?.originalname || "");
  const ext = safeExt(originalName);
  const mime = String(file?.mimetype || "").toLowerCase().trim();

  if (!originalName) {
    return cb(new Error("檔名不可為空"));
  }

  if (BLOCKED_EXTS.has(ext)) {
    return cb(new Error(`不允許上傳此檔案類型：${ext}`));
  }

  if (!ALLOWED_EXTS.has(ext)) {
    return cb(new Error(`副檔名不在允許清單內：${ext || "(無副檔名)"}`));
  }

  if (mime && mime !== "application/octet-stream" && !ALLOWED_MIMES.has(mime)) {
    return cb(new Error(`MIME type 不在允許清單內：${mime}`));
  }

  return cb(null, true);
}

const storage = multer.diskStorage({
  destination(_req, _file, cb) {
    cb(null, ROOT);
  },
  filename(_req, file, cb) {
    const ext = path.extname(file.originalname || "") || "";
    cb(null, randomName(ext));
  },
});

function makeUploader({ singleField = null, maxFiles = 10 } = {}) {
  const uploader = multer({
    storage,
    fileFilter,
    limits: {
      files: maxFiles,
      fileSize: MAX_FILE_SIZE_MB * 1024 * 1024,
    },
  });

  return singleField ? uploader.single(singleField) : uploader.any();
}

const uploadAny = makeUploader({ maxFiles: 10 });
const uploadOne = makeUploader({ singleField: "file", maxFiles: 1 });
const replaceUpload = makeUploader({ singleField: "file", maxFiles: 1 });

/* =========================================================
   admin 判斷（快取）
========================================================= */
const isAdmin = async (req) => {
  if (req._isAdmin !== undefined) return req._isAdmin;

  if (req.user?.role) {
    req._isAdmin = String(req.user.role).toLowerCase() === "admin";
    return req._isAdmin;
  }

  const me = await User.findByPk(req.user?.id, { attributes: ["id", "role"] });
  req._isAdmin = String(me?.role || "").toLowerCase() === "admin";
  return req._isAdmin;
};

const parseIntSafe = (v, def) => {
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : def;
};

/* =========================================================
   權限：只有上傳者 or admin 才能管理
========================================================= */
const isOwner = (file, userId) => Number(file?.uploaderId) === Number(userId);

async function ensureFolderTreeOwnedBy(folderId, meId, { transaction } = {}) {
  let queue = [Number(folderId)];
  const me = Number(meId);

  while (queue.length) {
    const children = await File.findAll({
      attributes: ["id", "uploaderId", "isFolder", "isDeleted", "parentId"],
      where: { parentId: { [Op.in]: queue } },
      paranoid: false,
      transaction,
    });

    const bad = children.find((c) => c.isDeleted || Number(c.uploaderId) !== me);
    if (bad) return false;

    queue = children.filter((c) => c.isFolder).map((c) => c.id);
  }
  return true;
}

async function ensureCanManageFile(req, res, next) {
  try {
    const id = Number(req.params.id);
    const meId = Number(req.user?.id);
    const admin = await isAdmin(req);

    const target = await File.findByPk(id, {
      attributes: ["id", "uploaderId", "isFolder", "isDeleted", "parentId", "displayName"],
      paranoid: false,
    });

    if (!target) return res.status(404).json({ success: false, message: "找不到檔案" });
    if (target.isDeleted) return res.status(410).json({ success: false, message: "檔案已刪除" });

    if (!admin && !isOwner(target, meId)) {
      return res.status(403).json({ success: false, message: "只有上傳者或管理員可以操作此檔案" });
    }

    req._permTarget = target;
    req._isAdmin = admin;
    next();
  } catch (e) {
    next(e);
  }
}

async function ensureCanDeleteNode(req, res, next) {
  try {
    const id = Number(req.params.id);
    const meId = Number(req.user?.id);
    const admin = await isAdmin(req);

    const target = await File.findByPk(id, {
      attributes: ["id", "uploaderId", "isFolder", "isDeleted"],
      paranoid: false,
    });

    if (!target) return res.status(404).json({ success: false, message: "找不到檔案" });
    if (target.isDeleted) return res.status(410).json({ success: false, message: "檔案已刪除" });

    if (!admin && !isOwner(target, meId)) {
      return res.status(403).json({ success: false, message: "只有上傳者或管理員可以刪除此檔案" });
    }

    if (!admin && target.isFolder) {
      const ok = await ensureFolderTreeOwnedBy(target.id, meId);
      if (!ok) {
        return res.status(403).json({
          success: false,
          message: "此資料夾內含非本人上傳（或已刪除）的子項目，只有管理員可以刪除整個資料夾",
        });
      }
    }

    req._permTarget = target;
    req._isAdmin = admin;
    next();
  } catch (e) {
    next(e);
  }
}

async function ensureCanManageIds(req, res, next) {
  try {
    const raw = Array.isArray(req.body?.ids) ? req.body.ids : [];
    const ids = raw.map((x) => Number(x)).filter((n) => Number.isFinite(n) && n > 0);

    if (!ids.length) return res.status(400).json({ success: false, message: "請提供 ids" });

    const meId = Number(req.user?.id);
    const admin = await isAdmin(req);

    if (admin) {
      req._allowedIds = ids;
      req._isAdmin = true;
      return next();
    }

    const rows = await File.findAll({
      attributes: ["id", "uploaderId", "isDeleted"],
      where: { id: { [Op.in]: ids } },
      paranoid: false,
    });

    const unauthorized = rows
      .filter((r) => r.isDeleted || Number(r.uploaderId) !== meId)
      .map((r) => r.id);

    if (unauthorized.length) {
      return res.status(403).json({
        success: false,
        message: "只有上傳者或管理員可以操作所選項目",
        data: { unauthorizedIds: unauthorized },
      });
    }

    req._allowedIds = rows.map((r) => r.id);
    req._isAdmin = false;
    next();
  } catch (e) {
    next(e);
  }
}

/* =========================================================
   parentId helpers
========================================================= */
function parseParentId(rawParentId) {
  if (rawParentId === undefined) return { has: false, parentId: null };
  const trimmed = String(rawParentId ?? "").trim();
  if (!trimmed) return { has: true, parentId: null };
  const pid = Number(trimmed);
  return { has: true, parentId: Number.isNaN(pid) ? null : pid };
}

async function loadParentFolder(parentId) {
  if (parentId == null) return null;
  return await File.findOne({
    where: { id: parentId, isFolder: true, isDeleted: false },
  });
}

/* =========================================================
   資料夾分類向下套用（propagate=1）
========================================================= */
async function propagateFolderCategory(folderId, category, { transaction } = {}) {
  let queue = [Number(folderId)];
  while (queue.length) {
    const children = await File.findAll({
      attributes: ["id", "isFolder"],
      where: { parentId: { [Op.in]: queue }, isDeleted: false },
      paranoid: false,
      transaction,
    });

    if (children.length) {
      await File.update(
        { category },
        { where: { parentId: { [Op.in]: queue }, isDeleted: false }, transaction }
      );
    }

    queue = children.filter((c) => c.isFolder).map((c) => c.id);
  }
}

/* =========================================================
   防止資料夾移動到自己或子孫
========================================================= */
async function hasAncestor(childId, ancestorId, { transaction } = {}) {
  let cur = Number(childId);
  const anc = Number(ancestorId);
  if (!Number.isFinite(cur) || !Number.isFinite(anc)) return false;

  while (Number.isFinite(cur) && cur > 0) {
    if (cur === anc) return true;

    const row = await File.findByPk(cur, {
      attributes: ["id", "parentId", "isDeleted"],
      paranoid: false,
      transaction,
    });

    if (!row || row.isDeleted) return false;
    cur = row.parentId ? Number(row.parentId) : NaN;
  }

  return false;
}

/* =========================================================
   📋 列表  GET /api/files
========================================================= */
router.get("/", authMiddleware, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const size = Math.max(1, parseInt(req.query.pageSize, 10) || 20);
    const kw = clean(req.query.keyword);
    const rawCat = req.query.category;
    const showDeleted = String(req.query.showDeleted || "0") === "1";
    const withStats = String(req.query.withStats || "0") === "1";
    const rawType = String(req.query.type || "").toLowerCase();

    const { has: hasParent, parentId } = parseParentId(req.query.parentId);

    const where = {};
    if (!showDeleted) where.isDeleted = false;

    const category = normalizeCategory(rawCat, "");
    if (category) where.category = category;

    if (rawType === "image") {
      where.mimeType = { [Op.like]: "image/%" };
    }

    if (hasParent) where.parentId = parentId;

    if (kw) {
      where[Op.or] = [
        { displayName: { [Op.like]: `%${kw}%` } },
        { originalName: { [Op.like]: `%${kw}%` } },
      ];
    }

    const { count, rows } = await File.findAndCountAll({
      where,
      include: [
        {
          model: User,
          as: "uploader",
          attributes: ["id", "username", "name"],
        },
      ],
      limit: size,
      offset: (page - 1) * size,
      order: [
        ["isFolder", "DESC"],
        ["createdAt", "DESC"],
      ],
      paranoid: false,
      distinct: true,
    });

    const admin = await isAdmin(req);
    const meId = Number(req.user?.id);

    const serializedRows = rows.map((r) =>
      serializeFile(r, {
        canManage: admin || Number(r.uploaderId) === meId,
      })
    );

    const payload = {
      success: true,
      data: { rows: serializedRows, count, page, pageSize: size },
    };

    if (withStats) {
      const rowsStats = await File.findAll({
        attributes: ["category", [fn("COUNT", col("id")), "cnt"]],
        where: { isDeleted: false },
        group: ["category"],
        raw: true,
      });

      const byCategory = {};
      for (const r of rowsStats) {
        const catKey = r.category || "general";
        byCategory[catKey] = Number(r.cnt) || 0;
      }

      const trash = await File.count({ where: { isDeleted: true } });
      const total = await File.count({ where: { isDeleted: false } });

      payload.stats = { byCategory, total, trash };
    }

    res.json(payload);
  } catch (err) {
    console.error("❌ 列出檔案失敗:", err);
    res.status(500).json({ success: false, message: "伺服器錯誤" });
  }
});

/* =========================================================
   📁 新增資料夾  POST /api/files/folders
========================================================= */
router.post("/folders", authMiddleware, async (req, res) => {
  const t = await File.sequelize.transaction();
  try {
    const name = clampStr(req.body?.name, 120);
    if (!name) {
      await t.rollback();
      return res.status(400).json({ success: false, message: "資料夾名稱不可為空" });
    }

    const { has: hasParent, parentId } = parseParentId(req.body?.parentId);
    let parent = null;

    if (hasParent && parentId != null) {
      parent = await loadParentFolder(parentId);
      if (!parent) {
        await t.rollback();
        return res.status(404).json({ success: false, message: "父層資料夾不存在或已刪除" });
      }
    }

    const category = normalizeCategory(req.body?.category ?? parent?.category ?? "general", "general");

    const existed = await File.findOne({
      where: { parentId: parentId ?? null, isFolder: true, isDeleted: false, displayName: name },
      transaction: t,
    });
    if (existed) {
      await t.rollback();
      return res.status(409).json({ success: false, message: "同一層已存在相同名稱的資料夾" });
    }

    const folder = await File.create(
      {
        originalName: name,
        displayName: name,
        storedName: genFolderStoredName(),
        ext: "",
        mimeType: "inode/directory",
        size: 0,
        path: "",
        uploaderId: req.user.id,
        category,
        isDeleted: false,
        isFolder: true,
        parentId: hasParent ? parentId : null,
      },
      { transaction: t }
    );

    await t.commit();

    const admin = await isAdmin(req);

    const freshFolder = await File.findByPk(folder.id, {
      include: [{ model: User, as: "uploader", attributes: ["id", "username", "name"] }],
    });

    logAction(req.user.id, "file:folder:create", "files", {
      recordId: folder.id,
      meta: { name: folder.displayName, parentId: folder.parentId, category: folder.category, ip: getClientIp(req) },
    }).catch(() => {});

    res.status(201).json({
      success: true,
      message: "資料夾已建立",
      data: serializeFile(freshFolder || folder, {
        canManage: admin || Number(folder.uploaderId) === Number(req.user.id),
      }),
    });
  } catch (err) {
    await t.rollback();
    console.error("❌ 建立資料夾失敗:", err);

    if (err?.name === "SequelizeUniqueConstraintError" && err?.fields?.storedName) {
      return res.status(500).json({
        success: false,
        message: "系統內部檔名衝突，請再試一次（storedName unique）",
      });
    }

    res.status(500).json({ success: false, message: "伺服器錯誤" });
  }
});

/* =========================================================
   📁 取得資料夾清單（給「移到資料夾」用）
   GET /api/files/folders/list
========================================================= */
router.get("/folders/list", authMiddleware, async (req, res) => {
  try {
    const admin = await isAdmin(req);
    const meId = Number(req.user?.id);

    const where = { isFolder: true, isDeleted: false };
    if (!admin) where.uploaderId = meId;

    const rows = await File.findAll({
      attributes: ["id", "displayName", "originalName", "parentId", "category", "uploaderId", "createdAt"],
      where,
      order: [
        ["parentId", "ASC"],
        ["displayName", "ASC"],
        ["createdAt", "ASC"],
      ],
      paranoid: false,
      raw: true,
    });

    const serialized = rows.map((row) =>
      serializeFolderListRow(row, {
        canManage: admin || Number(row.uploaderId) === meId,
      })
    );

    res.json({ success: true, data: serialized });
  } catch (err) {
    console.error("❌ folders/list failed:", err);
    res.status(500).json({ success: false, message: "伺服器錯誤" });
  }
});

/* =========================================================
   🆙 上傳（單檔） POST /api/files/upload-one
========================================================= */
router.post("/upload-one", authMiddleware, (req, res) => {
  uploadOne(req, res, async (err) => {
    if (err) {
      console.error("❌ 上傳錯誤(upload-one):", err);
      let message = err?.message || "上傳失敗";
      if (err.code === "LIMIT_FILE_SIZE") message = `單一檔案大小不可超過 ${MAX_FILE_SIZE_MB} MB`;
      return res.status(400).json({ success: false, message });
    }

    const t = await File.sequelize.transaction();
    try {
      const f = req.file;
      if (!f) {
        await t.rollback();
        return res.status(400).json({ success: false, message: "沒有檔案" });
      }

      const { has: hasParent, parentId } = parseParentId(req.body?.parentId);
      let parent = null;

      if (hasParent && parentId != null) {
        parent = await loadParentFolder(parentId);
        if (!parent) {
          await t.rollback();
          safeUnlinkInRoot(f.path);
          return res.status(404).json({ success: false, message: "指定的資料夾不存在或已刪除" });
        }
      }

      const category = normalizeCategory(req.body?.category ?? parent?.category ?? "general", "general");

      const ext = path.extname(f.originalname || "").replace(/^\./, "");
      const rec = await File.create(
        {
          originalName: f.originalname,
          displayName: clampStr(f.originalname, 200) || "file",
          storedName: f.filename,
          ext,
          mimeType: f.mimetype,
          size: f.size,
          path: path.resolve(f.path),
          uploaderId: req.user.id,
          category,
          isDeleted: false,
          isFolder: false,
          parentId: hasParent ? parentId : null,
        },
        { transaction: t }
      );

      await t.commit();

      const fresh = await File.findByPk(rec.id, {
        include: [{ model: User, as: "uploader", attributes: ["id", "username", "name"] }],
      });

      logAction(req.user.id, "file:upload", "files", {
        recordId: rec.id,
        meta: { name: rec.displayName, category: rec.category, size: rec.size, mimeType: rec.mimeType, ip: getClientIp(req) },
      }).catch(() => {});

      res.status(201).json({
        success: true,
        message: "上傳完成",
        data: serializeFile(fresh || rec, { canManage: true }),
      });
    } catch (e) {
      await t.rollback();
      console.error("❌ 上傳失敗(upload-one):", e);
      if (req.file?.path) safeUnlinkInRoot(req.file.path);
      res.status(500).json({ success: false, message: "伺服器錯誤" });
    }
  });
});

/* =========================================================
   🆙 上傳（多檔） POST /api/files/upload
========================================================= */
router.post("/upload", authMiddleware, (req, res) => {
  uploadAny(req, res, async (err) => {
    if (err) {
      console.error("❌ 上傳錯誤:", err);
      let message = err?.message || "上傳失敗";
      if (err.code === "LIMIT_FILE_SIZE") message = `單一檔案大小不可超過 ${MAX_FILE_SIZE_MB} MB`;
      else if (err.code === "LIMIT_FILE_COUNT") message = "一次最多上傳 10 個檔案";
      return res.status(400).json({ success: false, message });
    }

    const files = Array.isArray(req.files) ? req.files : [];
    if (!files.length) return res.status(400).json({ success: false, message: "沒有檔案" });

    const t = await File.sequelize.transaction();
    try {
      const { has: hasParent, parentId } = parseParentId(req.body?.parentId);
      let parent = null;

      if (hasParent && parentId != null) {
        parent = await loadParentFolder(parentId);
        if (!parent) {
          await t.rollback();
          for (const f of files) safeUnlinkInRoot(f.path);
          return res.status(404).json({ success: false, message: "指定的資料夾不存在或已刪除" });
        }
      }

      const category = normalizeCategory(req.body?.category ?? parent?.category ?? "general", "general");

      const created = [];
      for (const f of files) {
        const ext = path.extname(f.originalname || "").replace(/^\./, "");
        const rec = await File.create(
          {
            originalName: f.originalname,
            displayName: clampStr(f.originalname, 200) || "file",
            storedName: f.filename,
            ext,
            mimeType: f.mimetype,
            size: f.size,
            path: path.resolve(f.path),
            uploaderId: req.user.id,
            category,
            isDeleted: false,
            isFolder: false,
            parentId: hasParent ? parentId : null,
          },
          { transaction: t }
        );
        created.push(rec);
      }

      await t.commit();

      const admin = await isAdmin(req);
      const meId = Number(req.user?.id);

      const freshRows = await File.findAll({
        where: { id: { [Op.in]: created.map((x) => x.id) } },
        include: [{ model: User, as: "uploader", attributes: ["id", "username", "name"] }],
        order: [["createdAt", "ASC"]],
      });

      const serialized = freshRows.map((r) =>
        serializeFile(r, {
          canManage: admin || Number(r.uploaderId) === meId,
        })
      );

      logAction(req.user.id, "file:upload:multi", "files", {
        meta: { count: created.length, category, parentId: hasParent ? parentId : null, ip: getClientIp(req) },
      }).catch(() => {});

      res.status(201).json({
        success: true,
        message: "上傳完成",
        data: serialized,
      });
    } catch (e) {
      await t.rollback();
      console.error("❌ 上傳失敗:", e);
      for (const f of files) safeUnlinkInRoot(f.path);
      res.status(500).json({ success: false, message: "伺服器錯誤" });
    }
  });
});

/* =========================================================
   📄 單筆檔案  GET /api/files/:id
========================================================= */
router.get("/:id", authMiddleware, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id) || id <= 0) {
      return res.status(400).json({ success: false, message: "無效的檔案 ID" });
    }

    const row = await File.findByPk(id, {
      attributes: [
        "id",
        "displayName",
        "originalName",
        "storedName",
        "ext",
        "mimeType",
        "size",
        "category",
        "isFolder",
        "isDeleted",
        "parentId",
        "uploaderId",
        "createdAt",
        "updatedAt",
      ],
      include: [
        {
          model: User,
          as: "uploader",
          attributes: ["id", "username", "name"],
        },
      ],
      paranoid: false,
    });

    if (!row) return res.status(404).json({ success: false, message: "找不到檔案" });
    if (row.isDeleted) return res.status(410).json({ success: false, message: "檔案已刪除" });

    const admin = await isAdmin(req);
    const meId = Number(req.user?.id);

    return res.json({
      success: true,
      data: serializeFile(row, {
        canManage: admin || Number(row.uploaderId) === meId,
      }),
    });
  } catch (err) {
    console.error("❌ 取得單筆檔案失敗:", err);
    return res.status(500).json({ success: false, message: "伺服器錯誤" });
  }
});

/* =========================================================
   ⬇️ 下載  GET /api/files/:id/download
========================================================= */
router.get("/:id/download", authMiddleware, async (req, res) => {
  try {
    const file = await File.scope("withPath").findByPk(req.params.id);
    if (!file) return res.status(404).json({ success: false, message: "找不到檔案" });
    if (file.isDeleted) return res.status(410).json({ success: false, message: "檔案已刪除" });
    if (file.isFolder) return res.status(400).json({ success: false, message: "此項目為資料夾，無法下載" });
    if (!fs.existsSync(file.path)) return res.status(410).json({ success: false, message: "檔案已不存在" });

    const filename = file.displayName || file.originalName || "download";
    const contentType = String(file.mimeType || "application/octet-stream").trim();

    res.setHeader("Content-Type", contentType);
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Cache-Control", "private, no-store");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${encodeURIComponent(filename)}"; filename*=UTF-8''${encodeURIComponent(filename)}`
    );

    logAction(req.user?.id || null, "file:download", "files", {
      recordId: file.id,
      meta: {
        name: file.displayName || file.originalName,
        mimeType: file.mimeType || "",
        ip: getClientIp(req),
      },
    }).catch(() => {});

    return res.sendFile(path.resolve(file.path));
  } catch (err) {
    console.error("❌ 下載失敗:", err);
    return res.status(500).json({ success: false, message: "伺服器錯誤" });
  }
});

/* =========================================================
   🖼 圖片 inline 預覽
========================================================= */
router.get("/:id/preview", authMiddleware, async (req, res) => {
  try {
    const file = await File.scope("withPath").findByPk(req.params.id);
    if (!file) return res.status(404).json({ success: false, message: "找不到檔案" });
    if (file.isDeleted) return res.status(410).json({ success: false, message: "檔案已刪除" });
    if (file.isFolder) return res.status(400).json({ success: false, message: "此項目為資料夾，無法預覽" });
    if (!fs.existsSync(file.path)) return res.status(410).json({ success: false, message: "檔案已不存在" });

    const mimeType = String(file.mimeType || "").trim().toLowerCase();
    if (!mimeType.startsWith("image/")) {
      return res.status(400).json({ success: false, message: "此檔案不是圖片，無法預覽" });
    }

    res.setHeader("Content-Type", file.mimeType || "application/octet-stream");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Cache-Control", "private, no-store");
    res.setHeader("Content-Disposition", "inline");

    logAction(req.user?.id || null, "file:preview", "files", {
      recordId: file.id,
      meta: {
        name: file.displayName || file.originalName,
        mimeType: file.mimeType || "",
        ip: getClientIp(req),
      },
    }).catch(() => {});

    return res.sendFile(path.resolve(file.path));
  } catch (err) {
    console.error("❌ 圖片預覽失敗:", err);
    return res.status(500).json({ success: false, message: "伺服器錯誤" });
  }
});

/* =========================================================
   ✏️ 更新（改名 / 改分類 / 替換檔案內容）
========================================================= */
router.put("/:id", authMiddleware, ensureCanManageFile, (req, res) => {
  replaceUpload(req, res, async (err) => {
    if (err) {
      console.error("❌ 替換上傳錯誤:", err);
      let message = err?.message || "上傳錯誤";
      if (err.code === "LIMIT_FILE_SIZE") message = `單一檔案大小不可超過 ${MAX_FILE_SIZE_MB} MB`;
      return res.status(400).json({ success: false, message });
    }

    const t = await File.sequelize.transaction();
    try {
      const f = await File.scope("withPath").findByPk(req.params.id, {
        paranoid: false,
        transaction: t,
        lock: t.LOCK.UPDATE,
      });
      if (!f) {
        await t.rollback();
        if (req.file?.path) safeUnlinkInRoot(req.file.path);
        return res.status(404).json({ success: false, message: "找不到檔案" });
      }
      if (f.isDeleted) {
        await t.rollback();
        if (req.file?.path) safeUnlinkInRoot(req.file.path);
        return res.status(410).json({ success: false, message: "檔案已刪除" });
      }

      const isFolder = !!f.isFolder;
      const payload = {};

      if (typeof req.body.displayName === "string") {
        const dn = clampStr(req.body.displayName, 200);
        if (!dn) {
          await t.rollback();
          if (req.file?.path) safeUnlinkInRoot(req.file.path);
          return res.status(400).json({ success: false, message: "displayName 不可為空" });
        }
        payload.displayName = dn;
      }

      if (typeof req.body.category === "string") {
        payload.category = normalizeCategory(req.body.category, "general");
      }

      if (isFolder) {
        if (req.file) {
          await t.rollback();
          safeUnlinkInRoot(req.file.path);
          return res.status(400).json({
            success: false,
            message: "資料夾不支援替換內容，只能重新命名和調整分類",
          });
        }

        if (payload.displayName && payload.displayName !== f.displayName) {
          const existed = await File.findOne({
            where: {
              parentId: f.parentId ?? null,
              isFolder: true,
              isDeleted: false,
              displayName: payload.displayName,
            },
            transaction: t,
          });
          if (existed) {
            await t.rollback();
            return res.status(409).json({ success: false, message: "同一層已存在相同名稱的資料夾" });
          }
        }

        await f.update(payload, { transaction: t });

        const propagate = String(req.query?.propagate || "0") === "1";
        if (payload.category && propagate) {
          await propagateFolderCategory(f.id, payload.category, { transaction: t });
        }

        await t.commit();

        const withUser = await File.findByPk(f.id, {
          include: [{ model: User, as: "uploader", attributes: ["id", "username", "name"] }],
        });

        const admin = await isAdmin(req);
        const meId = Number(req.user?.id);

        logAction(req.user?.id || null, "file:folder:update", "files", {
          recordId: f.id,
          meta: { displayName: payload.displayName, category: payload.category, propagate, ip: getClientIp(req) },
        }).catch(() => {});

        return res.json({
          success: true,
          message: "已更新資料夾",
          data: serializeFile(withUser || f, {
            canManage: admin || Number((withUser || f).uploaderId) === meId,
          }),
        });
      }

      const oldPath = f.path;

      if (req.file) {
        payload.storedName = req.file.filename;
        payload.originalName = req.file.originalname;
        payload.displayName = payload.displayName || clampStr(req.file.originalname, 200) || "file";
        payload.ext = path.extname(req.file.originalname || "").replace(/^\./, "");
        payload.mimeType = req.file.mimetype;
        payload.size = req.file.size;
        payload.path = path.resolve(req.file.path);
      }

      await f.update(payload, { transaction: t });
      await t.commit();

      if (req.file && oldPath) safeUnlinkInRoot(oldPath);

      const withUser = await File.findByPk(f.id, {
        include: [{ model: User, as: "uploader", attributes: ["id", "username", "name"] }],
      });

      const admin = await isAdmin(req);
      const meId = Number(req.user?.id);

      logAction(req.user?.id || null, req.file ? "file:replace" : "file:update", "files", {
        recordId: f.id,
        meta: { displayName: payload.displayName, category: payload.category, ip: getClientIp(req) },
      }).catch(() => {});

      return res.json({
        success: true,
        message: "已更新",
        data: serializeFile(withUser || f, {
          canManage: admin || Number((withUser || f).uploaderId) === meId,
        }),
      });
    } catch (e) {
      await t.rollback();
      console.error("❌ 更新檔案失敗:", e);
      if (req.file?.path) safeUnlinkInRoot(req.file.path);
      return res.status(500).json({ success: false, message: "伺服器錯誤" });
    }
  });
});

/* =========================================================
   🗑️ 刪除（永遠硬刪：本機 + DB；資料夾遞迴）
========================================================= */
router.delete("/:id", authMiddleware, ensureCanDeleteNode, async (req, res) => {
  const t = await File.sequelize.transaction();
  try {
    const f = await File.scope("withPath").findByPk(req.params.id, {
      paranoid: false,
      transaction: t,
    });
    if (!f) {
      await t.rollback();
      return res.status(404).json({ success: false, message: "找不到檔案" });
    }

    await hardDeleteNode(f, { transaction: t });
    await t.commit();

    logAction(req.user?.id || null, "file:delete:hard", "files", {
      recordId: Number(req.params.id),
      meta: { ip: getClientIp(req) },
    }).catch(() => {});

    res.json({ success: true, message: "已永久刪除（本機 + 資料庫）" });
  } catch (err) {
    await t.rollback();
    console.error("❌ 刪除檔案失敗:", err);
    res.status(500).json({ success: false, message: "伺服器錯誤" });
  }
});

/* =========================================================
   🧹 批次刪除（永遠硬刪：本機 + DB；資料夾遞迴）
========================================================= */
router.post("/bulk-delete", authMiddleware, ensureCanManageIds, async (req, res) => {
  const ids = req._allowedIds;
  const admin = !!req._isAdmin;
  const meId = Number(req.user?.id);

  const t = await File.sequelize.transaction();
  try {
    let n = 0;

    for (const id of ids) {
      const f = await File.scope("withPath").findByPk(id, { paranoid: false, transaction: t });
      if (!f) continue;

      if (!admin && f.isFolder) {
        const ok = await ensureFolderTreeOwnedBy(f.id, meId, { transaction: t });
        if (!ok) {
          await t.rollback();
          return res.status(403).json({
            success: false,
            message: "選取的資料夾內含非本人上傳（或已刪除）的子項目，只有管理員可以批次刪除資料夾",
            data: { folderId: f.id },
          });
        }
      }

      await hardDeleteNode(f, { transaction: t });
      n++;
    }

    await t.commit();

    logAction(req.user?.id || null, "file:bulk-delete:hard", "files", {
      meta: { count: n, ids, ip: getClientIp(req) },
    }).catch(() => {});

    res.json({ success: true, message: `已永久刪除 ${n} 筆（本機 + 資料庫）` });
  } catch (err) {
    await t.rollback();
    console.error("❌ 批次刪除失敗:", err);
    res.status(500).json({ success: false, message: "伺服器錯誤" });
  }
});

/* =========================================================
   📦 批次移動分類
========================================================= */
router.post("/bulk-move", authMiddleware, ensureCanManageIds, async (req, res) => {
  try {
    const ids = req._allowedIds;
    const category = normalizeCategory(req.body?.category, "");
    if (!ids.length || !category) {
      return res.status(400).json({ success: false, message: "請提供 ids 與 category" });
    }
    const [affected] = await File.update({ category }, { where: { id: { [Op.in]: ids } } });

    logAction(req.user?.id || null, "file:bulk-move-category", "files", {
      meta: { affected, category, ids, ip: getClientIp(req) },
    }).catch(() => {});

    res.json({ success: true, message: `已移動 ${affected} 筆到分類「${category}」` });
  } catch (err) {
    console.error("❌ 批次移動分類失敗:", err);
    res.status(500).json({ success: false, message: "伺服器錯誤" });
  }
});

/* =========================================================
   📂 批次移動到資料夾（更新 parentId）
========================================================= */
router.post("/bulk-move-folder", authMiddleware, ensureCanManageIds, async (req, res) => {
  const ids = req._allowedIds;
  const admin = !!req._isAdmin;
  const meId = Number(req.user?.id);

  const rawTarget = req.body?.targetParentId;
  const targetParentId =
    rawTarget === null ||
    rawTarget === undefined ||
    String(rawTarget).trim() === "" ||
    Number(rawTarget) === 0
      ? null
      : Number(rawTarget);

  const t = await File.sequelize.transaction();
  try {
    let destFolder = null;

    if (targetParentId != null) {
      destFolder = await File.findByPk(targetParentId, {
        attributes: ["id", "uploaderId", "isFolder", "isDeleted", "parentId", "displayName"],
        paranoid: false,
        transaction: t,
        lock: t.LOCK.UPDATE,
      });

      if (!destFolder) {
        await t.rollback();
        return res.status(404).json({ success: false, message: "目標資料夾不存在" });
      }
      if (destFolder.isDeleted) {
        await t.rollback();
        return res.status(410).json({ success: false, message: "目標資料夾已刪除" });
      }
      if (!destFolder.isFolder) {
        await t.rollback();
        return res.status(400).json({ success: false, message: "目標不是資料夾" });
      }

      if (!admin && Number(destFolder.uploaderId) !== meId) {
        await t.rollback();
        return res.status(403).json({ success: false, message: "只能移動到自己建立的資料夾" });
      }
    }

    const moving = await File.findAll({
      attributes: ["id", "isFolder", "parentId", "uploaderId"],
      where: { id: { [Op.in]: ids } },
      paranoid: false,
      transaction: t,
      lock: t.LOCK.UPDATE,
    });

    if (!admin) {
      const folderIds = moving.filter((x) => x.isFolder).map((x) => x.id);
      for (const fid of folderIds) {
        const ok = await ensureFolderTreeOwnedBy(fid, meId, { transaction: t });
        if (!ok) {
          await t.rollback();
          return res.status(403).json({
            success: false,
            message: "選取的資料夾內含非本人上傳（或已刪除）的子項目，只有管理員可以移動此資料夾",
            data: { folderId: fid },
          });
        }
      }
    }

    if (targetParentId != null) {
      const movingFolders = moving.filter((x) => x.isFolder).map((x) => x.id);
      for (const fid of movingFolders) {
        if (Number(fid) === Number(targetParentId)) {
          await t.rollback();
          return res.status(400).json({ success: false, message: "不能把資料夾移動到自己裡面" });
        }

        const bad = await hasAncestor(targetParentId, fid, { transaction: t });
        if (bad) {
          await t.rollback();
          return res.status(400).json({ success: false, message: "不能把資料夾移動到自己的子資料夾內" });
        }
      }
    }

    const [affected] = await File.update(
      { parentId: targetParentId },
      { where: { id: { [Op.in]: ids } }, transaction: t }
    );

    await t.commit();

    logAction(req.user?.id || null, "file:bulk-move-folder", "files", {
      meta: { affected, ids, targetParentId, ip: getClientIp(req) },
    }).catch(() => {});

    res.json({
      success: true,
      message: `已移動 ${affected} 筆到「${destFolder ? destFolder.displayName : "根目錄"}」`,
      data: { affected },
    });
  } catch (err) {
    await t.rollback();
    console.error("❌ bulk-move-folder failed:", err);
    res.status(500).json({ success: false, message: "伺服器錯誤" });
  }
});

/* =========================================================
   🧰 維護 / 定期清理
========================================================= */
router.post("/maintenance/purge-legacy-deleted", authMiddleware, async (req, res) => {
  if (!(await isAdmin(req))) {
    return res.status(403).json({ success: false, message: "權限不足" });
  }

  const days = parseIntSafe(req.body?.days, 0);
  const cutoff = days > 0 ? new Date(Date.now() - days * 24 * 60 * 60 * 1000) : null;

  const t = await File.sequelize.transaction();
  try {
    const where = { isDeleted: true };
    if (cutoff) where.updatedAt = { [Op.lte]: cutoff };

    const rows = await File.scope("withPath").findAll({
      where,
      paranoid: false,
      transaction: t,
    });

    if (!rows.length) {
      await t.commit();
      return res.json({
        success: true,
        message: "沒有需要清理的歷史 isDeleted=true 資料",
        data: { deletedRoots: 0, cutoff },
      });
    }

    const set = new Set(rows.map((x) => x.id));
    const roots = rows.filter((x) => !x.parentId || !set.has(x.parentId));

    let deletedRoots = 0;
    for (const r of roots) {
      await hardDeleteNode(r, { transaction: t });
      deletedRoots++;
    }

    await t.commit();

    logAction(req.user?.id || null, "file:maintenance:purge-legacy-deleted", "files", {
      meta: { deletedRoots, days, cutoff, ip: getClientIp(req) },
    }).catch(() => {});

    res.json({
      success: true,
      message: "已清理歷史 isDeleted=true（本機 + 資料庫）",
      data: { deletedRoots, cutoff },
    });
  } catch (err) {
    await t.rollback();
    console.error("❌ purge-legacy-deleted failed:", err);
    res.status(500).json({ success: false, message: "伺服器錯誤" });
  }
});

router.post("/maintenance/purge-orphan-disk", authMiddleware, async (req, res) => {
  if (!(await isAdmin(req))) {
    return res.status(403).json({ success: false, message: "權限不足" });
  }

  const days = parseIntSafe(req.body?.days, 7);
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  try {
    const rows = await File.findAll({
      attributes: ["storedName"],
      where: { isFolder: false },
      paranoid: false,
      raw: true,
    });
    const keep = new Set(rows.map((r) => r.storedName).filter(Boolean));

    const names = fs
      .readdirSync(ROOT, { withFileTypes: true })
      .filter((d) => d.isFile())
      .map((d) => d.name);

    let deleted = 0;
    let skipped = 0;

    for (const name of names) {
      if (keep.has(name)) {
        skipped++;
        continue;
      }

      const full = path.join(ROOT, name);
      const st = fs.statSync(full);

      if (st.mtime <= cutoff) {
        safeUnlinkInRoot(full);
        deleted++;
      } else {
        skipped++;
      }
    }

    logAction(req.user?.id || null, "file:maintenance:purge-orphan-disk", "files", {
      meta: { deleted, skipped, cutoff, days, ip: getClientIp(req) },
    }).catch(() => {});

    res.json({
      success: true,
      message: "磁碟孤兒檔案清理完成",
      data: { deleted, skipped, cutoff, days },
    });
  } catch (err) {
    console.error("❌ purge-orphan-disk failed:", err);
    res.status(500).json({ success: false, message: "伺服器錯誤" });
  }
});

export default router;