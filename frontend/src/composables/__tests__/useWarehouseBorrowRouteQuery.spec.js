import { nextTick, reactive, ref } from 'vue'
import { vi } from 'vitest'
import { useWarehouseBorrowRouteQuery } from '@/composables/useWarehouseBorrowRouteQuery'

async function flushRouteWatch() {
  await nextTick()
  await Promise.resolve()
  await nextTick()
}

function createHarness({ query = {}, isAdminValue = true } = {}) {
  const route = reactive({ query })
  const router = {
    replace: vi.fn(async ({ query: nextQuery }) => {
      route.query = { ...nextQuery }
    }),
  }

  const isAdmin = ref(isAdminValue)
  const borrowMineOnly = ref(!isAdminValue ? true : false)
  const borrowFilters = reactive({
    status: '',
    reviewStatus: '',
  })
  const borrowPage = ref(1)

  const fetchBorrowRecords = vi.fn(async () => {})
  const patchBorrowFilters = vi.fn((payload) => {
    Object.assign(borrowFilters, payload)
  })

  const api = useWarehouseBorrowRouteQuery({
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

  return {
    route,
    router,
    isAdmin,
    borrowMineOnly,
    borrowFilters,
    borrowPage,
    fetchBorrowRecords,
    patchBorrowFilters,
    ...api,
  }
}

describe('useWarehouseBorrowRouteQuery', () => {
  it('syncs admin state from route query', async () => {
    const h = createHarness({
      isAdminValue: true,
      query: {
        borrowStatus: 'requested',
        reviewStatus: 'pending',
        borrowPage: '3',
        mineOnly: '1',
      },
    })

    await flushRouteWatch()

    expect(h.borrowFilters.status).toBe('requested')
    expect(h.borrowFilters.reviewStatus).toBe('pending')
    expect(h.borrowPage.value).toBe(3)
    expect(h.borrowMineOnly.value).toBe(true)
    expect(h.fetchBorrowRecords).toHaveBeenCalledTimes(1)
  })

  it('forces mineOnly=true for non-admin even if query says false', async () => {
    const h = createHarness({
      isAdminValue: false,
      query: {
        mineOnly: '0',
      },
    })

    await flushRouteWatch()

    expect(h.borrowMineOnly.value).toBe(true)
  })

  it('handleBorrowFilterChangeAndQuery preserves unrelated query keys', async () => {
    const h = createHarness({
      isAdminValue: true,
      query: {
        tab: 'borrows',
        borrowStatus: 'requested',
        borrowPage: '3',
      },
    })

    await flushRouteWatch()
    h.router.replace.mockClear()

    h.borrowFilters.status = 'returned'
    h.borrowFilters.reviewStatus = 'approved'

    await h.handleBorrowFilterChangeAndQuery()
    await flushRouteWatch()

    expect(h.borrowPage.value).toBe(1)
    expect(h.router.replace).toHaveBeenCalledWith({
      query: {
        tab: 'borrows',
        borrowStatus: 'returned',
        reviewStatus: 'approved',
      },
    })
  })

  it('handleMineOnlyChangeAndQuery removes mineOnly from query when admin turns it off', async () => {
    const h = createHarness({
      isAdminValue: true,
      query: {
        tab: 'borrows',
        mineOnly: '1',
      },
    })

    await flushRouteWatch()
    h.router.replace.mockClear()

    await h.handleMineOnlyChangeAndQuery(false)
    await flushRouteWatch()

    expect(h.borrowMineOnly.value).toBe(false)
    expect(h.router.replace).toHaveBeenCalledWith({
      query: {
        tab: 'borrows',
      },
    })
  })
})