<!-- frontend/src/views/TestSupport.vue -->
<template>
  <div class="page test-support-page">
    <!-- Header -->
    <div class="header-bar">
      <div class="left">
        <h2>🛟 {{ t('testSupport.title') }}</h2>
        <p class="subtitle">{{ t('testSupport.subtitle') }}</p>
      </div>

      <div class="right">
        <el-button :icon="Refresh" @click="fetchSupportList" :loading="loading">
          {{ t('testSupport.header.refresh') }}
        </el-button>
      </div>
    </div>

    <el-row :gutter="16" class="content-row">
      <!-- Left: Create form -->
      <el-col :xs="24" :md="12">
        <el-card class="block-card" shadow="hover">
          <div class="block-header">
            <div class="title-wrap">
              <h3>✏️ {{ t('testSupport.form.title') }}</h3>
              <span class="hint-text">{{ t('testSupport.form.hint') }}</span>
            </div>
          </div>

          <el-form
            ref="formRef"
            :model="form"
            :rules="rules"
            label-width="100px"
            size="small"
            class="support-form"
          >
            <el-form-item :label="t('testSupport.form.fields.supportDate')" prop="supportDate">
              <el-date-picker
                v-model="form.supportDate"
                type="date"
                :placeholder="t('testSupport.form.fields.supportDatePlaceholder')"
                style="width: 100%"
                value-format="YYYY-MM-DD"
              />
            </el-form-item>

            <el-form-item :label="t('testSupport.form.fields.requesterDept')" prop="requesterDept">
              <el-input
                v-model="form.requesterDept"
                :placeholder="t('testSupport.form.fields.requesterDeptPlaceholder')"
                clearable
              />
            </el-form-item>

            <el-form-item :label="t('testSupport.form.fields.requester')">
              <el-input
                v-model="form.requester"
                :placeholder="t('testSupport.form.fields.requesterPlaceholder')"
                clearable
              />
            </el-form-item>

            <el-form-item :label="t('testSupport.form.fields.supporter')" prop="supporterId">
              <el-select
                v-model="form.supporterId"
                filterable
                :placeholder="t('testSupport.form.fields.supporterPlaceholder')"
                style="width: 100%"
              >
                <el-option
                  v-for="u in userOptions"
                  :key="u.id"
                  :label="u.name || u.username"
                  :value="u.id"
                >
                  <span>{{ u.name || u.username }}</span>
                  <span v-if="u.role" class="option-role">({{ u.role }})</span>
                </el-option>
              </el-select>
            </el-form-item>

            <el-form-item :label="t('testSupport.form.fields.projectName')" prop="projectName">
              <el-input
                v-model="form.projectName"
                :placeholder="t('testSupport.form.fields.projectNamePlaceholder')"
                clearable
              />
            </el-form-item>

            <el-form-item :label="t('testSupport.form.fields.testType')" prop="testType">
              <el-select
                v-model="form.testType"
                :placeholder="t('testSupport.form.fields.testTypePlaceholder')"
                style="width: 100%"
              >
                <el-option :label="t('testSupport.form.testTypeOptions.system')" value="system" />
                <el-option :label="t('testSupport.form.testTypeOptions.reli')" value="reli" />
                <el-option :label="t('testSupport.form.testTypeOptions.rma')" value="rma" />
                <el-option :label="t('testSupport.form.testTypeOptions.cert')" value="cert" />
                <el-option :label="t('testSupport.form.testTypeOptions.other')" value="other" />
              </el-select>
            </el-form-item>

            <el-form-item :label="t('testSupport.form.fields.relatedNo')">
              <el-input
                v-model="form.relatedNo"
                :placeholder="t('testSupport.form.fields.relatedNoPlaceholder')"
                clearable
              />
            </el-form-item>

            <el-form-item :label="t('testSupport.form.fields.testContent')" prop="testContent">
              <el-input
                v-model="form.testContent"
                type="textarea"
                :rows="4"
                :placeholder="t('testSupport.form.fields.testContentPlaceholder')"
              />
            </el-form-item>

            <el-form-item :label="t('testSupport.form.fields.hours')" prop="hours">
              <el-input-number
                v-model="form.hours"
                :min="0.1"
                :step="0.5"
                :precision="1"
                controls-position="right"
                style="width: 100%"
              />
            </el-form-item>

            <el-form-item :label="t('testSupport.form.fields.status')" prop="status">
              <el-radio-group v-model="form.status">
                <el-radio-button label="done">
                  {{ t('testSupport.form.statusOptions.done') }}
                </el-radio-button>
                <el-radio-button label="doing">
                  {{ t('testSupport.form.statusOptions.doing') }}
                </el-radio-button>
                <el-radio-button label="pending">
                  {{ t('testSupport.form.statusOptions.pending') }}
                </el-radio-button>
              </el-radio-group>
            </el-form-item>

            <el-form-item :label="t('testSupport.form.fields.note')">
              <el-input
                v-model="form.note"
                type="textarea"
                :rows="2"
                :placeholder="t('testSupport.form.fields.notePlaceholder')"
              />
            </el-form-item>

            <el-form-item>
              <el-button type="primary" :icon="Plus" :loading="submitting" @click="handleSubmit">
                {{ t('testSupport.form.actions.submit') }}
              </el-button>
              <el-button :icon="Refresh" @click="resetForm" :disabled="submitting">
                {{ t('testSupport.form.actions.reset') }}
              </el-button>
            </el-form-item>
          </el-form>
        </el-card>
      </el-col>

      <!-- Right: list -->
      <el-col :xs="24" :md="12">
        <el-card class="block-card" shadow="hover">
          <div class="block-header">
            <div class="title-wrap">
              <h3>📋 {{ t('testSupport.list.title') }}</h3>
              <span class="hint-text">{{ t('testSupport.list.hint') }}</span>
            </div>
            <div class="summary">
              <span>
                {{ t('testSupport.list.summary.count', { count: supportList.length }) }}
              </span>
              <span>
                {{ t('testSupport.list.summary.totalHours', { hours: totalHours }) }}
              </span>
            </div>
          </div>

          <el-table
            :data="supportList"
            border
            size="small"
            v-loading="loading"
            :empty-text="t('testSupport.list.table.empty')"
            class="support-table"
          >
            <el-table-column
              prop="supportDate"
              :label="t('testSupport.list.table.columns.date')"
              width="110"
            />
            <el-table-column
              prop="requesterDept"
              :label="t('testSupport.list.table.columns.requesterDept')"
              min-width="120"
              show-overflow-tooltip
            />
            <el-table-column
              prop="projectName"
              :label="t('testSupport.list.table.columns.projectName')"
              min-width="130"
              show-overflow-tooltip
            />
            <el-table-column
              prop="testContent"
              :label="t('testSupport.list.table.columns.testContent')"
              min-width="180"
              show-overflow-tooltip
            />
            <el-table-column
              prop="hours"
              :label="t('testSupport.list.table.columns.hours')"
              width="70"
            >
              <template #default="{ row }">
                {{ row.hours ?? '-' }}
              </template>
            </el-table-column>
            <el-table-column
              prop="status"
              :label="t('testSupport.list.table.columns.status')"
              width="90"
            >
              <template #default="{ row }">
                <el-tag v-if="row.status" :type="statusTagType(row.status)" size="small">
                  {{ statusLabel(row.status) }}
                </el-tag>
                <span v-else>-</span>
              </template>
            </el-table-column>
            <el-table-column
              prop="supporterName"
              :label="t('testSupport.list.table.columns.supporterName')"
              width="110"
              show-overflow-tooltip
            />

            <!-- Admin actions -->
            <el-table-column
              v-if="isAdmin"
              :label="t('testSupport.list.table.columns.actions')"
              width="110"
              fixed="right"
            >
              <template #default="{ row }">
                <el-button type="primary" size="small" link @click="openEdit(row)">
                  {{ t('testSupport.list.table.actions.edit') }}
                </el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-col>
    </el-row>

    <!-- Admin edit dialog -->
    <el-dialog v-model="editDialog.visible" :title="t('testSupport.editDialog.title')" width="420px">
      <el-form :model="editForm" label-width="90px" size="small" class="edit-form">
        <el-form-item :label="t('testSupport.editDialog.fields.supporter')">
          <el-select
            v-model="editForm.supporterId"
            filterable
            :placeholder="t('testSupport.form.fields.supporterPlaceholder')"
            style="width: 100%"
          >
            <el-option
              v-for="u in userOptions"
              :key="u.id"
              :label="u.name || u.username"
              :value="u.id"
            />
          </el-select>
        </el-form-item>

        <el-form-item :label="t('testSupport.editDialog.fields.status')">
          <el-radio-group v-model="editForm.status">
            <el-radio-button label="done">{{ t('testSupport.form.statusOptions.done') }}</el-radio-button>
            <el-radio-button label="doing">{{ t('testSupport.form.statusOptions.doing') }}</el-radio-button>
            <el-radio-button label="pending">{{ t('testSupport.form.statusOptions.pending') }}</el-radio-button>
          </el-radio-group>
        </el-form-item>
      </el-form>

      <template #footer>
        <span class="dialog-footer">
          <el-button @click="editDialog.visible = false">
            {{ t('testSupport.editDialog.actions.cancel') }}
          </el-button>
          <el-button type="primary" :loading="editDialog.saving" @click="handleEditSave">
            {{ t('testSupport.editDialog.actions.save') }}
          </el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { ElMessage } from 'element-plus'
