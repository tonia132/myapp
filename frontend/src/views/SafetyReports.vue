<template>
  <div class="page safety-reports-page-vivid" :class="{ 'is-dark': isDarkMode }">
    <section class="hero-card">
      <div class="hero-main">
        <div class="hero-left">
          <div class="hero-icon-wrap">
            <div class="hero-icon">📄</div>
          </div>

          <div class="hero-copy">
            <div class="hero-eyebrow">{{ text('safetyReports.eyebrow', 'Certification Progress Center') }}</div>
            <h2 class="hero-title">{{ text('safetyReports.title', '安規認證') }}</h2>
            <div class="hero-subtitle">
              {{ text('safetyReports.heroSubtitle', '集中追蹤各機種認證進度、附件、實驗室資訊與目前處理狀態') }}
            </div>
          </div>
        </div>

        <div class="hero-right">
          <el-input
            v-model="keyword"
            :placeholder="text('safetyReports.searchPlaceholder', '搜尋型號、主板、實驗室、備註...')"
            clearable
            class="ctrl w-search"
            @keyup.enter="fetchList"
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>

          <el-button type="primary" class="btn" :icon="Plus" @click="openCreateDialog">
            {{ text('safetyReports.actions.create', '新增') }}
          </el-button>

          <el-button plain class="btn" :icon="Refresh" :loading="loading" @click="fetchList">
            {{ text('common.refresh', '重新整理') }}
          </el-button>
        </div>
      </div>

      <div class="stat-grid">
        <div class="stat-card total">
          <div class="stat-label">{{ text('safetyReports.summary.total', '總數') }}</div>
          <div class="stat-value">{{ summary.total }}</div>
        </div>

        <div class="stat-card active">
          <div class="stat-label">{{ text('safetyReports.summary.inProgress', '進行中') }}</div>
          <div class="stat-value">{{ summary.inProgress }}</div>
        </div>

        <div class="stat-card paused">
          <div class="stat-label">{{ text('safetyReports.summary.paused', '暫停') }}</div>
          <div class="stat-value">{{ summary.paused }}</div>
        </div>

        <div class="stat-card completed">
          <div class="stat-label">{{ text('safetyReports.summary.completed', '已完成') }}</div>
          <div class="stat-value">{{ summary.completed }}</div>
        </div>

        <div class="stat-card file">
          <div class="stat-label">{{ text('safetyReports.summary.withFile', '已綁定附件') }}</div>
          <div class="stat-value">{{ summary.withFile }}</div>
        </div>

        <div class="stat-card file-missing">
          <div class="stat-label">{{ text('safetyReports.summary.noFile', '未綁定附件') }}</div>
          <div class="stat-value">{{ summary.noFile }}</div>
        </div>
      </div>
    </section>

    <div v-loading="loading" class="group-list">
      <template v-if="groupedRows.length">
        <section
          v-for="group in groupedRows"
          :key="group.key"
          class="group-card"
        >
          <div class="group-head">
            <div class="group-head-left">
              <div class="group-name">{{ group.label }}</div>
              <el-tag type="info" effect="plain" round>
                {{ text('safetyReports.groupCount', '{count} 筆', { count: group.items.length }) }}
              </el-tag>
            </div>

            <div class="group-head-right">
              <span class="group-meta">
                {{ text('safetyReports.summary.withFile', '已綁定附件') }}
                {{ group.items.filter((x) => hasLinkedFile(x)).length }}
              </span>
              <span class="group-meta">
                {{ text('safetyReports.summary.completed', '已完成') }}
                {{ group.items.filter((x) => normalizeStatus(x.status) === 'completed').length }}
              </span>
            </div>
          </div>

          <el-table
            v-if="!isMobile"
            :data="buildDisplayRows(group.items)"
            border
            size="small"
            class="group-table"
            row-key="__rowKey"
            :span-method="tableSpanMethod"
            :row-class-name="tableRowClassName"
          >
            <el-table-column :label="text('common.actions', '操作')" width="160" fixed="left">
              <template #default="{ row }">
                <template v-if="row.__kind === 'main'">
                  <div class="op-col">
                    <el-button link type="primary" @click="goToFileCenter(row)">
                      {{ text('common.view', '檢視') }}
                    </el-button>
                    <el-button link type="success" @click="openEditDialog(row)">
                      {{ text('common.edit', '編輯') }}
                    </el-button>
                    <el-button link type="danger" @click="removeRow(row)">
                      {{ text('common.delete', '刪除') }}
                    </el-button>
                  </div>
                </template>

                <template v-else>
                  <div class="timeline-card">
                    <div class="timeline-card-top">
                      <div class="timeline-title-row">
                        <span class="timeline-title">{{ text('safetyReports.timelineTitle', '認證進度') }}</span>
                        <el-tag
                          size="small"
                          effect="plain"
                          round
                          :type="statusTagType(row.status)"
                        >
                          {{ statusLabel(row.status) }}
                        </el-tag>
                        <el-tag
                          size="small"
                          effect="light"
                          round
                          :type="hasLinkedFile(row) ? 'success' : 'info'"
                        >
                          {{
                            hasLinkedFile(row)
                              ? text('safetyReports.file.linked', '已綁定附件')
                              : text('safetyReports.file.unlinked', '未綁定附件')
                          }}
                        </el-tag>
                        <el-tag
                          v-if="attachmentCount(row)"
                          size="small"
                          effect="light"
                          round
                          type="primary"
                        >
                          {{ attachmentCount(row) }} {{ text('safetyReports.file.filesUnit', '個附件') }}
                        </el-tag>
                      </div>

                      <div class="timeline-step-text">
                        {{ text('safetyReports.timelineStep', 'Step {current} / {total}', {
                          current: certStepIndex(row) + 1,
                          total: CERT_FLOW_STEPS.length
                        }) }}
                      </div>
                    </div>

                    <div class="timeline-bar">
                      <div
                        class="timeline-fill"
                        :style="{ width: `${certProgressPercent(row)}%` }"
                      />
                      <div
                        class="timeline-thumb"
                        :style="{ left: `calc(${certProgressPercent(row)}% - 10px)` }"
                      />
                    </div>

                    <div class="timeline-foot">
                      <span>{{ text('safetyReports.timelineStart', '開始') }}</span>
                      <strong>{{ statusLabel(row.status) }}</strong>
                      <span>{{ text('safetyReports.timelineEnd', '完成') }}</span>
                    </div>
                  </div>
                </template>
              </template>
            </el-table-column>

            <el-table-column :label="text('safetyReports.columns.modelName', 'Model Name')" min-width="210">
              <template #default="{ row }">
                <div v-if="row.__kind === 'main'" class="cell-strong">
                  {{ row.modelName || '—' }}
                  <div class="cell-sub" :class="{ empty: !attachmentCount(row) }">
                    {{
                      attachmentCount(row)
                        ? text('safetyReports.attachmentsBound', '已綁定 {count} 個附件', { count: attachmentCount(row) })
                        : text('safetyReports.attachmentsEmpty', '未綁定附件')
                    }}
                  </div>
                </div>
              </template>
            </el-table-column>

            <el-table-column :label="text('safetyReports.columns.modelCode', 'Model Code')" min-width="160">
              <template #default="{ row }">
                <span v-if="row.__kind === 'main'">{{ row.modelCode || '—' }}</span>
              </template>
            </el-table-column>

            <el-table-column :label="text('safetyReports.columns.certType', 'Cert Type')" min-width="150">
              <template #default="{ row }">
                <span v-if="row.__kind === 'main'">{{ row.certType || '—' }}</span>
              </template>
            </el-table-column>

            <el-table-column :label="text('safetyReports.columns.standard', 'Standard')" min-width="240">
              <template #default="{ row }">
                <span v-if="row.__kind === 'main'" class="cell-wrap">{{ row.standard || '—' }}</span>
              </template>
            </el-table-column>

            <el-table-column :label="text('safetyReports.columns.lab', 'Lab')" min-width="150">
              <template #default="{ row }">
                <span v-if="row.__kind === 'main'">{{ row.lab || '—' }}</span>
              </template>
            </el-table-column>

            <el-table-column :label="text('safetyReports.columns.issueDate', 'Issue Date')" min-width="120">
              <template #default="{ row }">
                <span v-if="row.__kind === 'main'">{{ formatDate(row.issueDate) || '—' }}</span>
              </template>
            </el-table-column>

            <el-table-column :label="text('safetyReports.columns.status', 'Status')" min-width="180">
              <template #default="{ row }">
                <el-tag
                  v-if="row.__kind === 'main'"
                  size="small"
                  effect="light"
                  round
                  :type="statusTagType(row.status)"
                >
                  {{ statusLabel(row.status) }}
                </el-tag>
              </template>
            </el-table-column>

            <el-table-column :label="text('safetyReports.columns.remark', 'Remark')" min-width="260">
              <template #default="{ row }">
                <span v-if="row.__kind === 'main'" class="cell-wrap">{{ row.remark || '—' }}</span>
              </template>
            </el-table-column>
          </el-table>

          <div v-else class="mobile-list">
            <article
              v-for="row in group.items"
              :key="row.id"
              class="report-card"
            >
              <div class="report-top">
                <div class="report-main">
                  <div class="report-title">{{ row.modelName || '—' }}</div>
                  <div class="report-sub">{{ row.modelCode || '—' }} · {{ row.certType || '—' }}</div>
                </div>

                <el-tag
                  size="small"
                  effect="plain"
                  round
                  :type="statusTagType(row.status)"
                  class="pill mini"
                >
                  {{ statusLabel(row.status) }}
                </el-tag>
              </div>

              <div class="meta-grid">
                <div class="meta-box">
                  <div class="meta-label">{{ text('safetyReports.columns.standard', 'Standard') }}</div>
                  <div class="meta-value">{{ row.standard || '—' }}</div>
                </div>

                <div class="meta-box">
                  <div class="meta-label">{{ text('safetyReports.columns.lab', 'Lab') }}</div>
                  <div class="meta-value">{{ row.lab || '—' }}</div>
                </div>

                <div class="meta-box">
                  <div class="meta-label">{{ text('safetyReports.columns.issueDate', 'Issue Date') }}</div>
                  <div class="meta-value">{{ formatDate(row.issueDate) || '—' }}</div>
                </div>

                <div class="meta-box">
                  <div class="meta-label">{{ text('safetyReports.columns.remark', 'Remark') }}</div>
                  <div class="meta-value">{{ row.remark || '—' }}</div>
                </div>
              </div>

              <div class="timeline-card mobile">
                <div class="timeline-card-top">
                  <div class="timeline-title-row">
                    <span class="timeline-title">{{ text('safetyReports.timelineTitle', '認證進度') }}</span>
                    <el-tag size="small" effect="light" round :type="hasLinkedFile(row) ? 'success' : 'info'">
                      {{
                        hasLinkedFile(row)
                          ? text('safetyReports.file.linked', '已綁定附件')
                          : text('safetyReports.file.unlinked', '未綁定附件')
                      }}
                    </el-tag>
                  </div>

                  <div class="timeline-step-text">
                    {{ text('safetyReports.timelineStep', 'Step {current} / {total}', {
                      current: certStepIndex(row) + 1,
                      total: CERT_FLOW_STEPS.length
                    }) }}
                  </div>
                </div>

                <div class="timeline-bar">
                  <div class="timeline-fill" :style="{ width: `${certProgressPercent(row)}%` }" />
                  <div class="timeline-thumb" :style="{ left: `calc(${certProgressPercent(row)}% - 10px)` }" />
                </div>

                <div class="timeline-foot">
                  <span>{{ text('safetyReports.timelineStart', '開始') }}</span>
                  <strong>{{ statusLabel(row.status) }}</strong>
                  <span>{{ attachmentCount(row) }} {{ text('safetyReports.file.filesUnit', '個附件') }}</span>
                </div>
              </div>

              <div class="card-actions">
                <el-button type="primary" plain @click="goToFileCenter(row)">
                  {{ text('common.view', '檢視') }}
                </el-button>
                <el-button type="success" plain @click="openEditDialog(row)">
                  {{ text('common.edit', '編輯') }}
                </el-button>
                <el-button type="danger" plain @click="removeRow(row)">
                  {{ text('common.delete', '刪除') }}
                </el-button>
              </div>
            </article>
          </div>
        </section>
      </template>

      <div v-else class="empty-wrap">
        <el-empty :description="text('common.noData', '目前沒有資料')" />
      </div>
    </div>

    <el-dialog
      v-model="editVisible"
      :title="isEdit ? text('safetyReports.dialog.editTitle', '編輯認證資料') : text('safetyReports.dialog.createTitle', '新增認證資料')"
      :width="isMobile ? '100%' : '1040px'"
      :fullscreen="isMobile"
      destroy-on-close
      class="safety-edit-dialog"
      :teleported="false"
    >
      <div class="dialog-hero">
        <div class="dialog-main">
          <div class="dialog-title">
            {{ isEdit ? text('safetyReports.dialogEditHeroTitle', '更新認證資料') : text('safetyReports.dialogCreateHeroTitle', '建立新的認證項目') }}
          </div>
          <div class="dialog-subtitle">
            {{ text('safetyReports.dialogHeroSubtitle', '可維護基本資料、目前進度、備註與綁定的附件檔案') }}
          </div>
        </div>

        <div class="dialog-preview">
          <div class="preview-label">{{ text('safetyReports.preview', '預覽') }}</div>
          <div class="preview-value">{{ form.modelName || '—' }}</div>
          <div class="preview-sub">{{ statusLabel(form.status) }}</div>
        </div>
      </div>

      <div class="dialog-section-title">{{ text('safetyReports.sections.basicInfo', '基本資料') }}</div>

      <el-form
        ref="formRef"
        :model="form"
        :rules="rules"
        label-width="130px"
        class="edit-form"
        :label-position="isMobile ? 'top' : 'right'"
      >
        <div class="form-grid">
          <el-form-item :label="text('safetyReports.fields.groupName', '群組名稱')" prop="groupName">
            <el-input
              v-model="form.groupName"
              :placeholder="text('safetyReports.placeholders.groupName', '請輸入群組名稱')"
            />
          </el-form-item>

          <el-form-item :label="text('safetyReports.fields.modelName', '型號名稱')" prop="modelName">
            <el-input
              v-model="form.modelName"
              :placeholder="text('safetyReports.placeholders.modelName', '請輸入型號名稱')"
            />
          </el-form-item>

          <el-form-item :label="text('safetyReports.fields.modelCode', '型號代碼')" prop="modelCode">
            <el-input
              v-model="form.modelCode"
              :placeholder="text('safetyReports.placeholders.modelCode', '請輸入型號代碼')"
            />
          </el-form-item>

          <el-form-item :label="text('safetyReports.fields.certType', '認證類型')" prop="certType">
            <el-input
              v-model="form.certType"
              :placeholder="text('safetyReports.placeholders.certType', '請輸入認證類型')"
            />
          </el-form-item>

          <el-form-item :label="text('safetyReports.fields.standard', '認證標準')" prop="standard">
            <el-input
              v-model="form.standard"
              :placeholder="text('safetyReports.placeholders.standard', '請輸入標準')"
            />
          </el-form-item>

          <el-form-item :label="text('safetyReports.fields.lab', '實驗室')" prop="lab">
            <el-input
              v-model="form.lab"
              :placeholder="text('safetyReports.placeholders.lab', '請輸入實驗室')"
            />
          </el-form-item>

          <el-form-item :label="text('safetyReports.fields.issueDate', '日期')" prop="issueDate">
            <el-date-picker
              v-model="form.issueDate"
              type="date"
              value-format="YYYY-MM-DD"
              format="YYYY-MM-DD"
              :placeholder="text('safetyReports.placeholders.issueDate', '請選擇日期')"
              style="width: 100%"
            />
          </el-form-item>

          <el-form-item :label="text('safetyReports.fields.status', '狀態')" prop="status">
            <el-select
              v-model="form.status"
              :placeholder="text('safetyReports.placeholders.status', '請選擇狀態')"
              style="width: 100%"
            >
              <el-option-group :label="text('safetyReports.statusGroup.inProgress', '進行中')">
                <el-option
                  v-for="opt in CERT_FLOW_STEPS"
                  :key="opt.value"
                  :label="text(opt.labelKey, opt.value)"
                  :value="opt.value"
                />
              </el-option-group>

              <el-option-group :label="text('safetyReports.statusGroup.others', '其他')">
                <el-option
                  :label="text('safetyReports.statusOptions.paused', '暫停')"
                  value="paused"
                />
                <el-option
                  :label="text('safetyReports.statusOptions.completed', '已完成')"
                  value="completed"
                />
              </el-option-group>
            </el-select>
          </el-form-item>

          <el-form-item :label="text('safetyReports.fields.remark', '備註')" class="span-2">
            <el-input
              v-model="form.remark"
              type="textarea"
              :rows="4"
              :placeholder="text('safetyReports.placeholders.remark', '請輸入備註')"
            />
          </el-form-item>
        </div>

        <div class="dialog-section-title with-space">{{ text('safetyReports.sections.fileInfo', '附件資訊') }}</div>

        <el-form-item :label="text('safetyReports.fields.filePath', '附件路徑')" class="span-2">
          <div class="file-picker-box">
            <input
              ref="fileInputRef"
              type="file"
              multiple
              class="hidden-file-input"
              @change="handleLocalFileChange"
            />

            <div class="file-picker-top">
              <div class="file-picked-info">
                <div class="file-picked-label">
                  {{ text('safetyReports.file.currentFiles', '目前附件') }}
                </div>

                <div class="file-picked-name">
                  {{
                    form.files.length
                      ? text('safetyReports.file.selectedCount', '已選取 {count} 個檔案', { count: form.files.length })
                      : text('safetyReports.file.noFile', '尚未選取附件')
                  }}
                </div>

                <div class="file-picked-path">
                  {{ text('safetyReports.file.pickerHint', '可上傳多個檔案，也可從檔案中心多選加入') }}
                </div>
              </div>

              <div class="file-picker-actions">
                <el-button
                  type="primary"
                  plain
                  class="btn"
                  :icon="Upload"
                  :loading="uploadingFile"
                  @click="triggerLocalUpload"
                >
                  {{ text('safetyReports.file.uploadMulti', '上傳檔案') }}
                </el-button>

                <el-button plain class="btn" :icon="FolderOpened" @click="openFileCenterDialog">
                  {{ text('safetyReports.file.pickMultipleFromCenter', '從檔案中心選取') }}
                </el-button>

                <el-button
                  v-if="form.files.length"
                  type="danger"
                  plain
                  class="btn"
                  @click="clearSelectedFile"
                >
                  {{ text('safetyReports.file.clearAll', '清空全部') }}
                </el-button>
              </div>
            </div>

            <div v-if="form.files.length" class="picked-file-list">
              <div
                v-for="(file, idx) in form.files"
                :key="file.id || file.path || `${file.name}-${idx}`"
                class="picked-file-item"
              >
                <div class="picked-file-head">
                  <div class="picked-file-title-wrap">
                    <div class="picked-file-index">#{{ idx + 1 }}</div>
                    <div class="picked-file-name-main">
                      {{ file.name || guessFileName(file.path) || `附件 ${idx + 1}` }}
                    </div>
                  </div>

                  <div class="picked-file-actions">
                    <el-button
                      v-if="file.path"
                      link
                      type="primary"
                      @click="openFile(file.path)"
                    >
                      {{ text('safetyReports.file.open', '開啟') }}
                    </el-button>

                    <el-button
                      link
                      type="danger"
                      @click="removeSelectedFileAt(idx)"
                    >
                      {{ text('safetyReports.file.remove', '移除') }}
                    </el-button>
                  </div>
                </div>

                <div v-if="file.path" class="picked-file-path">
                  {{ file.path }}
                </div>
              </div>
            </div>

            <div v-else class="picked-file-empty">
              {{ text('safetyReports.file.empty', '尚未選取任何附件') }}
            </div>

            <el-input
              :model-value="form.files.map((x) => x.path).filter(Boolean).join('\n')"
              type="textarea"
              :rows="3"
              readonly
              :placeholder="text('safetyReports.placeholders.filePath', '附件路徑')"
            />
          </div>
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button class="btn" @click="editVisible = false">
          {{ text('common.cancel', '取消') }}
        </el-button>
        <el-button type="primary" class="btn" :loading="saving" @click="saveForm">
          {{ isEdit ? text('common.save', '儲存') : text('common.add', '新增') }}
        </el-button>
      </template>
    </el-dialog>

    <el-dialog
      v-model="fileCenterVisible"
      :title="text('safetyReports.file.dialogTitle', '選擇附件')"
      :width="isMobile ? '100%' : '1040px'"
      :fullscreen="isMobile"
      destroy-on-close
      class="safety-file-center-dialog"
      :teleported="false"
    >
      <div class="file-center-toolbar">
        <el-input
          v-model="fileKeyword"
          :placeholder="text('safetyReports.file.searchPlaceholder', '搜尋檔名')"
          clearable
          class="file-center-search"
          @keyup.enter="fetchFileCenterList"
        >
          <template #prefix>
            <el-icon><Search /></el-icon>
          </template>
        </el-input>

        <div class="file-center-selected-count">
          {{ text('safetyReports.file.selectedRows', '已勾選 {count} 筆', { count: fileSelectedRows.length }) }}
        </div>

        <el-button plain class="btn" :icon="Refresh" :loading="fileLoading" @click="fetchFileCenterList">
          {{ text('common.refresh', '重新整理') }}
        </el-button>
      </div>

      <el-table
        ref="fileTableRef"
        v-loading="fileLoading"
        :data="fileRows"
        size="small"
        border
        class="file-center-table"
        :empty-text="text('safetyReports.file.emptyCenter', '目前沒有可選檔案')"
        @selection-change="handleFileCenterSelectionChange"
      >
        <el-table-column type="selection" width="48" />

        <el-table-column :label="text('safetyReports.file.columns.name', '檔名')" min-width="360">
          <template #default="{ row }">
            <div class="fc-name">{{ row.name || '—' }}</div>
          </template>
        </el-table-column>

        <el-table-column :label="text('safetyReports.file.columns.category', '分類')" min-width="120">
          <template #default="{ row }">
            <el-tag size="small" effect="plain">{{ row.category || '—' }}</el-tag>
          </template>
        </el-table-column>

        <el-table-column :label="text('safetyReports.file.columns.createdAt', '建立時間')" min-width="150">
          <template #default="{ row }">
            <span>{{ formatDate(row.createdAt) || '—' }}</span>
          </template>
        </el-table-column>

        <el-table-column :label="text('safetyReports.file.columns.uploader', '上傳者')" min-width="140">
          <template #default="{ row }">
            <span>{{ row.uploader || '—' }}</span>
          </template>
        </el-table-column>

        <el-table-column :label="text('common.actions', '操作')" width="100" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link @click="chooseFileFromCenter(row)">
              {{ text('safetyReports.file.add', '加入') }}
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <template #footer>
        <el-button class="btn" @click="fileCenterVisible = false">
          {{ text('common.close', '關閉') }}
        </el-button>

        <el-button
          type="primary"
          class="btn"
          :disabled="!fileSelectedRows.length"
          @click="confirmChooseFilesFromCenter"
        >
          {{ text('safetyReports.file.addSelected', '加入勾選檔案') }}
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, nextTick, onMounted, onBeforeUnmount, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import axios from 'axios'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Refresh, Search, FolderOpened, Upload } from '@element-plus/icons-vue'
import { useI18n } from 'vue-i18n'

