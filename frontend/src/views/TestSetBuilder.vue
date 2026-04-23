<template>
  <div class="page test-set-builder-page">
    <section class="hero-card">
      <div class="hero-main">
        <div class="hero-copy">
          <div class="hero-badge">🧩 {{ tx('testSetBuilder.heroBadge', 'Preset Builder') }}</div>
          <h1 class="hero-title">{{ tx('testSetBuilder.title', '測試集') }}</h1>
          <p class="hero-desc">
            {{ tx('testSetBuilder.tipDesc', '把測試項目像積木一樣組合起來，快速做成可重複使用的預設測試集。') }}
          </p>

          <div class="hero-tags">
            <span class="hero-tag success">{{ tx('testSetBuilder.tag', '組合測試項目成預設測試集') }}</span>
            <span class="hero-tag">{{ tx('testSetBuilder.totalLibraryTag', '項目庫 {n} 筆', { n: filteredLibraryRows.length }) }}</span>
            <span class="hero-tag">{{ tx('testSetBuilder.currentSetTag', '目前測試集 {n} 筆', { n: setItems.length }) }}</span>
          </div>
        </div>

        <div class="hero-stats">
          <div class="hero-stat-card primary">
            <div class="stat-kicker">{{ tx('testSetBuilder.stats.count', '測試項目數') }}</div>
            <div class="stat-big">{{ setItems.length }}</div>
            <div class="stat-mini">{{ tx('testSetBuilder.stats.readyToSave', '可直接儲存成預設測試集') }}</div>
          </div>
          <div class="hero-stat-card">
            <div class="stat-kicker">{{ tx('testSetBuilder.stats.hours', '預估工時') }}</div>
            <div class="stat-big">{{ totalHoursText }}</div>
            <div class="stat-mini">Hours</div>
          </div>
          <div class="hero-stat-card">
            <div class="stat-kicker">{{ tx('testSetBuilder.stats.planned', '預設納入計畫') }}</div>
            <div class="stat-big">{{ plannedCount }}</div>
            <div class="stat-mini">{{ tx('testSetBuilder.stats.autoInPlan', '預設納入') }}</div>
          </div>
        </div>
      </div>

      <div class="hero-actions">
        <el-button class="hero-btn" :icon="Refresh" :loading="loadingLibrary" @click="loadLibrarySet">
          {{ tx('common.refresh', '重新整理') }}
        </el-button>
        <el-button class="hero-btn" :icon="Delete" plain :disabled="!setItems.length" @click="clearSetItems">
          {{ tx('testSetBuilder.clearSet', '清空測試集') }}
        </el-button>
        <el-button class="hero-btn save-btn" type="primary" :icon="FolderAdd" :loading="savingSet" @click="saveTestSet">
          {{ tx('testSetBuilder.save', '儲存到預設測試集') }}
        </el-button>
      </div>

      <div class="hero-decor decor-a"></div>
      <div class="hero-decor decor-b"></div>
      <div class="hero-decor decor-c"></div>
    </section>

    <el-row :gutter="18" class="main-grid">
      <el-col :xs="24" :xl="11">
        <el-card shadow="never" class="panel-card library-card">
          <template #header>
            <div class="panel-head">
              <div>
                <div class="panel-title-row">
                  <span class="panel-icon">📚</span>
                  <div>
                    <div class="panel-title">{{ tx('testSetBuilder.libraryTitle', '測試項目庫') }}</div>
                    <div class="panel-subtitle">
                      {{ tx('testSetBuilder.librarySubtitle', '從你建立的測試項目中挑選要加入測試集的內容') }}
                    </div>
                  </div>
                </div>
              </div>

              <div class="panel-head-actions">
                <div class="selected-chip">
                  {{ tx('testSetBuilder.selectedCount', '已選 {n} 筆', { n: selectedLibraryRows.length }) }}
                </div>
                <el-button type="primary" :disabled="!selectedLibraryRows.length" @click="appendSelectedToSet">
                  {{ tx('testSetBuilder.addSelected', '加入所選') }}
                </el-button>
              </div>
            </div>
          </template>

          <div class="filter-shell">
            <div class="search-row">
              <el-input
                v-model="keyword"
                clearable
                size="large"
                :placeholder="tx('testSetBuilder.searchPlaceholder', '搜尋：測試維度 / 測試對象 / 測試章節 / 代碼 / 測試項目')"
              >
                <template #prefix><el-icon><Search /></el-icon></template>
              </el-input>
            </div>

            <div class="domain-quick-row">
              <button
                class="quick-domain"
                :class="{ active: !domainFilter }"
                @click="domainFilter = ''"
              >
                {{ tx('testSetBuilder.filters.all', '全部') }}
              </button>
              <button
                v-for="item in testDomainOptions"
                :key="item.value"
                class="quick-domain"
                :class="{ active: domainFilter === item.value }"
                @click="domainFilter = domainFilter === item.value ? '' : item.value"
              >
                {{ item.label }}
              </button>
            </div>

            <div class="filters-grid">
              <el-select v-model="domainFilter" clearable filterable size="large" :placeholder="tx('testSetBuilder.filters.domain', '測試維度')">
                <el-option v-for="item in testDomainOptions" :key="item.value" :label="item.label" :value="item.value" />
              </el-select>

              <el-select v-model="targetFilter" clearable filterable size="large" :placeholder="tx('testSetBuilder.filters.target', '測試對象')">
                <el-option v-for="item in targetFilterOptions" :key="item" :label="item" :value="item" />
              </el-select>

              <el-select v-model="chapterFilter" clearable filterable size="large" :placeholder="tx('testSetBuilder.filters.chapter', '測試章節')">
                <el-option v-for="item in chapterOptions" :key="item" :label="item" :value="item" />
              </el-select>

              <el-button size="large" plain @click="resetFilters">
                {{ tx('common.reset', '重設') }}
              </el-button>
            </div>
          </div>

          <div class="table-wrap">
            <el-table
              :data="filteredLibraryRows"
              border
              stripe
              row-key="_key"
              v-loading="loadingLibrary"
              class="main-table library-table"
              height="650"
              @selection-change="onLibrarySelectionChange"
            >
              <el-table-column type="selection" width="52" />
              <el-table-column prop="testDomain" :label="tx('testSetBuilder.columns.testDomain', '測試維度')" min-width="106" show-overflow-tooltip>
                <template #default="{ row }">
                  <el-tag size="small" effect="light" round>{{ row.testDomain || '—' }}</el-tag>
                </template>
              </el-table-column>
              <el-table-column prop="testTarget" :label="tx('testSetBuilder.columns.testTarget', '測試對象')" min-width="114" show-overflow-tooltip>
                <template #default="{ row }">
                  <span class="soft-pill">{{ row.testTarget || '—' }}</span>
                </template>
              </el-table-column>
              <el-table-column prop="testChapter" :label="tx('testSetBuilder.columns.testChapter', '測試章節')" min-width="126" show-overflow-tooltip />
              <el-table-column prop="code" :label="tx('testSetBuilder.columns.code', '代碼')" width="120" show-overflow-tooltip />
              <el-table-column :label="tx('testSetBuilder.columns.testCase', '測試項目')" min-width="250" show-overflow-tooltip>
                <template #default="{ row }">
                  <div class="testcase-cell">
                    <div class="tc-name">{{ row.testCase || '—' }}</div>
                    <div class="tc-sub muted" v-if="row.testProcedure || row.testCriteria">
                      <span v-if="row.testProcedure">Procedure</span>
                      <span v-if="row.testProcedure && row.testCriteria"> / </span>
                      <span v-if="row.testCriteria">Criteria</span>
                    </div>
                  </div>
                </template>
              </el-table-column>
              <el-table-column :label="tx('testSetBuilder.columns.estHours', '工時')" width="84" align="center">
                <template #default="{ row }">{{ formatHours(row.estHours) }}</template>
              </el-table-column>
              <el-table-column width="96" align="center" fixed="right">
                <template #default="{ row }">
                  <el-button size="small" type="primary" plain @click="appendOneToSet(row)">
                    {{ tx('testSetBuilder.addOne', '加入') }}
                  </el-button>
                </template>
              </el-table-column>
            </el-table>
          </div>

          <el-empty v-if="!loadingLibrary && filteredLibraryRows.length === 0" :description="tx('testSetBuilder.noLibrary', '目前沒有可用的測試項目，請先到測試項目頁建立。')" />
        </el-card>
      </el-col>

      <el-col :xs="24" :xl="13">
        <div class="right-stack">
          <el-card shadow="never" class="panel-card meta-card vivid-card">
            <template #header>
              <div class="panel-head solo">
                <div class="panel-title-row">
                  <span class="panel-icon">✨</span>
                  <div>
                    <div class="panel-title">{{ tx('testSetBuilder.metaTitle', '測試集資訊') }}</div>
                    <div class="panel-subtitle">
                      {{ tx('testSetBuilder.metaSubtitle', '命名後即可儲存到預設測試集') }}
                    </div>
                  </div>
                </div>
              </div>
            </template>

            <el-form :model="setForm" label-width="96px" class="meta-form">
              <el-form-item :label="tx('testSetBuilder.fields.name', '測試集名稱')" required>
                <el-input
                  v-model.trim="setForm.name"
                  size="large"
                  maxlength="120"
                  show-word-limit
                  :placeholder="tx('testSetBuilder.placeholders.name', '例如：X86 基本功能測試集')"
                />
              </el-form-item>
              <el-form-item :label="tx('testSetBuilder.fields.description', '說明')">
                <el-input
                  v-model.trim="setForm.description"
                  type="textarea"
                  :rows="4"
                  maxlength="300"
                  show-word-limit
                  :placeholder="tx('testSetBuilder.placeholders.description', '可填寫此測試集的用途或適用範圍')"
                />
              </el-form-item>
            </el-form>

            <div class="meta-foot-grid">
              <div class="metric-card pink">
                <div class="metric-label">{{ tx('testSetBuilder.stats.count', '測試項目數') }}</div>
                <div class="metric-value">{{ setItems.length }}</div>
              </div>
              <div class="metric-card blue">
                <div class="metric-label">{{ tx('testSetBuilder.stats.hours', '預估工時') }}</div>
                <div class="metric-value">{{ totalHoursText }}</div>
              </div>
              <div class="metric-card yellow">
                <div class="metric-label">{{ tx('testSetBuilder.stats.planned', '預設納入計畫') }}</div>
                <div class="metric-value">{{ plannedCount }}</div>
              </div>
            </div>
          </el-card>

          <el-card shadow="never" class="panel-card current-set-card">
            <template #header>
              <div class="panel-head">
                <div class="panel-title-row">
                  <span class="panel-icon">🧱</span>
                  <div>
                    <div class="panel-title">{{ tx('testSetBuilder.currentTitle', '目前測試集內容') }}</div>
                    <div class="panel-subtitle">
                      {{ tx('testSetBuilder.currentSubtitle', '可上下調整順序，也可刪除不需要的項目') }}
                    </div>
                  </div>
                </div>
                <el-button plain @click="dedupeSetItems" :disabled="!setItems.length">
                  {{ tx('testSetBuilder.dedupe', '移除重複') }}
                </el-button>
              </div>
            </template>

            <div class="set-preview-row">
              <div class="preview-box">
                <div class="preview-label">{{ tx('testSetBuilder.preview.domainMix', '維度分布') }}</div>
                <div class="preview-values">
                  <span v-for="item in previewDomainList" :key="item.label" class="mini-pill">
                    {{ item.label }} · {{ item.count }}
                  </span>
                  <span v-if="!previewDomainList.length" class="muted">{{ tx('testSetBuilder.preview.empty', '尚未加入項目') }}</span>
                </div>
              </div>
            </div>

            <div class="table-wrap">
              <el-table
                :data="setItems"
                border
                stripe
                row-key="_setKey"
                class="main-table current-table"
                height="560"
                empty-text="請先從左側加入測試項目"
              >
                <el-table-column type="index" width="58" align="center" />
                <el-table-column prop="testDomain" :label="tx('testSetBuilder.columns.testDomain', '測試維度')" width="108" show-overflow-tooltip>
                  <template #default="{ row }">
                    <el-tag size="small" effect="light" round>{{ row.testDomain || '—' }}</el-tag>
                  </template>
                </el-table-column>
                <el-table-column prop="testTarget" :label="tx('testSetBuilder.columns.testTarget', '測試對象')" width="114" show-overflow-tooltip>
                  <template #default="{ row }">
                    <span class="soft-pill">{{ row.testTarget || '—' }}</span>
                  </template>
                </el-table-column>
                <el-table-column prop="testChapter" :label="tx('testSetBuilder.columns.testChapter', '測試章節')" min-width="136" show-overflow-tooltip />
                <el-table-column prop="code" :label="tx('testSetBuilder.columns.code', '代碼')" width="116" show-overflow-tooltip />
                <el-table-column :label="tx('testSetBuilder.columns.testCase', '測試項目')" min-width="250" show-overflow-tooltip>
                  <template #default="{ row }">
                    <div class="testcase-cell">
                      <div class="tc-name">{{ row.testCase || '—' }}</div>
                      <div class="tc-sub muted">{{ formatHours(row.estHours) }} h</div>
                    </div>
                  </template>
                </el-table-column>
                <el-table-column :label="tx('testSetBuilder.columns.actions', '操作')" width="150" fixed="right" align="center">
                  <template #default="{ row, $index }">
                    <div class="row-actions">
                      <el-tooltip :content="tx('testSetBuilder.moveUp', '上移')" placement="top">
                        <el-button circle size="small" :icon="ArrowUp" :disabled="$index === 0" @click="moveItem(-1, $index)" />
                      </el-tooltip>
                      <el-tooltip :content="tx('testSetBuilder.moveDown', '下移')" placement="top">
                        <el-button circle size="small" :icon="ArrowDown" :disabled="$index === setItems.length - 1" @click="moveItem(1, $index)" />
                      </el-tooltip>
                      <el-tooltip :content="tx('common.delete', '刪除')" placement="top">
                        <el-button circle size="small" type="danger" plain :icon="Remove" @click="removeSetItem($index)" />
                      </el-tooltip>
                    </div>
                  </template>
                </el-table-column>
              </el-table>
            </div>
          </el-card>
        </div>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search, Refresh, FolderAdd, Delete, ArrowUp, ArrowDown, Remove } from '@element-plus/icons-vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'

