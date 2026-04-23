<!-- frontend/src/components/NotificationCenter.vue -->
<template>
  <el-popover
    v-model:visible="visible"
    placement="bottom-end"
    :width="360"
    trigger="click"
    @show="refresh"
  >
    <template #reference>
      <el-badge
        :value="summary.total"
        :max="99"
        :hidden="summary.total === 0"
        class="notify-badge"
      >
        <el-button class="notify-btn" :icon="Bell" circle />
      </el-badge>
    </template>

    <div class="notify-panel">
      <div class="head">
        <div class="title">{{ t('notifications.title') }}</div>
        <el-button text size="small" :loading="loading" @click="refresh">
          {{ t('common.refresh') }}
        </el-button>
      </div>

      <el-tabs v-model="tab" class="tabs">
        <el-tab-pane
          v-for="p in panes"
          :key="p.name"
          :label="p.label"
          :name="p.name"
        >
          <div v-if="p.list.length === 0" class="empty">
            <el-empty :description="p.emptyText" />
          </div>

          <el-scrollbar v-else max-height="260">
            <div
              v-for="it in p.list"
              :key="it.id"
              class="item"
              @click="open(it)"
            >
              <div class="item-title">{{ it.title }}</div>
              <div class="item-sub">{{ formatTime(it.createdAt) }}</div>
              <div class="item-sub item-src">{{ it.source }}</div>
            </div>
          </el-scrollbar>

          <div class="foot">
            <el-button size="small" type="primary" plain @click="go(p.path)">
              {{ p.goText }}
            </el-button>
          </div>
        </el-tab-pane>
      </el-tabs>
    </div>
  </el-popover>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { ElMessage } from 'element-plus'
import { Bell } from '@element-plus/icons-vue'
import request from '@/utils/request'

/** ✅ 依你 router.js：審核中心 path */
const PATH = {
  schedule: '/review-center?tab=schedule&status=pending',
  borrow: '/review-center?tab=borrow&status=pending'
}

const { t, locale } = useI18n()
const router = useRouter()

const visible = ref(false)
const loading = ref(false)
const tab = ref('schedule')
const items = ref([])

const summary = reactive({
  total: 0,
  schedulesPending: 0,
  borrowsPending: 0
})

/* ---------- list helpers ---------- */
const scheduleItems = computed(() =>
  items.value.filter(i => i.kind === 'schedule').slice(0, 10)
)
const borrowItems = computed(() =>
  items.value.filter(i => i.kind === 'borrow').slice(0, 10)
)

const panes = computed(() => [
  {
    name: 'schedule',
    label: t('notifications.tabs.schedules', { n: summary.schedulesPending }),
    emptyText: t('notifications.emptySchedule'),
    goText: t('notifications.goSchedule'),
    path: PATH.schedule,
    list: scheduleItems.value
  },
  {
    name: 'borrow',
    label: t('notifications.tabs.borrows', { n: summary.borrowsPending }),
    emptyText: t('notifications.emptyBorrow'),
    goText: t('notifications.goBorrow'),
    path: PATH.borrow,
    list: borrowItems.value
  }
])

/* ---------- api unwrap ---------- */
function unwrap (res) {
  return res?.data?.data ?? res?.data ?? {}
}

async function fetchSummary () {
  const res = await request.get('/notifications/summary')
  const d = unwrap(res)
  summary.total = Number(d.total || 0)
  summary.schedulesPending = Number(d.schedulesPending || 0)
  summary.borrowsPending = Number(d.borrowsPending || 0)
}

async function fetchList () {
  const res = await request.get('/notifications/list', { params: { limit: 50 } })
  const d = unwrap(res)
  items.value = Array.isArray(d.items) ? d.items : []
}

/** ✅ 刷新（summary + list） */
async function refresh () {
  if (loading.value) return
  loading.value = true
  try {
    await Promise.all([fetchSummary(), fetchList()])
  } catch (e) {
    console.error(e)
    ElMessage.error(t('common.loadFailed') || 'Load failed')
  } finally {
    loading.value = false
  }
}

/** ✅ 跳轉時順便把 popover 關掉 */
function go (path) {
  visible.value = false
  router.push(path)
}

function open (it) {
  // ✅ 後端若有 link（例如 /review-center...&id=xxx）優先
  if (it?.link) return go(it.link)
  const kind = String(it?.kind || '')
  if (kind === 'schedule') return go(PATH.schedule)
  if (kind === 'borrow') return go(PATH.borrow)
  // fallback
  return go(PATH.schedule)
}

/* ---------- time formatting ---------- */
const dtf = computed(() => {
  // 跟 i18n 同步（你也可以改成固定 'zh-TW' / 'en-US'）
  const loc = locale.value === 'en' ? 'en-US' : 'zh-TW'
  return new Intl.DateTimeFormat(loc, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
})
function formatTime (v) {
  if (!v) return ''
  const d = new Date(v)
  if (Number.isNaN(d.getTime())) return ''
  return dtf.value.format(d)
}

/* ---------- polling (summary only) ---------- */
let timer = null
function startPoll () {
  stopPoll()
  timer = window.setInterval(() => {
    fetchSummary().catch(() => {})
  }, 30000)
}
function stopPoll () {
  if (timer) {
    window.clearInterval(timer)
    timer = null
  }
}

/** ✅ 允許其他頁（例如 ReviewCenter）在批准/退回後通知我立即更新 */
function onNotifyRefresh () {
  fetchSummary().catch(() => {})
  if (visible.value) fetchList().catch(() => {})
}

onMounted(async () => {
  await fetchSummary().catch(() => {})
  startPoll()
  window.addEventListener('notify-refresh', onNotifyRefresh)
})

onBeforeUnmount(() => {
  stopPoll()
  window.removeEventListener('notify-refresh', onNotifyRefresh)
})
</script>

<style scoped>
.notify-badge { margin-right: 4px; }
.notify-btn { padding: 6px; }

.notify-panel { padding: 6px 4px; }
.head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}
.title { font-weight: 700; }

.item {
  padding: 10px;
  border-radius: 10px;
  cursor: pointer;
  transition: 0.15s;
}
.item:hover { background: var(--el-fill-color-light); }

.item-title { font-size: 13px; font-weight: 600; }
.item-sub { font-size: 12px; opacity: 0.7; margin-top: 2px; }
.item-src { opacity: 0.55; }

.foot { display: flex; justify-content: flex-end; margin-top: 8px; }
.empty { padding: 8px 0; }
</style>
