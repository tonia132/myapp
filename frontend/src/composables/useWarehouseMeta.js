// frontend/src/composables/useWarehouseMeta.js
import { computed } from 'vue'
import { useSafeI18n } from '@/composables/useSafeI18n'

const TYPE_META = {
  machine: {
    key: 'warehouse.types.machine',
    fallback: 'Machine',
  },
  part: {
    key: 'warehouse.types.part',
    fallback: 'Part',
  },
  tool: {
    key: 'warehouse.types.tool',
    fallback: 'Tool',
  },
  fixture: {
    key: 'warehouse.types.fixture',
    fallback: 'Fixture',
  },
  other: {
    key: 'warehouse.types.other',
    fallback: 'Other',
  },
  instrument: {
    key: 'warehouse.types.instrument',
    fallback: 'Instrument',
  },
}

const STOCK_STATUS_META = {
  normal: {
    optionKey: 'warehouse.statusOptions.normal',
    optionFallback: 'Normal',
    labelKey: 'warehouse.stock.status.normal',
    labelFallback: 'Normal',
    tagType: 'success',
    tagEffect: 'light',
  },
  partial_damage: {
    optionKey: 'warehouse.statusOptions.partial_damage',
    optionFallback: 'Partial Damage',
    labelKey: 'warehouse.stock.status.partial_damage',
    labelFallback: 'Partial Damage',
    tagType: 'warning',
    tagEffect: 'light',
  },
  disabled_scrap: {
    optionKey: 'warehouse.statusOptions.disabled_scrap',
    optionFallback: 'Disabled / Scrap',
    labelKey: 'warehouse.stock.status.disabled_scrap',
    labelFallback: 'Disabled / Scrap',
    tagType: 'info',
    tagEffect: 'light',
  },
}

const BORROW_STATUS_META = {
  requested: {
    key: 'warehouse.borrowRecords.status.requested',
    fallback: 'Requested',
    tagType: 'warning',
    tagEffect: 'light',
  },
  borrowed: {
    key: 'warehouse.borrowRecords.status.borrowed',
    fallback: 'Borrowed',
    tagType: 'primary',
    tagEffect: 'light',
  },
  returned: {
    key: 'warehouse.borrowRecords.status.returned',
    fallback: 'Returned',
    tagType: 'success',
    tagEffect: 'light',
  },
  canceled: {
    key: 'warehouse.borrowRecords.status.canceled',
    fallback: 'Canceled',
    tagType: 'info',
    tagEffect: 'light',
  },
  rejected: {
    key: 'warehouse.borrowRecords.status.rejected',
    fallback: 'Rejected',
    tagType: 'danger',
    tagEffect: 'light',
  },
}

const REVIEW_STATUS_META = {
  pending: {
    key: 'warehouse.borrowRecords.reviewStatus.pending',
    fallback: 'Pending',
    tagType: 'warning',
    tagEffect: 'plain',
  },
  approved: {
    key: 'warehouse.borrowRecords.reviewStatus.approved',
    fallback: 'Approved',
    tagType: 'success',
    tagEffect: 'plain',
  },
  rejected: {
    key: 'warehouse.borrowRecords.reviewStatus.rejected',
    fallback: 'Rejected',
    tagType: 'danger',
    tagEffect: 'plain',
  },
  canceled: {
    key: 'warehouse.borrowRecords.reviewStatus.canceled',
    fallback: 'Canceled',
    tagType: 'info',
    tagEffect: 'plain',
  },
}

function normalizeKey(v) {
  return String(v || '').trim().toLowerCase()
}

