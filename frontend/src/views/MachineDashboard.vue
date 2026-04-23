<template>
  <div class="page machine-dashboard-page-vivid">
    <section class="hero-card">
      <div class="hero-main">
        <div class="hero-left">
          <div class="hero-icon-wrap">
            <div class="hero-icon">🖥️</div>
          </div>

          <div class="hero-copy">
            <div class="hero-eyebrow">{{ text('machineDashboard.eyebrow', 'Realtime Chamber Overview') }}</div>
            <h2 class="hero-title">{{ text('machineDashboard.title', '機台總覽') }}</h2>
            <div class="hero-subtitle">
              {{ text('machineDashboard.heroSubtitle', '集中查看機台狀態、排程進度、環境資訊與快速操作入口') }}
            </div>
          </div>
        </div>

        <div class="hero-actions">
          <el-input
            v-model="kw"
            :placeholder="text('machineDashboard.searchPlaceholder', '搜尋機台名稱或 ID')"
            clearable
            class="kw-input"
            @keyup.enter="fetchData"
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>

          <el-button class="btn" :icon="Refresh" @click="fetchData">
            {{ text('machineDashboard.btnReload', '重新整理') }}
          </el-button>
        </div>
      </div>

      <div class="stats-grid">
        <div class="stat-card stat-primary">
          <div class="stat-label">{{ text('machineDashboard.stats.total', '機台總數') }}</div>
          <div class="stat-value">{{ filtered.length }}</div>
        </div>

        <div class="stat-card">
          <div class="stat-label">{{ text('machineDashboard.stats.running', '運行中') }}</div>
          <div class="stat-value">{{ runningCount }}</div>
        </div>

        <div class="stat-card">
          <div class="stat-label">{{ text('machineDashboard.stats.idle', '待命 / 停止') }}</div>
          <div class="stat-value">{{ idleCount }}</div>
        </div>

        <div class="stat-card">
          <div class="stat-label">{{ text('machineDashboard.stats.avgProgress', '平均進度') }}</div>
          <div class="stat-value">{{ avgProgress }}%</div>
        </div>
      </div>
    </section>

    <div class="machine-grid">
      <article
        v-for="m in filtered"
        :key="m.id"
        class="machine-card"
      >
        <div class="machine-top">
          <div class="machine-name-wrap">
            <div class="machine-name">{{ m.displayName }}</div>
            <div class="machine-id">#{{ m.id }}</div>
          </div>

          <el-tag :type="statusTagType(m.status)" size="small" effect="plain" class="pill mini">
            {{ statusText(m.status) }}
          </el-tag>
        </div>

        <div class="preview">
          <el-image
            :src="previewSrc(m)"
            fit="contain"
            class="preview-img"
          >
            <template #error>
              <div class="preview-fallback">
                <img src="/LOGO.png" class="fallback-img" alt="fallback" />
                <span>{{ text('machineDashboard.previewLoadFailed', '預覽圖載入失敗') }}</span>
              </div>
            </template>
          </el-image>
        </div>

        <div class="progress-panel">
          <div class="progress-head">
            <span>{{ text('machineDashboard.colProgress', '進度') }}</span>
            <strong>{{ Math.round(m.progress || 0) }}%</strong>
          </div>
          <el-progress
            :percentage="Math.round(m.progress || 0)"
            :stroke-width="10"
            :status="Math.round(m.progress || 0) >= 100 ? 'success' : ''"
          />
        </div>

        <div class="info-grid">
          <div class="meta-box">
            <div class="meta-label">{{ text('machineDashboard.fieldSchedule', '排程') }}</div>
            <div class="meta-value">{{ m.scheduleTitle || '-' }}</div>
          </div>

          <div class="meta-box">
            <div class="meta-label">{{ text('machineDashboard.fieldStatus', '階段') }}</div>
            <div class="meta-value muted">{{ phaseText(m.currentPhase) }}</div>
          </div>

          <div class="meta-box">
            <div class="meta-label">{{ text('machineDashboard.fieldUser', '使用者') }}</div>
            <div class="meta-value">{{ m.scheduleUser || '-' }}</div>
          </div>

          <div class="meta-box">
            <div class="meta-label">{{ text('machineDashboard.fieldStart', '開始') }}</div>
            <div class="meta-value">{{ fmt(m.startTime) }}</div>
          </div>

          <div class="meta-box">
            <div class="meta-label">{{ text('machineDashboard.fieldEnd', '結束') }}</div>
            <div class="meta-value">{{ fmt(m.endTime) }}</div>
          </div>
        </div>

        <div class="env-block">
          <div class="env-title">{{ text('machineDashboard.envTitle', '環境資訊') }}</div>
          <div class="env-grid">
            <div class="env-card">
              <div class="env-label">{{ text('machineDashboard.fieldTemp', '溫度') }}</div>
              <div class="env-value">{{ formatTemp(m.currentTemp) }}</div>
            </div>
            <div class="env-card">
              <div class="env-label">{{ text('machineDashboard.fieldHumidity', '濕度') }}</div>
              <div class="env-value">{{ formatHumidity(m.currentHumidity) }}</div>
            </div>
          </div>
        </div>

        <div class="ops">
          <el-button
            size="small"
            type="primary"
            :icon="List"
            @click="$router.push(`/machines/${m.id}`)"
          >
            {{ text('machineDashboard.btnDetail', '詳細資料') }}
          </el-button>

          <el-button
            size="small"
            type="warning"
            :icon="Plus"
            @click="goCreateSchedule(m)"
          >
            {{ text('machineDashboard.btnNewSchedule', '新增排程') }}
          </el-button>

          <el-button
            size="small"
            :type="m.status === 'running' ? 'danger' : 'success'"
            plain
            :icon="m.status === 'running' ? CircleClose : VideoPlay"
            @click="toggle(m)"
          >
            {{
              m.status === 'running'
                ? text('machineDashboard.btnStop', '停止')
                : text('machineDashboard.btnStart', '啟動')
            }}
          </el-button>
        </div>
      </article>
    </div>

    <el-empty
      v-if="!filtered.length"
      :description="text('common.noData', '目前沒有資料')"
      class="empty-state"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import {
  Refresh,
  Search,
  VideoPlay,
  CircleClose,
  List,
  Plus
} from '@element-plus/icons-vue'
import { useI18n } from 'vue-i18n'
import { getApiBase } from '@/utils/apiBase'

