// frontend/src/composables/useWarehouseBorrow.js
import { reactive, unref } from 'vue'
import { ElMessage } from 'element-plus'
import api from '@/api'

export function useWarehouseBorrow(options = {}) {
  const {
    tt = (_key, fallback) => fallback,
    afterSuccess = null, // 可傳 function 或 async function
  } = options

  const borrowing = reactive({
    visible: false,
    loading: false,
    item: null,
  })

  function openBorrow(item) {
    if (!item) return false
    if (Number(item.currentQty || 0) <= 0) return false

    if (String(item.status || '').toLowerCase() === 'disabled_scrap') {
      ElMessage.warning(
        tt('warehouse.messages.disabledScrapCannotBorrow', '此品項為停用/報廢，無法借用')
      )
      return false
    }

    borrowing.item = item
    borrowing.visible = true
    return true
  }

  function closeBorrow() {
    borrowing.visible = false
  }

  function handleBorrowDialogClosed() {
    borrowing.item = null
  }

  async function submitBorrowFromDialog(payload = {}) {
    if (!borrowing.item || borrowing.loading) return false

    borrowing.loading = true
    try {
      await api.post('/warehouse/borrow', {
        itemId: borrowing.item.id,
        quantity: Number(payload.quantity || 1),
        purpose: payload.purpose || '',
        expectedReturnAt: payload.expectedReturnAt || null,
        remark: payload.remark || '',
      })

      ElMessage.success(
        tt('warehouse.messages.borrowSuccess', '借用申請已送出')
      )

      borrowing.visible = false

      if (typeof afterSuccess === 'function') {
        await afterSuccess({
          item: borrowing.item,
          payload,
        })
      }

      return true
    } catch (e) {
      console.error(e)
      ElMessage.error(
        e?.response?.data?.message ||
          tt('warehouse.messages.borrowFailed', '借用失敗')
      )
      return false
    } finally {
      borrowing.loading = false
    }
  }

  function patchBorrowItem(nextItem) {
    borrowing.item = nextItem || null
  }

  function isBorrowDisabled(item = borrowing.item) {
    if (!item) return true
    if (String(item.status || '').toLowerCase() === 'disabled_scrap') return true
    return Number(item.currentQty || 0) <= 0
  }

  return {
    borrowing,
    openBorrow,
    closeBorrow,
    handleBorrowDialogClosed,
    submitBorrowFromDialog,
    patchBorrowItem,
    isBorrowDisabled,
  }
}