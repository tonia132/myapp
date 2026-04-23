<template>
  <el-dialog
    v-model="open"
    :title="dialogTitle"
    width="680px"
    :close-on-click-modal="false"
    @closed="handleClosed"
  >
    <el-form
      ref="itemFormRef"
      :model="form"
      :rules="itemRules"
      label-width="110px"
      @submit.prevent
    >
      <el-form-item :label="tt('warehouse.itemDialog.fields.type', '類別')" prop="type">
        <el-select v-model="form.type" class="w-220" :disabled="loading">
          <el-option
            v-for="opt in typeValueOptions"
            :key="`type-${opt.value}`"
            :label="opt.label"
            :value="opt.value"
          />
        </el-select>
      </el-form-item>

      <el-form-item :label="tt('warehouse.itemDialog.fields.name', '品名')" prop="name">
        <el-input v-model.trim="form.name" maxlength="200" :disabled="loading" />
      </el-form-item>

      <el-form-item :label="tt('warehouse.itemDialog.fields.code', '料號 / 資產編號')" prop="code">
        <el-input v-model.trim="form.code" maxlength="100" :disabled="loading" />
      </el-form-item>

      <el-form-item :label="tt('warehouse.itemDialog.fields.location', '位置')" prop="location">
        <el-input v-model.trim="form.location" maxlength="100" :disabled="loading" />
      </el-form-item>

      <el-form-item :label="tt('warehouse.itemDialog.fields.totalQty', '總數量')" prop="totalQty">
        <el-input-number v-model="form.totalQty" :min="0" :max="999999" :disabled="loading" />
      </el-form-item>

      <el-form-item :label="tt('warehouse.itemDialog.fields.status', '狀態')" prop="status">
        <el-select v-model="form.status" class="w-220" :disabled="loading">
          <el-option
            v-for="opt in stockStatusValueOptions"
            :key="`status-${opt.value}`"
            :label="opt.label"
            :value="opt.value"
          />
        </el-select>
      </el-form-item>

      <el-form-item :label="tt('warehouse.itemDialog.fields.hasPeripheral', '周邊')">
        <el-checkbox v-model="form.hasPeripheral" :disabled="loading" @change="onPeripheralToggle">
          {{ tt('warehouse.itemDialog.fields.hasPeripheralText', '周邊') }}
        </el-checkbox>
      </el-form-item>

      <el-form-item :label="tt('warehouse.itemDialog.fields.os', 'OS')">
        <el-select
          v-model="form.os"
          class="w-220"
          clearable
          :disabled="loading || !form.hasPeripheral"
          :placeholder="tt('warehouse.itemDialog.placeholders.os', '選擇 OS')"
        >
          <el-option label="Win10" value="Win10" />
          <el-option label="Win11" value="Win11" />
        </el-select>
      </el-form-item>

      <el-form-item :label="tt('warehouse.itemDialog.fields.image', '圖片')">
        <div class="multi-image-field">
          <div class="multi-left">
            <div class="multi-grid" v-if="form.imageFiles.length">
              <div class="img-tile" v-for="(f, idx) in form.imageFiles" :key="f.id">
                <el-image
                  :src="filePreviewSrc(f)"
                  fit="cover"
                  class="tile-img"
                  :preview-src-list="previewSrcList(form.imageFiles)"
                  preview-teleported
                />
                <div class="tile-badge" v-if="idx === 0">
                  {{ tt('warehouse.itemDialog.cover', '封面') }}
                </div>

                <div class="tile-actions">
                  <el-button
                    size="small"
                    circle
                    :icon="ArrowUp"
                    :disabled="loading || idx === 0"
                    @click="moveImage(idx, -1)"
                  />
                  <el-button
                    size="small"
                    circle
                    :icon="ArrowDown"
                    :disabled="loading || idx === form.imageFiles.length - 1"
                    @click="moveImage(idx, 1)"
                  />
                  <el-button
                    size="small"
                    circle
                    type="danger"
                    plain
                    :icon="Close"
                    :disabled="loading"
                    @click="removeImage(idx)"
                  />
                </div>
              </div>
            </div>

            <div v-else class="thumb-lg-empty">—</div>

            <div class="multi-hint">
              {{ tt('warehouse.itemDialog.imageHint', '第一張為封面（列表縮圖）。可用 ↑↓ 調整順序。') }}
            </div>
          </div>

          <div class="multi-right">
            <div class="image-meta">
              <div class="sub">
                {{ tt('warehouse.itemDialog.imagePicked', '已選：') }}{{ form.imageFiles.length }}
                {{ tt('warehouse.itemDialog.imageUnit', '張') }}
              </div>
              <div class="sub">
                {{ tt('warehouse.itemDialog.coverFileId', '封面 FileID：') }}{{ form.imageFileIds[0] || '—' }}
              </div>
            </div>

            <div class="btns">
              <el-button size="small" :icon="Picture" :disabled="loading" @click="imgPickerVisible = true">
                {{ tt('warehouse.itemDialog.actions.chooseImage', '選擇圖片') }}
              </el-button>
              <el-button
                size="small"
                plain
                :disabled="loading || !form.imageFiles.length"
                @click="clearImage"
              >
                {{ tt('warehouse.itemDialog.actions.clearImage', '清除') }}
              </el-button>
            </div>
          </div>
        </div>
      </el-form-item>

      <el-form-item :label="tt('warehouse.itemDialog.fields.remark', '備註')">
        <el-input
          v-model.trim="form.remark"
          type="textarea"
          :rows="2"
          maxlength="500"
          :disabled="loading"
        />
      </el-form-item>
    </el-form>

    <template #footer>
      <el-button :disabled="loading" @click="open = false">
        {{ tt('warehouse.itemDialog.actions.cancel', '取消') }}
      </el-button>
      <el-button type="primary" :icon="Check" :loading="loading" @click="handleSubmit">
        {{ mode === 'create' ? tt('warehouse.itemDialog.actions.create', '建立') : tt('warehouse.itemDialog.actions.save', '儲存') }}
      </el-button>
    </template>

    <FileImagePickerDialog
      v-model="imgPickerVisible"
      :title="tt('warehouse.imagePicker.title', '選擇圖片（檔案中心）')"
      @pick="pickImage"
    />
  </el-dialog>
