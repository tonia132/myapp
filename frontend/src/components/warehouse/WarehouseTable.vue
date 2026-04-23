<template>
  <el-card shadow="never" class="table-card">
    <template #header>
      <div class="card-header">
        <div class="card-title">{{ tt('warehouse.stock.title', '庫存清單') }}</div>
        <div class="card-sub">
          <el-tag
            v-if="filtered"
            size="small"
            effect="plain"
            class="pill muted"
          >
            {{ tt('warehouse.filters.filtered', '已套用篩選') }}
          </el-tag>
        </div>
      </div>
    </template>

    <el-table
      :data="items"
      v-loading="loading"
      class="warehouse-table"
      :height="tableHeight"
      :empty-text="tt('common.noData', '目前沒有資料')"
      :row-class-name="rowClassName"
    >
      <el-table-column :label="tt('warehouse.stock.columns.image', '圖片')" width="92" align="center">
        <template #default="{ row }">
          <div class="thumb-wrap">
            <template v-if="rowImageFiles(row).length">
              <el-image
                :src="rowCoverSrc(row)"
                fit="cover"
                class="thumb"
                :preview-src-list="rowPreviewSrcList(row)"
                preview-teleported
              />
              <div v-if="rowExtraImageCount(row) > 0" class="thumb-badge">
                +{{ rowExtraImageCount(row) }}
              </div>
            </template>
            <div v-else class="thumb-empty">—</div>
          </div>
        </template>
      </el-table-column>

      <el-table-column prop="type" :label="tt('warehouse.stock.columns.type', '類別')" width="96">
        <template #default="{ row }">
          <el-tag size="small" effect="plain" class="pill">
            {{ renderTypeLabel(row.type) }}
          </el-tag>
        </template>
      </el-table-column>

      <el-table-column
        prop="name"
        :label="tt('warehouse.stock.columns.name', '品名')"
        min-width="180"
        show-overflow-tooltip
      />
      <el-table-column
        prop="code"
        :label="tt('warehouse.stock.columns.code', '料號 / 資產編號')"
        min-width="160"
        show-overflow-tooltip
      />
      <el-table-column
        prop="location"
        :label="tt('warehouse.stock.columns.location', '位置')"
        min-width="140"
        show-overflow-tooltip
      />

      <el-table-column
        prop="totalQty"
        :label="tt('warehouse.stock.columns.totalQty', '總數量')"
        width="90"
        align="right"
      />

      <el-table-column
        prop="currentQty"
        :label="tt('warehouse.stock.columns.currentQty', '可借')"
        width="80"
        align="right"
      >
        <template #default="{ row }">
          <span :class="qtyClass(row)">{{ row.currentQty }}</span>
        </template>
      </el-table-column>

      <el-table-column
        prop="hasPeripheral"
        :label="tt('warehouse.stock.columns.hasPeripheral', '周邊')"
        width="90"
        align="center"
      >
        <template #default="{ row }">
          <el-tag v-if="row.hasPeripheral" size="small" type="success" effect="plain" class="pill">
            {{ tt('warehouse.stock.peripheralYes', '有') }}
          </el-tag>
          <el-tag v-else size="small" type="info" effect="plain" class="pill">
            {{ tt('warehouse.stock.peripheralNo', '無') }}
          </el-tag>
        </template>
      </el-table-column>

      <el-table-column prop="os" :label="tt('warehouse.stock.columns.os', 'OS')" width="90" align="center">
        <template #default="{ row }">
          <span class="mono">{{ row.os || '—' }}</span>
        </template>
      </el-table-column>

      <el-table-column prop="status" :label="tt('warehouse.stock.columns.status', '狀態')" width="120">
        <template #default="{ row }">
          <el-tag
            size="small"
            class="pill"
            :type="getStockStatusTagType(row.status)"
            :effect="getStockStatusTagEffect(row.status)"
          >
            {{ renderStockStatusLabel(row.status) }}
          </el-tag>
        </template>
      </el-table-column>

      <el-table-column
        prop="remark"
        :label="tt('warehouse.stock.columns.remark', '備註')"
        min-width="220"
        show-overflow-tooltip
      />

      <el-table-column :label="tt('common.actions', '操作')" width="220" fixed="right" align="center">
        <template #default="{ row }">
          <div class="action-cell">
            <el-tooltip
              :disabled="!(row.currentQty <= 0 || isDisabledScrap(row.status))"
              :content="isDisabledScrap(row.status)
                ? tt('warehouse.messages.disabledScrapCannotBorrow', '此品項為停用/報廢，無法借用')
                : tt('warehouse.messages.noStock', '可借數量不足')"
              placement="top"
            >
              <span>
                <el-button
                  type="primary"
                  size="small"
                  :icon="Tickets"
                  plain
                  :disabled="row.currentQty <= 0 || isDisabledScrap(row.status) || borrowLoading"
                  @click="emit('borrow', row)"
                >
                  {{ tt('warehouse.stock.borrowButton', '借用') }}
                </el-button>
              </span>
            </el-tooltip>

            <template v-if="isAdmin">
              <el-button size="small" :icon="Edit" @click="emit('edit', row)">
                {{ tt('common.edit', '編輯') }}
              </el-button>

              <el-popconfirm
                :title="tt('warehouse.stock.deleteConfirm', '確定要刪除這個品項？')"
                @confirm="emit('delete', row)"
              >
                <template #reference>
                  <el-button type="danger" size="small" plain :icon="Delete">
                    {{ tt('common.delete', '刪除') }}
                  </el-button>
                </template>
              </el-popconfirm>
            </template>
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
        @current-change="handlePageChange"
      />
    </div>
  </el-card>
