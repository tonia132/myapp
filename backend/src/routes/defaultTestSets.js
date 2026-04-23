// backend/src/routes/defaultTestSets.js
import express from "express";
import { Op } from "sequelize";
import authMiddleware from "../middleware/authMiddleware.js";
import * as models from "../models/index.js";
import { logAction } from "../utils/logAction.js";

const router = express.Router();

const { sequelize, DefaultTestSet, DefaultTestSetItem, Product, TestCase } = models;

/* ---------------- helpers ---------------- */
const clean = (v) => String(v ?? "").trim();
const lower = (v) => clean(v).toLowerCase();

const toBool = (v, def = false) => {
  if (v === true || v === false) return v;
  const s = String(v ?? "").toLowerCase().trim();
  if (["1", "true", "yes", "y", "on"].includes(s)) return true;
  if (["0", "false", "no", "n", "off", ""].includes(s)) return false;
  return def;
};

const toInt = (v, def = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.floor(n) : def;
};

const toNum = (v, def = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : def;
};

function clampInt(v, def, min, max) {
  const n = toInt(v, def);
  return Math.max(min, Math.min(max, n));
}

function hasAttr(model, key) {
  return !!model?.rawAttributes?.[key];
}

function isAdmin(u) {
  return String(u?.role || "").toLowerCase() === "admin";
}

function canManageSet(user, setRow) {
  if (isAdmin(user)) return true;
  const ownerId = setRow?.createdBy ?? null;
  if (!ownerId) return false;
  return Number(ownerId) === Number(user?.id);
}

function pickExisting(model, src, keys) {
  const out = {};
  for (const k of keys) {
    if (hasAttr(model, k) && src?.[k] !== undefined) out[k] = src[k];
  }
  return out;
}

/* ---- soft delete helpers ---- */
function inferSoftDeleteField(model) {
  if (!model) return null;
  if (hasAttr(model, "isDeleted")) return "isDeleted";
  if (hasAttr(model, "deleted")) return "deleted";
  if (hasAttr(model, "deletedAt")) return "deletedAt";
  return null;
}

function applyNotDeletedWhere(model, where) {
  const f = inferSoftDeleteField(model);
  if (!f) return where;
  if (f === "deletedAt") where[f] = { [Op.is]: null };
  else where[f] = { [Op.ne]: true };
  return where;
}

function applyIncludeDeleted(model, where, includeDeleted) {
  if (includeDeleted) return where;
  return applyNotDeletedWhere(model, where);
}

/* ---- testCase getter fallback ---- */
function tcGet(tc, keys) {
  for (const k of keys) {
    if (tc?.[k] !== undefined) return tc[k];
  }
  return undefined;
}

/* ✅ DefaultTestSet 名稱欄位自動偵測（避免 DB 用 title 而非 name） */
function getSetNameCol() {
  if (hasAttr(DefaultTestSet, "name")) return "name";
  if (hasAttr(DefaultTestSet, "title")) return "title";
  return "name";
}

function normStr(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/[\s\-_]+/g, "");
}

/* ---------------- preset key ---------------- */
function parsePresetKey(rawKey) {
  const key = clean(rawKey);
  if (!key) return { key: "", version: null, rev: null, preset: null };

  const norm = key.toLowerCase().replace(/\s+/g, "");

  const verMatch = norm.match(/(?:^|[^0-9])([0-9]{4})(?:$|[^0-9])/);
  const version = verMatch?.[1] || null;

  const vTokens = [...norm.matchAll(/v(\d+)/g)].map((m) => m[1]);
  let rev = null;
  for (let i = vTokens.length - 1; i >= 0; i--) {
    const tok = vTokens[i];
    if (tok && tok.length <= 2) {
      rev = tok;
      break;
    }
  }
  const preset = rev ? `V${rev}` : null;

  return { key, version, rev, preset };
}

