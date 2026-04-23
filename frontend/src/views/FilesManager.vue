<template>
  <div class="page files-page files-page-vivid">
    <section class="hero-card">
      <div class="hero-main">
        <div class="hero-left">
          <div class="hero-icon-wrap">
            <div class="hero-icon">📁</div>
          </div>

          <div class="hero-copy">
            <div class="hero-eyebrow">{{ text('files.eyebrow', 'File Library') }}</div>
            <h2 class="hero-title">{{ t('files.title') }}</h2>
            <div class="hero-subtitle">
              {{ text('files.subtitle', '集中管理檔案、資料夾、上傳與維護工具，支援桌面與手機快速操作') }}
            </div>
          </div>
        </div>

        <div class="hero-actions">
          <el-input
            v-model="keyword"
            :placeholder="t('files.searchPlaceholder')"
            clearable
            class="ctrl w-search"
            @keyup.enter="onSearch"
            @clear="onSearch"
          >
            <template #prefix><el-icon><Search /></el-icon></template>
          </el-input>

          <el-select
            v-model="catFilter"
            class="ctrl w-160"
            :placeholder="t('files.categoryAll')"
            clearable
          >
            <el-option :value="''" :label="t('files.categoryAll')" />
            <el-option
              v-for="c in categoryOptions"
              :key="c"
              :value="c"
              :label="catLabel(c)"
            />
          </el-select>

          <el-button class="btn" plain :icon="Refresh" :loading="loading" @click="reload">
            {{ t('common.refresh') }}
          </el-button>

          <template v-if="!isMobile">
            <el-button class="btn" type="primary" :icon="FolderAdd" @click="openCreateFolder">
              {{ t('files.btnNewFolder') }}
            </el-button>

            <el-button
              class="btn"
              type="danger"
              plain
              :icon="Delete"
              :disabled="bulkDeleteDisabled"
              @click="onBulkDelete"
            >
              {{ t('files.btnBulkDelete') }}
            </el-button>

            <el-dropdown trigger="click">
              <el-button class="btn" plain :icon="Tools">
                {{ t('files.btnMaintenance') === 'files.btnMaintenance' ? '維護' : t('files.btnMaintenance') }}
              </el-button>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item :disabled="!uiIsAdmin" @click="purgeOrphanDisk">
                    {{ t('files.btnPurgeOrphan') === 'files.btnPurgeOrphan' ? '清理孤兒檔案（磁碟）' : t('files.btnPurgeOrphan') }}
                  </el-dropdown-item>
                  <el-dropdown-item :disabled="!uiIsAdmin" @click="purgeLegacyDeleted">
                    {{ t('files.btnPurgeLegacy') === 'files.btnPurgeLegacy' ? '清理舊 isDeleted=true（DB 遺留）' : t('files.btnPurgeLegacy') }}
                  </el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </template>

          <template v-else>
            <el-dropdown trigger="click" @command="onHeaderCmd">
              <el-button class="btn" plain :icon="MoreFilled">
                {{ t('common.actions') }}
              </el-button>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item command="newFolder">
                    {{ t('files.btnNewFolder') }}
                  </el-dropdown-item>
                  <el-dropdown-item command="bulkDelete" :disabled="bulkDeleteDisabled">
                    {{ t('files.btnBulkDelete') }}
                  </el-dropdown-item>
                  <el-dropdown-item command="purgeOrphan" :disabled="!uiIsAdmin" divided>
                    清理孤兒檔案（磁碟）
                  </el-dropdown-item>
                  <el-dropdown-item command="purgeLegacy" :disabled="!uiIsAdmin">
                    清理舊 isDeleted=true（DB 遺留）
                  </el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </template>
        </div>
      </div>

      <div class="stats-grid">
        <div class="stat-card stat-primary">
          <div class="stat-label">{{ text('files.stats.total', '總筆數') }}</div>
          <div class="stat-value">{{ total }}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">{{ text('files.stats.files', '檔案') }}</div>
          <div class="stat-value">{{ fileCount }}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">{{ text('files.stats.folders', '資料夾') }}</div>
          <div class="stat-value">{{ folderCount }}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">{{ text('files.stats.selected', '已選取') }}</div>
          <div class="stat-value">{{ selectedCount }}</div>
        </div>
      </div>
    </section>

    <!-- breadcrumb -->
    <div class="folder-bar">
      <el-breadcrumb separator="/" class="crumbs">
        <el-breadcrumb-item>
          <span class="crumb-link" @click="goRoot">
            {{ t('files.root') || '根目錄' }}
          </span>
        </el-breadcrumb-item>

        <el-breadcrumb-item v-for="(f, idx) in folderTrail" :key="f.id">
          <span class="crumb-link" @click="jumpToFolder(idx)">
            {{ f.displayName || f.originalName }}
          </span>
        </el-breadcrumb-item>
      </el-breadcrumb>

      <div class="crumb-actions">
        <el-tag v-if="currentFolder" effect="plain" class="pill mini">
          ID: {{ currentFolder.id }}
        </el-tag>

        <el-tag
          v-if="focusedVisibleCount > 0"
          type="success"
          effect="plain"
          class="pill mini"
        >
          已高亮 {{ focusedVisibleCount }} 筆
        </el-tag>
      </div>
    </div>

    <!-- upload area / tools -->
    <el-card shadow="never" class="tool-card">
      <div class="tool-grid">
        <div class="tool-block">
          <div class="label">{{ t('files.uploadCategoryPlaceholder') }}</div>
          <el-select
            v-model="uploadCat"
            class="ctrl w-100"
            :placeholder="t('files.uploadCategoryPlaceholder')"
          >
            <el-option
              v-for="c in categoryOptions"
              :key="'u-' + c"
              :value="c"
              :label="catLabel(c)"
            />
          </el-select>
        </div>

        <div class="tool-block">
          <div class="label">{{ t('files.uploadTip') }}</div>

          <!-- desktop: drag -->
          <el-upload
            v-if="!isMobile"
            class="upload"
            drag
            multiple
            :name="'files'"
            :action="`${apiBase}/files/upload`"
            :headers="authHeaders()"
            :data="uploadPayload"
            :show-file-list="false"
            :before-upload="beforeUpload"
            :on-start="onUploadStart"
            :on-progress="onUploadProgress"
            :on-success="onUploadSuccess"
            :on-error="onUploadError"
          >
            <el-icon class="el-icon--upload"><UploadFilled /></el-icon>
            <div class="el-upload__text">
              {{ t('files.uploadDragText1') }}
              <em>{{ t('files.uploadDragText2') }}</em>
            </div>
            <template #tip>
              <div class="el-upload__tip">{{ t('files.uploadTip') }}</div>
            </template>
          </el-upload>

          <!-- mobile: button upload -->
          <el-upload
            v-else
            class="upload"
            multiple
            :name="'files'"
            :action="`${apiBase}/files/upload`"
            :headers="authHeaders()"
            :data="uploadPayload"
            :show-file-list="false"
            :before-upload="beforeUpload"
            :on-start="onUploadStart"
            :on-progress="onUploadProgress"
            :on-success="onUploadSuccess"
            :on-error="onUploadError"
          >
            <el-button class="btn" type="primary" plain :icon="UploadFilled">
              {{ t('files.uploadDragText2') === 'files.uploadDragText2' ? '選擇檔案上傳' : t('files.uploadDragText2') }}
            </el-button>
            <template #tip>
              <div class="el-upload__tip">{{ t('files.uploadTip') }}</div>
            </template>
          </el-upload>
        </div>

        <div class="tool-block right-block">
          <div class="label">{{ t('files.categoryAll') }}</div>
          <div class="tool-actions">
            <el-button class="btn" type="primary" :icon="FolderAdd" @click="openCreateFolder">
              {{ t('files.btnNewFolder') }}
            </el-button>

            <el-button
              class="btn"
              type="danger"
              plain
              :icon="Delete"
              :disabled="bulkDeleteDisabled"
              @click="onBulkDelete"
            >
              {{ t('files.btnBulkDelete') }}
            </el-button>
          </div>

          <div class="hint muted">
            {{ currentFolder ? `Upload → ${currentFolder.displayName || currentFolder.originalName}` : (t('files.root') || '根目錄') }}
          </div>
        </div>
      </div>
    </el-card>

    <!-- progress -->
    <div v-if="uploadProgress.active" class="progress-row">
      <span class="progress-label">{{ t('files.uploading') || 'Uploading...' }}</span>
      <el-progress :percentage="uploadProgress.percent" :stroke-width="6" />
    </div>

    <div v-if="replaceProgress.active" class="progress-row">
      <span class="progress-label">
        {{ t('files.replacing') || 'Replacing...' }}
        <span class="progress-file-name">{{ replaceProgress.name }}</span>
      </span>
      <el-progress :percentage="replaceProgress.percent" :stroke-width="4" />
    </div>

    <!-- Desktop Table -->
    <el-card v-if="!isMobile" shadow="never" class="list-card">
      <el-table
        :data="viewRows"
        border
        stripe
        v-loading="loading"
        :row-key="(r) => r.id"
        :row-class-name="tableRowClassName"
        @selection-change="(v) => (selection = v)"
      >
        <el-table-column type="selection" width="45" :selectable="selectableRow" />

        <el-table-column :label="t('files.colName')" min-width="280">
          <template #default="{ row }">
            <div class="name" :class="{ clickable: row.isFolder }" @click="row.isFolder && openFolder(row)">
              <el-icon class="name-icon">
                <Folder v-if="row.isFolder" />
                <Document v-else />
              </el-icon>

              <div class="name-text">
                <div class="primary">
                  <b>{{ row.displayName || row.originalName }}</b>
                  <span v-if="!row.isFolder && row.ext" class="muted">.{{ row.ext }}</span>

                  <el-tag
                    v-if="!row.canManage"
                    size="small"
                    type="info"
                    effect="plain"
                    class="pill mini readonly-tag"
                  >
                    {{ t('files.readonly') === 'files.readonly' ? '只讀' : t('files.readonly') }}
                  </el-tag>

                  <el-tag
                    v-if="isFocusedRow(row)"
                    size="small"
                    type="success"
                    effect="light"
                    class="pill mini"
                  >
                    高亮
                  </el-tag>
                </div>

                <div class="secondary muted">
                  {{ row?.uploader?.name || row?.uploader?.username || '-' }}
                  <span class="dot">·</span>
                  {{ fmt(row.createdAt) }}
                </div>
              </div>
            </div>
          </template>
        </el-table-column>

        <el-table-column :label="t('files.colCategory')" width="150">
          <template #default="{ row }">
            <el-tag size="small" effect="plain" class="pill mini">
              {{ catLabel(row.category || 'general') }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column :label="t('files.colSize')" width="120" align="right">
          <template #default="{ row }">
            <span v-if="row.isFolder">—</span>
            <span v-else>{{ prettySize(row.size) }}</span>
          </template>
        </el-table-column>

        <el-table-column :label="t('files.colActions')" width="340" fixed="right">
          <template #default="{ row }">
            <template v-if="row.isFolder">
              <el-button size="small" :icon="FolderOpened" @click="openFolder(row)">
                {{ t('files.btnOpenFolder') || '開啟' }}
              </el-button>

              <template v-if="row.canManage">
                <el-button size="small" :icon="Edit" @click="openRename(row)">
                  {{ t('files.btnRename') }}
                </el-button>

                <el-button size="small" type="danger" plain :icon="Delete" @click="onDelete(row)">
                  {{ t('files.btnDelete') }}
                </el-button>
              </template>
            </template>

            <template v-else>
              <el-button size="small" :icon="Download" @click="handleDownloadFile(row)">
                {{ t('files.btnDownload') }}
              </el-button>

              <template v-if="row.canManage">
                <el-button size="small" :icon="Edit" @click="openRename(row)">
                  {{ t('files.btnRename') }}
                </el-button>

                <el-upload
                  :action="`${apiBase}/files/${row.id}`"
                  :headers="authHeaders()"
                  :show-file-list="false"
                  :before-upload="beforeUpload"
                  :http-request="(opts) => replaceFile(row, opts)"
                >
                  <el-button size="small" :icon="RefreshRight">
                    {{ t('files.btnReplace') }}
                  </el-button>
                </el-upload>

                <el-button size="small" type="danger" plain :icon="Delete" @click="onDelete(row)">
                  {{ t('files.btnDelete') }}
                </el-button>
              </template>
            </template>
          </template>
        </el-table-column>

        <template #empty>
          <div class="table-empty">{{ t('common.noData') }}</div>
        </template>
      </el-table>

      <div class="pager">
        <el-pagination
          background
          layout="total, sizes, prev, pager, next, jumper"
          :page-size="pageSize"
          :page-sizes="[10, 20, 50, 100]"
          :current-page="page"
          :total="total"
          @size-change="(s) => { pageSize = s; page = 1; fetchList() }"
          @current-change="(p) => { page = p; fetchList() }"
        />
      </div>
    </el-card>

    <!-- Mobile Cards -->
    <el-card v-else shadow="never" class="list-card">
      <el-skeleton v-if="loading" :rows="6" animated />

      <template v-else>
        <el-empty v-if="!viewRows.length" :description="t('common.noData')" />

        <div v-else class="cards">
          <el-card
            v-for="row in viewRows"
            :key="row.id"
            shadow="never"
            class="file-card"
            :class="{
              selected: mobileSelectedIds.has(row.id),
              focused: isFocusedRow(row)
            }"
            @click="row.isFolder && openFolder(row)"
          >
            <div class="card-top">
              <div class="card-left">
                <el-checkbox
                  v-if="row.canManage"
                  :model-value="mobileSelectedIds.has(row.id)"
                  @click.stop
                  @change="(v) => toggleMobileSelect(row, v)"
                />
                <el-icon class="icon">
                  <Folder v-if="row.isFolder" />
                  <Document v-else />
                </el-icon>

                <div class="meta">
                  <div class="line1">
                    <span class="fname">{{ row.displayName || row.originalName }}</span>
                    <span v-if="!row.isFolder && row.ext" class="muted">.{{ row.ext }}</span>
                    <el-tag v-if="!row.canManage" size="small" effect="plain" type="info" class="pill mini">
                      {{ t('files.readonly') === 'files.readonly' ? '只讀' : t('files.readonly') }}
                    </el-tag>
                    <el-tag v-if="isFocusedRow(row)" size="small" type="success" effect="light" class="pill mini">
                      高亮
                    </el-tag>
                  </div>
                  <div class="line2 muted">
                    <el-tag size="small" effect="plain" class="pill mini">{{ catLabel(row.category || 'general') }}</el-tag>
                    <span class="dot">·</span>
                    <span v-if="row.isFolder">—</span>
                    <span v-else>{{ prettySize(row.size) }}</span>
                  </div>
                </div>
              </div>

              <el-dropdown trigger="click">
                <el-button class="btn-chip" plain :icon="MoreFilled" @click.stop />
                <template #dropdown>
                  <el-dropdown-menu>
                    <el-dropdown-item v-if="row.isFolder" @click.stop="openFolder(row)">
                      {{ t('files.btnOpenFolder') || '開啟' }}
                    </el-dropdown-item>

                    <el-dropdown-item v-else @click.stop="downloadFile(row)">
                      {{ t('files.btnDownload') }}
                    </el-dropdown-item>

                    <el-dropdown-item v-if="row.canManage" divided @click.stop="openRename(row)">
                      {{ t('files.btnRename') }}
                    </el-dropdown-item>

                    <el-dropdown-item v-if="row.canManage && !row.isFolder" disabled>
                      {{ t('files.btnReplace') }}（見下方按鈕）
                    </el-dropdown-item>

                    <el-dropdown-item v-if="row.canManage" @click.stop="onDelete(row)" divided>
                      {{ t('files.btnDelete') }}
                    </el-dropdown-item>
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
            </div>

            <div class="card-bottom">
              <div class="small muted">
                {{ row?.uploader?.name || row?.uploader?.username || '-' }}
                <span class="dot">·</span>
                {{ fmt(row.createdAt) }}
              </div>

              <div class="card-actions" @click.stop>
                <el-button
                  v-if="row.isFolder"
                  class="btn-full"
                  type="primary"
                  plain
                  :icon="FolderOpened"
                  @click="openFolder(row)"
                >
                  {{ t('files.btnOpenFolder') || '開啟' }}
                </el-button>

                <el-button
                  v-else
                  class="btn-full"
                  type="primary"
                  plain
                  :icon="Download"
                  @click="handleDownloadFile(row)"
                >
                  {{ t('files.btnDownload') }}
                </el-button>

                <el-upload
                  v-if="row.canManage && !row.isFolder"
                  :action="`${apiBase}/files/${row.id}`"
                  :headers="authHeaders()"
                  :show-file-list="false"
                  :before-upload="beforeUpload"
                  :http-request="(opts) => replaceFile(row, opts)"
                >
                  <el-button class="btn-full" plain :icon="RefreshRight">
                    {{ t('files.btnReplace') }}
                  </el-button>
                </el-upload>
              </div>
            </div>
          </el-card>
        </div>
      </template>

      <div class="pager center">
        <el-pagination
          background
          layout="prev, pager, next"
          :page-size="pageSize"
          :current-page="page"
          :total="total"
          @current-change="(p) => { page = p; fetchList() }"
        />
      </div>
    </el-card>

    <!-- rename dialog -->
    <el-dialog
      v-model="rename.visible"
      :title="t('files.renameDialogTitle')"
      :width="isMobile ? '100%' : '480px'"
      :fullscreen="isMobile"
      destroy-on-close
    >
      <el-form :model="rename" :label-width="isMobile ? 'auto' : '100px'" :label-position="isMobile ? 'top' : 'right'">
        <el-form-item :label="t('files.fieldDisplayName')">
          <el-input v-model.trim="rename.name" :placeholder="t('files.displayNamePlaceholder')" />
        </el-form-item>

        <el-form-item :label="t('files.fieldCategory')">
          <el-select v-model="rename.category" class="w-100">
            <el-option v-for="c in categoryOptions" :key="'e-' + c" :value="c" :label="catLabel(c)" />
          </el-select>
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button class="btn" @click="rename.visible = false">{{ t('common.cancel') }}</el-button>
        <el-button class="btn" type="primary" :icon="Check" @click="doRename">{{ t('common.save') }}</el-button>
      </template>
    </el-dialog>

    <!-- new folder dialog -->
    <el-dialog
      v-model="folderDialog.visible"
      :title="t('files.newFolderDialogTitle')"
      :width="isMobile ? '100%' : '420px'"
      :fullscreen="isMobile"
      destroy-on-close
    >
      <el-form :label-width="isMobile ? 'auto' : '100px'" :label-position="isMobile ? 'top' : 'right'">
        <el-form-item :label="t('files.fieldFolderName')">
          <el-input v-model.trim="folderDialog.name" :placeholder="t('files.folderNamePlaceholder')" />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button class="btn" @click="folderDialog.visible = false">{{ t('common.cancel') }}</el-button>
        <el-button class="btn" type="primary" :icon="Check" @click="createFolder">{{ t('common.save') }}</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch, reactive, onBeforeUnmount, nextTick } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  UploadFilled,
  Delete,
  Edit,
  Check,
  Download,
  Search,
  RefreshRight,
  Folder,
  FolderOpened,
  Document,
  FolderAdd,
  Tools,
  MoreFilled,
  Refresh,
} from '@element-plus/icons-vue'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'
import { apiBase, authHeaders, getToken, getUser, apiGet, apiPost, apiPut, apiDelete, downloadFile } from '@/api/client'