</template>

<script setup>
import { computed, watch } from 'vue'
import { Tickets, Edit, Delete } from '@element-plus/icons-vue'
import { useWarehouseMeta } from '@/composables/useWarehouseMeta'
import { useFilePreviewMap } from '@/composables/useFilePreviewMap'
import { useWarehouseItemImages } from '@/composables/useWarehouseItemImages'
import { useSafeI18n } from '@/composables/useSafeI18n'

const props = defineProps({
  items: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
  page: { type: Number, default: 1 },
  pageSize: { type: Number, default: 10 },
  total: { type: Number, default: 0 },
  tableHeight: { type: Number, default: 520 },
  isAdmin: { type: Boolean, default: false },
  borrowLoading: { type: Boolean, default: false },
  filtered: { type: Boolean, default: false },
})

const emit = defineEmits([
  'page-change',
  'borrow',
  'edit',
  'delete',
])

const { tt } = useSafeI18n()

const {
  renderTypeLabel,
  renderStockStatusLabel,
  getStockStatusTagType,
  getStockStatusTagEffect,
  isDisabledScrap,
} = useWarehouseMeta()

const {
  resolvePreview: filePreviewSrc,
  previewSrcList,
  refreshPreviews,
  makeToken,
} = useFilePreviewMap()

const {
  getWarehouseItemImageFiles,
} = useWarehouseItemImages()

function handlePageChange(p) {
  emit('page-change', p)
}

function qtyClass(row = {}) {
  const qty = Number(row.currentQty || 0)
  return qty <= 0 ? 'qty-out' : 'qty-ok'
}

function rowClassName({ row }) {
  if (isDisabledScrap(row?.status)) return 'row-disabled'
  if (Number(row?.currentQty || 0) <= 0) return 'row-out'
  return ''
}

function rowImageFiles(row) {
  return getWarehouseItemImageFiles(row)
}

function collectPreviewFiles() {
  return props.items.flatMap(row => rowImageFiles(row))
}

function rowCoverSrc(row) {
  const files = rowImageFiles(row)
  return files.length ? filePreviewSrc(files[0]) : ''
}

function rowPreviewSrcList(row) {
  return previewSrcList(rowImageFiles(row))
}

function rowExtraImageCount(row) {
  return Math.max(0, rowImageFiles(row).length - 1)
}

const previewWatchToken = computed(() => makeToken(collectPreviewFiles()))

watch(
  previewWatchToken,
  () => {
    refreshPreviews(collectPreviewFiles())
  },
  { immediate: true }
)
</script>

<style scoped>
.table-card {
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

.pill.muted {
  color: var(--el-text-color-regular);
}

.warehouse-table {
  width: 100%;
}

.mono {
  font-variant-numeric: tabular-nums;
}

:deep(.warehouse-table .el-table__header-wrapper th) {
  background: var(--el-fill-color-light);
  font-weight: 700;
}

:deep(.warehouse-table .el-table__row.row-disabled) {
  opacity: 0.75;
}

:deep(.warehouse-table .el-table__row.row-out) {
  background: rgba(245, 108, 108, 0.05);
}

.qty-ok {
  color: var(--el-color-success);
  font-weight: 700;
}

.qty-out {
  color: var(--el-color-danger);
  font-weight: 700;
}

.thumb-wrap {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.thumb {
  width: 44px;
  height: 44px;
  border-radius: 10px;
  overflow: hidden;
  box-shadow: var(--el-box-shadow-lighter);
  background: var(--el-fill-color-light);
}

.thumb-empty {
  width: 44px;
  height: 44px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--el-fill-color-light);
  color: var(--el-text-color-placeholder);
}

.thumb-badge {
  position: absolute;
  right: -6px;
  bottom: -6px;
  font-size: 11px;
  padding: 1px 6px;
  border-radius: 999px;
  background: var(--el-color-primary);
  color: #fff;
  box-shadow: var(--el-box-shadow-lighter);
}

.action-cell {
  display: inline-flex;
  gap: 8px;
  align-items: center;
  justify-content: center;
  flex-wrap: nowrap;
}

.pager {
  margin-top: 10px;
  display: flex;
  justify-content: flex-end;
}
</style>