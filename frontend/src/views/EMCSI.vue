<template>
  <div class="page emcsi-page">
    <section class="hero-card">
      <div class="hero-main">
        <div class="hero-left">
          <div class="hero-icon-wrap">
            <el-icon class="hero-icon"><Calendar /></el-icon>
          </div>

          <div class="hero-copy">
            <div class="hero-eyebrow">{{ text('emcSiLab.eyebrow', 'Lab Scheduler') }}</div>
            <h2 class="hero-title">{{ text('emcSiLab.headerTitle', 'EMC & SI 實驗室排程') }}</h2>
            <div class="hero-subtitle">
              {{ text('emcSiLab.heroSubtitle', '快速掌握當日排程、使用時數與預約狀態') }}
            </div>
          </div>
        </div>

        <div class="hero-actions">
          <el-date-picker
            v-model="selectedDate"
            class="ctrl w-date"
            type="date"
            value-format="YYYY-MM-DD"
            :placeholder="text('emcSiLab.datePlaceholder', '選擇日期')"
            @change="fetchSchedules"
          />

          <el-button class="btn" plain :icon="Refresh" :loading="loading" @click="fetchSchedules">
            {{ text('emcSiLab.btnReload', '重新整理') }}
          </el-button>

          <el-button class="btn" type="primary" :icon="Plus" @click="openDialog">
            {{ text('emcSiLab.btnNewSchedule', '新增排程') }}
          </el-button>
        </div>
      </div>

      <div class="stats-grid">
        <div class="stat-card stat-primary">
          <div class="stat-label">{{ text('emcSiLab.stats.selectedDate', '選擇日期') }}</div>
          <div class="stat-value small">{{ selectedDate || text('emcSiLab.noDateSelected', '未選擇') }}</div>
        </div>

        <div class="stat-card">
          <div class="stat-label">{{ text('common.total', '總數') }}</div>
          <div class="stat-value">{{ schedulesSorted.length }}</div>
        </div>

        <div class="stat-card">
          <div class="stat-label">{{ text('emcSiLab.colTime', '時段') }}</div>
          <div class="stat-value">{{ totalHoursText }}</div>
        </div>

        <div class="stat-card">
          <div class="stat-label">{{ text('emcSiLab.stats.approvedCount', '已核准') }}</div>
          <div class="stat-value">{{ approvedCount }}</div>
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
          {{ text('emcSiLab.filterAlert', '目前顯示 {date} 的排程', { date: selectedDate }) }}
        </div>

        <div class="alert-meta" v-if="!loading">
          <el-tag effect="plain" round>
            {{ text('common.total', '總數') }}：{{ schedulesSorted.length }}
          </el-tag>
          <el-tag effect="plain" round>
            {{ text('emcSiLab.colTime', '時段') }}：{{ totalHoursText }}
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
                  ? text('emcSiLab.scheduleTitle', '{date} 排程清單', { date: selectedDate })
                  : text('emcSiLab.scheduleTitle', '{date} 排程清單', { date: text('emcSiLab.noDateSelected', '未選擇') })
              }}
            </div>
            <div class="section-subtitle">
              {{ text('emcSiLab.sectionSubtitle', '依時間排序顯示當日預約，桌機表格、手機卡片都更好閱讀') }}
            </div>
          </div>

          <el-tag effect="plain" round>
            {{ text('emcSiLab.headerTag', 'EMC & SI') }}
          </el-tag>
        </div>
      </template>

      <el-empty
        v-if="!schedulesSorted.length && !loading"
        :description="text('emcSiLab.emptyDescription', '目前沒有排程資料')"
      />

      <el-table
        v-else-if="!isMobile"
        :data="schedulesSorted"
        border
        stripe
        size="small"
        class="tbl"
        :loading="loading"
      >
        <el-table-column type="index" :label="text('emcSiLab.colIndex', '#')" width="64" align="center" />
        <el-table-column prop="date" :label="text('emcSiLab.colDate', '日期')" width="126" />

        <el-table-column :label="text('emcSiLab.colTime', '時段')" width="196">
          <template #default="{ row }">
            <div class="time-wrap">
              <span class="time-pill">{{ row.startTime }}</span>
              <span class="time-sep">~</span>
              <span class="time-pill">{{ row.endTime }}</span>
            </div>
            <div class="muted time-note">{{ calcRangeText(row) }}</div>
          </template>
        </el-table-column>

        <el-table-column :label="text('emcSiLab.colPurpose', '用途')" min-width="280" show-overflow-tooltip>
          <template #default="{ row }">
            <div class="cell-main">
              <span class="cell-strong">{{ row.purpose || '—' }}</span>
            </div>
          </template>
        </el-table-column>

        <el-table-column :label="text('emcSiLab.colRemark', '備註')" min-width="220">
          <template #default="{ row }">
            <el-tooltip v-if="row.remark" :content="String(row.remark)" placement="top">
              <span class="ellipsis">{{ row.remark }}</span>
            </el-tooltip>
            <span v-else class="muted">—</span>
          </template>
        </el-table-column>

        <el-table-column prop="createdAt" :label="text('emcSiLab.colCreatedAt', '建立時間')" width="176">
          <template #default="{ row }">
            <span class="muted">{{ formatDateTime(row.createdAt) }}</span>
          </template>
        </el-table-column>

        <el-table-column prop="status" :label="text('emcSiLab.colStatus', '狀態')" width="120" align="center">
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
            <el-card v-for="(row, idx) in schedulesSorted" :key="row.id || idx" shadow="never" class="row-card">
              <div class="card-top">
                <div class="card-left">
                  <div class="time-row">
                    <span class="time-pill">{{ row.startTime }}</span>
                    <span class="time-sep">~</span>
                    <span class="time-pill">{{ row.endTime }}</span>
                  </div>
                  <div class="time-summary muted">{{ calcRangeText(row) }}</div>
                </div>

                <el-tag :type="statusTagType(row.status)" effect="plain" size="small" class="pill mini">
                  {{ statusLabel(row.status) }}
                </el-tag>
              </div>

              <div class="purpose">{{ row.purpose || '—' }}</div>

              <div class="detail-grid">
                <div class="meta-box">
                  <div class="meta-label">{{ text('emcSiLab.colDate', '日期') }}</div>
                  <div class="meta-value">{{ row.date || selectedDate || '—' }}</div>
                </div>
                <div class="meta-box">
                  <div class="meta-label">{{ text('emcSiLab.colCreatedAt', '建立時間') }}</div>
                  <div class="meta-value">{{ formatDateTime(row.createdAt) || '—' }}</div>
                </div>
              </div>

              <div class="remark">
                <div class="muted label">{{ text('emcSiLab.colRemark', '備註') }}</div>
                <div v-if="row.remark" class="remark-text">{{ row.remark }}</div>
                <div v-else class="muted">—</div>
              </div>
            </el-card>
          </div>
        </template>
      </div>
    </el-card>

    <el-dialog
      v-model="dialogVisible"
      :title="text('emcSiLab.dialogTitleNew', '新增排程')"
      :width="isMobile ? '100%' : '580px'"
      :fullscreen="isMobile"
      :close-on-click-modal="false"
      destroy-on-close
      class="dlg"
    >
      <div class="dialog-hero">
        <div class="dialog-hero-icon">
          <el-icon><Clock /></el-icon>
        </div>
        <div>
          <div class="dialog-hero-title">{{ text('emcSiLab.dialogIntroTitle', '建立新的時段預約') }}</div>
          <div class="dialog-hero-subtitle">
            {{ text('emcSiLab.dialogIntroSubtitle', '先選日期與時段，再補上用途與備註') }}
          </div>
        </div>
      </div>

      <el-form
        :model="form"
        :label-width="isMobile ? 'auto' : '96px'"
        :label-position="isMobile ? 'top' : 'right'"
      >
        <el-form-item :label="text('emcSiLab.fieldDate', '日期')">
          <el-date-picker
            v-model="form.date"
            class="ctrl w-100"
            type="date"
            value-format="YYYY-MM-DD"
            :placeholder="text('emcSiLab.datePlaceholder', '選擇日期')"
          />
        </el-form-item>

        <el-form-item :label="text('emcSiLab.fieldTimeRange', '時段')">
          <div class="time-range-card">
            <div class="time-range">
              <el-time-select
                v-model="form.startTime"
                class="ctrl w-time"
                start="08:00"
                step="00:30"
                end="18:00"
                :placeholder="text('emcSiLab.timeStartPlaceholder', '開始時間')"
              />
              <span class="sep">~</span>
              <el-time-select
                v-model="form.endTime"
                class="ctrl w-time"
                start="08:00"
                step="00:30"
                end="18:00"
                :placeholder="text('emcSiLab.timeEndPlaceholder', '結束時間')"
              />
            </div>

            <div class="muted mini-tip" v-if="form.startTime && form.endTime">
              {{ text('emcSiLab.colTime', '時段') }}：{{ form.startTime }} ~ {{ form.endTime }}（{{ calcRangeText(form) }}）
            </div>
          </div>
        </el-form-item>

        <el-form-item :label="text('emcSiLab.fieldQuickRange', '快捷時段')">
          <div class="quick-wrap">
            <el-button
              v-for="item in quickRanges"
              :key="item.key"
              size="small"
              class="btn-chip"
              @click="applyQuick(item)"
            >
              {{ item.label }}
            </el-button>
          </div>
        </el-form-item>

        <el-form-item :label="text('emcSiLab.fieldPurpose', '用途')">
          <el-input
            v-model="form.purpose"
            type="textarea"
            :rows="3"
            maxlength="200"
            show-word-limit
            :placeholder="text('emcSiLab.purposePlaceholder', '請輸入用途')"
          />
        </el-form-item>

        <el-form-item :label="text('emcSiLab.fieldRemark', '備註')">
          <el-input
            v-model="form.remark"
            type="textarea"
            :rows="2"
            maxlength="150"
            show-word-limit
            :placeholder="text('emcSiLab.remarkPlaceholder', '請輸入備註')"
          />
        </el-form-item>
      </el-form>

      <template #footer>
        <span class="dialog-footer">
          <el-button class="btn" @click="dialogVisible = false">
            {{ text('common.cancel', '取消') }}
          </el-button>
          <el-button class="btn" type="primary" :loading="saving" @click="saveSchedule">
            {{ text('emcSiLab.btnSave', '儲存') }}
          </el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed, onBeforeUnmount } from 'vue'
