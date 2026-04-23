<!-- frontend/src/views/DefaultTestSet.vue -->
<template>
  <div class="page default-test-sets-page">
    <section class="hero-card">
      <div class="hero-main">
        <div class="hero-left">
          <div class="hero-icon-wrap">
            <div class="hero-icon">🧪</div>
          </div>
          <div class="hero-copy">
            <div class="eyebrow">{{ text('defaultTestSets.eyebrow', 'QA / Test Library') }}</div>
            <h2 class="hero-title">{{ text('defaultTestSets.title', '預設測試集') }}</h2>
            <div class="hero-subtitle">
              {{ text('defaultTestSets.subtitle', '管理預設測試集清單與其測試項目') }}
            </div>
          </div>
        </div>

        <div class="hero-actions">
          <el-input
            v-model.trim="query.keyword"
            class="w-search"
            clearable
            :placeholder="text('defaultTestSets.searchPlaceholder', '搜尋：名稱 / 說明')"
            @keyup.enter="onSearch"
            @clear="onSearch"
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>

          <el-button :icon="Search" @click="onSearch" :loading="loading">
            {{ text('common.search', '搜尋') }}
          </el-button>

          <el-button type="primary" :icon="Plus" @click="openEditor()">
            {{ text('common.add', '新增') }}
          </el-button>

          <el-button :icon="Refresh" @click="fetchList" :loading="loading">
            {{ text('common.refresh', '重新整理') }}
          </el-button>
        </div>
      </div>

      <div class="stats-grid">
        <div class="stat-card stat-primary">
          <div class="stat-label">{{ text('defaultTestSets.stats.totalSets', '測試集總數') }}</div>
          <div class="stat-value">{{ total }}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">{{ text('defaultTestSets.stats.currentPageItems', '目前頁面') }}</div>
          <div class="stat-value">{{ rows.length }}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">{{ text('defaultTestSets.stats.totalItems', '測項總數') }}</div>
          <div class="stat-value">{{ totalItems }}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">{{ text('defaultTestSets.stats.deletedSets', '已刪除') }}</div>
          <div class="stat-value">{{ deletedCount }}</div>
        </div>
      </div>
    </section>

    <el-card shadow="never" class="table-card">
      <template #header>
        <div class="section-head">
          <div>
            <div class="section-title">{{ text('defaultTestSets.listTitle', '測試集清單') }}</div>
            <div class="section-subtitle">
              {{ text('defaultTestSets.listSubtitle', '可搜尋、檢視、編輯與刪除預設測試集') }}
            </div>
          </div>
          <el-tag effect="plain" round>
            {{ text('defaultTestSets.totalLabel', '共 {count} 筆', { count: total }) }}
          </el-tag>
        </div>
      </template>

      <div v-if="!isMobile" class="desktop-table-wrap">
        <el-table
          :data="rows"
          border
          stripe
          v-loading="loading"
          :row-key="r => r.id"
          :empty-text="text('common.noData', '目前沒有資料')"
          class="main-table"
        >
          <el-table-column type="index" :label="text('common.index', '#')" width="60" align="center" />
          <el-table-column prop="id" label="ID" width="80" align="center" />

          <el-table-column :label="text('defaultTestSets.columns.name', '測試集名稱')" min-width="260" show-overflow-tooltip>
            <template #default="{ row }">
              <div class="name-cell">
                <el-button link type="primary" @click="openDetail(row)">
                  {{ row.name || text('defaultTestSets.unnamed', '未命名測試集') }}
                </el-button>

                <el-tag
                  v-if="row.isDeleted || row.deletedAt"
                  type="danger"
                  effect="plain"
                  size="small"
                >
                  {{ text('defaultTestSets.deleted', '已刪除') }}
                </el-tag>
              </div>
            </template>
          </el-table-column>

          <el-table-column prop="description" :label="text('defaultTestSets.columns.description', '說明')" min-width="260" show-overflow-tooltip>
            <template #default="{ row }">
              {{ row.description || '-' }}
            </template>
          </el-table-column>

          <el-table-column :label="text('defaultTestSets.columns.fromProduct', '來源產品')" width="120" align="center">
            <template #default="{ row }">
              <span v-if="row.fromProductId">#{{ row.fromProductId }}</span>
              <span v-else>-</span>
            </template>
          </el-table-column>

          <el-table-column :label="text('defaultTestSets.columns.itemsCount', '項目數')" width="100" align="center">
            <template #default="{ row }">
              {{ Number(row.itemsCount || 0) }}
            </template>
          </el-table-column>

          <el-table-column :label="text('defaultTestSets.columns.createdBy', '建立者')" width="120" align="center">
            <template #default="{ row }">
              {{ row.createdBy || '-' }}
            </template>
          </el-table-column>

          <el-table-column :label="text('defaultTestSets.columns.updatedAt', '更新時間')" width="180">
            <template #default="{ row }">
              {{ fmt(row.updatedAt) }}
            </template>
          </el-table-column>

          <el-table-column :label="text('common.actions', '操作')" width="270" fixed="right" align="center">
            <template #default="{ row }">
              <div class="row-actions">
                <el-button size="small" @click="openDetail(row)">
                  {{ text('defaultTestSets.actions.view', '檢視') }}
                </el-button>

                <el-button size="small" type="primary" plain @click="openEditor(row)">
                  {{ text('common.edit', '編輯') }}
                </el-button>

                <el-button
                  size="small"
                  type="danger"
                  plain
                  :loading="deletingId === row.id"
                  @click="onDelete(row)"
                >
                  {{ text('common.delete', '刪除') }}
                </el-button>
              </div>
            </template>
          </el-table-column>
        </el-table>
      </div>

      <div v-else class="mobile-cards" v-loading="loading">
        <template v-if="rows.length">
          <article v-for="row in rows" :key="row.id" class="mobile-set-card">
            <div class="mobile-set-top">
              <div>
                <div class="mobile-set-id">#{{ row.id }}</div>
                <div class="mobile-set-name">{{ row.name || text('defaultTestSets.unnamed', '未命名測試集') }}</div>
              </div>

              <el-tag
                v-if="row.isDeleted || row.deletedAt"
                type="danger"
                effect="plain"
                size="small"
              >
                {{ text('defaultTestSets.deleted', '已刪除') }}
              </el-tag>
            </div>

            <div class="mobile-set-desc">{{ row.description || '-' }}</div>

            <div class="mobile-meta-grid">
              <div class="meta-item">
                <span class="meta-label">{{ text('defaultTestSets.columns.fromProduct', '來源產品') }}</span>
                <span class="meta-value">{{ row.fromProductId ? `#${row.fromProductId}` : '-' }}</span>
              </div>
              <div class="meta-item">
                <span class="meta-label">{{ text('defaultTestSets.columns.itemsCount', '項目數') }}</span>
                <span class="meta-value">{{ Number(row.itemsCount || 0) }}</span>
              </div>
              <div class="meta-item">
                <span class="meta-label">{{ text('defaultTestSets.columns.createdBy', '建立者') }}</span>
                <span class="meta-value">{{ row.createdBy || '-' }}</span>
              </div>
              <div class="meta-item">
                <span class="meta-label">{{ text('defaultTestSets.columns.updatedAt', '更新時間') }}</span>
                <span class="meta-value">{{ fmt(row.updatedAt) }}</span>
              </div>
            </div>

            <div class="mobile-actions">
              <el-button @click="openDetail(row)">
                {{ text('defaultTestSets.actions.view', '檢視') }}
              </el-button>
              <el-button type="primary" plain @click="openEditor(row)">
                {{ text('common.edit', '編輯') }}
              </el-button>
              <el-button type="danger" plain :loading="deletingId === row.id" @click="onDelete(row)">
                {{ text('common.delete', '刪除') }}
              </el-button>
            </div>
          </article>
        </template>

        <el-empty
          v-else
          :description="text('common.noData', '目前沒有資料')"
        />
      </div>

      <div class="pager">
        <el-pagination
          background
          layout="total, sizes, prev, pager, next, jumper"
          :page-sizes="[10, 20, 50, 100]"
          :page-size="pageSize"
          :current-page="page"
          :total="total"
          @current-change="(p) => { page = p; fetchList() }"
          @size-change="(s) => { pageSize = s; page = 1; fetchList() }"
        />
      </div>
    </el-card>

    <el-dialog
      v-model="editor.visible"
      :title="editor.mode === 'edit'
        ? text('defaultTestSets.editor.editTitle', '編輯預設測試集')
        : text('defaultTestSets.editor.createTitle', '新增預設測試集')"
      :width="isMobile ? '94vw' : '640px'"
      :fullscreen="isXsMobile"
      :close-on-click-modal="false"
      destroy-on-close
      @closed="onEditorClosed"
    >
      <el-form
        ref="editorFormRef"
        :model="editor.form"
        :rules="editorRules"
        :label-width="isMobile ? '78px' : '90px'"
      >
        <el-form-item :label="text('defaultTestSets.editor.name', '名稱')" prop="name">
          <el-input
            v-model.trim="editor.form.name"
            maxlength="120"
            show-word-limit
            :placeholder="text('defaultTestSets.editor.namePlaceholder', '請輸入測試集名稱')"
          />
        </el-form-item>

        <el-form-item :label="text('defaultTestSets.editor.description', '說明')">
          <el-input
            v-model.trim="editor.form.description"
            type="textarea"
            :rows="4"
            maxlength="1000"
            show-word-limit
            :placeholder="text('defaultTestSets.editor.descriptionPlaceholder', '請輸入說明')"
          />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="editor.visible = false">{{ text('common.cancel', '取消') }}</el-button>
        <el-button
          type="primary"
          :icon="Check"
          :loading="editorSaving"
          @click="saveEditor"
        >
          {{ text('common.save', '儲存') }}
        </el-button>
      </template>
    </el-dialog>

    <el-dialog
      v-model="detail.visible"
      :title="text('defaultTestSets.detail.title', '預設測試集內容')"
      :width="isMobile ? '96vw' : '1200px'"
      :fullscreen="isMobile"
      :close-on-click-modal="false"
      destroy-on-close
    >
      <div v-loading="detail.loading">
        <template v-if="detail.data">
          <div class="detail-hero">
            <div class="detail-hero-main">
              <div class="detail-hero-title-wrap">
                <div class="detail-chip">ID {{ detail.data.id }}</div>
                <h3 class="detail-hero-title">
                  {{ detail.data.name || text('defaultTestSets.unnamed', '未命名測試集') }}
                </h3>
              </div>
              <div class="detail-desc">
                <span class="label">{{ text('defaultTestSets.columns.description', '說明') }}：</span>
                <span>{{ detail.data.description || '-' }}</span>
              </div>
            </div>

            <div class="detail-meta-grid">
              <div class="detail-stat-card">
                <div class="detail-stat-label">{{ text('defaultTestSets.columns.itemsCount', '項目數') }}</div>
                <div class="detail-stat-value">{{ detailItems.length }}</div>
              </div>
              <div class="detail-stat-card">
                <div class="detail-stat-label">{{ text('defaultTestSets.columns.fromProduct', '來源產品') }}</div>
                <div class="detail-stat-value small">{{ detail.data.fromProductId || '-' }}</div>
              </div>
              <div class="detail-stat-card">
                <div class="detail-stat-label">{{ text('defaultTestSets.columns.updatedAt', '更新時間') }}</div>
                <div class="detail-stat-value small">{{ fmt(detail.data.updatedAt) }}</div>
              </div>
            </div>
          </div>

          <el-input
            v-model.trim="detail.keyword"
            clearable
            :placeholder="text('defaultTestSets.detail.searchPlaceholder', '搜尋此測試集內的項目：分類 / 區段 / 代碼 / 測試項目')"
            class="detail-search"
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>

          <el-table
            v-if="!isMobile"
            :data="detailItems"
            border
            stripe
            max-height="58vh"
            :empty-text="text('defaultTestSets.detail.empty', '此測試集沒有測試項目')"
          >
            <el-table-column type="index" :label="text('common.index', '#')" width="60" align="center" />
            <el-table-column prop="category" :label="text('defaultTestSets.detail.columns.category', '分類')" width="120" />
            <el-table-column prop="section" :label="text('defaultTestSets.detail.columns.section', '區段')" width="140" />
            <el-table-column prop="code" :label="text('defaultTestSets.detail.columns.code', '代碼')" width="140" />
            <el-table-column prop="testCase" :label="text('defaultTestSets.detail.columns.testCase', '測試項目')" min-width="240" show-overflow-tooltip />
            <el-table-column prop="testProcedure" :label="text('defaultTestSets.detail.columns.testProcedure', '步驟')" min-width="260" show-overflow-tooltip />
            <el-table-column prop="testCriteria" :label="text('defaultTestSets.detail.columns.testCriteria', '判定')" min-width="220" show-overflow-tooltip />
            <el-table-column :label="text('defaultTestSets.detail.columns.estHours', '預計時數')" width="100" align="center">
              <template #default="{ row }">
                {{ row.estHours ?? 0 }}
              </template>
            </el-table-column>
            <el-table-column :label="text('defaultTestSets.detail.columns.enabled', '啟用')" width="90" align="center">
              <template #default="{ row }">
                <el-tag :type="row.isPlanned === false ? 'info' : 'success'" size="small">
                  {{ row.isPlanned === false ? text('common.no', '否') : text('common.yes', '是') }}
                </el-tag>
              </template>
            </el-table-column>
          </el-table>

          <div v-else class="detail-mobile-list">
            <template v-if="detailItems.length">
              <article v-for="(item, idx) in detailItems" :key="`${item.code || 'item'}-${idx}`" class="detail-mobile-card">
                <div class="detail-mobile-head">
                  <div class="detail-mobile-index">#{{ idx + 1 }}</div>
                  <el-tag :type="item.isPlanned === false ? 'info' : 'success'" size="small">
                    {{ item.isPlanned === false ? text('common.no', '否') : text('common.yes', '是') }}
                  </el-tag>
                </div>

                <div class="detail-mobile-title">{{ item.testCase || '-' }}</div>

                <div class="detail-mobile-grid">
                  <div class="meta-item">
                    <span class="meta-label">{{ text('defaultTestSets.detail.columns.category', '分類') }}</span>
                    <span class="meta-value">{{ item.category || '-' }}</span>
                  </div>
                  <div class="meta-item">
                    <span class="meta-label">{{ text('defaultTestSets.detail.columns.section', '區段') }}</span>
                    <span class="meta-value">{{ item.section || '-' }}</span>
                  </div>
                  <div class="meta-item">
                    <span class="meta-label">{{ text('defaultTestSets.detail.columns.code', '代碼') }}</span>
                    <span class="meta-value">{{ item.code || '-' }}</span>
                  </div>
                  <div class="meta-item">
                    <span class="meta-label">{{ text('defaultTestSets.detail.columns.estHours', '預計時數') }}</span>
                    <span class="meta-value">{{ item.estHours ?? 0 }}</span>
                  </div>
                </div>

                <div class="detail-mobile-block">
                  <div class="block-label">{{ text('defaultTestSets.detail.columns.testProcedure', '步驟') }}</div>
                  <div class="block-text">{{ item.testProcedure || '-' }}</div>
                </div>

                <div class="detail-mobile-block">
                  <div class="block-label">{{ text('defaultTestSets.detail.columns.testCriteria', '判定') }}</div>
                  <div class="block-text">{{ item.testCriteria || '-' }}</div>
                </div>
              </article>
            </template>

            <el-empty
              v-else
              :description="text('defaultTestSets.detail.empty', '此測試集沒有測試項目')"
            />
          </div>
        </template>
      </div>

      <template #footer>
        <el-button @click="detail.visible = false">{{ text('common.close', '關閉') }}</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onBeforeUnmount } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useI18n } from 'vue-i18n'
