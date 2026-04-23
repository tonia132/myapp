<!-- frontend/src/views/DefaultTestSets.vue -->
<template>
  <div class="page default-test-sets-page">
    <section class="hero-card">
      <div class="hero-top">
        <div class="hero-left">
          <div class="hero-icon-wrap">
            <div class="hero-icon">🧩</div>
          </div>

          <div class="hero-copy">
            <div class="hero-eyebrow">{{ text('defaultTestSets.eyebrow', 'QA / Test Library') }}</div>
            <h2 class="hero-title">{{ text('defaultTestSets.title', '預設測試集') }}</h2>
            <div class="hero-subtitle">
              {{ text('defaultTestSets.subtitle', '快速查看、搜尋與檢視預設測試集內容') }}
            </div>
          </div>
        </div>

        <div class="hero-right">
          <el-input
            v-model="kw"
            class="ctrl w-search"
            clearable
            :placeholder="text('defaultTestSets.searchPlaceholder', '搜尋測試集名稱、說明或內容關鍵字')"
            @keyup.enter="onSearch"
            @clear="onSearch"
          >
            <template #prefix><el-icon><Search /></el-icon></template>
          </el-input>

          <div class="hero-toggles">
            <div class="toggle-chip">
              <span class="toggle-label">{{ text('defaultTestSets.mine', '只看我的') }}</span>
              <el-switch v-model="mine" @change="onFilterChanged" />
            </div>
            <div class="toggle-chip">
              <span class="toggle-label">{{ text('defaultTestSets.includeDeleted', '包含已刪除') }}</span>
              <el-switch v-model="includeDeleted" @change="onFilterChanged" />
            </div>
          </div>

          <div class="hero-actions">
            <el-button :icon="Search" @click="onSearch" :loading="loading">
              {{ text('common.search', '搜尋') }}
            </el-button>
            <el-button :icon="Refresh" @click="fetchList" :loading="loading">
              {{ text('defaultTestSets.actions.refresh', '重新整理') }}
            </el-button>
          </div>
        </div>
      </div>

      <div class="stats-grid">
        <div class="stat-card stat-primary">
          <div class="stat-label">{{ text('defaultTestSets.stats.totalSets', '測試集數量') }}</div>
          <div class="stat-value">{{ rows.length }}</div>
        </div>

        <div class="stat-card">
          <div class="stat-label">{{ text('defaultTestSets.stats.currentPage', '目前頁面') }}</div>
          <div class="stat-value">{{ pagedRows.length }}</div>
        </div>

        <div class="stat-card">
          <div class="stat-label">{{ text('defaultTestSets.stats.totalItems', '測項總數') }}</div>
          <div class="stat-value">{{ totalItems }}</div>
        </div>

        <div class="stat-card">
          <div class="stat-label">{{ text('defaultTestSets.stats.deleted', '已刪除') }}</div>
          <div class="stat-value">{{ deletedCount }}</div>
        </div>
      </div>
    </section>

    <el-card shadow="never" class="list-card">
      <template #header>
        <div class="section-head">
          <div>
            <div class="section-title">{{ text('defaultTestSets.listTitle', '測試集清單') }}</div>
            <div class="section-subtitle">
              {{ text('defaultTestSets.listSubtitle', '桌面版支援表格快速瀏覽，手機版自動切換卡片式閱讀') }}
            </div>
          </div>

          <el-tag round effect="plain" class="total-pill">
            {{ text('defaultTestSets.totalTag', '共 {total} 筆', { total: rows.length }) }}
          </el-tag>
        </div>
      </template>

      <div v-if="!isMobile" class="desktop-wrap">
        <el-table
          :data="pagedRows"
          border
          stripe
          row-key="id"
          v-loading="loading"
          class="main-table"
          :empty-text="text('defaultTestSets.empty', '目前沒有資料')"
        >
          <el-table-column
            prop="id"
            :label="text('defaultTestSets.columns.id', 'ID')"
            width="90"
            align="center"
          />

          <el-table-column
            :label="text('defaultTestSets.columns.name', '名稱')"
            min-width="280"
            show-overflow-tooltip
          >
            <template #default="{ row }">
              <div class="name-cell">
                <el-button link type="primary" class="name-link" @click="openDetail(row)">
                  {{ row.name || text('defaultTestSets.detail.fallbackName', '未命名測試集') }}
                </el-button>

                <el-tag
                  v-if="isDeletedRow(row)"
                  type="danger"
                  effect="plain"
                  size="small"
                >
                  {{ text('defaultTestSets.labels.deleted', '已刪除') }}
                </el-tag>
              </div>
            </template>
          </el-table-column>

          <el-table-column
            prop="description"
            :label="text('defaultTestSets.columns.description', '說明')"
            min-width="320"
            show-overflow-tooltip
          >
            <template #default="{ row }">
              {{ row.description || '—' }}
            </template>
          </el-table-column>

          <el-table-column
            :label="text('defaultTestSets.columns.fromProduct', '來源產品')"
            width="140"
            align="center"
          >
            <template #default="{ row }">
              <span v-if="row.fromProductId">#{{ row.fromProductId }}</span>
              <span v-else class="muted">—</span>
            </template>
          </el-table-column>

          <el-table-column
            :label="text('defaultTestSets.columns.itemsCount', '項目數')"
            width="110"
            align="center"
          >
            <template #default="{ row }">
              {{ Number(row.itemsCount || 0) }}
            </template>
          </el-table-column>

          <el-table-column
            :label="text('defaultTestSets.columns.updatedAt', '更新時間')"
            width="190"
          >
            <template #default="{ row }">
              {{ formatDateTime(row.updatedAt) }}
            </template>
          </el-table-column>

          <el-table-column
            :label="text('common.actions', '操作')"
            width="250"
            align="center"
            fixed="right"
          >
            <template #default="{ row }">
              <div class="row-actions">
                <el-button size="small" type="primary" @click="openDetail(row)">
                  {{ text('defaultTestSets.actions.view', '檢視') }}
                </el-button>

                <el-button
                  size="small"
                  type="danger"
                  plain
                  :disabled="isDeletedRow(row)"
                  :loading="deletingId === row.id"
                  @click="del(row)"
                >
                  {{ text('defaultTestSets.actions.delete', '刪除') }}
                </el-button>
              </div>
            </template>
          </el-table-column>
        </el-table>

        <div class="footer-row">
          <div class="footer-meta muted">
            {{ text('defaultTestSets.labels.total', '總筆數') }}：{{ rows.length }}
          </div>

          <el-pagination
            v-if="rows.length"
            background
            layout="prev, pager, next, sizes"
            :total="rows.length"
            :page-size="pageSize"
            :current-page="page"
            :page-sizes="[10, 20, 50, 100]"
            @size-change="onPageSize"
            @current-change="onPage"
          />
        </div>
      </div>

      <div v-else class="mobile-wrap" v-loading="loading">
        <el-empty
          v-if="!loading && rows.length === 0"
          :description="text('defaultTestSets.empty', '目前沒有資料')"
        />

        <div v-else class="mobile-cards">
          <article
            v-for="row in pagedRows"
            :key="row.id"
            class="mobile-card"
          >
            <div class="mobile-card-top">
              <div class="mobile-card-title-wrap">
                <div class="id-badge">#{{ row.id }}</div>
                <div class="mobile-card-title">
                  {{ row.name || text('defaultTestSets.detail.fallbackName', '未命名測試集') }}
                </div>
              </div>

              <el-tag
                v-if="isDeletedRow(row)"
                type="danger"
                effect="plain"
                size="small"
              >
                {{ text('defaultTestSets.labels.deleted', '已刪除') }}
              </el-tag>
            </div>

            <div class="mobile-desc">{{ row.description || '—' }}</div>

            <div class="mobile-meta-grid">
              <div class="meta-box">
                <div class="meta-k">{{ text('defaultTestSets.columns.fromProduct', '來源產品') }}</div>
                <div class="meta-v">{{ row.fromProductId ? `#${row.fromProductId}` : '—' }}</div>
              </div>

              <div class="meta-box">
                <div class="meta-k">{{ text('defaultTestSets.columns.itemsCount', '項目數') }}</div>
                <div class="meta-v">{{ Number(row.itemsCount || 0) }}</div>
              </div>

              <div class="meta-box span-2">
                <div class="meta-k">{{ text('defaultTestSets.columns.updatedAt', '更新時間') }}</div>
                <div class="meta-v">{{ formatDateTime(row.updatedAt) }}</div>
              </div>
            </div>

            <div class="mobile-actions">
              <el-button type="primary" @click="openDetail(row)">
                {{ text('defaultTestSets.actions.view', '檢視') }}
              </el-button>
              <el-button
                type="danger"
                plain
                :disabled="isDeletedRow(row)"
                :loading="deletingId === row.id"
                @click="del(row)"
              >
                {{ text('defaultTestSets.actions.delete', '刪除') }}
              </el-button>
            </div>
          </article>

          <div class="mobile-pager" v-if="rows.length">
            <el-pagination
              background
              layout="prev, pager, next"
              :total="rows.length"
              :page-size="pageSize"
              :current-page="page"
              @current-change="onPage"
            />
          </div>
        </div>
      </div>
    </el-card>

    <el-dialog
      v-model="detailDialog"
      :title="text('defaultTestSets.detail.title', '測試集內容')"
      :width="isMobile ? '100%' : '1100px'"
      :fullscreen="isMobile"
      class="detail-dialog"
      destroy-on-close
    >
      <div v-loading="detailLoading">
        <template v-if="detail">
          <div class="detail-hero">
            <div class="detail-summary">
              <div class="detail-chips">
                <el-tag type="info" class="pill">#{{ detail.id }}</el-tag>
                <el-tag type="success" class="pill">
                  {{ detail.name || text('defaultTestSets.detail.fallbackName', '未命名測試集') }}
                </el-tag>
                <el-tag effect="plain" class="pill">
                  {{ text('defaultTestSets.detail.itemsTag', '共 {n} 個測項', { n: Array.isArray(detail.items) ? detail.items.length : 0 }) }}
                </el-tag>
                <el-tag v-if="detail.itemsMode" effect="plain" class="pill">
                  {{ detail.itemsMode }}
                </el-tag>
              </div>

              <div class="detail-description">
                {{ detail.description || text('defaultTestSets.detail.noDescription', '沒有補充說明') }}
              </div>
            </div>

            <div class="detail-stats">
              <div class="detail-stat-box">
                <div class="meta-k">{{ text('defaultTestSets.detail.stats.items', '測項數') }}</div>
                <div class="detail-stat-v">{{ Array.isArray(detail.items) ? detail.items.length : 0 }}</div>
              </div>
              <div class="detail-stat-box">
                <div class="meta-k">{{ text('defaultTestSets.detail.stats.planned', '已啟用') }}</div>
                <div class="detail-stat-v">{{ plannedCount }}</div>
              </div>
              <div class="detail-stat-box">
                <div class="meta-k">{{ text('defaultTestSets.detail.stats.unplanned', '未啟用') }}</div>
                <div class="detail-stat-v">{{ unplannedCount }}</div>
              </div>
            </div>
          </div>

          <div class="detail-tools-bar">
            <el-input
              v-model="detailKw"
              clearable
              class="ctrl detail-search"
              :placeholder="text('defaultTestSets.detail.searchPlaceholder', '搜尋分類、章節、代碼、測試項目')"
            >
              <template #prefix><el-icon><Search /></el-icon></template>
            </el-input>

            <el-segmented
              v-model="plannedFilter"
              :options="plannedOptions"
              class="seg"
            />
          </div>

          <el-table
            v-if="!isMobile"
            :data="detailItemsFiltered"
            border
            stripe
            height="560"
            class="detail-table"
            :empty-text="text('defaultTestSets.empty', '目前沒有資料')"
          >
            <el-table-column
              prop="category"
              :label="text('defaultTestSets.detail.columns.category', '分類')"
              width="120"
            />
            <el-table-column
              prop="section"
              :label="text('defaultTestSets.detail.columns.section', '區段')"
              width="160"
            />
            <el-table-column
              prop="code"
              :label="text('defaultTestSets.detail.columns.code', '代碼')"
              width="160"
            />
            <el-table-column
              prop="testCase"
              :label="text('defaultTestSets.detail.columns.testCase', '測試項目')"
              min-width="320"
              show-overflow-tooltip
            />
            <el-table-column
              :label="text('defaultTestSets.detail.columns.planned', '啟用')"
              width="110"
              align="center"
            >
              <template #default="{ row }">
                <el-tag v-if="row.isPlanned !== false" type="success">
                  {{ text('defaultTestSets.detail.filters.planned', '啟用') }}
                </el-tag>
                <el-tag v-else type="info">
                  {{ text('defaultTestSets.detail.filters.unplanned', '未啟用') }}
                </el-tag>
              </template>
            </el-table-column>
          </el-table>

          <div v-else class="detail-mobile-cards">
            <el-empty
              v-if="detailItemsFiltered.length === 0"
              :description="text('defaultTestSets.empty', '目前沒有資料')"
            />

            <article
              v-for="(it, idx) in detailItemsFiltered"
              :key="`${it.code || 'item'}-${idx}`"
              class="detail-mobile-card"
            >
              <div class="detail-mobile-top">
                <div>
                  <div class="detail-mobile-code">{{ it.code || '—' }}</div>
                  <div class="detail-mobile-sub muted">{{ it.category || '—' }} · {{ it.section || '—' }}</div>
                </div>

                <el-tag v-if="it.isPlanned !== false" type="success" size="small">
                  {{ text('defaultTestSets.detail.filters.planned', '啟用') }}
                </el-tag>
                <el-tag v-else type="info" size="small">
                  {{ text('defaultTestSets.detail.filters.unplanned', '未啟用') }}
                </el-tag>
              </div>

              <div class="detail-mobile-name">{{ it.testCase || '—' }}</div>
            </article>
          </div>

          <div class="detail-tip muted">
            {{ text('defaultTestSets.detail.tip', '可使用上方關鍵字與啟用狀態快速篩選測項。') }}
          </div>
        </template>
      </div>

      <template #footer>
        <el-button @click="detailDialog = false">
          {{ text('common.close', '關閉') }}
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Refresh, Search } from '@element-plus/icons-vue'