const { t, te } = useI18n()
const router = useRouter()

function text (key, fallback, params) {
  if (te(key)) return t(key, params)
  if (!params) return fallback
  return String(fallback).replace(/\{(\w+)\}/g, (_, k) => String(params?.[k] ?? ''))
}

const isDarkMode = ref(false)
let themeObserver = null

function detectDarkMode () {
  const html = document.documentElement
  const body = document.body

  isDarkMode.value =
    html.classList.contains('dark') ||
    body.classList.contains('dark') ||
    html.classList.contains('theme-dark') ||
    body.classList.contains('theme-dark') ||
    html.classList.contains('dark-mode') ||
    body.classList.contains('dark-mode') ||
    html.getAttribute('data-theme') === 'dark' ||
    body.getAttribute('data-theme') === 'dark' ||
    html.getAttribute('data-bs-theme') === 'dark' ||
    body.getAttribute('data-bs-theme') === 'dark' ||
    !!document.querySelector('[data-theme="dark"], [data-bs-theme="dark"], .theme-dark, .dark-mode')
}

/* RWD */
const isMobile = ref(false)
let mql = null
let cleanupMql = null
function setupMql () {
  mql = window.matchMedia('(max-width: 768px)')
  const apply = () => { isMobile.value = !!mql.matches }
  apply()
  try { mql.addEventListener('change', apply) } catch { mql.addListener(apply) }
  return () => {
    try { mql.removeEventListener('change', apply) } catch { mql.removeListener(apply) }
  }
}

