<template>
  <div class="page test-case-writer-page">
    <div class="header-bar">
      <div class="left">
        <h2 class="title">🧪 {{ tx('testCaseWriter.title', '測試項目庫（Test Case Library）') }}</h2>
        <el-tag type="success" effect="plain" class="pill">
          {{ tx('testCaseWriter.tag', '全域測試項目庫') }}
        </el-tag>
        <el-tag effect="plain" class="pill">
          {{ tx('testCaseWriter.totalTag', '共 {n} 筆', { n: filteredRows.length }) }}
        </el-tag>
        <el-tag effect="plain" class="pill editable-pill">
          {{ tx('testCaseWriter.myLibraryTag', '我的項目庫 {n} 筆', { n: userLibraryRows.length }) }}
        </el-tag>
      </div>

      <div class="right">
        <el-input
          v-model="keyword"
          clearable
          class="ctrl w-320"
          :placeholder="tx('testCaseWriter.searchPlaceholder', '搜尋：測試維度 / 測試對象 / 測試章節 / 代碼 / 測試項目')"
        >
          <template #prefix><el-icon><Search /></el-icon></template>
        </el-input>

        <el-button :icon="Refresh" :loading="loading" @click="loadAllLibraryRows">
          {{ tx('common.refresh', '重新整理') }}
        </el-button>

        <el-button plain @click="batchFillStorageFields" :disabled="loading || !rows.length">
          {{ tx('testCaseWriter.fillStorageFields', '補齊 Storage 表上欄位') }}
        </el-button>

        <el-button type="primary" :icon="Plus" @click="openCreate">
          {{ tx('common.add', '新增') }}
        </el-button>
      </div>
    </div>

    <el-alert
      class="tip-card"
      type="info"
      :closable="false"
      show-icon
      :title="tx('testCaseWriter.tipTitle', '這裡建立的是測試項目庫，不綁產品')"
      :description="tx('testCaseWriter.tipDesc3', '畫面會顯示所有可見測試集的測試項目，且可直接編輯其來源測試集。')"
    />

    <el-card shadow="never" class="main-card">
      <div class="toolbar-row">
        <div class="toolbar-left">
          <el-button
            type="danger"
            plain
            :disabled="!selectedRows.length"
            @click="removeSelected"
          >
            {{ tx('testCaseWriter.batchDelete', '刪除所選') }}
          </el-button>
        </div>

        <div class="toolbar-right muted">
          <span>
            {{ tx('testCaseWriter.selectedInfo', '已選取 {n} 筆', { n: selectedRows.length }) }}
          </span>
        </div>
      </div>

      <el-table
        :data="filteredRows"
        border
        stripe
        row-key="_key"
        v-loading="loading"
        class="main-table"
        @selection-change="onSelectionChange"
      >
        <el-table-column type="selection" width="48" />

        <el-table-column
          prop="testDomain"
          :label="tx('testCaseWriter.columns.testDomain', '測試維度')"
          min-width="110"
          show-overflow-tooltip
        />
        <el-table-column
          prop="testTarget"
          :label="tx('testCaseWriter.columns.testTarget', '測試對象')"
          min-width="110"
          show-overflow-tooltip
        />
        <el-table-column
          prop="testChapter"
          :label="tx('testCaseWriter.columns.testChapter', '測試章節')"
          min-width="180"
          show-overflow-tooltip
        />
        <el-table-column
          prop="code"
          :label="tx('testCaseWriter.columns.code', '代碼')"
          width="120"
          show-overflow-tooltip
        />

        <el-table-column
          :label="tx('testCaseWriter.columns.sourceSet', '來源')"
          min-width="220"
          show-overflow-tooltip
        >
          <template #default="{ row }">
            <div class="source-cell">
              <el-tag
                v-if="isUserLibraryRow(row)"
                size="small"
                type="primary"
                effect="plain"
              >
                {{ tx('testCaseWriter.myLibrary', '我的項目庫') }}
              </el-tag>
              <el-tag
                v-else
                size="small"
                type="info"
                effect="plain"
                :title="row._sourceSetName || ''"
              >
                {{ row._sourceSetName || '—' }}
              </el-tag>
            </div>
          </template>
        </el-table-column>

        <el-table-column
          :label="tx('testCaseWriter.columns.testCase', '測試項目')"
          min-width="300"
          show-overflow-tooltip
        >
          <template #default="{ row }">
            <div class="testcase-cell">
              <div class="tc-name">{{ row.testCase || '—' }}</div>
              <div class="tc-sub muted" v-if="row.testProcedure || row.testCriteria">
                <span v-if="row.testProcedure">Procedure</span>
                <span v-if="row.testProcedure && row.testCriteria"> / </span>
                <span v-if="row.testCriteria">Criteria</span>
              </div>
            </div>
          </template>
        </el-table-column>

        <el-table-column
          :label="tx('testCaseWriter.columns.customFields', '表上欄位')"
          min-width="220"
          show-overflow-tooltip
        >
          <template #default="{ row }">
            <div v-if="row.extra?.customFields?.length" class="field-col">
              <div class="field-count">
                {{ row.extra.customFields.length }} {{ tx('testCaseWriter.fieldsUnit', '欄') }}
              </div>
              <div class="field-preview" :title="customFieldsPreview(row)">
                {{ customFieldsPreview(row) }}
              </div>
            </div>
            <span v-else class="muted">—</span>
          </template>
        </el-table-column>

        <el-table-column
          :label="tx('testCaseWriter.columns.referenceImages', '參考圖片')"
          min-width="180"
          align="center"
        >
          <template #default="{ row }">
            <div v-if="row.extra?.referenceImages?.length" class="img-col-cell">
              <el-image
                class="img-col-thumb"
                :src="row.extra.referenceImages[0].url"
                :preview-src-list="row.extra.referenceImages.map(img => img.url)"
                fit="cover"
                preview-teleported
              />
              <div class="img-col-meta">
                <div class="img-col-count">
                  {{ row.extra.referenceImages.length }} {{ tx('testCaseWriter.imagesUnit', '張') }}
                </div>
                <div class="img-col-note" :title="row.extra?.imageNote || ''">
                  {{ row.extra?.imageNote || tx('testCaseWriter.imageHint', '可作為設定參考圖') }}
                </div>
              </div>
            </div>
            <span v-else class="muted">—</span>
          </template>
        </el-table-column>

        <el-table-column
          :label="tx('testCaseWriter.columns.planned', '預設納入計畫')"
          width="110"
          align="center"
        >
          <template #default="{ row }">
            <el-tag :type="row.isPlanned !== false ? 'success' : 'info'" effect="plain">
              {{ row.isPlanned !== false ? tx('common.yes', '是') : tx('common.no', '否') }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column
          :label="tx('testCaseWriter.columns.estHours', '預估工時')"
          width="95"
          align="center"
        >
          <template #default="{ row }">
            {{ formatHours(row.estHours) }}
          </template>
        </el-table-column>

        <el-table-column
          :label="tx('testCaseWriter.columns.updatedAt', '更新時間')"
          width="165"
          align="center"
        >
          <template #default="{ row }">
            {{ formatDateTime(row.updatedAt || libraryUpdatedAt) }}
          </template>
        </el-table-column>

        <el-table-column
          :label="tx('common.actions', '操作')"
          width="180"
          fixed="right"
          align="center"
        >
          <template #default="{ row }">
            <el-button size="small" type="primary" plain @click="openEdit(row)">
              {{ tx('common.edit', '編輯') }}
            </el-button>
            <el-button size="small" type="danger" plain @click="removeOne(row)">
              {{ tx('common.delete', '刪除') }}
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <el-empty
        v-if="!loading && filteredRows.length === 0"
        :description="tx('common.noData', '目前沒有資料')"
      />
    </el-card>

    <el-dialog
      v-model="dialogVisible"
      :title="dialogMode === 'edit'
        ? tx('testCaseWriter.editTitle', '編輯測試項目')
        : tx('testCaseWriter.createTitle', '新增測試項目')"
      width="1040px"
      :close-on-click-modal="false"
      @closed="onDialogClosed"
    >
      <el-form ref="formRef" :model="form" :rules="rules" label-width="130px">
        <el-row :gutter="12">
          <el-col :xs="24" :md="12">
            <el-form-item :label="tx('testCaseWriter.fields.testDomain', '測試維度')" prop="testDomain">
              <el-select
                v-model="form.testDomain"
                :placeholder="tx('testCaseWriter.placeholders.testDomain', '請選擇測試維度')"
                style="width: 100%"
                @change="onDomainChange"
              >
                <el-option
                  v-for="item in testDomainOptions"
                  :key="item.value"
                  :label="item.label"
                  :value="item.value"
                />
              </el-select>
            </el-form-item>
          </el-col>

          <el-col :xs="24" :md="12">
            <el-form-item :label="tx('testCaseWriter.fields.testTarget', '測試對象')" prop="testTarget">
              <el-select
                v-model="form.testTarget"
                filterable
                allow-create
                default-first-option
                :placeholder="tx('testCaseWriter.placeholders.testTarget', '請選擇測試對象')"
                style="width: 100%"
              >
                <el-option
                  v-for="item in currentTargetOptions"
                  :key="item"
                  :label="item"
                  :value="item"
                />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="12">
          <el-col :xs="24" :md="12">
            <el-form-item :label="tx('testCaseWriter.fields.testChapter', '測試章節')" prop="testChapter">
              <el-select
                v-model="form.testChapter"
                filterable
                allow-create
                default-first-option
                :placeholder="tx('testCaseWriter.placeholders.testChapter', '例如：Hardware Functions / Performance')"
                style="width: 100%"
              >
                <el-option
                  v-for="c in testChapterOptions"
                  :key="c"
                  :label="c"
                  :value="c"
                />
              </el-select>
            </el-form-item>
          </el-col>

          <el-col :xs="24" :md="12">
            <el-form-item :label="tx('testCaseWriter.fields.code', '代碼')">
              <div class="code-row">
                <el-input
                  v-model.trim="form.code"
                  maxlength="100"
                  show-word-limit
                  :placeholder="tx('testCaseWriter.placeholders.code', '例如：CPU_001')"
                />
                <el-button
                  v-if="String(form.testTarget || '') === 'Storage'"
                  plain
                  :icon="SetUp"
                  @click="applyPresetFieldsForCurrent(true)"
                >
                  {{ tx('testCaseWriter.applyPresetFields', '套用表上欄位') }}
                </el-button>
              </div>
            </el-form-item>
          </el-col>
        </el-row>

        <el-form-item :label="tx('testCaseWriter.fields.testCase', '測試項目')" prop="testCase">
          <el-input
            v-model.trim="form.testCase"
            maxlength="255"
            show-word-limit
            :placeholder="tx('testCaseWriter.placeholders.testCase', '請輸入測試項目名稱')"
          />
        </el-form-item>

        <el-form-item :label="tx('testCaseWriter.fields.testProcedure', '測試步驟')">
          <el-input
            v-model="form.testProcedure"
            type="textarea"
            :rows="5"
            maxlength="10000"
            show-word-limit
            :placeholder="tx('testCaseWriter.placeholders.testProcedure', '請輸入測試步驟')"
          />
        </el-form-item>

        <el-form-item :label="tx('testCaseWriter.fields.testCriteria', '測試標準')">
          <el-input
            v-model="form.testCriteria"
            type="textarea"
            :rows="5"
            maxlength="10000"
            show-word-limit
            :placeholder="tx('testCaseWriter.placeholders.testCriteria', '請輸入測試標準')"
          />
        </el-form-item>

        <el-form-item :label="tx('testCaseWriter.fields.referenceImages', '參考圖片')">
          <div class="ref-wrap">
            <div class="ref-toolbar">
              <el-button type="primary" plain :icon="Picture" @click="openReferenceImagePicker">
                {{ tx('testCaseWriter.buttons.pickImage', '從檔案中心選圖') }}
              </el-button>

              <el-button
                plain
                :disabled="!form.extra.referenceImages.length"
                @click="clearReferenceImages"
              >
                {{ tx('common.clear', '清空') }}
              </el-button>

              <div class="ref-counter muted">
                {{ form.extra.referenceImages.length }} / {{ REF_IMAGE_MAX }}
              </div>
            </div>

            <div v-if="form.extra.referenceImages.length" class="ref-grid">
              <div
                v-for="(img, idx) in form.extra.referenceImages"
                :key="imgKey(img, idx)"
                class="ref-card"
              >
                <el-image
                  :src="img.url"
                  fit="contain"
                  class="ref-thumb"
                  :preview-src-list="form.extra.referenceImages.map(i => i.url)"
                  :initial-index="idx"
                  preview-teleported
                />
                <div class="ref-name" :title="img.name || ''">
                  {{ img.name || `image_${idx + 1}` }}
                </div>
                <el-button
                  type="danger"
                  text
                  size="small"
                  @click="removeReferenceImage(idx)"
                >
                  {{ tx('common.delete', '刪除') }}
                </el-button>
              </div>
            </div>

            <el-empty
              v-else
              :description="tx('testCaseWriter.emptyImages', '尚未加入參考圖片')"
              :image-size="80"
            />
          </div>
        </el-form-item>

        <el-form-item :label="tx('testCaseWriter.fields.imageNote', '圖片說明')">
          <el-input
            v-model.trim="form.extra.imageNote"
            type="textarea"
            :rows="2"
            maxlength="500"
            show-word-limit
            :placeholder="tx('testCaseWriter.placeholders.imageNote', '例如：請依圖片設定 HWINFO 的 Global / Average last')"
          />
        </el-form-item>

        <el-form-item :label="tx('testCaseWriter.fields.customFields', '表上欄位')">
          <div class="custom-fields-wrap">
            <div class="cf-toolbar">
              <div class="cf-toolbar-left">
                <el-button
                  v-if="String(form.testTarget || '') === 'Storage'"
                  plain
                  :icon="SetUp"
                  @click="applyPresetFieldsForCurrent(true)"
                >
                  {{ tx('testCaseWriter.applyPresetFields', '套用 Storage 表上欄位') }}
                </el-button>

                <el-button plain @click="addCustomField">
                  {{ tx('testCaseWriter.addCustomField', '新增欄位') }}
                </el-button>

                <el-button
                  plain
                  :disabled="!form.extra.customFields.length"
                  @click="clearCustomFields"
                >
                  {{ tx('common.clear', '清空') }}
                </el-button>
              </div>

              <div class="muted">
                {{ form.extra.customFields.length }} {{ tx('testCaseWriter.fieldsUnit', '欄') }}
              </div>
            </div>

            <el-alert
              v-if="currentPresetHint"
              class="cf-hint"
              type="success"
              :closable="false"
              show-icon
              :title="currentPresetHint"
            />

            <div v-if="form.extra.customFields.length" class="cf-list">
              <div
                v-for="(field, idx) in form.extra.customFields"
                :key="field.key || idx"
                class="cf-item"
              >
                <div class="cf-head">
                  <div class="cf-index">#{{ idx + 1 }}</div>
                  <el-button type="danger" text @click="removeCustomField(idx)">
                    {{ tx('common.delete', '刪除') }}
                  </el-button>
                </div>

                <div class="cf-grid">
                  <el-input
                    v-model.trim="field.label"
                    :placeholder="tx('testCaseWriter.placeholders.fieldLabel', '欄位名稱')"
                  />

                  <el-input
                    v-model.trim="field.key"
                    :placeholder="tx('testCaseWriter.placeholders.fieldKey', '欄位 key')"
                  />

                  <el-select v-model="field.type">
                    <el-option label="文字" value="text" />
                    <el-option label="數字" value="number" />
                    <el-option label="多行文字" value="textarea" />
                    <el-option label="下拉選單" value="select" />
                  </el-select>

                  <el-switch
                    v-model="field.required"
                    inline-prompt
                    :active-text="tx('testCaseWriter.requiredShort', '必填')"
                    :inactive-text="tx('testCaseWriter.optionalShort', '選填')"
                  />
                </div>

                <div class="cf-subgrid">
                  <el-input
                    v-if="field.type !== 'textarea'"
                    v-model="field.value"
                    :placeholder="tx('testCaseWriter.placeholders.fieldDefault', '預設值')"
                  />

                  <el-input
                    v-else
                    v-model="field.value"
                    type="textarea"
                    :rows="2"
                    :placeholder="tx('testCaseWriter.placeholders.fieldDefault', '預設值')"
                  />

                  <el-input
                    v-if="field.type === 'select'"
                    v-model="field.optionsText"
                    :placeholder="tx('testCaseWriter.placeholders.fieldOptions', '選項，請用逗號分隔')"
                  />
                </div>
              </div>
            </div>

            <el-empty
              v-else
              :description="tx('testCaseWriter.emptyFields', '尚未設定表上欄位')"
              :image-size="80"
            />
          </div>
        </el-form-item>

        <el-row :gutter="12">
          <el-col :xs="24" :md="12">
            <el-form-item :label="tx('testCaseWriter.fields.estHours', '預估工時')">
              <el-input-number
                v-model="form.estHours"
                :min="0"
                :step="0.5"
                :precision="1"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>

          <el-col :xs="24" :md="12">
            <el-form-item :label="tx('testCaseWriter.fields.isPlanned', '預設納入計畫')">
              <el-switch v-model="form.isPlanned" />
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>

      <template #footer>
        <el-button @click="dialogVisible = false">
          {{ tx('common.cancel', '取消') }}
        </el-button>
        <el-button type="primary" :loading="saving" @click="saveRow">
          {{ tx('common.save', '儲存') }}
        </el-button>
      </template>
    </el-dialog>

    <el-dialog
      v-model="imagePickerVisible"
      :title="tx('testCaseWriter.imagePickerTitle', '從檔案中心選擇圖片')"
      width="980px"
      :close-on-click-modal="false"
    >
      <div class="picker-toolbar">
        <el-input
          v-model="imageKeyword"
          clearable
          class="picker-search"
          :placeholder="tx('testCaseWriter.imageSearchPlaceholder', '搜尋檔案名稱')"
          @keyup.enter="loadImageFiles"
        >
          <template #prefix><el-icon><Search /></el-icon></template>
        </el-input>

        <el-button :loading="imageLoading" @click="loadImageFiles">
          {{ tx('common.search', '搜尋') }}
        </el-button>
      </div>

      <div v-loading="imageLoading" class="picker-body">
        <template v-if="imageFiles.length">
          <div class="picker-grid">
            <div
              v-for="file in imageFiles"
              :key="file._pickKey"
              class="picker-card"
              :class="{ active: isPickedImage(file), disabled: isImageAlreadyAdded(file) }"
              @click="togglePickImage(file)"
            >
              <div class="picker-thumb-wrap">
                <el-image
                  class="picker-thumb"
                  :src="file.previewUrl || file.url"
                  fit="cover"
                  preview-teleported
                />
              </div>

              <div class="picker-name" :title="file.name">
                {{ file.name || `file_${file.id}` }}
              </div>

              <div class="picker-sub muted">
                <span v-if="file.category">{{ file.category }}</span>
                <span v-if="file.category && file.mimeType"> / </span>
                <span v-if="file.mimeType">{{ file.mimeType }}</span>
              </div>

              <div class="picker-state">
                <el-tag v-if="isImageAlreadyAdded(file)" type="info" effect="plain">
                  {{ tx('testCaseWriter.added', '已加入') }}
                </el-tag>
                <el-tag v-else-if="isPickedImage(file)" type="primary">
                  {{ tx('testCaseWriter.selected', '已選取') }}
                </el-tag>
              </div>
            </div>
          </div>
        </template>

        <el-empty
          v-else
          :description="tx('common.noData', '目前沒有資料')"
        />
      </div>

      <template #footer>
        <el-button @click="imagePickerVisible = false">
          {{ tx('common.cancel', '取消') }}
        </el-button>
        <el-button type="primary" @click="confirmPickReferenceImages">
          {{ tx('testCaseWriter.confirmAddImages', '加入所選圖片') }}
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Refresh, Search, Picture, SetUp } from '@element-plus/icons-vue'
import getApiBase from '../utils/apiBase'