function buildPresetWhere(rawKey, nameCol) {
  const { key, version, rev, preset } = parsePresetKey(rawKey);
  if (!key) return null;

  const or = [];

  or.push({ [nameCol]: key });
  or.push({ [nameCol]: { [Op.like]: `%${key}%` } });

  if (version && hasAttr(DefaultTestSet, "version")) {
    if (preset && hasAttr(DefaultTestSet, "preset")) or.push({ [Op.and]: [{ version }, { preset }] });
    else or.push({ version });
  }

  if (version) {
    or.push({
      [Op.or]: [
        { [nameCol]: { [Op.like]: `%${version}%` } },
        { [nameCol]: { [Op.like]: `%v${version}%` } },
        { [nameCol]: { [Op.like]: `%V${version}%` } },
      ],
    });
  }

  if (rev) {
    or.push({
      [Op.or]: [
        { [nameCol]: { [Op.like]: `%V${rev}%` } },
        { [nameCol]: { [Op.like]: `%v${rev}%` } },
      ],
    });
  }

  if (version && rev) {
    or.push({
      [Op.and]: [
        { [nameCol]: { [Op.like]: `%${version}%` } },
        {
          [Op.or]: [
            { [nameCol]: { [Op.like]: `%V${rev}%` } },
            { [nameCol]: { [Op.like]: `%v${rev}%` } },
          ],
        },
      ],
    });
  }

  return { [Op.or]: or };
}

/* ---------------- items: infer fk/order col ---------------- */
function inferItemFk() {
  if (!DefaultTestSetItem) return null;
  if (hasAttr(DefaultTestSetItem, "testSetId")) return "testSetId";
  if (hasAttr(DefaultTestSetItem, "defaultTestSetId")) return "defaultTestSetId";
  return null;
}

function inferItemOrderCol() {
  if (!DefaultTestSetItem) return null;
  if (hasAttr(DefaultTestSetItem, "orderNo")) return "orderNo";
  if (hasAttr(DefaultTestSetItem, "sortOrder")) return "sortOrder";
  if (hasAttr(DefaultTestSetItem, "order")) return "order";
  return null;
}

function sanitizeMeta(meta) {
  if (!meta || typeof meta !== "object") return null;
  // 避免塞爆 DB：只保留前 50 keys、字串上限
  const out = {};
  const keys = Object.keys(meta).slice(0, 50);
  for (const k of keys) {
    const v = meta[k];
    if (v == null) continue;
    if (typeof v === "string") out[k] = v.length > 2000 ? v.slice(0, 2000) : v;
    else if (typeof v === "number" || typeof v === "boolean") out[k] = v;
    else if (Array.isArray(v)) out[k] = v.slice(0, 50);
    else if (typeof v === "object") out[k] = "[object]";
    else out[k] = String(v);
  }
  return out;
}

function sanitizeItem(it, idx = 0) {
  const s = (v, max = 2000) => {
    const t = clean(v);
    return t.length > max ? t.slice(0, max) : t;
  };

  const est = toNum(it?.estHours ?? 0, 0);
  const planned = it?.isPlanned !== false;

  return {
    category: s(it?.category, 64),
    section: s(it?.section, 128),
    code: s(it?.code, 64),
    testCase: s(it?.testCase ?? it?.name ?? "", 500),
    testProcedure: s(it?.testProcedure, 5000),
    testCriteria: s(it?.testCriteria, 5000),
    estHours: est < 0 ? 0 : est,
    isPlanned: planned,
    orderNo: toInt(it?.orderNo ?? idx, idx),
  };
}

/**
 * 優先讀 DefaultTestSetItem，沒有才 fallback DefaultTestSet JSON 欄位
 */
