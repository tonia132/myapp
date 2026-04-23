<template>
  <div class="page ems-page-vivid">
    <section class="hero-card">
      <div class="hero-main">
        <div class="hero-left">
          <div class="hero-icon-wrap">
            <div class="hero-icon">⚡</div>
          </div>

          <div class="hero-copy">
            <div class="hero-eyebrow">{{ text('emsLab.eyebrow', 'Lab Scheduling Center') }}</div>
            <h2 class="hero-title">{{ text('emsLab.title', 'EMS 實驗室排程') }}</h2>
            <div class="hero-subtitle">
              {{ text('emsLab.subtitle', '快速查看每日排程、建立時段與追蹤目前使用狀態') }}
            </div>
          </div>
        </div>

        <div class="hero-actions">
          <el-input
            v-model="kw"
            clearable
            class="ctrl w-search"
            :placeholder="text('emsLab.searchPlaceholder', '搜尋用途 / 備註 / 狀態 / 時段')"
          >
            <template #prefix><el-icon><Search /></el-icon></template>
          </el-input>

          <el-date-picker
            v-model="selectedDate"
            class="ctrl w-date"
            type="date"
            value-format="YYYY-MM-DD"
            :placeholder="text('emsLab.datePickerPlaceholder', '選擇日期')"
            @change="fetchSchedules"
          />

          <el-button class="btn" plain :loading="loading" @click="fetchSchedules">
            {{ text('emsLab.btnRefresh', '重新整理') }}
          </el-button>

          <el-button type="primary" class="btn" :icon="Plus" @click="openDialog">
            {{ text('emsLab.btnNewSchedule', '新增排程') }}
          </el-button>
        </div>
      </div>

      <div class="stats-grid">
        <div class="stat-card stat-primary">
          <div class="stat-label">{{ text('emsLab.stats.total', '排程筆數') }}</div>
          <div class="stat-value">{{ schedulesFiltered.length }}</div>
        </div>

        <div class="stat-card">
          <div class="stat-label">{{ text('emsLab.stats.totalHours', '總時數') }}</div>
          <div class="stat-value">{{ totalHoursText }}</div>
        </div>

        <div class="stat-card">
          <div class="stat-label">{{ text('emsLab.stats.approved', '已核准') }}</div>
          <div class="stat-value">{{ approvedCount }}</div>
        </div>

        <div class="stat-card">
          <div class="stat-label">{{ text('emsLab.stats.pending', '待處理') }}</div>
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
          {{ text('emsLab.filteredAlert', '目前顯示 {date} 的排程資料', { date: selectedDate }) }}
        </div>

        <div class="alert-meta" v-if="!loading">
          <el-tag effect="plain" class="pill mini">
            {{ text('common.total', '總計') }}：{{ schedulesFiltered.length }}
          </el-tag>
          <el-tag effect="plain" class="pill mini">
            {{ text('emsLab.table.time', '時段') }}：{{ totalHoursText }}
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
                  ? text('emsLab.cardTitleWithDate', '{date} 排程清單', { date: selectedDate })
                  : text('emsLab.cardTitleNoDate', '排程清單')
              }}
            </div>
            <div class="section-subtitle">
              {{ text('emsLab.sectionSubtitle', '支援桌面表格與手機卡片檢視，方便快速閱讀') }}
            </div>
          </div>

          <el-tag effect="plain" round>
            {{ text('emsLab.totalTag', '共 {count} 筆', { count: schedulesFiltered.length }) }}
          </el-tag>
        </div>
      </template>

      <el-empty
        v-if="!schedulesFiltered.length && !loading"
        :description="text('emsLab.emptyDescription', '目前沒有排程資料')"
      />

      <el-table
        v-else-if="!isMobile"
        :data="schedulesFiltered"
        border
        stripe
        size="small"
        class="tbl"
        :loading="loading"
        style="width: 100%"
      >
        <el-table-column type="index" :label="text('emsLab.table.index', '#')" width="60" />
        <el-table-column prop="date" :label="text('emsLab.table.date', '日期')" width="120" />

        <el-table-column :label="text('emsLab.table.time', '時段')" width="200">
          <template #default="{ row }">
            <span class="time-pill">{{ row.startTime }}</span>
            <span class="muted"> ~ </span>
            <span class="time-pill">{{ row.endTime }}</span>
            <span class="muted range-text">({{ calcRangeText(row) }})</span>
          </template>
        </el-table-column>

        <el-table-column prop="purpose" :label="text('emsLab.table.purpose', '用途')" min-width="260" show-overflow-tooltip>
          <template #default="{ row }">
            <div class="purpose-cell">
              <span class="cell-strong">{{ row.purpose }}</span>
            </div>
          </template>
        </el-table-column>

        <el-table-column prop="remark" :label="text('emsLab.table.remark', '備註')" min-width="220">
          <template #default="{ row }">
            <el-tooltip v-if="row.remark" :content="String(row.remark)" placement="top">
              <span class="ellipsis">{{ row.remark }}</span>
            </el-tooltip>
            <span v-else class="muted">—</span>
          </template>
        </el-table-column>

        <el-table-column prop="createdAt" :label="text('emsLab.table.createdAt', '建立時間')" width="170">
          <template #default="{ row }">
            <span class="muted">{{ formatDateTime(row.createdAt) }}</span>
          </template>
        </el-table-column>

        <el-table-column prop="status" :label="text('emsLab.table.status', '狀態')" width="120" align="center">
          <template #default="{ row }">
            <el-tag :type="statusTagType(row.status)" size="small" effect="plain" class="pill mini">
              {{ statusLabel(row.status) }}
            </el-tag>
          </template>
        </el-table-column>

        <template #empty>
          <div class="table-empty">{{ text('common.noData', '目前沒有資料') }}</div>
        </template>
      </el-table>

      <div v-else class="mobile-list">
        <el-skeleton v-if="loading" :rows="6" animated />

        <template v-else>
          <div class="cards">
            <article
              v-for="(row, idx) in schedulesFiltered"
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

                  <div class="purpose">
                    {{ row.purpose }}
                  </div>
                </div>

                <el-tag :type="statusTagType(row.status)" effect="plain" size="small" class="pill mini">
                  {{ statusLabel(row.status) }}
                </el-tag>
              </div>

              <div class="mobile-meta-grid">
                <div class="meta-box">
                  <div class="meta-label">{{ text('emsLab.table.date', '日期') }}</div>
                  <div class="meta-value">{{ row.date || '—' }}</div>
                </div>

                <div class="meta-box">
                  <div class="meta-label">{{ text('emsLab.table.createdAt', '建立時間') }}</div>
                  <div class="meta-value">{{ formatDateTime(row.createdAt) || '—' }}</div>
                </div>
              </div>

              <div class="remark">
                <div class="muted label">{{ text('emsLab.table.remark', '備註') }}</div>
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
      :title="text('emsLab.dialogTitle', '新增 EMS 排程')"
      :width="isMobile ? '100%' : '620px'"
      :fullscreen="isMobile"
      :close-on-click-modal="false"
      destroy-on-close
      class="dlg"
    >
      <div class="dialog-hero">
        <div class="dialog-hero-main">
          <div class="dialog-hero-title">{{ text('emsLab.dialogHeroTitle', '建立新的實驗室排程') }}</div>
          <div class="dialog-hero-subtitle">
            {{ text('emsLab.dialogHeroSubtitle', '先選日期與時段，再填入用途與備註，送出後會立即更新清單') }}
          </div>
        </div>

        <div class="dialog-preview" v-if="form.date && form.startTime && form.endTime">
          <div class="preview-label">{{ text('emsLab.preview', '排程預覽') }}</div>
          <div class="preview-value">{{ form.date }} · {{ form.startTime }} ~ {{ form.endTime }}</div>
          <div class="preview-sub">{{ calcRangeText(form) }}</div>
        </div>
      </div>

      <el-form
        :model="form"
        :label-width="isMobile ? 'auto' : '96px'"
        :label-position="isMobile ? 'top' : 'right'"
      >
        <el-form-item :label="text('emsLab.fieldDate', '日期')">
          <el-date-picker
            v-model="form.date"
            class="ctrl w-220"
            type="date"
            value-format="YYYY-MM-DD"
            :placeholder="text('emsLab.datePickerPlaceholder', '選擇日期')"
          />
        </el-form-item>

        <el-form-item :label="text('emsLab.fieldTimeRange', '時段')">
          <div class="time-range">
            <el-time-select
              v-model="form.startTime"
              class="ctrl w-time"
              start="08:00"
              step="00:30"
              end="18:00"
              :placeholder="text('emsLab.timeStartPlaceholder', '開始時間')"
            />
            <span class="sep">~</span>
            <el-time-select
              v-model="form.endTime"
              class="ctrl w-time"
              start="08:00"
              step="00:30"
              end="18:00"
              :placeholder="text('emsLab.timeEndPlaceholder', '結束時間')"
            />
          </div>

          <div class="muted mini-tip" v-if="form.startTime && form.endTime">
            {{ form.startTime }} ~ {{ form.endTime }}（{{ calcRangeText(form) }}）
          </div>
        </el-form-item>

        <el-form-item :label="text('emsLab.fieldQuickRange', '快速套用')">
          <div class="quick-wrap">
            <el-button
              v-for="item in quickRanges"
              :key="item.key"
              size="small"
              class="btn-chip"
              @click="applyQuick(item)"
            >
              {{ text(`emsLab.quickRanges.${item.key}`, item.fallback) }}
            </el-button>
          </div>
        </el-form-item>

        <el-form-item :label="text('emsLab.fieldPurpose', '用途')">
          <el-input
            v-model="form.purpose"
            type="textarea"
            :rows="3"
            maxlength="200"
            show-word-limit
            :placeholder="text('emsLab.placeholderPurpose', '請輸入用途說明')"
          />
        </el-form-item>

        <el-form-item :label="text('emsLab.fieldRemark', '備註')">
          <el-input
            v-model="form.remark"
            type="textarea"
            :rows="2"
            maxlength="150"
            show-word-limit
            :placeholder="text('emsLab.placeholderRemark', '可補充備註資訊')"
          />
        </el-form-item>
      </el-form>

      <template #footer>
        <span class="dialog-footer">
          <el-button class="btn" @click="dialogVisible = false">
            {{ text('emsLab.btnCancel', '取消') }}
          </el-button>
          <el-button class="btn" type="primary" :loading="saving" @click="saveSchedule">
            {{ text('emsLab.btnSave', '儲存') }}
          </el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed, onBeforeUnmount } from 'vue'
