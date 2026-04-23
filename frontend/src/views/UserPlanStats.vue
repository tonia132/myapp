<template>
  <div class="page user-plan-stats-page">
    <!-- Header 區 -->
    <div class="header-bar">
      <div class="left">
        <h2>{{ t('userPlanStats.title') }}</h2>
        <el-tag type="success" effect="dark">
          {{ t('userPlanStats.tag') }}
        </el-tag>
      </div>
      <div class="right">
        <el-button :loading="loading" :icon="Refresh" @click="fetchData">
          {{ t('userPlanStats.refresh') }}
        </el-button>
      </div>
    </div>

    <!-- 統計摘要（總數） -->
    <el-row :gutter="16" class="summary-row">
      <el-col :xs="24" :sm="8">
        <el-card shadow="hover" class="summary-card">
          <div class="summary-label">{{ t('userPlanStats.totalPlans') }}</div>
          <div class="summary-value">{{ totalPlans }}</div>
        </el-card>
      </el-col>
      <el-col :xs="24" :sm="8">
        <el-card shadow="hover" class="summary-card">
          <div class="summary-label">{{ t('userPlanStats.totalDemands') }}</div>
          <div class="summary-value">{{ totalDemands }}</div>
        </el-card>
      </el-col>
      <el-col :xs="24" :sm="8">
        <el-card shadow="hover" class="summary-card">
          <div class="summary-label">{{ t('userPlanStats.totalSupports') }}</div>
          <div class="summary-value">{{ totalSupports }}</div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 內容區 -->
    <el-card class="content-card" shadow="hover">
      <template #header>
        <div class="card-header">
          <span>{{ t('userPlanStats.detailCharts') }}</span>
        </div>
      </template>

      <el-empty
        v-if="!loading && !chartData.length"
        :description="t('userPlanStats.noData')"
      />

      <div v-else class="content-inner">
        <!-- 🔝 第一段：所有使用者的統計圖表（長條圖 + 圓餅圖） -->
        <div class="top-charts">
          <div class="chart-box">
            <h4>{{ t('userPlanStats.allUsersBarTitle') }}</h4>
            <div ref="barChartRef" class="chart"></div>
          </div>

          <div class="chart-box chart-box-with-summary">
            <!-- DQA 總容量佔比 -->
            <div
              v-if="chartData.length"
              class="capacity-summary"
              :class="{ 'capacity-overload': isOverCapacity }"
            >
              <span class="capacity-main">
                DQA{{ t('userPlanStats.totalCapacityLabel') }}:
                {{ totalCapacityPercent }}%
              </span>
              <span class="capacity-sub">
                （{{ t('userPlanStats.capacityRatioLabel') }}
                {{ totalUsedWork }}/{{ totalCapacity }}）
              </span>
            </div>

            <h4>{{ t('userPlanStats.allUsersCapacityPieTitle') }}</h4>
            <div ref="topPieChartRef" class="chart"></div>
          </div>
        </div>

        <el-divider />

        <!-- 👤 第二段：每個使用者單獨一個「整行」卡片（含右側大圓餅圖） -->
        <h4 class="section-title">{{ t('userPlanStats.userSectionTitle') }}</h4>

        <el-row :gutter="16" class="user-cards">
          <el-col
            v-for="user in chartData"
            :key="user.userId"
            :xs="24"
            :sm="24"
            :md="24"
            :lg="24"
          >
            <el-card
              shadow="hover"
              class="user-card"
              :class="{ 'user-overload': userTotal(user) > userCapacity(user) }"
            >
              <div class="user-card-header">
                <div class="user-name">
                  {{ getDisplayName(user) }}
                </div>
                <div class="user-total">
                  {{ t('userPlanStats.userTotalLabel') }} {{ userTotal(user) }}
                  （{{ t('userPlanStats.userCapacityHint') }}
                  {{ userCapacity(user) }}）
                </div>
              </div>

              <div class="user-card-body">
                <!-- 左邊：數值 + 進度條（顯示目前 workload 組成） -->
                <div class="user-metrics">
                  <div class="metric-row">
                    <div class="metric-label">
                      <span class="dot dot-plan"></span>
                      {{ t('userPlanStats.metricPlan') }}
                    </div>
                    <div class="metric-value">
                      {{ user.planCount || 0 }}（{{ share(user, user.planCount) }}%）
                    </div>
                  </div>
                  <el-progress
                    :percentage="share(user, user.planCount)"
                    :stroke-width="12"
                    class="metric-progress"
                    status="success"
                    :show-text="false"
                  />

                  <div class="metric-row">
                    <div class="metric-label">
                      <span class="dot dot-demand"></span>
                      {{ t('userPlanStats.metricDemand') }}
                    </div>
                    <div class="metric-value">
                      {{ user.demandCount || 0 }}（{{ share(user, user.demandCount) }}%）
                    </div>
                  </div>
                  <el-progress
                    :percentage="share(user, user.demandCount)"
                    :stroke-width="12"
                    class="metric-progress"
                    status="warning"
                    :show-text="false"
                  />

                  <div class="metric-row">
                    <div class="metric-label">
                      <span class="dot dot-support"></span>
                      {{ t('userPlanStats.metricSupport') }}
                    </div>
                    <div class="metric-value">
                      {{ user.supportCount || 0 }}（{{ share(user, user.supportCount) }}%）
                    </div>
                  </div>
                  <el-progress
                    :percentage="share(user, user.supportCount)"
                    :stroke-width="12"
                    class="metric-progress"
                    status="exception"
                    :show-text="false"
                  />
                </div>

                <!-- 右邊：大一點的圓餅圖（單一使用者內部佔比） -->
                <div class="user-pie-box">
                  <div class="user-pie" :style="userPieStyle(user)">
                    <div class="user-pie-center">
                      <div class="user-pie-total">{{ userTotal(user) }}</div>
                      <div class="user-pie-label">
                        {{ t('userPlanStats.userPieTotalLabel') }}
                      </div>
                    </div>
                  </div>
                  <div class="user-pie-legend">
                    <div class="legend-row">
                      <span class="dot dot-plan"></span>
                      <span>{{ t('userPlanStats.metricPlan') }}</span>
                    </div>
                    <div class="legend-row">
                      <span class="dot dot-demand"></span>
                      <span>{{ t('userPlanStats.metricDemand') }}</span>
                    </div>
                    <div class="legend-row">
                      <span class="dot dot-support"></span>
                      <span>{{ t('userPlanStats.metricSupport') }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </el-card>
          </el-col>
        </el-row>
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, computed, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { Refresh } from '@element-plus/icons-vue'
import * as echarts from 'echarts'
import { useI18n } from 'vue-i18n'

const { t, locale } = useI18n()

const apiBase = import.meta.env.VITE_API_BASE || '/api'
const token =
  localStorage.getItem('token') || sessionStorage.getItem('token') || ''

// 每個使用者「預設」可容納的最大工作量（users.workCapacity 無值時用這個）
const DEFAULT_CAPACITY_PER_USER = 3

const loading = ref(false)
const chartData = ref([])

const barChartRef = ref(null)
const topPieChartRef = ref(null)
let barChartInstance = null
let topPieChartInstance = null

/* ---------- 小工具：依使用者物件取出容量 ---------- */
const userCapacity = (user) => {
  const v = Number(user?.workCapacity)
  if (!Number.isFinite(v) || v <= 0) return DEFAULT_CAPACITY_PER_USER
  return v
}

/* ---------- 總數合計（實際的工作量 & 容量） ---------- */
const totalPlans = computed(() =>
  chartData.value.reduce((sum, item) => sum + (item.planCount ?? 0), 0)
)
const totalDemands = computed(() =>
  chartData.value.reduce((sum, item) => sum + (item.demandCount ?? 0), 0)
)
const totalSupports = computed(() =>
  chartData.value.reduce((sum, item) => sum + (item.supportCount ?? 0), 0)
)

const totalUsedWork = computed(
  () => totalPlans.value + totalDemands.value + totalSupports.value
)

// ⭐ 所有使用者總容量：sum(每個人的 workCapacity 或預設 3)
const totalCapacity = computed(() =>
  chartData.value.reduce((sum, u) => sum + userCapacity(u), 0)
)

// ✅ DQA 測試容量：目前總工作量 / 總容量
const totalCapacityPercent = computed(() => {
  if (!totalCapacity.value) return 0
  const p = Math.round((totalUsedWork.value * 100) / totalCapacity.value)
  return p < 0 ? 0 : p
})

// 是否超出容量：工作量 > 總容量（用來決定變紅）
const isOverCapacity = computed(
  () => totalUsedWork.value > totalCapacity.value
)

// 若之後還要用得到，先保留「剩餘容量」
const totalRemainingCapacity = computed(() => {
  const remain = totalCapacity.value - totalUsedWork.value
  return remain > 0 ? remain : 0
})

/* ---------- X 軸標籤與各系列數值（長條圖） ---------- */
const getDisplayName = (user) =>
  user.name || user.username || `User#${user.userId}`

const labels = computed(() =>
  chartData.value.map((item) => getDisplayName(item))
)

const planValues = computed(() =>
  chartData.value.map((item) => item.planCount ?? 0)
)
const demandValues = computed(() =>
  chartData.value.map((item) => item.demandCount ?? 0)
)
const supportValues = computed(() =>
  chartData.value.map((item) => item.supportCount ?? 0)
)

/* ---------- Helper：個人總工作 / 佔比 ---------- */
const userTotal = (user) =>
  (user.planCount || 0) +
  (user.demandCount || 0) +
  (user.supportCount || 0)

const share = (user, count) => {
  const total = userTotal(user)
  if (!total || !count) return 0
  const val = Math.round((count * 100) / total)
  return Math.min(100, Math.max(0, val))
}

// 使用者已使用的容量佔比（可能 > 100%）
const capacityUsedPercent = (user) => {
  if (!user) return 0
  const cap = userCapacity(user)
  if (!cap) return 0
  const used = userTotal(user)
  const p = Math.round((used * 100) / cap)
  return p < 0 ? 0 : p
}

const capacityRemaining = (user) => {
  const used = userTotal(user)
  const cap = userCapacity(user)
  const remain = cap - used
  return remain > 0 ? remain : 0
}

/* 圓餅圖樣式（單一使用者內部佔比：計畫/需求/支援） */
const userPieStyle = (user) => {
  const total = userTotal(user)
  if (!total) {
    return {
      backgroundImage: 'conic-gradient(var(--el-border-color-light) 0 100%)'
    }
  }

  const pPlan = share(user, user.planCount)
  const pDemand = share(user, user.demandCount)
  let pSupport = 100 - pPlan - pDemand
  if (pSupport < 0) pSupport = 0

  const startDemand = pPlan
  const startSupport = pPlan + pDemand

  return {
    backgroundImage: `
      conic-gradient(
        var(--el-color-success) 0 ${pPlan}%,
        var(--el-color-warning) ${startDemand}% ${startSupport}%,
        var(--el-color-danger) ${startSupport}% 100%
      )
    `
  }
}

/* ---------- 取得資料 ---------- */
const fetchData = async () => {
  loading.value = true
  try {
    const res = await fetch(`${apiBase}/stats/user-plan-count`, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: token ? `Bearer ${token}` : ''
      }
    })

    if (!res.ok) throw new Error(`HTTP ${res.status}`)

    const data = await res.json()

    let list = []
    if (Array.isArray(data)) {
      list = data
    } else if (Array.isArray(data.data)) {
      list = data.data
    } else if (Array.isArray(data.result)) {
      list = data.result
    }

    chartData.value = list
  } catch (err) {
    console.error('❌ 取得統計資料失敗:', err)
    chartData.value = []
    ElMessage.error(t('userPlanStats.fetchError'))
  } finally {
    loading.value = false
  }
}

