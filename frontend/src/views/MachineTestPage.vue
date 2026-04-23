<template>
  <div class="page machine-test-page-vivid">
    <section class="hero-card">
      <div class="hero-main">
        <div class="hero-left">
          <div class="hero-icon-wrap">
            <div class="hero-icon">🧪</div>
          </div>

          <div class="hero-copy">
            <div class="hero-eyebrow">{{ text('machineTest.eyebrow', 'Machine Scheduling Center') }}</div>
            <h2 class="hero-title">{{ text('machineTest.title', '機台測試排程') }}</h2>
            <div class="hero-subtitle">
              {{ text('machineTest.heroSubtitle', '建立排程、安排測試項目、指定使用者並快速管理啟停與編輯操作') }}
            </div>
          </div>
        </div>

        <div class="hero-actions">
          <el-button class="btn" :icon="Refresh" @click="fetchAll" :loading="loading">
            {{ text('common.refresh', '重新整理') }}
          </el-button>
        </div>
      </div>

      <div class="stats-grid">
        <div class="stat-card stat-primary">
          <div class="stat-label">{{ text('machineTest.stats.totalSchedules', '排程總數') }}</div>
          <div class="stat-value">{{ total }}</div>
        </div>

        <div class="stat-card">
          <div class="stat-label">{{ text('machineTest.stats.machines', '機台數') }}</div>
          <div class="stat-value">{{ machines.length }}</div>
        </div>

        <div class="stat-card">
          <div class="stat-label">{{ text('machineTest.stats.users', '使用者數') }}</div>
          <div class="stat-value">{{ users.length }}</div>
        </div>

        <div class="stat-card">
          <div class="stat-label">{{ text('machineTest.stats.currentPage', '目前頁面') }}</div>
          <div class="stat-value">{{ schedules.length }}</div>
        </div>
      </div>
    </section>

    <div class="layout-grid">
      <el-card shadow="never" class="create-card">
        <template #header>
          <div class="section-head">
            <div>
              <div class="section-title">{{ text('machineTest.cardCreateTitle', '新增排程') }}</div>
              <div class="section-subtitle">
                {{ text('machineTest.createSubtitle', '選擇機台、測試專案、測試項目、使用者與時間區間') }}
              </div>
            </div>
          </div>
        </template>

        <div class="form-hero">
          <div class="form-hero-main">
            <div class="form-hero-title">{{ text('machineTest.formHeroTitle', '建立新的測試排程') }}</div>
            <div class="form-hero-subtitle">
              {{ text('machineTest.formHeroSubtitle', '建立後會立即出現在右側清單，可再進行編輯、啟動或刪除') }}
            </div>
          </div>

          <div class="form-preview" v-if="form.machineId || form.testName || form.userId">
            <div class="preview-label">{{ text('machineTest.preview', '排程預覽') }}</div>
            <div class="preview-value">{{ previewMachineName }}</div>
            <div class="preview-sub">{{ form.testName || text('machineTest.form.testNamePlaceholder', '請選擇測試項目') }}</div>
          </div>
        </div>

        <el-form :model="form" label-position="top" class="stack-form">
          <el-form-item :label="text('machineTest.form.machine', '機台')">
            <el-select
              v-model="form.machineId"
              :placeholder="text('machineTest.form.machinePlaceholder', '請選擇機台')"
              filterable
              clearable
              class="w-100"
            >
              <el-option
                v-for="m in machines"
                :key="m.id"
                :label="m.chamberName || m.name || ('#' + m.id)"
                :value="m.id"
              />
            </el-select>
          </el-form-item>

          <el-form-item :label="text('machineTest.form.testProject', '測試專案')">
            <el-input
              v-model.trim="form.testProject"
              :placeholder="text('machineTest.form.testProjectPlaceholder', '請輸入測試專案')"
            />
          </el-form-item>

          <el-form-item :label="text('machineTest.form.testName', '測試項目')">
            <el-select
              v-model="form.testName"
              :placeholder="text('machineTest.form.testNamePlaceholder', '請選擇測試項目')"
              filterable
              clearable
              class="w-100"
              @change="onFormTestNameChange"
            >
              <el-option
                v-for="item in TEST_ITEMS"
                :key="item"
                :label="item"
                :value="item"
              />
            </el-select>
          </el-form-item>

          <el-form-item :label="text('machineTest.form.user', '使用者')">
            <el-select
              v-model="form.userId"
              :placeholder="text('machineTest.form.userPlaceholder', '請選擇使用者')"
              filterable
              clearable
              class="w-100"
            >
              <el-option
                v-for="u in users"
                :key="u.id"
                :label="userLabel(u)"
                :value="u.id"
              />
            </el-select>
          </el-form-item>

          <el-form-item :label="text('machineTest.form.time', '時間區間')">
            <el-date-picker
              v-model="form.range"
              type="datetimerange"
              :start-placeholder="text('common.time.start', '開始時間')"
              :end-placeholder="text('common.time.end', '結束時間')"
              :shortcuts="rangeShortcuts"
              class="w-100"
            />
          </el-form-item>

          <div class="form-actions">
            <el-button
              class="btn"
              type="primary"
              :loading="creating"
              :icon="Check"
              @click="create"
            >
              {{ text('machineTest.form.submit', '建立排程') }}
            </el-button>
          </div>
        </el-form>
      </el-card>

      <el-card shadow="never" class="list-card">
        <template #header>
          <div class="section-head">
            <div>
              <div class="section-title">{{ text('machineTest.listTitle', '排程列表') }}</div>
              <div class="section-subtitle">
                {{ text('machineTest.listSubtitle', '查看所有排程資料，並快速執行編輯、啟動、停止與刪除') }}
              </div>
            </div>

            <el-tag effect="plain" round>
              {{ text('machineTest.totalTag', '共 {count} 筆', { count: total }) }}
            </el-tag>
          </div>
        </template>

        <el-table
          v-if="!isMobile"
          :data="schedules"
          border
          stripe
          height="56vh"
          v-loading="loading"
          class="tbl"
        >
          <el-table-column
            prop="machine.name"
            :label="text('machineTest.table.machine', '機台')"
            width="200"
          >
            <template #default="{ row }">
              {{ row?.machine?.chamberName || row?.machine?.name || '-' }}
            </template>
          </el-table-column>

          <el-table-column
            prop="testProject"
            :label="text('machineTest.table.project', '測試專案')"
            min-width="160"
            show-overflow-tooltip
          >
            <template #default="{ row }">
              {{ row.testProject || '-' }}
            </template>
          </el-table-column>

          <el-table-column
            prop="testName"
            :label="text('machineTest.table.test', '測試項目')"
            min-width="180"
            show-overflow-tooltip
          />

          <el-table-column
            prop="userName"
            :label="text('machineTest.table.user', '使用者')"
            width="160"
            show-overflow-tooltip
          >
            <template #default="{ row }">
              {{ row.userName || row.operator || '-' }}
            </template>
          </el-table-column>

          <el-table-column
            prop="status"
            :label="text('machineTest.table.status', '狀態')"
            width="120"
          >
            <template #default="{ row }">
              <el-tag :type="statusTag(row.status)">
                {{ row.status || '-' }}
              </el-tag>
            </template>
          </el-table-column>

          <el-table-column
            prop="startTime"
            :label="text('machineTest.table.start', '開始')"
            width="200"
          >
            <template #default="{ row }">
              {{ fmt(row.startTime) }}
            </template>
          </el-table-column>

          <el-table-column
            prop="endTime"
            :label="text('machineTest.table.end', '結束')"
            width="200"
          >
            <template #default="{ row }">
              {{ fmt(row.endTime) }}
            </template>
          </el-table-column>

          <el-table-column
            :label="text('machineTest.table.actions', '操作')"
            width="280"
            align="right"
          >
            <template #default="{ row }">
              <div class="table-actions">
                <el-button size="small" :icon="Edit" @click="openEdit(row)">
                  {{ text('machineTest.action.edit', '編輯') }}
                </el-button>

                <el-button
                  size="small"
                  type="primary"
                  :icon="VideoPlay"
                  @click="startNow(row)"
                >
                  {{ text('machineTest.action.start', '啟動') }}
                </el-button>

                <el-button
                  size="small"
                  type="danger"
                  plain
                  :icon="CircleClose"
                  @click="stopNow(row)"
                >
                  {{ text('machineTest.action.stop', '停止') }}
                </el-button>

                <el-popconfirm
                  :title="text('machineTest.action.deleteConfirm', '確定要刪除？')"
                  @confirm="remove(row)"
                >
                  <template #reference>
                    <el-button size="small" type="danger" plain :icon="Delete">
                      {{ text('machineTest.action.delete', '刪除') }}
                    </el-button>
                  </template>
                </el-popconfirm>
              </div>
            </template>
          </el-table-column>
        </el-table>

        <div v-else class="mobile-list" v-loading="loading">
          <template v-if="schedules.length">
            <article v-for="row in schedules" :key="row.id" class="schedule-card">
              <div class="schedule-top">
                <div class="schedule-name">{{ row?.machine?.chamberName || row?.machine?.name || '-' }}</div>
                <el-tag :type="statusTag(row.status)" effect="plain" class="pill mini">
                  {{ row.status || '-' }}
                </el-tag>
              </div>

              <div class="meta-grid">
                <div class="meta-box">
                  <div class="meta-label">{{ text('machineTest.table.project', '測試專案') }}</div>
                  <div class="meta-value">{{ row.testProject || '-' }}</div>
                </div>
                <div class="meta-box">
                  <div class="meta-label">{{ text('machineTest.table.test', '測試項目') }}</div>
                  <div class="meta-value">{{ row.testName || '-' }}</div>
                </div>
                <div class="meta-box">
                  <div class="meta-label">{{ text('machineTest.table.user', '使用者') }}</div>
                  <div class="meta-value">{{ row.userName || row.operator || '-' }}</div>
                </div>
                <div class="meta-box">
                  <div class="meta-label">{{ text('machineTest.table.start', '開始') }}</div>
                  <div class="meta-value">{{ fmt(row.startTime) }}</div>
                </div>
                <div class="meta-box">
                  <div class="meta-label">{{ text('machineTest.table.end', '結束') }}</div>
                  <div class="meta-value">{{ fmt(row.endTime) }}</div>
                </div>
              </div>

              <div class="card-actions">
                <el-button size="small" :icon="Edit" @click="openEdit(row)">
                  {{ text('machineTest.action.edit', '編輯') }}
                </el-button>
                <el-button size="small" type="primary" :icon="VideoPlay" @click="startNow(row)">
                  {{ text('machineTest.action.start', '啟動') }}
                </el-button>
                <el-button size="small" type="danger" plain :icon="CircleClose" @click="stopNow(row)">
                  {{ text('machineTest.action.stop', '停止') }}
                </el-button>
                <el-popconfirm
                  :title="text('machineTest.action.deleteConfirm', '確定要刪除？')"
                  @confirm="remove(row)"
                >
                  <template #reference>
                    <el-button size="small" type="danger" plain :icon="Delete">
                      {{ text('machineTest.action.delete', '刪除') }}
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
            @current-change="(n)=>{ q.page = n; fetchSchedules() }"
            @size-change="(s)=>{ q.pageSize = s; q.page = 1; fetchSchedules() }"
          />
        </div>
      </el-card>
    </div>

    <el-dialog
      v-model="dlg.show"
      :title="text('machineTest.dialog.editTitle', '編輯排程')"
      :width="isMobile ? '100%' : '620px'"
      :fullscreen="isMobile"
      :close-on-click-modal="false"
      destroy-on-close
    >
      <div class="dialog-hero">
        <div class="dialog-main">
          <div class="dialog-title">{{ text('machineTest.dialogHeroTitle', '更新排程資料') }}</div>
          <div class="dialog-subtitle">
            {{ text('machineTest.dialogHeroSubtitle', '可調整測試專案、測試項目、使用者、時間區間與狀態') }}
          </div>
        </div>

        <div class="dialog-preview" v-if="dlg.data.testName || dlg.data.testProject">
          <div class="preview-label">{{ text('machineTest.preview', '排程預覽') }}</div>
          <div class="preview-value">{{ dlg.data.testProject || '-' }}</div>
          <div class="preview-sub">{{ dlg.data.testName || '-' }}</div>
        </div>
      </div>

      <el-form :model="dlg.data" label-position="top" class="stack-form">
        <el-form-item :label="text('machineTest.form.testProject', '測試專案')">
          <el-input
            v-model.trim="dlg.data.testProject"
            :placeholder="text('machineTest.form.testProjectPlaceholder', '請輸入測試專案')"
          />
        </el-form-item>

        <el-form-item :label="text('machineTest.form.testName', '測試項目')">
          <el-select
            v-model="dlg.data.testName"
            :placeholder="text('machineTest.form.testNamePlaceholder', '請選擇測試項目')"
            filterable
            clearable
            class="w-100"
            @change="onDlgTestNameChange"
          >
            <el-option
              v-for="item in TEST_ITEMS"
              :key="item"
              :label="item"
              :value="item"
            />
          </el-select>
        </el-form-item>

        <el-form-item :label="text('machineTest.form.user', '使用者')">
          <el-select
            v-model="dlg.data.userId"
            :placeholder="text('machineTest.form.userPlaceholder', '請選擇使用者')"
            filterable
            clearable
            class="w-100"
          >
            <el-option
              v-for="u in users"
              :key="u.id"
              :label="userLabel(u)"
              :value="u.id"
            />
          </el-select>
        </el-form-item>

        <el-form-item :label="text('machineTest.form.time', '時間區間')">
          <el-date-picker
            v-model="dlg.data.range"
            type="datetimerange"
            class="w-100"
          />
        </el-form-item>

        <el-form-item :label="text('machineTest.dialog.statusLabel', '狀態')">
          <el-select v-model="dlg.data.status" class="w-status">
            <el-option label="pending" value="pending" />
            <el-option label="running" value="running" />
            <el-option label="completed" value="completed" />
            <el-option label="canceled" value="canceled" />
          </el-select>
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button class="btn" @click="dlg.show = false">
          {{ text('common.cancel', '取消') }}
        </el-button>
        <el-button
          class="btn"
          type="primary"
          :loading="dlg.loading"
          :icon="Check"
          @click="saveEdit"
        >
          {{ text('common.save', '儲存') }}
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed, watch, onBeforeUnmount } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Refresh,
  Check,
  Delete,
  VideoPlay,
  CircleClose,
  Edit
} from '@element-plus/icons-vue'
import { getApiBase } from '@/utils/apiBase'