const API_BASE = '/api/safety-reports'
const FILES_API = '/api/files'
const FILES_UPLOAD_API = '/api/files/upload-one'
const FILE_CENTER_ROUTE = '/files'
const TABLE_COL_COUNT = 9

const CERT_FLOW_STEPS = [
  { value: 'spec_communication', labelKey: 'safetyReports.statusOptions.spec_communication' },
  { value: 'lab_quotation', labelKey: 'safetyReports.statusOptions.lab_quotation' },
  { value: 'quotation_approval', labelKey: 'safetyReports.statusOptions.quotation_approval' },
  { value: 'docs_to_lab', labelKey: 'safetyReports.statusOptions.docs_to_lab' },
  { value: 'purchase_request', labelKey: 'safetyReports.statusOptions.purchase_request' },
  { value: 'pickup_and_install_os', labelKey: 'safetyReports.statusOptions.pickup_and_install_os' },
  { value: 'send_to_lab', labelKey: 'safetyReports.statusOptions.send_to_lab' },
  { value: 'lab_testing', labelKey: 'safetyReports.statusOptions.lab_testing' },
  { value: 'draft_report_review', labelKey: 'safetyReports.statusOptions.draft_report_review' },
  { value: 'machine_returned', labelKey: 'safetyReports.statusOptions.machine_returned' },
  { value: 'final_report_uploaded', labelKey: 'safetyReports.statusOptions.final_report_uploaded' },
  { value: 'waiting_invoice', labelKey: 'safetyReports.statusOptions.waiting_invoice' },
  { value: 'reimbursement', labelKey: 'safetyReports.statusOptions.reimbursement' }
]

