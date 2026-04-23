<!-- frontend/src/components/PartTestActions.vue -->
<template>
  <div class="pt-actions">
    <el-space wrap>
      <el-button type="success" plain @click="openSave">
        儲存為預設測試集
      </el-button>
      <el-button plain @click="openApply">
        從預設測試集匯入
      </el-button>
    </el-space>

    <!-- 儲存為預設測試集 -->
    <el-dialog
      v-model="saveVisible"
      title="儲存為預設測試集"
      width="620px"
      :close-on-click-modal="false"
      append-to-body
      @closed="resetSaveDialog"
    >
      <el-form
        ref="saveFormRef"
        :model="saveForm"
        :rules="saveRules"
        label-width="110px"
      >
        <el-form-item label="測試集名稱" prop="name">
          <el-input
            v-model="saveForm.name"
            placeholder="例如：Memory Approval Report Template v0003"
          />
        </el-form-item>

        <el-form-item label="物件類型">
          <el-input :model-value="normalizedObjectType" disabled />
        </el-form-item>

        <el-form-item label="版本">
          <el-input
            v-model="saveForm.version"
            placeholder="例如：v0003"
          />
        </el-form-item>

        <el-form-item label="描述">
          <el-input
            v-model="saveForm.description"
            type="textarea"
            :rows="3"
            placeholder="可選填"
          />
        </el-form-item>

        <el-form-item label="公開">
          <el-switch v-model="saveForm.isPublic" />
        </el-form-item>

        <el-form-item label="內容摘要">
          <div class="muted">
            章節：{{ sectionCount }}　
            測試項：{{ caseCount }}
          </div>
        </el-form-item>
      </el-form>

      <template #footer>
        <el-space>
          <el-button @click="saveVisible = false">取消</el-button>
          <el-button type="primary" :loading="saveLoading" @click="submitSave">
            建立
          </el-button>
        </el-space>
      </template>
    </el-dialog>

    <!-- 從預設測試集匯入 -->
    <el-dialog
      v-model="applyVisible"
      title="從預設測試集匯入"
      width="760px"
      :close-on-click-modal="false"
      append-to-body
      @closed="resetApplyDialog"
    >
      <el-form
        ref="applyFormRef"
        :model="applyForm"
        :rules="applyRules"
        label-width="120px"
      >
        <el-form-item label="測試集" prop="setId">
          <el-select
            v-model="applyForm.setId"
            filterable
            remote
            clearable
            reserve-keyword
            teleported
            :remote-method="remoteSearchDebounced"
            :loading="setsLoading"
            placeholder="輸入關鍵字搜尋測試集"
            style="width: 100%"
          >
            <el-option
              v-for="opt in setOptions"
              :key="opt.value"
              :label="opt.label"
              :value="opt.value"
            >
              <div class="set-opt">
                <div class="set-opt__title">{{ opt.name }}</div>
                <div class="set-opt__meta">
                  <span v-if="opt.version">ver: {{ opt.version }}</span>
                  <span v-if="opt.itemCount != null">items: {{ opt.itemCount }}</span>
                  <span v-if="opt.templateKey">key: {{ opt.templateKey }}</span>
                  <span v-if="opt.isPublic">public</span>
                </div>
              </div>
            </el-option>
          </el-select>

          <small class="muted hint">
            會直接讀取預設測試集並匯入目前產品。
          </small>
        </el-form-item>

        <el-form-item label="覆蓋現有測試項">
          <el-switch v-model="applyForm.overwrite" />
          <span class="muted" style="margin-left: 8px">
            開啟：取代目前產品測項；關閉：附加到目前內容
          </span>
        </el-form-item>

        <el-form-item label="去重方式">
          <el-radio-group v-model="applyForm.dedupe">
            <el-radio label="code">依 TC Code</el-radio>
            <el-radio label="none">不去重</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>

      <template #footer>
        <el-space>
          <el-button @click="applyVisible = false">取消</el-button>
          <el-button type="primary" :loading="applySubmitting" @click="submitApply">
            套用
          </el-button>
        </el-space>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onBeforeUnmount } from 'vue'
import { ElMessage } from 'element-plus'
import getApiBase from '@/utils/apiBase'

const props = defineProps({
  productId: { type: [Number, String], default: '' },
  objectType: { type: String, default: 'generic' },
  sections: {
    type: Array,
    default: () => [],
  },
})

const emit = defineEmits(['applied'])

const apiBase = getApiBase()

const pid = computed(() => String(props.productId ?? '').trim())
const normalizedObjectType = computed(() => String(props.objectType || '').trim() || 'generic')

