<template>
  <div class="page review-center-page-vivid">
    <section class="hero-card">
      <div class="hero-main">
        <div class="hero-left">
          <div class="hero-icon-wrap">
            <div class="hero-icon">📝</div>
          </div>

          <div class="hero-copy">
            <div class="hero-eyebrow">{{ text('reviewCenter.eyebrow', 'Approval Workflow Center') }}</div>
            <h2 class="hero-title">{{ text('reviewCenter.title', '審核中心') }}</h2>
            <div class="hero-subtitle">
              {{ text('reviewCenter.heroSubtitle', '集中處理借用、排程與資源申請，快速完成核准、駁回與明細檢視') }}
            </div>
          </div>
        </div>

        <div class="hero-actions">
          <el-select v-model="type" class="w-180" @change="onTypeChange">
            <el-option
              v-for="opt in typeOptions"
              :key="opt.value"
              :label="opt.label"
              :value="opt.value"
            />
          </el-select>

          <el-select
            v-model="status"
            class="w-160"
            clearable
            :placeholder="text('reviewCenter.statusAll', '全部狀態')"
            @change="onStatusChange"
          >
            <el-option :label="text('reviewCenter.pending', '待審核')" value="pending" />
            <el-option :label="text('reviewCenter.approved', '已核准')" value="approved" />
            <el-option :label="text('reviewCenter.rejected', '已駁回')" value="rejected" />
          </el-select>

          <el-input
            v-model="keyword"
            class="w-260"
            clearable
            :placeholder="text('reviewCenter.searchPlaceholder', '搜尋關鍵字')"
            @keyup.enter="onKeywordSearch"
            @clear="onKeywordClear"
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>

          <el-button class="btn" :icon="Refresh" :loading="loading" @click="reloadAll">
            {{ text('common.refresh', '重新整理') }}
          </el-button>

          <div class="now-chip" v-if="nowText">
            <span class="now-label">{{ text('reviewCenter.now', '現在時間') }}</span>
            <strong>{{ nowText }}</strong>
          </div>
        </div>
      </div>

      <div class="stats-grid">
        <div class="stat-card stat-warning">
          <div class="stat-label">{{ text('reviewCenter.pending', '待審核') }}</div>
          <div class="stat-value">{{ summary.pending }}</div>
        </div>

        <div class="stat-card stat-success">
          <div class="stat-label">{{ text('reviewCenter.approved', '已核准') }}</div>
          <div class="stat-value">{{ summary.approved }}</div>
        </div>

        <div class="stat-card stat-danger">
          <div class="stat-label">{{ text('reviewCenter.rejected', '已駁回') }}</div>
          <div class="stat-value">{{ summary.rejected }}</div>
        </div>

        <div class="stat-card">
          <div class="stat-label">{{ text('reviewCenter.currentType', '目前類型') }}</div>
          <div class="stat-value stat-small">{{ typeLabel(type) }}</div>
        </div>
      </div>
    </section>

    <el-card shadow="never" class="block-card">
      <template #header>
        <div class="section-head">
          <div>
            <div class="section-title">{{ text('reviewCenter.listTitle', '審核列表') }}</div>
            <div class="section-subtitle">
              {{ text('reviewCenter.listSubtitle', '可批次處理待審資料，桌機維持表格，手機改成卡片式閱讀') }}
            </div>
          </div>

          <el-tag effect="plain" round>
            {{ text('reviewCenter.totalTag', '共 {count} 筆', { count }) }}
          </el-tag>
        </div>
      </template>

      <div class="toolbar">
        <div class="hint">
          <el-tag size="small" type="info" effect="plain">
            {{ text('reviewCenter.hint', '可勾選多筆進行批次核准或駁回') }}
          </el-tag>
        </div>

        <div class="toolbar-right">
          <el-button
            size="small"
            plain
            :disabled="!hasSelection || acting"
            @click="bulkApprove"
          >
            ✅ {{ text('reviewCenter.bulkApprove', '批次核准') }}
          </el-button>
          <el-button
            size="small"
            plain
            type="danger"
            :disabled="!hasSelection || acting"
            @click="bulkReject"
          >
            ⛔ {{ text('reviewCenter.bulkReject', '批次駁回') }}
          </el-button>
        </div>
      </div>

      <el-table
        v-if="!isMobile"
        ref="tableRef"
        row-key="id"
        :data="rows"
        v-loading="loading"
        size="small"
        stripe
        border
        class="review-table"
        :row-class-name="rowClassName"
        @selection-change="onSelectionChange"
      >
        <el-table-column type="selection" width="44" />

        <el-table-column
          prop="resourceName"
          :label="text('reviewCenter.colResource', '資源')"
          min-width="160"
          show-overflow-tooltip
        />

        <el-table-column
          prop="requesterName"
          :label="text('reviewCenter.colRequester', '申請人')"
          min-width="120"
          show-overflow-tooltip
        />

        <el-table-column :label="text('reviewCenter.colType', '類型')" width="160">
          <template #default="{ row }">
            <el-tag size="small" effect="plain">{{ typeLabel(row.type) }}</el-tag>
          </template>
        </el-table-column>

        <el-table-column :label="text('reviewCenter.colTime', '時間')" min-width="240">
          <template #default="{ row }">
            <div class="mono">
              <div>{{ fmt(row.startAt) }} ~</div>
              <div>{{ row.endAt ? fmt(row.endAt) : '-' }}</div>
            </div>
          </template>
        </el-table-column>

        <el-table-column
          prop="purpose"
          :label="text('reviewCenter.colPurpose', '用途')"
          min-width="220"
          show-overflow-tooltip
        />

        <el-table-column :label="text('reviewCenter.colStatus', '狀態')" width="120">
          <template #default="{ row }">
            <el-tag :type="tagType(row.status)">
              {{ text(`reviewCenter.${row.status}`, row.status || '-') }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column :label="text('reviewCenter.colAction', '操作')" width="250" fixed="right">
          <template #default="{ row }">
            <div class="table-actions">
              <el-button
                v-if="row.status === 'pending'"
                size="small"
                type="success"
                :loading="acting && actingRowId === row.id"
                @click="openApprove(row)"
              >
                {{ text('reviewCenter.btnApprove', '核准') }}
              </el-button>

              <el-button
                v-if="row.status === 'pending'"
                size="small"
                type="danger"
                :loading="acting && actingRowId === row.id"
                @click="openReject(row)"
              >
                {{ text('reviewCenter.btnReject', '駁回') }}
              </el-button>

              <el-button v-else size="small" disabled>
                {{ text('reviewCenter.done', '已完成') }}
              </el-button>

              <el-button size="small" text @click="openDetail(row)">
                {{ text('reviewCenter.btnDetail', '明細') }}
              </el-button>
            </div>
          </template>
        </el-table-column>
      </el-table>

      <div v-else class="mobile-list" v-loading="loading">
        <template v-if="rows.length">
          <article
            v-for="row in rows"
            :key="row.id"
            class="review-card"
            :class="{ focused: String(row.id) === String(focusId || '') }"
          >
            <div class="review-top">
              <div class="review-head">
                <div class="review-title">{{ row.resourceName || '-' }}</div>
                <div class="review-sub">
                  {{ row.requesterName || '-' }} · {{ typeLabel(row.type) }}
                </div>
              </div>

              <el-tag :type="tagType(row.status)" effect="plain" class="pill mini">
                {{ text(`reviewCenter.${row.status}`, row.status || '-') }}
              </el-tag>
            </div>

            <div class="meta-grid">
              <div class="meta-box">
                <div class="meta-label">{{ text('reviewCenter.colTime', '時間') }}</div>
                <div class="meta-value mono">
                  <div>{{ fmt(row.startAt) }}</div>
                  <div>{{ row.endAt ? fmt(row.endAt) : '-' }}</div>
                </div>
              </div>

              <div class="meta-box">
                <div class="meta-label">{{ text('reviewCenter.colPurpose', '用途') }}</div>
                <div class="meta-value">{{ row.purpose || '-' }}</div>
              </div>
            </div>

            <div class="card-actions">
              <el-button
                v-if="row.status === 'pending'"
                size="small"
                type="success"
                @click="openApprove(row)"
              >
                {{ text('reviewCenter.btnApprove', '核准') }}
              </el-button>

              <el-button
                v-if="row.status === 'pending'"
                size="small"
                type="danger"
                @click="openReject(row)"
              >
                {{ text('reviewCenter.btnReject', '駁回') }}
              </el-button>

              <el-button size="small" plain @click="openDetail(row)">
                {{ text('reviewCenter.btnDetail', '明細') }}
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
          layout="total, prev, pager, next, sizes"
          :total="count"
          :page-size="pageSize"
          :current-page="page"
          @current-change="onPageChange"
          @size-change="onSizeChange"
        />
      </div>
    </el-card>

    <el-dialog v-model="approveOpen" :title="text('reviewCenter.approveTitle', '核准申請')" :width="isMobile ? '100%' : '520px'" :fullscreen="isMobile">
      <div class="dialog-hero compact">
        <div class="dialog-main">
          <div class="dialog-title">{{ text('reviewCenter.approveTitle', '核准申請') }}</div>
          <div class="dialog-subtitle">
            {{ text('reviewCenter.approveHint', '可留下審核備註，送出後該申請會被標記為已核准') }}
          </div>
        </div>

        <div class="dialog-preview">
          <div class="preview-label">{{ text('reviewCenter.selectedItem', '選取項目') }}</div>
          <div class="preview-value">{{ currentRow?.resourceName || '-' }}</div>
          <div class="preview-sub">{{ typeLabel(currentRow?.type) }}</div>
        </div>
      </div>

      <el-form label-position="top">
        <el-form-item :label="text('reviewCenter.approveNote', '核准備註')">
          <el-input
            v-model="approveNote"
            type="textarea"
            :rows="4"
            :placeholder="text('reviewCenter.approveNotePh', '請輸入備註')"
          />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button class="btn" @click="approveOpen = false">{{ text('common.cancel', '取消') }}</el-button>
        <el-button class="btn" type="success" :loading="acting" @click="doApprove">
          {{ text('common.confirm', '確認') }}
        </el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="rejectOpen" :title="text('reviewCenter.rejectTitle', '駁回申請')" :width="isMobile ? '100%' : '520px'" :fullscreen="isMobile">
      <div class="dialog-hero compact">
        <div class="dialog-main">
          <div class="dialog-title">{{ text('reviewCenter.rejectTitle', '駁回申請') }}</div>
          <div class="dialog-subtitle">
            {{ text('reviewCenter.rejectHint', '請填寫駁回原因，送出後申請人可依原因重新調整申請') }}
          </div>
        </div>

        <div class="dialog-preview">
          <div class="preview-label">{{ text('reviewCenter.selectedItem', '選取項目') }}</div>
          <div class="preview-value">{{ currentRow?.resourceName || '-' }}</div>
          <div class="preview-sub">{{ typeLabel(currentRow?.type) }}</div>
        </div>
      </div>

      <el-form label-position="top">
        <el-form-item :label="text('reviewCenter.rejectReason', '駁回原因')">
          <el-input
            v-model="rejectReason"
            type="textarea"
            :rows="4"
            :placeholder="text('reviewCenter.rejectReasonPh', '請輸入原因')"
          />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button class="btn" @click="rejectOpen = false">{{ text('common.cancel', '取消') }}</el-button>
        <el-button class="btn" type="danger" :loading="acting" @click="doReject">
          {{ text('common.confirm', '確認') }}
        </el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="detailOpen" :title="text('reviewCenter.detailTitle', '申請明細')" :width="isMobile ? '100%' : '720px'" :fullscreen="isMobile">
      <div class="detail-grid">
        <div class="detail-box">
          <div class="detail-k">{{ text('reviewCenter.colResource', '資源') }}</div>
          <div class="detail-v">
            <b>{{ detailRow?.resourceName || '-' }}</b>
            <span class="muted">（{{ typeLabel(detailRow?.type) }}）</span>
          </div>
        </div>

        <div class="detail-box">
          <div class="detail-k">{{ text('reviewCenter.colRequester', '申請人') }}</div>
          <div class="detail-v">{{ detailRow?.requesterName || '-' }}</div>
        </div>

        <div class="detail-box">
          <div class="detail-k">{{ text('reviewCenter.colTime', '時間') }}</div>
          <div class="detail-v mono">
            {{ fmt(detailRow?.startAt) }} ~ {{ detailRow?.endAt ? fmt(detailRow?.endAt) : '-' }}
          </div>
        </div>

        <div class="detail-box">
          <div class="detail-k">{{ text('reviewCenter.colPurpose', '用途') }}</div>
          <div class="detail-v">{{ detailRow?.purpose || '-' }}</div>
        </div>

        <div class="detail-box">
          <div class="detail-k">{{ text('reviewCenter.colStatus', '狀態') }}</div>
          <div class="detail-v">
            <el-tag :type="tagType(detailRow?.status)">
              {{ detailRow?.status ? text(`reviewCenter.${detailRow.status}`, detailRow.status) : '-' }}
            </el-tag>
          </div>
        </div>

        <div class="detail-box" v-if="detailRow?.reviewNote">
          <div class="detail-k">{{ text('reviewCenter.reviewNote', '審核備註') }}</div>
          <div class="detail-v">{{ detailRow.reviewNote }}</div>
        </div>

        <div class="detail-box" v-if="detailRow?.rejectReason">
          <div class="detail-k">{{ text('reviewCenter.rejectReason', '駁回原因') }}</div>
          <div class="detail-v danger">{{ detailRow.rejectReason }}</div>
        </div>
      </div>

      <template #footer>
        <el-button class="btn" @click="detailOpen = false">{{ text('common.close', '關閉') }}</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch, nextTick } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Refresh, Search } from '@element-plus/icons-vue'
