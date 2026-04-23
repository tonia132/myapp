import { defineComponent, h, nextTick, reactive, ref } from 'vue'
import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const stores = vi.hoisted(() => ({
  route: null,
  router: null,
  currentUser: null,
  responsiveTable: null,
  itemsComposable: null,
  borrowComposable: null,
  adminItemComposable: null,
  routeQueryComposable: null,
}))

stores.route = reactive({ query: {} })
stores.router = {
  replace: vi.fn(),
}

stores.currentUser = {
  isAdmin: ref(true),
}

stores.responsiveTable = {
  tableHeight: ref(520),
}

stores.itemsComposable = {
  items: ref([{ id: 1, name: 'SSD A' }]),
  page: ref(1),
  pageSize: ref(10),
  total: ref(1),
  loadingItems: ref(false),
  filters: reactive({
    keyword: '',
    type: '',
    status: '',
  }),
  filtered: ref(false),
  fetchItems: vi.fn(async () => {}),
  deleteItem: vi.fn(),
  patchFilters: vi.fn((payload) => {
    Object.assign(stores.itemsComposable.filters, payload)
  }),
}

stores.borrowComposable = {
  borrowing: reactive({
    visible: false,
    item: null,
    loading: false,
  }),
  openBorrow: vi.fn(),
  handleBorrowDialogClosed: vi.fn(),
  submitBorrowFromDialog: vi.fn(),
}

stores.adminItemComposable = {
  selectedItem: ref(null),
  itemDlg: reactive({
    visible: false,
    mode: 'create',
    loading: false,
  }),
  openItemDialog: vi.fn(),
  handleItemDialogClosed: vi.fn(),
  submitItemFromDialog: vi.fn(),
}