const CERT_FLOW_VALUE_SET = new Set(CERT_FLOW_STEPS.map((x) => x.value))

const loading = ref(false)
const saving = ref(false)
const keyword = ref('')
const rows = ref([])

const editVisible = ref(false)
const isEdit = ref(false)
const formRef = ref()

const fileInputRef = ref(null)
const fileTableRef = ref(null)
const fileCenterVisible = ref(false)
const fileLoading = ref(false)
const uploadingFile = ref(false)
const fileKeyword = ref('')
const fileRows = ref([])
const fileSelectedRows = ref([])

const form = reactive({
  id: null,
  groupName: '',
  modelName: '',
  modelCode: '',
  certType: '',
  standard: '',
  lab: '',
  issueDate: '',
  status: 'spec_communication',
  remark: '',
  filePath: '',
  fileId: null,
  fileName: '',
  files: []
})

const rules = computed(() => ({
  groupName: [{ required: true, message: text('safetyReports.validation.groupName', '請輸入群組名稱'), trigger: 'blur' }],
  modelName: [{ required: true, message: text('safetyReports.validation.modelName', '請輸入型號名稱'), trigger: 'blur' }],
  modelCode: [{ required: true, message: text('safetyReports.validation.modelCode', '請輸入型號代碼'), trigger: 'blur' }],
  certType: [{ required: true, message: text('safetyReports.validation.certType', '請輸入認證類型'), trigger: 'blur' }],
  issueDate: [{ required: true, message: text('safetyReports.validation.issueDate', '請選擇日期'), trigger: 'change' }],
  status: [{ required: true, message: text('safetyReports.validation.status', '請選擇狀態'), trigger: 'change' }]
}))

const summary = computed(() => {
  let completed = 0
  let paused = 0
  let inProgress = 0
  let withFile = 0

  for (const row of flatRows.value) {
    const s = normalizeStatus(row.status)
    if (s === 'completed') completed++
    else if (s === 'paused') paused++
    else inProgress++

    if (hasLinkedFile(row)) withFile++
  }

  return {
    total: flatRows.value.length,
    completed,
    paused,
    inProgress,
    withFile,
    noFile: Math.max(flatRows.value.length - withFile, 0)
  }
})