const router = useRouter()
const i18n = (() => {
  try {
    return useI18n({ useScope: 'global' })
  } catch {
    return null
  }
})()

function tx (key, fallback, vars) {
  try {
    const t = i18n?.t
    if (typeof t === 'function') {
      const res = t(key, vars || {})
      if (res && res !== key) return res
    }
  } catch {}

  if (!vars || typeof fallback !== 'string') return fallback
  return fallback.replace(/\{(\w+)\}/g, (_, k) => (vars[k] ?? `{${k}}`))
}

const apiBase = (import.meta.env.VITE_API_BASE || '/api').replace(/\/$/, '')

function getToken () {
  return localStorage.getItem('token') || sessionStorage.getItem('token') || ''
}

function getUser () {
  try {
    return JSON.parse(localStorage.getItem('user') || sessionStorage.getItem('user') || 'null')
  } catch {
    return null
  }
}

function authHeaders (extra = {}) {
  const token = getToken()
  return {
    ...extra,
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  }
}

async function apiJson (path, { method = 'GET', params, body, headers = {} } = {}) {
  let url = `${apiBase}${path}`

  if (params && typeof params === 'object') {
    const qs = new URLSearchParams()
    Object.entries(params).forEach(([k, v]) => {
      if (v === undefined || v === null || v === '') return
      qs.set(k, String(v))
    })
    const q = qs.toString()
    if (q) url += `?${q}`
  }

  const reqHeaders = authHeaders(headers)
  const hasBody = body !== undefined
  if (hasBody) reqHeaders['Content-Type'] = 'application/json'

  const res = await fetch(url, {
    method,
    headers: reqHeaders,
    body: hasBody ? JSON.stringify(body) : undefined
  })

  if (res.status === 401) {
    localStorage.removeItem('token')
    sessionStorage.removeItem('token')
    localStorage.removeItem('user')
    sessionStorage.removeItem('user')
    router.push('/login')
    throw new Error(tx('auth.sessionExpired', '登入已過期，請重新登入'))
  }

  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(json?.message || `HTTP ${res.status}`)
  if (json && typeof json === 'object' && json.success === false) {
    throw new Error(json.message || 'Request failed')
  }
  return (json && typeof json === 'object' && 'data' in json) ? json.data : json
}