import { useI18n } from 'vue-i18n'
import request from '../utils/request'

const { t, te } = useI18n()
const route = useRoute()

function text (key, fallback, params) {
  if (te(key)) return t(key, params)
  if (!params) return fallback
  return String(fallback).replace(/\{(\w+)\}/g, (_, k) => String(params?.[k] ?? ''))
}

const typeOptions = computed(() => [
  { value: 'machine', label: text('reviewCenter.typeMachine', '機台測試排程') },
  { value: 'equipment', label: text('reviewCenter.typeEquipment', '儀器設備借用') },
  { value: 'warehouse', label: text('reviewCenter.typeWarehouse', '倉庫借用') },
  { value: 'emcsi', label: text('reviewCenter.typeEmcsi', 'EMC/SI 排程') },
  { value: 'ip', label: text('reviewCenter.typeIp', 'IP 排程') },
  { value: 'ik', label: text('reviewCenter.typeIk', 'IK 排程') },
  { value: 'ems', label: text('reviewCenter.typeEms', 'EMS 排程') }
])

const type = ref('machine')
const status = ref('pending')
const keyword = ref('')

const page = ref(1)
const pageSize = ref(20)

const loading = ref(false)
const acting = ref(false)
const actingRowId = ref(null)

const rows = ref([])
const count = ref(0)
const summary = ref({ pending: 0, approved: 0, rejected: 0 })
const selection = ref([])

