<!-- frontend/src/views/ResetPassword.vue -->
<template>
  <div class="login-page">
    <div class="bg"></div>

    <el-card class="panel" shadow="never">
      <div class="brand-row">
        <h2 class="brand">🔑 {{ tx('resetPassword.title', '重設密碼', 'Reset Password') }}</h2>
        <el-tag effect="dark">
          {{ tx('resetPassword.subtitle', '變更自己的密碼', 'Change your own password') }}
        </el-tag>
      </div>

      <el-alert
        type="info"
        show-icon
        :closable="false"
        style="margin-bottom:12px"
        :title="tx(
          'resetPassword.tip',
          '請輸入帳號與目前密碼，設定新密碼後會要求重新登入。',
          'Enter your username and current password, then set a new password. You will be asked to sign in again.'
        )"
      />

      <el-alert
        v-if="lockedUser"
        type="success"
        show-icon
        :closable="false"
        style="margin-bottom:12px"
        :title="tx(
          'resetPassword.lockedHint',
          `目前登入帳號：${form.username}`,
          `Signed in as: ${form.username}`
        )"
      />

      <el-form
        :model="form"
        :rules="rules"
        ref="formRef"
        label-position="top"
        @keyup.enter="submit"
      >
        <el-form-item :label="tx('resetPassword.fieldUsername', '帳號', 'Username')" prop="username">
          <el-input
            v-model.trim="form.username"
            autocomplete="username"
            :disabled="lockedUser"
          />
        </el-form-item>

        <el-form-item :label="tx('resetPassword.fieldOldPassword', '目前密碼', 'Current Password')" prop="oldPassword">
          <!-- ✅ 不用 trim，避免改掉使用者輸入 -->
          <el-input
            v-model="form.oldPassword"
            type="password"
            show-password
            autocomplete="current-password"
            @keydown="checkCaps($event, 'old')"
          />
          <div v-if="caps.old" class="caps-warn">
            {{ tx('resetPassword.capsOn', 'CapsLock 已開啟', 'CapsLock is ON') }}
          </div>
        </el-form-item>

        <el-form-item :label="tx('resetPassword.fieldNewPassword', '新密碼', 'New Password')" prop="newPassword">
          <!-- ✅ 不用 trim，避免改掉使用者輸入 -->
          <el-input
            v-model="form.newPassword"
            type="password"
            show-password
            autocomplete="new-password"
            @input="onPasswordInput"
            @keydown="checkCaps($event, 'new')"
          />

          <div class="hint">
            <el-progress
              :percentage="strength.pct"
              :status="strength.status"
              :stroke-width="8"
              style="width: 100%; margin-top: 6px"
            />
            <small class="muted">{{ strengthText }}</small>
          </div>

          <div v-if="caps.new" class="caps-warn">
            {{ tx('resetPassword.capsOn', 'CapsLock 已開啟', 'CapsLock is ON') }}
          </div>
        </el-form-item>

        <el-form-item :label="tx('resetPassword.fieldConfirm', '確認新密碼', 'Confirm New Password')" prop="confirm">
          <el-input
            v-model="form.confirm"
            type="password"
            show-password
            autocomplete="new-password"
            @keydown="checkCaps($event, 'confirm')"
          />
          <div v-if="caps.confirm" class="caps-warn">
            {{ tx('resetPassword.capsOn', 'CapsLock 已開啟', 'CapsLock is ON') }}
          </div>
        </el-form-item>

        <div class="form-row">
          <el-button
            type="primary"
            :loading="loading"
            :icon="Check"
            @click="submit"
            :disabled="loading"
          >
            {{ tx('resetPassword.btnSubmit', '變更密碼', 'Update Password') }}
          </el-button>

          <span class="spacer"></span>

          <el-button :disabled="loading" @click="goLogin">
            {{ tx('resetPassword.btnBackLogin', '回登入', 'Back to Login') }}
          </el-button>
        </div>
      </el-form>
    </el-card>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { ElMessage } from 'element-plus'
