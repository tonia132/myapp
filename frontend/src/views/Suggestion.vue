<template>
  <div class="page suggestion-page-vivid">
    <section class="hero-card">
      <div class="hero-main">
        <div class="hero-left">
          <div class="hero-icon-wrap">
            <div class="hero-icon">💡</div>
          </div>

          <div class="hero-copy">
            <div class="hero-eyebrow">{{ text('suggestion.eyebrow', 'Idea & Feedback Hub') }}</div>
            <h2 class="hero-title">{{ text('suggestion.title', '建議回饋') }}</h2>
            <div class="hero-subtitle">
              {{ text('suggestion.heroSubtitle', '提交想法、功能建議與流程優化意見，並快速追蹤最新回覆進度') }}
            </div>
          </div>
        </div>

        <div class="hero-right">
          <el-tag type="success" effect="dark" v-if="latestList.length" class="pill">
            {{ text('suggestion.headerRecentCount', '{count} 筆最近紀錄', { count: latestList.length }) }}
          </el-tag>

          <el-button
            class="btn"
            type="primary"
            plain
            @click="$router.push('/suggestions/mine')"
          >
            {{ text('suggestion.btnViewAll', '查看我的全部建議') }}
          </el-button>
        </div>
      </div>

      <div class="stat-grid">
        <div class="stat-card stat-primary">
          <div class="stat-label">{{ text('suggestion.stats.latest', '最近顯示') }}</div>
          <div class="stat-value">{{ latestList.length }}</div>
        </div>

        <div class="stat-card">
          <div class="stat-label">{{ text('suggestion.stats.pending', '待處理') }}</div>
          <div class="stat-value">{{ pendingCount }}</div>
        </div>

        <div class="stat-card">
          <div class="stat-label">{{ text('suggestion.stats.inProgress', '處理中') }}</div>
          <div class="stat-value">{{ inProgressCount }}</div>
        </div>

        <div class="stat-card">
          <div class="stat-label">{{ text('suggestion.stats.closed', '已完成') }}</div>
          <div class="stat-value">{{ closedCount }}</div>
        </div>
      </div>
    </section>

    <div class="content-grid">
      <el-card shadow="never" class="form-card">
        <template #header>
          <div class="section-head">
            <div>
              <div class="section-title">{{ text('suggestion.formTitle', '新增建議') }}</div>
              <div class="section-subtitle">
                {{ text('suggestion.formSubtitle', '可填寫標題、優先級與詳細內容，協助團隊更快理解你的想法') }}
              </div>
            </div>
            <el-tag size="small" type="info" effect="plain" round>
              {{ text('suggestion.formThanks', '感謝你的回饋') }}
            </el-tag>
          </div>
        </template>

        <div class="form-hero">
          <div class="form-hero-main">
            <div class="form-hero-title">{{ text('suggestion.formHeroTitle', '提交新的建議內容') }}</div>
            <div class="form-hero-subtitle">
              {{ text('suggestion.formHeroSubtitle', '送出後會出現在右側最近紀錄，也可到我的建議查看全部狀態') }}
            </div>
          </div>

          <div class="form-preview">
            <div class="preview-label">{{ text('suggestion.preview', '預覽') }}</div>
            <div class="preview-value">{{ form.title || text('suggestion.fieldTitle', '標題') }}</div>
            <div class="preview-sub">{{ priorityLabel(form.priority) }}</div>
          </div>
        </div>

        <el-form
          ref="formRef"
          :model="form"
          :rules="rules"
          :label-width="isMobile ? 'auto' : '90px'"
          :label-position="isMobile ? 'top' : 'right'"
          class="suggest-form"
          @submit.prevent="submit"
        >
          <el-form-item :label="text('suggestion.fieldTitle', '標題')" prop="title">
            <el-input
              v-model.trim="form.title"
              maxlength="120"
              show-word-limit
              :placeholder="text('suggestion.placeholderTitle', '請輸入建議標題')"
            />
          </el-form-item>

          <el-form-item :label="text('suggestion.fieldPriority', '優先級')" prop="priority">
            <el-segmented
              v-model="form.priority"
              :options="priorityOptions"
              class="priority-segment"
            />
          </el-form-item>

          <el-form-item :label="text('suggestion.fieldContent', '內容')" prop="content">
            <el-input
              v-model.trim="form.content"
              type="textarea"
              :rows="7"
              maxlength="2000"
              show-word-limit
              :placeholder="text('suggestion.placeholderContent', '請描述你的建議內容、情境與預期改善方向')"
            />
          </el-form-item>

          <div class="form-actions">
            <el-button class="btn" type="primary" :loading="submitting" @click="submit">
              {{ text('suggestion.btnSubmit', '送出建議') }}
            </el-button>
            <el-button class="btn" @click="resetForm">
              {{ text('suggestion.btnReset', '重設') }}
            </el-button>
          </div>
        </el-form>
      </el-card>

      <el-card shadow="never" class="timeline-card">
        <template #header>
          <div class="section-head">
            <div>
              <div class="section-title">{{ text('suggestion.rightTitle', '我最近的建議') }}</div>
              <div class="section-subtitle">
                {{ text('suggestion.timelineSubtitle', '顯示最近 5 筆紀錄與目前回覆狀態，方便快速追蹤') }}
              </div>
            </div>

            <el-button
              v-if="!loadingMine"
              type="primary"
              text
              size="small"
              @click="fetchMine"
            >
              {{ text('suggestion.btnReload', '重新整理') }}
            </el-button>
          </div>
        </template>

        <el-skeleton v-if="loadingMine" :rows="5" animated />

        <template v-else>
          <el-empty
            v-if="!latestList.length"
            :description="text('suggestion.empty', '目前沒有建議紀錄')"
          />

          <div v-else class="timeline-list">
            <article
              v-for="item in latestList"
              :key="item.id"
              class="timeline-item-card"
            >
              <div class="timeline-top">
                <div class="timeline-top-left">
                  <div class="timeline-time">{{ formatTime(item.createdAt) }}</div>
                  <div class="timeline-title-row">
                    <el-tag :type="priorityTagType(item.priority)" size="small" effect="dark" class="pill mini">
                      {{ priorityLabel(item.priority) }}
                    </el-tag>

                    <span class="item-title">{{ item.title }}</span>

                    <el-tag
                      size="small"
                      :type="statusTagType(item.status)"
                      effect="plain"
                      class="pill mini"
                    >
                      {{ statusLabel(item.status) }}
                    </el-tag>
                  </div>
                </div>
              </div>

              <div class="item-content">
                {{ item.content }}
              </div>

              <div class="reply-box" :class="{ pending: !item.adminReply }">
                <div class="reply-label">
                  {{
                    item.adminReply
                      ? text('suggestion.adminReplyPrefix', '管理員回覆：')
                      : text('suggestion.adminPendingReply', '等待管理員回覆')
                  }}
                </div>
                <div class="reply-text">
                  {{ item.adminReply || text('suggestion.pendingHint', '目前尚未收到回覆，請稍後再查看。') }}
                </div>
              </div>
            </article>
          </div>
        </template>
      </el-card>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onBeforeUnmount } from 'vue'