const approveOpen = ref(false)
const approveNote = ref('')
const rejectOpen = ref(false)
const rejectReason = ref('')
const currentRow = ref(null)

const detailOpen = ref(false)
const detailRow = ref(null)

const nowText = ref('')
let nowTimer = null

const hasSelection = computed(() => selection.value.length > 0)

const tableRef = ref(null)
const focusId = ref(null)
const focusSource = ref('')
const autoOpened = ref(false)
const suppressChange = ref(false)

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

function onSelectionChange (arr) {
  selection.value = Array.isArray(arr) ? arr : []
}

function onPageChange (p) {
  page.value = p
  fetchList()
}

function onSizeChange (s) {
  pageSize.value = s
  page.value = 1
  fetchList()
}

function onTypeChange () {
  if (suppressChange.value) return
  page.value = 1
  reloadAll()
}

function onStatusChange () {
  if (suppressChange.value) return
  page.value = 1
  fetchList()
}

function onKeywordSearch () {
  page.value = 1
  fetchList()
}
function onKeywordClear () {
  page.value = 1
  fetchList()
}

function typeLabel (v) {
  const hit = typeOptions.value.find((x) => x.value === v)
  return hit ? hit.label : (v || '-')
}

function fmt (d) {
  if (!d) return ''
  const dt = new Date(d)
  if (Number.isNaN(dt.getTime())) return String(d)
  return dt.toLocaleString('zh-TW', { hour12: false })
}

