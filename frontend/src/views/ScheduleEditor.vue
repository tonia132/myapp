<template>
  <div class="page machine-schedule-form-vivid">
    <section class="hero-card">
      <div class="hero-main">
        <div class="hero-left">
          <el-button class="btn" :icon="ArrowLeft" @click="router.back()">
            {{ text('machineDetail.back', '返回') }}
          </el-button>

          <div class="hero-copy">
            <div class="hero-eyebrow">{{ text('machineSchedule.eyebrow', 'Machine Schedule Planner') }}</div>
            <h2 class="hero-title">
              ⏱️ {{ text('machineSchedule.title', '機台排程') }}
            </h2>
            <div class="hero-subtitle">
              {{
                isEdit
                  ? text('machineSchedule.editSubtitle', '調整既有排程的機台、時間區間與測試資訊')
                  : text('machineSchedule.createSubtitle', '建立新的機台排程，安排測試名稱與執行時段')
              }}
            </div>
          </div>
        </div>

        <div class="hero-right">
          <el-tag type="info" effect="dark" class="pill">
            {{ text('machineSchedule.headerTag', 'Schedule Form') }}
          </el-tag>

          <el-button class="btn" :icon="Refresh" @click="load" :loading="loading">
            {{ text('common.refresh', '重新整理') }}
          </el-button>
          <el-button class="btn" type="primary" :icon="Check" :loading="saving" @click="save">
            {{ text('common.save', '儲存') }}
          </el-button>
        </div>
      </div>

      <div class="stats-grid">
        <div class="stat-card stat-primary">
          <div class="stat-label">{{ text('machineSchedule.stats.mode', '模式') }}</div>
          <div class="stat-value stat-text">
            {{ isEdit ? text('common.edit', '編輯') : text('common.add', '新增') }}
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-label">{{ text('machineSchedule.stats.machine', '機台') }}</div>
          <div class="stat-value stat-text">{{ selectedMachineName || '--' }}</div>
        </div>

        <div class="stat-card">
          <div class="stat-label">{{ text('machineSchedule.stats.duration', '預估時數') }}</div>
          <div class="stat-value">{{ durationHoursText }}</div>
        </div>

        <div class="stat-card">
          <div class="stat-label">{{ text('machineSchedule.stats.status', '目前狀態') }}</div>
          <div class="stat-value stat-text">
            {{ conflict ? text('machineSchedule.stats.conflict', '時段衝突') : text('machineSchedule.stats.ready', '可儲存') }}
          </div>
        </div>
      </div>
    </section>

    <el-card shadow="never" class="content-card">
      <template #header>
        <div class="section-head">
          <div>
            <div class="section-title">{{ text('machineSchedule.formTitle', '排程表單') }}</div>
            <div class="section-subtitle">
              {{ text('machineSchedule.formSubtitle', '填寫機台、測試名稱、時間區間與備註後即可建立或更新排程') }}
            </div>
          </div>
        </div>
      </template>

      <el-skeleton :loading="loading" animated>
        <template #template>
          <div class="skeleton-wrap">
            <el-skeleton-item variant="h3" style="width: 32%; margin-bottom: 12px" />
            <el-skeleton-item v-for="i in 6" :key="i" variant="text" style="margin-bottom: 10px;" />
          </div>
        </template>

        <template #default>
          <div class="form-hero">
            <div class="form-hero-main">
              <div class="form-hero-title">
                {{ isEdit ? text('machineSchedule.formHeroEdit', '更新排程內容') : text('machineSchedule.formHeroCreate', '建立新的機台排程') }}
              </div>
              <div class="form-hero-subtitle">
                {{ text('machineSchedule.formHeroHint', '系統會在送出時檢查時間重疊，若衝突會顯示既有排程資訊') }}
              </div>
            </div>

            <div class="form-preview">
              <div class="preview-label">{{ text('machineSchedule.preview', '預覽') }}</div>
              <div class="preview-value">{{ selectedMachineName || text('machineSchedule.fieldMachine', '機台') }}</div>
              <div class="preview-sub">{{ form.testName || text('machineSchedule.fieldTestName', '測試名稱') }}</div>
            </div>
          </div>

          <el-alert
            v-if="conflict"
            class="conflict-alert"
            type="warning"
            :closable="false"
            show-icon
            :title="text('machineSchedule.message.timeOverlapTitle', '該時間區間已被其他排程使用')"
          >
            <template #default>
              <div class="conflict-body">
                <div>
                  {{ text('machineSchedule.message.conflictExists', '已存在排程：') }}
                  <strong>{{ conflict.testName || `排程 #${conflict.id}` }}</strong>
                </div>
                <div>
                  {{ text('machineSchedule.message.conflictTime', '時間：') }}
                  {{ fmt(conflict.startTime) }} ~ {{ fmt(conflict.endTime) }}
                </div>
              </div>
            </template>
          </el-alert>

          <el-form
            :model="form"
            :rules="rules"
            ref="formRef"
            :label-width="isMobile ? 'auto' : '120px'"
            :label-position="isMobile ? 'top' : 'right'"
            class="schedule-form"
          >
            <div class="form-grid">
              <el-form-item :label="text('machineSchedule.fieldMachine', '機台')" prop="machineId">
                <el-select
                  v-model="form.machineId"
                  filterable
                  :loading="loadingMachines"
                  :placeholder="text('machineSchedule.fieldMachine', '機台')"
                  style="width: 100%"
                >
                  <el-option
                    v-for="m in machines"
                    :key="m.id"
                    :label="machineLabel(m)"
                    :value="m.id"
                  />
                </el-select>
              </el-form-item>

              <el-form-item :label="text('machineSchedule.fieldTestName', '測試名稱')" prop="testName">
                <el-input
                  v-model.trim="form.testName"
                  maxlength="255"
                  show-word-limit
                  :placeholder="text('machineSchedule.fieldTestName', '測試名稱')"
                />
              </el-form-item>

              <el-form-item :label="text('machineSchedule.fieldTimeRange', '時間區間')" prop="range" class="span-2">
                <el-date-picker
                  v-model="form.range"
                  type="datetimerange"
                  range-separator="至"
                  :start-placeholder="text('machineSchedule.startPlaceholder', '開始時間')"
                  :end-placeholder="text('machineSchedule.endPlaceholder', '結束時間')"
                  :shortcuts="shortcuts"
                  :editable="false"
                  style="width: 100%"
                />
              </el-form-item>

              <el-form-item :label="text('machineSchedule.fieldRemark', '備註')" class="span-2">
                <el-input
                  v-model.trim="form.remark"
                  type="textarea"
                  :rows="4"
                  :placeholder="text('machineSchedule.fieldRemarkPlaceholder', '可輸入排程目的、注意事項或特殊條件')"
                />
              </el-form-item>
            </div>
          </el-form>
        </template>
      </el-skeleton>
    </el-card>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed, watch, onBeforeUnmount } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { ElMessage } from 'element-plus'
