// backend/src/index.js
import express from "express";
import cors from "cors";
import os from "os";
import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import { fileURLToPath } from "node:url";

import sequelize from "./config.js";
import "./models/index.js";
import { restoreRunningSchedules } from "./services/machineRunner.js";

// ✅ Telemetry (GF9700 -> API WS bridge)
import { attachTelemetryWs } from "./services/telemetry/wsHub.js";
import { startGf9700Bridge } from "./services/telemetry/gf9700Bridge.js";

// ── Routes ────────────────────────────────────────────────
import authRoutes from "./routes/auth.js";
import userRoutes from "./routes/users.js";
import productRoutes from "./routes/products.js";
import testCaseRoutes from "./routes/testcases.js";
import defaultTestSetsRoutes from "./routes/defaultTestSets.js";
import suggestionRoutes from "./routes/suggestions.js";
import logRoutes from "./routes/logs.js";
import reportRoutes from "./routes/report.js";
import partTestReportRoutes from "./routes/partTestReport.js";

import machineRoutes from "./routes/machines.js";
import machineMonitorRoutes from "./routes/machineMonitor.js";
import machineScheduleRoutes from "./routes/machineSchedules.js";
import reviewRoutes from "./routes/review.js";

import filesRoutes from "./routes/files.js";
import docManagerRoutes from "./routes/docManager.js";
import warehouseRoutes from "./routes/warehouse.js";
import labScheduleRoutes from "./routes/labSchedules.js";
import statsRoutes from "./routes/stats.js";
import testRequestRoutes from "./routes/testRequests.js";
import testSupportRoutes from "./routes/testSupport.js";
import osImageRoutes from "./routes/osImages.js";
import reliabilityCapacityRouter from "./routes/reliabilityCapacity.js";
import safetyReportRoutes from "./routes/safetyReports.js";
import equipmentRoutes from "./routes/equipments.js";
import notificationsRouter from "./routes/notifications.js";
import auditLogsRouter from "./routes/auditLogs.js";

import reportMetaRouter from "./routes/reportMeta.js";
import testPlanDraftRouter from "./routes/testPlanDraft.js";
import productDraftRouter from "./routes/productDraft.js";
import reportMetasRouter from "./routes/reportMetas.js";

// ✅ NEW: Part Test Sets + Sync
import partTestSetsRouter from "./routes/partTestSets.js";
import partTestSyncRouter from "./routes/partTestSync.js";

import helmet from "helmet";

const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || "0.0.0.0";
const NODE_ENV = process.env.NODE_ENV || "development";
const isDev = NODE_ENV !== "production";

const gf9700Enabled =
  String(process.env.GF9700_ENABLED || "false").toLowerCase() === "true";

/* =========================================================
   🌐 Utility: 取得區網 IP（回傳第一個可用）
========================================================= */
function getLocalIP() {
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name] || []) {
      if (net && net.family === "IPv4" && !net.internal) return net.address;
    }
  }
  return "127.0.0.1";
}
const LAN_IP = getLocalIP();

/* =========================================================
   🌐 Utility: 正規化 Origin / URL
========================================================= */
function normalizeUrl(value) {
  if (!value) return "";
  return String(value).trim().replace(/\/+$/, "");
}

function splitEnvList(value) {
  return String(value || "")
    .split(",")
    .map((s) => normalizeUrl(s))
    .filter(Boolean);
}

/* =========================================================
   建立 app 與中介層
========================================================= */
const app = express();
app.set("trust proxy", 1);

// ✅ 固定前端網址優先，其次才用自動推算 LAN
const VITE_PORT = Number(process.env.VITE_PORT || 5173);
const VITE_PREVIEW_PORT = Number(process.env.VITE_PREVIEW_PORT || 4173);

const fixedFrontendOrigins = [
  ...splitEnvList(process.env.FRONTEND_BASE),
  ...splitEnvList(process.env.FRONTEND_BASES),
];

const autoOrigins = isDev
  ? [
      `http://localhost:${VITE_PORT}`,
      `http://127.0.0.1:${VITE_PORT}`,
      `http://${LAN_IP}:${VITE_PORT}`,
      `http://localhost:${VITE_PREVIEW_PORT}`,
      `http://127.0.0.1:${VITE_PREVIEW_PORT}`,
      `http://${LAN_IP}:${VITE_PREVIEW_PORT}`,
    ]
  : [];

const allowList = new Set(
  [...fixedFrontendOrigins, ...autoOrigins]
    .map((o) => normalizeUrl(o))
    .filter(Boolean)
);

app.use((req, res, next) => {
  if (
    req.method === "OPTIONS" &&
    req.headers["access-control-request-private-network"] === "true"
  ) {
    res.header("Access-Control-Allow-Private-Network", "true");
  }
  next();
});

