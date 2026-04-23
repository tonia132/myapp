<template>
  <div class="page doc-manager-page">
    <section class="hero-card">
      <div class="hero-main">
        <div class="hero-left">
          <div class="hero-icon-wrap">
            <el-icon class="hero-icon"><Document /></el-icon>
          </div>

          <div class="hero-copy">
            <div class="hero-eyebrow">{{ text('docManager.eyebrow', 'Documentation Workspace') }}</div>
            <h2 class="hero-title">{{ text('docManager.title', '文件管理') }}</h2>
            <div class="hero-subtitle">
              {{ text('docManager.subtitle', '快速掌握文件進度、狀態與各階段入口') }}
            </div>
          </div>
        </div>

        <div class="hero-actions">
          <el-input
            v-model="keyword"
            clearable
            class="ctrl w-search"
            :placeholder="text('docManager.keywordPH', '搜尋型號 / 備註')"
            @keyup.enter="fetchItems"
            @clear="fetchItems"
          >
            <template #prefix><el-icon><Search /></el-icon></template>
          </el-input>

          <el-button type="success" plain class="btn" @click="openCreate()">
            {{ text('docManager.btnAdd', '新增') }}
          </el-button>

          <el-button plain :icon="Refresh" class="btn" :loading="loading" @click="reloadAll">
            {{ text('docManager.btnRefresh', '重新整理') }}
          </el-button>
        </div>
      </div>

      <div class="stats-grid">
        <div class="stat-card stat-primary">
          <div class="stat-label">{{ text('docManager.summaryTotal', '總項目') }}</div>
          <div class="stat-value">{{ summary.total }}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">{{ text('docManager.summaryDone', '已完成') }}</div>
          <div class="stat-value">{{ summary.done }}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">{{ text('docManager.summaryAvg', '平均進度') }}</div>
          <div class="stat-value">{{ summary.avg }}%</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">{{ text('docManager.statsPageCount', '目前頁面') }}</div>
          <div class="stat-value">{{ pagedItems.length }}</div>
        </div>
      </div>
    </section>

    <el-card shadow="never" class="filter-card">
      <div class="section-head">
        <div>
          <div class="section-title">{{ text('docManager.filterTitle', '篩選與操作') }}</div>
          <div class="section-subtitle">
            {{ text('docManager.filterSubtitle', '依產品系列、關鍵字與文件進度快速切換') }}
          </div>
        </div>

        <el-tag round effect="plain">
          {{ text('docManager.totalTag', '共 {total} 筆', { total: items.length }) }}
        </el-tag>
      </div>

      <div class="filter-grid">
        <div class="filter-block">
          <div class="filter-label">{{ text('docManager.selectModel', '選擇系列') }}</div>
          <el-select
            v-model="family"
            filterable
            clearable
            class="ctrl w-100"
            :placeholder="text('docManager.modelAll', '全部系列')"
            @change="onFilterChanged"
          >
            <el-option :value="''" :label="text('docManager.modelAll', '全部系列')" />
            <el-option v-for="f in families" :key="f" :value="f" :label="f" />
          </el-select>
        </div>

        <div class="filter-block">
          <div class="filter-label">{{ text('common.actions', '操作') }}</div>
          <div class="quick-actions">
            <el-button class="btn" plain @click="clearFilters">
              {{ text('common.clear', '清除') }}
            </el-button>
            <el-button class="btn" type="primary" plain @click="fetchItems">
              {{ text('common.search', '搜尋') }}
            </el-button>
          </div>
        </div>

        <div class="stage-chip-wrap">
          <div
            v-for="a in actionButtons"
            :key="a.key"
            class="stage-chip"
          >
            {{ a.text }}
          </div>
        </div>
      </div>
    </el-card>

    <el-card v-show="!isMobile" shadow="never" class="table-card">
      <template #header>
        <div class="section-head">
          <div>
            <div class="section-title">{{ text('docManager.tableTitle', '文件進度清單') }}</div>
            <div class="section-subtitle">
              {{ text('docManager.tableSubtitle', '桌面版提供完整表格檢視與階段快捷入口') }}
            </div>
          </div>
        </div>
      </template>

      <el-table
        :data="pagedItems"
        stripe
        border
        v-loading="loading"
        class="doc-table"
        row-key="id"
      >
        <el-table-column prop="modelCode" :label="text('docManager.colModelCode', '型號')" min-width="220">
          <template #default="{ row }">
            <div class="model-cell">
              <div class="model-name">{{ row.modelCode || '—' }}</div>
              <div class="model-family muted">{{ row.modelFamily || row.family || '—' }}</div>
            </div>
          </template>
        </el-table-column>

        <el-table-column :label="text('docManager.colProgress', '進度')" min-width="360">
          <template #default="{ row }">
            <div class="progress-cell">
              <el-progress
                :percentage="toPct(row.docProgress)"
                :status="toPct(row.docProgress) >= 100 ? 'success' : ''"
              />
              <div class="progress-caption">
                {{ progressTone(row.docProgress) }}
              </div>
            </div>
          </template>
        </el-table-column>

        <el-table-column :label="text('docManager.colRemark', '備註')" min-width="320">
          <template #default="{ row }">
            <el-tooltip v-if="row.docRemark" :content="String(row.docRemark)" placement="top">
              <span class="ellipsis">{{ row.docRemark }}</span>
            </el-tooltip>
            <span v-else class="muted">—</span>
          </template>
        </el-table-column>

        <el-table-column prop="updatedAt" :label="text('docManager.colUpdated', '更新時間')" min-width="200">
          <template #default="{ row }">
            <span class="muted">{{ fmtTime(row.updatedAt) }}</span>
          </template>
        </el-table-column>

        <el-table-column :label="text('common.actions', '操作')" min-width="520" fixed="right">
          <template #default="{ row }">
            <div class="op-btns">
              <el-button
                v-for="a in actionButtons"
                :key="a.key"
                size="small"
                type="success"
                plain
                @click="goStage(a.key, row)"
              >
                {{ a.text }}
              </el-button>

              <div class="op-spacer"></div>

              <el-button link type="primary" @click="openEdit(row)">
                {{ text('docManager.actionEdit', '編輯') }}
              </el-button>
            </div>
          </template>
        </el-table-column>

        <template #empty>
          <div class="table-empty">{{ text('common.noData', '目前沒有資料') }}</div>
        </template>
      </el-table>

      <div class="table-footer">
        <div class="muted">
          {{ text('common.total', '總計') }}：{{ items.length }}
        </div>

        <el-pagination
          v-if="items.length"
          background
          layout="prev, pager, next, sizes"
          :total="items.length"
          :page-size="pageSize"
          :current-page="page"
          :page-sizes="[10, 20, 50, 100]"
          @current-change="onPage"
          @size-change="onPageSize"
        />
      </div>
    </el-card>

    <el-card v-show="isMobile" shadow="never" class="mobile-card">
      <template #header>
        <div class="section-head compact">
          <div>
            <div class="section-title">{{ text('docManager.mobileTitle', '行動版清單') }}</div>
            <div class="section-subtitle">
              {{ text('docManager.mobileSubtitle', '卡片式顯示更容易在手機上操作') }}
            </div>
          </div>
        </div>
      </template>

      <div v-if="loading" class="mobile-skeleton">
        <el-skeleton :rows="6" animated />
      </div>

      <template v-else>
        <el-empty v-if="items.length === 0" :description="text('common.noData', '目前沒有資料')" />

        <div v-else class="cards">
          <el-card v-for="row in pagedItems" :key="row.id || row.modelCode" shadow="never" class="row-card">
            <div class="card-top">
              <div class="card-title">
                <div class="model">{{ row.modelCode || '—' }}</div>
                <div class="updated muted">{{ fmtTime(row.updatedAt) }}</div>
              </div>

              <el-dropdown trigger="click" @command="(cmd) => goStage(cmd, row)">
                <el-button type="success" plain size="small" class="btn-chip">
                  {{ text('common.actions', '操作') }} ▼
                </el-button>
                <template #dropdown>
                  <el-dropdown-menu>
                    <el-dropdown-item
                      v-for="a in actionButtons"
                      :key="a.key"
                      :command="a.key"
                    >
                      {{ a.text }}
                    </el-dropdown-item>
                    <el-dropdown-item divided command="__edit__" @click.stop="openEdit(row)">
                      {{ text('docManager.actionEdit', '編輯') }}
                    </el-dropdown-item>
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
            </div>

            <div class="family-line muted">{{ row.modelFamily || row.family || '—' }}</div>

            <div class="progress-wrap">
              <el-progress
                :percentage="toPct(row.docProgress)"
                :status="toPct(row.docProgress) >= 100 ? 'success' : ''"
              />
              <div class="progress-caption">{{ progressTone(row.docProgress) }}</div>
            </div>

            <div class="remark">
              <div class="remark-label muted">{{ text('docManager.colRemark', '備註') }}</div>
              <div v-if="row.docRemark" class="remark-text">
                {{ row.docRemark }}
              </div>
              <div v-else class="muted">—</div>
            </div>

            <div class="card-actions">
              <el-button type="primary" plain class="btn-full" @click="openEdit(row)">
                {{ text('docManager.actionEdit', '編輯') }}
              </el-button>
              <el-button type="success" class="btn-full" @click="goStage(actionButtons[0]?.key || 'C1', row)">
                {{ actionButtons[0]?.text || 'C1' }}
              </el-button>
            </div>
          </el-card>
        </div>

        <div class="mobile-pager" v-if="items.length">
          <el-pagination
            background
            layout="prev, pager, next"
            :total="items.length"
            :page-size="pageSize"
            :current-page="page"
            @current-change="onPage"
          />
        </div>
      </template>
    </el-card>

    <el-dialog
      v-model="createOpen"
      :title="text('docManager.createDialogTitle', '新增文件項目')"
      :width="isMobile ? '100%' : '560px'"
      :fullscreen="isMobile"
      destroy-on-close
    >
      <el-form :label-width="isMobile ? '82px' : '90px'">
        <el-form-item :label="text('docManager.fieldFamily', '系列')">
          <el-select v-model="createForm.modelFamily" filterable class="w-100">
            <el-option v-for="f in families" :key="f" :value="f" :label="f" />
          </el-select>
        </el-form-item>

        <el-form-item :label="text('docManager.fieldModelCode', '型號')">
          <el-input v-model="createForm.modelCode" :placeholder="text('docManager.modelCodePH', '請輸入型號代碼')" />
        </el-form-item>

        <el-form-item :label="text('docManager.fieldProgress', '進度')">
          <el-slider v-model="createForm.docProgress" :min="0" :max="100" show-input />
        </el-form-item>

        <el-form-item :label="text('docManager.fieldRemark', '備註')">
          <el-input
            v-model="createForm.docRemark"
            type="textarea"
            :rows="3"
            :placeholder="text('docManager.remarkPH', '請輸入備註')"
          />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="createOpen = false">{{ text('common.cancel', '取消') }}</el-button>
        <el-button type="success" :loading="creating" @click="createItem">
          {{ text('docManager.btnCreate', '建立') }}
        </el-button>
      </template>
    </el-dialog>

    <el-dialog
      v-model="editOpen"
      :title="text('docManager.dialogTitle', '編輯文件進度')"
      :width="isMobile ? '100%' : '560px'"
      :fullscreen="isMobile"
      destroy-on-close
    >
      <el-form :label-width="isMobile ? '82px' : '90px'">
        <el-form-item :label="text('docManager.fieldProgress', '進度')">
          <el-slider v-model="editForm.docProgress" :min="0" :max="100" show-input />
        </el-form-item>

        <el-form-item :label="text('docManager.fieldRemark', '備註')">
          <el-input
            v-model="editForm.docRemark"
            type="textarea"
            :rows="4"
            :placeholder="text('docManager.remarkPH', '請輸入備註')"
          />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="editOpen = false">{{ text('common.cancel', '取消') }}</el-button>
        <el-button type="primary" :loading="saving" @click="saveEdit">
          {{ text('common.save', '儲存') }}
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import axios from 'axios'
import { useI18n } from 'vue-i18n'
import { ElMessage } from 'element-plus'
import { Refresh, Document, Search } from '@element-plus/icons-vue'
import { useRouter } from 'vue-router'

