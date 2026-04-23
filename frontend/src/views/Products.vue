<!-- frontend/src/views/Products.vue -->
<template>
  <div class="page">
    <!-- Header -->
    <div class="header-bar">
      <div class="left">
        <h2>📦 {{ t('productsPage.title') }}</h2>
        <el-tag type="info" effect="dark">{{ t('productsPage.tagV2') }}</el-tag>
      </div>

      <div class="right">
        <el-input
          v-model="q.keyword"
          :placeholder="t('productsPage.searchPlaceholder')"
          clearable
          style="width: 280px"
        >
          <template #prefix><el-icon><Search /></el-icon></template>
        </el-input>

        <el-switch
          v-model="q.includeDeleted"
          inline-prompt
          :active-text="t('productsPage.filterIncludeDeleted')"
          :inactive-text="t('productsPage.filterNormal')"
          @change="() => { q.page = 1; fetchData() }"
        />

        <el-button :icon="Refresh" @click="fetchData" :loading="loading">
          {{ t('common.refresh') }}
        </el-button>

        <el-dropdown>
          <el-button :icon="Finished" plain>{{ densityLabel }}</el-button>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item :disabled="tableSize === 'small'" @click="tableSize = 'small'">
                {{ t('dashboard.sizeCompact') }}
              </el-dropdown-item>
              <el-dropdown-item :disabled="tableSize === 'default'" @click="tableSize = 'default'">
                {{ t('dashboard.sizeDefault') }}
              </el-dropdown-item>
              <el-dropdown-item :disabled="tableSize === 'large'" @click="tableSize = 'large'">
                {{ t('dashboard.sizeComfortable') }}
              </el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>

        <el-button type="primary" :icon="Plus" @click="openEdit()">
          {{ t('common.add') }}
        </el-button>
      </div>
    </div>

    <!-- Table -->
    <el-card shadow="never">
      <el-table
        :data="rows"
        :size="tableSize"
        border
        stripe
        v-loading="loading"
        height="62vh"
        :row-key="(row) => row.id"
        :row-class-name="({ row }) => (row?.isDeleted ? 'is-deleted' : '')"
      >
        <el-table-column type="index" :label="t('productsPage.colIndex')" width="64" />
        <el-table-column prop="name" :label="t('productsPage.colName')" min-width="220" show-overflow-tooltip />
        <el-table-column prop="model" :label="t('productsPage.colModel')" width="180" show-overflow-tooltip />

        <!-- 測試類型 -->
        <el-table-column :label="tSafe('productsPage.colTestType', '類型')" width="140" align="center">
          <template #default="{ row }">
            <el-tag effect="plain">
              {{ getTestTypeShort(row?.testType ?? row?.test_type) }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column prop="creator" :label="t('productsPage.colCreator')" width="160">
          <template #default="{ row }">
            {{ row?.creator?.name || row?.creator?.username || '-' }}
          </template>
        </el-table-column>

        <!-- 進度 -->
        <el-table-column :label="t('productsPage.colProgress')" width="220">
          <template #default="{ row }">
            <div class="prog">
              <el-progress
                :percentage="getProgressPercent(row)"
                :stroke-width="10"
                :format="formatPercent"
                style="flex: 1"
              />

              <el-tooltip v-if="getDbTooltip(row)" :content="getDbTooltip(row)" placement="top">
                <small class="muted">
                  {{ getProgressFinished(row) }} / {{ getProgressTotal(row) }}
                </small>
              </el-tooltip>

              <small v-else class="muted">
                {{ getProgressFinished(row) }} / {{ getProgressTotal(row) }}
              </small>
            </div>
          </template>
        </el-table-column>

        <!-- 測試工時（未完成/總） -->
        <el-table-column :label="tSafe('productsPage.colTestHours', '測試工時')" width="180" align="center">
          <template #default="{ row }">
            <el-tooltip v-if="getHoursDbTooltip(row)" :content="getHoursDbTooltip(row)" placement="top">
              <el-tag type="info" effect="plain">
                {{ formatHoursPair(getHoursShownRemain(row), getHoursShownTotal(row)) }}
              </el-tag>
            </el-tooltip>

            <el-tag v-else type="info" effect="plain">
              {{ formatHoursPair(getHoursShownRemain(row), getHoursShownTotal(row)) }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column :label="t('productsPage.colCreatedAt')" width="200">
          <template #default="{ row }">
            <el-tag effect="plain">{{ formatTime(row.createdAt) }}</el-tag>
          </template>
        </el-table-column>

        <el-table-column :label="t('productsPage.colStatus')" width="110">
          <template #default="{ row }">
            <el-tag :type="row?.isDeleted ? 'danger' : 'success'" effect="plain">
              {{ row?.isDeleted ? t('productsPage.statusDeleted') : t('productsPage.statusNormal') }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column :label="t('common.actions')" width="360" fixed="right" align="right">
          <template #default="{ row }">
            <el-button
              size="small"
              type="success"
              plain
              :icon="VideoPlay"
              @click="toTest(row)"
              :disabled="!!row?.isDeleted"
            >
              {{ t('productsPage.btnTest') }}
            </el-button>

            <el-button
              size="small"
              type="primary"
              plain
              :icon="Edit"
              @click="openEdit(row)"
              :disabled="!!row?.isDeleted"
            >
              {{ t('common.edit') }}
            </el-button>

            <template v-if="!row?.isDeleted">
              <el-popconfirm :title="t('productsPage.confirmDeleteSoft')" @confirm="toDelete(row)">
                <template #reference>
                  <el-button size="small" type="danger" plain :icon="Delete">
                    {{ t('common.delete') }}
                  </el-button>
                </template>
              </el-popconfirm>
            </template>

            <template v-else>
              <el-button size="small" type="warning" plain :icon="RefreshLeft" @click="toRestore(row)">
                {{ t('productsPage.btnRestore') }}
              </el-button>
            </template>
          </template>
        </el-table-column>
      </el-table>

      <!-- Pagination -->
      <div class="pagination">
        <el-pagination
          background
          layout="prev, pager, next, sizes, total"
          :total="total"
          :current-page="q.page"
          :page-size="q.pageSize"
          :page-sizes="[10, 20, 50, 100]"
          @current-change="(n) => { q.page = n; fetchData() }"
          @size-change="(s) => { q.pageSize = s; q.page = 1; fetchData() }"
        />
      </div>
    </el-card>

    <!-- Dialog -->
    <el-dialog
      v-model="dlg.visible"
      :title="dlg.data?.id ? t('productsPage.dialogEditTitle') : t('productsPage.dialogNewTitle')"
      width="560px"
      :close-on-click-modal="false"
    >
      <el-form :model="dlg.data" :rules="rules" ref="formRef" label-width="100px">
        <el-form-item :label="t('productsPage.fieldName')" prop="name">
          <el-input v-model.trim="dlg.data.name" maxlength="200" show-word-limit />
        </el-form-item>

        <el-form-item :label="t('productsPage.fieldModel')" prop="model">
          <el-input v-model.trim="dlg.data.model" maxlength="100" show-word-limit />
        </el-form-item>

        <!-- only create：測試類型 -->
        <el-form-item
          v-if="!dlg.data.id"
          :label="tSafe('productsPage.fieldTestType', '測試類型')"
          prop="testType"
        >
          <el-radio-group v-model="dlg.data.testType" style="width: 100%">
            <el-radio-button label="x86">
              {{ tSafe('productsPage.testTypeX86', 'System (x86)') }}
            </el-radio-button>
            <el-radio-button label="arm">
              {{ tSafe('productsPage.testTypeArm', 'System (ARM)') }}
            </el-radio-button>
            <el-radio-button label="display">
              {{ tSafe('productsPage.testTypeDisplay', '顯示器 (Display)') }}
            </el-radio-button>
            <el-radio-button label="part">
              {{ tSafe('productsPage.testTypePart', '物件 (PartTest)') }}
            </el-radio-button>
          </el-radio-group>

          <div style="margin-top: 6px; font-size: 12px; color: var(--el-text-color-secondary);">
            {{ getTestTypeHint(dlg.data.testType) }}
          </div>
        </el-form-item>

        <!-- 編輯時顯示但不可改 -->
        <el-form-item v-else :label="tSafe('productsPage.fieldTestType', '測試類型')">
          <el-tag effect="plain">
            {{ getTestTypeLabel(dlg.data.testType || 'x86') }}
          </el-tag>
        </el-form-item>

        <!-- only create -->
        <el-form-item v-if="!dlg.data.id" :label="t('productsPage.fieldDefaultTestSet')">
          <el-select
            v-model="dlg.data.testSetId"
            :placeholder="t('productsPage.defaultTestSetPlaceholder')"
            clearable
            filterable
            style="width: 100%"
          >
            <el-option
              v-for="s in testSets"
              :key="s.id"
              :label="`${s.name}（${s.description || ''}）`"
              :value="s.id"
            />
          </el-select>
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="dlg.visible = false">{{ t('common.cancel') }}</el-button>
        <el-button type="primary" :loading="dlg.loading" :icon="Check" @click="save">
          {{ t('common.save') }}
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, watch, computed, onActivated, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { ElMessage } from 'element-plus'
import {
  Plus,
  Refresh,
  Search,
  Edit,
  Delete,
  Check,
  VideoPlay,
  Finished,
  RefreshLeft,
} from '@element-plus/icons-vue'
import getApiBase from '../utils/apiBase'

const router = useRouter()
const apiBase = getApiBase()
const { t, te } = useI18n()

const q = reactive({ page: 1, pageSize: 20, keyword: '', includeDeleted: false })
const rows = ref([])
const total = ref(0)
const loading = ref(false)
const tableSize = ref('default')

const densityLabel = computed(() => {
  if (tableSize.value === 'small') return t('dashboard.sizeCompact')
  if (tableSize.value === 'large') return t('dashboard.sizeComfortable')
  return t('dashboard.sizeDefault')
})

const dlg = reactive({
  visible: false,
  loading: false,
  data: { id: null, name: '', model: '', testSetId: '', testType: 'x86' },
})
const formRef = ref()
const testSets = ref([])

const rules = computed(() => ({
  name: [{ required: true, message: t('productsPage.rules.nameRequired'), trigger: 'blur' }],
  model: [{ required: true, message: t('productsPage.rules.modelRequired'), trigger: 'blur' }],
  testType: [{ required: true, message: tSafe('productsPage.rules.testTypeRequired', '請選擇測試類型'), trigger: 'change' }],
}))

function tSafe(key, fallback) {
  try {
    if (typeof te === 'function' && te(key)) return t(key)
  } catch {}
  return fallback
}

function normalizeUiTestType(v) {
  const s = String(v ?? 'x86').trim().toLowerCase()
  if (['part', 'parts', 'object', 'component', 'device'].includes(s)) return 'part'
  if (['arm'].includes(s)) return 'arm'
  if (['display', 'disp', 'monitor', 'screen'].includes(s)) return 'display'
  return 'x86'
}

function getTestTypeShort(v) {
  const type = normalizeUiTestType(v)
  if (type === 'part') return tSafe('productsPage.testTypePartShort', 'Part')
  if (type === 'display') return tSafe('productsPage.testTypeDisplayShort', 'Display')
  if (type === 'arm' || type === 'x86') return tSafe('productsPage.testTypeSystemShort', 'System')
  return tSafe('productsPage.testTypeSystemShort', 'System')
}

function getTestTypeLabel(v) {
  const type = normalizeUiTestType(v)
  if (type === 'part') return tSafe('productsPage.testTypePart', '物件 (PartTest)')
  if (type === 'display') return tSafe('productsPage.testTypeDisplay', '顯示器 (Display)')
  if (type === 'arm') return tSafe('productsPage.testTypeArm', 'System (ARM)')
  return tSafe('productsPage.testTypeX86', 'System (x86)')
}

function getTestTypeHint(v) {
  const type = normalizeUiTestType(v)
  if (type === 'part') {
    return tSafe('productsPage.testTypeHintPart', '建立後「開始測試」會進入硬碟/記憶體測試報告。')
  }
  if (type === 'display') {
    return tSafe('productsPage.testTypeHintDisplay', '建立後「開始測試」會進入顯示器測試報告頁。')
  }
  if (type === 'arm') {
    return tSafe('productsPage.testTypeHintArm', '建立後「開始測試」會進入 System（ARM）測試報告頁。')
  }
  return tSafe('productsPage.testTypeHintX86', '建立後「開始測試」會進入 System（x86）測試報告頁。')
}

function num(v, def = 0) {
  const n = Number(v)
  return Number.isFinite(n) ? n : def
}

function authHeaders() {
  const token = localStorage.getItem('token') || sessionStorage.getItem('token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

function handleAuth(res) {
  if (res.status === 401) {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    sessionStorage.removeItem('token')
    sessionStorage.removeItem('user')
    ElMessage.warning(t('auth.sessionExpired'))
    router.push('/login')
    return true
  }
  return false
}

function formatTime(v) {
  if (!v) return '-'
  const d = new Date(v)
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/* ---------------- 進度（Shown） ---------------- */
function normalizeProgress(row) {
  let p =
    row?.progressShown ??
    row?.progress_shown ??
    row?.shownProgress ??
    row?.shown_progress ??
    row?.progress ?? row?.testProgress ?? row?.progressInfo ?? row?.progress_data

  if (typeof p === 'string') {
    try { p = JSON.parse(p) } catch {}
  }

  const finished = num(
    p?.finished ??
    p?.done ??
    row?.tcDoneShown ??
    row?.doneShown ??
    row?.finishedShown ??
    row?.finished ??
    row?.finishedCount ??
    0
  )

  const total = num(
    p?.total ??
    p?.all ??
    row?.tcTotalShown ??
    row?.totalShown ??
    row?.totalSelected ??
    row?.total ??
    row?.totalCount ??
    0
  )

  let percent = num(
    p?.percent ??
    row?.progressPctShown ??
    row?.progressPercent ??
    (typeof p === 'number' ? p : NaN),
    NaN
  )

  if (!Number.isFinite(percent)) {
    percent = total > 0 ? Math.round((finished * 1000) / total) / 10 : 0
  }

  percent = Math.max(0, Math.min(100, percent))
  return { finished, total, percent }
}

function getProgressPercent(row) { return normalizeProgress(row).percent }
function getProgressFinished(row) { return normalizeProgress(row).finished }
function getProgressTotal(row) { return normalizeProgress(row).total }

function formatPercent(p) {
  const n = Number(p)
  if (!Number.isFinite(n)) return '0%'
  const s = n % 1 === 0 ? String(n) : n.toFixed(1)
  return `${s}%`
}

/* ---------------- 進度（DB tooltip） ---------------- */
function normalizeProgressDb(row) {
  let p = row?.progressDb ?? row?.progress_db ?? row?.dbProgress ?? row?.db_progress
  if (typeof p === 'string') {
    try { p = JSON.parse(p) } catch {}
  }

  const finished = num(p?.finished ?? row?.tcDoneDb ?? row?.doneDb ?? 0)
  const total = num(p?.total ?? row?.tcTotalDb ?? row?.totalDb ?? 0)

  let percent = num(p?.percent ?? row?.progressPctDb ?? NaN, NaN)
  if (!Number.isFinite(percent)) {
    percent = total > 0 ? Math.round((finished * 1000) / total) / 10 : 0
  }
  percent = Math.max(0, Math.min(100, percent))
  return { finished, total, percent }
}

function getDbTooltip(row) {
  const db = normalizeProgressDb(row)
  if (!db.total) return ''
  const s = db.percent % 1 === 0 ? String(db.percent) : db.percent.toFixed(1)
  return `DB: ${db.finished} / ${db.total} (${s}%)`
}

/* ---------------- 測試工時（未完成/總） ---------------- */
function getHoursShownTotal(row) {
  return num(
    row?.testHoursTotal ??
    row?.testHoursShownTotal ??
    row?.hoursShown ??
    row?.totalTestHours ??
    row?.totalHours ??
    0
  )
}

function getHoursShownRemain(row) {
  const direct = num(
    row?.testHoursRemain ??
    row?.testHoursShownRemain ??
    row?.hoursShownRemain ??
    row?.remainHoursShown ??
    row?.remainingHoursShown ??
    0
  )
  if (direct > 0) return direct

  const total = getHoursShownTotal(row)
  const done = num(row?.testHoursDone ?? row?.testHoursShownDone ?? row?.hoursShownDone ?? 0)
  if (total > 0 && done > 0) return Math.max(0, Math.round((total - done) * 100) / 100)

  if (total <= 0) return 0
  const pct = num(getProgressPercent(row))
  const remain = total * (1 - pct / 100)
  return Math.max(0, Math.round(remain * 100) / 100)
}

function getHoursDbTotal(row) {
  return num(row?.testHoursDbTotal ?? row?.hoursDb ?? row?.totalHoursDb ?? 0)
}

function getHoursDbRemain(row) {
  const direct = num(row?.testHoursDbRemain ?? row?.hoursDbRemain ?? row?.remainHoursDb ?? row?.remainingHoursDb ?? 0)
  if (direct > 0) return direct

  const total = getHoursDbTotal(row)
  const done = num(row?.testHoursDbDone ?? row?.hoursDbDone ?? 0)
  if (total > 0 && done > 0) return Math.max(0, Math.round((total - done) * 100) / 100)

  if (total <= 0) return 0
  const db = normalizeProgressDb(row)
  const pct = num(db?.percent)
  const remain = total * (1 - pct / 100)
  return Math.max(0, Math.round(remain * 100) / 100)
}

function formatHoursPair(remain, total) {
  const t = num(total)
  if (t <= 0) return '-'
  const r = Math.max(0, num(remain))
  return `${r.toFixed(2)} / ${t.toFixed(2)} hr`
}

function getHoursDbTooltip(row) {
  const total = getHoursDbTotal(row)
  const remain = getHoursDbRemain(row)
  if (!total && !remain) return ''
  return `DB Hours: ${remain.toFixed(2)} / ${total.toFixed(2)} hr`
}

/* ---------------- 搜尋 debounce ---------------- */
const debounced = (fn, d = 350) => {
  let tId
  return (...a) => {
    clearTimeout(tId)
    tId = setTimeout(() => fn(...a), d)
  }
}

watch(
  () => q.keyword,
  debounced(() => {
    q.page = 1
    fetchData()
  }, 350)
)

async function fetchTestSets() {
  try {
    const res = await fetch(`${apiBase}/default-test-sets?includeDeleted=false`, { headers: authHeaders() })
    if (handleAuth(res)) return
    const j = await res.json().catch(() => [])
    testSets.value = Array.isArray(j) ? j : (j?.data || [])
  } catch {
    // 非關鍵：略過
  }
}

function unwrapListPayload(json) {
  const r = json?.rows || json?.data?.rows || json?.data || []
  const count = json?.total ?? json?.count ?? json?.data?.total ?? json?.data?.count
  return { rows: Array.isArray(r) ? r : [], total: Number.isFinite(Number(count)) ? Number(count) : null }
}

async function fetchData() {
  loading.value = true
  try {
    const params = new URLSearchParams({
      page: String(q.page),
      pageSize: String(q.pageSize),
      keyword: q.keyword || '',
      includeDeleted: String(!!q.includeDeleted),
    })

    const res = await fetch(`${apiBase}/products?${params.toString()}`, { headers: { ...authHeaders() } })
    if (handleAuth(res)) return

    const json = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(json?.message || t('productsPage.message.loadFailed'))

    const parsed = unwrapListPayload(json)
    rows.value = parsed.rows
    total.value = parsed.total ?? rows.value.length
  } catch (e) {
    console.error(e)
    ElMessage.error(e?.message || t('productsPage.message.loadFailed'))
  } finally {
    loading.value = false
  }
}

/** 依 testType 分流到各自獨立頁面 */
function toTest(row) {
  const type = normalizeUiTestType(row?.testType ?? row?.test_type)

  if (type === 'part') {
    router.push(`/products/${row.id}/part-test`)
    return
  }

  if (type === 'arm') {
    router.push(`/products/${row.id}/arm-test`)
    return
  }

  if (type === 'display') {
    router.push(`/products/${row.id}/display-test`)
    return
  }

  router.push(`/products/${row.id}/test`)
}

function openEdit(row) {
  dlg.visible = true
  dlg.loading = false
  dlg.data = row
    ? {
        id: row.id,
        name: row.name,
        model: row.model,
        testSetId: '',
        testType: normalizeUiTestType(row.testType ?? row.test_type),
      }
    : { id: null, name: '', model: '', testSetId: '', testType: 'x86' }
}

async function save() {
  await formRef.value?.validate()
  dlg.loading = true
  try {
    const method = dlg.data.id ? 'PUT' : 'POST'
    const url = dlg.data.id ? `${apiBase}/products/${dlg.data.id}` : `${apiBase}/products`

    const body = dlg.data.id
      ? { name: dlg.data.name, model: dlg.data.model }
      : {
          name: dlg.data.name,
          model: dlg.data.model,
          testSetId: dlg.data.testSetId || undefined,
          testType: normalizeUiTestType(dlg.data.testType || 'x86'),
        }

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify(body),
    })
    if (handleAuth(res)) return

    const j = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(j?.message || t('productsPage.message.saveFailed'))

    ElMessage.success(j?.message || t('productsPage.message.saveSuccess'))
    dlg.visible = false
    fetchData()
  } catch (e) {
    console.error(e)
    ElMessage.error(e?.message || t('productsPage.message.saveFailed'))
  } finally {
    dlg.loading = false
  }
}

async function toDelete(row) {
  try {
    const res = await fetch(`${apiBase}/products/${row.id}`, { method: 'DELETE', headers: authHeaders() })
    if (handleAuth(res)) return

    const j = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(j?.message || t('productsPage.message.deleteFailed'))

    ElMessage.success(j?.message || t('productsPage.message.deleteSuccess'))
    if (rows.value.length <= 1 && q.page > 1) q.page -= 1
    fetchData()
  } catch (e) {
    console.error(e)
    ElMessage.error(e?.message || t('productsPage.message.deleteFailed'))
  }
}

async function toRestore(row) {
  try {
    const res = await fetch(`${apiBase}/products/${row.id}/restore`, { method: 'PATCH', headers: authHeaders() })
    if (handleAuth(res)) return

    const j = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(j?.message || t('productsPage.message.restoreFailed'))

    ElMessage.success(j?.message || t('productsPage.message.restoreSuccess'))
    fetchData()
  } catch (e) {
    console.error(e)
    ElMessage.error(e?.message || t('productsPage.message.restoreFailed'))
  }
}

/** keep-alive 回到此頁 */
onActivated(() => { fetchData() })

/** 自動刷新 */
let timer = null
function startAutoRefresh() {
  stopAutoRefresh()
  timer = window.setInterval(() => {
    if (!loading.value) fetchData()
  }, 8000)
}
function stopAutoRefresh() {
  if (timer) {
    clearInterval(timer)
    timer = null
  }
}

onMounted(() => {
  fetchTestSets()
  fetchData()
  startAutoRefresh()
})

onUnmounted(() => { stopAutoRefresh() })
</script>

<style scoped>
:global(:root) {
  --app-header-bg: linear-gradient(
    180deg,
    rgba(240, 247, 255, 0.8),
    rgba(255, 255, 255, 0.8)
  );
}
:global(html.dark) {
  --app-header-bg: linear-gradient(
    180deg,
    rgba(28, 33, 38, 0.8),
    rgba(28, 33, 38, 0.6)
  );
}

.page {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.header-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border: 1px solid var(--el-border-color);
  border-radius: 12px;
  background: var(--app-header-bg);
  backdrop-filter: blur(4px);
}
.header-bar .left {
  display: flex;
  align-items: center;
  gap: 10px;
}
.header-bar .right {
  display: flex;
  gap: 10px;
  align-items: center;
  flex-wrap: wrap;
}

.pagination {
  display: flex;
  justify-content: flex-end;
  padding-top: 8px;
}

:deep(.el-table .is-deleted > td) {
  color: var(--el-text-color-secondary);
  text-decoration: line-through;
}

.prog {
  display: flex;
  align-items: center;
  gap: 8px;
}
.muted {
  color: var(--el-text-color-secondary);
}
</style>