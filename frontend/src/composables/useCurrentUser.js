// frontend/src/composables/useCurrentUser.js
import { computed, ref } from 'vue'

function readJson(key, fallback = null) {
  try {
    const raw = localStorage.getItem(key) || sessionStorage.getItem(key)
    if (!raw) return fallback
    return JSON.parse(raw)
  } catch {
    return fallback
  }
}

function readText(key, fallback = '') {
  try {
    return localStorage.getItem(key) || sessionStorage.getItem(key) || fallback
  } catch {
    return fallback
  }
}

function normalizeUser(user) {
  if (!user || typeof user !== 'object') return null

  return {
    id: user.id ?? null,
    username: user.username || '',
    name: user.name || '',
    email: user.email || '',
    role: String(user.role || '').toLowerCase(),
    raw: user,
  }
}

export function useCurrentUser() {
  const version = ref(0)

  function refresh() {
    version.value += 1
  }

  const user = computed(() => {
    version.value
    return normalizeUser(readJson('user', null))
  })

  const token = computed(() => {
    version.value
    return readText('token', '')
  })

  const isLoggedIn = computed(() => !!token.value)
  const isAdmin = computed(() => String(user.value?.role || '') === 'admin')
  const displayName = computed(() => {
    return user.value?.name || user.value?.username || ''
  })

  const userId = computed(() => user.value?.id ?? null)

  function clearAuth() {
    try {
      localStorage.removeItem('user')
      sessionStorage.removeItem('user')
      localStorage.removeItem('token')
      sessionStorage.removeItem('token')
    } catch {}
    refresh()
  }

  function setAuth(nextUser, nextToken = '') {
    try {
      const rawUser = nextUser ? JSON.stringify(nextUser) : ''
      if (rawUser) {
        localStorage.setItem('user', rawUser)
      } else {
        localStorage.removeItem('user')
      }

      if (nextToken) {
        localStorage.setItem('token', String(nextToken))
      } else {
        localStorage.removeItem('token')
      }
    } catch {}
    refresh()
  }

  return {
    user,
    userId,
    token,
    isLoggedIn,
    isAdmin,
    displayName,
    refresh,
    clearAuth,
    setAuth,
  }
}