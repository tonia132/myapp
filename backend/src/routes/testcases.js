// backend/src/routes/testCases.js
import express from "express";
import { Op } from "sequelize";
import multer from "multer";
import XLSX from "xlsx";
import authMiddleware from "../middleware/authMiddleware.js";
import * as models from "../models/index.js";
import { recalcProductProgress } from "../utils/productProgress.js";

const router = express.Router();

const { TestCase, Product, DefaultTestSet } = models;

router.use(authMiddleware);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB
});

/* ---------------- helpers ---------------- */
const clean = (v) => String(v ?? "").trim();
const toBool = (v, def = false) => {
  if (v === true || v === "true" || v === 1 || v === "1") return true;
  if (v === false || v === "false" || v === 0 || v === "0") return false;
  return def;
};
const toNum = (v, def = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : def;
};
const toInt = (v, def = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.floor(n) : def;
};

const isAdmin = (u) => String(u?.role || "").toLowerCase() === "admin";
const hasAttr = (model, attr) => Boolean(model?.rawAttributes?.[attr]);

function normalizeResult(v) {
  const s = String(v ?? "pending").trim().toLowerCase();
  if (s === "pass") return "pass";
  if (s === "fail") return "fail";
  return "pending";
}

/** ✅ extra: allow null | object | array | JSON-string */
function normalizeExtra(v) {
  if (v === null || typeof v === "undefined") return null;

  if (typeof v === "string") {
    const s = v.trim();
    if (!s) return null;
    try {
      const parsed = JSON.parse(s);
      if (parsed && (typeof parsed === "object" || Array.isArray(parsed))) return parsed;
      return null;
    } catch {
      return null;
    }
  }

  if (Array.isArray(v)) return v;
  if (typeof v === "object") return v;

  return null;
}

/** ✅ 嚴格驗證：extra 不接受 number/boolean 這種 */
function validateExtraOr400(extra, res) {
  if (extra === undefined) return true;
  if (extra === null) return true;
  if (typeof extra === "object") return true; // includes array
  res.status(400).json({ success: false, message: "extra must be object/array or null" });
  return false;
}

/**
 * ✅ 原本你用 pickHours 填 estHours/estHrs
 * （保留）
 */