const { t, te, locale } = useI18n()
const router = useRouter()
const apiBase = getApiBase()

const REF_IMAGE_MAX = 8
const LOCAL_CACHE_KEY_PREFIX = 'tcw-library-cache:'
const SECTION_META_PREFIX = '__TCW__|'
const SECTION_META_MAX = 120

const STORAGE_FIELD_PRESETS = {
  DI_001: [
    { key: 'deviceInSystem', label: 'Device in System', type: 'text', value: '', required: false, options: [] },
    { key: 'remark', label: 'Remark', type: 'textarea', value: '', required: false, options: [] },
    { key: 'result', label: 'Result', type: 'select', value: '', required: false, options: ['PASS', 'FAIL'] }
  ],
  OSI_001: [
    { key: 'systemModel', label: 'System Model', type: 'text', value: '', required: false, options: [] },
    { key: 'osInfo', label: 'OS Info.', type: 'text', value: '', required: false, options: [] },
    { key: 'remark', label: 'Remark', type: 'textarea', value: '', required: false, options: [] },
    { key: 'result', label: 'Result', type: 'select', value: '', required: false, options: ['PASS', 'FAIL'] }
  ],
  SDI_001: [
    { key: 'hwinfo64Ver', label: 'HWINFO64 Ver.', type: 'text', value: '', required: false, options: [] },
    { key: 'systemModel', label: 'System Model', type: 'text', value: '', required: false, options: [] },
    { key: 'systemSpec', label: 'System spec.', type: 'text', value: '', required: false, options: [] },
    { key: 'deviceSpec', label: 'Device Spec.', type: 'text', value: '', required: false, options: [] },
    { key: 'running', label: 'Running', type: 'text', value: '', required: false, options: [] },
    { key: 'remark', label: 'Remark', type: 'textarea', value: '', required: false, options: [] },
    { key: 'result', label: 'Result', type: 'select', value: '', required: false, options: ['PASS', 'FAIL'] }
  ],
  CDM_001: [
    { key: 'cdmVer', label: 'CrystalDiskMark Ver.', type: 'text', value: '', required: false, options: [] },
    { key: 'rwRates', label: 'Result of Read & Write rates', type: 'textarea', value: '', required: false, options: [] },
    { key: 'mbModel', label: 'MB Model', type: 'text', value: '', required: false, options: [] },
    { key: 'remark', label: 'Remark', type: 'textarea', value: '', required: false, options: [] },
    { key: 'result', label: 'Result', type: 'select', value: '', required: false, options: ['PASS', 'FAIL'] }
  ],
  RBC_001: [
    { key: 'rebooterVer', label: 'PassMark Rebooter Ver.', type: 'text', value: '', required: false, options: [] },
    { key: 'systemModel', label: 'System Model', type: 'text', value: '', required: false, options: [] },
    { key: 'remark', label: 'Remark', type: 'textarea', value: '', required: false, options: [] },
    { key: 'result', label: 'Result', type: 'select', value: '', required: false, options: ['PASS', 'FAIL'] }
  ],
  SST_001: [
    { key: 'hwinfo64Ver', label: 'HWINFO64 Ver.', type: 'text', value: '', required: false, options: [] },
    { key: 'systemModel', label: 'System Model', type: 'text', value: '', required: false, options: [] },
    { key: 'storageTemp', label: 'Storage Temp.', type: 'number', value: '', required: false, options: [] },
    { key: 'remark', label: 'Remark', type: 'textarea', value: '', required: false, options: [] },
    { key: 'result', label: 'Result', type: 'select', value: '', required: false, options: ['PASS', 'FAIL'] }
  ],
  SSTH_001: [
    { key: 'hwinfo64Ver', label: 'HWINFO64 Ver.', type: 'text', value: '', required: false, options: [] },
    { key: 'systemModel', label: 'System Model', type: 'text', value: '', required: false, options: [] },
    { key: 'storageTemp', label: 'Storage Temp.', type: 'number', value: '', required: false, options: [] },
    { key: 'chamberTemp', label: 'Chamber Temperature', type: 'number', value: '', required: false, options: [] },
    { key: 'chamberHumidity', label: 'Chamber Humidity', type: 'number', value: '', required: false, options: [] },
    { key: 'remark', label: 'Remark', type: 'textarea', value: '', required: false, options: [] },
    { key: 'result', label: 'Result', type: 'select', value: '', required: false, options: ['PASS', 'FAIL'] }
  ],
  SSTL_001: [
    { key: 'hwinfo64Ver', label: 'HWINFO64 Ver.', type: 'text', value: '', required: false, options: [] },
    { key: 'systemModel', label: 'System Model', type: 'text', value: '', required: false, options: [] },
    { key: 'storageTemp', label: 'Storage Temp.', type: 'number', value: '', required: false, options: [] },
    { key: 'chamberTemp', label: 'Chamber Temperature', type: 'number', value: '', required: false, options: [] },
    { key: 'remark', label: 'Remark', type: 'textarea', value: '', required: false, options: [] },
    { key: 'result', label: 'Result', type: 'select', value: '', required: false, options: ['PASS', 'FAIL'] }
  ]
}

