<!-- frontend/src/views/ProductTest.vue -->
<template>
  <div class="page product-test-v6">
<!-- ✅ New Sticky Topbar (v7) -->
<div class="topbar">
  <!-- Row 1: Meta / Title -->
  <div class="topbar-row meta">
    <div class="meta-left">
      <div class="title">
        <div class="title-main">📄 x86 System Test Report</div>
        <div class="title-sub">Template v{{ tpl.version }}</div>
      </div>

      <el-tag type="success" effect="dark">
        {{ productTitle }}
      </el-tag>

      <el-tag effect="plain">
        {{ meta.reportName || 'Test Report' }} · Rev {{ meta.revision || '0.1' }}
      </el-tag>

      <el-tag v-if="planLocked" type="warning" effect="dark">
        🔒 Plan Locked
      </el-tag>
      <el-tag v-else type="info" effect="plain">
        🔓 Plan Editable
      </el-tag>
    </div>

    <div class="meta-right">
      <!-- ✅ Draft hint -->
      <el-tag v-if="draft.saving" effect="plain" type="info">
        💾 Draft saving...
      </el-tag>

      <el-tag v-else-if="draft.dirty" effect="plain" type="warning">
        📝 Draft not saved
      </el-tag>

      <el-tag v-else-if="draft.savedAt" effect="plain" type="success">
        ✅ Draft saved {{ draftSavedText }}
      </el-tag>

      <!-- ✅ report_metas saving hint -->
      <el-tag v-if="reportMetaSaving" effect="plain" type="info">
        ⚙️ Saving Show...
      </el-tag>

      <!-- ✅ 回到產品頁 -->
      <el-button size="small" plain @click="goProductPage">
        Back to Product
      </el-button>

      <!-- ✅ Debug hint -->
      <el-tag v-if="dbg.logs.length" effect="plain" type="info" title="Debug log count">
        🧾 {{ dbg.logs.length }}
      </el-tag>
    </div>
  </div>

  <!-- Row 2: Command Bar -->
  <div class="topbar-row cmd">
    <!-- Left: Filters (Desktop) -->
    <div class="cmd-left">
      <div v-if="!isMobile" class="pt-subsec">
  <div class="pt-section">
      <div v-if="isMobile" class="drawer-title">Filters</div>

      <div :class="['pt-filters', { 'is-mobile': isMobile }]">
        <el-input
          v-model="kw"
          class="w-260"
          clearable
          placeholder="Search TC code / name…"
          @keyup.enter="runSearch"
          @clear="runSearch"
        >
          <template #prefix><el-icon><Search /></el-icon></template>
        </el-input>

        <el-select v-model="planFilter" class="w-160" clearable placeholder="Plan">
          <el-option label="All" value="" />
          <el-option label="Planned" value="planned" />
          <el-option label="Unplanned" value="unplanned" />
        </el-select>

        <el-select v-model="resultFilter" class="w-160" clearable placeholder="Result">
          <el-option label="All" value="" />
          <el-option label="PASS" value="pass" />
          <el-option label="FAIL" value="fail" />
          <el-option label="Untested" value="pending" />
        </el-select>

        <el-button class="ghost" :type="isMobile ? 'primary' : 'default'" @click="runSearch">
          Apply
        </el-button>
      </div>
    </div>

    <el-divider v-if="isMobile" />
</div>
    </div>

    <!-- Right: Actions (Desktop) -->
    <div class="cmd-right desktop-only">
      <div :class="['pt-controls', { 'is-mobile': isMobile }]">
    <!-- Import -->
    <div class="pt-subsec">
      <div v-if="isMobile" class="drawer-title">Import</div>

      <div class="grp">
        <el-select
          v-model="importKey"
          class="w-260"
          filterable
          :loading="loadingSets"
          placeholder="Import Test Set"
          @visible-change="(v) => { if (v) fetchTestSets() }"
        >
          <el-option-group label="Presets (Template)">
            <el-option label="Preset V1" value="PRESET:V1" />
            <el-option label="Preset V2" value="PRESET:V2" />
          </el-option-group>

          <el-option-group label="Saved Test Sets">
            <el-option
              v-for="s in testSets"
              :key="s.id"
              :label="setLabel(s)"
              :value="`SET:${s.id}`"
            />
          </el-option-group>
        </el-select>

        <el-select v-model="importMode" class="w-160" placeholder="Mode">
          <el-option label="Append" value="append" />
          <el-option label="Replace" value="replace" />
        </el-select>

        <el-tooltip content="Skip duplicates by TC code/fingerprint" placement="bottom">
          <el-switch v-model="skipExistingImport" active-text="Skip existing" />
        </el-tooltip>

        <el-button type="primary" :loading="importing" @click="importSelected">
          Import
        </el-button>

        <el-button :icon="Refresh" :loading="loadingSets" @click="fetchTestSets" />
      </div>
    </div>

    <div class="sep" />

    <!-- Actions -->
    <div class="pt-subsec">
      <div v-if="isMobile" class="drawer-title">Actions</div>
      <div class="grp">
        <PtActionButtons variant="full" />
      </div>
    </div>
  </div>
    </div>

    <!-- ✅ Mobile Quick Bar -->
    <div class="cmd-right mobile-only">
      <div class="pt-mobile-quickbar"><PtActionButtons variant="quick" /></div>
    </div>
  </div>
</div>

<!-- ✅ Mobile Controls Drawer -->
<el-drawer
  v-model="ctrlDrawer"
  title="Controls"
  direction="rtl"
  size="520px"
  :destroy-on-close="false"
>
  <div v-if="isMobile">
  <div class="pt-section">
      <div v-if="isMobile" class="drawer-title">Filters</div>

      <div :class="['pt-filters', { 'is-mobile': isMobile }]">
        <el-input
          v-model="kw"
          class="w-260"
          clearable
          placeholder="Search TC code / name…"
          @keyup.enter="runSearch"
          @clear="runSearch"
        >
          <template #prefix><el-icon><Search /></el-icon></template>
        </el-input>

        <el-select v-model="planFilter" class="w-160" clearable placeholder="Plan">
          <el-option label="All" value="" />
          <el-option label="Planned" value="planned" />
          <el-option label="Unplanned" value="unplanned" />
        </el-select>

        <el-select v-model="resultFilter" class="w-160" clearable placeholder="Result">
          <el-option label="All" value="" />
          <el-option label="PASS" value="pass" />
          <el-option label="FAIL" value="fail" />
          <el-option label="Untested" value="pending" />
        </el-select>

        <el-button class="ghost" :type="isMobile ? 'primary' : 'default'" @click="runSearch">
          Apply
        </el-button>
      </div>
    </div>

    <el-divider v-if="isMobile" />

  <div :class="['pt-controls', { 'is-mobile': isMobile }]">
      <!-- Import -->
      <div class="pt-subsec">
        <div v-if="isMobile" class="drawer-title">Import</div>

        <div class="grp">
          <el-select
            v-model="importKey"
            class="w-260"
            filterable
            :loading="loadingSets"
            placeholder="Import Test Set"
            @visible-change="(v) => { if (v) fetchTestSets() }"
          >
            <el-option-group label="Presets (Template)">
              <el-option label="Preset V1" value="PRESET:V1" />
              <el-option label="Preset V2" value="PRESET:V2" />
            </el-option-group>

            <el-option-group label="Saved Test Sets">
              <el-option
                v-for="s in testSets"
                :key="s.id"
                :label="setLabel(s)"
                :value="`SET:${s.id}`"
              />
            </el-option-group>
          </el-select>

          <el-select v-model="importMode" class="w-160" placeholder="Mode">
            <el-option label="Append" value="append" />
            <el-option label="Replace" value="replace" />
          </el-select>

          <el-tooltip content="Skip duplicates by TC code/fingerprint" placement="bottom">
            <el-switch v-model="skipExistingImport" active-text="Skip existing" />
          </el-tooltip>

          <el-button type="primary" :loading="importing" @click="importSelected">
            Import
          </el-button>

          <el-button :icon="Refresh" :loading="loadingSets" @click="fetchTestSets" />
        </div>
      </div>

      <div class="sep" />

      <!-- Actions -->
      <div class="pt-subsec">
        <div v-if="isMobile" class="drawer-title">Actions</div>
        <div class="grp">
          <PtActionButtons variant="full" />
        </div>
      </div>
    </div>
</div>
</el-drawer>

<!-- ✅ Shared Filters: one source, teleported to Desktop or Drawer -->
<!-- ✅ Shared Import + Actions: one source, teleported to Desktop or Drawer -->
<!-- ✅ Mobile Quick Bar -->
<!-- Tabs -->
    <el-card shadow="never" class="tabs-card">
      <el-tabs v-model="activeTab" type="card" class="sheet-tabs">
        <!-- Dashboard -->
        <el-tab-pane label="Dashboard" name="dashboard">
          <div class="sheet">
            <div class="sheet-topbar">
  <div class="sheet-title">Test Case Database ver. 0006 (Web)</div>

  <!-- ✅ 新增分頁（放在 Dashboard 左邊） -->
  <el-button
    size="small"
    type="primary"
    plain
    :icon="Plus"
    @click="openAddTabDialog"
  >
    Add Tab
  </el-button>
</div>


            <el-alert
              v-if="testcases.length === 0"
              type="warning"
              :closable="false"
              show-icon
              style="margin-bottom:12px"
              title="This product has no test cases yet. Use Import (top-right) to import a Preset or Saved Test Set."
            />

            <div class="kpi-grid">
              <div class="kpi">
                <div class="k">Total TC # (Shown)</div>
                <div class="v">{{ overall.total }}</div>
              </div>
              <div class="kpi">
                <div class="k">Total Estimated hrs.</div>
                <div class="v">{{ totalEstimated.toFixed(1) }}</div>
              </div>
<div class="kpi">
  <div class="k">Work hrs. (Pending/Total)</div>
  <div class="v">{{ pendingWork.toFixed(1) }} / {{ totalWork.toFixed(1) }}</div>
</div>

              <div class="kpi">
                <div class="k">Completed Rate</div>
                <div class="v">{{ pct(overall.completedRate) }}</div>
              </div>
            </div>

            <div class="sheet-subtitle">Test Case Group Summary</div>
            <el-table :data="dashboardRows" border stripe>
              <el-table-column label="Show" width="90" align="center">
                <template #default="{ row }">
                  <el-checkbox
                    v-model="catEnabled[row.key]"
                    @change="() => onToggleCategory(row.key)"
                  />
                </template>
              </el-table-column>

              <el-table-column prop="group" label="Test Case Group" min-width="240" />
              <el-table-column prop="inDb" label="TC's # in DB" width="120" align="center" />
              <el-table-column prop="selected" label="Selected TC's #" width="140" align="center" />
              <el-table-column prop="estHours" label="Total Estimated hrs." width="160" align="center" />
              <el-table-column label="Work hrs. (Pending/Total)" width="170" align="center">
  <template #default="{ row }">
    {{ row.workHoursPending.toFixed(1) }} / {{ row.workHoursTotal.toFixed(1) }}
  </template>
</el-table-column>

              <el-table-column label="Completed Rate" width="160" align="center">
                <template #default="{ row }">
                  {{ pct(row.completeRate) }}
                </template>
              </el-table-column>
            </el-table>

            <el-divider />
            <div class="muted">
              Tip: The filters above (Search / Plan / Result) affect Dashboard, Summary, and category tabs. The checkbox on Dashboard controls whether a category tab is shown.
            </div>
          </div>
        </el-tab-pane>

        <!-- Cover -->
        <el-tab-pane label="Cover" name="cover">
          <div class="sheet">
            <div class="cover-title">{{ meta.projectName || productTitle }}</div>
            <div class="cover-sub">{{ meta.reportName || 'Test Report' }}</div>
            <div class="cover-meta">
              Revision: {{ meta.revision || '0.1' }} · Released Date: {{ meta.releaseDate || '' }}
            </div>

            <el-divider />

            <el-form label-width="180px" class="form">
              <el-form-item label="Project Name">
                <el-input v-model="meta.projectName" style="width:520px" />
              </el-form-item>

              <el-form-item label="Report Name">
                <el-input v-model="meta.reportName" style="width:520px" />
              </el-form-item>

              <el-form-item label="Revision">
                <el-input v-model="meta.revision" style="width:260px" />
              </el-form-item>

              <el-form-item label="Released Date">
                <el-date-picker
                  v-model="meta.releaseDate"
                  type="date"
                  value-format="YYYY-MM-DD"
                  style="width:260px"
                />
              </el-form-item>

              <!-- ✅ 改成從檔案中心選取簽名檔 -->
              <el-form-item label="Prepared & Tested By">
                <div class="sig-row">
                  <el-button type="primary" plain @click="openFilePicker('preparedSig')">
                    Select Signature
                  </el-button>
                  <el-button
                    v-if="meta.preparedSigFileId || meta.preparedSigUrl"
                    type="danger"
                    text
                    @click="clearSignature('prepared')"
                  >
                    Clear
                  </el-button>

                  <div v-if="meta.preparedSigUrl" class="sig-preview">
                    <el-image
                      :src="meta.preparedSigUrl"
                      fit="contain"
                      class="sig-img"
                      :preview-src-list="[meta.preparedSigUrl]"
                      preview-teleported
                    />
                    <div class="sig-name">{{ meta.preparedSigFileName || 'signature' }}</div>
                  </div>

                  <div v-else class="muted">No signature selected</div>
                </div>
              </el-form-item>

              <el-form-item label="Reviewed & Approved By">
                <div class="sig-row">
                  <el-button type="primary" plain @click="openFilePicker('reviewedSig')">
                    Select Signature
                  </el-button>
                  <el-button
                    v-if="meta.reviewedSigFileId || meta.reviewedSigUrl"
                    type="danger"
                    text
                    @click="clearSignature('reviewed')"
                  >
                    Clear
                  </el-button>

                  <div v-if="meta.reviewedSigUrl" class="sig-preview">
                    <el-image
                      :src="meta.reviewedSigUrl"
                      fit="contain"
                      class="sig-img"
                      :preview-src-list="[meta.reviewedSigUrl]"
                      preview-teleported
                    />
                    <div class="sig-name">{{ meta.reviewedSigFileName || 'signature' }}</div>
                  </div>

                  <div v-else class="muted">No signature selected</div>
                </div>
              </el-form-item>
            </el-form>

            <div style="margin-top:12px; text-align:right">
              <el-button type="primary" :loading="savingMeta" @click="saveMeta">
                Save
              </el-button>
            </div>
          </div>
        </el-tab-pane>

        <!-- Summary -->
        <el-tab-pane label="Summary" name="summary">
          <div class="sheet">
            <div class="sheet-title">Summary of Test</div>

            <el-table :data="summaryRows" border stripe>
              <el-table-column prop="label" label="Category of Test Cases" min-width="260" />
              <el-table-column prop="total" label="Total TC #" width="120" align="center" />
              <el-table-column prop="pass" label="Pass" width="120" align="center" />
              <el-table-column prop="fail" label="Fail" width="120" align="center" />
              <el-table-column prop="pending" label="Untested" width="140" align="center" />
            </el-table>

            <div class="rates-row">
              <div class="rate-card">
                <div class="rate-title">Completed Rate</div>
                <div class="rate-value">{{ pct(overall.completedRate) }}</div>
              </div>
              <div class="rate-card">
                <div class="rate-title">PASS Rate</div>
                <div class="rate-value">{{ pct(overall.passRate) }}</div>
              </div>
              <div class="rate-card">
                <div class="rate-title">FAIL Rate</div>
                <div class="rate-value">{{ pct(overall.failRate) }}</div>
              </div>
            </div>

            <el-divider />

            <div class="sheet-subtitle">Remarks</div>
            <el-input v-model="summaryRemark" type="textarea" :rows="5" placeholder="Summary remarks…" />

            <div style="margin-top:12px; text-align:right">
              <el-button type="primary" :loading="savingSummaryRemark" @click="saveSummaryRemark">
                Save
              </el-button>
            </div>
          </div>
        </el-tab-pane>

        <!-- Contents -->
        <el-tab-pane label="Contents" name="contents">
          <div class="sheet">
            <div class="sheet-title">Table of Contents</div>
            <el-table :data="contentsItems" border stripe>
              <el-table-column prop="title" label="Section" min-width="380" />
              <el-table-column prop="meta" label="Status" min-width="260" />
              <el-table-column label="Go" width="110" align="center">
                <template #default="{ row }">
                  <el-button size="small" @click="activeTab = row.key">Open</el-button>
                </template>
              </el-table-column>
            </el-table>
          </div>
        </el-tab-pane>

        <!-- Config -->
        <el-tab-pane label="Config" name="config">
          <div class="sheet">
            <div class="sheet-title">Configuration & Utilities</div>

<div class="sheet-subtitle">DUT List</div>

<div class="dut-toolbar">
  <div class="muted">Total: {{ config.duts.length }}</div>
  <div style="flex:1" />
  <el-button
    size="small"
    type="primary"
    plain
    :icon="Plus"
    :disabled="planLocked && !isAdminUser"
    @click="addDut"
  >
    Add DUT
  </el-button>
</div>

<div class="dut-grid">
  <el-card
    v-for="(dut, i) in config.duts"
    :key="i"
    shadow="hover"
    class="dut-card"
  >
    <template #header>
      <div class="dut-header">
        <b>DUT#{{ dut.dutNo }}</b>
        <div style="flex:1" />

        <el-button
          size="small"
          type="danger"
          text
          :icon="Delete"
          :disabled="(planLocked && !isAdminUser)"
          @click="removeDut(i)"
        >
          Remove
        </el-button>
      </div>
    </template>

<el-form label-width="160px" class="form">
  <el-form-item
    v-for="f in tpl.config?.dutFields || []"
    :key="f.key"
    :label="f.label"
  >
    <el-input v-model="config.duts[i][f.key]" />
  </el-form-item>
</el-form>

  </el-card>
</div>


            <el-divider />

<div class="sheet-subtitle">Utilities List</div>
<el-table :data="utilitiesRows" border stripe>
  <el-table-column label="Show" width="90" align="center">
    <template #default="{ row }">
      <el-checkbox
        v-model="utilEnabled[row._key]"
        @change="(v) => onToggleUtility(row._key, v)"
      />
    </template>
  </el-table-column>

  <el-table-column prop="name" label="Utility Name" width="220" />
  <el-table-column prop="purpose" label="Purpose of using utility" min-width="420" />
</el-table>

            <el-divider />

            <div class="sheet-subtitle">List of Supported Devices & Accessories</div>

            <div
              v-for="sec in tpl.config?.supportedSections || []"
              :key="sec.key"
              class="supported-block"
            >
              <div class="supported-title">
                <b>{{ sec.label }}</b>
                <div style="flex:1" />
                <el-button size="small" @click="addSupportedRow(sec.key)">Add</el-button>
              </div>

              <el-table :data="config.supported[sec.key]" border stripe>
                <el-table-column label="P/N" min-width="280">
                  <template #default="{ $index }">
                    <el-input
                      v-model="config.supported[sec.key][$index].pn"
                      placeholder="Part number…"
                    />
                  </template>
                </el-table-column>

                <el-table-column :label="sec.label" min-width="420">
                  <template #default="{ $index }">
                    <el-input
                      v-model="config.supported[sec.key][$index].spec"
                      placeholder="Spec…"
                    />
                  </template>
                </el-table-column>

                <el-table-column label="Actions" width="110" align="center">
                  <template #default="{ $index }">
                    <el-button
                      size="small"
                      type="danger"
                      text
                      @click="removeSupportedRow(sec.key, $index)"
                    >
                      Remove
                    </el-button>
                  </template>
                </el-table-column>
              </el-table>
            </div>
<!-- ✅ Appearance of Assembled System (Excel-like) -->
<el-divider />

<div class="sheet-subtitle">Appearance of Assembled System</div>

<div class="aas-toolbar">
  <div class="muted">Blocks: {{ appearanceBlocks.length }}</div>
  <div style="flex:1" />
  <el-button size="small" type="primary" plain :icon="Plus" :disabled="appearanceDisabled" @click="addAppearanceBlock">
    Add Block
  </el-button>
  <el-button size="small" plain :disabled="appearanceDisabled" @click="resetAppearanceBlocks">
    Reset (2 Blocks)
  </el-button>
</div>

