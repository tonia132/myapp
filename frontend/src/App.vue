<template>
  <!-- ✅ 由這裡控制 Element Plus 語系 -->
  <el-config-provider :locale="elementLocale">
    <div class="app-wrapper">
      <!-- ▲ Top Bar -->
      <header v-if="showTopBar" class="top-bar">
        <div class="left-section">
          <div
            class="app-logo"
            @click="$router.push('/welcome')"
            :title="t('topbar.goDashboard')"
          >
            <img v-if="logoSrc" :src="logoSrc" alt="logo" class="logo-img" />
            <span v-else class="logo-icon">⚙️</span>

            <!-- ✅ 有 logo 圖時不顯示重複標題（避免左上「字重疊」） -->
            <span v-if="!logoSrc" class="logo-text">{{ t('app.title') }}</span>
          </div>

          <div class="user-info">
            <button
              v-if="isLoggedIn && user"
              class="user-link"
              type="button"
              @click="goProfile"
              title="前往個人資料"
            >
              👤 {{ displayUserName }}（{{ user.role }}）
            </button>
            <span v-else>{{ t('topbar.notLoggedIn') }}</span>
          </div>
        </div>

        <div class="right-section">
          <el-tooltip :content="apiShownFull" placement="bottom">
            <button class="badge" @click="copyApi">{{ apiShownShort }}</button>
          </el-tooltip>

          <!-- ✅ 通知中心（只給管理員）｜放在語言切換左邊 -->
          <NotificationCenter
            v-if="isLoggedIn && isAdmin"
            class="notify-center"
          />

          <!-- ✅ 語言切換 -->
          <LanguageSwitcher class="lang-switcher" />

          <el-button
            type="info"
            size="small"
            circle
            class="dark-toggle"
            @click="toggleTheme"
            :title="t('topbar.toggleTheme')"
          >
            <el-icon v-if="isDark"><Sunny /></el-icon>
            <el-icon v-else><Moon /></el-icon>
          </el-button>

          <el-button
            v-if="isLoggedIn"
            type="danger"
            size="small"
            class="logout-btn"
            @click="logout"
            :title="t('layout.logout')"
          >
            {{ t('layout.logout') }}
          </el-button>
        </div>
      </header>

      <!-- 未登入：只允許白名單頁面（含 /welcome） -->
      <router-view v-if="!isLoggedIn" />

      <!-- 已登入 -->
      <div v-else class="layout">
        <Sidebar :user="user" @logout="logout" />
        <main class="main-content">
          <router-view v-slot="{ Component }">
            <transition name="fade" mode="out-in">
              <KeepAlive>
                <component :is="Component" v-if="$route.meta?.keepAlive" />
              </KeepAlive>
            </transition>
            <transition name="fade" mode="out-in">
              <component :is="Component" v-if="!$route.meta?.keepAlive" />
            </transition>
          </router-view>
        </main>
      </div>
    </div>
  </el-config-provider>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Moon, Sunny } from '@element-plus/icons-vue'
import { useI18n } from 'vue-i18n'
import zhTwEp from 'element-plus/dist/locale/zh-tw.mjs'
import enEp from 'element-plus/dist/locale/en.mjs'

import Sidebar from './components/Sidebar.vue'
import LanguageSwitcher from './components/LanguageSwitcher.vue'
import NotificationCenter from './components/NotificationCenter.vue'

const router = useRouter()
const route = useRoute()

/* ---------------- i18n / Element Plus locale ---------------- */
const { t, locale } = useI18n()
const elementLocale = computed(() => (locale.value === 'en' ? enEp : zhTwEp))

/* ---------------- logo ---------------- */
const logoSrc = '/LOGO.png'

/* ---------------- storage helpers ---------------- */
const LS = {
  token: 'token',
  user: 'user',
  theme: 'theme',
  apiBase: 'apiBaseURL'
}

function getToken () {
  return localStorage.getItem(LS.token) || sessionStorage.getItem(LS.token) || ''
}

