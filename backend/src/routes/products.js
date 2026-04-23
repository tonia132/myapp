// backend/src/routes/products.js
import express from "express";
import { Op } from "sequelize";
import authMiddleware from "../middleware/authMiddleware.js";
import * as models from "../models/index.js";
import { calcProgressMap, calcProgressOne } from "../utils/productProgress.js";

const router = express.Router();
const { Product, User, TestCase, ReportMeta } = models;

/* ---------------- helpers ---------------- */
const clean = (v) => String(v ?? "").trim();

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

function hasAttr(model, key) {
  return !!model?.rawAttributes?.[key];
}
function isAdmin(u) {
  return String(u?.role || "").trim().toLowerCase() === "admin";
}
function ensureOwnerOrAdmin(product, user) {
  return isAdmin(user) || Number(user?.id) === Number(product?.createdBy);
}

/* ---------------- ✅ testType normalize ----------------
 * 允許值：
 * - x86（預設）
 * - arm
 * - display
 * - part（物件/零件：SSD/Memory）
 */
function normalizeTestType(v) {
  const s = String(v ?? "x86").trim().toLowerCase();
  if (!s) return "x86";

  if (["part", "parts", "object", "component", "device"].includes(s)) return "part";
  if (["arm"].includes(s)) return "arm";
  if (["display", "disp", "monitor", "screen"].includes(s)) return "display";

  return "x86";
}

/* ---------------- draft column inference ---------------- */
function inferDraftCol() {
  const candidates = ["testPlanDraft", "testPlanDraftJson", "testPlanDraftData", "planDraft", "draft"];
  for (const c of candidates) if (hasAttr(Product, c)) return c;
  return null;
}
function inferDraftUpdatedCol() {
  const candidates = ["testPlanDraftUpdatedAt", "planDraftUpdatedAt", "draftUpdatedAt"];
  for (const c of candidates) if (hasAttr(Product, c)) return c;
  return null;
}

function tryParseJson(v) {
  if (typeof v !== "string") return v;
  const s = v.trim();
  if (!s) return v;
  try {
    return JSON.parse(s);
  } catch {
    return v;
  }
}

function normalizeDraftInput(v) {
  // allow null | object | array | JSON-string
  if (v === undefined) return undefined;
  if (v === null) return null;
  if (typeof v === "string") return tryParseJson(v);
  if (typeof v === "object") return v; // includes array
  return null; // reject number/boolean
}

function toStoreValue(colName, v) {
  const attr = Product?.rawAttributes?.[colName];
  const typeKey = String(attr?.type?.key || "").toUpperCase();
  const isJson = typeKey.includes("JSON");

  if (v === undefined) return undefined;
  if (v === null) return null;

  // JSON 欄位：存 object/array
  if (isJson) return typeof v === "string" ? tryParseJson(v) : v;

  // TEXT / STRING：一律存 JSON 字串
  if (typeof v === "string") return v;
  try {
    return JSON.stringify(v);
  } catch {
    return null;
  }
}

/* ---------------- planned sync helpers ---------------- */
function inferPlannedKey() {
  // ✅ 你目前 TestCase 有 isPlanned；這裡保留推斷以相容舊欄位
  const candidates = [
    "isPlanned",
    "planned",
    "selected",
    "isSelected",
    "included",
    "isShown",
    "shown",
    "show",
    "visible",
    "enabled",
    "isEnabled",
  ];
  for (const k of candidates) if (hasAttr(TestCase, k)) return k;
  return null;
}

/**
 * 從 draft 嘗試抓出「被選到 / shown / planned」的 testCase ids
 */
