// backend/src/services/telemetry/gf9700Bridge.js
import WebSocket from "ws";
import { setLatest } from "./realtimeStore.js";
import * as models from "../../models/index.js";

const { Machine } = models;

function safeJsonParse(s) {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}

function normCode(v) {
  if (v == null) return "";
  const s = String(v).trim();
  // "1" -> "01"
  return s.length === 1 ? s.padStart(2, "0") : s;
}

// ✅ 支援 .env：GF9700_MAP="16=01,17=02"
function parseGfMap(str) {
  const codeToId = new Map();
  const raw = String(str || "").trim();
  if (!raw) return codeToId;

  for (const part of raw.split(/[;,]/).map((s) => s.trim()).filter(Boolean)) {
    const [idStr, codeStr] = part.split("=").map((s) => s.trim());
    const id = Number(idStr);
    const code = normCode(codeStr);
    if (Number.isFinite(id) && code) codeToId.set(code, id);
  }
  return codeToId;
}

export function startGf9700Bridge({ url }) {
  let ws = null;
  let closedByUs = false;
  let reconnectTimer = null;
  let warnedDown = false;
  let reconnectMs = 1500;

  const codeToMachineId = parseGfMap(process.env.GF9700_MAP);

  if (codeToMachineId.size) {
    console.log(
      `[GF9700] code map: ${[...codeToMachineId.entries()]
        .map(([c, id]) => `${c}->${id}`)
        .join(", ")}`
    );
  } else {
    console.log(`[GF9700] code map: (empty)`);
  }

  async function resolveMachine(code) {
    const mappedId = codeToMachineId.get(code);
    if (mappedId) {
      const m = await Machine.findByPk(mappedId).catch(() => null);
      if (m) return m;
    }

    try {
      const m = await Machine.findOne({
        where: { telemetryType: "gf9700", telemetryCode: code },
      });
      if (m) return m;
    } catch {}

    return null;
  }

  function clearReconnectTimer() {
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
  }

  function scheduleReconnect() {
    if (closedByUs) return;
    clearReconnectTimer();

    reconnectTimer = setTimeout(() => {
      connect();
    }, reconnectMs);

    reconnectMs = Math.min(reconnectMs * 2, 30000);
  }

  function logDownOnce(msg) {
    if (warnedDown) return;
    console.log(msg);
    warnedDown = true;
  }

  async function connect() {
    if (closedByUs) return;

    ws = new WebSocket(url, { handshakeTimeout: 8000 });

    ws.on("open", () => {
      console.log(`[GF9700] connected: ${url}`);
      warnedDown = false;
      reconnectMs = 1500;
    });

    ws.on("message", async (buf) => {
      const raw = buf.toString("utf8");
      const msg = safeJsonParse(raw);
      if (!msg) return;

      const code = normCode(msg.machineCode ?? msg.code ?? msg.machine_id);
      if (!code) return;

      const m = await resolveMachine(code);
      if (!m) {
        console.log(`[GF9700] drop: no machine mapping for code=${code}`);
        return;
      }

      const payload = {
        machineId: m.id,
        code,
        sourceTime: msg.machineTime ?? null,
        receivedTime: msg.receivedTime ?? new Date().toISOString(),

        tempPV: msg.tempPV ?? msg["Temp PV"] ?? null,
        tempSV: msg.tempSV ?? msg["Temp SV"] ?? null,
        humiPV: msg.humiPV ?? msg["Humi PV"] ?? null,
        humiSV: msg.humiSV ?? msg["Humi SV"] ?? null,

        tempSSR: msg.tempSSR ?? null,
        tempSCR: msg.tempSCR ?? null,
        humiSSR: msg.humiSSR ?? null,
        humiSCR: msg.humiSCR ?? null,

        programNo: msg.programNo ?? null,
        stepNo: msg.stepNo ?? null,
        raw: msg,
      };

      setLatest(m.id, payload);
      process.emit("telemetry:update", payload);

      console.log(
        `[GF9700] push machineId=${m.id} code=${code} tempPV=${payload.tempPV} humiPV=${payload.humiPV}`
      );
    });

    ws.on("close", () => {
      if (closedByUs) return;
      logDownOnce(`[GF9700] source offline, retrying... (${url})`);
      scheduleReconnect();
    });

    ws.on("error", (e) => {
      const msg = e?.message || String(e || "");
      logDownOnce(`[GF9700] source unavailable: ${msg}`);
      try {
        ws?.close();
      } catch {}
    });
  }

  connect();

  return () => {
    closedByUs = true;
    clearReconnectTimer();
    try {
      ws?.close();
    } catch {}
  };
}