const TEST_DOMAIN_OPTIONS = [
  { value: 'System', label: 'System' },
  { value: 'Component', label: 'Component' },
  { value: 'OS', label: 'OS' }
]

const loadingLibrary = ref(false)
const savingSet = ref(false)
const keyword = ref('')
const domainFilter = ref('')
const targetFilter = ref('')
const chapterFilter = ref('')
const libraryRows = ref([])
const selectedLibraryRows = ref([])
const setItems = ref([])

const setForm = reactive({
  name: '',
  description: ''
})

const libraryUserId = computed(() => Number(getUser()?.id || 0) || 0)
const libraryName = computed(() => libraryUserId.value ? `__TC_LIBRARY_USER_${libraryUserId.value}__` : '__TC_LIBRARY_USER_0__')

const testDomainOptions = computed(() => TEST_DOMAIN_OPTIONS)

const targetFilterOptions = computed(() => {
  const fromRows = libraryRows.value.map(row => String(row?.testTarget || '').trim()).filter(Boolean)
  return Array.from(new Set(fromRows))
})

const chapterOptions = computed(() => {
  const fromRows = libraryRows.value.map(row => String(row?.testChapter || row?.category || '').trim()).filter(Boolean)
  return Array.from(new Set(fromRows))
})

const filteredLibraryRows = computed(() => {
  const kw = String(keyword.value || '').trim().toLowerCase()

  return libraryRows.value.filter(row => {
    if (domainFilter.value && row.testDomain !== domainFilter.value) return false
    if (targetFilter.value && row.testTarget !== targetFilter.value) return false
    if (chapterFilter.value && row.testChapter !== chapterFilter.value) return false

    if (!kw) return true

    const blob = [
      row.testDomain,
      row.testTarget,
      row.testChapter,
      row.code,
      row.testCase,
      row.testProcedure,
      row.testCriteria
    ].join(' ').toLowerCase()

    return blob.includes(kw)
  })
})