<div v-for="(blk, bIdx) in appearanceBlocks" :key="bIdx" class="aas-grid">
  <!-- Row 1: Caption -->
  <div class="aas-label">Caption</div>

  <div v-for="(slot, sIdx) in blk.slots" :key="'cap-'+sIdx" class="aas-cap">
    <el-input
      v-model="slot.caption"
      size="small"
      placeholder="Caption…"
      maxlength="80"
      show-word-limit
      :disabled="appearanceDisabled"
    />
  </div>

  <!-- Row 2: Photo -->
  <div class="aas-label aas-label-photo">Photo</div>

  <div v-for="(slot, sIdx) in blk.slots" :key="'ph-'+sIdx" class="aas-photo">
    <div class="aas-photo-box">
      <template v-if="slot.url">
        <el-image
          :src="slot.url"
          fit="contain"
          class="aas-img"
          :preview-src-list="[slot.url]"
          preview-teleported
        />
        <div class="aas-photo-meta">
          <div class="aas-file">{{ slot.name || (slot.fileId ? `#${slot.fileId}` : '') }}</div>

          <div class="aas-actions">
            <el-button size="small" type="primary" plain :disabled="appearanceDisabled" @click="openAppearancePicker(bIdx, sIdx)">
              Change
            </el-button>
            <el-button size="small" type="danger" plain :disabled="appearanceDisabled" @click="clearAppearancePhoto(bIdx, sIdx)">
              Remove
            </el-button>
          </div>
        </div>
      </template>

      <template v-else>
        <div class="aas-empty">
          <div class="aas-empty-title">No Photo</div>
          <el-button size="small" type="primary" plain :disabled="appearanceDisabled" @click="openAppearancePicker(bIdx, sIdx)">
            Select Image
          </el-button>
        </div>
      </template>
    </div>
  </div>

  <!-- Row 3: Block actions -->
  <div class="aas-block-actions">
    <el-button
      v-if="appearanceBlocks.length > 1"
      size="small"
      type="danger"
      plain
      :disabled="appearanceDisabled"
      @click="removeAppearanceBlock(bIdx)"
    >
      Delete this block
    </el-button>
  </div>
</div>
            <div style="margin-top:12px; text-align:right">
              <el-button type="primary" :loading="savingConfig" @click="saveConfig">
                Save
              </el-button>
            </div>
          </div>
        </el-tab-pane>

        <!-- Category tabs -->
        <el-tab-pane v-for="c in enabledTabCategories" :key="c.key" :label="c.key" :name="c.key">
          <div class="sheet">
            <div class="sheet-title">{{ c.key }} - {{ c.label }}</div>

            <div class="bulk-bar">
              <div class="muted">
                Selected: <b>{{ selectedIdsByCat(c.key).length }}</b>
              </div>

              <el-select v-model="bulk.result" placeholder="Apply result" class="w-160">
                <el-option label="PASS" value="pass" />
                <el-option label="FAIL" value="fail" />
                <el-option label="Untested" value="pending" />
              </el-select>

              <el-button
                type="primary"
                :icon="Check"
                :loading="bulkApplying"
                :disabled="!selectedIdsByCat(c.key).length || !bulk.result"
                @click="bulkApplyResult(c.key)"
              >
                Apply Result
              </el-button>

              <el-divider direction="vertical" />

              <el-button
                :icon="CircleCheck"
                :loading="bulkApplying"
                :disabled="!selectedIdsByCat(c.key).length || (planLocked && !isAdminUser)"
                @click="bulkApplyPlanned(c.key, true)"
              >
                Set Planned
              </el-button>

              <el-button
                :icon="CircleClose"
                :loading="bulkApplying"
                :disabled="!selectedIdsByCat(c.key).length || (planLocked && !isAdminUser)"
                @click="bulkApplyPlanned(c.key, false)"
              >
                Unset Planned
              </el-button>

              <el-button
                :icon="Brush"
                :loading="bulkApplying"
                :disabled="!selectedIdsByCat(c.key).length"
                @click="bulkResetRuntime(c.key)"
              >
                Reset Result
              </el-button>

              <el-divider direction="vertical" />

              <el-button
                type="success"
                :icon="Plus"
                :loading="addingPlanned"
                :disabled="planLocked && !isAdminUser"
                @click="openAddPlannedDialog(c.key)"
              >
                Add Planned
              </el-button>

              <el-button
                type="danger"
                :icon="Delete"
                :loading="bulkDeleting"
                :disabled="!selectedIdsByCat(c.key).length || (planLocked && !isAdminUser)"
                @click="bulkDeleteSelected(c.key)"
              >
                Delete
              </el-button>

              <el-button
                :icon="Close"
                :disabled="!selectedIdsByCat(c.key).length"
                @click="clearSelected(c.key)"
              >
                Clear
              </el-button>

              <div class="muted" style="margin-left:auto">
                Shown: {{ shownCountByCat(c.key) }}
              </div>
            </div>
<el-empty
  v-if="!(groupedByCategory[c.key] || []).length"
  description="No test cases in this tab yet. Use “Add Planned” to create one."
  style="padding:18px 0"
/>

            <el-collapse v-model="openSections[c.key]" class="cat-collapse">
              <el-collapse-item
                v-for="g in (groupedByCategory[c.key] || [])"
                :key="g.section"
                :name="g.section"
              >
                <template #title>
                  <div class="collapse-title">
                    <b>{{ g.section }}</b>
                    <span class="muted">
                      · Total {{ g.total }} / Pass {{ g.pass }} / Fail {{ g.fail }} / Untested {{ g.pending }}
                    </span>
                  </div>
                </template>

                <!-- ✅ Report blocks -->
                <div class="tc-block-list">
                  <div
                    v-for="row in g.items"
                    :key="row.id || row.code"
                    class="tc-block"
                    :class="`result-${normResult(row.result)}`"
                  >
                    <!-- Block header -->
                    <div class="tc-head">
                      <el-checkbox
                        class="tc-check"
                        :model-value="isSelected(c.key, g.section, row.id)"
                        @change="(v) => setSelected(c.key, g.section, row.id, v)"
                      />

                      <div class="tc-code">
                        <div class="lbl">TC Code</div>
                        <div class="val">{{ row.code || '—' }}</div>
                      </div>

                      <div class="tc-name">
                        <div class="lbl">Test Case</div>
                        <el-input
                          v-model="row.testCase"
                          size="small"
                          :disabled="planLocked && !isAdminUser"
                          @blur="() => onRowTestCaseBlur(row)"
                        />
                      </div>

                      <div class="tc-status">
                        <div class="tc-status-top">
                          <el-tag
                            size="small"
                            :type="normResult(row.result) === 'pass' ? 'success' : (normResult(row.result) === 'fail' ? 'danger' : 'info')"
                            effect="plain"
                          >
                            {{ normResult(row.result).toUpperCase() }}
                          </el-tag>

                          <el-tag size="small" :type="row.isPlanned ? 'success' : 'info'" effect="plain">
                            {{ row.isPlanned ? 'Planned' : 'Unplanned' }}
                          </el-tag>

                          <div class="tc-est muted">
                            Est: {{ estHoursOf(row).toFixed(1) }}h
                          </div>
                        </div>

                        <div class="tc-status-bottom">
                          <el-select
                            v-model="row.result"
                            size="small"
                            class="w-160"
                            @change="(v) => onRowResultChange(row, v)"
                          >
                            <el-option label="PASS" value="pass" />
                            <el-option label="FAIL" value="fail" />
                            <el-option label="Untested" value="pending" />
                          </el-select>

                          <div class="tc-work">
                            <div class="lbl">Work hrs.</div>
                            <el-input-number
                              v-model="row.workHrs"
                              size="small"
                              :min="0"
                              :precision="1"
                              @change="() => onRowWorkHrsChange(row)"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
<!-- Block body -->
<div class="tc-body">
  <!-- Procedure -->
  <div class="tc-sec">
    <div class="tc-sec-head">
      <div class="tc-sec-title">Procedure</div>

      <div class="tc-sec-actions">
        <el-button
          v-if="!isDetailEditing(row)"
          size="small"
          :icon="EditPen"
          text
          :disabled="planLocked && !isAdminUser"
          @click="startEditDetail(row)"
        >
          Edit
        </el-button>

        <template v-else>
          <el-button
            size="small"
            type="primary"
            :loading="detailSaving[row.id]"
            @click="saveDetail(row)"
          >
            Save
          </el-button>
          <el-button size="small" @click="cancelEditDetail(row)">Cancel</el-button>
        </template>
      </div>
    </div>

    <div
      v-if="!isDetailEditing(row)"
      class="tc-sec-box"
      v-html="fmtDetailHtml(row.testProcedure)"
    />
    <el-input
      v-else
      v-model="detailEdit[row.id].testProcedure"
      type="textarea"
      :rows="6"
      placeholder="Edit procedure…"
    />
  </div>


                      <!-- Criteria -->
                      <div class="tc-sec">
                        <div class="tc-sec-head">
                          <div class="tc-sec-title">Criteria</div>
                        </div>

                        <div
                          v-if="!isDetailEditing(row)"
                          class="tc-sec-box"
                          v-html="fmtDetailHtml(row.testCriteria)"
                        />
                        <el-input
                          v-else
                          v-model="detailEdit[row.id].testCriteria"
                          type="textarea"
                          :rows="4"
                          placeholder="Edit criteria…"
                        />
                      </div>

<!-- ✅ Extra fields -->
<div v-if="extraSchemaFor(row).length" class="tc-sec">
  <div class="tc-sec-head">
    <div class="tc-sec-title">Test Condition / Measurements</div>
  </div>

  <ExtraFieldsRenderer
    :schema="extraSchemaFor(row)"
    v-model="row.extra"
    :disabled="planLocked && !isAdminUser"
    @change="() => saveExtraDebounced(row)"
    @pick-image="(fieldKey) => openExtraImagePicker(row, fieldKey)"
  />
</div>
<!-- ✅ Measurement Widgets -->
<div v-if="shouldShowMeasurementWidgets(row)" class="tc-sec">
  <div class="tc-sec-head">
    <div class="tc-sec-title">Measurement Widgets</div>

    <div class="tc-sec-actions">
      <el-button
        size="small"
        type="primary"
        plain
        :disabled="planLocked && !isAdminUser"
        @click="addMeasureWidget(row)"
      >
        Add Row
      </el-button>
    </div>
  </div>

  <div class="measure-widget-list">
    <div
      v-for="wrap in visibleMeasureWidgetsForRow(row)"
      :key="wrap.item.id"
      class="measure-widget-row"
    >
      <div class="measure-toggle">
        <el-checkbox
          :model-value="wrap.item.enabled"
          :disabled="planLocked && !isAdminUser"
          @change="(v) => toggleMeasureWidget(row, wrap.idx, v)"
        />
      </div>

      <div class="measure-name-wrap">
        <el-input
          v-model="wrap.item.label"
          size="small"
          placeholder="名稱，例如 CPU / Memory / Disk / SSD"
          :disabled="planLocked && !isAdminUser"
          @blur="() => onMeasureWidgetsChanged(row)"
        />
      </div>

      <el-input
        v-model="wrap.item.spec"
        size="small"
        placeholder="輸入規格 / 備註"
        :disabled="planLocked && !isAdminUser"
        @input="() => onMeasureWidgetsChanged(row)"
      />

      <div class="measure-mid">Average Temp.</div>

      <el-input
        v-model="wrap.item.temp"
        size="small"
        placeholder="輸入溫度"
        :disabled="planLocked && !isAdminUser"
        @input="() => onMeasureWidgetsChanged(row)"
      />

      <div class="measure-unit">°C</div>

      <div class="measure-action">
        <el-button
          v-if="!wrap.item.isDefault"
          size="small"
          type="danger"
          text
          :disabled="planLocked && !isAdminUser"
          @click="removeMeasureWidget(row, wrap.idx)"
        >
          Delete
        </el-button>
      </div>
    </div>

    <div
      v-if="!visibleMeasureWidgetsForRow(row).length"
      class="measure-empty muted"
    >
      No visible rows
    </div>

    <div
      v-if="hiddenMeasureWidgetsForRow(row).length"
      class="measure-hidden-toolbar"
    >
      <span class="muted">Hidden Rows:</span>

      <el-button
        v-for="wrap in hiddenMeasureWidgetsForRow(row)"
        :key="wrap.item.id"
        size="small"
        plain
        :disabled="planLocked && !isAdminUser"
        @click="toggleMeasureWidget(row, wrap.idx, true)"
      >
        Show {{ wrap.item.label || `Row ${wrap.idx + 1}` }}
      </el-button>
    </div>
  </div>
</div>

                      <!-- Remark -->
                      <div class="tc-sec">
                        <div class="tc-sec-head">
                          <div class="tc-sec-title">Remark</div>

                          <div class="tc-sec-actions">
                            <el-tooltip content="Insert image from File Center" placement="top">
                              <el-button :icon="Picture" circle size="small" @click="openRemarkImagePicker(row)" />
                            </el-tooltip>

                            <el-tooltip v-if="pastingRemark[row.id]" content="Uploading..." placement="top">
                              <el-icon class="spin"><Loading /></el-icon>
                            </el-tooltip>

                            <el-popover
                              v-if="remarkImages(row.remark).length"
                              trigger="hover"
                              placement="top"
                              width="360"
                            >
                              <template #reference>
                                <el-tag size="small" type="success" effect="plain">
                                  {{ remarkImages(row.remark).length }} img
                                </el-tag>
                              </template>

                              <div class="remark-img-grid">
                                <img
                                  v-for="u in remarkImages(row.remark)"
                                  :key="u"
                                  :src="u"
                                  class="remark-img"
                                />
                              </div>
                            </el-popover>
                          </div>
                        </div>

                        <el-input
                          v-model="row.remark"
                          size="small"
                          type="textarea"
                          :autosize="{ minRows: 2, maxRows: 8 }"
                          clearable
                          :placeholder="remarkPlaceholder"
                          :disabled="!!pastingRemark[row.id]"
                          @paste="(e) => onRemarkPaste(e, row)"
                          @blur="() => onRowRemarkBlur(row)"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </el-collapse-item>
            </el-collapse>

            <el-divider />

            <div class="muted">
              Note: When Plan Locked (non-admin), you can only edit Result / Work hrs / Remark.
              Bulk Planned (Set/Unset) and Delete are locked, and editing Test Case / Procedure / Criteria is also locked.
              <br />
              ✅ Extra fields are also locked (requires admin unlock or admin operation).
            </div>
          </div>
        </el-tab-pane>

        <!-- Trash -->
        <el-tab-pane label="Trash" name="trash">
          <div class="sheet">
            <div class="sheet-title">Trash (Deleted Test Cases)</div>

            <div class="bulk-bar">
              <div class="muted">Selected: <b>{{ trashSelectedIds.length }}</b></div>

              <el-button
                type="primary"
                :icon="RefreshLeft"
                :loading="bulkRestoring"
                :disabled="!trashSelectedIds.length || (planLocked && !isAdminUser)"
                @click="bulkRestoreTrash"
              >
                Restore Selected
              </el-button>

              <el-button :icon="Refresh" :loading="loadingTrash" @click="fetchTrash">
                Reload Trash
              </el-button>

              <div class="muted" style="margin-left:auto">
                Items: {{ trashItems.length }}
              </div>
            </div>

            <el-table
              ref="trashTableRef"
              :data="trashItems"
              border
              stripe
              row-key="id"
              @selection-change="onTrashSelectionChange"
            >
              <el-table-column type="selection" width="48" />
              <el-table-column prop="category" label="Category" width="120" />
              <el-table-column prop="code" label="TC Code" width="160" />
              <el-table-column prop="testCase" label="Test Case" min-width="360" show-overflow-tooltip />
              <el-table-column prop="result" label="Result" width="120" align="center" />
              <el-table-column prop="updatedAt" label="Deleted At" width="180" />
              <el-table-column label="Action" width="140" align="center">
                <template #default="{ row }">
                  <el-button
                    size="small"
                    type="primary"
                    :disabled="planLocked && !isAdminUser"
                    @click="restoreOne(row.id)"
                  >
                    Restore
                  </el-button>
                </template>
              </el-table-column>
            </el-table>
          </div>
        </el-tab-pane>
      </el-tabs>
    </el-card>
<!-- ✅ Add Tab dialog -->
<el-dialog v-model="addTabDlg.open" title="Add Tab" width="560px">
  <el-alert
    type="info"
    :closable="false"
    show-icon
    style="margin-bottom:10px"
    title="This adds a new category tab (it will be shown even if empty). Later you can use “Add Planned” to create test cases in this tab."
  />

  <el-form label-width="120px">
    <el-form-item label="Tab Key" required>
<el-input v-model="addTabDlg.key" placeholder="e.g. NEW / IO / WIFI" />
<div class="muted" style="margin-top:6px">
  Recommended: use letters/numbers/underscore/hyphen only. This will be used as the tab name and testcase.category.
</div>
    </el-form-item>

    <el-form-item label="Tab Label">
      <el-input v-model="addTabDlg.label" placeholder="Display label (optional, defaults to Key)" />
    </el-form-item>
  </el-form>

  <template #footer>
    <el-button @click="addTabDlg.open = false">Cancel</el-button>
    <el-button type="primary" @click="createCustomTab">Create</el-button>
  </template>
</el-dialog>

    <!-- ✅ Save as Test Set dialog -->
    <el-dialog v-model="saveSetDialog" title="Save as Test Set" width="680px">
      <el-alert
        type="info"
        :closable="false"
        show-icon
        style="margin-bottom:10px"
        title="This will save the current product test cases as a reusable Test Set (so new products can import it directly)."
      />
      <el-form label-width="140px">
        <el-form-item label="Name">
          <el-input v-model="saveSet.name" placeholder="Test set name…" />
        </el-form-item>
        <el-form-item label="Description">
          <el-input v-model="saveSet.description" type="textarea" :rows="3" placeholder="Optional…" />
        </el-form-item>

        <el-form-item label="Options">
          <div style="display:flex; gap:14px; flex-wrap:wrap; align-items:center;">
            <el-checkbox v-model="saveSet.plannedOnly">Planned only</el-checkbox>
            <el-checkbox v-model="saveSet.includeDeleted">Include deleted</el-checkbox>
          </div>
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="saveSetDialog = false">Cancel</el-button>
        <el-button type="primary" :loading="savingSet" @click="saveAsTestSet">Save</el-button>
      </template>
    </el-dialog>

    <!-- ✅ Add Planned dialog -->
    <el-dialog v-model="addDlg.open" title="Add Planned Test Case" width="720px">
      <el-alert
        type="info"
        :closable="false"
        show-icon
        style="margin-bottom:10px"
        title="新增一筆 Planned 測項到目前分類（可自訂 TC Code / Test Case / Section / Procedure / Criteria）"
      />

      <el-form label-width="140px">
        <el-form-item label="Category">
          <el-input :model-value="addDlg.catKey" disabled />
        </el-form-item>

        <el-form-item label="Section">
          <el-select
            v-model="addDlg.section"
            class="w-240"
            filterable
            allow-create
            default-first-option
            placeholder="Type / select…"
          >
            <el-option v-for="s in addSectionOptions" :key="s" :label="s" :value="s" />
          </el-select>
        </el-form-item>

        <el-form-item label="TC Code">
          <el-input v-model="addDlg.code" placeholder="e.g. NEW_001" />
        </el-form-item>

        <el-form-item label="Test Case">
          <el-input v-model="addDlg.testCase" placeholder="Test case name..." />
        </el-form-item>

        <el-form-item label="Procedure">
          <el-input v-model="addDlg.testProcedure" type="textarea" :rows="4" />
        </el-form-item>

        <el-form-item label="Criteria">
          <el-input v-model="addDlg.testCriteria" type="textarea" :rows="4" />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="addDlg.open = false">Cancel</el-button>
        <el-button type="primary" :loading="addingPlanned" @click="submitAddPlanned">
          Create
        </el-button>
      </template>
    </el-dialog>

    <!-- ✅ File Center Picker -->
    <el-dialog v-model="picker.open" title="File Center" width="980px">
      <div class="picker-bar">
        <el-input
          v-model="picker.keyword"
          class="w-240"
          clearable
          placeholder="Search file name…"
          @keyup.enter="fetchFiles"
          @clear="fetchFiles"
        >
          <template #prefix><el-icon><Search /></el-icon></template>
        </el-input>

        <el-select v-model="picker.category" class="w-160" placeholder="Category" @change="fetchFiles">
          <el-option label="All" value="" />
          <el-option label="Signature" value="signature" />
          <el-option label="Image" value="image" />
        </el-select>

        <el-button :icon="Refresh" :loading="picker.loading" @click="fetchFiles">Reload</el-button>

        <div style="margin-left:auto" class="muted">
          Target: <b>{{ picker.target }}</b>
        </div>
      </div>

      <el-table :data="picker.files" border stripe v-loading="picker.loading">
        <el-table-column label="Preview" width="120" align="center">
          <template #default="{ row }">
            <el-image
              v-if="isImageFile(row)"
              :src="resolveFileUrl(row, { preferPreview: true })"
              fit="contain"
              style="width:90px;height:42px"
              :preview-src-list="[resolveFileUrl(row, { preferPreview: true })]"
              preview-teleported
            />
            <span v-else class="muted">—</span>
          </template>
        </el-table-column>

        <el-table-column label="Name" min-width="420">
          <template #default="{ row }">
            {{ fileNameOf(row) }}
            <span class="muted" v-if="row?.mimeType"> · {{ row.mimeType }}</span>
          </template>
        </el-table-column>

        <el-table-column prop="category" label="Category" width="140" align="center" />
        <el-table-column label="Action" width="140" align="center">
          <template #default="{ row }">
            <el-button type="primary" size="small" @click="pickFile(row)">Select</el-button>
          </template>
        </el-table-column>
      </el-table>

      <div style="display:flex;justify-content:flex-end;margin-top:10px">
        <el-pagination
          background
          layout="prev, pager, next"
          :current-page="picker.page"
          :page-size="picker.pageSize"
          :total="picker.total"
          @current-change="(p) => { picker.page = p; fetchFiles() }"
        />
      </div>

      <template #footer>
        <el-button @click="picker.open = false">Close</el-button>
      </template>
    </el-dialog>