function tx (key, fallback, params) {
  try {
    return te(key)
      ? t(key, params)
      : fallback.replace(/\{(\w+)\}/g, (_, k) => String(params?.[k] ?? ''))
  } catch {
    return fallback
  }
}

function getToken () {
  return localStorage.getItem('token') || sessionStorage.getItem('token') || ''
}

function getUser () {
  try {
    return JSON.parse(localStorage.getItem('user') || sessionStorage.getItem('user') || 'null')
  } catch {
    return null
  }
}

function authHeaders (extra = {}) {
  const token = getToken()
  return {
    ...extra,
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  }
}

async function apiJson (path, { method = 'GET', params, body, headers = {} } = {}) {
  let url = `${apiBase}${path}`

  if (params && typeof params === 'object') {
    const qs = new URLSearchParams()
    Object.entries(params).forEach(([k, v]) => {
      if (v === undefined || v === null || v === '') return
      qs.set(k, String(v))
    })
    const q = qs.toString()
    if (q) url += `?${q}`
  }

  const reqHeaders = authHeaders(headers)
  const hasBody = body !== undefined
  if (hasBody) reqHeaders['Content-Type'] = 'application/json'

  const res = await fetch(url, {
    method,
    headers: reqHeaders,
    body: hasBody ? JSON.stringify(body) : undefined
  })

  if (res.status === 401) {
    localStorage.removeItem('token')
    sessionStorage.removeItem('token')
    localStorage.removeItem('user')
    sessionStorage.removeItem('user')
    router.push('/login')
    throw new Error(tx('auth.sessionExpired', '登入已過期，請重新登入'))
  }

  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(json?.message || `HTTP ${res.status}`)
  if (json && typeof json === 'object' && json.success === false) {
    throw new Error(json.message || 'Request failed')
  }

  return (json && typeof json === 'object' && 'data' in json) ? json.data : json
}

const TEST_DOMAIN_OPTIONS = [
  { value: 'System', label: 'System' },
  { value: 'Component', label: 'Component' },
  { value: 'OS', label: 'OS' }
]

const TEST_TARGET_MAP = {
  System: ['X86', 'Display', 'ARM'],
  Component: ['PCBA', 'Memory', 'Storage', 'Panel'],
  OS: ['OS']
}