function tagType (st) {
  if (st === 'pending') return 'warning'
  if (st === 'approved') return 'success'
  if (st === 'rejected') return 'danger'
  return 'info'
}

function tickNow () {
  nowText.value = new Date().toLocaleString('zh-TW', { hour12: false })
}

function rowClassName ({ row }) {
  if (!focusId.value) return ''
  return String(row.id) === String(focusId.value) ? 'row-focus' : ''
}

function scrollToFocusRow () {
  if (!focusId.value || !tableRef.value?.$el) return
  const el = tableRef.value.$el
  const rowEl = el.querySelector(
    `.el-table__body-wrapper tbody tr[data-row-key="${String(focusId.value)}"]`
  )
  rowEl?.scrollIntoView?.({ block: 'center', behavior: 'smooth' })
}

function applyQuery (q) {
  const tab = String(q?.tab || '')
  const st = String(q?.status || '')
  const src = String(q?.source || '')
  const idRaw = q?.id

  focusSource.value = src || ''
  focusId.value = idRaw != null && String(idRaw).trim() !== '' ? String(idRaw) : null
  autoOpened.value = false

  if (['pending', 'approved', 'rejected'].includes(st)) status.value = st

  const qType = String(q?.type || '')
  if (qType && typeOptions.value.some(x => x.value === qType)) {
    type.value = qType
    return
  }

  const sourceToType = {
    MachineSchedule: 'machine',
    Schedule: 'machine',
    EquipmentLoan: 'equipment',
    BorrowRecord: 'warehouse',
    LabSchedule: 'emcsi'
  }
  if (src && sourceToType[src]) {
    type.value = sourceToType[src]
    return
  }

  if (tab === 'borrow') type.value = 'equipment'
  if (tab === 'schedule') type.value = 'machine'
}

