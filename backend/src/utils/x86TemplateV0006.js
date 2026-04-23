// backend/src/utils/x86TemplateV0006.js
// v0006 template preset provider (backend)
// - V1 / V2 -> items[]
// - 目前你的 defaultTestCases_v6.js 只有一份陣列，所以 V2 先 fallback = V1

import V1_LIST from "./defaultTestCases_v6.js";

export const X86_TEMPLATE_V0006 = {
  version: "0006",
  presets: {
    V1: V1_LIST,
    V2: V1_LIST, // ✅ 先讓 V2 跟 V1 一樣（之後你真的有 V2 再替換）
  },
};

export default X86_TEMPLATE_V0006;
