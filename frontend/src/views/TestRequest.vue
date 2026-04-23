<template>
  <div class="page test-request-page-vivid">
    <section class="hero-card">
      <div class="hero-main">
        <div class="hero-left">
          <div class="hero-icon-wrap">
            <div class="hero-icon">📋</div>
          </div>

          <div class="hero-copy">
            <div class="hero-eyebrow">{{ text('testRequests.eyebrow', 'Test Request Management') }}</div>
            <h2 class="hero-title">{{ text('testRequests.title', '測試需求單') }}</h2>
            <div class="hero-subtitle">
              {{ text('testRequests.subtitle', '管理測試需求、安排優先級、掌握進度與負責人分配') }}
            </div>
          </div>
        </div>

        <div class="hero-right">
          <el-button class="btn" :icon="Refresh" @click="reloadAll" :loading="loading">
            {{ text('testRequests.actions.refresh', '重新整理') }}
          </el-button>
          <el-button type="primary" class="btn" :icon="Plus" @click="openCreateDialog">
            {{ text('testRequests.actions.create', '新增') }}
          </el-button>
        </div>
      </div>

      <div class="stat-grid">
        <div class="stat-card total">
          <div class="stat-label">{{ text('testRequests.summary.total', '全部需求') }}</div>
          <div class="stat-value">{{ stats.total }}</div>
        </div>
        <div class="stat-card pending">
          <div class="stat-label">{{ text('testRequests.summary.pending', '待處理') }}</div>
          <div class="stat-value">{{ stats.pending }}</div>
        </div>
        <div class="stat-card in-progress">
          <div class="stat-label">{{ text('testRequests.summary.inProgress', '進行中') }}</div>
          <div class="stat-value">{{ stats.inProgress }}</div>
        </div>
        <div class="stat-card done">
          <div class="stat-label">{{ text('testRequests.summary.completed', '已完成') }}</div>
          <div class="stat-value">{{ stats.completed }}</div>
        </div>
      </div>
    </section>

    <el-card shadow="never" class="filter-card">
      <template #header>
        <div class="section-head">
          <div>
            <div class="section-title">{{ text('testRequests.filterTitle', '搜尋與篩選') }}</div>
            <div class="section-subtitle">
              {{ text('testRequests.filterSubtitle', '可依關鍵字、狀態與日期區間快速縮小需求範圍') }}
            </div>
          </div>
        </div>
      </template>

      <div class="filter-grid">
        <div class="filter-item keyword-item">
          <div class="filter-label">{{ text('testRequests.filters.keywordLabel', '關鍵字') }}</div>
          <el-input
            v-model="filters.keyword"
            :placeholder="text('testRequests.filters.keywordPlaceholder', '搜尋需求標題、產品或備註')"
            clearable
            @keyup.enter="applyFilters"
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>
        </div>

        <div class="filter-item">
          <div class="filter-label">{{ text('testRequests.filters.statusLabel', '狀態') }}</div>
          <el-select
            v-model="filters.status"
            :placeholder="text('testRequests.filters.statusPlaceholder', '選擇狀態')"
            clearable
            class="w-100"
          >
            <el-option
              v-for="item in statusOptions"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </el-select>
        </div>

        <div class="filter-item date-item">
          <div class="filter-label">{{ text('testRequests.filters.dateLabel', '日期區間') }}</div>
          <el-date-picker
            v-model="dateRange"
            type="daterange"
            :range-separator="text('testRequests.dialog.dateRangeSeparator', '至')"
            :start-placeholder="text('testRequests.dialog.dateStartPlaceholder', '開始日期')"
            :end-placeholder="text('testRequests.dialog.dateEndPlaceholder', '結束日期')"
            value-format="YYYY-MM-DD"
            clearable
            class="w-100"
          />
        </div>
      </div>

      <div class="filter-actions">
        <el-button type="primary" class="btn" @click="applyFilters">
          {{ text('testRequests.actions.applyFilters', '套用篩選') }}
        </el-button>
        <el-button class="btn" @click="resetFilters">
          {{ text('testRequests.actions.clearFilters', '清除篩選') }}
        </el-button>
      </div>
    </el-card>

    <el-card shadow="never" class="table-card">
      <template #header>
        <div class="section-head">
          <div>
            <div class="section-title">{{ text('testRequests.listTitle', '需求列表') }}</div>
            <div class="section-subtitle">
              {{ text('testRequests.listSubtitle', '桌機顯示表格，手機自動切換成卡片式閱讀') }}
            </div>
          </div>

          <el-tag effect="plain" round>
            {{ text('testRequests.footer.total', '共 {count} 筆', { count: total }) }}
          </el-tag>
        </div>
      </template>

      <el-table
        v-if="!isMobile"
        :data="requests"
        border
        stripe
        v-loading="loading"
        :size="tableSize"
        :row-key="row => row.id || row.requestNo"
        :empty-text="text('common.noData', '目前沒有資料')"
        class="data-table"
        height="62vh"
      >
        <el-table-column
          prop="requestNo"
          :label="text('testRequests.columns.requestNo', '需求單號')"
          width="150"
          show-overflow-tooltip
        />
        <el-table-column
          prop="title"
          :label="text('testRequests.columns.title', '標題')"
          min-width="220"
          show-overflow-tooltip
        />
        <el-table-column
          prop="productName"
          :label="text('testRequests.columns.productName', '產品名稱')"
          min-width="170"
          show-overflow-tooltip
        />
        <el-table-column
          prop="category"
          :label="text('testRequests.columns.category', '類別')"
          width="120"
        >
          <template #default="{ row }">
            <el-tag size="small" effect="plain" class="pill mini">
              {{ categoryLabel(row.category) }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column
          prop="testItemCount"
          :label="text('testRequests.columns.testItemCount', '測試項目數')"
          width="150"
          align="center"
        />
        <el-table-column
          prop="sampleQty"
          :label="text('testRequests.columns.sampleQty', '樣品數')"
          width="110"
          align="center"
        />
        <el-table-column
          prop="priority"
          :label="text('testRequests.columns.priority', '優先級')"
          width="110"
        >
          <template #default="{ row }">
            <el-tag size="small" :type="priorityTagType(row.priority)" effect="dark" class="pill mini">
              {{ priorityLabel(row.priority) }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column
          prop="expectedStartDate"
          :label="text('testRequests.columns.expectedStart', '預計開始')"
          width="140"
        >
          <template #default="{ row }">{{ fmtDate(row.expectedStartDate) }}</template>
        </el-table-column>
        <el-table-column
          prop="expectedEndDate"
          :label="text('testRequests.columns.expectedEnd', '預計結束')"
          width="140"
        >
          <template #default="{ row }">{{ fmtDate(row.expectedEndDate) }}</template>
        </el-table-column>

        <el-table-column
          prop="status"
          :label="text('testRequests.columns.status', '狀態')"
          width="120"
        >
          <template #default="{ row }">
            <el-tag size="small" :type="statusTagType(row.status)" effect="plain" class="pill mini">
              {{ statusLabel(row.status) }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column
          prop="assigneeName"
          :label="text('testRequests.columns.assignee', '負責人')"
          width="140"
          show-overflow-tooltip
        >
          <template #default="{ row }">
            {{ row.assigneeName || row.assignee?.name || row.assignee?.username || '—' }}
          </template>
        </el-table-column>

        <el-table-column
          prop="createdByName"
          :label="text('testRequests.columns.createdBy', '建立者')"
          width="140"
          show-overflow-tooltip
        >
          <template #default="{ row }">
            {{ row.createdByName || row.creator?.name || row.creator?.username || '—' }}
          </template>
        </el-table-column>

        <el-table-column
          prop="createdAt"
          :label="text('testRequests.columns.createdAt', '建立時間')"
          width="170"
          show-overflow-tooltip
        >
          <template #default="{ row }">{{ fmtDateTime(row.createdAt) }}</template>
        </el-table-column>

        <el-table-column
          :label="text('testRequests.columns.actions', '操作')"
          width="150"
          fixed="right"
        >
          <template #default="{ row }">
            <div class="row-actions">
              <el-button link type="primary" :icon="EditPen" @click="openEditDialog(row)">
                {{ text('testRequests.actions.edit', '編輯') }}
              </el-button>
              <el-button link type="danger" :icon="Delete" @click="confirmDelete(row)">
                {{ text('testRequests.actions.delete', '刪除') }}
              </el-button>
            </div>
          </template>
        </el-table-column>
      </el-table>

      <div v-else class="mobile-list" v-loading="loading">
        <template v-if="requests.length">
          <article
            v-for="row in requests"
            :key="row.id || row.requestNo"
            class="request-card"
          >
            <div class="card-top">
              <div class="card-main">
                <div class="card-title">{{ row.title || '—' }}</div>
                <div class="card-sub">
                  {{ row.requestNo || '—' }} · {{ row.productName || '—' }}
                </div>
              </div>

              <div class="tag-stack">
                <el-tag size="small" :type="priorityTagType(row.priority)" effect="dark" class="pill mini">
                  {{ priorityLabel(row.priority) }}
                </el-tag>
                <el-tag size="small" :type="statusTagType(row.status)" effect="plain" class="pill mini">
                  {{ statusLabel(row.status) }}
                </el-tag>
              </div>
            </div>

            <div class="meta-grid">
              <div class="meta-box">
                <div class="meta-label">{{ text('testRequests.columns.category', '類別') }}</div>
                <div class="meta-value">{{ categoryLabel(row.category) }}</div>
              </div>

              <div class="meta-box">
                <div class="meta-label">{{ text('testRequests.columns.testItemCount', '測試項目數') }}</div>
                <div class="meta-value">{{ row.testItemCount ?? '—' }}</div>
              </div>

              <div class="meta-box">
                <div class="meta-label">{{ text('testRequests.columns.sampleQty', '樣品數') }}</div>
                <div class="meta-value">{{ row.sampleQty ?? '—' }}</div>
              </div>

              <div class="meta-box">
                <div class="meta-label">{{ text('testRequests.columns.assignee', '負責人') }}</div>
                <div class="meta-value">{{ row.assigneeName || row.assignee?.name || row.assignee?.username || '—' }}</div>
              </div>

              <div class="meta-box">
                <div class="meta-label">{{ text('testRequests.columns.expectedStart', '預計開始') }}</div>
                <div class="meta-value">{{ fmtDate(row.expectedStartDate) }}</div>
              </div>

              <div class="meta-box">
                <div class="meta-label">{{ text('testRequests.columns.expectedEnd', '預計結束') }}</div>
                <div class="meta-value">{{ fmtDate(row.expectedEndDate) }}</div>
              </div>

              <div class="meta-box">
                <div class="meta-label">{{ text('testRequests.columns.createdBy', '建立者') }}</div>
                <div class="meta-value">{{ row.createdByName || row.creator?.name || row.creator?.username || '—' }}</div>
              </div>

              <div class="meta-box">
                <div class="meta-label">{{ text('testRequests.columns.createdAt', '建立時間') }}</div>
                <div class="meta-value">{{ fmtDateTime(row.createdAt) }}</div>
              </div>
            </div>

            <div class="remark-box" v-if="row.remark">
              <div class="remark-label">{{ text('testRequests.dialog.fields.remark', '備註') }}</div>
              <div class="remark-text">{{ row.remark }}</div>
            </div>

            <div class="card-actions">
              <el-button plain :icon="EditPen" @click="openEditDialog(row)">
                {{ text('testRequests.actions.edit', '編輯') }}
              </el-button>
              <el-button type="danger" plain :icon="Delete" @click="confirmDelete(row)">
                {{ text('testRequests.actions.delete', '刪除') }}
              </el-button>
            </div>
          </article>
        </template>

        <el-empty
          v-else
          :description="text('common.noData', '目前沒有資料')"
        />
      </div>

      <div class="table-bottom">
        <div class="table-footer">
          {{ text('testRequests.footer.total', '共 {count} 筆', { count: total }) }}
        </div>

        <el-pagination
          background
          layout="prev, pager, next, sizes, total"
          :total="total"
          :current-page="q.page"
          :page-size="q.pageSize"
          :page-sizes="[10, 20, 50, 100]"
          @current-change="(n) => { q.page = n; fetchRequests() }"
          @size-change="(s) => { q.pageSize = s; q.page = 1; fetchRequests() }"
        />
      </div>
    </el-card>

    <el-dialog
      v-model="dialogVisible"
      :title="editingId ? text('testRequests.dialog.editTitle', '編輯測試需求單') : text('testRequests.dialog.createTitle', '新增測試需求單')"
      :width="isMobile ? '100%' : '860px'"
      :fullscreen="isMobile"
      destroy-on-close
      :close-on-click-modal="false"
    >
      <div class="dialog-hero">
        <div class="dialog-main">
          <div class="dialog-title">
            {{ editingId ? text('testRequests.dialogHeroEditTitle', '更新需求資料') : text('testRequests.dialogHeroCreateTitle', '建立新的測試需求') }}
          </div>
          <div class="dialog-subtitle">
            {{ text('testRequests.dialogHeroSubtitle', '可設定產品、測試類別、優先級、時程與負責人資訊') }}
          </div>
        </div>

        <div class="dialog-preview">
          <div class="preview-label">{{ text('testRequests.preview', '預覽') }}</div>
          <div class="preview-value">{{ form.title || '—' }}</div>
          <div class="preview-sub">{{ form.productName || '—' }} · {{ statusLabel(form.status) }}</div>
        </div>
      </div>

      <el-form
        ref="formRef"
        :model="form"
        :rules="rules"
        :label-width="isMobile ? 'auto' : '120px'"
        :label-position="isMobile ? 'top' : 'right'"
      >
        <div class="form-grid">
          <el-form-item :label="text('testRequests.dialog.fields.title', '標題')" prop="title">
            <el-input
              v-model.trim="form.title"
              :placeholder="text('testRequests.dialog.placeholders.title', '請輸入標題')"
            />
          </el-form-item>

          <el-form-item :label="text('testRequests.dialog.fields.productName', '產品名稱')" prop="productName">
            <el-input
              v-model.trim="form.productName"
              :placeholder="text('testRequests.dialog.placeholders.productName', '請輸入產品名稱')"
            />
          </el-form-item>

          <el-form-item :label="text('testRequests.dialog.fields.category', '測試類別')" prop="category">
            <el-select v-model="form.category" class="w-100" :placeholder="text('testRequests.dialog.categoryPlaceholder', '請選擇類別')">
              <el-option
                v-for="item in categoryOptions"
                :key="item.value"
                :label="item.label"
                :value="item.value"
              />
            </el-select>
          </el-form-item>

          <el-form-item :label="text('testRequests.dialog.fields.status', '狀態')" prop="status">
            <el-select v-model="form.status" class="w-100" :placeholder="text('testRequests.dialog.statusPlaceholder', '請選擇狀態')">
              <el-option
                v-for="item in statusOptions"
                :key="item.value"
                :label="item.label"
                :value="item.value"
              />
            </el-select>
          </el-form-item>

          <el-form-item :label="text('testRequests.dialog.fields.testItemCount', '測試項目數')" prop="testItemCount">
            <el-input-number v-model="form.testItemCount" :min="1" :max="9999" />
          </el-form-item>

          <el-form-item :label="text('testRequests.dialog.fields.sampleQty', '樣品數')" prop="sampleQty">
            <el-input-number v-model="form.sampleQty" :min="1" :max="999" />
          </el-form-item>

          <el-form-item :label="text('testRequests.dialog.fields.priority', '優先級')" class="span-2" prop="priority">
            <el-radio-group v-model="form.priority">
              <el-radio-button label="low">{{ text('testRequests.priority.low', '低') }}</el-radio-button>
              <el-radio-button label="medium">{{ text('testRequests.priority.medium', '中') }}</el-radio-button>
              <el-radio-button label="high">{{ text('testRequests.priority.high', '高') }}</el-radio-button>
            </el-radio-group>
          </el-form-item>

          <el-form-item :label="text('testRequests.dialog.fields.dateRange', '日期區間')" class="span-2">
            <el-date-picker
              v-model="formDateRange"
              type="daterange"
              :range-separator="text('testRequests.dialog.dateRangeSeparator', '至')"
              :start-placeholder="text('testRequests.dialog.dateStartPlaceholder', '開始日期')"
              :end-placeholder="text('testRequests.dialog.dateEndPlaceholder', '結束日期')"
              value-format="YYYY-MM-DD"
              clearable
              class="w-100"
            />
          </el-form-item>

          <el-form-item v-if="canAssign" :label="text('testRequests.dialog.fields.assignee', '負責人')">
            <el-select
              v-model="form.assignedTo"
              :placeholder="text('testRequests.dialog.assigneePlaceholder', '請選擇負責人')"
              clearable
              filterable
              class="w-100"
            >
              <el-option
                v-for="u in assigneeOptions"
                :key="u.value"
                :label="u.label"
                :value="u.value"
              />
            </el-select>
          </el-form-item>

          <el-form-item :label="text('testRequests.dialog.fields.remark', '備註')" prop="remark" class="span-2">
            <el-input
              v-model.trim="form.remark"
              type="textarea"
              :rows="4"
              :placeholder="text('testRequests.dialog.placeholders.remark', '請輸入備註')"
            />
          </el-form-item>
        </div>
      </el-form>

      <template #footer>
        <el-button class="btn" @click="dialogVisible = false">
          {{ text('testRequests.actions.cancel', '取消') }}
        </el-button>
        <el-button type="primary" class="btn" @click="submitForm" :loading="saving">
          {{ text('testRequests.actions.save', '儲存') }}
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onBeforeUnmount } from 'vue'
import { useI18n } from 'vue-i18n'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Refresh, EditPen, Delete, Search } from '@element-plus/icons-vue'
import getApiBase from '@/utils/apiBase'

const { t, te } = useI18n()
const apiBase = getApiBase()

function text (key, fallback, params) {
  if (te(key)) return t(key, params)
  if (!params) return fallback
  return String(fallback).replace(/\{(\w+)\}/g, (_, k) => String(params?.[k] ?? ''))
}

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

/* ---------------- basic state ---------------- */
const loading = ref(false)
const saving = ref(false)
const tableSize = ref('default')

const requests = ref([])
const total = ref(0)

const stats = reactive({
  total: 0,
  pending: 0,
  inProgress: 0,
  completed: 0
})

/* ---------------- filters + pagination ---------------- */
const q = reactive({ page: 1, pageSize: 20 })

const filters = reactive({
  keyword: '',
  status: ''
})

const dateRange = ref([])

/* ---------------- dialog/form ---------------- */
const dialogVisible = ref(false)
const editingId = ref(null)
const formRef = ref(null)

const form = reactive({
  requestNo: '',
  title: '',
  productName: '',
  category: 'HW',
  testItemCount: 1,
  sampleQty: 1,
  priority: 'medium',
  expectedStartDate: '',
  expectedEndDate: '',
  status: 'pending',
  remark: '',
  assignedTo: null
})

const formDateRange = ref([])

/* ---------------- current user / assign ---------------- */
const currentUser = ref(null)
const assigneeOptions = ref([])

function getCurrentUser () {
  try {
    return (
      JSON.parse(localStorage.getItem('user') || 'null') ||
      JSON.parse(sessionStorage.getItem('user') || 'null')
    )
  } catch {
    return null
  }
}

const canAssign = computed(() => {
  const role = String(currentUser.value?.role || '').toLowerCase()
  return role === 'admin'
})

/* ---------------- options ---------------- */
const categoryOptions = computed(() => [
  { value: 'HW', label: text('testRequests.category.HW', 'HW') },
  { value: 'RELI', label: text('testRequests.category.RELI', 'RELI') },
  { value: 'STAB', label: text('testRequests.category.STAB', 'STAB') },
  { value: 'PWR', label: text('testRequests.category.PWR', 'PWR') },
  { value: 'THERM', label: text('testRequests.category.THERM', 'THERM') },
  { value: 'ESD', label: text('testRequests.category.ESD', 'ESD') },
  { value: 'MECH', label: text('testRequests.category.MECH', 'MECH') },
  { value: 'OTHER', label: text('testRequests.category.OTHER', 'OTHER') }
])

const statusOptions = computed(() => [
  { value: 'pending', label: text('testRequests.status.pending', '待處理') },
  { value: 'in_progress', label: text('testRequests.status.in_progress', '進行中') },
  { value: 'completed', label: text('testRequests.status.completed', '已完成') },
  { value: 'cancelled', label: text('testRequests.status.cancelled', '已取消') }
])

/* ---------------- validation ---------------- */
const rules = computed(() => ({
  title: [{ required: true, message: text('testRequests.validation.titleRequired', '請輸入標題'), trigger: 'blur' }],
  productName: [{ required: true, message: text('testRequests.validation.productNameRequired', '請輸入產品名稱'), trigger: 'blur' }],
  category: [{ required: true, message: text('testRequests.validation.categoryRequired', '請選擇類別'), trigger: 'change' }],
  testItemCount: [{ required: true, message: text('testRequests.validation.testItemCountRequired', '請輸入測試項目數'), trigger: 'change' }],
  sampleQty: [{ required: true, message: text('testRequests.validation.sampleQtyRequired', '請輸入樣品數'), trigger: 'change' }],
  status: [{ required: true, message: text('testRequests.validation.statusRequired', '請選擇狀態'), trigger: 'change' }]
}))

/* ---------------- helpers ---------------- */
function categoryLabel (value) {
  const v = String(value || '')
  return categoryOptions.value.find(x => x.value === v)?.label || v || '-'
}
function priorityLabel (value) {
  if (value === 'high') return text('testRequests.priority.high', '高')
  if (value === 'low') return text('testRequests.priority.low', '低')
  return text('testRequests.priority.medium', '中')
}
function priorityTagType (value) {
  if (value === 'high') return 'danger'
  if (value === 'low') return 'info'
  return 'warning'
}
function statusLabel (value) {
  return statusOptions.value.find(x => x.value === value)?.label || value || '-'
}
function statusTagType (value) {
  switch (value) {
    case 'pending': return 'warning'
    case 'in_progress': return 'info'
    case 'completed': return 'success'
    case 'cancelled': return 'danger'
    default: return 'info'
  }
}

function fmtDate (v) {
  if (!v) return '—'
  if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}/.test(v)) return v.slice(0, 10)
  const d = new Date(v)
  if (Number.isNaN(d.getTime())) return String(v)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function fmtDateTime (v) {
  if (!v) return '—'
  const d = new Date(v)
  if (Number.isNaN(d.getTime())) return String(v)
  return d.toLocaleString('zh-TW', { hour12: false })
}