import { ArrowLeft, Refresh, Check } from '@element-plus/icons-vue'
import getApiBase from '../utils/apiBase'

const { t, te } = useI18n()
function text (key, fallback, params) {
  if (te(key)) return t(key, params)
  if (!params) return fallback
  return String(fallback).replace(/\{(\w+)\}/g, (_, k) => String(params?.[k] ?? ''))
}

const route = useRoute()
const router = useRouter()
const apiBase = getApiBase()

const id = computed(() => route.params.id)
const isEdit = computed(() => !!id.value)

const formRef = ref()
const form = reactive({
  machineId: null,
  testName: '',
  range: [],
  remark: ''
})

const conflict = ref(null)

const rules = computed(() => ({
  machineId: [
    { required: true, message: text('machineSchedule.message.needFullForm', '請完整填寫表單'), trigger: 'change' }
  ],
  testName: [
    { required: true, message: text('machineSchedule.message.needFullForm', '請完整填寫表單'), trigger: 'blur' }
  ],
  range: [
    { required: true, message: text('machineSchedule.message.needFullForm', '請完整填寫表單'), trigger: 'change' },
    {
      validator: (_, v, cb) => {
        if (!Array.isArray(v) || v.length !== 2 || !v[0] || !v[1]) {
          return cb(new Error(text('machineSchedule.message.needFullForm', '請完整填寫表單')))
        }
        if (new Date(v[0]) >= new Date(v[1])) {
          return cb(new Error(text('machineSchedule.message.endAfterStart', '結束時間需晚於開始時間')))
        }
        cb()
      },
      trigger: 'change'
    }
  ]
}))

const machines = ref([])
const loading = ref(false)
const loadingMachines = ref(false)
const saving = ref(false)

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

const selectedMachineName = computed(() => {
  const found = machines.value.find(m => Number(m.id) === Number(form.machineId))
  return found ? machineLabel(found) : ''
})

const durationHoursText = computed(() => {
  const [start, end] = form.range || []
  if (!start || !end) return '--'
  const diff = (new Date(end) - new Date(start)) / (1000 * 60 * 60)
  if (!Number.isFinite(diff) || diff <= 0) return '--'
  return diff >= 10 ? String(Math.round(diff)) : diff.toFixed(1)
})

