<template>
  <div class="page os-page-vivid">
    <section class="hero-card">
      <div class="hero-main">
        <div class="hero-left">
          <div class="hero-icon-wrap">
            <div class="hero-icon">💿</div>
          </div>

          <div class="hero-copy">
            <div class="hero-eyebrow">{{ text('osRecovery.eyebrow', 'OS Image Recovery Library') }}</div>
            <h2 class="hero-title">{{ text('osRecovery.title', 'OS Recovery Center') }}</h2>
            <div class="hero-subtitle">
              {{ text('osRecovery.heroSubtitle', '集中管理標準與客製 OS 映像，快速搜尋、檢視備註與導向檔案中心下載') }}
            </div>
          </div>
        </div>

        <div class="hero-actions">
          <el-button
            v-if="isAdmin"
            class="btn"
            type="primary"
            :icon="Plus"
            @click="openCreateDialog"
          >
            {{ text('common.add', '新增') }}
          </el-button>

          <el-button
            class="btn"
            :icon="Refresh"
            @click="handleRefresh"
            :loading="loading"
          >
            {{ text('osRecovery.actions.refresh', '重新整理') }}
          </el-button>
        </div>
      </div>

      <div class="stats-grid">
        <div class="stat-card stat-primary">
          <div class="stat-label">{{ text('osRecovery.stats.total', '總筆數') }}</div>
          <div class="stat-value">{{ total }}</div>
        </div>

        <div class="stat-card">
          <div class="stat-label">{{ text('osRecovery.stats.standard', '標準映像') }}</div>
          <div class="stat-value">{{ standardCount }}</div>
        </div>

        <div class="stat-card">
          <div class="stat-label">{{ text('osRecovery.stats.custom', '客製映像') }}</div>
          <div class="stat-value">{{ customCount }}</div>
        </div>

        <div class="stat-card">
          <div class="stat-label">{{ text('osRecovery.stats.filtered', '目前頁面') }}</div>
          <div class="stat-value">{{ tableData.length }}</div>
        </div>
      </div>
    </section>

    <el-card class="block-card filters-card" shadow="never">
      <template #header>
        <div class="section-head">
          <div>
            <div class="section-title">{{ text('osRecovery.filterTitle', '篩選條件') }}</div>
            <div class="section-subtitle">
              {{ text('osRecovery.filterSubtitle', '可依 OS 類型、主板、產品、語系、版本與關鍵字快速縮小範圍') }}
            </div>
          </div>
        </div>
      </template>

      <div class="filter-grid">
        <div class="filter-item">
          <div class="filter-label">{{ text('osRecovery.filters.osFamily', 'OS 類型') }}</div>
          <el-select
            v-model="filters.osFamily"
            :placeholder="text('osRecovery.filters.osFamilyPlaceholder', '請選擇 OS 類型')"
            clearable
            class="w-100"
            @change="handleSearch"
          >
            <el-option
              v-for="opt in osFamilyOptions"
              :key="opt.value"
              :label="opt.label"
              :value="opt.value"
            />
          </el-select>
        </div>

        <div class="filter-item">
          <div class="filter-label">{{ text('osRecovery.filters.imageType', '映像類型') }}</div>
          <el-select
            v-model="filters.isCustom"
            :placeholder="text('osRecovery.filters.imageTypePlaceholder', '請選擇類型')"
            clearable
            class="w-100"
            @change="handleSearch"
          >
            <el-option :label="text('osRecovery.type.standard', '標準')" :value="false" />
            <el-option :label="text('osRecovery.type.custom', '客製')" :value="true" />
          </el-select>
        </div>

        <div class="filter-item switch-item">
          <div class="filter-label">{{ text('osRecovery.filters.onlyLatest', '只看最新') }}</div>
          <el-tooltip :content="text('osRecovery.filters.onlyLatestTip', '只顯示每組條件下最新版本')" placement="top">
            <el-switch
              v-model="filters.onlyLatest"
              :active-text="text('osRecovery.filters.onlyLatest', '只看最新')"
              @change="handleSearch"
            />
          </el-tooltip>
        </div>

        <div class="filter-item">
          <div class="filter-label">{{ text('osRecovery.filters.board', '主板') }}</div>
          <el-input
            v-model="filters.board"
            :placeholder="text('osRecovery.filters.boardPlaceholder', '請輸入主板型號')"
            clearable
            class="w-100"
          />
        </div>

        <div class="filter-item">
          <div class="filter-label">{{ text('osRecovery.filters.product', '產品') }}</div>
          <el-input
            v-model="filters.product"
            :placeholder="text('osRecovery.filters.productPlaceholder', '請輸入產品型號')"
            clearable
            class="w-100"
          />
        </div>

        <div class="filter-item">
          <div class="filter-label">{{ text('osRecovery.filters.language', '語言') }}</div>
          <el-input
            v-model="filters.language"
            :placeholder="text('osRecovery.filters.languagePlaceholder', '請輸入語言')"
            clearable
            class="w-100"
          />
        </div>

        <div class="filter-item">
          <div class="filter-label">{{ text('osRecovery.filters.edition', '版本型態') }}</div>
          <el-input
            v-model="filters.edition"
            :placeholder="text('osRecovery.filters.editionPlaceholder', '請輸入 Edition')"
            clearable
            class="w-100"
          />
        </div>

        <div class="filter-item">
          <div class="filter-label">{{ text('osRecovery.filters.version', '版本號') }}</div>
          <el-input
            v-model="filters.version"
            :placeholder="text('osRecovery.filters.versionPlaceholder', '請輸入 Version')"
            clearable
            class="w-100"
          />
        </div>

        <div class="filter-item">
          <div class="filter-label">{{ text('osRecovery.filters.licenseType', '授權類型') }}</div>
          <el-input
            v-model="filters.licenseType"
            :placeholder="text('osRecovery.filters.licenseTypePlaceholder', '請輸入 License Type')"
            clearable
            class="w-100"
          />
        </div>

        <div class="filter-item keyword-item">
          <div class="filter-label">{{ text('osRecovery.filters.keyword', '關鍵字') }}</div>
          <el-input
            v-model="filters.keyword"
            :placeholder="text('osRecovery.filters.keywordPlaceholder', '搜尋料號、主板、產品、備註...')"
            clearable
            class="w-100"
            @keyup.enter="handleSearch"
          >
            <template #suffix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>
        </div>
      </div>

      <div class="filter-actions">
        <el-button
          type="primary"
          class="btn"
          :icon="Search"
          @click="handleSearch"
          :loading="loading"
        >
          {{ text('osRecovery.buttons.search', '搜尋') }}
        </el-button>
        <el-button
          class="btn"
          :icon="Refresh"
          @click="handleReset"
          :disabled="loading"
        >
          {{ text('osRecovery.buttons.reset', '重設') }}
        </el-button>
      </div>
    </el-card>

    <el-card class="block-card table-card" shadow="never">
      <template #header>
        <div class="section-head">
          <div>
            <div class="section-title">{{ text('osRecovery.table.title', 'OS Image 清單') }}</div>
            <div class="section-subtitle">
              {{ text('osRecovery.tableSummary', '共 {total} 筆資料', { total }) }}
              <span v-if="filters.keyword">
                · {{ text('osRecovery.table.keywordLabel', '關鍵字') }}「{{ filters.keyword }}」
              </span>
            </div>
          </div>
        </div>
      </template>

      <el-table
        v-if="!isMobile"
        :data="tableData"
        v-loading="loading"
        border
        stripe
        class="os-table"
        height="560"
      >
        <el-table-column fixed="left" :label="text('common.actions', '操作')" width="160">
          <template #default="{ row }">
            <el-button
              v-if="isAdmin"
              type="primary"
              link
              size="small"
              @click="openEditDialog(row)"
            >
              {{ text('common.edit', '編輯') }}
            </el-button>
            <el-button
              type="success"
              link
              size="small"
              @click="handleDownload(row)"
            >
              {{ text('files.btnDownload', '下載') }}
            </el-button>
          </template>
        </el-table-column>

        <el-table-column
          prop="pnIso"
          :label="text('osRecovery.table.cols.pnIso', 'PN / ISO')"
          min-width="200"
          show-overflow-tooltip
        />

        <el-table-column
          prop="osFamily"
          :label="text('osRecovery.table.cols.osFamily', 'OS 類型')"
          min-width="120"
        >
          <template #default="{ row }">
            {{ getOsFamilyLabel(row.osFamily) }}
          </template>
        </el-table-column>

        <el-table-column
          prop="isCustom"
          :label="text('osRecovery.table.cols.type', '類型')"
          width="100"
        >
          <template #default="{ row }">
            <el-tag
              :type="row.isCustom ? 'warning' : 'success'"
              size="small"
              effect="dark"
            >
              {{
                row.isCustom
                  ? text('osRecovery.type.custom', '客製')
                  : text('osRecovery.type.standard', '標準')
              }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column
          prop="mbModel"
          :label="text('osRecovery.table.cols.mbModel', '主板型號')"
          min-width="140"
          show-overflow-tooltip
        />
        <el-table-column
          prop="mbRevision"
          :label="text('osRecovery.table.cols.mbRevision', '主板版號')"
          min-width="120"
          show-overflow-tooltip
        />
        <el-table-column
          prop="productModels"
          :label="text('osRecovery.table.cols.productModels', '產品型號')"
          min-width="200"
          show-overflow-tooltip
        />
        <el-table-column
          prop="edition"
          :label="text('osRecovery.table.cols.edition', 'Edition')"
          min-width="120"
          show-overflow-tooltip
        />
        <el-table-column
          prop="version"
          :label="text('osRecovery.table.cols.version', 'Version')"
          min-width="110"
          show-overflow-tooltip
        />
        <el-table-column
          prop="licenseType"
          :label="text('osRecovery.table.cols.licenseType', 'License')"
          min-width="130"
          show-overflow-tooltip
        />
        <el-table-column
          prop="language"
          :label="text('osRecovery.table.cols.language', '語言')"
          min-width="140"
          show-overflow-tooltip
        />

        <el-table-column
          prop="notes"
          :label="text('osRecovery.table.cols.notes', '備註')"
          min-width="260"
        >
          <template #default="{ row }">
            <div class="note-cell">
              <span class="note-preview">{{ shortNote(row.notes) }}</span>
              <el-button
                v-if="row.notes"
                link
                type="primary"
                size="small"
                @click="openNoteDialog(row)"
              >
                {{ text('osRecovery.note.more', '更多') }}
              </el-button>
            </div>
          </template>
        </el-table-column>
      </el-table>

      <div v-else class="mobile-list" v-loading="loading">
        <template v-if="tableData.length">
          <article v-for="row in tableData" :key="row.id" class="os-item-card">
            <div class="item-top">
              <div class="item-main">
                <div class="item-title">{{ row.pnIso || '-' }}</div>
                <div class="item-sub">
                  {{ getOsFamilyLabel(row.osFamily) }}
                  <span v-if="row.edition"> · {{ row.edition }}</span>
                  <span v-if="row.version"> · {{ row.version }}</span>
                </div>
              </div>

              <el-tag
                :type="row.isCustom ? 'warning' : 'success'"
                size="small"
                effect="plain"
                class="pill mini"
              >
                {{
                  row.isCustom
                    ? text('osRecovery.type.custom', '客製')
                    : text('osRecovery.type.standard', '標準')
                }}
              </el-tag>
            </div>

            <div class="meta-grid">
              <div class="meta-box">
                <div class="meta-label">{{ text('osRecovery.table.cols.mbModel', '主板型號') }}</div>
                <div class="meta-value">{{ row.mbModel || '-' }}</div>
              </div>
              <div class="meta-box">
                <div class="meta-label">{{ text('osRecovery.table.cols.mbRevision', '主板版號') }}</div>
                <div class="meta-value">{{ row.mbRevision || '-' }}</div>
              </div>
              <div class="meta-box">
                <div class="meta-label">{{ text('osRecovery.table.cols.productModels', '產品型號') }}</div>
                <div class="meta-value">{{ row.productModels || '-' }}</div>
              </div>
              <div class="meta-box">
                <div class="meta-label">{{ text('osRecovery.table.cols.language', '語言') }}</div>
                <div class="meta-value">{{ row.language || '-' }}</div>
              </div>
              <div class="meta-box">
                <div class="meta-label">{{ text('osRecovery.table.cols.licenseType', 'License') }}</div>
                <div class="meta-value">{{ row.licenseType || '-' }}</div>
              </div>
            </div>

            <div class="note-card">
              <div class="meta-label">{{ text('osRecovery.table.cols.notes', '備註') }}</div>
              <div class="meta-value">{{ shortNote(row.notes) }}</div>
              <el-button
                v-if="row.notes"
                link
                type="primary"
                size="small"
                @click="openNoteDialog(row)"
              >
                {{ text('osRecovery.note.more', '更多') }}
              </el-button>
            </div>

            <div class="card-actions">
              <el-button
                v-if="isAdmin"
                type="primary"
                plain
                @click="openEditDialog(row)"
              >
                {{ text('common.edit', '編輯') }}
              </el-button>
              <el-button
                type="success"
                plain
                @click="handleDownload(row)"
              >
                {{ text('files.btnDownload', '下載') }}
              </el-button>
            </div>
          </article>
        </template>

        <el-empty
          v-else
          :description="text('common.noData', '目前沒有資料')"
        />
      </div>

      <div class="pagination-bar">
        <el-pagination
          background
          layout="total, sizes, prev, pager, next, jumper"
          :current-page="page"
          :page-size="pageSize"
          :total="total"
          :page-sizes="[10, 20, 50, 100]"
          @size-change="handleSizeChange"
          @current-change="handlePageChange"
        />
      </div>
    </el-card>

    <el-dialog
      v-model="noteDialogVisible"
      :title="noteDialogTitle"
      :width="isMobile ? '100%' : '720px'"
      :fullscreen="isMobile"
    >
      <div v-if="noteDialogRow" class="note-dialog-meta">
        <div>
          <strong>{{ text('osRecovery.note.meta.os', 'OS') }}</strong>
          {{ getOsFamilyLabel(noteDialogRow.osFamily) }}
          <span v-if="noteDialogRow.edition">／ {{ noteDialogRow.edition }}</span>
        </div>
        <div>
          <strong>{{ text('osRecovery.note.meta.board', '主板') }}</strong>
          {{ noteDialogRow.mbModel || '-' }}
          <span v-if="noteDialogRow.productModels">／ {{ noteDialogRow.productModels }}</span>
        </div>
        <div>
          <strong>{{ text('osRecovery.note.meta.date', '版本') }}</strong>
          <span v-if="noteDialogRow.version">{{ noteDialogRow.version }}</span>
          <span v-else>-</span>
        </div>
      </div>

      <el-scrollbar max-height="380px" class="note-dialog-scroll">
        <pre class="note-dialog-text">{{ noteDialogContent }}</pre>
      </el-scrollbar>

      <template #footer>
        <el-button class="btn" @click="noteDialogVisible = false">
          {{ text('osRecovery.note.close', '關閉') }}
        </el-button>
      </template>
    </el-dialog>

    <el-dialog
      v-model="editDialogVisible"
      :title="isEditing ? text('common.edit', '編輯') : text('common.add', '新增')"
      :width="isMobile ? '100%' : '760px'"
      :fullscreen="isMobile"
    >
      <div class="dialog-hero">
        <div class="dialog-main">
          <div class="dialog-title">
            {{ isEditing ? text('osRecovery.dialogEditTitle', '編輯 OS 映像資料') : text('osRecovery.dialogCreateTitle', '新增 OS 映像資料') }}
          </div>
          <div class="dialog-subtitle">
            {{ text('osRecovery.dialogSubtitle', '可設定 OS 類型、主板、產品、版本、語言與備註資訊') }}
          </div>
        </div>

        <div class="dialog-preview" v-if="editForm.pnIso || editForm.osFamily">
          <div class="preview-label">{{ text('osRecovery.preview', '預覽') }}</div>
          <div class="preview-value">{{ editForm.pnIso || '-' }}</div>
          <div class="preview-sub">{{ getOsFamilyLabel(editForm.osFamily) }}</div>
        </div>
      </div>

      <el-form
        ref="editFormRef"
        :model="editForm"
        :rules="editRules"
        label-position="top"
        class="stack-form"
      >
        <div class="dialog-grid">
          <el-form-item :label="text('osRecovery.filters.osFamily', 'OS 類型')" prop="osFamily">
            <el-select
              v-model="editForm.osFamily"
              :placeholder="text('osRecovery.filters.osFamilyPlaceholder', '請選擇 OS 類型')"
              clearable
              class="w-100"
            >
              <el-option
                v-for="opt in osFamilyOptions"
                :key="'dialog-' + opt.value"
                :label="opt.label"
                :value="opt.value"
              />
            </el-select>
          </el-form-item>

          <el-form-item :label="text('osRecovery.filters.imageType', '映像類型')">
            <el-switch
              v-model="editForm.isCustom"
              :active-text="text('osRecovery.type.custom', '客製')"
              :inactive-text="text('osRecovery.type.standard', '標準')"
            />
          </el-form-item>

          <el-form-item :label="text('osRecovery.table.cols.pnIso', 'PN / ISO')" prop="pnIso">
            <el-input v-model="editForm.pnIso" />
          </el-form-item>

          <el-form-item :label="text('osRecovery.table.cols.mbModel', '主板型號')">
            <el-input v-model="editForm.mbModel" />
          </el-form-item>

          <el-form-item :label="text('osRecovery.table.cols.mbRevision', '主板版號')">
            <el-input v-model="editForm.mbRevision" />
          </el-form-item>

          <el-form-item :label="text('osRecovery.table.cols.productModels', '產品型號')">
            <el-input v-model="editForm.productModels" type="textarea" :rows="2" />
          </el-form-item>

          <el-form-item :label="text('osRecovery.table.cols.edition', 'Edition')">
            <el-input v-model="editForm.edition" />
          </el-form-item>

          <el-form-item :label="text('osRecovery.table.cols.version', 'Version')">
            <el-input v-model="editForm.version" />
          </el-form-item>

          <el-form-item :label="text('osRecovery.table.cols.licenseType', 'License')">
            <el-input v-model="editForm.licenseType" />
          </el-form-item>

          <el-form-item :label="text('osRecovery.table.cols.language', '語言')">
            <el-input v-model="editForm.language" />
          </el-form-item>
        </div>

        <el-form-item :label="text('osRecovery.table.cols.notes', '備註')">
          <el-input v-model="editForm.notes" type="textarea" :rows="4" />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button class="btn" @click="editDialogVisible = false">
          {{ text('common.cancel', '取消') }}
        </el-button>
        <el-button type="primary" class="btn" :loading="saving" @click="submitEdit">
          {{ text('common.save', '儲存') }}
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onBeforeUnmount } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Refresh, Search, Plus } from '@element-plus/icons-vue'
import api from '@/api'

