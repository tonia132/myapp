<template>
  <el-card shadow="never" class="records-card">
    <template #header>
      <div class="card-header">
        <div class="card-title">
          {{ tt('warehouse.borrowRecords.title', '借用紀錄') }}
        </div>
        <div class="card-sub">
          <el-tag v-if="total > 0" size="small" effect="plain" class="pill">
            {{ tt('warehouse.borrowRecords.totalTag', `共 ${total} 筆`, { total }) }}
          </el-tag>
        </div>
      </div>
    </template>

    <div class="filter-row">
      <el-select
        v-model="statusModel"
        clearable
        class="ctrl ctrl-select"
        :placeholder="tt('warehouse.borrowRecords.filters.status', '借用狀態')"
        @change="emitFilterChange"
        @clear="emitFilterChange"
      >
        <el-option
          v-for="opt in borrowStatusOptions"
          :key="`borrow-status-${opt.value || 'all'}`"
          :label="opt.label"
          :value="opt.value"
        />
      </el-select>

      <el-select
        v-model="reviewStatusModel"
        clearable
        class="ctrl ctrl-select"
        :placeholder="tt('warehouse.borrowRecords.filters.reviewStatus', '審核狀態')"
        @change="emitFilterChange"
        @clear="emitFilterChange"
      >
        <el-option
          v-for="opt in reviewStatusOptions"
          :key="`review-status-${opt.value || 'all'}`"
          :label="opt.label"
          :value="opt.value"
        />
      </el-select>

      <div class="filter-spacer" />

      <el-button :icon="Refresh" @click="emit('refresh')">
        {{ tt('common.refresh', '重新整理') }}
      </el-button>

      <el-button plain @click="handleReset">
        {{ tt('common.reset', '重設') }}
      </el-button>
    </div>

    <el-table
      :data="rows"
      v-loading="loading"
      class="records-table"
      :empty-text="tt('common.noData', '沒有資料')"
      style="width: 100%"
    >
      <el-table-column
        :label="tt('warehouse.borrowRecords.columns.item', '品項')"
        min-width="180"
        show-overflow-tooltip
      >
        <template #default="{ row }">
          <div class="item-cell">
            <div class="item-name">{{ row?.item?.name || '—' }}</div>
            <div class="item-sub">
              {{ row?.item?.code || row?.item?.location || '—' }}
            </div>
          </div>
        </template>
      </el-table-column>

      <el-table-column
        v-if="isAdmin"
        :label="tt('warehouse.borrowRecords.columns.borrower', '借用人')"
        min-width="130"
        show-overflow-tooltip
      >
        <template #default="{ row }">
          {{ row?.borrower?.name || row?.borrower?.username || '—' }}
        </template>
      </el-table-column>

      <el-table-column
        prop="quantity"
        :label="tt('warehouse.borrowRecords.columns.quantity', '數量')"
        width="80"
        align="right"
      />

      <el-table-column
        :label="tt('warehouse.borrowRecords.columns.purpose', '用途')"
        min-width="180"
        show-overflow-tooltip
      >
        <template #default="{ row }">
          {{ row?.purpose || '—' }}
        </template>
      </el-table-column>

      <el-table-column
        :label="tt('warehouse.borrowRecords.columns.expectedReturnAt', '預計歸還')"
        width="150"
      >
        <template #default="{ row }">
          {{ formatDateTimeOrDash(row?.expectedReturnAt) }}
        </template>
      </el-table-column>

      <el-table-column
        :label="tt('warehouse.borrowRecords.columns.createdAt', '申請時間')"
        width="150"
      >
        <template #default="{ row }">
          {{ formatDateTimeOrDash(row?.createdAt || row?.borrowedAt) }}
        </template>
      </el-table-column>

      <el-table-column
        :label="tt('warehouse.borrowRecords.columns.status', '借用狀態')"
        width="110"
        align="center"
      >
        <template #default="{ row }">
          <el-tag
            size="small"
            class="pill"
            :type="getBorrowStatusTagType(row?.status)"
            :effect="getBorrowStatusTagEffect(row?.status)"
          >
            {{ renderBorrowStatusLabel(row?.status) }}
          </el-tag>
        </template>
      </el-table-column>

      <el-table-column
        :label="tt('warehouse.borrowRecords.columns.reviewStatus', '審核狀態')"
        width="110"
        align="center"
      >
        <template #default="{ row }">
          <el-tag
            size="small"
            class="pill"
            :type="getReviewStatusTagType(row?.reviewStatus)"
            :effect="getReviewStatusTagEffect(row?.reviewStatus)"
          >
            {{ renderReviewStatusLabel(row?.reviewStatus) }}
          </el-tag>
        </template>
      </el-table-column>

      <el-table-column
        :label="tt('warehouse.borrowRecords.columns.reviewNote', '審核資訊')"
        min-width="180"
        show-overflow-tooltip
      >
        <template #default="{ row }">
          <div class="review-note-cell">
            <div v-if="row?.rejectReason" class="danger-text">
              {{ tt('warehouse.borrowRecords.rejectReason', '駁回原因：') }}{{ row.rejectReason }}
            </div>
            <div v-else-if="row?.reviewNote">
              {{ row.reviewNote }}
            </div>
            <div v-else>—</div>
          </div>
        </template>
      </el-table-column>

      <el-table-column
        :label="tt('common.actions', '操作')"
        width="240"
        fixed="right"
        align="center"
      >
        <template #default="{ row }">
          <div class="action-cell">
            <template v-if="canReview(row)">
              <el-button
                size="small"
                type="success"
                plain
                :loading="actionLoading"
                @click="openReviewDialog(row, 'approve')"
              >
                {{ tt('warehouse.borrowRecords.actions.approve', '核准') }}
              </el-button>

              <el-button
                size="small"
                type="danger"
                plain
                :loading="actionLoading"
                @click="openReviewDialog(row, 'reject')"
              >
                {{ tt('warehouse.borrowRecords.actions.reject', '駁回') }}
              </el-button>
            </template>

            <el-popconfirm
              v-if="canCancel(row)"
              :title="tt('warehouse.borrowRecords.confirm.cancel', '確定要取消這筆申請？')"
              @confirm="emit('cancel', row)"
            >
              <template #reference>
                <el-button size="small" plain :loading="actionLoading">
                  {{ tt('warehouse.borrowRecords.actions.cancel', '取消申請') }}
                </el-button>
              </template>
            </el-popconfirm>

            <el-popconfirm
              v-if="canReturn(row)"
              :title="tt('warehouse.borrowRecords.confirm.return', '確定要標記為已歸還？')"
              @confirm="emit('return', row)"
            >
              <template #reference>
                <el-button
                  size="small"
                  type="primary"
                  plain
                  :loading="actionLoading"
                >
                  {{ tt('warehouse.borrowRecords.actions.return', '歸還') }}
                </el-button>
              </template>
            </el-popconfirm>
          </div>
        </template>
      </el-table-column>
    </el-table>

    <div class="pager">
      <el-pagination
        background
        layout="total, prev, pager, next, jumper"
        :page-size="pageSize"
        :current-page="page"
        :total="total"
        @current-change="(p) => emit('page-change', p)"
      />
    </div>

    <el-dialog
      v-model="reviewDialog.visible"
      :title="reviewDialog.action === 'approve'
        ? tt('warehouse.borrowRecords.reviewDialog.approveTitle', '核准借用')
        : tt('warehouse.borrowRecords.reviewDialog.rejectTitle', '駁回借用')"
      width="520px"
      :close-on-click-modal="false"
      @closed="resetReviewDialog"
    >
      <el-form
        ref="reviewFormRef"
        :model="reviewDialog.form"
        :rules="reviewRules"
        label-width="110px"
        @submit.prevent
      >
        <el-form-item :label="tt('warehouse.borrowRecords.reviewDialog.item', '品項')">
          <div>
            <div>{{ reviewDialog.row?.item?.name || '—' }}</div>
            <div class="subtext">
              {{
                tt(
                  'warehouse.borrowRecords.reviewDialog.itemSub',
                  `數量：${reviewDialog.row?.quantity ?? 0}，借用人：${reviewDialog.row?.borrower?.name || reviewDialog.row?.borrower?.username || '—'}`,
                  {
                    quantity: reviewDialog.row?.quantity ?? 0,
                    borrower: reviewDialog.row?.borrower?.name || reviewDialog.row?.borrower?.username || '—'
                  }
                )
              }}
            </div>
          </div>
        </el-form-item>

        <el-form-item :label="tt('warehouse.borrowRecords.reviewDialog.note', '備註')">
          <el-input
            v-model="reviewDialog.form.note"
            type="textarea"
            :rows="2"
            :placeholder="tt('warehouse.borrowRecords.reviewDialog.notePlaceholder', '可選填')"
          />
        </el-form-item>

        <el-form-item
          v-if="reviewDialog.action === 'reject'"
          :label="tt('warehouse.borrowRecords.reviewDialog.rejectReason', '駁回原因')"
          prop="rejectReason"
        >
          <el-input
            v-model="reviewDialog.form.rejectReason"
            type="textarea"
            :rows="3"
            :placeholder="tt('warehouse.borrowRecords.reviewDialog.rejectReasonPlaceholder', '請輸入駁回原因')"
          />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button :disabled="actionLoading" @click="reviewDialog.visible = false">
          {{ tt('common.cancel', '取消') }}
        </el-button>
        <el-button
          type="primary"
          :loading="actionLoading"
          @click="submitReviewDialog"
        >
          {{ tt('common.confirm', '確認') }}
        </el-button>
      </template>
    </el-dialog>
  </el-card>