const { t, te, locale } = useI18n()
const router = useRouter()

function text (key, fallback, params) {
  if (te(key)) return t(key, params)
  if (!params) return fallback
  return String(fallback).replace(/\{(\w+)\}/g, (_, k) => String(params?.[k] ?? ''))
}

const loading = ref(false)
const saving = ref(false)
const creating = ref(false)

const actionButtons = computed(() => ([
  { key: 'C1', text: text('docManager.stages.C1', 'C1') },
  { key: 'C2', text: text('docManager.stages.C2', 'C2') },
  { key: 'C3', text: text('docManager.stages.C3', 'C3') },
  { key: 'PreScan', text: text('docManager.stages.PreScan', 'PreScan') },
  { key: 'CERT', text: text('docManager.stages.CERT', '認證') },
  { key: 'OS', text: text('docManager.stages.OS', 'OS') },
  { key: 'Driver', text: text('docManager.stages.Driver', 'Driver') },
  { key: 'BIOS', text: text('docManager.stages.BIOS', 'BIOS') },
  { key: 'APP', text: text('docManager.stages.APP', 'APP') },
  { key: 'FW', text: text('docManager.stages.FW', 'FW') },
  { key: 'SOP', text: text('docManager.stages.SOP', 'SOP') }
]))

const families = ref([
  'AITRON', 'NuTAM', 'AITAS', 'ARCHMI-S系列', 'ART', 'SiER', 'ABOS', 'AVA', 'ViKING',
  'AUHMI(HELIO)', 'AUHMI', 'PhanTAM', 'SBC', 'TB-PB', 'TITAN', 'ViPAC', 'ViTAM',
  'ARMPAC', 'ASB', 'ATP', 'AVS', 'AWK', 'EIRA', 'FABS', 'OPC', 'OPD', 'APW', 'ARCDIS',
  'ARCHMI', 'ARiio', 'AEx', 'AHM'
])

