// backend/src/routes/safety-reports.js
import express from "express";
import { Op } from "sequelize";
import authMiddleware from "../middleware/authMiddleware.js";
import requireAdmin from "../middleware/requireAdmin.js";
import { SafetyReport } from "../models/index.js";

const router = express.Router();

/* ---------------- helpers ---------------- */
const clean = (s) => String(s ?? "").trim();

const toNullIfEmpty = (v) => {
  const s = clean(v);
  return s ? s : null;
};

const SAFETY_REPORT_STATUS_VALUES = [
  "spec_communication",
  "lab_quotation",
  "quotation_approval",
  "docs_to_lab",
  "purchase_request",
  "pickup_and_install_os",
  "send_to_lab",
  "lab_testing",
  "draft_report_review",
  "machine_returned",
  "final_report_uploaded",
  "waiting_invoice",
  "reimbursement",
  "paused",
  "completed",
];

const STATUS_SET = new Set(SAFETY_REPORT_STATUS_VALUES);

function hasAttr(key) {
  return !!SafetyReport?.rawAttributes?.[key];
}

function normalizeStatus(val) {
  const raw = clean(val);
  if (!raw) return "spec_communication";

  // 新中文流程
  if (raw === "需求單位規格溝通") return "spec_communication";
  if (raw === "找實驗室詢價") return "lab_quotation";
  if (raw === "會簽報價單") return "quotation_approval";
  if (raw === "整理文件資料給實驗室") return "docs_to_lab";
  if (raw === "打請購單") return "purchase_request";
  if (raw === "領機器並安裝OS") return "pickup_and_install_os";
  if (raw === "機器送出給實驗室") return "send_to_lab";
  if (raw === "實驗室測試中") return "lab_testing";
  if (raw === "實驗室測試完畢產出草稿報告確認") return "draft_report_review";
  if (raw === "機器送回") return "machine_returned";
  if (raw === "正式報告上傳") return "final_report_uploaded";
  if (raw === "等發票") return "waiting_invoice";
  if (raw === "報帳") return "reimbursement";
  if (raw === "暫停") return "paused";
  if (raw === "完成" || raw === "已完成") return "completed";

  // 舊中文 / 舊資料
  if (raw === "開案中" || raw === "申請中") return "spec_communication";
  if (raw === "有效") return "completed";
  if (raw === "已失效") return "paused";

  const s = raw.toLowerCase();

  // 舊英文
  if (s === "ongoing" || s === "pending") return "spec_communication";
  if (s === "valid") return "completed";
  if (s === "expired") return "paused";

  // 新英文 key
  if (STATUS_SET.has(s)) return s;

  return "spec_communication";
}

function uniqStrings(arr = []) {
  const out = [];
  const seen = new Set();

  for (const item of arr) {
    const s = clean(item);
    if (!s || seen.has(s)) continue;
    seen.add(s);
    out.push(s);
  }

  return out;
}

function parseMaybeJsonArray(value) {
  if (value == null || value === "") return [];
  if (Array.isArray(value)) return value;

  const raw = clean(value);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [parsed];
  } catch {
    return [raw];
  }
}

function extractFileIdFromPath(path) {
  const raw = clean(path);
  if (!raw) return null;
  const m = raw.match(/(?:^|\/)files\/(\d+)\/download/i);
  if (!m) return null;
  const n = Number(m[1]);
  return Number.isFinite(n) ? n : null;
}

function normalizeFilePathFromId(id) {
  const s = clean(id);
  if (!s) return "";
  if (/^\d+$/.test(s)) return `files/${s}/download`;
  return s;
}

/** 相容舊前端：如果送 fileId，就轉成單一 filePath */
function normalizeSingleFilePath(body = {}) {
  if (body?.filePath != null) return toNullIfEmpty(body.filePath);

  const fid = body?.fileId ?? null;
  if (fid == null || fid === "") return null;

  return normalizeFilePathFromId(fid);
}

/**
 * 多檔附件正規化
 * 支援：
 * - filePaths: string[] | JSON string
 * - fileIds: number[] | JSON string
 * - files: [{ path | filePath | url | downloadUrl, id, name }]
 * - attachments: [{ path | filePath | url | downloadUrl }]
 * - 舊欄位 filePath / fileId
 */