const { t, te } = useI18n()

function text (key, fallback, params) {
  if (te(key)) return t(key, params)
  if (!params) return fallback
  return String(fallback).replace(/\{(\w+)\}/g, (_, k) => String(params?.[k] ?? ''))
}
const route = useRoute()

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

/* categories */
const categoryOptions = ['general','SOP','Report','Machine','Image','Dataset','Other','OS','Driver','Firmware','認證']
const CAT_KEY_MAP = { Driver: 'driver', Firmware: 'firmware', 認證: 'cert', OS: 'os' }
const catLabel = (v) => {
  const val = v || 'general'
  const keyPart = CAT_KEY_MAP[val] || String(val).toLowerCase()
  const key = `files.categories.${keyPart}`
  const msg = t(key)
  return msg === key ? val : msg
}

/* token */

/* UI admin */
function decodeJwtPayload (tk) {
  try {
    if (!tk) return null
    const parts = tk.split('.')
    if (parts.length < 2) return null
    const b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    const json = decodeURIComponent(
      atob(b64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join(''),
    )
    return JSON.parse(json)
  } catch {
    return null
  }
}
const uiIsAdmin = computed(() => {
  const user = getUser()
  if (String(user?.role || '').toLowerCase() === 'admin') return true
  const p = decodeJwtPayload(getToken())
  return String(p?.role || '').toLowerCase() === 'admin'
})

/* state */
const loading = ref(false)
const rows = ref([])
const page = ref(1)
const pageSize = ref(20)
const total = ref(0)

const selection = ref([])
const mobileSelectedIds = reactive(new Set())

const keyword = ref('')
const catFilter = ref('')
const uploadCat = ref('general')

const currentFolder = ref(null)
const folderTrail = ref([])

/* ✅ multi focus */
const focusFileIds = reactive(new Set())

const rename = reactive({ visible: false, target: null, name: '', category: 'general' })
const folderDialog = reactive({ visible: false, name: '' })
const uploadProgress = reactive({ active: false, percent: 0 })
const replaceProgress = reactive({ active: false, percent: 0, name: '' })

const uploadPayload = computed(() => ({
  category: uploadCat.value,
  parentId: currentFolder.value ? currentFolder.value.id : '',
}))

const viewRows = computed(() => {
  if (!catFilter.value) return rows.value
  return rows.value.filter((r) => (r.category || 'general') === catFilter.value)
})

const selectedRows = computed(() => {
  if (!isMobile.value) return selection.value
  return rows.value.filter((r) => mobileSelectedIds.has(r.id))
})

const bulkDeleteDisabled = computed(() => {
  if (!selectedRows.value.length) return true
  return selectedRows.value.some((r) => !r?.canManage)
})

const focusedVisibleCount = computed(() => {
  return viewRows.value.filter((r) => focusFileIds.has(Number(r.id))).length
})

const folderCount = computed(() => rows.value.filter((r) => r.isFolder).length)
const fileCount = computed(() => rows.value.filter((r) => !r.isFolder).length)
const selectedCount = computed(() => selectedRows.value.length)

const selectableRow = (row) => !!row?.canManage
function toggleMobileSelect (row, checked) {
  if (!row?.canManage) return
  if (checked) mobileSelectedIds.add(row.id)
  else mobileSelectedIds.delete(row.id)
}

/* utils */
const fmt = (v) => {
  if (!v) return '-'
  const d = new Date(v)
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}
const prettySize = (b) => {
  const n = Number(b) || 0
  if (n < 1024) return `${n} B`
  if (n < 1024 ** 2) return `${(n / 1024).toFixed(1)} KB`
  if (n < 1024 ** 3) return `${(n / 1024 ** 2).toFixed(1)} MB`
  return `${(n / 1024 ** 3).toFixed(1)} GB`
}
function showNoPermission () {
  ElMessage.warning(
    t('files.message.noPermission') === 'files.message.noPermission'
      ? '只有上傳者或管理員可以操作'
      : t('files.message.noPermission'),
  )
}
function onHeaderCmd (cmd) {
  if (cmd === 'newFolder') return openCreateFolder()
  if (cmd === 'bulkDelete') return onBulkDelete()
  if (cmd === 'purgeOrphan') return purgeOrphanDisk()
  if (cmd === 'purgeLegacy') return purgeLegacyDeleted()
}

const blockedUploadExts = new Set(['.html', '.htm', '.svg', '.js', '.mjs', '.cjs', '.xml', '.xhtml'])

function getExt (name = '') {
  const s = String(name || '')
  const i = s.lastIndexOf('.')
  return i >= 0 ? s.slice(i).toLowerCase() : ''
}

function beforeUpload (file) {
  const ext = getExt(file?.name || '')
  if (blockedUploadExts.has(ext)) {
    ElMessage.error(`不允許上傳此檔案類型：${ext}`)
    return false
  }
  return true
}

function resetFocusFileIds () {
  focusFileIds.clear()
}
function setFocusFileIds (ids = []) {
  focusFileIds.clear()
  for (const id of ids) {
    const n = Number(id)
    if (Number.isFinite(n) && n > 0) {
      focusFileIds.add(n)
    }
  }
}
function isFocusedRow (row) {
  return focusFileIds.has(Number(row?.id))
}

/* ✅ row highlight */
function tableRowClassName ({ row }) {
  return isFocusedRow(row) ? 'target-row' : ''
}
async function scrollToFocused () {
  await nextTick()
  setTimeout(() => {
    const desktop = document.querySelector('.files-page .el-table .target-row')
    const mobile = document.querySelector('.files-page .file-card.focused')
    const el = desktop || mobile
    el?.scrollIntoView?.({ behavior: 'smooth', block: 'center' })
  }, 80)
}

/* ✅ query parse */
function getQueryInt (...keys) {
  const q = route.query || {}
  for (const k of keys) {
    const v = q[k]
    if (Array.isArray(v) && v.length) {
      const n = Number(v[0])
      if (Number.isFinite(n) && n > 0) return n
    }
    const n = Number(v)
    if (Number.isFinite(n) && n > 0) return n
  }
  try {
    const sp = new URLSearchParams(window.location.search || '')
    for (const k of keys) {
      const s = sp.get(k)
      const n = Number(s)
      if (Number.isFinite(n) && n > 0) return n
    }
  } catch {}
  return 0
}

function parseFileIdsQuery (...keys) {
  const q = route.query || {}

  for (const key of keys) {
    const raw = q[key]
    if (raw == null || raw === '') continue

    if (Array.isArray(raw)) {
      const nums = raw.map((x) => Number(x)).filter((n) => Number.isFinite(n) && n > 0)
      if (nums.length) return [...new Set(nums)]
      continue
    }

    const text = String(raw).trim()
    if (!text) continue

    try {
      const parsed = JSON.parse(text)
      if (Array.isArray(parsed)) {
        const nums = parsed.map((x) => Number(x)).filter((n) => Number.isFinite(n) && n > 0)
        if (nums.length) return [...new Set(nums)]
      }
    } catch {}

    const nums = text
      .split(',')
      .map((x) => Number(String(x).trim()))
      .filter((n) => Number.isFinite(n) && n > 0)

    if (nums.length) return [...new Set(nums)]
  }

  try {
    const sp = new URLSearchParams(window.location.search || '')
    for (const key of keys) {
      const raw = sp.get(key)
      if (!raw) continue

      try {
        const parsed = JSON.parse(raw)
        if (Array.isArray(parsed)) {
          const nums = parsed.map((x) => Number(x)).filter((n) => Number.isFinite(n) && n > 0)
          if (nums.length) return [...new Set(nums)]
        }
      } catch {}

      const nums = raw
        .split(',')
        .map((x) => Number(String(x).trim()))
        .filter((n) => Number.isFinite(n) && n > 0)

      if (nums.length) return [...new Set(nums)]
    }
  } catch {}

  return []
}

/* api */
async function fetchList () {
  loading.value = true
  try {
    const parentId = currentFolder.value ? currentFolder.value.id : ''
    const query = new URLSearchParams({
      keyword: keyword.value || '',
      page: String(page.value),
      pageSize: String(pageSize.value),
      parentId: String(parentId || ''),
    })
    const j = await apiGet(`/files?${query.toString()}`)
    const pack = j?.data || {}
    rows.value = Array.isArray(pack.rows) ? pack.rows : []
    total.value = Number(pack.count || 0)
    selection.value = []
    mobileSelectedIds.clear()
  } catch (e) {
    console.error(e)
    ElMessage.error(t('files.message.loadFailed'))
  } finally {
    loading.value = false
  }
}

function onSearch () {
  resetFocusFileIds()
  page.value = 1
  fetchList()
}
function reload () {
  resetFocusFileIds()
  fetchList()
}

/* ✅ 精準定位：GET /api/files/:id → 打開父資料夾 → 高亮全部對應檔案 */
async function fetchNodeById (id) {
  const rid = Number(id || 0)
  if (!rid) return null
  const j = await apiGet(`/files/${rid}`)
  if (!j?.success) throw new Error(j?.message || `GET /files/${rid} failed`)
  return j?.data || null
}

async function buildFolderTrailByParentId (parentId) {
  const chain = []
  let cursor = Number(parentId || 0)
  let guard = 0
  while (cursor && guard < 30) {
    const node = await fetchNodeById(cursor)
    if (!node) break
    chain.unshift(node)
    cursor = Number(node.parentId || 0)
    guard += 1
  }
  return chain
}

async function locateFileById (fileId) {
  return locateFilesByIds([fileId])
}

async function locateFilesByIds (fileIds = []) {
  resetFocusFileIds()
  catFilter.value = ''
  keyword.value = ''
  page.value = 1
  currentFolder.value = null
  folderTrail.value = []

  const ids = [...new Set((fileIds || []).map((x) => Number(x)).filter((x) => Number.isFinite(x) && x > 0))]
  if (!ids.length) return

  const nodes = []
  for (const id of ids) {
    try {
      const node = await fetchNodeById(id)
      if (node) nodes.push(node)
    } catch (e) {
      console.warn('fetchNodeById failed:', id, e)
    }
  }

  if (!nodes.length) return

  const firstFileNode = nodes.find((x) => !x?.isFolder) || nodes[0]

  if (firstFileNode?.isFolder) {
    const parentChain = await buildFolderTrailByParentId(firstFileNode.parentId)
    folderTrail.value = [...parentChain, firstFileNode]
    currentFolder.value = firstFileNode
    page.value = 1
    await fetchList()
    setFocusFileIds([Number(firstFileNode.id)])
    await scrollToFocused()
    return
  }

  const baseParentId = Number(firstFileNode.parentId || 0)
  const chain = await buildFolderTrailByParentId(baseParentId)
  folderTrail.value = chain
  currentFolder.value = chain.length ? chain[chain.length - 1] : null

  page.value = 1
  await fetchList()

  const visibleIds = nodes
    .filter((x) => Number(x?.parentId || 0) === baseParentId)
    .map((x) => Number(x.id))
    .filter((x) => Number.isFinite(x) && x > 0)

  setFocusFileIds(visibleIds)

  const hiddenCount = Math.max(nodes.length - visibleIds.length, 0)
  if (hiddenCount > 0) {
    ElMessage.info(`已開啟第一個附件所在資料夾，另有 ${hiddenCount} 個檔案位於其他資料夾未一併顯示`)
  }

  await scrollToFocused()
}

/* ✅ route query：有 fileIds 就優先走多檔定位，有 fileId 就走單檔定位 */
async function applyRouteQuery () {
  const q = route.query || {}
  const fromKeyword = typeof q.keyword === 'string' ? q.keyword.trim() : ''
  const folderName = typeof q.folder === 'string' ? q.folder.trim() : ''

  const fileIds = parseFileIdsQuery('fileIds', 'fileids', 'fids')
  const fileId = getQueryInt('fileId', 'fileid', 'fieldId', 'fieldid', 'fid')

  if (fileIds.length > 0) {
    try {
      await locateFilesByIds(fileIds)
      return
    } catch (e) {
      console.warn('locateFilesByIds failed, fallback:', e)
    }
  }

  if (fileId > 0) {
    try {
      await locateFileById(fileId)
      return
    } catch (e) {
      console.warn('locateFileById failed, fallback:', e)
    }
  }

  // fallback：沒有 fileId/fileIds 才用 folder/keyword
  resetFocusFileIds()
  page.value = 1
  currentFolder.value = null
  folderTrail.value = []
  keyword.value = ''

  await fetchList()

  if (folderName) {
    const target = rows.value.find(
      (r) => r.isFolder && (r.displayName === folderName || r.originalName === folderName),
    )
    if (target) await openFolder(target)
  }

  if (fromKeyword) {
    keyword.value = fromKeyword
    page.value = 1
    await fetchList()
  }
}

/* folders */
async function goRoot () {
  resetFocusFileIds()
  folderTrail.value = []
  currentFolder.value = null
  page.value = 1
  await fetchList()
}
async function openFolder (row) {
  if (!row || !row.isFolder) return
  resetFocusFileIds()
  folderTrail.value = [...folderTrail.value, row]
  currentFolder.value = row
  page.value = 1
  await fetchList()
}
async function jumpToFolder (idx) {
  resetFocusFileIds()
  const target = folderTrail.value[idx]
  if (!target) return goRoot()
  folderTrail.value = folderTrail.value.slice(0, idx + 1)
  currentFolder.value = target
  page.value = 1
  await fetchList()
}

/* upload progress */
function onUploadStart () { uploadProgress.active = true; uploadProgress.percent = 0 }
function onUploadProgress (event) { uploadProgress.active = true; uploadProgress.percent = Math.round(event?.percent ?? 0) }
function resetUploadProgress () { uploadProgress.active = false; uploadProgress.percent = 0 }
function onUploadSuccess (_response, _file, fileList) {
  const allSuccess = Array.isArray(fileList) ? fileList.every((f) => f.status === 'success') : true
  if (allSuccess) setTimeout(resetUploadProgress, 250)
  ElMessage.success(t('files.message.uploadSuccess'))
  fetchList()
}
function onUploadError () { resetUploadProgress(); ElMessage.error(t('files.message.uploadFailed')) }

/* download */
async function handleDownloadFile (row) {
  if (row.isFolder) return
  try {
    await downloadFile(`/files/${row.id}/download`, row.displayName || row.originalName || 'download')
  } catch (e) {
    console.error(e)
    ElMessage.error(t('files.message.downloadFailed'))
  }
}

/* rename */
function openRename (row) {
  if (!row?.canManage) return showNoPermission()
  rename.visible = true
  rename.target = row
  rename.name = row.displayName || row.originalName
  rename.category = row.category || 'general'
}
async function doRename () {
  const tRow = rename.target
  if (!tRow) return
  if (!tRow?.canManage) return showNoPermission()

  try {
    await apiPut(`/files/${tRow.id}`, {
      displayName: rename.name,
      category: rename.category,
    })
    ElMessage.success(t('files.message.updateSuccess'))
    rename.visible = false
    await fetchList()
  } catch (e) {
    console.error(e)
    if (Number(e?.status) === 403) return showNoPermission()
    ElMessage.error(t('files.message.updateFailed'))
  }
}

/* replace file */
async function replaceFile (row, options) {
  if (row.isFolder) return
  if (!row?.canManage) return showNoPermission()

  const { file, onProgress, onError, onSuccess } = options

  try {
    const fd = new FormData()
    fd.append('file', file)
    fd.append('category', row.category || 'general')

    replaceProgress.active = true
    replaceProgress.percent = 0
    replaceProgress.name = row.displayName || row.originalName

    await new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest()
      xhr.open('PUT', `${apiBase}/files/${row.id}`)
      const headers = authHeaders()
      Object.entries(headers).forEach(([k, v]) => xhr.setRequestHeader(k, v))

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          const percent = Math.round((e.loaded * 100) / e.total)
          replaceProgress.percent = percent
          onProgress && onProgress({ percent })
        }
      }
      xhr.onload = () => {
        if (xhr.status === 403) return reject(new Error('FORBIDDEN'))
        if (xhr.status >= 200 && xhr.status < 300) resolve(xhr.response)
        else reject(new Error(`HTTP ${xhr.status}`))
      }
      xhr.onerror = () => reject(new Error('network-error'))
      xhr.send(fd)
    })

    replaceProgress.active = false
    replaceProgress.percent = 0
    replaceProgress.name = ''

    ElMessage.success(t('files.message.replaceSuccess'))
    onSuccess && onSuccess()
    fetchList()
  } catch (e) {
    console.error(e)
    replaceProgress.active = false
    replaceProgress.percent = 0
    replaceProgress.name = ''

    if (String(e?.message || '').includes('FORBIDDEN')) showNoPermission()
    else ElMessage.error(t('files.message.replaceFailed'))
    onError && onError(e)
  }
}

