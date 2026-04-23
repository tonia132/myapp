<!-- frontend/src/views/ForgotPassword.vue -->
<template>
  <div class="login-page">
    <div class="bg"></div>
    <el-card class="panel" shadow="never">
      <div class="brand-row">
        <h2 class="brand">🔑 {{ t('forgotPassword.title') }}</h2>
        <el-tag effect="dark">{{ t('forgotPassword.subtitle') }}</el-tag>
      </div>

      <el-alert
        v-if="!form.token"
        type="warning"
        show-icon
        class="mb8"
        :title="t('forgotPassword.tokenMissingAlert')"
      />

      <el-form
        :model="form"
        :rules="rules"
        ref="formRef"
        label-position="top"
      >
        <el-form-item :label="t('forgotPassword.fieldToken')" prop="token">
          <el-input
            v-model.trim="form.token"
            :placeholder="t('forgotPassword.tokenPlaceholder')"
          />
        </el-form-item>

        <el-form-item :label="t('forgotPassword.fieldNewPassword')" prop="password">
          <el-input
            v-model.trim="form.password"
            type="password"
            show-password
            @input="calcStrength"
          />
          <div class="hint">
            <el-progress
              :percentage="strength.pct"
              :status="strength.status"
              :stroke-width="8"
              style="width: 100%; margin-top: 6px"
            />
            <small class="muted">
              {{ t('forgotPassword.strengthText.' + strength.level) }}
            </small>
          </div>
        </el-form-item>

        <el-form-item :label="t('forgotPassword.fieldConfirm')" prop="confirm">
          <el-input
            v-model.trim="form.confirm"
            type="password"
            show-password
          />
        </el-form-item>

        <div class="form-row">
          <el-button
            :loading="loading"
            type="primary"
            :icon="Check"
            @click="submit"
          >
            {{ t('forgotPassword.btnSubmit') }}
          </el-button>
          <span class="spacer"></span>
          <el-button @click="$router.push('/login')">
            {{ t('forgotPassword.btnBackLogin') }}
          </el-button>
        </div>
      </el-form>
    </el-card>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Check } from '@element-plus/icons-vue'
import { useI18n } from 'vue-i18n'

// ✅ 你的專案有的地方用 default、有的地方用 named
// 若你 utils/apiBase 是「default export」用這行：
import getApiBase from '@/utils/apiBase'
// 若是「named export」請改成：import { getApiBase } from '@/utils/apiBase'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const apiBase = getApiBase()

/* ---------------- state ---------------- */
const loading = ref(false)
const formRef = ref(null)

const form = reactive({
  token: '',
  password: '',
  confirm: ''
})

/* ---------------- validation rules ---------------- */
const rules = {
  token: [
    { required: true, message: t('forgotPassword.ruleTokenRequired'), trigger: 'blur' }
  ],
  password: [
    { required: true, message: t('forgotPassword.rulePasswordRequired'), trigger: 'blur' },
    { min: 8, message: t('forgotPassword.rulePasswordMin'), trigger: 'blur' }
  ],
  confirm: [
    { required: true, message: t('forgotPassword.ruleConfirmRequired'), trigger: 'blur' },
    {
      validator: (_rule, v, cb) =>
        v === form.password ? cb() : cb(new Error(t('forgotPassword.ruleConfirmMismatch'))),
      trigger: 'blur'
    }
  ]
}

/* ---------------- strength ---------------- */
const strength = reactive({
  pct: 0,
  status: 'exception', // success / warning / exception
  level: 'weak'        // weak / medium / strong
})

function computeStrength (pwd) {
  const v = String(pwd || '')
  let score = 0
  if (v.length >= 8) score += 25
  if (/[A-Z]/.test(v) && /[a-z]/.test(v)) score += 25
  if (/\d/.test(v)) score += 20
  if (/[^A-Za-z0-9]/.test(v)) score += 20
  if (v.length >= 12) score += 10

  const pct = Math.min(100, score)

  if (score >= 80) return { pct, status: 'success', level: 'strong' }
  if (score >= 50) return { pct, status: 'warning', level: 'medium' }
  return { pct, status: 'exception', level: 'weak' }
}

function calcStrength () {
  const s = computeStrength(form.password)
  strength.pct = s.pct
  strength.status = s.status
  strength.level = s.level
}

/* password 變動就自動更新強度、也順便重新驗證 confirm（避免改密碼後 confirm 還顯示通過） */
watch(
  () => form.password,
  () => {
    calcStrength()
    if (form.confirm) formRef.value?.validateField?.('confirm').catch(() => {})
  },
  { immediate: true }
)

/* ---------------- helpers ---------------- */
function pickTokenFromRoute () {
  // 常見 reset link：?token=xxxxx
  const q = route.query || {}
  const tkn = String(q.token || q.t || '').trim()
  if (tkn) return tkn

  // 有些人會把 token 放在 hash：/#/forgot?token=xxx 或 #token=xxx
  const hash = String(location.hash || '')
  const m = hash.match(/(?:\?|#|&)token=([^&]+)/i)
  if (m?.[1]) return decodeURIComponent(m[1])

  return ''
}

async function readJsonSafe (res) {
  try {
    return await res.json()
  } catch {
    return {}
  }
}

/* ---------------- submit ---------------- */
async function submit () {
  if (loading.value) return

  // ✅ validate 失敗要直接 return（Element Plus 會 throw）
  try {
    await formRef.value?.validate()
  } catch {
    return
  }

  loading.value = true
  try {
    const res = await fetch(`${apiBase}/auth/reset`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token: form.token,
        password: form.password
      })
    })

    const json = await readJsonSafe(res)
    if (!res.ok) {
      throw new Error(json?.message || t('forgotPassword.messageFailed'))
    }

    ElMessage.success(t('forgotPassword.messageSuccess'))
    router.push('/login')
  } catch (e) {
    ElMessage.error(String(e?.message || '') || t('forgotPassword.messageFailed'))
  } finally {
    loading.value = false
  }
}

/* ---------------- init ---------------- */
onMounted(() => {
  const tkn = pickTokenFromRoute()
  if (tkn) form.token = tkn
  calcStrength()
})
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
.brand {
  margin: 0;
}
.form-row {
  display: flex;
  align-items: center;
  gap: 8px;
}
.spacer {
  flex: 1;
}
.mb8 {
  margin-bottom: 8px;
}
.hint {
  width: 100%;
}
.muted {
  color: var(--el-text-color-secondary);
}

/* 跟 Login/ForgotPassword 系列共用背景變數 */
:root {
  --app-login-bg:
    radial-gradient(1000px 600px at 10% -10%, #eaf5ff, transparent),
    radial-gradient(800px 500px at 110% 20%, #f6faff, transparent);
}
.dark {
  --app-login-bg:
    radial-gradient(1000px 600px at 10% -10%, rgba(70, 80, 90, 0.35), transparent),
    radial-gradient(800px 500px at 110% 20%, rgba(60, 70, 80, 0.25), transparent);
}
</style>