import { ElMessage } from 'element-plus'
import { Plus, RefreshRight as Refresh, Calendar, Clock } from '@element-plus/icons-vue'
import { useI18n } from 'vue-i18n'
import api from '@/api'

const { t, te } = useI18n()

function text (key, fallback, params) {
  if (te(key)) return t(key, params)
  if (!params) return fallback
  return String(fallback).replace(/\{(\w+)\}/g, (_, k) => String(params?.[k] ?? ''))
}

const LAB_TYPE = 'EMCSI'

function todayStr () {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

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

const quickRanges = computed(() => ([
  { key: 'morning', label: text('emcSiLab.quickMorning', '上午'), startTime: '09:00', endTime: '12:00' },
  { key: 'afternoon', label: text('emcSiLab.quickAfternoon', '下午'), startTime: '13:30', endTime: '17:30' },
  { key: 'fullday', label: text('emcSiLab.quickFullDay', '整天'), startTime: '09:00', endTime: '17:30' }
]))

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
  if (v === 'approved') return text('emcSiLab.status.approved', '已核准')
  if (v === 'rejected') return text('emcSiLab.status.rejected', '已拒絕')
  if (v === 'canceled') return text('emcSiLab.status.canceled', '已取消')
  if (v === 'finished') return text('emcSiLab.status.finished', '已完成')
  return text('emcSiLab.status.pending', '待處理')
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
  const hourShort = text('emcSiLab.units.hourShort', 'h')
  const minuteShort = text('emcSiLab.units.minuteShort', 'm')
  if (!diff) return `0${minuteShort}`
  if (h && m) return `${h}${hourShort} ${m}${minuteShort}`
  if (h) return `${h}${hourShort}`
  return `${m}${minuteShort}`
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
  const hourShort = text('emcSiLab.units.hourShort', 'h')
  const minuteShort = text('emcSiLab.units.minuteShort', 'm')
  if (!mins) return `0${hourShort}`
  if (h && m) return `${h}${hourShort} ${m}${minuteShort}`
  if (h) return `${h}${hourShort}`
  return `${m}${minuteShort}`
})