const { t, te } = useI18n()
const router = useRouter()
const apiBase = getApiBase()

function text (key, fallback, params) {
  if (te(key)) return t(key, params)
  if (!params) return fallback
  return String(fallback).replace(/\{(\w+)\}/g, (_, k) => String(params?.[k] ?? ''))
}

const rows = ref([])
const kw = ref('')

function authHeaders () {
  const token = localStorage.getItem('token') || sessionStorage.getItem('token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

function statusTagType (s) {
  const v = String(s || '').toLowerCase()
  if (v === 'running') return 'success'
  if (v === 'idle' || v === 'stopped') return 'info'
  if (v === 'maintenance') return 'warning'
  if (v === 'error') return 'danger'
  return 'info'
}

function statusText (s) {
  const v = String(s || '').toLowerCase()
  if (v === 'running') return text('machineDashboard.statusRunning', '運行中')
  if (v === 'stopped') return text('machineDashboard.statusStopped', '已停止')
  if (v === 'maintenance') return text('machineDashboard.statusMaintenance', '維護中')
  if (v === 'error') return text('machineDashboard.statusError', '異常')
  if (v === 'idle' || !v) return text('machineDashboard.statusIdle', '待命中')
  return s
}

function phaseText (phase) {
  if (phase === 'running') return text('machineDashboard.phaseRunning', '執行中')
  if (phase === 'upcoming') return text('machineDashboard.phaseUpcoming', '即將開始')
  return text('machineDashboard.phaseNone', '無排程')
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

const filtered = computed(() => {
  const q = String(kw.value || '').trim().toLowerCase()
  if (!q) return rows.value
  return rows.value.filter((x) => {
    const name = String(x.displayName || '').toLowerCase()
    return name.includes(q) || String(x.id || '').includes(q)
  })
})

const runningCount = computed(() =>
  filtered.value.filter(m => String(m.status || '').toLowerCase() === 'running').length
)
const idleCount = computed(() =>
  filtered.value.filter(m => ['idle', 'stopped', ''].includes(String(m.status || '').toLowerCase())).length
)
const avgProgress = computed(() => {
  if (!filtered.value.length) return 0
  const total = filtered.value.reduce((sum, m) => sum + Number(m.progress || 0), 0)
  return Math.round(total / filtered.value.length)
})

function normalize (m) {
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
  const scheduleUser = sch?.userName || sch?.user?.name || sch?.operator || ''

  const currentTemp = m.currentTemp ?? m.temperature ?? m.envTemp ?? null
  const currentHumidity = m.currentHumidity ?? m.humidity ?? m.envHumidity ?? null

  return {
    ...m,
    displayName,
    progress,
    scheduleTitle: sch?.testName || '',
    scheduleUser,
    currentPhase,
    startTime: sch?.startTime || null,
    endTime: sch?.endTime || null,
    currentTemp,
    currentHumidity
  }
}

function extractChamberNo (m) {
  const s = String(m?.displayName || m?.name || m?.chamberName || '')
  const m1 = s.match(/chamber\s*([0-9]+)/i)
  if (m1 && m1[1]) return Number(m1[1])
  return null
}

function previewSrc (m) {
  const n = extractChamberNo(m)
  if (!n) return '/LOGO.png'
  const filename = `Chamber ${n}.jpg`
  return `/${encodeURIComponent(filename)}`
}

async function fetchData () {
  try {
    const res = await fetch(`${apiBase}/machines`, { headers: authHeaders() })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)

    const body = (await res.json().catch(() => null)) ?? {}
    let list = []

    if (Array.isArray(body)) list = body
    else if (Array.isArray(body.data)) list = body.data
    else if (Array.isArray(body.rows)) list = body.rows
    else if (body.data && Array.isArray(body.data.rows)) list = body.data.rows
    else list = []

    rows.value = list.map(normalize)
  } catch (e) {
    console.error(e)
    rows.value = []
    ElMessage.error(text('machineDashboard.fetchFailed', '載入機台資料失敗'))
  }
}

async function toggle (m) {
  try {
    const url =
      m.status === 'running'
        ? `${apiBase}/machines/${m.id}/stop`
        : `${apiBase}/machines/${m.id}/start`

    const res = await fetch(url, { method: 'PUT', headers: authHeaders() })
    const j = await res.json().catch(() => null)
    if (!res.ok) throw new Error(j?.message || text('machineDashboard.opFailed', '操作失敗'))

    ElMessage.success(j?.message || text('machineDashboard.opSuccess', '操作成功'))
    fetchData()
  } catch (e) {
    console.error(e)
    ElMessage.error(e?.message || text('machineDashboard.opFailed', '操作失敗'))
  }
}

function goCreateSchedule (m) {
  router.push({
    path: '/machine-schedules/new',
    query: { machineId: m.id }
  })
}

onMounted(() => {
  fetchData()
})
</script>

<style scoped>
.machine-dashboard-page-vivid {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  color: var(--el-text-color-primary);
}

.muted { color: var(--el-text-color-secondary); }
.btn { border-radius: 12px; }
.kw-input { width: 260px; max-width: 100%; }
.pill { border-radius: 999px; }
.pill.mini { font-size: 12px; padding: 2px 10px; }

.hero-card {
  border: 1px solid var(--el-border-color-light);
  border-radius: 22px;
  background:
    radial-gradient(circle at top right, color-mix(in srgb, var(--el-color-primary) 12%, transparent) 0%, transparent 34%),
    linear-gradient(180deg, color-mix(in srgb, var(--el-bg-color) 94%, var(--el-color-primary-light-9) 6%) 0%, var(--el-bg-color) 100%);
  box-shadow: 0 18px 48px rgba(0, 0, 0, 0.06);
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
  align-items: center;
  gap: 14px;
  min-width: 0;
}

.hero-icon-wrap {
  width: 66px;
  height: 66px;
  border-radius: 20px;
  display: grid;
  place-items: center;
  background: linear-gradient(135deg, var(--el-color-primary-light-7), var(--el-color-primary-light-9));
  border: 1px solid color-mix(in srgb, var(--el-color-primary) 25%, var(--el-border-color-light));
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.5);
}

.hero-icon { font-size: 30px; }
.hero-copy { min-width: 0; }
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
}