function deepClone (x) {
  return JSON.parse(JSON.stringify(x ?? null))
}

function clean (v) {
  return String(v ?? '').trim()
}

function toNum (v, def = 0) {
  const n = Number(v)
  return Number.isFinite(n) ? n : def
}

function getToken () {
  return localStorage.getItem('token') || sessionStorage.getItem('token') || ''
}

function clearAuthAndRedirect () {
  localStorage.removeItem('token')
  sessionStorage.removeItem('token')
  localStorage.removeItem('user')
  sessionStorage.removeItem('user')
  ElMessage.warning('登入已過期，請重新登入')
  location.href = '/login'
}

async function apiFetchJson (url, options = {}) {
  const headers = {
    ...(options.headers || {}),
  }

  const token = getToken()
  if (token) headers.Authorization = `Bearer ${token}`

  if (options.body !== undefined && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json'
  }

  const res = await fetch(url, { ...options, headers })

  if (res.status === 401) {
    clearAuthAndRedirect()
    throw new Error('登入已過期，請重新登入')
  }

  let json = {}
  try {
    json = await res.json()
  } catch {
    json = {}
  }

  if (!res.ok) {
    throw new Error(json?.message || 'Request failed')
  }
  if (json && typeof json === 'object' && json.success === false) {
    throw new Error(json?.message || 'Request failed')
  }

  return json
}

function unwrapRows (j) {
  const rows = j?.rows || j?.data?.rows || j?.data || j
  return Array.isArray(rows) ? rows : []
}

function countCases (sections = []) {
  return sections.reduce((sum, sec) => {
    const list = Array.isArray(sec?.testCases) ? sec.testCases : []
    return sum + list.length
  }, 0)
}

const sectionCount = computed(() => {
  const list = Array.isArray(props.sections) ? props.sections : []
  return list.length
})

const caseCount = computed(() => {
  const list = Array.isArray(props.sections) ? props.sections : []
  return countCases(list)
})

function validateForm (formRef) {
  try {
    return formRef?.value?.validate?.() || Promise.resolve(true)
  } catch {
    return Promise.resolve(false)
  }
}

/* ---------------- save dialog ---------------- */
const saveVisible = ref(false)
const saveLoading = ref(false)
const saveFormRef = ref()

const saveForm = reactive({
  name: '',
  version: '',
  description: '',
  isPublic: true,
})

const saveRules = computed(() => ({
  name: [{ required: true, message: '請輸入測試集名稱', trigger: 'blur' }],
}))

function nextDefaultName () {
  const base = normalizedObjectType.value || 'generic'
  return `${base} Set${pid.value ? ` (${pid.value})` : ''}`
}

function openSave () {
  if (!clean(saveForm.name)) saveForm.name = nextDefaultName()
  saveVisible.value = true
}

function resetSaveDialog () {
  saveLoading.value = false
  saveForm.version = ''
  saveForm.description = ''
  saveForm.isPublic = true
  try { saveFormRef.value?.clearValidate?.() } catch {}
}

function mapSectionsToItems (sections = []) {
  const items = []
  let orderNo = 1

  for (const sec of sections) {
    const sectionTitle = clean(sec?.title)
    const sectionNo = clean(sec?.no)
    const sectionKey = clean(sec?.key)
    const sectionIntro = clean(sec?.intro)

    const testCases = Array.isArray(sec?.testCases) ? sec.testCases : []
    for (const tc of testCases) {
      const extra = {
        objectType: normalizedObjectType.value,
        sectionKey,
        sectionNo,
        sectionIntro,
        note: clean(tc?.note),
        photos: Array.isArray(tc?.photos) ? deepClone(tc.photos) : [],
        records: Array.isArray(tc?.records) ? deepClone(tc.records) : [],
      }

      items.push({
        category: sectionTitle || null,
        section: sectionTitle || null,
        code: clean(tc?.code) || null,
        testCase: clean(tc?.title) || null,
        testProcedure: tc?.procedure ?? null,
        testCriteria: tc?.criteria ?? null,
        estHours: toNum(tc?.estHrs, 0),
        isPlanned: true,
        orderNo: orderNo++,
        extra,
      })
    }
  }

  return items
}