import { Check } from '@element-plus/icons-vue'
import getApiBase from '@/utils/apiBase'

const { t, locale } = useI18n()
const apiBase = getApiBase()
const router = useRouter()

/* i18n fallback：key 不存在就用預設字串（依語系切換） */
const L = (zh, en) => (String(locale.value || '').toLowerCase().startsWith('en') ? en : zh)
const tx = (key, zh, en) => {
  const v = t(key)
  return v === key ? L(zh, en) : v
}

/* localStorage / sessionStorage */
function getStoredUser () {
  const raw = localStorage.getItem('user') || sessionStorage.getItem('user') || 'null'
  try { return JSON.parse(raw) } catch { return null }
}
function getStoredToken () {
  return localStorage.getItem('token') || sessionStorage.getItem('token') || ''
}
function cleanAuth () {
  localStorage.removeItem('token')
  localStorage.removeItem('user')
  sessionStorage.removeItem('token')
  sessionStorage.removeItem('user')
}

const loading = ref(false)
const formRef = ref()

const form = reactive({
  username: '',
  oldPassword: '',
  newPassword: '',
  confirm: ''
})

/* 若已登入：鎖住 username，確保只能改自己 */
const lockedUser = ref(false)

onMounted(() => {
  const token = getStoredToken()
  const u = getStoredUser()
  if (token && u?.username) {
    form.username = String(u.username || '')
    lockedUser.value = true
  }
  calcStrength()
})

/* CapsLock */
const caps = reactive({ old: false, new: false, confirm: false })
function checkCaps (e, key) {
  caps[key] = !!e.getModifierState && e.getModifierState('CapsLock')
}

/* 密碼強度 */
const strength = reactive({ pct: 0, status: 'exception' })
const strengthText = computed(() => {
  if (!form.newPassword) return tx('resetPassword.strengthNone', '請輸入新密碼', 'Please enter a new password')
  if (strength.pct >= 80) return tx('resetPassword.strengthStrong', '強度：高', 'Strength: Strong')
  if (strength.pct >= 50) return tx('resetPassword.strengthMedium', '強度：中', 'Strength: Medium')
  return tx('resetPassword.strengthWeak', '強度：低', 'Strength: Weak')
})

function calcStrength () {
  const v = String(form.newPassword || '')
  let score = 0
  if (v.length >= 8) score += 25
  if (/[A-Z]/.test(v) && /[a-z]/.test(v)) score += 25
  if (/\d/.test(v)) score += 20
  if (/[^A-Za-z0-9]/.test(v)) score += 20
  if (v.length >= 12) score += 10

  strength.pct = Math.min(100, score)
  if (score >= 80) strength.status = 'success'
  else if (score >= 50) strength.status = 'warning'
  else strength.status = 'exception'
}

function onPasswordInput () {
  calcStrength()
  formRef.value?.validateField?.('confirm').catch(() => {})
}

watch(() => form.newPassword, () => {
  calcStrength()
  if (form.confirm) formRef.value?.validateField?.('confirm').catch(() => {})
})

/* rules */
const rules = computed(() => ({
  username: [
    { required: true, message: tx('resetPassword.ruleUsernameRequired', '請輸入帳號', 'Username is required'), trigger: 'blur' }
  ],
  oldPassword: [
    { required: true, message: tx('resetPassword.ruleOldRequired', '請輸入目前密碼', 'Current password is required'), trigger: 'blur' }
  ],
  newPassword: [
    { required: true, message: tx('resetPassword.ruleNewRequired', '請輸入新密碼', 'New password is required'), trigger: 'blur' },
    { min: 8, message: tx('resetPassword.ruleNewMin', '新密碼至少 8 碼', 'New password must be at least 8 characters'), trigger: 'blur' }
  ],
  confirm: [
    { required: true, message: tx('resetPassword.ruleConfirmRequired', '請再次輸入新密碼', 'Please confirm the new password'), trigger: 'blur' },
    {
      validator: (_r, v, cb) =>
        v === form.newPassword
          ? cb()
          : cb(new Error(tx('resetPassword.ruleConfirmMismatch', '兩次輸入的新密碼不一致', 'Passwords do not match'))),
      trigger: ['blur', 'change']
    }
  ]
}))

