<template>
  <div class="login-page-vivid">
    <div class="bg-layer bg-grid"></div>
    <div class="bg-layer bg-glow bg-glow-a"></div>
    <div class="bg-layer bg-glow bg-glow-b"></div>

    <section class="login-shell">
      <div class="login-layout">
        <div class="intro-panel">
          <div class="intro-badge">
            {{ text('login.heroBadge', 'QA / Lab / Report Platform') }}
          </div>

          <h1 class="intro-title">
            {{ text('login.title', '測試系統') }}
          </h1>

          <p class="intro-subtitle">
            {{ text('login.heroSubtitle', '整合測試、排程、檔案與設備管理，讓日常作業更直覺、更集中。') }}
          </p>

          <div class="intro-grid">
            <div class="intro-card">
              <div class="intro-card-label">{{ text('login.feature1Title', '多模組整合') }}</div>
              <div class="intro-card-value">{{ text('login.feature1Desc', '測試、檔案、設備、排程一站管理') }}</div>
            </div>

            <div class="intro-card">
              <div class="intro-card-label">{{ text('login.feature2Title', '主題切換') }}</div>
              <div class="intro-card-value">{{ text('login.feature2Desc', '亮色 / 暗色模式都能清楚閱讀') }}</div>
            </div>

            <div class="intro-card">
              <div class="intro-card-label">{{ text('login.feature3Title', '跨裝置操作') }}</div>
              <div class="intro-card-value">{{ text('login.feature3Desc', '桌機與手機都能流暢使用') }}</div>
            </div>
          </div>

          <div class="intro-footer">
            <div class="footer-item">
              <span class="footer-dot"></span>
              {{ text('login.footerHint1', '支援語系切換') }}
            </div>
            <div class="footer-item">
              <span class="footer-dot"></span>
              {{ text('login.footerHint2', '登入後依權限導向功能頁') }}
            </div>
          </div>
        </div>

        <el-card class="panel" shadow="never">
          <div class="panel-top">
            <div>
              <div class="panel-eyebrow">{{ text('login.panelEyebrow', 'Welcome Back') }}</div>
              <h2 class="panel-title">🛠️ {{ text('login.title', '測試系統') }}</h2>
            </div>

            <div class="panel-controls">
              <el-tag type="success" effect="dark" class="top-tag">
                {{ text('login.welcomeTag', 'Welcome') }}
              </el-tag>

              <el-select
                v-model="lang"
                size="small"
                class="lang-select"
                :placeholder="text('login.langPlaceholder', 'Language')"
              >
                <el-option
                  v-for="opt in langOptions"
                  :key="opt.value"
                  :label="opt.label"
                  :value="opt.value"
                />
              </el-select>

              <el-tooltip :content="text('login.tooltipTheme', '切換主題')" placement="bottom">
                <el-button
                  class="theme-btn"
                  size="small"
                  circle
                  text
                  @click="toggleTheme"
                  :aria-label="text('login.tooltipTheme', '切換主題')"
                >
                  <el-icon v-if="isDark"><Sunny /></el-icon>
                  <el-icon v-else><Moon /></el-icon>
                </el-button>
              </el-tooltip>
            </div>
          </div>

          <div class="panel-subtitle">
            {{ text('login.panelSubtitle', '請輸入帳號與密碼以繼續使用系統') }}
          </div>

          <el-alert
            v-if="capsOn"
            type="warning"
            show-icon
            :closable="false"
            :title="text('login.capsLockOn', 'Caps Lock 已開啟')"
            effect="light"
            class="caps-alert"
          />

          <el-form
            :model="form"
            :rules="rules"
            ref="formRef"
            label-position="top"
            class="login-form"
            @submit.prevent="login"
          >
            <el-form-item :label="text('login.fieldUsername', '帳號')" prop="username">
              <el-input
                ref="userRef"
                v-model.trim="form.username"
                autocomplete="username"
                size="large"
                @keydown.enter.exact="onEnter"
              >
                <template #prefix><el-icon><User /></el-icon></template>
              </el-input>
            </el-form-item>

            <el-form-item :label="text('login.fieldPassword', '密碼')" prop="password">
              <el-input
                ref="pwdRef"
                v-model.trim="form.password"
                type="password"
                show-password
                autocomplete="current-password"
                size="large"
                @keyup="detectCaps"
                @keydown="detectCaps"
                @keyup.enter="login"
              >
                <template #prefix><el-icon><Lock /></el-icon></template>
              </el-input>
            </el-form-item>

            <div class="form-row">
              <el-checkbox v-model="remember">
                {{ text('login.rememberMe', '記住我') }}
              </el-checkbox>

              <span class="spacer"></span>

              <el-button
                type="primary"
                size="large"
                :loading="loading"
                :disabled="loading || !form.username || !form.password"
                :icon="Check"
                native-type="button"
                class="login-btn"
                @click="login"
              >
                {{ text('login.btnLogin', '登入') }}
              </el-button>
            </div>

            <div class="link-row">
              <el-link type="primary" @click="$router.push('/register')">
                {{ text('login.linkRegister', '註冊') }}
              </el-link>
              <span class="sep">·</span>
              <el-link @click="$router.push('/reset-password')">
                {{ text('login.linkForgot', '忘記密碼') }}
              </el-link>
            </div>

            <p v-if="isDev" class="api-tip">
              {{ text('login.apiLabel', 'API：') }}
              <code>{{ apiBase }}</code>
            </p>
          </el-form>
        </el-card>
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, onBeforeUnmount, computed, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { ElMessage } from 'element-plus'
import { Check, User, Lock, Moon, Sunny } from '@element-plus/icons-vue'

