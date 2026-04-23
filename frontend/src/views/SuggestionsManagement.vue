<template>
  <div class="page suggestions-mgmt-page-vivid">
    <section class="hero-card">
      <div class="hero-main">
        <div class="hero-left">
          <div class="hero-icon-wrap">
            <div class="hero-icon">🛠️</div>
          </div>

          <div class="hero-copy">
            <div class="hero-eyebrow">{{ text('suggestionsMgmt.eyebrow', 'Admin Suggestion Control Center') }}</div>
            <h2 class="hero-title">{{ text('suggestionsMgmt.title', '建議管理') }}</h2>
            <div class="hero-subtitle">
              {{ text('suggestionsMgmt.heroSubtitle', '集中管理所有建議，快速篩選、更新狀態、批次處理與回覆內容') }}
            </div>
          </div>
        </div>

        <div class="hero-right">
          <el-tag type="warning" effect="dark" round class="pill">
            {{ text('suggestionsMgmt.tagAdmin', 'Admin') }}
          </el-tag>

          <el-button class="btn" :icon="Refresh" :loading="loading" @click="fetchData">
            {{ text('common.refresh', '重新整理') }}
          </el-button>
        </div>
      </div>

      <div class="stat-grid">
        <div class="stat-card stat-primary">
          <div class="stat-label">{{ text('suggestionsMgmt.stats.total', '總筆數') }}</div>
          <div class="stat-value">{{ total }}</div>
        </div>

        <div class="stat-card">
          <div class="stat-label">{{ text('suggestionsMgmt.stats.pending', '待處理') }}</div>
          <div class="stat-value">{{ pendingCount }}</div>
        </div>

        <div class="stat-card">
          <div class="stat-label">{{ text('suggestionsMgmt.stats.reviewed', '已檢視') }}</div>
          <div class="stat-value">{{ reviewedCount }}</div>
        </div>

        <div class="stat-card">
          <div class="stat-label">{{ text('suggestionsMgmt.stats.resolved', '已解決') }}</div>
          <div class="stat-value">{{ resolvedCount }}</div>
        </div>

        <div class="stat-card">
          <div class="stat-label">{{ text('suggestionsMgmt.stats.selected', '已勾選') }}</div>
          <div class="stat-value">{{ selectedCount }}</div>
        </div>
      </div>
    </section>

    <el-card class="filter-card" shadow="never">
      <template #header>
        <div class="section-head">
          <div>
            <div class="section-title">{{ text('suggestionsMgmt.filterTitle', '篩選條件') }}</div>
            <div class="section-subtitle">
              {{ text('suggestionsMgmt.filterSubtitle', '可依狀態、優先級與關鍵字快速找到目標建議') }}
            </div>
          </div>
        </div>
      </template>

      <div class="filter-grid">
        <div class="filter-item">
          <div class="filter-label">{{ text('suggestionsMgmt.filterStatusLabel', '狀態') }}</div>
          <el-select
            v-model="status"
            clearable
            class="w-100"
            :placeholder="text('suggestionsMgmt.filterStatus', '選擇狀態')"
          >
            <el-option
              v-for="s in STATUS_OPTIONS"
              :key="s"
              :label="text(`suggestionsMgmt.status.${s}`, s)"
              :value="s"
            />
          </el-select>
        </div>

        <div class="filter-item">
          <div class="filter-label">{{ text('suggestionsMgmt.filterPriorityLabel', '優先級') }}</div>
          <el-select
            v-model="prio"
            clearable
            class="w-100"
            :placeholder="text('suggestionsMgmt.filterPriority', '選擇優先級')"
          >
            <el-option label="P1" value="P1" />
            <el-option label="P2" value="P2" />
            <el-option label="P3" value="P3" />
          </el-select>
        </div>

        <div class="filter-item keyword-item">
          <div class="filter-label">{{ text('suggestionsMgmt.filterKeywordLabel', '關鍵字') }}</div>
          <el-input
            v-model.trim="kw"
            clearable
            class="w-100"
            :placeholder="text('suggestionsMgmt.filterKeywordPlaceholder', '搜尋標題、內容或使用者')"
            @keyup.enter="triggerSearch"
            @clear="triggerSearch"
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>
        </div>
      </div>
    </el-card>

    <el-card class="table-card" shadow="never">
      <template #header>
        <div class="section-head">
          <div>
            <div class="section-title">{{ text('suggestionsMgmt.listTitle', '建議列表') }}</div>
            <div class="section-subtitle">
              {{ text('suggestionsMgmt.listSubtitle', '桌機支援表格管理，手機改為卡片式閱讀與操作') }}
            </div>
          </div>

          <div class="head-badges">
            <el-tag effect="plain" round>
              {{ text('suggestionsMgmt.totalTag', '共 {count} 筆', { count: total }) }}
            </el-tag>
            <el-tag v-if="selectedCount" type="primary" effect="plain" round>
              {{ text('suggestionsMgmt.selectedTag', '已選 {count} 筆', { count: selectedCount }) }}
            </el-tag>
          </div>
        </div>
      </template>

      <div class="bulk-bar">
        <div class="bulk-info">
          <el-tag size="small" type="info" effect="plain" round>
            {{ text('suggestionsMgmt.bulkHint', '可批次標記為已檢視或已解決') }}
          </el-tag>
        </div>

        <div class="bulk-actions">
          <el-button
            :disabled="!hasSelection"
            :icon="Finished"
            class="btn"
            @click="bulkStatus('reviewed')"
          >
            {{ text('suggestionsMgmt.btnMarkReviewed', '標記已檢視') }}
          </el-button>

          <el-button
            :disabled="!hasSelection"
            type="success"
            :icon="Check"
            class="btn"
            @click="bulkStatus('resolved')"
          >
            {{ text('suggestionsMgmt.btnMarkResolved', '標記已解決') }}
          </el-button>
        </div>
      </div>

      <el-table
        v-if="!isMobile"
        ref="tableRef"
        :data="rows"
        border
        stripe
        table-layout="auto"
        class="data-table"
        v-loading="loading"
        height="62vh"
        :row-key="row => row.id"
        :empty-text="text('common.noData', '目前沒有資料')"
        @selection-change="onSelectionChange"
      >
        <el-table-column type="selection" width="48" reserve-selection />

        <el-table-column
          prop="title"
          :label="text('suggestionsMgmt.colTitle', '標題')"
          min-width="280"
          show-overflow-tooltip
        >
          <template #default="{ row }">
            <div class="title-cell">
              <div class="title-main">{{ row.title || '—' }}</div>
              <div class="title-sub">
                {{ text('suggestionsMgmt.colCreatedAt', '建立時間') }}：{{ fmt(row.createdAt) }}
              </div>
            </div>
          </template>
        </el-table-column>

        <el-table-column
          prop="priority"
          :label="text('suggestionsMgmt.colPriority', '優先級')"
          width="110"
          align="center"
        >
          <template #default="{ row }">
            <el-tag :type="mapPriority(row.priority).type" round effect="dark" class="pill mini">
              {{ row.priority || 'P2' }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column
          prop="status"
          :label="text('suggestionsMgmt.colStatus', '狀態')"
          width="180"
        >
          <template #default="{ row }">
            <el-select
              v-model="row.status"
              size="small"
              class="inline-select"
              @change="val => updateField(row, 'status', val)"
            >
              <el-option
                v-for="s in STATUS_OPTIONS"
                :key="s"
                :label="text(`suggestionsMgmt.status.${s}`, s)"
                :value="s"
              />
            </el-select>
          </template>
        </el-table-column>

        <el-table-column
          :label="text('suggestionsMgmt.colOwner', '提出者')"
          width="180"
          show-overflow-tooltip
        >
          <template #default="{ row }">
            {{
              row?.owner?.name ||
              row?.creator?.name ||
              row?.owner?.username ||
              row?.creator?.username ||
              '-'
            }}
          </template>
        </el-table-column>

        <el-table-column
          prop="content"
          :label="text('suggestionsMgmt.colContent', '內容')"
          min-width="320"
          show-overflow-tooltip
        />

        <el-table-column
          :label="text('common.actions', '操作')"
          width="220"
          align="right"
          fixed="right"
        >
          <template #default="{ row }">
            <div class="row-actions">
              <el-button size="small" @click="openEdit(row)" :icon="Edit">
                {{ text('common.edit', '編輯') }}
              </el-button>

              <el-popconfirm
                :title="text('suggestionsMgmt.confirmDeleteOne', '確定要刪除這筆建議嗎？')"
                @confirm="remove(row)"
              >
                <template #reference>
                  <el-button size="small" type="danger" plain :icon="Delete">
                    {{ text('common.delete', '刪除') }}
                  </el-button>
                </template>
              </el-popconfirm>
            </div>
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
              <div class="card-main">
                <div class="card-title">{{ row.title || '—' }}</div>
                <div class="card-sub">
                  {{
                    row?.owner?.name ||
                    row?.creator?.name ||
                    row?.owner?.username ||
                    row?.creator?.username ||
                    '-'
                  }}
                  · {{ fmt(row.createdAt) }}
                </div>
              </div>

              <div class="tag-stack">
                <el-tag :type="mapPriority(row.priority).type" effect="dark" class="pill mini">
                  {{ row.priority || 'P2' }}
                </el-tag>
                <el-tag :type="statusTagType(row.status)" effect="plain" class="pill mini">
                  {{ text(`suggestionsMgmt.status.${row.status}`, row.status || '-') }}
                </el-tag>
              </div>
            </div>

            <div class="content-box">
              <div class="content-label">{{ text('suggestionsMgmt.colContent', '內容') }}</div>
              <div class="content-text">{{ row.content || '—' }}</div>
            </div>

            <div class="mobile-field">
              <div class="mobile-field-label">{{ text('suggestionsMgmt.colStatus', '狀態') }}</div>
              <el-select
                v-model="row.status"
                size="small"
                class="w-100"
                @change="val => updateField(row, 'status', val)"
              >
                <el-option
                  v-for="s in STATUS_OPTIONS"
                  :key="s"
                  :label="text(`suggestionsMgmt.status.${s}`, s)"
                  :value="s"
                />
              </el-select>
            </div>

            <div class="card-actions">
              <el-button plain @click="toggleMobileSelection(row)">
                {{ isSelected(row) ? text('suggestionsMgmt.btnUnselect', '取消勾選') : text('suggestionsMgmt.btnSelect', '勾選') }}
              </el-button>
              <el-button @click="openEdit(row)" :icon="Edit">
                {{ text('common.edit', '編輯') }}
              </el-button>
              <el-popconfirm
                :title="text('suggestionsMgmt.confirmDeleteOne', '確定要刪除這筆建議嗎？')"
                @confirm="remove(row)"
              >
                <template #reference>
                  <el-button type="danger" plain :icon="Delete">
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

      <div class="bottom-bar">
        <div class="bottom-bar-left">
          <el-button
            :disabled="!hasSelection"
            :icon="Finished"
            class="btn"
            @click="bulkStatus('reviewed')"
          >
            {{ text('suggestionsMgmt.btnMarkReviewed', '標記已檢視') }}
          </el-button>

          <el-button
            :disabled="!hasSelection"
            type="success"
            :icon="Check"
            class="btn"
            @click="bulkStatus('resolved')"
          >
            {{ text('suggestionsMgmt.btnMarkResolved', '標記已解決') }}
          </el-button>
        </div>

        <div class="bottom-bar-right">
          <el-pagination
            background
            layout="prev, pager, next, sizes, total"
            :total="total"
            :current-page="q.page"
            :page-size="q.pageSize"
            :page-sizes="[10, 20, 50, 100]"
            @current-change="handlePageChange"
            @size-change="handleSizeChange"
          />
        </div>
      </div>
    </el-card>

    <el-dialog
      v-model="dlg.visible"
      :title="text('suggestionsMgmt.dlgEditTitle', '編輯建議')"
      :width="isMobile ? '100%' : '780px'"
      :fullscreen="isMobile"
      :close-on-click-modal="false"
      destroy-on-close
    >
      <div class="dialog-hero">
        <div class="dialog-main">
          <div class="dialog-title">{{ text('suggestionsMgmt.dialogHeroTitle', '更新建議內容') }}</div>
          <div class="dialog-subtitle">
            {{ text('suggestionsMgmt.dialogHeroSubtitle', '可調整標題、優先級、狀態、內容與管理員回覆') }}
          </div>
        </div>

        <div class="dialog-preview">
          <div class="preview-label">{{ text('suggestionsMgmt.preview', '預覽') }}</div>
          <div class="preview-value">{{ dlg.data.title || '—' }}</div>
          <div class="preview-sub">
            {{ dlg.data.priority || 'P2' }} · {{ text(`suggestionsMgmt.status.${dlg.data.status}`, dlg.data.status || 'pending') }}
          </div>
        </div>
      </div>

      <el-form :model="dlg.data" :label-width="isMobile ? 'auto' : '90px'" :label-position="isMobile ? 'top' : 'right'" class="edit-form">
        <el-form-item :label="text('suggestionsMgmt.fieldTitle', '標題')">
          <el-input v-model.trim="dlg.data.title" />
        </el-form-item>

        <div class="edit-grid">
          <el-form-item :label="text('suggestionsMgmt.fieldPriority', '優先級')">
            <el-select v-model="dlg.data.priority" class="w-100">
              <el-option label="P1" value="P1" />
              <el-option label="P2" value="P2" />
              <el-option label="P3" value="P3" />
            </el-select>
          </el-form-item>

          <el-form-item :label="text('suggestionsMgmt.fieldStatus', '狀態')">
            <el-select v-model="dlg.data.status" class="w-100">
              <el-option
                v-for="s in STATUS_OPTIONS"
                :key="s"
                :label="text(`suggestionsMgmt.status.${s}`, s)"
                :value="s"
              />
            </el-select>
          </el-form-item>
        </div>

        <el-form-item :label="text('suggestionsMgmt.fieldContent', '內容')">
          <el-input
            v-model.trim="dlg.data.content"
            type="textarea"
            :rows="6"
            resize="vertical"
          />
        </el-form-item>

        <el-form-item :label="text('suggestionsMgmt.fieldReply', '管理員回覆')">
          <el-input
            v-model.trim="dlg.data.adminReply"
            type="textarea"
            :rows="4"
            resize="vertical"
          />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button class="btn" @click="dlg.visible = false">
          {{ text('common.cancel', '取消') }}
        </el-button>
        <el-button
          class="btn"
          type="primary"
          :icon="Check"
          :loading="dlg.loading"
          @click="saveEdit"
        >
          {{ text('common.save', '儲存') }}
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onBeforeUnmount, nextTick, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { ElMessage } from 'element-plus'
import {
  Refresh,
  Search,
  Edit,
  Delete,
  Check,
  Finished
} from '@element-plus/icons-vue'

const { t, te } = useI18n()

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

const STATUS_OPTIONS = ['pending', 'reviewed', 'resolved']

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

const tableRef = ref(null)
const rows = ref([])
const total = ref(0)
const loading = ref(false)
const kw = ref('')
const status = ref('')
const prio = ref('')
const sel = ref([])
const activeFetchController = ref(null)

const q = reactive({
  page: 1,
  pageSize: 20
})

const dlg = reactive({
  visible: false,
  loading: false,
  data: createEmptyDialogData()
})

const selectedCount = computed(() => sel.value.length)
const hasSelection = computed(() => selectedCount.value > 0)

const pendingCount = computed(() =>
  rows.value.filter(x => String(x?.status || '').toLowerCase() === 'pending').length
)
const reviewedCount = computed(() =>
  rows.value.filter(x => String(x?.status || '').toLowerCase() === 'reviewed').length
)
const resolvedCount = computed(() =>
  rows.value.filter(x => String(x?.status || '').toLowerCase() === 'resolved').length
)

function createEmptyDialogData () {
  return {
    id: null,
    title: '',
    priority: 'P2',
    status: 'pending',
    content: '',
    adminReply: ''
  }
}

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
  if (key === 'P1') return { type: 'danger' }
  if (key === 'P2') return { type: 'warning' }
  return { type: 'info' }
}

