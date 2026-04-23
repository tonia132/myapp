<template>
  <div class="page system-logs-page-vivid">
    <section class="hero-card">
      <div class="hero-main">
        <div class="hero-left">
          <div class="hero-icon-wrap">
            <div class="hero-icon">🧾</div>
          </div>

          <div class="hero-copy">
            <div class="hero-eyebrow">{{ text('logs.eyebrow', 'Audit / Activity Center') }}</div>
            <h2 class="hero-title">{{ text('logs.title', '系統日誌') }}</h2>
            <div class="hero-subtitle">
              {{ text('logs.subtitle', '查看使用者操作、頁面事件與系統活動紀錄，快速追蹤異常或操作脈絡') }}
            </div>
          </div>
        </div>

        <div class="hero-actions">
          <el-button class="btn" :icon="Refresh" @click="fetchData" :loading="loading">
            {{ text('logs.btnReload', '重新整理') }}
          </el-button>
        </div>
      </div>

      <div class="stats-grid">
        <div class="stat-card stat-primary">
          <div class="stat-label">{{ text('logs.stats.total', '總筆數') }}</div>
          <div class="stat-value">{{ total }}</div>
        </div>

        <div class="stat-card">
          <div class="stat-label">{{ text('logs.stats.currentPage', '目前頁面') }}</div>
          <div class="stat-value">{{ rows.length }}</div>
        </div>

        <div class="stat-card">
          <div class="stat-label">{{ text('logs.stats.uniqueUsers', '使用者數') }}</div>
          <div class="stat-value">{{ uniqueUsersCount }}</div>
        </div>

        <div class="stat-card">
          <div class="stat-label">{{ text('logs.stats.uniqueActions', '動作種類') }}</div>
          <div class="stat-value">{{ uniqueActionsCount }}</div>
        </div>
      </div>
    </section>

    <el-card shadow="never" class="filter-card">
      <div class="section-head">
        <div>
          <div class="section-title">{{ text('logs.filterTitle', '篩選條件') }}</div>
          <div class="section-subtitle">
            {{ text('logs.filterSubtitle', '可依動作、資源、日期區間與關鍵字快速縮小範圍') }}
          </div>
        </div>
      </div>

      <div class="filter-grid">
        <div class="filter-item">
          <div class="filter-label">{{ text('logs.filterActionLabel', '動作') }}</div>
          <el-select
            v-model="q.action"
            :placeholder="text('logs.filterActionPlaceholder', '選擇動作')"
            clearable
            filterable
            allow-create
            default-first-option
            class="ctrl w-100"
            @change="onFilterChange"
          >
            <el-option-group :label="tt('logs.groupCrud', 'CRUD')">
              <el-option :label="text('logs.actionCreate', 'CREATE')" value="CREATE" />
              <el-option :label="text('logs.actionUpdate', 'UPDATE')" value="UPDATE" />
              <el-option :label="text('logs.actionDelete', 'DELETE')" value="DELETE" />
            </el-option-group>

            <el-option-group :label="tt('logs.groupAuth', 'Auth')">
              <el-option :label="text('logs.actionLogin', 'LOGIN')" value="LOGIN" />
              <el-option :label="text('logs.actionRegister', 'REGISTER')" value="REGISTER" />
              <el-option :label="tt('logs.actionLogout', 'LOGOUT')" value="LOGOUT" />
            </el-option-group>

            <el-option-group :label="tt('logs.groupUI', 'UI / Page')">
              <el-option :label="tt('logs.actionPageView', 'PAGE_VIEW')" value="PAGE_VIEW" />
              <el-option :label="tt('logs.actionUIAction', 'UI_ACTION')" value="UI_ACTION" />
              <el-option :label="tt('logs.actionSearch', 'SEARCH')" value="SEARCH" />
              <el-option :label="tt('logs.actionOpenCreate', 'OPEN_CREATE')" value="OPEN_CREATE" />
              <el-option :label="tt('logs.actionOpenEdit', 'OPEN_EDIT')" value="OPEN_EDIT" />
              <el-option :label="tt('logs.actionApprove', 'APPROVE')" value="APPROVE" />
              <el-option :label="tt('logs.actionReject', 'REJECT')" value="REJECT" />
              <el-option :label="tt('logs.actionUpload', 'UPLOAD')" value="UPLOAD" />
              <el-option :label="tt('logs.actionDownload', 'DOWNLOAD')" value="DOWNLOAD" />
              <el-option :label="tt('logs.actionExportPDF', 'EXPORT_PDF')" value="EXPORT_PDF" />
              <el-option :label="tt('logs.actionExportExcel', 'EXPORT_EXCEL')" value="EXPORT_EXCEL" />
            </el-option-group>
          </el-select>
        </div>

        <div class="filter-item">
          <div class="filter-label">{{ tt('logs.colResource', 'Resource / Target') }}</div>
          <el-input
            v-model="q.resource"
            :placeholder="tt('logs.filterResourcePlaceholder', 'Resource（例如 page:products / ui / machines）')"
            clearable
            class="ctrl w-100"
            @keyup.enter="onFilterChange"
          />
        </div>

        <div class="filter-item">
          <div class="filter-label">{{ text('logs.rangeLabel', '時間區間') }}</div>
          <el-date-picker
            v-model="range"
            type="datetimerange"
            class="ctrl w-100"
            :start-placeholder="text('logs.rangeStartPlaceholder', '開始時間')"
            :end-placeholder="text('logs.rangeEndPlaceholder', '結束時間')"
            :shortcuts="shortcuts"
            @change="onFilterChange"
          />
        </div>

        <div class="filter-item">
          <div class="filter-label">{{ text('logs.keywordLabel', '關鍵字') }}</div>
          <el-input
            v-model="q.keyword"
            :placeholder="text('logs.filterKeywordPlaceholder', '搜尋關鍵字')"
            clearable
            class="ctrl w-100"
            @keyup.enter="onFilterChange"
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>
        </div>
      </div>
    </el-card>

    <el-card shadow="never" class="list-card">
      <template #header>
        <div class="section-head">
          <div>
            <div class="section-title">{{ text('logs.listTitle', '日誌清單') }}</div>
            <div class="section-subtitle">
              {{ text('logs.listSubtitle', '桌機可展開 detail，手機則改為卡片式閱讀') }}
            </div>
          </div>

          <el-tag effect="plain" round>
            {{ text('logs.totalTag', '共 {count} 筆', { count: total }) }}
          </el-tag>
        </div>
      </template>

      <el-table
        v-if="!isMobile"
        :data="rows"
        border
        stripe
        v-loading="loading"
        height="62vh"
        class="tbl"
      >
        <el-table-column type="expand" width="52">
          <template #default="{ row }">
            <div class="expand-wrap">
              <div class="expand-top">
                <div class="expand-title">
                  {{ tt('logs.detailTitle', 'Detail') }}
                </div>
                <el-button
                  size="small"
                  text
                  :icon="DocumentCopy"
                  @click="copyDetail(row)"
                >
                  {{ tt('logs.btnCopyDetail', '複製') }}
                </el-button>
              </div>

              <pre class="meta-pre">{{ prettyDetail(row) }}</pre>
            </div>
          </template>
        </el-table-column>

        <el-table-column type="index" width="64" />

        <el-table-column prop="createdAt" :label="text('logs.colTime', '時間')" width="200">
          <template #default="{ row }">
            <el-tag effect="plain" class="pill mini">{{ formatTime(row.createdAt) }}</el-tag>
          </template>
        </el-table-column>

        <el-table-column :label="text('logs.colUser', '使用者')" width="200">
          <template #default="{ row }">
            <el-tag type="info" effect="plain" class="pill mini">
              {{ displayUser(row) }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column prop="action" :label="text('logs.colAction', '動作')" width="210">
          <template #default="{ row }">
            <el-tag :type="mapAction(row.action).type">
              {{ mapAction(row.action).label }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column
          :label="tt('logs.colResource', 'Resource / Target')"
          width="300"
          show-overflow-tooltip
        >
          <template #default="{ row }">
            <span class="muted">{{ displayResource(row) }}</span>
            <span v-if="row?.targetId" class="muted"> #{{ row.targetId }}</span>
          </template>
        </el-table-column>

        <el-table-column
          prop="ip"
          :label="tt('logs.colIP', 'IP')"
          width="160"
          show-overflow-tooltip
        >
          <template #default="{ row }">
            <span class="muted">{{ row.ip || '-' }}</span>
          </template>
        </el-table-column>

        <el-table-column
          prop="description"
          :label="text('logs.colDetail', '內容')"
          min-width="420"
          show-overflow-tooltip
        />
      </el-table>

      <div v-else class="mobile-list" v-loading="loading">
        <template v-if="rows.length">
          <article v-for="row in rows" :key="row.id" class="log-card">
            <div class="log-card-top">
              <div class="log-card-head">
                <div class="log-time">{{ formatTime(row.createdAt) }}</div>
                <div class="log-user">{{ displayUser(row) }}</div>
              </div>

              <el-tag :type="mapAction(row.action).type" size="small">
                {{ mapAction(row.action).label }}
              </el-tag>
            </div>

            <div class="log-grid">
              <div class="meta-box">
                <div class="meta-label">{{ tt('logs.colResource', 'Resource / Target') }}</div>
                <div class="meta-value">
                  {{ displayResource(row) }}
                  <span v-if="row?.targetId"> #{{ row.targetId }}</span>
                </div>
              </div>

              <div class="meta-box">
                <div class="meta-label">{{ tt('logs.colIP', 'IP') }}</div>
                <div class="meta-value">{{ row.ip || '-' }}</div>
              </div>
            </div>

            <div class="detail-block">
              <div class="detail-label">{{ text('logs.colDetail', '內容') }}</div>
              <div class="detail-text">{{ row.description || '-' }}</div>
            </div>

            <div class="detail-block">
              <div class="detail-head">
                <div class="detail-label">{{ tt('logs.detailTitle', 'Detail') }}</div>
                <el-button size="small" text :icon="DocumentCopy" @click="copyDetail(row)">
                  {{ tt('logs.btnCopyDetail', '複製') }}
                </el-button>
              </div>
              <pre class="meta-pre mobile">{{ prettyDetail(row) }}</pre>
            </div>
          </article>
        </template>

        <el-empty
          v-else
          :description="text('common.noData', '目前沒有資料')"
        />
      </div>

      <div class="pagination">
        <el-pagination
          background
          layout="prev, pager, next, sizes, total"
          :total="total"
          :current-page="q.page"
          :page-size="q.pageSize"
          :page-sizes="[10, 20, 50, 100]"
          @current-change="(n)=>{ q.page = n; fetchData(); }"
          @size-change="(s)=>{ q.pageSize = s; q.page = 1; fetchData(); }"
        />
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed, onBeforeUnmount } from 'vue'
import { ElMessage } from 'element-plus'
import { Refresh, Search, DocumentCopy } from '@element-plus/icons-vue'
import { useI18n } from 'vue-i18n'
import { getApiBase } from '@/utils/apiBase'

const { t, te } = useI18n()

const text = (key, fallback, params) => {
  if (te(key)) return t(key, params)
  if (!params) return fallback
  return String(fallback).replace(/\{(\w+)\}/g, (_, k) => String(params?.[k] ?? ''))
}
const tt = (key, fallback) => {
  const v = t(key)
  return v === key ? fallback : v
}

const apiBase = getApiBase()

const q = reactive({
  page: 1,
  pageSize: 20,
  keyword: '',
  action: '',
  resource: ''
})

const rows = ref([])
const total = ref(0)
const loading = ref(false)
const range = ref([])

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

/** 日期快捷選擇，隨語系更新 */
const shortcuts = computed(() => [
  {
    text: text('logs.shortcutToday', '今天'),
    value: () => {
      const s = new Date()
      s.setHours(0, 0, 0, 0)
      return [s, new Date()]
    }
  },
  {
    text: text('logs.shortcut7Days', '近 7 天'),
    value: () => {
      const e = new Date()
      const s = new Date()
      s.setDate(e.getDate() - 7)
      return [s, e]
    }
  },
  {
    text: text('logs.shortcut30Days', '近 30 天'),
    value: () => {
      const e = new Date()
      const s = new Date()
      s.setDate(e.getDate() - 30)
      return [s, e]
    }
  }
])

const uniqueUsersCount = computed(() => {
  const set = new Set(
    rows.value
      .map(row => displayUser(row))
      .filter(v => v && v !== '-')
  )
  return set.size
})

const uniqueActionsCount = computed(() => {
  const set = new Set(
    rows.value
      .map(row => String(row?.action || '').trim())
      .filter(Boolean)
  )
  return set.size
})

function onFilterChange () {
  q.page = 1
  fetchData()
}

function mapAction (a) {
  if (!a) return { label: '-', type: 'info' }
  const raw = String(a)
  const L = raw.toLowerCase()

  if (raw === 'PAGE_VIEW') return { label: tt('logs.actionPageView', 'PAGE_VIEW'), type: 'info' }
  if (raw === 'UI_ACTION') return { label: tt('logs.actionUIAction', 'UI_ACTION'), type: 'info' }
  if (raw === 'SEARCH') return { label: tt('logs.actionSearch', 'SEARCH'), type: 'info' }
  if (raw.startsWith('EXPORT')) return { label: raw, type: 'warning' }
  if (raw === 'APPROVE') return { label: tt('logs.actionApprove', 'APPROVE'), type: 'success' }
  if (raw === 'REJECT') return { label: tt('logs.actionReject', 'REJECT'), type: 'danger' }

  if (L.includes('create') || L.includes('add') || L.includes('insert')) return { label: raw, type: 'success' }
  if (L.includes('delete') || L.includes('remove')) return { label: raw, type: 'danger' }
  if (L.includes('update') || L.includes('edit') || L.includes('change')) return { label: raw, type: 'warning' }
  if (L.includes('login') || L.includes('logout') || L.includes('register')) return { label: raw, type: 'info' }

  return { label: raw, type: 'info' }
}

function displayUser (row) {
  return (
    row?.actor?.name ||
    row?.actor?.username ||
    row?.user?.name ||
    row?.user?.username ||
    '-'
  )
}

function displayResource (row) {
  return row?.resource || row?.targetType || tt('logs.targetEmpty', '（無）')
}

function authHeaders () {
  const token = localStorage.getItem('token') || sessionStorage.getItem('token') || ''
  return token ? { Authorization: `Bearer ${token}` } : {}
}

function formatTime (v) {
  if (!v) return '-'
  const d = new Date(v)
  const pad = n => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function parseDetail (row) {
  const v = row?.detail ?? row?.details ?? row?.meta
  if (!v) return {}

  if (typeof v === 'object') return v

  const s = String(v)
  try {
    return JSON.parse(s)
  } catch {
    return { raw: s }
  }
}

function prettyDetail (row) {
  const d = parseDetail(row)
  if (typeof d === 'string') return d
  return JSON.stringify(d, null, 2)
}

async function copyDetail (row) {
  try {
    await navigator.clipboard.writeText(prettyDetail(row))
    ElMessage.success(tt('logs.copySuccess', '已複製'))
  } catch {
    ElMessage.warning(tt('logs.copyFailed', '複製失敗'))
  }
}

async function fetchData () {
  loading.value = true
  try {
    const params = new URLSearchParams({
      page: String(q.page),
      limit: String(q.pageSize),
      keyword: q.keyword || ''
    })
    if (q.action) params.set('action', q.action)
    if (q.resource) params.set('resource', q.resource)

    if (Array.isArray(range.value) && range.value.length === 2 && range.value[0] && range.value[1]) {
      params.set('startDate', range.value[0].toISOString())
      params.set('endDate', range.value[1].toISOString())
    }

    const res = await fetch(`${apiBase}/logs?${params.toString()}`, {
      headers: authHeaders()
    })
    const json = await res.json()

    const pack = json?.data || json || {}
    rows.value = pack?.rows || pack?.logs || json?.logs || []
    total.value = Number(pack?.count ?? pack?.total ?? json?.total ?? 0)
  } catch (e) {
    console.error(e)
    ElMessage.error(text('logs.fetchFailed', '載入日誌失敗'))
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
.system-logs-page-vivid {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  color: var(--el-text-color-primary);
}

.muted { color: var(--el-text-color-secondary); }
.btn { border-radius: 12px; }
.ctrl { border-radius: 12px; }
.w-100 { width: 100%; }
.pill { border-radius: 999px; }
.pill.mini { font-size: 12px; padding: 2px 10px; }

.hero-card,
.filter-card,
.list-card {
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
}
.hero-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
  flex-wrap: wrap;
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

.filter-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
  margin-top: 14px;
}
.filter-item {
  min-width: 0;
}
.filter-label {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  margin-bottom: 6px;
  font-weight: 700;
}

.tbl :deep(.el-table__header-wrapper th){
  background: var(--el-fill-color-light);
}

.pagination {
  display: flex;
  justify-content: flex-end;
  padding-top: 12px;
}

.expand-wrap {
  padding: 10px 12px;
  background: color-mix(in srgb, var(--el-fill-color-light) 88%, white 12%);
  border-radius: 14px;
}
.expand-top,
.detail-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 8px;
}
.expand-title,
.detail-label {
  font-weight: 700;
  color: var(--el-text-color-primary);
}
.meta-pre {
  margin: 0;
  max-height: 240px;
  overflow: auto;
  padding: 10px 12px;
  border-radius: 12px;
  border: 1px solid var(--el-border-color);
  background: var(--el-bg-color);
  color: var(--el-text-color-primary);
  font-size: 12px;
  line-height: 1.55;
}
.meta-pre.mobile {
  max-height: 220px;
}

.mobile-list {
  display: grid;
  gap: 12px;
}
.log-card {
  border: 1px solid var(--el-border-color-lighter);
  background: var(--el-bg-color);
  border-radius: 18px;
  padding: 14px;
}
.log-card-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
}
.log-time {
  font-size: 13px;
  color: var(--el-text-color-secondary);
  margin-bottom: 4px;
}
.log-user {
  font-size: 16px;
  font-weight: 800;
}
.log-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  margin-top: 12px;
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
  word-break: break-word;
}
.detail-block {
  margin-top: 12px;
}
.detail-text {
  padding: 10px 12px;
  border-radius: 12px;
  background: color-mix(in srgb, var(--el-fill-color-light) 90%, white 10%);
  border: 1px solid var(--el-border-color-lighter);
  line-height: 1.6;
  word-break: break-word;
}

@media (max-width: 1100px) {
  .stats-grid,
  .filter-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 768px) {
  .system-logs-page-vivid {
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

  .pagination {
    justify-content: center;
    overflow-x: auto;
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
  .filter-grid,
  .log-grid {
    grid-template-columns: 1fr;
  }

  .hero-actions :deep(.el-button) {
    flex: 1 1 calc(50% - 8px);
  }
}
</style>
