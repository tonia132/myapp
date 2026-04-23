<!-- frontend/src/components/HelloWorld.vue -->
<template>
  <div class="welcome-container">
    <el-card shadow="hover" class="welcome-card">
      <h2>👋 {{ t('welcome.title') }}</h2>

      <el-descriptions :column="1" size="default" border class="desc">
        <!-- 前端版本 -->
        <el-descriptions-item :label="t('welcome.frontendVersion')">
          <strong>{{ appVersion }}</strong>
        </el-descriptions-item>

        <!-- 後端狀態 -->
        <el-descriptions-item :label="t('welcome.serverStatus')">
          <el-tag :type="server.online ? 'success' : 'danger'">
            {{ server.online ? t('welcome.serverOnline') : t('welcome.serverOffline') }}
          </el-tag>
          <span v-if="server.latencyMs !== null" class="muted">
            （{{ server.latencyMs }} ms）
          </span>
        </el-descriptions-item>

        <el-descriptions-item
          v-if="server.version"
          :label="t('welcome.backendVersion')"
        >
          <el-tag type="info" effect="plain">{{ server.version }}</el-tag>
        </el-descriptions-item>

        <!-- API Base -->
        <el-descriptions-item :label="t('welcome.apiBase')">
          <el-tooltip :content="apiBase" placement="bottom">
            <el-button text type="primary" @click="copyApi">{{ apiShort }}</el-button>
          </el-tooltip>
        </el-descriptions-item>

        <!-- 登入狀態 -->
        <el-descriptions-item :label="t('welcome.loginStatus')">
          <el-tag :type="isLoggedIn ? 'success' : 'warning'">
            {{ loginText }}
          </el-tag>
        </el-descriptions-item>

        <!-- 🆕 目前使用者 / 角色（含 guest） -->
        <el-descriptions-item
          v-if="isLoggedIn"
          :label="t('welcome.currentUser')"
        >
          <el-tag type="info" effect="plain">
            {{ displayName }}（{{ roleLabel }}）
          </el-tag>
          <span v-if="isGuest" class="muted">
            {{ t('welcome.guestHint') }}
          </span>
        </el-descriptions-item>
      </el-descriptions>

      <div class="actions">
        <el-button :icon="Refresh" :loading="checking" @click="checkServer">
          {{ t('welcome.btnCheck') }}
        </el-button>
        <el-button type="primary" @click="goDashboard">
          {{ t('welcome.btnDashboard') }}
        </el-button>
        <el-button @click="toProducts">
          {{ t('welcome.btnProducts') }}
        </el-button>
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Refresh } from '@element-plus/icons-vue'
import { useI18n } from 'vue-i18n'
import { getApiBase } from '../utils/apiBase'

const { t } = useI18n()
const router = useRouter()
const apiBase = getApiBase()

// 前端版本：優先取環境變數，其次 fallback
const appVersion = import.meta.env.VITE_APP_VERSION || 'v1.0.0'

const checking = ref(false)
const server = ref({ online: false, version: '', latencyMs: null })

// 🧑‍💻 目前使用者（localStorage / sessionStorage 都支援）
function getStoredUser () {
  const raw =
    localStorage.getItem('user') ||
    sessionStorage.getItem('user') ||
    'null'
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}
const user = ref(getStoredUser())

// Token 也同樣支援兩種儲存方式
function getToken () {
  return (
    localStorage.getItem('token') ||
    sessionStorage.getItem('token') ||
    ''
  )
}

const isLoggedIn = computed(() => !!getToken())

const displayName = computed(
  () => user.value?.name || user.value?.username || t('common.user')
)

const roleKey = computed(() =>
  String(user.value?.role || '').toLowerCase()
)
const isGuest = computed(() => roleKey.value === 'guest')

const roleLabel = computed(() => {
  switch (roleKey.value) {
    case 'admin':
      return t('userAdmin.roles.admin')
    case 'supervisor':
      return t('userAdmin.roles.supervisor')
    case 'guest':
      return t('userAdmin.roles.guest')
    case 'user':
    default:
      return t('userAdmin.roles.user')
  }
})

const apiShort = computed(() =>
  apiBase.length > 36 ? apiBase.slice(0, 36) + '…' : apiBase
)

const loginText = computed(() => {
  if (!isLoggedIn.value) return t('welcome.loginNotLoggedIn')
  const name = user.value?.username || t('common.user')
  return t('welcome.loginLoggedIn', { name })
})

function authHeaders () {
  const token = getToken()
  return token ? { Authorization: `Bearer ${token}` } : {}
}

async function checkServer () {
  checking.value = true
  try {
    const t0 = performance.now()
    // 1) 嘗試 /info；2) 備援 /health；3) 最後做 HEAD /
    let res = await fetch(`${apiBase}/info`, { headers: { ...authHeaders() } })
    if (!res.ok) {
      res = await fetch(`${apiBase}/health`, { headers: { ...authHeaders() } })
    }
    if (!res.ok) {
      res = await fetch(`${apiBase.replace(/\/api$/i, '')}/`, { method: 'HEAD' })
    }

    const t1 = performance.now()
    const latency = Math.max(0, Math.round(t1 - t0))

    let json = {}
    try { json = await res.clone().json() } catch {}

    server.value.online = res.ok
    server.value.version =
      json?.version || json?.app?.version || json?.data?.version || ''
    server.value.latencyMs = latency
  } catch (e) {
    server.value.online = false
    server.value.version = ''
    server.value.latencyMs = null
  } finally {
    checking.value = false
  }
}

async function copyApi () {
  try {
    await navigator.clipboard.writeText(apiBase)
    ElMessage.success(t('welcome.apiCopied'))
  } catch {
    // ignore
  }
}

// 🧭 前往 Dashboard：未登入導到 /login，已登入導到主首頁（依你路由可再調整）
function goDashboard () {
  if (!isLoggedIn.value) {
    router.push('/login')
  } else {
    // 如果你的 dashboard 路徑不是 '/'，改成實際 path 即可（例如 '/dashboard'）
    router.push('/')
  }
}

function toProducts () {
  if (!isLoggedIn.value) {
    router.push('/login')
  } else {
    router.push('/products')
  }
}

onMounted(checkServer)
</script>

<style scoped>
.welcome-container {
  display: grid;
  place-items: center;
  height: 100vh;
  padding: 16px;
  background: var(--app-login-bg);
}
.welcome-card {
  width: 520px;
  border-radius: 16px;
  text-align: left;
  backdrop-filter: blur(2px);
}
.desc {
  margin: 10px 0 6px;
}
.actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
  margin-top: 10px;
}
.muted {
  color: var(--el-text-color-secondary);
  margin-left: 6px;
}

/* 與全站主題變數一致 */
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
