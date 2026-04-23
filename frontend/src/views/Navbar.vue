<template>
  <header class="navbar-vivid">
    <div class="nav-shell">
      <div class="left">
        <router-link
          to="/products"
          class="brand"
          :aria-label="text('sidebar.backHome', '返回首頁')"
        >
          <span class="brand-icon">⚙️</span>
          <span class="brand-copy">
            <span class="brand-title">{{ text('login.title', '測試系統') }}</span>
            <span class="brand-subtitle">{{ text('navbar.brandSubtitle', 'QA / Lab Workspace') }}</span>
          </span>
        </router-link>

        <div class="desktop-only nav-pills">
          <router-link
            v-for="item in navItems"
            :key="item.path"
            :to="item.path"
            class="nav-pill"
            :class="{ active: activePath === item.path }"
          >
            {{ text(item.i18nKey, item.fallback || item.path) }}
          </router-link>
        </div>
      </div>

      <div class="right">
        <div class="status-chip desktop-only">
          <span class="status-dot"></span>
          <span>{{ text('navbar.statusLabel', 'Workspace Ready') }}</span>
        </div>

        <el-dropdown>
          <span class="control-chip" role="button">
            <span class="chip-label">{{ currentLangLabel }}</span>
          </span>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item
                :disabled="currentLang === 'zh-TW'"
                @click="setLang('zh-TW')"
              >
                {{ text('header.langZh', '繁體中文') }}
              </el-dropdown-item>
              <el-dropdown-item
                :disabled="currentLang === 'en'"
                @click="setLang('en')"
              >
                {{ text('header.langEn', 'English') }}
              </el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>

        <el-tooltip :content="text('topbar.toggleTheme', '切換主題')" placement="bottom">
          <el-button
            class="icon-btn"
            circle
            @click="toggleTheme"
            :title="text('topbar.toggleTheme', '切換主題')"
          >
            <el-icon v-if="isDark"><Moon /></el-icon>
            <el-icon v-else><Sunny /></el-icon>
          </el-button>
        </el-tooltip>

        <el-dropdown>
          <span class="user-chip" role="button" :aria-label="text('navbar.userMenu', '使用者選單')">
            <span class="user-avatar">
              <el-icon><User /></el-icon>
            </span>
            <span class="user-copy">
              <em class="user-name">{{ user?.name || user?.username || text('common.user', '使用者') }}</em>
              <small class="user-role">{{ userRoleText }}</small>
            </span>
          </span>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item @click="$router.push('/change-password')">
                {{ text('changePassword.title', '修改密碼') }}
              </el-dropdown-item>
              <el-dropdown-item divided @click="logout">
                {{ text('layout.logout', '登出') }}
              </el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>

        <el-button
          class="mobile-only mobile-menu-btn"
          @click="mobileOpen = true"
        >
          {{ text('sidebar.navLabel', '導覽') }}
        </el-button>
      </div>
    </div>

    <el-drawer
      v-model="mobileOpen"
      direction="rtl"
      size="82%"
      :title="text('sidebar.navLabel', '導覽')"
      class="mobile-drawer"
    >
      <div class="mobile-drawer-top">
        <div class="mobile-brand">
          <div class="mobile-brand-icon">⚙️</div>
          <div>
            <div class="mobile-brand-title">{{ text('login.title', '測試系統') }}</div>
            <div class="mobile-brand-subtitle">{{ text('navbar.brandSubtitle', 'QA / Lab Workspace') }}</div>
          </div>
        </div>

        <div class="mobile-user-card">
          <div class="mobile-user-name">{{ user?.name || user?.username || text('common.user', '使用者') }}</div>
          <div class="mobile-user-role">{{ userRoleText }}</div>
        </div>
      </div>

      <div class="mobile-nav-list">
        <button
          v-for="item in navItems"
          :key="item.path"
          class="mobile-nav-item"
          :class="{ active: activePath === item.path }"
          @click="goMobile(item.path)"
        >
          <span>{{ text(item.i18nKey, item.fallback || item.path) }}</span>
          <span class="arrow">›</span>
        </button>
      </div>

      <div class="mobile-controls">
        <div class="mobile-control-row">
          <span class="mobile-label">{{ text('navbar.languageLabel', '語言') }}</span>
          <el-segmented
            v-model="lang"
            :options="langSegmentOptions"
          />
        </div>

        <div class="mobile-control-row">
          <span class="mobile-label">{{ text('navbar.themeLabel', '主題') }}</span>
          <el-button class="theme-switch-btn" @click="toggleTheme">
            <el-icon v-if="isDark"><Moon /></el-icon>
            <el-icon v-else><Sunny /></el-icon>
            <span>{{ text('topbar.toggleTheme', '切換主題') }}</span>
          </el-button>
        </div>

        <el-button class="logout-btn" type="danger" plain @click="logout">
          {{ text('layout.logout', '登出') }}
        </el-button>
      </div>
    </el-drawer>
  </header>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { Moon, Sunny, User } from '@element-plus/icons-vue'

