// backend/src/models/index.js
import sequelize from "../config.js";

// === 匯入所有模型（factory 形式） ===
import UserModel from "./User.js";
import ProductModel from "./Product.js";
import TestCaseModel from "./TestCase.js";
import DefaultTestSetModel from "./DefaultTestSet.js";
import SuggestionModel from "./Suggestion.js";
import AuditLogModel from "./AuditLog.js";
import MachineModel from "./Machine.js";
import MachineTestModel from "./MachineTest.js";
import MachineScheduleModel from "./MachineSchedule.js";
import ChamberModel from "./Chamber.js";
import ScheduleModel from "./Schedule.js";
import FileModel from "./File.js";

import WarehouseItemModel from "./WarehouseItem.js";
import WarehouseItemImageModel from "./WarehouseItemImage.js"; // ✅ 多張圖中介表
import BorrowRecordModel from "./BorrowRecord.js";

import LabScheduleModel from "./LabSchedule.js"; // 🧪 實驗室排程
import TestRequestModel from "./TestRequest.js"; // 🆕 測試需求單

// ⚠️ Linux 會區分大小寫：你現在用 "./testSupport.js" 代表檔名必須真的叫 testSupport.js
// 建議統一改成 TestSupport.js 並把這行改掉
import TestSupportModel from "./testSupport.js"; // 🆕 測試支援

import OsImageModel from "./OsImage.js"; // 🆕 OS Image
import SafetyReportModel from "./SafetyReport.js"; // 🆕 安規報告
import EquipmentModel from "./Equipment.js"; // 🧰 儀器設備
import EquipmentLoanModel from "./EquipmentLoan.js"; // 🧰 儀器設備借用紀錄

// ✅ 文件管理（獨立表）
import DocModelModel from "./DocModel.js";

// ✅ Report Meta（封面/summary 的資料）
import ReportMetaModel from "./ReportMeta.js";

/* ============================================================
   0️⃣ 可選模型：DefaultTestSetItem
   - 用動態 import：檔案不存在也不會讓 app 起不來
============================================================ */
let DefaultTestSetItemFactory = null;
try {
  const m = await import("./DefaultTestSetItem.js");
  DefaultTestSetItemFactory = m?.default || null;
} catch {
  // ignore
}

/* ============================================================
   小工具：安全初始化每個 model
============================================================ */
function initModel(factory, name) {
  if (!factory) {
    throw new Error(
      `[models/index] Factory for "${name}" 是 undefined，請確認 import 路徑是否正確（檔名/大小寫/資料夾）。`
    );
  }

  // 判斷是不是 Express Router（function + 有 stack 陣列）
  if (
    typeof factory === "function" &&
    Object.prototype.hasOwnProperty.call(factory, "stack") &&
    Array.isArray(factory.stack)
  ) {
    throw new Error(
      `[models/index] Factory for "${name}" 看起來是 Express Router（有 .stack 屬性）。\n` +
        `→ 你可能誤用了 routes/${name}.js 或在 model 檔裡用了 express.Router()。`
    );
  }

  if (typeof factory !== "function") {
    throw new Error(
      `[models/index] Factory for "${name}" 不是函式（實際型別: ${typeof factory}）。\n` +
        `→ Model 檔應該要 export default (sequelize) => { ... return Model }`
    );
  }

  const model = factory(sequelize);

  // 基本檢查：是不是 Sequelize Model
  if (!model || typeof model !== "function" || !model?.sequelize) {
    throw new Error(
      `[models/index] "${name}" 初始化後不像 Sequelize Model。\n` +
        `→ 請確認 ${name}.js 有正確 return sequelize.define(...)`
    );
  }

  return model;
}

/* ============================================================
   1️⃣ 初始化模型
============================================================ */
const User = initModel(UserModel, "User");
const Product = initModel(ProductModel, "Product");
const TestCase = initModel(TestCaseModel, "TestCase");
const DefaultTestSet = initModel(DefaultTestSetModel, "DefaultTestSet");