import { useI18n } from 'vue-i18n'
import { ElMessage } from 'element-plus'
import api from '@/api'

const { t, te } = useI18n()

function text (key, fallback, params) {
  if (te(key)) return t(key, params)
  if (!params) return fallback
  return String(fallback).replace(/\{(\w+)\}/g, (_, k) => String(params?.[k] ?? ''))
}

/* RWD */
const isMobile = ref(false)
let mql = null
let cleanupMql = null
function setupMql () {
  mql = window.matchMedia('(max-width: 768px)')
  const apply = () => { isMobile.value = !!mql.matches }
  apply()
  try { mql.addEventListener('change', apply) } catch { mql.addListener(apply) }
  return () => {
    try { mql.removeEventListener('change', apply) } catch { mql.removeListener(apply) }
  }
}

/* ---------- 表單 ---------- */
const formRef = ref(null)
const form = reactive({ title: '', priority: 'P2', content: '' })

const rules = computed(() => ({
  title: [{ required: true, message: text('suggestion.rules.titleRequired', '請輸入標題'), trigger: 'blur' }],
  content: [{ required: true, message: text('suggestion.rules.contentRequired', '請輸入內容'), trigger: 'blur' }]
}))

const priorityOptions = computed(() => [
  { label: priorityLabel('P1'), value: 'P1' },
  { label: priorityLabel('P2'), value: 'P2' },
  { label: priorityLabel('P3'), value: 'P3' }
])

