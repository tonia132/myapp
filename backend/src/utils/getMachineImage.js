// src/utils/getMachineImage.js
export function getMachineImage(machine, API_BASE = "http://localhost:3000") {
  if (!machine) return `${API_BASE}/images/default-machine.jpg`;

  // ✅ 若有完整 imageUrl
  if (machine.imageUrl) {
    const url = machine.imageUrl.replace(/^public[\\/]/, "").replace(/^\/+/, "");
    return machine.imageUrl.startsWith("http") ? machine.imageUrl : `${API_BASE}/${url}`;
  }

  const name = (machine.name || "").trim();
  const match = name.match(/[（(]?\s*[Cc]hamber[：:：\s\-]*?(\d+)\s*[)）]?/);

  if (match?.[1]) {
    const num = match[1];
    return `${API_BASE}/images/machines/chamber${num}.jpg`;
  }

  console.warn(`⚠️ 無法識別機台名稱「${name}」，使用預設圖`);
  return `${API_BASE}/images/default-machine.jpg`;
}