import { Plus, Refresh, Search, Check } from '@element-plus/icons-vue'
import { getApiBase } from '@/utils/apiBase'

const apiBase = getApiBase()
const { t, te } = useI18n()

function text (key, fallback, params) {
  if (te(key)) return t(key, params)
  if (!params) return fallback
  return String(fallback).replace(/\{(\w+)\}/g, (_, k) => String(params?.[k] ?? ''))
}

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

function fmt (v) {
  if (!v) return '-'
  const d = new Date(v)
  if (Number.isNaN(d.getTime())) return String(v)
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
}

function parseListPayload (j) {
  const list = Array.isArray(j?.data)
    ? j.data
    : Array.isArray(j?.rows)
      ? j.rows
      : Array.isArray(j)
        ? j
        : []

  const count = Number(j?.meta?.count ?? j?.count ?? j?.total ?? list.length) || 0
  return { list, count }
}

const viewportWidth = ref(typeof window !== 'undefined' ? window.innerWidth : 1280)
const isMobile = computed(() => viewportWidth.value <= 900)
const isXsMobile = computed(() => viewportWidth.value <= 560)

function handleResize () {
  viewportWidth.value = window.innerWidth
}

const loading = ref(false)
const deletingId = ref(null)
const rows = ref([])
const page = ref(1)
const pageSize = ref(20)
const total = ref(0)