function todayStr () {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function toNumericId (v) {
  const n = Number(v)
  return Number.isFinite(n) && n > 0 ? n : null
}

function resetForm () {
  form.id = null
  form.groupName = ''
  form.modelName = ''
  form.modelCode = ''
  form.certType = ''
  form.standard = ''
  form.lab = ''
  form.issueDate = todayStr()
  form.status = 'spec_communication'
  form.remark = ''
  form.filePath = ''
  form.fileId = null
  form.fileName = ''
  form.files = []
}

function getAuthHeaders () {
  const token =
    localStorage.getItem('token') ||
    localStorage.getItem('accessToken') ||
    localStorage.getItem('jwt') ||
    ''

  return token ? { Authorization: `Bearer ${token}` } : {}
}

async function apiRequest (method, url, data, extra = {}) {
  return axios({
    method,
    url,
    data,
    headers: {
      ...getAuthHeaders(),
      ...(extra.headers || {})
    },
    ...extra
  })
}

function extractList (payload) {
  if (Array.isArray(payload)) return payload
  if (Array.isArray(payload?.items)) return payload.items
  if (Array.isArray(payload?.rows)) return payload.rows
  if (Array.isArray(payload?.data)) return payload.data
  if (Array.isArray(payload?.list)) return payload.list
  return []
}

function resolveFileUrl (path) {
  const raw = String(path ?? '').trim()
  if (!raw) return ''
  if (/^https?:\/\//i.test(raw)) return raw
  if (raw.startsWith('/')) return raw
  if (raw.startsWith('files/')) return `/api/${raw}`
  return raw
}

function extractFileIdFromPath (path) {
  const raw = String(path ?? '').trim()
  if (!raw) return null
  const m = raw.match(/\/files\/(\d+)\/download/i) || raw.match(/^files\/(\d+)\/download/i)
  if (!m) return null
  const id = Number(m[1])
  return Number.isFinite(id) ? id : null
}

function guessFileName (path) {
  const raw = String(path ?? '').trim()
  if (!raw) return ''
  const cleanPath = raw.split('?')[0]
  const seg = cleanPath.split('/').filter(Boolean)
  return seg[seg.length - 1] || raw
}

function normalizeFileEntry (raw, idx = 0) {
  if (!raw) return null

  if (typeof raw === 'string') {
    const path = raw
    const id = extractFileIdFromPath(path)
    return {
      id,
      name: guessFileName(path) || `file-${idx + 1}`,
      category: '',
      path,
      isFolder: false,
      createdAt: '',
      uploader: ''
    }
  }

  const rawPath =
    raw?.downloadUrl ??
    raw?.url ??
    raw?.previewUrl ??
    raw?.downloadPath ??
    raw?.path ??
    raw?.filePath ??
    raw?.file_path ??
    raw?.fileUrl ??
    raw?.file_url ??
    ''

  const rawId =
    raw?.id ??
    raw?._id ??
    raw?.fileId ??
    raw?.file_id ??
    extractFileIdFromPath(rawPath)

  const id = toNumericId(rawId)
  const path = rawPath || (id ? `/api/files/${id}/download` : '')

  const name =
    raw?.displayName ??
    raw?.originalName ??
    raw?.name ??
    raw?.filename ??
    raw?.fileName ??
    raw?.storedName ??
    guessFileName(path) ??
    `file-${idx + 1}`

  return {
    id,
    name,
    category: raw?.category ?? raw?.type ?? '',
    path,
    isFolder: !!raw?.isFolder,
    createdAt: raw?.createdAt ?? raw?.created_at ?? '',
    uploader:
      raw?.uploader?.name ??
      raw?.uploader?.username ??
      raw?.uploaderName ??
      raw?.username ??
      raw?.user?.name ??
      ''
  }
}

function dedupeFiles (list = []) {
  const map = new Map()
  let anon = 0

  for (const item of list) {
    if (!item) continue
    const normalized = normalizeFileEntry(item, anon)
    if (!normalized) continue

    const key =
      normalized.id != null
        ? `id:${normalized.id}`
        : normalized.path
          ? `path:${normalized.path}`
          : normalized.name
            ? `name:${normalized.name}`
            : `anon:${anon++}`

    if (!map.has(key)) {
      map.set(key, normalized)
    }
  }

  return Array.from(map.values())
}

function normalizeFileList (source = {}) {
  const collected = []

  if (Array.isArray(source?.files)) collected.push(...source.files)
  if (Array.isArray(source?.fileList)) collected.push(...source.fileList)
  if (Array.isArray(source?.attachments)) collected.push(...source.attachments)

  const filePaths = source?.filePaths ?? source?.file_paths
  if (Array.isArray(filePaths)) {
    collected.push(...filePaths.map((path) => ({ path })))
  }

  const fileIds = source?.fileIds ?? source?.file_ids
  if (Array.isArray(fileIds)) {
    collected.push(...fileIds.map((id) => ({ id })))
  }

  const singlePath =
    source?.filePath ??
    source?.file_path ??
    source?.fileUrl ??
    source?.file_url ??
    ''

  const singleId =
    source?.fileId ??
    source?.file_id ??
    null

  if (singlePath || singleId) {
    collected.push({
      id: singleId,
      path: singlePath,
      name:
        source?.fileName ??
        source?.originalName ??
        source?.filename ??
        ''
    })
  }

  return dedupeFiles(collected)
}

function getRowFiles (row) {
  if (Array.isArray(row?.files) && row.files.length) {
    return dedupeFiles(row.files)
  }
  return normalizeFileList(row)
}

function attachmentCount (row) {
  return getRowFiles(row).length
}

function hasLinkedFile (row) {
  return attachmentCount(row) > 0
}

function normalizeFileRow (row, idx = 0) {
  return normalizeFileEntry(row, idx)
}

function normalizeIncomingRow (row, idx = 0) {
  const files = normalizeFileList(row)
  const first = files[0] || null

  return {
    id: row?.id ?? row?._id ?? `row-${idx}`,
    groupName: row?.groupName ?? row?.modelFamily ?? row?.group_name ?? row?.productName ?? row?.product_name ?? '',
    modelFamily: row?.modelFamily ?? row?.groupName ?? '',
    modelName: row?.modelName ?? row?.model_name ?? '',
    modelCode: row?.modelCode ?? row?.model_code ?? '',
    certType: row?.certType ?? row?.cert_type ?? '',
    standard: row?.standard ?? row?.regulation ?? '',
    lab: row?.lab ?? row?.lab_name ?? '',
    issueDate: row?.issueDate ?? row?.issue_date ?? row?.openDate ?? row?.open_date ?? '',
    status: row?.status ?? 'spec_communication',
    remark: row?.remark ?? row?.notes ?? '',
    files,
    filePaths: files.map((x) => x.path).filter(Boolean),
    fileIds: files.map((x) => x.id).filter(Boolean),
    filePath: first?.path ?? '',
    fileId: first?.id ?? null,
    fileName: first?.name ?? ''
  }
}

async function fetchList () {
  loading.value = true
  try {
    const res = await apiRequest('get', API_BASE)
    rows.value = extractList(res?.data).map(normalizeIncomingRow)
  } catch (err) {
    console.error(err)
    ElMessage.error(text('safetyReports.messages.loadFailed', '載入資料失敗'))
  } finally {
    loading.value = false
  }
}

function normalizeStatus (v) {
  const s = String(v ?? '').trim()
  if (s === 'completed' || s === 'paused') return s
  if (CERT_FLOW_VALUE_SET.has(s)) return s
  if (s === 'ongoing') return 'spec_communication'
  return 'spec_communication'
}

function statusLabel (v) {
  const s = normalizeStatus(v)
  if (s === 'completed') return text('safetyReports.statusOptions.completed', '已完成')
  if (s === 'paused') return text('safetyReports.statusOptions.paused', '暫停')
  const found = CERT_FLOW_STEPS.find((x) => x.value === s)
  return found ? text(found.labelKey, found.value) : text('safetyReports.statusOptions.spec_communication', '需求溝通')
}

function statusTagType (v) {
  const s = normalizeStatus(v)
  if (s === 'completed') return 'success'
  if (s === 'paused') return 'warning'
  return 'primary'
}

function certStepIndex (row) {
  const s = normalizeStatus(row?.status)
  const idx = CERT_FLOW_STEPS.findIndex((x) => x.value === s)
  return idx >= 0 ? idx : 0
}

function certProgressPercent (row) {
  const s = normalizeStatus(row?.status)
  if (s === 'completed') return 100
  const idx = certStepIndex(row)
  return ((idx + 1) / CERT_FLOW_STEPS.length) * 100
}

function formatDate (v) {
  if (!v) return ''
  if (typeof v === 'string') return v.slice(0, 10)
  const d = new Date(v)
  if (Number.isNaN(d.getTime())) return ''
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function deriveGroupLabel (row) {
  return (
    row?.groupName ||
    row?.modelFamily ||
    row?.productName ||
    row?.seriesName ||
    row?.brand ||
    row?.modelName ||
    text('safetyReports.ungrouped', '未分組')
  )
}

const flatRows = computed(() => {
  const q = keyword.value.trim().toLowerCase()
  if (!q) return rows.value

  return rows.value.filter((row) => {
    const allText = [
      row.groupName,
      row.modelFamily,
      row.modelName,
      row.modelCode,
      row.certType,
      row.standard,
      row.lab,
      row.remark,
      statusLabel(row.status),
      ...(getRowFiles(row).map((x) => x.name || x.path || ''))
    ]
      .join(' ')
      .toLowerCase()

    return allText.includes(q)
  })
})

const groupedRows = computed(() => {
  const map = new Map()

  for (const row of flatRows.value) {
    const key = deriveGroupLabel(row)
    if (!map.has(key)) {
      map.set(key, {
        key,
        label: key,
        items: []
      })
    }
    map.get(key).items.push(row)
  }

  const groups = Array.from(map.values())

  for (const g of groups) {
    g.items.sort((a, b) => String(b.issueDate || '').localeCompare(String(a.issueDate || '')))
  }

  groups.sort((a, b) => a.label.localeCompare(b.label))
  return groups
})

function buildDisplayRows (items = []) {
  return items.flatMap((item, index) => [
    {
      ...item,
      __kind: 'main',
      __rowKey: `main-${item.id ?? index}`
    },
    {
      ...item,
      __kind: 'timeline',
      __rowKey: `timeline-${item.id ?? index}`
    }
  ])
}

function tableRowClassName ({ row }) {
  return row.__kind === 'timeline' ? 'timeline-row' : 'main-row'
}

function tableSpanMethod ({ row, columnIndex }) {
  if (row.__kind !== 'timeline') {
    return { rowspan: 1, colspan: 1 }
  }

  if (columnIndex === 0) {
    return { rowspan: 1, colspan: TABLE_COL_COUNT }
  }

  return { rowspan: 0, colspan: 0 }
}

function stripMeta (row) {
  const files = getRowFiles(row)
  const first = files[0] || null

  return {
    id: row.id ?? null,
    groupName: row.groupName ?? row.modelFamily ?? '',
    modelName: row.modelName ?? '',
    modelCode: row.modelCode ?? '',
    certType: row.certType ?? '',
    standard: row.standard ?? '',
    lab: row.lab ?? '',
    issueDate: formatDate(row.issueDate) || todayStr(),
    status: normalizeStatus(row.status),
    remark: row.remark ?? '',
    files,
    filePath: first?.path ?? '',
    fileId: first?.id ?? null,
    fileName: first?.name ?? ''
  }
}

function syncLegacyFormFileFields () {
  const first = form.files[0] || null
  form.filePath = first?.path ?? ''
  form.fileId = first?.id ?? null
  form.fileName = first?.name ?? ''
}

function setFormFiles (files = []) {
  form.files = dedupeFiles(files)
  syncLegacyFormFileFields()
}

function addFormFiles (files = []) {
  const before = form.files.length
  setFormFiles([...(form.files || []), ...files])
  return Math.max(form.files.length - before, 0)
}

function applySelectedFile (file) {
  return addFormFiles([file])
}

function removeSelectedFileAt (index) {
  const next = [...form.files]
  next.splice(index, 1)
  setFormFiles(next)
}

function clearSelectedFile () {
  setFormFiles([])
}

function triggerLocalUpload () {
  fileInputRef.value?.click()
}

async function handleLocalFileChange (ev) {
  const pickedFiles = Array.from(ev?.target?.files || [])
  if (!pickedFiles.length) return

  uploadingFile.value = true
  const uploaded = []
  const failed = []

  try {
    for (const file of pickedFiles) {
      try {
        const fd = new FormData()
        fd.append('file', file)
        fd.append('category', '認證')

        const res = await apiRequest('post', FILES_UPLOAD_API, fd, {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        })

        const raw =
          res?.data?.data ??
          res?.data?.row ??
          res?.data?.file ??
          res?.data?.item ??
          null

        if (!raw) throw new Error('upload response missing file data')

        const normalized = normalizeFileRow(raw)
        if (normalized) uploaded.push(normalized)
      } catch (error) {
        console.error(error)
        failed.push(file?.name || 'unknown')
      }
    }

    if (uploaded.length) {
      addFormFiles(uploaded)
    }

    if (uploaded.length && !failed.length) {
      ElMessage.success(
        uploaded.length === 1
          ? text('safetyReports.messages.uploaded', '檔案已上傳')
          : text('safetyReports.messages.uploadedCount', '已上傳 {count} 個檔案', { count: uploaded.length })
      )
    } else if (uploaded.length && failed.length) {
      ElMessage.warning(text('safetyReports.messages.uploadPartial', '已上傳 {ok} 個檔案，{fail} 個失敗', {
        ok: uploaded.length,
        fail: failed.length
      }))
    } else {
      ElMessage.error(text('safetyReports.messages.uploadFailed', '上傳失敗'))
    }
  } finally {
    uploadingFile.value = false
    if (ev?.target) ev.target.value = ''
  }
}

function handleFileCenterSelectionChange (selection) {
  fileSelectedRows.value = (selection || [])
    .map((x, idx) => normalizeFileRow(x, idx))
    .filter(Boolean)
}

async function fetchFileCenterList () {
  fileLoading.value = true
  try {
    const res = await apiRequest('get', FILES_API, null, {
      params: {
        keyword: fileKeyword.value || ''
      }
    })

    const list =
      res?.data?.data?.rows ??
      res?.data?.rows ??
      res?.data?.items ??
      res?.data?.data ??
      res?.data?.list ??
      (Array.isArray(res?.data) ? res.data : [])

    fileRows.value = (list || [])
      .map(normalizeFileRow)
      .filter((x) => x && !x.isFolder)

    fileSelectedRows.value = []
    await nextTick()
    fileTableRef.value?.clearSelection?.()
  } catch (err) {
    console.error(err)
    ElMessage.error(text('safetyReports.messages.loadFileCenterFailed', '載入檔案中心失敗'))
  } finally {
    fileLoading.value = false
  }
}

async function openFileCenterDialog () {
  fileCenterVisible.value = true
  await fetchFileCenterList()
}

function chooseFileFromCenter (row) {
  const added = applySelectedFile(row)
  if (added > 0) {
    ElMessage.success(text('safetyReports.file.addedOne', '已加入 1 個檔案'))
  } else {
    ElMessage.info(text('safetyReports.file.duplicateOne', '此檔案已在附件清單中'))
  }
}

function confirmChooseFilesFromCenter () {
  if (!fileSelectedRows.value.length) {
    ElMessage.warning(text('safetyReports.file.needSelect', '請先勾選檔案'))
    return
  }

  const added = addFormFiles(fileSelectedRows.value)
  fileCenterVisible.value = false

  if (added > 0) {
    ElMessage.success(text('safetyReports.file.addedCount', '已加入 {count} 個檔案', { count: added }))
  } else {
    ElMessage.info(text('safetyReports.file.allDuplicate', '勾選的檔案都已經存在附件清單'))
  }
}

function goToFileCenter (row) {
  const files = getRowFiles(row)

  if (!files.length) {
    ElMessage.warning(text('safetyReports.messages.noLinkedFile', '沒有綁定附件'))
    return
  }

  const fileIds = [...new Set(
    files
      .map((x) => x?.id ?? extractFileIdFromPath(x?.path))
      .filter((id) => Number.isFinite(Number(id)) && Number(id) > 0)
      .map((id) => Number(id))
  )]

  if (fileIds.length) {
    router.push({
      path: FILE_CENTER_ROUTE,
      query: {
        fileIds: JSON.stringify(fileIds),
        highlight: '1'
      }
    })
    return
  }

  const firstPath = files[0]?.path || ''
  if (firstPath) {
    openFile(firstPath)
    return
  }

  ElMessage.warning(text('safetyReports.messages.noLinkedFile', '沒有綁定附件'))
}

function openCreateDialog () {
  isEdit.value = false
  resetForm()
  editVisible.value = true
}

function openEditDialog (row) {
  isEdit.value = true
  Object.assign(form, stripMeta(row))
  editVisible.value = true
}

async function saveForm () {
  try {
    await formRef.value?.validate()
  } catch {
    return
  }

  saving.value = true
  try {
    const files = dedupeFiles(form.files)
    const fileIds = files.map((x) => x.id).filter(Boolean)
    const filePaths = files.map((x) => x.path).filter(Boolean)

    const payload = {
      groupName: form.groupName,
      modelName: form.modelName,
      modelCode: form.modelCode,
      certType: form.certType,
      standard: form.standard,
      lab: form.lab,
      issueDate: form.issueDate,
      status: form.status,
      remark: form.remark,
      fileIds,
      filePaths
    }

    if (isEdit.value && form.id != null) {
      await apiRequest('put', `${API_BASE}/${form.id}`, payload)
      ElMessage.success(text('safetyReports.messages.updated', '已更新'))
    } else {
      await apiRequest('post', API_BASE, payload)
      ElMessage.success(text('safetyReports.messages.created', '已建立'))
    }

    editVisible.value = false
    await fetchList()
  } catch (err) {
    console.error(err)
    ElMessage.error(text('safetyReports.messages.saveFailed', '儲存失敗'))
  } finally {
    saving.value = false
  }
}

async function removeRow (row) {
  try {
    await ElMessageBox.confirm(
      text('safetyReports.messages.deleteConfirm', '確定要刪除嗎？'),
      text('common.confirm', '確認'),
      {
        type: 'warning',
        confirmButtonText: text('common.confirm', '確認'),
        cancelButtonText: text('common.cancel', '取消')
      }
    )

    await apiRequest('delete', `${API_BASE}/${row.id}`)
    ElMessage.success(text('safetyReports.messages.deleted', '已刪除'))
    await fetchList()
  } catch (err) {
    if (err === 'cancel' || err === 'close') return
    console.error(err)
    ElMessage.error(text('safetyReports.messages.deleteFailed', '刪除失敗'))
  }
}

function openFile (path) {
  const url = resolveFileUrl(path)
  if (!url) return
  window.open(url, '_blank', 'noopener,noreferrer')
}

onMounted(() => {
  resetForm()
  detectDarkMode()
  cleanupMql = setupMql()
  fetchList()

  themeObserver = new MutationObserver(() => {
    detectDarkMode()
  })

  themeObserver.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['class', 'data-theme', 'data-bs-theme']
  })

  themeObserver.observe(document.body, {
    attributes: true,
    attributeFilter: ['class', 'data-theme', 'data-bs-theme']
  })
})

onBeforeUnmount(() => {
  cleanupMql?.()
  themeObserver?.disconnect?.()
})
</script>

<style scoped>
.safety-reports-page-vivid {
  --sr-border: var(--el-border-color-light);
  --sr-border-soft: var(--el-border-color-lighter);
  --sr-card-bg:
    radial-gradient(circle at top right, color-mix(in srgb, var(--el-color-primary) 12%, transparent) 0%, transparent 34%),
    linear-gradient(180deg, color-mix(in srgb, var(--el-bg-color) 95%, var(--el-color-primary-light-9) 5%) 0%, var(--el-bg-color) 100%);
  --sr-soft-bg: color-mix(in srgb, var(--el-fill-color-light) 88%, white 12%);
  --sr-soft-bg-2: color-mix(in srgb, var(--el-fill-color-light) 92%, white 8%);
  --sr-shadow: 0 18px 48px rgba(0, 0, 0, 0.06);
  --sr-text: var(--el-text-color-primary);
  --sr-subtext: var(--el-text-color-secondary);

  display: flex;
  flex-direction: column;
  gap: 18px;
  padding-bottom: 8px;
  color: var(--sr-text);
}

.safety-reports-page-vivid.is-dark {
  --sr-shadow: 0 18px 48px rgba(0, 0, 0, 0.28);
}

.btn { border-radius: 12px; }
.ctrl { border-radius: 12px; }
.pill { border-radius: 999px; }
.pill.mini { font-size: 12px; padding: 2px 10px; }
.w-search { width: 380px; }

.hero-card,
.group-card,
:deep(.el-dialog) {
  border: 1px solid var(--sr-border);
  border-radius: 22px;
  background: var(--sr-card-bg);
  box-shadow: var(--sr-shadow);
}

.hero-card {
  padding: 18px 20px 16px;
  overflow: hidden;
  position: relative;
}

.hero-card::after {
  content: '';
  position: absolute;
  inset: auto -70px -70px auto;
  width: 180px;
  height: 180px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--el-color-primary) 10%, transparent);
  filter: blur(10px);
  pointer-events: none;
}

