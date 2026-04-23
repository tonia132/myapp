<template>
  <div class="page center">
    <el-card class="card" shadow="hover">
      <template #header>
        <div class="card-header">
          <h2>🔑 {{ t('changePassword.title') }}</h2>
          <el-tag type="info" effect="plain">
            {{ t('changePassword.hint') }}
          </el-tag>
        </div>
      </template>

      <el-form
        ref="formRef"
        :model="form"
        :rules="rules"
        label-width="120px"
      >
        <el-form-item :label="t('changePassword.currentLabel')" prop="oldPassword">
          <el-input
            v-model.trim="form.oldPassword"
            type="password"
            show-password
            autocomplete="current-password"
            @keyup.enter="submit"
            @keydown="checkCaps($event, 'old')"
          />
          <div v-if="caps.old" class="caps-warn">
            {{ t('changePassword.capsOn') }}
          </div>
        </el-form-item>

        <el-form-item :label="t('changePassword.newLabel')" prop="newPassword">
          <el-input
            v-model.trim="form.newPassword"
            type="password"
            show-password
            autocomplete="new-password"
            @input="calcStrength"
            @keyup.enter="submit"
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
            {{ t('changePassword.capsOn') }}
          </div>
        </el-form-item>

        <el-form-item :label="t('changePassword.confirmLabel')" prop="confirm">
          <el-input
            v-model.trim="form.confirm"
            type="password"
            show-password
            autocomplete="new-password"
            @keyup.enter="submit"
            @keydown="checkCaps($event, 'confirm')"
          />
          <div v-if="caps.confirm" class="caps-warn">
            {{ t('changePassword.capsOn') }}
          </div>
        </el-form-item>

        <el-form-item>
          <el-button
            type="primary"
            :loading="loading"
            :icon="Check"
            :disabled="!canSubmit || loading"
            @click="submit"
          >
            {{ t('changePassword.btnSubmit') }}
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<script setup>
import { ref, reactive, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { Check } from '@element-plus/icons-vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const apiBase = import.meta.env.VITE_API_BASE || '/api'
const loading = ref(false)

const formRef = ref()
const form = reactive({ oldPassword: '', newPassword: '', confirm: '' })

const rules = computed(() => ({
  oldPassword: [
    {
      required: true,
      message: t('changePassword.rules.oldRequired'),
      trigger: 'blur',
    },
  ],
  newPassword: [
    {
      required: true,
      message: t('changePassword.rules.newRequired'),
      trigger: ['blur', 'change'],
    },
    {
      min: 8,
      message: t('changePassword.rules.minLength'),
      trigger: ['blur', 'change'],
    },
    {
      validator: (_, v, cb) => {
        const conds = [
          /[a-z]/.test(v),
          /[A-Z]/.test(v),
          /\d/.test(v),
          /[^A-Za-z0-9]/.test(v),
        ].filter(Boolean).length
        return conds >= 2
          ? cb()
          : cb(new Error(t('changePassword.rules.mixTypes')))
      },
      trigger: ['blur', 'change'],
    },
  ],
  confirm: [
    {
      required: true,
      message: t('changePassword.rules.confirmRequired'),
      trigger: ['blur', 'change'],
    },
    {
      validator: (_, v, cb) =>
        v === form.newPassword
          ? cb()
          : cb(new Error(t('changePassword.rules.mismatch'))),
      trigger: ['blur', 'change'],
    },
  ],
}))

const strength = reactive({ pct: 0, status: 'exception' })

const strengthText = computed(() => {
  if (!form.newPassword) return t('changePassword.strengthNone')
  if (strength.pct >= 80) return t('changePassword.strengthHigh')
  if (strength.pct >= 50) return t('changePassword.strengthMedium')
  return t('changePassword.strengthLow')
})

function calcStrength () {
  const v = form.newPassword || ''
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

const canSubmit = computed(
  () =>
    form.oldPassword &&
    form.newPassword &&
    form.confirm === form.newPassword &&
    strength.pct >= 50 // 至少中等強度才開放
)

function authHeaders () {
  const token = localStorage.getItem('token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

const caps = reactive({ old: false, new: false, confirm: false })
function checkCaps (e, key) {
  caps[key] = !!e.getModifierState && e.getModifierState('CapsLock')
}

async function submit () {
  await formRef.value?.validate()
  if (!canSubmit.value) return
  loading.value = true
  try {
    const res = await fetch(`${apiBase}/auth/change-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({
        oldPassword: form.oldPassword,
        newPassword: form.newPassword,
      }),
    })

    if (!res.ok) {
      if (res.status === 401) {
        ElMessage.error(t('auth.sessionExpired'))
        localStorage.removeItem('token')
        location.href = '/login'
        return
      }
      let msg = t('changePassword.messages.failedCheck')
      try {
        const j = await res.json()
        if (j?.message) msg = j.message
      } catch {}
      throw new Error(msg)
    }

    ElMessage.success(t('changePassword.messages.updated'))
    localStorage.removeItem('token')
    location.href = '/login'
  } catch (e) {
    console.error(e)
    ElMessage.error(e.message || t('changePassword.messages.failedGeneric'))
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.page { padding: 20px; }
.center {
  min-height: calc(100vh - 40px);
  display: grid;
  place-items: center;
  background: var(--app-login-bg);
}
.card { width: 560px; border-radius: 14px; }
.card-header { display:flex; align-items:center; justify-content:space-between; }
.hint { width:100%; }
.muted { color: var(--el-text-color-secondary); }
.caps-warn { margin-top: 6px; font-size: 12px; color: var(--el-color-error); }

:root {
  --app-login-bg:
    radial-gradient(1000px 600px at 10% -10%, #eaf5ff, transparent),
    radial-gradient(800px 500px at 110% 20%, #f6faff, transparent);
}
.dark {
  --app-login-bg:
    radial-gradient(1000px 600px at 10% -10%, rgba(70,80,90,.35), transparent),
    radial-gradient(800px 500px at 110% 20%, rgba(60,70,80,.25), transparent);
}
</style>