function extractPlannedIdsFromDraft(draft) {
  const result = { found: false, ids: [] };
  if (!draft || typeof draft !== "object") return result;

  const IDS_KEYS = new Set(["plannedIds", "selectedIds", "ids", "testCaseIds", "tcIds", "includeIds", "shownIds"]);
  const LIST_KEYS = new Set(["items", "rows", "data", "list", "testCases", "cases", "tcs", "planned", "selected"]);

  const FLAG_KEYS = [
    "isPlanned",
    "planned",
    "selected",
    "isSelected",
    "included",
    "include",
    "checked",
    "enabled",
    "show",
    "shown",
    "visible",
  ];

  const out = new Set();

  const pushId = (x) => {
    const n = Number(x);
    if (Number.isFinite(n) && n > 0) out.add(n);
  };

  const walk = (node, parentKey = "") => {
    if (!node) return;

    if (Array.isArray(node)) {
      // array 掛在 ids 類 key 下 → 視為 id list
      if (parentKey && IDS_KEYS.has(parentKey)) {
        result.found = true;
        for (const x of node) pushId(x);
        return;
      }
      // 否則視為 item list
      for (const x of node) walk(x, "");
      return;
    }

    if (typeof node !== "object") return;

    // 直接命中 ids key
    for (const k of Object.keys(node)) {
      if (IDS_KEYS.has(k) && Array.isArray(node[k])) {
        result.found = true;
        for (const x of node[k]) pushId(x);
      }
    }

    // item 物件：{id, selected:true}
    const id = Number(node.id ?? node.testCaseId ?? node.tcId ?? 0) || 0;
    if (id) {
      for (const fk of FLAG_KEYS) {
        if (Object.prototype.hasOwnProperty.call(node, fk)) {
          result.found = true;
          if (node[fk]) out.add(id);
          break;
        }
      }
    }

    // 往下走
    for (const [k, v] of Object.entries(node)) {
      if (typeof v === "object") {
        walk(v, IDS_KEYS.has(k) ? k : LIST_KEYS.has(k) ? k : "");
      }
    }
  };

  walk(draft, "");

  result.ids = Array.from(out);
  return result;
}

/**
 * ✅ 把 draft 的選取結果同步到 test_cases.<plannedKey>
 */
async function syncPlannedFromDraft(productId, draftObj) {
  const plannedKey = inferPlannedKey();
  if (!plannedKey) return { applied: false, reason: "No planned key on TestCase" };
  if (!TestCase) return { applied: false, reason: "No TestCase model" };

  const { found, ids } = extractPlannedIdsFromDraft(draftObj);
  if (!found) return { applied: false, reason: "Draft has no parsable planned ids" };

  const whereBase = { productId: Number(productId) };
  if (hasAttr(TestCase, "isDeleted")) whereBase.isDeleted = false;

  // ids 可能空：代表全部取消 → 全設 false
  if (!ids.length) {
    await TestCase.update({ [plannedKey]: false }, { where: whereBase });
    return { applied: true, plannedCount: 0 };
  }

  await TestCase.update({ [plannedKey]: true }, { where: { ...whereBase, id: { [Op.in]: ids } } });
  await TestCase.update({ [plannedKey]: false }, { where: { ...whereBase, id: { [Op.notIn]: ids } } });

  return { applied: true, plannedCount: ids.length };
}

/* ---------------- v0006 aligned progress (Shown/DB) ---------------- */
const V6_GROUP_TO_CAT = {
  hw: ["HW"],
  perf: ["PERF"],
  reli: ["RELI"],
  stab: ["STAB"],
  pwr: ["PWR"],
  thrm: ["THRM"],
  esd: ["ESD"],
  mep: ["MEP"],
};

function normCat(v) {
  const s = String(v ?? "").trim().toUpperCase();
  if (!s) return "";
  if (s === "RELIABILITY") return "RELI";
  if (s === "THERM" || s === "THERMAL" || s === "THERMALPROFILE") return "THRM";
  if (s === "POWER" || s === "POWERCONSUMPTION") return "PWR";
  return s;
}

function isDoneResult(v) {
  const s = String(v ?? "").trim().toLowerCase();
  return s === "pass" || s === "fail" || s === "na" || s === "n/a";
}

function round1(x) {
  const n = Number(x);
  return Number.isFinite(n) ? Math.round(n * 10) / 10 : 0;
}
function round2(x) {
  const n = Number(x);
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : 0;
}

/**
 * ✅ 推斷 TestCase 工時欄位（抓到哪個就用哪個）
 */
