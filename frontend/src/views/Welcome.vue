<!-- frontend/src/views/Welcome.vue -->
<template>
  <div class="page welcome-compact">
    <!-- Top Header -->
    <div class="header-bar">
      <div class="left">
        <div class="title-mark"></div>
        <div class="title-block">
          <h2>{{ t('dashboard.headerTitle') }}</h2>
          <div class="header-subtitle">
            {{ text('dashboard.heroSubtitle', '測試資源、工作分配與系統狀態一頁掌握') }}
          </div>
        </div>
        <el-tag type="success" effect="dark">
          {{ t('dashboard.headerTag') }}
        </el-tag>
      </div>

      <div class="right header-actions">
        <el-dropdown>
          <el-button :icon="Finished" plain>
            {{ tableSizeLabel }}
          </el-button>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item
                :disabled="tableSize === 'small'"
                @click="tableSize = 'small'"
              >
                {{ t('dashboard.sizeCompact') }}
              </el-dropdown-item>
              <el-dropdown-item
                :disabled="tableSize === 'default'"
                @click="tableSize = 'default'"
              >
                {{ t('dashboard.sizeDefault') }}
              </el-dropdown-item>
              <el-dropdown-item
                :disabled="tableSize === 'large'"
                @click="tableSize = 'large'"
              >
                {{ t('dashboard.sizeComfortable') }}
              </el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>

        <el-switch
          v-model="autoRefresh.on"
          inline-prompt
          :active-text="t('dashboard.autoRefreshOn')"
          :inactive-text="t('dashboard.autoRefreshOff')"
          @change="applyAutoRefresh"
        />

        <el-button
          :icon="Refresh"
          @click="init"
          :loading="loading"
          :title="t('dashboard.refreshTitle')"
        >
          {{ t('dashboard.btnRefresh') }}
        </el-button>
      </div>
    </div>

    <!-- Compact Overview -->
    <el-card shadow="never" class="overview-card">
      <div class="overview-top">
        <div class="overview-main">
          <div class="overview-badge">
            {{ text('dashboard.heroBadge', 'DASHBOARD') }}
          </div>

          <div class="overview-title-row">
            <h1 class="overview-title">
              {{ text('dashboard.heroTitle', '測試中心總覽') }}
            </h1>
            <span class="overview-time">
              {{ text('dashboard.lastUpdated', '最後更新') }}：{{ lastUpdatedText }}
            </span>
          </div>

          <p class="overview-desc">
            {{ text('dashboard.heroDesc', '快速查看產品、機台、工單與測試負載，讓首頁更像真正的作戰面板。') }}
          </p>

          <div class="overview-meta">
            <span class="meta-chip">
              {{ autoRefresh.on
                ? text('dashboard.autoRefreshOn', '自動刷新')
                : text('dashboard.autoRefreshOff', '手動刷新') }}
            </span>
            <span class="meta-chip">
              {{ text('dashboard.reliabilitySummaryShort', '常溫台使用率') }}：{{ reliabilityUsagePercent }}%
            </span>
            <span class="meta-chip">
              {{ text('dashboard.dqaSummaryShort', 'DQA 負載') }}：{{ dqaCapacityPercent }}%
            </span>
          </div>
        </div>

        <div class="overview-actions">
          <button
            v-for="item in quickActions"
            :key="item.key"
            class="action-chip"
            type="button"
            @click="router.push(item.path)"
          >
            <span class="action-emoji">{{ item.emoji }}</span>
            <span class="action-title">{{ item.title }}</span>
          </button>
        </div>
      </div>

      <div class="focus-grid">
        <div class="focus-card">
          <div class="focus-label">
            {{ text('dashboard.reliabilitySummaryShort', '常溫台使用率') }}
          </div>
          <div class="focus-value">{{ reliabilityUsagePercent }}%</div>
          <div class="focus-sub">{{ reliabilityUsed }} / {{ reliabilityTotal }}</div>
        </div>

        <div class="focus-card">
          <div class="focus-label">
            {{ text('dashboard.dqaSummaryShort', 'DQA 負載') }}
          </div>
          <div class="focus-value" :class="{ danger: dqaIsOverCapacity }">
            {{ dqaCapacityPercent }}%
          </div>
          <div class="focus-sub">{{ dqaTotalWork }} / {{ dqaTotalCapacity }}</div>
        </div>

        <div class="focus-card">
          <div class="focus-label">
            {{ text('dashboard.freeSlotsShort', '剩餘可用容量') }}
          </div>
          <div class="focus-value">{{ reliabilityRemain }}</div>
          <div class="focus-sub">
            {{ text('dashboard.chamberRangeShort', 'Chamber 1~5') }}
          </div>
        </div>
      </div>
    </el-card>

    <!-- KPI -->
    <section class="metric-grid">
      <el-card
        v-for="item in topMetrics"
        :key="item.key"
        shadow="never"
        class="metric-card"
      >
        <div class="metric-inner">
          <div class="metric-icon">{{ item.emoji }}</div>
          <div class="metric-text">
            <div class="metric-label">{{ item.label }}</div>
            <div class="metric-value">{{ item.value }}</div>
            <div class="metric-note">{{ item.note }}</div>
          </div>
        </div>
      </el-card>
    </section>

    <!-- Summary -->
    <el-card shadow="never" class="summary-card" v-loading="loading">
      <template #header>
        <div class="card-hd">
          <div>
            <strong>{{ t('dashboard.adminSummaryTitle') }}</strong>
            <div class="muted small">
              {{ t('dashboard.adminSummaryHint') }}
            </div>
          </div>

          <div class="summary-chips">
            <span class="summary-chip">
              {{ text('dashboard.chamberRangeShort', 'Chamber 1~5') }}
            </span>
            <span class="summary-chip">
              {{ text('dashboard.loadFocusShort', '容量與負載總覽') }}
            </span>
          </div>
        </div>
      </template>

      <div class="stat-grid">
        <!-- ① 各常溫台容量明細 -->
        <div class="block block-table">
          <div class="block-title-row">
            <div class="block-title">
              {{ t('dashboard.blocks.chamber15TableTitle') }}
            </div>
            <div class="block-subtitle">
              {{ text('dashboard.blocks.chamber15Hint', '可左右滑動查看完整欄位') }}
            </div>
          </div>

          <div class="table-scroll">
            <el-table
              :data="chamber15Rows"
              border
              stripe
              :size="tableSize"
              height="280"
              :empty-text="t('common.noData')"
            >
              <el-table-column
                type="index"
                :label="t('dashboard.blocks.table.colIndex')"
                width="50"
              />
              <el-table-column
                :label="t('dashboard.blocks.table.colChamber')"
                width="86"
              >
                <template #default="{ row }">
                  {{ t('dashboard.blocks.table.chamberPrefix') }}
                  {{ row.chamberNo ?? '-' }}
                </template>
              </el-table-column>

              <el-table-column
                prop="name"
                :label="t('dashboard.blocks.table.colMachineName')"
                min-width="150"
                show-overflow-tooltip
              />
              <el-table-column
                prop="model"
                :label="t('dashboard.blocks.table.colMachineModel')"
                min-width="130"
                show-overflow-tooltip
              />
              <el-table-column
                :label="t('dashboard.blocks.table.colTemp')"
                width="105"
              >
                <template #default="{ row }">
                  {{ row.temp == null ? '-' : Number(row.temp).toFixed(1) }}
                </template>
              </el-table-column>
              <el-table-column
                prop="maxSlots"
                :label="t('dashboard.blocks.table.colMaxSlots')"
                width="96"
              />
              <el-table-column
                prop="usedSlots"
                :label="t('dashboard.blocks.table.colUsedSlots')"
                width="96"
              />
              <el-table-column
                prop="freeSlots"
                :label="t('dashboard.blocks.table.colFreeSlots')"
                width="96"
              />
              <el-table-column
                :label="t('dashboard.blocks.table.colUtil')"
                width="86"
              >
                <template #default="{ row }">
                  <span class="util-badge" :class="utilClass(row.utilization)">
                    {{ row.utilization != null ? row.utilization + '%' : '-' }}
                  </span>
                </template>
              </el-table-column>
            </el-table>
          </div>
        </div>

        <!-- ② 總容量使用率 -->
        <div class="block block-reliability">
          <div class="block-title-row">
            <div class="block-title">
              {{ t('dashboard.blocks.reliabilityTitle') }}
            </div>
            <div class="block-subtitle">
              {{ text('dashboard.blocks.reliabilityHint', '低溫且有排程時會視為滿載') }}
            </div>
          </div>

          <div class="rel-body">
            <el-progress
              type="dashboard"
              :percentage="reliabilityUsagePercent"
              :stroke-width="14"
              :status="reliabilityUsagePercent >= 90 ? 'exception' : ''"
            />

            <div class="rel-text">
              <div class="big-kpi">{{ reliabilityUsagePercent }}%</div>
              <div>
                {{ t('dashboard.blocks.reliabilityTotal', { total: reliabilityTotal }) }}
              </div>
              <div>
                {{
                  t('dashboard.blocks.reliabilityUsedRemain', {
                    used: reliabilityUsed,
                    remain: reliabilityRemain
                  })
                }}
              </div>
              <div class="muted" style="margin-top: 4px">
                {{
                  t('dashboard.blocks.reliabilityNote', {
                    temp: TEMP_FULL_THRESHOLD
                  })
                }}
              </div>
            </div>
          </div>
        </div>

        <!-- ③ 所有使用者工作量 -->
        <div class="block block-user">
          <div class="block-title-row">
            <div class="block-title">
              {{ t('dashboard.blocks.userWorkTitle') }}
            </div>
            <div class="block-subtitle">
              {{ text('dashboard.blocks.userWorkHint', '可快速看出工作分配是否集中') }}
            </div>
          </div>
          <div ref="userWorkRef" class="user-work-chart"></div>
        </div>

        <!-- ④ DQA 測試容量 -->
        <div class="block block-dqa">
          <div class="block-title-row">
            <div class="block-title">
              {{ t('dashboard.blocks.dqaTitle') }}
            </div>
            <div class="block-subtitle">
              {{ text('dashboard.blocks.dqaHint', '當工作量超過容量時會標示紅色') }}
            </div>
          </div>

          <div class="dqa-block">
            <div class="dqa-chart" ref="dqaPieRef"></div>

            <div class="dqa-text">
              <div
                class="dqa-capacity-main"
                :class="{ 'is-over': dqaIsOverCapacity }"
              >
                {{ t('dashboard.blocks.dqaCapacity', { percent: dqaCapacityPercent }) }}
              </div>
              <div class="dqa-capacity-sub">
                {{
                  t('dashboard.blocks.dqaRatio', {
                    work: dqaTotalWork,
                    cap: dqaTotalCapacity
                  })
                }}
              </div>
              <div class="dqa-alert" :class="{ 'is-over': dqaIsOverCapacity }">
                {{
                  dqaIsOverCapacity
                    ? text('dashboard.capacityWarning', '目前已超出容量')
                    : text('dashboard.capacityNormal', '目前仍在安全範圍')
                }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </el-card>
  </div>
</template>

<script setup>
import {
  ref,
  reactive,
  computed,
  onMounted,
  onBeforeUnmount,
  watch,
  watchEffect
} from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Refresh, Finished } from '@element-plus/icons-vue'
import { useI18n } from 'vue-i18n'
import * as echarts from 'echarts'
import { getApiBase } from '@/utils/apiBase'

