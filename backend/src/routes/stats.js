// backend/src/routes/stats.js
import express from "express";
import { fn, col, Op } from "sequelize";
import authMiddleware from "../middleware/authMiddleware.js";
import authorizeRole from "../middleware/roleMiddleware.js";
import * as models from "../models/index.js";
import { recalcAllProductsProgress } from "../utils/productProgress.js";

const router = express.Router();

const {
  Product,
  User,
  TestRequest,
  TestSupport,
  Machine, // 目前沒用到，保留
} = models;

/**
 * ✅ 使用者工作量統計
 *
 * - planCount    : 使用者建立的「未完成」產品 / 方案數 (products.createdBy)
 *                  → 只算 progress < 100 且 isDeleted = 0
 * - demandCount  : 指派給該使用者的「未完成」測試需求單數 (test_requests.assignedTo)
 *                  → status 不是「已完成 / done / completed / finished」
 * - supportCount : 該使用者的「未完成」測試支援數 (TestSupports.supporterId)
 *                  → status 不是 done
 * - totalWork    : 上面三者加總
 */

const PRODUCT_USER_FK = "createdBy";
const DEMAND_USER_FK = "assignedTo";
const SUPPORT_USER_FK = "supporterId";

const TEST_REQUEST_DONE_STATUSES = ["已完成", "done", "completed", "finished"];
const TEST_SUPPORT_DONE_STATUSES = ["done", "已完成"];

// 🧮 預設每個使用者容量（如果 workCapacity 沒填，就用這個）
const DEFAULT_CAPACITY_PER_USER = 3;

/**
 * 共用工具：計算「每個使用者工作量」與「總合」
 */
async function calcUserWorkload() {
  const [productRows, demandRows, supportRows, users] = await Promise.all([
    // 產品 / 方案（未刪除 & 進度 < 100）
    Product.unscoped().findAll({
      attributes: [PRODUCT_USER_FK, [fn("COUNT", col("id")), "planCount"]],
      where: {
        isDeleted: false,
        progress: { [Op.lt]: 100 },
      },
      group: [PRODUCT_USER_FK],
      raw: true,
    }),

    // 測試需求單（未完成）
    TestRequest.unscoped().findAll({
      attributes: [DEMAND_USER_FK, [fn("COUNT", col("id")), "demandCount"]],
      where: {
        [DEMAND_USER_FK]: { [Op.ne]: null },
        status: { [Op.notIn]: TEST_REQUEST_DONE_STATUSES },
      },
      group: [DEMAND_USER_FK],
      raw: true,
    }),

    // 測試支援（未完成）
    TestSupport.unscoped().findAll({
      attributes: [SUPPORT_USER_FK, [fn("COUNT", col("id")), "supportCount"]],
      where: {
        status: { [Op.notIn]: TEST_SUPPORT_DONE_STATUSES },
      },
      group: [SUPPORT_USER_FK],
      raw: true,
    }),

    // 只抓「啟用 & 勾選統計」的使用者
    User.findAll({
      where: {
        isActive: true,
        includeInStats: true,
      },
      attributes: ["id", "username", "name", "role", "includeInStats", "workCapacity"],
      order: [["id", "ASC"]],
    }),
  ]);

  const productMap = new Map(
    productRows.map((r) => [Number(r[PRODUCT_USER_FK]), Number(r.planCount) || 0])
  );
  const demandMap = new Map(
    demandRows.map((r) => [Number(r[DEMAND_USER_FK]), Number(r.demandCount) || 0])
  );
  const supportMap = new Map(
    supportRows.map((r) => [Number(r[SUPPORT_USER_FK]), Number(r.supportCount) || 0])
  );

  const list = users.map((u) => {
    const id = u.id;
    const planCount = productMap.get(id) || 0;
    const demandCount = demandMap.get(id) || 0;
    const supportCount = supportMap.get(id) || 0;
    const totalWork = planCount + demandCount + supportCount;

    const rawCap = Number(u.workCapacity);
    const workCapacity =
      Number.isFinite(rawCap) && rawCap > 0 ? rawCap : DEFAULT_CAPACITY_PER_USER;

    return {
      userId: id,
      username: u.username || null,
      name: u.name || null,
      role: u.role || null,
      includeInStats: u.includeInStats,
      planCount,
      demandCount,
      supportCount,
      totalWork,
      workCapacity,
    };
  });

  list.sort((a, b) => b.totalWork - a.totalWork);

  const totals = list.reduce(
    (acc, u) => {
      acc.totalPlans += u.planCount;
      acc.totalDemands += u.demandCount;
      acc.totalSupports += u.supportCount;
      acc.totalUsedWork += u.totalWork;
      acc.totalCapacity += u.workCapacity;
      return acc;
    },
    {
      totalPlans: 0,
      totalDemands: 0,
      totalSupports: 0,
      totalUsedWork: 0,
      totalCapacity: 0,
    }
  );

  return { list, totals };
}

/* 使用者工作量統計（明細） */
router.get("/user-plan-count", authMiddleware, async (req, res) => {
  try {
    const { list } = await calcUserWorkload();
    res.json(list);
  } catch (err) {
    console.error("❌ 取得使用者方案統計失敗:", err);
    res.status(500).json({ message: "取得使用者方案統計失敗", error: err.message });
  }
});

/* Dashboard：使用者工作量列表 + 總合 */
router.get("/user-plans", authMiddleware, async (req, res) => {
  try {
    const { list, totals } = await calcUserWorkload();
    res.json({ success: true, rows: list, totals });
  } catch (err) {
    console.error("❌ 取得使用者工作量列表失敗:", err);
    res.status(500).json({
      success: false,
      message: "取得使用者工作量列表失敗",
      error: err.message,
    });
  }
});

/* Dashboard：DQA 容量總覽 */
router.get("/user-plan-summary", authMiddleware, async (req, res) => {
  try {
    const { totals } = await calcUserWorkload();
    const { totalPlans, totalDemands, totalSupports, totalUsedWork, totalCapacity } =
      totals;
    const percent = totalCapacity ? Math.round((totalUsedWork * 100) / totalCapacity) : 0;

    res.json({
      success: true,
      data: {
        totalPlans,
        totalDemands,
        totalSupports,
        totalUsedWork,
        totalCapacity,
        percent,
      },
    });
  } catch (err) {
    console.error("❌ 取得使用者方案總覽失敗:", err);
    res.status(500).json({
      success: false,
      message: "取得使用者方案總覽失敗",
      error: err.message,
    });
  }
});

/* 管理員工具：重算所有產品進度 */
router.post(
  "/recalc-product-progress",
  authMiddleware,
  authorizeRole("admin"),
  async (req, res) => {
    try {
      // ✅ 一定要把 models 傳進去，productProgress 才拿得到 Product/TestCase
      const result = await recalcAllProductsProgress(models);
      return res.json({
        success: true,
        message: `已重算 ${result.count} 個產品的測試進度`,
        detail: result.items,
      });
    } catch (err) {
      console.error("❌ 重算產品進度失敗:", err);
      return res.status(500).json({
        success: false,
        message: "重算產品進度失敗",
        error: err.message,
      });
    }
  }
);

export default router;