function normalizeFilePathList(body = {}) {
  const fromFilePaths = parseMaybeJsonArray(body.filePaths).map((item) => {
    if (item == null) return "";
    if (typeof item === "object") {
      return item.filePath ?? item.path ?? item.url ?? item.downloadUrl ?? "";
    }
    return item;
  });

  const fromFileIds = parseMaybeJsonArray(body.fileIds).map((item) => {
    if (item == null) return "";
    if (typeof item === "object") {
      return normalizeFilePathFromId(item.id ?? item.fileId ?? "");
    }
    return normalizeFilePathFromId(item);
  });

  const fromFiles = parseMaybeJsonArray(body.files).map((item) => {
    if (item == null) return "";
    if (typeof item === "object") {
      if (item.filePath || item.path || item.url || item.downloadUrl) {
        return item.filePath ?? item.path ?? item.url ?? item.downloadUrl ?? "";
      }
      if (item.id != null || item.fileId != null) {
        return normalizeFilePathFromId(item.id ?? item.fileId);
      }
    }
    return item;
  });

  const fromAttachments = parseMaybeJsonArray(body.attachments).map((item) => {
    if (item == null) return "";
    if (typeof item === "object") {
      if (item.filePath || item.path || item.url || item.downloadUrl) {
        return item.filePath ?? item.path ?? item.url ?? item.downloadUrl ?? "";
      }
      if (item.id != null || item.fileId != null) {
        return normalizeFilePathFromId(item.id ?? item.fileId);
      }
    }
    return item;
  });

  const legacySingle = normalizeSingleFilePath(body);

  return uniqStrings([
    ...fromFilePaths,
    ...fromFileIds,
    ...fromFiles,
    ...fromAttachments,
    ...(legacySingle ? [legacySingle] : []),
  ]);
}

function hasAnyFilePayload(body = {}) {
  return (
    Object.prototype.hasOwnProperty.call(body, "filePath") ||
    Object.prototype.hasOwnProperty.call(body, "fileId") ||
    Object.prototype.hasOwnProperty.call(body, "filePaths") ||
    Object.prototype.hasOwnProperty.call(body, "fileIds") ||
    Object.prototype.hasOwnProperty.call(body, "files") ||
    Object.prototype.hasOwnProperty.call(body, "attachments")
  );
}

/** 相容新前端：groupName 視為 modelFamily */
function normalizeModelFamily(body = {}) {
  return clean(body?.modelFamily || body?.groupName);
}

function getRowFilePaths(plain = {}) {
  const list = [];

  if (Array.isArray(plain.filePaths)) {
    list.push(...plain.filePaths);
  } else if (plain.filePaths != null && typeof plain.filePaths === "string") {
    try {
      const parsed = JSON.parse(plain.filePaths);
      if (Array.isArray(parsed)) list.push(...parsed);
      else if (clean(plain.filePaths)) list.push(plain.filePaths);
    } catch {
      if (clean(plain.filePaths)) list.push(plain.filePaths);
    }
  }

  if (plain.filePath) {
    list.push(plain.filePath);
  }

  return uniqStrings(list);
}

/** 統一回前端可直接吃的欄位 */
function toClientRow(row) {
  const plain = typeof row?.get === "function" ? row.get({ plain: true }) : row;
  const filePaths = getRowFilePaths(plain);
  const fileIds = filePaths.map(extractFileIdFromPath).filter(Boolean);

  return {
    ...plain,
    groupName: plain.modelFamily ?? "",
    modelFamily: plain.modelFamily ?? "",
    filePath: filePaths[0] ?? null,
    fileId: fileIds[0] ?? null,
    filePaths,
    fileIds,
    files: filePaths.map((path, idx) => ({
      id: fileIds[idx] ?? extractFileIdFromPath(path) ?? null,
      path,
      filePath: path,
      name: clean(path.split("?")[0].split("/").pop()) || `file-${idx + 1}`,
    })),
  };
}

/* =========================================================
   GET /api/safety-reports?kw=&modelFamily=&certType=
========================================================= */
router.get("/", authMiddleware, async (req, res) => {
  try {
    const { kw = "", modelFamily = "", certType = "" } = req.query;
    const where = {};

    if (clean(modelFamily)) where.modelFamily = clean(modelFamily);
    if (clean(certType)) where.certType = clean(certType);

    const keyword = clean(kw);
    if (keyword) {
      where[Op.or] = [
        { modelFamily: { [Op.like]: `%${keyword}%` } },
        { modelName: { [Op.like]: `%${keyword}%` } },
        { modelCode: { [Op.like]: `%${keyword}%` } },
        { certType: { [Op.like]: `%${keyword}%` } },
        { standard: { [Op.like]: `%${keyword}%` } },
        { lab: { [Op.like]: `%${keyword}%` } },
        { status: { [Op.like]: `%${keyword}%` } },
        { remark: { [Op.like]: `%${keyword}%` } },
      ];
    }

    const rows = await SafetyReport.findAll({
      where,
      order: [
        ["modelFamily", "ASC"],
        ["issueDate", "DESC"],
        ["modelName", "ASC"],
        ["certType", "ASC"],
      ],
    });

    res.json({
      updatedAt: new Date().toISOString().slice(0, 19).replace("T", " "),
      rows: rows.map(toClientRow),
    });
  } catch (err) {
    console.error("取得安規報告失敗:", err);
    res.status(500).json({ success: false, message: "取得安規報告失敗" });
  }
});

