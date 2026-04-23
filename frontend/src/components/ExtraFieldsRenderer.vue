<!-- frontend/src/components/ExtraFieldsRenderer.vue -->
<template>
  <div class="ef-wrap">
    <div v-for="f in schema" :key="f.key" class="ef-item">
      <div class="ef-label">
        <div class="ef-label-main">
          <b>{{ f.label }}</b>
          <span v-if="f.unit" class="ef-unit">{{ f.unit }}</span>
        </div>
        <div v-if="f.hint" class="ef-hint">{{ f.hint }}</div>
      </div>

      <div class="ef-control">
        <!-- text -->
        <el-input
          v-if="f.type === 'text'"
          :model-value="valText(f.key)"
          :disabled="disabled"
          clearable
          @update:model-value="(v) => setVal(f.key, v)"
          @change="emitChange"
        />

        <!-- textarea -->
        <el-input
          v-else-if="f.type === 'textarea'"
          type="textarea"
          :rows="f.rows || 3"
          :model-value="valText(f.key)"
          :disabled="disabled"
          @update:model-value="(v) => setVal(f.key, v)"
          @change="emitChange"
        />

        <!-- number -->
        <el-input-number
          v-else-if="f.type === 'number'"
          :model-value="valNumber(f.key)"
          :disabled="disabled"
          :min="numOrUndef(f.min)"
          :max="numOrUndef(f.max)"
          :step="numOrUndef(f.step) ?? 1"
          :precision="numberPrecision(f)"
          @update:model-value="(v) => setVal(f.key, v)"
          @change="emitChange"
        />

        <!-- select -->
        <el-select
          v-else-if="f.type === 'select'"
          :model-value="valText(f.key)"
          :disabled="disabled"
          clearable
          filterable
          style="width: 100%"
          @update:model-value="(v) => setVal(f.key, v)"
          @change="emitChange"
        >
          <el-option
            v-for="opt in (f.options || [])"
            :key="String(opt)"
            :label="String(opt)"
            :value="String(opt)"
          />
        </el-select>

        <!-- boolean -->
        <el-switch
          v-else-if="f.type === 'boolean'"
          :model-value="valBool(f.key)"
          :disabled="disabled"
          @update:model-value="(v) => setVal(f.key, !!v)"
          @change="emitChange"
        />

        <!-- images -->
        <div v-else-if="f.type === 'images'" class="ef-images">
          <div class="ef-images-bar">
            <el-button
              type="primary"
              size="small"
              :disabled="disabled || !canAddImage(f)"
              @click="() => emit('pick-image', f.key)"
            >
              Add Image
            </el-button>

            <div class="ef-images-meta">
              {{ imagesMap[f.key]?.length || 0 }} / {{ f.max || '∞' }}
            </div>
          </div>

          <div v-if="(imagesMap[f.key]?.length || 0) > 0" class="ef-img-grid">
            <div
              v-for="(img, idx) in imagesMap[f.key]"
              :key="imgKey(img, idx)"
              class="ef-img-card"
            >
              <el-image
                :src="img.url"
                fit="contain"
                class="ef-img"
                :preview-src-list="[img.url]"
                preview-teleported
              />
              <div class="ef-img-name" :title="img.name || ''">
                {{ img.name || `image_${idx + 1}` }}
              </div>
              <el-button
                type="danger"
                text
                size="small"
                :disabled="disabled"
                @click="() => removeImage(f.key, idx)"
              >
                Remove
              </el-button>
            </div>
          </div>

          <div v-else class="ef-empty">No images</div>
        </div>

        <!-- table -->
        <div v-else-if="f.type === 'table'" class="ef-table">
          <div class="ef-table-bar">
            <el-button
              type="primary"
              size="small"
              :disabled="disabled"
              @click="() => addTableRow(f)"
            >
              Add Row
            </el-button>
            <div class="ef-table-meta">
              Rows: {{ tableMap[f.key]?.length || 0 }}
            </div>
          </div>

          <el-table
            :data="tableMap[f.key] || []"
            border
            stripe
            class="ef-table-main"
          >
            <el-table-column
              v-for="col in (f.columns || [])"
              :key="col.key"
              :label="col.label"
              min-width="160"
            >
              <template #default="{ row, $index }">
                <el-input
                  v-if="col.type === 'text'"
                  :model-value="String(row?.[col.key] ?? '')"
                  :disabled="disabled"
                  size="small"
                  @update:model-value="(v) => setTableCell(f.key, $index, col.key, v)"
                  @change="emitChange"
                />

                <el-input-number
                  v-else-if="col.type === 'number'"
                  :model-value="num(row?.[col.key])"
                  :disabled="disabled"
                  size="small"
                  :min="numOrUndef(col.min)"
                  :max="numOrUndef(col.max)"
                  :step="numOrUndef(col.step) ?? 1"
                  :precision="colPrecision(col)"
                  @update:model-value="(v) => setTableCell(f.key, $index, col.key, v)"
                  @change="emitChange"
                />

                <el-select
                  v-else-if="col.type === 'select'"
                  :model-value="String(row?.[col.key] ?? '')"
                  :disabled="disabled"
                  size="small"
                  clearable
                  filterable
                  style="width: 100%"
                  @update:model-value="(v) => setTableCell(f.key, $index, col.key, v)"
                  @change="emitChange"
                >
                  <el-option
                    v-for="opt in (col.options || [])"
                    :key="String(opt)"
                    :label="String(opt)"
                    :value="String(opt)"
                  />
                </el-select>

                <el-input
                  v-else
                  :model-value="String(row?.[col.key] ?? '')"
                  :disabled="disabled"
                  size="small"
                  @update:model-value="(v) => setTableCell(f.key, $index, col.key, v)"
                  @change="emitChange"
                />
              </template>
            </el-table-column>

            <el-table-column label="Actions" width="110" align="center">
              <template #default="{ $index }">
                <el-button
                  type="danger"
                  text
                  size="small"
                  :disabled="disabled"
                  @click="() => removeTableRow(f.key, $index)"
                >
                  Remove
                </el-button>
              </template>
            </el-table-column>
          </el-table>

          <div v-if="!(tableMap[f.key]?.length)" class="ef-empty">No rows</div>
        </div>

        <div v-else class="ef-unknown">
          Unknown field type: {{ f.type }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  schema: { type: Array, default: () => [] },
  modelValue: { type: Object, default: () => ({}) },
  disabled: { type: Boolean, default: false }
})

