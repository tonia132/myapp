// src/router.js
import { createRouter, createWebHistory } from 'vue-router'
import NProgress from 'nprogress'
import 'nprogress/nprogress.css'
import i18n from './i18n'

/* ---------------- Helpers ---------------- */
// ✅ 已登入時要阻擋回去的頁面（只擋 login / register；reset-password 允許登入後也可用）
const BLOCK_PUBLIC_PAGES_WHEN_LOGGED_IN = new Set(['/login', '/register'])

const APP_TITLE = '測試系統'

function getToken () {
  return localStorage.getItem('token') || sessionStorage.getItem('token') || ''
}

function getUser () {
  try {
    return JSON.parse(
      localStorage.getItem('user') ||
      sessionStorage.getItem('user') ||
      'null'
    )
  } catch {
    return null
  }
}

function cleanAuth () {
  localStorage.removeItem('token')
  localStorage.removeItem('user')
  sessionStorage.removeItem('token')
  sessionStorage.removeItem('user')
}

/** base64url decode payload -> object */
function decodeJwtPayload (token) {
  try {
    const parts = String(token).split('.')
    if (parts.length < 2) return null

    // base64url -> base64
    let b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    // padding
    b64 += '='.repeat((4 - (b64.length % 4)) % 4)

    return JSON.parse(atob(b64))
  } catch {
    return null
  }
}

/**
 * exp 檢查：
 * - 若你要「到期前 30 秒就視為過期」用 now + 30
 * - 若你要「到期後再寬限 30 秒」用 now - 30
 */
function isJwtExpired (token, skewSec = 30) {
  const payload = decodeJwtPayload(token)
  if (!payload) return true
  if (!payload?.exp) return false

  const now = Math.floor(Date.now() / 1000)
  // ✅ 提前 skewSec 秒視為過期（避免邊界）
  return payload.exp <= now + skewSec
}

function normalizeRoleList (to) {
  // meta.roles 優先，其次 meta.role（相容舊寫法）
  if (Array.isArray(to.meta?.roles) && to.meta.roles.length) {
    return to.meta.roles.map(r => String(r).toLowerCase())
  }
  if (to.meta?.role) {
    return [String(to.meta.role).toLowerCase()]
  }
  return []
}

/** 角色取得：user.role 優先，拿不到就從 token payload.role 備援 */
function getRole (user, token) {
  const roleFromUser = String(user?.role || '').toLowerCase()
  if (roleFromUser) return roleFromUser

  const payload = decodeJwtPayload(token)
  const roleFromToken = String(payload?.role || payload?.data?.role || '').toLowerCase()
  return roleFromToken
}

function translateTitleKey (titleKey, fallbackTitle = '') {
  if (!titleKey) return String(fallbackTitle || '').trim()

  try {
    const g = i18n?.global
    if (!g) return String(fallbackTitle || '').trim()

    const hasKey = typeof g.te === 'function' ? g.te(titleKey) : false
    if (hasKey && typeof g.t === 'function') {
      const translated = g.t(titleKey)
      if (translated && translated !== titleKey) return String(translated)
    }
  } catch {}

  return String(fallbackTitle || '').trim()
}

function resolveRouteTitle (to) {
  const titleKey = String(to?.meta?.titleKey || '').trim()
  const fallbackTitle = String(to?.meta?.title || '').trim()

  const pageTitle = titleKey
    ? translateTitleKey(titleKey, fallbackTitle)
    : fallbackTitle

  return pageTitle ? `${pageTitle} | ${APP_TITLE}` : APP_TITLE
}

