<!-- frontend/src/views/Users.vue -->
<template>
  <div class="page">
    <!-- Header -->
    <div class="header-bar">
      <div class="left">
        <h2>👤 {{ t('userAdmin.title') }}</h2>
        <el-tag type="warning" effect="dark">
          {{ t('userAdmin.tag.admin') }}
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
          {{ t('userAdmin.actions.refresh') }}
        </el-button>
        <el-button type="primary" :icon="Plus" @click="openEdit()">
          {{ t('userAdmin.actions.create') }}
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
          width="180"
        >
          <template #default="{ row }">
            <el-select
              v-model="row.role"
              size="small"
              @change="v => updateField(row, 'role', v)"
            >
              <el-option
                v-for="opt in roleOptions"
                :key="opt.value"
                :label="opt.label"
                :value="opt.value"
              />
            </el-select>
          </template>
        </el-table-column>

        <!-- 是否納入統計 -->
        <el-table-column
          prop="includeInStats"
          :label="t('userAdmin.table.columns.includeInStats')"
          width="160"
        >
          <template #default="{ row }">
            <el-switch
              v-model="row.includeInStats"
              :active-text="t('userAdmin.table.includeInStatsYes')"
              :inactive-text="t('userAdmin.table.includeInStatsNo')"
              @change="v => updateField(row, 'includeInStats', v)"
            />
          </template>
        </el-table-column>

        <!-- 使用者工作容量 -->
        <el-table-column
          prop="workCapacity"
          :label="t('userAdmin.table.columns.workCapacity')"
          width="160"
        >
          <template #default="{ row }">
            <el-input-number
              v-model="row.workCapacity"
              size="small"
              :min="1"
              :max="99"
              @change="v => updateField(row, 'workCapacity', v)"
            />
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

        <el-table-column
          :label="t('userAdmin.table.columns.actions')"
          width="300"
          align="right"
          fixed="right"
        >
          <template #default="{ row }">
            <el-popconfirm
              :title="t('userAdmin.table.pop.resetConfirm')"
              @confirm="resetPwd(row)"
            >
              <template #reference>
                <el-button size="small" :icon="Key">
                  {{ t('userAdmin.table.resetPassword') }}
                </el-button>
              </template>
            </el-popconfirm>

            <el-button size="small" :icon="Edit" @click="openEdit(row)">
              {{ t('userAdmin.table.edit') }}
            </el-button>

            <el-popconfirm
              :title="t('userAdmin.table.pop.deleteConfirm')"
              @confirm="removeRow(row)"
            >
              <template #reference>
                <el-button size="small" type="danger" plain :icon="Delete">
                  {{ t('userAdmin.table.delete') }}
                </el-button>
              </template>
            </el-popconfirm>
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

    <!-- Dialog -->
    <el-dialog
      v-model="dlg.visible"
      :title="dlg.data?.id ? t('userAdmin.dialog.editTitle') : t('userAdmin.dialog.createTitle')"
      width="640px"
      :close-on-click-modal="false"
    >
      <el-form :model="dlg.data" :rules="rules" ref="formRef" label-width="100px">
        <el-form-item :label="t('userAdmin.dialog.fields.username')" prop="username">
          <el-input v-model.trim="dlg.data.username" :disabled="!!dlg.data.id" />
        </el-form-item>
        <el-form-item :label="t('userAdmin.dialog.fields.name')" prop="name">
          <el-input v-model.trim="dlg.data.name" />
        </el-form-item>
        <el-form-item :label="t('userAdmin.dialog.fields.email')" prop="email">
          <el-input v-model.trim="dlg.data.email" />
        </el-form-item>
        <el-form-item :label="t('userAdmin.dialog.fields.role')" prop="role">
          <el-select v-model="dlg.data.role">
            <el-option
              v-for="opt in roleOptions"
              :key="opt.value"
              :label="opt.label"
              :value="opt.value"
            />
          </el-select>
        </el-form-item>

        <!-- 是否納入統計 -->
        <el-form-item
          :label="t('userAdmin.dialog.fields.includeInStats')"
          prop="includeInStats"
        >
          <el-switch
            v-model="dlg.data.includeInStats"
            :active-text="t('userAdmin.dialog.includeInStatsYes')"
            :inactive-text="t('userAdmin.dialog.includeInStatsNo')"
          />
        </el-form-item>

        <!-- 使用者工作容量 -->
        <el-form-item
          :label="t('userAdmin.dialog.fields.workCapacity')"
          prop="workCapacity"
        >
          <el-input-number
            v-model="dlg.data.workCapacity"
            :min="1"
            :max="99"
          />
        </el-form-item>

        <el-form-item
          v-if="!dlg.data.id"
          :label="t('userAdmin.dialog.fields.password')"
          prop="password"
        >
          <el-input
            v-model.trim="dlg.data.password"
            type="password"
            show-password
          />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="dlg.visible = false">
          {{ t('userAdmin.dialog.actions.cancel') }}
        </el-button>
        <el-button
          type="primary"
          :icon="Check"
          :loading="dlg.loading"
          @click="save"
        >
          {{ t('userAdmin.dialog.actions.save') }}
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, watch, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { ElMessage } from 'element-plus'
import { Refresh, Search, Plus, Edit, Delete, Key, Check } from '@element-plus/icons-vue'
import getApiBase from '../utils/apiBase'