const { t, te, locale } = useI18n()
const router = useRouter()

function text (key, fallback, params) {
  if (te(key)) return t(key, params)
  if (!params) return fallback
  return String(fallback).replace(/\{(\w+)\}/g, (_, k) => String(params?.[k] ?? ''))
}

const apiBase = String(
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_API_BASE ||
  '/api'
).replace(/\/+$/, '')

function authHeaders () {
  const token =
    localStorage.getItem('token') ||
    sessionStorage.getItem('token') ||
    ''

  return token ? { Authorization: `Bearer ${token}` } : {}
}

function handleAuth (res) {
  if (res.status === 401) {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    localStorage.removeItem('role')
    sessionStorage.removeItem('token')
    sessionStorage.removeItem('user')
    sessionStorage.removeItem('role')
    ElMessage.warning(text('auth.sessionExpired', '登入逾時，請重新登入'))
    router.push('/login')
    return true
  }
  return false
}

async function apiJson (path, { method = 'GET', params, body } = {}) {
  let url = `${apiBase}${path}`

  if (params && typeof params === 'object') {
    const qs = new URLSearchParams()
    Object.entries(params).forEach(([k, v]) => {
      if (v === undefined || v === null || v === '') return
      qs.set(k, String(v))
    })
    const s = qs.toString()
    if (s) url += `?${s}`
  }

  const headers = { ...authHeaders() }
  const hasBody = body !== undefined
  if (hasBody) headers['Content-Type'] = 'application/json'

  const res = await fetch(url, {
    method,
    headers,
    body: hasBody ? JSON.stringify(body) : undefined
  })

  if (handleAuth(res)) throw new Error('Unauthorized')

  const json = await res.json().catch(() => ({}))

  if (!res.ok) throw new Error(json?.message || `HTTP ${res.status}`)
  if (json && typeof json === 'object' && 'success' in json && json.success === false) {
    throw new Error(json.message || 'Request failed')
  }

  return json && typeof json === 'object' && 'data' in json ? json.data : json
}

