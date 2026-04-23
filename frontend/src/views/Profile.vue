<template>
  <div class="profile-page">
    <section class="hero-card">
      <div class="hero-left">
        <div class="hero-icon">👤</div>
        <div class="hero-text">
          <h2 class="hero-title">{{ t('profilePage.title') }}</h2>
          <p class="hero-subtitle">{{ t('profilePage.subtitle') }}</p>
        </div>
      </div>

      <div class="hero-right">
        <el-tag type="info" effect="plain">
          {{ currentUser?.role || t('profilePage.defaultRole') }}
        </el-tag>
      </div>
    </section>

    <div class="content-grid">
      <!-- 基本資料 -->
      <el-card class="section-card" shadow="hover">
        <template #header>
          <div class="section-header">
            <div>
              <div class="section-title">{{ t('profilePage.basic.title') }}</div>
              <div class="section-desc">{{ t('profilePage.basic.desc') }}</div>
            </div>
            <el-tag type="success" effect="plain">
              {{ t('profilePage.basic.tag') }}
            </el-tag>
          </div>
        </template>

        <el-form
          ref="profileFormRef"
          :model="profileForm"
          :rules="profileRules"
          label-width="110px"
          class="profile-form"
        >
          <el-form-item :label="t('profilePage.fields.username')">
            <el-input v-model="profileForm.username" disabled />
          </el-form-item>

          <el-form-item :label="t('profilePage.fields.role')">
            <el-input v-model="profileForm.role" disabled />
          </el-form-item>

          <el-form-item
            :label="t('profilePage.fields.displayName')"
            prop="displayName"
          >
            <el-input
              v-model.trim="profileForm.displayName"
              maxlength="50"
              show-word-limit
              :placeholder="t('profilePage.placeholders.displayName')"
              @keyup.enter="saveProfile"
            />
          </el-form-item>

          <el-form-item>
            <el-button
              type="primary"
              :loading="savingProfile"
              @click="saveProfile"
            >
              {{ t('profilePage.actions.saveDisplayName') }}
            </el-button>
          </el-form-item>
        </el-form>
      </el-card>

      <!-- 修改密碼 -->
      <el-card class="section-card" shadow="hover">
        <template #header>
          <div class="section-header">
            <div>
              <div class="section-title">{{ t('profilePage.security.title') }}</div>
              <div class="section-desc">{{ t('profilePage.security.desc') }}</div>
            </div>
            <el-tag type="warning" effect="plain">
              {{ t('profilePage.security.tag') }}
            </el-tag>
          </div>
        </template>

        <el-form
          ref="passwordFormRef"
          :model="passwordForm"
          :rules="passwordRules"
          label-width="110px"
          class="profile-form"
        >
          <el-form-item
            :label="t('profilePage.fields.oldPassword')"
            prop="oldPassword"
          >
            <el-input
              v-model.trim="passwordForm.oldPassword"
              type="password"
              show-password
              autocomplete="current-password"
              :placeholder="t('profilePage.placeholders.oldPassword')"
              @keydown="checkCaps($event, 'old')"
              @keyup.enter="submitPassword"
            />
            <div v-if="caps.old" class="caps-warn">
              {{ t('profilePage.messages.capsLockOn') }}
            </div>
          </el-form-item>

          <el-form-item
            :label="t('profilePage.fields.newPassword')"
            prop="newPassword"
          >
            <el-input
              v-model.trim="passwordForm.newPassword"
              type="password"
              show-password
              autocomplete="new-password"
              :placeholder="t('profilePage.placeholders.newPassword')"
              @input="calcStrength"
              @keydown="checkCaps($event, 'new')"
              @keyup.enter="submitPassword"
            />
            <div class="strength-wrap">
              <el-progress
                :percentage="strength.pct"
                :status="strength.status"
                :stroke-width="8"
              />
              <div class="strength-text">{{ strengthText }}</div>
            </div>
            <div v-if="caps.new" class="caps-warn">
              {{ t('profilePage.messages.capsLockOn') }}
            </div>
          </el-form-item>

          <el-form-item
            :label="t('profilePage.fields.confirmPassword')"
            prop="confirm"
          >
            <el-input
              v-model.trim="passwordForm.confirm"
              type="password"
              show-password
              autocomplete="new-password"
              :placeholder="t('profilePage.placeholders.confirmPassword')"
              @keydown="checkCaps($event, 'confirm')"
              @keyup.enter="submitPassword"
            />
            <div v-if="caps.confirm" class="caps-warn">
              {{ t('profilePage.messages.capsLockOn') }}
            </div>
          </el-form-item>

          <el-form-item>
            <el-button
              type="primary"
              :loading="savingPassword"
              :disabled="!canSubmitPassword || savingPassword"
              @click="submitPassword"
            >
              {{ t('profilePage.actions.updatePassword') }}
            </el-button>
          </el-form-item>
        </el-form>
      </el-card>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useI18n } from 'vue-i18n'

