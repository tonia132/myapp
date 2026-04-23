<template>
  <div class="page machine-detail-page-vivid">
    <section class="hero-card">
      <div class="hero-main">
        <div class="hero-left">
          <el-button class="btn" :icon="ArrowLeft" @click="$router.back()">
            {{ text('machineDetail.back', '返回') }}
          </el-button>

          <div class="hero-copy">
            <div class="hero-eyebrow">{{ text('machineDetail.eyebrow', 'Machine Telemetry & Schedule') }}</div>
            <h2 class="hero-title">🧰 {{ text('machineDetail.title', '機台詳情') }}</h2>
            <div class="hero-subtitle">
              {{ text('machineDetail.heroSubtitle', '查看機台即時狀態、環境資料、排程清單與控制操作') }}
            </div>
          </div>
        </div>

        <div class="hero-actions">
          <el-tag
            v-if="row?.status"
            :type="statusTagType(row?.status)"
            effect="dark"
            class="pill"
          >
            {{ machineStatusText(row?.status) }}
          </el-tag>

          <el-tag :type="telemetryOnline ? 'success' : 'info'" effect="plain" class="pill">
            {{ telemetryOnline ? text('machineDetail.telemetryOnline', 'ONLINE') : text('machineDetail.telemetryOffline', 'OFFLINE') }}
          </el-tag>

          <el-tag v-if="lockStartStop" type="warning" effect="plain" class="pill">
            {{ text('machineDetail.tagScheduleControl', '排程控制中') }}
          </el-tag>

          <el-button class="btn" :icon="Refresh" @click="refresh">
            {{ text('machineDetail.btnRefresh', '重新整理') }}
          </el-button>

          <el-button
            class="btn"
            size="small"
            type="primary"
            plain
            :icon="EditPen"
            :disabled="!row"
            @click="openSetpoint"
          >
            {{ text('machineDetail.btnSetpoint', '設定溫濕度') }}
          </el-button>

          <el-tooltip
            v-if="lockStartStop"
            :content="text('machineDetail.lockedHint', '排程控制中，無法手動操作')"
            placement="top"
          >
            <span>
              <el-button
                class="btn"
                size="small"
                :type="row?.status === 'running' ? 'danger' : 'success'"
                plain
                :icon="row?.status === 'running' ? CircleClose : VideoPlay"
                :disabled="true"
              >
                {{
                  row?.status === 'running'
                    ? text('machineDetail.btnStop', '停止')
                    : text('machineDetail.btnStart', '啟動')
                }}
              </el-button>
            </span>
          </el-tooltip>

          <el-button
            v-else
            class="btn"
            size="small"
            :type="row?.status === 'running' ? 'danger' : 'success'"
            plain
            :icon="row?.status === 'running' ? CircleClose : VideoPlay"
            @click="toggle"
          >
            {{
              row?.status === 'running'
                ? text('machineDetail.btnStop', '停止')
                : text('machineDetail.btnStart', '啟動')
            }}
          </el-button>
        </div>
      </div>

      <div class="stats-grid">
        <div class="stat-card stat-primary">
          <div class="stat-label">{{ text('machineDetail.stats.progress', '進度') }}</div>
          <div class="stat-value">{{ Math.round(row?.progress || 0) }}%</div>
        </div>

        <div class="stat-card">
          <div class="stat-label">{{ text('machineDetail.stats.runtime', '運轉分鐘') }}</div>
          <div class="stat-value">{{ monitor.runtimeMinutes ?? '-' }}</div>
        </div>

        <div class="stat-card">
          <div class="stat-label">{{ text('machineDetail.stats.temp', '目前溫度') }}</div>
          <div class="stat-value">{{ formatTemp(monitor.temperature) }}</div>
        </div>

        <div class="stat-card">
          <div class="stat-label">{{ text('machineDetail.stats.humidity', '目前濕度') }}</div>
          <div class="stat-value">{{ formatHumidity(monitor.humidity) }}</div>
        </div>
      </div>
    </section>

    <div class="info-grid-2">
      <el-card shadow="never" class="info-card">
        <template #header>
          <div class="section-head">
            <div>
              <div class="section-title">{{ text('machineDetail.infoTitle', '機台狀態') }}</div>
              <div class="section-subtitle">
                {{ text('machineDetail.infoSubtitle', '包含排程、執行階段、即時進度與設定值') }}
              </div>
            </div>
          </div>
        </template>

        <div class="meta-grid">
          <div class="meta-box">
            <div class="meta-label">{{ text('machineDetail.fieldName', '名稱') }}</div>
            <div class="meta-value">{{ row?.displayName || '-' }}</div>
          </div>

          <div class="meta-box">
            <div class="meta-label">{{ text('machineDetail.fieldSchedule', '排程') }}</div>
            <div class="meta-value">{{ row?.scheduleTitle || '-' }}</div>
          </div>

          <div class="meta-box">
            <div class="meta-label">{{ text('machineDetail.fieldStatus', '階段') }}</div>
            <div class="meta-value muted">{{ phaseText(row?.currentPhase) }}</div>
          </div>

          <div class="meta-box">
            <div class="meta-label">{{ text('machineDetail.fieldProgress', '進度') }}</div>
            <div class="meta-value">{{ Math.round(row?.progress || 0) }}%</div>
          </div>

          <div class="meta-box">
            <div class="meta-label">{{ text('machineDetail.fieldStart', '開始') }}</div>
            <div class="meta-value">{{ fmt(row?.startTime) }}</div>
          </div>

          <div class="meta-box">
            <div class="meta-label">{{ text('machineDetail.fieldEnd', '結束') }}</div>
            <div class="meta-value">{{ fmt(row?.endTime) }}</div>
          </div>
        </div>

        <div class="progress-panel">
          <div class="progress-head">
            <span>{{ text('machineDetail.fieldLiveProgress', '即時進度') }}</span>
            <strong>{{ Math.round(monitor.progress ?? row?.progress ?? 0) }}%</strong>
          </div>
          <el-progress
            :percentage="Math.round(monitor.progress ?? row?.progress ?? 0)"
            :stroke-width="10"
            :status="Math.round(monitor.progress ?? row?.progress ?? 0) >= 100 ? 'success' : ''"
          />
          <div class="muted mini-tip" v-if="monitor.updatedAt">
            {{ text('machineDetail.updatedAtPrefix', '更新時間：') }}{{ fmt(monitor.updatedAt) }}
          </div>
        </div>
      </el-card>

      <el-card shadow="never" class="info-card">
        <template #header>
          <div class="section-head">
            <div>
              <div class="section-title">{{ text('machineDetail.envTitle', '環境與 Setpoint') }}</div>
              <div class="section-subtitle">
                {{ text('machineDetail.envSubtitle', '顯示溫度、濕度、目標值與最後設定時間') }}
              </div>
            </div>
          </div>
        </template>

        <div class="env-grid">
          <div class="env-card">
            <div class="env-label">{{ text('machineDetail.fieldTemp', '溫度') }}</div>
            <div class="env-value">{{ formatTemp(monitor.temperature) }}</div>
          </div>

          <div class="env-card">
            <div class="env-label">{{ text('machineDetail.fieldHumidity', '濕度') }}</div>
            <div class="env-value">{{ formatHumidity(monitor.humidity) }}</div>
          </div>

          <div class="env-card">
            <div class="env-label">{{ text('machineDetail.fieldTargetTemp', '目標溫度') }}</div>
            <div class="env-value">{{ formatTemp(row?.targetTemp ?? monitor.targetTemp) }}</div>
          </div>

          <div class="env-card">
            <div class="env-label">{{ text('machineDetail.fieldTargetHumidity', '目標濕度') }}</div>
            <div class="env-value">{{ formatHumidity(row?.targetHumidity ?? monitor.targetHumidity) }}</div>
          </div>
        </div>

        <div class="setpoint-note" v-if="row?.lastSetpointAt || monitor.lastSetpointAt">
          {{ text('machineDetail.setpointAtPrefix', '最後設定時間：') }}{{ fmt(row?.lastSetpointAt || monitor.lastSetpointAt) }}
        </div>

        <div class="runtime-card">
          <div class="meta-label">{{ text('machineDetail.fieldRuntimeMinutes', '運轉分鐘') }}</div>
          <div class="meta-value">
            {{ monitor.runtimeMinutes ?? '-' }} {{ text('machineDetail.unitMinutes', '分鐘') }}
          </div>
        </div>
      </el-card>
    </div>

    <el-card shadow="never" class="schedule-card">
      <template #header>
        <div class="section-head">
          <div>
            <div class="section-title">{{ text('machineDetail.scheduleListTitle', '排程列表') }}</div>
            <div class="section-subtitle">
              {{ text('machineDetail.scheduleSubtitle', '查看此機台所有排程狀態、進度與起迄時間') }}
            </div>
          </div>

          <el-tag effect="plain" round>
            {{ text('machineDetail.scheduleTotalTag', '共 {count} 筆', { count: schedules.length }) }}
          </el-tag>
        </div>
      </template>

      <el-table v-if="!isMobile" :data="schedules" border stripe height="55vh" class="tbl">
        <el-table-column
          prop="testName"
          :label="text('machineDetail.colSchedule', '排程')"
          min-width="240"
        />
        <el-table-column
          prop="status"
          :label="text('machineDetail.colScheduleStatus', '狀態')"
          width="140"
        >
          <template #default="{ row }">
            <el-tag :type="scheduleTagType(row.status)">
              {{ scheduleStatusText(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column
          prop="progress"
          :label="text('machineDetail.colScheduleProgress', '進度')"
          width="200"
        >
          <template #default="{ row }">
            <el-progress
              :percentage="Math.round(row.progress || 0)"
              :stroke-width="10"
            />
          </template>
        </el-table-column>
        <el-table-column
          prop="startTime"
          :label="text('machineDetail.colScheduleStart', '開始')"
          width="200"
        >
          <template #default="{ row }">
            {{ fmt(row.startTime) }}
          </template>
        </el-table-column>
        <el-table-column
          prop="endTime"
          :label="text('machineDetail.colScheduleEnd', '結束')"
          width="200"
        >
          <template #default="{ row }">
            {{ fmt(row.endTime) }}
          </template>
        </el-table-column>
      </el-table>

      <div v-else class="mobile-schedules">
        <el-empty
          v-if="!schedules.length"
          :description="text('common.noData', '目前沒有資料')"
        />

        <article v-for="s in schedules" :key="s.id" class="schedule-item">
          <div class="schedule-top">
            <div class="schedule-name">{{ s.testName || '-' }}</div>
            <el-tag :type="scheduleTagType(s.status)" size="small" effect="plain" class="pill mini">
              {{ scheduleStatusText(s.status) }}
            </el-tag>
          </div>

          <div class="progress-panel compact">
            <div class="progress-head">
              <span>{{ text('machineDetail.colScheduleProgress', '進度') }}</span>
              <strong>{{ Math.round(s.progress || 0) }}%</strong>
            </div>
            <el-progress :percentage="Math.round(s.progress || 0)" :stroke-width="10" />
          </div>

          <div class="meta-grid single">
            <div class="meta-box">
              <div class="meta-label">{{ text('machineDetail.colScheduleStart', '開始') }}</div>
              <div class="meta-value">{{ fmt(s.startTime) }}</div>
            </div>
            <div class="meta-box">
              <div class="meta-label">{{ text('machineDetail.colScheduleEnd', '結束') }}</div>
              <div class="meta-value">{{ fmt(s.endTime) }}</div>
            </div>
          </div>
        </article>
      </div>
    </el-card>

    <el-dialog
      v-model="setpointOpen"
      :title="text('machineDetail.setpointTitle', '設定 Setpoint')"
      :width="isMobile ? '100%' : '520px'"
      :fullscreen="isMobile"
      destroy-on-close
    >
      <div class="dialog-hero">
        <div class="dialog-main">
          <div class="dialog-title">{{ text('machineDetail.setpointDialogTitle', '調整溫度 / 濕度設定') }}</div>
          <div class="dialog-subtitle">
            {{ text('machineDetail.setpointHint', '送出後會將新的 setpoint 寫入機台控制，並更新目前畫面資料') }}
          </div>
        </div>

        <div class="dialog-preview">
          <div class="preview-label">{{ text('machineDetail.preview', '預覽') }}</div>
          <div class="preview-value">{{ Number(spTemp).toFixed(1) }} °C</div>
          <div class="preview-sub">
            {{ humDisabled ? text('machineDetail.noHumidityControl', '低溫模式不控濕') : `${spHum ?? '--'} %RH` }}
          </div>
        </div>
      </div>

      <el-form :label-width="isMobile ? 'auto' : '130px'" :label-position="isMobile ? 'top' : 'right'">
        <el-form-item :label="text('machineDetail.setpointTemp', '目標溫度')">
          <el-input-number
            v-model="spTemp"
            :step="0.5"
            :precision="2"
            :min="-80"
            :max="250"
            class="w-set"
          />
          <span class="unit-text">°C</span>
        </el-form-item>

        <el-form-item :label="text('machineDetail.setpointHum', '目標濕度')">
          <el-input-number
            v-model="spHum"
            :step="1"
            :precision="0"
            :min="0"
            :max="100"
            class="w-set"
            :disabled="humDisabled"
          />
          <span class="unit-text">%</span>

          <el-button
            link
            type="info"
            class="clear-btn"
            :disabled="humDisabled"
            @click="spHum = null"
          >
            {{ text('machineDetail.btnClearHumidity', '清除濕度') }}
          </el-button>
        </el-form-item>

        <el-alert
          :title="text('machineDetail.setpointHint', '送出後會將新的 setpoint 寫入機台控制，並更新目前畫面資料')"
          type="info"
          :closable="false"
          show-icon
          class="mini-alert"
        />

        <small
          v-if="humDisabled"
          class="muted disabled-hint"
        >
          {{ text('machineDetail.humidityDisabledHint', '溫度低於 20°C 時不控濕，濕度會自動清除。') }}
        </small>
      </el-form>

      <template #footer>
        <el-button class="btn" @click="setpointOpen = false">
          {{ text('common.cancel', '取消') }}
        </el-button>
        <el-button class="btn" type="primary" :loading="setting" @click="submitSetpoint">
          {{ text('machineDetail.btnApplySetpoint', '套用設定') }}
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import {
  ArrowLeft,
  Refresh,
  VideoPlay,
  CircleClose,
  EditPen
} from '@element-plus/icons-vue'
import { useI18n } from 'vue-i18n'
import { getApiBase } from '@/utils/apiBase'

const { t, te } = useI18n()
const route = useRoute()
const apiBase = getApiBase()
const id = Number(route.params.id)

function text (key, fallback, params) {
  if (te(key)) return t(key, params)
  if (!params) return fallback
  return String(fallback).replace(/\{(\w+)\}/g, (_, k) => String(params?.[k] ?? ''))
}

const row = ref(null)
const monitor = ref({})
const schedules = ref([])

let timer = null

const setpointOpen = ref(false)
const spTemp = ref(25)
const spHum = ref(60)
const setting = ref(false)

const ACTIVE_SCHEDULE_STATUS = ['scheduled', 'running']

/* RWD */
const isMobile = ref(false)
let mql = null
let cleanupMql = null
function setupMql () {
  mql = window.matchMedia('(max-width: 768px)')
  const apply = () => { isMobile.value = !!mql.matches }
  apply()
  try { mql.addEventListener('change', apply) } catch { mql.addListener(apply) }
  return () => {
    try { mql.removeEventListener('change', apply) } catch { mql.removeListener(apply) }
  }
}

/* ===========================
   ✅ Telemetry WS（即時更新）
=========================== */
const telemetryOnline = ref(false)
let telemetryWs = null
let telemetryRetryTimer = null
let telemetryRetryCount = 0

function authHeaders () {
  const token = localStorage.getItem('token') || sessionStorage.getItem('token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

function fmt (v) {
  if (!v) return '-'
  const d = new Date(v)
  return d.toLocaleString()
}

function formatTemp (v) {
  if (v == null || Number.isNaN(Number(v))) return '--'
  return `${Number(v).toFixed(1)} °C`
}

function formatHumidity (v) {
  if (v == null || Number.isNaN(Number(v))) return '--'
  return `${Number(v).toFixed(1)} %RH`
}

function statusTagType (s) {
  const v = String(s || '').toLowerCase()
  if (v === 'running') return 'success'
  if (v === 'idle' || v === 'stopped') return 'info'
  if (v === 'maintenance') return 'warning'
  if (v === 'error') return 'danger'
  return 'info'
}

function machineStatusText (s) {
  const v = String(s || '').toLowerCase()
  if (v === 'running') return text('machineDetail.statusRunning', '運行中')
  if (v === 'stopped') return text('machineDetail.statusStopped', '已停止')
  if (v === 'maintenance') return text('machineDetail.statusMaintenance', '維護中')
  if (v === 'error') return text('machineDetail.statusError', '異常')
  if (v === 'idle' || !v) return text('machineDetail.statusIdle', '待命中')
  return s || '-'
}

function scheduleTagType (s) {
  const v = String(s || '').toLowerCase()
  if (v === 'running') return 'warning'
  if (v === 'completed') return 'success'
  if (v === 'canceled') return 'info'
  if (v === 'error' || v === 'failed' || v === 'fail') return 'danger'
  if (v === 'scheduled') return 'info'
  return 'info'
}

function scheduleStatusText (s) {
  const v = String(s || '').toLowerCase()
  if (v === 'scheduled') return text('machineDetail.scheduleStatusScheduled', '已排程')
  if (v === 'running') return text('machineDetail.scheduleStatusRunning', '執行中')
  if (v === 'completed') return text('machineDetail.scheduleStatusCompleted', '已完成')
  if (v === 'canceled') return text('machineDetail.scheduleStatusCanceled', '已取消')
  if (v === 'error') return text('machineDetail.scheduleStatusError', '異常')
  if (v === 'failed' || v === 'fail') return text('machineDetail.scheduleStatusFailed', '失敗')
  return s || '-'
}

function phaseText (phase) {
  const v = String(phase || '').toLowerCase()
  if (v === 'running') return text('machineDetail.phaseRunning', '執行中')
  if (v === 'upcoming') return text('machineDetail.phaseUpcoming', '即將開始')
  return text('machineDetail.phaseNone', '無排程')
}

function normalizeMachine (m) {
  const displayName = m.chamberName || m.name || `#${m.id}`
  const hasCurrent = !!m.currentSchedule
  const sch = hasCurrent ? m.currentSchedule : (m.nextSchedule || null)

  let progress = 0
  if (sch) {
    const p = sch.realtimeProgress ?? sch.progress ?? m.realtimeProgress
    progress = typeof p === 'number' ? p : 0
  } else if (Array.isArray(m.tests) && m.tests.length) {
    const running = m.tests.find((t) => String(t.status).toLowerCase() === 'running')
    const latest = [...m.tests].sort(
      (a, b) => new Date(b.startTime || 0) - new Date(a.startTime || 0)
    )[0]
    const p = running?.progress ?? latest?.progress
    progress = typeof p === 'number' ? p : 0
  }

  const currentPhase = hasCurrent ? 'running' : sch ? 'upcoming' : 'none'

  return {
    ...m,
    displayName,
    progress,
    scheduleTitle: sch?.testName || '',
    currentPhase,
    currentOrNext: currentPhase,
    startTime: sch?.startTime || null,
    endTime: sch?.endTime || null
  }
}

async function fetchDetail () {
  const res = await fetch(`${apiBase}/machines/${id}`, { headers: authHeaders() })
  const data = res.ok ? await res.json() : null
  row.value = data ? normalizeMachine(data) : null
}

async function fetchMonitor () {
  const res = await fetch(`${apiBase}/machines/machine-monitor/${id}`, {
    headers: authHeaders()
  })
  monitor.value = res.ok ? await res.json() : {}

  if (row.value) {
    if (monitor.value.targetTemp != null) row.value.targetTemp = monitor.value.targetTemp
    if (monitor.value.targetHumidity !== undefined) row.value.targetHumidity = monitor.value.targetHumidity
    if (monitor.value.lastSetpointAt) row.value.lastSetpointAt = monitor.value.lastSetpointAt
  }

  if (
    row.value &&
    row.value.currentPhase === 'running' &&
    typeof monitor.value.progress === 'number'
  ) {
    row.value.progress = monitor.value.progress
  }
}

async function fetchSchedules () {
  try {
    const params = new URLSearchParams({
      machineId: String(id),
      page: '1',
      pageSize: '200'
    })
    const res = await fetch(`${apiBase}/machine-schedules?${params.toString()}`, {
      headers: authHeaders()
    })
    if (!res.ok) {
      schedules.value = []
      return
    }

    const j = await res.json().catch(() => ({}))
    const list = j.rows || j.data?.rows || []

    const now = Date.now()
    schedules.value = list.map((s) => {
      const status = String(s.status || '').toLowerCase()
      const st = s.startTime ? new Date(s.startTime).getTime() : null
      const et = s.endTime ? new Date(s.endTime).getTime() : null

      let progress = 0
      if (typeof s.progress === 'number') progress = s.progress
      else if (status === 'completed') progress = 100
      else if (st && et && et > st) {
        const p = ((now - st) / (et - st)) * 100
        progress = Math.max(0, Math.min(100, Math.round(p)))
      }

      return { ...s, progress }
    })
  } catch (e) {
    console.error('load schedules failed', e)
    schedules.value = []
  }
}

const lockStartStop = computed(() => {
  const now = Date.now()
  return schedules.value.some((s) => {
    const status = String(s.status || '').toLowerCase()
    if (!ACTIVE_SCHEDULE_STATUS.includes(status)) return false
    if (!s.endTime) return true
    const et = new Date(s.endTime).getTime()
    return et >= now
  })
})

async function refresh () {
  try {
    await Promise.all([fetchDetail(), fetchMonitor(), fetchSchedules()])
  } catch (e) {
    console.error(e)
    ElMessage.error(text('machineDetail.loadFailed', '載入失敗'))
  }
}

async function toggle () {
  try {
    if (!row.value) return

    if (lockStartStop.value) {
      ElMessage.warning(text('machineDetail.lockedHint', '排程控制中，無法手動操作'))
      return
    }

    const url =
      row.value.status === 'running'
        ? `${apiBase}/machines/${id}/stop`
        : `${apiBase}/machines/${id}/start`

    const res = await fetch(url, { method: 'PUT', headers: authHeaders() })
    const j = await res.json().catch(() => null)
    if (!res.ok) throw new Error(j?.message || text('machineDetail.opFailed', '操作失敗'))

    ElMessage.success(j?.message || text('machineDetail.opSuccess', '操作成功'))
    await refresh()
  } catch (e) {
    console.error(e)
    ElMessage.error(e?.message || text('machineDetail.opFailed', '操作失敗'))
  }
}

/* ===========================
   ✅ Setpoint actions
=========================== */

const humDisabled = computed(() => {
  const tNum = Number(spTemp.value)
  return Number.isFinite(tNum) && tNum < 20
})

watch(humDisabled, (disabled) => {
  if (disabled) spHum.value = null
})

function openSetpoint () {
  if (!row.value) return

  const curTemp =
    row.value.targetTemp ??
    monitor.value.targetTemp ??
    monitor.value.temperature ??
    25

  const curHum =
    row.value.targetHumidity ??
    monitor.value.targetHumidity ??
    monitor.value.humidity ??
    60

  const tNum = Number(curTemp)
  spTemp.value = Number.isFinite(tNum) ? tNum : 25

  const hNum = Number(curHum)
  spHum.value = Number.isFinite(hNum) ? hNum : null

  if (Number(spTemp.value) < 20) spHum.value = null

  setpointOpen.value = true
}

async function submitSetpoint () {
  try {
    if (!row.value) return

    const temp = Number(spTemp.value)
    if (!Number.isFinite(temp)) {
      ElMessage.warning(text('machineDetail.setpointTempInvalid', '請輸入正確溫度'))
      return
    }
    if (temp < -80 || temp > 250) {
      ElMessage.warning(text('machineDetail.setpointTempOutOfRange', '溫度超出範圍'))
      return
    }

    const hum =
      temp < 20
        ? null
        : (spHum.value === null || spHum.value === '' ? null : Number(spHum.value))

    if (hum != null) {
      if (!Number.isFinite(hum)) {
        ElMessage.warning(text('machineDetail.setpointHumInvalid', '請輸入正確濕度'))
        return
      }
      if (hum < 0 || hum > 100) {
        ElMessage.warning(text('machineDetail.setpointHumOutOfRange', '濕度超出範圍'))
        return
      }
    }

    setting.value = true

    const res = await fetch(`${apiBase}/machines/${id}/setpoint`, {
      method: 'POST',
      headers: {
        ...authHeaders(),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ temperature: temp, humidity: hum })
    })

    const j = await res.json().catch(() => null)
    if (!res.ok) throw new Error(j?.message || text('machineDetail.setpointFail', '設定失敗'))

    ElMessage.success(j?.message || text('machineDetail.setpointSuccess', '設定成功'))
    setpointOpen.value = false

    if (j?.machine) row.value = normalizeMachine(j.machine)
    else await fetchDetail()
    await fetchMonitor()
  } catch (e) {
    console.error(e)
    ElMessage.error(e?.message || text('machineDetail.setpointFail', '設定失敗'))
  } finally {
    setting.value = false
  }
}

/* ===========================
   ✅ Telemetry WS functions
=========================== */

function buildTelemetryWsUrl () {
  try {
    if (apiBase && String(apiBase).startsWith('http')) {
      const u = new URL(apiBase)
      const proto = u.protocol === 'https:' ? 'wss:' : 'ws:'
      return `${proto}//${u.host}/ws/telemetry?machineId=${id}`
    }
  } catch {}

  const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  const host = window.location.hostname
  const backendPort = import.meta.env.VITE_BACKEND_PORT || 8080
  return `${proto}//${host}:${backendPort}/ws/telemetry?machineId=${id}`
}

function applyTelemetryPayload (p) {
  if (!p || typeof p !== 'object') return

  if (p.tempPV != null) monitor.value.temperature = Number(p.tempPV)
  if (p.humiPV != null) monitor.value.humidity = Number(p.humiPV)

  if (p.tempSV != null) monitor.value.targetTemp = Number(p.tempSV)
  if (p.humiSV !== undefined) {
    monitor.value.targetHumidity = (p.humiSV == null ? null : Number(p.humiSV))
  }

  if (p.receivedTime) monitor.value.updatedAt = p.receivedTime
  else monitor.value.updatedAt = new Date().toISOString()

  if (row.value) {
    if (monitor.value.targetTemp != null) row.value.targetTemp = monitor.value.targetTemp
    if (monitor.value.targetHumidity !== undefined) row.value.targetHumidity = monitor.value.targetHumidity
  }
}

function scheduleTelemetryReconnect () {
  if (telemetryRetryTimer) return
  const delay = Math.min(10000, 500 * Math.pow(2, telemetryRetryCount))
  telemetryRetryCount += 1

  telemetryRetryTimer = setTimeout(() => {
    telemetryRetryTimer = null
    connectTelemetry()
  }, delay)
}

function connectTelemetry () {
  const url = buildTelemetryWsUrl()
  console.log('[telemetry] ws url =', url)

  try { telemetryWs?.close() } catch {}
  telemetryWs = null

  try {
    telemetryWs = new WebSocket(url)

    telemetryWs.onopen = () => {
      telemetryOnline.value = true
      telemetryRetryCount = 0
      console.log('[telemetry] opened')
    }

    telemetryWs.onmessage = (ev) => {
      telemetryOnline.value = true

      let msg = null
      try { msg = JSON.parse(ev.data) } catch { msg = null }
      if (!msg) return

      const data = msg.data ?? null
      if (data) applyTelemetryPayload(data)
    }

    telemetryWs.onclose = () => {
      telemetryOnline.value = false
      scheduleTelemetryReconnect()
    }

    telemetryWs.onerror = () => {
      telemetryOnline.value = false
      try { telemetryWs?.close() } catch {}
    }
  } catch (e) {
    telemetryOnline.value = false
    scheduleTelemetryReconnect()
  }
}

onMounted(async () => {
  cleanupMql = setupMql()
  await refresh()
  connectTelemetry()
  timer = setInterval(fetchMonitor, 5000)
})

onUnmounted(() => {
  if (timer) clearInterval(timer)

  if (cleanupMql) cleanupMql()

  if (telemetryRetryTimer) {
    clearTimeout(telemetryRetryTimer)
    telemetryRetryTimer = null
  }

  try { telemetryWs?.close() } catch {}
})
</script>

<style scoped>
.machine-detail-page-vivid {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  color: var(--el-text-color-primary);
}

.muted { color: var(--el-text-color-secondary); }
.btn { border-radius: 12px; }
.pill { border-radius: 999px; }
.w-set { width: 220px; }

.hero-card,
.info-card,
.schedule-card {
  border: 1px solid var(--el-border-color-light);
  border-radius: 22px;
  background:
    radial-gradient(circle at top right, color-mix(in srgb, var(--el-color-primary) 12%, transparent) 0%, transparent 34%),
    linear-gradient(180deg, color-mix(in srgb, var(--el-bg-color) 94%, var(--el-color-primary-light-9) 6%) 0%, var(--el-bg-color) 100%);
  box-shadow: 0 18px 48px rgba(0, 0, 0, 0.06);
}

.hero-card {
  padding: 20px;
  overflow: hidden;
  position: relative;
}

.hero-card::after {
  content: '';
  position: absolute;
  inset: auto -70px -70px auto;
  width: 180px;
  height: 180px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--el-color-primary) 10%, transparent);
  filter: blur(10px);
  pointer-events: none;
}

.hero-main {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  margin-bottom: 18px;
}

.hero-left {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  min-width: 0;
  flex-wrap: wrap;
}

.hero-copy {
  min-width: 0;
}

.hero-eyebrow {
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.08em;
  color: var(--el-color-primary);
  margin-bottom: 4px;
}

.hero-title {
  margin: 0;
  font-size: 30px;
  font-weight: 800;
  line-height: 1.15;
}

.hero-subtitle {
  margin-top: 6px;
  color: var(--el-text-color-secondary);
  font-size: 14px;
  line-height: 1.6;
}

.hero-actions {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}

.stat-card {
  padding: 14px 16px;
  border-radius: 18px;
  background: color-mix(in srgb, var(--el-fill-color-light) 88%, white 12%);
  border: 1px solid var(--el-border-color-lighter);
}

.stat-primary {
  background: linear-gradient(135deg, var(--el-color-primary-light-8), var(--el-color-primary-light-9));
  border-color: color-mix(in srgb, var(--el-color-primary) 35%, var(--el-border-color));
}

.stat-label {
  color: var(--el-text-color-secondary);
  font-size: 12px;
  margin-bottom: 6px;
}

.stat-value {
  font-size: 26px;
  font-weight: 800;
  line-height: 1.05;
}

.info-grid-2 {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.section-title {
  font-size: 18px;
  font-weight: 800;
  line-height: 1.2;
}

.section-subtitle {
  margin-top: 4px;
  font-size: 13px;
  color: var(--el-text-color-secondary);
}

.meta-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.meta-grid.single {
  grid-template-columns: 1fr;
}

.meta-box {
  padding: 10px 12px;
  border-radius: 14px;
  border: 1px solid var(--el-border-color-lighter);
  background: color-mix(in srgb, var(--el-fill-color-light) 88%, white 12%);
}

.meta-label {
  display: block;
  font-size: 12px;
  color: var(--el-text-color-secondary);
  margin-bottom: 4px;
}

.meta-value {
  font-size: 14px;
  font-weight: 700;
  line-height: 1.45;
  word-break: break-word;
}

.progress-panel {
  margin-top: 14px;
  padding: 12px;
  border-radius: 16px;
  border: 1px solid var(--el-border-color-lighter);
  background: color-mix(in srgb, var(--el-fill-color-light) 88%, white 12%);
}

.progress-panel.compact {
  margin-top: 10px;
}

.progress-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 8px;
  font-size: 13px;
}

.progress-head strong {
  font-size: 16px;
}

.mini-tip {
  margin-top: 8px;
  font-size: 12px;
}

.env-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.env-card {
  padding: 12px;
  border-radius: 16px;
  border: 1px solid var(--el-border-color-lighter);
  background: color-mix(in srgb, var(--el-fill-color-light) 88%, white 12%);
}

.env-label {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  margin-bottom: 4px;
}

.env-value {
  font-size: 18px;
  font-weight: 800;
}

.setpoint-note {
  margin-top: 12px;
  padding: 10px 12px;
  border-radius: 14px;
  background: color-mix(in srgb, var(--el-bg-color) 92%, var(--el-color-primary-light-9) 8%);
  border: 1px dashed var(--el-border-color);
  font-size: 13px;
}

.runtime-card {
  margin-top: 12px;
  padding: 12px;
  border-radius: 16px;
  border: 1px dashed var(--el-border-color);
  background: color-mix(in srgb, var(--el-bg-color) 92%, var(--el-color-primary-light-9) 8%);
}

.tbl :deep(.el-table__header-wrapper th){
  background: var(--el-fill-color-light);
}

.mobile-schedules {
  display: grid;
  gap: 12px;
}

.schedule-item {
  border: 1px solid var(--el-border-color-lighter);
  background: var(--el-bg-color);
  border-radius: 18px;
  padding: 14px;
}

.schedule-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
}

.schedule-name {
  font-size: 16px;
  font-weight: 800;
}

.dialog-hero {
  display: grid;
  grid-template-columns: minmax(0, 1.3fr) minmax(220px, 0.9fr);
  gap: 12px;
  margin-bottom: 14px;
}

.dialog-main,
.dialog-preview {
  padding: 14px 16px;
  border-radius: 18px;
  border: 1px solid var(--el-border-color-lighter);
  background: linear-gradient(180deg, color-mix(in srgb, var(--el-fill-color-light) 92%, white 8%) 0%, var(--el-bg-color) 100%);
}

.dialog-title {
  font-size: 16px;
  font-weight: 800;
}

.dialog-subtitle {
  margin-top: 6px;
  font-size: 13px;
  color: var(--el-text-color-secondary);
  line-height: 1.6;
}

.preview-label {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  margin-bottom: 6px;
}

.preview-value {
  font-size: 14px;
  font-weight: 800;
}

.preview-sub {
  margin-top: 6px;
  font-size: 12px;
  color: var(--el-color-primary);
  font-weight: 700;
}

.unit-text {
  margin-left: 8px;
}

.clear-btn {
  margin-left: 8px;
}

.mini-alert {
  margin-top: 6px;
}

.disabled-hint {
  display: block;
  margin-top: 8px;
}

@media (max-width: 1100px) {
  .stats-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .dialog-hero {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 900px) {
  .info-grid-2 {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .machine-detail-page-vivid {
    padding: 12px;
    gap: 12px;
  }

  .hero-card {
    padding: 16px;
  }

  .hero-main {
    flex-direction: column;
    align-items: stretch;
  }

  .hero-actions {
    justify-content: flex-start;
  }
}

@media (max-width: 640px) {
  .hero-title {
    font-size: 24px;
  }

  .stats-grid,
  .meta-grid,
  .env-grid {
    grid-template-columns: 1fr;
  }

  .hero-actions :deep(.el-button) {
    flex: 1 1 calc(50% - 8px);
  }

  .w-set {
    width: 100%;
  }
}
</style>