/* ---------------- auth helpers ---------------- */
function getToken () {
  return localStorage.getItem('token') || sessionStorage.getItem('token') || ''
}

function authHeaders () {
  const token = getToken()
  return token ? { Authorization: `Bearer ${token}` } : {}
}

function handleAuth (res) {
  if (res.status === 401) {
    localStorage.removeItem('token')
    sessionStorage.removeItem('token')
    localStorage.removeItem('user')
    sessionStorage.removeItem('user')
    ElMessage.warning(text('auth.sessionExpired', '登入逾時，請重新登入'))
    location.href = '/login'
    return true
  }
  return false
}

/* ---------------- response parser ---------------- */
function parseListResponse (json) {
  if (Array.isArray(json?.rows)) {
    return {
      list: json.rows,
      total: Number(json.total ?? json.count ?? json.rows.length) || 0,
      stats: json.stats || null
    }
  }
  if (json?.data && Array.isArray(json.data?.rows)) {
    return {
      list: json.data.rows,
      total: Number(json.data.total ?? json.data.count ?? json.total ?? json.count ?? json.data.rows.length) || 0,
      stats: json.data.stats || json.stats || null
    }
  }
  if (Array.isArray(json)) {
    return { list: json, total: json.length, stats: null }
  }
  if (Array.isArray(json?.data)) {
    return { list: json.data, total: Number(json.total ?? json.count ?? json.data.length) || 0, stats: null }
  }
  return { list: [], total: 0, stats: null }
}

