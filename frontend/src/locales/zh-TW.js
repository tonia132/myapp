// frontend/src/i18n/zh-TW.js
export default {
  app: {
    title: "測試網站",
  },

common: {
  confirm: "確認",
  cancel: "取消",
  close: "關閉",
  ok: "確定",
  save: "儲存",
  saved: "已儲存",
  add: "新增",
  edit: "編輯",
  delete: "刪除",
  view: "檢視",
  search: "搜尋",
  reset: "重設",
  actions: "操作",
  yes: "是",
  no: "否",
  na: "N/A",
  loading: "載入中…",
  noData: "目前沒有資料",
  refresh: "重新整理",
  user: "使用者",
},


  time: {
    start: "開始時間",
    end: "結束時間",
  },

  layout: {
    dashboard: "首頁",
    products: "產品管理",
    productTest: "產品測試",
    machines: "機台測試",
    sop: "SOP 作業程序",
    logs: "系統日誌",
    users: "使用者管理",
    profile: "個人資料",
    logout: "登出",
  },

  header: {
    language: "介面語言",
    langZh: "繁體中文",
    langEn: "English",
  },

  topbar: {
    goDashboard: "前往 Dashboard",
    notLoggedIn: "尚未登入",
    toggleTheme: "切換主題",
    apiCopied: "API 已複製",
  },

  sidebar: {
    navLabel: "主選單導覽",
    backHome: "回到首頁",
    expand: "展開側欄",
    collapse: "收合側欄",
    closeFlyout: "關閉浮出選單",

    techDocs: "技術文件",
    safetyReports: "安規報告",
    osRecovery: "OS Recovery",

    productGroup: "產品相關",
    productMgmt: "產品管理",
    testPlanReport: "測試計畫/報告",
    testRequest: "測試需求單",
    testSupport: "測試支援",
    testCaseLibrary: '測試項目',
    testSets: '測試集',

    labGroup: "實驗室/機台",
    equipment: "儀器設備",
    labReliability: "機台測試",
    reliabilityCapacity: "Reliability 可工作容量",
    labEmcSi: "EMC / SI",
    labIp: "IP",
    labIk: "IK",
    labEms: "EMS",

    files: "檔案中心",
    warehouse: "倉庫管理",
    warehouseItems: '庫存清單',
    suggestion: "建議箱",

    adminGroup: "管理工具",
    reviewCenter: "審核中心",
    warehouseBorrow: "倉庫借用審核",
    suggestionsMgmt: "建議箱管理",
    defaultTestSets: "預設測試集",
    userPlanStats: "使用者計畫統計",
  },

  auth: {
    sessionExpired: "登入已過期，請重新登入",
  },

  routeTitles: {
  login: '登入',
  register: '註冊',
  resetPassword: '重設密碼',

  products: '產品管理',
  testCases: '測試項目',
  testSets: '測試集',

  productTest: 'x86 測試報告',
  armTest: 'ARM 測試報告',
  displayTest: 'Display 測試報告',
  partTest: '硬碟/記憶體測試報告',
  storageTest: 'SSD/Storage 測試報告',
  memoryTest: 'Memory 測試報告',

  testRequests: '測試需求單',
  testSupport: '測試支援',

  files: '檔案中心',
  docManager: '文件管理',
  safetyReports: '安規報告',
  osRecovery: 'OS Recovery Center',

  equipment: '儀器設備',
  reviewCenter: '審核中心',

  suggestion: '意見回饋',
  suggestionMine: '我的建議',
  suggestionsManagement: '建議管理',

  usersList: '使用者列表',
  usersManagement: '使用者管理',
  userPlanStats: '使用者方案統計',
  logs: '系統日誌',
  profile: '個人資料',

  defaultTestSets: '預設測試集',

  emcsi: 'EMC&SI 實驗室排程',
  ipLab: 'IP 實驗室排程',
  ikLab: 'IK 實驗室排程',
  ems: 'EMS 實驗室排程',

  machineDashboard: '機台總覽',
  machineDetail: '機台詳情',
  reliabilityCapacity: 'Reliability 機台可工作容量',
  machineTests: '機台測試排程',
},

  welcome: {
    title: "歡迎使用測試系統",
    frontendVersion: "前端版本",
    backendVersion: "後端版本",
    serverStatus: "伺服器狀態",
    serverOnline: "在線",
    serverOffline: "離線",
    apiBase: "API 位置",
    loginStatus: "登入狀態",
    loginNotLoggedIn: "尚未登入",
    loginLoggedIn: "已登入：{name}",
    currentUser: "目前使用者",
    guestHint: "遊客模式：僅能瀏覽部分功能",
    btnCheck: "檢查伺服器",
    btnDashboard: "前往首頁",
    btnProducts: "前往產品列表",
    apiCopied: "已複製 API 位址",
  },

profilePage: {
  title: '個人資料',
  subtitle: '可在這裡修改顯示名稱與登入密碼',
  defaultRole: 'user',

  basic: {
    title: '基本資料',
    desc: '更新左上角顯示名稱',
    tag: 'Profile'
  },

  security: {
    title: '修改密碼',
    desc: '更新後會自動登出，請重新登入',
    tag: 'Security'
  },

  fields: {
    username: '帳號',
    role: '角色',
    displayName: '顯示名稱',
    oldPassword: '目前密碼',
    newPassword: '新密碼',
    confirmPassword: '確認新密碼'
  },

  placeholders: {
    displayName: '請輸入要顯示在左上角的名稱',
    oldPassword: '請輸入目前密碼',
    newPassword: '至少 8 碼，且至少包含 2 種字元類型',
    confirmPassword: '請再次輸入新密碼'
  },

  actions: {
    saveDisplayName: '儲存顯示名稱',
    updatePassword: '更新密碼'
  },

  validation: {
    displayNameRequired: '請輸入顯示名稱',
    displayNameLength: '顯示名稱長度需在 2 ~ 50 字',
    oldPasswordRequired: '請輸入目前密碼',
    newPasswordRequired: '請輸入新密碼',
    newPasswordMin: '新密碼至少 8 碼',
    newPasswordKinds: '新密碼至少要包含 2 種字元類型',
    confirmRequired: '請再次輸入新密碼',
    confirmMismatch: '兩次輸入的新密碼不一致'
  },

  strength: {
    empty: '尚未輸入新密碼',
    high: '密碼強度：高',
    medium: '密碼強度：中',
    low: '密碼強度：低'
  },

  messages: {
    capsLockOn: 'Caps Lock 已開啟',
    sessionExpired: '登入已過期，請重新登入',
    displayNameUpdated: '顯示名稱已更新',
    displayNameUpdateFailed: '顯示名稱更新失敗',
    passwordUpdatedRelogin: '密碼已更新，請重新登入',
    passwordUpdateFailed: '密碼更新失敗'
  }
},

  changePassword: {
    title: "修改密碼",
    hint: "建議至少 12 碼，含大小寫、數字與符號",

    currentLabel: "目前密碼",
    newLabel: "新密碼",
    confirmLabel: "確認新密碼",

    capsOn: "⚠️ Caps Lock 已開啟",

    btnSubmit: "變更密碼",

    strengthNone: "強度：無",
    strengthLow: "強度：低",
    strengthMedium: "強度：中",
    strengthHigh: "強度：高",

    rules: {
      oldRequired: "請輸入目前密碼",
      newRequired: "請輸入新密碼",
      minLength: "至少 8 碼",
      mixTypes: "建議混合大小寫、數字與符號",
      confirmRequired: "請再次輸入新密碼",
      mismatch: "兩次輸入不一致",
    },

    messages: {
      failedCheck: "變更失敗，請確認密碼",
      updated: "密碼已更新，請重新登入",
      failedGeneric: "變更失敗，請稍後再試",
    },
  },

  // 產品列表 / 進度總覽
productsPage: {
  title: "測試計畫/報告",
  tagV2: "列表 / 進度總覽",

  // 🔍 搜尋 & 篩選
  searchPlaceholder: "搜尋：產品名稱 / 型號 / 建立者",
  filterNormalOnly: "只顯示狀態為「正常」",
  filterNormalOnlyOn: "只顯示正常狀態",
  filterNormalOnlyOff: "顯示所有狀態",
  filterIncludeDeleted: "顯示包含已刪除",
  filterNormal: "只顯示未刪除",

  // 上方按鈕
  btnReload: "重新整理",
  btnSimple: "一般",
  btnAdvanced: "進階",
  btnAdd: "新增產品",
  btnRestore: "還原",

  // 📊 表格欄位
  colIndex: "#",
  colName: "產品名稱",
  colModel: "型號",
  colTestType: "類型",
  colCreator: "建立者",
  colProgress: "測試進度",
  colTestHours: "測試工時",
  colCreatedAt: "建立時間",
  colStatus: "狀態",
  colActions: "操作",

  // 狀態標籤
  statusNormal: "正常",
  statusHidden: "隱藏",
  statusArchived: "已封存",
  statusDeleted: "已刪除",

  // 每列操作按鈕
  btnTest: "測試",
  btnEdit: "編輯",
  btnDelete: "刪除",

  // 刪除 / 還原確認
  confirmDelete: "確定要刪除產品「{name}」？",
  confirmDeleteSoft:
    "確定要將此產品標記為已刪除嗎？（可在「包含已刪除」模式下還原）",

  // ➕「新增 / 編輯產品」Dialog
  dialogNewTitle: "新增產品",
  dialogEditTitle: "編輯產品",

  fieldName: "產品名稱",
  fieldModel: "型號",
  fieldTestType: "測試類型",
  fieldDefaultTestSet: "預設測試集",

  defaultTestSetPlaceholder: "選擇預設測試集（可留空）",

  btnDialogCancel: "取消",
  btnDialogSave: "儲存",

  // 測試類型
  testTypeX86: "System (x86)",
  testTypeArm: "System (ARM)",
  testTypeDisplay: "顯示器 (Display)",
  testTypePart: "物件 (PartTest)",

  testTypeSystemShort: "System",
  testTypeX86Short: "System",
  testTypeArmShort: "System",
  testTypeDisplayShort: "Display",
  testTypePartShort: "Part",

  testTypeHintX86: "建立後「開始測試」會進入 System（x86）測試報告頁。",
  testTypeHintArm: "建立後「開始測試」會進入 System（ARM）測試報告頁。",
  testTypeHintDisplay: "建立後「開始測試」會進入顯示器測試報告頁。",
  testTypeHintPart: "建立後「開始測試」會進入硬碟/記憶體測試報告。",

  // 驗證訊息
  rules: {
    nameRequired: "請輸入產品名稱",
    modelRequired: "請輸入型號",
    testTypeRequired: "請選擇測試類型",
  },

  // 提示訊息
  message: {
    loadFailed: "產品清單載入失敗",
    saveFailed: "產品儲存失敗",
    saveSuccess: "產品已儲存",
    deleteSuccess: "產品已刪除",
    deleteFailed: "刪除產品失敗",
    restoreSuccess: "產品已還原",
    restoreFailed: "還原產品失敗",
  },
},

  // 產品測試項目頁（/products/:id/test）
  productTest: {
    // 標題 / 分頁
    title: "產品測試項目",
    tabAll: "全部",
    tabHW: "HW",
    tabReli: "Reli",
    tabStab: "Stab",
    tabPwr: "PWR",
    tabThm: "Thrm",
    tabESD: "ESD",
    tabPerf: "Perf",
    tabBIOS: "BIOS",
    tabOS: "OS",

    // 標籤 / 模式
    totalTag: "共 {count} 筆",
    modeList: "列表模式",
    modeTrash: "回收桶",

    // 上方工具列
    btnAdd: "新增測試項目",
    btnImportFromSet: "從預設測試集匯入",
    btnSaveAsSet: "儲存為預設測試集",
    btnDeleteSelected: "刪除所選",
    btnRestoreSelected: "還原所選",
    btnRestore: "還原",
    btnExportPdf: "匯出 PDF 報告",
    btnReload: "重新整理",

    searchPlaceholder: "搜尋：項目 / 代碼 / 標準 / 備註",

    // 表格欄位
    colIndex: "#",
    colCategory: "分類",
    colCode: "代碼",
    colTestCase: "測試項目",
    colTestProcedure: "測試步驟",
    colTestCriteria: "判定標準",
    colResult: "結果",
    colWorkHrs: "工時 (hr)",
    colRemark: "備註",
    colActions: "操作",

    // 結果文字
    resultPass: "通過",
    resultFail: "失敗",
    resultPending: "未完成 / 待測",
    resultNone: "未設定",
    placeholderInitialResult: "請輸入初次測試結果（選填）",

    // 確認視窗（單筆刪除）
    confirmDeleteOne: "確定要刪除這筆測試資料嗎？",

    // 「新增測試項目」Dialog
    dialogAddTitle: "新增測試項目",
    fieldCategory: "分類",
    fieldTestCase: "測試項目",
    placeholderTestCase: "請輸入測試項目",
    fieldCode: "代碼",
    placeholderCode: "例如：CPU_001",
    fieldProcedure: "測試步驟",
    placeholderProcedure: "請描述測試步驟",
    fieldCriteria: "判定標準",
    placeholderCriteria: "請描述判定標準",
    fieldRemark: "備註",
    placeholderRemark: "可填寫特殊條件、備註等",
    fieldWorkHrs: "預估工時",
    unitHour: "小時",
    fieldInitialResult: "初次測試結果",

    // 從預設測試集匯入 Dialog
    importTitle: "從預設測試集匯入",
    importSearchPlaceholder: "搜尋測試集名稱 / 說明",
    importBtnSearch: "搜尋",
    importBtnReload: "重新整理",
    importColName: "測試集名稱",
    importColDescription: "說明",
    importColCount: "案例數",
    importColCreator: "建立者",
    importBtnConfirm: "匯入所選 {count} 筆",

    // 儲存為預設測試集 Dialog
    saveTitle: "儲存為預設測試集",
    saveFieldName: "測試集名稱",
    saveFieldDescription: "說明",
    savePlaceholderDescription: "可簡要描述此測試集用途（選填）",
    saveAlertText:
      "將目前此產品下的所有測試項目，儲存為一個可重複使用的「預設測試集」。不會影響現有測試項目。",
    saveBtn: "儲存",
    defaultSetSuffix: "測試集",

    // 驗證訊息
    rules: {
      categoryRequired: "請選擇分類",
      testCaseRequired: "請輸入測試項目",
      criteriaRequired: "請輸入判定標準",
      setNameRequired: "請輸入測試集名稱",
    },

    // 提示訊息（ElMessage 用）
    message: {
      loadFailed: "載入測試項目失敗",

      exportNoProductId: "缺少產品編號，無法匯出報告",
      exportNoRows: "目前沒有測試項目，無法匯出報告",
      exportSuccess: "已匯出 PDF 報告",
      exportFailed: "匯出 PDF 失敗",

      deleteOneSuccess: "測試項目已刪除",
      deleteOneFailed: "刪除測試項目失敗",

      restoreOneSuccess: "測試項目已還原",
      restoreOneFailed: "還原測試項目失敗",

      batchDeleteConfirm: "確定刪除已勾選的 {count} 筆測試項目？",
      batchDeleteSuccess: "已刪除所選測試項目",
      batchDeleteFailed: "批次刪除失敗",

      batchRestoreConfirm: "確定還原已勾選的 {count} 筆測試項目？",
      batchRestoreSuccess: "已還原所選測試項目",
      batchRestoreFailed: "批次還原失敗",

      resultUpdated: "結果已更新",
      resultUpdateFailed: "更新結果失敗",

      addSuccess: "已新增測試項目",
      addFailed: "新增測試項目失敗",

      importLoadFailed: "載入預設測試集失敗",
      importSuccess: "已匯入 {count} 筆測試項目",
      importFailed: "匯入失敗",

      saveSetSuccess: "已儲存為預設測試集",
      saveSetFailed: "儲存預設測試集失敗",
    },
  },

  register: {
    title: "註冊帳號",
    subtitleTag: "建立新帳號",

    fieldUsername: "使用者名稱",
    fieldName: "姓名",
    fieldEmail: "電子郵件",
    fieldPassword: "密碼",

    btnSubmit: "建立帳號",
    btnBackLogin: "回到登入頁",

    rules: {
      usernameRequired: "請輸入使用者名稱",
      nameRequired: "請輸入姓名",
      emailRequired: "請輸入電子郵件",
      emailFormat: "電子郵件格式不正確",
      passwordRequired: "請輸入密碼",
      passwordMin: "密碼至少 8 碼",
    },

    message: {
      success: "帳號建立成功，請使用新帳號登入",
      failedWithStatus: "註冊失敗（{status}）",
      failedDefault: "註冊失敗，請稍後再試",
      networkError: "無法連線到 API，請確認後端服務與 Proxy 設定",
    },
  },

  dashboard: {
    headerTitle: "歡迎使用",
    headerTag: "Dashboard",

    sizeCompact: "緊湊",
    sizeDefault: "一般",
    sizeComfortable: "寬鬆",

    autoRefreshOn: "自動刷新",
    autoRefreshOff: "手動",
    refreshTitle: "按 R 也可刷新",
    btnRefresh: "重新整理",

    greetingLateNight: "晚安",
    greetingMorning: "早安",
    greetingNoon: "午安",
    greetingAfternoon: "下午好",
    greetingEvening: "晚上好",
    guestNoticeTitle: "目前為遊客模式",
    guestNoticeDesc:
      "您只能瀏覽部分資訊，如需更多操作權限請聯絡系統管理員。",

    quickNav: "快速導覽",
    btnProducts: "NPDP",
    statRequests: "需求單",
    statSupport: "支援",
    btnMachines: "機台",
    btnFeedback: "回饋",
    btnDefaultSets: "預設測試集",
    btnLogs: "日誌",
    btnUsers: "使用者管理",

    overviewTitle: "系統概覽",
    statProducts: "NPDP",
    statMachines: "機台",
    statSuggestions: "回饋",

    adminSummaryTitle: "統計總覽",
    adminSummaryHint:
      "簡化顯示目前機台使用率與 DQA 測試容量，詳細資料請至各功能頁查看。",

    userPlanTitle: "使用者方案統計",
    userPlanTotalPlans: "總方案數",
    userPlanTotalHours: "總工作量",
    userPlanTotalWork: "總工作量",
    userPlanTopUsers: "依總工作量排序的前幾名使用者",
    userPlanColUser: "使用者",
    userPlanColPlans: "產品 / 方案",
    userPlanColHours: "總工作量",
    userPlanColDemand: "測試需求單",
    userPlanColSupport: "測試支援",
    userPlanColWork: "總工作量",
    userPlanEmpty: "目前沒有使用者工作量資料",

    machineCapacityTitle: "機台可工作容量",
    machineCapacityTotalMachines: "機台總數",
    machineCapacityUsedHours: "已排程工時",
    machineCapacityFreeHours: "剩餘可用工時",
    machineCapacityTopMachines: "可用容量較高的機台",
    machineCapacityColMachine: "機台",
    machineCapacityColModel: "型號 / 代號",
    machineCapacityColFreeHours: "可用工時",
    machineCapacityEmpty: "目前沒有機台容量資料",

    blocks: {
      chamber15TableTitle: "各常溫台容量明細（Chamber 1~5）",
      reliabilityTitle: "總容量使用率（Chamber 1~5）",
      userWorkTitle: "所有使用者工作量（長條圖）",
      dqaTitle: "DQA 測試容量",

      table: {
        colIndex: "#",
        colChamber: "Chamber",
        chamberPrefix: "Chamber",
        colMachineName: "機台名稱",
        colMachineModel: "機台型號",
        colTemp: "目前溫度(°C)",
        colMaxSlots: "名目 DUT 容量",
        colUsedSlots: "目前佔用",
        colFreeSlots: "剩餘可用",
        colUtil: "使用率",
      },

      reliabilityTotal: "名目 DUT 容量：{total}",
      reliabilityUsedRemain: "已佔用：{used}，剩餘：{remain}",
      reliabilityNote: "※ 溫度小於 {temp}°C 且有排程視為佔比 100%",

      dqaCapacity: "DQA 測試容量：{percent}%",
      dqaRatio: "（總容量數佔比 {work}/{cap}）",

      dqaChart: {
        used: "已使用",
        remaining: "剩餘容量",
        noData: "無資料",
        na: "N/A",
      },
    },
  },

defaultTestSets: {
  title: '預設測試集',
  totalTag: '共 {total} 筆',
  searchPlaceholder: '搜尋：名稱 / 說明',
  mine: '只看我的',
  includeDeleted: '包含已刪除',
  empty: '目前沒有資料',
  labels: {
    total: '總數',
    deleted: '已刪除'
  },
  actions: {
    refresh: '重新整理',
    view: '檢視',
    delete: '刪除',
    close: '關閉'
  },
  columns: {
    id: 'ID',
    name: '測試集名稱',
    description: '說明',
    fromProduct: '來源產品',
    updatedAt: '更新時間',
    actions: '操作'
  },
  messages: {
    fetchFailed: '載入預設測試集失敗',
    deleteFailed: '刪除預設測試集失敗',
    deleteSuccess: '刪除成功'
  },
  delete: {
    title: '刪除確認',
    confirm: '確定要刪除預設測試集 #{id} 嗎？'
  },
  detail: {
    title: '預設測試集內容',
    fallbackName: '未命名測試集',
    itemsTag: '共 {n} 項',
    searchPlaceholder: '搜尋：分類 / 區段 / 代碼 / 測試項目',
    loadFailed: '載入預設測試集明細失敗',
    tip: '可用搜尋與啟用狀態篩選查看此測試集內容。',
    filters: {
      all: '全部',
      planned: '已啟用',
      unplanned: '未啟用'
    },
    columns: {
      category: '分類',
      section: '區段',
      code: '代碼',
      testCase: '測試項目',
      planned: '啟用'
    }
  }
},

  emsLab: {
    title: "EMS 實驗室",
    subtitle: "實驗室排程",

    datePickerPlaceholder: "選擇日期",
    filteredAlert: "已篩選日期：{date} 的排程",

    cardTitleWithDate: "{date} 的排程",
    cardTitleNoDate: "未選擇日期的排程",

    btnRefresh: "重新整理",
    btnNewSchedule: "新增排程",

    emptyDescription: "目前此日期沒有排程",

    table: {
      index: "#",
      date: "日期",
      time: "時間",
      purpose: "用途說明",
      remark: "備註",
      createdAt: "建立時間",
      status: "狀態",
    },

    dialogTitle: "新增 EMS 排程",
    fieldDate: "日期",
    fieldTimeRange: "時間區間",
    fieldQuickRange: "快速區間",
    fieldPurpose: "用途說明",
    fieldRemark: "備註",

    timeStartPlaceholder: "開始時間",
    timeEndPlaceholder: "結束時間",

    quickRanges: {
      morning: "上午 (09:00–12:00)",
      afternoon: "下午 (13:30–17:30)",
      full: "整天 (09:00–17:30)",
    },

    placeholderPurpose: "例如：EMS 測試、靜電/浪湧等…",
    placeholderRemark: "其它需求或注意事項（選填）",

    btnSave: "儲存排程",
    btnCancel: "取消",

    message: {
      needDate: "請選擇日期",
      needTimeRange: "請選擇時間區間",
      timeInvalid: "結束時間必須晚於開始時間",
      needPurpose: "請填寫用途說明",
      loadFailed: "無法取得排程資料",
      createSuccess: "已新增排程",
      createFailed: "新增排程失敗",
    },

    statusText: {
      pending: "待審核",
      approved: "已核准",
      rejected: "已駁回",
      canceled: "已取消",
      finished: "已完成",
    },
  },

  emcSiLab: {
    headerTitle: "EMC & SI 實驗室",
    headerTag: "實驗室排程",

    datePlaceholder: "選擇日期",
    btnNewSchedule: "新增排程",

    filterAlert: "已篩選日期：{date} 的排程",
    scheduleTitle: "{date} 的排程",
    noDateSelected: "未選擇日期",

    btnReload: "重新整理",
    emptyDescription: "目前此日期沒有排程",

    colIndex: "#",
    colDate: "日期",
    colTime: "時間",
    colPurpose: "用途說明",
    colRemark: "備註",
    colCreatedAt: "建立時間",
    colStatus: "狀態",

    dialogTitleNew: "新增 EMC & SI 排程",

    fieldDate: "日期",
    fieldTimeRange: "時間區間",
    fieldQuickRange: "快速區間",
    fieldPurpose: "用途說明",
    fieldRemark: "備註",

    timeStartPlaceholder: "開始時間",
    timeEndPlaceholder: "結束時間",

    quickMorning: "上午 (09:00–12:00)",
    quickAfternoon: "下午 (13:30–17:30)",
    quickFullDay: "整天 (09:00–17:30)",

    purposePlaceholder: "例如：EMI 測試、SI 測試等…",
    remarkPlaceholder: "其它需求或注意事項（選填）",

    btnSave: "儲存排程",

    validation: {
      dateRequired: "請選擇日期",
      timeRangeRequired: "請選擇時間區間",
      timeOrder: "結束時間必須晚於開始時間",
      purposeRequired: "請填寫用途說明",
    },

    status: {
      pending: "待審核",
      approved: "已核准",
      rejected: "已駁回",
      canceled: "已取消",
      finished: "已完成",
    },

    message: {
      loadFailed: "無法取得排程資料",
      createSuccess: "已新增排程",
      createFailed: "新增排程失敗",
    },
  },

files: {
  title: "檔案中心",
  totalTag: "共 {total} 筆",
  searchPlaceholder: "搜尋檔名 / 顯示名…",
  categoryAll: "全部分類",
  root: "根目錄",

  uploadCategoryPlaceholder: "上傳分類",
  uploadTip: "可多選；支援拖曳上傳",
  uploadDragText1: "將檔案拖曳到此處，或",
  uploadDragText2: "點擊選擇檔案",

  uploading: "上傳中…",
  replacing: "替換中…",

  readonly: "只讀",

  colName: "名稱",
  colCategory: "分類",
  colSize: "大小",
  colActions: "操作",

  btnNewFolder: "新增資料夾",
  btnBulkDelete: "批次刪除",
  btnMaintenance: "維護",
  btnPurgeOrphan: "清理孤兒檔案（磁碟）",
  btnPurgeLegacy: "清理舊 isDeleted=true（DB 遺留）",

  btnOpenFolder: "開啟",
  btnRename: "修改/改名",
  btnReplace: "替換",
  btnDownload: "下載",
  btnDelete: "刪除",

  renameDialogTitle: "修改名稱/分類",
  newFolderDialogTitle: "新增資料夾",

  fieldDisplayName: "顯示名稱",
  displayNamePlaceholder: "輸入顯示名稱（留空則使用原始檔名）",
  fieldCategory: "分類",

  fieldFolderName: "資料夾名稱",
  folderNamePlaceholder: "輸入資料夾名稱",

  categories: {
    general: "一般",
    sop: "SOP",
    report: "Report",
    machine: "Machine",
    image: "Image",
    dataset: "Dataset",
    other: "Other",
    os: "OS",
    driver: "Driver",
    firmware: "Firmware",
    cert: "認證",
  },

  message: {
    loadFailed: "載入失敗",
    uploadSuccess: "上傳成功",
    uploadFailed: "上傳失敗",
    downloadFailed: "下載失敗",
    updateSuccess: "更新成功",
    updateFailed: "更新失敗",
    replaceSuccess: "替換成功",
    replaceFailed: "替換失敗",
    deleteSuccess: "刪除成功",
    deleteFailed: "刪除失敗",
    noPermission: "只有上傳者或管理員可以操作",
    folderNameRequired: "請輸入資料夾名稱",
    createFolderSuccess: "資料夾已建立",
    createFolderFailed: "建立資料夾失敗",
  },

  confirm: {
    titleSingle: "確認刪除",
    titleMultiple: "確認刪除",
    deleteSingle: "確定要刪除「{name}」？",
    deleteMultiple: "確定要刪除 {count} 個項目？",
  },
},


  forgotPassword: {
    title: "重設密碼",
    subtitle: "Set New Password",

    tokenMissingAlert:
      "找不到重設 Token，請確認是否從 Email 連結進來，或手動貼上 Token。",

    fieldToken: "Token",
    fieldNewPassword: "新密碼",
    fieldConfirm: "再次確認",

    tokenPlaceholder: "?token= 後面的字串，或直接從連結進入會自動帶入",

    ruleTokenRequired: "缺少重設 Token",
    rulePasswordRequired: "請輸入新密碼",
    rulePasswordMin: "至少 8 碼",
    ruleConfirmRequired: "請再次輸入新密碼",
    ruleConfirmMismatch: "兩次輸入不一致",

    strengthText: {
      weak: "強度：低",
      medium: "強度：中",
      strong: "強度：高",
    },

    btnSubmit: "設定新密碼",
    btnBackLogin: "回登入",

    messageSuccess: "密碼已更新，請重新登入",
    messageFailed: "重設失敗",
  },

  ikLab: {
    title: "IK 實驗室",
    subtitle: "實驗室排程",

    datePickerPlaceholder: "選擇日期",
    filteredAlert: "已篩選日期：{date} 的排程",

    cardTitleWithDate: "{date} 的排程",
    cardTitleNoDate: "未選擇日期的排程",

    btnRefresh: "重新整理",
    btnNewSchedule: "新增排程",

    emptyDescription: "目前此日期沒有排程",

    table: {
      index: "#",
      date: "日期",
      time: "時間",
      purpose: "用途說明",
      remark: "備註",
      createdAt: "建立時間",
      status: "狀態",
    },

    dialogTitle: "新增 IK 排程",
    fieldDate: "日期",
    fieldTimeRange: "時間區間",
    fieldQuickRange: "快速區間",
    fieldPurpose: "用途說明",
    fieldRemark: "備註",

    timeStartPlaceholder: "開始時間",
    timeEndPlaceholder: "結束時間",

    quickRanges: {
      morning: "上午 (09:00–12:00)",
      afternoon: "下午 (13:30–17:30)",
      full: "整天 (09:00–17:30)",
    },

    placeholderPurpose: "例如：IK07 衝擊測試、IK08 防撞測試等…",
    placeholderRemark: "其它需求或注意事項（選填）",

    btnSave: "儲存排程",
    btnCancel: "取消",

    message: {
      needDate: "請選擇日期",
      needTimeRange: "請選擇時間區間",
      timeInvalid: "結束時間必須晚於開始時間",
      needPurpose: "請填寫用途說明",
      loadFailed: "無法取得排程資料",
      createSuccess: "已新增排程",
      createFailed: "新增排程失敗",
    },

    statusText: {
      pending: "待審核",
      approved: "已核准",
      rejected: "已駁回",
      canceled: "已取消",
      finished: "已完成",
    },
  },

  ipLab: {
    title: "IP 實驗室",
    subtitle: "實驗室排程",

    datePickerPlaceholder: "選擇日期",
    filteredAlert: "已篩選日期：{date} 的排程",

    cardTitleWithDate: "{date} 的排程",
    cardTitleNoDate: "未選擇日期的排程",

    btnRefresh: "重新整理",
    btnNewSchedule: "新增排程",

    emptyDescription: "目前此日期沒有排程",

    table: {
      index: "#",
      date: "日期",
      time: "時間",
      purpose: "用途說明",
      remark: "備註",
      createdAt: "建立時間",
      status: "狀態",
    },

    dialogTitle: "新增 IP 排程",
    fieldDate: "日期",
    fieldTimeRange: "時間區間",
    fieldQuickRange: "快速區間",
    fieldPurpose: "用途說明",
    fieldRemark: "備註",

    timeStartPlaceholder: "開始時間",
    timeEndPlaceholder: "結束時間",

    quickRanges: {
      morning: "上午 (09:00–12:00)",
      afternoon: "下午 (13:30–17:30)",
      full: "整天 (09:00–17:30)",
    },

    placeholderPurpose: "例如：IPX5 噴水測試、IPX6K 高壓沖水等…",
    placeholderRemark: "其它需求或注意事項（選填）",

    btnSave: "儲存排程",
    btnCancel: "取消",

    message: {
      needDate: "請選擇日期",
      needTimeRange: "請選擇時間區間",
      timeInvalid: "結束時間必須晚於開始時間",
      needPurpose: "請填寫用途說明",
      loadFailed: "無法取得排程資料",
      createSuccess: "已新增排程",
      createFailed: "新增排程失敗",
    },

    statusText: {
      pending: "待審核",
      approved: "已核准",
      rejected: "已駁回",
      canceled: "已取消",
      finished: "已完成",
    },
  },

  login: {
    title: "測試系統",
    welcomeTag: "Welcome",
    tooltipTheme: "切換主題",

    langPlaceholder: "選擇語言",

    capsLockOn: "Caps Lock 已開啟",

    fieldUsername: "帳號",
    fieldPassword: "密碼",
    rememberMe: "記住我",
    btnLogin: "登入",
    linkRegister: "建立帳號",
    linkForgot: "重設密碼",

    apiLabel: "API：",

    ruleUsernameRequired: "請輸入帳號",
    rulePasswordRequired: "請輸入密碼",

    message: {
      success: "歡迎回來！",
      failedWithStatus: "登入失敗（{status}）",
      failedDefault: "登入失敗",
      networkError: "無法連線到 API，請檢查後端埠號與 Vite 代理設定",
    },
  },

  logs: {
    title: "系統日誌",
    subtitle: "審計追蹤",

    filterActionPlaceholder: "動作",
    filterKeywordPlaceholder: "關鍵字",
    rangeStartPlaceholder: "開始",
    rangeEndPlaceholder: "結束",

    actionCreate: "CREATE",
    actionUpdate: "UPDATE",
    actionDelete: "DELETE",
    actionLogin: "LOGIN",
    actionRegister: "REGISTER",

    shortcutToday: "今天",
    shortcut7Days: "近 7 天",
    shortcut30Days: "近 30 天",

    colTime: "時間",
    colUser: "使用者",
    colAction: "動作",
    colTarget: "目標",
    colDetail: "詳細",

    targetEmpty: "-",

    btnReload: "重新整理",
    fetchFailed: "載入失敗",
  },

  machineDashboard: {
    title: "機台總覽",
    tagRealtime: "即時",
    fieldUser: "使用者",
    searchPlaceholder: "搜尋機台名稱",
    btnReload: "重新整理",

    colProgress: "目前進度",
    fieldSchedule: "排程",
    fieldStatus: "狀態",
    fieldStart: "開始",
    fieldEnd: "結束",

    btnDetail: "詳細",
    btnNewSchedule: "新增排程",
    btnStart: "開始",
    btnStop: "停止",

    statusIdle: "待機",
    statusRunning: "執行中",
    statusStopped: "已停止",
    statusMaintenance: "維護中",
    statusError: "錯誤",

    phaseRunning: "進行中",
    phaseUpcoming: "即將開始",
    phaseNone: "-",

    fetchFailed: "載入失敗",
    opSuccess: "已送出",
    opFailed: "操作失敗",
    fieldTemp: "溫度",
    fieldHumidity: "溼度",

    previewLoadFailed: "圖片載入失敗",
    previewEmpty: "未設定預覽圖",
    previewPick: "從檔案中心選取",
    previewClear: "清除預覽圖",

    previewDialogTitle: "選擇「{name}」的預覽圖",
    previewDialogTitleGeneric: "選擇預覽圖",
    previewSearchPlaceholder: "搜尋圖片檔名…",
    previewCategoryPlaceholder: "分類（可選）",
    previewNoImages: "沒有符合條件的圖片檔案",
    previewApplyToMachine: "套用到機台",

    previewCatAll: "全部",
    previewCatMachine: "Machine（機台）",
    previewCatImage: "Image（圖片）",
    previewCatGeneral: "general（一般）",

    previewFetchFilesFailed: "讀取檔案中心失敗",
    previewUpdated: "已更新預覽圖",
    previewUpdateFailed: "更新預覽圖失敗",
    previewCleared: "已清除預覽圖",
    previewClearFailed: "清除預覽圖失敗",
  },

  machineDetail: {
    title: "機台詳細",
    back: "返回",
    tagScheduleControl: "排程控制中",
    btnRefresh: "重新整理",
    btnStart: "開始",
    btnStop: "停止",

    fieldName: "名稱",
    fieldSchedule: "排程",
    fieldStatus: "狀態",
    fieldStart: "開始",
    fieldEnd: "結束",
    fieldProgress: "進度",
    fieldTemp: "溫度",
    fieldHumidity: "濕度",
    fieldRuntimeMinutes: "執行分鐘",
    fieldLiveProgress: "即時進度",
    unitMinutes: "分",
    updatedAtPrefix: "更新：",

    scheduleListTitle: "排程列表",
    colSchedule: "排程",
    colScheduleStatus: "狀態",
    colScheduleProgress: "進度",
    colScheduleStart: "開始",
    colScheduleEnd: "結束",

    statusIdle: "待機",
    statusRunning: "執行中",
    statusStopped: "已停止",
    statusMaintenance: "維護中",
    statusError: "錯誤",

    phaseRunning: "進行中",
    phaseUpcoming: "即將開始",
    phaseNone: "-",

    scheduleStatusScheduled: "已排程",
    scheduleStatusRunning: "執行中",
    scheduleStatusCompleted: "已完成",
    scheduleStatusCanceled: "已取消",
    scheduleStatusError: "錯誤",
    scheduleStatusFailed: "失敗",

    lockedHint: "此機台目前由排程控制，請在排程頁調整或取消排程",
    loadFailed: "載入失敗",
    opSuccess: "已送出",
    opFailed: "操作失敗",
    btnSetpoint: "調整溫度/濕度",
    setpointTitle: "調整機台溫濕度",
    setpointTemp: "目標溫度",
    setpointHum: "目標濕度",
    btnApplySetpoint: "套用",
    btnClearHumidity: "清除",
    setpointHint:
      "送出後會更新 setpoint（目前可先寫入 DB；若已串接 chamberControl，會嘗試下發到機台）。",
    setpointSuccess: "已送出設定值",
    setpointFail: "設定失敗",

    fieldTargetTemp: "目標溫度",
    fieldTargetHumidity: "目標濕度",
    setpointAtPrefix: "Setpoint 更新時間：",

    setpointTempInvalid: "請輸入正確的溫度",
    setpointTempOutOfRange: "溫度超出範圍 (-80 ~ 250°C)",
    setpointHumInvalid: "請輸入正確的溼度",
    setpointHumOutOfRange: "溼度超出範圍 (0 ~ 100%)",
  },

  machineSchedule: {
    title: "機台測試排程",
    headerTag: "建立 / 管理",

    cardNewTitle: "新增排程",
    cardListTitle: "排程列表",

    fieldMachine: "機台",
    fieldTestName: "測試名稱",
    fieldTimeRange: "時間",
    fieldUser: "使用者",
    fieldUserPlaceholder: "請輸入使用者",

    btnCreate: "建立",

    colMachine: "機台",
    colTestName: "測試",
    colUser: "使用者",
    colStatus: "狀態",
    colStart: "開始",
    colEnd: "結束",
    colActions: "操作",

    dlgEditTitle: "編輯排程",
    fieldStatus: "狀態",

    status: {
      pending: "待執行",
      running: "執行中",
      completed: "已完成",
      canceled: "已取消",
    },

    confirmDelete: "刪除此排程？",

    message: {
      loadFailed: "載入排程失敗",
      needFullForm: "請完整填寫資料（機台 / 測試名稱 / 使用者 / 時間）",
      createSuccess: "已建立排程",
      createFailed: "建立排程失敗",
      updateSuccess: "已更新排程",
      updateFailed: "儲存排程失敗",
      startSuccess: "已開始",
      stopSuccess: "已停止",
      opFailed: "操作失敗",
      deleteSuccess: "已刪除排程",
      deleteFailed: "刪除排程失敗",
    },
  },

  machineTest: {
    title: "機台測試排程",
    tag: "建立 / 管理",
    cardCreateTitle: "新增排程",

    form: {
      machine: "機台",
      machinePlaceholder: "請選擇機台",

      testProject: "測試專案",
      testProjectPlaceholder: "請輸入測試專案",

      testName: "測試項目",
      testNamePlaceholder: "請選擇測試項目",

      user: "使用者",
      userPlaceholder: "請選擇使用者",
      time: "時間區間",
      submit: "建立",
    },

    listTitle: "排程列表",

    table: {
      machine: "機台",
      project: "測試專案",
      test: "測試項目",
      user: "使用者",
      status: "狀態",
      start: "開始時間",
      end: "結束時間",
      actions: "操作",
    },

    action: {
      edit: "編輯",
      start: "開始",
      stop: "停止",
      delete: "刪除",
      deleteConfirm: "確定要刪除此排程嗎？",
    },

    dialog: {
      editTitle: "編輯排程",
      statusLabel: "狀態",
    },

    rangeShortcut: {
      today: "今天上班時間",
      tomorrow: "明天上班時間",
    },

    msg: {
      fillAll:
        "請將表單填寫完整（含機台 / 測試專案 / 測試項目 / 使用者 / 時間）",
      loadMachinesFail: "載入機台清單失敗",
      loadSchedulesFail: "載入排程清單失敗",
      loadUsersFail: "載入使用者列表失敗",

      createSuccess: "建立排程成功",
      createFail: "建立排程失敗",
      updateSuccess: "更新排程成功",
      updateFail: "更新排程失敗",
      deleteSuccess: "刪除排程成功",
      deleteFail: "刪除排程失敗",
      opFail: "操作失敗",
      startSuccess: "已送出開始指令",
      stopSuccess: "已送出停止指令",

      customTestItemTitle: "自訂測試項目",
      customTestItemMessage: "請輸入自訂測試項目：",
      customTestItemError: "測試項目不可為空",
    },
  },

  suggestion: {
    title: "意見回饋",
    headerRecentCount: "最近 {count} 筆",
    btnViewAll: "查看全部紀錄 »",

    formTitle: "新增一則建議",
    formThanks: "感謝您的回饋 🙌",

    fieldTitle: "標題",
    fieldPriority: "優先度",
    fieldContent: "內容",

    placeholderTitle: "簡要說明（例如：產品測試頁資訊過於擁擠）",
    placeholderContent:
      "請描述需求、重現步驟或期望行為（可附上螢幕截圖說明）",

    priority: {
      P1: "高 (P1)",
      P2: "中 (P2)",
      P3: "低 (P3)",
      unknown: "未知 ({value})",
    },

    status: {
      pending: "待處理",
      inProgress: "處理中",
      closed: "已處理",
    },

    btnSubmit: "送出",
    btnReset: "清除",

    rightTitle: "我最近的建議",
    btnReload: "重新整理",
    empty: "目前沒有建議紀錄",

    adminReplyPrefix: "管理員回覆：",
    adminPendingReply: "尚未回覆",

    rules: {
      titleRequired: "請輸入標題",
      contentRequired: "請輸入內容",
    },

    message: {
      sent: "已送出建議，感謝您的回饋！",
      sendFailed: "送出失敗",
      loadFailed: "無法取得我的建議",
    },
  },

  suggestionMine: {
    title: "我的建議清單",
    tagList: "列表",

    filterStatusPlaceholder: "狀態",
    searchPlaceholder: "搜尋標題 / 內容",
    btnReload: "重新整理",

    colIndex: "#",
    colTitle: "標題",
    colPriority: "優先",
    colStatus: "狀態",
    colCreatedAt: "建立於",
    colActions: "操作",

    confirmDelete: "刪除此建議？",

    status: {
      pending: "待處理",
      reviewed: "已審閱",
      resolved: "已結案",
    },

    priority: {
      P1: "高 (P1)",
      P2: "中 (P2)",
      P3: "低 (P3)",
    },

    message: {
      loadFailed: "載入失敗",
      loadFailedNetwork: "無法連線 API，請檢查後端",
      deleteSuccess: "已刪除",
      deleteFailed: "刪除失敗",
    },
  },

  suggestionsMgmt: {
    title: "🗂️ 建議管理",
    tagAdmin: "Admin",

    filterStatus: "狀態",
    filterPriority: "優先",
    filterKeywordPlaceholder: "搜尋標題 / 內容 / 使用者",

    colTitle: "標題",
    colPriority: "優先",
    colStatus: "狀態",
    colOwner: "提案者",
    colCreatedAt: "建立於",

    dlgEditTitle: "編輯建議",
    fieldTitle: "標題",
    fieldPriority: "優先度",
    fieldStatus: "狀態",
    fieldContent: "內容",
    fieldReply: "回覆",

    btnMarkReviewed: "標記已審閱",
    btnMarkResolved: "標記已結案",

    status: {
      pending: "待處理",
      reviewed: "已審閱 / 處理中",
      resolved: "已結案",
    },

    confirmDeleteOne: "刪除此建議？",

    message: {
      loadFailed: "載入失敗",
      updateSuccess: "已更新",
      updateFailed: "更新失敗",
      saveSuccess: "已儲存",
      saveFailed: "儲存失敗",
      deleteSuccess: "已刪除",
      deleteFailed: "刪除失敗",
      bulkSuccess: "批次完成",
      bulkFailed: "批次失敗",
      invalidStatus: "狀態值無效",
      networkError: "無法連線 API，請檢查後端",
    },
  },

  testRequests: {
    title: "測試需求單",
    subtitle:
      "讓專案窗口填寫目前有哪些測試需求，方便實驗室掌握工作量",

    actions: {
      refresh: "重新整理",
      create: "新增測試需求",
      applyFilters: "套用篩選",
      clearFilters: "清除",
      save: "儲存",
      cancel: "取消",
      edit: "編輯",
      delete: "刪除",
      confirmDeleteTitle: "刪除確認",
      confirmDeleteMessage: "確認要刪除「{title}」這筆測試需求嗎？",
    },

    summary: {
      total: "總需求數",
      pending: "待安排",
      inProgress: "測試中",
      completed: "已完成",
    },

    filters: {
      keywordLabel: "關鍵字",
      keywordPlaceholder: "依 需求主題 / 產品型號 / 建立人 搜尋",
      statusLabel: "狀態",
      statusPlaceholder: "全部狀態",
      dateLabel: "預計開始日",
    },

    columns: {
      requestNo: "需求單號",
      title: "需求主題",
      productName: "產品 / 型號",
      category: "測試類別",
      testItemCount: "預估測試項目數",
      sampleQty: "樣品數量",
      priority: "優先順序",
      expectedStart: "預計開始",
      expectedEnd: "預計完成",
      status: "狀態",
      assignee: "負責人",
      createdBy: "建立人",
      createdAt: "建立時間",
      actions: "操作",
    },

    footer: {
      total: "目前共 {count} 筆測試需求",
    },

    dialog: {
      createTitle: "新增測試需求單",
      editTitle: "編輯測試需求單",
      fields: {
        title: "需求主題",
        productName: "產品 / 型號",
        category: "測試類別",
        testItemCount: "預估測試項目數",
        sampleQty: "樣品數量",
        priority: "優先順序",
        dateRange: "預計期間",
        status: "狀態",
        assignee: "負責人",
        remark: "備註",
      },
      placeholders: {
        title: "例如：ARCHMI-U-816CP 新機測試需求",
        productName: "例如：ARCHMI-U-816CP / 自填型號",
        remark:
          "可描述測試背景、特殊條件（客規、溫溼度範圍、規範依據…）",
      },
      dateRangeSeparator: "至",
      dateStartPlaceholder: "開始日期",
      dateEndPlaceholder: "完成日期",
      categoryPlaceholder: "請選擇",
      statusPlaceholder: "請選擇",
      assigneePlaceholder: "未指派",
    },

    category: {
      HW: "硬體功能",
      RELI: "可靠度 (Reliability)",
      STAB: "穩定度 (Stability)",
      PWR: "功耗 (Power)",
      THERM: "熱像 / 熱分佈 (Thermal)",
      ESD: "靜電放電 (ESD)",
      MECH: "機構保護 (Mechanical)",
      OTHER: "其他",
    },

    status: {
      pending: "待安排",
      in_progress: "測試中",
      completed: "已完成",
      cancelled: "已取消",
    },

    priority: {
      low: "低",
      medium: "中",
      high: "高",
    },

    messages: {
      fetchFailed: "取得測試需求單列表失敗",
      saveSuccess: "測試需求單已儲存",
      saveFailed: "儲存測試需求單失敗",
      deleteSuccess: "已刪除測試需求單",
      deleteFailed: "刪除測試需求單失敗",
    },

    validation: {
      titleRequired: "請輸入需求主題",
      productNameRequired: "請輸入產品 / 型號",
      categoryRequired: "請選擇測試類別",
      testItemCountRequired: "請輸入預估測試項目數",
      sampleQtyRequired: "請輸入樣品數量",
      statusRequired: "請選擇狀態",
    },
  },

  defaultTestSetItems: {
    title: "預設測試集",

    actions: {
      search: "搜尋",
      new: "新增",
      refresh: "重新整理",
      save: "儲存",
      cancel: "取消",
      edit: "編輯",
      delete: "刪除",
    },

    tableSize: {
      compact: "緊湊",
      default: "一般",
      comfortable: "寬鬆",
    },

    search: {
      placeholder: "搜尋：分類 / 代碼 / 測試項目",
    },

    table: {
      empty: "目前沒有資料",
      columns: {
        index: "#",
        category: "分類",
        code: "代碼",
        testCase: "測試項目",
        testProcedure: "步驟",
        testCriteria: "判定",
        creator: "建立者",
        createdAt: "時間",
        actions: "操作",
      },
    },

    dialog: {
      createTitle: "新增預設測試項目",
      editTitle: "編輯預設測試項目",
      fields: {
        category: "分類",
        code: "代碼",
        testCase: "測試項目",
        testProcedure: "步驟",
        testCriteria: "判定",
      },
      placeholders: {
        category: "如：HW / Reli / ESD …",
        code: "如：CPU_001",
        testCase: "請輸入測試項目",
      },
      deleteConfirmTitle: "刪除確認",
      deleteConfirmMessage: "確定刪除「{name}」？",
    },

    messages: {
      loadFailed: "預設測試集載入失敗",
      saveSuccess: "已儲存預設測試項目",
      saveFailed: "儲存失敗",
      deleteSuccess: "已刪除預設測試項目",
      deleteFailed: "刪除失敗",
    },
  },

  testSupport: {
    title: "測試支援填寫",
    subtitle:
      "用來紀錄「支援其他專案 / 部門」的測試內容與工時，方便後續統計與查詢",

    header: {
      refresh: "重新整理",
    },

    form: {
      title: "新增支援測試紀錄",
      hint: "例如：協助可靠度室、業務專案、客訴分析等測試",

      fields: {
        supportDate: "支援日期",
        supportDatePlaceholder: "選擇日期",

        requesterDept: "需求單位",
        requesterDeptPlaceholder: "例如：可靠度室 / 客服部 / 專案 A Team",

        requester: "需求人員",
        requesterPlaceholder: "可填寫聯絡窗口姓名",

        supporter: "支援人員",
        supporterPlaceholder: "選擇支援人員",

        projectName: "專案 / 產品",
        projectNamePlaceholder: "例如：ARCHMI-U-816CP / 客訴案件編號",

        testType: "支援類型",
        testTypePlaceholder: "選擇類型",

        relatedNo: "相關編號",
        relatedNoPlaceholder: "例如：測試單號 / 客訴單號 / 內部追蹤編號",

        testContent: "支援內容",
        testContentPlaceholder:
          "請簡要描述做了哪些測試、使用哪些工具、是否有發現問題等",

        hours: "支援工時 (hr)",

        status: "狀態",

        note: "備註",
        notePlaceholder: "可備註特殊狀況、待追蹤事項等",
      },

      testTypeOptions: {
        system: "系統功能測試",
        reli: "可靠度 / 環境測試",
        rma: "客訴分析 / RMA",
        cert: "驗證 / 認證相關",
        other: "其他",
      },

      statusOptions: {
        done: "已完成",
        doing: "進行中",
        pending: "暫緩 / 等資料",
      },

      actions: {
        submit: "新增支援紀錄",
        reset: "清空重填",
      },
    },

    rules: {
      supportDateRequired: "請選擇支援日期",
      requesterDeptRequired: "請填寫需求單位",
      supporterRequired: "請選擇支援人員",
      projectNameRequired: "請填寫專案 / 產品名稱",
      testContentRequired: "請描述支援測試內容",
      hoursRequired: "請填寫支援工時",
      hoursMin: "工時需大於 0",
      statusRequired: "請選擇狀態",
    },

    list: {
      title: "最近支援紀錄",
      hint: "顯示最近一段時間的支援測試，後續可再加條件查詢 / 匯出",

      summary: {
        count: "筆數：{count} 筆",
        totalHours: " · 總工時：約 {hours} 小時",
      },

      table: {
        empty: "目前尚無支援紀錄，可從左邊新增",

        columns: {
          date: "日期",
          requesterDept: "需求單位",
          projectName: "專案 / 產品",
          testContent: "支援內容",
          hours: "工時",
          status: "狀態",
          supporterName: "支援人員",
          actions: "操作",
        },

        actions: {
          edit: "編輯",
        },
      },
    },

    editDialog: {
      title: "編輯支援人員 / 狀態",
      fields: {
        supporter: "支援人員",
        status: "狀態",
      },
      actions: {
        cancel: "取消",
        save: "儲存",
      },
    },

    messages: {
      unauthorized: "登入已過期或權限不足，請重新登入",
      networkError: "網路連線異常，請稍後再試",
      createSuccess: "已新增支援測試紀錄",
      createFailed: "新增支援紀錄失敗，請稍後再試或聯絡管理員",

      updateNoPermission: "只有管理員可以編輯支援人員與狀態",
      updateSuccess: "已更新支援紀錄",
      updateFailed: "更新支援紀錄失敗，請稍後再試",

      loadUsersFailed: "載入支援人員清單失敗",
      loadSupportFailed: "載入支援紀錄失敗",
    },
  },

userAdmin: {
  title: "使用者管理",
  tag: { admin: "Admin" },
  search: { placeholder: "搜尋使用者 / Email" },
  actions: {
    refresh: "重新整理",
    create: "新增",
  },
  table: {
    columns: {
      username: "帳號",
      name: "名稱",
      email: "Email",
      role: "角色",
      includeInStats: "是否納入統計",
      workCapacity: "工作容量",
      createdAt: "建立於",
      actions: "操作",
    },
    includeInStatsYes: "是",
    includeInStatsNo: "否",
    resetPassword: "重設密碼",
    edit: "編輯",
    delete: "刪除",
    pop: {
      // ✅ 改成固定 8 個 0
      resetConfirm: "確定將密碼重設為 00000000？",
      deleteConfirm: "刪除此帳號？",
    },
  },
  dialog: {
    createTitle: "新增使用者",
    editTitle: "編輯使用者",
    fields: {
      username: "帳號",
      name: "名稱",
      email: "Email",
      role: "角色",
      includeInStats: "是否納入統計",
      workCapacity: "工作容量",
      password: "初始密碼",
    },
    includeInStatsYes: "是",
    includeInStatsNo: "否",
    actions: {
      cancel: "取消",
      save: "儲存",
    },
  },

  roles: {
    admin: "admin（管理員）",
    user: "user（一般使用者）",
    supervisor: "supervisor（主管）",
    guest: "guest（遊客）",
  },

  rules: {
    required: "必填",
    emailRequired: "請輸入 Email",
    emailFormat: "Email 格式不正確",
    roleRequired: "請選擇角色",
    passwordRequired: "請輸入密碼",
  },
  messages: {
    authExpired: "登入逾時，請重新登入",
    loadFailed: "載入失敗",
    loadFailedNetwork: "無法連線 API，請檢查後端",
    saveSuccess: "已儲存",
    saveFailed: "儲存失敗",
    saveConflict: "帳號或 Email 已存在",
    updateSuccess: "已更新",
    updateFailed: "更新失敗",

    // ✅ 固定重設提示
    resetSuccess: "已將密碼重設為 00000000",
    // ✅ 給 Users.vue 使用（你若沿用我提供的 resetSuccessFixed）
    resetSuccessFixed: "✅ 密碼已重設為 00000000",

    // （舊的寄信/連結文案先保留，不影響功能；你也可以刪掉）
    resetSuccessWithEmail: "已寄送重設通知至 {email}",
    resetLinkCopied: "已複製重設連結到剪貼簿",

    resetFailed: "重設失敗",
    deleteSuccess: "已刪除",
    deleteFailed: "刪除失敗",
    roleUpdated: "角色已更新",
    roleUpdateFailed: "更新角色失敗",
  },
},


  userPlanStats: {
    title: "使用者工作量統計",
    tag: "工作負載/容量概況",
    refresh: "重新整理",

    totalPlans: "NPDP 總數",
    totalDemands: "需求單總數",
    totalSupports: "測試支援總數",

    detailCharts: "詳細圖表",
    noData: "目前沒有統計資料",

    allUsersBarTitle: "所有使用者工作量（長條圖）",
    allUsersCapacityPieTitle: "所有使用者可工作容量（圓餅圖）",

    userSectionTitle: "各使用者明細",
    userTotalLabel: "總工作量",
    userCapacityHint: "每人可工作容量",

    metricPlan: "NPDP",
    metricDemand: "需求單",
    metricSupport: "測試支援",

    userPieTotalLabel: "總工作量",

    axisCount: "件數",
    seriesPlan: "NPDP",
    seriesDemand: "需求單",
    seriesSupport: "測試支援",

    tooltipWorkloadLabel: "工作量",
    tooltipOverloadLabel: "超出容量",
    capacityPieSeriesName: "使用者工作容量",

    totalCapacityLabel: "測試容量",
    capacityRatioLabel: "總容量數佔比",

    fetchError: "取得使用者工作統計失敗",
  },

warehouse: {
  title: '倉庫管理',

  layout: {
    subtitle: '庫存清單與借用紀錄',
  },

  nav: {
    items: '庫存清單',
    borrows: '借用紀錄',
  },

  header: {
    totalTag: '共 {total} 項（顯示 {shown} 項）',
  },

  actions: {
    newItem: '新增品項',
  },

  filters: {
    now: '目前時間：{time}',
    keywordPlaceholder: '搜尋：品名 / 料號 / 位置',
    typePlaceholder: '類別',
    statusPlaceholder: '狀態',
    filtered: '已套用篩選',
  },

  types: {
    all: '全部',
    machine: '機器',
    part: '零件',
    tool: '工具',
    fixture: '治具',
    other: '其他',
    instrument: '儀器',
  },

  statusOptions: {
    all: '全部',
    normal: '正常',
    partial_damage: '部分損壞',
    disabled_scrap: '停用/報廢',
  },

  stock: {
    title: '庫存清單',
    columns: {
      image: '圖片',
      type: '類別',
      name: '品名',
      code: '料號 / 資產編號',
      location: '位置',
      totalQty: '總數量',
      currentQty: '可借',
      hasPeripheral: '周邊',
      os: 'OS',
      status: '狀態',
      remark: '備註',
    },
    status: {
      normal: '正常',
      partial_damage: '部分損壞',
      disabled_scrap: '停用/報廢',
      unknown: '未知',
    },
    peripheralYes: '有',
    peripheralNo: '無',
    borrowButton: '借用',
    deleteConfirm: '確定要刪除這個品項？',
  },

  borrowDialog: {
    title: '借用',
    itemSub: '類別：{type}，可借：{qty}',
    fields: {
      itemName: '品項',
      quantity: '數量',
      purpose: '用途',
      expectedReturnAt: '預計歸還時間',
      remark: '備註',
    },
    placeholders: {
      purpose: '請輸入用途',
      expectedReturnAt: '選擇日期時間',
      remark: '可選填',
    },
    actions: {
      cancel: '取消',
      submit: '送出',
    },
  },

  itemDialog: {
    createTitle: '新增品項',
    editTitle: '編輯品項',
    cover: '封面',
    imageHint: '第一張為封面（列表縮圖）。可用 ↑↓ 調整順序。',
    imagePicked: '已選：',
    imageUnit: '張',
    coverFileId: '封面 FileID：',
    fields: {
      type: '類別',
      name: '品名',
      code: '料號 / 資產編號',
      location: '位置',
      totalQty: '總數量',
      status: '狀態',
      hasPeripheral: '周邊',
      hasPeripheralText: '周邊',
      os: 'OS',
      image: '圖片',
      remark: '備註',
    },
    placeholders: {
      os: '選擇 OS',
    },
    actions: {
      chooseImage: '選擇圖片',
      clearImage: '清除',
      cancel: '取消',
      create: '建立',
      save: '儲存',
    },
  },

  imagePicker: {
    title: '選擇圖片（檔案中心）',
    searchPlaceholder: '搜尋圖片檔名關鍵字…',
    empty: '沒有圖片',
    picked: '已加入',
    pick: '使用此圖片',
    columns: {
      preview: '預覽',
      name: '檔名',
      category: '分類',
      updated: '更新時間',
      actions: '操作',
    },
    loadFailed: '載入圖片失敗',
  },

  borrowRecords: {
    title: '借用紀錄',
    totalTag: '共 {total} 筆',

    scopeTitle: '借用紀錄檢視範圍',
    scopeMineOnly: '目前只顯示我的借用紀錄',
    scopeAll: '目前顯示全部借用紀錄',
    mineOnlyOn: '只看我的',
    mineOnlyOff: '看全部',
    mineOnlyFixed: '僅顯示我的借用',

    filters: {
      status: '借用狀態',
      reviewStatus: '審核狀態',
    },

    status: {
      all: '全部',
      requested: '申請中',
      borrowed: '借出中',
      returned: '已歸還',
      canceled: '已取消',
      rejected: '已駁回',
    },

    reviewStatus: {
      all: '全部',
      pending: '待審核',
      approved: '已核准',
      rejected: '已駁回',
      canceled: '已取消',
    },

    columns: {
      item: '品項',
      borrower: '借用人',
      quantity: '數量',
      purpose: '用途',
      expectedReturnAt: '預計歸還',
      createdAt: '申請時間',
      status: '借用狀態',
      reviewStatus: '審核狀態',
      reviewNote: '審核資訊',
    },

    actions: {
      approve: '核准',
      reject: '駁回',
      cancel: '取消申請',
      return: '歸還',
    },

    confirm: {
      cancel: '確定要取消這筆申請？',
      return: '確定要標記為已歸還？',
    },

    rejectReason: '駁回原因：',

    reviewDialog: {
      approveTitle: '核准借用',
      rejectTitle: '駁回借用',
      item: '品項',
      itemSub: '數量：{quantity}，借用人：{borrower}',
      note: '備註',
      notePlaceholder: '可選填',
      rejectReason: '駁回原因',
      rejectReasonPlaceholder: '請輸入駁回原因',
      rejectReasonRequired: '請輸入駁回原因',
    },
  },

  rules: {
    quantityRequired: '請輸入數量',
    quantityPositive: '數量必須大於 0',
    quantityExceed: '數量超過可借數量',
    purposeRequired: '請填寫用途',
    typeRequired: '請選擇類別',
    nameRequired: '請填寫品名',
    totalQtyNonNegative: '總數量不可小於 0',
    statusRequired: '請選擇狀態',
  },

  messages: {
    noStock: '可借數量不足',
    disabledScrapCannotBorrow: '此品項為停用/報廢，無法借用',
    loadItemsFailed: '載入庫存失敗',
    borrowSuccess: '借用申請已送出',
    borrowFailed: '借用失敗',
    loadBorrowsFailed: '載入借用紀錄失敗',
    saveItemSuccessNew: '已新增品項',
    saveItemSuccessEdit: '已更新品項',
    saveItemFailed: '儲存失敗',
    deleteItemSuccess: '已刪除',
    deleteItemFailed: '刪除失敗',
    cancelBorrowSuccess: '已取消借用申請',
    cancelBorrowFailed: '取消借用失敗',
    returnBorrowSuccess: '已標記歸還',
    returnBorrowFailed: '歸還失敗',
    reviewApproveSuccess: '已核准借用',
    reviewRejectSuccess: '已駁回借用',
    reviewBorrowFailed: '審核借用失敗',
  },
},

  osRecovery: {
    title: "OS Recovery Center",
    subtitle: "快速查詢各產品 OS Image 回復資訊",

    actions: {
      refresh: "重新整理",
      create: "新增 Image",
      editShort: "編輯",
      downloadShort: "下載",
    },

    type: {
      standard: "標準",
      custom: "客製",
    },

    osFamily: {
      unknown: "未知",
    },

    filters: {
      osFamily: "OS 版本",
      osFamilyPlaceholder: "選擇 OS 版本",
      osFamilyAll: "全部",
      osFamilyWin11: "Windows 11 (Win11)",
      osFamilyWin10: "Windows 10 (Win10)",
      osFamilyWin81: "Windows 8.1",
      osFamilyWin7: "Windows 7 (Win7)",
      osFamilyXPP: "Windows XP Pro (XPP)",
      osFamilyXPE: "Windows XP Embedded (XPE)",

      imageType: "Image 類型",
      imageTypePlaceholder: "選擇 Image 類型",

      onlyLatest: "只顯示最新版本",
      onlyLatestTip: "同一主板 / Edition / 語系 只取最新一筆資料",

      board: "主板型號",
      boardPlaceholder: "例如：SBC-xxxx",

      product: "對應機種",
      productPlaceholder: "例如：產品型號",

      language: "語系",
      languagePlaceholder: "例如：Multi-Lang, Eng-Twn",

      edition: "Edition",
      editionPlaceholder: "例如：Pro, Home",

      version: "Version",
      versionPlaceholder: "例如：21H2",

      licenseType: "License Type",
      licenseTypePlaceholder: "例如：EPKEA, PKEA",

      keyword: "關鍵字",
      keywordPlaceholder: "搜尋料號／機種／客戶代號／備註",
    },

    buttons: {
      search: "搜尋",
      reset: "重設",
    },

    table: {
      title: "Image 清單",
      totalPrefix: "共",
      totalSuffix: "筆資料",
      keywordLabel: "，關鍵字：",

      cols: {
        actions: "操作",
        pnIso: "料號 / ISO",
        osFamily: "OS 版本",
        type: "類型",
        mbModel: "主板型號",
        mbRevision: "主板版次",
        productModels: "對應機種",
        edition: "Edition",
        version: "Version",
        licenseType: "License Type",
        language: "語系",
        notes: "備註",
      },
    },

    note: {
      more: "詳細",
      title: "備註",
      meta: {
        os: "OS：",
        board: "主板 / 機種：",
      },
      close: "關閉",
    },

    messages: {
      fetchError: "取得 OS Image 清單失敗，請稍後再試",
    },
  },

safetyReports: {
  title: "安規認證管理",
  totalCount: "共 {count} 筆認證",
  groupCount: "共 {count} 筆認證",
  ungrouped: "未分類",
  searchPlaceholder: "搜尋機種名稱 / 型號 / 認證類別 / 實驗室",

  actions: {
    create: "新增認證",
    openFile: "開啟檔案",
  },

  columns: {
    modelName: "機種名稱",
    modelCode: "機種型號",
    certType: "認證類別",
    standard: "適用安規 / 標準",
    lab: "實驗室",
    issueDate: "開案日期",
    status: "狀態",
    remark: "備註",
  },

  fields: {
    groupName: "群組名稱",
    modelName: "機種名稱",
    modelCode: "機種型號",
    certType: "認證類別",
    standard: "適用安規 / 標準",
    lab: "實驗室",
    issueDate: "開案日期",
    status: "狀態",
    filePath: "檔案",
    remark: "備註",
  },

  placeholders: {
    groupName: "例如：AITRON",
    modelName: "例如：AITRON-921EPH",
    modelCode: "例如：AITRON-921EPH",
    certType: "例如：環測 / EMC / Safety",
    standard: "例如：IEC 62368-1 / CE / FCC",
    lab: "例如：佳世達 / SGS / TÜV",
    issueDate: "請選擇日期",
    status: "請選擇狀態",
    filePath: "可填入檔案中心路徑或 URL",
    remark: "請輸入備註",
  },

  dialog: {
    createTitle: "新增安規認證",
    editTitle: "編輯安規認證",
    viewTitle: "認證明細",
  },

  sections: {
    basicInfo: "基本資料",
    fileInfo: "檔案資訊",
  },

  timelineTitle: "認證進度",
  timelineStart: "開始",
  timelineEnd: "完成",
  timelineStep: "第 {current} / {total} 階段",

  summary: {
    total: "總筆數",
    inProgress: "進行中",
    paused: "暫停",
    completed: "已完成",
    withFile: "已綁檔案",
    noFile: "未綁檔案",
  },

  statusGroup: {
    inProgress: "進行中階段",
    others: "其他",
  },

  statusOptions: {
    spec_communication: "需求單位規格溝通",
    lab_quotation: "找實驗室詢價",
    quotation_approval: "會簽報價單",
    docs_to_lab: "整理文件資料給實驗室",
    purchase_request: "打請購單",
    pickup_and_install_os: "領機器並安裝OS",
    send_to_lab: "機器送出給實驗室",
    lab_testing: "實驗室測試中",
    draft_report_review: "實驗室測試完畢產出草稿報告確認",
    machine_returned: "機器送回",
    final_report_uploaded: "正式報告上傳",
    waiting_invoice: "等發票",
    reimbursement: "報帳",
    paused: "暫停",
    completed: "完成",
  },

  file: {
    currentFile: "目前檔案",
    noFile: "尚未選擇檔案",
    linked: "已綁檔案",
    unlinked: "未綁檔案",
    upload: "上傳檔案",
    pickFromCenter: "從檔案中心選取",
    open: "開啟",
    clear: "清除",
    select: "選取",
    dialogTitle: "從檔案中心選取",
    searchPlaceholder: "搜尋檔名 / 類別",
    columns: {
      name: "檔名",
      category: "類別",
      createdAt: "建立時間",
      uploader: "上傳者",
    },
  },

  validation: {
    groupName: "請輸入群組名稱",
    modelName: "請輸入機種名稱",
    modelCode: "請輸入機種型號",
    certType: "請輸入認證類別",
    issueDate: "請選擇開案日期",
    status: "請選擇狀態",
  },

  messages: {
    loadFailed: "載入安規認證失敗",
    saveFailed: "儲存安規認證失敗",
    deleteFailed: "刪除安規認證失敗",
    created: "新增成功",
    updated: "更新成功",
    deleted: "刪除成功",
    deleteConfirm: "確定要刪除這筆安規認證嗎？",
    uploaded: "檔案上傳成功",
    uploadFailed: "檔案上傳失敗",
    loadFileCenterFailed: "讀取檔案中心失敗",
    fileSelected: "已選取檔案",
    noLinkedFile: "這筆認證尚未綁定檔案",
  },
},



  docManager: {
    title: "產品管理",
    tag: "機種文件進度追蹤",

    selectModel: "選擇機種",
    modelAll: "全部機種",
    keywordPH: "搜尋型號 / 備註…",
    btnRefresh: "重新整理",

    colModelCode: "型號",
    colProgress: "文件進度",
    colRemark: "備註",
    colUpdated: "更新時間",

    actionEdit: "編輯",
    dialogTitle: "更新文件狀態",
    fieldProgress: "進度",
    fieldRemark: "備註",
    remarkPH: "輸入備註（可留空）",

    statusNotStarted: "未開始",
    statusDoing: "進行中",
    statusDone: "已完成",

    summaryTotal: "型號數",
    summaryDone: "已完成",
    summaryAvg: "平均進度",

    btnAdd: "新增",
    btnCreate: "建立",
    createDialogTitle: "新增型號文件",
    fieldFamily: "機種",
    fieldModelCode: "型號",
    modelCodePH: "例如：ABC-1234",
    errNeedFamily: "請先選擇機種",
    errNeedModelCode: "請輸入型號",
    created: "已新增",
  },

  reliabilityCapacity: {
    title: "Reliability 機台可工作容量",
    tagRealtime: "即時統計",
    updatedAt: "更新時間：{time}",

    apiFailed: "API 回傳失敗",
    fetchFailed: "取得 Reliability 機台容量失敗",

    summary: {
      chamber15Count: "符合條件之 Chamber 1~5 數量",
      totalSlots: "總名目 DUT 容量",
      usedSlots: "目前已佔用",
      freeSlots: "剩餘可用",
    },

    overview: {
      title: "總體容量使用率（Chamber 1~5）",
      currentUtilization: "目前使用率",
      legendUsed: "已佔用 {used}",
      legendFree: "剩餘 {free}",
      nominalSlots: "名目 DUT 容量",
      used: "已佔用",
      free: "剩餘可用",
      hint1:
        "※ Chamber 1~5 每台名目容量固定為 2，1 個排程 = 占用 1（50%）",
      hint2: "※ Chamber 1~5 溫度小於 20°C 且有排程視為佔比 100%",
    },

    table: {
      title: "各機台容量明細（Chamber 1~5）",
      empty: "目前沒有 Chamber 1~5 的資料",
      chamber: "Chamber",
      chamberWithNo: "Chamber {no}",
      name: "機台名稱",
      model: "機台型號",
      code: "機台代號",
      status: "狀態",
      currentTemp: "目前溫度 (°C)",
      nominalSlots: "名目 DUT 容量",
      usedSlots: "目前佔用",
      freeSlots: "剩餘可用",
      includeInSummary: "納入總體統計",
      utilization: "使用率",
    },

    chamber6: {
      title: "Chamber 6 容量狀態（不納入總體統計）",
      name: "機台名稱",
      model: "機台型號",
      code: "機台代號",
      nominalSlots: "名目 DUT 容量",
      usedSlots: "目前佔用",
      freeSlots: "剩餘可用",
      utilization: "使用率",
      currentTemp: "目前溫度",
    },
  },

  equipment: {
    title: "儀器設備",
    searchPlaceholder: "搜尋：名稱／資產編號／位置／保管人",
    btnNew: "新增品項",
    now: "目前時間：{time}",

    stock: {
      title: "庫存清單",
      totalTag: "共 {total} 項（第 {page} 頁 / {pageSize} 筆）",
      colImage: "圖片",
      colName: "品名",
      colAssetCode: "資產編號",
      colLocation: "位置",
      colKeeper: "保管人",
      colTotalQty: "總數",
      colAvailableQty: "可借",
      colCalibration: "校正日",
      colRemark: "備註",
    },

    myLoans: {
      title: "我的借用紀錄",
      filterStatus: "狀態",
      statusAll: "全部",
      colName: "品名",
      colQty: "數量",
      colBorrowedAt: "借出時間",
      colExpectedReturn: "預計歸還",
      colReturnedAt: "實際歸還",
      colStatus: "狀態",
      rejectReasonTip: "退回原因：{reason}",
    },

    actions: {
      borrow: "借用",
      view: "檢視",
      return: "歸還",
    },

    status: {
      pending: "待審核",
      rejected: "已退回",
      borrowed: "借用中",
      overdue: "逾期",
      returned: "已歸還",
    },

    borrowDialog: {
      title: "借用設備",
      item: "設備",
      qty: "數量",
      available: "可借：{n}",
      expectedReturn: "預計歸還",
      pickDate: "選擇日期時間",
      remark: "備註",
      remarkPlaceholder: "用途／說明…",
      hint: "送出後會進入待審核，核准後才算借用中。",
      submit: "送出",
    },

    editDialog: {
      titleNew: "新增設備",
      titleEdit: "編輯設備",
      name: "名稱",
      assetCode: "資產編號",
      location: "位置",
      keeper: "保管人",
      totalQty: "總數",
      availableQty: "可借",
      calibrationDate: "校正日",
      pickDate: "選擇日期",
      imageUrl: "圖片 URL",
      remark: "備註",
    },

    viewDialog: {
      title: "設備資訊",
      name: "名稱",
      assetCode: "資產編號",
      location: "位置",
      keeper: "保管人",
      totalQty: "總數",
      availableQty: "可借",
      calibrationDate: "校正日",
      remark: "備註",
    },

    confirmReturnTitle: "提示",
    confirmReturnText: "確認歸還此設備？",
    confirmDeleteTitle: "刪除確認",
    confirmDeleteText: "確定刪除「{name}」？",

    msgLoadListFail: "載入設備清單失敗",
    msgLoadLoansFail: "載入借用紀錄失敗",
    msgQtyInvalid: "數量必須為正整數",
    msgQtyOver: "超過可借數量",
    msgBorrowSubmitted: "已送出，待審核",
    msgBorrowFail: "借用失敗",
    msgReturnFail: "歸還失敗",
    msgReturned: "已歸還",
    msgNameRequired: "名稱為必填",
    msgSaved: "已儲存",
    msgSaveFail: "儲存失敗",
    msgDeleted: "已刪除",
    msgDeleteFail: "刪除失敗",
  },

  reviewCenter: {
    title: "審核中心",
    tag: "批准 / 退回排程與借用",

    now: "目前時間",
    searchPlaceholder: "搜尋：資源 / 申請人 / 用途…",

    statusAll: "全部狀態",
    pending: "待審核",
    approved: "已通過",
    rejected: "已退回",

    hint: "只會顯示你有權限審核的項目（admin / supervisor）",

    colResource: "資源 / 項目",
    colRequester: "申請人",
    colType: "類型",
    colTime: "時間",
    colPurpose: "用途 / 說明",
    colStatus: "狀態",
    colAction: "操作",

    btnApprove: "通過",
    btnReject: "退回",
    btnDetail: "詳細",
    done: "已結案",

    approveTitle: "批准",
    rejectTitle: "退回",
    detailTitle: "詳細資訊",
    confirmTitle: "確認",

    selectedItem: "選取項目",
    approveNote: "批准備註（選填）",
    approveNotePh: "例如：已確認時段 / 已確認資源可用…",
    reviewNote: "審核備註",
    rejectReason: "退回原因",
    rejectReasonPh: "請輸入退回原因（必填）",

    bulkApprove: "批次通過",
    bulkReject: "批次退回",
    bulkApproveConfirm: "確定要通過 {count} 筆待審項目？",
    bulkRejectPrompt: "請輸入「統一退回原因」（將套用到所選待審項目）",

    msgApproved: "✅ 已通過",
    msgRejected: "⛔ 已退回",
    msgFailed: "操作失敗",
    msgNeedReason: "請輸入退回原因",
    msgNoPending: "所選項目沒有「待審核」資料",
  },

  notifications: {
    title: "通知中心",
    tabs: {
      schedules: "排程 ({n})",
      borrows: "租借 ({n})",
    },
    emptySchedule: "目前沒有待審核排程",
    emptyBorrow: "目前沒有待審核租借",
    goSchedule: "前往排程審核",
    goBorrow: "前往租借審核",
  },
};
