<template>
  <div class="warehouse-borrows-view">
    <WarehouseSectionHeader
      :title="tt('warehouse.nav.borrows', '借用紀錄')"
      :total-tag-text="borrowTotalTagText"
      total-tag-type="primary"
      :show-total-tag="borrowTotal > 0"
      :show-filtered="borrowFiltered"
      :filtered-text="tt('warehouse.filters.filtered', '已套用篩選')"
      :now-text="tt('warehouse.filters.now', `目前時間：${nowText}`, { time: nowText })"
    >
      <template #actions>
        <el-button :icon="Refresh" @click="fetchBorrowRecords" :loading="loadingBorrows">
          {{ tt('common.refresh', '重新整理') }}
        </el-button>
      </template>
    </WarehouseSectionHeader>

    <WarehouseBorrowScopeBar
      v-model:mineOnly="borrowMineOnly"
      :is-admin="isAdmin"
      :scope-title="tt('warehouse.borrowRecords.scopeTitle', '借用紀錄檢視範圍')"
      :scope-mine-only-text="tt('warehouse.borrowRecords.scopeMineOnly', '目前只顯示我的借用紀錄')"
      :scope-all-text="tt('warehouse.borrowRecords.scopeAll', '目前顯示全部借用紀錄')"
      :mine-only-on-text="tt('warehouse.borrowRecords.mineOnlyOn', '只看我的')"
      :mine-only-off-text="tt('warehouse.borrowRecords.mineOnlyOff', '看全部')"
      :mine-only-fixed-text="tt('warehouse.borrowRecords.mineOnlyFixed', '僅顯示我的借用')"
      @update:mineOnly="handleMineOnlyChangeAndQuery"
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
      @refresh="handleBorrowFilterChangeAndQuery"
      @reset="resetBorrowFiltersAndQuery"
      @page-change="handleBorrowPageChangeAndQuery"
      @cancel="cancelBorrow"
      @return="returnBorrow"
      @review="reviewBorrow"
    />
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Refresh } from '@element-plus/icons-vue'

import { useSafeI18n } from '@/composables/useSafeI18n'
import { useDateTimeText } from '@/composables/useDateTimeText'
import { useCurrentUser } from '@/composables/useCurrentUser'
import { useWarehouseBorrowRecords } from '@/composables/useWarehouseBorrowRecords'
import { useWarehouseBorrowRouteQuery } from '@/composables/useWarehouseBorrowRouteQuery'

import WarehouseSectionHeader from '@/components/warehouse/WarehouseSectionHeader.vue'
import WarehouseBorrowScopeBar from '@/components/warehouse/WarehouseBorrowScopeBar.vue'
import WarehouseBorrowRecords from '@/components/warehouse/WarehouseBorrowRecords.vue'

const { tt } = useSafeI18n()
const { formatNowText } = useDateTimeText()

const route = useRoute()
const router = useRouter()

const nowText = computed(() => formatNowText())

const { isAdmin, userId } = useCurrentUser()

const borrowMineOnly = ref(!isAdmin.value ? true : false)

const {
  borrowRows,
  borrowPage,
  borrowPageSize,
  borrowTotal,
  loadingBorrows,
  borrowActionLoading,
  borrowFilters,
  filtered: borrowFiltered,
  fetchBorrowRecords,
  patchBorrowFilters,
  cancelBorrow,
  returnBorrow,
  reviewBorrow,
} = useWarehouseBorrowRecords({
  tt,
  isAdmin,
  mineOnly: borrowMineOnly,
  initialPage: 1,
  initialPageSize: 10,
})

const {
  handleMineOnlyChangeAndQuery,
  handleBorrowFilterChangeAndQuery,
  handleBorrowPageChangeAndQuery,
  resetBorrowFiltersAndQuery,
} = useWarehouseBorrowRouteQuery({
  route,
  router,
  isAdmin,
  borrowMineOnly,
  borrowFilters,
  borrowPage,
  fetchBorrowRecords,
  patchBorrowFilters,
  defaultPage: 1,
})

const borrowTotalTagText = computed(() =>
  tt('warehouse.borrowRecords.totalTag', `共 ${borrowTotal.value} 筆`, {
    total: borrowTotal.value,
  })
)
</script>

<style scoped>
.warehouse-borrows-view {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
</style>