function statusTagType (s) {
  const L = String(s || 'pending').toLowerCase()
  if (L === 'resolved') return 'success'
  if (L === 'reviewed') return 'warning'
  return 'info'
}

function onSelectionChange (val) {
  sel.value = Array.isArray(val) ? val : []
}

function isSelected(row) {
  return sel.value.some(item => String(item?.id) === String(row?.id))
}

function toggleMobileSelection(row) {
  if (!row?.id) return
  const exists = isSelected(row)
  if (exists) {
    sel.value = sel.value.filter(item => String(item?.id) !== String(row?.id))
  } else {
    sel.value = [...sel.value, row]
  }
}

function normalizeRow (row = {}) {
  return {
    ...row,
    id: row?.id ?? null,
    title: row?.title ?? '',
    priority: row?.priority ?? 'P2',
    status: row?.status ?? 'pending',
    content: row?.content ?? '',
    adminReply: row?.adminReply ?? '',
    createdAt: row?.createdAt ?? row?.created_at ?? null,
    owner: row?.owner ?? null,
    creator: row?.creator ?? null
  }
}

function parseListResponse (json) {
  if (json?.data && typeof json.data === 'object' && Array.isArray(json.data.rows)) {
    return {
      list: json.data.rows,
      count: Number(json.data.count ?? json.data.total ?? json.total ?? json.count ?? json.data.rows.length) || 0
    }
  }

  if (Array.isArray(json?.rows)) {
    return {
      list: json.rows,
      count: Number(json.total ?? json.count ?? json.rows.length) || 0
    }
  }

  if (Array.isArray(json?.data)) {
    return {
      list: json.data,
      count: Number(json.total ?? json.count ?? json.data.length) || 0
    }
  }

  if (Array.isArray(json)) {
    return {
      list: json,
      count: json.length
    }
  }

  return { list: [], count: 0 }
}