const COMMON_TEST_CHAPTERS = [
  'Configuration & Utilities',
  'Hardware Functions',
  'Performance',
  'Reliability',
  'Stability',
  'Power Consumption',
  'Thermal Profile',
  'Electrostatic Discharge (ESD)',
  'Mechanical Protection',
  'Compatibility',
  'Device Installation',
  'Operating System Installation',
  'Storage Information',
  'CrystalDiskMark',
  'Reboot Cycling',
  'Stress Test under Ambient Temperature',
  'Stress Test under Supported High Temp. of System',
  'Stress Test under Supported Low Temp. of System'
]

const loading = ref(false)
const saving = ref(false)
const dialogVisible = ref(false)
const dialogMode = ref('create')
const keyword = ref('')

const rows = ref([])
const userLibraryRows = ref([])
const visibleSetRows = ref([])
const selectedRows = ref([])

const librarySetId = ref(null)
const libraryUpdatedAt = ref('')
const libraryEtag = ref('')
const editingKey = ref('')
const editingSourceSetId = ref(null)
const editingSourceSetName = ref('')

const imagePickerVisible = ref(false)
const imageLoading = ref(false)
const imageKeyword = ref('')
const imageFiles = ref([])
const pickedImageKeys = ref([])

const formRef = ref(null)
const form = reactive(emptyForm())

function emptyExtra () {
  return {
    referenceImages: [],
    imageNote: '',
    customFields: []
  }
}

function emptyForm () {
  return {
    id: null,
    testDomain: '',
    testTarget: '',
    testChapter: '',
    code: '',
    testCase: '',
    testProcedure: '',
    testCriteria: '',
    estHours: 0,
    isPlanned: true,
    extra: emptyExtra()
  }
}

function normalizeText (v) {
  return String(v ?? '').trim()
}