const submitting = ref(false)

function resetForm () {
  form.title = ''
  form.priority = 'P2'
  form.content = ''
  formRef.value?.clearValidate?.()
}

async function submit () {
  await formRef.value?.validate?.()
  if (submitting.value) return
  submitting.value = true

  try {
    const payload = {
      title: String(form.title || '').trim(),
      priority: String(form.priority || 'P2').trim(),
      content: String(form.content || '').trim()
    }
    const { data } = await api.post('/suggestions', payload)
    ElMessage.success(data?.message || text('suggestion.message.sent', '送出成功'))
    resetForm()
    fetchMine()
  } catch (err) {
    console.error('❌ 送出建議失敗:', err)
    ElMessage.error(err?.response?.data?.message || text('suggestion.message.sendFailed', '送出失敗'))
  } finally {
    submitting.value = false
  }
}

/* ---------- 我最近的建議 ---------- */
const mine = ref([])
const loadingMine = ref(false)

function extractList (payload) {
  if (!payload) return []
  if (Array.isArray(payload.data)) return payload.data
  if (Array.isArray(payload.data?.rows)) return payload.data.rows
  if (Array.isArray(payload)) return payload
  if (Array.isArray(payload.rows)) return payload.rows
  return []
}

async function fetchMine () {
  loadingMine.value = true
  try {
    const { data } = await api.get('/suggestions/mine', { params: { limit: 5 } })
    mine.value = extractList(data)
  } catch (err) {
    console.error('❌ 取得我的建議失敗:', err)
    mine.value = []
    ElMessage.error(err?.response?.data?.message || text('suggestion.message.loadFailed', '載入失敗'))
  } finally {
    loadingMine.value = false
  }
}

const latestList = computed(() => {
  const arr = Array.isArray(mine.value) ? mine.value : []
  const sorted = [...arr].sort((a, b) => {
    const ta = new Date(a.createdAt || a.created_at || 0).getTime()
    const tb = new Date(b.createdAt || b.created_at || 0).getTime()
    return tb - ta
  })
  return sorted.slice(0, 5)
})

const pendingCount = computed(() =>
  latestList.value.filter(x => {
    const v = String(x?.status || '').toLowerCase()
    return !v || v === 'pending'
  }).length
)
const inProgressCount = computed(() =>
  latestList.value.filter(x => String(x?.status || '').toLowerCase() === 'in_progress').length
)
const closedCount = computed(() =>
  latestList.value.filter(x => {
    const v = String(x?.status || '').toLowerCase()
    return v === 'closed' || v === 'resolved'
  }).length
)

/* ---------- 顯示用小工具 ---------- */
function formatTime (val) {
  if (!val) return ''
  const d = new Date(val)
  if (Number.isNaN(d.getTime())) return String(val)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  return `${y}-${m}-${day} ${hh}:${mm}`
}

function priorityLabel (p) {
  const key = String(p ?? '').trim().toUpperCase()
  if (key === 'P1') return text('suggestion.priority.P1', '高')
  if (key === 'P2') return text('suggestion.priority.P2', '中')
  if (key === 'P3') return text('suggestion.priority.P3', '低')
  return text('suggestion.priority.unknown', key || 'N/A', { value: key || 'N/A' })
}
function priorityTagType (p) {
  const key = String(p ?? '').trim().toUpperCase()
  if (key === 'P1') return 'danger'
  if (key === 'P2') return 'warning'
  if (key === 'P3') return 'info'
  return 'info'
}

