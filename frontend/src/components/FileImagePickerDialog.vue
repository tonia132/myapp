<template>
  <el-dialog
    v-model="open"
    :title="dialogTitle"
    width="980px"
    top="6vh"
    destroy-on-close
  >
    <div class="picker-bar">
      <el-input
        v-model="q.keyword"
        :placeholder="tt('warehouse.imagePicker.searchPlaceholder', '搜尋圖片檔名關鍵字…')"
        clearable
        class="w-320"
        @keyup.enter="onSearch"
        @clear="onSearch"
      >
        <template #prefix><el-icon><Search /></el-icon></template>
      </el-input>

      <el-button @click="fetchList" :loading="loading">
        <el-icon class="mr-6"><Refresh /></el-icon>{{ tt('common.refresh', '重新整理') }}
      </el-button>

      <div class="spacer" />
      <el-tag type="info" effect="plain">
        {{ tt('files.totalTag', '共 {total} 筆', { total }) }}
      </el-tag>
    </div>

    <el-table
      :data="rows"
      v-loading="loading"
      border
      style="width: 100%"
      height="520"
      :empty-text="tt('common.noData', '目前沒有資料')"
    >
      <el-table-column
        :label="tt('warehouse.imagePicker.columns.preview', '預覽')"
        width="90"
        align="center"
      >
        <template #default="{ row }">
          <el-image
            class="thumb"
            :src="resolvePreview(row)"
            :preview-src-list="resolvePreview(row) ? [resolvePreview(row)] : []"
            fit="cover"
            @error="() => {}"
          >
            <template #error>
              <el-tag type="info" size="small" effect="plain">
                {{ tt('warehouse.imagePicker.loadFailed', '載入圖片失敗') }}
              </el-tag>
            </template>
          </el-image>
        </template>
      </el-table-column>

      <el-table-column
        :label="tt('warehouse.imagePicker.columns.name', '檔名')"
        min-width="320"
      >
        <template #default="{ row }">
          <div class="fn">
            <div class="name">{{ row.displayName || row.originalName || row.storedName }}</div>
            <div class="sub">
              #{{ row.id }} · {{ row.mimeType || '-' }}
            </div>
          </div>
        </template>
      </el-table-column>

      <el-table-column
        prop="category"
        :label="tt('warehouse.imagePicker.columns.category', '分類')"
        width="120"
        align="center"
      />

      <el-table-column
        :label="tt('warehouse.imagePicker.columns.updated', '更新時間')"
        width="170"
        align="center"
      >
        <template #default="{ row }">
          {{ formatDateTimeOrDash(row.updatedAt) }}
        </template>
      </el-table-column>

      <el-table-column
        :label="tt('warehouse.imagePicker.columns.actions', '操作')"
        width="130"
        align="center"
      >
        <template #default="{ row }">
          <el-button type="primary" size="small" @click="pick(row)">
            {{ tt('warehouse.imagePicker.pick', '使用此圖片') }}
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <div class="pager">
      <el-pagination
        background
        layout="prev, pager, next, jumper"
        :current-page="q.page"
        :page-size="q.pageSize"
        :total="total"
        @current-change="handlePageChange"
      />
    </div>

    <template #footer>
      <el-button @click="open = false">
        {{ tt('common.close', '關閉') }}
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { Search, Refresh } from '@element-plus/icons-vue'
import { apiFetch } from '@/api/client'
import { useFilePreviewMap } from '@/composables/useFilePreviewMap'
import { useSafeI18n } from '@/composables/useSafeI18n'
import { useDateTimeText } from '@/composables/useDateTimeText'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  title: { type: String, default: '' },
})

const emit = defineEmits(['update:modelValue', 'pick'])

const { tt } = useSafeI18n()
const { formatDateTimeOrDash } = useDateTimeText()

const {
  resolvePreview,
  refreshPreviews,
} = useFilePreviewMap()

const open = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v),
})

const dialogTitle = computed(() =>
  props.title || tt('warehouse.imagePicker.title', '選擇圖片（檔案中心）')
)

const loading = ref(false)
const rows = ref([])
const total = ref(0)

const q = reactive({
  keyword: '',
  page: 1,
  pageSize: 20,
  type: 'image',
})

function onSearch() {
  q.page = 1
  fetchList()
}

function handlePageChange(p) {
  q.page = Number(p) || 1
  fetchList()
}

async function fetchList() {
  loading.value = true
  try {
    const qs = new URLSearchParams({
      keyword: q.keyword || '',
      type: 'image',
      page: String(q.page),
      pageSize: String(q.pageSize),
    })

    const data = await apiFetch(`/files?${qs.toString()}`)

    if (!data?.success) {
      throw new Error(data?.message || tt('warehouse.imagePicker.loadFailed', '載入圖片失敗'))
    }

    rows.value = Array.isArray(data?.data?.rows) ? data.data.rows : []
    total.value = Number(data?.data?.count || 0)

    await refreshPreviews(rows.value)
  } catch (e) {
    console.error(e)
    ElMessage.error(e?.message || tt('warehouse.imagePicker.loadFailed', '載入圖片失敗'))
  } finally {
    loading.value = false
  }
}

function pick(row) {
  emit('pick', row)
  open.value = false
}

watch(open, (v) => {
  if (v) {
    q.page = 1
    fetchList()
  }
})
</script>

<style scoped>
.picker-bar {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
}

.spacer {
  flex: 1;
}

.w-320 {
  width: 320px;
}

.mr-6 {
  margin-right: 6px;
}

.thumb {
  width: 56px;
  height: 56px;
  border-radius: 8px;
  border: 1px solid var(--el-border-color);
  background: #fff;
}

.fn .name {
  font-weight: 600;
}

.fn .sub {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  margin-top: 2px;
}

.pager {
  display: flex;
  justify-content: center;
  margin-top: 12px;
}
</style>