const family = ref('')
const keyword = ref('')
const items = ref([])

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

const page = ref(1)
const pageSize = ref(20)

const pagedItems = computed(() => {
  const start = (page.value - 1) * pageSize.value
  return items.value.slice(start, start + pageSize.value)
})

function onPage (p) { page.value = p }
function onPageSize (s) { pageSize.value = s; page.value = 1 }

const editOpen = ref(false)
const editForm = reactive({ id: null, docProgress: 0, docRemark: '' })

const createOpen = ref(false)
const createForm = reactive({
  modelFamily: '',
  modelCode: '',
  docProgress: 0,
  docRemark: ''
})

function getToken () {
  return localStorage.getItem('token') || sessionStorage.getItem('token') || ''
}

function authHeaders () {
  const token = getToken()
  return token ? { Authorization: `Bearer ${token}` } : {}
}

function fmtTime (v) {
  if (!v) return '—'
  const d = new Date(v)
  if (Number.isNaN(d.getTime())) return '—'
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

function toPct (p) {
  const n = Number(p ?? 0)
  if (Number.isNaN(n)) return 0
  return Math.max(0, Math.min(100, Math.round(n)))
}

function progressTone (p) {
  const n = toPct(p)
  if (n >= 100) return text('docManager.progress.complete', '已完成')
  if (n >= 70) return text('docManager.progress.onTrack', '進度良好')
  if (n >= 30) return text('docManager.progress.inProgress', '持續進行中')
  return text('docManager.progress.pending', '待補資料')
}

const summary = computed(() => {
  const total = items.value.length
  const done = items.value.filter(x => toPct(x.docProgress) >= 100).length
  const avg = total
    ? Math.round(items.value.reduce((a, x) => a + toPct(x.docProgress), 0) / total)
    : 0
  return { total, done, avg }
})

let kwTimer = null
watch(keyword, (v) => {
  clearTimeout(kwTimer)
  kwTimer = setTimeout(() => {
    if (v === '' || String(v).trim().length >= 2) {
      page.value = 1
      fetchItems()
    }
  }, 350)
})

function clearFilters () {
  keyword.value = ''
  family.value = ''
  page.value = 1
  fetchItems()
}

function onFilterChanged () {
  page.value = 1
  fetchItems()
}

async function fetchItems () {
  try {
    loading.value = true
    const res = await axios.get('/api/doc-manager/items', {
      headers: authHeaders(),
      params: { family: family.value || '', kw: keyword.value || '' }
    })
    items.value = Array.isArray(res.data) ? res.data : []
    const maxPage = Math.max(1, Math.ceil(items.value.length / pageSize.value))
    if (page.value > maxPage) page.value = maxPage
  } catch (err) {
    console.error(err)
    ElMessage.error(text('docManager.messages.loadFailed', '載入失敗'))
  } finally {
    loading.value = false
  }
}

async function reloadAll () {
  await fetchItems()
}

function pickProductTestLocation (productId, extraQuery = {}) {
  const pid = String(productId)
  const candidates = [
    { path: '/product-test', query: { productId: pid, ...extraQuery } },
    { path: `/product-test/${pid}`, query: { ...extraQuery } },
    { path: `/products/${pid}/test`, query: { ...extraQuery } },
    { path: '/productTest', query: { productId: pid, ...extraQuery } },
    { path: `/productTest/${pid}`, query: { ...extraQuery } }
  ]
  for (const loc of candidates) {
    try {
      const r = router.resolve(loc)
      if (r?.matched?.length) return loc
    } catch {}
  }
  return null
}

async function goStage (stage, row) {
  if (stage === '__edit__') return openEdit(row)

  const modelCode = String(row?.modelCode || '').trim()
  if (!modelCode) return ElMessage.warning(text('docManager.messages.emptyModelCode', 'Model code 為空'))

  try {
    const r = await axios.get('/api/products/resolve', {
      headers: authHeaders(),
      params: { model: modelCode }
    })

    const productId = r.data?.productId
    if (!productId) return ElMessage.error(text('docManager.messages.productNotFound', '找不到對應產品：{model}', { model: modelCode }))

    const extraQuery = {
      model: modelCode,
      stage: String(stage),
      tab: String(stage),
      category: String(stage)
    }

    const target = pickProductTestLocation(productId, extraQuery)
    if (!target) {
      return ElMessage.error(text('docManager.messages.routeMissing', '找不到產品測試頁路由'))
    }
    await router.push(target)
  } catch (err) {
    console.error(err)
    if (err?.response?.status === 404) ElMessage.error(text('docManager.messages.productNotFound', '找不到對應產品：{model}', { model: modelCode }))
    else ElMessage.error(text('docManager.messages.routeFailed', '導入產品測試頁失敗'))
  }
}

function openEdit (row) {
  editForm.id = row.id
  editForm.docProgress = toPct(row.docProgress)
  editForm.docRemark = String(row.docRemark || '')
  editOpen.value = true
}

async function saveEdit () {
  if (!editForm.id) return
  try {
    saving.value = true
    await axios.put(
      `/api/doc-manager/items/${editForm.id}`,
      { docProgress: toPct(editForm.docProgress), docRemark: String(editForm.docRemark || '') },
      { headers: authHeaders() }
    )
    ElMessage.success(text('common.saved', '已儲存'))
    editOpen.value = false
    await fetchItems()
  } catch (err) {
    console.error(err)
    ElMessage.error(text('docManager.messages.saveFailed', '儲存失敗'))
  } finally {
    saving.value = false
  }
}

function openCreate () {
  createForm.modelFamily = family.value || families.value[0] || ''
  createForm.modelCode = ''
  createForm.docProgress = 0
  createForm.docRemark = ''
  createOpen.value = true
}

async function createItem () {
  const mf = String(createForm.modelFamily || '').trim()
  const mc = String(createForm.modelCode || '').trim()
  if (!mf) return ElMessage.warning(text('docManager.errNeedFamily', '請選擇系列'))
  if (!mc) return ElMessage.warning(text('docManager.errNeedModelCode', '請輸入型號代碼'))

  try {
    creating.value = true
    await axios.post(
      '/api/doc-manager/items',
      {
        modelFamily: mf,
        modelCode: mc,
        docProgress: toPct(createForm.docProgress),
        docRemark: String(createForm.docRemark || '')
      },
      { headers: authHeaders() }
    )
    ElMessage.success(text('docManager.created', '建立成功'))
    createOpen.value = false
    await fetchItems()
  } catch (err) {
    console.error(err)
    ElMessage.error(text('docManager.messages.createFailed', '建立失敗'))
  } finally {
    creating.value = false
  }
}

onMounted(() => {
  cleanupMql = setupMql()
  reloadAll()
})

onBeforeUnmount(() => {
  if (cleanupMql) cleanupMql()
  clearTimeout(kwTimer)
})
</script>

<style scoped>
.doc-manager-page {
  --gap: 14px;
  color: var(--el-text-color-primary);
}

.muted {
  color: var(--el-text-color-secondary);
}

.w-100 { width: 100%; }
.ctrl { border-radius: 12px; }
.w-search { width: 320px; max-width: 100%; }
.btn { border-radius: 12px; }

.hero-card,
.filter-card,
.table-card,
.mobile-card {
  border: 1px solid var(--el-border-color-light);
  border-radius: 22px;
  background:
    radial-gradient(circle at top right, color-mix(in srgb, var(--el-color-success) 12%, transparent) 0%, transparent 32%),
    linear-gradient(180deg, color-mix(in srgb, var(--el-bg-color) 94%, var(--el-color-primary-light-9) 6%) 0%, var(--el-bg-color) 100%);
  box-shadow: 0 18px 42px rgba(0, 0, 0, 0.06);
}

.hero-card {
  padding: 20px;
  overflow: hidden;
  position: relative;
}

.hero-card::after {
  content: '';
  position: absolute;
  right: -40px;
  bottom: -40px;
  width: 180px;
  height: 180px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--el-color-success) 10%, transparent);
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
  width: 68px;
  height: 68px;
  border-radius: 20px;
  display: grid;
  place-items: center;
  background: linear-gradient(135deg, var(--el-color-success-light-7), var(--el-color-success-light-9));
  border: 1px solid color-mix(in srgb, var(--el-color-success) 25%, var(--el-border-color-light));
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.5);
}

