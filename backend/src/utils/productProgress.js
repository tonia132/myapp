// backend/src/utils/productProgress.js
import { Op } from "sequelize";

/**
 * v0006 sections key → TestCase.category 對應
 * （TestCase.category 在 hook 會轉成 UPPERCASE）
 */
const SECTION_TO_CATS = {
  hw: ["HW", "HARDWARE", "HARDWARE FUNCTIONS", "HARDWAREFUNCTIONS"],
  perf: ["PERF", "PERFORMANCE"],
  reli: ["RELI", "RELIABILITY"],
  stab: ["STAB", "STABILITY"],
  pwr: ["PWR", "POWER", "POWER CONSUMPTION", "POWERCONSUMPTION"],
  thrm: ["THRM", "THERM", "THERMAL", "THERMAL PROFILE", "THERMALPROFILE"],
  esd: ["ESD", "ELECTROSTATIC DISCHARGE", "ELECTROSTATICDISCHARGE"],
  mep: ["MEP", "MECHANICAL PROTECTION", "MECHANICALPROTECTION"],
};

function hasAttr(model, key) {
  return !!model?.rawAttributes?.[key];
}

function toUpper(v) {
  return String(v ?? "").trim().toUpperCase();
}

/**
 * ✅ 回傳：
 * - null：不過濾 category（視為全開）
 * - Set()：空集合（全關）
 * - Set([...])：只算集合內的 categories
 */
function buildEnabledCategorySet(flagsJson) {
  const sections = flagsJson?.sections;

  // 沒有 sections → 視為全開
  if (!sections || typeof sections !== "object") return null;

  const enabledKeys = Object.entries(sections)
    .filter(([, val]) => !!val)
    .map(([k]) => String(k).trim().toLowerCase());

  // 全關 → shown=0
  if (!enabledKeys.length) return new Set();

  const set = new Set();
  for (const k of enabledKeys) {
    const cats = SECTION_TO_CATS[k];
    if (Array.isArray(cats)) {
      for (const c of cats) set.add(toUpper(c));
    }
  }

  // keys 都不在 mapping → 保守回傳 null（不過濾）避免 shown=0
  if (set.size === 0) return null;

  return set;
}

/** ✅ 避免浮點尾巴，固定 1 位小數 */
function calcPercent(finished, total) {
  if (!total) return 0;
  const p = (finished * 100) / total;
  const n = Number(p.toFixed(1));
  return Math.max(0, Math.min(100, n));
}

/**
 * 取得 productId → enabledCategorySet
 * 回傳 Map(productId -> Set | null)
 * - null: 不過濾 category（全算）
 * - Set(): 空集合（全關）
 */
async function loadMetaFilterMap(models, productIds) {
  const { ReportMeta } = models || {};
  const map = new Map();

  // 預設都全算（null）
  for (const id of productIds) map.set(Number(id), null);

  if (!ReportMeta || !productIds?.length) return map;

  try {
    const metas = await ReportMeta.findAll({
      where: { productId: { [Op.in]: productIds } },
      attributes: ["productId", "flagsJson"],
      raw: false,
    });

    for (const m of metas) {
      const pid = Number(m.productId);
      const set = buildEnabledCategorySet(m.flagsJson);
      map.set(pid, set);
    }
  } catch (e) {
    console.warn("⚠️ loadMetaFilterMap failed, fallback to ALL:", e?.message || e);
  }

  return map;
}

/**
 * ✅ 批量計算：清單頁使用
 * 規則：
 * - 只算 isPlanned=true（若欄位存在）
 * - 只算 isDeleted=false（若欄位存在）
 * - 只算 flagsJson.sections 打開的 category（Shown 範圍）
 * - finished: result in ('pass','fail')
 */