const router = useRouter()
const { t } = useI18n()

const apiBase = import.meta.env.VITE_API_BASE || '/api'
const PROFILE_API = `${apiBase}/users/me`
const CHANGE_PASSWORD_API = `${apiBase}/auth/change-password`

function getToken () {
  return localStorage.getItem('token') || sessionStorage.getItem('token') || ''
}

function getStoredUser () {
  try {
    return JSON.parse(
      localStorage.getItem('user') ||
      sessionStorage.getItem('user') ||
      'null'
    )
  } catch {
    return null
  }
}

function setStoredUser (nextUser) {
  const raw = JSON.stringify(nextUser)

  if (localStorage.getItem('user') != null) {
    localStorage.setItem('user', raw)
  }
  if (sessionStorage.getItem('user') != null) {
    sessionStorage.setItem('user', raw)
  }
  if (localStorage.getItem('user') == null && sessionStorage.getItem('user') == null) {
    localStorage.setItem('user', raw)
  }

  window.dispatchEvent(new Event('user-updated'))
}

function clearAuth () {
  localStorage.removeItem('token')
  localStorage.removeItem('user')
  sessionStorage.removeItem('token')
  sessionStorage.removeItem('user')
}

function authHeaders () {
  const token = getToken()
  return token ? { Authorization: `Bearer ${token}` } : {}
}

async function parseJsonSafe (res) {
  try {
    return await res.json()
  } catch {
    return null
  }
}

async function validateForm (formRef) {
  if (!formRef?.value) return false
  try {
    const ok = await formRef.value.validate()
    return !!ok
  } catch {
    return false
  }
}

const currentUser = ref(getStoredUser())

/* ---------------- 基本資料 ---------------- */
const profileFormRef = ref()
const savingProfile = ref(false)

const profileForm = reactive({
  username: '',
  role: '',
  displayName: ''
})

const profileRules = computed(() => ({
  displayName: [
    { required: true, message: t('profilePage.validation.displayNameRequired'), trigger: 'blur' },
    { min: 2, max: 50, message: t('profilePage.validation.displayNameLength'), trigger: 'blur' }
  ]
}))

function fillProfileFromUser () {
  const u = currentUser.value || {}
  profileForm.username = u.username || ''
  profileForm.role = u.role || ''
  profileForm.displayName = u.displayName || u.name || u.username || ''
}

async function saveProfile () {
  const valid = await validateForm(profileFormRef)
  if (!valid) return

  savingProfile.value = true
  try {
    const res = await fetch(PROFILE_API, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders()
      },
      body: JSON.stringify({
        displayName: profileForm.displayName,
        name: profileForm.displayName
      })
    })

    const payload = await parseJsonSafe(res)

    if (!res.ok) {
      if (res.status === 401) {
        ElMessage.error(t('profilePage.messages.sessionExpired'))
        clearAuth()
        router.replace('/login')
        return
      }

      throw new Error(payload?.message || t('profilePage.messages.displayNameUpdateFailed'))
    }

    const mergedUser = {
      ...(currentUser.value || {}),
      ...(payload?.user || payload?.data || {}),
      displayName: profileForm.displayName,
      name: profileForm.displayName
    }

    currentUser.value = mergedUser
    setStoredUser(mergedUser)
    fillProfileFromUser()

    ElMessage.success(t('profilePage.messages.displayNameUpdated'))
  } catch (err) {
    console.error(err)
    ElMessage.error(err?.message || t('profilePage.messages.displayNameUpdateFailed'))
  } finally {
    savingProfile.value = false
  }
}

/* ---------------- 修改密碼 ---------------- */
const passwordFormRef = ref()
const savingPassword = ref(false)

const passwordForm = reactive({
  oldPassword: '',
  newPassword: '',
  confirm: ''
})

const passwordRules = computed(() => ({
  oldPassword: [
    { required: true, message: t('profilePage.validation.oldPasswordRequired'), trigger: 'blur' }
  ],
  newPassword: [
    { required: true, message: t('profilePage.validation.newPasswordRequired'), trigger: ['blur', 'change'] },
    { min: 8, message: t('profilePage.validation.newPasswordMin'), trigger: ['blur', 'change'] },
    {
      validator: (_, value, callback) => {
        const v = String(value || '')
        const kinds = [
          /[a-z]/.test(v),
          /[A-Z]/.test(v),
          /\d/.test(v),
          /[^A-Za-z0-9]/.test(v)
        ].filter(Boolean).length

        if (kinds < 2) {
          callback(new Error(t('profilePage.validation.newPasswordKinds')))
          return
        }
        callback()
      },
      trigger: ['blur', 'change']
    }
  ],
  confirm: [
    { required: true, message: t('profilePage.validation.confirmRequired'), trigger: ['blur', 'change'] },
    {
      validator: (_, value, callback) => {
        if (value !== passwordForm.newPassword) {
          callback(new Error(t('profilePage.validation.confirmMismatch')))
          return
        }
        callback()
      },
      trigger: ['blur', 'change']
    }
  ]
}))

