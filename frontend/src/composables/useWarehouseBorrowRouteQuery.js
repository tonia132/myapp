// frontend/src/composables/useWarehouseBorrowRouteQuery.js
import { unref, watch } from 'vue'
import {
  parseQueryText,
  parsePositiveInt,
  parseBoolFlag,
  sameQuery,
  mergeManagedQuery,
} from '@/composables/useRouteQueryState'

const BORROW_QUERY_KEYS = ['borrowStatus', 'reviewStatus', 'borrowPage', 'mineOnly']

export function useWarehouseBorrowRouteQuery({
  route,
  router,
  isAdmin,
  borrowMineOnly,
  borrowFilters,
  borrowPage,
  fetchBorrowRecords,
  patchBorrowFilters,
  defaultPage = 1,
}) {
  function isAdminNow() {
    return !!unref(isAdmin)
  }

  function readBorrowStateFromQuery(query = {}) {
    const admin = isAdminNow()
    const defaultMineOnly = admin ? false : true
    let mineOnly = parseBoolFlag(query.mineOnly, defaultMineOnly)

    if (!admin) mineOnly = true

    return {
      status: parseQueryText(query.borrowStatus),
      reviewStatus: parseQueryText(query.reviewStatus),
      page: parsePositiveInt(query.borrowPage, defaultPage),
      mineOnly,
    }
  }

  function buildBorrowQueryFromState(state = {}) {
    const admin = isAdminNow()
    const q = {}

    const status = String(state.status || '').trim()
    const reviewStatus = String(state.reviewStatus || '').trim()
    const pageNum = Number(state.page || defaultPage)
    const mineOnly = !!state.mineOnly

    if (status) q.borrowStatus = status
    if (reviewStatus) q.reviewStatus = reviewStatus
    if (pageNum > defaultPage) q.borrowPage = String(pageNum)

    if (admin && mineOnly) {
      q.mineOnly = '1'
    }

    return q
  }

  function currentBorrowUiState() {
    return {
      status: String(borrowFilters.status || '').trim(),
      reviewStatus: String(borrowFilters.reviewStatus || '').trim(),
      page: Number(unref(borrowPage) || defaultPage),
      mineOnly: isAdminNow() ? !!unref(borrowMineOnly) : true,
    }
  }

  async function syncBorrowStateFromRoute(query = {}) {
    const next = readBorrowStateFromQuery(query)

    patchBorrowFilters({
      status: next.status,
      reviewStatus: next.reviewStatus,
    })

    borrowPage.value = next.page
    borrowMineOnly.value = next.mineOnly

    await fetchBorrowRecords()
  }

  async function syncBorrowQueryFromUi(nextPartial = {}) {
    const nextState = {
      ...currentBorrowUiState(),
      ...nextPartial,
    }

    if (!isAdminNow()) {
      nextState.mineOnly = true
    }

    const nextManagedQuery = buildBorrowQueryFromState(nextState)
    const currentManagedQuery = buildBorrowQueryFromState(
      readBorrowStateFromQuery(route.query)
    )

    if (sameQuery(currentManagedQuery, nextManagedQuery)) {
      await fetchBorrowRecords()
      return
    }

    const mergedQuery = mergeManagedQuery(route.query, BORROW_QUERY_KEYS, nextManagedQuery)
    await router.replace({ query: mergedQuery })
  }

  function handleMineOnlyChangeAndQuery(nextMineOnly) {
    if (typeof nextMineOnly === 'boolean') {
      borrowMineOnly.value = nextMineOnly
    }

    borrowPage.value = defaultPage

    return syncBorrowQueryFromUi({
      mineOnly: borrowMineOnly.value,
      page: defaultPage,
    })
  }

  function handleBorrowFilterChangeAndQuery() {
    borrowPage.value = defaultPage
    return syncBorrowQueryFromUi({
      status: borrowFilters.status || '',
      reviewStatus: borrowFilters.reviewStatus || '',
      page: defaultPage,
    })
  }

  function handleBorrowPageChangeAndQuery(p) {
    borrowPage.value = Number(p) || defaultPage
    return syncBorrowQueryFromUi({
      page: borrowPage.value,
    })
  }

  function resetBorrowFiltersAndQuery() {
    patchBorrowFilters({
      status: '',
      reviewStatus: '',
    })

    borrowPage.value = defaultPage

    return syncBorrowQueryFromUi({
      status: '',
      reviewStatus: '',
      page: defaultPage,
    })
  }

  watch(
    () => route.query,
    async (query) => {
      await syncBorrowStateFromRoute(query)
    },
    { immediate: true }
  )

  return {
    readBorrowStateFromQuery,
    buildBorrowQueryFromState,
    currentBorrowUiState,
    syncBorrowStateFromRoute,
    syncBorrowQueryFromUi,
    handleMineOnlyChangeAndQuery,
    handleBorrowFilterChangeAndQuery,
    handleBorrowPageChangeAndQuery,
    resetBorrowFiltersAndQuery,
  }
}

export default useWarehouseBorrowRouteQuery