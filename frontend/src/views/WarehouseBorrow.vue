<!-- frontend/src/views/WarehouseBorrow.vue -->
<template>
  <div class="page warehouse-borrow">
    <!-- 頂部工具列 -->
    <div class="header-bar">
      <div class="left">
        <h2>{{ t('warehouseBorrow.title') }}</h2>
        <el-tag type="info" effect="dark" v-if="rows.length">
          {{
            t('warehouseBorrow.tagSummary', {
              count: rows.length,
              page,
              pages: totalPages
            })
          }}
        </el-tag>
      </div>

      <div class="actions">
        <!-- 只看我的 / 全部（僅 admin） -->
        <el-radio-group v-model="mineFlag" size="small" @change="onFilterChange">
          <el-radio-button label="mine">
            {{ t('warehouseBorrow.filter.mine') }}
          </el-radio-button>
          <el-radio-button v-if="isAdmin" label="all">
            {{ t('warehouseBorrow.filter.all') }}
          </el-radio-button>
        </el-radio-group>

        <!-- 狀態 -->
        <el-select
          v-model="status"
          size="small"
          :placeholder="t('warehouseBorrow.filter.statusPlaceholder')"
          clearable
          style="width: 160px"
          @change="onFilterChange"
        >
          <el-option :label="t('warehouseBorrow.filter.statusAll')" value="" />
          <el-option :label="t('warehouseBorrow.filter.statusRequested')" value="requested" />
          <el-option :label="t('warehouseBorrow.filter.statusBorrowed')" value="borrowed" />
          <el-option :label="t('warehouseBorrow.filter.statusReturned')" value="returned" />
          <el-option :label="t('warehouseBorrow.filter.statusCanceled')" value="canceled" />
          <el-option :label="t('warehouseBorrow.filter.statusRejected')" value="rejected" />
        </el-select>

        <el-button :icon="Refresh" @click="fetchRows" :loading="loading">
          {{ t('common.refresh') }}
        </el-button>
      </div>
    </div>

    <!-- 資料表 -->
    <el-table
      :data="rows"
      v-loading="loading"
      border
      stripe
      style="width: 100%"
      size="small"
      :empty-text="t('common.noData')"
    >
      <el-table-column
        prop="item.name"
        :label="t('warehouseBorrow.table.columns.itemName')"
        min-width="180"
        show-overflow-tooltip
      >
        <template #default="{ row }">
          {{ row.item?.name || '—' }}
        </template>
      </el-table-column>

      <el-table-column
        prop="item.code"
        :label="t('warehouseBorrow.table.columns.itemCode')"
        width="150"
        show-overflow-tooltip
      >
        <template #default="{ row }">
          {{ row.item?.code || '—' }}
        </template>
      </el-table-column>

      <el-table-column
        prop="quantity"
        :label="t('warehouseBorrow.table.columns.quantity')"
        width="80"
        align="right"
      />

      <el-table-column
        prop="borrower"
        :label="t('warehouseBorrow.table.columns.borrower')"
        width="140"
      >
        <template #default="{ row }">
          {{ row.borrower?.name || row.borrower?.username || '—' }}
        </template>
      </el-table-column>

      <el-table-column
        prop="purpose"
        :label="t('warehouseBorrow.table.columns.purpose')"
        min-width="200"
        show-overflow-tooltip
      />

      <el-table-column
        prop="expectedReturnAt"
        :label="t('warehouseBorrow.table.columns.expectedReturnAt')"
        width="150"
      >
        <template #default="{ row }">
          {{ formatDate(row.expectedReturnAt) }}
        </template>
      </el-table-column>

      <el-table-column
        prop="borrowedAt"
        :label="t('warehouseBorrow.table.columns.borrowedAt')"
        width="170"
      >
        <template #default="{ row }">
          {{ formatDateTime(row.borrowedAt) }}
        </template>
      </el-table-column>

      <el-table-column
        prop="returnedAt"
        :label="t('warehouseBorrow.table.columns.returnedAt')"
        width="170"
      >
        <template #default="{ row }">
          {{
            row.status === 'returned'
              ? formatDateTime(row.returnedAt)
              : '—'
          }}
        </template>
      </el-table-column>

      <el-table-column
        prop="status"
        :label="t('warehouseBorrow.table.columns.status')"
        width="150"
      >
        <template #default="{ row }">
          <!-- ✅ 兼容舊資料：reviewStatus=approved 但 status=requested 視為 borrowed -->
          <el-tag
            v-if="row.status === 'borrowed' || (row.status === 'requested' && row.reviewStatus === 'approved')"
            type="warning"
            effect="dark"
          >
            {{ t('warehouseBorrow.table.statusText.borrowed') }}
          </el-tag>

          <el-tag
            v-else-if="row.status === 'requested'"
            type="info"
            effect="dark"
          >
            {{ t('warehouseBorrow.table.statusText.requested') }}
          </el-tag>

          <el-tag
            v-else-if="row.status === 'returned'"
            type="success"
            effect="dark"
          >
            {{ t('warehouseBorrow.table.statusText.returned') }}
          </el-tag>

          <el-tag
            v-else-if="row.status === 'canceled'"
            effect="dark"
          >
            {{ t('warehouseBorrow.table.statusText.canceled') }}
          </el-tag>

          <el-tag
            v-else-if="row.status === 'rejected'"
            type="danger"
            effect="dark"
          >
            {{ t('warehouseBorrow.table.statusText.rejected') }}
          </el-tag>

          <el-tag v-else>
            {{ t('warehouseBorrow.table.statusText.unknown') }}
          </el-tag>

          <!-- （可選）顯示審核狀態小字，方便 admin 看 -->
          <div
            v-if="row.reviewStatus"
            style="font-size: 12px; opacity: 0.7; margin-top: 2px;"
          >
            {{
              t(
                `warehouseBorrow.table.reviewStatusText.${row.reviewStatus}`,
                row.reviewStatus
              )
            }}
          </div>
        </template>
      </el-table-column>

      <el-table-column :label="t('common.actions')" width="120" fixed="right">
        <template #default="{ row }">
          <el-button
            v-if="canMarkReturn(row)"
            size="small"
            type="success"
            plain
            :icon="Check"
            :loading="row._saving"
            @click="markReturned(row)"
          >
            {{ t('warehouseBorrow.actions.markReturn') }}
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- 分頁 -->
    <div class="pager">
      <el-pagination
        background
        layout="total, prev, pager, next, jumper"
        :total="total"
        :page-size="pageSize"
        :current-page="page"
        @current-change="onPageChange"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Refresh, Check } from '@element-plus/icons-vue'
