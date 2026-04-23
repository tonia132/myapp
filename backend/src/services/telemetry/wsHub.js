// backend/src/services/telemetry/wsHub.js
import { WebSocketServer } from "ws";
import { getLatest } from "./realtimeStore.js";

const OPEN = 1;

export function attachTelemetryWs(server) {
  const wss = new WebSocketServer({ server, path: "/ws/telemetry" });

  wss.on("connection", (socket, req) => {
    const u = new URL(req.url, "http://localhost");
    const machineId = Number(u.searchParams.get("machineId"));

    // 把訂閱的 machineId 記在 socket 上，broadcast 才能過濾
    socket._machineId = Number.isFinite(machineId) ? machineId : null;

    // ✅ 一連上先送 hello（保證 DevTools Messages 立刻看得到一筆）
    socket.send(
      JSON.stringify({
        type: "hello",
        machineId: socket._machineId,
        ts: new Date().toISOString(),
      })
    );

    // ✅ 再送一次最新值（若 store 有）
    if (socket._machineId != null) {
      const latest = getLatest(socket._machineId);
      socket.send(JSON.stringify({ type: "latest", data: latest ?? null }));
    }

    socket.on("close", () => {});
  });

  // ✅ 避免熱重啟時重複掛 listener
  if (process.listenerCount("telemetry:update") === 0) {
    process.on("telemetry:update", (payload) => {
      const msg = JSON.stringify({ type: "update", data: payload });
      const mid = payload?.machineId ?? null;

      for (const client of wss.clients) {
        if (client.readyState !== OPEN) continue;

        // ✅ 如果前端有帶 machineId，就只推該 machine
        if (client._machineId != null && mid != null && client._machineId !== mid) continue;

        client.send(msg);
      }
    });
  }

  console.log(`[WS] /ws/telemetry ready`);
}