async function loadItemsForSet(setId, setInstance) {
  let items = [];

  // 1) DefaultTestSetItem
  if (DefaultTestSetItem) {
    const fk = inferItemFk();
    if (fk) {
      const orderCol = inferItemOrderCol();
      const order = [];
      if (orderCol) order.push([orderCol, "ASC"]);
      order.push(["id", "ASC"]);

      const rows = await DefaultTestSetItem.findAll({
        where: { [fk]: setId },
        order,
        raw: true,
      });

      items = rows.map((it) => ({
        category: it.category ?? "",
        section: it.section ?? "",
        code: it.code ?? "",
        testCase: it.testCase ?? it.name ?? "",
        testProcedure: it.testProcedure ?? "",
        testCriteria: it.testCriteria ?? "",
        estHours: Number(it.estHours ?? 0) || 0,
        isPlanned: it.isPlanned !== false,
        orderNo: Number(it.orderNo ?? it.sortOrder ?? it.order ?? 0) || 0,
      }));
    }
  }

  // 2) fallback：舊 JSON 欄位
  if (!items.length && setInstance) {
    const col =
      ["testCases", "itemsJson", "items", "data", "payload", "content"].find((c) => hasAttr(DefaultTestSet, c)) ||
      null;

    if (col) {
      const raw = setInstance[col];
      if (Array.isArray(raw)) items = raw;
      else if (typeof raw === "string") {
        try {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) items = parsed;
        } catch {}
      } else if (raw && typeof raw === "object") {
        if (Array.isArray(raw.items)) items = raw.items;
      }
      if (!Array.isArray(items)) items = [];
    }
  }

  // normalize
  items = items.map((x, idx) => sanitizeItem(x, idx));

  return items;
}

/* ---------------- ETag (optimistic lock) ---------------- */
function buildEtagFromRow(row) {
  const t = row?.updatedAt ? new Date(row.updatedAt).getTime() : 0;
  const id = row?.id ?? 0;
  return `"set-${id}-${t}"`;
}

function getClientEtag(req) {
  return (
    (req.headers["if-match"] ? String(req.headers["if-match"]) : "") ||
    (req.body?.meta?.etag ? String(req.body.meta.etag) : "")
  ).trim();
}

/* ---------------- list ---------------- */
// GET /api/default-test-sets?kw=&keyword=&mine=&includeDeleted=&page=&pageSize=&withItemsCount=
router.get("/", authMiddleware, async (req, res) => {
  try {
    if (!DefaultTestSet) return res.json({ success: true, data: [], meta: { count: 0 } });

    const kw = clean(req.query?.kw || req.query?.keyword || "");
    const mine = toBool(req.query?.mine, false);
    const includeDeleted = toBool(req.query?.includeDeleted, false);

    const page = clampInt(req.query?.page, 1, 1, 100000);
    const pageSize = clampInt(req.query?.pageSize, 200, 1, 500);
    const withItemsCount = toBool(req.query?.withItemsCount, false);

    const where = {};
    if (mine && hasAttr(DefaultTestSet, "createdBy")) where.createdBy = req.user?.id;
    applyIncludeDeleted(DefaultTestSet, where, includeDeleted);

    const nameCol = getSetNameCol();
    if (kw) {
      const or = [];
      if (hasAttr(DefaultTestSet, nameCol)) or.push({ [nameCol]: { [Op.like]: `%${kw}%` } });
      if (hasAttr(DefaultTestSet, "description")) or.push({ description: { [Op.like]: `%${kw}%` } });
      if (or.length) where[Op.or] = or;
    }

    const include = [];
    if (Product && hasAttr(DefaultTestSet, "fromProductId")) {
      const ProductJoin =
        includeDeleted && typeof Product?.unscoped === "function" ? Product.unscoped() : Product;

      include.push({
        model: ProductJoin,
        as: "sourceProduct", // ✅ models/index.js alias 必須是 sourceProduct
        required: false,
        attributes: ["id", "name", "model"],
      });
    }

    const { rows, count } = await DefaultTestSet.findAndCountAll({
      where,
      include,
      order: [["updatedAt", "DESC"], ["id", "DESC"]],
      limit: pageSize,
      offset: (page - 1) * pageSize,
    });

    // itemsCount（避免每筆再查 DB：用 DefaultTestSetItem 的 group count）
    let countMap = null;
    if (withItemsCount && DefaultTestSetItem) {
      const fk = inferItemFk();
      if (fk && rows.length) {
        const ids = rows.map((r) => r.id);
        const grouped = await DefaultTestSetItem.findAll({
          where: { [fk]: { [Op.in]: ids } },
          attributes: [[fk, "setId"], [sequelize.fn("COUNT", sequelize.col("id")), "cnt"]],
          group: [fk],
          raw: true,
        });
        countMap = new Map(grouped.map((g) => [Number(g.setId), Number(g.cnt || 0)]));
      }
    }

    const data = rows.map((r) => ({
      id: r.id,
      name: r.name ?? r.title ?? "",
      description: r.description ?? "",
      fromProductId: r.fromProductId ?? null,
      createdBy: r.createdBy ?? null,
      updatedAt: r.updatedAt,
      etag: buildEtagFromRow(r),
      isDeleted: r.isDeleted ?? r.deleted ?? false,
      deletedAt: r.deletedAt ?? null,
      itemsCount: countMap ? (countMap.get(Number(r.id)) ?? 0) : undefined,
      sourceProduct: r.sourceProduct
        ? { id: r.sourceProduct.id, name: r.sourceProduct.name, model: r.sourceProduct.model }
        : null,
    }));

    return res.json({
      success: true,
      data,
      meta: {
        page,
        pageSize,
        count,
      },
    });
  } catch (e) {
    console.error("default-test-sets list failed:", e);
    return res.status(500).json({ success: false, message: e?.message || "List failed" });
  }
});

