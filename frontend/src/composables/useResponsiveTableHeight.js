// frontend/src/composables/useResponsiveTableHeight.js
import { onBeforeUnmount, onMounted, ref } from 'vue'

export function useResponsiveTableHeight(options = {}) {
  const {
    offset = 360,
    minHeight = 360,
    fallbackHeight = 900,
    initialHeight = 520,
    enabled = true,
  } = options

  const tableHeight = ref(initialHeight)

  function calcTableHeight() {
    if (typeof window === 'undefined') {
      tableHeight.value = Math.max(minHeight, initialHeight)
      return
    }

    const h = window.innerHeight || fallbackHeight
    tableHeight.value = Math.max(minHeight, h - offset)
  }

  function bind() {
    if (!enabled || typeof window === 'undefined') return
    window.addEventListener('resize', calcTableHeight)
  }

  function unbind() {
    if (typeof window === 'undefined') return
    window.removeEventListener('resize', calcTableHeight)
  }

  onMounted(() => {
    calcTableHeight()
    bind()
  })

  onBeforeUnmount(() => {
    unbind()
  })

  return {
    tableHeight,
    calcTableHeight,
  }
}