/* delete */
async function onDelete (row) {
  if (!row?.canManage) return showNoPermission()
  try {
    await ElMessageBox.confirm(
      t('files.confirm.deleteSingle', { name: row.displayName || row.originalName }),
      t('files.confirm.titleSingle'),
      { type: 'warning' },
    )
  } catch { return }

  try {
    await apiDelete(`/files/${row.id}`)
    ElMessage.success(t('files.message.deleteSuccess'))
    fetchList()
  } catch (e) {
    console.error(e)
    if (Number(e?.status) === 403) return showNoPermission()
    ElMessage.error(t('files.message.deleteFailed'))
  }
}

async function onBulkDelete () {
  if (bulkDeleteDisabled.value) return

  try {
    await ElMessageBox.confirm(
      t('files.confirm.deleteMultiple', { count: selectedRows.value.length }),
      t('files.confirm.titleMultiple'),
      { type: 'warning' },
    )
  } catch { return }

  try {
    const ids = selectedRows.value.map((x) => x.id)
    await apiPost('/files/bulk-delete', { ids })

    ElMessage.success(t('files.message.deleteSuccess'))
    selection.value = []
    mobileSelectedIds.clear()
    fetchList()
  } catch (e) {
    console.error(e)
    if (Number(e?.status) === 403) return showNoPermission()
    ElMessage.error(t('files.message.deleteFailed'))
  }
}

