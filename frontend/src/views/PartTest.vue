<!-- frontend/src/views/PartTest.vue -->
<template>
  <div class="page part-test-v3">
    <!-- Header -->
    <div class="header-bar">
      <div class="left">
        <h2 class="title">📄 Part Test Report</h2>

        <el-tag v-if="productTitle" type="success" effect="dark">
          {{ productTitle }}
        </el-tag>

        <el-tag effect="plain" style="margin-left: 8px">
          {{ draft.cover.reportName || 'Part Test Report' }} · Rev
          {{ draft.cover.revision || '0.1' }}
        </el-tag>

        <el-tag type="info" effect="plain" style="margin-left: 8px">
          kind: {{ kind || '-' }}
        </el-tag>

        <el-tag v-if="dirty" type="warning" effect="plain" style="margin-left: 8px">
          ● Draft
        </el-tag>
      </div>

      <div class="right">
        <el-button :icon="Refresh" @click="reload" :loading="loading">
          Reload
        </el-button>

        <el-button plain :icon="Document" @click="exportPdf">
          匯出 PDF
        </el-button>

        <!-- ✅ Header 右側：預設測試集（後端） -->
        <ProductTestActions
          :product-id="route.params.id"
          @applied="handleImportedSet"
          style="margin-bottom: 0"
        />

        <el-button type="primary" :icon="Check" @click="saveDraft">
          Save Draft
        </el-button>
      </div>
    </div>

    <!-- Tabs + Content -->
    <el-card shadow="never" class="tabs-card">
      <el-tabs
        v-model="activeTab"
        type="border-card"
        class="top-tabs"
        @tab-change="onTabChange"
      >
        <!-- ✅ 固定頁 -->
        <el-tab-pane name="dashboard" label="Dashboard">
          <div class="pane">
            <div class="pane-title">
              <div class="pane-title-left">
                <b>Test Case Report (Part)</b>
              </div>
              <div class="pane-title-right">
                <el-button
                  size="small"
                  type="primary"
                  plain
                  :icon="Plus"
                  @click="addSection()"
                >
                  新增分頁
                </el-button>
                <el-button size="small" plain :icon="Setting" @click="goTab('config')">
                  Config
                </el-button>
              </div>
            </div>

            <div class="kpis">
              <div class="kpi">
                <div class="kpi-label">Total TC # (Shown)</div>
                <div class="kpi-val">{{ totalShown }}</div>
              </div>

              <div class="kpi">
                <div class="kpi-label">Total Estimated hrs.</div>
                <div class="kpi-val">{{ totalEstHrs.toFixed(1) }}</div>
              </div>

              <div class="kpi">
                <div class="kpi-label">Work hrs. (Pending/Total)</div>
                <div class="kpi-val">
                  {{ pendingWorkHrs.toFixed(1) }} / {{ totalWorkHrs.toFixed(1) }}
                </div>
              </div>

              <div class="kpi">
                <div class="kpi-label">Completed Rate</div>
                <div class="kpi-val">{{ pct(completedRate) }}</div>
              </div>
            </div>

            <div class="block-title">Test Case Group Summary</div>

            <el-alert
              v-if="!allSectionList.length"
              type="info"
              show-icon
              :closable="false"
              title="目前沒有任何章節。請按「新增分頁」或到 Config 匯入模板。"
              style="margin-bottom: 12px"
            />

            <el-table v-else :data="dashboardRows" border stripe size="default">
              <el-table-column label="Show" width="90" align="center">
                <template #default="{ row }">
                  <el-checkbox
                    v-model="draft.enabled[row.key]"
                    @change="onEnabledChanged"
                  />
                </template>
              </el-table-column>

              <el-table-column prop="name" label="Test Case Group" min-width="260" />

              <el-table-column
                prop="dbTotal"
                label="TC's # in DB"
                width="140"
                align="center"
              />
              <el-table-column
                prop="shownTotal"
                label="Selected TC's #"
                width="150"
                align="center"
              />

              <el-table-column label="Total Estimated hrs." width="170" align="center">
                <template #default="{ row }">
                  {{ row.estHrs.toFixed(1) }}
                </template>
              </el-table-column>

              <el-table-column
                label="Work hrs. (Pending/Total)"
                width="220"
                align="center"
              >
                <template #default="{ row }">
                  {{ row.pendingHrs.toFixed(1) }} / {{ row.workHrs.toFixed(1) }}
                </template>
              </el-table-column>

              <el-table-column label="Completed Rate" width="160" align="center">
                <template #default="{ row }">
                  {{ pct(row.progressRate) }}
                </template>
              </el-table-column>

              <el-table-column width="120" align="right">
                <template #default="{ row }">
                  <el-button size="small" type="primary" plain @click="goTab(row.key)">
                    Open
                  </el-button>
                </template>
              </el-table-column>
            </el-table>
          </div>
        </el-tab-pane>

        <el-tab-pane name="cover" label="Cover">
          <div class="pane">
            <div class="pane-title"><b>Cover</b></div>

            <div class="grid2">
              <div class="field wide">
                <div class="label">Project Name</div>
                <el-input v-model="draft.cover.projectName" placeholder="Project name" />
              </div>

              <div class="field wide">
                <div class="label">Report Name</div>
                <el-input v-model="draft.cover.reportName" placeholder="Part Test Report" />
              </div>

              <div class="field">
                <div class="label">Revision</div>
                <el-input v-model="draft.cover.revision" placeholder="0.1" />
              </div>

              <div class="field">
                <div class="label">Released Date</div>
                <el-date-picker
                  v-model="draft.cover.releasedDate"
                  type="date"
                  style="width: 100%"
                  value-format="YYYY-MM-DD"
                />
              </div>

              <div class="field">
                <div class="label">Database Ver.</div>
                <el-input v-model="draft.cover.databaseVer" placeholder="0002" />
              </div>

              <div class="field"></div>

              <div class="field">
                <div class="label">Prepared & Tested By</div>
                <el-input v-model="draft.cover.preparedBy" placeholder="Name" />
                <div class="sign-card">
                  <div v-if="coverSigner('prepared')?.url" class="sign-preview">
                    <img :src="previewSrc(coverSigner('prepared')) || ''" :alt="coverSigner('prepared')?.name || 'Prepared signature'" />
                  </div>
                  <div v-else class="sign-preview sign-preview--empty">未選取圖片</div>

                  <div class="sign-meta-row">
                    <div class="sign-meta-title">簽名圖片</div>
                    <div class="sign-meta-name">{{ coverSigner('prepared')?.name || '尚未從檔案中心選取' }}</div>
                  </div>

                  <div class="sign-actions">
                    <el-button size="small" type="primary" plain @click="openCoverSignerPicker('prepared')">
                      從檔案中心選取
                    </el-button>
                    <el-button size="small" plain @click="clearCoverSigner('prepared')" :disabled="!coverSigner('prepared')?.url">
                      清除
                    </el-button>
                  </div>
                </div>
              </div>

              <div class="field">
                <div class="label">Reviewed & Approved By</div>
                <el-input v-model="draft.cover.approvedBy" placeholder="Name" />
                <div class="sign-card">
                  <div v-if="coverSigner('approved')?.url" class="sign-preview">
                    <img :src="previewSrc(coverSigner('approved')) || ''" :alt="coverSigner('approved')?.name || 'Approved signature'" />
                  </div>
                  <div v-else class="sign-preview sign-preview--empty">未選取圖片</div>

                  <div class="sign-meta-row">
                    <div class="sign-meta-title">簽名圖片</div>
                    <div class="sign-meta-name">{{ coverSigner('approved')?.name || '尚未從檔案中心選取' }}</div>
                  </div>

                  <div class="sign-actions">
                    <el-button size="small" type="primary" plain @click="openCoverSignerPicker('approved')">
                      從檔案中心選取
                    </el-button>
                    <el-button size="small" plain @click="clearCoverSigner('approved')" :disabled="!coverSigner('approved')?.url">
                      清除
                    </el-button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </el-tab-pane>

        <el-tab-pane name="summary" label="Summary">
          <div class="pane">
            <div class="pane-title"><b>Summary of Test</b></div>

            <el-alert
              v-if="!enabledSectionList.length"
              type="info"
              show-icon
              :closable="false"
              title="目前沒有啟用的章節。請到 Dashboard 勾選 Show 或到 Config 建立章節。"
              style="margin-bottom: 12px"
            />

            <el-table v-else :data="summaryRows" border stripe>
              <el-table-column
                prop="category"
                label="Category of Test Cases"
                min-width="280"
              />
              <el-table-column prop="total" label="Total TC #" width="120" align="center" />
              <el-table-column prop="pass" label="Pass" width="120" align="center" />
              <el-table-column prop="fail" label="Fail" width="120" align="center" />
              <el-table-column
                prop="untested"
                label="Untested"
                width="140"
                align="center"
              />
              <el-table-column width="120" align="right">
                <template #default="{ row }">
                  <el-button size="small" type="primary" plain @click="goTab(row.key)">
                    Open
                  </el-button>
                </template>
              </el-table-column>
            </el-table>

            <div class="kpis kpis-compact" style="margin-top: 12px">
              <div class="kpi">
                <div class="kpi-label">Completed Rate</div>
                <div class="kpi-val">{{ pct(completedRate) }}</div>
              </div>
              <div class="kpi">
                <div class="kpi-label">PASS Rate</div>
                <div class="kpi-val">{{ pct(passRate) }}</div>
              </div>
            </div>
          </div>
        </el-tab-pane>

        <el-tab-pane name="contents" label="Contents">
          <div class="pane">
            <div class="pane-title"><b>Contents</b></div>

            <div class="contents">
              <div class="contents-block">
                <div class="contents-hd">Fixed Pages</div>
                <div class="contents-list">
                  <div class="contents-item" @click="goTab('dashboard')">Dashboard</div>
                  <div class="contents-item" @click="goTab('cover')">Cover</div>
                  <div class="contents-item" @click="goTab('summary')">Summary</div>
                  <div class="contents-item" @click="goTab('contents')">Contents</div>
                  <div class="contents-item" @click="goTab('config')">Config</div>
                </div>
              </div>

              <div class="contents-block">
                <div class="contents-hd">Test Sections</div>

                <el-alert
                  v-if="!enabledSectionList.length"
                  type="info"
                  show-icon
                  :closable="false"
                  title="尚無啟用章節。請到 Dashboard 勾選 Show 或到 Config 建立章節。"
                  style="margin-bottom: 10px"
                />

                <div v-for="sec in enabledSectionList" :key="sec.key" class="contents-sec">
                  <div class="contents-item sec" @click="goTab(sec.key)">
                    {{ sec.no }} {{ sec.title }}
                  </div>

                  <div class="contents-sublist">
                    <div
                      v-for="tc in (sec.testCases || [])"
                      :key="tc.code"
                      class="contents-item sub"
                      @click="goTab(sec.key, tc.code)"
                    >
                      {{ tc.code }} — {{ tc.title }}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </el-tab-pane>

        <el-tab-pane name="config" label="Config">
          <div class="pane">
            <div class="pane-title">
              <div class="pane-title-left"><b>Config</b></div>
              <div class="pane-title-right">
                <div class="cfg-kind-inline">
                  <span class="cfg-kind-inline__label">kind</span>
                  <el-select
                    v-model="kind"
                    size="small"
                    class="cfg-kind-inline__select"
                    filterable
                    allow-create
                    default-first-option
                    :reserve-keyword="false"
                    placeholder="kind"
                    @change="onKindChanged"
                  >
                    <el-option v-for="k in knownKinds" :key="k" :label="k" :value="k" />
                  </el-select>
                </div>
                <el-button size="small" plain :icon="Download" @click="tryLoadTemplateByKind">
                  載入模板
                </el-button>
                <el-button size="small" plain :icon="Document" @click="openJson">
                  JSON 匯入/匯出
                </el-button>
                <el-button
                  size="small"
                  type="danger"
                  plain
                  :icon="Delete"
                  @click="clearDraftStorage"
                >
                  清除此 kind 草稿
                </el-button>
              </div>
            </div>

            <div class="cfg">

              <div class="cfg-row">
                <div class="cfg-label">1.1 DUT to be approved</div>
                <div class="cfg-controls">
                  <div class="cfg-sheet-title"><b>DUT to be approved</b></div>
                  <div class="grid2">
                    <div class="field">
                      <div class="label">DUT Model Name</div>
                      <el-input v-model="draft.dut.modelName" />
                    </div>
                    <div class="field">
                      <div class="label">Amount</div>
                      <el-input-number v-model="draft.dut.amount" :min="0" style="width: 100%" />
                    </div>
                    <div class="field wide">
                      <div class="label">Spec.</div>
                      <el-input v-model="draft.dut.spec" type="textarea" :rows="3" />
                    </div>
                  </div>
                </div>
              </div>

              <div class="cfg-row">
                <div class="cfg-label">1.2 CPU Board List</div>
                <div class="cfg-controls">
                  <div class="cfg-sheet-title"><b>CPU Board List</b></div>
                  <div class="hint">In below table, it lists CPU boards that DUT will be tested with.</div>
                  <div class="row-actions">
                    <el-button size="small" type="primary" plain :icon="Plus" @click="addConfigTableRow('cpuBoards')">
                      新增列
                    </el-button>
                  </div>
                  <el-table :data="draft.configSheet.cpuBoards" border stripe size="small" class="cfg-table" empty-text="尚無 CPU Board 資料">
                    <el-table-column label="P/N" min-width="220">
                      <template #default="{ row }">
                        <el-input v-model="row.pn" placeholder="P/N" />
                      </template>
                    </el-table-column>
                    <el-table-column label="Spec." min-width="360">
                      <template #default="{ row }">
                        <el-input v-model="row.spec" placeholder="Spec." />
                      </template>
                    </el-table-column>
                    <el-table-column label="Amount" width="140" align="center">
                      <template #default="{ row }">
                        <el-input-number v-model="row.amount" :min="0" style="width: 100%" />
                      </template>
                    </el-table-column>
                    <el-table-column label="操作" width="90" align="center">
                      <template #default="{ $index }">
                        <el-button type="danger" plain size="small" @click="removeRow(draft.configSheet.cpuBoards, $index)">
                          刪除
                        </el-button>
                      </template>
                    </el-table-column>
                  </el-table>
                </div>
              </div>

              <div class="cfg-row">
                <div class="cfg-label">1.3 Systems list to be tested on</div>
                <div class="cfg-controls">
                  <div class="cfg-sheet-title"><b>Systems list to be tested on</b></div>
                  <div class="hint">In below table, it lists systems that DUT will be tested with.</div>
                  <div class="row-actions">
                    <el-button size="small" type="primary" plain :icon="Plus" @click="addConfigTableRow('systems')">
                      新增列
                    </el-button>
                  </div>
                  <el-table :data="draft.configSheet.systems" border stripe size="small" class="cfg-table" empty-text="尚無 System 資料">
                    <el-table-column label="P/N" min-width="220">
                      <template #default="{ row }">
                        <el-input v-model="row.pn" placeholder="P/N" />
                      </template>
                    </el-table-column>
                    <el-table-column label="Spec." min-width="360">
                      <template #default="{ row }">
                        <el-input v-model="row.spec" placeholder="Spec." />
                      </template>
                    </el-table-column>
                    <el-table-column label="Amount" width="140" align="center">
                      <template #default="{ row }">
                        <el-input-number v-model="row.amount" :min="0" style="width: 100%" />
                      </template>
                    </el-table-column>
                    <el-table-column label="操作" width="90" align="center">
                      <template #default="{ $index }">
                        <el-button type="danger" plain size="small" @click="removeRow(draft.configSheet.systems, $index)">
                          刪除
                        </el-button>
                      </template>
                    </el-table-column>
                  </el-table>
                </div>
              </div>

              <div class="cfg-row">
                <div class="cfg-label">#.# Accessories List</div>
                <div class="cfg-controls">
                  <div class="cfg-sheet-title"><b>Accessories List</b></div>
                  <div class="row-actions">
                    <el-button size="small" type="primary" plain :icon="Plus" @click="addConfigTableRow('accessories')">
                      新增列
                    </el-button>
                  </div>
                  <el-table :data="draft.configSheet.accessories" border stripe size="small" class="cfg-table" empty-text="尚無 Accessories 資料">
                    <el-table-column label="P/N" min-width="220">
                      <template #default="{ row }">
                        <el-input v-model="row.pn" placeholder="P/N" />
                      </template>
                    </el-table-column>
                    <el-table-column label="Spec." min-width="360">
                      <template #default="{ row }">
                        <el-input v-model="row.spec" placeholder="Spec." />
                      </template>
                    </el-table-column>
                    <el-table-column label="Amount" width="140" align="center">
                      <template #default="{ row }">
                        <el-input-number v-model="row.amount" :min="0" style="width: 100%" />
                      </template>
                    </el-table-column>
                    <el-table-column label="操作" width="90" align="center">
                      <template #default="{ $index }">
                        <el-button type="danger" plain size="small" @click="removeRow(draft.configSheet.accessories, $index)">
                          刪除
                        </el-button>
                      </template>
                    </el-table-column>
                  </el-table>
                </div>
              </div>

              <div class="cfg-row">
                <div class="cfg-label">1.4 Appearance of DUT</div>
                <div class="cfg-controls">
                  <div class="cfg-sheet-title"><b>Appearance of DUT</b></div>
                  <div class="grid2eq">
                    <div class="cfg-photo-card">
                      <div class="label">Caption</div>
                      <el-input v-model="draft.configSheet.appearance.topCaption" placeholder="TOP SIDE" />
                      <div class="photo-hd" style="margin-top: 10px;">
                        <div class="photo-title">{{ draft.configSheet.appearance.topCaption || 'TOP SIDE' }}</div>
                        <el-upload
                          :show-file-list="false"
                          :http-request="(opt) => uploadPhotoToList(opt, draft.configSheet.appearance.topPhotos)"
                          accept="image/*"
                          :disabled="(draft.configSheet.appearance.topPhotos || []).length >= MAX_CONFIG_PHOTOS"
                        >
                          <el-button size="small" type="primary">Add Image</el-button>
                        </el-upload>
                      </div>
                      <div v-if="(draft.configSheet.appearance.topPhotos || []).length" class="photo-grid cfg-photo-grid">
                        <div v-for="(p, idx) in draft.configSheet.appearance.topPhotos" :key="p.id || idx" class="photo-item">
                          <img :src="previewSrc(p) || ''" style="width:100%;height:100%;object-fit:cover;display:block;" />
                          <el-button class="photo-del" size="small" type="danger" circle :icon="Delete" @click="removePhotoFromList(draft.configSheet.appearance.topPhotos, idx)" />
                        </div>
                      </div>
                      <div v-else class="cfg-empty-text">No images</div>
                    </div>

                    <div class="cfg-photo-card">
                      <div class="label">Caption</div>
                      <el-input v-model="draft.configSheet.appearance.bottomCaption" placeholder="BOT SIDE" />
                      <div class="photo-hd" style="margin-top: 10px;">
                        <div class="photo-title">{{ draft.configSheet.appearance.bottomCaption || 'BOT SIDE' }}</div>
                        <el-upload
                          :show-file-list="false"
                          :http-request="(opt) => uploadPhotoToList(opt, draft.configSheet.appearance.bottomPhotos)"
                          accept="image/*"
                          :disabled="(draft.configSheet.appearance.bottomPhotos || []).length >= MAX_CONFIG_PHOTOS"
                        >
                          <el-button size="small" type="primary">Add Image</el-button>
                        </el-upload>
                      </div>
                      <div v-if="(draft.configSheet.appearance.bottomPhotos || []).length" class="photo-grid cfg-photo-grid">
                        <div v-for="(p, idx) in draft.configSheet.appearance.bottomPhotos" :key="p.id || idx" class="photo-item">
                          <img :src="previewSrc(p) || ''" style="width:100%;height:100%;object-fit:cover;display:block;" />
                          <el-button class="photo-del" size="small" type="danger" circle :icon="Delete" @click="removePhotoFromList(draft.configSheet.appearance.bottomPhotos, idx)" />
                        </div>
                      </div>
                      <div v-else class="cfg-empty-text">No images</div>
                    </div>
                  </div>
                </div>
              </div>

              <div class="cfg-row">
                <div class="cfg-label">Sections</div>
                <div class="cfg-controls">
                  <div class="row-actions">
                    <el-button type="primary" plain :icon="Plus" @click="addSection">
                      新增章節
                    </el-button>
                    <el-button plain @click="resetToBlank">
                      重設（空白模板）
                    </el-button>
                  </div>

                  <el-alert
                    v-if="!allSectionList.length"
                    type="info"
                    show-icon
                    :closable="false"
                    title="目前沒有章節。請按「新增章節」或用 JSON 匯入模板。"
                    style="margin-bottom: 10px"
                  />

                  <el-collapse v-model="openSections">
                    <el-collapse-item
                      v-for="(sec, sIdx) in allSectionList"
                      :key="sec.key"
                      :name="sec.key"
                    >
                      <template #title>
                        <div class="collapse-title">
                          <el-checkbox
                            v-model="draft.enabled[sec.key]"
                            @change="onEnabledChanged"
                          />
                          <span class="ct-no">{{ sec.no || '?.' }}</span>
                          <span class="ct-title">{{ sec.title || '(untitled)' }}</span>
                          <span class="ct-key muted">({{ sec.key }})</span>
                        </div>
                      </template>

                      <div class="sec-edit">
                        <div class="grid3">
                          <div class="field">
                            <div class="label">Key</div>
                            <el-input v-model="sec.key" @change="rebuildEnabledMap" />
                          </div>
                          <div class="field">
                            <div class="label">No.</div>
                            <el-input v-model="sec.no" placeholder="例如 2." />
                          </div>
                          <div class="field">
                            <div class="label">Title</div>
                            <el-input v-model="sec.title" />
                          </div>

                          <div class="field wide">
                            <div class="label">Intro</div>
                            <el-input v-model="sec.intro" type="textarea" :rows="2" />
                          </div>
                        </div>

                        <div class="row-actions">