const { t } = useI18n()

/* 小工具：i18n key 不存在就用 fallback */
const tt = (key, fallback) => {
  const v = t(key)
  return v === key ? fallback : v
}

// 🔹 角色選項（含 admin / user / supervisor / guest）
const roleOptions = computed(() => [
  { value: 'admin',      label: t('userAdmin.roles.admin') },
  { value: 'user',       label: t('userAdmin.roles.user') },
  { value: 'supervisor', label: t('userAdmin.roles.supervisor') },
  { value: 'guest',      label: t('userAdmin.roles.guest') }
])

const apiBase = getApiBase()
const q = reactive({ page: 1, pageSize: 20 })
const rows = ref([])
const total = ref(0)
const loading = ref(false)
const kw = ref('')

const dlg = reactive({
  visible: false,
  loading: false,
  data: {
    id: null,
    username: '',
    name: '',
    email: '',
    role: 'guest',          // 🔹 新增預設為 guest
    includeInStats: false,  // 🔹 遊客預設不納入統計
    workCapacity: 3,
    password: ''
  }
})
const formRef = ref()

const rules = {
  username: [{ required: true, message: t('userAdmin.rules.required'), trigger: 'blur' }],
  name: [{ required: true, message: t('userAdmin.rules.required'), trigger: 'blur' }],
  email: [
    { required: true, message: t('userAdmin.rules.emailRequired'), trigger: 'blur' },
    { type: 'email', message: t('userAdmin.rules.emailFormat'), trigger: 'blur' }
  ],
  role: [{ required: true, message: t('userAdmin.rules.roleRequired'), trigger: 'blur' }],
  workCapacity: [
    {
      required: true,
      message: t('userAdmin.rules.workCapacityRequired') || t('userAdmin.rules.required'),
      trigger: 'blur'
    },
    {
      validator: (_, v, cb) => {
        if (v == null || v === '') {
          return cb(new Error(t('userAdmin.rules.workCapacityRequired') || t('userAdmin.rules.required')))
        }
        if (Number(v) <= 0) {
          return cb(new Error(t('userAdmin.rules.workCapacityPositive') || t('userAdmin.rules.required')))
        }
        cb()
      },
      trigger: 'blur'
    }
  ],
  password: [
    {
      validator: (_, v, cb) => {
        // 新增時才檢查密碼，編輯時可留空
        if (dlg.data.id) return cb()
        if (!v) return cb(new Error(t('userAdmin.rules.passwordRequired')))
        cb()
      },
      trigger: 'blur'
    }
  ]
}

function authHeaders () {
  const token =
    localStorage.getItem('token') || sessionStorage.getItem('token') || ''
  return token ? { Authorization: `Bearer ${token}` } : {}
}

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

