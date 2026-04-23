<template>
  <transition name="sidebar-fade">
    <el-aside
      :width="effectiveCollapsed ? '64px' : '220px'"
      class="sidebar"
      :aria-label="t('sidebar.navLabel')"
      :aria-expanded="String(!effectiveCollapsed)"
      @mouseenter="onMouseEnter"
      @mouseleave="onMouseLeave"
      @focusin="onFocusIn"
      @focusout="onFocusOut"
    >
      <!-- 📘 Logo 區 -->
      <div class="logo-box">
        <div
          class="logo-left"
          @click="$router.push('/welcome')"
          :aria-label="t('sidebar.backHome')"
          style="cursor:pointer"
        >
          <span class="logo-icon">⚙️</span>
          <span v-if="!effectiveCollapsed" class="logo-text">
            {{ t('app.title') }}
          </span>
        </div>
        <el-tooltip
          :content="effectiveCollapsed ? t('sidebar.expand') : t('sidebar.collapse')"
          placement="bottom"
        >
          <el-button
            class="collapse-btn"
            :aria-label="effectiveCollapsed ? t('sidebar.expand') : t('sidebar.collapse')"
            :icon="effectiveCollapsed ? Expand : Fold"
            circle
            size="small"
            @click="toggleCollapse"
          />
        </el-tooltip>
      </div>

      <!-- 📋 主選單（本體） -->
      <el-menu
        :default-active="activeMenu"
        :default-openeds="defaultOpeneds"
        :collapse="effectiveCollapsed"
        :collapse-transition="false"
        router
        class="el-menu-vertical"
        background-color="transparent"
        text-color="var(--el-text-color-secondary)"
        active-text-color="var(--el-color-primary)"
      >
        <template v-for="node in visibleMenu" :key="nodeKey(node)">
          <!-- 單一項目 -->
          <el-menu-item
            v-if="node.type === 'item'"
            :index="node.path"
            :aria-current="activeMenu === node.path ? 'page' : null"
          >
            <el-icon><component :is="node.icon" /></el-icon>
            <template #title>{{ t(node.labelKey) }}</template>
          </el-menu-item>

          <!-- 可收合群組 -->
          <el-sub-menu
            v-else-if="node.type === 'submenu'"
            :index="node.index"
          >
            <template #title>
              <el-icon><component :is="node.icon" /></el-icon>
              <span>{{ t(node.labelKey) }}</span>
            </template>

            <el-menu-item
              v-for="child in node.children"
              :key="child.path"
              :index="child.path"
              :aria-current="activeMenu === child.path ? 'page' : null"
            >
              <el-icon><component :is="child.icon" /></el-icon>
              <template #title>{{ t(child.labelKey) }}</template>
            </el-menu-item>
          </el-sub-menu>
        </template>
      </el-menu>

      <!-- 💡 懸浮展開面板（側邊收起時） -->
      <div
        v-show="effectiveCollapsed && hoverOpen"
        class="flyout"
        @mouseenter="hoverOpen = true"
        @mouseleave="hoverOpen = false"
      >
        <el-menu
          :default-active="activeMenu"
          :default-openeds="defaultOpeneds"
          :collapse="false"
          router
          class="flyout-menu"
          background-color="transparent"
          text-color="var(--el-text-color-secondary)"
          active-text-color="var(--el-color-primary)"
        >
          <template
            v-for="node in visibleMenu"
            :key="nodeKey(node) + '-flyout'"
          >
            <el-menu-item
              v-if="node.type === 'item'"
              :index="node.path"
              :aria-current="activeMenu === node.path ? 'page' : null"
            >
              <el-icon><component :is="node.icon" /></el-icon>
              <template #title>{{ t(node.labelKey) }}</template>
            </el-menu-item>

            <el-sub-menu
              v-else-if="node.type === 'submenu'"
              :index="node.index"
            >
              <template #title>
                <el-icon><component :is="node.icon" /></el-icon>
                <span>{{ t(node.labelKey) }}</span>
              </template>

              <el-menu-item
                v-for="child in node.children"
                :key="child.path + '-flyout'"
                :index="child.path"
                :aria-current="activeMenu === child.path ? 'page' : null"
              >
                <el-icon><component :is="child.icon" /></el-icon>
                <template #title>{{ t(child.labelKey) }}</template>
              </el-menu-item>
            </el-sub-menu>
          </template>
        </el-menu>
      </div>

      <!-- 📱 小螢幕遮罩 -->
      <div
        v-if="effectiveCollapsed && hoverOpen && isSmall"
        class="backdrop"
        role="button"
        tabindex="0"
        :aria-label="t('sidebar.closeFlyout')"
        @click="hoverOpen = false"
        @keydown.escape.stop.prevent="hoverOpen = false"
      />
    </el-aside>
  </transition>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import {
  Fold,
  Expand,
  HomeFilled,
  Monitor,
  List,
  Lock,
  FolderOpened,
  ChatDotRound,
  Tickets,
  Memo,
  Box,
  OfficeBuilding,
  DataAnalysis,
  DocumentAdd,
  CircleCheck
} from '@element-plus/icons-vue'