const { t, te } = useI18n()
const apiBase = getApiBase()
const route = useRoute()
const router = useRouter()

function text (key, fallback, params) {
  if (te(key)) return t(key, params)
  if (!params) return fallback
  return String(fallback).replace(/\{(\w+)\}/g, (_, k) => String(params?.[k] ?? ''))
}

/* =========================
   ✅ Options
========================= */
const TEST_ITEMS = [
  '-20C~60C BurnInTest',
  '-20C~60C Reboot',
  '-30C~70C BurnInTest',
  '0C~50C BurnInTest',
  '0C~50C Reboot',
  'other'
]
const OTHER_VALUE = 'other'

/* =========================
   ✅ State
========================= */
const machines = ref([])
const users = ref([])
const schedules = ref([])
const total = ref(0)
const loading = ref(false)

const q = reactive({ page: 1, pageSize: 20 })

const initialMachineId = ref(route.query.machineId ? Number(route.query.machineId) : null)
const initialUserId = ref(route.query.userId ? Number(route.query.userId) : null)

const form = reactive({
  machineId: initialMachineId.value,
  testProject: '',
  testName: '',
  userId: initialUserId.value || null,
  range: []
})
const creating = ref(false)

const dlg = reactive({
  show: false,
  loading: false,
  data: {
    id: null,
    testProject: '',
    testName: '',
    userId: null,
    range: [],
    status: 'pending'
  }
})

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

