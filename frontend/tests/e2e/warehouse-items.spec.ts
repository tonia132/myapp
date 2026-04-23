import { expect, Page, test } from '@playwright/test'
import { attachAppDebug } from './helpers/appDebug'

type WarehouseItem = {
  id: number
  type: string
  name: string
  code: string
  location: string
  totalQty: number
  currentQty: number
  hasPeripheral: boolean
  os: string
  status: string
  remark: string
  images: unknown[]
  imageFile: unknown | null
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

function buildItemsFixture(): WarehouseItem[] {
  return [
    {
      id: 11,
      type: 'part',
      name: 'SSD A',
      code: 'SSD-001',
      location: 'R1-A1',
      totalQty: 5,
      currentQty: 3,
      hasPeripheral: false,
      os: '',
      status: 'normal',
      remark: 'Mock item A',
      images: [],
      imageFile: null,
    },
    {
      id: 22,
      type: 'tool',
      name: 'Tool B',
      code: 'TOOL-002',
      location: 'R2-B3',
      totalQty: 2,
      currentQty: 1,
      hasPeripheral: true,
      os: 'Win11',
      status: 'normal',
      remark: 'Mock item B',
      images: [],
      imageFile: null,
    },
  ]
}

function filterItemsByQuery(items: WarehouseItem[], url: URL) {
  const keyword = String(url.searchParams.get('keyword') || '').trim().toLowerCase()
  const type = String(url.searchParams.get('type') || '').trim().toLowerCase()
  const status = String(url.searchParams.get('status') || '').trim().toLowerCase()

  return items.filter((item) => {
    const hitKeyword = !keyword || [
      item.name,
      item.code,
      item.location,
    ].some((v) => String(v || '').toLowerCase().includes(keyword))

    const hitType = !type || String(item.type || '').toLowerCase() === type
    const hitStatus = !status || String(item.status || '').toLowerCase() === status

    return hitKeyword && hitType && hitStatus
  })
}

async function installItemsApiMock(page: Page) {
  const allItems = buildItemsFixture()

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

    if (pathname.includes('/api/warehouse') && !pathname.includes('borrow')) {
      if (method === 'GET') {
        const rows = filterItemsByQuery(allItems, url)
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

test.describe('warehouse items', () => {
  test.beforeEach(async ({ page }) => {
    await attachAppDebug(page)
    await installAuth(page, 'admin')
    await installItemsApiMock(page)
  })

  test('warehouse items smoke', async ({ page }) => {
    await page.goto('/warehouse/items', { waitUntil: 'domcontentloaded' })
    await page.waitForLoadState('networkidle')
    await page.waitForURL(/\/warehouse\/items/)

    console.log('final url =', page.url())
    console.log('body =', await page.locator('body').innerText())

    await expect(page.getByText('庫存清單').first()).toBeVisible()
    await expect(page.getByText('SSD A')).toBeVisible()
    await expect(page.getByText('Tool B')).toBeVisible()
  })

  test('keyword search syncs route query and updates list', async ({ page }) => {
    await page.goto('/warehouse/items', { waitUntil: 'domcontentloaded' })
    await page.waitForLoadState('networkidle')

    await expect(page.getByText('SSD A')).toBeVisible()
    await expect(page.getByText('Tool B')).toBeVisible()

    const keywordInput = page.locator('input[placeholder*="品名"]').first()
    await keywordInput.fill('Tool')

    await page.getByRole('button', { name: '搜尋' }).click()

    await expect(page).toHaveURL(/\/warehouse\/items\?keyword=Tool/)
    await expect(page.getByText('Tool B')).toBeVisible()
    await expect(page.getByText('SSD A')).toHaveCount(0)
  })
})