/* =============================
 * props / route / i18n
 * ============================= */
const props = defineProps({ user: { type: Object, default: null } })
const route = useRoute()
const { t } = useI18n()

const activeMenu = computed(() => route.meta?.activePath || route.path)

/* =============================
 * Roles
 * ============================= */
const ROLE = {
  ADMIN: 'admin',
  USER: 'user',
  SUPERVISOR: 'supervisor',
  GUEST: 'guest'
}

// ✅ 審核者角色（你要誰能審就加誰）
const REVIEWER_ROLES = [ROLE.ADMIN, ROLE.SUPERVISOR]

const role = computed(() => String(props.user?.role || ROLE.GUEST).toLowerCase())

/* =============================
 * Collapse / Responsive
 * ============================= */
const LS_KEY = 'ui.sidebar.collapse'

const isCollapse = ref(false)
const hoverOpen = ref(false)

const isSmall = ref(false)
const mq =
  typeof window !== 'undefined' && window.matchMedia
    ? window.matchMedia('(max-width: 1100px)')
    : null

// 小螢幕永遠收起；桌面用 isCollapse
const effectiveCollapsed = computed(() => isSmall.value || isCollapse.value)

/* =============================
 * Menu Tree (labelKey 用 i18n key)
 * ============================= */
const menuTree = [
  {
    type: 'item',
    path: '/welcome',
    labelKey: 'layout.dashboard',
    icon: HomeFilled,
    roles: [] // everyone
  },

  {
    type: 'submenu',
    index: 'tech-doc-group',
    labelKey: 'sidebar.techDocs',
    icon: FolderOpened,
    roles: [],
    children: [
      { type: 'item', path: '/safety-reports', labelKey: 'sidebar.safetyReports', icon: DocumentAdd, roles: [] },
      { type: 'item', path: '/os-recovery', labelKey: 'sidebar.osRecovery', icon: DataAnalysis, roles: [] }
    ]
  },

  {
    type: 'submenu',
    index: 'product-group',
    labelKey: 'sidebar.productGroup',
    icon: List,
    roles: [],
    children: [
      { type: 'item', path: '/doc-manager', labelKey: 'sidebar.productMgmt', icon: Memo, roles: [] },
      { type: 'item', path: '/products', labelKey: 'sidebar.testPlanReport', icon: List, roles: [] },
      { type: 'item', path: '/test-cases', labelKey: 'sidebar.testCaseLibrary', icon: Tickets, roles: [] },
      { type: 'item', path: '/test-sets', labelKey: 'sidebar.testSets', icon: Tickets, roles: [] },
      { type: 'item', path: '/test-requests', labelKey: 'sidebar.testRequest', icon: DocumentAdd, roles: [] },
      { type: 'item', path: '/test-support', labelKey: 'sidebar.testSupport', icon: Memo, roles: [] }
    ]
  },

  {
    type: 'submenu',
    index: 'lab-group',
    labelKey: 'sidebar.labGroup',
    icon: OfficeBuilding,
    roles: [],
    children: [
      { type: 'item', path: '/equipment', labelKey: 'sidebar.equipment', icon: Box, roles: [] },
      { type: 'item', path: '/machines', labelKey: 'sidebar.labReliability', icon: Monitor, roles: [] },
      { type: 'item', path: '/reliability-capacity', labelKey: 'sidebar.reliabilityCapacity', icon: DataAnalysis, roles: [] },
      { type: 'item', path: '/emc-si', labelKey: 'sidebar.labEmcSi', icon: OfficeBuilding, roles: [] },
      { type: 'item', path: '/ip', labelKey: 'sidebar.labIp', icon: OfficeBuilding, roles: [] },
      { type: 'item', path: '/ik', labelKey: 'sidebar.labIk', icon: OfficeBuilding, roles: [] },
      { type: 'item', path: '/ems', labelKey: 'sidebar.labEms', icon: OfficeBuilding, roles: [] }
    ]
  },

  { type: 'item', path: '/files', labelKey: 'sidebar.files', icon: FolderOpened, roles: [] },

  // ✅ 倉庫管理整合成同一個 submenu
  {
    type: 'submenu',
    index: 'warehouse-group',
    labelKey: 'sidebar.warehouse',
    icon: Box,
    roles: [],
    children: [
      { type: 'item', path: '/warehouse/items', labelKey: 'sidebar.warehouseItems', icon: Box, roles: [] },
      { type: 'item', path: '/warehouse/borrows', labelKey: 'sidebar.warehouseBorrow', icon: Memo, roles: [] }
    ]
  },

  { type: 'item', path: '/suggestion', labelKey: 'sidebar.suggestion', icon: ChatDotRound, roles: [] },

  // 管理工具群組（群組本身：admin/supervisor；細項各自控）
  {
    type: 'submenu',
    index: 'admin-group',
    labelKey: 'sidebar.adminGroup',
    icon: Lock,
    roles: REVIEWER_ROLES,
    children: [
      { type: 'item', path: '/review-center', labelKey: 'sidebar.reviewCenter', icon: CircleCheck, roles: REVIEWER_ROLES },

      { type: 'item', path: '/suggestions', labelKey: 'sidebar.suggestionsMgmt', icon: ChatDotRound, roles: [ROLE.ADMIN] },
      { type: 'item', path: '/default-test-sets', labelKey: 'sidebar.defaultTestSets', icon: Tickets, roles: [ROLE.ADMIN] },
      { type: 'item', path: '/stats/user-plans', labelKey: 'sidebar.userPlanStats', icon: DataAnalysis, roles: [ROLE.ADMIN] },
      { type: 'item', path: '/logs', labelKey: 'layout.logs', icon: Memo, roles: [ROLE.ADMIN] },
      { type: 'item', path: '/users', labelKey: 'layout.users', icon: Lock, roles: [ROLE.ADMIN] }
    ]
  }
]