const { t, locale } = useI18n()
const router = useRouter()

function text(path, fallback) {
  const v = t(path)
  return v && v !== path ? v : fallback
}

const apiBase = getApiBase()

function safeParseJSON(raw, fallback = null) {
  try {
    return JSON.parse(raw)
  } catch {
    return fallback
  }
}

function getUser() {
  return safeParseJSON(
    localStorage.getItem('user') ||
      sessionStorage.getItem('user') ||
      'null',
    null
  )
}

function getToken() {
  return localStorage.getItem('token') || sessionStorage.getItem('token') || ''
}

function authHeaders() {
  const token = getToken()
  return token ? { Authorization: `Bearer ${token}` } : {}
}

const currentUser = computed(() => getUser() || {})
const isAdmin = computed(() => {
  const role = String(
    currentUser.value?.role ||
      currentUser.value?.userRole ||
      currentUser.value?.type ||
      ''
  ).toLowerCase()

  return (
    currentUser.value?.isAdmin === true ||
    ['admin', 'administrator', 'superadmin', 'super_admin'].includes(role)
  )
})

let kickedBy401 = false
function handle401() {
  if (kickedBy401) return
  kickedBy401 = true

  localStorage.removeItem('token')
  localStorage.removeItem('user')
  sessionStorage.removeItem('token')
  sessionStorage.removeItem('user')

  ElMessage.warning(t('auth.sessionExpired'))
  location.href = '/login'
}