async function submitSave () {
  const ok = await validateForm(saveFormRef)
  if (!ok) return

  saveLoading.value = true
  try {
    const sections = deepClone(Array.isArray(props.sections) ? props.sections : [])
    const items = mapSectionsToItems(sections)

    if (!items.length) {
      throw new Error('目前沒有可儲存的測試項')
    }

    const body = {
      name: clean(saveForm.name),
      version: clean(saveForm.version) || null,
      templateKey: normalizedObjectType.value,
      description: clean(saveForm.description) || null,
      isPublic: !!saveForm.isPublic,
      fromProductId: pid.value ? Number(pid.value) : null,
      items,
    }

    const url = `${apiBase}/test-sets`
    const j = await apiFetchJson(url, {
      method: 'POST',
      body: JSON.stringify(body),
    })

    ElMessage.success(j?.message || '已儲存為預設測試集')
    saveVisible.value = false
    emit('applied')
  } catch (e) {
    ElMessage.error(e?.message || '儲存失敗')
  } finally {
    saveLoading.value = false
  }
}

/* ---------------- apply dialog ---------------- */
const applyVisible = ref(false)
const applySubmitting = ref(false)
const setsLoading = ref(false)
const applyFormRef = ref()

const applyForm = reactive({
  setId: null,
  overwrite: true,
  dedupe: 'none',
})

const applyRules = computed(() => ({
  setId: [{ required: true, message: '請選擇測試集', trigger: 'change' }],
}))

const setOptions = ref([])
let setsAbort = null

function normalizeSetRow (s) {
  const items = Array.isArray(s?.items) ? s.items : []
  return {
    value: Number(s?.id || 0),
    name: clean(s?.name) || `#${s?.id}`,
    label: clean(s?.name) || `#${s?.id}`,
    version: clean(s?.version),
    templateKey: clean(s?.templateKey),
    description: clean(s?.description),
    isPublic: !!s?.isPublic,
    itemCount: items.length,
  }
}

async function remoteSearch (keyword = '') {
  if (setsAbort) setsAbort.abort()
  setsAbort = new AbortController()

  setsLoading.value = true
  try {
    const q = new URLSearchParams()
    q.set('includeItems', 'true')
    q.set('page', '1')
    q.set('pageSize', '200')
    if (clean(keyword)) q.set('kw', clean(keyword))

    const url = `${apiBase}/test-sets?${q.toString()}`
    const j = await apiFetchJson(url, {
      signal: setsAbort.signal,
    })

    const rows = unwrapRows(j)
    setOptions.value = rows
      .map(normalizeSetRow)
      .filter(x => x.value > 0)
  } catch (e) {
    if (e?.name !== 'AbortError') {
      setOptions.value = []
    }
  } finally {
    setsLoading.value = false
  }
}

function debounce (fn, delay = 250) {
  let timer = null
  const wrapped = (...args) => {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => fn(...args), delay)
  }
  wrapped.cancel = () => {
    if (timer) clearTimeout(timer)
    timer = null
  }
  return wrapped
}

const remoteSearchDebounced = debounce(remoteSearch, 250)

function openApply () {
  applyVisible.value = true
  remoteSearch('')
}

function resetApplyDialog () {
  applySubmitting.value = false
  setsLoading.value = false

  try { setsAbort?.abort?.() } catch {}
  remoteSearchDebounced.cancel?.()

  applyForm.setId = null
  applyForm.overwrite = true
  applyForm.dedupe = 'none'

  try { applyFormRef.value?.clearValidate?.() } catch {}
}

async function submitApply () {
  const ok = await validateForm(applyFormRef)
  if (!ok) return

  applySubmitting.value = true
  try {
    const setId = Number(applyForm.setId || 0)
    if (!setId) throw new Error('請選擇測試集')
    if (!pid.value) throw new Error('找不到 productId')

    const url = `${apiBase}/testcases/product/${encodeURIComponent(pid.value)}/import-from-set`
    const j = await apiFetchJson(url, {
      method: 'POST',
      body: JSON.stringify({
        setId,
        mode: applyForm.overwrite ? 'replace' : 'append',
        skipExisting: applyForm.dedupe === 'code',
      }),
    })

    ElMessage.success(j?.message || '已載入預設測試集')
    applyVisible.value = false
    emit('applied')
  } catch (e) {
    ElMessage.error(e?.message || '載入失敗')
  } finally {
    applySubmitting.value = false
  }
}

onBeforeUnmount(() => {
  try { setsAbort?.abort?.() } catch {}
  remoteSearchDebounced.cancel?.()
})
</script>

<style scoped>
.pt-actions {
  margin-bottom: 0;
}

.muted {
  color: var(--el-text-color-secondary);
}

.hint {
  display: block;
  margin-top: 6px;
  line-height: 1.4;
}

.set-opt {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.set-opt__title {
  font-weight: 700;
  color: var(--el-text-color-primary);
  line-height: 1.4;
  word-break: break-word;
}

.set-opt__meta {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}
</style>