// frontend/src/utils/reportMeta.js

// unicode-safe base64
export function encodeMetaB64(meta) {
  const json = JSON.stringify(meta || {});
  return btoa(unescape(encodeURIComponent(json)));
}

// 只挑 Cover 需要的 meta（避免把整個狀態都丟進去）
export function buildCoverMetaForQuery(cover) {
  const c = cover || {};

  return {
    projectName: c.projectName || "",
    reportName: c.reportName || "Test Report",
    revision: c.revision || "",
    releasedDate: c.releasedDate || "",

    preparedBy: c.preparedBy || "",
    approvedBy: c.approvedBy || "",

    // ✅ 這兩個是你要送的重點：fileId
    preparedSigFileId: c.preparedSigFileId ?? null,
    reviewedSigFileId: c.reviewedSigFileId ?? null,

    // 可選：也帶檔名（純顯示用）
    preparedSigFileName: c.preparedSigFileName || "",
    reviewedSigFileName: c.reviewedSigFileName || "",
  };
}

// 組 PDF URL（含 token + metaB64）
export function buildReportPdfUrl({
  apiBase = "/api",
  productId,
  token,
  template = true,
  showEmpty = false,
  filters = {}, // kw/plan/result/cats 等
  coverMeta = {},
}) {
  const metaB64 = encodeURIComponent(encodeMetaB64(buildCoverMetaForQuery(coverMeta)));

  const qs = new URLSearchParams();
  if (token) qs.set("token", token);
  if (template) qs.set("template", "1");
  if (showEmpty) qs.set("showEmpty", "1");

  // filters（可選）
  for (const [k, v] of Object.entries(filters || {})) {
    if (v === undefined || v === null) continue;
    const s = String(v).trim();
    if (!s) continue;
    qs.set(k, s);
  }

  qs.set("metaB64", metaB64);

  return `${apiBase}/report/products/${productId}.pdf?${qs.toString()}`;
}