/* ---------------- resolve by name / preset key ---------------- */
// GET /api/default-test-sets/by-name/:key?includeDeleted=
router.get("/by-name/:key", authMiddleware, async (req, res) => {
  try {
    if (!DefaultTestSet) {
      return res.status(404).json({ success: false, message: "DefaultTestSet model not found" });
    }

    const rawKey = clean(req.params.key);
    const key = (() => {
      try {
        return decodeURIComponent(rawKey);
      } catch {
        return rawKey;
      }
    })();

    const includeDeleted = toBool(req.query?.includeDeleted, false);
    const nameCol = getSetNameCol();

    const baseWhere = buildPresetWhere(key, nameCol) || {};
    applyIncludeDeleted(DefaultTestSet, baseWhere, includeDeleted);

    const tryFindOne = async (where) => {
      return await DefaultTestSet.findOne({
        where,
        order: [["updatedAt", "DESC"], ["id", "DESC"]],
        raw: false,
      });
    };

    let set = null;

    // ✅ 偏好 preset：fromProductId = null
    if (hasAttr(DefaultTestSet, "fromProductId")) {
      set = await tryFindOne({ ...baseWhere, fromProductId: null });
      if (!set) set = await tryFindOne(baseWhere);
    } else {
      set = await tryFindOne(baseWhere);
    }

    // ✅ normalized JS fallback
    if (!set) {
      const { version, rev } = parsePresetKey(key);
      const normKey = normStr(key);

      const coarse = {};
      applyIncludeDeleted(DefaultTestSet, coarse, includeDeleted);

      if (version) coarse[nameCol] = { [Op.like]: `%${version}%` };

      const candidates = await DefaultTestSet.findAll({
        where: coarse,
        order: [["updatedAt", "DESC"], ["id", "DESC"]],
        limit: 200,
        raw: false,
      });

      const scored = candidates
        .map((r) => {
          const nm = String(r?.[nameCol] ?? r?.name ?? r?.title ?? "");
          const n = normStr(nm);

          let score = 0;
          if (n.includes(normKey)) score += 50;
          if (version && n.includes(String(version))) score += 10;
          if (rev && (n.includes(`v${rev}`) || n.includes(`V${rev}`.toLowerCase()))) score += 10;
          if (n.includes("preset")) score += 5;
          if (hasAttr(DefaultTestSet, "fromProductId") && (r.fromProductId == null)) score += 3;

          return { r, score };
        })
        .filter((x) => x.score > 0)
        .sort((a, b) => b.score - a.score || Number(b.r.id) - Number(a.r.id));

      set = scored[0]?.r || null;
    }

    if (!set) {
      return res.status(404).json({ success: false, message: `DefaultTestSet not found (${key})` });
    }

    const items = await loadItemsForSet(set.id, set);

    res.setHeader("ETag", buildEtagFromRow(set));

    return res.json({
      success: true,
      data: {
        id: set.id,
        name: set.name ?? set.title ?? "",
        description: set.description ?? "",
        fromProductId: set.fromProductId ?? null,
        createdBy: set.createdBy ?? null,
        updatedAt: set.updatedAt,
        etag: buildEtagFromRow(set),
        itemsMode: items?.length ? "items" : "empty",
        items,
      },
    });
  } catch (e) {
    console.error("default-test-sets by-name failed:", e);
    return res.status(500).json({ success: false, message: e?.message || "Resolve failed" });
  }
});