const { t, te, locale } = useI18n()

function text (key, fallback, params) {
  if (te(key)) return t(key, params)
  if (!params) return fallback
  return String(fallback).replace(/\{(\w+)\}/g, (_, k) => String(params?.[k] ?? ''))
}

/** 語系選單：同步到 localStorage('lang') */
const langOptions = [
  { value: 'zh-TW', label: '繁體中文' },
  { value: 'en', label: 'English' }
]

const lang = computed({
  get () { return locale.value },
  set (val) {
    locale.value = val
    localStorage.setItem('lang', val)
  }
})

/** API Base：支援 localStorage 覆寫，並確保以 /api 結尾 */
function resolveApiBase () {
  const raw = (
    localStorage.getItem('apiBaseURL') ||
    import.meta.env.VITE_API_BASE ||
    '/api'
  ).trim()
  let base = raw.replace(/\/+$/, '')
  if (!/\/api$/i.test(base)) base += '/api'
  return base
}
const apiBase = resolveApiBase()
const isDev = computed(() => !!import.meta.env.DEV)

const route = useRoute()
const router = useRouter()

const loading = ref(false)
const remember = ref(true)
const capsOn = ref(false)

const formRef = ref()
const userRef = ref()
const pwdRef = ref()

const form = reactive({ username: '', password: '' })

/** rules 用 computed：切語系時錯誤訊息也會更新 */
const rules = computed(() => ({
  username: [{ required: true, message: text('login.ruleUsernameRequired', '請輸入帳號'), trigger: 'blur' }],
  password: [{ required: true, message: text('login.rulePasswordRequired', '請輸入密碼'), trigger: 'blur' }]
}))

/** CapsLock 偵測 */
function detectCaps (e) {
  try {
    if (e.getModifierState) {
      capsOn.value = !!e.getModifierState('CapsLock')
      return
    }
  } catch {}
  const k = e.key || ''
  if (k.length === 1 && /[a-zA-Z]/.test(k)) {
    const isUpper = k === k.toUpperCase()
    const shift = !!e.shiftKey
    capsOn.value = isUpper !== shift
  }
}

/* ===== 深色主題 ===== */
const isDark = ref(document.documentElement.classList.contains('dark'))

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

/* ===== 防止全域熱鍵 g/G 影響輸入 ===== */
function swallowGlobalG (e) {
  if (e?.isComposing) return
  const tag = (e.target?.tagName || '').toUpperCase()
  const isEditable = tag === 'INPUT' || tag === 'TEXTAREA' || e.target?.isContentEditable
  if (!isEditable) return
  const k = (e.key || '').toLowerCase()
  if (k === 'g' && !e.ctrlKey && !e.metaKey && !e.altKey) e.stopPropagation()
}