const emit = defineEmits(['update:modelValue', 'change', 'pick-image'])

/* ---------------- utilities ---------------- */
function isPlainObject(v) {
  return v && typeof v === 'object' && !Array.isArray(v)
}

const model = computed(() => (isPlainObject(props.modelValue) ? props.modelValue : {}))

function emitChange() {
  emit('change')
}

function valRaw(key) {
  return model.value[key]
}

function valText(key) {
  const v = valRaw(key)
  return v === undefined || v === null ? '' : String(v)
}

function num(v) {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

function numOrUndef(v) {
  const n = Number(v)
  return Number.isFinite(n) ? n : undefined
}

function valNumber(key) {
  return num(valRaw(key))
}

function valBool(key) {
  const v = valRaw(key)
  if (v === true || v === false) return v
  const s = String(v ?? '').trim().toLowerCase()
  if (['1', 'true', 'yes', 'y', 'on'].includes(s)) return true
  if (['0', 'false', 'no', 'n', 'off', ''].includes(s)) return false
  return !!v
}

function patchModel(patch) {
  emit('update:modelValue', { ...model.value, ...patch })
}

function setVal(key, v) {
  patchModel({ [key]: v })
}

/* ---------------- number precision ---------------- */
function precisionFromStep(step) {
  const s = String(step ?? '')
  if (!s.includes('.')) return 0
  const dec = s.split('.')[1] || ''
  return Math.max(0, dec.length)
}

function numberPrecision(f) {
  if (typeof f.precision === 'number') return f.precision
  if (typeof f.step === 'number') return precisionFromStep(f.step)
  return 0
}

function colPrecision(col) {
  if (typeof col.precision === 'number') return col.precision
  if (typeof col.step === 'number') return precisionFromStep(col.step)
  return 0
}

/* ---------------- table ---------------- */
function tableRows(key) {
  const v = valRaw(key)
  return Array.isArray(v) ? v : []
}

const tableMap = computed(() => {
  const out = {}
  for (const f of props.schema || []) {
    if (f?.type === 'table') out[f.key] = tableRows(f.key)
  }
  return out
})

function setTable(key, rows) {
  patchModel({ [key]: rows })
}

function addTableRow(f) {
  const cols = Array.isArray(f.columns) ? f.columns : []
  const row = {}
  for (const c of cols) row[c.key] = c.type === 'number' ? 0 : ''
  setTable(f.key, [...tableRows(f.key), row])
  emitChange()
}

function removeTableRow(key, idx) {
  const rows = [...tableRows(key)]
  rows.splice(idx, 1)
  setTable(key, rows)
  emitChange()
}

function setTableCell(key, rowIndex, colKey, v) {
  const rows = [...tableRows(key)]
  const row = { ...(rows[rowIndex] || {}) }
  row[colKey] = v
  rows[rowIndex] = row
  setTable(key, rows)
  emitChange() // ✅ 這裡補上，避免只 update 但沒觸發 change
}

/* ---------------- images ---------------- */
function normalizeImages(v) {
  const arr = Array.isArray(v) ? v : []
  return arr
    .map((it) => {
      if (!it) return null
      if (typeof it === 'string') {
        const url = String(it).trim()
        if (!url) return null
        return { url, name: '', fileId: null }
      }
      if (typeof it === 'object') {
        const url = String(it.url || it.previewUrl || it.downloadUrl || '').trim()
        if (!url) return null
        return {
          url,
          name: String(it.name || it.originalName || it.fileName || ''),
          fileId: it.fileId ?? it.id ?? null
        }
      }
      return null
    })
    .filter(Boolean)
}

const imagesMap = computed(() => {
  const out = {}
  for (const f of props.schema || []) {
    if (f?.type === 'images') out[f.key] = normalizeImages(valRaw(f.key))
  }
  return out
})

function imgKey(img, idx) {
  return String(img.fileId || img.url || idx)
}

/** 這裡採用「標準化後的物件陣列」回寫，讓資料結構穩定 */
function setImages(key, imgs) {
  patchModel({ [key]: imgs })
}

function removeImage(key, idx) {
  const imgs = [...(imagesMap.value[key] || [])]
  imgs.splice(idx, 1)
  setImages(key, imgs)
  emitChange()
}

function canAddImage(f) {
  const max = Number(f?.max)
  if (!Number.isFinite(max) || max <= 0) return true
  const len = (imagesMap.value[f.key] || []).length
  return len < max
}
</script>

<style scoped>
.ef-wrap{display:flex;flex-direction:column;gap:12px;}
.ef-item{display:grid;grid-template-columns:220px 1fr;gap:12px;padding:10px 12px;border:1px solid var(--el-border-color-lighter);border-radius:12px;background:var(--el-fill-color-lighter);}
.ef-label-main{display:flex;align-items:center;gap:8px;}
.ef-unit{color:var(--el-text-color-secondary);font-size:12px;}
.ef-hint{color:var(--el-text-color-secondary);font-size:12px;margin-top:4px;}
.ef-control{min-width:0;}
.ef-empty{color:var(--el-text-color-secondary);font-size:12px;padding:6px 0;}
.ef-images-bar,.ef-table-bar{display:flex;align-items:center;gap:10px;margin-bottom:8px;}
.ef-images-meta,.ef-table-meta{margin-left:auto;color:var(--el-text-color-secondary);font-size:12px;}
.ef-img-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;}
.ef-img-card{border:1px solid var(--el-border-color);border-radius:10px;overflow:hidden;background:var(--el-fill-color-blank);padding:8px;display:flex;flex-direction:column;gap:6px;}
.ef-img{width:100%;height:110px;border-radius:8px;border:1px solid var(--el-border-color-lighter);background:var(--el-fill-color-lighter);}
.ef-img-name{font-size:12px;color:var(--el-text-color-secondary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.ef-table-main{width:100%;}
.ef-unknown{color:var(--el-color-danger);font-size:12px;}
@media (max-width:1100px){
  .ef-item{grid-template-columns:1fr;}
  .ef-img-grid{grid-template-columns:repeat(2,minmax(0,1fr));}
}
</style>