const query = reactive({
  keyword: ''
})

const totalItems = computed(() => rows.value.reduce((sum, row) => sum + Number(row?.itemsCount || 0), 0))
const deletedCount = computed(() => rows.value.filter(row => row?.isDeleted || row?.deletedAt).length)

const editorFormRef = ref(null)
const editorSaving = ref(false)
const editor = reactive({
  visible: false,
  mode: 'create',
  form: {
    id: null,
    name: '',
    description: ''
  }
})

const editorRules = computed(() => ({
  name: [{ required: true, message: text('defaultTestSets.validation.nameRequired', '請輸入名稱'), trigger: 'blur' }]
}))

const detail = reactive({
  visible: false,
  loading: false,
  keyword: '',
  data: null
})

const detailItems = computed(() => {
  const items = Array.isArray(detail.data?.items) ? detail.data.items : []
  const kw = String(detail.keyword || '').trim().toLowerCase()
  if (!kw) return items

  return items.filter(item => {
    return [
      item?.category,
      item?.section,
      item?.code,
      item?.testCase,
      item?.testProcedure,
      item?.testCriteria
    ]
      .map(v => String(v || '').toLowerCase())
      .some(v => v.includes(kw))
  })
})

async function fetchList () {
  loading.value = true
  try {
    const params = new URLSearchParams({
      keyword: query.keyword || '',
      page: String(page.value),
      pageSize: String(pageSize.value),
      withItemsCount: 'true'
    })

    const r = await fetch(`${apiBase}/default-test-sets?${params.toString()}`, {
      headers: { 'Content-Type': 'application/json', ...authHeaders() }
    })
    if (handleAuth(r)) return

    const j = await r.json().catch(() => ({}))
    if (!r.ok) throw new Error(j?.message || text('defaultTestSets.messages.loadFailed', '預設測試集載入失敗'))

    const { list, count } = parseListPayload(j)
    rows.value = Array.isArray(list) ? list : []
    total.value = count
  } catch (e) {
    console.error(e)
    ElMessage.error(e?.message || text('defaultTestSets.messages.loadFailed', '預設測試集載入失敗'))
  } finally {
    loading.value = false
  }
}

