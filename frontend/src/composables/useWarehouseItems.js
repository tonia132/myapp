// frontend/src/composables/useWarehouseItems.js
import { computed, reactive, ref, unref } from 'vue'
import { ElMessage } from 'element-plus'
import api from '@/api'

export function useWarehouseItems(options = {}) {
  const {
    tt = (_key, fallback) => fallback,
    isAdmin = false,
    initialPage = 1,
    initialPageSize = 10,
    initialFilters = {},
  } = options

  const items = ref([])
  const page = ref(Number(initialPage) || 1)
  const pageSize = ref(Number(initialPageSize) || 10)
  const total = ref(0)
  const loadingItems = ref(false)

  const filters = reactive({
    keyword: initialFilters.keyword || '',
    type: initialFilters.type || '',
    status: initialFilters.status || '',
  })

  const filtered = computed(() => !!(filters.keyword || filters.type || filters.status))

  async function fetchItems() {
    loadingItems.value = true
    try {
      const { data } = await api.get('/warehouse/items', {
        params: {
          keyword: filters.keyword,
          type: filters.type,
          status: filters.status,
          page: page.value,
          pageSize: pageSize.value,
        },
      })

      const payload = data?.data || data
      items.value = Array.isArray(payload?.rows) ? payload.rows : []
      total.value = Number(payload?.count || items.value.length || 0)
    } catch (e) {
      console.error(e)
      ElMessage.error(
        e?.response?.data?.message ||
          tt('warehouse.messages.loadItemsFailed', '載入庫存失敗')
      )
    } finally {
      loadingItems.value = false
    }
  }

  function resetFilters() {
    filters.keyword = ''
    filters.type = ''
    filters.status = ''
    page.value = 1
    fetchItems()
  }

  function handleSearch() {
    page.value = 1
    fetchItems()
  }

  function handleFilterChange() {
    page.value = 1
    fetchItems()
  }

  function handlePageChange(p) {
    page.value = Number(p) || 1
    fetchItems()
  }

  async function deleteItem(row) {
    if (!unref(isAdmin) || !row?.id) return false

    try {
      await api.delete(`/warehouse/items/${row.id}`)
      ElMessage.success(tt('warehouse.messages.deleteItemSuccess', '已刪除'))
      await fetchItems()
      return true
    } catch (e) {
      console.error(e)
      ElMessage.error(
        e?.response?.data?.message ||
          tt('warehouse.messages.deleteItemFailed', '刪除失敗')
      )
      return false
    }
  }

  function setPageSize(size) {
    const n = Number(size)
    if (!Number.isFinite(n) || n <= 0) return
    pageSize.value = Math.floor(n)
    page.value = 1
  }

  function patchFilters(next = {}) {
    if (Object.prototype.hasOwnProperty.call(next, 'keyword')) {
      filters.keyword = next.keyword ?? ''
    }
    if (Object.prototype.hasOwnProperty.call(next, 'type')) {
      filters.type = next.type ?? ''
    }
    if (Object.prototype.hasOwnProperty.call(next, 'status')) {
      filters.status = next.status ?? ''
    }
  }

  function replaceItems(rows = [], count = null) {
    items.value = Array.isArray(rows) ? rows : []
    total.value = Number(count ?? items.value.length ?? 0)
  }

  return {
    items,
    page,
    pageSize,
    total,
    loadingItems,
    filters,
    filtered,

    fetchItems,
    resetFilters,
    handleSearch,
    handleFilterChange,
    handlePageChange,
    deleteItem,

    setPageSize,
    patchFilters,
    replaceItems,
  }
}