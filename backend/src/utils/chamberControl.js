// backend/src/utils/chamberControl.js
// ✅ Chamber 控制工具（先支援 mock；也內建 HTTP 控制模式，未設定就自動回落 mock）
//
// 使用方式（你在 route 裡）
//   import { sendChamberSetpoint } from "../utils/chamberControl.js";
//   await sendChamberSetpoint(machine, temperature, humidity);
//
// 目前支援模式：
// - mock（預設）：不送硬體指令，只回傳 ok:true（但你 route 仍可先把 setpoint 寫入 DB）
// - http：用 REST API 呼叫你自己的 gateway（或廠商提供的 chamber API）
//
// 如何切到 http 模式：
// 1) 設環境變數：CHAMBER_CONTROL_MODE=http
// 2) 機台資料提供控制位址：machine.controlUrl 或 machine.ip + machine.controlPort
//    - controlUrl 例：https://10.0.0.5:9000 或 http://10.0.0.5:9000
//    - 若無 controlUrl，就會用 ip + controlPort 拼 http://{ip}:{port}
//
// HTTP 送出格式（你可依你的 gateway 調整）：
//   POST {baseUrl}/api/chambers/{machineId}/setpoint
//   body: { temperature: number, humidity: number|null }

import crypto from "node:crypto";

/* ---------------- small helpers ---------------- */

const clean = (v) => String(v ?? "").trim();

const toNum = (v) => {
  if (v === "" || v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

function assertRange(label, n, min, max) {
  if (n == null) return;
  if (!Number.isFinite(n)) throw new Error(`${label} must be a number`);
  if (n < min || n > max) throw new Error(`${label} out of range (${min} ~ ${max})`);
}

function withTimeout(ms) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), ms);
  return { controller, cancel: () => clearTimeout(id) };
}

async function readJsonSafe(res) {
  const text = await res.text().catch(() => "");
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

function pickMode(machine) {
  // 優先：環境變數，其次：machine 欄位
  const envMode = clean(process.env.CHAMBER_CONTROL_MODE).toLowerCase();
  if (envMode) return envMode;

  // 你若之後在 Machine 加欄位，可用 controlMode / protocol / connectionType 等
  const m =
    clean(machine?.controlMode).toLowerCase() ||
    clean(machine?.protocol).toLowerCase() ||
    clean(machine?.connectionType).toLowerCase();

  return m || "mock";
}

function resolveHttpBaseUrl(machine) {
  // 允許你在 machines 表加 controlUrl / ip / controlPort（沒有也不會壞）
  const controlUrl = clean(machine?.controlUrl);
  if (controlUrl) return ensureHttpScheme(controlUrl);

  const ip = clean(machine?.ip);
  const port = clean(machine?.controlPort) || clean(process.env.CHAMBER_HTTP_PORT) || "8081";
  if (ip) return `http://${ip}:${port}`;

  // 也可全域指定（若你是透過 gateway 統一控）
  const envBase = clean(process.env.CHAMBER_HTTP_BASE_URL);
  if (envBase) return ensureHttpScheme(envBase);

  return "";
}

function ensureHttpScheme(url) {
  if (/^https?:\/\//i.test(url)) return url;
  return `http://${url}`;
}

function resolveHttpEndpoint(machine, baseUrl) {
  // 你可以改成廠商 API 路徑；先用一個「可讀性高」的預設
  // e.g. POST http://gateway/api/chambers/13/setpoint
  const prefix = clean(process.env.CHAMBER_HTTP_PREFIX) || "/api";
  const id = machine?.id ?? "unknown";
  return `${baseUrl}${prefix}/chambers/${id}/setpoint`;
}

/* ---------------- public API ---------------- */

/**
 * ✅ 送出 Chamber Setpoint
 * @param {object} machine  - Sequelize Machine instance / plain object
 * @param {number} temperature - 目標溫度(°C)
 * @param {number|null} humidity - 目標濕度(%)，可為 null
 * @param {object} [opts]
 * @param {number} [opts.timeoutMs=8000]
 * @param {boolean} [opts.dryRun=false] - true 只回傳將送出的 payload，不做任何事
 */
export async function sendChamberSetpoint(machine, temperature, humidity = null, opts = {}) {
  const requestId = crypto.randomBytes(8).toString("hex");
  const mode = pickMode(machine);

  const t = toNum(temperature);
  const h = humidity === "" || humidity == null ? null : toNum(humidity);

  // ✅ 基本檢核（跟你 route 的檢核一致/更保險）
  assertRange("temperature", t, -80, 250);
  if (h != null) assertRange("humidity", h, 0, 100);

  const timeoutMs = Number.isFinite(Number(opts.timeoutMs)) ? Number(opts.timeoutMs) : 8000;
  const dryRun = Boolean(opts.dryRun);

  // ---------------- dry run ----------------
  if (dryRun) {
    return {
      ok: true,
      mode,
      requestId,
      dryRun: true,
      payload: { temperature: t, humidity: h },
    };
  }

  // ---------------- mock mode (default) ----------------
  if (mode === "mock" || !mode) {
    return {
      ok: true,
      mode: "mock",
      requestId,
      message: "mock mode: no hardware command sent",
      payload: { temperature: t, humidity: h },
    };
  }

  // ---------------- http mode ----------------
  if (mode === "http" || mode === "rest") {
    const baseUrl = resolveHttpBaseUrl(machine);
    if (!baseUrl) {
      return {
        ok: false,
        mode: "http",
        requestId,
        message:
          "http mode enabled but no base url found (set machine.controlUrl or machine.ip/controlPort or env CHAMBER_HTTP_BASE_URL)",
      };
    }

    const url = resolveHttpEndpoint(machine, baseUrl);
    const payload = { temperature: t, humidity: h };

    const { controller, cancel } = withTimeout(timeoutMs);
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          // 如需 token：CHAMBER_HTTP_TOKEN=xxxx
          ...(process.env.CHAMBER_HTTP_TOKEN
            ? { authorization: `Bearer ${process.env.CHAMBER_HTTP_TOKEN}` }
            : {}),
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      const data = await readJsonSafe(res);

      if (!res.ok) {
        return {
          ok: false,
          mode: "http",
          requestId,
          message: `HTTP ${res.status} ${res.statusText}`,
          url,
          response: data,
        };
      }

      return {
        ok: true,
        mode: "http",
        requestId,
        url,
        response: data,
      };
    } catch (err) {
      const msg =
        err?.name === "AbortError"
          ? `HTTP request timeout (${timeoutMs}ms)`
          : err?.message || "HTTP request failed";
      return {
        ok: false,
        mode: "http",
        requestId,
        message: msg,
        url,
      };
    } finally {
      cancel();
    }
  }

  // ---------------- unsupported mode ----------------
  return {
    ok: false,
    mode,
    requestId,
    message: `Unsupported chamber control mode: "${mode}". Use "mock" or "http".`,
  };
}
