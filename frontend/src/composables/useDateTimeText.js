// frontend/src/composables/useDateTimeText.js
import dayjs from 'dayjs'

const DEFAULT_DATE = 'YYYY-MM-DD'
const DEFAULT_DATE_TIME = 'YYYY-MM-DD HH:mm'

function isEmpty(value) {
  return value === null || value === undefined || value === ''
}

function safeDayjs(value) {
  const d = dayjs(value)
  return d.isValid() ? d : null
}

export function useDateTimeText(options = {}) {
  const {
    dateFormat = DEFAULT_DATE,
    dateTimeFormat = DEFAULT_DATE_TIME,
    emptyText = '—',
  } = options

  function formatDate(value, format = dateFormat) {
    if (isEmpty(value)) return ''
    const d = safeDayjs(value)
    return d ? d.format(format) : ''
  }

  function formatDateTime(value, format = dateTimeFormat) {
    if (isEmpty(value)) return ''
    const d = safeDayjs(value)
    return d ? d.format(format) : ''
  }

  function formatDateOrDash(value, format = dateFormat, dash = emptyText) {
    return formatDate(value, format) || dash
  }

  function formatDateTimeOrDash(value, format = dateTimeFormat, dash = emptyText) {
    return formatDateTime(value, format) || dash
  }

  function formatNowText(format = dateTimeFormat) {
    return dayjs().format(format)
  }

  return {
    DEFAULT_DATE,
    DEFAULT_DATE_TIME,

    formatDate,
    formatDateTime,
    formatDateOrDash,
    formatDateTimeOrDash,
    formatNowText,
  }
}

export default useDateTimeText