/* create folder */
function openCreateFolder () {
  folderDialog.visible = true
  folderDialog.name = ''
}
async function createFolder () {
  const name = String(folderDialog.name || '').trim()
  if (!name) {
    ElMessage.warning(t('files.message.folderNameRequired') || '請輸入資料夾名稱')
    return
  }

  try {
    const body = { name, parentId: currentFolder.value ? currentFolder.value.id : null }
    const j = await apiPost('/files/folders', body)
    if (!j?.success) throw new Error(j?.message || 'create-failed')
    ElMessage.success(t('files.message.createFolderSuccess') || '資料夾已建立')
    folderDialog.visible = false
    fetchList()
  } catch (e) {
    console.error(e)
    ElMessage.error(t('files.message.createFolderFailed') || '建立資料夾失敗')
  }
}

/* maintenance */
async function purgeOrphanDisk () {
  if (!uiIsAdmin.value) return ElMessage.warning('需要 admin 權限')

  let days = 7
  try {
    const { value } = await ElMessageBox.prompt(
      '只刪除「DB 沒記錄」且 mtime 超過 N 天的孤兒檔案。\n請輸入 N（天，建議 7）：',
      '清理孤兒檔案（磁碟）',
      {
        confirmButtonText: '開始清理',
        cancelButtonText: '取消',
        inputValue: String(days),
        inputPattern: /^\d+$/,
        inputErrorMessage: '請輸入非負整數',
      },
    )
    days = Number(value)
  } catch { return }

  try {
    const j = await apiPost('/files/maintenance/purge-orphan-disk', { days })
    if (!j?.success) throw new Error(j?.message || 'purge-failed')
    const d = j?.data || {}
    ElMessage.success(`清理完成：deleted=${d.deleted ?? 0}, skipped=${d.skipped ?? 0}`)
  } catch (e) {
    console.error(e)
    ElMessage.error('清理失敗（請確認你是 admin）')
  }
}