/* ---------- 長條圖（所有使用者：實際 workload） ---------- */
const renderBarChart = () => {
  if (!barChartRef.value || !chartData.value.length) return

  if (!barChartInstance) {
    barChartInstance = echarts.init(barChartRef.value)
  }

  const option = {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' }
    },
    legend: {
      top: 4
    },
    grid: { left: 40, right: 20, top: 40, bottom: 80 },
    xAxis: {
      type: 'category',
      data: labels.value,
      axisLabel: {
        rotate: 25,
        overflow: 'truncate',
        ellipsis: '...'
      }
    },
    yAxis: {
      type: 'value',
      name: t('userPlanStats.axisCount'),
      minInterval: 1
    },
    series: [
      {
        name: t('userPlanStats.seriesPlan'),
        type: 'bar',
        data: planValues.value,
        label: { show: true, position: 'top' }
      },
      {
        name: t('userPlanStats.seriesDemand'),
        type: 'bar',
        data: demandValues.value,
        label: { show: true, position: 'top' }
      },
      {
        name: t('userPlanStats.seriesSupport'),
        type: 'bar',
        data: supportValues.value,
        label: { show: true, position: 'top' }
      }
    ]
  }

  barChartInstance.setOption(option)
}

/* ---------- 上方圓餅圖：所有使用者「工作佔比」，legend 顯示個人使用率 ---------- */
const renderTopPieChart = () => {
  if (!topPieChartRef.value || !chartData.value.length) {
    topPieChartInstance?.clear?.()
    return
  }

  if (!topPieChartInstance) {
    topPieChartInstance = echarts.init(topPieChartRef.value)
  }

  const pieData = chartData.value.map((u) => ({
    name: getDisplayName(u),
    value: userTotal(u)
  }))

  const option = {
    tooltip: {
      trigger: 'item',
      formatter: (params) => {
        const user = chartData.value.find(
          (u) => getDisplayName(u) === params.name
        )
        const used = user ? userTotal(user) : 0
        const percent = capacityUsedPercent(user)
        const overload = percent > 100
        const cap = userCapacity(user)

        const workloadLabel = t('userPlanStats.tooltipWorkloadLabel')
        const overloadLabel = t('userPlanStats.tooltipOverloadLabel')

        return [
          params.name,
          `${workloadLabel}：${used} / ${cap}（${percent}%）${
            overload ? `（${overloadLabel}）` : ''
          }`
        ].join('<br/>')
      }
    },
    legend: {
      orient: 'vertical',
      left: 'left',
      formatter: (name) => {
        const user = chartData.value.find(
          (u) => getDisplayName(u) === name
        )
        const percent = capacityUsedPercent(user)
        const styleKey = percent > 100 ? 'over' : 'normal'
        return `{${styleKey}|${name}  (${percent}%)}`
      },
      textStyle: {
        rich: {
          normal: {
            color: '#606266'
          },
          over: {
            color: '#F56C6C',
            fontWeight: 'bold'
          }
        }
      }
    },
    series: [
      {
        name: t('userPlanStats.capacityPieSeriesName'),
        type: 'pie',
        radius: '70%',
        center: ['55%', '50%'],
        data: pieData,
        label: { show: false },
        labelLine: { show: false },
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowOffsetX: 0
          }
        }
      }
    ]
  }

  topPieChartInstance.setOption(option)
}