<!-- ✅ 偵錯 log Drawer -->
<el-drawer
  v-model="dbg.open"
  title="Debug Log"
  direction="rtl"
  size="520px"
>
  <div class="dbg-toolbar">
    <el-input
      v-model="dbg.filter"
      clearable
      placeholder="Filter keyword…"
      @clear="() => {}"
    />
    <el-select v-model="dbg.level" class="w-160" placeholder="Level">
      <el-option label="ALL" value="all" />
      <el-option label="INFO" value="info" />
      <el-option label="WARN" value="warn" />
      <el-option label="ERROR" value="error" />
    </el-select>
    <el-button @click="dbgClear">Clear</el-button>
    <el-button type="primary" plain @click="dbgCopy">Copy JSON</el-button>
  </div>

  <div class="dbg-hint muted">
    Logs: API calls, Draft/ReportMeta load/save, import/export, paste-image upload, errors, etc. (tokens excluded).
  </div>

  <el-scrollbar height="calc(100vh - 180px)">
    <div class="dbg-list">
      <div
        v-for="(it, idx) in dbgFiltered"
        :key="idx"
        class="dbg-item"
        :class="`lvl-${it.level}`"
      >
        <div class="dbg-head">
          <b class="dbg-lvl">{{ it.level.toUpperCase() }}</b>
          <span class="dbg-ts">{{ it.ts }}</span>
        </div>
        <div class="dbg-msg">{{ it.msg }}</div>
        <pre v-if="it.extra !== undefined" class="dbg-pre">{{ formatDbgExtra(it.extra) }}</pre>
      </div>

      <div v-if="!dbgFiltered.length" class="muted" style="padding:10px 2px">
        No logs.
      </div>
    </div>
  </el-scrollbar>
</el-drawer>

  </div>
</template>

<script setup>
import { computed, reactive, ref, onMounted, watch, onBeforeUnmount, defineComponent, h, resolveComponent } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Refresh, Download, Search, Check, Close, Delete, Lock, Unlock,
  CircleCheck, CircleClose, Brush, RefreshLeft, DocumentAdd, EditPen,
  Plus, Picture, Loading, Menu
} from '@element-plus/icons-vue'

import getApiBase from '../utils/apiBase'
import { X86_TEMPLATE_V0006 } from '../constants/x86TemplateV0006'
import { X86_TEMPLATE_V0006_EXTRA_FIELDS as EXTRA_FIELDS_V0006 } from '../constants/x86TemplateV0006ExtraFields'
import ExtraFieldsRenderer from '../components/ExtraFieldsRenderer.vue'

/* ---------------- tpl fallback ---------------- */
const tpl = X86_TEMPLATE_V0006 ?? {
  version: '0006',
  categories: [],
  presets: {},
  config: {
    dutFields: [],
    utilities: [],
    supportedSections: [],
    defaultAccessories: []
  },
  extraFields: {}
}

/* ---------------- Route / IDs ---------------- */
const route = useRoute()
const router = useRouter()
const apiBase = getApiBase()
const productId = computed(() => route.params.id || route.params.productId)

/* ===================== ✅ 偵錯 log ===================== */
const dbg = reactive({
  open: false,
  logs: [],
  max: 400,
  level: 'all', // all|info|warn|error
  filter: ''
})

