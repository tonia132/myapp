// frontend/src/main.js
import { createApp } from 'vue'
import App from './App.vue'
import router from './router'

import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import 'element-plus/theme-chalk/dark/css-vars.css'
import './style.css'

import * as ElementPlusIconsVue from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'

// ✅ API 工具
import {
  apiFetch,
  apiUrl,
  getApiBase,
} from './utils/apiBase.js'

// ✅ 全站頁面行為日誌
import { installRouteAudit } from './utils/uiAudit.js'

// ✅ 改成共用 i18n 實例
import i18n from './i18n'

/* ============ 1) 最早套用主題，避免 FOUC ============ */
(() => {
  const html = document.documentElement
  const saved = localStorage.getItem('theme')
  const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches
  const useDark = saved ? saved === 'dark' : prefersDark
  html.classList[useDark ? 'add' : 'remove']('dark')
})()

/* ============ 2) 建立 App ============ */
const app = createApp(App)

/* 全域註冊 Icons */
for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component)
}

/* 全域掛載 API 工具 */
app.config.globalProperties.$apiFetch = apiFetch
app.config.globalProperties.$apiUrl = apiUrl
app.config.globalProperties.$getApiBase = getApiBase

/* 全域錯誤攔截 */
app.config.errorHandler = (err, instance, info) => {
  console.error('Vue Error:', err, info)
  ElMessage.error(err?.message || '發生未預期錯誤')
}

window.addEventListener('unhandledrejection', (e) => {
  console.error('Unhandled promise rejection:', e.reason)
  ElMessage.error(e?.reason?.message || '網路或伺服器連線異常')
})

/* 全站路由切頁行為寫入系統日誌 */
installRouteAudit(router)

/* 掛載外掛與路由 */
app.use(router)
app.use(ElementPlus)
app.use(i18n)

/* 啟動 */
app.mount('#app')