async function readJsonSafe (res) {
  try { return await res.json() } catch { return {} }
}

function goLogin () {
  router.push('/login')
}

/**
 * 變更密碼流程：
 * - 若已有 token：直接 /auth/change-password
 * - 若無 token：先 /auth/login 取得 token，再 /auth/change-password
 */
async function submit () {
  if (loading.value) return

  // 表單驗證
  try {
    await formRef.value?.validate()
  } catch {
    return
  }

  loading.value = true
  try {
    const username = String(form.username || '').trim().toLowerCase()
    if (!username) {
      throw new Error(tx('resetPassword.ruleUsernameRequired', '請輸入帳號', 'Username is required'))
    }

    let token = getStoredToken()

    // 未登入：先 login 拿 token（用「目前密碼」當登入密碼）
    if (!token) {
      const resLogin = await fetch(`${apiBase}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password: form.oldPassword })
      })

      const jLogin = await readJsonSafe(resLogin)
      if (!resLogin.ok || !jLogin?.token) {
        throw new Error(jLogin?.message || tx('resetPassword.loginFailed', '帳號或目前密碼錯誤', 'Invalid username or current password'))
      }
      token = jLogin.token
    }

    // change-password
    const res = await fetch(`${apiBase}/auth/change-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        oldPassword: form.oldPassword,
        newPassword: form.newPassword
      })
    })

    const j = await readJsonSafe(res)
    if (!res.ok) {
      if (res.status === 401) {
        cleanAuth()
        throw new Error(tx('resetPassword.sessionExpired', '登入狀態已過期，請重新登入', 'Session expired, please sign in again'))
      }
      throw new Error(j?.message || tx('resetPassword.failed', '重設密碼失敗', 'Failed to reset password'))
    }

    ElMessage.success(tx('resetPassword.success', '✅ 密碼已更新，請重新登入', '✅ Password updated. Please sign in again.'))

    // 成功後清除登入狀態 → 回登入
    cleanAuth()
    goLogin()
  } catch (e) {
    const msg = String(e?.message || '')
    if (msg.includes('Failed to fetch') || msg.includes('NetworkError')) {
      ElMessage.error(tx('resetPassword.networkError', '網路錯誤，請稍後再試', 'Network error, please try again'))
    } else {
      ElMessage.error(msg || tx('resetPassword.failed', '重設密碼失敗', 'Failed to reset password'))
    }
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  display: grid;
  place-items: center;
  position: relative;
  overflow: hidden;
}
.bg {
  position: absolute;
  inset: 0;
  background: var(--app-login-bg);
  filter: blur(2px);
}
.panel {
  width: 480px;
  border-radius: 16px;
  backdrop-filter: blur(2px);
}
.brand-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}
.brand { margin: 0; }

.form-row {
  display: flex;
  align-items: center;
  gap: 8px;
}
.spacer { flex: 1; }

.hint { width: 100%; }
.muted { color: var(--el-text-color-secondary); }
.caps-warn { margin-top: 6px; font-size: 12px; color: var(--el-color-error); }

/* ✅ scoped 下改全域變數要用 :global */
:global(:root) {
  --app-login-bg:
    radial-gradient(1000px 600px at 10% -10%, #eaf5ff, transparent),
    radial-gradient(800px 500px at 110% 20%, #f6faff, transparent);
}
:global(html.dark) {
  --app-login-bg:
    radial-gradient(1000px 600px at 10% -10%, rgba(70, 80, 90, 0.35), transparent),
    radial-gradient(800px 500px at 110% 20%, rgba(60, 70, 80, 0.25), transparent);
}
</style>