.hero-icon {
  font-size: 30px;
}

.hero-eyebrow {
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.08em;
  color: var(--el-color-success);
  margin-bottom: 4px;
}

.hero-title {
  margin: 0;
  font-size: 30px;
  line-height: 1.15;
  font-weight: 900;
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
  background: color-mix(in srgb, var(--el-fill-color-light) 90%, white 10%);
  border: 1px solid var(--el-border-color-lighter);
}

.stat-primary {
  background: linear-gradient(135deg, var(--el-color-success-light-8), var(--el-color-success-light-9));
  border-color: color-mix(in srgb, var(--el-color-success) 35%, var(--el-border-color));
}

.stat-label {
  color: var(--el-text-color-secondary);
  font-size: 12px;
  margin-bottom: 6px;
}

.stat-value {
  font-size: 28px;
  font-weight: 900;
  line-height: 1;
}

.filter-card,
.table-card,
.mobile-card {
  margin-top: 16px;
}

.section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.section-head.compact {
  margin-bottom: 0;
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
  grid-template-columns: 1.1fr 0.9fr 1.2fr;
  gap: 16px;
  align-items: end;
  margin-top: 16px;
}

.filter-label {
  font-size: 13px;
  font-weight: 800;
  margin-bottom: 8px;
  color: var(--el-text-color-regular);
}