/* ---------------- detail ---------------- */
// GET /api/default-test-sets/:id
router.get("/:id(\\d+)", authMiddleware, async (req, res) => {
  try {
    if (!DefaultTestSet) {
      return res.status(404).json({ success: false, message: "DefaultTestSet model not found" });
    }

    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ success: false, message: "Invalid id" });

    const set = await DefaultTestSet.findByPk(id, { raw: false });
    if (!set) return res.status(404).json({ success: false, message: "Not found" });

    const items = await loadItemsForSet(id, set);

    res.setHeader("ETag", buildEtagFromRow(set));

    return res.json({
      success: true,
      data: {
        id: set.id,
        name: set.name ?? set.title ?? "",
        description: set.description ?? "",
        fromProductId: set.fromProductId ?? null,
        createdBy: set.createdBy ?? null,
        updatedAt: set.updatedAt,
        etag: buildEtagFromRow(set),
        itemsMode: items?.length ? "items" : "empty",
        items,
      },
    });
  } catch (e) {
    console.error("default-test-sets detail failed:", e);
    return res.status(500).json({ success: false, message: e?.message || "Load failed" });
  }
});

/* ---------------- create from product ---------------- */
// POST /api/default-test-sets/from-product/:productId
router.post("/from-product/:productId(\\d+)", authMiddleware, async (req, res) => {
  const t = await sequelize.transaction();
  try {
    if (!DefaultTestSet) {
      await t.rollback();
      return res.status(500).json({ success: false, message: "DefaultTestSet model not found" });
    }
    if (!TestCase) {
      await t.rollback();
      return res.status(500).json({ success: false, message: "TestCase model not found" });
    }

    const productId = Number(req.params.productId);
    if (!productId) {
      await t.rollback();
      return res.status(400).json({ success: false, message: "Invalid productId" });
    }

    const plannedOnly = toBool(req.body?.plannedOnly, false);
    const includeDeleted = toBool(req.body?.includeDeleted, false);

    const name = clean(req.body?.name) || `Product #${productId} Test Set`;
    const description = clean(req.body?.description);

    if (name.length > 120) {
      await t.rollback();
      return res.status(400).json({ success: false, message: "Name too long" });
    }

    const where = { productId };
    if (plannedOnly && hasAttr(TestCase, "isPlanned")) where.isPlanned = { [Op.ne]: false };
    applyIncludeDeleted(TestCase, where, includeDeleted);

    const tcs = await TestCase.findAll({ where, order: [["id", "ASC"]], raw: true });

    const items = tcs.map((tc, idx) =>
      sanitizeItem(
        {
          category: tc.category ?? "",
          section: tc.section ?? tc.subGroup ?? tc.group ?? "",
          code: tc.code ?? "",
          testCase: tc.testCase ?? tc.name ?? tc.title ?? "",
          testProcedure: tcGet(tc, ["testProcedure", "procedure", "test_procedure"]) ?? "",
          testCriteria: tcGet(tc, ["testCriteria", "criteria", "test_criteria"]) ?? "",
          estHours: Number(tc.estHours ?? tc.estHrs ?? tc.estimatedHours ?? 0) || 0,
          isPlanned: tc.isPlanned !== false,
          orderNo: toInt(tc.orderNo ?? idx, idx),
        },
        idx
      )
    );

    const setPayload = pickExisting(
      DefaultTestSet,
      {
        name,
        description: description.length > 1000 ? description.slice(0, 1000) : description,
        createdBy: req.user?.id,
        fromProductId: productId,
        meta: sanitizeMeta({ plannedOnly, includeDeleted, source: "from-product" }),
        testCases: items,
      },
      ["name", "description", "createdBy", "fromProductId", "meta", "testCases"]
    );

    if (hasAttr(DefaultTestSet, "testCases") && setPayload.testCases === undefined) {
      setPayload.testCases = items;
    }

    const created = await DefaultTestSet.create(setPayload, { transaction: t });

    // ✅ 同步寫入 DefaultTestSetItem（正統）
    if (DefaultTestSetItem && items.length) {
      const fk = inferItemFk();
      const orderCol = inferItemOrderCol();

      if (fk) {
        const rows = items.map((it) =>
          pickExisting(
            DefaultTestSetItem,
            {
              [fk]: created.id,
              category: it.category,
              section: it.section,
              code: it.code,
              testCase: it.testCase,
              testProcedure: it.testProcedure,
              testCriteria: it.testCriteria,
              estHours: it.estHours,
              isPlanned: it.isPlanned,
              ...(orderCol ? { [orderCol]: it.orderNo } : {}),
              orderNo: it.orderNo, // 若 DB 真的是 orderNo，這行會生效；不是也不會寫入
            },
            [
              fk,
              "category",
              "section",
              "code",
              "testCase",
              "testProcedure",
              "testCriteria",
              "estHours",
              "isPlanned",
              "orderNo",
              "sortOrder",
              "order",
            ]
          )
        );

        if (rows.length) await DefaultTestSetItem.bulkCreate(rows, { transaction: t });
      }
    }

    await t.commit();

    logAction(req.user?.id, "CREATE_FROM_PRODUCT", "defaultTestSets", {
      recordId: created.id,
      meta: { productId, plannedOnly, includeDeleted, items: items.length },
    }).catch(() => {});

    return res.json({ success: true, data: { id: created.id } });
  } catch (e) {
    await t.rollback();
    console.error("create test set from product failed:", e);
    return res.status(500).json({ success: false, message: e?.message || "Create failed" });
  }
});