const plannedCount = computed(() => setItems.value.filter(row => row.isPlanned !== false).length)
const totalHours = computed(() => setItems.value.reduce((sum, row) => sum + (Number(row?.estHours) || 0), 0))
const totalHoursText = computed(() => formatHours(totalHours.value))

const previewDomainList = computed(() => {
  const map = new Map()
  setItems.value.forEach((row) => {
    const key = String(row?.testDomain || '').trim() || '—'
    map.set(key, (map.get(key) || 0) + 1)
  })
  return Array.from(map.entries()).map(([label, count]) => ({ label, count }))
})

function normalizeItem (item, idx = 0) {
  const testDomain = String(item?.testDomain || item?.domain || '').trim()
  const testTarget = String(item?.testTarget || item?.target || '').trim()
  const testChapter = String(item?.testChapter || item?.chapter || item?.category || '').trim()

  return {
    id: Number(item?.id || 0) || null,
    _key: String(item?.id || `${String(item?.code || '').trim()}-${idx}` || idx),
    testDomain,
    testTarget,
    testChapter,
    category: testChapter,
    code: String(item?.code || '').trim(),
    testCase: String(item?.testCase || '').trim(),
    testProcedure: String(item?.testProcedure || '').trim(),
    testCriteria: String(item?.testCriteria || '').trim(),
    estHours: Number(item?.estHours ?? item?.estHrs ?? item?.estimatedHours ?? 0) || 0,
    isPlanned: item?.isPlanned !== false,
    updatedAt: item?.updatedAt || ''
  }
}