function apiUrl(path) {
  const p = String(path || '')
  return apiBase + (p.startsWith('/') ? p : `/${p}`)
}

function qs(params = {}) {
  const sp = new URLSearchParams()
  Object.entries(params).forEach(([k, v]) => {
    if (v === undefined || v === null || v === '') return
    sp.set(k, String(v))
  })
  const s = sp.toString()
  return s ? `?${s}` : ''
}

async function fetchJson(path, options = {}) {
  const url = path.startsWith('http') ? path : apiUrl(path)
  const res = await fetch(url, {
    ...options,
    headers: { ...authHeaders(), ...(options.headers || {}) }
  })

  if (res.status === 401) {
    handle401()
    return { ok: false, status: 401, data: null, raw: null }
  }

  let raw = {}
  try {
    raw = await res.json()
  } catch {
    raw = {}
  }

  const data = raw?.data ?? raw
  return { ok: res.ok, status: res.status, data, raw }
}

/* ===================== UI State ===================== */
const loading = ref(false)
const lastUpdatedAt = ref(null)

const tableSize = ref(localStorage.getItem('dash-table-size') || 'small')
const tableSizeLabel = computed(() =>
  tableSize.value === 'small'
    ? t('dashboard.sizeCompact')
    : tableSize.value === 'large'
      ? t('dashboard.sizeComfortable')
      : t('dashboard.sizeDefault')
)
watchEffect(() => localStorage.setItem('dash-table-size', tableSize.value))

const lastUpdatedText = computed(() => {
  if (!lastUpdatedAt.value) return text('common.loading', '載入中…')
  try {
    return new Intl.DateTimeFormat(
      locale.value?.startsWith('en') ? 'en-US' : 'zh-TW',
      {
        hour: '2-digit',
        minute: '2-digit'
      }
    ).format(lastUpdatedAt.value)
  } catch {
    return ''
  }
})

/* ===================== Top Counts ===================== */
const counts = reactive({
  products: null,
  machines: null,
  suggestions: null,
  requests: null,
  supports: null
})

const countText = (v) => (v == null ? '—' : String(v))

/* ===================== Hero / KPI ===================== */
const quickActions = computed(() => {
  const items = [
    {
      key: 'products',
      title: text('dashboard.btnProducts', '產品管理'),
      desc: text('dashboard.quickDescProducts', '產品與測試資料管理'),
      path: '/products',
      emoji: '📦',
      adminOnly: false
    },
    {
      key: 'machines',
      title: text('dashboard.btnMachines', '機台管理'),
      desc: text('dashboard.quickDescMachines', '查看機台狀態與容量'),
      path: '/machines',
      emoji: '🖥️',
      adminOnly: false
    },
    {
      key: 'feedback',
      title: text('dashboard.btnFeedback', '意見回饋'),
      desc: text('dashboard.quickDescFeedback', '收集與追蹤回饋'),
      path: '/suggestion',
      emoji: '💬',
      adminOnly: false
    },
    {
      key: 'default-sets',
      title: text('dashboard.btnDefaultSets', '預設測試集'),
      desc: text('dashboard.quickDescDefaultSets', '管理共用測試集'),
      path: '/default-test-sets',
      emoji: '🧩',
      adminOnly: true
    },
    {
      key: 'logs',
      title: text('dashboard.btnLogs', '系統紀錄'),
      desc: text('dashboard.quickDescLogs', '檢視操作與變更歷程'),
      path: '/logs',
      emoji: '📜',
      adminOnly: true
    },
    {
      key: 'users',
      title: text('dashboard.btnUsers', '使用者管理'),
      desc: text('dashboard.quickDescUsers', '管理帳號與權限'),
      path: '/users',
      emoji: '👥',
      adminOnly: true
    }
  ]

  return items.filter(item => !item.adminOnly || isAdmin.value)
})

const topMetrics = computed(() => [
  {
    key: 'products',
    emoji: '📦',
    label: t('dashboard.statProducts'),
    value: countText(counts.products),
    note: text('dashboard.metricNoteProducts', '目前產品筆數')
  },
  {
    key: 'requests',
    emoji: '📝',
    label: t('dashboard.statRequests'),
    value: countText(counts.requests),
    note: text('dashboard.metricNoteRequests', '待處理與進行中的需求')
  },
  {
    key: 'supports',
    emoji: '🛠️',
    label: t('dashboard.statSupport'),
    value: countText(counts.supports),
    note: text('dashboard.metricNoteSupport', '支援資源追蹤')
  },
  {
    key: 'machines',
    emoji: '🖥️',
    label: t('dashboard.statMachines'),
    value: countText(counts.machines),
    note: text('dashboard.metricNoteMachines', '機台資源總數')
  },
  {
    key: 'suggestions',
    emoji: '💡',
    label: t('dashboard.statSuggestions'),
    value: countText(counts.suggestions),
    note: text('dashboard.metricNoteSuggestions', '建議與回饋累計')
  }
])

function utilClass(util) {
  const n = Number(util)
  if (!Number.isFinite(n)) return ''
  if (n >= 90) return 'is-high'
  if (n >= 60) return 'is-medium'
  return 'is-low'
}

/* ===================== Reliability Capacity ===================== */
const reliabilitySummary = reactive({
  totalCapacity: 0,
  used: 0,
  machines: []
})