/* ---------------- optional manual create ---------------- */
// POST /api/default-test-sets
router.post("/", authMiddleware, async (req, res) => {
  const t = await sequelize.transaction();
  try {
    if (!DefaultTestSet) {
      await t.rollback();
      return res.status(500).json({ success: false, message: "DefaultTestSet model not found" });
    }

    const name = clean(req.body?.name) || "Test Set";
    const description = clean(req.body?.description);
    const fromProductId = req.body?.fromProductId ? Number(req.body.fromProductId) : null;

    const itemsIn = Array.isArray(req.body?.items) ? req.body.items : [];
    if (itemsIn.length > 5000) {
      await t.rollback();
      return res.status(400).json({ success: false, message: "Too many items" });
    }
    const items = itemsIn.map((it, idx) => sanitizeItem(it, idx));

    if (!name) {
      await t.rollback();
      return res.status(400).json({ success: false, message: "Name is required" });
    }
    if (name.length > 120) {
      await t.rollback();
      return res.status(400).json({ success: false, message: "Name too long" });
    }

    const setPayload = pickExisting(
      DefaultTestSet,
      {
        name,
        description: description.length > 1000 ? description.slice(0, 1000) : description,
        createdBy: req.user?.id,
        fromProductId: fromProductId || null,
        meta: sanitizeMeta(req.body?.meta ?? null),
        testCases: items,
      },
      ["name", "description", "createdBy", "fromProductId", "meta", "testCases"]
    );

    if (hasAttr(DefaultTestSet, "testCases") && setPayload.testCases === undefined) {
      setPayload.testCases = items;
    }

    const created = await DefaultTestSet.create(setPayload, { transaction: t });

    if (DefaultTestSetItem && items.length) {
      const fk = inferItemFk();
      const orderCol = inferItemOrderCol();

      if (fk) {
        const rows = items.map((it) =>
          pickExisting(
            DefaultTestSetItem,
            {
              [fk]: created.id,
              category: it.category,
              section: it.section,
              code: it.code,
              testCase: it.testCase,
              testProcedure: it.testProcedure,
              testCriteria: it.testCriteria,
              estHours: it.estHours,
              isPlanned: it.isPlanned,
              ...(orderCol ? { [orderCol]: it.orderNo } : {}),
              orderNo: it.orderNo,
            },
            [
              fk,
              "category",
              "section",
              "code",
              "testCase",
              "testProcedure",
              "testCriteria",
              "estHours",
              "isPlanned",
              "orderNo",
              "sortOrder",
              "order",
            ]
          )
        );
        if (rows.length) await DefaultTestSetItem.bulkCreate(rows, { transaction: t });
      }
    }

    await t.commit();

    logAction(req.user?.id, "CREATE", "defaultTestSets", {
      recordId: created.id,
      meta: { fromProductId, items: items.length },
    }).catch(() => {});

    return res.json({ success: true, data: { id: created.id } });
  } catch (e) {
    await t.rollback();
    console.error("create default test set failed:", e);
    return res.status(500).json({ success: false, message: e?.message || "Create failed" });
  }
});