function inferHoursKey() {
  const candidates = [
    "workHrs", // ✅ 你目前用這個
    "workHours",
    "manHours",
    "estimatedHours",
    "estHours",
    "planHours",
    "hours",
    "hour",
  ];
  for (const k of candidates) if (hasAttr(TestCase, k)) return k;
  return null;
}

function getHoursFromRow(r, hoursKey) {
  if (!hoursKey) return 0;
  const n = Number(r?.[hoursKey]);
  return Number.isFinite(n) ? n : 0;
}

/**
 * 從 ReportMeta.flagsJson 推斷「Shown 的群組」
 */
function buildShownCatSetFromMeta(meta) {
  const flags = meta?.flagsJson ?? null;
  if (!flags || typeof flags !== "object") return null;

  if (flags.sections && typeof flags.sections === "object") {
    const enabledGroups = Object.keys(V6_GROUP_TO_CAT).filter((k) => flags.sections[k] !== false);
    const cats = enabledGroups.flatMap((g) => V6_GROUP_TO_CAT[g] || []);
    return new Set(cats);
  }

  const mapOld = {
    section2Enabled: "hw",
    section3Enabled: "perf",
    section4Enabled: "reli",
    section5Enabled: "stab",
    section6Enabled: "pwr",
    section7Enabled: "thrm",
    section8Enabled: "esd",
    section9Enabled: "mep",
  };

  const touched = Object.keys(mapOld).some((k) => Object.prototype.hasOwnProperty.call(flags, k));
  if (!touched) return null;

  const enabledGroups = Object.entries(mapOld)
    .filter(([k]) => flags[k] !== false)
    .map(([, g]) => g);

  const cats = enabledGroups.flatMap((g) => V6_GROUP_TO_CAT[g] || []);
  return new Set(cats);
}

/**
 * ✅ v0006 aligned progress map
 */
async function calcProgressV0006Map(_models, productsPlain) {
  const out = new Map();
  const ids = (productsPlain || []).map((p) => Number(p.id)).filter(Boolean);
  if (!ids.length || !TestCase) return out;

  const hoursKey = inferHoursKey();

  const shownSetMap = new Map();
  for (const p of productsPlain) {
    shownSetMap.set(Number(p.id), buildShownCatSetFromMeta(p?.meta));
  }

  const attrs = ["productId", "category", "result", "isPlanned"];
  if (hoursKey) attrs.push(hoursKey);

  const rows = await TestCase.unscoped().findAll({
    where: { productId: { [Op.in]: ids }, isDeleted: false },
    attributes: attrs,
    raw: true,
  });

  const c = new Map();
  for (const id of ids) {
    c.set(id, {
      dbT: 0,
      dbD: 0,
      shT: 0,
      shD: 0,
      dbH: 0,
      shH: 0,
      dbHD: 0,
      shHD: 0,
    });
  }

  for (const r of rows) {
    const pid = Number(r.productId);
    if (!pid || !c.has(pid)) continue;

    const st = c.get(pid);
    st.dbT++;

    const done = isDoneResult(r.result);
    if (done) st.dbD++;

    const h = getHoursFromRow(r, hoursKey);
    st.dbH += h;
    if (done) st.dbHD += h;

    const shownSet = shownSetMap.get(pid) || null;
    const cat = normCat(r.category);

    const plannedOk = !!r.isPlanned;
    const catOk = !shownSet || shownSet.has(cat);

    if (plannedOk && catOk) {
      st.shT++;
      if (done) st.shD++;
      st.shH += h;
      if (done) st.shHD += h;
    }
  }

  for (const [pid, st] of c.entries()) {
    const shownPct = st.shT ? round1((st.shD * 100) / st.shT) : 0;
    const dbPct = st.dbT ? round1((st.dbD * 100) / st.dbT) : 0;

    const shTotal = round2(st.shH);
    const shDone = round2(st.shHD);
    const dbTotal = round2(st.dbH);
    const dbDone = round2(st.dbHD);

    out.set(pid, {
      progressShown: { finished: st.shD, total: st.shT, percent: shownPct },
      progressDb: { finished: st.dbD, total: st.dbT, percent: dbPct },

      hoursShown: shTotal,
      hoursDb: dbTotal,

      hoursShownDone: shDone,
      hoursDbDone: dbDone,

      hoursShownRemain: Math.max(0, round2(shTotal - shDone)),
      hoursDbRemain: Math.max(0, round2(dbTotal - dbDone)),

      hoursKey,
    });
  }

  return out;
}