function toPayloadItem (item, idx = 0) {
  const testDomain = String(item?.testDomain || '').trim()
  const testTarget = String(item?.testTarget || '').trim()
  const testChapter = String(item?.testChapter || item?.category || '').trim()

  return {
    testDomain,
    testTarget,
    testChapter,
    domain: testDomain,
    target: testTarget,
    chapter: testChapter,
    category: testChapter,
    code: String(item?.code || '').trim(),
    testCase: String(item?.testCase || '').trim(),
    testProcedure: String(item?.testProcedure || '').trim(),
    testCriteria: String(item?.testCriteria || '').trim(),
    estHours: Number(item?.estHours ?? 0) || 0,
    isPlanned: item?.isPlanned !== false,
    orderNo: idx
  }
}

function makeSig (row) {
  return [
    String(row?.testDomain || '').trim().toLowerCase(),
    String(row?.testTarget || '').trim().toLowerCase(),
    String(row?.testChapter || row?.category || '').trim().toLowerCase(),
    String(row?.code || '').trim().toLowerCase(),
    String(row?.testCase || '').trim().toLowerCase()
  ].join('||')
}

function cloneForSet (row, idx = 0) {
  const normalized = normalizeItem(row, idx)
  return {
    ...normalized,
    _setKey: `${makeSig(normalized)}::${Date.now()}::${Math.random().toString(36).slice(2, 8)}`
  }
}

function formatHours (v) {
  const n = Number(v)
  return Number.isFinite(n) ? n.toFixed(1) : '0.0'
}

function resetFilters () {
  keyword.value = ''
  domainFilter.value = ''
  targetFilter.value = ''
  chapterFilter.value = ''
}

async function loadLibrarySet () {
  loadingLibrary.value = true
  try {
    const data = await apiJson(`/default-test-sets/by-name/${encodeURIComponent(libraryName.value)}`)
    libraryRows.value = Array.isArray(data?.items) ? data.items.map((it, idx) => normalizeItem(it, idx)) : []
    selectedLibraryRows.value = []
  } catch (err) {
    const msg = String(err?.message || '')
    if (/not found/i.test(msg) || /404/.test(msg)) {
      libraryRows.value = []
      selectedLibraryRows.value = []
      return
    }
    ElMessage.error(err?.message || tx('testSetBuilder.messages.loadLibraryFailed', '載入測試項目庫失敗'))
  } finally {
    loadingLibrary.value = false
  }
}

function onLibrarySelectionChange (list) {
  selectedLibraryRows.value = Array.isArray(list) ? list : []
}

function appendRowsToSet (rows) {
  if (!Array.isArray(rows) || !rows.length) return

  const exists = new Set(setItems.value.map(makeSig))
  const appended = []
  let skipped = 0

  rows.forEach((row, idx) => {
    const normalized = normalizeItem(row, idx)
    const sig = makeSig(normalized)
    if (exists.has(sig)) {
      skipped += 1
      return
    }
    exists.add(sig)
    appended.push(cloneForSet(normalized, idx))
  })

  if (appended.length) {
    setItems.value = [...setItems.value, ...appended]
    ElMessage.success(tx('testSetBuilder.messages.appended', '已加入 {n} 筆測試項目', { n: appended.length }))
  }

  if (!appended.length && skipped) {
    ElMessage.warning(tx('testSetBuilder.messages.duplicateSkipped', '所選項目都已在測試集中'))
  } else if (skipped) {
    ElMessage.info(tx('testSetBuilder.messages.partialSkipped', '已跳過 {n} 筆重複項目', { n: skipped }))
  }
}

function appendSelectedToSet () {
  appendRowsToSet(selectedLibraryRows.value)
}

function appendOneToSet (row) {
  appendRowsToSet([row])
}

function moveItem (delta, index) {
  const next = [...setItems.value]
  const target = index + delta
  if (target < 0 || target >= next.length) return
  const [picked] = next.splice(index, 1)
  next.splice(target, 0, picked)
  setItems.value = next
}

function removeSetItem (index) {
  const next = [...setItems.value]
  next.splice(index, 1)
  setItems.value = next
}

function dedupeSetItems () {
  const seen = new Set()
  const next = []
  let removed = 0

  setItems.value.forEach((row, idx) => {
    const sig = makeSig(row)
    if (seen.has(sig)) {
      removed += 1
      return
    }
    seen.add(sig)
    next.push({ ...row, _setKey: row._setKey || `set-${idx}` })
  })

  setItems.value = next
  if (removed) ElMessage.success(tx('testSetBuilder.messages.deduped', '已移除 {n} 筆重複項目', { n: removed }))
  else ElMessage.info(tx('testSetBuilder.messages.noDuplicate', '目前沒有重複項目'))
}

async function clearSetItems () {
  if (!setItems.value.length) return
  try {
    await ElMessageBox.confirm(
      tx('testSetBuilder.confirmClear', '要清空目前測試集內容嗎？'),
      tx('common.confirm', '確認'),
      { type: 'warning' }
    )
  } catch {
    return
  }
  setItems.value = []
}