/* ---------------- update (new) ---------------- */
/**
 * PUT /api/default-test-sets/:id
 * body: { name?, description?, fromProductId?, meta?, items? }
 * - items 若提供：會以「全量覆蓋」方式同步 DefaultTestSetItem + (可選) DefaultTestSet.testCases
 * - optimistic lock: If-Match or body.meta.etag
 */
router.put("/:id(\\d+)", authMiddleware, async (req, res) => {
  const t = await sequelize.transaction();
  try {
    if (!DefaultTestSet) {
      await t.rollback();
      return res.status(500).json({ success: false, message: "DefaultTestSet model not found" });
    }

    const id = Number(req.params.id);
    if (!id) {
      await t.rollback();
      return res.status(400).json({ success: false, message: "Invalid id" });
    }

    const set = await DefaultTestSet.findByPk(id, { transaction: t, lock: t.LOCK.UPDATE });
    if (!set) {
      await t.rollback();
      return res.status(404).json({ success: false, message: "Not found" });
    }

    if (!canManageSet(req.user, set)) {
      await t.rollback();
      return res.status(403).json({ success: false, message: "Forbidden" });
    }

    // optimistic lock
    const clientEtag = getClientEtag(req);
    const currentEtag = buildEtagFromRow(set);
    if (clientEtag && String(clientEtag).trim() !== String(currentEtag).trim()) {
      await t.rollback();
      return res.status(409).json({
        success: false,
        message: "資料已被其他人更新，請重新載入後再儲存",
        meta: { etag: currentEtag, updatedAt: set.updatedAt },
      });
    }

    const patch = {};
    if (req.body?.name !== undefined) {
      const nm = clean(req.body.name);
      if (!nm) {
        await t.rollback();
        return res.status(400).json({ success: false, message: "Name is required" });
      }
      if (nm.length > 120) {
        await t.rollback();
        return res.status(400).json({ success: false, message: "Name too long" });
      }
      patch[getSetNameCol()] = nm;
    }

    if (req.body?.description !== undefined) {
      const d = clean(req.body.description);
      patch.description = d.length > 1000 ? d.slice(0, 1000) : d;
    }

    if (req.body?.fromProductId !== undefined && hasAttr(DefaultTestSet, "fromProductId")) {
      const pid = req.body.fromProductId ? Number(req.body.fromProductId) : null;
      patch.fromProductId = pid || null;
    }

    if (req.body?.meta !== undefined && hasAttr(DefaultTestSet, "meta")) {
      patch.meta = sanitizeMeta(req.body.meta);
    }

    // update base
    if (Object.keys(patch).length) {
      await set.update(pickExisting(DefaultTestSet, patch, Object.keys(patch)), { transaction: t });
    }

    // items overwrite
    let wroteItems = false;
    if (req.body?.items !== undefined) {
      const itemsIn = Array.isArray(req.body.items) ? req.body.items : [];
      if (itemsIn.length > 5000) {
        await t.rollback();
        return res.status(400).json({ success: false, message: "Too many items" });
      }
      const items = itemsIn.map((it, idx) => sanitizeItem(it, idx));

      // 同步回 DefaultTestSet.testCases（如果有）
      if (hasAttr(DefaultTestSet, "testCases")) {
        await set.update({ testCases: items }, { transaction: t });
      }

      // 同步 DefaultTestSetItem（如果有）
      if (DefaultTestSetItem) {
        const fk = inferItemFk();
        const orderCol = inferItemOrderCol();
        if (fk) {
          await DefaultTestSetItem.destroy({ where: { [fk]: id }, transaction: t });

          if (items.length) {
            const rows = items.map((it) =>
              pickExisting(
                DefaultTestSetItem,
                {
                  [fk]: id,
                  category: it.category,
                  section: it.section,
                  code: it.code,
                  testCase: it.testCase,
                  testProcedure: it.testProcedure,
                  testCriteria: it.testCriteria,
                  estHours: it.estHours,
                  isPlanned: it.isPlanned,
                  ...(orderCol ? { [orderCol]: it.orderNo } : {}),
                  orderNo: it.orderNo,
                },
                [
                  fk,
                  "category",
                  "section",
                  "code",
                  "testCase",
                  "testProcedure",
                  "testCriteria",
                  "estHours",
                  "isPlanned",
                  "orderNo",
                  "sortOrder",
                  "order",
                ]
              )
            );
            await DefaultTestSetItem.bulkCreate(rows, { transaction: t });
          }
          wroteItems = true;
        }
      }
    }

    await t.commit();

    logAction(req.user?.id, "UPDATE", "defaultTestSets", {
      recordId: id,
      meta: { wroteItems },
    }).catch(() => {});

    // reload for etag
    const fresh = await DefaultTestSet.findByPk(id);
    const etag = buildEtagFromRow(fresh);

    res.setHeader("ETag", etag);
    return res.json({ success: true, data: { id, etag } });
  } catch (e) {
    await t.rollback();
    console.error("update default test set failed:", e);
    return res.status(500).json({ success: false, message: e?.message || "Update failed" });
  }
});