function toResolvedUrl (u) {
  const s = normalizeText(u)
  if (!s) return ''
  if (/^(https?:)?\/\//i.test(s) || s.startsWith('blob:') || s.startsWith('data:')) return s
  if (s.startsWith('/')) return s
  return `${String(apiBase || '').replace(/\/$/, '')}/${s.replace(/^\//, '')}`
}

function fileNameOf (f) {
  return normalizeText(
    f?.displayName ||
    f?.originalName ||
    f?.name ||
    f?.filename ||
    f?.fileName ||
    f?.storedName
  )
}

function normalizeImages (arr) {
  return (Array.isArray(arr) ? arr : [])
    .map((it) => {
      if (!it) return null

      if (typeof it === 'string') {
        const url = toResolvedUrl(it)
        if (!url) return null
        return { fileId: null, url, name: '' }
      }

      if (typeof it === 'object') {
        const url = toResolvedUrl(it.url || it.previewUrl || it.downloadUrl || '')
        if (!url) return null
        return {
          fileId: it.fileId ?? it.id ?? null,
          url,
          name: normalizeText(it.name || it.displayName || it.originalName || it.fileName)
        }
      }

      return null
    })
    .filter(Boolean)
}

function normalizeCustomField (field, idx = 0) {
  const type = ['text', 'number', 'textarea', 'select'].includes(field?.type) ? field.type : 'text'
  const options = Array.isArray(field?.options)
    ? field.options.map(v => normalizeText(v)).filter(Boolean)
    : normalizeText(field?.optionsText)
        .split(',')
        .map(v => normalizeText(v))
        .filter(Boolean)

  return {
    key: normalizeText(field?.key) || `field_${Date.now()}_${idx}`,
    label: normalizeText(field?.label),
    type,
    value: field?.value == null ? '' : String(field.value),
    options,
    optionsText: options.join(', '),
    required: field?.required === true
  }
}

function normalizeCustomFields (arr) {
  return (Array.isArray(arr) ? arr : [])
    .map((field, idx) => normalizeCustomField(field, idx))
    .filter(field => field.label || field.key)
}

function serializeCustomField (field, idx = 0) {
  const f = normalizeCustomField(field, idx)
  if (!f.label) return null
  return {
    key: f.key,
    label: f.label,
    type: f.type,
    value: f.value,
    options: f.type === 'select' ? f.options : [],
    required: f.required === true
  }
}

function normalizeExtra (extra) {
  const source = extra && typeof extra === 'object' ? extra : {}
  return {
    ...source,
    referenceImages: normalizeImages(source.referenceImages),
    imageNote: normalizeText(source.imageNote),
    customFields: normalizeCustomFields(source.customFields)
  }
}

function serializeExtra (extra) {
  const ex = normalizeExtra(extra)
  return {
    referenceImages: ex.referenceImages,
    imageNote: ex.imageNote,
    customFields: ex.customFields
      .map((field, idx) => serializeCustomField(field, idx))
      .filter(Boolean)
  }
}

function imgKey (img, idx) {
  return String(img?.fileId || img?.url || idx)
}

function buildFilePreviewUrl (file) {
  const direct =
    toResolvedUrl(file?.previewUrl) ||
    toResolvedUrl(file?.thumbnailUrl) ||
    toResolvedUrl(file?.url) ||
    toResolvedUrl(file?.path)

  if (direct) return direct

  const id = Number(file?.id || 0)
  if (!id) return ''
  return `${String(apiBase || '').replace(/\/$/, '')}/files/${id}/preview`
}

function buildFileDownloadUrl (file) {
  const direct =
    toResolvedUrl(file?.downloadUrl) ||
    toResolvedUrl(file?.url) ||
    toResolvedUrl(file?.path)

  if (direct) return direct

  const id = Number(file?.id || 0)
  if (!id) return ''
  return `${String(apiBase || '').replace(/\/$/, '')}/files/${id}/download`
}

function normalizeFileItem (file, idx = 0) {
  const id = Number(file?.id || 0) || null
  const previewUrl = buildFilePreviewUrl(file)
  const downloadUrl = buildFileDownloadUrl(file)
  const name = fileNameOf(file)

  return {
    id,
    _pickKey: String(id || name || idx),
    name,
    category: normalizeText(file?.category),
    mimeType: normalizeText(file?.mimeType || file?.mimetype || file?.type),
    previewUrl,
    downloadUrl,
    url: previewUrl || downloadUrl
  }
}

function isImageFileItem (file) {
  const mime = normalizeText(file?.mimeType).toLowerCase()
  const name = normalizeText(file?.name).toLowerCase()
  const url = normalizeText(file?.previewUrl || file?.url).toLowerCase()

  if (mime.startsWith('image/')) return true
  if (/\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(name)) return true
  if (/\.(png|jpe?g|gif|webp|bmp|svg)(\?|#|$)/i.test(url)) return true
  return false
}

function deepClone (obj) {
  return JSON.parse(JSON.stringify(obj))
}

function cacheKeyOf (userId) {
  return `${LOCAL_CACHE_KEY_PREFIX}${Number(userId || 0) || 0}`
}

function buildSectionMeta (row = {}) {
  const domain = normalizeText(row.testDomain)
  const target = normalizeText(row.testTarget)
  const chapter = normalizeText(row.testChapter || row.category || row.section)
  if (!domain && !target && !chapter) return chapter

  const encoded = `${SECTION_META_PREFIX}${encodeURIComponent(domain)}|${encodeURIComponent(target)}|${encodeURIComponent(chapter)}`
  if (encoded.length <= SECTION_META_MAX) return encoded
  return chapter
}

function parseSectionMeta (section, fallbackChapter = '') {
  const raw = normalizeText(section)
  if (!raw.startsWith(SECTION_META_PREFIX)) {
    return {
      testDomain: '',
      testTarget: '',
      testChapter: normalizeText(fallbackChapter || raw)
    }
  }

  const body = raw.slice(SECTION_META_PREFIX.length)
  const [domain = '', target = '', chapter = ''] = body.split('|')
  const decode = (s) => {
    try {
      return decodeURIComponent(String(s || ''))
    } catch {
      return String(s || '')
    }
  }

  return {
    testDomain: normalizeText(decode(domain)),
    testTarget: normalizeText(decode(target)),
    testChapter: normalizeText(decode(chapter || fallbackChapter))
  }
}

function inferDomainTarget (item = {}) {
  const code = normalizeText(item?.code).toUpperCase()
  const chapter = normalizeText(item?.testChapter || item?.category || '').toLowerCase()
  const target = normalizeText(item?.testTarget || item?.target).toLowerCase()

  if (target === 'storage') {
    return { testDomain: 'Component', testTarget: 'Storage' }
  }
  if (target === 'memory') {
    return { testDomain: 'Component', testTarget: 'Memory' }
  }
  if (target === 'panel') {
    return { testDomain: 'Component', testTarget: 'Panel' }
  }
  if (target === 'pcba') {
    return { testDomain: 'Component', testTarget: 'PCBA' }
  }
  if (target === 'os') {
    return { testDomain: 'OS', testTarget: 'OS' }
  }

  if (chapter.includes('operating system') || chapter === 'os') {
    return { testDomain: 'OS', testTarget: 'OS' }
  }

  if (
    code.startsWith('MI_') ||
    code.startsWith('MPT_') ||
    code.startsWith('MST_') ||
    code.startsWith('MSTH_') ||
    code.startsWith('MSTL_') ||
    code.startsWith('IRI_') ||
    code.startsWith('CT_')
  ) {
    return { testDomain: 'Component', testTarget: 'Memory' }
  }

  if (
    code.startsWith('DI_') ||
    code.startsWith('OSI_') ||
    code.startsWith('SDI_') ||
    code.startsWith('CDM_') ||
    code.startsWith('RBC_') ||
    code.startsWith('SST_') ||
    code.startsWith('SSTH_') ||
    code.startsWith('SSTL_') ||
    code.startsWith('SSD_') ||
    code.startsWith('NVME_')
  ) {
    return { testDomain: 'Component', testTarget: 'Storage' }
  }

  if (code.startsWith('PNL_')) {
    return { testDomain: 'Component', testTarget: 'Panel' }
  }

  return { testDomain: 'System', testTarget: 'X86' }
}

function rowFingerprint (row = {}) {
  return [
    normalizeText(row.code),
    normalizeText(row.testCase),
    normalizeText(row.testProcedure),
    normalizeText(row.testCriteria),
    normalizeText(row.testChapter || row.category),
    normalizeText(row.testDomain),
    normalizeText(row.testTarget)
  ].join('\u241f')
}

function saveLocalRowsBackup (rowsList) {
  try {
    localStorage.setItem(
      cacheKeyOf(libraryUserId.value),
      JSON.stringify({
        version: 1,
        updatedAt: new Date().toISOString(),
        rows: (Array.isArray(rowsList) ? rowsList : []).map((row, idx) => ({
          ...normalizeItem(row, idx, {
            editable: true,
            sourceSetId: librarySetId.value,
            sourceSetName: libraryName.value
          }),
          extra: serializeExtra(row?.extra)
        }))
      })
    )
  } catch {}
}

function loadLocalRowsBackup () {
  try {
    const raw = localStorage.getItem(cacheKeyOf(libraryUserId.value))
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed?.rows)) return []
    return parsed.rows.map((row, idx) =>
      normalizeItem(row, idx, {
        editable: true,
        sourceSetId: librarySetId.value,
        sourceSetName: libraryName.value
      })
    )
  } catch {
    return []
  }
}

function mergeRowsWithLocalBackup (serverRows) {
  const cacheRows = loadLocalRowsBackup()
  if (!cacheRows.length) return serverRows

  const bucket = new Map()
  cacheRows.forEach((row) => {
    const key = rowFingerprint(row)
    if (!bucket.has(key)) bucket.set(key, [])
    bucket.get(key).push(row)
  })

  return serverRows.map((row, idx) => {
    const key = rowFingerprint(row)
    const matched = bucket.get(key)?.shift()
    if (!matched) return row

    return normalizeItem({
      ...row,
      testDomain: matched.testDomain || row.testDomain,
      testTarget: matched.testTarget || row.testTarget,
      testChapter: matched.testChapter || row.testChapter,
      extra: matched.extra || row.extra
    }, idx, {
      editable: true,
      sourceSetId: librarySetId.value,
      sourceSetName: libraryName.value
    })
  })
}

function pickArrayFromPayload (data) {
  if (Array.isArray(data)) return data
  if (Array.isArray(data?.items)) return data.items
  if (Array.isArray(data?.rows)) return data.rows
  if (Array.isArray(data?.files)) return data.files
  if (Array.isArray(data?.list)) return data.list
  if (Array.isArray(data?.data)) return data.data
  return []
}

function hasStoragePresetCode (code) {
  return !!STORAGE_FIELD_PRESETS[normalizeText(code)]
}

function getStoragePresetFields (code) {
  const preset = STORAGE_FIELD_PRESETS[normalizeText(code)]
  return preset ? normalizeCustomFields(deepClone(preset)) : []
}

const rules = {
  testDomain: [{ required: true, message: tx('testCaseWriter.validation.testDomain', '請選擇測試維度'), trigger: 'change' }],
  testTarget: [{ required: true, message: tx('testCaseWriter.validation.testTarget', '請選擇測試對象'), trigger: 'change' }],
  testChapter: [{ required: true, message: tx('testCaseWriter.validation.testChapter', '請輸入測試章節'), trigger: 'change' }],
  testCase: [{ required: true, message: tx('testCaseWriter.validation.testCase', '請輸入測試項目'), trigger: 'blur' }]
}

const libraryUserId = computed(() => Number(getUser()?.id || 0) || 0)
const libraryName = computed(() => libraryUserId.value ? `__TC_LIBRARY_USER_${libraryUserId.value}__` : '__TC_LIBRARY_USER_0__')

const testDomainOptions = computed(() => TEST_DOMAIN_OPTIONS)

const currentTargetOptions = computed(() => {
  const key = String(form.testDomain || '')
  return TEST_TARGET_MAP[key] || []
})

const currentPresetHint = computed(() => {
  if (String(form.testTarget || '') !== 'Storage') return ''
  const code = normalizeText(form.code)
  if (!hasStoragePresetCode(code)) return ''
  return `已偵測到 ${code} 的 Storage 表上欄位模板`
})

const filteredRows = computed(() => {
  const kw = normalizeText(keyword.value).toLowerCase()
  if (!kw) return rows.value

  return rows.value.filter(row => {
    const imgNames = (row.extra?.referenceImages || []).map(img => img?.name || '').join(' ')
    const fieldNames = (row.extra?.customFields || [])
      .map(field => [field?.label, field?.key, field?.value].join(' '))
      .join(' ')

    const blob = [
      row.testDomain,
      row.testTarget,
      row.testChapter,
      row.code,
      row.testCase,
      row.testProcedure,
      row.testCriteria,
      row._sourceSetName || '',
      row.extra?.imageNote || '',
      imgNames,
      fieldNames
    ].join(' ').toLowerCase()

    return blob.includes(kw)
  })
})

const testChapterOptions = computed(() => {
  const dynamic = rows.value.map(r => normalizeText(r?.testChapter || r?.category)).filter(Boolean)
  return Array.from(new Set([...COMMON_TEST_CHAPTERS, ...dynamic]))
})

function normalizeItem (item, idx = 0, meta = {}) {
  const parsedSectionMeta = parseSectionMeta(
    item?.section,
    item?.testChapter || item?.category || item?.section
  )

  const inferred = inferDomainTarget({
    ...item,
    testChapter: parsedSectionMeta.testChapter || item?.testChapter || item?.category || item?.section
  })

  const testDomain = normalizeText(item?.testDomain || item?.domain || parsedSectionMeta.testDomain || inferred.testDomain)
  const testTarget = normalizeText(item?.testTarget || item?.target || parsedSectionMeta.testTarget || inferred.testTarget)
  const testChapter = normalizeText(item?.testChapter || item?.chapter || parsedSectionMeta.testChapter || item?.category || item?.section)

  const sourceSetId = Number(meta?.sourceSetId ?? item?._sourceSetId ?? item?.testSetId ?? item?.defaultTestSetId ?? 0) || null
  const sourceSetName = normalizeText(meta?.sourceSetName || item?._sourceSetName || item?.setName || '')
  const editable = meta?.editable === true || item?._editable === true

  return {
    id: Number(item?.id || 0) || null,
    _key: String(item?._key || `${sourceSetId || 'set'}-${item?.id || normalizeText(item?.code) || idx}`),
    _sourceSetId: sourceSetId,
    _sourceSetName: sourceSetName,
    _editable: editable,

    testDomain,
    testTarget,
    testChapter,
    category: normalizeText(item?.category || testChapter),
    section: normalizeText(item?.section || buildSectionMeta({ testDomain, testTarget, testChapter })),
    code: normalizeText(item?.code),
    testCase: normalizeText(item?.testCase),
    testProcedure: String(item?.testProcedure ?? '').trim(),
    testCriteria: String(item?.testCriteria ?? '').trim(),
    estHours: Number(item?.estHours ?? item?.estHrs ?? item?.estimatedHours ?? 0) || 0,
    isPlanned: item?.isPlanned !== false,
    extra: normalizeExtra(item?.extra),
    updatedAt: item?.updatedAt || ''
  }
}

function toPayloadItem (item, idx = 0) {
  const row = normalizeItem(item, idx, {
    editable: true,
    sourceSetId: item?._sourceSetId || librarySetId.value,
    sourceSetName: item?._sourceSetName || libraryName.value
  })

  return {
    testDomain: row.testDomain,
    testTarget: row.testTarget,
    testChapter: row.testChapter,
    domain: row.testDomain,
    target: row.testTarget,
    chapter: row.testChapter,
    category: row.testChapter,
    section: buildSectionMeta(row),
    code: row.code,
    testCase: row.testCase,
    testProcedure: row.testProcedure,
    testCriteria: row.testCriteria,
    extra: serializeExtra(row.extra),
    estHours: Number(row.estHours ?? 0) || 0,
    isPlanned: row.isPlanned !== false,
    orderNo: idx
  }
}

function onDomainChange (value) {
  const list = TEST_TARGET_MAP[String(value || '')] || []
  if (!list.includes(form.testTarget)) {
    form.testTarget = list[0] || ''
  }
}

function onSelectionChange (list) {
  selectedRows.value = Array.isArray(list) ? list : []
}

function formatHours (v) {
  const n = Number(v)
  return Number.isFinite(n) ? n.toFixed(1) : '0.0'
}

function formatDateTime (v) {
  if (!v) return '—'
  const d = new Date(v)
  if (Number.isNaN(d.getTime())) return String(v)
  try {
    return new Intl.DateTimeFormat(locale.value || 'zh-TW', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    }).format(d)
  } catch {
    return d.toLocaleString()
  }
}