defineOptions({ name: 'OSRecoveryCenter' })

const { t, te } = useI18n()
const router = useRouter()

function text (key, fallback, params) {
  if (te(key)) return t(key, params)
  if (!params) return fallback
  return String(fallback).replace(/\{(\w+)\}/g, (_, k) => String(params?.[k] ?? ''))
}

/* =======================
 *  使用者 / 權限
 * ======================= */
const user = ref(null)

function loadUser () {
  try {
    const raw =
      localStorage.getItem('user') ||
      sessionStorage.getItem('user') ||
      'null'
    user.value = JSON.parse(raw)
  } catch {
    user.value = null
  }
}

const isAdmin = computed(
  () => String(user.value?.role || '').toLowerCase() === 'admin'
)

/* =======================
 *  列表狀態
 * ======================= */
const loading = ref(false)
const tableData = ref([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(20)

const filters = reactive({
  osFamily: '',
  isCustom: null,
  board: '',
  product: '',
  language: '',
  edition: '',
  version: '',
  licenseType: '',
  keyword: '',
  onlyLatest: false
})

const osFamilyOptions = computed(() => [
  { value: '', label: text('osRecovery.filters.osFamilyAll', '全部') },
  { value: 'Win11', label: text('osRecovery.filters.osFamilyWin11', 'Windows 11') },
  { value: 'Win10', label: text('osRecovery.filters.osFamilyWin10', 'Windows 10') },
  { value: 'Win8.1', label: text('osRecovery.filters.osFamilyWin81', 'Windows 8.1') },
  { value: 'Win7', label: text('osRecovery.filters.osFamilyWin7', 'Windows 7') },
  { value: 'XPP', label: text('osRecovery.filters.osFamilyXPP', 'Windows XP Pro') },
  { value: 'XPE', label: text('osRecovery.filters.osFamilyXPE', 'Windows XP Embedded') }
])

const standardCount = computed(() =>
  tableData.value.filter(row => !row.isCustom).length
)
const customCount = computed(() =>
  tableData.value.filter(row => !!row.isCustom).length
)

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

/* =======================
 *  備註 Dialog
 * ======================= */
const noteDialogVisible = ref(false)
const noteDialogContent = ref('')
const noteDialogRow = ref(null)

const noteDialogTitle = computed(() => {
  if (!noteDialogRow.value) return text('osRecovery.note.title', '備註')
  return noteDialogRow.value.pnIso || text('osRecovery.note.title', '備註')
})

/* =======================
 *  新增 / 編輯 Dialog
 * ======================= */
const editDialogVisible = ref(false)
const editFormRef = ref(null)
const isEditing = ref(false)
const currentId = ref(null)
const saving = ref(false)

const editForm = reactive({
  osFamily: '',
  isCustom: false,
  pnIso: '',
  mbModel: '',
  mbRevision: '',
  productModels: '',
  edition: '',
  version: '',
  licenseType: '',
  language: '',
  notes: ''
})

const editRules = computed(() => ({
  pnIso: [
    {
      required: true,
      message: `${text('osRecovery.table.cols.pnIso', 'PN / ISO')} ${text('common.required', '為必填')}`,
      trigger: 'blur'
    }
  ]
}))

/* =======================
 *  Helper
 * ======================= */
function getOsFamilyLabel (value) {
  if (!value) return text('osRecovery.osFamily.unknown', '未知')
  const opt = osFamilyOptions.value.find((o) => o.value === value)
  return opt ? opt.label : value
}

function shortNote (note) {
  if (!note) return '-'
  const trimmed = String(note).trim()
  if (!trimmed) return '-'
  return trimmed.length > 50 ? `${trimmed.slice(0, 50)}…` : trimmed
}

function buildQueryParams () {
  const params = {
    page: page.value,
    pageSize: pageSize.value,
    osFamily: filters.osFamily || undefined,
    isCustom: typeof filters.isCustom === 'boolean' ? filters.isCustom : undefined,
    board: filters.board || undefined,
    product: filters.product || undefined,
    language: filters.language || undefined,
    edition: filters.edition || undefined,
    version: filters.version || undefined,
    licenseType: filters.licenseType || undefined,
    keyword: filters.keyword || undefined,
    onlyLatest: filters.onlyLatest || undefined
  }

  Object.keys(params).forEach((key) => {
    if (params[key] === undefined || params[key] === null) delete params[key]
  })

  return params
}

/* =======================
 *  API
 * ======================= */
async function fetchData () {
  try {
    loading.value = true
    const params = buildQueryParams()
    const { data } = await api.get('/os-images', { params })

    tableData.value = data.rows || []
    total.value = data.total ?? tableData.value.length
  } catch (err) {
    console.error('❌ 取得 OS Image 清單失敗:', err)
    ElMessage.error(text('osRecovery.messages.fetchError', '載入資料失敗'))
  } finally {
    loading.value = false
  }
}

/* =======================
 *  事件處理：查詢 / 分頁
 * ======================= */
function handleSearch () {
  page.value = 1
  fetchData()
}

function handleReset () {
  filters.osFamily = ''
  filters.isCustom = null
  filters.board = ''
  filters.product = ''
  filters.language = ''
  filters.edition = ''
  filters.version = ''
  filters.licenseType = ''
  filters.keyword = ''
  filters.onlyLatest = false
  page.value = 1
  fetchData()
}

function handleRefresh () {
  fetchData()
}

function handlePageChange (newPage) {
  page.value = newPage
  fetchData()
}

function handleSizeChange (newSize) {
  pageSize.value = newSize
  page.value = 1
  fetchData()
}

/* =======================
 *  事件處理：備註 / 下載
 * ======================= */
function openNoteDialog (row) {
  noteDialogRow.value = row
  noteDialogContent.value = row.notes != null ? String(row.notes) : ''
  noteDialogVisible.value = true
}

function handleDownload (row) {
  const pn = String(row?.pnIso || '').trim()
  if (!pn) {
    ElMessage.warning(text('osRecovery.messages.noPnIso', '沒有可用的料號 / ISO'))
    return
  }

  router.push({
    path: '/files',
    query: {
      folder: pn,
      keyword: pn
    }
  })
}

/* =======================
 *  事件處理：新增 / 編輯
 * ======================= */
function resetEditForm () {
  editForm.osFamily = ''
  editForm.isCustom = false
  editForm.pnIso = ''
  editForm.mbModel = ''
  editForm.mbRevision = ''
  editForm.productModels = ''
  editForm.edition = ''
  editForm.version = ''
  editForm.licenseType = ''
  editForm.language = ''
  editForm.notes = ''
}

function openCreateDialog () {
  if (!isAdmin.value) return
  isEditing.value = false
  currentId.value = null
  resetEditForm()
  editDialogVisible.value = true
}

function openEditDialog (row) {
  if (!isAdmin.value) return
  isEditing.value = true
  currentId.value = row.id

  editForm.osFamily = row.osFamily || ''
  editForm.isCustom = !!row.isCustom
  editForm.pnIso = row.pnIso || ''
  editForm.mbModel = row.mbModel || ''
  editForm.mbRevision = row.mbRevision || ''
  editForm.productModels = row.productModels || ''
  editForm.edition = row.edition || ''
  editForm.version = row.version || ''
  editForm.licenseType = row.licenseType || ''
  editForm.language = row.language || ''
  editForm.notes = row.notes || ''

  editDialogVisible.value = true
}

async function submitEdit () {
  if (!editFormRef.value) return

  try {
    saving.value = true
    await editFormRef.value.validate()

    const payload = {
      osFamily: editForm.osFamily || null,
      isCustom: !!editForm.isCustom,
      pnIso: editForm.pnIso,
      mbModel: editForm.mbModel || null,
      mbRevision: editForm.mbRevision || null,
      productModels: editForm.productModels || null,
      edition: editForm.edition || null,
      version: editForm.version || null,
      licenseType: editForm.licenseType || null,
      language: editForm.language || null,
      notes: editForm.notes || null
    }

    if (isEditing.value && currentId.value) {
      await api.put(`/os-images/${currentId.value}`, payload)
    } else {
      await api.post('/os-images', payload)
    }

    ElMessage.success(text('common.saved', '已儲存'))
    editDialogVisible.value = false
    fetchData()
  } catch (err) {
    if (err?.name === 'ElFormValidateError') return
    console.error('❌ 儲存 OS Image 失敗:', err)
    ElMessage.error(text('osRecovery.messages.saveError', '儲存失敗，請稍後再試'))
  } finally {
    saving.value = false
  }
}

onMounted(() => {
  loadUser()
  cleanupMql = setupMql()
  fetchData()
})

onBeforeUnmount(() => {
  if (cleanupMql) cleanupMql()
})
</script>

<style scoped>
.os-page-vivid {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  color: var(--el-text-color-primary);
}

.btn { border-radius: 12px; }
.w-100 { width: 100%; }
.pill { border-radius: 999px; }
.pill.mini { font-size: 12px; padding: 2px 10px; }

.hero-card,
.block-card {
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
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 14px;
}
.filter-item {
  min-width: 0;
}
.filter-item.switch-item {
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
}
.keyword-item {
  grid-column: span 2;
}
.filter-label {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  margin-bottom: 6px;
  font-weight: 700;
}
.filter-actions {
  margin-top: 14px;
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  flex-wrap: wrap;
}

.os-table {
  font-size: 13px;
}
.os-table :deep(.el-table__header-wrapper th) {
  background: var(--el-fill-color-light);
}

.note-cell {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.note-preview {
  flex: 1;
  min-width: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.mobile-list {
  display: grid;
  gap: 12px;
}
.os-item-card {
  border: 1px solid var(--el-border-color-lighter);
  background: var(--el-bg-color);
  border-radius: 18px;
  padding: 14px;
}
.item-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
}
.item-title {
  font-size: 16px;
  font-weight: 800;
  line-height: 1.3;
}
.item-sub {
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
.meta-box,
.note-card {
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
  line-height: 1.5;
  word-break: break-word;
}
.note-card {
  margin-top: 12px;
}
.card-actions {
  margin-top: 12px;
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.card-actions :deep(.el-button) {
  flex: 1 1 calc(50% - 8px);
  min-width: 120px;
}

.pagination-bar {
  display: flex;
  justify-content: flex-end;
  margin-top: 12px;
}

.note-dialog-meta {
  font-size: 13px;
  margin-bottom: 8px;
  color: var(--el-text-color-secondary);
}
.note-dialog-meta > div {
  margin-bottom: 2px;
}
.note-dialog-scroll {
  border-radius: 8px;
  border: 1px solid var(--el-border-color-lighter);
  padding: 8px 10px;
  background-color: var(--el-bg-color-page);
}
.note-dialog-text {
  margin: 0;
  white-space: pre-wrap;
  font-family: Consolas, Monaco, 'Courier New', monospace;
  font-size: 13px;
  line-height: 1.5;
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

.dialog-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0 14px;
}

@media (max-width: 1200px) {
  .filter-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
  .keyword-item {
    grid-column: span 3;
  }
}

@media (max-width: 1100px) {
  .stats-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .dialog-hero {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .os-page-vivid {
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

  .hero-actions,
  .filter-actions,
  .pagination-bar {
    justify-content: flex-start;
  }

  .filter-grid,
  .dialog-grid {
    grid-template-columns: 1fr 1fr;
  }
  .keyword-item {
    grid-column: span 2;
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
  .meta-grid,
  .dialog-grid {
    grid-template-columns: 1fr;
  }
  .keyword-item {
    grid-column: span 1;
  }
  .hero-actions :deep(.el-button),
  .filter-actions :deep(.el-button),
  .card-actions :deep(.el-button) {
    flex: 1 1 100%;
    min-width: 0;
  }
}
</style>