export async function calcProgressMap(models, productIds = []) {
  const { TestCase } = models || {};
  const ids = (productIds || [])
    .map((x) => Number(x))
    .filter((n) => Number.isFinite(n) && n > 0);

  const out = new Map();
  for (const id of ids) out.set(id, { finished: 0, total: 0, percent: 0 });
  if (!ids.length || !TestCase) return out;

  const metaFilterMap = await loadMetaFilterMap(models, ids);

  const where = { productId: { [Op.in]: ids } };
  if (hasAttr(TestCase, "isDeleted")) where.isDeleted = false;
  if (hasAttr(TestCase, "isPlanned")) where.isPlanned = true;

  const rows = await TestCase.unscoped().findAll({
    where,
    attributes: ["productId", "category", "result"],
    raw: true,
  });

  for (const r of rows) {
    const pid = Number(r.productId);
    const info = out.get(pid) || { finished: 0, total: 0, percent: 0 };

    const enabledSet = metaFilterMap.get(pid); // null | Set
    if (enabledSet instanceof Set) {
      if (enabledSet.size === 0) {
        // 全關：直接不算任何一筆
        out.set(pid, info);
        continue;
      }
      const cat = toUpper(r.category);
      if (!enabledSet.has(cat)) {
        out.set(pid, info);
        continue;
      }
    }
    // enabledSet === null → 不過濾 category（全算）

    info.total += 1;

    const rr = String(r.result || "").trim().toLowerCase();
    if (rr === "pass" || rr === "fail") info.finished += 1;

    out.set(pid, info);
  }

  for (const [pid, info] of out.entries()) {
    info.percent = calcPercent(info.finished, info.total);
    out.set(pid, info);
  }

  return out;
}

/**
 * ✅ 單筆計算：/api/products/:id/progress 或 /api/products/:id 用
 */
export async function calcProgressOne(models, productId) {
  const id = Number(productId);
  if (!Number.isFinite(id) || id <= 0) return { finished: 0, total: 0, percent: 0 };

  const map = await calcProgressMap(models, [id]);
  return map.get(id) || { finished: 0, total: 0, percent: 0 };
}

/**
 * ✅ 相容舊 routes/testcases.js
 * 重新計算單一產品進度，並（可選）回寫 products.progress 欄位
 */
export async function recalcProductProgress(models, productId) {
  const Product = models?.Product;
  const id = Number(productId);

  const info = await calcProgressOne(models, id);

  // 回寫 products.progress（若欄位存在、且 total > 0）
  if (Product && hasAttr(Product, "progress") && info?.total > 0) {
    await Product.update({ progress: info.percent }, { where: { id } }).catch(() => {});
  }

  return info;
}
/**
 * ✅ 相容舊 routes/stats.js
 * 重新計算多個 / 全部產品 progress，並（可選）回寫 products.progress
 *
 * @param {object} models - models/index.js export 的物件
 * @param {number[]|null} productIds - 指定產品 id；若不給就全部
 * @returns {Map<number,{finished:number,total:number,percent:number}>}
 */
export async function recalcAllProductsProgress(models, productIds = null) {
  const Product = models?.Product;
  if (!Product) return new Map();

  let ids = [];
  if (Array.isArray(productIds) && productIds.length) {
    ids = productIds.map((x) => Number(x)).filter((n) => Number.isFinite(n) && n > 0);
  } else {
    // 全部產品
    const rows = await Product.unscoped().findAll({ attributes: ["id"], raw: true });
    ids = rows.map((r) => Number(r.id)).filter((n) => Number.isFinite(n) && n > 0);
  }

  const map = await calcProgressMap(models, ids);

  // 回寫 products.progress（若欄位存在）
  if (hasAttr(Product, "progress")) {
    const tasks = [];
    for (const [id, info] of map.entries()) {
      // total=0 就不改，避免把原本舊值覆蓋成 0（你也可以改成要覆蓋）
      if (!info || info.total <= 0) continue;
      tasks.push(Product.update({ progress: info.percent }, { where: { id } }).catch(() => {}));
    }
    await Promise.all(tasks);
  }

  return map;
}

