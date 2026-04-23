<template>
  <div class="borrow-scope-bar">
    <div class="borrow-scope-left">
      <div class="borrow-scope-title">
        {{ scopeTitle }}
      </div>

      <div class="borrow-scope-sub">
        <template v-if="isAdmin">
          {{ mineOnlyModel ? scopeMineOnlyText : scopeAllText }}
        </template>
        <template v-else>
          {{ scopeMineOnlyText }}
        </template>
      </div>
    </div>

    <div class="borrow-scope-right">
      <el-switch
        v-if="isAdmin"
        v-model="mineOnlyModel"
        :active-text="mineOnlyOnText"
        :inactive-text="mineOnlyOffText"
      />
      <el-tag v-else effect="plain" class="pill">
        {{ mineOnlyFixedText }}
      </el-tag>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  isAdmin: { type: Boolean, default: false },
  mineOnly: { type: Boolean, default: true },

  scopeTitle: { type: String, default: '' },
  scopeMineOnlyText: { type: String, default: '' },
  scopeAllText: { type: String, default: '' },

  mineOnlyOnText: { type: String, default: '' },
  mineOnlyOffText: { type: String, default: '' },
  mineOnlyFixedText: { type: String, default: '' },
})

const emit = defineEmits(['update:mineOnly'])

const mineOnlyModel = computed({
  get: () => !!props.mineOnly,
  set: (v) => emit('update:mineOnly', !!v),
})
</script>

<style scoped>
.borrow-scope-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 12px;
  border-radius: 12px;
  background: var(--el-fill-color-light);
  border: 1px solid var(--el-border-color-lighter);
}

.borrow-scope-left {
  min-width: 0;
}

.borrow-scope-title {
  font-weight: 600;
}

.borrow-scope-sub {
  margin-top: 4px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.borrow-scope-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.pill {
  border-radius: 999px;
}

@media (max-width: 960px) {
  .borrow-scope-bar {
    flex-direction: column;
    align-items: flex-start;
  }

  .borrow-scope-right {
    width: 100%;
    justify-content: flex-end;
  }
}
</style>