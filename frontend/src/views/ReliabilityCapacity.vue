<template>
  <div class="page reliability-capacity-page-vivid">
    <section class="hero-card">
      <div class="hero-main">
        <div class="hero-left">
          <div class="hero-icon-wrap">
            <div class="hero-icon">📊</div>
          </div>

          <div class="hero-copy">
            <div class="hero-eyebrow">{{ text('reliabilityCapacity.eyebrow', 'Reliability Capacity Monitor') }}</div>
            <h2 class="hero-title">{{ text('reliabilityCapacity.title', 'Reliability Capacity') }}</h2>
            <div class="hero-subtitle">
              {{ text('reliabilityCapacity.heroSubtitle', '即時掌握 Chamber 產能占用、剩餘空間、溫度狀態與整體使用率') }}
            </div>
          </div>
        </div>

        <div class="hero-actions">
          <el-tag type="success" effect="dark" class="pill">
            {{ text('reliabilityCapacity.tagRealtime', 'Realtime') }}
          </el-tag>

          <div v-if="lastUpdated" class="updated-chip">
            <span class="updated-label">{{ text('reliabilityCapacity.updatedAtPrefix', '更新時間') }}</span>
            <strong>{{ lastUpdated }}</strong>
          </div>

          <el-button class="btn" :icon="Refresh" :loading="loading" @click="fetchData">
            {{ text('common.refresh', '重新整理') }}
          </el-button>
        </div>
      </div>

      <div class="stats-grid">
        <div class="stat-card stat-primary">
          <div class="stat-label">{{ text('reliabilityCapacity.summary.chamber15Count', 'Chamber 1~5 數量') }}</div>
          <div class="stat-value">{{ summary.totalMachines }}</div>
        </div>

        <div class="stat-card">
          <div class="stat-label">{{ text('reliabilityCapacity.summary.totalSlots', '總容量') }}</div>
          <div class="stat-value">{{ summary.totalSlots }}</div>
        </div>

        <div class="stat-card">
          <div class="stat-label">{{ text('reliabilityCapacity.summary.usedSlots', '已使用') }}</div>
          <div class="stat-value used">{{ summary.usedSlots }}</div>
        </div>

        <div class="stat-card">
          <div class="stat-label">{{ text('reliabilityCapacity.summary.freeSlots', '剩餘容量') }}</div>
          <div class="stat-value free">{{ summary.freeSlots }}</div>
        </div>
      </div>
    </section>

    <div class="top-grid">
      <el-card shadow="never" class="overview-card">
        <template #header>
          <div class="section-head">
            <div>
              <div class="section-title">{{ text('reliabilityCapacity.overview.title', '整體使用率') }}</div>
              <div class="section-subtitle">
                {{ text('reliabilityCapacity.overviewSubtitle', '依 Chamber 1~5 匯總計算目前產能占用比例') }}
              </div>
            </div>
          </div>
        </template>

        <div class="overview-content">
          <div class="pie-wrapper">
            <div class="pie" :style="pieStyle">
              <div class="pie-inner">
                <div class="pie-label">
                  <div class="pie-percent">{{ summaryUsedPercent }}%</div>
                  <div class="pie-caption">
                    {{ text('reliabilityCapacity.overview.currentUtilization', '目前使用率') }}
                  </div>
                </div>
              </div>
            </div>

            <div class="pie-legend">
              <div class="legend-item">
                <span class="legend-color used"></span>
                <span>
                  {{ text('reliabilityCapacity.overview.legendUsed', '已使用：{used}', { used: summary.usedSlots }) }}
                </span>
              </div>
              <div class="legend-item">
                <span class="legend-color free"></span>
                <span>
                  {{ text('reliabilityCapacity.overview.legendFree', '可用：{free}', { free: summary.freeSlots }) }}
                </span>
              </div>
            </div>
          </div>

          <div class="overview-details">
            <div class="detail-chip">
              <span>{{ text('reliabilityCapacity.overview.nominalSlots', '標稱容量') }}</span>
              <strong>{{ summary.totalSlots }}</strong>
            </div>
            <div class="detail-chip">
              <span>{{ text('reliabilityCapacity.overview.used', '已使用') }}</span>
              <strong>{{ summary.usedSlots }} ({{ summaryUsedPercent }}%)</strong>
            </div>
            <div class="detail-chip">
              <span>{{ text('reliabilityCapacity.overview.free', '可用容量') }}</span>
              <strong>{{ summary.freeSlots }}</strong>
            </div>

            <p class="hint">
              {{ text('reliabilityCapacity.overview.hint1', '若 Chamber 溫度低於門檻且已有排程，系統會視為滿載。') }}
            </p>
            <p class="hint">
              {{ text('reliabilityCapacity.overview.hint2', 'Chamber 6 會獨立顯示，不納入 Chamber 1~5 匯總統計。') }}
            </p>
          </div>
        </div>
      </el-card>

      <el-card shadow="never" class="overview-card">
        <template #header>
          <div class="section-head">
            <div>
              <div class="section-title">{{ text('reliabilityCapacity.quickSummaryTitle', '快速摘要') }}</div>
              <div class="section-subtitle">
                {{ text('reliabilityCapacity.quickSummarySubtitle', '快速檢視目前占用、空位與溫度門檻影響') }}
              </div>
            </div>
          </div>
        </template>

        <div class="quick-grid">
          <div class="quick-card">
            <div class="quick-label">{{ text('reliabilityCapacity.quick.usedRate', '使用率') }}</div>
            <div class="quick-value">{{ summaryUsedPercent }}%</div>
          </div>
          <div class="quick-card">
            <div class="quick-label">{{ text('reliabilityCapacity.quick.threshold', '滿載門檻') }}</div>
            <div class="quick-value">&lt; {{ TEMP_FULL_THRESHOLD }}°C</div>
          </div>
          <div class="quick-card">
            <div class="quick-label">{{ text('reliabilityCapacity.quick.activeChambers', '統計中機台') }}</div>
            <div class="quick-value">{{ chamber1to5.length }}</div>
          </div>
          <div class="quick-card">
            <div class="quick-label">{{ text('reliabilityCapacity.quick.specialChamber', '特殊機台') }}</div>
            <div class="quick-value">{{ chamber6 ? 'Chamber 6' : '--' }}</div>
          </div>
        </div>
      </el-card>
    </div>

    <el-card shadow="never" class="machine-table-card">
      <template #header>
        <div class="section-head">
          <div>
            <div class="section-title">{{ text('reliabilityCapacity.table.title', '各機台明細') }}</div>
            <div class="section-subtitle">
              {{ text('reliabilityCapacity.tableSubtitle', '列出 Chamber 1~5 的容量、溫度、納入統計狀態與使用率') }}
            </div>
          </div>

          <el-tag effect="plain" round>
            {{ text('reliabilityCapacity.tableCountTag', '共 {count} 台', { count: chamber1to5.length }) }}
          </el-tag>
        </div>
      </template>

      <el-table
        v-if="!isMobile"
        v-loading="loading"
        :data="chamber1to5"
        border
        :size="tableSize"
        class="reliability-table"
        style="width: 100%"
        :empty-text="text('reliabilityCapacity.table.empty', '目前沒有資料')"
      >
        <el-table-column
          prop="chamberNo"
          :label="text('reliabilityCapacity.table.chamber', 'Chamber')"
          width="110"
          align="center"
        >
          <template #default="{ row }">
            <span v-if="row.chamberNo">
              {{ text('reliabilityCapacity.table.chamberWithNo', 'Chamber {no}', { no: row.chamberNo }) }}
            </span>
            <span v-else>-</span>
          </template>
        </el-table-column>

        <el-table-column prop="name" :label="text('reliabilityCapacity.table.name', '名稱')" min-width="140" />
        <el-table-column prop="model" :label="text('reliabilityCapacity.table.model', '型號')" min-width="140" />
        <el-table-column prop="code" :label="text('reliabilityCapacity.table.code', '代碼')" min-width="120" />

        <el-table-column prop="status" :label="text('reliabilityCapacity.table.status', '狀態')" min-width="100">
          <template #default="{ row }">
            <el-tag size="small" type="info">
              {{ row.status || text('common.na', 'N/A') }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column
          :label="text('reliabilityCapacity.table.currentTemp', '目前溫度')"
          min-width="140"
          align="right"
        >
          <template #default="{ row }">
            <el-tag :type="tempStatus(row)" size="small">
              {{ formatTemp(row.temp) }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column
          prop="maxSlots"
          :label="text('reliabilityCapacity.table.nominalSlots', '標稱容量')"
          min-width="120"
          align="right"
        />
        <el-table-column
          prop="usedSlots"
          :label="text('reliabilityCapacity.table.usedSlots', '已使用')"
          min-width="100"
          align="right"
        >
          <template #default="{ row }">
            <span class="used">{{ row.usedSlots }}</span>
          </template>
        </el-table-column>

        <el-table-column
          prop="freeSlots"
          :label="text('reliabilityCapacity.table.freeSlots', '可用')"
          min-width="100"
          align="right"
        >
          <template #default="{ row }">
            <span class="free">{{ row.freeSlots }}</span>
          </template>
        </el-table-column>

        <el-table-column :label="text('reliabilityCapacity.table.includeInSummary', '納入統計')" width="120" align="center">
          <template #default="{ row }">
            <el-tag v-if="row.includeInSummary" type="success" size="small">
              {{ text('common.yes', '是') }}
            </el-tag>
            <el-tag v-else type="info" size="small">
              {{ text('common.no', '否') }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column :label="text('reliabilityCapacity.table.utilization', '使用率')" min-width="220">
          <template #default="{ row }">
            <div class="utilization-cell">
              <el-progress
                :percentage="row.utilization"
                :status="utilizationStatus(row.utilization)"
              />
              <span class="utilization-text">
                {{ row.utilization }}%
              </span>
            </div>
          </template>
        </el-table-column>
      </el-table>

      <div v-else class="mobile-list">
        <template v-if="chamber1to5.length">
          <article v-for="row in chamber1to5" :key="row.code || row.name || row.chamberNo" class="machine-card">
            <div class="machine-top">
              <div>
                <div class="machine-title">
                  {{ row.chamberNo ? text('reliabilityCapacity.table.chamberWithNo', 'Chamber {no}', { no: row.chamberNo }) : '-' }}
                </div>
                <div class="machine-sub">{{ row.name || '-' }} · {{ row.model || '-' }}</div>
              </div>

              <el-tag v-if="row.includeInSummary" type="success" size="small" effect="plain" class="pill mini">
                {{ text('common.yes', '是') }}
              </el-tag>
              <el-tag v-else type="info" size="small" effect="plain" class="pill mini">
                {{ text('common.no', '否') }}
              </el-tag>
            </div>

            <div class="meta-grid">
              <div class="meta-box">
                <div class="meta-label">{{ text('reliabilityCapacity.table.code', '代碼') }}</div>
                <div class="meta-value">{{ row.code || '-' }}</div>
              </div>
              <div class="meta-box">
                <div class="meta-label">{{ text('reliabilityCapacity.table.status', '狀態') }}</div>
                <div class="meta-value">{{ row.status || text('common.na', 'N/A') }}</div>
              </div>
              <div class="meta-box">
                <div class="meta-label">{{ text('reliabilityCapacity.table.currentTemp', '目前溫度') }}</div>
                <div class="meta-value">
                  <el-tag :type="tempStatus(row)" size="small">
                    {{ formatTemp(row.temp) }}
                  </el-tag>
                </div>
              </div>
              <div class="meta-box">
                <div class="meta-label">{{ text('reliabilityCapacity.table.nominalSlots', '標稱容量') }}</div>
                <div class="meta-value">{{ row.maxSlots }}</div>
              </div>
              <div class="meta-box">
                <div class="meta-label">{{ text('reliabilityCapacity.table.usedSlots', '已使用') }}</div>
                <div class="meta-value used">{{ row.usedSlots }}</div>
              </div>
              <div class="meta-box">
                <div class="meta-label">{{ text('reliabilityCapacity.table.freeSlots', '可用') }}</div>
                <div class="meta-value free">{{ row.freeSlots }}</div>
              </div>
            </div>

            <div class="progress-panel">
              <div class="progress-head">
                <span>{{ text('reliabilityCapacity.table.utilization', '使用率') }}</span>
                <strong>{{ row.utilization }}%</strong>
              </div>
              <el-progress
                :percentage="row.utilization"
                :status="utilizationStatus(row.utilization)"
              />
            </div>
          </article>
        </template>

        <el-empty
          v-else
          :description="text('reliabilityCapacity.table.empty', '目前沒有資料')"
        />
      </div>
    </el-card>

    <el-card v-if="chamber6" shadow="never" class="machine-table-card special-card">
      <template #header>
        <div class="section-head">
          <div>
            <div class="section-title">{{ text('reliabilityCapacity.chamber6.title', 'Chamber 6') }}</div>
            <div class="section-subtitle">
              {{ text('reliabilityCapacity.chamber6.subtitle', '此機台獨立顯示，不納入 Chamber 1~5 匯總統計') }}
            </div>
          </div>

          <el-tag effect="plain" type="warning" round>
            {{ text('reliabilityCapacity.chamber6.excludedTag', 'Excluded from summary') }}
          </el-tag>
        </div>
      </template>

      <el-descriptions :column="isMobile ? 1 : 3" border size="small" class="special-desc">
        <el-descriptions-item :label="text('reliabilityCapacity.chamber6.name', '名稱')">
          {{ chamber6.name || '-' }}
        </el-descriptions-item>
        <el-descriptions-item :label="text('reliabilityCapacity.chamber6.model', '型號')">
          {{ chamber6.model || '-' }}
        </el-descriptions-item>
        <el-descriptions-item :label="text('reliabilityCapacity.chamber6.code', '代碼')">
          {{ chamber6.code || '-' }}
        </el-descriptions-item>

        <el-descriptions-item :label="text('reliabilityCapacity.chamber6.nominalSlots', '標稱容量')">
          {{ chamber6.maxSlots }}
        </el-descriptions-item>
        <el-descriptions-item :label="text('reliabilityCapacity.chamber6.usedSlots', '已使用')">
          <span class="used">{{ chamber6.usedSlots }}</span>
        </el-descriptions-item>
        <el-descriptions-item :label="text('reliabilityCapacity.chamber6.freeSlots', '可用')">
          <span class="free">{{ chamber6.freeSlots }}</span>
        </el-descriptions-item>

        <el-descriptions-item :label="text('reliabilityCapacity.chamber6.utilization', '使用率')">
          {{ chamber6.utilization }}%
        </el-descriptions-item>
        <el-descriptions-item :label="text('reliabilityCapacity.chamber6.currentTemp', '目前溫度')">
          <el-tag :type="tempStatus(chamber6)" size="small">
            {{ formatTemp(chamber6.temp) }} °C
          </el-tag>
        </el-descriptions-item>
      </el-descriptions>
    </el-card>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import axios from 'axios'
import { ElMessage } from 'element-plus'
import { Refresh } from '@element-plus/icons-vue'
import getApiBase from '@/utils/apiBase'

const { t, te } = useI18n()
const router = useRouter()
const apiBase = getApiBase()

function text (key, fallback, params) {
  if (te(key)) return t(key, params)
  if (!params) return fallback
  return String(fallback).replace(/\{(\w+)\}/g, (_, k) => String(params?.[k] ?? ''))
}

const loading = ref(false)
const tableSize = ref('small')

const lastUpdated = ref('')
const summary = ref({
  totalMachines: 0,
  totalSlots: 0,
  usedSlots: 0,
  freeSlots: 0,
  utilization: 0
})
const machines = ref([])

const TEMP_FULL_THRESHOLD = 20

const summaryUsedPercent = computed(() => summary.value.utilization ?? 0)

const pieStyle = computed(() => {
  const used = Math.max(0, Math.min(100, Number(summaryUsedPercent.value) || 0))
  return {
    background: `conic-gradient(var(--el-color-primary) 0 ${used}%, rgba(220, 223, 230, 0.9) ${used}% 100%)`
  }
})

const chamber1to5 = computed(() =>
  machines.value.filter((m) => m.chamberNo != null && m.chamberNo >= 1 && m.chamberNo <= 5)
)

const chamber6 = computed(() => machines.value.find((m) => m.chamberNo === 6) || null)

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

function formatTime (d) {
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

function utilizationStatus (percent) {
  if (percent >= 90) return 'exception'
  if (percent >= 70) return 'warning'
  return 'success'
}

function formatTemp (v) {
  if (v == null || Number.isNaN(Number(v))) return '--'
  return Number(v).toFixed(1)
}

function tempStatus (row) {
  const v = row?.temp
  if (v == null || Number.isNaN(Number(v))) return 'info'
  const tt = Number(v)
  if (tt < 20 || tt > 85) return 'danger'
  return 'success'
}

function getToken () {
  return localStorage.getItem('token') || sessionStorage.getItem('token') || ''
}

function handleAuth401 (status) {
  if (status === 401) {
    localStorage.removeItem('token')
    sessionStorage.removeItem('token')
    localStorage.removeItem('user')
    sessionStorage.removeItem('user')
    ElMessage.warning(text('auth.sessionExpired', '登入已過期'))
    router.push('/login')
    return true
  }
  return false
}

function asNum (v) {
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

function clamp (n, min, max) {
  return Math.max(min, Math.min(max, n))
}

function extractChamberNoFromName (s) {
  if (!s) return null
  const str = String(s)
  const m = str.match(/chamber\s*(\d+)/i) || str.match(/(\d+)/)
  if (!m) return null
  const n = Number(m[1])
  return Number.isFinite(n) ? n : null
}

function hasSchedule (m) {
  if (!m) return false
  if (typeof m.hasSchedule === 'boolean') return m.hasSchedule
  if (typeof m.hasActiveSchedule === 'boolean') return m.hasActiveSchedule
  if (typeof m.scheduled === 'boolean') return m.scheduled

  const cnt = Number(
    m.scheduleCount ??
    m.activeScheduleCount ??
    m.activeSchedules ??
    m.jobCount ??
    m.bookingCount
  )
  if (Number.isFinite(cnt) && cnt > 0) return true

  if (Array.isArray(m.schedules) && m.schedules.length > 0) return true
  if (Array.isArray(m.machineSchedules) && m.machineSchedules.length > 0) return true

  const used = Number(m.usedSlots ?? m.used ?? 0)
  return Number.isFinite(used) && used > 0
}

function applyTempRule (m) {
  const maxSlots = Number(m.maxSlots ?? 0) || 0
  let usedSlots = Number(m.usedSlots ?? 0) || 0

  const tt = asNum(m.temp)
  const scheduled = hasSchedule(m)

  if (maxSlots > 0 && scheduled && tt != null && tt < TEMP_FULL_THRESHOLD) {
    usedSlots = maxSlots
  } else {
    usedSlots = clamp(usedSlots, 0, maxSlots)
  }

  const freeSlots = Math.max(0, maxSlots - usedSlots)
  const utilization = maxSlots > 0 ? Math.round((usedSlots / maxSlots) * 100) : 0

  return { ...m, maxSlots, usedSlots, freeSlots, utilization }
}

async function fetchTempsByChamberNo (authHeader) {
  try {
    const res = await axios.get(`${apiBase}/machines?withTests=0`, { headers: authHeader || {} })
    const list = Array.isArray(res.data) ? res.data : (res.data?.data || [])
    const map = new Map()

    for (const it of list) {
      const chamberName = it?.chamberName || it?.name
      const no = extractChamberNoFromName(chamberName)
      if (!no) continue

      const temp = asNum(
        it?.currentTemp ??
        it?.currentTemperature ??
        it?.temperature ??
        it?.temp ??
        it?.current_temp
      )
      if (temp == null) continue

      map.set(no, temp)
    }
    return map
  } catch (e) {
    const st = e?.response?.status
    if (handleAuth401(st)) return new Map()
    console.warn('[reliability-capacity] fetch machine temps failed:', e?.message || e)
    return new Map()
  }
}

function rebuildSummaryFromMachines (list) {
  const included = list.filter((m) => {
    const no = Number(m.chamberNo)
    if (!Number.isFinite(no) || no < 1 || no > 5) return false
    return !!m.includeInSummary
  })

  const totalMachines = included.length
  const totalSlots = included.reduce((s, m) => s + (Number(m.maxSlots) || 0), 0)
  const usedSlots = included.reduce((s, m) => s + (Number(m.usedSlots) || 0), 0)
  const freeSlots = Math.max(0, totalSlots - usedSlots)
  const utilization = totalSlots > 0 ? Math.round((usedSlots / totalSlots) * 100) : 0

  summary.value = { totalMachines, totalSlots, usedSlots, freeSlots, utilization }
}

async function fetchData () {
  loading.value = true
  try {
    const token = getToken()
    const authHeader = token ? { Authorization: `Bearer ${token}` } : {}

    const { data } = await axios.get(`${apiBase}/reliability-capacity`, { headers: authHeader })

    if (!data?.success) {
      throw new Error(data?.message || text('reliabilityCapacity.apiFailed', 'API 讀取失敗'))
    }

    let list = Array.isArray(data?.data?.machines) ? data.data.machines : []
    const tempMap = await fetchTempsByChamberNo(authHeader)

    list = list.map((m) => {
      const chamberNo = Number(m.chamberNo)
      const tempFromMap = Number.isFinite(chamberNo) ? tempMap.get(chamberNo) : null
      const tempFromRow = asNum(m.temp)
      const temp = (tempFromMap ?? tempFromRow ?? null)

      const defaultInclude = Number.isFinite(chamberNo) && chamberNo >= 1 && chamberNo <= 5
      const includeInSummary = (typeof m.includeInSummary === 'boolean') ? m.includeInSummary : defaultInclude

      const maxSlots = Number(m.maxSlots ?? 2) || 2
      const usedSlots = Number(m.usedSlots ?? 0) || 0

      return {
        ...m,
        chamberNo: Number.isFinite(chamberNo) ? chamberNo : null,
        includeInSummary,
        maxSlots,
        usedSlots,
        freeSlots: Math.max(0, maxSlots - usedSlots),
        utilization: maxSlots > 0 ? Math.round((usedSlots / maxSlots) * 100) : 0,
        temp
      }
    })

    list = list.map(applyTempRule)

    machines.value = list
    rebuildSummaryFromMachines(list)
    lastUpdated.value = formatTime(new Date())
  } catch (e) {
    const st = e?.response?.status
    if (handleAuth401(st)) return
    ElMessage.error(e?.message || text('reliabilityCapacity.fetchFailed', '載入失敗'))
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  cleanupMql = setupMql()
  fetchData()
})

onBeforeUnmount(() => {
  if (cleanupMql) cleanupMql()
})
</script>

<style scoped>
.reliability-capacity-page-vivid {
  display: flex;
  flex-direction: column;
  gap: 16px;
  color: var(--el-text-color-primary);
}

.pill { border-radius: 999px; }
.btn { border-radius: 12px; }

.hero-card,
.overview-card,
.machine-table-card {
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
  line-height: 1.6;
}

.hero-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
  flex-wrap: wrap;
}

.updated-chip {
  display: inline-flex;
  flex-direction: column;
  gap: 2px;
  padding: 8px 12px;
  border-radius: 14px;
  border: 1px solid var(--el-border-color-lighter);
  background: color-mix(in srgb, var(--el-fill-color-light) 88%, white 12%);
  font-size: 12px;
}
.updated-label {
  color: var(--el-text-color-secondary);
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
  font-size: 12px;
  color: var(--el-text-color-secondary);
  margin-bottom: 6px;
}
.stat-value {
  font-size: 28px;
  font-weight: 800;
  line-height: 1;
}
.stat-value.used { color: #f56c6c; }
.stat-value.free { color: #67c23a; }

.top-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.3fr) minmax(320px, 0.9fr);
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

.overview-content {
  display: flex;
  align-items: center;
  gap: 28px;
  flex-wrap: wrap;
}

.pie-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.pie {
  width: 180px;
  height: 180px;
  border-radius: 50%;
  position: relative;
}

.pie-inner {
  position: absolute;
  inset: 22px;
  border-radius: 50%;
  background: var(--el-bg-color);
  display: flex;
  align-items: center;
  justify-content: center;
}

.pie-label {
  text-align: center;
}

.pie-percent {
  font-size: 26px;
  font-weight: 700;
}

.pie-caption {
  font-size: 13px;
  color: var(--el-text-color-secondary);
}

.pie-legend {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 13px;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 6px;
}

.legend-color {
  width: 14px;
  height: 14px;
  border-radius: 4px;
  display: inline-block;
}

.legend-color.used {
  background: var(--el-color-primary);
}

.legend-color.free {
  background: rgba(220, 223, 230, 0.9);
}

.overview-details {
  flex: 1;
  min-width: 260px;
  max-width: 420px;
}
.detail-chip {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 10px 12px;
  margin-bottom: 8px;
  border-radius: 14px;
  border: 1px solid var(--el-border-color-lighter);
  background: color-mix(in srgb, var(--el-fill-color-light) 88%, white 12%);
}
.hint {
  margin: 8px 0 0;
  font-size: 12px;
  color: var(--el-text-color-secondary);
  line-height: 1.6;
}

.quick-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}
.quick-card {
  padding: 14px 16px;
  border-radius: 16px;
  border: 1px solid var(--el-border-color-lighter);
  background: color-mix(in srgb, var(--el-fill-color-light) 88%, white 12%);
}
.quick-label {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  margin-bottom: 6px;
}
.quick-value {
  font-size: 22px;
  font-weight: 800;
}

.reliability-table :deep(.el-table__header-wrapper th) {
  background: var(--el-fill-color-light);
}

.utilization-cell {
  display: flex;
  align-items: center;
  gap: 8px;
}

.utilization-text {
  font-size: 13px;
  color: var(--el-text-color-secondary);
  min-width: 56px;
}

.mobile-list {
  display: grid;
  gap: 12px;
}
.machine-card {
  border: 1px solid var(--el-border-color-lighter);
  background: var(--el-bg-color);
  border-radius: 18px;
  padding: 14px;
}
.machine-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
}
.machine-title {
  font-size: 16px;
  font-weight: 800;
}
.machine-sub {
  margin-top: 4px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}
.meta-grid {
  margin-top: 12px;
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
.progress-panel {
  margin-top: 12px;
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

.used {
  color: #f56c6c;
}
.free {
  color: #67c23a;
}

.special-card :deep(.el-descriptions__label) {
  font-weight: 700;
}

@media (max-width: 1100px) {
  .stats-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .top-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
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
  .quick-grid,
  .meta-grid {
    grid-template-columns: 1fr;
  }

  .hero-actions :deep(.el-button) {
    flex: 1 1 100%;
  }
}
</style>