/* ---------------- restore (new) ---------------- */
// POST /api/default-test-sets/:id/restore
router.post("/:id(\\d+)/restore", authMiddleware, async (req, res) => {
  try {
    if (!DefaultTestSet) {
      return res.status(500).json({ success: false, message: "DefaultTestSet model not found" });
    }

    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ success: false, message: "Invalid id" });

    const row = await DefaultTestSet.findByPk(id);
    if (!row) return res.status(404).json({ success: false, message: "Not found" });

    if (!canManageSet(req.user, row)) return res.status(403).json({ success: false, message: "Forbidden" });

    const f = inferSoftDeleteField(DefaultTestSet);
    if (!f) return res.json({ success: true }); // 無 soft delete 欄位就當作已是正常

    if (f === "deletedAt") row.deletedAt = null;
    else row[f] = false;

    await row.save();

    logAction(req.user?.id, "RESTORE", "defaultTestSets", { recordId: id }).catch(() => {});

    return res.json({ success: true });
  } catch (e) {
    console.error("restore default test set failed:", e);
    return res.status(500).json({ success: false, message: e?.message || "Restore failed" });
  }
});

/* ---------------- delete ---------------- */
// DELETE /api/default-test-sets/:id?hard=1
router.delete("/:id(\\d+)", authMiddleware, async (req, res) => {
  try {
    if (!DefaultTestSet) {
      return res.status(500).json({ success: false, message: "DefaultTestSet model not found" });
    }

    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ success: false, message: "Invalid id" });

    const row = await DefaultTestSet.findByPk(id);
    if (!row) return res.json({ success: true });

    if (!canManageSet(req.user, row)) {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }

    const hard = toBool(req.query?.hard, false) && isAdmin(req.user);

    if (hard) {
      // hard delete：也把 items 刪掉
      if (DefaultTestSetItem) {
        const fk = inferItemFk();
        if (fk) await DefaultTestSetItem.destroy({ where: { [fk]: id } });
      }
      await row.destroy();

      logAction(req.user?.id, "HARD_DELETE", "defaultTestSets", { recordId: id }).catch(() => {});
      return res.json({ success: true });
    }

    const f = inferSoftDeleteField(DefaultTestSet);
    if (f === "deletedAt") {
      row.deletedAt = new Date();
      await row.save();
    } else if (f) {
      row[f] = true;
      await row.save();
    } else {
      // 沒 soft delete 欄位就只能 hard destroy
      if (DefaultTestSetItem) {
        const fk = inferItemFk();
        if (fk) await DefaultTestSetItem.destroy({ where: { [fk]: id } });
      }
      await row.destroy();
    }

    logAction(req.user?.id, "DELETE", "defaultTestSets", { recordId: id }).catch(() => {});
    return res.json({ success: true });
  } catch (e) {
    console.error("delete default test set failed:", e);
    return res.status(500).json({ success: false, message: e?.message || "Delete failed" });
  }
});

export default router;