const reliabilityTotal = computed(() => reliabilitySummary.totalCapacity || 0)
const reliabilityUsed = computed(() => reliabilitySummary.used || 0)
const reliabilityRemain = computed(() => {
  const remain = reliabilityTotal.value - reliabilityUsed.value
  return remain > 0 ? remain : 0
})
const reliabilityUsagePercent = computed(() => {
  if (!reliabilityTotal.value) return 0
  const p = Math.round((reliabilityUsed.value * 100) / reliabilityTotal.value)
  return p < 0 ? 0 : p
})

const reliabilityMachines = computed(() => reliabilitySummary.machines || [])

const chamber15Rows = computed(() =>
  reliabilityMachines.value
    .filter(m => {
      const no = Number(m.chamberNo)
      return !!m.includeInSummary && Number.isFinite(no) && no >= 1 && no <= 5
    })
    .sort((a, b) => (a.chamberNo || 999) - (b.chamberNo || 999))
)

const TEMP_FULL_THRESHOLD = 20

function asNum(v) {
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}
function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n))
}
function parseChamberNo(obj) {
  const direct = Number(obj?.chamberNo)
  if (Number.isFinite(direct)) return direct

  const direct2 = Number(obj?.chamber)
  if (Number.isFinite(direct2)) return direct2

  const s = String(obj?.chamberName || obj?.name || '')
  const m = s.match(/chamber\s*(\d+)/i)
  if (m) return Number(m[1])

  const m2 = s.match(/(\d+)/)
  return m2 ? Number(m2[1]) : null
}

function hasSchedule(m) {
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

function applyTempRule(m) {
  const maxSlots = Number(m.maxSlots ?? 2) || 0
  let usedSlots = Number(m.usedSlots ?? 0) || 0

  const t0 = asNum(m.temp)
  const scheduled = hasSchedule(m)

  if (maxSlots > 0 && scheduled && t0 != null && t0 < TEMP_FULL_THRESHOLD) {
    usedSlots = maxSlots
  } else {
    usedSlots = clamp(usedSlots, 0, maxSlots)
  }

  const freeSlots = Math.max(0, maxSlots - usedSlots)
  const utilization = maxSlots > 0 ? Math.round((usedSlots * 100) / maxSlots) : 0

  return { ...m, maxSlots, usedSlots, freeSlots, utilization }
}

async function getReliabilitySummary() {
  try {
    let r = await fetchJson('/reliability-capacity')
    if (!r.ok && r.status !== 401) {
      r = await fetchJson('/stats/reliability-capacity')
    }
    if (!r.ok) return null

    const data = r.data || {}
    let machines = Array.isArray(data.machines) ? data.machines : []

    const tempMap = new Map()
    try {
      const mr = await fetchJson('/machines' + qs({ withTests: 0 }))
      if (mr.ok) {
        const list = Array.isArray(mr.data)
          ? mr.data
          : (mr.data?.data || mr.data?.rows || mr.data || [])

        if (Array.isArray(list)) {
          for (const it of list) {
            const no = parseChamberNo(it)
            const temp = asNum(
              it?.currentTemp ??
                it?.currentTemperature ??
                it?.temperature ??
                it?.temp ??
                it?.current_temp
            )
            if (Number.isFinite(no) && temp != null) tempMap.set(no, temp)
          }
        }
      }
    } catch (e) {
      console.warn('fetch machines temp failed:', e?.message || e)
    }

    machines = machines.map((m) => {
      const chamberNo = parseChamberNo(m)
      const tempFromMachines =
        Number.isFinite(chamberNo) && tempMap.has(chamberNo)
          ? tempMap.get(chamberNo)
          : null
      const tempFromRel = asNum(m.temp)
      const temp = tempFromMachines ?? tempFromRel ?? null
      return applyTempRule({ ...m, chamberNo, temp })
    })

    const included = machines.filter((m) => {
      const no = Number(m.chamberNo)
      return !!m.includeInSummary && Number.isFinite(no) && no >= 1 && no <= 5
    })

    const totalCapacity = included.reduce((s, m) => s + (Number(m.maxSlots) || 0), 0)
    const used = included.reduce((s, m) => s + (Number(m.usedSlots) || 0), 0)

    return { totalCapacity, used, machines }
  } catch (err) {
    console.error('getReliabilitySummary failed:', err)
    return null
  }
}

/* ===================== DQA Summary ===================== */
const dqaSummary = reactive({
  totalWork: 0,
  totalCapacity: 0,
  percent: 0
})

const dqaTotalWork = computed(() => dqaSummary.totalWork || 0)
const dqaTotalCapacity = computed(() => dqaSummary.totalCapacity || 0)

const dqaCapacityPercent = computed(() => {
  if (Number.isFinite(dqaSummary.percent) && dqaSummary.percent >= 0) {
    return dqaSummary.percent
  }
  if (!dqaTotalCapacity.value) return 0
  const p = Math.round((dqaTotalWork.value * 100) / dqaTotalCapacity.value)
  return p < 0 ? 0 : p
})

const dqaIsOverCapacity = computed(() => dqaTotalWork.value > dqaTotalCapacity.value)

const dqaPieRef = ref(null)
let dqaPieInstance = null

async function getDqaCapacitySummary() {
  try {
    const r = await fetchJson('/stats/user-plan-summary')
    if (!r.ok) return null
    const d = r.data || {}

    const totalWork = Number(d.totalUsedWork ?? d.totalWork ?? 0)
    const totalCapacity = Number(d.totalCapacity ?? 0)
    const percent = Number.isFinite(Number(d.percent))
      ? Number(d.percent)
      : (totalCapacity ? Math.round((totalWork * 100) / totalCapacity) : 0)

    return { totalWork, totalCapacity, percent }
  } catch (err) {
    console.error('getDqaCapacitySummary failed:', err)
    return null
  }
}

/* ===================== Charts / Theme ===================== */
const userWorkRef = ref(null)
let userWorkInstance = null
const userWorkStats = ref([])

let themeObserver = null

function isDarkMode() {
  return document.documentElement.classList.contains('dark')
}

function getChartTheme() {
  if (isDarkMode()) {
    return {
      text: '#F8FAFC',
      subText: '#A8B3C7',
      grid: '#334155',
      used: '#7C9CFF',
      danger: '#F87171',
      remain: '#253246',
      noData: '#475569',
      bar: '#7C9CFF'
    }
  }

  return {
    text: '#303133',
    subText: '#909399',
    grid: '#E5EAF3',
    used: '#5B8CFF',
    danger: '#F56C6C',
    remain: '#E8EDF5',
    noData: '#DDE5F0',
    bar: '#6F8CFF'
  }
}

function renderDqaPie() {
  if (!dqaPieRef.value) return
  if (!dqaPieInstance) dqaPieInstance = echarts.init(dqaPieRef.value)

  const theme = getChartTheme()
  const capacity = dqaTotalCapacity.value || 0
  let data

  if (!capacity) {
    data = [
      {
        value: 1,
        name: t('dashboard.blocks.dqaChart.noData'),
        itemStyle: { color: theme.noData }
      }
    ]
  } else {
    const used = Math.min(dqaTotalWork.value, capacity)
    const remain = Math.max(capacity - used, 0)
    data = [
      {
        value: used,
        name: t('dashboard.blocks.dqaChart.used'),
        itemStyle: {
          color: dqaIsOverCapacity.value ? theme.danger : theme.used
        }
      },
      {
        value: remain,
        name: t('dashboard.blocks.dqaChart.remaining'),
        itemStyle: { color: theme.remain }
      }
    ]
  }

  dqaPieInstance.setOption({
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'item',
      formatter: ({ name, value, percent }) => `${name}<br/>${value}（${percent}%）`
    },
    legend: {
      bottom: 0,
      left: 'center',
      itemWidth: 10,
      itemHeight: 10,
      textStyle: {
        color: theme.subText
      }
    },
    series: [
      {
        type: 'pie',
        radius: ['62%', '86%'],
        center: ['50%', '40%'],
        avoidLabelOverlap: false,
        label: { show: false },
        labelLine: { show: false },
        data
      }
    ],
    graphic: capacity
      ? {
          type: 'text',
          left: 'center',
          top: '37%',
          style: {
            text: `${dqaCapacityPercent.value}%`,
            fontSize: 18,
            fontWeight: 700,
            fill: dqaIsOverCapacity.value ? theme.danger : theme.text
          }
        }
      : {
          type: 'text',
          left: 'center',
          top: '40%',
          style: {
            text: t('dashboard.blocks.dqaChart.na'),
            fontSize: 14,
            fontWeight: 500,
            fill: theme.subText
          }
        }
  })
}

