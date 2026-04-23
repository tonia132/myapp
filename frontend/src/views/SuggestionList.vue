<template>
  <div class="page suggestion-mine-page-vivid">
    <section class="hero-card">
      <div class="hero-main">
        <div class="hero-left">
          <div class="hero-icon-wrap">
            <div class="hero-icon">📜</div>
          </div>

          <div class="hero-copy">
            <div class="hero-eyebrow">{{ text('suggestionMine.eyebrow', 'My Feedback History') }}</div>
            <h2 class="hero-title">{{ text('suggestionMine.title', '我的建議紀錄') }}</h2>
            <div class="hero-subtitle">
              {{ text('suggestionMine.heroSubtitle', '查看自己提出的建議、目前處理狀態、優先級與是否仍可刪除') }}
            </div>
          </div>
        </div>

        <div class="hero-right">
          <el-tag type="info" effect="dark" class="pill">
            {{ text('suggestionMine.tagList', 'Suggestion List') }}
          </el-tag>

          <el-button class="btn" :icon="Refresh" @click="fetchData" :loading="loading">
            {{ text('suggestionMine.btnReload', '重新整理') }}
          </el-button>
        </div>
      </div>

      <div class="stat-grid">
        <div class="stat-card stat-primary">
          <div class="stat-label">{{ text('suggestionMine.stats.total', '總筆數') }}</div>
          <div class="stat-value">{{ total }}</div>
        </div>

        <div class="stat-card">
          <div class="stat-label">{{ text('suggestionMine.stats.pending', '待處理') }}</div>
          <div class="stat-value">{{ pendingCount }}</div>
        </div>

        <div class="stat-card">
          <div class="stat-label">{{ text('suggestionMine.stats.inProgress', '處理中') }}</div>
          <div class="stat-value">{{ inProgressCount }}</div>
        </div>

        <div class="stat-card">
          <div class="stat-label">{{ text('suggestionMine.stats.closed', '已完成') }}</div>
          <div class="stat-value">{{ closedCount }}</div>
        </div>
      </div>
    </section>

    <el-card shadow="never" class="filter-card">
      <template #header>
        <div class="section-head">
          <div>
            <div class="section-title">{{ text('suggestionMine.filterTitle', '篩選條件') }}</div>
            <div class="section-subtitle">
              {{ text('suggestionMine.filterSubtitle', '可依狀態與關鍵字快速查找自己的建議紀錄') }}
            </div>
          </div>
        </div>
      </template>

      <div class="filter-grid">
        <div class="filter-item">
          <div class="filter-label">{{ text('suggestionMine.filterStatusLabel', '狀態') }}</div>
          <el-select
            v-model="status"
            clearable
            :placeholder="text('suggestionMine.filterStatusPlaceholder', '選擇狀態')"
            class="w-100"
          >
            <el-option
              v-for="o in STATUS_OPTIONS"
              :key="o.value"
              :label="o.label"
              :value="o.value"
            />
          </el-select>
        </div>

        <div class="filter-item keyword-item">
          <div class="filter-label">{{ text('suggestionMine.filterKeywordLabel', '關鍵字') }}</div>
          <el-input
            v-model="kw"
            :placeholder="text('suggestionMine.searchPlaceholder', '搜尋標題或內容')"
            clearable
            class="w-100"
            @keyup.enter="fetchData"
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
            <div class="section-title">{{ text('suggestionMine.listTitle', '建議清單') }}</div>
            <div class="section-subtitle">
              {{ text('suggestionMine.listSubtitle', '桌機以表格顯示，手機則改成卡片式閱讀') }}
            </div>
          </div>

          <el-tag effect="plain" round>
            {{ text('suggestionMine.totalTag', '共 {count} 筆', { count: total }) }}
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
        :row-key="row => row.id"
        :empty-text="text('common.noData', '目前沒有資料')"
        class="suggestion-table"
      >
        <el-table-column
          type="index"
          width="60"
          :label="text('suggestionMine.colIndex', '#')"
        />

        <el-table-column
          prop="title"
          :label="text('suggestionMine.colTitle', '標題')"
          min-width="260"
          show-overflow-tooltip
        >
          <template #default="{ row }">
            <div class="title-cell">
              <div class="title-main">{{ row.title || '—' }}</div>
              <div class="title-sub">
                {{ text('suggestionMine.colCreatedAt', '建立時間') }}：{{ fmt(row.createdAt) }}
              </div>
            </div>
          </template>
        </el-table-column>

        <el-table-column
          prop="priority"
          :label="text('suggestionMine.colPriority', '優先級')"
          width="120"
        >
          <template #default="{ row }">
            <el-tag :type="mapPriority(row.priority).type" effect="dark" class="pill mini">
              {{ mapPriority(row.priority).label }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column
          prop="status"
          :label="text('suggestionMine.colStatus', '狀態')"
          width="130"
        >
          <template #default="{ row }">
            <el-tag :type="mapStatus(row.status).type" effect="plain" class="pill mini">
              {{ mapStatus(row.status).label }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column
          prop="content"
          :label="text('suggestionMine.colContent', '內容')"
          min-width="320"
          show-overflow-tooltip
        />

        <el-table-column
          :label="text('suggestionMine.colActions', '操作')"
          width="180"
          align="right"
          fixed="right"
        >
          <template #default="{ row }">
            <el-popconfirm
              :title="text('suggestionMine.confirmDelete', '確定要刪除嗎？')"
              :disabled="row.status !== 'pending'"
              @confirm="remove(row)"
            >
              <template #reference>
                <el-button
                  size="small"
                  type="danger"
                  plain
                  :icon="Delete"
                  :disabled="row.status !== 'pending'"
                >
                  {{ text('common.delete', '刪除') }}
                </el-button>
              </template>
            </el-popconfirm>
          </template>
        </el-table-column>
      </el-table>

      <div v-else class="mobile-list" v-loading="loading">
        <template v-if="rows.length">
          <article
            v-for="row in rows"
            :key="row.id"
            class="suggestion-card"
          >
            <div class="card-top">
              <div class="card-head">
                <div class="card-title">{{ row.title || '—' }}</div>
                <div class="card-time">{{ fmt(row.createdAt) }}</div>
              </div>

              <div class="tag-group">
                <el-tag :type="mapPriority(row.priority).type" effect="dark" class="pill mini">
                  {{ mapPriority(row.priority).label }}
                </el-tag>
                <el-tag :type="mapStatus(row.status).type" effect="plain" class="pill mini">
                  {{ mapStatus(row.status).label }}
                </el-tag>
              </div>
            </div>

            <div class="content-box">
              <div class="content-label">{{ text('suggestionMine.colContent', '內容') }}</div>
              <div class="content-text">{{ row.content || '—' }}</div>
            </div>

            <div class="card-actions">
              <el-popconfirm
                :title="text('suggestionMine.confirmDelete', '確定要刪除嗎？')"
                :disabled="row.status !== 'pending'"
                @confirm="remove(row)"
              >
                <template #reference>
                  <el-button
                    type="danger"
                    plain
                    :icon="Delete"
                    :disabled="row.status !== 'pending'"
                  >
                    {{ text('common.delete', '刪除') }}
                  </el-button>
                </template>
              </el-popconfirm>
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
          @current-change="(n)=>{ q.page=n; fetchData() }"
          @size-change="(s)=>{ q.pageSize=s; q.page=1; fetchData() }"
        />
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, watch, computed, onBeforeUnmount } from 'vue'
import { useI18n } from 'vue-i18n'
import { ElMessage } from 'element-plus'
import { Refresh, Search, Delete } from '@element-plus/icons-vue'

const { t, te } = useI18n()

function text (key, fallback, params) {
  if (te(key)) return t(key, params)
  if (!params) return fallback
  return String(fallback).replace(/\{(\w+)\}/g, (_, k) => String(params?.[k] ?? ''))
}

// ✅ 相容你專案可能用的 env key
const apiBase = String(
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_API_BASE ||
  '/api'
).replace(/\/+$/, '')

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

/** ✅ 狀態選項：對齊後端 enum（pending / in_progress / closed） */
const STATUS_OPTIONS = computed(() => [
  { label: text('suggestionMine.status.pending', '待處理'), value: 'pending' },
  { label: text('suggestionMine.status.inProgress', '處理中'), value: 'in_progress' },
  { label: text('suggestionMine.status.closed', '已完成'), value: 'closed' }
])

const q = reactive({ page: 1, pageSize: 20 })
const rows = ref([])
const total = ref(0)
const loading = ref(false)
const status = ref('')
const kw = ref('')

const pendingCount = computed(() =>
  rows.value.filter(x => String(x?.status || '').toLowerCase() === 'pending').length
)
const inProgressCount = computed(() =>
  rows.value.filter(x => String(x?.status || '').toLowerCase() === 'in_progress').length
)
const closedCount = computed(() =>
  rows.value.filter(x => String(x?.status || '').toLowerCase() === 'closed').length
)

function authHeaders () {
  const tkn =
    localStorage.getItem('token') ||
    sessionStorage.getItem('token') ||
    ''
  return tkn ? { Authorization: `Bearer ${tkn}` } : {}
}

function handleAuth (res) {
  if (res.status === 401) {
    localStorage.removeItem('token')
    sessionStorage.removeItem('token')
    localStorage.removeItem('user')
    sessionStorage.removeItem('user')
    ElMessage.warning(text('auth.sessionExpired', '登入已過期'))
    location.href = '/login'
    return true
  }
  return false
}

function fmt (v) {
  if (!v) return '-'
  const d = new Date(v)
  if (Number.isNaN(d.getTime())) return String(v)
  return d.toLocaleString('zh-TW', { hour12: false })
}

function mapPriority (p) {
  const key = String(p || 'P2').toUpperCase()
  if (key === 'P1') return { type: 'danger', label: text('suggestionMine.priority.P1', 'P1') }
  if (key === 'P3') return { type: 'info', label: text('suggestionMine.priority.P3', 'P3') }
  return { type: 'warning', label: text('suggestionMine.priority.P2', 'P2') }
}

function mapStatus (s) {
  const L = String(s || 'pending').toLowerCase()
  if (L === 'closed') return { label: text('suggestionMine.status.closed', '已完成'), type: 'success' }
  if (L === 'in_progress') return { label: text('suggestionMine.status.inProgress', '處理中'), type: 'warning' }
  return { label: text('suggestionMine.status.pending', '待處理'), type: 'info' }
}

/** ✅ 專門把後端回傳整理成 { list, count }（相容多種格式） */
function parseListResponse (json) {
  // 你後端可能是 { success, data: { rows, count } }
  const payload = json?.data?.rows ? json.data : json

  const list =
    Array.isArray(payload?.rows) ? payload.rows
      : Array.isArray(payload?.data) ? payload.data
        : Array.isArray(payload) ? payload
          : []

  const countRaw =
    payload?.count ??
    payload?.total ??
    json?.count ??
    json?.total ??
    list.length

  const count = Number.isFinite(Number(countRaw)) ? Number(countRaw) : list.length
  return { list, count }
}

async function fetchData () {
  loading.value = true
  try {
    const params = new URLSearchParams({
      page: String(q.page),
      pageSize: String(q.pageSize),
      keyword: kw.value || ''
    })
    if (status.value) params.set('status', status.value)

    const res = await fetch(`${apiBase}/suggestions/mine?${params.toString()}`, {
      headers: authHeaders()
    })
    if (handleAuth(res)) return

    const json = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(json?.message || text('suggestionMine.message.loadFailed', '載入失敗'))

    const { list, count } = parseListResponse(json)
    rows.value = list
    total.value = count
  } catch (e) {
    console.error(e)
    const msg = String(e?.message || '')
    ElMessage.error(
      msg.includes('Failed to fetch')
        ? text('suggestionMine.message.loadFailedNetwork', '網路連線失敗')
        : (msg || text('suggestionMine.message.loadFailed', '載入失敗'))
    )
  } finally {
    loading.value = false
  }
}

async function remove (row) {
  if (!row?.id) return
  if (String(row.status) !== 'pending') return

  try {
    const res = await fetch(`${apiBase}/suggestions/${row.id}`, {
      method: 'DELETE',
      headers: authHeaders()
    })
    if (handleAuth(res)) return
    const j = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(j?.message || text('suggestionMine.message.deleteFailed', '刪除失敗'))

    ElMessage.success(text('suggestionMine.message.deleteSuccess', '刪除成功'))
    fetchData()
  } catch (e) {
    console.error(e)
    ElMessage.error(e?.message || text('suggestionMine.message.deleteFailed', '刪除失敗'))
  }
}

/* 搜尋/狀態自動查詢（debounce） */
const debounce = (fn, ms = 350) => {
  let tId
  return (...a) => {
    clearTimeout(tId)
    tId = setTimeout(() => fn(...a), ms)
  }
}

watch(
  () => kw.value,
  debounce(() => {
    q.page = 1
    fetchData()
  }, 350)
)

watch(
  () => status.value,
  () => {
    q.page = 1
    fetchData()
  }
)

onMounted(() => {
  cleanupMql = setupMql()
  fetchData()
})

onBeforeUnmount(() => {
  if (cleanupMql) cleanupMql()
})
</script>

<style scoped>
.suggestion-mine-page-vivid {
  --sm-border: var(--el-border-color-light);
  --sm-border-soft: var(--el-border-color-lighter);
  --sm-card-bg:
    radial-gradient(circle at top right, color-mix(in srgb, var(--el-color-primary) 12%, transparent) 0%, transparent 34%),
    linear-gradient(180deg, color-mix(in srgb, var(--el-bg-color) 94%, var(--el-color-primary-light-9) 6%) 0%, var(--el-bg-color) 100%);
  --sm-soft-bg: color-mix(in srgb, var(--el-fill-color-light) 88%, white 12%);
  --sm-shadow: 0 18px 48px rgba(0, 0, 0, 0.06);

  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  color: var(--el-text-color-primary);
}

.btn { border-radius: 12px; }
.pill { border-radius: 999px; }
.pill.mini { font-size: 12px; padding: 2px 10px; }
.w-100 { width: 100%; }

.hero-card,
.filter-card,
.list-card {
  border: 1px solid var(--sm-border);
  border-radius: 22px;
  background: var(--sm-card-bg);
  box-shadow: var(--sm-shadow);
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
  justify-content: space-between;
  align-items: center;
  gap: 18px;
  margin-bottom: 18px;
}

.hero-left,
.hero-right {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.hero-icon-wrap {
  width: 58px;
  height: 58px;
  border-radius: 18px;
  display: grid;
  place-items: center;
  background: linear-gradient(135deg, var(--el-color-primary-light-8), var(--el-color-primary-light-9));
  border: 1px solid color-mix(in srgb, var(--el-color-primary) 24%, var(--sm-border));
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.45);
}

.hero-icon { font-size: 26px; }

.hero-copy {
  min-width: 0;
}

.hero-eyebrow {
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.08em;
  color: var(--el-color-primary);
  margin-bottom: 4px;
}

.hero-title {
  margin: 0;
  font-size: 30px;
  line-height: 1.08;
  font-weight: 900;
}

.hero-subtitle {
  margin-top: 6px;
  font-size: 13px;
  color: var(--el-text-color-secondary);
}

.stat-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}

