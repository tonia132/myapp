<template>
  <div class="login-page">
    <div class="bg"></div>

    <el-card class="panel" shadow="never">
      <div class="brand-row">
        <h2 class="brand">📝 {{ t('register.title') }}</h2>
        <el-tag type="info" effect="dark">
          {{ t('register.subtitleTag') }}
        </el-tag>
      </div>

      <el-form
        ref="formRef"
        :model="form"
        :rules="rules"
        label-position="top"
        @submit.prevent="register"
      >
        <el-form-item :label="t('register.fieldUsername')" prop="username">
          <el-input
            v-model.trim="form.username"
            :disabled="loading"
            autocomplete="username"
            maxlength="100"
          />
        </el-form-item>

        <el-form-item :label="t('register.fieldName')" prop="name">
          <el-input
            v-model.trim="form.name"
            :disabled="loading"
            maxlength="100"
          />
        </el-form-item>

        <el-form-item :label="t('register.fieldEmail')" prop="email">
          <el-input
            v-model.trim="form.email"
            :disabled="loading"
            autocomplete="email"
            maxlength="191"
          />
        </el-form-item>

        <el-form-item :label="t('register.fieldPassword')" prop="password">
          <el-input
            v-model="form.password"
            :disabled="loading"
            type="password"
            show-password
            autocomplete="new-password"
          />
        </el-form-item>

        <div class="form-row">
          <el-button
            type="primary"
            :loading="loading"
            :icon="Check"
            @click="register"
          >
            {{ t('register.btnSubmit') }}
          </el-button>

          <span class="spacer"></span>

          <el-button
            :disabled="loading"
            native-type="button"
            @click="goLogin"
          >
            {{ t('register.btnBackLogin') }}
          </el-button>
        </div>
      </el-form>
    </el-card>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, onBeforeUnmount, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { ElMessage } from 'element-plus'
import { Check } from '@element-plus/icons-vue'
import getApiBase from '../utils/apiBase'

const { t } = useI18n()
const router = useRouter()
const route = useRoute()
const apiBase = getApiBase()

const loading = ref(false)
const formRef = ref()

// 🔹 註冊表單：預設角色為 guest
const form = reactive({
  username: '',
  name: '',
  email: '',
  password: '',
  role: 'guest'
})

// ✅ rules 改 computed，語系切換會跟著變
const rules = computed(() => ({
  username: [
    { required: true, message: t('register.rules.usernameRequired'), trigger: 'blur' },
    { min: 3, message: t('register.rules.usernameMin'), trigger: 'blur' }
  ],
  name: [
    { required: true, message: t('register.rules.nameRequired'), trigger: 'blur' }
  ],
  email: [
    { required: true, message: t('register.rules.emailRequired'), trigger: 'blur' },
    { type: 'email', message: t('register.rules.emailInvalid'), trigger: 'blur' }
  ],
  password: [
    { required: true, message: t('register.rules.passwordRequired'), trigger: 'blur' },
    { min: 8, message: t('register.rules.passwordMin'), trigger: 'blur' }
  ]
}))

// 🔒 防止外部全域熱鍵（g）把頁面導回其它路徑
function swallowGlobalG (e) {
  if (e?.isComposing) return
  const tag = (e.target?.tagName || '').toUpperCase()
  const isEditable = tag === 'INPUT' || tag === 'TEXTAREA' || e.target?.isContentEditable
  if (!isEditable) return
  const k = (e.key || '').toLowerCase()
  if (k === 'g' && !e.ctrlKey && !e.metaKey && !e.altKey) {
    e.stopPropagation() // 仍可輸入 g，但不冒泡到全域 hotkey
  }
}

onMounted(() => window.addEventListener('keydown', swallowGlobalG, true))
onBeforeUnmount(() => window.removeEventListener('keydown', swallowGlobalG, true))

function goLogin () {
  const redirect = route.query.redirect
  router.push({ path: '/login', query: redirect ? { redirect } : undefined })
}

async function register () {
  if (loading.value) return

  // ✅ validate 可能 throw（Element Plus），要接住
  try {
    await formRef.value?.validate()
  } catch {
    return
  }

  loading.value = true
  try {
    const username = String(form.username || '').trim().toLowerCase()
    const name = String(form.name || '').trim()
    const email = String(form.email || '').trim().toLowerCase()
    const password = String(form.password || '')
    const role = form.role || 'guest'

    const payload = { username, name, email, password, role }

    const res = await fetch(`${apiBase}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })

    let data = {}
    try { data = await res.json() } catch {}

    if (!res.ok) {
      let msg
      if (res.status === 409) {
        msg = data?.message || t('register.message.conflict')
      } else if (res.status === 400) {
        msg = data?.message || t('register.message.badRequest')
      } else {
        msg = data?.message || t('register.message.failedWithStatus', { status: res.status })
      }
      throw new Error(msg)
    }

    ElMessage.success(t('register.message.success'))
    goLogin()
  } catch (e) {
    const raw = e?.message || ''
    if (raw.includes('Failed to fetch')) {
      ElMessage.error(t('register.message.networkError'))
    } else {
      ElMessage.error(raw || t('register.message.failed'))
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
  width: 420px;
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

/* ✅ scoped 下要用 :global 才能命中全域 root/dark */
:global(:root) {
  --app-login-bg:
    radial-gradient(1000px 600px at 10% -10%, #eaf5ff, transparent),
    radial-gradient(800px 500px at 110% 20%, #f6faff, transparent);
}
:global(.dark) {
  --app-login-bg:
    radial-gradient(1000px 600px at 10% -10%, rgba(70, 80, 90, 0.35), transparent),
    radial-gradient(800px 500px at 110% 20%, rgba(60, 70, 80, 0.25), transparent);
}
</style>