function clearSelectionState () {
  sel.value = []

  nextTick(() => {
    if (tableRef.value?.clearSelection) {
      tableRef.value.clearSelection()
    }
  })
}

async function safeJson (res) {
  return await res.json().catch(() => ({}))
}

async function fetchData () {
  if (activeFetchController.value) {
    activeFetchController.value.abort()
  }

  const controller = new AbortController()
  activeFetchController.value = controller
  loading.value = true

  try {
    const params = new URLSearchParams({
      page: String(q.page),
      pageSize: String(q.pageSize),
      keyword: kw.value || '',
      user: kw.value || ''
    })

    if (status.value) params.set('status', status.value)
    if (prio.value) params.set('priority', prio.value)

    const res = await fetch(`${apiBase}/suggestions?${params.toString()}`, {
      headers: authHeaders(),
      signal: controller.signal
    })

    if (handleAuth(res)) return

    const json = await safeJson(res)
    if (!res.ok) {
      throw new Error(json?.message || text('suggestionsMgmt.message.loadFailed', '載入失敗'))
    }

    const { list, count } = parseListResponse(json)
    rows.value = Array.isArray(list) ? list.map(normalizeRow) : []
    total.value = count
    clearSelectionState()
  } catch (e) {
    if (e?.name === 'AbortError') return

    console.error(e)
    const msg = String(e?.message || '')
    ElMessage.error(
      msg.includes('Failed to fetch')
        ? text('suggestionsMgmt.message.networkError', '網路連線失敗')
        : (msg || text('suggestionsMgmt.message.loadFailed', '載入失敗'))
    )
  } finally {
    if (activeFetchController.value === controller) {
      activeFetchController.value = null
    }
    loading.value = false
  }
}