/* =========================
   ✅ Helpers
========================= */
function authHeaders () {
  const token = localStorage.getItem('token') || sessionStorage.getItem('token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

function handleAuth (res) {
  if (res.status === 401) {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    sessionStorage.removeItem('token')
    sessionStorage.removeItem('user')
    ElMessage.warning(text('common.authExpired', '登入已過期'))
    router.push('/login')
    return true
  }
  return false
}

function fmt (v) {
  if (!v) return '-'
  const d = new Date(v)
  return Number.isNaN(d.getTime()) ? String(v) : d.toLocaleString()
}

function statusTag (s) {
  const v = String(s || '').toLowerCase()
  if (v === 'running') return 'warning'
  if (v === 'completed') return 'success'
  if (v === 'canceled') return 'info'
  return 'info'
}

function userLabel (u) {
  return u?.name || u?.username || `#${u?.id ?? ''}`
}

function findUserById (id) {
  if (!id) return null
  return users.value.find(u => Number(u.id) === Number(id)) || null
}

function pickRows (body) {
  if (Array.isArray(body)) return body
  if (Array.isArray(body?.data)) return body.data
  if (Array.isArray(body?.rows)) return body.rows
  if (Array.isArray(body?.data?.rows)) return body.data.rows
  return []
}
function pickTotal (body) {
  const candidates = [
    body?.total,
    body?.count,
    body?.data?.total,
    body?.data?.count
  ]
  for (const v of candidates) {
    const n = Number(v)
    if (Number.isFinite(n)) return n
  }
  return 0
}

const previewMachineName = computed(() => {
  const found = machines.value.find(m => Number(m.id) === Number(form.machineId))
  return found ? (found.chamberName || found.name || `#${found.id}`) : text('machineTest.form.machinePlaceholder', '請選擇機台')
})

/* =========================
   ✅ Date shortcuts
========================= */
const rangeShortcuts = computed(() => [
  {
    text: text('machineTest.rangeShortcut.today', '今天'),
    value: () => {
      const start = new Date()
      start.setHours(9, 0, 0, 0)
      const end = new Date()
      end.setHours(17, 30, 0, 0)
      return [start, end]
    }
  },
  {
    text: text('machineTest.rangeShortcut.tomorrow', '明天'),
    value: () => {
      const start = new Date()
      start.setDate(start.getDate() + 1)
      start.setHours(9, 0, 0, 0)
      const end = new Date(start)
      end.setHours(17, 30, 0, 0)
      return [start, end]
    }
  }
])

/* =========================
   ✅ other: custom input
========================= */
async function handleSelectOther (setter, fallbackSetter) {
  try {
    const { value } = await ElMessageBox.prompt(
      text('machineTest.msg.customTestItemMessage', '請輸入自訂測試項目'),
      text('machineTest.msg.customTestItemTitle', '自訂測試項目'),
      {
        confirmButtonText: text('common.confirm', '確認'),
        cancelButtonText: text('common.cancel', '取消'),
        inputPattern: /.+/,
        inputErrorMessage: text('machineTest.msg.customTestItemError', '請輸入內容')
      }
    )
    const v = String(value || '').trim()
    if (!v) return
    setter(v)
  } catch {
    fallbackSetter?.()
  }
}

function onFormTestNameChange (val) {
  if (val === OTHER_VALUE) {
    handleSelectOther(
      (v) => { form.testName = v },
      () => { form.testName = '' }
    )
  }
}

function onDlgTestNameChange (val) {
  if (val === OTHER_VALUE) {
    handleSelectOther(
      (v) => { dlg.data.testName = v },
      () => { dlg.data.testName = '' }
    )
  }
}

/* =========================
   ✅ API
========================= */
async function fetchMachines () {
  try {
    const res = await fetch(`${apiBase}/machines`, { headers: authHeaders() })
    if (handleAuth(res)) return
    const body = await res.json().catch(() => null)
    machines.value = res.ok ? pickRows(body) : []

    if (initialMachineId.value && !form.machineId) {
      const found = machines.value.find(x => Number(x.id) === initialMachineId.value)
      if (found) form.machineId = found.id
    }
  } catch (e) {
    console.error(e)
    ElMessage.error(text('machineTest.msg.loadMachinesFail', '載入機台失敗'))
  }
}

async function fetchUsers () {
  try {
    const res = await fetch(`${apiBase}/users/simple`, { headers: authHeaders() })
    if (handleAuth(res)) return
    if (!res.ok) throw new Error('bad status')
    const body = await res.json().catch(() => null)
    users.value = pickRows(body)
  } catch (e) {
    console.error(e)
    ElMessage.error(text('machineTest.msg.loadUsersFail', '載入使用者失敗'))
  }
}

async function fetchSchedules () {
  loading.value = true
  try {
    const params = new URLSearchParams({
      page: String(q.page),
      pageSize: String(q.pageSize)
    })

    const res = await fetch(`${apiBase}/machine-schedules?${params.toString()}`, {
      headers: authHeaders()
    })
    if (handleAuth(res)) {
      schedules.value = []
      total.value = 0
      return
    }

    const body = await res.json().catch(() => null)
    schedules.value = res.ok ? pickRows(body) : []
    total.value = res.ok ? pickTotal(body) : 0
  } catch (e) {
    console.error(e)
    ElMessage.error(text('machineTest.msg.loadSchedulesFail', '載入排程失敗'))
  } finally {
    loading.value = false
  }
}

async function fetchAll () {
  await Promise.all([fetchMachines(), fetchUsers(), fetchSchedules()])
}

/* =========================
   ✅ Actions
========================= */
async function create () {
  if (!form.machineId || !form.testName || !form.userId || !(form.range?.length === 2)) {
    return ElMessage.warning(text('machineTest.msg.fillAll', '請填寫完整資料'))
  }

  const [start, end] = form.range
  if (!start || !end) return ElMessage.warning(text('machineTest.msg.fillAll', '請填寫完整資料'))
  if (new Date(end).getTime() <= new Date(start).getTime()) {
    return ElMessage.warning(text('machineTest.msg.fillAll', '請填寫完整資料'))
  }

  creating.value = true
  try {
    const selectedUser = findUserById(form.userId)
    const payload = {
      machineId: form.machineId,
      testProject: form.testProject || null,
      testName: form.testName,
      startTime: new Date(start).toISOString(),
      endTime: new Date(end).toISOString(),
      userId: form.userId,
      userName: selectedUser ? (selectedUser.name || selectedUser.username || null) : null
    }

    const res = await fetch(`${apiBase}/machine-schedules`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify(payload)
    })
    if (handleAuth(res)) return

    if (!res.ok) {
      const j = await res.json().catch(() => ({}))
      throw new Error(j?.message || text('machineTest.msg.createFail', '建立失敗'))
    }

    ElMessage.success(text('machineTest.msg.createSuccess', '建立成功'))

    form.machineId = initialMachineId.value || null
    form.testProject = ''
    form.testName = ''
    form.userId = initialUserId.value || null
    form.range = []

    await fetchSchedules()
  } catch (e) {
    console.error(e)
    ElMessage.error(e?.message || text('machineTest.msg.createFail', '建立失敗'))
  } finally {
    creating.value = false
  }
}

function openEdit (r) {
  Object.assign(dlg.data, {
    id: r.id,
    testProject: r.testProject || '',
    testName: r.testName || '',
    userId: r.userId ?? null,
    status: r.status || 'pending',
    range: (r.startTime && r.endTime) ? [new Date(r.startTime), new Date(r.endTime)] : []
  })
  dlg.show = true
}

async function saveEdit () {
  dlg.loading = true
  try {
    const [start, end] = dlg.data.range || []
    const selectedUser = findUserById(dlg.data.userId)

    const payload = {
      testProject: dlg.data.testProject || null,
      testName: dlg.data.testName,
      status: dlg.data.status,
      userId: dlg.data.userId,
      userName: selectedUser ? (selectedUser.name || selectedUser.username || null) : null,
      startTime: start ? new Date(start).toISOString() : undefined,
      endTime: end ? new Date(end).toISOString() : undefined
    }

    const res = await fetch(`${apiBase}/machine-schedules/${dlg.data.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify(payload)
    })
    if (handleAuth(res)) return

    if (!res.ok) {
      const j = await res.json().catch(() => ({}))
      throw new Error(j?.message || text('machineTest.msg.updateFail', '更新失敗'))
    }

    ElMessage.success(text('machineTest.msg.updateSuccess', '更新成功'))
    dlg.show = false
    await fetchSchedules()
  } catch (e) {
    console.error(e)
    ElMessage.error(e?.message || text('machineTest.msg.updateFail', '更新失敗'))
  } finally {
    dlg.loading = false
  }
}

async function startNow (r) {
  try {
    const res = await fetch(`${apiBase}/machines/${r.machineId}/start`, {
      method: 'PUT',
      headers: authHeaders()
    })
    if (handleAuth(res)) return
    const j = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(j?.message || text('machineTest.msg.opFail', '操作失敗'))
    ElMessage.success(j?.message || text('machineTest.msg.startSuccess', '啟動成功'))
    await fetchAll()
  } catch (e) {
    console.error(e)
    ElMessage.error(e?.message || text('machineTest.msg.opFail', '操作失敗'))
  }
}

async function stopNow (r) {
  try {
    const res = await fetch(`${apiBase}/machines/${r.machineId}/stop`, {
      method: 'PUT',
      headers: authHeaders()
    })
    if (handleAuth(res)) return
    const j = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(j?.message || text('machineTest.msg.opFail', '操作失敗'))
    ElMessage.success(j?.message || text('machineTest.msg.stopSuccess', '停止成功'))
    await fetchAll()
  } catch (e) {
    console.error(e)
    ElMessage.error(e?.message || text('machineTest.msg.opFail', '操作失敗'))
  }
}

async function remove (r) {
  try {
    const res = await fetch(`${apiBase}/machine-schedules/${r.id}`, {
      method: 'DELETE',
      headers: authHeaders()
    })
    if (handleAuth(res)) return
    if (!res.ok) {
      const j = await res.json().catch(() => ({}))
      throw new Error(j?.message || 'bad status')
    }
    ElMessage.success(text('machineTest.msg.deleteSuccess', '刪除成功'))
    await fetchSchedules()
  } catch (e) {
    console.error(e)
    ElMessage.error(text('machineTest.msg.deleteFail', '刪除失敗'))
  }
}

onMounted(() => {
  cleanupMql = setupMql()
  fetchAll()
})

onBeforeUnmount(() => {
  if (cleanupMql) cleanupMql()
})
</script>

<style scoped>
.machine-test-page-vivid {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  color: var(--el-text-color-primary);
}

.btn { border-radius: 12px; }
.w-100 { width: 100%; }
.w-status { width: 180px; }
.pill { border-radius: 999px; }
.pill.mini { font-size: 12px; padding: 2px 10px; }
.muted { color: var(--el-text-color-secondary); }

.hero-card,
.create-card,
.list-card {
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
  gap: 10px;
  align-items: center;
  justify-content: flex-end;
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

.layout-grid {
  display: grid;
  grid-template-columns: minmax(320px, 0.9fr) minmax(0, 1.4fr);
  gap: 16px;
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

.form-hero,
.dialog-hero {
  display: grid;
  grid-template-columns: minmax(0, 1.3fr) minmax(180px, 0.9fr);
  gap: 12px;
  margin-bottom: 14px;
}
.form-hero-main,
.form-preview,
.dialog-main,
.dialog-preview {
  padding: 14px 16px;
  border-radius: 18px;
  border: 1px solid var(--el-border-color-lighter);
  background: linear-gradient(180deg, color-mix(in srgb, var(--el-fill-color-light) 92%, white 8%) 0%, var(--el-bg-color) 100%);
}
.form-hero-title,
.dialog-title {
  font-size: 16px;
  font-weight: 800;
}
.form-hero-subtitle,
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

.stack-form {
  margin-top: 6px;
}
.form-actions {
  margin-top: 6px;
  display: flex;
  justify-content: flex-end;
}

.tbl :deep(.el-table__header-wrapper th){
  background: var(--el-fill-color-light);
}
.table-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  flex-wrap: wrap;
}
.table-actions :deep(.el-button + .el-button){
  margin-left: 0;
}

.mobile-list {
  display: grid;
  gap: 12px;
}
.schedule-card {
  border: 1px solid var(--el-border-color-lighter);
  background: var(--el-bg-color);
  border-radius: 18px;
  padding: 14px;
}
.schedule-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
}
.schedule-name {
  font-size: 16px;
  font-weight: 800;
}
.meta-grid {
  margin-top: 12px;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}
.meta-box {
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
.card-actions {
  margin-top: 12px;
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.card-actions :deep(.el-button) {
  flex: 1 1 calc(50% - 8px);
  min-width: 110px;
}

.pagination {
  display: flex;
  justify-content: flex-end;
  padding-top: 12px;
}

@media (max-width: 1100px) {
  .stats-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .layout-grid {
    grid-template-columns: 1fr;
  }

  .form-hero,
  .dialog-hero {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .machine-test-page-vivid {
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

  .pagination {
    justify-content: center;
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
  .meta-grid {
    grid-template-columns: 1fr;
  }

  .hero-actions :deep(.el-button),
  .card-actions :deep(.el-button) {
    flex: 1 1 100%;
    min-width: 0;
  }

  .w-status {
    width: 100%;
  }
}
</style>