async function fetchSummary () {
  const { data } = await request.get('/review/summary', {
    params: { type: type.value }
  })
  summary.value = data || { pending: 0, approved: 0, rejected: 0 }
}

async function fetchList () {
  loading.value = true
  try {
    const { data } = await request.get('/review/requests', {
      params: {
        type: type.value,
        status: status.value || '',
        keyword: keyword.value || '',
        page: page.value,
        pageSize: pageSize.value
      }
    })

    rows.value = data?.rows || []
    count.value = Number.isFinite(data?.count) ? data.count : rows.value.length
    selection.value = []
    tableRef.value?.clearSelection?.()

    await nextTick()

    if (focusId.value) {
      scrollToFocusRow()

      if (!autoOpened.value) {
        const hit = rows.value.find(r => String(r.id) === String(focusId.value))
        if (hit) {
          autoOpened.value = true
          openDetail(hit)
        } else {
          autoOpened.value = true
          ElMessage.info(text('reviewCenter.msgNotFoundInPage', '該筆不在目前頁面，可嘗試調整篩選或用關鍵字搜尋'))
        }
      }
    }
  } catch (e) {
    ElMessage.error(e?.response?.data?.message || text('reviewCenter.msgLoadFailed', '載入失敗'))
  } finally {
    loading.value = false
  }
}

async function reloadAll () {
  page.value = 1
  await Promise.all([fetchSummary(), fetchList()])
}

function openApprove (row) {
  currentRow.value = row
  approveNote.value = ''
  approveOpen.value = true
}

function openReject (row) {
  currentRow.value = row
  rejectReason.value = ''
  rejectOpen.value = true
}

function openDetail (row) {
  detailRow.value = row
  detailOpen.value = true
}

async function doApprove () {
  if (!currentRow.value) return
  acting.value = true
  actingRowId.value = currentRow.value.id
  try {
    await request.post(`/review/requests/${currentRow.value.type}/${currentRow.value.id}/approve`, {
      note: approveNote.value
    })
    ElMessage.success(text('reviewCenter.msgApproved', '已核准'))
    approveOpen.value = false
    await reloadAll()
    window.dispatchEvent(new Event('notify-refresh'))
  } catch (e) {
    ElMessage.error(e?.response?.data?.message || text('reviewCenter.msgFailed', '操作失敗'))
  } finally {
    acting.value = false
    actingRowId.value = null
  }
}