const shortcuts = computed(() => [
  {
    text: text('machineSchedule.shortcutNow2h', '從現在 +2 小時'),
    value: () => {
      const s = new Date()
      const e = new Date(s.getTime() + 2 * 60 * 60 * 1000)
      return [s, e]
    }
  },
  {
    text: text('machineSchedule.shortcutTomorrow', '明天 09:00 ~ 18:00'),
    value: () => {
      const now = new Date()
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
      const s = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 9, 0, 0, 0)
      const e = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 18, 0, 0, 0)
      return [s, e]
    }
  }
])

/* ---------------- auth helpers ---------------- */
function getToken () {
  return (
    localStorage.getItem('token') ||
    sessionStorage.getItem('token') ||
    ''
  )
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
    ElMessage.warning(text('auth.sessionExpired', '登入已過期'))
    router.push('/login')
    return true
  }
  return false
}

async function safeJson (res) {
  try {
    return await res.json()
  } catch {
    return {}
  }
}

/* ---------------- time helpers ---------------- */
function toLocalIsoNoZ (d) {
  if (!d) return null
  const dt = new Date(d)
  if (Number.isNaN(dt.getTime())) return null
  const pad = (n) => String(n).padStart(2, '0')
  const yyyy = dt.getFullYear()
  const MM = pad(dt.getMonth() + 1)
  const dd = pad(dt.getDate())
  const hh = pad(dt.getHours())
  const mm = pad(dt.getMinutes())
  const ss = pad(dt.getSeconds())
  return `${yyyy}-${MM}-${dd}T${hh}:${mm}:${ss}`
}

function fmt (v) {
  if (!v) return '-'
  const d = new Date(v)
  if (Number.isNaN(d.getTime())) return String(v)
  return d.toLocaleString('zh-TW', { hour12: false })
}

function machineLabel (m) {
  return m?.chamberName || m?.name || `#${m?.id ?? ''}`
}

/* ---------------- data loaders ---------------- */
async function loadMachines () {
  loadingMachines.value = true
  try {
    const res = await fetch(`${apiBase}/machines`, { headers: authHeaders() })
    if (handleAuth(res)) return

    const j = await safeJson(res)
    const list = Array.isArray(j) ? j : (j?.rows || j?.data || [])
    machines.value = Array.isArray(list) ? list : []

    if (!form.machineId && machines.value.length === 1) {
      form.machineId = machines.value[0].id
    }
  } catch (e) {
    console.error(e)
    ElMessage.error(text('machineSchedule.message.machinesLoadFailed', '機台列表載入失敗'))
  } finally {
    loadingMachines.value = false
  }
}

async function loadSchedule () {
  if (!isEdit.value) return
  try {
    const res = await fetch(`${apiBase}/machine-schedules/${id.value}`, {
      headers: authHeaders()
    })
    if (handleAuth(res)) return
    if (!res.ok) throw new Error('not found')

    const s = await safeJson(res)

    form.machineId = s.machineId ?? null
    form.testName = s.testName || ''
    form.range = [
      s.startTime ? new Date(s.startTime) : null,
      s.endTime ? new Date(s.endTime) : null
    ]
    form.remark = s.remark || ''
  } catch (e) {
    console.error(e)
    ElMessage.error(text('machineSchedule.message.loadFailed', '排程資料載入失敗'))
  }
}

async function load () {
  loading.value = true
  conflict.value = null
  await Promise.all([loadMachines(), loadSchedule()])
  loading.value = false
}

/* ---------------- save ---------------- */
async function save () {
  try {
    await formRef.value?.validate()
  } catch {
    return
  }

  conflict.value = null
  saving.value = true
  try {
    const [start, end] = form.range || []
    const payload = {
      machineId: form.machineId,
      testName: String(form.testName || '').trim(),
      startTime: start ? toLocalIsoNoZ(start) : null,
      endTime: end ? toLocalIsoNoZ(end) : null,
      remark: String(form.remark || '').trim()
    }

    const method = isEdit.value ? 'PUT' : 'POST'
    const url = isEdit.value
      ? `${apiBase}/machine-schedules/${id.value}`
      : `${apiBase}/machine-schedules`

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify(payload)
    })

    if (handleAuth(res)) return
    const j = await safeJson(res)

    if (res.status === 409 && j?.code === 'TIME_OVERLAP') {
      conflict.value = j.conflict || null
      ElMessage.warning(j.message || text('machineSchedule.message.timeOverlapTitle', '該時間區間已被其他排程使用'))
      return
    }

    if (!res.ok) {
      throw new Error(j?.message || text('machineSchedule.message.updateFailed', '儲存失敗'))
    }

    ElMessage.success(
      isEdit.value
        ? text('machineSchedule.message.updateSuccess', '更新成功')
        : text('machineSchedule.message.createSuccess', '建立成功')
    )
    router.back()
  } catch (e) {
    console.error(e)
    const msg = String(e?.message || '')
    if (msg) {
      ElMessage.error(
        msg.includes('Failed to fetch')
          ? text('common.networkError', '無法連線到 API，請稍後再試')
          : msg
      )
    }
  } finally {
    saving.value = false
  }
}