const approvedCount = computed(() => schedulesSorted.value.filter(r => String(r?.status || '').toLowerCase() === 'approved').length)

async function fetchSchedules () {
  if (!selectedDate.value) return
  loading.value = true
  try {
    const { data } = await api.get('/lab-schedules/day', {
      params: { labType: LAB_TYPE, date: selectedDate.value }
    })
    schedules.value = Array.isArray(data?.data) ? data.data : []
  } catch (err) {
    console.error('❌ fetch EMC & SI schedules failed:', err)
    schedules.value = []
    ElMessage.error(err?.response?.data?.message || text('emcSiLab.message.loadFailed', '載入失敗'))
  } finally {
    loading.value = false
  }
}

function openDialog () {
  form.date = selectedDate.value || todayStr()
  form.startTime = '09:00'
  form.endTime = '12:00'
  form.purpose = ''
  form.remark = ''
  dialogVisible.value = true
}

function applyQuick (range) {
  form.startTime = range.startTime
  form.endTime = range.endTime
}

async function saveSchedule () {
  if (!form.date) return ElMessage.warning(text('emcSiLab.validation.dateRequired', '請選擇日期'))
  if (!form.startTime || !form.endTime) return ElMessage.warning(text('emcSiLab.validation.timeRangeRequired', '請選擇時段'))
  if (form.endTime <= form.startTime) return ElMessage.warning(text('emcSiLab.validation.timeOrder', '結束時間必須晚於開始時間'))
  if (!String(form.purpose || '').trim()) return ElMessage.warning(text('emcSiLab.validation.purposeRequired', '請輸入用途'))

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
    ElMessage.success(data?.message || text('emcSiLab.message.createSuccess', '新增成功'))
    dialogVisible.value = false
    selectedDate.value = form.date
    await fetchSchedules()
  } catch (err) {
    console.error('❌ create EMC & SI schedule failed:', err)
    ElMessage.error(err?.response?.data?.message || text('emcSiLab.message.createFailed', '新增失敗'))
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
.emcsi-page {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  color: var(--el-text-color-primary);
}

.muted {
  color: var(--el-text-color-secondary);
}

.pill {
  border-radius: 999px;
}

.pill.mini {
  font-size: 12px;
  padding: 2px 10px;
}

.hero-card,
.list-card {
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
  color: var(--el-color-primary);
}

.hero-copy {
  min-width: 0;
}

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

.ctrl,
.btn {
  border-radius: 12px;
}

.w-date {
  width: 180px;
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

.stat-value.small {
  font-size: 18px;
  line-height: 1.3;
  word-break: break-word;
}

.date-alert {
  border-radius: 16px;
}

.alert-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
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

.tbl :deep(.el-table__header-wrapper th) {
  background: var(--el-fill-color-light);
}

.time-wrap {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.time-pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 62px;
  padding: 4px 10px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--el-color-primary-light-9) 68%, var(--el-fill-color-light) 32%);
  border: 1px solid color-mix(in srgb, var(--el-color-primary) 22%, var(--el-border-color));
  font-weight: 700;
  font-size: 12px;
}