/* responsive */
const viewportWidth = ref(typeof window !== 'undefined' ? window.innerWidth : 1280)
const isMobile = computed(() => viewportWidth.value <= 768)

function onResize () {
  viewportWidth.value = window.innerWidth
}

/* list */
const kw = ref('')
const mine = ref(false)
const includeDeleted = ref(false)
const loading = ref(false)
const rows = ref([])

const page = ref(1)
const pageSize = ref(20)

const totalItems = computed(() => rows.value.reduce((sum, row) => sum + Number(row?.itemsCount || 0), 0))
const deletedCount = computed(() => rows.value.filter(row => isDeletedRow(row)).length)

const pagedRows = computed(() => {
  const start = (page.value - 1) * pageSize.value
  return rows.value.slice(start, start + pageSize.value)
})

function onPage (p) {
  page.value = p
}

function onPageSize (s) {
  pageSize.value = s
  page.value = 1
}

function onSearch () {
  page.value = 1
  fetchList()
}

function onFilterChanged () {
  page.value = 1
  fetchList()
}

let kwTimer = null
watch(kw, (v) => {
  clearTimeout(kwTimer)
  kwTimer = setTimeout(() => {
    if (v === '' || String(v).trim().length >= 2) {
      page.value = 1
      fetchList()
    }
  }, 400)
})

