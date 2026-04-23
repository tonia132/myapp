<template>
  <div class="page ip-page-vivid">
    <section class="hero-card">
      <div class="hero-main">
        <div class="hero-left">
          <div class="hero-icon-wrap">
            <div class="hero-icon">💧</div>
          </div>

          <div class="hero-copy">
            <div class="hero-eyebrow">{{ text('ipLab.eyebrow', 'Ingress Protection Scheduling') }}</div>
            <h2 class="hero-title">{{ text('ipLab.title', 'IP 實驗室排程') }}</h2>
            <div class="hero-subtitle">
              {{ text('ipLab.subtitle', '快速查看每日排程、建立時段並追蹤目前實驗室使用狀態') }}
            </div>
          </div>
        </div>

        <div class="hero-actions">
          <el-date-picker
            v-model="selectedDate"
            type="date"
            value-format="YYYY-MM-DD"
            :placeholder="text('ipLab.datePickerPlaceholder', '選擇日期')"
            class="ctrl w-date"
            @change="fetchSchedules"
          />

          <el-button class="btn" plain :loading="loading" @click="fetchSchedules">
            {{ text('ipLab.btnRefresh', '重新整理') }}
          </el-button>

          <el-button type="primary" class="btn" :icon="Plus" @click="openDialog">
            {{ text('ipLab.btnNewSchedule', '新增排程') }}
          </el-button>
        </div>
      </div>

      <div class="stats-grid">
        <div class="stat-card stat-primary">
          <div class="stat-label">{{ text('ipLab.stats.total', '排程筆數') }}</div>
          <div class="stat-value">{{ schedulesSorted.length }}</div>
        </div>

        <div class="stat-card">
          <div class="stat-label">{{ text('ipLab.stats.totalHours', '總時數') }}</div>
          <div class="stat-value">{{ totalHoursText }}</div>
        </div>

        <div class="stat-card">
          <div class="stat-label">{{ text('ipLab.stats.approved', '已核准') }}</div>
          <div class="stat-value">{{ approvedCount }}</div>
        </div>

        <div class="stat-card">
          <div class="stat-label">{{ text('ipLab.stats.pending', '待處理') }}</div>
          <div class="stat-value">{{ pendingCount }}</div>
        </div>
      </div>
    </section>

    <el-alert
      v-if="selectedDate"
      type="success"
      show-icon
      :closable="false"
      class="date-alert"
    >
      <div class="alert-row">
        <div class="alert-text">
          {{ text('ipLab.filteredAlert', '目前顯示 {date} 的排程資料', { date: selectedDate }) }}
        </div>

        <div class="alert-meta" v-if="!loading">
          <el-tag effect="plain" class="pill mini">
            {{ text('common.total', '總計') }}：{{ schedulesSorted.length }}
          </el-tag>
          <el-tag effect="plain" class="pill mini">
            {{ text('ipLab.table.time', '時段') }}：{{ totalHoursText }}
          </el-tag>
        </div>
      </div>
    </el-alert>

    <el-card shadow="never" class="list-card">
      <template #header>
        <div class="section-head">
          <div>
            <div class="section-title">
              {{
                selectedDate
                  ? text('ipLab.cardTitleWithDate', '{date} 排程清單', { date: selectedDate })
                  : text('ipLab.cardTitleNoDate', '排程清單')
              }}
            </div>
            <div class="section-subtitle">
              {{ text('ipLab.sectionSubtitle', '支援桌面表格與手機卡片顯示，排程資訊更容易閱讀') }}
            </div>
          </div>

          <el-tag effect="plain" round>
            {{ text('ipLab.totalTag', '共 {count} 筆', { count: schedulesSorted.length }) }}
          </el-tag>
        </div>
      </template>

      <el-empty
        v-if="!loading && !schedulesSorted.length"
        :description="text('ipLab.emptyDescription', '目前沒有排程資料')"
      />

      <el-table
        v-else-if="!isMobile"
        :data="schedulesSorted"
        border
        stripe
        size="small"
        class="tbl"
        style="width: 100%"
        :loading="loading"
      >
        <el-table-column type="index" :label="text('ipLab.table.index', '#')" width="60" />
        <el-table-column prop="date" :label="text('ipLab.table.date', '日期')" width="120" />

        <el-table-column :label="text('ipLab.table.time', '時段')" width="190">
          <template #default="{ row }">
            <span class="time-pill">{{ row.startTime }}</span>
            <span class="muted"> ~ </span>
            <span class="time-pill">{{ row.endTime }}</span>
            <span class="muted range-text">({{ calcRangeText(row) }})</span>
          </template>
        </el-table-column>

        <el-table-column prop="purpose" :label="text('ipLab.table.purpose', '用途')" min-width="240" show-overflow-tooltip>
          <template #default="{ row }">
            <span class="cell-strong">{{ row.purpose }}</span>
          </template>
        </el-table-column>

        <el-table-column :label="text('ipLab.table.remark', '備註')" min-width="200">
          <template #default="{ row }">
            <el-tooltip v-if="row.remark" :content="String(row.remark)" placement="top">
              <span class="ellipsis">{{ row.remark }}</span>
            </el-tooltip>
            <span v-else class="muted">—</span>
          </template>
        </el-table-column>

        <el-table-column prop="createdAt" :label="text('ipLab.table.createdAt', '建立時間')" width="170">
          <template #default="{ row }">
            <span class="muted">{{ formatDateTime(row.createdAt) }}</span>
          </template>
        </el-table-column>

        <el-table-column prop="status" :label="text('ipLab.table.status', '狀態')" width="120" align="center">
          <template #default="{ row }">
            <el-tag :type="statusTagType(row.status)" size="small" effect="plain" class="pill mini">
              {{ statusLabel(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
      </el-table>

      <div v-else class="mobile-list">
        <el-skeleton v-if="loading" :rows="6" animated />

        <template v-else>
          <div class="cards">
            <article
              v-for="(row, idx) in schedulesSorted"
              :key="row.id || idx"
              class="row-card"
            >
              <div class="card-top">
                <div class="card-left">
                  <div class="time-row">
                    <span class="time-pill">{{ row.startTime }}</span>
                    <span class="muted"> ~ </span>
                    <span class="time-pill">{{ row.endTime }}</span>
                    <span class="muted range-text">({{ calcRangeText(row) }})</span>
                  </div>

                  <div class="purpose">{{ row.purpose }}</div>
                </div>

                <el-tag :type="statusTagType(row.status)" effect="plain" size="small" class="pill mini">
                  {{ statusLabel(row.status) }}
                </el-tag>
              </div>

              <div class="mobile-meta-grid">
                <div class="meta-box">
                  <div class="meta-label">{{ text('ipLab.table.date', '日期') }}</div>
                  <div class="meta-value">{{ row.date || '—' }}</div>
                </div>

                <div class="meta-box">
                  <div class="meta-label">{{ text('ipLab.table.createdAt', '建立時間') }}</div>
                  <div class="meta-value">{{ formatDateTime(row.createdAt) || '—' }}</div>
                </div>
              </div>

              <div class="remark">
                <div class="muted label">{{ text('ipLab.table.remark', '備註') }}</div>
                <div v-if="row.remark" class="remark-text">{{ row.remark }}</div>
                <div v-else class="muted">—</div>
              </div>
            </article>
          </div>
        </template>
      </div>
    </el-card>

    <el-dialog
      v-model="dialogVisible"
      :title="text('ipLab.dialogTitle', '新增 IP 排程')"
      :width="isMobile ? '100%' : '620px'"
      :fullscreen="isMobile"
      :close-on-click-modal="false"
      destroy-on-close
      class="dlg"
    >
      <div class="dialog-hero">
        <div class="dialog-main">
          <div class="dialog-title">{{ text('ipLab.dialogHeroTitle', '建立新的實驗室排程') }}</div>
          <div class="dialog-subtitle">
            {{ text('ipLab.dialogHeroSubtitle', '先選日期與時段，再填入用途與備註，送出後會立即更新清單') }}
          </div>
        </div>

        <div class="dialog-preview" v-if="form.date && form.startTime && form.endTime">
          <div class="preview-label">{{ text('ipLab.preview', '排程預覽') }}</div>
          <div class="preview-value">{{ form.date }} · {{ form.startTime }} ~ {{ form.endTime }}</div>
          <div class="preview-sub">{{ calcRangeText(form) }}</div>
        </div>
      </div>

      <el-form
        :model="form"
        :label-width="isMobile ? 'auto' : '96px'"
        :label-position="isMobile ? 'top' : 'right'"
      >
        <el-form-item :label="text('ipLab.fieldDate', '日期')">
          <el-date-picker
            v-model="form.date"
            type="date"
            value-format="YYYY-MM-DD"
            :placeholder="text('ipLab.datePickerPlaceholder', '選擇日期')"
            class="ctrl w-220"
          />
        </el-form-item>

        <el-form-item :label="text('ipLab.fieldTimeRange', '時段')">
          <div class="time-range">
            <el-time-select
              v-model="form.startTime"
              start="08:00"
              step="00:30"
              end="18:00"
              :placeholder="text('ipLab.timeStartPlaceholder', '開始時間')"
              class="ctrl w-time"
            />
            <span class="sep">~</span>
            <el-time-select
              v-model="form.endTime"
              start="08:00"
              step="00:30"
              end="18:00"
              :placeholder="text('ipLab.timeEndPlaceholder', '結束時間')"
              class="ctrl w-time"
            />
          </div>

          <div class="muted mini-tip" v-if="form.startTime && form.endTime">
            {{ form.startTime }} ~ {{ form.endTime }}（{{ calcRangeText(form) }}）
          </div>
        </el-form-item>

        <el-form-item :label="text('ipLab.fieldQuickRange', '快速套用')">
          <div class="quick-wrap">
            <el-button
              v-for="item in quickRanges"
              :key="item.key"
              size="small"
              class="btn-chip"
              @click="applyQuick(item)"
            >
              {{ text(`ipLab.quickRanges.${item.key}`, item.fallback) }}
            </el-button>
          </div>
        </el-form-item>

        <el-form-item :label="text('ipLab.fieldPurpose', '用途')">
          <el-input
            v-model="form.purpose"
            type="textarea"
            :rows="3"
            maxlength="200"
            show-word-limit
            :placeholder="text('ipLab.placeholderPurpose', '請輸入用途說明')"
          />
        </el-form-item>

        <el-form-item :label="text('ipLab.fieldRemark', '備註')">
          <el-input
            v-model="form.remark"
            type="textarea"
            :rows="2"
            maxlength="150"
            show-word-limit
            :placeholder="text('ipLab.placeholderRemark', '可補充備註資訊')"
          />
        </el-form-item>
      </el-form>

      <template #footer>
        <span class="dialog-footer">
          <el-button class="btn" @click="dialogVisible = false">
            {{ text('ipLab.btnCancel', '取消') }}
          </el-button>
          <el-button class="btn" type="primary" :loading="saving" @click="saveSchedule">
            {{ text('ipLab.btnSave', '儲存') }}
          </el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed, onBeforeUnmount } from 'vue'
import { ElMessage } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import { useI18n } from 'vue-i18n'
import api from '@/api'

const { t, te } = useI18n()

function text (key, fallback, params) {
  if (te(key)) return t(key, params)
  if (!params) return fallback
  return String(fallback).replace(/\{(\w+)\}/g, (_, k) => String(params?.[k] ?? ''))
}

const LAB_TYPE = 'IP'

function todayStr () {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/* ---------- RWD ---------- */
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

/* ---------- state ---------- */
const selectedDate = ref(todayStr())
const schedules = ref([])
const loading = ref(false)

const dialogVisible = ref(false)
const saving = ref(false)

const form = reactive({
  date: todayStr(),
  startTime: '09:00',
  endTime: '12:00',
  purpose: '',
  remark: ''
})

const quickRanges = [
  { key: 'morning', fallback: '上午', startTime: '09:00', endTime: '12:00' },
  { key: 'afternoon', fallback: '下午', startTime: '13:30', endTime: '17:30' },
  { key: 'full', fallback: '全天', startTime: '09:00', endTime: '17:30' }
]

/* ---------- display ---------- */
function formatDateTime (val) {
  if (!val) return ''
  const d = new Date(val)
  if (Number.isNaN(d.getTime())) return String(val)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  return `${y}-${m}-${day} ${hh}:${mm}`
}

function statusLabel (s) {
  const v = String(s || '').toLowerCase()
  if (v === 'approved') return text('ipLab.statusText.approved', '已核准')
  if (v === 'rejected') return text('ipLab.statusText.rejected', '已拒絕')
  if (v === 'canceled') return text('ipLab.statusText.canceled', '已取消')
  if (v === 'finished') return text('ipLab.statusText.finished', '已完成')
  return text('ipLab.statusText.pending', '待處理')
}

function statusTagType (s) {
  const v = String(s || '').toLowerCase()
  if (v === 'approved') return 'success'
  if (v === 'rejected') return 'danger'
  if (v === 'canceled') return 'info'
  if (v === 'finished') return 'warning'
  return 'info'
}

function toMinutes (hhmm) {
  const s = String(hhmm || '')
  const [h, m] = s.split(':').map(Number)
  if (!Number.isFinite(h) || !Number.isFinite(m)) return 0
  return h * 60 + m
}
function calcRangeText (row) {
  const a = toMinutes(row?.startTime)
  const b = toMinutes(row?.endTime)
  const diff = Math.max(0, b - a)
  const h = Math.floor(diff / 60)
  const m = diff % 60
  if (!diff) return '0m'
  if (h && m) return `${h}h ${m}m`
  if (h) return `${h}h`
  return `${m}m`
}

const schedulesSorted = computed(() => {
  const arr = Array.isArray(schedules.value) ? schedules.value.slice() : []
  arr.sort((a, b) => toMinutes(a?.startTime) - toMinutes(b?.startTime))
  return arr
})

const totalHoursText = computed(() => {
  const mins = schedulesSorted.value.reduce((sum, r) => {
    const a = toMinutes(r?.startTime)
    const b = toMinutes(r?.endTime)
    return sum + Math.max(0, b - a)
  }, 0)
  const h = Math.floor(mins / 60)
  const m = mins % 60
  if (!mins) return '0h'
  if (h && m) return `${h}h ${m}m`
  if (h) return `${h}h`
  return `${m}m`
})

const approvedCount = computed(() =>
  schedulesSorted.value.filter(r => String(r?.status || '').toLowerCase() === 'approved').length
)
const pendingCount = computed(() =>
  schedulesSorted.value.filter(r => !String(r?.status || '').trim() || String(r?.status || '').toLowerCase() === 'pending').length
)

/* ---------- API ---------- */
async function fetchSchedules () {
  if (!selectedDate.value) {
    schedules.value = []
    return
  }

  loading.value = true
  try {
    const { data } = await api.get('/lab-schedules/day', {
      params: { labType: LAB_TYPE, date: selectedDate.value }
    })
    schedules.value = Array.isArray(data?.data) ? data.data : []
  } catch (err) {
    console.error('❌ 取得 IP 排程失敗:', err)
    schedules.value = []
    ElMessage.error(err?.response?.data?.message || text('ipLab.message.loadFailed', '載入排程失敗'))
  } finally {
    loading.value = false
  }
}

function resetForm () {
  form.date = selectedDate.value || todayStr()
  form.startTime = '09:00'
  form.endTime = '12:00'
  form.purpose = ''
  form.remark = ''
}

function openDialog () {
  resetForm()
  dialogVisible.value = true
}

function applyQuick (range) {
  form.startTime = range.startTime
  form.endTime = range.endTime
}

async function saveSchedule () {
  if (!form.date) return ElMessage.warning(text('ipLab.message.needDate', '請選擇日期'))
  if (!form.startTime || !form.endTime) return ElMessage.warning(text('ipLab.message.needTimeRange', '請選擇時間範圍'))
  if (form.endTime <= form.startTime) return ElMessage.warning(text('ipLab.message.timeInvalid', '結束時間必須晚於開始時間'))
  if (!String(form.purpose || '').trim()) return ElMessage.warning(text('ipLab.message.needPurpose', '請輸入用途'))

  saving.value = true
  try {
    const payload = {
      labType: LAB_TYPE,
      date: form.date,
      startTime: form.startTime,
      endTime: form.endTime,
      purpose: form.purpose,
      remark: form.remark
    }

    const { data } = await api.post('/lab-schedules', payload)
    ElMessage.success(data?.message || text('ipLab.message.createSuccess', '建立成功'))
    dialogVisible.value = false
    selectedDate.value = form.date
    await fetchSchedules()
  } catch (err) {
    console.error('❌ 新增 IP 排程失敗:', err)
    ElMessage.error(err?.response?.data?.message || text('ipLab.message.createFailed', '建立失敗'))
  } finally {
    saving.value = false
  }
}

onMounted(() => {
  cleanupMql = setupMql()
  fetchSchedules()
})
onBeforeUnmount(() => {
  if (cleanupMql) cleanupMql()
})
</script>

<style scoped>
.ip-page-vivid {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  color: var(--el-text-color-primary);
}

.muted { color: var(--el-text-color-secondary); }
.pill { border-radius: 999px; }
.pill.mini { font-size: 12px; padding: 2px 10px; }
.ctrl { border-radius: 12px; }
.btn { border-radius: 12px; }
.w-date { width: 170px; }
.w-220 { width: 220px; }
.w-time { width: 140px; }

.hero-card,
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

.date-alert {
  border-radius: 16px;
  margin: 0;
}
.alert-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}
.alert-meta {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
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

.tbl :deep(.el-table__header-wrapper th){ background: var(--el-fill-color-light); }
.time-pill {
  display: inline-block;
  padding: 3px 8px;
  border-radius: 999px;
  background: var(--el-fill-color-light);
  border: 1px solid var(--el-border-color);
  font-weight: 700;
  font-size: 12px;
}
.range-text { margin-left: 8px; }
.cell-strong { font-weight: 700; }
.ellipsis {
  display: inline-block;
  max-width: 360px;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.mobile-list { width: 100%; }
.cards {
  display: grid;
  gap: 12px;
}
.row-card {
  border: 1px solid var(--el-border-color-lighter);
  background: var(--el-bg-color);
  border-radius: 18px;
  padding: 14px;
}
.card-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
}
.time-row { font-size: 13px; }
.purpose {
  margin-top: 8px;
  font-weight: 800;
  font-size: 15px;
  line-height: 1.4;
  word-break: break-word;
}
.mobile-meta-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  margin-top: 12px;
}
.meta-box {
  padding: 10px 12px;
  border-radius: 14px;
  border: 1px solid var(--el-border-color-lighter);
  background: color-mix(in srgb, var(--el-fill-color-light) 88%, white 12%);
}
.meta-label {
  display: block;
  font-size: 12px;
  color: var(--el-text-color-secondary);
  margin-bottom: 4px;
}
.meta-value {
  font-size: 14px;
  font-weight: 700;
  word-break: break-word;
}
.remark { margin-top: 12px; }
.remark .label { font-size: 12px; font-weight: 800; margin-bottom: 4px; }
.remark-text { font-size: 13px; line-height: 1.6; word-break: break-word; }

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

.time-range {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.sep { opacity: .6; }
.mini-tip {
  margin-top: 6px;
  font-size: 12px;
}
.quick-wrap {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.btn-chip { border-radius: 999px; }

@media (max-width: 1100px) {
  .stats-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .dialog-hero {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px){
  .ip-page-vivid {
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

  .w-date,
  .w-220,
  .w-time {
    width: 100%;
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
  .mobile-meta-grid {
    grid-template-columns: 1fr;
  }

  .hero-actions :deep(.el-button),
  .quick-wrap :deep(.el-button) {
    flex: 1 1 calc(50% - 8px);
  }
}
</style>