function tsNow () {
  const d = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}.${String(d.getMilliseconds()).padStart(3, '0')}`
}

function redact (v) {
  try {
    if (v === null || v === undefined) return v
    if (typeof v === 'string') {
      if (v.toLowerCase().includes('bearer ')) return '[REDACTED]'
      if (v.length > 5000) return `${v.slice(0, 5000)}…(truncated)`
      return v
    }
    if (Array.isArray(v)) return v.map(redact)
    if (typeof v === 'object') {
      const out = {}
      for (const [k, val] of Object.entries(v)) {
        const lk = String(k).toLowerCase()
        if (lk.includes('token') || lk.includes('authorization') || lk.includes('jwt')) out[k] = '[REDACTED]'
        else out[k] = redact(val)
      }
      return out
    }
    return v
  } catch {
    return '[unserializable]'
  }
}

function dbgAdd (level, msg, extra) {
  try {
    dbg.logs.unshift({ level, msg, extra: redact(extra), ts: tsNow() })
    if (dbg.logs.length > dbg.max) dbg.logs.splice(dbg.max)
  } catch {}
}
function dbgInfo (msg, extra) { dbgAdd('info', msg, extra) }
function dbgWarn (msg, extra) { dbgAdd('warn', msg, extra) }
function dbgError (msg, extra) { dbgAdd('error', msg, extra) }

function dbgClear () {
  // ✅ 不換掉 array reference，避免某些情況 UI/scroll 不更新
  dbg.logs.splice(0, dbg.logs.length)
  dbgInfo('dbg.clear')
}

async function dbgCopy () {
  try {
    const s = JSON.stringify(dbg.logs, null, 2)
    await navigator.clipboard.writeText(s)
    ElMessage.success('Copied')
  } catch {
    ElMessage.error('Copy failed')
  }
}

const dbgFiltered = computed(() => {
  const lv = dbg.level
  const kw = String(dbg.filter || '').trim().toLowerCase()
  return (dbg.logs || []).filter(it => {
    if (lv !== 'all' && it.level !== lv) return false
    if (!kw) return true
    const blob = `${it.level} ${it.ts} ${it.msg} ${JSON.stringify(it.extra || {})}`.toLowerCase()
    return blob.includes(kw)
  })
})

function formatDbgExtra (extra) {
  try { return JSON.stringify(extra, null, 2) } catch { return String(extra) }
}

/* 捕捉未處理的 promise error */
function onUnhandledRejection (e) {
  try {
    dbgError('unhandledrejection', { reason: e?.reason?.message || e?.reason || e })
  } catch {}
}
onMounted(() => {
  window.addEventListener('unhandledrejection', onUnhandledRejection)
})
onBeforeUnmount(() => {
  window.removeEventListener('unhandledrejection', onUnhandledRejection)
})
/* ===================== /偵錯 log end ===================== */

/* ---------------- html format helpers ---------------- */
function escapeHtml (s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function fmtDetailHtml (raw) {
  const text = String(raw ?? '').trim()
  if (!text) return `<span class="muted">—</span>`

  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean)

  const stepRe = /^(\d+)[\.\)\:]\s*(.+)$/
  const stepCount = lines.reduce((n, l) => n + (stepRe.test(l) ? 1 : 0), 0)
  const looksLikeSteps = lines.length >= 2 && stepCount / lines.length >= 0.6

  if (looksLikeSteps) {
    const items = lines.map(l => {
      const m = l.match(stepRe)
      const body = escapeHtml((m ? m[2] : l).trim())
      return `<li>${body}</li>`
    }).join('')
    return `<ol class="detail-ol">${items}</ol>`
  }

  const html = escapeHtml(text).replace(/\r?\n/g, '<br/>')
  return `<div class="detail-p">${html}</div>`
}

/* ---------------- Auth helpers ---------------- */
function authHeaders () {
  const token = localStorage.getItem('token') || sessionStorage.getItem('token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}
function handleAuth (res) {
  if (res.status === 401) {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    localStorage.removeItem('role')
    ElMessage.warning('Session expired, please login again.')
    router.push('/login')
    return true
  }
  return false
}

/* ---------------- API helpers ---------------- */
function pickArrayFromPayload (p) {
  if (Array.isArray(p)) return p
  if (p && Array.isArray(p.rows)) return p.rows
  if (p && Array.isArray(p.items)) return p.items
  if (p && Array.isArray(p.data)) return p.data
  if (p && p.data && Array.isArray(p.data.rows)) return p.data.rows
  return []
}

function summarizeBody (body) {
  if (body === undefined) return undefined
  try {
    if (body === null) return null
    if (typeof body === 'string') return body.length > 120 ? `${body.slice(0, 120)}…` : body
    if (typeof body === 'object') {
      const keys = Object.keys(body)
      return { _keys: keys.slice(0, 30), _count: keys.length }
    }
    return body
  } catch {
    return '[summary failed]'
  }
}

async function apiJson (path, { method = 'GET', params, body } = {}) {
  let url = `${apiBase}${path}`
  if (params && typeof params === 'object') {
    const qs = new URLSearchParams()
    Object.entries(params).forEach(([k, v]) => {
      if (v === undefined || v === null || v === '') return
      qs.set(k, String(v))
    })
    const s = qs.toString()
    if (s) url += `?${s}`
  }

  const headers = { ...authHeaders() }
  const hasBody = body !== undefined
  if (hasBody) headers['Content-Type'] = 'application/json'

  const rid = `${method} ${path}`
  dbgInfo('apiJson.start', { rid, params, body: summarizeBody(body) })

  const res = await fetch(url, {
    method,
    headers,
    body: hasBody ? JSON.stringify(body) : undefined
  })

  if (handleAuth(res)) {
    dbgWarn('apiJson.unauthorized', { rid })
    throw new Error('Unauthorized')
  }

  const json = await res.json().catch(() => ({}))
  if (!res.ok) {
    dbgError('apiJson.http_error', { rid, status: res.status, message: json?.message || `HTTP ${res.status}` })
    throw new Error(json?.message || `HTTP ${res.status}`)
  }
  if (json && typeof json === 'object' && 'success' in json && json.success === false) {
    dbgError('apiJson.success_false', { rid, message: json.message || 'Request failed' })
    throw new Error(json.message || 'Request failed')
  }

  dbgInfo('apiJson.ok', { rid, status: res.status })
  return (json && typeof json === 'object' && 'data' in json) ? json.data : json
}

async function apiJsonTry (paths, options) {
  let lastErr = null
  for (const p of paths) {
    try { return await apiJson(p, options) } catch (e) { lastErr = e }
  }
  throw lastErr || new Error('Request failed')
}

async function apiBlob (path) {
  const rid = `GET ${path}`
  dbgInfo('apiBlob.start', { rid })
  const res = await fetch(`${apiBase}${path}`, { headers: { ...authHeaders() } })
  if (handleAuth(res)) {
    dbgWarn('apiBlob.unauthorized', { rid })
    throw new Error('Unauthorized')
  }
  if (!res.ok) {
    dbgError('apiBlob.http_error', { rid, status: res.status })
    throw new Error(`HTTP ${res.status}`)
  }
  dbgInfo('apiBlob.ok', { rid, status: res.status })
  return await res.blob()
}

async function apiBlobTry (paths) {
  let lastErr = null
  for (const p of paths) {
    try { return await apiBlob(p) } catch (e) { lastErr = e }
  }
  throw lastErr || new Error('Export failed')
}

/* ✅ FormData upload（Ctrl+V 貼圖用） */
async function apiForm (path, formData) {
  const rid = `POST ${path}`
  dbgInfo('apiForm.start', { rid })
  const res = await fetch(`${apiBase}${path}`, {
    method: 'POST',
    headers: { ...authHeaders() },
    body: formData
  })
  if (handleAuth(res)) {
    dbgWarn('apiForm.unauthorized', { rid })
    throw new Error('Unauthorized')
  }
  const json = await res.json().catch(() => ({}))
  if (!res.ok) {
    dbgError('apiForm.http_error', { rid, status: res.status, message: json?.message })
    throw new Error(json?.message || `HTTP ${res.status}`)
  }
  if (json && typeof json === 'object' && json.success === false) {
    dbgError('apiForm.success_false', { rid, message: json.message })
    throw new Error(json.message || 'Upload failed')
  }
  dbgInfo('apiForm.ok', { rid, status: res.status })
  return (json && typeof json === 'object' && 'data' in json) ? json.data : json
}

/* ===================== ✅ keyed debounce (統一 timer) ===================== */
function createKeyedDebouncer (delay = 150) {
  const timers = new Map()

  const run = (key, fn) => {
    if (!key) return
    const old = timers.get(key)
    if (old) clearTimeout(old)

    const t = window.setTimeout(async () => {
      try { await fn() } finally { timers.delete(key) }
    }, delay)

    timers.set(key, t)
  }

  const cancel = (key) => {
    const t = timers.get(key)
    if (t) clearTimeout(t)
    timers.delete(key)
  }

  const flush = async (keys, resolver) => {
    const tasks = []
    for (const key of keys) {
      cancel(key)
      const p = resolver(key)
      if (p) tasks.push(p)
    }
    if (tasks.length) await Promise.allSettled(tasks)
  }

  return { timers, run, cancel, flush }
}

/* ---------------- State ---------------- */
const activeTab = ref('dashboard')
const loading = ref(false)
const ctrlDrawer = ref(false)

// ✅ isMobile（跟 CSS breakpoint 1100px 一致）
const isMobile = ref(false)

let _mq = null
const _updateIsMobile = () => {
  isMobile.value = _mq ? _mq.matches : (window.innerWidth <= 1100)
}

onMounted(() => {
  _mq = window.matchMedia('(max-width: 1100px)')
  _updateIsMobile()
  _mq.addEventListener?.('change', _updateIsMobile)
})

onBeforeUnmount(() => {
  _mq?.removeEventListener?.('change', _updateIsMobile)
})

// 切回桌機時，把 drawer 關掉（避免畫面狀態不一致）
watch(isMobile, (v) => {
  if (!v) ctrlDrawer.value = false
})

/**
 * ✅ 同一份按鈕：桌機 actions / drawer actions / mobile quick bar 共用
 * - variant="full": Save as Test Set / Reload / Confirm+Unlock / Export / Debug Log
 * - variant="quick": Export / Reload / Controls(開 drawer)
 */
const PtActionButtons = defineComponent({
  name: 'PtActionButtons',
  props: {
    variant: { type: String, default: 'full' }
  },
  setup (props) {
    const _pickComp = (a, b) => {
      const ca = resolveComponent(a)
      if (!ca || typeof ca === 'string') return resolveComponent(b)
      return ca
    }

    const ElButton = _pickComp('ElButton', 'el-button')
    const ElTooltip = _pickComp('ElTooltip', 'el-tooltip')

    const btn = (p) => {
      const {
        label,
        type,
        icon,
        plain,
        text,
        loading,
        disabled,
        onClick
      } = p || {}

      return h(
        ElButton,
        {
          type,
          icon,
          plain: !!plain,
          text: !!text,
          loading: !!loading,
          disabled: !!disabled,
          onClick
        },
        { default: () => (label ?? '') }
      )
    }

    const wrapTooltip = (content, vnode) => {
      return h(
        ElTooltip,
        { content, placement: 'bottom' },
        { default: () => vnode }
      )
    }

    return () => {
      const isFull = props.variant !== 'quick'
      const nodes = []

      if (isFull) {
        nodes.push(
          h(
            ElTooltip,
            { content: 'Save current product testcases as reusable Test Set', placement: 'bottom' },
            {
              default: () =>
                btn({
                  label: 'Save as Test Set',
                  type: 'success',
                  icon: DocumentAdd,
                  disabled: (testcases.value?.length || 0) === 0,
                  onClick: openSaveSetDialog
                })
            }
          )
        )
      }

      // Reload
      nodes.push(
        btn({
          label: props.variant === 'quick' ? '' : 'Reload',
          icon: Refresh,
          loading: loading.value,
          onClick: fetchAll
        })
      )

      if (isFull) {
        // Confirm Plan
        nodes.push(
          btn({
            label: 'Confirm Plan',
            type: 'warning',
            icon: Lock,
            disabled: !!planLocked.value,
            loading: locking.value,
            onClick: confirmPlan
          })
        )

        // Unlock (only when locked)
        if (planLocked.value) {
          if (!isAdminUser.value) {
            nodes.push(
              wrapTooltip(
                'Unlock needs admin permission',
                btn({
                  label: 'Unlock',
                  type: 'info',
                  icon: Unlock,
                  disabled: true
                })
              )
            )
          } else {
            nodes.push(
              btn({
                label: 'Unlock',
                type: 'info',
                icon: Unlock,
                loading: locking.value,
                onClick: unlockPlan
              })
            )
          }
        }
      }

      // Export
      nodes.push(
        btn({
          label: props.variant === 'quick' ? 'Export' : 'Export PDF',
          type: 'primary',
          icon: Download,
          loading: downloading.value,
          onClick: downloadReport
        })
      )

      if (props.variant === 'quick') {
        nodes.push(
          btn({
            label: 'Controls',
            icon: Menu,
            onClick: () => { ctrlDrawer.value = true }
          })
        )
      } else {
        nodes.push(
          btn({
            label: 'Debug Log',
            plain: true,
            onClick: () => { dbg.open = true }
          })
        )
      }

      return h('div', { class: isFull ? 'pt-actions-frag' : 'pt-quick-frag' }, nodes)
    }
  }
})



const downloading = ref(false)
const locking = ref(false)

const product = ref(null)
const testcases = ref([])

const kw = ref('')
const planFilter = ref('')
const resultFilter = ref('')

const remarkPlaceholder = 'Ctrl+V paste screenshot / write notes…'

// ✅ 一定要很早宣告（避免草稿 watch / computed 先讀到 TDZ）
const selectionMap = ref({}) // { [catKey]: { [section]: number[] } }

/* ---------------- Basic helpers ---------------- */
function goProductPage () {
  const pid = productId.value
  if (!pid) return
  router.push(`/products/${pid}`).catch(() => {})
}

function pct (v) {
  const n = Number(v) || 0
  return `${(Math.round(n * 1000) / 10).toFixed(1)}%`
}
function normResult (v) {
  const s = String(v ?? 'pending').trim().toLowerCase()
  return ['pass', 'fail', 'pending'].includes(s) ? s : 'pending'
}
function normPlanned (v) { return v !== false }

function toNumOrNull (v) {
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

function tcPrefixOf (row) {
  const code = String(row?.code || row?.tcCode || row?.testCode || '').trim()
  if (!code) return ''
  return String(code.split('_')[0] || '').toUpperCase()
}

/* ---------------- Draft (server first, fallback localStorage) ---------------- */
const draft = reactive({
  applying: false,
  loaded: false,
  dirty: false,
  saving: false,
  savedAt: 0,
  err: ''
})

const draftSavedText = computed(() => {
  if (!draft.savedAt) return ''
  const d = new Date(draft.savedAt)
  const pad = (n) => String(n).padStart(2, '0')
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
})

function draftStorageKey () {
  return `pt_draft_${String(productId.value || '')}`
}

function buildDraftPayload () {
  // ✅ catEnabled 改由 report_metas 控制（DB），draft 不再當 source of truth
  return {
    v: 1,
    updatedAt: new Date().toISOString(),
    activeTab: activeTab.value,
    kw: kw.value,
    planFilter: planFilter.value,
    resultFilter: resultFilter.value,
    selectionMap: selectionMap.value
  }
}

function applyDraftPayload (d) {
  if (!d || typeof d !== 'object') return
  draft.applying = true
  try {
    if (typeof d.kw === 'string') kw.value = d.kw
    if (typeof d.planFilter === 'string') planFilter.value = d.planFilter
    if (typeof d.resultFilter === 'string') resultFilter.value = d.resultFilter
    if (d.selectionMap && typeof d.selectionMap === 'object') selectionMap.value = d.selectionMap
    if (typeof d.activeTab === 'string') activeTab.value = d.activeTab || 'dashboard'
  } finally {
    draft.applying = false
  }
}

async function loadDraft () {
  const pid = productId.value
  if (!pid) return

  dbgInfo('draft.load.start', { pid })

  // ✅ Use report_metas as single source (avoid 404 spam)
  try {
    const row = await apiJson(`/report-metas/by-product/${pid}`, { method: 'GET' })

    // draft could be stored in configJson.draft (recommended) or legacy fields
    const d =
      row?.configJson?.draft ||
      row?.configJson?.testPlanDraft ||
      row?.draft ||
      row?.testPlanDraft ||
      null

    if (d) {
      applyDraftPayload(d)
      draft.loaded = true
      draft.dirty = false
      draft.savedAt = Date.now()
      dbgInfo('draft.load.ok(report_metas)', { pid })
      return
    }
  } catch (e) {
    dbgWarn('draft.load.report_metas_failed', { pid, message: e?.message || e })
  }

  // 2) fallback localStorage

  try {
    const raw = localStorage.getItem(draftStorageKey())
    if (!raw) return
    const d = JSON.parse(raw)
    applyDraftPayload(d)
    draft.loaded = true
    draft.dirty = false
    draft.savedAt = Date.now()
    dbgInfo('draft.load.ok(localStorage)', { pid })
  } catch (e) {
    dbgWarn('draft.load.local_failed', { pid, message: e?.message || e })
  }
}

async function saveDraftNow () {
  const pid = productId.value
  if (!pid) return
  const payload = buildDraftPayload()

  draft.saving = true
  draft.err = ''
  dbgInfo('draft.save.start', { pid })

  try {
    // ✅ Save into report_metas.configJson.draft (avoid missing legacy routes)
    try {
      // if reportMeta not loaded yet, load once
      if (!reportMetaLoaded.value) {
        await fetchReportMetaFlags()
      }

      rmeta.configJson = { ...(rmeta.configJson || {}), draft: payload }

      await apiJson(`/report-metas/by-product/${pid}`, {
        method: 'PUT',
        body: {
          reportName: rmeta.reportName,
          revision: rmeta.revision,
          tplVersion: rmeta.tplVersion,
          flagsJson: rmeta.flagsJson,
          configJson: rmeta.configJson
        }
      })

      dbgInfo('draft.save.ok(report_metas)', { pid })
    } catch (e) {
      // fallback localStorage
      localStorage.setItem(draftStorageKey(), JSON.stringify(payload))
      dbgWarn('draft.save.fallback_localStorage', { pid, message: e?.message || e })
    }

    draft.dirty = false
    draft.savedAt = Date.now()
  } finally {
    draft.saving = false
  }
}


let draftTimer = null
function markDraftDirty () {
  if (draft.applying) return
  draft.dirty = true
  if (draftTimer) clearTimeout(draftTimer)
  draftTimer = setTimeout(() => {
    if (draft.dirty) void saveDraftNow()
  }, 800)
}

watch([kw, planFilter, resultFilter, activeTab], () => {
  if (!draft.loaded) return
  markDraftDirty()
})
watch(selectionMap, () => {
  if (!draft.loaded) return
  markDraftDirty()
}, { deep: true })

/* ✅ Category tab show/hide (DB sync via report_metas.flagsJson.sections) */
const catEnabled = reactive({})

// local fallback（保留）
function storageKeyCatEnabled () {
  return `pt_cat_enabled_${String(productId.value || '')}`
}
function loadCatEnabled () {
  try {
    const raw = localStorage.getItem(storageKeyCatEnabled())
    if (!raw) return
    const obj = JSON.parse(raw)
    if (obj && typeof obj === 'object') Object.keys(obj).forEach(k => { catEnabled[k] = obj[k] !== false })
  } catch {}
}
function persistCatEnabled () {
  try { localStorage.setItem(storageKeyCatEnabled(), JSON.stringify({ ...catEnabled })) } catch {}
}
function ensureCatEnabled (keys) {
  keys.forEach(k => { if (catEnabled[k] === undefined) catEnabled[k] = true })
}
function isCatEnabled (k) { return catEnabled[k] !== false }

/* ---------------- Cover meta (UI source) ---------------- */
const meta = reactive({
  projectName: '',
  reportName: 'Test Report',
  revision: '0.1',
  releaseDate: new Date().toISOString().slice(0, 10),
  releasedDate: new Date().toISOString().slice(0, 10),

  preparedSigFileId: null,
  preparedSigFileName: '',
  preparedSigUrl: '',

  reviewedSigFileId: null,
  reviewedSigFileName: '',
  reviewedSigUrl: ''
})

function encodeMetaB64 (obj) {
  try {
    const json = JSON.stringify(obj || {})
    return btoa(unescape(encodeURIComponent(json)))
  } catch { return '' }
}
function buildCoverMetaForQuery () {
  return {
    projectName: meta.projectName || '',
    reportName: meta.reportName || '',
    revision: meta.revision || '',
    releaseDate: meta.releaseDate || '',
    releasedDate: meta.releaseDate || '',
    preparedSigFileId: meta.preparedSigFileId ?? null,
    reviewedSigFileId: meta.reviewedSigFileId ?? null,
    preparedSigFileName: meta.preparedSigFileName || '',
    reviewedSigFileName: meta.reviewedSigFileName || ''
  }
}
function signatureUrlById (id) {
  const n = Number(id)
  if (!Number.isFinite(n) || n <= 0) return ''
  return `${apiBase}/files/${n}/preview`
}
function ensureSignatureUrls () {
  if (meta.preparedSigFileId && !meta.preparedSigUrl) meta.preparedSigUrl = signatureUrlById(meta.preparedSigFileId)
  if (meta.reviewedSigFileId && !meta.reviewedSigUrl) meta.reviewedSigUrl = signatureUrlById(meta.reviewedSigFileId)
}
function metaPayloadForSave () {
  const m = buildCoverMetaForQuery()
  return {
    projectName: m.projectName,
    reportName: m.reportName,
    revision: m.revision,
    releaseDate: m.releaseDate,
    releasedDate: m.releasedDate,
    preparedSigFileId: m.preparedSigFileId,
    preparedSigFileName: m.preparedSigFileName,
    reviewedSigFileId: m.reviewedSigFileId,
    reviewedSigFileName: m.reviewedSigFileName
  }
}

/* ===================== report_metas 同步（Show 勾選自動存 DB） ===================== */
const reportMetaSaving = ref(false)
const reportMetaLoaded = ref(false)
const reportMetaOk = ref(false)
let reportMetaPendingSave = false

const rmeta = reactive({
  reportName: 'Test Report',
  revision: '0.1',
  tplVersion: 'v0006',
  flagsJson: { sections: {}, env: {}, utilities: {} },
  configJson: {}
})

// ===== Cover Meta store in report_metas.configJson.coverMeta =====
const COVER_META_KEY = 'coverMeta'
let applyingCoverFromRmeta = false

// ===== Appearance of Assembled System store in report_metas.configJson.appearanceAssembled =====
const APPEARANCE_KEY = 'appearanceAssembled'
let applyingAppearanceFromRmeta = false

const appearancePick = reactive({ bIdx: -1, sIdx: -1 })

function mkAppearanceSlot () {
  return { caption: '', fileId: null, name: '', url: '' }
}
function mkAppearanceBlock () {
  return { slots: [mkAppearanceSlot(), mkAppearanceSlot(), mkAppearanceSlot()] }
}

const appearanceBlocks = ref([mkAppearanceBlock(), mkAppearanceBlock()])

function imageUrlById (id) {
  const n = Number(id)
  if (!Number.isFinite(n) || n <= 0) return ''
  return `${apiBase}/files/${n}/preview`
}

function normalizeAppearanceBlocks (arr) {
  const blocks = Array.isArray(arr) ? arr : []
  const out = blocks.map(b => {
    const slots = Array.isArray(b?.slots) ? b.slots : []
    const fixed = [0, 1, 2].map(i => {
      const s = slots[i] || {}
      const fileId = s.fileId ?? null
      const url = s.url || (fileId ? imageUrlById(fileId) : '')
      return {
        caption: String(s.caption || ''),
        fileId: fileId ? Number(fileId) : null,
        name: String(s.name || ''),
        url
      }
    })
    return { slots: fixed }
  })

  // default = 2 blocks
  while (out.length < 2) out.push(mkAppearanceBlock())
  return out
}

function applyAppearanceFromRmetaConfig () {
  const v = rmeta?.configJson?.[APPEARANCE_KEY]
  applyingAppearanceFromRmeta = true
  try {
    appearanceBlocks.value = normalizeAppearanceBlocks(v)
  } finally {
    applyingAppearanceFromRmeta = false
  }
}

function writeAppearanceToRmetaConfig () {
  rmeta.configJson = {
    ...(rmeta.configJson || {}),
    [APPEARANCE_KEY]: appearanceBlocks.value
  }
}

const appearanceDisabled = computed(() => planLocked.value && !isAdminUser.value)

watch(appearanceBlocks, () => {
  if (applyingAppearanceFromRmeta) return
  if (!reportMetaLoaded.value) return
  writeAppearanceToRmetaConfig()
  scheduleSaveReportMetaFlags()
}, { deep: true })

function resetAppearanceBlocks () {
  appearanceBlocks.value = [mkAppearanceBlock(), mkAppearanceBlock()]
}
function addAppearanceBlock () {
  appearanceBlocks.value = [...appearanceBlocks.value, mkAppearanceBlock()]
}
function removeAppearanceBlock (bIdx) {
  const next = appearanceBlocks.value.slice()
  next.splice(bIdx, 1)
  appearanceBlocks.value = next.length ? next : [mkAppearanceBlock(), mkAppearanceBlock()]
}

function clearAppearancePhoto (bIdx, sIdx) {
  const next = appearanceBlocks.value.map(b => ({ slots: b.slots.map(s => ({ ...s })) }))
  const slot = next?.[bIdx]?.slots?.[sIdx]
  if (!slot) return
  slot.fileId = null
  slot.url = ''
  slot.name = ''
  appearanceBlocks.value = next
}

function applyCoverMetaFromRmetaConfig () {
  const c = rmeta?.configJson?.[COVER_META_KEY]
  if (!c || typeof c !== 'object') return

  applyingCoverFromRmeta = true
  try {
    meta.projectName = c.projectName ?? meta.projectName
    meta.reportName  = c.reportName  ?? meta.reportName
    meta.revision    = c.revision    ?? meta.revision

    const d = c.releaseDate || c.releasedDate
    if (d) {
      meta.releaseDate = String(d)
      meta.releasedDate = String(d)
    }

    meta.preparedSigFileId   = c.preparedSigFileId   ?? meta.preparedSigFileId
    meta.preparedSigFileName = c.preparedSigFileName ?? meta.preparedSigFileName
    meta.reviewedSigFileId   = c.reviewedSigFileId   ?? meta.reviewedSigFileId
    meta.reviewedSigFileName = c.reviewedSigFileName ?? meta.reviewedSigFileName

    ensureSignatureUrls()
  } finally {
    applyingCoverFromRmeta = false
  }
}

function writeCoverMetaToRmetaConfig () {
  rmeta.configJson = {
    ...(rmeta.configJson || {}),
    [COVER_META_KEY]: metaPayloadForSave()
  }
}

// ✅ header/cover 用 meta 當 UI source：meta 變更時同步回 rmeta & DB
watch(
  () => [meta.reportName, meta.revision],
  () => {
    if (applyingCoverFromRmeta) return
    if (!reportMetaLoaded.value) return
    rmeta.reportName = String(meta.reportName || rmeta.reportName || '')
    rmeta.revision = String(meta.revision || rmeta.revision || '')
    writeCoverMetaToRmetaConfig()
    scheduleSaveReportMetaFlags()
    writeAppearanceToRmetaConfig()
  }
)
/* ===================== Reliability Env removed ===================== */
/* ===================== ✅ Utilities Show flags (persist in report_metas.flagsJson.utilities) ===================== */
const utilEnabled = reactive({})

function normalizeUtilityKey (s) {
  return String(s || '')
    .trim()
    .replace(/[^\w\-]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 64)
}
function utilKeyOf (u, idx) {
  return normalizeUtilityKey(u?.key || u?.name || `util_${idx + 1}`)
}
function ensureUtilitiesEnabled () {
  const list = tpl.config?.utilities || []
  for (let i = 0; i < list.length; i++) {
    const k = utilKeyOf(list[i], i)
    if (utilEnabled[k] === undefined) utilEnabled[k] = true
  }
}
const utilitiesRows = computed(() => {
  ensureUtilitiesEnabled()
  const list = tpl.config?.utilities || []
  return list.map((u, i) => ({ ...u, _key: utilKeyOf(u, i) }))
})
function applyUtilitiesFlagsToState () {
  ensureUtilitiesEnabled()
  const m = rmeta.flagsJson?.utilities
  if (!m || typeof m !== 'object') return
  for (const [k, v] of Object.entries(m)) utilEnabled[k] = (v !== false)
}
function buildUtilitiesFlagsFromState () {
  ensureUtilitiesEnabled()
  const out = {}
  for (const k of Object.keys(utilEnabled)) out[k] = utilEnabled[k] !== false
  return out
}
function onToggleUtility (key, v) {
  utilEnabled[key] = (v !== false)
  scheduleSaveReportMetaFlags()
}

/* ===================== ✅ Custom Tabs (新增分頁) ===================== */
const customTabs = ref([]) // [{ key, label, enabled }]
const CUSTOM_TABS_KEY = 'customTabs'
let applyingCustomTabsFromRmeta = false

function customTabsStorageKey () {
  return `pt_custom_tabs_${String(productId.value || '')}`
}
function normalizeTabKey (s) {
  return String(s || '')
    .trim()
    .replace(/[^\w\-]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 32)
}
function loadCustomTabs () {
  try {
    const raw = localStorage.getItem(customTabsStorageKey())
    if (!raw) return
    const arr = JSON.parse(raw)
    if (!Array.isArray(arr)) return
    customTabs.value = arr.map(t => ({
      key: normalizeTabKey(t?.key),
      label: String(t?.label || '').trim(),
      enabled: t?.enabled !== false
    })).filter(t => t.key)
  } catch {}
}
function persistCustomTabs () {
  try { localStorage.setItem(customTabsStorageKey(), JSON.stringify(customTabs.value || [])) } catch {}
}
function applyCustomTabsFromRmetaConfig () {
  const arr = rmeta?.configJson?.[CUSTOM_TABS_KEY]
  if (!Array.isArray(arr)) return

  applyingCustomTabsFromRmeta = true
  try {
    customTabs.value = arr.map(t => ({
      key: normalizeTabKey(t?.key),
      label: String(t?.label || '').trim(),
      enabled: t?.enabled !== false
    })).filter(t => t.key)

    for (const t of customTabs.value) {
      if (catEnabled[t.key] === undefined) catEnabled[t.key] = true
      catEnabled[t.key] = t.enabled !== false
    }
  } finally {
    applyingCustomTabsFromRmeta = false
  }
}
function writeCustomTabsToRmetaConfig () {
  rmeta.configJson = {
    ...(rmeta.configJson || {}),
    [CUSTOM_TABS_KEY]: (customTabs.value || []).map(t => ({
      key: normalizeTabKey(t.key),
      label: String(t.label || '').trim(),
      enabled: t.enabled !== false
    }))
  }
}
function syncCustomTabsEnabledFromCatEnabled () {
  const map = new Map((customTabs.value || []).map((t, i) => [t.key, i]))
  for (const [k, v] of Object.entries(catEnabled)) {
    if (!map.has(k)) continue
    const idx = map.get(k)
    if (customTabs.value[idx]) customTabs.value[idx].enabled = (v !== false)
  }
}
watch(customTabs, () => {
  persistCustomTabs()
  if (applyingCustomTabsFromRmeta) return
  if (!reportMetaLoaded.value) return
  writeCustomTabsToRmetaConfig()
  scheduleSaveReportMetaFlags()
}, { deep: true })

/* ✅ Add Tab dialog actions */
const addTabDlg = reactive({ open: false, key: '', label: '' })
function openAddTabDialog () {
  addTabDlg.key = ''
  addTabDlg.label = ''
  addTabDlg.open = true
}
function createCustomTab () {
  const key = normalizeTabKey(addTabDlg.key)
  const label = String(addTabDlg.label || '').trim() || key
  const reserved = new Set(['dashboard', 'cover', 'summary', 'contents', 'config', 'trash'])

  if (!key) return ElMessage.warning('Tab Key is required')
  if (reserved.has(key.toLowerCase())) return ElMessage.warning('Tab Key conflicts with a system tab name')

  const exists =
    (tpl.categories || []).some(c => String(c.key || '').toLowerCase() === key.toLowerCase()) ||
    (customTabs.value || []).some(t => String(t.key || '').toLowerCase() === key.toLowerCase())

  if (exists) return ElMessage.warning('This Tab Key already exists')

  customTabs.value.push({ key, label, enabled: true })
  catEnabled[key] = true
  activeTab.value = key
  addTabDlg.open = false
  ElMessage.success(`Tab added: ${label}`)
}

/* ---------------- report_metas sections mapping ---------------- */
function catKeyToSectionKey (k) {
  const s = String(k || '').trim().toLowerCase()
  if (s === 'hw') return 'hw'
  if (s === 'perf' || s === 'performance') return 'perf'
  if (s === 'reli' || s === 'reliability') return 'reli'
  if (s === 'stab' || s === 'stability') return 'stab'
  if (s === 'pwr' || s === 'power') return 'pwr'
  if (s === 'thrm' || s === 'therm' || s === 'thermal') return 'thrm'
  if (s === 'esd') return 'esd'
  if (s === 'mep' || s === 'mech' || s === 'mechanical') return 'mep'
  return null
}

function applySectionsToCatEnabled () {
  const sections = rmeta.flagsJson?.sections
  if (!sections || typeof sections !== 'object') return
  const has = (obj, k) => Object.prototype.hasOwnProperty.call(obj, k)

  const keys = new Set([
    ...(tpl.categories || []).map(c => c.key),
    ...Object.keys(catEnabled)
  ])
  ensureCatEnabled(Array.from(keys))

  for (const ck of keys) {
    const sk = catKeyToSectionKey(ck)
    if (!sk) continue
    if (has(sections, sk)) catEnabled[ck] = (sections[sk] === false) ? false : true
  }
}

function buildSectionsFromCatEnabled () {
  const out = {}
  const allow = ['hw', 'perf', 'reli', 'stab', 'pwr', 'thrm', 'esd', 'mep']
  for (const ck of Object.keys(catEnabled)) {
    const sk = catKeyToSectionKey(ck)
    if (!sk) continue
    out[sk] = catEnabled[ck] !== false
  }
  for (const k of allow) if (out[k] === undefined) out[k] = true
  return out
}

/* ✅ catEnabled watch：存 local + 同步 customTabs.enabled */
watch(catEnabled, () => {
  persistCatEnabled()
  if (!applyingCustomTabsFromRmeta) syncCustomTabsEnabledFromCatEnabled()
}, { deep: true })

async function fetchReportMetaFlags () {
  const pid = Number(productId.value)
  if (!Number.isFinite(pid) || pid <= 0) return

  reportMetaOk.value = false
  dbgInfo('reportMeta.fetch.start', { pid })

  try {
    const row = await apiJson(`/report-metas/by-product/${pid}`, { method: 'GET' })

    rmeta.reportName = row?.reportName || rmeta.reportName
    rmeta.revision = row?.revision || rmeta.revision
    rmeta.tplVersion = row?.tplVersion || rmeta.tplVersion
    rmeta.flagsJson = row?.flagsJson || { sections: {}, env: {}, utilities: {} }
    rmeta.configJson = row?.configJson || {}

    reportMetaOk.value = true
    dbgInfo('reportMeta.fetch.ok', { pid })
  } catch (e) {
    dbgWarn('reportMeta.fetch.failed', { pid, message: e?.message || e })
  } finally {
    reportMetaLoaded.value = true

    if (reportMetaOk.value) {
      try { applySectionsToCatEnabled() } catch (e) { dbgWarn('reportMeta.applySections.failed', { pid, message: e?.message || e }) }
      try { applyCustomTabsFromRmetaConfig() } catch (e) { dbgWarn('reportMeta.applyCustomTabs.failed', { pid, message: e?.message || e }) }
      try { applyUtilitiesFlagsToState() } catch (e) { dbgWarn('reportMeta.applyUtilities.failed', { pid, message: e?.message || e }) }
      try { applyCoverMetaFromRmetaConfig() } catch (e) { dbgWarn('reportMeta.applyCoverMeta.failed', { pid, message: e?.message || e }) }
      try { applyAppearanceFromRmetaConfig() } catch (e) { dbgWarn('reportMeta.applyAppearance.failed', { pid, message: e?.message || e }) }

      if (rmeta.reportName) meta.reportName = rmeta.reportName
      if (rmeta.revision) meta.revision = rmeta.revision
    }

    if (reportMetaPendingSave) {
      reportMetaPendingSave = false
      void saveReportMetaFlagsNow()
    }
  }
}

async function saveReportMetaFlagsNow () {
  const pid = Number(productId.value)
  if (!Number.isFinite(pid) || pid <= 0) return

  if (!reportMetaLoaded.value) {
    reportMetaPendingSave = true
    dbgWarn('reportMeta.save.deferred_not_loaded', { pid })
    return
  }

  reportMetaSaving.value = true
  dbgInfo('reportMeta.save.start', { pid })

  try {
  const sections = buildSectionsFromCatEnabled()
  const utilities = buildUtilitiesFlagsFromState()
  rmeta.flagsJson = { ...(rmeta.flagsJson || {}), sections, env: {}, utilities }

    writeCoverMetaToRmetaConfig()
    writeCustomTabsToRmetaConfig()

    const row = await apiJson(`/report-metas/by-product/${pid}`, {
      method: 'PUT',
      body: {
        reportName: rmeta.reportName,
        revision: rmeta.revision,
        tplVersion: rmeta.tplVersion,
        flagsJson: rmeta.flagsJson,
        configJson: rmeta.configJson
      }
    })

    rmeta.flagsJson = row?.flagsJson || rmeta.flagsJson
    rmeta.configJson = row?.configJson || rmeta.configJson

    dbgInfo('reportMeta.save.ok', { pid })
  } catch (e) {
    dbgError('reportMeta.save.failed', { pid, message: e?.message || e })
  } finally {
    reportMetaSaving.value = false
  }
}

let reportMetaTimer = null
function scheduleSaveReportMetaFlags () {
  if (reportMetaTimer) clearTimeout(reportMetaTimer)
  reportMetaTimer = window.setTimeout(() => { void saveReportMetaFlagsNow() }, 450)
}

function onToggleCategory (k) {
  if (!isCatEnabled(k) && activeTab.value === k) activeTab.value = 'dashboard'
  scheduleSaveReportMetaFlags()
}

/* ---------------- Saved test sets ---------------- */
const testSets = ref([])
const loadingSets = ref(false)
const importKey = ref('PRESET:V1')
const importMode = ref('append')
const skipExistingImport = ref(true)
const importing = ref(false)

function setLabel (s) {
  const name = s?.name || s?.title || 'Test Set'
  const ver = s?.version ? ` v${s.version}` : ''
  const src = s?.fromProductId ? ` (from #${s.fromProductId})` : ''
  return `#${s.id} ${name}${ver}${src}`
}