<el-button size="small" type="primary" plain :icon="Plus" @click="openCreateTc(sec)">
  新增測項
</el-button>

                          <el-button
                            type="danger"
                            plain
                            size="small"
                            :icon="Delete"
                            @click="removeSection(sIdx)"
                          >
                            刪除章節
                          </el-button>
                        </div>

<el-table :data="sec.testCases" border stripe size="small">
  <el-table-column prop="code" label="Code" width="160" />
  <el-table-column prop="title" label="Title" min-width="260" />

  <el-table-column label="est hrs" width="140" align="center">
    <template #default="{ row }">
      {{ toNum(row.estHrs, 0).toFixed(2).replace(/\.00$/, '') }}
    </template>
  </el-table-column>

  <el-table-column width="100" align="center">
    <template #default="{ row, $index }">
      <el-button
        size="small"
        type="primary"
        plain
        @click="jumpToTc(sec.key, tcRefKey(row, $index))"
      >
        定位
      </el-button>
    </template>
  </el-table-column>

  <el-table-column width="100" align="center">
    <template #default="{ row, $index }">
      <el-button
        size="small"
        plain
        :icon="EditPen"
        @click="openEditTc(sec, row, $index)"
      >
        編輯
      </el-button>
    </template>
  </el-table-column>

  <el-table-column width="100" align="center">
    <template #default="{ row, $index }">
      <el-button
        size="small"
        plain
        @click="duplicateTc(sec, row, $index)"
      >
        複製
      </el-button>
    </template>
  </el-table-column>

  <el-table-column width="90" align="center">
    <template #default="{ $index }">
      <el-button
        type="danger"
        plain
        size="small"
        @click="removeRow(sec.testCases, $index)"
      >
        刪除
      </el-button>
    </template>
  </el-table-column>
</el-table>

                      </div>
                    </el-collapse-item>
                  </el-collapse>
                </div>
              </div>
            </div>

            <!-- JSON Dialog -->
            <el-dialog v-model="jsonDlg.open" title="Template JSON 匯入 / 匯出" width="820px">
              <el-alert
                type="info"
                show-icon
                :closable="false"
                title="可貼整份 draft JSON（cover/dut/enabled/sections）。按「套用」會覆蓋。"
                style="margin-bottom: 10px"
              />
              <el-input v-model="jsonDlg.text" type="textarea" :rows="18" />
              <template #footer>
                <el-button @click="jsonDlg.open = false">取消</el-button>
                <el-button plain @click="exportJson">匯出目前 JSON</el-button>
                <el-button type="primary" :icon="Check" @click="applyJson">套用</el-button>
              </template>
            </el-dialog>
          </div>
        </el-tab-pane>

        <!-- ✅ 動態頁：依章節（enabled）生成 Tabs -->
        <el-tab-pane
          v-for="sec in enabledSectionList"
          :key="sec.key"
          :name="sec.key"
          :label="secTabLabel(sec)"
        >
          <div class="pane">
            <div class="pane-title">
              <div class="pane-title-left">
                <b>{{ sec.no }} {{ sec.title }}</b>
              </div>
              <div class="pane-title-right">
<el-button
  type="primary"
  plain
  size="small"
  :icon="Plus"
  @click="openCreateTc(sec)"
>
  新增測項
</el-button>

                <el-button size="small" plain :icon="EditPen" @click="openSectionEditor(sec.key)">
                  編輯章節
                </el-button>
                <el-button size="small" plain :icon="Setting" @click="goTab('config')">
                  Config
                </el-button>
              </div>
            </div>

            <div v-if="sec.intro" class="hint">{{ sec.intro }}</div>

            <div class="cases">
              <!-- ✅ x86 風格 Test Case Card -->
              <el-card
                v-for="tc in (sec.testCases || [])"
                :key="tc.code"
                :id="tcAnchor(tc.code)"
                class="tc-card x86-card"
                shadow="never"
              >
                <!-- top -->
                <div class="x86-head">
<div class="x86-head-left">
  <div class="x86-k">TC Code</div>
  <div class="x86-code">{{ tc.code }}</div>
  <div class="x86-title-text">
    {{ tc.title || 'Test Case' }}
  </div>
</div>


<div class="x86-head-right">
  <el-button text :icon="EditPen" @click="openEditTc(sec, tc)">
    編輯測項
  </el-button>

  <el-tag effect="plain" :type="tcStatus(tc).type">
    {{ tcStatus(tc).label }}
  </el-tag>

  <div class="x86-ctrls">
    <div class="x86-ctrl">
      <div class="x86-ctrl-l">Result</div>
      <el-select v-model="mainRec(tc).result" size="small" style="width: 140px">
        <el-option label="PASS" value="PASS" />
        <el-option label="FAIL" value="FAIL" />
        <el-option label="N/A" value="NA" />
        <el-option label="Untested" value="UNTESTED" />
      </el-select>
    </div>

    <div class="x86-ctrl">
      <div class="x86-ctrl-l">Work hrs.</div>
      <el-input-number
        v-model="mainRec(tc).hours"
        size="small"
        :min="0"
        :step="0.25"
        controls-position="right"
        style="width: 140px"
      />
    </div>
  </div>
</div>

                </div>

                <!-- System / Remark -->
                <div class="x86-row">
                  <div class="x86-row-title">System / Remark</div>
                  <el-input v-model="mainRec(tc).remark" placeholder="System model / remark" />
                </div>

<div class="x86-sec">
  <div class="x86-sec-hd">
    <div class="x86-sec-title">Procedure</div>
    <div class="x86-sec-act">
      <el-button text :icon="EditPen" @click="openEditTc(sec, tc)">Edit</el-button>
    </div>
  </div>

  <div class="x86-box">
    <div class="pre">{{ tc.procedure || '' }}</div>
  </div>
</div>


<div class="x86-sec">
  <div class="x86-sec-hd">
    <div class="x86-sec-title">Criteria</div>
    <div class="x86-sec-act">
      <el-button text :icon="EditPen" @click="openEditTc(sec, tc)">Edit</el-button>
    </div>
  </div>

  <div class="x86-box">
    <div class="pre">{{ tc.criteria || '' }}</div>
  </div>
</div>


                <!-- Photos -->
                <div class="x86-sec">
                  <div class="x86-sec-hd">
                    <div class="x86-sec-title">Test Condition / Measurements</div>
                  </div>

                  <div class="photo-panel">
                    <div class="photo-hd">
                      <div class="photo-title">Photos</div>

                      <el-upload
                        :show-file-list="false"
                        accept="image/*"
                        multiple
                        :disabled="(tc.photos || []).length >= MAX_PHOTOS_PER_TC"
                        :http-request="(opt) => uploadTcImage(opt, tc)"
                      >
                        <el-button size="small" type="primary">Add Image</el-button>
                      </el-upload>

                      <div class="muted">
                        {{ (tc.photos || []).length }} / {{ MAX_PHOTOS_PER_TC }}
                      </div>
                    </div>

                    <div v-if="(tc.photos || []).length" class="photo-grid">
                      <div v-for="(p, idx) in tc.photos" :key="p.id || idx" class="photo-item">
                        <el-image
                          :src="previewSrc(p) || ''"
                          :preview-src-list="tcPhotoUrls(tc)"
                          :initial-index="idx"
                          fit="cover"
                          style="width: 100%; height: 100%"
                        />
                        <el-button
                          class="photo-del"
                          type="danger"
                          plain
                          size="small"
                          @click="removeTcPhoto(tc, idx)"
                        >
                          刪除
                        </el-button>
                      </div>
                    </div>

                    <div v-else class="muted" style="padding: 8px 0">No images</div>
                  </div>
                </div>

                <!-- Remark -->
                <div class="x86-sec">
                  <div class="x86-sec-hd">
                    <div class="x86-sec-title">Remark</div>
                  </div>

                  <el-input
                    v-model="tc.note"
                    type="textarea"
                    :rows="4"
                    placeholder="Ctrl+V paste screenshot / write notes..."
                  />
                </div>
              </el-card>

              <!-- ✅ 空章節提示：可直接新增 / 編輯 -->
              <el-alert
                v-if="sec && !(sec.testCases || []).length"
                type="info"
                show-icon
                :closable="false"
              >
                <template #title>這個章節目前沒有任何測項。</template>
                <div style="margin-top: 8px; display: flex; gap: 8px; flex-wrap: wrap">
                  <el-button
                    size="small"
                    type="primary"
                    plain
                    :icon="Plus"
                    @click="openCreateTc(sec)"
                  >
                    立刻新增測項
                  </el-button>
                  <el-button size="small" plain :icon="EditPen" @click="openSectionEditor(sec.key)">
                    編輯章節
                  </el-button>
                  <el-button size="small" plain :icon="Setting" @click="goTab('config')">
                    到 Config
                  </el-button>
                </div>
              </el-alert>
            </div>
          </div>
        </el-tab-pane>
      </el-tabs>
    </el-card>

<!-- ✅ Section Editor：優化版 -->
<el-dialog
  v-model="secEditDlg.open"
  :title="secEditTitle"
  width="1100px"
  top="4vh"
  :close-on-click-modal="false"
  append-to-body
  destroy-on-close="false"
  class="sec-edit-dialog"