/* ===== Init ===== */
onMounted(async () => {
  const savedTheme = localStorage.getItem('theme')
  if (savedTheme === 'dark' || savedTheme === 'light') {
    applyTheme(savedTheme)
  } else if (window.matchMedia?.('(prefers-color-scheme: dark)').matches) {
    applyTheme('dark')
  }

  const remembered = localStorage.getItem('remember-username')
  if (remembered) {
    form.username = remembered
    remember.value = true
  }

  const savedLang = localStorage.getItem('lang')
  if (savedLang === 'zh-TW' || savedLang === 'en') {
    locale.value = savedLang
  }

  window.addEventListener('keydown', swallowGlobalG, true)

  await nextTick()
  userRef.value?.focus?.()
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', swallowGlobalG, true)
})

/* ===== 互動 ===== */
function onEnter () {
  pwdRef.value?.focus?.()
}

function safeRedirect (v) {
  const s = String(v || '')
  if (s.startsWith('/') && !s.startsWith('//')) return s
  return '/welcome'
}

async function login () {
  const ok = await formRef.value?.validate?.().catch(() => false)
  if (!ok) return

  loading.value = true
  try {
    const payload = {
      username: form.username.trim().toLowerCase(),
      password: form.password
    }

    const res = await fetch(`${apiBase}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })

    const j = await res.json().catch(() => null)

    if (!res.ok || !j?.token) {
      const msg = j?.message || text('login.message.failedWithStatus', '登入失敗（狀態碼：{status}）', { status: res.status })
      throw new Error(msg)
    }

    if (remember.value) {
      localStorage.setItem('token', j.token)
      localStorage.setItem('user', JSON.stringify(j.user || {}))
      localStorage.setItem('remember-username', payload.username)
      sessionStorage.removeItem('token')
      sessionStorage.removeItem('user')
    } else {
      sessionStorage.setItem('token', j.token)
      sessionStorage.setItem('user', JSON.stringify(j.user || {}))
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      localStorage.removeItem('remember-username')
    }

    ElMessage.success(text('login.message.success', '登入成功'))
    router.push(safeRedirect(route.query.redirect))
  } catch (e) {
    const msg = String(e?.message || '')
    if (msg.includes('Failed to fetch') || msg.includes('NetworkError')) {
      ElMessage.error(text('login.message.networkError', '網路連線失敗'))
    } else {
      ElMessage.error(msg || text('login.message.failedDefault', '登入失敗'))
    }
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-page-vivid {
  min-height: 100vh;
  position: relative;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 28px;
  background:
    linear-gradient(135deg, var(--el-bg-color-page) 0%, color-mix(in srgb, var(--el-bg-color-page) 88%, var(--el-color-primary-light-9) 12%) 100%);
}

.bg-layer {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.bg-grid {
  background-image:
    linear-gradient(color-mix(in srgb, var(--el-text-color-primary) 6%, transparent) 1px, transparent 1px),
    linear-gradient(90deg, color-mix(in srgb, var(--el-text-color-primary) 6%, transparent) 1px, transparent 1px);
  background-size: 28px 28px;
  mask-image: linear-gradient(to bottom, rgba(0,0,0,0.45), rgba(0,0,0,0));
}

.bg-glow {
  filter: blur(18px);
  opacity: 0.8;
}

.bg-glow-a {
  inset: auto auto 8% 8%;
  width: 320px;
  height: 320px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--el-color-primary) 22%, transparent);
}

.bg-glow-b {
  inset: 10% 8% auto auto;
  width: 360px;
  height: 360px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--el-color-success) 16%, transparent);
}

.login-shell {
  position: relative;
  z-index: 1;
  width: min(1120px, 100%);
}

.login-layout {
  display: grid;
  grid-template-columns: minmax(0, 1.08fr) minmax(380px, 440px);
  gap: 22px;
  align-items: stretch;
}

.intro-panel,
.panel {
  border-radius: 28px;
  border: 1px solid color-mix(in srgb, var(--el-border-color) 75%, transparent);
  background: color-mix(in srgb, var(--el-bg-color) 84%, transparent);
  backdrop-filter: blur(10px);
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.08);
}

.intro-panel {
  padding: 30px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  min-height: 560px;
}

.intro-badge {
  display: inline-flex;
  align-items: center;
  width: fit-content;
  padding: 6px 12px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--el-color-primary-light-8) 72%, white 28%);
  color: var(--el-color-primary);
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.04em;
}

.intro-title {
  margin: 18px 0 0;
  font-size: 46px;
  line-height: 1.05;
  font-weight: 900;
  letter-spacing: 0.01em;
}

.intro-subtitle {
  margin: 14px 0 0;
  max-width: 540px;
  font-size: 16px;
  line-height: 1.8;
  color: var(--el-text-color-secondary);
}

.intro-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
  margin-top: 28px;
}

.intro-card {
  padding: 16px 18px;
  border-radius: 20px;
  border: 1px solid var(--el-border-color-lighter);
  background:
    linear-gradient(180deg, color-mix(in srgb, var(--el-fill-color-light) 86%, white 14%) 0%, var(--el-bg-color) 100%);
}

.intro-card-label {
  font-size: 13px;
  color: var(--el-text-color-secondary);
  margin-bottom: 8px;
  font-weight: 700;
}

.intro-card-value {
  font-size: 15px;
  line-height: 1.6;
  font-weight: 800;
}

.intro-footer {
  display: flex;
  flex-wrap: wrap;
  gap: 14px 18px;
  margin-top: 28px;
}

.footer-item {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: var(--el-text-color-regular);
  font-size: 13px;
}

.footer-dot {
  width: 8px;
  height: 8px;
  border-radius: 999px;
  background: var(--el-color-primary);
  box-shadow: 0 0 0 6px color-mix(in srgb, var(--el-color-primary) 16%, transparent);
}

.panel {
  padding: 24px 24px 20px;
}

.panel-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 8px;
}

.panel-eyebrow {
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.08em;
  color: var(--el-color-primary);
  margin-bottom: 4px;
}

.panel-title {
  margin: 0;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 28px;
  line-height: 1.15;
}

.panel-controls {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.top-tag {
  border-radius: 999px;
}

.theme-btn {
  margin-left: 2px;
}

.lang-select {
  width: 122px;
}

.panel-subtitle {
  color: var(--el-text-color-secondary);
  font-size: 14px;
  margin-bottom: 14px;
  line-height: 1.6;
}

.caps-alert {
  margin-bottom: 10px;
  border-radius: 14px;
}

.login-form {
  margin-top: 4px;
}

.form-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 4px;
}

.spacer {
  flex: 1;
}

.login-btn {
  min-width: 132px;
  border-radius: 14px;
}

.link-row {
  margin-top: 12px;
  display: flex;
  align-items: center;
  gap: 6px;
  justify-content: flex-end;
}

.link-row .sep {
  color: var(--el-text-color-secondary);
}

.api-tip {
  margin-top: 12px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
  line-height: 1.6;
}

:deep(.el-input__wrapper),
:deep(.el-select__wrapper) {
  border-radius: 14px;
}

:global(html.dark) .intro-panel,
:global(html.dark) .panel {
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.24);
}

@media (max-width: 980px) {
  .login-layout {
    grid-template-columns: 1fr;
  }

  .intro-panel {
    min-height: auto;
  }

  .intro-grid {
    grid-template-columns: 1fr 1fr 1fr;
  }
}

@media (max-width: 720px) {
  .login-page-vivid {
    padding: 14px;
  }

  .intro-panel {
    padding: 22px;
  }

  .intro-title {
    font-size: 34px;
  }

  .intro-grid {
    grid-template-columns: 1fr;
  }

  .panel {
    padding: 18px;
  }

  .panel-top {
    flex-direction: column;
  }

  .panel-controls {
    width: 100%;
    justify-content: flex-start;
  }

  .lang-select {
    width: 116px;
  }
}

@media (max-width: 520px) {
  .login-page-vivid {
    padding: 10px;
  }

  .panel-title {
    font-size: 24px;
  }

  .intro-title {
    font-size: 28px;
  }

  .form-row {
    flex-wrap: wrap;
  }

  .login-btn {
    width: 100%;
  }

  .link-row {
    justify-content: center;
  }
}
</style>