async function updateField (row, field, value) {
  const oldValue = row?.[field]

  try {
    const payload = { [field]: value }

    const res = await fetch(`${apiBase}/suggestions/${row.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders()
      },
      body: JSON.stringify(payload)
    })

    if (handleAuth(res)) return

    const json = await safeJson(res)
    if (!res.ok || json?.success === false) {
      throw new Error(json?.message || text('suggestionsMgmt.message.updateFailed', '更新失敗'))
    }

    row[field] = value
    ElMessage.success(text('suggestionsMgmt.message.updateSuccess', '更新成功'))
  } catch (e) {
    console.error(e)
    row[field] = oldValue
    ElMessage.error(text('suggestionsMgmt.message.updateFailed', '更新失敗'))
  }
}

function openEdit (row) {
  dlg.visible = true
  dlg.data = {
    id: row?.id ?? null,
    title: row?.title ?? '',
    priority: row?.priority ?? 'P2',
    status: row?.status ?? 'pending',
    content: row?.content ?? '',
    adminReply: row?.adminReply ?? ''
  }
}

async function saveEdit () {
  if (!dlg.data.id) {
    ElMessage.error(text('suggestionsMgmt.message.saveFailed', '儲存失敗'))
    return
  }

  dlg.loading = true

  try {
    const payload = {
      title: dlg.data.title,
      content: dlg.data.content,
      priority: dlg.data.priority,
      status: dlg.data.status,
      adminReply: dlg.data.adminReply || ''
    }

    const res = await fetch(`${apiBase}/suggestions/${dlg.data.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders()
      },
      body: JSON.stringify(payload)
    })

    if (handleAuth(res)) return

    const json = await safeJson(res)
    if (!res.ok || json?.success === false) {
      throw new Error(json?.message || text('suggestionsMgmt.message.saveFailed', '儲存失敗'))
    }

    ElMessage.success(text('suggestionsMgmt.message.saveSuccess', '儲存成功'))
    dlg.visible = false
    dlg.data = createEmptyDialogData()
    fetchData()
  } catch (e) {
    console.error(e)
    ElMessage.error(e?.message || text('suggestionsMgmt.message.saveFailed', '儲存失敗'))
  } finally {
    dlg.loading = false
  }
}