import { Refresh, Plus } from '@element-plus/icons-vue'
import getApiBase from '@/utils/apiBase' // 若你是 export function getApiBase()，改成：import { getApiBase } from '@/utils/apiBase'

const { t } = useI18n()
const apiBase = getApiBase()

/* ---------------- auth / user ---------------- */
function getToken () {
  return localStorage.getItem('token') || sessionStorage.getItem('token') || ''
}
function getAuthHeaders () {
  const token = getToken()
  return token ? { Authorization: `Bearer ${token}` } : {}
}
function handleAuth (res) {
  if (res.status === 401) {
    localStorage.removeItem('token')
    sessionStorage.removeItem('token')
    localStorage.removeItem('user')
    sessionStorage.removeItem('user')
    ElMessage.warning(t('auth.sessionExpired') || '登入逾時，請重新登入')
    location.href = '/login'
    return true
  }
  return false
}

const currentUser = ref(null)
const isAdmin = computed(() => String(currentUser.value?.role || '').toLowerCase() === 'admin')

/* ---------------- state ---------------- */
const loading = ref(false)
const submitting = ref(false)
const formRef = ref(null)

const userOptions = ref([]) // users for supporter
const supportList = ref([])

/* ---------------- form ---------------- */
const form = reactive({
  supportDate: new Date().toISOString().slice(0, 10),
  requesterDept: '',
  requester: '',
  supporterId: null,
  projectName: '',
  testType: 'system',
  relatedNo: '',
  testContent: '',
  hours: null,
  status: 'done',
  note: ''
})