/* ------------------------------------------------------------
 * GET /api/products
 * ---------------------------------------------------------- */
router.get("/", authMiddleware, async (req, res) => {
  try {
    const page = Math.max(1, toInt(req.query.page, 1));
    const pageSize = Math.min(200, Math.max(1, toInt(req.query.pageSize, 20)));
    const includeDeleted = toBool(req.query.includeDeleted, false);
    const keyword = clean(req.query.keyword);

    const where = {};
    if (keyword) {
      where[Op.or] = [
        { name: { [Op.like]: `%${keyword}%` } },
        { model: { [Op.like]: `%${keyword}%` } },
      ];
    }

    let P = includeDeleted ? Product.unscoped() : Product;
    if (includeDeleted && Product?.options?.scopes?.withDeleted) {
      P = Product.unscoped().scope("withDeleted");
    }

    const canIncludeMeta = !!(ReportMeta && Product?.associations?.meta);

    const { rows, count } = await P.findAndCountAll({
      where,
      limit: pageSize,
      offset: (page - 1) * pageSize,
      order: [["createdAt", "DESC"]],
      include: [
        {
          model: User,
          as: "creator",
          attributes: ["id", "username", "name"],
          required: false,
        },
        ...(canIncludeMeta
          ? [
              {
                model: ReportMeta,
                as: "meta",
                attributes: ["id", "flagsJson"],
                required: false,
              },
            ]
          : []),
      ],
    });

    const plain = rows.map((r) => r.toJSON());

    const v6Map = await calcProgressV0006Map(models, plain);

    for (const p of plain) {
      const v6 = v6Map.get(Number(p.id)) || {
        progressShown: { finished: 0, total: 0, percent: 0 },
        progressDb: { finished: 0, total: 0, percent: 0 },
        hoursShown: 0,
        hoursDb: 0,
        hoursShownDone: 0,
        hoursDbDone: 0,
        hoursShownRemain: 0,
        hoursDbRemain: 0,
        hoursKey: null,
      };

      p.progressShown = v6.progressShown;
      p.progressDb = v6.progressDb;

      // ✅ 清單主要顯示：Shown
      p.progress = v6.progressShown;

      // ✅ 測試工時：未完成 / 總（Shown）
      p.testHoursRemain = v6.hoursShownRemain || 0;
      p.testHoursTotal = v6.hoursShown || 0;
      p.totalTestHours = p.testHoursTotal;

      // ✅ DB tooltip 用
      p.testHoursDbRemain = v6.hoursDbRemain || 0;
      p.testHoursDbTotal = v6.hoursDb || 0;

      p.testHoursDone = v6.hoursShownDone || 0;
      p.testHoursDbDone = v6.hoursDbDone || 0;

      p._hoursKey = v6.hoursKey || null;

      if (hasAttr(Product, "progress") && v6.progressShown.total > 0) {
        Product.update({ progress: v6.progressShown.percent }, { where: { id: p.id } }).catch(() => {});
      }
    }

    return res.json({
      success: true,
      rows: plain,
      total: typeof count === "number" ? count : count?.length || plain.length,
      page,
      pageSize,
    });
  } catch (e) {
    console.error("❌ GET /api/products:", e);
    return res.status(500).json({ success: false, message: "Failed to load products" });
  }
});

/* ------------------------------------------------------------
 * GET /api/products/:id
 * ---------------------------------------------------------- */
