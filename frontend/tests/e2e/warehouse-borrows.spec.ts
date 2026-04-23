import { expect, Page, test } from '@playwright/test'
import { attachAppDebug } from './helpers/appDebug'

type BorrowRow = {
  id: number
  borrowerId: number
  quantity: number
  purpose: string
  expectedReturnAt: string
  createdAt: string
  borrowedAt: string
  returnedAt: string | null
  status: string
  reviewStatus: string
  rejectReason: string
  reviewNote: string
  borrower: {
    id: number
    name: string
    username: string
  }
  item: {
    id: number
    name: string
    code: string
    location: string
  }
}

function makeFakeJwt(payload: Record<string, unknown> = {}) {
  const header = Buffer.from(
    JSON.stringify({ alg: 'none', typ: 'JWT' })
  ).toString('base64url')

  const body = Buffer.from(
    JSON.stringify({
      exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24,
      ...payload,
    })
  ).toString('base64url')

  return `${header}.${body}.x`
}

async function installAuth(page: Page, role: 'admin' | 'user' = 'admin') {
  const token = makeFakeJwt({ role })
  const user = {
    id: role === 'admin' ? 1 : 2,
    username: role,
    name: role === 'admin' ? 'Admin User' : 'Normal User',
    role,
  }

  await page.addInitScript(
    ({ tokenValue, userValue }) => {
      for (const storage of [window.localStorage, window.sessionStorage]) {
        storage.setItem('token', tokenValue)
        storage.setItem('user', JSON.stringify(userValue))
        storage.setItem('locale', 'zh-TW')
        storage.setItem('theme', 'light')
      }
    },
    { tokenValue: token, userValue: user }
  )
}

function buildBorrowsFixture(): BorrowRow[] {
  return [
    {
      id: 101,
      borrowerId: 1,
      quantity: 1,
      purpose: 'Validation',
      expectedReturnAt: '2026-04-23T10:30:00',
      createdAt: '2026-04-22T09:30:00',
      borrowedAt: '2026-04-22T09:30:00',
      returnedAt: null,
      status: 'requested',
      reviewStatus: 'pending',
      rejectReason: '',
      reviewNote: '',
      borrower: {
        id: 1,
        name: 'Admin User',
        username: 'admin',
      },
      item: {
        id: 11,
        name: 'SSD A',
        code: 'SSD-001',
        location: 'R1-A1',
      },
    },
    {
      id: 202,
      borrowerId: 2,
      quantity: 2,
      purpose: 'Burn-in',
      expectedReturnAt: '2026-04-24T12:00:00',
      createdAt: '2026-04-22T08:00:00',
      borrowedAt: '2026-04-22T08:00:00',
      returnedAt: null,
      status: 'borrowed',
      reviewStatus: 'approved',
      rejectReason: '',
      reviewNote: 'Approved',
      borrower: {
        id: 2,
        name: 'Other User',
        username: 'other',
      },
      item: {
        id: 22,
        name: 'Tool B',
        code: 'TOOL-002',
        location: 'R2-B3',
      },
    },
  ]
}

function isTruthyFlag(v: string | null) {
  return ['1', 'true', 'yes', 'y', 'on'].includes(String(v || '').trim().toLowerCase())
}

function filterBorrowsByQuery(rows: BorrowRow[], url: URL) {
  // route query
  const mineOnly = url.searchParams.get('mineOnly')
  const borrowStatus = String(url.searchParams.get('borrowStatus') || '').trim().toLowerCase()
  const reviewStatus = String(url.searchParams.get('reviewStatus') || '').trim().toLowerCase()

  // actual API query
  const mine = url.searchParams.get('mine')
  const apiStatus = String(url.searchParams.get('status') || '').trim().toLowerCase()

  const onlyMine = isTruthyFlag(mineOnly) || isTruthyFlag(mine)
  const finalBorrowStatus = borrowStatus || apiStatus

  return rows.filter((row) => {
    const hitMineOnly = !onlyMine || row.borrowerId === 1
    const hitBorrowStatus =
      !finalBorrowStatus || String(row.status || '').toLowerCase() === finalBorrowStatus
    const hitReviewStatus =
      !reviewStatus || String(row.reviewStatus || '').toLowerCase() === reviewStatus

    return hitMineOnly && hitBorrowStatus && hitReviewStatus
  })
}