stores.routeQueryComposable = {
  resetFiltersAndQuery: vi.fn(),
  handleSearchAndQuery: vi.fn(),
  handleFilterChangeAndQuery: vi.fn(),
  handlePageChangeAndQuery: vi.fn(),
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

vi.mock('@/composables/useResponsiveTableHeight', () => ({
  useResponsiveTableHeight: () => stores.responsiveTable,
}))

vi.mock('@/composables/useWarehouseItems', () => ({
  useWarehouseItems: () => stores.itemsComposable,
}))

vi.mock('@/composables/useWarehouseBorrow', () => ({
  useWarehouseBorrow: () => stores.borrowComposable,
}))

vi.mock('@/composables/useWarehouseAdminItem', () => ({
  useWarehouseAdminItem: () => stores.adminItemComposable,
}))

vi.mock('@/composables/useWarehouseRouteQuery', () => ({
  useWarehouseRouteQuery: () => stores.routeQueryComposable,
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

const WarehouseFiltersStub = defineComponent({
  name: 'WarehouseFilters',
  emits: ['update:keyword', 'update:type', 'update:status', 'search', 'change', 'reset'],
  setup(_props, { emit }) {
    return () =>
      h('div', { 'data-test': 'warehouse-filters' }, [
        h('button', { type: 'button', 'data-test': 'filters-search', onClick: () => emit('search') }, 'filters-search'),
        h('button', { type: 'button', 'data-test': 'filters-change', onClick: () => emit('change') }, 'filters-change'),
        h('button', { type: 'button', 'data-test': 'filters-reset', onClick: () => emit('reset') }, 'filters-reset'),
      ])
  },
})

const WarehouseTableStub = defineComponent({
  name: 'WarehouseTable',
  emits: ['page-change', 'borrow', 'edit', 'delete'],
  setup(_props, { emit }) {
    return () =>
      h('div', { 'data-test': 'warehouse-table' }, [
        h('button', { type: 'button', 'data-test': 'table-page', onClick: () => emit('page-change', 3) }, 'table-page'),
        h('button', { type: 'button', 'data-test': 'table-borrow', onClick: () => emit('borrow', { id: 11 }) }, 'table-borrow'),
        h('button', { type: 'button', 'data-test': 'table-edit', onClick: () => emit('edit', { id: 22 }) }, 'table-edit'),
        h('button', { type: 'button', 'data-test': 'table-delete', onClick: () => emit('delete', { id: 33 }) }, 'table-delete'),
      ])
  },
})

const WarehouseBorrowDialogStub = defineComponent({
  name: 'WarehouseBorrowDialog',
  emits: ['submit', 'closed'],
  setup(_props, { emit }) {
    return () =>
      h('div', { 'data-test': 'warehouse-borrow-dialog' }, [
        h('button', { type: 'button', 'data-test': 'borrow-submit', onClick: () => emit('submit', { quantity: 2 }) }, 'borrow-submit'),
        h('button', { type: 'button', 'data-test': 'borrow-closed', onClick: () => emit('closed') }, 'borrow-closed'),
      ])
  },
})

const WarehouseItemDialogStub = defineComponent({
  name: 'WarehouseItemDialog',
  emits: ['submit', 'closed'],
  setup(_props, { emit }) {
    return () =>
      h('div', { 'data-test': 'warehouse-item-dialog' }, [
        h('button', { type: 'button', 'data-test': 'item-submit', onClick: () => emit('submit', { name: 'New Item' }) }, 'item-submit'),
        h('button', { type: 'button', 'data-test': 'item-closed', onClick: () => emit('closed') }, 'item-closed'),
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

  stores.itemsComposable.items.value = [{ id: 1, name: 'SSD A' }]
  stores.itemsComposable.page.value = 1
  stores.itemsComposable.pageSize.value = 10
  stores.itemsComposable.total.value = 1
  stores.itemsComposable.loadingItems.value = false
  stores.itemsComposable.filters.keyword = ''
  stores.itemsComposable.filters.type = ''
  stores.itemsComposable.filters.status = ''
  stores.itemsComposable.filtered.value = false
  stores.itemsComposable.fetchItems.mockClear()
  stores.itemsComposable.deleteItem.mockClear()
  stores.itemsComposable.patchFilters.mockClear()

  stores.borrowComposable.borrowing.visible = false
  stores.borrowComposable.borrowing.item = null
  stores.borrowComposable.borrowing.loading = false
  stores.borrowComposable.openBorrow.mockClear()
  stores.borrowComposable.handleBorrowDialogClosed.mockClear()
  stores.borrowComposable.submitBorrowFromDialog.mockClear()

  stores.adminItemComposable.selectedItem.value = null
  stores.adminItemComposable.itemDlg.visible = false
  stores.adminItemComposable.itemDlg.mode = 'create'
  stores.adminItemComposable.itemDlg.loading = false
  stores.adminItemComposable.openItemDialog.mockClear()
  stores.adminItemComposable.handleItemDialogClosed.mockClear()
  stores.adminItemComposable.submitItemFromDialog.mockClear()

  stores.routeQueryComposable.resetFiltersAndQuery.mockClear()
  stores.routeQueryComposable.handleSearchAndQuery.mockClear()
  stores.routeQueryComposable.handleFilterChangeAndQuery.mockClear()
  stores.routeQueryComposable.handlePageChangeAndQuery.mockClear()
}

async function mountView() {
  const { default: WarehouseItemsView } = await import('@/views/WarehouseItemsView.vue')

  return mount(WarehouseItemsView, {
    global: {
      stubs: {
        ElButtonGroup: defineComponent({
          name: 'ElButtonGroup',
          setup(_p, { slots }) {
            return () => h('div', slots.default?.())
          },
        }),
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
        WarehouseFilters: WarehouseFiltersStub,
        WarehouseTable: WarehouseTableStub,
        WarehouseBorrowDialog: WarehouseBorrowDialogStub,
        WarehouseItemDialog: WarehouseItemDialogStub,
      },
    },
  })
}

describe('WarehouseItemsView', () => {
  beforeEach(() => {
    resetStores()
  })

  it('shows admin create button and refresh wiring works', async () => {
    const wrapper = await mountView()
    await flushAll()

    expect(wrapper.get('h3').text()).toBe('庫存清單')

    const buttons = wrapper.findAll('button')
    const createButton = buttons.find((b) => b.text().includes('新增品項'))
    const refreshButton = buttons.find((b) => b.text().includes('重新整理'))

    expect(createButton).toBeTruthy()
    expect(refreshButton).toBeTruthy()

    await createButton.trigger('click')
    await refreshButton.trigger('click')

    expect(stores.adminItemComposable.openItemDialog).toHaveBeenCalledTimes(1)
    expect(stores.itemsComposable.fetchItems).toHaveBeenCalledTimes(1)
  })

  it('wires child events to handlers', async () => {
    const wrapper = await mountView()
    await flushAll()

    await wrapper.get('[data-test="filters-search"]').trigger('click')
    await wrapper.get('[data-test="filters-change"]').trigger('click')
    await wrapper.get('[data-test="filters-reset"]').trigger('click')

    await wrapper.get('[data-test="table-page"]').trigger('click')
    await wrapper.get('[data-test="table-borrow"]').trigger('click')
    await wrapper.get('[data-test="table-edit"]').trigger('click')
    await wrapper.get('[data-test="table-delete"]').trigger('click')

    await wrapper.get('[data-test="borrow-submit"]').trigger('click')
    await wrapper.get('[data-test="borrow-closed"]').trigger('click')
    await wrapper.get('[data-test="item-submit"]').trigger('click')
    await wrapper.get('[data-test="item-closed"]').trigger('click')

    expect(stores.routeQueryComposable.handleSearchAndQuery).toHaveBeenCalledTimes(1)
    expect(stores.routeQueryComposable.handleFilterChangeAndQuery).toHaveBeenCalledTimes(1)
    expect(stores.routeQueryComposable.resetFiltersAndQuery).toHaveBeenCalledTimes(1)
    expect(stores.routeQueryComposable.handlePageChangeAndQuery).toHaveBeenCalledWith(3)

    expect(stores.borrowComposable.openBorrow).toHaveBeenCalledWith({ id: 11 })
    expect(stores.adminItemComposable.openItemDialog).toHaveBeenCalledWith({ id: 22 })
    expect(stores.itemsComposable.deleteItem).toHaveBeenCalledWith({ id: 33 })

    expect(stores.borrowComposable.submitBorrowFromDialog).toHaveBeenCalledWith({ quantity: 2 })
    expect(stores.borrowComposable.handleBorrowDialogClosed).toHaveBeenCalledTimes(1)
    expect(stores.adminItemComposable.submitItemFromDialog).toHaveBeenCalledWith({ name: 'New Item' })
    expect(stores.adminItemComposable.handleItemDialogClosed).toHaveBeenCalledTimes(1)
  })

  it('hides create button for non-admin', async () => {
    stores.currentUser.isAdmin.value = false

    const wrapper = await mountView()
    await flushAll()

    expect(wrapper.text()).toContain('庫存清單')
    expect(wrapper.text()).not.toContain('新增品項')
  })
})