const route = useRoute()
const router = useRouter()
const { t, te, locale } = useI18n()

function text (key, fallback, params) {
  if (te(key)) return t(key, params)
  if (!params) return fallback
  return String(fallback).replace(/\{(\w+)\}/g, (_, k) => String(params?.[k] ?? ''))
}

const user = ref(JSON.parse(localStorage.getItem('user') || 'null'))
const isDark = ref(document.documentElement.classList.contains('dark'))
const mobileOpen = ref(false)
const activePath = computed(() => route.path)

const currentLang = computed(() => (locale.value === 'en' ? 'en' : 'zh-TW'))
const currentLangLabel = computed(() =>
  currentLang.value === 'en'
    ? text('header.langEn', 'English')
    : text('header.langZh', '繁體中文')
)

const langSegmentOptions = computed(() => [
  { label: text('header.langZh', '繁體中文'), value: 'zh-TW' },
  { label: text('header.langEn', 'English'), value: 'en' }
])

const lang = computed({
  get () { return currentLang.value },
  set (val) {
    locale.value = val
    localStorage.setItem('lang', val)
  }
})

const userRoleText = computed(() => {
  const role = String(user.value?.role || '').toLowerCase()
  if (role === 'admin') return text('navbar.roleAdmin', 'Admin')
  if (role) return role
  return text('navbar.roleUser', 'User')
})

const navItems = computed(() => {
  const items = [
    { path: '/products', i18nKey: 'layout.products', fallback: '產品管理' },
    { path: '/machines', i18nKey: 'layout.machines', fallback: '機台管理' },
    { path: '/default-test-sets', i18nKey: 'sidebar.defaultTestSets', fallback: '預設測試集' }
  ]
  if (String(user.value?.role || '').toLowerCase() === 'admin') {
    items.push({ path: '/logs', i18nKey: 'layout.logs', fallback: '系統日誌' })
  }
  return items
})

function setLang (lang) {
  locale.value = lang
  localStorage.setItem('lang', lang)
}

function applyTheme (mode) {
  const html = document.documentElement
  if (mode === 'dark') {
    html.classList.add('dark')
    isDark.value = true
  } else {
    html.classList.remove('dark')
    isDark.value = false
  }
  localStorage.setItem('theme', mode)
}
function toggleTheme () {
  applyTheme(isDark.value ? 'light' : 'dark')
}

function goMobile (path) {
  mobileOpen.value = false
  router.push(path)
}

function logout () {
  localStorage.removeItem('token')
  localStorage.removeItem('user')
  location.href = '/login'
}

function onStorage (e) {
  if (e.key === 'user') {
    user.value = JSON.parse(localStorage.getItem('user') || 'null')
  }
  if (e.key === 'theme') {
    const v = localStorage.getItem('theme')
    if (v === 'dark' || v === 'light') applyTheme(v)
  }
  if (e.key === 'lang') {
    const v = localStorage.getItem('lang')
    if (v) locale.value = v
  }
}

onMounted(() => {
  const savedTheme = localStorage.getItem('theme')
  if (savedTheme === 'dark' || savedTheme === 'light') {
    applyTheme(savedTheme)
  } else if (window.matchMedia?.('(prefers-color-scheme: dark)').matches) {
    applyTheme('dark')
  }

  const savedLang = localStorage.getItem('lang')
  if (savedLang) locale.value = savedLang

  window.addEventListener('storage', onStorage)
})
onBeforeUnmount(() => window.removeEventListener('storage', onStorage))
</script>

<style scoped>
.navbar-vivid {
  position: sticky;
  top: 0;
  z-index: 30;
  padding: 10px 12px 0;
  backdrop-filter: blur(8px);
}

.nav-shell {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 14px;
  border-radius: 22px;
  border: 1px solid var(--el-border-color-light);
  background:
    linear-gradient(180deg, color-mix(in srgb, var(--el-bg-color) 90%, transparent 10%) 0%, color-mix(in srgb, var(--el-bg-color) 82%, transparent 18%) 100%);
  box-shadow: 0 14px 36px rgba(0, 0, 0, 0.06);
}

.left {
  display: flex;
  align-items: center;
  gap: 16px;
  min-width: 0;
  flex: 1;
}

.brand {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
  text-decoration: none;
  color: var(--el-text-color-primary);
}

.brand-icon {
  width: 42px;
  height: 42px;
  border-radius: 14px;
  display: grid;
  place-items: center;
  font-size: 20px;
  background: linear-gradient(135deg, var(--el-color-primary-light-7), var(--el-color-primary-light-9));
  border: 1px solid color-mix(in srgb, var(--el-color-primary) 22%, var(--el-border-color-light));
}