const strength = reactive({
  pct: 0,
  status: 'exception'
})

const strengthText = computed(() => {
  if (!passwordForm.newPassword) return t('profilePage.strength.empty')
  if (strength.pct >= 80) return t('profilePage.strength.high')
  if (strength.pct >= 50) return t('profilePage.strength.medium')
  return t('profilePage.strength.low')
})

function calcStrength () {
  const v = passwordForm.newPassword || ''
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

const caps = reactive({
  old: false,
  new: false,
  confirm: false
})

function checkCaps (e, key) {
  caps[key] = !!e.getModifierState && e.getModifierState('CapsLock')
}

const canSubmitPassword = computed(() => {
  return (
    !!passwordForm.oldPassword &&
    !!passwordForm.newPassword &&
    !!passwordForm.confirm &&
    passwordForm.confirm === passwordForm.newPassword &&
    strength.pct >= 50
  )
})

function resetPasswordForm () {
  passwordForm.oldPassword = ''
  passwordForm.newPassword = ''
  passwordForm.confirm = ''
  caps.old = false
  caps.new = false
  caps.confirm = false
  calcStrength()
  passwordFormRef.value?.clearValidate?.()
}

async function submitPassword () {
  const valid = await validateForm(passwordFormRef)
  if (!valid || !canSubmitPassword.value) return

  savingPassword.value = true
  try {
    const res = await fetch(CHANGE_PASSWORD_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders()
      },
      body: JSON.stringify({
        oldPassword: passwordForm.oldPassword,
        newPassword: passwordForm.newPassword
      })
    })

    const payload = await parseJsonSafe(res)

    if (!res.ok) {
      if (res.status === 401) {
        ElMessage.error(t('profilePage.messages.sessionExpired'))
        clearAuth()
        router.replace('/login')
        return
      }

      throw new Error(payload?.message || t('profilePage.messages.passwordUpdateFailed'))
    }

    ElMessage.success(t('profilePage.messages.passwordUpdatedRelogin'))
    resetPasswordForm()
    clearAuth()
    router.replace('/login')
  } catch (err) {
    console.error(err)
    ElMessage.error(err?.message || t('profilePage.messages.passwordUpdateFailed'))
  } finally {
    savingPassword.value = false
  }
}

onMounted(() => {
  currentUser.value = getStoredUser()
  fillProfileFromUser()
  calcStrength()
})
</script>

<style scoped>
.profile-page {
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 18px;
  min-height: 100%;
  background: transparent;
}

.hero-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 20px 22px;
  border-radius: 20px;
  background:
    linear-gradient(135deg, rgba(64, 158, 255, 0.14), rgba(103, 194, 58, 0.08)),
    var(--el-bg-color);
  border: 1px solid var(--el-border-color-light);
  box-shadow: 0 10px 24px rgba(0, 0, 0, 0.04);
}

.hero-left {
  display: flex;
  align-items: center;
  gap: 14px;
  min-width: 0;
}

.hero-icon {
  width: 52px;
  height: 52px;
  border-radius: 16px;
  display: grid;
  place-items: center;
  font-size: 24px;
  background: rgba(64, 158, 255, 0.12);
}

.hero-text {
  min-width: 0;
}

.hero-title {
  margin: 0 0 4px;
  font-size: 24px;
  font-weight: 800;
  color: var(--el-text-color-primary);
}

.hero-subtitle {
  margin: 0;
  color: var(--el-text-color-secondary);
  font-size: 13px;
}

.content-grid {
  display: grid;
  grid-template-columns: minmax(320px, 1fr) minmax(320px, 1fr);
  gap: 18px;
}

.section-card {
  border-radius: 20px;
  border: 1px solid var(--el-border-color-lighter);
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.section-title {
  font-size: 18px;
  font-weight: 700;
  color: var(--el-text-color-primary);
  line-height: 1.2;
}

.section-desc {
  margin-top: 4px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.profile-form {
  padding-top: 4px;
}

.strength-wrap {
  width: 100%;
  margin-top: 8px;
}

.strength-text {
  margin-top: 6px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.caps-warn {
  margin-top: 6px;
  font-size: 12px;
  color: var(--el-color-danger);
}

@media (max-width: 980px) {
  .content-grid {
    grid-template-columns: 1fr;
  }

  .hero-card {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>