>
  <div v-if="secEditSec" class="sec-editor-shell">
    <!-- Hero -->
    <div class="sec-editor-hero">
      <div class="sec-editor-hero-main">
        <div class="sec-editor-overline">Section Editor</div>
        <div class="sec-editor-heading">
          <span class="sec-editor-no">{{ secEditSec.no || '-' }}</span>
          <span>{{ secEditSec.title || 'Untitled Section' }}</span>
        </div>
        <div class="sec-editor-sub">
          Key：{{ secEditSec.key }}
        </div>
      </div>

      <div class="sec-editor-metas">
        <div class="meta-chip">
          <div class="meta-chip-label">測項數</div>
          <div class="meta-chip-value">{{ secEditStats.count }}</div>
        </div>
        <div class="meta-chip">
          <div class="meta-chip-label">預估工時</div>
          <div class="meta-chip-value">
            {{ secEditStats.hrs.toFixed(2).replace(/\.00$/, '') }}
          </div>
        </div>
      </div>
    </div>

    <!-- 基本資料 -->
    <div class="sec-editor-card">
      <div class="sec-editor-card-hd">
        <div>
          <div class="sec-editor-card-title">章節資料</div>
          <div class="sec-editor-card-desc">常用欄位直接在這裡編輯，進階設定再到 Config。</div>
        </div>

        <div class="sec-editor-card-actions">
          <el-button type="primary" :icon="Plus" @click="openCreateTc(secEditSec)">
            新增測項
          </el-button>
          <el-button plain :icon="Setting" @click="goTab('config')">
            到 Config（進階）
          </el-button>
        </div>
      </div>

      <div class="sec-editor-form-grid">
        <div class="field">
          <div class="label">Key</div>
          <el-input :model-value="secEditSec.key" disabled />
          <div class="mini-help">key 會影響分頁名稱，如需更動請到 Config。</div>
        </div>

        <div class="field">
          <div class="label">No.</div>
          <el-input v-model="secEditSec.no" placeholder="例如 2." />
        </div>

        <div class="field">
          <div class="label">Title</div>
          <el-input v-model="secEditSec.title" placeholder="Section title" />
        </div>

        <div class="field field-span-3">
          <div class="label">Intro</div>
          <el-input
            v-model="secEditSec.intro"
            type="textarea"
            :rows="3"
            placeholder="可選填的章節說明"
          />
        </div>
      </div>
    </div>

    <!-- Test Cases -->
    <div class="sec-editor-card">
      <div class="sec-editor-card-hd">
        <div>
          <div class="sec-editor-card-title">Test Cases</div>
          <div class="sec-editor-card-desc">可直接編輯、定位或刪除測項。</div>
        </div>

        <div class="sec-editor-card-actions">
          <el-button type="primary" plain :icon="Plus" @click="openCreateTc(secEditSec)">
            新增測項
          </el-button>
        </div>
      </div>

      <el-alert
        v-if="!(secEditSec.testCases || []).length"
        type="info"
        show-icon
        :closable="false"
        title="此章節尚無測項，按右上角「新增測項」即可建立。"
        style="margin-bottom: 12px"
      />

      <div class="sec-editor-table-wrap">
        <el-table
          :data="secEditSec.testCases"
          border
          stripe
          size="default"
          empty-text="尚無測項"
        >
          <el-table-column prop="code" label="Code" width="160" />
          <el-table-column prop="title" label="Title" min-width="320" show-overflow-tooltip />

          <el-table-column label="Est. hrs" width="120" align="center">
            <template #default="{ row }">
              {{ toNum(row.estHrs, 0).toFixed(2).replace(/\.00$/, '') }}
            </template>
          </el-table-column>

          <el-table-column width="110" align="center">
            <template #default="{ row }">
              <el-button
                size="small"
                type="primary"
                plain
                @click="jumpToTc(secEditSec.key, row.code)"
              >
                定位
              </el-button>
            </template>
          </el-table-column>

          <el-table-column width="100" align="center">
            <template #default="{ row, $index }">
              <el-button
                size="small"
                plain
                :icon="EditPen"
                @click="openEditTc(secEditSec, row, $index)"
              >
                編輯
              </el-button>
            </template>
          </el-table-column>

          <el-table-column width="90" align="center">
            <template #default="{ $index }">
              <el-button
                type="danger"
                plain
                size="small"
                @click="removeRow(secEditSec.testCases, $index)"
              >
                刪除
              </el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </div>
  </div>

  <el-empty v-else description="Section not found" />

  <template #footer>
    <div class="sec-editor-footer">
      <el-button @click="secEditDlg.open = false">關閉</el-button>
    </div>
  </template>
</el-dialog>

<el-dialog
  v-model="tcEditDlg.open"
  :title="tcEditTitle"
  width="860px"
  top="6vh"
  :close-on-click-modal="false"
  append-to-body
  class="tc-edit-dialog"
>
  <div class="tc-editor-shell">
    <div class="tc-editor-banner">
      <div class="tc-editor-banner-title">
        {{ tcEditDlg.mode === 'edit' ? '編輯測項內容' : '建立新測項' }}
      </div>
      <div class="tc-editor-banner-sub">
        版型比照 x86 Test Case 編輯方式，欄位集中、閱讀更清楚。
      </div>
    </div>

    <el-form label-position="top" class="tc-editor-form">
      <div class="tc-editor-grid">
        <div class="field field-span-2">
          <div class="label">Section</div>
          <el-input :model-value="tcEditSectionLabel" disabled />
        </div>

        <div class="field">
          <div class="label">TC Code</div>
          <el-input v-model="tcEditDlg.form.code" placeholder="e.g. DI_001" />
        </div>

        <div class="field">
          <div class="label">Est. hrs</div>
          <el-input-number
            v-model="tcEditDlg.form.estHrs"
            :min="0"
            :step="0.25"
            controls-position="right"
            style="width: 100%"
          />
        </div>

        <div class="field field-span-2">
          <div class="label">Test Case</div>
          <el-input v-model="tcEditDlg.form.title" placeholder="Test case name..." />
        </div>

        <div class="field field-span-2">
          <div class="label">Procedure</div>
          <el-input
            v-model="tcEditDlg.form.procedure"
            type="textarea"
            :rows="6"
            placeholder="Procedure..."
          />
        </div>

        <div class="field field-span-2">
          <div class="label">Criteria</div>
          <el-input
            v-model="tcEditDlg.form.criteria"
            type="textarea"
            :rows="6"
            placeholder="Criteria..."
          />
        </div>
      </div>
    </el-form>
  </div>

  <template #footer>
    <div class="tc-editor-footer">
      <el-button @click="tcEditDlg.open = false">取消</el-button>
      <el-button type="primary" @click="submitTcEdit">
        {{ tcEditDlg.mode === 'edit' ? '儲存變更' : '建立測項' }}
      </el-button>
    </div>
  </template>
</el-dialog>

<el-dialog
  v-model="filePickerDlg.open"
  width="980px"
  top="6vh"
  :close-on-click-modal="false"
  append-to-body
  class="file-picker-dialog"
>
  <template #header>
    <div class="file-picker-header">
      <div>
        <div class="file-picker-title">從檔案中心選取圖片</div>
        <div class="file-picker-subtitle">
          {{ filePickerDlg.target === 'prepared' ? 'Prepared & Tested By' : 'Reviewed & Approved By' }}
        </div>
      </div>
    </div>
  </template>

  <div class="file-picker-toolbar">
    <el-input
      v-model="filePickerDlg.keyword"
      clearable
      placeholder="搜尋檔名 / 關鍵字"
      @keyup.enter="fetchFileCenterImages"
      @clear="fetchFileCenterImages"
    />
    <el-button type="primary" @click="fetchFileCenterImages">搜尋</el-button>
    <el-button plain @click="fetchFileCenterImages">重新整理</el-button>
  </div>

  <el-alert
    type="info"
    show-icon
    :closable="false"
    title="僅顯示檔案中心的圖片類檔案。選取後會帶入 Cover 的簽名圖片。"
    style="margin-bottom: 12px"
  />

  <div v-loading="filePickerDlg.loading" class="file-picker-body">
    <el-empty v-if="!filePickerDlg.rows.length && !filePickerDlg.loading" description="目前沒有可選的圖片" />

    <div v-else class="file-picker-grid">
      <button
        v-for="row in filePickerDlg.rows"
        :key="row.id || row.url || row.name"
        type="button"
        class="file-card"
        @click="chooseCoverSigner(row)"
      >
        <div class="file-card__thumb">
          <img v-if="previewSrc(row)" :src="previewSrc(row)" :alt="row.name || 'image'" />
          <div v-else class="file-card__thumb-empty">No Preview</div>
        </div>
        <div class="file-card__meta">
          <div class="file-card__name">{{ row.name || 'Unnamed image' }}</div>
          <div class="file-card__sub">{{ row.category || 'Image' }}</div>
        </div>
      </button>
    </div>
  </div>

  <template #footer>
    <div class="file-picker-footer">
      <el-button @click="filePickerDlg.open = false">關閉</el-button>
    </div>
  </template>
</el-dialog>

    <div class="bottom-gap"></div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { useRoute, useRouter, onBeforeRouteLeave } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Refresh, Check, Plus, Delete, Document, Download, Setting, EditPen } from '@element-plus/icons-vue'
import getApiBase from '../utils/apiBase'
import ProductTestActions from './ProductTestActions.vue'
import { useProtectedImagePreview } from '../composables/useProtectedImagePreview'

/* ---------------- basic ---------------- */
const route = useRoute()
const router = useRouter()
const apiBase = getApiBase()

const loading = ref(false)
const product = ref(null)
const productTitle = computed(() => {
  const p = product.value
  if (!p) return ''
  return `${p.name || ''}${p.model ? ` · ${p.model}` : ''}`
})

