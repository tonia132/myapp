// frontend/src/composables/useWarehouseAdminItem.js
import { computed, reactive, ref, unref } from 'vue'
import { ElMessage } from 'element-plus'
import api from '@/api'

export function useWarehouseAdminItem(options = {}) {
  const {
    tt = (_key, fallback) => fallback,
    isAdmin = false,
    afterSuccess = null, // async function
  } = options

  const selectedItem = ref(null)

  const itemDlg = reactive({
    visible: false,
    loading: false,
    mode: 'create', // create | edit
  })

  const isEditing = computed(() => itemDlg.mode === 'edit')

  function openItemDialog(row = null) {
    if (!unref(isAdmin)) return false

    if (row?.id) {
      itemDlg.mode = 'edit'
      selectedItem.value = row
    } else {
      itemDlg.mode = 'create'
      selectedItem.value = null
    }

    itemDlg.visible = true
    return true
  }

  function closeItemDialog() {
    itemDlg.visible = false
  }

  function handleItemDialogClosed() {
    if (!itemDlg.loading) {
      selectedItem.value = null
    }
  }

  async function submitItemFromDialog(payload = {}) {
    if (!unref(isAdmin) || itemDlg.loading) return false

    itemDlg.loading = true
    try {
      if (itemDlg.mode === 'create') {
        await api.post('/warehouse/items', payload)
        ElMessage.success(
          tt('warehouse.messages.saveItemSuccessNew', '已新增品項')
        )
      } else {
        const id = selectedItem.value?.id
        if (!id) {
          throw new Error('missing item id')
        }

        await api.put(`/warehouse/items/${id}`, payload)
        ElMessage.success(
          tt('warehouse.messages.saveItemSuccessEdit', '已更新品項')
        )
      }

      itemDlg.visible = false
      selectedItem.value = null

      if (typeof afterSuccess === 'function') {
        await afterSuccess({
          mode: itemDlg.mode,
          item: selectedItem.value,
          payload,
        })
      }

      return true
    } catch (e) {
      console.error(e)
      ElMessage.error(
        e?.response?.data?.message ||
          tt('warehouse.messages.saveItemFailed', '儲存失敗')
      )
      return false
    } finally {
      itemDlg.loading = false
    }
  }

  function patchSelectedItem(nextItem) {
    selectedItem.value = nextItem || null
  }

  return {
    selectedItem,
    itemDlg,
    isEditing,

    openItemDialog,
    closeItemDialog,
    handleItemDialogClosed,
    submitItemFromDialog,
    patchSelectedItem,
  }
}