function pickHours(it) {
  const v =
    it?.estHours ??
    it?.estHrs ??
    it?.estimatedHours ??
    it?.hours ??
    it?.workHrs ??
    it?.workHours ??
    0;

  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

/**
 * ✅ 新增：專門抓 workHrs（工時）
 * - 支援多種命名
 * - 保留小數
 */
function pickWorkHrs(it) {
  const v =
    it?.workHrs ??
    it?.workHours ??
    it?.work_hrs ??
    it?.hours ??
    it?.estHours ??
    it?.estHrs ??
    it?.estimatedHours ??
    0;

  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}
/**
 * ✅ 統一把 env 欄位塞進 extra
 * 支援：inputVoltage / temperature / humidity + cpuTemp/memoryTemp/diskTemp
 * 支援：showInputVoltage/showTemperature/showHumidity + showCpuConfig/showMemoryConfig/showDiskConfig
 * - 會把字串轉數字 / 布林
 * - 只補缺的，不覆蓋已存在值
 * - base extra 若為 array 會原樣保留（不 merge）
 */
function mergeExtraWithEnv(extraVal, it) {
  const base = normalizeExtra(extraVal);
  const baseObj =
    base && typeof base === "object" && !Array.isArray(base) ? { ...base } : null;

  const pickFirst = (obj, keys) => {
    for (const k of keys) {
      if (obj && Object.prototype.hasOwnProperty.call(obj, k)) return obj[k];
    }
    return undefined;
  };

  const toNumMaybe = (v) => {
    if (v === null || typeof v === "undefined") return undefined;
    const s = typeof v === "string" ? v.trim() : v;
    if (s === "") return undefined;
    const n = Number(s);
    return Number.isFinite(n) ? n : undefined;
  };

  const toBoolMaybe = (v) => {
    if (v === null || typeof v === "undefined") return undefined;
    if (v === true || v === false) return v;
    const s = String(v).trim().toLowerCase();
    if (["1", "true", "yes", "y", "on"].includes(s)) return true;
    if (["0", "false", "no", "n", "off"].includes(s)) return false;
    if (s === "") return undefined;
    return undefined;
  };

  // base env
  const keysVoltage = ["inputVoltage", "input_voltage", "inputVolt", "input_volt", "vin", "voltage"];
  const keysTemp = ["temperature", "temp", "tempC", "temp_c"];
  const keysHum = ["humidity", "hum", "humPct", "hum_pct"];

  // component temps
  const keysCpuTemp = ["cpuTemp", "cpu_temp", "reliCpuTemp", "cpuTemperature", "cpu_temperature", "cpuTempC"];
  const keysMemTemp = ["memoryTemp", "memTemp", "mem_temp", "reliMemoryTemp", "reliMemTemp", "memory_temperature", "memoryTempC"];
  const keysDiskTemp = ["diskTemp", "disk_temp", "reliDiskTemp", "ssdTemp", "ssd_temp", "disk_temperature", "diskTempC"];

  // checkbox flags
  const keysShowInputVoltage = ["showInputVoltage", "showVin", "showVoltage", "show_input_voltage", "show_inputVoltage"];
  const keysShowTemperature = ["showTemperature", "showTemp", "show_temperature"];
  const keysShowHumidity = ["showHumidity", "showHum", "show_humidity"];

  const keysShowCpuConfig = ["showCpuConfig", "showCPU", "showCpu", "show_cpu", "showCpuTemp", "show_cpu_temp"];
  const keysShowMemoryConfig = ["showMemoryConfig", "showMemory", "showMem", "show_memory", "showMemoryTemp", "show_memory_temp"];
  const keysShowDiskConfig = ["showDiskConfig", "showDisk", "showSSD", "show_disk", "showDiskTemp", "show_disk_temp"];

  const env = {};

  // numbers：先看 it，再看 baseObj（避免已有值被洗掉）
  const nv = toNumMaybe(pickFirst(it, keysVoltage) ?? (baseObj ? pickFirst(baseObj, keysVoltage) : undefined));
  const nt = toNumMaybe(pickFirst(it, keysTemp) ?? (baseObj ? pickFirst(baseObj, keysTemp) : undefined));
  const nh = toNumMaybe(pickFirst(it, keysHum) ?? (baseObj ? pickFirst(baseObj, keysHum) : undefined));

  if (nv !== undefined) env.inputVoltage = nv;
  if (nt !== undefined) env.temperature = nt;
  if (nh !== undefined) env.humidity = nh;

  const nCpu = toNumMaybe(pickFirst(it, keysCpuTemp) ?? (baseObj ? pickFirst(baseObj, keysCpuTemp) : undefined));
  const nMem = toNumMaybe(pickFirst(it, keysMemTemp) ?? (baseObj ? pickFirst(baseObj, keysMemTemp) : undefined));
  const nDisk = toNumMaybe(pickFirst(it, keysDiskTemp) ?? (baseObj ? pickFirst(baseObj, keysDiskTemp) : undefined));

  if (nCpu !== undefined) env.cpuTemp = nCpu;
  if (nMem !== undefined) env.memoryTemp = nMem; // ✅ canonical
  if (nDisk !== undefined) env.diskTemp = nDisk;

  // booleans
  const bVin = toBoolMaybe(pickFirst(it, keysShowInputVoltage) ?? (baseObj ? pickFirst(baseObj, keysShowInputVoltage) : undefined));
  const bT = toBoolMaybe(pickFirst(it, keysShowTemperature) ?? (baseObj ? pickFirst(baseObj, keysShowTemperature) : undefined));
  const bH = toBoolMaybe(pickFirst(it, keysShowHumidity) ?? (baseObj ? pickFirst(baseObj, keysShowHumidity) : undefined));

  if (bVin !== undefined) env.showInputVoltage = bVin;
  if (bT !== undefined) env.showTemperature = bT;
  if (bH !== undefined) env.showHumidity = bH;

  const bCpu = toBoolMaybe(pickFirst(it, keysShowCpuConfig) ?? (baseObj ? pickFirst(baseObj, keysShowCpuConfig) : undefined));
  const bMem = toBoolMaybe(pickFirst(it, keysShowMemoryConfig) ?? (baseObj ? pickFirst(baseObj, keysShowMemoryConfig) : undefined));
  const bDisk = toBoolMaybe(pickFirst(it, keysShowDiskConfig) ?? (baseObj ? pickFirst(baseObj, keysShowDiskConfig) : undefined));

  if (bCpu !== undefined) env.showCpuConfig = bCpu;
  if (bMem !== undefined) env.showMemoryConfig = bMem;
  if (bDisk !== undefined) env.showDiskConfig = bDisk;

  // base 不是 object（null/array/其他）→ 無法 merge
  if (!baseObj) {
    if (Array.isArray(base)) return base;
    return Object.keys(env).length ? env : base;
  }

  // base 是 object：只補缺的
  for (const [k, v] of Object.entries(env)) {
    if (baseObj[k] === undefined || baseObj[k] === null || baseObj[k] === "") {
      baseObj[k] = v;
    }
  }

  return baseObj;
}

// ✅ 從 req.body / patch 取出環境欄位（包含 component temps + 顯示 checkbox flags）
function pickEnvPatchFromBody(it) {
  const hasOwn = (obj, k) => Object.prototype.hasOwnProperty.call(obj || {}, k);

  const extraObj = (() => {
    const ex = normalizeExtra(it?.extra);
    return ex && typeof ex === "object" && !Array.isArray(ex) ? ex : null;
  })();

  // 先看 top-level，再看 extra 內（避免前端送在 extra 裡抓不到）
  const pickFirst = (obj, keys) => {
    for (const k of keys) {
      if (hasOwn(obj, k)) return obj[k];
      if (extraObj && hasOwn(extraObj, k)) return extraObj[k];
    }
    return undefined;
  };

  const toNumMaybe = (v) => {
    if (v === null || typeof v === "undefined") return undefined;
    const s = typeof v === "string" ? v.trim() : v;
    if (s === "") return undefined;
    const n = Number(s);
    return Number.isFinite(n) ? n : undefined;
  };

  const toBoolMaybe = (v) => {
    if (v === null || typeof v === "undefined") return undefined;
    if (v === true || v === false) return v;
    const s = String(v).trim().toLowerCase();
    if (["1", "true", "yes", "y", "on"].includes(s)) return true;
    if (["0", "false", "no", "n", "off"].includes(s)) return false;
    if (s === "") return undefined;
    return undefined;
  };

  // base env
  const keysVoltage = ["inputVoltage", "input_voltage", "inputVolt", "input_volt", "vin", "voltage"];
  const keysTemp = ["temperature", "temp", "tempC", "temp_c"];
  const keysHum = ["humidity", "hum", "humPct", "hum_pct"];

  // component temps
  const keysCpuTemp = ["cpuTemp", "cpu_temp", "reliCpuTemp", "cpuTemperature", "cpu_temperature", "cpuTempC"];
  const keysMemTemp = ["memoryTemp", "memTemp", "mem_temp", "reliMemoryTemp", "reliMemTemp", "memory_temperature", "memoryTempC"];
  const keysDiskTemp = ["diskTemp", "disk_temp", "reliDiskTemp", "ssdTemp", "ssd_temp", "disk_temperature", "diskTempC"];

  // ✅ display flags（checkbox）
  const keysShowInputVoltage = ["showInputVoltage", "showVin", "showVoltage", "show_input_voltage", "show_inputVoltage"];
  const keysShowTemperature = ["showTemperature", "showTemp", "show_temperature"];
  const keysShowHumidity = ["showHumidity", "showHum", "show_humidity"];

  const keysShowCpuConfig = ["showCpuConfig", "showCPU", "showCpu", "show_cpu", "showCpuTemp", "show_cpu_temp"];
  const keysShowMemoryConfig = ["showMemoryConfig", "showMemory", "showMem", "show_memory", "showMemoryTemp", "show_memory_temp"];
  const keysShowDiskConfig = ["showDiskConfig", "showDisk", "showSSD", "show_disk", "showDiskTemp", "show_disk_temp"];

  const out = {};

  // numbers
  const nv = toNumMaybe(pickFirst(it, keysVoltage));
  const nt = toNumMaybe(pickFirst(it, keysTemp));
  const nh = toNumMaybe(pickFirst(it, keysHum));
  if (nv !== undefined) out.inputVoltage = nv;
  if (nt !== undefined) out.temperature = nt;
  if (nh !== undefined) out.humidity = nh;

  const nCpu = toNumMaybe(pickFirst(it, keysCpuTemp));
  const nMem = toNumMaybe(pickFirst(it, keysMemTemp));
  const nDisk = toNumMaybe(pickFirst(it, keysDiskTemp));
  if (nCpu !== undefined) out.cpuTemp = nCpu;
  if (nMem !== undefined) out.memoryTemp = nMem; // ✅ canonical
  if (nDisk !== undefined) out.diskTemp = nDisk;

  // booleans
  const bVin = toBoolMaybe(pickFirst(it, keysShowInputVoltage));
  const bT = toBoolMaybe(pickFirst(it, keysShowTemperature));
  const bH = toBoolMaybe(pickFirst(it, keysShowHumidity));
  if (bVin !== undefined) out.showInputVoltage = bVin;
  if (bT !== undefined) out.showTemperature = bT;
  if (bH !== undefined) out.showHumidity = bH;

  const bCpu = toBoolMaybe(pickFirst(it, keysShowCpuConfig));
  const bMem = toBoolMaybe(pickFirst(it, keysShowMemoryConfig));
  const bDisk = toBoolMaybe(pickFirst(it, keysShowDiskConfig));
  if (bCpu !== undefined) out.showCpuConfig = bCpu;
  if (bMem !== undefined) out.showMemoryConfig = bMem;
  if (bDisk !== undefined) out.showDiskConfig = bDisk;

  return out;
}

// ✅ 把 envPatch 覆寫進 extra（會保留原本 extra 其他欄位）
function overwriteExtraWithPatch(extraVal, envPatch) {
  if (!envPatch || !Object.keys(envPatch).length) return extraVal;

  const base = normalizeExtra(extraVal);
  if (Array.isArray(base)) {
    // 少見：extra 是 array 的話，包起來避免資料遺失
    return { _array: base, ...envPatch };
  }
  const baseObj = base && typeof base === "object" ? { ...base } : {};
  for (const [k, v] of Object.entries(envPatch)) baseObj[k] = v;
  return baseObj;
}

// ✅ import 時回填 extra 需要補的 env keys（含 temps + checkbox flags）
const ENV_EXTRA_KEYS = [
  "inputVoltage",
  "temperature",
  "humidity",
  "cpuTemp",
  "memoryTemp",
  "diskTemp",
  "showInputVoltage",
  "showTemperature",
  "showHumidity",
  "showCpuConfig",
  "showMemoryConfig",
  "showDiskConfig",
];

/**
 * ✅ 只補缺的 env 欄位，不覆蓋既有值
 * - 支援 mergedExtra 是 object / array / null
 * - memoryTemp 也會吃 memTemp
 * - incomingVal 允許 false（checkbox）與 0（數字）
 */
function backfillEnvIntoExtra(curExtraVal, mergedExtraVal) {
  if (mergedExtraVal === undefined || mergedExtraVal === null) {
    return { changed: false, next: curExtraVal };
  }

  const cur = normalizeExtra(curExtraVal);

  // merged 是 array：只有在 cur 為空時才整包補上（避免破壞既有 object extra）
  if (Array.isArray(mergedExtraVal)) {
    const curObj = cur && typeof cur === "object" && !Array.isArray(cur) ? cur : null;
    const curEmpty = !curObj || Object.keys(curObj).length === 0;
    if (curEmpty) return { changed: true, next: mergedExtraVal };
    return { changed: false, next: curExtraVal };
  }

  // merged 必須是 object 才能補 key
  if (typeof mergedExtraVal !== "object") {
    return { changed: false, next: curExtraVal };
  }

  const mergedObj = mergedExtraVal;

  // cur 不是 object（null/array/其他）→ 直接用 mergedObj
  const curObj =
    cur && typeof cur === "object" && !Array.isArray(cur) ? { ...cur } : null;

  if (!curObj || Object.keys(curObj).length === 0) {
    return { changed: true, next: mergedObj };
  }

  let changed = false;
  for (const k of ENV_EXTRA_KEYS) {
    const incoming =
      k === "memoryTemp"
        ? (mergedObj.memoryTemp ?? mergedObj.memTemp)
        : mergedObj[k];

    if (incoming === undefined) continue;

    if (curObj[k] === undefined || curObj[k] === null || curObj[k] === "") {
      curObj[k] = incoming;
      changed = true;
    }
  }

  return changed ? { changed: true, next: curObj } : { changed: false, next: curExtraVal };
}

function pickAttrs(model, obj) {
  const out = {};
  const attrs = model?.rawAttributes || {};
  for (const [k, v] of Object.entries(obj || {})) {
    if (Object.prototype.hasOwnProperty.call(attrs, k) && v !== undefined) out[k] = v;
  }
  return out;
}

async function getProductOr404(productId) {
  if (!Product) return null;
  return Product.unscoped().findByPk(Number(productId), {
    attributes: ["id", "createdBy", "planLocked", "isDeleted", "name", "model"],
  });
}

function canEditPlan(product, user) {
  if (product?.planLocked && !isAdmin(user)) return false;
  return true;
}

function ensureOwnerOrAdmin(product, user) {
  return isAdmin(user) || Number(user?.id) === Number(product?.createdBy);
}

/* ---------------- planned key inference ---------------- */
function inferPlannedKey() {
  const candidates = ["isPlanned", "planned", "selected", "isSelected", "included"];
  for (const k of candidates) if (hasAttr(TestCase, k)) return k;
  return null;
}

function setPlannedValue(obj, val) {
  const k = inferPlannedKey();
  if (!k) return;
  obj[k] = Boolean(val);
}

/* ---------------- progress recalc helper ---------------- */
async function touchProgress(productId) {
  const id = Number(productId);
  if (!Number.isFinite(id) || id <= 0) return;
  try {
    await recalcProductProgress(id);
  } catch (e) {
    console.warn("⚠️ recalcProductProgress failed:", e?.message || e);
  }
}

/**
 * ✅ 共用：讀取 DefaultTestSet 的 items
 * - 優先讀 default_test_set_items
 * - fallback 舊欄位（testCases/itemsJson/items/data...）
 */
async function readDefaultSetItems(setId, transaction) {
  // 1) 優先走 DefaultTestSetItem
  if (models.DefaultTestSetItem) {
    const Item = models.DefaultTestSetItem;

    const fk = Item.rawAttributes?.testSetId
      ? "testSetId"
      : Item.rawAttributes?.defaultTestSetId
        ? "defaultTestSetId"
        : null;

    if (fk) {
      const order = [];
      if (Item.rawAttributes?.orderNo) order.push(["orderNo", "ASC"]);
      if (Item.rawAttributes?.sortOrder) order.push(["sortOrder", "ASC"]);
      if (Item.rawAttributes?.order) order.push(["order", "ASC"]);
      order.push(["id", "ASC"]);

      const rows = await Item.findAll({
        where: { [fk]: setId },
        order,
        transaction,
      });
      return rows.map((r) => r.toJSON());
    }
  }

  // 2) fallback：舊版 JSON 欄位（兼容）
  if (!DefaultTestSet) return [];
  const set = await DefaultTestSet.findByPk(setId, { transaction });
  if (!set) return [];

  const col =
    ["testCases", "itemsJson", "items", "data", "payload", "content"].find(
      (c) => !!DefaultTestSet.rawAttributes?.[c]
    ) || null;

  if (!col) return [];

  let raw = set[col];
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;

  try {
    const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * ✅ DefaultTestSet 權限檢查
 */
function canUseTestSet(setRow, user) {
  if (isAdmin(user)) return true;
  if (!setRow) return false;

  const hasIsPublic = hasAttr(DefaultTestSet, "isPublic");
  const hasCreatedBy = hasAttr(DefaultTestSet, "createdBy");

  if (hasIsPublic) {
    const pub = !!setRow.isPublic;
    if (pub) return true;
    if (hasCreatedBy) return Number(setRow.createdBy) === Number(user?.id);
    return false;
  }

  if (hasCreatedBy) return Number(setRow.createdBy) === Number(user?.id);

  return true;
}

/* =========================================================
   GET /api/testcases/product/:productId
========================================================= */
router.get("/product/:productId(\\d+)", async (req, res) => {
  try {
    const productId = Number(req.params.productId);
    const keyword = clean(req.query.keyword || req.query.kw || "");

    const p = await getProductOr404(productId);
    if (!p || p.isDeleted) {
      return res.status(404).json({ success: false, message: "product not found" });
    }
    if (!ensureOwnerOrAdmin(p, req.user)) {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }

    const where = { productId };
    if (hasAttr(TestCase, "isDeleted")) where.isDeleted = false;

    if (keyword) {
      const or = [];
      if (hasAttr(TestCase, "code")) or.push({ code: { [Op.like]: `%${keyword}%` } });
      if (hasAttr(TestCase, "testCase")) or.push({ testCase: { [Op.like]: `%${keyword}%` } });
      if (or.length) where[Op.or] = or;
    }

    const rows = await TestCase.findAll({
      where,
      order: [["id", "ASC"]],
    });

    const data = rows.map((r) => {
      const o = r.toJSON();

      // ✅ 把 extra 內的 env/temps 拆回 top-level
      const ex = normalizeExtra(o.extra);
      if (ex && typeof ex === "object" && !Array.isArray(ex)) {
        if (o.inputVoltage == null && ex.inputVoltage !== undefined) o.inputVoltage = ex.inputVoltage;
        if (o.temperature == null && ex.temperature !== undefined) o.temperature = ex.temperature;
        if (o.humidity == null && ex.humidity !== undefined) o.humidity = ex.humidity;

        if (o.cpuTemp == null && ex.cpuTemp !== undefined) o.cpuTemp = ex.cpuTemp;

        // ✅ checkbox flags
        if (o.showInputVoltage == null && ex.showInputVoltage !== undefined) o.showInputVoltage = ex.showInputVoltage;
        if (o.showTemperature == null && ex.showTemperature !== undefined) o.showTemperature = ex.showTemperature;
        if (o.showHumidity == null && ex.showHumidity !== undefined) o.showHumidity = ex.showHumidity;

        if (o.showCpuConfig == null && ex.showCpuConfig !== undefined) o.showCpuConfig = ex.showCpuConfig;
        if (o.showMemoryConfig == null && ex.showMemoryConfig !== undefined) o.showMemoryConfig = ex.showMemoryConfig;
        if (o.showDiskConfig == null && ex.showDiskConfig !== undefined) o.showDiskConfig = ex.showDiskConfig;

        const m = ex.memoryTemp ?? ex.memTemp;
        if (o.memoryTemp == null && m !== undefined) o.memoryTemp = m;
        if (o.memTemp == null && m !== undefined) o.memTemp = m;

        if (o.diskTemp == null && ex.diskTemp !== undefined) o.diskTemp = ex.diskTemp;
      }

      if (o.workHrs != null) o.workHrs = toNum(o.workHrs, 0);
      return o;
    });

    return res.json({ success: true, data });
  } catch (e) {
    console.error("❌ GET /testcases/product/:id:", e);
    return res.status(500).json({ success: false, message: e.message || "Server error" });
  }
});

/**
 * ✅ 新增 Planned
 * POST /api/testcases/product/:productId
 */
router.post("/product/:productId(\\d+)", async (req, res) => {
  try {
    const productId = Number(req.params.productId);
    const p = await getProductOr404(productId);
    if (!p || p.isDeleted) {
      return res.status(404).json({ success: false, message: "product not found" });
    }

    if (!ensureOwnerOrAdmin(p, req.user)) {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }
    if (!canEditPlan(p, req.user)) {
      return res.status(403).json({ success: false, message: "Plan is locked (admin only)" });
    }

    const userId = toInt(req.user?.id, 0);
    if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" });

    let extraNorm = mergeExtraWithEnv(req.body?.extra, req.body);

    // ✅ env patch
    const envPatch = pickEnvPatchFromBody(req.body);
    extraNorm = overwriteExtraWithPatch(extraNorm, envPatch);

    if (!validateExtraOr400(extraNorm, res)) return;

    const patch = {
      productId,
      createdBy: userId,

      category: clean(req.body?.category) || "HW",
      code: clean(req.body?.code || "") || null,

      testCase: clean(req.body?.testCase || ""),
      testProcedure: String(req.body?.testProcedure ?? "").trim() || null,
      testCriteria: String(req.body?.testCriteria ?? "").trim() || null,

      result: "pending",
      workHrs: 0,
      remark: "",
      isDeleted: false,

      extra: extraNorm,
    };

    const plannedIncoming =
      typeof req.body?.isPlanned === "undefined" ? true : toBool(req.body?.isPlanned, true);
    setPlannedValue(patch, plannedIncoming);

    const payload = pickAttrs(TestCase, patch);

    if (hasAttr(TestCase, "testCase") && !clean(payload.testCase)) {
      return res.status(400).json({ success: false, message: "testCase required" });
    }

    const created = await TestCase.create(payload);

    touchProgress(productId);

    return res.status(201).json({ success: true, data: created });
  } catch (e) {
    console.error("❌ POST /testcases/product/:productId:", e);
    return res.status(500).json({ success: false, message: e.message || "Server error" });
  }
});

/**
 * PUT /api/testcases/bulk-update
 * body: { ids: number[], patch: {...} }
 */
router.put("/bulk-update", async (req, res) => {
  try {
    const ids = Array.isArray(req.body?.ids) ? req.body.ids.map(Number).filter(Boolean) : [];
    const patch = req.body?.patch || {};
    if (!ids.length) {
      return res.status(400).json({ success: false, message: "ids is required" });
    }

    const rows = await TestCase.findAll({ where: { id: { [Op.in]: ids } } });
    if (!rows.length) return res.json({ success: true, data: { updated: 0 } });

    // ✅ 防呆：bulk ids 不可跨 product
    const productIds = Array.from(new Set(rows.map((r) => Number(r.productId)).filter(Boolean)));
    if (productIds.length !== 1) {
      return res.status(400).json({
        success: false,
        message: "bulk-update ids must belong to the same product",
        productIds,
      });
    }

    const productId = productIds[0];
    const p = await getProductOr404(productId);
    if (!p || p.isDeleted) {
      return res.status(404).json({ success: false, message: "product not found" });
    }

    if (!ensureOwnerOrAdmin(p, req.user)) {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }

    // planLocked：只擋 planned
    const plannedKey = inferPlannedKey();
    if (plannedKey && typeof patch?.[plannedKey] !== "undefined") {
      if (!canEditPlan(p, req.user)) {
        return res.status(403).json({ success: false, message: "Plan is locked (admin only)" });
      }
    }
    if (typeof patch?.isPlanned !== "undefined" && plannedKey) {
      if (!canEditPlan(p, req.user)) {
        return res.status(403).json({ success: false, message: "Plan is locked (admin only)" });
      }
    }

    const normalized = {};

    if (typeof patch?.result !== "undefined" && hasAttr(TestCase, "result"))
      normalized.result = normalizeResult(patch.result);

    if (typeof patch?.workHrs !== "undefined" && hasAttr(TestCase, "workHrs"))
      normalized.workHrs = toNum(patch.workHrs, 0);

    if (typeof patch?.remark !== "undefined" && hasAttr(TestCase, "remark"))
      normalized.remark = String(patch.remark ?? "").trim();

    if (typeof patch?.testCase !== "undefined" && hasAttr(TestCase, "testCase"))
      normalized.testCase = String(patch.testCase ?? "").trim();

    if (typeof patch?.testProcedure !== "undefined" && hasAttr(TestCase, "testProcedure"))
      normalized.testProcedure = String(patch.testProcedure ?? "").trim();

    if (typeof patch?.testCriteria !== "undefined" && hasAttr(TestCase, "testCriteria"))
      normalized.testCriteria = String(patch.testCriteria ?? "").trim();

    // ✅ planned
    if (plannedKey) {
      if (typeof patch?.[plannedKey] !== "undefined" && hasAttr(TestCase, plannedKey)) {
        normalized[plannedKey] = toBool(patch[plannedKey], true);
      } else if (typeof patch?.isPlanned !== "undefined" && hasAttr(TestCase, plannedKey)) {
        normalized[plannedKey] = toBool(patch.isPlanned, true);
      }
    }

    // ✅ extra
    if (typeof patch?.extra !== "undefined" && hasAttr(TestCase, "extra")) {
      const extraNorm = mergeExtraWithEnv(patch.extra, patch);
      if (!validateExtraOr400(extraNorm, res)) return;
      normalized.extra = extraNorm;
    }

    // ✅ env fields -> extra
    const envPatch = pickEnvPatchFromBody(patch);

    if (hasAttr(TestCase, "extra") && Object.keys(envPatch).length) {
      if (typeof normalized.extra !== "undefined") {
        normalized.extra = overwriteExtraWithPatch(normalized.extra, envPatch);
      } else {
        for (const r of rows) {
          const nextExtra = overwriteExtraWithPatch(r.extra, envPatch);
          await r.update({ extra: nextExtra });
        }
      }
    }

    const finalPayload = pickAttrs(TestCase, normalized);
    if (Object.keys(finalPayload).length) {
      await TestCase.update(finalPayload, { where: { id: { [Op.in]: ids } } });
    }

    touchProgress(productId);

    return res.json({ success: true, data: { updated: ids.length } });
  } catch (e) {
    console.error("❌ PUT /testcases/bulk-update:", e);
    return res.status(500).json({ success: false, message: e.message || "Server error" });
  }
});

/**
 * PUT /api/testcases/:id
 */
router.put("/:id(\\d+)", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const row = await TestCase.findByPk(id);
    if (!row) return res.status(404).json({ success: false, message: "not found" });

    const p = await getProductOr404(row.productId);
    if (!p || p.isDeleted)
      return res.status(404).json({ success: false, message: "product not found" });

    if (!ensureOwnerOrAdmin(p, req.user)) {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }

    const patch = {};

    if (typeof req.body?.result !== "undefined" && hasAttr(TestCase, "result"))
      patch.result = normalizeResult(req.body.result);

    if (typeof req.body?.workHrs !== "undefined" && hasAttr(TestCase, "workHrs"))
      patch.workHrs = toNum(req.body.workHrs, 0);

    if (typeof req.body?.remark !== "undefined" && hasAttr(TestCase, "remark"))
      patch.remark = String(req.body.remark ?? "").trim();

    if (typeof req.body?.testCase !== "undefined" && hasAttr(TestCase, "testCase"))
      patch.testCase = String(req.body.testCase ?? "").trim();

    if (typeof req.body?.testProcedure !== "undefined" && hasAttr(TestCase, "testProcedure"))
      patch.testProcedure = String(req.body.testProcedure ?? "").trim();

    if (typeof req.body?.testCriteria !== "undefined" && hasAttr(TestCase, "testCriteria"))
      patch.testCriteria = String(req.body.testCriteria ?? "").trim();

    // ✅ plannedKey（相容舊 isPlanned）
    const plannedKey = inferPlannedKey();
    if (
      plannedKey &&
      (typeof req.body?.[plannedKey] !== "undefined" || typeof req.body?.isPlanned !== "undefined")
    ) {
      if (!canEditPlan(p, req.user)) {
        return res.status(403).json({ success: false, message: "Plan is locked (admin only)" });
      }
      const v =
        typeof req.body?.[plannedKey] !== "undefined" ? req.body[plannedKey] : req.body.isPlanned;
      patch[plannedKey] = toBool(v, true);
    }

    // ✅ extra
    if (typeof req.body?.extra !== "undefined" && hasAttr(TestCase, "extra")) {
      const extraNorm = mergeExtraWithEnv(req.body.extra, req.body);
      if (!validateExtraOr400(extraNorm, res)) return;
      patch.extra = extraNorm;
    }

    // ✅ env fields -> extra
    if (hasAttr(TestCase, "extra")) {
      const envPatch = pickEnvPatchFromBody(req.body);
      if (Object.keys(envPatch).length) {
        const base = typeof patch.extra !== "undefined" ? patch.extra : row.extra;
        patch.extra = overwriteExtraWithPatch(base, envPatch);
      }
    }

    Object.assign(row, pickAttrs(TestCase, patch));
    await row.save();

    touchProgress(row.productId);

    const out = row.toJSON();

    // ✅ 拆 extra 到 top-level（含 checkbox flags）
    const ex = normalizeExtra(out.extra);
    if (ex && typeof ex === "object" && !Array.isArray(ex)) {
      if (out.inputVoltage == null && ex.inputVoltage !== undefined) out.inputVoltage = ex.inputVoltage;
      if (out.temperature == null && ex.temperature !== undefined) out.temperature = ex.temperature;
      if (out.humidity == null && ex.humidity !== undefined) out.humidity = ex.humidity;

      if (out.cpuTemp == null && ex.cpuTemp !== undefined) out.cpuTemp = ex.cpuTemp;

      const m = ex.memoryTemp ?? ex.memTemp;
      if (out.memoryTemp == null && m !== undefined) out.memoryTemp = m;
      if (out.memTemp == null && m !== undefined) out.memTemp = m;

      if (out.diskTemp == null && ex.diskTemp !== undefined) out.diskTemp = ex.diskTemp;

      if (out.showInputVoltage == null && ex.showInputVoltage !== undefined) out.showInputVoltage = ex.showInputVoltage;
      if (out.showTemperature == null && ex.showTemperature !== undefined) out.showTemperature = ex.showTemperature;
      if (out.showHumidity == null && ex.showHumidity !== undefined) out.showHumidity = ex.showHumidity;

      if (out.showCpuConfig == null && ex.showCpuConfig !== undefined) out.showCpuConfig = ex.showCpuConfig;
      if (out.showMemoryConfig == null && ex.showMemoryConfig !== undefined) out.showMemoryConfig = ex.showMemoryConfig;
      if (out.showDiskConfig == null && ex.showDiskConfig !== undefined) out.showDiskConfig = ex.showDiskConfig;
    }

    return res.json({ success: true, data: out });
  } catch (e) {
    console.error("❌ PUT /testcases/:id:", e);
    return res.status(500).json({ success: false, message: e.message || "Server error" });
  }
});

/**
 * POST /api/testcases/bulk-delete
 * body: { ids: number[] }
 */
router.post("/bulk-delete", async (req, res) => {
  try {
    if (!hasAttr(TestCase, "isDeleted")) {
      return res.status(400).json({
        success: false,
        message: "TestCase.isDeleted not found (trash not supported)",
      });
    }

    const ids = Array.isArray(req.body?.ids) ? req.body.ids.map(Number).filter(Boolean) : [];
    if (!ids.length) return res.status(400).json({ success: false, message: "ids is required" });

    const rows = await TestCase.findAll({ where: { id: { [Op.in]: ids } } });
    if (!rows.length) return res.json({ success: true, data: { deleted: 0 } });

    const productIds = Array.from(new Set(rows.map((r) => Number(r.productId)).filter(Boolean)));
    if (productIds.length !== 1) {
      return res.status(400).json({
        success: false,
        message: "bulk-delete ids must belong to the same product",
        productIds,
      });
    }

    const productId = productIds[0];
    const p = await getProductOr404(productId);
    if (!p || p.isDeleted)
      return res.status(404).json({ success: false, message: "product not found" });

    if (!ensureOwnerOrAdmin(p, req.user)) {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }
    if (!canEditPlan(p, req.user)) {
      return res.status(403).json({ success: false, message: "Plan is locked (admin only)" });
    }

    await TestCase.update({ isDeleted: true }, { where: { id: { [Op.in]: ids } } });

    touchProgress(productId);

    return res.json({ success: true, data: { deleted: ids.length } });
  } catch (e) {
    console.error("❌ POST /testcases/bulk-delete:", e);
    return res.status(500).json({ success: false, message: e.message || "Server error" });
  }
});

/**
 * GET /api/testcases/trash?productId=xx
 */
router.get("/trash", async (req, res) => {
  try {
    if (!hasAttr(TestCase, "isDeleted")) {
      return res.status(400).json({
        success: false,
        message: "TestCase.isDeleted not found (trash not supported)",
      });
    }

    const productId = Number(req.query.productId);
    if (!productId)
      return res.status(400).json({ success: false, message: "productId is required" });

    const p = await getProductOr404(productId);
    if (!p || p.isDeleted)
      return res.status(404).json({ success: false, message: "product not found" });

    if (!ensureOwnerOrAdmin(p, req.user)) {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }

    const rows = await TestCase.findAll({
      where: { productId, isDeleted: true },
      order: [["updatedAt", "DESC"]],
    });

    return res.json({ success: true, data: rows });
  } catch (e) {
    console.error("❌ GET /testcases/trash:", e);
    return res.status(500).json({ success: false, message: e.message || "Server error" });
  }
});

/**
 * PATCH /api/testcases/:id/restore
 */
router.patch("/:id(\\d+)/restore", async (req, res) => {
  try {
    if (!hasAttr(TestCase, "isDeleted")) {
      return res.status(400).json({
        success: false,
        message: "TestCase.isDeleted not found (trash not supported)",
      });
    }

    const id = Number(req.params.id);
    const row = await TestCase.findByPk(id);
    if (!row) return res.status(404).json({ success: false, message: "not found" });

    const p = await getProductOr404(row.productId);
    if (!p || p.isDeleted)
      return res.status(404).json({ success: false, message: "product not found" });

    if (!ensureOwnerOrAdmin(p, req.user)) {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }
    if (!canEditPlan(p, req.user)) {
      return res.status(403).json({ success: false, message: "Plan is locked (admin only)" });
    }

    row.isDeleted = false;
    await row.save();

    touchProgress(row.productId);

    return res.json({ success: true, data: row });
  } catch (e) {
    console.error("❌ PATCH /testcases/:id/restore:", e);
    return res.status(500).json({ success: false, message: e.message || "Server error" });
  }
});

/**
 * POST /api/testcases/bulk-restore
 * body: { ids: number[] }
 */
router.post("/bulk-restore", async (req, res) => {
  try {
    if (!hasAttr(TestCase, "isDeleted")) {
      return res.status(400).json({
        success: false,
        message: "TestCase.isDeleted not found (trash not supported)",
      });
    }

    const ids = Array.isArray(req.body?.ids) ? req.body.ids.map(Number).filter(Boolean) : [];
    if (!ids.length) return res.status(400).json({ success: false, message: "ids is required" });

    const rows = await TestCase.findAll({ where: { id: { [Op.in]: ids } } });
    if (!rows.length) return res.json({ success: true, data: { restored: 0 } });

    const productIds = Array.from(new Set(rows.map((r) => Number(r.productId)).filter(Boolean)));
    if (productIds.length !== 1) {
      return res.status(400).json({
        success: false,
        message: "bulk-restore ids must belong to the same product",
        productIds,
      });
    }

    const productId = productIds[0];
    const p = await getProductOr404(productId);
    if (!p || p.isDeleted)
      return res.status(404).json({ success: false, message: "product not found" });

    if (!ensureOwnerOrAdmin(p, req.user)) {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }
    if (!canEditPlan(p, req.user)) {
      return res.status(403).json({ success: false, message: "Plan is locked (admin only)" });
    }

    await TestCase.update({ isDeleted: false }, { where: { id: { [Op.in]: ids } } });

    touchProgress(productId);

    return res.json({ success: true, data: { restored: ids.length } });
  } catch (e) {
    console.error("❌ POST /testcases/bulk-restore:", e);
    return res.status(500).json({ success: false, message: e.message || "Server error" });
  }
});

/* =========================================================
   ✅ NEW: Excel 匯入（Extracted_Test_Cases_TEAMGROUP.xlsx）
   POST /api/testcases/product/:productId/import-excel
========================================================= */
router.post(
  "/product/:productId(\\d+)/import-excel",
  upload.single("file"),
  async (req, res) => {
    const tx = await models.sequelize.transaction();
    let committed = false;

    try {
      const productId = Number(req.params.productId);
      const p = await getProductOr404(productId);
      if (!p || p.isDeleted) {
        await tx.rollback();
        return res.status(404).json({ success: false, message: "product not found" });
      }
      if (!ensureOwnerOrAdmin(p, req.user)) {
        await tx.rollback();
        return res.status(403).json({ success: false, message: "Forbidden" });
      }
      if (!canEditPlan(p, req.user)) {
        await tx.rollback();
        return res.status(403).json({ success: false, message: "Plan is locked (admin only)" });
      }

      const userId = toInt(req.user?.id, 0);
      if (!userId) {
        await tx.rollback();
        return res.status(401).json({ success: false, message: "Unauthorized" });
      }

      if (!req.file?.buffer) {
        await tx.rollback();
        return res.status(400).json({ success: false, message: "file is required" });
      }

      const sheetNameReq = clean(req.body?.sheetName || "All");
      const mode = clean(req.body?.mode || "append").toLowerCase(); // append|replace
      const skipExisting = toBool(req.body?.skipExisting, false);
      const categoryOverride = clean(req.body?.category || "");

      const wb = XLSX.read(req.file.buffer, { type: "buffer" });
      const sheetName =
        wb.Sheets?.[sheetNameReq] ? sheetNameReq : (wb.SheetNames?.[0] || null);

      if (!sheetName) {
        await tx.rollback();
        return res.status(400).json({ success: false, message: "No sheet found in workbook" });
      }

      const rows = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { defval: "" });

      const COL = {
        reportFile: "Report File",
        sectionNo: "Section No",
        sectionTitle: "Section Title",
        tcId: "Test Case ID",
        title: "Test Case Title",
        tools: "Tools/Versions",
        procedure: "Procedure",
        criteria: "Criteria",
      };

      // ✅ replace：整個產品先軟刪
      if (mode === "replace") {
        await TestCase.unscoped().update(
          { isDeleted: true },
          { where: { productId }, transaction: tx }
        );
      }

      // ✅ skipExisting：只略過「未刪除」的同 code
      const existingMap = new Map();
      if (skipExisting) {
        const existRows = await TestCase.unscoped().findAll({
          where: { productId, isDeleted: false },
          transaction: tx,
        });
        for (const r of existRows) {
          const code = clean(r.code);
          if (code) existingMap.set(code, r);
        }
      }

      let inserted = 0;
      let updated = 0;
      let revived = 0;
      let skipped = 0;

      for (const r of rows) {
        const code = clean(r[COL.tcId]);
        const title = clean(r[COL.title]);
        if (!code || !title) { skipped++; continue; }

        if (skipExisting && existingMap.has(code)) {
          skipped++;
          continue;
        }

        const reportFile = clean(r[COL.reportFile]);
        const secNo = clean(r[COL.sectionNo]);
        const secTitle = clean(r[COL.sectionTitle]);
        const tools = clean(r[COL.tools]);

        let cat =
          categoryOverride ||
          (sheetName === "SSD" ? "SSD" : sheetName === "Memory" ? "MEMORY" : "") ||
          (reportFile.toUpperCase().includes("SSD") ? "SSD" :
            reportFile.toUpperCase().includes("MEMORY") ? "MEMORY" : "HW");

        cat = String(cat || "HW").trim().toUpperCase() || "HW";

        // ✅ model 沒有 section 欄位：把 Section/Tools/Source 放 extra
        const extra = {
          sourceReportFile: reportFile || undefined,
          sourceSheet: sheetName || undefined,
          sectionNo: secNo || undefined,
          sectionTitle: secTitle || undefined,
          tools: tools || undefined,
        };

        const payload = pickAttrs(TestCase, {
          productId,
          createdBy: userId,
          category: cat,
          code,
          testCase: title,
          testProcedure: String(r[COL.procedure] ?? "").trim() || null,
          testCriteria: String(r[COL.criteria] ?? "").trim() || null,
          isPlanned: true,
          workHrs: 0,
          result: "pending",
          remark: null,
          extra,
          isDeleted: false,
        });

        // ✅ 同 code 可能已軟刪：用 unscoped 找出來直接復活/更新
        const exist = await TestCase.unscoped().findOne({
          where: { productId, code },
          transaction: tx,
        });

        if (!exist) {
          await TestCase.create(payload, { transaction: tx });
          inserted++;
        } else {
          const wasDeleted = !!exist.isDeleted;
          await exist.update(payload, { transaction: tx });
          if (wasDeleted) revived++;
          else updated++;
        }
      }

      await tx.commit();
      committed = true;

      touchProgress(productId);

      return res.json({
        success: true,
        message: "Imported from Excel",
        data: { sheetName, mode, skipExisting, total: rows.length, inserted, updated, revived, skipped },
      });
    } catch (e) {
      if (!committed) await tx.rollback();
      console.error("❌ import-excel:", e);
      return res.status(500).json({ success: false, message: e.message || "Server error" });
    }
  }
);

