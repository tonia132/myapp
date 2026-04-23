import { defineComponent, h, nextTick, reactive, ref } from 'vue'
import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const stores = vi.hoisted(() => ({
  route: null,
  router: null,
  currentUser: null,
  borrowRecordsComposable: null,
  borrowRouteQueryComposable: null,
}))

stores.route = reactive({ query: {} })
stores.router = {
  replace: vi.fn(),
}

stores.currentUser = {
  isAdmin: ref(true),
  userId: ref(7),
}

stores.borrowRecordsComposable = {
  borrowRows: ref([{ id: 1, status: 'requested' }]),
  borrowPage: ref(1),
  borrowPageSize: ref(10),
  borrowTotal: ref(1),
  loadingBorrows: ref(false),
  borrowActionLoading: ref(false),
  borrowFilters: reactive({
    status: '',
    reviewStatus: '',
  }),
  filtered: ref(false),
  fetchBorrowRecords: vi.fn(async () => {}),
  patchBorrowFilters: vi.fn((payload) => {
    Object.assign(stores.borrowRecordsComposable.borrowFilters, payload)
  }),
  cancelBorrow: vi.fn(),
  returnBorrow: vi.fn(),
  reviewBorrow: vi.fn(),
}

stores.borrowRouteQueryComposable = {
  handleMineOnlyChangeAndQuery: vi.fn(),
  handleBorrowFilterChangeAndQuery: vi.fn(),
  handleBorrowPageChangeAndQuery: vi.fn(),
  resetBorrowFiltersAndQuery: vi.fn(),
}

vi.mock('vue-router', () => ({
  useRoute: () => stores.route,
  useRouter: () => stores.router,
}))

vi.mock('@/composables/useSafeI18n', () => ({
  useSafeI18n: () => ({
    tt: (_key, fallback) => fallback ?? _key,
  }),
}))

vi.mock('@/composables/useDateTimeText', () => ({
  useDateTimeText: () => ({
    formatNowText: () => '2026-04-22 09:30',
  }),
}))

vi.mock('@/composables/useCurrentUser', () => ({
  useCurrentUser: () => stores.currentUser,
}))

vi.mock('@/composables/useWarehouseBorrowRecords', () => ({
  useWarehouseBorrowRecords: () => stores.borrowRecordsComposable,
}))

vi.mock('@/composables/useWarehouseBorrowRouteQuery', () => ({
  useWarehouseBorrowRouteQuery: () => stores.borrowRouteQueryComposable,
}))

const WarehouseSectionHeaderStub = defineComponent({
  name: 'WarehouseSectionHeader',
  props: {
    title: { type: String, default: '' },
  },
  setup(props, { slots }) {
    return () =>
      h('div', { 'data-test': 'warehouse-section-header' }, [
        h('h3', props.title),
        h('div', { 'data-test': 'header-actions' }, slots.actions?.()),
      ])
  },
})

const WarehouseBorrowScopeBarStub = defineComponent({
  name: 'WarehouseBorrowScopeBar',
  props: {
    isAdmin: { type: Boolean, default: false },
    mineOnly: { type: Boolean, default: false },
  },
  emits: ['update:mineOnly'],
  setup(props, { emit }) {
    return () =>
      h('div', { 'data-test': 'warehouse-borrow-scope-bar' }, [
        props.isAdmin
          ? h(
              'button',
              {
                type: 'button',
                'data-test': 'scope-toggle',
                onClick: () => emit('update:mineOnly', !props.mineOnly),
              },
              'scope-toggle'
            )
          : h('span', '僅顯示我的借用'),
      ])
  },
})

const WarehouseBorrowRecordsStub = defineComponent({
  name: 'WarehouseBorrowRecords',
  emits: ['refresh', 'reset', 'page-change', 'cancel', 'return', 'review'],
  setup(_props, { emit }) {
    return () =>
      h('div', { 'data-test': 'warehouse-borrow-records' }, [
        h('button', { type: 'button', 'data-test': 'records-refresh', onClick: () => emit('refresh') }, 'records-refresh'),
        h('button', { type: 'button', 'data-test': 'records-reset', onClick: () => emit('reset') }, 'records-reset'),
        h('button', { type: 'button', 'data-test': 'records-page', onClick: () => emit('page-change', 4) }, 'records-page'),
        h('button', { type: 'button', 'data-test': 'records-cancel', onClick: () => emit('cancel', { id: 101 }) }, 'records-cancel'),
        h('button', { type: 'button', 'data-test': 'records-return', onClick: () => emit('return', { id: 102 }) }, 'records-return'),
        h('button', { type: 'button', 'data-test': 'records-review', onClick: () => emit('review', { id: 103, action: 'approve' }) }, 'records-review'),
      ])
  },
})

async function flushAll() {
  await nextTick()
  await Promise.resolve()
  await nextTick()
}