function getStoredUser () {
  const raw =
    localStorage.getItem(LS.user) || sessionStorage.getItem(LS.user) || 'null'
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

function clearAuth () {
  localStorage.removeItem(LS.token)
  localStorage.removeItem(LS.user)
  sessionStorage.removeItem(LS.token)
  sessionStorage.removeItem(LS.user)
}

/* ---------------- auth state ---------------- */
const isLoggedIn = ref(!!getToken())
const user = ref(getStoredUser())

const isAdmin = computed(() => {
  const u = user.value
  const role = String(u?.role || '').toLowerCase()
  return role === 'admin' || u?.isAdmin === true
})

const displayUserName = computed(() => {
  const u = user.value || {}
  return u.displayName || u.name || u.username || '使用者'
})

function refreshAuth () {
  isLoggedIn.value = !!getToken()
  user.value = getStoredUser()
}

function goProfile () {
  if (!isLoggedIn.value) return
  router.push('/profile')
}

function onUserUpdated () {
  refreshAuth()
}

/* ---------------- API Base badge (normalize to /api) ---------------- */
function normalizeApiBase (v) {
  if (!v) return '/api'
  let s = String(v).trim().replace(/\/+$/, '')
  if (!/\/api$/i.test(s)) s += '/api'
  return s
}

function readApiBase () {
  return normalizeApiBase(
    localStorage.getItem(LS.apiBase) ||
      import.meta.env.VITE_API_BASE ||
      '/api'
  )
}

const resolvedApi = ref(readApiBase())
const apiShownFull = computed(() => resolvedApi.value)
const apiShownShort = computed(() => {
  const v = apiShownFull.value
  return v.length > 32 ? v.slice(0, 32) + '…' : v
})

async function copyApi () {
  const text = apiShownFull.value
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
    } else {
      const ta = document.createElement('textarea')
      ta.value = text
      ta.style.position = 'fixed'
      ta.style.opacity = '0'
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
    }
    ElMessage.success(t('topbar.apiCopied'))
  } catch {
    // 靜默即可，避免一直跳錯誤
  }
}

/* ---------------- theme: <html>.dark ---------------- */
const isDark = ref(document.documentElement.classList.contains('dark'))

function setTheme (mode, { persist = true } = {}) {
  const html = document.documentElement
  const m = mode === 'dark' ? 'dark' : 'light'

  if (m === 'dark') html.classList.add('dark')
  else html.classList.remove('dark')

  isDark.value = m === 'dark'
  if (persist) localStorage.setItem(LS.theme, m)
}

function toggleTheme () {
  setTheme(isDark.value ? 'light' : 'dark', { persist: true })
}

/* ---------------- route whitelist / topbar ---------------- */
const guestWhitelist = new Set([
  '/welcome',
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password'
])

const hideTopbarPaths = new Set([
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password'
])

const showTopBar = computed(() => {
  if (route.meta?.topbar === false) return false
  return !hideTopbarPaths.has(route.path)
})

function ensureAuthOnRoute () {
  if (!isLoggedIn.value && !guestWhitelist.has(route.path)) {
    router.replace({ path: '/login', query: { redirect: route.fullPath } })
  }
}

/* ---------------- logout ---------------- */
function logout () {
  clearAuth()
  refreshAuth()
  router.push('/login')
}

/* ---------------- cross-tab sync (localStorage only) ---------------- */
let mq = null
let mqHandler = null

function addMqListener (mql, fn) {
  if (mql?.addEventListener) mql.addEventListener('change', fn)
  else if (mql?.addListener) mql.addListener(fn)
}
function removeMqListener (mql, fn) {
  if (mql?.removeEventListener) mql.removeEventListener('change', fn)
  else if (mql?.removeListener) mql.removeListener(fn)
}

function onStorage (e) {
  if (e.key === LS.token || e.key === LS.user) {
    refreshAuth()
    ensureAuthOnRoute()
    return
  }

  if (e.key === LS.theme) {
    const v = localStorage.getItem(LS.theme)
    if (v === 'dark' || v === 'light') setTheme(v, { persist: false })
    return
  }

  if (e.key === LS.apiBase) {
    resolvedApi.value = readApiBase()
  }
}

