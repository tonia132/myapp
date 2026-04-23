import type { Page } from '@playwright/test'

export async function attachAppDebug(page: Page) {
  page.on('console', (msg) => {
    console.log(`[browser:${msg.type()}] ${msg.text()}`)
  })

  page.on('pageerror', (err) => {
    console.log(`[pageerror] ${err.message}`)
  })

  page.on('requestfailed', (req) => {
    console.log(
      `[requestfailed] ${req.method()} ${req.url()} :: ${req.failure()?.errorText}`
    )
  })
}