.hero-main {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}

.hero-left,
.hero-right {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.hero-icon-wrap {
  width: 58px;
  height: 58px;
  border-radius: 18px;
  display: grid;
  place-items: center;
  background: linear-gradient(135deg, var(--el-color-primary-light-8), var(--el-color-primary-light-9));
  border: 1px solid color-mix(in srgb, var(--el-color-primary) 24%, var(--sr-border));
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.45);
}

.hero-icon {
  font-size: 26px;
}

.hero-copy {
  min-width: 0;
}

.hero-eyebrow {
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.08em;
  color: var(--el-color-primary);
  margin-bottom: 4px;
}

.hero-title {
  margin: 0;
  font-size: 30px;
  line-height: 1.08;
  font-weight: 900;
  color: var(--sr-text);
}

.hero-subtitle {
  margin-top: 6px;
  font-size: 13px;
  color: var(--sr-subtext);
}

.stat-grid {
  margin-top: 16px;
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 12px;
}

.stat-card {
  border-radius: 18px;
  padding: 14px 14px 12px;
  border: 1px solid var(--sr-border-soft);
  background: var(--sr-soft-bg);
  box-shadow: 0 4px 14px rgba(31, 35, 41, 0.04);
}

.stat-label {
  font-size: 12px;
  color: var(--sr-subtext);
  margin-bottom: 8px;
}

