<template>
  <div class="warehouse-items-view">
    <div class="section-bar">
      <div class="section-left">
        <div class="section-title-wrap">
          <h3 class="section-title">{{ tt('warehouse.nav.items', '庫存清單') }}</h3>
          <div class="section-subline">
            <el-tag v-if="total > 0" type="success" effect="dark" class="pill">
              {{ tt('warehouse.header.totalTag', `共 ${total} 項（顯示 ${items.length} 項）`, { total, shown: items.length }) }}
            </el-tag>
            <el-tag v-if="filtered" effect="plain" class="pill muted">
              {{ tt('warehouse.filters.filtered', '已套用篩選') }}
            </el-tag>
            <span class="now-text">
              {{ tt('warehouse.filters.now', `目前時間：${nowText}`, { time: nowText }) }}
            </span>
          </div>
        </div>
      </div>

      <div class="section-right">
        <el-button-group>
          <el-button v-if="isAdmin" type="primary" :icon="Plus" @click="openItemDialog()">
            {{ tt('warehouse.actions.newItem', '新增品項') }}
          </el-button>
          <el-button :icon="Refresh" @click="fetchItems" :loading="loadingItems">
            {{ tt('common.refresh', '重新整理') }}
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
      :borrow-loading="borrowing.loading"
      :filtered="filtered"
      @page-change="handlePageChangeAndQuery"
      @borrow="openBorrow"
      @edit="openItemDialog"
      @delete="deleteItem"
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
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Plus, Refresh } from '@element-plus/icons-vue'

import { useSafeI18n } from '@/composables/useSafeI18n'
import { useDateTimeText } from '@/composables/useDateTimeText'
import { useCurrentUser } from '@/composables/useCurrentUser'
import { useResponsiveTableHeight } from '@/composables/useResponsiveTableHeight'
import { useWarehouseItems } from '@/composables/useWarehouseItems'
import { useWarehouseBorrow } from '@/composables/useWarehouseBorrow'
import { useWarehouseAdminItem } from '@/composables/useWarehouseAdminItem'
import { useWarehouseRouteQuery } from '@/composables/useWarehouseRouteQuery'

import WarehouseFilters from '@/components/warehouse/WarehouseFilters.vue'
import WarehouseTable from '@/components/warehouse/WarehouseTable.vue'
import WarehouseBorrowDialog from '@/components/warehouse/WarehouseBorrowDialog.vue'
import WarehouseItemDialog from '@/components/warehouse/WarehouseItemDialog.vue'

const { tt } = useSafeI18n()
const { formatNowText } = useDateTimeText()

const route = useRoute()
const router = useRouter()

const nowText = computed(() => formatNowText())

const { isAdmin } = useCurrentUser()

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
  borrowing,
  openBorrow,
  handleBorrowDialogClosed,
  submitBorrowFromDialog,
} = useWarehouseBorrow({
  tt,
  afterSuccess: async () => {
    await fetchItems()
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
    await fetchItems()
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
</script>

<style scoped>
.warehouse-items-view {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.section-bar {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.section-right {
  display: flex;
  align-items: center;
  justify-content: flex-end;
}

.section-title-wrap {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.section-title {
  margin: 0;
  font-size: 18px;
  font-weight: 700;
}

.section-subline {
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

.pill.muted {
  color: var(--el-text-color-regular);
}

@media (max-width: 960px) {
  .section-bar {
    flex-direction: column;
    align-items: stretch;
  }

  .section-right {
    justify-content: flex-end;
  }
}
</style>