async function remove (row) {
  try {
    const res = await fetch(`${apiBase}/suggestions/${row.id}`, {
      method: 'DELETE',
      headers: authHeaders()
    })

    if (handleAuth(res)) return

    const json = await safeJson(res)
    if (!res.ok || json?.success === false) {
      throw new Error(json?.message || text('suggestionsMgmt.message.deleteFailed', '刪除失敗'))
    }

    ElMessage.success(text('suggestionsMgmt.message.deleteSuccess', '刪除成功'))

    if (rows.value.length === 1 && q.page > 1) {
      q.page -= 1
    }

    fetchData()
  } catch (e) {
    console.error(e)
    ElMessage.error(e?.message || text('suggestionsMgmt.message.deleteFailed', '刪除失敗'))
  }
}

async function bulkStatus (nextStatus) {
  try {
    const ids = sel.value.map(item => item?.id).filter(Boolean)
    if (!ids.length) return

    if (!STATUS_OPTIONS.includes(nextStatus)) {
      ElMessage.error(text('suggestionsMgmt.message.invalidStatus', '無效狀態'))
      return
    }

    const res = await fetch(`${apiBase}/suggestions/bulk`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders()
      },
      body: JSON.stringify({
        ids,
        status: nextStatus
      })
    })

    if (handleAuth(res)) return

    const json = await safeJson(res)
    if (!res.ok || json?.success === false) {
      throw new Error(json?.message || text('suggestionsMgmt.message.bulkFailed', '批次更新失敗'))
    }

    ElMessage.success(json?.message || text('suggestionsMgmt.message.bulkSuccess', '批次更新成功'))
    fetchData()
  } catch (e) {
    console.error(e)
    ElMessage.error(e?.message || text('suggestionsMgmt.message.bulkFailed', '批次更新失敗'))
  }
}