/* ---------------- stats update ---------------- */
function updateStatsFromList (list, totalCount) {
  const arr = Array.isArray(list) ? list : []
  stats.total = Number.isFinite(totalCount) ? totalCount : arr.length
  stats.pending = arr.filter(x => x.status === 'pending').length
  stats.inProgress = arr.filter(x => x.status === 'in_progress').length
  stats.completed = arr.filter(x => x.status === 'completed').length
}

/* ---------------- API calls ---------------- */
async function fetchRequests () {
  loading.value = true
  try {
    const params = new URLSearchParams({
      page: String(q.page),
      pageSize: String(q.pageSize)
    })

    if (filters.keyword) params.set('q', filters.keyword)
    if (filters.status) params.set('status', filters.status)

    if (Array.isArray(dateRange.value) && dateRange.value.length === 2) {
      params.set('startDate', dateRange.value[0])
      params.set('endDate', dateRange.value[1])
    }

    const res = await fetch(`${apiBase}/test-requests?${params.toString()}`, {
      headers: { 'Content-Type': 'application/json', ...authHeaders() }
    })
    if (handleAuth(res)) return

    const json = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(json?.message || `HTTP ${res.status}`)

    const parsed = parseListResponse(json)
    requests.value = parsed.list
    total.value = parsed.total

    if (parsed.stats && typeof parsed.stats === 'object') {
      stats.total = Number(parsed.stats.total ?? parsed.total ?? 0) || 0
      stats.pending = Number(parsed.stats.pending ?? 0) || 0
      stats.inProgress = Number(parsed.stats.inProgress ?? parsed.stats.in_progress ?? 0) || 0
      stats.completed = Number(parsed.stats.completed ?? 0) || 0
    } else {
      updateStatsFromList(parsed.list, parsed.total)
    }
  } catch (err) {
    console.error('❌ fetch test-requests failed:', err)
    ElMessage.error(text('testRequests.messages.fetchFailed', '載入失敗'))
  } finally {
    loading.value = false
  }
}

