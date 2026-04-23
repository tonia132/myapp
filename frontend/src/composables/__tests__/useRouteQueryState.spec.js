import {
  firstQueryValue,
  parseQueryText,
  parsePositiveInt,
  parseBoolFlag,
  sameQuery,
  mergeManagedQuery,
} from '@/composables/useRouteQueryState'

describe('useRouteQueryState', () => {
  it('firstQueryValue returns first item for arrays', () => {
    expect(firstQueryValue(['a', 'b'])).toBe('a')
    expect(firstQueryValue('x')).toBe('x')
  })

  it('parseQueryText trims text and supports array values', () => {
    expect(parseQueryText('  abc  ')).toBe('abc')
    expect(parseQueryText(['  ssd  ', 'x'])).toBe('ssd')
    expect(parseQueryText(undefined)).toBe('')
  })

  it('parsePositiveInt returns fallback for invalid values', () => {
    expect(parsePositiveInt('3', 1)).toBe(3)
    expect(parsePositiveInt('0', 7)).toBe(7)
    expect(parsePositiveInt('-2', 7)).toBe(7)
    expect(parsePositiveInt('abc', 7)).toBe(7)
    expect(parsePositiveInt(undefined, 9)).toBe(9)
  })

  it('parseBoolFlag parses common true/false values', () => {
    expect(parseBoolFlag('1', false)).toBe(true)
    expect(parseBoolFlag('true', false)).toBe(true)
    expect(parseBoolFlag('yes', false)).toBe(true)
    expect(parseBoolFlag('on', false)).toBe(true)

    expect(parseBoolFlag('0', true)).toBe(false)
    expect(parseBoolFlag('false', true)).toBe(false)
    expect(parseBoolFlag('no', true)).toBe(false)
    expect(parseBoolFlag('off', true)).toBe(false)

    expect(parseBoolFlag('unknown', true)).toBe(true)
  })

  it('sameQuery compares objects by content, not key order', () => {
    expect(sameQuery(
      { a: '1', b: '2' },
      { b: '2', a: '1' }
    )).toBe(true)

    expect(sameQuery(
      { a: '1', b: '2' },
      { a: '1', b: '3' }
    )).toBe(false)
  })

  it('mergeManagedQuery preserves unrelated keys and replaces managed keys', () => {
    const current = {
      tab: 'borrows',
      borrowStatus: 'requested',
      reviewStatus: 'pending',
      mineOnly: '1',
    }

    const merged = mergeManagedQuery(
      current,
      ['borrowStatus', 'reviewStatus', 'mineOnly'],
      {
        borrowStatus: 'returned',
        reviewStatus: '',
      }
    )

    expect(merged).toEqual({
      tab: 'borrows',
      borrowStatus: 'returned',
    })
  })
})