async function purgeLegacyDeleted () {
  if (!uiIsAdmin.value) return ElMessage.warning('需要 admin 權限')

  let days = 0
  try {
    const { value } = await ElMessageBox.prompt(
      '清理歷史遺留 isDeleted=true 的資料（永久刪除：本機 + DB）。\n輸入 days：0=全部清，或輸入 N 只清 updatedAt 超過 N 天的。',
      '清理舊 isDeleted=true（DB 遺留）',
      {
        confirmButtonText: '開始清理',
        cancelButtonText: '取消',
        inputValue: String(days),
        inputPattern: /^\d+$/,
        inputErrorMessage: '請輸入非負整數',
      },
    )
    days = Number(value)
  } catch { return }

  try {
    const j = await apiPost('/files/maintenance/purge-legacy-deleted', { days })
    if (!j?.success) throw new Error(j?.message || 'purge-failed')
    const d = j?.data || {}
    ElMessage.success(`清理完成：deletedRoots=${d.deletedRoots ?? 0}`)
    fetchList()
  } catch (e) {
    console.error(e)
    ElMessage.error('清理失敗（請確認你是 admin）')
  }
}

onMounted(() => {
  cleanupMql = setupMql()
  applyRouteQuery()
})

onBeforeUnmount(() => {
  if (cleanupMql) cleanupMql()
})