.stat-value {
  font-size: 24px;
  font-weight: 900;
  line-height: 1;
  color: var(--sr-text);
}

.stat-card.total { background: linear-gradient(180deg, var(--sr-soft-bg-2), var(--sr-soft-bg)); }
.stat-card.active { background: linear-gradient(180deg, color-mix(in srgb, var(--el-color-primary-light-8) 68%, white 32%), color-mix(in srgb, var(--el-color-primary-light-9) 80%, white 20%)); }
.stat-card.paused { background: linear-gradient(180deg, color-mix(in srgb, var(--el-color-warning-light-8) 72%, white 28%), color-mix(in srgb, var(--el-color-warning-light-9) 84%, white 16%)); }
.stat-card.completed { background: linear-gradient(180deg, color-mix(in srgb, var(--el-color-success-light-8) 72%, white 28%), color-mix(in srgb, var(--el-color-success-light-9) 84%, white 16%)); }
.stat-card.file { background: linear-gradient(180deg, color-mix(in srgb, var(--el-color-info-light-8) 72%, white 28%), color-mix(in srgb, var(--el-color-info-light-9) 84%, white 16%)); }
.stat-card.file-missing { background: linear-gradient(180deg, color-mix(in srgb, var(--el-color-danger-light-8) 72%, white 28%), color-mix(in srgb, var(--el-color-danger-light-9) 84%, white 16%)); }

.group-list {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.group-card {
  overflow: hidden;
}

.group-head {
  padding: 16px 18px 14px;
  border-bottom: 1px solid var(--sr-border-soft);
  background: linear-gradient(180deg, color-mix(in srgb, var(--el-bg-color) 98%, white 2%) 0%, color-mix(in srgb, var(--el-fill-color-light) 72%, white 28%) 100%);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  flex-wrap: wrap;
}

.group-head-left,
.group-head-right {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.group-name {
  font-size: 20px;
  font-weight: 900;
  color: var(--sr-text);
}

.group-meta {
  font-size: 12px;
  color: var(--sr-subtext);
  padding: 4px 10px;
  border-radius: 999px;
  background: var(--sr-soft-bg);
  border: 1px solid var(--sr-border-soft);
}

:deep(.group-table) {
  border-left: 0;
  border-right: 0;
  --el-table-border-color: var(--sr-border);
}

:deep(.group-table th.el-table__cell) {
  background: var(--sr-soft-bg) !important;
}

:deep(.group-table .el-table__row:hover > td) {
  background: color-mix(in srgb, var(--el-color-primary-light-9) 50%, transparent 50%) !important;
}

:deep(.group-table .main-row td) {
  border-bottom: 0 !important;
}

:deep(.group-table .timeline-row td) {
  padding: 0 !important;
  background: color-mix(in srgb, var(--el-color-primary-light-9) 28%, var(--el-bg-color) 72%);
}

:deep(.group-table .timeline-row .cell) {
  padding: 0 !important;
}

.cell-strong {
  font-weight: 700;
  color: var(--sr-text);
}

.cell-sub {
  margin-top: 4px;
  font-size: 12px;
  font-weight: 600;
  color: var(--el-color-primary);
}

.cell-sub.empty {
  color: var(--sr-subtext);
}

.cell-wrap {
  display: inline-block;
  white-space: normal;
  word-break: break-word;
  line-height: 1.45;
}

.op-col {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 3px;
  line-height: 1.15;
}

.timeline-card {
  padding: 14px 18px 16px;
  background: linear-gradient(180deg, color-mix(in srgb, var(--el-color-primary-light-9) 38%, var(--el-bg-color) 62%) 0%, color-mix(in srgb, var(--el-fill-color-light) 76%, var(--el-bg-color) 24%) 100%);
}

.timeline-card.mobile {
  margin-top: 12px;
  padding: 12px 14px;
  border-radius: 16px;
  border: 1px solid var(--sr-border-soft);
}

.timeline-card-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
  flex-wrap: wrap;
}

.timeline-title-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.timeline-title {
  font-size: 13px;
  font-weight: 900;
  color: var(--sr-text);
}

.timeline-step-text {
  font-size: 12px;
  color: var(--sr-subtext);
}

.timeline-bar {
  position: relative;
  height: 10px;
  background: color-mix(in srgb, var(--el-fill-color-dark) 32%, var(--el-fill-color-light) 68%);
  border-radius: 999px;
  overflow: visible;
}

.timeline-fill {
  height: 100%;
  border-radius: 999px;
  background: linear-gradient(90deg, color-mix(in srgb, var(--el-color-primary) 75%, white 25%) 0%, var(--el-color-primary) 100%);
  transition: width 0.25s ease;
  box-shadow: 0 2px 8px rgba(64, 158, 255, 0.18);
}

.timeline-thumb {
  position: absolute;
  top: 50%;
  width: 20px;
  height: 20px;
  border-radius: 999px;
  background: var(--el-bg-color);
  border: 3px solid var(--el-color-primary);
  transform: translateY(-50%);
  box-sizing: border-box;
  box-shadow: 0 4px 10px rgba(64, 158, 255, 0.18);
}

.timeline-foot {
  margin-top: 10px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  color: var(--sr-subtext);
  font-size: 12px;
}

.timeline-foot strong {
  color: var(--sr-text);
  font-size: 13px;
  font-weight: 900;
}

.mobile-list {
  display: grid;
  gap: 12px;
  padding: 14px;
}

.report-card {
  border: 1px solid var(--sr-border-soft);
  border-radius: 18px;
  background: linear-gradient(180deg, color-mix(in srgb, var(--el-bg-color) 98%, white 2%) 0%, color-mix(in srgb, var(--el-fill-color-light) 70%, var(--el-bg-color) 30%) 100%);
  padding: 14px;
}

.report-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
}

