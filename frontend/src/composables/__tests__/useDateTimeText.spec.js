import { useDateTimeText } from '@/composables/useDateTimeText'

describe('useDateTimeText', () => {
  const {
    formatDate,
    formatDateTime,
    formatDateTimeOrDash,
    formatNowText,
  } = useDateTimeText()

  it('formats valid date and datetime values', () => {
    expect(formatDate('2026-04-22T08:09:00')).toBe('2026-04-22')
    expect(formatDateTime('2026-04-22T08:09:00')).toBe('2026-04-22 08:09')
  })

  it('returns empty string for invalid values', () => {
    expect(formatDate('not-a-date')).toBe('')
    expect(formatDateTime('not-a-date')).toBe('')
  })

  it('returns dash text for empty datetime values', () => {
    expect(formatDateTimeOrDash('')).toBe('—')
    expect(formatDateTimeOrDash(null)).toBe('—')
    expect(formatDateTimeOrDash(undefined)).toBe('—')
  })

  it('formats current time text', () => {
    expect(formatNowText()).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/)
  })
})