</template>

<script setup>
import { computed, reactive, ref } from 'vue'
import { Refresh } from '@element-plus/icons-vue'
import { useWarehouseMeta } from '@/composables/useWarehouseMeta'
import { useSafeI18n } from '@/composables/useSafeI18n'
import { useDateTimeText } from '@/composables/useDateTimeText'

const props = defineProps({
  rows: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
  actionLoading: { type: Boolean, default: false },
  page: { type: Number, default: 1 },
  pageSize: { type: Number, default: 10 },
  total: { type: Number, default: 0 },
  isAdmin: { type: Boolean, default: false },
  currentUserId: { type: [String, Number], default: null },
  status: { type: String, default: '' },
  reviewStatus: { type: String, default: '' },
})

const emit = defineEmits([
  'update:status',
  'update:reviewStatus',
  'refresh',
  'reset',
  'page-change',
  'cancel',
  'return',
  'review',
])

const { tt } = useSafeI18n()
const { formatDateTimeOrDash } = useDateTimeText()

const {
  borrowStatusOptions,
  reviewStatusOptions,
  renderBorrowStatusLabel,
  getBorrowStatusTagType,
  getBorrowStatusTagEffect,
  renderReviewStatusLabel,
  getReviewStatusTagType,
  getReviewStatusTagEffect,
} = useWarehouseMeta()