const rules = computed(() => ({
  supportDate: [{ required: true, message: t('testSupport.rules.supportDateRequired'), trigger: 'change' }],
  requesterDept: [{ required: true, message: t('testSupport.rules.requesterDeptRequired'), trigger: 'blur' }],
  supporterId: [{ required: true, message: t('testSupport.rules.supporterRequired'), trigger: 'change' }],
  projectName: [{ required: true, message: t('testSupport.rules.projectNameRequired'), trigger: 'blur' }],
  testContent: [{ required: true, message: t('testSupport.rules.testContentRequired'), trigger: 'blur' }],
  hours: [
    { required: true, message: t('testSupport.rules.hoursRequired'), trigger: 'change' },
    { type: 'number', min: 0.1, message: t('testSupport.rules.hoursMin'), trigger: 'change' }
  ],
  status: [{ required: true, message: t('testSupport.rules.statusRequired'), trigger: 'change' }]
}))

/* ---------------- computed ---------------- */
const totalHours = computed(() => {
  const sum = supportList.value.reduce((acc, item) => {
    const h = Number(item?.hours)
    return acc + (Number.isFinite(h) ? h : 0)
  }, 0)
  // 顯示用：一位小數
  return (Math.round(sum * 10) / 10).toFixed(1)
})

/* ---------------- label helpers ---------------- */
function statusLabel (status) {
  const v = String(status || '').toLowerCase()
  if (v === 'done') return t('testSupport.form.statusOptions.done')
  if (v === 'doing') return t('testSupport.form.statusOptions.doing')
  if (v === 'pending') return t('testSupport.form.statusOptions.pending')
  return v || '-'
}
function statusTagType (status) {
  const v = String(status || '').toLowerCase()
  if (v === 'done') return 'success'
  if (v === 'doing') return 'warning'
  if (v === 'pending') return 'info'
  return 'default'
}

/* ---------------- api ---------------- */
async function fetchUsers () {
  try {
    const res = await fetch(`${apiBase}/users/simple`, {
      headers: { ...getAuthHeaders() }
    })
    if (handleAuth(res)) return
    const data = await res.json().catch(() => [])
    userOptions.value = Array.isArray(data) ? data : (data.rows || data.data || [])

    // default supporter = current user (if exists in list)
    if (!form.supporterId && currentUser.value?.id) {
      const self = userOptions.value.find(u => u.id === currentUser.value.id)
      if (self) form.supporterId = self.id
    }
  } catch (err) {
    console.error('❌ fetch users failed:', err)
  }
}

async function fetchSupportList () {
  loading.value = true
  try {
    const res = await fetch(`${apiBase}/test-support`, {
      headers: { ...getAuthHeaders() }
    })
    if (handleAuth(res)) return

    const data = await res.json().catch(() => [])
    if (!res.ok) throw new Error(data?.message || 'Fetch failed')

    supportList.value = Array.isArray(data) ? data : (data.rows || data.data || [])
  } catch (err) {
    console.error('❌ fetch test-support list failed:', err)
    ElMessage.error(t('testSupport.messages.loadSupportFailed') || '載入失敗')
  } finally {
    loading.value = false
  }
}