function authHeaders () {
  const token = localStorage.getItem('token') || sessionStorage.getItem('token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}
function handleAuth (res) {
  if (res.status === 401) {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    sessionStorage.removeItem('token')
    sessionStorage.removeItem('user')
    ElMessage.warning('Session expired')
    router.push('/login')
    return true
  }
  return false
}
function deepClone (x) {
  return JSON.parse(JSON.stringify(x ?? null))
}
function toNum (v, def = 0) {
  const n = Number(v)
  return Number.isFinite(n) ? n : def
}

/* ---------------- tabs ---------------- */
const activeTab = ref(String(route.query.page || 'dashboard'))

function goTab (name, tcCode = '') {
  activeTab.value = name
  router.replace({
    query: {
      ...route.query,
      page: name,
      kind: kind.value || undefined,
      tc: tcCode || undefined,
    },
  }).catch(() => {})

  if (tcCode) {
    nextTick(() => {
      const el = document.getElementById(tcAnchor(tcCode))
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }
}

function onTabChange () {
  if (String(route.query.page || 'dashboard') !== String(activeTab.value)) {
    goTab(activeTab.value, String(route.query.tc || ''))
  }
}

/* ---------------- kind ---------------- */
const kind = ref(String(route.query.kind || 'generic').trim() || 'generic')

const KNOWN_KINDS_KEY = 'partTest:kinds'
const knownKinds = ref(loadKnownKinds())

function loadKnownKinds () {
  try {
    const raw = localStorage.getItem(KNOWN_KINDS_KEY)
    const arr = raw ? JSON.parse(raw) : []
    const base = Array.isArray(arr) ? arr.map(s => String(s).trim()).filter(Boolean) : []
    if (!base.includes('generic')) base.unshift('generic')
    return Array.from(new Set(base))
  } catch {
    return ['generic']
  }
}
function persistKnownKinds () {
  localStorage.setItem(KNOWN_KINDS_KEY, JSON.stringify(knownKinds.value))
}
function ensureKnownKind (k) {
  const v = String(k || '').trim()
  if (!v) return
  if (!knownKinds.value.includes(v)) {
    knownKinds.value = [v, ...knownKinds.value]
    persistKnownKinds()
  }
}

/* ---------------- templates ---------------- */
function todayStr () {
  const d = new Date()
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

function blankConfigRow () {
  return { pn: '', spec: '', amount: 1 }
}

function blankSummary () {
  return { comments: '' }
}

function isDeviceAssemblySection (sec) {
  const key = String(sec?.key || '').trim().toUpperCase()
  const title = String(sec?.title || '').trim().toLowerCase()
  const no = String(sec?.no || '').trim()
  return key === 'DA' || no.startsWith('2') || title.includes('device installation') || title.includes('device assembly')
}

function isMemoryFunctionsSection (sec) {
  const key = String(sec?.key || '').trim().toUpperCase()
  const title = String(sec?.title || '').trim().toLowerCase()
  const no = String(sec?.no || '').trim()
  return key === 'MF' || no.startsWith('3') || title.includes('memory functions')
}

function isReliabilitySection (sec) {
  const key = String(sec?.key || '').trim().toUpperCase()
  const title = String(sec?.title || '').trim().toLowerCase()
  const no = String(sec?.no || '').trim()
  return key === 'RE' || no.startsWith('4') || title.includes('reliability') || title.includes('stress test')
}

function isThermalProfileSection (sec) {
  const key = String(sec?.key || '').trim().toUpperCase()
  const title = String(sec?.title || '').trim().toLowerCase()
  const no = String(sec?.no || '').trim()
  return key === 'THRM' || key === 'THERM' || no.startsWith('5') || title.includes('thermal profile')
}

function isMemoryInfoTc (tc) {
  const code = String(tc?.code || '').trim().toUpperCase()
  const title = String(tc?.title || '').trim().toLowerCase()
  return code === 'MI_001' || title.includes('information recognized') || title.includes('recognized and supported')
}

const BUILTIN_TEMPLATES = {
  generic: () => ({
    cover: {
      projectName: '',
      reportName: 'Part Test Report',
      revision: '0.1',
      releasedDate: todayStr(),
      preparedBy: '',
      approvedBy: '',
      preparedBySign: null,
      approvedBySign: null,
      databaseVer: '0002',
    },
    summary: blankSummary(),
    dut: { modelName: '', spec: '', amount: 1 },
    configSheet: {
      cpuBoards: [blankConfigRow()],
      systems: [blankConfigRow()],
      accessories: [blankConfigRow()],
      appearance: {
        topCaption: 'TOP SIDE',
        topPhotos: [],
        bottomCaption: 'BOT SIDE',
        bottomPhotos: [],
      },
    },
    enabled: {},
    sections: [],
  }),
}

const REMOTE_TPL_MAP = ref({})
async function fetchRemoteTemplatesIfAny () {
  try {
    const res = await fetch(`${apiBase}/part-templates`, { headers: authHeaders() })
    if (handleAuth(res)) return
    if (!res.ok) return
    const j = await res.json().catch(() => ({}))
    let map = {}
    if (j?.templates && typeof j.templates === 'object' && !Array.isArray(j.templates)) {
      map = j.templates
    } else if (Array.isArray(j?.templates)) {
      for (const it of j.templates) {
        const k = String(it?.kind || it?.key || '').trim()
        if (k && it?.template && typeof it.template === 'object') map[k] = it.template
      }
    }
    REMOTE_TPL_MAP.value = map || {}
    for (const k of Object.keys(REMOTE_TPL_MAP.value)) ensureKnownKind(k)
  } catch {}
}

function templateByKind (k) {
  const key = String(k || '').trim() || 'generic'

  const remote = REMOTE_TPL_MAP.value?.[key]
  if (remote && typeof remote === 'object') return deepClone(remote)

  const localTplKey = `partTest:template:${key}`
  try {
    const raw = localStorage.getItem(localTplKey)
    if (raw) {
      const obj = JSON.parse(raw)
      if (obj && typeof obj === 'object') return deepClone(obj)
    }
  } catch {}

  const fn = BUILTIN_TEMPLATES[key]
  if (typeof fn === 'function') return fn()

  return BUILTIN_TEMPLATES.generic()
}

/* ---------------- draft ---------------- */
function blankDraft () {
  return BUILTIN_TEMPLATES.generic()
}
const draft = reactive(blankDraft())
const dirty = ref(false)
const muteDirty = ref(false)

function storageKey () {
  const id = Number(route.params.id || 0)
  const k = String(kind.value || 'generic').trim() || 'generic'
  return `partTestDraft:v3:${id}:${k}`
}
function loadDraft () {
  const raw = localStorage.getItem(storageKey())
  if (!raw) return false
  try {
    const obj = JSON.parse(raw)
    if (!obj || typeof obj !== 'object') return false

    muteDirty.value = true
    Object.keys(draft).forEach(k => delete draft[k])
    Object.assign(draft, obj)
    normalizeDraft()
    dirty.value = false

    nextTick(() => { muteDirty.value = false })
    return true
  } catch {
    muteDirty.value = false
    return false
  }
}
let autoSaveTimer = null

function persistDraftSilently () {
  try {
    localStorage.setItem(storageKey(), JSON.stringify(draft))
  } catch (e) {
    console.error('persistDraftSilently failed:', e)
  }
}

function saveDraft () {
  persistDraftSilently()
  dirty.value = false
  ElMessage.success('草稿已儲存')
}
function clearDraftStorage () {
  localStorage.removeItem(storageKey())
  ElMessage.success('已清除此 kind 草稿')
}

/* ---------------- normalize ---------------- */
function normalizeDraft () {
  if (!draft.cover || typeof draft.cover !== 'object') draft.cover = {}
  if (!draft.dut || typeof draft.dut !== 'object') draft.dut = {}
  if (!draft.enabled || typeof draft.enabled !== 'object') draft.enabled = {}
  if (!Array.isArray(draft.sections)) draft.sections = []

  for (const sec of draft.sections) {
    if (!sec || typeof sec !== 'object') continue
    sec.key = String(sec.key || '').trim() || `SEC_${Math.random().toString(16).slice(2, 8)}`
    sec.no = String(sec.no || '').trim() || ''
    sec.title = String(sec.title || '').trim() || ''
    sec.intro = String(sec.intro || '').trim() || ''
    if (!Array.isArray(sec.testCases)) sec.testCases = []

    for (const tc of sec.testCases) {
      if (!tc || typeof tc !== 'object') continue
      tc.code = String(tc.code || '').trim() || `TC_${Math.random().toString(16).slice(2, 8)}`
      tc.title = String(tc.title || '').trim() || ''
      tc.estHrs = toNum(tc.estHrs, 0)
      tc.procedure = String(tc.procedure || '')
      tc.criteria = String(tc.criteria || '')

      // ✅ x86 風格欄位
      if (!Array.isArray(tc.photos)) tc.photos = []
      tc.note = String(tc.note || '')

      // ✅ 主結果固定 records[0]
      if (!Array.isArray(tc.records)) tc.records = []
      if (!tc.records.length) tc.records.push({ remark: '', result: 'UNTESTED', hours: 0.5 })
      for (const r of tc.records) {
        if (!r || typeof r !== 'object') continue
        r.remark = String(r.remark || '')
        r.result = String(r.result || 'UNTESTED')
        r.hours = toNum(r.hours, 0.5)
      }
    }

    if (draft.enabled[sec.key] === undefined) draft.enabled[sec.key] = true
  }
}

watch(draft, () => {
  if (muteDirty.value) return

  dirty.value = true

  clearTimeout(autoSaveTimer)
  autoSaveTimer = setTimeout(() => {
    persistDraftSilently()
  }, 250)
}, { deep: true })

/* ---------------- sections lists ---------------- */
const openSections = ref([])
const allSectionList = computed(() => (draft.sections || []))
const enabledSectionList = computed(() => {
  const en = draft.enabled || {}
  return allSectionList.value.filter(s => en[String(s.key || '').trim()] !== false)
})

function rebuildEnabledMap () {
  const old = draft.enabled || {}
  const next = {}
  for (const sec of allSectionList.value) {
    const k = String(sec.key || '').trim()
    if (!k) continue
    next[k] = old[k] !== undefined ? old[k] : true
  }
  draft.enabled = next
  onEnabledChanged()
}

function onEnabledChanged () {
  const allow = new Set(['dashboard', 'cover', 'summary', 'contents', 'config'])
  enabledSectionList.value.forEach(s => allow.add(s.key))
  if (!allow.has(activeTab.value)) goTab('dashboard')
}

function secTabLabel (sec) {
  const short = String(sec.shortName || '').trim()
  if (short) return short
  const t = String(sec.title || '').trim()
  return t.length > 10 ? t.slice(0, 10) + '…' : (t || sec.key)
}

/* ---------------- dashboard/summary calc ---------------- */
function isDone (result) {
  const r = String(result || '').toUpperCase()
  return r === 'PASS' || r === 'FAIL' || r === 'NA'
}

function countTcStatus (tcs) {
  let total = 0, pass = 0, fail = 0, untested = 0, tested = 0
  let estHrs = 0
  let workHrs = 0

  for (const tc of (tcs || [])) {
    total += 1
    estHrs += toNum(tc.estHrs, 0)

    const rec = Array.isArray(tc.records) ? tc.records : []
    const hasTested = rec.some(r => isDone(r.result))
    const hasFail = rec.some(r => String(r.result || '').toUpperCase() === 'FAIL')
    const hasPass = rec.some(r => String(r.result || '').toUpperCase() === 'PASS')

    for (const r of rec) workHrs += toNum(r.hours, 0)

    if (!rec.length || !hasTested) {
      untested += 1
    } else {
      tested += 1
      if (hasFail) fail += 1
      else if (hasPass) pass += 1
    }
  }

  const progressRate = total ? tested / total : 0
  const pendingHrs = Math.max(0, estHrs - workHrs)

  return { total, pass, fail, untested, tested, estHrs, workHrs, pendingHrs, progressRate }
}

const dashboardRows = computed(() => {
  return allSectionList.value.map(sec => {
    const db = countTcStatus(sec.testCases)
    const shown = (draft.enabled?.[sec.key] !== false)
      ? db
      : { ...db, total: 0, tested: 0, pass: 0, fail: 0, untested: 0, estHrs: 0, workHrs: 0, pendingHrs: 0, progressRate: 0 }

    return {
      key: sec.key,
      name: `${sec.no} ${sec.title}`.trim(),
      dbTotal: db.total,
      shownTotal: shown.total,
      estHrs: shown.estHrs,
      workHrs: shown.workHrs,
      pendingHrs: shown.pendingHrs,
      progressRate: shown.progressRate,
    }
  })
})

const summaryRows = computed(() => {
  return enabledSectionList.value.map(sec => {
    const s = countTcStatus(sec.testCases)
    return {
      key: sec.key,
      category: `${sec.no} ${sec.title}`.trim(),
      total: s.total,
      pass: s.pass,
      fail: s.fail,
      untested: s.untested,
      tested: s.tested,
    }
  })
})

const totalShown = computed(() => enabledSectionList.value.reduce((a, sec) => a + (sec?.testCases?.length || 0), 0))
const totalEstHrs = computed(() => enabledSectionList.value.reduce((a, sec) => a + countTcStatus(sec.testCases).estHrs, 0))
const totalWorkHrs = computed(() => enabledSectionList.value.reduce((a, sec) => a + countTcStatus(sec.testCases).workHrs, 0))
const pendingWorkHrs = computed(() => Math.max(0, totalEstHrs.value - totalWorkHrs.value))

const completedRate = computed(() => {
  const total = summaryRows.value.reduce((a, r) => a + (r.total || 0), 0)
  const tested = summaryRows.value.reduce((a, r) => a + (r.tested || 0), 0)
  return total ? tested / total : 0
})
const passRate = computed(() => {
  const total = summaryRows.value.reduce((a, r) => a + (r.total || 0), 0)
  const pass = summaryRows.value.reduce((a, r) => a + (r.pass || 0), 0)
  return total ? pass / total : 0
})

function pct (x) {
  const n = Number(x)
  if (!Number.isFinite(n)) return '0%'
  return `${Math.round(n * 1000) / 10}%`
}

/* ---------------- testcases helpers ---------------- */
function tcAnchor (code) {
  return `ptc-${String(code || '').replace(/[^a-z0-9_-]/ig, '_')}`
}
function removeRow (arr, idx) {
  if (!Array.isArray(arr)) return
  arr.splice(idx, 1)
}

function addConfigTableRow (key) {
  if (!draft.configSheet || typeof draft.configSheet !== 'object') draft.configSheet = {}
  if (!Array.isArray(draft.configSheet[key])) draft.configSheet[key] = []
  draft.configSheet[key].push(blankConfigRow())
}

/* ---------------- sections CRUD ---------------- */
function nextSectionNo () {
  const used = new Set(allSectionList.value.map(s => String(s.no || '').trim()).filter(Boolean))
  let n = 2
  while (used.has(`${n}.`)) n += 1
  return `${n}.`
}
function addSection () {
  const key = `SEC_${Math.random().toString(16).slice(2, 8)}`
  const no = nextSectionNo()
  const sec = { key, no, title: 'New Section', intro: '', testCases: [] }
  draft.sections.push(sec)
  if (!draft.enabled) draft.enabled = {}
  draft.enabled[key] = true
  openSections.value = Array.from(new Set([...openSections.value, key]))
  nextTick(() => goTab(key))
}
function removeSection (idx) {
  const sec = draft.sections[idx]
  const k = String(sec?.key || '').trim()
  draft.sections.splice(idx, 1)
  if (k && draft.enabled) delete draft.enabled[k]
  openSections.value = openSections.value.filter(x => x !== k)
}
function nextTcCode (sec) {
  const existing = new Set((sec.testCases || []).map(t => String(t.code || '').trim()).filter(Boolean))
  let i = 1
  while (existing.has(`DI_${String(i).padStart(3, '0')}`) || existing.has(`TC_${String(i).padStart(3, '0')}`)) i += 1
  // ✅ 預設用 DI_001（像你截圖）
  return `DI_${String(i).padStart(3, '0')}`
}
function addTestCase (sec) {
  if (!sec.testCases) sec.testCases = []
  const tc = {
    code: nextTcCode(sec),
    title: 'New Test Case',
    estHrs: 0.5,
    procedure: '',
    criteria: '',
    photos: [],
    note: '',
    records: [{ remark: '', result: 'UNTESTED', hours: 0.5 }],
  }
  sec.testCases.push(tc)
  return tc
}
function resetToBlank () {
  const b = BUILTIN_TEMPLATES.generic()
  muteDirty.value = true
  Object.keys(draft).forEach(k => delete draft[k])
  Object.assign(draft, deepClone(b))
  normalizeDraft()
  dirty.value = true
  nextTick(() => { muteDirty.value = false })
  ElMessage.success('已重設為空白模板')
}

/* ---------------- tc editor dialog ---------------- */
function resolveSection (secOrKey) {
  if (secOrKey && typeof secOrKey === 'object') return secOrKey
  const key = String(secOrKey || '').trim()
  return (allSectionList.value || []).find(s => String(s?.key || '').trim() === key) || null
}

function blankTcForm () {
  return {
    code: '',
    title: '',
    estHrs: 0.5,
    procedure: '',
    criteria: '',
  }
}

const tcEditDlg = reactive({
  open: false,
  mode: 'create', // create | edit
  secKey: '',
  index: -1,
  form: blankTcForm(),
})

const tcEditSec = computed(() => resolveSection(tcEditDlg.secKey))

const tcEditTitle = computed(() => {
  return tcEditDlg.mode === 'edit' ? '編輯測項' : '新增測項'
})

const tcEditSectionLabel = computed(() => {
  const s = tcEditSec.value
  if (!s) return ''
  return `${String(s.no || '').trim()} ${String(s.title || '').trim()}`.trim() || s.key
})

function openCreateTc (secOrKey) {
  const sec = resolveSection(secOrKey)
  if (!sec) return

  tcEditDlg.mode = 'create'
  tcEditDlg.secKey = String(sec.key || '').trim()
  tcEditDlg.index = -1
  tcEditDlg.form = {
    code: nextTcCode(sec),
    title: 'New Test Case',
    estHrs: 0.5,
    procedure: '',
    criteria: '',
  }
  tcEditDlg.open = true
}

function openEditTc (secOrKey, tc, idx = -1) {
  const sec = resolveSection(secOrKey)
  if (!sec) return

  let row = tc
  let rowIndex = idx

  if (!row && rowIndex >= 0) row = sec.testCases?.[rowIndex]
  if (!row && tc) {
    row = (sec.testCases || []).find(x => x === tc || String(x?.code || '') === String(tc))
  }
  if (!row) return

  if (rowIndex < 0) rowIndex = (sec.testCases || []).findIndex(x => x === row)

  tcEditDlg.mode = 'edit'
  tcEditDlg.secKey = String(sec.key || '').trim()
  tcEditDlg.index = rowIndex
  tcEditDlg.form = {
    code: String(row.code || ''),
    title: String(row.title || ''),
    estHrs: toNum(row.estHrs, 0.5),
    procedure: String(row.procedure || ''),
    criteria: String(row.criteria || ''),
  }
  tcEditDlg.open = true
}

function submitTcEdit () {
  const sec = tcEditSec.value
  if (!sec) return

  const code = String(tcEditDlg.form.code || '').trim()
  const title = String(tcEditDlg.form.title || '').trim()

  if (!code) {
    ElMessage.warning('請輸入 TC Code')
    return
  }
  if (!title) {
    ElMessage.warning('請輸入 Test Case')
    return
  }

  if (!Array.isArray(sec.testCases)) sec.testCases = []

  const dup = sec.testCases.some((x, i) => {
    return String(x?.code || '').trim() === code && i !== tcEditDlg.index
  })
  if (dup) {
    ElMessage.warning('TC Code 不可重複')
    return
  }

  const payload = {
    code,
    title,
    estHrs: toNum(tcEditDlg.form.estHrs, 0.5),
    procedure: String(tcEditDlg.form.procedure || ''),
    criteria: String(tcEditDlg.form.criteria || ''),
  }

  if (tcEditDlg.mode === 'edit' && tcEditDlg.index >= 0 && sec.testCases[tcEditDlg.index]) {
    const old = sec.testCases[tcEditDlg.index]
    sec.testCases[tcEditDlg.index] = {
      ...old,
      ...payload,
    }
    ElMessage.success('測項已更新')
  } else {
    sec.testCases.push({
      ...payload,
      photos: [],
      note: '',
      records: [{ remark: '', result: 'UNTESTED', hours: 0.5 }],
    })
    ElMessage.success('已新增測項')
  }

  tcEditDlg.open = false
  nextTick(() => jumpToTc(sec.key, code))
}




/* ---------------- JSON import/export ---------------- */
const jsonDlg = reactive({ open: false, text: '' })
function openJson () {
  jsonDlg.open = true
  exportJson()
}
function exportJson () {
  jsonDlg.text = JSON.stringify(draft, null, 2)
}
function escHtml (v) {
  return String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
function nl2br (v) {
  return escHtml(v).replace(/\n/g, '<br>')
}
function pdfValue (v, empty = '—') {
  if (v === null || v === undefined || v === '') return empty
  return escHtml(v)
}
function renderPdfSimpleTable (title, rows = []) {
  const body = (rows || []).map(row => `
    <tr>
      <td>${pdfValue(row?.pn)}</td>
      <td>${pdfValue(row?.spec)}</td>
      <td>${pdfValue(row?.amount)}</td>
    </tr>
  `).join('') || `<tr><td colspan="3" class="muted-cell">—</td></tr>`

  return `
    <section class="pdf-block">
      <h3>${escHtml(title)}</h3>
      <table class="pdf-table">
        <thead>
          <tr>
            <th>P/N</th>
            <th>Spec.</th>
            <th>Amount</th>
          </tr>
        </thead>
        <tbody>${body}</tbody>
      </table>
    </section>
  `
}
function renderPdfRecords (sec, tc) {
  const records = Array.isArray(tc?.records) && tc.records.length ? tc.records : [mainRec(tc)]
  return records.map((rec, idx) => {
    const parts = [
      ['System Model', rec?.systemModel],
      ['Remark', rec?.remark],
      ['Result', rec?.result],
      ['Work hrs.', rec?.hours],
    ]

    if (isReliabilitySection(sec)) {
      parts.push(['Voltage (V)', rec?.voltage])
      parts.push(['Temperature (°C)', rec?.temperature])
      parts.push(['Humidity (%RH)', rec?.humidity])
      parts.push(['CPU', rec?.cpu])
      parts.push(['Memory', rec?.memory])
      parts.push(['Disk', rec?.disk])
      parts.push(['CPU Temp (°C)', rec?.cpuTemp])
      parts.push(['Memory Temp (°C)', rec?.memoryTemp])
      parts.push(['Disk Temp (°C)', rec?.diskTemp])
      parts.push(['Chamber Temp (°C)', rec?.chamberTemperature])
      parts.push(['Chamber Humidity (%RH)', rec?.chamberHumidity])
    }

    if (isMemoryInfoTc(tc)) {
      parts.push(['Memory Spec.', rec?.memorySpec])
      parts.push(['Running', rec?.running])
    }

    const grid = parts
      .filter(([, value]) => value !== undefined && value !== null && value !== '')
      .map(([label, value]) => `<div class="meta-item"><b>${escHtml(label)}:</b> ${pdfValue(value)}</div>`)
      .join('')

    return `
      <div class="record-block">
        <div class="record-title">Record #${idx + 1}</div>
        ${grid ? `<div class="meta-grid">${grid}</div>` : ''}
      </div>
    `
  }).join('')
}
function buildPdfHtml (pdfAssets = {}) {
  const reportName = draft?.cover?.reportName || 'Part Test Report'
  const cover = draft?.cover || {}
  const cfg = draft?.configSheet || {}
  const appearance = cfg?.appearance || {}
  const enabled = enabledSectionList.value || []
  const summaryComment = draft?.summary?.comments || ''
  const pageHeadUrl = pdfAssets?.pageHead ? absUrl(pdfAssets.pageHead) : ''
  const pageTailUrl = pdfAssets?.pageTail ? absUrl(pdfAssets.pageTail) : ''
  const systemRows = (cfg.systems || []).filter(x => x && (x.pn || x.spec || x.amount))
  const cpuRows = (cfg.cpuBoards || []).filter(x => x && (x.pn || x.spec || x.amount))
  const accRows = (cfg.accessories || []).filter(x => x && (x.pn || x.spec || x.amount))

  function imgUrl (obj) {
    const u = obj?.url || obj
    return u ? absUrl(u) : ''
  }
  function imgTag (obj, cls = 'img-fit', alt = 'photo') {
    const u = imgUrl(obj)
    return u ? `<img class="${cls}" src="${escHtml(u)}" alt="${escHtml(alt)}" />` : ''
  }
  function joinRows (rows = []) {
    const body = rows.map(r => `
      <tr>
        <td>${pdfValue(r?.pn, 'N/A')}</td>
        <td>${pdfValue(r?.spec)}</td>
        <td class="ta-center">${pdfValue(r?.amount)}</td>
      </tr>
    `).join('')
    return body || `<tr><td>N/A</td><td>—</td><td class="ta-center">—</td></tr>`
  }
  function resultClass (v) {
    const s = String(v || '').toUpperCase()
    if (s === 'PASS') return 'result-pass'
    if (s === 'FAIL') return 'result-fail'
    if (s === 'NA') return 'result-na'
    return 'result-un'
  }
  function page(content, pageNo, cls = '') {
    return `
      <section class="pdf-page ${cls}">
        ${pageHeadUrl ? `<div class="pdf-headimg"><img src="${escHtml(pageHeadUrl)}" alt="PageHead" /></div>` : '<div class="pdf-banner"></div>'}
        <div class="pdf-body">${content}</div>
        <div class="pdf-footer">
          <div class="pdf-footer-center">- ${pageNo} -</div>
          ${pageTailUrl ? `<div class="pdf-tailimg"><img src="${escHtml(pageTailUrl)}" alt="PageTail" /></div>` : '<div class="pdf-footer-right">APLEX Technology Inc. - Confidential</div>'}
        </div>
      </section>
    `
  }

  const pages = []
  let pageNo = 0
  const pushPage = (content, cls = '') => {
    pageNo += 1
    pages.push(page(content, pageNo, cls))
  }

  // Cover page
  pushPage(`
    <div class="cover-page">
      <div class="cover-title">${pdfValue(draft?.dut?.modelName || cover.projectName || reportName, '')}</div>
      <div class="cover-subtitle">${escHtml(reportName)}</div>
      <div class="cover-meta-wrap">
        <div class="cover-meta-row"><span class="cover-meta-label">Revision:</span> <span>${pdfValue(cover.revision)}</span></div>
        <div class="cover-meta-row"><span class="cover-meta-label">Released Date:</span> <span>${pdfValue(cover.releasedDate)}</span></div>
      </div>

      <div class="sign-table sign-table-cover">
        <div class="sign-head">Prepared &amp; Tested By</div>
        <div class="sign-head">Reviewed &amp; Approved By</div>
        <div class="sign-cell">
          <div class="sign-name">${pdfValue(cover.preparedBy, '')}</div>
          ${cover?.preparedBySign?.url ? imgTag(cover.preparedBySign, 'sign-img', 'prepared-sign') : '<div class="sign-placeholder"></div>'}
        </div>
        <div class="sign-cell">
          <div class="sign-name">${pdfValue(cover.approvedBy, '')}</div>
          ${cover?.approvedBySign?.url ? imgTag(cover.approvedBySign, 'sign-img', 'approved-sign') : '<div class="sign-placeholder"></div>'}
        </div>
      </div>

      <div class="cover-dbver">Database ver. ${pdfValue(cover.databaseVer)}</div>
    </div>
  `, 'cover-like')

  // Summary page
  pushPage(`
    <div class="report-page-title">Summary of Test</div>
    <div class="summary-top-grid">
      <div class="summary-comment-box">
        <div class="summary-comment-title">Comments</div>
        <div class="summary-comment-body">${summaryComment ? nl2br(summaryComment) : '說明:'}</div>
      </div>
      <div class="summary-rate-box">
        <div class="rate-row"><span>PASS Rate</span><b>${escHtml(pct(passRate.value))}</b></div>
        <div class="rate-row"><span>FAIL Rate</span><b>${escHtml(pct(1 - passRate.value - (summaryRows.value.reduce((a, r) => a + r.untested, 0) / Math.max(1, summaryRows.value.reduce((a, r) => a + r.total, 0)))))}</b></div>
        <div class="rate-row"><span>Completed Rate</span><b>${escHtml(pct(completedRate.value))}</b></div>
      </div>
    </div>

    <table class="report-table summary-table">
      <thead>
        <tr>
          <th>Category of Test Cases</th>
          <th class="ta-center">Total TC #</th>
          <th class="ta-center">Pass</th>
          <th class="ta-center">Fail</th>
          <th class="ta-center">Untested</th>
        </tr>
      </thead>
      <tbody>
        ${summaryRows.value.map(row => `
          <tr>
            <td>${escHtml(row.category)}</td>
            <td class="ta-center">${row.total}</td>
            <td class="ta-center">${row.pass}</td>
            <td class="ta-center">${row.fail}</td>
            <td class="ta-center">${row.untested}</td>
          </tr>
        `).join('') || '<tr><td colspan="5">—</td></tr>'}
      </tbody>
    </table>
  `)

  // Contents page
  pushPage(`
    <div class="report-page-title">Table of Contents</div>
    <div class="toc-list">
      <div class="toc-item"><span>1. DUT</span><span></span></div>
      <div class="toc-item toc-sub"><span>1.1 DUT to be approved</span><span></span></div>
      <div class="toc-item toc-sub"><span>1.2 CPU Board List</span><span></span></div>
      <div class="toc-item toc-sub"><span>1.3 Systems list to be tested on</span><span></span></div>
      <div class="toc-item toc-sub"><span>1.4 Appearance of DUT</span><span></span></div>
      ${enabled.map(sec => `
        <div class="toc-item"><span>${pdfValue(sec?.no, '')} ${pdfValue(sec?.title, '')}</span><span></span></div>
        ${(sec?.testCases || []).map(tc => `<div class="toc-item toc-sub"><span>${pdfValue(sec?.no, '')}.${pdfValue(tc?.code, '')} ${pdfValue(tc?.title, '')}</span><span></span></div>`).join('')}
      `).join('')}
    </div>
  `)

  // Config page
  pushPage(`
    <div class="section-h1"><span class="sec-no">1.</span><span>DUT</span></div>

    <div class="section-h2"><span class="sec-no">1.1</span><span>DUT to be approved</span></div>
    <table class="report-table">
      <tr>
        <th class="green-head small-col">DUT Model Name</th>
        <td>${pdfValue(draft?.dut?.modelName)}</td>
      </tr>
      <tr>
        <th class="green-head small-col">Spec.</th>
        <td class="spec-cell">${draft?.dut?.spec ? nl2br(draft.dut.spec) : '—'}</td>
        <th class="green-head amount-col">Amount</th>
        <td class="ta-center amount-col">${pdfValue(draft?.dut?.amount)}</td>
      </tr>
    </table>

    <div class="section-h2"><span class="sec-no">1.2</span><span>CPU Board List</span></div>
    <div class="table-note">In below table, it lists CPU boards that DUT will be tested with.</div>
    <table class="report-table">
      <thead>
        <tr>
          <th class="green-head pn-col">P/N</th>
          <th class="green-head">Spec.</th>
          <th class="green-head amount-col">Amount</th>
        </tr>
      </thead>
      <tbody>${joinRows(cpuRows)}</tbody>
    </table>

    <div class="section-h2"><span class="sec-no">1.3</span><span>Systems list to be tested on</span></div>
    <div class="table-note">In below table, it lists systems that DUT will be tested with.</div>
    <table class="report-table">
      <thead>
        <tr>
          <th class="green-head pn-col">P/N</th>
          <th class="green-head">Spec.</th>
          <th class="green-head amount-col">Amount</th>
        </tr>
      </thead>
      <tbody>${joinRows(systemRows)}</tbody>
    </table>

    <div class="section-h2"><span class="sec-no">1.4</span><span>Appearance of DUT</span></div>
    <table class="report-table">
      <tr>
        <th class="green-head caption-col">Caption</th>
        <td class="ta-center">${pdfValue(appearance.topCaption, 'TOP SIDE')}</td>
        <td class="ta-center">${pdfValue(appearance.bottomCaption, 'BOT SIDE')}</td>
      </tr>
    </table>
  `)

  // Photo page
  const appearancePhotos = []
  ;(appearance?.topPhotos || []).forEach(x => appearancePhotos.push({ label: appearance.topCaption || 'TOP SIDE', item: x }))
  ;(appearance?.bottomPhotos || []).forEach(x => appearancePhotos.push({ label: appearance.bottomCaption || 'BOT SIDE', item: x }))
  if (appearancePhotos.length) {
    pushPage(`
      <div class="report-page-title">Photo</div>
      <table class="report-table photo-page-table">
        <tr>
          <th class="green-head photo-label-col">Photo</th>
          <td>
            <div class="photo-strip">
              ${appearancePhotos.map(x => `
                <div class="photo-strip-item">
                  ${imgTag(x.item, 'photo-strip-img', x.label)}
                </div>
              `).join('')}
            </div>
          </td>
        </tr>
      </table>
    `)
  }

  function renderMetricPairs (pairs = []) {
    const rows = pairs.filter(([label, val]) => val !== null && val !== undefined && val !== '').map(([label, val]) => `
      <div class="metric-pill"><span>${escHtml(label)}</span><b>${pdfValue(val)}</b></div>
    `).join('')
    return rows ? `<div class="metric-grid">${rows}</div>` : ''
  }

  function renderRecordTable (sec, tc, rec, pageIndex, sectionMeta = '') {
    const devicePhotos = (rec?.devicePhotos || []).filter(x => imgUrl(x))
    const tcPhotos = (tc?.photos || []).filter(x => imgUrl(x))
    const detailRows = []

    if (isMemoryInfoTc(tc)) {
      detailRows.push(`
        <tr>
          <th class="small-col">System Model</th>
          <td>${pdfValue(rec?.systemModel)}</td>
          <th class="small-col">Memory Spec.</th>
          <td>${pdfValue(rec?.memorySpec)}</td>
        </tr>
        <tr>
          <th class="small-col">Running</th>
          <td>${pdfValue(rec?.running)}</td>
          <th class="small-col">Remark</th>
          <td>${pdfValue(rec?.remark)}</td>
        </tr>
      `)
    } else if (isMemoryFunctionsSection(sec)) {
      detailRows.push(`
        <tr>
          <th class="small-col">System Model</th>
          <td>${pdfValue(rec?.systemModel)}</td>
          <th class="small-col">Remark</th>
          <td>${pdfValue(rec?.remark)}</td>
        </tr>
      `)
    } else {
      detailRows.push(`
        <tr>
          <th class="small-col">Remark</th>
          <td colspan="3">${pdfValue(rec?.remark)}</td>
        </tr>
      `)
    }

    const envMetrics = isReliabilitySection(sec) ? renderMetricPairs([
      ['Voltage (V)', rec?.voltage],
      ['Temperature (°C)', rec?.temperature],
      ['Humidity (%RH)', rec?.humidity],
      ['CPU', rec?.cpu],
      ['Memory', rec?.memory],
      ['Disk', rec?.disk],
      ['CPU Temp (°C)', rec?.cpuTemp],
      ['Memory Temp (°C)', rec?.memoryTemp],
      ['Disk Temp (°C)', rec?.diskTemp],
      ['Chamber Temp (°C)', rec?.chamberTemperature],
      ['Chamber Humidity (%RH)', rec?.chamberHumidity],
    ]) : ''

    const photoRow = devicePhotos.length ? `
      <tr>
        <th class="green-photo-cell photo-label-col">Device in<br>System</th>
        <td colspan="3">
          <div class="photo-strip photo-strip-large">
            ${devicePhotos.map(x => `<div class="photo-strip-item">${imgTag(x, 'device-photo-img', 'device-photo')}</div>`).join('')}
          </div>
        </td>
      </tr>
    ` : (tcPhotos.length ? `
      <tr>
        <th class="green-photo-cell photo-label-col">Photo</th>
        <td colspan="3">
          <div class="photo-strip photo-strip-large">
            ${tcPhotos.map(x => `<div class="photo-strip-item">${imgTag(x, 'device-photo-img', 'test-photo')}</div>`).join('')}
          </div>
        </td>
      </tr>
    ` : '')

    return `
      <div class="section-h1"><span class="sec-no">${pdfValue(sec?.no, '')}</span><span>${pdfValue(sec?.title, '')}</span></div>
      <div class="section-h2"><span class="sec-no">${pdfValue(sec?.no, '')}.1</span><span>${pdfValue(tc?.title, '')}</span></div>
      ${sectionMeta ? `<div class="meta-version-line">${sectionMeta}</div>` : ''}
      <table class="report-table tc-report-table">
        <tr>
          <th class="blue-head small-col">Test Case</th>
          <td colspan="3"><span class="tc-link">${pdfValue(tc?.code)}</span>: ${pdfValue(tc?.title, '')}</td>
        </tr>
        <tr>
          <th class="small-col">Test Procedure</th>
          <td colspan="3">${tc?.procedure ? nl2br(tc.procedure) : '—'}</td>
        </tr>
        ${photoRow}
        ${detailRows.join('')}
        ${envMetrics ? `<tr><th class="small-col">Measurements</th><td colspan="3">${envMetrics}</td></tr>` : ''}
        <tr>
          <th class="small-col">Test Criteria</th>
          <td colspan="3">${tc?.criteria ? nl2br(tc.criteria) : '—'}</td>
        </tr>
        <tr>
          <th class="green-photo-cell small-col">Remark</th>
          <td>${pdfValue(rec?.remark)}</td>
          <th class="green-photo-cell result-head-col">Result</th>
          <td class="result-text ${resultClass(rec?.result)}">${pdfValue(rec?.result)}</td>
        </tr>
      </table>
    `
  }

  for (const sec of enabled) {
    const sectionMetaBits = []
    if (sec?.meta?.hwinfoVersion) sectionMetaBits.push(`HWINFO64 Ver. ${escHtml(sec.meta.hwinfoVersion)}`)
    if (sec?.meta?.memtestVersion) sectionMetaBits.push(`MemTest86+ Ver. ${escHtml(sec.meta.memtestVersion)}`)
    if (sec?.meta?.burninVersion) sectionMetaBits.push(`PassMark BurnInTest Ver. ${escHtml(sec.meta.burninVersion)}`)
    const sectionMeta = sectionMetaBits.join(' ｜ ')

    for (const tc of (sec?.testCases || [])) {
      const recs = Array.isArray(tc?.records) && tc.records.length ? tc.records : [mainRec(tc)]
      recs.forEach((rec, idx) => {
        pushPage(renderRecordTable(sec, tc, rec, idx, sectionMeta))
      })
    }
  }

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${escHtml(reportName)}</title>
  <style>
    @page { size: A4 portrait; margin: 0; }
    * { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; }
    body {
      font-family: Arial, "Microsoft JhengHei", sans-serif;
      color: #111;
      background: #fff;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .pdf-page {
      width: 210mm;
      min-height: 297mm;
      page-break-after: always;
      position: relative;
      padding: 0;
      overflow: hidden;
      background: #fff;
    }
    .pdf-banner {
      height: 18mm;
      background: linear-gradient(90deg, #2f9ad7 0%, #1d5ea8 100%);
      position: relative;
    }
    .pdf-banner::after {
      content: 'APLEX Technology';
      position: absolute;
      right: 12mm;
      top: 4mm;
      font-size: 16px;
      font-weight: 800;
      color: #fff;
      letter-spacing: .5px;
    }
    .pdf-body {
      padding: 14mm 14mm 20mm;
    }
    .pdf-footer {
      position: absolute;
      left: 0;
      right: 0;
      bottom: 8mm;
      text-align: center;
      color: #d70f0f;
      font-weight: 700;
      font-size: 11px;
    }
    .pdf-footer-center {
      color: #111;
      margin-bottom: 4px;
    }
    .pdf-footer-right { color: #d70f0f; }
    .cover-like .pdf-body {
      min-height: calc(297mm - 18mm - 20mm);
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .cover-page {
      width: 100%;
      min-height: 238mm;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      position: relative;
    }
    .cover-title {
      font-size: 34px;
      font-weight: 400;
      letter-spacing: .5px;
      text-align: center;
      margin-top: 8mm;
    }
    .cover-subtitle {
      font-size: 22px;
      margin-top: 18mm;
      margin-bottom: 34mm;
    }
    .cover-meta-wrap { text-align: center; }
    .cover-meta-row { font-size: 18px; margin: 12px 0; }
    .cover-meta-label { font-weight: 800; }
    .sign-table {
      width: 70%;
      margin: 28mm auto 0;
      border: 2px solid #333;
      display: grid;
      grid-template-columns: 1fr 1fr;
      grid-template-rows: 34px 132px;
      background: #fff;
    }
    .sign-head, .sign-cell {
      border-right: 1px dashed #666;
      border-bottom: 1px dashed #666;
      display: flex;
      align-items: center;
      justify-content: center;
      text-align: center;
    }
    .sign-head:nth-child(2), .sign-cell:nth-child(4) { border-right: 0; }
    .sign-cell:nth-child(3), .sign-cell:nth-child(4) { border-bottom: 0; flex-direction: column; gap: 6px; }
    .sign-name { color: #4f79d9; font-size: 18px; }
    .sign-img { max-width: 88%; max-height: 78px; object-fit: contain; }
    .sign-placeholder { height: 78px; }
    .cover-dbver {
      position: absolute;
      right: 0;
      bottom: -2mm;
      font-size: 12px;
      color: #333;
    }
    .report-page-title {
      color: #1f4f86;
      font-size: 34px;
      font-weight: 900;
      margin: 8mm 0 8mm;
    }
    .summary-top-grid {
      display: grid;
      grid-template-columns: 1.4fr .9fr;
      gap: 12px;
      margin-bottom: 10px;
      align-items: start;
    }
    .summary-comment-box, .summary-rate-box {
      border: 1px solid #333;
      min-height: 84px;
      background: #fff;
    }
    .summary-comment-title {
      background: #dce9d2;
      padding: 8px 10px;
      font-weight: 800;
      border-bottom: 1px solid #333;
    }
    .summary-comment-body { padding: 10px; min-height: 54px; }
    .rate-row {
      display: flex; justify-content: space-between; gap: 12px;
      padding: 10px 12px; border-bottom: 1px solid #333; font-size: 15px;
    }
    .rate-row:last-child { border-bottom: 0; }
    .rate-row b { color: #1f4f86; }
    .toc-list { margin-top: 10mm; }
    .toc-item {
      display: flex; justify-content: space-between; gap: 12px; padding: 4px 0;
      border-bottom: 1px dotted #bbb; font-size: 16px;
    }
    .toc-sub { padding-left: 18px; font-size: 14px; color: #374151; }
    .section-h1, .section-h2 {
      display: flex; align-items: baseline; gap: 10px; color: #1f4f86; font-weight: 900;
    }
    .section-h1 { font-size: 28px; margin: 4mm 0 6mm; }
    .section-h2 { font-size: 20px; margin: 5mm 0 3mm; }
    .sec-no { min-width: 52px; }
    .table-note { margin: 2mm 0 2mm; font-size: 12px; }
    .report-table {
      width: 100%;
      border-collapse: collapse;
      margin: 3mm 0 5mm;
      table-layout: fixed;
      font-size: 12px;
    }
    .report-table th, .report-table td {
      border: 1px solid #222;
      padding: 6px 8px;
      vertical-align: top;
      word-break: break-word;
    }
    .report-table th { font-weight: 800; text-align: left; }
    .green-head { background: #dce9d2; }
    .blue-head { background: #dbe7f5; }
    .green-photo-cell { background: #dce9d2; font-weight: 800; }
    .small-col { width: 132px; }
    .pn-col { width: 22%; }
    .caption-col { width: 22%; }
    .amount-col { width: 15%; }
    .result-head-col { width: 18%; text-align: center; }
    .photo-label-col { width: 18%; }
    .ta-center { text-align: center; }
    .spec-cell { min-height: 72px; }
    .photo-page-table td { height: 210mm; }
    .photo-strip {
      display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; align-items: start;
    }
    .photo-strip-large { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .photo-strip-item {
      border: 1px solid #555; min-height: 110px; display: flex; align-items: center; justify-content: center; padding: 4px;
      background: #fff;
    }
    .photo-strip-img { width: 100%; height: 168px; object-fit: contain; }
    .device-photo-img { width: 100%; height: 180px; object-fit: contain; }
    .img-fit { width: 100%; height: 100%; object-fit: contain; }
    .meta-version-line {
      margin-bottom: 4mm;
      font-size: 12px;
      color: #4b5563;
    }
    .tc-link { color: #4f79d9; font-style: italic; }
    .metric-grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 6px;
    }
    .metric-pill {
      border: 1px solid #cfd8e3;
      padding: 6px 8px;
      background: #f8fbff;
      min-height: 44px;
    }
    .metric-pill span { display: block; font-size: 11px; color: #6b7280; margin-bottom: 2px; }
    .metric-pill b { font-size: 12px; }
    .result-text {
      font-weight: 900;
      font-size: 16px;
      text-align: center;
    }
    .result-pass { color: #10b981; }
    .result-fail { color: #ef4444; }
    .result-na { color: #6b7280; }
    .result-un { color: #9ca3af; }
  </style>
</head>
<body>
  ${pages.join('')}
</body>
</html>`
}

function fileNameBase (name) {
  return String(name || '').trim().toLowerCase()
}

function pickNamedFile (rows = [], targetName = '') {
  const want = fileNameBase(targetName)
  if (!want) return null
  const list = (rows || []).map(normalizeFileCenterRow).filter(Boolean)
  return list.find(r => fileNameBase(r.name) === want)
    || list.find(r => fileNameBase(r.name).endswith('/' + want))
    || list.find(r => fileNameBase(r.name).includes(want.replace(/\.[^.]+$/, '')))
    || null
}

async function findPdfPageAsset (targetName) {
  const kw = String(targetName || '').replace(/\.[^.]+$/, '')
  const q = new URLSearchParams()
  q.set('category', 'Image')
  q.set('limit', '100')
  q.set('page', '1')
  if (kw) q.set('keyword', kw)

  const candidates = [
    `${apiBase}/files?${q.toString()}`,
    `${apiBase}/files?category=Image`,
    `${apiBase}/files`,
  ]

  let lastErr = null
  for (const url of candidates) {
    try {
      const res = await fetch(url, { headers: authHeaders() })
      if (handleAuth(res)) return null
      const j = await res.json().catch(() => ({}))
      if (!res.ok) {
        lastErr = new Error(j?.message || 'Failed to load files')
        continue
      }
      const rows = extractFileRows(j)
      const hit = pickNamedFile(rows, targetName)
      if (hit?.url) return hit
    } catch (e) {
      lastErr = e
    }
  }
  if (lastErr) console.warn(`[PDF] asset not found: ${targetName}`, lastErr)
  return null
}

async function resolvePdfPageAssets () {
  const [head, tail] = await Promise.all([
    findPdfPageAsset('PageHead.jpg'),
    findPdfPageAsset('PageTail.jpg'),
  ])
  return {
    pageHead: head?.url || '',
    pageTail: tail?.url || '',
  }
}

async function exportPdf () {
  try {
    const id = Number(route.params.id || 0)
    if (!id) throw new Error('Bad product id')

    const payload = {
      productId: id,
      draft: deepClone(draft),
      kind: String(kind.value || 'generic').trim() || 'generic',
    }

    const res = await fetch(`${apiBase}/report/part-test/${id}/pdf`, {
      method: 'POST',
      headers: {
        ...authHeaders(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })

    if (handleAuth(res)) throw new Error('Session expired')

    if (!res.ok) {
      const txt = await res.text().catch(() => '')
      let msg = txt || '匯出 PDF 失敗'
      try {
        const j = JSON.parse(txt)
        msg = j?.message || msg
      } catch {}
      throw new Error(msg)
    }

    const blob = await res.blob()
    const cd = res.headers.get('content-disposition') || ''
    const m1 = cd.match(/filename\*=UTF-8''([^;]+)/i)
    const m2 = cd.match(/filename="?([^";]+)"?/i)
    const fileName = m1
      ? decodeURIComponent(m1[1])
      : (m2 ? m2[1] : `PartTest_${id}.pdf`)

    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = fileName
    document.body.appendChild(a)
    a.click()
    a.remove()
    window.URL.revokeObjectURL(url)

    ElMessage.success('PDF 匯出成功')
  } catch (e) {
    console.error(e)
    ElMessage.error(e?.message || '匯出 PDF 失敗')
  }
}

function applyJson () {
  try {
    const obj = JSON.parse(jsonDlg.text || '')
    if (!obj || typeof obj !== 'object') throw new Error('JSON must be object')

    muteDirty.value = true
    Object.keys(draft).forEach(k => delete draft[k])
    Object.assign(draft, obj)
    normalizeDraft()
    dirty.value = true
    nextTick(() => { muteDirty.value = false })

    jsonDlg.open = false
    ElMessage.success('已套用 JSON')
  } catch (e) {
    ElMessage.error(e?.message || 'JSON 解析失敗')
  }
}

/* ---------------- kind switching ---------------- */
function onKindChanged (v) {
  const k = String(v || '').trim()
  if (!k) return
  ensureKnownKind(k)
  router.replace({ query: { ...route.query, kind: k, page: 'config' } }).catch(() => {})
  loadDraft()
}
function tryLoadTemplateByKind () {
  const k = String(kind.value || '').trim() || 'generic'
  ensureKnownKind(k)
  const tpl = templateByKind(k)

  muteDirty.value = true
  Object.keys(draft).forEach(x => delete draft[x])
  Object.assign(draft, deepClone(tpl))
  normalizeDraft()
  dirty.value = true
  nextTick(() => { muteDirty.value = false })

  ElMessage.success(`已載入模板：${k}`)
}

/* ---------------- load product ---------------- */
async function loadProduct () {
  const id = Number(route.params.id || 0)
  if (!id) return
  const res = await fetch(`${apiBase}/products/${id}?includeDeleted=false`, { headers: authHeaders() })
  if (handleAuth(res)) return
  const j = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(j?.message || 'Failed to load product')
  product.value = j?.data || null
}


function slugifyImportedSectionKey (v) {
  return String(v || '')
    .trim()
    .replace(/\s+/g, '_')
    .replace(/[^A-Za-z0-9_]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toUpperCase()
}

function normalizeImportedExtra (extra) {
  if (!extra) return {}
  if (typeof extra === 'string') {
    try {
      const parsed = JSON.parse(extra)
      return parsed && typeof parsed === 'object' ? parsed : {}
    } catch {
      return {}
    }
  }
  return typeof extra === 'object' ? extra : {}
}

async function fetchProductTestCases () {
  const id = Number(route.params.id || 0)
  if (!id) return []

  const res = await fetch(`${apiBase}/testcases/product/${id}`, {
    headers: authHeaders(),
  })
  if (handleAuth(res)) return []

  const j = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(j?.message || 'Failed to load test cases')

  if (Array.isArray(j?.data)) return j.data
  if (Array.isArray(j?.rows)) return j.rows
  if (Array.isArray(j)) return j
  return []
}

function buildSectionsFromImportedCases (rows = []) {
  const groups = new Map()
  const usedKeys = new Set()

  const sortedRows = [...rows].sort((a, b) => {
    const ao = toNum(a?.orderNo, 0)
    const bo = toNum(b?.orderNo, 0)
    if (ao !== bo) return ao - bo
    return String(a?.code || '').localeCompare(String(b?.code || ''))
  })

  for (const row of sortedRows) {
    const extra = normalizeImportedExtra(row?.extra)

    const sectionTitle = String(
      row?.section ||
      extra?.sectionTitle ||
      row?.category ||
      'Imported Section'
    ).trim() || 'Imported Section'

    const sectionNo = String(extra?.sectionNo || '').trim()
    const sectionIntro = String(extra?.sectionIntro || extra?.intro || '').trim()
    let sectionKey = slugifyImportedSectionKey(
      extra?.sectionKey ||
      row?.section ||
      row?.category ||
      'IMPORTED'
    )

    if (!sectionKey) sectionKey = `SEC_${Math.random().toString(16).slice(2, 8).toUpperCase()}`
    if (usedKeys.has(sectionKey) && !groups.has(sectionKey)) {
      let idx = 2
      let nextKey = `${sectionKey}_${idx}`
      while (usedKeys.has(nextKey)) {
        idx += 1
        nextKey = `${sectionKey}_${idx}`
      }
      sectionKey = nextKey
    }
    usedKeys.add(sectionKey)

    if (!groups.has(sectionKey)) {
      groups.set(sectionKey, {
        key: sectionKey,
        no: sectionNo || '',
        title: sectionTitle,
        intro: sectionIntro,
        testCases: [],
      })
    }

    const sec = groups.get(sectionKey)

    sec.testCases.push({
      code: String(row?.code || '').trim() || `TC_${Math.random().toString(16).slice(2, 8).toUpperCase()}`,
      title: String(row?.testCase || '').trim() || 'Imported Test Case',
      estHrs: toNum(
        row?.estHours ??
        row?.estHrs ??
        row?.workHrs ??
        0,
        0
      ),
      procedure: String(row?.testProcedure || ''),
      criteria: String(row?.testCriteria || ''),
      photos: Array.isArray(extra?.photos) ? deepClone(extra.photos) : [],
      note: String(extra?.note || row?.remark || ''),
      records: [{
        remark: String(row?.remark || ''),
        result:
          String(row?.result || '').toUpperCase() === 'PASS' ? 'PASS'
          : String(row?.result || '').toUpperCase() === 'FAIL' ? 'FAIL'
          : String(row?.result || '').toUpperCase() === 'NA' ? 'NA'
          : 'UNTESTED',
        hours: toNum(row?.workHrs, toNum(row?.estHours ?? row?.estHrs, 0.5) || 0.5),
      }],
    })
  }

  const sections = Array.from(groups.values())
  sections.sort((a, b) => {
    const na = String(a.no || '')
    const nb = String(b.no || '')
    if (na && nb) return na.localeCompare(nb, undefined, { numeric: true })
    if (na) return -1
    if (nb) return 1
    return String(a.title || '').localeCompare(String(b.title || ''))
  })

  return sections
}

async function applyImportedCasesToDraft () {
  const rows = await fetchProductTestCases()
  const sections = buildSectionsFromImportedCases(rows)

  muteDirty.value = true

  if (!draft.cover || typeof draft.cover !== 'object') draft.cover = {}
  if (!draft.summary || typeof draft.summary !== 'object') draft.summary = blankSummary()
  if (!draft.dut || typeof draft.dut !== 'object') draft.dut = { modelName: '', spec: '', amount: 1 }
  if (!draft.configSheet || typeof draft.configSheet !== 'object') {
    draft.configSheet = {
      cpuBoards: [blankConfigRow()],
      systems: [blankConfigRow()],
      accessories: [blankConfigRow()],
      appearance: {
        topCaption: 'TOP SIDE',
        topPhotos: [],
        bottomCaption: 'BOT SIDE',
        bottomPhotos: [],
      },
    }
  }

  draft.sections = sections
  draft.enabled = {}

  sections.forEach((sec) => {
    draft.enabled[sec.key] = true
  })

  normalizeDraft()
  persistDraftSilently()
  dirty.value = true
  openSections.value = sections.map(sec => sec.key)

  await nextTick()
  muteDirty.value = false

  if (sections.length) {
    activeTab.value = sections[0].key
    goTab(sections[0].key)
  } else {
    activeTab.value = 'dashboard'
    goTab('dashboard')
  }
}

async function handleImportedSet () {
  loading.value = true
  try {
    await loadProduct()
    await applyImportedCasesToDraft()
    ElMessage.success('已匯入並同步到 Part Test 草稿')
  } catch (e) {
    console.error(e)
    ElMessage.error(e?.message || '匯入後同步失敗')
  } finally {
    loading.value = false
  }
}

/* ---------------- reload ---------------- */

async function reload () {
  loading.value = true
  try {
    await fetchRemoteTemplatesIfAny()
    await loadProduct()

    kind.value = String(route.query.kind || kind.value || 'generic').trim() || 'generic'
    ensureKnownKind(kind.value)

    const ok = loadDraft()
    if (!ok) {
      const tpl = templateByKind(kind.value)
      muteDirty.value = true
      Object.keys(draft).forEach(k => delete draft[k])
      Object.assign(draft, deepClone(tpl))
      normalizeDraft()
      dirty.value = false
      nextTick(() => { muteDirty.value = false })
    }

    const allow = new Set(['dashboard', 'cover', 'summary', 'contents', 'config'])
    enabledSectionList.value.forEach(s => allow.add(s.key))
    const page = String(route.query.page || activeTab.value || 'dashboard')
    activeTab.value = allow.has(page) ? page : 'dashboard'

    const tc = String(route.query.tc || '')
    if (tc && enabledSectionList.value.some(s => s.key === activeTab.value)) {
      nextTick(() => {
        const el = document.getElementById(tcAnchor(tc))
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
      })
    }
  } catch (e) {
    console.error(e)
    ElMessage.error(e?.message || 'Reload failed')
  } finally {
    loading.value = false
  }
}

/* =========================================================
 * ✅ Section Editor Drawer
 * ======================================================= */
const secEditDlg = reactive({ open: false, key: '', openTcs: [] })

const secEditSec = computed(() => {
  const k = String(secEditDlg.key || '').trim()
  if (!k) return null
  return (allSectionList.value || []).find(s => String(s?.key || '').trim() === k) || null
})

const secEditTitle = computed(() => {
  const s = secEditSec.value
  if (!s) return '編輯章節'
  const no = String(s.no || '').trim()
  const title = String(s.title || '').trim() || String(s.key || '').trim()
  return `編輯章節：${(no ? no + ' ' : '')}${title}`
})

const secEditStats = computed(() => {
  const list = Array.isArray(secEditSec.value?.testCases) ? secEditSec.value.testCases : []
  return {
    count: list.length,
    hrs: list.reduce((sum, tc) => sum + toNum(tc?.estHrs, 0), 0),
  }
})

function jumpToTc (secKey, tcCode = '') {
  const sk = String(secKey || '').trim()
  if (!sk) return
  goTab(sk, String(tcCode || '').trim())
}

function openSectionEditor (secKey, opts = {}) {
  const sk = String(secKey || '').trim()
  if (!sk) return

  secEditDlg.key = sk

  if (opts?.autoAdd) {
    const sec = (allSectionList.value || []).find(s => String(s?.key || '').trim() === sk)
    if (sec) {
      const tc = addTestCase(sec)
      secEditDlg.openTcs = tc?.code ? [tc.code] : []
      nextTick(() => jumpToTc(sk, tc?.code))
    }
  } else {
    secEditDlg.openTcs = []
  }

  secEditDlg.open = true
}

function quickAddTestCase (sec) {
  const s = sec && typeof sec === 'object'
    ? sec
    : (allSectionList.value || []).find(x => String(x?.key || '').trim() === String(sec || '').trim())
  if (!s) return

  const tc = addTestCase(s)
  ElMessage.success('已新增測項')

  if (secEditDlg.open && String(secEditDlg.key || '').trim() === String(s.key || '').trim()) {
    const code = String(tc?.code || '').trim()
    if (code) secEditDlg.openTcs = Array.from(new Set([...(secEditDlg.openTcs || []), code]))
  }

  nextTick(() => jumpToTc(s.key, tc?.code))
}

function duplicateTc (secOrKey, tc, idx = -1) {
  const sec = resolveSection(secOrKey)
  if (!sec) return

  if (!Array.isArray(sec.testCases)) sec.testCases = []

  let src = tc
  let srcIndex = idx

  if (!src && srcIndex >= 0) src = sec.testCases[srcIndex]
  if (!src && tc) {
    src = sec.testCases.find(x => x === tc || String(x?.code || '') === String(tc))
  }
  if (!src) return

  if (srcIndex < 0) {
    srcIndex = sec.testCases.findIndex(x => x === src)
  }

  const baseCode = String(src.code || '').trim() || nextTcCode(sec)
  let newCode = `${baseCode}_COPY`
  let i = 2
  const used = new Set(sec.testCases.map(x => String(x?.code || '').trim()).filter(Boolean))
  while (used.has(newCode)) {
    newCode = `${baseCode}_COPY${i}`
    i += 1
  }

const cloned = deepClone(src)
cloned.code = newCode
cloned.title = String(cloned.title || '') || 'Copied Test Case'
cloned.photos = []
cloned.note = ''
cloned.records = [{ remark: '', result: 'UNTESTED', hours: toNum(cloned.estHrs, 0.5) || 0.5 }]

  if (!Array.isArray(cloned.photos)) cloned.photos = []
  if (!Array.isArray(cloned.records) || !cloned.records.length) {
    cloned.records = [{ remark: '', result: 'UNTESTED', hours: toNum(cloned.estHrs, 0.5) || 0.5 }]
  }

  const insertAt = srcIndex >= 0 ? srcIndex + 1 : sec.testCases.length
  sec.testCases.splice(insertAt, 0, cloned)

  ElMessage.success('已複製測項')
  nextTick(() => jumpToTc(sec.key, cloned.code))
}

/* =========================================================
 * ✅ x86 style TC helpers (Result/hrs + Proc/Cri edit + Photos + Remark)
 * ======================================================= */
const MAX_PHOTOS_PER_TC = 12
const MAX_CONFIG_PHOTOS = 6

function getToken () {
  return localStorage.getItem('token') || sessionStorage.getItem('token') || ''
}

function apiOriginFromBase () {
  const s = String(apiBase || '').trim()
  if (!/^https?:\/\//i.test(s)) return ''
  return s.replace(/\/+$/, '').replace(/\/api$/i, '')
}
function absUrl (u) {
  const s = String(u || '').trim()
  if (!s) return ''
  if (/^https?:\/\//i.test(s)) return s
  const origin = apiOriginFromBase()
  if (!origin) return s
  return origin.replace(/\/+$/, '') + (s.startsWith('/') ? s : '/' + s)
}
function tcPhotoUrls (tc) {
  return (tc?.photos || [])
    .map(p => previewSrc(p) || absUrl(p?.url || ''))
    .filter(Boolean)
}

function mainRec (tc) {
  if (!tc.records) tc.records = []
  if (!tc.records.length) tc.records.push({ remark: '', result: 'UNTESTED', hours: 0.5 })
  const r = tc.records[0]
  r.remark = String(r.remark || '')
  r.result = String(r.result || 'UNTESTED')
  r.hours = toNum(r.hours, 0.5)
  return r
}
function tcStatus (tc) {
  const r = String(mainRec(tc).result || '').toUpperCase()
  if (r === 'PASS') return { label: 'PASS', type: 'success' }
  if (r === 'FAIL') return { label: 'FAIL', type: 'danger' }
  if (r === 'NA') return { label: 'N/A', type: 'info' }
  return { label: 'PENDING', type: 'warning' }
}



async function uploadTcImage (opt, tc) {
  try {
    if (!tc.photos) tc.photos = []
    if (tc.photos.length >= MAX_PHOTOS_PER_TC) throw new Error(`最多 ${MAX_PHOTOS_PER_TC} 張`)

    const token = getToken()
    if (!token) throw new Error('No token')

    const fd = new FormData()
    fd.append('file', opt.file)
    fd.append('category', 'Image')

    const res = await fetch(`${apiBase}/files/upload-one`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: fd,
    })
    if (handleAuth(res)) throw new Error('Session expired')

    const j = await res.json().catch(() => ({}))
    if (!res.ok || !j?.success) throw new Error(j?.message || 'Upload failed')

    const d = j?.data || {}
    const url = d.previewUrl || d.url || d.downloadUrl || ''
    tc.photos.push({
      id: d.id,
      name: d.displayName || d.originalName || opt.file?.name || 'image',
      url,
    })

    opt.onSuccess?.(j)
  } catch (e) {
    opt.onError?.(e)
    ElMessage.error(e?.message || 'Upload failed')
  }
}

async function removeTcPhoto (tc, idx) {
  const p = (tc?.photos || [])[idx]
  if (!p) return
  tc.photos.splice(idx, 1)

  const id = p?.id
  if (!id) return

  try {
    const res = await fetch(`${apiBase}/files/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: authHeaders(),
    })
    if (handleAuth(res)) return
  } catch {}
}


function normalizeFileRef (raw) {
  if (!raw || typeof raw !== 'object') return null
  const id = raw.id ?? raw.fileId ?? raw._id ?? raw.uuid ?? null
  const name = String(raw.name || raw.displayName || raw.originalName || raw.filename || '').trim()
  const url = String(raw.url || raw.previewUrl || raw.downloadUrl || raw.thumbnailUrl || '').trim()
  if (!id && !url && !name) return null
  return { id, name, url }
}

function coverSigner (target) {
  return target === 'approved' ? draft.cover?.approvedBySign : draft.cover?.preparedBySign
}

const filePickerDlg = reactive({
  open: false,
  target: 'prepared',
  keyword: '',
  loading: false,
  rows: [],
})

const { getImageSrc, clearCache } = useProtectedImagePreview({ apiBase })
const protectedPreviewMap = reactive({})

function previewKey (raw) {
  if (!raw || typeof raw !== 'object') return ''
  const id = raw.id ?? raw.fileId ?? raw._id ?? raw.uuid ?? ''
  const url = raw.url || raw.previewUrl || raw.downloadUrl || raw.thumbnailUrl || raw.path || ''
  const name = raw.name || raw.displayName || raw.originalName || raw.filename || raw.storedName || ''
  return String(id || url || name || '')
}

function previewSrc (raw) {
  const key = previewKey(raw)
  return key ? (protectedPreviewMap[key] || '') : ''
}

async function refreshProtectedPreviews () {
  const items = [
    draft.cover?.preparedBySign,
    draft.cover?.approvedBySign,
    ...(draft.configSheet?.appearance?.topPhotos || []),
    ...(draft.configSheet?.appearance?.bottomPhotos || []),
    ...((draft.testCases || []).flatMap(tc => tc?.photos || [])),
    ...(filePickerDlg.rows || []),
  ].filter(Boolean)

  const nextKeys = new Set(items.map(previewKey).filter(Boolean))

  await Promise.allSettled(
    items.map(async (item) => {
      const key = previewKey(item)
      if (!key) return
      protectedPreviewMap[key] = await getImageSrc(item)
    })
  )

  for (const key of Object.keys(protectedPreviewMap)) {
    if (!nextKeys.has(key)) delete protectedPreviewMap[key]
  }
}

const previewWatchToken = computed(() =>
  JSON.stringify({
    prepared: previewKey(draft.cover?.preparedBySign),
    approved: previewKey(draft.cover?.approvedBySign),
    topPhotos: (draft.configSheet?.appearance?.topPhotos || []).map(previewKey),
    bottomPhotos: (draft.configSheet?.appearance?.bottomPhotos || []).map(previewKey),
    tcPhotos: (draft.testCases || []).map(tc => (tc?.photos || []).map(previewKey)),
    pickerRows: (filePickerDlg.rows || []).map(previewKey),
  })
)

watch(previewWatchToken, () => {
  refreshProtectedPreviews()
}, { immediate: true })

function normalizeFileCenterRow (raw) {
  if (!raw || typeof raw !== 'object') return null
  const id = raw.id ?? raw.fileId ?? raw._id ?? raw.uuid ?? null
  const name = String(raw.displayName || raw.originalName || raw.name || raw.filename || raw.storedName || '').trim()
  const url = String(raw.previewUrl || raw.thumbnailUrl || raw.url || raw.downloadUrl || raw.path || '').trim()
  const category = String(raw.category || raw.type || 'Image').trim()
  if (!id && !url && !name) return null
  return { id, name: name || `image-${id || Math.random().toString(16).slice(2, 8)}`, url, category }
}

function extractFileRows (payload) {
  if (Array.isArray(payload)) return payload
  if (!payload || typeof payload !== 'object') return []
  if (Array.isArray(payload.rows)) return payload.rows
  if (Array.isArray(payload.items)) return payload.items
  if (Array.isArray(payload.files)) return payload.files
  if (Array.isArray(payload.data)) return payload.data
  if (Array.isArray(payload.data?.rows)) return payload.data.rows
  if (Array.isArray(payload.data?.items)) return payload.data.items
  if (Array.isArray(payload.data?.files)) return payload.data.files
  return []
}

async function fetchFileCenterImages () {
  filePickerDlg.loading = true
  try {
    const kw = String(filePickerDlg.keyword || '').trim()
    const q = new URLSearchParams()
    q.set('category', 'Image')
    q.set('limit', '60')
    q.set('page', '1')
    if (kw) q.set('keyword', kw)

    const candidates = [
      `${apiBase}/files?${q.toString()}`,
      `${apiBase}/files?category=Image${kw ? `&keyword=${encodeURIComponent(kw)}` : ''}`,
      `${apiBase}/files`,
    ]

    let lastErr = null

    for (const url of candidates) {
      try {
        const res = await fetch(url, { headers: authHeaders() })
        if (handleAuth(res)) return

        const j = await res.json().catch(() => ({}))
        if (!res.ok) {
          lastErr = new Error(j?.message || 'Failed to load files')
          continue
        }

        const rows = extractFileRows(j)
          .map(normalizeFileCenterRow)
          .filter(Boolean)
          .filter(row => !kw || row.name.toLowerCase().includes(kw.toLowerCase()))
          .filter(row => String(row.category || '').toLowerCase().includes('image') || /\.(png|jpe?g|webp|gif|bmp|svg)$/i.test(String(row.name || '')))

        filePickerDlg.rows = rows
        return
      } catch (e) {
        lastErr = e
      }
    }

    throw lastErr || new Error('無法取得檔案中心圖片')
  } catch (e) {
    filePickerDlg.rows = []
    ElMessage.error(e?.message || '無法取得檔案中心圖片')
  } finally {
    filePickerDlg.loading = false
  }
}

function openCoverSignerPicker (target) {
  filePickerDlg.target = target === 'approved' ? 'approved' : 'prepared'
  filePickerDlg.keyword = ''
  filePickerDlg.open = true
  fetchFileCenterImages()
}

function chooseCoverSigner (row) {
  const picked = normalizeFileRef(row)
  if (!picked) return
  if (filePickerDlg.target === 'approved') draft.cover.approvedBySign = picked
  else draft.cover.preparedBySign = picked
  filePickerDlg.open = false
  ElMessage.success('已帶入簽名圖片')
}

function clearCoverSigner (target) {
  if (target === 'approved') draft.cover.approvedBySign = null
  else draft.cover.preparedBySign = null
}

onBeforeRouteLeave((to, from, next) => {
  if (dirty.value) persistDraftSilently()
  next()
})

onBeforeUnmount(() => {
  clearCache()
  clearTimeout(autoSaveTimer)
  if (dirty.value) persistDraftSilently()
})

onMounted(() => {
  reload()
})
</script>

<style scoped>
.page {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.header-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border: 1px solid var(--el-border-color);
  border-radius: 12px;
  background: linear-gradient(180deg, rgba(240, 247, 255, 0.8), rgba(255, 255, 255, 0.8));
  backdrop-filter: blur(4px);
}

.header-bar .left {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}
.header-bar .right {
  display: flex;
  gap: 10px;
  align-items: center;
  flex-wrap: wrap;
}

.title { margin: 0; }

.tabs-card { border-radius: 14px; }

.pane { padding: 12px 10px 6px; }

.pane-title {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  align-items: center;
  margin-bottom: 10px;
}

.pane-title-right {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.kpis {
  display: grid;
  grid-template-columns: repeat(4, minmax(160px, 1fr));
  gap: 12px;
  margin-bottom: 14px;
}
.kpis-compact { grid-template-columns: repeat(2, minmax(160px, 1fr)); }

.kpi {
  border: 1px solid var(--el-border-color);
  border-radius: 12px;
  padding: 10px 12px;
  background: var(--el-bg-color);
}
.kpi-label {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  margin-bottom: 6px;
}
.kpi-val {
  font-size: 20px;
  font-weight: 900;
  font-variant-numeric: tabular-nums;
}

.block-title { font-weight: 900; margin: 10px 0; }

.grid2 { display: grid; grid-template-columns: 1fr 240px; gap: 12px; }
.grid2eq { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.grid3 { display: grid; grid-template-columns: 220px 140px 1fr; gap: 12px; }
.field.wide { grid-column: 1 / -1; }
.label {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  margin-bottom: 6px;
}

.hint {
  color: var(--el-text-color-secondary);
  font-size: 13px;
  margin-top: 6px;
  white-space: pre-wrap;
  line-height: 1.5;
}

.contents { display: flex; flex-direction: column; gap: 14px; }
.contents-block { border: 1px solid var(--el-border-color); border-radius: 12px; padding: 12px; }
.contents-hd { font-weight: 900; margin-bottom: 10px; }
.contents-list, .contents-sublist { display: flex; flex-direction: column; gap: 6px; }
.contents-sec { margin-top: 10px; padding-top: 10px; border-top: 1px dashed var(--el-border-color); }
.contents-item { padding: 6px 10px; border-radius: 10px; cursor: pointer; }
.contents-item:hover { background: var(--el-fill-color-light); }
.contents-item.sec { font-weight: 800; }
.contents-item.sub { padding-left: 24px; color: var(--el-text-color-regular); }

.cfg { display: flex; flex-direction: column; gap: 14px; }
.cfg-row { display: grid; grid-template-columns: 160px 1fr; gap: 12px; align-items: start; }
.cfg-label { font-weight: 800; color: var(--el-text-color-secondary); }
.cfg-controls { display: flex; flex-direction: column; gap: 10px; }

.row-actions { display: flex; justify-content: flex-end; gap: 10px; flex-wrap: wrap; }

.collapse-title { display: flex; align-items: center; gap: 10px; }
.ct-no { width: 56px; font-variant-numeric: tabular-nums; }
.ct-title { font-weight: 900; }
.ct-key { font-weight: 600; }
.muted { color: var(--el-text-color-secondary); }

.sec-edit { padding: 6px 2px 10px; }

.tc-mini-card { border-radius: 12px; margin-top: 10px; }
.mini-hd { font-weight: 900; margin-bottom: 8px; }

.cases { display: flex; flex-direction: column; gap: 10px; }
.tc-card { border-radius: 14px; }
.pre { white-space: pre-wrap; line-height: 1.5; }

.bottom-gap { height: 40px; }

/* ================== x86-like TC card ================== */
.x86-card { padding: 6px 2px 10px; }

.x86-head {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: flex-start;
  margin-bottom: 10px;
}

.x86-head-left {
  display: grid;
  grid-template-columns: 70px 140px 1fr;
  gap: 10px;
  align-items: center;
  min-width: 520px;
}

.x86-k { font-size: 12px; color: var(--el-text-color-secondary); }
.x86-code { font-weight: 900; font-variant-numeric: tabular-nums; }
.x86-title :deep(.el-input__wrapper) { width: 100%; }

.x86-head-right {
  display: flex;
  gap: 10px;
  align-items: center;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.x86-ctrls {
  display: flex;
  gap: 10px;
  align-items: center;
  flex-wrap: wrap;
}

.x86-ctrl {
  display: flex;
  gap: 8px;
  align-items: center;
}
.x86-ctrl-l { font-size: 12px; color: var(--el-text-color-secondary); }

.x86-row { margin: 6px 0 12px; }
.x86-row-title {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  margin-bottom: 6px;
}

.x86-sec { margin-top: 12px; }
.x86-sec-hd {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  margin-bottom: 6px;
}
.x86-sec-title { font-weight: 800; }
.x86-sec-act { display: flex; gap: 6px; align-items: center; }

.x86-box {
  border: 1px solid var(--el-border-color);
  border-radius: 12px;
  padding: 10px 12px;
  background: var(--el-bg-color);
}

.photo-panel {
  border: 1px solid var(--el-border-color);
  border-radius: 12px;
  padding: 10px 12px;
  background: var(--el-bg-color);
}

.photo-hd{
  display:flex;
  align-items:center;
  justify-content: space-between;
  gap: 10px;
  flex-wrap: wrap;
  margin-bottom: 10px;
}
.photo-title { font-weight: 800; }

.photo-grid{
  display:grid;
  grid-template-columns: repeat(6, minmax(120px, 1fr));
  gap: 10px;
}
.photo-item{
  position: relative;
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid var(--el-border-color);
  height: 110px;
}
.photo-del{
  position:absolute;
  right: 6px;
  bottom: 6px;
}

@media (max-width: 1200px) {
  .kpis { grid-template-columns: repeat(2, minmax(160px, 1fr)); }
  .x86-head-left { grid-template-columns: 70px 140px 1fr; min-width: 0; }
  .photo-grid { grid-template-columns: repeat(4, minmax(110px, 1fr)); }
}
@media (max-width: 900px) {
  .kpis { grid-template-columns: 1fr; }
  .grid3 { grid-template-columns: 1fr; }
  .grid2 { grid-template-columns: 1fr; }
  .grid2eq { grid-template-columns: 1fr; }
  .x86-head { flex-direction: column; }
  .x86-head-left { grid-template-columns: 1fr; }
  .photo-grid { grid-template-columns: repeat(2, minmax(110px, 1fr)); }
}

.x86-title-text {
  width: 100%;
  min-height: 32px;
  display: flex;
  align-items: center;
  padding: 0 11px;
  border: 1px solid var(--el-border-color);
  border-radius: 8px;
  background: var(--el-fill-color-blank);
  color: var(--el-text-color-primary);
}


/* =========================
   Section Editor Dialog
========================= */
.sec-editor-shell {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.sec-editor-hero {
  display: flex;
  justify-content: space-between;
  align-items: stretch;
  gap: 14px;
  padding: 16px 18px;
  border: 1px solid var(--el-border-color-light);
  border-radius: 16px;
  background:
    linear-gradient(135deg, rgba(64, 158, 255, 0.10), rgba(255, 255, 255, 0.96));
}

.sec-editor-hero-main {
  min-width: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 6px;
}

.sec-editor-overline {
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.08em;
  color: var(--el-color-primary);
  text-transform: uppercase;
}

.sec-editor-heading {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 26px;
  font-weight: 900;
  color: var(--el-text-color-primary);
  line-height: 1.2;
  word-break: break-word;
}

.sec-editor-no {
  flex: 0 0 auto;
  padding: 4px 10px;
  border-radius: 999px;
  background: var(--el-color-primary-light-9);
  color: var(--el-color-primary);
  font-size: 15px;
  font-weight: 800;
}

.sec-editor-sub {
  color: var(--el-text-color-secondary);
  font-size: 13px;
  word-break: break-all;
}

.sec-editor-metas {
  display: grid;
  grid-template-columns: repeat(2, minmax(120px, 1fr));
  gap: 10px;
  min-width: 260px;
}

.meta-chip {
  border: 1px solid var(--el-border-color-light);
  background: rgba(255, 255, 255, 0.88);
  border-radius: 14px;
  padding: 12px 14px;
}

.meta-chip-label {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  margin-bottom: 6px;
}

.meta-chip-value {
  font-size: 24px;
  font-weight: 900;
  line-height: 1;
  font-variant-numeric: tabular-nums;
}

.sec-editor-card {
  border: 1px solid var(--el-border-color-light);
  border-radius: 16px;
  background: var(--el-bg-color);
  padding: 16px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.04);
}

.sec-editor-card-hd {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 14px;
}

.sec-editor-card-title {
  font-size: 16px;
  font-weight: 900;
  color: var(--el-text-color-primary);
}

.sec-editor-card-desc {
  margin-top: 4px;
  font-size: 13px;
  color: var(--el-text-color-secondary);
}

.sec-editor-card-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.sec-editor-form-grid {
  display: grid;
  grid-template-columns: 220px 140px 1fr;
  gap: 14px;
}

.field-span-2 {
  grid-column: span 2;
}

.field-span-3 {
  grid-column: 1 / -1;
}

.mini-help {
  margin-top: 6px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
  line-height: 1.5;
}

.sec-editor-table-wrap {
  border-radius: 14px;
  overflow: hidden;
}

.sec-editor-footer {
  display: flex;
  justify-content: flex-end;
}

/* =========================
   TC Editor Dialog
========================= */
.tc-editor-shell {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.tc-editor-banner {
  padding: 14px 16px;
  border-radius: 16px;
  border: 1px solid var(--el-border-color-light);
  background:
    linear-gradient(135deg, rgba(103, 194, 58, 0.08), rgba(255, 255, 255, 0.96));
}

.tc-editor-banner-title {
  font-size: 18px;
  font-weight: 900;
  color: var(--el-text-color-primary);
}

.tc-editor-banner-sub {
  margin-top: 4px;
  font-size: 13px;
  color: var(--el-text-color-secondary);
}

.tc-editor-grid {
  display: grid;
  grid-template-columns: 1fr 180px;
  gap: 14px;
}

.tc-editor-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

/* =========================
   Dialog 內部細節優化
========================= */
:deep(.sec-edit-dialog .el-dialog),
:deep(.tc-edit-dialog .el-dialog) {
  border-radius: 20px;
  overflow: hidden;
}

:deep(.sec-edit-dialog .el-dialog__header),
:deep(.tc-edit-dialog .el-dialog__header) {
  padding: 18px 22px 12px;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

:deep(.sec-edit-dialog .el-dialog__title),
:deep(.tc-edit-dialog .el-dialog__title) {
  font-size: 20px;
  font-weight: 900;
}

:deep(.sec-edit-dialog .el-dialog__body),
:deep(.tc-edit-dialog .el-dialog__body) {
  padding: 18px 22px;
  background: #fafcff;
}

:deep(.sec-edit-dialog .el-dialog__footer),
:deep(.tc-edit-dialog .el-dialog__footer) {
  padding: 12px 22px 18px;
  border-top: 1px solid var(--el-border-color-lighter);
  background: #fff;
}

:deep(.sec-edit-dialog .el-input__wrapper),
:deep(.tc-edit-dialog .el-input__wrapper),
:deep(.tc-edit-dialog .el-textarea__inner),
:deep(.sec-edit-dialog .el-textarea__inner) {
  border-radius: 12px;
}

:deep(.sec-edit-dialog .el-table th),
:deep(.sec-edit-dialog .el-table td) {
  padding-top: 10px;
  padding-bottom: 10px;
}

@media (max-width: 1100px) {
  .sec-editor-hero {
    flex-direction: column;
  }

  .sec-editor-metas {
    min-width: 0;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .sec-editor-form-grid {
    grid-template-columns: 1fr;
  }

  .field-span-2,
  .field-span-3 {
    grid-column: auto;
  }

  .tc-editor-grid {
    grid-template-columns: 1fr;
  }
}



.sign-card {
  margin-top: 10px;
  border: 1px solid var(--el-border-color-light);
  border-radius: 14px;
  padding: 12px;
  background: #fafcff;
}

.sign-preview {
  width: 100%;
  height: 120px;
  border-radius: 12px;
  border: 1px dashed var(--el-border-color);
  background: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.sign-preview img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}

.sign-preview--empty {
  color: var(--el-text-color-secondary);
  font-size: 13px;
}

.sign-meta-row {
  margin-top: 10px;
}

.sign-meta-title {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.sign-meta-name {
  margin-top: 4px;
  font-size: 13px;
  font-weight: 700;
  word-break: break-word;
}

.sign-actions {
  margin-top: 10px;
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.file-picker-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.file-picker-title {
  font-size: 18px;
  font-weight: 900;
}

.file-picker-subtitle {
  margin-top: 4px;
  font-size: 13px;
  color: var(--el-text-color-secondary);
}

.file-picker-toolbar {
  display: flex;
  gap: 10px;
  margin-bottom: 12px;
}

.file-picker-body {
  min-height: 280px;
}

.file-picker-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}

.file-card {
  border: 1px solid var(--el-border-color-light);
  border-radius: 16px;
  background: #fff;
  padding: 10px;
  text-align: left;
  cursor: pointer;
  transition: transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease;
}

.file-card:hover {
  transform: translateY(-2px);
  border-color: var(--el-color-primary-light-5);
  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.08);
}

.file-card__thumb {
  width: 100%;
  aspect-ratio: 4 / 3;
  border-radius: 12px;
  overflow: hidden;
  background: #f6f8fb;
  border: 1px solid var(--el-border-color-lighter);
  display: flex;
  align-items: center;
  justify-content: center;
}

.file-card__thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.file-card__thumb-empty {
  color: var(--el-text-color-secondary);
  font-size: 12px;
}

.file-card__meta {
  margin-top: 10px;
}

.file-card__name {
  font-size: 13px;
  font-weight: 700;
  line-height: 1.5;
  word-break: break-word;
}

.file-card__sub {
  margin-top: 4px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.file-picker-footer {
  display: flex;
  justify-content: flex-end;
}

.cfg-kind-inline {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 4px 10px;
  border: 1px solid var(--el-border-color);
  border-radius: 10px;
  background: var(--el-fill-color-light);
}
.cfg-kind-inline__label {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  white-space: nowrap;
}
.cfg-kind-inline__select {
  width: 140px;
}
.cfg-kind-inline__select :deep(.el-input__wrapper) {
  box-shadow: none !important;
  background: transparent;
}

.cfg-sheet-title { font-size: 14px; }
.cfg-table :deep(.el-input__wrapper),
.cfg-table :deep(.el-textarea__inner) { box-shadow: none; }
.cfg-photo-card {
  border: 1px solid var(--el-border-color);
  border-radius: 12px;
  padding: 12px;
  background: var(--el-bg-color);
}
.cfg-photo-grid { grid-template-columns: repeat(3, minmax(110px, 1fr)); }
.cfg-empty-text {
  color: var(--el-text-color-secondary);
  font-size: 13px;
  padding: 10px 0 2px;
}

@media (max-width: 1100px) {
  .file-picker-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 900px) {
  .file-picker-toolbar {
    flex-direction: column;
  }
  .cfg-photo-grid {
    grid-template-columns: repeat(2, minmax(110px, 1fr));
  }
}

@media (max-width: 700px) {
  .file-picker-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

</style>