const statusModel = computed({
  get: () => props.status,
  set: (v) => emit('update:status', v ?? ''),
})

const reviewStatusModel = computed({
  get: () => props.reviewStatus,
  set: (v) => emit('update:reviewStatus', v ?? ''),
})

function emitFilterChange() {
  emit('refresh')
}

function handleReset() {
  emit('update:status', '')
  emit('update:reviewStatus', '')
  emit('reset')
}

function isMine(row) {
  return Number(row?.borrowerId || 0) === Number(props.currentUserId || 0)
}

function canReview(row) {
  return props.isAdmin &&
    row?.status === 'requested' &&
    row?.reviewStatus === 'pending'
}

function canCancel(row) {
  return (props.isAdmin || isMine(row)) &&
    row?.status === 'requested' &&
    row?.reviewStatus === 'pending'
}

function canReturn(row) {
  return (props.isAdmin || isMine(row)) &&
    row?.status === 'borrowed'
}

const reviewDialog = reactive({
  visible: false,
  action: 'approve',
  row: null,
  form: {
    note: '',
    rejectReason: '',
  },
})

const reviewFormRef = ref(null)

const reviewRules = computed(() => ({
  rejectReason: reviewDialog.action === 'reject'
    ? [
        {
          required: true,
          message: tt('warehouse.borrowRecords.reviewDialog.rejectReasonRequired', '請輸入駁回原因'),
          trigger: 'blur',
        },
      ]
    : [],
}))

function openReviewDialog(row, action) {
  reviewDialog.row = row
  reviewDialog.action = action
  reviewDialog.form.note = ''
  reviewDialog.form.rejectReason = ''
  reviewDialog.visible = true
}

function resetReviewDialog() {
  reviewDialog.action = 'approve'
  reviewDialog.row = null
  reviewDialog.form.note = ''
  reviewDialog.form.rejectReason = ''
  reviewFormRef.value?.clearValidate?.()
}

async function submitReviewDialog() {
  await reviewFormRef.value?.validate?.()

  emit('review', {
    row: reviewDialog.row,
    id: reviewDialog.row?.id,
    action: reviewDialog.action,
    note: reviewDialog.form.note || '',
    rejectReason: reviewDialog.form.rejectReason || '',
  })

  reviewDialog.visible = false
}
</script>

<style scoped>
.records-card {
  border-radius: 12px;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.card-title {
  font-weight: 700;
}

.card-sub {
  display: flex;
  align-items: center;
  gap: 8px;
}

.pill {
  border-radius: 999px;
}

.filter-row {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  margin-bottom: 12px;
}

.ctrl-select {
  width: 180px;
}

.filter-spacer {
  flex: 1;
  min-width: 10px;
}

.records-table {
  width: 100%;
}

.item-cell {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.item-name {
  font-weight: 600;
}

.item-sub,
.subtext {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.review-note-cell {
  line-height: 1.5;
}

.danger-text {
  color: var(--el-color-danger);
}

.action-cell {
  display: inline-flex;
  gap: 8px;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
}

.pager {
  margin-top: 12px;
  display: flex;
  justify-content: flex-end;
}

@media (max-width: 768px) {
  .ctrl-select {
    width: 100%;
  }
}
</style>