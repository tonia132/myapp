// backend/src/services/machineRunner.js
import { Op } from "sequelize";
import { Machine, MachineSchedule, AuditLog } from "../models/index.js";

const runners = new Map(); // machineId -> { timer, scheduleId }
const locks = new Set(); // 啟動中鎖，避免重複執行

/* ============================================================
   🧮 計算目前排程進度百分比 (UTC Safe)
============================================================ */
function computeProgress(startTime, endTime) {
  try {
    const now = Date.now();
    const s = new Date(startTime).getTime();
    const e = new Date(endTime).getTime();
    if (!s || !e || e <= s) return 0;
    const ratio = ((now - s) / (e - s)) * 100;
    return Math.max(0, Math.min(100, Math.floor(ratio)));
  } catch {
    return 0;
  }
}

/* ============================================================
   🧾 寫入 AuditLog
============================================================ */
async function writeAuditLog(actorId, action, description) {
  try {
    await AuditLog.create({ actorId, action, description });
  } catch (err) {
    console.error("⚠️ 寫入 audit_logs 失敗：", err.message);
  }
}

/* ============================================================
   🔍 找出下一筆待執行的排程
============================================================ */
async function findNextSchedule(machineId) {
  const now = new Date();
  let schedule = await MachineSchedule.findOne({
    where: {
      machineId,
      status: { [Op.in]: ["pending", "scheduled"] },
      startTime: { [Op.lte]: now },
      isDeleted: false,
    },
    order: [["startTime", "ASC"]],
  });

  if (!schedule) {
    schedule = await MachineSchedule.findOne({
      where: {
        machineId,
        status: { [Op.in]: ["pending", "scheduled"] },
        startTime: { [Op.gte]: now },
        isDeleted: false,
      },
      order: [["startTime", "ASC"]],
    });
  }
  return schedule;
}

/* ============================================================
   ▶ 啟動機台 — 執行下一筆排程
============================================================ */
export async function startMachineBySchedule(machineId) {
  if (locks.has(machineId)) return { ok: false, message: "正在啟動中，請稍後" };
  locks.add(machineId);

  try {
    if (runners.has(machineId)) return { ok: true, message: "已在運轉中" };

    const machine = await Machine.findByPk(machineId);
    if (!machine) throw new Error("找不到機台");

    const schedule = await findNextSchedule(machineId);
    if (!schedule) throw new Error("沒有可執行的排程");

    await schedule.update({ status: "running" });
    await machine.update({ status: "running" });

    await writeAuditLog(
      schedule.createdBy,
      "schedule_started",
      `啟動機台 #${machineId} 的排程「${schedule.testName}」`
    );

    runSchedule(machine, schedule);
    return { ok: true, message: "已啟動運轉", scheduleId: schedule.id };
  } catch (err) {
    console.error("❌ 啟動排程失敗:", err);
    return { ok: false, message: err.message };
  } finally {
    locks.delete(machineId);
  }
}

/* ============================================================
   🚀 執行一筆排程，完成後自動啟動下一筆
============================================================ */
async function runSchedule(machine, schedule) {
  const machineId = machine.id;
  const scheduleId = schedule.id;

  if (runners.has(machineId)) {
    console.warn(`⚠️ 機台 #${machineId} 已在執行中，跳過重啟`);
    return;
  }

  const timer = setInterval(async () => {
    try {
      const s = await MachineSchedule.findByPk(scheduleId);
      const m = await Machine.findByPk(machineId);
      if (!s || !m) throw new Error("資料遺失");

      if (s.status !== "running" || m.status !== "running") {
        clearInterval(timer);
        runners.delete(machineId);
        return;
      }

      const progress = computeProgress(s.startTime, s.endTime);

      // ✅ 完成
      if (progress >= 100 || Date.now() >= new Date(s.endTime).getTime()) {
        await s.update({ status: "completed" });

        await writeAuditLog(
          s.createdBy,
          "schedule_completed",
          `機台 #${machineId} 完成排程「${s.testName}」`
        );

        const next = await findNextSchedule(machineId);
        if (next) {
          console.log(`⚙️ 自動接續下一筆排程 #${next.id}`);
          await next.update({ status: "running" });

          await writeAuditLog(
            next.createdBy,
            "schedule_started",
            `機台 #${machineId} 自動接續排程「${next.testName}」`
          );

          clearInterval(timer);
          runners.delete(machineId);
          runSchedule(m, next);
        } else {
          await m.update({ status: "idle" });
          clearInterval(timer);
          runners.delete(machineId);
          console.log(`✅ 機台 #${machineId} 所有排程已完成`);
        }
      }
    } catch (e) {
      console.error("🔴 runner error:", e);
      clearInterval(timer);
      runners.delete(machineId);
    }
  }, 5000);

  runners.set(machineId, { timer, scheduleId });
}

/* ============================================================
   ⏹ 停止運轉
============================================================ */
export async function stopMachineAndSchedule(machineId) {
  const machine = await Machine.findByPk(machineId);
  if (!machine) throw new Error("找不到機台");

  const runner = runners.get(machineId);
  if (runner) {
    clearInterval(runner.timer);
    runners.delete(machineId);

    const running = await MachineSchedule.findByPk(runner.scheduleId);
    if (running && running.status === "running") {
      await running.update({ status: "pending" });

      await writeAuditLog(
        running.createdBy,
        "schedule_stopped",
        `機台 #${machineId} 的排程「${running.testName}」被中止`
      );
    }
  }

  await machine.update({ status: "idle" });
  return { ok: true, message: "已停止運轉" };
}

/* ============================================================
   📊 查詢目前執行狀態
============================================================ */
export async function getMachineCurrentExecution(machineId) {
  const runner = runners.get(machineId);
  if (!runner) return null;
  const s = await MachineSchedule.findByPk(runner.scheduleId);
  if (!s) return null;
  return {
    scheduleId: s.id,
    testProject: s.testProject,
    testName: s.testName,
    operator: s.operator,
    startTime: s.startTime,
    endTime: s.endTime,
    status: s.status,
    progress: computeProgress(s.startTime, s.endTime),
  };
}

/* ============================================================
   🧠 伺服器重啟自動恢復排程
============================================================ */
export async function restoreRunningSchedules() {
  console.log("🔄 檢查未完成排程中...");
  const now = new Date();

  const schedules = await MachineSchedule.findAll({
    where: {
      status: { [Op.in]: ["running", "scheduled"] },
      isDeleted: false,
      endTime: { [Op.gte]: now },
    },
    include: [{ model: Machine, as: "machine" }],
  });

  for (const schedule of schedules) {
    const machine = schedule.machine;
    if (!machine) continue;
    if (runners.has(machine.id)) continue;

    if (schedule.status === "running" || new Date(schedule.startTime) <= now) {
      console.log(`🔁 恢復執行機台 #${machine.id} 排程 #${schedule.id}`);
      await machine.update({ status: "running" });
      runSchedule(machine, schedule);
    } else {
      const delay = new Date(schedule.startTime).getTime() - now.getTime();
      console.log(`🕓 排程 #${schedule.id} 將於 ${delay / 1000}s 後啟動`);
      setTimeout(() => {
        console.log(`⏰ 自動啟動排程 #${schedule.id}`);
        startMachineBySchedule(machine.id);
      }, delay);
    }
  }

  console.log("✅ 排程恢復檢查完成");
}