function canSee (node) {
  const allow = Array.isArray(node.roles) ? node.roles : []
  if (!allow.length) return true
  return allow.includes(role.value)
}

function filterNode (node) {
  if (!canSee(node)) return null

  if (node.type === 'submenu') {
    const children = (node.children || []).map(filterNode).filter(Boolean)
    if (!children.length) return null
    return { ...node, children }
  }
  return node
}

const visibleMenu = computed(() => menuTree.map(filterNode).filter(Boolean))

function nodeKey (node) {
  return node.type === 'submenu' ? node.index : node.path
}

/* =============================
 * default openeds
 * ============================= */
const defaultOpeneds = computed(() => {
  const p = String(activeMenu.value || '')
  const opens = []

  const inAny = (arr) => arr.some(prefix => p.startsWith(prefix))

  if (inAny(['/safety-reports', '/os-recovery'])) opens.push('tech-doc-group')
  if (inAny(['/doc-manager', '/products', '/test-cases', '/test-sets', '/test-requests', '/test-support'])) opens.push('product-group')
  if (inAny(['/machines', '/equipment', '/reliability-capacity', '/emc-si', '/ip', '/ik', '/ems'])) opens.push('lab-group')
  if (inAny(['/warehouse/items', '/warehouse/borrows'])) opens.push('warehouse-group')
  if (inAny(['/review-center', '/suggestions', '/default-test-sets', '/logs', '/users', '/stats'])) opens.push('admin-group')

  return opens
})