.hero-actions {
  display: flex;
  align-items: center;
  gap: 10px;
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
  font-size: 28px;
  font-weight: 800;
  line-height: 1;
}

.machine-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;
}

.machine-card {
  border: 1px solid var(--el-border-color-light);
  border-radius: 22px;
  background:
    linear-gradient(180deg, color-mix(in srgb, var(--el-bg-color) 98%, var(--el-color-primary-light-9) 2%) 0%, var(--el-bg-color) 100%);
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.05);
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-height: 100%;
}

.machine-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
}

.machine-name-wrap {
  min-width: 0;
}

.machine-name {
  font-size: 18px;
  font-weight: 800;
  line-height: 1.25;
  word-break: break-word;
}
.machine-id {
  margin-top: 4px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.preview {
  position: relative;
  height: clamp(180px, 18vw, 280px);
  border-radius: 16px;
  overflow: hidden;
  border: 1px solid var(--el-border-color);
  background: color-mix(in srgb, var(--el-fill-color-light) 86%, white 14%);
}

.preview-img {
  width: 100%;
  height: 100%;
}

.preview-img :deep(img) {
  object-fit: contain;
  object-position: center;
}

.preview-fallback {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 6px;
  align-items: center;
  justify-content: center;
  color: var(--el-text-color-secondary);
}

.fallback-img {
  width: 64px;
  height: 64px;
  object-fit: contain;
  opacity: 0.75;
}

.progress-panel {
  padding: 12px;
  border-radius: 16px;
  border: 1px solid var(--el-border-color-lighter);
  background: color-mix(in srgb, var(--el-fill-color-light) 88%, white 12%);
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

.info-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}
.meta-box {
  padding: 10px 12px;
  border-radius: 14px;
  border: 1px solid var(--el-border-color-lighter);
  background: color-mix(in srgb, var(--el-fill-color-light) 88%, white 12%);
}
.meta-label {
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

.env-block {
  padding: 12px;
  border-radius: 16px;
  border: 1px dashed var(--el-border-color);
  background: color-mix(in srgb, var(--el-bg-color) 92%, var(--el-color-primary-light-9) 8%);
}
.env-title {
  font-size: 13px;
  font-weight: 800;
  margin-bottom: 8px;
}
.env-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}
.env-card {
  padding: 10px 12px;
  border-radius: 14px;
  background: var(--el-bg-color);
  border: 1px solid var(--el-border-color-lighter);
}
.env-label {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  margin-bottom: 4px;
}
.env-value {
  font-size: 16px;
  font-weight: 800;
}

.ops {
  margin-top: auto;
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.ops :deep(.el-button) {
  flex: 1 1 calc(33.333% - 8px);
  min-width: 110px;
  border-radius: 12px;
}

.empty-state {
  border: 1px dashed var(--el-border-color);
  border-radius: 18px;
  background: var(--el-bg-color);
  padding: 18px;
}

@media (max-width: 1200px) {
  .machine-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 1100px) {
  .stats-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 900px) {
  .machine-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 768px) {
  .machine-dashboard-page-vivid {
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

  .kw-input {
    width: 100%;
  }
}

@media (max-width: 640px) {
  .hero-left {
    align-items: flex-start;
  }

  .hero-title {
    font-size: 24px;
  }

  .stats-grid,
  .machine-grid,
  .info-grid,
  .env-grid {
    grid-template-columns: 1fr;
  }

  .ops :deep(.el-button) {
    flex: 1 1 100%;
    min-width: 0;
  }
}
</style>
