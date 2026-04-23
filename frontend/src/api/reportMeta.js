// frontend/src/api/reportMeta.js
import request from "../utils/request";

// GET /api/report-meta/products/:id
export function getReportMeta(productId) {
  return request.get(`/report-meta/products/${productId}`);
}

// PUT /api/report-meta/products/:id
export function saveReportMeta(productId, meta) {
  return request.put(`/report-meta/products/${productId}`, { meta });
}
