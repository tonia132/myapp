<template>
  <el-card shadow="never" class="filter-card">
    <div class="filter-row">
      <el-input
        v-model="keywordModel"
        :placeholder="tt('warehouse.filters.keywordPlaceholder', '搜尋：品名 / 料號 / 位置')"
        class="ctrl ctrl-search"
        clearable
        @keyup.enter="emitSearch"
        @clear="emitSearch"
      >
        <template #prefix><el-icon><Search /></el-icon></template>
      </el-input>

      <el-select
        v-model="typeModel"
        :placeholder="tt('warehouse.filters.typePlaceholder', '類別')"
        clearable
        class="ctrl ctrl-select"
        @change="emitChange"
        @clear="emitChange"
      >
        <el-option
          v-for="opt in typeOptions"
          :key="`type-${opt.value || 'all'}`"
          :label="opt.label"
          :value="opt.value"
        />
      </el-select>

      <el-select
        v-model="statusModel"
        :placeholder="tt('warehouse.filters.statusPlaceholder', '狀態')"
        clearable
        class="ctrl ctrl-select"
        @change="emitChange"
        @clear="emitChange"
      >
        <el-option
          v-for="opt in stockStatusOptions"
          :key="`status-${opt.value || 'all'}`"
          :label="opt.label"
          :value="opt.value"
        />
      </el-select>

      <div class="filter-spacer" />

      <el-button class="only-desktop" plain :icon="Search" @click="emitSearch">
        {{ tt('common.search', '搜尋') }}
      </el-button>

      <el-button plain @click="handleReset">
        {{ tt('common.reset', '重設') }}
      </el-button>
    </div>
  </el-card>
</template>

<script setup>
import { computed } from 'vue'
import { Search } from '@element-plus/icons-vue'
import { useWarehouseMeta } from '@/composables/useWarehouseMeta'
import { useSafeI18n } from '@/composables/useSafeI18n'

const props = defineProps({
  keyword: { type: String, default: '' },
  type: { type: String, default: '' },
  status: { type: String, default: '' },
})

const emit = defineEmits([
  'update:keyword',
  'update:type',
  'update:status',
  'search',
  'change',
  'reset',
])

const { tt } = useSafeI18n()

const {
  typeOptions,
  stockStatusOptions,
} = useWarehouseMeta()

const keywordModel = computed({
  get: () => props.keyword,
  set: (v) => emit('update:keyword', v ?? ''),
})

const typeModel = computed({
  get: () => props.type,
  set: (v) => emit('update:type', v ?? ''),
})

const statusModel = computed({
  get: () => props.status,
  set: (v) => emit('update:status', v ?? ''),
})

function emitSearch() {
  emit('search')
}

function emitChange() {
  emit('change')
}

function handleReset() {
  emit('update:keyword', '')
  emit('update:type', '')
  emit('update:status', '')
  emit('reset')
}
</script>

<style scoped>
.filter-card {
  border-radius: 12px;
}

.filter-row {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.ctrl {
  min-width: 160px;
}

.ctrl-search {
  width: 320px;
  max-width: 100%;
}

.ctrl-select {
  width: 170px;
}

.filter-spacer {
  flex: 1;
  min-width: 10px;
}

.only-desktop {
  display: inline-flex;
}

@media (max-width: 960px) {
  .ctrl-search {
    width: 100%;
  }

  .ctrl-select {
    width: 48%;
    min-width: 160px;
  }
}

@media (max-width: 560px) {
  .only-desktop {
    display: none;
  }

  .ctrl-select {
    width: 100%;
  }
}
</style>