// ✅ 可選：DefaultTestSetItem
const DefaultTestSetItem = DefaultTestSetItemFactory
  ? initModel(DefaultTestSetItemFactory, "DefaultTestSetItem")
  : null;

const Suggestion = initModel(SuggestionModel, "Suggestion");
const AuditLog = initModel(AuditLogModel, "AuditLog");

const Machine = initModel(MachineModel, "Machine");
const MachineTest = initModel(MachineTestModel, "MachineTest");
const MachineSchedule = initModel(MachineScheduleModel, "MachineSchedule");

const Chamber = initModel(ChamberModel, "Chamber");
const Schedule = initModel(ScheduleModel, "Schedule");

const File = initModel(FileModel, "File");

const WarehouseItem = initModel(WarehouseItemModel, "WarehouseItem");
const WarehouseItemImage = initModel(WarehouseItemImageModel, "WarehouseItemImage");
const BorrowRecord = initModel(BorrowRecordModel, "BorrowRecord");

const LabSchedule = initModel(LabScheduleModel, "LabSchedule");
const TestRequest = initModel(TestRequestModel, "TestRequest");
const TestSupport = initModel(TestSupportModel, "TestSupport");

const OsImage = initModel(OsImageModel, "OsImage");
const SafetyReport = initModel(SafetyReportModel, "SafetyReport");

const Equipment = initModel(EquipmentModel, "Equipment");
const EquipmentLoan = initModel(EquipmentLoanModel, "EquipmentLoan");

const DocModel = initModel(DocModelModel, "DocModel");

const ReportMeta = initModel(ReportMetaModel, "ReportMeta");

/* ============================================================
   2️⃣ 關聯定義（alias 統一）
============================================================ */

/* ---------- User ↔ Product ---------- */
User.hasMany(Product, { foreignKey: "createdBy", as: "products" });
Product.belongsTo(User, { foreignKey: "createdBy", as: "creator" });

/* ---------- Product ↔ TestCase ---------- */
Product.hasMany(TestCase, { foreignKey: "productId", as: "testCases", onDelete: "CASCADE" });
TestCase.belongsTo(Product, { foreignKey: "productId", as: "product" });

/* ---------- User ↔ TestCase ---------- */
User.hasMany(TestCase, { foreignKey: "createdBy", as: "testCases" });
TestCase.belongsTo(User, { foreignKey: "createdBy", as: "creator" });

/* ---------- User ↔ DefaultTestSet ---------- */
User.hasMany(DefaultTestSet, { foreignKey: "createdBy", as: "defaultTestSets" });
DefaultTestSet.belongsTo(User, { foreignKey: "createdBy", as: "creator" });

/* ---------- Product ↔ DefaultTestSet（來源產品） ---------- */
// 產品匯出的 set
Product.hasMany(DefaultTestSet, { foreignKey: "fromProductId", as: "exportedSets" });
// set 指回來源產品（✅ alias 固定：sourceProduct）
DefaultTestSet.belongsTo(Product, {
  foreignKey: "fromProductId",
  as: "sourceProduct",
  onDelete: "SET NULL",
  onUpdate: "CASCADE",
});

/* ---------- Product ↔ ReportMeta ---------- */
/**
 * ✅ 避免你之前的命名衝突：不要用 as:"reportMeta"
 * 主要 alias 用 "meta"
 * （如果舊程式還在用 reportMetaRow，也保留相容 alias；第二個 association 關掉 constraints 避免重複處理）
 */
Product.hasOne(ReportMeta, { foreignKey: "productId", as: "meta", onDelete: "CASCADE" });
Product.hasOne(ReportMeta, { foreignKey: "productId", as: "reportMetaRow", constraints: false });

ReportMeta.belongsTo(Product, { foreignKey: "productId", as: "product" });

/* ---------- ReportMeta ↔ File（簽名檔） ---------- */
ReportMeta.belongsTo(File, {
  foreignKey: "preparedSignatureFileId",
  as: "preparedSignatureFile",
  onDelete: "SET NULL",
});
ReportMeta.belongsTo(File, {
  foreignKey: "approvedSignatureFileId",
  as: "approvedSignatureFile",
  onDelete: "SET NULL",
});