router.get("/:id(\\d+)", authMiddleware, async (req, res) => {
  try {
    const id = toInt(req.params.id, 0);
    if (!id) return res.status(400).json({ success: false, message: "Bad id" });

    const includeDeleted = toBool(req.query.includeDeleted, false);

    let P = includeDeleted ? Product.unscoped() : Product;
    if (includeDeleted && Product?.options?.scopes?.withDeleted) {
      P = Product.unscoped().scope("withDeleted");
    }

    const canIncludeMeta = !!(ReportMeta && Product?.associations?.meta);

    const row = await P.findByPk(id, {
      include: [
        {
          model: User,
          as: "creator",
          attributes: ["id", "username", "name"],
          required: false,
        },
        ...(canIncludeMeta
          ? [
              {
                model: ReportMeta,
                as: "meta",
                attributes: ["id", "flagsJson"],
                required: false,
              },
            ]
          : []),
      ],
    });

    if (!row) return res.status(404).json({ success: false, message: "Not found" });

    const data = row.toJSON();

    const v6Map = await calcProgressV0006Map(models, [data]);
    const v6 = v6Map.get(Number(id)) || {
      progressShown: { finished: 0, total: 0, percent: 0 },
      progressDb: { finished: 0, total: 0, percent: 0 },
      hoursShown: 0,
      hoursDb: 0,
      hoursShownDone: 0,
      hoursDbDone: 0,
      hoursShownRemain: 0,
      hoursDbRemain: 0,
      hoursKey: null,
    };

    data.progressShown = v6.progressShown;
    data.progressDb = v6.progressDb;
    data.progress = v6.progressShown;

    data.testHoursRemain = v6.hoursShownRemain || 0;
    data.testHoursTotal = v6.hoursShown || 0;

    data.testHoursDbRemain = v6.hoursDbRemain || 0;
    data.testHoursDbTotal = v6.hoursDb || 0;

    data.totalTestHours = data.testHoursTotal;
    data._hoursKey = v6.hoursKey || null;

    data.progressPlanned = await calcProgressOne(models, id);

    return res.json({ success: true, data });
  } catch (e) {
    console.error("❌ GET /api/products/:id:", e);
    return res.status(500).json({ success: false, message: "Failed to load product" });
  }
});

/* ------------------------------------------------------------
 * GET /api/products/:id/progress
 * ---------------------------------------------------------- */
router.get("/:id(\\d+)/progress", authMiddleware, async (req, res) => {
  try {
    const id = toInt(req.params.id, 0);
    if (!id) return res.status(400).json({ success: false, message: "Bad id" });

    const canIncludeMeta = !!(ReportMeta && Product?.associations?.meta);

    const product = await Product.unscoped().findByPk(id, {
      include: canIncludeMeta
        ? [{ model: ReportMeta, as: "meta", attributes: ["id", "flagsJson"], required: false }]
        : [],
    });
    if (!product) return res.status(404).json({ success: false, message: "Not found" });

    const data = product.toJSON();

    const v6Map = await calcProgressV0006Map(models, [data]);
    const v6 = v6Map.get(Number(id)) || {
      progressShown: { finished: 0, total: 0, percent: 0 },
      progressDb: { finished: 0, total: 0, percent: 0 },
      hoursShown: 0,
      hoursDb: 0,
      hoursShownDone: 0,
      hoursDbDone: 0,
      hoursShownRemain: 0,
      hoursDbRemain: 0,
      hoursKey: null,
    };

    if (hasAttr(Product, "progress") && v6.progressShown?.total > 0) {
      await Product.update({ progress: v6.progressShown.percent }, { where: { id } });
    }

    return res.json({
      success: true,
      progressShown: v6.progressShown,
      progressDb: v6.progressDb,

      testHoursRemain: v6.hoursShownRemain || 0,
      testHoursTotal: v6.hoursShown || 0,
      testHoursDbRemain: v6.hoursDbRemain || 0,
      testHoursDbTotal: v6.hoursDb || 0,

      _hoursKey: v6.hoursKey || null,
    });
  } catch (e) {
    console.error("❌ GET /api/products/:id/progress:", e);
    return res.status(500).json({ success: false, message: "Failed to calc progress" });
  }
});

/* ------------------------------------------------------------
 * GET /api/products/:id/test-plan-draft
 * ---------------------------------------------------------- */
