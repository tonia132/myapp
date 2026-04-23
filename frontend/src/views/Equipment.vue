<template>
  <div class="page equipment-page-vivid">
    <section class="hero-card">
      <div class="hero-main">
        <div class="hero-left">
          <div class="hero-icon-wrap">
            <div class="hero-icon">🧰</div>
          </div>

          <div class="hero-copy">
            <div class="hero-eyebrow">{{ text('equipment.eyebrow', 'Asset & Loan Center') }}</div>
            <h2 class="hero-title">{{ text('equipment.title', '儀器設備') }}</h2>
            <div class="hero-subtitle">
              {{ text('equipment.subtitle', '管理設備庫存、借用流程與校正資訊，桌機與手機都能快速查看') }}
            </div>
          </div>
        </div>

        <div class="hero-actions">
          <el-input
            v-model="keyword"
            :placeholder="text('equipment.searchPlaceholder', '搜尋設備名稱 / 資產編號 / 保管人')"
            clearable
            class="ctrl w-search"
            @keyup.enter="handleSearch"
            @clear="handleSearch"
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>

          <el-button class="btn" type="primary" :icon="Plus" @click="openEditDialog()">
            {{ text('equipment.btnNew', '新增設備') }}
          </el-button>

          <el-button class="btn" plain :icon="Refresh" @click="fetchList" :loading="loading">
            {{ text('common.refresh', '重新整理') }}
          </el-button>

          <div class="hero-now">
            <div class="hero-now-label">{{ text('equipment.currentTime', '目前時間') }}</div>
            <div class="hero-now-value">{{ nowText }}</div>
          </div>
        </div>
      </div>

      <div class="stats-grid">
        <div class="stat-card stat-primary">
          <div class="stat-label">{{ text('equipment.stats.totalItems', '設備筆數') }}</div>
          <div class="stat-value">{{ total }}</div>
        </div>

        <div class="stat-card">
          <div class="stat-label">{{ text('equipment.stats.totalQty', '總庫存') }}</div>
          <div class="stat-value">{{ stockTotalQty }}</div>
        </div>

        <div class="stat-card">
          <div class="stat-label">{{ text('equipment.stats.availableQty', '可借數量') }}</div>
          <div class="stat-value">{{ stockAvailableQty }}</div>
        </div>

        <div class="stat-card">
          <div class="stat-label">{{ text('equipment.stats.activeLoans', '我的借用中') }}</div>
          <div class="stat-value">{{ activeLoanCount }}</div>
        </div>
      </div>
    </section>

    <el-card class="block-card stock-card" shadow="never">
      <template #header>
        <div class="section-head">
          <div>
            <div class="section-title">{{ text('equipment.stock.title', '設備清單') }}</div>
            <div class="section-subtitle">
              {{ text('equipment.stock.sectionSubtitle', '查看設備圖像、庫存、校正日期與借用操作') }}
            </div>
          </div>

          <el-tag class="pill" type="info" effect="plain">
            {{ text('equipment.stock.totalTag', '共 {total} 筆，第 {page} / 每頁 {pageSize}', { total, page, pageSize }) }}
          </el-tag>
        </div>
      </template>

      <el-table
        v-if="!isMobile"
        v-loading="loading"
        :data="rows"
        border
        stripe
        class="tbl"
        style="width: 100%"
      >
        <el-table-column :label="text('equipment.stock.colImage', '圖片')" width="96" align="center">
          <template #default="{ row }">
            <el-image
              v-if="resolveImg(row.imageUrl)"
              :src="resolveImg(row.imageUrl)"
              fit="cover"
              class="thumb"
              :preview-src-list="[resolveImg(row.imageUrl)]"
              preview-teleported
            />
            <div v-else class="img-placeholder">—</div>
          </template>
        </el-table-column>

        <el-table-column prop="name" :label="text('equipment.stock.colName', '名稱')" min-width="220" />
        <el-table-column prop="assetCode" :label="text('equipment.stock.colAssetCode', '資產編號')" min-width="160" />
        <el-table-column prop="location" :label="text('equipment.stock.colLocation', '位置')" min-width="140" />
        <el-table-column prop="keeper" :label="text('equipment.stock.colKeeper', '保管人')" min-width="140" />

        <el-table-column :label="text('equipment.stock.colTotalQty', '總數')" width="96" align="center">
          <template #default="{ row }">
            <el-tag type="info" effect="plain" class="pill mini">{{ row.totalQty ?? 0 }}</el-tag>
          </template>
        </el-table-column>

        <el-table-column :label="text('equipment.stock.colAvailableQty', '可借數')" width="110" align="center">
          <template #default="{ row }">
            <el-tag
              :type="(row.availableQty ?? 0) > 0 ? 'success' : 'danger'"
              effect="plain"
              class="pill mini"
            >
              {{ row.availableQty ?? 0 }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column :label="text('equipment.stock.colCalibration', '校正日期')" min-width="170">
          <template #default="{ row }">{{ fmt(row.calibrationDate) }}</template>
        </el-table-column>

        <el-table-column :label="text('equipment.stock.colRemark', '備註')" min-width="220" show-overflow-tooltip>
          <template #default="{ row }">{{ row.remark || "—" }}</template>
        </el-table-column>

        <el-table-column :label="text('common.actions', '操作')" width="300" fixed="right" align="center">
          <template #default="{ row }">
            <div class="op-btns">
              <el-button
                size="small"
                type="primary"
                plain
                @click="openBorrowDialog(row)"
                :disabled="(row.availableQty ?? 0) <= 0"
              >
                {{ text("equipment.actions.borrow", "借用") }}
              </el-button>

              <el-button size="small" @click="openEditDialog(row)" :disabled="!row.canManage">
                {{ text("common.edit", "編輯") }}
              </el-button>

              <el-button
                size="small"
                type="danger"
                plain
                @click="handleDelete(row)"
                :disabled="!row.canManage"
              >
                {{ text("common.delete", "刪除") }}
              </el-button>

              <el-button size="small" type="warning" plain @click="openViewDialog(row)">
                {{ text("equipment.actions.view", "檢視") }}
              </el-button>
            </div>
          </template>
        </el-table-column>

        <template #empty>
          <div class="table-empty">{{ text("common.noData", "目前沒有資料") }}</div>
        </template>
      </el-table>

      <div v-else class="mobile-list">
        <el-skeleton v-if="loading" :rows="6" animated />

        <template v-else>
          <el-empty v-if="!rows.length" :description="text('common.noData', '目前沒有資料')" />

          <div v-else class="cards">
            <article v-for="row in rows" :key="row.id" class="row-card">
              <div class="card-top">
                <div class="card-left">
                  <div class="row-head">
                    <el-image
                      v-if="resolveImg(row.imageUrl)"
                      :src="resolveImg(row.imageUrl)"
                      fit="cover"
                      class="thumb-sm"
                      :preview-src-list="[resolveImg(row.imageUrl)]"
                      preview-teleported
                    />
                    <div v-else class="img-placeholder sm">—</div>

                    <div class="row-title">
                      <div class="name">{{ row.name || "—" }}</div>
                      <div class="sub muted">
                        {{ row.assetCode || "—" }}
                        <span class="dot">·</span>
                        {{ row.location || "—" }}
                      </div>
                    </div>
                  </div>

                  <div class="row-meta">
                    <el-tag type="info" effect="plain" class="pill mini">
                      {{ text('equipment.stock.colTotalQty', '總數') }}：{{ row.totalQty ?? 0 }}
                    </el-tag>
                    <el-tag
                      :type="(row.availableQty ?? 0) > 0 ? 'success' : 'danger'"
                      effect="plain"
                      class="pill mini"
                    >
                      {{ text('equipment.stock.colAvailableQty', '可借數') }}：{{ row.availableQty ?? 0 }}
                    </el-tag>
                    <el-tag effect="plain" class="pill mini">
                      {{ text('equipment.stock.colKeeper', '保管人') }}：{{ row.keeper || "—" }}
                    </el-tag>
                  </div>

                  <div class="row-kv">
                    <div class="meta-panel">
                      <div class="meta-label">{{ text('equipment.stock.colCalibration', '校正日期') }}</div>
                      <div class="meta-value">{{ fmt(row.calibrationDate) }}</div>
                    </div>
                    <div class="meta-panel">
                      <div class="meta-label">{{ text('equipment.stock.colRemark', '備註') }}</div>
                      <div class="meta-value">{{ row.remark || "—" }}</div>
                    </div>
                  </div>
                </div>

                <el-dropdown trigger="click" @command="(cmd) => onEquipAction(cmd, row)">
                  <el-button class="btn-chip" type="primary" plain size="small">
                    {{ text("common.actions", "操作") }} ▼
                  </el-button>
                  <template #dropdown>
                    <el-dropdown-menu>
                      <el-dropdown-item command="borrow" :disabled="(row.availableQty ?? 0) <= 0">
                        {{ text("equipment.actions.borrow", "借用") }}
                      </el-dropdown-item>
                      <el-dropdown-item command="view">
                        {{ text("equipment.actions.view", "檢視") }}
                      </el-dropdown-item>
                      <el-dropdown-item command="edit" :disabled="!row.canManage">
                        {{ text("common.edit", "編輯") }}
                      </el-dropdown-item>
                      <el-dropdown-item command="delete" :disabled="!row.canManage" divided>
                        {{ text("common.delete", "刪除") }}
                      </el-dropdown-item>
                    </el-dropdown-menu>
                  </template>
                </el-dropdown>
              </div>

              <div class="card-actions">
                <el-button
                  class="btn-full"
                  type="primary"
                  plain
                  @click="openBorrowDialog(row)"
                  :disabled="(row.availableQty ?? 0) <= 0"
                >
                  {{ text("equipment.actions.borrow", "借用") }}
                </el-button>
                <el-button class="btn-full" type="warning" plain @click="openViewDialog(row)">
                  {{ text("equipment.actions.view", "檢視") }}
                </el-button>
              </div>
            </article>
          </div>
        </template>
      </div>

      <div class="pager">
        <el-pagination
          background
          layout="sizes, prev, pager, next, jumper"
          :current-page="page"
          :page-size="pageSize"
          :page-sizes="[10, 20, 50, 100]"
          :total="total"
          @current-change="handlePageChange"
          @size-change="handlePageSizeChange"
        />
      </div>
    </el-card>

    <el-card class="block-card loans-card" shadow="never">
      <template #header>
        <div class="section-head">
          <div>
            <div class="section-title">{{ text("equipment.myLoans.title", "我的借用紀錄") }}</div>
            <div class="section-subtitle">
              {{ text("equipment.myLoans.sectionSubtitle", "追蹤待審核、借用中、逾期與已歸還狀態") }}
            </div>
          </div>

          <div class="tools">
            <el-select
              v-model="loanStatusFilter"
              class="ctrl w-160"
              clearable
              :placeholder="text('equipment.myLoans.filterStatus', '篩選狀態')"
              @change="() => { loanPage.value = 1; fetchLoans() }"
            >
              <el-option :label="text('equipment.myLoans.statusAll', '全部狀態')" value="" />
              <el-option :label="text('equipment.status.pending', '待審核')" value="pending" />
              <el-option :label="text('equipment.status.rejected', '已拒絕')" value="rejected" />
              <el-option :label="text('equipment.status.borrowed', '借用中')" value="borrowed" />
              <el-option :label="text('equipment.status.overdue', '逾期')" value="overdue" />
              <el-option :label="text('equipment.status.returned', '已歸還')" value="returned" />
            </el-select>

            <el-button class="btn" plain :icon="Refresh" @click="fetchLoans" :loading="loadingLoans">
              {{ text("common.refresh", "重新整理") }}
            </el-button>
          </div>
        </div>
      </template>

      <el-table
        v-if="!isMobile"
        v-loading="loadingLoans"
        :data="loanRows"
        border
        stripe
        class="tbl"
        style="width: 100%"
      >
        <el-table-column prop="itemName" :label="text('equipment.myLoans.colName', '設備名稱')" min-width="260" />

        <el-table-column :label="text('equipment.myLoans.colQty', '數量')" width="90" align="center">
          <template #default="{ row }">{{ row.quantity ?? 0 }}</template>
        </el-table-column>

        <el-table-column :label="text('equipment.myLoans.colBorrowedAt', '借出時間')" min-width="170">
          <template #default="{ row }">{{ fmt(row.borrowedAt) }}</template>
        </el-table-column>

        <el-table-column :label="text('equipment.myLoans.colExpectedReturn', '預計歸還')" min-width="170">
          <template #default="{ row }">{{ fmt(row.expectedReturnAt) }}</template>
        </el-table-column>

        <el-table-column :label="text('equipment.myLoans.colReturnedAt', '實際歸還')" min-width="170">
          <template #default="{ row }">{{ fmt(row.returnedAt) }}</template>
        </el-table-column>

        <el-table-column :label="text('equipment.myLoans.colStatus', '狀態')" width="140" align="center">
          <template #default="{ row }">
            <el-tooltip
              v-if="statusKey(row) === 'rejected' && row.rejectReason"
              :content="text('equipment.myLoans.rejectReasonTip', '拒絕原因：{reason}', { reason: row.rejectReason })"
              placement="top"
            >
              <el-tag :type="loanStatusType(row)" effect="plain" class="pill mini">
                {{ loanStatusText(row) }}
              </el-tag>
            </el-tooltip>

            <el-tag v-else :type="loanStatusType(row)" effect="plain" class="pill mini">
              {{ loanStatusText(row) }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column :label="text('common.actions', '操作')" width="140" align="center">
          <template #default="{ row }">
            <el-button
              v-if="canReturn(row)"
              size="small"
              type="success"
              @click="handleReturn(row)"
            >
              {{ text("equipment.actions.return", "歸還") }}
            </el-button>
            <span v-else class="muted">—</span>
          </template>
        </el-table-column>

        <template #empty>
          <div class="table-empty">{{ text("common.noData", "目前沒有資料") }}</div>
        </template>
      </el-table>

      <div v-else class="mobile-list">
        <el-skeleton v-if="loadingLoans" :rows="6" animated />

        <template v-else>
          <el-empty v-if="!loanRows.length" :description="text('common.noData', '目前沒有資料')" />

          <div v-else class="cards">
            <article v-for="row in loanRows" :key="row.id" class="row-card">
              <div class="loan-top">
                <div class="loan-name">
                  <div class="name">{{ row.itemName || "—" }}</div>
                  <div class="sub muted">
                    {{ text('equipment.myLoans.colQty', '數量') }}：{{ row.quantity ?? 0 }}
                  </div>
                </div>

                <el-tag :type="loanStatusType(row)" effect="plain" class="pill mini">
                  {{ loanStatusText(row) }}
                </el-tag>
              </div>

              <div class="loan-grid">
                <div class="meta-panel">
                  <div class="meta-label">{{ text('equipment.myLoans.colBorrowedAt', '借出時間') }}</div>
                  <div class="meta-value">{{ fmt(row.borrowedAt) }}</div>
                </div>
                <div class="meta-panel">
                  <div class="meta-label">{{ text('equipment.myLoans.colExpectedReturn', '預計歸還') }}</div>
                  <div class="meta-value">{{ fmt(row.expectedReturnAt) }}</div>
                </div>
                <div class="meta-panel">
                  <div class="meta-label">{{ text('equipment.myLoans.colReturnedAt', '實際歸還') }}</div>
                  <div class="meta-value">{{ fmt(row.returnedAt) }}</div>
                </div>
              </div>

              <el-alert
                v-if="statusKey(row) === 'rejected' && row.rejectReason"
                type="warning"
                show-icon
                :closable="false"
                class="mini-alert"
                :title="text('equipment.myLoans.rejectReasonTip', '拒絕原因：{reason}', { reason: row.rejectReason })"
              />

              <div class="card-actions">
                <el-button
                  v-if="canReturn(row)"
                  class="btn-full"
                  type="success"
                  @click="handleReturn(row)"
                >
                  {{ text("equipment.actions.return", "歸還") }}
                </el-button>
                <el-button v-else class="btn-full" disabled>
                  —
                </el-button>
              </div>
            </article>
          </div>
        </template>
      </div>

      <div class="pager">
        <el-pagination
          background
          layout="sizes, prev, pager, next, jumper"
          :current-page="loanPage"
          :page-size="loanPageSize"
          :page-sizes="[10, 20, 50, 100]"
          :total="loanTotal"
          @current-change="handleLoanPageChange"
          @size-change="handleLoanPageSizeChange"
        />
      </div>
    </el-card>

    <el-dialog
      v-model="borrowDialog.visible"
      :title="text('equipment.borrowDialog.title', '借用設備')"
      :width="isMobile ? '100%' : '560px'"
      :fullscreen="isMobile"
      destroy-on-close
    >
      <div class="dialog-hero small">
        <div class="dialog-main">
          <div class="dialog-title">{{ text('equipment.borrowDialog.heroTitle', '建立借用申請') }}</div>
          <div class="dialog-subtitle">
            {{ text('equipment.borrowDialog.heroSubtitle', '確認數量與預計歸還時間後送出，系統會建立借用紀錄') }}
          </div>
        </div>

        <div class="dialog-preview">
          <div class="preview-label">{{ text('equipment.borrowDialog.item', '設備') }}</div>
          <div class="preview-value">{{ borrowDialog.form.name || '—' }}</div>
        </div>
      </div>

      <el-form
        :model="borrowDialog.form"
        :label-width="isMobile ? 'auto' : '90px'"
        :label-position="isMobile ? 'top' : 'right'"
      >
        <el-form-item :label="text('equipment.borrowDialog.item', '設備')">
          <el-input v-model="borrowDialog.form.name" disabled />
        </el-form-item>

        <el-form-item :label="text('equipment.borrowDialog.qty', '數量')">
          <div class="qty-row">
            <el-input-number
              v-model="borrowDialog.form.quantity"
              :min="1"
              :max="borrowDialog.form.maxQty"
            />
            <el-tag class="pill mini" type="info" effect="plain">
              {{ text("equipment.borrowDialog.available", '可借 {n}', { n: borrowDialog.form.maxQty }) }}
            </el-tag>
          </div>
        </el-form-item>

        <el-form-item :label="text('equipment.borrowDialog.expectedReturn', '預計歸還')">
          <el-date-picker
            v-model="borrowDialog.form.expectedReturnAt"
            type="datetime"
            :placeholder="text('equipment.borrowDialog.pickDate', '選擇日期時間')"
            value-format="YYYY-MM-DD HH:mm:ss"
            style="width: 100%"
          />
        </el-form-item>

        <el-form-item :label="text('equipment.borrowDialog.remark', '備註')">
          <el-input
            v-model="borrowDialog.form.remark"
            type="textarea"
            :rows="3"
            :placeholder="text('equipment.borrowDialog.remarkPlaceholder', '補充借用用途或說明')"
          />
        </el-form-item>

        <el-alert
          type="info"
          show-icon
          :closable="false"
          :title="text('equipment.borrowDialog.hint', '送出後可在我的借用紀錄查看狀態與歸還資訊')"
          class="mini-alert"
        />
      </el-form>

      <template #footer>
        <el-button class="btn" @click="borrowDialog.visible = false">{{ text("common.cancel", "取消") }}</el-button>
        <el-button class="btn" type="primary" :loading="borrowDialog.loading" @click="submitBorrow">
          {{ text("equipment.borrowDialog.submit", "送出申請") }}
        </el-button>
      </template>
    </el-dialog>

    <el-dialog
      v-model="editDialog.visible"
      :title="editDialog.isEdit ? text('equipment.editDialog.titleEdit', '編輯設備') : text('equipment.editDialog.titleNew', '新增設備')"
      :width="isMobile ? '100%' : '760px'"
      :fullscreen="isMobile"
      destroy-on-close
    >
      <div class="dialog-hero">
        <div class="dialog-main">
          <div class="dialog-title">
            {{ editDialog.isEdit ? text('equipment.editDialog.heroEditTitle', '更新設備資料') : text('equipment.editDialog.heroNewTitle', '建立新設備資料') }}
          </div>
          <div class="dialog-subtitle">
            {{ text('equipment.editDialog.heroSubtitle', '可設定庫存、校正日期、圖片與備註，儲存後會立即更新清單') }}
          </div>
        </div>

        <div class="dialog-preview" v-if="editDialog.form.name || editDialog.form.assetCode">
          <div class="preview-label">{{ text('equipment.editDialog.preview', '資料預覽') }}</div>
          <div class="preview-value">{{ editDialog.form.name || '—' }}</div>
          <div class="preview-sub">{{ editDialog.form.assetCode || '—' }}</div>
        </div>
      </div>

      <el-form
        :model="editDialog.form"
        :label-width="isMobile ? 'auto' : '110px'"
        :label-position="isMobile ? 'top' : 'right'"
      >
        <el-row :gutter="16">
          <el-col :xs="24" :sm="12">
            <el-form-item :label="text('equipment.editDialog.name', '名稱')">
              <el-input v-model="editDialog.form.name" />
            </el-form-item>
          </el-col>

          <el-col :xs="24" :sm="12">
            <el-form-item :label="text('equipment.editDialog.assetCode', '資產編號')">
              <el-input v-model="editDialog.form.assetCode" />
            </el-form-item>
          </el-col>

          <el-col :xs="24" :sm="12">
            <el-form-item :label="text('equipment.editDialog.location', '位置')">
              <el-input v-model="editDialog.form.location" />
            </el-form-item>
          </el-col>

          <el-col :xs="24" :sm="12">
            <el-form-item :label="text('equipment.editDialog.keeper', '保管人')">
              <el-input v-model="editDialog.form.keeper" />
            </el-form-item>
          </el-col>

          <el-col :xs="24" :sm="12">
            <el-form-item :label="text('equipment.editDialog.totalQty', '總數')">
              <el-input-number v-model="editDialog.form.totalQty" :min="0" />
            </el-form-item>
          </el-col>

          <el-col :xs="24" :sm="12">
            <el-form-item :label="text('equipment.editDialog.availableQty', '可借數')">
              <el-input-number v-model="editDialog.form.availableQty" :min="0" />
            </el-form-item>
          </el-col>

          <el-col :xs="24" :sm="12">
            <el-form-item :label="text('equipment.editDialog.calibrationDate', '校正日期')">
              <el-date-picker
                v-model="editDialog.form.calibrationDate"
                type="date"
                :placeholder="text('equipment.editDialog.pickDate', '選擇日期')"
                value-format="YYYY-MM-DD"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>

          <el-col :xs="24" :sm="12">
            <el-form-item :label="text('equipment.editDialog.imageUrl', '圖片')">
              <div class="img-field">
                <el-image
                  v-if="resolveImg(editDialog.form.imageUrl)"
                  :src="resolveImg(editDialog.form.imageUrl)"
                  fit="cover"
                  class="thumb"
                  :preview-src-list="[resolveImg(editDialog.form.imageUrl)]"
                  preview-teleported
                />
                <div v-else class="img-placeholder">—</div>

                <div class="img-actions">
                  <el-button size="small" :icon="Picture" @click="openImgPicker">
                    {{ text('common.choose', '選擇圖片') }}
                  </el-button>
                  <el-button size="small" plain :disabled="!editDialog.form.imageUrl" @click="editDialog.form.imageUrl = ''">
                    {{ text('common.clear', '清除') }}
                  </el-button>
                </div>
              </div>
            </el-form-item>
          </el-col>

          <el-col :xs="24">
            <el-form-item :label="text('equipment.editDialog.remark', '備註')">
              <el-input v-model="editDialog.form.remark" type="textarea" :rows="3" />
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>

      <template #footer>
        <el-button class="btn" @click="editDialog.visible = false">{{ text("common.cancel", "取消") }}</el-button>
        <el-button class="btn" type="primary" :loading="editDialog.loading" @click="submitEdit">
          {{ text("common.save", "儲存") }}
        </el-button>
      </template>
    </el-dialog>

    <el-dialog
      v-model="viewDialog.visible"
      :title="text('equipment.viewDialog.title', '設備檢視')"
      :width="isMobile ? '100%' : '700px'"
      :fullscreen="isMobile"
      destroy-on-close
    >
      <div class="view-wrap">
        <div class="view-left">
          <el-image
            v-if="resolveImg(viewDialog.row?.imageUrl)"
            :src="resolveImg(viewDialog.row?.imageUrl)"
            fit="cover"
            class="view-img"
            :preview-src-list="[resolveImg(viewDialog.row?.imageUrl)]"
            preview-teleported
          />
          <div v-else class="big-placeholder">—</div>
        </div>

        <div class="view-right">
          <div class="view-title">{{ viewDialog.row?.name || "—" }}</div>
          <div class="view-grid">
            <div class="meta-panel"><div class="meta-label">{{ text("equipment.viewDialog.assetCode", "資產編號") }}</div><div class="meta-value">{{ viewDialog.row?.assetCode || "—" }}</div></div>
            <div class="meta-panel"><div class="meta-label">{{ text("equipment.viewDialog.location", "位置") }}</div><div class="meta-value">{{ viewDialog.row?.location || "—" }}</div></div>
            <div class="meta-panel"><div class="meta-label">{{ text("equipment.viewDialog.keeper", "保管人") }}</div><div class="meta-value">{{ viewDialog.row?.keeper || "—" }}</div></div>
            <div class="meta-panel"><div class="meta-label">{{ text("equipment.viewDialog.totalQty", "總數") }}</div><div class="meta-value">{{ viewDialog.row?.totalQty ?? 0 }}</div></div>
            <div class="meta-panel"><div class="meta-label">{{ text("equipment.viewDialog.availableQty", "可借數") }}</div><div class="meta-value">{{ viewDialog.row?.availableQty ?? 0 }}</div></div>
            <div class="meta-panel"><div class="meta-label">{{ text("equipment.viewDialog.calibrationDate", "校正日期") }}</div><div class="meta-value">{{ fmt(viewDialog.row?.calibrationDate) }}</div></div>
          </div>

          <div class="view-remark">
            <div class="meta-label">{{ text("equipment.viewDialog.remark", "備註") }}</div>
            <div class="remark-box">{{ viewDialog.row?.remark || "—" }}</div>
          </div>
        </div>
      </div>

      <template #footer>
        <el-button class="btn" @click="viewDialog.visible = false">{{ text("common.close", "關閉") }}</el-button>
      </template>
    </el-dialog>

    <el-dialog
      v-model="imgPicker.visible"
      :title="text('equipment.imagePicker.title', '選擇圖片（檔案中心）')"
      width="860px"
      :close-on-click-modal="false"
      destroy-on-close
    >
      <div class="img-picker-top">
        <el-input
          v-model="imgPicker.keyword"
          class="ctrl w-search"
          clearable
          :placeholder="text('equipment.imagePicker.searchPlaceholder', '搜尋圖片檔名關鍵字…')"
          @keyup.enter="fetchImageFiles"
          @clear="fetchImageFiles"
        >
          <template #prefix><el-icon><Search /></el-icon></template>
        </el-input>
        <el-button :icon="Refresh" @click="fetchImageFiles" :loading="imgPicker.loading">{{ text("common.refresh", "重新整理") }}</el-button>
      </div>

      <el-table
        :data="imgPicker.list"
        v-loading="imgPicker.loading"
        class="picker-table"
        height="420"
        :empty-text="text('common.noData', '目前沒有資料')"
      >
        <el-table-column :label="text('equipment.imagePicker.preview', '預覽')" width="90" align="center">
          <template #default="{ row }">
            <div class="thumb-wrap">
              <el-image
                v-if="fileStaticUrl(row)"
                :src="fileStaticUrl(row)"
                fit="cover"
                class="thumb"
                :preview-src-list="[fileStaticUrl(row)].filter(Boolean)"
                preview-teleported
              />
              <div v-else class="img-placeholder">—</div>
            </div>
          </template>
        </el-table-column>

        <el-table-column prop="displayName" :label="text('equipment.imagePicker.fileName', '檔名')" min-width="220" show-overflow-tooltip>
          <template #default="{ row }">
            {{ row.displayName || row.originalName || row.storedName || '—' }}
          </template>
        </el-table-column>

        <el-table-column prop="category" :label="text('equipment.imagePicker.category', '分類')" width="120" />
        <el-table-column prop="updatedAt" :label="text('equipment.imagePicker.updatedAt', '更新時間')" width="180">
          <template #default="{ row }">{{ fmt(row.updatedAt) }}</template>
        </el-table-column>

        <el-table-column :label="text('common.actions', '操作')" width="140" fixed="right" align="center">
          <template #default="{ row }">
            <el-button type="primary" size="small" @click="pickFileAsImage(row)">
              {{ text('equipment.imagePicker.useThis', '使用此圖片') }}
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="pager">
        <el-pagination
          background
          layout="total, prev, pager, next, jumper"
          :page-size="imgPicker.pageSize"
          :current-page="imgPicker.page"
          :total="imgPicker.total"
          @current-change="handleImgPageChange"
        />
      </div>

      <template #footer>
        <el-button @click="imgPicker.visible = false">{{ text("common.close", "關閉") }}</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, onBeforeUnmount, computed } from "vue"
import { useI18n } from "vue-i18n"
import { ElMessage, ElMessageBox } from "element-plus"
import { Search, Plus, Refresh, Picture } from "@element-plus/icons-vue"
import request from "../utils/request"

const { t, te } = useI18n()

function text (key, fallback, params) {
  if (te(key)) return t(key, params)
  if (!params) return fallback
  return String(fallback).replace(/\{(\w+)\}/g, (_, k) => String(params?.[k] ?? ""))
}

const isMobile = ref(false)
let mql = null
let cleanupMql = null
function setupMql () {
  mql = window.matchMedia("(max-width: 768px)")
  const apply = () => { isMobile.value = !!mql.matches }
  apply()
  try { mql.addEventListener("change", apply) } catch { mql.addListener(apply) }
  return () => {
    try { mql.removeEventListener("change", apply) } catch { mql.removeListener(apply) }
  }
}

function safePath (p) {
  const s = String(p ?? "")
  if (!s) return ""
  return s.split("/").map(encodeURIComponent).join("/")
}
function resolveImg (u) {
  const s = String(u ?? "").trim()
  if (!s) return ""
  if (/^https?:\/\//i.test(s)) return s
  return s.startsWith("/") ? s : `/${s}`
}
function fileStaticUrl (file) {
  const sn = String(file?.storedName || "").trim()
  if (!sn) return ""
  return resolveImg(`/uploads/files/${safePath(sn)}`)
}

const loading = ref(false)
const rows = ref([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(10)
const keyword = ref("")

const fetchList = async () => {
  loading.value = true
  try {
    const { data } = await request.get("/equipments", {
      params: { page: page.value, pageSize: pageSize.value, keyword: keyword.value }
    })
    if (!data?.ok) throw new Error(data?.message || "load failed")
    rows.value = data.data.rows || []
    total.value = data.data.count || 0
  } catch (err) {
    console.error(err)
    ElMessage.error(text("equipment.msgLoadListFail", "載入設備清單失敗"))
  } finally {
    loading.value = false
  }
}

const handleSearch = () => {
  page.value = 1
  fetchList()
}
const handlePageChange = (p) => {
  page.value = p
  fetchList()
}
const handlePageSizeChange = (s) => {
  pageSize.value = s
  page.value = 1
  fetchList()
}

const nowText = ref("")
let timer = null
const updateNow = () => {
  nowText.value = new Date().toLocaleString()
}

const loadingLoans = ref(false)
const loanRows = ref([])
const loanTotal = ref(0)
const loanPage = ref(1)
const loanPageSize = ref(10)
const loanStatusFilter = ref("")

const fetchLoans = async () => {
  loadingLoans.value = true
  try {
    const { data } = await request.get("/equipments/my-loans", {
      params: {
        page: loanPage.value,
        pageSize: loanPageSize.value,
        status: loanStatusFilter.value || ""
      }
    })
    if (!data?.ok) throw new Error(data?.message || "load failed")
    loanRows.value = data.data.rows || []
    loanTotal.value = data.data.count || 0
  } catch (err) {
    console.error(err)
    ElMessage.error(text("equipment.msgLoadLoansFail", "載入借用紀錄失敗"))
  } finally {
    loadingLoans.value = false
  }
}

const handleLoanPageChange = (p) => {
  loanPage.value = p
  fetchLoans()
}
const handleLoanPageSizeChange = (s) => {
  loanPageSize.value = s
  loanPage.value = 1
  fetchLoans()
}

const statusKey = (row) => String(row?.status || "").toLowerCase()
const loanStatusText = (row) => {
  const s = statusKey(row)
  if (s === "rejected") return text("equipment.status.rejected", "已拒絕")
  if (s === "pending") return text("equipment.status.pending", "待審核")
  if (s === "borrowed") return text("equipment.status.borrowed", "借用中")
  if (s === "overdue") return text("equipment.status.overdue", "逾期")
  if (s === "returned") return text("equipment.status.returned", "已歸還")
  return s || "—"
}
const loanStatusType = (row) => {
  const s = statusKey(row)
  if (s === "rejected") return "danger"
  if (s === "pending") return "info"
  if (s === "borrowed") return "primary"
  if (s === "overdue") return "warning"
  if (s === "returned") return "success"
  return ""
}
const canReturn = (row) => {
  const s = statusKey(row)
  return s === "borrowed" || s === "overdue"
}

const handleReturn = async (row) => {
  try {
    await ElMessageBox.confirm(
      text("equipment.confirmReturnText", "確定要歸還此設備嗎？"),
      text("equipment.confirmReturnTitle", "歸還確認"),
      {
        type: "warning",
        confirmButtonText: text("common.confirm", "確認"),
        cancelButtonText: text("common.cancel", "取消")
      }
    )
    const { data } = await request.post(`/equipments/loans/${row.id}/return`)
    if (!data?.ok) throw new Error(data?.message || "return failed")
    ElMessage.success(text("equipment.msgReturned", "已完成歸還"))
    await fetchList()
    await fetchLoans()
  } catch (err) {
    if (String(err?.message || "").includes("cancel")) return
    console.error(err)
    ElMessage.error(err?.response?.data?.message || err?.message || text("equipment.msgReturnFail", "歸還失敗"))
  }
}

const borrowDialog = reactive({
  visible: false,
  loading: false,
  row: null,
  form: { id: 0, name: "", maxQty: 0, quantity: 1, expectedReturnAt: "", remark: "" }
})

const openBorrowDialog = (row) => {
  borrowDialog.row = row
  borrowDialog.form.id = row.id
  borrowDialog.form.name = row.name || ""
  borrowDialog.form.maxQty = Number(row.availableQty || 0)
  borrowDialog.form.quantity = 1
  borrowDialog.form.expectedReturnAt = ""
  borrowDialog.form.remark = ""
  borrowDialog.visible = true
}

const submitBorrow = async () => {
  const id = borrowDialog.form.id
  const qty = Number(borrowDialog.form.quantity || 0)

  if (!id || !Number.isFinite(qty) || qty <= 0) return ElMessage.warning(text("equipment.msgQtyInvalid", "請輸入正確數量"))
  if (qty > borrowDialog.form.maxQty) return ElMessage.warning(text("equipment.msgQtyOver", "數量超過可借上限"))

  borrowDialog.loading = true
  try {
    const { data } = await request.post(`/equipments/${id}/borrow`, {
      quantity: qty,
      expectedReturnAt: borrowDialog.form.expectedReturnAt || null,
      remark: borrowDialog.form.remark || ""
    })
    if (!data?.ok) throw new Error(data?.message || "borrow failed")
    ElMessage.success(text("equipment.msgBorrowSubmitted", "借用申請已送出"))
    borrowDialog.visible = false
    await fetchList()
    await fetchLoans()
  } catch (err) {
    console.error(err)
    ElMessage.error(err?.response?.data?.message || err?.message || text("equipment.msgBorrowFail", "借用失敗"))
  } finally {
    borrowDialog.loading = false
  }
}

const editDialog = reactive({
  visible: false,
  loading: false,
  isEdit: false,
  id: null,
  form: reactive({
    name: "",
    assetCode: "",
    location: "",
    keeper: "",
    totalQty: 0,
    availableQty: 0,
    calibrationDate: "",
    imageUrl: "",
    remark: ""
  })
})

function resetEditForm () {
  editDialog.form.name = ""
  editDialog.form.assetCode = ""
  editDialog.form.location = ""
  editDialog.form.keeper = ""
  editDialog.form.totalQty = 0
  editDialog.form.availableQty = 0
  editDialog.form.calibrationDate = ""
  editDialog.form.imageUrl = ""
  editDialog.form.remark = ""
}

const openEditDialog = (row = null) => {
  editDialog.visible = true
  editDialog.loading = false

  if (row && row.id) {
    editDialog.isEdit = true
    editDialog.id = row.id
    editDialog.form.name = row.name || ""
    editDialog.form.assetCode = row.assetCode || ""
    editDialog.form.location = row.location || ""
    editDialog.form.keeper = row.keeper || ""
    editDialog.form.totalQty = Number(row.totalQty || 0)
    editDialog.form.availableQty = Number(row.availableQty || 0)
    editDialog.form.calibrationDate = row.calibrationDate || ""
    editDialog.form.imageUrl = row.imageUrl || ""
    editDialog.form.remark = row.remark || ""
  } else {
    editDialog.isEdit = false
    editDialog.id = null
    resetEditForm()
  }
}

const submitEdit = async () => {
  const name = String(editDialog.form.name || "").trim()
  if (!name) return ElMessage.warning(text("equipment.msgNameRequired", "請輸入名稱"))

  editDialog.loading = true
  try {
    const payload = {
      ...editDialog.form,
      name,
      assetCode: String(editDialog.form.assetCode || "").trim(),
      location: String(editDialog.form.location || "").trim(),
      keeper: String(editDialog.form.keeper || "").trim(),
      imageUrl: String(editDialog.form.imageUrl || "").trim() || null,
      remark: editDialog.form.remark || "",
      calibrationDate: editDialog.form.calibrationDate || null
    }

    const resp = editDialog.isEdit
      ? await request.put(`/equipments/${editDialog.id}`, payload)
      : await request.post(`/equipments`, payload)

    if (!resp?.data?.ok) throw new Error(resp?.data?.message || "save failed")
    ElMessage.success(text("equipment.msgSaved", "儲存成功"))
    editDialog.visible = false
    await fetchList()
  } catch (err) {
    console.error(err)
    ElMessage.error(err?.response?.data?.message || err?.message || text("equipment.msgSaveFail", "儲存失敗"))
  } finally {
    editDialog.loading = false
  }
}

const handleDelete = async (row) => {
  try {
    await ElMessageBox.confirm(
      text("equipment.confirmDeleteText", "確定要刪除 {name} 嗎？", { name: row.name }),
      text("equipment.confirmDeleteTitle", "刪除確認"),
      {
        type: "warning",
        confirmButtonText: text("common.confirm", "確認"),
        cancelButtonText: text("common.cancel", "取消")
      }
    )
    const { data } = await request.delete(`/equipments/${row.id}`)
    if (!data?.ok) throw new Error(data?.message || "delete failed")
    ElMessage.success(text("equipment.msgDeleted", "刪除成功"))
    await fetchList()
  } catch (err) {
    if (String(err?.message || "").includes("cancel")) return
    console.error(err)
    ElMessage.error(err?.response?.data?.message || err?.message || text("equipment.msgDeleteFail", "刪除失敗"))
  }
}

const viewDialog = reactive({ visible: false, row: null })
const openViewDialog = (row) => {
  viewDialog.row = row
  viewDialog.visible = true
}

function onEquipAction (cmd, row) {
  if (cmd === "borrow") return openBorrowDialog(row)
  if (cmd === "view") return openViewDialog(row)
  if (cmd === "edit") return openEditDialog(row)
  if (cmd === "delete") return handleDelete(row)
}

const fmt = (v) => {
  if (!v) return "—"
  const d = new Date(v)
  if (Number.isNaN(d.getTime())) return String(v)
  return d.toLocaleString()
}

const imgPicker = reactive({
  visible: false,
  loading: false,
  keyword: "",
  page: 1,
  pageSize: 10,
  total: 0,
  list: []
})

function openImgPicker () {
  imgPicker.visible = true
  imgPicker.page = 1
  fetchImageFiles()
}

function handleImgPageChange (p) {
  imgPicker.page = p
  fetchImageFiles()
}

async function fetchImageFiles () {
  imgPicker.loading = true
  try {
    const { data } = await request.get("/files", {
      params: {
        keyword: imgPicker.keyword,
        page: imgPicker.page,
        pageSize: imgPicker.pageSize,
        category: "Image",
        type: "image"
      }
    })
    const payload = data?.data || data
    imgPicker.list = payload?.rows || []
    imgPicker.total = Number(payload?.count || 0)
  } catch (e) {
    console.error(e)
    ElMessage.error(text("equipment.imagePicker.loadFailed", "載入圖片失敗"))
  } finally {
    imgPicker.loading = false
  }
}

function pickFileAsImage (file) {
  const u = fileStaticUrl(file)
  if (!u) return
  editDialog.form.imageUrl = u
  imgPicker.visible = false
}

const stockTotalQty = computed(() =>
  rows.value.reduce((sum, row) => sum + Number(row?.totalQty || 0), 0)
)
const stockAvailableQty = computed(() =>
  rows.value.reduce((sum, row) => sum + Number(row?.availableQty || 0), 0)
)
const activeLoanCount = computed(() =>
  loanRows.value.filter(row => ["borrowed", "overdue"].includes(statusKey(row))).length
)

onMounted(async () => {
  cleanupMql = setupMql()
  updateNow()
  timer = setInterval(updateNow, 1000)
  await fetchList()
  await fetchLoans()
})

onBeforeUnmount(() => {
  if (timer) clearInterval(timer)
  if (cleanupMql) cleanupMql()
})
</script>

<style scoped>
.equipment-page-vivid {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  color: var(--el-text-color-primary);
}

.muted { color: var(--el-text-color-secondary); }
.ctrl { border-radius: 12px; }
.btn { border-radius: 12px; }
.pill { border-radius: 999px; }
.pill.mini { font-size: 12px; padding: 2px 10px; }
.w-search { width: 320px; max-width: 100%; }
.w-160 { width: 160px; }

.hero-card,
.block-card {
  border: 1px solid var(--el-border-color-light);
  border-radius: 22px;
  background:
    radial-gradient(circle at top right, color-mix(in srgb, var(--el-color-primary) 12%, transparent) 0%, transparent 34%),
    linear-gradient(180deg, color-mix(in srgb, var(--el-bg-color) 94%, var(--el-color-primary-light-9) 6%) 0%, var(--el-bg-color) 100%);
  box-shadow: 0 18px 48px rgba(0, 0, 0, 0.06);
}

.hero-card {
  padding: 20px;
  overflow: hidden;
  position: relative;
}

.hero-card::after {
  content: "";
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
  gap: 18px;
  margin-bottom: 18px;
}

.hero-left {
  display: flex;
  align-items: center;
  gap: 14px;
  min-width: 0;
}

.hero-icon-wrap {
  width: 66px;
  height: 66px;
  border-radius: 20px;
  display: grid;
  place-items: center;
  background: linear-gradient(135deg, var(--el-color-primary-light-7), var(--el-color-primary-light-9));
  border: 1px solid color-mix(in srgb, var(--el-color-primary) 25%, var(--el-border-color-light));
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.5);
}

.hero-icon { font-size: 30px; }
.hero-copy { min-width: 0; }
.hero-eyebrow {
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.08em;
  color: var(--el-color-primary);
  margin-bottom: 4px;
}
.hero-title {
  margin: 0;
  font-size: 30px;
  font-weight: 800;
  line-height: 1.15;
}
.hero-subtitle {
  margin-top: 6px;
  color: var(--el-text-color-secondary);
  font-size: 14px;
}
.hero-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
  flex-wrap: wrap;
}
.hero-now {
  min-width: 160px;
  padding: 10px 12px;
  border-radius: 14px;
  border: 1px solid var(--el-border-color-lighter);
  background: color-mix(in srgb, var(--el-fill-color-light) 88%, white 12%);
}
.hero-now-label {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  margin-bottom: 4px;
}
.hero-now-value {
  font-size: 14px;
  font-weight: 700;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}
.stat-card {
  padding: 14px 16px;
  border-radius: 18px;
  background: color-mix(in srgb, var(--el-fill-color-light) 88%, white 12%);
  border: 1px solid var(--el-border-color-lighter);
}
.stat-primary {
  background: linear-gradient(135deg, var(--el-color-primary-light-8), var(--el-color-primary-light-9));
  border-color: color-mix(in srgb, var(--el-color-primary) 35%, var(--el-border-color));
}
.stat-label {
  color: var(--el-text-color-secondary);
  font-size: 12px;
  margin-bottom: 6px;
}
.stat-value {
  font-size: 28px;
  font-weight: 800;
  line-height: 1;
}

.block-card { margin-bottom: 0; }
.section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}
.section-title {
  font-size: 18px;
  font-weight: 800;
  line-height: 1.2;
}
.section-subtitle {
  margin-top: 4px;
  font-size: 13px;
  color: var(--el-text-color-secondary);
}
.tools {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.tbl :deep(.el-table__header-wrapper th){ background: var(--el-fill-color-light); }
.table-empty{
  padding: 70px 0;
  text-align:center;
  opacity: .75;
  font-size: 14px;
}

.op-btns{
  display:flex;
  align-items:center;
  justify-content:center;
  flex-wrap:wrap;
  gap: 8px;
}
.op-btns :deep(.el-button + .el-button){ margin-left: 0 !important; }

.pager {
  display:flex;
  justify-content:flex-end;
  padding-top: 12px;
}

.thumb{ width: 56px; height: 56px; border-radius: 12px; }
.thumb-sm{ width: 48px; height: 48px; border-radius: 12px; }
.img-placeholder{
  width: 56px; height: 56px; border-radius: 12px;
  background: var(--el-fill-color-light);
  display:grid; place-items:center;
  color: var(--el-text-color-secondary);
  border: 1px dashed var(--el-border-color);
}
.img-placeholder.sm{ width: 48px; height: 48px; border-radius: 12px; }
.big-placeholder{
  width: 240px; height: 240px; border-radius: 18px;
  background: var(--el-fill-color-light);
  display:grid; place-items:center;
  color: var(--el-text-color-secondary);
  border: 1px dashed var(--el-border-color);
}

.img-field{
  display:flex;
  align-items:center;
  gap: 10px;
  flex-wrap: wrap;
}
.img-actions{
  display:flex;
  flex-direction:column;
  gap: 8px;
}

.mobile-list{ width: 100%; }
.cards{ display:grid; gap: 12px; }
.row-card{
  border: 1px solid var(--el-border-color-lighter);
  background: var(--el-bg-color);
  border-radius: 18px;
  padding: 14px;
}
.card-top{
  display:flex;
  align-items:flex-start;
  justify-content:space-between;
  gap: 10px;
}
.row-head{
  display:flex;
  align-items:center;
  gap: 10px;
}
.row-title{ min-width: 0; }
.row-title .name{
  font-weight: 900;
  font-size: 15px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.row-title .sub{
  margin-top: 2px;
  font-size: 12px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.dot{ margin: 0 6px; opacity: .6; }

.row-meta{
  margin-top: 10px;
  display:flex;
  gap: 8px;
  flex-wrap: wrap;
}
.row-kv,
.loan-grid {
  margin-top: 12px;
  display:grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}
.meta-panel{
  padding: 10px 12px;
  border-radius: 14px;
  border: 1px solid var(--el-border-color-lighter);
  background: color-mix(in srgb, var(--el-fill-color-light) 88%, white 12%);
}
.meta-label{
  display: block;
  font-size: 12px;
  color: var(--el-text-color-secondary);
  margin-bottom: 4px;
}
.meta-value{
  font-size: 14px;
  font-weight: 700;
  word-break: break-word;
}

.btn-chip{ border-radius: 999px; }

.card-actions{
  margin-top: 12px;
  display:flex;
  gap: 10px;
}
.btn-full{ flex: 1; border-radius: 12px; }

.loan-top{
  display:flex;
  align-items:flex-start;
  justify-content:space-between;
  gap: 10px;
}
.loan-name .name{ font-weight: 900; font-size: 15px; }
.loan-name .sub{ margin-top: 2px; font-size: 12px; }

.mini-alert{ margin-top: 10px; border-radius: 12px; }
.qty-row{ display:flex; align-items:center; gap: 10px; flex-wrap: wrap; }

.dialog-hero {
  display: grid;
  grid-template-columns: minmax(0, 1.3fr) minmax(220px, 0.9fr);
  gap: 12px;
  margin-bottom: 14px;
}
.dialog-hero.small {
  grid-template-columns: minmax(0, 1.2fr) minmax(180px, 0.8fr);
}
.dialog-main,
.dialog-preview {
  padding: 14px 16px;
  border-radius: 18px;
  border: 1px solid var(--el-border-color-lighter);
  background: linear-gradient(180deg, color-mix(in srgb, var(--el-fill-color-light) 92%, white 8%) 0%, var(--el-bg-color) 100%);
}
.dialog-title {
  font-size: 16px;
  font-weight: 800;
}
.dialog-subtitle {
  margin-top: 6px;
  font-size: 13px;
  color: var(--el-text-color-secondary);
  line-height: 1.6;
}
.preview-label {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  margin-bottom: 6px;
}
.preview-value {
  font-size: 14px;
  font-weight: 800;
}
.preview-sub {
  margin-top: 6px;
  font-size: 12px;
  color: var(--el-color-primary);
  font-weight: 700;
}

.view-wrap{ display:flex; gap: 18px; flex-wrap: wrap; }
.view-left{ width: 240px; }
.view-img{ width: 240px; height: 240px; border-radius: 18px; }
.view-right{ flex: 1; min-width: 260px; }
.view-title {
  font-size: 22px;
  font-weight: 800;
  margin-bottom: 12px;
}
.view-grid {
  display:grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}
.view-remark { margin-top: 12px; }
.remark-box {
  padding: 12px 14px;
  border-radius: 14px;
  background: color-mix(in srgb, var(--el-fill-color-light) 90%, white 10%);
  border: 1px solid var(--el-border-color-lighter);
  line-height: 1.6;
  word-break: break-word;
}

.img-picker-top{
  display:flex;
  align-items:center;
  gap: 8px;
  margin-bottom: 10px;
  flex-wrap: wrap;
}
.picker-table{ width: 100%; }

@media (max-width: 1100px) {
  .stats-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .dialog-hero,
  .dialog-hero.small {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 900px) {
  .w-search{ width: 240px; }
}

@media (max-width: 768px) {
  .equipment-page-vivid{
    padding: 12px;
    gap: 12px;
  }

  .hero-card{
    padding: 16px;
  }

  .hero-main{
    flex-direction:column;
    align-items:stretch;
  }

  .hero-actions{
    justify-content:flex-start;
  }

  .w-search{ width: 100%; }
  .pager{ justify-content:center; }
  .img-actions{ width: 100%; flex-direction: row; }
  .view-left,
  .view-img,
  .big-placeholder { width: 100%; height: auto; aspect-ratio: 1 / 1; }
}

@media (max-width: 640px) {
  .hero-left {
    align-items: flex-start;
  }

  .hero-title {
    font-size: 24px;
  }

  .stats-grid,
  .row-kv,
  .loan-grid,
  .view-grid {
    grid-template-columns: 1fr;
  }

  .hero-actions :deep(.el-button) {
    flex: 1 1 calc(50% - 8px);
  }

  .card-actions{
    flex-direction: column;
  }
}
</style>
