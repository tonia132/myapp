<template>
  <div class="page warehouse-page">
    <div class="topbar">
      <div class="topbar-left">
        <div class="title-block">
          <h2 class="page-title">{{ t('warehouse.title') }}</h2>
          <div class="subline">
            <el-tag v-if="total > 0" type="success" effect="dark" class="pill">
              {{ tt('warehouse.header.totalTag', `共 ${total} 項（顯示 ${items.length} 項）`, { total, shown: items.length }) }}
            </el-tag>
            <span class="now-text">
              {{ tt('warehouse.filters.now', `目前時間：${nowText}`, { time: nowText }) }}
            </span>
          </div>
        </div>
      </div>

      <div class="topbar-right">
        <el-button-group>
          <el-button v-if="isAdmin" type="primary" :icon="Plus" @click="openItemDialog()">
            {{ tt('warehouse.actions.newItem', '新增品項') }}
          </el-button>
          <el-button :icon="Refresh" @click="refreshAll" :loading="refreshingAll">
            {{ t('common.refresh') }}
          </el-button>
        </el-button-group>
      </div>
    </div>

    <WarehouseFilters
      v-model:keyword="filters.keyword"
      v-model:type="filters.type"
      v-model:status="filters.status"
      @search="handleSearchAndQuery"
      @change="handleFilterChangeAndQuery"
      @reset="resetFiltersAndQuery"
    />

    <WarehouseTable
      :items="items"
      :loading="loadingItems"
      :page="page"
      :page-size="pageSize"
      :total="total"
      :table-height="tableHeight"
      :is-admin="isAdmin"
      :borrow-loading="borrowing.loading || borrowActionLoading"
      :filtered="filtered"
      @page-change="handlePageChangeAndQuery"
      @borrow="openBorrow"
      @edit="openItemDialog"
      @delete="deleteItemAndRefresh"
    />

    <WarehouseBorrowRecords
      :rows="borrowRows"
      :loading="loadingBorrows"
      :action-loading="borrowActionLoading"
      :page="borrowPage"
      :page-size="borrowPageSize"
      :total="borrowTotal"
      :is-admin="isAdmin"
      :current-user-id="userId"
      v-model:status="borrowFilters.status"
      v-model:reviewStatus="borrowFilters.reviewStatus"
      @refresh="handleBorrowFilterChange"
      @reset="resetBorrowFilters"
      @page-change="handleBorrowPageChange"
      @cancel="cancelBorrow"
      @return="returnBorrow"
      @review="reviewBorrow"
    />

    <WarehouseBorrowDialog
      v-model="borrowing.visible"
      :item="borrowing.item"
      :loading="borrowing.loading"
      @submit="submitBorrowFromDialog"
      @closed="handleBorrowDialogClosed"
    />

    <WarehouseItemDialog
      v-model="itemDlg.visible"
      :mode="itemDlg.mode"
      :item="selectedItem"
      :loading="itemDlg.loading"
      @submit="submitItemFromDialog"
      @closed="handleItemDialogClosed"
    />
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import dayjs from 'dayjs'
import { Plus, Refresh } from '@element-plus/icons-vue'

import { useCurrentUser } from '@/composables/useCurrentUser'
import { useResponsiveTableHeight } from '@/composables/useResponsiveTableHeight'
import { useWarehouseItems } from '@/composables/useWarehouseItems'
import { useWarehouseBorrow } from '@/composables/useWarehouseBorrow'
import { useWarehouseAdminItem } from '@/composables/useWarehouseAdminItem'
import { useWarehouseRouteQuery } from '@/composables/useWarehouseRouteQuery'
import { useWarehouseBorrowRecords } from '@/composables/useWarehouseBorrowRecords'

import WarehouseFilters from '@/components/warehouse/WarehouseFilters.vue'
import WarehouseTable from '@/components/warehouse/WarehouseTable.vue'
import WarehouseBorrowDialog from '@/components/warehouse/WarehouseBorrowDialog.vue'
import WarehouseItemDialog from '@/components/warehouse/WarehouseItemDialog.vue'
import WarehouseBorrowRecords from '@/components/warehouse/WarehouseBorrowRecords.vue'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()

function tt(key, fallback, params) {
  const v = t(key, params || {})
  return v === key ? fallback : v
}

const nowText = computed(() => dayjs().format('YYYY-MM-DD HH:mm'))
const refreshingAll = ref(false)

const { isAdmin, userId } = useCurrentUser()

const { tableHeight } = useResponsiveTableHeight({
  offset: 360,
  minHeight: 360,
  fallbackHeight: 900,
  initialHeight: 520,
})

const {
  items,
  page,
  pageSize,
  total,
  loadingItems,
  filters,
  filtered,
  fetchItems,
  deleteItem,
  patchFilters,
} = useWarehouseItems({
  tt,
  isAdmin,
  initialPage: 1,
  initialPageSize: 10,
})

const {
  borrowRows,
  borrowPage,
  borrowPageSize,
  borrowTotal,
  loadingBorrows,
  borrowActionLoading,
  borrowFilters,
  fetchBorrowRecords,
  resetBorrowFilters,
  handleBorrowPageChange,
  handleBorrowFilterChange,
  cancelBorrow,
  returnBorrow,
  reviewBorrow,
} = useWarehouseBorrowRecords({
  tt,
  isAdmin,
  mineOnly: false,
  afterSuccess: async () => {
    await fetchItems()
  },
})

const {
  borrowing,
  openBorrow,
  handleBorrowDialogClosed,
  submitBorrowFromDialog,
} = useWarehouseBorrow({
  tt,
  afterSuccess: async () => {
    await Promise.all([fetchItems(), fetchBorrowRecords()])
  },
})

const {
  selectedItem,
  itemDlg,
  openItemDialog,
  handleItemDialogClosed,
  submitItemFromDialog,
} = useWarehouseAdminItem({
  tt,
  isAdmin,
  afterSuccess: async () => {
    await Promise.all([fetchItems(), fetchBorrowRecords()])
  },
})

const {
  resetFiltersAndQuery,
  handleSearchAndQuery,
  handleFilterChangeAndQuery,
  handlePageChangeAndQuery,
} = useWarehouseRouteQuery({
  route,
  router,
  filters,
  page,
  pageSize,
  fetchItems,
  patchFilters,
  defaultPage: 1,
  defaultPageSize: 10,
})

async function refreshAll() {
  if (refreshingAll.value) return
  refreshingAll.value = true
  try {
    await Promise.all([fetchItems(), fetchBorrowRecords()])
  } finally {
    refreshingAll.value = false
  }
}

async function deleteItemAndRefresh(row) {
  const ok = await deleteItem(row)
  if (ok) {
    await fetchBorrowRecords()
  }
}

onMounted(() => {
  fetchBorrowRecords()
})
</script>

<style scoped>
.warehouse-page {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.topbar {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.title-block {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.page-title {
  margin: 0;
  font-size: 20px;
  font-weight: 700;
  letter-spacing: 0.2px;
}

.subline {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.now-text {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.pill {
  border-radius: 999px;
}

@media (max-width: 960px) {
  .topbar {
    flex-direction: column;
    align-items: stretch;
  }

  .topbar-right {
    display: flex;
    justify-content: flex-end;
  }
}
</style>