async function fetchTestSets () {
  loadingSets.value = true
  try {
    const data = await apiJson('/default-test-sets', { params: { includeDeleted: false } })
    testSets.value = Array.isArray(data) ? data : pickArrayFromPayload(data)
  } catch (e) {
    dbgWarn('fetchTestSets.failed', { message: e?.message || e })
  } finally {
    loadingSets.value = false
  }
}

/* ---------------- Config ---------------- */
function emptyDut (no) {
  return {
    dutNo: no,
    systemModelName: '',
    mbVersion: '',
    cpu: '',
    memory: '',
    os: '',
    hardDrive: '',
    display: '',
    power: '',
    biosVersion: '',
    turboMode: '',
    ecMcuFwVersion: '',
    edidVersion: ''
  }
}
const config = reactive({
  dutEnabled: [true],
  duts: [emptyDut(1)],
  supported: {
    memory: [],
    storage: [],
    cpu: [],
    other: [],
    accessories: [...(tpl.config?.defaultAccessories || [])]
  }
})

/* ---------------- Helpers ---------------- */
const isAdminUser = computed(() => {
  const r = String(localStorage.getItem('role') || '').toLowerCase()
  if (r) return r === 'admin'
  try {
    const u = JSON.parse(localStorage.getItem('user') || '{}')
    return String(u?.role || '').toLowerCase() === 'admin'
  } catch {
    return false
  }
})

const planLocked = computed(() => Boolean(product.value?.planLocked))

const productTitle = computed(() => {
  const p = product.value
  return p?.name || p?.model || meta.projectName || `#${productId.value}`
})

/* ---- optional: estimated hours map from template ---- */
const estByCode = (() => {
  const map = new Map()
  const presets = tpl?.presets || {}
  Object.values(presets).forEach(arr => {
    if (!Array.isArray(arr)) return
    arr.forEach(it => {
      const code = String(it?.code || it?.tcCode || it?.testCode || '').trim()
      const est = Number(it?.estHours ?? it?.estHrs ?? it?.estimatedHours ?? it?.hours ?? NaN)
      if (code && Number.isFinite(est)) map.set(code, est)
    })
  })
  return map
})()

function estHoursOf (tc) {
  const direct = Number(tc?.estHours ?? tc?.estHrs ?? tc?.estimatedHours ?? NaN)
  if (Number.isFinite(direct)) return direct
  const code = String(tc?.code || '').trim()
  if (code && estByCode.has(code)) return Number(estByCode.get(code)) || 0
  return 0
}

/* ===================== category/section normalize ===================== */
function catKeyOf (tc) {
  const raw = String(tc.category ?? '').trim()
  const up = raw.toUpperCase()

  const tplKeys = (tpl.categories || []).map(c => String(c.key))
  if (tplKeys.includes(raw)) return raw
  if (tplKeys.includes(up)) return up

  // ✅ custom tab keys
  for (const t of (customTabs.value || [])) {
    const k = String(t?.key || '').trim()
    if (!k) continue
    if (k === raw) return k
    if (k.toUpperCase() === up) return k
  }

  // fallback mapping
  if (up === 'HW') return 'HW'
  if (up === 'PERF') return 'Perf'
  if (up === 'RELI') return 'Reli'
  if (up === 'STAB') return 'Stab'
  if (up === 'PWR' || up === 'POWER') return 'PWR'
  if (up === 'THRM' || up === 'THERM' || up === 'THERMAL') return 'Thrm'
  if (up === 'ESD') return 'ESD'
  if (up === 'MEP' || up === 'MECH') return 'MEP'
  return 'HW'
}

function sectionOf (tc) {
  const s = String(tc.section ?? tc.subGroup ?? tc.group ?? '').trim()
  if (s) return s
  const code = String(tc.code ?? '').trim()
  if (code.includes('_')) return code.split('_')[0]
  return 'General'
}

function calc (items) {
  const total = items.length
  let pass = 0
  let fail = 0
  for (const x of items) {
    const r = normResult(x.result)
    if (r === 'pass') pass++
    else if (r === 'fail') fail++
  }
  const pending = total - pass - fail
  const completed = pass + fail
  return {
    total, pass, fail, pending, completed,
    passRate: total ? pass / total : 0,
    failRate: total ? fail / total : 0,
    completedRate: total ? completed / total : 0
  }
}

/* ===================== ✅ 重要：消除 computed 副作用 ===================== */
/* ---------------- Filters / Views ---------------- */
const visibleBase = computed(() => {
  const k = kw.value.trim().toLowerCase()
  const rf = String(resultFilter.value || '').toLowerCase()
  const pf = String(planFilter.value || '').toLowerCase()

  return (testcases.value || []).filter(tc => {
    const code = String(tc.code ?? '').toLowerCase()
    const name = String(tc.testCase ?? '').toLowerCase()
    const hitKw = !k || code.includes(k) || name.includes(k)

    const r = normResult(tc.result)
    const hitR = !rf || r === rf

    const planned = normPlanned(tc.isPlanned)
    const hitP = !pf || (pf === 'planned' ? planned : !planned)

    return hitKw && hitR && hitP
  })
})

const visible = computed(() => {
  return visibleBase.value.filter(tc => isCatEnabled(tc._catKey || catKeyOf(tc)))
})

/* ✅ 先把 visible/visibleBase 做一次「按 category 分桶」→ dashboard/summary/contents 不要每個 tab 重複 filter 全表 */
const visibleByCat = computed(() => {
  const m = new Map()
  for (const tc of visible.value) {
    const ck = tc._catKey || catKeyOf(tc)
    if (!m.has(ck)) m.set(ck, [])
    m.get(ck).push(tc)
  }
  return m
})

const visibleBaseByCat = computed(() => {
  const m = new Map()
  for (const tc of visibleBase.value) {
    const ck = tc._catKey || catKeyOf(tc)
    if (!m.has(ck)) m.set(ck, [])
    m.get(ck).push(tc)
  }
  return m
})

const overall = computed(() => calc(visible.value))
const totalEstimated = computed(() => visible.value.reduce((sum, tc) => sum + estHoursOf(tc), 0))
const totalWork = computed(() => visible.value.reduce((sum, tc) => sum + Number(tc.workHrs ?? tc.workHours ?? 0), 0))
const pendingWork = computed(() => {
  return visible.value.reduce((sum, tc) => {
    const w = Number(tc.workHrs ?? tc.workHours ?? 0) || 0
    return sum + (normResult(tc.result) === 'pending' ? w : 0)
  }, 0)
})

const tabCategoriesAll = computed(() => {
  const base = (tpl.categories || []).map(c => ({ ...c }))
  const baseMap = new Map(base.map(x => [String(x.key), x]))

  for (const t of (customTabs.value || [])) {
    const k = String(t?.key || '').trim()
    if (!k) continue
    if (!baseMap.has(k)) {
      base.push({ key: k, label: t.label || k })
      baseMap.set(k, { key: k, label: t.label || k })
    }
  }

  const extraKeys = new Set(visibleBase.value.map(tc => tc._catKey || catKeyOf(tc)))
  for (const k of extraKeys) {
    if (!baseMap.has(k)) base.push({ key: k, label: k })
  }

  ensureCatEnabled(base.map(x => x.key))
  return base
})

const enabledTabCategories = computed(() => tabCategoriesAll.value.filter(c => isCatEnabled(c.key)))

const summaryRows = computed(() => {
  return enabledTabCategories.value.map(c => {
    const items = visibleByCat.value.get(c.key) || []
    return { key: c.key, label: c.label, ...calc(items) }
  })
})

const dashboardRows = computed(() => {
  return tabCategoriesAll.value.map(c => {
    const itemsAll = visibleBaseByCat.value.get(c.key) || []
    const enabled = isCatEnabled(c.key)
    const itemsSelected = enabled ? itemsAll : []

    const st = calc(itemsSelected)
    const est = itemsSelected.reduce((sum, tc) => sum + estHoursOf(tc), 0)

    const workTotal = itemsSelected.reduce((sum, tc) => sum + (Number(tc.workHrs ?? tc.workHours ?? 0) || 0), 0)
    const workPending = itemsSelected.reduce((sum, tc) => {
      const w = Number(tc.workHrs ?? tc.workHours ?? 0) || 0
      return sum + (normResult(tc.result) === 'pending' ? w : 0)
    }, 0)

    return {
      key: c.key,
      group: c.label,
      inDb: itemsAll.length,
      selected: itemsSelected.length,
      estHours: est,
      workHours: workTotal,
      workHoursPending: workPending,
      workHoursTotal: workTotal,
      completeRate: st.completedRate
    }
  })
})

const contentsItems = computed(() => {
  const base = [
    { key: 'dashboard', title: 'Dashboard' },
    { key: 'cover', title: 'Cover' },
    { key: 'summary', title: 'Summary of Test' },
    { key: 'contents', title: 'Table of Contents' },
    { key: 'config', title: 'Configuration & Utilities' }
  ]
  const cats = enabledTabCategories.value.map(c => {
    const items = visibleByCat.value.get(c.key) || []
    const st = calc(items)
    return {
      key: c.key,
      title: `${c.key} - ${c.label}`,
      meta: `${st.pass ?? 0} PASS / ${st.fail ?? 0} FAIL / ${st.pending ?? 0} Untested`
    }
  })
  return [...base, ...cats, { key: 'trash', title: 'Trash' }]
})

/* ✅ groupedByCategory：純讀取，不改動 tc（避免 computed 副作用） */
const groupedByCategory = computed(() => {
  const out = {}
  for (const c of enabledTabCategories.value) out[c.key] = []

  const buckets = new Map()
  for (const tc of visible.value) {
    const ck = tc._catKey || catKeyOf(tc)
    if (!isCatEnabled(ck)) continue
    const sec = tc._sectionKey || sectionOf(tc)

    const bKey = `${ck}__${sec}`
    if (!buckets.has(bKey)) buckets.set(bKey, { catKey: ck, section: sec, items: [] })
    buckets.get(bKey).items.push(tc)
  }

  for (const b of buckets.values()) {
    const st = calc(b.items)
    if (!out[b.catKey]) out[b.catKey] = []
    out[b.catKey].push({ section: b.section, ...st, items: b.items })
  }

  for (const k of Object.keys(out)) out[k].sort((a, b) => String(a.section).localeCompare(String(b.section)))
  return out
})

function shownCountByCat (catKey) {
  return (groupedByCategory.value[catKey] || []).reduce((s, g) => s + (g.items?.length || 0), 0)
}

/* ---------------- Selections ---------------- */
function isSelected (catKey, section, id) {
  if (!id) return false
  const secMap = selectionMap.value?.[catKey] || {}
  const arr = secMap?.[section] || []
  return Array.isArray(arr) && arr.includes(id)
}

function setSelected (catKey, section, id, v) {
  if (!id) return
  const secMap = selectionMap.value?.[catKey] || {}
  const cur = new Set(secMap?.[section] || [])
  if (v) cur.add(id)
  else cur.delete(id)

  selectionMap.value = {
    ...selectionMap.value,
    [catKey]: {
      ...secMap,
      [section]: Array.from(cur)
    }
  }
}

function selectedIdsByCat (catKey) {
  const secMap = selectionMap.value?.[catKey] || {}
  const s = new Set()
  Object.values(secMap).forEach(arr => (arr || []).forEach(id => s.add(id)))
  return Array.from(s)
}

function clearSelected (catKey) {
  selectionMap.value = { ...selectionMap.value, [catKey]: {} }
}

/* ---------------- Trash ---------------- */
const trashItems = ref([])
const loadingTrash = ref(false)
const trashSelectedIds = ref([])
const trashTableRef = ref(null)

function onTrashSelectionChange (sel) {
  trashSelectedIds.value = (sel || []).map(r => r.id).filter(Boolean)
}

/* ---------------- Debounced saves（extra only） ---------------- */
const debExtra = createKeyedDebouncer(150)

async function updateOne (id, patch) {
  await apiJson(`/testcases/${id}`, { method: 'PUT', body: patch })
}

/* ---------------- ✅ Extra fields ---------------- */
const extraFieldsByCat = computed(() => tpl.extraFields || EXTRA_FIELDS_V0006)

function matchApplyIf (def, row) {
  const a = def?.applyIf || {}
  const sec = String(row?.section || row?.subGroup || row?.group || '').trim()
  const code = String(row?.code || '').trim()

  if (Array.isArray(a.sectionIncludes) && a.sectionIncludes.length) {
    const ok = a.sectionIncludes.some(x => sec.includes(String(x)))
    if (!ok) return false
  }
  if (typeof a.codePrefix === 'string' && a.codePrefix) {
    if (!code.startsWith(a.codePrefix)) return false
  }
  if (typeof a.codeIncludes === 'string' && a.codeIncludes) {
    if (!code.includes(a.codeIncludes)) return false
  }
  return true
}

function extraSchemaFor (row) {
  const cat = row?._catKey || catKeyOf(row)
  const defsAll = extraFieldsByCat.value?._all || []
  const defsCat = extraFieldsByCat.value?.[cat] || []
  return [...defsAll, ...defsCat].filter(d => matchApplyIf(d, row))
}

function saveExtraDebounced (row) {
  const id = row?.id
  if (!id) return
  if (planLocked.value && !isAdminUser.value) return

  debExtra.run(id, async () => {
    await updateOne(id, { extra: row.extra || {} })
    dbgInfo('extra.save.ok', { id })
  })
}

function ensureRowExtra (row) {
  if (!row.extra || typeof row.extra !== 'object' || Array.isArray(row.extra)) {
    row.extra = {}
  }
  return row.extra
}

function shouldShowMeasurementWidgets (row) {
  const code = String(row?.code || '').trim().toUpperCase()
  const sec = String(row?.section || row?.subGroup || row?.group || '').trim()

  return (
    code.startsWith('TAT_') ||
    code.startsWith('TST_') ||
    code.startsWith('TCT_') ||
    sec.includes('BurnInTest') ||
    sec.includes('Thermal')
  )
}

function makeMeasureWidget (item = {}, idx = 0) {
  return {
    id: String(item.id || `mw_${Date.now()}_${idx}_${Math.random().toString(36).slice(2, 8)}`),
    label: String(item.label ?? `Item ${idx + 1}`),
    spec: String(item.spec ?? ''),
    temp: String(item.temp ?? ''),
    enabled: item.enabled !== false,
    isDefault: !!item.isDefault
  }
}

function defaultMeasureWidgets () {
  return [
    makeMeasureWidget({ id: 'cpu', label: 'CPU', spec: 'empty', temp: '', enabled: true, isDefault: true }, 0),
    makeMeasureWidget({ id: 'memory', label: 'Memory', spec: 'empty', temp: '', enabled: true, isDefault: true }, 1),
    makeMeasureWidget({ id: 'disk', label: 'Disk', spec: 'empty', temp: '', enabled: true, isDefault: true }, 2)
  ]
}

function normalizeMeasureWidgets (list) {
  return (Array.isArray(list) ? list : []).map((x, i) => makeMeasureWidget(x, i))
}

function ensureMeasureWidgetsInitialized (row) {
  const extra = ensureRowExtra(row)

  if (!Array.isArray(extra.measureWidgets) || !extra.measureWidgets.length) {
    extra.measureWidgets = defaultMeasureWidgets()
    return
  }

  const normalized = normalizeMeasureWidgets(extra.measureWidgets)
  const changed =
    normalized.length !== extra.measureWidgets.length ||
    normalized.some((x, i) => {
      const y = extra.measureWidgets[i] || {}
      return (
        x.id !== y.id ||
        x.label !== y.label ||
        x.spec !== y.spec ||
        x.temp !== y.temp ||
        x.enabled !== y.enabled ||
        x.isDefault !== y.isDefault
      )
    })

  if (changed) {
    extra.measureWidgets = normalized
  }
}

function measureWidgetsForRow (row) {
  return Array.isArray(row?.extra?.measureWidgets)
    ? row.extra.measureWidgets
    : []
}

function indexedMeasureWidgetsForRow (row) {
  return measureWidgetsForRow(row).map((item, idx) => ({ item, idx }))
}

function visibleMeasureWidgetsForRow (row) {
  return indexedMeasureWidgetsForRow(row).filter(x => x.item.enabled !== false)
}

function hiddenMeasureWidgetsForRow (row) {
  return indexedMeasureWidgetsForRow(row).filter(x => x.item.enabled === false)
}

function onMeasureWidgetsChanged (row) {
  if (!row?.id) return
  if (planLocked.value && !isAdminUser.value) return
  saveExtraDebounced(row)
}

function addMeasureWidget (row) {
  if (!row?.id) return
  if (planLocked.value && !isAdminUser.value) return

  ensureMeasureWidgetsInitialized(row)

  const list = measureWidgetsForRow(row)
  list.push(
    makeMeasureWidget(
      {
        label: `Item ${list.length + 1}`,
        spec: '',
        temp: '',
        enabled: true,
        isDefault: false
      },
      list.length
    )
  )

  saveExtraDebounced(row)
}

function removeMeasureWidget (row, idx) {
  if (!row?.id) return
  if (planLocked.value && !isAdminUser.value) return

  ensureMeasureWidgetsInitialized(row)

  const list = measureWidgetsForRow(row)
  if (!list[idx]) return

  list.splice(idx, 1)
  saveExtraDebounced(row)
}

function toggleMeasureWidget (row, idx, enabled) {
  if (!row?.id) return
  if (planLocked.value && !isAdminUser.value) return

  ensureMeasureWidgetsInitialized(row)

  const list = measureWidgetsForRow(row)
  if (!list[idx]) return

  list[idx].enabled = !!enabled
  saveExtraDebounced(row)
}
/* ✅ 匯出 PDF 前：一次 flush（避免 timer 沒跑完） */
async function flushPendingReliSaves () {
  const tcById = new Map((testcases.value || []).map(x => [Number(x?.id), x]))
  const extraIds = Array.from(debExtra.timers.keys())

  await debExtra.flush(extraIds, (id) => {
    const row = tcById.get(Number(id))
    if (!row) return null
    return updateOne(Number(id), { extra: row.extra || {} })
  })

  dbgInfo('flushPendingReliSaves.done', {
    extra: extraIds.length
  })
}

/* --- Details edit state --- */
const detailEdit = reactive({})
const detailSaving = reactive({})

/* ✅ free layout boxes (between Criteria and Remark) */
const freeCanvasRefs = reactive({})
const freeDrag = reactive({
  active: false,
  mode: 'move', // move | resize
  rowId: null,
  boxId: '',
  startX: 0,
  startY: 0,
  boxX: 0,
  boxY: 0,
  boxW: 0,
  boxH: 0
})