/* ---------- 監看資料，重繪上方兩張圖 ---------- */
watch(
  () => chartData.value,
  (newVal) => {
    if (!newVal || !newVal.length) {
      barChartInstance?.clear?.()
      topPieChartInstance?.clear?.()
      return
    }
    renderBarChart()
    renderTopPieChart()
  },
  { deep: true, immediate: true }
)

/* ---------- 語系變更時也重繪圖表 ---------- */
watch(
  () => locale.value,
  () => {
    if (!chartData.value.length) return
    renderBarChart()
    renderTopPieChart()
  }
)

/* ---------- resize 自適應 ---------- */
const handleResize = () => {
  barChartInstance?.resize()
  topPieChartInstance?.resize()
}

onMounted(async () => {
  await fetchData()
  window.addEventListener('resize', handleResize)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize)
  barChartInstance?.dispose()
  topPieChartInstance?.dispose()
  barChartInstance = null
  topPieChartInstance = null
})
</script>

<style scoped>
.user-plan-stats-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.header-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.header-bar .left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.summary-row {
  margin-bottom: 4px;
}

.summary-card {
  text-align: center;
}

.summary-label {
  font-size: 13px;
  color: var(--el-text-color-secondary);
}

.summary-value {
  margin-top: 4px;
  font-size: 22px;
  font-weight: 700;
}