function resetStores() {
  stores.currentUser.isAdmin.value = true
  stores.currentUser.userId.value = 7

  stores.borrowRecordsComposable.borrowRows.value = [{ id: 1, status: 'requested' }]
  stores.borrowRecordsComposable.borrowPage.value = 1
  stores.borrowRecordsComposable.borrowPageSize.value = 10
  stores.borrowRecordsComposable.borrowTotal.value = 1
  stores.borrowRecordsComposable.loadingBorrows.value = false
  stores.borrowRecordsComposable.borrowActionLoading.value = false
  stores.borrowRecordsComposable.borrowFilters.status = ''
  stores.borrowRecordsComposable.borrowFilters.reviewStatus = ''
  stores.borrowRecordsComposable.filtered.value = false
  stores.borrowRecordsComposable.fetchBorrowRecords.mockClear()
  stores.borrowRecordsComposable.patchBorrowFilters.mockClear()
  stores.borrowRecordsComposable.cancelBorrow.mockClear()
  stores.borrowRecordsComposable.returnBorrow.mockClear()
  stores.borrowRecordsComposable.reviewBorrow.mockClear()

  stores.borrowRouteQueryComposable.handleMineOnlyChangeAndQuery.mockClear()
  stores.borrowRouteQueryComposable.handleBorrowFilterChangeAndQuery.mockClear()
  stores.borrowRouteQueryComposable.handleBorrowPageChangeAndQuery.mockClear()
  stores.borrowRouteQueryComposable.resetBorrowFiltersAndQuery.mockClear()
}

async function mountView() {
  const { default: WarehouseBorrowsView } = await import('@/views/WarehouseBorrowsView.vue')

  return mount(WarehouseBorrowsView, {
    global: {
      stubs: {
        ElButton: defineComponent({
          name: 'ElButton',
          emits: ['click'],
          setup(_p, { emit, slots, attrs }) {
            return () =>
              h(
                'button',
                {
                  ...attrs,
                  type: 'button',
                  onClick: (e) => emit('click', e),
                },
                slots.default?.()
              )
          },
        }),
        ElTag: defineComponent({
          name: 'ElTag',
          setup(_p, { slots }) {
            return () => h('span', slots.default?.())
          },
        }),
        WarehouseSectionHeader: WarehouseSectionHeaderStub,
        WarehouseBorrowScopeBar: WarehouseBorrowScopeBarStub,
        WarehouseBorrowRecords: WarehouseBorrowRecordsStub,
      },
    },
  })
}

describe('WarehouseBorrowsView', () => {
  beforeEach(() => {
    resetStores()
  })

  it('refresh button wiring works', async () => {
    const wrapper = await mountView()
    await flushAll()

    expect(wrapper.get('h3').text()).toBe('借用紀錄')

    const refreshButton = wrapper.findAll('button').find((b) => b.text().includes('重新整理'))
    expect(refreshButton).toBeTruthy()

    await refreshButton.trigger('click')

    expect(stores.borrowRecordsComposable.fetchBorrowRecords).toHaveBeenCalledTimes(1)
  })

  it('wires scope and records events to handlers', async () => {
    const wrapper = await mountView()
    await flushAll()

    await wrapper.get('[data-test="scope-toggle"]').trigger('click')
    await wrapper.get('[data-test="records-refresh"]').trigger('click')
    await wrapper.get('[data-test="records-reset"]').trigger('click')
    await wrapper.get('[data-test="records-page"]').trigger('click')
    await wrapper.get('[data-test="records-cancel"]').trigger('click')
    await wrapper.get('[data-test="records-return"]').trigger('click')
    await wrapper.get('[data-test="records-review"]').trigger('click')

    expect(stores.borrowRouteQueryComposable.handleMineOnlyChangeAndQuery).toHaveBeenCalledTimes(1)
    expect(stores.borrowRouteQueryComposable.handleBorrowFilterChangeAndQuery).toHaveBeenCalledTimes(1)
    expect(stores.borrowRouteQueryComposable.resetBorrowFiltersAndQuery).toHaveBeenCalledTimes(1)
    expect(stores.borrowRouteQueryComposable.handleBorrowPageChangeAndQuery).toHaveBeenCalledWith(4)

    expect(stores.borrowRecordsComposable.cancelBorrow).toHaveBeenCalledWith({ id: 101 })
    expect(stores.borrowRecordsComposable.returnBorrow).toHaveBeenCalledWith({ id: 102 })
    expect(stores.borrowRecordsComposable.reviewBorrow).toHaveBeenCalledWith({ id: 103, action: 'approve' })
  })

  it('non-admin hides scope toggle', async () => {
    stores.currentUser.isAdmin.value = false

    const wrapper = await mountView()
    await flushAll()

    expect(wrapper.text()).toContain('借用紀錄')
    expect(wrapper.find('[data-test="scope-toggle"]').exists()).toBe(false)
    expect(wrapper.text()).toContain('僅顯示我的借用')
  })
})