async function getUserWorkStats() {
  try {
    const r = await fetchJson('/stats/user-plans')
    if (!r.ok) return []

    const rows = r.data?.rows || r.data?.data?.rows || r.data?.list || r.data || []
    if (!Array.isArray(rows)) return []

    return rows.map((it, idx) => ({
      name:
        it.userName ||
        it.username ||
        it.name ||
        it.displayName ||
        `U${it.userId ?? idx + 1}`,
      work: Number(it.totalWork ?? it.total ?? it.count ?? it.work ?? 0)
    }))
  } catch (err) {
    console.error('getUserWorkStats failed:', err)
    return []
  }
}

function renderUserWorkBar() {
  if (!userWorkRef.value) return

  const data = userWorkStats.value || []
  if (!data.length) {
    if (userWorkInstance) userWorkInstance.clear()
    return
  }

  if (!userWorkInstance) userWorkInstance = echarts.init(userWorkRef.value)

  const theme = getChartTheme()

  userWorkInstance.setOption({
    backgroundColor: 'transparent',
    tooltip: { trigger: 'axis' },
    grid: { left: 40, right: 14, top: 24, bottom: 44 },
    xAxis: {
      type: 'category',
      data: data.map(d => d.name),
      axisLabel: {
        interval: 0,
        rotate: 22,
        color: theme.subText
      },
      axisTick: { show: false },
      axisLine: {
        lineStyle: { color: theme.grid }
      }
    },
    yAxis: {
      type: 'value',
      minInterval: 1,
      axisLabel: {
        color: theme.subText
      },
      splitLine: {
        lineStyle: { color: theme.grid }
      }
    },
    series: [
      {
        type: 'bar',
        data: data.map(d => d.work),
        barWidth: '42%',
        itemStyle: {
          borderRadius: [8, 8, 0, 0],
          color: theme.bar
        }
      }
    ]
  })
}

/* ===================== Totals ===================== */
async function getProductsTotal() {
  try {
    const r = await fetchJson('/products' + qs({ page: 1, pageSize: 1 }))
    if (!r.ok) return null
    const j = r.data || {}
    const n =
      j.total ??
      j.count ??
      (Array.isArray(j.rows) ? j.rows.length : Array.isArray(j) ? j.length : 0)
    return Number.isFinite(+n) ? +n : 0
  } catch {
    return null
  }
}

async function getMachinesTotal() {
  try {
    const r = await fetchJson('/machines')
    if (!r.ok) return null
    const j = r.data
    const n = Array.isArray(j) ? j.length : (j?.total ?? j?.count ?? 0)
    return Number.isFinite(+n) ? +n : 0
  } catch {
    return null
  }
}

async function getSuggestionsTotal() {
  try {
    let r = await fetchJson('/suggestions' + qs({ page: 1, pageSize: 1 }))
    if (!r.ok && r.status !== 401) {
      r = await fetchJson('/suggestions/mine' + qs({ page: 1, pageSize: 1 }))
    }
    if (!r.ok) return null

    const j = r.data || {}
    const n =
      j.total ??
      j.count ??
      j?.data?.count ??
      (Array.isArray(j.rows)
        ? j.rows.length
        : Array.isArray(j?.data?.rows)
          ? j.data.rows.length
          : 0)

    return Number.isFinite(+n) ? +n : 0
  } catch {
    return null
  }
}

async function getRequestsTotal() {
  try {
    const r = await fetchJson('/test-requests' + qs({ page: 1, pageSize: 1 }))
    if (!r.ok) return null
    const j = r.data || {}
    const n = j.total ?? j.count ?? (Array.isArray(j.rows) ? j.rows.length : 0)
    return Number.isFinite(+n) ? +n : 0
  } catch {
    return null
  }
}