/* =========================================================
   POST /api/safety-reports  （admin only）
========================================================= */
router.post("/", authMiddleware, requireAdmin, async (req, res) => {
  try {
    const filePaths = normalizeFilePathList(req.body);

    const payload = {
      modelFamily: normalizeModelFamily(req.body),
      modelName: toNullIfEmpty(req.body.modelName),
      modelCode: toNullIfEmpty(req.body.modelCode),
      certType: clean(req.body.certType),
      standard: toNullIfEmpty(req.body.standard),
      lab: toNullIfEmpty(req.body.lab),
      issueDate: req.body.issueDate || null,
      status: normalizeStatus(req.body.status),
      remark: toNullIfEmpty(req.body.remark),
      filePath: filePaths[0] || null,
    };

    // 只有在 model 已支援 filePaths 時才寫入
    if (hasAttr("filePaths")) {
      payload.filePaths = filePaths;
    }

    if (!payload.modelFamily || !payload.certType) {
      return res.status(400).json({
        success: false,
        message: "缺少必填欄位：modelFamily(groupName) / certType",
      });
    }

    const row = await SafetyReport.create(payload);
    res.status(201).json({ success: true, row: toClientRow(row) });
  } catch (err) {
    console.error("新增安規認證失敗:", err);
    res.status(500).json({ success: false, message: "新增安規認證失敗" });
  }
});

/* =========================================================
   PUT /api/safety-reports/:id  （admin only）
========================================================= */
router.put("/:id", authMiddleware, requireAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const row = await SafetyReport.findByPk(id);
    if (!row) {
      return res.status(404).json({ success: false, message: "找不到資料" });
    }

    const allow = [
      "modelFamily",
      "groupName",
      "modelName",
      "modelCode",
      "certType",
      "standard",
      "lab",
      "issueDate",
      "status",
      "remark",
      "filePath",
      "fileId",
      "filePaths",
      "fileIds",
      "files",
      "attachments",
    ];

    const patch = {};

    for (const k of allow) {
      if (!(k in req.body)) continue;

      if (k === "modelFamily" || k === "groupName") {
        patch.modelFamily = normalizeModelFamily(req.body);
        continue;
      }

      if (k === "issueDate") {
        patch.issueDate = req.body.issueDate || null;
        continue;
      }

      if (k === "status") {
        patch.status = normalizeStatus(req.body.status);
        continue;
      }

      if (k === "modelName") {
        patch.modelName = toNullIfEmpty(req.body.modelName);
        continue;
      }

      if (k === "modelCode") {
        patch.modelCode = toNullIfEmpty(req.body.modelCode);
        continue;
      }

      if (k === "certType") {
        patch.certType = clean(req.body.certType);
        continue;
      }

      if (k === "standard") {
        patch.standard = toNullIfEmpty(req.body.standard);
        continue;
      }

      if (k === "lab") {
        patch.lab = toNullIfEmpty(req.body.lab);
        continue;
      }

      if (k === "remark") {
        patch.remark = toNullIfEmpty(req.body.remark);
        continue;
      }

      if (["filePath", "fileId", "filePaths", "fileIds", "files", "attachments"].includes(k)) {
        continue;
      }
    }

    if (hasAnyFilePayload(req.body)) {
      const filePaths = normalizeFilePathList(req.body);
      patch.filePath = filePaths[0] || null;

      if (hasAttr("filePaths")) {
        patch.filePaths = filePaths;
      }
    }

    if ("modelFamily" in patch && !patch.modelFamily) {
      return res.status(400).json({
        success: false,
        message: "modelFamily(groupName) 不可為空",
      });
    }

    if ("certType" in patch && !patch.certType) {
      return res.status(400).json({
        success: false,
        message: "certType 不可為空",
      });
    }

    await row.update(patch);
    res.json({ success: true, row: toClientRow(row) });
  } catch (err) {
    console.error("更新安規認證失敗:", err);
    res.status(500).json({ success: false, message: "更新安規認證失敗" });
  }
});

/* =========================================================
   DELETE /api/safety-reports/:id  （admin only）
========================================================= */
router.delete("/:id", authMiddleware, requireAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const row = await SafetyReport.findByPk(id);
    if (!row) {
      return res.status(404).json({ success: false, message: "找不到資料" });
    }

    await row.destroy();
    res.json({ success: true });
  } catch (err) {
    console.error("刪除安規認證失敗:", err);
    res.status(500).json({ success: false, message: "刪除安規認證失敗" });
  }
});

export default router;