router.get("/:id(\\d+)/test-plan-draft", authMiddleware, async (req, res) => {
  try {
    const id = toInt(req.params.id, 0);
    if (!id) return res.status(400).json({ success: false, message: "Bad id" });

    const draftCol = inferDraftCol();
    const updatedCol = inferDraftUpdatedCol();

    if (!draftCol) {
      return res.status(400).json({
        success: false,
        message: "Product model has no draft column (testPlanDraft/planDraft/draft). Please add migration.",
      });
    }

    const product = await Product.unscoped().findByPk(id);
    if (!product) return res.status(404).json({ success: false, message: "Not found" });

    if (!ensureOwnerOrAdmin(product, req.user)) {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }

    let draft = product[draftCol];
    if (typeof draft === "string") draft = tryParseJson(draft);

    const updatedAt = updatedCol ? product[updatedCol] : null;

    return res.json({
      success: true,
      draft: draft ?? null,
      updatedAt: updatedAt ?? null,
    });
  } catch (e) {
    console.error("❌ GET /api/products/:id/test-plan-draft:", e);
    return res.status(500).json({ success: false, message: "Failed to load draft" });
  }
});

/* ------------------------------------------------------------
 * PUT /api/products/:id/test-plan-draft
 * ---------------------------------------------------------- */
router.put("/:id(\\d+)/test-plan-draft", authMiddleware, async (req, res) => {
  try {
    const id = toInt(req.params.id, 0);
    if (!id) return res.status(400).json({ success: false, message: "Bad id" });

    const draftCol = inferDraftCol();
    const updatedCol = inferDraftUpdatedCol();

    if (!draftCol) {
      return res.status(400).json({
        success: false,
        message: "Product model has no draft column (testPlanDraft/planDraft/draft). Please add migration.",
      });
    }

    const product = await Product.unscoped().findByPk(id);
    if (!product) return res.status(404).json({ success: false, message: "Not found" });

    if (!ensureOwnerOrAdmin(product, req.user)) {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }

    let incoming;
    if (req.body && typeof req.body === "object") {
      if (Object.prototype.hasOwnProperty.call(req.body, "draft")) incoming = req.body.draft;
      else if (Object.prototype.hasOwnProperty.call(req.body, "data")) incoming = req.body.data;
      else incoming = req.body;
    } else {
      incoming = req.body;
    }

    if (incoming === undefined) {
      return res.status(400).json({ success: false, message: "Missing draft in request body" });
    }

    const normalized = normalizeDraftInput(incoming);
    if (normalized !== null && normalized !== undefined && typeof normalized !== "object") {
      return res.status(400).json({ success: false, message: "Draft must be object/array/string(json) or null" });
    }

    const patch = {};
    patch[draftCol] = toStoreValue(draftCol, normalized);
    if (updatedCol) patch[updatedCol] = new Date();

    await Product.update(patch, { where: { id } });

    let sync = null;
    try {
      sync = await syncPlannedFromDraft(id, normalized);

      if (sync?.applied && hasAttr(Product, "progress")) {
        const canIncludeMeta = !!(ReportMeta && Product?.associations?.meta);
        const p2 = await Product.unscoped().findByPk(id, {
          include: canIncludeMeta
            ? [{ model: ReportMeta, as: "meta", attributes: ["id", "flagsJson"], required: false }]
            : [],
        });

        const data = p2 ? p2.toJSON() : { id, meta: null };
        const v6Map = await calcProgressV0006Map(models, [data]);
        const v6 = v6Map.get(Number(id));

        if (v6?.progressShown?.total > 0) {
          await Product.update({ progress: v6.progressShown.percent }, { where: { id } });
        } else {
          const info = await calcProgressOne(models, id);
          if (info?.total > 0) await Product.update({ progress: info.percent }, { where: { id } });
        }
      }
    } catch (err) {
      console.error("⚠️ syncPlannedFromDraft failed:", err);
      sync = { applied: false, reason: err?.message || "sync failed" };
    }

    return res.json({
      success: true,
      message: "Draft saved",
      draft: normalized ?? null,
      sync,
    });
  } catch (e) {
    console.error("❌ PUT /api/products/:id/test-plan-draft:", e);
    return res.status(500).json({ success: false, message: "Failed to save draft" });
  }
});

/* ------------------------------------------------------------
 * POST /api/products
 * ✅ 加入 testType
 * ---------------------------------------------------------- */