function onSearch () {
  page.value = 1
  fetchList()
}

function openEditor (row) {
  if (row) {
    editor.mode = 'edit'
    editor.form = {
      id: row.id,
      name: row.name || '',
      description: row.description || ''
    }
  } else {
    editor.mode = 'create'
    editor.form = {
      id: null,
      name: '',
      description: ''
    }
  }

  editor.visible = true
}

function onEditorClosed () {
  editorSaving.value = false
  editor.form = {
    id: null,
    name: '',
    description: ''
  }
  editorFormRef.value?.clearValidate?.()
}

async function saveEditor () {
  try {
    await editorFormRef.value?.validate()
  } catch {
    return
  }

  editorSaving.value = true
  try {
    const isEdit = !!editor.form.id
    const url = isEdit
      ? `${apiBase}/default-test-sets/${editor.form.id}`
      : `${apiBase}/default-test-sets`

    const payload = {
      name: String(editor.form.name || '').trim(),
      description: String(editor.form.description || '').trim()
    }

    const r = await fetch(url, {
      method: isEdit ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify(payload)
    })
    if (handleAuth(r)) return

    const j = await r.json().catch(() => ({}))
    if (!r.ok) {
      throw new Error(j?.message || (isEdit
        ? text('defaultTestSets.messages.updateFailed', '更新失敗')
        : text('defaultTestSets.messages.createFailed', '新增失敗')))
    }

    ElMessage.success(isEdit
      ? text('defaultTestSets.messages.updateSuccess', '更新成功')
      : text('defaultTestSets.messages.createSuccess', '新增成功'))

    editor.visible = false
    fetchList()
  } catch (e) {
    console.error(e)
    ElMessage.error(e?.message || text('defaultTestSets.messages.saveFailed', '儲存失敗'))
  } finally {
    editorSaving.value = false
  }
}

