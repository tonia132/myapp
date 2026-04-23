import axios from "./axios";

/**
 * ✅ 取得所有環境艙資料
 */
export const getChambers = async () => {
  const res = await axios.get("/chambers");
  return res.data;
};

/**
 * ✅ 儲存或更新環境艙設定
 * @param {Object} data - JSON 物件陣列
 */
export const saveChambers = async (data) => {
  const res = await axios.post("/chambers/save", data);
  return res.data;
};