async function fetchUsers () {
  if (!canAssign.value) return
  try {
    const res = await fetch(`${apiBase}/users`, {
      headers: { 'Content-Type': 'application/json', ...authHeaders() }
    })
    if (handleAuth(res)) return

    const raw = await res.json().catch(() => ({}))

    let list = []
    if (Array.isArray(raw)) list = raw
    else if (Array.isArray(raw?.rows)) list = raw.rows
    else if (Array.isArray(raw?.data)) list = raw.data
    else if (Array.isArray(raw?.data?.rows)) list = raw.data.rows

    assigneeOptions.value = list.map(u => ({
      value: u.id,
      label: u.name || u.username || `#${u.id}`
    }))
  } catch (err) {
    console.error('❌ fetch users failed:', err)
  }
}

/* ---------------- UI actions ---------------- */
function applyFilters () {
  q.page = 1
  fetchRequests()
}

function resetFilters () {
  filters.keyword = ''
  filters.status = ''
  dateRange.value = []
  q.page = 1
  fetchRequests()
}

function reloadAll () {
  fetchRequests()
  fetchUsers()
}

function openCreateDialog () {
  editingId.value = null
  Object.assign(form, {
    requestNo: '',
    title: '',
    productName: '',
    category: 'HW',
    testItemCount: 1,
    sampleQty: 1,
    priority: 'medium',
    expectedStartDate: '',
    expectedEndDate: '',
    status: 'pending',
    remark: '',
    assignedTo: null
  })
  formDateRange.value = []
  dialogVisible.value = true
}