/* =============================
 * Collapse / Flyout behavior
 * ============================= */
function toggleCollapse () {
  if (isSmall.value) {
    hoverOpen.value = !hoverOpen.value
    return
  }

  isCollapse.value = !isCollapse.value
  localStorage.setItem(LS_KEY, isCollapse.value ? '1' : '0')
  if (!isCollapse.value) hoverOpen.value = false
}

function applyInitialState () {
  const saved = localStorage.getItem(LS_KEY)
  isCollapse.value = saved === '1'
  if (mq) isSmall.value = mq.matches
  if (!effectiveCollapsed.value) hoverOpen.value = false
}

function handleMqChange (e) {
  isSmall.value = !!e.matches
  hoverOpen.value = false
}

/* hover open/close (flyout) */
let enterTimer = null
let leaveTimer = null

function onMouseEnter () {
  if (!effectiveCollapsed.value) return
  clearTimeout(leaveTimer)
  enterTimer = setTimeout(() => (hoverOpen.value = true), 60)
}
function onMouseLeave () {
  if (!effectiveCollapsed.value) return
  clearTimeout(enterTimer)
  leaveTimer = setTimeout(() => (hoverOpen.value = false), 120)
}
function onFocusIn () {
  if (!effectiveCollapsed.value) return
  hoverOpen.value = true
}
function onFocusOut (e) {
  if (!e?.currentTarget?.contains?.(e.relatedTarget)) hoverOpen.value = false
}

watch(
  () => route.fullPath,
  () => {
    hoverOpen.value = false
  }
)

function onEsc (e) {
  if (e.key === 'Escape' && hoverOpen.value) hoverOpen.value = false
}

/* =============================
 * lifecycle
 * ============================= */
onMounted(() => {
  applyInitialState()

  if (mq) {
    if (mq.addEventListener) mq.addEventListener('change', handleMqChange)
    else if (mq.addListener) mq.addListener(handleMqChange)
  }
  window.addEventListener('keydown', onEsc, true)
})

onBeforeUnmount(() => {
  if (mq) {
    if (mq.removeEventListener) mq.removeEventListener('change', handleMqChange)
    else if (mq.removeListener) mq.removeListener(handleMqChange)
  }
  window.removeEventListener('keydown', onEsc, true)
  clearTimeout(enterTimer)
  clearTimeout(leaveTimer)
})
</script>

<style scoped>
.sidebar {
  height: 100vh;
  background-color: var(--el-bg-color);
  border-right: 1px solid var(--el-border-color);
  display: flex;
  flex-direction: column;
  position: relative;
}

.logo-box {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 60px;
  padding: 0 10px;
  border-bottom: 1px solid var(--el-border-color);
}

.logo-icon {
  font-size: 20px;
}

.logo-text {
  font-weight: 700;
  margin-left: 8px;
  color: var(--el-text-color-primary);
}

.collapse-btn {
  border: none;
}

.el-menu-vertical {
  flex: 1;
  overflow-y: auto;
  padding-top: 10px;
}

/* 🫧 懸浮展開面板 */
.flyout {
  position: fixed;
  top: 0;
  left: 64px;
  bottom: 0;
  width: 220px;
  background: var(--el-bg-color);
  border-right: 1px solid var(--el-border-color);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
  border-radius: 12px;
  overflow: hidden;
  z-index: 999;
  padding-top: 60px;
}

.flyout-menu {
  height: calc(100vh - 60px);
  overflow-y: auto;
  padding-top: 10px;
}

/* 📱 小螢幕遮罩 */
.backdrop {
  position: fixed;
  inset: 0;
  left: 220px;
  background: rgba(0, 0, 0, 0.25);
  z-index: 998;
}

/* 動畫 */
.sidebar-fade-enter-active,
.sidebar-fade-leave-active {
  transition: all 0.25s ease;
}

.sidebar-fade-enter-from,
.sidebar-fade-leave-to {
  opacity: 0;
  transform: translateX(-10px);
}
</style>