async function fetchList () {
  loading.value = true
  try {
    const data = await apiJson('/default-test-sets', {
      params: {
        kw: kw.value.trim(),
        keyword: kw.value.trim(),
        mine: mine.value,
        includeDeleted: includeDeleted.value
      }
    })

    const list = Array.isArray(data)
      ? data
      : (data?.rows || data?.items || [])

    rows.value = Array.isArray(list) ? list : []

    const maxPage = Math.max(1, Math.ceil(rows.value.length / pageSize.value))
    if (page.value > maxPage) page.value = maxPage
  } catch (e) {
    ElMessage.error(e?.message || text('defaultTestSets.messages.fetchFailed', '測試集載入失敗'))
  } finally {
    loading.value = false
  }
}

function isDeletedRow (row) {
  return !!(row?.deletedAt || row?.isDeleted || row?.deleted)
}

function formatDateTime (v) {
  if (!v) return '—'

  const d = new Date(v)
  if (Number.isNaN(d.getTime())) return String(v)

  try {
    return new Intl.DateTimeFormat(locale?.value || 'zh-TW', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }).format(d)
  } catch {
    return d.toLocaleString()
  }
}

/* detail */
const detailDialog = ref(false)
const detailLoading = ref(false)
const detail = ref(null)
const detailKw = ref('')
const plannedFilter = ref('all')