function resetForm () {
  formRef.value?.clearValidate?.()
  const keepDate = form.supportDate
  Object.assign(form, {
    supportDate: keepDate,
    requesterDept: '',
    requester: '',
    supporterId: currentUser.value?.id ?? null,
    projectName: '',
    testType: 'system',
    relatedNo: '',
    testContent: '',
    hours: null,
    status: 'done',
    note: ''
  })
}

function handleSubmit () {
  if (!formRef.value) return

  formRef.value.validate(async (valid) => {
    if (!valid) return
    if (submitting.value) return
    submitting.value = true

    try {
      const payload = {
        supportDate: form.supportDate,
        requesterDept: (form.requesterDept || '').trim(),
        requester: (form.requester || '').trim() || null,
        supporterId: form.supporterId,
        projectName: (form.projectName || '').trim(),
        testType: form.testType,
        relatedNo: (form.relatedNo || '').trim() || null,
        testContent: (form.testContent || '').trim(),
        hours: form.hours,
        status: form.status,
        note: (form.note || '').trim() || null
      }

      const res = await fetch(`${apiBase}/test-support`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify(payload)
      })
      if (handleAuth(res)) return

      const j = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(j?.message || 'Create failed')

      // refresh list (保險：後端可能會補 supporterName 等欄位)
      ElMessage.success(t('testSupport.messages.createSuccess') || '新增成功')
      resetForm()
      fetchSupportList()
    } catch (err) {
      console.error('❌ create test-support failed:', err)
      const msg = String(err?.message || '')
      ElMessage.error(
        msg.includes('Failed to fetch')
          ? (t('testSupport.messages.networkError') || '網路錯誤，無法連線 API')
          : (t('testSupport.messages.createFailed') || msg || '新增失敗')
      )
    } finally {
      submitting.value = false
    }
  })
}

/* ---------------- admin edit ---------------- */
const editDialog = reactive({ visible: false, saving: false })
const editForm = reactive({ id: null, supporterId: null, status: 'done' })

function openEdit (row) {
  editForm.id = row.id
  editForm.supporterId = row.supporterId ?? null
  editForm.status = row.status || 'done'
  editDialog.visible = true
}

async function handleEditSave () {
  if (!editForm.id) return
  editDialog.saving = true
  try {
    const payload = { supporterId: editForm.supporterId, status: editForm.status }

    const res = await fetch(`${apiBase}/test-support/${editForm.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify(payload)
    })
    if (handleAuth(res)) return

    const j = await res.json().catch(() => ({}))
    if (res.status === 403) throw new Error(t('testSupport.messages.updateNoPermission') || '沒有權限')
    if (!res.ok) throw new Error(j?.message || 'Update failed')

    ElMessage.success(t('testSupport.messages.updateSuccess') || '更新成功')
    editDialog.visible = false
    fetchSupportList()
  } catch (err) {
    console.error('❌ update test-support failed:', err)
    ElMessage.error(err?.message || t('testSupport.messages.updateFailed') || '更新失敗')
  } finally {
    editDialog.saving = false
  }
}

/* ---------------- mount ---------------- */
onMounted(() => {
  // load current user
  try {
    const raw = localStorage.getItem('user') || sessionStorage.getItem('user') || 'null'
    currentUser.value = JSON.parse(raw)
  } catch {
    currentUser.value = null
  }

  fetchUsers()
  fetchSupportList()
})
</script>

<style scoped>
.page.test-support-page {
  padding: 16px 20px 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.header-bar {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 12px;
  flex-wrap: wrap;
}

.header-bar .left h2 {
  margin: 0;
  font-size: 22px;
  font-weight: 600;
}

.header-bar .subtitle {
  margin: 4px 0 0;
  font-size: 13px;
  color: var(--el-text-color-secondary);
}

.header-bar .right {
  display: flex;
  gap: 8px;
}

.content-row {
  margin-top: 4px;
}

.block-card {
  margin-bottom: 16px;
  border-radius: 10px;
}

.block-header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 12px;
  gap: 8px;
}

.block-header .title-wrap h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
}

.block-header .hint-text {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.block-header .summary {
  display: flex;
  gap: 10px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.support-form {
  margin-top: 4px;
}

.support-table {
  font-size: 12px;
}

.option-role {
  font-size: 12px;
  color: #999;
  margin-left: 6px;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

@media (max-width: 768px) {
  .header-bar {
    align-items: flex-start;
  }
}
</style>
