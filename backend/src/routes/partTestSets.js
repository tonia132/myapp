// backend/src/routes/partTestSets.js
import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import * as models from "../models/index.js";

const router = express.Router();
const { DefaultTestSet } = models;

/* ---------------- helpers ---------------- */
const clean = (v) => String(v ?? "").trim();

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

function inferPayloadCol() {
  const candidates = ["payloadJson", "dataJson", "payload", "data", "json", "content", "configJson"];
  for (const c of candidates) if (hasAttr(DefaultTestSet, c)) return c;
  return null;
}

function inferIsDeletedCol() {
  const candidates = ["isDeleted", "deleted", "is_deleted"];
  for (const c of candidates) if (hasAttr(DefaultTestSet, c)) return c;
  return null;
}

function inferNameCol() {
  const candidates = ["name", "title"];
  for (const c of candidates) if (hasAttr(DefaultTestSet, c)) return c;
  return "name";
}

function inferDescCol() {
  const candidates = ["description", "desc", "note"];
  for (const c of candidates) if (hasAttr(DefaultTestSet, c)) return c;
  return "description";
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

function toStoreValue(colName, v) {
  const attr = DefaultTestSet?.rawAttributes?.[colName];
  const typeKey = String(attr?.type?.key || "").toUpperCase();
  const isJson = typeKey.includes("JSON");

  if (v === undefined) return undefined;
  if (v === null) return null;
  if (isJson) return typeof v === "string" ? tryParseJson(v) : v;
  if (typeof v === "string") return v;

  try {
    return JSON.stringify(v);
  } catch {
    return null;
  }
}

function isPlainObject(v) {
  return !!v && typeof v === "object" && !Array.isArray(v);
}

function pickRawPayload(body = {}) {
  const candidates = [
    "payloadJson",
    "dataJson",
    "payload",
    "data",
    "json",
    "content",
    "configJson",
  ];

  for (const key of candidates) {
    if (body[key] != null) return body[key];
  }

  return body;
}

function normalizePartTestPayload(body = {}) {
  let raw = pickRawPayload(body);
  raw = typeof raw === "string" ? tryParseJson(raw) : raw;

  if (!isPlainObject(raw)) raw = {};

  const name = clean(body?.name || raw?.name);
  const description = clean(body?.description || raw?.description);
  const objectType = clean(body?.objectType || raw?.objectType || raw?.template || "generic") || "generic";
  const template = clean(body?.template || raw?.template || objectType) || objectType;

  const cover = isPlainObject(raw?.cover) ? raw.cover : {};
  const dut = isPlainObject(raw?.dut) ? raw.dut : {};
  const enabled = isPlainObject(raw?.enabled) ? raw.enabled : {};
  const sections = Array.isArray(raw?.sections) ? raw.sections : [];

  const payload = {
    ...raw,
    schema: "part-test-set/v1",
    name,
    description,
    objectType,
    template,
    cover,
    dut,
    enabled,
    sections,
  };

  return payload;
}

function flattenSectionsToLegacyTestCases(sections = []) {
  const out = [];

  for (const sec of Array.isArray(sections) ? sections : []) {
    const category = clean(sec?.title || sec?.shortName || sec?.key || "General");
    const cases = Array.isArray(sec?.testCases) ? sec.testCases : [];

    for (const tc of cases) {
      out.push({
        category,
        code: clean(tc?.code),
        testCase: clean(tc?.title),
        testProcedure: clean(tc?.procedure),
        testCriteria: clean(tc?.criteria),
        remark: clean(tc?.remark),
      });
    }
  }

  return out;
}

router.use(authMiddleware);

/* ------------------------------------------------------------
 * GET /api/part-test-sets
 * ---------------------------------------------------------- */
router.get("/", async (req, res) => {
  try {
    if (!DefaultTestSet) {
      return res.status(500).json({ success: false, message: "DefaultTestSet model missing" });
    }

    const includeDeleted = toBool(req.query.includeDeleted, false);

    const isDeletedCol = inferIsDeletedCol();
    const payloadCol = inferPayloadCol();
    const nameCol = inferNameCol();
    const descCol = inferDescCol();

    if (!payloadCol) {
      return res.status(400).json({
        success: false,
        message: "DefaultTestSet has no payload column. Please add payloadJson(JSON) or dataJson(TEXT).",
      });
    }

    const where = {};
    if (!includeDeleted && isDeletedCol) where[isDeletedCol] = false;

    const rows = await DefaultTestSet.unscoped().findAll({
      where,
      order: [["createdAt", "DESC"]],
      attributes: ["id", nameCol, descCol, payloadCol, ...(isDeletedCol ? [isDeletedCol] : [])],
    });

    const out = [];

    for (const r of rows) {
      const o = r.toJSON();
      let payload = o[payloadCol];
      if (typeof payload === "string") payload = tryParseJson(payload);

      const schema = payload?.schema || "";
      if (schema !== "part-test-set/v1") continue;

      out.push({
        id: o.id,
        name: o[nameCol] ?? payload?.name ?? `Set #${o.id}`,
        description: o[descCol] ?? payload?.description ?? "",
        schema,
        objectType: payload?.objectType ?? "generic",
        template: payload?.template ?? "generic",
      });
    }

    return res.json({ success: true, rows: out, total: out.length });
  } catch (e) {
    console.error("❌ GET /part-test-sets:", e);
    return res.status(500).json({ success: false, message: "Failed to load part test sets" });
  }
});

/* ------------------------------------------------------------
 * GET /api/part-test-sets/:id
 * ---------------------------------------------------------- */
router.get("/:id(\\d+)", async (req, res) => {
  try {
    const id = Number(req.params.id || 0);
    if (!id) return res.status(400).json({ success: false, message: "Bad id" });

    const payloadCol = inferPayloadCol();
    const nameCol = inferNameCol();
    const descCol = inferDescCol();

    if (!payloadCol) {
      return res.status(400).json({
        success: false,
        message: "DefaultTestSet has no payload column. Please add payloadJson(JSON) or dataJson(TEXT).",
      });
    }

    const row = await DefaultTestSet.unscoped().findByPk(id, {
      attributes: ["id", nameCol, descCol, payloadCol],
    });
    if (!row) return res.status(404).json({ success: false, message: "Not found" });

    const o = row.toJSON();
    let payload = o[payloadCol];
    if (typeof payload === "string") payload = tryParseJson(payload);

    if (payload?.schema !== "part-test-set/v1") {
      return res.status(400).json({ success: false, message: "Not a part-test set" });
    }

    payload.name = payload.name || o[nameCol] || `Set #${id}`;
    payload.description = payload.description || o[descCol] || "";

    return res.json({ success: true, data: payload });
  } catch (e) {
    console.error("❌ GET /part-test-sets/:id:", e);
    return res.status(500).json({ success: false, message: "Failed to load part test set" });
  }
});

/* ------------------------------------------------------------
 * POST /api/part-test-sets
 * 支援兩種 body：
 * 1. { schema, name, description, cover, dut, enabled, sections }
 * 2. { name, description, objectType, payloadJson: { schema, cover, dut, enabled, sections } }
 * ---------------------------------------------------------- */
router.post("/", async (req, res) => {
  try {
    const payloadCol = inferPayloadCol();
    const nameCol = inferNameCol();
    const descCol = inferDescCol();

    if (!payloadCol) {
      return res.status(400).json({
        success: false,
        message: "DefaultTestSet has no payload column. Please add payloadJson(JSON) or dataJson(TEXT).",
      });
    }

    const payload = normalizePartTestPayload(req.body);

    if (!payload.name) {
      return res.status(400).json({ success: false, message: "name required" });
    }

    if (payload.schema !== "part-test-set/v1") {
      return res.status(400).json({ success: false, message: "schema must be part-test-set/v1" });
    }

    const createObj = {
      [nameCol]: payload.name,
      [descCol]: payload.description,
      [payloadCol]: toStoreValue(payloadCol, payload),
    };

    if (hasAttr(DefaultTestSet, "createdBy")) {
      createObj.createdBy = req.user?.id;
    }

    if (hasAttr(DefaultTestSet, "testCases")) {
      createObj.testCases = flattenSectionsToLegacyTestCases(payload.sections);
    }

    const row = await DefaultTestSet.create(createObj);

    return res.json({
      success: true,
      data: {
        id: row.id,
        name: payload.name,
        sectionCount: payload.sections.length,
        testCaseCount: flattenSectionsToLegacyTestCases(payload.sections).length,
      },
    });
  } catch (e) {
    console.error("❌ POST /part-test-sets:", e);
    return res.status(500).json({ success: false, message: "Failed to create part test set" });
  }
});

export default router;