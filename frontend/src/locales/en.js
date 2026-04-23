// frontend/src/i18n/en.js
export default {
  /* ===================== App / Common ===================== */
  app: {
    title: "Test Site",
  },

  common: {
    confirm: "Confirm",
    cancel: "Cancel",
    close: "Close",
    ok: "OK",
    save: "Save",
    saved: "Saved",
    add: "Add",
    edit: "Edit",
    delete: "Delete",
    search: "Search",
    reset: "Reset",
    actions: "Actions",
    yes: "Yes",
    no: "No",
    loading: "Loading…",
    noData: "No data",
    refresh: "Refresh",
    user: "User",
    na: "N/A",

    // (optional but commonly used)
    back: "Back",
    view: "View",
    submit: "Submit",
    copy: "Copy",
    upload: "Upload",
    download: "Download",
  },

  time: {
    start: "Start time",
    end: "End time",
  },

  /* ===================== Layout / Header / Sidebar ===================== */
  layout: {
    dashboard: "Home",
    products: "Products",
    productTest: "Product Test",
    machines: "Machine Test",
    sop: "SOP",
    logs: "System Logs",
    users: "User Management",
    profile: "Profile",
    logout: "Logout",
  },

  header: {
    language: "Language",
    langZh: "繁體中文",
    langEn: "English",
  },

  topbar: {
    goDashboard: "Go to Dashboard",
    notLoggedIn: "Not logged in",
    toggleTheme: "Toggle theme",
    apiCopied: "API copied",
  },

  sidebar: {
    navLabel: "Main navigation",
    backHome: "Back to home",
    expand: "Expand sidebar",
    collapse: "Collapse sidebar",
    closeFlyout: "Close flyout menu",

    techDocs: "Tech Docs",
    safetyReports: "Safety Reports",
    osRecovery: "OS Recovery",

    productGroup: "Product",
    productMgmt: "Product Management",
    testPlanReport: "Test Plan / Reports",
    testRequest: "Test Requests",
    testSupport: "Test Support",
    testCaseLibrary: 'Test Cases',
    testSets: 'Test Sets',

    labGroup: "Lab / Machines",
    equipment: "Equipments",
    labReliability: "Machine Tests",
    reliabilityCapacity: "Reliability Capacity",
    labEmcSi: "EMC / SI",
    labIp: "IP",
    labIk: "IK",
    labEms: "EMS",

    files: "Files",
    warehouse: "Warehouse",
    warehouseItems: "Inventory",
    suggestion: "Suggestion Box",

    adminGroup: "Admin Tools",
    reviewCenter: "Review Center",
    warehouseBorrow: "Warehouse Borrow Review",
    suggestionsMgmt: "Suggestions Management",
    defaultTestSets: "Default Test Sets",
    userPlanStats: "User Plan Stats",
  },

  auth: {
    sessionExpired: "Session expired, please sign in again",
  },

  routeTitles: {
  login: 'Login',
  register: 'Register',
  resetPassword: 'Reset Password',

  products: 'Product Management',
  testCases: 'Test Cases',
  testSets: 'Test Sets',

  productTest: 'x86 Test Report',
  armTest: 'ARM Test Report',
  displayTest: 'Display Test Report',
  partTest: 'Storage/Memory Test Report',
  storageTest: 'SSD/Storage Test Report',
  memoryTest: 'Memory Test Report',

  testRequests: 'Test Requests',
  testSupport: 'Test Support',

  files: 'Files',
  docManager: 'Document Management',
  safetyReports: 'Safety Reports',
  osRecovery: 'OS Recovery Center',

  equipment: 'Equipment',
  reviewCenter: 'Review Center',

  suggestion: 'Suggestions',
  suggestionMine: 'My Suggestions',
  suggestionsManagement: 'Suggestions Management',

  usersList: 'Users List',
  usersManagement: 'User Management',
  userPlanStats: 'User Plan Statistics',
  logs: 'System Logs',
  profile: 'Profile',

  defaultTestSets: 'Default Test Sets',

  emcsi: 'EMC & SI Lab Schedule',
  ipLab: 'IP Lab Schedule',
  ikLab: 'IK Lab Schedule',
  ems: 'EMS Lab Schedule',

  machineDashboard: 'Machine Dashboard',
  machineDetail: 'Machine Detail',
  reliabilityCapacity: 'Reliability Working Capacity',
  machineTests: 'Machine Test Schedule',
},

  /* ===================== Welcome / Profile ===================== */
  welcome: {
    title: "Welcome to the Test System",
    frontendVersion: "Frontend version",
    backendVersion: "Backend version",
    serverStatus: "Server status",
    serverOnline: "Online",
    serverOffline: "Offline",
    apiBase: "API base URL",
    loginStatus: "Login status",
    loginNotLoggedIn: "Not logged in",
    loginLoggedIn: "Logged in as {name}",
    currentUser: "Current user",
    guestHint: "Guest mode: you can only browse limited features.",
    btnCheck: "Check server",
    btnDashboard: "Go to dashboard",
    btnProducts: "Go to products",
    apiCopied: "API URL copied",
  },

  profile: {
    title: "Profile",
  },

  /* ===================== profilePage ===================== */
  
profilePage: {
  title: 'Profile',
  subtitle: 'Update your display name and login password here',
  defaultRole: 'user',

  basic: {
    title: 'Basic Info',
    desc: 'Update the display name shown at the top-left',
    tag: 'Profile'
  },

  security: {
    title: 'Change Password',
    desc: 'You will be signed out automatically after updating it',
    tag: 'Security'
  },

  fields: {
    username: 'Username',
    role: 'Role',
    displayName: 'Display Name',
    oldPassword: 'Current Password',
    newPassword: 'New Password',
    confirmPassword: 'Confirm New Password'
  },

  placeholders: {
    displayName: 'Enter the name to display at the top-left',
    oldPassword: 'Enter your current password',
    newPassword: 'At least 8 characters and 2 character types',
    confirmPassword: 'Enter the new password again'
  },

  actions: {
    saveDisplayName: 'Save Display Name',
    updatePassword: 'Update Password'
  },

  validation: {
    displayNameRequired: 'Please enter a display name',
    displayNameLength: 'Display name must be 2 to 50 characters',
    oldPasswordRequired: 'Please enter your current password',
    newPasswordRequired: 'Please enter a new password',
    newPasswordMin: 'New password must be at least 8 characters',
    newPasswordKinds: 'New password must include at least 2 character types',
    confirmRequired: 'Please confirm the new password',
    confirmMismatch: 'The two new passwords do not match'
  },

  strength: {
    empty: 'No new password entered yet',
    high: 'Password strength: High',
    medium: 'Password strength: Medium',
    low: 'Password strength: Low'
  },

  messages: {
    capsLockOn: 'Caps Lock is on',
    sessionExpired: 'Your session has expired. Please sign in again',
    displayNameUpdated: 'Display name updated',
    displayNameUpdateFailed: 'Failed to update display name',
    passwordUpdatedRelogin: 'Password updated. Please sign in again',
    passwordUpdateFailed: 'Failed to update password'
  }
},

  /* ===================== Change Password ===================== */
  changePassword: {
    title: "Change Password",
    hint: "At least 12 characters with upper/lower case, numbers and symbols",

    currentLabel: "Current Password",
    newLabel: "New Password",
    confirmLabel: "Confirm New Password",

    capsOn: "⚠️ Caps Lock is ON",

    btnSubmit: "Update Password",

    strengthNone: "Strength: none",
    strengthLow: "Strength: low",
    strengthMedium: "Strength: medium",
    strengthHigh: "Strength: high",

    rules: {
      oldRequired: "Please enter current password",
      newRequired: "Please enter new password",
      minLength: "At least 8 characters",
      mixTypes: "Use a mix of letters, numbers, and symbols",
      confirmRequired: "Please confirm new password",
      mismatch: "Passwords do not match",
    },

    messages: {
      failedCheck: "Failed to change, please check your password",
      updated: "Password updated, please log in again",
      failedGeneric: "Failed to change password, please try again later",
    },
  },

  /* ===================== Dashboard (/welcome as dashboard) ===================== */
  dashboard: {
    headerTitle: "Welcome",
    headerTag: "Dashboard",

    sizeCompact: "Compact",
    sizeDefault: "Default",
    sizeComfortable: "Comfortable",

    autoRefreshOn: "Auto refresh",
    autoRefreshOff: "Manual",
    refreshTitle: "Press R to refresh",
    btnRefresh: "Refresh",

    greetingLateNight: "Good night",
    greetingMorning: "Good morning",
    greetingNoon: "Good noon",
    greetingAfternoon: "Good afternoon",
    greetingEvening: "Good evening",

    guestNoticeTitle: "You are in guest mode",
    guestNoticeDesc:
      "You can only browse limited information. Please contact an administrator if you need more access.",

    quickNav: "Quick Navigation",
    btnProducts: "NPDP",
    btnMachines: "Machines",
    btnFeedback: "Feedback",
    btnDefaultSets: "Default Test Sets",
    btnLogs: "Logs",
    btnUsers: "User Admin",

    overviewTitle: "System Overview",
    statProducts: "NPDP",
    statRequests: "Requests",
    statSupport: "Support",
    statMachines: "Machines",
    statSuggestions: "Feedback",

    adminSummaryTitle: "Summary overview",
    adminSummaryHint:
      "Quick view of chamber usage and DQA capacity. For details please check the dedicated pages.",

    userPlanTitle: "User Workload Statistics",
    userPlanTotalPlans: "Total plans",
    userPlanTotalHours: "Total workload",
    userPlanTotalWork: "Total workload",
    userPlanTopUsers: "Top users by workload",
    userPlanColUser: "User",
    userPlanColPlans: "Products / Plans",
    userPlanColHours: "Workload",
    userPlanColDemand: "Test requests",
    userPlanColSupport: "Test supports",
    userPlanColWork: "Workload",
    userPlanEmpty: "No user workload data yet",

    machineCapacityTitle: "Machine Capacity",
    machineCapacityTotalMachines: "Total machines",
    machineCapacityUsedHours: "Scheduled hours",
    machineCapacityFreeHours: "Available hours",
    machineCapacityTopMachines: "Machines with highest free capacity",
    machineCapacityColMachine: "Machine",
    machineCapacityColModel: "Model / Code",
    machineCapacityColFreeHours: "Free hours",
    machineCapacityEmpty: "No machine capacity data yet",

    blocks: {
      chamber15TableTitle: "Chamber Capacity Details (Chamber 1–5)",
      reliabilityTitle: "Overall Utilization (Chamber 1–5)",
      userWorkTitle: "All Users Workload (Bar)",
      dqaTitle: "DQA Capacity",

      table: {
        colIndex: "#",
        colChamber: "Chamber",
        chamberPrefix: "Chamber",
        colMachineName: "Machine Name",
        colMachineModel: "Model",
        colTemp: "Temp (°C)",
        colMaxSlots: "Nominal DUT",
        colUsedSlots: "Used",
        colFreeSlots: "Free",
        colUtil: "Util.",
      },

      reliabilityTotal: "Nominal DUT Capacity: {total}",
      reliabilityUsedRemain: "Used: {used}, Remaining: {remain}",
      reliabilityNote:
        "※ Temp < {temp}°C and has schedule => treated as 100% utilization",

      dqaCapacity: "DQA Capacity: {percent}%",
      dqaRatio: "(Work / Capacity: {work}/{cap})",

      dqaChart: {
        used: "Used",
        remaining: "Remaining",
        noData: "No data",
        na: "N/A",
      },
    },
  },

  /* ===================== Products list ===================== */
  productsPage: {
  title: "Test Plans / Reports",
  tagV2: "List / Progress Overview",

  // Search & filters
  searchPlaceholder: "Search: product name / model / creator",
  filterNormalOnly: 'Show only status = "Normal"',
  filterNormalOnlyOn: "Show only normal status",
  filterNormalOnlyOff: "Show all statuses",
  filterIncludeDeleted: "Include deleted",
  filterNormal: "Only show non-deleted",

  // Top buttons
  btnReload: "Refresh",
  btnSimple: "Simple",
  btnAdvanced: "Advanced",
  btnAdd: "Add Product",
  btnRestore: "Restore",

  // Table columns
  colIndex: "#",
  colName: "Product Name",
  colModel: "Model",
  colTestType: "Type",
  colCreator: "Creator",
  colProgress: "Test Progress",
  colTestHours: "Test Hours",
  colCreatedAt: "Created At",
  colStatus: "Status",
  colActions: "Actions",

  // Status tags
  statusNormal: "Normal",
  statusHidden: "Hidden",
  statusArchived: "Archived",
  statusDeleted: "Deleted",

  // Row action buttons
  btnTest: "Test",
  btnEdit: "Edit",
  btnDelete: "Delete",

  // Delete / restore confirm
  confirmDelete: 'Are you sure you want to delete product "{name}"?',
  confirmDeleteSoft:
    'Are you sure you want to mark this product as deleted? (It can be restored when "Include deleted" is enabled)',

  // Add / edit dialog
  dialogNewTitle: "New Product",
  dialogEditTitle: "Edit Product",

  fieldName: "Product Name",
  fieldModel: "Model",
  fieldTestType: "Test Type",
  fieldDefaultTestSet: "Default Test Set",

  defaultTestSetPlaceholder: "Select default test set (optional)",

  btnDialogCancel: "Cancel",
  btnDialogSave: "Save",

  // Test types
  testTypeX86: "System (x86)",
  testTypeArm: "System (ARM)",
  testTypeDisplay: "Display",
  testTypePart: "Part (PartTest)",

  testTypeSystemShort: "System",
  testTypeX86Short: "System",
  testTypeArmShort: "System",
  testTypeDisplayShort: "Display",
  testTypePartShort: "Part",

  testTypeHintX86: 'After creation, "Start Test" will open the System (x86) test report page.',
  testTypeHintArm: 'After creation, "Start Test" will open the System (ARM) test report page.',
  testTypeHintDisplay: 'After creation, "Start Test" will open the display test report page.',
  testTypeHintPart: 'After creation, "Start Test" will open the storage/memory part test report.',

  // Validation
  rules: {
    nameRequired: "Please enter product name",
    modelRequired: "Please enter model",
    testTypeRequired: "Please select a test type",
  },

  // Toast / messages
  message: {
    loadFailed: "Failed to load product list",
    saveFailed: "Failed to save product",
    saveSuccess: "Product saved",
    deleteSuccess: "Product deleted",
    deleteFailed: "Failed to delete product",
    restoreSuccess: "Product restored",
    restoreFailed: "Failed to restore product",
  },
},

  /* ===================== Product test items ===================== */
  productTest: {
    title: "Product Test Items",
    tabAll: "All",
    tabHW: "HW",
    tabReli: "Reli",
    tabStab: "Stab",
    tabPwr: "PWR",
    tabThm: "Thrm",
    tabESD: "ESD",
    tabPerf: "Perf",
    tabBIOS: "BIOS",
    tabOS: "OS",

    totalTag: "Total {count} items",
    modeList: "List",
    modeTrash: "Trash",

    btnAdd: "Add test item",
    btnImportFromSet: "Import from default set",
    btnSaveAsSet: "Save as default set",
    btnDeleteSelected: "Delete selected",
    btnRestoreSelected: "Restore selected",
    btnRestore: "Restore",
    btnExportPdf: "Export PDF report",
    btnReload: "Reload",

    searchPlaceholder: "Search: item / code / criteria / remark",

    colIndex: "#",
    colCategory: "Category",
    colCode: "Code",
    colTestCase: "Test item",
    colTestProcedure: "Test procedure",
    colTestCriteria: "Criteria",
    colResult: "Result",
    colWorkHrs: "Work hrs",
    colRemark: "Remark",
    colActions: "Actions",

    resultPass: "Pass",
    resultFail: "Fail",
    resultPending: "Pending",
    resultNone: "Not set",
    placeholderInitialResult: "Initial test result (optional)",

    confirmDeleteOne: "Are you sure you want to delete this test item?",

    dialogAddTitle: "Add test item",
    fieldCategory: "Category",
    fieldTestCase: "Test item",
    placeholderTestCase: "Enter test item",
    fieldCode: "Code",
    placeholderCode: "e.g. CPU_001",
    fieldProcedure: "Procedure",
    placeholderProcedure: "Describe test procedure",
    fieldCriteria: "Criteria",
    placeholderCriteria: "Describe pass/fail criteria",
    fieldRemark: "Remark",
    placeholderRemark: "Extra notes or conditions",
    fieldWorkHrs: "Estimated work hours",
    unitHour: "hr",
    fieldInitialResult: "Initial result",

    importTitle: "Import from default test sets",
    importSearchPlaceholder: "Search set name / description",
    importBtnSearch: "Search",
    importBtnReload: "Reload",
    importColName: "Set name",
    importColDescription: "Description",
    importColCount: "Cases",
    importColCreator: "Creator",
    importBtnConfirm: "Import {count} selected",

    saveTitle: "Save as default test set",
    saveFieldName: "Set name",
    saveFieldDescription: "Description",
    savePlaceholderDescription: "Optional description for this test set",
    saveAlertText:
      'All current test items of this product will be saved as a reusable "default test set". Existing items will not be changed.',
    saveBtn: "Save",
    defaultSetSuffix: "Test Set",

    rules: {
      categoryRequired: "Category is required",
      testCaseRequired: "Test item is required",
      criteriaRequired: "Criteria is required",
      setNameRequired: "Set name is required",
    },

    message: {
      loadFailed: "Failed to load test items",

      exportNoProductId: "Missing product id, cannot export report",
      exportNoRows: "No test items to export",
      exportSuccess: "PDF report exported",
      exportFailed: "Failed to export PDF",

      deleteOneSuccess: "Test item deleted",
      deleteOneFailed: "Failed to delete test item",

      restoreOneSuccess: "Test item restored",
      restoreOneFailed: "Failed to restore test item",

      batchDeleteConfirm: "Delete {count} selected test item(s)?",
      batchDeleteSuccess: "Selected test items deleted",
      batchDeleteFailed: "Batch delete failed",

      batchRestoreConfirm: "Restore {count} selected test item(s)?",
      batchRestoreSuccess: "Selected test items restored",
      batchRestoreFailed: "Batch restore failed",

      resultUpdated: "Result updated",
      resultUpdateFailed: "Failed to update result",

      addSuccess: "Test item added",
      addFailed: "Failed to add test item",

      importLoadFailed: "Failed to load default test sets",
      importSuccess: "Imported {count} test items",
      importFailed: "Import failed",

      saveSetSuccess: "Saved as default test set",
      saveSetFailed: "Failed to save default test set",
    },
  },

  /* ===================== Notifications ===================== */
  notifications: {
    title: "Notifications",
    tabs: {
      schedules: "Schedules ({n})",
      borrows: "Borrow requests ({n})",
    },
    emptySchedule: "No schedules pending approval",
    emptyBorrow: "No borrow requests pending approval",
    goSchedule: "Go to schedule approvals",
    goBorrow: "Go to borrow approvals",
  },

  /* ===================== Review Center ===================== */
  reviewCenter: {
    title: "Review Center",
    tag: "Approve / Reject schedules & borrow requests",

    now: "Now",
    searchPlaceholder: "Search: resource / requester / purpose…",

    statusAll: "All status",
    pending: "Pending",
    approved: "Approved",
    rejected: "Rejected",

    hint:
      "Only items you are allowed to review will be shown (admin / supervisor).",

    colResource: "Resource / Item",
    colRequester: "Requester",
    colType: "Type",
    colTime: "Time",
    colPurpose: "Purpose / Notes",
    colStatus: "Status",
    colAction: "Actions",

    btnApprove: "Approve",
    btnReject: "Reject",
    btnDetail: "Details",
    done: "Done",

    approveTitle: "Approve",
    rejectTitle: "Reject",
    detailTitle: "Details",
    confirmTitle: "Confirm",

    selectedItem: "Selected item",
    approveNote: "Approval note (optional)",
    approveNotePh: "e.g. Time slot confirmed / Resource available…",
    reviewNote: "Review note",
    rejectReason: "Reject reason",
    rejectReasonPh: "Enter the reject reason (required)",

    bulkApprove: "Bulk approve",
    bulkReject: "Bulk reject",
    bulkApproveConfirm: "Approve {count} pending item(s)?",
    bulkRejectPrompt:
      "Enter ONE reject reason to apply to all selected pending items.",

    msgApproved: "✅ Approved",
    msgRejected: "⛔ Rejected",
    msgFailed: "Action failed",
    msgNeedReason: "Reject reason is required",
    msgNoPending: "No pending items in the selection",
  },

  /* ===================== EMS / EMC&SI / IK / IP Labs ===================== */
  emsLab: {
    title: "EMS Lab",
    subtitle: "Lab Schedule",

    datePickerPlaceholder: "Select date",
    filteredAlert: "Showing schedules for {date}",

    cardTitleWithDate: "Schedules on {date}",
    cardTitleNoDate: "Schedules (no date selected)",

    btnRefresh: "Refresh",
    btnNewSchedule: "New Schedule",

    emptyDescription: "No schedule on this date",

    table: {
      index: "#",
      date: "Date",
      time: "Time",
      purpose: "Purpose",
      remark: "Remark",
      createdAt: "Created At",
      status: "Status",
    },

    dialogTitle: "New EMS Schedule",
    fieldDate: "Date",
    fieldTimeRange: "Time Range",
    fieldQuickRange: "Quick Range",
    fieldPurpose: "Purpose",
    fieldRemark: "Remark",

    timeStartPlaceholder: "Start time",
    timeEndPlaceholder: "End time",

    quickRanges: {
      morning: "Morning (09:00–12:00)",
      afternoon: "Afternoon (13:30–17:30)",
      full: "Full day (09:00–17:30)",
    },

    placeholderPurpose: "e.g. EMS test, surge/ESD, etc.",
    placeholderRemark: "Other notes (optional)",

    btnSave: "Save",
    btnCancel: "Cancel",

    message: {
      needDate: "Please select a date",
      needTimeRange: "Please select a time range",
      timeInvalid: "End time must be later than start time",
      needPurpose: "Please enter the purpose",
      loadFailed: "Failed to load schedules",
      createSuccess: "Schedule created",
      createFailed: "Failed to create schedule",
    },

    statusText: {
      pending: "Pending",
      approved: "Approved",
      rejected: "Rejected",
      canceled: "Canceled",
      finished: "Finished",
    },
  },

  emcSiLab: {
    headerTitle: "EMC & SI Lab",
    headerTag: "Lab Scheduling",

    datePlaceholder: "Select date",
    btnNewSchedule: "New Schedule",

    filterAlert: "Filtered date: schedules on {date}",
    scheduleTitle: "Schedules on {date}",
    noDateSelected: "No date selected",

    btnReload: "Reload",
    emptyDescription: "No schedule for this date",

    colIndex: "#",
    colDate: "Date",
    colTime: "Time",
    colPurpose: "Purpose",
    colRemark: "Remark",
    colCreatedAt: "Created At",
    colStatus: "Status",

    dialogTitleNew: "New EMC & SI Schedule",

    fieldDate: "Date",
    fieldTimeRange: "Time Range",
    fieldQuickRange: "Quick Range",
    fieldPurpose: "Purpose",
    fieldRemark: "Remark",

    timeStartPlaceholder: "Start Time",
    timeEndPlaceholder: "End Time",

    quickMorning: "Morning (09:00–12:00)",
    quickAfternoon: "Afternoon (13:30–17:30)",
    quickFullDay: "Full Day (09:00–17:30)",

    purposePlaceholder: "e.g. EMI test, SI test…",
    remarkPlaceholder: "Additional notes (optional)",

    btnSave: "Save Schedule",

    validation: {
      dateRequired: "Please select a date",
      timeRangeRequired: "Please select time range",
      timeOrder: "End time must be after start time",
      purposeRequired: "Please enter purpose",
    },

    status: {
      pending: "Pending",
      approved: "Approved",
      rejected: "Rejected",
      canceled: "Canceled",
      finished: "Finished",
    },

    message: {
      loadFailed: "Failed to load schedules",
      createSuccess: "Schedule created",
      createFailed: "Failed to create schedule",
    },
  },

  ikLab: {
    title: "IK Lab",
    subtitle: "Lab Scheduling",

    datePickerPlaceholder: "Select date",
    filteredAlert: "Filtered date: schedules on {date}",

    cardTitleWithDate: "Schedules on {date}",
    cardTitleNoDate: "Schedules without selected date",

    btnRefresh: "Refresh",
    btnNewSchedule: "New Schedule",

    emptyDescription: "No schedule for this date",

    table: {
      index: "#",
      date: "Date",
      time: "Time",
      purpose: "Purpose",
      remark: "Remark",
      createdAt: "Created At",
      status: "Status",
    },

    dialogTitle: "New IK Schedule",
    fieldDate: "Date",
    fieldTimeRange: "Time Range",
    fieldQuickRange: "Quick Range",
    fieldPurpose: "Purpose",
    fieldRemark: "Remark",

    timeStartPlaceholder: "Start Time",
    timeEndPlaceholder: "End Time",

    quickRanges: {
      morning: "Morning (09:00–12:00)",
      afternoon: "Afternoon (13:30–17:30)",
      full: "Full Day (09:00–17:30)",
    },

    placeholderPurpose: "e.g. IK07 impact test, IK08 impact test…",
    placeholderRemark: "Additional notes (optional)",

    btnSave: "Save Schedule",
    btnCancel: "Cancel",

    message: {
      needDate: "Please select a date",
      needTimeRange: "Please select time range",
      timeInvalid: "End time must be after start time",
      needPurpose: "Please enter purpose",
      loadFailed: "Failed to load schedules",
      createSuccess: "Schedule created",
      createFailed: "Failed to create schedule",
    },

    statusText: {
      pending: "Pending",
      approved: "Approved",
      rejected: "Rejected",
      canceled: "Canceled",
      finished: "Finished",
    },
  },

  ipLab: {
    title: "IP Lab",
    subtitle: "Lab Scheduling",

    datePickerPlaceholder: "Select date",
    filteredAlert: "Filtered date: schedules on {date}",

    cardTitleWithDate: "Schedules on {date}",
    cardTitleNoDate: "Schedules without selected date",

    btnRefresh: "Refresh",
    btnNewSchedule: "New Schedule",

    emptyDescription: "No schedule for this date",

    table: {
      index: "#",
      date: "Date",
      time: "Time",
      purpose: "Purpose",
      remark: "Remark",
      createdAt: "Created At",
      status: "Status",
    },

    dialogTitle: "New IP Schedule",
    fieldDate: "Date",
    fieldTimeRange: "Time Range",
    fieldQuickRange: "Quick Range",
    fieldPurpose: "Purpose",
    fieldRemark: "Remark",

    timeStartPlaceholder: "Start Time",
    timeEndPlaceholder: "End Time",

    quickRanges: {
      morning: "Morning (09:00–12:00)",
      afternoon: "Afternoon (13:30–17:30)",
      full: "Full Day (09:00–17:30)",
    },

    placeholderPurpose: "e.g. IPX5 spray test, IPX6K high pressure test…",
    placeholderRemark: "Additional notes (optional)",

    btnSave: "Save Schedule",
    btnCancel: "Cancel",

    message: {
      needDate: "Please select a date",
      needTimeRange: "Please select time range",
      timeInvalid: "End time must be after start time",
      needPurpose: "Please enter purpose",
      loadFailed: "Failed to load schedules",
      createSuccess: "Schedule created",
      createFailed: "Failed to create schedule",
    },

    statusText: {
      pending: "Pending",
      approved: "Approved",
      rejected: "Rejected",
      canceled: "Canceled",
      finished: "Finished",
    },
  },

  /* ===================== Default Test Sets ===================== */
defaultTestSets: {
  title: 'Default Test Sets',
  totalTag: '{total} total',
  searchPlaceholder: 'Search: name / description',
  mine: 'Mine only',
  includeDeleted: 'Include deleted',
  empty: 'No data',
  labels: {
    total: 'Total',
    deleted: 'Deleted'
  },
  actions: {
    refresh: 'Refresh',
    view: 'View',
    delete: 'Delete',
    close: 'Close'
  },
  columns: {
    id: 'ID',
    name: 'Test Set Name',
    description: 'Description',
    fromProduct: 'Source Product',
    updatedAt: 'Updated At',
    actions: 'Actions'
  },
  messages: {
    fetchFailed: 'Failed to load default test sets',
    deleteFailed: 'Failed to delete default test set',
    deleteSuccess: 'Deleted successfully'
  },
  delete: {
    title: 'Delete Confirmation',
    confirm: 'Are you sure you want to delete default test set #{id}?'
  },
  detail: {
    title: 'Default Test Set Detail',
    fallbackName: 'Untitled Test Set',
    itemsTag: '{n} items',
    searchPlaceholder: 'Search: category / section / code / test case',
    loadFailed: 'Failed to load default test set detail',
    tip: 'Use search and planned-state filters to inspect this test set.',
    filters: {
      all: 'All',
      planned: 'Planned',
      unplanned: 'Unplanned'
    },
    columns: {
      category: 'Category',
      section: 'Section',
      code: 'Code',
      testCase: 'Test Case',
      planned: 'Planned'
    }
  }
},

  /* ===================== Files ===================== */
files: {
  title: "Files",
  totalTag: "Total: {total}",
  searchPlaceholder: "Search file name / display name…",
  categoryAll: "All categories",
  root: "Root",

  uploadCategoryPlaceholder: "Upload category",
  uploadTip: "Multiple selection supported; drag & drop upload",
  uploadDragText1: "Drop files here, or",
  uploadDragText2: "click to select",

  uploading: "Uploading…",
  replacing: "Replacing…",

  readonly: "Read-only",

  colName: "Name",
  colCategory: "Category",
  colSize: "Size",
  colActions: "Actions",

  btnNewFolder: "New folder",
  btnBulkDelete: "Bulk delete",
  btnMaintenance: "Maintenance",
  btnPurgeOrphan: "Purge orphan files (disk)",
  btnPurgeLegacy: "Purge legacy isDeleted=true (DB)",

  btnOpenFolder: "Open",
  btnRename: "Rename",
  btnReplace: "Replace",
  btnDownload: "Download",
  btnDelete: "Delete",

  renameDialogTitle: "Rename / Category",
  newFolderDialogTitle: "New folder",

  fieldDisplayName: "Display name",
  displayNamePlaceholder: "Enter display name (leave blank to use original name)",
  fieldCategory: "Category",

  fieldFolderName: "Folder name",
  folderNamePlaceholder: "Enter folder name",

  categories: {
    general: "General",
    sop: "SOP",
    report: "Report",
    machine: "Machine",
    image: "Image",
    dataset: "Dataset",
    other: "Other",
    os: "OS",
    driver: "Driver",
    firmware: "Firmware",
    cert: "Certification",
  },

  message: {
    loadFailed: "Failed to load",
    uploadSuccess: "Upload success",
    uploadFailed: "Upload failed",
    downloadFailed: "Download failed",
    updateSuccess: "Updated",
    updateFailed: "Update failed",
    replaceSuccess: "Replaced",
    replaceFailed: "Replace failed",
    deleteSuccess: "Deleted",
    deleteFailed: "Delete failed",
    noPermission: "Only uploader or admin can manage this item",
    folderNameRequired: "Folder name is required",
    createFolderSuccess: "Folder created",
    createFolderFailed: "Failed to create folder",
  },

  confirm: {
    titleSingle: "Confirm",
    titleMultiple: "Confirm",
    deleteSingle: "Delete “{name}”?",
    deleteMultiple: "Delete {count} item(s)?",
  },
},


  /* ===================== Logs ===================== */
  logs: {
    title: "System Logs",
    subtitle: "Audit Trail",

    filterActionPlaceholder: "Action",
    filterKeywordPlaceholder: "Keyword",
    rangeStartPlaceholder: "Start",
    rangeEndPlaceholder: "End",

    actionCreate: "CREATE",
    actionUpdate: "UPDATE",
    actionDelete: "DELETE",
    actionLogin: "LOGIN",
    actionRegister: "REGISTER",

    shortcutToday: "Today",
    shortcut7Days: "Last 7 days",
    shortcut30Days: "Last 30 days",

    colTime: "Time",
    colUser: "User",
    colAction: "Action",
    colTarget: "Target",
    colDetail: "Detail",

    targetEmpty: "-",

    btnReload: "Reload",
    fetchFailed: "Failed to load",
  },

  /* ===================== Machine Dashboard / Detail ===================== */
  machineDashboard: {
    title: "Machine Dashboard",
    tagRealtime: "Realtime",
    fieldUser: "user",
    searchPlaceholder: "Search machine name",
    btnReload: "Reload",

    colProgress: "Current Progress",
    fieldSchedule: "Schedule",
    fieldStatus: "Status",
    fieldStart: "Start",
    fieldEnd: "End",

    btnDetail: "Detail",
    btnNewSchedule: "New Schedule",
    btnStart: "Start",
    btnStop: "Stop",

    statusIdle: "Idle",
    statusRunning: "Running",
    statusStopped: "Stopped",
    statusMaintenance: "Maintenance",
    statusError: "Error",

    phaseRunning: "Running",
    phaseUpcoming: "Upcoming",
    phaseNone: "-",

    fetchFailed: "Failed to load",
    opSuccess: "Submitted",
    opFailed: "Operation failed",
    fieldTemp: "Temperature",
    fieldHumidity: "Humidity",

    previewLoadFailed: "Image load failed",
    previewEmpty: "No preview image",
    previewPick: "Choose from File Center",
    previewClear: "Clear preview",

    previewDialogTitle: 'Select preview for “{name}”',
    previewDialogTitleGeneric: "Select preview image",
    previewSearchPlaceholder: "Search image name…",
    previewCategoryPlaceholder: "Category (optional)",
    previewNoImages: "No matching images",
    previewApplyToMachine: "Apply to machine",

    previewCatAll: "All",
    previewCatMachine: "Machine",
    previewCatImage: "Image",
    previewCatGeneral: "general",

    previewFetchFilesFailed: "Failed to load files",
    previewUpdated: "Preview image updated",
    previewUpdateFailed: "Failed to update preview image",
    previewCleared: "Preview image cleared",
    previewClearFailed: "Failed to clear preview image",
  },

  machineDetail: {
    title: "Machine Detail",
    back: "Back",
    tagScheduleControl: "Controlled by Schedule",
    btnRefresh: "Reload",
    btnStart: "Start",
    btnStop: "Stop",

    fieldName: "Name",
    fieldSchedule: "Schedule",
    fieldStatus: "Status",
    fieldStart: "Start",
    fieldEnd: "End",
    fieldProgress: "Progress",
    fieldTemp: "Temperature",
    fieldHumidity: "Humidity",
    fieldRuntimeMinutes: "Runtime (min)",
    fieldLiveProgress: "Live Progress",
    unitMinutes: "min",
    updatedAtPrefix: "Updated: ",

    scheduleListTitle: "Schedules",
    colSchedule: "Schedule",
    colScheduleStatus: "Status",
    colScheduleProgress: "Progress",
    colScheduleStart: "Start",
    colScheduleEnd: "End",

    statusIdle: "Idle",
    statusRunning: "Running",
    statusStopped: "Stopped",
    statusMaintenance: "Maintenance",
    statusError: "Error",

    phaseRunning: "Running",
    phaseUpcoming: "Upcoming",
    phaseNone: "-",

    scheduleStatusScheduled: "Scheduled",
    scheduleStatusRunning: "Running",
    scheduleStatusCompleted: "Completed",
    scheduleStatusCanceled: "Canceled",
    scheduleStatusError: "Error",
    scheduleStatusFailed: "Failed",

    lockedHint:
      "This machine is currently controlled by schedule. Please adjust/cancel from the schedule page.",
    loadFailed: "Failed to load",
    opSuccess: "Submitted",
    opFailed: "Operation failed",

    btnSetpoint: "Set Temp/Humidity",
    setpointTitle: "Set Chamber Setpoint",
    setpointTemp: "Target Temperature",
    setpointHum: "Target Humidity",
    btnApplySetpoint: "Apply",
    btnClearHumidity: "Clear",
    setpointHint:
      "Submitting will update setpoint (DB first; will also try to send to chamber if chamberControl is configured).",
    setpointSuccess: "Setpoint submitted",
    setpointFail: "Failed to set setpoint",

    fieldTargetTemp: "Target Temp",
    fieldTargetHumidity: "Target Humidity",
    setpointAtPrefix: "Setpoint updated at: ",

    setpointTempInvalid: "Please enter a valid temperature",
    setpointTempOutOfRange: "Temperature out of range (-80 ~ 250°C)",
    setpointHumInvalid: "Please enter a valid humidity",
    setpointHumOutOfRange: "Humidity out of range (0 ~ 100%)",
  },

  /* ===================== Machine Schedule / Machine Tests ===================== */
  machineSchedule: {
    title: "Machine Test Schedule",
    headerTag: "Create / Manage",

    cardNewTitle: "New Schedule",
    cardListTitle: "Schedule List",

    fieldMachine: "Machine",
    fieldTestName: "Test Name",
    fieldTimeRange: "Time Range",
    fieldUser: "User",
    fieldUserPlaceholder: "Enter user",

    btnCreate: "Create",

    colMachine: "Machine",
    colTestName: "Test",
    colUser: "User",
    colStatus: "Status",
    colStart: "Start",
    colEnd: "End",
    colActions: "Actions",

    dlgEditTitle: "Edit Schedule",
    fieldStatus: "Status",

    status: {
      pending: "Pending",
      running: "Running",
      completed: "Completed",
      canceled: "Canceled",
    },

    confirmDelete: "Delete this schedule?",

    message: {
      loadFailed: "Failed to load schedules",
      needFullForm:
        "Please fill all required fields (machine / test name / user / time range).",
      createSuccess: "Schedule created",
      createFailed: "Failed to create schedule",
      updateSuccess: "Schedule updated",
      updateFailed: "Failed to save schedule",
      startSuccess: "Started",
      stopSuccess: "Stopped",
      opFailed: "Operation failed",
      deleteSuccess: "Schedule deleted",
      deleteFailed: "Failed to delete schedule",
    },
  },

  machineTest: {
    title: "Machine Test Schedule",
    tag: "Create / Manage",
    cardCreateTitle: "New Schedule",

    form: {
      machine: "Machine",
      machinePlaceholder: "Select machine",

      testProject: "Test Project",
      testProjectPlaceholder: "Enter test project",

      testName: "Test Item",
      testNamePlaceholder: "Select test item",

      user: "User",
      userPlaceholder: "Select user",
      time: "Time Range",
      submit: "Create",
    },

    listTitle: "Schedule List",

    table: {
      machine: "Machine",
      project: "Test Project",
      test: "Test Item",
      user: "User",
      status: "Status",
      start: "Start",
      end: "End",
      actions: "Actions",
    },

    action: {
      edit: "Edit",
      start: "Start",
      stop: "Stop",
      delete: "Delete",
      deleteConfirm: "Are you sure you want to delete this schedule?",
    },

    dialog: {
      editTitle: "Edit Schedule",
      statusLabel: "Status",
    },

    rangeShortcut: {
      today: "Today (work hours)",
      tomorrow: "Tomorrow (work hours)",
    },

    msg: {
      fillAll:
        "Please fill in all required fields (machine / test project / test item / user / time).",
      loadMachinesFail: "Failed to load machine list.",
      loadSchedulesFail: "Failed to load schedule list.",
      loadUsersFail: "Failed to load user list.",
      createSuccess: "Schedule created successfully.",
      createFail: "Failed to create schedule.",
      updateSuccess: "Schedule updated successfully.",
      updateFail: "Failed to update schedule.",
      deleteSuccess: "Schedule deleted successfully.",
      deleteFail: "Failed to delete schedule.",
      opFail: "Operation failed.",
      startSuccess: "Start command sent.",
      stopSuccess: "Stop command sent.",

      customTestItemTitle: "Custom Test Item",
      customTestItemMessage: "Please enter a custom test item:",
      customTestItemError: "Test item cannot be empty",
    },
  },

  /* ===================== Reliability Capacity ===================== */
  reliabilityCapacity: {
    title: "Reliability Capacity",
    tagRealtime: "Realtime",
    updatedAt: "Updated: {time}",

    apiFailed: "API returned failure",
    fetchFailed: "Failed to fetch reliability capacity",

    summary: {
      chamber15Count: "Qualified Chamber 1–5 count",
      totalSlots: "Total nominal DUT slots",
      usedSlots: "Currently used",
      freeSlots: "Available",
    },

    overview: {
      title: "Overall utilization (Chamber 1–5)",
      currentUtilization: "Current utilization",
      legendUsed: "Used {used}",
      legendFree: "Free {free}",
      nominalSlots: "Nominal DUT slots",
      used: "Used",
      free: "Available",
      hint1:
        "※ Chamber 1–5: nominal capacity is 2 per machine; 1 schedule = 1 slot (50%)",
      hint2:
        "※ Chamber 1–5: temp < 20°C AND scheduled => 100% utilized",
    },

    table: {
      title: "Machine capacity details (Chamber 1–5)",
      empty: "No data for Chamber 1–5",
      chamber: "Chamber",
      chamberWithNo: "Chamber {no}",
      name: "Machine name",
      model: "Model",
      code: "Code",
      status: "Status",
      currentTemp: "Current temp (°C)",
      nominalSlots: "Nominal DUT slots",
      usedSlots: "Used",
      freeSlots: "Free",
      includeInSummary: "Included",
      utilization: "Utilization",
    },

    chamber6: {
      title: "Chamber 6 status (excluded from overall)",
      name: "Machine name",
      model: "Model",
      code: "Code",
      nominalSlots: "Nominal DUT slots",
      usedSlots: "Used",
      freeSlots: "Free",
      utilization: "Utilization",
      currentTemp: "Current temp",
    },
  },

  /* ===================== Equipment ===================== */
  equipment: {
    title: "Equipment",
    searchPlaceholder: "Search: name / asset code / location / keeper",
    btnNew: "New Item",
    now: "Now: {time}",

    stock: {
      title: "Inventory",
      totalTag: "Total {total} (Page {page} / {pageSize} per page)",
      colImage: "Image",
      colName: "Name",
      colAssetCode: "Asset Code",
      colLocation: "Location",
      colKeeper: "Keeper",
      colTotalQty: "Total",
      colAvailableQty: "Available",
      colCalibration: "Calibration",
      colRemark: "Remark",
    },

    myLoans: {
      title: "My Loans",
      filterStatus: "Status",
      statusAll: "All",
      colName: "Item",
      colQty: "Qty",
      colBorrowedAt: "Borrowed At",
      colExpectedReturn: "Expected Return",
      colReturnedAt: "Returned At",
      colStatus: "Status",
      rejectReasonTip: "Reject reason: {reason}",
    },

    actions: {
      borrow: "Borrow",
      view: "View",
      return: "Return",
    },

    status: {
      pending: "Pending",
      rejected: "Rejected",
      borrowed: "Borrowed",
      overdue: "Overdue",
      returned: "Returned",
    },

    borrowDialog: {
      title: "Borrow Equipment",
      item: "Item",
      qty: "Qty",
      available: "Available: {n}",
      expectedReturn: "Expected Return",
      pickDate: "Pick date & time",
      remark: "Remark",
      remarkPlaceholder: "Purpose / notes…",
      hint:
        "After submit, it will be pending review. It becomes borrowed only after approval.",
      submit: "Submit",
    },

    editDialog: {
      titleNew: "New Equipment",
      titleEdit: "Edit Equipment",
      name: "Name",
      assetCode: "Asset Code",
      location: "Location",
      keeper: "Keeper",
      totalQty: "Total",
      availableQty: "Available",
      calibrationDate: "Calibration Date",
      pickDate: "Pick date",
      imageUrl: "Image URL",
      remark: "Remark",
    },

    viewDialog: {
      title: "Equipment Info",
      name: "Name",
      assetCode: "Asset Code",
      location: "Location",
      keeper: "Keeper",
      totalQty: "Total",
      availableQty: "Available",
      calibrationDate: "Calibration Date",
      remark: "Remark",
    },

    confirmReturnTitle: "Confirm",
    confirmReturnText: "Return this equipment?",
    confirmDeleteTitle: "Delete",
    confirmDeleteText: 'Delete "{name}"?',

    msgLoadListFail: "Failed to load equipment list",
    msgLoadLoansFail: "Failed to load loan records",
    msgQtyInvalid: "Quantity must be a positive integer",
    msgQtyOver: "Quantity exceeds available",
    msgBorrowSubmitted: "Submitted. Pending review.",
    msgBorrowFail: "Borrow failed",
    msgReturnFail: "Return failed",
    msgReturned: "Returned",
    msgNameRequired: "Name is required",
    msgSaved: "Saved",
    msgSaveFail: "Save failed",
    msgDeleted: "Deleted",
    msgDeleteFail: "Delete failed",
  },

  /* ===================== Warehouse ===================== */
warehouse: {
  title: 'Warehouse Management',

  layout: {
    subtitle: 'Inventory and Borrow Records',
  },

  nav: {
    items: 'Inventory',
    borrows: 'Borrow Records',
  },

  header: {
    totalTag: '{total} items ({shown} shown)',
  },

  actions: {
    newItem: 'New Item',
  },

  filters: {
    now: 'Current time: {time}',
    keywordPlaceholder: 'Search: name / code / location',
    typePlaceholder: 'Type',
    statusPlaceholder: 'Status',
    filtered: 'Filters applied',
  },

  types: {
    all: 'All',
    machine: 'Machine',
    part: 'Part',
    tool: 'Tool',
    fixture: 'Fixture',
    other: 'Other',
    instrument: 'Instrument',
  },

  statusOptions: {
    all: 'All',
    normal: 'Normal',
    partial_damage: 'Partial Damage',
    disabled_scrap: 'Disabled / Scrap',
  },

  stock: {
    title: 'Inventory List',
    columns: {
      image: 'Image',
      type: 'Type',
      name: 'Name',
      code: 'Code / Asset No.',
      location: 'Location',
      totalQty: 'Total',
      currentQty: 'Available',
      hasPeripheral: 'Peripheral',
      os: 'OS',
      status: 'Status',
      remark: 'Remark',
    },
    status: {
      normal: 'Normal',
      partial_damage: 'Partial Damage',
      disabled_scrap: 'Disabled / Scrap',
      unknown: 'Unknown',
    },
    peripheralYes: 'Included',
    peripheralNo: 'None',
    borrowButton: 'Borrow',
    deleteConfirm: 'Are you sure you want to delete this item?',
  },

  borrowDialog: {
    title: 'Borrow',
    itemSub: 'Type: {type}, Available: {qty}',
    fields: {
      itemName: 'Item',
      quantity: 'Quantity',
      purpose: 'Purpose',
      expectedReturnAt: 'Expected Return',
      remark: 'Remark',
    },
    placeholders: {
      purpose: 'Enter purpose',
      expectedReturnAt: 'Select date and time',
      remark: 'Optional',
    },
    actions: {
      cancel: 'Cancel',
      submit: 'Submit',
    },
  },

  itemDialog: {
    createTitle: 'New Item',
    editTitle: 'Edit Item',
    cover: 'Cover',
    imageHint: 'The first image is the cover shown in the list. Use ↑↓ to reorder.',
    imagePicked: 'Selected: ',
    imageUnit: '',
    coverFileId: 'Cover File ID: ',
    fields: {
      type: 'Type',
      name: 'Name',
      code: 'Code / Asset No.',
      location: 'Location',
      totalQty: 'Total Quantity',
      status: 'Status',
      hasPeripheral: 'Peripheral',
      hasPeripheralText: 'Peripheral',
      os: 'OS',
      image: 'Image',
      remark: 'Remark',
    },
    placeholders: {
      os: 'Select OS',
    },
    actions: {
      chooseImage: 'Choose Image',
      clearImage: 'Clear',
      cancel: 'Cancel',
      create: 'Create',
      save: 'Save',
    },
  },

  imagePicker: {
    title: 'Select Image (File Center)',
    searchPlaceholder: 'Search image filename...',
    empty: 'No images',
    picked: 'Added',
    pick: 'Use this image',
    columns: {
      preview: 'Preview',
      name: 'Filename',
      category: 'Category',
      updated: 'Updated At',
      actions: 'Actions',
    },
    loadFailed: 'Failed to load images',
  },

  borrowRecords: {
    title: 'Borrow Records',
    totalTag: '{total} records',

    scopeTitle: 'Borrow record scope',
    scopeMineOnly: 'Showing only my borrow records',
    scopeAll: 'Showing all borrow records',
    mineOnlyOn: 'Mine only',
    mineOnlyOff: 'All records',
    mineOnlyFixed: 'My records only',

    filters: {
      status: 'Borrow Status',
      reviewStatus: 'Review Status',
    },

    status: {
      all: 'All',
      requested: 'Requested',
      borrowed: 'Borrowed',
      returned: 'Returned',
      canceled: 'Canceled',
      rejected: 'Rejected',
    },

    reviewStatus: {
      all: 'All',
      pending: 'Pending',
      approved: 'Approved',
      rejected: 'Rejected',
      canceled: 'Canceled',
    },

    columns: {
      item: 'Item',
      borrower: 'Borrower',
      quantity: 'Qty',
      purpose: 'Purpose',
      expectedReturnAt: 'Expected Return',
      createdAt: 'Requested At',
      status: 'Borrow Status',
      reviewStatus: 'Review Status',
      reviewNote: 'Review Info',
    },

    actions: {
      approve: 'Approve',
      reject: 'Reject',
      cancel: 'Cancel',
      return: 'Return',
    },

    confirm: {
      cancel: 'Are you sure you want to cancel this request?',
      return: 'Mark this record as returned?',
    },

    rejectReason: 'Reject reason: ',

    reviewDialog: {
      approveTitle: 'Approve Borrow Request',
      rejectTitle: 'Reject Borrow Request',
      item: 'Item',
      itemSub: 'Qty: {quantity}, Borrower: {borrower}',
      note: 'Note',
      notePlaceholder: 'Optional',
      rejectReason: 'Reject Reason',
      rejectReasonPlaceholder: 'Please enter the reject reason',
      rejectReasonRequired: 'Please enter the reject reason',
    },
  },

  rules: {
    quantityRequired: 'Please enter quantity',
    quantityPositive: 'Quantity must be greater than 0',
    quantityExceed: 'Quantity exceeds available stock',
    purposeRequired: 'Please enter purpose',
    typeRequired: 'Please select a type',
    nameRequired: 'Please enter item name',
    totalQtyNonNegative: 'Total quantity cannot be negative',
    statusRequired: 'Please select a status',
  },

  messages: {
    noStock: 'Insufficient available quantity',
    disabledScrapCannotBorrow: 'This item is disabled / scrap and cannot be borrowed',
    loadItemsFailed: 'Failed to load inventory',
    borrowSuccess: 'Borrow request submitted',
    borrowFailed: 'Borrow failed',
    loadBorrowsFailed: 'Failed to load borrow records',
    saveItemSuccessNew: 'Item created',
    saveItemSuccessEdit: 'Item updated',
    saveItemFailed: 'Save failed',
    deleteItemSuccess: 'Deleted successfully',
    deleteItemFailed: 'Delete failed',
    cancelBorrowSuccess: 'Borrow request canceled',
    cancelBorrowFailed: 'Failed to cancel borrow request',
    returnBorrowSuccess: 'Marked as returned',
    returnBorrowFailed: 'Failed to return item',
    reviewApproveSuccess: 'Borrow request approved',
    reviewRejectSuccess: 'Borrow request rejected',
    reviewBorrowFailed: 'Failed to review borrow request',
  },
},

  /* ===================== OS Recovery ===================== */
  osRecovery: {
    title: "OS Recovery Center",
    subtitle: "Quick lookup for OS image recovery info",

    actions: {
      refresh: "Refresh",
      create: "New Image",
      editShort: "Edit",
      downloadShort: "Download",
    },

    type: {
      standard: "Standard",
      custom: "Custom",
    },

    osFamily: {
      unknown: "Unknown",
    },

    filters: {
      osFamily: "OS Family",
      osFamilyPlaceholder: "Select OS family",
      osFamilyAll: "All",
      osFamilyWin11: "Windows 11 (Win11)",
      osFamilyWin10: "Windows 10 (Win10)",
      osFamilyWin81: "Windows 8.1",
      osFamilyWin7: "Windows 7 (Win7)",
      osFamilyXPP: "Windows XP Pro (XPP)",
      osFamilyXPE: "Windows XP Embedded (XPE)",

      imageType: "Image Type",
      imageTypePlaceholder: "Select image type",

      onlyLatest: "Only latest version",
      onlyLatestTip:
        "Only keep the newest record for same board / edition / language",

      board: "Board Model",
      boardPlaceholder: "e.g. SBC-xxxx",

      product: "Product Model",
      productPlaceholder: "e.g. system model",

      language: "Language",
      languagePlaceholder: "e.g. Multi-Lang, Eng-Twn",

      edition: "Edition",
      editionPlaceholder: "e.g. Pro, Home",

      version: "Version",
      versionPlaceholder: "e.g. 21H2",

      licenseType: "License Type",
      licenseTypePlaceholder: "e.g. EPKEA, PKEA",

      keyword: "Keyword",
      keywordPlaceholder: "Search part no. / model / customer code / notes",
    },

    buttons: {
      search: "Search",
      reset: "Reset",
    },

    table: {
      title: "Image List",
      totalPrefix: "",
      totalSuffix: " record(s)",
      keywordLabel: ", keyword: ",

      cols: {
        actions: "Actions",
        pnIso: "P/N / ISO",
        osFamily: "OS Family",
        type: "Type",
        mbModel: "Board Model",
        mbRevision: "Board Revision",
        productModels: "Product Models",
        edition: "Edition",
        version: "Version",
        licenseType: "License Type",
        language: "Language",
        notes: "Notes",
      },
    },

    note: {
      more: "Detail",
      title: "Notes",
      meta: {
        os: "OS: ",
        board: "Board / Product: ",
      },
      close: "Close",
    },

    messages: {
      fetchError: "Failed to load OS image list, please try again later",
    },
  },

  /* ===================== Safety Reports ===================== */
safetyReports: {
  title: "Safety Reports",
  totalCount: "{count} certification(s)",
  groupCount: "{count} certification(s)",
  ungrouped: "Ungrouped",
  searchPlaceholder: "Search model / code / cert type / lab",

  actions: {
    create: "New Certification",
    openFile: "Open File",
  },

  columns: {
    modelName: "Model Name",
    modelCode: "Model Code",
    certType: "Certification Type",
    standard: "Applicable Standard",
    lab: "Lab",
    issueDate: "Open Date",
    status: "Status",
    remark: "Remark",
  },

  fields: {
    groupName: "Group Name",
    modelName: "Model Name",
    modelCode: "Model Code",
    certType: "Certification Type",
    standard: "Applicable Standard",
    lab: "Lab",
    issueDate: "Open Date",
    status: "Status",
    filePath: "File Path",
    remark: "Remark",
  },

  placeholders: {
    groupName: "e.g. AITRON",
    modelName: "e.g. AITRON-921EPH",
    modelCode: "e.g. AITRON-921EPH",
    certType: "e.g. Environmental / EMC / Safety",
    standard: "e.g. IEC 62368-1 / CE / FCC",
    lab: "e.g. BenQ QA Lab",
    issueDate: "Select date",
    status: "Select status",
    filePath: "File center path or URL",
    remark: "Remark",
  },

  dialog: {
    createTitle: "New Safety Certification",
    editTitle: "Edit Safety Certification",
    viewTitle: "Certification Detail",
  },

  timelineTitle: "Certification Progress",
  timelineStart: "Start",
  timelineEnd: "Done",
  timelineStep: "Step {current} / {total}",

  statusGroup: {
    inProgress: "In Progress",
    others: "Others",
  },

  statusOptions: {
    spec_communication: "Requirement / Spec Discussion",
    lab_quotation: "Request Lab Quotation",
    quotation_approval: "Quotation Approval",
    docs_to_lab: "Prepare Documents for Lab",
    purchase_request: "Create Purchase Request",
    pickup_and_install_os: "Pick Up Unit and Install OS",
    send_to_lab: "Send Unit to Lab",
    lab_testing: "Lab Testing",
    draft_report_review: "Draft Report Review",
    machine_returned: "Machine Returned",
    final_report_uploaded: "Final Report Uploaded",
    waiting_invoice: "Waiting for Invoice",
    reimbursement: "Reimbursement",
    paused: "Paused",
    completed: "Completed",
  },

  validation: {
    groupName: "Please enter group name",
    modelName: "Please enter model name",
    modelCode: "Please enter model code",
    certType: "Please enter certification type",
    issueDate: "Please select open date",
    status: "Please select status",
  },

  messages: {
    loadFailed: "Failed to load safety certifications",
    saveFailed: "Failed to save safety certification",
    deleteFailed: "Failed to delete safety certification",
    created: "Created successfully",
    updated: "Updated successfully",
    deleted: "Deleted successfully",
    deleteConfirm: "Are you sure you want to delete this certification?",
  },
},


  /* ===================== Doc Manager ===================== */
  docManager: {
    title: "Product Management",
    tag: "Model document progress tracking",

    selectModel: "Select Model",
    modelAll: "All Models",
    keywordPH: "Search model code / remark…",
    btnRefresh: "Refresh",

    btnAdd: "Add",

    colModelCode: "Model Code",
    colProgress: "Progress",
    colRemark: "Remark",
    colUpdated: "Updated At",

    actionEdit: "Edit",

    dialogTitle: "Update Document Status",
    fieldProgress: "Progress",
    fieldRemark: "Remark",
    remarkPH: "Type remark (optional)",

    btnCreate: "Create",
    createDialogTitle: "Add Model Document",
    fieldFamily: "Model Family",
    fieldModelCode: "Model Code",
    modelCodePH: "e.g., ABC-1234",

    errNeedFamily: "Please select a model family",
    errNeedModelCode: "Please enter a model code",
    created: "Created",

    summaryTotal: "Total",
    summaryDone: "Done",
    summaryAvg: "Average",
  },

  /* ===================== Test Requests ===================== */
  testRequests: {
    title: "Test Requests",
    subtitle: "For project owners to submit test demands so labs can manage workload",

    actions: {
      refresh: "Refresh",
      create: "New Request",
      applyFilters: "Apply Filters",
      clearFilters: "Clear",
      save: "Save",
      cancel: "Cancel",
      edit: "Edit",
      delete: "Delete",
      confirmDeleteTitle: "Delete",
      confirmDeleteMessage: 'Delete the test request "{title}"?',
    },

    summary: {
      total: "Total Requests",
      pending: "Pending",
      inProgress: "In Progress",
      completed: "Completed",
    },

    filters: {
      keywordLabel: "Keyword",
      keywordPlaceholder: "Search by title / product model / creator",
      statusLabel: "Status",
      statusPlaceholder: "All statuses",
      dateLabel: "Expected Start",
    },

    columns: {
      requestNo: "Request No.",
      title: "Title",
      productName: "Product / Model",
      category: "Category",
      testItemCount: "Est. Test Items",
      sampleQty: "Sample Qty",
      priority: "Priority",
      expectedStart: "Expected Start",
      expectedEnd: "Expected End",
      status: "Status",
      assignee: "Assignee",
      createdBy: "Created By",
      createdAt: "Created At",
      actions: "Actions",
    },

    footer: {
      total: "Total {count} test requests",
    },

    dialog: {
      createTitle: "New Test Request",
      editTitle: "Edit Test Request",
      fields: {
        title: "Title",
        productName: "Product / Model",
        category: "Category",
        testItemCount: "Est. Test Items",
        sampleQty: "Sample Qty",
        priority: "Priority",
        dateRange: "Expected Period",
        status: "Status",
        assignee: "Assignee",
        remark: "Remark",
      },
      placeholders: {
        title: "e.g. ARCHMI-U-816CP new model test",
        productName: "e.g. ARCHMI-U-816CP / custom model",
        remark:
          "Describe test background, special conditions (customer spec, temperature range, standards, etc.)",
      },
      dateRangeSeparator: "to",
      dateStartPlaceholder: "Start Date",
      dateEndPlaceholder: "End Date",
      categoryPlaceholder: "Select",
      statusPlaceholder: "Select",
      assigneePlaceholder: "Unassigned",
    },

    category: {
      HW: "Hardware",
      RELI: "Reliability",
      STAB: "Stability",
      PWR: "Power",
      THERM: "Thermal",
      ESD: "ESD",
      MECH: "Mechanical",
      OTHER: "Other",
    },

    status: {
      pending: "Pending",
      in_progress: "In Progress",
      completed: "Completed",
      cancelled: "Canceled",
    },

    priority: {
      low: "Low",
      medium: "Medium",
      high: "High",
    },

    messages: {
      fetchFailed: "Failed to load test requests",
      saveSuccess: "Test request saved",
      saveFailed: "Failed to save test request",
      deleteSuccess: "Test request deleted",
      deleteFailed: "Failed to delete test request",
    },

    validation: {
      titleRequired: "Please enter title",
      productNameRequired: "Please enter product / model",
      categoryRequired: "Please select category",
      testItemCountRequired: "Please enter estimated test items",
      sampleQtyRequired: "Please enter sample quantity",
      statusRequired: "Please select status",
    },
  },

  /* ===================== Test Support ===================== */
  testSupport: {
    title: "Test Support Records",
    subtitle:
      "Record test support you provide to other projects/departments, including content and man-hours, for later statistics and tracking.",

    header: {
      refresh: "Refresh",
    },

    form: {
      title: "Add Test Support Record",
      hint: "For example: helping Reliability Lab, sales projects, RMA analysis…",

      fields: {
        supportDate: "Support Date",
        supportDatePlaceholder: "Select date",

        requesterDept: "Request Dept.",
        requesterDeptPlaceholder: "e.g. Reliability / Service / Project A Team",

        requester: "Requester",
        requesterPlaceholder: "Contact person name (optional)",

        supporter: "Supporter",
        supporterPlaceholder: "Select supporter",

        projectName: "Project / Product",
        projectNamePlaceholder: "e.g. ARCHMI-U-816CP / RMA case no.",

        testType: "Support Type",
        testTypePlaceholder: "Select type",

        relatedNo: "Related No.",
        relatedNoPlaceholder: "e.g. test request no. / RMA no. / internal tracking no.",

        testContent: "Support Content",
        testContentPlaceholder:
          "Briefly describe what tests were run, which tools were used, and whether any issues were found.",

        hours: "Support Hours (hr)",
        status: "Status",

        note: "Note",
        notePlaceholder: "Special situations or follow-up items…",
      },

      testTypeOptions: {
        system: "System Function Test",
        reli: "Reliability / Environmental Test",
        rma: "RMA / Complaint Analysis",
        cert: "Verification / Certification",
        other: "Other",
      },

      statusOptions: {
        done: "Done",
        doing: "In Progress",
        pending: "Pending / Waiting",
      },

      actions: {
        submit: "Create Record",
        reset: "Reset Form",
      },
    },

    rules: {
      supportDateRequired: "Please select the support date.",
      requesterDeptRequired: "Please enter the requesting department.",
      supporterRequired: "Please select a supporter.",
      projectNameRequired: "Please enter the project / product.",
      testContentRequired: "Please describe the support content.",
      hoursRequired: "Please enter support hours.",
      hoursMin: "Hours must be greater than 0.",
      statusRequired: "Please select a status.",
    },

    list: {
      title: "Recent Support Records",
      hint: "Shows recent support activities. You can add more filters or export later.",

      summary: {
        count: "Count: {count}",
        totalHours: " · Total hours: about {hours} hr",
      },

      table: {
        empty: "No support records yet. You can create one on the left.",

        columns: {
          date: "Date",
          requesterDept: "Request Dept.",
          projectName: "Project / Product",
          testContent: "Support Content",
          hours: "Hours",
          status: "Status",
          supporterName: "Supporter",
          actions: "Actions",
        },

        actions: {
          edit: "Edit",
        },
      },
    },

    editDialog: {
      title: "Edit Supporter / Status",
      fields: {
        supporter: "Supporter",
        status: "Status",
      },
      actions: {
        cancel: "Cancel",
        save: "Save",
      },
    },

    messages: {
      unauthorized: "Login expired or unauthorized. Please sign in again.",
      networkError: "Network error. Please try again later.",
      createSuccess: "Support record created.",
      createFailed:
        "Failed to create support record. Please try again or contact the admin.",

      updateNoPermission: "Only administrators can edit supporter and status.",
      updateSuccess: "Support record updated.",
      updateFailed: "Failed to update support record. Please try again later.",

      loadUsersFailed: "Failed to load user list.",
      loadSupportFailed: "Failed to load support records.",
    },
  },

  /* ===================== Suggestions ===================== */
  suggestion: {
    title: "Feedback",
    headerRecentCount: "Last {count} items",
    btnViewAll: "View all records »",

    formTitle: "Submit a suggestion",
    formThanks: "Thank you for your feedback 🙌",

    fieldTitle: "Title",
    fieldPriority: "Priority",
    fieldContent: "Content",

    placeholderTitle: "Short description (e.g. Product Test page is too crowded)",
    placeholderContent:
      "Describe your request, steps to reproduce, or expected behavior (you may attach screenshots).",

    priority: {
      P1: "High (P1)",
      P2: "Medium (P2)",
      P3: "Low (P3)",
      unknown: "Unknown ({value})",
    },

    status: {
      pending: "Pending",
      inProgress: "In Progress",
      closed: "Closed",
    },

    btnSubmit: "Submit",
    btnReset: "Clear",

    rightTitle: "My Recent Suggestions",
    btnReload: "Reload",
    empty: "No suggestion records yet",

    adminReplyPrefix: "Admin reply: ",
    adminPendingReply: "Not replied yet",

    rules: {
      titleRequired: "Please enter title",
      contentRequired: "Please enter content",
    },

    message: {
      sent: "Feedback submitted, thank you!",
      sendFailed: "Submit failed",
      loadFailed: "Failed to fetch my suggestions",
    },
  },

  suggestionMine: {
    title: "My Suggestions",
    tagList: "List",

    filterStatusPlaceholder: "Status",
    searchPlaceholder: "Search title / content",
    btnReload: "Reload",

    colIndex: "#",
    colTitle: "Title",
    colPriority: "Priority",
    colStatus: "Status",
    colCreatedAt: "Created At",
    colActions: "Actions",

    confirmDelete: "Delete this suggestion?",

    status: {
      pending: "Pending",
      reviewed: "Reviewed",
      resolved: "Resolved",
    },

    priority: {
      P1: "High (P1)",
      P2: "Medium (P2)",
      P3: "Low (P3)",
    },

    message: {
      loadFailed: "Failed to load",
      loadFailedNetwork: "Cannot reach API, please check backend",
      deleteSuccess: "Deleted",
      deleteFailed: "Delete failed",
    },
  },

  suggestionsMgmt: {
    title: "🗂️ Suggestions Admin",
    tagAdmin: "Admin",

    filterStatus: "Status",
    filterPriority: "Priority",
    filterKeywordPlaceholder: "Search title / content / user",

    colTitle: "Title",
    colPriority: "Priority",
    colStatus: "Status",
    colOwner: "Owner",
    colCreatedAt: "Created At",

    dlgEditTitle: "Edit Suggestion",
    fieldTitle: "Title",
    fieldPriority: "Priority",
    fieldStatus: "Status",
    fieldContent: "Content",
    fieldReply: "Reply",

    btnMarkReviewed: "Mark Reviewed",
    btnMarkResolved: "Mark Resolved",

    status: {
      pending: "Pending",
      reviewed: "Reviewed / In Progress",
      resolved: "Resolved",
    },

    confirmDeleteOne: "Delete this suggestion?",

    message: {
      loadFailed: "Failed to load",
      updateSuccess: "Updated",
      updateFailed: "Update failed",
      saveSuccess: "Saved",
      saveFailed: "Save failed",
      deleteSuccess: "Deleted",
      deleteFailed: "Delete failed",
      bulkSuccess: "Bulk update done",
      bulkFailed: "Bulk update failed",
      invalidStatus: "Invalid status",
      networkError: "Cannot reach API, please check backend",
    },
  },

  /* ===================== Auth Pages ===================== */
  login: {
    title: "Test System",
    welcomeTag: "Welcome",
    tooltipTheme: "Toggle theme",

    langPlaceholder: "Select language",

    capsLockOn: "Caps Lock is ON",

    fieldUsername: "Username",
    fieldPassword: "Password",
    rememberMe: "Remember me",
    btnLogin: "Login",
    linkRegister: "Create account",
    linkForgot: "Reset password",

    apiLabel: "API: ",

    ruleUsernameRequired: "Please enter username",
    rulePasswordRequired: "Please enter password",

    message: {
      success: "Welcome back!",
      failedWithStatus: "Login failed ({status})",
      failedDefault: "Login failed",
      networkError:
        "Cannot connect to API. Please check backend port and Vite proxy config.",
    },
  },

  register: {
    title: "Register",
    subtitleTag: "Create a new account",

    fieldUsername: "Username",
    fieldName: "Full Name",
    fieldEmail: "Email",
    fieldPassword: "Password",

    btnSubmit: "Create Account",
    btnBackLogin: "Back to Login",

    rules: {
      usernameRequired: "Please enter username",
      nameRequired: "Please enter full name",
      emailRequired: "Please enter email",
      emailFormat: "Invalid email format",
      passwordRequired: "Please enter password",
      passwordMin: "Password must be at least 8 characters",
    },

    message: {
      success: "Account created, please log in with your new account",
      failedWithStatus: "Register failed ({status})",
      failedDefault: "Register failed, please try again later",
      networkError:
        "Cannot connect to API. Please check backend service and proxy config.",
    },
  },

  forgotPassword: {
    title: "Reset Password",
    subtitle: "Set New Password",

    tokenMissingAlert:
      "Reset token not found. Please make sure you came from the email link, or paste the token manually.",

    fieldToken: "Token",
    fieldNewPassword: "New Password",
    fieldConfirm: "Confirm Password",

    tokenPlaceholder:
      "The string after ?token=, or it will be filled automatically when opened from the email link",

    ruleTokenRequired: "Missing reset token",
    rulePasswordRequired: "Please enter new password",
    rulePasswordMin: "At least 8 characters",
    ruleConfirmRequired: "Please confirm new password",
    ruleConfirmMismatch: "Passwords do not match",

    strengthText: {
      weak: "Strength: weak",
      medium: "Strength: medium",
      strong: "Strength: strong",
    },

    btnSubmit: "Set New Password",
    btnBackLogin: "Back to Login",

    messageSuccess: "Password updated, please log in again",
    messageFailed: "Reset failed",
  },

  /* ===================== User Admin / Stats ===================== */
userAdmin: {
  title: "User Management",
  tag: { admin: "Admin" },
  search: { placeholder: "Search user / Email" },
  actions: {
    refresh: "Refresh",
    create: "New",
  },
  table: {
    columns: {
      username: "Username",
      name: "Name",
      email: "Email",
      role: "Role",
      includeInStats: "In stats?",
      workCapacity: "Work capacity",
      createdAt: "Created At",
      actions: "Actions",
    },
    includeInStatsYes: "Yes",
    includeInStatsNo: "No",
    resetPassword: "Reset Password",
    edit: "Edit",
    delete: "Delete",
    pop: {
      // ✅ fixed 8 zeros
      resetConfirm: "Reset password to 00000000?",
      deleteConfirm: "Delete this account?",
    },
  },
  dialog: {
    createTitle: "Create User",
    editTitle: "Edit User",
    fields: {
      username: "Username",
      name: "Name",
      email: "Email",
      role: "Role",
      includeInStats: "Include in stats",
      workCapacity: "Work capacity",
      password: "Initial Password",
    },
    includeInStatsYes: "Yes",
    includeInStatsNo: "No",
    actions: {
      cancel: "Cancel",
      save: "Save",
    },
  },

  roles: {
    admin: "admin (Administrator)",
    user: "user",
    supervisor: "supervisor",
    guest: "guest",
  },

  rules: {
    required: "Required",
    emailRequired: "Please enter email",
    emailFormat: "Invalid email format",
    roleRequired: "Please select role",
    passwordRequired: "Please enter password",
  },
  messages: {
    authExpired: "Session expired, please log in again",
    loadFailed: "Failed to load",
    loadFailedNetwork: "Cannot reach API, please check backend",
    saveSuccess: "Saved",
    saveFailed: "Save failed",
    saveConflict: "Username or email already exists",
    updateSuccess: "Updated",
    updateFailed: "Update failed",

    // ✅ fixed reset message
    resetSuccess: "Password has been reset to 00000000",
    // ✅ for Users.vue (if you use resetSuccessFixed)
    resetSuccessFixed: "✅ Password has been reset to 00000000",

    // (legacy texts kept; can be removed if not used anywhere)
    resetSuccessWithEmail: "Reset email sent to {email}",
    resetLinkCopied: "Reset link copied to clipboard",

    resetFailed: "Reset failed",
    deleteSuccess: "Deleted",
    deleteFailed: "Delete failed",

    roleUpdated: "Role updated",
    roleUpdateFailed: "Failed to update role",
  },
},


  userPlanStats: {
    title: "User Workload Statistics",
    tag: "Workload / Capacity Overview",
    refresh: "Refresh",

    totalPlans: "NPDP count",
    totalDemands: "Demand tickets",
    totalSupports: "Test supports",

    detailCharts: "Detail charts",
    noData: "No statistics available",

    allUsersBarTitle: "All Users Workload (Bar)",
    allUsersCapacityPieTitle: "All Users Capacity (Pie)",

    userSectionTitle: "Per-user Details",
    userTotalLabel: "Total workload",
    userCapacityHint: "Capacity per user",

    metricPlan: "NPDP",
    metricDemand: "Demand",
    metricSupport: "Test support",

    userPieTotalLabel: "Total workload",

    axisCount: "Count",
    seriesPlan: "NPDP",
    seriesDemand: "Demand",
    seriesSupport: "Test support",

    tooltipWorkloadLabel: "Workload",
    tooltipOverloadLabel: "Over capacity",
    capacityPieSeriesName: "User capacity",

    totalCapacityLabel: "Test capacity",
    capacityRatioLabel: "Capacity ratio",

    fetchError: "Failed to fetch user workload stats",
  },

  userList: {
    title: "User List",
    tag: {
      view: "View",
    },
    actions: {
      goAdmin: "Go to Admin",
    },
  },
}