async function findSetByName (name) {
  try {
    return await apiJson(`/default-test-sets/by-name/${encodeURIComponent(name)}`)
  } catch (err) {
    const msg = String(err?.message || '')
    if (/not found/i.test(msg) || /404/.test(msg)) return null
    throw err
  }
}

async function saveTestSet () {
  const name = String(setForm.name || '').trim()
  const description = String(setForm.description || '').trim()

  if (!name) {
    ElMessage.warning(tx('testSetBuilder.validation.name', '請先輸入測試集名稱'))
    return
  }

  if (!setItems.value.length) {
    ElMessage.warning(tx('testSetBuilder.validation.items', '請先加入至少 1 筆測試項目'))
    return
  }

  savingSet.value = true
  try {
    const existing = await findSetByName(name)
    const body = {
      name,
      description,
      meta: {
        type: 'default-test-set',
        hidden: false,
        scope: 'user',
        source: 'test-set-builder'
      },
      items: setItems.value.map((row, idx) => toPayloadItem(row, idx))
    }

    if (existing?.id) {
      await apiJson(`/default-test-sets/${existing.id}`, {
        method: 'PUT',
        headers: existing?.etag ? { 'If-Match': String(existing.etag) } : {},
        body
      })
      ElMessage.success(tx('testSetBuilder.messages.updateSuccess', '測試集已更新'))
    } else {
      await apiJson('/default-test-sets', {
        method: 'POST',
        body
      })
      ElMessage.success(tx('testSetBuilder.messages.createSuccess', '測試集已儲存到預設測試集'))
    }
  } catch (err) {
    ElMessage.error(err?.message || tx('testSetBuilder.messages.saveFailed', '儲存測試集失敗'))
  } finally {
    savingSet.value = false
  }
}

onMounted(() => {
  loadLibrarySet()
})
</script>

<style scoped>
.test-set-builder-page {
  --page-grad-a: color-mix(in srgb, var(--el-color-primary) 12%, transparent);
  --page-grad-b: color-mix(in srgb, var(--el-color-success) 10%, transparent);
  --hero-grad-1: color-mix(in srgb, var(--el-color-primary) 92%, #1b5ed7 8%);
  --hero-grad-2: color-mix(in srgb, var(--el-color-primary-light-3) 82%, #6d5df6 18%);
  --hero-grad-3: color-mix(in srgb, var(--el-color-success) 22%, #7f56d9 78%);
  --hero-shadow: color-mix(in srgb, var(--el-color-primary) 24%, transparent);
  --card-bg: var(--el-bg-color);
  --card-bg-soft: var(--el-fill-color-blank);
  --card-bg-muted: var(--el-fill-color-extra-light);
  --card-border: var(--el-border-color-light);
  --card-border-strong: var(--el-border-color);
  --text-main: var(--el-text-color-primary);
  --text-sub: var(--el-text-color-secondary);
  --text-soft: var(--el-text-color-regular);
  --chip-bg: color-mix(in srgb, var(--el-color-primary) 10%, var(--el-fill-color-blank) 90%);
  --chip-border: color-mix(in srgb, var(--el-color-primary) 22%, var(--el-border-color-light) 78%);
  --chip-text: color-mix(in srgb, var(--el-color-primary) 72%, var(--el-text-color-primary) 28%);
  --soft-pill-bg: color-mix(in srgb, var(--el-color-primary) 11%, var(--el-fill-color-extra-light) 89%);
  --soft-pill-text: color-mix(in srgb, var(--el-color-primary) 68%, var(--el-text-color-primary) 32%);
  --table-head-bg: color-mix(in srgb, var(--el-color-primary) 6%, var(--el-fill-color-extra-light) 94%);
  --table-hover-bg: color-mix(in srgb, var(--el-color-primary) 4%, var(--el-fill-color-light) 96%);
  padding: 18px;
  background:
    radial-gradient(circle at top left, var(--page-grad-a), transparent 26%),
    radial-gradient(circle at right 18%, var(--page-grad-b), transparent 20%),
    linear-gradient(180deg, var(--el-fill-color-extra-light) 0%, var(--el-bg-color-page, var(--el-bg-color)) 42%, var(--el-bg-color) 100%);
  min-height: calc(100vh - 64px);
  transition: background-color .2s ease, color .2s ease;
}

.hero-card {
  position: relative;
  overflow: hidden;
  border-radius: 28px;
  padding: 24px;
  margin-bottom: 18px;
  background: linear-gradient(135deg, var(--hero-grad-1) 0%, var(--hero-grad-2) 46%, var(--hero-grad-3) 100%);
  box-shadow: 0 22px 60px var(--hero-shadow);
  color: #fff;
  border: 1px solid color-mix(in srgb, #fff 16%, transparent);
}

.hero-main {
  display: grid;
  grid-template-columns: minmax(0, 1.45fr) minmax(320px, 0.95fr);
  gap: 18px;
  position: relative;
  z-index: 1;
}

.hero-copy {
  min-width: 0;
}

.hero-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.04em;
  background: rgba(255, 255, 255, 0.16);
  border: 1px solid rgba(255, 255, 255, 0.18);
  backdrop-filter: blur(6px);
}

.hero-title {
  margin: 14px 0 8px;
  font-size: 38px;
  line-height: 1.1;
  font-weight: 900;
}

.hero-desc {
  max-width: 760px;
  margin: 0;
  color: rgba(255, 255, 255, 0.92);
  font-size: 15px;
  line-height: 1.75;
}

.hero-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 18px;
}

.hero-tag {
  display: inline-flex;
  align-items: center;
  padding: 9px 14px;
  border-radius: 999px;
  font-size: 13px;
  font-weight: 700;
  background: rgba(255, 255, 255, 0.13);
  border: 1px solid rgba(255, 255, 255, 0.18);
}

.hero-tag.success {
  background: rgba(17, 205, 123, 0.18);
}

.hero-stats {
  display: grid;
  grid-template-columns: 1fr;
  gap: 12px;
}

.hero-stat-card {
  position: relative;
  padding: 18px 18px 16px;
  border-radius: 22px;
  background: rgba(255, 255, 255, 0.13);
  border: 1px solid rgba(255, 255, 255, 0.18);
  backdrop-filter: blur(8px);
}

.hero-stat-card.primary {
  background: rgba(255, 255, 255, 0.18);
}

.stat-kicker {
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.04em;
  color: rgba(255, 255, 255, 0.82);
}

.stat-big {
  margin-top: 10px;
  font-size: 34px;
  line-height: 1;
  font-weight: 900;
}

.stat-mini {
  margin-top: 8px;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.8);
}

.hero-actions {
  position: relative;
  z-index: 1;
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  margin-top: 18px;
}

.hero-btn {
  border-radius: 14px;
  min-height: 42px;
}

.hero-actions :deep(.el-button:not(.el-button--primary)) {
  background: rgba(255, 255, 255, 0.12);
  color: #fff;
  border-color: rgba(255, 255, 255, 0.22);
}

.hero-actions :deep(.el-button:not(.el-button--primary):hover) {
  background: rgba(255, 255, 255, 0.18);
  color: #fff;
  border-color: rgba(255, 255, 255, 0.28);
}

.hero-actions :deep(.el-button--primary) {
  box-shadow: 0 10px 24px rgba(24, 51, 130, 0.28);
}

.hero-decor {
  position: absolute;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.09);
  filter: blur(2px);
}