router.post("/", authMiddleware, async (req, res) => {
  try {
    const name = clean(req.body?.name);
    const model = clean(req.body?.model);
    const createdBy = req.user?.id;

    // ✅ 新增：testType（前端會送 x86 / arm / display / part）
    const incomingType = normalizeTestType(req.body?.testType);
    const testType = hasAttr(Product, "testType") ? incomingType : undefined;

    if (!name) return res.status(400).json({ success: false, message: "name required" });
    if (!model) return res.status(400).json({ success: false, message: "model required" });
    if (!createdBy) return res.status(401).json({ success: false, message: "Unauthorized" });

    const payload = { name, model, createdBy };
    if (testType !== undefined) payload.testType = testType;

    const p = await Product.create(payload);
    return res.json({ success: true, data: p });
  } catch (e) {
    console.error("❌ POST /api/products:", e);
    return res.status(500).json({ success: false, message: "Failed to create product" });
  }
});

/* ------------------------------------------------------------
 * PUT /api/products/:id
 * （預設不允許改 testType）
 * ---------------------------------------------------------- */
router.put("/:id(\\d+)", authMiddleware, async (req, res) => {
  try {
    const id = toInt(req.params.id, 0);
    if (!id) return res.status(400).json({ success: false, message: "Bad id" });

    const row = await Product.unscoped().findByPk(id);
    if (!row) return res.status(404).json({ success: false, message: "Not found" });

    if (!ensureOwnerOrAdmin(row, req.user)) {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }

    const name = clean(req.body?.name);
    const model = clean(req.body?.model);
    if (!name) return res.status(400).json({ success: false, message: "name required" });
    if (!model) return res.status(400).json({ success: false, message: "model required" });

    const patch = { name, model };

    // ✅ 若你真的要允許修改 testType，打開這段：
    // if (hasAttr(Product, "testType") && req.body?.testType !== undefined) {
    //   patch.testType = normalizeTestType(req.body.testType);
    // }

    await Product.update(patch, { where: { id } });
    return res.json({ success: true, message: "Updated" });
  } catch (e) {
    console.error("❌ PUT /api/products/:id:", e);
    return res.status(500).json({ success: false, message: "Failed to update product" });
  }
});

/* ------------------------------------------------------------
 * DELETE /api/products/:id
 * ---------------------------------------------------------- */
router.delete("/:id(\\d+)", authMiddleware, async (req, res) => {
  try {
    const id = toInt(req.params.id, 0);
    if (!id) return res.status(400).json({ success: false, message: "Bad id" });

    const row = await Product.unscoped().findByPk(id);
    if (!row) return res.status(404).json({ success: false, message: "Not found" });

    if (!ensureOwnerOrAdmin(row, req.user)) {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }

    if (hasAttr(Product, "isDeleted")) {
      await Product.update({ isDeleted: true }, { where: { id } });
      return res.json({ success: true, message: "Deleted" });
    }

    await Product.destroy({ where: { id } });
    return res.json({ success: true, message: "Deleted (hard)" });
  } catch (e) {
    console.error("❌ DELETE /api/products/:id:", e);
    return res.status(500).json({ success: false, message: "Failed to delete product" });
  }
});

/* ------------------------------------------------------------
 * PATCH /api/products/:id/restore
 * ---------------------------------------------------------- */
router.patch("/:id(\\d+)/restore", authMiddleware, async (req, res) => {
  try {
    const id = toInt(req.params.id, 0);
    if (!id) return res.status(400).json({ success: false, message: "Bad id" });

    const row = await Product.unscoped().findByPk(id);
    if (!row) return res.status(404).json({ success: false, message: "Not found" });

    if (!ensureOwnerOrAdmin(row, req.user)) {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }

    if (!hasAttr(Product, "isDeleted")) {
      return res.status(400).json({ success: false, message: "Product has no isDeleted column" });
    }

    await Product.update({ isDeleted: false }, { where: { id } });
    return res.json({ success: true, message: "Restored" });
  } catch (e) {
    console.error("❌ PATCH /api/products/:id/restore:", e);
    return res.status(500).json({ success: false, message: "Failed to restore product" });
  }
});

export default router;