.stat-card {
  border-radius: 18px;
  padding: 14px 14px 12px;
  border: 1px solid var(--sm-border-soft);
  background: var(--sm-soft-bg);
}

.stat-primary {
  background: linear-gradient(135deg, var(--el-color-primary-light-8), var(--el-color-primary-light-9));
  border-color: color-mix(in srgb, var(--el-color-primary) 32%, var(--sm-border-soft));
}

.stat-label {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  margin-bottom: 8px;
}

.stat-value {
  font-size: 26px;
  line-height: 1;
  font-weight: 900;
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
  font-weight: 900;
  line-height: 1.2;
}

.section-subtitle {
  margin-top: 4px;
  font-size: 13px;
  color: var(--el-text-color-secondary);
}

.filter-grid {
  display: grid;
  grid-template-columns: 220px minmax(260px, 1fr);
  gap: 14px;
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

.suggestion-table :deep(.el-table__header-wrapper th) {
  background: var(--sm-soft-bg);
}

.title-cell {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.title-main {
  font-weight: 800;
  color: var(--el-text-color-primary);
}

.title-sub {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.mobile-list {
  display: grid;
  gap: 12px;
}

.suggestion-card {
  border: 1px solid var(--sm-border-soft);
  border-radius: 18px;
  background: linear-gradient(180deg, color-mix(in srgb, var(--el-bg-color) 98%, white 2%) 0%, color-mix(in srgb, var(--el-fill-color-light) 72%, var(--el-bg-color) 28%) 100%);
  padding: 14px;
}

.card-top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
}

.card-title {
  font-size: 16px;
  font-weight: 900;
  line-height: 1.35;
}

.card-time {
  margin-top: 4px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.tag-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
  align-items: flex-end;
}

.content-box {
  margin-top: 12px;
  padding: 12px 14px;
  border-radius: 16px;
  border: 1px solid var(--sm-border-soft);
  background: var(--sm-soft-bg);
}

.content-label {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  margin-bottom: 6px;
}

.content-text {
  font-size: 14px;
  line-height: 1.7;
  white-space: pre-wrap;
  word-break: break-word;
}

.card-actions {
  margin-top: 12px;
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.pagination {
  display: flex;
  justify-content: flex-end;
  padding-top: 12px;
}

@media (max-width: 980px) {
  .stat-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .filter-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .suggestion-mine-page-vivid {
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

  .hero-right,
  .pagination {
    justify-content: flex-start;
  }
}

@media (max-width: 640px) {
  .hero-title {
    font-size: 24px;
  }

  .stat-grid {
    grid-template-columns: 1fr;
  }

  .hero-right :deep(.el-button),
  .card-actions :deep(.el-button) {
    flex: 1 1 100%;
    min-width: 0;
  }

  .tag-group {
    align-items: flex-start;
  }

  .card-top {
    flex-direction: column;
  }
}
</style>
