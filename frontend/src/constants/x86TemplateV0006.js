export const X86_TEMPLATE_V0006 = {
  "version": "0006",
  "sheets": [
    { "key": "dashboard", "title": "Dashboard" },
    { "key": "cover", "title": "Cover" },
    { "key": "summary", "title": "Summary" },
    { "key": "contents", "title": "Contents" },
    { "key": "config", "title": "Config" },
    { "key": "HW", "title": "HW" },
    { "key": "Perf", "title": "Perf" },
    { "key": "Reli", "title": "Reli" },
    { "key": "Stab", "title": "Stab" },
    { "key": "PWR", "title": "PWR" },
    { "key": "Thrm", "title": "Thrm" },
    { "key": "ESD", "title": "ESD" },
    { "key": "MEP", "title": "MEP" },
    { "key": "history", "title": "History" }
  ],
  "categories": [
    { "key": "HW", "label": "Hardware Functions" },
    { "key": "Perf", "label": "Performance" },
    { "key": "Reli", "label": "Reliability" },
    { "key": "Stab", "label": "Stability" },
    { "key": "PWR", "label": "Power Consumption" },
    { "key": "Thrm", "label": "Thermal Profile" },
    { "key": "ESD", "label": "Electrostatic Discharge (ESD)" },
    { "key": "MEP", "label": "Mechanical Protection" }
  ],
  "config": {
    "dutFields": [
      { "key": "systemModelName", "label": "System Model Name" },
      { "key": "mbVersion", "label": "M/B Version" },
      { "key": "cpu", "label": "CPU" },
      { "key": "memory", "label": "Memory" },
      { "key": "os", "label": "OS" },
      { "key": "hardDrive", "label": "Hard Drive" },
      { "key": "display", "label": "Display" },
      { "key": "power", "label": "Power" },
      { "key": "biosVersion", "label": "BIOS Version" },
      { "key": "turboMode", "label": "Turbo Mode" },
      { "key": "ecMcuFwVersion", "label": "EC/MCU FW Version" },
      { "key": "edidVersion", "label": "EDID Version" }
    ],
    "utilities": [
      { "name": "3DMark", "purpose": "Used for benchmarking computer's hardware and graphic." },
      { "name": "CineBench", "purpose": "Used for evaluating computer hardware's capabilities." },
      { "name": "CPU-Z", "purpose": "Used for getting CPU information." },
      { "name": "CrystalDiskMark", "purpose": "Used for testing benchmark of disk." },
      { "name": "HWINFO64", "purpose": "Used for checking system hardware information." },
      { "name": "MemTest86+", "purpose": "Used for memory testing." },
      { "name": "PassMark BurnInTest", "purpose": "Used for computer stability and reliability testing." },
      { "name": "PassMark MemTest86", "purpose": "Used for memory testing." },
      { "name": "PassMark Rebooter", "purpose": "Used for cyclic testing of system." },
      { "name": "PassMark Sleeper", "purpose": "Used for suspending or hibernating computer." },
      { "name": "Prime95", "purpose": "Used for CPU and Memory Load testing." },
      { "name": "TTYSWIRL", "purpose": "Used for COM testing." }
    ],
    "supportedSections": [
      { "key": "memory", "label": "Spec. of Memory" },
      { "key": "storage", "label": "Spec. of Storage" },
      { "key": "cpu", "label": "Spec. of CPU" },
      { "key": "other", "label": "Spec. of Other supported devices" },
      { "key": "accessories", "label": "Spec. of Accessories" }
    ],
    "defaultAccessories": [
      { "pn": "Appearance of Assembled System", "spec": "" },
      { "pn": "Caption", "spec": "" },
      { "pn": "Photo", "spec": "" },
      { "pn": "Caption", "spec": "" },
      { "pn": "Photo", "spec": "" }
    ]
  },
  "history": [
    { "version": "v.0006", "date": "2025-12-09", "notes": "1. Fixed wrong procedure of CPA_001... disallow to skip the test." },
    { "version": "v.0005", "date": "2025-11-21", "notes": "1. Add text descriptions for PCS_001~003... Add a \"Perf\" test work page." },
    { "version": "v.0004", "date": "2025-10-08", "notes": "1. Optimized IR Imaging (Therm)... Added \"Turbo Mode\" in DUT List." },
    { "version": "v.0003", "date": "2025-09-18", "notes": "Modify SP_001 test case's procedure and criteria." },
    { "version": "v.0002", "date": "2025-09-17", "notes": "Fix that TAT_001 ~ TAT_003 can't input voltage." },
    { "version": "v.0001", "date": "2025-09-17", "notes": "Initial version... [System Model Name][Report Name] R[Revision]_YYYYMMDD.pdf." }
  ]
}
