// frontend/src/composables/useWarehouseRouteQuery.js
import { unref, watch } from 'vue'
import {
  parseQueryText,
  parsePositiveInt,
  sameQuery,
  mergeManagedQuery,
} from '@/composables/useRouteQueryState'

const ITEM_QUERY_KEYS = ['keyword', 'type', 'status', 'page', 'pageSize']

export function useWarehouseRouteQuery({
  route,
  router,
  filters,
  page,
  pageSize,
  fetchItems,
  patchFilters,
  defaultPage = 1,
  defaultPageSize = 10,
}) {
  function readStateFromQuery(query = {}) {
    return {
      keyword: parseQueryText(query.keyword),
      type: parseQueryText(query.type),
      status: parseQueryText(query.status),
      page: parsePositiveInt(query.page, defaultPage),
      pageSize: parsePositiveInt(query.pageSize, defaultPageSize),
    }
  }

  function buildQueryFromState(state = {}) {
    const q = {}

    const keyword = String(state.keyword || '').trim()
    const type = String(state.type || '').trim()
    const status = String(state.status || '').trim()
    const pageNum = Number(state.page || defaultPage)
    const pageSizeNum = Number(state.pageSize || defaultPageSize)

    if (keyword) q.keyword = keyword
    if (type) q.type = type
    if (status) q.status = status
    if (pageNum > defaultPage) q.page = String(pageNum)
    if (pageSizeNum > 0 && pageSizeNum !== defaultPageSize) {
      q.pageSize = String(pageSizeNum)
    }

    return q
  }

  function currentUiState() {
    return {
      keyword: String(filters.keyword || '').trim(),
      type: String(filters.type || '').trim(),
      status: String(filters.status || '').trim(),
      page: Number(unref(page) || defaultPage),
      pageSize: Number(unref(pageSize) || defaultPageSize),
    }
  }

  async function syncStateFromRoute(query = {}) {
    const next = readStateFromQuery(query)

    patchFilters({
      keyword: next.keyword,
      type: next.type,
      status: next.status,
    })

    page.value = next.page

    if (pageSize && typeof pageSize === 'object' && 'value' in pageSize) {
      pageSize.value = next.pageSize
    }

    await fetchItems()
  }

  async function syncQueryFromUi(nextPartial = {}) {
    const nextState = {
      ...currentUiState(),
      ...nextPartial,
    }

    const nextManagedQuery = buildQueryFromState(nextState)
    const currentManagedQuery = buildQueryFromState(readStateFromQuery(route.query))

    if (sameQuery(currentManagedQuery, nextManagedQuery)) {
      await fetchItems()
      return
    }

    const mergedQuery = mergeManagedQuery(route.query, ITEM_QUERY_KEYS, nextManagedQuery)
    await router.replace({ query: mergedQuery })
  }

  function resetFiltersAndQuery() {
    patchFilters({
      keyword: '',
      type: '',
      status: '',
    })

    page.value = defaultPage

    if (pageSize && typeof pageSize === 'object' && 'value' in pageSize) {
      pageSize.value = defaultPageSize
    }

    return syncQueryFromUi({
      keyword: '',
      type: '',
      status: '',
      page: defaultPage,
      pageSize: defaultPageSize,
    })
  }

  function handleSearchAndQuery() {
    page.value = defaultPage
    return syncQueryFromUi({
      keyword: filters.keyword || '',
      type: filters.type || '',
      status: filters.status || '',
      page: defaultPage,
    })
  }

  function handleFilterChangeAndQuery() {
    page.value = defaultPage
    return syncQueryFromUi({
      keyword: filters.keyword || '',
      type: filters.type || '',
      status: filters.status || '',
      page: defaultPage,
    })
  }

  function handlePageChangeAndQuery(p) {
    page.value = Number(p) || defaultPage
    return syncQueryFromUi({
      page: page.value,
    })
  }

  function handlePageSizeChangeAndQuery(size) {
    if (!(pageSize && typeof pageSize === 'object' && 'value' in pageSize)) return
    pageSize.value = Number(size) || defaultPageSize
    page.value = defaultPage

    return syncQueryFromUi({
      page: defaultPage,
      pageSize: pageSize.value,
    })
  }

  watch(
    () => route.query,
    async (query) => {
      await syncStateFromRoute(query)
    },
    { immediate: true }
  )

  return {
    readStateFromQuery,
    buildQueryFromState,
    currentUiState,
    syncStateFromRoute,
    syncQueryFromUi,
    resetFiltersAndQuery,
    handleSearchAndQuery,
    handleFilterChangeAndQuery,
    handlePageChangeAndQuery,
    handlePageSizeChangeAndQuery,
  }
}

export default useWarehouseRouteQuery