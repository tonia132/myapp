// backend/src/services/telemetry/realtimeStore.js
const latestByMachineId = new Map(); // machineId -> latestPayload

export function setLatest(machineId, payload) {
  latestByMachineId.set(Number(machineId), payload);
}

export function getLatest(machineId) {
  return latestByMachineId.get(Number(machineId)) || null;
}