app.use(
  cors({
    origin(origin, cb) {
      if (!origin) return cb(null, true);

      const norm = normalizeUrl(origin);
      if (allowList.has(norm)) return cb(null, true);

      return cb(new Error(`CORS blocked for origin: ${norm}`));
    },
    credentials: true,
    methods: ["GET", "HEAD", "PUT", "PATCH", "POST", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    optionsSuccessStatus: 204,
  })
);

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "same-site" },
    crossOriginOpenerPolicy: false,
    contentSecurityPolicy: false,
  })
);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

if (isDev) {
  app.use((req, _res, next) => {
    console.log(`📥 ${req.method} ${req.url}`);
    next();
  });
}

/* =========================================================
   📁 靜態資源
   - /uploads 不再直接公開
   - 使用者上傳檔案一律走 /api/files/*
========================================================= */
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const UPLOAD_DIR = path.resolve(__dirname, "..", "uploads");
const PUBLIC_DIR = path.resolve(__dirname, "..", "public");

try {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  fs.mkdirSync(PUBLIC_DIR, { recursive: true });
  fs.mkdirSync(path.join(PUBLIC_DIR, "images"), { recursive: true });
} catch {}

app.use(
  "/images",
  express.static(path.join(PUBLIC_DIR, "images"), {
    fallthrough: true,
    setHeaders(res, filePath) {
      res.setHeader("X-Content-Type-Options", "nosniff");

      const ext = String(path.extname(filePath || "")).toLowerCase();
      const isImage = [".png", ".jpg", ".jpeg", ".webp", ".gif", ".bmp", ".ico"].includes(ext);

      if (isImage) {
        res.setHeader("Content-Disposition", "inline");
        res.setHeader("Cache-Control", "public, max-age=86400");
      } else {
        res.setHeader("Content-Disposition", "attachment");
        res.setHeader("Cache-Control", "private, no-store");
      }
    },
  })
);

/**
 * ⚠️ 安全調整：
 * 不再直接公開 /uploads
 * 使用者上傳檔案請改走：
 *   GET /api/files/:id/download
 *   GET /api/files/:id/preview
 */
// app.use("/uploads", express.static(UPLOAD_DIR));

app.use(
  "/public",
  express.static(PUBLIC_DIR, {
    fallthrough: true,
    setHeaders(res, filePath) {
      res.setHeader("X-Content-Type-Options", "nosniff");

      const ext = String(path.extname(filePath || "")).toLowerCase();
      const isImage = [".png", ".jpg", ".jpeg", ".webp", ".gif", ".bmp", ".ico"].includes(ext);

      if (isImage) {
        res.setHeader("Content-Disposition", "inline");
        res.setHeader("Cache-Control", "public, max-age=86400");
      } else {
        res.setHeader("Content-Disposition", "attachment");
        res.setHeader("Cache-Control", "private, no-store");
      }
    },
  })
);

/* =========================================================
   🔗 API 路由
========================================================= */
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/products", productRoutes);

app.use("/api/testcases", testCaseRoutes);

app.use("/api/default-test-sets", defaultTestSetsRoutes);
app.use("/api/test-sets", defaultTestSetsRoutes);

app.use("/api/part-test-sets", partTestSetsRouter);
app.use("/api", partTestSyncRouter);

app.use("/api/suggestions", suggestionRoutes);
app.use("/api/logs", logRoutes);

