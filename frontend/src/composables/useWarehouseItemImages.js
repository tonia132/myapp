// frontend/src/composables/useWarehouseItemImages.js

function toPositiveId(v) {
  const n = Number(v)
  return Number.isFinite(n) && n > 0 ? n : 0
}

function normalizeWarehouseImageFile(file) {
  if (!file || typeof file !== 'object') return null

  const id = toPositiveId(file.id || file.fileId)
  if (!id) return null

  return file.id
    ? file
    : {
        ...file,
        id,
      }
}

function imageEntryToFile(entry) {
  if (!entry || typeof entry !== 'object') return null
  return normalizeWarehouseImageFile(entry.file || entry)
}

export function uniqueWarehouseImageFiles(files = []) {
  const map = new Map()

  for (const raw of Array.isArray(files) ? files : []) {
    const file = normalizeWarehouseImageFile(raw)
    if (!file) continue
    if (!map.has(file.id)) map.set(file.id, file)
  }

  return [...map.values()]
}

/**
 * 從倉庫 item 取出圖片檔案陣列
 * 支援：
 * - item.images[].file
 * - item.images[] 直接就是 file
 * - item.imageFile
 */
export function getWarehouseItemImageFiles(item) {
  if (!item || typeof item !== 'object') return []

  const images = Array.isArray(item.images) ? item.images : []
  const fromImages = images
    .map(imageEntryToFile)
    .filter(Boolean)

  if (fromImages.length) return uniqueWarehouseImageFiles(fromImages)

  const fallback = normalizeWarehouseImageFile(item.imageFile)
  return fallback ? [fallback] : []
}

export function getWarehouseItemCoverFile(item) {
  return getWarehouseItemImageFiles(item)[0] || null
}

export function getWarehouseItemCoverFileId(item) {
  return getWarehouseItemCoverFile(item)?.id || null
}

export function buildWarehouseImageFileIds(files = []) {
  return uniqueWarehouseImageFiles(files)
    .map((file) => file.id)
    .filter(Boolean)
}

export function hasWarehouseImage(files = [], fileOrId) {
  const id =
    typeof fileOrId === 'object'
      ? toPositiveId(fileOrId?.id || fileOrId?.fileId)
      : toPositiveId(fileOrId)

  if (!id) return false
  return uniqueWarehouseImageFiles(files).some((file) => file.id === id)
}

export function appendWarehouseImage(files = [], file) {
  const nextFile = normalizeWarehouseImageFile(file)
  const list = uniqueWarehouseImageFiles(files)

  if (!nextFile) return list
  if (list.some((it) => it.id === nextFile.id)) return list

  return [...list, nextFile]
}

export function appendWarehouseImages(files = [], extraFiles = []) {
  let next = uniqueWarehouseImageFiles(files)
  for (const file of Array.isArray(extraFiles) ? extraFiles : []) {
    next = appendWarehouseImage(next, file)
  }
  return next
}

export function removeWarehouseImage(files = [], indexOrFileOrId) {
  const list = uniqueWarehouseImageFiles(files)

  if (typeof indexOrFileOrId === 'number' && Number.isInteger(indexOrFileOrId)) {
    if (indexOrFileOrId < 0 || indexOrFileOrId >= list.length) return list
    return list.filter((_, idx) => idx !== indexOrFileOrId)
  }

  const id =
    typeof indexOrFileOrId === 'object'
      ? toPositiveId(indexOrFileOrId?.id || indexOrFileOrId?.fileId)
      : toPositiveId(indexOrFileOrId)

  if (!id) return list
  return list.filter((file) => file.id !== id)
}

export function moveWarehouseImage(files = [], index, direction) {
  const list = uniqueWarehouseImageFiles(files)
  const from = Number(index)
  const delta = Number(direction)
  const to = from + delta

  if (!Number.isInteger(from) || !Number.isInteger(delta)) return list
  if (from < 0 || from >= list.length) return list
  if (to < 0 || to >= list.length) return list

  const next = list.slice()
  ;[next[from], next[to]] = [next[to], next[from]]
  return next
}

export function clearWarehouseImages() {
  return []
}

export function replaceWarehouseImages(_currentFiles = [], nextFiles = []) {
  return uniqueWarehouseImageFiles(nextFiles)
}

export function syncWarehouseImageIds(form) {
  if (!form || typeof form !== 'object') return []

  const files = uniqueWarehouseImageFiles(form.imageFiles || [])
  const ids = buildWarehouseImageFileIds(files)

  form.imageFiles = files
  form.imageFileIds = ids

  return ids
}

export function hydrateWarehouseImagesFromItem(form, item) {
  if (!form || typeof form !== 'object') return []

  const files = getWarehouseItemImageFiles(item)
  form.imageFiles = files
  form.imageFileIds = buildWarehouseImageFileIds(files)

  return files
}

export function clearWarehouseImagesInForm(form) {
  if (!form || typeof form !== 'object') return
  form.imageFiles = []
  form.imageFileIds = []
}

export function appendWarehouseImageToForm(form, file) {
  if (!form || typeof form !== 'object') return []

  form.imageFiles = appendWarehouseImage(form.imageFiles || [], file)
  form.imageFileIds = buildWarehouseImageFileIds(form.imageFiles)

  return form.imageFiles
}

export function removeWarehouseImageFromForm(form, indexOrFileOrId) {
  if (!form || typeof form !== 'object') return []

  form.imageFiles = removeWarehouseImage(form.imageFiles || [], indexOrFileOrId)
  form.imageFileIds = buildWarehouseImageFileIds(form.imageFiles)

  return form.imageFiles
}

export function moveWarehouseImageInForm(form, index, direction) {
  if (!form || typeof form !== 'object') return []

  form.imageFiles = moveWarehouseImage(form.imageFiles || [], index, direction)
  form.imageFileIds = buildWarehouseImageFileIds(form.imageFiles)

  return form.imageFiles
}

export function useWarehouseItemImages() {
  return {
    normalizeWarehouseImageFile,
    uniqueWarehouseImageFiles,

    getWarehouseItemImageFiles,
    getWarehouseItemCoverFile,
    getWarehouseItemCoverFileId,

    buildWarehouseImageFileIds,
    hasWarehouseImage,

    appendWarehouseImage,
    appendWarehouseImages,
    removeWarehouseImage,
    moveWarehouseImage,
    clearWarehouseImages,
    replaceWarehouseImages,

    syncWarehouseImageIds,
    hydrateWarehouseImagesFromItem,
    clearWarehouseImagesInForm,
    appendWarehouseImageToForm,
    removeWarehouseImageFromForm,
    moveWarehouseImageInForm,
  }
}

export default useWarehouseItemImages