.quick-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.stage-chip-wrap {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}

.stage-chip {
  height: 32px;
  padding: 0 12px;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: color-mix(in srgb, var(--el-color-success-light-9) 80%, var(--el-bg-color) 20%);
  border: 1px solid color-mix(in srgb, var(--el-color-success) 18%, var(--el-border-color-light));
  color: var(--el-color-success);
  font-size: 12px;
  font-weight: 700;
}

.doc-table :deep(.el-table__inner-wrapper) { min-height: 360px; }
.doc-table :deep(.el-table__header-wrapper th) {
  background: color-mix(in srgb, var(--el-fill-color-light) 88%, white 12%);
}

.model-cell {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.model-name {
  font-weight: 800;
}

.model-family {
  font-size: 12px;
}

.progress-cell {
  padding-right: 14px;
}

.progress-caption {
  margin-top: 6px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.ellipsis {
  display: inline-block;
  max-width: 520px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.table-empty {
  padding: 70px 0;
  text-align: center;
  color: var(--el-text-color-secondary);
  font-size: 14px;
}

.table-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding-top: 12px;
}

.op-btns {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}

.op-btns :deep(.el-button + .el-button) {
  margin-left: 0 !important;
}

.op-spacer { flex: 1 1 auto; min-width: 8px; }

.cards {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.row-card {
  border-radius: 18px;
  border: 1px solid var(--el-border-color-lighter);
  background: linear-gradient(180deg, color-mix(in srgb, var(--el-fill-color-light) 90%, white 10%) 0%, var(--el-bg-color) 100%);
}

.card-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
}

.card-title { min-width: 0; }

.model {
  font-weight: 900;
  font-size: 16px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.updated {
  margin-top: 2px;
  font-size: 12px;
}

.family-line {
  margin-top: 6px;
  font-size: 12px;
}

.btn-chip { border-radius: 999px; }

.progress-wrap { margin-top: 12px; }

.remark { margin-top: 12px; }
.remark-label {
  font-size: 12px;
  font-weight: 800;
  margin-bottom: 4px;
}
.remark-text {
  font-size: 13px;
  line-height: 1.55;
  word-break: break-word;
}

.card-actions {
  margin-top: 14px;
  display: flex;
  gap: 10px;
}

.btn-full {
  flex: 1;
  border-radius: 12px;
}

.mobile-pager {
  margin-top: 14px;
  display: flex;
  justify-content: center;
}

@media (max-width: 1180px) {
  .stats-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .filter-grid {
    grid-template-columns: 1fr;
    align-items: stretch;
  }
}

@media (max-width: 768px) {
  .doc-manager-page {
    --gap: 12px;
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

  .w-search {
    width: 100%;
  }

  .table-footer {
    flex-direction: column;
    align-items: stretch;
  }
}

@media (max-width: 640px) {
  .hero-left {
    align-items: flex-start;
  }

  .hero-title {
    font-size: 24px;
  }

  .stats-grid {
    grid-template-columns: 1fr;
  }

  .quick-actions,
  .card-actions {
    flex-direction: column;
  }

  .quick-actions :deep(.el-button),
  .card-actions :deep(.el-button) {
    width: 100%;
  }
}
</style>