app.use("/api/report", reportRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/report", partTestReportRoutes);

app.use("/api/machines", machineRoutes);
app.use("/api/machine-monitor", machineMonitorRoutes);
app.use("/api/machine-schedules", machineScheduleRoutes);
app.use("/api/review", reviewRoutes);

app.use("/api/files", filesRoutes);
app.use("/api/doc-manager", docManagerRoutes);

app.use("/api/warehouse", warehouseRoutes);
app.use("/api/lab-schedules", labScheduleRoutes);
app.use("/api/stats", statsRoutes);
app.use("/api/test-requests", testRequestRoutes);
app.use("/api/test-support", testSupportRoutes);
app.use("/api/os-images", osImageRoutes);
app.use("/api/reliability-capacity", reliabilityCapacityRouter);
app.use("/api/safety-reports", safetyReportRoutes);
app.use("/api/equipments", equipmentRoutes);
app.use("/api/notifications", notificationsRouter);
app.use("/api/audit-logs", auditLogsRouter);

app.use("/api/report-meta", reportMetaRouter);
app.use("/api/products", reportMetaRouter);

app.use("/api/products", productDraftRouter);
app.use("/api", testPlanDraftRouter);

app.use("/api/report-metas", reportMetasRouter);

/* =========================================================
   🩺 健康檢查與資訊
   - /healthz 可公開
   - /api/info 與 /info 僅限開發環境
========================================================= */
app.get("/healthz", (_req, res) => {
  res.setHeader("Cache-Control", "no-store");
  res.status(200).send("ok");
});

if (isDev) {
  app.get("/api/info", (_req, res) => {
    res.json({
      mode: NODE_ENV,
      host: HOST,
      port: PORT,
      localUrl: `http://localhost:${PORT}`,
      lanUrl: `http://${LAN_IP}:${PORT}`,
      telemetry: {
        wsPath: "/ws/telemetry",
        gf9700Enabled,
      },
    });
  });

  app.get("/info", (_req, res) => {
    const local = `http://localhost:${PORT}`;
    const lan = `http://${LAN_IP}:${PORT}`;
    res.send(`
      <h2>✅ 測試系統 API Server 運行中</h2>
      <p><b>環境模式：</b>${NODE_ENV}</p>
      <p><b>HOST：</b>${HOST}</p>
      <p><b>Local URL：</b><a href="${local}" target="_blank">${local}</a></p>
      <p><b>LAN URL：</b><a href="${lan}" target="_blank">${lan}</a></p>

      <hr/>
      <h3>📡 Telemetry</h3>
      <p><b>WS Path：</b><code>/ws/telemetry</code></p>
      <p><b>GF9700_ENABLED：</b><code>${String(gf9700Enabled)}</code></p>
    `);
  });
} else {
  app.get("/api/info", (_req, res) => {
    res.status(404).json({ success: false, message: "找不到路由或資源" });
  });

  app.get("/info", (_req, res) => {
    res.status(404).send("Not Found");
  });
}

/* =========================================================
   ⚠️ 404 與錯誤處理
========================================================= */
app.use((req, res) => {
  res
    .status(404)
    .json({ success: false, message: "找不到路由或資源", path: req.originalUrl });
});

app.use((err, _req, res, _next) => {
  console.error("💥 Error:", err);
  res
    .status(err.status || 500)
    .json({ success: false, message: err.message || "伺服器錯誤" });
});

process.on("unhandledRejection", (reason) =>
  console.error("🚨 Unhandled Rejection:", reason)
);
process.on("uncaughtException", (err) =>
  console.error("💥 Uncaught Exception:", err)
);

/* =========================================================
   🚀 啟動流程
========================================================= */
async function bootstrap() {
  try {
    await sequelize.authenticate();
    console.log("✅ MySQL 連線成功");

    const httpServer = http.createServer(app);

    const telemetry = attachTelemetryWs(httpServer);

    let stopGf9700 = () => {};

    if (gf9700Enabled && process.env.GF9700_WS_URL) {
      stopGf9700 = startGf9700Bridge({
        url: process.env.GF9700_WS_URL,
      });
      console.log(`📡 GF9700 Bridge enabled: ${process.env.GF9700_WS_URL}`);
      if (process.env.GF9700_MAP) {
        console.log(`🧩 GF9700_MAP: ${process.env.GF9700_MAP}`);
      }
    } else {
      console.log("📡 GF9700 Bridge disabled");
    }

    httpServer.listen(PORT, HOST, async () => {
      const localUrl = `http://localhost:${PORT}`;
      const lanUrl = `http://${LAN_IP}:${PORT}`;

      console.log("✅ 伺服器啟動成功");
      console.log(`🌐 Host:  ${HOST}`);
      console.log(`🌐 Local: ${localUrl}`);
      console.log(`🌐 LAN:   ${lanUrl}`);
      console.log(`📡 Telemetry WS: ws://${LAN_IP}:${PORT}/ws/telemetry?machineId=16`);

      if (gf9700Enabled) {
        console.log(`📡 GF9700 Source WS: ${process.env.GF9700_WS_URL || "(empty)"}`);
      } else {
        console.log("📡 GF9700 Source WS: disabled");
      }

      if (isDev) {
        console.log("🔓 CORS AllowList:");
        for (const o of allowList) console.log("   •", o);
        console.log("📁 Static Paths:");
        console.log("   • /images ->", path.join(PUBLIC_DIR, "images"));
        console.log("   • /public ->", PUBLIC_DIR);
        console.log("   • uploads are protected via /api/files/*");

        try {
          if (String(process.env.OPEN_DEV_INFO || "false").toLowerCase() === "true") {
            try {
              const { default: open } = await import("open");
              await open(`${localUrl}/info`);
            } catch {}
          }
        } catch {}
      }

      try {
        await restoreRunningSchedules();
        console.log("♻️ 已恢復所有未完成排程");
      } catch (e) {
        console.error("❌ 還原排程失敗：", e?.message || e);
      }
    });

    function shutdown() {
      try {
        stopGf9700?.();
      } catch {}
      try {
        telemetry?.close?.();
      } catch {}
      httpServer.close(() => process.exit(0));
    }

    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);
  } catch (err) {
    console.error("❌ Sequelize 初始化錯誤:", err?.message || err);
    process.exit(1);
  }
}

bootstrap();