/* ---------------- Routes ---------------- */
const routes = [
  // ── 公開頁 ───────────────────────────────────────────
  {
    path: '/login',
    name: 'Login',
    component: () => import(/* webpackChunkName: "auth" */ './views/Login.vue'),
    meta: {
      public: true,
      titleKey: 'routeTitles.login',
      title: '登入'
    }
  },
  {
    path: '/register',
    name: 'Register',
    component: () => import(/* webpackChunkName: "auth" */ './views/Register.vue'),
    meta: {
      public: true,
      titleKey: 'routeTitles.register',
      title: '註冊'
    }
  },

  // ✅ 舊路徑相容：全部導到 /reset-password
  {
    path: '/forgot-password',
    name: 'ForgotPasswordRedirect',
    redirect: '/reset-password',
    meta: {
      public: true,
      titleKey: 'routeTitles.resetPassword',
      title: '重設密碼'
    }
  },
  {
    path: '/forgot',
    name: 'ForgotRedirect',
    redirect: '/reset-password',
    meta: {
      public: true,
      titleKey: 'routeTitles.resetPassword',
      title: '重設密碼'
    }
  },

  // ✅ 新的「重設密碼（使用者自己改）」頁
  {
    path: '/reset-password',
    name: 'ResetPassword',
    component: () => import(/* webpackChunkName: "auth" */ './views/ResetPassword.vue'),
    meta: {
      public: true,
      titleKey: 'routeTitles.resetPassword',
      title: '重設密碼'
    }
  },

  // 快速登出
  {
    path: '/logout',
    name: 'Logout',
    meta: { public: true },
    beforeEnter: (_, __, next) => {
      cleanAuth()
      next('/login')
    }
  },

  // ── 內部頁 ───────────────────────────────────────────
  {
    path: '/change-password',
    redirect: '/profile'
  },

  // ✅ 若你要「未登入也可進 Welcome」→ 設 public: true（你原本就打開）
  {
    path: '/welcome',
    name: 'Welcome',
    component: () => import('./views/Welcome.vue'),
    meta: {
      public: true,
      titleKey: 'layout.dashboard',
      title: 'Welcome'
    }
    // 如果你不想公開：刪掉 public: true 即可
  },

  // 產品
  {
    path: '/products',
    name: 'Products',
    component: () => import('./views/Products.vue'),
    meta: {
      titleKey: 'routeTitles.products',
      title: '產品管理'
    }
  },

  // 測試項目庫
  {
    path: '/test-cases',
    name: 'TestCaseWriter',
    component: () => import('./views/TestCaseWriter.vue'),
    meta: {
      titleKey: 'routeTitles.testCases',
      title: '測試項目',
      activePath: '/test-cases'
    }
  },

  // 測試集
  {
    path: '/test-sets',
    name: 'TestSetBuilder',
    component: () => import('./views/TestSetBuilder.vue'),
    meta: {
      titleKey: 'routeTitles.testSets',
      title: '測試集',
      activePath: '/test-sets'
    }
  },

  // x86
  {
    path: '/products/:id/test',
    name: 'ProductTest',
    component: () => import('./views/ProductTest.vue'),
    meta: {
      titleKey: 'routeTitles.productTest',
      title: 'x86 測試報告',
      activePath: '/products'
    }
  },

  // ARM
  {
    path: '/products/:id/arm-test',
    name: 'ArmTest',
    component: () => import('./views/ArmTest.vue'),
    meta: {
      titleKey: 'routeTitles.armTest',
      title: 'ARM 測試報告',
      activePath: '/products'
    }
  },

  // Display
  {
    path: '/products/:id/display-test',
    name: 'DisplayTest',
    component: () => import('./views/DisplayTest.vue'),
    meta: {
      titleKey: 'routeTitles.displayTest',
      title: 'Display 測試報告',
      activePath: '/products'
    }
  },

  // ✅ 硬碟 / 記憶體（測試物件報告）
  {
    path: '/products/:id/part-test',
    name: 'PartTest',
    component: () => import('./views/PartTest.vue'),
    meta: {
      titleKey: 'routeTitles.partTest',
      title: '硬碟/記憶體測試報告',
      activePath: '/products'
    }
  },

  // （可選）快捷入口：直接進 Storage / Memory
  {
    path: '/products/:id/storage-test',
    name: 'StorageTest',
    redirect: (to) => ({
      path: `/products/${to.params.id}/part-test`,
      query: { ...to.query, kind: 'storage' }
    }),
    meta: {
      titleKey: 'routeTitles.storageTest',
      title: 'SSD/Storage 測試報告',
      activePath: '/products'
    }
  },
  {
    path: '/products/:id/memory-test',
    name: 'MemoryTest',
    redirect: (to) => ({
      path: `/products/${to.params.id}/part-test`,
      query: { ...to.query, kind: 'memory' }
    }),
    meta: {
      titleKey: 'routeTitles.memoryTest',
      title: 'Memory 測試報告',
      activePath: '/products'
    }
  },

  // 📋 測試需求單
  {
    path: '/test-requests',
    name: 'TestRequest',
    component: () => import('./views/TestRequest.vue'),
    meta: {
      titleKey: 'routeTitles.testRequests',
      title: '測試需求單'
    }
  },

  // 🛟 測試支援
  {
    path: '/test-support',
    name: 'TestSupport',
    component: () => import('./views/TestSupport.vue'),
    meta: {
      titleKey: 'routeTitles.testSupport',
      title: '測試支援'
    }
  },

  // 📁 檔案中心
  {
    path: '/files',
    name: 'Files',
    component: () => import('./views/FilesManager.vue'),
    meta: {
      titleKey: 'routeTitles.files',
      title: '檔案中心'
    }
  },

  // 📄 文件管理
  {
    path: '/doc-manager',
    name: 'DocManager',
    component: () => import('./views/DocumentManagement.vue'),
    meta: {
      titleKey: 'routeTitles.docManager',
      title: '文件管理'
    }
  },
  { path: '/documents', redirect: '/doc-manager' },

  // 🛡 安規報告
  {
    path: '/safety-reports',
    name: 'SafetyReports',
    component: () => import('./views/SafetyReports.vue'),
    meta: {
      titleKey: 'routeTitles.safetyReports',
      title: '安規報告'
    }
  },

  // 💿 OS Recovery Center
  {
    path: '/os-recovery',
    name: 'OSRecovery',
    component: () => import('./views/OSRecovery.vue'),
    meta: {
      titleKey: 'routeTitles.osRecovery',
      title: 'OS Recovery Center'
    }
  },

  // 📦 倉庫管理
  {
    path: '/warehouse',
    redirect: '/warehouse/items'
  },
  {
    path: '/warehouse/items',
    name: 'WarehouseItems',
    component: () => import('./views/WarehouseItemsView.vue'),
    meta: {
      titleKey: 'warehouse.nav.items',
      title: '倉庫管理'
    }
  },
  {
    path: '/warehouse/borrows',
    name: 'WarehouseBorrows',
    component: () => import('./views/WarehouseBorrowsView.vue'),
    meta: {
      titleKey: 'warehouse.nav.borrows',
      title: '借用紀錄'
    }
  },

  // 舊路徑相容
  {
    path: '/warehouse/borrow',
    redirect: '/warehouse/borrows'
  },

  // 🧰 儀器設備
  {
    path: '/equipment',
    name: 'Equipment',
    component: () => import('./views/Equipment.vue'),
    meta: {
      titleKey: 'routeTitles.equipment',
      title: '儀器設備'
    }
  },

  // ✅ 審核中心
  {
    path: '/review-center',
    name: 'ReviewCenter',
    component: () => import('./views/ReviewCenter.vue'),
    meta: {
      titleKey: 'routeTitles.reviewCenter',
      title: '審核中心',
      roles: ['admin']
    }
  },

  // 💡 意見回饋
  {
    path: '/suggestion',
    name: 'Suggestion',
    component: () => import('./views/Suggestion.vue'),
    meta: {
      titleKey: 'routeTitles.suggestion',
      title: '意見回饋'
    }
  },
  {
    path: '/suggestions/mine',
    name: 'SuggestionList',
    component: () => import('./views/SuggestionList.vue'),
    meta: {
      titleKey: 'routeTitles.suggestionMine',
      title: '我的建議'
    }
  },
  {
    path: '/suggestions',
    name: 'SuggestionsManagement',
    component: () => import('./views/SuggestionsManagement.vue'),
    meta: {
      titleKey: 'routeTitles.suggestionsManagement',
      title: '建議管理',
      role: 'admin'
    }
  },
  { path: '/feedback', redirect: '/suggestion' },

  // 👥 使用者
  {
    path: '/users-list',
    name: 'UsersList',
    component: () => import('./views/Users.vue'),
    meta: {
      titleKey: 'routeTitles.usersList',
      title: '使用者列表'
    }
  },
  {
    path: '/users',
    name: 'UserManagement',
    component: () => import('./views/UserManagement.vue'),
    meta: {
      titleKey: 'routeTitles.usersManagement',
      title: '使用者管理',
      role: 'admin'
    }
  },

  // 📊 統計
  {
    path: '/stats/user-plans',
    name: 'UserPlanStats',
    component: () => import('./views/UserPlanStats.vue'),
    meta: {
      titleKey: 'routeTitles.userPlanStats',
      title: '使用者方案統計',
      role: 'admin'
    }
  },

  // 🧾 日誌
  {
    path: '/logs',
    name: 'Logs',
    component: () => import('./views/Logs.vue'),
    meta: {
      titleKey: 'routeTitles.logs',
      title: '系統日誌',
      role: 'admin'
    }
  },

  // 👤 個人
  {
    path: '/profile',
    name: 'Profile',
    component: () => import('./views/Profile.vue'),
    meta: {
      titleKey: 'routeTitles.profile',
      title: '個人資料'
    }
  },

  // 🧩 測試集
  {
    path: '/default-test-sets',
    name: 'TestSetManagement',
    component: () => import('./views/TestSetManagement.vue'),
    meta: {
      titleKey: 'routeTitles.defaultTestSets',
      title: '預設測試集',
      role: 'admin'
    }
  },
  { path: '/testsets', redirect: '/default-test-sets' },

  // 🧪 labs
  {
    path: '/emc-si',
    name: 'EMCSI',
    component: () => import('./views/EMCSI.vue'),
    meta: {
      titleKey: 'routeTitles.emcsi',
      title: 'EMC&SI 實驗室排程'
    }
  },
  {
    path: '/ip',
    name: 'IPLab',
    component: () => import('./views/IP.vue'),
    meta: {
      titleKey: 'routeTitles.ipLab',
      title: 'IP 實驗室排程'
    }
  },
  {
    path: '/ik',
    name: 'IKLab',
    component: () => import('./views/IK.vue'),
    meta: {
      titleKey: 'routeTitles.ikLab',
      title: 'IK 實驗室排程'
    }
  },
  {
    path: '/ems',
    name: 'EMS',
    component: () => import('./views/EMS.vue'),
    meta: {
      titleKey: 'routeTitles.ems',
      title: 'EMS 實驗室排程'
    }
  },

  // 🖥️ machines
  {
    path: '/machines',
    name: 'MachineDashboard',
    component: () => import('./views/MachineDashboard.vue'),
    meta: {
      titleKey: 'routeTitles.machineDashboard',
      title: '機台總覽'
    }
  },
  { path: '/machine-dashboard', redirect: '/machines' },
  {
    path: '/machines/:id',
    name: 'MachineDetail',
    component: () => import('./views/MachineDetail.vue'),
    meta: {
      titleKey: 'routeTitles.machineDetail',
      title: '機台詳情'
    }
  },

  {
    path: '/reliability-capacity',
    name: 'ReliabilityCapacity',
    component: () => import('./views/ReliabilityCapacity.vue'),
    meta: {
      titleKey: 'routeTitles.reliabilityCapacity',
      title: 'Reliability 機台可工作容量'
    }
  },

  {
    path: '/machine-tests',
    name: 'MachineTestPage',
    component: () => import('./views/MachineTestPage.vue'),
    meta: {
      titleKey: 'routeTitles.machineTests',
      title: '機台測試排程'
    }
  },
  {
    path: '/machine-schedules',
    name: 'MachineSchedules',
    redirect: (to) => ({ path: '/machine-tests', query: to.query })
  },
  {
    path: '/machine-schedules/new',
    name: 'MachineScheduleCreate',
    component: () => import('./views/MachineTestPage.vue'),
    meta: {
      titleKey: 'routeTitles.machineTests',
      title: '機台測試排程'
    }
  },
  {
    path: '/machine-schedules/:id',
    name: 'MachineScheduleEdit',
    redirect: (to) => ({
      path: '/machine-tests',
      query: { ...to.query, scheduleId: to.params.id }
    })
  },
  {
    path: '/schedule/:id?',
    name: 'ScheduleEditor',
    redirect: (to) => ({
      path: '/machine-tests',
      query: { ...to.query, scheduleId: to.params.id }
    })
  },

  // SOP compatibility
  { path: '/sop/:pathMatch(.*)*', redirect: '/files' },
  { path: '/sop-editor/:pathMatch(.*)*', redirect: '/files' },

  // 入口與 404
  { path: '/', redirect: '/welcome' },
  { path: '/:pathMatch(.*)*', redirect: '/welcome' }
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior (to, from, saved) {
    if (saved) return saved
    return { top: 0 }
  }
})

/* ---------------- Guards ---------------- */
NProgress.configure({ showSpinner: false })

router.beforeEach((to, from, next) => {
  NProgress.start()

  const token = getToken()
  const user = getUser()
  const uRole = getRole(user, token)

  // ① token 有但過期 → 清掉導回登入
  if (token && isJwtExpired(token, 30)) {
    cleanAuth()
    return next({
      path: '/login',
      query: { redirect: to.fullPath, reason: 'expired' }
    })
  }

  // ② 未登入：只能走 public
  if (!to.meta.public && !token) {
    return next({
      path: '/login',
      query: { redirect: to.fullPath }
    })
  }

  // ③ 已登入：只阻擋回 login/register（✅ reset-password 允許登入後也可用）
  if (token && to.meta.public && BLOCK_PUBLIC_PAGES_WHEN_LOGGED_IN.has(to.path)) {
    return next('/welcome')
  }

  // ④ 角色權限（統一看 normalizeRoleList）
  const allow = normalizeRoleList(to)
  if (allow.length) {
    if (!allow.includes(uRole)) {
      return next('/welcome')
    }
  }

  next()
})

router.afterEach((to) => {
  document.title = resolveRouteTitle(to)
  NProgress.done()
})

router.onError(() => NProgress.done())

export default router