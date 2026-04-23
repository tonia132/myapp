// frontend/src/composables/useWarehouseBorrowRecords.js
import { computed, reactive, ref, unref } from 'vue'
import { ElMessage } from 'element-plus'
import api from '@/api'

export function useWarehouseBorrowRecords(options = {}) {
  const {
    tt = (_key, fallback) => fallback,
    isAdmin = false,          // ref / computed / boolean 都可
    mineOnly = false,         // ref / computed / boolean 都可
    initialPage = 1,
    initialPageSize = 10,
    initialFilters = {},
    afterSuccess = null,      // async function
  } = options

  const borrowRows = ref([])
  const borrowPage = ref(Number(initialPage) || 1)
  const borrowPageSize = ref(Number(initialPageSize) || 10)
  const borrowTotal = ref(0)

  const loadingBorrows = ref(false)
  const borrowActionLoading = ref(false)

  const borrowFilters = reactive({
    status: initialFilters.status || '',
    reviewStatus: initialFilters.reviewStatus || '',
  })

  const filtered = computed(() => {
    return !!(borrowFilters.status || borrowFilters.reviewStatus)
  })

  const effectiveMineOnly = computed(() => {
    if (!unref(isAdmin)) return true
    return !!unref(mineOnly)
  })

  async function fetchBorrowRecords() {
    loadingBorrows.value = true
    try {
      const { data } = await api.get('/warehouse/borrow', {
        params: {
          mine: effectiveMineOnly.value ? 1 : 0,
          status: borrowFilters.status || '',
          reviewStatus: borrowFilters.reviewStatus || '',
          page: borrowPage.value,
          pageSize: borrowPageSize.value,
        },
      })

      const payload = data?.data || data
      borrowRows.value = Array.isArray(payload?.rows) ? payload.rows : []
      borrowTotal.value = Number(payload?.count || borrowRows.value.length || 0)
    } catch (e) {
      console.error(e)
      ElMessage.error(
        e?.response?.data?.message ||
          tt('warehouse.messages.loadBorrowsFailed', '載入借用紀錄失敗')
      )
    } finally {
      loadingBorrows.value = false
    }
  }

  function patchBorrowFilters(next = {}) {
    if (Object.prototype.hasOwnProperty.call(next, 'status')) {
      borrowFilters.status = next.status ?? ''
    }
    if (Object.prototype.hasOwnProperty.call(next, 'reviewStatus')) {
      borrowFilters.reviewStatus = next.reviewStatus ?? ''
    }
  }

  function resetBorrowFilters() {
    borrowFilters.status = ''
    borrowFilters.reviewStatus = ''
    borrowPage.value = 1
    fetchBorrowRecords()
  }

  function handleBorrowPageChange(p) {
    borrowPage.value = Number(p) || 1
    fetchBorrowRecords()
  }

  function handleBorrowPageSizeChange(size) {
    const n = Number(size)
    if (!Number.isFinite(n) || n <= 0) return
    borrowPageSize.value = Math.floor(n)
    borrowPage.value = 1
    fetchBorrowRecords()
  }

  function handleBorrowFilterChange() {
    borrowPage.value = 1
    fetchBorrowRecords()
  }

  async function runAfterSuccess(meta = {}) {
    if (typeof afterSuccess === 'function') {
      await afterSuccess(meta)
    }
  }

  async function cancelBorrow(row) {
    const id = row?.id
    if (!id || borrowActionLoading.value) return false

    borrowActionLoading.value = true
    try {
      await api.patch(`/warehouse/borrow/${id}/cancel`, {
        note: '',
      })

      ElMessage.success(
        tt('warehouse.messages.cancelBorrowSuccess', '已取消借用申請')
      )

      await fetchBorrowRecords()
      await runAfterSuccess({ type: 'cancel', row })
      return true
    } catch (e) {
      console.error(e)
      ElMessage.error(
        e?.response?.data?.message ||
          tt('warehouse.messages.cancelBorrowFailed', '取消借用失敗')
      )
      return false
    } finally {
      borrowActionLoading.value = false
    }
  }

  async function returnBorrow(row) {
    const id = row?.id
    if (!id || borrowActionLoading.value) return false

    borrowActionLoading.value = true
    try {
      await api.patch(`/warehouse/borrow/${id}/return`)

      ElMessage.success(
        tt('warehouse.messages.returnBorrowSuccess', '已標記歸還')
      )

      await fetchBorrowRecords()
      await runAfterSuccess({ type: 'return', row })
      return true
    } catch (e) {
      console.error(e)
      ElMessage.error(
        e?.response?.data?.message ||
          tt('warehouse.messages.returnBorrowFailed', '歸還失敗')
      )
      return false
    } finally {
      borrowActionLoading.value = false
    }
  }

  async function reviewBorrow(payload = {}) {
    const id = payload?.id || payload?.row?.id
    const action = String(payload?.action || '').trim().toLowerCase()
    const note = payload?.note || ''
    const rejectReason = payload?.rejectReason || ''

    if (!id || !['approve', 'reject'].includes(action) || borrowActionLoading.value) {
      return false
    }

    borrowActionLoading.value = true
    try {
      await api.patch(`/warehouse/borrow/${id}/review`, {
        action,
        note,
        rejectReason,
      })

      ElMessage.success(
        action === 'approve'
          ? tt('warehouse.messages.reviewApproveSuccess', '已核准借用')
          : tt('warehouse.messages.reviewRejectSuccess', '已駁回借用')
      )

      await fetchBorrowRecords()
      await runAfterSuccess({ type: 'review', action, payload })
      return true
    } catch (e) {
      console.error(e)
      ElMessage.error(
        e?.response?.data?.message ||
          tt('warehouse.messages.reviewBorrowFailed', '審核借用失敗')
      )
      return false
    } finally {
      borrowActionLoading.value = false
    }
  }

  function replaceBorrowRows(rows = [], count = null) {
    borrowRows.value = Array.isArray(rows) ? rows : []
    borrowTotal.value = Number(count ?? borrowRows.value.length ?? 0)
  }

  return {
    borrowRows,
    borrowPage,
    borrowPageSize,
    borrowTotal,
    loadingBorrows,
    borrowActionLoading,
    borrowFilters,
    filtered,
    effectiveMineOnly,

    fetchBorrowRecords,
    patchBorrowFilters,
    resetBorrowFilters,
    handleBorrowPageChange,
    handleBorrowPageSizeChange,
    handleBorrowFilterChange,

    cancelBorrow,
    returnBorrow,
    reviewBorrow,

    replaceBorrowRows,
  }
}