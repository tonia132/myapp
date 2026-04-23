<template>
  <div class="section-bar">
    <div class="section-left">
      <div class="section-title-wrap">
        <h3 class="section-title">{{ title }}</h3>

        <div class="section-subline">
          <el-tag
            v-if="showTotalTag && totalTagText"
            :type="totalTagType"
            effect="dark"
            class="pill"
          >
            {{ totalTagText }}
          </el-tag>

          <el-tag
            v-if="showFiltered"
            effect="plain"
            class="pill muted"
          >
            {{ filteredText }}
          </el-tag>

          <span v-if="nowText" class="now-text">
            {{ nowText }}
          </span>

          <slot name="subline" />
        </div>
      </div>
    </div>

    <div class="section-right">
      <slot name="actions" />
    </div>
  </div>
</template>

<script setup>
defineProps({
  title: { type: String, default: '' },
  totalTagText: { type: String, default: '' },
  totalTagType: { type: String, default: 'primary' },
  showTotalTag: { type: Boolean, default: true },
  showFiltered: { type: Boolean, default: false },
  filteredText: { type: String, default: '' },
  nowText: { type: String, default: '' },
})
</script>

<style scoped>
.section-bar {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.section-left {
  min-width: 0;
}

.section-right {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
}

.section-title-wrap {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}

.section-title {
  margin: 0;
  font-size: 18px;
  font-weight: 700;
}

.section-subline {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  min-width: 0;
}

.now-text {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.pill {
  border-radius: 999px;
}

.pill.muted {
  color: var(--el-text-color-regular);
}

@media (max-width: 960px) {
  .section-bar {
    flex-direction: column;
    align-items: stretch;
  }

  .section-right {
    justify-content: flex-end;
  }
}
</style>