function customFieldsPreview (row) {
  const names = (row?.extra?.customFields || [])
    .map(field => normalizeText(field?.label))
    .filter(Boolean)

  if (!names.length) return ''
  if (names.length <= 3) return names.join(' / ')
  return `${names.slice(0, 3).join(' / ')} ...`
}

function isUserLibraryRow (row) {
  if (!row) return false
  if (librarySetId.value && Number(row._sourceSetId || 0) === Number(librarySetId.value || 0)) return true
  return String(row._sourceSetName || '') === String(libraryName.value)
}

function mergeVisibleAndUserRows () {
  const hiddenVisibleRows = visibleSetRows.value.filter(row => !isUserLibraryRow(row))
  rows.value = [
    ...userLibraryRows.value,
    ...hiddenVisibleRows
  ]
  selectedRows.value = []
}

async function createLibrarySetIfNeeded () {
  if (librarySetId.value) return librarySetId.value

  const created = await apiJson('/default-test-sets', {
    method: 'POST',
    body: {
      name: libraryName.value,
      description: 'User Test Case Library',
      meta: { type: 'testcase-library', hidden: true, scope: 'user' },
      items: []
    }
  })

  librarySetId.value = Number(created?.id || 0) || null
  return librarySetId.value
}

async function getSetDetailForEdit (setId) {
  const id = Number(setId || 0)
  if (!id) throw new Error('setId is required')

  let data = null

  for (const base of ['/default-test-sets', '/test-sets']) {
    try {
      data = await apiJson(`${base}/${id}`, {
        params: { includeItems: true }
      })
      break
    } catch {}
  }

  if (!data) throw new Error(`Failed to load set #${id}`)

  const row = data?.data && typeof data.data === 'object' ? data.data : data
  const rawItems = Array.isArray(row?.items)
    ? row.items
    : Array.isArray(row?.testCases)
      ? row.testCases
      : []

  return {
    id: Number(row?.id || id),
    name: normalizeText(row?.name || ''),
    description: normalizeText(row?.description || ''),
    version: normalizeText(row?.version || ''),
    templateKey: normalizeText(row?.templateKey || ''),
    meta: row?.meta ?? null,
    isPublic: row?.isPublic,
    fromProductId: row?.fromProductId ?? null,
    updatedAt: row?.updatedAt || '',
    etag: String(row?.etag || ''),
    items: rawItems.map((it, idx) =>
      normalizeItem(it, idx, {
        editable: true,
        sourceSetId: id,
        sourceSetName: row?.name || ''
      })
    )
  }
}

async function persistRowsToSet (setId, nextRows, successMessage) {
  const setDetail = await getSetDetailForEdit(setId)

  const body = {
    name: setDetail.name,
    description: setDetail.description,
    items: nextRows.map((row, idx) => toPayloadItem({
      ...row,
      _sourceSetId: setDetail.id,
      _sourceSetName: setDetail.name,
      _editable: true
    }, idx))
  }

  if (setDetail.version) body.version = setDetail.version
  if (setDetail.templateKey) body.templateKey = setDetail.templateKey
  if (setDetail.meta !== undefined) body.meta = setDetail.meta
  if (setDetail.isPublic !== undefined) body.isPublic = setDetail.isPublic
  if (setDetail.fromProductId !== undefined) body.fromProductId = setDetail.fromProductId

  await apiJson(`/default-test-sets/${setDetail.id}`, {
    method: 'PUT',
    headers: setDetail.etag ? { 'If-Match': setDetail.etag } : {},
    body
  })

  if (successMessage) ElMessage.success(successMessage)
}

async function persistSingleRowToSourceSet (row, successMessage) {
  const setId = Number(row?._sourceSetId || 0) || librarySetId.value
  if (!setId) throw new Error('找不到來源測試集')

  const setDetail = await getSetDetailForEdit(setId)
  const nextItems = [...setDetail.items]

  const idx = nextItems.findIndex(it =>
    (Number(row?.id || 0) > 0 && Number(it?.id || 0) === Number(row?.id || 0)) ||
    String(it?._key || '') === String(row?._key || '')
  )

  if (idx >= 0) {
    nextItems.splice(idx, 1, normalizeItem(row, idx, {
      editable: true,
      sourceSetId: setId,
      sourceSetName: setDetail.name
    }))
  } else {
    nextItems.push(normalizeItem(row, nextItems.length, {
      editable: true,
      sourceSetId: setId,
      sourceSetName: setDetail.name
    }))
  }

  await persistRowsToSet(setId, nextItems, successMessage)
}

async function fetchEditableLibrarySet () {
  try {
    const data = await apiJson(`/default-test-sets/by-name/${encodeURIComponent(libraryName.value)}`)

    librarySetId.value = Number(data?.id || 0) || null
    libraryUpdatedAt.value = data?.updatedAt || ''
    libraryEtag.value = String(data?.etag || '')

    const rawItems = Array.isArray(data?.items)
      ? data.items
      : Array.isArray(data?.testCases)
        ? data.testCases
        : []

    const normalized = rawItems.map((it, idx) =>
      normalizeItem(it, idx, {
        editable: true,
        sourceSetId: data?.id,
        sourceSetName: libraryName.value
      })
    )

    userLibraryRows.value = mergeRowsWithLocalBackup(normalized)
  } catch (err) {
    const msg = String(err?.message || '')
    if (/not found/i.test(msg) || /404/.test(msg)) {
      userLibraryRows.value = []
      librarySetId.value = null
      libraryUpdatedAt.value = ''
      libraryEtag.value = ''
      return
    }
    throw err
  }
}

async function fetchVisibleSetRows () {
  const collected = []
  const seenSetIds = new Set()

  async function tryListFrom (basePath) {
    let page = 1
    const pageSize = 200

    while (true) {
      let data = null
      try {
        data = await apiJson(basePath, {
          params: {
            includeItems: true,
            page,
            pageSize
          }
        })
      } catch {
        return false
      }

      const setRows = Array.isArray(data?.rows)
        ? data.rows
        : Array.isArray(data?.data?.rows)
          ? data.data.rows
          : Array.isArray(data)
            ? data
            : []

      const total = Number(
        data?.total ??
        data?.data?.total ??
        setRows.length ??
        0
      )

      for (const setRow of setRows) {
        const sourceSetId = Number(setRow?.id || 0) || null
        if (!sourceSetId || seenSetIds.has(sourceSetId)) continue
        seenSetIds.add(sourceSetId)

        const sourceSetName = normalizeText(setRow?.name || '')
        let items = Array.isArray(setRow?.items)
          ? setRow.items
          : Array.isArray(setRow?.testCases)
            ? setRow.testCases
            : []

        if (!items.length) {
          for (const detailBase of ['/test-sets', '/default-test-sets']) {
            try {
              const detail = await apiJson(`${detailBase}/${sourceSetId}`, {
                params: { includeItems: true }
              })

              const detailRow =
                detail?.data && typeof detail.data === 'object'
                  ? detail.data
                  : detail

              items = Array.isArray(detailRow?.items)
                ? detailRow.items
                : Array.isArray(detailRow?.testCases)
                  ? detailRow.testCases
                  : []

              if (items.length) break
            } catch {}
          }
        }

        items.forEach((it, idx) => {
          collected.push(normalizeItem(it, idx, {
            editable: true,
            sourceSetId,
            sourceSetName
          }))
        })
      }

      if (!setRows.length) break
      if (page * pageSize >= total) break
      page += 1
      if (page > 50) break
    }

    return true
  }

  await tryListFrom('/test-sets')
  await tryListFrom('/default-test-sets')

  visibleSetRows.value = collected
}

async function loadAllLibraryRows () {
  loading.value = true
  try {
    await fetchEditableLibrarySet()
    await fetchVisibleSetRows()
    mergeVisibleAndUserRows()

    if (!visibleSetRows.value.length) {
      console.warn('[TestCaseWriter] visibleSetRows is empty')
    } else {
      console.log('[TestCaseWriter] visibleSetRows =', visibleSetRows.value.length)
    }
  } catch (err) {
    console.error('[TestCaseWriter] loadAllLibraryRows failed:', err)
    ElMessage.error(err?.message || tx('testCaseWriter.messages.loadFailed', '載入測試項目失敗'))
  } finally {
    loading.value = false
  }
}

async function persistRows (nextRows, successMessage) {
  saving.value = true
  try {
    const id = librarySetId.value || await createLibrarySetIfNeeded()

    const normalizedRows = nextRows.map((row, idx) =>
      normalizeItem(row, idx, {
        editable: true,
        sourceSetId: id,
        sourceSetName: libraryName.value
      })
    )

    saveLocalRowsBackup(normalizedRows)
    await persistRowsToSet(id, normalizedRows, successMessage)
    await loadAllLibraryRows()
  } catch (err) {
    ElMessage.error(err?.message || tx('testCaseWriter.messages.saveFailed', '儲存失敗'))
  } finally {
    saving.value = false
  }
}

function resetForm () {
  editingKey.value = ''
  editingSourceSetId.value = null
  editingSourceSetName.value = ''
  Object.assign(form, emptyForm())
}