async function doReject () {
  if (!currentRow.value) return
  if (!rejectReason.value.trim()) return ElMessage.warning(text('reviewCenter.msgNeedReason', '請填寫原因'))

  acting.value = true
  actingRowId.value = currentRow.value.id
  try {
    await request.post(`/review/requests/${currentRow.value.type}/${currentRow.value.id}/reject`, {
      reason: rejectReason.value
    })
    ElMessage.success(text('reviewCenter.msgRejected', '已駁回'))
    rejectOpen.value = false
    await reloadAll()
    window.dispatchEvent(new Event('notify-refresh'))
  } catch (e) {
    ElMessage.error(e?.response?.data?.message || text('reviewCenter.msgFailed', '操作失敗'))
  } finally {
    acting.value = false
    actingRowId.value = null
  }
}

async function bulkApprove () {
  if (!hasSelection.value) return
  const pendings = selection.value.filter((x) => x.status === 'pending')
  if (!pendings.length) return ElMessage.info(text('reviewCenter.msgNoPending', '沒有可處理的待審資料'))

  try {
    await ElMessageBox.confirm(
      text('reviewCenter.bulkApproveConfirm', '確定要核准 {count} 筆？', { count: pendings.length }),
      text('reviewCenter.confirmTitle', '確認'),
      { type: 'warning' }
    )
  } catch { return }

  acting.value = true
  try {
    for (const row of pendings) {
      await request.post(`/review/requests/${row.type}/${row.id}/approve`, { note: '' })
    }
    ElMessage.success(text('reviewCenter.msgApproved', '已核准'))
    await reloadAll()
    window.dispatchEvent(new Event('notify-refresh'))
  } catch (e) {
    ElMessage.error(e?.response?.data?.message || text('reviewCenter.msgFailed', '操作失敗'))
  } finally {
    acting.value = false
  }
}

async function bulkReject () {
  if (!hasSelection.value) return
  const pendings = selection.value.filter((x) => x.status === 'pending')
  if (!pendings.length) return ElMessage.info(text('reviewCenter.msgNoPending', '沒有可處理的待審資料'))

  let reason = ''
  try {
    await ElMessageBox.prompt(
      text('reviewCenter.bulkRejectPrompt', '請輸入批次駁回原因'),
      text('reviewCenter.rejectTitle', '駁回申請'),
      {
        confirmButtonText: text('common.confirm', '確認'),
        cancelButtonText: text('common.cancel', '取消'),
        inputPlaceholder: text('reviewCenter.rejectReasonPh', '請輸入原因'),
        inputType: 'textarea',
        inputValidator: (v) => (String(v || '').trim() ? true : text('reviewCenter.msgNeedReason', '請填寫原因'))
      }
    ).then(({ value }) => { reason = String(value || '').trim() })
  } catch { return }

  acting.value = true
  try {
    for (const row of pendings) {
      await request.post(`/review/requests/${row.type}/${row.id}/reject`, { reason })
    }
    ElMessage.success(text('reviewCenter.msgRejected', '已駁回'))
    await reloadAll()
    window.dispatchEvent(new Event('notify-refresh'))
  } catch (e) {
    ElMessage.error(e?.response?.data?.message || text('reviewCenter.msgFailed', '操作失敗'))
  } finally {
    acting.value = false
  }
}

watch(
  () => route.query,
  async (q) => {
    suppressChange.value = true
    applyQuery(q)
    await nextTick()
    suppressChange.value = false
    await reloadAll()
  },
  { immediate: true }
)

onMounted(() => {
  cleanupMql = setupMql()
  tickNow()
  nowTimer = window.setInterval(tickNow, 1000 * 10)
})

onBeforeUnmount(() => {
  if (cleanupMql) cleanupMql()
  if (nowTimer) window.clearInterval(nowTimer)
})
</script>

<style scoped>
.review-center-page-vivid {
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  color: var(--el-text-color-primary);
}