async function getSupportTotal() {
  try {
    const r = await fetchJson('/test-support' + qs({ page: 1, pageSize: 1 }))
    if (!r.ok) return null
    const j = r.data || {}
    const n = j.total ?? j.count ?? (Array.isArray(j.rows) ? j.rows.length : 0)
    return Number.isFinite(+n) ? +n : 0
  } catch {
    return null
  }
}

/* ===================== Init ===================== */
async function init() {
  loading.value = true
  try {
    const jobs = [
      getProductsTotal(),
      getMachinesTotal(),
      getSuggestionsTotal(),
      getRequestsTotal(),
      getSupportTotal(),
      getReliabilitySummary(),
      getDqaCapacitySummary(),
      getUserWorkStats()
    ]

    const [p, m, s, req, sup, rel, dqa, users] =
      (await Promise.allSettled(jobs)).map(x => (x.status === 'fulfilled' ? x.value : null))

    counts.products = p
    counts.machines = m
    counts.suggestions = s
    counts.requests = req
    counts.supports = sup

    if (rel) {
      reliabilitySummary.totalCapacity = rel.totalCapacity ?? 0
      reliabilitySummary.used = rel.used ?? 0
      reliabilitySummary.machines = rel.machines || []
    } else {
      reliabilitySummary.totalCapacity = 0
      reliabilitySummary.used = 0
      reliabilitySummary.machines = []
    }

    if (dqa) {
      dqaSummary.totalWork = dqa.totalWork ?? 0
      dqaSummary.totalCapacity = dqa.totalCapacity ?? 0
      dqaSummary.percent = dqa.percent ?? 0
    } else {
      dqaSummary.totalWork = 0
      dqaSummary.totalCapacity = 0
      dqaSummary.percent = 0
    }

    userWorkStats.value = Array.isArray(users) ? users : []

    renderDqaPie()
    renderUserWorkBar()
    lastUpdatedAt.value = new Date()
  } catch (e) {
    console.error(e)
    ElMessage.error(t('dashboard.loadFailed'))
  } finally {
    loading.value = false
  }
}

/* ===================== Watch / Events ===================== */
watch(
  () => locale.value,
  () => {
    renderDqaPie()
    renderUserWorkBar()
  }
)

const autoRefresh = reactive({
  on: localStorage.getItem('dash-auto-refresh') === '1',
  timer: null,
  intervalMs: 30000,
  pausedByHidden: false
})

function applyAutoRefresh() {
  localStorage.setItem('dash-auto-refresh', autoRefresh.on ? '1' : '0')
  if (autoRefresh.timer) {
    clearInterval(autoRefresh.timer)
    autoRefresh.timer = null
  }
  if (autoRefresh.on) {
    autoRefresh.timer = setInterval(() => init(), autoRefresh.intervalMs)
  }
}

function onKey(e) {
  const el = e.target
  const tag = (el?.tagName || '').toLowerCase()
  const editable = el?.isContentEditable
  if (tag === 'input' || tag === 'textarea' || editable) return
  if ((e.key === 'r' || e.key === 'R') && !e.metaKey && !e.ctrlKey && !e.altKey) init()
}

function onVisibility() {
  if (document.hidden) {
    if (autoRefresh.timer) {
      clearInterval(autoRefresh.timer)
      autoRefresh.timer = null
      autoRefresh.pausedByHidden = true
    }
  } else {
    if (autoRefresh.on && autoRefresh.pausedByHidden) {
      applyAutoRefresh()
      autoRefresh.pausedByHidden = false
    }
  }
}

function onResize() {
  if (dqaPieInstance) dqaPieInstance.resize()
  if (userWorkInstance) userWorkInstance.resize()
}

onMounted(() => {
  init()
  applyAutoRefresh()
  window.addEventListener('keydown', onKey)
  document.addEventListener('visibilitychange', onVisibility)
  window.addEventListener('resize', onResize)

  themeObserver = new MutationObserver(() => {
    renderDqaPie()
    renderUserWorkBar()
  })

  themeObserver.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['class']
  })
})

onBeforeUnmount(() => {
  if (autoRefresh.timer) clearInterval(autoRefresh.timer)
  window.removeEventListener('keydown', onKey)
  document.removeEventListener('visibilitychange', onVisibility)
  window.removeEventListener('resize', onResize)

  if (themeObserver) {
    themeObserver.disconnect()
    themeObserver = null
  }

  if (dqaPieInstance) {
    dqaPieInstance.dispose()
    dqaPieInstance = null
  }
  if (userWorkInstance) {
    userWorkInstance.dispose()
    userWorkInstance = null
  }
})
</script>