function statusLabel (s) {
  const v = String(s || '').toLowerCase()
  if (v === 'closed' || v === 'resolved') return text('suggestion.status.closed', '已完成')
  if (v === 'in_progress') return text('suggestion.status.inProgress', '處理中')
  return text('suggestion.status.pending', '待處理')
}
function statusTagType (s) {
  const v = String(s || '').toLowerCase()
  if (v === 'closed' || v === 'resolved') return 'success'
  if (v === 'in_progress') return 'warning'
  return 'info'
}

onMounted(() => {
  cleanupMql = setupMql()
  fetchMine()
})

onBeforeUnmount(() => {
  if (cleanupMql) cleanupMql()
})
</script>

<style scoped>
.suggestion-page-vivid {
  --sg-border: var(--el-border-color-light);
  --sg-border-soft: var(--el-border-color-lighter);
  --sg-card-bg:
    radial-gradient(circle at top right, color-mix(in srgb, var(--el-color-primary) 12%, transparent) 0%, transparent 34%),
    linear-gradient(180deg, color-mix(in srgb, var(--el-bg-color) 94%, var(--el-color-primary-light-9) 6%) 0%, var(--el-bg-color) 100%);
  --sg-soft-bg: color-mix(in srgb, var(--el-fill-color-light) 88%, white 12%);
  --sg-shadow: 0 18px 48px rgba(0, 0, 0, 0.06);

  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  color: var(--el-text-color-primary);
}

.btn { border-radius: 12px; }
.pill { border-radius: 999px; }
.pill.mini { font-size: 12px; padding: 2px 10px; }

.hero-card,
.form-card,
.timeline-card {
  border: 1px solid var(--sg-border);
  border-radius: 22px;
  background: var(--sg-card-bg);
  box-shadow: var(--sg-shadow);
}

.hero-card {
  padding: 20px;
  overflow: hidden;
  position: relative;
}

.hero-card::after {
  content: '';
  position: absolute;
  inset: auto -70px -70px auto;
  width: 180px;
  height: 180px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--el-color-primary) 10%, transparent);
  filter: blur(10px);
  pointer-events: none;
}

.hero-main {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  margin-bottom: 18px;
}

.hero-left,
.hero-right {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.hero-icon-wrap {
  width: 58px;
  height: 58px;
  border-radius: 18px;
  display: grid;
  place-items: center;
  background: linear-gradient(135deg, var(--el-color-primary-light-8), var(--el-color-primary-light-9));
  border: 1px solid color-mix(in srgb, var(--el-color-primary) 24%, var(--sg-border));
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.45);
}

.hero-icon { font-size: 26px; }

.hero-copy {
  min-width: 0;
}

.hero-eyebrow {
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.08em;
  color: var(--el-color-primary);
  margin-bottom: 4px;
}

.hero-title {
  margin: 0;
  font-size: 30px;
  line-height: 1.08;
  font-weight: 900;
}

.hero-subtitle {
  margin-top: 6px;
  font-size: 13px;
  color: var(--el-text-color-secondary);
}

.stat-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}

.stat-card {
  border-radius: 18px;
  padding: 14px 14px 12px;
  border: 1px solid var(--sg-border-soft);
  background: var(--sg-soft-bg);
}

.stat-primary {
  background: linear-gradient(135deg, var(--el-color-primary-light-8), var(--el-color-primary-light-9));
  border-color: color-mix(in srgb, var(--el-color-primary) 32%, var(--sg-border-soft));
}

.stat-label {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  margin-bottom: 8px;
}

.stat-value {
  font-size: 26px;
  line-height: 1;
  font-weight: 900;
}

