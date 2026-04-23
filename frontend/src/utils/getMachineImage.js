/**
 * ✅ getMachineImage（正式版）
 * - 自動偵測 Base URL
 * - 支援多格式機台名稱匹配
 * - 正式環境不輸出 console.log
 *
 * @param {object} machine - 機台物件 (需包含 name 屬性)
 * @param {string} [baseUrl] - 可選：自訂圖片根目錄
 * @returns {string} 對應圖片 URL
 */
export function getMachineImage(machine, baseUrl) {
  if (!machine || !machine.name) {
    if (import.meta.env.DEV) console.warn("⚠️ 無機台名稱，使用預設圖");
    return `${baseUrl || window.location.origin}/images/default-machine.jpg`;
  }

  const name = machine.name.trim();

  // ✅ 強化正則：支援多語格式
  const match = name.match(
    /(?:chamber|艙|箱|ch-|ch_|\#)\s*(\d+)/i
  );

  // ✅ 若匹配成功 → 尋找對應圖片
  if (match && match[1]) {
    const num = match[1];
    const base = baseUrl || window.location.origin;
    const path = `${base}/images/machines/chamber${num}.jpg`;

    if (import.meta.env.DEV)
      console.log(`🖼️ 機台圖片匹配：${name} → ${path}`);

    return path;
  }

  if (import.meta.env.DEV)
    console.warn(`⚠️ 未匹配圖片：${name} → 預設圖`);

  return `${baseUrl || window.location.origin}/images/default-machine.jpg`;
}

// ✅ 同時保留 default export（兼容舊引用）
export default getMachineImage;