const plannedOptions = computed(() => ([
  { label: text('defaultTestSets.detail.filters.all', '全部'), value: 'all' },
  { label: text('defaultTestSets.detail.filters.planned', '啟用'), value: 'planned' },
  { label: text('defaultTestSets.detail.filters.unplanned', '未啟用'), value: 'unplanned' }
]))

const plannedCount = computed(() => {
  const items = Array.isArray(detail.value?.items) ? detail.value.items : []
  return items.filter(it => it?.isPlanned !== false).length
})

const unplannedCount = computed(() => {
  const items = Array.isArray(detail.value?.items) ? detail.value.items : []
  return items.filter(it => it?.isPlanned === false).length
})

const detailItemsFiltered = computed(() => {
  const items = Array.isArray(detail.value?.items) ? detail.value.items : []
  const q = String(detailKw.value || '').trim().toLowerCase()

  return items.filter((it) => {
    const planned = it?.isPlanned !== false
    if (plannedFilter.value === 'planned' && !planned) return false
    if (plannedFilter.value === 'unplanned' && planned) return false

    if (!q) return true

    const hay = [
      it?.category,
      it?.section,
      it?.code,
      it?.testCase,
      it?.testProcedure,
      it?.testCriteria
    ].map(x => String(x ?? '').toLowerCase()).join(' ')

    return hay.includes(q)
  })
})