watch(
  () => route.fullPath,
  () => applyRouteQuery(),
)
</script>

<style scoped>
.files-page-vivid{
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  color: var(--el-text-color-primary);
}

.muted{ color: var(--el-text-color-secondary); }
.ctrl{ border-radius: 12px; }
.btn{ border-radius: 12px; }
.pill{ border-radius: 999px; }
.pill.mini{ font-size: 12px; padding: 2px 10px; }
.w-160{ width: 160px; }
.w-100{ width: 100%; }
.w-search{ width: 280px; max-width: 100%; }

.hero-card,
.tool-card,
.list-card{
  border: 1px solid var(--el-border-color-light);
  border-radius: 22px;
  background:
    radial-gradient(circle at top right, color-mix(in srgb, var(--el-color-primary) 12%, transparent) 0%, transparent 34%),
    linear-gradient(180deg, color-mix(in srgb, var(--el-bg-color) 94%, var(--el-color-primary-light-9) 6%) 0%, var(--el-bg-color) 100%);
  box-shadow: 0 18px 48px rgba(0,0,0,0.06);
}

.hero-card{
  padding: 20px;
  overflow: hidden;
  position: relative;
}
.hero-card::after{
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

.hero-main{
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap: 18px;
  margin-bottom: 18px;
}
.hero-left{
  display:flex;
  align-items:center;
  gap: 14px;
  min-width: 0;
}
.hero-icon-wrap{
  width: 66px;
  height: 66px;
  border-radius: 20px;
  display:grid;
  place-items:center;
  background: linear-gradient(135deg, var(--el-color-primary-light-7), var(--el-color-primary-light-9));
  border: 1px solid color-mix(in srgb, var(--el-color-primary) 25%, var(--el-border-color-light));
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.5);
}
.hero-icon{ font-size: 30px; }
.hero-copy{ min-width: 0; }
.hero-eyebrow{
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.08em;
  color: var(--el-color-primary);
  margin-bottom: 4px;
}
.hero-title{
  margin: 0;
  font-size: 30px;
  font-weight: 800;
  line-height: 1.15;
}
.hero-subtitle{
  margin-top: 6px;
  color: var(--el-text-color-secondary);
  font-size: 14px;
}
.hero-actions{
  display:flex;
  align-items:center;
  justify-content:flex-end;
  gap: 10px;
  flex-wrap:wrap;
}

