<template>
  <el-dropdown trigger="click">
    <el-button text class="lang-btn">
      <el-icon><SwitchButton /></el-icon>
      <span class="label">{{ currentLabel }}</span>
    </el-button>

    <template #dropdown>
      <el-dropdown-menu>
        <el-dropdown-item
          v-for="opt in options"
          :key="opt.value"
          :disabled="locale === opt.value"
          @click="changeLang(opt.value)"
        >
          {{ t(opt.labelKey) }}
        </el-dropdown-item>
      </el-dropdown-menu>
    </template>
  </el-dropdown>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { SwitchButton } from '@element-plus/icons-vue'

const { locale, t } = useI18n()

const STORAGE_KEY = 'locale'
const options = [
  { value: 'zh-TW', labelKey: 'header.langZh' },
  { value: 'en', labelKey: 'header.langEn' }
]

const currentLabel = computed(() => {
  const hit = options.find(o => o.value === locale.value)
  return hit ? t(hit.labelKey) : String(locale.value || '')
})

function normalizeLocale(v) {
  const s = String(v || '').trim()
  return options.some(o => o.value === s) ? s : null
}

function changeLang(lang) {
  const v = normalizeLocale(lang)
  if (!v) return
  if (locale.value === v) return
  locale.value = v
  localStorage.setItem(STORAGE_KEY, v)
}

onMounted(() => {
  const saved = normalizeLocale(localStorage.getItem(STORAGE_KEY))
  if (saved && saved !== locale.value) {
    locale.value = saved
  }
})
</script>

<style scoped>
.lang-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 0 6px;
}
.label {
  margin-left: 2px;
}
</style>