async function openDetail (row) {
  detailLoading.value = true
  detail.value = null
  detailKw.value = ''
  plannedFilter.value = 'all'
  detailDialog.value = true

  try {
    const data = await apiJson(`/default-test-sets/${row.id}`)
    detail.value = data
  } catch (e) {
    ElMessage.error(e?.message || text('defaultTestSets.detail.loadFailed', '載入明細失敗'))
    detailDialog.value = false
  } finally {
    detailLoading.value = false
  }
}

/* delete */
const deletingId = ref(null)

async function del (row) {
  try {
    await ElMessageBox.confirm(
      text('defaultTestSets.delete.confirm', '確定要刪除 #{id} 嗎？', { id: row.id }),
      text('defaultTestSets.delete.title', '刪除確認'),
      { type: 'warning' }
    )
  } catch {
    return
  }

  deletingId.value = row.id

  try {
    await apiJson(`/default-test-sets/${row.id}`, { method: 'DELETE' })
    ElMessage.success(text('defaultTestSets.messages.deleteSuccess', '刪除成功'))
    await fetchList()
  } catch (e) {
    ElMessage.error(e?.message || text('defaultTestSets.messages.deleteFailed', '刪除失敗'))
  } finally {
    deletingId.value = null
  }
}

onMounted(() => {
  fetchList()
  window.addEventListener('resize', onResize)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', onResize)
  clearTimeout(kwTimer)
})
</script>

<style scoped>
.default-test-sets-page {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  color: var(--el-text-color-primary);
}

.hero-card,
.list-card {
  border: 1px solid var(--el-border-color-light);
  border-radius: 24px;
  overflow: hidden;
  background:
    radial-gradient(circle at top right, color-mix(in srgb, var(--el-color-primary) 12%, transparent) 0%, transparent 32%),
    linear-gradient(180deg, color-mix(in srgb, var(--el-bg-color) 92%, var(--el-color-primary-light-9) 8%) 0%, var(--el-bg-color) 100%);
  box-shadow: 0 18px 48px rgba(0, 0, 0, 0.06);
}

.hero-card {
  padding: 20px;
  position: relative;
}

.hero-card::after {
  content: '';
  position: absolute;
  right: -56px;
  bottom: -56px;
  width: 180px;
  height: 180px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--el-color-primary) 10%, transparent);
  filter: blur(12px);
  pointer-events: none;
}

.hero-top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 18px;
  position: relative;
  z-index: 1;
}

.hero-left {
  display: flex;
  align-items: center;
  gap: 14px;
  min-width: 0;
}

.hero-icon-wrap {
  width: 68px;
  height: 68px;
  border-radius: 22px;
  display: grid;
  place-items: center;
  background: linear-gradient(135deg, var(--el-color-primary-light-7), var(--el-color-primary-light-9));
  border: 1px solid color-mix(in srgb, var(--el-color-primary) 28%, var(--el-border-color-light));
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.55);
}

.hero-icon {
  font-size: 30px;
}

.hero-copy {
  min-width: 0;
}

.hero-eyebrow {
  color: var(--el-color-primary);
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.08em;
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

.hero-right {
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: min(560px, 100%);
}

.w-search {
  width: 100%;
}

.ctrl {
  border-radius: 14px;
}

.hero-toggles,
.hero-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.toggle-chip {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  min-height: 42px;
  padding: 0 12px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--el-fill-color-light) 90%, white 10%);
  border: 1px solid var(--el-border-color-lighter);
}

.toggle-label {
  font-size: 13px;
  color: var(--el-text-color-regular);
  font-weight: 600;
}

.stats-grid {
  position: relative;
  z-index: 1;
  margin-top: 18px;
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
  line-height: 1;
  font-weight: 800;
}

.section-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
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
  color: var(--el-text-color-secondary);
  font-size: 13px;
}

.total-pill,
.pill {
  border-radius: 999px;
}

.main-table :deep(.el-table__header-wrapper th),
.detail-table :deep(.el-table__header-wrapper th) {
  background: var(--el-fill-color-light);
}