import { useI18n } from 'vue-i18n'
import { ElMessage } from 'element-plus'
import { Plus, RefreshRight as Refresh, Search } from '@element-plus/icons-vue'
import api from '@/api'

const { t, te } = useI18n()

function text (key, fallback, params) {
  if (te(key)) return t(key, params)
  if (!params) return fallback
  return String(fallback).replace(/\{(\w+)\}/g, (_, k) => String(params?.[k] ?? ''))
}

const LAB_TYPE = 'EMS'

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

const kw = ref('')

const form = reactive({
  date: todayStr(),
  startTime: '09:00',
  endTime: '12:00',
  purpose: '',
  remark: ''
})

const quickRanges = computed(() => ([
  { key: 'morning', fallback: '上午', startTime: '09:00', endTime: '12:00' },
  { key: 'afternoon', fallback: '下午', startTime: '13:30', endTime: '17:30' },
  { key: 'full', fallback: '全天', startTime: '09:00', endTime: '17:30' }
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
  if (v === 'approved') return text('emsLab.statusText.approved', '已核准')
  if (v === 'rejected') return text('emsLab.statusText.rejected', '已拒絕')
  if (v === 'canceled') return text('emsLab.statusText.canceled', '已取消')
  if (v === 'finished') return text('emsLab.statusText.finished', '已完成')
  return text('emsLab.statusText.pending', '待處理')
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

const schedulesFiltered = computed(() => {
  const q = String(kw.value || '').trim().toLowerCase()
  if (!q) return schedulesSorted.value
  return schedulesSorted.value.filter(r => {
    const hay = [
      r?.purpose,
      r?.remark,
      r?.status,
      r?.startTime,
      r?.endTime
    ].map(x => String(x ?? '').toLowerCase()).join(' ')
    return hay.includes(q)
  })
})

const totalHoursText = computed(() => {
  const mins = schedulesFiltered.value.reduce((sum, r) => {
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
  schedulesFiltered.value.filter(r => String(r?.status || '').toLowerCase() === 'approved').length
)
const pendingCount = computed(() =>
  schedulesFiltered.value.filter(r => !String(r?.status || '').trim() || String(r?.status || '').toLowerCase() === 'pending').length
)

async function fetchSchedules () {
  if (!selectedDate.value) return
  loading.value = true
  try {
    const { data } = await api.get('/lab-schedules/day', {
      params: { labType: LAB_TYPE, date: selectedDate.value }
    })
    schedules.value = Array.isArray(data?.data) ? data.data : []
  } catch (err) {
    console.error('❌ 取得 EMS 排程失敗:', err)
    schedules.value = []
    ElMessage.error(err?.response?.data?.message || text('emsLab.message.loadFailed', '載入排程失敗'))
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
  if (!form.date) return ElMessage.warning(text('emsLab.message.needDate', '請選擇日期'))
  if (!form.startTime || !form.endTime) return ElMessage.warning(text('emsLab.message.needTimeRange', '請選擇時間範圍'))
  if (form.endTime <= form.startTime) return ElMessage.warning(text('emsLab.message.timeInvalid', '結束時間必須晚於開始時間'))
  if (!String(form.purpose || '').trim()) return ElMessage.warning(text('emsLab.message.needPurpose', '請輸入用途'))

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
    ElMessage.success(data?.message || text('emsLab.message.createSuccess', '建立成功'))
    dialogVisible.value = false
    selectedDate.value = form.date
    await fetchSchedules()
  } catch (err) {
    console.error('❌ 新增 EMS 排程失敗:', err)
    ElMessage.error(err?.response?.data?.message || text('emsLab.message.createFailed', '建立失敗'))
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
.ems-page-vivid {
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
.w-search { width: 280px; max-width: 100%; }

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

.tbl :deep(.el-table__header-wrapper th) { background: var(--el-fill-color-light); }
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
.table-empty {
  padding: 70px 0;
  text-align: center;
  opacity: .75;
  font-size: 14px;
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
.dialog-hero-main,
.dialog-preview {
  padding: 14px 16px;
  border-radius: 18px;
  border: 1px solid var(--el-border-color-lighter);
  background: linear-gradient(180deg, color-mix(in srgb, var(--el-fill-color-light) 92%, white 8%) 0%, var(--el-bg-color) 100%);
}
.dialog-hero-title {
  font-size: 16px;
  font-weight: 800;
}
.dialog-hero-subtitle {
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
.dialog-footer .btn { min-width: 92px; }

@media (max-width: 1100px) {
  .stats-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .dialog-hero {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .ems-page-vivid {
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

  .w-search,
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