</template>

<script setup>
import { computed, nextTick, reactive, ref, watch } from 'vue'
import { Check, Picture, ArrowUp, ArrowDown, Close } from '@element-plus/icons-vue'
import FileImagePickerDialog from '@/components/FileImagePickerDialog.vue'
import { useWarehouseMeta } from '@/composables/useWarehouseMeta'
import { useFilePreviewMap } from '@/composables/useFilePreviewMap'
import { useWarehouseItemImages } from '@/composables/useWarehouseItemImages'
import { useSafeI18n } from '@/composables/useSafeI18n'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  mode: { type: String, default: 'create' },
  loading: { type: Boolean, default: false },
  item: { type: Object, default: null },
  title: { type: String, default: '' },
})

const emit = defineEmits([
  'update:modelValue',
  'submit',
  'closed',
])

const { tt } = useSafeI18n()

const {
  typeValueOptions,
  stockStatusValueOptions,
} = useWarehouseMeta()

const {
  resolvePreview: filePreviewSrc,
  previewSrcList,
  refreshPreviews,
  makeToken,
} = useFilePreviewMap()

const {
  hydrateWarehouseImagesFromItem,
  appendWarehouseImageToForm,
  removeWarehouseImageFromForm,
  moveWarehouseImageInForm,
  clearWarehouseImagesInForm,
} = useWarehouseItemImages()

const open = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v),
})

const dialogTitle = computed(() => {
  if (props.title) return props.title
  return props.mode === 'create'
    ? tt('warehouse.itemDialog.createTitle', '新增品項')
    : tt('warehouse.itemDialog.editTitle', '編輯品項')
})

const itemFormRef = ref(null)
const imgPickerVisible = ref(false)

const form = reactive({
  type: 'tool',
  name: '',
  code: '',
  location: '',
  totalQty: 0,
  status: 'normal',
  hasPeripheral: false,
  os: null,
  remark: '',
  imageFileIds: [],
  imageFiles: [],
})