async function openDetail (row) {
  detail.visible = true
  detail.loading = true
  detail.keyword = ''
  detail.data = null

  try {
    const r = await fetch(`${apiBase}/default-test-sets/${row.id}`, {
      headers: authHeaders()
    })
    if (handleAuth(r)) return

    const j = await r.json().catch(() => ({}))
    if (!r.ok) throw new Error(j?.message || text('defaultTestSets.messages.detailFailed', '載入明細失敗'))

    detail.data = j?.data || null
  } catch (e) {
    console.error(e)
    ElMessage.error(e?.message || text('defaultTestSets.messages.detailFailed', '載入明細失敗'))
    detail.visible = false
  } finally {
    detail.loading = false
  }
}

async function onDelete (row) {
  try {
    await ElMessageBox.confirm(
      text('defaultTestSets.confirmDelete', '確定要刪除「{name}」嗎？', {
        name: row.name || `#${row.id}`
      }),
      text('defaultTestSets.deleteDialogTitle', '刪除確認'),
      {
        type: 'warning',
        confirmButtonText: text('common.delete', '刪除'),
        cancelButtonText: text('common.cancel', '取消')
      }
    )

    deletingId.value = row.id
    const r = await fetch(`${apiBase}/default-test-sets/${row.id}`, {
      method: 'DELETE',
      headers: authHeaders()
    })
    if (handleAuth(r)) return

    const j = await r.json().catch(() => ({}))
    if (!r.ok) throw new Error(j?.message || text('defaultTestSets.messages.deleteFailed', '刪除失敗'))

    ElMessage.success(text('defaultTestSets.messages.deleteSuccess', '刪除成功'))

    if (rows.value.length <= 1 && page.value > 1) {
      page.value -= 1
    }

    fetchList()
  } catch (e) {
    if (e === 'cancel' || e === 'close') return
    console.error(e)
    ElMessage.error(e?.message || text('defaultTestSets.messages.deleteFailed', '刪除失敗'))
  } finally {
    deletingId.value = null
  }
}