.btn { border-radius: 12px; }
.pill { border-radius: 999px; }
.pill.mini { font-size: 12px; padding: 2px 10px; }
.muted { color: var(--el-text-color-secondary); font-size: 12px; }
.mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono",
    "Courier New", monospace;
}
.w-180 { width: 180px; }
.w-160 { width: 160px; }
.w-260 { width: 260px; }

.hero-card,
.block-card {
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
  letter-spacing: .08em;
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
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.now-chip {
  display: inline-flex;
  flex-direction: column;
  gap: 2px;
  padding: 8px 12px;
  border-radius: 14px;
  border: 1px solid var(--el-border-color-lighter);
  background: color-mix(in srgb, var(--el-fill-color-light) 88%, white 12%);
  font-size: 12px;
}
.now-label { color: var(--el-text-color-secondary); }

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
.stat-warning {
  background: linear-gradient(135deg, color-mix(in srgb, var(--el-color-warning-light-8) 88%, white 12%), var(--el-color-warning-light-9));
}
.stat-success {
  background: linear-gradient(135deg, color-mix(in srgb, var(--el-color-success-light-8) 88%, white 12%), var(--el-color-success-light-9));
}
.stat-danger {
  background: linear-gradient(135deg, color-mix(in srgb, var(--el-color-danger-light-8) 88%, white 12%), var(--el-color-danger-light-9));
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
.stat-value.stat-small {
  font-size: 20px;
  line-height: 1.2;
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

.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
  gap: 10px;
  flex-wrap: wrap;
}
.toolbar-right {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.review-table :deep(.el-table__header-wrapper th) {
  background: var(--el-fill-color-light);
}
.table-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.table-actions :deep(.el-button + .el-button) {
  margin-left: 0;
}

.mobile-list {
  display: grid;
  gap: 12px;
}
.review-card {
  border: 1px solid var(--el-border-color-lighter);
  background: var(--el-bg-color);
  border-radius: 18px;
  padding: 14px;
}
.review-card.focused {
  outline: 2px solid color-mix(in srgb, var(--el-color-primary) 30%, transparent);
  box-shadow: 0 0 0 6px color-mix(in srgb, var(--el-color-primary) 10%, transparent);
}
.review-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
}
.review-title {
  font-size: 16px;
  font-weight: 800;
  line-height: 1.35;
}
.review-sub {
  margin-top: 4px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}
.meta-grid {
  margin-top: 12px;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}
.meta-box,
.detail-box {
  padding: 10px 12px;
  border-radius: 14px;
  border: 1px solid var(--el-border-color-lighter);
  background: color-mix(in srgb, var(--el-fill-color-light) 88%, white 12%);
}
.meta-label,
.detail-k {
  color: var(--el-text-color-secondary);
  font-size: 12px;
  margin-bottom: 4px;
}
.meta-value,
.detail-v {
  color: var(--el-text-color-primary);
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
  flex: 1 1 calc(33.333% - 8px);
  min-width: 100px;
}

.pager {
  display: flex;
  justify-content: flex-end;
  padding-top: 12px;
}

.dialog-hero {
  display: grid;
  grid-template-columns: minmax(0, 1.3fr) minmax(180px, .9fr);
  gap: 12px;
  margin-bottom: 14px;
}
.dialog-hero.compact {
  grid-template-columns: minmax(0, 1.2fr) minmax(180px, .8fr);
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

.detail-grid {
  display: grid;
  gap: 10px;
}
.danger { color: var(--el-color-danger); }

/* focus highlight */
:deep(.row-focus td) {
  background: rgba(64, 158, 255, 0.12) !important;
}
:deep(.row-focus:hover td) {
  background: rgba(64, 158, 255, 0.16) !important;
}

@media (max-width: 1100px) {
  .stats-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .dialog-hero {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 900px) {
  .w-180, .w-160, .w-260 {
    width: 100%;
  }
}

@media (max-width: 768px) {
  .review-center-page-vivid {
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
  .hero-actions,
  .toolbar-right,
  .pager {
    justify-content: flex-start;
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
  .card-actions :deep(.el-button),
  .toolbar-right :deep(.el-button) {
    flex: 1 1 100%;
    min-width: 0;
  }
}
</style>