.name-cell {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.name-link {
  padding: 0;
  height: auto;
  font-weight: 700;
}

.row-actions {
  display: flex;
  justify-content: center;
  gap: 8px;
  flex-wrap: wrap;
}

.footer-row {
  margin-top: 14px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
}

.muted {
  color: var(--el-text-color-secondary);
}

.mobile-cards,
.detail-mobile-cards {
  display: grid;
  gap: 12px;
}

.mobile-card,
.detail-mobile-card {
  padding: 14px;
  border-radius: 18px;
  border: 1px solid var(--el-border-color-lighter);
  background: color-mix(in srgb, var(--el-bg-color) 94%, var(--el-fill-color-light) 6%);
}

.mobile-card-top,
.detail-mobile-top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 10px;
}

.mobile-card-title-wrap {
  min-width: 0;
}

.id-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 24px;
  padding: 0 9px;
  border-radius: 999px;
  background: var(--el-fill-color-light);
  font-size: 12px;
  color: var(--el-text-color-regular);
  margin-bottom: 6px;
}

.mobile-card-title,
.detail-mobile-name {
  font-size: 17px;
  font-weight: 800;
  line-height: 1.3;
  word-break: break-word;
}

.mobile-desc {
  margin-top: 10px;
  color: var(--el-text-color-regular);
  line-height: 1.55;
  word-break: break-word;
}

.mobile-meta-grid {
  margin-top: 12px;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.meta-box,
.detail-stat-box {
  padding: 10px 12px;
  border-radius: 14px;
  border: 1px solid var(--el-border-color-lighter);
  background: color-mix(in srgb, var(--el-fill-color-light) 90%, white 10%);
}

.meta-box.span-2 {
  grid-column: span 2;
}

.meta-k {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  margin-bottom: 4px;
}

.meta-v,
.detail-stat-v {
  font-size: 15px;
  font-weight: 700;
  word-break: break-word;
}

.detail-stat-v {
  font-size: 22px;
}

.mobile-actions {
  margin-top: 12px;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.mobile-pager {
  margin-top: 12px;
  display: flex;
  justify-content: center;
}

.detail-hero {
  display: grid;
  grid-template-columns: minmax(0, 1.5fr) minmax(280px, 1fr);
  gap: 14px;
  margin-bottom: 14px;
}

.detail-summary,
.detail-stats {
  border-radius: 18px;
  border: 1px solid var(--el-border-color-lighter);
  background: linear-gradient(180deg, color-mix(in srgb, var(--el-fill-color-light) 92%, white 8%) 0%, var(--el-bg-color) 100%);
  padding: 16px;
}

.detail-chips {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  align-items: center;
}

.detail-description {
  margin-top: 12px;
  color: var(--el-text-color-regular);
  line-height: 1.7;
  word-break: break-word;
}

.detail-stats {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.detail-tools-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 14px;
}

.detail-search {
  width: min(460px, 100%);
}

.seg {
  border-radius: 12px;
}

.detail-mobile-code {
  font-size: 15px;
  font-weight: 800;
}

.detail-mobile-sub {
  margin-top: 4px;
  font-size: 12px;
}

.detail-tip {
  margin-top: 12px;
  font-size: 12px;
}

@media (max-width: 1100px) {
  .stats-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .detail-hero {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .default-test-sets-page {
    padding: 12px;
    gap: 12px;
  }

  .hero-card {
    padding: 16px;
  }

  .hero-top {
    flex-direction: column;
  }

  .hero-right {
    width: 100%;
  }

  .hero-actions {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .footer-row,
  .detail-tools-bar {
    flex-direction: column;
    align-items: stretch;
  }

  .detail-search {
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
  .mobile-meta-grid,
  .detail-stats,
  .mobile-actions,
  .hero-actions {
    grid-template-columns: 1fr;
  }

  .hero-toggles {
    flex-direction: column;
  }

  .toggle-chip {
    justify-content: space-between;
    width: 100%;
  }

  .meta-box.span-2 {
    grid-column: auto;
  }
}
</style>