.stats-grid{
  display:grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}
.stat-card{
  padding: 14px 16px;
  border-radius: 18px;
  background: color-mix(in srgb, var(--el-fill-color-light) 88%, white 12%);
  border: 1px solid var(--el-border-color-lighter);
}
.stat-primary{
  background: linear-gradient(135deg, var(--el-color-primary-light-8), var(--el-color-primary-light-9));
  border-color: color-mix(in srgb, var(--el-color-primary) 35%, var(--el-border-color));
}
.stat-label{
  color: var(--el-text-color-secondary);
  font-size: 12px;
  margin-bottom: 6px;
}
.stat-value{
  font-size: 28px;
  font-weight: 800;
  line-height: 1;
}

.folder-bar{
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap: 10px;
  padding: 10px 12px;
  border: 1px dashed var(--el-border-color);
  border-radius: 14px;
  background: color-mix(in srgb, var(--el-fill-color-light) 84%, white 16%);
}
.crumbs{ overflow-x: auto; white-space: nowrap; flex: 1; }
.crumb-link{ cursor: pointer; }
.crumb-link:hover{ text-decoration: underline; }
.crumb-actions{ flex: 0 0 auto; display:flex; align-items:center; gap: 8px; flex-wrap: wrap; }

.tool-grid{
  display: grid;
  grid-template-columns: 260px 1fr 320px;
  gap: 14px;
  align-items: start;
}
.tool-block .label{
  font-weight: 800;
  margin-bottom: 8px;
  color: var(--el-text-color-regular);
}
.right-block{
  display:flex;
  flex-direction: column;
  gap: 10px;
  align-items: flex-start;
}
.tool-actions{ display:flex; gap: 10px; flex-wrap: wrap; }
.hint{ font-size: 12px; }
.upload{ width: 100%; }