function openEditDialog (row) {
  editingId.value = row.id
  Object.assign(form, {
    requestNo: row.requestNo || '',
    title: row.title || '',
    productName: row.productName || '',
    category: row.category || 'HW',
    testItemCount: row.testItemCount ?? 1,
    sampleQty: row.sampleQty ?? 1,
    priority: row.priority || 'medium',
    expectedStartDate: row.expectedStartDate || '',
    expectedEndDate: row.expectedEndDate || '',
    status: row.status || 'pending',
    remark: row.remark || '',
    assignedTo: row.assignedTo ?? row.assignedToId ?? null
  })

  formDateRange.value =
    form.expectedStartDate && form.expectedEndDate
      ? [form.expectedStartDate, form.expectedEndDate]
      : []

  dialogVisible.value = true
}

async function submitForm () {
  if (!formRef.value) return

  try {
    await formRef.value.validate()

    if (Array.isArray(formDateRange.value) && formDateRange.value.length === 2) {
      form.expectedStartDate = formDateRange.value[0]
      form.expectedEndDate = formDateRange.value[1]
    } else {
      form.expectedStartDate = ''
      form.expectedEndDate = ''
    }

    saving.value = true

    const method = editingId.value ? 'PUT' : 'POST'
    const url = editingId.value
      ? `${apiBase}/test-requests/${editingId.value}`
      : `${apiBase}/test-requests`

    const payload = { ...form }
    if (!canAssign.value) delete payload.assignedTo

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify(payload)
    })
    if (handleAuth(res)) return

    const j = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(j?.message || `HTTP ${res.status}`)

    ElMessage.success(text('testRequests.messages.saveSuccess', '儲存成功'))
    dialogVisible.value = false
    await fetchRequests()
  } catch (err) {
    console.error('❌ save test-request failed:', err)
    const msg = String(err?.message || '')
    ElMessage.error(msg || text('testRequests.messages.saveFailed', '儲存失敗'))
  } finally {
    saving.value = false
  }
}