import api from '@/api'

const { t } = useI18n()

// 目前登入者
let currentUser = null
try {
  currentUser =
    JSON.parse(
      localStorage.getItem('user') ||
        sessionStorage.getItem('user') ||
        'null'
    ) || null
} catch {
  currentUser = null
}

const isAdmin = computed(
  () => String(currentUser?.role || '').toLowerCase() === 'admin'
)

const loading = ref(false)
const rows = ref([])
const page = ref(1)
const pageSize = ref(20)
const total = ref(0)

const mineFlag = ref('mine') // 'mine' | 'all'
const status = ref('') // '', 'requested', 'borrowed', 'returned', 'canceled', 'rejected'

const totalPages = computed(() =>
  pageSize.value ? Math.ceil(total.value / pageSize.value) || 1 : 1
)

function formatDate (val) {
  if (!val) return '—'
  const d = new Date(val)
  if (Number.isNaN(d.getTime())) return '—'
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function formatDateTime (val) {
  if (!val) return '—'
  const d = new Date(val)
  if (Number.isNaN(d.getTime())) return '—'
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  return `${y}-${m}-${day} ${hh}:${mm}`
}

async function fetchRows () {
  loading.value = true
  try {
    const params = {
      page: page.value,
      pageSize: pageSize.value
    }

    // mine=1 時，後端只給自己；admin + all → 不帶 mine 參數
    if (mineFlag.value === 'mine' || !isAdmin.value) {
      params.mine = 1
    }
    if (status.value) {
      params.status = status.value
    }

    const { data } = await api.get('/warehouse/borrow', { params })
    const d = data?.data || data
    rows.value = Array.isArray(d?.rows) ? d.rows : []
    total.value = Number(d?.count || 0)
  } catch (e) {
    console.error(e)
    ElMessage.error(
      e?.response?.data?.message || t('warehouseBorrow.messages.loadFailed')
    )
  } finally {
    loading.value = false
  }
}

function onFilterChange () {
  page.value = 1
  fetchRows()
}

function onPageChange (p) {
  page.value = p
  fetchRows()
}

function isEffectivelyBorrowed (row) {
  // ✅ 兼容舊資料：reviewStatus=approved 但 status=requested 視為 borrowed
  if (!row) return false
  if (row.status === 'borrowed') return true
  return row.status === 'requested' && row.reviewStatus === 'approved'
}

function canMarkReturn (row) {
  if (!isEffectivelyBorrowed(row)) return false
  if (!currentUser?.id) return false
  // admin 或 借用本人 才能標記歸還
  return (
    isAdmin.value ||
    Number(row.borrowerId) === Number(currentUser.id) ||
    Number(row.borrower?.id) === Number(currentUser.id)
  )
}

async function markReturned (row) {
  if (!canMarkReturn(row)) return
  await ElMessageBox.confirm(
    t('warehouseBorrow.confirm.markReturn', {
      name: row.item?.name || t('warehouseBorrow.table.fallbackItemName'),
      qty: row.quantity
    }),
    t('common.confirm'),
    { type: 'warning' }
  )
  row._saving = true
  try {
    await api.patch(`/warehouse/borrow/${row.id}/return`)
    ElMessage.success(t('warehouseBorrow.messages.markReturnSuccess'))
    fetchRows()
  } catch (e) {
    console.error(e)
    ElMessage.error(
      e?.response?.data?.message ||
        t('warehouseBorrow.messages.markReturnFailed')
    )
  } finally {
    row._saving = false
  }
}

onMounted(fetchRows)
</script>

<style scoped>
.warehouse-borrow .header-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}
.warehouse-borrow .header-bar .left {
  display: flex;
  align-items: center;
  gap: 8px;
}
.warehouse-borrow .actions {
  display: flex;
  gap: 8px;
  align-items: center;
}
.pager {
  display: flex;
  justify-content: flex-end;
  margin-top: 8px;
}
</style>