.progress-row{
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border: 1px solid var(--el-border-color);
  border-radius: 14px;
  background: color-mix(in srgb, var(--el-fill-color-light) 90%, white 10%);
}
.progress-label{ font-size: 13px; white-space: nowrap; }
.progress-file-name{ margin-left: 6px; font-weight: 700; }

.section-head{
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap: 12px;
  flex-wrap: wrap;
}
.section-title{
  font-size: 18px;
  font-weight: 800;
  line-height: 1.2;
}
.section-subtitle{
  margin-top: 4px;
  font-size: 13px;
  color: var(--el-text-color-secondary);
}

.table-empty{ padding: 70px 0; text-align:center; opacity: .75; }

.tbl :deep(.el-table__header-wrapper th){ background: var(--el-fill-color-light); }

.name{ display:flex; align-items:flex-start; gap: 10px; }
.name-icon{ margin-top: 2px; }
.name-text{ min-width: 0; }
.primary{ display:flex; align-items:center; gap: 8px; flex-wrap: wrap; }
.secondary{ margin-top: 3px; font-size: 12px; }
.dot{ margin: 0 6px; opacity: .55; }
.name.clickable{ cursor: pointer; }
.name.clickable .primary b:hover{ text-decoration: underline; }
.readonly-tag{ margin-left: 2px; }

.pager{ display:flex; justify-content:flex-end; padding-top: 12px; }
.pager.center{ justify-content:center; }

:deep(.el-table .target-row > td){
  background: color-mix(in srgb, var(--el-color-success) 12%, white) !important;
}
:deep(.el-table .target-row:hover > td){
  background: color-mix(in srgb, var(--el-color-success) 18%, white) !important;
}

.cards{ display:grid; gap: 12px; }
.file-card{
  border-radius: 18px;
  border: 1px solid var(--el-border-color-lighter);
  background: var(--el-bg-color);
}
.file-card.selected{
  border-color: var(--el-color-primary);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--el-color-primary) 20%, transparent);
}
.file-card.focused{
  border-color: var(--el-color-success);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--el-color-success) 22%, transparent);
}
.card-top{ display:flex; align-items:flex-start; justify-content:space-between; gap: 10px; }
.card-left{ display:flex; align-items:flex-start; gap: 10px; flex: 1; min-width: 0; }
.icon{ font-size: 18px; margin-top: 2px; opacity: .9; }
.meta{ min-width: 0; }
.line1{ display:flex; align-items:center; gap: 8px; flex-wrap: wrap; }
.fname{
  font-weight: 900;
  font-size: 14px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 56vw;
}
.line2{
  margin-top: 6px;
  font-size: 12px;
  display:flex;
  align-items:center;
  gap: 6px;
  flex-wrap: wrap;
}
.btn-chip{ border-radius: 999px; }
.card-bottom{ margin-top: 10px; }
.small{ font-size: 12px; }
.card-actions{ margin-top: 10px; display:flex; gap: 10px; }
.btn-full{ flex: 1; border-radius: 12px; }

@media (max-width: 980px){
  .tool-grid{ grid-template-columns: 1fr; }
}

@media (max-width: 900px){
  .w-search{ width: 240px; }
}

@media (max-width: 768px){
  .files-page-vivid{
    padding: 12px;
    gap: 12px;
  }

  .hero-card{
    padding: 16px;
  }

  .hero-main{
    flex-direction: column;
    align-items: stretch;
  }

  .hero-actions{
    justify-content: flex-start;
  }

  .w-search,
  .w-160{ width: 100%; }

  .folder-bar{
    flex-direction: column;
    align-items: stretch;
  }

  .pager{ justify-content:center; }
}

@media (max-width: 640px){
  .hero-left{
    align-items: flex-start;
  }

  .hero-title{
    font-size: 24px;
  }

  .stats-grid{
    grid-template-columns: 1fr;
  }

  .hero-actions :deep(.el-button),
  .tool-actions :deep(.el-button),
  .card-actions{
    width: 100%;
  }

  .card-actions{
    flex-direction: column;
  }

  .fname{
    max-width: 48vw;
  }
}
</style>