function confirmDelete (row) {
  ElMessageBox.confirm(
    text('testRequests.actions.confirmDeleteMessage', '確定要刪除「{title}」嗎？', { title: row.title }),
    text('testRequests.actions.confirmDeleteTitle', '刪除確認'),
    {
      type: 'warning',
      confirmButtonText: text('testRequests.actions.delete', '刪除'),
      cancelButtonText: text('testRequests.actions.cancel', '取消')
    }
  )
    .then(() => deleteRequest(row.id))
    .catch(() => {})
}

async function deleteRequest (id) {
  if (!id) return
  try {
    const res = await fetch(`${apiBase}/test-requests/${id}`, {
      method: 'DELETE',
      headers: authHeaders()
    })
    if (handleAuth(res)) return

    const j = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(j?.message || `HTTP ${res.status}`)

    ElMessage.success(text('testRequests.messages.deleteSuccess', '刪除成功'))

    if (requests.value.length <= 1 && q.page > 1) q.page -= 1
    await fetchRequests()
  } catch (err) {
    console.error('❌ delete test-request failed:', err)
    ElMessage.error(err?.message || text('testRequests.messages.deleteFailed', '刪除失敗'))
  }
}

onMounted(() => {
  cleanupMql = setupMql()
  currentUser.value = getCurrentUser()
  fetchRequests()
  fetchUsers()
})

