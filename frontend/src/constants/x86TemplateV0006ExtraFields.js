// frontend/src/constants/x86TemplateV0006ExtraFields.js
// ✅ Template-driven "extra fields" schema for v0006
// - UI: ProductTest.vue + ExtraFieldsRenderer.vue
// - Storage: testcases.extra (JSON)
// - 之後你也可以把這份 merge 進 X86_TEMPLATE_V0006 變成 tpl.extraFields

export const X86_TEMPLATE_V0006_EXTRA_FIELDS = {
  // ✅ Apply to ALL categories：每個 Test Case 都有「Photos」多圖區（對齊 Excel 的「預設圖片/多圖」需求）
  _all: [
    {
      key: "photos",
      label: "Photos",
      type: "images",
      max: 12,
    },
  ],

  // ---------------- Reli ----------------
  Reli: [
    {
      key: "inputVoltage",
      label: "Input Voltage",
      type: "text",
      unit: "V",
      applyIf: { sectionIncludes: ["Burn-in", "Burn in", "Burnin"] },
    },
    {
      key: "ambientTemp",
      label: "Ambient Temperature",
      type: "number",
      unit: "°C",
      step: 0.1,
      applyIf: { sectionIncludes: ["Burn-in", "Burn in", "Burnin"] },
    },
    {
      key: "chamberSetting",
      label: "Chamber Setting",
      type: "text",
      applyIf: { sectionIncludes: ["Burn-in", "Burn in", "Burnin"] },
    },
    {
      key: "tempRange",
      label: "Temp. Range",
      type: "text",
      applyIf: { sectionIncludes: ["Burn-in", "Burn in", "Burnin"] },
    },
    {
      key: "humidityRange",
      label: "Humidity Range",
      type: "text",
      applyIf: { sectionIncludes: ["Burn-in", "Burn in", "Burnin"] },
    },
    {
      key: "tempCycle",
      label: "Temp. Cycle",
      type: "text",
      applyIf: { sectionIncludes: ["Burn-in", "Burn in", "Burnin"] },
    },
    {
      key: "burninLogs",
      label: "Burn-in Log",
      type: "table",
      applyIf: { sectionIncludes: ["Burn-in", "Burn in", "Burnin"] },
      columns: [
        { key: "cpu", label: "CPU", type: "text" },
        { key: "memory", label: "Memory", type: "text" },
        { key: "disk", label: "Disk", type: "text" },
        { key: "hrs", label: "hrs", type: "number", step: 0.1, min: 0 },
        { key: "avgTemp", label: "Average Temp.", type: "number", step: 0.1 },
      ],
    },
  ],

  // ---------------- PWR ----------------
  PWR: [
    { key: "inputVoltage", label: "Input Voltage", type: "text", unit: "V" },
    { key: "maxCurrent", label: "Max Current", type: "text", unit: "A" },
    { key: "resultWatt", label: "Result (Watt)", type: "number", unit: "W", step: 0.1, min: 0 },
    { key: "avgCurrent", label: "Averaged Current", type: "text", unit: "A" },
    { key: "pwrAdapter", label: "PWR Adapter", type: "text" },
  ],

  // ---------------- Thrm ----------------
  Thrm: [
    { key: "maxTemp", label: "Max Temperature", type: "number", unit: "°C", step: 0.1 },
    { key: "frontTemp", label: "Surface Temp at Front", type: "number", unit: "°C", step: 0.1 },
    { key: "backTemp", label: "Surface Temp at Back", type: "number", unit: "°C", step: 0.1 },
    { key: "leftTemp", label: "Surface Temp at Left", type: "number", unit: "°C", step: 0.1 },
    { key: "rightTemp", label: "Surface Temp at Right", type: "number", unit: "°C", step: 0.1 },
    { key: "topTemp", label: "Surface Temp at Top", type: "number", unit: "°C", step: 0.1 },
    { key: "bottomTemp", label: "Surface Temp at Bottom", type: "number", unit: "°C", step: 0.1 },
  ],

  // ---------------- ESD ----------------
  ESD: [
    {
      key: "esdPoints",
      label: "Labeled Points",
      type: "table",
      columns: [
        { key: "face", label: "Face", type: "select", options: ["Front", "Left", "Top", "Back", "Right", "Bottom"] },
        { key: "point", label: "Point", type: "text" },
        { key: "level", label: "Level", type: "text" },
        { key: "result", label: "Result", type: "select", options: ["PASS", "FAIL", "N/A"] },
        { key: "note", label: "Note", type: "text" },
      ],
    },
  ],

  // ---------------- MEP ----------------
  MEP: [
    {
      key: "measurementPhotos",
      label: "Photo of measurement",
      type: "images",
      max: 12,
    },
  ],
};