/**
 * ✅ 從「Saved Test Set」套用到產品
 * POST /api/testcases/product/:productId/import-from-set
 */
router.post("/product/:productId(\\d+)/import-from-set", async (req, res) => {
  const tx = await models.sequelize.transaction();
  let committed = false;
  try {
    const productId = Number(req.params.productId);
    const setId = Number(req.body?.setId);

    const mode = String(req.body?.mode || "append").toLowerCase(); // replace|append
    let skipExisting = req.body?.skipExisting !== false;
    if (mode === "replace") skipExisting = false;

    if (!setId) {
      await tx.rollback();
      return res.status(400).json({ success: false, message: "setId is required" });
    }

    const product = await models.Product.unscoped().findByPk(productId, { transaction: tx });
    if (!product) {
      await tx.rollback();
      return res.status(404).json({ success: false, message: "product not found" });
    }

    // ✅ 權限：產品 owner/admin 才能匯入
    if (!ensureOwnerOrAdmin(product, req.user)) {
      await tx.rollback();
      return res.status(403).json({ success: false, message: "Forbidden" });
    }

    const isAdminUser = isAdmin(req.user);
    if (product?.planLocked && !isAdminUser) {
      await tx.rollback();
      return res.status(403).json({ success: false, message: "Plan is locked (admin only)" });
    }

    const set = await models.DefaultTestSet.findByPk(setId, { transaction: tx });
    if (!set) {
      await tx.rollback();
      return res.status(404).json({ success: false, message: "test set not found" });
    }

    // ✅ 權限：set 必須 public 或自己建立（admin 例外）
    if (!canUseTestSet(set, req.user)) {
      await tx.rollback();
      return res.status(403).json({ success: false, message: "Forbidden test set" });
    }

    const items = await readDefaultSetItems(setId, tx);
    if (!Array.isArray(items) || !items.length) {
      await tx.commit();
      committed = true;
      touchProgress(productId);
      return res.json({ success: true, message: "No items in set", inserted: 0, updated: 0 });
    }

    const TestCaseModel = models.TestCase;
    const has = (k) => !!TestCaseModel.rawAttributes?.[k];
    const hasOwn = (obj, k) => Object.prototype.hasOwnProperty.call(obj || {}, k);
    const pickOwn = (obj, keys) => {
      for (const k of keys) if (hasOwn(obj, k)) return obj[k];
      return undefined;
    };

    const plannedKey = inferPlannedKey();

    if (mode === "replace") {
      if (TestCaseModel.rawAttributes?.isDeleted) {
        await TestCaseModel.update({ isDeleted: true }, { where: { productId }, transaction: tx });
      } else {
        await TestCaseModel.destroy({ where: { productId }, transaction: tx });
      }
    }

    const existingMap = new Map();
    if (skipExisting) {
      const whereExisting = { productId };
      if (has("isDeleted")) whereExisting.isDeleted = false;

      const rows = await TestCaseModel.unscoped().findAll({ where: whereExisting, transaction: tx });
      for (const r of rows) {
        const o = r.toJSON();
        const code = String(o.code || "").trim();
        const key = code
          ? `code:${code}`
          : `fp:${String(o.category || "")}|${String(o.section || "")}|${String(o.testCase || "")}`;
        existingMap.set(key, r);
      }
    }

    const toInsert = [];
    let updated = 0;

    const userId = toInt(req.user?.id, 0);
    if (!userId) {
      await tx.rollback();
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    for (const it of items) {
      const code = String(it?.code || "").trim();
      const fp = code
        ? `code:${code}`
        : `fp:${String(it?.category || "")}|${String(it?.section || "")}|${String(it?.testCase || "")}`;

      const estVal = pickOwn(it, ["estHours", "estHrs", "estimatedHours", "hours"]);
      const workVal = pickOwn(it, [
        "workHrs",
        "workHours",
        "work_hrs",
        "hours",
        "estHours",
        "estHrs",
        "estimatedHours",
      ]);
      const resVal = pickOwn(it, ["result", "status"]);
      const remarkVal = pickOwn(it, ["remark", "notes"]);
      const extraVal = pickOwn(it, ["extra", "extraFields", "extraJson"]);
      const mergedExtra = mergeExtraWithEnv(extraVal, it);

      // ✅ Skip existing 時：仍然補「workHrs=0」的項目（不覆蓋已填）
      if (skipExisting && existingMap.has(fp)) {
        const row = existingMap.get(fp);

        const payload = {};
        if (estVal !== undefined && (has("estHours") || has("estHrs"))) {
          const estNum = toNum(estVal, 0);
          if (has("estHours")) payload.estHours = estNum;
          else payload.estHrs = estNum;
        }
        if (resVal !== undefined && has("result")) payload.result = normalizeResult(resVal);
        if (remarkVal !== undefined && has("remark")) payload.remark = String(remarkVal ?? "");

        // ✅ 補工時：只在目前為 0 時才補，避免覆蓋已填的實際工時
        if (workVal !== undefined && has("workHrs")) {
          const incoming = toNum(workVal, 0);
          const current = toNum(row.workHrs, 0);
          if (incoming > 0 && current === 0) payload.workHrs = incoming;
        }

        if (has("extra")) {
          const merged = mergedExtra; // null / object / array
          const { changed, next } = backfillEnvIntoExtra(row.extra, merged);
          if (changed) payload.extra = next;
        }

        if (Object.keys(payload).length) {
          await row.update(payload, { transaction: tx });
          updated++;
        }
        continue;
      }

      const row = {
        productId,
        createdBy: userId,
        category: it?.category ?? null,
        section: it?.section ?? null,
        code: code || null,
        testCase: it?.testCase ?? null,
        testProcedure: it?.testProcedure ?? null,
        testCriteria: it?.testCriteria ?? null,
        isDeleted: false,

        result: "pending",
        // ✅ 新增時就把工時帶進來
        workHrs: toNum(pickWorkHrs(it), 0),
        remark: "",
      };

      // ✅ planned
      const planned = typeof it?.isPlanned === "undefined" ? true : !!it.isPlanned;
      if (plannedKey && has(plannedKey)) row[plannedKey] = planned;

      const estNum = toNum(estVal ?? it?.estHours ?? it?.estHrs ?? 0, 0);
      if (has("estHours")) row.estHours = estNum;
      else if (has("estHrs")) row.estHrs = estNum;

      if (has("extra")) row.extra = mergedExtra;

      const payload = {};
      for (const [k, v] of Object.entries(row)) {
        if (has(k) && v !== undefined) payload[k] = v;
      }
      toInsert.push(payload);
    }

    if (toInsert.length) {
      await TestCaseModel.bulkCreate(toInsert, { transaction: tx });
    }

    await tx.commit();
    committed = true;

    touchProgress(productId);

    return res.json({
      success: true,
      message: `Imported from set #${setId}`,
      inserted: toInsert.length,
      updated,
      mode,
      skipExisting,
    });
  } catch (e) {
    if (!committed) await tx.rollback();
    console.error("❌ POST /testcases/product/:productId/import-from-set:", e);
    return res.status(500).json({ success: false, message: e.message || "Server error" });
  }
});

/**
 * ✅ 匯入 Preset（V1/V2）
 * POST /api/testcases/product/:productId/import-test-set
 */
router.post("/product/:productId(\\d+)/import-test-set", async (req, res) => {
  const tx = await models.sequelize.transaction();
  let committed = false;
  try {
    const productId = Number(req.params.productId);
    const p = await getProductOr404(productId);
    if (!p || p.isDeleted) {
      await tx.rollback();
      return res.status(404).json({ success: false, message: "product not found" });
    }

    if (!ensureOwnerOrAdmin(p, req.user)) {
      await tx.rollback();
      return res.status(403).json({ success: false, message: "Forbidden" });
    }
    if (!canEditPlan(p, req.user)) {
      await tx.rollback();
      return res.status(403).json({ success: false, message: "Plan is locked (admin only)" });
    }

    const userId = toInt(req.user?.id, 0);
    if (!userId) {
      await tx.rollback();
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const version = clean(req.body?.version || "");
    const preset = clean(req.body?.preset || "V1").toUpperCase();
    const mode = clean(req.body?.mode || "append").toLowerCase(); // replace|append
    let skipExisting = toBool(req.body?.skipExisting, true);
    if (mode === "replace") skipExisting = false;

    const and = [];
    if (version) {
      if (hasAttr(DefaultTestSet, "version")) and.push({ version });
      else if (hasAttr(DefaultTestSet, "templateVersion")) and.push({ templateVersion: version });
      else and.push({ name: { [Op.like]: `%${version}%` } });
    }
    if (preset) {
      if (hasAttr(DefaultTestSet, "preset")) and.push({ preset });
      else and.push({ name: { [Op.like]: `%${preset}%` } });
    }

    const where = and.length ? { [Op.and]: and } : {};

    // 只選內建 preset（fromProductId = null）
    if (hasAttr(DefaultTestSet, "fromProductId")) where.fromProductId = null;

    // ✅ 非 admin：限制能選到的 set
    if (!isAdmin(req.user)) {
      const ors = [];
      if (hasAttr(DefaultTestSet, "isPublic")) ors.push({ isPublic: true });
      if (hasAttr(DefaultTestSet, "createdBy")) ors.push({ createdBy: Number(req.user?.id) });
      if (ors.length) where[Op.and] = [...(where[Op.and] || []), { [Op.or]: ors }];
    }

    const set = await DefaultTestSet.findOne({
      where,
      order: [["createdAt", "DESC"]],
      transaction: tx,
    });

    if (!set) {
      await tx.rollback();
      return res.status(404).json({
        success: false,
        message: `DefaultTestSet not found (${version} ${preset})`,
      });
    }

    if (!canUseTestSet(set, req.user)) {
      await tx.rollback();
      return res.status(403).json({ success: false, message: "Forbidden test set" });
    }

    const items = await readDefaultSetItems(set.id, tx);
    if (!Array.isArray(items) || !items.length) {
      await tx.rollback();
      return res.status(400).json({
        success: false,
        message: "No items to import (DefaultTestSet empty)",
      });
    }

    const TestCaseModel = models.TestCase;
    const has = (k) => !!TestCaseModel.rawAttributes?.[k];
    const plannedKey = inferPlannedKey();

    if (mode === "replace") {
      if (TestCaseModel.rawAttributes?.isDeleted) {
        await TestCaseModel.update({ isDeleted: true }, { where: { productId }, transaction: tx });
      } else {
        await TestCaseModel.destroy({ where: { productId }, transaction: tx });
      }
    }

    const existingMap = new Map();
    if (skipExisting) {
      const rows = await TestCaseModel.unscoped().findAll({
        where: { productId },
        transaction: tx,
      });
      for (const r of rows) {
        const o = r.toJSON();
        const code = String(o.code || "").trim();
        const key = code
          ? `code:${code}`
          : `fp:${String(o.category || "")}|${String(o.section || "")}|${String(o.testCase || "")}`;
        existingMap.set(key, r);
      }
    }

    const toInsert = [];
    let updated = 0;
    let skipped = 0;

    for (const it of items) {
      const code = clean(it?.code);
      const fp = code
        ? `code:${code}`
        : `fp:${String(it?.category || "")}|${String(it?.section || "")}|${String(it?.testCase || "")}`;

      const incomingWork = toNum(pickWorkHrs(it), 0);

      if (skipExisting && existingMap.has(fp)) {
        const existRow = existingMap.get(fp);

        const payload = {};

        if (has("workHrs") && incomingWork > 0) {
          const current = toNum(existRow.workHrs, 0);
          if (current === 0) payload.workHrs = incomingWork;
        }

        if (has("extra")) {
          const merged = mergeExtraWithEnv(it?.extra ?? it?.extraFields ?? it?.extraJson, it);
          const { changed, next } = backfillEnvIntoExtra(existRow.extra, merged);
          if (changed) payload.extra = next;
        }

        if (Object.keys(payload).length) {
          await existRow.update(payload, { transaction: tx });
          updated++;
        } else {
          skipped++;
        }
        continue;
      }

      const extraNorm = mergeExtraWithEnv(it?.extra ?? it?.extraFields ?? it?.extraJson, it);

      const row = {
        productId,
        createdBy: userId,

        category: clean(it?.category) || null,
        section: clean(it?.section) || null,
        code: code || null,

        testCase: clean(it?.testCase) || null,
        testProcedure: String(it?.testProcedure ?? "").trim() || null,
        testCriteria: String(it?.testCriteria ?? "").trim() || null,

        workHrs: incomingWork,

        result: "pending",
        remark: "",
        isDeleted: false,

        extra: extraNorm,
      };

      const planned = typeof it?.isPlanned === "undefined" ? true : !!it.isPlanned;
      if (plannedKey && has(plannedKey)) row[plannedKey] = planned;

      const payload = {};
      for (const [k, v] of Object.entries(row)) {
        if (has(k) && v !== undefined) payload[k] = v;
      }
      toInsert.push(payload);
    }

    if (!toInsert.length) {
      await tx.commit();
      committed = true;
      touchProgress(productId);
      return res.json({
        success: true,
        data: {
          imported: 0,
          updated,
          skipped,
          usedDefaultTestSet: { id: set.id, name: set.name },
        },
        message: "Nothing imported (all existed).",
      });
    }

    await TestCaseModel.bulkCreate(toInsert, { transaction: tx, validate: true });

    await tx.commit();
    committed = true;

    touchProgress(productId);

    return res.json({
      success: true,
      data: {
        imported: toInsert.length,
        updated,
        skipped,
        usedDefaultTestSet: { id: set.id, name: set.name },
        mode,
        skipExisting,
      },
      message: "Imported",
    });
  } catch (e) {
    if (!committed) await tx.rollback();
    console.error("❌ POST /testcases/product/:id/import-test-set:", e);
    return res.status(500).json({ success: false, message: e.message || "Server error" });
  }
});

export default router;