onBeforeUnmount(() => {
  if (cleanupMql) cleanupMql()
})
</script>

<style scoped>
.test-request-page-vivid {
  --tr-border: var(--el-border-color-light);
  --tr-border-soft: var(--el-border-color-lighter);
  --tr-card-bg:
    radial-gradient(circle at top right, color-mix(in srgb, var(--el-color-primary) 12%, transparent) 0%, transparent 34%),
    linear-gradient(180deg, color-mix(in srgb, var(--el-bg-color) 94%, var(--el-color-primary-light-9) 6%) 0%, var(--el-bg-color) 100%);
  --tr-soft-bg: color-mix(in srgb, var(--el-fill-color-light) 88%, white 12%);
  --tr-shadow: 0 18px 48px rgba(0, 0, 0, 0.06);

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
  border: 1px solid var(--tr-border);
  border-radius: 22px;
  background: var(--tr-card-bg);
  box-shadow: var(--tr-shadow);
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
  border: 1px solid color-mix(in srgb, var(--el-color-primary) 24%, var(--tr-border));
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
  border: 1px solid var(--tr-border-soft);
  background: var(--tr-soft-bg);
  text-align: left;
}

.stat-card.total {
  background: linear-gradient(180deg, color-mix(in srgb, var(--el-color-primary-light-8) 72%, white 28%), color-mix(in srgb, var(--el-color-primary-light-9) 84%, white 16%));
}
.stat-card.pending {
  background: linear-gradient(180deg, color-mix(in srgb, var(--el-color-warning-light-8) 72%, white 28%), color-mix(in srgb, var(--el-color-warning-light-9) 84%, white 16%));
}
.stat-card.in-progress {
  background: linear-gradient(180deg, color-mix(in srgb, var(--el-color-info-light-8) 72%, white 28%), color-mix(in srgb, var(--el-color-info-light-9) 84%, white 16%));
}
.stat-card.done {
  background: linear-gradient(180deg, color-mix(in srgb, var(--el-color-success-light-8) 72%, white 28%), color-mix(in srgb, var(--el-color-success-light-9) 84%, white 16%));
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
  grid-template-columns: minmax(260px, 1.2fr) 200px minmax(260px, 1fr);
  gap: 14px;
}