.content-card {
  width: 100%;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.content-inner {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* 🔝 上方長條圖 + 圓餅圖 */
.top-charts {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 16px;
}

.chart-box {
  width: 100%;
}

.chart-box-with-summary {
  position: relative;
}

/* DQA 測試容量：放大 & 超出容量變紅 */
.capacity-summary {
  text-align: right;
  margin-bottom: 4px;
  font-size: 24px; /* 放大字體 */
  font-weight: 700;
  color: var(--el-text-color-primary);
}

.capacity-summary .capacity-sub {
  font-size: 14px;
  margin-left: 4px;
  color: var(--el-text-color-secondary);
}

.capacity-summary.capacity-overload {
  color: var(--el-color-danger);
}

.chart {
  width: 100%;
  height: 360px;
}

.section-title {
  margin: 0 0 4px;
}

/* 使用者卡片區：每張卡片佔整列 */
.user-cards {
  margin-top: 4px;
}

.user-card {
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

/* 超出個人容量時，整張卡片淡紅色提示 */
.user-card.user-overload {
  border-color: var(--el-color-danger);
  box-shadow: 0 0 0 1px rgba(245, 108, 108, 0.4);
}

.user-card-header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 4px;
}

.user-name {
  font-weight: 600;
  font-size: 15px;
}

.user-total {
  font-size: 13px;
  color: var(--el-text-color-secondary);
}

/* 卡片主體：左文字 + 右圓餅（整行寬度） */
.user-card-body {
  display: flex;
  align-items: stretch;
  gap: 24px;
}

/* 左邊：數值 + 進度條 */
.user-metrics {
  display: flex;
  flex-direction: column;
  gap: 6px;
  flex: 1;
}

.metric-row {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
  align-items: center;
}

.metric-label {
  display: flex;
  align-items: center;
  gap: 6px;
}

.metric-value {
  color: var(--el-text-color-secondary);
}

.metric-progress {
  margin-bottom: 6px;
}

/* 小色點標示不同類型 */
.dot {
  width: 10px;
  height: 10px;
  border-radius: 999px;
  display: inline-block;
}

.dot-plan {
  background-color: var(--el-color-success);
}
.dot-demand {
  background-color: var(--el-color-warning);
}
.dot-support {
  background-color: var(--el-color-danger);
}

/* 右邊：圓餅圖盒（放大版） */
.user-pie-box {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-width: 220px;
}

.user-pie {
  width: 180px;
  height: 180px;
  border-radius: 50%;
  position: relative;
  background-size: cover;
}

.user-pie-center {
  position: absolute;
  inset: 36px;
  border-radius: 50%;
  background-color: var(--el-bg-color);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  font-size: 12px;
}

.user-pie-total {
  font-weight: 600;
  font-size: 18px;
}

.user-pie-label {
  font-size: 11px;
  color: var(--el-text-color-secondary);
}

.user-pie-legend {
  font-size: 12px;
  display: flex;
  flex-direction: row;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
  justify-content: center;
}

.legend-row {
  display: flex;
  align-items: center;
  gap: 4px;
}

/* RWD：窄螢幕時改成上下排列 */
@media (max-width: 768px) {
  .user-card-body {
    flex-direction: column;
    align-items: stretch;
  }

  .user-pie-box {
    min-width: 0;
  }

  .user-pie {
    width: 160px;
    height: 160px;
  }

  .user-pie-center {
    inset: 32px;
  }
}
</style>