function maybeApplyPresetFieldsSilently () {
  if (String(form.testTarget || '') !== 'Storage') return
  if (!normalizeText(form.code)) return
  if (form.extra.customFields.length) return
  if (!hasStoragePresetCode(form.code)) return
  form.extra.customFields = getStoragePresetFields(form.code)
}

function fillForm (row) {
  Object.assign(form, {
    id: row?.id || null,
    testDomain: row?.testDomain || '',
    testTarget: row?.testTarget || '',
    testChapter: row?.testChapter || row?.category || '',
    code: row?.code || '',
    testCase: row?.testCase || '',
    testProcedure: row?.testProcedure || '',
    testCriteria: row?.testCriteria || '',
    estHours: Number(row?.estHours ?? 0) || 0,
    isPlanned: row?.isPlanned !== false,
    extra: normalizeExtra(row?.extra)
  })
  onDomainChange(form.testDomain)
  maybeApplyPresetFieldsSilently()
}

function openCreate () {
  dialogMode.value = 'create'
  resetForm()
  form.testDomain = testDomainOptions.value[0]?.value || ''
  onDomainChange(form.testDomain)
  form.testChapter = testChapterOptions.value[0] || ''
  editingSourceSetId.value = librarySetId.value
  editingSourceSetName.value = libraryName.value
  dialogVisible.value = true
}

function openEdit (row) {
  dialogMode.value = 'edit'
  resetForm()
  editingKey.value = String(row?._key || '')
  editingSourceSetId.value = Number(row?._sourceSetId || 0) || null
  editingSourceSetName.value = String(row?._sourceSetName || '')
  fillForm(row)
  form.id = row?.id || null
  dialogVisible.value = true
}

function onDialogClosed () {
  saving.value = false
  resetForm()
  formRef.value?.clearValidate?.()
}

async function loadImageFiles () {
  imageLoading.value = true
  try {
    const params = {
      keyword: imageKeyword.value,
      category: 'Image',
      page: 1,
      pageSize: 80,
      limit: 80
    }

    let data = null
    let lastError = null

    for (const path of ['/files', '/files/list', '/files/search']) {
      try {
        data = await apiJson(path, { params })
        break
      } catch (err) {
        lastError = err
      }
    }

    if (!data) throw lastError || new Error('Load images failed')

    imageFiles.value = pickArrayFromPayload(data)
      .map((file, idx) => normalizeFileItem(file, idx))
      .filter(file => file.url || file.previewUrl)
      .filter(isImageFileItem)
  } catch (err) {
    ElMessage.error(err?.message || tx('testCaseWriter.messages.loadImagesFailed', '載入圖片失敗'))
  } finally {
    imageLoading.value = false
  }
}

async function openReferenceImagePicker () {
  if ((form.extra.referenceImages || []).length >= REF_IMAGE_MAX) {
    ElMessage.warning(tx('testCaseWriter.maxImages', '最多只能放 {n} 張圖片', { n: REF_IMAGE_MAX }))
    return
  }

  imagePickerVisible.value = true
  pickedImageKeys.value = []

  if (!imageFiles.value.length) {
    await loadImageFiles()
  }
}

function clearReferenceImages () {
  form.extra.referenceImages = []
}

function removeReferenceImage (idx) {
  const next = [...(form.extra.referenceImages || [])]
  next.splice(idx, 1)
  form.extra.referenceImages = next
}

function isImageAlreadyAdded (file) {
  const key = String(file?._pickKey || '')
  return (form.extra.referenceImages || []).some(img => {
    if (img?.fileId && file?.id) return Number(img.fileId) === Number(file.id)
    return String(img?.url || '') === String(file?.url || file?.previewUrl || '') || imgKey(img) === key
  })
}

function isPickedImage (file) {
  return pickedImageKeys.value.includes(String(file?._pickKey || ''))
}

function togglePickImage (file) {
  if (!file) return
  if (isImageAlreadyAdded(file)) return

  const key = String(file._pickKey)
  const exists = pickedImageKeys.value.includes(key)

  if (exists) {
    pickedImageKeys.value = pickedImageKeys.value.filter(k => k !== key)
    return
  }

  const currentCount = (form.extra.referenceImages || []).length + pickedImageKeys.value.length
  if (currentCount >= REF_IMAGE_MAX) {
    ElMessage.warning(tx('testCaseWriter.maxImages', '最多只能放 {n} 張圖片', { n: REF_IMAGE_MAX }))
    return
  }

  pickedImageKeys.value = [...pickedImageKeys.value, key]
}

function confirmPickReferenceImages () {
  if (!pickedImageKeys.value.length) {
    imagePickerVisible.value = false
    return
  }

  const pickedSet = new Set(pickedImageKeys.value)
  const pickedFiles = imageFiles.value.filter(file => pickedSet.has(String(file._pickKey)))
  const next = normalizeImages(form.extra.referenceImages)

  pickedFiles.forEach(file => {
    const exists = next.some(img => {
      if (img?.fileId && file?.id) return Number(img.fileId) === Number(file.id)
      return String(img?.url || '') === String(file?.url || file?.previewUrl || '')
    })
    if (exists) return
    if (next.length >= REF_IMAGE_MAX) return

    next.push({
      fileId: file.id,
      url: file.previewUrl || file.url,
      name: file.name
    })
  })

  form.extra.referenceImages = next
  pickedImageKeys.value = []
  imagePickerVisible.value = false
}

function addCustomField () {
  form.extra.customFields.push(
    normalizeCustomField(
      { key: '', label: '', type: 'text', value: '', options: [], required: false },
      form.extra.customFields.length
    )
  )
}

function removeCustomField (idx) {
  const next = [...form.extra.customFields]
  next.splice(idx, 1)
  form.extra.customFields = next
}

function clearCustomFields () {
  form.extra.customFields = []
}

async function applyPresetFieldsForCurrent (confirmOverwrite = true) {
  const code = normalizeText(form.code)

  if (String(form.testTarget || '') !== 'Storage') {
    ElMessage.warning(tx('testCaseWriter.onlyStoragePreset', '目前僅提供 Storage 預設欄位'))
    return
  }

  if (!hasStoragePresetCode(code)) {
    ElMessage.warning(tx('testCaseWriter.noPresetForCode', '此代碼尚未設定預設欄位模板'))
    return
  }

  if (confirmOverwrite && form.extra.customFields.length) {
    try {
      await ElMessageBox.confirm(
        tx('testCaseWriter.overwriteFieldsConfirm', '套用預設欄位會覆蓋目前表上欄位，是否繼續？'),
        tx('common.confirm', '確認'),
        { type: 'warning' }
      )
    } catch {
      return
    }
  }

  form.extra.customFields = getStoragePresetFields(code)
  ElMessage.success(tx('testCaseWriter.presetFieldsApplied', '已套用表上欄位'))
}

async function batchFillStorageFields () {
  if (!rows.value.length) return

  const bySet = new Map()

  rows.value.forEach((row) => {
    if (String(row.testTarget || '') !== 'Storage') return
    if (!hasStoragePresetCode(row.code)) return

    const extra = normalizeExtra(row.extra)
    if (extra.customFields.length) return

    const setId = Number(row?._sourceSetId || 0) || librarySetId.value
    if (!setId) return

    if (!bySet.has(setId)) bySet.set(setId, [])
    bySet.get(setId).push({
      ...row,
      extra: {
        ...extra,
        customFields: getStoragePresetFields(row.code)
      }
    })
  })

  const total = Array.from(bySet.values()).reduce((sum, arr) => sum + arr.length, 0)

  if (!total) {
    ElMessage.info(tx('testCaseWriter.noRowsNeedFill', '目前沒有需要補齊的 Storage 表上欄位'))
    return
  }

  saving.value = true
  try {
    for (const [setId, patchedRows] of bySet.entries()) {
      const setDetail = await getSetDetailForEdit(setId)
      const nextRows = [...setDetail.items]

      patchedRows.forEach((patched) => {
        const idx = nextRows.findIndex(item =>
          (Number(patched?.id || 0) > 0 && Number(item?.id || 0) === Number(patched?.id || 0)) ||
          String(item?._key || '') === String(patched?._key || '')
        )

        if (idx >= 0) {
          nextRows.splice(idx, 1, normalizeItem(patched, idx, {
            editable: true,
            sourceSetId: setId,
            sourceSetName: setDetail.name
          }))
        }
      })

      await persistRowsToSet(setId, nextRows)
    }

    ElMessage.success(tx('testCaseWriter.rowsFilled', '已補齊 {n} 筆 Storage 表上欄位', { n: total }))
    await loadAllLibraryRows()
  } catch (err) {
    ElMessage.error(err?.message || tx('testCaseWriter.messages.saveFailed', '儲存失敗'))
  } finally {
    saving.value = false
  }
}