function makeFreeBox (partial = {}) {
  return {
    id: partial.id || `box_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    x: Math.max(12, Number(partial.x ?? 12) || 12),
    y: Math.max(12, Number(partial.y ?? 12) || 12),
    w: Math.max(180, Number(partial.w ?? 240) || 240),
    h: Math.max(120, Number(partial.h ?? 150) || 150),
    label: String(partial.label ?? ''),
    value: String(partial.value ?? '')
  }
}

function normalizeFreeBoxes (arr) {
  return (Array.isArray(arr) ? arr : []).map(item => makeFreeBox(item))
}

function freeBoxesForRow (row) {
  return normalizeFreeBoxes(row?.extra?.freeBoxes)
}

function freeLayoutCanvasHeight (boxes) {
  const list = normalizeFreeBoxes(boxes)
  const bottom = list.reduce((max, box) => Math.max(max, box.y + box.h), 0)
  return Math.max(220, bottom + 12)
}

function freeBoxStyle (box) {
  return {
    left: `${Number(box.x) || 0}px`,
    top: `${Number(box.y) || 0}px`,
    width: `${Math.max(180, Number(box.w) || 240)}px`,
    height: `${Math.max(120, Number(box.h) || 150)}px`
  }
}

function setFreeCanvasRef (rowId, el) {
  if (el) freeCanvasRefs[rowId] = el
  else delete freeCanvasRefs[rowId]
}

function detailFreeBoxes (rowId) {
  if (!detailEdit[rowId]) return []
  if (!Array.isArray(detailEdit[rowId].freeBoxes)) detailEdit[rowId].freeBoxes = []
  return detailEdit[rowId].freeBoxes
}

function findFreeBox (rowId, boxId) {
  return detailFreeBoxes(rowId).find(box => box.id === boxId) || null
}

function canvasRectInfo (rowId) {
  const el = freeCanvasRefs[rowId]
  return {
    width: Math.max(320, Number(el?.clientWidth) || 920),
    height: Math.max(260, Number(el?.clientHeight) || 320)
  }
}

function clampFreeBox (rowId, box) {
  const canvas = canvasRectInfo(rowId)

  box.w = Math.max(180, Math.min(Number(box.w) || 240, canvas.width - 24))
  box.h = Math.max(120, Number(box.h) || 150)

  box.x = Math.max(12, Math.min(Number(box.x) || 12, Math.max(12, canvas.width - box.w - 12)))
  box.y = Math.max(12, Math.min(Number(box.y) || 12, Math.max(12, canvas.height - box.h - 12)))

  return box
}

function nextFreeBoxPosition (rowId, index) {
  const canvas = canvasRectInfo(rowId)
  const gap = 12
  const cols = canvas.width >= 880 ? 3 : (canvas.width >= 580 ? 2 : 1)
  const usableWidth = canvas.width - gap * (cols + 1)
  const boxW = Math.max(180, Math.floor(usableWidth / cols))

  const col = index % cols
  const row = Math.floor(index / cols)

  return {
    x: gap + col * (boxW + gap),
    y: gap + row * 170,
    w: boxW,
    h: 150
  }
}

function addFreeBox (rowId) {
  const boxes = detailFreeBoxes(rowId)
  const pos = nextFreeBoxPosition(rowId, boxes.length)

  boxes.push(makeFreeBox({
    ...pos,
    label: `Box ${boxes.length + 1}`,
    value: ''
  }))
}

function removeFreeBox (rowId, idx) {
  detailFreeBoxes(rowId).splice(idx, 1)
}

function autoArrangeFreeBoxes (rowId) {
  const boxes = detailFreeBoxes(rowId)
  boxes.forEach((box, idx) => {
    const pos = nextFreeBoxPosition(rowId, idx)
    box.x = pos.x
    box.y = pos.y
    box.w = pos.w
    box.h = Math.max(box.h, 150)
    clampFreeBox(rowId, box)
  })
}

function startFreeBoxDrag (e, rowId, boxId) {
  const box = findFreeBox(rowId, boxId)
  if (!box) return

  freeDrag.active = true
  freeDrag.mode = 'move'
  freeDrag.rowId = rowId
  freeDrag.boxId = boxId
  freeDrag.startX = e.clientX
  freeDrag.startY = e.clientY
  freeDrag.boxX = box.x
  freeDrag.boxY = box.y
  freeDrag.boxW = box.w
  freeDrag.boxH = box.h

  window.addEventListener('pointermove', onFreeBoxPointerMove)
  window.addEventListener('pointerup', stopFreeBoxPointer)
  window.addEventListener('pointercancel', stopFreeBoxPointer)
}

function startFreeBoxResize (e, rowId, boxId) {
  const box = findFreeBox(rowId, boxId)
  if (!box) return

  freeDrag.active = true
  freeDrag.mode = 'resize'
  freeDrag.rowId = rowId
  freeDrag.boxId = boxId
  freeDrag.startX = e.clientX
  freeDrag.startY = e.clientY
  freeDrag.boxX = box.x
  freeDrag.boxY = box.y
  freeDrag.boxW = box.w
  freeDrag.boxH = box.h

  window.addEventListener('pointermove', onFreeBoxPointerMove)
  window.addEventListener('pointerup', stopFreeBoxPointer)
  window.addEventListener('pointercancel', stopFreeBoxPointer)
}

function onFreeBoxPointerMove (e) {
  if (!freeDrag.active) return

  const box = findFreeBox(freeDrag.rowId, freeDrag.boxId)
  if (!box) return

  const dx = e.clientX - freeDrag.startX
  const dy = e.clientY - freeDrag.startY

  if (freeDrag.mode === 'move') {
    box.x = freeDrag.boxX + dx
    box.y = freeDrag.boxY + dy
  } else {
    box.w = freeDrag.boxW + dx
    box.h = freeDrag.boxH + dy
  }

  clampFreeBox(freeDrag.rowId, box)
}

function stopFreeBoxPointer () {
  if (!freeDrag.active) return

  freeDrag.active = false
  window.removeEventListener('pointermove', onFreeBoxPointerMove)
  window.removeEventListener('pointerup', stopFreeBoxPointer)
  window.removeEventListener('pointercancel', stopFreeBoxPointer)
}

onBeforeUnmount(() => {
  stopFreeBoxPointer()
})

function isDetailEditing (row) {
  return !!detailEdit?.[row?.id]
}

function startEditDetail (row) {
  if (!row?.id) return
  if (planLocked.value && !isAdminUser.value) {
    ElMessage.warning('Plan Locked: cannot edit Procedure / Criteria / Layout Blocks.')
    return
  }

  detailEdit[row.id] = {
    testProcedure: String(row.testProcedure ?? ''),
    testCriteria: String(row.testCriteria ?? ''),
    freeBoxes: normalizeFreeBoxes(row?.extra?.freeBoxes)
  }
}

function cancelEditDetail (row) {
  if (!row?.id) return
  delete detailEdit[row.id]
}

async function updateProcedureCriteria (id, payload) {
  const tries = [
    () => apiJson(`/testcases/${id}`, { method: 'PUT', body: payload }),
    () => apiJson(`/testcases/${id}`, { method: 'PUT', body: { procedure: payload.testProcedure, criteria: payload.testCriteria } }),
    () => apiJson(`/testcases/${id}`, { method: 'PUT', body: { test_procedure: payload.testProcedure, test_criteria: payload.testCriteria } })
  ]
  let lastErr = null
  for (const fn of tries) {
    try { return await fn() } catch (e) { lastErr = e }
  }
  throw lastErr || new Error('Update detail failed')
}

async function saveDetail (row) {
  const id = row?.id
  if (!id || !detailEdit[id]) return

  detailSaving[id] = true
  try {
    const patch = {
      testProcedure: String(detailEdit[id].testProcedure ?? ''),
      testCriteria: String(detailEdit[id].testCriteria ?? '')
    }

    const nextExtra = {
      ...(row.extra || {}),
      freeBoxes: normalizeFreeBoxes(detailEdit[id].freeBoxes)
    }

    await updateProcedureCriteria(id, patch)
    await updateOne(id, { extra: nextExtra })

    row.testProcedure = patch.testProcedure
    row.testCriteria = patch.testCriteria
    row.extra = nextExtra

    ElMessage.success('Saved')
    delete detailEdit[id]
    dbgInfo('detail.save.ok', { id, freeBoxes: nextExtra.freeBoxes.length })
  } catch (e) {
    dbgError('detail.save.failed', { id, message: e?.message || e })
    ElMessage.error(e?.message || 'Save failed, reloading…')
    await fetchTestCases()
  } finally {
    detailSaving[id] = false
  }
}

/* ---------------- Fetch ---------------- */
async function fetchAll () {
  loading.value = true
  dbgInfo('fetchAll.start', { pid: productId.value })
  try {
    await Promise.all([fetchProduct(), fetchTestCases(), fetchTestSets()])
    await ensureOpenSections()
    dbgInfo('fetchAll.ok', { pid: productId.value })
  } catch (e) {
    dbgError('fetchAll.failed', { message: e?.message || e })
    ElMessage.error(e?.message || 'Fetch failed')
  } finally {
    loading.value = false
  }
}

async function runSearch () {
  try {
    loading.value = true
    dbgInfo('search.start', { kw: kw.value, plan: planFilter.value, result: resultFilter.value })
    await fetchTestCases()
    await ensureOpenSections()
    dbgInfo('search.ok')
  } catch (e) {
    dbgError('search.failed', { message: e?.message || e })
    ElMessage.error(e?.message || 'Search failed')
  } finally {
    loading.value = false
  }
}

async function fetchProduct () {
  const data = await apiJson(`/products/${productId.value}`)
  product.value = data
}

async function fetchTestCases () {
  const data = await apiJson(`/testcases/product/${productId.value}`, {
    params: { keyword: kw.value.trim() }
  })

  const arr = pickArrayFromPayload(data)

  // ✅ 關鍵：只在這裡 normalize 一次，後面 computed 全部「純讀」
  testcases.value = (Array.isArray(arr) ? arr : []).map(tc => {
    const o = { ...tc }

    o.workHrs = Number(o.workHrs ?? o.workHours ?? 0) || 0
    o.estHours = Number(o.estHours ?? o.estHrs ?? 0) || 0
    o.extra = (o.extra && typeof o.extra === 'object') ? o.extra : {}

    o.remark = o.remark ?? ''
    o.testProcedure = o.testProcedure ?? ''
    o.testCriteria = o.testCriteria ?? ''
    o.testCase = o.testCase ?? ''

    o.result = normResult(o.result)
    o.isPlanned = normPlanned(o.isPlanned)

    o.inputVoltage = toNumOrNull(o.inputVoltage ?? o.input_voltage ?? o.voltage ?? null)
    o.temperature  = toNumOrNull(o.temperature  ?? o.temp ?? o.temperature_c ?? null)
    o.humidity     = toNumOrNull(o.humidity     ?? o.humi ?? o.humidity_rh ?? null)

    o.cpuTemp     = toNumOrNull(o.cpuTemp ?? o.cpu_temp ?? null)
    o.memoryTemp  = toNumOrNull(o.memoryTemp ?? o.memory_temp ?? o.memTemp ?? o.mem_temp ?? null)
    o.diskTemp    = toNumOrNull(o.diskTemp ?? o.disk_temp ?? null)

    if (Number.isFinite(Number(o.temperature)) && Number(o.temperature) < 20) o.humidity = null

    // ✅ 快取 key（避免 computed 每次做字串 mapping）
    o._catKey = catKeyOf(o)
    o._sectionKey = sectionOf(o)

    return o
  })

  importMode.value = (testcases.value.length ? 'append' : 'replace')
  dbgInfo('fetchTestCases.ok', { count: testcases.value.length })
}

async function fetchTrash () {
  loadingTrash.value = true
  try {
    const data = await apiJson('/testcases/trash', { params: { productId: productId.value } })
    const arr = pickArrayFromPayload(data)
    trashItems.value = Array.isArray(arr) ? arr : []
    trashSelectedIds.value = []
    try { trashTableRef.value?.clearSelection?.() } catch {}
    dbgInfo('fetchTrash.ok', { count: trashItems.value.length })
  } catch (e) {
    dbgError('fetchTrash.failed', { message: e?.message || e })
    ElMessage.error(e?.message || 'Fetch trash failed')
  } finally {
    loadingTrash.value = false
  }
}

/* ---------------- open sections（不要每次都覆蓋使用者手動收合） ---------------- */
const openSections = reactive({})

async function ensureOpenSections () {
  for (const c of enabledTabCategories.value) {
    const secs = (groupedByCategory.value[c.key] || []).map(x => x.section)

    const cur = openSections[c.key]
    if (!Array.isArray(cur) || cur.length === 0) {
      openSections[c.key] = secs
      continue
    }

    // 只補新增 section，不強制覆蓋（保留使用者手動收合）
    const set = new Set(cur)
    for (const s of secs) set.add(s)
    openSections[c.key] = Array.from(set)
  }
}

watch(groupedByCategory, () => { void ensureOpenSections() })

watch(activeTab, (t) => { if (t === 'trash') void fetchTrash() })

watch(enabledTabCategories, (cats) => {
  const keys = new Set(cats.map(x => x.key))
  if (tIsCategory(activeTab.value) && !keys.has(activeTab.value)) activeTab.value = 'dashboard'
})

function tIsCategory (t) {
  return tabCategoriesAll.value.some(c => c.key === t)
}

/* ---------------- Row Update ---------------- */
async function onRowResultChange (row, v) {
  try {
    await updateOne(row.id, { result: v })
    dbgInfo('row.result.ok', { id: row.id, result: v })
  } catch (e) {
    dbgError('row.result.failed', { id: row?.id, message: e?.message || e })
    ElMessage.error(e?.message || 'Save failed, reloading…')
    await fetchTestCases()
  }
}

async function onRowWorkHrsChange (row) {
  try {
    await updateOne(row.id, { workHrs: row.workHrs })
    dbgInfo('row.workHrs.ok', { id: row.id, workHrs: row.workHrs })
  } catch (e) {
    dbgError('row.workHrs.failed', { id: row?.id, message: e?.message || e })
    ElMessage.error(e?.message || 'Save failed, reloading…')
    await fetchTestCases()
  }
}
async function onRowRemarkBlur (row) {
  try {
    await updateOne(row.id, { remark: row.remark || '' })
    dbgInfo('row.remark.ok', { id: row.id })
  } catch (e) {
    dbgError('row.remark.failed', { id: row?.id, message: e?.message || e })
    ElMessage.error(e?.message || 'Save failed, reloading…')
    await fetchTestCases()
  }
}
async function onRowTestCaseBlur (row) {
  if (!row?.id) return
  if (planLocked.value && !isAdminUser.value) return

  const val = String(row.testCase ?? '').trim()
  try {
    await updateOne(row.id, { testCase: val })
    dbgInfo('row.testCase.ok', { id: row.id })
  } catch (e1) {
    try { await updateOne(row.id, { name: val }) } catch (e2) {
      try { await updateOne(row.id, { title: val }) } catch (e3) {
        dbgError('row.testCase.failed', { id: row?.id, message: e1?.message || e2?.message || e3?.message })
        ElMessage.error(e1?.message || e2?.message || e3?.message || 'Save failed, reloading…')
        await fetchTestCases()
      }
    }
  }
}

/* ---------------- Bulk actions ---------------- */
const bulk = reactive({ result: '' })
const bulkApplying = ref(false)
const bulkDeleting = ref(false)
const bulkRestoring = ref(false)

async function bulkUpdate (ids, patch) {
  return await apiJson('/testcases/bulk-update', { method: 'PUT', body: { ids, patch } })
}
async function bulkApplyResult (catKey) {
  const ids = selectedIdsByCat(catKey)
  if (!ids.length || !bulk.result) return
  bulkApplying.value = true
  try {
    await bulkUpdate(ids, { result: bulk.result })
    ElMessage.success('Bulk apply result done')
    dbgInfo('bulk.result.ok', { catKey, count: ids.length, result: bulk.result })
    await fetchTestCases()
    clearSelected(catKey)
  } catch (e) {
    dbgError('bulk.result.failed', { catKey, message: e?.message || e })
    ElMessage.error(e?.message || 'Bulk failed')
  } finally {
    bulkApplying.value = false
  }
}
async function bulkApplyPlanned (catKey, planned) {
  const ids = selectedIdsByCat(catKey)
  if (!ids.length) return
  if (planLocked.value && !isAdminUser.value) {
    ElMessage.warning('Plan Locked: cannot bulk update Planned.')
    return
  }
  bulkApplying.value = true
  try {
    await bulkUpdate(ids, { isPlanned: !!planned })
    ElMessage.success('Bulk set planned done')
    dbgInfo('bulk.planned.ok', { catKey, count: ids.length, planned: !!planned })
    await fetchTestCases()
    clearSelected(catKey)
  } catch (e) {
    dbgError('bulk.planned.failed', { catKey, message: e?.message || e })
    ElMessage.error(e?.message || 'Bulk failed')
  } finally {
    bulkApplying.value = false
  }
}
async function bulkResetRuntime (catKey) {
  const ids = selectedIdsByCat(catKey)
  if (!ids.length) return
  bulkApplying.value = true
  try {
    await bulkUpdate(ids, { result: 'pending', workHrs: 0, remark: '' })
    ElMessage.success('Reset done')
    dbgInfo('bulk.reset.ok', { catKey, count: ids.length })
    await fetchTestCases()
    clearSelected(catKey)
  } catch (e) {
    dbgError('bulk.reset.failed', { catKey, message: e?.message || e })
    ElMessage.error(e?.message || 'Reset failed')
  } finally {
    bulkApplying.value = false
  }
}
async function bulkDeleteSelected (catKey) {
  const ids = selectedIdsByCat(catKey)
  if (!ids.length) return
  if (planLocked.value && !isAdminUser.value) {
    ElMessage.warning('Plan Locked: cannot delete.')
    return
  }

  try {
    await ElMessageBox.confirm(`Delete selected (${ids.length}) test cases?`, 'Confirm', { type: 'warning' })
  } catch { return }

  bulkDeleting.value = true
  try {
    await apiJson('/testcases/bulk-delete', { method: 'POST', body: { ids } })
    ElMessage.success('Deleted')
    dbgInfo('bulk.delete.ok', { catKey, count: ids.length })
    await fetchTestCases()
    await fetchTrash()
    clearSelected(catKey)
  } catch (e) {
    dbgError('bulk.delete.failed', { catKey, message: e?.message || e })
    ElMessage.error(e?.message || 'Delete failed')
  } finally {
    bulkDeleting.value = false
  }
}
async function restoreOne (id) {
  if (!id) return
  if (planLocked.value && !isAdminUser.value) {
    ElMessage.warning('Plan Locked: cannot restore.')
    return
  }
  try {
    await apiJson(`/testcases/${id}/restore`, { method: 'PATCH' })
    ElMessage.success('Restored')
    dbgInfo('trash.restore.one.ok', { id })
    await fetchTestCases()
    await fetchTrash()
  } catch (e) {
    dbgError('trash.restore.one.failed', { id, message: e?.message || e })
    ElMessage.error(e?.message || 'Restore failed')
  }
}
async function bulkRestoreTrash () {
  const ids = trashSelectedIds.value
  if (!ids.length) return
  if (planLocked.value && !isAdminUser.value) {
    ElMessage.warning('Plan Locked: cannot bulk restore.')
    return
  }

  bulkRestoring.value = true
  try {
    await apiJson('/testcases/bulk-restore', { method: 'POST', body: { ids } })
    ElMessage.success('Restored')
    dbgInfo('trash.restore.bulk.ok', { count: ids.length })
    await fetchTestCases()
    await fetchTrash()
  } catch (e) {
    dbgError('trash.restore.bulk.failed', { message: e?.message || e })
    ElMessage.error(e?.message || 'Restore failed')
  } finally {
    bulkRestoring.value = false
  }
}

/* ---------------- Plan lock ---------------- */
async function setPlanLocked (locked) {
  const pid = productId.value
  const tries = [
    () => apiJson(`/products/${pid}/plan-lock`, { method: 'PUT', body: { planLocked: !!locked } }),
    () => apiJson(`/products/${pid}/plan-lock`, { method: 'PUT', body: { locked: !!locked } }),
    () => apiJson(`/products/${pid}/plan-lock`, { method: 'POST', body: { planLocked: !!locked } }),
    () => apiJson(`/products/${pid}/plan-lock`, { method: 'POST', body: { locked: !!locked } })
  ]
  let lastErr = null
  for (const fn of tries) {
    try { return await fn() } catch (e) { lastErr = e }
  }
  throw lastErr || new Error('Plan lock API failed')
}
async function confirmPlan () {
  try {
    await ElMessageBox.confirm('Confirm and lock this test plan?', 'Confirm Plan', { type: 'warning' })
  } catch { return }

  locking.value = true
  try {
    await setPlanLocked(true)
    ElMessage.success('Plan locked')
    dbgInfo('plan.lock.ok', { pid: productId.value })
    await fetchProduct()
  } catch (e) {
    dbgError('plan.lock.failed', { message: e?.message || e })
    ElMessage.error(e?.message || 'Confirm Plan failed')
  } finally {
    locking.value = false
  }
}
async function unlockPlan () {
  try {
    await ElMessageBox.confirm('Unlock this test plan? (admin only)', 'Unlock', { type: 'warning' })
  } catch { return }

  locking.value = true
  try {
    await setPlanLocked(false)
    ElMessage.success('Plan unlocked')
    dbgInfo('plan.unlock.ok', { pid: productId.value })
    await fetchProduct()
  } catch (e) {
    dbgError('plan.unlock.failed', { message: e?.message || e })
    ElMessage.error(e?.message || 'Unlock failed')
  } finally {
    locking.value = false
  }
}

/* ---------------- Import test set ---------------- */
async function importSelected () {
  if (!importKey.value) return
  if (planLocked.value && !isAdminUser.value) {
    ElMessage.warning('Plan Locked: cannot import (requires admin unlock or admin operation).')
    return
  }

  importing.value = true
  try {
    const key = String(importKey.value)

    if (key.startsWith('PRESET:')) {
      const preset = key.replace('PRESET:', '').toUpperCase()

      const key1 = `${tpl.version} ${preset}`
      const key2 = `v${tpl.version} ${preset}`

      try {
        const set = await apiJsonTry(
          [
            `/default-test-sets/by-name/${encodeURIComponent(key1)}`,
            `/default-test-sets/by-name/${encodeURIComponent(key2)}`
          ],
          { params: { includeDeleted: false } }
        )

        const setId = Number(set?.id)
        if (!setId) throw new Error('Preset resolve failed (no setId)')

        await apiJson(`/testcases/product/${productId.value}/import-from-set`, {
          method: 'POST',
          body: { setId, mode: importMode.value, skipExisting: skipExistingImport.value }
        })

        ElMessage.success(`Imported preset ${preset}`)
        dbgInfo('import.preset.ok', { preset, setId })
      } catch (e) {
        dbgWarn('import.preset.resolve_failed_fallback', { preset, message: e?.message || e })
        await apiJson(`/testcases/product/${productId.value}/import-test-set`, {
          method: 'POST',
          body: { version: tpl.version, preset, mode: importMode.value, skipExisting: skipExistingImport.value }
        })
        ElMessage.success(`Imported preset ${preset}`)
        dbgInfo('import.preset.ok(fallback)', { preset })
      }
    } else if (key.startsWith('SET:')) {
      const setId = Number(key.replace('SET:', ''))
      if (!setId) throw new Error('Invalid setId')

      await apiJson(`/testcases/product/${productId.value}/import-from-set`, {
        method: 'POST',
        body: { setId, mode: importMode.value, skipExisting: skipExistingImport.value }
      })
      ElMessage.success(`Imported test set #${setId}`)
      dbgInfo('import.set.ok', { setId })
    } else {
      throw new Error('Unknown import key')
    }

    await fetchTestCases()
    await ensureOpenSections()
    await fetchTrash()
  } catch (e) {
    dbgError('import.failed', { message: e?.message || e })
    ElMessage.error(e?.message || 'Import failed')
  } finally {
    importing.value = false
  }
}