function fmt (v) {
  if (!v) return '-'
  const d = new Date(v)
  const pad = n => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`
}

const debounced = (fn, d = 350) => {
  let tId
  return (...a) => {
    clearTimeout(tId)
    tId = setTimeout(() => fn(...a), d)
  }
}
watch(kw, debounced(() => { q.page = 1; fetchData() }, 350))

async function fetchData () {
  loading.value = true
  try {
    const params = new URLSearchParams({
      page: String(q.page),
      pageSize: String(q.pageSize),
      keyword: kw.value || ''
    })
    const res = await fetch(`${apiBase}/users?${params.toString()}`, { headers: authHeaders() })
    if (handleAuth(res)) return
    const json = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(json?.message || t('userAdmin.messages.loadFailed'))
    rows.value = json.rows || json.data || []
    total.value = json.total || json.count || rows.value.length
  } catch (e) {
    const msg = String(e?.message || '')
    if (msg.includes('Failed to fetch')) {
      ElMessage.error(t('userAdmin.messages.loadFailedNetwork'))
    } else {
      ElMessage.error(msg || t('userAdmin.messages.loadFailed'))
    }
  } finally {
    loading.value = false
  }
}

function openEdit (row) {
  dlg.visible = true
  dlg.loading = false
  dlg.data = row
    ? {
        ...row,
        includeInStats: row.includeInStats ?? (row.role === 'guest' ? false : true),
        workCapacity: row.workCapacity ?? 3,
        password: ''
      }
    : {
        id: null,
        username: '',
        name: '',
        email: '',
        role: 'guest',
        includeInStats: false,
        workCapacity: 3,
        password: ''
      }
}

async function save () {
  await formRef.value?.validate()
  dlg.loading = true
  try {
    const method = dlg.data.id ? 'PUT' : 'POST'
    const url = dlg.data.id ? `${apiBase}/users/${dlg.data.id}` : `${apiBase}/users`
    const payload = { ...dlg.data }
    if (!payload.password) delete payload.password

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify(payload)
    })
    if (handleAuth(res)) return
    const j = await res.json().catch(() => ({}))
    if (!res.ok) {
      const msg =
        j?.message ||
        (res.status === 409
          ? t('userAdmin.messages.saveConflict')
          : t('userAdmin.messages.saveFailed'))
      throw new Error(msg)
    }
    ElMessage.success(t('userAdmin.messages.saveSuccess'))
    dlg.visible = false
    fetchData()
  } catch (e) {
    const msg = String(e?.message || '')
    if (msg.includes('Failed to fetch')) {
      ElMessage.error(t('userAdmin.messages.loadFailedNetwork'))
    } else {
      ElMessage.error(msg || t('userAdmin.messages.saveFailed'))
    }
  } finally {
    dlg.loading = false
  }
}

async function updateField (row, field, value) {
  const old = row[field]
  row[field] = value
  try {
    const res = await fetch(`${apiBase}/users/${row.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ [field]: value })
    })
    if (handleAuth(res)) return
    const j = await res.json().catch(() => ({}))
    if (!res.ok || j?.success === false) throw new Error()
    ElMessage.success(t('userAdmin.messages.updateSuccess'))
  } catch (e) {
    row[field] = old
    ElMessage.error(t('userAdmin.messages.updateFailed'))
  }
}

/* ✅ 管理員重設密碼：固定改成 00000000
   後端路由：PATCH /api/users/:id/password  body { newPassword }
*/
async function resetPwd (row) {
  try {
    const newPassword = '00000000'

    const res = await fetch(`${apiBase}/users/${row.id}/password`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ newPassword })
    })
    if (handleAuth(res)) return
    const j = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(j?.message || t('userAdmin.messages.resetFailed'))

    // ✅ 提示：密碼已重設為 8 個 0
    ElMessage.success(
      tt(
        'userAdmin.messages.resetSuccessFixed',
        `✅ 已將 ${row.username} 密碼重設為 ${newPassword}`
      )
    )
  } catch (e) {
    const msg = String(e?.message || '')
    if (msg.includes('Failed to fetch')) {
      ElMessage.error(t('userAdmin.messages.loadFailedNetwork'))
    } else {
      ElMessage.error(msg || t('userAdmin.messages.resetFailed'))
    }
  }
}

async function removeRow (row) {
  try {
    const res = await fetch(`${apiBase}/users/${row.id}`, {
      method: 'DELETE',
      headers: authHeaders()
    })
    if (handleAuth(res)) return
    const j = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(j?.message || t('userAdmin.messages.deleteFailed'))
    ElMessage.success(t('userAdmin.messages.deleteSuccess'))
    fetchData()
  } catch (e) {
    const msg = String(e?.message || '')
    if (msg.includes('Failed to fetch')) {
      ElMessage.error(t('userAdmin.messages.loadFailedNetwork'))
    } else {
      ElMessage.error(msg || t('userAdmin.messages.deleteFailed'))
    }
  }
}

onMounted(fetchData)
</script>

<style scoped>
:root {
  --app-header-bg: linear-gradient(
    180deg,
    rgba(240, 247, 255, .8),
    rgba(255, 255, 255, .8)
  );
}
.dark {
  --app-header-bg: linear-gradient(
    180deg,
    rgba(28, 33, 38, .8),
    rgba(28, 33, 38, .6)
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