async function saveRow () {
  try {
    await formRef.value?.validate?.()
  } catch {
    return
  }

  const setId = dialogMode.value === 'edit'
    ? (Number(editingSourceSetId.value || 0) || librarySetId.value)
    : (librarySetId.value || await createLibrarySetIfNeeded())

  const setName = dialogMode.value === 'edit'
    ? (editingSourceSetName.value || libraryName.value)
    : libraryName.value

  const payload = normalizeItem({
    id: form.id,
    _key: editingKey.value || undefined,
    _sourceSetId: setId,
    _sourceSetName: setName,
    testDomain: form.testDomain,
    testTarget: form.testTarget,
    testChapter: form.testChapter,
    category: form.testChapter,
    section: form.testChapter,
    code: form.code,
    testCase: form.testCase,
    testProcedure: form.testProcedure,
    testCriteria: form.testCriteria,
    estHours: form.estHours,
    isPlanned: form.isPlanned,
    extra: serializeExtra(form.extra)
  }, 0, {
    editable: true,
    sourceSetId: setId,
    sourceSetName: setName
  })

  saving.value = true
  try {
    if (dialogMode.value === 'edit') {
      await persistSingleRowToSourceSet(
        payload,
        tx('testCaseWriter.messages.updateSuccess', '測試項目已更新')
      )
    } else {
      const nextRows = [...userLibraryRows.value, payload]
      saveLocalRowsBackup(nextRows)
      await persistRowsToSet(
        setId,
        nextRows,
        tx('testCaseWriter.messages.createSuccess', '測試項目已新增')
      )
    }

    dialogVisible.value = false
    await loadAllLibraryRows()
  } catch (err) {
    ElMessage.error(err?.message || tx('testCaseWriter.messages.saveFailed', '儲存失敗'))
  } finally {
    saving.value = false
  }
}

async function removeOne (row) {
  try {
    await ElMessageBox.confirm(
      tx('testCaseWriter.deleteConfirm', '確定刪除「{name}」？', { name: row?.testCase || row?.code || '#' }),
      tx('common.confirm', '確認'),
      { type: 'warning' }
    )
  } catch {
    return
  }

  saving.value = true
  try {
    const setId = Number(row?._sourceSetId || 0) || librarySetId.value
    const setDetail = await getSetDetailForEdit(setId)
    const nextRows = setDetail.items.filter(item =>
      !(
        (Number(row?.id || 0) > 0 && Number(item?.id || 0) === Number(row?.id || 0)) ||
        String(item?._key || '') === String(row?._key || '')
      )
    )

    if (setId === librarySetId.value) saveLocalRowsBackup(nextRows)

    await persistRowsToSet(
      setId,
      nextRows,
      tx('testCaseWriter.messages.deleteSuccess', '測試項目已刪除')
    )

    await loadAllLibraryRows()
  } catch (err) {
    ElMessage.error(err?.message || tx('testCaseWriter.messages.saveFailed', '儲存失敗'))
  } finally {
    saving.value = false
  }
}

async function removeSelected () {
  if (!selectedRows.value.length) return

  try {
    await ElMessageBox.confirm(
      tx('testCaseWriter.batchDeleteConfirm', '確定刪除已勾選的 {n} 筆資料？', { n: selectedRows.value.length }),
      tx('common.confirm', '確認'),
      { type: 'warning' }
    )
  } catch {
    return
  }

  saving.value = true
  try {
    const bySet = new Map()

    selectedRows.value.forEach((row) => {
      const setId = Number(row?._sourceSetId || 0) || librarySetId.value
      if (!setId) return
      if (!bySet.has(setId)) bySet.set(setId, [])
      bySet.get(setId).push(row)
    })

    for (const [setId, pickedRows] of bySet.entries()) {
      const setDetail = await getSetDetailForEdit(setId)
      const pickedKeys = new Set(pickedRows.map(r => String(r._key || '')))
      const pickedIds = new Set(pickedRows.map(r => Number(r.id || 0)).filter(Boolean))

      const nextRows = setDetail.items.filter(item => {
        const sameId = Number(item?.id || 0) > 0 && pickedIds.has(Number(item?.id || 0))
        const sameKey = pickedKeys.has(String(item?._key || ''))
        return !sameId && !sameKey
      })

      if (setId === librarySetId.value) saveLocalRowsBackup(nextRows)
      await persistRowsToSet(setId, nextRows)
    }

    ElMessage.success(tx('testCaseWriter.messages.batchDeleteSuccess', '已刪除所選資料'))
    await loadAllLibraryRows()
  } catch (err) {
    ElMessage.error(err?.message || tx('testCaseWriter.messages.saveFailed', '儲存失敗'))
  } finally {
    saving.value = false
  }
}

watch(() => form.code, () => {
  maybeApplyPresetFieldsSilently()
})

onMounted(async () => {
  await loadAllLibraryRows()
})
</script>

<style scoped>
.test-case-writer-page {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.header-bar {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  padding: 12px;
  border: 1px solid var(--el-border-color);
  border-radius: 14px;
  background: var(--el-fill-color-blank);
}

.header-bar .left,
.header-bar .right {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.header-bar .right {
  justify-content: flex-end;
  flex: 1;
}

.title {
  margin: 0;
  font-size: 20px;
}

.pill {
  border-radius: 999px;
}

.editable-pill {
  background: color-mix(in srgb, var(--el-color-primary) 8%, transparent);
}

.ctrl {
  border-radius: 10px;
}

.w-320 {
  width: 320px;
}

.tip-card,
.main-card {
  border-radius: 16px;
}

.toolbar-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
  flex-wrap: wrap;
}

.toolbar-left {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.muted {
  color: var(--el-text-color-secondary);
  font-size: 12px;
}

.main-table :deep(.el-table__header-wrapper th) {
  background: var(--el-fill-color-light);
}

.source-cell {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}

.testcase-cell {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.tc-name {
  font-weight: 600;
  line-height: 1.45;
}

.tc-sub {
  line-height: 1.2;
}

.field-col {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.field-count {
  font-size: 12px;
  font-weight: 700;
}

.field-preview {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  line-height: 1.35;
  display: -webkit-box;
  line-clamp: 2;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.img-col-cell {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.img-col-thumb {
  width: 52px;
  height: 52px;
  flex: 0 0 52px;
  border-radius: 10px;
  border: 1px solid var(--el-border-color);
  background: var(--el-fill-color-lighter);
}

.img-col-meta {
  min-width: 0;
  text-align: left;
}

.img-col-count {
  font-size: 12px;
  font-weight: 700;
  line-height: 1.3;
}

.img-col-note {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  line-height: 1.35;
  display: -webkit-box;
  line-clamp: 2;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.code-row {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 8px;
  width: 100%;
}

.ref-wrap {
  display: flex;
  flex-direction: column;
  gap: 10px;
  width: 100%;
}

.ref-toolbar {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.ref-counter {
  margin-left: auto;
}

.ref-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}

.ref-card {
  border: 1px solid var(--el-border-color);
  border-radius: 12px;
  background: var(--el-fill-color-blank);
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.ref-thumb {
  width: 100%;
  height: 120px;
  border-radius: 10px;
  border: 1px solid var(--el-border-color-lighter);
  background: var(--el-fill-color-lighter);
}

.ref-name {
  font-size: 12px;
  line-height: 1.35;
  color: var(--el-text-color-secondary);
  word-break: break-word;
}

.custom-fields-wrap {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.cf-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.cf-toolbar-left {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.cf-hint {
  border-radius: 12px;
}

.cf-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.cf-item {
  border: 1px solid var(--el-border-color);
  border-radius: 14px;
  background: var(--el-fill-color-blank);
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.cf-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.cf-index {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  font-weight: 700;
}

.cf-grid {
  display: grid;
  grid-template-columns: 1.5fr 1.2fr 1fr auto;
  gap: 10px;
  align-items: center;
}

.cf-subgrid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.picker-toolbar {
  display: flex;
  gap: 10px;
  margin-bottom: 14px;
  flex-wrap: wrap;
}

.picker-search {
  width: 320px;
  max-width: 100%;
}

.picker-body {
  min-height: 220px;
}

.picker-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
}

.picker-card {
  border: 1px solid var(--el-border-color);
  border-radius: 14px;
  background: var(--el-fill-color-blank);
  padding: 10px;
  cursor: pointer;
  transition: all 0.18s ease;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.picker-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.06);
}

.picker-card.active {
  border-color: var(--el-color-primary);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--el-color-primary) 18%, transparent);
}

.picker-card.disabled {
  opacity: 0.6;
}

.picker-thumb-wrap {
  width: 100%;
  aspect-ratio: 4 / 3;
  overflow: hidden;
  border-radius: 10px;
  border: 1px solid var(--el-border-color-lighter);
  background: var(--el-fill-color-lighter);
}

.picker-thumb {
  width: 100%;
  height: 100%;
}

.picker-name {
  font-size: 13px;
  font-weight: 600;
  line-height: 1.4;
  word-break: break-word;
}

.picker-sub {
  line-height: 1.35;
}

.picker-state {
  min-height: 24px;
}

@media (max-width: 1100px) {
  .cf-grid {
    grid-template-columns: 1fr 1fr;
  }

  .cf-subgrid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 980px) {
  .header-bar {
    flex-direction: column;
    align-items: stretch;
  }

  .header-bar .right {
    justify-content: flex-start;
  }

  .w-320,
  .picker-search {
    width: 100%;
  }

  .ref-grid,
  .picker-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .code-row {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 640px) {
  .ref-grid,
  .picker-grid,
  .cf-grid {
    grid-template-columns: 1fr;
  }
}
</style>