<style scoped>
:global(:root) {
  --welcome-bg: linear-gradient(180deg, #f7f9fc 0%, #f3f6fb 100%);
  --welcome-card: rgba(255, 255, 255, 0.92);
  --welcome-border: rgba(148, 163, 184, 0.16);
  --welcome-shadow: 0 10px 24px rgba(15, 23, 42, 0.05);
}

:global(.dark) {
  --welcome-bg: linear-gradient(180deg, #0b1220 0%, #0f172a 56%, #111827 100%);
  --welcome-card: rgba(10, 17, 30, 0.92);
  --welcome-border: rgba(148, 163, 184, 0.12);
  --welcome-shadow: 0 14px 30px rgba(0, 0, 0, 0.26);
}

.page {
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  background: var(--welcome-bg);
  min-height: 100%;
}

.header-bar,
.overview-card,
.metric-card,
.summary-card,
.block {
  border: 1px solid var(--welcome-border);
  box-shadow: var(--welcome-shadow);
}

.header-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border-radius: 16px;
  background: var(--welcome-card);
  backdrop-filter: blur(10px);
  flex-wrap: wrap;
}

.header-bar .left {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 260px;
  flex-wrap: wrap;
}

.title-mark {
  width: 12px;
  height: 12px;
  border-radius: 999px;
  background: linear-gradient(135deg, #4f7cff, #60a5fa);
  box-shadow: 0 0 0 5px rgba(79, 124, 255, 0.12);
}

.title-block h2 {
  margin: 0;
  font-size: 18px;
  line-height: 1.2;
}

.header-subtitle {
  margin-top: 2px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.header-actions {
  display: flex;
  gap: 8px;
  align-items: center;
  justify-content: flex-end;
  flex-wrap: wrap;
  margin-left: auto;
}

/* compact overview */
.overview-card {
  border-radius: 18px;
  background: var(--welcome-card);
  overflow: hidden;
}

.overview-top {
  display: grid;
  grid-template-columns: 1.15fr 0.95fr;
  gap: 14px;
  padding: 14px 16px 10px;
}

.overview-main {
  min-width: 0;
}

.overview-badge {
  display: inline-flex;
  align-items: center;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  color: #4f7cff;
  background: rgba(79, 124, 255, 0.1);
}

.overview-title-row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 10px;
  margin-top: 10px;
  flex-wrap: wrap;
}

.overview-title {
  margin: 0;
  font-size: 24px;
  line-height: 1.15;
  font-weight: 800;
  letter-spacing: -0.02em;
}

.overview-time {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.overview-desc {
  margin: 8px 0 0;
  font-size: 13px;
  line-height: 1.7;
  color: var(--el-text-color-secondary);
}

.overview-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;
}

.meta-chip {
  display: inline-flex;
  align-items: center;
  padding: 6px 10px;
  border-radius: 999px;
  font-size: 12px;
  background: rgba(148, 163, 184, 0.08);
  color: var(--el-text-color-regular);
}

.overview-actions {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
  align-content: start;
}

.action-chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-height: 40px;
  border: 1px solid rgba(148, 163, 184, 0.14);
  border-radius: 12px;
  background: linear-gradient(180deg, rgba(255,255,255,0.98), rgba(245,248,253,0.98));
  cursor: pointer;
  transition: all 0.16s ease;
  font-size: 13px;
  color: var(--el-text-color-primary);
}

.action-chip:hover {
  border-color: rgba(79, 124, 255, 0.28);
  transform: translateY(-1px);
}

.action-emoji {
  font-size: 16px;
}

.action-title {
  font-weight: 600;
}

.focus-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
  padding: 0 16px 14px;
}

.focus-card {
  border: 1px solid rgba(148, 163, 184, 0.12);
  border-radius: 14px;
  padding: 12px 14px;
  background: rgba(148, 163, 184, 0.04);
}