File.hasMany(ReportMeta, { foreignKey: "preparedSignatureFileId", as: "preparedSignatureMetas" });
File.hasMany(ReportMeta, { foreignKey: "approvedSignatureFileId", as: "approvedSignatureMetas" });

/* ---------- DefaultTestSet ↔ DefaultTestSetItem（可選） ---------- */
if (DefaultTestSetItem) {
  // 相容兩種欄位命名：testSetId / defaultTestSetId
  const itemFk = DefaultTestSetItem.rawAttributes?.testSetId
    ? "testSetId"
    : DefaultTestSetItem.rawAttributes?.defaultTestSetId
      ? "defaultTestSetId"
      : null;

  if (itemFk) {
    DefaultTestSet.hasMany(DefaultTestSetItem, {
      foreignKey: itemFk,
      as: "items",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });

    DefaultTestSetItem.belongsTo(DefaultTestSet, {
      foreignKey: itemFk,
      as: "testSet",
    });
  }
}

/* ---------- User ↔ Suggestion ---------- */
User.hasMany(Suggestion, { foreignKey: "userId", as: "suggestions" });
Suggestion.belongsTo(User, { foreignKey: "userId", as: "creator" });

/* ---------- User ↔ AuditLog ---------- */
User.hasMany(AuditLog, { foreignKey: "actorId", as: "auditLogs" });
AuditLog.belongsTo(User, { foreignKey: "actorId", as: "actor" });

/* ---------- 機台模組 ---------- */
User.hasMany(Machine, { foreignKey: "createdBy", as: "machines" });
Machine.belongsTo(User, { foreignKey: "createdBy", as: "creator" });

Machine.hasMany(MachineTest, { foreignKey: "machineId", as: "tests", onDelete: "CASCADE" });
MachineTest.belongsTo(Machine, { foreignKey: "machineId", as: "machine" });

Machine.hasMany(MachineSchedule, { foreignKey: "machineId", as: "schedules", onDelete: "CASCADE" });
MachineSchedule.belongsTo(Machine, { foreignKey: "machineId", as: "machine" });

/* ---------- Machine ↔ File（機台總覽預覽圖） ---------- */
Machine.belongsTo(File, {
  foreignKey: "previewFileId",
  as: "previewFile",
  onDelete: "SET NULL",
  onUpdate: "CASCADE",
});
File.hasMany(Machine, { foreignKey: "previewFileId", as: "machinePreviews" });

/* ---------- User ↔ MachineSchedule ---------- */
User.hasMany(MachineSchedule, { foreignKey: "createdBy", as: "schedules" });
MachineSchedule.belongsTo(User, { foreignKey: "createdBy", as: "creator" });

User.hasMany(MachineSchedule, { foreignKey: "userId", as: "assignedSchedules" });
MachineSchedule.belongsTo(User, { foreignKey: "userId", as: "user" });

/* ---------- Chamber ↔ Schedule ---------- */
Chamber.hasMany(Schedule, { foreignKey: "chamber_id", as: "schedules" });
Schedule.belongsTo(Chamber, { foreignKey: "chamber_id", as: "chamber" });

/* ---------- User ↔ File（檔案中心） ---------- */
User.hasMany(File, { foreignKey: "uploaderId", as: "files" });
File.belongsTo(User, { foreignKey: "uploaderId", as: "uploader" });

/* ---------- 倉庫品項 & 借用紀錄 ---------- */
User.hasMany(WarehouseItem, { foreignKey: "createdBy", as: "warehouseItems" });
WarehouseItem.belongsTo(User, { foreignKey: "createdBy", as: "creator" });

/** ✅ 封面圖（單張） */
WarehouseItem.belongsTo(File, {
  foreignKey: "imageFileId",
  as: "imageFile",
  onDelete: "SET NULL",
  onUpdate: "CASCADE",
});
File.hasMany(WarehouseItem, {
  foreignKey: "imageFileId",
  as: "warehouseItemCovers",
});

