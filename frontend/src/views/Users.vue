<template>
  <div class="page">
    <!-- Header -->
    <div class="header-bar">
      <div class="left">
        <h2>👥 {{ t('userList.title') }}</h2>
        <el-tag type="info" effect="dark">
          {{ t('userList.tag.view') }}
        </el-tag>
      </div>

      <div class="right">
        <el-input
          v-model="kw"
          :placeholder="t('userAdmin.search.placeholder')"
          clearable
          style="width: 260px"
          @keyup.enter="fetchData"
        >
          <template #prefix>
            <el-icon><Search /></el-icon>
          </template>
        </el-input>

        <el-button :icon="Refresh" @click="fetchData" :loading="loading">
          {{ t('common.refresh') }}
        </el-button>

        <el-button
          v-if="isAdmin"
          type="primary"
          @click="$router.push('/users')"
        >
          {{ t('userList.actions.goAdmin') }}
        </el-button>
      </div>
    </div>

    <!-- Table -->
    <el-card shadow="never">
      <el-table
        :data="rows"
        border
        stripe
        v-loading="loading"
        height="62vh"
        :row-key="r => r.id"
        :empty-text="t('common.noData')"
      >
        <el-table-column type="index" width="56" />

        <el-table-column
          prop="username"
          :label="t('userAdmin.table.columns.username')"
          width="160"
        />

        <el-table-column
          prop="name"
          :label="t('userAdmin.table.columns.name')"
          width="160"
        />

        <el-table-column
          prop="email"
          :label="t('userAdmin.table.columns.email')"
          min-width="220"
        />

        <el-table-column
          prop="role"
          :label="t('userAdmin.table.columns.role')"
          width="160"
        >
          <template #default="{ row }">
            <el-tag :type="roleTagType(row.role)">
              {{ roleLabel(row.role) }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column
          prop="createdAt"
          :label="t('userAdmin.table.columns.createdAt')"
          width="180"
        >
          <template #default="{ row }">
            {{ fmt(row.createdAt) }}
          </template>
        </el-table-column>

        <!-- ✅ Admin-only: Reset password -> 00000000 -->
        <el-table-column v-if="isAdmin" label="操作" width="160" fixed="right">
          <template #default="{ row }">
            <el-button size="small" @click="resetPwdToZeros(row)">
              重設密碼
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination">
        <el-pagination
          background
          layout="prev, pager, next, sizes, total"
          :total="total"
          :current-page="q.page"
          :page-size="q.pageSize"
          :page-sizes="[10, 20, 50, 100]"
          @current-change="n => { q.page = n; fetchData() }"
          @size-change="s => { q.pageSize = s; q.page = 1; fetchData() }"
        />
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Refresh, Search } from '@element-plus/icons-vue'
import getApiBase from '../utils/apiBase'

const { t } = useI18n()

const apiBase = getApiBase()
const q = reactive({ page: 1, pageSize: 20 })
const rows = ref([])
const total = ref(0)
const loading = ref(false)
const kw = ref('')

/* 使用者資訊（localStorage / sessionStorage 皆支援） */
function getStoredUser () {
  const raw =
    localStorage.getItem('user') || sessionStorage.getItem('user') || 'null'
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}
const user = ref(getStoredUser())
const isAdmin = computed(
  () => (user.value?.role || 'user').toLowerCase() === 'admin'
)

/* Auth header 共用 */
function authHeaders () {
  const token =
    localStorage.getItem('token') || sessionStorage.getItem('token') || ''
  return token ? { Authorization: `Bearer ${token}` } : {}
}

/* 401 處理 */
function handleAuth (res) {
  if (res.status === 401) {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    sessionStorage.removeItem('token')
    sessionStorage.removeItem('user')
    ElMessage.warning(t('userAdmin.messages.authExpired'))
    location.href = '/login'
    return true
  }
  return false
}

/* 時間格式化 */
function fmt (v) {
  if (!v) return '-'
  const d = new Date(v)
  const pad = n => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(
    d.getDate()
  )} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/* 角色顯示文字（含 guest / supervisor） */
function roleLabel (role) {
  const key = String(role || '').toLowerCase()
  switch (key) {
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
}

/* 角色顏色 */
function roleTagType (role) {
  const key = String(role || '').toLowerCase()
  if (key === 'admin') return 'warning'
  if (key === 'supervisor') return 'success'
  if (key === 'guest') return '' // default 樣式，遊客比較淡
  return 'info' // user
}

/* debounce 搜尋 */
const debounced = (fn, d = 350) => {
  let tId
  return (...a) => {
    clearTimeout(tId)
    tId = setTimeout(() => fn(...a), d)
  }
}
watch(
  kw,
  debounced(() => {
    q.page = 1
    fetchData()
  }, 350)
)

/* 取列表 */
async function fetchData () {
  loading.value = true
  try {
    const params = new URLSearchParams({
      page: String(q.page),
      pageSize: String(q.pageSize),
      keyword: kw.value || ''
    })
    const res = await fetch(`${apiBase}/users?${params.toString()}`, {
      headers: authHeaders()
    })
    if (handleAuth(res)) return
    const json = await res.json().catch(() => ({}))
    if (!res.ok) {
      throw new Error(json?.message || t('userAdmin.messages.loadFailed'))
    }
    rows.value = json.rows || json.data || []
    total.value = json.total || json.count || rows.value.length
  } catch (e) {
    const msg = String(e?.message || '')
    ElMessage.error(
      msg.includes('Failed to fetch')
        ? t('userAdmin.messages.loadFailedNetwork')
        : msg || t('userAdmin.messages.loadFailed')
    )
  } finally {
    loading.value = false
  }
}

/* ✅ Admin: reset password to 00000000 */
async function resetPwdToZeros (row) {
  try {
    await ElMessageBox.confirm(
      `確定要把「${row?.username || row?.name || row?.email || '此使用者'}」的密碼重設為 00000000 嗎？`,
      '重設密碼',
      {
        type: 'warning',
        confirmButtonText: '確定',
        cancelButtonText: '取消'
      }
    )

    const res = await fetch(`${apiBase}/users/${row.id}/password`, {
      method: 'PATCH',
      headers: {
        ...authHeaders(),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ newPassword: '00000000' })
    })

    if (handleAuth(res)) return
    const json = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(json?.message || '重設密碼失敗')

    ElMessage.success('✅ 密碼已重設為 00000000')
  } catch (e) {
    // 使用者按取消/關閉就不提示錯誤
    if (e === 'cancel' || e === 'close') return
    if (String(e?.message || '').includes('cancel')) return
    ElMessage.error(String(e?.message || '重設密碼失敗'))
  }
}

onMounted(fetchData)
</script>

<style scoped>
:root {
  --app-header-bg: linear-gradient(
    180deg,
    rgba(240, 247, 255, 0.8),
    rgba(255, 255, 255, 0.8)
  );
}
.dark {
  --app-header-bg: linear-gradient(
    180deg,
    rgba(28, 33, 38, 0.8),
    rgba(28, 33, 38, 0.6)
  );
}

.page {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.header-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border: 1px solid var(--el-border-color);
  border-radius: 12px;
  background: var(--app-header-bg);
}
.header-bar .left {
  display: flex;
  align-items: center;
  gap: 10px;
}
.header-bar .right {
  display: flex;
  gap: 8px;
  align-items: center;
}
.pagination {
  display: flex;
  justify-content: flex-end;
  padding-top: 8px;
}
</style>