.content-grid {
  display: grid;
  grid-template-columns: minmax(340px, 0.95fr) minmax(0, 1.25fr);
  gap: 16px;
}

.section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.section-title {
  font-size: 18px;
  font-weight: 900;
  line-height: 1.2;
}

.section-subtitle {
  margin-top: 4px;
  font-size: 13px;
  color: var(--el-text-color-secondary);
}

.form-hero {
  display: grid;
  grid-template-columns: minmax(0, 1.3fr) minmax(180px, 0.9fr);
  gap: 12px;
  margin-bottom: 16px;
}

.form-hero-main,
.form-preview {
  padding: 14px 16px;
  border-radius: 18px;
  border: 1px solid var(--sg-border-soft);
  background: linear-gradient(180deg, var(--sg-soft-bg) 0%, color-mix(in srgb, var(--el-bg-color) 96%, white 4%) 100%);
}

.form-hero-title {
  font-size: 16px;
  font-weight: 800;
}

.form-hero-subtitle {
  margin-top: 6px;
  font-size: 13px;
  color: var(--el-text-color-secondary);
  line-height: 1.6;
}

.preview-label {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  margin-bottom: 6px;
}

.preview-value {
  font-size: 14px;
  font-weight: 800;
  word-break: break-word;
}

.preview-sub {
  margin-top: 6px;
  font-size: 12px;
  color: var(--el-color-primary);
  font-weight: 700;
}

.priority-segment {
  max-width: 320px;
}

.suggest-form {
  margin-top: 4px;
}

.form-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.timeline-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-height: 620px;
  overflow-y: auto;
  padding-right: 2px;
}

.timeline-item-card {
  border: 1px solid var(--sg-border-soft);
  border-radius: 18px;
  background: linear-gradient(180deg, color-mix(in srgb, var(--el-bg-color) 98%, white 2%) 0%, color-mix(in srgb, var(--el-fill-color-light) 72%, var(--el-bg-color) 28%) 100%);
  padding: 14px;
}

.timeline-time {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  margin-bottom: 6px;
}

.timeline-title-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.item-title {
  font-size: 15px;
  font-weight: 800;
  color: var(--el-text-color-primary);
}

.item-content {
  margin-top: 10px;
  font-size: 13px;
  color: var(--el-text-color-regular);
  white-space: pre-wrap;
  line-height: 1.7;
}

.reply-box {
  margin-top: 12px;
  padding: 12px 14px;
  border-radius: 16px;
  border: 1px solid color-mix(in srgb, var(--el-color-success) 20%, var(--sg-border-soft));
  background: color-mix(in srgb, var(--el-color-success-light-9) 74%, white 26%);
}

.reply-box.pending {
  border-color: color-mix(in srgb, var(--el-color-warning) 24%, var(--sg-border-soft));
  background: color-mix(in srgb, var(--el-color-warning-light-9) 76%, white 24%);
}

.reply-label {
  font-size: 12px;
  font-weight: 800;
  margin-bottom: 6px;
  color: var(--el-text-color-primary);
}

.reply-text {
  font-size: 13px;
  color: var(--el-text-color-secondary);
  line-height: 1.6;
  white-space: pre-wrap;
}

@media (max-width: 1100px) {
  .content-grid,
  .form-hero {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 900px) {
  .stat-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 768px) {
  .suggestion-page-vivid {
    padding: 10px;
  }

  .hero-card {
    padding: 16px;
  }

  .hero-main {
    flex-direction: column;
    align-items: stretch;
  }

  .hero-right {
    justify-content: flex-start;
  }

  .form-actions {
    justify-content: flex-start;
  }
}

@media (max-width: 640px) {
  .hero-title {
    font-size: 24px;
  }

  .stat-grid {
    grid-template-columns: 1fr;
  }

  .hero-right :deep(.el-button),
  .form-actions :deep(.el-button) {
    flex: 1 1 100%;
    min-width: 0;
  }

  .priority-segment {
    max-width: none;
    width: 100%;
  }
}
</style>