.time-sep {
  color: var(--el-text-color-secondary);
}

.time-note {
  margin-top: 4px;
  font-size: 12px;
}

.cell-strong {
  font-weight: 700;
}

.ellipsis {
  display: inline-block;
  max-width: 360px;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.mobile-list {
  width: 100%;
}

.cards {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.row-card {
  border-radius: 18px;
  border: 1px solid var(--el-border-color-lighter);
  background: var(--el-bg-color);
}

.card-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
}

.time-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.time-summary {
  margin-top: 8px;
  font-size: 12px;
}

.purpose {
  margin-top: 12px;
  font-weight: 800;
  font-size: 15px;
  line-height: 1.5;
  word-break: break-word;
}

.detail-grid {
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

.meta-label,
.remark .label {
  font-size: 12px;
  font-weight: 700;
  margin-bottom: 4px;
}

.meta-value {
  font-size: 13px;
  line-height: 1.45;
  word-break: break-word;
}

.remark {
  margin-top: 12px;
}

.remark-text {
  font-size: 13px;
  line-height: 1.6;
  word-break: break-word;
}

.dialog-hero {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px;
  border-radius: 16px;
  border: 1px solid var(--el-border-color-lighter);
  background: linear-gradient(180deg, color-mix(in srgb, var(--el-fill-color-light) 92%, white 8%) 0%, var(--el-bg-color) 100%);
  margin-bottom: 14px;
}

.dialog-hero-icon {
  width: 44px;
  height: 44px;
  border-radius: 14px;
  display: grid;
  place-items: center;
  background: var(--el-color-primary-light-9);
  color: var(--el-color-primary);
  font-size: 20px;
}

.dialog-hero-title {
  font-size: 16px;
  font-weight: 800;
}

.dialog-hero-subtitle {
  margin-top: 4px;
  font-size: 13px;
  color: var(--el-text-color-secondary);
}

.time-range-card {
  width: 100%;
  padding: 12px;
  border-radius: 14px;
  border: 1px solid var(--el-border-color-lighter);
  background: color-mix(in srgb, var(--el-fill-color-light) 88%, white 12%);
}

.time-range {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.w-100 {
  width: 100%;
}

.w-time {
  width: 156px;
}

.sep {
  opacity: 0.65;
}

.mini-tip {
  margin-top: 8px;
  font-size: 12px;
}

.quick-wrap {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.btn-chip {
  border-radius: 999px;
}

.dialog-footer .btn {
  min-width: 92px;
}

@media (max-width: 1100px) {
  .stats-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 768px) {
  .emcsi-page {
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
  .detail-grid {
    grid-template-columns: 1fr;
  }

  .hero-actions :deep(.el-button) {
    flex: 1 1 calc(50% - 8px);
  }

  .section-head {
    align-items: flex-start;
  }
}
</style>