.report-title {
  font-size: 16px;
  font-weight: 900;
  color: var(--sr-text);
}

.report-sub {
  margin-top: 4px;
  font-size: 12px;
  color: var(--sr-subtext);
}

.meta-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  margin-top: 12px;
}

.meta-box {
  padding: 10px 12px;
  border-radius: 14px;
  border: 1px solid var(--sr-border-soft);
  background: var(--sr-soft-bg);
}

.meta-label {
  font-size: 12px;
  color: var(--sr-subtext);
  margin-bottom: 4px;
}

.meta-value {
  font-size: 14px;
  font-weight: 700;
  line-height: 1.5;
  word-break: break-word;
  color: var(--sr-text);
}

.card-actions {
  margin-top: 12px;
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.card-actions :deep(.el-button) {
  flex: 1 1 calc(33.333% - 8px);
  min-width: 100px;
}

.dialog-hero {
  display: grid;
  grid-template-columns: minmax(0, 1.3fr) minmax(220px, 0.9fr);
  gap: 12px;
  margin-bottom: 14px;
}

.dialog-main,
.dialog-preview {
  padding: 14px 16px;
  border-radius: 18px;
  border: 1px solid var(--sr-border-soft);
  background: linear-gradient(180deg, var(--sr-soft-bg) 0%, color-mix(in srgb, var(--el-bg-color) 96%, white 4%) 100%);
}

.dialog-title {
  font-size: 16px;
  font-weight: 800;
  color: var(--sr-text);
}

.dialog-subtitle {
  margin-top: 6px;
  font-size: 13px;
  color: var(--sr-subtext);
  line-height: 1.6;
}

.preview-label {
  font-size: 12px;
  color: var(--sr-subtext);
  margin-bottom: 6px;
}

.preview-value {
  font-size: 14px;
  font-weight: 800;
  color: var(--sr-text);
}

.preview-sub {
  margin-top: 6px;
  font-size: 12px;
  color: var(--el-color-primary);
  font-weight: 700;
}

.dialog-section-title {
  font-size: 14px;
  font-weight: 800;
  color: var(--sr-text);
  margin-bottom: 12px;
  padding-left: 10px;
  border-left: 4px solid var(--el-color-primary);
}

.dialog-section-title.with-space {
  margin-top: 10px;
}

.edit-form {
  padding-top: 2px;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px 18px;
}

.span-2 {
  grid-column: 1 / -1;
}

.hidden-file-input {
  display: none;
}

.file-picker-box {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.file-picker-top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 14px;
  padding: 16px;
  border: 1px solid var(--sr-border-soft);
  border-radius: 18px;
  background: linear-gradient(180deg, color-mix(in srgb, var(--el-color-primary-light-9) 28%, var(--el-bg-color) 72%) 0%, color-mix(in srgb, var(--el-fill-color-light) 70%, var(--el-bg-color) 30%) 100%);
  flex-wrap: wrap;
}

.file-picked-info {
  min-width: 280px;
  flex: 1;
}

.file-picked-label {
  margin-bottom: 4px;
  font-size: 12px;
  color: var(--sr-subtext);
}

.file-picked-name {
  font-size: 15px;
  font-weight: 900;
  color: var(--sr-text);
  word-break: break-word;
}

.file-picked-path {
  margin-top: 6px;
  font-size: 12px;
  color: var(--sr-subtext);
  word-break: break-all;
}

.file-picker-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.picked-file-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.picked-file-item {
  border: 1px solid var(--sr-border-soft);
  border-radius: 16px;
  background: color-mix(in srgb, var(--el-bg-color) 98%, white 2%);
  padding: 12px 14px;
}

.picked-file-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
  flex-wrap: wrap;
}

.picked-file-title-wrap {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
  flex: 1;
}

.picked-file-index {
  width: 32px;
  height: 32px;
  border-radius: 999px;
  display: grid;
  place-items: center;
  font-size: 12px;
  font-weight: 800;
  color: var(--el-color-primary);
  background: color-mix(in srgb, var(--el-color-primary-light-8) 72%, white 28%);
  border: 1px solid color-mix(in srgb, var(--el-color-primary) 18%, var(--sr-border-soft));
  flex: 0 0 auto;
}

.picked-file-name-main {
  min-width: 0;
  font-size: 14px;
  font-weight: 800;
  color: var(--sr-text);
  word-break: break-word;
}

.picked-file-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.picked-file-empty {
  padding: 18px;
  border: 1px dashed var(--sr-border);
  border-radius: 16px;
  background: color-mix(in srgb, var(--el-fill-color-light) 72%, var(--el-bg-color) 28%);
  color: var(--sr-subtext);
  text-align: center;
  font-size: 13px;
}

.picked-file-path {
  margin-top: 8px;
  font-size: 12px;
  color: var(--sr-subtext);
  word-break: break-all;
}

.file-center-toolbar {
  display: flex;
  gap: 10px;
  margin-bottom: 14px;
  flex-wrap: wrap;
  align-items: center;
}

.file-center-search {
  width: 360px;
}

.file-center-selected-count {
  font-size: 13px;
  color: var(--sr-subtext);
  padding: 8px 12px;
  border-radius: 999px;
  background: var(--sr-soft-bg);
  border: 1px solid var(--sr-border-soft);
}

.file-center-table {
  border-radius: 14px;
  overflow: hidden;
}

.fc-name {
  font-weight: 700;
  color: var(--sr-text);
  word-break: break-word;
}

.empty-wrap {
  border: 1px dashed var(--sr-border);
  border-radius: 20px;
  background: linear-gradient(180deg, color-mix(in srgb, var(--el-bg-color) 98%, white 2%) 0%, color-mix(in srgb, var(--el-fill-color-light) 72%, var(--el-bg-color) 28%) 100%);
  padding: 24px 12px;
}

@media (max-width: 1280px) {
  .stat-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 1100px) {
  .dialog-hero {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 980px) {
  .w-search,
  .file-center-search {
    width: 100%;
  }

  .form-grid {
    grid-template-columns: 1fr;
  }

  .hero-title {
    font-size: 24px;
  }

  .stat-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 768px) {
  .hero-card {
    padding: 16px;
  }

  .hero-main {
    flex-direction: column;
    align-items: stretch;
  }

  .hero-left,
  .hero-right {
    align-items: stretch;
  }

  .hero-right {
    justify-content: flex-start;
  }
}

@media (max-width: 640px) {
  .stat-grid,
  .meta-grid {
    grid-template-columns: 1fr;
  }

  .group-head {
    align-items: flex-start;
  }

  .picked-file-head {
    flex-direction: column;
    align-items: stretch;
  }

  .file-picker-actions :deep(.el-button),
  .card-actions :deep(.el-button),
  .hero-right :deep(.el-button) {
    flex: 1 1 100%;
    min-width: 0;
  }
}
</style>