function handlePageChange (page) {
  q.page = page
  fetchData()
}

function handleSizeChange (size) {
  q.pageSize = size
  q.page = 1
  fetchData()
}

function triggerSearch () {
  q.page = 1
  fetchData()
}

function debounce (fn, ms = 350) {
  let tid = null
  return (...args) => {
    clearTimeout(tid)
    tid = setTimeout(() => fn(...args), ms)
  }
}

const debouncedKeywordSearch = debounce(() => {
  q.page = 1
  fetchData()
}, 350)

watch(() => kw.value, () => {
  debouncedKeywordSearch()
})

watch(() => status.value, () => {
  q.page = 1
  fetchData()
})

watch(() => prio.value, () => {
  q.page = 1
  fetchData()
})

onMounted(() => {
  cleanupMql = setupMql()
  fetchData()
})

onBeforeUnmount(() => {
  if (cleanupMql) cleanupMql()
  if (activeFetchController.value) {
    activeFetchController.value.abort()
  }
})
</script>

<style scoped>
.suggestions-mgmt-page-vivid {
  --smg-border: var(--el-border-color-light);
  --smg-border-soft: var(--el-border-color-lighter);
  --smg-card-bg:
    radial-gradient(circle at top right, color-mix(in srgb, var(--el-color-primary) 12%, transparent) 0%, transparent 34%),
    linear-gradient(180deg, color-mix(in srgb, var(--el-bg-color) 94%, var(--el-color-primary-light-9) 6%) 0%, var(--el-bg-color) 100%);
  --smg-soft-bg: color-mix(in srgb, var(--el-fill-color-light) 88%, white 12%);
  --smg-shadow: 0 18px 48px rgba(0, 0, 0, 0.06);

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
.table-card {
  border: 1px solid var(--smg-border);
  border-radius: 22px;
  background: var(--smg-card-bg);
  box-shadow: var(--smg-shadow);
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
  border: 1px solid color-mix(in srgb, var(--el-color-primary) 24%, var(--smg-border));
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
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 12px;
}

.stat-card {
  border-radius: 18px;
  padding: 14px 14px 12px;
  border: 1px solid var(--smg-border-soft);
  background: var(--smg-soft-bg);
}

.stat-primary {
  background: linear-gradient(135deg, var(--el-color-primary-light-8), var(--el-color-primary-light-9));
  border-color: color-mix(in srgb, var(--el-color-primary) 32%, var(--smg-border-soft));
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

.head-badges {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.filter-grid {
  display: grid;
  grid-template-columns: 220px 180px minmax(280px, 1fr);
  gap: 14px;
}

.filter-label {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  margin-bottom: 6px;
  font-weight: 700;
}

.bulk-bar,
.bottom-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.bulk-bar {
  margin-bottom: 12px;
}

.bulk-actions,
.bottom-bar-left,
.bottom-bar-right {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
}

.data-table :deep(.el-table__header th) {
  background: var(--smg-soft-bg);
  font-weight: 700;
}

.data-table :deep(.el-table__row td) {
  vertical-align: middle;
}

.inline-select {
  width: 100%;
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

.row-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  flex-wrap: wrap;
}

.mobile-list {
  display: grid;
  gap: 12px;
}

.suggestion-card {
  border: 1px solid var(--smg-border-soft);
  border-radius: 18px;
  background: linear-gradient(180deg, color-mix(in srgb, var(--el-bg-color) 98%, white 2%) 0%, color-mix(in srgb, var(--el-fill-color-light) 72%, var(--el-bg-color) 28%) 100%);
  padding: 14px;
}

.card-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.card-title {
  font-size: 16px;
  font-weight: 900;
  line-height: 1.35;
}

.card-sub {
  margin-top: 4px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.tag-stack {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 6px;
}

.content-box {
  margin-top: 12px;
  padding: 12px 14px;
  border-radius: 16px;
  border: 1px solid var(--smg-border-soft);
  background: var(--smg-soft-bg);
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

.mobile-field {
  margin-top: 12px;
}

.mobile-field-label {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  margin-bottom: 6px;
  font-weight: 700;
}

.card-actions {
  margin-top: 12px;
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.dialog-hero {
  display: grid;
  grid-template-columns: minmax(0, 1.3fr) minmax(200px, 0.9fr);
  gap: 12px;
  margin-bottom: 14px;
}

.dialog-main,
.dialog-preview {
  padding: 14px 16px;
  border-radius: 18px;
  border: 1px solid var(--smg-border-soft);
  background: linear-gradient(180deg, var(--smg-soft-bg) 0%, color-mix(in srgb, var(--el-bg-color) 96%, white 4%) 100%);
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
  word-break: break-word;
}

.preview-sub {
  margin-top: 6px;
  font-size: 12px;
  color: var(--el-color-primary);
  font-weight: 700;
}

.edit-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0 16px;
}

@media (max-width: 1180px) {
  .stat-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .filter-grid {
    grid-template-columns: 1fr 1fr;
  }

  .keyword-item {
    grid-column: span 2;
  }
}

@media (max-width: 980px) {
  .dialog-hero,
  .edit-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .suggestions-mgmt-page-vivid {
    padding: 12px;
    gap: 12px;
  }

  .hero-card {
    padding: 16px;
  }

  .hero-main,
  .bulk-bar,
  .bottom-bar {
    flex-direction: column;
    align-items: stretch;
  }

  .hero-right,
  .bulk-actions,
  .bottom-bar-left,
  .bottom-bar-right {
    justify-content: flex-start;
  }
}

@media (max-width: 640px) {
  .hero-title {
    font-size: 24px;
  }

  .stat-grid,
  .filter-grid {
    grid-template-columns: 1fr;
  }

  .hero-right :deep(.el-button),
  .bulk-actions :deep(.el-button),
  .card-actions :deep(.el-button),
  .bottom-bar-left :deep(.el-button) {
    flex: 1 1 100%;
    min-width: 0;
  }

  .card-top {
    flex-direction: column;
  }

  .tag-stack {
    align-items: flex-start;
  }
}
</style>