.filter-label {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  margin-bottom: 6px;
  font-weight: 700;
}

.filter-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: flex-end;
  margin-top: 14px;
}

.data-table :deep(.el-table__header th) {
  background: var(--tr-soft-bg);
  font-weight: 700;
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

.request-card {
  border: 1px solid var(--tr-border-soft);
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
  gap: 6px;
  align-items: flex-end;
}

.meta-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  margin-top: 12px;
}

.meta-box {
  padding: 10px 12px;
  border-radius: 14px;
  border: 1px solid var(--tr-border-soft);
  background: var(--tr-soft-bg);
}

.meta-label {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  margin-bottom: 4px;
}

.meta-value {
  font-size: 14px;
  font-weight: 700;
  line-height: 1.5;
  word-break: break-word;
}

.remark-box {
  margin-top: 12px;
  padding: 12px 14px;
  border-radius: 16px;
  border: 1px solid var(--tr-border-soft);
  background: linear-gradient(180deg, color-mix(in srgb, var(--el-color-primary-light-9) 24%, var(--el-bg-color) 76%) 0%, var(--tr-soft-bg) 100%);
}

.remark-label {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  margin-bottom: 6px;
}

.remark-text {
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

.table-bottom {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-top: 12px;
  flex-wrap: wrap;
}

.table-footer {
  font-size: 13px;
  color: var(--el-text-color-secondary);
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
  border: 1px solid var(--tr-border-soft);
  background: linear-gradient(180deg, var(--tr-soft-bg) 0%, color-mix(in srgb, var(--el-bg-color) 96%, white 4%) 100%);
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

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0 16px;
}

.span-2 {
  grid-column: 1 / -1;
}

@media (max-width: 1180px) {
  .filter-grid {
    grid-template-columns: 1fr 1fr;
  }

  .date-item,
  .keyword-item {
    grid-column: span 2;
  }
}

@media (max-width: 980px) {
  .stat-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .dialog-hero,
  .form-grid,
  .meta-grid {
    grid-template-columns: 1fr;
  }

  .span-2,
  .date-item,
  .keyword-item {
    grid-column: auto;
  }
}

@media (max-width: 768px) {
  .test-request-page-vivid {
    gap: 12px;
  }

  .hero-card {
    padding: 16px;
  }

  .hero-main,
  .table-bottom {
    flex-direction: column;
    align-items: stretch;
  }

  .hero-right,
  .filter-actions {
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
  .filter-actions :deep(.el-button),
  .card-actions :deep(.el-button) {
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
