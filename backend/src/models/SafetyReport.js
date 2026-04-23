// backend/src/models/SafetyReport.js
import { Model, DataTypes } from 'sequelize'

export const SAFETY_REPORT_STATUS_VALUES = [
  'spec_communication',
  'lab_quotation',
  'quotation_approval',
  'docs_to_lab',
  'purchase_request',
  'pickup_and_install_os',
  'send_to_lab',
  'lab_testing',
  'draft_report_review',
  'machine_returned',
  'final_report_uploaded',
  'waiting_invoice',
  'reimbursement',
  'paused',
  'completed',
]

const STATUS_SET = new Set(SAFETY_REPORT_STATUS_VALUES)

function clean(v) {
  return String(v ?? '').trim()
}

function normalizeStatus(val) {
  const raw = clean(val)
  if (!raw) return 'spec_communication'

  // 新中文流程
  if (raw === '需求單位規格溝通') return 'spec_communication'
  if (raw === '找實驗室詢價') return 'lab_quotation'
  if (raw === '會簽報價單') return 'quotation_approval'
  if (raw === '整理文件資料給實驗室') return 'docs_to_lab'
  if (raw === '打請購單') return 'purchase_request'
  if (raw === '領機器並安裝OS') return 'pickup_and_install_os'
  if (raw === '機器送出給實驗室') return 'send_to_lab'
  if (raw === '實驗室測試中') return 'lab_testing'
  if (raw === '實驗室測試完畢產出草稿報告確認') return 'draft_report_review'
  if (raw === '機器送回') return 'machine_returned'
  if (raw === '正式報告上傳') return 'final_report_uploaded'
  if (raw === '等發票') return 'waiting_invoice'
  if (raw === '報帳') return 'reimbursement'
  if (raw === '暫停') return 'paused'
  if (raw === '完成' || raw === '已完成') return 'completed'

  // 舊中文
  if (raw === '開案中' || raw === '申請中') return 'spec_communication'
  if (raw === '有效') return 'completed'
  if (raw === '已失效') return 'paused'

  const s = raw.toLowerCase()

  // 舊英文
  if (s === 'ongoing' || s === 'pending') return 'spec_communication'
  if (s === 'valid') return 'completed'
  if (s === 'expired') return 'paused'

  // 新英文 key
  if (STATUS_SET.has(s)) return s

  return 'spec_communication'
}

function parseJsonArray(value) {
  if (value == null || value === '') return []
  if (Array.isArray(value)) return value

  const raw = clean(value)
  if (!raw) return []

  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : [parsed]
  } catch {
    return [raw]
  }
}

function normalizeFilePathFromId(id) {
  const s = clean(id)
  if (!s) return ''
  if (/^\d+$/.test(s)) return `files/${s}/download`
  return s
}

function uniqStrings(arr = []) {
  const out = []
  const seen = new Set()

  for (const item of arr) {
    const s = clean(item)
    if (!s || seen.has(s)) continue
    seen.add(s)
    out.push(s)
  }

  return out
}

function normalizeFilePathList(input) {
  const rawList = parseJsonArray(input)

  const out = rawList.map((item) => {
    if (item == null) return ''

    if (typeof item === 'object') {
      if (item.filePath || item.path || item.url || item.downloadUrl) {
        return item.filePath ?? item.path ?? item.url ?? item.downloadUrl ?? ''
      }
      if (item.id != null || item.fileId != null) {
        return normalizeFilePathFromId(item.id ?? item.fileId)
      }
    }

    return item
  })

  return uniqStrings(out)
}

export default (sequelize) => {
  class SafetyReport extends Model {
    static associate(models) {
      // 目前先不用關聯，有需要再加
    }
  }

  SafetyReport.init(
    {
      modelFamily: {
        field: 'model_family',
        type: DataTypes.STRING(100),
        allowNull: false,
      },

      modelName: {
        field: 'model_name',
        type: DataTypes.STRING(150),
        allowNull: true,
      },

      modelCode: {
        field: 'model_code',
        type: DataTypes.STRING(100),
        allowNull: true,
      },

      certType: {
        field: 'cert_type',
        type: DataTypes.STRING(100),
        allowNull: false,
      },

      standard: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },

      lab: {
        type: DataTypes.STRING(150),
        allowNull: true,
      },

      issueDate: {
        field: 'issue_date',
        type: DataTypes.DATEONLY,
        allowNull: true,
      },

      expireDate: {
        field: 'expire_date',
        type: DataTypes.DATEONLY,
        allowNull: true,
      },

      status: {
        type: DataTypes.STRING(64),
        allowNull: false,
        defaultValue: 'spec_communication',
        validate: {
          isIn: [SAFETY_REPORT_STATUS_VALUES],
        },
        set(value) {
          this.setDataValue('status', normalizeStatus(value))
        },
      },

      remark: {
        type: DataTypes.STRING(500),
        allowNull: true,
      },

      // 舊欄位：保留，存第一個附件
      filePath: {
        field: 'file_path',
        type: DataTypes.STRING(500),
        allowNull: true,
      },

      // 新欄位：多附件，資料庫建議對應 TEXT / LONGTEXT
      filePaths: {
        field: 'file_paths',
        type: DataTypes.TEXT('long'),
        allowNull: true,
        get() {
          const raw = this.getDataValue('filePaths')
          return normalizeFilePathList(raw)
        },
        set(value) {
          const list = normalizeFilePathList(value)
          this.setDataValue('filePaths', list.length ? JSON.stringify(list) : null)

          // 同步舊欄位，保留第一個附件給舊前端用
          if (!this.getDataValue('filePath')) {
            this.setDataValue('filePath', list[0] ?? null)
          }
        },
      },
    },
    {
      sequelize,
      modelName: 'SafetyReport',
      tableName: 'safety_reports',
      underscored: true,
      hooks: {
        beforeValidate(instance) {
          const filePaths = normalizeFilePathList(instance.getDataValue('filePaths'))
          const filePath = clean(instance.getDataValue('filePath'))

          const merged = uniqStrings([
            ...filePaths,
            ...(filePath ? [filePath] : []),
          ])

          instance.setDataValue('filePaths', merged.length ? JSON.stringify(merged) : null)
          instance.setDataValue('filePath', merged[0] ?? null)

          instance.status = normalizeStatus(instance.status)
        },
      },
    }
  )

  return SafetyReport
}