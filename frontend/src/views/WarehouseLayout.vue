<template>
  <div class="page warehouse-layout-page">
    <div class="warehouse-layout-bar">
      <div class="left">
        <div class="title-wrap">
          <h2 class="title">{{ tt('warehouse.title', '倉庫管理') }}</h2>
          <div class="sub">
            {{ tt('warehouse.layout.subtitle', '庫存清單與借用紀錄') }}
          </div>
        </div>
      </div>

      <div class="right">
        <el-button-group>
          <el-button
            :type="isItems ? 'primary' : 'default'"
            :plain="!isItems"
            @click="goItems"
          >
            {{ tt('warehouse.nav.items', '庫存清單') }}
          </el-button>

          <el-button
            :type="isBorrows ? 'primary' : 'default'"
            :plain="!isBorrows"
            @click="goBorrows"
          >
            {{ tt('warehouse.nav.borrows', '借用紀錄') }}
          </el-button>
        </el-button-group>
      </div>
    </div>

    <RouterView />
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { RouterView, useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'

const route = useRoute()
const router = useRouter()
const { t } = useI18n()

function tt(key, fallback, params) {
  const v = t(key, params || {})
  return v === key ? fallback : v
}

const isItems = computed(() => route.path.startsWith('/warehouse/items'))
const isBorrows = computed(() => route.path.startsWith('/warehouse/borrows'))

function goItems() {
  if (!isItems.value) router.push('/warehouse/items')
}

function goBorrows() {
  if (!isBorrows.value) router.push('/warehouse/borrows')
}
</script>

<style scoped>
.warehouse-layout-page {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.warehouse-layout-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 14px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 14px;
  background: var(--el-fill-color-lighter);
}

.left,
.right {
  display: flex;
  align-items: center;
}

.title-wrap {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.title {
  margin: 0;
  font-size: 20px;
  font-weight: 700;
  letter-spacing: 0.2px;
}

.sub {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

@media (max-width: 960px) {
  .warehouse-layout-bar {
    flex-direction: column;
    align-items: stretch;
  }

  .right {
    justify-content: flex-end;
  }
}
</style>