watch(
  () => [form.machineId, form.range?.[0], form.range?.[1]],
  () => { conflict.value = null }
)

onMounted(() => {
  cleanupMql = setupMql()
  load()
})

onBeforeUnmount(() => {
  if (cleanupMql) cleanupMql()
})
</script>

<style scoped>
.machine-schedule-form-vivid {
  --ms-border: var(--el-border-color-light);
  --ms-border-soft: var(--el-border-color-lighter);
  --ms-card-bg:
    radial-gradient(circle at top right, color-mix(in srgb, var(--el-color-primary) 12%, transparent) 0%, transparent 34%),
    linear-gradient(180deg, color-mix(in srgb, var(--el-bg-color) 94%, var(--el-color-primary-light-9) 6%) 0%, var(--el-bg-color) 100%);
  --ms-soft-bg: color-mix(in srgb, var(--el-fill-color-light) 88%, white 12%);
  --ms-shadow: 0 18px 48px rgba(0, 0, 0, 0.06);

  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  color: var(--el-text-color-primary);
}

.btn { border-radius: 12px; }
.pill { border-radius: 999px; }

.hero-card,
.content-card {
  border: 1px solid var(--ms-border);
  border-radius: 22px;
  background: var(--ms-card-bg);
  box-shadow: var(--ms-shadow);
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
  line-height: 1.12;
  font-weight: 900;
}

.hero-subtitle {
  margin-top: 6px;
  font-size: 14px;
  color: var(--el-text-color-secondary);
  line-height: 1.6;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}

.stat-card {
  padding: 14px 16px;
  border-radius: 18px;
  border: 1px solid var(--ms-border-soft);
  background: var(--ms-soft-bg);
}

.stat-primary {
  background: linear-gradient(135deg, var(--el-color-primary-light-8), var(--el-color-primary-light-9));
  border-color: color-mix(in srgb, var(--el-color-primary) 32%, var(--ms-border-soft));
}

.stat-label {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  margin-bottom: 6px;
}

.stat-value {
  font-size: 28px;
  line-height: 1;
  font-weight: 900;
}

.stat-value.stat-text {
  font-size: 18px;
  line-height: 1.25;
  word-break: break-word;
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

.skeleton-wrap {
  padding: 4px 2px;
}

.form-hero {
  display: grid;
  grid-template-columns: minmax(0, 1.3fr) minmax(220px, 0.9fr);
  gap: 12px;
  margin-bottom: 16px;
}

.form-hero-main,
.form-preview {
  padding: 14px 16px;
  border-radius: 18px;
  border: 1px solid var(--ms-border-soft);
  background: linear-gradient(180deg, var(--ms-soft-bg) 0%, color-mix(in srgb, var(--el-bg-color) 96%, white 4%) 100%);
}

.form-hero-title {
  font-size: 16px;
  font-weight: 800;
}

.form-hero-subtitle {
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

.schedule-form {
  margin-top: 4px;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px 18px;
}

.span-2 {
  grid-column: 1 / -1;
}

.conflict-alert {
  margin-bottom: 14px;
  border-radius: 16px;
}

.conflict-body {
  display: flex;
  flex-direction: column;
  gap: 4px;
  line-height: 1.6;
}

@media (max-width: 1100px) {
  .form-hero {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 900px) {
  .stats-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .form-grid {
    grid-template-columns: 1fr;
  }

  .span-2 {
    grid-column: auto;
  }
}

@media (max-width: 768px) {
  .machine-schedule-form-vivid {
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

  .hero-right {
    justify-content: flex-start;
  }
}

@media (max-width: 640px) {
  .hero-title {
    font-size: 24px;
  }

  .stats-grid {
    grid-template-columns: 1fr;
  }

  .hero-right :deep(.el-button) {
    flex: 1 1 100%;
    min-width: 0;
  }
}
</style>
