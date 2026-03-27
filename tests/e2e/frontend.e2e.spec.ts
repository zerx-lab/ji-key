import { test, expect } from '@playwright/test'

test.describe('前台页面', () => {
  test('首页加载正常', async ({ page }) => {
    await page.goto('http://localhost:3000')
    await expect(page).toHaveTitle(/Ji-Key/)
    await expect(page.locator('h1').first()).toContainText('键入流畅之境')
  })

  test('书库页加载正常', async ({ page }) => {
    await page.goto('http://localhost:3000/books')
    await expect(page).toHaveTitle(/书库/)
    // 页面 h1 包含 "书库"
    await expect(page.locator('h1').first()).toContainText('书库')
  })

  test('登录页加载正常', async ({ page }) => {
    await page.goto('http://localhost:3000/login')
    await expect(page).toHaveTitle(/Ji-Key/)
    await expect(page.locator('h1').first()).toContainText('欢迎回来')
  })

  test('注册页加载正常', async ({ page }) => {
    await page.goto('http://localhost:3000/register')
    await expect(page).toHaveTitle(/Ji-Key/)
    await expect(page.locator('h1').first()).toContainText('创建账号')
  })

  test('未登录访问统计页应重定向到登录', async ({ page }) => {
    await page.goto('http://localhost:3000/stats')
    await expect(page).toHaveURL(/\/login/)
  })

  test('未登录访问历史页应重定向到登录', async ({ page }) => {
    await page.goto('http://localhost:3000/history')
    await expect(page).toHaveURL(/\/login/)
  })

  test('Navbar 包含书库和登录链接', async ({ page }) => {
    await page.goto('http://localhost:3000')
    await expect(page.locator('a[href="/books"]').first()).toBeVisible()
    await expect(page.locator('a[href="/login"]').first()).toBeVisible()
  })
})