/** ✅ 多張圖（中介表） */
WarehouseItem.hasMany(WarehouseItemImage, {
  foreignKey: "itemId",
  as: "images",
  onDelete: "CASCADE",
});
WarehouseItemImage.belongsTo(WarehouseItem, {
  foreignKey: "itemId",
  as: "item",
});

WarehouseItemImage.belongsTo(File, {
  foreignKey: "fileId",
  as: "file",
  onDelete: "CASCADE",
  onUpdate: "CASCADE",
});
File.hasMany(WarehouseItemImage, {
  foreignKey: "fileId",
  as: "warehouseItemImageLinks",
});

WarehouseItem.hasMany(BorrowRecord, { foreignKey: "itemId", as: "borrows", onDelete: "RESTRICT" });
BorrowRecord.belongsTo(WarehouseItem, { foreignKey: "itemId", as: "item" });

User.hasMany(BorrowRecord, { foreignKey: "borrowerId", as: "borrowRecords" });
BorrowRecord.belongsTo(User, { foreignKey: "borrowerId", as: "borrower" });

/* ---------- 儀器設備 & 借用紀錄 ---------- */
User.hasMany(Equipment, { foreignKey: "createdBy", as: "equipments" });
Equipment.belongsTo(User, { foreignKey: "createdBy", as: "creator" });

Equipment.hasMany(EquipmentLoan, { foreignKey: "equipmentId", as: "loans", onDelete: "RESTRICT" });
EquipmentLoan.belongsTo(Equipment, { foreignKey: "equipmentId", as: "equipment" });

User.hasMany(EquipmentLoan, { foreignKey: "userId", as: "equipmentLoans" });
EquipmentLoan.belongsTo(User, { foreignKey: "userId", as: "loanUser" });

/* ---------- User ↔ LabSchedule ---------- */
User.hasMany(LabSchedule, { foreignKey: "userId", as: "labSchedules" });
LabSchedule.belongsTo(User, { foreignKey: "userId", as: "requester" });

/* ---------- User ↔ TestRequest ---------- */
User.hasMany(TestRequest, { foreignKey: "createdBy", as: "testRequests" });
TestRequest.belongsTo(User, { foreignKey: "createdBy", as: "creator" });

User.hasMany(TestRequest, { foreignKey: "assignedTo", as: "assignedTestRequests" });
TestRequest.belongsTo(User, { foreignKey: "assignedTo", as: "assignee" });

/* ---------- User ↔ TestSupport ---------- */
User.hasMany(TestSupport, { foreignKey: "supporterId", as: "testSupports" });
TestSupport.belongsTo(User, { foreignKey: "supporterId", as: "supporter" });

/* ============================================================
   3️⃣ 匯出（named exports + default object）
============================================================ */
export {
  sequelize,

  User,
  Product,
  TestCase,

  DefaultTestSet,
  DefaultTestSetItem,

  Suggestion,
  AuditLog,

  Machine,
  MachineTest,
  MachineSchedule,

  Chamber,
  Schedule,

  File,

  WarehouseItem,
  WarehouseItemImage,
  BorrowRecord,

  LabSchedule,
  TestRequest,
  TestSupport,

  OsImage,
  SafetyReport,

  Equipment,
  EquipmentLoan,

  DocModel,
  ReportMeta,
};

export default {
  sequelize,

  User,
  Product,
  TestCase,

  DefaultTestSet,
  DefaultTestSetItem,

  Suggestion,
  AuditLog,

  Machine,
  MachineTest,
  MachineSchedule,

  Chamber,
  Schedule,

  File,

  WarehouseItem,
  WarehouseItemImage,
  BorrowRecord,

  LabSchedule,
  TestRequest,
  TestSupport,

  OsImage,
  SafetyReport,

  Equipment,
  EquipmentLoan,

  DocModel,
  ReportMeta,
};