onMounted(() => {
  fetchList()
  window.addEventListener('resize', handleResize)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize)
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
.table-card {
  border: 1px solid var(--el-border-color-light);
  border-radius: 22px;
  background:
    radial-gradient(circle at top right, color-mix(in srgb, var(--el-color-primary) 12%, transparent) 0%, transparent 34%),
    linear-gradient(180deg, color-mix(in srgb, var(--el-bg-color) 92%, var(--el-color-primary-light-9) 8%) 0%, var(--el-bg-color) 100%);
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
  inset: auto -60px -60px auto;
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
  width: 64px;
  height: 64px;
  border-radius: 20px;
  display: grid;
  place-items: center;
  background: linear-gradient(135deg, var(--el-color-primary-light-7), var(--el-color-primary-light-9));
  border: 1px solid color-mix(in srgb, var(--el-color-primary) 25%, var(--el-border-color-light));
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.5);
}

.hero-icon {
  font-size: 30px;
}

.hero-copy {
  min-width: 0;
}

.eyebrow {
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

.w-search {
  width: 320px;
  max-width: 100%;
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

.desktop-table-wrap {
  width: 100%;
}

.main-table {
  width: 100%;
}

.name-cell {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.row-actions,
.mobile-actions {
  display: flex;
  justify-content: center;
  gap: 8px;
  flex-wrap: wrap;
}

.mobile-cards {
  display: grid;
  gap: 12px;
}

.mobile-set-card,
.detail-mobile-card {
  border: 1px solid var(--el-border-color-lighter);
  background: var(--el-bg-color);
  border-radius: 18px;
  padding: 14px;
}

.mobile-set-top,
.detail-mobile-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
}

.mobile-set-id,
.detail-mobile-index {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  margin-bottom: 4px;
}

.mobile-set-name,
.detail-mobile-title {
  font-size: 18px;
  font-weight: 800;
  line-height: 1.25;
}

.mobile-set-desc {
  margin-top: 10px;
  color: var(--el-text-color-regular);
}

.mobile-meta-grid,
.detail-mobile-grid,
.detail-meta-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  margin-top: 12px;
}

.meta-item,
.detail-stat-card {
  padding: 10px 12px;
  border-radius: 14px;
  border: 1px solid var(--el-border-color-lighter);
  background: color-mix(in srgb, var(--el-fill-color-light) 88%, white 12%);
}

.meta-label,
.detail-stat-label,
.block-label {
  display: block;
  font-size: 12px;
  color: var(--el-text-color-secondary);
  margin-bottom: 4px;
}

.meta-value,
.detail-stat-value {
  font-size: 14px;
  font-weight: 700;
  word-break: break-word;
}

.detail-stat-value {
  font-size: 22px;
}

.detail-stat-value.small {
  font-size: 14px;
  line-height: 1.4;
}

.mobile-actions {
  margin-top: 12px;
  justify-content: flex-start;
}

.pager {
  margin-top: 14px;
  display: flex;
  justify-content: flex-end;
}

.detail-hero {
  display: grid;
  grid-template-columns: minmax(0, 1.4fr) minmax(300px, 1fr);
  gap: 14px;
  margin-bottom: 14px;
}

.detail-hero-main {
  padding: 16px;
  border-radius: 18px;
  border: 1px solid var(--el-border-color-lighter);
  background: linear-gradient(180deg, color-mix(in srgb, var(--el-fill-color-light) 92%, white 8%) 0%, var(--el-bg-color) 100%);
}

.detail-hero-title-wrap {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.detail-chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 28px;
  padding: 0 10px;
  border-radius: 999px;
  background: var(--el-color-primary-light-9);
  color: var(--el-color-primary);
  font-size: 12px;
  font-weight: 700;
}

.detail-hero-title {
  margin: 0;
  font-size: 24px;
  font-weight: 800;
}

.detail-desc {
  margin-top: 10px;
  color: var(--el-text-color-regular);
  line-height: 1.65;
}

.detail-desc .label {
  font-weight: 700;
}

.detail-search {
  margin-bottom: 14px;
}

.detail-mobile-list {
  display: grid;
  gap: 12px;
}

.detail-mobile-block {
  margin-top: 12px;
}

.block-text {
  padding: 10px 12px;
  border-radius: 12px;
  background: color-mix(in srgb, var(--el-fill-color-light) 90%, white 10%);
  border: 1px solid var(--el-border-color-lighter);
  color: var(--el-text-color-regular);
  line-height: 1.6;
  word-break: break-word;
}

@media (max-width: 1100px) {
  .stats-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .detail-hero {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 900px) {
  .default-test-sets-page {
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

  .w-search {
    width: 100%;
  }

  .pager {
    justify-content: flex-start;
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
  .mobile-meta-grid,
  .detail-mobile-grid,
  .detail-meta-grid {
    grid-template-columns: 1fr;
  }

  .hero-actions :deep(.el-button),
  .mobile-actions :deep(.el-button) {
    flex: 1 1 calc(50% - 8px);
  }

  .section-head {
    align-items: flex-start;
  }
}
</style>
