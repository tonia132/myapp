import {
  getWarehouseItemImageFiles,
  buildWarehouseImageFileIds,
  appendWarehouseImage,
  appendWarehouseImages,
  removeWarehouseImage,
  moveWarehouseImage,
  hydrateWarehouseImagesFromItem,
  appendWarehouseImageToForm,
  removeWarehouseImageFromForm,
  moveWarehouseImageInForm,
} from '@/composables/useWarehouseItemImages'

describe('useWarehouseItemImages', () => {
  const f1 = { id: 1, displayName: 'a.png' }
  const f1dup = { id: 1, displayName: 'a-dup.png' }
  const f2 = { fileId: 2, displayName: 'b.png' }
  const f3 = { id: 3, displayName: 'c.png' }

  it('getWarehouseItemImageFiles prefers item.images and dedupes', () => {
    const item = {
      images: [
        { file: f1 },
        { file: f1dup },
        { file: f2 },
      ],
      imageFile: f3,
    }

    const files = getWarehouseItemImageFiles(item)

    expect(buildWarehouseImageFileIds(files)).toEqual([1, 2])
  })

  it('append/remove/move image helpers keep correct order and uniqueness', () => {
    const appended = appendWarehouseImages([], [f1, f2, f1dup])
    expect(buildWarehouseImageFileIds(appended)).toEqual([1, 2])

    const appendedOne = appendWarehouseImage(appended, f3)
    expect(buildWarehouseImageFileIds(appendedOne)).toEqual([1, 2, 3])

    const moved = moveWarehouseImage(appendedOne, 2, -2)
    expect(buildWarehouseImageFileIds(moved)).toEqual([3, 2, 1])

    const removed = removeWarehouseImage(moved, 1)
    expect(buildWarehouseImageFileIds(removed)).toEqual([3, 1])
  })

  it('hydrates form imageFiles/imageFileIds from item', () => {
    const form = {
      imageFiles: [],
      imageFileIds: [],
    }

    hydrateWarehouseImagesFromItem(form, {
      images: [{ file: f2 }, { file: f1 }],
    })

    expect(buildWarehouseImageFileIds(form.imageFiles)).toEqual([2, 1])
    expect(form.imageFileIds).toEqual([2, 1])
  })

  it('form helpers append/remove/move correctly', () => {
    const form = {
      imageFiles: [],
      imageFileIds: [],
    }

    appendWarehouseImageToForm(form, f1)
    appendWarehouseImageToForm(form, f2)
    appendWarehouseImageToForm(form, f1dup)

    expect(form.imageFileIds).toEqual([1, 2])

    moveWarehouseImageInForm(form, 1, -1)
    expect(form.imageFileIds).toEqual([2, 1])

    removeWarehouseImageFromForm(form, 0)
    expect(form.imageFileIds).toEqual([1])
  })
})