/* ---------------- Save as Test Set ---------------- */
const saveSetDialog = ref(false)
const savingSet = ref(false)
const saveSet = reactive({
  name: '',
  description: '',
  plannedOnly: true,
  includeDeleted: false
})

function openSaveSetDialog () {
  const today = new Date().toISOString().slice(0, 10)
  saveSet.name = `${productTitle.value} - TestSet ${today}`
  saveSet.description = ''
  saveSet.plannedOnly = true
  saveSet.includeDeleted = false
  saveSetDialog.value = true
}

async function saveAsTestSet () {
  savingSet.value = true
  try {
    const body = {
      name: String(saveSet.name || '').trim() || undefined,
      description: String(saveSet.description || '').trim() || undefined,
      plannedOnly: !!saveSet.plannedOnly,
      includeDeleted: !!saveSet.includeDeleted
    }

    const data = await apiJson(`/default-test-sets/from-product/${productId.value}`, {
      method: 'POST',
      body
    })

    const id = data?.id || data?.data?.id
    ElMessage.success(`Saved as Test Set ${id ? `#${id}` : ''}`)
    dbgInfo('saveAsTestSet.ok', { id })
    saveSetDialog.value = false
    await fetchTestSets()
    if (id) importKey.value = `SET:${id}`
  } catch (e) {
    dbgError('saveAsTestSet.failed', { message: e?.message || e })
    ElMessage.error(e?.message || 'Save test set failed')
  } finally {
    savingSet.value = false
  }
}

/* ---------------- Save meta/config (optional API) ---------------- */
const savingMeta = ref(false)
const savingSummaryRemark = ref(false)
const savingConfig = ref(false)

/* Summary remark */
const summaryRemark = ref('')

async function saveMeta () {
  savingMeta.value = true
  try {
    const pid = Number(productId.value)
    if (!reportMetaLoaded.value) await fetchReportMetaFlags()

    rmeta.reportName = String(meta.reportName || rmeta.reportName || 'Test Report')
    rmeta.revision = String(meta.revision || rmeta.revision || '0.1')

    writeCoverMetaToRmetaConfig()
    await saveReportMetaFlagsNow()

    ensureSignatureUrls()
    ElMessage.success('Saved')
    dbgInfo('meta.save.ok(via report_metas)', { pid })
  } catch (e) {
    dbgError('meta.save.failed(via report_metas)', { message: e?.message || e })
    ElMessage.error(e?.message || 'Save failed')
  } finally {
    savingMeta.value = false
  }
}

async function saveSummaryRemark () {
  savingSummaryRemark.value = true
  try {
    await apiJson(`/products/${productId.value}/summary-remark`, { method: 'PUT', body: { remark: summaryRemark.value } })
    ElMessage.success('Saved')
    dbgInfo('summaryRemark.save.ok')
  } catch (e) {
    dbgWarn('summaryRemark.save.not_implemented', { message: e?.message || e })
    ElMessage.info('UI ready. (API /summary-remark not implemented)')
  } finally {
    savingSummaryRemark.value = false
  }
}
async function saveConfig () {
  savingConfig.value = true
  try {
    await apiJson(`/products/${productId.value}/config`, { method: 'PUT', body: config })
    ElMessage.success('Saved')
    dbgInfo('config.save.ok')
  } catch (e) {
    dbgWarn('config.save.not_implemented', { message: e?.message || e })
    ElMessage.info('UI ready. (API /config not implemented)')
  } finally {
    savingConfig.value = false
  }
}

/* DUT ops */
const MAX_DUTS = 20
function normalizeDutNos () { config.duts.forEach((d, idx) => { d.dutNo = idx + 1 }) }
function canEditDut () { return !(planLocked.value && !isAdminUser.value) }

function addDut () {
  if (!canEditDut()) return ElMessage.warning('Plan Locked: cannot edit DUT list (requires admin unlock or admin operation).')
  if (config.duts.length >= MAX_DUTS) return ElMessage.warning(`Max ${MAX_DUTS} DUTs`)
  const nextNo = config.duts.length + 1
  config.duts.push(emptyDut(nextNo))
  config.dutEnabled.push(true)
}

async function removeDut (i) {
  if (!canEditDut()) return ElMessage.warning('Plan Locked: cannot edit DUT list (requires admin unlock or admin operation).')
  if (config.duts.length <= 1) {
    config.duts[0] = emptyDut(1)
    config.dutEnabled[0] = true
    return
  }
  try {
    await ElMessageBox.confirm(`Remove DUT #${i + 1}?`, 'Confirm', { type: 'warning', confirmButtonText: 'Remove', cancelButtonText: 'Cancel' })
  } catch { return }
  config.duts.splice(i, 1)
  config.dutEnabled.splice(i, 1)
  normalizeDutNos()
}

function addSupportedRow (key) {
  if (!config.supported[key]) config.supported[key] = []
  config.supported[key].push({ pn: '', spec: '' })
}
function removeSupportedRow (key, idx) {
  if (!config.supported[key]) return
  config.supported[key].splice(idx, 1)
}

/* ---------------- Export PDF ---------------- */
function buildReportQs () {
  const cats = (enabledTabCategories.value || []).map(c => c.key).join(',')

  const params = new URLSearchParams({
    kw: kw.value || '',
    plan: planFilter.value || '',
    result: resultFilter.value || '',
    cats
  })

  const metaB64 = encodeMetaB64(buildCoverMetaForQuery())
  if (metaB64) params.set('metaB64', metaB64)

  const m = buildCoverMetaForQuery()
  Object.entries(m).forEach(([k, v]) => {
    if (v === undefined || v === null) return
    const s = String(v).trim()
    if (!s) return
    params.set(k, s)
  })

  return params.toString()
}

async function downloadReport () {
  downloading.value = true
  try {
    await flushPendingReliSaves()
    await saveReportMetaFlagsNow()

    const pid = productId.value
    const qs = buildReportQs()
    dbgInfo('exportPdf.start', { pid, qs })

    const blob = await apiBlobTry([
      `/report/products/${pid}?${qs}`,
      `/report/product/${pid}?${qs}`,
      `/reports/products/${pid}?${qs}`,
      `/reports/product/${pid}?${qs}`,
      `/report/products/${pid}.pdf?${qs}`,
      `/report/product/${pid}.pdf?${qs}`,
      `/reports/products/${pid}.pdf?${qs}`,
      `/reports/product/${pid}.pdf?${qs}`
    ])

    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `x86-system-test-report_${pid}.pdf`
    a.click()
    URL.revokeObjectURL(url)

    dbgInfo('exportPdf.ok', { pid, size: blob?.size })
  } catch (e) {
    dbgError('exportPdf.failed', { message: e?.message || e })
    ElMessage.error(e?.message || 'Export failed (check report API).')
  } finally {
    downloading.value = false
  }
}

/* ---------------- Add Planned ---------------- */
const addDlg = reactive({
  open: false,
  catKey: '',
  section: 'General',
  code: '',
  testCase: '',
  testProcedure: '',
  testCriteria: ''
})
const addingPlanned = ref(false)

/* ✅ 自訂 Section（可輸入並加入選項 + 持久化） */
const customSections = reactive({})

function customSectionsStorageKey () {
  return `pt_custom_sections_${String(productId.value || '')}`
}
function loadCustomSections () {
  try {
    const raw = localStorage.getItem(customSectionsStorageKey())
    if (!raw) return
    const obj = JSON.parse(raw)
    if (obj && typeof obj === 'object') {
      Object.keys(obj).forEach(k => {
        if (Array.isArray(obj[k])) customSections[k] = obj[k].map(x => String(x).trim()).filter(Boolean)
      })
    }
  } catch {}
}
function persistCustomSections () {
  try { localStorage.setItem(customSectionsStorageKey(), JSON.stringify({ ...customSections })) } catch {}
}
watch(customSections, persistCustomSections, { deep: true })

function addCustomSection (catKey, sectionName) {
  const cat = String(catKey || '').trim()
  const sec = String(sectionName || '').trim()
  if (!cat || !sec) return
  if (!Array.isArray(customSections[cat])) customSections[cat] = []
  if (!customSections[cat].includes(sec)) customSections[cat].push(sec)
}

const addSectionOptions = computed(() => {
  const k = addDlg.catKey
  const secs = new Set(['General'])

  ;(groupedByCategory.value?.[k] || []).forEach(g => {
    const s = String(g.section || '').trim()
    if (s) secs.add(s)
  })
  ;(customSections?.[k] || []).forEach(s => {
    const x = String(s || '').trim()
    if (x) secs.add(x)
  })

  const cur = String(addDlg.section || '').trim()
  if (cur) secs.add(cur)

  return Array.from(secs).sort((a, b) => a.localeCompare(b))
})

watch(() => [addDlg.catKey, addDlg.section], ([catKey, section]) => {
  const sec = String(section || '').trim()
  if (!sec) return
  addCustomSection(catKey, sec)
})

function openAddPlannedDialog (catKey) {
  if (planLocked.value && !isAdminUser.value) {
    ElMessage.warning('Plan Locked: cannot add Planned (requires admin unlock or admin operation).')
    return
  }
  addDlg.catKey = catKey
  addDlg.section = addSectionOptions.value[0] || 'General'
  addDlg.code = ''
  addDlg.testCase = ''
  addDlg.testProcedure = ''
  addDlg.testCriteria = ''
  addDlg.open = true
}

async function createTestCasePlanned (payload) {
  const pid = productId.value
  const tries = [
    () => apiJson('/testcases', { method: 'POST', body: payload }),
    () => apiJson(`/testcases/product/${pid}`, { method: 'POST', body: payload }),
    () => apiJson(`/testcases/product/${pid}/create`, { method: 'POST', body: payload }),
    () => apiJson(`/products/${pid}/testcases`, { method: 'POST', body: payload })
  ]
  let lastErr = null
  for (const fn of tries) {
    try { return await fn() } catch (e) { lastErr = e }
  }
  throw lastErr || new Error('Create testcase API failed')
}

async function submitAddPlanned () {
  if (!String(addDlg.testCase || '').trim()) return ElMessage.warning('Test Case is required')

  addingPlanned.value = true
  try {
    const body = {
      productId: productId.value,
      category: addDlg.catKey,
      section: addDlg.section,
      code: String(addDlg.code || '').trim() || undefined,
      testCase: String(addDlg.testCase || '').trim(),
      testProcedure: String(addDlg.testProcedure || ''),
      testCriteria: String(addDlg.testCriteria || ''),
      isPlanned: true,
      result: 'pending',
      workHrs: 0,
      remark: '',
      extra: {}
    }

    await createTestCasePlanned(body)
    ElMessage.success('Planned test case created')
    dbgInfo('addPlanned.ok', { category: addDlg.catKey, section: addDlg.section })
    addDlg.open = false
    await fetchTestCases()
    await ensureOpenSections()
  } catch (e) {
    dbgError('addPlanned.failed', { message: e?.message || e })
    ElMessage.error(e?.message || 'Create failed')
  } finally {
    addingPlanned.value = false
  }
}

/* ---------------- Remark image parsing + Ctrl+V paste upload ---------------- */
function remarkImages (remark) {
  const s = String(remark || '')
  const out = []
  const re = /!\[[^\]]*\]\(([^)]+)\)/g
  let m
  while ((m = re.exec(s))) {
    const url = String(m[1] || '').trim()
    if (url) out.push(url)
  }
  return out
}

const pastingRemark = reactive({})

function clipImageFromEvent (e) {
  const dt = e?.clipboardData
  if (!dt?.items?.length) return null
  for (const it of dt.items) {
    if (it.kind === 'file' && String(it.type || '').startsWith('image/')) return it.getAsFile?.() || null
  }
  return null
}

function safeCode (s) {
  return String(s || 'TC').trim().replace(/[^\w\-]+/g, '_').slice(0, 64) || 'TC'
}
function stamp () {
  const d = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`
}

function fileNameOf (f) {
  return f?.originalName || f?.name || f?.filename || f?.fileName || f?.title || `#${f?.id || ''}`
}
function isImageFile (f) {
  const mt = String(f?.mimeType || f?.mimetype || '').toLowerCase()
  if (mt.includes('image/')) return true
  const n = String(fileNameOf(f)).toLowerCase()
  return ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp', '.svg'].some(ext => n.endsWith(ext))
}
function resolveUrlForInsert (u) {
  const s = String(u || '').trim()
  if (!s) return ''
  if (s.includes('://')) return s
  if (s.startsWith('/api/')) return s
  if (s.startsWith('/files/')) return `${apiBase}${s}`
  if (s.startsWith('/')) return s
  return `${apiBase}/${s}`
}
function resolveFileUrl (f, { preferPreview = false } = {}) {
  const rawPreview = f?.previewUrl || f?.preview || ''
  const rawUrl = f?.url || f?.downloadUrl || f?.viewUrl || f?.fileUrl || f?.path || ''
  const picked = (preferPreview && rawPreview) ? rawPreview : (rawUrl || rawPreview)
  if (picked) return resolveUrlForInsert(picked)
  const id = f?.id
  if (id) return `${apiBase}/files/${id}/download`
  return ''
}

async function onRemarkPaste (e, row) {
  const file = clipImageFromEvent(e)
  if (!file) return

  e.preventDefault()
  if (!row?.id) return
  if (!localStorage.getItem('token')) {
    ElMessage.warning('Please login to paste screenshot (upload requires auth).')
    return
  }

  pastingRemark[row.id] = true
  dbgInfo('remark.paste.start', { id: row.id, mime: file.type, size: file.size })
  try {
    const code = safeCode(row.code)
    const ext = file.type === 'image/png' ? '.png' : (file.type === 'image/jpeg' ? '.jpg' : '')
    const named = new File([file], `paste_${code}_${stamp()}${ext}`, { type: file.type })

    const fd = new FormData()
    fd.append('file', named)
    fd.append('category', 'image')

    const rec = await apiForm('/files/upload-one', fd)

    const url = resolveUrlForInsert(rec?.previewUrl || rec?.url || rec?.downloadUrl || rec?.path || '')
    const alt = fileNameOf(rec) || named.name || 'image'
    const add = `\n![${alt}](${url})\n`

    row.remark = String(row.remark || '').trimEnd() + add
    await updateOne(row.id, { remark: row.remark })
    ElMessage.success('Screenshot pasted ✔')
    dbgInfo('remark.paste.ok', { id: row.id, fileId: rec?.id })
  } catch (err) {
    dbgError('remark.paste.failed', { id: row?.id, message: err?.message || err })
    ElMessage.error(err?.message || 'Paste upload failed')
    await fetchTestCases()
  } finally {
    pastingRemark[row.id] = false
  }
}

/* ---------------- File Center Picker ---------------- */
const extraPick = reactive({ row: null, fieldKey: '' })

const picker = reactive({
  open: false,
  target: 'preparedSig',
  remarkRow: null,

  keyword: '',
  category: 'signature',
  page: 1,
  pageSize: 12,
  total: 0,

  loading: false,
  files: []
})

function openFilePicker (target) {
  picker.target = target
  picker.remarkRow = null
  picker.keyword = ''
  picker.page = 1
  picker.category = (target === 'preparedSig' || target === 'reviewedSig') ? 'signature' : 'image'
  picker.open = true
  void fetchFiles()
}

function openRemarkImagePicker (tcRow) {
  if (!tcRow?.id) return
  picker.target = 'remark'
  picker.remarkRow = tcRow
  picker.category = 'image'
  picker.page = 1
  picker.open = true
  void fetchFiles()
}

function openExtraImagePicker (row, fieldKey) {
  if (!row?.id) return
  if (planLocked.value && !isAdminUser.value) return

  extraPick.row = row
  extraPick.fieldKey = String(fieldKey || '').trim()

  picker.target = 'extraImage'
  picker.remarkRow = null
  picker.category = 'image'
  picker.page = 1
  picker.open = true
  void fetchFiles()
}
function openAppearancePicker (bIdx, sIdx) {
  if (appearanceDisabled.value) return
  appearancePick.bIdx = bIdx
  appearancePick.sIdx = sIdx

  picker.target = 'appearancePhoto'
  picker.remarkRow = null
  picker.category = 'image'
  picker.page = 1
  picker.open = true
  void fetchFiles()
}
async function fetchFiles () {
  picker.loading = true
  try {
    const params = {
      keyword: picker.keyword?.trim() || '',
      category: picker.category || '',
      page: picker.page,
      pageSize: picker.pageSize
    }

    const data = await apiJsonTry(
      ['/files', '/files/list', '/files/search'],
      { params }
    )

    const arr = pickArrayFromPayload(data)
    picker.files = Array.isArray(arr) ? arr : []
    picker.total = Number(data?.count ?? data?.total ?? data?.pagination?.total ?? picker.files.length) || picker.files.length
    dbgInfo('files.fetch.ok', { count: picker.files.length, total: picker.total })
  } catch (e) {
    picker.files = []
    picker.total = 0
    dbgError('files.fetch.failed', { message: e?.message || e })
    ElMessage.error(e?.message || 'Fetch files failed')
  } finally {
    picker.loading = false
  }
}

function clearSignature (which) {
  if (which === 'prepared') {
    meta.preparedSigFileId = null
    meta.preparedSigFileName = ''
    meta.preparedSigUrl = ''
  } else if (which === 'reviewed') {
    meta.reviewedSigFileId = null
    meta.reviewedSigFileName = ''
    meta.reviewedSigUrl = ''
  }
}

async function pickFile (row) {
  if (!row?.id) return

  // extra images
  if (picker.target === 'extraImage') {
    const tc = extraPick.row
    const key = String(extraPick.fieldKey || '').trim()
    if (!tc?.id || !key) return
    if (!isImageFile(row)) return ElMessage.warning('Please select an image file.')

    const url = resolveFileUrl(row, { preferPreview: true })
    const name = fileNameOf(row)

    if (!tc.extra || typeof tc.extra !== 'object') tc.extra = {}
    if (!Array.isArray(tc.extra[key])) tc.extra[key] = []

    const defs = extraSchemaFor(tc)
    const def = defs.find(d => d.key === key)
    const max = Number(def?.max ?? 0)
    if (max > 0 && tc.extra[key].length >= max) {
      ElMessage.warning(`Max ${max} images for "${def?.label || key}"`)
      return
    }

    tc.extra[key].push({ fileId: row.id, url, name })
    picker.open = false
    saveExtraDebounced(tc)
    dbgInfo('extra.image.pick.ok', { tcId: tc.id, fieldKey: key, fileId: row.id })
    return
  }

  // remark insert
  if (picker.target === 'remark') {
    const tc = picker.remarkRow
    if (!tc?.id) return
    if (!isImageFile(row)) return ElMessage.warning('Please select an image file.')

    const name = fileNameOf(row)
    const url = resolveFileUrl(row, { preferPreview: true })
    const add = `\n![${name}](${url})\n`
    tc.remark = String(tc.remark || '').trimEnd() + add

    try {
      await updateOne(tc.id, { remark: tc.remark })
      ElMessage.success('Image inserted to remark')
      dbgInfo('remark.image.pick.ok', { tcId: tc.id, fileId: row.id })
      picker.open = false
    } catch (e) {
      dbgError('remark.image.pick.failed', { tcId: tc?.id, message: e?.message || e })
      ElMessage.error(e?.message || 'Insert failed')
      await fetchTestCases()
    }
    return
  }

  // appearance photos
if (picker.target === 'appearancePhoto') {
  if (!isImageFile(row)) return ElMessage.warning('Please select an image file.')

  const bIdx = appearancePick.bIdx
  const sIdx = appearancePick.sIdx
  if (bIdx < 0 || sIdx < 0) return

  const url = resolveFileUrl(row, { preferPreview: true })
  const name = fileNameOf(row)

  const next = appearanceBlocks.value.map(b => ({ slots: b.slots.map(s => ({ ...s })) }))
  const slot = next?.[bIdx]?.slots?.[sIdx]
  if (!slot) return

  slot.fileId = row.id
  slot.url = url
  slot.name = name

  appearanceBlocks.value = next
  picker.open = false
  dbgInfo('appearance.photo.pick.ok', { bIdx, sIdx, fileId: row.id })
  return
}


  // signatures
  if (!isImageFile(row)) return ElMessage.warning('Please select an image file.')

  const url = resolveFileUrl(row, { preferPreview: true })
  const name = fileNameOf(row)

  if (picker.target === 'preparedSig') {
    meta.preparedSigFileId = row.id
    meta.preparedSigFileName = name
    meta.preparedSigUrl = url
  } else if (picker.target === 'reviewedSig') {
    meta.reviewedSigFileId = row.id
    meta.reviewedSigFileName = name
    meta.reviewedSigUrl = url
  }

  dbgInfo('signature.pick.ok', { target: picker.target, fileId: row.id })
  picker.open = false
}