.focus-label {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.focus-value {
  margin-top: 6px;
  font-size: 24px;
  line-height: 1.1;
  font-weight: 800;
  color: var(--el-text-color-primary);
}

.focus-value.danger {
  color: var(--el-color-danger);
}

.focus-sub {
  margin-top: 4px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

/* KPI */
.metric-grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 10px;
}

.metric-card {
  border-radius: 16px;
  background: var(--welcome-card);
}

.metric-inner {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
}

.metric-icon {
  width: 42px;
  height: 42px;
  border-radius: 12px;
  display: grid;
  place-items: center;
  font-size: 20px;
  background: linear-gradient(135deg, rgba(79, 124, 255, 0.14), rgba(96, 165, 250, 0.1));
}

.metric-label {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.metric-value {
  margin-top: 2px;
  font-size: 24px;
  line-height: 1.05;
  font-weight: 800;
}

.metric-note {
  margin-top: 3px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

/* Summary */
.summary-card {
  border-radius: 18px;
  background: var(--welcome-card);
}

.card-hd {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  flex-wrap: wrap;
}

.summary-chips {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.summary-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  font-size: 12px;
  border-radius: 999px;
  background: rgba(79, 124, 255, 0.08);
  color: var(--el-text-color-regular);
}

.muted {
  color: var(--el-text-color-secondary);
}

.small {
  font-size: 12px;
}

.stat-grid {
  display: grid;
  gap: 10px;
  grid-template-columns: 2fr 1.05fr;
  grid-template-areas:
    "table rel"
    "user dqa";
}

.block {
  border-radius: 16px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  background: rgba(127, 127, 127, 0.02);
  min-width: 0;
}

.block-title-row {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.block-title {
  font-weight: 700;
  font-size: 15px;
}

.block-subtitle {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.block-table { grid-area: table; }
.block-reliability { grid-area: rel; }
.block-user { grid-area: user; }
.block-dqa { grid-area: dqa; }

.table-scroll {
  width: 100%;
  overflow: auto;
  -webkit-overflow-scrolling: touch;
  border-radius: 12px;
}

.table-scroll :deep(.el-table) {
  min-width: 890px;
  border-radius: 12px;
  overflow: hidden;
  font-size: 12px;
}

.table-scroll :deep(.el-table th.el-table__cell) {
  background: rgba(79, 124, 255, 0.06);
}

.util-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 52px;
  padding: 3px 8px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
}

.util-badge.is-low {
  background: rgba(103, 194, 58, 0.12);
  color: #67c23a;
}
.util-badge.is-medium {
  background: rgba(230, 162, 60, 0.14);
  color: #e6a23c;
}
.util-badge.is-high {
  background: rgba(245, 108, 108, 0.14);
  color: #f56c6c;
}

.rel-body {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
  flex: 1;
}

.rel-text {
  font-size: 13px;
  color: var(--el-text-color-secondary);
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.big-kpi {
  font-size: 24px;
  font-weight: 800;
  line-height: 1.1;
  color: var(--el-text-color-primary);
}

.dqa-block {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
  flex: 1;
}

.dqa-chart {
  width: 160px;
  height: 145px;
  flex-shrink: 0;
}

.dqa-text {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}

.dqa-capacity-main {
  font-size: 22px;
  font-weight: 800;
  color: var(--el-text-color-primary);
}

.dqa-capacity-sub {
  font-size: 14px;
  color: var(--el-text-color-secondary);
}

.dqa-capacity-main.is-over {
  color: var(--el-color-danger);
}

.dqa-alert {
  display: inline-flex;
  width: fit-content;
  padding: 5px 10px;
  border-radius: 999px;
  font-size: 12px;
  background: rgba(103, 194, 58, 0.12);
  color: #67c23a;
}

.dqa-alert.is-over {
  background: rgba(245, 108, 108, 0.14);
  color: #f56c6c;
}

.user-work-chart {
  width: 100%;
  height: 220px;
}

/* Dark */
:global(.dark) .header-bar,
:global(.dark) .overview-card,
:global(.dark) .metric-card,
:global(.dark) .summary-card,
:global(.dark) .block {
  background: rgba(10, 17, 30, 0.92) !important;
}

:global(.dark) .overview-badge {
  background: rgba(79, 124, 255, 0.14) !important;
  color: #bfd4ff !important;
}

:global(.dark) .meta-chip,
:global(.dark) .summary-chip,
:global(.dark) .focus-card {
  background: rgba(148, 163, 184, 0.08) !important;
  color: #e5e7eb;
}

:global(.dark) .action-chip {
  background: linear-gradient(180deg, rgba(19, 29, 48, 0.98), rgba(14, 23, 39, 0.98));
  color: #f1f5f9;
  border-color: rgba(148, 163, 184, 0.14);
}

:global(.dark) .action-chip:hover {
  border-color: rgba(124, 156, 255, 0.32);
}

:global(.dark) .metric-note,
:global(.dark) .focus-label,
:global(.dark) .focus-sub,
:global(.dark) .header-subtitle,
:global(.dark) .overview-desc,
:global(.dark) .overview-time,
:global(.dark) .muted,
:global(.dark) .block-subtitle,
:global(.dark) .rel-text,
:global(.dark) .dqa-capacity-sub {
  color: #a8b3c7 !important;
}

:global(.dark) .overview-title,
:global(.dark) .metric-value,
:global(.dark) .focus-value,
:global(.dark) .big-kpi,
:global(.dark) .block-title,
:global(.dark) .dqa-capacity-main,
:global(.dark) .title-block h2 {
  color: #f8fafc !important;
}

:global(.dark) .dqa-alert {
  background: rgba(34, 197, 94, 0.12) !important;
  color: #86efac !important;
}

:global(.dark) .dqa-alert.is-over {
  background: rgba(248, 113, 113, 0.12) !important;
  color: #fca5a5 !important;
}

:global(.dark) .util-badge.is-low {
  background: rgba(34, 197, 94, 0.16) !important;
  color: #86efac !important;
}
:global(.dark) .util-badge.is-medium {
  background: rgba(245, 158, 11, 0.16) !important;
  color: #fcd34d !important;
}
:global(.dark) .util-badge.is-high {
  background: rgba(248, 113, 113, 0.16) !important;
  color: #fca5a5 !important;
}

:global(.dark) .table-scroll :deep(.el-table) {
  --el-table-border-color: #263244;
  --el-table-header-border-color: #263244;
  --el-table-row-hover-bg-color: #172131;
  --el-table-current-row-bg-color: #172131;
  --el-table-header-bg-color: #0f172a;
  --el-table-tr-bg-color: #111827;
  --el-table-bg-color: #111827;
  --el-table-fixed-box-shadow: none;
  --el-table-text-color: #F1F5F9;
  --el-table-header-text-color: #DBE7F5;
  color: #F1F5F9;
  background: #111827;
}

:global(.dark) .table-scroll :deep(.el-table th.el-table__cell) {
  background: #0b1220 !important;
}

:global(.dark) .table-scroll :deep(.el-table td.el-table__cell) {
  background: #0f172a !important;
  color: #F1F5F9 !important;
}

:global(.dark) .table-scroll :deep(.el-table__body tr.el-table__row--striped td.el-table__cell) {
  background: #111c31 !important;
}

:global(.dark) .table-scroll :deep(.el-table__body tr:hover > td.el-table__cell) {
  background: #16233a !important;
}

:global(.dark) .table-scroll :deep(.el-table::before) {
  background-color: #263244 !important;
}

:global(.dark) .block-reliability :deep(.el-progress__text) {
  color: #F8FAFC !important;
  font-weight: 700 !important;
}

:global(.dark) .block-reliability :deep(svg path:nth-child(1)) {
  stroke: #223047 !important;
}

:global(.dark) .rel-body,
:global(.dark) .dqa-block,
:global(.dark) .user-work-chart {
  background: rgba(15, 23, 42, 0.42);
  border-radius: 14px;
}

:global(.dark) .el-card__header {
  border-bottom-color: rgba(148, 163, 184, 0.1) !important;
}

:global(.dark) .el-button--default {
  --el-button-bg-color: #162033;
  --el-button-border-color: #2a3950;
  --el-button-text-color: #e5e7eb;
  --el-button-hover-bg-color: #1d2940;
  --el-button-hover-border-color: #3a4f72;
  --el-button-hover-text-color: #ffffff;
}

:global(.dark) .el-switch {
  --el-switch-off-color: #334155;
}

/* RWD */
@media (max-width: 1200px) {
  .metric-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .overview-top {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 1024px) {
  .stat-grid {
    grid-template-columns: 1fr;
    grid-template-areas:
      "rel"
      "dqa"
      "user"
      "table";
  }

  .focus-grid {
    grid-template-columns: 1fr;
  }

  .user-work-chart {
    height: 250px;
  }
}

@media (max-width: 900px) {
  .overview-actions {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .metric-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 768px) {
  .page {
    padding: 10px;
  }

  .header-bar .left {
    min-width: 0;
    width: 100%;
  }

  .header-actions {
    width: 100%;
    justify-content: flex-start;
  }

  .overview-title {
    font-size: 22px;
  }

  .rel-body,
  .dqa-block {
    flex-direction: column;
    align-items: flex-start;
  }

  .dqa-chart {
    width: 185px;
    height: 160px;
  }
}

@media (max-width: 520px) {
  .metric-grid,
  .overview-actions {
    grid-template-columns: 1fr;
  }

  .header-actions :deep(.el-button),
  .header-actions :deep(.el-switch) {
    max-width: 100%;
  }

  .overview-meta {
    flex-direction: column;
  }
}
</style>