.brand-copy {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.brand-title {
  font-size: 16px;
  font-weight: 800;
  line-height: 1.15;
}

.brand-subtitle {
  margin-top: 2px;
  font-size: 11px;
  color: var(--el-text-color-secondary);
  letter-spacing: 0.05em;
}

.nav-pills {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  flex-wrap: wrap;
}

.nav-pill {
  padding: 9px 12px;
  border-radius: 999px;
  text-decoration: none;
  color: var(--el-text-color-regular);
  background: transparent;
  border: 1px solid transparent;
  transition: all .2s ease;
  font-size: 14px;
  white-space: nowrap;
}

.nav-pill:hover {
  background: var(--el-fill-color-light);
  color: var(--el-text-color-primary);
}

.nav-pill.active {
  background: color-mix(in srgb, var(--el-color-primary-light-8) 70%, white 30%);
  color: var(--el-color-primary);
  border-color: color-mix(in srgb, var(--el-color-primary) 24%, var(--el-border-color-light));
  font-weight: 700;
}

.right {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.status-chip,
.control-chip,
.user-chip {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 38px;
  padding: 0 12px;
  border-radius: 999px;
  border: 1px solid var(--el-border-color-lighter);
  background: color-mix(in srgb, var(--el-fill-color-light) 88%, white 12%);
}

.status-chip {
  color: var(--el-text-color-secondary);
  font-size: 13px;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 999px;
  background: var(--el-color-success);
  box-shadow: 0 0 0 6px color-mix(in srgb, var(--el-color-success) 12%, transparent);
}

.control-chip {
  cursor: pointer;
  color: var(--el-text-color-primary);
}

.chip-label {
  font-size: 13px;
  font-weight: 700;
}

.icon-btn {
  width: 38px;
  height: 38px;
  border-radius: 999px;
}

.user-chip {
  cursor: pointer;
  padding-right: 14px;
}

.user-avatar {
  width: 28px;
  height: 28px;
  border-radius: 999px;
  display: grid;
  place-items: center;
  background: color-mix(in srgb, var(--el-color-primary) 14%, transparent);
  color: var(--el-color-primary);
}

.user-copy {
  display: flex;
  flex-direction: column;
  line-height: 1.15;
}

.user-name {
  font-style: normal;
  font-size: 13px;
  font-weight: 700;
  color: var(--el-text-color-primary);
}

.user-role {
  margin-top: 2px;
  font-size: 11px;
  color: var(--el-text-color-secondary);
}

.mobile-menu-btn {
  border-radius: 12px;
}

.mobile-drawer-top {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.mobile-brand {
  display: flex;
  align-items: center;
  gap: 12px;
}

.mobile-brand-icon {
  width: 42px;
  height: 42px;
  border-radius: 14px;
  display: grid;
  place-items: center;
  font-size: 20px;
  background: linear-gradient(135deg, var(--el-color-primary-light-7), var(--el-color-primary-light-9));
}

.mobile-brand-title {
  font-size: 16px;
  font-weight: 800;
}

.mobile-brand-subtitle {
  margin-top: 2px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.mobile-user-card {
  padding: 12px 14px;
  border-radius: 16px;
  border: 1px solid var(--el-border-color-lighter);
  background: color-mix(in srgb, var(--el-fill-color-light) 88%, white 12%);
}

.mobile-user-name {
  font-size: 15px;
  font-weight: 800;
}

.mobile-user-role {
  margin-top: 4px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.mobile-nav-list {
  display: grid;
  gap: 10px;
  margin-top: 18px;
}

.mobile-nav-item {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 14px 16px;
  border-radius: 16px;
  border: 1px solid var(--el-border-color-lighter);
  background: var(--el-bg-color);
  color: var(--el-text-color-primary);
  font: inherit;
  cursor: pointer;
}

.mobile-nav-item.active {
  border-color: color-mix(in srgb, var(--el-color-primary) 24%, var(--el-border-color-light));
  background: color-mix(in srgb, var(--el-color-primary-light-8) 70%, white 30%);
  color: var(--el-color-primary);
  font-weight: 700;
}

.arrow {
  opacity: 0.55;
  font-size: 18px;
}

.mobile-controls {
  margin-top: 20px;
  display: grid;
  gap: 14px;
}

.mobile-control-row {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.mobile-label {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  font-weight: 700;
}

.theme-switch-btn,
.logout-btn {
  border-radius: 12px;
}

.desktop-only {
  display: flex;
}
.mobile-only {
  display: none;
}

:global(html.dark) .nav-shell {
  box-shadow: 0 14px 36px rgba(0, 0, 0, 0.24);
}

@media (max-width: 960px) {
  .status-chip {
    display: none;
  }
}

@media (max-width: 768px) {
  .navbar-vivid {
    padding: 8px 10px 0;
  }

  .nav-shell {
    padding: 10px 12px;
    border-radius: 18px;
  }

  .desktop-only {
    display: none !important;
  }

  .mobile-only {
    display: inline-flex;
  }

  .brand-subtitle {
    display: none;
  }

  .right {
    gap: 8px;
  }

  .user-chip {
    padding-right: 10px;
  }

  .user-copy {
    display: none;
  }
}

@media (max-width: 520px) {
  .brand-title {
    font-size: 15px;
  }

  .control-chip {
    padding: 0 10px;
  }
}
</style>