/* ---------------- Init / route change ---------------- */
async function initPage () {
  dbgInfo('initPage.start', { pid: productId.value })

  loadCatEnabled()
  loadCustomSections()
  loadCustomTabs()

  // reset draft
  draft.loaded = false
  draft.dirty = false
  draft.saving = false
  draft.savedAt = 0
  draft.err = ''
  if (draftTimer) clearTimeout(draftTimer)

  await loadDraft()
  await fetchReportMetaFlags()

  await fetchAll()
  await fetchTrash()

  if (!draft.loaded) draft.loaded = true

  dbgInfo('initPage.ok', { pid: productId.value })
}

onMounted(async () => {
  await initPage()
})

watch(productId, async () => {
  activeTab.value = 'dashboard'
  testcases.value = []
  trashItems.value = []
  selectionMap.value = {}
  Object.keys(openSections).forEach(k => { delete openSections[k] })

  reportMetaLoaded.value = false
  await initPage()
})

watch(
  () => testcases.value,
  (rows) => {
    for (const row of rows || []) {
      if (shouldShowMeasurementWidgets(row)) {
        ensureMeasureWidgetsInitialized(row)
      }
    }
  },
  { immediate: true }
)

</script>

<style scoped>
.w-240 { width: 240px; }
.w-160 { width: 160px; }

/* ===== New Topbar (v7) ===== */
.topbar{
  position: sticky;
  top: 10px;
  z-index: 20;
  display:flex;
  flex-direction:column;
  gap:10px;
  padding:12px;
  border:1px solid var(--el-border-color);
  border-radius:14px;
  background: var(--el-bg-color);
  box-shadow: 0 6px 18px rgba(0,0,0,.06);
}

.topbar-row{
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap:12px;
  flex-wrap:wrap;
}

.topbar-row.meta .meta-left{
  display:flex;
  align-items:center;
  gap:10px;
  flex-wrap:wrap;
}
.topbar-row.meta .meta-right{
  display:flex;
  align-items:center;
  gap:10px;
  flex-wrap:wrap;
  justify-content:flex-end;
}

.title{
  display:flex;
  flex-direction:column;
  line-height:1.1;
  margin-right:6px;
}
.title-main{
  font-weight: 950;
  font-size: 16px;
  letter-spacing: .2px;
}
.title-sub{
  font-size: 12px;
  color: var(--el-text-color-secondary);
  margin-top: 2px;
}

.topbar-row.cmd{
  border-top: 1px dashed var(--el-border-color-lighter);
  padding-top: 10px;
}

.cmd-left{
  display:flex;
  align-items:center;
  gap:10px;
  flex-wrap:wrap;
}

.cmd-right{
  display:flex;
  align-items:center;
  gap:12px;
  flex-wrap:wrap;
  justify-content:flex-end;
}

.grp{
  display:flex;
  align-items:center;
  gap:10px;
  flex-wrap:wrap;
}

.sep{
  width:1px;
  height:28px;
  background: var(--el-border-color-lighter);
}

.ghost{
  background: transparent;
}

.w-260{ width: 260px; }

/* Desktop / Mobile switch */
.desktop-only{ display:flex; }
.mobile-only{ display:none; }

@media (max-width: 1100px){
  .desktop-only{ display:none; }
  .mobile-only{ display:flex; }
  .topbar{ top: 6px; border-radius: 12px; }
  .w-260{ width: 100%; }
}

/* Drawer layout */
.drawer-sec{ margin-bottom: 10px; }
.drawer-title{
  font-weight: 900;
  margin-bottom: 10px;
}
.drawer-grid{
  display:grid;
  grid-template-columns: 1fr;
  gap:10px;
}


.tabs-card { margin-top: 12px; }
.sheet { padding: 12px 4px; }
.sheet-title { font-weight: 900; font-size: 18px; margin-bottom: 0; }
.sheet-subtitle { font-weight: 800; margin: 10px 0 8px; }

.kpi-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 14px;
}
.kpi {
  background: var(--el-fill-color-lighter);
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 12px;
  padding: 12px;
}
.kpi .k { color: var(--el-text-color-secondary); font-size: 12px; }
.kpi .v { font-size: 22px; font-weight: 900; margin-top: 4px; }

.cover-title { font-size: 34px; font-weight: 1000; letter-spacing: 0.5px; margin-top: 10px; }
.cover-sub { font-size: 18px; color: var(--el-text-color-secondary); margin-top: 6px; }
.cover-meta { margin-top: 6px; color: var(--el-text-color-regular); }

.rates-row {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  margin-top: 12px;
}
.rate-card {
  background: var(--el-fill-color-lighter);
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 12px;
  padding: 12px;
}
.rate-title { color: var(--el-text-color-secondary); font-size: 12px; }
.rate-value { font-size: 22px; font-weight: 900; margin-top: 4px; }

.dut-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; }
.dut-card :deep(.el-card__body) { padding-top: 8px; }
.dut-header { display:flex; align-items:center; gap:10px; }

.supported-block { margin-top: 14px; }
.supported-title { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; }

.bulk-bar { display: flex; align-items: center; gap: 10px; margin: 6px 0 12px; flex-wrap: wrap; }
.muted { color: var(--el-text-color-secondary); font-size: 12px; }
.collapse-title { display: flex; gap: 10px; align-items: baseline; }

.sig-row{
  display:flex;
  align-items:center;
  gap:10px;
  flex-wrap:wrap;
}
.sig-preview{
  display:flex;
  align-items:center;
  gap:10px;
  padding:6px 10px;
  border:1px solid var(--el-border-color);
  border-radius:12px;
  background: var(--el-fill-color-lighter);
}
.sig-img{
  width:160px;
  height:44px;
}
.sig-name{
  max-width:240px;
  overflow:hidden;
  text-overflow:ellipsis;
  white-space:nowrap;
  color: var(--el-text-color-secondary);
  font-size: 12px;
}

/* ✅ remark with image */
.remark-img-grid{
  display:grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap:8px;
}
.remark-img{
  width:100%;
  height:72px;
  object-fit:contain;
  border:1px solid var(--el-border-color);
  border-radius:8px;
  background: var(--el-fill-color-lighter);
}

.spin{
  margin-left:2px;
  font-size: 16px;
  animation: spin 1s linear infinite;
}
@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* ✅ picker */
.picker-bar{
  display:flex;
  align-items:center;
  gap:10px;
  flex-wrap:wrap;
  margin-bottom:10px;
}

/* ---------- Report Blocks ---------- */
.sheet-topbar{
  display:flex;
  align-items:center;
  gap:10px;
  flex-wrap:wrap;
  margin-bottom: 10px;
}

.tc-block-list{
  display:flex;
  flex-direction:column;
  gap: 12px;
}

.tc-block{
  border: 1px solid var(--el-border-color);
  border-radius: 12px;
  background: var(--el-fill-color-blank);
  overflow: hidden;
}

.tc-block.result-pass{ border-left: 6px solid var(--el-color-success); }
.tc-block.result-fail{ border-left: 6px solid var(--el-color-danger); }
.tc-block.result-pending{ border-left: 6px solid var(--el-color-info); }

.tc-head{
  display: grid;
  grid-template-columns: 34px 150px 1fr 360px;
  gap: 10px;
  padding: 10px 12px;
  align-items: start;
  border-bottom: 1px solid var(--el-border-color-lighter);
  background: var(--el-fill-color-lighter);
}

.tc-check{ margin-top: 18px; }

.tc-code .lbl,
.tc-name .lbl{
  font-size: 12px;
  color: var(--el-text-color-secondary);
  margin-bottom: 4px;
}
.tc-code .val{
  font-weight: 900;
  letter-spacing: .2px;
}

.tc-status{
  display:flex;
  flex-direction:column;
  gap: 8px;
}
.tc-status-top{
  display:flex;
  align-items:center;
  gap: 8px;
  flex-wrap:wrap;
  justify-content:flex-end;
}
.tc-status-bottom{
  display:flex;
  align-items:flex-end;
  gap: 10px;
  justify-content:flex-end;
  flex-wrap:wrap;
}
.tc-est{ margin-left: auto; }

.tc-work{
  display:flex;
  flex-direction:column;
  gap: 4px;
}
.tc-work .lbl{
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.tc-body{
  padding: 12px;
}

.tc-sec{
  margin-top: 12px;
}
.tc-sec:first-child{ margin-top: 0; }

.tc-sec-head{
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap:10px;
  margin-bottom: 6px;
}
.tc-sec-title{
  font-weight: 900;
  color: var(--el-text-color-primary);
}
.tc-sec-actions{
  display:flex;
  align-items:center;
  gap:8px;
}

.tc-sec-box{
  padding: 10px 12px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 10px;
  background: var(--el-fill-color-lighter);
  font-size: 13px;
  line-height: 1.7;
  color: var(--el-text-color-regular);
}

.tc-sec-box :deep(.detail-p){ margin:0; }
.tc-sec-box :deep(.detail-ol){ margin:0; padding-left:18px; }
.tc-sec-box :deep(.detail-ol li){ margin:4px 0; }

/* responsive */
@media (max-width: 1100px){
  .tc-head{
    grid-template-columns: 34px 150px 1fr;
  }

  /* ✅ status 改成整列換行（避免擠在右邊） */
  .tc-status{
    grid-column: 1 / -1;
    padding-top: 8px;
    margin-top: 6px;
    border-top: 1px dashed var(--el-border-color-lighter);
  }

  .tc-status-top,
  .tc-status-bottom{
    justify-content: flex-start;
  }

  .tc-est{
    margin-left: 0;
  }

  /* ✅ 其他區塊簡單 RWD */
  .kpi-grid{
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .rates-row{
    grid-template-columns: 1fr;
  }
  .dut-grid{
    grid-template-columns: 1fr;
  }
}

/* 更小手機 */
@media (max-width: 520px){
  .tc-head{
    grid-template-columns: 30px 1fr;
  }
  .tc-code,
  .tc-name{
    grid-column: 2 / -1;
  }

  .kpi-grid{
    grid-template-columns: 1fr;
  }
}

/* ---------- Debug Drawer ---------- */
.dbg-toolbar{
  display:flex;
  gap:10px;
  align-items:center;
  margin-bottom:10px;
  flex-wrap:wrap;
}
.dbg-list{
  display:flex;
  flex-direction:column;
  gap:10px;
  padding: 6px 2px;
}
.dbg-item{
  border:1px solid var(--el-border-color);
  border-radius:12px;
  padding:10px 12px;
  background: var(--el-fill-color-blank);
}
.dbg-item.lvl-info{ border-left: 6px solid var(--el-color-info); }
.dbg-item.lvl-warn{ border-left: 6px solid var(--el-color-warning); }
.dbg-item.lvl-error{ border-left: 6px solid var(--el-color-danger); }
.dbg-head{
  display:flex;
  align-items:center;
  gap:10px;
}
.dbg-lvl{ font-size: 12px; }
.dbg-ts{ color: var(--el-text-color-secondary); font-size:12px; margin-left:auto; }
.dbg-msg{ margin-top: 6px; font-size: 13px; }
.dbg-pre{
  margin-top: 8px;
  padding: 8px 10px;
  border-radius: 10px;
  border: 1px solid var(--el-border-color-lighter);
  background: var(--el-fill-color-lighter);
  font-size: 12px;
  overflow:auto;
  white-space: pre-wrap;
  word-break: break-word;
}
.dbg-hint{ margin-bottom: 10px; }

.dut-toolbar{
  display:flex;
  align-items:center;
  gap:10px;
  margin: 8px 0 10px;
}




/* ✅ mobile quick bar container */
.pt-quickbar{
  display:flex;
  align-items:center;
  gap:10px;
  flex-wrap:wrap;
  justify-content:flex-end;
}

/* render fragments */
.pt-actions-frag,
.pt-quick-frag{
  display:flex;
  align-items:center;
  gap:10px;
  flex-wrap:wrap;
}

/* ✅ Teleport shared controls layout */
.pt-section { width: 100%; }

.pt-filters{
  display:flex;
  align-items:center;
  gap:10px;
  flex-wrap:wrap;
}
.pt-filters.is-mobile{
  display:grid;
  grid-template-columns: 1fr;
  gap:10px;
}

/* Import+Actions container */
.pt-controls{
  display:flex;
  align-items:flex-start;
  gap:12px;
  flex-wrap:wrap;
  justify-content:flex-end;
}
.pt-controls.is-mobile{
  display:flex;
  flex-direction:column;
  align-items:stretch;
  gap:12px;
}

/* sub sections */
.pt-subsec{ display:flex; flex-direction:column; gap:8px; }
.pt-controls .grp{
  display:flex;
  align-items:center;
  gap:10px;
  flex-wrap:wrap;
}

/* mobile stacking for controls */
.pt-controls.is-mobile .sep{ display:none; }
.pt-controls.is-mobile .grp{
  flex-direction:column;
  align-items:stretch;
}
.pt-controls.is-mobile .grp :deep(.el-button){
  width:100%;
}
.pt-controls.is-mobile .grp :deep(.el-select),
.pt-controls.is-mobile .grp :deep(.el-input){
  width:100%;
}
/* ✅ Appearance of Assembled System (match existing style) */
.aas-toolbar{
  display:flex;
  align-items:center;
  gap:10px;
  margin: 8px 0 10px;
  flex-wrap:wrap;
}

/* card container like tc-block / kpi */
.aas-card{
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 12px;
  background: var(--el-fill-color-blank);
  padding: 10px;
  margin-bottom: 12px;
}

/* allow horizontal scroll on small screens */
.aas-scroll{
  overflow-x: auto;
}

/* grid */
.aas-grid{
  min-width: 860px; /* keep 4 columns look; scroll on mobile */
  display:grid;
  grid-template-columns: 120px 1fr 1fr 1fr;
  border: 1px solid var(--el-border-color);
  border-radius: 12px;
  overflow: hidden;
  background: var(--el-fill-color-blank);
}

/* cell borders (soft) */
.aas-grid > *{
  border-right: 1px solid var(--el-border-color-lighter);
  border-bottom: 1px solid var(--el-border-color-lighter);
}

/* remove last col right border */
.aas-grid > :nth-child(4),
.aas-grid > :nth-child(8){
  border-right: 0;
}

/* remove last row bottom border (Photo row end) + block-actions row is full width */
.aas-grid > :nth-last-child(1){
  border-bottom: 0;
}

.aas-label{
  background: var(--el-fill-color-lighter);
  font-weight: 900;
  padding: 10px;
  display:flex;
  align-items:center;
  color: var(--el-text-color-primary);
}

.aas-label-photo{
  min-height: 220px;
}

.aas-cap{
  padding: 8px;
  background: var(--el-fill-color-blank);
}

.aas-photo{
  padding: 8px;
  min-height: 220px;
  background: var(--el-fill-color-blank);
}

.aas-photo-box{
  height: 100%;
  border: 1px dashed var(--el-border-color);
  border-radius: 12px;
  overflow:hidden;
  position: relative;
  background: var(--el-fill-color-blank);
  display:flex;
  flex-direction:column;
}

.aas-img{
  width: 100%;
  height: 150px;
  display:block;
  background: var(--el-fill-color-lighter);
}

.aas-photo-meta{
  padding: 8px 10px;
  display:flex;
  flex-direction:column;
  gap:8px;
}

.aas-file{
  font-size: 12px;
  color: var(--el-text-color-secondary);
  overflow:hidden;
  text-overflow:ellipsis;
  white-space:nowrap;
}

.aas-actions{
  display:flex;
  gap:8px;
  flex-wrap:wrap;
}

.aas-empty{
  height: 100%;
  display:flex;
  align-items:center;
  justify-content:center;
  flex-direction:column;
  gap:10px;
  padding: 14px;
  background: var(--el-fill-color-lighter);
}

.aas-empty-title{
  font-weight: 900;
  color: var(--el-text-color-secondary);
}

/* block action row */
.aas-block-actions{
  grid-column: 1 / -1;
  border-right: 0 !important;
  border-bottom: 0 !important;
  padding: 8px;
  display:flex;
  justify-content:flex-end;
  background: var(--el-fill-color-lighter);
}

/* disabled look */
.aas-grid.is-disabled{
  opacity: .85;
  filter: grayscale(.1);
}

/* ✅ free layout blocks */
.free-layout-wrap{
  display:flex;
  flex-direction:column;
  gap:8px;
}

.free-layout-toolbar{
  padding: 0 2px;
}

.free-layout-canvas{
  position:relative;
  min-height:260px;
  border:1px dashed var(--el-border-color);
  border-radius:14px;
  overflow:hidden;
  background:
    linear-gradient(90deg, rgba(0,0,0,.04) 1px, transparent 1px) 0 0 / 24px 24px,
    linear-gradient(rgba(0,0,0,.04) 1px, transparent 1px) 0 0 / 24px 24px,
    var(--el-fill-color-lighter);
}

.free-layout-canvas.is-readonly{
  border-style: solid;
  background: var(--el-fill-color-lighter);
}

.free-layout-canvas.is-edit{
  min-height:320px;
}

.free-layout-box{
  position:absolute;
  display:flex;
  flex-direction:column;
  border:1px solid var(--el-border-color);
  border-radius:12px;
  background: var(--el-bg-color);
  box-shadow: 0 6px 18px rgba(0,0,0,.06);
  overflow:hidden;
}

.free-layout-box-head{
  display:flex;
  align-items:center;
  gap:8px;
  padding:8px 10px;
  background: var(--el-fill-color);
  font-weight:800;
  line-height:1.3;
}

.free-layout-box-head.is-draggable{
  cursor:move;
  user-select:none;
  touch-action:none;
}

.free-layout-handle{
  color: var(--el-text-color-secondary);
  font-size:16px;
  line-height:1;
  letter-spacing:-2px;
}

.free-layout-box-body{
  flex:1 1 auto;
  min-height:0;
  overflow:auto;
  padding:10px;
  white-space:pre-wrap;
  line-height:1.6;
  color: var(--el-text-color-regular);
}

.free-layout-box.is-editing .free-layout-box-body{
  padding:8px;
}

.free-layout-box.is-editing .free-layout-box-body :deep(.el-textarea),
.free-layout-box.is-editing .free-layout-box-body :deep(.el-textarea__inner){
  height:100%;
}

.free-layout-resizer{
  position:absolute;
  right:0;
  bottom:0;
  width:16px;
  height:16px;
  cursor:nwse-resize;
  touch-action:none;
  background: linear-gradient(135deg, transparent 0 50%, var(--el-border-color) 50% 100%);
}

.free-layout-empty{
  position:absolute;
  inset:0;
  display:flex;
  align-items:center;
  justify-content:center;
}

@media (max-width: 1100px){
  .free-layout-canvas.is-edit{
    min-height:380px;
  }
}

.measure-widget-list{
  display:flex;
  flex-direction:column;
  gap:8px;
}

.measure-empty{
  padding: 10px 12px;
  border: 1px dashed var(--el-border-color);
  border-radius: 10px;
  background: var(--el-fill-color-lighter);
}

.measure-hidden-toolbar{
  display:flex;
  align-items:center;
  gap:8px;
  flex-wrap:wrap;
  margin-top:4px;
}

.measure-widget-row{
  display:grid;
  grid-template-columns: 44px 120px minmax(220px, 1fr) 130px 120px 48px 70px;
  gap:8px;
  align-items:center;
}

.measure-widget-row.is-disabled-row{
  opacity:.7;
}

.measure-toggle{
  display:flex;
  align-items:center;
  justify-content:center;
}

.measure-name-wrap :deep(.el-input__wrapper){
  background:#dfeecf;
  font-weight:700;
}

.measure-mid,
.measure-unit{
  min-height:32px;
  display:flex;
  align-items:center;
  justify-content:center;
  border:1px solid var(--el-border-color);
  border-radius:8px;
  background:#dfeecf;
  font-weight:700;
}

.measure-unit{
  background:#f5f7fa;
}

.measure-action{
  display:flex;
  align-items:center;
  justify-content:center;
}

.measure-hidden-note{
  grid-column: 3 / span 4;
  min-height:32px;
  display:flex;
  align-items:center;
  padding:0 12px;
  border:1px dashed var(--el-border-color);
  border-radius:8px;
  color:var(--el-text-color-secondary);
  background:var(--el-fill-color-lighter);
}

@media (max-width: 1200px){
  .measure-widget-row{
    grid-template-columns: 44px 100px minmax(160px, 1fr) 120px 110px 44px 64px;
  }
}

</style>