const itemRules = computed(() => ({
  type: [
    { required: true, message: tt('warehouse.rules.typeRequired', '請選擇類別'), trigger: 'change' },
  ],
  name: [
    { required: true, message: tt('warehouse.rules.nameRequired', '請填寫品名'), trigger: 'blur' },
  ],
  totalQty: [
    {
      validator: (_r, v, cb) => {
        if (Number(v || 0) < 0) {
          return cb(new Error(tt('warehouse.rules.totalQtyNonNegative', '總數量不可小於 0')))
        }
        cb()
      },
      trigger: 'change',
    },
  ],
  status: [
    { required: true, message: tt('warehouse.rules.statusRequired', '請選擇狀態'), trigger: 'change' },
  ],
}))

function resetForm() {
  form.type = 'tool'
  form.name = ''
  form.code = ''
  form.location = ''
  form.totalQty = 0
  form.status = 'normal'
  form.hasPeripheral = false
  form.os = null
  form.remark = ''
  clearWarehouseImagesInForm(form)
}

function hydrateFormFromItem(item) {
  if (!item) {
    resetForm()
    return
  }

  form.type = item.type || 'tool'
  form.name = item.name || ''
  form.code = item.code || ''
  form.location = item.location || ''
  form.totalQty = Number(item.totalQty || 0)
  form.status = item.status || 'normal'
  form.hasPeripheral = !!item.hasPeripheral
  form.os = form.hasPeripheral ? (item.os || null) : null
  form.remark = item.remark || ''
  hydrateWarehouseImagesFromItem(form, item)
}

async function prepareDialog() {
  if (props.mode === 'edit' && props.item) {
    hydrateFormFromItem(props.item)
  } else {
    resetForm()
  }

  await nextTick()
  itemFormRef.value?.clearValidate?.()
}

function onPeripheralToggle() {
  if (!form.hasPeripheral) form.os = null
}

function pickImage(file) {
  appendWarehouseImageToForm(form, file)
}

function removeImage(idx) {
  removeWarehouseImageFromForm(form, idx)
}

function moveImage(idx, dir) {
  moveWarehouseImageInForm(form, idx, dir)
}

function clearImage() {
  clearWarehouseImagesInForm(form)
}

async function handleSubmit() {
  if (props.loading) return
  await itemFormRef.value?.validate()

  emit('submit', {
    type: form.type,
    name: form.name,
    code: form.code || null,
    location: form.location || '',
    totalQty: Number(form.totalQty || 0),
    status: form.status,
    hasPeripheral: !!form.hasPeripheral,
    os: form.hasPeripheral ? (form.os || null) : null,
    remark: form.remark || '',
    imageFileIds: form.imageFileIds,
    imageFileId: form.imageFileIds[0] || null,
  })
}

function handleClosed() {
  imgPickerVisible.value = false
  resetForm()
  itemFormRef.value?.clearValidate?.()
  emit('closed')
}

const previewWatchToken = computed(() => makeToken(form.imageFiles))

watch(
  previewWatchToken,
  () => {
    refreshPreviews(form.imageFiles)
  },
  { immediate: true }
)

watch(
  () => props.modelValue,
  async (opened) => {
    if (opened) {
      await prepareDialog()
    }
  }
)

watch(
  () => [props.mode, props.item?.id],
  async () => {
    if (props.modelValue) {
      await prepareDialog()
    }
  }
)
</script>

<style scoped>
.w-220 {
  width: 220px;
}

.multi-image-field {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  width: 100%;
}

.multi-left {
  flex: 1;
  min-width: 0;
}

.multi-right {
  width: 190px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.multi-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
}

.img-tile {
  position: relative;
  border-radius: 12px;
  overflow: hidden;
  background: var(--el-fill-color-light);
  box-shadow: var(--el-box-shadow-lighter);
}

.tile-img {
  width: 100%;
  height: 86px;
  display: block;
}

.tile-badge {
  position: absolute;
  left: 6px;
  top: 6px;
  font-size: 11px;
  padding: 1px 6px;
  border-radius: 999px;
  background: var(--el-color-success);
  color: #fff;
}

.tile-actions {
  position: absolute;
  right: 6px;
  bottom: 6px;
  display: flex;
  gap: 6px;
}

.thumb-lg-empty {
  width: 100%;
  height: 96px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--el-fill-color-light);
  color: var(--el-text-color-placeholder);
  box-shadow: var(--el-box-shadow-lighter);
}

.multi-hint {
  margin-top: 8px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.image-meta .sub {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.btns {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

@media (max-width: 560px) {
  .multi-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}
</style>