export function useWarehouseMeta() {
  const { tt } = useSafeI18n()

  /* ---------------- type ---------------- */
  const typeOptions = computed(() => [
    { value: '', label: tt('warehouse.types.all', 'All') },
    ...Object.entries(TYPE_META).map(([value, meta]) => ({
      value,
      label: tt(meta.key, meta.fallback),
    })),
  ])

  const typeValueOptions = computed(() =>
    Object.entries(TYPE_META).map(([value, meta]) => ({
      value,
      label: tt(meta.key, meta.fallback),
    }))
  )

  function renderTypeLabel(type) {
    const key = normalizeKey(type)
    const meta = TYPE_META[key]
    if (meta) return tt(meta.key, meta.fallback)
    return String(type || tt('warehouse.types.other', 'Other'))
  }

  function isKnownType(type) {
    return !!TYPE_META[normalizeKey(type)]
  }

  /* ---------------- stock status ---------------- */
  const stockStatusOptions = computed(() => [
    { value: '', label: tt('warehouse.statusOptions.all', 'All') },
    ...Object.entries(STOCK_STATUS_META).map(([value, meta]) => ({
      value,
      label: tt(meta.optionKey, meta.optionFallback),
    })),
  ])

  const stockStatusValueOptions = computed(() =>
    Object.entries(STOCK_STATUS_META).map(([value, meta]) => ({
      value,
      label: tt(meta.optionKey, meta.optionFallback),
    }))
  )

  function renderStockStatusLabel(status) {
    const key = normalizeKey(status)
    const meta = STOCK_STATUS_META[key]
    if (meta) return tt(meta.labelKey, meta.labelFallback)
    return tt('warehouse.stock.status.unknown', 'Unknown')
  }

  function getStockStatusTagType(status) {
    const meta = STOCK_STATUS_META[normalizeKey(status)]
    return meta?.tagType || ''
  }

  function getStockStatusTagEffect(status) {
    const meta = STOCK_STATUS_META[normalizeKey(status)]
    return meta?.tagEffect || 'light'
  }

  function isDisabledScrap(status) {
    return normalizeKey(status) === 'disabled_scrap'
  }

  /* ---------------- borrow status ---------------- */
  const borrowStatusOptions = computed(() => [
    { value: '', label: tt('warehouse.borrowRecords.status.all', 'All') },
    ...Object.entries(BORROW_STATUS_META).map(([value, meta]) => ({
      value,
      label: tt(meta.key, meta.fallback),
    })),
  ])

  const borrowStatusValueOptions = computed(() =>
    Object.entries(BORROW_STATUS_META).map(([value, meta]) => ({
      value,
      label: tt(meta.key, meta.fallback),
    }))
  )

  function renderBorrowStatusLabel(status) {
    const key = normalizeKey(status)
    const meta = BORROW_STATUS_META[key]
    if (meta) return tt(meta.key, meta.fallback)
    return String(status || '—')
  }

  function getBorrowStatusTagType(status) {
    const meta = BORROW_STATUS_META[normalizeKey(status)]
    return meta?.tagType || ''
  }

  function getBorrowStatusTagEffect(status) {
    const meta = BORROW_STATUS_META[normalizeKey(status)]
    return meta?.tagEffect || 'light'
  }

  /* ---------------- review status ---------------- */
  const reviewStatusOptions = computed(() => [
    { value: '', label: tt('warehouse.borrowRecords.reviewStatus.all', 'All') },
    ...Object.entries(REVIEW_STATUS_META).map(([value, meta]) => ({
      value,
      label: tt(meta.key, meta.fallback),
    })),
  ])

  const reviewStatusValueOptions = computed(() =>
    Object.entries(REVIEW_STATUS_META).map(([value, meta]) => ({
      value,
      label: tt(meta.key, meta.fallback),
    }))
  )

  function renderReviewStatusLabel(status) {
    const key = normalizeKey(status)
    const meta = REVIEW_STATUS_META[key]
    if (meta) return tt(meta.key, meta.fallback)
    return String(status || '—')
  }

  function getReviewStatusTagType(status) {
    const meta = REVIEW_STATUS_META[normalizeKey(status)]
    return meta?.tagType || ''
  }

  function getReviewStatusTagEffect(status) {
    const meta = REVIEW_STATUS_META[normalizeKey(status)]
    return meta?.tagEffect || 'plain'
  }

  return {
    tt,

    typeOptions,
    typeValueOptions,
    renderTypeLabel,
    isKnownType,

    stockStatusOptions,
    stockStatusValueOptions,
    renderStockStatusLabel,
    getStockStatusTagType,
    getStockStatusTagEffect,
    isDisabledScrap,

    borrowStatusOptions,
    borrowStatusValueOptions,
    renderBorrowStatusLabel,
    getBorrowStatusTagType,
    getBorrowStatusTagEffect,

    reviewStatusOptions,
    reviewStatusValueOptions,
    renderReviewStatusLabel,
    getReviewStatusTagType,
    getReviewStatusTagEffect,
  }
}

export default useWarehouseMeta