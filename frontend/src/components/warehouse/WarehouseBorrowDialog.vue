<template>
  <el-dialog
    v-model="open"
    :title="dialogTitle"
    width="520px"
    :close-on-click-modal="false"
    @closed="handleClosed"
  >
    <el-form
      ref="borrowFormRef"
      :model="form"
      :rules="borrowRules"
      label-width="110px"
      @submit.prevent
    >
      <el-form-item :label="tt('warehouse.borrowDialog.fields.itemName', '品項')">
        <div class="item-name">
          <strong>{{ item?.name || '—' }}</strong>

          <div class="sub">
            {{
              tt(
                'warehouse.borrowDialog.itemSub',
                `類別：${renderTypeLabel(item?.type)}，可借：${item?.currentQty ?? 0}`,
                {
                  type: renderTypeLabel(item?.type),
                  qty: item?.currentQty ?? 0,
                }
              )
            }}
          </div>

          <div class="sub danger" v-if="isDisabledScrap(item?.status)">
            {{ tt('warehouse.messages.disabledScrapCannotBorrow', '此品項為停用/報廢，無法借用') }}
          </div>
        </div>
      </el-form-item>

      <el-form-item
        :label="tt('warehouse.borrowDialog.fields.quantity', '數量')"
        prop="quantity"
      >
        <el-input-number
          v-model="form.quantity"
          :min="1"
          :max="maxQty"
          :disabled="isUnavailable || loading"
        />
      </el-form-item>

      <el-form-item
        :label="tt('warehouse.borrowDialog.fields.purpose', '用途')"
        prop="purpose"
      >
        <el-input
          v-model="form.purpose"
          type="textarea"
          :rows="2"
          :disabled="loading"
          :placeholder="tt('warehouse.borrowDialog.placeholders.purpose', '請輸入用途')"
        />
      </el-form-item>

      <el-form-item :label="tt('warehouse.borrowDialog.fields.expectedReturnAt', '預計歸還時間')">
        <el-date-picker
          v-model="form.expectedReturnAt"
          type="datetime"
          :disabled="loading"
          :placeholder="tt('warehouse.borrowDialog.placeholders.expectedReturnAt', '選擇日期時間')"
          format="YYYY-MM-DD HH:mm"
          value-format="YYYY-MM-DDTHH:mm:ss"
        />
      </el-form-item>

      <el-form-item :label="tt('warehouse.borrowDialog.fields.remark', '備註')">
        <el-input
          v-model="form.remark"
          type="textarea"
          :rows="2"
          :disabled="loading"
          :placeholder="tt('warehouse.borrowDialog.placeholders.remark', '可選填')"
        />
      </el-form-item>
    </el-form>

    <template #footer>
      <el-button :disabled="loading" @click="open = false">
        {{ tt('warehouse.borrowDialog.actions.cancel', '取消') }}
      </el-button>

      <el-button
        type="primary"
        :icon="Check"
        :loading="loading"
        :disabled="isUnavailable"
        @click="handleSubmit"
      >
        {{ tt('warehouse.borrowDialog.actions.submit', '送出') }}
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { computed, nextTick, reactive, ref, watch } from 'vue'
import { Check } from '@element-plus/icons-vue'
import { useWarehouseMeta } from '@/composables/useWarehouseMeta'
import { useSafeI18n } from '@/composables/useSafeI18n'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  item: { type: Object, default: null },
  loading: { type: Boolean, default: false },
  title: { type: String, default: '' },
})

const emit = defineEmits([
  'update:modelValue',
  'submit',
  'closed',
])

const { tt } = useSafeI18n()

const {
  renderTypeLabel,
  isDisabledScrap,
} = useWarehouseMeta()

const open = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v),
})

const dialogTitle = computed(() =>
  props.title || tt('warehouse.borrowDialog.title', '借用')
)

const borrowFormRef = ref(null)

const form = reactive({
  quantity: 1,
  purpose: '',
  expectedReturnAt: '',
  remark: '',
})

const maxQty = computed(() => {
  const n = Number(props.item?.currentQty || 0)
  return Math.max(1, n)
})

const isUnavailable = computed(() => {
  if (!props.item) return true
  if (isDisabledScrap(props.item?.status)) return true
  return Number(props.item?.currentQty || 0) <= 0
})

const borrowRules = computed(() => ({
  quantity: [
    {
      required: true,
      message: tt('warehouse.rules.quantityRequired', '請輸入數量'),
      trigger: 'change',
    },
    {
      validator: (_rule, value, cb) => {
        const v = Number(value || 0)
        if (v <= 0) {
          return cb(new Error(tt('warehouse.rules.quantityPositive', '數量必須大於 0')))
        }
        if (props.item && v > Number(props.item.currentQty || 0)) {
          return cb(new Error(tt('warehouse.rules.quantityExceed', '數量超過可借數量')))
        }
        if (isDisabledScrap(props.item?.status)) {
          return cb(new Error(tt('warehouse.messages.disabledScrapCannotBorrow', '此品項為停用/報廢，無法借用')))
        }
        cb()
      },
      trigger: 'change',
    },
  ],
  purpose: [
    {
      required: true,
      message: tt('warehouse.rules.purposeRequired', '請填寫用途'),
      trigger: 'blur',
    },
  ],
}))

function resetForm() {
  form.quantity = 1
  form.purpose = ''
  form.expectedReturnAt = ''
  form.remark = ''
}

async function prepareOpenState() {
  resetForm()
  await nextTick()
  borrowFormRef.value?.clearValidate?.()
}

async function handleSubmit() {
  if (props.loading || isUnavailable.value) return

  await borrowFormRef.value?.validate()

  emit('submit', {
    quantity: Number(form.quantity || 1),
    purpose: form.purpose || '',
    expectedReturnAt: form.expectedReturnAt || null,
    remark: form.remark || '',
  })
}

function handleClosed() {
  resetForm()
  borrowFormRef.value?.clearValidate?.()
  emit('closed')
}

watch(
  () => props.modelValue,
  async (opened) => {
    if (opened) {
      await prepareOpenState()
    }
  }
)

watch(
  () => props.item?.id,
  async () => {
    if (props.modelValue) {
      await prepareOpenState()
    }
  }
)
</script>

<style scoped>
.item-name .sub {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  margin-top: 4px;
}

.item-name .sub.danger {
  color: var(--el-color-danger);
}
</style>