async function installBorrowsApiMock(page: Page) {
  const allRows = buildBorrowsFixture()

  await page.route('**/*', async (route) => {
    const request = route.request()
    const url = new URL(request.url())
    const pathname = url.pathname.toLowerCase()
    const method = request.method().toUpperCase()

    if (!pathname.startsWith('/api/')) {
      return route.continue()
    }

    const ok = async (body: unknown, status = 200) => {
      await route.fulfill({
        status,
        contentType: 'application/json',
        body: JSON.stringify(body),
      })
    }

    if (
      pathname.startsWith('/api/me') ||
      pathname.startsWith('/api/profile') ||
      pathname.startsWith('/api/current-user') ||
      pathname.startsWith('/api/auth')
    ) {
      return ok({
        success: true,
        data: {
          id: 1,
          username: 'admin',
          name: 'Admin User',
          role: 'admin',
        },
      })
    }

    if (pathname.includes('/api/warehouse') && pathname.includes('borrow')) {
      if (method === 'GET') {
        console.log('[mock borrow GET]', request.url())

        const rows = filterBorrowsByQuery(allRows, url)

        return ok({
          success: true,
          data: {
            rows,
            count: rows.length,
          },
        })
      }

      if (['POST', 'PATCH', 'PUT', 'DELETE'].includes(method)) {
        return ok({
          success: true,
          message: 'ok',
          data: { ok: true },
        })
      }
    }

    return ok({
      success: true,
      data: {},
    })
  })
}

async function openSelectByIndex(page: Page, index: number) {
  const wrapper = page.locator('.filter-row .el-select').nth(index)

  const clickable = wrapper.locator('.el-select__wrapper').first()
  if (await clickable.count()) {
    await clickable.click()
    return
  }

  await wrapper.click()
}

async function chooseVisibleOption(page: Page, text: string) {
  const visibleDropdown = page.locator('.el-select-dropdown:visible').last()
  await expect(visibleDropdown).toBeVisible()
  await visibleDropdown.getByText(text, { exact: true }).click()
}

async function waitListStable(page: Page) {
  await page.waitForLoadState('networkidle')
}

test.describe('warehouse borrows', () => {
  test.beforeEach(async ({ page }) => {
    await attachAppDebug(page)
    await installAuth(page, 'admin')
    await installBorrowsApiMock(page)
  })

  test('warehouse borrows smoke', async ({ page }) => {
    await page.goto('/warehouse/borrows', { waitUntil: 'domcontentloaded' })
    await waitListStable(page)
    await page.waitForURL(/\/warehouse\/borrows/)

    console.log('final url =', page.url())
    console.log('body =', await page.locator('body').innerText())

    await expect(page.getByText('借用紀錄').first()).toBeVisible()
    await expect(page.getByText('SSD A')).toBeVisible()
    await expect(page.getByText('Tool B')).toBeVisible()
  })

  test('admin mineOnly syncs route query and updates list', async ({ page }) => {
    await page.goto('/warehouse/borrows', { waitUntil: 'domcontentloaded' })
    await waitListStable(page)

    await expect(page.getByText('SSD A')).toBeVisible()
    await expect(page.getByText('Tool B')).toBeVisible()

    const switchRoot = page.locator('.el-switch').first()
    await expect(switchRoot).toBeVisible()

    await switchRoot.click()
    await waitListStable(page)

    await expect(page).toHaveURL(/\/warehouse\/borrows\?mineOnly=1/)
    await expect(page.getByText('SSD A')).toBeVisible()
    await expect(page.getByText('Tool B')).toHaveCount(0)

    await switchRoot.click()
    await waitListStable(page)

    await expect(page.url()).toMatch(/\/warehouse\/borrows(?:\?.*)?$/)
    expect(new URL(page.url()).searchParams.get('mineOnly')).toBeNull()

    await expect(page.getByText('SSD A')).toBeVisible()
    await expect(page.getByText('Tool B')).toBeVisible()
  })

  test('borrowStatus syncs route query and updates list', async ({ page }) => {
    await page.goto('/warehouse/borrows', { waitUntil: 'domcontentloaded' })
    await waitListStable(page)

    await expect(page.getByText('SSD A')).toBeVisible()
    await expect(page.getByText('Tool B')).toBeVisible()

    // 第 1 個 select = 借用狀態
    await openSelectByIndex(page, 0)
    await chooseVisibleOption(page, '申請中')
    await waitListStable(page)

    await expect(page).toHaveURL(/borrowStatus=requested/)
    await expect(page.getByText('SSD A')).toBeVisible()
    await expect(page.getByText('Tool B')).toHaveCount(0)
  })

  test('reviewStatus syncs route query and updates list', async ({ page }) => {
    await page.goto('/warehouse/borrows', { waitUntil: 'domcontentloaded' })
    await waitListStable(page)

    await expect(page.getByText('SSD A')).toBeVisible()
    await expect(page.getByText('Tool B')).toBeVisible()

    // 第 2 個 select = 審核狀態
    await openSelectByIndex(page, 1)
    await chooseVisibleOption(page, '已核准')
    await waitListStable(page)

    await expect(page).toHaveURL(/reviewStatus=approved/)
    await expect(page.getByText('Tool B')).toBeVisible()
    await expect(page.getByText('SSD A')).toHaveCount(0)
  })
})