/* ---------------- init ---------------- */
onMounted(() => {
  refreshAuth()

  const saved = localStorage.getItem(LS.theme)
  if (saved === 'dark' || saved === 'light') {
    setTheme(saved, { persist: false })
  } else if (window.matchMedia) {
    mq = window.matchMedia('(prefers-color-scheme: dark)')
    setTheme(mq.matches ? 'dark' : 'light', { persist: false })
    mqHandler = (e) => setTheme(e.matches ? 'dark' : 'light', { persist: false })
    addMqListener(mq, mqHandler)
  } else {
    setTheme('light', { persist: false })
  }

  window.addEventListener('storage', onStorage)
  window.addEventListener('user-updated', onUserUpdated)
  ensureAuthOnRoute()
})

onBeforeUnmount(() => {
  window.removeEventListener('storage', onStorage)
  window.removeEventListener('user-updated', onUserUpdated)
  if (mq && mqHandler) removeMqListener(mq, mqHandler)
})

/* ---------------- watch route changes ---------------- */
watch(
  () => route.fullPath,
  () => {
    refreshAuth()
    ensureAuthOnRoute()
  }
)

watch(isLoggedIn, () => {
  ensureAuthOnRoute()
})
</script>

<style scoped>
/* ====== Top Bar ====== */
.top-bar {
  position: sticky;
  top: 0;
  z-index: 1000;
  background: var(--topbar-bg);
  padding: 8px 16px;
  border-bottom: 1px solid var(--border-color);
  font-size: 14px;

  display: flex;
  justify-content: space-between;
  align-items: center;

  height: 48px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);

  gap: 12px;
  min-width: 0;
}

.left-section {
  display: flex;
  align-items: center;
  gap: 20px;

  flex: 1;
  min-width: 0;
}

.app-logo {
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  user-select: none;

  min-width: 0;
}
.logo-img {
  height: 24px;
  width: auto;
  object-fit: contain;
}
.logo-icon {
  font-size: 22px;
}
.logo-text {
  font-size: 16px;
  font-weight: 700;
  color: var(--text-primary);

  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.user-info {
  font-size: 14px;
  color: var(--text-secondary);
  white-space: nowrap;

  min-width: 0;
  max-width: 320px;
  overflow: hidden;
  text-overflow: ellipsis;
}

.user-link {
  border: none;
  background: transparent;
  padding: 0;
  margin: 0;
  font: inherit;
  color: inherit;
  cursor: pointer;
  white-space: nowrap;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
}

.user-link:hover {
  color: var(--el-color-primary);
  text-decoration: underline;
}

.right-section {
  display: flex;
  align-items: center;
  gap: 10px;

  flex: 0 0 auto;
  min-width: 0;
}

.badge {
  background: #409eff;
  color: #fff;
  padding: 3px 10px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
  border: none;
  cursor: pointer;

  max-width: 240px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.logout-btn {
  font-size: 12px;
}
.lang-switcher {
  display: inline-flex;
  align-items: center;
}

.notify-center {
  display: inline-flex;
  align-items: center;
}

@media (max-width: 1100px) {
  .user-info {
    max-width: 160px;
  }
  .badge {
    max-width: 160px;
  }
}

/* ====== Layout ====== */
.layout {
  display: flex;
  height: calc(100vh - 48px);
}
.main-content {
  flex: 1;
  padding: 12px;
  overflow: auto;
  background: var(--main-bg);
  color: var(--text-primary);
}

/* ====== 轉場 ====== */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.18s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* ====== 深/淺色變數 ====== */
:global(:root) {
  --topbar-bg: var(--app-nav-bg, #ffffff);
  --main-bg: var(--app-page-bg, #f7f9fc);
  --text-primary: #333;
  --text-secondary: #555;
  --border-color: #e6e6e6;
}
:global(.dark) {
  --topbar-bg: var(--app-nav-bg, #1e232a);
  --main-bg: var(--app-page-bg, #121417);
  --text-primary: #e6e8eb;
  --text-secondary: #a9b0b8;
  --border-color: #2b323a;
}
</style>