.decor-a {
  width: 180px;
  height: 180px;
  top: -42px;
  right: 12%;
}

.decor-b {
  width: 92px;
  height: 92px;
  bottom: 18px;
  right: 42px;
}

.decor-c {
  width: 54px;
  height: 54px;
  bottom: 136px;
  left: 48%;
}

.main-grid {
  align-items: stretch;
}

.right-stack {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.panel-card {
  background: var(--card-bg);
  border: 1px solid var(--card-border);
  border-radius: 24px;
  overflow: hidden;
  box-shadow: 0 12px 36px color-mix(in srgb, var(--el-text-color-primary) 8%, transparent);
}

.panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.panel-head.solo {
  justify-content: flex-start;
}

.panel-title-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.panel-icon {
  width: 42px;
  height: 42px;
  border-radius: 14px;
  display: grid;
  place-items: center;
  background: linear-gradient(135deg,
    color-mix(in srgb, var(--el-color-primary) 16%, transparent),
    color-mix(in srgb, var(--el-color-success) 16%, transparent));
  border: 1px solid color-mix(in srgb, var(--el-color-primary) 18%, var(--card-border) 82%);
  font-size: 20px;
}

.panel-title {
  font-size: 20px;
  line-height: 1.2;
  font-weight: 900;
  color: var(--text-main);
}

.panel-subtitle {
  margin-top: 4px;
  color: var(--text-sub);
  font-size: 13px;
}

.panel-head-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.selected-chip {
  padding: 7px 12px;
  border-radius: 999px;
  background: var(--chip-bg);
  border: 1px solid var(--chip-border);
  color: var(--chip-text);
  font-size: 12px;
  font-weight: 700;
}

.filter-shell {
  margin-bottom: 14px;
  padding: 14px;
  border-radius: 20px;
  background: linear-gradient(180deg, var(--card-bg-muted) 0%, var(--card-bg-soft) 100%);
  border: 1px solid var(--card-border);
}

.search-row {
  margin-bottom: 12px;
}

.domain-quick-row {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 12px;
}

.quick-domain {
  appearance: none;
  border: 1px solid var(--card-border-strong);
  background: var(--card-bg);
  color: var(--text-soft);
  border-radius: 999px;
  padding: 9px 14px;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.18s ease;
}

.quick-domain:hover {
  transform: translateY(-1px);
  box-shadow: 0 8px 20px color-mix(in srgb, var(--el-color-primary) 14%, transparent);
  border-color: color-mix(in srgb, var(--el-color-primary) 38%, var(--card-border-strong) 62%);
}

.quick-domain.active {
  color: #fff;
  border-color: transparent;
  background: linear-gradient(135deg, var(--hero-grad-1) 0%, var(--hero-grad-2) 100%);
}

.filters-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
}

