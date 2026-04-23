import { nextTick, reactive, ref } from 'vue'
import { vi } from 'vitest'
import { useWarehouseRouteQuery } from '@/composables/useWarehouseRouteQuery'

async function flushRouteWatch() {
  await nextTick()
  await Promise.resolve()
  await nextTick()
}

function createHarness({ query = {} } = {}) {
  const route = reactive({ query })
  const router = {
    replace: vi.fn(async ({ query: nextQuery }) => {
      route.query = { ...nextQuery }
    }),
  }

  const filters = reactive({
    keyword: '',
    type: '',
    status: '',
  })

  const page = ref(1)
  const pageSize = ref(10)

  const fetchItems = vi.fn(async () => {})
  const patchFilters = vi.fn((payload) => {
    Object.assign(filters, payload)
  })

  const api = useWarehouseRouteQuery({
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

  return {
    route,
    router,
    filters,
    page,
    pageSize,
    fetchItems,
    patchFilters,
    ...api,
  }
}

describe('useWarehouseRouteQuery', () => {
  it('syncs initial state from route query', async () => {
    const h = createHarness({
      query: {
        keyword: 'ssd',
        type: 'part',
        status: 'normal',
        page: '2',
        pageSize: '25',
      },
    })

    await flushRouteWatch()

    expect(h.filters.keyword).toBe('ssd')
    expect(h.filters.type).toBe('part')
    expect(h.filters.status).toBe('normal')
    expect(h.page.value).toBe(2)
    expect(h.pageSize.value).toBe(25)
    expect(h.fetchItems).toHaveBeenCalledTimes(1)
  })

  it('handleSearchAndQuery preserves unrelated query keys and resets page', async () => {
    const h = createHarness({
      query: {
        tab: 'items',
        keyword: 'old',
        page: '3',
      },
    })

    await flushRouteWatch()
    h.router.replace.mockClear()
    h.fetchItems.mockClear()

    h.filters.keyword = 'new'
    await h.handleSearchAndQuery()
    await flushRouteWatch()

    expect(h.page.value).toBe(1)
    expect(h.router.replace).toHaveBeenCalledWith({
      query: {
        tab: 'items',
        keyword: 'new',
      },
    })
  })

  it('resetFiltersAndQuery clears managed query keys and keeps unrelated ones', async () => {
    const h = createHarness({
      query: {
        tab: 'items',
        keyword: 'ssd',
        type: 'tool',
        status: 'normal',
        page: '2',
      },
    })

    await flushRouteWatch()
    h.router.replace.mockClear()

    await h.resetFiltersAndQuery()
    await flushRouteWatch()

    expect(h.filters.keyword).toBe('')
    expect(h.filters.type).toBe('')
    expect(h.filters.status).toBe('')
    expect(h.page.value).toBe(1)

    expect(h.router.replace).toHaveBeenCalledWith({
      query: {
        tab: 'items',
      },
    })
  })
})