.table-wrap {
  border-radius: 18px;
  overflow: hidden;
}

.main-table :deep(.el-table) {
  --el-table-border-color: var(--card-border);
  --el-table-header-bg-color: var(--table-head-bg);
  --el-table-row-hover-bg-color: var(--table-hover-bg);
  --el-table-bg-color: var(--card-bg);
  --el-fill-color-lighter: var(--card-bg-muted);
}

.main-table :deep(th.el-table__cell) {
  background: var(--table-head-bg);
  color: var(--text-soft);
  font-weight: 800;
}

.main-table :deep(td.el-table__cell) {
  background: var(--card-bg);
}

.main-table :deep(.el-table__row:hover > td.el-table__cell) {
  background: var(--table-hover-bg);
}

.soft-pill {
  display: inline-flex;
  align-items: center;
  min-height: 24px;
  padding: 0 10px;
  border-radius: 999px;
  background: var(--soft-pill-bg);
  color: var(--soft-pill-text);
  font-size: 12px;
  font-weight: 700;
}

.testcase-cell {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.tc-name {
  font-weight: 800;
  color: var(--text-main);
}

.tc-sub,
.muted {
  color: var(--text-sub);
  font-size: 12px;
}

.vivid-card {
  background:
    radial-gradient(circle at top right, color-mix(in srgb, var(--el-color-primary) 12%, transparent), transparent 26%),
    linear-gradient(180deg, var(--card-bg) 0%, var(--card-bg-soft) 100%);
}

.meta-form {
  margin-bottom: 10px;
}

.meta-form :deep(.el-form-item__label) {
  color: var(--text-soft);
}

.meta-foot-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.metric-card {
  border-radius: 20px;
  padding: 16px;
  border: 1px solid var(--card-border);
}

.metric-card.pink {
  background: linear-gradient(180deg, color-mix(in srgb, var(--el-color-danger) 12%, transparent), var(--card-bg) 92%);
}

.metric-card.blue {
  background: linear-gradient(180deg, color-mix(in srgb, var(--el-color-primary) 12%, transparent), var(--card-bg) 92%);
}

.metric-card.yellow {
  background: linear-gradient(180deg, color-mix(in srgb, var(--el-color-warning) 14%, transparent), var(--card-bg) 92%);
}

.metric-label {
  color: var(--text-sub);
  font-size: 12px;
  margin-bottom: 8px;
  font-weight: 700;
}

.metric-value {
  font-size: 28px;
  line-height: 1;
  font-weight: 900;
  color: var(--text-main);
}

.set-preview-row {
  margin-bottom: 12px;
}

.preview-box {
  padding: 14px 16px;
  border-radius: 18px;
  background: linear-gradient(180deg, var(--card-bg-muted) 0%, var(--card-bg) 100%);
  border: 1px solid var(--card-border);
}

.preview-label {
  font-size: 12px;
  font-weight: 800;
  color: var(--text-sub);
  margin-bottom: 10px;
}

.preview-values {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.mini-pill {
  display: inline-flex;
  align-items: center;
  padding: 7px 12px;
  border-radius: 999px;
  background: var(--chip-bg);
  color: var(--chip-text);
  font-size: 12px;
  font-weight: 800;
  border: 1px solid var(--chip-border);
}

.row-actions {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.library-card :deep(.el-card__header),
.meta-card :deep(.el-card__header),
.current-set-card :deep(.el-card__header) {
  padding: 18px 20px;
  border-bottom: 1px solid var(--card-border);
}

.library-card :deep(.el-card__body),
.meta-card :deep(.el-card__body),
.current-set-card :deep(.el-card__body) {
  padding: 18px 20px 20px;
}

:deep(.el-empty__description p) {
  color: var(--text-sub);
}

@media (max-width: 1400px) {
  .hero-main {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 1200px) {
  .filters-grid,
  .meta-foot-grid {
    grid-template-columns: 1fr 1fr;
  }
}

@media (max-width: 900px) {
  .hero-title {
    font-size: 30px;
  }

  .filters-grid,
  .meta-foot-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .test-set-builder-page {
    padding: 12px;
  }

  .hero-card {
    padding: 18px;
    border-radius: 22px;
  }

  .hero-title {
    font-size: 28px;
  }

  .panel-head,
  .panel-head-actions {
    flex-direction: column;
    align-items: stretch;
  }

  .hero-actions {
    flex-direction: column;
  }
}

@supports not (color: color-mix(in srgb, white, black)) {
  .test-set-builder-page {
    background: linear-gradient(180deg, var(--el-fill-color-extra-light) 0%, var(--el-bg-color) 100%);
  }

  .panel-card,
  .filter-shell,
  .preview-box,
  .metric-card {
    border-color: var(--el-border-color-light);
  }

  .selected-chip,
  .mini-pill,
  .soft-pill {
    background: var(--el-fill-color-light);
    color: var(--el-color-primary);
  }
}
</style>